# OWNERSHIP MAP

> 本文件是**目录职责与归档规则的唯一 Authority**（依 C0 §5，R14 登记）。
> **C0–C4 与 CURRENT 的文件路径以 `AGENTS.md` §1 为唯一路由源**；本文件只声明"每个目录归谁管、放什么、禁止什么"。

## 0. 目录职责表

### 0.1 代码与运行时

| 路径 | 唯一职责 | 禁止 |
|---|---|---|
| `apps/web` | Web Shell + Renderer | 历史事实判定、直接 SQL |
| `packages/domain` | 稳定领域类型 | UI、网络请求 |
| `packages/agent-runtime` | Goal/Plan/Action/Observe/Replan | DOM/React 控制 |
| `packages/experience-engine` | ExperienceState/CompositionState/Action reducer | 数据采集 |
| `packages/data-access` | 唯一 DB 访问层 | UI 逻辑 |
| `packages/ui` | 预留包（当前为占位，**未承担产品 UI**；产品 UI 在 `apps/web` 与 C4 辖下） | 被误认为产品 UI 层 |

### 0.2 数据生产

| 路径 | 唯一职责 | 禁止 |
|---|---|---|
| `supabase/migrations` | **Truth Store 的物理定义处**（schema 唯一来源） | 被绕过直接改库 |
| `pipelines/ingest` | Raw + Source 登记 | 写 verified knowledge |
| `pipelines/evidence` | Evidence Gate | 自由叙事 |
| `pipelines/weave` | verified → relations/story/discovery candidate | 绕过 Gate |
| `pipelines/legacy` | 老项目（hushang-jingwei）移植与夜跑执行体 | 把老库内容当已裁决事实 |
| `pipelines/{build,cultural-world,experience,extract,historical-spatial,normalize,review,visual}` | 各自数据生产阶段（构建 / 文化世界 / 体验投影 / 抽取 / 历史空间 / 规范化 / 人审 / 视觉） | 跨阶段越权写库 |
| `skills` | AI 可执行 SOP | 保存项目历史 |
| `scripts` | **结构与文档守卫 + 报告生成器**（`check-structure.mjs`、`check-doc-budget.mjs`、`gen-*.mjs`） | 承载产品逻辑 |
| `tools/night` | 夜间数据生产的运维脚本（探针 / 修复 / 校验） | 被当作调度器（调度器在 `pipelines/legacy/night-runner.mjs`） |
| `data/raw` | 原始资料，**append-only 永久保留** | 修改或删除 |
| `data/staging` | 迁移中间产物 | 被当作真源 |
| `data/fixtures` | **来源门禁**（`source-providers.json`，S1–S4） | 未登记的门禁旁路 |
| `data/exports` | 任务交付产物（报告 / CSV / JSON / 截图，gitignored） | 被当作 Knowledge 真源 |

### 0.3 治理、契约与状态

| 路径 | 唯一职责 | 禁止 |
|---|---|---|
| `AGENTS.md` | **纯入口路由**（非 Authority） | 承载宪法 / 状态内容 |
| `CURRENT.md` | 当前状态（Live SOT），Authority 低于 C0–C4 | 改写 C0–C4 |
| `governance/` | **C0–C4 宪法** + 域治理契约 | 已稳定为 Contract 的内容应下沉 `specs/`；Candidate Backlog 行使 SOT / Decision Authority |
| `governance/experience/` | 体验域治理契约（EXP-DESIGN-01 …） | 与 C4 竞争体验 Authority |
| `governance/archive/` | **被取代的治理件**（见 §1） | 被活跃文件当作 Authority 引用 |
| `specs/` | 当前稳定契约（`FOUNDATION` / `DATA_CONTRACT` / `AGENT_CONTRACT` / `EXPERIENCE_CONTRACT` / `SOURCE_REGISTRY` / `OWNERSHIP_MAP`） | 过程记录（例外：`specs/experience-ui/` 为分级素材区，见 §2） |
| `specs/archive/` | **被取代的契约与规范**（见 §1） | 被当作当前 Authority |
| `specs/experience-ui/` | Experience/UI 附属素材区（分级见该目录 `README.md`） | 重组 / 重命名资产（须拥有者确认） |
| `decisions/` | 重大架构变更理由（ADR） | 操作 SOP |
| `tasks/` | 当前可验收工作单（一律 tracked） | 长期知识 |
| `tasks/results/` | 施工结果与过程报告（Trace，**非 Authority**） | 以报告结论代替宪法或真库 |
| `verification/` | 开发验证产物与长期验收索引（默认不入库） | 被当作产品资产 |
| `docs/` | 方法 / 协议 / 审查类文档：母题框架、**夜间数据生产协议**、审查记录、五母题施工审阅配套规格 | 与 C0–C4 竞争 Authority |
| `prototypes/` | **当前施工图册（第 3 代）与交互原型**；自绘虚构示意，不证明史实 | 被当作历史证据或产品导航 |
| `archive/` | **跨域历史快照**（见 §1） | 被当作当前状态 |
| `legacy/manifests` | 老项目迁移 manifest（只读引用） | 在老工程内安装 / 构建 / 写文件 |
| `test-results/`、`.next/`、`dev.log` | 构建与运行残留 | 入库（应 gitignore） |

新建文件前必须搜索是否已有同职责 owner。**禁止平行真源。**

## 1. 归档规则（R14 · 2026-10-02 项目拥有者裁定）

> **总则：被取代、重复或不再必要的文件一律归档，不删除。** 本条**取代**原"Current-only working tree + `git rm`、不建 `history/` 子目录"纪律。

### 1.1 唯一归档落点（三个，各有明确职责）

| 归档区 | 只放 | 例 |
|---|---|---|
| `archive/` | **跨域历史快照**：一次性分析、结构报告、旧工作区状态 | 2026-09-26 分析集、`PROJECT_STRUCTURE_REPORT.md` |
| `governance/archive/` | **被取代的治理件** | 旧 Roadmap V4.9、PHASE-II Plan V1.1、旧 C0–C4 docx、WorkBuddy→CodeBuddy 移交稿、`CURRENT_before_20261001.md`、Candidate Backlog |
| `specs/archive/` | **被取代的契约与规范** | 旧 UI Baseline V1.0、旧版设计规格 |

### 1.2 规则

1. **取代 → 移入归档区**（`git mv`），不 `git rm`。可追溯性由归档区 + Git 共同承载。
2. **重复副本 → 保留被路由引用的一份**，其余移入归档区。
3. **归档件不得被活跃文件当作 Authority 引用**；引用时必须显式标注 `ARCHIVE / TRACE`。
4. **每次批量归档必须产出清单**：`archive/<date>-<topic>/README.md`，逐条写明「原路径 → 归档路径 → 归档理由 → 取代者」。**没有清单的归档视为未完成。**
5. **历史记录不改写**：归档件正文不修改（含其中残留的旧工具名或已失效的 Authority 自述）；只在文件首部加"历史快照，不代表当前状态"横幅。
6. **`specs/experience-ui/` 结构变更须拥有者确认**（该目录 README §3）；本规则不授予开发总工程师自行重组的权限。

## 2. Experience/UI Authority（登记 2026-09-29；2026-10-02 修订）

**C4 是 Human-facing Experience / UI 的唯一 Authority**（`AGENTS.md` §1）。`specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 已降为 **SOURCE ARCHIVE / TRACE**，原 EXP-UI-GOV-01 的"CURRENT IMPLEMENTATION AUTHORITY"登记失效。

- **适用范围**：Experience、UI、Surface、Renderer、Map / Timeline / Evidence presentation、Visual Asset、MoHen Presence——以 C4 为准。
- Baseline 中经 C4 吸收的成熟规则仍为有效参考；未被 C4 吸收或冲突者以 C4 为准。
- **引用修订说明**：本条原以"C4 V2.1 §27"为据；C4 §27 已随 2026-10-01 净化退出正文（内容留 Git 历史），故不再引用该节号。
- 与 Agent / Data / Experience Contract 发生真实冲突时，开发总工程师**不得自行裁决**，必须提交项目拥有者确认（C0 §2.3 / §6.2）。

### 2.1 当前施工图（项目拥有者 2026-10-02 确认）

| 代 | 文件 | 状态 |
|---|---|---|
| **第 3 代（当前）** | `prototypes/墨痕_五母题施工审阅_第一批_M1_V0.1.html` + `docs/墨痕_五母题施工审阅_第一批_M1_配套规格_V0.1.md`（25 页 / 50 视图 / 12 帧主线·「一座仓屋背后的交接生活」） | **当前施工图** |
| 规范与样册 | `specs/experience-ui/source/两个组件_尺寸与母题叙事规范- 墨痕 V0.9.1.md`、`specs/experience-ui/source/交互原型- 墨痕 V0.9.1.html` | 有效（双组件 / 构图 / 空间规范） |
| 体验权威 | `specs/experience-ui/墨痕_Agent_2.0_金泽最小体验导演稿_V1.0.docx` | 有效（H2 计划自述为最高体验权威） |
| 第 2 代（已被取代） | `specs/experience-ui/施工图/T05_B1_五母题帧索引.md` + `T05_B1_M1_完整实例.html` | 已归档 `archive/2026-10-02-superseded/` |

- **五母题交付进度：仅 M1（1/5）**；M2–M5 只有施工索引，无画面。
- **施工图当前未接入代码**：运行时体验由 `apps/web/data/experience/*.json` 的冻结五幕 canonical 驱动，与五母题帧体系（M1-F01…M5-F40）是两套帧系统；接入点见施工图 §4。

## 3. 执行主体命名纪律（R13）

治理文本中的执行主体一律使用**角色名**（项目拥有者 / 开发总工程师），不得出现工具名或产品名（WorkBuddy / CodeBuddy / ChatGPT Architect 等）。
**范围**：`*.md` **与 Office 二进制（`.docx/.pptx/.xlsx`）**——后者须解包检查，不得只 grep 文本文件。历史归档件按 §1.2 第 5 条豁免。

## 4. 版本源与 SOT

- **入口路由** `AGENTS.md`（纯路由，非 Authority）。
- **当前架构真源集（SOT Set）= C0–C4 + CURRENT**（项目拥有者 2026-09-29 明确，2026-10-02 复核）。**路径以 `AGENTS.md` §1 为唯一路由源**，本文件不再重复。
- **版本源唯一机制**见 **C0 §10**。
- **候选登记处**：`governance/archive/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`（TRACE，非 SOT）；Candidate 须经项目拥有者确认（C0 §6.2）方可晋升为 Contract / Plan / Task Book。
