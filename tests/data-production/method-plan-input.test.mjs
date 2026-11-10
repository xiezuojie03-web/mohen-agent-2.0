// D00 消费者方法计划入参的唯一口径：解析、规范化与 digest 稳定性。
// 这些断言存在的理由：授权器签发的 input_digest 必须等于 Runner 实跑输入，
// 不给计划时输入口径必须与旧行为逐字节一致，否则既有运行会集体失败关闭。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readMethodPlanArg, readSectionsArg } from '../../tools/lib/method-plan-input.mjs';
import { buildSourceIntakeInput } from '../../pipelines/data-production/orchestrator/orchestrator.mjs';
import { executionDigest } from '../../pipelines/data-production/orchestrator/execution-authority.mjs';

const scope = { project_id: 'b0a11000-0000-4000-8000-000000000001', original_id: 'b0a11000-0000-4000-8000-000000000006', page_number: 1 };

test('缺少 --method-plan 时不补默认方法计划', () => {
  assert.equal(readMethodPlanArg(undefined), undefined);
  assert.equal(readMethodPlanArg(null), undefined);
  assert.equal(readMethodPlanArg('   '), undefined);
});

test('内联 JSON 计划规范成身份字段', () => {
  const plan = readMethodPlanArg('[{"method_id":" C01 ","method_version":" v1 ","note":"ignored"}]');
  assert.deepEqual(plan, [{ method_id: 'C01', method_version: 'v1' }]);
});

test('接受 {methods:[...]} 包装', () => {
  const plan = readMethodPlanArg('{"methods":[{"method_id":"C01","method_version":"v1"},{"method_id":"C02","method_version":"v2"}]}');
  assert.deepEqual(plan, [{ method_id: 'C01', method_version: 'v1' }, { method_id: 'C02', method_version: 'v2' }]);
});

test('文件路径与内联 JSON 得到同一计划', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohen-method-plan-'));
  const file = path.join(dir, 'plan.json');
  fs.writeFileSync(file, JSON.stringify({ methods: [{ method_id: 'C01', method_version: 'v1' }] }));
  assert.deepEqual(readMethodPlanArg(file), readMethodPlanArg('{"methods":[{"method_id":"C01","method_version":"v1"}]}'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('非法计划一律失败关闭，不回落到空计划', () => {
  assert.throws(() => readMethodPlanArg('{not json'), /METHOD_PLAN_JSON_INVALID/);
  assert.throws(() => readMethodPlanArg('[]'), /METHOD_PLAN_METHODS_REQUIRED/);
  assert.throws(() => readMethodPlanArg('{"methods":[]}'), /METHOD_PLAN_METHODS_REQUIRED/);
  assert.throws(() => readMethodPlanArg('[{"method_id":"C01"}]'), /METHOD_PLAN_METHOD_IDENTITY_REQUIRED/);
});

test('不给计划时 D00 输入口径与旧行为一致', () => {
  const input = buildSourceIntakeInput({ research_intent: 'intent', scope });
  assert.deepEqual(Object.keys(input).sort(), ['research_intent', 'scope']);
  assert.equal(executionDigest(input), executionDigest({ research_intent: 'intent', scope }));
});

test('给出计划时计划随输入参与 digest，改方法即换摘要', () => {
  const withPlan = buildSourceIntakeInput({
    research_intent: 'intent', scope,
    consumer_method_plan: [{ method_id: 'C01', method_version: 'v1' }],
  });
  assert.deepEqual(withPlan.consumer_method_plan, [{ method_id: 'C01', method_version: 'v1' }]);
  const baseline = executionDigest(buildSourceIntakeInput({ research_intent: 'intent', scope }));
  assert.notEqual(executionDigest(withPlan), baseline);
  const other = buildSourceIntakeInput({
    research_intent: 'intent', scope,
    consumer_method_plan: [{ method_id: 'C02', method_version: 'v1' }],
  });
  assert.notEqual(executionDigest(withPlan), executionDigest(other));
});

// ---- D00 分段材料（Y02/Y03/Y04/Y06/Y07）----
const sections = {
  catalog: [{ provider: '上海图书馆', catalog_title: '松江府志', catalog_identifier: 'GJ-0006' }],
  coverage: [{ coverage_scope: '卷十一 田赋门', completeness_state: 'PARTIAL', missing_parts: ['卷十二'] }],
};

test('缺少 --sections 时不写任何分段', () => {
  assert.equal(readSectionsArg(undefined), undefined);
  assert.equal(readSectionsArg(null), undefined);
  assert.equal(readSectionsArg('  '), undefined);
});

test('分段既接受内联 JSON 也接受文件，且键原样保留', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mohen-sections-'));
  const file = path.join(dir, 'sections.json');
  fs.writeFileSync(file, JSON.stringify(sections));
  assert.deepEqual(readSectionsArg(file), sections);
  assert.deepEqual(readSectionsArg(JSON.stringify(sections)), sections);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('非法分段一律失败关闭，不静默丢弃', () => {
  assert.throws(() => readSectionsArg('{not json'), /SECTIONS_JSON_INVALID/);
  assert.throws(() => readSectionsArg('[]'), /SECTIONS_OBJECT_REQUIRED/);
  assert.throws(() => readSectionsArg('{}'), /SECTIONS_EMPTY/);
  // 拼错的键必须报错：否则跑完显示成功、库里却什么都没落。
  assert.throws(() => readSectionsArg('{"prioritise":[]}'), /SECTIONS_KEY_UNSUPPORTED:prioritise/);
  assert.throws(() => readSectionsArg('{"catalog":[],"verification":[]}'),
    /SECTIONS_KEY_UNSUPPORTED:verification/);
});

test('分段平铺进 D00 输入顶层，正是 worker 读取的位置', () => {
  const input = buildSourceIntakeInput({ research_intent: 'intent', scope, sections });
  assert.deepEqual(Object.keys(input).sort(),
    ['catalog', 'coverage', 'research_intent', 'scope']);
  assert.deepEqual(input.catalog, sections.catalog);
  assert.deepEqual(input.coverage, sections.coverage);
  // 不给分段时口径与旧行为逐字节一致。
  assert.equal(executionDigest(buildSourceIntakeInput({ research_intent: 'intent', scope })),
    executionDigest({ research_intent: 'intent', scope }));
  assert.notEqual(executionDigest(input),
    executionDigest(buildSourceIntakeInput({ research_intent: 'intent', scope })));
});

test('改分段内容即换摘要，方法与分段共存', () => {
  const base = buildSourceIntakeInput({
    research_intent: 'intent', scope,
    consumer_method_plan: [{ method_id: 'C01', method_version: 'v1' }], sections,
  });
  assert.deepEqual(base.consumer_method_plan, [{ method_id: 'C01', method_version: 'v1' }]);
  const changed = buildSourceIntakeInput({
    research_intent: 'intent', scope,
    consumer_method_plan: [{ method_id: 'C01', method_version: 'v1' }],
    sections: { ...sections, coverage: [{ ...sections.coverage[0], missing_parts: [] }] },
  });
  assert.notEqual(executionDigest(base), executionDigest(changed));
});
