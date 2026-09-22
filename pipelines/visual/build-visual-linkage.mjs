// pipelines/visual/build-visual-linkage.mjs — TASK-0008 WP-D/E
//
// 主链后段：Visual Asset → Visual-to-Entity Link → Evidence → Eligibility
//
// 输入：一次 WP-C 检索 run 的 summary JSON（Raw Store 为 append-only 原文；
//       summary 是「由 Raw 重算出来的结构」，故显式作为参数传入，脚本不自己找最新 run，
//       避免「跑的是哪一次、以什么为准」不可复现）。
// 用法：node pipelines/visual/build-visual-linkage.mjs --summary <path-to-run-summary.json>
//
// 纪律（逐条对应 §7 不变量）：
//  · confirmed 必须有 Evidence（inv 3）→ 先建 Evidence，再建 Link，并指向它；
//  · 不使用视觉相似度（inv 2）→ decision_rule 只能来自标题/说明/权威目录；
//  · 现代照片不得成为历史状态证据（inv 5）→ current_or_historical='current'，
//    且证据的 G2 保持 pending（本行不冒认任何时间语义）；
//  · 创建日期与被描绘年代不得混同（inv 6）→ caption 里的年代只写入
//    `caption_claimed_period`，**不**写入 time_hint / depicted_period；
//  · caption 声称的年代与已入库论断冲突时 → 显式记为 conflict（G5 fail / tier C），
//    不进人裁以外的任何自动消解；
//  · HR-5 排除资产 count=0（inv 4）→ 由 migration 006 的触发器 + effective 视图强制；
//  · 每个新 Evidence 立即写 G0–G6 快照（inv 17）。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { run, queryRows } from "../../packages/data-access/src/index.mjs";
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";

const METHOD = "visual_identity_caption_rule";
const GENERATED_BY = "mohen-visual-linkage";

// ── 已入库的桥梁建造年代论断（用于 caption 冲突检测；只读，不修改）──────────
// 来源：claims.predicate='has_extant_ancient_bridge'（TASK-0006 编织层，带 S1 地名志 + 上图著录）
// 这里把「朝代/年号」映射成可比较的年区间，用于检测 caption 是否与之矛盾。
const ERA_FROM_ERA_NAME = {
  咸淳: { dynasty: "南宋", from: 1265, to: 1274 },
  景定: { dynasty: "南宋", from: 1260, to: 1264 },
  至元: { dynasty: "元", from: 1335, to: 1340 }, // 「后至元」
  天顺: { dynasty: "明", from: 1457, to: 1464 },
};
// 朝代归一：已入库论断常只写「宋」，caption 可能写「南宋」——二者不构成冲突。
// 不归一就会把「宋 vs 南宋」误报为年代矛盾（过报同样是失真）。
const normDynasty = (d) => {
  const s = String(d || "");
  if (/南宋|北宋/.test(s)) return "宋";
  return s;
};
/** 从 caption 中抽取「朝代+年号+年」形式的年代声明；抽不到返回 null。 */
function parseCaptionPeriod(caption) {
  const t = String(caption || "");
  // 形如「北宋咸淳元年(1265年)」/「南宋咸淳三年（1267）」
  const m = t.match(/(北宋|南宋|元|明|清)?\s*([\u4e00-\u9fa5]{1,2})?(元|二|三|四|五|六|七|八|九|十)年?\s*[（(]?\s*(\d{3,4})\s*年?[）)]?/);
  if (!m) {
    const y = t.match(/(\d{3,4})\s*年/);
    return y ? { dynasty_label: null, era_name: null, year: Number(y[1]), raw: y[0] } : null;
  }
  return {
    dynasty_label: m[1] || null, era_name: m[2] || null,
    era_year: m[3] || null, year: m[4] ? Number(m[4]) : null, raw: m[0],
  };
}

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
function detUuid(code) {
  const h = crypto.createHash("sha256").update("mohen-visual/v1/" + code).digest("hex");
  return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20, 32);
}
const slug = (s) => String(s || "").replace(/[^\u4e00-\u9fa5A-Za-z0-9._-]/g, "_").slice(0, 80);

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { summary: null };
  for (let i = 0; i < a.length; i++) if (a[i] === "--summary") o.summary = a[++i];
  if (!o.summary) throw new Error("必须指定 --summary <run-summary.json>（由 WP-C 检索 run 产出）");
  return o;
}

/** 从 Raw Store 读回该文件的**原文** ImageDescription（R-引用1：引文不得篡改）。 */
function readVerbatimCaption(rawDir, fileTitle) {
  const fileSlug = slug(String(fileTitle).replace(/^File:/, ""));
  if (!fs.existsSync(rawDir)) return { ok: false, reason: "raw_dir_missing", rawPath: null };
  const cands = fs.readdirSync(rawDir)
    .filter((f) => f.startsWith("commons-imageinfo-") && f.endsWith(fileSlug + ".json"));
  if (!cands.length) return { ok: false, reason: "raw_imageinfo_missing", rawPath: null };
  const p = path.join(rawDir, cands[0]);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const page = Object.values((j.query && j.query.pages) || {})[0];
  if (!page || !page.imageinfo) return { ok: false, reason: "raw_imageinfo_malformed", rawPath: p };
  const em = page.imageinfo[0].extmetadata || {};
  return {
    ok: true, rawPath: p,
    verbatim: (em.ImageDescription && em.ImageDescription.value) || "",
    dateTimeOriginal: (em.DateTimeOriginal && em.DateTimeOriginal.value) || "",
    license: (em.LicenseShortName && em.LicenseShortName.value) || "",
    artist: (em.Artist && em.Artist.value) || "",
    descriptionUrl: page.imageinfo[0].descriptionurl,
  };
}

async function main() {
  const { summary: sumPath } = parseArgs();
  const S = JSON.parse(fs.readFileSync(sumPath, "utf8"));
  const rawDir = S.raw_dir;
  const out = {
    summary_path: sumPath, raw_dir: rawDir,
    evidence_created: 0, links_created: 0, links_unconfirmed: 0,
    links_suspected: 0, audit_rows: 0,
    by_link_status: {}, conflicts: [], unresolved_identity: [], rows: [],
  };

  // ── 实体 legacy_id → entity_id ──
  const ents = await queryRows("select entity_id::text id, canonical_name, legacy_id from entities");
  const entByLegacy = {};
  for (const e of ents) if (e.legacy_id) entByLegacy[e.legacy_id] = e;

  // ── 已入库的建造年代论断（只读；TASK-0006 产物，本任务不得修改）──
  //   注意：`has_extant_ancient_bridge` 的 **subject_id 是「白苎里→金溪→金泽」地名叠影实体**，
  //   桥的身份挂在 **object_id** 上。按 subject 取会把三条桥的年限全部对不上，
  //   从而静默漏掉 caption 与论断的冲突 —— 故必须以 object_id 为准。
  const priorClaims = await queryRows(
    `select c.claim_id::text id, c.object_id::text oid, s.canonical_name subj, c.object_value::text ov
       from claims c left join entities s on s.entity_id = c.subject_id
      where c.predicate = 'has_extant_ancient_bridge'`
  );
  const priorByObject = {};
  const entNameById = {};
  for (const e of ents) entNameById[e.id] = e.canonical_name;
  for (const c of priorClaims) {
    let v = {};
    try { v = JSON.parse(c.ov); } catch { /* 保守忽略 */ }
    const name = (c.oid && entNameById[c.oid]) || c.subj;
    if (name) priorByObject[name] = { built: v.built || null, dynasty: v.dynasty || null, bound_via: c.oid ? "object_id" : "subject" };
  }

  // ══ A) 已接受资产 → Evidence(confirmed 身份) ═══════════════════════════════
  for (const o of S.outcomes) {
    for (const a of o.accepted || []) {
      const ent = entByLegacy["hushang-jingwei:entity:" + a.entity];
      if (!ent) throw new Error("实体缺失: " + a.entity + "（" + a.target_object + "）");
      const raw = readVerbatimCaption(rawDir, a.title);
      if (!raw.ok) throw new Error("无法取回原始 caption（" + raw.reason + "）: " + a.title);

      // ── caption 声称的年代 vs 已入库论断 ──
      const capPeriod = parseCaptionPeriod(raw.verbatim);
      const prior = priorByObject[ent.canonical_name] || null;
      let conflict = false;
      const conflictReasons = [];
      if (capPeriod) {
        const era = capPeriod.era_name ? ERA_FROM_ERA_NAME[capPeriod.era_name] : null;
        // (1) 朝代标签与年号自相矛盾（如「北宋」+「咸淳」，咸淳为南宋年号）
        // (1) 朝代标签与年号自相矛盾（如「北宋」+「咸淳」，咸淳为南宋年号）。
        //     此处必须用**未归一**的原文相比 —— 归一化会把「北宋 vs 南宋」抹平，
        //     正好抹掉要检出的那类错误。
        if (era && capPeriod.dynasty_label && capPeriod.dynasty_label !== era.dynasty) {
          conflict = true;
          conflictReasons.push(
            `caption 自称「${capPeriod.dynasty_label}${capPeriod.era_name}」，但「${capPeriod.era_name}」是${era.dynasty}年号（caption 内部朝代自相矛盾）`
          );
        }
        // (2) caption 年份与已入库论断的朝代/年代矛盾
        if (prior && prior.dynasty && era && normDynasty(prior.dynasty) !== normDynasty(era.dynasty)) {
          conflict = true;
          conflictReasons.push(
            `caption 年代属【${era.dynasty}】，而已入库论断为【${prior.dynasty}（${prior.built}）】`
          );
        } else if (prior && prior.built && capPeriod.year) {
          const yrs = [...String(prior.built).matchAll(/\d{4}/g)].map((m) => Number(m[0]));
          if (yrs.length && (capPeriod.year < Math.min(...yrs) - 3 || capPeriod.year > Math.max(...yrs) + 3)) {
            conflict = true;
            conflictReasons.push(
              `caption 记 ${capPeriod.year} 年，而已入库论断为 ${prior.built}，相差逾 3 年`
            );
          }
        }
      }

      const assetId = a.asset_id;
      const evId = detUuid("visual-evidence:" + a.asset_checksum);
      const locator = raw.descriptionUrl || a.title;
      const region = {
        kind: "visual_identity_evidence",
        asset_id: assetId,
        file_title: a.title,
        target_object: a.target_object,
        entity_legacy_id: a.entity,
        matched_name: a.matched_name,
        classification_rule: a.rule,
        classification_reason: a.reason,
        discovery_channel: a.discovery_channel || "commons_generator_search",
        wikidata_p18_corroboration: a.wikidata_p18_corroboration || null,
        license: raw.license || a.license,
        width: a.width, height: a.height, asset_bytes: a.asset_bytes,
        // §5：creation_date 与 depicted_period 严格分列，且写明 creation_date 的来路
        creation_date: a.creation_date || null,
        creation_date_source: a.creation_date_source || null,
        creation_date_semantics: "照片本身的拍摄/制作时点（EXIF 或 Commons 分类），不代表被描绘对象的历史年代",
        depicted_period: null,
        depicted_period_note: "本证据不建立被描绘年代；caption 中的年代声明另存于 caption_claimed_period，且不得据此升级",
        // §5 / 不变量 5：现代照片 → current
        current_or_historical: "current",
        // caption 自带的年代声明：原样保留，仅供人裁，不参与任何自动判定
        caption_claimed_period: capPeriod || null,
        caption_claimed_period_raw: capPeriod ? capPeriod.raw : null,
        caption_period_conflict: conflict ? conflictReasons : null,
        prior_claim: prior,
        raw_caption_path: raw.rawPath,
        coordinates_not_used: true,
        visual_similarity_used: false,
      };

      await run(
        `insert into evidence(evidence_id, source_id, evidence_type, locator, quote_text, region_json,
                              subject_hint, place_hint, time_hint, extraction_method, confidence, verification_status)
         values (:'id'::uuid, :'sid'::uuid, 'image', :'loc', :'q', :'rg'::jsonb,
                 :'sh', :'ph', null, :'em', 0, 'candidate')
         on conflict (evidence_id) do update set
           source_id=excluded.source_id, locator=excluded.locator, quote_text=excluded.quote_text,
           region_json=excluded.region_json, subject_hint=excluded.subject_hint,
           place_hint=excluded.place_hint, time_hint=null,
           extraction_method=excluded.extraction_method, verification_status='candidate'`,
        {
          id: evId, sid: a.imageinfo_source_id, loc: locator,
          // R-引用1：原文照录（不 stripHtml、不截断）
          q: raw.verbatim,
          rg: JSON.stringify(region),
          sh: ent.canonical_name,   // 身份声明：caption 显式命名且落在金泽
          ph: "金泽",
          em: METHOD,
        }
      );
      out.evidence_created++;

      // ── G0–G6 当前快照（inv 17）──
      // identity=true（caption 显式命名且金泽范围内，经确定性规则）
      // time: 有冲突→false（年代矛盾，G2 的 fail 定义原文即含「年代矛盾」）；无年代声明→undefined 保持 pending
      // spatial=undefined（图片不是空间证据来源）；evidence=undefined（本行即证据本体，不自我引用）
      const res = evaluateGates({
        source: true,
        identity: true,
        time: conflict ? false : undefined,
        spatial: undefined,
        evidence: undefined,
        conflict: conflict,
        forcedC: [],
      });
      for (const gc of GATE_CODES) {
        await run(
          `delete from evidence_gate_audit where object_type='evidence' and object_id=:'oid' and gate_code=:'gc'`,
          { oid: evId, gc }
        );
        await run(
          `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
           values ('evidence',:'oid',:'gc',:'rs',:'rn','rule')`,
          { oid: evId, gc, rs: res.gates[gc].result, rn: res.gates[gc].reason }
        );
        out.audit_rows++;
      }

      // ── Visual → Entity Link（confirmed；证据即上面这一行）──
      const linkId = detUuid("visual-link:" + a.asset_checksum + ":" + ent.canonical_name);
      // 数组参数一律以 JSON 传入、在 SQL 侧用 jsonb_array_elements_text 展开 ——
      // 避免手搓 Postgres 数组字面量（空数组会变成 ""，直接报「有缺陷的数组常量」）。
      await run(
        `insert into visual_entity_links(link_id, asset_id, entity_id, depicted_entity_label,
             link_status, decision_rule, decision_note, link_evidence_id, current_or_historical,
             name_variant_note, eligibility_tags, generated_by)
         values (:'id'::uuid, :'aid'::uuid, :'eid'::uuid, :'lbl',
             'confirmed', :'dr', :'dn', :'ev'::uuid, 'current', :'nv',
             array(select jsonb_array_elements_text(:'tags'::jsonb)), :'gb')
         on conflict (asset_id, depicted_entity_label) do update set
           entity_id=excluded.entity_id, link_status=excluded.link_status,
           decision_rule=excluded.decision_rule, decision_note=excluded.decision_note,
           link_evidence_id=excluded.link_evidence_id,
           current_or_historical=excluded.current_or_historical,
           name_variant_note=excluded.name_variant_note,
           eligibility_tags=excluded.eligibility_tags, generated_by=excluded.generated_by`,
        {
          id: linkId, aid: assetId, eid: ent.id, lbl: ent.canonical_name,
          dr: a.rule, dn: a.reason, ev: evId,
          nv: a.name_variants
            ? `来源用「${a.name_variants.providerForm}」，S1 地名志规范名「${a.name_variants.sourceCanonicalForm}」；两形式均保留，不覆盖`
            : null,
          tags: JSON.stringify(conflict ? ["caption_period_conflict_pending_human_review"] : []),
          gb: GENERATED_BY,
        }
      );
      out.links_created++;
      out.by_link_status.confirmed = (out.by_link_status.confirmed || 0) + 1;
      if (conflict) out.conflicts.push({ object: ent.canonical_name, file: a.title, reasons: conflictReasons });
      out.rows.push({
        object: ent.canonical_name, entity_legacy_id: a.entity, file: a.title,
        link_status: "confirmed", current_or_historical: "current",
        rule: a.rule, license: raw.license || a.license, evidence_id: evId, link_id: linkId,
        creation_date: a.creation_date || null, creation_date_source: a.creation_date_source || null,
        caption_claimed_period: capPeriod ? capPeriod.raw : null, conflict, gate_tier: res.tier,
        gate_summary: res.summary, asset_id: assetId,
      });
    }
  }

  // ══ B) S1 上海图书馆「金泽」影像 → unconfirmed 链接（身份不可判）════════════
  //   这批资产有真实字节与开放授权，但元数据 0 标题 / 0 年代 / 0 作者。
  //   唯一「像金泽」的依据是 Legacy 的 towns 标签 —— 而 TASK-0007 已证明该字段是
  //   **行政归属**而非「图绘该镇」的证明。故只能 unconfirmed，且不得计入 effective gate。
  for (const o of S.outcomes) {
    for (const c of o.s1_candidates || []) {
      if (c.error) continue;
      const lbl = "金泽镇历史镇景与水系";
      const linkId = detUuid("visual-link:" + c.asset_checksum + ":" + lbl);
      await run(
        `insert into visual_entity_links(link_id, asset_id, entity_id, depicted_entity_label,
             link_status, decision_rule, decision_note, link_evidence_id, current_or_historical,
             name_variant_note, eligibility_tags, generated_by)
         values (:'id'::uuid, :'aid'::uuid, null, :'lbl',
             'unconfirmed', :'dr', :'dn', null, 'unknown',
             null, array(select jsonb_array_elements_text(:'tags'::jsonb)), :'gb')
         on conflict (asset_id, depicted_entity_label) do update set
           link_status=excluded.link_status, decision_rule=excluded.decision_rule,
           decision_note=excluded.decision_note, current_or_historical=excluded.current_or_historical,
           eligibility_tags=excluded.eligibility_tags, generated_by=excluded.generated_by`,
        {
          id: linkId, aid: c.asset_id, lbl,
          dr: "R5_source_metadata_insufficient_for_object_identity",
          dn: "上海图书馆开放数据影像：无标题/无说明/无年代/无作者（Legacy caption/date/artist 全空），"
            + "无法确证描绘对象；Legacy towns=金泽 属行政归属标签，不构成『图绘金泽』证明；"
            + "不得计入 effective_visual_assets，不得作为 heritage-primary 证据",
          tags: JSON.stringify(["claimed_by_source_towns_tag", "identity_unresolved", "metadata_insufficient"]),
          gb: GENERATED_BY,
        }
      );
      out.links_unconfirmed++;
      out.by_link_status.unconfirmed = (out.by_link_status.unconfirmed || 0) + 1;
      out.unresolved_identity.push({ asset_id: c.asset_id, id: c.id, rule: c.rule });
      out.rows.push({
        object: lbl, entity_legacy_id: null, file: c.url, link_status: "unconfirmed",
        current_or_historical: "unknown", rule: "R5_source_metadata_insufficient_for_object_identity",
        license: null, evidence_id: null, link_id: linkId, creation_date: null,
        creation_date_source: null, caption_claimed_period: null, conflict: false,
        gate_tier: null, gate_summary: null, asset_id: c.asset_id, shl_id: c.id,
      });
    }
  }

  // ── visual_assets 的 G0–G6 当前快照 ─────────────────────────────────────────
  //  为什么在本阶段写：WP-C 会**新建** visual_assets（本 run 共 42 条）。若不即时快照，
  //  这些新资产在「下一次 recover.mjs 跑动之前」处于**无审计**窗口；而 TASK-0004 的
  //  「重跑幂等」用例恰好在这个窗口里取 before/after 快照，于是把「追补审计」误报成「不幂等」。
  //  本块消灭该窗口，使整链**从空库起也可复现**。
  //
  //  与 `pipelines/evidence/recover.mjs` 的关系（复用既有机制，不建平行子系统）：
  //   · 两处都按 (object_type, object_id, gate_code) **先删后插** → 行数恒定、可重跑；
  //   · recover 仍是 visual_asset 审计的**权威**写入方，本块只补「即时性」；
  //   · 门控输入取法一致：identity / spatial / evidence 一律 undefined（一张照片本身既不是
  //     身份断言、也不是空间测量、也不是文本证据来源）；time 取决于是否已知 created_date；
  //   · 强制 C 的理由文本由**最后写入的一方**持有：两处措辞不同但结论一致（均带 forcedC），
  //     且行数与 gate 结果不受影响。若日后要统一措辞，应抽公共函数，勿各改各的。
  const assetIds = [...new Set(out.rows.map((r) => r.asset_id).filter(Boolean))];
  if (assetIds.length) {
    const vis = await queryRows(
      `select asset_id::text asset_id, source_id::text source_id, checksum, file_path, created_date
         from visual_assets
        where asset_id::text in (select jsonb_array_elements_text(:'ids'::jsonb))`,
      { ids: JSON.stringify(assetIds) }
    );
    const statusByAsset = {};
    for (const r of out.rows) if (r.asset_id) statusByAsset[r.asset_id] = r.link_status;
    for (const v of vis) {
      const hasDate = !!(v.created_date && String(v.created_date).trim());
      const forcedC = [
        "图像缺少可证明的拍摄地点/年代对应关系，需人工核验（含历史图像与今地疑似同景的情形）",
      ];
      if (statusByAsset[v.asset_id] === "unconfirmed") {
        forcedC.push(
          "源元数据不足以判定被描绘对象（R5：无标题/无说明/无年代/无作者），禁止用于实体配图"
        );
      }
      const vaRes = evaluateGates({
        source: !!(v.source_id && v.checksum && v.file_path),
        identity: undefined,
        time: hasDate ? true : undefined,
        spatial: undefined,
        evidence: undefined,
        conflict: false,
        forcedC,
      });
      for (const gc of GATE_CODES) {
        await run(
          `delete from evidence_gate_audit where object_type='visual_asset' and object_id=:'oid' and gate_code=:'gc'`,
          { oid: v.asset_id, gc }
        );
        await run(
          `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
           values ('visual_asset',:'oid',:'gc',:'rs',:'rn','rule')`,
          { oid: v.asset_id, gc, rs: vaRes.gates[gc].result, rn: vaRes.gates[gc].reason }
        );
        out.audit_rows++;
      }
    }
    out.visual_assets_audited = vis.length;
  }

  if (!S.raw_dir) throw new Error("summary 缺 raw_dir");
  console.log(JSON.stringify(out));
}

main().catch((e) => { console.error("BUILD VISUAL LINKAGE FAILED:", e.message); process.exit(1); });
