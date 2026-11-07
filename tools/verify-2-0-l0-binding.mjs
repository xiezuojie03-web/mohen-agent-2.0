// Read-only: inspect the L0 source registration bound to the private originals.
import { queryRows } from "../packages/data-access/src/index.mjs";

const out = {};
out.raw_item_columns = await queryRows(`
  select column_name from information_schema.columns
  where table_schema='source' and table_name='raw_items' order by ordinal_position`);
out.originals = await queryRows(`
  select o.original_id::text, o.project_id::text, o.content_type, o.state, o.byte_size, o.sha256,
         o.storage_bucket || '/' || o.storage_key as storage_ref, o.asset_revision_id::text
  from studio.private_originals o order by o.created_at`);
out.raw_items = await queryRows(`
  select r.raw_item_id::text, r.source_version_id::text, r.storage_ref, r.checksum_sha256,
         r.byte_size, to_jsonb(r)::text as row
  from source.raw_items r
  where r.storage_ref like 'mohen-private-originals/%' order by r.raw_item_id`);
out.sources = await queryRows(`
  select s.source_id::text, s.provider, s.title, s.source_type, s.carrier_type,
         s.source_uri_or_catalog_no, s.rights::text,
         (select count(*) from source.source_versions v where v.source_id = s.source_id) as versions
  from source.sources s
  where s.source_id in (
    select v.source_id from source.source_versions v
    join source.raw_items r on r.source_version_id = v.source_version_id
    where r.storage_ref like 'mohen-private-originals/%')`);
out.read_units_c02 = await queryRows(`
  select u.read_unit_id::text, u.method_code, u.kind, u.locator_schema, u.locator::text, u.ordinal,
         u.payload_ref, u.locator_hash
  from source.read_units u
  join source.read_runs r on r.read_run_id = u.read_run_id
  where r.raw_item_id in (
    select raw_item_id from source.raw_items where storage_ref like 'mohen-private-originals/%')`);
out.source_version_detail = await queryRows(`
  select to_jsonb(v)::text as version_row from source.source_versions v
  where v.source_id in (
    select s.source_id from source.sources s
    join source.raw_items r on true
    where r.storage_ref like 'mohen-private-originals/%')`);
out.loose_read_runs = await queryRows(`
  select r.read_run_id::text, r.production_run_id::text, r.raw_item_id::text, r.method_set::text,
         r.engine, r.config->>'schema' as config_schema, r.status
  from source.read_runs r
  where r.raw_item_id is null or jsonb_typeof(r.method_set) = 'object'`);
console.log(JSON.stringify(out, null, 2));
