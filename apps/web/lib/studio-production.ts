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
import path from "node:path";
import { randomUUID } from "node:crypto";
import { run as dbRun, queryRows } from "@mohen/data-access";
import { prepareFreeTopic } from "./mohen-agent/prepare-topic";

const EXECUTION_MODE = "unattended"; // 后台自驱动生产，非交互
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

/**
 * 触发一次真实生产（D00–D05）。fire-and-forget：本函数只负责登记 + 启动进程并返回 run_id，
 * 生产进度与终态由 run.mjs 内部回写 control.production_runs。
 */
export async function triggerProduction(taskId: string, intent: string): Promise<ProductionTrigger> {
  const projectRoot = resolveProjectRoot();
  const runPath = path.join(projectRoot, "pipelines", "data-production", "run.mjs");
  const adaptersPath = path.join(projectRoot, "pipelines", "data-production", "adapters", "layer1-adapters.mjs");

  if (!fs.existsSync(runPath) || !fs.existsSync(adaptersPath)) {
    return { runId: "", started: false, reason: "production_entry_missing" };
  }

  // 自由主题准备：检索材料 + 组装动态主题配置（材料是生产前提，同步做；无材料则诚实降级）
  const prepared = await prepareFreeTopic(intent);
  if ("reason" in prepared) {
    await addEvent(taskId, "D00", "production_no_material", { reason: prepared.reason, intent });
    return { runId: "", started: false, reason: prepared.reason };
  }

  const runId = randomUUID();

  // 1) 预登记 production_runs（RUNNING），前端立即可查；D00 的 on conflict 会复用。
  try {
    await dbRun(
      `insert into control.production_runs
       (run_id, research_intent, scope, execution_mode, status, started_at, metadata, architecture_generation)
       values (:'run_id'::uuid, :'intent', '{}'::jsonb, :'mode', 'RUNNING', now(), '{}'::jsonb, :'arch')
       on conflict (run_id) do nothing`,
      { run_id: runId, intent, mode: EXECUTION_MODE, arch: ARCH }
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

  // 3) spawn 生产进程（异步，不阻塞）
  try {
    const child = spawn(
      process.execPath,
      [
        runPath,
        "--intent", intent,
        "--adapters", adaptersPath,
        "--project-root", projectRoot,
        "--run-id", runId,
        "--execution-mode", EXECUTION_MODE,
      ],
      { cwd: projectRoot, env: { ...process.env, MOHEN_TOPIC_JSON_FILE: prepared.jsonFile }, stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderrBuf = "";
    child.stderr?.on("data", (d) => { stderrBuf += String(d); });
    child.on("error", (err) => {
      console.error(`[studio-production] 生产进程启动失败 run=${runId}:`, err);
      void addEvent(taskId, "D00", "production_process_error", { run_id: runId, error: String(err) });
    });
    child.on("exit", (code) => {
      void addEvent(taskId, "D05", code === 0 ? "production_finished" : "production_failed", {
        run_id: runId,
        exit_code: code,
        stderr_tail: stderrBuf.slice(-2000),
      });
    });
    child.unref?.(); // 不阻止父进程（Next.js）退出
  } catch (e) {
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
