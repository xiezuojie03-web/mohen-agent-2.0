#!/usr/bin/env node
// MAB step 2.1 LOCAL ISOLATED execution authorizer. This tool is engineering
// scaffolding for the M5 remediation database only; it is NOT the independent
// production execution authority and grants no product Gate qualification.
//
//   init        generate key material (Ed25519 signing, TLS verifier, PG TLS CA)
//   pgcert      generate the PostgreSQL server certificate signed by that CA
//   serve       run the local HTTPS one-use-nonce verifier
//   grant       sign a stage execution grant for an exact run/stage/input
//   run         sign + start an ephemeral verifier + launch pipelines/data-production/run.mjs
//
// The runner verifies the EdDSA signature, the exact scope claims and the live
// nonce attestation itself; this tool cannot weaken that fail-closed chain.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import httpz from "node:https";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const stateDir = () => process.env.MOHEN_LOCAL_EXECUTION_AUTH_DIR || "D:/MoHen/keys/execution-auth";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

function readPem(name) {
  const p = path.join(stateDir(), name);
  if (!fs.existsSync(p)) throw new Error(`AUTH_STATE_MISSING:${name} (run: local-execution-authorizer init)`);
  return fs.readFileSync(p, "utf8");
}

async function loadRegistryInstance() {
  const { loadRegistry } = await import("../pipelines/data-production/orchestrator/registry.mjs");
  return loadRegistry(repoRoot);
}

function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 30000 })).toString("base64url");
  const sig = Buffer.from(crypto.createHmac("sha256", secret).update(payload).digest()).toString("base64url");
  return `${payload}.${sig}`;
}

// ---------- init ----------
async function init() {
  const dir = stateDir();
  fs.mkdirSync(dir, { recursive: true });
  const selfsigned = (await import("selfsigned")).default;
  // Ed25519 signing identity for stage grants.
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(path.join(dir, "signing-private.pem"), privateKey.export({ type: "pkcs8", format: "pem" }));
  fs.writeFileSync(path.join(dir, "signing-public.pem"), publicKey.export({ type: "spki", format: "pem" }));
  // Local CA + HTTPS verifier certificate (separate from the PG server cert).
  const ca = await selfsigned.generate([{ name: "commonName", value: "MoHen local isolated CA" }], {
    keyType: "ec", curve: "P-256", algorithm: "sha256", days: 825,
    extensions: [{ name: "basicConstraints", cA: true }, { name: "keyUsage", keyCertSign: true, cRLSign: true }],
  });
  fs.writeFileSync(path.join(dir, "tls-ca-key.pem"), ca.private);
  fs.writeFileSync(path.join(dir, "tls-ca-cert.pem"), ca.cert);
  const verifier = await selfsigned.generate([{ name: "commonName", value: "localhost" }], {
    keyType: "ec", curve: "P-256", algorithm: "sha256", days: 825,
    extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: "localhost" }, { type: 7, ip: "127.0.0.1" }] }],
    ca: { key: ca.private, cert: ca.cert },
  });
  fs.writeFileSync(path.join(dir, "verifier-key.pem"), verifier.private);
  fs.writeFileSync(path.join(dir, "verifier-cert.pem"), verifier.cert);
  if (!fs.existsSync(path.join(dir, "credential"))) {
    fs.writeFileSync(path.join(dir, "credential"), crypto.randomBytes(32).toString("hex"));
  }
  if (!fs.existsSync(path.join(dir, "hold_epoch"))) {
    fs.writeFileSync(path.join(dir, "hold_epoch"), `m5-local-${crypto.randomUUID()}`);
  }
  if (!fs.existsSync(path.join(dir, "issued-grants.jsonl"))) {
    fs.writeFileSync(path.join(dir, "issued-grants.jsonl"), "");
  }
  console.log("INIT_OK", dir);
}

// ---------- pgcert ----------
async function pgcert() {
  const dir = stateDir();
  fs.mkdirSync(dir, { recursive: true });
  const selfsigned = (await import("selfsigned")).default;
  const ca = {
    key: readPem("tls-ca-key.pem"), cert: readPem("tls-ca-cert.pem"),
  };
  const server = await selfsigned.generate([{ name: "commonName", value: "localhost" }], {
    keyType: "ec", curve: "P-256", algorithm: "sha256", days: 825,
    extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: "localhost" }, { type: 7, ip: "127.0.0.1" }] }],
    ca,
  });
  fs.writeFileSync(path.join(dir, "pg-server-key.pem"), server.private);
  fs.writeFileSync(path.join(dir, "pg-server-cert.pem"), server.cert);
  console.log("PGCERT_OK", path.join(dir, "pg-server-cert.pem"));
}

// ---------- grant signing ----------
function loadJournal() {
  const file = path.join(stateDir(), "issued-grants.jsonl");
  const issued = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (record.consumed_jti) {
      const issued0 = issued.get(record.consumed_jti);
      if (issued0) issued0.consumed = true;
    } else issued.set(record.jti, record);
  }
  return { file, issued };
}

async function buildGrant({ stage, runId, mode = "attended", intent, scopeFile, inputFile }) {
  const { executionDigest } = await import("../pipelines/data-production/orchestrator/execution-authority.mjs");
  const registry = await loadRegistryInstance();
  const job = registry.jobs.find(j => j.stage === stage);
  if (!job) throw new Error(`STAGE_JOB_NOT_FOUND:${stage}`);
  let input;
  if (stage === "D00") {
    if (!intent || !scopeFile) throw new Error("D00_GRANT_REQUIRES_INTENT_AND_SCOPE_FILE");
    input = { research_intent: intent, scope: JSON.parse(fs.readFileSync(path.resolve(scopeFile), "utf8")) };
  } else {
    if (!inputFile) throw new Error(`${stage}_GRANT_REQUIRES_INPUT_FILE`);
    input = JSON.parse(fs.readFileSync(path.resolve(inputFile), "utf8"));
  }
  const iat = Math.floor(Date.now() / 1000);
  const claims = {
    iss: "mohen-independent-execution-authorizer",
    aud: "mohen-production-stage",
    run_id: runId,
    stage,
    job_id: job.job_id,
    mode,
    architecture_generation: registry.architecture_generation,
    iat, exp: iat + 240,
    jti: crypto.randomBytes(24).toString("hex"),
    hold_epoch: readPem("hold_epoch").trim(),
    registry_digest: executionDigest(registry),
    input_digest: executionDigest(input),
    authorized_conditions: Object.fromEntries((job.execution_policy?.enable_requires ?? []).map(k => [k, true])),
  };
  const header = { alg: "EdDSA", typ: "MOHEN-STAGE", kid: "mohen-stage-v1" };
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const c = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.sign(null, Buffer.from(`${h}.${c}`), crypto.createPrivateKey(readPem("signing-private.pem")));
  const token = `${h}.${c}.${Buffer.from(signature).toString("base64url")}`;
  const { file, issued } = loadJournal();
  issued.set(claims.jti, { jti: claims.jti, claims, consumed: false });
  fs.appendFileSync(file, `${JSON.stringify({ jti: claims.jti, claims, consumed: false })}\n`);
  return { token, claims, job };
}

async function grant() {
  const stage = arg("stage");
  const runId = arg("run-id");
  if (!stage || !runId) throw new Error("grant requires --stage and --run-id");
  const { token, claims } = await buildGrant({
    stage, runId, mode: arg("mode", "attended"),
    intent: arg("intent"), scopeFile: arg("scope-file"), inputFile: arg("input-file"),
  });
  console.log(JSON.stringify({ stage, run_id: runId, jti: claims.jti, exp: claims.exp,
    tokens: { [stage]: token } }));
}

// ---------- verifier ----------
function createVerifier({ port = 0 } = {}) {
  const credential = readPem("credential").trim();
  const { file, issued } = loadJournal();
  const server = httpz.createServer(
    { key: readPem("verifier-key.pem"), cert: readPem("verifier-cert.pem") },
    (req, res) => {
      if (req.method !== "POST") { res.writeHead(405).end(); return; }
      const auth = req.headers.authorization ?? "";
      const expected = `Bearer ${credential}`;
      const okAuth = auth.length === expected.length && crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
      if (!okAuth) { res.writeHead(401).end(); return; }
      let body = "";
      req.on("data", chunk => { body += chunk; if (body.length > 4096) req.destroy(); });
      req.on("end", () => {
        try {
          const request = JSON.parse(body);
          const record = issued.get(request.jti);
          if (!record) { res.writeHead(404).end(); return; }
          if (record.consumed) { res.writeHead(409).end(); return; }
          const c = record.claims;
          if (request.run_id !== c.run_id || request.stage !== c.stage || request.job_id !== c.job_id ||
              request.mode !== c.mode || request.hold_epoch !== c.hold_epoch ||
              request.registry_digest !== c.registry_digest || request.input_digest !== c.input_digest) {
            res.writeHead(403).end(); return;
          }
          record.consumed = true;
          fs.appendFileSync(file, `${JSON.stringify({ consumed_jti: c.jti, at: new Date().toISOString() })}\n`);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ allowed: true, consumed_nonce: c.jti, run_id: c.run_id, stage: c.stage,
            job_id: c.job_id, mode: c.mode, hold_epoch: c.hold_epoch,
            registry_digest: c.registry_digest, input_digest: c.input_digest }));
        } catch { res.writeHead(400).end(); }
      });
    });
  return new Promise(resolve => server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

async function serve() {
  const { port } = await createVerifier({ port: Number(arg("port", "8787")) });
  console.log(`VERIFIER_LISTENING https://127.0.0.1:${port}/consume`);
}

// ---------- run ----------
async function run() {
  const stage = arg("stage");
  const runId = arg("run-id") || crypto.randomUUID();
  const intent = arg("intent");
  const scopeFile = arg("scope-file");
  const resumeInputFile = arg("resume-input-file");
  const reportDir = arg("report-dir");
  if (!stage || !intent) throw new Error("run requires --stage and --intent");

  const registry = await loadRegistryInstance();
  const job = registry.jobs.find(j => j.stage === stage);
  if (!job) throw new Error(`STAGE_JOB_NOT_FOUND:${stage}`);

  // Control-plane row for this run (the runner only advances existing rows).
  const { run: exec, queryRows, getNodePgPool } = await import("../packages/data-access/src/index.mjs");
  const scope = scopeFile ? JSON.parse(fs.readFileSync(path.resolve(scopeFile), "utf8")) : {};
  await exec(
    `insert into control.production_runs(run_id,research_intent,scope,execution_mode,status)
     values (:'run_id'::uuid, :'intent', :'scope'::jsonb, 'attended', 'RUNNING')
     on conflict (run_id) do update set status='RUNNING', current_stage=null, finished_at=null`,
    { run_id: runId, intent, scope: JSON.stringify(scope) });

  const { token } = await buildGrant({ stage, runId, mode: "attended", intent, scopeFile, inputFile: resumeInputFile });
  const { server, port } = await createVerifier();

  const env = {
    ...process.env,
    DATABASE_URL: process.env.MOHEN_PRODUCER_DATABASE_URL,
    MOHEN_EXECUTION_AUTH_TOKENS: JSON.stringify({ [stage]: token }),
    MOHEN_EXECUTION_AUTH_PUBLIC_KEY: readPem("signing-public.pem"),
    MOHEN_EXECUTION_AUTH_VERIFY_URL: `https://127.0.0.1:${port}/consume`,
    MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL: readPem("credential").trim(),
    NODE_EXTRA_CA_CERTS: path.join(stateDir(), "tls-ca-cert.pem"),
    MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED: "true",
    ...(process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL
      ? { MOHEN_PRIVATE_WORKER_DATABASE_URL: process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL } : {}),
    ...(process.env.MOHEN_DATABASE_SESSION_SECRET
      ? { MOHEN_PRIVATE_WORKER_OWNER_SESSION: makeToken("270bcecf-9bfb-4865-9432-a0ac9db8df75", process.env.MOHEN_DATABASE_SESSION_SECRET) } : {}),
    MOHEN_ORIGINAL_BRIDGE_KEY_VERSION: process.env.MOHEN_ORIGINAL_BRIDGE_KEY_VERSION || "mab-original-bridge-v1",
    MOHEN_DATABASE_CA_CERT: readPem("tls-ca-cert.pem"),
    ...(resumeInputFile ? { MOHEN_TRUSTED_RESUME_INPUT_DIR: path.dirname(path.resolve(resumeInputFile)) } : {}),
  };
  if (!env.DATABASE_URL) throw new Error("MOHEN_PRODUCER_DATABASE_URL missing");

  const args = ["pipelines/data-production/run.mjs",
    "--from", stage, "--to", stage,
    "--adapters", job.implementation.adapter_binding,
    "--intent", intent, "--run-id", runId,
    ...(scopeFile ? ["--scope-file", scopeFile] : []),
    ...(resumeInputFile ? ["--resume-input-file", resumeInputFile] : []),
    ...(reportDir ? ["--report-dir", reportDir] : [])];
  console.log(`RUN ${stage} run_id=${runId}`);
  const child = spawn(process.execPath, args, { cwd: repoRoot, env, stdio: "inherit" });
  const code = await new Promise(resolve => child.on("exit", resolve));
  server.close();
  await getNodePgPool().end().catch(() => {});
  process.exit(code ?? 1);
}

const command = process.argv[2];
try {
  if (command === "init") await init();
  else if (command === "pgcert") await pgcert();
  else if (command === "grant") await grant();
  else if (command === "serve") await serve();
  else if (command === "run") await run();
  else throw new Error("usage: local-execution-authorizer <init|pgcert|grant|serve|run> [options]");
} catch (error) {
  console.error(String(error?.message || error));
  process.exit(1);
}
