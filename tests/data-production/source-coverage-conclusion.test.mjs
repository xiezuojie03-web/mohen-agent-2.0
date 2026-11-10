import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveIntakeCoverage, COVERAGE_CONCLUSION_SCHEMA,
  INTAKE_COVERAGE_METHOD, INTAKE_COVERAGE_METHOD_VERSION }
  from '../../pipelines/data-production/workers/source-coverage-conclusion.mjs';

// Y04 的取得范围结论只从本次准入真值 + 刚落库的获取尝试派生；
// 核到的就写核到，没核到的写 unassessed，总量未核实不冒充 partial/complete。
const SHA = 'a'.repeat(64);
const ID = '11111111-1111-4111-8111-111111111111';
const ATTEMPT_ID = '66666666-6666-4666-8666-666666666666';
const registration = (overrides = {}) => ({
  original_id: ID,
  source_id: '22222222-2222-4222-8222-222222222222',
  source_version_id: '33333333-3333-4333-8333-333333333333',
  raw_item_id: '44444444-4444-4444-8444-444444444444',
  sha256: SHA, byte_size: 8, content_type: 'image/jpeg',
  provider: '国立公文书馆（NAJ)', title: '松江府志7',
  original_locator: { item: 4252790, catalog_no: 'NAJDA-292-0017' },
  ...overrides,
});
const record = (overrides = {}) => ({
  state: 'STORED_VERIFIED', sha256: SHA, byte_size: 8, content_type: 'image/jpeg', ...overrides,
});
const attempt = (overrides = {}) => ({
  attempt_id: ATTEMPT_ID, result_state: 'acquired_verified',
  asset_sha256: SHA, byte_size: 8, ...overrides,
});

test('Y04 覆盖：取得已核验且字节一致时，本次只核到这一页，其余页如实未评估', () => {
  const result = deriveIntakeCoverage({
    registration: registration(), record: record(), attempt: attempt(), pageNumber: 35 });
  assert.equal(result.completeness_state, 'unknown');
  assert.equal(result.coverage_scope.schema, COVERAGE_CONCLUSION_SCHEMA);
  assert.equal(result.coverage_scope.method, `${INTAKE_COVERAGE_METHOD}@${INTAKE_COVERAGE_METHOD_VERSION}`);
  assert.equal(result.coverage_scope.target, 'source_version');
  assert.equal(result.coverage_scope.source_version_id, registration().source_version_id);
  assert.deepEqual(result.coverage_scope.acquired, { pages: [35], byte_size: 8, sha256: SHA });
  assert.equal(result.coverage_scope.total_extent, 'unknown');
  assert.deepEqual(result.missing_parts, [{ part: 'other_pages', state: 'unassessed' }]);
  assert.deepEqual(result.verified_against, {
    attempt_id: ATTEMPT_ID, asset_sha256: SHA, byte_size: 8, matched: true });
});

test('Y04 覆盖：尝试自称取得已核验但字节对不上，失败关闭不替取得账背书', () => {
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt({ asset_sha256: 'b'.repeat(64) }), pageNumber: 35 }),
    /COVERAGE_ATTEMPT_ASSET_MISMATCH/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt({ byte_size: 9 }), pageNumber: 35 }),
    /COVERAGE_ATTEMPT_ASSET_MISMATCH/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt({ asset_sha256: null }), pageNumber: 35 }),
    /COVERAGE_ATTEMPT_ASSET_MISMATCH/);
});

test('Y04 覆盖：尝试未取得已核验字节时，如实写这一页不是这次拿到的', () => {
  const result = deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt({ result_state: 'metadata_only', asset_sha256: null, byte_size: null }),
    pageNumber: 35 });
  assert.equal(result.coverage_scope.acquired, null);
  assert.deepEqual(result.missing_parts, [
    { part: 'page_35_asset', state: 'not_acquired' },
    { part: 'other_pages', state: 'unassessed' },
  ]);
  assert.equal(result.completeness_state, 'unknown');
  assert.equal(result.verified_against.matched, false);
});

test('Y04 覆盖：没有尝试或尝试身份不全就失败关闭，不凭空写覆盖账', () => {
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(), pageNumber: 35 }),
    /COVERAGE_ATTEMPT_REQUIRED/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt({ attempt_id: 'not-a-uuid' }), pageNumber: 35 }), /COVERAGE_ATTEMPT_INVALID/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt({ result_state: '' }), pageNumber: 35 }), /COVERAGE_ATTEMPT_INVALID/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 0 }), /COVERAGE_PAGE_INVALID/);
});

test('Y04 覆盖：准入真值不复核就失败关闭，不在未核的字节上给结论', () => {
  assert.throws(() => deriveIntakeCoverage({}), /COVERAGE_REGISTRATION_REQUIRED/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration() }),
    /COVERAGE_ORIGINAL_REQUIRED/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(),
    record: record({ state: 'STORED' }), attempt: attempt(), pageNumber: 35 }),
    /COVERAGE_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(),
    record: record({ sha256: 'c'.repeat(64) }), attempt: attempt(), pageNumber: 35 }),
    /COVERAGE_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(),
    record: record({ byte_size: 9 }), attempt: attempt(), pageNumber: 35 }),
    /COVERAGE_ORIGINAL_NOT_VERIFIED/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration({ source_version_id: '' }),
    record: record(), attempt: attempt(), pageNumber: 35 }), /COVERAGE_REGISTRATION_INVALID/);
});

// 整卷分母：只有"已落库、分母来自 manifest、页码在已取得清单里、整卷摘要齐全"的结论
// 才允许把 Y04 从 unknown 抬到 partial/complete；缺一即失败关闭或退回 unknown。
const VOLUME_COVERAGE_ID = '77777777-7777-4777-8777-777777777777';
const volume = (overrides = {}) => ({
  coverage_id: VOLUME_COVERAGE_ID,
  source_id: registration().source_id,
  completeness_state: 'complete',
  denominator: { kind: 'iiif_manifest_canvas_count', total_pages: 3, manifest_sha256: 'd'.repeat(64) },
  total_pages: 3,
  acquired_pages: [1, 2, 3],
  volume_digest: 'e'.repeat(64),
  // 整卷里每一页的字节摘要：第 2 页正是本次准入的这一份。
  pages: [{ page: 1, sha256: '1'.repeat(64), byte_size: 7 },
    { page: 2, sha256: SHA, byte_size: 8 },
    { page: 3, sha256: '3'.repeat(64), byte_size: 9 }],
  ...overrides,
});

test('Y04 覆盖：整卷取满时用 manifest 总页数作分母，写 complete 并回指整卷结论', () => {
  const result = deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume() });
  assert.equal(result.completeness_state, 'complete');
  assert.equal(result.coverage_scope.target, 'source_volume');
  assert.equal(result.coverage_scope.total_extent, 3);
  assert.deepEqual(result.coverage_scope.volume.acquired_pages, [1, 2, 3]);
  assert.equal(result.coverage_scope.volume.denominator.kind, 'iiif_manifest_canvas_count');
  assert.deepEqual(result.missing_parts, []);
  assert.equal(result.verified_against.volume_coverage_id, VOLUME_COVERAGE_ID);
  assert.equal(result.verified_against.total_pages, 3);
  assert.equal(result.verified_against.acquired_pages, 3);
});

test('Y04 覆盖：整卷缺页时如实 partial 并逐页列出缺的是哪几页', () => {
  const result = deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume({ acquired_pages: [1, 2], completeness_state: 'partial' }) });
  assert.equal(result.completeness_state, 'partial');
  assert.deepEqual(result.missing_parts, [{ part: 'page_3_asset', state: 'not_acquired' }]);
  assert.equal(result.coverage_scope.total_extent, 3);
});

test('Y04 覆盖：整卷结论缺分母/缺摘要/页码不在清单里一律失败关闭', () => {
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume({ coverage_id: 'nope' }) }),
    /COVERAGE_VOLUME_ID_INVALID/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume({ total_pages: 0, denominator: {} }) }),
    /COVERAGE_VOLUME_DENOMINATOR_INVALID/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume({ acquired_pages: [1, 9] }) }),
    /COVERAGE_VOLUME_PAGES_INVALID/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume({ acquired_pages: [1, 3] }) }),
    /COVERAGE_VOLUME_PAGE_NOT_ACQUIRED/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume({ volume_digest: null }) }),
    /COVERAGE_VOLUME_DIGEST_REQUIRED/);
  // 页码在清单里，但整卷那一页的字节不是手上的这份 → 不许拿别的数字件给这一页背书。
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2,
    volume: volume({ pages: [{ page: 1, sha256: '1'.repeat(64), byte_size: 7 },
      { page: 2, sha256: '2'.repeat(64), byte_size: 8 }, { page: 3, sha256: '3'.repeat(64), byte_size: 9 }] }) }),
    /COVERAGE_VOLUME_PAGE_BYTES_MISMATCH/);
  assert.throws(() => deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt(), pageNumber: 2, volume: volume({ pages: [] }) }),
    /COVERAGE_VOLUME_PAGE_DIGEST_REQUIRED/);
});

test('Y04 覆盖：整卷取满但本次字节未核验时，不得写 complete', () => {
  const result = deriveIntakeCoverage({ registration: registration(), record: record(),
    attempt: attempt({ result_state: 'metadata_only', asset_sha256: null, byte_size: null }),
    pageNumber: 2, volume: volume() });
  assert.equal(result.completeness_state, 'partial');
  assert.deepEqual(result.missing_parts, [{ part: 'page_2_asset', state: 'not_acquired' }]);
});
