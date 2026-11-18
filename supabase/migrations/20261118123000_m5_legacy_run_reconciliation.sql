-- M5 Batch-06: deterministic reconciliation for pre-cloud legacy RUNNING rows.
-- Only stale, unclaimed development records may enter this path.
-- This is not a generic status editor and is not exposed to app/Producer/Gate roles.
begin;
create or replace function control.m5_reconcile_legacy_unclaimed_run(p_run_id uuid,p_reason text)
returns table(run_id uuid,disposition text,evidence jsonb)
language plpgsql security definer
set search_path to 'pg_catalog'
set jit to 'off'
as $function$
declare
 r control.production_runs%rowtype;
 event_count integer;
 failed_event_count integer;
 last_event timestamptz;
 next_status text;
 evidence jsonb;
begin
 if current_user not in ('postgres','supabase_admin') then
   raise exception 'M5_RECONCILIATION_ADMIN_REQUIRED';
 end if;
 if p_run_id is null or p_reason is null or length(trim(p_reason))<8 or length(trim(p_reason))>300 then
   raise exception 'M5_RECONCILIATION_INPUT_INVALID';
 end if;
 select pr.* into r from control.production_runs pr where pr.run_id=p_run_id for update;
 if not found then raise exception 'M5_RECONCILIATION_RUN_NOT_FOUND'; end if;
 if r.status<>'RUNNING' and not (r.status='HOLD' and r.metadata->'m5_reconciliation'->>'reconciliation_version'='m5.legacy-unclaimed.v1') then raise exception 'M5_RECONCILIATION_NOT_RUNNING'; end if;
 if r.started_at is null or r.started_at>now()-interval '24 hours' then
   raise exception 'M5_RECONCILIATION_NOT_STALE';
 end if;
 if coalesce(r.metadata,'{}'::jsonb)->'cloud_dispatch'->>'claimed_at' is not null then
   raise exception 'M5_RECONCILIATION_CLAIMED_RUN';
 end if;
 select count(*)::int,
        count(*) filter(where event='production_failed')::int,
        max(created_at)
 into event_count,failed_event_count,last_event
 from public.research_events where payload->>'run_id'=p_run_id::text;
 if failed_event_count>0 then next_status:='FAILED'; else next_status:='HOLD'; end if;
 evidence:=jsonb_build_object(
   'reconciliation_version','m5.legacy-unclaimed.v1',
   'reason_code',trim(p_reason),
   'event_count',event_count,
   'production_failed_event_count',failed_event_count,
   'last_event_at',last_event,
   'prior_status',r.status,
   'prior_current_stage',r.current_stage,
   'prior_scope',coalesce(r.scope,'{}'::jsonb),
   'cloud_dispatch_claimed',false
 );
 update control.production_runs pr
 set status=next_status,finished_at=now(),
     metadata=coalesce(pr.metadata,'{}'::jsonb)||jsonb_build_object('m5_reconciliation',evidence)
 where pr.run_id=p_run_id;
 return query select p_run_id,next_status,evidence;
end
$function$;
revoke all on function control.m5_reconcile_legacy_unclaimed_run(uuid,text) from public,anon,authenticated,service_role,mohen_app_runtime,mohen_producer,mohen_gate_signer,mohen_gate_reader,mohen_gate_authority;
grant execute on function control.m5_reconcile_legacy_unclaimed_run(uuid,text) to postgres;
commit;
