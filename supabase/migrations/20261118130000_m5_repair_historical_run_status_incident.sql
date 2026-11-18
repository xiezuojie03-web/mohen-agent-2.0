-- M5 Batch-07: repair the development-only historical run-status incident caused by
-- the first legacy reconciliation implementation. The seven PASS rows are restored
-- only from the exact pre-incident status query recorded in M5-DIAG-13-CORRECTION.
-- Eight other non-running rows cannot be individually reconstructed from persisted
-- history; they remain HOLD and are explicitly marked uncertain rather than guessed.
begin;
do $$ begin
 if current_user not in ('postgres','supabase_admin') then raise exception 'M5_HISTORICAL_REPAIR_ADMIN_REQUIRED'; end if;
 if (select count(*) from control.production_runs where run_id in ('5176ade3-2892-4179-96d0-c27184b42ebd'::uuid,'4719c713-22ab-4c0a-8e3b-d94b1af5e9bf'::uuid,'df7e43b4-31c7-46e9-b03d-00cf4e7d766d'::uuid,'33333333-3333-4333-8333-333333333333'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'11111111-1111-4111-8111-111111111111'::uuid,'acab992e-49bd-4e12-8860-6c048f2d37f6'::uuid) and status='HOLD')<>7 then raise exception 'M5_HISTORICAL_REPAIR_KNOWN_PASS_PRECONDITION'; end if;
end $$;
update control.production_runs
set status='PASS',
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'm5_historical_status_repair',jsonb_build_object(
        'repair_version','m5.historical-status-repair.v1',
        'restored_status','PASS',
        'source','M5-DIAG-13-CORRECTION pre-incident status query',
        'historical_status_count','14 PASS / 5 RUNNING / 1 FAILED'
      ))
where run_id in ('5176ade3-2892-4179-96d0-c27184b42ebd'::uuid,'4719c713-22ab-4c0a-8e3b-d94b1af5e9bf'::uuid,'df7e43b4-31c7-46e9-b03d-00cf4e7d766d'::uuid,'33333333-3333-4333-8333-333333333333'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'11111111-1111-4111-8111-111111111111'::uuid,'acab992e-49bd-4e12-8860-6c048f2d37f6'::uuid);
update control.production_runs
set status='HOLD',
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'm5_historical_status_repair',jsonb_build_object(
        'repair_version','m5.historical-status-repair.v1',
        'restored_status','HOLD',
        'historical_status_uncertain',true,
        'source','M5-DIAG-13-CORRECTION pre-incident status query',
        'historical_status_count','14 PASS / 5 RUNNING / 1 FAILED',
        'unrecovered_nonrunning_distribution','7 PASS / 1 FAILED'
      ))
where run_id in ('a3cb68ac-3d04-42c2-98e3-e7847b139f7d'::uuid,'404456b4-83de-4499-b44c-b01f19371424'::uuid,'fa48dd68-0859-47f7-a11c-206f4b95983f'::uuid,'4ce19c26-a1de-4ec8-a8bd-3b72e37e7121'::uuid,'f963e6d1-d939-4e4a-b398-cd1e4c6ef2d9'::uuid,'a9a9bf99-473f-4fe1-a5db-1ec3fcc9de67'::uuid,'490f5543-b223-4bac-b572-044e57e7cd94'::uuid,'1bbf7873-e3d9-44f9-a59f-10fe7b675ed0'::uuid);
do $$ begin
 if (select count(*) from control.production_runs where status='RUNNING')<>0 then raise exception 'M5_HISTORICAL_REPAIR_RUNNING_REMAINS'; end if;
 if (select count(*) from control.production_runs where status='PASS')<>7 then raise exception 'M5_HISTORICAL_REPAIR_PASS_COUNT'; end if;
 if (select count(*) from control.production_runs where status='FAILED')<>2 then raise exception 'M5_HISTORICAL_REPAIR_FAILED_COUNT'; end if;
 if (select count(*) from control.production_runs where status='HOLD')<>11 then raise exception 'M5_HISTORICAL_REPAIR_HOLD_COUNT'; end if;
end $$;
commit;
