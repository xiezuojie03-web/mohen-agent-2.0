-- M2 数据库迁移：D00-D02 前段（L0-L2 / G0-G2）
-- 前置：preflight 已备份 schema；核心表数据全 0；gate_audits 仅被 5 个旧门视图依赖。
BEGIN;

-- 1. 退役旧门 PASS 视图（旧门继承的物理载体）
DROP VIEW IF EXISTS control.g0_pass_sources CASCADE;
DROP VIEW IF EXISTS control.g1_pass_evidence CASCADE;
DROP VIEW IF EXISTS control.g2_pass_world_objects CASCADE;
DROP VIEW IF EXISTS control.g3_pass_findings CASCADE;
DROP VIEW IF EXISTS control.g4_pass_read_models CASCADE;

-- 2. gate_result 枚举三态 -> 五态
ALTER TYPE control.gate_result ADD VALUE IF NOT EXISTS 'REVOKED';
ALTER TYPE control.gate_result ADD VALUE IF NOT EXISTS 'UNASSESSED';

-- 3. gate_audits：六阶段 / 六门 / 追加审计 / 资格列
ALTER TABLE control.gate_audits DROP CONSTRAINT gate_audits_stage_check;
ALTER TABLE control.gate_audits ADD CONSTRAINT gate_audits_stage_check CHECK (stage = ANY (ARRAY['D00','D01','D02','D03','D04','D05']));
ALTER TABLE control.gate_audits DROP CONSTRAINT gate_audits_gate_code_check;
ALTER TABLE control.gate_audits ADD CONSTRAINT gate_audits_gate_code_check CHECK (gate_code = ANY (ARRAY['G0','G1','G2','G3','G4','G5']));
ALTER TABLE control.gate_audits DROP CONSTRAINT gate_audits_run_id_gate_code_object_type_object_id_key;
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS architecture_generation text NOT NULL DEFAULT 'mohen.six-stage.v1';
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS allowed_scope jsonb DEFAULT '{}';
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS consumer text;
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS dependency_snapshot jsonb DEFAULT '{}';
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS effective_time timestamptz;
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS input_fingerprint text;
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS output_fingerprint text;
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS rule_version text;
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES control.gate_audits(gate_audit_id);
ALTER TABLE control.gate_audits ADD COLUMN IF NOT EXISTS current_valid boolean NOT NULL DEFAULT true;

-- 4. production_runs：代际列 + current_stage 扩 D00
ALTER TABLE control.production_runs ADD COLUMN IF NOT EXISTS architecture_generation text NOT NULL DEFAULT 'mohen.six-stage.v1';
ALTER TABLE control.production_runs DROP CONSTRAINT production_runs_current_stage_check;
ALTER TABLE control.production_runs ADD CONSTRAINT production_runs_current_stage_check CHECK ((current_stage IS NULL) OR (current_stage = ANY (ARRAY['D00','D01','D02','D03','D04','D05'])));

-- 5. L1 四表新建（D01 技术读取）
CREATE TABLE source.read_runs (
  read_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_run_id uuid REFERENCES control.production_runs(run_id),
  raw_item_id uuid REFERENCES source.raw_items(raw_item_id),
  input_sha256 text NOT NULL,
  upstream_g0_decision_id uuid,
  method_set jsonb DEFAULT '{}',
  engine text,
  config jsonb DEFAULT '{}',
  version text,
  status text NOT NULL DEFAULT 'RUNNING',
  manifest_hash text,
  supersedes_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE source.read_units (
  read_unit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  read_run_id uuid NOT NULL REFERENCES source.read_runs(read_run_id),
  parent_id uuid REFERENCES source.read_units(read_unit_id),
  method_code text NOT NULL CHECK (method_code IN ('C01','C02','C03','C04','C05','C06','C07','C08')),
  kind text,
  locator_schema text,
  locator jsonb DEFAULT '{}',
  ordinal int,
  payload_ref text,
  uncertainty jsonb DEFAULT '{}',
  revision_of uuid,
  locator_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (read_run_id, ordinal, method_code, locator_hash)
);

CREATE TABLE source.read_quality_checks (
  check_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  read_run_id uuid NOT NULL REFERENCES source.read_runs(read_run_id),
  metric text,
  profile_id text,
  denominator int,
  population_n int,
  sampled_n int,
  error_n int,
  sampling_scheme text,
  actual jsonb DEFAULT '{}',
  result text,
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE source.read_handoffs (
  handoff_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  read_run_id uuid NOT NULL REFERENCES source.read_runs(read_run_id),
  g1_audit_id uuid REFERENCES control.gate_audits(gate_audit_id),
  output_manifest_hash text,
  allowed_extent jsonb DEFAULT '{}',
  gaps jsonb DEFAULT '{}',
  consumer_stage text NOT NULL DEFAULT 'D02',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. evidence.read_unit_evidence_links：材料 <-> L1 关联
CREATE TABLE evidence.read_unit_evidence_links (
  link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES evidence.material_evidence(evidence_id),
  read_unit_id uuid NOT NULL REFERENCES source.read_units(read_unit_id),
  read_run_id uuid NOT NULL REFERENCES source.read_runs(read_run_id),
  selected_extent jsonb DEFAULT '{}',
  selection_basis text,
  quote_snapshot_hash text,
  technical_profile_id text,
  g1_decision_id uuid REFERENCES control.gate_audits(gate_audit_id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  link_version text,
  supersedes_link_id uuid
);

COMMIT;
