// packages/data-access/src/rights-actions.mjs
//
// MHKA 唯一"权利动作词典"与判定器（CP2-A / QR-04、QR-05）。
//
// 为什么需要它：KAD（KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT）只列了六个动作
// read/quote/display/download/adapt/external_processing，而 Gate 合同（G0—G5）
// 明确要求 machine_read 与 retain。两套词表各说各话，导致：
//   · Reviewer 只看 DENIED_RIGHTS 黑名单，缺失字段不算失败 → 可能放行；
//   · 派发器用 `rights.status='public_domain_secondary_use'` 之类**推断**当许可；
//   · 库里 rights 全是 {}，却没有一个统一的地方说明"空 = 什么都不能做"。
// 本模块就是那个唯一词表 + 唯一判定点：**只有显式 allowed 才放行**，
// 缺失 / unknown / restricted / denied 一律 HOLD，并给出稳定原因码。
//
// 边界：只回答"某个动作是否被显式许可"，不取回、不写库、不签发 Gate。
// Owner 2026-11-08 裁定：不得从 CC 标签、`public_domain_secondary_use` 自述、
// 来源类别或任何默认值自动推断许可 —— 本模块因此没有任何"推断放行"分支。

/** 唯一动作集（KAD 六动作 + Gate 的 machine_read/retain + 再分发）。 */
export const RIGHTS_ACTIONS = Object.freeze([
  "access_view",
  "machine_read",
  "retain",
  "download",
  "quote",
  "display",
  "adapt",
  "redistribute",
  "external_processing",
]);

/** 唯一取值集。absent（键缺失）在本模块内部等价于 unknown，不进入对外取值集。 */
export const RIGHTS_VALUES = Object.freeze(["allowed", "denied", "unknown", "restricted"]);

/** 旧写法 → 规范写法。只做同义归并，不改变许可含义。 */
export const RIGHTS_ACTION_ALIASES = Object.freeze({
  read: "access_view",
  public_display: "display",
});

/** G0（受控原件）必检动作；要保存副本时再叠加 retain。 */
export const G0_REQUIRED_ACTIONS = Object.freeze(["machine_read"]);
export const G0_RETAIN_ACTION = "retain";

/** G5 消费方动作映射（与既有 work-qualification-reader 的 ACTIONS 同义）。 */
export const CONSUMER_ACTIONS = Object.freeze({
  watch: "display",
  visual_stage: "display",
  agent: "access_view",
  evidence_on_demand: "quote",
});

/** 越靠前越保守：冲突合并时取更保守的一侧。 */
const RESTRICTIVENESS = Object.freeze({ denied: 0, restricted: 1, unknown: 2, allowed: 3 });

const RAW_ACTIONS = new Set(RIGHTS_ACTIONS);
const RAW_VALUES = new Set(RIGHTS_VALUES);

const text = (value) => (value == null ? "" : String(value));

/** 归一单个动作名；无法识别返回 null（调用方必须当作"不能做"，不得猜）。 */
export function canonicalRightsAction(action) {
  const key = text(action).trim().toLowerCase().replace(/[\s\-－—–]+/g, "_");
  if (!key) return null;
  if (RAW_ACTIONS.has(key)) return key;
  const alias = RIGHTS_ACTION_ALIASES[key];
  return alias && RAW_ACTIONS.has(alias) ? alias : null;
}

/** 归一单个取值；无法识别返回 null（调用方必须当作 unknown）。 */
export function canonicalRightsValue(value) {
  const key = text(value).trim().toLowerCase();
  if (!key) return null;
  // 常见显式否定写法归并到 denied；其余"看起来像许可"的字样一律不认。
  if (key === "deny" || key === "not_allowed" || key === "prohibited") return "denied";
  return RAW_VALUES.has(key) ? key : null;
}

const stricter = (a, b) => (RESTRICTIVENESS[a] <= RESTRICTIVENESS[b] ? a : b);

/**
 * 把任意来源的权利记录（jsonb 对象或 psql 文本通道的 JSON 字符串）归一成
 * 九个规范动作的取值。**缺失动作 → unknown**；无法解析的键/值只记 issue，
 * 绝不因为"写错了个名字"就当成许可。
 * @returns {{schema:string, actions:Record<string,string>, issues:Array<{code:string,detail:string}>}}
 */
export function normalizeRightsSnapshot(raw) {
  const actions = {};
  for (const action of RIGHTS_ACTIONS) actions[action] = "unknown";
  const issues = [];

  if (raw == null || raw === "") return { schema: "mohen.rights-actions.v1", actions, issues };
  let record = raw;
  if (typeof raw === "string") {
    try {
      record = JSON.parse(raw);
    } catch {
      issues.push({ code: "rights_snapshot_unparsable", detail: "json_parse_failed" });
      return { schema: "mohen.rights-actions.v1", actions, issues };
    }
  }
  if (typeof record !== "object" || Array.isArray(record)) {
    issues.push({ code: "rights_snapshot_unparsable", detail: `type=${Array.isArray(record) ? "array" : typeof record}` });
    return { schema: "mohen.rights-actions.v1", actions, issues };
  }

  const explicit = new Map();
  for (const key of Object.keys(record)) {
    const action = canonicalRightsAction(key);
    if (!action) {
      issues.push({ code: "rights_action_unrecognized", detail: `key=${key}` });
      continue;
    }
    const value = canonicalRightsValue(record[key]);
    if (!value) {
      issues.push({ code: "rights_value_unrecognized", detail: `${action}=${text(record[key])}` });
      actions[action] = "unknown";
      explicit.set(action, "unknown");
      continue;
    }
    if (explicit.has(action)) {
      const merged = stricter(explicit.get(action), value);
      if (merged !== explicit.get(action) || merged !== value) {
        issues.push({ code: "rights_alias_conflict", detail: `${action}=${explicit.get(action)}|${value}` });
      }
      actions[action] = merged;
      explicit.set(action, merged);
      continue;
    }
    actions[action] = value;
    explicit.set(action, value);
  }
  return { schema: "mohen.rights-actions.v1", actions, issues };
}

/** 单动作判定。allowed 只在取值恰为 allowed 时为 true。 */
export function decideRightsAction(raw, action) {
  const requested = text(action);
  const canonical = canonicalRightsAction(requested);
  if (!canonical) {
    return {
      schema: "mohen.rights-actions.v1",
      action: requested,
      canonical: null,
      value: "unknown",
      allowed: false,
      reason: `rights_action_unrecognized:${requested || "empty"}`,
      issues: [],
    };
  }
  const snapshot = normalizeRightsSnapshot(raw);
  const value = snapshot.actions[canonical];
  const allowed = value === "allowed";
  const reason = allowed
    ? null
    : value === "denied"
      ? `rights_denied:${canonical}`
      : value === "restricted"
        ? `rights_restricted:${canonical}`
        : `rights_unknown:${canonical}`;
  return {
    schema: "mohen.rights-actions.v1",
    action: requested,
    canonical,
    value,
    allowed,
    reason,
    issues: snapshot.issues,
  };
}

/** 多动作判定：全部显式 allowed 才 ok。 */
export function decideRightsActions(raw, actions) {
  const list = Array.isArray(actions) ? actions : [];
  if (!list.length) {
    return {
      schema: "mohen.rights-actions.v1",
      ok: false,
      decisions: [],
      reasons: ["rights_actions_empty"],
      issues: [],
    };
  }
  const decisions = list.map((action) => decideRightsAction(raw, action));
  const reasons = [];
  for (const decision of decisions) if (decision.reason) reasons.push(decision.reason);
  const issues = decisions.flatMap((decision) => decision.issues);
  return {
    schema: "mohen.rights-actions.v1",
    ok: decisions.every((decision) => decision.allowed),
    decisions,
    reasons,
    issues,
  };
}

/** G0（受控原件）判定：必检 machine_read；保存副本时叠加 retain。 */
export function evaluateG0Rights(raw, { retain = false } = {}) {
  const required = retain ? [...G0_REQUIRED_ACTIONS, G0_RETAIN_ACTION] : [...G0_REQUIRED_ACTIONS];
  const outcome = decideRightsActions(raw, required);
  return { ...outcome, gate: "G0", required };
}

/**
 * 断言版：不满足即抛错（错误对象带 code/reasons，供 API 与 tools 失败关闭）。
 * 任何 unknown/restricted/denied 都不放行；没有"缺省放行"。
 */
export function assertRightsActionsAllowed(raw, actions, label = "rights") {
  const outcome = decideRightsActions(raw, actions);
  if (!outcome.ok) {
    const error = new Error(`${label}_NOT_ALLOWED:${outcome.reasons.join(",") || "rights_actions_empty"}`);
    error.code = "RIGHTS_NOT_ALLOWED";
    error.reasons = outcome.reasons;
    error.decisions = outcome.decisions;
    throw error;
  }
  return outcome;
}

export default {
  RIGHTS_ACTIONS,
  RIGHTS_VALUES,
  RIGHTS_ACTION_ALIASES,
  G0_REQUIRED_ACTIONS,
  G0_RETAIN_ACTION,
  CONSUMER_ACTIONS,
  canonicalRightsAction,
  canonicalRightsValue,
  normalizeRightsSnapshot,
  decideRightsAction,
  decideRightsActions,
  evaluateG0Rights,
  assertRightsActionsAllowed,
};
