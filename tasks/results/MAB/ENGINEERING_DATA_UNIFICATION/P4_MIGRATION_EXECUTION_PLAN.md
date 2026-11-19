# P4 历史业务数据迁移规程

适用于 MOHEN-ENGINEERING-DATA-UNIFICATION-01。实施与回读证据见 [施工证据账](../../../implementation/MAB/progress.md#studio-d00-docs-reconciliation)。

## 执行合同

- 单向迁移至开发库。保留原主键、时间戳、版本、Reviewer 身份、审计来源与资格状态。原件迁移范围为元数据、SHA、存储引用和权利证据。
- 批次依赖、对象归属及写入规则以 [批次清单](P4_BATCH_MANIFEST.json) 为准。按 [前置条件](P4_SCHEMA_PREREQUISITES.json) 补装结构并处理身份外键。
- 业务行按主键幂等插入。共享行仅按 [冲突规则](P4_CONFLICT_HANDLING_RULES.json) 执行受控更新，限定主键并保存前后值。认证凭据排除。云端独有对象受保护。
- 保持 RLS、触发器及不可变记录合同。批次执行使用受控角色；按 [备份与恢复规程](P4_BACKUP_AND_RECOVERY_PLAN.md) 留存快照、回执并处理失败。
- 每批按 [验收矩阵](P4_VALIDATION_MATRIX.json) 回读主键集合、行数、摘要和保护对象。业务批次的执行遵循 Owner 授权范围。
