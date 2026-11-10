// Y08「完整性鉴定与取得回执」在来源准入侧的回执派生（D00 第八道工序）。
//
// 边界：
//   * 回执是对"这一页原件已在库、来路在账、身份已分层"的存证小结，
//     不是资格裁决：核查结论是 needs_owner 就原样带回执，绝不升级为可采纳；
//     签署 G0 是独立 Gate 的事，回执不构成任何资格。
//   * 回执只从本次准入已核验真值与刚落库的工序记录派生：库存回读哈希、
//     登记一致性、Y05 身份分层、Y07 获取尝试（acquired_verified 且字节一致）、
//     Y08 覆盖结论（verified_against.matched）、Y03 核查结论，缺任一项即失败关闭。
//   * 本模块不写库；回执随 D00 候选输出与 G0 evidenceRefs 存证，
//     落库仍走既有唯一写入口。
import { IDENTITY_STRATIFICATION_SCHEMA } from './source-identity-stratification.mjs';

const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export const ASSET_RECEIPT_SCHEMA = 'mohen.validated-asset-receipt.v1';
export const INTAKE_RECEIPT_METHOD = 'D00/Y08:intake_receipt';
export const INTAKE_RECEIPT_METHOD_VERSION = 'v1';

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * 派生本次准入的取得回执。
 * @returns {{receipt:object,evidenceRefs:Array<{kind:string,id:string}>}}
 */
export function deriveValidatedAssetReceipt({ registration, record, identity,
  attempt, coverage, verification, needId, catalogEntryId, pageNumber } = {}) {
  // 1) 库存回读与登记一致：这是"原件确实在库且就是登记那份"的底座。
  if (!isPlainObject(registration)) throw new Error('RECEIPT_REGISTRATION_REQUIRED');
  if (!isPlainObject(record) || record.state !== 'STORED_VERIFIED' ||
      !HEX.test(record.sha256 ?? '') || record.sha256 !== registration.sha256 ||
      record.byte_size !== registration.byte_size ||
      record.content_type !== registration.content_type) {
    throw new Error('RECEIPT_ORIGINAL_NOT_VERIFIED');
  }
  if (!UUID.test(registration.original_id ?? '') ||
      !UUID.test(registration.source_version_id ?? '') ||
      !UUID.test(registration.raw_item_id ?? '')) {
    throw new Error('RECEIPT_REGISTRATION_INVALID');
  }
  // 2) 身份分层必须是本次准入的这一份（与 Y07 同一条判据）。
  if (!isPlainObject(identity) || identity.schema !== IDENTITY_STRATIFICATION_SCHEMA ||
      !Array.isArray(identity.layers)) {
    throw new Error('RECEIPT_IDENTITY_REQUIRED');
  }
  const layerOf = (name) => identity.layers.find((layer) => layer?.layer === name);
  if (layerOf('digital_asset')?.value?.sha256 !== record.sha256 ||
      layerOf('version')?.value?.source_version_id !== registration.source_version_id) {
    throw new Error('RECEIPT_IDENTITY_MISMATCH');
  }
  // 3) 获取尝试必须已取得并核验，且字节就是库存原件。
  if (!isPlainObject(attempt) || !UUID.test(attempt.attempt_id ?? '')) {
    throw new Error('RECEIPT_ATTEMPT_REQUIRED');
  }
  if (attempt.resultState !== 'acquired_verified' ||
      attempt.assetSha256 !== record.sha256 || Number(attempt.byteSize) !== record.byte_size) {
    throw new Error('RECEIPT_ATTEMPT_NOT_VERIFIED');
  }
  // 4) 覆盖结论必须核对了本次取得与库存一致。
  if (!isPlainObject(coverage) || !UUID.test(coverage.coverage_id ?? '')) {
    throw new Error('RECEIPT_COVERAGE_REQUIRED');
  }
  if (coverage.verifiedAgainst?.matched !== true) {
    throw new Error('RECEIPT_COVERAGE_UNVERIFIED');
  }
  // 5) 核查结论原样带回执（needs_owner 不升级）；工序记录锚点必须齐全。
  if (!isPlainObject(verification) || !UUID.test(verification.verification_id ?? '') ||
      typeof verification.verdict !== 'string' || !verification.verdict) {
    throw new Error('RECEIPT_VERIFICATION_REQUIRED');
  }
  if (!UUID.test(needId ?? '') || !UUID.test(catalogEntryId ?? '')) {
    throw new Error('RECEIPT_CHAIN_REFS_REQUIRED');
  }

  const receipt = {
    schema: ASSET_RECEIPT_SCHEMA,
    method: `${INTAKE_RECEIPT_METHOD}@${INTAKE_RECEIPT_METHOD_VERSION}`,
    original_id: registration.original_id,
    source_version_id: registration.source_version_id,
    raw_item_id: registration.raw_item_id,
    page_number: Number.isSafeInteger(pageNumber) ? pageNumber : null,
    sha256: record.sha256,
    byte_size: record.byte_size,
    content_type: record.content_type,
    // 回执依据：每一条都对应一道已落库/已存证的工序，可逐条回读。
    basis: [
      'storage_readback_sha256',
      'registration_consistency',
      'identity_stratification',
      'acquisition_attempt_verified',
      'coverage_conclusion',
      'candidate_verification',
    ],
    verification_verdict: verification.verdict,
    // 核查没判的就如实未决：回执不替独立 Gate 说话。
    qualification: 'UNASSESSED',
  };
  const evidenceRefs = [
    { kind: 'source_need', id: needId },
    { kind: 'resource_catalog', id: catalogEntryId },
    { kind: 'candidate_verification', id: verification.verification_id },
    { kind: 'acquisition_attempt', id: attempt.attempt_id },
    { kind: 'acquisition_coverage', id: coverage.coverage_id },
  ];
  // 若这次覆盖结论用了整卷分母，整卷结论本身也要作为存证一起被引用，
  // 否则"分母是 73"这句话就无法在 Gate 侧回指到它的出处。
  const volumeCoverageId = coverage.verifiedAgainst?.volume_coverage_id;
  if (typeof volumeCoverageId === 'string' && UUID.test(volumeCoverageId) && volumeCoverageId !== coverage.coverage_id) {
    evidenceRefs.push({ kind: 'acquisition_coverage', id: volumeCoverageId });
  }
  return { receipt, evidenceRefs };
}
