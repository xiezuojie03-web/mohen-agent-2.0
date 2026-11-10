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
// 刻意不推断「隔离已验证」：它需要逐项独立证据，本工具不猜。已知为 0 可验证项时如实标 NOT_TRACKED。
import fs from "node:fs";

const REG = "specs/data-production/identifier-registry.json";
const BIND = "specs/data-production/method-binding-contract.json";
const ROUTE = "specs/data-production/schemas/method-route-decisions.schema.json";

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
// 隔离已验证：只有取得逐项独立证据后才可登记，本工具不做推断。
line("ISOLATED_VERIFIED", "NOT_TRACKED");
console.log("# ISOLATED_VERIFIED 需逐项独立证据（测试/回执/SHA），工具不推断；D00-C 接执行器前须建立逐项证据账。");
console.log("");
line("BINDING_CONTRACT_STATUS", bind.status);
line("IDENTIFIER_REGISTRY_STATUS", reg.status);
line("ROUTE_ENUM_LEN", Array.isArray(enumIds) ? enumIds.length : 0);
line("ROUTE_ENUM_MATCHES_REGISTRY", Array.isArray(enumIds)
  ? String(enumIds.length === identities.length && identities.every((id) => enumIds.includes(id)))
  : "false");
