-- 202610040001_research_bridge_queue.sql
-- Research Workspace 内的「精选候选 → Directed N 作业」桥接暂存表。
-- 定位：Research Workspace（C3 V1.2 §2.9），不是真值层；本表任何行都不得自动晋级。
-- 人工确认闸：human_confirmed=false 时，执行器（N01–N06）不得消费；须由人工显式 --confirm 后才会进入执行队列。
create table if not exists research_bridge_draft (
  draft_id        uuid primary key default gen_random_uuid(),
  candidate_id    uuid,                      -- 来源 research_association_candidate（可空：手动补的缺口）
  subject_ref     text not null,
  object_ref      text,
  avs_score       int,
  disposition     text,
  proposed_job    text not null,             -- N04=candidate-extraction | N05=resolution+relation-weave
  narrative_gap   text,
  research_scope  jsonb not null default '{}'::jsonb,
  priority        int not null default 5,
  human_confirmed boolean not null default false,   -- ★ 人工确认闸
  confirmed_by    text,
  confirmed_at    timestamptz,
  executed_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (candidate_id)                         -- 同候选幂等：重跑 --plan 不重复建草稿
);

-- 机器约束：未确认不得标记已执行（人工确认闸的硬底线）
alter table research_bridge_draft drop constraint if exists bridge_no_execute_before_confirm;
alter table research_bridge_draft add constraint bridge_no_execute_before_confirm
  check (executed_at is null or human_confirmed is true);
