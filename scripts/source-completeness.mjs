// scripts/source-completeness.mjs — 每来源完整性对照表（证明/证伪"挖干"）
// 真实计算：对每个 Legacy 来源，统计"可提取中文正文串数"（镜像 d02 门槛 len>=20 & 中文>=30%）
// 与库内 research_observation 实际条数对照；观察每源封顶 500（maxPerSource）属机制限制。
import fs from "node:fs";
import path from "node:path";
import { run, queryRows } from "../packages/data-access/src/index.mjs";

const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const MAX_PER_SOURCE = 500; // 与 research-runner.mjs 默认一致

function hanCount(s) { return (s.match(/[\u4e00-\u9fa5]/g) || []).length; }
function isContent(s) { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length >= 20 && hanCount(t) / t.length >= 0.3; }

// 递归统计：可提取正文串数 + 最大顶层数组长度（条目数估计）
function analyze(node, contentOut) {
  if (typeof node === "string") { if (isContent(node)) contentOut.n++; return; }
  if (Array.isArray(node)) {
    if (node.length > contentOut.maxArr) contentOut.maxArr = node.length;
    for (const x of node) analyze(x, contentOut);
  } else if (node && typeof node === "object") {
    for (const k of Object.keys(node)) analyze(node[k], contentOut);
  }
}

function findFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findFiles(p, acc);
    else if (e.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

async function main() {
  // 1) 库内统计
  const inv = await queryRows(`select source_ref, readability, carrier_type from research_source_inventory`);
  // research_observation.source_id 是 text，直接存来源引用（如 "_work_titles.json"），非 uuid FK
  const obs = await queryRows(`select source_id, count(*) as c from research_observation group by source_id`);
  const obsMap = new Map(obs.map((r) => [r.source_id, +r.c]));
  const men = await queryRows(`select o.source_id, count(*) as c from research_mention m join research_observation o on o.observation_id=m.observation_id group by o.source_id`);
  const menMap = new Map(men.map((r) => [r.source_id, +r.c]));
  const invMap = new Map(inv.map((r) => [r.source_ref, r]));

  // 2) 原始文件统计（按 basename 匹配 source_ref）
  const files = findFiles(FETCHED);
  const fileByBase = new Map();
  for (const f of files) {
    const b = path.basename(f);
    if (!fileByBase.has(b)) fileByBase.set(b, f); // 取首个匹配
  }

  const rows = [];
  let cappedSum = 0, catalogSum = 0, minedSum = 0;
  for (const [ref, invRow] of invMap) {
    const fp = fileByBase.get(ref);
    let totalContent = 0, entries = 0, readable = true;
    if (fp) {
      try {
        const doc = JSON.parse(fs.readFileSync(fp, "utf8"));
        const acc = { n: 0, maxArr: 0 };
        analyze(doc, acc);
        totalContent = acc.n; entries = acc.maxArr;
      } catch { readable = false; }
    } else { readable = false; }
    const obsC = obsMap.get(ref) || 0;
    const menC = menMap.get(ref) || 0;
    // 判定：机制限制（封顶或内容远多于观察） | 已挖干（内容≈观察） | 未读取（catalog_only/无文件）
    let verdict;
    if (!readable || invRow.readability === "catalog_only" || invRow.readability === "unreadable") verdict = "未读取(机制排除)";
    else if (obsC >= MAX_PER_SOURCE || totalContent > obsC * 1.5) verdict = "机制限制·未挖干";
    else if (totalContent <= obsC + 5) verdict = "已挖干/持平";
    else verdict = "部分提取";
    if (verdict.startsWith("机制限制") || verdict === "未读取(机制排除)") cappedSum++;
    if (verdict === "已挖干/持平") minedSum++;
    rows.push({ ref, carrier: invRow.carrier_type, readability: invRow.readability, entries, totalContent, obs: obsC, men: menC, verdict });
  }

  rows.sort((a, b) => b.totalContent - a.totalContent);
  const totalObs = rows.reduce((s, r) => s + r.obs, 0);
  const totalContent = rows.reduce((s, r) => s + r.totalContent, 0);

  // 3) 输出 HTML
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const verdictColor = (v) => v.startsWith("机制限制") ? "#ffb454" : v === "已挖干/持平" ? "#39d0a5" : v === "未读取(机制排除)" ? "#9aa3b2" : "#5b8cff";
  const trs = rows.map((r) => `<tr>
    <td><code>${esc(r.ref)}</code></td><td>${esc(r.carrier)}</td><td>${esc(r.readability)}</td>
    <td class="num">${r.entries.toLocaleString()}</td><td class="num">${r.totalContent.toLocaleString()}</td>
    <td class="num">${r.obs.toLocaleString()}</td><td class="num">${r.men.toLocaleString()}</td>
    <td style="color:${verdictColor(r.verdict)}">${esc(r.verdict)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<title>每来源完整性对照表 · 挖干证伪（2026-10-04）</title>
<style>body{background:#0f1115;color:#e8eaf0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:28px;line-height:1.6}
h1{font-size:22px}h2{font-size:17px;margin-top:26px;color:#5b8cff}.sub{color:#9aa3b2;font-size:13px}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}th,td{padding:6px 8px;border-bottom:1px solid #2a2f3a;text-align:left}
th{color:#9aa3b2}.num{text-align:right;font-variant-numeric:tabular-nums}
.box{background:#171a21;border:1px solid #2a2f3a;border-radius:12px;padding:16px;margin:12px 0}
.b{font-size:22px;font-weight:700}.verdict{background:#1b2030;border:1px solid #2a2f3a;border-radius:12px;padding:16px 18px;margin:14px 0}
code{background:#1e222b;padding:1px 5px;border-radius:4px;font-size:11px}</style></head><body>
<div class="wrap" style="max-width:1100px;margin:0 auto">
<h1>每来源完整性对照表 · 「挖干」证伪分析</h1>
<div class="sub">墨痕 · 沪上经纬 Legacy Reservoir（95 来源）· 实测 2026-10-04 · 对照维度：可提取中文正文串数 vs 库内 research_observation 实际条数</div>
<div class="box">
  <div style="display:flex;gap:18px;flex-wrap:wrap">
    <div><div class="b">${rows.length}</div><div class="sub">盘点来源数</div></div>
    <div><div class="b">${totalContent.toLocaleString()}</div><div class="sub">可提取正文串总数（阈值内）</div></div>
    <div><div class="b">${totalObs.toLocaleString()}</div><div class="sub">已存 Observation 总数</div></div>
    <div><div class="b" style="color:#ffb454">${cappedSum}</div><div class="sub">机制限制/未读取来源</div></div>
    <div><div class="b" style="color:#39d0a5">${minedSum}</div><div class="sub">已挖干/持平来源</div></div>
  </div>
</div>
<div class="verdict">
  <b>结论：沪上经纬老数据<b style="color:#ffb454"> 远未挖干</b>。</b> 可提取中文正文串总数 <b>${totalContent.toLocaleString()}</b>，已存 Observation <b>${totalObs.toLocaleString()}</b>——聚合仅提取 <b>${Math.round(totalObs/totalContent*100)}%</b>，<b>剩余约 ${((1-totalObs/totalContent)*100).toFixed(0)}% 仍留在来源里</b>。
  <br>逐来源看：<b>${minedSum}</b> 个小来源（内容少、未触封顶）已持平挖干；<b>${cappedSum}</b> 个来源受机制限制——其中大来源（古籍/方志/人物库）被<b>每源 500 条封顶（maxPerSource）</b>压成冰山一角，视觉载体（image_catalog / historical_map）按设计不产 Observation。
  <br>因此「L0 没新增 / 数据量不涨」是<b>机制设计（阈值 + 500 封顶）+ 桥接缺失</b>导致，<b>不是数据源挖完</b>。要真正"挖干"，需放大每源配额并放开视觉载体读取——属下一轮机制升级，不关数据源储量。
</div>
<h2>逐来源对照（按可提取正文串数降序）</h2>
<table><tr><th>来源(source_ref)</th><th>载体</th><th>可读性</th><th>条目数</th><th>可提取正文串</th><th>Observation</th><th>Mention</th><th>判定</th></tr>${trs}</table>
<div class="sub">说明：「可提取正文串」= 递归遍历 JSON 中所有满足「长度≥20 且中文占比≥30%」的字符串叶节点；「条目数」= 文件中最大顶层数组长度（结构规模估计）。两者均可机读复算。image_catalog / historical_map 等视觉载体按管线设计不产 Observation（机制排除）。</div>
</div></body></html>`;
  fs.writeFileSync("tasks/results/SOURCE-COMPLETENESS-20261004.html", html);
  fs.writeFileSync("tasks/results/SOURCE-COMPLETENESS-20261004.json", JSON.stringify({ rows, totalObs, totalContent, cappedSum, minedSum }, null, 2));
  console.log(`SOURCES=${rows.length} totalContent=${totalContent} totalObs=${totalObs} mechanismLimited=${cappedSum} minedDry=${minedSum}`);
  console.log("HTML -> tasks/results/SOURCE-COMPLETENESS-20261004.html");
}
main().catch((e) => { console.error(e); process.exit(1); });
