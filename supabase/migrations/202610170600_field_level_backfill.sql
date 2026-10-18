-- ============================================================================
-- 字段级改库（样板试验第一步 · 评估A 产出）：补全 L2/L3 落点，一环扣一环闭环
-- 日期：2026-10-17
-- 依据：
--   契约 P2 §7.2 —— L2 四实体 + material_evidence 补 8 列 + read_unit_evidence_links 补 3 列
--   契约 P3 §3   —— L3 建 world_decision_events + 四表字段对齐
-- 性质：纯增表/增列/改名；不删旧列、不删旧数据（36 表当前全 0 行，改名安全）。
-- 回滚：supabase/rollback/202610170600_field_level_backfill.rollback.sql
-- ============================================================================
BEGIN;

-- ============================================================================
-- L2（evidence）—— 补全 D02 材料观察落点（D03 免越界的根基）
-- ============================================================================

-- 1) evidence.reading_units：作品内可引用结构单元（卷篇/条目/图幅）及主类型
CREATE TABLE evidence.reading_units (
  reading_unit_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id     uuid REFERENCES source.source_versions(source_version_id),
  raw_item_id           uuid REFERENCES source.raw_items(raw_item_id),
  parent_unit_id        uuid REFERENCES evidence.reading_units(reading_unit_id),
  unit_path             text,
  unit_kind             text,
  primary_h_type        text,
  taxonomy_version      text,
  classification_status text,
  classification_basis  text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reading_units_parent         ON evidence.reading_units(parent_unit_id);
CREATE INDEX idx_reading_units_source_version ON evidence.reading_units(source_version_id);

-- 2) evidence.classification_decisions：H 类型判定历史与改判（追加式，不覆盖历史）
CREATE TABLE evidence.classification_decisions (
  decision_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_unit_id        uuid NOT NULL REFERENCES evidence.reading_units(reading_unit_id),
  primary_h_type         text,
  alternatives           jsonb NOT NULL DEFAULT '{}',
  basis                  text,
  taxonomy_version       text,
  status                 text,
  decided_at             timestamptz NOT NULL DEFAULT now(),
  supersedes_decision_id uuid REFERENCES evidence.classification_decisions(decision_id)
);
CREATE INDEX idx_classification_decisions_reading_unit ON evidence.classification_decisions(reading_unit_id);

-- 3) evidence.material_mentions：未决字面提及（人/时/地/物/数），禁止强写 world.entity_id
CREATE TABLE evidence.material_mentions (
  mention_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id      uuid NOT NULL REFERENCES evidence.material_evidence(evidence_id),
  mention_kind     text,
  literal_text     text,
  span_in_evidence jsonb NOT NULL DEFAULT '{}',
  precision        jsonb NOT NULL DEFAULT '{}',
  uncertainty      jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_material_mentions_evidence ON evidence.material_mentions(evidence_id);

-- 4) evidence.reading_unit_dependencies：引书/转录/编辑依赖（目标单元或外部版本至少一项有效）
CREATE TABLE evidence.reading_unit_dependencies (
  dependency_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_reading_unit_id       uuid NOT NULL REFERENCES evidence.reading_units(reading_unit_id),
  to_reading_unit_id         uuid REFERENCES evidence.reading_units(reading_unit_id),
  external_source_version_id uuid REFERENCES source.source_versions(source_version_id),
  relation_kind              text,
  certainty                  text,
  basis                      text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reading_unit_dependencies_target_check
    CHECK (to_reading_unit_id IS NOT NULL OR external_source_version_id IS NOT NULL)
);
CREATE INDEX idx_reading_unit_dependencies_from ON evidence.reading_unit_dependencies(from_reading_unit_id);

-- 5) evidence.material_evidence：补 8 列（契约 §7.2）
ALTER TABLE evidence.material_evidence
  ADD COLUMN reading_unit_id        uuid REFERENCES evidence.reading_units(reading_unit_id),
  ADD COLUMN assertion_kind         text,
  ADD COLUMN voice_basis            text,
  ADD COLUMN quote_review_status    text,
  ADD COLUMN quote_review_ref       text,
  ADD COLUMN evidence_version_no    integer,
  ADD COLUMN input_fingerprint      text,
  ADD COLUMN supersedes_evidence_id uuid REFERENCES evidence.material_evidence(evidence_id);
CREATE INDEX idx_material_evidence_reading_unit ON evidence.material_evidence(reading_unit_id);
CREATE INDEX idx_material_evidence_supersedes   ON evidence.material_evidence(supersedes_evidence_id);

-- 6) evidence.read_unit_evidence_links：对齐契约 §7.2（补 3 列：有序映射 + 用途 + 定位版本）
ALTER TABLE evidence.read_unit_evidence_links
  ADD COLUMN extent_order           integer,
  ADD COLUMN allowed_purpose        text,
  ADD COLUMN locator_schema_version text;
CREATE UNIQUE INDEX idx_read_unit_evidence_links_order
  ON evidence.read_unit_evidence_links(evidence_id, extent_order);

-- ============================================================================
-- L3（world）—— 补全 D03 世界建构落点
-- ============================================================================

-- 7) world.claim_revisions：字段名对齐契约 P3 §3.1 + 补缺失列
ALTER TABLE world.claim_revisions RENAME COLUMN object_type       TO subject_kind;
ALTER TABLE world.claim_revisions RENAME COLUMN object_id         TO subject_id;
ALTER TABLE world.claim_revisions RENAME COLUMN revision_content  TO assertion_payload_json;
ALTER TABLE world.claim_revisions RENAME COLUMN supersedes_id     TO supersedes_revision_id;
ALTER TABLE world.claim_revisions RENAME COLUMN created_at        TO authored_at;

ALTER TABLE world.claim_revisions
  ADD COLUMN claim_family_id      uuid,
  ADD COLUMN evidence_snapshot_id uuid,
  ADD COLUMN asserted_time_json   jsonb;

ALTER TABLE world.claim_revisions
  ADD CONSTRAINT claim_revisions_supersedes_fk
    FOREIGN KEY (supersedes_revision_id) REFERENCES world.claim_revisions(claim_revision_id);
ALTER TABLE world.claim_revisions
  ADD CONSTRAINT claim_revisions_no_self_supersede
    CHECK (claim_revision_id <> supersedes_revision_id);

CREATE INDEX idx_claim_revisions_subject ON world.claim_revisions(subject_kind, subject_id);
CREATE INDEX idx_claim_revisions_family  ON world.claim_revisions(claim_family_id);

-- 8) world.identity_decisions：对齐契约 P3 §3.2（补适用历史时段/决策版本/G2 输入快照）
ALTER TABLE world.identity_decisions
  ADD COLUMN temporal_scope       jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN decision_version     text,
  ADD COLUMN upstream_g2_snapshot jsonb NOT NULL DEFAULT '{}';

-- 9) world.event_participations：对齐契约 P3 §3.3（字段名 + 主张修订引用 + 时间范围）
ALTER TABLE world.event_participations RENAME COLUMN entity_id TO candidate_entity_id;
ALTER TABLE world.event_participations RENAME COLUMN role      TO role_code;
ALTER TABLE world.event_participations
  ADD COLUMN claim_revision_id uuid REFERENCES world.claim_revisions(claim_revision_id),
  ADD COLUMN temporal_scope    jsonb NOT NULL DEFAULT '{}';
CREATE INDEX idx_event_participations_revision ON world.event_participations(claim_revision_id);

-- 10) world.provenance_assessments：对齐契约 P3 §3.4（主张修订引用 + 独立性状态 + 来源指纹 + 版本）
ALTER TABLE world.provenance_assessments
  ADD COLUMN claim_revision_id     uuid REFERENCES world.claim_revisions(claim_revision_id),
  ADD COLUMN independence_state    text,
  ADD COLUMN source_fingerprint    text,
  ADD COLUMN assessment_version    text,
  ADD COLUMN evidence_input_snapshot jsonb NOT NULL DEFAULT '{}';
ALTER TABLE world.provenance_assessments
  ADD CONSTRAINT provenance_assessments_independence_state_check
    CHECK (independence_state IS NULL OR independence_state IN ('UNKNOWN','POSSIBLY_SHARED','INDEPENDENT','DERIVED'));
CREATE INDEX idx_provenance_assessments_revision ON world.provenance_assessments(claim_revision_id);

-- 11) world.world_decision_events：W10 依赖传播决策事件（契约 P3 §3.5）
CREATE TABLE world.world_decision_events (
  world_decision_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_claim_revision_id  uuid REFERENCES world.claim_revisions(claim_revision_id),
  to_claim_revision_id    uuid REFERENCES world.claim_revisions(claim_revision_id),
  dependency_type         text,
  affected_scope          jsonb NOT NULL DEFAULT '{}',
  previous_input_snapshot jsonb NOT NULL DEFAULT '{}',
  change_reason           text,
  producer_method_id      text,
  producer_method_version text,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_world_decision_events_from ON world.world_decision_events(from_claim_revision_id);
CREATE INDEX idx_world_decision_events_to   ON world.world_decision_events(to_claim_revision_id);

COMMIT;
