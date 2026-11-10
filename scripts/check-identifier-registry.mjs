// scripts/check-identifier-registry.mjs
// 目的：让「我们自己造的标识符」不再变成孤儿。
//
// 为什么需要它（本仓已付过的代价）：
//   同一批 AI 起的名，命运相反 ——
//     · `T11-C1…C5` 进了**代码**（类型、测试、运行时字段）→ 改它一堆地方报错 → **被迫解释**，活得很好；
//     · `scc_legacy` 只进了**数据**（DB 里一个字符串）→ 改它什么都不报错 → **没人解释**，挂了 10 天，
//       而它的定义一直躺在 tasks/TASK-0009 里，只需两分钟就能搜到。
//   结论：**只进数据的名字没有任何东西逼它被解释，所以必须由守卫来逼。**
//
// 2026-11-10 重写：registry 已从「词表型列登记」（schema_version 数字 + columns[]）演进为
// 「标识符命名空间注册表」（schema_version: "2.0-target"，stages / layers / gates /
// professional_methods / br_responsibility_nodes）。旧检查项（fixed/pattern 值与真库取值核对）
// 随旧结构一并退役；本守卫现在检查：
//   ① schema / 各命名空间数组完整且无重复；
//   ② professional_methods 代号格式合法（字母前缀+两位数字）；
//   ③ 三文件一致性：method-binding-contract.json 的每个 method_id 必须已登记；
//      method-route-decisions.schema.json 的 method_id enum 必须与 professional_methods 完全一致
//      （同一词表两个落点，防漂移）。
// 纯文件检查，不依赖数据库，离线可跑。
import fs from "node:fs";

const REG = "specs/data-production/identifier-registry.json";
const BINDING = "specs/data-production/method-binding-contract.json";
const ROUTE_SCHEMA = "specs/data-production/schemas/method-route-decisions.schema.json";

let failed = false;
const bad = (m) => { console.error("IDENTIFIER_REGISTRY_ERROR " + m); failed = true; };
const load = (p) => {
  if (!fs.existsSync(p)) { bad(`MISSING ${p}`); return null; }
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { bad(`${p} JSON 解析失败：${(e && e.message) || e}`); return null; }
};

const reg = load(REG);
const binding = load(BINDING);
const route = load(ROUTE_SCHEMA);
if (!reg || !binding || !route) process.exit(1);

// ---------- ①② ----------
if (reg.schema !== "mohen.identifier-registry") bad(`schema 应为 "mohen.identifier-registry"，实际 "${reg.schema}"`);

const expectArrays = {
  stages: ["D00", "D01", "D02", "D03", "D04", "D05"],
  production_layers: ["L0", "L1", "L2", "L3", "L4", "L5"],
  gates: ["G0", "G1", "G2", "G3", "G4", "G5"],
};
for (const [key, expected] of Object.entries(expectArrays)) {
  const arr = Array.isArray(reg[key]) ? reg[key] : null;
  if (!arr) { bad(`${key} 缺失或不是数组`); continue; }
  const dup = arr.filter((v, i) => arr.indexOf(v) !== i);
  if (dup.length) bad(`${key} 存在重复：${[...new Set(dup)].join(", ")}`);
  const missing = expected.filter((v) => !arr.includes(v));
  if (missing.length) bad(`${key} 缺 ${missing.join(", ")}`);
}

const methods = Array.isArray(reg.professional_methods) ? reg.professional_methods : null;
if (!methods || !methods.length) {
  bad("professional_methods 缺失或为空");
  process.exit(1);
}
{
  const dup = methods.filter((v, i) => methods.indexOf(v) !== i);
  if (dup.length) bad(`professional_methods 存在重复：${[...new Set(dup)].join(", ")}`);
  for (const m of methods) {
    if (!/^[A-Z]+\d{2}$/.test(m)) bad(`professional_methods 代号 "${m}" 不符合格式（字母前缀+两位数字）`);
  }
}

// ---------- ③ 三文件一致性 ----------
const boundIds = (Array.isArray(binding.methods) ? binding.methods : []).map((m) => m.method_id).filter(Boolean);
for (const id of boundIds) {
  if (!methods.includes(id)) bad(`绑定合同 method_id "${id}" 未在 identifier-registry 登记`);
}

const enumIds = route?.properties?.method_id?.enum;
if (!Array.isArray(enumIds) || !enumIds.length) {
  bad("method-route-decisions.schema.json 缺 properties.method_id.enum");
} else {
  const a = [...methods].sort();
  const b = [...enumIds].sort();
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
    const onlyReg = a.filter((v) => !b.includes(v));
    const onlyEnum = b.filter((v) => !a.includes(v));
    bad(`professional_methods 与 route schema enum 不一致（registry=${a.length} enum=${b.length}` +
      (onlyReg.length ? `；仅 registry 有：${onlyReg.join(", ")}` : "") +
      (onlyEnum.length ? `；仅 enum 有：${onlyEnum.join(", ")}` : "") + "）");
  }
}

// ---------- ④ 身份账本一致性（D00-A3）----------
// 设计身份目录（71）、执行分母（method_count=63）、实现绑定状态必须能从同一处机械派生，
// 不允许文档手写三套数字。派生入口是 tools/report-method-ledger.mjs，本守卫只校验不变量。
const METHOD_PREFIXES = new Set(["C", "H", "W", "A", "P"]);
const prefixOf = (id) => String(id).replace(/\d+$/, "");

// (a) 执行分母必须与绑定合同实际条目数一致，不允许只改 method_count 数字。
if (binding.method_count !== boundIds.length) {
  bad(`绑定合同 method_count=${binding.method_count} 与实际条目数 ${boundIds.length} 不一致`);
}

// (b) 身份前缀必须落在已知类：C/H/W/A/P = 专业方法；Y = D00 阶段工序。
for (const id of methods) {
  if (!METHOD_PREFIXES.has(prefixOf(id)) && prefixOf(id) !== "Y") {
    bad(`身份 "${id}" 前缀未登记类别（应为 C/H/W/A/P 方法或 Y 阶段工序）`);
  }
}

// (c) Y 阶段工序不得占用执行分母：出现即说明 Stage 内部工序被当成可绑定方法。
const stageSteps = methods.filter((id) => prefixOf(id) === "Y");
const leaked = stageSteps.filter((id) => boundIds.includes(id));
if (leaked.length) {
  bad(`D00 阶段工序不得进入方法绑定合同：${leaked.join(", ")}`);
}

// (d) 非 Y 身份必须全部进入绑定合同，否则执行分母会悄悄缩小。
const methodClass = methods.filter((id) => METHOD_PREFIXES.has(prefixOf(id)));
const unbound = methodClass.filter((id) => !boundIds.includes(id));
if (unbound.length) {
  bad(`专业方法未进入绑定合同（执行分母缺项）：${unbound.join(", ")}`);
}

console.log(
  `IDENTIFIER_REGISTRY_OK professional_methods=${methods.length} bound_ids=${boundIds.length} ` +
  `route_enum=${Array.isArray(enumIds) ? enumIds.length : 0} stages=${reg.stages.length} layers=${reg.production_layers.length} gates=${reg.gates.length} ` +
  `design_identities=${methods.length} execution_denominator=${methodClass.length} stage_steps=${stageSteps.length}`
);
process.exit(failed ? 1 : 0);
