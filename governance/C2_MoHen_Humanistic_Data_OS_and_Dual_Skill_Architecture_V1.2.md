# 墨痕 · Humanistic Data OS 与双 Skill 架构 V1.2

**版本：V1.2 · 2026-10-06**  
**定位：C2 Professional Constitution / Humanistic Data OS 与能力架构基线**

> 本版完成“三链同轴”宪法化：D01–D05 是唯一数据生产主线；L0–L4 是其数据库落点；G0–G4 是阶段出口审核。Discovery / Directed 不再是两条生产模式，只保留为阶段内部可选策略。

# 1｜最高目标

墨痕不是为了建立更大的历史资料库，而是建立一个可持续生产、验证、发现、解释和体验的人文文化世界，使过去能够重新进入今天的生活、地方与行动。

Humanistic Data OS 不是“大数据库”，而是把文化资料持续转化为**可信、可关联、可发现、可体验、可回到今天**的生产与运行机制。

# 2｜双 Skill 系统

| 系统 | 服务对象 | 核心问题 | 主要结果 |
|---|---|---|---|
| Developer Skills | 数据/工程执行平台 | 怎样可靠建设与维护墨痕世界？ | L0–L4、Gate结果、可复用生产能力 |
| Agent Skills | 最终产品中的墨痕 Agent | 怎样理解用户并带其探索？ | 查询、比较、解释、体验、追问、Replan |
| Humanistic Data OS | 两者共同底座 | 墨痕工作在怎样的文化世界中？ | L0–L7 长期循环 |

**永久边界：Developer Skills 造世界；Agent Skills 在世界里行动。Agent 不直接制造历史事实。**

## 2.1 Skill 实体化与复用铁律

一个 Skill 只有同时满足以下要求才算正式能力：

1. 存在机器可读 `SKILL.md`；
2. 有固定可调用 entry；
3. 输入、输出、读写范围、Gate、停止条件、测试均契约化；
4. 在机器 Registry 中登记实现映射。

同一能力只允许一个 canonical implementation。并行重复实现必须合并或归档。

> **本版暂不冻结“一个 Skill 是否允许跨多个 D 阶段”。只冻结：阶段责任不可跨阶段。** 一个复用 Skill 可以被多个阶段调用，但不能模糊谁负责最终输出、写哪个 L 层、过哪个 G。

# 3｜唯一数据生产主线：D01–D05

```text
D01 Source Intake
 ↓
D02 Material Understanding & Evidence
 ↓
D03 Cultural World Structuring
 ↓
D04 Humanistic Discovery
 ↓
D05 Trusted Read Model Publication
```

不存在与其并列的 Discovery Research / Directed Production / N01–N06 第二主线。

`broad / directed` 只允许作为 search/research strategy，用来描述本阶段是开放探索还是围绕已知问题补充材料。

## 3.1 D01｜Source Intake

职责：定义研究意图与范围、设计来源策略、发现资料、获取内容、保存 Raw、登记来源身份。

必须做到：
- 不以数量代替来源价值；
- 不把转引当独立来源；
- 区分题名/目录/OCR/全文/书影/原图/结构化数据等可获得级别；
- 支持反例与替代来源搜索；
- 建立可解释的停止条件。

输出责任：只产生 L0。

## 3.2 D02｜Material Understanding & Evidence

职责：按载体真正读懂材料，把原始文本、书影、舆图、图片、记录、结构化数据转为可定位、可引用、可评价的材料证据单元。

核心边界：
- OCR ≠ Understanding；
- title/index ≠ Evidence；
- visual title ≠ visual content reading；
- interpreted fragment ≠ evidence-qualified fragment；
- Evidence Fragment ≠ Claim Evidence Link。

输出责任：只产生 L1。

## 3.3 D03｜Cultural World Structuring

职责：把 L1 证据组织为人、地、物、事、机构、文本、时间、空间、关系、变化和历史空间主张。

核心边界：
- Mention ≠ Entity；
- structural relation ≠ Cultural Relation；
- modern coordinate ≠ historical location；
- Event ≠ Change；
- Candidate ≠ Adjudicated。

输出责任：只产生 L2。

## 3.4 D04｜Humanistic Discovery

职责：在可信或明确标记状态的 L2 文化世界中发现关系、变化链、机制、冲突、比较、开放问题、人文意义与当下连接。

核心边界：
- co-occurrence ≠ relation；
- score ≠ truth probability；
- Meaning 不能反向制造 Fact；
- 必须保留 counter-signal、alternative explanation、missing evidence。

五母题只作为深化和 Narrative Readiness Lens，不是事实 Gate。

输出责任：只产生 L3。

## 3.5 D05｜Trusted Read Model Publication

职责：把已通过前四阶段 Gate 的 L0–L3 组装为可由 Agent/UI 默认消费、可重算、只读的 L4 Trusted Read Model。

D05 不回头裁决 L2/L3；事实裁决在 D03/G2 内完成，解释裁决在 D04/G3 内完成。

输出责任：只产生 L4。

# 4｜阶段交接原则

每个阶段采用统一合同：

`Entry → Work → Output → Gate → Disposition → Downstream Promise`

**上一步 Gate PASS 的 Output = 下一步合法 Entry。**

非 PASS 输出可 HOLD / DEEPEN / DROP / REJECT，但不得偷偷进入下一阶段。

# 5｜机器 Gate 与项目拥有者 Human Review View

两者必须分开。

## 5.1 Machine Gate

负责可追溯性、字段/状态合法性、来源完整性、证据质量、事实完整性、解释边界、Runtime 资格等机器强制。

## 5.2 Human Review View

项目拥有者每个 D 阶段都可介入，但只看：

1. 服务叙事判断的可视化统计；
2. 数据库真实内容表中的叙事相关字段；
3. 最值得关注的真实内容、缺口、反例与异常；
4. `ACCEPT / DEEPEN / DROP` 内容判断。

默认不看 SQL、trigger、guard log、retry、checksum、latency、token 等技术控制资料。

> Machine Gate 回答“能不能过”；Human Review View 回答“值不值得继续”。

# 6｜L0–L7 长期 Humanistic Data OS

| 层 | 核心问题 |
|---|---|
| L0 Cultural Sources | 我们实际拿到了什么资料？ |
| L1 Material Evidence | 材料具体说/显示了什么，能否被可靠引用？ |
| L2 Cultural World | 人、地、事、物、关系、变化与历史空间是什么？ |
| L3 Meaning / Discovery / Present | 这些事实改变了什么理解，与今天如何连接？ |
| L4 Trusted Read Model | Agent/UI 此刻可以安全读取什么？ |
| L5 Experience Runtime | 用户此刻正在经历什么？ |
| L6 Participation | 用户如何观察、行走、记录、贡献、策展？ |
| L7 Living Culture | 今天仍在发生、被实践和记忆的文化是什么？ |

L7 中形成的新文化痕迹若要进入长期知识世界，必须重新从 D01 开始。

# 7｜Living Cultural Relationship Model

文化关系不是图数据库里的“边”。最小要求包括：对象、关系类型、时间条件、空间条件、Evidence、认识状态、冲突、意义连接、表达边界以及进一步发现能力。

这仍是 Evidence 与 Experience 之间最重要的中间模型。

# 8｜Agent-native Experience

Agent 改变的是 Experience State / Composition / Experience Action，而不是自由生成任意 UI 或自由改写历史世界。

L4 是默认知识读取入口；L5 管运行状态；当用户追问依据时，必须可沿 L4→L3→L2→L1→L0 逆向返回。

# 9｜治理

项目拥有者决定产品价值、人文判断与最终架构；执行器负责实现、验证和提出改进，但不得自行改变 C0–C4 或生产主线。

长期有效的 Skill、Contract、Evidence、Types、Tests 与架构结论必须进入 Repo 或 C0–C4；聊天上下文不是 Source of Truth。

# 10｜本版冻结

- D01–D05 是唯一生产主线；
- L0–L4 与 D01–D05 同轴；
- G0–G4 是各阶段出口审核；
- Discovery / Directed 仅是阶段内部策略；
- Research Workspace 不再作为独立世界；
- Developer / Agent Skills 永久分离；
- Skill 是否跨阶段后议，但阶段责任不可跨；
- 每阶段同时存在 Machine Gate 与 Human Review View；
- 最高验收仍然不是“历史知识更多”，而是用户是否因可信的人文理解重新看见今天。
