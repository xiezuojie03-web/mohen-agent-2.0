/**
 * D05 可信发布 adapter（L5 / G5 / P01-P08）。
 *
 * 职责边界：
 *   - 六类 L5 候选产出：world_projections / map_timeline_projections /
 *     agent_contexts / story_seeds / discovery_paths / evidence_pointers。
 *   - 事实/解释分离：P02/P03 只消费 L3/G3 世界对象；P04 只消费 L4/G4 人文发现。
 *   - 双读分面（P07）：同一 L5 修订分化为 visual_stage / agent 两个 consumer，
 *     共享同一事实身份，消费者资格分别经 G5 审核，不自授资格。
 *   - P08 精准失效：只产出失效影响分析 + 暂停请求 + 重审请求（控制职责），
 *     不自行改写 G3/G4/G5 裁决、不复活旧修订、不成为第七类 L5 内容。
 *   - 不自行授门：提交候选 + gate_evidence；G5 独立审核（producer_may_self_qualify=false）。
 *
 * P01-P07 的发布组合计算（把合格世界/解释编排为六类 L5，属 N01-N06 抽取作业的
 * 下游）尚未实现，通过 context.publishReadModels 注入；未注入时诚实降级 HOLD。
 * P08 是确定性反向依赖闭包算法（见 packages/data-access/src/invalidation.mjs），
 * 本 adapter 直接落地，不属于未实现的 LLM 抽取。
 */

import { computePreciseInvalidation } from "../../../packages/data-access/src/invalidation.mjs";

const P_PUBLISH_METHODS = Object.freeze(["P01", "P02", "P03", "P04", "P05", "P06", "P07"]);
const P_CONTROL_METHODS = Object.freeze(["P08"]);
const P_METHODS = Object.freeze([...P_PUBLISH_METHODS, ...P_CONTROL_METHODS]);

const L5_KINDS = Object.freeze([
  "world_projections",
  "map_timeline_projections",
  "agent_contexts",
  "story_seeds",
  "discovery_paths",
  "evidence_pointers",
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

export default async function d05ReadModelPublication({ run, job, input, context }) {
  const requested = Array.isArray(job?.methods) ? job.methods : [];
  const methods = requested.filter((m) => P_METHODS.includes(m));
  const unknown = requested.filter((m) => !P_METHODS.includes(m));

  if (unknown.length) {
    return hold("UNKNOWN_METHOD", `unknown D05 methods: ${unknown.join(",")}`, "bind valid P01-P08 method", "valid method bound");
  }
  if (!methods.length) {
    return hold("NO_METHOD", "no P01-P08 method bound for D05", "bind P01-P08 method", "method bound");
  }

  const hasInvalidation = methods.includes("P08");
  const publishMethods = methods.filter((m) => P_PUBLISH_METHODS.includes(m));

  // P08 与 P01-P07 职责分离：不可在同一 job 混用（P08 应独立触发）。
  if (hasInvalidation && publishMethods.length) {
    return hold(
      "MIXED_CONTROL_PUBLISH",
      "P08 invalidation and P01-P07 publication must not share one job",
      "trigger P08 as an independent control action",
      "single-responsibility method set"
    );
  }

  // ---- P08 精准失效：独立控制职责，确定性算法，真正落地。 ----
  if (hasInvalidation) {
    const analysis = computePreciseInvalidation({
      change_event_ref: input?.change_event_ref,
      changed_dependency_ref: input?.changed_dependency_ref,
      dependency_index: input?.dependency_index,
      reason: input?.reason,
    });
    return {
      disposition: "HOLD", // 失效是控制职责，不是发布 PASS。
      output: {},
      control_outputs: {
        invalidation_event: analysis,
        remediation_request: analysis.recheck_request ?? analysis.suspension_request,
      },
      gate_evidence: {
        stage: "D05",
        methods,
        control: "P08-invalidation",
        affected_publication_revisions: analysis.affected_publication_revisions.length,
        unknown_dependency: analysis.unknown_dependency,
      },
      content_stats: {},
      review_records: [],
      hold: {
        reason_code: "INVALIDATION_COMPUTED",
        missing_requirement: "independent G5 re-review after invalidation",
        next_action: "route suspension_request to PD7 + recheck_request to independent G5",
        recheck_condition: "independent G5 records new decision",
      },
    };
  }

  // ---- P01-P07 发布组合：LLM 编排尚未实现，诚实 HOLD。 ----
  const publish = context?.publishReadModels;
  if (typeof publish !== "function") {
    return hold(
      "PUBLICATION_NOT_IMPLEMENTED",
      "P01-P07 publication composition (N01-N06 downstream) not implemented",
      "implement qualified world/finding -> six L5 read model candidates",
      "publishReadModels injected"
    );
  }

  const { candidates, stats, reviews } = await publish({ run, job, input, context, methods: publishMethods });
  const list = {};
  for (const k of L5_KINDS) list[k] = Array.isArray(candidates?.[k]) ? candidates[k] : [];
  const total = L5_KINDS.reduce((n, k) => n + list[k].length, 0);

  const consumers = Array.isArray(candidates?.consumers) ? candidates.consumers : ["visual_stage", "agent"];
  const result = {
    disposition: total ? "PASS" : "HOLD",
    output: list, // runtime_eligible_read_model 候选（六类 L5）
    gate_evidence: { stage: "D05", methods: publishMethods, candidate_count: total, consumers },
    content_stats: stats ?? {},
    review_records: reviews ?? [],
  };
  if (!total) {
    result.hold = { reason_code: "NO_CANDIDATE", missing_requirement: "L5 read model candidates", next_action: "publish", recheck_condition: "candidates present" };
  }
  return result;
}

export { P_PUBLISH_METHODS, P_CONTROL_METHODS, L5_KINDS };
