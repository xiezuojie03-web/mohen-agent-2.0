import {createTrustedPreviewFetch} from "./trusted-preview-fetch.mjs";
import { createHash, createPublicKey, verify } from "node:crypto";
import { assertNoUnboundTopicInputs, assertNoUnboundPrivateEvidenceInput } from "./adapter-binding.mjs";

// One-use handoff from the already authorized Runner to the private stage
// worker. Only this module can issue a handoff, after live nonce verification;
// a Producer cannot manufacture one through context or a public setter.
const authorizedHandoffs = new WeakMap();
export function consumeAuthorizedStageHandoff({registry,job,run,input}) {
  const proof = run && typeof run === "object" ? authorizedHandoffs.get(run) : null;
  if (!proof) return false;
  authorizedHandoffs.delete(run); // one use even on a mismatched attempt
  return proof.registry === registry && proof.job === job &&
    proof.input === input && run.current_stage === job.stage &&
    proof.inputDigest === executionDigest(input);
}

export function assertExecutionAuthorityConfigured(tokens, environment = process.env) {
  // Cheap pre-flight before the CLI imports any adapter module: the full
  // per-stage grant verification still happens in assertStageExecutionAuthorized.
  const parsed = typeof tokens === "string" ? JSON.parse(tokens) : tokens;
  if (!parsed || typeof parsed !== "object" || Object.values(parsed).some(v => typeof v !== "string"))
    throw Error("EXECUTION_SIGNED_GRANT_MISSING");
  const url = environment.MOHEN_EXECUTION_AUTH_VERIFY_URL;
  if (typeof url !== "string" || !/^https:\/\/.+/.test(url))
    throw Error("EXECUTION_TRUSTED_VERIFIER_NOT_CONFIGURED");
  const credential = environment.MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL;
  if (typeof credential !== "string" || credential.length < 32)
    throw Error("EXECUTION_TRUSTED_VERIFIER_NOT_CONFIGURED");
  if (typeof environment.MOHEN_EXECUTION_AUTH_PUBLIC_KEY !== "string")
    throw Error("EXECUTION_TRUSTED_VERIFIER_NOT_CONFIGURED");
}

/** Canonical digest shared with the independent authorizer, never a caller-supplied digest. */
export function executionDigest(value) {
  function canonical(x) {
    if (x === null || typeof x === "string" || typeof x === "boolean") return x;
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (Array.isArray(x)) return x.map(canonical);
    if (typeof x === "object" && Object.getPrototypeOf(x) === Object.prototype) {
      return Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])]));
    }
    throw new Error("EXECUTION_INPUT_NOT_JSON");
  }
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

/** No private key or Reviewer credentials belong in the Producer process. */
export async function assertStageExecutionAuthorized({ registry, job, run, input, context }) {
  if (registry.status !== "ACTIVE_AUTHORIZED" || registry.activation?.enabled !== true) {
    throw new Error("REGISTRY_NOT_ACTIVE");
  }
  assertNoUnboundTopicInputs();
  assertNoUnboundPrivateEvidenceInput(input, { job });
  const policy = job.execution_policy;
  const mode = run.execution_mode;
  if (policy?.enabled !== true || !["attended", "unattended", "batch", "interactive"].includes(mode) || policy[mode] !== true) {
    throw new Error(`JOB_EXECUTION_DISABLED:${job.stage}`);
  }
  const binding = job.implementation?.gate_reviewer_binding;
  if (typeof binding !== "string" || !binding || /^(TO_VERIFY|PENDING|UNBOUND|NONE)/i.test(binding)) {
    throw new Error(`REVIEWER_BINDING_UNVERIFIED:${job.stage}`);
  }
  let token = context.execution_authority_tokens?.[job.stage] ?? context.execution_authority_token;
  // 动态获取：当预签名令牌不存在时，从授权服务按需签发（D01–D05 的输入
  // 依赖上一阶段产出，无法在 run 启动前预签）。授权服务必须独立验证
  // run_id/stage/job/input 后才签发，Producer 不能自造令牌。
  if (!token && typeof context.fetchStageToken === "function") {
    token = await context.fetchStageToken({ stage: job.stage, job, run, input });
  }
  const publicKey = process.env.MOHEN_EXECUTION_AUTH_PUBLIC_KEY;
  if (typeof token !== "string" || !publicKey) throw new Error("EXECUTION_SIGNED_GRANT_MISSING");
  const parts = token.split(".");
  let header, claims;
  try {
    if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw new Error();
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch { throw new Error("EXECUTION_SIGNED_GRANT_FORMAT_INVALID"); }
  if (header?.alg !== "EdDSA" || header.typ !== "MOHEN-STAGE" || header.kid !== "mohen-stage-v1") {
    throw new Error("EXECUTION_SIGNED_GRANT_ALG_INVALID");
  }
  let signatureOK = false;
  try { signatureOK = verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey(publicKey), Buffer.from(parts[2], "base64url")); }
  catch { /* malformed public keys and signatures fail closed */ }
  if (!signatureOK) throw new Error("EXECUTION_SIGNED_GRANT_SIGNATURE_INVALID");
  const now = Math.floor(Date.now() / 1000);
  if (!claims || claims.iss !== "mohen-independent-execution-authorizer" || claims.aud !== "mohen-production-stage" ||
      claims.run_id !== run.run_id || claims.stage !== job.stage || claims.job_id !== job.job_id || claims.mode !== mode ||
      claims.architecture_generation !== registry.architecture_generation ||
      !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) || claims.exp <= now ||
      claims.iat > now + 30 || claims.exp <= claims.iat || claims.exp - claims.iat > 300 ||
      typeof claims.jti !== "string" || claims.jti.length < 16 || typeof claims.hold_epoch !== "string" || !claims.hold_epoch ||
      claims.registry_digest !== executionDigest(registry) || claims.input_digest !== executionDigest(input) ||
      !Array.isArray(policy.enable_requires) || !policy.enable_requires.every(k => claims.authorized_conditions?.[k] === true)) {
    throw new Error(`EXECUTION_SIGNED_GRANT_SCOPE_INVALID:${job.stage}`);
  }
  let endpoint;
  try { endpoint = new URL(process.env.MOHEN_EXECUTION_AUTH_VERIFY_URL); } catch { /* checked below */ }
  const credential = process.env.MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL;
  if (!endpoint || endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      typeof credential !== "string" || credential.length < 32) {
    throw new Error("EXECUTION_TRUSTED_VERIFIER_NOT_CONFIGURED");
  }
  let attestation;
  try {
    const reply = await createTrustedPreviewFetch(process.env)(endpoint, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
      body: JSON.stringify({ jti: claims.jti, run_id: run.run_id, stage: job.stage, job_id: job.job_id, mode,
        hold_epoch: claims.hold_epoch, registry_digest: claims.registry_digest, input_digest: claims.input_digest }),
    });
    if (!reply.ok) {
      const text = await reply.text().catch(() => "");
      console.error("[execution-authority] verifier rejected status:", reply.status, "body:", text.slice(0, 200));
      throw new Error("verifier rejected");
    }
    attestation = await reply.json();
  } catch (e) {
    console.error("[execution-authority] verifier fetch failed:", e?.message, "url:", process.env.MOHEN_EXECUTION_AUTH_VERIFY_URL, "ca:", process.env.NODE_EXTRA_CA_CERTS);
    throw new Error("EXECUTION_TRUSTED_VERIFIER_UNAVAILABLE");
  }
  if (attestation?.allowed !== true || attestation.consumed_nonce !== claims.jti ||
      attestation.run_id !== run.run_id || attestation.stage !== job.stage ||
      attestation.job_id !== job.job_id || attestation.mode !== mode ||
      attestation.hold_epoch !== claims.hold_epoch || attestation.registry_digest !== claims.registry_digest ||
      attestation.input_digest !== claims.input_digest) throw new Error("EXECUTION_LIVE_AUTHORITY_NOT_CONFIRMED");
  authorizedHandoffs.set(run, {registry,job,input,inputDigest:claims.input_digest});
}
