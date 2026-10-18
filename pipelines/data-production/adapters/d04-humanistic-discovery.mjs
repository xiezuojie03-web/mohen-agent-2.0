/**
 * D04 人文发现 adapter（L4 / G4 / A01-A12）。
 *
 * 职责边界：
 *   - 事实/解释分离：本 adapter 只产出 humanistic_finding_revision（L4 解释），
 *     不重复 world（L3 事实）；依赖世界对象一律以 G3 PASS 引用为据。
 *   - 不自行授门：提交候选 + gate_evidence；G4 独立审核（producer_may_self_qualify=false）。
 *   - 方法路由：按 job.methods（A01-A12 子集）精确匹配；未知方法 -> HOLD。
 *
 * AI 推理（在事实层上读「意味着什么/当下联系/开放问题」，N01-N06）尚未实现，
 * 通过 context.extractHumanisticFinding 注入；未注入时诚实降级为 HOLD。
 */

const A_METHODS = Object.freeze([
  "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12",
]);

function hold(reason_code, missing_requirement, next_action, recheck_condition) {
  return {
    disposition: "HOLD",
    gate_evidence: {},
    content_stats: {},
    review_records: [],
    hold: { reason_code, missing_requirement, next_action, recheck_condition },
  };
}

export default async function d04HumanisticDiscovery({ run, job, input, context }) {
  const requested = Array.isArray(job?.methods) ? job.methods : [];
  const methods = requested.filter((m) => A_METHODS.includes(m));
  const unknown = requested.filter((m) => !A_METHODS.includes(m));

  if (unknown.length) {
    return hold("UNKNOWN_METHOD", `unknown D04 methods: ${unknown.join(",")}`, "bind valid A01-A12 method", "valid method bound");
  }
  if (!methods.length) {
    return hold("NO_METHOD", "no A01-A12 method bound for D04", "bind A01-A12 method", "method bound");
  }

  const extract = context?.extractHumanisticFinding;
  if (typeof extract !== "function") {
    return hold(
      "EXTRACTION_NOT_IMPLEMENTED",
      "A01-A12 AI reasoning jobs (N01-N06) not implemented",
      "implement world -> humanistic finding reasoning",
      "extractHumanisticFinding injected"
    );
  }

  const { candidates, stats, reviews } = await extract({ run, job, input, context, methods });
  const list = Array.isArray(candidates) ? candidates : [];
  const result = {
    disposition: list.length ? "PASS" : "HOLD",
    output: list, // humanistic_finding_revision 候选
    gate_evidence: { stage: "D04", methods, candidate_count: list.length },
    content_stats: stats ?? {},
    review_records: reviews ?? [],
  };
  if (!list.length) {
    result.hold = { reason_code: "NO_CANDIDATE", missing_requirement: "humanistic finding candidates", next_action: "reason", recheck_condition: "candidates present" };
  }
  return result;
}
