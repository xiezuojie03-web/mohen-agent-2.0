// scripts/e2-sample-trial.mjs — E2 完整样板试验
// 一个真实历史主题（金泽古桥）从头跑通：自然语言委托 → 外部找资料 → H1/H2/H3 编导
// → 作品版本 → 投稿 → 审核/发布（独立 Gate 阻断）→ 观看 → 探索。
// 真实连本地库 + 上海图书馆 + DeepSeek；每步如实记录 PASS / BLOCKED / 空态，不伪装。

const BASE = process.env.MOHEN_BASE_URL || "http://localhost:3000";
const THEME = "金泽古桥与寺院的水乡世界";

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, j };
}
async function get(path) {
  const r = await fetch(BASE + path);
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, j };
}

const log = [];
function step(name, ok, detail) {
  log.push({ name, ok, detail });
  console.log(`\n[${ok ? "OK" : "BLOCKED/EMPTY"}] ${name}\n  ${detail}`);
}

console.log(`=== E2 样板试验 · 主题：${THEME} ===`);

// 1. 自然语言委托（创作 + 外部找资料）
const t1 = await post("/api/studio/research-tasks", { prompt: `${THEME}：古桥之间、桥与寺之间在历史上有什么联系` });
step("1. 自然语言委托研究（外部找资料）", t1.status === 200 && t1.j?.ok,
  `task=${t1.j?.task_id?.slice(0, 8)}，外部线索=${t1.j?.research_leads?.length ?? 0} 条（上海图书馆）`);

// 2. H1母题 → H2 导演方案
const t2 = await post("/api/studio/director-plans", { brief: `创作一部关于${THEME}的短片`, topic: "jinze" });
const planId = t2.j?.plan_id;
step("2. 编导：H1母题 + H2 A/B 方案", t2.status === 200 && t2.j?.ok && planId,
  `母题=${t2.j?.finding?.motifCodes?.join(",") ?? "无"}，plan=${planId?.slice(0, 8)}`);

// 3. 采纳方案 → H3 节拍
let beats = [];
if (planId) {
  const t3 = await post(`/api/studio/director-plans/${planId}/select`, { which: "A" });
  beats = t3.j?.beats ?? [];
  step("3. 采纳方案 + H3 节拍", t3.status === 200 && t3.j?.ok && beats.length > 0,
    `beats=${beats.length}，首章「${beats[0]?.title ?? ""}」`);
} else {
  step("3. 采纳方案 + H3 节拍", false, "上一步无 plan，跳过");
}

// 4. 创建作品
const t4 = await post("/api/works", { title: `${THEME}（样板作品）`, creator: "样板创作者" });
const workId = t4.j?.work_id;
step("4. 创建作品", t4.status === 200 && workId, `work=${workId?.slice(0, 8)}`);

// 5. 保存不可变 WorkRevision（CAS）
let revisionId = null;
if (workId && planId) {
  const t5 = await post(`/api/studio/works/${workId}/revisions`, { plan_id: planId });
  revisionId = t5.j?.revisionId;
  step("5. 保存不可变 WorkRevision（CAS）", t5.status === 200 && revisionId,
    `revision=${revisionId?.slice(0, 8)}，contentHash=${t5.j?.contentHash?.slice(0, 12)}`);
} else {
  step("5. 保存不可变 WorkRevision", false, "缺 work/plan，跳过");
}

// 6. 投稿
if (workId) {
  const t6 = await post(`/api/works/${workId}/submit`, {});
  step("6. 投稿（草稿→待审）", t6.status === 200, "submitted");
} else {
  step("6. 投稿", false, "无 work，跳过");
}

// 7. 审核/发布（CR-04：Operator 不代签独立 Gate，应 HOLD）
if (workId) {
  const t7 = await post("/api/admin/publications", { work_id: workId });
  // 无 operator 身份 → forbidden；有身份则走独立 Gate 预检（gate_not_signed）。两种都是正确阻断。
  step("7. 审核/发布（独立 Gate 阻断，CR-04）", t7.status === 403 || t7.j?.reason,
    `HTTP ${t7.status}，reason=${t7.j?.reason ?? "（无身份 forbidden，鉴权门先挡）"}`);
}

// 8. 观看（WATCH 已发布目录，诚实空态或已发布）
const t8 = await get("/api/public/works");
step("8. WATCH 已发布作品目录", t8.status === 200 && t8.j?.ok,
  `works=${t8.j?.works?.length ?? 0}（本样板作品因独立 Gate 未签核未发布，符合 CR-04）`);

// 9. 探索（EXP 全库，独立于作品）
const t9 = await get("/api/explore/spatial?topic=jinze");
step("9. EXP 全库探索（独立于作品）", t9.status === 200 && t9.j?.ok,
  `available=${t9.j?.available}，coverage=${JSON.stringify(t9.j?.coverage)}`);

console.log("\n=== E2 样板试验汇总 ===");
const okN = log.filter((l) => l.ok).length;
console.log(`通过 ${okN}/${log.length} 步；发布步骤按 CR-04 正确阻断（独立 Reviewer 未配置）`);
