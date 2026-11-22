// D05 事实分支：确定性的、零付费的 publishReadModels 实现。
//
// 合同依据（specs/data-production/MoHen_Data_Production_Protocol.md §13.5 EX05 事实分支）：
//   输入 L3_fact_ref@revision + valid_G3_for_purpose + dependency_snapshot +
//   rights/consumer/scope，合法形成事实型 world_projections / map_timeline_projections /
//   evidence_pointers 等 P02/P03/P06 读模型；未要求 G4 时不生成 L4、不调用无关 D04。
//
// 本模块只产出当前方法绑定真实存在、且 G5 机器评审支持的事实型 P02 world_projection。
// P03（map_timeline_projections）与 P06（evidence_pointers）在现行
// method-binding-contract.json 中仍 implementation_binding=HOLD，且 G5 评审器的
// checkRightsByOperation/checkWorkRevisionBinding 尚无对应 object_type 分支；
// 因此这里如实不产出、记 HOLD，不为凑数伪造读模型或资格。
//
// 零 Provider / 零 LLM：投影正文逐字/有界地取自已合格的 finding 与其支撑的 claim，
// 只做确定性编排，不新造史实、坐标或未经审定的人文解释。

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const fail = (code) => {
  throw Error(code);
};

const EMPTY_CANDIDATES = Object.freeze({
  world_projections: [],
  map_timeline_projections: [],
  evidence_pointers: [],
  agent_contexts: [],
  story_seeds: [],
  discovery_paths: [],
});

const HELD_FACT_METHODS = Object.freeze({
  P03: 'map_timeline_projections',
  P06: 'evidence_pointers',
});

/**
 * 纯确定性：从已由独立 G4 签发的 finding + 其支撑的 G3 合格 claim 派生一个事实型
 * P02 world_projection 的 spec（projection_key + payload）。不调用任何 Provider。
 * 所有内容取自入参 facts，不新增历史事实；绑定/资格缺失时失败关闭。
 */
export function deriveFactWorldProjection({
  findingId,
  claimRevisionId,
  originalId,
  g4AuditId,
  g3AuditId,
  findingMethodId,
  interpretiveStatement,
  assertion,
  sourceVoice,
  g4ArtifactRevision,
  g3ArtifactRevision,
} = {}) {
  if (!UUID.test(findingId ?? '')) fail('D05_FACT_FINDING_ID_INVALID');
  if (!UUID.test(claimRevisionId ?? '')) fail('D05_FACT_CLAIM_ID_INVALID');
  if (!UUID.test(originalId ?? '')) fail('D05_FACT_ORIGINAL_ID_INVALID');
  if (!UUID.test(g4AuditId ?? '')) fail('D05_FACT_G4_AUDIT_INVALID');
  if (!UUID.test(g3AuditId ?? '')) fail('D05_FACT_G3_AUDIT_INVALID');
  if (!/^A(0[1-9]|1[0-2])$/.test(findingMethodId ?? '')) fail('D05_FACT_METHOD_INVALID');
  if (typeof interpretiveStatement !== 'string' || !interpretiveStatement.trim() ||
      Buffer.byteLength(interpretiveStatement) > 5000) fail('D05_FACT_STATEMENT_INVALID');
  if (typeof assertion !== 'string' || !assertion.trim() || Buffer.byteLength(assertion) > 2000)
    fail('D05_FACT_ASSERTION_INVALID');
  if (g4ArtifactRevision !== undefined && !SHA.test(g4ArtifactRevision ?? '')) fail('D05_FACT_G4_ARTIFACT_INVALID');
  if (g3ArtifactRevision !== undefined && !SHA.test(g3ArtifactRevision ?? '')) fail('D05_FACT_G3_ARTIFACT_INVALID');

  const projection = {
    projection_key: `d05-fact-${claimRevisionId.slice(0, 8)}-${findingId.slice(0, 8)}`,
    payload: {
      schema: 'mohen.d05-fact-projection.v1',
      projection_type: 'fact_branch_world_projection',
      scope: { region_ref: originalId, scale: 'bounded_fact', consumer: 'producer' },
      subject: { claim_revision_id: claimRevisionId, finding_id: findingId },
      facts: [{
        kind: 'world_claim',
        assertion,
        ...(typeof sourceVoice === 'string' && sourceVoice ? { source_voice: sourceVoice } : {}),
      }],
      interpretation_ref: {
        finding_id: findingId,
        method_id: findingMethodId,
        interpretive_statement: interpretiveStatement,
      },
      method_trace: {
        method_id: 'P02',
        source_finding_method_id: findingMethodId,
        derivation: 'deterministic_fact_branch',
        provider_calls: 0,
      },
      evidence_refs: [
        { kind: 'claim_revision', id: claimRevisionId, ...(g3ArtifactRevision ? { artifact_revision: g3ArtifactRevision } : {}) },
        { kind: 'finding', id: findingId, ...(g4ArtifactRevision ? { artifact_revision: g4ArtifactRevision } : {}) },
      ],
      lineage: { g3_audit_id: g3AuditId, g4_audit_id: g4AuditId },
      qualification: 'UNASSESSED',
      uncertainty: {
        note: 'D05 fact-branch projection deterministically derived from the current G4 finding and G3-qualified claim; no paid Provider/LLM reasoning used',
        provider_calls: 0,
      },
    },
  };
  if (Buffer.byteLength(interpretiveStatement) > 5000 || projection.projection_key.length > 200)
    fail('D05_FACT_PROJECTION_TOO_LARGE');
  return projection;
}

/**
 * 与 adapters/d05-read-model-publication.mjs 的 context.publishReadModels 注入钩子同签名：
 *   publishReadModels({run, job, input, context, methods}) -> {candidates, stats, reviews}
 * 事实型输入 `input.projection` 已由 rebuildD05ResumeInput 确定性生成；此处只做分面编排，
 * 不落库（落库由唯一 Runner 的 projectWorld worker 完成），不自签 G5。
 */
export function createD05FactPublishReadModels() {
  return async function publishReadModels({ job, input, methods } = {}) {
    const requested = Array.isArray(job?.methods) ? job.methods : (Array.isArray(methods) ? methods : []);
    const reviews = [];
    for (const method of Object.keys(HELD_FACT_METHODS)) {
      if (requested.includes(method)) {
        reviews.push({
          method_id: method,
          disposition: 'HOLD',
          reason_code: 'METHOD_BINDING_HELD',
          missing_requirement: `${HELD_FACT_METHODS[method]} has implementation_binding=HOLD in method-binding-contract.json and no G5 object_type reviewer branch`,
        });
      }
    }
    if (requested.some((m) => !['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07'].includes(m))) {
      fail('D05_FACT_UNKNOWN_METHOD');
    }
    if (!requested.includes('P02')) {
      return { candidates: { ...EMPTY_CANDIDATES }, stats: { produced: 0 }, reviews };
    }
    const projection = input?.projection;
    if (!projection || typeof projection !== 'object' ||
        typeof projection.projection_key !== 'string' || !projection.projection_key ||
        !projection.payload || typeof projection.payload !== 'object') {
      fail('D05_FACT_PROJECTION_UNAVAILABLE');
    }
    return {
      candidates: {
        ...EMPTY_CANDIDATES,
        world_projections: [projection],
      },
      stats: { produced: 1, method_id: 'P02', provider_calls: 0 },
      reviews,
    };
  };
}

export { EMPTY_CANDIDATES, HELD_FACT_METHODS };
