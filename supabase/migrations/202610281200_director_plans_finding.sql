-- 202610281200_director_plans_finding.sql
-- E1-3：导演方案补 H1 认识增量（finding）列，承载 H1 母题识别结果。

alter table public.director_plans add column if not exists finding jsonb not null default '{}'::jsonb;
