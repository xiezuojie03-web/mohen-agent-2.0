// MAB step 2.1: provision the LOCAL ISOLATED database for the first real
// run.mjs execution: producer login, dedicated private-worker login, reviewer
// binding declarations and the run-progress grant migration. Generates local
// passwords and appends the connection strings to .env.local (never printed).
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PSQL_PATH, getConnection, queryRows, run, getNodePgPool } from "../packages/data-access/src/index.mjs";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const BINDING_REF = "m5-owner-reviewer-g0g1-producer";
const MIGRATION = "supabase/migrations/20261107160000_mab_m2_1_producer_run_progress.sql";
const results = [];
const check = (label, ok, detail = "") => results.push({ label, ok: !!ok, detail });

// 1) Apply the run-progress grant migration.
execFileSync(PSQL_PATH, ["-h", getConnection().host, "-p", getConnection().port, "-U", getConnection().user,
  "-d", getConnection().db, "-v", "ON_ERROR_STOP=1", "-f", MIGRATION],
{ env: { ...process.env, PGPASSWORD: getConnection().password }, stdio: ["ignore", "inherit", "inherit"] });
check("migration applied", true, MIGRATION);

const pw = () => crypto.randomBytes(24).toString("hex");
const dbUrl = (user, password) => `postgresql://${user}:${password}@127.0.0.1:5432/${getConnection().db}`;

// 2) Producer login + connection string.
const producerPassword = pw();
await run(`alter role mohen_producer login password :'pw' inherit nosuperuser nobypassrls nocreaterole nocreatedb noreplication`, { pw: producerPassword });
const producer = await queryRows(`select rolcanlogin and not rolsuper and not rolbypassrls as safe,
  pg_has_role('mohen_producer','mohen_gate_signer','MEMBER') as signer from pg_roles where rolname='mohen_producer'`);
const flag = v => v === true || v === "t" || v === "true";
const off = v => v === false || v === "f" || v === "false";
check("producer role safe", flag(producer[0]?.safe) && off(producer[0]?.signer));

// 3) Dedicated private-worker login (member of mohen_app_runtime only).
const workerPassword = pw();
await run(`do $$begin
  if not exists(select from pg_roles where rolname='mohen_private_worker') then
    create role mohen_private_worker login inherit nosuperuser nobypassrls nocreaterole nocreatedb noreplication;
  end if;
end$$`);
await run(`alter role mohen_private_worker login password :'pw'`, { pw: workerPassword });
await run(`grant mohen_app_runtime to mohen_private_worker`);
const worker = await queryRows(`select pg_has_role('mohen_private_worker','mohen_app_runtime','MEMBER') as app,
  pg_has_role('mohen_private_worker','mohen_producer','MEMBER') as producer,
  pg_has_role('mohen_private_worker','mohen_gate_signer','MEMBER') as signer from pg_roles where rolname='mohen_private_worker'`);
check("private worker role membership", flag(worker[0]?.app) && off(worker[0]?.producer) && off(worker[0]?.signer));

// 4) Reviewer binding declarations for the future independent gate service.
for (const gate of ["G0", "G1"]) {
  const existing = await queryRows(`select count(*)::int as n from control.gate_reviewer_bindings
    where reviewer_user_id=:'owner'::uuid and gate_code=:'gate' and consumer='producer' and active`, { owner: OWNER, gate });
  if (Number(existing[0].n) === 0) {
    await run(`insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,
      purpose_code,purpose_version,consumer,allowed_scope,valid_from,valid_until,source_ref,active)
      values (:'owner'::uuid,'mohen_gate_signer',:'gate','data-production','m5-remediation','v1','producer',
      :'scope'::jsonb, now(), '2027-06-30'::timestamptz, 'MAB 2.1 local isolated activation', true)`,
      { owner: OWNER, gate, scope: JSON.stringify({ project_id: PROJECT }) });
  }
  check(`reviewer binding ${gate} declared`, true, BINDING_REF);
}

// 5) Persist the two connection strings in .env.local (idempotent replace).
const envPath = path.join(process.cwd(), ".env.local");
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const upsert = (text, key, value) => {
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, `${key}=${value}`) : `${text.replace(/\s*$/, "\n")}${key}=${value}\n`;
};
let next = upsert(envText, "MOHEN_PRODUCER_DATABASE_URL", dbUrl("mohen_producer", producerPassword));
next = upsert(next, "MOHEN_PRIVATE_WORKER_DATABASE_URL", dbUrl("mohen_private_worker", workerPassword));
if (next !== envText) fs.writeFileSync(envPath, next, "utf8");
check("env connection strings written", true, ".env.local");

await getNodePgPool().end();
const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} | ${r.label}${r.detail ? " | " + r.detail : ""}`);
console.log(failed.length === 0 ? "PROVISION_2_1_ALL_PASS" : `PROVISION_2_1_FAILED:${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
