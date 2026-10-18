# 墨痕数据生产链 完整文件地图 V3.0（六阶段 · 到前端 UI 消费端）

> **任务**：`MH-STRAT-PROD-A002` —— 数据生产链全链标准体检 + 完整数据生成链文件地图梳理。
> **日期**：2026-10-18。
> **性质**：体检与梳理结果。§19 记录本次按 Owner 指令已执行的文件归位 / 归档 / 正式地图生成动作。
> **形式**：对照旧版《MoHen_Data_Production_System_Map.md》V2.1（架构迭代前旧五阶段）的形式，按六阶段新架构重写。
> **结论一句话**：新架构的完整标准文件**已全部编制完成**，但**一半以上还在交付包 `repo_target/` 里、没有落地到工作区**——入口文件（AGENTS/CURRENT/Protocol/DATA_CONTRACT）已改成新架构引用路径，被引用的"现行专业原文"却不在工作区，这就是 A001 两轮跑偏时"标准断链、标准不清晰"的真正根因。

---

# 0｜一张图（六阶段全链 → 前端消费端）

```text
外部资料 / 新文化线索 / 当代反馈
        ↓
D00 来源准备          L0  source.*            G0  Source Gate
        ↓
D01 载体读取 C        L1  reading_unit        G1  Carrier Quality Gate
        ↓
D02 材料理解 H        L2  material_observation G2  Evidence Quality Gate
        ↓
D03 世界构建 W        L3  world_claim_revision G3  World Integrity Gate
        ↓
D04 人文发现 A        L4  humanistic_finding   G4  Interpretation Gate
        ↓
D05 可信发布 P        L5  read_model.*         G5  Runtime Eligibility Gate
        ↓
L6  Experience Runtime  ──→  视觉舞台 + 墨痕 Agent（前端双组件）
        ↓
L7  Participation（参与/反馈，不自动成文化资料）
        ↓
L8  Living Culture New Traces（有 consent/provenance 的文化新痕迹）
        └────────────────────→ D00（受治理回流）
```

核心不变量：

```text
Dn Gate PASS Output = Dn+1 Legal Entry
L1读取 ≠ L2证据 ≠ L3事实 ≠ L4解释 ≠ L5可消费表达
前端只消费 G5 PASS 的 L5 合法分面；禁止直读 L0–L3
```

---

# 1｜体检结论（断链诊断）

## 1.1 三大任务状态回顾

| 任务 | 状态 | 说明 |
|---|---|---|
| ARCH-MIG-01 架构迭代迁移 | 验收成功（M0–M5） | 产出交付包 `repo_target/`（107 目标文件 + 251 行覆盖台账） |
| 数据生产作业样板试验 | 验收成功（SAMPLE-TRIAL-01~16） | 金泽最小切片，六阶段真实闭环、真实 G5、vercel 上线 |
| 首轮战略驱动真实生产（A001 绿之丘） | **两次跑偏，未达 UI 认可** | 报告诊断出"标准断链 + 前端消费断链" |

## 1.2 断链的根因（一个，不是两个）

新架构标准文件**不是"缺失"，而是"没落地"**。交付包 `repo_target/` 已完整编制：

```text
MoHen_CodeBuddy_ARCH-MIG-01_V1.0_20261016/
└── MoHen_CodeBuddy_ARCH-MIG-01_V1.0_20261016/
    └── repo_target/                     ← 新架构完整目标文件（107 个）
        ├── specs/data-production/
        │   ├── standards/d00–d05/       ← 63 方法定义原文（23 个 md）★ 工作区缺
        │   ├── method-binding-contract.json  ★ 工作区缺
        │   ├── L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md  ★ 工作区缺
        │   ├── contracts/ENGINEERING_HANDOFF_CONTRACT.md  ★ 工作区缺
        │   └── ...（gates/configs/schemas/templates/relations）
        ├── governance/C0–C4（新版 V1.1/V1.1/V1.3/V1.4/V2.2）
        ├── verification/arch-mig-prep-01/TARGET_FILE_COVERAGE.csv  ★ 工作区缺
        └── tasks/implementation/ARCH-MIG-01/  ★ 工作区缺
```

工作区 `mohen-agent-2.0/` 只落地了**入口层 + 协议层 + 门合同层 + 宪法新版 + 执行代码**，但**"现行专业原文"这一层（standards + method-binding）整层没落地**。

## 1.3 断链清单（按严重度）

| # | 断链 | 引用处 | 现状 | 目标文件（交付包 repo_target） |
|---|---|---|---|---|
| 1 | `specs/data-production/standards/d00–d05/` 整目录缺失（63 方法定义原文） | AGENTS §1、DATA_CONTRACT §1、Protocol §0、OWNERSHIP_MAP §1 | 工作区无此目录 | `repo_target/specs/data-production/standards/`（23 md） |
| 2 | `method-binding-contract.json` 缺失（63 方法权威绑定清单） | Protocol §2、OWNERSHIP_MAP §1、立项任务书 §三 | 工作区无此文件 | `repo_target/specs/data-production/method-binding-contract.json` |
| 3 | `L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md` 缺失（新版消费/反馈） | AGENTS §1、OWNERSHIP_MAP §1 | 只有旧 `L4_L7_...` | `repo_target/specs/data-production/L5_L8_...` |
| 4 | `contracts/ENGINEERING_HANDOFF_CONTRACT.md` 缺失 | repo_target 独有目录 | 工作区无 `contracts/` | `repo_target/specs/data-production/contracts/` |
| 5 | `verification/arch-mig-prep-01/` 缺失（覆盖台账 + 场景合同） | AGENTS §1、Protocol §9 | 工作区无此目录 | `repo_target/verification/arch-mig-prep-01/` |
| 6 | 六阶段版 System_Map 未落地（工作区仍是旧五阶段 V2.1） | DATA_PRODUCTION_MAP | md/html 均为旧五阶段 | `repo_target/.../MoHen_Data_Production_System_Map.md` |
| 7 | `tasks/implementation/ARCH-MIG-01/` 缺失（文件改造责任合同） | Protocol §9、AGENTS §1 | 工作区 `tasks/implementation/` 为空 | `repo_target/tasks/implementation/ARCH-MIG-01/` |
| 8 | L5 六类无"视觉资产"分面；`world.visual_objects` 是 L3 表、无消费资格 | A001 报告 §4 | DATA_CONTRACT 固定六类不含视觉 | 待补（见 §11.2） |

> 断链 1–7 是**纯索引/落地断链**：文件都在交付包里，只需"按覆盖台账落地 + 校验"。断链 8 是**语义接口断链**：C4 要 V1–V5 视觉层，但 L5 六类里没有视觉分面的落点，需要补一份消费契约。

---

# 2｜总入口（权威路由表）

> 与 AGENTS §1 一致，标注工作区实际落地状态。

| 类别 | 唯一权威路径 | 工作区状态 |
|---|---|---|
| 当前状态 | `CURRENT.md` | ✅ 已落地（六阶段口径） |
| 机器路由 | `AGENTS.md` | ✅ 已落地 |
| 目录职责 | `OWNERSHIP_MAP.md` | ✅ 已落地 |
| C0 宪法 | `governance/C0_..._V1.1.md` | ✅ 已落地（旧 V1.0 在 archive） |
| C1 宪法 | `governance/C1_..._V1.1.md` | ✅ 已落地 |
| C2 宪法 | `governance/C2_..._V1.3.md` | ✅ 已落地 |
| C3 宪法 | `governance/C3_..._V1.4.md` | ✅ 已落地 |
| C4 宪法 | `governance/C4_..._V2.2.md` | ✅ 已落地（旧 V2.1 在 archive） |
| 唯一生产总协议 | `specs/data-production/MoHen_Data_Production_Protocol.md`（V5.0） | ✅ 已落地 |
| Data Contract | `specs/DATA_CONTRACT.md`（V3.0） | ✅ 已落地 |
| 现行专业原文 | `specs/data-production/standards/d00/`—`d05/` | ❌ **未落地**（在 repo_target） |
| 方法/执行绑定 | `production-registry.json` + `method-binding-contract.json` | ⚠️ registry 已落地，**method-binding 未落地** |
| 六门独立合同 | `gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md` + `gate-contracts.v3.json` | ✅ 已落地 |
| 消费/反馈 | `specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md` | ❌ **未落地**（旧 L4_L7 仍在） |
| Agent/体验边界 | `specs/AGENT_CONTRACT.md`、`specs/EXPERIENCE_CONTRACT.md` | ✅ 已落地 |
| 生产导航 | `specs/data-production/MoHen_Data_Production_System_Map.md/html` | ❌ **旧五阶段版**（新六阶段版未落地） |
| 逐文件覆盖台账 | `verification/arch-mig-prep-01/TARGET_FILE_COVERAGE.csv` | ❌ **未落地** |
| 未来迁移任务 | `tasks/implementation/ARCH-MIG-01/` | ❌ **未落地** |

---

# 3｜D00 · 来源准备（Source Preparation）

| 项 | 路径 / 内容 | 工作区状态 |
|---|---|---|
| Layer | L0 / `source.*` | ✅ 已运行 |
| Gate | G0 | ✅ 已落地 |
| 专业标准（原文） | `standards/d00/` 5 文件 | ❌ 未落地 |
| 方法 | 来源方法由 source standards 治理（不计入 63 方法） | — |
| Executor | `pipelines/data-production/executors/d00-source-intake.mjs` | ✅ 已落地 |
| Skill | `skills/mohen-source-intake/SKILL.md` | ✅ 已落地 |
| PASS View | `control.g0_pass_sources` | ✅ 已运行 |

standards/d00 应有的 5 个文件（在 repo_target）：

```text
主规_P0_D00机制总规_最终版.md
规范_P0_长期资源与获取方法维护_最终版.md
规范_P0.1_资源发现与获取方法体系_最终版.md
规范_P0.2_来源身份版本权利与依赖_最终版.md
契约_P0.3_新L0_G0与D01交接_最终版.md
```

下游承诺：

> 来源身份、溯源、locator、内容可获得性、权利（可研究/可引用/可展示/可下载）与使用边界明确。

---

# 4｜D01 · 载体读取 C（Carrier Reading）

| 项 | 路径 / 内容 | 工作区状态 |
|---|---|---|
| Layer | L1 / `reading_unit` | ⚠️ 表已建，`reading_units` 曾为 0（读图未落地） |
| Gate | G1 | ✅ 已落地 |
| 专业标准（原文） | `standards/d01/` 5 文件 | ❌ 未落地 |
| 方法 | C01–C08（8 个载体读取方法） | 定义在 repo_target |
| Executor | `pipelines/data-production/executors/d01-carrier-reading.mjs` | ✅ 已落地 |
| Skill | `skills/mohen-carrier-reading/SKILL.md` | ⚠️ PLANNED（未建；现有 mohen-source-intake 可适配） |

C01–C08 方法：

```text
C01 数字文本 · C02 扫描书影与影像PDF · C03 历史舆图与图形 · C04 照片版画与插图
C05 结构化数据 · C06 音频 · C07 视频 · C08 实物与现场采集
```

standards/d01 应有的 5 个文件：

```text
主规_P1_D01统一生命周期与质量画像治理.md
规范_P1_C01-C08载体与复合材料专业读取.md
契约_P1_新G1质量门与新旧迁移.md
契约_P1_新L1持久化与L2字段所有权.md
契约_P1_D01至D02可信交接.md
```

下游承诺：

> 只做技术读取，保留未读区域/错误/校准画像；原资产与读取修订不同身份。不把 OCR/图片标题/AI 补字当历史证据。**照片/舆图必须产出 reading_unit + Visual Observation，禁止标题识别替代读图。**

---

# 5｜D02 · 材料理解 H（Material Understanding）

| 项 | 路径 / 内容 | 工作区状态 |
|---|---|---|
| Layer | L2 / `material_observation` | ✅ 已运行 |
| Gate | G2 | ✅ 已落地 |
| 专业标准（原文） | `standards/d02/` 5 文件 | ❌ 未落地 |
| 方法 | H01–H25（25 个历史材料分类方法） | 定义在 repo_target |
| Executor | `pipelines/data-production/executors/d02-material-understanding.mjs` | ✅ 已落地 |
| Skill | `skills/mohen-material-understanding/SKILL.md` | ✅ 已落地 |

H01–H25 方法（历史材料专业分类）：

```text
H01 通史与断代史 · H02 编年与专题史 · H03 制度与政书 · H04 历史地理著作 · H05 地方志
H06 谱牒与传记 · H07 行政档案 · H08 民间文书 · H09 金石铭刻 · H10 经学与儒家经典
H11 诸子与思想著作 · H12 宗教与信仰文献 · H13 文学与私人著述 · H14 笔记游记与小说
H15 农业与生产文献 · H16 科学医学与技术文献 · H17 生活礼俗与艺术文献 · H18 历史舆图与图谱
H19 出土与特殊文献 · H20 目录类书与文献汇编 · H21 近现代报刊与期刊 · H22 口述史与访谈记录
H23 现代考古与田野调查报告 · H24 现代学术研究与遗产调查 · H25 历史摄影与纪实图像材料
```

standards/d02 应有的 5 个文件：

```text
主规_P2_D02统一文献理解与证据化观察机制.md
规范_P2_H01-H25历史材料专业分类与阅读方法.md
规范_P2_复合嵌套文献与转引依赖阅读.md
契约_P2_新G2独立资格与D02-D03交接.md
契约_P2_新L2证据化观察与L1关联持久化.md
```

下游承诺：

> 材料结构、声音、转引与观察保真；嵌套单元逐个定位；二手解释不伪装一手事实。

---

# 6｜D03 · 世界构建 W（World Construction）

| 项 | 路径 / 内容 | 工作区状态 |
|---|---|---|
| Layer | L3 / `world_claim_revision`（`world.*`） | ✅ 已运行 |
| Gate | G3 | ✅ 已落地 |
| 专业标准（原文） | `standards/d03/` 3 文件 | ❌ 未落地 |
| 方法 | W01–W10（10 个世界建构方法） | 定义在 repo_target |
| Executor | `pipelines/data-production/executors/d03-world-construction.mjs` | ✅ 已落地 |
| Skill | `skills/mohen-world-construction/SKILL.md` | ✅ 已落地 |
| Adapter | `pipelines/data-production/adapters/d03-world-construction.mjs`（`context.extractWorldClaim`） | ✅ 已落地 |

W01–W10 方法：

```text
W01 历史对象身份与连续性判定 · W02 历史时间与时序约束建构 · W03 历史空间与视觉对应核定
W04 历史事件与行动过程建构 · W05 历史关系与角色约束建构 · W06 历史状态变化与连续性建构
W07 世界事实主张与证据支持评定 · W08 来源谱系与独立见证评估 · W09 世界主张冲突与认识状态管理
W10 跨对象世界一致性与变更传播
```

核心对象（`world.*`）：

```text
Entity / Event / RelationClaim / Change / HistoricalSpaceClaim / VisualObject / Conflict
```

standards/d03 应有的 3 个文件：

```text
主规_P3_D03职责与研究边界.md
规范_P3_W01-W10历史世界建构专业方法.md
契约_P3_L3持久化_独立G3与D04交接.md
```

> 注意：`world.visual_objects` 在此层（L3），是**事实层视觉对象**；它要进前端舞台，须经 G3 七用途之一的合法消费资格 + 上游 G5，不能直接当"视觉资产"发布（见 §11.2）。

---

# 7｜D04 · 人文发现 A（Humanistic Discovery）

| 项 | 路径 / 内容 | 工作区状态 |
|---|---|---|
| Layer | L4 / `humanistic_finding_revision`（`meaning.*`） | ✅ 已运行 |
| Gate | G4 | ✅ 已落地 |
| 专业标准（原文） | `standards/d04/` 2 文件 | ❌ 未落地 |
| 方法 | A01–A12（12 个人文发现方法） | 定义在 repo_target |
| Executor | `pipelines/data-production/executors/d04-humanistic-discovery.mjs` | ✅ 已落地 |
| Skill | `skills/mohen-humanistic-discovery/SKILL.md` | ✅ 已落地 |
| Adapter | `adapters/d04-humanistic-discovery.mjs`（`context.extractHumanisticFinding`） | ✅ 已落地 |

A01–A12 方法：

```text
A01 显式关系｜关系解释 · A02 共现与跨源｜问题线索发现 · A03 时间序列｜节律解释
A04 空间拓扑｜场所结构解释 · A05 行动链｜行动者处境 · A06 制度机制｜规则执行机制
A07 跨模态共指｜载体表征差异 · A08 结构聚类｜网络结构解释 · A09 变化链｜历史生成与断裂
A10 冲突发现｜历史认识与争议模式 · A11 跨时空比较｜跨尺度历史比较 · A12 当下线索｜历史与当下联系
```

必须产生：

```text
human_question / interpretive_statement / understanding_delta / counter_view / missing_evidence / present_connection
```

standards/d04 应有的 2 个文件：

```text
主规_P4_A01-A12人文发现机制与专业方法.md
契约_P4_L4持久化_独立G4与D05交接.md
```

> 注意：这里的 A01–A12 是**人文发现方法**，与旧《宽进与广联协议》里的 A01–A12（关联候选生成算法）**编号相同、语义不同**，旧协议须归档（§18），不得与新方法混用。

---

# 8｜D05 · 可信发布 P（Trusted Publication）

| 项 | 路径 / 内容 | 工作区状态 |
|---|---|---|
| Layer | L5 / `read_model.*`（六类发布成果） | ✅ 已运行 |
| Gate | G5 | ✅ 已落地 |
| 专业标准（原文） | `standards/d05/` 3 文件 | ❌ 未落地 |
| 方法 | P01–P08（发布方法，P08 已完成） | 定义在 repo_target |
| Executor | `pipelines/data-production/executors/d05-read-model-publication.mjs` | ✅ 已落地 |
| Skill | `skills/mohen-read-model-publication/SKILL.md` | ✅ 已落地 |
| Adapter | `adapters/d05-read-model-publication.mjs`（`context.publishReadModels`） | ✅ 已落地 |

P01–P08 方法：

```text
P01 资格选入 · P02 世界投影 · P03 时空变换 · P04 有界解释组合 · P05 探索关系编排
P06 证据返还 · P07 消费分面 · P08 精准失效（已完成）
```

L5 六类发布成果（固定，不另成第七类）：

```text
world_projections / agent_contexts / story_seeds / discovery_paths
map_timeline_projections / evidence_pointers
```

standards/d05 应有的 3 个文件（注意仍为 V0.1 稿）：

```text
主规_P5_D05可信发布与双读模型_V0.1.md
规范_P5_P01-P08可信发布专业方法与双读消费_V0.1.md
契约_P5_L5持久化_独立G5与双读消费_V0.1.md
```

---

# 9｜六门 G0–G5 独立资格合同

正式规则（已落地）：

```text
specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md
specs/data-production/gates/gate-contracts.v3.json        ← 机器规则（唯一）
specs/data-production/configs/gate-contracts.json         ← 仅指向 v3，不复制第二套
```

六门独立核验项：

```text
G0  identity_version / raw_provenance / rights_by_operation / acquisition_scope / source_dependency
G1  source_authorization / carrier_profile_approved / reading_fidelity / coverage_and_missing / locator_replayable
G2  reading_authorization / material_type_method / source_voice / nested_dependency / evidence_scope / no_world_assertion
G3  evidence_authorization / identity_time_space / support_counterevidence / source_independence / epistemic_status / purpose_specific_extent
G4  world_authorization / fact_interpretation_firewall / understanding_delta / alternatives_counterview / present_basis_if_applicable / purpose_specific_extent
G5  upstream_authorization_by_action / revision_dependency_snapshot / rights_scope_consumer / purpose_mapping / lineage_replay / read_only_recomputable / time_current_at_consume
```

Gate 统一结构：

```text
Entry → Mandatory Checks → Machine Evidence → PASS / HOLD / REJECT / REVOKED / UNASSESSED
→ Reason Codes → Downstream Promise → Negative Examples
```

用途不可混同（关键红线）：

```text
G3 七用途：world.explain_bounded / show_original_region / map_anchor_link / map_registered_overlay
           / reconstruct_bounded / change_compare / relation_explain
G4 五用途：BE 有界解释 / BC 有界比较 / RF 有证关系焦点 / PS 有界过程序列 / PL 合格当下联系
G5 显式引用 upstream_purpose_refs + publication_action；未知映射 HOLD
```

---

# 10｜L5 六类发布成果 + 双读消费分面

## 10.1 六类物理承载（`read_model.*` 六表）

```text
world_projections        → 世界事实投影（只消费 L3/G3 事实）
agent_contexts           → Agent 上下文
story_seeds              → 故事种子
discovery_paths          → 探索路径
map_timeline_projections → 时空投影（历史/时间轴）
evidence_pointers        → 证据指针（返证链）
```

## 10.2 双读消费分面（G5 consumer）

```text
visual_stage 分面  → 视觉舞台消费
agent 分面         → 墨痕 Agent 消费
```

两个消费者共享同一内容身份/修订/事实/证据/限制，但许可按 `purpose/scope/consumer` 分别检查；图像展示权 ≠ Agent 复刻/下载权 ≠ 文字引用权。

---

# 11｜L6–L8 消费与反馈（前端 UI 消费端）

## 11.1 默认消费链

```text
L5 六类发布修订
   ↓ 按消费者资格
L6 Experience Runtime  →  视觉舞台 + 墨痕 Agent（前端双组件）
   ↓
L7 Participation（普通交互 telemetry 不自动成文化资料）
   ↓
L8 Living Culture New Traces（有 consent/provenance 的文化新痕迹）
   └→ 经 D00 受治理回流
```

Authority（新版）：

```text
specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md   ❌ 未落地（在 repo_target）
specs/AGENT_CONTRACT.md                                         ✅ 已落地
specs/EXPERIENCE_CONTRACT.md                                    ✅ 已落地
governance/C4_..._V2.2.md（视觉层 V1–V5 + 双组件体验）          ✅ 已落地
```

## 11.2 前端消费断链（A001 报告已指出，本体检确认）

C4 §16 要求视觉舞台按 **V1–V5 五层**展示视觉：

```text
V1 历史原件（舆图/方志图/绘画/档案）· V2 历史影像（老照片/明信片/旧摄影）
V3 今日现场（现代摄影）· V4 解释标注（克制线框/热点）· V5 重建想象（AI/人工重建）
```

但 L5 六类发布成果里**没有"视觉资产"分面**，`world.visual_objects` 属 L3。结果：

```text
舞台要从哪个 G5 资格、读哪张表拿到 V1–V5 → 物理契约上无落点
```

**修复方向（供 Owner 拍板，本次不执行）**：

1. DATA_CONTRACT 明确 `visual_objects` 的发布/消费分面（谁、在什么权利下展示）；
2. C4 §3.1 补"视觉资产走 visual 分面，V1–V5 按 §16 分级约束"；
3. 打通 D01 读图：对 image 载体产出 `reading_units` + Visual Observation，令照片从 Asset Pending 进关联池；
4. 视觉舞台改为真消费 `world.visual_objects`（经 G5 合法分面），不再靠冻结 JSON 清单。

## 11.3 前端消费端现状（已落地）

```text
apps/web/app/experience/jinze-water-net/   ← 金泽体验页（20 文件，视觉舞台 + 墨痕双组件）
apps/web/app/experience/lvzhiqiu/          ← 绿之丘体验页（A001 产出）
apps/web/app/api/mohen/ask/                ← Agent 追问 API
apps/web/app/api/mohen/materials/          ← 材料检索 API
apps/web/lib/mohen-agent/retrieve.ts       ← 统一 L5 读取服务
apps/web/lib/mohen-visual/                 ← 视觉语法 / 空间画布 / 标签布局
packages/agent-runtime/src/                ← evidence-on-demand / read-model-client / understand / select
packages/experience-engine/src/            ← experience-runtime / composition-recipes / surface-eligibility / participation-feedback
packages/data-access/src/                  ← read-model-repository / node-pg-client（消费 node pg 双后端）/ lineage-read / invalidation
```

消费边界（铁律）：

```text
Agent/UI → G5 PASS L5 → L6
禁止 Agent/UI 默认直读 L0/L1/L2/L3
统一 L5 读取服务接 ask/materials API；禁止一条路径受 G5、另一条靠旧 status/静态 JSON 绕过
Evidence on Demand 沿真实依赖只读返证：L5 refs → L4(如有解释)/L3 → L2 → L1 → L0
```

---

# 12｜物理数据（42 表）

| 语义层 | PostgreSQL Schema | 说明 |
|---|---|---|
| L0 | `source` | 来源资产/版本/权利 |
| L1 | `evidence`（`reading_units` 等） | 载体读取单元 |
| L2 | `evidence`（`material_observation` 等） | 材料观察 |
| L3 | `world` | 世界事实/视觉对象/冲突 |
| L4 | `meaning` | 人文发现/解释 |
| L5 | `read_model` | 六类发布成果 |
| Control | `control` | 生产 run、独立 Gate 追加审计、失效事件 |

42 表 = 表级迁移 36 表 + 字段级改库补 6 表（L2 四实体 + L3 `world_decision_events` + control `invalidation_events`）。

文件：

```text
specs/data-production/PHYSICAL_DATA_MODEL_V2.md        ✅ 已落地（目标态，真实列/绑定 TO_VERIFY_IN_M0）
specs/data-production/PERSISTENCE_BINDING_CONTRACT.md  ✅ 已落地
supabase/migrations/                                    ✅ 已落地
supabase/rollback/                                      ✅ 已落地
```

---

# 13｜唯一执行入口

```text
pipelines/data-production/run.mjs
```

结构（已落地）：

```text
run → orchestrator → D00–D05 executors → adapters → reporting
```

六阶段执行器（已落地）：

```text
executors/d00-source-intake.mjs
executors/d01-carrier-reading.mjs
executors/d02-material-understanding.mjs
executors/d03-world-construction.mjs
executors/d04-humanistic-discovery.mjs
executors/d05-read-model-publication.mjs
```

Adapters（已落地）：

```text
adapters/adapter-contract.mjs
adapters/d03-world-construction.mjs
adapters/d04-humanistic-discovery.mjs
adapters/d05-read-model-publication.mjs
adapters/layer1-adapters.mjs
adapters/persistence-contract.mjs
adapters/topic-a001.mjs        ← A001 主题适配层
```

---

# 14｜验证入口

```text
tests/data-production/            ← D00–D05
tests/experience/                 ← L5–L7
tests/end-to-end/                 ← 全链 E2E
scripts/guards/                   ← 运行时数据边界 / 跨层写边界 / 阶段交接 / 门禁强制
verification/data-production-runs/ ← 真实 run 证据（40 json）
verification/sql/                 ← SQL 校验
```

---

# 15｜机器最短阅读路径

## 数据生产任务

```text
CURRENT → AGENTS → C2/C3 → Protocol → DATA_CONTRACT
→ standards/d00–d05（63 方法原文，★须先落地）
→ method-binding-contract.json（方法绑定，★须先落地）
→ 当前 Gate（gates V3）
→ 当前 Executor（pipelines）
```

## Agent / Experience（前端消费）

```text
CURRENT → C4 → AGENT_CONTRACT → EXPERIENCE_CONTRACT
→ L5_L8_CONSUMPTION_FEEDBACK_CONTRACT（★须先落地）
→ packages/data-access（read-model 双后端）
```

## DB Migration

```text
C3 → DATA_CONTRACT → PHYSICAL_DATA_MODEL → PERSISTENCE_BINDING → supabase/migrations → verification/sql
```

---

# 16｜断链修复落地清单（本次不执行，供后续单独授权）

按覆盖台账 `verification/arch-mig-prep-01/TARGET_FILE_COVERAGE.csv` 从 `repo_target/` 落地到工作区，共 7 项：

| 步 | 落地内容 | 目标路径 |
|---|---|---|
| 1 | 23 个方法定义原文 | `specs/data-production/standards/d00/`—`d05/` |
| 2 | 63 方法绑定清单 | `specs/data-production/method-binding-contract.json` |
| 3 | 新版消费/反馈合同 | `specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md` |
| 4 | 工程交接合同 | `specs/data-production/contracts/ENGINEERING_HANDOFF_CONTRACT.md` |
| 5 | 覆盖台账 + 场景合同 | `verification/arch-mig-prep-01/` |
| 6 | 六阶段版导航（本文件可作基础） | `specs/data-production/MoHen_Data_Production_System_Map.md/html` |
| 7 | 文件改造责任合同 | `tasks/implementation/ARCH-MIG-01/` |

---

# 17｜关于"新架构地图能否直接利用"

- 交付包 `repo_target/specs/data-production/MoHen_Data_Production_System_Map.md` 是**简化导航**（仅 20 行：六阶段表 + 一句方法计数 + 一句导航链），**不含**旧版形式的"一张图 + 逐阶段下游承诺 + 六门 + L5–L8 + 物理数据 + 执行/验证入口 + 最短阅读路径"。
- 因此**不能直接作为旧版形式的完整地图使用**；本文件（§0–§16）即按旧版形式补齐的六阶段完整地图。

---

# 18｜归档清单（待 Owner 确认后执行，本次不执行）

## 18.1 归档原则

- 旧代际文件归档至 `specs/archive/`、`governance/archive/`、`skills/archive/`（已有这些目录）；
- 归档 ≠ 删除，保留原字节与替代关系登记（`REPLACEMENT_MAP`）；
- 归档后不得继续作为 active 语义执行。

## 18.2 已在归档位（无需再动）

| 文件 | 归档位 | 替代 |
|---|---|---|
| 旧宪法 C0 V1.0 / C1 V1.0 / C2 V1.1/V1.2 / C3 V1.2/V1.3 / C4 V2.1（md+docx） | `governance/archive/` | 新版 V1.1/V1.1/V1.3/V1.4/V2.2 |
| 旧 Skill：mohen-association-discovery / data-ingest / evidence-gate / humanistic-selection / knowledge-weave / research-intake | `skills/archive/` | 六阶段 Skill |

## 18.3 待归档（尚散落在 specs/data-production 顶层与 gates，需 Owner 确认后移动）

| # | 文件 | 替代 | 依据 |
|---|---|---|---|
| 1 | `specs/data-production/L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md` | `L5_L8_...`（待落地） | CSV 行 146 |
| 2 | `specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md` | `G0-G5_..._V3.0.md` | CSV 行 159 |
| 3 | `specs/data-production/gates/gate-contracts.v2.json` | `gate-contracts.v3.json` | CSV 行 161 |
| 4 | `specs/data-production/墨痕_数据生产机制_宽进与广联详细协议_V1.0.md` | 六阶段 standards + 六门 V3 | CSV 行 214 |
| 5 | `specs/data-production/T03_金泽材料盘点_覆盖矩阵.md` | 样板试验结果档案 | CSV 行 153 |
| 6 | `specs/data-production/T06_无人值守派工与缺口映射.md` | 样板试验结果档案 | CSV 行 154 |
| 7 | `specs/data-production/T07_无人值守作业最小Contract.md` | 样板试验结果档案 | CSV 行 155 |
| 8 | `specs/data-production/MoHen_Data_Production_System_Map.md`（旧五阶段 V2.1） | 六阶段版（本文件 §0–§16） | 本体检 |
| 9 | `specs/data-production/MoHen_Data_Production_System_Map.html`（旧五阶段） | 六阶段版 html | 本体检 |

## 18.4 待 Owner 拍板的边界项（归档/保留二选一）

| 文件 | 疑问 |
|---|---|
| `specs/data-production/configs/gate-contracts.json` | 指向 v2 还是 v3？若指向 v2 须改指 v3 |
| `specs/data-production/pipeline-internal-flows.md` | 新旧待核 |
| `specs/data-production/Human_Review_Deliverable_Contract.md` | 新旧待核 |
| `specs/data-production/naming-map.json` / `identifier-registry.json` / `acquisition-intents.json` / `source-providers.json` | 是否仍 active config |

---

---

# 19｜执行结果（2026-10-18 收口，Owner 已确认执行）

> 本体检报告已按 Owner 指令执行"文件归位 + 归档 + 正式地图生成"，动作与落盘如下。

## 19.1 断链修复落地（从交付包 repo_target 复制到工作区）

| # | 落地内容 | 状态 |
|---|---|---|
| 1 | `specs/data-production/standards/d00–d05/`（63 方法定义原文，23 md） | ✅ 已落地 |
| 2 | `specs/data-production/method-binding-contract.json` | ✅ 已落地 |
| 3 | `specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md` | ✅ 已落地 |
| 4 | `specs/data-production/contracts/ENGINEERING_HANDOFF_CONTRACT.md` | ✅ 已落地 |
| 5 | `specs/data-production/schemas/` 补 3 个（artifact-envelope / method-route-decisions / qualification） | ✅ 已落地 |
| 6 | `specs/data-production/templates/` 补 D00 模板 2 个 | ✅ 已落地 |
| 7 | `verification/arch-mig-prep-01/`（TARGET_FILE_COVERAGE.csv 等 7 文件） | ✅ 已落地 |
| 8 | `tasks/implementation/ARCH-MIG-01/`（11 个实施合同） | ✅ 已落地 |
| 9 | `skills/mohen-carrier-reading/`（D01/C 新 skill） | ✅ 已落地 |
| 10 | `data/fixtures/source-acquisition/`（资产_P0 资源与获取方法主库 xlsx） | ✅ 已落地 |

## 19.2 以交付包版本覆盖（§18.4 边界项中交付包有的）

| 文件 | 处理 |
|---|---|
| `configs/gate-contracts.json` | 已用交付包版本覆盖（指向 v3） |
| `pipeline-internal-flows.md` | 已用交付包版本覆盖 |
| `Human_Review_Deliverable_Contract.md` | 已用交付包版本覆盖 |
| `naming-map.json` | 已用交付包版本覆盖 |
| `identifier-registry.json` | 已用交付包版本覆盖 |

## 19.3 旧标准归档（移入 `specs/archive/data-production/`）

| # | 文件 | 替代 |
|---|---|---|
| 1 | `L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md` | `L5_L8_...`（已落地） |
| 2 | `gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md` | `G0-G5_..._V3.0.md` |
| 3 | `gates/gate-contracts.v2.json` | `gate-contracts.v3.json` |
| 4 | `墨痕_数据生产机制_宽进与广联详细协议_V1.0.md` | 六阶段 standards + 六门 V3 |
| 5 | `T03_金泽材料盘点_覆盖矩阵.md` | 样板试验结果档案 |
| 6 | `T06_无人值守派工与缺口映射.md` | 样板试验结果档案 |
| 7 | `T07_无人值守作业最小Contract.md` | 样板试验结果档案 |
| 8 | `MoHen_Data_Production_System_Map.md`（旧五阶段 V2.1） | 新六阶段 V3.0 |
| 9 | `MoHen_Data_Production_System_Map.html`（旧五阶段） | 新六阶段 html（已生成） |
| 10 | `relations/BR-M1图谱_..._V1.2.html`（工作区独有） | 交付包 `relations/` 版本 |

## 19.4 正式地图（md + html 同源）

- 已生成 `specs/data-production/MoHen_Data_Production_System_Map.md`（六阶段 V3.0，去掉体检记录，仅保留文件地图逻辑，覆盖 D00–D05 / 六门 / L5–L8 / 前端消费端 / 物理数据 / 执行与验证入口 / 最短阅读路径）。
- 已生成 `specs/data-production/MoHen_Data_Production_System_Map.html`（与 md 同源同内容，侧栏导航 + 14 节，替换旧五阶段 html）。

## 19.5 纠正：acquisition-intents.json / source-providers.json 应为保留（KEEP）

- 核对交付包 `TARGET_FILE_COVERAGE.csv`：这两份 json 的动作均为 `KEEP_VERIFY_REFERENCES_AND_VERSION`（保留并核实引用/版本），**不是归档**。
- 已把这两份 json 从 `specs/archive/data-production/` 移回 `specs/data-production/` 原位置。
- 因此 `packages/data-access/src/acquisition-gate.mjs`（读 `acquisition-intents.json`）、`source-gate.mjs`（读 `data/fixtures/source-providers.json`）、`scripts/check-acquisition-intents.mjs`、`scripts/check-source-gate.mjs` 的引用均保持有效，无需改代码。

## 19.6 代码改造（文件指引按新地图对齐）

| 文件 | 改动 |
|---|---|
| `scripts/guards/check-e2e-contract-completeness.mjs` | ① `L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md` → `L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md`；② required 清单补充 `method-binding-contract.json`、`gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md`、`gate-contracts.v3.json` |

- 验证：`node scripts/guards/check-e2e-contract-completeness.mjs` 输出 `E2E_CONTRACT_COMPLETENESS_OK files=19`。
- 其余引用（`source-gate.mjs` / `acquisition-gate.mjs` / `check-acquisition-intents.mjs` / `check-source-gate.mjs` / `physical-model.test.mjs`）经全仓搜索核实：要么引用的是仍有效的 `data/fixtures/source-providers.json` 与已移回的 `acquisition-intents.json`，要么是测试逻辑（`physical-model.test.mjs` 验证旧 G0-G4 PASS 视图退役，非文件路径指引），均无需改。

## 19.7 遗留（后续批次处理，不在本次范围）

- 前端消费断链（§11.2）：L5 六类无"视觉资产"分面、`world.visual_objects` 无消费资格契约，待 Owner 拍板后补标准 + 打通 D01 读图。

---

> **本报告到此结束。** 上述执行动作已全部完成并落盘；§18 归档清单与 §19 执行结果均为历史记录。当前活动入口以 `specs/data-production/MoHen_Data_Production_System_Map.md`（V3.0）为准。
