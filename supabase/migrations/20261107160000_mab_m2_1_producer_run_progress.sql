-- MAB step 2.1: the six-stage Runner advances existing rows in
-- control.production_runs. RLS is enabled with no default policy, so the
-- producer role needs explicit, minimal access: row-visible SELECT plus a
-- column-level UPDATE limited to progress columns. Run creation, scope and
-- architecture_generation stay with the control plane; gate tables remain
-- unreachable.
begin;
revoke update on control.production_runs from mohen_producer;
grant select on control.production_runs to mohen_producer;
grant update (current_stage, status, finished_at) on control.production_runs to mohen_producer;
drop policy if exists producer_run_progress on control.production_runs;
create policy producer_run_progress on control.production_runs
  for all to mohen_producer
  using (true)
  with check (true);
comment on policy producer_run_progress on control.production_runs is
  'MAB 2.1: producer may read rows and advance progress columns only (column grants); creation stays with the control plane';
commit;
