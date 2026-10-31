import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadRegistry } from "../../pipelines/data-production/orchestrator/registry.mjs";
import { assertStageExecutionAuthorized } from "../../pipelines/data-production/orchestrator/execution-authority.mjs";
import { createRunState } from "../../pipelines/data-production/orchestrator/run-state.mjs";
import { activeFixtureRegistry, withExecutionAuthority } from "./authorized-fixture.mjs";

const root = path.resolve(import.meta.dirname, "../..");
function setup() {
  const registry = activeFixtureRegistry(loadRegistry(root));
  return { registry, job: registry.jobs[0], run: createRunState({ research_intent: "signed grant" }), input: { material: "licensed fixture" } };
}

test("a matching signed grant requires a live one-use authorization", async () => {
  await withExecutionAuthority(async ({ grant }) => {
    const args = setup();
    args.context = { execution_authority_token: grant(args.registry, args.job, args.run, args.input) };
    await assertStageExecutionAuthorized(args);
    await assert.rejects(assertStageExecutionAuthorized(args), /EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE/);
  });
});

for (const [name, overrides] of [
  ["wrong run", { run_id: "different-run" }], ["wrong stage", { stage: "D01" }],
  ["expired", { exp: 1 }], ["excessive lifetime", { exp: Math.floor(Date.now() / 1000) + 600 }],
  ["wrong snapshot", { registry_digest: "a".repeat(64) }], ["wrong input", { input_digest: "b".repeat(64) }],
  ["missing conditions", { authorized_conditions: {} }],
]) test(`rejects signed grant with ${name}`, async () => {
  await withExecutionAuthority(async ({ grant }) => {
    const args = setup();
    args.context = { execution_authority_token: grant(args.registry, args.job, args.run, args.input, overrides) };
    await assert.rejects(assertStageExecutionAuthorized(args), /EXECUTION_SIGNED_GRANT_SCOPE_INVALID/);
  });
});

test("a different actual input cannot reuse the caller supplied digest", async () => {
  await withExecutionAuthority(async ({ grant }) => {
    const args = setup();
    args.context = { execution_authority_token: grant(args.registry, args.job, args.run, args.input), input_digest: "untrusted" };
    args.input.material = "other input";
    await assert.rejects(assertStageExecutionAuthorized(args), /EXECUTION_SIGNED_GRANT_SCOPE_INVALID/);
  });
});

test("a live response for a different job cannot authorize this job", async () => {
  await withExecutionAuthority(async ({ grant }) => {
    const args = setup();
    args.context = { execution_authority_token: grant(args.registry, args.job, args.run, args.input) };
    const live = globalThis.fetch;
    globalThis.fetch = async (...params) => {
      const reply = await live(...params);
      const body = await reply.json();
      return { ok: true, json: async () => ({ ...body, job_id: "other.job" }) };
    };
    await assert.rejects(assertStageExecutionAuthorized(args), /EXECUTION_LIVE_AUTHORITY_NOT_CONFIRMED/);
  });
});
