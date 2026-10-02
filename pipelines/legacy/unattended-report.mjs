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
