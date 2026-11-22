begin;

-- Fix (D03 first real execution): studio.persist_private_world_claim() derived
-- artifact_revision via control.artifact_revision_for('claim_revision',...),
-- but that gate-authority-owned function has no claim_revision mapping and
-- returns null, so the D03 candidate writer failed its isHash() guard
-- (PRIVATE_WORLD_CLAIM_NOT_PERSISTED). This function is owned by postgres and
-- already uses control.sha256_bytes elsewhere; compute the row hash inline with
-- the exact same formula artifact_revision_for uses, so the artifact_revision
-- semantics are unchanged. Do not touch the gate-authority-owned function.
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
  'artifact_revision',encode(control.sha256_bytes(convert_to(to_jsonb(cr)::text,'UTF8')),'hex'));
end $$;

revoke all on function studio.persist_private_world_claim(uuid,uuid,uuid,text,uuid,uuid,jsonb)
 from public,anon,authenticated,service_role,mohen_producer,mohen_gate_signer;
grant execute on function studio.persist_private_world_claim(uuid,uuid,uuid,text,uuid,uuid,jsonb)
 to mohen_app_runtime;

commit;
