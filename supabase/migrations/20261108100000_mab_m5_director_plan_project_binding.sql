-- M5 QR-01: bind each DirectorPlan to the exact Owner project.
-- Existing rows remain NULL and are intentionally not inferred/backfilled.
-- Legacy plans without a project binding must HOLD on all subsequent external actions.
begin;
alter table public.director_plans
  add column if not exists project_id uuid;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.director_plans'::regclass
      and conname='director_plans_project_id_fkey'
  ) then
    alter table public.director_plans
      add constraint director_plans_project_id_fkey
      foreign key(project_id) references studio.projects(project_id) on delete restrict;
  end if;
end $$;
create index if not exists director_plans_project_id_idx
  on public.director_plans(project_id,created_at desc) where project_id is not null;
comment on column public.director_plans.project_id is
  'Owner project identity captured at plan creation. NULL legacy rows are unbound and must HOLD before any external LLM action.';
commit;
