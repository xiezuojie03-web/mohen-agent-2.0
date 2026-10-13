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
const fromStage = arg("from", "D01");
const toStage = arg("to", "D05");
const reportDir = path.resolve(arg("report-dir", path.join(projectRoot, "verification", "data-production-runs")));

if (!intent) throw new Error("--intent is required");
if (!adaptersModule) {
  throw new Error("--adapters is required. Phase D forbids hidden fallback to legacy/research runners.");
}

const mod = await import(pathToFileURL(path.resolve(adaptersModule)).href);
if (!mod.adapters) throw new Error("ADAPTER_MODULE_MUST_EXPORT:adapters");

const registry = loadRegistry(projectRoot);
const run = createRunState({ research_intent: intent, execution_mode: executionMode });
const finished = await runProduction({
  run, registry, from_stage: fromStage, to_stage: toStage,
  context: { adapters: mod.adapters },
});
const reports = writeReports({ run: finished, outDir: reportDir });
console.log(JSON.stringify({ run_id: finished.run_id, status: finished.status, reports }, null, 2));
process.exit(finished.status === "PASS" ? 0 : finished.status === "HOLD" ? 2 : 1);
