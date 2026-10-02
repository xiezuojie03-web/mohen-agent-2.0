// scripts/check-acquisition-intents.mjs
// 目的：让「这批数据当初为什么抓的」从**散落在 title 里的线索**变成**可核对的声明**。
//
// 背景（实测代价）：
//   519 张图片来自坐标半径地理搜索（源文件字段 `"source":"commons-geosearch-topup-20260829"`），
//   半径内枫泾 104 / 川沙 73 / 新场 72 / 高桥 64 / 嘉定 41 全被捞进来，**金泽仅 34 张（6.5%）**；
//   437 条数据连「当初为什么抓它」都没有记录。
//
// 检查项：
//   ① schema / schema_version / policy 齐备
//   ② 每条意图必填字段齐全（含 match 与 evidence_for_declaration）
//   ③ provider 必须已在来源表登记（交叉校验：来源表管"能不能用"，本表管"为什么抓"）
//   ④ evidence_for_declaration 指向的路径必须真实存在（追溯声明必须有据可查）
//   ⑤ match 只许用已知键（防写错键名导致"永不命中"）
//   ⑥ retrospective 的必须写明 declared_by 与 scope_confidence
//   ⑦ **真库每一行必须恰好命中一个意图** —— 命中 0 个 = 未声明；命中 >1 = 声明重叠（都是错）
//   ⑧ 每条意图必须至少命中 1 行（命中 0 行多半是写错 provider/title 的哑条目）
//   DB 不可达时跳过 ⑦⑧ 并 WARN，保证 pnpm guard 离线可跑。
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, queryRows } from "../packages/data-access/src/index.mjs";
import { loadSourceGate, resolveProvider } from "../packages/data-access/src/source-gate.mjs";
import { loadIntents, resolveIntentForRow } from "../packages/data-access/src/acquisition-gate.mjs";

const REG = "specs/data-production/acquisition-intents.json";
const MATCH_KEYS = new Set(["provider", "metadata_kind", "metadata_kind_excludes", "title_contains", "title_contains_any"]);
const REQUIRED = ["batch_id", "retrospective", "declared_at", "declared_by", "provider", "place_scope", "theme_scope", "method", "query_or_radius", "license_scope", "match", "evidence_for_declaration"];

let failed = false;
const bad = (m) => { console.error("ACQUISITION_INTENTS_ERROR " + m); failed = true; };
const isVoid = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);

if (!fs.existsSync(REG)) { console.error(`MISSING ${REG}`); process.exit(1); }
let reg;
try { reg = JSON.parse(fs.readFileSync(REG, "utf8")); }
catch (e) { console.error(`ACQUISITION_INTENTS_ERROR JSON 解析失败：${(e && e.message) || e}`); process.exit(1); }

// ---------- ①②③④⑤⑥ ----------
if (reg.schema !== "mohen.acquisition-intents") bad(`schema 应为 "mohen.acquisition-intents"，实际 "${reg.schema}"`);
if (typeof reg.schema_version !== "number") bad("schema_version 必须是数字");
if (!reg.policy || !reg.policy.rule) bad("缺 policy.rule（本表存在的理由必须写明）");
const intents = Array.isArray(reg.intents) ? reg.intents : [];
if (!intents.length) bad("intents 为空");

loadSourceGate(); // 预热，出错即抛
const ids = new Set();
for (const it of intents) {
  const tag = it && it.batch_id ? it.batch_id : "(无 batch_id)";
  if (ids.has(it.batch_id)) bad(`batch_id 重复：${it.batch_id}`);
  ids.add(it.batch_id);

  for (const k of REQUIRED) {
    if (!(k in it)) bad(`${tag}: 缺字段 ${k}`);
    else if (k !== "match" && isVoid(it[k])) bad(`${tag}: 字段 ${k} 为空`);
  }
  const g = resolveProvider(it.provider);
  if (!g.known) bad(`${tag}: provider "${it.provider}" 未在来源表登记（本表管"为什么抓"，来源表管"能不能用"——两者都要登记）`);

  if (!it.match || typeof it.match !== "object" || Array.isArray(it.match)) bad(`${tag}: match 必须是对象`);
  else for (const k of Object.keys(it.match)) {
    if (!MATCH_KEYS.has(k)) bad(`${tag}: match 含未知键 "${k}"（已知：${[...MATCH_KEYS].join(" / ")}）—— 写错键名会导致永不命中`);
  }

  for (const p of Array.isArray(it.evidence_for_declaration) ? it.evidence_for_declaration : []) {
    if (!fs.existsSync(path.join(PROJECT_ROOT, p))) bad(`${tag}: evidence_for_declaration 里的 "${p}" 在仓内不存在 —— 追溯声明必须有据可查`);
  }
  if (it.retrospective === true && !it.scope_confidence) bad(`${tag}: retrospective 条目必须写明 scope_confidence（confirmed / inferred）`);
  if (it.scope_confidence === "inferred" && !it.note) bad(`${tag}: scope_confidence=inferred 必须在 note 里写明"已查什么、未找到什么"（禁止只写"待查"）`);
}

// ---------- ⑦⑧ 真库核对 ----------
let dbNote = "";
let rows = null;
try {
  rows = await queryRows(
    `select provider, title,
            coalesce(metadata_json->>'kind','') as kind,
            coalesce(metadata_json#>>'{acquisition,batch_id}','') as acq_batch
     from source_records`
  );
} catch (e) {
  dbNote = "WARN DB 不可达，跳过真库核对（离线环境可接受）：" + String((e && e.message) || e).slice(0, 140);
}

const perIntent = new Map(intents.map((x) => [x.batch_id, 0]));
let resolved = 0;
const unresolvable = [];
if (rows) {
  for (const r of rows) {
    const res = resolveIntentForRow(r);
    if (res.matches === 1 && res.intent) { resolved++; perIntent.set(res.batch_id, perIntent.get(res.batch_id) + 1); }
    else {
      unresolvable.push(`${r.provider} | ${String(r.title).slice(0, 46)} | kind=${r.kind || "-"} | 命中 ${res.matches}`);
    }
  }
  if (unresolvable.length) {
    console.error(`ACQUISITION_INTENTS_ERROR 真库中有 ${unresolvable.length} 行未命中唯一采集意图 —— 未声明意图的批次不得进入 Candidate：`);
    for (const u of unresolvable.slice(0, 10)) console.error("     " + u);
    if (unresolvable.length > 10) console.error(`     … 其余 ${unresolvable.length - 10} 行省略`);
    console.error(`     处置：在 ${REG} 里补一条采集意图（或补 match 谓词）。`);
    failed = true;
  }
  const dead = [...perIntent.entries()].filter(([, n]) => n === 0).map(([k]) => k);
  if (dead.length) {
    console.error(`ACQUISITION_INTENTS_ERROR ${dead.length} 条意图命中 0 行 —— 多半是 provider / title_contains 写错（哑条目）：`);
    for (const d of dead) console.error("     " + d);
    failed = true;
  }
}

if (dbNote) console.error(dbNote);
console.log(
  `ACQUISITION_INTENTS schema=v${reg.schema_version} intents=${intents.length} ` +
  `db_rows=${rows ? rows.length : "n/a"} resolved=${resolved} unresolved=${unresolvable.length} ` +
  `retrospective=${intents.filter((x) => x.retrospective === true).length} inferred=${intents.filter((x) => x.scope_confidence === "inferred").length}`
);
process.exit(failed ? 1 : 0);
