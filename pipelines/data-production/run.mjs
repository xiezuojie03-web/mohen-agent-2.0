#!/usr/bin/env node
import {createTrustedPreviewFetch} from "./orchestrator/trusted-preview-fetch.mjs";
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
import { createOptionalInProcessGateReaderVerifier } from "./orchestrator/inprocess-gate-reader-verifier.mjs";
import { persistStageProgress, finalizeRun } from "./orchestrator/run-persistence.mjs";
import {createPrivateEvidenceRuntimeLoader} from "./workers/private-evidence-runtime.mjs";

// The protected deployment probe stops after evaluating the real entry graph.
if(process.argv.length===3&&process.argv[2]==='--check-startup')process.exit(0);

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
// D00 消费者方法计划（C 方法预选）：可选，缺省即不预选，由 G0 失败关闭。
const methodPlanArg = arg("method-plan");
// D00 分段材料（目录/覆盖/核查/优先级/取用）：可选，缺省即各段都不写。
const sectionsArg = arg("sections");
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
const consumerMethodPlan = methodPlanArg === null
  ? undefined
  : (await import("../../tools/lib/method-plan-input.mjs")).readMethodPlanArg(methodPlanArg);
const sections = sectionsArg === null
  ? undefined
  : (await import("../../tools/lib/method-plan-input.mjs")).readSectionsArg(sectionsArg);
const run = createRunState({ research_intent: intent, ...(scope !== undefined ? { scope } : {}), execution_mode: executionMode, run_id: runId || undefined, ...(consumerMethodPlan === undefined ? {} : { consumer_method_plan: consumerMethodPlan }), ...(sections === undefined ? {} : { sections }) });

// Lazy data access: no adapter or database side effect before execution authorization.
async function queryRows(...args) {
  const db = await import("../../packages/data-access/src/index.mjs");
  return db.queryRows(...args);
}
const tokens = process.env.MOHEN_EXECUTION_AUTH_TOKENS
  ? JSON.parse(process.env.MOHEN_EXECUTION_AUTH_TOKENS) : undefined;

// 动态令牌获取：当 MOHEN_EXECUTION_AUTH_TOKENS 中没有某 stage 的预签令牌时，
// 从本地授权服务按需签发（D01–D05 输入依赖上一阶段产出，无法预签）。
// 授权服务必须验证 run_id/stage/job/input 后才签发，Producer 不能自造令牌。
const stageFetch=createTrustedPreviewFetch(process.env);
const dynamicTokenUrl = process.env.MOHEN_EXECUTION_AUTH_DYNAMIC_URL;
const dynamicTokenCredential = process.env.MOHEN_EXECUTION_AUTH_DYNAMIC_CREDENTIAL;
async function fetchStageToken({ stage, job, run, input }) {
  if (!dynamicTokenUrl || !dynamicTokenCredential) {
    throw new Error("EXECUTION_DYNAMIC_TOKEN_ENDPOINT_NOT_CONFIGURED");
  }
  const reply = await stageFetch(dynamicTokenUrl, {
    method: "POST", redirect: "error", cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: { "content-type": "application/json", authorization: `Bearer ${dynamicTokenCredential}` },
    body: JSON.stringify({
      run_id: run.run_id, stage, job_id: job.job_id, mode: run.execution_mode,
      input,
    }),
  });
  if (!reply.ok) throw new Error(`EXECUTION_DYNAMIC_TOKEN_REJECTED:${reply.status}`);
  const data = await reply.json();
  if (typeof data.token !== "string") throw new Error("EXECUTION_DYNAMIC_TOKEN_MALFORMED");
  return data.token;
}

// This is only a READ-ONLY qualification check. No credentials means the
// existing independent-Gate guard holds every Producer PASS (never a fallback).
// Prefer an in-process low-privilege /current reader when configured; otherwise
// fall back to the hosted HTTPS /current client. Both reach the same SQL RPC.
const gateVerifier = createOptionalInProcessGateReaderVerifier(process.env) ??
  createOptionalIndependentGateClient(process.env,stageFetch);

const privateRuntime=createPrivateEvidenceRuntimeLoader();
let finished,reports;
try {
finished = await runProduction({
  run, registry, from_stage: fromStage, to_stage: toStage,
  context: {
    execution_authority_tokens: tokens,
    ...(dynamicTokenUrl && dynamicTokenCredential ? { fetchStageToken } : {}),
    loadPrivateEvidenceRuntime:()=>privateRuntime.load(),
    ...(resumeInput!==undefined?{resume_input:resumeInput}:{}),
    ...(gateVerifier ? {verifyStageQualification: gateVerifier} : {}),
    loadAdapters: async () => {
      assertAdapterBinding(projectRoot, registry, adaptersModule, selectedStages, run.scope);
      const { assertProducerIdentity } = await import("../../packages/data-access/src/producer-identity.mjs");
      const db = await import("../../packages/data-access/src/index.mjs");
      await assertProducerIdentity(db.queryRows, {cloud:process.env.MOHEN_CLOUD_RUN_PROGRESS_RPC==='true'});
      const mod = await import(pathToFileURL(path.resolve(adaptersModule)).href);
      if (!mod.adapters) throw new Error("ADAPTER_MODULE_MUST_EXPORT:adapters");
      return mod.adapters;
    },
    onStage: async (stage) => {
      await persistStageProgress({ runId: run.run_id, stage, db: { queryRows },
        ...(process.env.MOHEN_CLOUD_RUN_PROGRESS_RPC==='true'
          ? {ownerSessionToken:process.env.MOHEN_PRIVATE_WORKER_OWNER_SESSION}: {}) });
    },
  },
});
reports = await finalizeRun({ run: finished, db: { queryRows }, outDir: reportDir,
  ...(process.env.MOHEN_CLOUD_RUN_PROGRESS_RPC==='true'
    ? {ownerSessionToken:process.env.MOHEN_PRIVATE_WORKER_OWNER_SESSION}: {}) });
}finally{await privateRuntime.close();}
console.log(JSON.stringify({ run_id: finished.run_id, status: finished.status, reports }, null, 2));
process.exit(finished.status === "PASS" ? 0 : finished.status === "HOLD" ? 2 : 1);
