#!/usr/bin/env node
// D00-C2 隔离证据：Y01 需求回执 / Y07 获取尝试接入 D00 阶段授权调用面后的接线行为。
//
// 证据来源是既有 node --test 套件实跑结果（真实 EdDSA stage 授权夹具 + stub 依赖），
// 不是新写的断言、也不是手填数字：套件红了，回执就是 FAIL，派生工具会拒绝计入。
// 不含真实私有原件与生产库——那属于 stage 端到端证据，见 site 说明。
import { spawnSync } from 'node:child_process';
import { writeMethodIsolationReceipt } from './lib/method-isolation-receipt.mjs';

const VERIFIER = 'tools/verify-d00c2-stage-wiring.mjs';
const METHODS = ['Y01', 'Y07'];
const SUITES = [
  'tests/data-production/private-scanned-page-worker.test.mjs',
  'tests/data-production/private-candidate-worker.test.mjs',
  'tests/data-production/private-evidence-adapters.test.mjs',
];

const run = spawnSync(process.execPath, ['--test', ...SUITES], { encoding: 'utf8' });
const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
const numberOf = (label) => {
  const found = output.match(new RegExp(`^# ${label} (\\d+)$`, 'm'));
  return found ? Number(found[1]) : null;
};
const tests = numberOf('tests');
const passed = numberOf('pass');
const failedTests = numberOf('fail');
const skipped = numberOf('skipped') ?? 0;

const checks = [
  { name: 'D00/D01/D02 私有阶段套件实跑通过（零失败）', ok: run.status === 0 && failedTests === 0 },
  { name: '套件确实执行了用例（通过数 > 0）', ok: typeof passed === 'number' && passed > 0 },
  { name: '通过数与用例数吻合（无静默丢失的用例）',
    ok: typeof tests === 'number' && typeof passed === 'number' && tests === passed + skipped },
];

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}`);
console.log(`\nD00C2_${checks.every((c) => c.ok) ? 'ALL_PASS' : 'FAILED'} suites=${SUITES.length} tests=${tests} passed=${passed} failed=${failedTests}`);

const written = writeMethodIsolationReceipt({
  receiptId: 'd00c2-stage-wiring',
  verifier: VERIFIER,
  methods: METHODS,
  scope: 'Y01 需求回执与 Y07 获取尝试在 D00 阶段授权面内的接线行为（点名/失败关闭/未提供来源即不编造尝试）',
  notCovered: ['真实私有原件字节与 Storage 读回', 'registry 方法路由与激活', '生产库'],
  environment: { node: process.version, suites: SUITES, runner: 'node --test' },
  checks,
});
console.log(`RECEIPT ${written.file} status=${written.receipt.status} total=${written.receipt.total} failed=${written.receipt.failed}`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
