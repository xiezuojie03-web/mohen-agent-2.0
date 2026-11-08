#!/usr/bin/env node
// 环境一致性检查（CP1）：本地与云端共用同一份契约，逐项断言“环境真实可用且不含隐性漂移”。
//
// 用法：node tools/check-env-parity.mjs [--json]
// 输出：每项 CHECK <ID> <PASS|FAIL|HOLD|SKIP> <detail>，末行 ENV_PARITY_PASS / ENV_PARITY_FAIL。
// 原则：FAIL 表示环境与合同不符（必须修）；HOLD 表示已知未落地缺口（如实记账，不算通过）；
//       SKIP 表示本环境不适用（例如云端无本地文件系统后端）。
// 安全：不打印任何密钥值，只打印长度/存在性与哈希前缀。

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { getConnection, PSQL_PATH, PROJECT_ROOT } from "../packages/data-access/src/index.mjs";

const JSON_OUT = process.argv.includes("--json");
const results = [];
const record = (id, status, detail = "") => {
  results.push({ id, status, detail });
  if (!JSON_OUT) console.log(`CHECK ${id} ${status} ${detail}`);
};

// 以连接参数 + PGPASSWORD 驱动 psql，避免把密码写进 URI 或命令行。
function psql(conn, sql, { expectUser } = {}) {
  const out = execFileSync(PSQL_PATH, [
    "-h", conn.host, "-p", conn.port, "-U", conn.user, "-d", conn.db,
    "-v", "ON_ERROR_STOP=1", "-P", "pager=off", "-A", "-F", "\u0001", "-t", "-f", "-",
  ], { env: { ...process.env, PGPASSWORD: conn.password }, input: sql, encoding: "utf8" });
  return out.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split("\u0001"));
}

function parseUrl(url) {
  const m = String(url || "").match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(\S+)$/);
  if (!m) return null;
  return { user: m[1], password: m[2], host: m[3], port: m[4] || "5432", db: m[5] };
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

// ---------------- 1. 环境变量契约 ----------------
const CORE_KEYS = ["DATABASE_URL", "MOHEN_DATABASE_SESSION_SECRET", "AUTH_SECRET", "MOHEN_ENV"];
const PROVIDER_KEYS = ["DEEPSEEK_API_KEY", "SHANGHAI_LIBRARY_KEY", "AMAP_WEB_KEY"];

{
  const missing = CORE_KEYS.filter((k) => !process.env[k] || !String(process.env[k]).trim());
  const weakSecret = ["MOHEN_DATABASE_SESSION_SECRET", "AUTH_SECRET"]
    .filter((k) => process.env[k] && String(process.env[k]).length < 32);
  record("ENV_CORE", missing.length || weakSecret.length ? "FAIL" : "PASS",
    `missing=${missing.join(",") || "none"} short_secret=${weakSecret.join(",") || "none"} env=${process.env.MOHEN_ENV || "?"}`);
}

{
  const missing = PROVIDER_KEYS.filter((k) => !process.env[k]);
  record("ENV_PROVIDERS", missing.length ? "HOLD" : "PASS",
    missing.length ? `missing=${missing.join(",")}（受控外发不可用）` : "all provider keys set");
}

// ---------------- 2. 数据库连接与 schema --------------
const REQUIRED_SCHEMAS = ["control", "source", "evidence", "world", "meaning", "publication", "studio", "read_model"];
let conn = null;
try {
  conn = getConnection();
  const rows = psql(conn, "select current_user, current_database(), setting from pg_settings where name='server_version'");
  record("DB_CONNECT", rows.length ? "PASS" : "FAIL",
    rows.length ? `user=${rows[0][0]} db=${rows[0][1]} pg=${rows[0][2]}` : "no rows");
} catch (error) {
  record("DB_CONNECT", "FAIL", String(error?.message ?? error).split("\n")[0]);
}

if (conn) {
  try {
    const present = psql(conn, "select nspname from pg_namespace where nspname not like 'pg\\_%' and nspname<>'information_schema'");
    const set = new Set(present.map((r) => r[0]));
    const missing = REQUIRED_SCHEMAS.filter((s) => !set.has(s));
    record("DB_SCHEMAS", missing.length ? "FAIL" : "PASS",
      `schemas=${present.length} missing=${missing.join(",") || "none"}`);
  } catch (error) {
    record("DB_SCHEMAS", "FAIL", String(error?.message ?? error).split("\n")[0]);
  }

  // 结构契约：QR 整改涉及的列/外键必须真实存在（迁移漂移会在此暴露）。
  try {
    const colRows = psql(conn, `
      select 'director_plans.project_id', count(*)::text from information_schema.columns
       where table_schema='public' and table_name='director_plans' and column_name='project_id'
      union all
      select 'director_plans.source_ids', count(*)::text from information_schema.columns
       where table_schema='public' and table_name='director_plans' and column_name='source_ids'
      union all
      select 'private_originals', count(*)::text from information_schema.tables
       where table_schema='studio' and table_name='private_originals'
      union all
      select 'session_verification_keys', count(*)::text from information_schema.tables
       where table_schema='control' and table_name='session_verification_keys'
      union all
      select 'gate_policy_versions', count(*)::text from information_schema.tables
       where table_schema='control' and table_name='gate_policy_versions'
      union all
      select 'gate_reviewer_bindings', count(*)::text from information_schema.tables
       where table_schema='control' and table_name='gate_reviewer_bindings'`);
    const missingContracts = colRows.filter((r) => Number(r[1]) < 1).map((r) => r[0]);
    record("DB_SCHEMA_CONTRACTS", missingContracts.length ? "FAIL" : "PASS",
      `missing=${missingContracts.join(",") || "none"}`);
  } catch (error) {
    record("DB_SCHEMA_CONTRACTS", "FAIL", String(error?.message ?? error).split("\n")[0]);
  }

  try {
    const fk = psql(conn, `
      select pg_get_constraintdef(oid) from pg_constraint
       where conrelid='public.director_plans'::regclass and conname='director_plans_project_id_fkey'`);
    const def = fk[0]?.[0] || "";
    const ok = /foreign key.*studio\.projects/i.test(def.replace(/\s+/g, " "));
    record("DB_DIRECTOR_PLAN_FK", ok ? "PASS" : "FAIL", def ? def.replace(/\s+/g, " ") : "constraint missing");
  } catch (error) {
    record("DB_DIRECTOR_PLAN_FK", "FAIL", String(error?.message ?? error).split("\n")[0]);
  }

  const GATE_FUNCTIONS = [
    "sign_gate_candidate", "revoke_gate_qualification", "current_qualification_is_valid",
    "qualification_allows", "artifact_revision_for",
  ];
  try {
    const rows = psql(conn, "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='control'");
    const set = new Set(rows.map((r) => r[0]));
    const missing = GATE_FUNCTIONS.filter((f) => !set.has(f));
    record("DB_GATE_FUNCTIONS", missing.length ? "FAIL" : "PASS",
      `control_fns=${rows.length} missing=${missing.join(",") || "none"}`);
  } catch (error) {
    record("DB_GATE_FUNCTIONS", "FAIL", String(error?.message ?? error).split("\n")[0]);
  }

  // 身份隔离：Gate 签发登录必须 NOINHERIT 且只属于 mohen_gate_signer，不得混入生产/运行时角色。
  try {
    const roles = psql(conn, "select rolname, rolcanlogin::text, rolinherit::text from pg_roles where rolname like 'mohen%'");
    const byName = new Map(roles.map((r) => [r[0], { login: r[1] === "true", inherit: r[2] === "true" }]));
    const mustLogin = ["mohen_producer", "mohen_private_worker", "mohen_gate_signer_m5_machine", "mohen_gate_signer_m5_owner"];
    const mustNotLogin = ["mohen_app_runtime", "mohen_gate_signer", "mohen_gate_authority"];
    const problems = [];
    for (const r of mustLogin) {
      if (!byName.has(r)) problems.push(`${r}:missing`);
      else if (!byName.get(r).login) problems.push(`${r}:no-login`);
    }
    for (const r of mustNotLogin) {
      if (!byName.has(r)) problems.push(`${r}:missing`);
      else if (byName.get(r).login) problems.push(`${r}:unexpected-login`);
    }
    for (const r of ["mohen_gate_signer_m5_machine", "mohen_gate_signer_m5_owner"]) {
      const role = byName.get(r);
      if (role && role.inherit) problems.push(`${r}:inherit-enabled`);
      const unwanted = psql(conn, `select 1 from pg_auth_members where member='${r}'::regrole
        and roleid::regrole::text not in ('mohen_gate_signer')`);
      if (unwanted.length) problems.push(`${r}:extra-membership`);
    }
    record("DB_IDENTITIES", problems.length ? "FAIL" : "PASS", problems.join(",") || "role invariants ok");
  } catch (error) {
    record("DB_IDENTITIES", "FAIL", String(error?.message ?? error).split("\n")[0]);
  }

  // 各身份真实登录（连接池外的独立连接，证明密码/角色成员关系可用）。
  const IDENTITY_LOGINS = [
    ["MOHEN_PRODUCER_DATABASE_URL", "mohen_producer"],
    ["MOHEN_PRIVATE_WORKER_DATABASE_URL", "mohen_private_worker"],
    ["MOHEN_GATE_MACHINE_DATABASE_URL", "mohen_gate_signer_m5_machine"],
  ];
  const loginProblems = [];
  for (const [key, expectedRole] of IDENTITY_LOGINS) {
    const parsed = parseUrl(process.env[key]);
    if (!parsed) { loginProblems.push(`${key}:unset/ unparsable`); continue; }
    try {
      const rows = psql(parsed, "select current_user");
      if (rows[0]?.[0] !== expectedRole) loginProblems.push(`${expectedRole}:landed-as-${rows[0]?.[0]}`);
    } catch (error) {
      loginProblems.push(`${expectedRole}:${String(error?.message ?? error).split("\n")[0]}`);
    }
  }
  record("DB_IDENTITY_LOGINS", loginProblems.length ? "FAIL" : "PASS", loginProblems.join(" | ") || "three identities login ok");

  // RLS：关键面必须开 RLS（含本轮 SEC-01 已关闭面）。
  const MUST_RLS = [
    "public.imported_materials", "public.director_plans", "public.users",
    "studio.projects", "studio.private_originals", "studio.delegations",
    "control.gate_audits", "control.gate_candidates", "control.qualification_current",
    "source.sources", "publication.work_revisions",
  ];
  try {
    const rows = psql(conn, `
      select n.nspname||'.'||c.relname, c.relrowsecurity::text
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where c.relkind='r'`);
    const rls = new Map(rows.map((r) => [r[0], r[1] === "true"]));
    const problems = MUST_RLS.filter((t) => !rls.get(t));
    record("DB_RLS", problems.length ? "FAIL" : "PASS",
      problems.length ? `rls_off=${problems.join(",")}` : `${MUST_RLS.length} critical tables rls on`);
  } catch (error) {
    record("DB_RLS", "FAIL", String(error?.message ?? error).split("\n")[0]);
  }

  // 已知缺口（如实记账，不算通过）：QR-04/05 权利动作词典字段、QR-07 使用事件/资产回链。
  try {
    const rights = psql(conn, `
      select column_name from information_schema.columns
       where table_schema='source' and table_name='sources'
         and column_name in ('rights_by_action','external_processing')`);
    record("GAP_RIGHTS_ACTIONS", rights.length === 2 ? "PASS" : "HOLD",
      rights.length === 2 ? "rights_by_action+external_processing 齐备"
        : `source.sources 缺 ${["rights_by_action", "external_processing"].filter((c) => !rights.some((r) => r[0] === c)).join(",")}（QR-04/05 未落地）`);
    const usage = psql(conn, `
      select (select count(*) from studio.use_events)::text, (select count(*) from studio.asset_links)::text`);
    record("GAP_ASSET_USAGE", Number(usage[0]?.[0]) > 0 ? "PASS" : "HOLD",
      `use_events=${usage[0]?.[0]} asset_links=${usage[0]?.[1]}（QR-07 回链未建立）`);
  } catch (error) {
    record("GAP_RIGHTS_ACTIONS", "FAIL", String(error?.message ?? error).split("\n")[0]);
  }
}

// ---------------- 3. 私有原件存储后端 ----------------
const LOCAL_FS = process.env.MOHEN_PRIVATE_ORIGINAL_LOCAL_FS === "true";
const LOCAL_DIR = process.env.MOHEN_PRIVATE_ORIGINAL_LOCAL_DIR;
if (!LOCAL_FS) {
  record("STORAGE_BACKEND", "SKIP", "本地文件系统后端未启用（云端须走私有对象存储，另行核验）");
} else {
  const dir = LOCAL_DIR ? path.resolve(LOCAL_DIR) : null;
  record("STORAGE_BACKEND", dir && fs.existsSync(dir) ? "PASS" : "FAIL",
    dir ? (fs.existsSync(dir) ? `local_fs dir=${dir}` : `dir_missing=${dir}`) : "MOHEN_PRIVATE_ORIGINAL_LOCAL_DIR unset");

  if (conn && dir && fs.existsSync(dir)) {
    try {
      const rows = psql(conn, "select storage_key, sha256, byte_size::text from studio.private_originals order by created_at");
      if (!rows.length) {
        record("STORAGE_INTEGRITY", "HOLD", "private_originals 无记录，逐键回读无对象可验");
      } else {
        const bad = [];
        for (const [key, sha, size] of rows) {
          const file = path.join(dir, ...key.split("/"));
          if (!fs.existsSync(file)) { bad.push(`${key}:missing-file`); continue; }
          const actual = sha256File(file);
          const bytes = fs.statSync(file).size;
          if (actual !== sha) bad.push(`${key}:sha-mismatch`);
          if (String(bytes) !== String(size)) bad.push(`${key}:size-mismatch`);
        }
        record("STORAGE_INTEGRITY", bad.length ? "FAIL" : "PASS",
          bad.length ? bad.join(",") : `${rows.length} 个原件磁盘字节与 DB sha/长度一致`);
      }
    } catch (error) {
      record("STORAGE_INTEGRITY", "FAIL", String(error?.message ?? error).split("\n")[0]);
    }
  }
}

// ---------------- 4. 工具链 ----------------
{
  const problems = [];
  if (!fs.existsSync(PSQL_PATH)) problems.push(`psql_missing=${PSQL_PATH}`);
  const opensslCandidates = [
    process.env.MOHEN_OPENSSL_PATH,
    "D:\\Program Files\\Git\\usr\\bin\\openssl.exe",
    "openssl",
  ].filter(Boolean);
  let opensslOk = false;
  for (const candidate of opensslCandidates) {
    try {
      const out = execFileSync(candidate, ["version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      if (/OpenSSL/.test(out)) { opensslOk = true; break; }
    } catch { /* 下一个候选 */ }
  }
  if (!opensslOk) problems.push("openssl_missing");
  const rawStore = process.env.MOHEN_RAW_STORE_PATH;
  if (rawStore && !fs.existsSync(rawStore)) problems.push(`raw_store_missing=${rawStore}`);
  record("TOOLING_CLI", problems.length ? "FAIL" : "PASS",
    problems.join(",") || `psql+openssl 可用 root=${path.basename(PROJECT_ROOT)}`);
}

// ---------------- 汇总 ----------------
const counts = results.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
if (JSON_OUT) {
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), env: process.env.MOHEN_ENV || null, results, counts }, null, 2));
} else {
  console.log(`SUMMARY pass=${counts.PASS || 0} fail=${counts.FAIL || 0} hold=${counts.HOLD || 0} skip=${counts.SKIP || 0}`);
  console.log(counts.FAIL ? "ENV_PARITY_FAIL" : "ENV_PARITY_PASS");
}
process.exit(counts.FAIL ? 1 : 0);
