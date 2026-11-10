// Y06「资源价值互补与取得优先级评估」在来源准入侧的处置结论（D00 第六道工序）。
//
// 边界：
//   * 处置只由本次准入真值与 Y03 刚落库的核查结论决定：admissible→selected、
//     needs_owner→deferred、rejected→excluded。绝不把"还没 Owner 判定"的来源
//     放宽成 selected——库内触发器同样把关（selected 需同候选已有 admissible 核查）。
//   * 五维标准（authority/relevance/coverage/freshness/rights）各带依据；
//     本次准入没评估的维度如实 unknown，不为好看补值。
//   * rationale 必须引用 Y03 的 reasonCode，处置理由可回读到核查结论。
//   * 本模块不写库；写入口仍是 source-discovery-repository.mjs 的
//     recordPriorityAssessment。
import { normalizeRightsSnapshot } from '../../../packages/data-access/src/rights-actions.mjs';

export const PRIORITY_ASSESSMENT_SCHEMA = 'mohen.source-priority-assessment.v1';
export const INTAKE_PRIORITY_METHOD = 'D00/Y06:intake_priority';
export const INTAKE_PRIORITY_METHOD_VERSION = 'v1';

const VERDICT_TO_DECISION = Object.freeze({
  admissible: 'selected',
  needs_owner: 'deferred',
  rejected: 'excluded',
});

const nonEmpty = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * 从本次准入的真值 + Y03 核查结论派生一条取得优先级处置。
 * @returns {{criteria:object,decision:'selected'|'deferred'|'excluded',rationale:string,
 *   methodKey:string,methodVersion:string}}
 */
export function deriveIntakePriority({ registration, verification } = {}) {
  if (!isPlainObject(registration)) throw new Error('PRIORITY_REGISTRATION_REQUIRED');
  if (!nonEmpty(registration.provider)) throw new Error('PRIORITY_PROVIDER_REQUIRED');
  if (!isPlainObject(verification)) throw new Error('PRIORITY_VERIFICATION_REQUIRED');
  const verdict = nonEmpty(verification.verdict);
  const decision = verdict ? VERDICT_TO_DECISION[verdict] : undefined;
  if (!decision) throw new Error('PRIORITY_VERIFICATION_VERDICT_INVALID');
  const reasonCode = nonEmpty(verification.reasonCode);
  if (!reasonCode) throw new Error('PRIORITY_VERIFICATION_REASON_REQUIRED');

  const rights = normalizeRightsSnapshot(registration.rights);
  const checks = isPlainObject(verification.checks) ? verification.checks : {};
  const expansions = isPlainObject(checks.named_expansions) ? checks.named_expansions : {};
  const unresolved = Array.isArray(expansions.unresolved) ? expansions.unresolved : [];

  // 五维各带依据；本次准入没评估的维度如实 unknown。
  const criteria = {
    schema: PRIORITY_ASSESSMENT_SCHEMA,
    method: `${INTAKE_PRIORITY_METHOD}@${INTAKE_PRIORITY_METHOD_VERSION}`,
    authority: { state: 'known', evidence: ['registration.provider'],
      note: `提供方身份已确认：${registration.provider.trim()}；内容权威评级本次未评估` },
    // 与研究意图的相关性是研究判断，准入只登记了意图，没做相关性强弱评估。
    relevance: { state: 'unknown', evidence: ['not_assessed:this_intake'] },
    // 检索扩展的覆盖由 Y03 核查；来源自身内容的覆盖（多少卷/页相关）本次未评估。
    coverage: { state: 'unknown', evidence: ['not_assessed:this_intake'],
      ...(unresolved.length > 0 ? { note: `Y03 扩展维度未评估：${unresolved.join(',')}` } : {}) },
    freshness: { state: 'unknown', evidence: ['not_assessed:this_intake'] },
    rights: { state: 'known', evidence: ['registration.rights'],
      declared_actions: Object.keys(rights.actions).filter((a) => rights.actions[a] !== 'unknown'),
      unknown_actions: Object.keys(rights.actions).filter((a) => rights.actions[a] === 'unknown'),
      denied_actions: Object.keys(rights.actions).filter((a) => rights.actions[a] === 'denied') },
  };

  return {
    criteria,
    decision,
    rationale: `Y03 核查结论 ${verdict}（${reasonCode}）：按准入处置规则 `
      + `${verdict}→${decision}${decision === 'deferred' ? '，等 Owner 判定，不放宽为 selected' : ''}。`,
    methodKey: INTAKE_PRIORITY_METHOD,
    methodVersion: INTAKE_PRIORITY_METHOD_VERSION,
  };
}
