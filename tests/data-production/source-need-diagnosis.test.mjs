import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseSourceNeed, DIAGNOSIS_SCHEMA } from '../../pipelines/data-production/workers/source-need-diagnosis.mjs';

// Y01 的缺口必须由工序自己从真实存量算出；算不出来就失败关闭，不填默认值。
const stock = (overrides = {}) => ({
  originals: 2, verified_originals: 2, unbound_verified: 0, linked_sources: 1,
  carriers: { 'image/jpeg': 2 }, ...overrides,
});

test('Y01 诊断只认已核验存量并把空项目如实标成缺口', async () => {
  const result = diagnoseSourceNeed({
    researchIntent: '松江府田赋与均徭记载的旁证来源',
    stock: { originals: 0, verified_originals: 0, unbound_verified: 0, linked_sources: 0, carriers: {} },
  });
  assert.equal(result.existing_stock_gap.schema, DIAGNOSIS_SCHEMA);
  assert.equal(result.existing_stock_gap.has_gap, true);
  assert.deepEqual(result.existing_stock_gap.gaps.map((gap) => gap.dimension), ['carrier']);
  assert.deepEqual(result.coverage_dimensions, []);
});

test('Y01 诊断在有真实存量时不编造缺口，只标未清点的维度', async () => {
  const result = diagnoseSourceNeed({
    researchIntent: '松江府田赋与均徭记载的旁证来源',
    stock: stock({ rights_display_allowed: 1 }),
    requestedDimensions: ['time_coverage', 'regional_coverage'],
  });
  assert.deepEqual(result.coverage_dimensions, ['time_coverage', 'regional_coverage']);
  assert.deepEqual(result.existing_stock_gap.gaps.map((gap) => [gap.dimension, gap.state]), [
    ['time_coverage', 'unassessed'], ['regional_coverage', 'unassessed']]);
  assert.equal(result.existing_stock_gap.stock.verified_originals, 2);
});

test('Y01 诊断区分"未绑定来源"和"权利未清点"，不把两者混成一个 0', async () => {
  const unbound = diagnoseSourceNeed({
    researchIntent: '松江府田赋', stock: stock({ unbound_verified: 1, linked_sources: 1, rights_display_allowed: 1 }),
  });
  assert.deepEqual(unbound.existing_stock_gap.gaps.map((gap) => gap.dimension), ['source_identity']);
  assert.equal(unbound.existing_stock_gap.gaps[0].state, 'unbound');

  const unknownRights = diagnoseSourceNeed({ researchIntent: '松江府田赋', stock: stock() });
  assert.deepEqual(unknownRights.existing_stock_gap.gaps.map((gap) => [gap.dimension, gap.state]),
    [['rights', 'unassessed']]);
});

test('Y01 诊断在存量或意图不可用时失败关闭，不写"看起来做过诊断"的回执', async () => {
  assert.throws(() => diagnoseSourceNeed({ researchIntent: '  ', stock: stock() }), /SOURCE_NEED_INTENT_REQUIRED/);
  assert.throws(() => diagnoseSourceNeed({ researchIntent: 'x'.repeat(2001), stock: stock() }), /SOURCE_NEED_INTENT_TOO_LONG/);
  assert.throws(() => diagnoseSourceNeed({ researchIntent: '松江府田赋' }), /SOURCE_NEED_STOCK_REQUIRED/);
  assert.throws(() => diagnoseSourceNeed({ researchIntent: '松江府田赋', stock: stock({ verified_originals: 3 }) }),
    /SOURCE_NEED_STOCK_INVALID/);
  assert.throws(() => diagnoseSourceNeed({ researchIntent: '松江府田赋', stock: stock({ rights_display_allowed: 2 }) }),
    /SOURCE_NEED_STOCK_INVALID/);
  assert.throws(() => diagnoseSourceNeed({ researchIntent: '松江府田赋', stock: stock(), requestedDimensions: 'x' }),
    /SOURCE_NEED_DIMENSIONS_INVALID/);
});
