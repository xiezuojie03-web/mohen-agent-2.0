# 墨痕数据生产体系地图 V3.0（六阶段 · 到前端 UI 消费端）

**用途：长期生产体系导航 / 人机共同入口。**
**不包含执行过程记录。**

# 0｜一张图

```text
外部资料 / 新文化线索 / 当代反馈
        ↓
D00 来源准备          L0  source.*             G0  Source Gate
        ↓
D01 载体读取 C        L1  reading_unit         G1  Carrier Quality Gate
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

Evidence on Demand（按需返证，只读）：

```text
L5 发布 refs
→ L4 humanistic_finding（如有解释）
→ L3 world_claim
→ L2 material_observation
→ L1 reading_unit
→ L0 source
```

核心：

```text
Dn Gate PASS Output = Dn+1 Legal Entry
L1读取 ≠ L2证据 ≠ L3事实 ≠ L4解释 ≠ L5可消费表达
前端只消费 G5 PASS 的 L5 合法分面；禁止直读 L0–L3
```

# 1｜总入口

| 类别 | 路径 |
|---|---|
| 当前状态 | `CURRENT.md` |
| 机器路由 | `AGENTS.md` |
| 目录职责 | `OWNERSHIP_MAP.md` |
| C0–C4 | `governance/` |
| 主协议 | `specs/data-production/MoHen_Data_Production_Protocol.md` |
| Data Contract | `specs/DATA_CONTRACT.md` |
| 现行专业原文 | `specs/data-production/standards/d00/`—`d05/`（逐文件见 `verification/arch-mig-prep-01/TARGET_FILE_COVERAGE.csv`） |
| 方法/执行绑定 | `specs/data-production/production-registry.json` + `method-binding-contract.json` |
| 六门独立合同 | `specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md` + `gate-contracts.v3.json` |
| 消费/反馈 | `specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md` |
| Agent/体验边界 | `specs/AGENT_CONTRACT.md`、`specs/EXPERIENCE_CONTRACT.md` |
| 物理模型 | `specs/data-production/PHYSICAL_DATA_MODEL_V2.md`、`PERSISTENCE_BINDING_CONTRACT.md` |
| 执行体 | `pipelines/data-production/` |
| Runtime | `packages/agent-runtime/`、`packages/experience-engine/`、`packages/data-access/` |
| Migration / Rollback | `supabase/migrations/`、`supabase/rollback/` |
| Tests / Verification | `tests/`、`verification/` |

# 2｜D00 · 来源准备（Source Preparation）

| 项 | 路径 / 内容 |
|---|---|
| Layer | L0 / `source.*` |
| Gate | G0 |
| 专业标准 | `standards/d00/`（主规 P0 + 规范 P0/P0.1/P0.2 + 契约 P0.3） |
| Skill | `skills/mohen-source-intake/SKILL.md` |
| Executor | `pipelines/data-production/executors/d00-source-intake.mjs` |
| PASS View | `control.g0_pass_sources` |

standards/d00 文件：

```text
主规_P0_D00机制总规_最终版.md
规范_P0_长期资源与获取方法维护_最终版.md
规范_P0.1_资源发现与获取方法体系_最终版.md
规范_P0.2_来源身份版本权利与依赖_最终版.md
契约_P0.3_新L0_G0与D01交接_最终版.md
```

下游承诺：

> 来源身份、溯源、locator、内容可获得性、权利（可研究/可引用/可展示/可下载）与使用边界明确。

# 3｜D01 · 载体读取 C（Carrier Reading）

| 项 | 路径 / 内容 |
|---|---|
| Layer | L1 / `reading_unit` |
| Gate | G1 |
| 专业标准 | `standards/d01/` |
| 方法 | C01–C08（8 个载体读取方法） |
| Skill | `skills/mohen-carrier-reading/SKILL.md` |
| Executor | `pipelines/data-production/executors/d01-carrier-reading.mjs` |
| PASS View | `control.g1_pass_reading_units` |

方法：

```text
C01 数字文本 · C02 扫描书影与影像PDF · C03 历史舆图与图形 · C04 照片版画与插图
C05 结构化数据 · C06 音频 · C07 视频 · C08 实物与现场采集
```

standards/d01 文件：

```text
主规_P1_D01统一生命周期与质量画像治理.md
规范_P1_C01-C08载体与复合材料专业读取.md
契约_P1_新G1质量门与新旧迁移.md
契约_P1_新L1持久化与L2字段所有权.md
契约_P1_D01至D02可信交接.md
```

下游承诺：

> 只做技术读取，保留未读区域/错误/校准画像；原资产与读取修订不同身份。不把 OCR/图片标题/AI 补字当历史证据。照片/舆图必须产出 reading_unit + Visual Observation，禁止标题识别替代读图。

# 4｜D02 · 材料理解 H（Material Understanding）

| 项 | 路径 / 内容 |
|---|---|
| Layer | L2 / `material_observation` |
| Gate | G2 |
| 专业标准 | `standards/d02/` |
| 方法 | H01–H25（25 个历史材料分类方法） |
| Skill | `skills/mohen-material-understanding/SKILL.md` |
| Executor | `pipelines/data-production/executors/d02-material-understanding.mjs` |
| PASS View | `control.g2_pass_material_observations` |

方法：

```text
H01 通史与断代史 · H02 编年与专题史 · H03 制度与政书 · H04 历史地理著作 · H05 地方志
H06 谱牒与传记 · H07 行政档案 · H08 民间文书 · H09 金石铭刻 · H10 经学与儒家经典
H11 诸子与思想著作 · H12 宗教与信仰文献 · H13 文学与私人著述 · H14 笔记游记与小说
H15 农业与生产文献 · H16 科学医学与技术文献 · H17 生活礼俗与艺术文献 · H18 历史舆图与图谱
H19 出土与特殊文献 · H20 目录类书与文献汇编 · H21 近现代报刊与期刊 · H22 口述史与访谈记录
H23 现代考古与田野调查报告 · H24 现代学术研究与遗产调查 · H25 历史摄影与纪实图像材料
```

standards/d02 文件：

```text
主规_P2_D02统一文献理解与证据化观察机制.md
规范_P2_H01-H25历史材料专业分类与阅读方法.md
规范_P2_复合嵌套文献与转引依赖阅读.md
契约_P2_新G2独立资格与D02-D03交接.md
契约_P2_新L2证据化观察与L1关联持久化.md
```

下游承诺：

> 材料结构、声音、转引与观察保真；嵌套单元逐个定位；二手解释不伪装一手事实。

# 5｜D03 · 世界构建 W（World Construction）

| 项 | 路径 / 内容 |
|---|---|
| Layer | L3 / `world_claim_revision`（`world.*`） |
| Gate | G3 |
| 专业标准 | `standards/d03/` |
| 方法 | W01–W10（10 个世界建构方法） |
| Skill | `skills/mohen-world-construction/SKILL.md` |
| Executor | `pipelines/data-production/executors/d03-world-construction.mjs` |
| Adapter | `pipelines/data-production/adapters/d03-world-construction.mjs`（`context.extractWorldClaim`） |
| PASS View | `control.g3_pass_world_claims` |

方法：

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

standards/d03 文件：

```text
主规_P3_D03职责与研究边界.md
规范_P3_W01-W10历史世界建构专业方法.md
契约_P3_L3持久化_独立G3与D04交接.md
```

# 6｜D04 · 人文发现 A（Humanistic Discovery）

| 项 | 路径 / 内容 |
|---|---|
| Layer | L4 / `humanistic_finding_revision`（`meaning.*`） |
| Gate | G4 |
| 专业标准 | `standards/d04/` |
| 方法 | A01–A12（12 个人文发现方法） |
| Skill | `skills/mohen-humanistic-discovery/SKILL.md` |
| Executor | `pipelines/data-production/executors/d04-humanistic-discovery.mjs` |
| Adapter | `adapters/d04-humanistic-discovery.mjs`（`context.extractHumanisticFinding`） |
| PASS View | `control.g4_pass_findings` |

方法：

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

standards/d04 文件：

```text
主规_P4_A01-A12人文发现机制与专业方法.md
契约_P4_L4持久化_独立G4与D05交接.md
```

# 7｜D05 · 可信发布 P（Trusted Publication）

| 项 | 路径 / 内容 |
|---|---|
| Layer | L5 / `read_model.*`（六类发布成果） |
| Gate | G5 |
| 专业标准 | `standards/d05/` |
| 方法 | P01–P08（P08 精准失效已完成） |
| Skill | `skills/mohen-read-model-publication/SKILL.md` |
| Executor | `pipelines/data-production/executors/d05-read-model-publication.mjs` |
| Adapter | `adapters/d05-read-model-publication.mjs`（`context.publishReadModels`） |
| PASS View | `control.g5_pass_read_models` |

方法：

```text
P01 资格选入 · P02 世界投影 · P03 时空变换 · P04 有界解释组合 · P05 探索关系编排
P06 证据返还 · P07 消费分面 · P08 精准失效（已完成）
```

L5 六类发布成果（固定，不另成第七类）：

```text
world_projections / agent_contexts / story_seeds / discovery_paths
map_timeline_projections / evidence_pointers
```

standards/d05 文件（V0.1）：

```text
主规_P5_D05可信发布与双读模型_V0.1.md
规范_P5_P01-P08可信发布专业方法与双读消费_V0.1.md
契约_P5_L5持久化_独立G5与双读消费_V0.1.md
```

# 8｜六门 G0–G5 独立资格合同

正式规则：

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

用途不可混同：

```text
G3 七用途：world.explain_bounded / show_original_region / map_anchor_link / map_registered_overlay
           / reconstruct_bounded / change_compare / relation_explain
G4 五用途：BE 有界解释 / BC 有界比较 / RF 有证关系焦点 / PS 有界过程序列 / PL 合格当下联系
G5 显式引用 upstream_purpose_refs + publication_action；未知映射 HOLD
```

# 9｜L5 六类发布成果 + 双读消费分面

## 9.1 六类物理承载（`read_model.*` 六表）

```text
world_projections        → 世界事实投影（只消费 L3/G3 事实）
agent_contexts           → Agent 上下文
story_seeds              → 故事种子
discovery_paths          → 探索路径
map_timeline_projections → 时空投影（历史/时间轴）
evidence_pointers        → 证据指针（返证链）
```

## 9.2 双读消费分面（G5 consumer）

```text
visual_stage 分面  → 视觉舞台消费
agent 分面         → 墨痕 Agent 消费
```

两个消费者共享同一内容身份/修订/事实/证据/限制，但许可按 `purpose/scope/consumer` 分别检查；图像展示权 ≠ Agent 复刻/下载权 ≠ 文字引用权。

# 10｜L6–L8 消费与反馈（前端 UI 消费端）

## 10.1 默认消费链

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

Authority：

```text
specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md
specs/AGENT_CONTRACT.md
specs/EXPERIENCE_CONTRACT.md
governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.2.md（视觉层 V1–V5 + 双组件体验）
```

## 10.2 视觉层 V1–V5（C4 §16）

```text
V1 历史原件（舆图/方志图/绘画/档案）· V2 历史影像（老照片/明信片/旧摄影）
V3 今日现场（现代摄影）· V4 解释标注（克制线框/热点）· V5 重建想象（AI/人工重建）
```

## 10.3 前端消费端实现

```text
apps/web/app/experience/jinze-water-net/   ← 金泽体验页（视觉舞台 + 墨痕双组件）
apps/web/app/experience/lvzhiqiu/          ← 绿之丘体验页
apps/web/app/api/mohen/ask/                ← Agent 追问 API
apps/web/app/api/mohen/materials/          ← 材料检索 API
apps/web/lib/mohen-agent/retrieve.ts       ← 统一 L5 读取服务
apps/web/lib/mohen-visual/                 ← 视觉语法 / 空间画布 / 标签布局
packages/agent-runtime/src/                ← evidence-on-demand / read-model-client / understand / select
packages/experience-engine/src/            ← experience-runtime / composition-recipes / surface-eligibility / participation-feedback
packages/data-access/src/                  ← read-model-repository / node-pg-client（消费 node pg 双后端）/ lineage-read / invalidation
```

消费边界：

```text
Agent/UI → G5 PASS L5 → L6
禁止 Agent/UI 默认直读 L0/L1/L2/L3
统一 L5 读取服务接 ask/materials API；禁止一条路径受 G5、另一条靠旧 status/静态 JSON 绕过
Evidence on Demand 沿真实依赖只读返证：L5 refs → L4(如有解释)/L3 → L2 → L1 → L0
```

# 11｜物理数据（42 表）

| 语义层 | PostgreSQL Schema |
|---|---|
| L0 | `source` |
| L1 | `evidence`（`reading_units` 等） |
| L2 | `evidence`（`material_observation` 等） |
| L3 | `world` |
| L4 | `meaning` |
| L5 | `read_model` |
| Control | `control` |

42 表 = 表级迁移 36 表 + 字段级改库补 6 表。

文件：

```text
specs/data-production/PHYSICAL_DATA_MODEL_V2.md
specs/data-production/PERSISTENCE_BINDING_CONTRACT.md
supabase/migrations/
supabase/rollback/
verification/sql/
```

# 12｜唯一执行入口

```text
pipelines/data-production/run.mjs
```

结构：

```text
run → orchestrator → D00–D05 executors → adapters → reporting
```

六阶段执行器：

```text
executors/d00-source-intake.mjs
executors/d01-carrier-reading.mjs
executors/d02-material-understanding.mjs
executors/d03-world-construction.mjs
executors/d04-humanistic-discovery.mjs
executors/d05-read-model-publication.mjs
```

Adapters：

```text
adapters/adapter-contract.mjs
adapters/d03-world-construction.mjs
adapters/d04-humanistic-discovery.mjs
adapters/d05-read-model-publication.mjs
adapters/layer1-adapters.mjs
adapters/persistence-contract.mjs
```

# 13｜验证入口

## D00–D05

```text
tests/data-production/
```

## L5–L7

```text
tests/experience/
```

## 全链 E2E

```text
tests/end-to-end/
```

## Guards

```text
scripts/guards/
```

## 场景验收合同

```text
verification/arch-mig-prep-01/acceptance/scenario-contracts.csv
```

## 真实 run 证据

```text
verification/data-production-runs/
```

# 14｜机器最短阅读路径

## 数据生产任务

```text
CURRENT → AGENTS → C2/C3 → Protocol → DATA_CONTRACT
→ standards/d00–d05（63 方法原文）
→ method-binding-contract.json（方法绑定）
→ 当前 Gate（gates V3）
→ 当前 Executor（pipelines）
```

## Agent / Experience（前端消费）

```text
CURRENT → C4 → AGENT_CONTRACT → EXPERIENCE_CONTRACT
→ L5_L8_CONSUMPTION_FEEDBACK_CONTRACT
→ packages/data-access（read-model 双后端）
```

## DB Migration

```text
C3 → DATA_CONTRACT → PHYSICAL_DATA_MODEL → PERSISTENCE_BINDING → supabase/migrations → verification/sql
```
