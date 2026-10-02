// scripts/gen-image-placement-map.mjs
// 图像原始资料「宪法归位模型」可视化：每张图片应归的数据表（含图片本身）+ 真实实例逐表展开
import fs from "node:fs";
import path from "node:path";
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

// 默认批次＝ 2026-10-01 历史轮（Trace，目录名不改）；自 2026-10-02 起新批次 TAG 前缀为 UNATTENDED-
const TAG = process.argv[2] || "NIGHT-RUN-20261001";
const OUT = path.join("tasks/results", TAG, "image-placement-map.html");
const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---- 库中实际存在的表 ----
const dbTables = await queryRows(`select table_name from information_schema.tables where table_schema='public'`);
const has = (t) => dbTables.some((r) => r.table_name === t);
const colsOf = async (t) => (await queryRows(`select column_name from information_schema.columns where table_name=:'t'`, { t })).map((c) => c.column_name);
const vaCols = await colsOf("visual_assets");
const srCols = await colsOf("source_records");
const evCols = await colsOf("evidence");

// ---- 宪法归位模型：每张图片应归的数据表 ----
// 依据：C3 §2（分层）· §5.3（Visual Asset 字段组）· §6.1（visual schema = visual_asset + visual_link）· §4.1（RAW/CANDIDATE/晋级）· T07 §1.3（分层写入权限）
const model = [
  { layer: "L0 Source", schema: "source", table: "source_record", role: "这张图的<b>来源身份</b>：谁提供的、从哪个 URI 来、什么许可、checksum",
    fields: "provider, source_uri/title, license_code, checksum, retrieved_at", req: "必填", night: "可写（append-only）" },
  { layer: "L0 Source", schema: "source", table: "raw_item", role: "这张图的<b>原始材料本体</b>（原始字节 / 原始 API 响应），不可覆盖不可删",
    fields: "source_version_id, raw_type=image, raw_payload/original_locator", req: "必填", night: "可写（append-only）" },
  { layer: "L2 visual", schema: "visual", table: "visual_asset", role: "<b>图片对象本身</b>：身份/时间分离/权利/溯源（C3 §5.3）",
    fields: "asset_type, file_path, created_date + depicted_period（分离）, rights/license/usage_scope, checksum, source_id", req: "必填", night: "可写（Visual Candidate）" },
  { layer: "L2 visual", schema: "visual", table: "visual_link", role: "图片的<b>归属关联</b>：这张图属于哪个实体/事件/地点（C3 §6.1 与 visual_asset 并列）",
    fields: "visual_asset_id, target_type(entity/event/place), target_id, link_type", req: "必填（§6.1）", night: "可写（候选）" },
  { layer: "L1 Evidence", schema: "evidence", table: "evidence_fragment", role: "仅当<b>这张图支持某个 Claim</b>时：以 locator + <code>media_region</code> 引用图中区域",
    fields: "source_id, locator, quote_or_extract, <b>media_region</b>, evidence_type", req: "按 Claim 需要", night: "可写（须 locator；AI 文字不得当证据）" },
  { layer: "spatial", schema: "spatial", table: "spatial_anchor / modern_location", role: "图片<b>拍摄/描绘地点</b>的空间对应（§5.3 correspondence_type / anchor_refs 指向它）",
    fields: "coord_system, lat/lng, anchor_kind, historical_position_proof", req: "有条件", night: "可写（现代点不得当历史证明）" },
  { layer: "评审", schema: "governance", table: "review_queue", role: "授权不明 / 时间不明 / 死链 → 进人工裁决，不晋级",
    fields: "object_type, object_id, review_tier, reason_code", req: "条件触发", night: "可写（HOLD）" },
];

// ---- 真实实例 ----
const s1 = await queryRows(`select file_path, rights, created_date, depicted_period, legacy_id, checksum from visual_assets where rights like 'CC%' and created_date is not null limit 1`);
const s2 = await queryRows(`select file_path, rights, created_date, depicted_period, legacy_id, checksum from visual_assets where rights like '%待确认%' limit 1`);
const verified = JSON.parse(fs.readFileSync(path.join(FETCHED, "shanghai_images_verified_20260905.json"), "utf8"));
const badItem = (verified.items || []).find((i) => i._http && i._http.status && i._http.status !== 200);
const samples = [
  { tag: "① 合规样本（真实 license + 有拍摄时间）", cls: "ok", r: s1[0] || null },
  { tag: "② 授权待确认样本（占位授权）", cls: "warn", r: s2[0] || null },
  { tag: "③ 死链样本（HTTP 非 200，本应拒绝入库）", cls: "bad", r: badItem ? { file_path: badItem.url, rights: "—", created_date: null, depicted_period: "—", legacy_id: "—", checksum: "—" } : null },
];

const status = (t) => has(t) ? `<span class="yes">✓ 已存在</span>` : `<span class="no">✗ 缺失</span>`;
const hasF = (c, f) => c.includes(f) ? `<span class="yes">✓</span>` : `<span class="no">✗</span>`;

const html = `<!doctype html><meta charset="utf-8"><title>图像原始资料 · 宪法归位模型</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#f6f7f9;color:#1a1d21}
.wrap{max-width:1200px;margin:0 auto;padding:28px}
h1{font-size:23px;margin:0 0 6px}h2{font-size:17px;margin:30px 0 12px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:18px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:8px}
th{background:#f1f3f6;text-align:left;padding:10px}td{padding:9px 10px;border-top:1px solid #eef0f3;vertical-align:top}
tr:hover td{background:#fafbfc}
.yes{color:#16a34a;font-weight:600}.no{color:#dc2626;font-weight:600}.warn{color:#b45309;font-weight:600}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
.flow{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch;margin:14px 0}
.box{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;flex:1;min-width:190px}
.box .l{font-size:11px;color:#fff;background:#2f6fed;border-radius:4px;padding:2px 7px;display:inline-block;margin-bottom:7px}
.box .t{font-weight:700;font-size:14px;margin-bottom:5px}
.box .d{font-size:12px;color:#4b5563;line-height:1.6}
.box .p{font-size:11px;color:#6b7280;margin-top:7px;border-top:1px dashed #e5e7eb;padding-top:6px}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin-top:10px}
.ok{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8}
.bad{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8}
.inst{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:12px}
.inst h3{font-size:14px;margin:0 0 4px}.inst .u{font-size:11px;color:#6b7280;word-break:break-all;margin-bottom:10px}
.kv{display:grid;grid-template-columns:150px 1fr;gap:6px;font-size:12px}
.kv .k{color:#6b7280}
img.th{width:120px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;float:right;margin-left:12px}
</style>
<div class="wrap">
<h1>图像原始资料 · 宪法归位模型</h1>
<div class="sub">依据：C3 §2 分层（L0 Source / L1 Evidence / L2 Cultural World）· §5.3 Visual Asset 字段组 · §6.1 visual schema（<code>visual_asset</code> + <code>visual_link</code>）· §4.1 RAW→CANDIDATE→ADJUDICATED→PUBLISHED · T07 §1.3 分层写入权限</div>

<h2>一、一张图从"原始资料"到"世界对象"的归位流程</h2>
<div class="flow">
<div class="box"><span class="l">L0 Source</span><div class="t">source_record</div><div class="d">登记来源身份：provider、URI、许可、checksum</div><div class="p">夜间可写 · append-only</div></div>
<div class="box"><span class="l">L0 Source</span><div class="t">raw_item</div><div class="d">保存原始字节/原始响应，禁止覆盖删除</div><div class="p">夜间可写 · append-only</div></div>
<div class="box"><span class="l">L2 visual</span><div class="t">visual_asset</div><div class="d"><b>图片本身</b>：身份/时间分离/权利/溯源</div><div class="p">夜间可写 · <b>Visual Candidate</b></div></div>
<div class="box"><span class="l">L2 visual</span><div class="t">visual_link</div><div class="d">归属：属于哪个实体/事件/地点</div><div class="p">夜间可写 · 候选</div></div>
<div class="box"><span class="l">L1 Evidence</span><div class="t">evidence_fragment</div><div class="d">仅当支持 Claim：locator + <code>media_region</code></div><div class="p">须 locator · AI 文字不得当证据</div></div>
<div class="box"><span class="l">spatial</span><div class="t">spatial_anchor</div><div class="d">拍摄/描绘地点的空间对应</div><div class="p">现代点不得当历史证明</div></div>
</div>
<div class="note"><b>关键宪法约束：</b>图片在 <code>visual_assets</code> 中的身份是 <b>Visual Candidate</b>（T07 §1.3 明确列入候选池），<b>不是事实层</b>；
只有经 Evidence + Human Review 才能沿 §4.1 的 RAW → CANDIDATE → ADJUDICATED → RUNTIME_ELIGIBLE → PUBLISHED 晋级。
<b>授权不明（741 条）与时间不明（756 条）的图，宪法上应停在 CANDIDATE 并进 review_queue，不得进体验层。</b></div>

<h2>二、每张图片应归的数据表（核心）</h2>
<table>
<tr><th>层</th><th>schema</th><th>数据表</th><th>这张图在里面承担什么</th><th>关键字段</th><th>必填</th><th>库中现状</th><th>夜间可写</th></tr>
${model.map((m) => {
  const tn = m.table.split(" / ")[0];
  const ex = m.table.includes(" / ") ? (has(tn) || has(m.table.split(" / ")[1]) ? `<span class="yes">✓ 部分存在</span>` : `<span class="no">✗ 缺失</span>`) : status(tn);
  return `<tr><td>${m.layer}</td><td><code>${m.schema}</code></td><td><code>${m.table}</code></td><td>${m.role}</td><td style="font-size:12px">${m.fields}</td><td>${m.req}</td><td>${ex}</td><td style="font-size:12px">${m.night}</td></tr>`;
}).join("")}
</table>
<div class="note"><b>读法：</b>一张图不是"存一张表"，而是<b>同时落 4–5 张表</b>：
<code>source_record</code>（谁给的）+ <code>raw_item</code>（原件）+ <code>visual_asset</code>（<b>图片本身</b>）+ <code>visual_link</code>（属于谁）+ 按需 <code>evidence_fragment</code>（支持什么结论）。
其中 <code>visual_asset</code> 是"图片本身"的唯一归位；<code>visual_link</code> 是宪法 §6.1 并列要求的归属表，<b>当前库里没有</b> —— 这正是"图片无法归属"的根因。</div>

<h2>三、C3 §5.3 Visual Asset 字段组 vs 现有 visual_assets 列</h2>
<table><tr><th>字段组</th><th>宪法字段</th><th>库中列</th><th>状态</th></tr>
<tr><td>身份</td><td>id / media_type / title / provider / source_id</td><td>asset_id ${hasF(vaCols, "asset_id")} · asset_type ${hasF(vaCols, "asset_type")} · title ${hasF(vaCols, "title")} · provider ${hasF(vaCols, "provider")} · source_id ${hasF(vaCols, "source_id")}</td><td class="warn">缺 title/provider</td></tr>
<tr><td>时间</td><td>creation_date 与 depicted_period <b>分离</b></td><td>created_date ${hasF(vaCols, "created_date")} · depicted_period ${hasF(vaCols, "depicted_period")}</td><td class="yes">✓ 已分离（但值缺失多）</td></tr>
<tr><td>内容关联</td><td>entity_refs / event_refs / place_refs</td><td>均无 ${hasF(vaCols, "entity_refs")}</td><td class="no">✗ 整组缺失</td></tr>
<tr><td>空间对应</td><td>correspondence_type / anchor_refs</td><td>均无 ${hasF(vaCols, "correspondence_type")}</td><td class="no">✗ 整组缺失</td></tr>
<tr><td>权利</td><td>rights / license / usage_scope</td><td>rights ${hasF(vaCols, "rights")} · license ${hasF(vaCols, "license")} · usage_scope ${hasF(vaCols, "usage_scope")}</td><td class="no">缺 license/usage_scope</td></tr>
<tr><td>溯源</td><td>checksum / quality_score / legacy_id</td><td>${hasF(vaCols, "checksum")} ${hasF(vaCols, "quality_score")} ${hasF(vaCols, "legacy_id")}</td><td class="yes">✓</td></tr>
</table>

<h2>四、真实图片实例 · 逐表展开</h2>
${samples.map((s) => {
  if (!s.r) return "";
  const r = s.r;
  return `<div class="inst">
  <h3>${s.tag}</h3>
  <img class="th" src="${esc(r.file_path)}" onerror="this.style.display='none'">
  <div class="u">${esc(r.file_path)}</div>
  <table><tr><th>应归表</th><th>该实例应写的内容</th><th>宪法判定</th></tr>
  <tr><td><code>source_record</code></td><td>provider=<b>${/library\.sh\.cn/.test(r.file_path) ? "上海图书馆开放数据" : "Wikimedia Commons"}</b>；source_uri=上图/Commons 原址；license_code=${esc(r.rights)}；checksum=${esc(String(r.checksum || "").slice(0, 16))}…</td><td>${/待确认|—/.test(String(r.rights)) ? `<span class="warn">△ 授权不明 → 需 HOLD</span>` : `<span class="yes">✓ 可入 L0</span>`}</td></tr>
  <tr><td><code>raw_item</code></td><td>raw_type=<b>image</b>；original_locator=上图/Commons 原始 URL；原始字节存 Raw 区（append-only）</td><td><span class="yes">✓ 必存</span></td></tr>
  <tr><td><code>visual_asset</code></td><td>asset_type=image；file_path=见上；created_date=<b>${esc(r.created_date || "缺失")}</b>；depicted_period=<b>${esc(r.depicted_period || "缺失")}</b>；rights=${esc(r.rights)}</td><td>${r.created_date ? `<span class="yes">✓ 时间齐</span>` : `<span class="warn">△ 时间缺失 → 不得断代为史料</span>`}</td></tr>
  <tr><td><code>visual_link</code></td><td>target_type=<b>place/entity</b>（源数据 town_hint 可给出）+ target_id</td><td class="no">✗ 表不存在，无法归属</td></tr>
  <tr><td><code>evidence_fragment</code></td><td>仅当该图支持某 Claim：locator=图 URI，<code>media_region</code>=图中区域，quote=图中可辨内容</td><td><span class="warn">△ 按需；AI 描述不得当证据</span></td></tr>
  <tr><td><code>review_queue</code></td><td>${/待确认/.test(String(r.rights)) ? "reason_code=<b>RIGHTS_UNCLEAR</b>（授权占位）" : /^—/.test(String(r.rights)) ? "reason_code=<b>MISSING_LICENSE / HTTP_FAILED</b>" : "无需（授权与时间明确）"}</td><td>${/待确认|^—/.test(String(r.rights)) ? `<span class="warn">△ 应 HOLD，不晋级</span>` : `<span class="yes">✓ 可晋级流程</span>`}</td></tr>
  </table></div>`;
}).join("")}
<div class="${"bad"}"><b>③ 死链为何是归位错误：</b>它本应在 L0 入口被 <code>HTTP/FETCH_FAILED</code> 拦下（连 <code>raw_item</code> 都不该进），
我却让它一路落到了 <code>visual_asset</code>。按宪法它应<b>停在 Source 入口之外</b>，或在 <code>review_queue</code> 标记 REJECT —— 现在需要按 URL 精确剔除。</div>

<h2>五、结论：应有 vs 现有</h2>
<table><tr><th>应归表</th><th>应有</th><th>现有</th><th>缺口处置</th></tr>
<tr><td><code>source_record</code></td><td>每张图一条来源身份</td><td>${has("source_records") ? `<span class="yes">✓ 有</span>（但 1288 张图共用 1 条粗粒度 legacy 源）` : `<span class="no">✗</span>`}</td><td>需按 provider/URI 细化到每条</td></tr>
<tr><td><code>raw_item</code></td><td>原始字节存 Raw 区</td><td><span class="warn">△ 以文件系统快照代替（可接受，但无表级索引）</span></td><td>建议补 raw 索引表</td></tr>
<tr><td><code>visual_asset</code></td><td><b>图片本身</b>（C3 §5.3 全字段）</td><td class="yes">✓ 有</td><td>缺 9 字段：title/provider/license/usage_scope/entity_refs/event_refs/place_refs/correspondence_type/anchor_refs</td></tr>
<tr><td><code>visual_link</code></td><td>归属关联（§6.1 并列要求）</td><td class="no">✗ 无此表</td><td><b>需新建</b>（DDL 须你授权）</td></tr>
<tr><td><code>evidence_fragment</code></td><td>按需，含 media_region</td><td>${has("evidence") ? `<span class="yes">✓ evidence 表在</span>（无 media_region 列）` : `<span class="no">✗</span>`}</td><td>图片作证时需补 media_region</td></tr>
<tr><td><code>spatial_anchor</code></td><td>空间对应</td><td>${has("historical_feature_anchors") ? `<span class="yes">✓ 有 ${await queryValue(`select count(*) from historical_feature_anchors`)} 锚点</span>` : `<span class="no">✗</span>`}</td><td>未与图片建立对应</td></tr>
</table>
</div>`;

fs.writeFileSync(OUT, html, "utf8");
console.log("written " + OUT);
