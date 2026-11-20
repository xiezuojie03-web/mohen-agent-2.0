// Runner-owned, read-only independent-Gate verifier. It reuses the SAME
// read-only /current service and the SAME bounded client used by the hosted
// HTTPS endpoint; only the transport is in-process. The Producer still never
// gets a signer role: the reader pool is a distinct low-privilege LOGIN and
// the client validates nothing about PASS by itself (the orchestrator's
// requireIndependentStageQualification binds every field independently).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { createIndependentGateService } from "./independent-gate-service.mjs";
import { createIndependentGateClient } from "./independent-gate-client.mjs";
import { independentGatePoolOptions } from "./independent-gate-service-runtime.mjs";

const { fileURLToPath } = await import("node:url");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const require = createRequire(path.join(repoRoot, "packages/data-access/package.json"));
const { Pool } = require("pg");

const ENDPOINT = "https://independent.invalid/current";

/**
 * Build an in-process verifyStageQualification callback from a low-privilege
 * reader DATABASE_URL and a consume credential. No signer pool, no session
 * key, no TLS certificate: the read-only service forbids review routes.
 */
export function createInProcessGateReaderVerifier({
  readerDatabaseUrl,
  credential,
  ca,
  poolFactory = url => new Pool(independentGatePoolOptions(url, ca ? { ca } : {})),
} = {}) {
  if (typeof readerDatabaseUrl !== "string" || !readerDatabaseUrl ||
      typeof credential !== "string" || credential.length < 32)
    throw Error("INPROCESS_GATE_READER_CONFIG_REQUIRED");
  const options = independentGatePoolOptions(readerDatabaseUrl);
  if (options.user === "postgres" || options.user === "mohen_producer" ||
      options.user === "mohen_gate_signer" || options.user === "mohen_gate_authority" ||
      options.user === "supabase_admin")
    throw Error("INPROCESS_GATE_READER_ROLE_REQUIRED");
  const pool = poolFactory(readerDatabaseUrl);
  const service = createIndependentGateService({ readOnly: true, readerPool: pool });
  // Route the bounded client through the in-process read-only service. The
  // service hashes the bearer, authenticates it as 'consume' on the reader
  // pool, and calls control.read_gate_stage_qualification. No bytes leave.
  const fetcher = async (url, init) => service(new Request(url, init));
  const verify = createIndependentGateClient({ endpoint: ENDPOINT, credential, fetcher });
  verify.close = async () => { try { await pool.end(); } catch {} };
  return verify;
}

/**
 * Environment factory. Returns null (never a fallback PASS) unless both the
 * reader DATABASE_URL and the consume credential are configured. CA is read
 * in-process only when its path is provided; nothing is logged or persisted.
 */
export function createOptionalInProcessGateReaderVerifier(environment = process.env) {
  const readerDatabaseUrl = environment.MOHEN_RUNNER_GATE_READER_DATABASE_URL;
  const credential = environment.MOHEN_RUNNER_GATE_CONSUME_CREDENTIAL;
  const caPath = environment.MOHEN_RUNNER_GATE_READER_CA_PATH;
  // Partial config is NOT a usable verifier and must not become a PASS path.
  if (!readerDatabaseUrl || !credential) return null;
  let ca;
  if (caPath) {
    const resolved = path.resolve(caPath);
    if (!fs.existsSync(resolved)) throw Error("INPROCESS_GATE_READER_CA_MISSING");
    ca = fs.readFileSync(resolved, "utf8");
  }
  return createInProcessGateReaderVerifier({ readerDatabaseUrl, credential, ca });
}
