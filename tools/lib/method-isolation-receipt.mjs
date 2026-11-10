// 逐项隔离证据回执的唯一写入器。
//
// 规矩：
//   * 回执只能由「真正跑过验证的工具」写，禁止手写或补写。
//   * 回执里记下写它的验证脚本当前字节的 SHA-256；脚本一改，旧回执自动失效，
//     tools/report-method-ledger.mjs 会判 STALE 并不计入——想计数就得重跑。
//   * 失败也照写：失败回执会被判 NOT_PASS 拒绝计入，不会留下上一轮的旧结论冒充本次。
import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const RECEIPT_DIR = 'tasks/results/MAB/evidence/method-isolation';

export function writeMethodIsolationReceipt({
  receiptId, verifier, methods, scope, notCovered = [], environment = {}, checks = [],
}) {
  if (typeof receiptId !== 'string' || !receiptId) throw new Error('ISOLATION_RECEIPT_ID_REQUIRED');
  if (typeof verifier !== 'string' || !fs.existsSync(verifier)) throw new Error('ISOLATION_RECEIPT_VERIFIER_MISSING');
  if (!Array.isArray(methods) || methods.length === 0) throw new Error('ISOLATION_RECEIPT_METHODS_REQUIRED');
  const failed = checks.filter((c) => !c.ok).length;
  const receipt = {
    schema: 'mohen.method-isolation-evidence.v1',
    receipt_id: receiptId,
    verifier,
    verifier_sha256: createHash('sha256').update(fs.readFileSync(verifier)).digest('hex'),
    methods,
    scope,
    not_covered: notCovered,
    environment,
    ran_at: new Date().toISOString(),
    total: checks.length,
    failed,
    status: failed === 0 ? 'PASS' : 'FAIL',
    checks: checks.map((c) => ({ name: c.name, ok: c.ok === true })),
  };
  fs.mkdirSync(RECEIPT_DIR, { recursive: true });
  const file = `${RECEIPT_DIR}/${receiptId}.json`;
  fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
  return { file, receipt };
}
