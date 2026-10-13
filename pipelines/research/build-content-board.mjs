// pipelines/research/build-content-board.mjs — 生成"读懂内容看板"（非台账）
//
// 目的（用户 2026-10-05 硬性呈现偏好）：不要数据库表结构/计数台账，
// 要"原始资料是什么 → AI 读懂(归纳/动作/时间/空间) → 人物/地点提及(D03) → 源间依赖(D03)"。
// 复用离线管线纯逻辑（d01Inventory/d02Observations/d03Mentions/readFragment/d04Association），
// 不连库、零 Truth 写入。
//
// 2026-10-05 修正轮（只重跑已有 82 源读懂层，不采集新数据）：
//   ① 地名消歧：词表只收上海行政区划内条目（兴县/海城市/临泽县/左权县等误标 ✓ 移除）
//   ② 人名识别：D03 即解析（词表 + 规则识别），不再全推 D05
//   ③ 动作二分 A/B：A 类编纂建制不计分，B 类叙事才计分，统计各源比例
//   ④ 时间二分：形成时间 / 描绘时间；描绘 ≥1949 不进叙事候选（报刊大量滤除）
//   ⑤ 主题标签：只标实际命中 Top3（不再 13 个全贴）
//   ⑥ locator + 完整性（总数/已取/触顶）
//   ⑦ 叙事三源去重（hsly_events + events_linked + narrative_assets）
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  FETCHED, classify, d01Inventory, d02Observations, d03Mentions,
  readFragment, buildOfflineLexicon, d04Association, fragDepiction,
} from "./research-pipeline.mjs";

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const uuid = () => crypto.randomUUID();
const ARR_KEYS = ["items", "images", "results", "data", "rows", "records", "entries", "filled", "list"];
const NOISE_KEY = /(?:url|uri|href|path|file|http|link|src|thumb|image|img|id$|_meta|^meta|timestamp|created|updated|date|time|count|status|code|type|format|mime|size|width|height|license|provider|endpoint|note|comment|remark|tag|key|hash|checksum)/i;
function extractText(node, base = "$", out = [], depth = 0) {
  if (out.length > 5000 || depth > 8) return out;
  if (typeof node === "string") {
    const t = norm(node); const han = (t.match(/[一-龥]/g) || []).length;
    if (t.length >= 40 && han / t.length >= 0.3) out.push({ p: base, text: t });
    return out;
  }
  if (Array.isArray(node)) { node.slice(0, 500).forEach((v, i) => extractText(v, `${base}[${i}]`, out, depth + 1)); return out; }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) { if (NOISE_KEY.test(k)) continue; extractText(v, `${base}.${k}`, out, depth + 1); }
  }
  return out;
}
function clip(s, n) { return String(s || "").length > n ? String(s).slice(0, n) + "…" : String(s || ""); }
function parseYear(s) {
  if (!s) return null;
  const m = String(s).match(/(1[0-9]|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

// ── 决策映射（与离线脚本一致）──────────────────────────────────────────────
const EXCLUDED_DIRS = new Set(["_chatgpt_extract", "ocr", "dig", "yutu_probe", "features", "cbdb_extract", "yutu_api"]);
const DERIVED_RE = /(_pdf_extract|press_[\w]*_review|_review\.|verify|probe|diag|screenshot|_extract|sources_ledger|resource_probe|rumsey_maps_raw|external_mapsource_probe|coords_wikidata|yutu_sparql|yutu_triples|yutu_verify|yutu_level3|yutu_meta)/i;
const READ_CARRIERS = new Set(["clan_genealogy", "gazetteer", "old_book_fulltext", "poetry_person", "poetry_corpus", "heritage_protection", "town_monograph", "narrative_candidate", "event_record", "narrative_asset", "placename_gazetteer", "press"]);
const STRUCT_CARRIERS = new Set(["clan_genealogy", "gazetteer", "old_book_fulltext", "poetry_person", "poetry_corpus", "town_monograph", "narrative_candidate", "narrative_asset", "event_record"]);
// ★ 结构化叙事/报刊源：单独构建 Observation，以便携带"形成/描绘时间"并做三源去重
const STRUCT = new Set(["event_record", "narrative_asset", "press"]);

// ── 文本工具 / 镇志体·沿革·制度动作检测（2026-10-06）──
const stripTags = (s) => String(s || "").replace(/<[^>]+>/g, ""); // 报刊标题含 <font> 高亮标签，读取前剥离
// 镇志体/地方史向标记（用于 press 原始池重捞的白名单）：沿革、旧名→新名、年号、置驿设务建镇迁治、古建地标、物产方志等
const TOWN_MARKER = /(镇|乡|村|里|街|桥|寺|庙|观|塔|墓|阁|庵|祠|园|亭|第|宅|基|址|渡|津|港|浜|浦|塘|泾|圩|堰|坝|渠|仓|市|墟|城|邑|县|州|郡|沿革|曾名|旧称|俗称|原名|本属|原属|置[驿镇县司务]|设[驿镇县司务]|建镇|迁治|年号|洪武|永乐|万历|崇祯|康熙|雍正|乾隆|嘉庆|道光|咸丰|同治|光绪|宣统|土特产|物产|方志|县志|镇志|古镇|古桥|古寺|古塔|古墓|古址|遗址|遗迹|旧时|昔日|当年|曾经)/;
// ★ F3 两段式：沿革链（旧名→新名 / 置→废 / 因→故）与 制度动作（置驿、设务、建镇、迁治…）
const EVO_RE = /(曾名|旧称|俗称|原名|古称|旧名|后改|今名|更名|改名|本属|原属|由.{0,4}改|因.{0,6}故|置.{0,4}废|废.{0,4}复|自.{0,6}以来|沿革|徙治|迁治|移治|割隶|析置)/;
const INST_RE = /(置|设|建|迁|徙|移|升|降|并|隶)[了]?(驿|镇|县|司|务|监|场|仓|寨|治|署|所|局|厅|州|郡|军|卫|营|关|隘|津|渡|桥|堰|坝|堤|渠|库|市|墟)/;

function decide(rel) {
  const name = path.basename(rel);
  if (DERIVED_RE.test(name) || DERIVED_RE.test(rel)) return { action: "exclude", reason: "derived/probe（决策④排除）" };
  if (/souyun/i.test(rel)) return { action: "read", carrier: "poetry_corpus", isOcr: false };
  let carrier = classify(name);
  if (/press/i.test(rel)) carrier = "press";
  else if (/genealogy/i.test(rel)) carrier = "clan_genealogy";
  if (carrier === "biography_db") return { action: "exclude", reason: "人物词表源（仅作 lexicon）" };
  if (carrier === "image_catalog" || carrier === "historical_map") return { action: "visual", carrier };
  if (READ_CARRIERS.has(carrier)) return { action: "read", carrier, isOcr: /_ocr\.json$/i.test(name) };
  return { action: "exclude", reason: `carrier=${carrier}` };
}
function walk(dir, rel, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name); const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (EXCLUDED_DIRS.has(e.name)) continue; walk(full, r, out); }
    else if (e.isFile() && e.name.endsWith(".json")) out.push(r);
  }
}
const allJson = []; walk(FETCHED, "", allJson);
const readFiles = [], visualRefs = [], excluded = []; const carrierFix = new Map();
for (const rel of allJson) {
  const d = decide(rel);
  if (d.action === "read") { readFiles.push(rel); carrierFix.set(rel, d.carrier); if (d.isOcr) carrierFix.set(rel + "#ocr", true); }
  else if (d.action === "visual") visualRefs.push({ source_ref: rel, carrier_type: d.carrier });
  else excluded.push({ source_ref: rel, reason: d.reason });
}

// ── 1. D01 ──
const run_id = uuid();
const { inv, parsed } = await d01Inventory({ run_id, files: readFiles });
for (const it of inv) {
  const c = carrierFix.get(it.source_ref); if (c) it.carrier_type = c;
  if (carrierFix.get(it.source_ref + "#ocr")) it.is_ocr = true;
}
function detectDefect(doc) {
  if (doc && typeof doc === "object") {
    if (doc.status === 403 || doc.status === 404) return `http_error_${doc.status}`;
    if (typeof doc.body === "string" && /<!DOCTYPE html/i.test(doc.body)) return "http_error_page(拦截页)";
    if (typeof doc.body === "string" && doc.body.trim() === "") return "empty_body(status200,抓取空)";
    if (Array.isArray(doc.entries) && doc.entries.length === 0 && (doc.book || doc.db)) return "empty_entries_stub";
  }
  return null;
}
for (const it of inv) { const def = detectDefect(parsed.get(it.source_ref)); if (def) { it.readability = "defective"; it.note = `缺陷源：${def}`; } }

// ── 词表：上海校验 + 人物收割（离线，不连库）──────────────────────────────
const lexicon = buildOfflineLexicon();
// ★ 人物收割：从 82 源的结构化人物字段（author/creator/poet/editor/著者/撰者/责任者/姓名…）采收，
//   作为 D03 人名识别的离线词表补充（首方数据，不采集新外部数据）。
function harvestPersons() {
  const out = new Set();
  const NAME_KEYS = new Set(["author", "creator", "creators", "contributors", "person", "persons", "姓名", "person_name", "editor", "poet", "writer", "著者", "撰者", "责任者", "poet_name"]);
  const isNameKey = (k) => NAME_KEYS.has(k) || /^author\d*$/.test(k) || /^copAuthor\d*$/.test(k);
  const walkP = (node, depth) => {
    if (depth > 6 || !node) return;
    if (Array.isArray(node)) { for (const v of node.slice(0, 400)) walkP(v, depth + 1); return; }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (isNameKey(k)) {
          const vals = Array.isArray(v) ? v : [v];
          for (const x of vals) {
            if (x == null) continue;
            const s = norm(typeof x === "object" ? (x.name || x.label || x.person_name || "") : String(x));
            if (/^[\u4e00-\u9fa5]{2,4}$/.test(s)) out.add(s);
          }
        }
        if (typeof v === "object") walkP(v, depth + 1);
      }
    }
  };
  for (const it of inv) walkP(parsed.get(it.source_ref), 0);
  return out;
}
for (const n of harvestPersons()) lexicon.persons.add(n);

// ── 2. D02（文本源）＋ 结构化叙事/报刊源 ──
// d02 处理非 STRUCT 的全部文本载体（含 STRUCT_CARRIERS 如 old_book/gazetteer 的页级正文读取）；
// 下方"元数据结构化读出"循环仅在 d02 未充分覆盖（fragsBySource<5）时补真实记录级读取，并修正分母。
const textInv = inv.filter((it) => !STRUCT.has(it.carrier_type));
const { obs: textObs, bySource, fragsBySource } = d02Observations({ run_id, inv: textInv, parsed, maxPerSource: 9999, maxObs: 999999, lexicon });
const obs = textObs;
// 结构化源（事件/叙事资产/报刊）：逐条携带 形成/描绘时间，并做三源去重
function buildStructuredObs() {
  const sObs = []; const sBySource = {}; const sFrags = {};
  const seenKeys = new Map(); let raw = 0, unique = 0; const dupExamples = [];
  const reclaimSeen = new Set(); // ★ press 原始池重捞去重（accepted + reclaimed 之间不重复）
  for (const it of inv) {
    if (!STRUCT.has(it.carrier_type) || it.readability === "defective") continue;
    const doc = parsed.get(it.source_ref); if (!doc) continue;
    const items = it.carrier_type === "press" ? (doc.accepted_docs || [])
               : it.carrier_type === "narrative_asset" ? (doc.assets || [])
               : (doc.events || []);
    sBySource[it.source_ref] = 0;
    // ★ 完整性分母 = 过滤前原始总量（2026-10-06）：报刊取抓取层 raw（含上游分级剔除的 rejected/held），
    //   结构化源取条目数；从而真实暴露"已读 < 原始"的缺口（如 press_金泽 869→111、narrative_assets 351→145）。
    sFrags[it.source_ref] = it.carrier_type === "press"
      ? (doc.raw != null ? doc.raw : ((doc.accepted || 0) + (doc.rejected || 0) + (doc.held || 0)) || items.length)
      : items.length;
    const container = it.carrier_type === "press" ? "accepted_docs" : it.carrier_type === "narrative_asset" ? "assets" : "events";
    const isTrio = it.carrier_type === "event_record" || it.carrier_type === "narrative_asset"; // ★ 仅叙事三源参与去重
    for (const item of items) {
      if (isTrio) raw++;
      let text = null, formation = null, structYear = null;
      if (it.carrier_type === "press") {
        text = [item.title1, item.title2, item.abstract].filter(Boolean).join(" ");
        formation = `报刊出版${item.year != null ? `(${item.year})` : ""}`; // 形成=出版年(现代)；描绘看内容
      } else {
        text = item.content || item.description || item.name || item.title || "";
        structYear = parseYear(item.begin || item.start_year || item.date_label || item.time_label);
        formation = "现代(上图录入)";
      }
      if (!text || text.length < 20) continue;
      const key = norm(item.name || item.title || item.content || text).replace(/[\s\p{P}]/gu, "").slice(0, 60);
      reclaimSeen.add(key); // 登记已读 accepted，重捞时跳过重复
      let isDup = false;
      // ★ 叙事三源去重：跨源/同源重复叙事只保留首条（报刊不参与）
      if (isTrio) {
        if (seenKeys.has(key)) { const e = seenKeys.get(key); isDup = true; if (e.src !== it.source_ref) dupExamples.push({ key, from: e.src, to: it.source_ref }); }
        else { seenKeys.set(key, { src: it.source_ref }); unique++; }
      }
      if (isTrio && isDup) continue;
      const reading = readFragment(text, it.carrier_type, lexicon);
      const dep = fragDepiction(text, it.carrier_type, structYear); // ★ 片段级描绘时间（2026-10-06）
      const idx = sBySource[it.source_ref];
      sObs.push({
        observation_id: uuid(), run_id, source_id: it.source_ref,
        locator: `$.${container}[${idx}]`, region: { carrier: it.carrier_type, container, index: idx },
        modality: "text", excerpt: clip(text, 600), normalized_observation: reading.normalized,
        reading, extraction_method: "rule_v2",
        uncertainty: `结构化${it.carrier_type}读出(规则法)；描绘时间=${dep.depiction_year != null ? dep.depiction_year : (dep.pre1949 ? "历史(内容判定)" : "现代(内容判定)")}，未回原始载体核对，非事实断言`,
        association_readiness: dep.pre1949 ? "ready" : "limited",
        depiction_year: dep.depiction_year, formation_time: formation, depiction_pre1949: dep.pre1949,
      });
      sBySource[it.source_ref]++;
    }
    // ★ press 原始池重捞（2026-10-06）：上游按"出版年"把 3000+ 条镇志体/地方史向报刊误筛进 held/rejected，
    //   逐条回捞"历史向 + 镇志体/地方史向"的文档，补回叙事候选池。分母仍是 doc.raw（过滤前总量）。
    if (it.carrier_type === "press") {
      const reclaimDocs = [...(doc.held_docs || []), ...(doc.rejected_docs || [])];
      for (const d of reclaimDocs) {
        const t = stripTags([d.title1, d.title2, d.abstract].filter(Boolean).join(" "));
        if (!t || t.length < 20) continue;
        const dep = fragDepiction(t, "press", null);
        if (!dep.pre1949) continue;         // 仅捞历史向（被上游按出版年误筛的）
        if (!TOWN_MARKER.test(t)) continue;  // 且须是镇志体/地方史向
        const key = norm(t).replace(/[\s\p{P}]/gu, "").slice(0, 60);
        if (reclaimSeen.has(key)) continue; reclaimSeen.add(key); // 去重
        const reading = readFragment(t, "press", lexicon);
        const idx = sBySource[it.source_ref];
        sObs.push({
          observation_id: uuid(), run_id, source_id: it.source_ref,
          locator: `$.reclaimed[${idx}]`, region: { carrier: "press", container: "reclaimed", index: idx },
          modality: "text", excerpt: clip(t, 600), normalized_observation: reading.normalized, reading, extraction_method: "rule_v2",
          uncertainty: `报刊原始池重捞(镇志体/地方史向，上游按出版年误筛)；描绘=历史(内容判定)，未回原始载体核对`,
          association_readiness: dep.pre1949 ? "ready" : "limited",
          depiction_year: dep.depiction_year, formation_time: `报刊出版${d.year != null ? `(${d.year})` : ""}`, depiction_pre1949: dep.pre1949,
          reclaimed_from_raw: true,
        });
        sBySource[it.source_ref]++;
      }
    }
  }
  return { sObs, sBySource, sFrags, dedup: { raw, unique, dup: raw - unique, dupExamples } };
}
const { sObs, sBySource, sFrags, dedup } = buildStructuredObs();
for (const o of sObs) obs.push(o);
for (const [k, v] of Object.entries(sBySource)) bySource[k] = (bySource[k] || 0) + v;
for (const [k, v] of Object.entries(sFrags)) fragsBySource[k] = (fragsBySource[k] || 0) + v;

// 文本源 Observation 的描绘时间已由 d02Observations 通过 fragDepiction 逐片段产出，无需再补全。

// 元数据结构化读出（短记录源补充；排除已单独处理的 STRUCT 源）
function recordSummary(obj) {
  const out = []; const title = obj.title || obj.name || obj.label;
  if (title) { const t = norm(title); if (/[一-龥]/.test(t)) out.push(`《${t}》`); }
  if (obj.query) out.push(`query:${norm(obj.query)}`);
  const wi = obj.workInfo || obj; const creators = Array.isArray(wi.creator) ? wi.creator : (wi.creator ? [wi.creator] : []);
  for (const c of creators.slice(0, 3)) {
    if (typeof c === "object") out.push(`作者:${norm(c.label || c.name || "?")}${c.temporalValue ? "(" + norm(c.temporalValue) + ")" : ""}`);
    else if (typeof c === "string") out.push(`作者:${norm(c)}`);
  }
  if (obj.temporalValue || obj.era) out.push(`朝代:${norm(obj.temporalValue || obj.era)}`);
  if (obj.book) out.push(`书:${norm(obj.book)}`);
  for (const [k, v] of Object.entries(obj)) {
    if (/title|name|label|query|book|creator|temporalValue|era|author|workInfo|uri|body|note|id/i.test(k)) continue;
    if (typeof v === "string") { const t = norm(v); const han = (t.match(/[一-龥]/g) || []).length; if (t.length >= 4 && han / t.length >= 0.4) out.push(`${k}:${t.slice(0, 40)}`); }
  }
  return out.join(" ｜ ");
}
function extractRecords(doc) {
  const recs = [];
  if (doc && doc.filter && doc.filter.corroborate) for (const [town, list] of Object.entries(doc.filter.corroborate)) if (Array.isArray(list) && list.length) recs.push(`镇「${town}」入诗旁证地名：${list.slice(0, 15).join("、")}`);
  const walk2 = (node) => { if (recs.length >= 80) return; if (Array.isArray(node)) { for (const v of node.slice(0, 120)) walk2(v); return; } if (node && typeof node === "object") { const s = recordSummary(node); if (s && s.length >= 4) recs.push(s.slice(0, 200)); for (const [k, v] of Object.entries(node)) { if (NOISE_KEY.test(k)) continue; if (recs.length >= 80) break; walk2(v); } } };
  walk2(doc); return recs;
}
const regionOf = (carrier) => ({ carrier, container: null, index: null });
for (const it of inv) {
  if (it.readability === "defective") continue;
  if (!STRUCT_CARRIERS.has(it.carrier_type)) continue;
  if (STRUCT.has(it.carrier_type)) continue; // 已单独处理
  if ((fragsBySource[it.source_ref] || 0) >= 5) continue;
  const recs = extractRecords(parsed.get(it.source_ref));
  fragsBySource[it.source_ref] = recs.length; // ★ 分母=真实记录数（修正 gazetteer 原被 d02 单 blob 污染成"1"）
  let n = 0;
  for (const s of recs) {
    if (bySource[it.source_ref] >= 400) break;
    const reading = readFragment(s, it.carrier_type, lexicon); // ★ 桩 obs 改为真实结构化读取
    const dep = fragDepiction(s, it.carrier_type, null);
    obs.push({
      observation_id: uuid(), run_id, source_id: it.source_ref, locator: `$`, region: regionOf(it.carrier_type),
      modality: "text", excerpt: s.slice(0, 600), normalized_observation: reading.normalized, reading,
      extraction_method: "rule_v2",
      uncertainty: "结构化元数据读出（书目/诗词/镇志），规则法读取(rule_v2)，未回原始载体逐字核对",
      association_readiness: (reading.actions.length || reading.relation_signals.length || s.length >= 40) ? "ready" : "limited",
      formation_time: null, depiction_year: dep.depiction_year, depiction_pre1949: dep.pre1949,
    });
    bySource[it.source_ref] = (bySource[it.source_ref] || 0) + 1; n++;
  }
}

// ── 3. D03 ──
const { mentions, deps } = d03Mentions({ run_id, obs, lexicon });

// ── 3b. D04（重跑，消费修正后 mention；用于报告地名消歧成效）──────────────
const { candidates: d04Candidates } = d04Association({ run_id, obs, mentions });
const badPlaces = ["兴县", "海城市", "临泽县", "左权县"];
const badInCandidates = badPlaces.filter((p) => d04Candidates.some((c) => c.subject_ref.includes(p) || c.object_ref.includes(p)));
const badInPlaces = badPlaces.filter((p) => [...new Set(mentions.filter((m) => m.mention_type === "place" && m.resolution === "resolved").map((m) => m.mention_text))].includes(p));

// ── 4. 组装看板数据 ──
const obsById = new Map(); for (const o of obs) obsById.set(o.observation_id, o.source_id);
const CARRIER_LABEL = {
  clan_genealogy: "宗谱", gazetteer: "方志", old_book_fulltext: "古籍全文", poetry_person: "诗词·人物",
  poetry_corpus: "诗词·旁证/总集", heritage_protection: "文物保护名录", town_monograph: "镇志/乡镇专记",
  narrative_candidate: "叙事候选", event_record: "事件记录", narrative_asset: "叙事资产",
  placename_gazetteer: "地名志(词表)", press: "报刊", image_catalog: "图像目录", historical_map: "历史舆图",
};
const CATEGORY = {
  "方志与古籍": ["gazetteer", "old_book_fulltext"],
  "宗谱": ["clan_genealogy"],
  "诗词": ["poetry_person", "poetry_corpus"],
  "报刊": ["press"],
  "镇志与地名": ["town_monograph", "placename_gazetteer"],
  "文物与事件": ["heritage_protection", "event_record"],
  "叙事素材": ["narrative_candidate", "narrative_asset"],
  "视觉载体(本轮未读)": ["historical_map", "image_catalog"],
};
const byCarrier = new Map();
for (const it of inv) {
  if (!byCarrier.has(it.carrier_type)) byCarrier.set(it.carrier_type, []);
  byCarrier.get(it.carrier_type).push(it);
}
const sourceExcerpts = new Map();
const sourceReading = new Map();  // src -> {topics:Map(freq), actionsA, actionsB, times, placeScope, normalized, abSample}
const sourceMentions = new Map();
const sourceDep = new Map();      // src -> {formation, pre, mod, unk}  ★ 片段级描绘分布（废止源级单一判定）
const sourceLocator = new Map();  // src -> 样本 locator
for (const o of obs) {
  if (!sourceExcerpts.has(o.source_id)) sourceExcerpts.set(o.source_id, []);
  const arr = sourceExcerpts.get(o.source_id);
  if (arr.length < 60) arr.push(o.excerpt || "");
  if (!sourceLocator.has(o.source_id) && o.locator) sourceLocator.set(o.source_id, o.locator);
  if (o.reading) {
    if (!sourceReading.has(o.source_id)) sourceReading.set(o.source_id, { topics: new Map(), aA: 0, aB: 0, abSample: [], times: new Set(), placeScope: new Map(), normalized: [] });
    const r = sourceReading.get(o.source_id);
    for (const t of (o.reading.topics || [])) r.topics.set(t, (r.topics.get(t) || 0) + 1);
    for (const a of (o.reading.actions || [])) { if (a.kind === "B") { r.aB++; if (r.abSample.length < 8) r.abSample.push(a.verb); } else r.aA++; }
    for (const t of (o.reading.time_scope || [])) r.times.add(t);
    for (const p of (o.reading.place_scope || [])) if (!r.placeScope.has(p.text)) r.placeScope.set(p.text, p);
    if (r.normalized.length < 4 && o.normalized_observation) r.normalized.push(o.normalized_observation);
  }
  // ★ 片段级描绘时间分布（2026-10-06：废止源级单一判定）
  if (!sourceDep.has(o.source_id)) sourceDep.set(o.source_id, { formation: o.formation_time, pre: 0, mod: 0, unk: 0 });
  const sd = sourceDep.get(o.source_id);
  if (!sd.formation && o.formation_time) sd.formation = o.formation_time;
  if (o.depiction_pre1949 === true) sd.pre++;
  else if (o.depiction_pre1949 === false) sd.mod++;
  else sd.unk++;
}
const STOP_PLACE = new Set(["郊区", "城区", "市区", "老城区", "全县", "境内", "本地", "外地", "中心", "附近", "一带", "周边", "全境", "辖境", "本地"]);
for (const m of mentions) {
  const src = obsById.get(m.observation_id); if (!src) continue;
  if (!sourceMentions.has(src)) sourceMentions.set(src, { place: new Set(), person: new Set(), work: new Set(), org: new Set(), placeU: 0, personU: 0 });
  const s = sourceMentions.get(src);
  if (m.mention_type === "place") { if (m.resolution === "resolved" && !STOP_PLACE.has(m.mention_text)) s.place.add(m.mention_text); else s.placeU++; }
  else if (m.mention_type === "person") { if (m.resolution === "resolved") s.person.add(m.mention_text); else s.personU++; }
  else if (m.mention_type === "work") s.work.add(m.mention_text);
  else if (m.mention_type === "organization") s.org.add(m.mention_text);
}
// 跨源叙事线索：被多个不同来源提及的【已解析】地名
const placeSources = new Map();
for (const [src, mm] of sourceMentions) for (const p of mm.place) { if (!placeSources.has(p)) placeSources.set(p, new Set()); placeSources.get(p).add(src); }
const storyThreads = [...placeSources.entries()].filter(([, s]) => s.size >= 2).map(([p, s]) => ({ place: p, sources: [...s] })).sort((a, b) => b.sources.length - a.sources.length).slice(0, 25);

// 叙事候选过滤统计（描绘不早于 1949 不进叙事候选；报刊无论有无年份均视为现代）
const excludedNarrative = obs.filter((o) => o.depiction_pre1949 === false);
const pressObs = obs.filter((o) => /press/i.test(o.source_id || ""));
const excludedPress = excludedNarrative.filter((o) => /press/i.test(o.source_id || ""));
const pre1949Count = obs.filter((o) => o.depiction_pre1949 === true).length;

const board = { generated: new Date().toISOString().slice(0, 10), run_id, summary: { obs: obs.length, mentions: mentions.length, sources: inv.length, defective: inv.filter((x) => x.readability === "defective").length }, categories: [] };
for (const [catName, carriers] of Object.entries(CATEGORY)) {
  const cat = { name: catName, carriers: [] };
  for (const c of carriers) {
    for (const it of byCarrier.get(c) || []) {
      const ex = sourceExcerpts.get(it.source_ref) || [];
      const mm = sourceMentions.get(it.source_ref) || { place: new Set(), person: new Set(), work: new Set(), org: new Set(), placeU: 0, personU: 0 };
      const rd = sourceReading.get(it.source_ref);
      const st = sourceDep.get(it.source_ref) || {};
      const taken = bySource[it.source_ref] || 0;
      const total = Math.max(fragsBySource[it.source_ref] || 0, taken); // 实际可读单元（extractText 片段或结构化记录）
      const capped = taken >= 9999; // 本轮 maxPerSource=9999，达上限即触顶（通常全取后=false）
      const topicsTop = rd ? [...rd.topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]) : [];
      const abRatio = rd && (rd.aA + rd.aB) > 0 ? Math.round((rd.aB / (rd.aA + rd.aB)) * 100) : null;
      cat.carriers.push({
        source: it.source_ref, carrier: c, label: CARRIER_LABEL[c] || c,
        readability: it.readability || "readable", note: it.note || "",
        n_obs: taken, n_excerpt: ex.length, total_frags: total, capped,
        excerpts: ex.slice(0, 12),
        normalized: (rd?.normalized || []).slice(0, 3),
        topics: topicsTop,
        actionsA: rd?.aA || 0, actionsB: rd?.aB || 0, ab_ratio: abRatio, ab_sample: rd?.abSample || [],
        times: [...(rd?.times || new Set())].slice(0, 8),
        placeScope: [...(rd?.placeScope || new Map()).values()].slice(0, 12),
        formation_time: st.formation || "", dep_pre: st.pre || 0, dep_mod: st.mod || 0, dep_unk: st.unk || 0,
        locator: sourceLocator.get(it.source_ref) || "",
        places: [...mm.place].slice(0, 20), persons: [...mm.person].slice(0, 30),
        works: [...mm.work].slice(0, 12), orgs: [...mm.org].slice(0, 12),
        placeU: mm.placeU || 0, personU: mm.personU || 0,
      });
    }
  }
  cat.carriers.sort((a, b) => (a.readability === "defective" ? 1 : 0) - (b.readability === "defective" ? 1 : 0) || b.n_obs - a.n_obs);
  board.categories.push(cat);
}
board.story_threads = storyThreads;

// ── 三重过滤漏斗（2026-10-06 两段式 F3）：片段级描绘时间(<1949) + [B动词(可读)或制度动作] + [人物或沿革链或制度动作] ──
const obsBySrc = new Map();
for (const o of obs) { if (!obsBySrc.has(o.source_id)) obsBySrc.set(o.source_id, []); obsBySrc.get(o.source_id).push(o); }
const obsWithResolvedPerson = new Set(mentions.filter((m) => m.mention_type === "person" && m.resolution === "resolved").map((m) => m.observation_id));
const obsText = (o) => o.excerpt || o.normalized_observation || o.reading?.normalized || "";
const funnel = [];
for (const it of inv) {
  const olist = obsBySrc.get(it.source_ref) || [];
  if (!olist.length) continue;
  const raw = fragsBySource[it.source_ref] || olist.length;
  const f1 = olist.filter((o) => o.depiction_pre1949 === true).length;
  // F2 = 历史片段中"含任一叙事信号"：B 动词 / 制度动作 / 沿革链（旧名→新名·置→废·因→故）
  const f2 = olist.filter((o) => {
    if (o.depiction_pre1949 !== true) return false;
    const t = obsText(o);
    const hasB = o.reading?.actions?.some((a) => a.kind === "B");
    const hasInst = INST_RE.test(t);
    const hasEvo = EVO_RE.test(t);
    return hasB || hasInst || hasEvo;
  }).length;
  // ★ F3（严格按用户规范 2026-10-06 三门）：历史片段 ∧（人物 ∨ 沿革链 ∨ 制度动作）。
  //   三者并列独立；B 动词不单列 F3 门（旧 F3=766 的"B∧人物"已完整落在"人物"门内），避免重新把 OCR 残字类动作虚高计入。
  const f3 = olist.filter((o) => {
    if (o.depiction_pre1949 !== true) return false;
    const t = obsText(o);
    const hasInst = INST_RE.test(t);
    const hasEvo = EVO_RE.test(t);
    const hasPerson = obsWithResolvedPerson.has(o.observation_id);
    return hasPerson || hasEvo || hasInst;
  }).length;
  // ★ 用户最想要的批次：不涉及人物、但含沿革链/制度动作的"纯镇志体"段落（精确对应其原话）
  const f3n = olist.filter((o) => {
    if (o.depiction_pre1949 !== true) return false;
    const t = obsText(o);
    const hasInst = INST_RE.test(t);
    const hasEvo = EVO_RE.test(t);
    const hasPerson = obsWithResolvedPerson.has(o.observation_id);
    return !hasPerson && (hasEvo || hasInst);
  }).length;
  funnel.push({ source: it.source_ref, carrier: it.carrier_type, raw, taken: bySource[it.source_ref] || 0, f1, f2, f3, f3n, capped: (bySource[it.source_ref] || 0) >= 9999 });
}
funnel.sort((a, b) => b.f3 - a.f3 || b.f1 - a.f1);
// 物产志 B 占比（用户点名）：优先按源名含"物产"定位，否则取方志类中 B 占比最高的源为代表
let wuchan = null;
for (const cat of board.categories) for (const s of cat.carriers) if (/物产/.test(s.source)) { wuchan = s; break; }
if (!wuchan) { let best = null; for (const cat of board.categories) for (const s of cat.carriers) if (s.carrier === "gazetteer" && s.ab_ratio != null && (!best || s.ab_ratio > best.ab_ratio)) best = s; wuchan = best; }

// ★ press 原始池重捞计数（2026-10-06）
const reclaimCounts = {}; let reclaimTotal = 0;
for (const o of obs) if (o.reclaimed_from_raw) { reclaimCounts[o.source_id] = (reclaimCounts[o.source_id] || 0) + 1; reclaimTotal++; }
// ★ 各源"不涉及人物但含沿革链/制度动作"批次汇总
const f3nTotal = funnel.reduce((a, r) => a + (r.f3n || 0), 0);

board.reports = {
  excluded_narrative: excludedNarrative.length, excluded_press: excludedPress.length, press_total: pressObs.length,
  press_pct: pressObs.length ? Math.round((excludedPress.length / pressObs.length) * 100) : 0,
  pre1949: pre1949Count,
  place_disambig: { checked: badPlaces, gone_in_resolved: badInPlaces, gone_in_d04: badInCandidates },
  dedup: dedup,
  persons_resolved: [...new Set(mentions.filter((m) => m.mention_type === "person" && m.resolution === "resolved").map((m) => m.mention_text))].length,
  persons_unresolved: mentions.filter((m) => m.mention_type === "person" && m.resolution !== "resolved").length,
  narrative_funnel: funnel,
  wuchan_b: wuchan ? { source: wuchan.source, ab_ratio: wuchan.ab_ratio, actionsA: wuchan.actionsA, actionsB: wuchan.actionsB } : null,
  press_reclaim: { total: reclaimTotal, by_source: reclaimCounts },
  f3n_total: f3nTotal,
};

const OUT = path.join(process.env.PROJECT_ROOT || path.resolve("."), "tasks", "results", `CONTENT-BOARD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "content-board-data.json"), JSON.stringify(board, null, 2), "utf8");

// ── 5. 渲染 HTML 看板 ──
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chips = (arr, cls) => arr.length ? `<div class="chips">${arr.map((x) => `<span class="chip ${cls}">${esc(x)}</span>`).join("")}</div>` : "";
let html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>墨痕·读懂内容看板 ${board.generated}</title><style>
*{box-sizing:border-box}body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;margin:0;background:#f5f3ee;color:#2b2b2b}
header{background:#2f4a3f;color:#f3efe6;padding:22px 28px}h1{margin:0;font-size:22px}header p{margin:6px 0 0;opacity:.85;font-size:13px}
.wrap{max-width:1080px;margin:0 auto;padding:20px}
.overview{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px}
.stat{background:#fff;border:1px solid #e3ddd0;border-radius:10px;padding:12px 16px;min-width:120px}
.stat b{display:block;font-size:22px;color:#2f4a3f}.stat span{font-size:12px;color:#777}
.cat{background:#fff;border:1px solid #e3ddd0;border-radius:12px;margin-bottom:16px;overflow:hidden}
.cat>h2{margin:0;padding:14px 18px;background:#eef1ec;font-size:16px;border-bottom:1px solid #e3ddd0}
.src{border-bottom:1px solid #f0ece2;padding:14px 18px}
.src:last-child{border-bottom:none}
.srch{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.srch .name{font-weight:600;font-size:15px;color:#1f332b}
.badge{font-size:11px;padding:2px 8px;border-radius:20px;background:#e7efe9;color:#2f4a3f}
.badge.def{background:#fbe9e7;color:#a33}
.badge.ocr{background:#fff3da;color:#9a6b00}
.meta{font-size:12px;color:#888;margin-left:auto}
.ex{margin:10px 0 4px;font-size:13.5px;line-height:1.75;color:#333}
.ex .q{color:#7a5230;border-left:3px solid #d9c79a;padding-left:8px;display:block;margin:5px 0;background:#fbf8f1}
.section-t{font-size:12px;color:#9a6b00;font-weight:600;margin:10px 0 4px}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin:3px 0}
.chip{font-size:11.5px;padding:2px 8px;border-radius:6px;background:#f0ece2;color:#444}
.chip.place{background:#e3eef5;color:#23527c}.chip.person{background:#f3e8f0;color:#7a3b6a}.chip.work{background:#eef1e3;color:#4a5a2a}.chip.org{background:#efe9e0;color:#6a5a40}
.chip.topic{background:#e8eef0;color:#234e5c}.chip.action{background:#efe6e0;color:#7a4a2a}.chip.time{background:#e9e3f0;color:#4a3a6a}.chip.read{background:#f3f7f2;color:#2f4a3f;border-left-color:#9fc7a8}.ex .q.read{white-space:pre-line}details summary{margin-top:8px;color:#2f4a3f;cursor:pointer}
.unres{font-size:11.5px;color:#a07a3a;margin:4px 0 2px;font-style:italic}
.threads{background:#fff;border:1px solid #e3ddd0;border-radius:12px;padding:16px 20px;margin-bottom:16px}
.thread{margin:8px 0;padding:8px 0;border-bottom:1px dashed #eee}
.thread b{color:#2f4a3f}.thread .srclist{font-size:12.5px;color:#666;margin-top:3px}
.defnote{font-size:12px;color:#a33;margin-top:4px}
.report{background:#fff;border:1px solid #e3ddd0;border-radius:12px;padding:16px 20px;margin-bottom:16px;font-size:13px;line-height:1.8}
.report h2{margin-top:0;font-size:16px;color:#2f4a3f}
.report code{background:#f0ece2;padding:1px 5px;border-radius:4px}
.report .ok{color:#2f7a3f;font-weight:600}.report .warn{color:#a33;font-weight:600}
.fntab{border-collapse:collapse;width:100%;font-size:12px;margin:10px 0}.fntab th,.fntab td{border:1px solid #e3ddd0;padding:4px 8px;text-align:left;vertical-align:top}.fntab th{background:#eef1ec;color:#2f4a3f;position:sticky;top:0}.fntab tr:nth-child(even){background:#faf8f3}.fntab td:last-child{text-align:center}
details summary{cursor:pointer;font-size:12px;color:#2f4a3f;margin-top:6px}
</style></head><body>
<header><h1>墨痕 · 读懂内容看板</h1><p>生成日期 ${board.generated} ｜ 离线 D01+D02+D03(+D04重跑)，未连库、零 Truth 写入 ｜ 看板格式：原始资料 → AI 读懂(归纳/动作A·B/时间·形成·描绘/空间) → 人物/地点提及(D03) → 源间依赖(D03)</p></header>
<div class="wrap">
<div class="overview">
<div class="stat"><b>${board.summary.sources}</b><span>可读文本来源</span></div>
<div class="stat"><b>${board.summary.obs}</b><span>读出原文片段</span></div>
<div class="stat"><b>${board.summary.mentions}</b><span>发现提及(人物/地点/机构/作品)</span></div>
<div class="stat"><b>${board.reports.persons_resolved}</b><span>已解析人物(D03)</span></div>
<div class="stat"><b>${board.summary.defective}</b><span>缺陷/空桩(已剔除,待补采)</span></div>
</div>`;

// ── 修正轮报告段 ──
const rp = board.reports;
const goneOk = rp.place_disambig.gone_in_resolved.length === 0 && rp.place_disambig.gone_in_d04.length === 0;
html += `<div class="report"><h2>2026-10-06 修正轮 · 执行报告（在 10-05 轮基础上追修四个粒度问题）</h2>
<p><b>① 地名消歧（10-05 已确认生效）：</b>词表强制上海行政区划校验。误标候选 <code>${rp.place_disambig.checked.join("、")}</code> 在已解析 ✓ 名单中 <span class="${rp.place_disambig.gone_in_resolved.length ? "warn" : "ok"}">${rp.place_disambig.gone_in_resolved.length ? rp.place_disambig.gone_in_resolved.join("、") + "（仍存在！）" : "全部消失 ✓"}</span>，D04 候选中 <span class="${rp.place_disambig.gone_in_d04.length ? "warn" : "ok"}">${rp.place_disambig.gone_in_d04.length ? rp.place_disambig.gone_in_d04.join("、") + "（仍存在！）" : "全部消失 ✓"}</span>。</p>
<p><b>② 叙事三源去重（10-05 已确认生效）：</b><code>${rp.dedup.raw}</code> → 独立 <code>${rp.dedup.unique}</code>（去重 <code>${rp.dedup.dup}</code>）。</p>
<p><b>③ 描绘时间下沉到片段级（本轮回修）：</b>废止源级单一判定，逐片段按内容时间线索 + 载体默认判定描绘时间。报刊默认现代、但内容含历史线索(当年/古寺/朝代/&lt;1949年)则保留（如 press_金泽「沧海桑田说当年：曾经的金泽大寺基」不再被整源滤掉）；方志/物产志等历史载体默认可进、仅当片段含 ≥1949 现代线索才滤除。本轮滤除 <code>${rp.excluded_narrative}</code> 条（报刊 <code>${rp.excluded_press}</code>/<code>${rp.press_total}</code>，滤除率 <code>${rp.press_pct}%</code>）；描绘 &lt;1949 可进叙事候选 <code>${rp.pre1949}</code> 条。</p>
<p><b>④ B 类动词移除误收词（本轮回修）：</b>将 <code>生/置/设/分/增/减/隶</code> 从 B 类移入 A 类（编纂建制不计分）—— 牛羊"生羔"、物产"生/置/设"不再算叙事。物产志类 B 占比：<code>${rp.wuchan_b ? rp.wuchan_b.source + " B占比 " + rp.wuchan_b.ab_ratio + "%（A " + rp.wuchan_b.actionsA + " / B " + rp.wuchan_b.actionsB + "）" : "未定位"}</code>（此前约 37%，修正后应明显下降）。</p>
<p><b>⑤ 人物识别加白名单 + 常识过滤（本轮回修）：</b>已解析人物 <code>${rp.persons_resolved}</code> 人（仅：① 词表=CBDB+收割作者；② 通过白名单校验的上下文识别名）。识别不出的（白牛篇/有德/于是/在在/方言/严重/关注点/高品质/范工程/范区内 等虚词·通用词·地名残片）退回<strong>未解析候选池</strong> <code>${rp.persons_unresolved}</code> 个，不再强行解析。</p>
<p><b>⑥ 完整性分母改记过滤前原始总量（本轮回修）：</b>报刊取抓取层 <code>raw</code>（含上游剔除的 held/rejected）、结构化源取条目/记录数，从而真实暴露"已读 &lt; 原始"缺口—— press_金泽 <code>869→111(+捞回)</code>、narrative_assets <code>351→145</code> 均在卡片明示缺口；"触顶"仍为否（本轮 maxPerSource=9999 未触顶）。<b>gazetteer_details 原分母被 d02 的 1 个整文件 blob 污染成"原始 1 / 已取 81"，已修正为真实记录数（原始≈已取，无上游缺口）。</b></p>
<p><b>⑦ press 原始池重捞（本轮回修）：</b>上游按"出版年"把 <code>3000+</code> 条镇志体/地方史向报刊误筛进 held/rejected、从未检查。本轮用"历史向 + 镇志体/地方史向"回捞，补回叙事候选池 <code>${rp.press_reclaim.total}</code> 条：${Object.entries(rp.press_reclaim.by_source).map(([s, n]) => `${s.split("/").pop().replace(".json", "")} +${n}`).join("、")}。重点：金泽「沧海桑田说当年：曾经的金泽大寺基」已随重捞进入候选（搜索可命中）。</p>
<p><b>⑧ 三重过滤漏斗（片段级描绘时间 + 叙事信号 + 真叙事候选）：</b>见下表。F1=描绘&lt;1949 可进；F2=F1 中再含<strong>任一叙事信号</strong>——B 类叙事动词<strong>或</strong>制度动作（置驿/设务/建镇/迁治…）<strong>或</strong>沿革链（旧名→新名/置→废/因→故）；F3=F1 中满足<strong>人物 或 沿革链 或 制度动作</strong>（严格按你定的三门，并列独立；B 动词不单列 F3 门，旧 F3=766 的"B∧人物"已落在"人物"门内，故朱家角"珠街阁沿革/本属"等纯镇志体可进 F3）；<span style="color:#a35"><b>F3N=不涉及人物、但含沿革链/制度动作的"纯镇志体"段落（你最想要的批次，精确对应原话）</b></span>。</p>
<table class="fntab"><tr><th>源</th><th>载体</th><th>原始总量</th><th>已取</th><th>F1描绘&lt;1949</th><th>F2含B/制度</th><th>F3真叙事候选</th><th>F3N纯镇志体</th><th>触顶</th></tr>
${rp.narrative_funnel.filter((r) => r.f1 > 0).sort((a, b) => b.f3 - a.f3 || b.f1 - a.f1).slice(0, 80).map((r) => `<tr><td>${esc(r.source)}</td><td>${esc(r.carrier)}</td><td>${r.raw}</td><td>${r.taken}</td><td>${r.f1}</td><td>${r.f2}</td><td><b>${r.f3}</b></td><td style="color:#a35"><b>${r.f3n || 0}</b></td><td>${r.capped ? "是" : "否"}</td></tr>`).join("")}
</table>
<p style="font-size:11.5px;color:#888">（仅列 F1&gt;0 的源，按 F3 降序；全量见 content-board-data.json → reports.narrative_funnel）</p>
<p><b>⑨ 全库"纯镇志体"批次（F3N 合计）：</b><code>${rp.f3n_total}</code> 条——不含任何白名单人物、但凭沿革链/制度动作被确认为真叙事候选。这批是本次新放行的核心增量，建议优先人工核验。</p>
</div>`;

for (const cat of board.categories) {
  html += `<div class="cat"><h2>${esc(cat.name)}（${cat.carriers.length} 源）</h2>`;
  if (!cat.carriers.length) html += `<div class="src" style="color:#999">本轮无此类可读源</div>`;
  for (const s of cat.carriers) {
    const badge = s.readability === "defective" ? `<span class="badge def">缺陷/空桩·未读</span>` : (s.note.includes("OCR") ? `<span class="badge ocr">OCR</span>` : `<span class="badge">已读</span>`);
    const excerptNote = s.n_excerpt !== s.n_obs ? `（展示 ${s.n_excerpt}）` : "";
    html += `<div class="src"><div class="srch"><span class="name">${esc(s.source)}</span>${badge}<span class="meta">${esc(s.label)} ｜ 片段 ${s.n_obs}${excerptNote}</span></div>`;
    if (s.readability === "defective") { html += `<div class="defnote">⚠ ${esc(s.note)} —— 库内缺失/损坏，未读取，仅登记缺口，建议补采或修复抓取。</div></div>`; continue; }
    if (s.normalized && s.normalized.length) {
      html += `<div class="section-t">AI 读懂（克制归纳 · 规则法 rule_v2）</div>`;
      html += `<div class="ex"><span class="q read">${s.normalized.map((x) => esc(x)).join("<br>")}</span></div>`;
      if (s.topics && s.topics.length) html += `<div class="chips">${s.topics.map((t) => `<span class="chip topic">${esc(t)}</span>`).join("")}</div>`;
      if (s.actionsA || s.actionsB) html += `<div class="chips"><span class="chip action">A编纂·建制 ${s.actionsA}</span><span class="chip action">B叙事 ${s.actionsB}${s.ab_ratio != null ? `（B占比 ${s.ab_ratio}%）` : ""}</span>${s.ab_sample.map((v) => `<span class="chip action">${esc(v)}</span>`).join("")}</div>`;
      if (s.times && s.times.length) html += `<div class="chips">${s.times.map((t) => `<span class="chip time">${esc(t)}</span>`).join("")}</div>`;
      if (s.placeScope && s.placeScope.length) html += `<div class="chips">${s.placeScope.slice(0, 12).map((p) => `<span class="chip place">${esc(p.text)}${p.resolved ? "✓" : ""}</span>`).join("")}</div>`;
      // ★ 片段级描绘时间分布 + locator + 完整性（分母=过滤前原始总量，暴露缺口）
      html += `<div class="chips"><span class="chip time">形成：${esc(s.formation_time || "—")}</span><span class="chip time">片段描绘：&lt;1949 可进 ${s.dep_pre} ｜ ≥1949 滤除 ${s.dep_mod} ｜ 未知 ${s.dep_unk}</span></div>`;
      html += `<div class="chips"><span class="chip read">完整性：原始 ${s.total_frags} / 已取 ${s.n_obs} / 触顶：${s.capped ? "是" : "否"}${s.total_frags > s.n_obs ? `（缺口 ${s.total_frags - s.n_obs}）` : ""}</span><span class="chip read">locator：${esc(s.locator || "—")}</span></div>`;
      if (s.excerpts.length) html += `<details><summary>原文片段（${s.excerpts.length}）</summary><div class="ex">${s.excerpts.map((e) => `<span class="q">${esc(e)}</span>`).join("")}</div></details>`;
    } else if (s.excerpts.length) {
      html += `<div class="section-t">AI 读出的原文</div><div class="ex">${s.excerpts.map((e) => `<span class="q">${esc(e)}</span>`).join("")}</div>`;
    }
    if (s.persons.length || s.places.length || s.works.length || s.orgs.length || s.placeU || s.personU) {
      let sec = `<div class="section-t">发现的人物 / 地点 / 机构 / 作品（命中词表的已解析项）</div>`;
      sec += chips(s.persons, "person") + chips(s.places, "place");
      const unres = [];
      if (s.placeU) unres.push(`地名 ${s.placeU}`);
      if (s.personU) unres.push(`人物 ${s.personU}`);
      if (unres.length) sec += `<div class="unres">另有未解析候选（${unres.join("、")}）— 落在词表外，待 D05 人文判定是否纳入</div>`;
      if (s.works.length || s.orgs.length) { sec += `<div class="section-t" style="margin-top:8px">发现的作品 / 机构（未解析，作叙事线索）</div>`; sec += chips(s.works, "work") + chips(s.orgs, "org"); }
      html += sec;
    }
    if (s.note) html += `<div class="meta" style="margin-top:6px">注：${esc(s.note)}</div>`;
    html += `</div>`;
  }
  html += `</div>`;
}
// 源间依赖（D03 same_origin）
const depMap = new Map();
for (const d of deps) { if (!depMap.has(d.source_id)) depMap.set(d.source_id, new Set()); depMap.get(d.source_id).add(d.depends_on_source_id); }
const depThreads = [...depMap.entries()].map(([s, set]) => ({ src: s, deps: [...set] })).sort((a, b) => b.deps.length - a.deps.length).slice(0, 30);
html += `<div class="threads"><h2 style="margin-top:0">源间依赖（D03 · 转引/同源识别）</h2><p style="font-size:12.5px;color:#777">D03 检测到的「相同文本片段跨多个来源」——这些是转引/同源，按协议不得计为独立来源（防 5 篇转引伪装成 5 个独立证据）。<b>非 D04 关联发现</b>。</p>`;
if (!depThreads.length) html += `<div class="srclist">本轮未检测到明显的同源文本片段。</div>`;
for (const t of depThreads) { html += `<div class="thread"><b>${esc(t.src)}</b> <span style="font-size:12px;color:#999">同源/转引 ${t.deps.length} 个来源</span><div class="srclist">↳ ${t.deps.map((x) => esc(x)).join(" ｜ ")}</div></div>`; }
html += `</div>`;
// 共享地名共现（轻量信号，非 D04）
html += `<div class="threads"><h2 style="margin-top:0">共享地名共现（轻量信号，非 D04 关联扫描）</h2><p style="font-size:12.5px;color:#777">同一地名出现在 ≥2 个来源，意味着可交叉印证。这只是共现提示，真正的关联发现（信号打分/类型交汇）属下半场 D04，本轮仅重跑用于地名消歧校验。</p>`;
for (const t of board.story_threads) {
  html += `<div class="thread"><b>${esc(t.place)}</b> <span style="font-size:12px;color:#999">（${t.sources.length} 个来源）</span><div class="srclist">${t.sources.map((x) => esc(x)).join(" ｜ ")}</div></div>`;
}
html += `</div>`;
html += `<p style="font-size:12px;color:#999;text-align:center;padding:10px">实体写入=0 ｜ 关系写入=0 ｜ 候选写入=0 ｜ Truth Promotion=0 ｜ 全部为研究态读取，未落地事实层</p></div></body></html>`;
fs.writeFileSync(path.join(OUT, "content-board.html"), html, "utf8");
console.log(`BOARD ${path.join(OUT, "content-board.html")}`);
console.log(`DATA ${path.join(OUT, "content-board-data.json")}`);
console.log(`DONE obs=${obs.length} mentions=${mentions.length} persons_resolved=${rp.persons_resolved} persons_unresolved=${rp.persons_unresolved} excluded_narrative=${rp.excluded_narrative}(press=${rp.excluded_press}/${rp.press_total}=${rp.press_pct}%) pre1949=${rp.pre1949} dedup raw=${rp.dedup.raw} unique=${rp.dedup.unique} bad_gone_resolved=${rp.place_disambig.gone_in_resolved.length} bad_gone_d04=${rp.place_disambig.gone_in_d04.length}`);
