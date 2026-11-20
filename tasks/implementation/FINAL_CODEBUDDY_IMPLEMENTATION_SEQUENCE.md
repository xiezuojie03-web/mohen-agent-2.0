# Final CodeBuddy Implementation Sequence V1.0

> **失效标注（2026-11-20）**：本文件为历史方案草案，非现行施工顺序。唯一施工依据是 `tasks/implementation/MAB/PLAN.md` V1.7；本文件 16 步（含 V2 基线迁移、G0—G4 re-gating、归档旧路由等）均未被当前授权，不得执行。保留原文仅作历史追溯。

1. Cold backup / repo status / DB schema snapshot.
2. Install final category-based directory tree.
3. Update AGENTS / CURRENT / OWNERSHIP_MAP.
4. Install final specs/contracts/registry/skills/guards.
5. Install unified Phase D execution tree.
6. Apply V2 baseline migration.
7. Apply legacy backfill migration.
8. Run Phase E post-backfill verification.
9. Install persistence/runtime repositories.
10. Run new G0–G4 re-gating.
11. Verify G4 PASS L4 runtime consumption.
12. Verify Evidence on Demand L4→L0.
13. Verify L6/L7→D01.
14. Run all guards/tests/build.
15. Only after PASS: archive/remove old active research/legacy routes.
16. No Production deployment unless separately authorized.

Mandatory STOP: backup failure, dirty-tree conflict, migration error, row/lineage loss, legacy audit creating new PASS, cross-layer write, runtime direct L0–L3 read, test/guard failure, destructive DB operation.
