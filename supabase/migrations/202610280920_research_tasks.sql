-- 202610280920_research_tasks.sql
-- Studio 受托研究任务（E1-2）：可追踪的研究任务 + 研究事件，承载 checkpoints 与 D 阶段回执。

create table if not exists public.research_tasks (
  task_id    uuid primary key default gen_random_uuid(),
  work_id    uuid,
  topic      text not null default 'jinze',
  prompt     text not null,
  status     text not null default 'done' check (status in ('created','running','hold','done')),
  checkpoint jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_events (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.research_tasks(task_id) on delete cascade,
  stage      text not null,
  event      text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.research_tasks enable row level security;
alter table public.research_events enable row level security;
