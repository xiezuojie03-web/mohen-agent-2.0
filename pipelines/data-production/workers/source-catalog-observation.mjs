// Y02「机构集合与多渠道来源发现」的准入侧观察（D00 第二道工序）。
//
// 边界：
//   * 条目只从本次准入**已真实核验**的登记信息派生（提供方/题名/目录号/载体/权利线索），
//     不让调用方代填——那样的"Y02"只是抄表，不是工序。
//   * 本次运行没有读到的字段保持缺失：语言未读 → null，不补默认、不推断。
//   * 可用性只声称 catalog_found：准入已证明"在册 + 绑定一致 + 字节已核验"；
//     是否取得、取得多少由 Y07/Y04 记录，不在本条目里冒充。
//   * 本模块不写库；写入口仍是 source-discovery-repository.mjs 的 recordCatalogEntry。
export const CATALOG_OBSERVATION_SCHEMA = 'mohen.source-catalog-observation.v1';
export const INTAKE_DISCOVERY_METHOD = 'D00/Y02:intake_registration';
export const INTAKE_DISCOVERY_METHOD_VERSION = 'v1';

const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const nonEmpty = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

export function deriveIntakeCatalogEntry({ registration, record } = {}) {
  if (!isPlainObject(registration)) throw new Error('SOURCE_CATALOG_REGISTRATION_REQUIRED');
  if (!isPlainObject(record)) throw new Error('SOURCE_CATALOG_ORIGINAL_REQUIRED');
  const provider = nonEmpty(registration.provider);
  const title = nonEmpty(registration.title);
  if (!provider || !title) throw new Error('SOURCE_CATALOG_REGISTRATION_IDENTITY_REQUIRED');
  // catalog_found 的依据是准入刚做完的两件真事：原件 STORED_VERIFIED 且与登记逐项一致。
  // 不复核就直接写可用性，等于让工序替运行环境背书。
  if (record.state !== 'STORED_VERIFIED' || !HEX.test(record.sha256 ?? '') ||
      record.sha256 !== registration.sha256 ||
      record.content_type !== registration.content_type ||
      record.byte_size !== registration.byte_size)
    throw new Error('SOURCE_CATALOG_ORIGINAL_NOT_VERIFIED');
  if (!UUID.test(registration.original_id ?? '') ||
      !UUID.test(registration.source_version_id ?? '') ||
      !UUID.test(registration.raw_item_id ?? ''))
    throw new Error('SOURCE_CATALOG_REGISTRATION_INVALID');

  const locator = isPlainObject(registration.original_locator) ? registration.original_locator : {};
  // 对方目录里它叫什么：有真值就登记，没有就如实留空（无编号条目本就合法）。
  const catalogIdentifier = nonEmpty(locator.catalog_no);
  const carrierHint = nonEmpty(registration.carrier_type);
  const coverageHint = {};
  if (nonEmpty(registration.content_availability)) coverageHint.content_availability = registration.content_availability.trim();
  const rightsHint = isPlainObject(registration.rights) ? registration.rights : {};

  return {
    provider,
    catalogTitle: title,
    catalogIdentifier,
    carrierHint,
    language: null,
    coverageHint,
    rightsHint,
    availabilityState: 'catalog_found',
    discoveredByMethod: INTAKE_DISCOVERY_METHOD,
    methodVersion: INTAKE_DISCOVERY_METHOD_VERSION,
    evidenceRef: {
      schema: CATALOG_OBSERVATION_SCHEMA,
      original_id: registration.original_id,
      source_id: UUID.test(registration.source_id ?? '') ? registration.source_id : null,
      source_version_id: registration.source_version_id,
      raw_item_id: registration.raw_item_id,
      asset_revision_id: UUID.test(registration.asset_revision_id ?? '') ? registration.asset_revision_id : null,
      source_version_artifact_revision: HEX.test(registration.source_version_artifact_revision ?? '')
        ? registration.source_version_artifact_revision : null,
      provenance_status: nonEmpty(registration.provenance_status),
      sha256: registration.sha256,
    },
  };
}
