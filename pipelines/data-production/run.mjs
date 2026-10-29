#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadRegistry } from "./orchestrator/registry.mjs";
import { createRunState } from "./orchestrator/run-state.mjs";
import { runProduction } from "./orchestrator/orchestrator.mjs";
import { writeReports } from "./reporting/write-reports.mjs";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const projectRoot = path.resolve(arg("project-root", process.cwd()));
const intent = arg("intent");
const adaptersModule = arg("adapters");
const executionMode = arg("execution-mode", "attended");
const runId = arg("run-id");
const fromStage = arg("from", "D00");
const toStage = arg("to", "D05");
const reportDir = path.resolve(arg("report-dir", path.join(projectRoot, "verification", "data-production-runs")));

if (!intent) throw new Error("--intent is required");
if (!adaptersModule) {
  throw new Error("--adapters is required. Phase D forbids hidden fallback to legacy/research runners.");
}

const mod = await import(pathToFileURL(path.resolve(adaptersModule)).href);
if (!mod.adapters) throw new Error("ADAPTER_MODULE_MUST_EXPORT:adapters");

const registry = loadRegistry(projectRoot);
const run = createRunState({ research_intent: intent, execution_mode: executionMode, run_id: runId || undefined });

// 提前引入 data-access：用于阶段进度回写 + 终态落库（此前只做终态，中间 current_stage 不写，前端看不到进度）。
const { run: dbRun } = await import("../../packages/data-access/src/index.mjs");

const finished = await runProduction({
  run, registry, from_stage: fromStage, to_stage: toStage,
  context: {
    adapters: mod.adapters,
    onStage: async (stage) => {
      try {
        await dbRun(
          `update control.production_runs set current_stage = :'stage', status = 'RUNNING' where run_id = :'run_id'::uuid`,
          { stage, run_id: run.run_id }
        );
      } catch (e) {
        console.warn(`[run] production_runs 进度回写失败：${e instanceof Error ? e.message : String(e)}`);
      }
    },
  },
});
const reports = writeReports({ run: finished, outDir: reportDir });
// 工程债修复（2026-10-17）：run 终态落库——此前 production_runs.status 永驻 RUNNING，
// 执行记录不完整（§8.3 第一类验收项）。记账失败不影响 run 结论（try/catch 包容）。
try {
  await dbRun(
    `update control.production_runs set status = :'status', finished_at = now() where run_id = :'run_id'::uuid`,
    { status: finished.status, run_id: finished.run_id }
  );
} catch (e) {
  console.warn(`[run] production_runs 终态回写失败（不影响 run 结论）：${e instanceof Error ? e.message : String(e)}`);
}
console.log(JSON.stringify({ run_id: finished.run_id, status: finished.status, reports }, null, 2));
process.exit(finished.status === "PASS" ? 0 : finished.status === "HOLD" ? 2 : 1);
