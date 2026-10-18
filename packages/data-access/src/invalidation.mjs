/**
 * P08 精准失效（P-INVALIDATE）—— 反向依赖闭包计算（纯函数，无 IO）。
 *
 * 职责：给定一个上游变更事件（来源权利 / G3 世界主张 / G4 解释目的 / G5 裁决 /
 * L5 修订 / 有效期到期），按反向依赖索引精确计算受影响的 L5 发布修订及其
 * 用途 × 范围 × 消费者分面，产出暂停请求 + 重审请求。
 *
 * 边界（G5 V3.0 合同 §4 / P5 资格契约 §9.4）：
 *   - 只计算影响与请求，不改写 G3/G4/G5 裁决、不自行追加 REVOKED 审计；
 *   - 不复活旧修订；不以新的 G5 PASS 作为阻断前提（先阻断再重审）；
 *   - 不全局清空无关分面（只停受影响的）；
 *   - 无可信依赖索引时对涉及不明依赖的请求失败关闭（unknown_dependency），
 *     绝不把"未知依赖"当"无依赖"。
 *
 * 这是确定性图算法，不涉及 LLM 抽取；与 P01–P07 的发布组合（N01–N06 下游，
 * 尚未实现）分属两类职责。
 */

function depKey(ref) {
  if (!ref || typeof ref !== "object") return null;
  const t = String(ref.type || "").trim();
  const id = String(ref.id ?? "").trim();
  if (!t || !id) return null;
  const v = ref.version ? `@${ref.version}` : "";
  return `${t}:${id}${v}`;
}

/**
 * 从"发布分面 -> 上游依赖 refs"的正向快照，构建"依赖 ref -> 受影响发布分面"的反向索引。
 *
 * @param {Array<{
 *   publication_revision: string,
 *   purpose?: object|string,
 *   scope?: object|string,
 *   consumer?: string,
 *   dependency_refs?: Array<{type:string,id:string,version?:string}>,
 *   dependency_path?: string[],
 * }>} publicationFaces
 * @returns {Map<string, Array>} depKey -> 受影响发布分面列表
 */
export function buildReverseDependencyIndex(publicationFaces = []) {
  const index = new Map();
  for (const face of publicationFaces) {
    if (!face || typeof face !== "object") continue;
    const refs = Array.isArray(face.dependency_refs) ? face.dependency_refs : [];
    for (const ref of refs) {
      const k = depKey(ref);
      if (!k) continue;
      if (!index.has(k)) index.set(k, []);
      index.get(k).push({
        publication_revision: face.publication_revision,
        purpose: face.purpose,
        scope: face.scope,
        consumer: face.consumer,
        dependency_path: Array.isArray(face.dependency_path) ? face.dependency_path : [k],
      });
    }
  }
  return index;
}

/**
 * 计算精准失效影响闭包。
 *
 * @param {object} args
 * @param {object} [args.change_event_ref]     变化事件标识
 * @param {object} args.changed_dependency_ref {type,id,version} 变化的上游依赖
 * @param {Map<string,Array>} [args.dependency_index] 反向依赖索引（buildReverseDependencyIndex 产物）
 * @param {string} [args.reason]               失效原因
 * @returns {object} P08 标准输出字段（change_event_ref / changed_dependency_ref /
 *   affected_publication_revisions / affected_purpose_scope_consumers / dependency_paths /
 *   reason / suspension_request / recheck_request / disposition / unknown_dependency）
 */
export function computePreciseInvalidation({
  change_event_ref = null,
  changed_dependency_ref = null,
  dependency_index = new Map(),
  reason = "",
} = {}) {
  const key = depKey(changed_dependency_ref);
  const base = {
    change_event_ref,
    changed_dependency_ref,
    affected_publication_revisions: [],
    affected_purpose_scope_consumers: [],
    dependency_paths: [],
    reason,
    suspension_request: null,
    recheck_request: null,
    disposition: "UNASSESSED",
    unknown_dependency: false,
  };

  if (!key) {
    // 变化依赖无法定位 -> 失败关闭，绝不当作"无依赖"。
    return { ...base, unknown_dependency: true, disposition: "BLOCKED" };
  }

  const faces = (dependency_index instanceof Map && dependency_index.get(key)) || [];
  if (!Array.isArray(faces) || faces.length === 0) {
    // 无可信反向索引命中 -> 涉及不明依赖，失败关闭，不推测性全局清空。
    return { ...base, unknown_dependency: true, disposition: "BLOCKED" };
  }

  const affected_purpose_scope_consumers = faces.map((f) => ({
    publication_revision: f.publication_revision,
    purpose: f.purpose,
    scope: f.scope,
    consumer: f.consumer,
    dependency_path: Array.isArray(f.dependency_path) ? f.dependency_path : [key],
  }));

  const affected_publication_revisions = [
    ...new Set(faces.map((f) => f.publication_revision).filter(Boolean)),
  ];
  const dependency_paths = affected_purpose_scope_consumers.map((f) => f.dependency_path);

  return {
    ...base,
    affected_publication_revisions,
    affected_purpose_scope_consumers,
    dependency_paths,
    suspension_request: {
      action: "suspend_affected_consumption",
      affected_publication_revisions,
      note: "立即阻断受影响分面读取并保留审计；无需等待新的 G5 PASS，不自行改写 Gate 决定",
    },
    recheck_request: {
      action: "request_independent_g5_recheck",
      affected_publication_revisions,
      note: "P08 只计算影响与请求重审；独立 G5 随后追加资格裁决",
    },
    disposition: "BLOCKED",
    unknown_dependency: false,
  };
}

export { depKey };
