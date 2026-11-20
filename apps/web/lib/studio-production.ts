// apps/web/lib/studio-production.ts
//
// Studio 生产触发：把「一句话委托」转成真实 D00–D05 生产。
// 方式：child_process 异步 spawn `pipelines/data-production/run.mjs`（唯一生产入口），
// 不阻塞 HTTP 响应；私有原件必须走唯一 Registry 的受审私有 Adapter 与独立 Gate。
//
// 关联：预分配 run_id → 预登记 control.production_runs(RUNNING) → 写入 research_events
// → 更新 research_tasks.checkpoint.production_run_id → spawn run.mjs --run-id。
// 非私有 layer1 保留为另一条合法 Registry route，不接受私有原件降级。
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";
import { resolveD00ApprovedRun } from "../../../pipelines/data-production/orchestrator/d00-approved-run.mjs";
import {createCloudProductionDispatch} from "../../../pipelines/data-production/orchestrator/cloud-production-dispatch.mjs";
import {cloudProductionInputDigest} from "../../../pipelines/data-production/orchestrator/cloud-production-runtime.mjs";
import { run as dbRun, queryRows } from "@mohen/data-access";
import { loadRegistry } from "../../../pipelines/data-production/orchestrator/registry.mjs";
import {
  isExecutionAuthorityReady,
  startVerifier,
  startDynamicTokenService,
  buildAuthEnv,
  executionDigest,
} from "./studio-execution-authority";

const EXECUTION_MODE = "attended"; // Studio UI 触发的生产由 Owner 会话驱动，用 attended 模式
const ARCH = "mohen.six-stage.v1";

function resolveProjectRoot(): string {
  // pnpm 会把最初调用目录放进 INIT_CWD（项目根）
  const initCwd = process.env.INIT_CWD;
  if (initCwd && fs.existsSync(path.join(initCwd, "AGENTS.md"))) return initCwd;
  // 回退：从 cwd 向上找含 AGENTS.md 的目录（项目根标志）
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "AGENTS.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export interface ProductionTrigger {
  runId: string;
  started: boolean;
  reason?: string;
}
/** Exact Owner-RLS validated project original, not a client assertion. */
export interface ProductionOriginal {
  originalId: string;
  pageNumber: number;
  sourceVersionId: string;
  sha256: string;
  assetRevisionId: string;
  contentType: string;
  byteSize: number;
  uploadStartedAt: string;
  uploadVerifiedAt: string;
}
const SOURCE_UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SOURCE_SHA=/^[a-f0-9]{64}$/i;
const PRIVATE_STAGE_ADAPTER="pipelines/data-production/adapters/private-evidence-adapters.mjs";
/** D00 preselects the D01 method; ambiguous or unimplemented carriers remain HOLD. */
export function privateD01MethodForCarrier(contentType:string):"C01"|"C02"|null{
  if(["image/jpeg","image/png","image/webp"].includes(contentType))return "C02";
  if(contentType==="text/plain")return "C01";
  return null;
}
export function privateSourceHandoffBlocker(registry: unknown, source?:ProductionOriginal):string|null{
  const jobs=(registry&&typeof registry==="object"&&"jobs" in registry&&
    Array.isArray(registry.jobs))?registry.jobs as Array<{implementation?:{adapter_binding?:string;private_evidence_adapter_binding?:string}}>:null;
  if(!source)return "production_original_selection_required";
  if(!SOURCE_UUID.test(source.originalId)||!SOURCE_UUID.test(source.sourceVersionId)||
     !SOURCE_UUID.test(source.assetRevisionId)||!SOURCE_SHA.test(source.sha256)||
     !Number.isSafeInteger(source.pageNumber)||source.pageNumber<1||source.pageNumber>10000||
     !Number.isSafeInteger(source.byteSize)||source.byteSize<1||
     typeof source.contentType!=="string"||!source.contentType.includes("/"))
    return "production_original_binding_invalid";
  // The existing Runner authorizes one exact Adapter for all selected jobs.
  // Until this canonical Registry binds the reviewed private Worker, do not
  // route genuine originals through the parallel memory/topic adapter.
  if(!jobs||jobs.length!==6||
     jobs.some(job=>job.implementation?.private_evidence_adapter_binding!==PRIVATE_STAGE_ADAPTER))
    return "production_private_adapter_not_bound";
  // A trusted fresh Worker readback may document the actual Owner upload,
  // without implying an upstream institution download or source rights.
  const started=Date.parse(source.uploadStartedAt??""),verified=Date.parse(source.uploadVerifiedAt??"");
  if(!Number.isFinite(started)||!Number.isFinite(verified)||started>verified||
     verified>Date.now()+30000)return "production_acquisition_receipt_required";
  if(!privateD01MethodForCarrier(source.contentType))return "production_private_read_method_unavailable";
  return null;
}

async function addEvent(taskId: string, stage: string, event: string, payload: unknown) {
  try {
    await dbRun(
      "insert into public.research_events (task_id, stage, event, payload) values (:'id'::uuid, :'stage', :'event', :'payload'::jsonb)",
      { id: taskId, stage, event, payload: JSON.stringify(payload ?? {}) }
    );
  } catch (e) {
    console.error(`[studio-production] 写 research_events 失败 task=${taskId} event=${event}:`, e);
  }
}

function cloudProductionDispatch(){
  const previewHost=process.env.VERCEL_ENV==="preview"&&process.env.MOHEN_D00_TRUSTED_PREVIEW_ACCESS==="true"
    ? process.env.VERCEL_URL : undefined;
  const url=previewHost?.endsWith(".vercel.app")
    ? `https://${previewHost}/api/internal/production-execute`
    : process.env.MOHEN_CLOUD_EXECUTOR_URL;
  return createCloudProductionDispatch({url,
    credential:process.env.MOHEN_CLOUD_EXECUTOR_CREDENTIAL,
    protectionBypass:process.env.MOHEN_CLOUD_EXECUTOR_PROTECTION_BYPASS,
    fetchImpl:async (input,init) =>{
      const endpoint = new URL(String(input));
      if(!previewHost||endpoint.hostname!==previewHost) return fetch(input,init);
      const headers=new Headers(init?.headers);
      headers.set("x-vercel-trusted-oidc-idp-token",await getVercelOidcToken());
      return fetch(input,{...init,headers});
    }});
}

function productionBlocker(projectRoot: string, source?:ProductionOriginal): string | null {
  try {
    const registry = loadRegistry(projectRoot);
    if (registry.status !== "ACTIVE_AUTHORIZED" || registry.activation.enabled !== true) return "production_registry_not_active";
    if (registry.jobs.some(job => !job.execution_policy.enabled)) return "production_job_disabled";
    const sourceBlocker=privateSourceHandoffBlocker(registry,source);
    if(sourceBlocker)return sourceBlocker;
    // Studio 触发生产需要本地隔离执行授权（签名密钥 + evidence + 验证器）。
    // 未就绪则失败关闭，不允许裸调 run.mjs。
    if(process.env.MOHEN_CLOUD_EXECUTION_ENABLED==="true"){
      try{cloudProductionDispatch();}catch{return "production_cloud_executor_not_configured";}
    }else if (!isExecutionAuthorityReady()) return "production_input_binding_required";
    return null;
  } catch { return "production_registry_invalid"; }
}

/** Synchronous no-cost preflight: cannot prepare materials, reserve funds,
 * or spawn a Runner before the signed production input and registry authorize.
 */
export function getProductionBlocker(source?:ProductionOriginal): string | null {
  return productionBlocker(resolveProjectRoot(),source);
}

export async function failProductionRun(runId: string, reason = "PRODUCTION_PROCESS_EXIT_NONZERO"): Promise<void> {
  // A failure before the Runner writes its own terminal report must not leave
  // a RUNNING row indefinitely. Never overwrite a legitimate HOLD/Gate result.
  await dbRun(`update control.production_runs set status='FAILED', finished_at=now(),
      metadata=coalesce(metadata,'{}'::jsonb) ||
        jsonb_build_object('m5_terminal',jsonb_build_object('disposition','FAILED','reason_code',:'reason'::text))
      where run_id=:'id'::uuid and status='RUNNING'`, { id: runId, reason });
}

/**
 * 触发一次真实生产（D00–D05）。fire-and-forget：本函数只负责登记 + 启动进程并返回 run_id，
 * 生产进度与终态由 run.mjs 内部回写 control.production_runs。
 */
export interface StageResume { runId: string; fromStage: "D01" }
export async function triggerProduction(taskId: string, intent: string, projectId: string, source?:ProductionOriginal, ownerSessionToken?:string, endStage?:"D00", resume?:StageResume): Promise<ProductionTrigger> {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId))
    return { runId: "", started: false, reason: "production_project_binding_required" };
  const projectRoot = resolveProjectRoot();
  const runPath = path.join(projectRoot, "pipelines", "data-production", "run.mjs");
  const adaptersPath = path.join(projectRoot, PRIVATE_STAGE_ADAPTER);

  const cloud=process.env.MOHEN_CLOUD_EXECUTION_ENABLED==="true";
  if (endStage === "D00" && !cloud)
    return { runId: "", started: false, reason: "production_d00_cloud_executor_required" };
  if (!cloud && (!fs.existsSync(runPath) || !fs.existsSync(adaptersPath))) {
    return { runId: "", started: false, reason: "production_entry_missing" };
  }
  const blocker = productionBlocker(projectRoot,source);
  if (blocker) return { runId: "", started: false, reason: blocker };

  // Studio private originals cannot be replaced by a free-topic network search.
  // The Owner token comes only from the authenticated POST, never from the browser.
  if(!source||!ownerSessionToken||typeof ownerSessionToken!=="string")
    return {runId:"",started:false,reason:"production_private_owner_session_required"};
  const methodId=privateD01MethodForCarrier(source.contentType);
  if(!methodId)return {runId:"",started:false,reason:"production_private_read_method_unavailable"};
  // Signed D00 input: exact project/root, immutable original and chosen page.
  // The Worker independently verifies these references against live RLS/bytes.
  const scope = {project_id:projectId,root_task_id:taskId,original_id:source.originalId,
    page_number:source.pageNumber,source_version_id:source.sourceVersionId,
    asset_revision_id:source.assetRevisionId,raw_sha256:source.sha256,
    upload_started_at:source.uploadStartedAt,upload_verified_at:source.uploadVerifiedAt};

  const stageInput={research_intent:intent,scope,
    consumer_method_plan:{methods:[{method_id:methodId,method_version:"v1"}]}};
  let approvedRun: string | null = null;
  try {
    if (endStage === "D00") approvedRun = resolveD00ApprovedRun(process.env.MOHEN_D00_APPROVED_RUN,stageInput);
  } catch {
    return {runId:"",started:false,reason:"production_d00_approval_binding_required"};
  }
  const runId = resume?.runId ?? approvedRun ?? randomUUID();
  const cloudInput={run_id:runId,...stageInput,owner_session_token:ownerSessionToken,
    ...(endStage ? {to_stage:endStage} : {}),...(resume ? {from_stage:resume.fromStage} : {})};
  const metadata=cloud?{cloud_dispatch:{input_digest:cloudProductionInputDigest(cloudInput)}}:{};

  if (resume) {
    // Resuming an already-registered, D00-qualified run: never create a new
    // run or re-spend budget. The row must already exist and match this exact
    // project/root/original scope; the cloud executor advances its stage.
    const existing = await queryRows(
      `select run_id::text from control.production_runs
       where run_id=:'run'::uuid and scope=:'scope'::jsonb`,
      { run: runId, scope: JSON.stringify(scope) });
    if (existing.length !== 1) return {runId:"",started:false,reason:"production_resume_run_scope_mismatch"};
  } else {
    // 1) 预登记 production_runs（RUNNING），前端立即可查；D00 的 on conflict 会复用。
    try {
      const insertRun = `insert into control.production_runs
         (run_id, research_intent, scope, execution_mode, status, started_at, metadata, architecture_generation)
         values (:'run_id'::uuid, :'intent', :'scope'::jsonb, :'mode', 'RUNNING', now(), :'metadata'::jsonb, :'arch')
         on conflict (run_id) do nothing`;
      const params = { run_id: runId, intent, scope: JSON.stringify(scope), mode: EXECUTION_MODE, arch: ARCH, metadata:JSON.stringify(metadata) };
      if (approvedRun) {
        const inserted = await queryRows(insertRun + " returning run_id::text", params);
        if (inserted.length !== 1) return {runId:"",started:false,reason:"production_d00_approved_run_already_registered"};
      } else {
        await dbRun(insertRun, params);
      }
    } catch (e) {
      return { runId: "", started: false, reason: "production_run_register_failed" };
    }
  }

  // 2) 关联 research_task ↔ run_id（checkpoint 存 run_id）+ 事件
  try {
    await dbRun(
      "update public.research_tasks set checkpoint = jsonb_set(coalesce(checkpoint,'{}'::jsonb), '{production_run_id}', to_jsonb(:'run_id'::text), true), updated_at = now() where task_id = :'id'::uuid",
      { run_id: runId, id: taskId }
    );
  } catch (e) {
    console.error(`[studio-production] 关联 run_id 失败 task=${taskId}:`, e);
  }
  await addEvent(taskId, "D00", cloud?"production_cloud_dispatch_requested":"production_started", { run_id: runId, mode: EXECUTION_MODE });

  if(cloud){
    try{
      const terminal=await cloudProductionDispatch()(cloudInput);
      await addEvent(taskId,terminal.stage,"production_cloud_result",{run_id:runId,
        disposition:terminal.status,reason_code:terminal.reason_code});
      return terminal.reason_code?.startsWith("CLOUD_EXECUTOR_")
        ? {runId,started:false,reason:"production_cloud_execution_hold"}
        : {runId,started:true};
    }catch{
      // A network/setup failure can happen before the executor claims this run.
      // Atomically stop only the exact unclaimed input, so the genuine remote
      // claim (if racing) cannot later start an already-HOLD task.
      // Never overwrite a claimed RUNNING run or an existing Gate terminal.
      let unclaimedHold=false;
      try{
        const settled=await queryRows(`update control.production_runs
          set status='HOLD',finished_at=now(),current_stage=coalesce(current_stage,'D00'),
            metadata=coalesce(metadata,'{}'::jsonb)||
              jsonb_build_object('cloud_dispatch_uncertain',true,'m5_terminal',
                jsonb_build_object('stage','D00','gate_code','G0','disposition','HOLD',
                  'reason_code','CLOUD_DISPATCH_UNCLAIMED'))
          where run_id=:'id'::uuid and status='RUNNING'
            and metadata->'cloud_dispatch'->>'input_digest'=:'digest'
            and metadata->'cloud_dispatch'->>'claimed_at' is null
          returning run_id::text as run_id`,{id:runId,digest:cloudProductionInputDigest(cloudInput)});
        unclaimedHold=settled?.length===1&&settled[0]?.run_id===runId;
      }catch{
        // Persistence uncertainty is not proof the remote Runner is stopped.
      }
      if(!unclaimedHold){
        try{await dbRun(`update control.production_runs
          set metadata=coalesce(metadata,'{}'::jsonb)||
            jsonb_build_object('cloud_dispatch_uncertain',true)
          where run_id=:'id'::uuid and status='RUNNING'
            and metadata->'cloud_dispatch'->>'input_digest'=:'digest'`,
          {id:runId,digest:cloudProductionInputDigest(cloudInput)});}
        catch{/* Do not re-dispatch or alter a terminal Gate receipt. */}
      }
      const reason=unclaimedHold?"production_cloud_unclaimed_hold":"production_cloud_dispatch_uncertain";
      await addEvent(taskId,"D00",reason,{run_id:runId});
      return {runId,started:false,reason};
    }
  }

  // 3) 生成 D00 scope 文件（与 Runner 同源拼装，签名覆盖的 input_digest 必须等于实跑输入）
  // No sample project. The Gate candidate is tied to the Owner's actual project.
  const registry = loadRegistry(projectRoot);
  const registryDigest = executionDigest(registry);
  const scopeDir = path.join(os.tmpdir(), "mohen-scopes");
  const scopeFile = path.join(scopeDir, `${runId}.json`);
  let verifier: Awaited<ReturnType<typeof startVerifier>> | undefined;
  let dynamic: Awaited<ReturnType<typeof startDynamicTokenService>> | undefined;
  const removeScope = () => { try { fs.rmSync(scopeFile, { force: true }); } catch {} };
  // 4) Trusted nonce verifier and dynamic issuer must be ready before spawn.
  // If either fails after the RUNNING insert, persist a failed terminal state,
  // close the first listener and do not leak a per-run scope file.
  try {
    fs.mkdirSync(scopeDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(scopeFile, JSON.stringify(scope), { encoding: "utf8", mode: 0o600, flag: "wx" });
    verifier = await startVerifier();
    dynamic = await startDynamicTokenService(registry, registryDigest, runId, verifier.issued);
  } catch {
    verifier?.server.close();
    dynamic?.server.close();
    removeScope();
    await failProductionRun(runId, "PRODUCTION_AUTHORITY_START_FAILED");
    await addEvent(taskId, "D00", "production_authority_start_failed", { run_id: runId });
    return { runId, started: false, reason: "production_authority_start_failed" };
  }
  const { server, port: verifierPort } = verifier;
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    server.close();
    dynamic.server.close();
    removeScope();
  };

  // 5) spawn 生产进程（异步，不阻塞）
  try {
    const authEnv = buildAuthEnv({}, verifierPort);
    const child = spawn(
      process.execPath,
      [
        runPath,
        "--intent", intent,
        "--adapters", adaptersPath,
        "--project-root", projectRoot,
        "--run-id", runId,
        "--execution-mode", EXECUTION_MODE,
        "--scope-file", scopeFile,
        "--to", "D02", // D00→D01 reads approved originals; missing D01→D02 professional handoff is an explicit persisted HOLD, never fake PASS.
        // D00-B：自由主题生产必须预选 D01 读法（文本材料走 C01），否则 G0 的
        // method_plan_preselection 结构性前置失败关闭（不补默认方法）。见 2026-11-14 断点核。
        "--method-plan", JSON.stringify({ methods: [{ method_id: methodId, method_version: "v1" }] }),
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          // Producer 必须以 mohen_producer 身份连库（禁超管、禁 bypass RLS、禁 gate 签名）。
          ...(process.env.MOHEN_PRODUCER_DATABASE_URL
            ? { DATABASE_URL: process.env.MOHEN_PRODUCER_DATABASE_URL } : {}),
          // No topic-file fallback or unreviewed network corpus for private bytes.
          MOHEN_TOPIC_JSON_FILE:"",
          MOHEN_TOPIC_CONFIG:"",
          MOHEN_PRIVATE_WORKER_OWNER_SESSION:ownerSessionToken,
          ...authEnv,
          MOHEN_EXECUTION_AUTH_DYNAMIC_URL: `https://127.0.0.1:${dynamic.port}/token`,
          MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL: dynamic.credential,
          // 独立 Gate 验证 + 按需签发（本地隔离服务，见 tools/local-gate-service.mjs）。
          // Producer 不自签；管线每阶段 PASS 后向此服务 verify，服务按需把候选签成 audit。
          // Honour the independently operated Gate's actual isolated endpoint
          // and credential. Never treat a missing Gate as a Producer PASS.
          MOHEN_INDEPENDENT_GATE_VERIFY_URL:
            process.env.MOHEN_INDEPENDENT_GATE_VERIFY_URL?.trim() || "https://127.0.0.1:8789/verify",
          MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL:
            process.env.MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL?.trim() || (() => {
              try { return fs.readFileSync(process.env.MOHEN_GATE_VERIFIER_CREDENTIAL_FILE || "D:/MoHen/keys/gate-verifier/credential", "utf8").trim(); }
              catch { return ""; }
            })(),
          MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED: "true",
          ...(process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL
            ? { MOHEN_PRIVATE_WORKER_DATABASE_URL: process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL } : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stderrBuf = "";
    child.stderr?.on("data", (d) => { stderrBuf += String(d); });
    child.on("error", (err) => {
      cleanup();
      void failProductionRun(runId, "PRODUCTION_PROCESS_SPAWN_ERROR").catch(() => console.error("production_failure_persistence_unavailable"));
      console.error(`[studio-production] 生产进程启动失败 run=${runId}:`, err);
      void addEvent(taskId, "D00", "production_process_error", { run_id: runId, error: String(err) });
    });
    child.on("exit", (code) => {
      cleanup();
      if (code !== 0) void failProductionRun(runId).catch(() => console.error("production_failure_persistence_unavailable"));
      void addEvent(taskId, "D02", code === 0 ? "production_finished" : "production_failed", {
        run_id: runId,
        exit_code: code,
        stderr_tail: stderrBuf.slice(-2000),
      });
    });
    child.unref?.(); // 不阻止父进程（Next.js）退出
  } catch (e) {
    cleanup();
    await failProductionRun(runId, "PRODUCTION_PROCESS_SPAWN_ERROR");
    return { runId, started: false, reason: "production_spawn_failed" };
  }

  return { runId, started: true };
}

/** 查询一次生产运行状态（供前端轮询 / status 接口） */
export async function getProductionStatus(runId: string) {
  const rows = await queryRows(
    `select run_id::text as run_id, status, current_stage,
            metadata->'m5_terminal' as terminal,
            started_at::text as started_at, finished_at::text as finished_at
     from control.production_runs where run_id = :'run_id'::uuid`,
    { run_id: runId }
  );
  return rows[0] ?? null;
}
