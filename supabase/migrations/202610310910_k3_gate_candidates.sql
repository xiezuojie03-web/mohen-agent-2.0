-- Additive candidate/audit/projection separation. No real Gate identity is activated.
begin;
create table if not exists control.gate_candidates (
  candidate_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references control.production_runs(run_id),
  stage text not null check(stage in ('D00','D01','D02','D03','D04','D05')),
  gate_code text not null check(gate_code in ('G0','G1','G2','G3','G4','G5')),
  object_type text not null, object_id uuid not null, artifact_revision text not null check(length(artifact_revision)>0),
  purpose_namespace text not null, purpose_code text not null, purpose_version text not null,
  allowed_scope jsonb not null, consumer text not null,
  dependency_snapshot jsonb not null check(jsonb_typeof(dependency_snapshot)='array'),
  evidence_refs jsonb not null check(jsonb_typeof(evidence_refs)='array' and jsonb_array_length(evidence_refs)>0),
  input_fingerprint text not null check(input_fingerprint ~ '^[a-f0-9]{64}$'),
  submitted_at timestamptz not null default now(), producer_identity text not null default current_user,
  candidate_status text not null default 'SUBMITTED' check(candidate_status in ('SUBMITTED','HOLD','REJECTED','CONSUMED')),
  check(substring(stage from 2)::integer=substring(gate_code from 2)::integer)
);
alter table control.gate_candidates enable row level security;
revoke all on control.gate_candidates from public, mohen_app_runtime, mohen_gate_signer, mohen_producer;
grant insert(run_id,stage,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,
             allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,candidate_status), select on control.gate_candidates to mohen_producer;
drop policy if exists k3_producer_candidates on control.gate_candidates;
create policy k3_producer_candidates on control.gate_candidates to mohen_producer
  using(producer_identity=current_user)
  with check(producer_identity=current_user and candidate_status='SUBMITTED');

alter table control.gate_audits
  add column if not exists candidate_id uuid references control.gate_candidates(candidate_id),
  add column if not exists artifact_revision text,
  add column if not exists purpose_namespace text,
  add column if not exists purpose_code text,
  add column if not exists purpose_version text,
  add column if not exists reviewer_user_id uuid references public.users(user_id),
  add column if not exists reviewer_db_identity text,
  add column if not exists decision_origin text not null default 'legacy_untrusted',
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists long_term_basis jsonb,
  add column if not exists qualification_digest text,
  add column if not exists signed_at timestamptz;
do $$ begin
  if not exists(select from pg_constraint where conrelid='control.gate_audits'::regclass and conname='k3_decision_origin') then
    alter table control.gate_audits add constraint k3_decision_origin check(decision_origin in ('legacy_untrusted','independent_gate'));
  end if;
end $$;

create table if not exists control.qualification_current (
  architecture_generation text not null, gate_code text not null, object_type text not null, object_id uuid not null,
  artifact_revision text not null, purpose_namespace text not null, purpose_code text not null, purpose_version text not null,
  consumer text not null, gate_audit_id uuid not null references control.gate_audits(gate_audit_id),
  valid_from timestamptz not null, valid_until timestamptz not null,
  dependency_fingerprint text not null, scope_digest text not null, rule_version text not null,
  reviewer_user_id uuid not null references public.users(user_id),
  primary key(architecture_generation,gate_code,object_type,object_id,artifact_revision,purpose_namespace,purpose_code,purpose_version,consumer),
  check(valid_until>valid_from)
);
alter table control.qualification_current enable row level security;
revoke all on control.qualification_current from public, mohen_producer, mohen_gate_signer, mohen_app_runtime;
revoke insert,update,delete,truncate on control.gate_audits from mohen_producer,mohen_gate_signer,mohen_app_runtime;
-- No backfill from legacy PASS. Signed transaction/service deployment remains HOLD.
commit;
