-- D02 persist_private_material_observation：泛化支持 C01 文本载体（text/plain + utf8_byte_range/v1）。
-- 原 M2 时代写死 content_type ∈ {image/png,jpeg,webp} + locator_schema='scanned_page/v1' + method_code='C02'。
-- M5 泛化冒烟中 SHL 地名志 text/plain 原件（C01 utf8_byte_range/v1）真实跑 D02 observeMaterial(H05)
-- 时 DB 层校验不通过。修复：content_type 放开 text/plain；locator_schema ∋ utf8_byte_range/v1/scanned_page/v1；
-- method_code ∋ C01/C02；read_run config.schema ∋ mab.private-text-reading.v1 / mab.private-scanned-page-reading.v1；
-- insert material_evidence.modality='text_quote'；evidence_links.locator_schema_version='utf8_byte_range/v1'；
-- reading_units.unit_kind='paragraph'；evidence_links.selection_basis='exact byte-range quote verified by read_unit locator'。
-- JS 层（private-evidence-stage.mjs）同步已无 content_type / locator_schema / method_code 硬编码。

begin;
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

end; $function$;

revoke all on function studio.persist_private_material_observation(uuid,uuid,uuid,uuid,text,uuid,jsonb,text)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_material_observation(uuid,uuid,uuid,uuid,text,uuid,jsonb,text) to mohen_app_runtime;

commit;