-- M2 candidate-only L1 persistence. Requires separately authorized deployment.
-- Existing source tables remain the only L1 body. No Gate/qualification writes.
begin;
create index if not exists private_text_reading_raw_pin on source.read_runs(raw_item_id)
 where config->>'schema'='mab.private-text-reading.v1';
create or replace function studio.persist_private_text_reading(
 p_original uuid,p_read_run uuid,p_read_unit uuid,p_digest text,p_run uuid,
 p_extent jsonb,p_quote text,p_attestation text)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals; claims jsonb; encoded text; signature text; expected text;
 key_value text; crypto_schema text; now_ms bigint; receipt jsonb; config jsonb;
 r source.read_runs; u source.read_units; raw source.raw_items; v source.source_versions;
 payload_ref text; start_byte bigint; end_byte bigint;
begin
 original:=studio.private_bridge_original(p_original);
 perform 1 from studio.private_originals where original_id=p_original for share;
 if original.content_type is distinct from 'text/plain' or p_run is null or p_read_run is null or p_read_unit is null
  or p_digest is null or p_digest !~ '^[a-f0-9]{64}$' or p_quote is null or octet_length(p_quote)>32768
  or jsonb_typeof(p_extent) is distinct from 'object' or p_extent->>'kind' is distinct from 'utf8_byte_range/v1'
  or jsonb_typeof(p_extent->'start_byte') is distinct from 'number' or jsonb_typeof(p_extent->'end_byte') is distinct from 'number'
  or p_extent->>'start_byte' !~ '^[0-9]+$' or p_extent->>'end_byte' !~ '^[0-9]+$'
  then raise exception 'PRIVATE_READING_LOCATOR_INVALID';end if;
 -- Bound numeric conversion, exact UTF8 length and hash; the separate trusted
 -- service attests that these bytes actually came from this private original.
 if (p_extent->>'start_byte')::numeric>10485760 or (p_extent->>'end_byte')::numeric>10485760
  then raise exception 'PRIVATE_READING_LOCATOR_INVALID';end if;
 start_byte:=(p_extent->>'start_byte')::bigint;end_byte:=(p_extent->>'end_byte')::bigint;
 if start_byte<0 or end_byte<=start_byte or end_byte>original.byte_size or end_byte-start_byte<>octet_length(p_quote)
  or p_extent->>'raw_sha256' is distinct from original.sha256
  or p_extent->>'quote_sha256' is distinct from encode(control.sha256_bytes(convert_to(p_quote,'UTF8')),'hex')
  then raise exception 'PRIVATE_READING_QUOTE_MISMATCH';end if;
 if p_read_run is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-read-run:'||p_digest,'UTF8')),'hex'),1,32)::uuid
  or p_read_unit is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-read-unit:'||p_digest,'UTF8')),'hex'),1,32)::uuid
  then raise exception 'PRIVATE_READING_IDENTITY_INVALID';end if;
 perform 1 from control.production_runs where run_id=p_run
  and architecture_generation='mohen.six-stage.v1' and scope->>'project_id'=original.project_id::text for share;
 if not found then raise exception 'PRIVATE_READING_RUN_NOT_BOUND';end if;
 select * into raw from source.raw_items where raw_item_id=(p_extent->>'raw_item_id')::uuid for share;
 select * into v from source.source_versions where source_version_id=(p_extent->>'source_version_id')::uuid for share;
 if raw.raw_item_id is null or v.source_version_id is null or raw.source_version_id is distinct from v.source_version_id
  or not studio.private_source_binding_matches(p_original,v.source_version_id,raw.raw_item_id,original.sha256)
  then raise exception 'PRIVATE_READING_SOURCE_NOT_BOUND';end if;
 payload_ref:=original.storage_bucket||'/'||original.storage_key;
 begin
  if p_attestation is null or length(p_attestation)>100000 or p_attestation !~ '^[A-Za-z0-9_-]+\.[a-f0-9]{64}$'
   then raise exception 'PRIVATE_READING_BYTE_ATTESTATION_REQUIRED';end if;
  encoded:=split_part(p_attestation,'.',1);signature:=split_part(p_attestation,'.',2);
  claims:=convert_from(decode(translate(encoded,'-_','+/')||repeat('=',(4-length(encoded)%4)%4),'base64'),'UTF8')::jsonb;
  select verification_key into key_value from control.original_bridge_verification_keys where key_version=claims->>'kid' and is_active for share;
  if key_value is null then raise exception 'PRIVATE_READING_BYTE_ATTESTATION_REQUIRED';end if;
  select n.nspname into crypto_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
  execute format('select encode(%I.hmac($1,$2,''sha256''),''hex'')',crypto_schema) into expected using encoded,key_value;
  if signature is distinct from expected then raise exception 'PRIVATE_READING_BYTE_ATTESTATION_REQUIRED';end if;
  now_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  if claims->>'kind' is distinct from 'MOHEN_PRIVATE_TEXT_READING_V1'
   or claims->>'uid' is distinct from original.owner_user_id::text
   or claims->>'project_id' is distinct from original.project_id::text
   or claims->>'original_id' is distinct from p_original::text or claims->>'raw_sha256' is distinct from original.sha256
   or claims->>'run_id' is distinct from p_run::text or claims->>'read_run_id' is distinct from p_read_run::text
   or claims->>'read_unit_id' is distinct from p_read_unit::text or claims->>'request_digest' is distinct from p_digest
   or claims->'extent' is distinct from p_extent or claims->>'quote' is distinct from p_quote
   or jsonb_typeof(claims->'iat') is distinct from 'number' or jsonb_typeof(claims->'exp') is distinct from 'number'
   or (claims->>'iat')::bigint>now_ms+5000 or (claims->>'exp')::bigint<=now_ms
   or (claims->>'exp')::bigint<=(claims->>'iat')::bigint
   or (claims->>'exp')::bigint-(claims->>'iat')::bigint>30000
   then raise exception 'PRIVATE_READING_BYTE_ATTESTATION_REQUIRED';end if;
 exception when others then raise exception 'PRIVATE_READING_BYTE_ATTESTATION_REQUIRED';end;
 receipt:=jsonb_build_object('key_version',claims->>'kid','attestation_digest',encode(control.sha256_bytes(convert_to(encoded,'UTF8')),'hex'),'verified_at',clock_timestamp());
 config:=jsonb_build_object('schema','mab.private-text-reading.v1','private_original_id',p_original,
  'project_id',original.project_id,'request_digest',p_digest,'qualification','UNASSESSED','key_version',claims->>'kid');
 perform pg_advisory_xact_lock(hashtextextended('private-text-reading:'||p_read_run::text,0));
 select * into r from source.read_runs where read_run_id=p_read_run;
 if not found then
  insert into source.read_runs(read_run_id,production_run_id,raw_item_id,input_sha256,method_set,engine,config,version,status,manifest_hash)
  values(p_read_run,p_run,raw.raw_item_id,original.sha256,'["C01"]','deterministic',config||jsonb_build_object('byte_verification_receipt',receipt),'mab.private-text-reading.v1','done',p_digest);
  insert into source.read_units(read_unit_id,read_run_id,method_code,kind,locator_schema,locator,ordinal,payload_ref,locator_hash,uncertainty)
  values(p_read_unit,p_read_run,'C01','paragraph','utf8_byte_range/v1',p_extent,1,payload_ref,p_extent->>'quote_sha256','{"reading":"exact_utf8_bytes","interpretation":"not_performed"}');
 end if;
 select * into r from source.read_runs where read_run_id=p_read_run;
 select * into u from source.read_units where read_unit_id=p_read_unit;
 if r.read_run_id is null or u.read_unit_id is null or r.production_run_id is distinct from p_run
  or r.raw_item_id is distinct from raw.raw_item_id or r.input_sha256 is distinct from original.sha256
  or r.status is distinct from 'done' or r.manifest_hash is distinct from p_digest or not r.config @> config
  or r.method_set is distinct from '["C01"]'::jsonb or r.engine is distinct from 'deterministic'
  or u.read_run_id is distinct from p_read_run or u.method_code is distinct from 'C01' or u.kind is distinct from 'paragraph'
  or u.locator_schema is distinct from 'utf8_byte_range/v1' or u.locator is distinct from p_extent
  or u.ordinal is distinct from 1 or u.payload_ref is distinct from payload_ref
  or u.locator_hash is distinct from p_extent->>'quote_sha256'
  then raise exception 'PRIVATE_READING_IDEMPOTENCY_CONFLICT';end if;
 return jsonb_build_object('read_run_id',p_read_run,'read_unit_id',p_read_unit,'request_digest',p_digest,
  'artifact_revision',control.artifact_revision_for('read_unit',p_read_unit));
end $$;
revoke all on function studio.persist_private_text_reading(uuid,uuid,uuid,text,uuid,jsonb,text,text)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_text_reading(uuid,uuid,uuid,text,uuid,jsonb,text,text) to mohen_app_runtime;

-- A stored reading pins its exact original version even before evidence links
-- or Reviewer decisions exist. Withdrawal remains possible via rights/identity.
create or replace function studio.protect_private_text_reading()returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare pinned boolean;
begin
 case tg_table_schema||'.'||tg_table_name
 when 'source.read_runs' then pinned:=old.config->>'schema'='mab.private-text-reading.v1';
 when 'source.read_units' then pinned:=exists(select from source.read_runs where read_run_id=old.read_run_id and config->>'schema'='mab.private-text-reading.v1');
 when 'source.raw_items' then pinned:=exists(select from source.read_runs where raw_item_id=old.raw_item_id and config->>'schema'='mab.private-text-reading.v1');
 when 'source.source_versions' then pinned:=exists(select from source.read_runs r join source.raw_items raw using(raw_item_id) where raw.source_version_id=old.source_version_id and r.config->>'schema'='mab.private-text-reading.v1');
 else raise exception 'PRIVATE_READING_TRIGGER_BINDING_INVALID';end case;
 if pinned then raise exception 'PRIVATE_READING_IMMUTABLE';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function studio.protect_private_text_reading() from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer;
drop trigger if exists private_text_reading_immutable on source.read_runs;
create trigger private_text_reading_immutable before update or delete on source.read_runs for each row execute function studio.protect_private_text_reading();
drop trigger if exists private_text_reading_immutable on source.read_units;
create trigger private_text_reading_immutable before update or delete on source.read_units for each row execute function studio.protect_private_text_reading();
drop trigger if exists private_text_reading_immutable on source.raw_items;
create trigger private_text_reading_immutable before update or delete on source.raw_items for each row execute function studio.protect_private_text_reading();
drop trigger if exists private_text_reading_immutable on source.source_versions;
create trigger private_text_reading_immutable before update or delete on source.source_versions for each row execute function studio.protect_private_text_reading();
commit;
