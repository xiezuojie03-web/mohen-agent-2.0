# CURRENT.md

> **MoHen · Current Execution State** — 状态入口（非宪法），Authority 低于 C0–C4；Date: 2026-10-04。
> 回答"现在造什么 / 已证明什么 / 卡在哪 / 下一步"；与 C0–C4 冲突以 C0–C4 为准，工程事实由真实 Repo / Runtime / 数据校准。

------------------------------------------------------------------------

## 1. North Star

**从历史文化中重新发现当下生活的意义、乐趣、文化根源与个人共鸣。**（长期使命锚点；dev 不得改，详见 C1）

------------------------------------------------------------------------

## 2. 当前主线条与焦点（Current Horizon & Focus）

**H2 · Canonical Human Experience — CURRENT**（H2 不变；宪法级矛盾见 `C1` §19）

> **根本矛盾（结构性，不随阶段改）**：证据锚定的可信 Cultural World 与 Agent Runtime ↔ 普通用户可真实感知的 Human Experience 之间的转化落差。恒定原则：扩张服从 Evidence / Experience Gate，可信度不得被广度稀释（`C1` §19）。

**当前执行主线条 = 把数据底座建厚实**（`C0` §11 R18–R20）：数据生产优先、Human Experience Gate 顺延至底座达标；路径 = 先深透老项目（沪上经纬）一手文件/图片，再持续推进外部扩源（先证明老项目价值再规模化扩展，R19）。

**当前焦点**：把本地库 `mohen_dev` 的数据生产能力从"机制就位"走向"能力可复用、不再重复造脚本"，并据此持续产出可信一手数据。

------------------------------------------------------------------------

## 3. 数据生产能力（Skills 视角）

> Skill 定义见 `C2` §2 / §3.1 / §9.1（Developer Skills 造世界 / Agent Skills 在世界行动）；实体在 `skills/`。**下一步治理目标：能力实体化 + 消除重复脚本。**

**已成型能力（按 Skill / 机制）**：
- 双模式 Discovery / Directed（D01–D05 发现 / N01–N06 严证，共用控制面）— `C2` §1.5、主协议 §0.4/§12、`pipelines/research/`
- Evidence Gate G0–G6（写入必过硬门禁）— `pipelines/evidence/gates.mjs`、T07 §1.6
- Research Workspace / Observation Graph（8 张 research_* 表）— `scripts/check-research.mjs`
- N01–N06 桥接（Discovery 精选交回 Directed）— `pipelines/research/bridge-to-directed.mjs`
- Human Review 三分诊（仅 Selected / Truth / Narrative / Conflict 造 review_queue）— `scripts/check-review-triage.mjs`
- 视觉资产 / 1246 图处理 — `pipelines/visual/`、`scripts/audit-visual-assets.mjs`
- 坐标 / 空间锚定（旧库 + Wikidata；新坐标 candidate-only）— `pipelines/legacy/port-coords.mjs`
- 关系单一真源（`relation_claim`；`relations` 仅投影）— `decisions/ADR-002-cultural-world-claim-epistemic-model.md`
- 历史空间 / 家谱对齐（SHL SPARQL 双命名空间）— `pipelines/historical-spatial/`
- 守卫总线（14 条 `pnpm guard:*`，规则即强制）— `package.json`

**能力实体化缺口（下一步要治的根因）**：`skills/`（10 个纯 Markdown SOP）↔ `pipelines/`+`scripts/`（~110 个 .mjs）↔ `production-registry.json`（19 个 job）**三者无三向索引**——registry 无 `implementation` 字段，Skill 不指向实现脚本，故"每次数据生产重写脚本"。

**重复脚本（"重写脚本"现存样本，首批收敛对象）**：
- 根目录 15 个一次性 `_*.mjs` 探针（与 `tools/production/probe-*.mjs` 重复）
- `pipelines/historical-spatial/probe-align-{entities,extra,final}.mjs` 三胞胎
- `scripts/e2e-*-capture.mjs` ×5 共用同一脚手架
- 去重（查 / 清）双轨、evidence 恢复双轨

**治理落点**：为 `production-registry.json` 每个 job 增 `implementation:{skill,entry}` 三向绑定 + 守卫查重；`skills/` 升级为带 `entry/commands/contract_ref` 的实体；收敛根目录 `_*.mjs` 等重复样本。

------------------------------------------------------------------------

## 4. Proven Baseline（已证明 · 数据生产为主）

已成立、不应无故重做（须真实 Repo / 数据验证）：
- **数据生产**：双模式控制面、Evidence Gate G0–G6、Research Workspace、production-registry 19 job、守卫总线、主协议 V3.0 + 宽进广联 V1.0 + T07 最小契约；
- **底座**：Greenfield Repo + PostgreSQL Truth Store（本地 PG 5432 主库，R6）；Knowledge Weave / Cultural World 最小模型；Spatial Honesty；
- **体验 / runtime（已建成，暂缓优化）**：ExperienceState / Renderer / Persistent Experience；Evidence-aware Replan / Patch；金泽 Five-Beat / Canonical Experience Grammar（体验板已达最低 Human / Visual Baseline，见 §12）。

------------------------------------------------------------------------

## 5. Current Gaps / Gates（数据缺口为主）

> 格式同 §9：ID + 状态 + 一句话 + 详情。

| ID | 状态 | 一句话 | 详情 |
|---|---|---|---|
| GAP-DATA | OPEN | 一手资料（家谱 / 地方志原文 / 历史图片）仍不足以支撑体验 | `tasks/DB-PRODUCTION-IMPROVEMENT-PLAN.md` |
| GAP-SKILL | OPEN | Skill 未实体化、无三向索引，脚本重复（见 §3） | `specs/data-production/production-registry.json` |
| GAP-REL | 待裁决 | `relations`(521) 与 `relation_claim`(8) 双存储（= ESC-02） | `tasks/results/DATA-PRODUCTION-MECHANISM-01-result.md` |

**体验 Gate（下游，顺延）**：GATE-HX HOLD / GATE-VISUAL PARTIAL / GATE-2ND HOLD / GATE-PART HOLD（详见 §12）。

------------------------------------------------------------------------

## 6. NOW / NEXT（当前施工纪律与下一步）

**NOW（数据纪律）**：
- 以真实本地库 / 真实数据为对象推进，不空转；
- 能力先落 Skill + registry 绑定，再写实现，避免新增重复脚本；
- 架构问题写入 §9，提交拥有者确认（`C0` §11 R13）；
- 严守 Evidence Gate：未声明 `auto_promote_policy` 不晋级（R15）。

**NEXT（顺序）**：深透老项目一手文件/图片 → 证据验收 / 门禁全绿、证明老项目价值（R19 闸门）→ 规模化外部扩源（多来源 / 多类型 / 持续扩展，把底座做厚）→ 底座达标后再启动 Human Experience Gate 验收。

------------------------------------------------------------------------

## 7. 数据生产进度（任务书指针）

> 唯一进展载体见任务书 `tasks/DB-PRODUCTION-IMPROVEMENT-PLAN.md`（本文件只留指针）。Research Production 子线决断见 `C0` §11 R16 / §9 ESC-06；执行细则见主协议 V3.0 §12.2 与 `production-registry.json`。H2 不变：不以数据量 / Published 数为进度指标。
> **下一步主线 · 能力治理**（把数据生产沉淀成可复用 Skill、消除重复脚本，为外部扩源修机器）：见任务书 `tasks/TASK-SKILL-20261004_数据生产Skill能力治理_Task-Book_V1.0.md`。

------------------------------------------------------------------------

## 8. HOLD

除非明确 Trigger，暂不启动：第二古镇 / 第二主题产品化；全量旧库迁移；大而全 Historical GIS / PostGIS；Vector / Graph DB 扩张；Generic Community / Feed / Like / Follow；Participation 正式体系；Living Culture 正式 Schema；商业化优化；新一轮高保真 Figma 主战场；**外部资源自动扩源**（须先证明老项目价值，R19）。

------------------------------------------------------------------------

## 9. Architecture Escalations

> 本节只登记「状态 + 指针」；证据 / 方案 / 处置进展一律在详情列指向的任务结果文件里。

当前：**6 项**（ESC-01…ESC-06）：待裁决 2 · 部分处置 2 · 已处置 2（RECON-02 已处置；1246 图解冻并入挖掘主线）。

| ID | 状态 | 一句话 | 详情 |
|---|---|---|---|
| ESC-01 | 已处置（RECON-02 选 A） | 概念名 ≠ 物理名固定成设计；映射进 `DATA_CONTRACT.md` + `guard:naming` | `tasks/results/RECON-02-constitution-vs-db-naming.md` |
| ESC-02 | 待裁决 | `relations`(521) 与 `cultural_relation_claims`(8) 双存储；原则见 C3，合并设计待你点头 | `tasks/results/DATA-PRODUCTION-MECHANISM-01-result.md` |
| ESC-03 | 待裁决 | `modern_location` 缺口与现代坐标落位；原则见 C3，建表现址待你点头 | `tasks/results/DATA-PRODUCTION-MECHANISM-01-result.md` |
| ESC-04 | 部分处置（解冻·处置中） | 1246 图冻结解除，并入老项目数据挖掘主线 | `tasks/results/DATA-PRODUCTION-MECHANISM-01-result.md` |
| ESC-05 | 部分处置（② 已完成；①③ 待裁决） | 测试写库已隔离；标签修正与其余失败项待裁决 | `tasks/results/TASK-RECON-20261003-result.md` |
| ESC-06 | 已处置（R-DP-01～05 全过） | Research Production Reconciliation：双模式 / Research Workspace / 双入口 / review 收窄 / 主协议升级 | `tasks/results/DATA-PRODUCTION-RECON-20261003-result.md` |

> **冻结已解除（拥有者 2026-10-04）**：原 1246 张夜跑图冻结取消，并入「老项目数据挖掘主线」；机制类工作不受限。

------------------------------------------------------------------------

## 10. Canonical References / 指针区

- **数据生产**：主协议 `specs/data-production/MoHen_Data_Production_Protocol.md`（V3.0，唯一主协议）·《宽进与广联》V1.0 · T07 最小契约 · `production-registry.json`
- **Skill**：`skills/`（Developer / Agent Skills，定义见 `C2`）
- **Canonical Images / 施工图**（体验侧）：`specs/experience-ui/canonical`、`specs/experience-ui/施工图/`
- **决断**：R6–R25 统一登记于 `C0` §11（唯一载体）
- **本地启动**：`pnpm install && pnpm dev` → `http://localhost:3000`（金泽入口；自检 `/foundation`）；DB 接本地 PG(5432)，云端仅备份（R6）
- **Dev 验证产物**：`verification/`（临时产物，不入根目录、默认不入库）

------------------------------------------------------------------------

## 11. Maintenance Rule

`CURRENT.md` 是**高频状态文件，不是第六份架构文档**——只记状态 + 指针，任务进展一律进结果文件。
**开发总工程师可直接更新**：§2 焦点 / §4 Proven / §5 Gaps / §6 NOW·NEXT / §7 进度指针 / §9 Escalations 的状态行。
**不得自行修改**：North Star、C0–C4 的 Authority 与核心边界、Gate 定义、长期 Evolution Horizons——须进 Architecture Reconciliation。
**文件落点**：规划 / 任务书 / Task-Book 放 `tasks/` 根目录；结果 / 报告 / 审计放 `tasks/results/`；计划 ≠ 结果，不得混放。
**§9 登记规则**：只记「状态 + 一句话 + 详情指针」；触发登记（须拥有者裁定、不得自改 C0–C4）：核心 World/Relation/Meaning 模型变化、Evidence/Interpretation/Geometry 边界变化、Agent 需 Truth Store 写权限或绕过 Evidence Gate、Surface Contract 无法支撑目标体验、引入 PostGIS/Vector/Graph DB 等核心基础设施、C4 Baseline 无法现有架构实现、启动 Participation/Living Culture Schema、商业目标影响 Agent 判断。
**裁决方**：项目拥有者（唯一决策者），不设第三方裁决方（`C0` §11 R13）。
**机器校验**：`pnpm guard:escalations`（§9 计数 / 状态 / 指针）；`pnpm guard:docs`（本文件 ≤ 180 行）。

------------------------------------------------------------------------

## 12. 下一阶段（Human Experience 侧 · 数据生产达成后）

> 以下**不丢**，但属数据生产达成后的下一阶段，当前 HOLD / 顺延（决断 R18）：
- **金泽 Human Experience 样板**：用户进入真实连续的人文探索空间（非网站 / Dashboard / Debugger）；Agent 判断真实改变地图 / 时间 / 图像 / 关系 / 证据 / 叙事 / 行动，追问在同一世界经 Replan / Patch 展开；Human Experience Gate（重新看见 / 与我有关 / 继续行动）验收。
- **体验侧已有基线**：Canonical Images、五母题施工图、体验板已达最低 Human / Visual Baseline（见 §4）。
- **H2 Exit**：Human Experience Gate PASS + Integration Gate PASS。
- **不提前启动**：Figma 高保真主战场、大而全 GIS / PostGIS、参与式体系、扩第二古镇（见 §8）。

**Current one-line status**

> **当前主线是数据生产，目标是把数据底座建厚实——把数据生产沉淀成可复用、可扩展的能力（先治理技能，不再重复写脚本），第一步深透老项目（沪上经纬），随后持续推进外部扩源，把可信数据的来源与规模做厚做实；底座达标后再做 Human Experience 验收。**
