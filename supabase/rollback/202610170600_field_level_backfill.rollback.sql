-- ============================================================================
-- 回滚：字段级改库（202610170600_field_level_backfill.sql 的精确逆操作）
-- 顺序：先删 L3 后删 L2；先删依赖再删被依赖；先删约束/索引再删列。
-- 前提：36 表仍为 0 行（本迁移不产生数据）。如已写入数据，请勿直接回滚。
-- ============================================================================
BEGIN;

-- L3 —— world.world_decision_events
DROP TABLE IF EXISTS world.world_decision_events;

-- L3 —— world.provenance_assessments（逆序撤销第 10 步）
DROP INDEX IF EXISTS world.idx_provenance_assessments_revision;
ALTER TABLE world.provenance_assessments DROP CONSTRAINT IF EXISTS provenance_assessments_independence_state_check;
ALTER TABLE world.provenance_assessments
  DROP COLUMN IF EXISTS evidence_input_snapshot,
  DROP COLUMN IF EXISTS assessment_version,
  DROP COLUMN IF EXISTS source_fingerprint,
  DROP COLUMN IF EXISTS independence_state,
  DROP COLUMN IF EXISTS claim_revision_id;

-- L3 —— world.event_participations（逆序撤销第 9 步）
DROP INDEX IF EXISTS world.idx_event_participations_revision;
ALTER TABLE world.event_participations
  DROP COLUMN IF EXISTS temporal_scope,
  DROP COLUMN IF EXISTS claim_revision_id;
ALTER TABLE world.event_participations RENAME COLUMN role_code TO role;
ALTER TABLE world.event_participations RENAME COLUMN candidate_entity_id TO entity_id;

-- L3 —— world.identity_decisions（逆序撤销第 8 步）
ALTER TABLE world.identity_decisions
  DROP COLUMN IF EXISTS upstream_g2_snapshot,
  DROP COLUMN IF EXISTS decision_version,
  DROP COLUMN IF EXISTS temporal_scope;

-- L3 —— world.claim_revisions（逆序撤销第 7 步）
DROP INDEX IF EXISTS world.idx_claim_revisions_family;
DROP INDEX IF EXISTS world.idx_claim_revisions_subject;
ALTER TABLE world.claim_revisions DROP CONSTRAINT IF EXISTS claim_revisions_no_self_supersede;
ALTER TABLE world.claim_revisions DROP CONSTRAINT IF EXISTS claim_revisions_supersedes_fk;
ALTER TABLE world.claim_revisions
  DROP COLUMN IF EXISTS asserted_time_json,
  DROP COLUMN IF EXISTS evidence_snapshot_id,
  DROP COLUMN IF EXISTS claim_family_id;
ALTER TABLE world.claim_revisions RENAME COLUMN authored_at TO created_at;
ALTER TABLE world.claim_revisions RENAME COLUMN supersedes_revision_id TO supersedes_id;
ALTER TABLE world.claim_revisions RENAME COLUMN assertion_payload_json TO revision_content;
ALTER TABLE world.claim_revisions RENAME COLUMN subject_id TO object_id;
ALTER TABLE world.claim_revisions RENAME COLUMN subject_kind TO object_type;

-- L2 —— evidence.read_unit_evidence_links（逆序撤销第 6 步）
DROP INDEX IF EXISTS evidence.idx_read_unit_evidence_links_order;
ALTER TABLE evidence.read_unit_evidence_links
  DROP COLUMN IF EXISTS locator_schema_version,
  DROP COLUMN IF EXISTS allowed_purpose,
  DROP COLUMN IF EXISTS extent_order;

-- L2 —— evidence.material_evidence（逆序撤销第 5 步）
DROP INDEX IF EXISTS evidence.idx_material_evidence_supersedes;
DROP INDEX IF EXISTS evidence.idx_material_evidence_reading_unit;
ALTER TABLE evidence.material_evidence
  DROP COLUMN IF EXISTS supersedes_evidence_id,
  DROP COLUMN IF EXISTS input_fingerprint,
  DROP COLUMN IF EXISTS evidence_version_no,
  DROP COLUMN IF EXISTS quote_review_ref,
  DROP COLUMN IF EXISTS quote_review_status,
  DROP COLUMN IF EXISTS voice_basis,
  DROP COLUMN IF EXISTS assertion_kind,
  DROP COLUMN IF EXISTS reading_unit_id;

-- L2 —— 四实体（逆序撤销第 4/3/2/1 步）
DROP TABLE IF EXISTS evidence.reading_unit_dependencies;
DROP TABLE IF EXISTS evidence.material_mentions;
DROP TABLE IF EXISTS evidence.classification_decisions;
DROP TABLE IF EXISTS evidence.reading_units;

COMMIT;
