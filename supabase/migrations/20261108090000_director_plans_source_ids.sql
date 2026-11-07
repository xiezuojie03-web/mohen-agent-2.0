-- 20261108090000_director_plans_source_ids.sql
-- M5 批次 G：director_plans 记录服务端权威来源绑定（dispatcher 逐来源权利核验用），
-- 防止客户端在 select/panels 等后续动作里 widened 来源集合。默认空 = 未绑定 = 权利核验失败关闭。
alter table public.director_plans add column if not exists source_ids jsonb not null default '[]'::jsonb;
comment on column public.director_plans.source_ids is 'Server-authoritative source.sources ids bound at plan creation; consumed by provider dispatch per-source rights checks.';
