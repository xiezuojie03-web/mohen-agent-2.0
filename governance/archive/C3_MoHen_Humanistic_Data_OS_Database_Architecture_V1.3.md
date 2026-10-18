# 墨痕 · Humanistic Data OS 数据库与文化世界架构 V1.3

**版本：V1.3 · 2026-10-06**  
**定位：C3 Database & Cultural World Constitution**

> 本版以“三链同轴”为数据库宪法：D01–D05 每一步只对应一个主要 L 层；每个 L 层只由一个 D 阶段负责产生；G0–G4 是对应阶段的出口审核。Research Workspace 不再作为八层旁边的独立架构块。

# 0｜数据库核心命题

数据库不是为了把历史“装进去”，而是为了让墨痕能够在证据边界内持续形成可信文化世界、发现文化关系、产生受约束的人文理解，并把过去重新连接到今天。

四条数据库宪法继续冻结：

1. **Evidence before Knowledge**；
2. **Fact–Interpretation Firewall**；
3. **Geometry is a Claim**；
4. **Stable Truth, Variable Experience**。

另外增加两条结构原则：

5. **Stage–Layer Alignment**：一个 D 阶段只负责一个主要 L 层，一个 L 层不跨 D 生产责任；
6. **Logical Separation without Lineage Break**：Candidate/Adjudicated 可在同层分状态，但全链 lineage 必须不断。

# PART I｜八层长期数据地图

## 1.1 L0 · Cultural Sources（D01）

回答：**我们实际拿到了什么材料，它是谁、从哪里来？**

核心对象：source_record、source_version、raw_item、ingestion_run / acquisition_run。

Source 不是历史事实。Raw 永久保全，不允许用后续标准化结果覆盖原始载体。

## 1.2 L1 · Material Evidence（D02）

回答：**材料具体说了什么、显示了什么，能否可靠定位、引用和评价？**

L1 不再只把 Evidence 理解为“已绑定 Claim 的证据”。它容纳从可靠解释到正式 Evidence 的材料级成熟度：

- interpreted_fragment / interpreted_region；
- evidence_fragment；
- evidence_assessment；
- source_voice；
- literal_reading；
- proposition；
- uncertainty；
- locator / media_region；
- claim_evidence_link（当 L2 Claim 形成后建立）。

**Evidence Fragment ≠ Claim Evidence Link。** 一个材料片段可以先成为可靠证据单元，之后再支持一个或多个 Claim。

## 1.3 L2 · Cultural World（D03）

回答：**人、地、物、事、机构、文本、关系、变化与历史空间是什么？**

核心对象：
- Entity；
- Event；
- RelationClaim；
- Change；
- HistoricalSpaceClaim；
- ExternalCulturalNode；
- Visual/Material Cultural Object。

同层允许 `candidate / adjudicated / conflicted` 等认识状态，但必须显式标记。

关键原则：Mention ≠ Entity；Event ≠ Change；Structural Relation ≠ Cultural Relation；Modern Coordinate ≠ Historical Space。

## 1.4 L3 · Meaning / Discovery / Present（D04）

回答：**这些事实放在一起，改变了什么理解？还有什么值得追？今天如何重新观察？**

核心对象：
- humanistic_finding；
- meaning_candidate / meaning_statement；
- present_connection；
- open_question；
- comparison；
- change_interpretation；
- alternative_explanation；
- unresolved_contradiction；
- discovery_path。

L3 与 L2 必须隔离：L3 可以引用 L2，但不得反向制造事实。

## 1.5 L4 · Trusted Read Model（D05）

回答：**Agent/UI 此刻可以安全读取、组合和展示什么？**

L4 是派生、可重算、只读的消费模型，不是真相单一真源。

核心对象：world_projection、agent_context_view、story_seed、map/timeline projection、runtime discovery path、evidence pointer、expression rule。

L4 不拥有反写 L0–L3 的权限。

## 1.6 L5 · Experience Runtime

保存 ExperienceState、CompositionState、ExperienceAction、Trail、Replan 等运行态。

长期 Truth Store ≠ Agent Memory ≠ Experience State。

## 1.7 L6 · Participation

保存用户观察、行走、轨迹、贡献、口述、策展、分享与现实行动。Contribution ≠ Truth。

## 1.8 L7 · Living Culture

保存今天仍在发生的地方生活、空间使用、仪式、习俗、手艺、口述记忆、社区叙事与当代表达。

L7 的新文化痕迹若值得进入长期文化世界，重新经过 D01，而不是直接写 L0/L1/L2。

# PART II｜五个同轴 Gate

## 2.1 G0 · Source Gate（D01/L0）

检查来源身份、版本、provider、rights、provenance、raw integrity、locator 和 acquisition policy。

G0 PASS 的 Qualified Source 是 D02 合法输入。

## 2.2 G1 · Evidence Quality Gate（D02/L1）

检查是否真正读取、locator 能否重放、source voice 是否明确、literal reading 是否成立、OCR/视觉解释是否足够、uncertainty 是否诚实、证据适用边界是否记录。

G1 不判断历史 Claim 是否成立；它判断**材料证据单元是否合格**。

## 2.3 G2 · World Integrity Gate（D03/L2）

吸收旧 G1–G5 中事实世界相关检查：
- Identity；
- Time；
- Space；
- Claim Evidence Support；
- Source Independence；
- factual conflict。

事实裁决在 D03/G2 内完成，不延后到 D05。

## 2.4 G3 · Interpretation Gate（D04/L3）

检查解释是否有事实基础、是否暴露不确定性、是否存在替代解释、是否把评分当真伪概率、是否保留 counter-signal、是否明确 understanding_delta，以及 Present Connection 是否有现实基础。

## 2.5 G4 · Runtime Eligibility Gate（D05/L4）

检查 L0–L3 lineage、底层 Gate 状态、未解决冲突的表达规则、Evidence on Demand 可回溯性、projection 只读边界和 Runtime eligibility。

# PART III｜状态与成熟度

## 3.1 统一成熟度原则

不再使用“Research World vs Truth World”两套顶层状态系统。

每个 L 层内部可以具有自己的成熟度状态，例如：

`candidate → reviewed/adjudicated → eligible`

具体枚举可按对象类型不同，但必须满足：
- 状态含义明确；
- 不允许通过名称暗示超出证据边界；
- 晋级必须留下 Gate 记录；
- 失败/HOLD 不删除原始 lineage。

## 3.2 Candidate Reservoir ≠ Human Review Queue

候选可以大量存在，但不能全部制造人工债务。只有 narrative-critical、promotion-critical、conflict-critical 或明确需要人工判断的对象进入内部 adjudication queue。

项目拥有者 Human Review View 与内部 queue 分离：前者看叙事成果，后者处理机器无法裁决的技术/证据问题。

# PART IV｜核心文化世界对象模型

## 4.1 Entity
统一人、地、物、机构、文本、建筑、器物等对象身份；允许历史别名、模糊时空范围与 candidate 状态。

## 4.2 Event 与 Change
Event 表示发生了什么；Change 表示对象/关系从什么状态变成什么状态。两者不得合并。

## 4.3 RelationClaim
文化关系必须记录 subject / predicate / object、时空条件、Evidence、认识状态、冲突、Meaning 引用和表达规则。

`relation_claim` 继续作为文化关系单一真源；重复的结构关系存储应在后续 Schema Phase 合并。

## 4.4 Epistemic Status
至少表达：supported、candidate、conflicted、interpretive、open_question、unsupported。Runtime 表达必须与状态一致。

# PART V｜时间、空间、视觉

## 5.1 TemporalScope
必须支持确定时间、约略时间、区间、相对年代、原文纪年与 confidence。

## 5.2 Historical Space ≠ Historical Geometry
modern_location、historical_space_claim、historical_geometry、spatial_anchor、reconstruction_geometry 语义继续分离。

## 5.3 Visual Asset
creation_date 与 depicted_period 分离；来源、rights、对象关联、空间对应、可信度与体验用途必须可追溯。AI生成图像不得冒充历史证据。

# PART VI｜Lineage Contract

所有 Runtime 可消费对象必须可逆向追溯：

```text
L4 projection
→ L3 interpretation/finding
→ L2 claim/world object
→ L1 evidence
→ L0 source/version/raw
```

同时生产历史必须可正向回答：

```text
L0 source
→ D02 evidence
→ D03 cultural world
→ D04 humanistic finding
→ D05 trusted read model
```

逻辑隔离不等于 lineage 断裂。

# PART VII｜UI / Agent 消费边界

默认读取：L4 → L5。

Evidence on Demand：L4 → L3 → L2 → L1 → L0。

用户回写：L6 → L7 → D01。

UI 不允许直接跨底层表自行拼装新的事实解释。

# PART VIII｜物理 Schema 边界

本版只冻结逻辑架构，不立即改 Schema。现有 `research_*`、旧 audit 表、旧 relation 表等物理对象在 Phase E 只读审计后决定 KEEP / MERGE / RENAME / MIGRATE / DROP。

原则：保护真实数据与 lineage，不保护历史表名和历史架构形态。

# PART IX｜数据库验收

数据库验收重点：
- Traceability；
- Epistemic Honesty；
- Temporal Honesty；
- Spatial Honesty；
- Relation Depth；
- Meaning Firewall；
- Present Connection；
- Agent Usability；
- Stage–Layer Alignment；
- Lineage Integrity；
- Human Debt Control。

# 附录｜一句话记住 C3

原始资料不等于证据；证据不等于事实；事实不等于解释；解释不等于可消费表达；可消费表达也不能反向改写真相。每一步都有自己的数据层和 Gate，但所有结果必须能回到原始来源。
