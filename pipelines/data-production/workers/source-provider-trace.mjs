// Y04「聚合目录原机构回溯」在来源准入侧的回溯结论（D00 第四道工序）。
//
// 规范原文（Y01—Y08 V1.1，Y04）：
//   * 触发：已获 Europeana/DPLA/搜索镜像等聚合命中，原持有件与权利未明。
//   * 操作：解析 provider/dataProvider/holding 字段并查官方原记录；逐层区分聚合元数据
//     许可、数字副本权利、馆藏身份与版本；尽量恢复原编号及原提供者 URL，记录链路缺损。
//   * 输出：OriginalProviderTrace、catalog_record_ref、holding_ref 候选及 provenance 链。
//   * 验收：有原馆编号和核查时刻；来源路径每一跳可追；未回源不填写虚构馆藏身份。
//   * 反例：把聚合元数据 CC0 等同图像许可；镜像 PDF 直接冒原馆授权；原链接 404 断言对象不存在。
//   * 失败：无法查证时仅保留聚合线索并标 ORIGIN_UNRESOLVED/HOLD，不绕过访问控制。
//
// 本模块只做"派生 + 失败关闭"，不写库：写入口仍是
// source-discovery-repository.mjs 的 recordProviderTrace（追加不可变，更正另起一行）。
export const PROVIDER_TRACE_SCHEMA = 'mohen.original-provider-trace.v1';
export const INTAKE_PROVIDER_TRACE_METHOD = 'D00/Y04:origin_trace';
export const INTAKE_PROVIDER_TRACE_METHOD_VERSION = 'v1';

export const ORIGIN_STATES = Object.freeze(['RESOLVED', 'UNRESOLVED']);
// 一跳可以是什么：聚合命中本身、聚合侧记录、原馆目录记录、馆藏件、原馆 IIIF manifest。
export const HOP_KINDS = Object.freeze([
  'aggregator', 'aggregator_record', 'provider_catalog', 'provider_manifest', 'holding',
]);
// 每跳必须带"看到了什么"：200 与 404 都是可追的证据，但不能没有结果。
export const HOP_RESULTS = Object.freeze([
  'ok', 'not_found', 'forbidden', 'rate_limited', 'redirected', 'error',
]);
const RIGHTS_LAYERS = Object.freeze(['aggregation_metadata_license', 'digital_copy_rights', 'holding_identity']);
const RIGHTS_STATES = Object.freeze(['unknown', 'observed', 'licensed', 'denied', 'not_applicable']);

const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const isObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => (typeof value === 'string' ? value.trim() : '');

function requireHttpUri(value, code) {
  const uri = text(value);
  if (!uri) throw new Error(code);
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(code);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error(code);
  return uri;
}

function requireInstant(value, code) {
  const at = value instanceof Date ? value : new Date(value ?? NaN);
  if (Number.isNaN(at.getTime())) throw new Error(code);
  return at;
}

// 每一跳都是"哪一步、什么时候、看到什么"。缺任一要素的跳等于没查过，
// 不能让"我在聚合页上看到过"冒充原馆回源证据。
function normalizeHop(raw, index) {
  if (!isObject(raw)) throw new Error(`PROVIDER_TRACE_HOP_INVALID:${index}`);
  const kind = text(raw.kind);
  if (!HOP_KINDS.includes(kind)) throw new Error(`PROVIDER_TRACE_HOP_KIND_INVALID:${index}`);
  const uri = requireHttpUri(raw.uri, `PROVIDER_TRACE_HOP_URI_REQUIRED:${index}`);
  const checkedAt = requireInstant(raw.checked_at, `PROVIDER_TRACE_HOP_CHECKED_AT_REQUIRED:${index}`);
  const result = text(raw.result);
  if (!HOP_RESULTS.includes(result)) throw new Error(`PROVIDER_TRACE_HOP_RESULT_INVALID:${index}`);
  const status = raw.http_status == null ? null : Number(raw.http_status);
  if (status != null && (!Number.isSafeInteger(status) || status < 100 || status > 599)) {
    throw new Error(`PROVIDER_TRACE_HOP_HTTP_STATUS_INVALID:${index}`);
  }
  // 404/403 同样是证据，但必须写明"这一跳没拿到"，不许留白让下游猜。
  if (result === 'ok' && status != null && status >= 400) {
    throw new Error(`PROVIDER_TRACE_HOP_RESULT_CONTRADICTS_STATUS:${index}`);
  }
  if (result !== 'ok' && status != null && status < 400 && result !== 'redirected') {
    throw new Error(`PROVIDER_TRACE_HOP_RESULT_CONTRADICTS_STATUS:${index}`);
  }
  const responseSha = raw.response_sha256 == null ? null : String(raw.response_sha256);
  if (responseSha != null && !HEX.test(responseSha)) {
    throw new Error(`PROVIDER_TRACE_HOP_RESPONSE_SHA_INVALID:${index}`);
  }
  return {
    seq: index + 1,
    kind,
    uri,
    checked_at: checkedAt.toISOString(),
    result,
    http_status: status,
    response_sha256: responseSha,
    note: text(raw.note) || null,
  };
}

// 三层许可必须分开：聚合元数据许可、数字副本权利、馆藏身份。
// 规范反例就是"把聚合元数据 CC0 等同图像许可"，因此复用了聚合证据的数字副本许可直接拒绝。
function normalizeRightsLayers(raw, { aggregatedUri = null } = {}) {
  if (!isObject(raw)) throw new Error('PROVIDER_TRACE_RIGHTS_LAYERS_REQUIRED');
  const out = {};
  for (const layer of RIGHTS_LAYERS) {
    const item = raw[layer];
    if (!isObject(item)) throw new Error(`PROVIDER_TRACE_RIGHTS_LAYER_MISSING:${layer}`);
    const state = text(item.state);
    if (!RIGHTS_STATES.includes(state)) throw new Error(`PROVIDER_TRACE_RIGHTS_LAYER_STATE_INVALID:${layer}`);
    const evidence = item.evidence_ref ?? null;
    let evidenceRef = null;
    if (evidence != null) {
      if (!isObject(evidence)) throw new Error(`PROVIDER_TRACE_RIGHTS_EVIDENCE_INVALID:${layer}`);
      evidenceRef = {
        uri: requireHttpUri(evidence.uri, `PROVIDER_TRACE_RIGHTS_EVIDENCE_URI_REQUIRED:${layer}`),
        checked_at: requireInstant(evidence.checked_at, `PROVIDER_TRACE_RIGHTS_EVIDENCE_CHECKED_AT_REQUIRED:${layer}`)
          .toISOString(),
        quote: text(evidence.quote) || null,
      };
    }
    // 声称已获许可却没有许可证据，就是无据授权。
    if ((state === 'licensed' || state === 'denied') && evidenceRef == null) {
      throw new Error(`PROVIDER_TRACE_RIGHTS_EVIDENCE_REQUIRED:${layer}`);
    }
    out[layer] = {
      state,
      statement: text(item.statement) || null,
      evidence_ref: evidenceRef,
      applies_to: Array.isArray(item.applies_to) ? item.applies_to.map(text).filter(Boolean) : [],
    };
  }
  const aggregateUri = out.aggregation_metadata_license.evidence_ref?.uri ?? null;
  const copyUri = out.digital_copy_rights.evidence_ref?.uri ?? null;
  // 聚合侧元数据许可（哪怕写着 CC0）或聚合/镜像页本身，都不能充当数字副本许可的证据。
  if (out.digital_copy_rights.state === 'licensed' && copyUri != null
    && (copyUri === aggregateUri || copyUri === aggregatedUri)) {
    throw new Error('PROVIDER_TRACE_AGGREGATE_LICENSE_REUSED_AS_IMAGE_RIGHTS');
  }
  return out;
}

/**
 * 从调用方给出的回溯材料派生 OriginalProviderTrace。
 * 只接受"真的查过"的材料：每跳有 URI/核查时刻/结果，原馆身份有编号与核查时刻；
 * 查不回来就只能是 UNRESOLVED，且不得携带任何馆藏身份值。
 */
export function deriveOriginalProviderTrace({
  catalogEntryId, aggregatedRecord, originalProvider, holdingRef, hops,
  rightsLayers, checkedAt, correctionOf,
} = {}) {
  if (typeof catalogEntryId !== 'string' || !UUID.test(catalogEntryId)) {
    throw new Error('PROVIDER_TRACE_CATALOG_REF_REQUIRED');
  }
  if (correctionOf != null && (typeof correctionOf !== 'string' || !UUID.test(correctionOf))) {
    throw new Error('PROVIDER_TRACE_CORRECTION_INVALID');
  }
  if (!isObject(aggregatedRecord)) throw new Error('PROVIDER_TRACE_AGGREGATED_RECORD_REQUIRED');
  const aggregated = {
    provider: text(aggregatedRecord.provider) || null,
    record_uri: requireHttpUri(aggregatedRecord.record_uri, 'PROVIDER_TRACE_AGGREGATED_RECORD_URI_REQUIRED'),
    data_provider: text(aggregatedRecord.data_provider) || null,
    holding_field: text(aggregatedRecord.holding_field) || null,
    license_field: text(aggregatedRecord.license_field) || null,
  };
  if (!aggregated.provider) throw new Error('PROVIDER_TRACE_AGGREGATED_PROVIDER_REQUIRED');

  if (!Array.isArray(hops) || hops.length === 0) throw new Error('PROVIDER_TRACE_HOPS_REQUIRED');
  const chain = hops.map(normalizeHop);
  const seen = new Set();
  for (const hop of chain) {
    // 同一 URI 在同一链上重复出现说明有一跳没真的往下走，链路不成立。
    if (seen.has(hop.uri)) throw new Error(`PROVIDER_TRACE_HOP_REPEATED:${hop.seq}`);
    seen.add(hop.uri);
  }
  const checked = requireInstant(checkedAt, 'PROVIDER_TRACE_CHECKED_AT_REQUIRED');
  // 回溯时刻不得早于链上任一跳：声称"核查于某时"却引用了更晚的观察，属于伪造时刻。
  for (const hop of chain) {
    if (new Date(hop.checked_at).getTime() > checked.getTime()) {
      throw new Error(`PROVIDER_TRACE_CHECKED_AT_BEFORE_HOP:${hop.seq}`);
    }
  }

  const original = isObject(originalProvider) ? originalProvider : {};
  const catalogNo = text(original.catalog_no) || null;
  const provider = text(original.provider) || null;
  const originalUri = text(original.uri) || null;
  const holding = isObject(holdingRef) ? holdingRef : {};
  const holdingValue = text(holding.value) || null;
  const originState = provider && catalogNo && originalUri ? 'RESOLVED' : 'UNRESOLVED';

  if (originState === 'RESOLVED') {
    const uri = requireHttpUri(originalUri, 'PROVIDER_TRACE_ORIGINAL_URI_INVALID');
    // 回源必须有"真的打开了原馆记录"的那一跳，否则只是声称。
    const reached = chain.some((hop) => hop.result === 'ok'
      && (hop.kind === 'provider_catalog' || hop.kind === 'provider_manifest' || hop.kind === 'holding'));
    if (!reached) throw new Error('PROVIDER_TRACE_RESOLVED_HOPS_UNTRACEABLE');
    // 链路要从聚合一侧走到原馆一侧：只有一条聚合跳就宣布回源成功是不成立的。
    if (!chain.some((hop) => hop.kind === 'aggregator' || hop.kind === 'aggregator_record')) {
      throw new Error('PROVIDER_TRACE_RESOLVED_WITHOUT_AGGREGATOR_HOP');
    }
    return {
      schema: PROVIDER_TRACE_SCHEMA,
      catalog_entry_id: catalogEntryId,
      origin_state: originState,
      aggregated_record: aggregated,
      original_provider: {
        provider, catalog_no: catalogNo, uri,
        version_note: text(original.version_note) || null,
        provider_record_title: text(original.record_title) || null,
      },
      holding_ref: {
        state: holdingValue ? 'resolved' : 'candidate',
        value: holdingValue,
        kind: text(holding.kind) || null,
        note: text(holding.note) || null,
      },
      rights_layers: normalizeRightsLayers(rightsLayers, { aggregatedUri: aggregated.record_uri }),
      provenance: { hops: chain, chain_complete: true, unresolved_reason: null },
      checked_at: checked.toISOString(),
      method: { key: INTAKE_PROVIDER_TRACE_METHOD, version: INTAKE_PROVIDER_TRACE_METHOD_VERSION },
      correction_of: correctionOf ?? null,
    };
  }

  // 未回源：只保留聚合线索。规范明令"未回源不填写虚构馆藏身份"，
  // 所以这里连原馆编号都不允许带出来，更不允许给 holding 编一个值。
  if (catalogNo || originalUri || holdingValue) {
    throw new Error('PROVIDER_TRACE_UNRESOLVED_WITH_INVENTED_HOLDING');
  }
  const reason = text(holding?.note) || text(aggregatedRecord?.unresolved_reason);
  if (!reason) throw new Error('PROVIDER_TRACE_UNRESOLVED_REASON_REQUIRED');
  return {
    schema: PROVIDER_TRACE_SCHEMA,
    catalog_entry_id: catalogEntryId,
    origin_state: originState,
    aggregated_record: aggregated,
    original_provider: { provider, catalog_no: null, uri: null, version_note: null, provider_record_title: null },
    holding_ref: { state: 'unresolved', value: null, kind: null, note: reason },
    rights_layers: normalizeRightsLayers(rightsLayers, { aggregatedUri: aggregated.record_uri }),
    provenance: { hops: chain, chain_complete: false, unresolved_reason: reason },
    checked_at: checked.toISOString(),
    method: { key: INTAKE_PROVIDER_TRACE_METHOD, version: INTAKE_PROVIDER_TRACE_METHOD_VERSION },
    correction_of: correctionOf ?? null,
  };
}
