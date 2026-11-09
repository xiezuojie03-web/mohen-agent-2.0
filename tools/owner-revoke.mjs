// 撤销旧的 G0 Owner 资格（input_fingerprint 用的是旧 requestDigest，与 orchestrator 的
// executionDigest(input) 不一致），以便用新候选（input_fingerprint 已修正）重签。
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env"]) {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const password = fs.readFileSync("D:/MoHen/keys/gate-authority/owner-signer-password.txt", "utf8").trim();
const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
const OWNER_UID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const payload = Buffer.from(JSON.stringify({ uid: OWNER_UID, r: ["reviewer"], exp: Date.now() + 30000 })).toString("base64url");
const sig = Buffer.from(crypto.createHmac("sha256", secret).update(payload).digest()).toString("base64url");
const sessionToken = `${payload}.${sig}`;

const auditId = process.argv[2];
if (!auditId) throw new Error("usage: owner-revoke.mjs <audit_id>");

const decision = { auditId, requestId: crypto.randomUUID(), reason: "input_fingerprint mismatch with orchestrator executionDigest(input); resubmitting corrected candidate" };
const dbUrl = `postgresql://mohen_gate_signer_m5_owner:${password}@127.0.0.1:5432/mohen_dev`;
const cli = path.join(ROOT, "packages", "data-access", "scripts", "gate-authority.mjs");
const result = spawnSync(process.execPath, [cli, "revoke"], {
  input: JSON.stringify({ decision, sessionToken }), encoding: "utf8",
  env: { ...process.env, MOHEN_GATE_DATABASE_URL: dbUrl },
});
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
