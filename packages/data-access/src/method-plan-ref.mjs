// D00-B：C 方法预选的零 DDL 承载。
// 现行 control.gate_candidates.evidence_refs 是 jsonb 数组，库级只约束"非空数组"，
// 元素结构没有校验（见 supabase/migrations/202610310910_k3_gate_candidates.sql）。
// 因此"消费者方法计划"不做加列，而是以类型化引用存进 evidence_refs，
// 由独立机器评审器在 G0 强制校验——缺计划、计划被改、方法未登记一律失败关闭。
// 本模块只描述引用与摘要，不写库、不签 Gate、不产生资格。
import { createHash } from 'node:crypto';

export const METHOD_PLAN_KIND = 'method_plan';
// 预选的是下一阶段（D01 载体读取）的 C 方法，不是 D00 自身的方法集。
export const METHOD_PLAN_STAGE = 'D01';
// 这里只核"是不是 C 编号"，方法是否登记交给唯一身份目录（identifier-registry.json）判定，
// 不在代码里再造第二份 C 方法清单。
const METHOD_ID = /^C\d{2}$/;
const METHOD_VERSION = /^v[1-9][0-9]*$/;
const HEX = /^[a-f0-9]{64}$/;
const MAX_METHODS = 8;

const text = value => (value == null ? '' : String(value));

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

// 摘要只覆盖引用自身的语义字段：改任一字段（含 id 与 stage）都会换摘要，
// 评审器重算即可发现手改；计划与当次 D00 输入的绑定由候选 input_fingerprint 承担。
function planIdentity({ stage, methodId, methodVersion }) {
  return {
    kind: METHOD_PLAN_KIND,
    id: `${methodId}@${methodVersion}`,
    stage,
    method_id: methodId,
    method_version: methodVersion,
  };
}

export function methodPlanRevision({ stage = METHOD_PLAN_STAGE, methodId, methodVersion } = {}) {
  return createHash('sha256').update(canonical(planIdentity({ stage, methodId, methodVersion }))).digest('hex');
}

export function isMethodPlanRef(ref) {
  return Boolean(ref) && typeof ref === 'object' && ref.kind === METHOD_PLAN_KIND;
}

/**
 * 从调用方给出的消费者方法计划构造类型化引用。
 * 计划本身不是 Gate 决定，也不保证 D01 一定使用该读法（D01 仍按载体魔数核读法）；
 * 它只是"消费者打算用什么方法读"的可核事实，缺失即失败关闭，不补默认值。
 */
export function buildMethodPlanRefs({ stage = METHOD_PLAN_STAGE, methods } = {}) {
  if (!Array.isArray(methods) || methods.length === 0) throw Error('PRIVATE_METHOD_PLAN_REQUIRED');
  if (methods.length > MAX_METHODS) throw Error('PRIVATE_METHOD_PLAN_TOO_LONG');
  const seen = new Set();
  return methods.map(entry => {
    const methodId = text(entry?.method_id).trim();
    const methodVersion = text(entry?.method_version).trim();
    if (!METHOD_ID.test(methodId)) throw Error(`PRIVATE_METHOD_PLAN_METHOD_INVALID:${methodId || 'empty'}`);
    if (!METHOD_VERSION.test(methodVersion)) throw Error(`PRIVATE_METHOD_PLAN_VERSION_INVALID:${methodVersion || 'empty'}`);
    if (seen.has(`${methodId}@${methodVersion}`)) throw Error(`PRIVATE_METHOD_PLAN_DUPLICATE:${methodId}@${methodVersion}`);
    seen.add(`${methodId}@${methodVersion}`);
    return {
      ...planIdentity({ stage, methodId, methodVersion }),
      artifact_revision: methodPlanRevision({ stage, methodId, methodVersion }),
    };
  });
}

/** 逐条核形与自洽摘要；不判断方法是否已登记（那是评审器对权威目录的职责）。 */
export function inspectMethodPlanRef(ref) {
  if (!isMethodPlanRef(ref)) return { ok: false, reason: 'method_plan_ref_shape_invalid' };
  const stage = text(ref.stage);
  const methodId = text(ref.method_id);
  const methodVersion = text(ref.method_version);
  const id = text(ref.id);
  if (!METHOD_ID.test(methodId)) return { ok: false, reason: `method_plan_method_invalid:${methodId || 'empty'}` };
  if (!METHOD_VERSION.test(methodVersion)) return { ok: false, reason: `method_plan_version_invalid:${methodVersion || 'empty'}` };
  if (stage !== METHOD_PLAN_STAGE) return { ok: false, reason: `method_plan_stage_invalid:${stage || 'empty'}` };
  if (id !== `${methodId}@${methodVersion}`) return { ok: false, reason: `method_plan_ref_id_mismatch:${id || 'empty'}` };
  const expected = methodPlanRevision({ stage, methodId, methodVersion });
  if (!HEX.test(text(ref.artifact_revision)) || text(ref.artifact_revision) !== expected) {
    return { ok: false, reason: 'method_plan_ref_revision_mismatch' };
  }
  return { ok: true, stage, methodId, methodVersion, id, artifact_revision: expected };
}
