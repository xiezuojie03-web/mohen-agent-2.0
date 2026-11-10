import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveOriginalProviderTrace, PROVIDER_TRACE_SCHEMA,
  INTAKE_PROVIDER_TRACE_METHOD, INTAKE_PROVIDER_TRACE_METHOD_VERSION,
} from '../../pipelines/data-production/workers/source-provider-trace.mjs';

// Y04 的产出是 OriginalProviderTrace + provenance 链：每跳要能追，回不到原馆就只能
// ORIGIN_UNRESOLVED 且不得虚构馆藏身份；聚合元数据许可不得冒充图像许可。
const CATALOG_ID = '11111111-1111-4111-8111-111111111111';
const CHECKED = '2026-11-10T10:00:00.000Z';
const EARLIER = '2026-11-10T09:00:00.000Z';

const rightsLayers = (overrides = {}) => ({
  aggregation_metadata_license: {
    state: 'licensed',
    statement: '聚合侧元数据标注 CC0',
    evidence_ref: { uri: 'https://aggregator.example/record/1', checked_at: EARLIER },
  },
  digital_copy_rights: { state: 'unknown' },
  holding_identity: { state: 'observed', statement: '原馆目录记录可查' },
  ...overrides,
});

const aggregatedRecord = () => ({
  provider: 'Europeana',
  record_uri: 'https://aggregator.example/record/1',
  data_provider: '国立公文书馆',
  holding_field: '国立公文书馆 内閣文庫',
  license_field: 'CC0（仅元数据）',
});

const hop = (overrides = {}) => ({
  kind: 'aggregator_record', uri: 'https://aggregator.example/record/1',
  checked_at: EARLIER, result: 'ok', http_status: 200, ...overrides,
});

test('Y04 回源：聚合 → 原馆目录两跳可追，产出 RESOLVED 且 holding 为候选', () => {
  const trace = deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆', catalog_no: 'NAJDA-292-0017',
      uri: 'https://www.digital.archives.go.jp/item/4252790', record_title: '松江府志' },
    holdingRef: { value: '内閣文庫 292-0017', kind: 'shelf_mark' },
    hops: [hop(), hop({ kind: 'provider_catalog',
      uri: 'https://www.digital.archives.go.jp/item/4252790', checked_at: CHECKED })],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  });
  assert.equal(trace.schema, PROVIDER_TRACE_SCHEMA);
  assert.equal(trace.catalog_entry_id, CATALOG_ID);
  assert.equal(trace.origin_state, 'RESOLVED');
  assert.equal(trace.original_provider.catalog_no, 'NAJDA-292-0017');
  assert.equal(trace.holding_ref.state, 'resolved');
  assert.equal(trace.provenance.chain_complete, true);
  assert.equal(trace.provenance.hops.length, 2);
  assert.deepEqual(trace.provenance.hops.map((item) => item.seq), [1, 2]);
  assert.equal(trace.method.key, INTAKE_PROVIDER_TRACE_METHOD);
  assert.equal(trace.method.version, INTAKE_PROVIDER_TRACE_METHOD_VERSION);
  // 三层许可必须分开留存，不能因为聚合是 CC0 就把图像权利也算成 CC0。
  assert.equal(trace.rights_layers.aggregation_metadata_license.state, 'licensed');
  assert.equal(trace.rights_layers.digital_copy_rights.state, 'unknown');
});

test('Y04 回源：只有聚合一跳却宣布 RESOLVED，失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆', catalog_no: 'NAJDA-292-0017',
      uri: 'https://www.digital.archives.go.jp/item/4252790' },
    hops: [hop()],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_RESOLVED_HOPS_UNTRACEABLE/);
});

test('Y04 回源：未回源却填了原馆编号或馆藏值，失败关闭（不虚构馆藏身份）', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆', catalog_no: 'NAJDA-292-0017' },
    hops: [hop()],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_UNRESOLVED_WITH_INVENTED_HOLDING/);
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { value: '内閣文庫 292-0017', note: '原馆链接 404' },
    hops: [hop()],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_UNRESOLVED_WITH_INVENTED_HOLDING/);
});

test('Y04 回源：只保留聚合线索时写 UNRESOLVED，并保留查不回来的原因', () => {
  const trace = deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '原馆目录页 404，未取得馆藏号' },
    hops: [hop({ result: 'not_found', http_status: 404 })],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  });
  assert.equal(trace.origin_state, 'UNRESOLVED');
  assert.equal(trace.original_provider.catalog_no, null);
  assert.equal(trace.original_provider.uri, null);
  assert.equal(trace.holding_ref.state, 'unresolved');
  assert.equal(trace.holding_ref.value, null);
  assert.equal(trace.provenance.chain_complete, false);
  assert.match(trace.provenance.unresolved_reason, /404/);
});

test('Y04 回源：每跳必须带核查时刻与结果，缺一即失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop({ checked_at: undefined })],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_HOP_CHECKED_AT_REQUIRED/);
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop({ result: undefined })],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_HOP_RESULT_INVALID/);
});

test('Y04 回源：404 却写 result=ok，属于自相矛盾的证据，失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop({ http_status: 404 })],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_HOP_RESULT_CONTRADICTS_STATUS/);
});

test('Y04 回源：把聚合元数据许可复用成数字副本许可，失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop()],
    rightsLayers: rightsLayers({
      digital_copy_rights: { state: 'licensed',
        evidence_ref: { uri: 'https://aggregator.example/record/1', checked_at: EARLIER } },
    }),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_AGGREGATE_LICENSE_REUSED_AS_IMAGE_RIGHTS/);
});

test('Y04 回源：三层许可缺一层即失败关闭（不许默认继承）', () => {
  const layers = rightsLayers();
  delete layers.holding_identity;
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop()],
    rightsLayers: layers,
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_RIGHTS_LAYER_MISSING:holding_identity/);
});

test('Y04 回源：声称已获许可却没有许可证据，失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop()],
    rightsLayers: rightsLayers({ digital_copy_rights: { state: 'licensed' } }),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_RIGHTS_EVIDENCE_REQUIRED:digital_copy_rights/);
});

test('Y04 回源：回溯时刻早于链上某跳，属于伪造时刻，失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop({ checked_at: '2026-11-10T11:00:00.000Z' })],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_CHECKED_AT_BEFORE_HOP:1/);
});

test('Y04 回源：同一 URI 在链上重复出现，说明有一跳没真的往下走，失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    catalogEntryId: CATALOG_ID,
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop(), hop({ kind: 'provider_catalog', checked_at: CHECKED })],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_HOP_REPEATED:2/);
});

test('Y04 回源：没有 catalog_record_ref 就没有 y04 可写，失败关闭', () => {
  assert.throws(() => deriveOriginalProviderTrace({
    aggregatedRecord: aggregatedRecord(),
    originalProvider: { provider: '国立公文书馆' },
    holdingRef: { note: '未回源' },
    hops: [hop()],
    rightsLayers: rightsLayers(),
    checkedAt: CHECKED,
  }), /PROVIDER_TRACE_CATALOG_REF_REQUIRED/);
});
