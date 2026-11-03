-- M2 candidate bridges in existing source/evidence/world entities.
-- Private evidence connectivity never signs G1/G2/G3 or publishes knowledge.
-- Candidate migration: isolate and authorize before production use.
begin;
-- Independent server byte-verifier key, never browser/session credentials.
-- Provision privately after approval; zero rows means byte attestation denied.
create table control.original_bridge_verification_keys(
 key_version text primary key,
 verification_key text not null check(length(verification_key)>=32),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table control.original_bridge_verification_keys enable row level security;
revoke all on control.original_bridge_verification_keys from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer;
alter table evidence.read_unit_evidence_links add column byte_verification_receipt jsonb;

create function studio.verify_original_bridge_attestation(p_token text,p_original studio.private_originals,p_evidence uuid,p_unit uuid,p_extent jsonb,p_quote text,p_order integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare encoded text;signature text;expected text;key_value text;claims jsonb;crypto_schema text;payload_hash text;now_ms bigint;
begin
 if p_token is null or length(p_token)>100000 or p_token !~ '^[A-Za-z0-9_-]+\.[a-f0-9]{64}$' then raise exception 'BRIDGE_BYTE_ATTESTATION_REQUIRED';end if;
 encoded:=split_part(p_token,'.',1);signature:=split_part(p_token,'.',2);
 claims:=convert_from(decode(translate(encoded,'-_','+/')||repeat('=',(4-length(encoded)%4)%4),'base64'),'UTF8')::jsonb;
 select verification_key into key_value from control.original_bridge_verification_keys where key_version=claims->>'kid' and is_active for share;
 if key_value is null then raise exception 'BRIDGE_BYTE_ATTESTATION_REQUIRED';end if;
 select n.nspname into crypto_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
 execute format('select encode(%I.hmac($1,$2,''sha256''),''hex''),encode(%I.digest($1,''sha256''),''hex'')',crypto_schema,crypto_schema) into expected,payload_hash using encoded,key_value;
 if signature is distinct from expected then raise exception 'BRIDGE_BYTE_ATTESTATION_REQUIRED';end if;
 now_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 if jsonb_typeof(claims->'exp') is distinct from 'number' or jsonb_typeof(claims->'iat') is distinct from 'number'
  or claims->>'kind' is distinct from 'MOHEN_PRIVATE_READ_BRIDGE_V1'
  or claims->>'uid' is distinct from p_original.owner_user_id::text
  or claims->>'project_id' is distinct from p_original.project_id::text
  or claims->>'original_id' is distinct from p_original.original_id::text
  or claims->>'raw_sha256' is distinct from p_original.sha256
  or claims->>'evidence_id' is distinct from p_evidence::text or claims->>'read_unit_id' is distinct from p_unit::text
  or claims->'extent' is distinct from p_extent or claims->>'quote' is distinct from p_quote
  or claims->>'extent_order' is distinct from p_order::text
  or (claims->>'exp')::bigint<=now_ms or (claims->>'iat')::bigint>now_ms+5000
  or (claims->>'exp')::bigint<=(claims->>'iat')::bigint
  or (claims->>'exp')::bigint-(claims->>'iat')::bigint>30000 then raise exception 'BRIDGE_BYTE_ATTESTATION_REQUIRED';end if;
 return jsonb_build_object('status','VERIFIED','key_version',claims->>'kid','verified_at',clock_timestamp(),'attestation_digest',payload_hash);
exception when others then raise exception 'BRIDGE_BYTE_ATTESTATION_REQUIRED';
end $$;
revoke all on function studio.verify_original_bridge_attestation(text,studio.private_originals,uuid,uuid,jsonb,text,integer) from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer;

alter table world.claim_evidence_links add column claim_revision_id uuid references world.claim_revisions(claim_revision_id) on delete restrict;
alter table world.claim_evidence_links drop constraint claim_evidence_links_claim_object_type_claim_object_id_evid_key;
create unique index world_claim_evidence_legacy_identity on world.claim_evidence_links(claim_object_type,claim_object_id,evidence_id,support_type) where claim_revision_id is null;
create unique index world_claim_evidence_revision_identity on world.claim_evidence_links(claim_revision_id,evidence_id,support_type) where claim_revision_id is not null;

create function studio.private_bridge_original(p_original uuid) returns studio.private_originals
language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid; original studio.private_originals;
begin
 actor:=control.current_app_user_id();
 if actor is null then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 perform 1 from public.users where user_id=actor and status='active' for share;
 if not found then raise exception 'STUDIO_IDENTITY_REQUIRED';end if;
 select o.* into original from studio.private_originals o where o.original_id=p_original and o.owner_user_id=actor and o.state='STORED_VERIFIED';
 if not found then raise exception 'ORIGINAL_NOT_FOUND';end if;
 perform 1 from studio.projects where project_id=original.project_id and owner_user_id=actor and lifecycle_status='ACTIVE' for share;
 if not found then raise exception 'ORIGINAL_NOT_FOUND';end if;
 return original;
end $$;
revoke all on function studio.private_bridge_original(uuid) from public,anon,authenticated,service_role,mohen_app_runtime;

create function studio.bind_private_read_evidence(p_original uuid,p_evidence uuid,p_unit uuid,p_extent jsonb,p_quote text,p_order integer,p_attestation text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare original studio.private_originals; e evidence.material_evidence; u source.read_units; r source.read_runs; raw source.raw_items; v source.source_versions; old evidence.read_unit_evidence_links; linked uuid; receipt jsonb;
begin
 original:=studio.private_bridge_original(p_original);
 receipt:=studio.verify_original_bridge_attestation(p_attestation,original,p_evidence,p_unit,p_extent,p_quote,p_order);
 if p_order is null or p_order<1 or p_order>10000 or p_extent->>'kind'<>'utf8_byte_range/v1' then raise exception 'BRIDGE_LOCATOR_INVALID';end if;
 select * into e from evidence.material_evidence where evidence_id=p_evidence for share;
 if not found then raise exception 'BRIDGE_SOURCE_BINDING_INVALID';end if;
 select * into u from source.read_units where read_unit_id=p_unit for share;
 if not found then raise exception 'BRIDGE_SOURCE_BINDING_INVALID';end if;
 select * into r from source.read_runs where read_run_id=u.read_run_id for share;
 select * into raw from source.raw_items where raw_item_id=e.raw_item_id for share;
 select * into v from source.source_versions where source_version_id=e.source_version_id for share;
 if raw.raw_item_id is null or v.source_version_id is null or r.read_run_id is null
  or raw.source_version_id is distinct from v.source_version_id or e.source_id is distinct from v.source_id
  or raw.storage_ref is distinct from original.storage_bucket||'/'||original.storage_key
  or raw.checksum_sha256 is distinct from original.sha256 or raw.byte_size is distinct from original.byte_size
  or v.checksum_sha256 is distinct from original.sha256 or r.raw_item_id is distinct from raw.raw_item_id
  or r.input_sha256 is distinct from original.sha256 or r.status is distinct from 'done'
  or p_extent->>'source_version_id' is distinct from v.source_version_id::text
  or p_extent->>'raw_item_id' is distinct from raw.raw_item_id::text
  or p_extent->>'raw_sha256' is distinct from original.sha256
  or u.locator_schema is distinct from 'utf8_byte_range/v1' or u.locator is distinct from p_extent
  or u.payload_ref is distinct from raw.storage_ref or u.locator_hash is distinct from p_extent->>'quote_sha256'
  or e.locator is distinct from p_extent or e.literal_reading is distinct from p_quote then
  raise exception 'BRIDGE_SOURCE_BINDING_INVALID';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('private-read-bridge:'||p_evidence::text||':'||p_order::text,0));
 select * into old from evidence.read_unit_evidence_links where evidence_id=p_evidence and extent_order=p_order;
 if found then
  if old.read_unit_id is distinct from p_unit or old.read_run_id is distinct from u.read_run_id
   or old.selected_extent is distinct from p_extent or old.quote_snapshot_hash is distinct from p_extent->>'quote_sha256'
   or old.link_version is distinct from 'mab.private-read-bridge.v1'
   or old.byte_verification_receipt->>'key_version' is distinct from receipt->>'key_version' then raise exception 'BRIDGE_IDEMPOTENCY_CONFLICT';end if;
  return old.link_id;
 end if;
 insert into evidence.read_unit_evidence_links(evidence_id,read_unit_id,read_run_id,selected_extent,selection_basis,quote_snapshot_hash,link_version,extent_order,allowed_purpose,locator_schema_version,byte_verification_receipt)
 values(p_evidence,p_unit,u.read_run_id,p_extent,'exact original byte-range verified by server',p_extent->>'quote_sha256','mab.private-read-bridge.v1',p_order,'private_research_candidate','utf8_byte_range/v1',receipt) returning link_id into linked;
 return linked;
end $$;
revoke all on function studio.bind_private_read_evidence(uuid,uuid,uuid,jsonb,text,integer,text) from public,anon,authenticated,service_role;
grant execute on function studio.bind_private_read_evidence(uuid,uuid,uuid,jsonb,text,integer,text) to mohen_app_runtime;

create function studio.bind_private_claim_evidence(p_original uuid,p_revision uuid,p_evidence uuid,p_support text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare original studio.private_originals; claim world.claim_revisions; e evidence.material_evidence; linked uuid; object_exists boolean;
begin
 original:=studio.private_bridge_original(p_original);
 if p_support is null or p_support not in('supports','contradicts','contextualizes')then raise exception 'BRIDGE_CLAIM_BINDING_INVALID';end if;
 select * into e from evidence.material_evidence where evidence_id=p_evidence for share;
 if not found or not exists(select 1 from source.raw_items raw join source.source_versions v using(source_version_id)
  where raw.raw_item_id=e.raw_item_id and raw.source_version_id=e.source_version_id and v.source_id=e.source_id
   and raw.storage_ref=original.storage_bucket||'/'||original.storage_key and raw.checksum_sha256=original.sha256 and raw.byte_size=original.byte_size)
  or not exists(select 1 from evidence.read_unit_evidence_links l join control.original_bridge_verification_keys k on k.key_version=l.byte_verification_receipt->>'key_version' and k.is_active where l.evidence_id=p_evidence and l.link_version='mab.private-read-bridge.v1' and l.byte_verification_receipt->>'status'='VERIFIED')then
  raise exception 'BRIDGE_SOURCE_BINDING_INVALID';end if;
 select * into claim from world.claim_revisions where claim_revision_id=p_revision for share;
 if not found or jsonb_typeof(claim.assertion_payload_json->'evidence_ids') is distinct from 'array' or claim.assertion_payload_json->>'project_id' is distinct from original.project_id::text
  or not coalesce((claim.assertion_payload_json->'evidence_ids') ? p_evidence::text,false) then raise exception 'BRIDGE_CLAIM_BINDING_INVALID';end if;
 object_exists:=case claim.subject_kind
  when 'relation_claim' then exists(select 1 from world.relation_claims where relation_claim_id=claim.subject_id)
  when 'event' then exists(select 1 from world.events where event_id=claim.subject_id)
  when 'change' then exists(select 1 from world.changes where change_id=claim.subject_id)
  when 'historical_space_claim' then exists(select 1 from world.historical_space_claims where historical_space_claim_id=claim.subject_id)
  when 'visual_object' then exists(select 1 from world.visual_objects where visual_object_id=claim.subject_id)
  else false end;
 if not object_exists then raise exception 'BRIDGE_CLAIM_BINDING_INVALID';end if;
 perform pg_advisory_xact_lock(hashtextextended('private-claim-bridge:'||p_revision::text||':'||p_evidence::text||':'||p_support,0));
 select claim_evidence_link_id into linked from world.claim_evidence_links where claim_revision_id=p_revision and evidence_id=p_evidence and support_type=p_support;
 if linked is not null then return linked;end if;
 insert into world.claim_evidence_links(claim_object_type,claim_object_id,claim_revision_id,evidence_id,support_type,note)
 values(claim.subject_kind,claim.subject_id,p_revision,p_evidence,p_support,'Private candidate bridge; professional qualification UNASSESSED') returning claim_evidence_link_id into linked;
 return linked;
end $$;
revoke all on function studio.bind_private_claim_evidence(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function studio.bind_private_claim_evidence(uuid,uuid,uuid,text) to mohen_app_runtime;

-- Minimal private source provenance check. A signed Owner session is mandatory.
-- app_runtime must not gain direct source-table USAGE or SELECT.
create function studio.private_source_binding_matches(
 p_original uuid,p_version uuid,p_raw uuid,p_sha text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $mab_source$
declare original studio.private_originals;
begin
 if p_original is null or p_version is null or p_raw is null or p_sha is null
  or p_sha !~ '^[a-f0-9]{64}$' then return false;end if;
 original:=studio.private_bridge_original(p_original);
 if original.sha256 is distinct from p_sha or original.state is distinct from 'STORED_VERIFIED'
  then return false;end if;
 return exists(
  select 1 from source.raw_items raw
  join source.source_versions v on v.source_version_id=raw.source_version_id
  join studio.asset_revisions a on a.revision_id=original.asset_revision_id
    and a.asset_id=original.asset_id and a.content_hash=original.sha256
    and a.payload_storage_ref=original.storage_bucket||'/'||original.storage_key
  where raw.raw_item_id=p_raw and raw.source_version_id=p_version
   and raw.storage_ref=original.storage_bucket||'/'||original.storage_key
   and raw.checksum_sha256=original.sha256 and raw.byte_size=original.byte_size
   and v.checksum_sha256=original.sha256
 );
end $mab_source$;
revoke all on function studio.private_source_binding_matches(uuid,uuid,uuid,text)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.private_source_binding_matches(uuid,uuid,uuid,text)
 to mohen_app_runtime;

-- Once a private bridge pins a version, changes require a new version; rights
-- withdrawal remains possible through users/projects/qualification, not history edits.
create function studio.protect_private_bridge_endpoint()returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare pinned boolean:=false;
begin
 case tg_table_schema||'.'||tg_table_name
 when 'source.source_versions' then
  pinned:=exists(select 1 from evidence.material_evidence e join evidence.read_unit_evidence_links l using(evidence_id)
   where e.source_version_id=old.source_version_id and l.link_version='mab.private-read-bridge.v1');
 when 'source.read_runs' then
  pinned:=exists(select 1 from evidence.read_unit_evidence_links where read_run_id=old.read_run_id and link_version='mab.private-read-bridge.v1');
 when 'source.read_units' then
  pinned:=exists(select 1 from evidence.read_unit_evidence_links where read_unit_id=old.read_unit_id and link_version='mab.private-read-bridge.v1');
 when 'evidence.material_evidence' then
  pinned:=exists(select 1 from evidence.read_unit_evidence_links where evidence_id=old.evidence_id and link_version='mab.private-read-bridge.v1');
 when 'evidence.read_unit_evidence_links' then
  pinned:=old.link_version='mab.private-read-bridge.v1';
 when 'world.claim_revisions' then
  pinned:=exists(select 1 from world.claim_evidence_links where claim_revision_id=old.claim_revision_id);
 when 'world.claim_evidence_links' then
  pinned:=old.claim_revision_id is not null;
 else raise exception 'EVIDENCE_BRIDGE_TRIGGER_BINDING_INVALID';
 end case;
 if pinned then raise exception 'EVIDENCE_BRIDGE_PINNED_VERSION_IMMUTABLE';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function studio.protect_private_bridge_endpoint()from public,anon,authenticated,service_role,mohen_app_runtime;
create trigger private_bridge_pin_source_version before update or delete on source.source_versions for each row execute function studio.protect_private_bridge_endpoint();
create trigger private_bridge_pin_read_run before update or delete on source.read_runs for each row execute function studio.protect_private_bridge_endpoint();
create trigger private_bridge_pin_read_unit before update or delete on source.read_units for each row execute function studio.protect_private_bridge_endpoint();
create trigger private_bridge_pin_evidence before update or delete on evidence.material_evidence for each row execute function studio.protect_private_bridge_endpoint();
create trigger private_bridge_pin_read_link before update or delete on evidence.read_unit_evidence_links for each row execute function studio.protect_private_bridge_endpoint();
create trigger private_bridge_pin_claim_revision before update or delete on world.claim_revisions for each row execute function studio.protect_private_bridge_endpoint();
create trigger private_bridge_pin_claim_link before update or delete on world.claim_evidence_links for each row execute function studio.protect_private_bridge_endpoint();
commit;
