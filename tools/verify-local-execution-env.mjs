#!/usr/bin/env node
// QR-08 关闭证据：本地隔离执行授权的前置条件必须由独立可验证检查生成，而不是签名时自报 true。
//
// 用法：node tools/verify-local-execution-env.mjs [--no-tests] [--stdout]
//   --no-tests  跳过真实契约测试执行（只用于快速自检，产出的证据不可用于签 grant）
//   --stdout    只打印判定，不写证据文件
//
// 产出：<stateDir>/enable-requires-evidence.json，绑定当前 git HEAD + registry digest + 生成时间；
//       local-execution-authorizer.mjs 只有在该文件与 Registry 的 enable_requires 逐项 PASS 且未过期时
//       才会签发阶段授权（缺任一证据 = 不签发）。
//
// 覆盖的四个 enable_requires（与本仓库 production-registry.json 一致）：
//   1. user_engineering_authorization       ← Owner 授权记录文件（隔离范围 + 有效期 + attended 模式）
//   2. M0_environment_and_bindings_verified ← Registry 绑定文件/评审绑定/方法合同真实存在且绑定齐备
//   3. isolation_and_contract_tests_pass    ← 现场执行契约测试套件，全部通过才记 PASS
//   4. no_formal_hold_bypass                ← 目标确为隔离库 + 无“已失效 PASS 仍被当作有效资格”的绕过
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const stateDir = () => process.env.MOHEN_LOCAL_EXECUTION_AUTH_DIR || "D:/MoHen/keys/execution-auth";
const NO_TESTS = process.argv.includes("--no-tests");
const STDOUT_ONLY = process.argv.includes("--stdout");

const checks = {};
const record = (key, ok, detail) => { checks[key] = { status: ok ? "PASS" : "FAIL", detail }; return ok; };

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch { return ""; }
}

function isLoopbackDbUrl(url) {
  return /^postgresql:\/\/[^@]*@(127\.0\.0\.1|localhost)(:\d+)?\//.test(String(url || ""));
}

async function main() {
  const { loadRegistry } = await import("../pipelines/data-production/orchestrator/registry.mjs");
  const { executionDigest } = await import("../pipelines/data-production/orchestrator/execution-authority.mjs");
  const registry = loadRegistry(repoRoot);
  const dataAccess = await import("../packages/data-access/src/index.mjs");
  dataAccess.getConnection(); // 触发 .env.local 加载

  // ---------- 1. Owner 工程授权记录 ----------
  {
    const file = path.join(stateDir(), "owner-authorization.json");
    if (!fs.existsSync(file)) {
      record("user_engineering_authorization", false, `owner-authorization.json missing (${file})`);
    } else {
      try {
        const doc = JSON.parse(fs.readFileSync(file, "utf8"));
        const problems = [];
        if (doc.issued_by !== "owner") problems.push("issuer-not-owner");
        if (doc.scope !== "local-isolated") problems.push(`scope=${doc.scope}`);
        if (!Array.isArray(doc.modes_allowed) || !doc.modes_allowed.includes("attended")) problems.push("attended-mode-not-allowed");
        if (!doc.valid_until || Date.parse(doc.valid_until) <= Date.now()) problems.push("expired");
        if (typeof doc.authorization_id !== "string" || !doc.authorization_id) problems.push("no-authorization-id");
        if (typeof doc.statement_ref !== "string" || !doc.statement_ref) problems.push("no-statement-ref");
        record("user_engineering_authorization", problems.length === 0,
          problems.length ? problems.join(",") : `id=${doc.authorization_id} until=${doc.valid_until}`);
      } catch (error) {
        record("user_engineering_authorization", false, String(error?.message ?? error).split("\n")[0]);
      }
    }
  }

  // ---------- 2. 环境与绑定真实存在 ----------
  {
    const problems = [];
    if (registry.status !== "ACTIVE_AUTHORIZED" || registry.activation?.enabled !== true) problems.push("registry-not-active");
    if (!/isolation|isolated|隔离/i.test(String(registry.activation?.reason || ""))) problems.push("activation-reason-not-isolated");
    const contract = JSON.parse(fs.readFileSync(path.join(repoRoot, "specs/data-production/method-binding-contract.json"), "utf8"));
    if (JSON.stringify(contract).includes("TO_VERIFY_IN_M0")) problems.push("method-contract-has-TO_VERIFY");
    for (const job of registry.jobs) {
      if (job.execution_policy?.enabled !== true) continue;
      for (const key of ["executor", "adapter_binding"]) {
        const rel = job.implementation?.[key];
        const abs = path.resolve(repoRoot, String(rel || ""));
        if (typeof rel !== "string" || !fs.existsSync(abs)) problems.push(`${job.stage}.${key}:missing`);
      }
      const binding = job.implementation?.gate_reviewer_binding;
      if (typeof binding !== "string" || /^(TO_VERIFY|PENDING|UNBOUND|NONE)/i.test(binding)) problems.push(`${job.stage}.reviewer-binding`);
    }
    for (const key of ["DATABASE_URL", "MOHEN_DATABASE_SESSION_SECRET", "MOHEN_PRODUCER_DATABASE_URL",
      "MOHEN_PRIVATE_WORKER_DATABASE_URL", "MOHEN_GATE_MACHINE_DATABASE_URL"]) {
      if (!process.env[key]) problems.push(`env:${key}`);
    }
    record("M0_environment_and_bindings_verified", problems.length === 0,
      problems.length ? problems.join(",") : `jobs=${registry.jobs.length} digest=${executionDigest(registry).slice(0, 12)}…`);
  }

  // ---------- 3. 隔离与契约测试（现场执行） ----------
  if (NO_TESTS) {
    record("isolation_and_contract_tests_pass", false, "skipped by --no-tests（不可用于签 grant）");
  } else {
    try {
      // node --test 不接受目录导入，按 test:data-production 的实际文件集展开。
      const suiteDir = path.join(repoRoot, "tests/data-production");
      const files = fs.readdirSync(suiteDir).filter((f) => f.endsWith(".test.mjs")).map((f) => path.join(suiteDir, f));
      const out = execFileSync(process.execPath, [
        "--test", "--experimental-test-isolation=none", ...files,
      ], { cwd: repoRoot, encoding: "utf8", timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
      const pass = Number((out.match(/^[ℹ#]\s*pass\s+(\d+)/m) || [])[1] || 0);
      const fail = Number((out.match(/^[ℹ#]\s*fail\s+(\d+)/m) || [])[1] || 0);
      record("isolation_and_contract_tests_pass", pass > 0 && fail === 0, `files=${files.length} pass=${pass} fail=${fail}`);
    } catch (error) {
      const out = String(error?.stdout ?? "");
      const pass = Number((out.match(/^[ℹ#]\s*pass\s+(\d+)/m) || [])[1] || 0);
      const fail = Number((out.match(/^[ℹ#]\s*fail\s+(\d+)/m) || [])[1] || 0);
      record("isolation_and_contract_tests_pass", false, `suite failed pass=${pass} fail=${fail}`);
    }
  }

  // ---------- 4. 不得绕过正式 HOLD ----------
  {
    const problems = [];
    if (String(process.env.MOHEN_ENV || "").toLowerCase() === "production") problems.push("env-is-production");
    if (!isLoopbackDbUrl(process.env.DATABASE_URL)) problems.push("database-not-loopback");
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) problems.push("production-service-role-key-present");
    if (process.env.MOHEN_PRODUCTION_EXECUTION_AUTHORIZED === "true") problems.push("production-execution-flag-present");
    // attended-only：隔离阶段不允许无人值守/批量/交互式自动执行（否则等于绕过人工 HOLD）。
    for (const job of registry.jobs) {
      if (job.execution_policy?.enabled !== true) continue;
      for (const mode of ["unattended", "batch", "interactive"]) {
        if (job.execution_policy[mode] === true) problems.push(`${job.stage}.${mode}-enabled`);
      }
    }
    try {
      // 过期 PASS 被继续当作有效资格 = 当前资格表里仍有已过期行（真正的 HOLD 绕过信号）。
      // 当前资格的唯一真源是 control.qualification_current；gate_audits.current_valid 是
      // 签名时默认 true、且 k3 签发/撤权都不回写的冗余标记，不能作为“当前”判据——
      // 否则任何按 6 天有效期自然过期的历史审计都会触发误报（见 2026-11-14 断点核）。
      const rows = await dataAccess.queryRows(
        `select count(*)::text as stale_current
           from control.qualification_current
          where valid_until <= now()`);
      const stale = Number(rows[0]?.stale_current ?? -1);
      if (!Number.isFinite(stale) || stale !== 0) problems.push(`stale_current_pass=${rows[0]?.stale_current}`);
      const audits = await dataAccess.queryRows("select count(*)::text as total from control.gate_audits");
      if (Number(audits[0]?.total ?? 0) < 1) problems.push("no-gate-audit-evidence");
    } catch (error) {
      problems.push(`gate-audit-check:${String(error?.message ?? error).split("\n")[0]}`);
    }
    record("no_formal_hold_bypass", problems.length === 0,
      problems.length ? problems.join(",") : "isolated target + attended-only + no stale current PASS");
  }

  // ---------- 汇总 ----------
  for (const [key, value] of Object.entries(checks)) console.log(`${value.status === "PASS" ? "PASS" : "FAIL"} ${key} — ${value.detail}`);
  const allPass = Object.values(checks).every((c) => c.status === "PASS");
  if (STDOUT_ONLY) {
    console.log(allPass ? "LOCAL_EXECUTION_ENV_OK" : "LOCAL_EXECUTION_ENV_FAIL");
  } else if (allPass) {
    fs.mkdirSync(stateDir(), { recursive: true });
    const evidence = {
      generated_at: new Date().toISOString(),
      git_head: gitHead(),
      registry_digest: executionDigest(registry),
      target: "local-isolated",
      checks,
      note: "由 tools/verify-local-execution-env.mjs 独立生成；仅供本地隔离阶段授权，不构成生产执行权威或 Gate 准出。",
    };
    const file = path.join(stateDir(), "enable-requires-evidence.json");
    fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(`LOCAL_EXECUTION_ENV_EVIDENCE_WRITTEN ${file}`);
  } else {
    console.log("LOCAL_EXECUTION_ENV_FAIL（未写入证据文件，阶段授权将拒绝签发）");
    process.exitCode = 1;
  }
  await dataAccess.getNodePgPool?.().end?.().catch?.(() => {});
}

try {
  await main();
} catch (error) {
  console.error(String(error?.message ?? error).split("\n")[0]);
  process.exitCode = 1;
}
