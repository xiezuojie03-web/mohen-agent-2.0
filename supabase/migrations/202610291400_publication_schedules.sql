-- 202610291400_publication_schedules.sql
-- 补缺施工第二步：定时发布（FA-055-02）。到点后由惰性触发（运营打开发布页）执行并重验发布资格。
create table if not exists publication.publication_schedules (
  schedule_id uuid primary key default gen_random_uuid(),
  work_id     uuid not null,
  publish_at  timestamptz not null,
  status      text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  created_at  timestamptz not null default now()
);
create index if not exists publication_schedules_due_idx on publication.publication_schedules (status, publish_at);
