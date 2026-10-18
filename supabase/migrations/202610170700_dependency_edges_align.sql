-- ============================================================================
-- 字段级改库补充（2026-10-17 第二批）：对齐 world.dependency_edges
-- 依据：契约 P3 §3.5 —— "world.dependency_edges 和 world.world_decision_events：
--       主张修订依赖方向、失效范围、事件ID、上一输入快照、变更原因、创建时间"
--       §6 —— "from/to revision、变更源、影响类型、重评/失效状态"（W10 必须精确传播）
-- 性质：纯增列（不删旧对象级多态列），空表增列低风险。
-- 回滚：supabase/rollback/202610170700_dependency_edges_align.rollback.sql
-- ============================================================================
BEGIN;

-- 补"主张修订依赖方向"锚点：from/to 锚定 world.claim_revisions（修订级），
-- 使 W10 能按"修订版本"精确传播失效，而非只能指向无版本的对象。
ALTER TABLE world.dependency_edges
  ADD COLUMN from_claim_revision_id uuid REFERENCES world.claim_revisions(claim_revision_id),
  ADD COLUMN to_claim_revision_id   uuid REFERENCES world.claim_revisions(claim_revision_id);

CREATE INDEX idx_dependency_edges_from_revision ON world.dependency_edges(from_claim_revision_id);
CREATE INDEX idx_dependency_edges_to_revision   ON world.dependency_edges(to_claim_revision_id);

COMMIT;
