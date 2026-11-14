// MAB M5: LOCAL ISOLATED combined Gate service — read-only current qualification
// verification + on-demand deterministic machine-rule signing.
//
// 为什么需要这个服务：
//   run.mjs 在每个阶段 PASS 后立即调用 verifyStageQualification 查当前资格。
//   Producer 只写 gate_candidates，不能自签 gate_audits。本地隔离开发需要一个
//   独立进程在 verify 时按需把 SUBMITTED 候选签成 audit，管线才能继续下一个阶段。
//
// 安全边界（本地隔离）：
//   - 只读查询用 MOHEN_GATE_MACHINE_DATABASE_URL（mohen_gate_signer_m5_machine 登录）。
//   - 签发走 control.sign_gate_candidate，由该登录的 mohen_gate_signer 角色执行。
//   - 规则评审复用 tools/rule-gate-reviewer.mjs 的确定性检查；任一检查失败即拒绝签发。
//   - 本服务不持有 Owner/人类身份，只代表机器评审员 b0a11000-…-00a1。
import httpz from "node:https";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRuleGateReviewer, RULE_VERSION_BY_GATE, PROJECT_ID } from "./rule-gate-reviewer.mjs";
import {
  openMachineQuery,
} from "./machine-reviewer-session.mjs";
import { createGateAuthorityRepository } from "../packages/data-access/src/gate-authority-repository.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// pg lives in packages/data-access/node_modules; load it via a require rooted there.
const requireFromDataAccess = createRequire(pathToFileURL(path.resolve(ROOT, "..", "packages", "data-access", "src", "index.mjs")).href);
const pg = requireFromDataAccess("pg");
const STATE_DIR = process.env.MOHEN_LOCAL_EXECUTION_AUTH_DIR || "D:/MoHen/keys/execution-auth";
const CRED_FILE = process.env.MOHEN_GATE_VERIFIER_CREDENTIAL_FILE || "D:/MoHen/keys/gate-verifier/credential";
const PORT = Number(process.env.MOHEN_GATE_VERIFIER_PORT || "8789");
const SIGNER_DB_URL = process.env.MOHEN_GATE_MACHINE_DATABASE_URL || process.env.MOHEN_GATE_DATABASE_URL;

function readPem(name) {
  const p = path.join(STATE_DIR, name);
  if (!fs.existsSync(p)) throw new Error(`AUTH_STATE_MISSING:${name}`);
  return fs.readFileSync(p, "utf8");
}

const credential = fs.readFileSync(CRED_FILE, "utf8").trim();
if (credential.length < 32) throw new Error("GATE_VERIFIER_CREDENTIAL_TOO_SHORT");
if (!SIGNER_DB_URL) throw new Error("MOHEN_GATE_MACHINE_DATABASE_URL_REQUIRED");

const SHA = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GATES = new Set(["G0", "G1", "G2", "G3", "G4", "G5"]);
const STAGES = new Set(["D00", "D01", "D02", "D03", "D04", "D05"]);

// Signer pool for control.sign_gate_candidate. Max 1 keeps the dedicated login
// serialised; advisory locks in sign_gate_candidate prevent double-sign races.
const signerPool = new pg.Pool({ connectionString: SIGNER_DB_URL, max: 1 });
const authority = createGateAuthorityRepository(signerPool);

async function decideThroughAuthority(decision, sessionToken) {
  return authority.decide(decision, sessionToken);
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
  res.end(text);
}

// Query helper using the machine login (same identity as rule-gate-reviewer).
let _query = null;
async function getQuery() {
  if (_query) return _query;
  _query = await openMachineQuery();
  return _query;
}

async function findCurrentAudit(query, { run_id, gate_code, input_digest }) {
  const audits = await query(
    `select a.gate_audit_id, a.object_type, a.object_id, a.artifact_revision, a.input_fingerprint,
            a.valid_until
     from control.gate_audits a
     where a.run_id=:'run'::uuid and a.gate_code=:'gate'
       and a.result='PASS' and a.decision_origin='independent_gate'
     order by a.signed_at desc`,
    { run: run_id, gate: gate_code });
  for (const a of audits) {
    if (a.input_fingerprint !== input_digest) continue;
    const ok = await query(
      `select control.current_qualification_is_valid(:'id'::uuid) as valid`,
      { id: a.gate_audit_id });
    if (ok[0]?.valid === true || ok[0]?.valid === "t") return a;
  }
  return null;
}

// On-demand signing: find a SUBMITTED candidate for this run+gate+input and
// run the deterministic rule reviewer. Returns the new audit or null.
async function autoSign(query, { run_id, gate_code, input_digest, stage }) {
  const ruleVersion = RULE_VERSION_BY_GATE[gate_code];
  if (!ruleVersion) return null;
  // Find a SUBMITTED candidate with matching input_fingerprint.
  const cands = await query(
    `select candidate_id::text as candidate_id, object_type, object_id::text as object_id
     from control.gate_candidates
     where run_id=:'run'::uuid and gate_code=:'gate' and candidate_status='SUBMITTED'
       and input_fingerprint=:'fp'
     order by submitted_at asc
     limit 1`,
    { run: run_id, gate: gate_code, fp: input_digest });
  if (!cands.length) return null;
  try {
    const reviewer = createRuleGateReviewer({
      query,
      decide: decideThroughAuthority,
      projectId: PROJECT_ID,
      log: () => {},
    });
    // The reviewer's loadCandidate filters by project_id; our candidate already
    // carries the right scope, so review({gate}) finds and signs it.
    // 精确指向按 input_fingerprint 命中的候选，避免误评同 gate+project 下
    // 更晚提交的其它候选（如未授权照片 HOLD 之外的 PASS 文本候选顺序问题）。
    const outcome = await reviewer.review({ gate: gate_code, candidateId: cands[0].candidate_id });
    if (outcome.status !== "PASS") return null;
    return await findCurrentAudit(query, { run_id, gate_code, input_digest });
  } catch (err) {
    console.error(`[local-gate-service] auto-sign ${gate_code} failed: ${String(err?.message || err).split("\n")[0]}`);
    return null;
  }
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
      const query = await getQuery();
      let audit = await findCurrentAudit(query, { run_id, gate_code, input_digest });
      if (!audit) audit = await autoSign(query, { run_id, gate_code, input_digest, stage });
      if (!audit) return sendJson(res, 404, { error: "NO_CURRENT_QUALIFICATION" });
      const receipt = {
        qualification_current: true,
        decision_origin: "independent_gate",
        result: "PASS",
        run_id, stage, job_id, gate_code,
        input_digest, output_digest,
        reviewer_binding_ref: reviewer_binding_ref ?? null,
        consumer: "producer",
        gate_audit_id: audit.gate_audit_id,
        artifact_revision: audit.artifact_revision,
        object_type: audit.object_type,
        object_id: audit.object_id,
        valid_until: audit.valid_until,
      };
      return sendJson(res, 200, receipt);
    } catch (err) {
      console.error("[local-gate-service] verify error", String(err?.message || err));
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
  console.log(`LOCAL_GATE_SERVICE_LISTENING https://127.0.0.1:${PORT}/verify (auto-sign enabled)`);
});
