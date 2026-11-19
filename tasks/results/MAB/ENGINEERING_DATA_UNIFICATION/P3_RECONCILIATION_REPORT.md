# P3 历史数据差异与冲突分析核账报告

> 专项：MOHEN-ENGINEERING-DATA-UNIFICATION-01
> 阶段：P3 历史数据差异与冲突分析
> 时间：2026-11-19 ｜ 方式：双端只读查询 + P2 主键/摘要底账 ｜ 零写入、零模型调用、零费用
> 交付物：LOCAL_ONLY_ASSET_CLASSIFICATION.json / CLOUD_ONLY_ASSET_CLASSIFICATION.json / SHARED_DATA_SEMANTIC_CONFLICTS.json / HISTORICAL_RUN_DEPENDENCY_MAPPING.json / GATE_QUALIFICATION_RECONCILIATION.json / SAMPLE_ASSET_MAPPING.json / 本报告

## 1. 本地独有数据的血缘与完整性

115 个本地独有 Run 已逐个建立依赖映射（HISTORICAL_RUN_DEPENDENCY_MAPPING.json）：

- 有 read_runs 关联的：7 个（知识生产主链 Run）。
- 有 gate_audits 关联的：22 个；有 qualification 关联的：21 个。
- 其余为研究/编排/实验类运行记录（多数无知识对象血缘，可独立迁移）。

血缘链验证结论：本地独有对象链完整——raw_items→source_versions→sources、read_units→read_runs→runs、material_evidence→raw_items/reading_units、qualification_current→gate_audits（49/49 依赖审计全部在本地）均无悬空引用。90 个私有原件元数据与 90 个本地独有 raw_items SHA+大小 100% 对应。

## 2. Gate 与资格核账（重点结论）

**91 条本地独有 Gate 审计全部为真实独立签发，不是 legacy：**

| 评审身份 | 条数 | result |
|---|---|---|
| `mohen_gate_signer_m5_machine`（机器 Reviewer） | 83 | 全部 PASS |
| `mohen_gate_signer_m5_owner`（Owner 签发者） | 7 | 全部 PASS |
| `mohen_gate_signer`（早期签发者） | 1 | PASS |

- 全部 decision_origin=independent_gate。711 条共有审计（云端同步的那批）为 reviewer NULL 的 legacy 记录，双端一致保留。
- **未发现任何 legacy_untrusted 被升级、伪造资格或自签行为。**

**123 条候选**：CONSUMED 81 / SUBMITTED 32 / HOLD 10。

**49 条资格**：全部来自独立签发审计、architecture_generation=`mohen.six-stage.v1`；36 条当前有效、13 条已过期（valid_until < now，保留历史状态不复活）。

**撤权与失效**：20 条本地独有 invalidation_events 按原样迁移，保留撤权历史。

**迁移纪律**：先迁审计→再迁资格（依赖拓扑）；`decision_origin`、`reviewer_db_identity`、`valid_from/until`、`supersedes_id` 全部原样保留；**迁移 49 条历史资格不等于现行读取自动放行**——云端正式知识读取按现行资格合同判定，历史资格作为身份与证据保留，是否满足现行合同（generation/scope/purpose）由现行函数裁决。

## 3. 云端历史改写（20 Run + 27 Source/Version）

**20 个共有 Run**：云端 metadata 含 `m5_reconciliation` 块（reason_code=`M5-DIAG-13 legacy unclaimed RUNNING reconciliation`，记录 prior_status/reconciliation_version），系云端 20261118123000/130000 对账迁移**有意的状态治理**。判定：**PRESERVE_CLOUD**（保留云端 HOLD 新值，本地原始状态随本地 115 个 Run 一并迁移留证，两套事实并存不覆盖）。禁止恢复本地旧值。

**27 组 Source 权利差异**：抽样证实本地 rights_by_action 含实际动作值（quote/retain/access_view/machine_read=allowed 等），**云端为空对象 `{}`**。来源：云端 `mab_m5_private_source_action_rights_projection`（20261116121153）投影改写。语义待判：空对象符合失败关闭（无依据不授权），但若投影误清了原本合法动作键则属语义损失。判定：**CONFLICT_PENDING**——需要逐 source 比对动作键规范与来源权利依据后由 Owner 裁决，P4 前 must-not 恢复旧值也不认定新值正确。27 条 source_versions 的 rights_snapshot 同步差异同案处理。

**认证数据**：共有用户 password_hash/session_not_before/updated_at 差异 → **AUTH_DATA_EXCLUDED**，不纳入迁移，云端现状优先。

**表形驱动差异**：public.assets(6)/public.director_plans(9)/publication.published_pointers(4) 的同 ID 异内容源于 P1 已确认的列集差异 → 结构对齐后重估，暂列 CONFLICT_PENDING。

## 4. 历史样板资产映射（SAMPLE_ASSET_MAPPING.json）

| 样板 | sources L/C | raw L/C | run L/C | Gate L/C | 资格 L/C | 结论 |
|---|---|---|---|---|---|---|
| 金泽 | 5/5 | 14/14 | 有/有 | 0/0* | 0/0* | 双端一致，无迁移需求 |
| 绿之丘 | 1/1 | 7/7 | 有/有 | 0/0* | 0/0* | 双端一致 |
| 朱家角 | 2/1 | 3/2 | 有/有 | 1/0 | 1/0 | 本地多 1 source+1 raw+1 gate+1 资格需迁移 |
| 七宝 | 4/0 | 4/0 | 有/无 | 1/0 | 1/0 | 云端全缺，整体迁移 |
| 松江府志 | 2/0 | **80/0** | 有/无 | 8/0 | 3/0 | 云端全缺，80 个 raw + 8 gate + 3 资格整体迁移 |

*金泽/绿之丘的 Gate 记录在共有 run（Oct 17/18）名下，已双端一致；朱家角/七宝/松江的 Gate 在本地独有 run 名下。
另：90 个私有原件（11 月新增）不属于任何历史样板，是自由主题/朱家角研究任务的素材。

## 5. P3 准出七问（逐项回答）

1. **本地哪些数据可以进入云端？** 35 张表的本地独有知识对象层（source/evidence/world/meaning/read_model/control 全系）按原主键拓扑迁移（MIGRATE_AS_IS，约 1400+ 对象，含 115 run、91 审计、123 候选、49 资格、90 raw、89 version、12 source 等）。
2. **哪些需要补充关系或映射？** 19 张 MIGRATE_WITH_MAPPING：10 张本地独有表须先在云端补装结构迁移（M4/ST-07/08/09/导演计划/artifact_content_columns）；public.assets/director_plans/published_pointers 列扩展须先装对应迁移；Studio 项目层需 Project↔云端开发项目共存映射。
3. **哪些需要独立资格审核？** 49 条历史资格**保留为历史证据**，不自动成为现行可用资格；当前 qualification_current 为 0 的云端在迁移后仍按现行合同判定历史对象可用性，需要复用的对象按现行独立 Gate 重新审核（不在本专项内执行）。32 条 SUBMITTED + 10 条 HOLD 候选保留原状态。
4. **哪些云端历史改写必须保留？** 20 个 Run 的 HOLD 对账改写（PRESERVE_CLOUD，有完整 metadata 证据链）。
5. **哪些冲突必须等待 Owner 裁决？** 27 组 source/source_versions 权利字段（本地有值 vs 云端空对象）——语义是"失败关闭的正确清空"还是"投影误清"，需逐条核对权利依据后裁决。
6. **P4 分批迁移顺序建议**：①结构补装（云端安装 24 个缺失迁移）→ ②Run/审计/资格层（115 run→91 审计→123 候选→49 资格→20 撤权）→ ③来源层（12 source→89 version→90 raw，权利字段按冲突裁决结果）→ ④知识对象层（read_runs/read_units/reading_units/material_evidence/world/meaning/read_model）→ ⑤Studio 层（16 project→110 资产头→111 修订→90 原件元数据）→ ⑥出版链层（映射后迁移）。每批幂等、可恢复、带迁移批次 ID。
7. **如何确保身份和关系不丢失？** 保留全部原始主键/时间戳/环境来源；依赖拓扑排序写入；每批次写入回执+逐对象回读比对（P5 用 P2 同源 MD5 方法复验）；冲突记录单列不覆盖；迁移 Manifest 全程留证。

## 6. 执行限制遵守情况

全程只读、零模型调用、零费用、未签发任何 Gate、未改变任何资格、未删除云端独有数据、未执行 P4。P0-P2 三提交（4884eec/3c86afa/eb1d75d）完整保留于本地 main。

- 阶段状态：P3 = **INVENTORY_COMPLETE（冲突分析完成）**
- 待 Owner 裁决：27 组权利字段冲突方向；其余分类已具备形成 P4 迁移执行计划的条件。
