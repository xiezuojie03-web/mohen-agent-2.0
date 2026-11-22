begin;

-- 有效权利投影（M5，长期规则）。
--
-- 事实：`source.source_versions.rights_snapshot` 在来源登记时固定，且一旦被
-- `mab.private-text-reading.v1` 私读覆盖，`studio.protect_private_text_reading`
-- 会拒绝对该版本的任何 update/delete（`PRIVATE_READING_IMMUTABLE`）。因此 Owner
-- 在"读过之后"作出的权利决定永远无法写回版本快照，而其它的 Owner 权利记录
-- （`source.sources.rights_by_action` 与 `source.sources.rights_evidence`）本身
-- 是可追加、带决定人/时间/依据的事实。
--
-- 长期做法：把"版本快照"与"事后显式决定"分开处理，而不是放宽不可变性。
--   · 版本快照（pin）继续约束内容相关动作，永不因事后决定被改写；
--   · 外发等动作取"有效权利" = 快照 ∪ 显式可放大的 Owner 决定；
--   · 只有同时满足下列全部条件才放大，否则保持快照原值（失败关闭）：
--       1) 来源当前逐动作权限为 allowed；
--       2) 权利证据里存在该动作的 decision='allowed'，且 decided_at / decided_by 齐全；
--       3) 快照里该动作不是 denied / restricted（对齐"不得推翻已钉死拒绝"）。
--   · 每次放大都能被审计：证据对象本身即来源 sig，无需二次写库。

create or replace function source.effective_rights_by_action(
  p_snapshot jsonb,
  p_live jsonb,
  p_evidence jsonb
) returns jsonb
language plpgsql
immutable
set search_path to 'pg_catalog'
as $function$
declare
  result jsonb := '{}'::jsonb;
  entry record;
  action text;
  live_value text;
  pinned_value text;
  decision jsonb;
begin
  if jsonb_typeof(p_snapshot) = 'object' then
    for entry in select key, value from jsonb_each(p_snapshot) loop
      if jsonb_typeof(entry.value) = 'string' then
        result := result || jsonb_build_object(entry.key, entry.value);
      end if;
    end loop;
  end if;
  if jsonb_typeof(p_live) is distinct from 'object' then return result; end if;
  for entry in select key, value from jsonb_each(p_live) loop
    action := entry.key;
    live_value := case when jsonb_typeof(entry.value) = 'string' then entry.value #>> '{}' end;
    if live_value is distinct from 'allowed' then continue; end if;
    pinned_value := result->>action;
    if pinned_value = 'allowed' then continue; end if;
    if pinned_value in ('denied','restricted') then continue; end if;
    if jsonb_typeof(p_evidence) is distinct from 'object' then continue; end if;
    decision := p_evidence->(action || '_decision');
    if decision is null or jsonb_typeof(decision) is distinct from 'object' then continue; end if;
    if coalesce(decision->>'decision','') is distinct from 'allowed' then continue; end if;
    if coalesce(decision->>'decided_at','') = '' then continue; end if;
    if coalesce(decision->>'decided_by','') = '' then continue; end if;
    result := result || jsonb_build_object(action, to_jsonb('allowed'::text));
  end loop;
  return result;
end
$function$;

revoke all on function source.effective_rights_by_action(jsonb,jsonb,jsonb)
  from public, anon, authenticated, service_role;

comment on function source.effective_rights_by_action(jsonb,jsonb,jsonb) is
  'Effective per-action rights for consumption gates: the immutable source-version snapshot, widened only by an explicit recorded owner decision (allowed + decided_at + decided_by) and never over a pinned denied/restricted value.';

-- 只改投影来源，不碰 pin 本身，也不改不可变触发器。
create or replace function studio.private_source_registration(p_original uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
 set jit to 'off'
as $function$
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
  'rights',s.rights,
  'rights_by_action',source.effective_rights_by_action(v.rights_snapshot,s.rights_by_action,s.rights_evidence),
  'rights_snapshot',v.rights_snapshot,
  'rights_evidence',s.rights_evidence,
  'asset_revision_id',original.asset_revision_id,
  'original_locator',s.original_locator,
  'provenance_status',s.provenance_status,'content_availability',s.content_availability,
  'artifact_revision',control.artifact_revision_for('raw_item',raw.raw_item_id),
  'source_version_artifact_revision',control.artifact_revision_for('source_version',v.source_version_id));
end $function$;

commit;
