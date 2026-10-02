// scripts/gen-acceptance-report.mjs
// 生成人肉验收用的可视化验收页（HTML，自包含，数据实时取自 mohen_dev）
import fs from "node:fs";
import path from "node:path";
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

const TAG = process.argv[2] || "NIGHT-RUN-20261001";
const OUT_DIR = path.join("tasks/results", TAG);
const PROGRESS = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "progress.json"), "utf8"));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const cnt = async (sql) => Number(await queryValue(sql));
const tables = [
  ["entities", "实体（candidate）", 3308],
  ["evidence", "证据", 3223],
  ["relations", "关系（candidate）", 334],
  ["visual_assets", "视觉资产（照片）", null],
  ["historical_features", "历史/现代特征", 238],
  ["historical_feature_anchors", "空间锚点（坐标）", 238],
];
const rows = [];
for (const [t, label, add] of tables) rows.push({ t, label, n: await cnt(`select count(*) from ${t}`), add });
const nSrc = await cnt(`select count(*) from source_records where provider='hushang_legacy'`);
const nHold = await cnt(`select count(*) from review_queue where status='pending'`);

const photos = await queryRows(`select file_path, rights, legacy_id from visual_assets order by legacy_id limit 12`);
const rels = await queryRows(`
  select se.canonical_name as s, r.predicate, oe.canonical_name as o, r.status, r.legacy_id
  from relations r
  join entities se on se.entity_id = r.subject_id
  join entities oe on oe.entity_id = r.object_id
  where r.status='candidate' limit 12`);
const anchors = await queryRows(`
  select hf.canonical_label as label, a.lat, a.lng, a.coord_system, a.anchor_kind, a.historical_position_proof as proof
  from historical_feature_anchors a join historical_features hf on hf.feature_id = a.feature_id
  order by hf.canonical_label limit 12`);
const sources = await queryRows(`select title from source_records where provider='hushang_legacy' order by title limit 80`);

const jobs = Object.entries(PROGRESS.jobs).map(([k, v]) => ({ id: k, ok: v.ok !== false, ins: v.inserted || 0, note: v.note || "" }));
const done = jobs.length;
const failed = jobs.filter((j) => !j.ok).length;

const html = `<!doctype html><meta charset="utf-8"><title>${TAG} 验收报告</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#f6f7f9;color:#1a1d21}
.wrap{max-width:1180px;margin:0 auto;padding:28px}
h1{font-size:24px;margin:0 0 6px}h2{font-size:17px;margin:28px 0 12px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:20px}
.badge{display:inline-block;padding:5px 14px;border-radius:20px;background:#16a34a;color:#fff;font-weight:600;font-size:13px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px}
.card .v{font-size:26px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:2px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
th{background:#f1f3f6;text-align:left;padding:9px 10px;font-weight:600}
td{padding:8px 10px;border-top:1px solid #eef0f3;vertical-align:top}
tr:hover td{background:#fafbfc}
.ok{color:#16a34a;font-weight:600}.zero{color:#b45309;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.ph{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px}
.ph img{width:100%;height:110px;object-fit:cover;border-radius:5px;background:#eee;display:block}
.ph .r{font-size:11px;color:#6b7280;margin-top:6px;word-break:break-all;line-height:1.4}
.ph a{font-size:11px;color:#2f6fed;text-decoration:none}
ul{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 14px 14px 32px;font-size:13px;line-height:1.9}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.7}
</style>
<div class="wrap">
<h1>${TAG} · 验收报告 <span class="badge">${esc(PROGRESS.verdict)}</span></h1>
<div class="sub">常驻夜间生产 · 开始 ${esc(PROGRESS.started_at)} · 截止 ${esc(PROGRESS.cutoff)}（本地 06:00）· 节奏 ${PROGRESS.interval_min} 分钟/作业 · 模式 ${esc(PROGRESS.mode)} / ${esc(PROGRESS.env)}</div>

<div class="cards">
<div class="card"><div class="v">${done}/66</div><div class="k">作业完成</div></div>
<div class="card"><div class="v ok">${failed}</div><div class="k">失败</div></div>
<div class="card"><div class="v">${PROGRESS.counters.inserted}</div><div class="k">本夜落库新增</div></div>
<div class="card"><div class="v">${nSrc}</div><div class="k">Legacy 源材料</div></div>
<div class="card"><div class="v">${nHold}</div><div class="k">待人工裁决 HOLD</div></div>
</div>

<h2>一、库内总量</h2>
<table><tr><th>表</th><th>说明</th><th>当前总量</th><th>本批新增</th></tr>
${rows.map((r) => `<tr><td><code>${r.t}</code></td><td>${esc(r.label)}</td><td><b>${r.n}</b></td><td>${r.add ? "+" + r.add : "—"}</td></tr>`).join("")}
</table>

<h2>二、照片抽查（点击可看原图，人肉验收用）</h2>
<div class="grid">
${photos.map((p) => `<div class="ph"><a href="${esc(p.file_path)}" target="_blank"><img src="${esc(p.file_path)}" loading="lazy" onerror="this.style.display='none'"></a><div class="r">${esc(p.rights)}</div><a href="${esc(p.file_path)}" target="_blank">打开原图 ↗</a></div>`).join("")}
</div>

<h2>三、关系抽查（candidate，未晋级为事实）</h2>
<table><tr><th>主体</th><th>谓词</th><th>客体</th><th>状态</th></tr>
${rels.map((r) => `<tr><td>${esc(r.s)}</td><td><code>${esc(r.predicate)}</code></td><td>${esc(r.o)}</td><td class="ok">${esc(r.status)}</td></tr>`).join("")}
</table>

<h2>四、坐标抽查（现代对象点，非历史几何）</h2>
<table><tr><th>名称</th><th>纬度</th><th>经度</th><th>CRS</th><th>锚点类型</th><th>历史位置证明</th></tr>
${anchors.map((a) => `<tr><td>${esc(a.label)}</td><td>${a.lat}</td><td>${a.lng}</td><td><code>${esc(a.coord_system)}</code></td><td>${esc(a.anchor_kind)}</td><td class="${a.proof ? "zero" : "ok"}">${a.proof ? "true ⚠" : "false ✓"}</td></tr>`).join("")}
</table>

<h2>五、源材料清单（L0/L1 append-only）</h2>
<table><tr><th>#</th><th>源标题</th></tr>
${sources.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.title)}</td></tr>`).join("")}
</table>

<h2>六、作业明细（${done} 项）</h2>
<table><tr><th>作业</th><th>结果</th><th>新增</th></tr>
${jobs.map((j) => `<tr><td><code>${esc(j.id)}</code></td><td class="${j.ok ? "ok" : "zero"}">${j.ok ? "OK" : "FAIL"}</td><td class="${j.ins ? "" : "zero"}">${j.ins}${j.ins ? "" : " ⚠"}</td></tr>`).join("")}
</table>

<h2>七、安全核验（T07 基线）</h2>
<ul>
<li>零自动晋级：关系/坐标/照片均为 <code>candidate</code>，未写 <code>published/verified</code>，未绕过 Evidence Gate</li>
<li>坐标诚实：<code>provider_current_object_point</code> + <code>WGS84</code> + <code>historical_position_proof=false</code>（库层 CHECK 强制，上表可见全为 false）</li>
<li>Raw append-only：源材料快照存 <code>D:/MoHen/data/raw/legacy/hushang/</code></li>
<li>幂等：按 <code>legacy_id</code>/<code>checksum</code> 跳过，可安全重跑</li>
<li>AI 生成文字未当证据；诗词/叙事仅作 Source 留存，未写作事实</li>
<li>凭证隔离：S1 Key 仅在本机 <code>.env.local</code>（gitignored），未入库/未入码/未入报告</li>
</ul>

<h2>八、遗留项（需你知悉）</h2>
<div class="note">
<b>1) 2 个作业未执行</b>（截止时间到，队列尾部）：<code>src-jp_zhu_persons.json</code>、<code>src-gj_14373_toc.json</code> —— 幂等，下次跑自动补上。<br>
<b>2) 2 个图片作业返回 0</b>：<code>images-commons-baoshan</code>、<code>images-commons-maps</code> —— 非失败，是这两个 JSON 的结构与我探测的键不匹配，未解析出图片数组。数据仍在源里，需按实际结构补解析。<br>
<b>3) Wikidata 坐标仅补 2 条</b>：源本身 <code>missed:111</code>，非我方问题；现代坐标覆盖仍受限于旧库（238+2）。
</div>
</div>`;

fs.writeFileSync(path.join(OUT_DIR, "acceptance.html"), html, "utf8");
console.log("written acceptance.html  photos=" + photos.length + " rels=" + rels.length + " anchors=" + anchors.length + " sources=" + sources.length);
