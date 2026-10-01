# 墨痕 Agent 2.0 — PHASE-GATE-01
## Phase I → Phase II Architecture Gate V1.0

**状态：APPROVED / FROZEN**  
**基线：TASK-0017 = PASS；HEAD = f74d0be**  
**阶段切换：Phase I — Agent Capability Foundation → Phase II — Humanistic Experience & World Expansion**

---

## 0. Gate 结论

Phase I 阶段性完成。当前已证明：

- Evidence-aware Humanistic World 的最小可信链路成立；
- Agent 能区分多类人文探索意图；
- 不同意图能产生不同 EvidenceDecision / ReplanPlan / ExperiencePatch / Surface；
- Patch-not-Replace 与 Persistent Experience 成立；
- Historical Space 与 Historical Geometry 已分离；
- Evidence Gate、时空权威、E1/E2/UNKNOWN 边界未被 UI 追问突破；
- Present Action 已能回到今天，但仍保持 proposal_not_routed。

因此，**Agent Runtime 不再作为默认主施工线继续扩张。**

Phase II 的中心问题改为：

> **用户能否在历史文化中发现与当下生活的连接，并通过墨痕的引导获得新的理解、乐趣、地方感、文化根源与人文共鸣？**

---

## 1. Phase II 北极星

### Vision

**从历史中理解当下，在当下重新发现历史。**

墨痕不是历史地图产品，也不是典籍问答、地方史数据库或聊天机器人。

时间、空间、地图、GIS、Evidence、知识图谱、Agent、Skill、图像和路线都是手段。

最终目标：

> **让可靠的历史文化知识转化为可以探索、可以感受、可以继续追问，并能重新影响今天生活方式与观看方式的人文体验。**

### Phase II 核心验收问题

任何新能力进入主干前，都必须回答：

1. 它是否帮助用户理解历史？
2. 它是否建立时间 / 空间 / 关系 / 比较中的至少一种真实认知联系？
3. 它是否最终能够回到“今天”？
4. 它是否产生新的观察、理解、兴趣、行动或共鸣？
5. 它是否保持 Evidence / Geometry / Uncertainty 的诚实性？

只满足“技术能跑”不构成 Phase II 产品完成。

---

## 2. 开发模型升级：受控并行

旧纪律：

> 研究可以并行，施工不要并行。

Phase II 更新为：

> **研究可以并行；边界清晰、契约冻结、Ownership 不重叠的施工可以并行。**
>
> **同一状态、同一资产、同一集成面、同一 worktree 不允许并行施工。**

并行的目的不是让更多 AI 同时改代码，而是让不同专业轨道在稳定契约下独立推进。

---

## 3. 四条正式 Track

### TRACK-E — Experience / Human Experience【主线】

**使命：** 把 Agent 已经具备的判断翻译成普通用户能感受到的世界变化。

负责：

- Experience Canvas
- Surface 表达
- Composition / Transition
- 时间、空间、图像、证据、叙事的主次切换
- Agent Ambient / Guide / Dialogue
- “一句话判断 + 世界变化”
- Evidence 的人话表达
- 过去 → 今天的体验闭环
- Human Experience Acceptance
- 视觉节奏、信息密度、动效原型

不负责：

- 修改 Evidence 判定规则
- 修改 DB schema
- 创建历史事实
- 提升 epistemic class
- 创建未经证据支持的历史 geometry
- 扩展 Agent Runtime ontology

**Phase II 默认主施工优先级：P0。**

---

### TRACK-W — World / Data / Evidence【副线】

**使命：** 让墨痕拥有越来越真实、可验证、可复用的人文世界。

负责：

- Source Registry
- SHL / 地方志 / 档案 / 典籍资料接入
- Evidence
- Entity / Event / Relation
- Temporal Assertions
- Visual Assets
- Story Seeds / Discovery Candidates
- 数据质量、冲突、来源、版权
- Human Review
- Experience-driven Data Expansion

原则：

> **不为了“数据库更大”而扩库。**
>
> 由 Experience 提出世界缺口，再扩数据。

不负责：

- UI
- Composition
- Agent Runtime
- 自行发布未经 Gate 的事实

**Phase II 默认优先级：P1，可与 Track-E 并行。**

---

### TRACK-S — Spatial / GIS / Historical Geometry【专业副线】

**使命：** 为 Experience 提供可信的历史空间能力。

负责：

- Historical Spatial Source
- Map Catalog
- Anchor / Local Grounding
- HistoricalFeature
- Historical Geometry Candidate
- Reconstruction
- Spatial Relations
- PostGIS / QGIS / GDAL / GeoPandas 工作流
- Geometry Evidence Gate
- Spatial Confidence
- Current ↔ Historical spatial distinction

原则：

> **Geometry itself is a Claim.**

无证据时允许 Relational Space / Approximate Area / Unknown，不强制绘制历史几何。

不负责：

- 为视觉效果伪造历史空间
- UI 主设计
- Agent 叙事判断

**Phase II 默认优先级：P2；以 Experience 缺口触发“小切片”，禁止大规模 GIS 支线。**

---

### TRACK-A — Agent / Runtime / Capability【稳定线】

**使命：** 维护 Phase I 已形成的能力骨架，只解决 Experience 明确提出的 Runtime 阻塞。

当前冻结基线：

User → Intent → EvidenceDecision → ReplanPlan → ExperiencePatch → Composition / Surface → Observe → Follow-up → Replan

负责：

- Runtime bug / regression
- 明确缺失的 intent / planning / tool capability
- Permission Gate
- Tool contract
- State machine
- Runtime test

不负责：

- 因“未来可能需要”继续堆能力
- UI 美化
- Data 扩库
- GIS 研究

**Phase II 默认优先级：P3 / ON DEMAND。**

---

## 4. Ownership Matrix

| 资产 / 模块 | E Experience | W World | S Spatial | A Agent |
|---|---:|---:|---:|---:|
| Experience UI / Surface | OWNER | READ | READ | CONTRACT |
| Composition / Transition | OWNER | READ | READ | CONTRACT |
| Experience fixtures | OWNER | PROVIDE | PROVIDE | CONTRACT |
| Evidence / Relations | READ | OWNER | PROVIDE | READ |
| Source / Provenance | READ | OWNER | PROVIDE | READ |
| Historical Geometry | CONSUME | EVIDENCE | OWNER | READ |
| Spatial confidence | CONSUME | EVIDENCE | OWNER | READ |
| Agent Runtime | CONSUME | READ | READ | OWNER |
| Replan contract | CONSUME | READ | READ | OWNER |
| DB schema / migration | NO WRITE | OWNER* | OWNER* | NO WRITE |

`*` DB 结构变更仍属于 Integration-sensitive 资产：任何 schema / migration 变更必须单独签发，W 与 S 不得同时改。

---

## 5. Git / Worktree / Session 并行规则

禁止多个执行器直接同时修改 `main`。

建议结构：

```text
mohen-agent-2.0/                 main / integration
mohen-agent-2.0-exp/             track/experience
mohen-agent-2.0-world/           track/world
mohen-agent-2.0-spatial/         track/spatial
mohen-agent-2.0-agent/           track/agent   （仅需要时创建）
```

每个施工 Task 必须：

1. 独立 branch；
2. 独立 worktree；
3. 独立新 Session；
4. 执行 Context Gate；
5. 执行 Session Gate；
6. 只读取 Task 指定依赖；
7. 不依赖 MEMORY.md；
8. 不越过 Ownership；
9. Result + tests + screenshots/data audit；
10. STOP；
11. 由总架构侧执行 Integration Gate；
12. 未签字不得 merge / 不得启动后续施工。

---

## 6. Contract Freeze

Phase II 并行施工期间，下列概念视为稳定公共契约，不允许各 Track 私自重定义：

- Evidence
- epistemic class
- Evidence Gate
- Historical Space ≠ Historical Geometry
- Geometry is a Claim
- ExperienceState
- CompositionState
- ExperiencePatch
- Patch-not-Replace
- Surface eligibility
- spatialAuthority
- temporalFocus
- actionStatus
- proposal_not_routed
- currentCoordsLoseHistoricalAuthority
- Persistent Experience
- Human Experience Gate

如确需改变，必须提交 **ADR / Contract Change Request**，先停相关并行施工，再统一升级。

---

## 7. Phase II 第一个 Experience Slice

### 核心问题

TASK-0017 已证明：

> 墨痕会因为用户问的问题不同而改变思考方式。

Phase II 第一个体验任务要证明：

> **用户不需要看到 Runtime 术语，也能感受到墨痕改变了思考方式。**

### 四种状态的体验翻译

A. `verify_historical_relation`

机器状态：
`relational_space / E2 / historical_lost / judgment`

用户体验目标：

> “现在还不能说它们历史上就有关系。”

关系线、空间权威、未知与已知通过画面变化表达；技术状态退到幕后。

B. `inspect_evidence`

机器状态：
`evidence_reveal / evidence_only / evidence`

用户体验目标：

> “我为什么这样判断？”

把依据与缺口像研究材料一样摊开；relationKey 等内部标识默认隐藏。

C. `explore_temporal_change`

机器状态：
`timeline / historical_lost / temporal`

用户体验目标：

> “它们没有沿着同一条时间线走到今天。”

时间成为主角；用户经历变化，而不是阅读数据图。

D. `propose_present_action`

机器状态：
`current_map / present_held / proposal_not_routed`

用户体验目标：

> **历史知识改变用户今天观看这个地方的方法。**

不是伪导航；而是 Evidence-aware 的现场观察建议。

---

## 8. Human Experience Gate V2

Phase II 开始后，正式采用双验收：

### RUNTIME_ACCEPTANCE

判断：

- 状态是否正确；
- Evidence 是否越权；
- Patch 是否正确；
- tests 是否通过；
- contract 是否保持。

### HUMAN_EXPERIENCE_ACCEPTANCE

判断：

- 用户是否无需理解内部术语就知道墨痕在表达什么；
- 用户是否感到时间 / 空间 / 关系发生了变化；
- 用户是否感到墨痕在引导探索，而不是展示系统状态；
- Evidence 是否清楚但不破坏沉浸；
- 不确定性是否被诚实而自然地表达；
- 是否形成“历史 → 今天”的连接；
- 是否让用户获得新的观察角度、文化理解、地方感、兴趣或共鸣；
- 去掉右侧 Inspector 后，墨痕是否仍然存在。

**最后一条为硬测试：**

> **If the inspector disappears, does Mohen still exist?**

如果答案是否，Human Experience Gate 不通过。

---

## 9. Integration Gate

任何并行 Track 合入 main 前检查：

### Contract
- 是否修改公共契约？
- 是否越过 Ownership？
- 是否引入第二套 Runtime / Surface / Evidence 体系？

### Evidence
- 是否产生未经支持的事实？
- 是否升级 epistemic class？
- 是否把现代坐标冒充历史几何？
- 是否隐藏关键不确定性？

### Experience
- 是否真正提升用户理解？
- 是否减少开发者式 Inspector 表达？
- 是否通过世界变化而非标签解释 Agent？
- 是否回到 Vision？

### Engineering
- branch / worktree clean；
- typecheck / relevant tests；
- E2E 或 fixture acceptance；
- 无意外 DB / Legacy write；
- merge conflict 已处理。

只有 Integration Gate = PASS 才能进入 main。

---

## 10. 多执行器策略

执行器按能力分工，不要求单一工具承担全部角色。

建议：

- **总架构侧**：Vision、Architecture、Task、Contract、Gate、Integration、验收；
- **WorkBuddy**：Repo 正式施工、TypeScript、Runtime、tests、数据 pipeline；
- **视觉/UI 执行器**：Experience 原型、布局、动效、视觉语言；优先使用 frozen fixtures；
- **研究执行器**：资料发现、SHL/地方志/典籍研究、Source Candidate；
- **GIS / Python 执行器**：配准、空间分析、矢量化、Geometry Candidate；
- **图像理解执行器**：历史图像识别、Visual Feature / Correspondence Candidate。

任何外部执行器的输出默认都是 **Candidate / Artifact**，不能绕过 Evidence Gate 或 Integration Gate 直接成为主干事实。

---

## 11. Phase II 初始并行节奏

第一轮不超过 3 条活跃轨道：

```text
TRACK-E  Experience Upgrade        ← 主施工
TRACK-W  Jinze World Expansion     ← 并行副施工
TRACK-S  Spatial Research Slice    ← 研究优先；有明确需求才施工
TRACK-A  Runtime                   ← 冻结 / 按需
```

禁止一开始同时开 5～6 个 AI 施工 Session。

### 推荐 Sprint 结构

```text
                 ┌─ EXP Task ───────┐
main baseline ───┼─ WORLD Task ─────┼─ Integration Gate ── main
                 └─ SPATIAL Study ──┘
```

Experience 可以使用 frozen fixtures，不等待 World 全部完成。

World 按 Experience 缺口扩展，不追求“大而全”。

Spatial 只解决当前 Experience 真正需要的历史空间问题。

---

## 12. Phase II 第一轮任务签发策略

TASK-0017 后不直接签发传统意义上的 `TASK-0018 Runtime`。

下一步拆成不同 Track 编号，避免再次形成一条无限增长的单线任务链。

建议命名：

- `EXP-0001 — Human Experience Translation Slice`
- `WORLD-0001 — Experience-driven Jinze World Expansion`
- `SPATIAL-R-0001 — Jinze Historical Spatial Evidence Research`

其中：

**EXP-0001 为 P0，先签发。**

WORLD-0001 可在 EXP-0001 的 fixture / data-gap contract 冻结后并行启动。

SPATIAL-R-0001 首轮为 Research-only，不直接修改生产 Geometry / DB。

Agent Runtime 暂不签新任务。

---

## 13. STOP / 下一动作

本 Gate 只冻结 Phase II 的组织方式、Ownership、公共契约与第一轮任务策略。

**不在本 Gate 内直接施工 UI、DB、GIS 或 Runtime。**

下一动作：

> 签发 `EXP-0001 — Human Experience Translation Slice V1.0`。

该任务首先使用 TASK-0017 已有四种稳定 Runtime 状态作为 frozen fixtures，把“开发者可读的 Replan”翻译为“普通用户可感知的墨痕探索”。

在 EXP-0001 的体验契约与 data-gap 输出形成后，再签发 WORLD-0001，并决定 SPATIAL-R-0001 的精确研究问题。
