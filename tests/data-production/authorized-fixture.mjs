// Test-only independent signing identity and in-memory live-verifier boundary.
// No production bypass, network call, database or real qualification is involved.
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { executionDigest } from "../../pipelines/data-production/orchestrator/execution-authority.mjs";
import { runProduction } from "../../pipelines/data-production/orchestrator/orchestrator.mjs";

export async function withExecutionAuthority(callback) {
  const names = ["MOHEN_EXECUTION_AUTH_PUBLIC_KEY", "MOHEN_EXECUTION_AUTH_VERIFY_URL", "MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL"];
  const previous = Object.fromEntries(names.map(k => [k, process.env[k]]));
  const previousFetch = globalThis.fetch;
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  process.env.MOHEN_EXECUTION_AUTH_PUBLIC_KEY = publicKey.export({ type: "spki", format: "pem" });
  process.env.MOHEN_EXECUTION_AUTH_VERIFY_URL = "https://independent-test-authorizer.invalid/consume";
  process.env.MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL = "test-only-back-channel-credential-at-least-32-characters";
  const consumed = new Set();
  globalThis.fetch = async (url, options) => {
    if (String(url) !== "https://independent-test-authorizer.invalid/consume" ||
        options.redirect !== "error" || options.headers.authorization !== `Bearer ${process.env.MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL}`) throw new Error("unexpected request");
    const body = JSON.parse(options.body);
    if (consumed.has(body.jti)) return { ok: false };
    consumed.add(body.jti);
    return { ok: true, json: async () => ({ allowed: true, consumed_nonce: body.jti, ...body }) };
  };
  function grant(registry, job, run, input, overrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    const payload = { iss: "mohen-independent-execution-authorizer", aud: "mohen-production-stage", run_id: run.run_id,
      stage: job.stage, job_id: job.job_id, mode: run.execution_mode, architecture_generation: registry.architecture_generation,
      iat: now, exp: now + 60, jti: randomUUID(), hold_epoch: "test-epoch-1", registry_digest: executionDigest(registry),
      input_digest: executionDigest(input), authorized_conditions: Object.fromEntries(job.execution_policy.enable_requires.map(k => [k, true])), ...overrides };
    const header = Buffer.from(JSON.stringify({ alg: "EdDSA", typ: "MOHEN-STAGE", kid: "mohen-stage-v1" })).toString("base64url");
    const claims = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signed = `${header}.${claims}`;
    return `${signed}.${sign(null, Buffer.from(signed), privateKey).toString("base64url")}`;
  }
  try { return await callback({ grant }); }
  finally {
    globalThis.fetch = previousFetch;
    for (const k of names) previous[k] === undefined ? delete process.env[k] : process.env[k] = previous[k];
  }
}

export function activeFixtureRegistry(source) {
  const registry = structuredClone(source);
  registry.status = "ACTIVE_AUTHORIZED";
  registry.activation.enabled = true;
  for (const job of registry.jobs) {
    job.execution_policy.enabled = true;
    job.execution_policy.attended = true;
    job.implementation.gate_reviewer_binding = "independent-fixture-reviewer";
  }
  return registry;
}

export async function runAuthorizedFixture(options) {
  return withExecutionAuthority(async ({ grant }) => {
    const registry = activeFixtureRegistry(options.registry);
    let nextInput = options.from_stage && options.from_stage !== "D00" ? options.context.resume_input
      : { research_intent: options.run.research_intent, scope: options.run.scope };
    const adapters = Object.fromEntries(Object.entries(options.context.adapters).map(([stage, adapter]) => [stage, async args => {
      const result = await adapter(args);
      nextInput = result.output;
      return result;
    }]));
    const tokens = new Proxy({}, { get: (_target, stage) => {
      const job = registry.jobs.find(j => j.stage === stage);
      return grant(registry, job, options.run, nextInput);
    } });
    return runProduction({ ...options, registry, context: { ...options.context, adapters, execution_authority_tokens: tokens } });
  });
}
