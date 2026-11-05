-- MAB M5 / ST-02: project-scoped, read-only private L1/L2 context.
-- No direct source/evidence table grants are added to mohen_app_runtime.
-- The returned JSON deliberately omits storage_key and source.read_units.payload_ref.
create or replace function studio.read_private_text_reading(p_original uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $mab_read$
declare
  original studio.private_originals;
  result jsonb;
begin
  original := studio.private_bridge_original(p_original);

  select jsonb_build_object(
    'schema','mohen.private-reading-context.v1',
    'original_id',original.original_id,
    'project_id',original.project_id,
    'asset_id',original.asset_id,
    'asset_revision_id',original.asset_revision_id,
    'file_name',original.file_name,
    'content_type',original.content_type,
    'byte_size',original.byte_size,
    'sha256',original.sha256,
    'original_state',original.state,
    'readings',coalesce((
      select jsonb_agg(q.reading order by q.created_at desc,q.ordinal)
      from (
        select r.created_at,u.ordinal,
          jsonb_build_object(
            'layer','L1',
            'qualification','UNASSESSED',
            'read_run_id',r.read_run_id,
            'read_unit_id',u.read_unit_id,
            'source_id',v.source_id,
            'source_version_id',v.source_version_id,
            'source_checksum_sha256',v.checksum_sha256,
            'raw_item_id',raw.raw_item_id,
            'raw_checksum_sha256',raw.checksum_sha256,
            'method_code',u.method_code,
            'kind',u.kind,
            'locator_schema',u.locator_schema,
            'locator',u.locator,
            'locator_hash',u.locator_hash,
            'ordinal',u.ordinal,
            'uncertainty',u.uncertainty,
            'evidence',coalesce((
              select jsonb_agg(jsonb_build_object(
                'layer','L2',
                'qualification','UNASSESSED',
                'link_id',l.link_id,
                'evidence_id',e.evidence_id,
                'source_id',e.source_id,
                'source_version_id',e.source_version_id,
                'raw_item_id',e.raw_item_id,
                'locator',e.locator,
                'modality',e.modality,
                'literal_reading',e.literal_reading,
                'uncertainty',e.uncertainty,
                'extraction_method',e.extraction_method,
                'maturity',e.maturity,
                'link_version',l.link_version,
                'key_version',l.byte_verification_receipt->>'key_version',
                'verified_at',l.byte_verification_receipt->>'verified_at'
              ) order by l.extent_order,l.link_id)
              from evidence.read_unit_evidence_links l
              join evidence.material_evidence e on e.evidence_id=l.evidence_id
              join control.original_bridge_verification_keys k
                on k.key_version=l.byte_verification_receipt->>'key_version' and k.is_active
              where l.read_unit_id=u.read_unit_id
                and l.read_run_id=r.read_run_id
                and l.link_version='mab.private-read-bridge.v1'
                and l.byte_verification_receipt->>'status'='VERIFIED'
                and l.selected_extent=u.locator
                and l.quote_snapshot_hash=u.locator_hash
                and e.locator=u.locator
                and e.source_id=v.source_id
                and e.source_version_id=v.source_version_id
                and e.raw_item_id=raw.raw_item_id
                and e.literal_reading is not null
            ),'[]'::jsonb)
          ) as reading
        from source.read_runs r
        join source.read_units u on u.read_run_id=r.read_run_id
        join source.raw_items raw on raw.raw_item_id=r.raw_item_id
        join source.source_versions v on v.source_version_id=raw.source_version_id
        join control.original_bridge_verification_keys run_key
          on run_key.key_version=r.config->'byte_verification_receipt'->>'key_version'
          and run_key.is_active
        where r.status='done'
          and r.input_sha256=original.sha256
          and r.config->>'schema'='mab.private-text-reading.v1'
          and r.config->>'private_original_id'=original.original_id::text
          and r.config->>'project_id'=original.project_id::text
          and r.config->>'original_revision_id'=original.asset_revision_id::text
          and r.config->'byte_verification_receipt'->>'status'='VERIFIED'
          and raw.checksum_sha256=original.sha256
          and raw.byte_size=original.byte_size
          and v.checksum_sha256=original.sha256
          and u.locator_schema='utf8_byte_range/v1'
          and u.locator->>'source_version_id'=v.source_version_id::text
          and u.locator->>'raw_item_id'=raw.raw_item_id::text
          and u.locator->>'raw_sha256'=original.sha256
          and u.locator->>'quote_sha256'=u.locator_hash
          and u.payload_ref=raw.storage_ref
          and studio.private_source_binding_matches(
            original.original_id,v.source_version_id,raw.raw_item_id,original.sha256
          )
        order by r.created_at desc,u.ordinal
        limit 50
      ) q
    ),'[]'::jsonb),
    'readings_limit',50,
    'direct_storage_reference_exposed',false
  ) into result;

  return result;
end;
$mab_read$;

revoke all on function studio.read_private_text_reading(uuid)
  from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.read_private_text_reading(uuid) to mohen_app_runtime;

comment on function studio.read_private_text_reading(uuid) is
  'MAB M5 ST-02 owner/project scoped read-only L1/L2 snapshot. No storage keys or direct source/evidence grants.';
