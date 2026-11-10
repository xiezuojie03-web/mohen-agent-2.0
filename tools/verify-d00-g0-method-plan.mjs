// D00-C/P1：G0「消费者方法计划预选」在本地隔离库的真实正反验证（只读）。
//
// 只核两件已发生的事实，不重跑、不补签：
//   正例 run：D00 带 --method-plan 实跑 → 候选含 method_plan 引用 → 机器评审 G0 PASS → 有现行审计行
//   反例 run：D00 不带计划实跑 → 候选无 method_plan 引用 → 机器评审 G0 FAIL → 不得留下任何审计行
// 全部断言通过才写证据回执（回执钉本脚本 SHA）；任一失败也照写 FAIL，不留旧结论。
//
// 刻意不写进 tasks/results/MAB/evidence/method-isolation/：那个目录的回执会被
// tools/report-method-ledger.mjs 直接计成 ISOLATED_VERIFIED。本回执证明的是
// 「G0 强制方法预选」这道前置，不是 C01/C02 这两个方法本身的实现已验证，
// 混进去等于虚增隔离验证数，所以单独落在 method-plan-gate 目录、只作证据。
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { queryRows, getNodePgPool } from '../packages/data-access/src/index.mjs';
import { inspectMethodPlanRef, isMethodPlanRef, methodPlanRevision } from '../packages/data-access/src/method-plan-ref.mjs';

const PROJECT = 'b0a11000-0000-4000-8000-000000000001';
const ORIGINAL = 'b0a11000-0000-4000-8000-000000000006';
const POSITIVE_RUN = 'c0a12000-0000-4000-8000-000000000020';
const NEGATIVE_RUN = 'c0a12000-0000-4000-8000-000000000021';
const EXPECTED_METHOD = { method_id: 'C01', method_version: 'v1' };
const REPORT_DIR = path.join('verification', 'data-production-runs');

const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail }); };
// pg 布尔经该连接返回 't'/'f'，与评审器同一口径判定，不按 JS 真值想当然。
const flag = value => value === true || value === 't' || value === 'true';

async function candidateOf(runId) {
  const rows = await queryRows(`select candidate_id::text as candidate_id, candidate_status, object_type, object_id::text as object_id,
      artifact_revision, evidence_refs::text as evidence_refs, input_fingerprint, submitted_at::text as submitted_at
    from control.gate_candidates where run_id=:'run_id'::uuid and gate_code='G0'`, { run_id: runId });
  return rows.length === 1 ? { ...rows[0], evidence_refs: JSON.parse(rows[0].evidence_refs) } : null;
}

function runReport(runId) {
  const file = path.join(REPORT_DIR, `${runId}.machine.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

// 正例：候选带合法 method_plan 引用，且只是候选（未自签资格）。
const positive = await candidateOf(POSITIVE_RUN);
check('positive: D00 产出唯一 G0 候选', positive !== null, positive ? positive.candidate_id : 'missing');
if (positive) {
  const planRefs = positive.evidence_refs.filter(isMethodPlanRef);
  check('positive: 候选含 1 条 method_plan 引用', planRefs.length === 1, `count=${planRefs.length}`);
  const inspected = planRefs.length === 1 ? inspectMethodPlanRef(planRefs[0]) : { ok: false, reason: 'missing' };
  check('positive: 引用形/版本/摘要自洽', inspected.ok === true, inspected.ok ? inspected.id : inspected.reason);
  check('positive: 引用指向 C01@v1 且阶段 D01',
    inspected.methodId === EXPECTED_METHOD.method_id && inspected.methodVersion === EXPECTED_METHOD.method_version &&
    planRefs[0]?.stage === 'D01', inspected.ok ? `${inspected.id}@${planRefs[0].stage}` : 'n/a');
  check('positive: 摘要等于规范重算',
    planRefs[0]?.artifact_revision === methodPlanRevision({ stage: 'D01', methodId: 'C01', methodVersion: 'v1' }),
    planRefs[0]?.artifact_revision ?? 'n/a');
  // 生产侧只提交候选：跑 D00 时仍是 SUBMITTED，资格只能由独立评审消费候选后产生。
  check('positive: 生产侧不自签资格（评审后候选被消费）', positive.candidate_status === 'CONSUMED', positive.candidate_status);
  const report = runReport(POSITIVE_RUN);
  const hold = report?.stages?.[0]?.hold;
  check('positive: 运行结果 HOLD 且原因是独立 Gate 未验证',
    report?.status === 'HOLD' && hold?.reason_code === 'INDEPENDENT_GATE_NOT_VERIFIED', hold?.reason_code ?? 'n/a');
}

// 正例的独立 Gate：真实 gate_audits 行，现行、绑同一对象与 revision。
const audits = positive ? await queryRows(`select a.gate_audit_id::text as gate_audit_id, a.gate_code, a.object_type,
    a.object_id::text as object_id, a.artifact_revision, a.result, a.decision_origin, a.consumer, a.rule_version,
    a.reviewer_db_identity, control.current_qualification_is_valid(a.gate_audit_id) as current,
    a.details::text as details
  from control.gate_audits a where a.candidate_id=:'candidate'::uuid`, { candidate: positive.candidate_id }) : [];
check('positive: 该候选有 1 条 G0 审计', audits.length === 1, `count=${audits.length}`);
const audit = audits[0];
if (audit) {
  const details = JSON.parse(audit.details);
  check('positive: G0 PASS 且来源为独立 Gate', audit.result === 'PASS' && audit.decision_origin === 'independent_gate',
    `${audit.result}/${audit.decision_origin}`);
  check('positive: 审计绑同一对象与 revision',
    audit.object_type === 'source_version' && audit.object_id === (positive?.object_id ?? '') &&
    audit.artifact_revision === (positive?.artifact_revision ?? ''), `${audit.object_id} ${audit.artifact_revision}`);
  check('positive: 现行资格有效', flag(audit.current), String(audit.current));
  check('positive: 回执 checks 含 method_plan_preselection=true',
    details?.checks?.method_plan_preselection === true, JSON.stringify(details?.checks ?? {}));
  check('positive: 规则版本为 m5-local-v1', audit.rule_version === 'm5-local-v1', audit.rule_version);
}

// 反例：不给计划 → 候选无 method_plan 引用，评审失败关闭且不写审计。
const negative = await candidateOf(NEGATIVE_RUN);
check('negative: D00 产出唯一 G0 候选', negative !== null, negative ? negative.candidate_id : 'missing');
if (negative) {
  check('negative: 候选无任何 method_plan 引用',
    negative.evidence_refs.filter(isMethodPlanRef).length === 0, `refs=${negative.evidence_refs.length}`);
  const negativeAudits = await queryRows(`select count(*)::int as n from control.gate_audits where candidate_id=:'candidate'::uuid`,
    { candidate: negative.candidate_id });
  check('negative: 未产生任何 Gate 审计（失败关闭不留资格）', Number(negativeAudits[0].n) === 0, `audits=${negativeAudits[0].n}`);
  check('negative: 候选仍为 SUBMITTED', negative.candidate_status === 'SUBMITTED', negative.candidate_status);
  const report = runReport(NEGATIVE_RUN);
  check('negative: 运行同样 HOLD，未越级', report?.status === 'HOLD', report?.status ?? 'n/a');
}

// 同一个对象上，现行 G0 只有一条且来自正例，反例没有污染它。
const currentG0 = await queryRows(`select count(*)::int as n from control.gate_audits a
  join control.gate_candidates c on c.candidate_id=a.candidate_id
  where a.gate_code='G0' and a.object_type='source_version' and a.object_id=:'object'::uuid
    and control.current_qualification_is_valid(a.gate_audit_id)`, { object: positive?.object_id ?? '' });
check('isolation: 该对象现行 G0 恰为 1 条', Number(currentG0[0].n) === 1, `current=${currentG0[0].n}`);

const failed = checks.filter(c => !c.ok);
console.log(checks.map(c => `${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' ' + c.detail : ''}`).join('\n'));
console.log(failed.length === 0 ? 'VERIFY_D00_G0_METHOD_PLAN_ALL_PASS' : `VERIFY_D00_G0_METHOD_PLAN_FAILED ${failed.length}`);

const EVIDENCE_DIR = 'tasks/results/MAB/evidence/method-plan-gate';
const evidenceFile = `${EVIDENCE_DIR}/d00-g0-method-plan.json`;
const evidence = {
  schema: 'mohen.method-plan-gate-evidence.v1',
  // 明确声明本文件不构成任何方法的 ISOLATED_VERIFIED 计数。
  isolation_credit: 'NONE',
  verifier: 'tools/verify-d00-g0-method-plan.mjs',
  verifier_sha256: createHash('sha256').update(fs.readFileSync('tools/verify-d00-g0-method-plan.mjs')).digest('hex'),
  methods_in_plan: ['C01@v1'],
  scope: `D00→G0 真实执行授权＋机器评审；原件 ${ORIGINAL}（text/plain），对象 source_version ${positive?.object_id ?? 'unknown'}`,
  not_covered: [
    '不覆盖 C01/C02 等方法本身的实现：只证明 G0 的方法预选前置是强制的',
    '不覆盖生产环境：全部事实来自本地隔离库 mohen_dev',
    '不覆盖 D01 及下游：G0 之后的阶段未在本批运行',
  ],
  environment: { database: 'local-isolated mohen_dev', project: PROJECT, positive_run: POSITIVE_RUN, negative_run: NEGATIVE_RUN },
  ran_at: new Date().toISOString(),
  total: checks.length,
  failed: failed.length,
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks: checks.map(c => ({ name: c.name, ok: c.ok === true, detail: c.detail })),
};
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log('METHOD_PLAN_GATE_EVIDENCE_WRITTEN', evidenceFile, evidence.status);
await getNodePgPool().end();
if (failed.length) process.exitCode = 1;
