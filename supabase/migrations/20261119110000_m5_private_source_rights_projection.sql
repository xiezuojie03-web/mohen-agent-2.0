-- M5 development DB alignment: make per-action rights a first-class, version-bound projection.
--
-- This is additive. Existing free-form source.sources.rights is preserved as provenance
-- metadata and is NEVER inferred into the action dictionary. New columns default to {}
-- (all actions unknown => HOLD). Apply only to the non-production mohen-cloud project;
-- this does not authorize production migration or public release.

begin;

create or replace function source.is_rights_actions_valid(p jsonb)
returns boolean
language sql immutable set search_path=pg_catalog as $$
  select coalesce(
    jsonb_typeof(p) = 'object'
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key not in ('access_view','machine_read','retain','download',
                          'quote','display','adapt','redistribute','external_processing')
         or jsonb_typeof(e.value) <> 'string'
         or (e.value #>> '{}') not in ('allowed','denied','unknown','restricted')
    ), false)
$$;

alter table source.sources
  add column if not exists rights_by_action jsonb not null default '{}'::jsonb,
  add column if not exists rights_evidence jsonb not null default '{}'::jsonb;

alter table source.source_versions
  add column if not exists rights_snapshot jsonb not null default '{}'::jsonb;

-- Replace weaker object-only checks if the local-isolated migration already installed them.
alter table source.sources
  drop constraint if exists sources_rights_by_action_object,
  drop constraint if exists sources_rights_evidence_object;
alter table source.sources
  add constraint sources_rights_by_action_object
    check (jsonb_typeof(rights_by_action) = 'object' and source.is_rights_actions_valid(rights_by_action)),
  add constraint sources_rights_evidence_object
    check (jsonb_typeof(rights_evidence) = 'object');

alter table source.source_versions
  drop constraint if exists source_versions_rights_snapshot_object;
alter table source.source_versions
  add constraint source_versions_rights_snapshot_object
    check (jsonb_typeof(rights_snapshot) = 'object' and source.is_rights_actions_valid(rights_snapshot));

create or replace function source.forbid_rights_snapshot_mutation()
returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if jsonb_typeof(new.rights_snapshot) is distinct from 'object'
     or not source.is_rights_actions_valid(new.rights_snapshot) then
    raise exception 'RIGHTS_SNAPSHOT_INVALID';
  end if;
  if old.rights_snapshot is distinct from '{}'::jsonb then
    raise exception 'RIGHTS_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end
$$;

drop trigger if exists source_versions_rights_snapshot_immutable on source.source_versions;
create trigger source_versions_rights_snapshot_immutable
  before update of rights_snapshot on source.source_versions
  for each row execute function source.forbid_rights_snapshot_mutation();

comment on column source.sources.rights_by_action is
  'Explicit per-action permission dictionary (mohen.rights-actions.v1). Empty/missing action = unknown = HOLD; never inferred from legacy rights metadata, provider category or license labels.';
comment on column source.sources.rights_evidence is
  'Evidence references for explicit per-action permissions. Empty = no evidence; presence does not replace independent G0 review.';
comment on column source.source_versions.rights_snapshot is
  'Per-action rights snapshot fixed at source-version registration; immutable once non-empty.';

-- Keep the exact Owner-scoped read helper, but expose the version's immutable rights snapshot.
-- The legacy free-form rights field remains available for provenance display only.
create or replace function studio.private_source_registration(p_original uuid)
returns jsonb
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals;
 raw source.raw_items;
 v source.source_versions;
 s source.sources;
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
  'rights_by_action',v.rights_snapshot,
  'rights_snapshot',v.rights_snapshot,
  'rights_evidence',s.rights_evidence,
  'asset_revision_id',original.asset_revision_id,
  'original_locator',s.original_locator,
  'provenance_status',s.provenance_status,
  'content_availability',s.content_availability,
  'artifact_revision',control.artifact_revision_for('raw_item',raw.raw_item_id),
  'source_version_artifact_revision',control.artifact_revision_for('source_version',v.source_version_id));
end
$$;

revoke all on function studio.private_source_registration(uuid)
  from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer,mohen_private_worker;
grant execute on function studio.private_source_registration(uuid) to mohen_app_runtime;

commit;
