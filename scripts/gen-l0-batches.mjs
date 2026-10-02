// scripts/gen-l0-batches.mjs
// L0 Source 层逐图明细：按质量分从高到低分批出可视化审查页
import fs from "node:fs";
import path from "node:path";
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

// 默认批次＝ 2026-10-01 历史轮（Trace，目录名不改）；自 2026-10-02 起新批次 TAG 前缀为 UNATTENDED-
const TAG = process.argv[2] || "NIGHT-RUN-20261001";
const BATCH = Number(process.argv[3] || 100);
const OUT_DIR = path.join("tasks/results", TAG, "l0");
const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---- 源侧元数据按 URL 建索引 ----
const j = (f) => { try { return JSON.parse(fs.readFileSync(path.join(FETCHED, f), "utf8")); } catch { return {}; } };
const commons = j("commons_images.json").images || [];
const census = j("shanghai_images_census_20260905.json").items || [];
const verified = j("shanghai_images_verified_20260905.json").items || [];
const meta = new Map();
for (const c of commons) if (c.url) meta.set(c.url, { title: c.title, license: c.license, artist: c.artist, date: c.date, towns: c.towns, desc: c.description, kind: "Wikimedia Commons" });
for (const c of census) if (c.url) meta.set(c.url, { ...(meta.get(c.url) || {}), town_hint: c.town_hint, date: c.date || (meta.get(c.url) || {}).date, desc: c.desc, http: c._http?.status, kind: (meta.get(c.url) || {}).kind || "上海图书馆开放数据" });
for (const c of verified) if (c.url) { const m = meta.get(c.url) || {}; m.http = c._http?.status ?? m.http; meta.set(c.url, m); }

// ---- 实体镇名集合（可归属判定）----
const entSet = new Set((await queryRows(`select canonical_name from entities`)).map((r) => r.canonical_name));

// ---- 库内图片 ----
const rows = await queryRows(`select file_path, rights, created_date, depicted_period, checksum, legacy_id from visual_assets`);

const licScore = (r) => {
  const s = String(r || "");
  if (/CC0|Public domain/i.test(s)) return 25;
  if (/CC BY 4\.0|CC BY 3\.0|CC BY 2\.0/i.test(s)) return 22;
  if (/CC BY-SA/i.test(s)) return 18;
  if (/^CC /i.test(s)) return 15;
  return 0; // 占位/未知
};

const items = rows.map((r) => {
  const m = meta.get(r.file_path) || {};
  const http = m.http;
  const dp = r.depicted_period;
  const dpKnown = dp && dp !== "unknown";
  const dateVal = r.created_date || m.date || null;
  const town = m.town_hint || (Array.isArray(m.towns) ? m.towns[0] : null);
  const linkable = town && entSet.has(town);
  let s = 0;
  s += http === 200 ? 20 : (http == null ? 8 : -100);
  s += licScore(r.rights);
  s += dateVal ? 15 : 0;
  s += dpKnown ? 10 : 0;
  s += town ? 15 : 0;
  s += (m.desc || m.title) ? 5 : 0;
  s += r.checksum ? 5 : 0;
  return { ...r, m, http, dpKnown, dateVal, town, linkable, score: Math.max(0, Math.min(100, s)),
    reject: http != null && http !== 200 };
});

items.sort((a, b) => (a.reject - b.reject) || (b.score - a.score) || String(a.file_path).localeCompare(String(b.file_path)));

const batches = [];
for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH));

const color = (s) => s >= 70 ? "#16a34a" : s >= 45 ? "#f59e0b" : "#dc2626";
const rowHtml = (it, i) => `<tr>
<td>${i + 1}</td>
<td><a href="${esc(it.file_path)}" target="_blank"><img src="${esc(it.file_path)}" loading="lazy" onerror="this.outerHTML='<span style=&quot;color:#9ca3af;font-size:11px&quot;>图不可达</span>'"></a></td>
<td><b style="color:${color(it.score)}">${it.score}</b><div style="background:#eef0f3;height:5px;border-radius:3px;margin-top:3px"><div style="width:${it.score}%;height:100%;background:${color(it.score)}"></div></div></td>
<td>${it.reject ? `<span class="no">✗ ${it.http}</span>` : it.http === 200 ? `<span class="yes">✓ 200</span>` : `<span class="warn">未校验</span>`}</td>
<td>${esc(it.rights)}${it.m.license && it.m.license !== it.rights ? `<br><span style="font-size:11px;color:#6b7280">源侧 ${esc(it.m.license)}</span>` : ""}</td>
<td>${esc(it.dateVal || "—")}</td>
<td>${it.dpKnown ? esc(it.depicted_period) : `<span class="warn">未知</span>`}</td>
<td>${(it.m.desc || it.m.title) ? `<b style="font-size:11px">${esc(it.m.title || "—")}</b><br><span style="font-size:11px;color:#6b7280">${esc(it.m.desc || "")}${it.m.place ? ` · 地点:${esc(it.m.place)}` : ""}</span>` : `<span style="color:#9ca3af;font-size:11px">无内容简介<br>（源数据缺失）</span>`}</td>
<td>${it.town ? `${esc(it.town)}${it.linkable ? ` <span class="yes">✓可归属</span>` : ` <span class="warn">△无对应实体</span>`}` : `<span style="color:#9ca3af">—</span>`}</td>
<td><span class="no">未落盘</span><br><span style="font-size:11px;color:#6b7280">仅远程 URL</span></td>
<td>${it.reject ? `<span class="no">剔除</span>` : it.score >= 70 ? `<span class="yes">可用</span>` : it.score >= 45 ? `<span class="warn">HOLD</span>` : `<span class="warn">待补</span>`}</td>
<td><a href="${esc(it.file_path)}" target="_blank">原图↗</a></td>
</tr>`;

const page = (list, idx) => `<!doctype html><meta charset="utf-8"><title>L0 明细 · 第 ${idx} 批</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#f6f7f9;color:#1a1d21}
.wrap{max-width:1400px;margin:0 auto;padding:24px}
h1{font-size:21px;margin:0 0 6px}.sub{color:#6b7280;font-size:13px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:12px;border:1px solid #e5e7eb}
th{background:#f1f3f6;text-align:left;padding:8px 9px;position:sticky;top:0}
td{padding:7px 9px;border-top:1px solid #eef0f3;vertical-align:top}
tr:hover td{background:#fafbfc}
img{width:110px;height:74px;object-fit:cover;border-radius:5px;display:block;border:1px solid #e5e7eb}
.yes{color:#16a34a;font-weight:600}.no{color:#dc2626;font-weight:600}.warn{color:#b45309;font-weight:600}
a{color:#2f6fed;text-decoration:none}
.nav{margin:14px 0;font-size:13px}
.bad{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:11px 14px;font-size:13px;margin-bottom:14px;line-height:1.7}
</style>
<div class="wrap">
<h1>L0 Source 层 · 逐图明细（第 ${idx}/${batches.length} 批）</h1>
<div class="sub">按质量分从高到低排序 · 本批 ${list.length} 张 · 分数越高越可优先采用 · 质量分 = 授权(25) + HTTP校验(20) + 拍摄时间(15) + 归属线索(15) + 时间语义(10) + 描述(5) + checksum(5)</div>
<div class="bad"><b>本地磁盘位置：未落盘。</b>全部 ${rows.length} 张图的 <code>file_path</code> 均为远程 URL（<code>img.library.sh.cn</code> / <code>upload.wikimedia.org</code>），
<b>原始字节从未下载到本地</b>。本地 <code>D:\\MoHen\\data\\raw\\legacy\\hushang\\</code> 只有 57 个 JSON 元数据文件，没有图片。
按 C3 §2.1，L0 的 <code>raw_item</code> 应保存 <code>raw_payload</code>（原件本体），目前只有 <code>original_locator</code> —— <b>链接一旦失效即永久丢失</b>。</div>
<div class="nav">${batches.map((_, k) => `<a href="l0-batch-${String(k + 1).padStart(2, "0")}.html">第${k + 1}批</a>`).join(" · ")} · <a href="l0-index.html">总览</a></div>
<table><tr><th>#</th><th>图</th><th>质量分</th><th>HTTP</th><th>授权</th><th>拍摄时间</th><th>描绘时期</th><th>标题 / 内容简介</th><th>镇/归属</th><th>本地落盘</th><th>建议</th><th>原图</th></tr>
${list.map(rowHtml).join("")}
</table></div>`;

batches.forEach((b, k) => fs.writeFileSync(path.join(OUT_DIR, `l0-batch-${String(k + 1).padStart(2, "0")}.html`), page(b, k + 1), "utf8"));

// ---- 总览 ----
const dist = { high: items.filter((i) => i.score >= 70 && !i.reject).length, mid: items.filter((i) => i.score >= 45 && i.score < 70 && !i.reject).length, low: items.filter((i) => i.score < 45 && !i.reject).length, reject: items.filter((i) => i.reject).length };
const nSrc = await queryValue(`select count(*) from source_records where provider='hushang_legacy'`);
const idxHtml = `<!doctype html><meta charset="utf-8"><title>L0 逐图审查 · 总览</title>
<style>body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#f6f7f9;color:#1a1d21}
.wrap{max-width:1000px;margin:0 auto;padding:26px}h1{font-size:22px;margin:0 0 6px}.sub{color:#6b7280;font-size:13px;margin-bottom:18px}
h2{font-size:16px;margin:26px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid #e5e7eb}
th{background:#f1f3f6;text-align:left;padding:9px}td{padding:9px;border-top:1px solid #eef0f3}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:14px 0}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px}.card .v{font-size:24px;font-weight:700}.card .k{font-size:12px;color:#6b7280}
a{color:#2f6fed;text-decoration:none}.yes{color:#16a34a;font-weight:600}.no{color:#dc2626;font-weight:600}.warn{color:#b45309;font-weight:600}
.bad{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
</style><div class="wrap">
<h1>L0 Source 层 · 逐图审查总览</h1>
<div class="sub">共 ${items.length} 张 · 分 ${batches.length} 批（每批 ${BATCH} 张）· 已按质量分<b>从高到低</b>排序，先审高分</div>
<div class="cards">
<div class="card"><div class="v">${items.length}</div><div class="k">图片总量</div></div>
<div class="card"><div class="v yes">${dist.high}</div><div class="k">可用（≥70）</div></div>
<div class="card"><div class="v warn">${dist.mid}</div><div class="k">HOLD（45–69）</div></div>
<div class="card"><div class="v warn">${dist.low}</div><div class="k">待补（&lt;45）</div></div>
<div class="card"><div class="v no">${dist.reject}</div><div class="k">应剔除（死链）</div></div>
</div>
<div class="bad"><b>本地磁盘：图片未落盘。</b>1288 张全部只有远程 URL；本地 <code>D:\\MoHen\\data\\raw\\legacy\\hushang\\</code> 仅 57 个 JSON 元数据文件。
C3 §2.1 要求 L0 <code>raw_item</code> 保存原件 <code>raw_payload</code>，目前缺失 —— 建议尽快批量下载原件到本地 Raw 区。</div>
<h2>分批入口（按质量降序）</h2>
<table><tr><th>批次</th><th>分数区间</th><th>张数</th><th>主要构成</th><th>打开</th></tr>
${batches.map((b, k) => `<tr><td>第 ${k + 1} 批</td><td>${b[b.length - 1].score} – ${b[0].score}</td><td>${b.length}</td><td>可用 ${b.filter((i) => i.score >= 70 && !i.reject).length} · HOLD ${b.filter((i) => i.score >= 45 && i.score < 70 && !i.reject).length} · 待补 ${b.filter((i) => i.score < 45 && !i.reject).length} · 剔除 ${b.filter((i) => i.reject).length}</td><td><a href="l0-batch-${String(k + 1).padStart(2, "0")}.html">打开 ↗</a></td></tr>`).join("")}
</table>
<h2>L0 层应有表 vs 现状</h2>
<table><tr><th>C3 §2.1 L0 对象</th><th>职责</th><th>库中现状</th><th>缺口</th></tr>
<tr><td><code>source_record</code></td><td>来源身份：provider / URI / 许可 / checksum</td><td class="yes">✓ <code>source_records</code> 有 ${nSrc} 条 legacy 源</td><td class="warn">1288 张图<b>共用粗粒度源记录</b>，未按图建来源身份</td></tr>
<tr><td><code>source_version</code></td><td>版本化</td><td class="no">✗ 无</td><td>需建或并入 checksum 版本字段</td></tr>
<tr><td><code>raw_item</code></td><td><b>原始材料本体</b>（raw_payload / original_locator）</td><td class="no">✗ 无此表；仅文件系统存 JSON 元数据</td><td class="no"><b>图片原件字节完全未落盘</b></td></tr>
<tr><td><code>ingestion_run</code></td><td>采集/解析过程留痕</td><td class="yes">✓ <code>ingest_runs</code>（11 条）</td><td>—</td></tr>
</table>
</div>`;
fs.writeFileSync(path.join(OUT_DIR, "l0-index.html"), idxHtml, "utf8");
console.log(JSON.stringify({ total: items.length, batches: batches.length, dist, out: OUT_DIR }, null, 2));
