-- 202610290100_fine_capabilities.sql
-- E1-8 细分能力补真：对话持久化、系统设置、帮助文章、权利政策、作品互动指标。
-- 这些是「能真实落地的细分能力」；附件上传/细粒度ACL/账号禁用/定时发布仍需外部基础设施，另计。

create table if not exists public.conversations (
  conversation_id uuid primary key default gen_random_uuid(),
  title          text not null default '',
  messages       jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.help_articles (
  article_id uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  title      text not null,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.policies (
  policy_id uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  title     text not null,
  content   text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.work_engagement (
  work_id   uuid primary key references publication.works(work_id) on delete cascade,
  views     integer not null default 0,
  favorites integer not null default 0,
  comments  integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.app_settings enable row level security;
alter table public.help_articles enable row level security;
alter table public.policies enable row level security;
alter table public.work_engagement enable row level security;
