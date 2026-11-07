// Step 2 batch A: PG-level verification of the D00 registration lookup and the
// C02 scanned-page reading persistence, in the local isolated database.
// Mirrors tools/verify-1-10.py conventions: Owner session token via the local
// M1 chain, no secrets printed, positive AND negative checks.
import { createHash, createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getNodePgPool, queryRows, run } from "../packages/data-access/src/index.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";
import { createPrivateScannedPageReadingRepository } from "../packages/data-access/src/private-scanned-page-reading-repository.mjs";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const ORIGINAL = "b0a11000-0000-4000-8000-000000000002"; // NAJ page 35
const PAGE_NUMBER = 35;
const LOCAL_DIR = process.env.MOHEN_PRIVATE_ORIGINAL_LOCAL_DIR || "D:/MoHen/data/private_originals";
const KEY_VERSION = "mab-original-bridge-v1";
const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: !!ok, detail });

const b64url = (b) => Buffer.from(b).toString("base64url");
const makeToken = (uid, secret) => {
  const payload = b64url(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 30000 }));
  const sig = Buffer.from(createHmac("sha256", secret).update(payload).digest()).toString("base64url");
  return `${payload}.${sig}`;
};

// 1) Bridge verification key: reuse or provision (never printed).
let bridgeSecret = process.env.MOHEN_ORIGINAL_BRIDGE_SECRET;
if (typeof bridgeSecret !== "string" || bridgeSecret.length < 32) {
  bridgeSecret = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const envPath = path.join(process.cwd(), ".env.local");
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  if (!/^MOHEN_ORIGINAL_BRIDGE_SECRET=/m.test(existing)) {
    fs.appendFileSync(envPath, `\nMOHEN_ORIGINAL_BRIDGE_SECRET=${bridgeSecret}\n`, "utf8");
    process.env.MOHEN_ORIGINAL_BRIDGE_SECRET = bridgeSecret;
  }
}
await run(
  `insert into control.original_bridge_verification_keys(key_version,verification_key,is_active)
   values (:'key_version', :'key', true)
   on conflict (key_version) do update set verification_key=excluded.verification_key, is_active=true`,
  { key_version: KEY_VERSION, key: bridgeSecret }
);
const keyCount = await queryRows(`select count(*)::int as n from control.original_bridge_verification_keys where key_version=:'kv' and is_active`, { kv: KEY_VERSION });
check("bridge-key provisioned", Number(keyCount[0].n) === 1);

const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
if (typeof secret !== "string" || !secret) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing (run tools/provision-local-identity.py first)");
const token = makeToken(OWNER, secret);

const pool = getNodePgPool();

// 2) D00 registration lookup — positive: the NAJ binding of page 35.
const registrations = createPrivateSourceRegistrationRepository(pool);
try {
  const reg = await registrations.lookup(ORIGINAL, token);
  check("D00 lookup returns NAJ registration", reg.provider === "国立公文书馆(NAJ)" &&
    reg.title === "松江府志7" && reg.project_id === PROJECT &&
    reg.content_type === "image/jpeg" && reg.carrier_type === "scanned_page", JSON.stringify({ provider: reg.provider, title: reg.title }));
  // 3) D00 lookup — negative: unknown original id.
  let rejected = false;
  try { await registrations.lookup(randomUUID(), token); } catch { rejected = true; }
  check("D00 lookup rejects unknown original", rejected);
  var registration = reg;
} catch (error) {
  check("D00 lookup returns NAJ registration", false, String(error?.message || error).slice(0, 200));
}

// 4) Run setup: production_runs row bound to the project (idempotent).
const runId = "c0a12000-0000-4000-8000-000000000001";
await run(
  `insert into control.production_runs(run_id,research_intent,scope,execution_mode,status)
   values (:'run_id'::uuid, :'intent', :'scope'::jsonb, 'attended', 'RUNNING')
   on conflict (run_id) do nothing`,
  { run_id: runId, intent: "松江府田赋·卷十一（隔离D链验证）", scope: JSON.stringify({ project_id: PROJECT }) }
);
const runRows = await queryRows(`select count(*)::int as n from control.production_runs where run_id=:'run_id'::uuid and scope->>'project_id'=:'pid'`, { run_id: runId, pid: PROJECT });
check("production_run bound to project", Number(runRows[0].n) === 1);

// 5) Original record + bytes from the local private store.
const originals = await queryRows(
  `select original_id::text, project_id::text, state, content_type, sha256, byte_size, storage_bucket, storage_key
   from studio.private_originals where original_id=:'oid'::uuid`, { oid: ORIGINAL });
const record = { ...originals[0], byte_size: Number(originals[0].byte_size) };
const bytes = fs.readFileSync(path.join(LOCAL_DIR, record.project_id, `${ORIGINAL}.bin`));
check("original bytes match SHA", record.state === "STORED_VERIFIED" &&
  record.sha256 === createHash("sha256").update(bytes).digest("hex") &&
  bytes.length === Number(record.byte_size));

const page = { kind: "scanned_page/v1", page_number: PAGE_NUMBER,
  source_version_id: registration?.source_version_id, raw_item_id: registration?.raw_item_id,
  raw_sha256: record.sha256, page_sha256: record.sha256 };

// 6) C02 persistence — positive, then idempotent replay.
const pageReadings = createPrivateScannedPageReadingRepository(pool, { verificationKey: bridgeSecret, keyVersion: KEY_VERSION });
try {
  const saved = await pageReadings.save({ runId, originalId: ORIGINAL, page, record, bytes }, token);
  check("C02 save persists read_run+read_unit", /^[a-f0-9-]{36}$/.test(saved.read_run_id) && saved.qualification === "UNASSESSED",
    `read_unit=${saved.read_unit_id}`);
  const units = await queryRows(
    `select u.method_code, u.kind, u.locator_schema, u.ordinal, u.payload_ref, u.locator_hash,
            r.method_set::text as method_set, r.raw_item_id::text as raw_item_id, r.status, r.config->>'schema' as schema
     from source.read_units u join source.read_runs r on r.read_run_id=u.read_run_id
     where u.read_unit_id=:'uid'::uuid`, { uid: saved.read_unit_id });
  const u = units[0];
  check("C02 read_unit is a bound scanned page", u && u.method_code === "C02" && u.kind === "page" &&
    u.locator_schema === "scanned_page/v1" && Number(u.ordinal) === PAGE_NUMBER &&
    u.raw_item_id === registration.raw_item_id && u.status === "done" &&
    u.schema === "mab.private-scanned-page-reading.v1" && u.method_set.includes("C02"), JSON.stringify(u ?? {}));
  const replay = await pageReadings.save({ runId, originalId: ORIGINAL, page, record, bytes }, token);
  check("C02 save is idempotent", replay.read_run_id === saved.read_run_id && replay.read_unit_id === saved.read_unit_id);
  const count = await queryRows(
    `select count(*)::int as n from source.read_units where read_run_id=:'rid'::uuid`, { rid: saved.read_run_id });
  check("C02 replay created no duplicate rows", Number(count[0].n) === 1);
  // 7) Negative: tampered page locator must fail before any write.
  let rejected = false;
  try {
    await pageReadings.save({ runId, originalId: ORIGINAL,
      page: { ...page, page_sha256: "0".repeat(64) }, record, bytes }, token);
  } catch { rejected = true; }
  check("C02 save rejects a tampered page hash", rejected);
  rejected = false;
  try {
    await pageReadings.save({ runId, originalId: ORIGINAL,
      page: { ...page, raw_item_id: randomUUID() }, record, bytes }, token);
  } catch (e) { rejected = /SOURCE_NOT_BOUND/.test(String(e?.message || e)); }
  check("C02 save rejects an unbound raw item", rejected, "expected PRIVATE_PAGE_READING_SOURCE_NOT_BOUND");
} catch (error) {
  check("C02 save persists read_run+read_unit", false, String(error?.message || error).slice(0, 300));
}

// 8) Immutability: the pinned scanned-page run must refuse updates.
let immutable = false;
try {
  await run(`update source.read_units set kind='tampered' where read_unit_id in (
    select u.read_unit_id from source.read_units u join source.read_runs r on r.read_run_id=u.read_run_id
    where r.config->>'schema'='mab.private-scanned-page-reading.v1')`, {});
} catch { immutable = true; }
check("scanned-page rows are append-only", immutable);

await pool.end();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} | ${r.label}${r.detail ? " | " + r.detail : ""}`);
console.log(failed.length === 0 ? "VERIFY_2_A_ALL_PASS" : `VERIFY_2_A_FAILED:${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
