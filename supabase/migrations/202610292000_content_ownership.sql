-- 202610292000_content_ownership.sql
-- P0-1（2026-10-29）：内容归属。此前作品/研究任务/探索会话/导演方案均无 owner，
-- 任何人可读写全部内容。本迁移补 owner_user_id，并把存量演示数据回填给最早创建的 operator（Owner）。
-- 幂等：可重复执行。

alter table publication.works
  add column if not exists owner_user_id uuid references public.users(user_id) on delete set null;

alter table public.research_tasks
  add column if not exists owner_user_id uuid references public.users(user_id) on delete set null;

alter table public.explore_sessions
  add column if not exists owner_user_id uuid references public.users(user_id) on delete set null;

alter table public.director_plans
  add column if not exists owner_user_id uuid references public.users(user_id) on delete set null;

-- 存量演示数据回填给最早创建的 active operator（Owner），避免升级后"自己的作品消失"。
update publication.works
   set owner_user_id = (
     select user_id from public.users
      where 'operator' = any(roles) and status = 'active'
      order by created_at asc limit 1
   )
 where owner_user_id is null;

update public.research_tasks
   set owner_user_id = (
     select user_id from public.users
      where 'operator' = any(roles) and status = 'active'
      order by created_at asc limit 1
   )
 where owner_user_id is null;

update public.explore_sessions
   set owner_user_id = (
     select user_id from public.users
      where 'operator' = any(roles) and status = 'active'
      order by created_at asc limit 1
   )
 where owner_user_id is null;

update public.director_plans
   set owner_user_id = (
     select user_id from public.users
      where 'operator' = any(roles) and status = 'active'
      order by created_at asc limit 1
   )
 where owner_user_id is null;

create index if not exists works_owner_idx on publication.works (owner_user_id);
create index if not exists research_tasks_owner_idx on public.research_tasks (owner_user_id);
create index if not exists explore_sessions_owner_idx on public.explore_sessions (owner_user_id);
create index if not exists director_plans_owner_idx on public.director_plans (owner_user_id);
