# P4 历史业务数据接管与云端统一迁移执行计划

> 专项：MOHEN-ENGINEERING-DATA-UNIFICATION-01 ｜ 阶段：P4 计划
> 时间：2026-11-19 ｜ 状态：**P4_PLAN_READY_FOR_OWNER_APPROVAL / NOT_EXECUTED**
> 前置：P0-P3 全部完成并已推送 GitHub main（25ffe1b）；27组权利 Owner 裁决（2026-11-19）已固化
> 配套：P4_BATCH_MANIFEST.json / P4_SCHEMA_PREREQUISITES.json / P4_CONFLICT_HANDLING_RULES.json / P4_BACKUP_AND_RECOVERY_PLAN.md / P4_VALIDATION_MATRIX.json

## 1. 总原则

- 云端 mohen-cloud 为权威节点，迁移方向：本地 → 云端，单向。
- 原始主键、时间戳、Reviewer身份、环境来源、Gate历史、资格状态全部原样保留。
- 原件字节不迁移（仅元数据+SHA+存储引用+权利证据）。
- 认证凭据排除（云端认证现状优先）。
- 云端独有数据结构性保护（全计划无DELETE，INSERT全部ON CONFLICT DO NOTHING）。
- 不关闭RLS、不删触发器、不绕过业务合同；Immutable表走受控INSERT适配器。

## 2. 批次设计（依赖顺序）

```
BATCH-0 结构与迁移适配（24个迁移补装+身份映射）
   ↓
BATCH-1 运行与治理历史（115 run→91审计→123候选→6绑定→49资格→20撤权→1桥接键）
   ↓
BATCH-2 来源与原始材料（12 source→89 version→90 raw→90原件元数据→27+12权利→D00账本→8 read_run）
   ↓
BATCH-3 知识对象（read_units→reading_units→material_evidence→findings→read_model→world对象）
   ↓
BATCH-4 Studio资产（users身份行→16 project→110资产头→111修订→25委托→23回执→M4/ST表→研究任务/事件/回执）
   ↓
BATCH-5 发布链与消费链（works→work_revisions→editorial/snapshots/withdrawals→pointers→11组受控UPDATE）
```

各批次对象数量、规则、风险见 P4_BATCH_MANIFEST.json。

## 3. 权利裁决落实（Owner 2026-11-19）

- 27组共有来源：quote/retain/access_view/machine_read 四动作 allowed 值连同完整 rights_evidence（owner_authorization、2026-11-08、project_internal_research、granted/held清单、写入审计）通过**受控UPDATE**迁移到云端（前后值存档）——全计划唯一针对共有行的UPDATE之一，逐条留痕。
- 12条本地独有来源随INSERT原样带入权利与证据。
- 5个held动作（adapt/display/download/redistribute/external_processing）云端保持空对象，不新增授权，不改写显式unknown。
- 定性：历史Owner授权事实迁移，不是重新授权。

## 4. 执行前置条件核查结果

| 条件 | 状态 |
|---|---|
| 云端完整备份可恢复 | ✅ 方案就绪（L0全量+恢复演练，见备份计划），执行时落实 |
| 待迁移表结构对齐 | ⏳ BATCH-0 装24个迁移后重跑结构盘点验证 |
| 外键依赖关系明确 | ✅ FK图已在P1产出，批次顺序按拓扑排列 |
| P3冲突分类完成 | ✅ 8条冲突规则固化于 P4_CONFLICT_HANDLING_RULES.json |
| 权利Owner裁决固化 | ✅ 本计划§3 |
| 认证数据排除 | ✅ RULE-4 |
| 幂等与回滚方案 | ✅ 全INSERT ON CONFLICT + 分批事务 + L0/L1/L2备份分层 |
| 云端独有数据不覆盖 | ✅ 结构性保证（无DELETE/UPDATE限定主键集） |

**唯一待Owner确认项**：PREREQ-2 用户身份行落位——本地7个用户+机器Reviewer用户按原ID插入云端（password_hash置不可用占位、账户不可登录直至密码恢复），以满足research_tasks/gate_reviewer_bindings/projects等表的外键。推荐此方案（保身份、不迁凭据）；备选是外键引用重映射（会破坏身份连续性，不推荐）。

## 5. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 24个迁移在云端重放时的幂等性差异 | 逐个执行+逐个回读结构；失败即停该迁移不进数据批次 |
| rights_snapshot不可变触发器拒绝历史快照写入 | 触发器只拦UPDATE非空快照，INSERT路径不受限（已核实迁移源码） |
| 共有行的两条受控UPDATE | 主键限定+前后值存档+单独事务 |
| 云端Free计划限流/暂停 | 迁移执行窗口前检查项目active状态；分小事务降低单次压力 |
| 大表（gate_audits 91行/asset_revisions 111行）事务过大 | 实际行数均为百级，单表单事务可行 |

## 6. 验收标准

每批次按 P4_VALIDATION_MATRIX.json 验收：行数/PK集合/MD5摘要（P2同源方法）逐对象回读比对；保护对象（e03c4ba8、15行云端独有、20个HOLD run、13条过期资格、共有用户）摘要不变断言；最终P5全库分类账 MIGRATED_AND_VERIFIED / ALREADY_IDENTICAL / CONFLICT_PENDING / BINARY_NOT_MIGRATED 与P3清单一致。

## 7. 执行流程（获Owner批准后）

1. 确认PREREQ-2方案 → 2. L0全量备份+恢复演练 → 3. BATCH-0结构补装+盘点复验 → 4. 按批次执行（每批：L1快照→迁移→回执→回读→progress登记）→ 5. P5逐对象一致性验收 → 6. P6长期机制 → 7. P7归档。

## 8. 本轮状态

- **P4_PLAN_READY_FOR_OWNER_APPROVAL / NOT_EXECUTED**
- 未写入任何数据库、未调用模型、未产生费用。
- 提交链 4884eec→3c86afa→eb1d75d→83d2a70→25ffe1b 已全部推送 GitHub main（origin/main=main=25ffe1b，28个专项目录文件零差异）。
