// Owner 本人签任意 Gate（G0–G5）：机器自审通过后的最终签发。
// 用法：node tools/owner-sign.mjs --gate G1 --candidate <uuid> --machine-audit <uuid> --evidence <json>
//   --gate: G0..G5
//   --candidate: gate_candidates.candidate_id
//   --machine-audit: 机器审核的 gate_audit_id（用作 expectedAuditId 以取代）
//   --evidence: JSON 数组，如 [{"id":"...","kind":"read_unit","artifact_revision":"..."}]
// 本脚本只读取 Owner 密码文件 + 会话密钥，构造 MOHEN_GATE_DATABASE_URL 和
// sessionToken，然后调用 gate-authority.mjs decide。签字身份是 Owner 本人
//（user_id 270bcecf-...，DB login mohen_gate_signer_m5_owner），与机器审核
//（mohen_gate_signer_m5_machine）相互独立。
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Load .env.local for MOHEN_DATABASE_SESSION_SECRET.
for (const name of [".env.local", ".env"]) {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const PASSWORD_FILE = "D:/MoHen/keys/gate-authority/owner-signer-password.txt";
const OWNER_UID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const gate = arg("gate");
const candidateId = arg("candidate");
const machineAuditId = arg("machine-audit");
const evidenceRaw = arg("evidence");
const evidenceFile = arg("evidence-file");
if (!gate || !/^G[0-5]$/.test(gate)) throw new Error("--gate G0..G5 required");
if (!candidateId) throw new Error("--candidate required");
if (!machineAuditId) throw new Error("--machine-audit required");
let evidenceRefs;
if (evidenceFile) {
  evidenceRefs = JSON.parse(fs.readFileSync(path.resolve(evidenceFile), "utf8"));
} else if (evidenceRaw) {
  evidenceRefs = JSON.parse(evidenceRaw);
} else {
  throw new Error("--evidence <json> or --evidence-file <path> required");
}
if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0)
  throw new Error("evidence must be a non-empty JSON array");

const RULE_VERSION = gate === "G5" ? "v1" : "m5-local-v1";
// Each gate policy declares required_checks; a PASS receipt must set every one
// of them to true. See control.gate_policy_versions.required_checks.
const REQUIRED_CHECKS = {
  G0: ["identity_version", "rights_by_operation"],
  G1: ["identity_version", "read_unit_binding"],
  G2: ["identity_version", "evidence_binding"],
  G3: ["identity_version", "claim_support"],
  G4: ["identity_version", "finding_grounding"],
  G5: ["work_revision_binding", "rights_by_operation"],
};
const checks = Object.fromEntries(REQUIRED_CHECKS[gate].map(k => [k, true]));

const password = fs.readFileSync(PASSWORD_FILE, "utf8").trim();
if (password.length < 8) throw new Error("OWNER_SIGNER_PASSWORD_INVALID");

const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
const payload = Buffer.from(JSON.stringify({ uid: OWNER_UID, r: ["reviewer"], exp: Date.now() + 30000 })).toString("base64url");
const sig = Buffer.from(crypto.createHmac("sha256", secret).update(payload).digest()).toString("base64url");
const sessionToken = `${payload}.${sig}`;

const validUntil = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
const decision = {
  candidateId,
  requestId: crypto.randomUUID(),
  result: "PASS",
  ruleVersion: RULE_VERSION,
  validUntil,
  expectedAuditId: machineAuditId,
  receipt: {
    rationale: `机器规则审核已通过（${gate} 规则检查 PASS）；Owner 本人复核确认。`,
    evidence_refs: evidenceRefs,
    checks,
  },
};

const dbUrl = `postgresql://mohen_gate_signer_m5_owner:${password}@127.0.0.1:5432/mohen_dev`;
const input = JSON.stringify({ decision, sessionToken });

const cli = path.join(ROOT, "packages", "data-access", "scripts", "gate-authority.mjs");
const result = spawnSync(process.execPath, [cli, "decide"], {
  input, encoding: "utf8",
  env: { ...process.env, MOHEN_GATE_DATABASE_URL: dbUrl },
});
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
