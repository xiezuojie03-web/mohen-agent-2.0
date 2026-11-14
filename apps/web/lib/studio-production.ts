// apps/web/lib/studio-production.ts
//
// Studio 生产触发：把「一句话委托」转成真实 D00–D05 生产。
// 方式：child_process 异步 spawn `pipelines/data-production/run.mjs`（唯一生产入口），
// 不阻塞 HTTP 响应；进程内由 layer1-adapters 写 42 表 + gate 审核。
//
// 关联：预分配 run_id → 预登记 control.production_runs(RUNNING) → 写入 research_events
// → 更新 research_tasks.checkpoint.production_run_id → spawn run.mjs --run-id。
// layer1-adapters 的 D00 用 on conflict (run_id) do nothing 复用该预登记行。
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { run as dbRun, queryRows } from "@mohen/data-access";
import { prepareFreeTopic } from "./mohen-agent/prepare-topic";
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

function productionBlocker(projectRoot: string): string | null {
  try {
    const registry = loadRegistry(projectRoot);
    if (registry.status !== "ACTIVE_AUTHORIZED" || registry.activation.enabled !== true) return "production_registry_not_active";
    if (registry.jobs.some(job => !job.execution_policy.enabled)) return "production_job_disabled";
    // Studio 触发生产需要本地隔离执行授权（签名密钥 + evidence + 验证器）。
    // 未就绪则失败关闭，不允许裸调 run.mjs。
    if (!isExecutionAuthorityReady()) return "production_input_binding_required";
    return null;
  } catch { return "production_registry_invalid"; }
}

/** Synchronous no-cost preflight: cannot prepare materials, reserve funds,
 * or spawn a Runner before the signed production input and registry authorize.
 */
export function getProductionBlocker(): string | null {
  return productionBlocker(resolveProjectRoot());
}

export async function failProductionRun(runId: string): Promise<void> {
  await dbRun("update control.production_runs set status='FAILED', finished_at=now() where run_id=:'id'::uuid and status='RUNNING'", { id: runId });
}

/**
 * 触发一次真实生产（D00–D05）。fire-and-forget：本函数只负责登记 + 启动进程并返回 run_id，
 * 生产进度与终态由 run.mjs 内部回写 control.production_runs。
 */
export async function triggerProduction(taskId: string, intent: string, projectId: string): Promise<ProductionTrigger> {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId))
    return { runId: "", started: false, reason: "production_project_binding_required" };
  const projectRoot = resolveProjectRoot();
  const runPath = path.join(projectRoot, "pipelines", "data-production", "run.mjs");
  const adaptersPath = path.join(projectRoot, "pipelines", "data-production", "adapters", "layer1-adapters.mjs");

  if (!fs.existsSync(runPath) || !fs.existsSync(adaptersPath)) {
    return { runId: "", started: false, reason: "production_entry_missing" };
  }
  const blocker = productionBlocker(projectRoot);
  if (blocker) return { runId: "", started: false, reason: blocker };

  // 自由主题准备：检索材料 + 组装动态主题配置（材料是生产前提，同步做；无材料则诚实降级）
  const prepared = await prepareFreeTopic(intent);
  if ("reason" in prepared) {
    await addEvent(taskId, "D00", "production_no_material", { reason: prepared.reason, intent });
    return { runId: "", started: false, reason: prepared.reason };
  }

  const runId = randomUUID();
  // Same exact ST-01 project in persistent run identity and all signed stage inputs.
  const scope = { topic_key: prepared.key, topic_label: prepared.label, material_count: prepared.materialCount, project_id: projectId };

  // 1) 预登记 production_runs（RUNNING），前端立即可查；D00 的 on conflict 会复用。
  try {
    await dbRun(
      `insert into control.production_runs
       (run_id, research_intent, scope, execution_mode, status, started_at, metadata, architecture_generation)
       values (:'run_id'::uuid, :'intent', :'scope'::jsonb, :'mode', 'RUNNING', now(), '{}'::jsonb, :'arch')
       on conflict (run_id) do nothing`,
      { run_id: runId, intent, scope: JSON.stringify(scope), mode: EXECUTION_MODE, arch: ARCH }
    );
  } catch (e) {
    return { runId: "", started: false, reason: "production_run_register_failed" };
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
  await addEvent(taskId, "D00", "production_started", { run_id: runId, mode: EXECUTION_MODE });

  // 3) 生成 D00 scope 文件（与 Runner 同源拼装，签名覆盖的 input_digest 必须等于实跑输入）
  // No sample project. The Gate candidate is tied to the Owner's actual project.
  const registry = loadRegistry(projectRoot);
  const registryDigest = executionDigest(registry);
  const scopeDir = path.join(os.tmpdir(), "mohen-scopes");
  fs.mkdirSync(scopeDir, { recursive: true });
  const scopeFile = path.join(scopeDir, `${runId}.json`);
  fs.writeFileSync(scopeFile, JSON.stringify(scope), "utf8");

  // 4) 启动本地一次性 nonce 验证器 + 动态令牌签发服务
  // （D01–D05 输入依赖上一阶段产出，无法预签，由 Runner 按需请求）
  const { server, port: verifierPort, issued } = await startVerifier();
  const dynamic = await startDynamicTokenService(registry, registryDigest, runId, issued);

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
        // D00-B：自由主题生产必须预选 D01 读法（文本材料走 C01），否则 G0 的
        // method_plan_preselection 结构性前置失败关闭（不补默认方法）。见 2026-11-14 断点核。
        "--method-plan", JSON.stringify({ methods: [{ method_id: "C01", method_version: "v1" }] }),
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          // Producer 必须以 mohen_producer 身份连库（禁超管、禁 bypass RLS、禁 gate 签名）。
          ...(process.env.MOHEN_PRODUCER_DATABASE_URL
            ? { DATABASE_URL: process.env.MOHEN_PRODUCER_DATABASE_URL } : {}),
          MOHEN_TOPIC_JSON_FILE: prepared.jsonFile,
          ...authEnv,
          MOHEN_EXECUTION_AUTH_DYNAMIC_URL: `https://127.0.0.1:${dynamic.port}/token`,
          MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL: dynamic.credential,
          // 独立 Gate 验证 + 按需签发（本地隔离服务，见 tools/local-gate-service.mjs）。
          // Producer 不自签；管线每阶段 PASS 后向此服务 verify，服务按需把候选签成 audit。
          MOHEN_INDEPENDENT_GATE_VERIFY_URL: "https://127.0.0.1:8789/verify",
          MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL: (() => {
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
      void failProductionRun(runId).catch(() => console.error("production_failure_persistence_unavailable"));
      console.error(`[studio-production] 生产进程启动失败 run=${runId}:`, err);
      void addEvent(taskId, "D00", "production_process_error", { run_id: runId, error: String(err) });
    });
    child.on("exit", (code) => {
      server.close();
      dynamic.server.close();
      if (code !== 0) void failProductionRun(runId).catch(() => console.error("production_failure_persistence_unavailable"));
      void addEvent(taskId, "D05", code === 0 ? "production_finished" : "production_failed", {
        run_id: runId,
        exit_code: code,
        stderr_tail: stderrBuf.slice(-2000),
      });
    });
    child.unref?.(); // 不阻止父进程（Next.js）退出
  } catch (e) {
    server.close();
    dynamic.server.close();
    await failProductionRun(runId);
    return { runId, started: false, reason: "production_spawn_failed" };
  }

  return { runId, started: true };
}

/** 查询一次生产运行状态（供前端轮询 / status 接口） */
export async function getProductionStatus(runId: string) {
  const rows = await queryRows(
    `select run_id::text as run_id, status, current_stage, started_at::text as started_at, finished_at::text as finished_at
     from control.production_runs where run_id = :'run_id'::uuid`,
    { run_id: runId }
  );
  return rows[0] ?? null;
}
