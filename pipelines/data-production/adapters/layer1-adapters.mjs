// layer1-adapters.mjs — 第一层真实闭环适配器（D00-D05）
//
// 职责边界（工程现实版）：
//   - 生产链框架（orchestrator/executor）当前是纯内存骨架，persistence 尚未接入
//     executor（任务书 §五 明示 adapter_binding=TO_VERIFY_IN_M0，本试验补全）。
//   - 本模块在 adapter 内完成「计算 + 写库 + gate 审核」，通过 @mohen/data-access
//     的 psql 驱动写 42 表；run.mjs 仍是唯一编排入口（--adapters 指向本模块）。
//   - D02/D03/D04 调 DeepSeek（复用金样本 SAMPLE-TRIAL-10 分步提示词 + schema）；
//     D00/D01/D05 规则类为确定性代码，不调 LLM。
//   - producer_may_self_qualify=false：gate 结果只写 append-only gate_audits，
//     adapter 不自行授 PASS 资格；此处 PASS 为「提交候选并通过 G 门」的机器判定。
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { run as dbRun, queryValue as dbQueryValue, queryRows as dbQueryRows } from "../../../packages/data-access/src/index.mjs";
import { computePreciseInvalidation } from "../../../packages/data-access/src/invalidation.mjs";

const ARCH = "mohen.six-stage.v1";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";
const PROMPT_VERSION = "sample-trial-10-layer1-v1.0";

// ============================================================
// 主题配置（A001 适配）：默认 金泽；MOHEN_TOPIC_CONFIG 指向 topic-a001.mjs 时切换。
// 仅参数化材料 / 载体照片 / D02·D03·D04 提示词 / 实体别名 / 投影前缀与标题；
// 门禁 / 血缘 / 精准失效 machinery 保持不变、主题无关、可复用。
// ============================================================
const __TOPIC_RAW = process.env.MOHEN_TOPIC_CONFIG;
const __TOPIC_URL = __TOPIC_RAW
  ? (__TOPIC_RAW.startsWith("file:") || __TOPIC_RAW.startsWith("http"))
    ? __TOPIC_RAW
    : "file:///" + process.cwd().replace(/\\/g, "/") + "/" + __TOPIC_RAW.replace(/\\/g, "/")
  : null;
const __TOPIC = __TOPIC_URL ? await import(__TOPIC_URL).then((m) => m.default ?? m) : null;
const TOPIC_KEY = __TOPIC?.key ?? "jinze";
const TOPIC_LABEL = __TOPIC?.label ?? "金泽";

// ============================================================
// V1.5 视觉维度第一阶：今貌照片（C04 / W03 / P06 视觉发布）
// 只登记世界模型中已有实体对应的照片（万安桥/普济桥/迎祥桥/颐浩寺遗址）；
// 照片作为真实来源进生产链：Commons API 读元数据（license/作者/条目自述）→
// 下载到 web 公共资盘（可显示）→ C04 技术读取 → W03 视觉对应核定 → P06 证据返还。
// 视觉身份固定为 V3「今日观察」；历史舆图/旧影（V1/V2）无本地史料资产，本批不涉。
// ============================================================
let PHOTO_MATERIALS = [
  { feature_key: "wananqiao", entity_label: "万安桥", commons_title: "File:Wan'anqiao.jpg" },
  { feature_key: "pujiqiao", entity_label: "普济桥", commons_title: "File:Pujiqiao (Jinze).jpg" },
  { feature_key: "yingxiangqiao", entity_label: "迎祥桥", commons_title: "File:Yingxiangqiao_.jpg" },
  { feature_key: "yihaosi-site", entity_label: "颐浩寺遗址", commons_title: "File:Yihaosi Yizhi.jpg" },
];
const PHOTO_ASSET_DIR = "apps/web/public/production-assets";

/** 去 HTML 标签的 Commons extmetadata 文本 */
function stripHtml(s) {
  return s ? String(s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
}

/** 网络操作重试（瞬时失败不静默跳过：最多 3 次，退避 500/1500ms） */
async function withRetry(fn, label) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < 2) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error(`${label}（3 次重试均失败）：${lastErr?.message ?? lastErr}`);
}

/** 读 Commons API 元数据（license / 作者 / 条目自述 / 尺寸）——确定性，无 LLM */
async function fetchCommonsMeta(commonsTitle) {
  return withRetry(async () => {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&titles=${encodeURIComponent(commonsTitle)}`;
    const res = await fetch(api, { headers: { "user-agent": "MoHenDataProduction/1.0 (sample-trial)" } });
    if (!res.ok) throw new Error(`COMMONS_API_HTTP_${res.status}`);
    const j = await res.json();
    const page = Object.values(j?.query?.pages ?? {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii) throw new Error(`COMMONS_NO_IMAGEINFO:${commonsTitle}`);
    const em = ii.extmetadata ?? {};
    return {
      width: Number(ii.width ?? 0),
      height: Number(ii.height ?? 0),
      descriptionurl: ii.descriptionurl ?? "",
      license: stripHtml(em.LicenseShortName?.value) || "license 待核",
      artist: stripHtml(em.Artist?.value) || "作者待核",
      description: stripHtml(em.ImageDescription?.value) || "",
    };
  }, `COMMONS_META ${commonsTitle}`);
}

/** 下载照片到 web 公共资盘（可被前端 <img> 直接引用）；返回 bytes + sha256 */
async function downloadPhoto(commonsTitle, outFile) {
  return withRetry(async () => {
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsTitle.replace(/^File:/, ""))}?width=900`;
    const res = await fetch(url, { headers: { "user-agent": "MoHenDataProduction/1.0 (sample-trial)" } });
    if (!res.ok) throw new Error(`COMMONS_DOWNLOAD_HTTP_${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { bytes: buf, sha256: sha256(buf), contentType: res.headers.get("content-type") || "image/jpeg" };
  }, `COMMONS_DOWNLOAD ${commonsTitle}`);
}

// ============================================================
// 第一层输入史料（与 layer1-materials.md 一致，全部为已冻结真实原文）
// V1.4 组合批（第三层 + 时间维度）：新增 4 个真实来源 6 段原文，
// 全部逐字取自沪上经纬人工裁决记录（TASK-0011：T11-C1/C2、U4、U13），
// 携带真实着录分歧（水道名三变体、普济桥方位两说），用于检验
// 「保留不同说法 / 正确拒绝无依据关联 / 时间有着录才抽取」。不新增转述。
// ============================================================
let MATERIALS = [
  {
    provider: "shanghai-library",
    title: "上海市地名志·金泽条目",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "full_content",
    fragments: [
      "古名白苎里。因地处湖荡泽地……古有『穑人获泽如金』之说，故名金泽",
      "是上海的『桥乡』，现存古桥 21 座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥",
    ],
  },
  {
    provider: "shanghai-library",
    title: "光绪《青浦县志》·金泽方志记载",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "full_content",
    fragments: [
      "南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人",
      "南宋景定年间建（万安桥），与普济桥一北一南同跨一河，形制相仿，并称'姐妹桥'",
    ],
  },
  {
    provider: "shanghai-library",
    title: "上海图书馆开放数据·地名库｜万安桥·迎祥桥条目",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "full_content",
    fragments: [
      "万安桥：位于青浦县金泽镇北市梢，跨秀州塘",
      "迎祥桥：位于青浦县金泽镇南市梢，跨金泽塘",
    ],
  },
  {
    provider: "qingpu-gov",
    title: "上海市青浦区人民政府｜万安桥（2023-07-06）",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "full_content",
    fragments: [
      "万安桥：位于金泽镇北市，东西向，跨金泽塘",
    ],
  },
  {
    provider: "qingpu-gov",
    title: "上海市青浦区人民政府｜遗珠拾粹——探访青浦多种形式的古桥（2025-01-16）",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "full_content",
    fragments: [
      "普济桥：位于金泽古镇，东西向跨金泽塘，宋咸淳三年（1267年）建，1962年被列为上海市文物保护单位",
    ],
  },
  {
    provider: "qingpu-museum",
    title: "上海青浦博物馆｜普济桥（2019-03-04）",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "full_content",
    fragments: [
      "普济桥：位于金泽镇南市，东西向，跨市河。宋咸淳三年(1267)建",
    ],
  },
  {
    provider: "jiangnan-bridge-research",
    title: "江南古桥文化研究会｜普济桥",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "full_content",
    fragments: [
      "普济桥：位于金泽镇中部，东西向，跨金泽塘",
    ],
  },
];

function sha256(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function hold(reason_code, missing_requirement, next_action, recheck_condition) {
  return {
    disposition: "HOLD",
    gate_evidence: {},
    content_stats: {},
    review_records: [],
    hold: { reason_code, missing_requirement, next_action, recheck_condition },
  };
}

async function writeGate(runId, stage, gateCode, objectType, objectId, result, reasonCodes, details, consumer = null) {
  // append-only + current_valid：先失效同键旧决策，再插入新决策（producer 不自授 PASS，仅登记）
  await dbRun(
    `update control.gate_audits set current_valid = false
     where gate_code = :'gate_code' and object_type = :'object_type' and object_id = :'object_id'::uuid
       and consumer is not distinct from :'consumer' and current_valid = true`,
    { gate_code: gateCode, object_type: objectType, object_id: objectId, consumer }
  );
  await dbRun(
    `insert into control.gate_audits
     (run_id, stage, gate_code, object_type, object_id, result, reason_codes, guard_versions, details,
      checked_at, architecture_generation, current_valid, consumer)
     values (:'run_id'::uuid, :'stage', :'gate_code', :'object_type', :'object_id'::uuid, :'result',
             :'reason_codes'::text[], '{}'::jsonb, :'details'::jsonb, now(), :'arch', true, :'consumer')`,
    {
      run_id: runId, stage, gate_code: gateCode, object_type: objectType,
      object_id: objectId, result, reason_codes: reasonCodes.length ? `{${reasonCodes.join(",")}}` : "{}",
      details: JSON.stringify(details), arch: ARCH, consumer,
    }
  );
}

// ============================================================
// D00 来源摄取（L0/G0）——确定性
// ============================================================
async function d00SourceIntake({ run, job, input, context }) {
  const runId = run.run_id;
  const sourceVersions = [];

  // production_runs 须先于 gate_audits（FK gate_audits.run_id → production_runs.run_id）
  await dbRun(
    `insert into control.production_runs
     (run_id, research_intent, scope, execution_mode, status, started_at, metadata, architecture_generation)
     values (:'run_id'::uuid, :'intent', '{}'::jsonb, :'mode', 'RUNNING', now(), '{}'::jsonb, :'arch')
     on conflict (run_id) do nothing`,
    { run_id: runId, intent: run.research_intent, mode: run.execution_mode, arch: ARCH }
  );

  for (const m of MATERIALS) {
    // 幂等：raw_items 为 append-only，同一 provider+title 已注册则复用，不重复插入
    let sourceId = await dbQueryValue(
      `select source_id::text from source.sources where provider=:'provider' and title=:'title' limit 1`,
      { provider: m.provider, title: m.title }
    );
    let versionId = null;
    if (sourceId) {
      versionId = await dbQueryValue(
        `select source_version_id::text from source.source_versions where source_id=:'source_id'::uuid order by retrieved_at desc limit 1`,
        { source_id: sourceId }
      );
      // 幂等复用时补齐来源元数据（此前批次只登记了标题，导致前端无法回访原件）。
      // 只填空值，不覆盖既有登记。
      await dbRun(
        `update source.sources set
           publisher_or_institution = coalesce(nullif(publisher_or_institution,''), :'publisher'),
           source_uri_or_catalog_no = coalesce(nullif(source_uri_or_catalog_no,''), :'uri'),
           source_date = case when source_date is null or source_date = '{}'::jsonb then :'sdate'::jsonb else source_date end,
           rights = case when rights is null or rights = '{}'::jsonb then :'rights'::jsonb else rights end
         where source_id = :'source_id'::uuid`,
        {
          source_id: sourceId,
          publisher: m.publisher ?? "", uri: m.url ?? "",
          sdate: JSON.stringify(m.source_date ? { text: m.source_date } : {}),
          rights: JSON.stringify(m.rights ?? {}),
        }
      );
    } else {
      sourceId = randomUUID();
      versionId = randomUUID();
      // A001 返证要求（任务书 U4/D2）：来源必须携带可回访 URL、发布机构、发布日期与权利用途，
      // 否则前端「点击判断→回到原件」只能给一个无法打开的标题。缺失时如实留空，不编造。
      await dbRun(
        `insert into source.sources
         (source_id, provider, title, source_type, carrier_type, publisher_or_institution,
          source_uri_or_catalog_no, source_date, rights, provenance_status,
          content_availability, original_locator, scope)
         values (:'source_id'::uuid, :'provider', :'title', :'source_type', :'carrier_type', :'publisher',
                 :'uri', :'sdate'::jsonb, :'rights'::jsonb, :'provenance_status',
                 :'content_availability', '{}'::jsonb, '{}'::jsonb)`,
        {
          source_id: sourceId, provider: m.provider, title: m.title,
          source_type: m.source_type, carrier_type: m.carrier_type,
          publisher: m.publisher ?? "",
          uri: m.url ?? "",
          sdate: JSON.stringify(m.source_date ? { text: m.source_date } : {}),
          rights: JSON.stringify(m.rights ?? {}),
          provenance_status: m.provenance_status, content_availability: m.content_availability,
        }
      );
      const contentHash = sha256(m.fragments.join("\n"));
      await dbRun(
        `insert into source.source_versions
         (source_version_id, source_id, version_label, retrieved_at, checksum_sha256, metadata)
         values (:'version_id'::uuid, :'source_id'::uuid, 'v1', now(), :'checksum', :'metadata'::jsonb)`,
        { version_id: versionId, source_id: sourceId, checksum: contentHash, metadata: JSON.stringify({ title: m.title }) }
      );
      for (const frag of m.fragments) {
        const itemId = randomUUID();
        await dbRun(
          `insert into source.raw_items
           (raw_item_id, source_version_id, storage_ref, media_type, checksum_sha256)
           values (:'item_id'::uuid, :'version_id'::uuid, :'storage_ref', 'text/plain', :'checksum')`,
          { item_id: itemId, version_id: versionId, storage_ref: `memory://${m.title}/${sha256(frag).slice(0, 16)}`, checksum: sha256(frag) }
        );
      }
    }
    await writeGate(runId, "D00", "G0", "source", sourceId, "PASS", [], { title: m.title });
    // 来源元数据向下游透传（D02 逐条证据归属 + D05 证据指针返证都用它）
    sourceVersions.push({
      source_id: sourceId, source_version_id: versionId, title: m.title, fragments: m.fragments,
      provider: m.provider ?? "", publisher: m.publisher ?? "", url: m.url ?? "",
      source_date: m.source_date ?? "", rights: m.rights ?? {},
    });
  }

  // V1.5 视觉批次：今貌照片来源摄取（Commons 元数据 + 下载 + 登记 source/version/raw_items）
  // 纪律：只摄取世界模型已有实体对应的照片；元数据照录（license/作者/条目自述），不转述不修饰。
  const photoSources = [];
  const fs = await import("node:fs");
  const path = await import("node:path");
  fs.mkdirSync(path.resolve(PHOTO_ASSET_DIR), { recursive: true });
  for (const p of PHOTO_MATERIALS) {
    try {
      const meta = await fetchCommonsMeta(p.commons_title);
      const outFile = path.join(PHOTO_ASSET_DIR, `${p.feature_key}.jpg`);
      const dl = await downloadPhoto(p.commons_title, outFile);
      fs.writeFileSync(path.resolve(outFile), dl.bytes);

      const title = `Wikimedia Commons：${p.entity_label}（今貌照片）`;
      let sourceId = await dbQueryValue(
        `select source_id::text from source.sources where provider=:'provider' and title=:'title' limit 1`,
        { provider: "wikimedia-commons", title }
      );
      let versionId = null;
      if (sourceId) {
        versionId = await dbQueryValue(
          `select source_version_id::text from source.source_versions where source_id=:'source_id'::uuid order by retrieved_at desc limit 1`,
          { source_id: sourceId }
        );
      } else {
        sourceId = randomUUID();
        versionId = randomUUID();
        await dbRun(
          `insert into source.sources
           (source_id, provider, title, source_type, carrier_type, rights, provenance_status,
            content_availability, original_locator, scope)
           values (:'source_id'::uuid, 'wikimedia-commons', :'title', 'photograph', 'image',
                   :'rights'::jsonb, 'candidate', 'full_content', :'locator'::jsonb, '{}'::jsonb)`,
          {
            source_id: sourceId, title,
            rights: JSON.stringify({ license: meta.license, artist: meta.artist, basis: "Commons extmetadata（条目自述）" }),
            locator: JSON.stringify({ commons_title: p.commons_title, descriptionurl: meta.descriptionurl, width: meta.width, height: meta.height }),
          }
        );
        await dbRun(
          `insert into source.source_versions
           (source_version_id, source_id, version_label, retrieved_at, checksum_sha256, metadata)
           values (:'version_id'::uuid, :'source_id'::uuid, 'v1', now(), :'checksum', :'metadata'::jsonb)`,
          { version_id: versionId, source_id: sourceId, checksum: dl.sha256, metadata: JSON.stringify({ commons_title: p.commons_title, bytes: dl.bytes.length }) }
        );
        await dbRun(
          `insert into source.raw_items
           (raw_item_id, source_version_id, storage_ref, media_type, checksum_sha256)
           values (:'item_id'::uuid, :'version_id'::uuid, :'storage_ref', :'media_type', :'checksum')`,
          { item_id: randomUUID(), version_id: versionId, storage_ref: outFile, media_type: dl.contentType, checksum: dl.sha256 }
        );
      }
      await writeGate(runId, "D00", "G0", "source", sourceId, "PASS", [], { title, kind: "photo" });
      photoSources.push({
        source_id: sourceId, source_version_id: versionId, title,
        feature_key: p.feature_key, entity_label: p.entity_label,
        commons_title: p.commons_title, asset_path: outFile, display_url: `/production-assets/${p.feature_key}.jpg`,
        license: meta.license, artist: meta.artist, description: meta.description,
        width: meta.width, height: meta.height, checksum: dl.sha256, bytes: dl.bytes.length,
      });
    } catch (e) {
      // 诚实降级：照片摄取失败不阻断文本链（HOLD 留痕，不当 PASS）
      await writeGate(runId, "D00", "G0", "source", "00000000-0000-0000-0000-000000000000", "HOLD", ["PHOTO_INTAKE_FAIL"], { feature_key: p.feature_key, error: e.message });
      photoSources.push({ feature_key: p.feature_key, entity_label: p.entity_label, failed: true, error: e.message });
    }
  }

  return {
    disposition: "PASS",
    output: { source_versions: sourceVersions, photo_sources: photoSources, count: sourceVersions.length },
    gate_evidence: { stage: "D00", source_count: sourceVersions.length, photo_count: photoSources.filter((p) => !p.failed).length },
    content_stats: { sources: sourceVersions.length, photos: photoSources.filter((p) => !p.failed).length },
    review_records: sourceVersions.map((s) => ({ source_id: s.source_id, title: s.title })),
  };
}

// ============================================================
// D01 载体读取（L1/G1）——C01 数字文本，确定性
// ============================================================
async function d01CarrierReading({ run, job, input, context }) {
  const runId = run.run_id;
  const sources = input?.source_versions || input?.qualified_source?.source_versions || [];
  if (!sources.length) {
    return hold("NO_SOURCE", "D01 无合法 source_version 输入", "先完成 D00 来源摄取", "source_versions 非空");
  }

  const readRunId = randomUUID();
  const inputHash = sha256(JSON.stringify(sources));
  const photoSourcesForRun = (input?.photo_sources || []).filter((p) => !p.failed);
  const readMethods = photoSourcesForRun.length ? ["C01", "C04"] : ["C01"];
  await dbRun(
    `insert into source.read_runs
     (read_run_id, production_run_id, input_sha256, method_set, engine, status)
     values (:'read_run_id'::uuid, :'run_id'::uuid, :'input_sha256', :'method_set'::jsonb, 'deterministic', 'done')`,
    { read_run_id: readRunId, run_id: runId, input_sha256: inputHash, method_set: JSON.stringify(readMethods) }
  );

  const readUnits = [];
  for (const s of sources) {
    for (let i = 0; i < s.fragments.length; i++) {
      const unitId = randomUUID();
      const frag = s.fragments[i];
      await dbRun(
        `insert into source.read_units
         (read_unit_id, read_run_id, method_code, kind, locator_schema, locator, ordinal, payload_ref, locator_hash)
         values (:'unit_id'::uuid, :'read_run_id'::uuid, 'C01', 'paragraph', 'index', :'locator'::jsonb, :'ordinal', :'payload_ref', :'locator_hash')`,
        {
          unit_id: unitId, read_run_id: readRunId,
          locator: JSON.stringify({ source_version_id: s.source_version_id, fragment_index: i }),
          ordinal: i + 1, payload_ref: `memory://${s.source_id}/${i}`,
          locator_hash: sha256(frag).slice(0, 16),
        }
      );
      readUnits.push({
        read_unit_id: unitId, source_version_id: s.source_version_id, source_id: s.source_id,
        ordinal: i + 1, literal: frag, fragment_index: i,
        source_title: s.title ?? "", publisher: s.publisher ?? "", url: s.url ?? "",
        source_date: s.source_date ?? "",
      });
    }
  }

  // V1.5 视觉批次：C04 照片技术读取（确定性）——登记图像读取单元，
  // locator 携带 Commons 元数据（尺寸/license/作者/条目自述），payload_ref 指向本地资产文件。
  const photoSources = photoSourcesForRun;
  const photoUnits = [];
  for (const p of photoSources) {
    const unitId = randomUUID();
    await dbRun(
      `insert into source.read_units
       (read_unit_id, read_run_id, method_code, kind, locator_schema, locator, ordinal, payload_ref, locator_hash)
       values (:'unit_id'::uuid, :'read_run_id'::uuid, 'C04', 'image', 'commons', :'locator'::jsonb, :'ordinal', :'payload_ref', :'locator_hash')`,
      {
        unit_id: unitId, read_run_id: readRunId,
        locator: JSON.stringify({
          source_version_id: p.source_version_id, commons_title: p.commons_title,
          width: p.width, height: p.height, license: p.license, artist: p.artist,
          description: p.description, checksum: p.checksum,
        }),
        ordinal: readUnits.length + photoUnits.length + 1,
        payload_ref: p.asset_path,
        locator_hash: String(p.checksum ?? "").slice(0, 16),
      }
    );
    photoUnits.push({ read_unit_id: unitId, source_version_id: p.source_version_id, source_id: p.source_id, kind: "image", photo: p });
  }

  await writeGate(runId, "D01", "G1", "read_run", readRunId, "PASS", [], { unit_count: readUnits.length, image_unit_count: photoUnits.length });

  return {
    disposition: "PASS",
    output: { read_run_id: readRunId, read_units: readUnits, photo_units: photoUnits, photo_sources: photoSources, count: readUnits.length },
    gate_evidence: { stage: "D01", method: "C01", unit_count: readUnits.length, image_unit_count: photoUnits.length },
    content_stats: { reading_units: readUnits.length, image_units: photoUnits.length },
    review_records: readUnits.map((u) => ({ read_unit_id: u.read_unit_id, literal: u.literal.slice(0, 30) })),
  };
}

// ============================================================
// D02 材料观察（L2/G2）——H05/H04，调 DeepSeek
// ============================================================
const D02_SYSTEM = `你是墨痕数据生产的 D02 材料观察器，方法 H05 地方志（主）/ H04 历史地理著作（邻类）。
按【分类→定位关键区→精读→结构化输出】四步跳读，只观察材料，不建世界事实、不判史实真伪。
输出必须是严格符合下面 JSON schema 的单个 JSON 对象，不要 markdown、不要额外文字：
{
  "schema_version": "d02-material-observation.v1",
  "reading_units": [{"reading_unit_id":"ru-1","unit_path":"片段A","primary_h_type":"H05","classification_status":"resolved","classification_basis":"地方志编纂体例"}],
  "classification_decisions": [{"decision_id":"cd-1","reading_unit_id":"ru-1","primary_h_type":"H05","alternatives":["H04"],"status":"decided","basis":"地名沿革兼历史地理，主类仍为地方志"}],
  "material_mentions": [{"mention_id":"m-1","evidence_id":"e-1","mention_kind":"place","literal_text":"白苎里","span_in_evidence":{},"precision":{},"uncertainty":{}}],
  "material_evidence": [{"evidence_id":"e-1","source_voice":"本届纂修者叙述","voice_basis":"unknown","assertion_kind":"record","literal_reading":"古名白苎里","research_proposition":"材料记载金泽古名白苎里"}],
  "reading_unit_dependencies": []
}
硬性字段规则：material_mentions.mention_kind 只能取 person/time/place/thing/number；material_evidence.assertion_kind 只能取 record/norm/wish/hearsay/argument/fiction/hypothesis；material_evidence.voice_basis 只能取 direct_witness/transcription/reported/advert/hearsay/unknown；人/时/地/物/数逐条进 material_mentions，禁止写 world.entity_id。`;

async function deepseekChat(system, user) {
  if (!DEEPSEEK_KEY) throw new Error("DEEPSEEK_API_KEY 未设置");
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, temperature: 0, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`DEEPSEEK_HTTP_${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  const content = json?.choices?.[0]?.message?.content ?? "";
  const m = content.match(/\{[\s\S]*\}/);
  const parsed = m ? JSON.parse(m[0]) : null;
  return { parsed, raw: content, usage: json?.usage ?? {}, model: json?.model };
}

async function d02MaterialUnderstanding({ run, job, input, context }) {
  const runId = run.run_id;
  const allUnits = input?.read_units || input?.qualified_reading?.read_units || [];
  const photoUnits = (input?.photo_units || []).filter((u) => u?.kind === "image" && u.photo);
  const units = allUnits.filter((u) => u.kind !== "image");
  if (!units.length && !photoUnits.length) return hold("NO_READING", "D02 无 reading_unit 输入", "先完成 D01 载体读取", "read_units 非空");
  if (!units.length) return hold("NO_TEXT_UNIT", "D02 无文本 reading_unit（仅有图像单元）", "先保证至少一份文本材料", "text read_units 非空");

  // 拼接所有文本片段作为 D02 输入（图像单元不走 LLM——本轮无多模态路由，见 D02 图像分支）
  const text = units.map((u) => u.literal).join("\n");
  let r;
  try {
    r = await deepseekChat(D02_SYSTEM, `请按上述 schema 处理以下${__TOPIC?.d02TopicPhrase ?? "金泽方志/地名志"}文本片段：\n${text}`);
  } catch (e) {
    return hold("LLM_FAIL", `D02 DeepSeek 调用失败: ${e.message}`, "重试或检查 key", "DeepSeek 返回成功");
  }
  if (!r.parsed) return hold("SCHEMA_INVALID", "D02 输出不符合 schema", "重试或收紧提示词", "schema 合规");

  const data = r.parsed;
  // 写 evidence.reading_units + classification_decisions + material_mentions + material_evidence
  const evidenceRows = [];
  const mentions = Array.isArray(data.material_mentions) ? data.material_mentions : [];
  const evidenceList = Array.isArray(data.material_evidence) ? data.material_evidence : [];

  // 每条 material_evidence 建一行，并**按原文片段确定性地归属到真实来源**。
  // 旧实现把全部观察都挂在「第一份 source」上，导致前端返证指向错误来源（D2/U4 不可接受）。
  // 归属规则：把 LLM 给出的 literal_reading 与各 read_unit 原文做去标点/去空白比对，
  // 取重叠最长者；完全无法定位时标 attribution=unattributed，绝不用「第一份」冒充。
  const normForMatch = (x) =>
    String(x ?? "").replace(/[\s"'“”‘’（）()《》〈〉，,。.、：:；;！!？?—\-·]/g, "");
  const matchUnits = units.map((u) => ({ u, norm: normForMatch(u.literal) })).filter((x) => x.norm.length > 0);
  function attributeEvidence(literalReading) {
    const target = normForMatch(literalReading);
    if (!target) return null;
    let best = null;
    for (const { u, norm } of matchUnits) {
      if (!norm) continue;
      if (norm.includes(target) || target.includes(norm)) {
        const score = Math.min(norm.length, target.length);
        if (!best || score > best.score) best = { u, score };
      }
    }
    return best?.u ?? null;
  }

  for (const e of evidenceList) {
    const evId = randomUUID();
    const unit = attributeEvidence(e.literal_reading);
    // 外键要求必须有真实来源；定不到片段时归到本批材料来源，并如实标注 batch_level，
    // 前端据此显示「来源未能定位到具体段落」，不会假装精确。
    const fallbackUnit = unit ?? units[0] ?? null;
    const src = unit?.source_id || fallbackUnit?.source_id || null;
    const locator = unit
      ? {
          attribution: "exact_fragment_match",
          source_title: unit.source_title ?? "",
          source_version_id: unit.source_version_id,
          fragment_index: unit.fragment_index,
          publisher: unit.publisher ?? "",
          source_date: unit.source_date ?? "",
          url: unit.url ?? "",
        }
      : {
          attribution: "batch_level",
          note: "未能把该观察定位到具体材料片段，仅归属到本批材料来源；不冒充精确出处",
          source_title: fallbackUnit?.source_title ?? "",
          source_version_id: fallbackUnit?.source_version_id ?? null,
          fragment_index: null,
          publisher: fallbackUnit?.publisher ?? "",
          source_date: fallbackUnit?.source_date ?? "",
          url: fallbackUnit?.url ?? "",
        };
    await dbRun(
      `insert into evidence.material_evidence
       (evidence_id, source_id, locator, modality, literal_reading, normalized_text, research_proposition,
        source_voice, evidence_type, uncertainty, extraction_method, maturity,
        assertion_kind, voice_basis, quote_review_status, evidence_version_no, input_fingerprint)
       values (:'ev_id'::uuid, :'source_id'::uuid, :'locator'::jsonb, 'digital_text', :'literal', :'normalized', :'proposition',
               :'voice', 'gazetteer_observation', '{}'::jsonb, '{}'::jsonb, 'candidate',
               :'assertion', :'voice_basis', 'unverified', 1, :'fingerprint')`,
      {
        ev_id: evId, source_id: src || "00000000-0000-0000-0000-000000000000",
        locator: JSON.stringify(locator),
        literal: e.literal_reading || "", normalized: e.normalized_text || "",
        proposition: e.research_proposition || "", voice: e.source_voice || "unknown",
        assertion: e.assertion_kind || "record", voice_basis: e.voice_basis || "unknown",
        fingerprint: sha256((e.literal_reading || "") + PROMPT_VERSION),
      }
    );
    evidenceRows.push({ ...e, evidence_id: evId, source_id: src, locator });
  }

  // V1.5 视觉批次：图像材料观察（确定性，无 LLM）——照片的"观察"= Commons 条目自述
  // （摄影者/上传者对画面的说明）。voice_basis=reported：这是来源自述，不是墨痕的目击核实。
  // 图像不进入世界实体抽取（D03 文本链路），只作视觉对象的对应依据。
  const photoEvidenceRows = [];
  for (const u of photoUnits) {
    const p = u.photo;
    const evId = randomUUID();
    const selfDesc = p.description || "";
    await dbRun(
      `insert into evidence.material_evidence
       (evidence_id, source_id, locator, modality, literal_reading, normalized_text, research_proposition,
        source_voice, evidence_type, uncertainty, extraction_method, maturity,
        assertion_kind, voice_basis, quote_review_status, evidence_version_no, input_fingerprint)
       values (:'ev_id'::uuid, :'source_id'::uuid, :'locator'::jsonb, 'image', :'literal', '', :'proposition',
               :'voice', 'photograph_observation', '{}'::jsonb, '{"method":"deterministic-registration"}'::jsonb, 'candidate',
               'record', 'reported', 'unverified', 1, :'fingerprint')`,
      {
        ev_id: evId, source_id: p.source_id || "00000000-0000-0000-0000-000000000000",
        locator: JSON.stringify({ commons_title: p.commons_title, asset_path: p.asset_path, display_url: p.display_url, width: p.width, height: p.height, license: p.license, artist: p.artist }),
        literal: selfDesc,
        proposition: `${p.entity_label}今貌影像（今日观察）；Commons 条目自述：${selfDesc || "（条目未提供描述）"}`,
        voice: `Wikimedia Commons 条目自述（${p.artist}）`,
        fingerprint: sha256((p.commons_title || "") + "c04-v1"),
      }
    );
    photoEvidenceRows.push({
      evidence_id: evId, source_id: p.source_id, modality: "image",
      literal_reading: selfDesc, research_proposition: `${p.entity_label}今貌影像`,
      feature_key: p.feature_key, entity_label: p.entity_label,
      asset_path: p.asset_path, display_url: p.display_url,
      license: p.license, artist: p.artist, commons_title: p.commons_title,
    });
  }

  // material_mentions
  for (const mnt of mentions) {
    await dbRun(
      `insert into evidence.material_mentions
       (mention_id, evidence_id, mention_kind, literal_text, span_in_evidence, precision, uncertainty)
       values (:'mnt_id'::uuid, :'ev_id'::uuid, :'kind', :'literal', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)`,
      {
        mnt_id: randomUUID(), ev_id: evidenceRows[0]?.evidence_id || "00000000-0000-0000-0000-000000000000",
        kind: mnt.mention_kind || "thing", literal: mnt.literal_text || "",
      }
    );
  }

  await writeGate(runId, "D02", "G2", "material_evidence", evidenceRows[0]?.evidence_id || "00000000-0000-0000-0000-000000000000", "PASS", [], { mention_count: mentions.length, evidence_count: evidenceRows.length, image_evidence_count: photoEvidenceRows.length, model: r.model });

  return {
    disposition: "PASS",
    output: { material_evidence: evidenceRows, material_mentions: mentions, photo_evidence: photoEvidenceRows, count: evidenceRows.length },
    gate_evidence: { stage: "D02", methods: ["H05", "H04"], evidence_count: evidenceRows.length, mention_count: mentions.length, image_evidence_count: photoEvidenceRows.length, model: r.model, tokens: r.usage },
    content_stats: { observations: evidenceRows.length, mentions: mentions.length, image_observations: photoEvidenceRows.length },
    review_records: evidenceRows.map((e) => ({ evidence_id: e.evidence_id, proposition: (e.research_proposition || "").slice(0, 60) })),
  };
}

// ============================================================
// D03 世界建构（L3/G3）——W01/W02/W05/W09，调 DeepSeek
// ============================================================
let D03_SYSTEM = `你是墨痕数据生产的 D03 世界建构器，方法 W01 身份 / W02 时间 / W05 关系 / W09 冲突与边界。
从 D02 材料观察陈述里建构历史世界：识别实体（桥/寺/人/地/水道）与有据关系，保留 candidate 认识状态，不把"材料记载"升为"已证事实"。
只输出一个 JSON，不要 markdown、不要额外文字：
{
  "entities":[{"label":"万安桥","entity_type":"bridge","time_scope":{"dynasty":"南宋","year":1260,"precision":"era"},"spatial_note":"金泽镇北市（青浦区政府/上图地名库）"}],
  "relations":[{"subject":"万安桥","predicate":"spans_waterway","object":"桥所跨水道（名称待定）","basis":"青浦区政府：万安桥跨金泽塘","epistemic":"candidate"}],
  "changes":[{"subject":"万安桥","change_type":"built","before_state":"","after_state":"建于南宋景定年间","time_scope":{"dynasty":"南宋","year":1260,"precision":"era"},"basis":"光绪《青浦县志》：南宋景定年间建（万安桥）"}],
  "conflicts":[{"conflict_key":"T11-C2","object_type":"waterway_name","subject_label":"桥所跨水道（名称待定）","variants":[{"value":"金泽塘","source":"上海市青浦区人民政府"},{"value":"秀州塘","source":"上海图书馆开放数据·地名库"},{"value":"市河","source":"上海青浦博物馆"}],"note":"同一水道名称三种着录，并列保留"}],
  "refusals":[{"subject_label":"颐浩寺遗址","object_label":"万安桥","reason":"全部材料中寺与桥无任何共现记载或功能联系描述，共现不等于关系","question":"颐浩寺遗址与万安桥等古桥之间是否存在历史功能联系？","missing_evidence":"寺与桥历史功能联系的直接文献"}],
  "open_questions":[{"question":"普济桥在金泽镇内的绝对方位是南市还是中部？","missing_evidence":"可裁决绝对方位的权威着录","next_research_action":"调取镇区历史户籍/街道档案核对","entities":["普济桥"]}]
}
规则：
1. 实体同名不合并；关系仅在有据时建立（共现≠关系）；时间保留原纪年不猜精确日（precision 取 exact_year/era/decade/unknown）；认识状态一律 candidate。
2. 实体名使用金泽库冻结规范名：材料中的"该寺"统一映射为"颐浩寺遗址"；桥名用万安桥/普济桥/迎祥桥；人物用吕颐浩；地名用金泽/白苎里。不得生造材料未出现的实体名。
3. W02 时间：只抽取材料明文记载的年代/纪年（如"南宋景定年间建""宋咸淳三年（1267年）建""建于元代"），登记为 changes；材料未载年代的对象不造 changes；"元代"按 era 处理，不得猜精确年份。
4. W09 冲突：同一对象（名称/方位/年代）有两种以上着录且无法判定时，登记 conflicts，variant 逐条带 source，你只负责如实并列；绝不得静默择一，不得把某说着法写进 entities 的规范名。conflict_key 与人工裁决记录对应时用其编号（普济桥绝对方位分歧=T11-C1；水道名称分歧=T11-C2；年代口径分歧=U4），无法对应的用 cf- 前缀自编号。
5. W09 边界：对"看起来可能有关系但材料无据"的对象对（如寺与桥），必须进 refusals 明确拒绝并给出理由——正确拒绝错误历史关系与成功发布真实合格知识同等重要。
6. W01 临时实体：多份材料对"桥所跨水道"给出互斥名称（金泽塘/秀州塘/市河）且无材料判定是否同一水道时，建立一个临时实体，label 用"桥所跨水道（名称待定）"，entity_type 用 waterway，把名称变体全部登记 conflicts；不得把三个名称合并成一个规范名，也不得生成任何河道几何。光绪《青浦县志》"同跨一河"只支持万安桥与普济桥共跨同一水道的相对关系，不支持精确几何。`;

async function d03WorldConstruction({ run, job, input, context }) {
  const runId = run.run_id;
  const evidence = input?.material_evidence || [];
  if (!evidence.length) return hold("NO_EVIDENCE", "D03 无 material_evidence 输入", "先完成 D02 材料观察", "material_evidence 非空");

  const propositions = evidence.map((e) => e.research_proposition || "").filter(Boolean).join("\n");
  let r;
  try {
    r = await deepseekChat(D03_SYSTEM, `请从以下材料观察陈述建构历史世界：\n${propositions}`);
  } catch (e) {
    return hold("LLM_FAIL", `D03 DeepSeek 调用失败: ${e.message}`, "重试", "DeepSeek 返回成功");
  }
  if (!r.parsed) return hold("SCHEMA_INVALID", "D03 输出不符合 schema", "重试", "schema 合规");

  const data = r.parsed;
  const entities = Array.isArray(data.entities) ? data.entities : [];
  const relations = Array.isArray(data.relations) ? data.relations : [];
  const changes = Array.isArray(data.changes) ? data.changes : [];
  const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
  const refusals = Array.isArray(data.refusals) ? data.refusals : [];
  const openQuestions = Array.isArray(data.open_questions) ? data.open_questions : [];

  const entityIdByLabel = new Map();
  const worldEntities = [];
  for (const ent of entities) {
    const eid = randomUUID();
    await dbRun(
      `insert into world.entities
       (entity_id, entity_type, canonical_label, aliases, temporal_scope, spatial_scope, attributes, maturity)
       values (:'eid'::uuid, :'etype', :'label', '{}'::text[], :'temporal'::jsonb, :'spatial'::jsonb, '{}'::jsonb, 'candidate')`,
      {
        eid, etype: ent.entity_type || "thing", label: ent.label || "",
        temporal: JSON.stringify(ent.time_scope ?? {}),
        // spatial_scope 只记无争议方位注记；有争议的方位进 world.conflicts，不在这里静默择一
        spatial: JSON.stringify(ent.spatial_note ? { textual_position: ent.spatial_note } : {}),
      }
    );
    entityIdByLabel.set(ent.label, eid);
    worldEntities.push({ entity_id: eid, label: ent.label, entity_type: ent.entity_type || "thing" });
  }

  const worldRelations = [];
  for (const rel of relations) {
    const sid = entityIdByLabel.get(rel.subject);
    const oid = entityIdByLabel.get(rel.object);
    if (!sid || !oid) continue;
    const rid = randomUUID();
    await dbRun(
      `insert into world.relation_claims
       (relation_claim_id, relation_type, subject_entity_id, object_entity_id, time_scope, space_scope, expression_rule, maturity)
       values (:'rid'::uuid, :'rtype', :'sid'::uuid, :'oid'::uuid, '{}'::jsonb, '{}'::jsonb, :'expr'::jsonb, 'candidate')`,
      { rid, rtype: rel.predicate || "related_to", sid, oid, expr: JSON.stringify({ basis: rel.basis || "", epistemic: rel.epistemic || "candidate" }) }
    );
    const crId = randomUUID();
    await dbRun(
      `insert into world.claim_revisions
       (claim_revision_id, subject_kind, subject_id, revision_no, assertion_payload_json, producer_method_id, authored_at)
       values (:'cr_id'::uuid, 'relation_claim', :'rid'::uuid, 1, :'payload'::jsonb, 'W05', now())`,
      { cr_id: crId, rid, payload: JSON.stringify({ subject: rel.subject, predicate: rel.predicate, object: rel.object, basis: rel.basis || "" }) }
    );
    worldRelations.push({ relation_claim_id: rid, subject: rel.subject, predicate: rel.predicate, object: rel.object });
  }

  // V1.5 视觉批次：W03 视觉对应核定（照片 ↔ 实体；视觉身份 = V3 今日观察）
  // correspondence_claim 只登记「该影像被（人工策展清单 + Commons 条目）断言描绘该实体今日面貌」，
  // 不声称墨痕核对了画面内容——本轮无多模态路由（模型纪律 §六），画面判读留待后续批次。
  const worldVisuals = [];
  const photoEvidence = Array.isArray(input?.photo_evidence) ? input.photo_evidence : [];
  for (const pe of photoEvidence) {
    const subjectId = entityIdByLabel.get(pe.entity_label);
    if (!subjectId) continue;
    const voId = randomUUID();
    await dbRun(
      `insert into world.visual_objects
       (visual_object_id, source_id, subject_entity_id, visual_type, asset_ref, literal_reading, time_scope, space_scope, correspondence_claim, maturity)
       values (:'vo_id'::uuid, :'source_id'::uuid, :'sid'::uuid, 'today_photo', :'asset_ref', :'literal', :'tscope'::jsonb, '{}'::jsonb, :'corr'::jsonb, 'candidate')`,
      {
        vo_id: voId, source_id: pe.source_id || "00000000-0000-0000-0000-000000000000", sid: subjectId,
        asset_ref: pe.asset_path ?? "",
        literal: pe.literal_reading ?? "",
        tscope: JSON.stringify({ era: "当代", precision: "contemporary" }),
        corr: JSON.stringify({
          asserts_depicts: pe.entity_label,
          visual_identity: "V3_today_observation",
          basis: __TOPIC?.visualBasis ?? "人工策展清单（jinze-present-day-photos.json）+ Commons 条目自述",
          license: pe.license ?? "", artist: pe.artist ?? "", commons_title: pe.commons_title ?? "",
        }),
      }
    );
    worldVisuals.push({
      visual_object_id: voId, subject: pe.entity_label, subject_entity_id: subjectId,
      source_id: pe.source_id ?? null,
      asset_path: pe.asset_path ?? "", display_url: pe.display_url ?? "",
      literal_reading: pe.literal_reading ?? "", license: pe.license ?? "", artist: pe.artist ?? "",
      commons_title: pe.commons_title ?? "", evidence_id: pe.evidence_id ?? null,
    });
  }

  // W02：时间变化（只登记材料明文有着录的年代）
  const worldChanges = [];
  for (const ch of changes) {
    const sid = entityIdByLabel.get(ch.subject);
    if (!sid) continue;
    const changeId = randomUUID();
    await dbRun(
      `insert into world.changes
       (change_id, subject_entity_id, change_type, before_state, after_state, time_scope, expression_rule, maturity)
       values (:'cid'::uuid, :'sid'::uuid, :'ctype', :'before'::jsonb, :'after'::jsonb, :'tscope'::jsonb, :'expr'::jsonb, 'candidate')`,
      {
        cid: changeId, sid, ctype: ch.change_type || "unknown",
        before: JSON.stringify(ch.before_state ? { text: ch.before_state } : {}),
        after: JSON.stringify(ch.after_state ? { text: ch.after_state } : {}),
        tscope: JSON.stringify(ch.time_scope ?? {}),
        expr: JSON.stringify({ basis: ch.basis || "" }),
      }
    );
    // LLM 输出的 after_state 为明文字符串（DB 落库时包 {text}）；透传保持明文字符串
    worldChanges.push({ change_id: changeId, subject: ch.subject, change_type: ch.change_type || "unknown", after_state: ch.after_state ?? "", time_scope: ch.time_scope ?? {} });
  }

  // W09：着录分歧登记（并列保留，不裁决）
  // resolution_note 按人工裁决记录编号逐条对应；无法对应的给通用口径。
  let CONFLICT_NOTES = Object.freeze(__TOPIC?.conflictNotes ?? {
    "T11-C1": "人工裁决记录（TASK-0011 T11-C1）：Legacy「北市」说已退休为研究线索，不得作为 active historical assertion；南市/中部两说并列保留，本 run 不代为裁决。",
    "T11-C2": "人工裁决记录（TASK-0011 T11-C2/U13）：「秀州塘＋万安桥」组合另见于金山朱泾镇，疑跨镇误配；「市河」为异称（U13）；本 run 只登记不裁决。",
    "U4": "人工裁决记录（TASK-0011 U4）：年代口径分歧保留，caption 内部朝代自相矛盾项不作为断代依据。",
  });
  const worldConflicts = [];
  const conflictDerivedQuestions = [];
  for (const cf of conflicts) {
    const variantList = Array.isArray(cf.variants) ? cf.variants : [];
    // 护栏：冲突必须有两种以上着录；单一着录 + 精度/口径不明 = 开放问题，不是冲突
    if (variantList.length < 2) {
      conflictDerivedQuestions.push({
        question: `${cf.subject_label ?? ""}的${cf.object_type === "date_precision" ? "确切年代" : "确切说法"}为何？（现有着录：${variantList.map((v) => v.value).join("；") || "无"}）`,
        missing_evidence: variantList[0]?.source || "第二种独立着录",
        entities: cf.subject_label ? [cf.subject_label] : [],
      });
      continue;
    }
    const conflictKey = cf.conflict_key || `cf-${randomUUID().slice(0, 8)}`;
    // 幂等：conflict_key 是世界级稳定标识（对齐人工裁决编号），唯一约束全局生效——
    // 同键且变体集一致 → 复用已有登记（追加式重跑不重复造冲突）；
    // 同键但变体集漂移 → 显式 HOLD（世界模型漂移不静默覆盖，交人工复核）。
    // 争议身份 = conflict_key（人工裁决编号，世界级稳定标识）。
    // 登记语义（着录汇集，只增不减）：同键已登记时——
    //   · 同一着录的不同措辞粒度视为同一说法（「南市梢」⊃「南市」，互相包含即同一）；
    //   · 真正新的着录 → 追加进登记（带来源），并写 world.claim_revisions 修订留痕（可审计）；
    //   · 本次未抽到的已登记着录 → 保留不删（可能是本次未抽取，非撤回）；
    //   · 绝不静默覆盖、绝不静默吞并；resolution_status 保持 open（登记 ≠ 裁决）。
    const sameClaim = (a, b) => {
      const x = String(a ?? "").trim();
      const y = String(b ?? "").trim();
      if (!x || !y) return false;
      return x === y || x.includes(y) || y.includes(x);
    };
    const existingId = await dbQueryValue(
      `select conflict_id::text from world.conflicts where conflict_key = :'k' limit 1`,
      { k: conflictKey }
    );
    if (existingId) {
      const storedVariant = await dbQueryValue(
        `select (variant->'variants')::text from world.conflicts where conflict_id = :'cid'::uuid`,
        { cid: existingId }
      );
      let storedList = [];
      try { storedList = JSON.parse(storedVariant || "[]"); } catch { storedList = []; }
      const newOnes = variantList.filter((v) => !storedList.some((s) => sameClaim(v.value, s.value)));
      const unionList = [...storedList, ...newOnes];
      if (newOnes.length > 0) {
        // 着录汇集：append 修订留痕 + 更新登记（版本化，不静默）
        const revNo = Number(
          (await dbQueryValue(
            `select coalesce(max(revision_no), 0)::text from world.claim_revisions
             where subject_kind='conflict' and subject_id = :'cid'::uuid`,
            { cid: existingId }
          )) ?? "0"
        ) + 1;
        await dbRun(
          `update world.conflicts set variant = :'v'::jsonb where conflict_id = :'cid'::uuid`,
          {
            cid: existingId,
            v: JSON.stringify({ subject_label: cf.subject_label ?? "", variants: unionList, note: cf.note || "" }),
          }
        );
        await dbRun(
          `insert into world.claim_revisions
           (claim_revision_id, subject_kind, subject_id, revision_no, assertion_payload_json, producer_method_id, authored_at)
           values (:'cr_id'::uuid, 'conflict', :'cid'::uuid, :'rev', :'payload'::jsonb, 'W09', now())`,
          {
            cr_id: randomUUID(), cid: existingId, rev: revNo,
            payload: JSON.stringify({
              operation: "variant_union",
              added: newOnes,
              variants: unionList,
              basis: "本次材料新着录（机器登记，非裁决）；resolution_status 保持 open",
            }),
          }
        );
      }
      worldConflicts.push({ conflict_id: existingId, conflict_key: conflictKey, subject_label: cf.subject_label ?? "", variants: unionList });
      continue;
    }
    const conflictId = randomUUID();
    const subjectId = entityIdByLabel.get(cf.subject_label) ?? null;
    await dbRun(
      `insert into world.conflicts
       (conflict_id, conflict_key, object_type, object_id, variant, resolution_status, resolution_note)
       values (:'cid'::uuid, :'ckey', :'otype', :'oid'::uuid, :'variant'::jsonb, 'open', :'note')`,
      {
        cid: conflictId, ckey: conflictKey,
        otype: cf.object_type || "claim",
        oid: subjectId ?? "00000000-0000-0000-0000-000000000000",
        variant: JSON.stringify({ subject_label: cf.subject_label ?? "", variants: Array.isArray(cf.variants) ? cf.variants : [], note: cf.note || "" }),
        note: CONFLICT_NOTES[conflictKey] ?? "本 run 只登记不裁决；择一须另有人工裁决或补证。",
      }
    );
    worldConflicts.push({ conflict_id: conflictId, conflict_key: conflictKey, subject_label: cf.subject_label ?? "", variants: Array.isArray(cf.variants) ? cf.variants : [] });
  }

  // W09 边界：无据关系明确拒绝 + 开放问题登记（finding_id 可空，属 D03 认识层产出；
  // missing_evidence 为 jsonb 列，按 [{text}] 结构写入）
  const worldRefusals = [];
  for (const rf of refusals) {
    const oqId = randomUUID();
    await dbRun(
      `insert into meaning.open_questions
       (open_question_id, finding_id, question, missing_evidence, next_research_action, status)
       values (:'oqid'::uuid, null, :'q', :'missing'::jsonb, :'next', 'open')`,
      {
        oqid: oqId,
        q: `[关系拒绝] ${rf.subject_label} ↔ ${rf.object_label}：${rf.question}（${rf.reason}）`,
        missing: JSON.stringify([{ text: rf.missing_evidence || "直接文献" }]),
        next: "补证后再评估是否建立关系；在补证前保持拒绝",
      }
    );
    worldRefusals.push({ open_question_id: oqId, subject_label: rf.subject_label, object_label: rf.object_label, reason: rf.reason, question: rf.question, missing_evidence: rf.missing_evidence || "" });
  }
  for (const oq of [...openQuestions, ...conflictDerivedQuestions]) {
    const oqId = randomUUID();
    await dbRun(
      `insert into meaning.open_questions
       (open_question_id, finding_id, question, missing_evidence, next_research_action, status)
       values (:'oqid'::uuid, null, :'q', :'missing'::jsonb, :'next', 'open')`,
      {
        oqid: oqId,
        q: oq.question || "",
        missing: JSON.stringify([{ text: oq.missing_evidence || "未注明" }]),
        next: oq.next_research_action || "待定",
      }
    );
    worldRefusals.push({ open_question_id: oqId, question: oq.question || "", missing_evidence: oq.missing_evidence || "", entities: Array.isArray(oq.entities) ? oq.entities : [] });
  }

  const openQuestionTotal = openQuestions.length + conflictDerivedQuestions.length;
  await writeGate(runId, "D03", "G3", "relation_claim", worldRelations[0]?.relation_claim_id || "00000000-0000-0000-0000-000000000000", "PASS", [], { entity_count: worldEntities.length, relation_count: worldRelations.length, change_count: worldChanges.length, conflict_count: worldConflicts.length, refusal_count: refusals.length, open_question_count: openQuestionTotal, model: r.model });

  return {
    disposition: "PASS",
    output: {
      entities: worldEntities,
      relations: worldRelations,
      changes: worldChanges,
      conflicts: worldConflicts,
      refusals: worldRefusals,
      evidences: input?.material_evidence || [],
      photo_evidence: photoEvidence,
      visual_objects: worldVisuals,
      count: worldRelations.length,
    },
    gate_evidence: { stage: "D03", methods: ["W01", "W02", "W05", "W09"], entity_count: worldEntities.length, relation_count: worldRelations.length, change_count: worldChanges.length, conflict_count: worldConflicts.length, refusal_count: refusals.length, open_question_count: openQuestionTotal, model: r.model, tokens: r.usage },
    content_stats: { entities: worldEntities.length, relations: worldRelations.length, changes: worldChanges.length, conflicts: worldConflicts.length, refusals: refusals.length, open_questions: openQuestionTotal },
    review_records: [
      ...worldRelations.map((x) => ({ relation: `${x.subject}-${x.predicate}-${x.object}` })),
      ...worldConflicts.map((c) => ({ conflict: c.conflict_key, variants: c.variants.map((v) => v.value).join("/") })),
      ...refusals.map((x) => ({ refused: `${x.subject_label}-${x.object_label}`, reason: x.reason })),
    ],
  };
}

// ============================================================
// D04 人文发现（L4/G4）——A01/A10，调 DeepSeek
// ============================================================
let D04_SYSTEM = `你是墨痕数据生产的 D04 人文发现器，方法 A01 显式关系解释 / A10 冲突发现。
从 D03 世界关系、着录分歧与边界拒绝里产出非平庸解释增量；事实与解释分离；candidate 不升 fact；不编造因果；保留反证与开放问题。
只输出一个 JSON，不要 markdown、不要额外文字：
{"findings":[
  {"finding_type":"explicit_relation","interpretive_statement":"万安桥与普济桥一北一南同跨一河、形制相仿并称姐妹桥，反映南宋金泽渡口设施成对布局的工程传统","understanding_delta":"从两座独立古桥看到成对渡口结构","supporting_world_objects":["万安桥","普济桥"],"counter_view_or_alternative":"","missing_evidence":""},
  {"finding_type":"conflict_discovery","interpretive_statement":"三座古桥所跨水道在权威着录中有金泽塘、秀州塘、市河三种名称，名称争议本身即是该水道历史身份未定的证据","understanding_delta":"水道名称分歧提示历史身份仍需补证","supporting_world_objects":["桥所跨水道（名称待定）"],"counter_view_or_alternative":"秀州塘之名或为跨镇误配（人工裁决记录提示另见于金山朱泾镇）","missing_evidence":"可判定同一性的水道历史文献"}
]}
规则：
1. finding_type 只取 explicit_relation / conflict_discovery / candidate_relation；
2. interpretive_statement 写人话解释增量，不照抄材料原文，不编造因果；
3. conflict_discovery 必须如实呈现分歧多方，counter_view_or_alternative 写对立说法，不得择一说事；
4. 对 refusals 中的无据关系，不得生成"证实关系"类发现——可以生成"为何不能建立"的认识增量。`;

async function d04HumanisticDiscovery({ run, job, input, context }) {
  const runId = run.run_id;
  const relations = input?.relations || [];
  const conflicts = Array.isArray(input?.conflicts) ? input.conflicts : [];
  const refusals = Array.isArray(input?.refusals) ? input.refusals : [];
  if (!relations.length) return hold("NO_WORLD", "D04 无世界关系输入", "先完成 D03 世界建构", "relations 非空");

  const relText = relations.map((x) => `${x.subject} -${x.predicate}-> ${x.object}`).join("\n");
  const conflictText = conflicts
    .map((c) => `分歧 ${c.conflict_key}（${c.subject_label}）：${(c.variants || []).map((v) => `${v.value}（${v.source}）`).join("；")}`)
    .join("\n");
  const refusalText = refusals
    .map((x) => `拒绝 ${x.subject_label} ↔ ${x.object_label}：${x.reason}`)
    .join("\n");
  const userText = [
    "请从以下世界关系产出人文发现：",
    relText,
    conflictText ? `\n已登记的着录分歧：\n${conflictText}` : "",
    refusalText ? `\n已登记的边界拒绝：\n${refusalText}` : "",
  ].join("\n");

  let r;
  try {
    r = await deepseekChat(D04_SYSTEM, userText);
  } catch (e) {
    return hold("LLM_FAIL", `D04 DeepSeek 调用失败: ${e.message}`, "重试", "成功");
  }
  if (!r.parsed) return hold("SCHEMA_INVALID", "D04 输出不符合 schema", "重试", "schema 合规");

  const findings = Array.isArray(r.parsed.findings) ? r.parsed.findings : [];
  const findingRows = [];
  for (const f of findings) {
    const fid = randomUUID();
    await dbRun(
      `insert into meaning.findings
       (finding_id, finding_type, interpretive_statement, understanding_delta, supporting_world_objects,
        counter_view_or_alternative, missing_evidence, uncertainty, expression_rule, discovery_method, ranking_components, maturity)
       values (:'fid'::uuid, :'ftype', :'stmt', :'delta', :'support'::jsonb,
               :'counter'::jsonb, :'missing'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'candidate')`,
      {
        fid, ftype: f.finding_type || "explicit_relation", stmt: f.interpretive_statement || "", delta: f.understanding_delta || "",
        support: JSON.stringify(f.supporting_world_objects || []),
        counter: JSON.stringify(f.counter_view_or_alternative ? [{ text: f.counter_view_or_alternative }] : []),
        missing: JSON.stringify(f.missing_evidence ? [{ text: f.missing_evidence }] : []),
      }
    );
    findingRows.push({ finding_id: fid, finding_type: f.finding_type, interpretive_statement: f.interpretive_statement, supporting_world_objects: Array.isArray(f.supporting_world_objects) ? f.supporting_world_objects : [] });
  }

  // L4 今日联系（任务书 P2：D04/G4 必须交付「至少一个与当下生活有关的证据支持理解增量」）。
  // 只接受 LLM 在材料明载范围内给出的今日关系；basis_text 是材料原句，作为返证锚点。
  // 允许为空：为空表示本批材料说不清「今天的人如何用这处空间」——空是诚实结果，不拿空话填满。
  const presentConnections = [];
  const rawConnections = Array.isArray(r.parsed.present_connections) ? r.parsed.present_connections : [];
  for (const pc of rawConnections) {
    const linkedIdx = Number.isInteger(pc.linked_finding_index) ? pc.linked_finding_index : -1;
    const linkedFinding = findingRows[linkedIdx]?.finding_id ?? findingRows[0]?.finding_id ?? null;
    const pcId = randomUUID();
    await dbRun(
      `insert into meaning.present_connections
       (present_connection_id, finding_id, connection_type, observed_state, basis_world_objects,
        open_questions, expression_rule)
       values (:'pc_id'::uuid, :'fid'::uuid, :'ctype', :'state', :'objs'::jsonb, :'oqs'::jsonb, :'expr'::jsonb)`,
      {
        pc_id: pcId, fid: linkedFinding, ctype: pc.connection_type || "today_relation",
        state: pc.observed_state || "",
        objs: JSON.stringify(Array.isArray(pc.basis_world_objects) ? pc.basis_world_objects : []),
        oqs: JSON.stringify(Array.isArray(pc.open_questions) ? pc.open_questions.map((q) => ({ text: String(q) })) : []),
        expr: JSON.stringify({ basis_text: pc.basis_text || "", rule: "只有材料明载的今日使用才可呈现；不得编造人流/票价/活动" }),
      }
    );
    presentConnections.push({
      present_connection_id: pcId, connection_type: pc.connection_type || "today_relation",
      observed_state: pc.observed_state || "", basis_world_objects: Array.isArray(pc.basis_world_objects) ? pc.basis_world_objects : [],
      basis_text: pc.basis_text || "", open_questions: Array.isArray(pc.open_questions) ? pc.open_questions : [],
      finding_id: linkedFinding,
    });
  }

  await writeGate(runId, "D04", "G4", "finding", findingRows[0]?.finding_id || "00000000-0000-0000-0000-000000000000", "PASS", [], { finding_count: findingRows.length, present_connection_count: presentConnections.length, model: r.model });

  return {
    disposition: "PASS",
    // world 透传：D05 只投影本 run 的世界对象（追加式重跑不重复投影旧 run 成果）
    output: { findings: findingRows, count: findingRows.length, present_connections: presentConnections, world: { entities: input?.entities || [], relations, changes: input?.changes || [], conflicts, refusals, evidences: input?.evidences || [], photo_evidence: input?.photo_evidence || [], visual_objects: input?.visual_objects || [] } },
    gate_evidence: { stage: "D04", methods: ["A01", "A10"], finding_count: findingRows.length, present_connection_count: presentConnections.length, model: r.model, tokens: r.usage },
    content_stats: { findings: findingRows.length, present_connections: presentConnections.length },
    review_records: findingRows.map((f) => ({ finding_id: f.finding_id, statement: (f.interpretive_statement || "").slice(0, 60) })),
  };
}

// ============================================================
// D05 可信发布（L5/G5）——P01-P07，确定性为主（P04 组合走轻量 LLM 语义）
// ============================================================

// T1（2026-10-17）：按行精确标注实体——每条 story_seed / agent_context / evidence_pointer
// 只标注其内容文本真正涉及的实体，不再「全 7 实体」冒充（否则 Agent 检索无区分度，谁跟谁都命中）。
// 原则：宁可少不可多（宁可漏匹配，不可全量冒充）。world_projection 仍是全实体（世界投影本就覆盖全体）。
let ENTITY_MATCH_ALIASES = Object.freeze({
  "颐浩寺遗址": ["颐浩寺遗址", "颐浩寺"],
  "万安桥": ["万安桥", "万安"],
  "普济桥": ["普济桥", "普济"],
  "迎祥桥": ["迎祥桥"],
  "吕颐浩": ["吕颐浩"],
  "金泽": ["金泽"],
  "白苎里": ["白苎里"],
  // V1.4：W01 临时水道实体（名称争议未定）——只按已着录的三个名称匹配，不泛匹配"水道"
  "桥所跨水道（名称待定）": ["桥所跨水道（名称待定）", "金泽塘", "秀州塘", "市河"],
});

// ── 主题参数统一覆盖（模块加载时执行一次，位于所有 let 声明之后）──
// MOHEN_TOPIC_CONFIG 指向 topic-a001.mjs 时，材料/照片/提示词/实体别名全部替换为 A001；
// 不设环境变量则保持 金泽 默认。d03 局部 CONFLICT_NOTES 见其函数内（按主题默认）。
if (__TOPIC) {
  MATERIALS = __TOPIC.materials;
  PHOTO_MATERIALS = __TOPIC.photoMaterials ?? [];
  D03_SYSTEM = __TOPIC.d03System;
  D04_SYSTEM = __TOPIC.d04System;
  ENTITY_MATCH_ALIASES = Object.freeze(__TOPIC.entityAliases ?? {});
}

/** 返回文本内容真正涉及到的实体标签（确定性，去重，保持 labels 顺序）。 */
function entitiesForText(text, labels) {
  const hay = String(text ?? "");
  const hits = [];
  for (const label of labels) {
    const aliases = ENTITY_MATCH_ALIASES[label] ?? [label];
    if (aliases.some((a) => a && hay.includes(a))) hits.push(label);
  }
  return hits;
}

// V1.4：追加式重跑的 supersession 语义——本 adapter 每次 run 全量重产整片切口的
// L5 发布，因此新 run 发布前，将本切片此前的 current_valid G5 决策（两消费端）
// 全部置为失效（append-only：旧行保留、可审计，只是不再 current）。
async function supersedePriorG5(objectType) {
  // 主题隔离：仅失效与本主题前缀（TOPIC_KEY + "-"）同槽位的先前 G5，
  // 避免 A001 运行误伤 金泽 既有 G5（保护在线 金泽 体验的实时 read_model 层）。
  const prefix = `${TOPIC_KEY}-`;
  const keyed = {
    world_projection: { table: "read_model.world_projections", id: "projection_id" },
    map_timeline_projection: { table: "read_model.map_timeline_projections", id: "map_timeline_projection_id" },
  };
  const cfg = keyed[objectType];
  if (!cfg) return; // seed/ctx/oq/ep 按 run 唯一键天然隔离，无需前缀失效
  for (const consumer of ["agent", "visual_stage"]) {
    await dbRun(
      `update control.gate_audits g set current_valid = false
       from ${cfg.table} t
       where t.${cfg.id} = g.object_id::uuid
         and g.gate_code='G5' and g.object_type=:'otype' and g.result='PASS' and g.current_valid=true
         and g.consumer is not distinct from :'consumer'
         and t.projection_key like :'prefix' || '%'`,
      { otype: objectType, consumer, prefix }
    );
  }
}

async function d05ReadModelPublication({ run, job, input, context }) {
  const runId = run.run_id;

  // ── P08 精准失效（独立控制职责；与发布 job 的语义分离）──
  // registry 的 D05 job 合法绑定 P01–P08 全表，但 P08 是「独立触发的控制动作」：
  //   · 纯 P08 job（控制触发）→ 计算影响闭包 + 落控制事件 + 产出暂停/重审请求；
  //   · 与 P01–P07 混绑（常规发布 job）→ P08 延期不执行（gate_evidence 登记），发布继续；
  //   · 任何情况下不改写 G3/G4/G5 裁决、不复活旧修订、不成为第七类 L5 内容。
  const requested = Array.isArray(job?.methods) ? job.methods : [];
  const publishMethodsBound = requested.filter((m) => ["P01", "P02", "P03", "P04", "P05", "P06", "P07"].includes(m));
  let p08Deferred = false;
  if (requested.includes("P08") && publishMethodsBound.length === 0) {
    const analysis = computePreciseInvalidation({
      change_event_ref: input?.change_event_ref,
      changed_dependency_ref: input?.changed_dependency_ref,
      dependency_index: input?.dependency_index,
      reason: input?.reason,
    });
    // 控制事件落库（append-only；unknown_dependency 同样留痕——失败关闭不是静默无操作）
    await dbRun(
      `insert into control.invalidation_events
       (invalidation_event_id, change_event_ref, changed_dependency_ref, affected_publication_revisions,
        affected_purpose_scope_consumers, dependency_paths, reason, suspension_request, recheck_request,
        disposition, unknown_dependency, producer_method_id, producer_method_version)
       values (:'id'::uuid, :'cer'::jsonb, :'cdr'::jsonb, :'apr'::jsonb, :'apsc'::jsonb, :'dp'::jsonb,
               :'reason', :'sr'::jsonb, :'rr'::jsonb, :'disp', :'unk', 'P08', 'sample-trial-15')`,
      {
        id: randomUUID(),
        cer: JSON.stringify(analysis.change_event_ref ?? {}),
        cdr: JSON.stringify(analysis.changed_dependency_ref ?? {}),
        apr: JSON.stringify(analysis.affected_publication_revisions ?? []),
        apsc: JSON.stringify(analysis.affected_purpose_scope_consumers ?? []),
        dp: JSON.stringify(analysis.dependency_paths ?? []),
        reason: analysis.reason ?? "",
        sr: JSON.stringify(analysis.suspension_request ?? {}),
        rr: JSON.stringify(analysis.recheck_request ?? {}),
        disp: analysis.disposition ?? "BLOCKED",
        unk: analysis.unknown_dependency ?? false,
      }
    );
    return {
      disposition: "HOLD", // 失效是控制职责，不是发布 PASS。
      output: {},
      control_outputs: {
        invalidation_event: analysis,
        remediation_request: analysis.recheck_request ?? analysis.suspension_request,
      },
      gate_evidence: {
        stage: "D05",
        methods: ["P08"],
        control: "P08-invalidation",
        affected_publication_revisions: (analysis.affected_publication_revisions ?? []).length,
        unknown_dependency: analysis.unknown_dependency ?? false,
      },
      content_stats: {},
      review_records: [],
      hold: {
        reason_code: "INVALIDATION_COMPUTED",
        missing_requirement: "independent G5 re-review after invalidation",
        next_action: "route suspension_request to PD7 + recheck_request to independent G5",
        recheck_condition: "independent G5 records new decision",
      },
    };
  }
  if (requested.includes("P08")) p08Deferred = true; // 混绑于发布 job：独立控制动作另行触发，此处不执行

  const findings = input?.findings || [];
  if (!findings.length) return hold("NO_FINDING", "D05 无 finding 输入", "先完成 D04 人文发现", "findings 非空");
  const presentConnectionsIn = Array.isArray(input?.present_connections) ? input.present_connections : [];

  // V1.4：只投影本 run 的世界对象（追加式重跑不重复投影旧 run 成果——
  // 旧 run 成果由门禁 current_valid 规则自然失效，投影本身不叠加）。
  const world = input?.world ?? {};
  const entities = Array.isArray(world.entities) ? world.entities : [];
  const relations = Array.isArray(world.relations) ? world.relations : [];
  const changes = Array.isArray(world.changes) ? world.changes : [];
  const conflicts = Array.isArray(world.conflicts) ? world.conflicts : [];
  const refusals = Array.isArray(world.refusals) ? world.refusals : [];
  const evidences = Array.isArray(world.evidences) ? world.evidences : [];
  const visualObjects = Array.isArray(world.visual_objects) ? world.visual_objects : [];
  if (!entities.length) return hold("NO_WORLD", "D05 无本 run 世界对象", "先完成 D03 世界建构", "world.entities 非空");

  const entityLabels = entities.map((e) => e.canonical_label ?? e.label).filter(Boolean);
  const relLines = relations.map((r) => `${r.subject}—${r.relation_type ?? r.predicate}—${r.object}`);
  const fidArr = findings.map((f) => f.finding_id).join(",");
  const conflictLines = conflicts.map(
    (c) => `${c.conflict_key}｜${c.subject_label}：${(c.variants || []).map((v) => `${v.value}（${v.source}）`).join("；")}`
  );
  const openQuestionRows = refusals.map((rf) => {
    const explicit = (Array.isArray(rf.entities) ? rf.entities : []).filter((l) => entityLabels.includes(l));
    const fromText = entitiesForText(`${rf.question ?? ""}${rf.subject_label ?? ""}${rf.object_label ?? ""}`, entityLabels);
    return {
      open_question_id: rf.open_question_id,
      question: rf.question ?? "",
      missing_evidence: rf.missing_evidence ?? "",
      // 实体关联 = 文本匹配 ∪ 显式声明（泛称问题如"是否同一水道"靠显式声明挂靠）
      entities: [...new Set([...fromText, ...explicit])],
    };
  });

  // 追加式重跑 supersession：本 run 全量重产六类 L5，旧 run 的同类型 current 决策先失效
  for (const t of ["world_projection", "map_timeline_projection", "story_seed", "agent_context", "discovery_path", "evidence_pointer"]) {
    await supersedePriorG5(t);
  }

  // P02 世界投影（视觉舞台 + Agent 消费的核心；payload 含实体/关系/冲突/未决问题）
  // 键按 run 作用域：projection_key 有全局唯一约束，追加式重跑 = 同槽位新修订（append-only），
  // 旧修订行保留、其 G5 决策由 supersession 置失效；读取侧取 newest current_valid，与键无关。
  const projKey = `${TOPIC_KEY}-layer3-world@${runId.slice(0, 8)}`;
  const projId = randomUUID();
  await dbRun(
    `insert into read_model.world_projections
     (projection_id, projection_key, payload, derived_from_finding_ids, expression_rule)
     values (:'proj_id'::uuid, :'proj_key', :'payload'::jsonb, :'fids'::uuid[], '{}'::jsonb)`,
    {
      proj_id: projId, proj_key: projKey,
      payload: JSON.stringify({
        title: __TOPIC?.d05WorldTitle ?? "金泽古桥·寺院·水道（第三层边界验证）",
        entities: entityLabels.join(" "),
        relations: relLines,
        conflicts: conflictLines,
        conflicts_detail: conflicts.map((c) => ({
          key: c.conflict_key,
          subject: c.subject_label ?? "",
          variants: (c.variants || []).map((v) => ({ value: v.value ?? "", source: v.source ?? "" })),
        })),
        open_questions: openQuestionRows.map((oq) => ({ question: oq.question, missing_evidence: oq.missing_evidence })),
        open_question_count: openQuestionRows.length,
        // L4 今日联系投影：视觉舞台「今天」这一幕的正面内容（材料明载的到达/使用方式），
        // 与 findings 的解释增量区分开——这是「现在的人真的能怎么用」而不是「历史解释」。
        present_connections: presentConnectionsIn.map((pc) => ({
          type: pc.connection_type,
          observed_state: pc.observed_state,
          basis_text: pc.basis_text ?? "",
          // 实体 = 文本精确命中 ∪ D04 显式声明的依据对象（都是生产链自己的标注，不在这里猜）
          entities: [
            ...new Set([
              ...entitiesForText(`${pc.observed_state ?? ""}${pc.basis_text ?? ""}`, entityLabels),
              ...(Array.isArray(pc.basis_world_objects) ? pc.basis_world_objects.filter((l) => entityLabels.includes(l)) : []),
            ]),
          ].join(" "),
          open_questions: pc.open_questions ?? [],
        })),
        source_ref: `production-run:${runId}`,
      }),
      fids: `{${fidArr}}`,
    }
  );
  await writeGate(runId, "D05", "G5", "world_projection", projId, "PASS", [], { kind: "world_projection" }, "agent");
  await writeGate(runId, "D05", "G5", "world_projection", projId, "PASS", [], { kind: "world_projection" }, "visual_stage");

  // P03 时空投影（V1.4 新增发布）：只投影本 run 有着录的时间变化，无载年代者不画
  let tlId = null;
  if (changes.length > 0) {
    tlId = randomUUID();
    const eventLines = changes.map((ch) => {
      const ts = ch.time_scope ?? {};
      const year = ts.year ? String(ts.year) : ts.dynasty ? String(ts.dynasty) : "年代不详";
      return `${ch.subject}｜${ch.change_type}｜${year}｜${ch.after_state ?? ""}`;
    });
    await dbRun(
      `insert into read_model.map_timeline_projections
       (map_timeline_projection_id, projection_key, payload, derived_from_world_objects)
       values (:'tl_id'::uuid, :'tl_key', :'payload'::jsonb, :'objs'::jsonb)`,
      {
        tl_id: tlId, tl_key: `${TOPIC_KEY}-layer3-timeline@${runId.slice(0, 8)}`,
        payload: JSON.stringify({
          title: __TOPIC?.d05TimelineTitle ?? "金泽古桥·寺院·水道（时间投影）",
          entities: entityLabels.join(" "),
          source_ref: `production-run:${runId}`,
          time_hint: eventLines.map((l) => l.split("｜")[2]).filter((y) => y && y !== "年代不详").join(" "),
          events: changes.map((ch) => ({
            entity: ch.subject,
            change_type: ch.change_type,
            after_state: ch.after_state ?? "",
            dynasty: (ch.time_scope ?? {}).dynasty ?? "",
            year: (ch.time_scope ?? {}).year ?? null,
            precision: (ch.time_scope ?? {}).precision ?? "unknown",
          })),
        }),
        objs: JSON.stringify(entities.map((e) => e.entity_id ?? e.label)),
      }
    );
    await writeGate(runId, "D05", "G5", "map_timeline_projection", tlId, "PASS", [], { kind: "map_timeline_projection" }, "agent");
    await writeGate(runId, "D05", "G5", "map_timeline_projection", tlId, "PASS", [], { kind: "map_timeline_projection" }, "visual_stage");
  }

  // P04 故事种子（每条 finding）
  const storySeeds = [];
  for (const f of findings) {
    const seedId = randomUUID();
    await dbRun(
      `insert into read_model.story_seeds
       (story_seed_id, seed_key, title, narrative_question, payload, derived_from_finding_ids, evidence_pointer_ids)
       values (:'seed_id'::uuid, :'key', :'title', :'q', :'payload'::jsonb, :'fids'::uuid[], '{}'::uuid[])`,
      {
        seed_id: seedId, key: `seed-${f.finding_id.slice(0, 8)}`, title: __TOPIC?.d05SeedTitle ?? "金泽古桥·寺院·水道",
        q: "哪些历史关系能够证实，哪些仍有疑问？",
        payload: JSON.stringify({ statement: f.interpretive_statement, entities: entitiesForText(f.interpretive_statement, entityLabels).join(" ") }),
        fids: `{${f.finding_id}}`,
      }
    );
    await writeGate(runId, "D05", "G5", "story_seed", seedId, "PASS", [], { kind: "story_seed" }, "agent");
    await writeGate(runId, "D05", "G5", "story_seed", seedId, "PASS", [], { kind: "story_seed" }, "visual_stage");
    storySeeds.push({
      story_seed_id: seedId, finding_id: f.finding_id,
      entities: entitiesForText(f.interpretive_statement, entityLabels),
    });
  }

  // P04 agent_contexts（每条 finding，供 Agent 消费；V1.4 增补冲突/拒绝/未决口径，
  // 使 Agent 对无证据关系必须回答"还没有登记"，而不是被关键词命中带偏）
  const agentContexts = [];
  for (const f of findings) {
    const ctxId = randomUUID();
    const summaryParts = [f.interpretive_statement];
    if (conflictLines.length) summaryParts.push(`着录分歧（未裁决）：${conflictLines.join("；")}`);
    // 拒绝登记分两类：无据对象对（有 subject/object）与 开放问题（无对象对）。
    // 旧实现统一按对象对拼接，导致 Agent 上下文里出现「undefined ↔ undefined 无据」这类脏行。
    const refusalLines = refusals
      .map((rf) =>
        rf.subject_label && rf.object_label
          ? `${rf.subject_label} ↔ ${rf.object_label} 无据，未建立关系`
          : rf.question
            ? `待证问题：${rf.question}（${rf.missing_evidence || "缺直接证据"}）`
            : null
      )
      .filter(Boolean);
    // 拒绝/待证不进 summary：summary 是墨痕要读给用户听的那句话，
    // 把清单灌进去会让一句人话变成台账。它们已在 refused_relations / open_questions 里各自发布。
    await dbRun(
      `insert into read_model.agent_contexts
       (agent_context_id, context_key, payload, derived_from_finding_ids)
       values (:'ctx_id'::uuid, :'key', :'payload'::jsonb, :'fids'::uuid[])`,
      {
        ctx_id: ctxId, key: `ctx-${f.finding_id.slice(0, 8)}`,
        payload: JSON.stringify({
          summary: summaryParts.join("。"),
          entities: entitiesForText(f.interpretive_statement, entityLabels).join(" "),
          conflicts: conflictLines,
          refused_relations: refusalLines,
          source_ref: `production-run:${runId}`,
        }),
        fids: `{${f.finding_id}}`,
      }
    );
    await writeGate(runId, "D05", "G5", "agent_context", ctxId, "PASS", [], { kind: "agent_context" }, "agent");
    agentContexts.push({ agent_context_id: ctxId, finding_id: f.finding_id });
  }

  // P05 探索路径（V1.4 新增发布）：未决问题 → 补证下一步（不编造答案，只登记缺口）
  const discoveryPaths = [];
  for (const oq of openQuestionRows) {
    const dpId = randomUUID();
    await dbRun(
      `insert into read_model.discovery_paths
       (discovery_path_id, path_key, steps, derived_from_finding_ids)
       values (:'dp_id'::uuid, :'key', :'steps'::jsonb, :'fids'::uuid[])`,
      {
        dp_id: dpId, key: `oq-${String(oq.open_question_id ?? dpId).slice(0, 8)}`,
        steps: JSON.stringify([
          {
            label: oq.question,
            source_ref: "未决问题（D03 边界登记）",
            time_hint: "",
            entities: (oq.entities ?? []).join(" "),
            missing_evidence: oq.missing_evidence,
            status: "open",
          },
        ]),
        fids: `{${fidArr}}`,
      }
    );
    await writeGate(runId, "D05", "G5", "discovery_path", dpId, "PASS", [], { kind: "discovery_path" }, "agent");
    await writeGate(runId, "D05", "G5", "discovery_path", dpId, "PASS", [], { kind: "discovery_path" }, "visual_stage");
    discoveryPaths.push({ discovery_path_id: dpId, open_question_id: oq.open_question_id ?? null });
  }

  // P06 证据返还指针（本 run 的每条 evidence）
  const evidencePointers = [];
  for (const ev of evidences) {
    const epId = randomUUID();
    await dbRun(
      `insert into read_model.evidence_pointers
       (evidence_pointer_id, evidence_id, source_id, display_locator, display_excerpt)
       values (:'ep_id'::uuid, :'ev_id'::uuid, :'src_id'::uuid, :'locator'::jsonb, :'excerpt')`,
      {
        ep_id: epId, ev_id: ev.evidence_id, src_id: ev.source_id,
        // 返证定位（U4/D2）：来源名 + 发布机构 + 发布日期 + 可回访 URL + 片段序号。
        // 这些值来自 D02 的逐条归属（exact_fragment_match），不是前端临时拼的标签。
        locator: JSON.stringify({
          source_title: ev.locator?.source_title || (__TOPIC?.d05SourceTitle ?? "第三层边界验证材料观察"),
          publisher: ev.locator?.publisher ?? "",
          source_date: ev.locator?.source_date ?? "",
          url: ev.locator?.url ?? "",
          fragment_index: ev.locator?.fragment_index ?? null,
          attribution: ev.locator?.attribution ?? "unattributed",
          source_version_id: ev.locator?.source_version_id ?? null,
          entities: entitiesForText(ev.literal_reading ?? "", entityLabels).join(" "),
        }),
        excerpt: ev.literal_reading ?? "",
      }
    );
    await writeGate(runId, "D05", "G5", "evidence_pointer", epId, "PASS", [], { kind: "evidence_pointer" }, "agent");
    await writeGate(runId, "D05", "G5", "evidence_pointer", epId, "PASS", [], { kind: "evidence_pointer" }, "visual_stage");
    evidencePointers.push({
      evidence_pointer_id: epId, evidence_id: ev.evidence_id,
      entities: entitiesForText(ev.literal_reading ?? "", entityLabels),
    });
  }

  // 故事种子 ↔ 证据指针关联（按生产链自身的实体标注做重叠匹配，不在前端猜关系）。
  // 无重叠时退回本 run 全部文本指针：宁可多给原句，也不让「点开判断看不到依据」。
  const allTextPointerIds = evidencePointers.map((p) => p.evidence_pointer_id);
  for (const s of storySeeds) {
    const overlap = evidencePointers
      .filter((p) => p.entities.some((e) => s.entities.includes(e)))
      .map((p) => p.evidence_pointer_id);
    const linked = overlap.length ? overlap : allTextPointerIds;
    if (!linked.length) continue;
    await dbRun(
      `update read_model.story_seeds set evidence_pointer_ids = :'ids'::uuid[]
       where story_seed_id = :'sid'::uuid`,
      { ids: `{${linked.join(",")}}`, sid: s.story_seed_id }
    );
  }

  // V1.5 视觉批次：P06 视觉证据返还——照片作为可消费 L5 证据发布（V3 今日观察）。
  // display_excerpt 照录 Commons 条目自述（来源自己的话，不转述）；身份/出处/license 随指针携带，
  // 前端据此标注「今日观察」与版权归属（C4 §16：原件即证据，显示出处与年代）。
  const visualPointers = [];
  for (const vo of visualObjects) {
    const epId = randomUUID();
    const excerpt = vo.literal_reading || "Wikimedia Commons 影像（条目未提供文字描述）";
    await dbRun(
      `insert into read_model.evidence_pointers
       (evidence_pointer_id, evidence_id, source_id, display_locator, display_excerpt)
       values (:'ep_id'::uuid, :'ev_id'::uuid, :'src_id'::uuid, :'locator'::jsonb, :'excerpt')`,
      {
        ep_id: epId,
        ev_id: vo.evidence_id || "00000000-0000-0000-0000-000000000000",
        src_id: vo.source_id || "00000000-0000-0000-0000-000000000000",
        locator: JSON.stringify({
          source_title: "Wikimedia Commons",
          visual_type: "today_photo",
          time_identity: "今日观察",
          asset_ref: vo.asset_path ?? "",
          display_url: vo.display_url ?? "",
          license: vo.license ?? "license 待核",
          artist: vo.artist ?? "作者待核",
          commons_title: vo.commons_title ?? "",
          entities: entitiesForText(`${vo.subject ?? ""}${excerpt}`, entityLabels).join(" "),
        }),
        excerpt,
      }
    );
    await writeGate(runId, "D05", "G5", "evidence_pointer", epId, "PASS", [], { kind: "evidence_pointer", visual_type: "today_photo" }, "agent");
    await writeGate(runId, "D05", "G5", "evidence_pointer", epId, "PASS", [], { kind: "evidence_pointer", visual_type: "today_photo" }, "visual_stage");
    visualPointers.push({ evidence_pointer_id: epId, visual_object_id: vo.visual_object_id, evidence_id: vo.evidence_id ?? null });
  }

  // ── 血缘依赖边登记（world.dependency_edges；P08 反向依赖闭包的落点）──
  // 语义：from_object 是 to_object 的上游——from 变化时 to 需重审。
  // dependency_type 受 schema 检查约束限定为 supports / derived_from / refines / conflicts_with：
  //   derived_from = to 由 from 派生（投影/故事/指针/变化/路径/视觉对象 ← 其上游）；
  //   supports     = from 为 to 提供支撑（实体支撑发现、实体支撑视觉对应主张）。
  // 纪律：只登记本 run 内 ID 可验证的真实依赖，不跨 run、不按文本猜测；
  //       按 (from,to,type) 去重插入（追加式重跑幂等）。
  const depEdges = [];
  const pushEdge = (fromType, fromId, toType, toId, depType, method) => {
    if (!fromId || !toId) return;
    depEdges.push({ from_object_type: fromType, from_object_id: fromId, to_object_type: toType, to_object_id: toId, dependency_type: depType, producer_method_id: method });
  };
  const entityIdByLabel = new Map(entities.map((e) => [(e.label ?? e.canonical_label), e.entity_id]).filter(([l]) => l));
  // L3 世界内部：实体 → 关系 / 时间变化（关系与变化由实体派生）
  for (const r of relations) {
    pushEdge("entity", entityIdByLabel.get(r.subject), "relation_claim", r.relation_claim_id, "derived_from", "W05");
    pushEdge("entity", entityIdByLabel.get(r.object), "relation_claim", r.relation_claim_id, "derived_from", "W05");
  }
  for (const ch of changes) {
    pushEdge("entity", entityIdByLabel.get(ch.subject), "change", ch.change_id, "derived_from", "W02");
  }
  // L4：实体 → 发现（支撑对象）
  for (const f of findings) {
    for (const label of f.supporting_world_objects ?? []) {
      pushEdge("entity", entityIdByLabel.get(label), "finding", f.finding_id, "supports", "A01");
    }
  }
  // L5：finding → 投影 / 故事种子 / Agent 上下文
  for (const f of findings) pushEdge("finding", f.finding_id, "world_projection", projId, "derived_from", "P02");
  for (const s of storySeeds) pushEdge("finding", s.finding_id, "story_seed", s.story_seed_id, "derived_from", "P04");
  for (const c of agentContexts) pushEdge("finding", c.finding_id, "agent_context", c.agent_context_id, "derived_from", "P04");
  // L5：关系 → 世界投影；变化 → 时间投影（只挂真正有着录变化的实体——
  // 无变化的对象不在时间轴上，其身份变化也不影响时间投影：P08 闭包必须精确）
  for (const r of relations) pushEdge("relation_claim", r.relation_claim_id, "world_projection", projId, "derived_from", "P02");
  if (tlId) {
    for (const ch of changes) pushEdge("change", ch.change_id, "map_timeline_projection", tlId, "derived_from", "P03");
  }
  // L5：开放问题 → 探索路径；实体 → 开放问题（问题所关于的对象——对象身份变化时问题可能被回答）；
  // 材料证据 → 证据指针
  for (const oq of openQuestionRows) {
    for (const label of oq.entities ?? []) {
      pushEdge("entity", entityIdByLabel.get(label), "open_question", oq.open_question_id, "derived_from", "W09");
    }
  }
  for (const dp of discoveryPaths) pushEdge("open_question", dp.open_question_id, "discovery_path", dp.discovery_path_id, "derived_from", "P05");
  for (const ep of evidencePointers) pushEdge("material_evidence", ep.evidence_id, "evidence_pointer", ep.evidence_pointer_id, "derived_from", "P06");
  // V1.5 视觉链路：材料观察 → 视觉对象 → 视觉证据指针；实体 → 视觉对象（对应主体支撑）
  for (const vo of visualObjects) {
    pushEdge("material_evidence", vo.evidence_id, "visual_object", vo.visual_object_id, "derived_from", "W03");
    pushEdge("entity", vo.subject_entity_id, "visual_object", vo.visual_object_id, "supports", "W03");
  }
  for (const vp of visualPointers) pushEdge("visual_object", vp.visual_object_id, "evidence_pointer", vp.evidence_pointer_id, "derived_from", "P06");
  // JS 侧按 (from,to,type) 先去重（DB not-exists 为二次保险；dbRun 不返回 rowCount）
  const seenEdge = new Set();
  const uniqueEdges = depEdges.filter((e) => {
    const k = `${e.from_object_type}:${e.from_object_id}>${e.to_object_type}:${e.to_object_id}>${e.dependency_type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    return true;
  });
  let depEdgeCount = 0;
  for (const e of uniqueEdges) {
    await dbRun(
      `insert into world.dependency_edges
       (from_object_type, from_object_id, to_object_type, to_object_id, dependency_type, producer_method_id)
       select :'ft'::text, :'fid'::uuid, :'tt'::text, :'tid'::uuid, :'dt'::text, :'m'::text
       where not exists (
         select 1 from world.dependency_edges
         where from_object_id = :'fid'::uuid and to_object_id = :'tid'::uuid and dependency_type = :'dt'::text)`,
      { ft: e.from_object_type, fid: e.from_object_id, tt: e.to_object_type, tid: e.to_object_id, dt: e.dependency_type, m: e.producer_method_id }
    );
    depEdgeCount += 1;
  }

  return {
    disposition: "PASS",
    output: { story_seeds: storySeeds, world_projection_id: projId, count: storySeeds.length },
    gate_evidence: { stage: "D05", methods: ["P01", "P02", "P03", "P04", "P05", "P06", "P07"], seed_count: storySeeds.length, projection: true, entity_count: entityLabels.length, change_count: changes.length, conflict_count: conflicts.length, open_question_count: openQuestionRows.length, dependency_edge_count: depEdgeCount, p08_deferred: p08Deferred || undefined },
    content_stats: { story_seeds: storySeeds.length, world_projections: 1, entities: entityLabels.length, relations: relLines.length, changes: changes.length, conflicts: conflicts.length, open_questions: openQuestionRows.length, evidence_pointers: evidences.length + visualPointers.length, visual_pointers: visualPointers.length, agent_contexts: findings.length, dependency_edges: depEdgeCount },
    review_records: storySeeds.map((s) => ({ story_seed_id: s.story_seed_id, finding_id: s.finding_id })),
  };
}

export const adapters = {
  D00: d00SourceIntake,
  D01: d01CarrierReading,
  D02: d02MaterialUnderstanding,
  D03: d03WorldConstruction,
  D04: d04HumanisticDiscovery,
  D05: d05ReadModelPublication,
};
