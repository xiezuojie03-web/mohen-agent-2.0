-- Reviewable inheritance batch only. NOT APPLIED. Owner approval and automatic review required.
-- Existing Owner-scoped functions + candidate persistence; no Gate signing, original bytes, grants on source tables, deployment or paid calls.
begin;

-- INHERITED FROM supabase/migrations/20261115130000_mab_m5_private_text_read_context_consistency.sql
-- M5 Studio L1/L2 read-context compatibility: align existing Owner-scoped reader
-- with exact C01 byte attestation and D02 material observation receipts.
-- Fail closed on invalid source binding, storage SHA, revoked verification key.
-- No new roles, grants or knowledge qualifications.
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
            'artifact_revision',control.artifact_revision_for('read_unit',u.read_unit_id),
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
                'literal_reading',left(e.literal_reading,4000),
                'literal_reading_length',char_length(e.literal_reading),
                'literal_reading_truncated',char_length(e.literal_reading)>4000,
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
                and l.selected_extent=u.locator
                and (
                  (l.link_version='mab.private-read-bridge.v1'
                   and l.byte_verification_receipt->>'status'='VERIFIED'
                   and l.quote_snapshot_hash=u.locator_hash)
                  or
                  (l.link_version='mab.private-material-observation.v1'
                   and l.byte_verification_receipt->>'attestation_digest' ~ '^[a-f0-9]{64}$'
                   and l.quote_snapshot_hash=original.sha256)
                )
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
          -- Exact C01 persisted byte attestation does not contain original_revision_id or status.
          and r.config->'byte_verification_receipt'->>'attestation_digest' ~ '^[a-f0-9]{64}$'
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


-- INHERITED FROM supabase/migrations/20261113170000_mab_m5_d02_text_plain_observation.sql
-- D02 persist_private_material_observation：泛化支持 C01 文本载体（text/plain + utf8_byte_range/v1）。
-- 原 M2 时代写死 content_type ∈ {image/png,jpeg,webp} + locator_schema='scanned_page/v1' + method_code='C02'。
-- M5 泛化冒烟中 SHL 地名志 text/plain 原件（C01 utf8_byte_range/v1）真实跑 D02 observeMaterial(H05)
-- 时 DB 层校验不通过。修复：content_type 放开 text/plain；locator_schema ∋ utf8_byte_range/v1/scanned_page/v1；
-- method_code ∋ C01/C02；read_run config.schema ∋ mab.private-text-reading.v1 / mab.private-scanned-page-reading.v1；
-- insert material_evidence.modality='text_quote'；evidence_links.locator_schema_version='utf8_byte_range/v1'；
-- reading_units.unit_kind='paragraph'；evidence_links.selection_basis='exact byte-range quote verified by read_unit locator'。
-- JS 层（private-evidence-stage.mjs）同步已无 content_type / locator_schema / method_code 硬编码。

CREATE OR REPLACE FUNCTION studio.persist_private_material_observation(p_original uuid, p_evidence uuid, p_reading_unit uuid, p_link uuid, p_digest text, p_run uuid, p_observation jsonb, p_attestation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET jit TO 'off'
AS $function$

declare

 original studio.private_originals; claims jsonb; encoded text; signature text; expected text;

 key_value text; crypto_schema text; now_ms bigint; receipt jsonb; extraction jsonb; read_unit uuid;

 r source.read_runs; u source.read_units; raw source.raw_items; v source.source_versions;

 ru evidence.reading_units; e evidence.material_evidence; l evidence.read_unit_evidence_links;

begin

 original:=studio.private_bridge_original(p_original);

 perform 1 from studio.private_originals where original_id=p_original for share;

 if original.content_type not in ('text/plain','image/png','image/jpeg','image/webp')

  or p_run is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'

  or jsonb_typeof(p_observation) is distinct from 'object'

  or p_observation->>'h_type' is distinct from 'H05'

  or p_observation->>'literal_reading' is null

  or octet_length(p_observation->>'literal_reading') not between 1 and 32768

  or p_observation->>'source_voice' is null

  or p_observation->>'source_voice' not in ('official_gazetteer','institutional_record','private_note')

  or p_observation->>'evidence_type' is null

  or octet_length(p_observation->>'evidence_type') not between 1 and 200

  or (p_observation->>'normalized_text' is not null and octet_length(p_observation->>'normalized_text')>32768)

  or (p_observation->>'research_proposition' is not null and octet_length(p_observation->>'research_proposition')>2000)

  or jsonb_typeof(p_observation->'uncertainty') is distinct from 'object'

  or p_observation->'uncertainty'->>'qualification' is distinct from 'UNASSESSED'

  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_INVALID';end if;

 if p_evidence is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-material-evidence:'||p_digest,'UTF8')),'hex'),1,32)::uuid

  or p_reading_unit is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-material-reading-unit:'||p_digest,'UTF8')),'hex'),1,32)::uuid

  or p_link is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-material-link:'||p_digest,'UTF8')),'hex'),1,32)::uuid

  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_IDENTITY_INVALID';end if;

 perform 1 from control.production_runs where run_id=p_run

  and architecture_generation='mohen.six-stage.v1' and scope->>'project_id'=original.project_id::text for share;

 if not found then raise exception 'PRIVATE_MATERIAL_OBSERVATION_RUN_NOT_BOUND';end if;

 begin

  if p_attestation is null or length(p_attestation)>100000 or p_attestation !~ '^[A-Za-z0-9_-]+\.[a-f0-9]{64}$'

   then raise exception 'PRIVATE_MATERIAL_OBSERVATION_ATTESTATION_REQUIRED';end if;

  encoded:=split_part(p_attestation,'.',1);signature:=split_part(p_attestation,'.',2);

  claims:=convert_from(decode(translate(encoded,'-_','+/')||repeat('=',(4-length(encoded)%4)%4),'base64'),'UTF8')::jsonb;

  select verification_key into key_value from control.original_bridge_verification_keys where key_version=claims->>'kid' and is_active for share;

  if key_value is null then raise exception 'PRIVATE_MATERIAL_OBSERVATION_ATTESTATION_REQUIRED';end if;

  select nsn.nspname into crypto_schema from pg_catalog.pg_extension pe join pg_catalog.pg_namespace nsn on nsn.oid=pe.extnamespace where pe.extname='pgcrypto';

  execute format('select encode(%I.hmac($1,$2,''sha256''),''hex'')',crypto_schema) into expected using encoded,key_value;

  if signature is distinct from expected then raise exception 'PRIVATE_MATERIAL_OBSERVATION_ATTESTATION_REQUIRED';end if;

  now_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;

  if claims->>'kind' is distinct from 'MOHEN_PRIVATE_MATERIAL_OBSERVATION_V1'

   or claims->>'uid' is distinct from original.owner_user_id::text

   or claims->>'project_id' is distinct from original.project_id::text

   or claims->>'original_id' is distinct from p_original::text or claims->>'raw_sha256' is distinct from original.sha256

   or claims->>'run_id' is distinct from p_run::text

   or claims->>'read_unit_id' is null or claims->>'read_unit_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

   or claims->>'evidence_id' is distinct from p_evidence::text

   or claims->>'reading_unit_id' is distinct from p_reading_unit::text

   or claims->>'link_id' is distinct from p_link::text

   or claims->>'request_digest' is distinct from p_digest

   or claims->'observation' is distinct from p_observation

   or jsonb_typeof(claims->'iat') is distinct from 'number' or jsonb_typeof(claims->'exp') is distinct from 'number'

   or (claims->>'iat')::bigint>now_ms+5000 or (claims->>'exp')::bigint<=now_ms

   or (claims->>'exp')::bigint<=(claims->>'iat')::bigint

   or (claims->>'exp')::bigint-(claims->>'iat')::bigint>30000

   then raise exception 'PRIVATE_MATERIAL_OBSERVATION_ATTESTATION_REQUIRED';end if;

 exception when others then raise exception 'PRIVATE_MATERIAL_OBSERVATION_ATTESTATION_REQUIRED';end;

 read_unit:=(claims->>'read_unit_id')::uuid;

 receipt:=jsonb_build_object('key_version',claims->>'kid','attestation_digest',encode(control.sha256_bytes(convert_to(encoded,'UTF8')),'hex'),'verified_at',clock_timestamp());

 extraction:=jsonb_build_object('schema','mohen.private-material-observation.v1','method','H05','request_digest',p_digest,'qualification','UNASSESSED');

 select * into u from source.read_units where read_unit_id=read_unit for share;

 if u.read_unit_id is null or u.locator_schema not in ('utf8_byte_range/v1')

  or u.method_code not in ('C02','C01')

  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_READ_UNIT_INVALID';end if;

 select * into r from source.read_runs where read_run_id=u.read_run_id for share;

 if r.read_run_id is null then raise exception 'PRIVATE_MATERIAL_OBSERVATION_READ_UNIT_INVALID';end if;

 select * into raw from source.raw_items where raw_item_id=r.raw_item_id for share;

 select * into v from source.source_versions where source_version_id=raw.source_version_id for share;

 if raw.raw_item_id is null or v.source_version_id is null

  or r.config->>'schema' not in ('mab.private-scanned-page-reading.v1','mab.private-text-reading.v1')

  or r.status is distinct from 'done'

  or u.locator->>'raw_item_id' is distinct from raw.raw_item_id::text

  or raw.checksum_sha256 is distinct from original.sha256

  or u.locator->>'raw_sha256' is distinct from original.sha256

  or not studio.private_source_binding_matches(p_original,raw.source_version_id,raw.raw_item_id,original.sha256)

  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_READ_UNIT_INVALID';end if;

 perform pg_advisory_xact_lock(hashtextextended('private-material-observation:'||p_evidence::text,0));

 select * into e from evidence.material_evidence where evidence_id=p_evidence;

 if not found then

  insert into evidence.reading_units(reading_unit_id,source_version_id,raw_item_id,unit_kind,primary_h_type,taxonomy_version,classification_status,classification_basis)

  values(p_reading_unit,raw.source_version_id,raw.raw_item_id,'paragraph','H05','mohka-d02-h-classification.v1','candidate','D02 H05 observation over utf8_byte_range/v1 C01 read_unit; qualification UNASSESSED');

  insert into evidence.material_evidence(evidence_id,source_id,source_version_id,raw_item_id,locator,modality,literal_reading,

   normalized_text,research_proposition,source_voice,evidence_type,reading_unit_id,uncertainty,extraction_method,evidence_version_no,input_fingerprint)

  values(p_evidence,v.source_id,raw.source_version_id,raw.raw_item_id,u.locator,'text_quote',p_observation->>'literal_reading',

   p_observation->>'normalized_text',p_observation->>'research_proposition',p_observation->>'source_voice',p_observation->>'evidence_type',

   p_reading_unit,p_observation->'uncertainty',extraction,1,p_digest);

  insert into evidence.read_unit_evidence_links(link_id,evidence_id,read_unit_id,read_run_id,selected_extent,selection_basis,

   quote_snapshot_hash,link_version,extent_order,allowed_purpose,locator_schema_version,byte_verification_receipt)

  values(p_link,p_evidence,read_unit,u.read_run_id,u.locator,'exact byte-range quote verified by read_unit locator',original.sha256,

   'mab.private-material-observation.v1',1,'private_research_candidate','utf8_byte_range/v1',receipt);

 end if;

 select * into ru from evidence.reading_units where reading_unit_id=p_reading_unit;

 select * into e from evidence.material_evidence where evidence_id=p_evidence;

 select * into l from evidence.read_unit_evidence_links where link_id=p_link;

 if ru.reading_unit_id is null or e.evidence_id is null or l.link_id is null

  or ru.source_version_id is distinct from raw.source_version_id or ru.raw_item_id is distinct from raw.raw_item_id

  or ru.unit_kind is distinct from 'paragraph' or ru.primary_h_type is distinct from 'H05'

  or ru.taxonomy_version is distinct from 'mohka-d02-h-classification.v1'

  or ru.classification_status is distinct from 'candidate'

  or ru.classification_basis is distinct from 'D02 H05 observation over utf8_byte_range/v1 C01 read_unit; qualification UNASSESSED'

  or e.source_id is distinct from v.source_id or e.source_version_id is distinct from raw.source_version_id

  or e.raw_item_id is distinct from raw.raw_item_id or e.locator is distinct from u.locator

  or e.modality is distinct from 'text_quote'

  or e.literal_reading is distinct from p_observation->>'literal_reading'

  or e.normalized_text is distinct from p_observation->>'normalized_text'

  or e.research_proposition is distinct from p_observation->>'research_proposition'

  or e.source_voice is distinct from p_observation->>'source_voice'

  or e.evidence_type is distinct from p_observation->>'evidence_type'

  or e.reading_unit_id is distinct from p_reading_unit

  or e.uncertainty is distinct from p_observation->'uncertainty'

  or e.extraction_method is distinct from extraction

  or e.evidence_version_no is distinct from 1 or e.input_fingerprint is distinct from p_digest

  or l.evidence_id is distinct from p_evidence or l.read_unit_id is distinct from read_unit

  or l.read_run_id is distinct from u.read_run_id or l.selected_extent is distinct from u.locator

  or l.selection_basis is distinct from 'exact byte-range quote verified by read_unit locator'

  or l.quote_snapshot_hash is distinct from original.sha256

  or l.link_version is distinct from 'mab.private-material-observation.v1'

  or l.extent_order is distinct from 1 or l.allowed_purpose is distinct from 'private_research_candidate'

  or l.locator_schema_version is distinct from 'utf8_byte_range/v1'

  or l.byte_verification_receipt->>'key_version' is distinct from receipt->>'key_version'

  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_IDEMPOTENCY_CONFLICT';end if;

 return jsonb_build_object('evidence_id',p_evidence,'reading_unit_id',p_reading_unit,'link_id',p_link,

  'read_unit_id',read_unit,'read_run_id',u.read_run_id,'request_digest',p_digest,

  'artifact_revision',control.artifact_revision_for('material_evidence',p_evidence));

end $function$

revoke all on function studio.persist_private_material_observation(uuid,uuid,uuid,uuid,text,uuid,jsonb,text)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_material_observation(uuid,uuid,uuid,uuid,text,uuid,jsonb,text) to mohen_app_runtime;


-- INHERITED FROM supabase/migrations/20261107200000_mab_m5_d02_d05_private_candidates.sql
-- 2) D03: one W07 world-fact claim revision over an already-verified D02
--    observation. Only the exact verified evidence may be cited; the claim,
--    change and link ids are derived from the request digest.
create or replace function studio.persist_private_world_claim(
 p_original uuid,p_change uuid,p_revision uuid,p_digest text,p_run uuid,p_evidence uuid,p_claim jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals; claim_link uuid; e evidence.material_evidence;
 c world.changes; cr world.claim_revisions; l world.claim_evidence_links; rule jsonb; payload jsonb;
begin
 original:=studio.private_bridge_original(p_original);
 perform 1 from studio.private_originals where original_id=p_original for share;
 if p_run is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'
  or jsonb_typeof(p_claim) is distinct from 'object'
  or p_claim->>'assertion' is null or octet_length(p_claim->>'assertion') not between 1 and 2000
  or p_claim->>'change_type' is null or octet_length(p_claim->>'change_type') not between 1 and 200
  or jsonb_typeof(p_claim->'time_scope') is distinct from 'object'
  or p_claim->>'support_type' is null or p_claim->>'support_type' not in ('supports','contradicts','contextualizes')
  then raise exception 'PRIVATE_WORLD_CLAIM_INVALID';end if;
 if p_change is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-world-change:'||p_digest,'UTF8')),'hex'),1,32)::uuid
  or p_revision is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-world-claim:'||p_digest,'UTF8')),'hex'),1,32)::uuid
  then raise exception 'PRIVATE_WORLD_CLAIM_IDENTITY_INVALID';end if;
 claim_link:=substring(encode(control.sha256_bytes(convert_to('mab-private-world-claim-link:'||p_digest,'UTF8')),'hex'),1,32)::uuid;
 perform 1 from control.production_runs where run_id=p_run
  and architecture_generation='mohen.six-stage.v1' and scope->>'project_id'=original.project_id::text for share;
 if not found then raise exception 'PRIVATE_WORLD_CLAIM_RUN_NOT_BOUND';end if;
 -- 原件 raw 绑定 + 已验证 observation link，任一缺失即失败关闭（照 bind_private_claim_evidence 检查模式）。
 select * into e from evidence.material_evidence where evidence_id=p_evidence for share;
 if e.evidence_id is null
  or not exists(select 1 from source.raw_items raw join source.source_versions v using(source_version_id)
   where raw.raw_item_id=e.raw_item_id and raw.source_version_id=e.source_version_id and v.source_id=e.source_id
    and raw.storage_ref=original.storage_bucket||'/'||original.storage_key
    and raw.checksum_sha256=original.sha256 and raw.byte_size=original.byte_size)
  or not exists(select 1 from evidence.read_unit_evidence_links l2
   join control.original_bridge_verification_keys k on k.key_version=l2.byte_verification_receipt->>'key_version' and k.is_active
   where l2.evidence_id=p_evidence and l2.link_version='mab.private-material-observation.v1')
  then raise exception 'PRIVATE_WORLD_CLAIM_EVIDENCE_NOT_BOUND';end if;
 rule:=jsonb_build_object('schema','mohen.private-world-claim.v1','method','W07','request_digest',p_digest,'qualification','UNASSESSED');
 payload:=jsonb_build_object('project_id',original.project_id,'assertion',p_claim->>'assertion',
  'evidence_ids',to_jsonb(array[p_evidence]),'method','W07','qualification','UNASSESSED',
  'request_digest',p_digest,'original_id',p_original);
 perform pg_advisory_xact_lock(hashtextextended('private-world-claim:'||p_revision::text,0));
 select * into cr from world.claim_revisions where claim_revision_id=p_revision;
 if not found then
  insert into world.changes(change_id,change_type,time_scope,expression_rule)
  values(p_change,p_claim->>'change_type',p_claim->'time_scope',rule);
  insert into world.claim_revisions(claim_revision_id,subject_kind,subject_id,revision_no,assertion_payload_json,producer_method_id,upstream_refs,asserted_time_json)
  values(p_revision,'change',p_change,1,payload,'W07',jsonb_build_object('evidence_id',p_evidence,'change_id',p_change),p_claim->'time_scope');
  insert into world.claim_evidence_links(claim_evidence_link_id,claim_object_type,claim_object_id,claim_revision_id,evidence_id,support_type,note)
  values(claim_link,'change',p_change,p_revision,p_evidence,p_claim->>'support_type','Private candidate; professional qualification UNASSESSED');
 end if;
 select * into c from world.changes where change_id=p_change;
 select * into cr from world.claim_revisions where claim_revision_id=p_revision;
 select * into l from world.claim_evidence_links where claim_evidence_link_id=claim_link;
 if c.change_id is null or cr.claim_revision_id is null or l.claim_evidence_link_id is null
  or c.change_type is distinct from p_claim->>'change_type'
  or c.time_scope is distinct from p_claim->'time_scope'
  or c.expression_rule is distinct from rule
  or cr.subject_kind is distinct from 'change' or cr.subject_id is distinct from p_change
  or cr.revision_no is distinct from 1 or cr.producer_method_id is distinct from 'W07'
  or cr.assertion_payload_json is distinct from payload
  or cr.upstream_refs is distinct from jsonb_build_object('evidence_id',p_evidence,'change_id',p_change)
  or cr.asserted_time_json is distinct from p_claim->'time_scope'
  or l.claim_object_type is distinct from 'change' or l.claim_object_id is distinct from p_change
  or l.claim_revision_id is distinct from p_revision or l.evidence_id is distinct from p_evidence
  or l.support_type is distinct from p_claim->>'support_type'
  or l.note is distinct from 'Private candidate; professional qualification UNASSESSED'
  then raise exception 'PRIVATE_WORLD_CLAIM_IDEMPOTENCY_CONFLICT';end if;
 return jsonb_build_object('change_id',p_change,'claim_revision_id',p_revision,'claim_evidence_link_id',claim_link,
  'evidence_id',p_evidence,'request_digest',p_digest,
  'artifact_revision',control.artifact_revision_for('claim_revision',p_revision));
end $$;
revoke all on function studio.persist_private_world_claim(uuid,uuid,uuid,text,uuid,uuid,jsonb)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_world_claim(uuid,uuid,uuid,text,uuid,uuid,jsonb) to mohen_app_runtime;

-- 3) D04: one A06 institutional-mechanism finding citing a W07 claim revision
--    whose evidence chain is still byte-verified against the same original.
create or replace function studio.persist_private_humanistic_finding(
 p_original uuid,p_finding uuid,p_digest text,p_run uuid,p_revision uuid,p_finding_spec jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals; claim world.claim_revisions; f meaning.findings; refs jsonb; disc jsonb;
begin
 original:=studio.private_bridge_original(p_original);
 perform 1 from studio.private_originals where original_id=p_original for share;
 if p_run is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'
  or jsonb_typeof(p_finding_spec) is distinct from 'object'
  or p_finding_spec->>'finding_type' is distinct from 'institutional_mechanism'
  or p_finding_spec->>'human_question' is null or octet_length(p_finding_spec->>'human_question') not between 1 and 2000
  or p_finding_spec->>'interpretive_statement' is null or octet_length(p_finding_spec->>'interpretive_statement') not between 1 and 5000
  or jsonb_typeof(p_finding_spec->'counter_view_or_alternative') is distinct from 'array'
  or exists(select 1 from jsonb_array_elements(p_finding_spec->'counter_view_or_alternative') el where jsonb_typeof(el) is distinct from 'string')
  or jsonb_typeof(p_finding_spec->'missing_evidence') is distinct from 'array'
  or exists(select 1 from jsonb_array_elements(p_finding_spec->'missing_evidence') el where jsonb_typeof(el) is distinct from 'string')
  or jsonb_typeof(p_finding_spec->'uncertainty') is distinct from 'object'
  or p_finding_spec->'uncertainty'->>'qualification' is distinct from 'UNASSESSED'
  then raise exception 'PRIVATE_HUMANISTIC_FINDING_INVALID';end if;
 if p_finding is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-finding:'||p_digest,'UTF8')),'hex'),1,32)::uuid
  then raise exception 'PRIVATE_HUMANISTIC_FINDING_IDENTITY_INVALID';end if;
 perform 1 from control.production_runs where run_id=p_run
  and architecture_generation='mohen.six-stage.v1' and scope->>'project_id'=original.project_id::text for share;
 if not found then raise exception 'PRIVATE_HUMANISTIC_FINDING_RUN_NOT_BOUND';end if;
 select * into claim from world.claim_revisions where claim_revision_id=p_revision for share;
 if claim.claim_revision_id is null
  then raise exception 'PRIVATE_HUMANISTIC_FINDING_CLAIM_NOT_VERIFIED';end if;
 if claim.assertion_payload_json->>'project_id' is distinct from original.project_id::text
  or jsonb_typeof(claim.assertion_payload_json->'evidence_ids') is distinct from 'array'
  then raise exception 'PRIVATE_HUMANISTIC_FINDING_CLAIM_NOT_VERIFIED';end if;
 -- 引用的 claim 至少一条 evidence 仍满足原件绑定 + 已验证 observation link。
 if not exists(
   select 1 from jsonb_array_elements_text(claim.assertion_payload_json->'evidence_ids') ev(eid)
   join evidence.material_evidence e on e.evidence_id=ev.eid::uuid
   where exists(select 1 from source.raw_items raw join source.source_versions v using(source_version_id)
     where raw.raw_item_id=e.raw_item_id and raw.source_version_id=e.source_version_id and v.source_id=e.source_id
      and raw.storage_ref=original.storage_bucket||'/'||original.storage_key
      and raw.checksum_sha256=original.sha256 and raw.byte_size=original.byte_size)
    and exists(select 1 from evidence.read_unit_evidence_links l
     join control.original_bridge_verification_keys k on k.key_version=l.byte_verification_receipt->>'key_version' and k.is_active
     where l.evidence_id=e.evidence_id and l.link_version='mab.private-material-observation.v1'))
  then raise exception 'PRIVATE_HUMANISTIC_FINDING_CLAIM_NOT_VERIFIED';end if;
 refs:=jsonb_build_array(jsonb_build_object('kind','claim_revision','id',p_revision));
 disc:=jsonb_build_object('method_id','A06','method_version','source-sha256:mab-m5-isolated','qualification','UNASSESSED','request_digest',p_digest);
 perform pg_advisory_xact_lock(hashtextextended('private-humanistic-finding:'||p_finding::text,0));
 select * into f from meaning.findings where finding_id=p_finding;
 if not found then
  insert into meaning.findings(finding_id,finding_type,human_question,interpretive_statement,understanding_delta,
   supporting_world_objects,counter_view_or_alternative,missing_evidence,uncertainty,discovery_method,expression_rule,ranking_components)
  values(p_finding,p_finding_spec->>'finding_type',p_finding_spec->>'human_question',p_finding_spec->>'interpretive_statement',
   p_finding_spec->>'understanding_delta',refs,p_finding_spec->'counter_view_or_alternative',p_finding_spec->'missing_evidence',
   p_finding_spec->'uncertainty',disc,'{}'::jsonb,'{}'::jsonb);
 end if;
 select * into f from meaning.findings where finding_id=p_finding;
 if f.finding_id is null
  or f.finding_type is distinct from 'institutional_mechanism'
  or f.human_question is distinct from p_finding_spec->>'human_question'
  or f.interpretive_statement is distinct from p_finding_spec->>'interpretive_statement'
  or f.understanding_delta is distinct from p_finding_spec->>'understanding_delta'
  or f.supporting_world_objects is distinct from refs
  or f.counter_view_or_alternative is distinct from p_finding_spec->'counter_view_or_alternative'
  or f.missing_evidence is distinct from p_finding_spec->'missing_evidence'
  or f.uncertainty is distinct from p_finding_spec->'uncertainty'
  or f.discovery_method is distinct from disc
  or f.expression_rule is distinct from '{}'::jsonb or f.ranking_components is distinct from '{}'::jsonb
  then raise exception 'PRIVATE_HUMANISTIC_FINDING_IDEMPOTENCY_CONFLICT';end if;
 return jsonb_build_object('finding_id',p_finding,'claim_revision_id',p_revision,'request_digest',p_digest,
  'artifact_revision',control.artifact_revision_for('finding',p_finding));
end $$;
revoke all on function studio.persist_private_humanistic_finding(uuid,uuid,text,uuid,uuid,jsonb)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_humanistic_finding(uuid,uuid,text,uuid,uuid,jsonb) to mohen_app_runtime;

-- 4) D05: one P02 world projection derived from one A06 finding of the same
--    private chain. Payload stays candidate-only and qualification UNASSESSED.
create or replace function studio.persist_private_world_projection(
 p_original uuid,p_projection uuid,p_digest text,p_run uuid,p_finding_id uuid,p_projection_spec jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals; f meaning.findings; p read_model.world_projections; payload jsonb; rule jsonb;
begin
 original:=studio.private_bridge_original(p_original);
 perform 1 from studio.private_originals where original_id=p_original for share;
 if p_run is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'
  or jsonb_typeof(p_projection_spec) is distinct from 'object'
  or p_projection_spec->>'projection_key' is null or octet_length(p_projection_spec->>'projection_key') not between 1 and 200
  or jsonb_typeof(p_projection_spec->'payload') is distinct from 'object'
  then raise exception 'PRIVATE_WORLD_PROJECTION_INVALID';end if;
 if p_projection is distinct from substring(encode(control.sha256_bytes(convert_to('mab-private-world-projection:'||p_digest,'UTF8')),'hex'),1,32)::uuid
  then raise exception 'PRIVATE_WORLD_PROJECTION_IDENTITY_INVALID';end if;
 perform 1 from control.production_runs where run_id=p_run
  and architecture_generation='mohen.six-stage.v1' and scope->>'project_id'=original.project_id::text for share;
 if not found then raise exception 'PRIVATE_WORLD_PROJECTION_RUN_NOT_BOUND';end if;
 select * into f from meaning.findings where finding_id=p_finding_id for share;
 if f.finding_id is null or f.discovery_method->>'method_id' is distinct from 'A06'
  or jsonb_typeof(f.supporting_world_objects) is distinct from 'array'
  then raise exception 'PRIVATE_WORLD_PROJECTION_FINDING_NOT_VERIFIED';end if;
 if not exists(select 1 from jsonb_array_elements(f.supporting_world_objects) o
   where o->>'kind'='claim_revision' and o->>'id' is not null
    and o->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists(select 1 from world.claim_revisions c2 where c2.claim_revision_id=(o->>'id')::uuid
     and c2.assertion_payload_json->>'project_id'=original.project_id::text))
  then raise exception 'PRIVATE_WORLD_PROJECTION_FINDING_NOT_VERIFIED';end if;
 payload:=jsonb_build_object('schema','mohen.private-world-projection.v1','qualification','UNASSESSED',
  'body',p_projection_spec->'payload','finding_id',p_finding_id,'original_id',p_original,'request_digest',p_digest);
 rule:=jsonb_build_object('method_id','P02','method_version','source-sha256:mab-m5-isolated','qualification','UNASSESSED');
 perform pg_advisory_xact_lock(hashtextextended('private-world-projection:'||p_projection::text,0));
 select * into p from read_model.world_projections where projection_id=p_projection;
 if not found then
  insert into read_model.world_projections(projection_id,projection_key,payload,derived_from_finding_ids,expression_rule)
  values(p_projection,p_projection_spec->>'projection_key',payload,array[p_finding_id],rule);
 end if;
 select * into p from read_model.world_projections where projection_id=p_projection;
 if p.projection_id is null
  or p.projection_key is distinct from p_projection_spec->>'projection_key'
  or p.payload is distinct from payload
  or p.derived_from_finding_ids is distinct from array[p_finding_id]
  or p.expression_rule is distinct from rule
  then raise exception 'PRIVATE_WORLD_PROJECTION_IDEMPOTENCY_CONFLICT';end if;
 return jsonb_build_object('projection_id',p_projection,'finding_id',p_finding_id,'request_digest',p_digest,
  'artifact_revision',control.artifact_revision_for('world_projection',p_projection));
end $$;
revoke all on function studio.persist_private_world_projection(uuid,uuid,text,uuid,uuid,jsonb)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_world_projection(uuid,uuid,text,uuid,uuid,jsonb) to mohen_app_runtime;

commit;
