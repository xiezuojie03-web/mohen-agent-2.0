// apps/web/lib/studio-research.ts — Studio 受托研究任务（E1-2）数据访问与编排
//
// 研究意图先绑定项目与不可变 research_brief，再进入工具路由；runResearch 不产生事实。
import { queryRows, queryValue, run } from "@mohen/data-access";
import { runResearch, resolveTopic, type TopicKey } from "./mohen-agent/research";
import { triggerProduction, getProductionBlocker } from "./studio-production";
import type { AgentDecision, Material } from "@mohen/agent-runtime";
import { readJsonColumn } from "./db-json";
import { createHash, randomUUID } from "node:crypto";
import { studioAssetStore } from "./studio-assets";
import {ResearchPrerequisiteHold} from './mohen-agent/research-prerequisites';
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
  missingRequirements?: string[];
  researchLeads: Material[];
  replayed?: boolean;
  materialRead?: {state:string;reason?:string};
  briefAssetRef?: {asset_id:string;revision_id:string;revision_no:number};
}

type StudioBriefBinding = {
  projectId: string;
  projectScope: Record<string,unknown>;
  sessionToken: string;
  idempotencyKey: string;
};

function deterministicUuid(seed:string):string {
  const chars=createHash('sha256').update(seed).digest('hex').slice(0,32).split('');
  chars[12]='5';
  chars[16]=((parseInt(chars[16],16)&3)|8).toString(16);
  const hex=chars.join('');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}

function briefRef(studio:unknown):CreatedTask['briefAssetRef'] {
  if(!studio||typeof studio!=='object'||Array.isArray(studio))return undefined;
  const ref=(studio as Record<string,unknown>).brief_asset_ref;
  if(!ref||typeof ref!=='object'||Array.isArray(ref))return undefined;
  const v=ref as Record<string,unknown>;
  if(typeof v.asset_id!=='string'||typeof v.revision_id!=='string'||typeof v.revision_no!=='number')return undefined;
  return {asset_id:v.asset_id,revision_id:v.revision_id,revision_no:v.revision_no};
}

async function taskResult(taskId:string,status:string,saved:Record<string,unknown>,replayed=true,sessionToken?:string):Promise<CreatedTask> {
  const {currentTaskCheckpoint}=await import("./studio-task-material-read");
  const checkpoint=await currentTaskCheckpoint(saved,sessionToken);
  const normalized=status==='done'?'done':'hold';
  return {
    taskId,status:normalized,decision:normalized==='done'?(checkpoint.decision as AgentDecision??null):null,
    degraded:checkpoint.degraded===true,
    holdReason:typeof checkpoint.holdReason==='string'?checkpoint.holdReason:
      (status==='running'?'task_in_progress':undefined),
    missingRequirements:Array.isArray(checkpoint.missingRequirements)?checkpoint.missingRequirements.map(String):[],
    researchLeads:Array.isArray(checkpoint.researchLeads)?checkpoint.researchLeads as Material[]:[],
    replayed,briefAssetRef:briefRef(checkpoint.studio),
    materialRead:checkpoint.materialRead as CreatedTask["materialRead"],
  };
}

async function holdResearchPrerequisites(
  taskId:string,prompt:string,topic:TopicKey,budget:BudgetState,error:ResearchPrerequisiteHold,
  studioContext:Record<string,unknown>={}
):Promise<CreatedTask> {
  const checkpoint={prompt,topic,holdReason:'research_prerequisites',missingRequirements:error.missingRequirements,
    partial_result:error.partialResult,budgetSpent:budget.spent,reserved:budget.reserved,ceiling:budget.ceiling,
    holdAt:{toolId:'llm-understand'},retry_requires_reconciliation:false,studio:studioContext};
  await run("update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
    {id:taskId,cp:JSON.stringify(checkpoint)});
  await writeReceipt({taskId,kind:'checkpoint',stage:'hold',status:'hold',payload:checkpoint});
  await addEvent(taskId,'research','prerequisites_hold',{missingRequirements:error.missingRequirements,budgetSpent:budget.spent,reserved:budget.reserved});
  return {taskId,status:'hold',decision:null,degraded:true,holdReason:'research_prerequisites',
    missingRequirements:error.missingRequirements,researchLeads:[],briefAssetRef:briefRef(studioContext)};
}

/** External tool output/cost is uncertain; preserve reservation and never blindly replay. */
async function holdUncertainTool(
  taskId:string,prompt:string,topic:TopicKey,budget:BudgetState,
  error:ToolExecutionUncertainError|ToolReceiptPersistenceError,studioContext:Record<string,unknown>={}
):Promise<CreatedTask> {
  const holdReason=error instanceof ToolReceiptPersistenceError?'receipt_uncertain':'execution_uncertain';
  const checkpoint={prompt,topic,holdReason,budgetSpent:budget.spent,reserved:budget.reserved,ceiling:budget.ceiling,
    toolId:error.toolId,invocationId:error.invocationId,retry_requires_reconciliation:true,studio:studioContext};
  await run("update public.research_tasks set status='hold',checkpoint=:'cp'::jsonb,updated_at=now() where task_id=:'id'",
    {id:taskId,cp:JSON.stringify(checkpoint)});
  await writeReceipt({taskId,kind:'checkpoint',stage:'hold',status:'hold',payload:checkpoint});
  await addEvent(taskId,'D04',holdReason,{toolId:error.toolId,invocationId:error.invocationId,
    budgetSpent:budget.spent,reserved:budget.reserved});
  return {taskId,status:'hold',decision:null,degraded:false,holdReason,researchLeads:[],
    briefAssetRef:briefRef(studioContext)};
}

/** ST-01: persist one immutable project-scoped brief before any research/provider call.
 * The request UUID is also the task ID, so an acknowledgement retry resolves the same task.
 */
export async function createResearchTask(
  prompt:string,topic:TopicKey,ownerUserId:string,workId?:string,budgetCeiling?:number,
  binding?:StudioBriefBinding
):Promise<CreatedTask> {
  if(!binding||typeof binding.sessionToken!=='string'||!binding.sessionToken||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(binding.projectId)||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(binding.idempotencyKey))
    throw new Error('STUDIO_PROJECT_REQUIRED');
  const taskId=binding.idempotencyKey;
  const requestHash=createHash('sha256').update(JSON.stringify({
    ownerUserId,projectId:binding.projectId,prompt,topic,workId:workId??null,
    projectScope:binding.projectScope,
  })).digest('hex');
  const briefAssetId=deterministicUuid('mohen.studio.research_brief.v1:'+taskId);
  const budget=createBudget(budgetCeiling);
  const initialStudio={
    schema:'mohen.studio-workflow-request.v1',request_id:taskId,request_hash:requestHash,
    project_id:binding.projectId,brief_asset_id:briefAssetId,brief_asset_ref:null,state:'BRIEF_PENDING',
  };
  const initialCheckpoint={prompt,topic,work_id:workId??null,holdReason:'brief_asset_pending',
    budgetSpent:budget.spent,reserved:budget.reserved,ceiling:budget.ceiling,studio:initialStudio};

  let existing=await queryRows(
    "select task_id::text as task_id,owner_user_id::text as owner_user_id,status,checkpoint from public.research_tasks where task_id=:'id'",
    {id:taskId});
  if(existing.length) {
    if(existing[0].owner_user_id!==ownerUserId)throw new Error('STUDIO_RESEARCH_TASK_NOT_FOUND');
    let saved:Record<string,unknown>;
    try{saved=readJsonColumn<Record<string,unknown>>(existing[0].checkpoint,{});}catch{throw new Error('STUDIO_RESEARCH_TASK_IDEMPOTENCY_CONFLICT');}
    const studio=saved.studio&&typeof saved.studio==='object'&&!Array.isArray(saved.studio)
      ?saved.studio as Record<string,unknown>:{};
    if(studio.request_hash!==requestHash||studio.project_id!==binding.projectId)
      throw new Error('STUDIO_RESEARCH_TASK_IDEMPOTENCY_CONFLICT');
    const pending=existing[0].status==='hold'&&studio.state==='BRIEF_PENDING';
    if(!pending)return taskResult(taskId,String(existing[0].status),saved,true,binding.sessionToken);
  } else {
    const inserted=await queryRows(
      "insert into public.research_tasks(task_id,work_id,topic,prompt,status,owner_user_id,checkpoint) " +
      "values(:'id',:'work',:'topic',:'prompt','hold',:'owner',:'cp'::jsonb) on conflict(task_id) do nothing returning task_id::text as task_id",
      {id:taskId,work:workId??null,topic,prompt,owner:ownerUserId,cp:JSON.stringify(initialCheckpoint)});
    if(inserted.length)await addEvent(taskId,'studio','task_created',{prompt,topic,project_id:binding.projectId,request_hash:requestHash});
    else {
      existing=await queryRows(
        "select task_id::text as task_id,owner_user_id::text as owner_user_id,status,checkpoint from public.research_tasks where task_id=:'id'",
        {id:taskId});
      if(!existing.length||existing[0].owner_user_id!==ownerUserId)throw new Error('STUDIO_RESEARCH_TASK_NOT_FOUND');
      const saved=readJsonColumn<Record<string,unknown>>(existing[0].checkpoint,{});
      const studio=saved.studio&&typeof saved.studio==='object'&&!Array.isArray(saved.studio)
        ?saved.studio as Record<string,unknown>:{};
      if(studio.request_hash!==requestHash||studio.project_id!==binding.projectId)
        throw new Error('STUDIO_RESEARCH_TASK_IDEMPOTENCY_CONFLICT');
      if(!(existing[0].status==='hold'&&studio.state==='BRIEF_PENDING'))
        return taskResult(taskId,String(existing[0].status),saved,true,binding.sessionToken);
    }
  }

  // Replaying the same request reuses both the task UUID and brief asset UUID/key.
  const briefPayload={
    schema:'mohen.studio-research-brief.v1',question:prompt,topic,purpose:'research_and_creation',
    audience:null,audience_state:'not_specified',project_scope:binding.projectScope,work_id:workId??null,
  };
  const taskSnapshot={schema:'mohen.studio-task-snapshot.v1',task_id:taskId,owner_user_id:ownerUserId,
    project_id:binding.projectId,request_hash:requestHash,prompt,topic,work_id:workId??null};
  let brief;
  try {
    brief=await studioAssetStore().saveRevision({
      projectId:binding.projectId,assetId:briefAssetId,kind:'research_brief',expectedRevisionId:null,
      idempotencyKey:'st01:brief:'+taskId,payload:briefPayload,sourceRefs:[],dependencyRefs:[],
      originTaskId:taskId,originTaskSnapshot:taskSnapshot,
    },binding.sessionToken);
  } catch(error) {
    const failureCheckpoint={...initialCheckpoint,holdReason:'brief_asset_persistence_failed',
      failureCode:error instanceof Error&&/^STUDIO_[A-Z0-9_]+$/.test(error.message)?error.message:'ASSET_PERSISTENCE_UNAVAILABLE'};
    await run("update public.research_tasks set status='hold',checkpoint=:'cp'::jsonb,updated_at=now() where task_id=:'id' and status='hold'",
      {id:taskId,cp:JSON.stringify(failureCheckpoint)});
    await addEvent(taskId,'studio','brief_asset_persistence_hold',{failureCode:failureCheckpoint.failureCode});
    return {taskId,status:'hold',decision:null,degraded:false,holdReason:'brief_asset_persistence_failed',
      missingRequirements:['RESEARCH_BRIEF_ASSET_PERSISTENCE_FAILED'],researchLeads:[]};
  }

  const studioContext={...initialStudio,state:'BRIEF_SAVED',brief_asset_ref:{
    asset_id:brief.asset_id,revision_id:brief.revision_id,revision_no:brief.revision_no,
  }};
  const runningCheckpoint={...initialCheckpoint,holdReason:'research_running',studio:studioContext};
  const claimed=await queryRows(
    "update public.research_tasks set status='running',checkpoint=:'cp'::jsonb,updated_at=now() " +
    "where task_id=:'id' and owner_user_id=:'owner' and status='hold' " +
    "and checkpoint->'studio'->>'request_hash'=:'hash' and checkpoint->'studio'->>'state'='BRIEF_PENDING' " +
    "returning task_id::text as task_id",
    {id:taskId,owner:ownerUserId,hash:requestHash,cp:JSON.stringify(runningCheckpoint)});
  if(!claimed.length) {
    const current=await queryRows(
      "select status,checkpoint from public.research_tasks where task_id=:'id' and owner_user_id=:'owner'",
      {id:taskId,owner:ownerUserId});
    if(!current.length)throw new Error('STUDIO_RESEARCH_TASK_NOT_FOUND');
    const cp=readJsonColumn<Record<string,unknown>>(current[0].checkpoint,{});
    return taskResult(taskId,String(current[0].status),cp,true,binding.sessionToken);
  }
  await addEvent(taskId,'studio','brief_asset_saved',studioContext.brief_asset_ref as Record<string,unknown>);
  await addEvent(taskId,'D04','research_started',{project_id:binding.projectId,brief_asset_ref:studioContext.brief_asset_ref});

  const ledger:Ledger={taskId,budget};
  try {
    const {decision,degraded,researchLeads}=await runResearch(prompt,topic,ledger);
    if(degraded)throw new ResearchPrerequisiteHold(['SOURCE_OR_QUALIFICATION_UNAVAILABLE'],{decision,degraded,researchLeads});
    await addEvent(taskId,'D04','retrieved',{materials:decision.materials.length,externalLeads:researchLeads.length,degraded});
    const checkpoint={prompt,topic,degraded,decision,researchLeads,budgetSpent:budget.spent,
      reserved:budget.reserved,ceiling:budget.ceiling,studio:studioContext};
    await run("update public.research_tasks set status='done',checkpoint=:'cp'::jsonb,updated_at=now() where task_id=:'id'",
      {id:taskId,cp:JSON.stringify(checkpoint)});
    await writeReceipt({taskId,kind:'checkpoint',stage:'D04',status:'settled',
      payload:{budgetSpent:budget.spent,externalLeads:researchLeads.length}});
    await addEvent(taskId,'D04','research_done',{verdict:decision.verdict});
    return {taskId,status:'done',decision,degraded,researchLeads,briefAssetRef:briefRef(studioContext)};
  } catch(error) {
    if(error instanceof ResearchPrerequisiteHold)
      return holdResearchPrerequisites(taskId,prompt,topic,budget,error,studioContext);
    if(error instanceof ToolExecutionUncertainError||error instanceof ToolReceiptPersistenceError)
      return holdUncertainTool(taskId,prompt,topic,budget,error,studioContext);
    if(error instanceof BudgetHoldError) {
      const checkpoint={prompt,topic,budgetSpent:budget.spent,reserved:budget.reserved,ceiling:budget.ceiling,
        holdReason:'budget',holdAt:error.checkpoint,studio:studioContext};
      await run("update public.research_tasks set status='hold',checkpoint=:'cp'::jsonb,updated_at=now() where task_id=:'id'",
        {id:taskId,cp:JSON.stringify(checkpoint)});
      await writeReceipt({taskId,kind:'checkpoint',stage:'hold',status:'hold',payload:checkpoint});
      await addEvent(taskId,'D04','budget_hold',checkpoint);
      return {taskId,status:'hold',decision:null,degraded:false,holdReason:'budget',researchLeads:[],
        briefAssetRef:briefRef(studioContext)};
    }
    throw error;
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

/** Resume only a verified zero-spend first step within the persisted ceiling. */
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
  let saved: Record<string, unknown>;
  try { saved = readJsonColumn<Record<string, unknown>>(row[0].checkpoint, {}); }
  catch { return {taskId,status:"hold",decision:null,degraded:false,holdReason:"budget_checkpoint_invalid",researchLeads:[]}; }
  if (!saved || typeof saved !== "object" || Array.isArray(saved))
    return {taskId,status:"hold",decision:null,degraded:false,holdReason:"budget_checkpoint_invalid",researchLeads:[]};
  const studioContext=saved.studio&&typeof saved.studio==='object'&&!Array.isArray(saved.studio)
    ?saved.studio as Record<string,unknown>:{};
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
  if (typeof saved.budgetSpent !== "number" || !Number.isFinite(spent) || spent !== 0 ||
      typeof saved.ceiling !== "number" || !Number.isFinite(previousCeiling) || previousCeiling <= 0 ||
      saved.reserved !== 0)
    return { taskId, status: "hold", decision: null, degraded: false,
      holdReason: "resume_step_checkpoint_required", researchLeads: [] };
  // A caller-supplied number is not a durable Owner/provider authorization.
  // Extra funding remains HOLD until a real approval service persists it.
  if (additionalCeiling !== undefined)
    return {taskId,status:"hold",decision:null,degraded:false,
      holdReason:"additional_budget_requires_authorization",researchLeads:[]};
  const firstStep = saved.holdAt as {toolId?: unknown} | undefined;
  if (!["budget","research_prerequisites"].includes(String(saved.holdReason)) || firstStep?.toolId !== "llm-understand")
    return {taskId,status:"hold",decision:null,degraded:false,
      holdReason:"resume_step_checkpoint_required",researchLeads:[]};
  // Persist uncertainty before any external invocation. A process crash must
  // not leave a zero-spend checkpoint which can be reset and replayed blindly.
  const next = {...saved,holdReason:"resume_claimed",resume_claim_ref:randomUUID(),
    retry_requires_reconciliation:true};
  const claimed = await queryRows(
    "update public.research_tasks set status = 'running', checkpoint = :'next'::jsonb, updated_at = now() " +
      "where task_id = :'id' and status = 'hold' and checkpoint = :'expected'::jsonb returning task_id",
    {id:taskId,next:JSON.stringify(next),expected:JSON.stringify(saved)}
  );
  if (claimed.length !== 1)
    return {taskId,status:"hold",decision:null,degraded:false,
      holdReason:"task_state_conflict",researchLeads:[]};
  const budget = createBudget(previousCeiling);
  const ledger: Ledger = { taskId, budget };
  try {
    await addEvent(taskId, "D04", "resumed", {ceiling:previousCeiling,resumeClaimRef:next.resume_claim_ref});
    const { decision, degraded, researchLeads } = await runResearch(prompt, topic, ledger);
    if (degraded) throw new ResearchPrerequisiteHold(['SOURCE_OR_QUALIFICATION_UNAVAILABLE'],{decision,degraded,researchLeads});
    const checkpoint = { prompt, topic, degraded, decision, researchLeads, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling, studio:studioContext };
    await run(
      "update public.research_tasks set status = 'done', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
      { id: taskId, cp: JSON.stringify(checkpoint) }
    );
    await writeReceipt({ taskId, kind: "checkpoint", stage: "D04", status: "settled", payload: { budgetSpent: budget.spent } });
    await addEvent(taskId, "D04", "research_done", { verdict: decision.verdict });
    return { taskId, status: "done", decision, degraded, researchLeads };
  } catch (e) {
    if (e instanceof ResearchPrerequisiteHold)
      return holdResearchPrerequisites(taskId,prompt,topic,budget,e,studioContext);
    if (e instanceof ToolExecutionUncertainError || e instanceof ToolReceiptPersistenceError)
      return holdUncertainTool(taskId!, prompt, topic, budget, e,studioContext);
    if (e instanceof BudgetHoldError) {
      const checkpoint = { prompt, topic, budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling, holdReason: "budget", holdAt: e.checkpoint, studio:studioContext };
      await run(
        "update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
        { id: taskId, cp: JSON.stringify(checkpoint) }
      );
      await writeReceipt({ taskId, kind: "checkpoint", stage: "hold", status: "hold", payload: checkpoint });
      return { taskId, status: "hold", decision: null, degraded: false, holdReason: "budget", researchLeads: [] };
    }
    const checkpoint = {prompt,topic,budgetSpent:budget.spent,reserved:budget.reserved,
      ceiling:budget.ceiling,holdReason:"research_failed_review_required",resume_claim_ref:next.resume_claim_ref,retry_requires_reconciliation:true,studio:studioContext};
    await run("update public.research_tasks set status = 'hold', checkpoint = :'cp'::jsonb, updated_at = now() where task_id = :'id'",
      {id:taskId,cp:JSON.stringify(checkpoint)});
    return {taskId,status:"hold",decision:null,degraded:false,
      holdReason:"research_failed_review_required",researchLeads:[]};
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
  const studioContext=saved.studio&&typeof saved.studio==='object'&&!Array.isArray(saved.studio)
    ?saved.studio as Record<string,unknown>:{};
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
    if (degraded) throw new ResearchPrerequisiteHold(['SOURCE_OR_QUALIFICATION_UNAVAILABLE'],{decision,degraded,researchLeads});
    const checkpoint = {
      prompt: message, topic, degraded, decision, researchLeads,
      budgetSpent: budget.spent, reserved: budget.reserved, ceiling: budget.ceiling, studio:studioContext,
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
    if (error instanceof ResearchPrerequisiteHold) {
      const result=await holdResearchPrerequisites(taskId,message,topic,budget,error,studioContext);
      return {ok:false,reason:result.holdReason};
    }
    if (error instanceof ToolExecutionUncertainError ||
        error instanceof ToolReceiptPersistenceError) {
      const result = await holdUncertainTool(taskId, message, topic, budget, error,studioContext);
      return { ok: false, reason: result.holdReason };
    }
    if (error instanceof BudgetHoldError) {
      const checkpoint = {
        prompt: message, topic, budgetSpent: budget.spent,
        reserved: budget.reserved, ceiling: budget.ceiling,
        holdReason: "budget", holdAt: error.checkpoint, studio:studioContext,
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
      retry_requires_reconciliation: true, studio:studioContext,
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

export async function getTaskStatus(taskId: string, sessionToken?: string):Promise<Record<string,unknown>|null> {
  const rows = await queryRows(
    "select task_id::text as task_id, topic, prompt, status, checkpoint, created_at::text as created_at, updated_at::text as updated_at from public.research_tasks where task_id = :'id'",
    { id: taskId }
  );
  const task=rows[0];
  if(!task)return null;
  const {currentTaskCheckpoint}=await import('./studio-task-material-read');
  const checkpoint=await currentTaskCheckpoint(readJsonColumn<Record<string,unknown>>(task.checkpoint,{}),sessionToken);
  return {...task,checkpoint:typeof task.checkpoint==='string'?JSON.stringify(checkpoint):checkpoint};
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
