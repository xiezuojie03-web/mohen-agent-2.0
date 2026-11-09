#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import {STAGE_ORDER} from "./orchestrator/contracts.mjs";
import {loadTrustedResumeInput} from "./orchestrator/resume-input.mjs";
import { pathToFileURL } from "node:url";
import { loadRegistry } from "./orchestrator/registry.mjs";
import { createRunState } from "./orchestrator/run-state.mjs";
import { runProduction } from "./orchestrator/orchestrator.mjs";
import { assertAdapterBinding } from "./orchestrator/adapter-binding.mjs";
import { assertExecutionAuthorityConfigured } from "./orchestrator/execution-authority.mjs";
import { createOptionalIndependentGateClient } from "./orchestrator/independent-gate-client.mjs";
import { persistStageProgress, finalizeRun } from "./orchestrator/run-persistence.mjs";
import {createPrivateEvidenceRuntimeLoader} from "./workers/private-evidence-runtime.mjs";

// Load .env.local before createOptionalIndependentGateClient() reads
// MOHEN_INDEPENDENT_GATE_VERIFY_URL / _CREDENTIAL. data-access/index.mjs also
// loads dotenv, but it is imported lazily (queryRows) and would run too late.
(function loadDotEnv() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "").split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
})();

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
const resumeInputFile = arg("resume-input-file");
const scopeFile = arg("scope-file");
const reportDir = path.resolve(arg("report-dir", path.join(projectRoot, "verification", "data-production-runs")));

if (!intent) throw new Error("--intent is required");
// Per-run explicit scope (D00 source intake): a bounded local JSON object such
// as {project_id, original_id, page_number}. It is input data, not authority.
let scope;
if (scopeFile !== null) {
  const fs = await import("node:fs");
  const bytes = fs.readFileSync(path.resolve(scopeFile));
  if (bytes.length > 8192) throw new Error("SCOPE_FILE_TOO_LARGE");
  scope = JSON.parse(bytes.toString("utf8"));
  if (!scope || typeof scope !== "object" || Array.isArray(scope))
    throw new Error("SCOPE_FILE_OBJECT_REQUIRED");
}
if (!adaptersModule) {
  throw new Error("--adapters is required. Phase D forbids hidden fallback to legacy/research runners.");
}

const registry = loadRegistry(projectRoot);
const start=STAGE_ORDER.indexOf(fromStage),end=STAGE_ORDER.indexOf(toStage);
if(start<0||end<0||start>end)throw Error("STAGE_RANGE_INVALID");
if(start>0&&(registry.status!=="ACTIVE_AUTHORIZED"||registry.activation?.enabled!==true))
  throw Error("REGISTRY_NOT_ACTIVE");
const resumeInput=loadTrustedResumeInput({
  stage:fromStage,filePath:resumeInputFile,
  trustedDirectory:process.env.MOHEN_TRUSTED_RESUME_INPUT_DIR,
});
// No adapter module evaluation or further CLI work before the independent
// execution authority is at least configured (full per-stage grant
// verification still happens inside the orchestrator).
assertExecutionAuthorityConfigured(process.env.MOHEN_EXECUTION_AUTH_TOKENS);
const selectedStages=STAGE_ORDER.slice(start,end+1);
const run = createRunState({ research_intent: intent, ...(scope !== undefined ? { scope } : {}), execution_mode: executionMode, run_id: runId || undefined });

// Lazy data access: no adapter or database side effect before execution authorization.
async function queryRows(...args) {
  const db = await import("../../packages/data-access/src/index.mjs");
  return db.queryRows(...args);
}
const tokens = process.env.MOHEN_EXECUTION_AUTH_TOKENS
  ? JSON.parse(process.env.MOHEN_EXECUTION_AUTH_TOKENS) : undefined;

// This is only a READ-ONLY qualification check. No credentials means the
// existing independent-Gate guard holds every Producer PASS (never a fallback).
const gateVerifier = createOptionalIndependentGateClient();

const privateRuntime=createPrivateEvidenceRuntimeLoader();
let finished,reports;
try {
finished = await runProduction({
  run, registry, from_stage: fromStage, to_stage: toStage,
  context: {
    execution_authority_tokens: tokens,
    loadPrivateEvidenceRuntime:()=>privateRuntime.load(),
    ...(resumeInput!==undefined?{resume_input:resumeInput}:{}),
    ...(gateVerifier ? {verifyStageQualification: gateVerifier} : {}),
    loadAdapters: async () => {
      assertAdapterBinding(projectRoot, registry, adaptersModule, selectedStages);
      const { assertProducerIdentity } = await import("../../packages/data-access/src/producer-identity.mjs");
      const db = await import("../../packages/data-access/src/index.mjs");
      await assertProducerIdentity(db.queryRows);
      const mod = await import(pathToFileURL(path.resolve(adaptersModule)).href);
      if (!mod.adapters) throw new Error("ADAPTER_MODULE_MUST_EXPORT:adapters");
      return mod.adapters;
    },
    onStage: async (stage) => {
      await persistStageProgress({ runId: run.run_id, stage, db: { queryRows } });
    },
  },
});
reports = await finalizeRun({ run: finished, db: { queryRows }, outDir: reportDir });
}finally{await privateRuntime.close();}
console.log(JSON.stringify({ run_id: finished.run_id, status: finished.status, reports }, null, 2));
process.exit(finished.status === "PASS" ? 0 : finished.status === "HOLD" ? 2 : 1);
