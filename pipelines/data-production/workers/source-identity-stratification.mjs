// Y05「来源对象、版本与依赖鉴别」在来源准入侧的身份分层（D00 第五道工序）。
//
// 边界（与迁移 D00-C4 一致：Y05 产出即 source.sources/source_versions 既有身份，
// 不建新表，核查动作由 Y03 承载）：
//   * 分层只由本次准入已逐项核验的登记/原件真值派生，逐层标 known/unknown 与证据；
//     本次没读到的层（如馆内收藏体系）如实 unknown，不拿提供方冒充收藏。
//   * 数字资产层必须与库存原件字节一致；登记与原件不复核一致即失败关闭。
//   * 版本层必须带不可变修订（artifact_revision），没有修订的"版本"不是身份。
//   * 本模块不写库；分层结论随 D00 候选输出存证，并作为 Y07 candidate_ref/
//     dependency_refs 与 Y08 取得回执的同一份派生源。
export const IDENTITY_STRATIFICATION_SCHEMA = 'mohen.source-identity-stratification.v1';
export const INTAKE_IDENTITY_METHOD = 'D00/Y05:intake_identity';
export const INTAKE_IDENTITY_METHOD_VERSION = 'v1';

const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

// 准入刚做过的核验是分层的唯一基础；不复核就写"身份"等于让工序替环境背书。
function requireIntakeFacts(registration, record) {
  if (!isPlainObject(registration)) throw new Error('IDENTITY_REGISTRATION_REQUIRED');
  if (!isPlainObject(record)) throw new Error('IDENTITY_ORIGINAL_REQUIRED');
  if (!nonEmpty(registration.provider) || !nonEmpty(registration.title)) {
    throw new Error('IDENTITY_ANCHOR_REQUIRED');
  }
  if (record.state !== 'STORED_VERIFIED' || !HEX.test(record.sha256 ?? '') ||
      record.sha256 !== registration.sha256 ||
      record.content_type !== registration.content_type ||
      record.byte_size !== registration.byte_size) {
    throw new Error('IDENTITY_ORIGINAL_NOT_VERIFIED');
  }
  if (!UUID.test(registration.original_id ?? '') ||
      !UUID.test(registration.source_version_id ?? '') ||
      !UUID.test(registration.raw_item_id ?? '')) {
    throw new Error('IDENTITY_REGISTRATION_INVALID');
  }
  if (!HEX.test(registration.source_version_artifact_revision ?? '')) {
    throw new Error('IDENTITY_VERSION_REVISION_INVALID');
  }
}

/**
 * 从本次准入的真值派生身份分层：提供方/收藏/目录记录/作品/版本/藏所/数字资产。
 * @returns {{schema:string,method:string,layers:Array<object>,dependencies:object}}
 */
export function deriveSourceIdentityStratification({ registration, record } = {}) {
  requireIntakeFacts(registration, record);
  const locator = isPlainObject(registration.original_locator) ? registration.original_locator : {};
  const catalogNo = nonEmpty(locator.catalog_no);
  const item = locator.item != null ? locator.item : null;

  const layers = [
    { layer: 'provider', state: 'known',
      value: { name: registration.provider.trim() },
      evidence: ['registration.provider'] },
    // 馆内收藏体系（哪一套/哪一库）本次没有读：如实 unknown，不拿提供方冒充收藏。
    { layer: 'collection', state: 'unknown',
      evidence: ['not_read:this_intake'] },
    catalogNo
      ? { layer: 'catalog_record', state: 'known',
          value: { catalog_no: catalogNo, ...(item != null ? { item } : {}) },
          evidence: ['registration.original_locator'] }
      : { layer: 'catalog_record', state: 'unknown',
          evidence: ['not_in_registration:original_locator.catalog_no'] },
    { layer: 'work', state: 'known',
      value: { title: registration.title.trim() },
      evidence: ['registration.title'] },
    { layer: 'version', state: 'known',
      value: { source_version_id: registration.source_version_id,
        artifact_revision: registration.source_version_artifact_revision,
        ...(nonEmpty(registration.source_type) ? { source_type: registration.source_type } : {}),
        ...(nonEmpty(registration.carrier_type) ? { carrier_type: registration.carrier_type } : {}) },
      evidence: ['registration.source_version_id', 'registration.source_version_artifact_revision'] },
    // 藏所：登记的提供方同时给出了馆方目录号/件号，即该馆藏品；有没有第二个藏所本次未读。
    { layer: 'holding', state: 'known',
      value: { institution: registration.provider.trim(),
        locator: { ...(catalogNo ? { catalog_no: catalogNo } : {}), ...(item != null ? { item } : {}) } },
      evidence: ['registration.provider', 'registration.original_locator'] },
    { layer: 'digital_asset', state: 'known',
      value: { raw_item_id: registration.raw_item_id, sha256: record.sha256,
        byte_size: record.byte_size, content_type: record.content_type,
        storage_state: 'STORED_VERIFIED' },
      evidence: ['storage_readback_sha256'] },
  ];

  const unresolved = layers.filter((layer) => layer.state !== 'known').map((layer) => layer.layer);
  return {
    schema: IDENTITY_STRATIFICATION_SCHEMA,
    method: `${INTAKE_IDENTITY_METHOD}@${INTAKE_IDENTITY_METHOD_VERSION}`,
    layers,
    // 依赖方向：字节归于版本，版本是作品的这一版，作品由目录记录指认，
    // 目录记录属于提供方的某套收藏（收藏未读 → 如实列入 unresolved）。
    dependencies: {
      digital_asset_depends_on: ['version'],
      version_depends_on: ['work'],
      work_identified_by: ['catalog_record'],
      catalog_record_depends_on: ['provider', 'collection'],
      unresolved,
    },
  };
}
