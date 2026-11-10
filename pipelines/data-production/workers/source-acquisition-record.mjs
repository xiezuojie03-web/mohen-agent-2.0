// Y07「合法获取方案与协议路径组合」在来源准入侧的获取账校验（D00 第七道工序）。
//
// 边界：
//   * 获取是 D00 的硬前提：原件既然在库，就必须有"怎么来的"获取账；
//     没有 acquisition 输入即失败关闭，不允许来源不明地躺在库里。
//   * 方法与尝试字段由本模块逐项校验（M#### 方法键、64hex 请求摘要、
//     可解析时间）；自称 acquired_verified 就必须字节与哈希同库存原件一致，
//     不一致即伪造，失败关闭。
//   * candidate_ref/dependency_refs 由 Y05 身份分层派生，不抄调用方——
//     身份必须是本次准入的这一份（与登记/原件逐项一致），否则失败关闭。
//   * 逐动作权利、获取失败码等字段只如实透传，枚举边界由唯一写入口把关。
//   * 本模块不写库；写入口仍是 source-discovery-repository.mjs 的
//     registerAcquisitionMethod / appendAcquisitionAttempt。
import { IDENTITY_STRATIFICATION_SCHEMA } from './source-identity-stratification.mjs';

const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const METHOD_KEY = /^M[0-9]{4}$/;

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const asArray = (value) => (Array.isArray(value) ? value : []);

function requireIntakeFacts(registration, record) {
  if (!isPlainObject(registration)) throw new Error('ACQUISITION_REGISTRATION_REQUIRED');
  if (!isPlainObject(record)) throw new Error('ACQUISITION_ORIGINAL_REQUIRED');
  if (record.state !== 'STORED_VERIFIED' || !HEX.test(record.sha256 ?? '') ||
      record.sha256 !== registration.sha256 ||
      record.content_type !== registration.content_type ||
      record.byte_size !== registration.byte_size) {
    throw new Error('ACQUISITION_ORIGINAL_NOT_VERIFIED');
  }
  if (!UUID.test(registration.original_id ?? '') ||
      !UUID.test(registration.source_version_id ?? '') ||
      !UUID.test(registration.raw_item_id ?? '')) {
    throw new Error('ACQUISITION_REGISTRATION_INVALID');
  }
}

// 身份分层必须是本次准入的这一份：数字资产层与版本层逐项对上登记/原件，
// 否则就是拿别的身份给这次获取背书。
function requireMatchingIdentity(identity, registration, record) {
  if (!isPlainObject(identity) || identity.schema !== IDENTITY_STRATIFICATION_SCHEMA ||
      !Array.isArray(identity.layers)) {
    throw new Error('ACQUISITION_IDENTITY_REQUIRED');
  }
  const layerOf = (name) => identity.layers.find((layer) => layer?.layer === name);
  const asset = layerOf('digital_asset')?.value;
  const version = layerOf('version')?.value;
  if (asset?.raw_item_id !== registration.raw_item_id || asset?.sha256 !== record.sha256 ||
      version?.source_version_id !== registration.source_version_id) {
    throw new Error('ACQUISITION_IDENTITY_MISMATCH');
  }
  return identity;
}

const parseTime = (value, code) => {
  const time = value instanceof Date ? value : new Date(value ?? NaN);
  if (Number.isNaN(time.getTime())) throw new Error(code);
  return time;
};

/**
 * 校验并规范化一次 D00 获取账。
 * @returns {{method:object,attempt:object,candidateRef:object,dependencyRefs:Array<object>}}
 */
export function deriveIntakeAcquisitionRecord({ registration, record, identity, acquisition } = {}) {
  requireIntakeFacts(registration, record);
  const candidateRef = requireMatchingIdentity(identity, registration, record);
  if (!isPlainObject(acquisition)) throw new Error('ACQUISITION_REQUIRED');
  const method = acquisition.method;
  if (!isPlainObject(method)) throw new Error('ACQUISITION_METHOD_REQUIRED');
  if (!METHOD_KEY.test(method.method_key ?? '')) throw new Error('ACQUISITION_METHOD_KEY_INVALID');
  const methodVersion = nonEmpty(method.method_version);
  if (!methodVersion) throw new Error('ACQUISITION_METHOD_VERSION_REQUIRED');
  const accessMode = nonEmpty(method.access_mode);
  if (!accessMode) throw new Error('ACQUISITION_ACCESS_MODE_REQUIRED');

  const attempt = acquisition.attempt;
  if (!isPlainObject(attempt)) throw new Error('ACQUISITION_ATTEMPT_REQUIRED');
  const resultState = nonEmpty(attempt.result_state);
  if (!resultState) throw new Error('ACQUISITION_ATTEMPT_STATE_REQUIRED');
  if (!HEX.test(attempt.request_digest ?? '')) throw new Error('ACQUISITION_REQUEST_DIGEST_INVALID');
  const startedAt = parseTime(attempt.started_at, 'ACQUISITION_STARTED_AT_INVALID');
  const finishedAt = attempt.finished_at == null ? null
    : parseTime(attempt.finished_at, 'ACQUISITION_FINISHED_AT_INVALID');

  let byteSize = attempt.byte_size ?? null;
  let assetSha256 = attempt.asset_sha256 ?? null;
  if (resultState === 'acquired_verified') {
    // 自称"取得并已核验"就必须对得上库存字节；对不上是取得账在说谎。
    if (assetSha256 !== record.sha256 || Number(byteSize) !== record.byte_size) {
      throw new Error('ACQUISITION_ASSET_MISMATCH');
    }
    byteSize = record.byte_size;
    assetSha256 = record.sha256;
  }

  return {
    method: {
      methodKey: method.method_key, methodVersion,
      resourceScope: isPlainObject(method.resource_scope) ? method.resource_scope : {},
      accessMode,
      preconditions: asArray(method.preconditions),
      steps: asArray(method.steps),
      successCriteria: asArray(method.success_criteria),
      failureModes: asArray(method.failure_modes),
      alternatives: asArray(method.alternatives),
      ...(method.method_state != null ? { methodState: method.method_state } : {}),
      ...(method.recommended != null ? { recommended: method.recommended === true } : {}),
    },
    attempt: {
      executionEnvironment: attempt.execution_environment ?? null,
      requestDigest: attempt.request_digest,
      pagination: attempt.pagination ?? null,
      startedAt, finishedAt,
      resultState,
      failureCode: attempt.failure_code ?? null,
      failureCertainty: attempt.failure_certainty ?? null,
      acquiredExtent: attempt.acquired_extent ?? null,
      byteSize, assetSha256,
      sourceLocator: attempt.source_locator ?? registration.original_locator ?? null,
      rightsActions: attempt.rights_actions ?? null,
      accessRestrictions: attempt.access_restrictions ?? null,
      recoveryCondition: attempt.recovery_condition ?? null,
      cost: attempt.cost ?? null,
      correctionOf: attempt.correction_of ?? null,
      alternatives: asArray(attempt.alternatives),
    },
    // 候选引用就是 Y05 身份分层本身；依赖引用只列库里真实存在的两个实体。
    candidateRef,
    dependencyRefs: [
      { kind: 'source_version', id: registration.source_version_id, layer: 'version' },
      { kind: 'raw_item', id: registration.raw_item_id, layer: 'digital_asset' },
    ],
  };
}
