-- 008_cultural_world_objects.sql
--
-- CULTURAL-WORLD-02 · TRACK-W 首次最小施工（AD-07 / AD-01）
--
-- 建立最小 Cultural World Claim/Object layer：
--   cultural_events                 (Event, 事实层)
--   cultural_relation_claims       (RelationClaim, V4.8 六值 epistemic + expression + conflict + fragment refs)
--   cultural_meaning_candidates    (MeaningCandidate, 仅基于已支持 Claims)
--   cultural_present_connections   (PresentConnection, 遗址—复建双层观察)
--   evidence_fragments              (AD-05 Evidence Fragment/Span)
--   cultural_conflicts              (AD-06 结构化冲突保存)
--
-- 设计纪律：
--   * 不扩展 historical_spatial_relations（保持既有 E1–E4 空间关系职责）。
--   * 复用 entities / relations / historical_change_records / evidence。
--   * 外键一律以 feature_key(text) 寻址且 nullable，为 ExternalCulturalNode 留路（本轮不施工）。
--   * 六值认识论 CHECK：SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION
--   * 既有三套状态（verification_status / historical_relation_class / discovery_candidates.epistemic_status）**不修改**（AD-01）。
--   * 005 缺失，本迁移为下一个序号 008（禁止回填 005）。

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) cultural_events —— V4.8 Object Model: Event（事实层最小字段）
-- ----------------------------------------------------------------------------
CREATE TABLE cultural_events (
  event_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slice_id             text NOT NULL REFERENCES historical_spatial_slices(slice_id) ON DELETE CASCADE,
  event_type           text NOT NULL,                 -- founded / rebuild / destroyed / added_structure / named / upgraded
  canonical_label      text NOT NULL,
  subject_feature_key  text NOT NULL,                 -- feature_key 寻址（nullable 为 External 留路）
  time_scope_start     text,                          -- '1260'；未知则 NULL
  time_scope_end       text,                          -- '1260'
  time_scope_unknown   boolean NOT NULL DEFAULT false, -- V4.8：未知必须显式 UNKNOWN
  temporal_note        text,
  place_refs           text[] NOT NULL DEFAULT '{}',
  evidence_fragment_ids uuid[] NOT NULL DEFAULT '{}', -- AD-05：精确到 fragment
  evidence_ids         uuid[] NOT NULL DEFAULT '{}',
  epistemic_status     text NOT NULL
    CHECK (epistemic_status IN ('SUPPORTED','SUPPORTED_CANDIDATE','CONFLICTED','RESEARCH_LEAD','UNSUPPORTED','OPEN_QUESTION')),
  expression_rule      jsonb NOT NULL,                -- V4.8 §5 Expression Contract
  review_status        text NOT NULL DEFAULT 'candidate'
    CHECK (review_status IN ('candidate','human_reviewed','research','unresolved')),
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ce_slice ON cultural_events(slice_id);
CREATE INDEX idx_ce_subject ON cultural_events(subject_feature_key);
CREATE INDEX idx_ce_epistemic ON cultural_events(epistemic_status);

-- ----------------------------------------------------------------------------
-- 2) cultural_relation_claims —— V4.8 Object Model: RelationClaim（六值层）
-- ----------------------------------------------------------------------------
CREATE TABLE cultural_relation_claims (
  claim_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slice_id               text NOT NULL REFERENCES historical_spatial_slices(slice_id) ON DELETE CASCADE,
  claim_type             text NOT NULL CHECK (claim_type IN ('FACT','RELATION')),
  subject_feature_key    text NOT NULL,
  predicate              text NOT NULL,
  object_feature_key     text,                        -- 可为 NULL（对象为字面值，如年份）
  object_value           text,                        -- AD-07：object_ref_or_value（如 '1267'）
  time_scope_start       text,
  time_scope_end         text,
  time_scope_unknown     boolean NOT NULL DEFAULT false,
  spatial_scope          text,                       -- 不得用今天坐标自动代表历史位置
  evidence_fragment_ids  uuid[] NOT NULL DEFAULT '{}',
  evidence_ids           uuid[] NOT NULL DEFAULT '{}',
  epistemic_status       text NOT NULL
    CHECK (epistemic_status IN ('SUPPORTED','SUPPORTED_CANDIDATE','CONFLICTED','RESEARCH_LEAD','UNSUPPORTED','OPEN_QUESTION')),
  uncertainty_and_conflict jsonb,                     -- 结构化：{ conflict_id, note }
  conflict_refs          uuid[] NOT NULL DEFAULT '{}',   -- 指向 cultural_conflicts
  meaning_refs           uuid[] NOT NULL DEFAULT '{}',    -- 指向 cultural_meaning_candidates
  present_connection_refs uuid[] NOT NULL DEFAULT '{}',
  discovery_affordance   jsonb,                       -- AD-01：结构化，不得塞 description
  expression_rule        jsonb NOT NULL,              -- V4.8 §5
  existing_relation_id   uuid REFERENCES relations(relation_id) ON DELETE SET NULL,  -- 可为 External 留路
  hr_constraint          text[] NOT NULL DEFAULT '{}',
  support_level          text CHECK (support_level IS NULL OR support_level IN
                              ('primary_read','secondary_transcription','legacy_transcription','provider_geometry','none')),
  review_status          text NOT NULL DEFAULT 'candidate'
    CHECK (review_status IN ('candidate','human_reviewed','research','unresolved')),
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crc_slice ON cultural_relation_claims(slice_id);
CREATE INDEX idx_crc_subject ON cultural_relation_claims(subject_feature_key);
CREATE INDEX idx_crc_epistemic ON cultural_relation_claims(epistemic_status);
CREATE INDEX idx_crc_existing ON cultural_relation_claims(existing_relation_id);

-- ----------------------------------------------------------------------------
-- 3) cultural_meaning_candidates —— V4.8 Object Model: MeaningCandidate
--    仅基于已支持 Claims；INTERPRETIVE 表达（"可以这样理解…"），不升为 Fact。
-- ----------------------------------------------------------------------------
CREATE TABLE cultural_meaning_candidates (
  meaning_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slice_id               text NOT NULL REFERENCES historical_spatial_slices(slice_id) ON DELETE CASCADE,
  subject_feature_key    text NOT NULL,
  interpretive_text      text NOT NULL,
  derived_from_claim_ids uuid[] NOT NULL DEFAULT '{}',  -- 指向 cultural_relation_claims / cultural_events
  epistemic_status       text NOT NULL
    CHECK (epistemic_status IN ('SUPPORTED','SUPPORTED_CANDIDATE','CONFLICTED','RESEARCH_LEAD','UNSUPPORTED','OPEN_QUESTION')),
  expression_rule        jsonb NOT NULL,               -- 强制 INTERPRETIVE tone
  review_status          text NOT NULL DEFAULT 'candidate'
    CHECK (review_status IN ('candidate','human_reviewed','research','unresolved')),
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cmc_slice ON cultural_meaning_candidates(slice_id);
CREATE INDEX idx_cmc_subject ON cultural_meaning_candidates(subject_feature_key);

-- ----------------------------------------------------------------------------
-- 4) cultural_present_connections —— V4.8 Object Model: PresentConnection
--    今址 / 原址重建 / 遗址—复建双层；1992 开放宗教场所 = OPEN_QUESTION 不进事实。
-- ----------------------------------------------------------------------------
CREATE TABLE cultural_present_connections (
  present_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slice_id               text NOT NULL REFERENCES historical_spatial_slices(slice_id) ON DELETE CASCADE,
  subject_feature_key    text NOT NULL,
  connection_type        text NOT NULL,               -- site_vs_rebuilt / today_location / ruins_reconstruction
  observed_state         text,
  basis_claim_ids        uuid[] NOT NULL DEFAULT '{}',
  open_questions         text[] NOT NULL DEFAULT '{}',
  expression_rule        jsonb NOT NULL,
  review_status          text NOT NULL DEFAULT 'candidate'
    CHECK (review_status IN ('candidate','human_reviewed','research','unresolved')),
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpc_slice ON cultural_present_connections(slice_id);
CREATE INDEX idx_cpc_subject ON cultural_present_connections(subject_feature_key);

-- ----------------------------------------------------------------------------
-- 5) evidence_fragments —— AD-05 Evidence Fragment / Span
--    最小放行单位不是整条 Evidence；Claim 精确引用允许使用的 quote fragment。
-- ----------------------------------------------------------------------------
CREATE TABLE evidence_fragments (
  fragment_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id        uuid NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  span_type          text NOT NULL CHECK (span_type IN ('hr4_usable','u10_forbidden','generic')),
  quote_fragment     text NOT NULL,
  usable_for_claim   text,                            -- 说明该片段可支撑什么
  usage_note         text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ef_evidence ON evidence_fragments(evidence_id);
CREATE INDEX idx_ef_span ON evidence_fragments(span_type);

-- ----------------------------------------------------------------------------
-- 6) cultural_conflicts —— AD-06 结构化冲突保存
--    1267 = SUPPORTED_CANDIDATE；1265 = CONFLICTED variant；互相结构化定位。
--    不创建虚假的 "1265-vs-1267 relation entity"。
-- ----------------------------------------------------------------------------
CREATE TABLE cultural_conflicts (
  conflict_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_key         text NOT NULL UNIQUE,           -- 'pujiqiao-build-year-1265-1267'
  subject_feature_key  text NOT NULL,
  primary_claim_id     uuid,                          -- 1267
  conflicted_variant_id uuid,                          -- 1265
  primary_value        text,                          -- '1267'
  conflicted_value     text,                          -- '1265'
  source_of_conflict   text,                          -- Commons caption 1265
  resolution_status    text NOT NULL DEFAULT 'preserved_open',
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cc_subject ON cultural_conflicts(subject_feature_key);

COMMIT;
