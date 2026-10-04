// pipelines/research/research-pipeline.mjs — Discovery 生产链 D01–D05 的**纯逻辑**实现。
//
// 设计原则：
//   · 先算出对象（内存），再由调用方决定是否落库 —— 因此 DRY_RUN 与 WRITE 走**同一套计算**，
//     不会出现「dry run 说 100 条、真跑变 80 条」这种两套代码的分叉。
//   · 只写 research_* 表（生产注册表 write_scope）；任何 Truth 表写入都会撞上
//     guard:research 与库层 CHECK，等于自爆。
//   · 规模由参数控制（首轮 Legacy-first：不扩大外部抓取，也不一次吃掉全部素材）。
//
// 数据来源：沪上经纬 Legacy Reservoir（**只读**，工作区外的老项目预抓取 JSON）。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { runMany, queryRows } from "../../packages/data-access/src/index.mjs";

export const FETCHED =
  process.env.MOHEN_LEGACY_FETCHED ||
  "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";

const uuid = () => crypto.randomUUID();
const ARR_KEYS = ["items", "images", "results", "data", "rows", "records", "entries", "filled", "list"];

// ── 公共小工具 ────────────────────────────────────────────────────────────────
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const clip = (s, n) => (String(s || "").length > n ? String(s).slice(0, n) + "…" : String(s || ""));

/** 文件名 → 载体类型（T01–T14 的简化可机读分类；首轮够用，不发明大 taxonomy）。 */
export function classify(file) {
  const f = file.toLowerCase();
  if (/^cbdb_/.test(f)) return "biography_db";      // 人物传记数据库
  if (/^clans?_/.test(f)) return "clan_genealogy";   // 宗族 / 族谱
  if (/^gazetteer_/.test(f)) return "gazetteer";     // 方志
  if (/^gj_/.test(f)) return "old_book_fulltext";    // 古籍全文
  if (/^jp_/.test(f)) return "poetry_person";        // 诗词 / 人物
  if (/^mgts_/.test(f)) return "old_book_fulltext";  // 古籍全文（扫描本）
  if (/^yutu_/.test(f)) return "historical_map";     // 舆图 / 地图目录
  if (/^geo_placenames/.test(f)) return "placename_gazetteer";
  if (/^protection|^sh_protection/.test(f)) return "heritage_protection";
  if (/^commons_|^shanghai_images/.test(f)) return "image_catalog";
  if (/^verify_/.test(f)) return "verification_probe";
  if (/^resource_probe/.test(f)) return "access_probe";
  if (/^dmz_/.test(f)) return "town_monograph";      // 镇志
  if (/^suzhou_/.test(f)) return "narrative_candidate";
  if (/^events_|^hsly_events/.test(f)) return "event_record";
  if (/^narrative_/.test(f)) return "narrative_asset";
  if (/^jinze_/.test(f)) return "town_monograph";
  return "unknown";
}

/** 图像类载体：modality 不同（没有正文段落，只有目录/说明）。 */
const isVisual = (t) => t === "image_catalog" || t === "historical_map";

// 噪声键：这些字段的值不是"材料内容"（URL / 路径 / 时间戳 / 状态码 …），
// 把它们当正文会炮制出大量"标题级/元数据"假 Observation —— 首轮实测的根因之一。
const NOISE_KEY = /(?:url|uri|href|path|file|http|link|src|thumb|image|img|id$|_meta|^meta|timestamp|created|updated|date|time|count|status|code|type|format|mime|size|width|height|license|provider|endpoint|note|comment|remark|tag|key|hash|checksum)/i;

/** 递归抽取 JSON 中的**中文正文**片段，返回 [{ p: jsonPath, text }]。内容级定位靠 p。 */
function extractText(node, base = "$", out = [], depth = 0) {
  if (out.length > 5000 || depth > 8) return out;
  if (typeof node === "string") {
    const t = norm(node);
    const han = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 正文门槛（2026-10-04 收紧）：长度 ≥ 40 且中文占比 ≥ 30%（排除标题级/英文元数据/纯数字/URL 残片）
    if (t.length >= 40 && han / t.length >= 0.3) out.push({ p: base, text: t });
    return out;
  }
  if (Array.isArray(node)) {
    node.slice(0, 500).forEach((v, i) => extractText(v, `${base}[${i}]`, out, depth + 1));
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (NOISE_KEY.test(k)) continue;
      extractText(v, `${base}.${k}`, out, depth + 1);
    }
  }
  return out;
}

/**
 * 真实词表（来自 Legacy 自带材料，只读）：
 *   places  ← geo_placenames_shanghai.json（上海地名白名单）
 *   persons ← cbdb_people.json（CBDB 上海籍贯人物）
 * 用真实词表而不是纯正则，是为了让 mention 的 resolution 有依据 ——
 * 首轮纯正则把「朱家角镇」拆成人物「朱家角」，正是典型的误报。
 */
export async function loadLexicon() {
  const places = new Set();
  const persons = new Set();
  try {
    const gp = path.join(FETCHED, "geo_placenames_shanghai.json");
    if (fs.existsSync(gp)) {
      const doc = JSON.parse(fs.readFileSync(gp, "utf8"));
      const arr = Array.isArray(doc) ? doc : [];
      for (const r of arr) {
        for (const k of ["city", "county", "prov", "name", "place"]) {
          const v = norm(r && r[k]);
          if (/^[\u4e00-\u9fa5]{2,8}$/.test(v)) places.add(v);
        }
      }
    }
  } catch { /* 词表不可用 → 全部 mention 保持 unresolved，不影响主流程 */ }
  try {
    const cp = path.join(FETCHED, "cbdb_people.json");
    if (fs.existsSync(cp)) {
      const doc = JSON.parse(fs.readFileSync(cp, "utf8"));
      for (const p of doc.people || []) {
        const n = norm(p && (p.name || p.person_name || p.姓名));
        if (/^[\u4e00-\u9fa5]{2,4}$/.test(n)) persons.add(n);
      }
    }
  } catch { /* 同上 */ }
  // ★ 再用**项目自己的可信世界**做消歧词表（只读 SELECT）。
  //   读取不违反 truth_write_ceiling=0（那条管的是写权限），而且它解决了一个实测问题：
  //   纯正则把「金泽」「朱家角」判成人物，而它们在库里本来就是 place。
  try {
    const rows = await queryRows(
      `select canonical_name, entity_type from entities
        where canonical_name is not null and canonical_name <> '' limit 6000`
    );
    for (const r of rows) {
      const n = norm(r.canonical_name);
      if (!/^[\u4e00-\u9fa5]{2,8}$/.test(n)) continue;
      if (r.entity_type === "person") persons.add(n); else places.add(n);
    }
  } catch { /* 库不可达 → 只用 legacy 词表 */ }
  return { places, persons };
}

const RE_YEAR = /(?:明|清|民国|元至元|洪武|永乐|万历|崇祯|康熙|雍正|乾隆|嘉庆|道光|咸丰|同治|光绪|宣统)\s?[二三三四五六七八九十百千\d]{1,6}\s?年|(?:1[6-9]|20)\d{2}\s?年/;
const RE_PLACE = /[\u4e00-\u9fa5]{2,4}(?:镇|村|桥|寺|庙|庵|观|河|浜|港|浦|塘|湾|泾|圩|路|街|巷|园|亭|塔|宅|祠|县|乡)/g;
// 负向断言：后面紧跟地理通名的一律不是人名（「朱家角镇」≠ 人物「朱家角」）。
const RE_PERSON = /(?:王|李|张|刘|陈|杨|黄|赵|吴|周|徐|孙|马|朱|胡|郭|何|高|林|罗|郑|梁|谢|宋|唐|许|韩|冯|邓|曹|彭|曾|田|董|袁|潘|蒋|蔡|余|杜|叶|程|苏|魏|吕|丁|任|沈|姚|卢|姜|崔|钟|谭|陆|汪|范|金|石|廖|贾|夏|韦|方|白|邹|孟|熊|秦|江|尹|薛|段|雷|侯|龙|史|陶|黎|贺|顾|毛|郝|龚|邵|万|钱|严|武|戴|莫|孔|向|汤|管|虞|郁|卫|翁|华|包|戚|章|鲁|葛|苗|项|仇|单|路|甘|封|查|曲|靳|房|解|盛|刁|边|成|祁|邢|蓝|涂|左|谷|车|柯|骆|耿|聂|关|詹)[\u4e00-\u9fa5]{1,2}(?![镇村桥寺庙庵观河浜港浦塘湾泾圩路街巷园亭塔宅祠县乡村])/g;
const RE_WORK = /[\u4e00-\u9fa5]{2,8}(?:志|记|录|集|谱|图|碑|传|诗文|钞|稿)/g;
// 机构：只收**通名明确**的（"堂/社/局/所/馆"单字通名会把整句吃进来，实测已污染候选）。
const RE_ORG = /[\u4e00-\u9fa5]{2,6}(?:书院|寺院|道观|教堂|学会|公所|博物馆|图书馆|教育馆|会馆|善堂|书局|印书馆)/g;
// 行政区划通名：用于识别「行政包含」这类平凡关系
const RE_ADMIN = /(?:省|市|自治区|地区|盟|州|区|县|旗|镇|乡|街道|村)$/;
// 句子碎片特征字：中文无空格，含虚词/动词/时间字的匹配几乎都是句子而非命名实体。
const FRAGMENT_CHARS = /[到在于和与的了是为把被从向由其之并而就也还将对该此有各每很太更最上下中前后时年月日之乎者也]/;
const isFragment = (s) => FRAGMENT_CHARS.test(String(s || ""));

// ═══════════════════════════════════════════════════════════════════════════════
// D01 · research.source-inventory：盘点来源（载体 / 可读性 / 权利 / raw）
// ═══════════════════════════════════════════════════════════════════════════════
export async function d01Inventory({ run_id, files }) {
  const inv = [];
  const parsed = new Map(); // file -> doc（供 D02 复用，避免重复 IO）
  for (const file of files) {
    const p = path.join(FETCHED, file);
    const carrier = classify(file);
    let doc = null, readability = "unreadable", note = "";
    try {
      doc = JSON.parse(fs.readFileSync(p, "utf8"));
      const arr = ARR_KEYS.map((k) => doc && doc[k]).find((a) => Array.isArray(a));
      const textHits = extractText(doc, "$", [], 0).length;
      if (arr && arr.length > 0) { readability = "readable"; note = `数组 ${arr.length} 条`; }
      else if (textHits > 0) { readability = "readable"; note = `文本片段 ${textHits} 处`; }
      else { readability = "catalog_only"; note = "仅结构/目录，无正文"; }
    } catch (e) {
      readability = "unreadable";
      note = "JSON 解析失败：" + String((e && e.message) || e).slice(0, 60);
    }
    parsed.set(file, doc);
    inv.push({
      inventory_id: uuid(), run_id, source_ref: file, carrier_type: carrier,
      readability, rights_status: "unclear", raw_available: true,
      note: clip(note, 180),
    });
  }
  return { inv, parsed };
}

export function writeInventory(rows) {
  if (!rows.length) return [];
  return rows.map((r) => ({
    sql: `insert into research_source_inventory
            (inventory_id,run_id,source_ref,carrier_type,readability,rights_status,raw_available,note)
          values (:'id'::uuid,:'rid'::uuid,:'sr',:'ct',:'rd',:'rs',:'ra',:'nt')
          on conflict (run_id, source_ref) do nothing`,
    params: { id: r.inventory_id, rid: r.run_id, sr: r.source_ref, ct: r.carrier_type, rd: r.readability, rs: r.rights_status, ra: r.raw_available, nt: r.note },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D02 · research.content-observation：内容级读取（必须带 locator，标题级不算）
// ═══════════════════════════════════════════════════════════════════════════════
export function d02Observations({ run_id, inv, parsed, maxPerSource = 500, maxObs = 20000 }) {
  // ★ 轮转配额（2026-10-03 修 · 重要缺陷）：
  //   原实现按文件顺序取、撞到全局 maxObs 就 break —— 于是**字母序靠后的来源一条都没被读**
  //   （实测：commons_images 519 条 → 0 条；yutu_plaquettes 36 条 → 0 条）。
  //   这等于"素材就这么多"的假象。现改为多轮轮转：每轮每个来源各取一份，直到配额或素材用尽，
  //   保证**全部可读来源都被覆盖**。
  const ROUNDS = 8;
  const carrierOf = new Map(inv.map((s) => [s.source_ref, s.carrier_type]));
  const pools = new Map();
  for (const s of inv) {
    if (s.readability !== "readable") continue;
    if (isVisual(carrierOf.get(s.source_ref))) continue; // 2026-10-04 收紧：视觉载体无正文段落，不进共现池（降标题级噪声）
    const doc = parsed.get(s.source_ref);
    if (doc == null) continue;
    const hits = extractText(doc, "$", [], 0);
    if (hits.length) pools.set(s.source_ref, hits);
  }
  const bySource = {};
  for (const k of pools.keys()) bySource[k] = 0;

  const obs = [];
  const perRound = Math.max(1, Math.ceil(maxPerSource / ROUNDS));
  for (let r = 0; r < ROUNDS && obs.length < maxObs; r++) {
    for (const [src, hits] of pools) {
      if (obs.length >= maxObs) break;
      const taken = bySource[src];
      if (taken >= maxPerSource || taken >= hits.length) continue;
      for (const h of hits.slice(taken, taken + perRound)) {
        if (obs.length >= maxObs) break;
        obs.push({
          observation_id: uuid(), run_id,
          source_id: src,               // 研究区内来源标识（legacy 文件 key）
          locator: h.p,                 // ★ 内容级定位：JSON 路径，可回源到具体条目/字段
          region: null,
          modality: isVisual(carrierOf.get(src)) ? "map_image" : "text",
          excerpt: clip(h.text, 600),
          normalized_observation: clip(h.text, 300),
          uncertainty: "legacy 预抓取快照；未回原始载体核对",
          association_readiness: h.text.length >= 40 ? "ready" : "limited",
        });
        bySource[src]++;
      }
    }
  }
  return { obs, bySource };
}

export function writeObservations(rows) {
  return rows.map((r) => ({
    sql: `insert into research_observation
            (observation_id,run_id,source_id,locator,region,modality,excerpt,normalized_observation,uncertainty,association_readiness)
          values (:'id'::uuid,:'rid'::uuid,:'sid',:'lc',NULL::jsonb,:'md',:'ex',:'no',:'un',:'ar')`,
    params: { id: r.observation_id, rid: r.run_id, sid: r.source_id, lc: r.locator, md: r.modality, ex: r.excerpt, no: r.normalized_observation, un: r.uncertainty, ar: r.association_readiness },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D03 · research.mention / research_source_dependency
//      允许 unresolved；**不制造 unknown Entity**；转引/同源必须登记为 dependency。
// ═══════════════════════════════════════════════════════════════════════════════
export function d03Mentions({ run_id, obs, lexicon = { places: new Set(), persons: new Set() } }) {
  const places = lexicon.places instanceof Set ? lexicon.places : new Set();
  const persons = lexicon.persons instanceof Set ? lexicon.persons : new Set();
  const mentions = [];
  const excerptMap = new Map(); // 归一化文本 -> [source_id...]（用于 dependency）
  // ── 中文边界约束 ────────────────────────────────────────────────────────────
// 中文没有空格，正则很容易切出碎片：从「松江府志」里切出人物「江府志」、
// 从「该堂位于青浦县朱家角镇」里切出地名「县朱家角镇」。
// 规则：匹配串若**紧邻**其他汉字，说明它只是更长词的一部分 → 丢弃（词表命中不受影响，
// 因为词表给的是完整词）。这是首轮实测最主要的噪声来源。
const isHan = (c) => !!c && /[\u4e00-\u9fa5]/.test(c);
function matchBounded(text, re) {
  const out = [];
  for (const m of String(text || "").matchAll(re)) {
    const i = m.index || 0;
    if (isHan(text[i - 1]) || isHan(text[i + m[0].length])) continue;
    out.push(m[0]);
  }
  return out;
}

// 单一 Observation 的 mention 上限：一段材料里列出 30 个"地名"不产生知识，只产生噪声。
  const MENTION_PER_OBS = 6;
  for (const o of obs) {
    const text = o.excerpt || "";
    const cand = new Map();
    const add = (txt, type, resolved) => {
      const key = type + ":" + txt;
      const prev = cand.get(key);
      if (!prev) cand.set(key, { txt, type, resolved });
      else if (resolved && !prev.resolved) cand.set(key, { txt, type, resolved: true });
    };
    // ① 地点（词表优先 → 正则兜底）
    for (const w of places) if (w.length >= 2 && text.includes(w)) add(w, "place", true);
    for (const m of matchBounded(text, RE_PLACE)) if (!isFragment(m)) add(m, "place", places.has(m));
    const placeTexts = [...cand.values()].filter((v) => v.type === "place").map((v) => v.txt);
    // ② 人物：与已识别地名重叠者不是人（「朱家角」⊂「朱家角镇」）；含时间字者不是人（「解放后」）
    for (const w of persons) if (w.length >= 2 && text.includes(w)) add(w, "person", true);
    for (const m of matchBounded(text, RE_PERSON)) {
      if (isFragment(m) || /[后前时年月日]/.test(m)) continue;
      if (placeTexts.some((p) => p.includes(m) || m.includes(p))) continue;
      add(m, "person", persons.has(m));
    }
    // ③ 作品 / 机构
    for (const m of matchBounded(text, RE_WORK)) if (!isFragment(m)) add(m, "work", false);
    for (const m of matchBounded(text, RE_ORG)) if (!isFragment(m)) add(m, "organization", false);

    // 排序取优：resolved 优先，其次**词长降序** —— 让「朱家角」胜出，而不是被「上海」淹没。
    const picked = [...cand.values()]
      .sort((a, b) => (Number(b.resolved) - Number(a.resolved)) || (b.txt.length - a.txt.length))
      .slice(0, MENTION_PER_OBS);
    for (const p of picked) {
      mentions.push({
        mention_id: uuid(), run_id, observation_id: o.observation_id,
        mention_text: clip(p.txt, 60), mention_type: p.type,
        resolution: p.resolved ? "resolved" : "unresolved",
        resolved_entity_id: null,   // ★ 研究态不写 Entity；解析只做标记
        note: p.resolved ? "命中 legacy 词表（地名/人物）" : "未解析（保持 unresolved，不造 Entity）",
      });
    }

    // dependency 线索：同一段文字出现在多个来源 → same_origin（防止 5 篇转引算 5 个来源）
    const key = norm(text).slice(0, 120);
    if (key.length >= 40) {
      if (!excerptMap.has(key)) excerptMap.set(key, new Set());
      excerptMap.get(key).add(o.source_id);
    }
  }
  const deps = [];
  for (const [, sources] of excerptMap) {
    if (sources.size < 2) continue;
    const arr = [...sources].slice(0, 6);
    for (let i = 1; i < arr.length; i++) {
      deps.push({
        dependency_id: uuid(), run_id, source_id: arr[0], depends_on_source_id: arr[i],
        dependency_type: "same_origin",
        note: "相同文本片段出现在多个来源（转引/同源），不得计为独立来源",
      });
    }
  }
  return { mentions, deps };
}

export function writeMentions(rows) {
  return rows.map((r) => ({
    sql: `insert into research_mention
            (mention_id,run_id,observation_id,mention_text,mention_type,resolution,resolved_entity_id,note)
          values (:'id'::uuid,:'rid'::uuid,:'oid'::uuid,:'mt',:'ty',:'rs',NULL::uuid,:'nt')`,
    params: { id: r.mention_id, rid: r.run_id, oid: r.observation_id, mt: r.mention_text, ty: r.mention_type, rs: r.resolution, nt: r.note },
  }));
}

export function writeDependencies(rows) {
  return rows.map((r) => ({
    sql: `insert into research_source_dependency
            (dependency_id,run_id,source_id,depends_on_source_id,dependency_type,note)
          values (:'id'::uuid,:'rid'::uuid,:'sid',:'ds',:'dt',:'nt')
          on conflict (source_id, depends_on_source_id, dependency_type) do nothing`,
    params: { id: r.dependency_id, rid: r.run_id, sid: r.source_id, ds: r.depends_on_source_id, dt: r.dependency_type, nt: r.note },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D04 · research_signal / research_association_candidate（A01–A12 的简化可回放实现）
//      反噪声：near / same_source / mentioned_in / title-only / embedding-only
//      不得单独形成高优先候选 —— 单来源候选的 AVS 被强制压到 34 以下（不进 Review）。
// ═══════════════════════════════════════════════════════════════════════════════
export function d04Association({ run_id, obs, mentions }) {
  const mentionByObs = new Map();
  for (const m of mentions) {
    if (!mentionByObs.has(m.observation_id)) mentionByObs.set(m.observation_id, []);
    mentionByObs.get(m.observation_id).push(m);
  }
  const obsById = new Map(obs.map((o) => [o.observation_id, o]));
  const pairMap = new Map(); // key -> {subject, object, obsIds, sources, types}

  for (const [oid, ms] of mentionByObs) {
    const o = obsById.get(oid);
    if (!o) continue;
    const uniq = [...new Map(ms.map((m) => [m.mention_type + ":" + m.mention_text, m])).values()];
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        const a = uniq[i], b = uniq[j];
        if (a.mention_text === b.mention_text) continue;
        const [x, y] = [a, b].sort((p, q) => (p.mention_text < q.mention_text ? -1 : 1));
        const key = `${x.mention_type}:${x.mention_text}|${y.mention_type}:${y.mention_text}`;
        if (!pairMap.has(key)) pairMap.set(key, { x, y, obsIds: [], sources: new Set(), hasYear: false, sample: "" });
        const rec = pairMap.get(key);
        rec.obsIds.push(oid);
        rec.sources.add(o.source_id);
        if (RE_YEAR.test(o.excerpt || "")) rec.hasYear = true;
        if (!rec.sample) rec.sample = clip(o.excerpt, 160);
      }
    }
  }

  const signals = [];
  const candidates = [];
  for (const [, rec] of pairMap) {
    const nObs = rec.obsIds.length;
    const nSrc = rec.sources.size;
    const types = new Set([rec.x.mention_type, rec.y.mention_type]);
    // 信号族（可回放：signal_code + detail 记录依据）
    const codes = ["A01_CO_OCCURRENCE"];
    if (nSrc > 1) codes.push("A05_CROSS_SOURCE");
    if (types.has("person") && types.has("place")) codes.push("A03_PERSON_PLACE");
    if (rec.x.mention_type === "place" && rec.y.mention_type === "place") codes.push("A04_PLACE_PLACE");
    if (types.has("work") && types.has("person")) codes.push("A07_WORK_PERSON");
    if (rec.hasYear) codes.push("A06_TEMPORAL_ANCHOR");

    // AVS（可解释分量）
    let score = 10 * Math.min(nObs, 5) + 20 * (nSrc - 1);
    if (types.has("person") && types.has("place")) score += 10;
    if (rec.x.mention_type === "place" && rec.y.mention_type === "place") score += 6;
    if (types.has("work") && types.has("person")) score += 8;
    if (rec.hasYear) score += 6;
    const counter = [];
    // 偶然共现：跨了 N 个来源却总共只出现 N 次（每源一次）—— 不构成稳定关系，只是词表太宽。
    if (nSrc > 1 && nObs <= nSrc) {
      counter.push({ code: "INCIDENTAL_CO_OCCURRENCE", note: `跨 ${nSrc} 个来源但共现仅 ${nObs} 次（每源一次），属偶然共现` });
      score -= 15;
    }
    if (rec.x.resolution !== "resolved" && rec.y.resolution !== "resolved") {
      counter.push({ code: "UNRESOLVED_BOTH", note: "双方 mention 均未解析，可信度低" });
      score -= 10;
    }
    // 同指/上下位：「金泽 ↔ 金泽镇」是同一个对象的两种写法，不是两个对象之间的关系
    if (rec.x.mention_text !== rec.y.mention_text &&
        (rec.x.mention_text.includes(rec.y.mention_text) || rec.y.mention_text.includes(rec.x.mention_text))) {
      counter.push({ code: "COREF_SUBSTRING", note: "一方是另一方的子串（同指/上下位），不构成两个对象间的新关系" });
      score = Math.min(score, 40);
    }
    // 平凡行政关系：「上海市 ↔ 松江区」这类行政包含不是发现，是常识（G-LINK 非平凡性）
    if (rec.x.mention_type === "place" && rec.y.mention_type === "place" &&
        RE_ADMIN.test(rec.x.mention_text) && RE_ADMIN.test(rec.y.mention_text)) {
      counter.push({ code: "TRIVIAL_ADMIN_RELATION", note: "双方均为行政区划通名结尾，属行政包含，非新发现" });
      score = Math.min(score, 30); // 行政包含不是发现：直接压到候选线以下
    }
    // ★ 反噪声：单来源（same_source_only）不得形成高优先候选
    if (nSrc === 1) { counter.push({ code: "SAME_SOURCE_ONLY", note: "仅在同一来源内出现，不得单独作为高优先依据" }); score = Math.min(score, 34); }
    if (nObs === 1) { counter.push({ code: "SINGLE_OCCURRENCE", note: "仅 1 次共现，证据极弱" }); score = Math.min(score, 25); }
    if (nSrc === 1 && nObs === 1) score = Math.min(score, 20);
    score = Math.max(0, Math.min(100, Math.round(score)));

    const candidate_id = uuid();
    const subject_ref = `${rec.x.mention_type}:${rec.x.mention_text}`;
    const object_ref = `${rec.y.mention_type}:${rec.y.mention_text}`;
    const pairType = [...types].sort().join("+");

    signals.push({
      signal_id: uuid(), run_id, signal_code: codes[codes.length - 1],
      subject_ref, object_ref, observation_ids: rec.obsIds.slice(0, 20),
      strength: Number((Math.min(nObs, 10) / 10).toFixed(2)),
      detail: { codes, distinct_sources: nSrc, observations: nObs, pair_type: pairType },
    });

    candidates.push({
      candidate_id, run_id, subject_ref, object_ref,
      supporting_signals: codes.map((c) => ({ code: c, n_observations: nObs, n_sources: nSrc })),
      counter_signals: counter,
      avs: { occurrence: Math.min(nObs, 5), cross_source: nSrc - 1, pair_type: pairType, temporal: rec.hasYear },
      avs_score: score,
      why_interesting: `${pairType} 共现 ${nObs} 次、跨 ${nSrc} 个来源${rec.hasYear ? "，含年代锚点" : ""}；样例：${rec.sample}`,
      missing_evidence: `缺 S1 原始方志/图籍可定位证据；未核对 ${rec.x.mention_text} 与 ${rec.y.mention_text} 的时空沿革`,
      next_search_tasks: [
        `在方志/寺志中检索「${rec.x.mention_text}」与「${rec.y.mention_text}」的同现记载`,
        `核对两者的地理位置与年代范围，确认是否同一时空`,
        `确认是否有独立来源（当前独立来源 ${nSrc} 个）`,
      ],
      association_readiness: nSrc > 1 && nObs >= 2 ? "ready" : "limited",
      disposition: "long_tail", promoted: false,
      _sample: rec.sample, _nSrc: nSrc, _nObs: nObs,
    });
  }
  return { signals, candidates };
}

export function writeSignals(rows) {
  return rows.map((r) => ({
    sql: `insert into research_signal (signal_id,run_id,signal_code,subject_ref,object_ref,observation_ids,strength,detail)
          values (:'id'::uuid,:'rid'::uuid,:'sc',:'sb',:'ob',:'oi'::jsonb,:'st'::numeric,:'dt'::jsonb)`,
    params: { id: r.signal_id, rid: r.run_id, sc: r.signal_code, sb: r.subject_ref, ob: r.object_ref, oi: JSON.stringify(r.observation_ids), st: r.strength, dt: JSON.stringify(r.detail) },
  }));
}

export function writeCandidates(rows) {
  return rows.map((r) => ({
    sql: `insert into research_association_candidate
            (candidate_id,run_id,subject_ref,object_ref,supporting_signals,counter_signals,avs,avs_score,
             why_interesting,missing_evidence,next_search_tasks,association_readiness,disposition,promoted)
          values (:'id'::uuid,:'rid'::uuid,:'sb',:'ob',:'ss'::jsonb,:'cs'::jsonb,:'av'::jsonb,:'sc'::numeric,
                  :'wi',:'me',:'nt'::jsonb,:'ar',:'dp',false)
          on conflict (run_id, subject_ref, object_ref) do nothing`,
    params: {
      id: r.candidate_id, rid: r.run_id, sb: r.subject_ref, ob: r.object_ref,
      ss: JSON.stringify(r.supporting_signals), cs: JSON.stringify(r.counter_signals),
      av: JSON.stringify(r.avs), sc: r.avs_score, wi: r.why_interesting, me: r.missing_evidence,
      nt: JSON.stringify(r.next_search_tasks), ar: r.association_readiness, dp: r.disposition,
    },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// D05 · research.humanistic-selection：AVS 分层 + 长尾机器处置
//      <35 仅保留 Signal ｜ 35–54 Candidate ｜ 55–69 可进 Discovery Review ｜ ≥70 Priority
//      ★ 只有 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 允许挂分诊行；
//        首轮不创建 review_queue（避免用新机制重建人工债务），Selected 转入 research_task。
// ═══════════════════════════════════════════════════════════════════════════════
export function d05Selection({ run_id, candidates, topK = 20 }) {
  const sorted = [...candidates].sort((a, b) => (b.avs_score - a.avs_score) || a.subject_ref.localeCompare(b.subject_ref));
  const selected = sorted.filter((c) => c.avs_score >= 35).slice(0, topK);
  const tasks = [];
  for (const c of selected) {
    c.disposition = c.avs_score >= 70 ? "truth_promotion" : "selected";
    tasks.push({
      task_id: uuid(), run_id, candidate_id: c.candidate_id,
      task_type: "directed_research", target_ref: `${c.subject_ref} ↔ ${c.object_ref}`,
      priority: c.avs_score, note: `AVS ${c.avs_score}：${clip(c.why_interesting, 160)}`,
      status: "open",
    });
  }
  const buckets = {
    priority: sorted.filter((c) => c.avs_score >= 70).length,
    review: sorted.filter((c) => c.avs_score >= 55 && c.avs_score < 70).length,
    candidate: sorted.filter((c) => c.avs_score >= 35 && c.avs_score < 55).length,
    signal_only: sorted.filter((c) => c.avs_score < 35).length,
  };
  return { selected, tasks, buckets, sorted };
}

export function writeTasks(rows) {
  return rows.map((r) => ({
    sql: `insert into research_task (task_id,run_id,candidate_id,task_type,target_ref,priority,note,status)
          values (:'id'::uuid,:'rid'::uuid,:'cid'::uuid,:'tt',:'tr',:'pr'::int,:'nt',:'st')`,
    params: { id: r.task_id, rid: r.run_id, cid: r.candidate_id, tt: r.task_type, tr: r.target_ref, pr: r.priority, nt: r.note, st: r.status },
  }));
}

/** 批量落库（调用方已确认 write=true 且 write_scope 校验通过）。 */
export async function persist(items) {
  if (!items.length) return 0;
  // 分批：单批过大时 psql 单文件会过重。
  const BATCH = 400;
  let n = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    await runMany(items.slice(i, i + BATCH));
    n += Math.min(BATCH, items.length - i);
  }
  return n;
}

/** 读取本 run 的候选（供报告与精选后核对）。 */
export async function loadCandidates(run_id) {
  return queryRows(
    `select candidate_id, subject_ref, object_ref, avs_score, disposition, why_interesting
       from research_association_candidate where run_id = :'rid'::uuid
      order by avs_score desc nulls last limit 50`,
    { rid: run_id }
  );
}
