-- 202610030010_research_workspace.sql
-- 目的：把 C3 V1.2 §2.9「Research Workspace（逻辑工作区，不是新的真相层）」落成**最小表集**，
--       并让四条宪法级约束在**库层**成立，而不只是写在文档里。
--
-- 依据：
--   · C3 V1.2 §2.9（四条约束 + §2.9.1 六类逻辑对象 + §2.9.2 双图分离 + §2.9.3 物理形态不立即大建）
--   · 唯一主生产协议 V3.0 §3.3（研究长尾与 Human Review 解耦）· §4.1（truth_write_ceiling = 0）
--   · 《宽进与广联》V1.0（Observation / Mention / Dependency / Signal / Association / Selection）
--   · 治理级决断 R16（CURRENT §12）｜任务书 TASK-RECON-20261003（T7 最小研究存储）
--
-- 设计边界（重要）：
--   · **不冻结大 Schema**（§2.9.3）：本迁移只建首轮必要的最小表集，全部落在 public 并以
--     `research_` 前缀标识为研究逻辑区；是否拆为独立 research schema 由 LR-ADS-01 结果决定。
--   · **0 自动 Truth Promotion**：`research_association_candidate.promoted` 被 CHECK 恒定为 false，
--     研究候选没有任何路径自动变成 Truth；要进 Runtime Truth 必须走 N01–N06 + G0–G6 + Human Review。
--   · **不使用资格词汇**（§2.9 之 4）：研究态一律用 `association_readiness`（ready/limited/
--     catalog_only/unreadable）与 disposition；全表**不存在** usable / published / verified 取值。
--   · **长尾不 1:1 制造 review_queue**：disposition = 'long_tail' 时 review_queue_id 必须为 NULL。
--     只有 selected / truth_promotion / narrative_critical / conflict_critical 才允许挂分诊行（§3.3）。
--   · **不写 Truth 层表**：本迁移不触碰 entities / claims / relations / visual_assets / source_records
--     等任何既有行；也**不回填**、**不删除**（R14 不删除只归档的精神）。
--
-- 可重复执行（与 001–009 同约定）：if not exists / drop-create / create or replace。

create extension if not exists pgcrypto;

-- ── 1) research_run：研究侧作业归因 ──────────────────────────────────────────
--    为什么不用 ingest_runs：Discovery 作业的 write_scope 被限制在 research 逻辑区
--    （production-registry.json D01–D05），不得写控制面 Truth 表。研究侧归因自带一张最小表。
create table if not exists research_run (
  run_id           uuid primary key default gen_random_uuid(),
  job_id           text not null,            -- research.source-inventory … research.humanistic-selection
  production_mode  text not null default 'discovery',
  research_scope   text not null,            -- 机器可校验的范围声明（R-DP-03 护栏）
  params           jsonb not null default '{}'::jsonb,
  status           text not null default 'running'
                     check (status in ('running','completed','failed','dry_run')),
  write_enabled    boolean not null default false, -- 三道闸未齐 → false（DRY_RUN）
  started_at       timestamptz not null default now(),
  finished_at      timestamptz
);
create index if not exists idx_research_run_job on research_run(job_id, started_at desc);

-- ── 1b) research_source_inventory：D01 的来源盘点结果 ───────────────────────
--    §2.9.1 未单列「盘点」对象，但 D01（research.source-inventory）需要一个可查询落点：
--    记录每个来源的载体类型（T01–T14）、可读程度、权利与 raw 可用性。名称在实现时确定（§2.9.1 允许）。
create table if not exists research_source_inventory (
  inventory_id  uuid primary key default gen_random_uuid(),
  run_id        uuid not null references research_run(run_id) on delete cascade,
  source_ref    text not null,   -- legacy 文件 key 或来源标识
  carrier_type  text not null default 'unknown',  -- T01–T14 载体类型
  readability   text not null default 'catalog_only'
                  check (readability in ('readable','catalog_only','unreadable')),
  rights_status text not null default 'unclear'
                  check (rights_status in ('clear','unclear','restricted')),
  raw_available boolean not null default false,
  note          text,
  created_at    timestamptz not null default now()
);
create unique index if not exists uq_research_inventory
  on research_source_inventory(run_id, source_ref);

-- ── 2) research_observation：内容级读取的最小可关联单位 ──────────────────────
--    「标题级」不算 Observation：locator 与 region 至少有一个非空（库层强制）。
create table if not exists research_observation (
  observation_id         uuid primary key default gen_random_uuid(),
  run_id                 uuid not null references research_run(run_id) on delete cascade,
  source_id              text not null,   -- 研究逻辑区内的来源标识（legacy 文件 key 或 source_records.id::text）
  locator                text,            -- 页码 / 行号 / 时间戳 / 图幅坐标
  region                 jsonb,           -- 图片 region 或文本 span
  modality               text not null default 'text'
                           check (modality in ('text','map_image','photo','table','catalog_only','other')),
  excerpt                text,
  normalized_observation text,
  uncertainty            text,
  association_readiness  text not null default 'limited'
                           check (association_readiness in ('ready','limited','catalog_only','unreadable')),
  created_at             timestamptz not null default now(),
  constraint research_observation_must_be_locatable
    check (locator is not null or region is not null)
);
create index if not exists idx_research_observation_run on research_observation(run_id);
create index if not exists idx_research_observation_source on research_observation(source_id);

-- ── 3) research_mention：允许 unresolved，绝不制造 unknown Entity ─────────────
create table if not exists research_mention (
  mention_id          uuid primary key default gen_random_uuid(),
  run_id              uuid not null references research_run(run_id) on delete cascade,
  observation_id      uuid not null references research_observation(observation_id) on delete cascade,
  mention_text        text not null,
  mention_type        text not null default 'other'
                        check (mention_type in ('person','place','organization','work','event','other')),
  resolution          text not null default 'unresolved'
                        check (resolution in ('resolved','unresolved','ambiguous')),
  resolved_entity_id  uuid,   -- 仅 resolution='resolved' 时可填；不得凭 unresolved mention 造 Entity
  note                text,
  created_at          timestamptz not null default now(),
  constraint research_mention_resolved_needs_entity
    check (resolved_entity_id is null or resolution = 'resolved')
);
create index if not exists idx_research_mention_obs on research_mention(observation_id);

-- ── 4) research_source_dependency：防止 5 篇转引被当成 5 个独立来源 ───────────
create table if not exists research_source_dependency (
  dependency_id         uuid primary key default gen_random_uuid(),
  run_id                uuid not null references research_run(run_id) on delete cascade,
  source_id             text not null,
  depends_on_source_id  text not null,
  dependency_type       text not null default 'transclusion'
                          check (dependency_type in ('transclusion','duplicate','same_origin','derived')),
  note                  text,
  created_at            timestamptz not null default now()
);
create unique index if not exists uq_research_dependency
  on research_source_dependency(source_id, depends_on_source_id, dependency_type);

-- ── 5) research_signal：单一关联信号（A01–A12 或等价方法）────────────────────
create table if not exists research_signal (
  signal_id       uuid primary key default gen_random_uuid(),
  run_id          uuid not null references research_run(run_id) on delete cascade,
  signal_code     text not null,          -- A01…A12；自定义方法须登记同一字段以便回放
  subject_ref     text not null,
  object_ref      text not null,
  observation_ids jsonb not null default '[]'::jsonb,
  strength        numeric,
  detail          jsonb not null default '{}'::jsonb, -- 可回放：参数版本与依据
  created_at      timestamptz not null default now()
);
create index if not exists idx_research_signal_pair on research_signal(subject_ref, object_ref);

-- ── 6) research_association_candidate：开放发现的核心候选 ────────────────────
create table if not exists research_association_candidate (
  candidate_id       uuid primary key default gen_random_uuid(),
  run_id             uuid not null references research_run(run_id) on delete cascade,
  subject_ref        text not null,
  object_ref         text not null,
  supporting_signals jsonb not null default '[]'::jsonb,
  counter_signals    jsonb not null default '[]'::jsonb,
  avs                jsonb not null default '{}'::jsonb,  -- AVS 分量（可解释）
  avs_score          numeric,
  why_interesting    text,
  missing_evidence   text,
  next_search_tasks  jsonb not null default '[]'::jsonb,
  association_readiness text not null default 'limited'
                       check (association_readiness in ('ready','limited','catalog_only','unreadable')),
  disposition        text not null default 'long_tail'
                       check (disposition in ('long_tail','selected','truth_promotion',
                                              'narrative_critical','conflict_critical')),
  review_queue_id    uuid,          -- 只有四类 Selected 级 disposition 才可挂分诊行
  promoted           boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint research_candidate_zero_auto_promotion
    check (promoted = false),       -- ★ 0 自动 Truth Promotion（库层硬强制，不可绕过）
  constraint research_candidate_longtail_no_review_queue
    check (disposition <> 'long_tail' or review_queue_id is null)
);
create unique index if not exists uq_research_candidate_per_run
  on research_association_candidate(run_id, subject_ref, object_ref);
create index if not exists idx_research_candidate_disp on research_association_candidate(disposition);

-- ── 7) research_task：把候选送入 Directed Research，而不是直接送 Gate ─────────
create table if not exists research_task (
  task_id      uuid primary key default gen_random_uuid(),
  run_id       uuid not null references research_run(run_id) on delete cascade,
  candidate_id uuid references research_association_candidate(candidate_id) on delete cascade,
  task_type    text not null default 'next_search'
                 check (task_type in ('directed_research','next_search','pause','drop')),
  target_ref   text,
  priority     integer not null default 0,
  note         text,
  status       text not null default 'open' check (status in ('open','done','dropped')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_research_task_candidate on research_task(candidate_id);

-- 本迁移不回填、不删除任何既有行；不触碰 Truth 层任何表。
