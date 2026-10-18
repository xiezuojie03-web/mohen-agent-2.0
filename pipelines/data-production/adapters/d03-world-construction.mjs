/**
 * D03 历史世界构建 adapter（L3 / G3 / W01-W10）。
 *
 * 职责边界：
 *   - 事实/解释分离：本 adapter 只产出 world_claim_revision（L3 事实），绝不产出
 *     meaning（L4 解释）；持久化归属由 persistence-contract 的 write_scope 保证。
 *   - 不自行授门：adapter 是生产者，只提交候选 + gate_evidence；G3 独立审核由
 *     gate_audits 追加审计完成（producer_may_self_qualify=false）。
 *   - 方法路由：按 job.methods（W01-W10 子集）精确匹配；未知方法 -> HOLD。
 *
 * AI 抽取计算（读材料 -> 辨实体/关系/空间/变化，N01-N06 抽取作业）尚未实现，
 * 通过 context.extractWorldClaim 注入；未注入时诚实降级为 HOLD，而非伪造 PASS。
 */

const W_METHODS = Object.freeze([
  "W01", "W02", "W03", "W04", "W05", "W06", "W07", "W08", "W09", "W10",
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

export default async function d03WorldConstruction({ run, job, input, context }) {
  const requested = Array.isArray(job?.methods) ? job.methods : [];
  const methods = requested.filter((m) => W_METHODS.includes(m));
  const unknown = requested.filter((m) => !W_METHODS.includes(m));

  if (unknown.length) {
    return hold("UNKNOWN_METHOD", `unknown D03 methods: ${unknown.join(",")}`, "bind valid W01-W10 method", "valid method bound");
  }
  if (!methods.length) {
    return hold("NO_METHOD", "no W01-W10 method bound for D03", "bind W01-W10 method", "method bound");
  }

  const extract = context?.extractWorldClaim;
  if (typeof extract !== "function") {
    return hold(
      "EXTRACTION_NOT_IMPLEMENTED",
      "W01-W10 AI extraction jobs (N01-N06) not implemented",
      "implement carrier/material -> world claim extraction",
      "extractWorldClaim injected"
    );
  }

  const { candidates, stats, reviews } = await extract({ run, job, input, context, methods });
  const list = Array.isArray(candidates) ? candidates : [];
  const result = {
    disposition: list.length ? "PASS" : "HOLD",
    output: list, // world_claim_revision 候选
    gate_evidence: { stage: "D03", methods, candidate_count: list.length },
    content_stats: stats ?? {},
    review_records: reviews ?? [],
  };
  if (!list.length) {
    result.hold = { reason_code: "NO_CANDIDATE", missing_requirement: "world claim candidates", next_action: "extract", recheck_condition: "candidates present" };
  }
  return result;
}
