-- 202610291500_explore_session_manage.sql
-- 补缺施工第五步：探索会话管理（API-X03 / FA-X-020）。支持标题与归档。
alter table public.explore_sessions add column if not exists title text;
alter table public.explore_sessions add column if not exists archived boolean not null default false;
