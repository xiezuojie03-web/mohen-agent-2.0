-- MAB long-lived Studio objects. Private storage is not professional qualification.
-- Existing publication.work_revisions/public.director_plans/public.assets stay canonical.
begin;
create schema if not exists studio;
revoke all on schema studio from public;
grant usage on schema studio to mohen_app_runtime;

create table studio.projects (
 project_id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references public.users(user_id) on delete restrict,
 project_title text not null check(length(btrim(project_title)) between 1 and 200),
 research_scope jsonb not null default '{}' check(jsonb_typeof(research_scope)='object'),
 lifecycle_status text not null default 'ACTIVE' check(lifecycle_status in ('ACTIVE','ARCHIVED')),
 created_at timestamptz not null default now()
);
create index studio_projects_owner on studio.projects(owner_user_id,created_at desc);
create table studio.asset_heads (
 asset_id uuid primary key default gen_random_uuid(),
 project_id uuid not null references studio.projects(project_id) on delete restrict,
 asset_kind text not null check(asset_kind in ('research_brief','source_anchor','reading_note','evidence_note','spacetime_candidate',
 'relation_hypothesis','humanistic_insight','research_collection','director_plan','media_selection','work_revision','citation_snapshot','consented_feedback')),
 current_revision_id uuid,
 created_at timestamptz not null default now()
);
create index studio_asset_heads_project on studio.asset_heads(project_id,created_at desc);
create table studio.asset_revisions (
 revision_id uuid primary key default gen_random_uuid(),
 asset_id uuid not null references studio.asset_heads(asset_id) on delete restrict,
 revision_no integer not null check(revision_no>0),
 supersedes_revision_id uuid,
 actor_id uuid not null references public.users(user_id) on delete restrict,
 workspace_id text not null,
 origin_kind text not null check(origin_kind in ('human','internal_agent','external_delegate','formal_L_import')),
 epistemic_class text not null check(epistemic_class in ('original_material','observation','claim','hypothesis','editorial','qualified_L_ref')),
 payload jsonb,
 payload_storage_ref text,
 payload_format text not null default 'application/json',
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 source_refs jsonb not null default '[]' check(jsonb_typeof(source_refs)='array'),
 formal_l_refs jsonb not null default '[]' check(jsonb_typeof(formal_l_refs)='array'),
 dependency_refs jsonb not null default '[]' check(jsonb_typeof(dependency_refs)='array'),
 rights_by_action jsonb not null default '{"read":"unknown","quote":"unknown","display":"unknown","download":"unknown","adapt":"unknown","external_processing":"unknown"}' check(jsonb_typeof(rights_by_action)='object'),
 permission_scope jsonb not null default '{}' check(jsonb_typeof(permission_scope)='object'),
 content_state text not null default 'WORKING' check(content_state in ('WORKING','SNAPSHOTTED','REUSE_READY','ARCHIVED')),
 access_state text not null default 'RESTRICTED' check(access_state in ('AUTHORIZED','RESTRICTED','REVOKED')),
 freshness_state text not null default 'UNKNOWN_DEPENDENCY' check(freshness_state in ('CURRENT','STALE','UNKNOWN_DEPENDENCY')),
 validation jsonb not null default '{"status":"UNASSESSED","rule_version":null,"findings":[]}' check(jsonb_typeof(validation)='object'),
 origin_task_id uuid references public.research_tasks(task_id) on delete set null,
 origin_task_snapshot jsonb not null default '{}' check(jsonb_typeof(origin_task_snapshot)='object'),
 provenance jsonb not null default '{}' check(jsonb_typeof(provenance)='object'),
 delegation_id uuid, external_receipt_id uuid, tool_model_version text,
 idempotency_key text not null check(length(idempotency_key)>0),
 correlation_id text not null,
 created_at timestamptz not null default now(),
 unique(asset_id,revision_no), unique(asset_id,revision_id), unique(asset_id,idempotency_key),
 foreign key(asset_id,supersedes_revision_id) references studio.asset_revisions(asset_id,revision_id) deferrable initially deferred,
 check((payload is null)<>(payload_storage_ref is null)),
 check((revision_no=1 and supersedes_revision_id is null) or (revision_no>1 and supersedes_revision_id is not null)),
 check(epistemic_class<>'qualified_L_ref' or jsonb_array_length(formal_l_refs)>0)
);
alter table studio.asset_heads add constraint studio_head_same_asset
 foreign key(asset_id,current_revision_id) references studio.asset_revisions(asset_id,revision_id) deferrable initially deferred;
create index studio_asset_revisions_prior on studio.asset_revisions(asset_id,supersedes_revision_id);
create index studio_asset_revisions_task on studio.asset_revisions(origin_task_id) where origin_task_id is not null;

create table studio.delegations (
 delegation_id uuid primary key default gen_random_uuid(),
 project_id uuid not null references studio.projects(project_id) on delete restrict,
 root_task_ref text not null check(length(root_task_ref)>0),
 root_task_id uuid references public.research_tasks(task_id) on delete set null,
 root_task_snapshot jsonb not null default '{}',
 subtask_ref text not null,
 delegation_series_id uuid not null,
 delegation_revision_no integer not null check(delegation_revision_no>0),
 requester uuid not null references public.users(user_id) on delete restrict,
 executor text not null, provider text not null, engine_version text not null,
 input_manifest jsonb not null check(jsonb_typeof(input_manifest)='object'),
 allowed_actions text[] not null check(cardinality(allowed_actions)>0),
 transfer_rights_decision jsonb not null check(jsonb_typeof(transfer_rights_decision)='object'),
 policy_version text not null, expires_at timestamptz not null,
 budget_limit numeric(14,6) not null check(budget_limit>=0), currency text not null,
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 idempotency_key text not null check(length(idempotency_key)>0),
 output_schema text not null,
 created_at timestamptz not null default now(),
 unique(project_id,root_task_ref,idempotency_key),
 unique(delegation_series_id,delegation_revision_no), unique(delegation_id,request_hash),
 check(expires_at>created_at)
);
create index studio_delegations_project on studio.delegations(project_id,created_at desc);
create index studio_delegations_task on studio.delegations(root_task_id) where root_task_id is not null;
create table studio.execution_receipts (
 receipt_id uuid primary key default gen_random_uuid(),
 delegation_id uuid not null references studio.delegations(delegation_id) on delete restrict,
 attempt_no integer not null check(attempt_no>0),
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 result_hash text check(result_hash ~ '^[a-f0-9]{64}$'),
 result_manifest jsonb not null check(jsonb_typeof(result_manifest)='object'),
 candidate_refs jsonb not null default '[]' check(jsonb_typeof(candidate_refs)='array'),
 acceptance_state text not null check(acceptance_state in ('ACCEPT_AS_CANDIDATE','QUARANTINE','REJECT','REQUEST_D_STAGE','WAITING_GATE','HOLD')),
 actual_provider text not null, actual_engine_version text not null,
 started_at timestamptz, finished_at timestamptz,
 cost numeric(14,6) check(cost>=0), currency text,
 cost_confidence text not null default 'UNKNOWN' check(cost_confidence in ('UNKNOWN','ESTIMATED','ACTUAL')),
 error_code text,
 created_at timestamptz not null default now(),
 unique(delegation_id,attempt_no), unique(delegation_id,receipt_id),
 foreign key(delegation_id,request_hash) references studio.delegations(delegation_id,request_hash) on delete restrict,
 check(cost_confidence<>'UNKNOWN' or cost is null),
 check(cost is null or currency is not null),
 check(started_at is null or finished_at is null or finished_at>=started_at)
);
create index studio_receipts_delegation on studio.execution_receipts(delegation_id);
alter table studio.asset_revisions add foreign key(delegation_id) references studio.delegations(delegation_id) on delete restrict;
alter table studio.asset_revisions add foreign key(delegation_id,external_receipt_id) references studio.execution_receipts(delegation_id,receipt_id) on delete restrict;
alter table studio.asset_revisions add check(external_receipt_id is null or delegation_id is not null);
create table studio.asset_links (
 link_id uuid primary key default gen_random_uuid(),
 source_revision_id uuid not null references studio.asset_revisions(revision_id) on delete restrict,
 project_id uuid not null references studio.projects(project_id) on delete restrict,
 target_kind text not null, target_ref text not null, target_revision_ref text not null,
 link_role text not null, rights_decision_ref text not null,
 created_at timestamptz not null default now(),
 unique(source_revision_id,target_kind,target_ref,target_revision_ref,link_role)
);
create index studio_links_project on studio.asset_links(project_id);
create table studio.use_events (
 use_event_id uuid primary key default gen_random_uuid(),
 project_id uuid not null references studio.projects(project_id) on delete restrict,
 asset_revision_id uuid not null references studio.asset_revisions(revision_id) on delete restrict,
 actor_id uuid not null references public.users(user_id) on delete restrict,
 consumer text not null, purpose text not null, requested_action text not null,
 rights_decision_ref text not null,
 created_at timestamptz not null default now()
);
create index studio_use_events_project on studio.use_events(project_id,created_at desc);
create index studio_use_events_revision on studio.use_events(asset_revision_id,created_at desc);

-- A nullable task FK may be cleared by ON DELETE SET NULL; all substantive
-- revision fields, hashes and the immutable task snapshot remain unchanged.
create function studio.protect_asset_revision() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='UPDATE' and old.origin_task_id is not null and new.origin_task_id is null
  and (to_jsonb(old)-'origin_task_id')=(to_jsonb(new)-'origin_task_id') then return new; end if;
 raise exception 'ASSET_REVISION_IMMUTABLE';
end $$;
revoke all on function studio.protect_asset_revision() from public;
create trigger studio_asset_revision_immutable before update or delete on studio.asset_revisions for each row execute function studio.protect_asset_revision();
create function studio.protect_permanent_receipt() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_table_name='delegations' and tg_op='UPDATE' and old.root_task_id is not null and new.root_task_id is null
  and (to_jsonb(old)-'root_task_id')=(to_jsonb(new)-'root_task_id') then return new; end if;
 raise exception 'PERMANENT_RECEIPT_IMMUTABLE';
end $$;
revoke all on function studio.protect_permanent_receipt() from public;
create trigger studio_delegation_immutable before update or delete on studio.delegations for each row execute function studio.protect_permanent_receipt();
create trigger studio_receipt_immutable before update or delete on studio.execution_receipts for each row execute function studio.protect_permanent_receipt();
create trigger studio_use_event_immutable before update or delete on studio.use_events for each row execute function studio.protect_permanent_receipt();

alter table studio.projects enable row level security;
alter table studio.asset_heads enable row level security;
alter table studio.asset_revisions enable row level security;
alter table studio.delegations enable row level security;
alter table studio.execution_receipts enable row level security;
alter table studio.asset_links enable row level security;
alter table studio.use_events enable row level security;
revoke all on all tables in schema studio from public;
do $$ declare r text; begin foreach r in array array['anon','authenticated','service_role'] loop
 if exists(select from pg_roles where rolname=r) then
  execute format('revoke all on schema studio from %I',r);
  execute format('revoke all on all tables in schema studio from %I',r);
 end if; end loop; end $$;
grant select,insert on all tables in schema studio to mohen_app_runtime;
grant update(current_revision_id) on studio.asset_heads to mohen_app_runtime;
create policy studio_project_owner on studio.projects to mohen_app_runtime
 using(owner_user_id=(select control.current_app_user_id())) with check(owner_user_id=(select control.current_app_user_id()));
create policy studio_head_owner on studio.asset_heads to mohen_app_runtime
 using(exists(select from studio.projects p where p.project_id=asset_heads.project_id))
 with check(exists(select from studio.projects p where p.project_id=asset_heads.project_id));
create policy studio_revision_owner on studio.asset_revisions to mohen_app_runtime
 using(exists(select from studio.asset_heads h where h.asset_id=asset_revisions.asset_id))
 with check(actor_id=(select control.current_app_user_id())
  and exists(select from studio.asset_heads h where h.asset_id=asset_revisions.asset_id)
  and (delegation_id is null or exists(select from studio.delegations d join studio.asset_heads h on h.project_id=d.project_id
    where d.delegation_id=asset_revisions.delegation_id and h.asset_id=asset_revisions.asset_id))
  and (external_receipt_id is null or exists(select from studio.execution_receipts r where r.receipt_id=asset_revisions.external_receipt_id
    and r.delegation_id=asset_revisions.delegation_id)));
create policy studio_delegation_owner on studio.delegations to mohen_app_runtime
 using(exists(select from studio.projects p where p.project_id=delegations.project_id))
 with check(requester=(select control.current_app_user_id()) and exists(select from studio.projects p where p.project_id=delegations.project_id));
create policy studio_receipt_owner on studio.execution_receipts to mohen_app_runtime
 using(exists(select from studio.delegations d where d.delegation_id=execution_receipts.delegation_id))
 with check(exists(select from studio.delegations d where d.delegation_id=execution_receipts.delegation_id));
create policy studio_link_owner on studio.asset_links to mohen_app_runtime
 using(exists(select from studio.projects p where p.project_id=asset_links.project_id) and exists(select from studio.asset_revisions r where r.revision_id=asset_links.source_revision_id))
 with check(exists(select from studio.projects p where p.project_id=asset_links.project_id) and exists(select from studio.asset_revisions r where r.revision_id=asset_links.source_revision_id));
create policy studio_use_owner on studio.use_events to mohen_app_runtime
 using(exists(select from studio.projects p where p.project_id=use_events.project_id) and exists(select from studio.asset_revisions r where r.revision_id=use_events.asset_revision_id))
 with check(actor_id=(select control.current_app_user_id()) and exists(select from studio.projects p where p.project_id=use_events.project_id) and exists(select from studio.asset_revisions r where r.revision_id=use_events.asset_revision_id));
commit;
