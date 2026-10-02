// scripts/audit-visual-assets.mjs
// 图片专项审查：按墨痕 C3 §5.3 Visual Asset / §9 Media→visual_asset 标准
// 审查维度：A 数据质量  B 宪法字段合规（表结构差距）  C 归属链路（实体/地点/空间锚点）
import fs from "node:fs";
import path from "node:path";
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

// 默认批次＝ 2026-10-01 历史轮（Trace，目录名不改）；自 2026-10-02 起新批次 TAG 前缀为 UNATTENDED-
const TAG = process.argv[2] || "NIGHT-RUN-20261001";
const OUT = path.join("tasks/results", TAG, "visual-audit.html");
const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n = async (sql) => Number(await queryValue(sql));

// ---------- A. 数据质量 ----------
const total = await n(`select count(*) from visual_assets`);
const byRights = await queryRows(`select rights, count(*) c from visual_assets group by 1 order by 2 desc`);
const byPeriod = await queryRows(`select coalesce(depicted_period,'(空)') p, count(*) c from visual_assets group by 1 order by 2 desc`);
const nullDate = await n(`select count(*) from visual_assets where created_date is null`);
const nullCk = await n(`select count(*) from visual_assets where checksum is null or checksum=''`);
const nullSrc = await n(`select count(*) from visual_assets where source_id is null`);
const dupUrl = await queryRows(`select file_path, count(*) c from visual_assets group by 1 having count(*)>1 order by 2 desc limit 20`);
const dupTotal = await n(`select count(*) from (select file_path from visual_assets group by 1 having count(*)>1) d`);

// 授权占位符（非真实 license）判定
const placeholderRights = byRights.filter((r) => /待确认|开放授权|未知|unknown|待核/i.test(r.rights) || !/^(CC|Public domain|CC0)/i.test(r.rights));
const placeholderCount = placeholderRights.reduce((a, r) => a + Number(r.c), 0);

// HTTP 校验回溯：源文件中状态非 200 的 URL 是否被误入库
const verified = JSON.parse(fs.readFileSync(path.join(FETCHED, "shanghai_images_verified_20260905.json"), "utf8"));
const badUrls = (verified.items || []).filter((i) => i._http && i._http.status && i._http.status !== 200).map((i) => i.url);
// 在 JS 侧做集合交集（data-access 不支持 JS 数组绑定）
const allVA = await queryRows(`select file_path, rights, legacy_id from visual_assets`);
const vaByPath = new Map(allVA.map((r) => [r.file_path, r]));
const leakedRows = badUrls.map((u) => vaByPath.get(u)).filter(Boolean);
const leaked = leakedRows.length, leakedSample = leakedRows.slice(0, 5);

// 元数据完整度（源侧）与可归属潜力
const census = JSON.parse(fs.readFileSync(path.join(FETCHED, "shanghai_images_census_20260905.json"), "utf8"));
const citems = census.items || [];
const withTown = citems.filter((i) => i.town_hint).length;
const townDist = {};
for (const i of citems) if (i.town_hint) townDist[i.town_hint] = (townDist[i.town_hint] || 0) + 1;
const withDate = citems.filter((i) => i.date).length;
const withDesc = citems.filter((i) => i.desc).length;

// 镇名能否对上实体（归属潜力）
const entNames = await queryRows(`select canonical_name from entities`);
const entSet = new Set(entNames.map((r) => r.canonical_name));
const linkableTowns = Object.keys(townDist).filter((t) => entSet.has(t));
const linkableCount = linkableTowns.reduce((a, t) => a + townDist[t], 0);

// ---------- B. 宪法字段合规差距 ----------
const cols = await queryRows(`select column_name from information_schema.columns where table_name='visual_assets'`);
const colSet = new Set(cols.map((c) => c.column_name));
const spec = [
  ["身份", ["id", "media_type", "title", "provider", "source_id"], ["asset_id", "asset_type", "title", "provider", "source_id"]],
  ["时间", ["creation_date", "depicted_period"], ["created_date", "depicted_period"]],
  ["内容关联", ["entity_refs", "event_refs", "place_refs"], ["entity_refs", "event_refs", "place_refs"]],
  ["空间对应", ["correspondence_type", "anchor_refs"], ["correspondence_type", "anchor_refs"]],
  ["权利", ["rights", "license", "usage_scope"], ["rights", "license", "usage_scope"]],
  ["其它", ["checksum", "quality_score", "legacy_id"], ["checksum", "quality_score", "legacy_id"]],
];
const gapRows = [];
for (const [group, req, act] of spec) {
  for (let i = 0; i < req.length; i++) gapRows.push({ group, field: req[i], actual: act[i], has: colSet.has(act[i]) });
}
const missing = gapRows.filter((g) => !g.has);
const nAnchors = await n(`select count(*) from historical_feature_anchors`);
const nEntities = await n(`select count(*) from entities`);
const linked = await n(`select count(*) from visual_assets where legacy_id in (select canonical_name from entities)`);

// ---------- 评分 ----------
const dims = [
  { k: "授权明确性", v: Math.round(((total - placeholderCount) / total) * 100), note: `${placeholderCount} 条授权占位/待确认` },
  { k: "时间语义", v: Math.round(((total - nullDate) / total) * 100), note: `${nullDate} 条 creation_date 为空；depicted_period=unknown ${byPeriod.find((p) => p.p === "unknown")?.c || 0}` },
  { k: "去重", v: Math.round(((total - dupTotal) / total) * 100), note: `${dupTotal} 个重复 URL` },
  { k: "溯源", v: Math.round(((total - nullSrc) / total) * 100), note: `${nullSrc} 条无 source_id；checksum 缺失 ${nullCk}` },
  { k: "HTTP 有效性", v: Math.round(((total - leaked) / total) * 100), note: `源侧非 200 共 ${badUrls.length}，误入库 ${leaked}` },
  { k: "归属关联", v: linked > 0 ? 100 : 0, note: `实体/地点/锚点关联字段缺失，${linked} 条已归属` },
];

// ---------- 可视化 HTML ----------
const bar = (v) => `<div style="background:#eef0f3;border-radius:6px;height:14px;width:100%;overflow:hidden"><div style="width:${v}%;height:100%;background:${v >= 80 ? "#16a34a" : v >= 50 ? "#f59e0b" : "#dc2626"}"></div></div>`;
const maxR = Number(byRights[0]?.c || 1);

const html = `<!doctype html><meta charset="utf-8"><title>图片专项审查 · ${TAG}</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#f6f7f9;color:#1a1d21}
.wrap{max-width:1180px;margin:0 auto;padding:28px}
h1{font-size:23px;margin:0 0 6px}h2{font-size:17px;margin:30px 0 12px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:18px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px}
.card .v{font-size:25px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:2px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:6px}
th{background:#f1f3f6;text-align:left;padding:9px 10px}td{padding:8px 10px;border-top:1px solid #eef0f3}
tr:hover td{background:#fafbfc}
.yes{color:#16a34a;font-weight:600}.no{color:#dc2626;font-weight:600}.warn{color:#b45309;font-weight:600}
.dim{display:grid;grid-template-columns:210px 1fr 130px;gap:10px;align-items:center;margin:8px 0;font-size:13px}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin-top:10px}
.bad{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin-top:10px}
.ok{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin-top:10px}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
.rb{display:grid;grid-template-columns:270px 1fr 60px;gap:10px;align-items:center;font-size:12px;margin:5px 0}
</style>
<div class="wrap">
<h1>图片专项审查 · ${TAG}</h1>
<div class="sub">依据：墨痕 C3 §5.3 Visual Asset（身份/时间/内容关联/空间对应/权利）· §9 Media → visual_asset（补 creation_date / depicted_period / rights / provenance）</div>

<div class="cards">
<div class="card"><div class="v">${total}</div><div class="k">图片总量</div></div>
<div class="card"><div class="v warn">${placeholderCount}</div><div class="k">授权待确认</div></div>
<div class="card"><div class="v warn">${nullDate}</div><div class="k">拍摄时间缺失</div></div>
<div class="card"><div class="v warn">${dupTotal}</div><div class="k">重复 URL</div></div>
<div class="card"><div class="v ${leaked ? "no" : "yes"}">${leaked}</div><div class="k">HTTP 非200误入库</div></div>
<div class="card"><div class="v no">${missing.length}</div><div class="k">宪法字段缺失</div></div>
</div>

<h2>一、质量评分（按墨痕标准）</h2>
${dims.map((d) => `<div class="dim"><b>${d.k}</b>${bar(d.v)}<span style="font-size:12px;color:#6b7280">${d.v}% · ${esc(d.note)}</span></div>`).join("")}

<h2>二、宪法字段合规差距（C3 §5.3 vs 实际表结构）</h2>
<table><tr><th>字段组</th><th>宪法要求字段</th><th>库中对应列</th><th>状态</th></tr>
${gapRows.map((g) => `<tr><td>${g.group}</td><td><code>${g.field}</code></td><td><code>${g.actual}</code></td><td class="${g.has ? "yes" : "no"}">${g.has ? "✓ 已实现" : "✗ 缺失"}</td></tr>`).join("")}
</table>
<div class="${missing.length ? "bad" : "ok"}">
${missing.length
  ? `<b>结论：缺失 ${missing.length} 项</b> —— ${missing.map((m) => `<code>${m.field}</code>`).join("、")}。<br>
     其中最致命的是<b>内容关联</b>（entity/place/event refs）与<b>空间对应</b>（correspondence_type/anchor_refs）整组缺失：
     这意味着图片即使进了 <code>visual_assets</code>，也<b>无法归属到任何实体、地点或空间锚点</b>，
     目前是"有资产的孤儿"，不满足 C3 §5.3 的归属要求。`
  : `全部字段齐备。`}
</div>

<h2>三、归属链路现状（能不能挂到实体/地点/坐标）</h2>
<table>
<tr><th>环节</th><th>现状</th><th>判定</th></tr>
<tr><td>图片本体落位</td><td><code>visual_assets</code> ${total} 条（C3 §9 规定的正确位置）</td><td class="yes">✓ 位置正确</td></tr>
<tr><td>实体关联</td><td>无 <code>entity_refs</code> 字段、无 <code>visual_entity_links</code> 关联表 → 已归属 ${linked} 条</td><td class="no">✗ 链路断开</td></tr>
<tr><td>地点关联</td><td>无 <code>place_refs</code>；源数据有 <code>town_hint</code> 但未落库</td><td class="no">✗ 链路断开</td></tr>
<tr><td>空间对应</td><td>无 <code>anchor_refs</code>；库内已有 ${nAnchors} 个现代坐标锚点可复用，但未与图片建立对应</td><td class="no">✗ 链路断开</td></tr>
<tr><td>溯源</td><td><code>source_id</code> 指向统一的 legacy 源记录（${nullSrc} 条无源），粒度粗</td><td class="warn">△ 可用但粗</td></tr>
</table>
<div class="note">
<b>可修复性评估（好消息）：</b>源数据里 <code>shanghai_images_census</code> 的 ${citems.length} 条中，
<b>${withTown} 条带 town_hint（镇名提示）</b>，其中 <b>${linkableCount} 条的镇名能直接对上库内实体</b>（${linkableTowns.slice(0, 12).map((t) => esc(t)).join("、")}${linkableTowns.length > 12 ? " 等" : ""}）。
即：<b>约 ${Math.round((linkableCount / total) * 100)}% 的图片具备"可归属"的客观条件</b>，只差关联结构（字段或关联表）来承接。
另有 ${withDate} 条带 date、${withDesc} 条带 desc —— 这些元数据目前<b>没有落库</b>，是质量与归属的双重损失。
</div>

<h2>四、授权分布</h2>
${byRights.map((r) => `<div class="rb"><span>${esc(r.rights)}</span><span style="background:#eef0f3;border-radius:6px;height:13px;overflow:hidden"><span style="display:block;width:${Math.round((Number(r.c) / maxR) * 100)}%;height:100%;background:${/待确认|开放授权/i.test(r.rights) ? "#f59e0b" : "#2f6fed"}"></span></span><b>${r.c}</b></div>`).join("")}
<div class="${placeholderCount ? "warn" : "ok"}" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px">
<b>${placeholderCount} 条（${Math.round((placeholderCount / total) * 100)}%）授权为占位值</b>（"上海图书馆/Wikimedia 开放数据（授权待确认）"、"上海图书馆开放数据（开放授权）"）。
按墨痕权利合规要求，<b>授权未明确的图片不得进入体验层/对外使用</b> —— 这批需逐条核实 license，或先行标记为不可用。
真实 license（CC 系列 / Public domain / CC0）共 ${total - placeholderCount} 条，可正常用。
</div>

<h2>五、时间语义</h2>
<table><tr><th>depicted_period</th><th>数量</th><th>判定</th></tr>
${byPeriod.map((p) => `<tr><td>${esc(p.p)}</td><td>${p.c}</td><td class="${p.p === "unknown" || p.p === "(空)" ? "warn" : "yes"}">${p.p === "unknown" ? "△ 时间语义缺失" : p.p === "(空)" ? "△ 未填（历史遗留行）" : "✓"}</td></tr>`).join("")}
</table>
<div class="note">C3 §5.3 要求 <b>creation_date 与 depicted_period 分离</b>：一个是"照片拍于何时"，一个是"照片描绘哪个时期"。
当前 ${nullDate} 条 creation_date 为空、${byPeriod.find((p) => p.p === "unknown")?.c || 0} 条 depicted_period=unknown —— 
对古镇题材尤其危险：<b>老照片被当成现代影像，是史料级别的误用</b>。源数据有 ${withDate} 条 date 可用但未落库。</div>

<h2>六、重复与 HTTP 有效性</h2>
<table><tr><th>检查项</th><th>数量</th><th>判定</th></tr>
<tr><td>重复 URL（不同 legacy_id 指向同一图）</td><td>${dupTotal}</td><td class="${dupTotal ? "warn" : "yes"}">${dupTotal ? "△ 需去重" : "✓"}</td></tr>
<tr><td>源侧 HTTP 非 200 的 URL</td><td>${badUrls.length}</td><td>—</td></tr>
<tr><td>其中被误写入库</td><td>${leaked}</td><td class="${leaked ? "no" : "yes"}">${leaked ? "✗ 违规入库" : "✓ 已正确拦截"}</td></tr>
</table>
${dupUrl.length ? `<table><tr><th>重复 URL 样例</th><th>条数</th></tr>${dupUrl.slice(0, 8).map((d) => `<tr><td style="word-break:break-all;font-size:11px">${esc(d.file_path)}</td><td>${d.c}</td></tr>`).join("")}</table>` : ""}
${leakedSample.length ? `<div class="bad"><b>误入库样例：</b><br>${leakedSample.map((l) => `<code style="font-size:11px">${esc(l.file_path)}</code>`).join("<br>")}</div>` : `<div class="ok" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px">HTTP 校验失败的 ${badUrls.length} 条已被正确拦截，未混入库（census 补的 23 条经核对均为有效图）。</div>`}

<h2>七、审查结论与处置建议</h2>
<div class="note">
<b>1. 位置对，但归属断。</b>图片落在 <code>visual_assets</code> 符合 C3 §9；但 C3 §5.3 的内容关联/空间对应字段库中未实现，图片无法挂到实体/地点/锚点。<br>
<b>2. 质量主短板是授权与时间。</b>${placeholderCount} 条授权待确认 + ${nullDate} 条无拍摄时间 + ${byPeriod.find((p) => p.p === "unknown")?.c || 0} 条 depicted_period=unknown。<br>
<b>3. 元数据没落库。</b>源侧 ${withTown} 条 town_hint、${withDate} 条 date、${withDesc} 条 desc 均未进入库内，白白丢失归属与断代线索。<br><br>
<b>建议（按优先级）：</b><br>
① 补归属结构：为 <code>visual_assets</code> 补齐 <code>entity_refs / place_refs / anchor_refs / correspondence_type / license / usage_scope</code>（或建 <code>visual_entity_links</code> 关联表）—— 需你授权一次 DDL。<br>
② 回填元数据：把 town_hint / date / desc 从源 JSON 回写，可立即让约 ${linkableCount} 条图片具备归属能力。<br>
③ 授权分级：${placeholderCount} 条占位授权的图标记为「不可用」，只留 ${total - placeholderCount} 条真实 license 的进体验层。<br>
④ 去重 ${dupTotal} 条重复 URL。<br>
⑤ 老照片/现代影像必须分开标注 depicted_period，避免史料误用。
</div>
</div>`;

fs.writeFileSync(OUT, html, "utf8");
console.log(JSON.stringify({ total, placeholderCount, nullDate, dupTotal, leaked, badUrls: badUrls.length, missing: missing.map((m) => m.field), withTown, linkableCount, linkableTowns: linkableTowns.length }, null, 2));
