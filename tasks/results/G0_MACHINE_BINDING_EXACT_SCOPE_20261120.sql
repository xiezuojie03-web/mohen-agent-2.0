-- G0 machine-signer reviewer binding, EXACT project scope (cloud functions are the
-- legacy version that only accepts allowed_scope @> candidate scope; no
-- studio_project rule branch deployed). Owner named authorization 2026-11-20
-- ("install G0 reviewer binding ... strictly scoped to this project and G0").
-- Scope = the single real project e03c4ba8; gate = G0 only; purpose/consumer
-- match candidate 48766904 exactly. Idempotent. No credentials. No Gate writes.
begin;

-- Guard: machine reviewer account must be active.
do $$ begin
  if not exists(select from public.users
      where user_id='b0a11000-0000-4000-8000-0000000000a1'::uuid
        and status='active' and roles @> array['reviewer']::text[]) then
    raise exception 'MACHINE_REVIEWER_USER_INVALID';
  end if;
end $$;

-- The exact-scope G0 binding for the dedicated machine signer identity.
insert into control.gate_reviewer_bindings(
  reviewer_user_id, db_identity, gate_code, purpose_namespace, purpose_code,
  purpose_version, consumer, allowed_scope, valid_from, valid_until, source_ref, active
)
select
  'b0a11000-0000-4000-8000-0000000000a1'::uuid,
  'mohen_gate_signer_m5_machine'::name,
  'G0', 'data-production', 'm5-remediation', 'v1', 'producer',
  '{"project_id":"e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5"}'::jsonb,
  now(), now() + interval '30 days',
  'owner-2026-11-20-G0-01:exact-project-scope', true
where not exists(
  select from control.gate_reviewer_bindings b
  where b.reviewer_user_id='b0a11000-0000-4000-8000-0000000000a1'::uuid
    and b.db_identity='mohen_gate_signer_m5_machine'::name
    and b.gate_code='G0'
    and b.purpose_namespace='data-production' and b.purpose_code='m5-remediation'
    and b.purpose_version='v1' and b.consumer='producer'
    and b.allowed_scope @> '{"project_id":"e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5"}'::jsonb
    and b.active
);

-- Post-condition: the legacy sign predicate must find this binding.
do $$
declare ok boolean;
begin
  select exists(
    select from control.gate_reviewer_bindings b
    cross join control.gate_candidates c
    where c.candidate_id='48766904-c409-4b37-b602-9339a582b7e6'
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

-- Verification (read-only): show the new binding.
select binding_id::text, db_identity, gate_code, allowed_scope::text, valid_until::text, source_ref
from control.gate_reviewer_bindings
where source_ref='owner-2026-11-20-G0-01:exact-project-scope';
