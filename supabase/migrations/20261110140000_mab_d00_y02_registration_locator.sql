-- D00 Y02: private_source_registration 增加目录观察所需的三个真实字段。
-- 为什么：Y02 资源目录条目必须登记"对方目录里它叫什么"（馆方目录号），
-- 该真值在 source.sources.original_locator.catalog_no；本函数是 D00 唯一的
-- 登记读取通道。只加输出键，不改任何绑定校验、不放宽访问；provenance_status
-- 与 content_availability 一并带出，供条目证据与覆盖线索如实引用。
begin;
create or replace function studio.private_source_registration(p_original uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals; raw source.raw_items; v source.source_versions; s source.sources;
begin
 original:=studio.private_bridge_original(p_original);
 perform 1 from studio.private_originals where original_id=p_original for share;
 select * into raw from source.raw_items
  where storage_ref=original.storage_bucket||'/'||original.storage_key
    and checksum_sha256=original.sha256 and byte_size=original.byte_size;
 if raw.raw_item_id is null then raise exception 'PRIVATE_SOURCE_REGISTRATION_NOT_BOUND'; end if;
 select * into v from source.source_versions where source_version_id=raw.source_version_id;
 select * into s from source.sources where source_id=v.source_id;
 if v.source_version_id is null or s.source_id is null
  or v.checksum_sha256 is distinct from original.sha256
  or not exists(select 1 from studio.asset_revisions a
     where a.revision_id=original.asset_revision_id and a.asset_id=original.asset_id
       and a.content_hash=original.sha256
       and a.payload_storage_ref=original.storage_bucket||'/'||original.storage_key)
  or not studio.private_source_binding_matches(p_original,v.source_version_id,raw.raw_item_id,original.sha256)
  then raise exception 'PRIVATE_SOURCE_REGISTRATION_NOT_BOUND'; end if;
 return jsonb_build_object(
  'schema','mohen.private-source-registration.v1',
  'original_id',p_original,'project_id',original.project_id,
  'source_id',s.source_id,'source_version_id',v.source_version_id,'raw_item_id',raw.raw_item_id,
  'sha256',original.sha256,'byte_size',original.byte_size,
  'content_type',original.content_type,
  'storage_ref',original.storage_bucket||'/'||original.storage_key,
  'provider',s.provider,'title',s.title,'source_type',s.source_type,'carrier_type',s.carrier_type,
  'rights',s.rights,'asset_revision_id',original.asset_revision_id,
  'original_locator',s.original_locator,
  'provenance_status',s.provenance_status,'content_availability',s.content_availability,
  'artifact_revision',control.artifact_revision_for('raw_item',raw.raw_item_id),
  'source_version_artifact_revision',control.artifact_revision_for('source_version',v.source_version_id));
end $$;
revoke all on function studio.private_source_registration(uuid)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.private_source_registration(uuid) to mohen_app_runtime;
commit;
