-- MAB M5（2026-11-13，Owner 裁决：授权范围要同时满足"签发安全"与"人工维护可行"）
--
-- 事实：control.gate_reviewer_bindings 的 G0–G5 授权一律写死
--   allowed_scope = {"project_id":"b0a11000-0000-4000-8000-000000000001"}
-- 机器评审对任何新建项目因此必抛 REVIEWER_BINDING_REQUIRED。逐项目人工开授权，
-- 等于每开一个题材就要 Owner 手工加一次 —— 对"任意题材可创作"的产品目标不可行。
--
-- 本迁移引入**规则化授权**（rule scope），不放开任何写权限、不改任何 Gate 规则：
--   allowed_scope = {"scope_kind":"studio_project"}
-- 表示"Studio 里的真实项目皆在授权面内"，判定条件落到库里可核的事实：
--   候选 allowed_scope->>'project_id' 必须有 D00 Y01 的需求回执（source.source_needs）。
--   择此判据的原因：Gate 授权角色本来就能读 source.*，无需为它新增任何表读权限；
--   而 source_needs 由 D00 工序在真实项目作用域内写入，编造的 project_id 没有该回执即不授权。
-- 因此：
--   * 没有走过 D00 需求登记的伪造项目仍签不了；
--   * 非 Studio 对象（无项目归属的候选）仍须靠逐项目精确授权（@> 原语义保留）；
--   * 签发安全性仍由既有四道闸门保证：评审身份与 Producer 隔离、精确 input 指纹、
--     制品修订必须当前、上游依赖必须当前，以及审计全量留痕。
create or replace function control.sign_gate_candidate(p_candidate uuid,p_request uuid,p_result text,p_rule text,
 p_until timestamptz,p_receipt jsonb,p_expected uuid default null) returns uuid
language plpgsql security definer set search_path=pg_catalog set jit=off as $$
declare
 c control.gate_candidates; p control.gate_policy_versions; previous control.gate_audits;
 principal uuid; actor name; current_id uuid; new_id uuid; fingerprint text; key_text text;
begin
 principal:=control.current_app_user_id();
 actor:=coalesce(nullif(current_setting('role',true),'none'),session_user)::name;
 if principal is null then raise exception 'REVIEWER_IDENTITY_REQUIRED'; end if;
 if not pg_has_role(actor,'mohen_gate_signer','MEMBER') or exists(select from pg_roles where rolname=actor and (rolsuper or rolbypassrls)) then raise exception 'REVIEWER_DB_IDENTITY_INVALID'; end if;
 select * into c from control.gate_candidates where candidate_id=p_candidate;
 if not found then raise exception 'GATE_CANDIDATE_NOT_FOUND'; end if;
 if actor=c.producer_identity::name then raise exception 'PRODUCER_CANNOT_SIGN'; end if;
 -- 授权判定：精确范围（原语义）或规则范围（只对库里真实存在的 Studio 项目成立）。
 if not exists(select from control.gate_reviewer_bindings b where b.reviewer_user_id=principal and b.db_identity=actor
  and b.gate_code=c.gate_code and b.purpose_namespace=c.purpose_namespace and b.purpose_code=c.purpose_code
  and b.purpose_version=c.purpose_version and b.consumer=c.consumer
  and (b.allowed_scope @> c.allowed_scope or (
        b.allowed_scope->>'scope_kind'='studio_project'
        and exists(select from source.source_needs sn
                    where sn.project_id::text=c.allowed_scope->>'project_id')))
  and b.active and now()>=b.valid_from and now()<b.valid_until) then raise exception 'REVIEWER_BINDING_REQUIRED'; end if;
 select * into p from control.gate_policy_versions where gate_code=c.gate_code and rule_version=p_rule and enabled;
 if not found then raise exception 'GATE_POLICY_NOT_ACTIVE'; end if;
 if p_request is null or p_result not in ('PASS','HOLD','REJECT') or p_result is null then raise exception 'GATE_DECISION_INVALID'; end if;
 if p_until is null or p_until<=now() or p_until>now()+p.max_validity then raise exception 'QUALIFICATION_VALIDITY_INVALID'; end if;
 if p_receipt is null or jsonb_typeof(p_receipt)<>'object' or length(coalesce(p_receipt->>'rationale',''))=0
  or p_receipt->'evidence_refs' is distinct from c.evidence_refs
  or exists(select from unnest(p.required_checks) required where
    jsonb_typeof(p_receipt->'checks'->required) is distinct from 'boolean'
    or (p_result='PASS' and p_receipt->'checks'->required is distinct from 'true'::jsonb))
 then raise exception 'REVIEW_RECEIPT_INVALID'; end if;
 fingerprint:=encode(control.sha256_bytes(convert_to(jsonb_build_object('candidate',p_candidate,'result',p_result,'rule',p_rule,'until',p_until,
  'receipt',p_receipt,'expected',p_expected,'reviewer',principal,'db',actor)::text,'UTF8')),'hex');
 key_text:=jsonb_build_array('mohen.six-stage.v1',c.gate_code,c.object_type,c.object_id,
  c.purpose_namespace,c.purpose_code,c.purpose_version,c.consumer)::text;
 perform pg_advisory_xact_lock(hashtextextended(key_text,0));
 select * into previous from control.gate_audits where decision_request_id=p_request;
 if found then
  if previous.decision_request_fingerprint is distinct from fingerprint then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return previous.gate_audit_id;
 end if;
 perform 1 from control.qualification_current where architecture_generation='mohen.six-stage.v1'
  and gate_code=c.gate_code and object_type=c.object_type and object_id=c.object_id
  and purpose_namespace=c.purpose_namespace and purpose_code=c.purpose_code and purpose_version=c.purpose_version and consumer=c.consumer for update;
 select gate_audit_id into current_id from control.qualification_current where architecture_generation='mohen.six-stage.v1'
  and gate_code=c.gate_code and object_type=c.object_type and object_id=c.object_id
  and purpose_namespace=c.purpose_namespace and purpose_code=c.purpose_code and purpose_version=c.purpose_version and consumer=c.consumer
  order by valid_from desc,gate_audit_id desc limit 1;
 if current_id is distinct from p_expected then raise exception 'QUALIFICATION_CAS_CONFLICT'; end if;
 if c.candidate_status not in ('SUBMITTED','HOLD') then raise exception 'CANDIDATE_ALREADY_DECIDED'; end if;
 if c.gate_code<>'G0' and (jsonb_array_length(c.dependency_snapshot)=0 or not exists(
  select from jsonb_array_elements(c.dependency_snapshot) d join control.gate_audits parent
   on parent.gate_audit_id=(d.value->>'gate_audit_id')::uuid
  where parent.gate_code='G'||(substring(c.gate_code from 2)::int-1)::text)) then raise exception 'MISSING_UPSTREAM_DEPENDENCY'; end if;

 if c.artifact_revision is distinct from control.artifact_revision_for(c.object_type,c.object_id) then raise exception 'ARTIFACT_REVISION_NOT_CURRENT'; end if;
 if exists(select from jsonb_array_elements(c.dependency_snapshot) d where
  jsonb_typeof(d.value)<>'object' or d.value->>'gate_audit_id' is null
  or not exists(select from control.gate_audits a where a.gate_audit_id=(d.value->>'gate_audit_id')::uuid
    and a.qualification_digest=d.value->>'qualification_digest' and a.artifact_revision=d.value->>'artifact_revision'
    and control.current_qualification_is_valid(a.gate_audit_id))) then raise exception 'DEPENDENCY_NOT_CURRENT'; end if;
 insert into control.gate_audits(run_id,stage,gate_code,object_type,object_id,result,architecture_generation,purpose,allowed_scope,consumer,
  dependency_snapshot,input_fingerprint,rule_version,supersedes_id,candidate_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
  reviewer_user_id,reviewer_db_identity,decision_origin,valid_from,valid_until,qualification_digest,signed_at,decision_request_id,decision_request_fingerprint,details)
 values(c.run_id,c.stage,c.gate_code,c.object_type,c.object_id,p_result::control.gate_result,'mohen.six-stage.v1',c.purpose_code,c.allowed_scope,c.consumer,
  c.dependency_snapshot,c.input_fingerprint,p_rule,current_id,c.candidate_id,c.artifact_revision,c.purpose_namespace,c.purpose_code,c.purpose_version,
  principal,actor,'independent_gate',now(),p_until,fingerprint,now(),p_request,fingerprint,p_receipt) returning gate_audit_id into new_id;
 delete from control.qualification_current where architecture_generation='mohen.six-stage.v1'
  and gate_code=c.gate_code and object_type=c.object_type and object_id=c.object_id
  and purpose_namespace=c.purpose_namespace and purpose_code=c.purpose_code and purpose_version=c.purpose_version and consumer=c.consumer;
 if p_result='PASS' then
  insert into control.qualification_current(architecture_generation,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
    consumer,gate_audit_id,valid_from,valid_until,dependency_fingerprint,scope_digest,rule_version,reviewer_user_id)
  values('mohen.six-stage.v1',c.gate_code,c.object_type,c.object_id,c.artifact_revision,c.purpose_namespace,c.purpose_code,c.purpose_version,c.consumer,new_id,now(),p_until,
   encode(control.sha256_bytes(convert_to(c.dependency_snapshot::text,'UTF8')),'hex'),encode(control.sha256_bytes(convert_to(c.allowed_scope::text,'UTF8')),'hex'),p_rule,principal);
 end if;
 update control.gate_candidates set candidate_status=case p_result when 'PASS' then 'CONSUMED' when 'HOLD' then 'HOLD' else 'REJECTED' end where candidate_id=p_candidate;
 return new_id;
end $$;
alter function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) owner to mohen_gate_authority;
revoke all on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) from public;
grant execute on function control.sign_gate_candidate(uuid,uuid,text,text,timestamptz,jsonb,uuid) to mohen_gate_signer;

-- 授权有效性判定必须与签发判定同口径：否则用规则范围签出的审计会立刻被判"非当前"，
-- 表现为签名成功但 D00 仍 HOLD（INDEPENDENT_GATE_VERIFY_DENIED）。其余判据逐条不变。
create or replace function control.current_qualification_is_valid(p_audit uuid) returns boolean
language sql stable security definer set search_path=pg_catalog set jit=off as $$
 with recursive dependencies(id) as (
  select p_audit union
  select (d.value->>'gate_audit_id')::uuid from dependencies x
   join control.gate_audits a on a.gate_audit_id=x.id
   join control.gate_candidates c on c.candidate_id=a.candidate_id
   cross join lateral jsonb_array_elements(c.dependency_snapshot) d
 ), checked as (
  select x.id,
   a.decision_origin='independent_gate' and a.result='PASS' and a.current_valid
   and q.gate_audit_id is not null and now()>=q.valid_from and now()<q.valid_until
   and a.valid_from=q.valid_from and a.valid_until=q.valid_until
   and a.artifact_revision=q.artifact_revision and a.qualification_digest is not null
   and a.artifact_revision=control.artifact_revision_for(a.object_type,a.object_id)
   and u.status='active' and p.enabled
   and exists(select from control.gate_reviewer_bindings b where b.reviewer_user_id=a.reviewer_user_id
    and b.db_identity=a.reviewer_db_identity::name and b.gate_code=a.gate_code
    and b.purpose_namespace=a.purpose_namespace and b.purpose_code=a.purpose_code and b.purpose_version=a.purpose_version
    and b.consumer=a.consumer
    and (b.allowed_scope @> a.allowed_scope or (
          b.allowed_scope->>'scope_kind'='studio_project'
          and exists(select from source.source_needs sn
                      where sn.project_id::text=a.allowed_scope->>'project_id')))
    and b.active and now()>=b.valid_from and now()<b.valid_until)
   and not exists(select from jsonb_array_elements(c.dependency_snapshot) d
    left join control.gate_audits parent on parent.gate_audit_id=(d.value->>'gate_audit_id')::uuid
    where parent.gate_audit_id is null or parent.qualification_digest is distinct from d.value->>'qualification_digest'
     or parent.artifact_revision is distinct from d.value->>'artifact_revision') as valid
  from dependencies x left join control.gate_audits a on a.gate_audit_id=x.id
   left join control.gate_candidates c on c.candidate_id=a.candidate_id
   left join control.qualification_current q on q.gate_audit_id=a.gate_audit_id
   left join public.users u on u.user_id=a.reviewer_user_id
   left join control.gate_policy_versions p on p.gate_code=a.gate_code and p.rule_version=a.rule_version
 ) select coalesce(bool_and(coalesce(valid,false)),false) from checked
$$;
alter function control.current_qualification_is_valid(uuid) owner to mohen_gate_authority;
revoke all on function control.current_qualification_is_valid(uuid) from public;
grant execute on function control.current_qualification_is_valid(uuid) to mohen_producer,mohen_gate_signer,mohen_app_runtime;

-- 规则化授权绑定：只补"尚未存在同身份规则绑定"的 (身份, gate)，幂等可重跑。
-- 有效期沿用既有绑定口径（不无限期），到期需续；续期本身没有逐项目成本。
insert into control.gate_reviewer_bindings(reviewer_user_id,db_identity,gate_code,purpose_namespace,
  purpose_code,purpose_version,consumer,allowed_scope,valid_from,valid_until,source_ref,active)
select b.reviewer_user_id,b.db_identity,b.gate_code,b.purpose_namespace,
       b.purpose_code,b.purpose_version,b.consumer,'{"scope_kind":"studio_project"}'::jsonb,
       now(),now()+interval '180 days',
       'owner-decision-2026-11-13-gate-scope-rule',true
  from control.gate_reviewer_bindings b
 where b.purpose_code='m5-remediation' and b.consumer='producer'
   and b.db_identity in ('mohen_gate_signer_m5_machine','mohen_gate_signer_m5_owner','mohen_gate_signer')
   and b.allowed_scope ? 'project_id'
   and b.active
   and not exists(select from control.gate_reviewer_bindings x
                  where x.reviewer_user_id=b.reviewer_user_id and x.db_identity=b.db_identity
                    and x.gate_code=b.gate_code and x.purpose_namespace=b.purpose_namespace
                    and x.purpose_code=b.purpose_code and x.purpose_version=b.purpose_version
                    and x.consumer=b.consumer and x.allowed_scope->>'scope_kind'='studio_project'
                    and x.active);
