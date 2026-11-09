// Owner 本人签 G0（机器自审通过后的最终签发）。
// 用法：node tools/owner-sign-g0.mjs
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

const PASSWORD_FILE = "D:/MoHen/keys/gate-authority/owner-signer-password.txt";
const OWNER_UID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const CANDIDATE_ID = "6f994991-321a-488d-bbaa-194c25b5a20b";
const RULE_VERSION = "m5-local-v1";
const MACHINE_AUDIT_ID = "556322b1-8337-43e2-8ef3-da54d229af64";
const EVIDENCE_REFS = [{"id":"d2d138af-fe44-4b62-8ccf-5ba2bc844d67","kind":"source_version","artifact_revision":"20e94f01486455190bc6aec81f2975ce9ba702e4ce29667822c5ff9f5959b210"}];

const password = fs.readFileSync(PASSWORD_FILE, "utf8").trim();
if (password.length < 8) throw new Error("OWNER_SIGNER_PASSWORD_INVALID");

// 会话令牌：base64url({uid,exp}).HMAC_SHA256(payload, MOHEN_DATABASE_SESSION_SECRET)
// 与 control.current_app_user_id() 的校验逻辑一致。
const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
const payload = Buffer.from(JSON.stringify({ uid: OWNER_UID, r: ["reviewer"], exp: Date.now() + 30000 })).toString("base64url");
const sig = Buffer.from(crypto.createHmac("sha256", secret).update(payload).digest()).toString("base64url");
const sessionToken = `${payload}.${sig}`;

const validUntil = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
const decision = {
  candidateId: CANDIDATE_ID,
  requestId: crypto.randomUUID(),
  result: "PASS",
  ruleVersion: RULE_VERSION,
  validUntil,
  expectedAuditId: MACHINE_AUDIT_ID,
  receipt: {
    rationale: "机器规则审核已通过（identity_version + rights_by_operation 均 PASS）；" +
      "上图开放数据来源，machine_read/retain 显式 allowed，原件 STORED_VERIFIED，artifact_revision 当前。",
    evidence_refs: EVIDENCE_REFS,
    checks: { identity_version: true, rights_by_operation: true },
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
