// pipelines/evidence/gates.mjs — 证据门禁 G0–G6 纯函数层（无 DB 依赖，可被测试直接引用）。
//
// G0 来源完整 / G1 对象身份 / G2 时间语义 / G3 空间诚实 / G4 证据支持 / G5 冲突检测 / G6 发布资格
// 硬规则：无 Evidence 不发布；C 级不得自动通过（skills/mohen-evidence-gate Hard Rules）。
//
// 输入 facts 中每项取三态：true=通过 / false=不通过 / undefined(或null)=未知待补。
// 输出：{ gates:{G0..G6:{result,reason}}, tier, forcedC, summary }

export const GATE_CODES = ["G0", "G1", "G2", "G3", "G4", "G5", "G6"];

// 结构型谓词：只表达结构连接，未证明具体人文语义（spec D → 至少 Tier C）
export const STRUCTURAL_PREDICATES = new Set([
  "crossLink",
  "belongsTo",
  "relatedTo",
  "sameAs",
  "linkedTo",
  "partOf",
]);

// 三态 → {result, reason}
function gate(state, passMsg, failMsg, pendingMsg) {
  const result = state === true ? "pass" : state === false ? "fail" : "pending";
  const reason = state === true ? passMsg : state === false ? failMsg : pendingMsg;
  return { result, reason };
}

// 取反（用于「冲突」这类「有=坏」的语义）
function invert(state) {
  if (state === true) return false;
  if (state === false) return true;
  return undefined;
}

/**
 * @param {object} f facts:
 *   source   来源是否完整可追溯
 *   identity 对象身份是否唯一可判
 *   time     时间语义是否明确
 *   spatial  空间来源是否可证明
 *   evidence 是否有 Evidence 支持
 *   conflict 是否检测到冲突（true=有冲突）
 *   forcedC  额外强制 Tier C 的原因数组（spec D 列明情形）
 */
export function evaluateGates(f) {
  const G = {
    G0: gate(
      f.source,
      "来源完整可追溯",
      "缺少可追溯来源（source_id/locator 为空）",
      "来源信息不完整，待补"
    ),
    G1: gate(
      f.identity,
      "对象身份唯一且可判",
      "对象身份不确定或存在同名异地，需人工判定",
      "对象身份待核验"
    ),
    G2: gate(
      f.time,
      "时间语义明确",
      "时间语义冲突（起止倒置或年代矛盾）",
      "时间信息缺失，待补"
    ),
    G3: gate(
      f.spatial,
      "空间来源可证明",
      "存在坐标但坐标来源无法证明，不得直接采信",
      "空间信息缺失，待补"
    ),
    G4: gate(
      f.evidence,
      "有 Evidence 支持",
      "无 Evidence 支持，不得晋级",
      "Evidence 待补，暂不晋级"
    ),
    G5: gate(
      invert(f.conflict),
      "未检测到冲突",
      "检测到冲突（重名/年代/语义冲突），需人工裁决",
      "冲突检测未完成"
    ),
  };

  const pre = GATE_CODES.slice(0, 6); // G0..G5
  const anyFail = pre.some((c) => G[c].result === "fail");
  const anyPending = pre.some((c) => G[c].result === "pending");

  // G6 发布资格：任一前置门不通过即无资格；有 pending 则待定。
  G.G6 = anyFail
    ? { result: "fail", reason: "G0–G5 存在不通过项，不具备发布资格" }
    : anyPending
    ? { result: "pending", reason: "存在待补门禁项，补齐后方可评估发布资格" }
    : { result: "pass", reason: "G0–G5 全部通过，具备发布资格" };

  const forcedC = Array.isArray(f.forcedC) ? f.forcedC.filter(Boolean) : [];

  // 分级：任一 fail 或命中强制 C 情形 → C；否则有 pending → B；全 pass → A。
  const tier = anyFail || forcedC.length ? "C" : anyPending ? "B" : "A";

  const failed = pre.filter((c) => G[c].result === "fail");
  const pending = pre.filter((c) => G[c].result === "pending");

  return {
    gates: G,
    tier,
    forcedC,
    failed,
    pending,
    summary: GATE_CODES.map((c) => `${c}=${G[c].result}`).join(" "),
  };
}

// 汇总多个对象的门禁结果（用于报告统计，禁止单一总分掩盖问题）
export function summarize(results) {
  const byGate = {};
  for (const c of GATE_CODES) {
    byGate[c] = { pass: 0, fail: 0, pending: 0 };
  }
  const byTier = { A: 0, B: 0, C: 0 };
  for (const r of results) {
    // 兼容两种入参形状：{res:{gates,tier}}（run.mjs 的 result 项）或裸 {gates,tier}
    const g = (r.res && r.res.gates) || r.gates;
    const tier = (r.res && r.res.tier) || r.tier;
    for (const c of GATE_CODES) {
      byGate[c][g[c].result]++;
    }
    byTier[tier]++;
  }
  return { byGate, byTier, total: results.length };
}
