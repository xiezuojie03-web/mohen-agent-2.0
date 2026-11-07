-- MAB M5 step 2 batch C: D02–D05 private candidate persistence for the isolated
-- 松江府田赋 vertical slice. Same contract as 20261107120000: byte-attested,
-- deterministic-id, idempotent candidate writes only. No Gate signing, no
-- qualification write, no production enablement. Requires separately authorized
-- deployment.
begin;

-- 1) D02: one H05 gazetteer material observation bound to the verified C02
--    scanned-page read unit. The HMAC attestation pins the request digest,
--    every derived id and the observation payload; ids are deterministic so a
--    replay either matches or fails closed.
create or replace function studio.persist_private_material_observation(
 p_original uuid,p_evidence uuid,p_reading_unit uuid,p_link uuid,p_digest text,p_run uuid,
 p_observation jsonb,p_attestation text)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals; claims jsonb; encoded text; signature text; expected text;
 key_value text; crypto_schema text; now_ms bigint; receipt jsonb; extraction jsonb; read_unit uuid;
 r source.read_runs; u source.read_units; raw source.raw_items; v source.source_versions;
 ru evidence.reading_units; e evidence.material_evidence; l evidence.read_unit_evidence_links;
begin
 original:=studio.private_bridge_original(p_original);
 perform 1 from studio.private_originals where original_id=p_original for share;
 if original.content_type not in ('image/png','image/jpeg','image/webp')
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
 if u.read_unit_id is null or u.locator_schema is distinct from 'scanned_page/v1'
  or u.method_code is distinct from 'C02'
  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_READ_UNIT_INVALID';end if;
 select * into r from source.read_runs where read_run_id=u.read_run_id for share;
 if r.read_run_id is null then raise exception 'PRIVATE_MATERIAL_OBSERVATION_READ_UNIT_INVALID';end if;
 select * into raw from source.raw_items where raw_item_id=r.raw_item_id for share;
 select * into v from source.source_versions where source_version_id=raw.source_version_id for share;
 if raw.raw_item_id is null or v.source_version_id is null
  or r.config->>'schema' is distinct from 'mab.private-scanned-page-reading.v1'
  or r.status is distinct from 'done'
  or u.locator->>'raw_item_id' is distinct from raw.raw_item_id::text
  or raw.checksum_sha256 is distinct from original.sha256
  or u.locator->>'page_sha256' is distinct from original.sha256
  or not studio.private_source_binding_matches(p_original,raw.source_version_id,raw.raw_item_id,original.sha256)
  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_READ_UNIT_INVALID';end if;
 perform pg_advisory_xact_lock(hashtextextended('private-material-observation:'||p_evidence::text,0));
 select * into e from evidence.material_evidence where evidence_id=p_evidence;
 if not found then
  insert into evidence.reading_units(reading_unit_id,source_version_id,raw_item_id,unit_kind,primary_h_type,taxonomy_version,classification_status,classification_basis)
  values(p_reading_unit,raw.source_version_id,raw.raw_item_id,'page','H05','mohka-d02-h-classification.v1','candidate','MAB M5 isolated D02 H05 gazetteer observation; qualification UNASSESSED');
  insert into evidence.material_evidence(evidence_id,source_id,source_version_id,raw_item_id,locator,modality,literal_reading,
   normalized_text,research_proposition,source_voice,evidence_type,reading_unit_id,uncertainty,extraction_method,evidence_version_no,input_fingerprint)
  values(p_evidence,v.source_id,raw.source_version_id,raw.raw_item_id,u.locator,'page_image',p_observation->>'literal_reading',
   p_observation->>'normalized_text',p_observation->>'research_proposition',p_observation->>'source_voice',p_observation->>'evidence_type',
   p_reading_unit,p_observation->'uncertainty',extraction,1,p_digest);
  insert into evidence.read_unit_evidence_links(link_id,evidence_id,read_unit_id,read_run_id,selected_extent,selection_basis,
   quote_snapshot_hash,link_version,extent_order,allowed_purpose,locator_schema_version,byte_verification_receipt)
  values(p_link,p_evidence,read_unit,u.read_run_id,u.locator,'exact scanned page bytes verified by server',original.sha256,
   'mab.private-material-observation.v1',1,'private_research_candidate','scanned_page/v1',receipt);
 end if;
 select * into ru from evidence.reading_units where reading_unit_id=p_reading_unit;
 select * into e from evidence.material_evidence where evidence_id=p_evidence;
 select * into l from evidence.read_unit_evidence_links where link_id=p_link;
 if ru.reading_unit_id is null or e.evidence_id is null or l.link_id is null
  or ru.source_version_id is distinct from raw.source_version_id or ru.raw_item_id is distinct from raw.raw_item_id
  or ru.unit_kind is distinct from 'page' or ru.primary_h_type is distinct from 'H05'
  or ru.taxonomy_version is distinct from 'mohka-d02-h-classification.v1'
  or ru.classification_status is distinct from 'candidate'
  or ru.classification_basis is distinct from 'MAB M5 isolated D02 H05 gazetteer observation; qualification UNASSESSED'
  or e.source_id is distinct from v.source_id or e.source_version_id is distinct from raw.source_version_id
  or e.raw_item_id is distinct from raw.raw_item_id or e.locator is distinct from u.locator
  or e.modality is distinct from 'page_image'
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
  or l.selection_basis is distinct from 'exact scanned page bytes verified by server'
  or l.quote_snapshot_hash is distinct from original.sha256
  or l.link_version is distinct from 'mab.private-material-observation.v1'
  or l.extent_order is distinct from 1 or l.allowed_purpose is distinct from 'private_research_candidate'
  or l.locator_schema_version is distinct from 'scanned_page/v1'
  or l.byte_verification_receipt->>'key_version' is distinct from receipt->>'key_version'
  then raise exception 'PRIVATE_MATERIAL_OBSERVATION_IDEMPOTENCY_CONFLICT';end if;
 return jsonb_build_object('evidence_id',p_evidence,'reading_unit_id',p_reading_unit,'link_id',p_link,
  'read_unit_id',read_unit,'read_run_id',u.read_run_id,'request_digest',p_digest,
  'artifact_revision',control.artifact_revision_for('material_evidence',p_evidence));
end $$;
revoke all on function studio.persist_private_material_observation(uuid,uuid,uuid,uuid,text,uuid,jsonb,text)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_material_observation(uuid,uuid,uuid,uuid,text,uuid,jsonb,text) to mohen_app_runtime;

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

-- 5) artifact_revision_for 需要为 claim_revision 派生版本；这是唯一扩展点，
--    不新增第二套 artifact 注册。gate_authority 需要 claim_revisions 读权限。
grant usage on schema world to mohen_gate_authority;
grant select on world.claim_revisions to mohen_gate_authority;
create or replace function control.artifact_revision_for(p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path=pg_catalog set jit=off as $$
declare ns text; tbl text; key_col text; revision text;
begin
 select m.ns,m.tbl,m.key_col into ns,tbl,key_col from (values
    ('source','source','sources','source_id'),
    ('source_version','source','source_versions','source_version_id'),
    ('raw_item','source','raw_items','raw_item_id'),
    ('read_unit','source','read_units','read_unit_id'),
    ('reading_unit','source','read_units','read_unit_id'),
    ('read_run','source','read_runs','read_run_id'),
    ('material_evidence','evidence','material_evidence','evidence_id'),
    ('entity','world','entities','entity_id'),
    ('event','world','events','event_id'),
    ('relation_claim','world','relation_claims','relation_claim_id'),
    ('change','world','changes','change_id'),
    ('claim_revision','world','claim_revisions','claim_revision_id'),
    ('historical_space_claim','world','historical_space_claims','historical_space_claim_id'),
    ('visual_object','world','visual_objects','visual_object_id'),
    ('finding','meaning','findings','finding_id'),
    ('present_connection','meaning','present_connections','present_connection_id'),
    ('open_question','meaning','open_questions','open_question_id'),
    ('world_projection','read_model','world_projections','projection_id'),
    ('agent_context','read_model','agent_contexts','agent_context_id'),
    ('story_seed','read_model','story_seeds','story_seed_id'),
    ('discovery_path','read_model','discovery_paths','discovery_path_id'),
    ('map_timeline_projection','read_model','map_timeline_projections','map_timeline_projection_id'),
    ('evidence_pointer','read_model','evidence_pointers','evidence_pointer_id')) as m(kind,ns,tbl,key_col) where m.kind=p_kind;
 if not found then return null; end if;
 execute format('select encode(control.sha256_bytes(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') from %I.%I t where %I=$1',ns,tbl,key_col) into revision using p_id;
 return revision;
end $$;
commit;
