-- G0 机器评审在真实项目 d9d48901 上的授权与只读范围（2026-11-21）
--
-- 依据：
--   1) PLAN §3.5 C/D：同一真实作品沿唯一 Runner/Registry 推进，Producer 提交候选、
--      独立机器评审核验后签发；不得由 Creator/Producer 自签。
--   2) 设计迁移 20261113150000_mab_m5_reviewer_scope_follows_candidates.sql：
--      机器评审对 studio.private_originals 的只读范围应"跟随当前有待评审候选的项目"，
--      而不是写死某个项目 id。云端当前仍是写死 e03c4ba8 的旧谓词（漂移），本文件
--      按设计原文恢复该策略；不含任何写权限、不改 Gate 规则与检查项。
--   3) 云端 control.sign_gate_candidate 为旧版（allowed_scope @> 候选范围，无
--      studio_project 规则分支），故在保持核心函数不变的前提下，按 2026-11-20
--      同一做法补一条"仅本项目 + G0"的精确范围绑定。
--
-- 边界：仅新增/替换一条只读 RLS 策略与一条 active 绑定；不写 Gate 审计、不改
-- 候选状态、不授予任何写权限、不含凭据。幂等可重跑。
begin;

-- 1) 评审只读范围跟随"有 SUBMITTED 生产者候选"的项目（设计迁移原文）。
drop policy if exists m5_machine_reviewer_read on studio.private_originals;

create policy m5_machine_reviewer_read on studio.private_originals
  for select to mohen_gate_signer_m5_machine
  using (
    project_id in (
      select distinct (c.allowed_scope ->> 'project_id')::uuid
        from control.gate_candidates c
       where c.consumer = 'producer'
         and c.candidate_status = 'SUBMITTED'
    )
  );

-- 2) 机器评审账号必须仍是激活的独立 reviewer。
do $$ begin
  if not exists(select from public.users
      where user_id='b0a11000-0000-4000-8000-0000000000a1'::uuid
        and status='active' and roles @> array['reviewer']::text[]) then
    raise exception 'MACHINE_REVIEWER_USER_INVALID';
  end if;
end $$;

-- 3) 仅本项目 d9d48901 + G0 + 现有用途的精确范围绑定（旧签发函数可直接匹配）。
insert into control.gate_reviewer_bindings(
  reviewer_user_id, db_identity, gate_code, purpose_namespace, purpose_code,
  purpose_version, consumer, allowed_scope, valid_from, valid_until, source_ref, active
)
select
  'b0a11000-0000-4000-8000-0000000000a1'::uuid,
  'mohen_gate_signer_m5_machine'::name,
  'G0', 'data-production', 'm5-remediation', 'v1', 'producer',
  '{"project_id":"d9d48901-3aa3-4424-b50f-965d6749ee8e"}'::jsonb,
  now(), now() + interval '30 days',
  'plan-3.5C-2026-11-21:g0-machine-exact-project-scope:d9d48901', true
where not exists(
  select from control.gate_reviewer_bindings b
  where b.reviewer_user_id='b0a11000-0000-4000-8000-0000000000a1'::uuid
    and b.db_identity='mohen_gate_signer_m5_machine'::name
    and b.gate_code='G0'
    and b.purpose_namespace='data-production' and b.purpose_code='m5-remediation'
    and b.purpose_version='v1' and b.consumer='producer'
    and b.allowed_scope @> '{"project_id":"d9d48901-3aa3-4424-b50f-965d6749ee8e"}'::jsonb
    and b.active
);

-- 4) 后置校验：真实候选必须能命中授权；评审必须能读到本项目原件。
do $$
declare ok boolean;
begin
  select exists(
    select from control.gate_reviewer_bindings b
    cross join control.gate_candidates c
    where c.candidate_id='9c55df1e-2f91-404e-a6a1-4649717b25f1'
      and b.reviewer_user_id='b0a11000-0000-4000-8000-0000000000a1'::uuid
      and b.db_identity='mohen_gate_signer_m5_machine'::name
      and b.gate_code=c.gate_code and b.purpose_namespace=c.purpose_namespace
      and b.purpose_code=c.purpose_code and b.purpose_version=c.purpose_version
      and b.consumer=c.consumer and b.allowed_scope @> c.allowed_scope
      and b.active and now()>=b.valid_from and now()<b.valid_until
  ) into ok;
  if not ok then raise exception 'EXACT_BINDING_POSTCONDITION_FAILED'; end if;
end $$;

commit;

select binding_id::text, db_identity, gate_code, allowed_scope::text, valid_until::text, source_ref
from control.gate_reviewer_bindings
where source_ref='plan-3.5C-2026-11-21:g0-machine-exact-project-scope:d9d48901';
