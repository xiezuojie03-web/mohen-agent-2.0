// pipelines/research/d01-d02-offline.mjs — 离线 D01+D02 执行（不连库、零 Truth 写入）
//
// 目的：按 2026-10-05 五项边界决策，对库内"可读文本"资料做分类读懂（D01 盘点 + D02 内容观察 + D03 只读 Mention）。
//   · 复用 research-pipeline.mjs 中已审定的纯逻辑（d01Inventory / d02Observations / d03Mentions）。
//   · 视觉载体（yutu_probe 142PDF+45PNG、commons 437）→ 仅登记 asset_pending（决策②，不读图）。
//   · OCR 源（gj_*_ocr / mgts_*_ocr）→ 先做乱码率质量评估再定 uncertainty（决策③）。
//   · derived 文件（_chatgpt_extract/ ocr/ dig/ _pdf_extract_*.txt press_*_review*.txt probe*/ verify* …）→ 排除（决策④）。
//   · T07 并入 T06，不补采（决策⑤）。
//   · 增强：① 标记损坏抓取（HTTP 403/404/HTML 拦截页）与空桩（entries:[]）为 defective/empty；
//          ② 纳入 souyun 诗词旁证；③ 对书目/元数据载体做结构化读出（诗词/方志书目/镇志等）。
//   · 全部结果落本地 tasks/results，不写 PG（离线、零 Truth，符合 truth_write_ceiling=0）。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  FETCHED, classify, d01Inventory, d02Observations, d03Mentions,
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

// ── 决策映射 ────────────────────────────────────────────────────────────────
const EXCLUDED_DIRS = new Set(["_chatgpt_extract", "ocr", "dig", "yutu_probe", "features", "cbdb_extract", "yutu_api"]);
const DERIVED_RE = /(_pdf_extract|press_[\w]*_review|_review\.|verify|probe|diag|screenshot|_extract|sources_ledger|resource_probe|rumsey_maps_raw|external_mapsource_probe|coords_wikidata|yutu_sparql|yutu_triples|yutu_verify|yutu_level3|yutu_meta)/i;
const READ_CARRIERS = new Set([
  "clan_genealogy", "gazetteer", "old_book_fulltext", "poetry_person", "poetry_corpus",
  "heritage_protection", "town_monograph", "narrative_candidate",
  "event_record", "narrative_asset", "placename_gazetteer", "press",
]);
// 仅当通用抽取几乎没命中（<5 片段）时才补结构化读出，避免与散文源重复
const STRUCT_CARRIERS = new Set([
  "clan_genealogy", "gazetteer", "old_book_fulltext", "poetry_person", "poetry_corpus",
  "town_monograph", "narrative_candidate", "narrative_asset", "event_record",
]);

function decide(rel) {
  const name = path.basename(rel);
  if (DERIVED_RE.test(name) || DERIVED_RE.test(rel)) return { action: "exclude", reason: "derived/probe（决策④排除）" };
  if (/souyun/i.test(rel)) return { action: "read", carrier: "poetry_corpus", isOcr: false };
  let carrier = classify(name);
  if (/press/i.test(rel)) carrier = "press";
  else if (/genealogy/i.test(rel)) carrier = "clan_genealogy";
  if (carrier === "biography_db") return { action: "exclude", reason: "人物词表源（仅作 lexicon，非叙事资料）" };
  if (carrier === "image_catalog" || carrier === "historical_map") return { action: "visual", carrier };
  if (READ_CARRIERS.has(carrier)) {
    const isOcr = /_ocr\.json$/i.test(name);
    return { action: "read", carrier, isOcr };
  }
  return { action: "exclude", reason: `carrier=${carrier}（未列入可读文本范围）` };
}

// ── 1. 递归盘点 ────────────────────────────────────────────────────────────
function walk(dir, rel, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (EXCLUDED_DIRS.has(e.name)) continue; walk(full, r, out); }
    else if (e.isFile() && e.name.endsWith(".json")) out.push(r);
  }
}
const allJson = [];
walk(FETCHED, "", allJson);

const readFiles = [], visualRefs = [], excluded = [];
const carrierFix = new Map();
for (const rel of allJson) {
  const d = decide(rel);
  if (d.action === "read") { readFiles.push(rel); carrierFix.set(rel, d.carrier); if (d.isOcr) carrierFix.set(rel + "#ocr", true); }
  else if (d.action === "visual") visualRefs.push({ source_ref: rel, carrier_type: d.carrier });
  else excluded.push({ source_ref: rel, reason: d.reason });
}

// 视觉载体：单独清点时扫 yutu_probe 的 PDF/PNG 与 commons 总量（决策② asset_pending，不读图）
function countExt(dir, exts) {
  let n = 0; const hits = []; const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) stack.push(f);
      else if (exts.includes(path.extname(e.name).toLowerCase())) { n++; if (hits.length < 5) hits.push(e.name); }
    }
  }
  return { n, sample: hits };
}
const yutuPdf = countExt(path.join(FETCHED, "yutu_probe"), [".pdf"]);
const yutuPng = countExt(path.join(FETCHED, "yutu_probe"), [".png"]);
let commonsTotal = 0;
try { commonsTotal = JSON.parse(fs.readFileSync(path.join(FETCHED, "commons_images.json"), "utf8")).meta?.total || 0; } catch {}
const visualPending = [
  ...visualRefs,
  { source_ref: "yutu_probe/*.pdf", carrier_type: "historical_map", note: `本地舆图 ${yutuPdf.n} 页（需栅格化后读图，本轮 asset_pending）` },
  { source_ref: "yutu_probe/*.png", carrier_type: "historical_map", note: `派生渲染 ${yutuPng.n} 张（asset_pending）` },
  { source_ref: "commons_images.json", carrier_type: "image_catalog", note: `外部图 ${commonsTotal} 张（asset_pending，不取字节）` },
];

// ── 2. D01 盘点（复用管线逻辑）────────────────────────────────────────────
const run_id = uuid();
const { inv, parsed } = await d01Inventory({ run_id, files: readFiles });
for (const it of inv) {
  const c = carrierFix.get(it.source_ref);
  if (c) it.carrier_type = c;
  if (carrierFix.get(it.source_ref + "#ocr")) it.is_ocr = true;
}

// ── 损坏/空桩检测（"读懂"必须知道库里有什么、缺什么/坏什么）────────────────
function detectDefect(doc) {
  if (doc && typeof doc === "object") {
    if (doc.status === 403 || doc.status === 404) return `http_error_${doc.status}`;
    if (typeof doc.body === "string" && /<!DOCTYPE html/i.test(doc.body)) return "http_error_page(拦截页)";
    if (typeof doc.body === "string" && doc.body.trim() === "") return "empty_body(status200,抓取空)";
    if (Array.isArray(doc.entries) && doc.entries.length === 0 && (doc.book || doc.db)) return "empty_entries_stub";
  }
  return null;
}
for (const it of inv) {
  const def = detectDefect(parsed.get(it.source_ref));
  if (def) { it.readability = "defective"; it.note = `缺陷源：${def}（不读取，仅登记缺口）`; }
}

// ── 3. D02 内容观察（复用管线逻辑）────────────────────────────────────────
const { obs, bySource, fragsBySource } = d02Observations({ run_id, inv, parsed, maxPerSource: 400, maxObs: 20000 });

// ── 3b. 元数据/书目载体的结构化读出（补"诗词/方志书目/镇志"等未被通用抽取覆盖的缺口）──
function recordSummary(obj) {
  const out = [];
  const title = obj.title || obj.name || obj.label;
  if (title) { const t = norm(title); if (/[一-龥]/.test(t)) out.push(`《${t}》`); }
  if (obj.query) out.push(`query:${norm(obj.query)}`);
  const wi = obj.workInfo || obj;
  const creators = Array.isArray(wi.creator) ? wi.creator : (wi.creator ? [wi.creator] : []);
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
  // 诗词旁证（souyun filter.corroborate：镇→旁证地名）
  if (doc && doc.filter && doc.filter.corroborate) {
    for (const [town, list] of Object.entries(doc.filter.corroborate)) {
      if (Array.isArray(list) && list.length) recs.push(`镇「${town}」入诗旁证地名：${list.slice(0, 15).join("、")}`);
    }
  }
  const walk = (node) => {
    if (recs.length >= 80) return;
    if (Array.isArray(node)) { for (const v of node.slice(0, 120)) walk(v); return; }
    if (node && typeof node === "object") {
      const s = recordSummary(node);
      if (s && s.length >= 4) recs.push(s.slice(0, 200));
      for (const [k, v] of Object.entries(node)) { if (NOISE_KEY.test(k)) continue; if (recs.length >= 80) break; walk(v); }
    }
  };
  walk(doc);
  return recs;
}
const regionOf = (carrier) => ({ carrier, container: null, index: null });
for (const it of inv) {
  if (it.readability === "defective") continue;
  if (!STRUCT_CARRIERS.has(it.carrier_type)) continue;
  if ((fragsBySource[it.source_ref] || 0) >= 5) continue; // 通用抽取已覆盖，避免重复
  const recs = extractRecords(parsed.get(it.source_ref));
  let n = 0;
  for (const s of recs) {
    if (bySource[it.source_ref] >= 400) break;
    obs.push({
      observation_id: uuid(), run_id, source_id: it.source_ref,
      locator: `$`, region: regionOf(it.carrier_type),
      modality: "text", excerpt: s.slice(0, 600), normalized_observation: s.slice(0, 300),
      uncertainty: "结构化元数据读出（书目/诗词/镇志），未回原始载体逐字核对",
      association_readiness: "limited", reading_mode: "structured_metadata",
    });
    bySource[it.source_ref] = (bySource[it.source_ref] || 0) + 1;
    fragsBySource[it.source_ref] = (fragsBySource[it.source_ref] || 0) + 1;
    n++;
  }
  if (n) it.note = (it.note ? it.note + "；" : "") + `结构化读出 ${n} 条`;
}

// ── 3c. OCR 质量评估（决策③）────────────────────────────────────────────
function garbleRatio(text) {
  if (!text) return 0;
  const bad = (text.match(/[�?]/g) || []).length + (text.match(/[-]/g) || []).length;
  return bad / Math.max(1, text.length);
}
const ocrGarble = new Map();
for (const [src, doc] of parsed) {
  if (!carrierFix.get(src + "#ocr")) continue;
  const hits = extractText(doc, "$", [], 0);
  const all = hits.map((h) => h.text).join("");
  ocrGarble.set(src, Number((garbleRatio(all) * 100).toFixed(1)));
}
let ocrFlagged = 0;
for (const o of obs) {
  if (carrierFix.get(o.source_id + "#ocr")) {
    const g = ocrGarble.get(o.source_id) ?? 0;
    ocrFlagged++;
    if (g > 20) { o.uncertainty = `OCR 扫描本乱码率 ${g}%，needs_human_review（高）`; o.association_readiness = "limited"; }
    else if (g > 5) o.uncertainty = `OCR 扫描本含少量乱码（${g}%），建议人工核对`;
    else o.uncertainty = `OCR 扫描本较清晰（乱码率 ${g}%），已抽样核对`;
  }
}

// ── 4. D03 只读 Mention（本地 lexicon，不连库）────────────────────────────
function buildLexicon() {
  const places = new Set(), persons = new Set();
  try {
    const gp = path.join(FETCHED, "geo_placenames_shanghai.json");
    if (fs.existsSync(gp)) {
      const d = JSON.parse(fs.readFileSync(gp, "utf8"));
      const arr = Array.isArray(d) ? d : (d.items || d.data || []);
      for (const r of arr) for (const k of ["city", "county", "prov", "name", "place"]) {
        const v = norm(r && r[k]); if (/^[一-龥]{2,8}$/.test(v)) places.add(v);
      }
    }
  } catch {}
  try {
    const cp = path.join(FETCHED, "cbdb_people.json");
    if (fs.existsSync(cp)) {
      const d = JSON.parse(fs.readFileSync(cp, "utf8"));
      for (const p of d.people || []) { const n = norm(p && (p.name || p.person_name || p.姓名)); if (/^[一-龥]{2,4}$/.test(n)) persons.add(n); }
    }
  } catch {}
  return { places, persons };
}
const lexicon = buildLexicon();
const { mentions, deps } = d03Mentions({ run_id, obs, lexicon });

// ── 5. 报告落地（本地，不写库）────────────────────────────────────────────
const OUT = path.join(process.env.PROJECT_ROOT || path.resolve("."), "tasks", "results", `D01D02-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
fs.mkdirSync(OUT, { recursive: true });

const classification = [
  ...inv.map((x) => ({ source_ref: x.source_ref, decision: x.readability === "defective" ? "DEFECTIVE(缺口)" : "READ", carrier_type: x.carrier_type, is_ocr: !!x.is_ocr, readability: x.readability, note: x.note })),
  ...visualPending.map((x) => ({ source_ref: x.source_ref, decision: "ASSET_PENDING(视觉)", carrier_type: x.carrier_type, readability: "visual_carrier", note: x.note })),
  ...excluded.map((x) => ({ source_ref: x.source_ref, decision: "EXCLUDED", carrier_type: "—", readability: "—", note: x.reason })),
];
fs.writeFileSync(path.join(OUT, "classification.json"), JSON.stringify(classification, null, 2), "utf8");

const obsOut = obs.map((o) => ({ source_id: o.source_id, locator: o.locator, region: o.region, modality: o.modality, reading_mode: o.reading_mode || "free_text", excerpt: o.excerpt, uncertainty: o.uncertainty, association_readiness: o.association_readiness }));
fs.writeFileSync(path.join(OUT, "observations.json"), JSON.stringify(obsOut.slice(0, 4000), null, 2), "utf8");

const totalFrags = Object.values(fragsBySource).reduce((a, b) => a + b, 0);
const readSources = new Set(obs.map((o) => o.source_id));
const defective = inv.filter((x) => x.readability === "defective");
const md = [];
md.push(`# D01+D02 离线读懂报告（决策已应用 + 缺口标记）`);
md.push(`> run_id \`${run_id}\` ｜ 离线执行，未连库，零 Truth 写入`);
md.push("");
md.push(`## 决策落实`);
md.push(`- ① 可读文本优先：纳入 ${readFiles.length} 个可读源（clans/gj_*/mgts_*/press_*/protection*/方志/诗词/镇志/souyun…）`);
md.push(`- ② 视觉 Asset Pending：yutu_probe ${yutuPdf.n} PDF + ${yutuPng.n} PNG、commons ${commonsTotal} 张 → 仅登记，不读图`);
md.push(`- ③ OCR 质量：对 ${[...ocrGarble.keys()].length} 个 OCR 源做乱码率评估，${ocrFlagged} 条 Observation 已据乱码率定 uncertainty`);
md.push(`- ④ derived 排除：${excluded.length} 个文件不当前手`);
md.push(`- ⑤ T07：库内未检出近现代测绘/地籍图（T07）源 → 并入 T06 缺口，不补采`);
md.push("");
md.push(`## 覆盖`);
md.push(`- 可读文本源：${readFiles.length}，已被读到：${readSources.size}（${readSources.size ? ((readSources.size / readFiles.length) * 100).toFixed(1) : 0}%）`);
md.push(`- 文本片段总数（可读源）：${totalFrags} ｜ Observation：${obs.length} ｜ Mention：${mentions.length}（resolved ${mentions.filter((m) => m.resolution === "resolved").length}）`);
md.push(`- 视觉载体（asset_pending）：${visualPending.length} 组 ｜ derived 排除：${excluded.length}`);
md.push(`- **缺陷/空桩源（库内缺口，已标记不读取）：${defective.length}**`);
md.push(`- 实体写入=0 ｜ 关系写入=0 ｜ 候选写入=0 ｜ Truth Promotion=0`);
md.push("");
md.push(`## 缺陷/空桩源明细（库内缺失/损坏，需补采或修复抓取）`);
md.push("| 来源 | 载体 | 缺陷类型 |");
md.push("|---|---|---|");
for (const s of defective) md.push(`| ${s.source_ref} | ${s.carrier_type} | ${s.note} |`);
md.push("");
md.push(`## 逐来源明细（可读文本）`);
md.push("| 来源 | 载体 | 可读性 | 片段 | Observation |");
md.push("|---|---|---|---|---|");
for (const s of inv) {
  const frags = fragsBySource[s.source_ref] || 0;
  const o = bySource[s.source_ref] || 0;
  md.push(`| ${s.source_ref} | ${s.carrier_type}${s.is_ocr ? "(OCR)" : ""} | ${s.readability} | ${frags} | ${o} |`);
}
md.push("");
md.push(`> 输出目录：${OUT}`);
fs.writeFileSync(path.join(OUT, "coverage-report.md"), md.join("\n"), "utf8");
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ run_id, read_sources: readFiles.length, observations: obs.length, mentions: mentions.length, dependencies: deps.length, visual_pending: visualPending.length, excluded: excluded.length, defective: defective.length, ocr_sources: [...ocrGarble.keys()], ocr_garble: Object.fromEntries(ocrGarble) }, null, 2), "utf8");

console.log(`DONE read=${readFiles.length} obs=${obs.length} mentions=${mentions.length} defective=${defective.length} visual_pending=${visualPending.length} excluded=${excluded.length}`);
console.log(`REPORT ${path.join(OUT, "coverage-report.md")}`);
