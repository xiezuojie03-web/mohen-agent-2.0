# TASK-RECON-20261003 · 数据生产链修订工程落地任务书

> **性质**：任务书（进行中的方案），**非结果文件、非 Authority**。Authority 归 C0–C4 与唯一主生产协议。
> **落点**：`tasks/TASK-RECON-20261003_数据生产链修订工程落地_Task-Book_V1.0.md`（依 CURRENT §11：任务书一律放 `tasks/` 根目录）
> **依据**：《墨痕 · 数据生产链架构审查与修订结论 V1.1》；`CURRENT.md` §12 **R16**（治理级决断，R-DP-01～05 全部通过）；定稿记录 `tasks/results/DATA-PRODUCTION-RECON-20261003-result.md`
> **指令来源**：项目拥有者 2026-10-03（覆盖拷贝、不留历史；其余同步项交由执行器施工）
> **版本**：V1.0 · 2026-10-03

---

## 0. 目标与范围

### 0.1 一句话目标

把已定稿的架构与合同接上机器——**先有守卫，再放研究作业上跑道**。

### 0.2 已完成（不需本任务书重复）

C2 V1.1 / C3 V1.2 / 主生产协议 V3.0 /《宽进与广联》V1.0 已定稿；T03·T06·T07 职责已收窄；`production-registry.json` 已登记 D01–D05；AGENTS / CURRENT / OWNERSHIP_MAP / C0 引用已同步。

### 0.3 本任务书负责的范围

**只做"文档之外"的机器落地**：文件覆盖、守卫脚本、目录与执行体、最小存储、凭证、首轮验证、回写。

### 0.4 硬边界（任何任务不得越）

1. **不扩大生产范围**：第一轮只跑 **LR-ADS-01**（沪上经纬 Legacy Reservoir），**不扩大外部抓取、不新增基础设施**（对应 CURRENT §8 HOLD 与 C0 §2.3）。
2. **不改 C1 的 H2 主 Horizon，不改 C0 治理原则与 C4 体验 Authority**。
3. **不新增任何宪法文件、不新建顶层目录**（`pipelines/research` 除外，已在 OWNERSHIP_MAP §0 预留登记）。
4. **不新增第二份总协议 / 第二份注册表**；新 Job 一律登记进既有 `production-registry.json`。
5. **任何 Gate 严格性不降低**：G0–G6 / R15 / Source Gate / Raw 保全 / run 归因 / DRY_RUN·WRITE / 回滚 全部沿用。
6. **研究世界 0 自动 Truth Promotion**；研究态对象禁止使用 `usable` / `published` / `verified` 等 Truth 资格词。

### 0.5 已知前置风险（施工前必须知悉）

- `pnpm test` 仍 **21 failed**（ESC-05 未结）。**这不是本任务书要修的**，但它是 T8 启动的前置阻塞——**未转绿不得启动首轮生产**。
- N01–N06 在 `unattended-jobs.mjs` 中**尚无对应实现**：定向线自身从未真正跑通过。
- S1/S2 **凭证未配置**：凭证到位前全部 job 只能 DRY_RUN（主协议 §1.2 / T07 §1.2）。

---

## 1. 任务总览

| ID | 任务 | 阻塞关系 | 完成判据 |
|---|---|---|---|
| **T1** | 定稿文件覆盖拷贝（不留历史） | 无 | 15 文件覆盖到位 + 旧版 C2/C3 已移除 |
| **T2** | 结果文件落位 | 无 | `tasks/results/DATA-PRODUCTION-RECON-20261003-result.md` 存在 |
| **T3** | `guard:triage` 扩展（长尾解耦） | T1 | 守卫可运行且断言有效 |
| **T4** | `guard:registry` 扩展（双模式必填） | T1 | 字段缺失/冲突 → 整轮不启动 |
| **T5** | `guard:research` 新增（五条断言） | T1、T8前 | 五条断言全部可执行 |
| **T6** | `package.json` 注册新守卫 | T3–T5 | `pnpm guard` 全量含新守卫 |
| **T7** | `pipelines/research` 执行体 + 最小研究存储 | T5 | D01–D05 可 DRY_RUN |
| **T8** | 凭证配置与 DRY_RUN 解除 | T7 | 写入三道闸可开（仍须 dev/staging） |
| **T9** | LR-ADS-01 首轮 + 回写与验收 | T3–T8 全绿 | 见 §3 验收 Gate |

> **建议顺序**：T1/T2 → **T3 最先做**（成本最低、最紧迫，只收窄现有机制）→ T4 → T5 → T6 → T7 → T8 → T9。**不要并行铺开。**

---

## 2. 逐任务详细

### T1 · 定稿文件覆盖拷贝

**指令（项目拥有者 2026-10-03）**：直接覆盖原路径，**不留历史副本**。

| 交付文件 | 覆盖到 |
|---|---|
| `C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.1.md` | `governance/` |
| `C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.2.md` | `governance/` |
| `C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md` | `governance/`（仅 §11 R16 登记） |
| `MoHen_Data_Production_Protocol.md` | `specs/data-production/` |
| `墨痕_数据生产机制_宽进与广联详细协议_V1.0.md` | `specs/data-production/` |
| `T03_*` / `T06_*` / `T07_*` / `production-registry.json` | `specs/data-production/` |
| `AGENT_CONTRACT.md` / `DATA_CONTRACT.md` | `specs/` |
| `AGENTS.md` / `CURRENT.md` / `OWNERSHIP_MAP.md` | 仓库根 |

**必须同时执行的移除动作**（否则新旧并存＝平行真源）：
- 删除 `governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.0.md`
- 删除 `governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.1.md`

**R14 例外登记（必须回写，见 T9）**：本指令**覆盖 R14「一律归档，不删除」**——项目拥有者对本轮升版文件裁定**不留历史**。回写 `C0` §11 R14，文案见 §4.1。

**验收**：① 15 文件到位；② 旧版 C2/C3 **不存在**；③ `pnpm guard:structure` 中 AGENTS §1 路径校验**不红**；④ `pnpm guard:links` 不红。

**回滚**：Git 还原（本轮不留历史，回滚依赖提交前的 `git status` 基线；建议拷贝前先确认工作区已提交）。

### T2 · 结果文件落位

`DATA-PRODUCTION-RECON-20261003-result.md` → `tasks/results/`。

**验收**：`pnpm guard:escalations` 不红（CURRENT §9 ESC-06 的详情指针必须指向真实存在的文件）。

### T3 · `guard:triage` 扩展（最优先）

**改**：`scripts/check-triage.mjs`（纳入既有 `guard:triage`）

**新增一条断言**：研究长尾**未 1:1 制造 `review_queue`** —— 只有被标记为 `Selected` / `Truth-Promotion` / `Narrative-Critical` / `Conflict-Critical` 的研究候选才创建分诊行；其余长尾只有机器 disposition，**不创建 `review_queue` 行**。

**保留**：原三分（`triage_outcome ∈ {auto, hold, reject}`）、Tier C 禁 auto、`ingest_run_id` 归因、分诊行不可改写、同 `(ingest_run_id, 对象)` 唯一索引。

**验收**：构造 100 条研究长尾 + 3 条 Selected → `review_queue` 新增行数 == 3。

**回滚**：脚本为只读校验，删除新增断言即可。

### T4 · `guard:registry` 扩展

**改**：`scripts/check-production-registry.mjs`

**新增断言**：
1. 每个 job 必填 `production_mode`（`directed` / `discovery`）与 `truth_write_ceiling`；
2. **`discovery` 模式的 `truth_write_ceiling` 必须为 `0`**，冲突 → **整轮不启动**；
3. `discovery` 模式缺 `research_scope` 或 `selection_policy` → **整轮不启动**；
4. `ambiguous_match`（一个作业恰好命中一个条目）规则不变。

**验收**：现有 14 个 job 全绿；手工把某 `research.*` 的 ceiling 改成 1 → 守卫报红且不启动。

### T5 · `guard:research` 新增

**新建**：`scripts/check-research.mjs`（只读校验）

**五条断言**（对应主协议 §9.1 `guard:research` 行）：
1. `discovery` 作业 `truth_write_ceiling == 0`；
2. Research Workspace 对 `claims` / `relations` / `entities` 事实层与 `visual_assets` 资格字段的写入 **0 行**；
3. 研究态对象**不含** `usable` / `published` / `verified`；
4. **0 个** Association Candidate 自动晋级；
5. 每条 `research_observation` 有 `source_id` + `locator/region`。

**验收**：五条均可独立触发红（逐条构造反例验证），不可靠改断言让绿（主协议 §9.3 红线）。

### T6 · `package.json` 注册

在 `pnpm guard` 全量中加入 `research`；确认 T3/T4 的扩展已随原守卫名被包含。**纸面 8 道守卫与代码必须一致**——不一致则主协议 §0.2 视为未生效。

**验收**：`pnpm guard` 输出含 `registry / source-gate / promotion / triage / acquisition / identifiers / research` 七道生产守卫。

### T7 · `pipelines/research` 执行体 + 最小研究存储

1. 新建 `pipelines/research/`（**含 `SKILL.md`**，依 `skills/` 规则迁移或按该目录既有约定）；
2. 实现 D01–D05 五个 Job（声明已在 `production-registry.json`）：
   - `research.source-inventory` → `research.content-observation` → `research.mention-dependency` → `research.association-scan` → `research.humanistic-selection`
3. **最小研究存储**：不冻结大 Schema。先建最小表集（`research_observation` / `research_mention` / `research_signal` / `research_association_candidate` / `research_task`）或 `research` 逻辑区，满足 C3 V1.2 §2.9 六类逻辑对象；是否独立 schema 由 LR-ADS-01 结果决定。
4. **回写**：`OWNERSHIP_MAP.md` §0 目录树与 `AGENTS.md` §1（预留登记转实际存在）。

**验收**：五个 Job 可 **DRY_RUN** 跑通且产出 plan；`pnpm guard:structure` 不红（新目录已登记）。

### T8 · 凭证与 DRY_RUN

配 S1/S2 来源凭证与 PG DSN（**环境变量 / 密钥管理，绝不落库落码落日志**）。三道闸 `MOHEN_WRITE_ENABLED` / `MOHEN_ENV ∈ {dev,staging}` / `write_scope` 白名单齐备才允许写入。

**前置**：`pnpm test` **必须转绿**（21 failed 未结不得启动首轮生产）。

### T9 · LR-ADS-01 首轮 + 回写与验收

1. 按《宽进与广联》V1.0 §17 跑 P0–P5（盘点 → 内容读取 → Mention/Dependency → Association → Selection），**Legacy-first**；
2. Top Priority 少量候选进 N01–N06 严证（P6）；
3. 1–3 个真正晋级者进五母题与 C4 闭环（P7）；
4. **回写**：R14 例外（§4.1 文案）、`CURRENT.md` §14 阶段状态、ESC-06 结果指针、结果文件产出。

---

## 3. 验收 Gate（全部通过才算完成）

| Gate | 判据 |
|---|---|
| **A · 治理** | R16 已登记；R14 例外已回写；ESC-06 为已裁定 |
| **B · Authority 对齐** | 无平行真源：旧版 C2/C3 不存在；无第二主协议 / 第二注册表 |
| **C · Research 安全** | 默认 DRY_RUN；`truth_write_ceiling=0`；可回滚；0 自动晋级 |
| **D · 研究质量** | 内容级 Observation（有 locator/region，非标题级）；非平凡关联；人审负载可控 |
| **E · 严证纪律** | G0–G6 / R15 严格性未降低 |
| **F · 价值闭环** | ≥1 个候选走完 Research → Truth → Narrative → Experience |

**成功判据是"能否产出新而可研究的候选"，不是数据量、也不是 Published 数量。**

**STOP / REFINE 条件**（出现即停，不得继续扩量）：候选大量被 title-only / near / same_source / mentioned_in 主导；Observation 无 locator/region；`review_queue` 随研究规模线性膨胀；必须绕过 R15 / G0–G6 才能继续；首轮未证明关联价值就开始大规模外部抓取。

---

## 4. 必须回写的文案

### 4.1 R14 例外登记（T9 回写 `C0` §11 R14）

> **例外（2026-10-03 · 项目拥有者裁定）**：R14「一律归档，不删除」**不适用于本轮升版文件**。C2 V1.0 → V1.1、C3 V1.1 → V1.2 属于**同一文件的版本升版**，旧版本**不留历史副本、不进归档区**；可追溯性由 Git 历史承载。本例外**仅限本轮**，不解除 R14 对其余文件的效力。

### 4.2 `CURRENT.md` §14 阶段状态（T9 回写）

> 数据生产线完善 → Phase 1：Research Production 落地（守卫已转绿 / LR-ADS-01 首轮完成）。

---

## 5. 绝对禁止

- 挪用"让守卫变绿"的改法（弱化规则、删断言）——违反主协议 §9.3 红线；
- 为架构完整性先建大而全研究库（CURRENT §8 HOLD）；
- 跳过守卫直接上研究作业（§0.2 铁律）；
- 自行改写 C0–C4 原则、C1 的 H2、C4 体验 Authority；
- 在 `pnpm test` 未转绿、ESC-05 未结时启动首轮生产。
