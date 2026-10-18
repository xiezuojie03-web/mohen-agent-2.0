-- M3：D03–D04 历史世界 + 人文发现（L3/L4，G3/G4）
-- 复用第二代 world.*（8 表）+ meaning.*（3 表），本迁移只 ADD 账本表 + 资格视图。
-- 裁决：版本化用独立 *_claim_revisions 表（不改原 11 表字段）；
--       事件多角色独立建表；资格投影用视图；G3/G4 审计复用 control.gate_audits。
BEGIN;

-- B1：世界对象不可覆盖修订（统一修订账本）
CREATE TABLE IF NOT EXISTS world.claim_revisions (
  claim_revision_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type           text NOT NULL,
  object_id             uuid NOT NULL,
  revision_no           integer NOT NULL,
  revision_content      jsonb NOT NULL,
  producer_method_id    text NOT NULL,
  producer_method_version text,
  upstream_refs         jsonb,
  supersedes_id         uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_revisions_object_type_check
    CHECK (object_type IN ('entity','event','relation_claim','change','historical_space_claim','visual_object'))
);

-- B2a：身份同一性决策（aliases 不得作身份 PASS，须有独立决策记录）
CREATE TABLE IF NOT EXISTS world.identity_decisions (
  identity_decision_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id             uuid NOT NULL REFERENCES world.entities(entity_id),
  merged_entity_ids     uuid[] NOT NULL DEFAULT '{}',
  decision_type         text NOT NULL,
  rationale             text NOT NULL,
  producer_method_id    text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_decisions_decision_type_check
    CHECK (decision_type IN ('same_identity','distinct_identity','merge','split'))
);

-- B2b：身份决策的返证锚点（指向 L2 材料）
CREATE TABLE IF NOT EXISTS world.identity_decision_evidence (
  identity_decision_evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_decision_id  uuid NOT NULL REFERENCES world.identity_decisions(identity_decision_id),
  evidence_id           uuid NOT NULL REFERENCES evidence.material_evidence(evidence_id),
  support_type          text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_decision_evidence_support_type_check
    CHECK (support_type IN ('supports','undermines','neutral'))
);

-- B3：依赖闭包（W10 影响闭包/精准失效）
CREATE TABLE IF NOT EXISTS world.dependency_edges (
  dependency_edge_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_object_type      text NOT NULL,
  from_object_id        uuid NOT NULL,
  to_object_type        text NOT NULL,
  to_object_id          uuid NOT NULL,
  dependency_type       text NOT NULL,
  producer_method_id    text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dependency_edges_dependency_type_check
    CHECK (dependency_type IN ('supports','derived_from','refines','conflicts_with'))
);

-- B4：来源独立性评估（同源三书不能算三见证）
CREATE TABLE IF NOT EXISTS world.provenance_assessments (
  provenance_assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_object_type     text NOT NULL,
  claim_object_id       uuid NOT NULL,
  assessment_type       text NOT NULL,
  source_lineage        jsonb NOT NULL,
  is_independent        boolean NOT NULL,
  rationale             text NOT NULL,
  producer_method_id    text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provenance_assessments_assessment_type_check
    CHECK (assessment_type IN ('independence','genealogy'))
);

-- B5：事件多角色（受让/桥改建/亭扩建等，attributes jsonb 不足以精确约束角色）
CREATE TABLE IF NOT EXISTS world.event_participations (
  event_participation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              uuid NOT NULL REFERENCES world.events(event_id),
  entity_id             uuid NOT NULL REFERENCES world.entities(entity_id),
  role                  text NOT NULL,
  expression_rule       jsonb NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- B6：解释版本化（L4 人文发现同样不可覆盖修订）
CREATE TABLE IF NOT EXISTS meaning.claim_revisions (
  claim_revision_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id            uuid NOT NULL REFERENCES meaning.findings(finding_id),
  revision_no           integer NOT NULL,
  revision_content      jsonb NOT NULL,
  producer_method_id    text NOT NULL,
  producer_method_version text,
  supersedes_id         uuid,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- B8：资格投影视图（G3 PASS 世界对象 / G4 PASS 人文发现，基于 gate_audits）
CREATE OR REPLACE VIEW control.world_eligibility AS
SELECT g.object_type, g.object_id, g.gate_audit_id, g.purpose, g.allowed_scope, g.consumer, g.effective_time
FROM control.gate_audits g
WHERE g.gate_code = 'G3' AND g.result = 'PASS' AND g.current_valid = true;

CREATE OR REPLACE VIEW control.meaning_eligibility AS
SELECT g.object_type, g.object_id, g.gate_audit_id, g.purpose, g.allowed_scope, g.consumer, g.effective_time
FROM control.gate_audits g
WHERE g.gate_code = 'G4' AND g.result = 'PASS' AND g.current_valid = true;

COMMIT;
