// Y04「聚合目录与原机构回溯」在来源准入侧的取得范围结论（D00 第四道工序）。
//
// 边界：
//   * 覆盖结论只由两处真值构成：本次准入已逐项核验的登记/原件，以及刚落库的
//     获取尝试记录。本次运行核到多少就写多少，没核到的一律 unassessed。
//   * 尝试自称 acquired_verified，字节与哈希就必须和库存原件一致；不一致说明
//     取得账与原件对不上，失败关闭，不许用尝试的措辞替字节背书。
//   * 总量（这份 source_version 一共多少页/多少件）本次没有核实，completeness
//     只能是 unknown——不拿单页冒充 partial，更不冒充 complete。
//   * 本模块不写库；写入口仍是 source-discovery-repository.mjs 的
//     recordAcquisitionCoverage。
export const COVERAGE_CONCLUSION_SCHEMA = 'mohen.source-coverage-conclusion.v1';
export const INTAKE_COVERAGE_METHOD = 'D00/Y04:intake_coverage';
export const INTAKE_COVERAGE_METHOD_VERSION = 'v1';

const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

// 准入刚做过的核验是覆盖结论的唯一基础；不复核就写"取到了"等于让工序替环境背书。
function requireIntakeFacts(registration, record) {
  if (!isPlainObject(registration)) throw new Error('COVERAGE_REGISTRATION_REQUIRED');
  if (!isPlainObject(record)) throw new Error('COVERAGE_ORIGINAL_REQUIRED');
  if (record.state !== 'STORED_VERIFIED' || !HEX.test(record.sha256 ?? '') ||
      record.sha256 !== registration.sha256 ||
      record.content_type !== registration.content_type ||
      record.byte_size !== registration.byte_size) {
    throw new Error('COVERAGE_ORIGINAL_NOT_VERIFIED');
  }
  if (!UUID.test(registration.original_id ?? '') ||
      !UUID.test(registration.source_version_id ?? '') ||
      !UUID.test(registration.raw_item_id ?? '')) {
    throw new Error('COVERAGE_REGISTRATION_INVALID');
  }
}

/**
 * 从本次准入的真值 + 本次获取尝试派生一条取得范围结论。
 * @returns {{coverage_scope:object,missing_parts:Array<object>,
 *   completeness_state:'unknown',verified_against:object}}
 */
export function deriveIntakeCoverage({ registration, record, attempt, pageNumber } = {}) {
  requireIntakeFacts(registration, record);
  if (!isPlainObject(attempt)) throw new Error('COVERAGE_ATTEMPT_REQUIRED');
  if (!UUID.test(attempt.attempt_id ?? '') ||
      typeof attempt.result_state !== 'string' || !attempt.result_state) {
    throw new Error('COVERAGE_ATTEMPT_INVALID');
  }
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new Error('COVERAGE_PAGE_INVALID');
  }

  const verified = attempt.result_state === 'acquired_verified';
  let acquired = null;
  const missingParts = [];
  if (verified) {
    // 自称"取得并已核验"就必须对得上库存字节；对不上是取得账在说谎，失败关闭。
    if (attempt.asset_sha256 !== record.sha256 || Number(attempt.byte_size) !== record.byte_size) {
      throw new Error('COVERAGE_ATTEMPT_ASSET_MISMATCH');
    }
    acquired = { pages: [pageNumber], byte_size: record.byte_size, sha256: record.sha256 };
  } else {
    // 本次尝试未取得已核验字节：如实写这一页不是这次尝试拿到的。
    missingParts.push({ part: `page_${pageNumber}_asset`, state: 'not_acquired' });
  }
  // 总量未核实：除本次核到的这一页，其余部分一律未评估。
  missingParts.push({ part: 'other_pages', state: 'unassessed' });

  return {
    coverage_scope: {
      schema: COVERAGE_CONCLUSION_SCHEMA,
      method: `${INTAKE_COVERAGE_METHOD}@${INTAKE_COVERAGE_METHOD_VERSION}`,
      target: 'source_version',
      source_version_id: registration.source_version_id,
      acquired,
      total_extent: 'unknown',
    },
    missing_parts: missingParts,
    // 分母（这份版本总共多少页）本次没有核实，不给 partial/complete。
    completeness_state: 'unknown',
    verified_against: {
      attempt_id: attempt.attempt_id,
      asset_sha256: record.sha256,
      byte_size: record.byte_size,
      matched: verified,
    },
  };
}
