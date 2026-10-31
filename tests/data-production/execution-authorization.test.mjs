import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
import { createRunState } from "../../pipelines/data-production/orchestrator/run-state.mjs";
import { runProduction } from "../../pipelines/data-production/orchestrator/orchestrator.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("a disabled registry rejects before adapter calls or run-state mutation", async () => {
  const registry = loadRegistry(root);
  registry.activation.enabled = false;
  let calls = 0;
  const run = createRunState({ research_intent: "authorization negative fixture" });
  const before = structuredClone(run);
  await assert.rejects(runProduction({ run, registry, context: {
    adapters: { D00: async () => { calls++; throw new Error("ADAPTER_MUST_NOT_RUN"); } },
    verifyExecutionAuthority: () => true,
  } }), /REGISTRY_NOT_ACTIVE/);
  assert.equal(calls, 0);
  assert.deepEqual(run, before);
});

test("an enabled registry cannot authorize itself without an independent signed grant", async () => {
  const registry = loadRegistry(root);
  registry.status = "ACTIVE_AUTHORIZED";
  registry.activation.enabled = true;
  for (const job of registry.jobs) {
    job.execution_policy.enabled = true;
    job.execution_policy.attended = true;
    job.implementation.gate_reviewer_binding = "independent-test-reviewer";
  }
  await assert.rejects(runProduction({ run: createRunState({ research_intent: "self-authorization denied" }), registry,
    context: { verifyExecutionAuthority: () => true } }), /EXECUTION_SIGNED_GRANT_MISSING/);
});

test("registry loader enforces the versioned schema, including execution policy types", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "specs/data-production/production-registry.json")));
  registry.jobs[0].execution_policy.enabled = "false";
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "mohen-registry-negative-"));
  try {
    fs.mkdirSync(path.join(temp, "specs/data-production/schemas"), { recursive: true });
    fs.copyFileSync(path.join(root, "specs/data-production/schemas/production-registry.schema.json"), path.join(temp, "specs/data-production/schemas/production-registry.schema.json"));
    fs.writeFileSync(path.join(temp, "specs/data-production/production-registry.json"), JSON.stringify(registry));
    assert.throws(() => loadRegistry(temp), /REGISTRY_SCHEMA_INVALID/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test("CLI cannot evaluate an adapter module before checking execution authorization", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "mohen-cli-negative-"));
  try {
    const marker = path.join(temp, "adapter-evaluated");
    const adapter = path.join(temp, "adapter.mjs");
    fs.writeFileSync(adapter, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'bad'); export const adapters = {};`);
    const child = spawnSync(process.execPath, ["pipelines/data-production/run.mjs", "--intent", "deny before import", "--adapters", adapter], { cwd: root, encoding: "utf8" });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /REGISTRY_NOT_ACTIVE/);
    assert.equal(fs.existsSync(marker), false);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
