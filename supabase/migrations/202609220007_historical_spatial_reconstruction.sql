-- 202609220007_historical_spatial_reconstruction.sql — TASK-0010 WP-B..G
--
-- 为什么需要本迁移（§10 允许「一个新迁移」的唯一理由）：
--
-- 先核查既有 schema 能否无损表达 §4/§6/§7 要求的语义：
--   · entities       ：10 列（entity_type / canonical_name / aliases / description /
--                      valid_from / valid_to / confidence / status / legacy_id）。
--                      【无 metadata jsonb】、无几何/CRS/空间状态/存续状态/名称连续性列。
--   · evidence       ：有 region_json（逐行 ad-hoc 结构，且已被 AMap / Wikidata / 人审
--                      overlay 三种互不相同的形状复用），是「证据自己的空间附注」，
--                      不是「对象的规范空间状态」。
--   · relations      ：predicate/status(enum verification_status)/confidence，status 里含
--                      'published'，所以知识级别（E1/E2/E3/E4）不能塞进 status；且
--                      subject/object 均 not null references entities —— 金泽塘等
--                      「仅被文献提及、entities 中无行」的空间特征无处安放。
--   · 无 historical_features 表；无 map_candidates 表。
--
-- 结论：用 JSON blob 把 HistoricalFeature / 时间存续 / 当前-历史空间状态 / 变更语义塞进
-- entities.metadata 或 evidence.region_json，会立刻产生「第二个真源」，且 §12 的不变量
-- （不得把当前坐标当历史坐标、坐标必带 CRS、证据可追溯）无法在库层强制。
-- 故按 §10 新增【5 张表 + 4 个枚举】——这是最小且语义正确的扩展。
--
-- 边界（§10 / §12）：
--   · 不修改 migrations 001–006；
--   · 不引入 PostGIS，**不建任何 geometry 列** —— 坐标以 text 原值 + 显式 coord_system 存储，
--     本迁移与本 Task 都不产生任何几何（历史几何一律 unknown，禁止 AI 补画）；
--   · 不写任何 verified / published；
--   · 人审仍走既有 human_review_decisions（本迁移不建平行评审子系统）。

-- ---------------------------------------------------------------------------
-- 枚举：§4 的 6 种 spatial status / 几何类型 / §6 的 8 种 change status /
--       §7 的 4 级关系知识级别
-- ---------------------------------------------------------------------------
do $$ begin
  create type historical_geometry_type as enum ('point','line','area','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type historical_spatial_status as enum (
    'verified_object_point',
    'official_or_provider_object_point',
    'approximate_object_area',
    'historical_anchor_candidate',
    'historical_relative_position_only',
    'unresolved'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type historical_change_status as enum (
    'survives','rebuilt','relocated','site_only','name_changed',
    'function_changed','surrounding_context_changed','unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type historical_relation_class as enum ('E1','E2','E3','E4');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 1) 切片头：§8 的 slice 级语义（PG 仍是唯一真源，导出 JSON 只是投影）
-- ---------------------------------------------------------------------------
create table if not exists historical_spatial_slices (
  slice_id text primary key,
  slice_title text not null,
  focus_question text not null,
  time_context text not null,

  -- 当前空间范围：只登记「当前」锚点的包围盒与参与锚点，不含任何历史几何。
  spatial_extent_current jsonb not null default '{}'::jsonb,

  -- 历史几何总状态：本 Task 恒为 'absent_no_source'（无来源，故不产生）。
  historical_geometry_status text not null
    check (historical_geometry_status in ('absent_no_source','relative_only','present_sourced')),

  -- 不确定项：每项必须显式写出 missing_evidence（§9-7 / §17），由测试强制。
  uncertainties jsonb not null default '[]'::jsonb,

  -- 体验钩子：仅语义机会，不含 UI 编排（§8）。
  experience_hooks jsonb not null default '[]'::jsonb,

  evidence_summary jsonb not null default '{}'::jsonb,
  readiness_gate text not null check (readiness_gate in ('YES','PARTIAL','NO')),
  readiness_detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) 历史特征：§4 inventory 一行一特征
-- ---------------------------------------------------------------------------
create table if not exists historical_features (
  feature_id uuid primary key,
  feature_key text not null unique,
  slice_id text not null references historical_spatial_slices(slice_id) on delete cascade,
  feature_type text not null,

  canonical_label text not null,
  -- §12-13：保留来源异写，不用规范化把差异抹掉。
  historical_labels text[] not null default '{}',
  modern_labels text[] not null default '{}',
  label_variants_note text not null default '',

  -- 与既有实体层的绑定（金泽塘等在 entities 中无行，允许为空，不代表虚构）。
  entity_id uuid references entities(entity_id) on delete set null,

  -- 本 Task 实际**持有**的几何类型（不是对象在现实中的形状）。
  geometry_type historical_geometry_type not null,
  geometry_note text not null default '',

  attested_time_start text,
  attested_time_end text,
  attested_time_label text,
  -- 该时间链中哪些部分有 Evidence 行、哪些只存在于 Legacy 描述（§9-6 判据的机器可读依据）。
  attested_time_evidence_backed boolean not null default false,
  legacy_only_assertions text[] not null default '{}',

  attested_historical_existence text not null
    check (attested_historical_existence in ('attested','not_attested','unknown')),
  current_survival_or_site text not null,

  -- §6 要求区分的六项状态（historical / current 位置状态必须分开）。
  historical_position_status historical_spatial_status not null,
  current_position_status historical_spatial_status not null,
  name_continuity_status text not null
    check (name_continuity_status in ('continuous','variant_only','name_changed','unknown')),
  change_status historical_change_status not null,

  historical_source_refs text[] not null default '{}',
  current_source_refs text[] not null default '{}',
  evidence_ids uuid[] not null default '{}',

  -- 本项目不使用无依据的数值置信度：confidence 保持 0，
  -- 判定等级由 review_status + human_review_decisions + epistemic class 承载。
  confidence numeric not null default 0,
  confidence_note text not null default '',
  review_status text not null
    check (review_status in ('candidate','human_reviewed','research','unresolved')),
  uncertainty_note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_historical_features_slice on historical_features(slice_id, feature_type);

-- ---------------------------------------------------------------------------
-- 3) 特征空间锚：**每一条带坐标的记录都必须显式声明 CRS**（§4 / §12-6）
-- ---------------------------------------------------------------------------
create table if not exists historical_feature_anchors (
  anchor_id uuid primary key,
  anchor_key text not null unique,
  feature_id uuid not null references historical_features(feature_id) on delete cascade,

  -- provider_current_object_point / provider_current_object_area /
  -- town_level_reference / textual_relative_statement
  anchor_kind text not null,

  spatial_status historical_spatial_status not null,
  geometry_type historical_geometry_type not null,

  -- 坐标原值（不换算、不四舍五入）；无坐标时三者必须同时为空。
  coord_system text,
  location_raw text,
  lat numeric,
  lng numeric,

  crs_note text not null default '',
  precision_scope text,
  source_label text not null,
  source_locator text,
  evidence_id uuid references evidence(evidence_id) on delete set null,

  exact_object_point boolean not null default false,
  historical_position_proof boolean not null default false,
  human_review_code text,
  note text not null default '',
  created_at timestamptz not null default now(),

  -- §12-6：有坐标就必须有 CRS；有 CRS 就必须有坐标。
  constraint anchor_coord_requires_crs check (
    (lat is null and lng is null and coord_system is null)
    or (lat is not null and lng is not null and coord_system is not null)
  ),
  -- §12-5 库层强制：来自当前 provider 的锚点**永远不得**声明为历史位置证明。
  constraint anchor_current_never_proof check (
    not (anchor_kind like 'provider_current%' and historical_position_proof)
  ),
  -- 只有当前 provider 对象点/面允许携带坐标；相对陈述锚不得偷偷夹带坐标。
  constraint anchor_relative_has_no_coord check (
    anchor_kind <> 'textual_relative_statement'
    or (lat is null and lng is null and coord_system is null)
  )
);

create index if not exists idx_historical_feature_anchors_feature
  on historical_feature_anchors(feature_id, spatial_status);

-- ---------------------------------------------------------------------------
-- 4) 变更记录：§6 的 change_status 是「每个对象的聚合判定」，
--    本表承载「逐条可追溯的变更断言」（两者不是重复：一为聚合状态，一为原子断言）。
-- ---------------------------------------------------------------------------
create table if not exists historical_change_records (
  change_id uuid primary key,
  change_key text not null unique,
  slice_id text not null references historical_spatial_slices(slice_id) on delete cascade,
  feature_id uuid not null references historical_features(feature_id) on delete cascade,
  change_status historical_change_status not null,
  -- evidenced / candidate / unknown（§16 按此三分计数）
  change_epistemic text not null check (change_epistemic in ('evidenced','candidate','unknown')),
  from_state text,
  to_state text,
  time_hint text,
  evidence_ids uuid[] not null default '{}',
  -- 该变更断言中「无 Evidence 行、只存在于 Legacy 描述」的部分，显式留痕。
  legacy_only_parts text[] not null default '{}',
  note text not null default '',
  review_status text not null
    check (review_status in ('candidate','human_reviewed','research','unresolved')),
  created_at timestamptz not null default now(),

  -- evidenced 必须真的带证据。
  constraint change_evidenced_requires_evidence check (
    change_epistemic <> 'evidenced' or array_length(evidence_ids, 1) >= 1
  )
);

create index if not exists idx_historical_change_records_feature
  on historical_change_records(feature_id, change_epistemic);

-- ---------------------------------------------------------------------------
-- 5) 切片关系：§7 的 E1/E2/E3/E4 知识级别
--    刻意与 relations 分离：relations 是已被 Knowledge Weave 冻结的语义边，
--    本表是「切片视角下的关系分类」，可复用既有 relation 的证据但**不改动** relations。
-- ---------------------------------------------------------------------------
create table if not exists historical_spatial_relations (
  hs_relation_id uuid primary key,
  relation_key text not null unique,
  slice_id text not null references historical_spatial_slices(slice_id) on delete cascade,

  subject_feature_key text not null references historical_features(feature_key) on delete cascade,
  predicate text not null,
  object_feature_key text not null references historical_features(feature_key) on delete cascade,

  epistemic_class historical_relation_class not null,
  -- 支持层级：primary_read（亲见原文）/ secondary_transcription（转引）/ legacy_transcription
  --           / provider_geometry（当前 provider 几何）/ none（无支持 → 必为 E4）
  support_level text not null
    check (support_level in ('primary_read','secondary_transcription','legacy_transcription','provider_geometry','none')),

  -- 若本切片关系复用既有 relations 行，登记其主键（复用其 Evidence/disposition，不改其内容）。
  existing_relation_id uuid references relations(relation_id) on delete set null,

  evidence_ids uuid[] not null default '{}',
  -- 约束本关系的人审决策编号（如 HR-4 / SHR-01），不得覆盖其结论。
  hr_constraint text[] not null default '{}',
  confidence numeric not null default 0,
  status text not null check (status in ('candidate','unresolved','research','legend')),
  note text not null default '',
  created_at timestamptz not null default now(),

  -- E1/E2/E3 必须有证据链；E4（合理但证据不足）允许空或仅带间接材料。
  constraint hs_relation_non_e4_requires_evidence check (
    epistemic_class = 'E4' or array_length(evidence_ids, 1) >= 1
  ),
  -- support_level='none' 只允许出现在 E4。
  constraint hs_relation_no_support_only_e4 check (
    support_level <> 'none' or epistemic_class = 'E4'
  )
);

create index if not exists idx_historical_spatial_relations_slice
  on historical_spatial_relations(slice_id, epistemic_class);
