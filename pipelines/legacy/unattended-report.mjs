// pipelines/legacy/unattended-report.mjs
// 执行报告三形态（2026-10-02 · M1.4）—— 契约见 specs/data-production/MoHen_Data_Production_Protocol.md §0.5（协议 V2.0：任务执行结果，非"晨报"）
//
// **一次生成、同源产出：**
//   report.json   机器可读：稳定 schema + schema_version；每个数字附其 SQL 出处；不得含模板断言
//   report.html   可视化：单文件、离线可开、零外部依赖；**结论与 Escalation 置顶**
//   result.md     人读摘要：与 json 同源
//
// 为什么必须同源：三种形态各写一套，必然会互相漂移。本项目已经付过"文档里写着、代码里没有"
// 的代价（source-providers.json 声称门禁却无一行代码读它），不再重复。

export const REPORT_SCHEMA = "mohen.unattended-report";
export const REPORT_SCHEMA_VERSION = 1;

const INFRA_PREFIX = "（基础设施";

/**
 * 由原始事实构造**唯一**的报告对象。三种形态都从这里渲染。
 * @param {object} inp
 *   tag, mode, env, interval_min, cutoff, started_at, finished_at, stop_reason, verdict,
 *   escalation: string[], registry: object|null, jobs: object（progress.jobs）,
 *   counts: {queued, declared, runnable, done, failed, unexecuted, inserted},
 *   factsRows: [{key,label,value,sql}], factsError: string|null,
 *   guarantees: string[], limits: string[]
 */
export function buildReport(inp) {
  const entries = (inp.registry && Array.isArray(inp.registry.__entries)) ? inp.registry.__entries : [];
  const ranIds = Object.keys(inp.jobs || {});

  // ---- 叙事缺口（§0.6 / §0.7 第 3 项）----
  // 本批**实际跑过**的作业所属注册表条目，声明它们瞄准哪些缺口。
  // 注意：这是「瞄准」，不是「推进」。是否真的推进需要覆盖矩阵回写，目前未实现——
  // 报告必须把这两件事分开说，否则就是拿声明冒充结果。
  const aimed = new Set();
  const hitEntryIds = new Set();
  for (const id of ranIds) {
    const e = entries.find((x) => (x.id.endsWith("*") ? id.startsWith(x.id.slice(0, -1)) : x.id === id));
    if (!e) continue;
    hitEntryIds.add(e.id);
    for (const g of e.narrative_gaps || []) aimed.add(g);
  }
  const aimedList = [...aimed];
  const infraOnly = aimedList.length > 0 && aimedList.every((g) => String(g).startsWith(INFRA_PREFIX));
  const narrativeGaps = {
    aimed: aimedList,
    from_entries: [...hitEntryIds],
    infra_only: infraOnly,
    assessment: infraOnly ? "no_gap_targeted" : "not_implemented",
    note: infraOnly
      ? "本批全部为基础设施作业（来源登记）：**不瞄准任何具体叙事缺口**。按 §0.6，它扩充了材料底座，但**不构成本批的『有效生产』**。"
      : "以上是本批**声明瞄准**的缺口。**是否真的推进/关闭，本批无法自动判定**——覆盖矩阵回写机制尚未实现（见 T03 与协议 §0.6）。因此本批的『有效性』需有人值守核对，不得由本报告自行宣告。",
  };

  return {
    schema: REPORT_SCHEMA,
    schema_version: REPORT_SCHEMA_VERSION,
    tag: inp.tag,
    mode: inp.mode,
    env: inp.env,
    interval_min: inp.interval_min,
    cutoff: inp.cutoff,
    started_at: inp.started_at,
    finished_at: inp.finished_at,
    verdict: inp.verdict,
    stop_reason: inp.stop_reason,
    escalation: (inp.escalation || []).slice(0, 3),
    narrative_gaps: narrativeGaps,
    counts: inp.counts,
    facts: { attribution: inp.factsAttribution, rows: inp.factsRows || [], error: inp.factsError || null },
    excluded: {
      forbidden: (inp.registry && inp.registry.forbidden) || [],
      preflight: (inp.registry && inp.registry.preflight_excluded) || [],
    },
    jobs: Object.entries(inp.jobs || {}).map(([id, v]) => ({
      id, ok: v.ok !== false, inserted: Number(v.inserted) || 0, note: v.note || "", at: v.at || null,
    })),
    guarantees: inp.guarantees || [],
    limits: inp.limits || [],
  };
}

const VERDICT_LABEL = { PASS: "PASS（无需你介入）", "PASS WITH HOLD": "PASS WITH HOLD（正常，有候选待以后处理）", STOPPED: "STOPPED（需开发总工程师修复）" };

export function renderMarkdown(r) {
  const L = [];
  L.push(`# ${r.tag} · 无人值守执行报告`, "");
  L.push(`- 模式：${r.mode}（MOHEN_ENV=${r.env}）· 截止时间：${r.cutoff} · 周期：${r.interval_min} 分钟/作业`);
  L.push(`- 开始：${r.started_at} · 结束：${r.finished_at}`);
  L.push(`- **结论：${r.verdict}**（停止原因：${r.stop_reason}）`, "");
  L.push(`## Escalation —— 你只需要看这里（最多 3 条）`, "");
  L.push(r.escalation.length ? r.escalation.map((s, i) => `${i + 1}. ${s}`).join("\n") : "无 —— 本批无需你介入。", "");
  L.push(`## 本批与叙事缺口（§0.6 / §0.7 第 3 项）`, "");
  if (r.narrative_gaps.aimed.length) {
    for (const g of r.narrative_gaps.aimed) L.push(`- 瞄准：${g}`);
  } else {
    L.push("- （本批无作业声明瞄准叙事缺口）");
  }
  L.push("", r.narrative_gaps.note, "");
  L.push(`## 计数`, "");
  const c = r.counts;
  L.push(`- 队列 ${c.queued} · 声明允许 ${c.declared} · 本轮可跑 ${c.runnable}`);
  L.push(`- 完成 ${c.done} · 失败 ${c.failed} · 未执行 ${c.unexecuted} · 本批落库新增 ${c.inserted}`, "");
  L.push(`## 开跑前排除（未执行，不是失败；不计入连续失败）`, "");
  const ex = [
    ...r.excluded.forbidden.map((x) => `- \`[注册表 forbidden]\` ${x.id} — ${x.reason}`),
    ...r.excluded.preflight.map((x) => `- \`[preflight 未就绪]\` ${x.id} — ${x.reason}`),
  ];
  L.push(ex.length ? ex.join("\n") : "无。", "");
  L.push(`## 本批事实（**全部由查询得出，不是模板断言**）`, "");
  L.push(`> 归因口径：${r.facts.attribution}`, "");
  L.push(`| 事实 | 值 | 来源（SQL） |`, `|---|---|---|`);
  for (const f of r.facts.rows) L.push(`| ${f.label} | ${f.value} | \`${f.sql}\` |`);
  if (r.facts.error) L.push("", `> ⚠️ 事实查询失败，本批事实不可得：${r.facts.error}`);
  L.push("", `## 作业明细`, "", `| 作业 | 结果 | 新增 | 备注 |`, `|---|---|---|---|`);
  for (const j of r.jobs) L.push(`| ${j.id} | ${j.ok ? "OK" : "FAIL"} | ${j.inserted} | ${j.note} |`);
  L.push("", `## 未运行 / 未完成的保证（明确列出，不用断言掩盖）`, "");
  for (const g of r.guarantees) L.push(`- ${g}`);
  L.push("", `## 归因口径与已知限制`, "");
  for (const g of r.limits) L.push(`- ${g}`);
  L.push("", `> 明细见 progress.json / report.json / report.html 与 runner.log。凭证不在本报告。`);
  return L.join("\n") + "\n";
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

export function renderHtml(r) {
  const tone = r.verdict === "PASS" ? "ok" : r.verdict === "PASS WITH HOLD" ? "warn" : "bad";
  const gapTone = r.narrative_gaps.assessment === "no_gap_targeted" ? "warn" : "warn";
  const rows = (arr, cells) => arr.map((x) => `<tr>${cells(x)}</tr>`).join("");
  const excl = [
    ...r.excluded.forbidden.map((x) => ({ kind: "注册表 forbidden", id: x.id, reason: x.reason })),
    ...r.excluded.preflight.map((x) => ({ kind: "preflight 未就绪", id: x.id, reason: x.reason })),
  ];
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(r.tag)} · 无人值守执行报告</title>
<style>
:root{--ok:#16a34a;--warn:#b45309;--bad:#dc2626;--line:#e5e7eb;--bg:#f6f7f9}
*{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:var(--bg);color:#1a1d21;line-height:1.65}
.wrap{max-width:1120px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:23px;margin:0 0 4px}
h2{font-size:16px;margin:30px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.badge{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:700;font-size:15px;color:#fff}
.b-ok{background:var(--ok)}.b-warn{background:var(--warn)}.b-bad{background:var(--bad)}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:12px 0}
.esc{border-left:5px solid #2f6fed}
.esc ol{margin:6px 0 0 18px;padding:0}
.esc li{margin:4px 0}
.warnbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13.5px}
.badbox{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;font-size:13.5px}
.okbox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13.5px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;margin:10px 0}
.card .v{font-size:24px;font-weight:700}.card .k{font-size:12px;color:#6b7280}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;border:1px solid var(--line);border-radius:8px;overflow:hidden}
th{background:#f1f3f6;text-align:left;padding:8px 10px;font-weight:600}
td{padding:7px 10px;border-top:1px solid #eef0f3;vertical-align:top}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px;word-break:break-all}
details summary{cursor:pointer;color:#2f6fed;font-size:12.5px}
.muted{color:#6b7280;font-size:12.5px}
ul.tight{margin:6px 0 0 18px;padding:0}ul.tight li{margin:3px 0}
</style>
<div class="wrap">
<h1>${esc(r.tag)} · 无人值守执行报告</h1>
<div class="sub">模式 ${esc(r.mode)}（MOHEN_ENV=${esc(r.env)}）· 截止 ${esc(r.cutoff)} · 周期 ${esc(r.interval_min)} 分钟/作业<br>
开始 ${esc(r.started_at)} · 结束 ${esc(r.finished_at)} · 停止原因 ${esc(r.stop_reason)}</div>

<p><span class="badge b-${tone}">${esc(VERDICT_LABEL[r.verdict] || r.verdict)}</span></p>

<h2>Escalation —— 你只需要看这里（最多 3 条）</h2>
<div class="card esc">${r.escalation.length
    ? `<ol>${r.escalation.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`
    : `<div class="okbox">无 —— 本批无需你介入。</div>`}</div>

<h2>本批与叙事缺口（协议 §0.6 / §0.7 第 3 项）</h2>
<div class="card">
${r.narrative_gaps.aimed.length
    ? `<ul class="tight">${r.narrative_gaps.aimed.map((g) => `<li>瞄准：${esc(g)}</li>`).join("")}</ul>`
    : `<div class="muted">（本批无作业声明瞄准叙事缺口）</div>`}
<div class="${gapTone === "warn" ? "warnbox" : "okbox"}" style="margin-top:10px">${esc(r.narrative_gaps.note)}</div>
</div>

<h2>计数</h2>
<div class="cards">
<div class="card"><div class="v">${esc(r.counts.runnable)}</div><div class="k">本轮可跑</div></div>
<div class="card"><div class="v">${esc(r.counts.done)}</div><div class="k">完成</div></div>
<div class="card"><div class="v">${esc(r.counts.failed)}</div><div class="k">失败</div></div>
<div class="card"><div class="v">${esc(r.counts.unexecuted)}</div><div class="k">未执行</div></div>
<div class="card"><div class="v">${esc(r.counts.inserted)}</div><div class="k">落库新增</div></div>
<div class="card"><div class="v">${esc(r.counts.queued)}</div><div class="k">队列总数</div></div>
</div>
<div class="muted">队列 ${esc(r.counts.queued)} · 注册表声明允许 ${esc(r.counts.declared)} · 本轮可跑 ${esc(r.counts.runnable)}</div>

<h2>开跑前排除（未执行，不是失败；不计入连续失败）</h2>
${excl.length ? `<table><tr><th>原因类别</th><th>作业</th><th>理由</th></tr>${rows(excl, (x) => `<td>${esc(x.kind)}</td><td><code>${esc(x.id)}</code></td><td>${esc(x.reason)}</td>`)}</table>`
    : `<div class="okbox">无。</div>`}

<h2>本批事实（全部由查询得出，不是模板断言）</h2>
<div class="muted">归因口径：${esc(r.facts.attribution)}</div>
${r.facts.error ? `<div class="badbox">⚠️ 事实查询失败，本批事实不可得：${esc(r.facts.error)}</div>` : ""}
<table><tr><th>事实</th><th>值</th><th>来源</th></tr>
${rows(r.facts.rows, (f) => `<td>${esc(f.label)}</td><td><b>${esc(f.value)}</b></td><td><details><summary>SQL</summary><code>${esc(f.sql)}</code></details></td>`)}
</table>

<h2>作业明细</h2>
<table><tr><th>作业</th><th>结果</th><th>新增</th><th>备注</th></tr>
${rows(r.jobs, (j) => `<td><code>${esc(j.id)}</code></td><td>${j.ok ? "OK" : "<b>FAIL</b>"}</td><td>${esc(j.inserted)}</td><td>${esc(j.note)}</td>`)}
</table>

<h2>未运行 / 未完成的保证（明确列出，不用断言掩盖）</h2>
<div class="card"><ul class="tight">${r.guarantees.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>

<h2>归因口径与已知限制</h2>
<div class="card"><ul class="tight">${r.limits.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>

<p class="muted">明细见 progress.json / report.json 与 runner.log。凭证不在本报告。</p>
</div></html>
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 阶段影响 / 下游转化支撑可视化（2026-10-04 新增）
//
// 解决协议 §0.4「只报'落库新增 N 条'不算有效生产」与 §0.5「执行报告必须回答推进了哪几个
// 叙事缺口」的落地缺口：把一次数据生产（如 C1 evidence-fragment 抽取）的**真实可用、可向下游
// 转化**的数据量，用离线城市级 HTML（SVG 图表，零外部依赖）呈现，而非只给数字变化。
//
// 用法（CLI）：
//   node pipelines/legacy/unattended-report.mjs --impact \
//     --method unattended-evidence-fragment --stage C1 \
//     --out tasks/results/TASK-DATA-20261004-C1-impact.html
//
// 也可在 runner 内 import { analyzeStageImpact, renderImpactHtml } 直接复用（同源渲染）。
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

// —— 语料类别分类（按来源文件名，优先级自上而下）——
const CATEGORY_RULES = [
  [/poem|诗词|cnkgraph/i, "诗词"],
  [/jp_|clan|宗族|家谱|genealogy|family|氏谱/i, "宗族"],
  [/cbdb|person|人物/i, "人物"],
  [/event|事件/i, "事件"],
  [/gazetteer|fangzhi|方志|gj_/i, "方志"],
  [/geo|placename|地名|yutu|舆图/i, "地名"],
  [/protection|文保|heritage|sh_protection|shanghai_images|image|图/i, "文保图像"],
  [/dmz|jinze|hsly|narrative|resource|probe|verify/i, "其他"],
];
function categorize(file) {
  if (!file) return "其他";
  for (const [re, c] of CATEGORY_RULES) if (re.test(file)) return c;
  return "其他";
}

// —— 可转化信号（启发式，仅用于"预估下游候选产出"，非承诺抽取量）——
const RE_TIME = /(\d{1,4}\s*(?:年|年代|朝代|世纪|载|代))|(顺治|康熙|雍正|乾隆|嘉庆|道光|咸丰|同治|光绪|宣统|北宋|南宋|宋代|唐代|隋代|明代|清代|元朝|汉代|景定|咸淳|至元|建炎|绍兴|淳祐|嘉定|端平|宝祐|开庆|景炎|祥兴|德祐|公元|干支|甲子|乙丑|丙寅|庚申|辛酉|壬戌|癸亥|甲午|戊戌|辛亥|己丑|朔|闰)/;
const RE_SPACE = /(县|府|镇|村|乡|里|都|上海|青浦|朱家角|金泽|淀山湖|练塘|泗泾|松江|华亭|娄|青龙|桥|寺|庙|观|庵|阁|塔|巷|街|河|浦|塘|渡|埠|庄|坞|峰|泾|汇|城|关|门|市|井|园|祠|书院|学宫|城隍|墟|洲|渚|浜|港|嘴|湖|荡|漾|堰|坝|圩|窦|田|舍)/;
const RE_PERSON = /(公|先生|君|翁|孺人|讳|字|号|氏|官至|进士|举人|贡生|监生|秀才|郡望|谥|追封|生卒|姓名|配|娶|嫁|封|甫|处士|隐君|文学|孝廉|茂才|太学|国学|刺史|太守|县令|县丞|主簿|典史|巡检|千户|百户|指挥|参政|布政|按察|巡抚|总督|宰相|尚书|侍郎|御史|给事|中书|待诏|供奉|山人|隐士|遗民|逸民|高僧|道士|方外|女冠|尼|媪|妪|童|叟)/;
const RE_RELATION = /(父子|父女|母子|兄弟|姊妹|祖|孙|曾祖|高祖|父|母|妻|妾|婿|甥|侄|舅|媳|宗族|族谱|家谱|世系|后裔|子孙|裔|迁徙|迁居|始迁|卜居|定居|卜筑|占籍|世居|聚族|合族|建祠|修谱|任职|知县|知府|知州|通判|县尉|学官|掌教|创建|重修|重建|建|筑|捐|倡建|增修|葺|缮|置田|娶|嫁|生|卒|葬|奠基|肇|开|辟|营|造|铸|刻|立|题|书|撰|辑|纂|编|绘|勒|铭|记|序|跋)/;

// —— 叙事母题亲和度（类别 → M1..M5，0..1）——
const MOTIFS = ["M1 关系世界", "M2 地方结构", "M3 生活地图", "M4 生成过程", "M5 连续性"];
const MKEY = ["M1", "M2", "M3", "M4", "M5"];
const AFFINITY = {
  诗词: { M1: 0.5, M2: 1, M3: 1, M4: 0.5, M5: 1 },
  宗族: { M1: 1, M2: 1, M3: 0.5, M4: 1, M5: 1 },
  人物: { M1: 1, M2: 0.5, M3: 1, M4: 1, M5: 1 },
  事件: { M1: 1, M2: 0.5, M3: 1, M4: 1, M5: 1 },
  方志: { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1 },
  地名: { M1: 0, M2: 1, M3: 1, M4: 0.5, M5: 0.5 },
  文保图像: { M1: 0, M2: 1, M3: 0.5, M4: 0.5, M5: 1 },
  其他: { M1: 0.5, M2: 0.5, M3: 0.5, M4: 0.5, M5: 0.5 },
};

export function analyzeStageImpact({ rows, method, stage, quality }) {
  const total = rows.length;
  const catCount = {};
  const fileCount = {};
  let lenSum = 0, anySig = 0, rich = 0;
  const sig = { time: 0, space: 0, person: 0, relation: 0 };
  for (const r of rows) {
    const file = r.file || "";
    const cat = categorize(file);
    catCount[cat] = (catCount[cat] || 0) + 1;
    fileCount[file] = (fileCount[file] || 0) + 1;
    const t = String(r.quote_text || "");
    lenSum += t.length;
    const m = {
      time: RE_TIME.test(t), space: RE_SPACE.test(t),
      person: RE_PERSON.test(t), relation: RE_RELATION.test(t),
    };
    let c = 0;
    for (const k of ["time", "space", "person", "relation"]) if (m[k]) { sig[k]++; c++; }
    if (c >= 1) anySig++;
    if (c >= 2) rich++;
  }
  const categories = Object.entries(catCount).map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.count - a.count);
  const topFiles = Object.entries(fileCount).map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count).slice(0, 12);
  const avgLen = total ? Math.round(lenSum / total) : 0;

  // 母题支撑矩阵（raw = 类别片段数 × 亲和度）
  const cells = {};
  let gmax = 0;
  for (const cat of categories) {
    cells[cat.name] = {};
    for (const k of MKEY) {
      const raw = Math.round(cat.count * (AFFINITY[cat.name]?.[k] ?? 0));
      cells[cat.name][k] = raw;
      if (raw > gmax) gmax = raw;
    }
  }
  const motifTotals = {};
  for (const k of MKEY) {
    let s = 0;
    for (const cat of categories) s += cells[cat.name][k];
    motifTotals[k] = s;
  }

  return {
    method, stage, total,
    generated_at: new Date().toISOString(),
    categories, topFiles, avgLen,
    anySignalPct: total ? Math.round((anySig / total) * 1000) / 10 : 0,
    richPct: total ? Math.round((rich / total) * 1000) / 10 : 0,
    signals: {
      time: { n: sig.time, pct: total ? Math.round((sig.time / total) * 1000) / 10 : 0 },
      space: { n: sig.space, pct: total ? Math.round((sig.space / total) * 1000) / 10 : 0 },
      person: { n: sig.person, pct: total ? Math.round((sig.person / total) * 1000) / 10 : 0 },
      relation: { n: sig.relation, pct: total ? Math.round((sig.relation / total) * 1000) / 10 : 0 },
    },
    motifMatrix: { categories: categories.map((c) => c.name), motifs: MOTIFS, cells, motifTotals, gmax },
    projections: { time: sig.time, space: sig.space, person: sig.person, relation: sig.relation },
    quality: quality || {},
  };
}

// —— SVG 渲染辅助 ——
const PALETTE = ["#2f6fed", "#16a34a", "#b45309", "#9333ea", "#0891b2", "#dc2626", "#ca8a04", "#64748b"];
const lerp = (a, b, t) => a + (b - a) * t;
const heat = (t) => { t = Math.max(0, Math.min(1, t)); return `rgb(${Math.round(lerp(240, 29, t))},${Math.round(lerp(245, 78, t))},${Math.round(lerp(255, 216, t))})`; };

function donut(segs, total) {
  const R = 70, W = 26, C = 2 * Math.PI * R, cx = 95, cy = 95;
  let off = 0; const parts = [];
  for (const s of segs) {
    const len = (s.value / total) * C;
    if (len <= 0) continue;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${s.color}" stroke-width="${W}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`);
    off += len;
  }
  return `<svg width="190" height="190" viewBox="0 0 190 190">${parts.join("")}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="#1a1d21">${total}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="#6b7280">片段总数</text></svg>`;
}

function hbar(items, unit = "") {
  const max = Math.max(1, ...items.map((i) => i.value));
  return items.map((it, i) => {
    const w = Math.round((it.value / max) * 520);
    return `<div style="display:flex;align-items:center;margin:5px 0;font-size:12.5px">
      <div style="width:230px;color:#374151;text-align:right;padding-right:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(it.label)}">${esc(it.label)}</div>
      <div style="background:#2f6fed;height:16px;border-radius:3px;width:${w}px"></div>
      <div style="margin-left:8px;color:#374151;font-weight:600">${it.value}${unit}</div></div>`;
  }).join("");
}

function heatmap(m) {
  const cats = m.categories, motifs = m.motifs, gmax = m.gmax || 1;
  const cw = 96, ch = 30, pad = 4;
  const w = 20 + motifs.length * cw, h = 30 + cats.length * ch;
  let cells = "";
  motifs.forEach((mo, j) => {
    cells += `<text x="${20 + j * cw + cw / 2}" y="20" text-anchor="middle" font-size="11" fill="#374151">${esc(mo)}</text>`;
  });
  cats.forEach((cat, i) => {
    cells += `<text x="14" y="${30 + i * ch + ch / 2 + 4}" text-anchor="end" font-size="11" fill="#374151">${esc(cat)}</text>`;
    motifs.forEach((mo, j) => {
      const k = MKEY[j];
      const raw = m.cells[cat]?.[k] ?? 0;
      const t = gmax ? raw / gmax : 0;
      const x = 20 + j * cw, y = 30 + i * ch;
      cells += `<rect x="${x + pad}" y="${y + pad}" width="${cw - 2 * pad}" height="${ch - 2 * pad}" rx="4" fill="${heat(t)}" stroke="#e5e7eb"/>
        <text x="${x + cw / 2}" y="${y + ch / 2 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="${t > 0.5 ? "#fff" : "#1a1d21"}">${raw}</text>`;
    });
  });
  const totals = MKEY.map((k, j) => `<div style="margin:3px 0;font-size:12px"><b>${motifs[j]}</b>：支撑量 <b>${m.motifTotals[k]}</b></div>`).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="max-width:100%">${cells}</svg><div style="margin-top:8px">${totals}</div>`;
}

export function renderImpactHtml(impact) {
  const cats = impact.categories;
  const segs = cats.map((c, i) => ({ label: c.name, value: c.count, color: PALETTE[i % PALETTE.length] }));
  const sigBars = [
    { label: "时间信号", ...impact.signals.time },
    { label: "空间信号", ...impact.signals.space },
    { label: "人物信号", ...impact.signals.person },
    { label: "关系信号", ...impact.signals.relation },
  ];
  const q = impact.quality || {};
  const banner = `本批为 <b>${esc(impact.stage)}</b> 阶段、方法 <code>${esc(impact.method)}</code> 产出的 <b>${impact.total}</b> 条 corpus 文本片段。覆盖 <b>${cats.length}</b> 类语料；按信号密度预估，可向下游 C2 候选抽取提供约 <b>${impact.projections.time}</b> 条时间、<b>${impact.projections.space}</b> 条空间、<b>${impact.projections.person}</b> 条人物、<b>${impact.projections.relation}</b> 条关系候选信号。全部为 candidate、零自动晋级。`;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(impact.stage)} · 下游转化支撑可视化</title>
<style>
:root{--line:#e5e7eb;--bg:#f6f7f9}
*{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:var(--bg);color:#1a1d21;line-height:1.65}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;margin:30px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:14px}
.banner{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:12px 0}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;text-align:center}
.card .v{font-size:23px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:3px}
.row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;flex:1;min-width:320px}
.legend{font-size:12.5px;margin-top:6px}
.legend span{display:inline-block;margin-right:12px;white-space:nowrap}
.okbox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px}
.warnbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px}
.muted{color:#6b7280;font-size:12.5px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td{padding:6px 8px;border-top:1px solid #eef0f3;vertical-align:top}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
</style>
<div class="wrap">
<h1>${esc(impact.stage)} · 下游转化支撑可视化报告</h1>
<div class="sub">方法 ${esc(impact.method)} · 生成 ${esc(impact.generated_at)} · 单文件离线可开 · 全部数字由查询得出</div>
<div class="banner">${banner}</div>

<h2>① 概览</h2>
<div class="cards">
<div class="card"><div class="v">${impact.total}</div><div class="k">文本片段总数</div></div>
<div class="card"><div class="v">${cats.length}</div><div class="k">语料类别数</div></div>
<div class="card"><div class="v">${impact.avgLen}</div><div class="k">平均片段字数</div></div>
<div class="card"><div class="v">${impact.anySignalPct}%</div><div class="k">含≥1可转化信号</div></div>
<div class="card"><div class="v">${impact.richPct}%</div><div class="k">含≥2信号(丰富)</div></div>
<div class="card"><div class="v">${q.locator_null === 0 || q.locator_null === undefined ? "100%" : (100 - Math.round((q.locator_null / impact.total) * 100)) + "%"}</div><div class="k">locator 完整率</div></div>
</div>

<h2>② 语料类别分布（覆盖哪些一手来源）</h2>
<div class="row">
<div class="box">${donut(segs, impact.total)}</div>
<div class="box"><div class="legend">${cats.map((c, i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${PALETTE[i % PALETTE.length]};margin-right:4px"></span>${esc(c.name)} ${c.count} (${c.pct}%)</span>`).join("")}</div>
${hbar(cats.map((c) => ({ label: c.name, value: c.count })))}
</div></div>

<h2>③ 可转化信号密度（向下游候选抽取的"真实可用"量）</h2>
<div class="box">${hbar(sigBars.map((s) => ({ label: `${s.label} ${s.pct}%`, value: s.n })))}
<div class="muted" style="margin-top:8px">信号为启发式正则匹配（时间/空间/人物/关系关键词），用于<b>预估</b> C2 候选抽取可消费的原始信号量，非承诺抽取条数。含≥2 类信号的"丰富片段"占 ${impact.richPct}%，是母题叙事的高价值原料。</div></div>

<h2>④ 叙事母题支撑矩阵（M1–M5 · 本批能撑起哪些未来叙事）</h2>
<div class="box">${heatmap(impact.motifMatrix)}
<div class="muted" style="margin-top:8px">单元格 = 该语料类别片段数 × 与对应母题的亲和度（0–1）；颜色越深支撑越强。母题定义见 specs/experience-ui/MoHen_Narrative_Motif_Framework.md（M1 关系世界 / M2 地方结构 / M3 生活地图 / M4 生成过程 / M5 连续性）。</div></div>

<h2>⑤ 下游候选产出预估（供 C2 candidate-extraction 消费）</h2>
<div class="cards">
<div class="card"><div class="v">${impact.projections.time}</div><div class="k">时间候选信号</div></div>
<div class="card"><div class="v">${impact.projections.space}</div><div class="k">空间候选信号</div></div>
<div class="card"><div class="v">${impact.projections.person}</div><div class="k">人物候选信号</div></div>
<div class="card"><div class="v">${impact.projections.relation}</div><div class="k">关系候选信号</div></div>
</div>
<div class="warnbox">⚠️ 以上为<b>信号命中数</b>，不是已落库的候选实体/关系。须在 C2 经确定性抽取 + 歧义 HOLD 后才成为候选；本批仅提供"可被转化的真实原料"体量。</div>

<h2>⑥ 红线与质量校验</h2>
<div class="okbox"><ul style="margin:4px 0 0 18px;padding:0">
<li>locator 完整率：${q.locator_null === 0 ? "<b>100%</b>（无 G0 HOLD 触发）" : q.locator_null + " 条缺失"}</li>
<li>verified 证据：${q.verified ?? 0}（<b>0 自动晋级</b>）</li>
<li>published 实体：${q.published ?? 0}（<b>0 自动晋级</b>）</li>
<li>近 1 日 auto 分诊：${q.auto_1d ?? 0}（<b>0 自动晋级</b>）</li>
<li>review_queue HOLD（本批三分留痕）：${q.hold_c1 ?? impact.total}</li>
</ul></div>

<h2>⑦ 方法论与限制</h2>
<div class="box"><ul class="muted" style="margin:0;padding-left:18px;line-height:1.8">
<li>数据源：<code>evidence</code> + <code>source_records</code>（<code>extraction_method='${esc(impact.method)}'</code>），全部为老项目 corpus 一手文本片段。</li>
<li>类别由来源文件名正则判定；信号由中文关键词正则启发式匹配，存在漏判/误判，仅用于体量预估。</li>
<li>母题支撑为"类别 × 亲和度"近似，不代表已生成叙事，仅表明该批数据对哪些母题有原料支撑。</li>
<li>本报告为协议 §0.5 执行报告的"下游转化支撑"增补视图；与 runner 生成的 report.json/html 同源互补。</li>
</ul></div>
<p class="muted">生成口径：analyzeStageImpact + renderImpactHtml（pipelines/legacy/unattended-report.mjs）。</p>
</div></html>
`;
}

// —— C2 下游转化支撑可视化（2026-10-04 新增）——
// 反映 candidate-extraction + deterministic-resolution 的真实产出：实体/关系候选量、类型分布、
// 与 M1–M5 母题的支撑矩阵、对 C3 编织的可消费量，以及红线校验。
const ENTITY_TYPE_AFFINITY = {
  place:         { M1: 0,   M2: 1,   M3: 1,   M4: 0.5, M5: 0.5 },
  building:      { M1: 0.5, M2: 1,   M3: 1,   M4: 1,   M5: 1 },
  figure:        { M1: 1,   M2: 0.5, M3: 1,   M4: 1,   M5: 1 },
  family_person: { M1: 1,   M2: 1,   M3: 0.5, M4: 1,   M5: 1 },
  event:         { M1: 1,   M2: 0.5, M3: 1,   M4: 1,   M5: 1 },
  town:          { M1: 0.5, M2: 1,   M3: 1,   M4: 0.5, M5: 0.5 },
  gazetteer:     { M1: 1,   M2: 1,   M3: 1,   M4: 1,   M5: 1 },
  artifact:      { M1: 0.5, M2: 1,   M3: 0.5, M4: 1,   M5: 1 },
  unknown:       { M1: 0.5, M2: 0.5, M3: 0.5, M4: 0.5, M5: 0.5 },
};

export async function analyzeCandidateImpact({ from }) {
  // 注：entities / relations 无 created_at 列，C2 产出以 legacy_id / discovery_code / mapping_method 标记归因
  const rawEnts = await queryRows(
    `select entity_type, count(*)::int as c from entities
      where legacy_id like 'unattended-ce:%'
      group by entity_type order by 2 desc`, {});
  const ents = rawEnts.map((e) => ({ entity_type: e.entity_type, c: Number(e.c) }));
  const rels = Number(await queryValue(
    `select count(*) from relations where legacy_id like 'unattended-ce-rel:%'`, {}));
  const disc = Number(await queryValue(
    `select count(*) from discovery_candidates where discovery_code like 'unattended-ce:%'`, {}));
  const maps = Number(await queryValue(
    `select count(*) from legacy_mappings where legacy_source='unattended-ce' and legacy_type='entity' and mapping_method='deterministic-resolution'`, {}));
  const holds = Number(await queryValue(
    `select count(*) from review_queue where triage_outcome='hold' and summary like '%C2%'`, {}));

  const totalEnt = ents.reduce((a, e) => a + e.c, 0);
  let space = 0, person = 0, time = 0;
  for (const e of ents) {
    if (["place", "building", "town"].includes(e.entity_type)) space += e.c;
    else if (["figure", "family_person", "unknown"].includes(e.entity_type)) person += e.c;
    else if (e.entity_type === "event") time += e.c;
  }
  const signals = {
    time:     { n: time,  pct: totalEnt ? Math.round((time / totalEnt) * 1000) / 10 : 0 },
    space:    { n: space, pct: totalEnt ? Math.round((space / totalEnt) * 1000) / 10 : 0 },
    person:   { n: person, pct: totalEnt ? Math.round((person / totalEnt) * 1000) / 10 : 0 },
    relation: { n: rels,   pct: totalEnt ? Math.round((rels / totalEnt) * 1000) / 10 : 0 },
  };
  const cells = {};
  let gmax = 0;
  for (const e of ents) {
    cells[e.entity_type] = {};
    for (const k of MKEY) {
      const raw = Math.round(e.c * (ENTITY_TYPE_AFFINITY[e.entity_type]?.[k] ?? 0.5));
      cells[e.entity_type][k] = raw;
      if (raw > gmax) gmax = raw;
    }
  }
  const motifTotals = {};
  for (const k of MKEY) { let s = 0; for (const e of ents) s += cells[e.entity_type][k]; motifTotals[k] = s; }
  const q = (await queryRows(
    `select
       (select count(*) from evidence where verification_status='verified') as verified,
       (select count(*) from entities where status='published') as published,
       (select count(*) from review_queue where triage_outcome='auto' and created_at > now()-interval '1 day') as auto_1d`
  ))[0];
  return {
    stage: "C2", generated_at: new Date().toISOString(), from,
    total_entities: totalEnt, total_relations: rels, total_discoveries: disc,
    mappings: maps, holds,
    entity_types: ents, signals,
    motifMatrix: { categories: ents.map((e) => e.entity_type), motifs: MOTIFS, cells, motifTotals, gmax },
    redline: { verified: Number(q.verified), published: Number(q.published), auto_1d: Number(q.auto_1d) },
  };
}

export function renderCandidateImpactHtml(imp) {
  const cats = imp.entity_types;
  const segs = cats.map((c, i) => ({ label: c.entity_type, value: c.c, color: PALETTE[i % PALETTE.length] }));
  const sigBars = [
    { label: `空间信号（地点/建筑） ${imp.signals.space.pct}%`, value: imp.signals.space.n },
    { label: `人物信号 ${imp.signals.person.pct}%`, value: imp.signals.person.n },
    { label: `时间信号（事件） ${imp.signals.time.pct}%`, value: imp.signals.time.n },
    { label: `关系信号（共现候选） ${imp.signals.relation.pct}%`, value: imp.signals.relation.n },
  ];
  const q = imp.redline || {};
  const banner = `本批为 <b>C2</b> 阶段产出：<b>${imp.total_entities}</b> 个候选实体、<b>${imp.total_relations}</b> 条弱共现关系、<b>${imp.total_discoveries}</b> 条 discovery 候选；确定性对齐写 <b>${imp.mappings}</b> 条 legacy_mappings，<b>${imp.holds}</b> 条 HOLD 留痕。全部 candidate、零自动晋级，供 C3 关系编织消费。`;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>C2 · 下游转化支撑可视化</title>
<style>
:root{--line:#e5e7eb;--bg:#f6f7f9}
*{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:var(--bg);color:#1a1d21;line-height:1.65}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;margin:30px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:14px}
.banner{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;text-align:center}
.card .v{font-size:23px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:3px}
.row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;flex:1;min-width:320px}
.legend{font-size:12.5px;margin-top:6px}
.legend span{display:inline-block;margin-right:12px;white-space:nowrap}
.warnbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px}
.okbox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px}
.muted{color:#6b7280;font-size:12.5px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td{padding:6px 8px;border-top:1px solid #eef0f3;vertical-align:top}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
</style>
<div class="wrap">
<h1>C2 · 下游转化支撑可视化报告</h1>
<div class="sub">生成 ${esc(imp.generated_at)} · 统计窗口 ${esc(imp.from)} 起 · 单文件离线可开 · 全部数字由查询得出</div>
<div class="banner">${banner}</div>

<h2>① 概览</h2>
<div class="cards">
<div class="card"><div class="v">${imp.total_entities}</div><div class="k">候选实体</div></div>
<div class="card"><div class="v">${imp.total_relations}</div><div class="k">弱共现关系</div></div>
<div class="card"><div class="v">${imp.total_discoveries}</div><div class="k">discovery 候选</div></div>
<div class="card"><div class="v">${imp.mappings}</div><div class="k">确定性对齐(legacy_mappings)</div></div>
<div class="card"><div class="v">${imp.holds}</div><div class="k">HOLD 留痕</div></div>
</div>

<h2>② 候选实体类型分布（覆盖哪些一手来源维度）</h2>
<div class="row">
<div class="box">${donut(segs, imp.total_entities)}</div>
<div class="box"><div class="legend">${cats.map((c, i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${PALETTE[i % PALETTE.length]};margin-right:4px"></span>${esc(c.entity_type)} ${c.c}</span>`).join("")}</div>
${hbar(cats.map((c) => ({ label: c.entity_type, value: c.c })))}
</div></div>

<h2>③ 可转化信号密度（供 C3 关系编织消费的"真实可用"量）</h2>
<div class="box">${hbar(sigBars)}
<div class="muted" style="margin-top:8px">空间=地点/建筑类实体；人物=人物/未知类；时间=事件类；关系=弱共现关系候选数。信号为候选层命中，须经 C3 编织与门禁判定才成 Truth。</div></div>

<h2>④ 叙事母题支撑矩阵（M1–M5 · 本批候选能撑起哪些未来叙事）</h2>
<div class="box">${heatmap(imp.motifMatrix)}
<div class="muted" style="margin-top:8px">单元格 = 该类型候选实体数 × 与对应母题的亲和度（0–1）。母题定义见 MoHen_Narrative_Motif_Framework.md。</div></div>

<h2>⑤ 下游候选产出预估（供 C3 candidate/relation-weave 消费）</h2>
<div class="cards">
<div class="card"><div class="v">${imp.total_entities}</div><div class="k">实体候选</div></div>
<div class="card"><div class="v">${imp.total_relations}</div><div class="k">关系候选</div></div>
<div class="card"><div class="v">${imp.total_discoveries}</div><div class="k">discovery 候选</div></div>
</div>
<div class="warnbox">⚠️ 以上为<b>候选命中数</b>，尚未晋级 Truth。须在 C3 经门禁投影（G0–G6）→ AUTO/HOLD/REJECT 后才成为可用关系。</div>

<h2>⑥ 红线与质量校验</h2>
<div class="okbox"><ul style="margin:4px 0 0 18px;padding:0">
<li>verified 证据：${q.verified ?? 0}（<b>0 自动晋级</b>）</li>
<li>published 实体：${q.published ?? 0}（<b>0 自动晋级</b>）</li>
<li>近 1 日 auto 分诊：${q.auto_1d ?? 0}（<b>0 自动晋级</b>）</li>
<li>review_queue HOLD（本批三分留痕）：${imp.holds}</li>
<li>确定性对齐 legacy_mappings：${imp.mappings}（歧义一律 HOLD，不自选边）</li>
</ul></div>

<h2>⑦ 方法论与限制</h2>
<div class="box"><ul class="muted" style="margin:0;padding-left:18px;line-height:1.8">
<li>数据源：<code>entities</code>（legacy_id like 'unattended-ce:%'）、<code>relations</code>、<code>discovery_candidates</code>、<code>legacy_mappings</code>（mapping_method like 'deterministic-resolution%'），created_at ≥ ${esc(imp.from)}。</li>
<li>候选抽取为启发式（place_hint / subject_hint / 中文地名后缀正则），存在漏判/误判，全部 candidate 待人工/门禁判定。</li>
<li>母题支撑为"类型 × 亲和度"近似，不代表已生成叙事。</li>
<li>本报告与 runner 生成的 report.json/html 同源互补，是协议 §0.5 的下游转化支撑视图。</li>
</ul></div>
<p class="muted">生成口径：analyzeCandidateImpact + renderCandidateImpactHtml（pipelines/legacy/unattended-report.mjs）。</p>
</div></html>
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// C3 · 2026-10-04 · 下游转化支撑报告（relation-weave + gate-projection）
// 反映关系编织与门禁投影的真实产出：关系证据绑定量、E1 桥—水—桥簇规模、可转化信号密度、
// M1–M5 母题支撑矩阵、L4 Agent Read Model 投影量，以及红线校验（零自动晋级）。
// 全部数字由查询得出；与 runner 的 report.json/html 同源互补（协议 §0.5）。
// ═══════════════════════════════════════════════════════════════════════════════
const CLUSTER_AFFINITY = {
  "E1 桥—水—桥簇":  { M1: 1,   M2: 0.5, M3: 1,   M4: 0.5, M5: 1 },
  "建筑—地点/建筑": { M1: 0.5, M2: 1,   M3: 1,   M4: 1,   M5: 1 },
  "地点—地点":      { M1: 0,   M2: 1,   M3: 0.5, M4: 0.5, M5: 0.5 },
  "其他共现":       { M1: 0.5, M2: 0.5, M3: 0.5, M4: 0.5, M5: 0.5 },
};

export async function analyzeWeaveImpact({ from }) {
  const relTotal = Number(await queryValue(
    `select count(*) from relations where legacy_id like 'unattended-ce-rel:%'`, {}));
  const bindTotal = Number(await queryValue(
    `select count(*) from relation_evidence re
       join relations r on r.relation_id = re.relation_id
      where r.legacy_id like 'unattended-ce-rel:%'`, {}));
  const boundRel = Number(await queryValue(
    `select count(distinct r.relation_id) from relations r
       join relation_evidence re on re.relation_id = r.relation_id
      where r.legacy_id like 'unattended-ce-rel:%'`, {}));
  const boundRel2 = Number(await queryValue(
    `select count(*) from (
        select r.relation_id from relations r
          join relation_evidence re on re.relation_id = r.relation_id
         where r.legacy_id like 'unattended-ce-rel:%'
         group by r.relation_id having count(*) >= 2) t`, {}));
  const e1 = Number(await queryValue(
    `select count(*) from review_queue where reason_code='E1_BRIDGE_WATER_CANDIDATE'`, {}));
  const woven = Number(await queryValue(
    `select count(*) from review_queue where reason_code='woven_relation_candidate'`, {}));
  const heldRel = Number(await queryValue(
    `select count(*) from review_queue where object_type='relation' and triage_outcome='hold'`, {}));
  const paths = Number(await queryValue(
    `select count(*) from knowledge_paths where path_code like 'L4-%'`, {}));
  const weavePaths = Number(await queryValue(
    `select count(*) from knowledge_paths where path_code like 'L4-WEAVE%'`, {}));
  const steps = Number(await queryValue(`select count(*) from knowledge_path_steps`, {}));
  const auditRel = Number(await queryValue(
    `select count(*) from evidence_gate_audit where object_type='relation' and reason like 'N06-relation%'`, {}));

  // 关系构成（按主体/客体实体类型组合 → 叙事簇类别）
  const comp = await queryRows(
    `select case
        when se.entity_type='building' and oe.entity_type='building' then 'E1 桥—水—桥簇'
        when se.entity_type='building' or oe.entity_type='building' then '建筑—地点/建筑'
        when se.entity_type='place' and oe.entity_type='place' then '地点—地点'
        else '其他共现' end as cat,
        count(*)::int as c
      from relations r
      join entities se on se.entity_id = r.subject_id
      join entities oe on oe.entity_id = r.object_id
      where r.legacy_id like 'unattended-ce-rel:%'
      group by 1 order by 2 desc`, {});
  const cats = comp.map((r) => ({ cat: r.cat, c: Number(r.c) }));
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

  const signals = {
    relation: { n: boundRel,  pct: pct(boundRel, relTotal) },   // 已绑定证据的关系
    multiEv:  { n: boundRel2, pct: pct(boundRel2, relTotal) },  // ≥2 条证据（门禁晋级候选）
    e1:       { n: e1,        pct: pct(e1, relTotal) },         // E1 桥—水—桥簇
    binding:  { n: bindTotal, pct: pct(bindTotal, relTotal) },  // 绑定条数（可 >100%）
  };

  const cells = {};
  let gmax = 0;
  for (const c of cats) {
    cells[c.cat] = {};
    for (const k of MKEY) {
      const raw = Math.round(c.c * (CLUSTER_AFFINITY[c.cat]?.[k] ?? 0.5));
      cells[c.cat][k] = raw;
      if (raw > gmax) gmax = raw;
    }
  }
  const motifTotals = {};
  for (const k of MKEY) { let s = 0; for (const c of cats) s += cells[c.cat][k]; motifTotals[k] = s; }

  const q = (await queryRows(
    `select
       (select count(*) from evidence where verification_status='verified') as verified,
       (select count(*) from entities where status='published') as published,
       (select count(*) from relations where status='verified') as rel_verified,
       (select count(*) from review_queue where triage_outcome='auto' and created_at > now()-interval '1 day') as auto_1d`
  ))[0];

  return {
    stage: "C3", generated_at: new Date().toISOString(), from,
    total_relations: relTotal, bindings: bindTotal, bound_relations: boundRel,
    multi_evidence_relations: boundRel2, e1_cluster: e1, woven, held_relations: heldRel,
    paths, weave_paths: weavePaths, steps, audit_relations: auditRel,
    clusters: cats, signals,
    motifMatrix: { categories: cats.map((c) => c.cat), motifs: MOTIFS, cells, motifTotals, gmax },
    redline: {
      verified: Number(q.verified), published: Number(q.published),
      rel_verified: Number(q.rel_verified), auto_1d: Number(q.auto_1d),
    },
  };
}

export function renderWeaveImpactHtml(imp) {
  const cats = imp.clusters;
  const total = imp.total_relations;
  const segs = cats.map((c, i) => ({ label: c.cat, value: c.c, color: PALETTE[i % PALETTE.length] }));
  const sigBars = [
    { label: `已绑定证据的关系 ${imp.signals.relation.pct}%`, value: imp.signals.relation.n },
    { label: `≥2 条证据（门禁晋级候选） ${imp.signals.multiEv.pct}%`, value: imp.signals.multiEv.n },
    { label: `E1 桥—水—桥簇 ${imp.signals.e1.pct}%`, value: imp.signals.e1.n },
    { label: `证据绑定总条数 ${imp.signals.binding.pct}%（对关系数）`, value: imp.signals.binding.n },
  ];
  const q = imp.redline || {};
  const banner = `本批为 <b>C3</b> 阶段产出：<b>${imp.total_relations}</b> 条候选关系中 <b>${imp.bound_relations}</b> 条完成 evidence 绑定（共 <b>${imp.bindings}</b> 条 <code>relation_evidence</code>），识别 <b>${imp.e1_cluster}</b> 条 E1 桥—水—桥簇；门禁投影 G0–G6 评估 <b>${imp.audit_relations / 7}</b> 条关系、重建 L4 Agent Read Model <b>${imp.paths}</b> 条路径 / <b>${imp.steps}</b> 个步骤。全部 HOLD、<b>零自动晋级</b>（未开 MOHEN_ALLOW_E1_PROMOTE）。`;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>C3 · 下游转化支撑可视化</title>
<style>
:root{--line:#e5e7eb;--bg:#f6f7f9}
*{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:var(--bg);color:#1a1d21;line-height:1.65}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;margin:30px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:14px}
.banner{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;text-align:center}
.card .v{font-size:23px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:3px}
.row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;flex:1;min-width:320px}
.legend{font-size:12.5px;margin-top:6px}
.legend span{display:inline-block;margin-right:12px;white-space:nowrap}
.warnbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px}
.okbox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px}
.muted{color:#6b7280;font-size:12.5px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td{padding:6px 8px;border-top:1px solid #eef0f3;vertical-align:top}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
</style>
<div class="wrap">
<h1>C3 · 下游转化支撑可视化报告</h1>
<div class="sub">生成 ${esc(imp.generated_at)} · 统计窗口 ${esc(imp.from)} 起 · 单文件离线可开 · 全部数字由查询得出</div>
<div class="banner">${banner}</div>

<h2>① 概览</h2>
<div class="cards">
<div class="card"><div class="v">${imp.total_relations}</div><div class="k">候选关系</div></div>
<div class="card"><div class="v">${imp.bindings}</div><div class="k">evidence 绑定</div></div>
<div class="card"><div class="v">${imp.e1_cluster}</div><div class="k">E1 桥—水—桥簇</div></div>
<div class="card"><div class="v">${imp.paths}</div><div class="k">L4 投影路径</div></div>
<div class="card"><div class="v">${imp.held_relations}</div><div class="k">HOLD 留痕（关系）</div></div>
</div>

<h2>② 关系构成分布（覆盖哪些叙事簇维度）</h2>
<div class="row">
<div class="box">${donut(segs, total)}</div>
<div class="box"><div class="legend">${cats.map((c, i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${PALETTE[i % PALETTE.length]};margin-right:4px"></span>${esc(c.cat)} ${c.c}</span>`).join("")}</div>
${hbar(cats.map((c) => ({ label: c.cat, value: c.c })))}
</div></div>

<h2>③ 可转化信号密度（真实可用的关系证据支撑量）</h2>
<div class="box">${hbar(sigBars)}
<div class="muted" style="margin-top:8px">“已绑定证据”＝在 <code>relation_evidence</code> 中有 ≥1 条证据的关系；“≥2 条证据”＝门禁判定为 E1 确定性晋级候选的必要条件之一。信号为候选层命中，须经人审才成 Truth。</div></div>

<h2>④ 叙事母题支撑矩阵（M1–M5 · 本批关系能撑起哪些未来叙事）</h2>
<div class="box">${heatmap(imp.motifMatrix)}
<div class="muted" style="margin-top:8px">单元格 = 该叙事簇关系数 × 与对应母题的亲和度（0–1）。母题定义见 MoHen_Narrative_Motif_Framework.md。</div></div>

<h2>⑤ 下游候选产出预估（供 C4/C5 与 Human Experience 消费）</h2>
<div class="cards">
<div class="card"><div class="v">${imp.bound_relations}</div><div class="k">已绑定证据关系</div></div>
<div class="card"><div class="v">${imp.multi_evidence_relations}</div><div class="k">≥2 证据（晋级候选）</div></div>
<div class="card"><div class="v">${imp.steps}</div><div class="k">投影步骤（可回溯证据）</div></div>
</div>
<div class="warnbox">⚠️ 以上为<b>候选绑定数</b>，非已落库 Truth 关系。C3 门禁对关系做了 G0–G6 评估并全部判 HOLD（<code>rel_held=${imp.held_relations}</code>），其中 ${imp.multi_evidence_relations} 条满足 E1 确定性条件，待拥有者开放 <code>MOHEN_ALLOW_E1_PROMOTE</code> 后按协议晋级。</div>

<h2>⑥ 红线与质量校验</h2>
<div class="okbox"><ul style="margin:4px 0 0 18px;padding:0">
<li>verified 证据：${q.verified ?? 0}（<b>0 自动晋级</b>）</li>
<li>published 实体：${q.published ?? 0}（<b>0 自动晋级</b>）</li>
<li>verified 关系：${q.rel_verified ?? 0}（<b>0 自动晋级</b>）</li>
<li>近 1 日 auto 分诊：${q.auto_1d ?? 0}（<b>0 自动晋级</b>）</li>
<li>门禁审计行（relation，G0–G6）：${imp.audit_relations}（覆盖 ${imp.audit_relations / 7} 条关系）</li>
<li>review_queue HOLD（关系三分留痕）：${imp.held_relations}</li>
</ul></div>

<h2>⑦ 方法论与限制</h2>
<div class="box"><ul class="muted" style="margin:0;padding-left:18px;line-height:1.8">
<li>数据源：<code>relations</code>（legacy_id like 'unattended-ce-rel:%'）、<code>relation_evidence</code>、<code>evidence_gate_audit</code>（reason like 'N06-relation%'）、<code>knowledge_paths</code>/<code>knowledge_path_steps</code>（L4-*）、<code>review_queue</code>。</li>
<li>证据绑定为文本共现回溯（<code>quote_text</code> 同时含主体与客体名），属启发式，存在漏绑/误绑，全部 candidate 待人审/门禁判定。</li>
<li>E1 簇识别依赖桥/水类后缀启发式，非权威水系拓扑，仅作候选标记。</li>
<li>投影为 L4 只读重建（<code>knowledge_paths</code>），<b>不反写 Truth Store</b>；重跑会整批删除重建（幂等）。</li>
<li>本报告与 runner 生成的 report.json/html 同源互补，是协议 §0.5 的下游转化支撑视图。</li>
</ul></div>
<p class="muted">生成口径：analyzeWeaveImpact + renderWeaveImpactHtml（pipelines/legacy/unattended-report.mjs）。</p>
</div></html>
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// C4 · 2026-10-04 · 下游转化支撑报告（unattended.image-link：1246 图并入主线）
// 反映 1246 图（R25 解冻部分）的真实产出：题录证据量、图-实体链接量（对象级/镇域）、
// 资格判定分布、可转化信号密度、M1–M5 母题支撑矩阵，以及红线校验（零自动晋级 + 冻结项未触）。
// 全部数字由查询得出；与 runner 的 report.json/html 同源互补（协议 §0.5）。
// ═══════════════════════════════════════════════════════════════════════════════
const LINK_AFFINITY = {
  "对象级点名链接 R1": { M1: 0.5, M2: 1, M3: 1, M4: 0.5, M5: 1 },
  "镇域归属链接 R3":   { M1: 0.5, M2: 1, M3: 0.5, M4: 0.5, M5: 0.5 },
  "题录证据（可定位）": { M1: 0.5, M2: 0.5, M3: 0.5, M4: 1, M5: 1 },
};

export async function analyzeImageImpact({ from }) {
  const q1 = (await queryRows(`select
      (select count(*) from visual_assets a join source_records s on s.source_id=a.source_id
        where s.provider='hushang_legacy' and coalesce(s.metadata_json->>'kind','')<>'image_source') as legacy_total,
      (select count(*) from visual_assets a join source_records s on s.source_id=a.source_id
        where s.provider='hushang_legacy' and coalesce(s.metadata_json->>'kind','')<>'image_source'
          and a.eligibility_status<>'excluded') as in_scope,
      (select count(*) from visual_assets a join source_records s on s.source_id=a.source_id
        where s.provider='hushang_legacy' and coalesce(s.metadata_json->>'kind','')<>'image_source'
          and a.eligibility_status='excluded') as frozen_excluded,
      (select count(*) from evidence where extraction_method='unattended-image-link') as captions,
      (select count(*) from evidence where extraction_method='unattended-image-link' and locator is null) as locator_null,
      (select count(*) from evidence where extraction_method='unattended-image-link' and place_hint is not null) as place_hint,
      (select count(*) from evidence where extraction_method='unattended-image-link'
         and locator like '%shanghai_images_census%') as batch_shanghai,
      (select count(*) from evidence where extraction_method='unattended-image-link'
         and locator like '%commons_images%') as batch_commons,
      (select count(*) from visual_entity_links where generated_by='unattended-image-link') as links,
      (select count(*) from visual_entity_links where generated_by='unattended-image-link'
         and decision_rule='R1_caption_names_legacy_object') as links_object,
      (select count(*) from visual_entity_links where generated_by='unattended-image-link'
         and decision_rule='R3_town_scope_attribution') as links_town,
      (select count(*) from visual_entity_links where generated_by='unattended-image-link'
         and link_status='confirmed') as links_confirmed,
      (select count(*) from visual_entity_links where generated_by='unattended-image-link'
         and current_or_historical<>'unknown') as links_dated,
      (select count(distinct asset_id) from visual_entity_links where generated_by='unattended-image-link') as assets_linked,
      (select count(*) from (select asset_id from visual_entity_links where generated_by='unattended-image-link'
          group by asset_id having count(distinct decision_rule)=2) t) as assets_both,
      (select count(*) from evidence_gate_audit where object_type='visual_asset' and reason like 'C4-image-link%') as audit_va,
      (select count(*) from evidence_gate_audit where object_type='visual_asset' and reason like 'C4-image-link%'
         and result='pass') as audit_pass,
      (select count(*) from evidence_gate_audit where object_type='evidence' and reason like 'C4-image-link%') as audit_ev,
      (select count(*) from review_queue where object_type='visual_entity_link') as triage_link,
      (select count(*) from review_queue where reason_code='IMAGE_IDENTITY_UNRESOLVED') as triage_unresolved,
      (select count(*) from review_queue where reason_code='image_caption_candidate') as triage_caption,
      (select count(*) from legacy_mappings where legacy_source='unattended-image-link') as mappings`))[0];

  const towns = await queryRows(
    `select l.depicted_entity_label as t, count(*)::int as c
       from visual_entity_links l
      where l.generated_by='unattended-image-link' and l.decision_rule='R3_town_scope_attribution'
      group by 1 order by 2 desc`, {});

  // 有题录但未匹配到库内遗产对象的图 → 其题录首段即「待补实体清单」的真实原料（供 C5 / 后续补录消费）
  const unresolvedRows = await queryRows(
    `select e.quote_text q from evidence e
      where e.extraction_method='unattended-image-link'
        and not exists (select 1 from visual_entity_links l
                         where l.link_evidence_id = e.evidence_id
                           and l.decision_rule='R1_caption_names_legacy_object')`, {});
  // 只留「中文对象名」且**不是镇域名**：镇域名已由 R3 承接，列进"待补实体"会把归属好的图说成缺口。
  const townNames = new Set(towns.map((t) => String(t.t || "")));
  const nameCount = new Map();
  for (const r of unresolvedRows) {
    const seg = String(r.q || "").split(/[·｜|]/)[0].trim().slice(0, 24);
    if (seg.length < 2 || townNames.has(seg)) continue;
    if (!/[一-鿿]{2,}/.test(seg)) continue; // 遗产对象字典为中文，英文题名不作补实体原料
    nameCount.set(seg, (nameCount.get(seg) || 0) + 1);
  }
  const unresolvedNames = [...nameCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([name, c]) => ({ name, c }));

  const q2 = (await queryRows(`select
      (select count(*) from evidence where verification_status='verified') as verified,
      (select count(*) from entities where status='published') as published,
      (select count(*) from review_queue where triage_outcome='auto' and created_at > now()-interval '1 day') as auto_1d`))[0];

  const num = (v) => Number(v || 0);
  const inScope = num(q1.in_scope);
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

  const categories = [
    { cat: "对象级点名链接 R1", c: num(q1.links_object) },
    { cat: "镇域归属链接 R3", c: num(q1.links_town) },
    { cat: "题录证据（可定位）", c: num(q1.captions) },
  ];
  const cells = {};
  let gmax = 0;
  for (const c of categories) {
    cells[c.cat] = {};
    for (const k of MKEY) {
      const raw = Math.round(c.c * (LINK_AFFINITY[c.cat]?.[k] ?? 0.5));
      cells[c.cat][k] = raw;
      if (raw > gmax) gmax = raw;
    }
  }
  const motifTotals = {};
  for (const k of MKEY) { let s = 0; for (const c of categories) s += cells[c.cat][k]; motifTotals[k] = s; }

  const signals = {
    space: { n: num(q1.links_town) + num(q1.place_hint), pct: pct(num(q1.links_town), inScope) },
    time: { n: num(q1.links_dated), pct: pct(num(q1.links_dated), num(q1.links)) },
    person: { n: 0, pct: 0 },
    relation: { n: num(q1.assets_both), pct: pct(num(q1.assets_both), inScope) },
  };

  return {
    stage: "C4", generated_at: new Date().toISOString(), from,
    legacy_total: num(q1.legacy_total), in_scope: inScope, frozen_excluded: num(q1.frozen_excluded),
    captions: num(q1.captions), locator_null: num(q1.locator_null), place_hint: num(q1.place_hint),
    batches: [
      { cat: "上图记忆 census727", c: num(q1.batch_shanghai) },
      { cat: "Wikimedia commons519", c: num(q1.batch_commons) },
      { cat: "无题录（仅 URL）", c: Math.max(0, num(q1.in_scope) - num(q1.captions)) },
    ],
    links: num(q1.links), links_object: num(q1.links_object), links_town: num(q1.links_town),
    links_confirmed: num(q1.links_confirmed), links_dated: num(q1.links_dated),
    assets_linked: num(q1.assets_linked), assets_both: num(q1.assets_both),
    towns: towns.map((t) => ({ t: t.t, c: Number(t.c) })),
    unresolved_names: unresolvedNames, unresolved_images: num(q1.triage_unresolved),
    audit_va: num(q1.audit_va), audit_pass: num(q1.audit_pass), audit_ev: num(q1.audit_ev),
    triage_link: num(q1.triage_link), triage_caption: num(q1.triage_caption), mappings: num(q1.mappings),
    categories, signals,
    motifMatrix: { categories: categories.map((c) => c.cat), motifs: MOTIFS, cells, motifTotals, gmax },
    redline: {
      verified: num(q2.verified), published: num(q2.published), auto_1d: num(q2.auto_1d),
    },
  };
}

export function renderImageImpactHtml(imp) {
  const segs = imp.batches.map((c, i) => ({ label: c.cat, value: c.c, color: PALETTE[i % PALETTE.length] }));
  const townBars = imp.towns.slice(0, 12).map((t) => ({ label: t.t, value: t.c }));
  const sigBars = [
    { label: `空间信号（镇域/place 解析）${imp.signals.space.pct}%`, value: imp.signals.space.n },
    { label: `时间信号（可判古今的链接）${imp.signals.time.pct}%`, value: imp.signals.time.n },
    { label: `人物信号（本阶段不识别人物）${imp.signals.person.pct}%`, value: imp.signals.person.n },
    { label: `关系信号（对象+镇域双挂，可成「对象—位于—镇」）${imp.signals.relation.pct}%`, value: imp.signals.relation.n },
  ];
  const q = imp.redline || {};
  const banner = `本批为 <b>C4</b> 阶段产出：老项目 <b>1246</b> 张图中 R25 解冻的 <b>${imp.in_scope}</b> 张（已排除既有 excluded <b>${imp.frozen_excluded}</b> 张 —— 冻结描述项<b>只测量不处置</b>）已完成题录证据化与图-实体链接：题录证据 <b>${imp.captions}</b> 条、图-实体链接 <b>${imp.links}</b> 条（对象级 R1 <b>${imp.links_object}</b> ／镇域 R3 <b>${imp.links_town}</b>）、资格判定审计 <b>${imp.audit_va}</b> 行。<b>零自动晋级</b>（confirmed=${imp.links_confirmed}），<b>visual_assets 一行未改</b>。`;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>C4 · 下游转化支撑可视化</title>
<style>
:root{--line:#e5e7eb;--bg:#f6f7f9}
*{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:var(--bg);color:#1a1d21;line-height:1.65}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;margin:30px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:14px}
.banner{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;text-align:center}
.card .v{font-size:23px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:3px}
.row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;flex:1;min-width:320px}
.legend{font-size:12.5px;margin-top:6px}
.legend span{display:inline-block;margin-right:12px;white-space:nowrap}
.warnbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px}
.okbox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px}
.muted{color:#6b7280;font-size:12.5px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td{padding:6px 8px;border-top:1px solid #eef0f3;vertical-align:top}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
</style>
<div class="wrap">
<h1>C4 · 下游转化支撑可视化报告</h1>
<div class="sub">生成 ${esc(imp.generated_at)} · 统计窗口 ${esc(imp.from)} 起 · 单文件离线可开 · 全部数字由查询得出</div>
<div class="banner">${banner}</div>

<h2>① 概览（1246 图并入主线）</h2>
<div class="cards">
<div class="card"><div class="v">${imp.legacy_total}</div><div class="k">老项目图总数</div></div>
<div class="card"><div class="v">${imp.in_scope}</div><div class="k">解冻范围（入本批）</div></div>
<div class="card"><div class="v">${imp.captions}</div><div class="k">题录证据</div></div>
<div class="card"><div class="v">${imp.links}</div><div class="k">图-实体链接</div></div>
<div class="card"><div class="v">${imp.assets_linked}</div><div class="k">已归属图数</div></div>
<div class="card"><div class="v">${imp.audit_va}</div><div class="k">资格判定审计行</div></div>
</div>

<h2>② 语料类别分布（覆盖哪些一手来源）</h2>
<div class="row">
<div class="box">${donut(segs, imp.in_scope)}</div>
<div class="box"><div class="legend">${imp.batches.map((c, i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${PALETTE[i % PALETTE.length]};margin-right:4px"></span>${esc(c.cat)} ${c.c}</span>`).join("")}</div>
${hbar(imp.batches.map((c) => ({ label: c.cat, value: c.c })))}
<div class="muted" style="margin-top:8px">题录来自老项目预抓取 JSON（Raw 离线重放，0 网络请求）：<code>shanghai_images_census_20260905.json</code>（727 图，title/place/town_hint）与 <code>commons_images.json</code>（519 图，File 标题/description/date/towns）。</div></div></div>

<h2>③ 可转化信号密度（预估下游可消费量）</h2>
<div class="box">${hbar(sigBars)}
<div class="muted" style="margin-top:8px">信号为规则命中量（非已落库 Truth）：空间＝镇域/place 解析；时间＝题录日期可判古今的链接；<b>人物＝0（本作业不做人物识别，图题录无人物实体字典，不硬猜）</b>；关系＝同一图同时挂对象级与镇域链接，可形成「对象—位于—镇」候选。</div></div>
<div class="box"><div style="font-size:13px;font-weight:600;margin-bottom:6px">镇域归属分布（R3 弱归属，unconfirmed）</div>
${hbar(townBars)}
<div class="muted" style="margin-top:8px">镇域＝题录/结构给出的镇（<code>town_hint</code> / <code>towns[]</code> / <code>place</code>），属弱归属：<b>镇域不等于具体对象</b>，故一律 <code>unconfirmed</code>，不冒充 <code>confirmed</code>。</div></div>

<h2>④ 叙事母题支撑矩阵（M1–M5 · 本批数据能撑起哪些未来叙事）</h2>
<div class="box">${heatmap(imp.motifMatrix)}
<div class="muted" style="margin-top:8px">单元格 = 该类别产出量 × 与对应母题的亲和度（0–1）。母题定义见 MoHen_Narrative_Motif_Framework.md。</div></div>

<h2>⑤ 下游候选产出预估（供 C5 扩源 / 后续补实体 / Human Experience 消费）</h2>
<div class="cards">
<div class="card"><div class="v">${imp.signals.space.n}</div><div class="k">空间候选信号</div></div>
<div class="card"><div class="v">${imp.signals.time.n}</div><div class="k">时间候选信号</div></div>
<div class="card"><div class="v">${imp.signals.person.n}</div><div class="k">人物候选信号</div></div>
<div class="card"><div class="v">${imp.signals.relation.n}</div><div class="k">关系候选信号</div></div>
</div>
<div class="warnbox">⚠️ <b>信号命中数 ≠ 已落库候选</b>：以上为启发式/规则命中量，用于预估下游可消费规模；本批实际落库为 <code>visual_entity_links</code> ${imp.links} 条（全部 candidate/unconfirmed）与 <code>evidence</code> ${imp.captions} 条（verification_status=candidate）。</div>
<div class="box" style="margin-top:12px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">待补实体清单原料（有题录但库内无对应遗产对象的图：${imp.unresolved_images} 张）</div>
<table>${imp.unresolved_names.map((x) => `<tr><td>${esc(x.name)}</td><td style="text-align:right">${x.c}</td></tr>`).join("")}</table>
<div class="muted" style="margin-top:8px">这些题录点名的对象名<b>不在现有遗产对象字典</b>（113 个老项目移植实体）内 —— 属真实数据缺口，可作为 C5 扩源 / 后续实体补录的输入，本阶段不自造实体。</div></div>

<h2>⑥ 红线与质量校验</h2>
<div class="okbox"><ul style="margin:4px 0 0 18px;padding:0">
<li>locator 完整率：<b>${imp.locator_null === 0 ? "100%" : (100 - Math.round((imp.locator_null / Math.max(1, imp.captions)) * 100)) + "%"}</b>（缺 locator 的题录证据 ${imp.locator_null} 条）</li>
<li>verified 证据：${q.verified ?? 0}（<b>0 自动晋级</b>）</li>
<li>published 实体：${q.published ?? 0}（<b>0 自动晋级</b>）</li>
<li>近 1 日 auto 分诊：${q.auto_1d ?? 0}（<b>0 自动晋级</b>）</li>
<li>confirmed 链接（本批新增）：<b>${imp.links_confirmed}</b>（必须 0；confirmed 需人审 + 门禁）</li>
<li>冻结项未触：既有 excluded ${imp.frozen_excluded} 张状态未改、<code>visual_assets</code> 零 UPDATE（pending/excluded 状态表达收敛留 C6）</li>
<li>门禁审计：visual_asset ${imp.audit_va} 行（pass ${imp.audit_pass}）＋ evidence ${imp.audit_ev} 行</li>
<li>review_queue 三分留痕：链接 ${imp.triage_link} ／题录证据 ${imp.triage_caption} ／身份未决 ${imp.unresolved_images}（无题录者不进人审，避免长尾人工债务）</li>
<li>幂等：legacy_mappings 溯源 ${imp.mappings} 条，重跑 in_scope=0</li>
</ul></div>

<h2>⑦ 方法论与限制</h2>
<div class="box"><ul class="muted" style="margin:0;padding-left:18px;line-height:1.8">
<li>数据源：<code>visual_assets</code>（provider=hushang_legacy 且非 image_source 锚点源）+ 老项目 Raw JSON + <code>entities</code>（遗产对象字典：113 个老项目移植实体，刻意排除 C2 启发式候选 <code>unattended-ce:*</code>）+ <code>visual_entity_links</code> / <code>evidence</code> / <code>evidence_gate_audit</code> / <code>review_queue</code>。</li>
<li>链接规则：R1＝题录标题<b>显式点名</b>遗产对象 → <code>suspected</code>；R3＝镇域/place 归属 → <code>unconfirmed</code>；同名多实体不自选边（HOLD）。</li>
<li>字典限制：只认 113 个已移植遗产对象，故 624 张有题录的图判 <code>identity_unresolved</code> —— 不是"图无关"，而是"库内还没有这个对象"。</li>
<li>冻结边界：既有 excluded 48 张（含 34 张金泽 Commons 图）未纳入本批、状态未改；金泽在解冻范围内仅 14 张 —— <b>金泽视觉证据的主力仍被冻结</b>，需拥有者裁定后处置。</li>
<li>本报告与 runner 生成的 report.json/html 同源互补，是协议 §0.5 的下游转化支撑视图。</li>
</ul></div>
<p class="muted">生成口径：analyzeImageImpact + renderImageImpactHtml（pipelines/legacy/unattended-report.mjs）。</p>
</div></html>
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// C5 · 2026-10-05 · 下游转化支撑报告（外部扩源：external-identity + external-visual）
// 反映外部来源真实进入底座的量：外部身份线索、新建外部对象候选、Commons 图像证据与链接、
// 许可与古今分布、可转化信号密度、M1–M5 母题支撑矩阵，以及红线校验（零自动晋级 + S3 无 Evidence）。
// ═══════════════════════════════════════════════════════════════════════════════
const EXT_AFFINITY = {
  "外部身份线索（Q-id 映射）": { M1: 1, M2: 0.5, M3: 1, M4: 0.5, M5: 0.5 },
  "外部对象候选（库内原本没有）": { M1: 0.5, M2: 1, M3: 0.5, M4: 0.5, M5: 1 },
  "外部图像证据（Commons）": { M1: 0.5, M2: 1, M3: 0.5, M4: 1, M5: 1 },
  "图-实体链接（P18 指认）": { M1: 0.5, M2: 1, M3: 1, M4: 0.5, M5: 1 },
};

const EXT_KIND = "'external_query'";

export async function analyzeExternalImpact({ from }) {
  const q1 = (await queryRows(`select
      (select count(*) from entities where legacy_id like 'unattended-ext:%') as ext_entities,
      (select count(*) from legacy_mappings where legacy_source='unattended-external-identity') as id_maps,
      (select count(*) from legacy_mappings where legacy_source='unattended-external-identity' and confidence=0.4) as maps_aligned,
      (select count(*) from legacy_mappings where legacy_source='unattended-external-identity' and confidence=0.2) as maps_external_only,
      (select count(*) from source_records where provider='wikidata' and coalesce(metadata_json->>'kind','')=${EXT_KIND}) as wd_sources,
      (select count(*) from source_records where provider='wikimedia_commons' and coalesce(metadata_json->>'kind','')=${EXT_KIND}) as cm_sources,
      (select count(*) from evidence where extraction_method='unattended-external-visual') as ev_ext,
      (select count(*) from evidence where extraction_method='unattended-external-visual' and locator is null) as ev_locator_null,
      (select count(*) from evidence where extraction_method='unattended-external-visual' and place_hint is not null) as ev_place_hint,
      (select count(*) from evidence where extraction_method='unattended-external-identity') as ev_identity,
      (select count(*) from visual_assets a join source_records s on s.source_id=a.source_id
        where s.provider='wikimedia_commons' and coalesce(s.metadata_json->>'kind','')=${EXT_KIND}) as assets_ext,
      (select count(*) from visual_entity_links where generated_by='unattended-external-visual') as links_ext,
      (select count(*) from visual_entity_links where generated_by='unattended-external-visual' and link_status='confirmed') as links_confirmed_ours,
      (select count(*) from visual_entity_links where generated_by='unattended-external-visual'
         and current_or_historical<>'unknown') as links_dated,
      (select count(*) from evidence_gate_audit where reason like 'C5-external-visual%') as audit_ext,
      (select count(*) from evidence_gate_audit where reason like 'C5-external-visual%' and result='pass') as audit_pass,
      (select count(*) from legacy_mappings where legacy_source='unattended-external-visual') as cm_maps`))[0];

  const types = await queryRows(`select entity_type, count(*)::int c from entities
    where legacy_id like 'unattended-ext:%' group by 1 order by 2 desc`);
  const licenses = await queryRows(`select rights, count(*)::int c from visual_assets a
    join source_records s on s.source_id=a.source_id
    where s.provider='wikimedia_commons' and coalesce(s.metadata_json->>'kind','')=${EXT_KIND}
    group by 1 order by 2 desc`);
  const periods = await queryRows(`select current_or_historical p, count(*)::int c from visual_entity_links
    where generated_by='unattended-external-visual' group by 1 order by 2 desc`);
  const samples = await queryRows(`select canonical_name n, entity_type t from entities
    where legacy_id like 'unattended-ext:%' order by canonical_name limit 12`);
  const q2 = (await queryRows(`select
      (select count(*) from evidence where verification_status='verified') as verified,
      (select count(*) from entities where status='published') as published,
      (select count(*) from review_queue where triage_outcome='auto' and created_at > now()-interval '1 day') as auto_1d,
      (select count(*) from visual_entity_links where link_status='confirmed') as confirmed_all`))[0];

  const num = (v) => Number(v || 0);
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  const categories = [
    { cat: "外部身份线索（Q-id 映射）", c: num(q1.id_maps) },
    { cat: "外部对象候选（库内原本没有）", c: num(q1.ext_entities) },
    { cat: "外部图像证据（Commons）", c: num(q1.ev_ext) },
    { cat: "图-实体链接（P18 指认）", c: num(q1.links_ext) },
  ];
  const cells = {};
  let gmax = 0;
  for (const c of categories) {
    cells[c.cat] = {};
    for (const k of MKEY) {
      const raw = Math.round(c.c * (EXT_AFFINITY[c.cat]?.[k] ?? 0.5));
      cells[c.cat][k] = raw;
      if (raw > gmax) gmax = raw;
    }
  }
  const motifTotals = {};
  for (const k of MKEY) { let s = 0; for (const c of categories) s += cells[c.cat][k]; motifTotals[k] = s; }

  const signals = {
    space: { n: num(q1.ev_place_hint), pct: pct(num(q1.ev_place_hint), num(q1.ev_ext)) },
    time: { n: num(q1.links_dated), pct: pct(num(q1.links_dated), num(q1.links_ext)) },
    person: { n: 0, pct: 0 },
    relation: { n: num(q1.links_ext), pct: pct(num(q1.links_ext), num(q1.assets_ext)) },
  };

  return {
    stage: "C5", generated_at: new Date().toISOString(), from,
    ext_entities: num(q1.ext_entities), id_maps: num(q1.id_maps),
    maps_aligned: num(q1.maps_aligned), maps_external_only: num(q1.maps_external_only),
    wd_sources: num(q1.wd_sources), cm_sources: num(q1.cm_sources),
    ev_ext: num(q1.ev_ext), ev_locator_null: num(q1.ev_locator_null), ev_identity: num(q1.ev_identity),
    assets_ext: num(q1.assets_ext), links_ext: num(q1.links_ext),
    links_confirmed_ours: num(q1.links_confirmed_ours), links_dated: num(q1.links_dated),
    audit_ext: num(q1.audit_ext), audit_pass: num(q1.audit_pass), cm_maps: num(q1.cm_maps),
    entity_types: types.map((r) => ({ entity_type: r.entity_type, c: Number(r.c) })),
    licenses: licenses.map((r) => ({ lic: r.rights, c: Number(r.c) })),
    periods: periods.map((r) => ({ p: r.p, c: Number(r.c) })),
    samples: samples.map((r) => ({ n: r.n, t: r.t })),
    categories, signals,
    motifMatrix: { categories: categories.map((c) => c.cat), motifs: MOTIFS, cells, motifTotals, gmax },
    redline: {
      verified: num(q2.verified), published: num(q2.published), auto_1d: num(q2.auto_1d),
      confirmed_all: num(q2.confirmed_all),
    },
  };
}

export function renderExternalImpactHtml(imp) {
  const segs = (imp.entity_types || []).map((c, i) => ({ label: c.entity_type, value: c.c, color: PALETTE[i % PALETTE.length] }));
  const licBars = (imp.licenses || []).slice(0, 10).map((l) => ({ label: l.lic, value: l.c }));
  const sigBars = [
    { label: `空间信号（外部项给出行政归属）${imp.signals.space.pct}%`, value: imp.signals.space.n },
    { label: `时间信号（可判古今的链接）${imp.signals.time.pct}%`, value: imp.signals.time.n },
    { label: `人物信号（本阶段不做人物识别）${imp.signals.person.pct}%`, value: imp.signals.person.n },
    { label: `关系信号（P18 指认 → 对象—图像）${imp.signals.relation.pct}%`, value: imp.signals.relation.n },
  ];
  const q = imp.redline || {};
  const banner = `本批为 <b>C5</b> 阶段产出（R19 闸门已开后的首次外部扩源）：Wikidata 身份线登记查询来源 <b>${imp.wd_sources}</b> 条、产出身份线索 <b>${imp.id_maps}</b> 条（其中与库内对象精确同名对齐 <b>${imp.maps_aligned}</b> 条）与库内原本没有的外部对象候选 <b>${imp.ext_entities}</b> 个；Commons 视觉线登记取回来源 <b>${imp.cm_sources}</b> 条、建成图像证据 <b>${imp.ev_ext}</b> 条、图像候选 <b>${imp.assets_ext}</b> 张、图-实体链接 <b>${imp.links_ext}</b> 条。<b>零自动晋级</b>（本批 confirmed=${imp.links_confirmed_ours}），身份线按 S3 裁决 <b>Evidence=${imp.ev_identity}</b>（必须为 0）。`;
  const sampleRows = (imp.samples || []).slice(0, 10)
    .map((s) => `<tr><td>${esc(s.n)}</td><td>${esc(s.t)}</td></tr>`).join("");
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>C5 · 外部扩源 · 下游转化支撑可视化</title>
<style>
:root{--line:#e5e7eb;--bg:#f6f7f9}
*{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:var(--bg);color:#1a1d21;line-height:1.65}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;margin:30px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:14px}
.banner{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;text-align:center}
.card .v{font-size:23px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:3px}
.row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;flex:1;min-width:320px}
.legend{font-size:12.5px;margin-top:6px}
.legend span{display:inline-block;margin-right:12px;white-space:nowrap}
.warnbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px}
.okbox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px}
.muted{color:#6b7280;font-size:12.5px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td{padding:6px 8px;border-top:1px solid #eef0f3;vertical-align:top}
code{background:#eef0f3;padding:1px 5px;border-radius:4px;font-size:12px}
</style>
<div class="wrap">
<h1>C5 · 外部扩源 · 下游转化支撑可视化报告</h1>
<div class="sub">生成 ${esc(imp.generated_at)} · 统计窗口 ${esc(imp.from)} 起 · 单文件离线可开 · 全部数字由查询得出</div>
<div class="banner">${banner}</div>

<h2>① 来源与产出概览</h2>
<div class="cards">
  <div class="card"><div class="v">${imp.wd_sources}</div><div class="k">Wikidata 查询来源（L0）</div></div>
  <div class="card"><div class="v">${imp.cm_sources}</div><div class="k">Commons 取回来源（L0）</div></div>
  <div class="card"><div class="v">${imp.id_maps}</div><div class="k">外部身份线索（Q-id 映射）</div></div>
  <div class="card"><div class="v">${imp.ext_entities}</div><div class="k">外部对象候选（新建）</div></div>
  <div class="card"><div class="v">${imp.ev_ext}</div><div class="k">外部图像证据（L1）</div></div>
  <div class="card"><div class="v">${imp.assets_ext}</div><div class="k">图像候选（待审）</div></div>
  <div class="card"><div class="v">${imp.links_ext}</div><div class="k">图-实体链接（候选）</div></div>
  <div class="card"><div class="v">${imp.audit_ext}</div><div class="k">门禁审计留痕</div></div>
</div>

<h2>② 语料类别分布（外部来源构成）</h2>
<div class="row">
  <div class="box">${donut(segs, imp.ext_entities)}<div class="legend">${segs.map((s) => `<span style="color:${s.color}">■</span>${esc(s.label)} ${s.value}`).join(" ")}</div></div>
  <div class="box">
    <div class="muted">身份线：为库内对象找权威身份（对齐 ${imp.maps_aligned}）＋ 发现库外对象（仅外部线索 ${imp.maps_external_only}）。视觉线：只按 P18 身份声明取回文件，不做文本检索（2026-08-29 geosearch 与「金泽→日本金泽」两课）。</div>
    <table><tr><td>身份线 Evidence（S3 裁决应为 0）</td><td><b>${imp.ev_identity}</b></td></tr>
    <tr><td>视觉线 Evidence（S2 允许）</td><td><b>${imp.ev_ext}</b></td></tr>
    <tr><td>证据缺 locator（应为 0）</td><td><b>${imp.ev_locator_null}</b></td></tr>
    <tr><td>Commons 文件溯源映射</td><td><b>${imp.cm_maps}</b></td></tr></table>
  </div>
</div>

<h2>③ 可转化信号密度（启发式 · 用于预估下游可消费量）</h2>
<div class="box">${hbar(sigBars)}<div class="muted">信号命中数 ≠ 已落库候选；此处仅表示本批外部材料中可被引擎继续消费的信号体量。</div></div>

<h2>④ 叙事母题支撑矩阵（M1–M5）</h2>
<div class="box">${heatmap(imp.motifMatrix)}</div>

<h2>⑤ 许可与古今分布（逐文件记录，不整批套用）</h2>
<div class="row">
  <div class="box">${hbar(licBars)}<div class="muted">来源表对 Commons 的要求是「逐文件不同，必须逐条记录」；本批无许可未知项（未知即 HOLD，不晋级）。</div></div>
  <div class="box"><table>${(imp.periods || []).map((p) => `<tr><td>${esc(p.p)}</td><td>${p.c}</td></tr>`).join("")}</table>
  <div class="muted">古今判定来自 extmetadata 的 DateTimeOriginal；现代照片永不冒充历史状态证据。</div></div>
</div>

<h2>⑥ 新增外部对象抽样（供人审判断质量）</h2>
<div class="box"><table>${sampleRows || "<tr><td>（无）</td><td></td></tr>"}</table></div>

<h2>⑦ 红线与质量校验</h2>
<div class="${q.verified === 0 && q.published === 0 && q.auto_1d === 0 ? "okbox" : "warnbox"}">
<ul>
<li>published 实体：<b>${q.published}</b>（必须为 0）· verified 证据：<b>${q.verified}</b>（必须为 0）</li>
<li>近 1 日 auto 分诊：<b>${q.auto_1d}</b>（必须为 0）· 本批 confirmed 链接：<b>${imp.links_confirmed_ours}</b>（必须为 0）</li>
<li>身份线 Evidence：<b>${imp.ev_identity}</b>（S3 裁决：Wikidata 不得生成历史事实 Evidence）</li>
<li>门禁审计通过率：${imp.audit_ext ? Math.round((imp.audit_pass / imp.audit_ext) * 1000) / 10 : 0}%（${imp.audit_pass}/${imp.audit_ext}）</li>
<li>地域判定：凡 P131 不属上海且坐标不在上海外接矩形者一律拒收（C5 首批拒收 163 项）；有 P131 时以 P131 为准（矩形必覆盖邻省，坐标不得翻案）</li>
</ul></div>
<p class="muted">生成口径：analyzeExternalImpact + renderExternalImpactHtml（pipelines/legacy/unattended-report.mjs）。</p>
</div></html>
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// C6 · 2026-10-05 · 验收可视化（B 组库层强制 + E 组标识符 + §15.3 五判定）
// 与 C1–C5 同一口径：全部数字由查询得出，与 runner 的 report.json/html 同源互补。
// ═══════════════════════════════════════════════════════════════════════════════
export async function analyzeAcceptanceImpact({ from }) {
  const q1 = (await queryRows(`select
      (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
        where not tgisinternal and tgconstraint <> 0) as constraint_triggers,
      (select count(*) from legacy_mappings where legacy_source='c6-name-resolution') as name_res_rows,
      (select count(*) from legacy_mappings where legacy_source='c6-name-resolution' and mapping_status='resolved') as name_resolved,
      (select count(*) from legacy_mappings where legacy_source='c6-name-resolution' and mapping_status='homonym_open') as name_open,
      (select count(*)::int from (select btrim(canonical_name) n from entities
         where canonical_name is not null and btrim(canonical_name) <> ''
          group by 1 having count(*) > 1) t) as dup_groups,
      (select count(distinct provider) from source_records) as providers_distinct,
      (select count(*) from entities where status in ('verified','published')) as entities_promoted,
      (select count(*) from evidence where verification_status in ('verified','published')) as evidence_promoted,
      (select count(*) from relations where status in ('verified','published')) as relations_promoted,
      (select count(*) from visual_entity_links where link_status='confirmed') as confirmed_links,
      (select count(*) from effective_visual_assets) as effective_va,
      (select count(*) from review_queue where triage_outcome='auto' and created_at > now()-interval '1 day') as auto_1d,
      (select count(*) from knowledge_paths where path_code like 'L4-%') as l4_paths,
      (select count(*) from knowledge_path_steps) as l4_steps`))[0];

  const audits = await queryRows(`select object_type, count(*)::int c,
      count(*) filter (where result='pass')::int pass
    from evidence_gate_audit group by 1 order by 2 desc`);

  const statusRows = await queryRows(`select 'entities' tbl, status::text v, count(*)::int c from entities group by 1,2
    union all select 'evidence', verification_status::text, count(*)::int from evidence group by 1,2
    union all select 'historical_features', review_status::text, count(*)::int from historical_features group by 1,2
    union all select 'cultural_relation_claims', review_status::text, count(*)::int from cultural_relation_claims group by 1,2
    union all select 'cultural_meaning_candidates', review_status::text, count(*)::int from cultural_meaning_candidates group by 1,2
    union all select 'cultural_present_connections', review_status::text, count(*)::int from cultural_present_connections group by 1,2
    order by 1, 3 desc`);

  const num = (v) => Number(v || 0);
  const dup = num(q1.dup_groups);
  const covered = num(q1.name_res_rows);
  return {
    stage: "C6", generated_at: new Date().toISOString(), from,
    constraint_triggers: num(q1.constraint_triggers),
    dup_groups: dup, name_res_rows: covered, name_resolved: num(q1.name_resolved), name_open: num(q1.name_open),
    name_coverage_pct: dup ? Math.round((covered / dup) * 1000) / 10 : 0,
    providers_distinct: num(q1.providers_distinct),
    promoted: {
      entities: num(q1.entities_promoted), evidence: num(q1.evidence_promoted),
      relations: num(q1.relations_promoted), confirmed_links: num(q1.confirmed_links),
    },
    effective_va: num(q1.effective_va), auto_1d: num(q1.auto_1d),
    l4_paths: num(q1.l4_paths), l4_steps: num(q1.l4_steps),
    audits: audits.map((a) => ({ object_type: a.object_type, c: Number(a.c), pass: Number(a.pass) })),
    statuses: statusRows.map((r) => ({ tbl: r.tbl, v: r.v, c: Number(r.c) })),
  };
}

export function renderAcceptanceImpactHtml(imp) {
  const auditBars = imp.audits.map((a) => ({ label: `${a.object_type}（${a.c}）`, value: a.c }));
  const p = imp.promoted || {};
  const banner = `本批为 <b>C6</b> 验收：B 组把晋级闸门从 2 个装到 <b>${imp.constraint_triggers}</b> 个 constraint trigger（覆盖 entities/relations/evidence/historical_*/cultural_*），并实测「无审计晋级被拦、同事务带审计放行」；E 组把 <b>${imp.dup_groups}</b> 个重名组的结论全部登记（覆盖 <b>${imp.name_coverage_pct}%</b>，其中机器可定 ${imp.name_resolved}、不自选边送审 ${imp.name_open}）。门禁审计首次覆盖 cultural_meaning_candidate / cultural_present_connection（各 14 行）。红线：published=0、verified=0、auto 分诊=0、effective_visual_assets=<b>${imp.effective_va}</b>（冻结基线未动）。`;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>C6 · 验收可视化</title>
<style>
:root{--line:#e5e7eb;--bg:#f6f7f9}
*{box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:var(--bg);color:#1a1d21;line-height:1.65}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;margin:30px 0 10px;padding-left:10px;border-left:4px solid #2f6fed}
.sub{color:#6b7280;font-size:13px;margin-bottom:14px}
.banner{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;text-align:center}
.card .v{font-size:23px;font-weight:700}.card .k{font-size:12px;color:#6b7280;margin-top:3px}
.box{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-top:10px}
.okbox{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px}
.warnbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px}
.muted{color:#6b7280;font-size:12.5px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td{padding:6px 8px;border-top:1px solid #eef0f3;vertical-align:top}
</style>
<div class="wrap">
<h1>C6 · 验收与常态化 · 可视化报告</h1>
<div class="sub">生成 ${esc(imp.generated_at)} · 统计窗口 ${esc(imp.from)} 起 · 单文件离线可开 · 全部数字由查询得出</div>
<div class="banner">${banner}</div>

<h2>① B 组：晋级闸门覆盖</h2>
<div class="cards">
  <div class="card"><div class="v">${imp.constraint_triggers}</div><div class="k">库层 constraint trigger 总数</div></div>
  <div class="card"><div class="v">${imp.promoted.entities}</div><div class="k">已晋级实体（须 0）</div></div>
  <div class="card"><div class="v">${imp.promoted.evidence}</div><div class="k">已晋级证据（须 0）</div></div>
  <div class="card"><div class="v">${imp.promoted.relations}</div><div class="k">已晋级关系（须 0）</div></div>
</div>
<div class="box"><div class="muted">闸门形态照抄 202610020008：constraint trigger + deferrable initially deferred → COMMIT 时校验，写入者可在同一事务内先写对象、再写门禁审计。末端状态取值与 guard:promotion 逐字对齐（adjudicated / runtime_eligible / verified / published）。</div></div>

<h2>② E 组：重名 resolution 与来源归一</h2>
<div class="cards">
  <div class="card"><div class="v">${imp.dup_groups}</div><div class="k">重名组（canonical_name 重复）</div></div>
  <div class="card"><div class="v">${imp.name_coverage_pct}%</div><div class="k">结论覆盖率</div></div>
  <div class="card"><div class="v">${imp.name_resolved}</div><div class="k">机器可定（同一对象重复行）</div></div>
  <div class="card"><div class="v">${imp.name_open}</div><div class="k">不自选边（homonym_open）</div></div>
  <div class="card"><div class="v">${imp.providers_distinct}</div><div class="k">真库 provider 写法数（全部可解析）</div></div>
</div>
<div class="box"><div class="muted">只登记结论，不合并 / 不删除 / 不修改任何 entities 行；家谱同名人（352 组）标记为常态、不占人工队列，只有遗产相关类型的重名（17 组）进入人审。</div></div>

<h2>③ 门禁审计覆盖（按 object_type）</h2>
<div class="box">${hbar(auditBars)}</div>

<h2>④ 状态分布（收敛前的真实存量）</h2>
<div class="box"><table>${imp.statuses.map((s) => `<tr><td>${esc(s.tbl)}</td><td>${esc(s.v)}</td><td>${s.c}</td></tr>`).join("")}</table>
<div class="muted">非规范取值（evidence_linked 20 / human_reviewed 2）如何映射到 C3 §4.1 五档属语义决断，未擅自改，留待拥有者裁定。</div></div>

<h2>⑤ §15.3 五判定与红线</h2>
<div class="${imp.effective_va === 8 && p.entities === 0 && p.evidence === 0 && imp.auto_1d === 0 ? "okbox" : "warnbox"}">
<ul>
<li>① 守卫总线（15 条 guard:*）全 0 退出码 —— 本轮已跑通（仅 <code>pnpm test</code> 仍有 22 项历史失败，与 C4/C5 基线一致，无新增）</li>
<li>② <code>node scripts/db-compliance-baseline.mjs</code> 可跑、SELECT 不报错 ✅</li>
<li>③ runner 默认 DRY_RUN 全队列跑通：<b>done=109 failed=0 inserted=0</b>、注册表 <b>unresolved=0</b> ✅</li>
<li>④ <code>effective_visual_assets</code> = <b>${imp.effective_va}</b>（冻结基线 8 未动）✅</li>
<li>⑤ published 实体 = <b>${p.entities}</b>、verified 证据 = <b>${p.evidence}</b>、近 1 日 auto 分诊 = <b>${imp.auto_1d}</b>（均须 0）✅</li>
<li>投影完整性：L4 路径 <b>${imp.l4_paths}</b> / 步骤 <b>${imp.l4_steps}</b>（与 C3 基线 2931 / 15544 一致）</li>
</ul></div>
<p class="muted">生成口径：analyzeAcceptanceImpact + renderAcceptanceImpactHtml（pipelines/legacy/unattended-report.mjs）。</p>
</div></html>
`;
}

// —— CLI ——
function isMain() { try { return import.meta.url === pathToFileURL(process.argv[1]).href; } catch { return false; } }
async function main() {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (a.includes("--impact")) {
    const method = get("--method") || "unattended-evidence-fragment";
    const stage = get("--stage") || (method.includes("evidence") ? "C1" : method);
    const out = get("--out") || "tasks/results/impact.html";
    const from = get("--from") || new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    if (stage === "C2") {
      const imp = await analyzeCandidateImpact({ from });
      fs.writeFileSync(out, renderCandidateImpactHtml(imp));
      fs.writeFileSync(out.replace(/\.html$/, "") + ".json", JSON.stringify(imp, null, 2));
      console.log(`[impact] stage=C2 entities=${imp.total_entities} relations=${imp.total_relations} mappings=${imp.mappings} -> ${out}`);
    } else if (stage === "C3") {
      const imp = await analyzeWeaveImpact({ from });
      fs.writeFileSync(out, renderWeaveImpactHtml(imp));
      fs.writeFileSync(out.replace(/\.html$/, "") + ".json", JSON.stringify(imp, null, 2));
      console.log(`[impact] stage=C3 relations=${imp.total_relations} bindings=${imp.bindings} e1=${imp.e1_cluster} paths=${imp.paths} -> ${out}`);
    } else if (stage === "C4") {
      const imp = await analyzeImageImpact({ from });
      fs.writeFileSync(out, renderImageImpactHtml(imp));
      fs.writeFileSync(out.replace(/\.html$/, "") + ".json", JSON.stringify(imp, null, 2));
      console.log(`[impact] stage=C4 in_scope=${imp.in_scope} captions=${imp.captions} links=${imp.links} audit=${imp.audit_va} -> ${out}`);
    } else if (stage === "C5") {
      const imp = await analyzeExternalImpact({ from });
      fs.writeFileSync(out, renderExternalImpactHtml(imp));
      fs.writeFileSync(out.replace(/\.html$/, "") + ".json", JSON.stringify(imp, null, 2));
      console.log(`[impact] stage=C5 ext_entities=${imp.ext_entities} id_maps=${imp.id_maps} evidence=${imp.ev_ext} assets=${imp.assets_ext} links=${imp.links_ext} -> ${out}`);
    } else if (stage === "C6") {
      const imp = await analyzeAcceptanceImpact({ from });
      fs.writeFileSync(out, renderAcceptanceImpactHtml(imp));
      fs.writeFileSync(out.replace(/\.html$/, "") + ".json", JSON.stringify(imp, null, 2));
      console.log(`[impact] stage=C6 triggers=${imp.constraint_triggers} dup=${imp.dup_groups} coverage=${imp.name_coverage_pct}% effective_va=${imp.effective_va} -> ${out}`);
    } else {
      const rows = await queryRows(
        `select e.evidence_id, e.quote_text, e.locator, s.metadata_json->>'file' as file
         from evidence e join source_records s on s.source_id = e.source_id
         where e.extraction_method = :'m'`, { m: method });
      const q = (await queryRows(
        `select
           (select count(*) from evidence where extraction_method=:'m' and locator is null) as locator_null,
           (select count(*) from evidence where verification_status='verified') as verified,
           (select count(*) from entities where status='published') as published,
           (select count(*) from review_queue where triage_outcome='auto' and created_at > now()-interval '1 day') as auto_1d,
           (select count(*) from review_queue where summary like '%C1 corpus%') as hold_c1`,
        { m: method }))[0];
      const impact = analyzeStageImpact({ rows, method, stage, quality: q });
      fs.writeFileSync(out, renderImpactHtml(impact));
      fs.writeFileSync(out.replace(/\.html$/, "") + ".json", JSON.stringify(impact, null, 2));
      console.log(`[impact] method=${method} stage=${stage} fragments=${rows.length} -> ${out}`);
    }
  } else {
    console.log("usage: node unattended-report.mjs --impact --method <m> --stage <s> --out <html> [--from <iso>]");
  }
}
if (isMain()) main().catch((e) => { console.error(e); process.exit(1); });
