// scripts/gen-l0-schema-map.mjs
// 宪法 C3 §2.1 L0 Cultural Sources 四表 · 图像场景可视化（应有字段 vs 库内现状 + 实例取值）
import fs from "node:fs";
import path from "node:path";
import { queryRows, queryValue } from "../packages/data-access/src/index.mjs";

// 默认批次＝ 2026-10-01 历史轮（Trace，目录名不改）；自 2026-10-02 起新批次 TAG 前缀为 UNATTENDED-
const TAG = process.argv[2] || "NIGHT-RUN-20261001";
const OUT = path.join("tasks/results", TAG, "l0-schema-map.html");
const FETCHED = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const tables = await queryRows(`select table_name from information_schema.tables where table_schema='public'`);
const has = (t) => tables.some((r) => r.table_name === t);
const cols = async (t) => has(t) ? (await queryRows(`select column_name from information_schema.columns where table_name=:'t'`, { t })).map((c) => c.column_name) : [];
const srCols = await cols("source_records");
const irCols = await cols("ingest_runs");
const svCols = await cols("source_version");
const riCols = await cols("raw_item");
const ck = (c, f) => c.includes(f) ? `<span class="yes">✓ ${f}</span>` : `<span class="no">✗ 缺 ${f}</span>`;

// 实例：一张 Commons 图 + 一张上图图
const commons = JSON.parse(fs.readFileSync(path.join(FETCHED, "commons_images.json"), "utf8")).images || [];
const cm = commons.find((x) => x.license && x.title) || commons[0];
const census = JSON.parse(fs.readFileSync(path.join(FETCHED, "shanghai_images_census_20260905.json"), "utf8")).items || [];
const ce = census.find((x) => x.town_hint) || census[0];
const nSR = await queryValue(`select count(*) from source_records`);
const nIR = await queryValue(`select count(*) from ingest_runs`);

const tbl = (name, duty, exist, rows, note) => `
<h2>${name} ${exist ? `<span class="tag ok">库中已存在</span>` : `<span class="tag no">库中缺失</span>`}</h2>
<div class="sub2">${duty}</div>
<table><tr><th>宪法核心字段（C3 §2.1）</th><th>图像场景下应填什么</th><th>库内现状</th></tr>
${rows}
</table>
${note || ""}`;

const html = `<!doctype html><meta charset="utf-8"><title>L0 Source 层 · 宪法数据表设计（图像）</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#f6f7f9;color:#1a1d21}
.wrap{max-width:1180px;margin:0 auto;padding:26px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:26px 0 6px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:16px;line-height:1.7}
.sub2{color:#4b5563;font-size:13px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
th{background:#f1f3f6;text-align:left;padding:9px 10px}td{padding:8px 10px;border-top:1px solid #eef0f3;vertical-align:top}
tr:hover td{background:#fafbfc}
.yes{color:#16a34a;font-weight:600}.no{color:#dc2626;font-weight:600}.warn{color:#b45309;font-weight:600}
.tag{font-size:11px;padding:2px 9px;border-radius:12px;font-weight:600;vertical-align:middle}
.tag.ok{background:#dcfce7;color:#15803d}.tag.no{background:#fee2e2;color:#b91c1c}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
.chain{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:16px 0}
.node{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;flex:1;min-width:170px}
.node .t{font-weight:700;font-size:14px;margin-bottom:4px}.node .d{font-size:12px;color:#4b5563;line-height:1.6}
.arrow{font-size:20px;color:#9ca3af}
.bad{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin:10px 0}
.ok{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin:10px 0}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;margin:10px 0}
.ex{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px;margin:10px 0;font-size:12px}
.ex b{color:#2f6fed}
</style>
<div class="wrap">
<h1>L0 Source 层 · 宪法数据表设计（图像场景）</h1>
<div class="sub">依据 <b>C3 §2.1 L0 · Cultural Sources</b>：Source 层保存<b>「材料本身」</b>和<b>「来源身份」</b>，不直接等同于历史事实。
上图开放数据、古籍/方志、档案、论文、文保资料、<b>历史地图、老照片</b>、现代地图与现场观察都可进入 Source，但权威性、观察位置和可表达范围不同。<br>
宪法定义 L0 为 <b>4 个对象</b>：source_record → source_version → raw_item（材料链）+ ingestion_run（过程记录）。</div>

<h2>一、L0 材料链（宪法设计）</h2>
<div class="chain">
<div class="node"><div class="t">source_record</div><div class="d"><b>来源主记录</b><br>这张图"是谁、从哪来"</div></div>
<div class="arrow">→</div>
<div class="node"><div class="t">source_version</div><div class="d"><b>来源版本/抓取版本</b><br>这一版什么时候抓的、校验值</div></div>
<div class="arrow">→</div>
<div class="node"><div class="t">raw_item</div><div class="d"><b>原始材料本体</b><br>图像字节 raw_payload + 原址</div></div>
<div class="arrow">＋</div>
<div class="node"><div class="t">ingestion_run</div><div class="d"><b>采集/解析过程</b><br>谁跑的、参数、结果、错误</div></div>
</div>

${tbl("① source_record（来源主记录）", "职责：来源身份主记录。图像场景下 = 「这张图由谁提供、从哪个 URI 来、什么许可」。", has("source_records"), `
<tr><td><code>id</code></td><td>该图来源记录主键</td><td>${ck(srCols, "source_id")}</td></tr>
<tr><td><code>source_type</code></td><td><b>image</b>（照片/舆图/扫描件）</td><td>${ck(srCols, "provider")} <span class="warn">（用 provider 近似，无类型枚举）</span></td></tr>
<tr><td><code>title</code></td><td>图片标题（Commons 有 437 条 / 上图 198 条）</td><td>${ck(srCols, "title")}</td></tr>
<tr><td><code>creator</code></td><td>摄影者/绘制者（Commons artist）</td><td>${ck(srCols, "creator")}</td></tr>
<tr><td><code>publisher / institution</code></td><td>上海图书馆 / Wikimedia Commons</td><td>${ck(srCols, "provider")}</td></tr>
<tr><td><code>date</code></td><td>图片创作/发布日期</td><td>${ck(srCols, "source_date")}</td></tr>
<tr><td><code>url / catalog_no</code></td><td>原图 URI 或馆藏号</td><td>${ck(srCols, "raw_path")} <span class="warn">（只有 raw_path，无 source_url/catalog_no）</span></td></tr>
<tr><td><code>rights</code></td><td>CC BY-SA 4.0 / Public domain / 待确认</td><td>${ck(srCols, "license_code")}</td></tr>
<tr><td><code>provenance_status</code></td><td>溯源状态（已抓取/已校验/授权待确认）</td><td>${ck(srCols, "provenance_status")}</td></tr>
`, `<div class="ex"><b>实例取值（Commons）：</b>title=<code>${esc(cm?.title || "—")}</code> · creator=<code>${esc(cm?.artist || "—")}</code> · publisher=<code>Wikimedia Commons</code> · date=<code>${esc(cm?.date || "—")}</code> · rights=<code>${esc(cm?.license || "—")}</code> · url=<code>${esc(String(cm?.url || "").slice(0, 60))}…</code></div>
<div class="note"><b>现状问题：</b>库里 ${nSR} 条 source_record 是<b>按"文件"建的</b>（一个 JSON 一条），
而宪法要求<b>按"来源"建</b> —— 1288 张图目前共用 1 条粗粒度 legacy 源记录，<b>没有各自的来源身份</b>。</div>`)}

${tbl("② source_version（来源版本/抓取版本）", "职责：同一来源的不同抓取版本，保证可回溯「当时抓到的是什么」。", has("source_version"), `
<tr><td><code>source_id</code></td><td>指向 source_record</td><td>${has("source_version") ? ck(svCols, "source_id") : `<span class="no">✗ 无此表</span>`}</td></tr>
<tr><td><code>version_no</code></td><td>第几版抓取</td><td>${has("source_version") ? ck(svCols, "version_no") : `<span class="no">✗ 无此表</span>`}</td></tr>
<tr><td><code>captured_at</code></td><td>抓取时间</td><td>${has("source_version") ? ck(svCols, "captured_at") : `<span class="no">✗ 无此表</span>`}</td></tr>
<tr><td><code>checksum</code></td><td>该版本内容校验值</td><td>${has("source_version") ? ck(svCols, "checksum") : `<span class="no">✗ 无此表</span>`}</td></tr>
<tr><td><code>storage_ref</code></td><td>存储位置引用</td><td>${has("source_version") ? ck(svCols, "storage_ref") : `<span class="no">✗ 无此表</span>`}</td></tr>
`, `<div class="bad"><b>整表缺失。</b>目前无法回答"这张图是哪一版抓的、内容有没有变过"。
checksum 虽写在 <code>source_records</code> 上，但那是<b>元数据文件的 checksum</b>，不是图片字节的 checksum。</div>`)}

${tbl("③ raw_item（原始材料本体）", "职责：保存原始文本/图像/结构化记录 —— <b>图片字节就应存在这里</b>。", has("raw_item"), `
<tr><td><code>source_version_id</code></td><td>指向抓取版本</td><td>${has("raw_item") ? ck(riCols, "source_version_id") : `<span class="no">✗ 无此表</span>`}</td></tr>
<tr><td><code>raw_type</code></td><td><b>image</b></td><td>${has("raw_item") ? ck(riCols, "raw_type") : `<span class="no">✗ 无此表</span>`}</td></tr>
<tr><td><code>raw_payload</code></td><td><b>图像原始字节</b>（本体）</td><td>${has("raw_item") ? ck(riCols, "raw_payload") : `<span class="no">✗ 无此表</span>`}</td></tr>
<tr><td><code>original_locator</code></td><td>原始 URL / 馆藏定位</td><td>${has("raw_item") ? ck(riCols, "original_locator") : `<span class="no">✗ 无此表</span>`}</td></tr>
`, `<div class="bad"><b>整表缺失 —— 这是当前 L0 最大的洞。</b>
1288 张图的 <code>file_path</code> 全是远程 URL，<b>原始字节从未下载</b>。
本地 <code>D:\\MoHen\\data\\raw\\legacy\\hushang\\</code> 只有 57 个 JSON 元数据文件，没有一张图。
按宪法，图像作为"材料本身"必须有 <code>raw_payload</code>；<b>目前只有 locator，没有 payload —— 链接失效即永久丢失。</b></div>
<div class="ex"><b>实例取值（上图）：</b>raw_type=<code>image</code> · original_locator=<code>${esc(String(ce?.url || "").slice(0, 62))}…</code> · raw_payload=<span class="no">未落盘</span></div>`)}

${tbl("④ ingestion_run（采集/解析过程）", "职责：一次采集/解析过程的留痕，可回溯「谁跑的、什么参数、结果如何」。", has("ingest_runs"), `
<tr><td><code>skill_id</code></td><td>执行的 skill/pipeline 名</td><td>${ck(irCols, "pipeline_name")} <span class="warn">（字段名为 pipeline_name）</span></td></tr>
<tr><td><code>started_at</code></td><td>开始时间</td><td>${ck(irCols, "started_at")}</td></tr>
<tr><td><code>params</code></td><td>运行参数（来源、范围）</td><td>${ck(irCols, "source_scope")} <span class="warn">（仅有 source_scope）</span></td></tr>
<tr><td><code>result</code></td><td>结果计数</td><td>${ck(irCols, "status")} · ${ck(irCols, "input_count")} · ${ck(irCols, "candidate_count")}</td></tr>
<tr><td><code>errors</code></td><td>错误计数</td><td>${ck(irCols, "error_count")}</td></tr>
`, `<div class="ok">这张<b>基本可用</b>：库内 ${nIR} 条 ingest_run，昨晚每批都有留痕，可回滚。</div>`)}

<h2>二、图像在 L0 的完整落位（一张图 = 4 处记录）</h2>
<table><tr><th>步骤</th><th>表</th><th>写入内容</th><th>当前是否做到</th></tr>
<tr><td>1</td><td><code>source_record</code></td><td>建/复用该图的来源身份（provider、URI、rights）</td><td class="warn">△ 共用 1 条粗粒度源，未逐图建</td></tr>
<tr><td>2</td><td><code>source_version</code></td><td>记录本次抓取版本 + checksum + captured_at</td><td class="no">✗ 无表</td></tr>
<tr><td>3</td><td><code>raw_item</code></td><td><b>下载并保存图像字节</b> + original_locator</td><td class="no">✗ 无表且未下载</td></tr>
<tr><td>4</td><td><code>ingestion_run</code></td><td>本次采集过程留痕</td><td class="yes">✓ 已有</td></tr>
</table>

<h2>三、缺口汇总</h2>
<table><tr><th>缺口</th><th>性质</th><th>影响</th><th>需你授权</th></tr>
<tr><td><code>source_version</code> 表不存在</td><td>DDL</td><td>无法回溯"哪一版抓的"</td><td>需授权建表</td></tr>
<tr><td><code>raw_item</code> 表不存在</td><td>DDL</td><td><b>图像原件无处存放（当前完全未落盘）</b></td><td>需授权建表</td></tr>
<tr><td>图片字节未下载</td><td>数据</td><td><b>链接失效即永久丢失</b></td><td>需授权批量抓取</td></tr>
<tr><td>source_record 未按图建</td><td>数据</td><td>1288 图共用 1 条源，无法逐图溯源</td><td>需授权批量写入</td></tr>
<tr><td>缺 <code>provenance_status</code></td><td>DDL（加列）</td><td>无法标记"授权待确认/已校验"</td><td>需授权加列</td></tr>
</table>
</div>`;

fs.writeFileSync(OUT, html, "utf8");
console.log("written " + OUT);
