#!/usr/bin/env node
// D00-A3｜身份账本单一派生（只读，无数据库、无网络）
//
// 目的：终结「63 / 71 / 已激活 N」三个数字各说各话。本工具是身份账本的唯一派生入口，
// 一切报账（progress.md、CURRENT.md、M6 验收、交接书）应引用本工具输出，不得手写分母。
//
// 派生来源（不新增第二套真值）：
//   设计身份目录  specs/data-production/identifier-registry.json  professional_methods
//   执行分母      specs/data-production/method-binding-contract.json  method_count / methods
//   实现绑定状态  method-binding-contract.json 每条 implementation_binding（"HOLD" 即未绑定）
//   身份分类      前缀：Y = D00 阶段工序（stage_step）；C/H/W/A/P = 专业方法（method）
//
// 刻意不推断「隔离已验证」：它必须逐项有独立证据。工具只认
// tasks/results/MAB/evidence/method-isolation/ 下由验证工具自己写出的回执，
// 并且回执里记的验证脚本 SHA-256 必须与脚本当前字节一致（脚本改了 → 旧回执作废）。
// 手工改写回执或以「测试通过」口头理由要求计数，都会被判 STALE/NOT_PASS 拒绝。
// 没有任何可采纳回执时如实输出 NOT_TRACKED，不猜、不填 0 冒充已核。
import fs from "node:fs";
import { createHash } from "node:crypto";

const REG = "specs/data-production/identifier-registry.json";
const BIND = "specs/data-production/method-binding-contract.json";
const ROUTE = "specs/data-production/schemas/method-route-decisions.schema.json";
const ISOLATION_DIR = "tasks/results/MAB/evidence/method-isolation";
const RECEIPT_SCHEMA = "mohen.method-isolation-evidence.v1";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const reg = read(REG);
const bind = read(BIND);
const route = read(ROUTE);

const identities = Array.isArray(reg.professional_methods) ? reg.professional_methods : [];
const methods = Array.isArray(bind.methods) ? bind.methods : [];
const enumIds = route?.properties?.method_id?.enum;

const METHOD_PREFIXES = new Set(["C", "H", "W", "A", "P"]);
const prefixOf = (id) => String(id).replace(/\d+$/, "");
const isBound = (m) =>
  typeof m.implementation_binding === "string" &&
  m.implementation_binding.trim() !== "" &&
  !/^hold$/i.test(m.implementation_binding.trim());

const methodClass = identities.filter((id) => METHOD_PREFIXES.has(prefixOf(id)));
const stageSteps = identities.filter((id) => !METHOD_PREFIXES.has(prefixOf(id)));
const bound = methods.filter(isBound);
const unbound = methods.filter((m) => !isBound(m));

const byStage = (list) =>
  list.reduce((acc, m) => ((acc[m.stage] = (acc[m.stage] || 0) + 1), acc), {});

const line = (k, v) => console.log(`${k}=${v}`);

// 只认可核回执：schema 对、状态 PASS、验证脚本字节未变、方法身份在册。
function loadIsolationEvidence(knownIds) {
  const accepted = [];
  const rejected = [];
  if (!fs.existsSync(ISOLATION_DIR)) return { accepted, rejected };
  for (const name of fs.readdirSync(ISOLATION_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const file = `${ISOLATION_DIR}/${name}`;
    let receipt;
    try {
      receipt = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      rejected.push({ file: name, reason: "JSON_PARSE_ERROR" });
      continue;
    }
    if (receipt?.schema !== RECEIPT_SCHEMA) { rejected.push({ file: name, reason: "SCHEMA_MISMATCH" }); continue; }
    if (receipt.status !== "PASS" || receipt.failed !== 0) {
      rejected.push({ file: name, reason: `NOT_PASS(${receipt.status ?? "?"}/${receipt.failed ?? "?"})` });
      continue;
    }
    if (typeof receipt.verifier !== "string" || !fs.existsSync(receipt.verifier)) {
      rejected.push({ file: name, reason: "VERIFIER_MISSING" });
      continue;
    }
    const digest = createHash("sha256").update(fs.readFileSync(receipt.verifier)).digest("hex");
    if (digest !== receipt.verifier_sha256) { rejected.push({ file: name, reason: "VERIFIER_CHANGED_SINCE_RUN" }); continue; }
    const methods = Array.isArray(receipt.methods) ? receipt.methods : [];
    const unknown = methods.filter((m) => !knownIds.includes(m));
    if (methods.length === 0 || unknown.length > 0) {
      rejected.push({ file: name, reason: `UNKNOWN_METHOD_ID(${unknown.join("|") || "-"})` });
      continue;
    }
    accepted.push({ file: name, methods, ran_at: receipt.ran_at, scope: receipt.scope });
  }
  return { accepted, rejected };
}

console.log("# MoHen 身份账本（机器派生，勿手写）");
console.log(`# 派生自 ${REG} + ${BIND} + ${ROUTE}`);
line("DESIGN_IDENTITIES_TOTAL", identities.length);
line("DESIGN_IDENTITIES_METHOD", methodClass.length);
line("DESIGN_IDENTITIES_STAGE_STEP", stageSteps.length);
line("STAGE_STEP_IDS", stageSteps.join(",") || "-");
console.log("");
line("EXECUTION_DENOMINATOR_METHOD_COUNT", bind.method_count);
line("EXECUTION_DENOMINATOR_METHODS_LEN", methods.length);
line("BOUND_IMPLEMENTATION", bound.length);
line("BOUND_IDS", bound.map((m) => m.method_id).join(",") || "-");
line("BOUND_BY_STAGE", JSON.stringify(byStage(bound)));
console.log("");
line("HOLD_COUNT", unbound.length);
line("HOLD_BY_STAGE", JSON.stringify(byStage(unbound)));
console.log("");
// 隔离已验证：只统计可核回执覆盖到的身份，不做任何推断。
const isolation = loadIsolationEvidence(identities);
const isolatedIds = [...new Set(isolation.accepted.flatMap((r) => r.methods))].sort();
line("ISOLATED_VERIFIED", isolatedIds.length === 0 ? "NOT_TRACKED" : isolatedIds.length);
line("ISOLATED_VERIFIED_IDS", isolatedIds.join(",") || "-");
line("ISOLATED_EVIDENCE_ACCEPTED", isolation.accepted.map((r) => r.file).join(",") || "-");
line("ISOLATED_EVIDENCE_REJECTED", isolation.rejected.map((r) => `${r.file}:${r.reason}`).join(",") || "-");
console.log("# 回执目录 tasks/results/MAB/evidence/method-isolation/；回执由验证工具实跑写出并钉住脚本 SHA-256，手改即失效。");
for (const r of isolation.accepted) console.log(`# 采纳 ${r.file} ran_at=${r.ran_at} scope=${r.scope}`);
console.log("");
line("BINDING_CONTRACT_STATUS", bind.status);
line("IDENTIFIER_REGISTRY_STATUS", reg.status);
line("ROUTE_ENUM_LEN", Array.isArray(enumIds) ? enumIds.length : 0);
line("ROUTE_ENUM_MATCHES_REGISTRY", Array.isArray(enumIds)
  ? String(enumIds.length === identities.length && identities.every((id) => enumIds.includes(id)))
  : "false");
