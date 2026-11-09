// MAB M5: LOCAL ISOLATED read-only current-Gate qualification verifier.
//
// This is the HTTPS endpoint that run.mjs's createOptionalIndependentGateClient
// calls. It never signs, never writes control.gate_audits, and never receives a
// Gate signing credential. It only reads the currently valid qualification for
// an exact (run_id, gate_code, input_fingerprint) and returns a bounded receipt.
//
// Security model:
//   - The Producer process holds no signer role; it can only submit candidates.
//   - The qualification receipt comes from this separate read-only service.
//   - input_digest is verified against audit.input_fingerprint (stamped at
//     candidate submission, copied into the audit at sign time).
//   - current_qualification_is_valid() enforces the audit is the current one,
//     all upstream dependencies are current, the policy is enabled and the
//     reviewer binding is active.
//   - output_digest is echoed back verbatim: the orchestrator independently
//     checks it equals executionDigest(this stage's output). The object
//     binding comes from audit.object_type/object_id/artifact_revision, which
//     sign_gate_candidate pins against control.artifact_revision_for() at sign
//     time and refuses to sign if the artifact revision is not current.
import httpz from "node:https";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const STATE_DIR = process.env.MOHEN_LOCAL_EXECUTION_AUTH_DIR || "D:/MoHen/keys/execution-auth";
const CRED_FILE = process.env.MOHEN_GATE_VERIFIER_CREDENTIAL_FILE || "D:/MoHen/keys/gate-verifier/credential";
const PORT = Number(process.env.MOHEN_GATE_VERIFIER_PORT || "8788");

function readPem(name) {
  const p = path.join(STATE_DIR, name);
  if (!fs.existsSync(p)) throw new Error(`AUTH_STATE_MISSING:${name} (run: local-execution-authorizer init)`);
  return fs.readFileSync(p, "utf8");
}

const credential = fs.readFileSync(CRED_FILE, "utf8").trim();
if (credential.length < 32) throw new Error("GATE_VERIFIER_CREDENTIAL_TOO_SHORT");

// Read-only producer connection: can SELECT control.gate_audits and EXECUTE
// control.current_qualification_is_valid, but cannot read qualification_current
// directly. We resolve the current audit by enumerating PASS audits for the
// run+gate and checking current_qualification_is_valid on each.
async function getDb() {
  const db = await import("../packages/data-access/src/index.mjs");
  return db;
}

const SHA = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GATES = new Set(["G0", "G1", "G2", "G3", "G4", "G5"]);
const STAGES = new Set(["D00", "D01", "D02", "D03", "D04", "D05"]);

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
  res.end(text);
}

async function handleVerify(req, res) {
  let body = "";
  req.on("data", chunk => { body += chunk; if (body.length > 8192) req.destroy(); });
  req.on("end", async () => {
    let request;
    try { request = JSON.parse(body); } catch { return sendJson(res, 400, { error: "INVALID_JSON" }); }
    const { run_id, job_id, stage, gate_code, input_digest, output_digest, reviewer_binding_ref, consumer } = request || {};
    if (!run_id || !UUID.test(run_id) || !job_id || typeof job_id !== "string" ||
        !STAGES.has(stage) || !GATES.has(gate_code) || gate_code !== "G" + stage.slice(-1) ||
        !SHA.test(input_digest || "") || !SHA.test(output_digest || "") ||
        consumer !== "producer") {
      return sendJson(res, 400, { error: "INVALID_REQUEST" });
    }
    try {
      const db = await getDb();
      // Find all independent PASS audits for this run+gate, newest first.
      const audits = await db.queryRows(
        `select a.gate_audit_id, a.object_type, a.object_id, a.artifact_revision, a.input_fingerprint,
                a.valid_until, a.rule_version, a.reviewer_user_id
         from control.gate_audits a
         where a.run_id=:'run'::uuid and a.gate_code=:'gate'
           and a.result='PASS' and a.decision_origin='independent_gate'
         order by a.signed_at desc`,
        { run: run_id, gate: gate_code });
      let current = null;
      for (const a of audits) {
        if (a.input_fingerprint !== input_digest) continue;
        const ok = await db.queryRows(
          `select control.current_qualification_is_valid(:'id'::uuid) as valid`,
          { id: a.gate_audit_id });
        if (ok[0]?.valid === true || ok[0]?.valid === "t") { current = a; break; }
      }
      if (!current) return sendJson(res, 404, { error: "NO_CURRENT_QUALIFICATION" });
      const receipt = {
        qualification_current: true,
        decision_origin: "independent_gate",
        result: "PASS",
        run_id, stage, job_id, gate_code,
        input_digest, output_digest,
        reviewer_binding_ref: reviewer_binding_ref ?? null,
        consumer: "producer",
        gate_audit_id: current.gate_audit_id,
        artifact_revision: current.artifact_revision,
        object_type: current.object_type,
        object_id: current.object_id,
        valid_until: current.valid_until,
      };
      return sendJson(res, 200, receipt);
    } catch (err) {
      console.error("verify error", String(err?.message || err));
      return sendJson(res, 500, { error: "VERIFIER_INTERNAL" });
    }
  });
}

const server = httpz.createServer(
  { key: readPem("verifier-key.pem"), cert: readPem("verifier-cert.pem") },
  (req, res) => {
    if (req.method === "GET" && req.url === "/health") { res.writeHead(200).end("ok"); return; }
    if (req.method !== "POST" || req.url !== "/verify") { res.writeHead(404).end(); return; }
    const auth = req.headers.authorization || "";
    const expected = "Bearer " + credential;
    const okAuth = auth.length === expected.length && crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
    if (!okAuth) { res.writeHead(401).end(); return; }
    handleVerify(req, res);
  });

server.listen(PORT, "127.0.0.1", () => {
  console.log(`GATE_VERIFIER_LISTENING https://127.0.0.1:${PORT}/verify`);
});
