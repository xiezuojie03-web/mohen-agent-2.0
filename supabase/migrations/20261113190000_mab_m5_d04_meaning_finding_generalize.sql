-- D04 persist_private_humanistic_finding：泛化支持 A01-A12 全部人文发现方法。
-- 原 M5 isolated 样板写死 finding_type='institutional_mechanism' + discovery_method.method_id='A06'。
-- D05 persist_private_world_projection 同步泛化：上游 finding 的 discovery_method.method_id ∈ A01-A12。
-- A 方法全集：A01 显式关系 / A02 共现跨源 / A03 时间序列 / A04 空间拓扑 / A05 行动链
--             A06 制度机制 / A07 跨模态共指 / A08 结构聚类 / A09 变化链 / A10 冲突发现
--             A11 跨时空比较 / A12 当下线索
-- method-binding-contract.json 已登记 A01-A12 全部为 D04 合法方法（implementation_binding 仍为 HOLD 需逐一松绑）。

begin;

-- 1) D04: 泛化 persist_private_humanistic_finding
create or replace function studio.persist_private_humanistic_finding(
 p_original uuid,p_finding uuid,p_digest text,p_run uuid,p_revision uuid,p_finding_spec jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 original studio.private_originals; claim world.claim_revisions; f meaning.findings; refs jsonb; disc jsonb;
 method_id text;
begin
 original:=studio.private_bridge_original(p_original);
 perform 1 from studio.private_originals where original_id=p_original for share;

 -- method_id 必须在 finding_spec 里，且是合法的 A01-A12
 method_id:=p_finding_spec->>'method_id';
 if p_run is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'
  or jsonb_typeof(p_finding_spec) is distinct from 'object'
  or method_id is null or method_id !~ '^A(0[1-9]|1[0-2])$'
  or p_finding_spec->>'finding_type' is null or octet_length(p_finding_spec->>'finding_type') not between 1 and 200
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
 disc:=jsonb_build_object('method_id',method_id,'method_version','source-sha256:mab-m5-isolated','qualification','UNASSESSED','request_digest',p_digest);
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
  or f.finding_type is distinct from p_finding_spec->>'finding_type'
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

-- 2) D05: 泛化 persist_private_world_projection —— 接受 A01-A12 任意方法的 finding
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
 -- 泛化：discovery_method.method_id ∈ A01-A12 任意合法人文发现方法
 if f.finding_id is null or f.discovery_method->>'method_id' !~ '^A(0[1-9]|1[0-2])$'
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
