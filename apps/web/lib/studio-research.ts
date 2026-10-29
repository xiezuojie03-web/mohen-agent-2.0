// apps/web/lib/studio-research.ts — Studio 受托研究任务（E1-2）数据访问与编排
//
// 只读/只写经 @mohen/data-access；研究核心复用 lib/mohen-agent/research.runResearch（不产生事实）。
import { queryRows, queryValue, run } from "@mohen/data-access";
import { runResearch, resolveTopic, type TopicKey } from "./mohen-agent/research";
import { triggerProduction } from "./studio-production";
import type { AgentDecision, Material } from "@mohen/agent-runtime";
import {
  createBudget,
  writeReceipt,
  getTool,
  BudgetHoldError,
  type Ledger,
} from "./studio/tool-ledger";

async function addEvent(taskId: string, stage: string, event: string, payload: unknown) {
  await run(
    "insert into public.research_events (task_id, stage, event, payload) values (:'id', :'stage', :'event', :'payload'::jsonb)",
    { id: taskId, stage, event, payload: JSON.stringify(payload ?? {}) }
  );
}

export interface CreatedTask {
  taskId: string;
  status: "done" | "hold";
  decision: AgentDecision | null;
  degraded: boolean;
  holdReason?: "budget" | string;
  researchLeads: Material[];
}

/** 创建研究任务并同步运行一次研究（预算工具路由）。返回 task_id + 研究结果，或预算 HOLD。 */
export async function createResearchTask(
  prompt: string,
  topic: TopicKey,
  ownerUserId: string,
  workId?: string,
  budgetCeiling?: number
): Promise<CreatedTask> {
  const taskId = await queryValue("select gen_random_uuid()::text");
  await run(
    "insert into public.research_tasks (task_id, work_id, topic, prompt, status, owner_user_id) values (:'id', :'work', :'topic', :'prompt', 'running', :'owner')",
    { id: taskId!, work: workId ?? null, topic, prompt, owner: ownerUserId }
  );
  await addEvent(taskId!, "D04", "task_created", { prompt, topic });

  const budget = createBudget(budgetCeiling);
  const ledger: Ledger = { taskId: taskId!, budget };

  try {
    const { decision, degraded, researchLeads } = await runResearch(prompt, topic, ledger);
    await addEvent(taskId!, "D04", "retrieved", {
      materials: decision.materials.length,
      externalLeads: researchLeads.length,
      degraded,
    });

    const checkpoint = { prompt, topic, degraded, decision, researchLeads, budgetSpent: budget.spent };
    await run(
      "update public.research_tasks set status = 'done', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
      { id: taskId!, cp: JSON.stringify(checkpoint) }
    );
    await writeReceipt({ taskId: taskId!, kind: "checkpoint", stage: "D04", status: "settled", payload: { budgetSpent: budget.spent, externalLeads: researchLeads.length } });
    await addEvent(taskId!, "D04", "research_done", { verdict: decision.verdict });
    return { taskId: taskId!, status: "done", decision, degraded, researchLeads };
  } catch (e) {
    if (e instanceof BudgetHoldError) {
      // CR-13：预算超限 → 持久化 checkpoint 并停；恢复需重新授权（resumeResearchTask）。
      const checkpoint = { prompt, topic, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling, holdAt: e.checkpoint };
      await run(
        "update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
        { id: taskId!, cp: JSON.stringify(checkpoint) }
      );
      await writeReceipt({ taskId: taskId!, kind: "checkpoint", stage: "hold", status: "hold", payload: checkpoint });
      await addEvent(taskId!, "D04", "budget_hold", checkpoint);
      return { taskId: taskId!, status: "hold", decision: null, degraded: false, holdReason: "budget", researchLeads: [] };
    }
    throw e;
  }
}

/**
 * D 阶段触发（governed interface，CR-16）：从 Studio 经受控接口发起生产，不逐主题改代码。
 * 真实触发：child_process spawn `run.mjs`（唯一生产入口），异步跑 D00–D05；run_id 关联 research_task。
 */
export async function requestProduction(
  taskId: string,
  terms?: string[],
  extraBudget?: number
): Promise<{ ok: boolean; reason?: string; run_id?: string }> {
  const row = await queryRows(
    "select prompt from public.research_tasks where task_id = :'id'",
    { id: taskId }
  );
  if (!row.length) return { ok: false, reason: "task_not_found" };

  const intent = String(row[0].prompt ?? "");
  if (!intent.trim()) return { ok: false, reason: "intent_missing" };

  const spec = getTool("production-run");
  if (!spec) return { ok: false, reason: "no_route" };

  // 真实生产触发（异步 spawn run.mjs），不再只落回执。
  const trig = await triggerProduction(taskId, intent.trim());
  if (!trig.started) return { ok: false, reason: trig.reason, run_id: trig.runId };

  await writeReceipt({
    taskId,
    kind: "d_stage",
    stage: "D00",
    toolId: "production-run",
    cost: spec.cost,
    status: "reserved",
    payload: { terms: terms ?? [], extraBudget: extraBudget ?? null, run_id: trig.runId, note: "production_triggered" },
  });
  return { ok: true, run_id: trig.runId };
}

/** CR-13：预算恢复 / 重试需显式授权。追加预算后从 checkpoint 续跑。 */
export async function resumeResearchTask(
  taskId: string,
  additionalCeiling?: number
): Promise<CreatedTask> {
  const row = await queryRows(
    "select prompt, topic from public.research_tasks where task_id = :'id' and status = 'hold'",
    { id: taskId }
  );
  if (!row.length) {
    return { taskId, status: "hold", decision: null, degraded: false, holdReason: "not_hold", researchLeads: [] };
  }

  const prompt = String(row[0].prompt ?? "");
  const topic = resolveTopic(row[0].topic);
  await run(
    "update public.research_tasks set status = 'running', updated_at = now() where task_id = :'id'",
    { id: taskId }
  );
  await addEvent(taskId, "D04", "resumed", { additionalCeiling: additionalCeiling ?? null });

  const budget = createBudget(additionalCeiling);
  const ledger: Ledger = { taskId, budget };
  try {
    const { decision, degraded, researchLeads } = await runResearch(prompt, topic, ledger);
    const checkpoint = { prompt, topic, degraded, decision, researchLeads, budgetSpent: budget.spent };
    await run(
      "update public.research_tasks set status = 'done', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
      { id: taskId, cp: JSON.stringify(checkpoint) }
    );
    await writeReceipt({ taskId, kind: "checkpoint", stage: "D04", status: "settled", payload: { budgetSpent: budget.spent } });
    await addEvent(taskId, "D04", "research_done", { verdict: decision.verdict });
    return { taskId, status: "done", decision, degraded, researchLeads };
  } catch (e) {
    if (e instanceof BudgetHoldError) {
      const checkpoint = { prompt, topic, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling, holdAt: e.checkpoint };
      await run(
        "update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
        { id: taskId, cp: JSON.stringify(checkpoint) }
      );
      await writeReceipt({ taskId, kind: "checkpoint", stage: "hold", status: "hold", payload: checkpoint });
      return { taskId, status: "hold", decision: null, degraded: false, holdReason: "budget", researchLeads: [] };
    }
    throw e;
  }
}

/** 追加消息并再跑一次研究（更新 checkpoint） */
export async function appendResearchMessage(taskId: string, message: string): Promise<boolean> {
  const row = await queryRows(
    "select topic from public.research_tasks where task_id = :'id'",
    { id: taskId }
  );
  if (!row.length) return false;
  const topic = resolveTopic(row[0].topic);
  const { decision, degraded, researchLeads } = await runResearch(message, topic);
  await addEvent(taskId, "D04", "message_appended", { message, degraded });
  const checkpoint = { prompt: message, topic, degraded, decision, researchLeads };
  await run(
    "update public.research_tasks set checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
    { id: taskId, cp: JSON.stringify(checkpoint) }
  );
  return true;
}

/** 列出当前用户最近研究任务（供 Studio 任务列表）。P0-1：按 owner 过滤。 */
export function listResearchTasks(ownerUserId: string) {
  return queryRows(
    "select task_id::text as task_id, work_id::text as work_id, topic, prompt, status, created_at::text as created_at, updated_at::text as updated_at from public.research_tasks where owner_user_id = :'owner' order by created_at desc limit 50",
    { owner: ownerUserId }
  );
}

export async function getTaskStatus(taskId: string) {
  const rows = await queryRows(
    "select task_id::text as task_id, topic, prompt, status, checkpoint, created_at::text as created_at, updated_at::text as updated_at from public.research_tasks where task_id = :'id'",
    { id: taskId }
  );
  return rows[0] ?? null;
}

export async function getTaskEvents(taskId: string) {
  return queryRows(
    "select id::text as id, stage, event, payload, created_at::text as created_at from public.research_events where task_id = :'id' order by created_at asc",
    { id: taskId }
  );
}

export async function getTaskStageEvents(taskId: string, stage: string) {
  return queryRows(
    "select id::text as id, stage, event, payload, created_at::text as created_at from public.research_events where task_id = :'id' and stage = :'stage' order by created_at asc",
    { id: taskId, stage }
  );
}
