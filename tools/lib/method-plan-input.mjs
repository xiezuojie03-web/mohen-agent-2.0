// D00 消费者方法计划（C 方法预选）的唯一入参解析口径。
//
// 授权器签发执行许可时用它算 input_digest，run.mjs 起跑时用同一函数还原输入，
// 两边必须是同一份实现，否则摘要永远对不上、D00 永远失败关闭。
// 这里只做"取值 + 规范成身份字段"，不判断方法是否登记、不补默认方法：
// 登记判定交给 tools/rule-gate-reviewer.mjs 对唯一身份目录的执行。
import fs from 'node:fs';
import path from 'node:path';

const INLINE_JSON = /^[[{]/;

/** `--method-plan` 既接受文件路径，也接受内联 JSON；缺省返回 undefined（不补默认计划）。 */
export function readMethodPlanArg(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const payload = INLINE_JSON.test(raw) ? raw : fs.readFileSync(path.resolve(raw), 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('METHOD_PLAN_JSON_INVALID');
  }
  // 允许 {methods:[...]} 包装，避免调用方为了一句参数再包一层文件字段。
  const methods = Array.isArray(parsed) ? parsed : parsed?.methods;
  if (!Array.isArray(methods) || methods.length === 0) throw new Error('METHOD_PLAN_METHODS_REQUIRED');
  return methods.map((entry) => {
    const methodId = String(entry?.method_id ?? '').trim();
    const methodVersion = String(entry?.method_version ?? '').trim();
    if (!methodId || !methodVersion) throw new Error('METHOD_PLAN_METHOD_IDENTITY_REQUIRED');
    return { method_id: methodId, method_version: methodVersion };
  });
}
