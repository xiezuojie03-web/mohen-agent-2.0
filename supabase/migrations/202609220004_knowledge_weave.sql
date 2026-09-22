-- 004_knowledge_weave.sql — TASK-0006 Jinze Minimum Knowledge Weave 的最小模型
--
-- 只新增，不修改 001/002/003。复用 001 的 claims / claim_evidence / relations / relation_evidence 表达
-- Claim 与 Relation 边；本迁移仅补 Knowledge Path 与 Discovery Candidate 两个缺失概念，使
--   Evidence → Claim → Entity/Relation/Change → Knowledge Path → Discovery Candidate
-- 全链可在 DB 内查询与计数。

-- ── Knowledge Path：机器可读的有序 claim/relation/change 链 ──────────────────────
create table if not exists knowledge_paths (
  path_id uuid primary key default gen_random_uuid(),
  path_code text not null unique,              -- 稳定可重跑键
  title text not null,
  purpose_question text not null,              -- 该路径回答的问题
  status text not null
    check (status in ('candidate','research','legend','unresolved','verified','rejected')),
  evidence_coverage jsonb not null default '{}'::jsonb,   -- {evidence_ids:[], covered_steps, total_steps}
  unresolved_breaks jsonb not null default '[]'::jsonb,   -- 断裂点必须显式声明，不得伪装成连续链
  generated_by text not null default 'mohen-knowledge-weave',
  created_at timestamptz not null default now()
);

create table if not exists knowledge_path_steps (
  path_id uuid not null references knowledge_paths(path_id) on delete cascade,
  step_no int not null,
  step_kind text not null check (step_kind in ('entity','claim','relation','change')),
  ref_id text,                                 -- claim_id / relation_id / entity_id / change code
  label text not null,
  epistemic_status text not null,
  evidence_ids uuid[] not null default '{}',
  primary key (path_id, step_no)
);

create index if not exists idx_kps_path on knowledge_path_steps(path_id);

-- ── Discovery Candidate：不是「一条证据」，必须带对象 / 关系或变化 / 证据引用 / 问题相关性 / 认知状态 ──
create table if not exists discovery_candidates (
  discovery_id uuid primary key default gen_random_uuid(),
  discovery_code text not null unique,
  title text not null,
  objects jsonb not null,                      -- 显式对象
  relationship_change text not null,           -- 显式关系或变化
  evidence_refs uuid[] not null,               -- 支撑证据（不得为空）
  relevance_question text not null,            -- 与当前金泽问题的相关性
  epistemic_status text not null
    check (epistemic_status in ('candidate','legend','research','unresolved')),
  humanistic_why text not null,                -- 为何可能有人文意义
  unresolved_evidence jsonb not null default '[]'::jsonb, -- 未决 / 矛盾证据
  publishable boolean not null default false,  -- 本任务默认不可发布
  generated_by text not null default 'mohen-knowledge-weave',
  created_at timestamptz not null default now(),
  -- 不变量 9：Discovery 必须有 Evidence 引用，不能与裸 Evidence / backlog 行等价
  constraint discovery_requires_evidence
    check (coalesce(array_length(evidence_refs, 1), 0) >= 1)
);

-- 不变量 11（本任务内）：Knowledge Weave 产物不得 published。
-- 采用「默认不可发布 + 显式约束」，不修改 001 的 claims/relations published 语义。
create or replace function guard_weave_not_publishable()
returns trigger language plpgsql as $$
begin
  if new.publishable = true then
    raise exception 'TASK-0006 Knowledge Weave 产物不得 publishable=true (discovery %)', new.discovery_code;
  end if;
  return new;
end $$;

drop trigger if exists discovery_not_publishable_guard on discovery_candidates;
create trigger discovery_not_publishable_guard
before insert or update on discovery_candidates
for each row execute function guard_weave_not_publishable();
