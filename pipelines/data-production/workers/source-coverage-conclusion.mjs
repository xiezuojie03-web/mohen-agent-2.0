// Y08「来源资产完整性与取得证据鉴定」在来源准入侧的取得范围结论（D00 第八道工序）。
// 规范原文（Y01—Y08 V1.1）：Y08 输出 ValidatedAssetReceipt、extent/missing_parts、rights_snapshot、
// AttemptRef，验收「已取得范围有明确分母或标未知」，反例「缺页称全件」。因此"取得多少、还缺什么"
// 属 Y08；Y04 的产出是 OriginalProviderTrace 与原机构回溯链，不是范围结论（见 source-provider-trace.mjs）。
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
export const INTAKE_COVERAGE_METHOD = 'D00/Y08:intake_coverage';
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
 *
 * `volume` 是"本来源最近一次整卷取件"的已落库结论（可缺省）。给出时，分母改用
 * manifest canvas 总数这个真实数字，并逐个列出未取得的页；没给出时仍如实写
 * unknown——分母不能靠页数猜，只能用已核实的整卷结论。
 * @returns {{coverage_scope:object,missing_parts:Array<object>,
 *   completeness_state:'unknown'|'partial'|'complete',verified_against:object}}
 */
export function deriveIntakeCoverage({ registration, record, attempt, pageNumber, volume } = {}) {
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

  if (volume != null) {
    const scope = requireVolumeFacts(volume, pageNumber, verified, record);
    return {
      coverage_scope: {
        schema: COVERAGE_CONCLUSION_SCHEMA,
        method: `${INTAKE_COVERAGE_METHOD}@${INTAKE_COVERAGE_METHOD_VERSION}`,
        target: scope.target,
        source_version_id: registration.source_version_id,
        source_id: volume.source_id ?? null,
        acquired,
        volume: {
          coverage_id: volume.coverage_id,
          acquired_pages: scope.acquiredPages,
          total_pages: scope.total,
          denominator: volume.denominator,
          volume_digest: volume.volume_digest,
          page_in_volume: pageNumber,
        },
        total_extent: scope.total,
      },
      missing_parts: [...scope.missingParts, ...missingParts],
      completeness_state: scope.completeness,
      verified_against: {
        attempt_id: attempt.attempt_id,
        asset_sha256: record.sha256,
        byte_size: record.byte_size,
        matched: verified,
        volume_coverage_id: volume.coverage_id,
        volume_digest: volume.volume_digest ?? null,
        acquired_pages: scope.acquiredPages.length,
        total_pages: scope.total,
      },
    };
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

// 整卷结论必须自带可核的分母、页清单与摘要；给不全就不许用它把覆盖抬成 partial/complete。
function requireVolumeFacts(volume, pageNumber, verified, record) {
  if (!UUID.test(volume.coverage_id ?? '')) throw new Error('COVERAGE_VOLUME_ID_INVALID');
  const total = Number(volume.total_pages ?? volume.denominator?.total_pages);
  if (!Number.isSafeInteger(total) || total < 1) throw new Error('COVERAGE_VOLUME_DENOMINATOR_INVALID');
  const pages = Array.isArray(volume.acquired_pages) ? volume.acquired_pages.map(Number) : null;
  if (!pages || pages.length === 0 || pages.some((n) => !Number.isSafeInteger(n) || n < 1 || n > total)) {
    throw new Error('COVERAGE_VOLUME_PAGES_INVALID');
  }
  if (!pages.includes(pageNumber)) {
    // 手上这一页不在整卷已取得清单里，说明整卷结论与本次原件不是同一份东西，失败关闭。
    throw new Error('COVERAGE_VOLUME_PAGE_NOT_ACQUIRED');
  }
  if (!HEX.test(volume.volume_digest ?? '')) throw new Error('COVERAGE_VOLUME_DIGEST_REQUIRED');
  // 页码对得上还不够：整卷里那一页必须是**同一份字节**，否则就是拿别的数字件给这一页背书。
  const volumePages = Array.isArray(volume.pages) ? volume.pages : null;
  if (!volumePages) throw new Error('COVERAGE_VOLUME_PAGE_DIGEST_REQUIRED');
  const pageEntry = volumePages.find((item) => Number(item?.page) === pageNumber);
  if (!pageEntry || !HEX.test(pageEntry.sha256 ?? '')) throw new Error('COVERAGE_VOLUME_PAGE_DIGEST_REQUIRED');
  if (pageEntry.sha256 !== record.sha256 || Number(pageEntry.byte_size) !== record.byte_size) {
    throw new Error('COVERAGE_VOLUME_PAGE_BYTES_MISMATCH');
  }
  const acquiredPages = [...new Set(pages)].sort((a, b) => a - b);
  const missingParts = [];
  for (let n = 1; n <= total; n += 1) {
    if (!acquiredPages.includes(n)) missingParts.push({ part: `page_${n}_asset`, state: 'not_acquired' });
  }
  // 缺页称全件是规范明令禁止的反例：只有取满且本次字节也核过，才配写 complete。
  const full = acquiredPages.length === total && verified && missingParts.length === 0;
  return {
    target: 'source_volume', total, acquiredPages, missingParts,
    completeness: full ? 'complete' : 'partial',
  };
}
