// Y01「来源需求与存量缺口诊断」的执行器部分（D00 第一道工序）。
//
// 边界：
//   * 缺口只从**真实存量**算出（原件数/已核验数/已绑定来源数/展示权利），
//     不再把调用方传进来的空值原样写进回执——那样的"Y01"只是登记表，不是工序。
//   * 算不出来的维度一律标 unassessed（未清点），不推断、不填 0、不声称已覆盖。
//   * 本模块不写库；写入口仍是 source-discovery-repository.mjs 的 recordSourceNeed。
export const DIAGNOSIS_SCHEMA = 'mohen.source-need-diagnosis.v1';
export const MAX_INTENT_LENGTH = 2000;
const MAX_DIMENSIONS = 12;

function requireCount(value, code) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(code);
  return n;
}

function normalizeDimensions(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error('SOURCE_NEED_DIMENSIONS_INVALID');
  const out = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !item.trim()) throw new Error('SOURCE_NEED_DIMENSIONS_INVALID');
    const value = item.trim().slice(0, 64);
    if (!out.includes(value)) out.push(value);
  }
  if (out.length > MAX_DIMENSIONS) throw new Error('SOURCE_NEED_DIMENSIONS_TOO_MANY');
  return out;
}

export function diagnoseSourceNeed({ researchIntent, stock, requestedDimensions } = {}) {
  const intent = typeof researchIntent === 'string' ? researchIntent.trim() : '';
  if (!intent) throw new Error('SOURCE_NEED_INTENT_REQUIRED');
  if (intent.length > MAX_INTENT_LENGTH) throw new Error('SOURCE_NEED_INTENT_TOO_LONG');
  if (!stock || typeof stock !== 'object' || Array.isArray(stock)) throw new Error('SOURCE_NEED_STOCK_REQUIRED');

  const originals = requireCount(stock.originals, 'SOURCE_NEED_STOCK_INVALID');
  const verified = requireCount(stock.verified_originals, 'SOURCE_NEED_STOCK_INVALID');
  const unbound = requireCount(stock.unbound_verified ?? 0, 'SOURCE_NEED_STOCK_INVALID');
  const linked = requireCount(stock.linked_sources, 'SOURCE_NEED_STOCK_INVALID');
  // 逐动作展示权利读不到时保持 null（未清点），不当成 0 也不当成 allowed。
  const readable = stock.rights_display_allowed == null
    ? null : requireCount(stock.rights_display_allowed, 'SOURCE_NEED_STOCK_INVALID');
  if (verified > originals) throw new Error('SOURCE_NEED_STOCK_INVALID');
  if (unbound > verified) throw new Error('SOURCE_NEED_STOCK_INVALID');
  if (readable != null && readable > linked) throw new Error('SOURCE_NEED_STOCK_INVALID');

  const carriers = stock.carriers && typeof stock.carriers === 'object' && !Array.isArray(stock.carriers)
    ? Object.fromEntries(Object.entries(stock.carriers).map(([k, v]) => [String(k), requireCount(v, 'SOURCE_NEED_STOCK_INVALID')]))
    : {};

  const requested = normalizeDimensions(requestedDimensions);
  const gaps = [];
  if (originals === 0) {
    gaps.push({ dimension: 'carrier', state: 'missing', detail: '项目内还没有任何原件' });
  } else if (verified === 0) {
    gaps.push({ dimension: 'carrier', state: 'unverified', detail: `${originals} 个原件均未通过字节核验` });
  }
  if (unbound > 0) {
    gaps.push({ dimension: 'source_identity', state: 'unbound', detail: `${unbound} 个已核验原件尚未绑定来源版本` });
  } else if (verified > 0 && linked === 0) {
    gaps.push({ dimension: 'source_identity', state: 'missing', detail: '已核验原件还没有任何已登记来源' });
  }
  if (linked > 0 && readable == null) {
    gaps.push({ dimension: 'rights', state: 'unassessed', detail: '已绑定来源的逐动作展示权利尚未清点' });
  } else if (linked > 0 && readable < linked) {
    gaps.push({ dimension: 'rights', state: 'rights_unresolved', detail: `${linked - readable}/${linked} 个已绑定来源的展示权利未达 allowed` });
  }
  for (const dimension of requested) {
    if (gaps.some((gap) => gap.dimension === dimension)) continue;
    // 逐维度存量尚未清点，就如实写未清点，不拿"有原件"冒充"该维度已覆盖"。
    gaps.push({ dimension, state: 'unassessed', detail: '该维度的存量未逐项清点' });
  }

  return {
    coverage_dimensions: requested,
    existing_stock_gap: {
      schema: DIAGNOSIS_SCHEMA,
      stock: {
        originals,
        verified_originals: verified,
        unbound_verified: unbound,
        linked_sources: linked,
        rights_display_allowed: readable,
        carriers,
      },
      gaps,
      has_gap: gaps.length > 0,
    },
  };
}
