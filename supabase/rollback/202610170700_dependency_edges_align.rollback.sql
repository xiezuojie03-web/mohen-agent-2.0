-- ============================================================================
-- 回滚：world.dependency_edges 对齐（202610170700_dependency_edges_align.sql 的逆操作）
-- ============================================================================
BEGIN;

DROP INDEX IF EXISTS world.idx_dependency_edges_to_revision;
DROP INDEX IF EXISTS world.idx_dependency_edges_from_revision;
ALTER TABLE world.dependency_edges
  DROP COLUMN IF EXISTS to_claim_revision_id,
  DROP COLUMN IF EXISTS from_claim_revision_id;

COMMIT;
