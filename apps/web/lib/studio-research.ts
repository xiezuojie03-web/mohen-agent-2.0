// apps/web/lib/studio-research.ts — Studio 受托研究任务（E1-2）数据访问与编排
//
// 只读/只写经 @mohen/data-access；研究核心复用 lib/mohen-agent/research.runResearch（不产生事实）。
import { queryRows, queryValue, run } from "@mohen/data-access";
import { runResearch, resolveTopic, type TopicKey } from "./mohen-agent/research";
import { triggerProduction, getProductionBlocker } from "./studio-production";
import type { AgentDecision, Material } from "@mohen/agent-runtime";
import { readJsonColumn } from "./db-json";
import { randomUUID } from "node:crypto";
import {
  createBudget,
  writeReceipt,
  getTool,
  BudgetHoldError,
  ToolExecutionUncertainError,
  ToolReceiptPersistenceError,
  type BudgetState,
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

/** External tool output/cost is uncertain, so preserve the reserved
 * amount and persist a non-retryable checkpoint. Never repeat this provider
 * call from a generic "resume" action.
 */
async function holdUncertainTool(
  taskId: string, prompt: string, topic: TopicKey, budget: BudgetState,
  error: ToolExecutionUncertainError | ToolReceiptPersistenceError
): Promise<CreatedTask> {
  const holdReason = error instanceof ToolReceiptPersistenceError
    ? "receipt_uncertain" : "execution_uncertain";
  const checkpoint = {
    prompt, topic, holdReason, budgetSpent: budget.spent,
    reserved: budget.reserved, ceiling: budget.ceiling,
    toolId: error.toolId, invocationId: error.invocationId,
    retry_requires_reconciliation: true,
  };
  await run(
    "update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
    { id: taskId, cp: JSON.stringify(checkpoint) }
  );
  await writeReceipt({
    taskId, kind: "checkpoint", stage: "hold", status: "hold", payload: checkpoint,
  });
  await addEvent(taskId, "D04", holdReason, {
    toolId: error.toolId, invocationId: error.invocationId,
    budgetSpent: budget.spent, reserved: budget.reserved,
  });
  return { taskId, status: "hold", decision: null, degraded: false,
    holdReason, researchLeads: [] };
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

    const checkpoint = { prompt, topic, degraded, decision, researchLeads, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling };
    await run(
      "update public.research_tasks set status = 'done', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
      { id: taskId!, cp: JSON.stringify(checkpoint) }
    );
    await writeReceipt({ taskId: taskId!, kind: "checkpoint", stage: "D04", status: "settled", payload: { budgetSpent: budget.spent, externalLeads: researchLeads.length } });
    await addEvent(taskId!, "D04", "research_done", { verdict: decision.verdict });
    return { taskId: taskId!, status: "done", decision, degraded, researchLeads };
  } catch (e) {
    if (e instanceof ToolExecutionUncertainError || e instanceof ToolReceiptPersistenceError)
      return holdUncertainTool(taskId!, prompt, topic, budget, e);
    if (e instanceof BudgetHoldError) {
      // CR-13：预算超限 → 持久化 checkpoint 并停；恢复需重新授权（resumeResearchTask）。
      const checkpoint = { prompt, topic, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling, holdReason: "budget", holdAt: e.checkpoint };
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
  const rows = await queryRows(
    "select prompt, status, checkpoint from public.research_tasks where task_id = :'id'",
    { id: taskId }
  );
  if (!rows.length) return { ok: false, reason: "task_not_found" };
  if (rows[0].status !== "done") return { ok: false, reason: "task_not_ready" };

  const spec = getTool("production-run");
  if (!spec || !Number.isFinite(spec.cost) || spec.cost <= 0)
    return { ok: false, reason: "production_tool_unpriced" };

  // A budget parameter from a caller is NOT a signed authorization to add
  // credits. Budget changes must first be approved and persisted on the task.
  if (extraBudget !== undefined)
    return { ok: false, reason: "additional_budget_requires_authorization" };

  // The registry and signed input contract are checked at zero cost.
  // The current production registry is not activated; this must remain HOLD.
  const blocker = getProductionBlocker();
  if (blocker) return { ok: false, reason: blocker };

  const intent = String(rows[0].prompt ?? "").trim();
  if (!intent) return { ok: false, reason: "intent_missing" };
  let saved: Record<string, unknown>;
  try { saved = readJsonColumn<Record<string, unknown>>(rows[0].checkpoint, {}); }
  catch { return { ok: false, reason: "budget_checkpoint_invalid" }; }
  if (!saved || Array.isArray(saved) || typeof saved !== "object")
    return { ok: false, reason: "budget_checkpoint_invalid" };

  const spent = Number(saved.budgetSpent);
  const reserved = Number(saved.reserved ?? 0);
  const ceiling = Number(saved.ceiling);
  if (!Number.isFinite(spent) || spent < 0 ||
      !Number.isFinite(reserved) || reserved < 0 ||
      !Number.isFinite(ceiling) || ceiling <= 0 ||
      spent + reserved > ceiling)
    return { ok: false, reason: "budget_checkpoint_required" };
  if (saved.productionReservation)
    return { ok: false, reason: "production_reservation_reconciliation_required" };
  if (ceiling - spent - reserved < spec.cost)
    return { ok: false, reason: "budget_hold" };

  const invocationId = randomUUID();
  const nextCheckpoint = {
    ...saved,
    reserved: reserved + spec.cost,
    productionReservation: {
      invocation_id: invocationId, tool_id: "production-run",
      cost: spec.cost, status: "reserved", requires_receipt_reconciliation: true,
    },
  };
  // Exactly one caller can claim a budget from this checkpoint. This CAS
  // occurs BEFORE any paid preparation or spawn in triggerProduction().
  const claimed = await queryRows(
    `update public.research_tasks
        set checkpoint = :'next'::jsonb, updated_at = now()
      where task_id = :'id' and status = 'done'
        and checkpoint = :'previous'::jsonb
      returning task_id`,
    {
      id: taskId, previous: JSON.stringify(saved),
      next: JSON.stringify(nextCheckpoint),
    }
  );
  if (!claimed.length) return { ok: false, reason: "production_reservation_conflict" };

  try {
    await writeReceipt({
      taskId, kind: "tool", stage: "D00",
      toolId: "production-run", cost: spec.cost, status: "reserved",
      payload: { invocation_id: invocationId, terms: terms ?? [] },
    });
  } catch {
    // The checkpoint already holds the reservation. Never call the Runner
    // or optimistically restore the budget if DB receipt status is unknown.
    return { ok: false, reason: "production_reservation_receipt_uncertain" };
  }

  let trig: { runId: string; started: boolean; reason?: string };
  try { trig = await triggerProduction(taskId, intent); }
  catch {
    trig = { runId: "", started: false, reason: "production_start_uncertain" };
  }
  if (!trig.started) {
    try {
      await writeReceipt({
        taskId, kind: "tool", stage: "D00",
        toolId: "production-run", cost: spec.cost, status: "hold",
        payload: {
          invocation_id: invocationId, run_id: trig.runId || null,
          reason: trig.reason || "production_not_started",
          retry_requires_reconciliation: true,
        },
      });
    } catch {
      // Preserve the existing reservation even if HOLD write also fails.
    }
    return { ok: false, reason: trig.reason || "production_start_uncertain", run_id: trig.runId };
  }

  // The cost remains reserved until the real Runner result is reconciled.
  // "started" does not mean a charged operation is safely settled.
  return { ok: true, run_id: trig.runId };
}

/** CR-13：预算恢复 / 重试需显式授权。追加预算后从 checkpoint 续跑。 */
export async function resumeResearchTask(
  taskId: string,
  additionalCeiling?: number
): Promise<CreatedTask> {
  const row = await queryRows(
    "select prompt, topic, checkpoint from public.research_tasks where task_id = :'id' and status = 'hold'",
    { id: taskId }
  );
  if (!row.length) {
    return { taskId, status: "hold", decision: null, degraded: false, holdReason: "not_hold", researchLeads: [] };
  }

  const prompt = String(row[0].prompt ?? "");
  const topic = resolveTopic(row[0].topic);
  const saved = readJsonColumn<Record<string, unknown>>(row[0].checkpoint, {});
  // A tool may have executed and charged without a committed receipt.
  // Such checkpoints cannot be restarted by adding budget.
  if (saved.retry_requires_reconciliation === true ||
      saved.holdReason === "execution_uncertain" ||
      saved.holdReason === "receipt_uncertain")
    return { taskId, status: "hold", decision: null, degraded: false,
      holdReason: "reconciliation_required", researchLeads: [] };
  // This implementation starts runResearch at its first tool; replaying
  // steps that already spent money is unsafe until per-step resume exists.
  const spent = Number(saved.budgetSpent ?? 0);
  const previousCeiling = Number(saved.ceiling ?? 0);
  if (!Number.isFinite(spent) || spent < 0 ||
      !Number.isFinite(previousCeiling) || previousCeiling <= 0 ||
      spent > 0 || saved.reserved !== 0 && saved.reserved !== undefined)
    return { taskId, status: "hold", decision: null, degraded: false,
      holdReason: "resume_step_checkpoint_required", researchLeads: [] };
  if (typeof additionalCeiling !== "number" || !Number.isFinite(additionalCeiling) || additionalCeiling <= 0)
    return { taskId, status: "hold", decision: null, degraded: false,
      holdReason: "additional_budget_required", researchLeads: [] };
  const authorizedCeiling = previousCeiling + additionalCeiling!;
  await run(
    "update public.research_tasks set status = 'running', updated_at = now() where task_id = :'id'",
    { id: taskId }
  );
  await addEvent(taskId, "D04", "resumed", { additionalCeiling: additionalCeiling ?? null });

  const budget = createBudget(authorizedCeiling);
  const ledger: Ledger = { taskId, budget };
  try {
    const { decision, degraded, researchLeads } = await runResearch(prompt, topic, ledger);
    const checkpoint = { prompt, topic, degraded, decision, researchLeads, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling };
    await run(
      "update public.research_tasks set status = 'done', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
      { id: taskId, cp: JSON.stringify(checkpoint) }
    );
    await writeReceipt({ taskId, kind: "checkpoint", stage: "D04", status: "settled", payload: { budgetSpent: budget.spent } });
    await addEvent(taskId, "D04", "research_done", { verdict: decision.verdict });
    return { taskId, status: "done", decision, degraded, researchLeads };
  } catch (e) {
    if (e instanceof ToolExecutionUncertainError || e instanceof ToolReceiptPersistenceError)
      return holdUncertainTool(taskId!, prompt, topic, budget, e);
    if (e instanceof BudgetHoldError) {
      const checkpoint = { prompt, topic, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling, holdReason: "budget", holdAt: e.checkpoint };
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

/** Continue one Studio task with a new question, not a replay of the
 * previous charged steps. A durable budget and an atomic state claim are
 * required, so two simultaneous requests cannot both spend the same credit.
 */
export async function appendResearchMessage(
  taskId: string, message: string
): Promise<{ ok: boolean; reason?: string }> {
  const rows = await queryRows(
    "select topic, status, checkpoint from public.research_tasks where task_id = :'id'",
    { id: taskId }
  );
  if (!rows.length) return { ok: false, reason: "task_not_found" };
  if (rows[0].status !== "done") return { ok: false, reason: "task_not_ready" };
  let saved: Record<string, unknown>;
  try { saved = readJsonColumn<Record<string, unknown>>(rows[0].checkpoint, {}); }
  catch { return { ok: false, reason: "budget_checkpoint_invalid" }; }
  const spent = Number(saved.budgetSpent);
  const reserved = Number(saved.reserved ?? 0);
  const ceiling = Number(saved.ceiling);
  if (!Number.isFinite(spent) || spent < 0 ||
      !Number.isFinite(reserved) || reserved !== 0 ||
      !Number.isFinite(ceiling) || ceiling <= 0 || spent > ceiling) {
    return { ok: false, reason: "budget_checkpoint_required" };
  }

  const claimed = await queryRows(
    "update public.research_tasks set status = 'running', updated_at = now() where task_id = :'id' and status = 'done' returning task_id",
    { id: taskId }
  );
  if (!claimed.length) return { ok: false, reason: "task_state_conflict" };

  const topic = resolveTopic(rows[0].topic);
  const budget: BudgetState = { ceiling, reserved, spent };
  try {
    const { decision, degraded, researchLeads } = await runResearch(
      message, topic, { taskId, budget }
    );
    const checkpoint = {
      prompt: message, topic, degraded, decision, researchLeads,
      budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling,
    };
    await run(
      "update public.research_tasks set status = 'done', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id' and status = 'running'",
      { id: taskId, cp: JSON.stringify(checkpoint) }
    );
    await addEvent(taskId, "D04", "message_appended", {
      degraded, budgetSpent: budget.spent,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ToolExecutionUncertainError ||
        error instanceof ToolReceiptPersistenceError) {
      const result = await holdUncertainTool(taskId, message, topic, budget, error);
      return { ok: false, reason: result.holdReason };
    }
    if (error instanceof BudgetHoldError) {
      const checkpoint = {
        prompt: message, topic, budgetSpent: budget.spent,
        reserved: budget.reserved, ceiling: budget.ceiling,
        holdReason: "budget", holdAt: error.checkpoint,
      };
      await run(
        "update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
        { id: taskId, cp: JSON.stringify(checkpoint) }
      );
      await writeReceipt({
        taskId, kind: "checkpoint", stage: "hold", status: "hold", payload: checkpoint,
      });
      return { ok: false, reason: "budget_hold" };
    }
    // Unknown research failure may also have reached a remote provider.
    // Do not auto-resume or silently treat spent as zero.
    const checkpoint = {
      prompt: message, topic, budgetSpent: budget.spent,
      reserved: budget.reserved, ceiling: budget.ceiling,
      holdReason: "research_failed_review_required",
      retry_requires_reconciliation: true,
    };
    await run(
      "update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
      { id: taskId, cp: JSON.stringify(checkpoint) }
    );
    return { ok: false, reason: "research_failed_review_required" };
  }
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
