// Y03「时空异名与跨语言检索扩展」在来源准入侧的候选核查（D00 第三道工序）。
//
// 边界：
//   * 核查项只由两处真值构成：本次准入已逐项核验的登记/原件，以及调用方
//     确实给出的检索扩展簇。本次运行没有读到的东西一律写 unassessed，
//     不补默认、不推断"应该没问题"。
//   * 扩展簇每一条必须能回指词源（source_ref）、适用时代（applicable_era）、
//     歧义（ambiguity）与转换理由（rationale）；缺任一项即失败关闭，不替研究者编词源。
//   * 时空异名两维（历史地名/旧辖属、时代纪年）没有词源依据就是未评估，
//     此时结论只能是 needs_owner——绝不给"看起来能用"的 admissible。
//   * 词语扩展不等于实体合并：本模块只登记词形与歧义，历史地名/实体真值归 D03，
//     不在此生产 W 类真值，也不拿今天行政区边界套古代地名。
//   * 权利只如实登记逐动作现状（九动作，缺失即 unknown），不在本工序裁决——
//     逐动作许可另有唯一判定点与独立 G0。
//   * 本模块不写库；写入口仍是 source-discovery-repository.mjs 的
//     recordCandidateVerification。
import { normalizeRightsSnapshot } from '../../../packages/data-access/src/rights-actions.mjs';

export const CANDIDATE_VERIFICATION_SCHEMA = 'mohen.source-candidate-verification.v1';
export const INTAKE_VERIFICATION_METHOD = 'D00/Y03:intake_candidate_check';
export const INTAKE_VERIFICATION_METHOD_VERSION = 'v1';

/** Y03 规范的扩展维度：主题、人物、历史地名/旧辖属、水系、时代纪年、语言、文类、版本。 */
export const EXPANSION_DIMENSIONS = Object.freeze([
  'topic', 'person', 'place_name', 'water_system', 'era', 'language', 'genre', 'version',
]);

/** Y03 存在的理由就是时空与跨语言低召回：这两维没有词源依据即视为未评估。 */
export const REQUIRED_EXPANSION_DIMENSIONS = Object.freeze(['place_name', 'era']);

const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const nonEmpty = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

// 准入刚做过的核验是这批核查项的唯一来源；不复核就写"身份一致"等于让工序替环境背书。
function requireIntakeFacts(registration, record) {
  if (!isPlainObject(registration)) throw new Error('CANDIDATE_VERIFICATION_REGISTRATION_REQUIRED');
  if (!isPlainObject(record)) throw new Error('CANDIDATE_VERIFICATION_ORIGINAL_REQUIRED');
  if (!nonEmpty(registration.provider) || !nonEmpty(registration.title)) {
    throw new Error('CANDIDATE_VERIFICATION_REGISTRATION_IDENTITY_REQUIRED');
  }
  if (record.state !== 'STORED_VERIFIED' || !HEX.test(record.sha256 ?? '') ||
      record.sha256 !== registration.sha256 ||
      record.content_type !== registration.content_type ||
      record.byte_size !== registration.byte_size) {
    throw new Error('CANDIDATE_VERIFICATION_ORIGINAL_NOT_VERIFIED');
  }
  if (!UUID.test(registration.original_id ?? '') ||
      !UUID.test(registration.source_version_id ?? '') ||
      !UUID.test(registration.raw_item_id ?? '')) {
    throw new Error('CANDIDATE_VERIFICATION_REGISTRATION_INVALID');
  }
}

function normalizeExpansions(expansions) {
  if (expansions == null) return [];
  if (!Array.isArray(expansions)) throw new Error('CANDIDATE_VERIFICATION_EXPANSIONS_INVALID');
  return expansions.map((item, index) => {
    if (!isPlainObject(item)) throw new Error(`CANDIDATE_VERIFICATION_EXPANSION_INVALID:${index}`);
    const dimension = nonEmpty(item.dimension);
    if (!EXPANSION_DIMENSIONS.includes(dimension)) {
      throw new Error(`CANDIDATE_VERIFICATION_EXPANSION_DIMENSION_INVALID:${index}`);
    }
    const fields = {
      term: nonEmpty(item.term),
      source_ref: nonEmpty(item.source_ref),
      applicable_era: nonEmpty(item.applicable_era),
      ambiguity: nonEmpty(item.ambiguity),
      rationale: nonEmpty(item.rationale),
    };
    for (const [key, value] of Object.entries(fields)) {
      if (!value) throw new Error(`CANDIDATE_VERIFICATION_EXPANSION_INCOMPLETE:${index}:${key}`);
    }
    return { dimension, ...fields };
  });
}

/**
 * 从本次准入的真值派生一条候选核查结论。
 * @returns {{checks:object,verdict:'admissible'|'needs_owner',reasonCode:string,
 *   methodKey:string,methodVersion:string}}
 */
export function deriveIntakeCandidateVerification({ registration, record, expansions } = {}) {
  requireIntakeFacts(registration, record);
  const items = normalizeExpansions(expansions);
  const rights = normalizeRightsSnapshot(registration.rights);
  const locator = isPlainObject(registration.original_locator) ? registration.original_locator : {};

  const covered = [...new Set(items.map((item) => item.dimension))];
  const unresolved = REQUIRED_EXPANSION_DIMENSIONS.filter((dimension) => !covered.includes(dimension));
  const declaredActions = Object.keys(rights.actions).filter((action) => rights.actions[action] !== 'unknown');
  const unknownActions = Object.keys(rights.actions).filter((action) => rights.actions[action] === 'unknown');
  const deniedActions = Object.keys(rights.actions).filter((action) => rights.actions[action] === 'denied');

  const checks = {
    schema: CANDIDATE_VERIFICATION_SCHEMA,
    method: `${INTAKE_VERIFICATION_METHOD}@${INTAKE_VERIFICATION_METHOD_VERSION}`,
    // 已核：准入当场比对过的身份与字节，逐项留值，便于回读复核。
    identity: {
      state_verified: true,
      original_id: registration.original_id,
      source_version_id: registration.source_version_id,
      raw_item_id: registration.raw_item_id,
      sha256: registration.sha256,
      byte_size: registration.byte_size,
      content_type: registration.content_type,
    },
    locator: { catalog_no: nonEmpty(locator.catalog_no) ? 'present' : 'absent' },
    provenance: { status: nonEmpty(registration.provenance_status) ?? 'unknown' },
    carrier: { content_availability: nonEmpty(registration.content_availability) ?? 'unknown' },
    // 未核 / 已核的扩展维度都写明，结论由 unresolved 决定，不由措辞修饰。
    named_expansions: { provided: items.length, dimensions: covered, unresolved, items },
    language: { state: covered.includes('language') ? 'declared' : 'unassessed' },
    // 权利只登记现状：多少动作有值、多少 unknown、有无显式 denied。
    rights: { declared_actions: declaredActions, unknown_actions: unknownActions,
      denied_actions: deniedActions, issues: rights.issues.length },
    entity_truth: 'out_of_scope:D03',
  };

  const admissible = unresolved.length === 0;
  return {
    checks,
    verdict: admissible ? 'admissible' : 'needs_owner',
    reasonCode: admissible ? 'Y03_EXPANSION_SOURCED' : `Y03_EXPANSION_UNASSESSED:${unresolved.join(',')}`,
    methodKey: INTAKE_VERIFICATION_METHOD,
    methodVersion: INTAKE_VERIFICATION_METHOD_VERSION,
  };
}
