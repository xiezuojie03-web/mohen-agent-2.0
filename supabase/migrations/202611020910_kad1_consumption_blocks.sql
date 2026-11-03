-- KAD1 design target; applies after existing K3 Gate authority migration, never during design review.
begin;
grant execute on function control.current_app_user_id() to mohen_gate_authority;
create table if not exists control.consumption_blocks(
 block_id uuid primary key default gen_random_uuid(),object_type text not null,object_id uuid not null,
 artifact_revision text not null,reason text not null,requested_by uuid not null references public.users(user_id),created_at timestamptz not null default now());
alter table control.consumption_blocks owner to mohen_gate_authority;
revoke all on control.consumption_blocks from public,mohen_app_runtime,mohen_producer,mohen_gate_signer;
create index if not exists kad1_block_object on control.consumption_blocks(object_type,object_id,artifact_revision);
create or replace function control.request_consumption_block(p_type text,p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=control.current_app_user_id();bid uuid;
begin
 if actor is null or not exists(select from public.users where user_id=actor and status='active' and 'operator'=any(roles)) then raise insufficient_privilege;end if;
 if p_type not in ('source','source_version','raw_item','read_unit','reading_unit','read_run','material_evidence','entity','event','relation_claim','change','historical_space_claim','visual_object','finding','present_connection','open_question','world_projection','agent_context','story_seed','discovery_path','map_timeline_projection','evidence_pointer') or control.artifact_revision_for(p_type,p_id) is null then raise exception 'OBJECT_MAPPING_REQUIRED';end if;
 insert into control.consumption_blocks(object_type,object_id,artifact_revision,reason,requested_by) values(p_type,p_id,control.artifact_revision_for(p_type,p_id),p_reason,actor) returning block_id into bid;
 return bid;
end $$;
alter function control.request_consumption_block(text,uuid,text) owner to mohen_gate_authority;
revoke all on function control.request_consumption_block(text,uuid,text) from public;
grant execute on function control.request_consumption_block(text,uuid,text) to mohen_app_runtime;
create or replace function control.qualification_allows(p_audit uuid,p_consumer text,p_namespace text,p_code text,p_version text,p_scope jsonb) returns boolean
language sql stable security definer set search_path=pg_catalog set jit=off as $$
 with recursive ancestry(id) as (
 select p_audit union select (d.value->>'gate_audit_id')::uuid from ancestry x
 join control.gate_audits a on a.gate_audit_id=x.id join control.gate_candidates c on c.candidate_id=a.candidate_id
 cross join lateral jsonb_array_elements(c.dependency_snapshot) d
 ) select exists(select from control.gate_audits a where a.gate_audit_id=p_audit
 and a.consumer=p_consumer and a.purpose_namespace=p_namespace and a.purpose_code=p_code and a.purpose_version=p_version
 and jsonb_typeof(p_scope)='object' and a.allowed_scope @> p_scope and control.current_qualification_is_valid(p_audit)
 and not exists(select from ancestry x join control.gate_audits dependency on dependency.gate_audit_id=x.id
 join control.consumption_blocks b on b.object_type=dependency.object_type and b.object_id=dependency.object_id and b.artifact_revision=dependency.artifact_revision))
$$;
alter function control.qualification_allows(uuid,text,text,text,text,jsonb) owner to mohen_gate_authority;
revoke all on function control.qualification_allows(uuid,text,text,text,text,jsonb) from public;
grant execute on function control.qualification_allows(uuid,text,text,text,text,jsonb) to mohen_app_runtime,mohen_producer,mohen_gate_signer;
commit;
