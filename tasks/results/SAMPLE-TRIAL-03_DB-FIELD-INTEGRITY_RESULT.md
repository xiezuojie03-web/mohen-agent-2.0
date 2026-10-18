# 数据生产作业样板试验 · 数据库字段级完整性再评估（回应 Owner 三个质疑）

> 日期：2026-10-17
> 性质：对评估 A"无需改库"结论的**修正性再评估**（字段级），并回应 Owner 关于"D02 越界""落点缺失是否个别""迭代是否失败"的三个质疑。
> 方法：全 6 层持久化契约（L0/L1/L2/L3/L4/L5）的"设计应有字段/实体" ↔ 真实库 `mohen_dev` 36 表实际字段，逐层逐字段核对。

---

## 一、质疑 1 澄清：我之前"变相重读"的表述不当

**Owner 说得对。** 架构在设计之初就明确"每个阶段做自己的事、不返回做上一阶段、不越界做下一阶段"。我此前在评估 D 第九节写"D03 被迫回读 L1 原文 / normalized_text"，这个表述**隐含了"D03 越界去补 D02 的活"**，是错误的容忍，违反架构分层原则。

**正确表述应为：**
- L2 落点（`material_mentions` 等结构化字段）缺失，是一个**架构缺陷（断环）**，不是"实现时可容忍的变通"。
- 正确修复是**补全 L2 落点**，让 D02 把该做的（结构化观察 + 字面提及 + 依赖链）真正做全、落全；
- 而不是让 D03 越界去读原文替 D02 补活。**任何"下一阶段补上一阶段"的实现，都是架构退化的信号，必须禁止。**

---

## 二、质疑 2 验证：字段级缺口是系统性的，不止 D02 一处

逐层核对结果：**L1/L2/L3/L5 都存在字段级缺口，L2/L3 最重，L4 较轻。** 之前评估 A 只核了"表级骨架"（36 表存在 + gate_audits 22 列），没有核"字段级是否满足各层契约"，结论不完整。

### 2.1 缺口总表

| 层 | 契约要求的落点 | 真实库现状 | 缺口级别 |
|---|---|---|---|
| **L0** | 交接字段（handoff 包）+ G0 独立审计 | source 三表 + gate_audits 扩展 + read_handoffs | **轻**（handoff 无独立表，靠 gate_audits 兜底，可接受但需确认） |
| **L1** | 候选原文 `transcription_candidates`、`technical_uncertainty` | read_units 无 `transcription_candidates` 独立列，靠 `locator`/`payload_ref` 兜底 | **轻**（需确认 payload_ref 方案或补列） |
| **L2** | 契约 §7.2"必须新增"5 实体 + material_evidence 补 8 列 | 仅 read_unit_evidence_links 落地；**缺 4 实体 + 8 列** | **重** |
| **L3** | 契约 §3"ADD"8 实体 + 关键列 | **world_decision_events 表缺失**；claim_revisions/identity_decisions/event_participations/provenance_assessments 字段名与契约不一致或缺列 | **重** |
| **L4** | 九类语义职责（human_question/interpretive_statement/understanding_delta…） | meaning.findings 15 列基本覆盖；契约明说"不开展逐列 DDL 审查" | **轻** |
| **L5** | artifact_ref/revision/producer_method_version/dependency_snapshot/purpose/scope/audience/validity | read_model 六表以 `payload`(jsonb) 兜底，缺显式列 | **中** |

### 2.2 逐层明细

#### L2（evidence）—— 最重
契约 P2 §7.2 明确"必须新增逻辑实体"，真实库**缺失 4 个实体**：
1. `evidence.material_mentions`（字面提及：人/时/地/物/数）—— **表缺失**
2. `evidence.reading_units`（作品内卷篇/条目/图幅结构单元）—— **表缺失**
3. `evidence.reading_unit_dependencies`（引书/转录/编辑依赖）—— **表缺失**
4. `evidence.classification_decisions`（H 类型判定历史）—— **表缺失**

`material_evidence` 缺列（契约 §7.2 要求补）：`assertion_kind`、`voice_basis`、`quote_review_status`、`quote_review_ref`、`evidence_version_no`、`input_fingerprint`、`supersedes_evidence_id`、`reading_unit_id`。

> 这正是质疑 1 的根：**D02 的"最小结构化产出"（字面提及/断言类型/依赖链）在数据库里没有落点**，所以 D02 即便读出来了也存不下，D03 才可能被迫越界。

#### L3（world）—— 重
契约 P3 §3 明确"ADD"的实体，真实库**缺失/不一致**：
1. `world.world_decision_events`（W10 依赖传播的决策事件）—— **表缺失**（world 14 表里无此表）
2. `world.claim_revisions`：契约要求 `subject_kind/subject_id/claim_family_id/evidence_snapshot_id/asserted_time_json/assertion_payload_json`；真实库是 `object_type/object_id/revision_no/revision_content/...`，**字段名不一致且缺 claim_family_id/evidence_snapshot_id/asserted_time_json/assertion_payload_json**
3. `world.identity_decisions`：契约要求"适用历史时段 temporal_scope、决策版本 decision_version、G2 输入快照"；真实库**缺**这三项
4. `world.event_participations`：契约要求 `claim_revision_id、temporal_scope`；真实库**缺**
5. `world.provenance_assessments`：契约要求 `claim_revision_id、来源集合指纹、版本`；真实库用 `claim_object_type/object_id` 替代，**缺来源指纹/版本**
6. `control.world_gate_audits_vnext` / `world_eligibility_vnext`：候选（名称待评审），真实库未建，**可能由扩展的 gate_audits 22 列覆盖，需确认**

#### L1（source.read_units）—— 轻
契约 P1 §2 要求 L1 有"候选原文"（`transcription_candidates`）与 `technical_uncertainty`；真实库 read_units 有 `uncertainty`，但**无 `transcription_candidates` 独立列**，候选原文靠 `locator`(jsonb) 或 `payload_ref`（指向外部存储）承载。需确认该"可选高吞吐"方案是否被正式采纳。

#### L5（read_model）—— 中
契约 P5 要求每类成果含 `artifact_ref/revision/producer_method_version/dependency_snapshot/purpose/scope/audience/validity`；真实库六表主要是 `payload`(jsonb) + `derived_from_*` + `generated_at`，**上述字段无独立列**。契约 §二 明说"本轮不建立 Schema/DDL"，故属"逻辑待定"，但 `payload` 兜底有"关键审计藏进 JSON"的风险（L3 契约 §8 已警告此点）。

---

## 三、质疑 3 结论：ARCH-MIG-01 迭代在"字段级落点"不完整，需返回补库

**Owner 的判断成立。** 逐项核对显示：

- ARCH-MIG-01 的 M2–M4 迁移，在**表级骨架**上是成功的（6 schema / 36 表 / gate_audits 22 列 / 五态枚举 / 旧 37 表已退役）；
- 但在**字段级落点**上不完整：各层契约（P0.3/P1/P2/P3/P4/P5）里"设计已裁决"的**字段级扩展与新实体，有相当一部分没有在真实库落地**（L2 缺 4 实体、L3 缺 world_decision_events + 多表字段不一致）。

**根因判断**：M2–M4 迁移时，实施者以"表级骨架 + 旧表复用"为主，把契约里"ADD 新实体 / 补列"的设计裁决**遗漏或延后**了；而这些字段级落点正是"一环扣一环"的关键（D02 的观察 → L2 结构化字段 → D03 直接消费，中间任何一环缺字段，就会断环）。

**是否"迭代失败"**：不判"失败"，但判**"未完成收口"**——表级迁移通过，字段级落点未闭环，需返回补一次"字段级改库"才能让 D→方法→L→G 真正一环扣一环。这与任务书"M0–M5 全部收口"的口径有偏差，应如实登记为**"表级已迁移、字段级待补库"**。

---

## 四、字段级改库清单（供 Owner 确认后执行，属"改库已授权"范围）

| 优先级 | 动作 | 层 | 说明 |
|---|---|---|---|
| **P0** | 新增 `evidence.material_mentions`、`evidence.reading_units`、`evidence.reading_unit_dependencies`、`evidence.classification_decisions` 4 实体 | L2 | D02 结构化观察的落点，D03 免越界的根基 |
| **P0** | `material_evidence` 补 8 列（assertion_kind/voice_basis/quote_review_status/quote_review_ref/evidence_version_no/input_fingerprint/supersedes_evidence_id/reading_unit_id） | L2 | 同 P0 |
| **P0** | 新增 `world.world_decision_events` 表 | L3 | W10 依赖传播的落点 |
| **P1** | 对齐 `world.claim_revisions`/`identity_decisions`/`event_participations`/`provenance_assessments` 字段（补 claim_family_id/evidence_snapshot_id/temporal_scope/decision_version/claim_revision_id 等） | L3 | 字段名与契约对齐，补缺列 |
| **P1** | 确认 `control.gate_audits` 22 列是否已覆盖 world_gate_audits_vnext / world_eligibility_vnext 的职责；不足则补 | L3/control | 避免重复建表 |
| **P2** | 确认 L1 `transcription_candidates` 落点（补列或采纳 payload_ref 方案） | L1 | 候选原文结构化落点 |
| **P2** | 确认 L5 read_model 关键字段是否需从 `payload` 提升为显式列（revision/producer_method_version/dependency_snapshot/purpose/consumer） | L5 | 避免关键审计藏进 JSON |
| **P3** | 确认 L0 handoff 交接实体落点（gate_audits 覆盖是否足够） | L0 | 交接包语义 |

---

## 五、对之前结论的修正

| 文件 | 原结论 | 修正 |
|---|---|---|
| SAMPLE-TRIAL-01 评估 A | "无 schema 缺口，无需改库 DDL" | 修正为：**表级骨架无缺口，但字段级落点有系统性缺口（L2 最重、L3 次之），需执行字段级改库** |
| SAMPLE-TRIAL-02 第九节 9.1 | "D03 被迫回读（变相重读）" | 修正为：L2 落点缺失是架构断环，正确修复是补库，禁止 D03 越界 |

**下一步待 Owner 拍板：** 是否按本清单执行"字段级改库"（先 L2/L3 的 P0 项），作为第三步样板试验的前置；改库前我会照例做 preflight pg_dump 备份 + 逐列差异 SQL + 回滚脚本，逐项留痕。
