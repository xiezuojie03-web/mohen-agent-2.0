-- 202610291300_users_auth.sql
-- 补缺施工第一步（身份地基）：全员注册 + 四角色分权（member/creator/operator/reviewer）。
-- 取代旧 lib/auth.ts 的"单账号硬编码"方案；旧 admin 环境变量登录仅作本地开发兜底。
create table if not exists public.users (
  user_id       uuid primary key default gen_random_uuid(),
  email         text not null unique,
  username      text not null,
  password_hash text not null,
  roles         text[] not null default '{member}',
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists users_email_lower_idx on public.users (lower(email));
alter table public.users enable row level security;
