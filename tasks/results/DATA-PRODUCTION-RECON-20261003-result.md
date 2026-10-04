# DATA-PRODUCTION-RECON-20261003 · 数据生产链架构修订对照说明

> **性质**：Architecture Reconciliation 的**定稿记录、对照与交付说明**（非日常生产 Authority；Authority 归 C2/C3 与唯一主协议）。
> **依据**：《墨痕 · 数据生产链架构审查与修订结论 V1.1》（2026-10-03）。
> **状态**：**✅ 已裁定 · 2026-10-03 生效** —— 项目拥有者确认 **R-DP-01～R-DP-05 五项全部通过**（治理级决断 **R16**，见 `CURRENT.md` §12；`C0` §11 同步登记）。候选稿已转为正式版本。
> **登记**：`CURRENT.md` §9 **ESC-06**（已裁定；本文件即其「详情」指针）。
> **落点**：`tasks/results/DATA-PRODUCTION-RECON-20261003-result.md`

> **生效边界（三条，与裁定同时生效）**
> 1. **架构与合同生效，生产范围不扩大**：第一轮只跑 **LR-ADS-01**（Legacy-first，不扩大外部抓取、不新增基础设施）；研究物理 Schema **不随之冻结**（C3 V1.2 §2.9.3）。
> 2. **H2 与 Human Experience Gate 不变**：本轮是 H2 内的数据能力验证子线，成功判据是"能否产出新而可研究的候选"，不以数据量或 Published 数量计。
> 3. **守卫未落地 ≠ 完全生效**：`guard:research`（新增）与 `guard:triage`（扩展）实现前，Research Job 按主协议 §5.2「未声明作业整轮不启动」处理。**只改文档不改守卫等于没改**（主协议 §0.2 铁律）。回仓清单见本文件 §7。

---

## 0. 一句话结论

现有项目**不缺一套数据生产协议**——V3.0（原 V2.0）的控制面、守卫、来源门禁、晋级门槛与无人值守安全边界已经成熟。真正缺失的是位于 **Source 与 Truth Store 之间的 Research Production**：材料怎样被读懂成 Observation，弱信号怎样广联成 Association Candidate，候选怎样精选后再进入严证。

因此本轮修订方向是：**升级现有主协议 + 增加 Research Workspace + 保留现有严格 Truth Promotion**，而不是另起协议。

---

## 1. 修订总览（逐文件对照）

| # | 文件 | 处理 | 本轮实质变更 | 依据（V1.1 章节） |
|---|---|---|---|---|
| 1 | `C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.1.md` | **定向修订** | 新增 §1.4 四个世界分离、§1.5 两种生产模式、§3.1 三个研究 Skill 候选、§3.2 双模式工作链、§3.3 七段职责、§3.4 五条分界语句、§4.4 两类 Discovery 命名分离、§11.1 追加冻结、§11.2 追加不冻结项、§12 总图改双模式 | §5 |
| 2 | `C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.2.md` | **定向修订** | 新增 §2.9 Research Workspace 逻辑合同（四条约束 + 六类逻辑对象 + 双图分离 + 物理形态不立即大建）、§2.5 命名澄清、§4.0 Gate 位置重释（入库卫生门 vs Truth Promotion 门）、§4.1.1 Candidate Reservoir ≠ Human Review Queue、§10.1 追加两条验收、§10.2 冻结/HOLD 追加 | §6 |
| 3 | `MoHen_Data_Production_Protocol.md` | **升级（唯一主协议）** | §0.4 双入口、§0.5 研究生产 KPI、§0.6 两种模式、§1.1 双模式流水线、§1.3 研究态 disposition、§3.3 研究长尾与 Human Review 解耦、§4.1 `truth_write_ceiling=0` 与 0 自动晋级、§5.1 四个双模式字段、§7.1 两类采集意图、§10 追加 Discovery 报告字段、§12 两个 Job Family（N01–N06 / D01–D05）、§14 追加冻结 | §7.1–7.3 |
| 4 | `墨痕_数据生产机制_宽进与广联详细协议_V1.0.md` | **升格为正式操作协议（docx → md）** | 头部新增 Authority 层级与接口表；术语替换（`association_eligibility` → `association_readiness`；Discovery Candidate → Research Discovery Candidate；status 改为研究态 disposition）；§17.1 精选出口与交接、§17.2 对应 D01–D05；§22 接口改为「已生效」状态表；§23 追加冻结与澄清 | §7.5 / §11.5 |
| 5 | `T03_金泽材料盘点_覆盖矩阵.md` | **职责收窄** | 明确为「金泽·五母题 Narrative Gap Register **实例**」，只服务 Directed Production；新增第 ③ 条：五母题不得成为 Broad Intake / Association Generation 的硬筛选 | §7.4 |
| 6 | `T06_无人值守派工与缺口映射.md` | **职责重命名** | 改为「金泽 **Directed Production** Gap → Job 映射」；咬合图补 Discovery 侧并标注不在本文件派工；`Mx-C0n` 强制绑定收窄为 Directed / Narrative 模式 | §7.4 |
| 7 | `T07_无人值守作业最小Contract.md` | **扩展为双模式** | §1.7 双模式 Contract 字段、§1.8 Discovery 产出认定（不写库也算完成）、§7A D01–D05 声明模板、§1.3 分层写权限表新增 Research Workspace 行 | §7.4 |
| 8 | `production-registry.json` | **扩展** | policies 追加 4 条；`required_fields` 追加 `production_mode` / `truth_write_ceiling`；新增 5 个 `research.*` 作业（D01–D05，`truth_write_ceiling=0`）；为既有 9 个作业补登双模式字段 | §11.5 |
| 9 | `AGENTS.md` | **同步路由** | 补充权威清单加入《宽进与广联》与主协议定位；C2/C3「只回答一个问题」列同步；新增路由同步说明块（不承载新规则、路径未变） | §4 |
| 10 | `CURRENT.md` | **更新状态，不堆论证** | §9 新增 **ESC-06**（待裁决 R-DP-01～05）并将计数改为 6 项；§14 并入 Research Production 子线指针 | §8 |
| 11 | `OWNERSHIP_MAP.md` | **结构同步** | `specs/data-production/` 树节点更新（含新协议与 T06/T07 新职责）；`pipelines/research` **预留登记（未建）**；结构决定段追加 2026-10-03 同步说明 | §4 / §11.5 |
| 12 | `AGENT_CONTRACT.md` | **防歧义** | Discovery Policy 增加命名澄清（Runtime vs Research）；Agent 禁止项追加「不得消费研究候选」 | §3.3 / §5.2 |
| 13 | `DATA_CONTRACT.md` | **防歧义** | 新增 Discovery 命名澄清与 Research Workspace 澄清；明确**不复制研究层定义**，一律指向 C3 §2.9（避免平行真源） | §6 |

**未改动**：C0（治理机制已足够）· C1（**暂不改 H2 主 Horizon**）· C4（唯一体验 Authority，不改）· C0–C4 之外新增**零份**宪法文件。

---

## 2. 裁定结果（R-DP-01～R-DP-05 · 2026-10-03 · 全部通过）

| 决策 ID | 裁定的架构改变 | 状态 |
|---|---|---|
| **R-DP-01** | 正式承认 **Discovery Research** 与 **Directed Production** 双模式 | ✅ 通过（护栏：Legacy-first） |
| **R-DP-02** | **Research Workspace / Observation Graph** 加入 C2/C3 正式合同，**但暂不冻结大 Schema** | ✅ 通过（两半绑定，缺一不可） |
| **R-DP-03** | Narrative Gap 由「所有生产唯一上游」改为 **Directed 模式上游**；Discovery 改用 **Discovery Intent / Research Scope**（须限地点/时间/来源/规模） | ✅ 通过（护栏：Scope 机器可校验） |
| **R-DP-04** | Human Review 由「所有 Candidate 分诊」**收窄**到 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical；研究长尾独立 disposition | ✅ 通过（护栏：只收窄研究候选；须同步改守卫） |
| **R-DP-05** | **升级唯一主生产协议**并同步 AGENTS / CURRENT / OWNERSHIP_MAP / T03 / T06 / T07，**不新增平行总协议** | ✅ 通过 |

> **裁决方**：项目拥有者（唯一决策者）。本项目不设第三方裁决方（C0 §11 R13）。
> **登记**：`C0` §11 **R16**（治理级决断，唯一载体：内容 + 框架）· `CURRENT.md` §9 **ESC-06**（已裁定）。

---

## 3. 本轮冻结的阶段性架构决策

1. 不新增任何宪法文件；C0–C4 继续是唯一宪法集。
2. 暂不修改 C1 的 H2 主 Horizon；C0、C1、C4 原则保持。
3. C2 与 C3 是本轮主要宪法修改对象。
4. 主生产协议**升级而不替换**，不再新建同级「精选与严证总协议」。
5. 「宽进 → 广联 → 精选 → 严证 → 深叙」作为语义总链保留，实现为两种入口。
6. T03 / T06 / T07 是金泽 Directed Production 的实例 / 映射 / 安全 Contract，**不是开放发现的唯一上游**。
7. Research Workspace / Observation Graph 与 Truth Graph 分离；研究世界允许低确定性，但 **0 自动 Truth Promotion**。
8. **Evidence before Runtime Truth ≠ Evidence before Research**；G0–G6 严格性不降低。
9. 五母题继续作为 Selected Discovery 之后的**解释透镜**，不成为 Broad Intake / Association Generation 的硬筛选。
10. Human Review 只处理 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical；研究长尾不 1:1 制造人工队列。
11. **Legacy-first**：第一验证场为沪上经纬 Legacy Reservoir；LR-ADS-01 证明关联发现价值前，不扩大外部抓取规模。
12. 第一轮应先生产 Research World，再从精选出的少量候选进入 N01–N06 严证；**0 个 Research Association 自动晋级 Runtime Truth**。

---

## 4. 下一步实施计划（A0 → A7）

| 阶段 | 核心动作 | 阶段出口 |
|---|---|---|
| **A0 · Architecture Reconciliation** | ~~裁定 R-DP-01～R-DP-05~~ **✅ 已完成（2026-10-03 全部通过）** | 五项边界均有明确确认 / 不确认结果 |
| **A1 · 专业宪法同步** | ~~候选稿定稿~~ **✅ 已完成（C2 V1.1 / C3 V1.2 已发布）** | 四类命名与状态均无歧义 |
| **A2 · 主协议与文件链同步** | ~~主协议定稿与同步~~ **✅ 已完成（V3.0 + 路径全同步；守卫脚本待回仓，见 §7）** | 不存在第二主协议；路由与结构守卫通过 |
| **A3 · 最小 Research Workspace 工程** | 只实现首轮必要的 Observation / Mention / Dependency / Signal / Candidate / Task 与机器 disposition | 研究写入无法触碰 Runtime Truth；长尾不 1:1 进 `review_queue` |
| **A4 · LR-ADS-01 P0–P5** | Legacy-first：盘点 → 内容读取 → Mention/Dependency → Association → Selection | 产出以「读懂内容 + 发现非平凡关系」为主 |
| **A5 · P6 Directed Research + N01–N06** | 只对 Top Priority 少量高价值候选定向补证并走 G0–G6 | 能诚实证成或 HOLD；不以 Published 数量论成功 |
| **A6 · P7 深叙与体验闭环** | 选 1–3 个真正晋级的关系进入五母题与 C4 | 至少证明 Research → Truth → Narrative → Experience 可闭环 |
| **A7 · 复盘与扩展决策** | 决定继续调算法 / 扩外部来源 / 第二主题 | 未通过验收前，不以扩量或新增基础设施作为进度 |

**Gate**：A｜治理通过（R-DP-01～05 已裁定）· B｜Authority 对齐（无平行真源）· C｜Research 安全（默认 DRY_RUN、0 Truth 写权、可回滚）· D｜研究质量（内容级 Observation、非平凡关联、人审负载可控）· E｜严证纪律（G0–G6 / R15 不降低）· F｜价值闭环（1–3 个候选走完真实闭环）。

**任一阶段出现以下情况应 STOP / REFINE，而不是继续扩量**：候选大量被 title-only / near / same_source / mentioned_in 主导；Observation 无 locator/region 或只有标题级；`review_queue` 随研究规模线性膨胀；必须绕过 R15 / G0–G6 才能继续；需要新增核心 Schema / 写权限 / 基础设施却未完成 Reconciliation；首轮尚未证明关联发现价值就开始大规模外部抓取。

---

## 5. 交付物落点（拷回 Repo 时按此放置）

| 本轮交付文件 | 落点 |
|---|---|
| `C2_...V1.0.md` / `C3_...V1.1.md` | `governance/` |
| `MoHen_Data_Production_Protocol.md` | `specs/data-production/` |
| `墨痕_数据生产机制_宽进与广联详细协议_V1.0.md` | `specs/data-production/` |
| `T03_...` / `T06_...` / `T07_...` | `specs/data-production/` |
| `production-registry.json` | `specs/data-production/` |
| `AGENTS.md` / `CURRENT.md` / `OWNERSHIP_MAP.md` | 仓库根 |
| `AGENT_CONTRACT.md` / `DATA_CONTRACT.md` | `specs/` |
| 本文件 | `tasks/results/` |

> **注意**：`CURRENT.md` §9 新增的 ESC-06 详情指针指向本文件，若本文件未落到 `tasks/results/`，`pnpm guard:escalations` 会因「指针文件不存在」报红。

## 6. 版本处理

裁定通过后，本轮已完成正式升版，并由**同一次 Architecture Reconciliation** 同步全部路径引用，**无孤立改名**。

| 文件 | 升版 | 文件名 | Authority 变化 |
|---|---|---|---|
| C2 Humanistic Data OS & Dual Skill | V1.0 → **V1.1** | ✅ 改（母版文件名带版本号，C0 §3/§10） | 专业宪法，已生效 |
| C3 Database & Cultural World | V1.1 → **V1.2** | ✅ 改 | 专业宪法，已生效 |
| 主生产协议 | V2.0 → **V3.0** | ❌ 不变（`MoHen_Data_Production_Protocol.md`，非宪法，版本记于文件头） | 唯一主协议，已生效 |
| 《宽进与广联详细协议》 | V0.1 → **V1.0** | ✅ 改 | 主协议下属正式操作协议（转正），已生效 |
| T03 / T06 / T07 | 无版本（职责修订） | ❌ 不变 | 跟随主协议，不升级为更高 Authority |
| `production-registry.json` | `updated` 字段记 2026-10-03 | ❌ 不变 | 机器 Contract，已扩展 |
| AGENTS / CURRENT / OWNERSHIP_MAP | 无版本 | ❌ 不变 | 只同步路由 / 状态 / 结构 |

**已同步的引用点**：`AGENTS.md` §1 六大入口表（C2 / C3 路径）、补充权威清单（主协议 V3.0、《宽进与广联》V1.0、T07 双模式）· `OWNERSHIP_MAP.md` §0 目录树（governance 一行、data-production 七行、`pipelines/research` 预留）· `CURRENT.md` §9 ESC-06 / `C0` §11 R16（唯一载体）/ §14 指针 · C2 头部的 C3 版本引用 · C3 附录 B 的 C2 版本引用 · T06 / T07 的协议版本与章节号引用。

**未改动**：C0 原则 / C1 结构与 H2 主 Horizon / C4 全文。**未新增**：任何宪法文件、任何顶层目录（OWNERSHIP_MAP §0 已核对）。

---

## 7. 守卫回仓实现清单（本轮"生效"的最后一步）

> **§0.2 铁律**：没有被强制的规则不是规则。以下四项落地前，§3.3（研究长尾解耦）与 §4.1（`truth_write_ceiling = 0`）**视为未完全生效**，Research Job 一律按 §5.2「未声明作业整轮不启动」处理。

| # | 落地项 | 位置 | 验收断言（回仓后由守卫验证） |
|---|---|---|---|
| 1 | **`guard:research`（新增）** | `scripts/check-research.mjs` + 纳入 `pnpm guard` | ① `discovery` 作业 `truth_write_ceiling` 必为 `0`；② Research Workspace 对 `claims` / `relations` / `entities` 事实层与 `visual_assets` 资格字段写入 **0 行**；③ 研究态对象不含 `usable` / `published` / `verified`；④ 0 个 Association Candidate 自动晋级；⑤ 每条 `research_observation` 有 `source_id` + `locator/region` |
| 2 | **`guard:triage`（扩展）** | `scripts/check-triage.mjs` 增加一项 | 研究长尾**未 1:1 制造 `review_queue`**：只有 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 才创建分诊行 |
| 3 | **`guard:registry`（扩展）** | `scripts/check-production-registry.mjs` | 新增必填字段校验：`production_mode`、`truth_write_ceiling`；模式与 ceiling 冲突、或缺 `research_scope` / `selection_policy` → **整轮不启动** |
| 4 | **D01–D05 作业登记** | `specs/data-production/production-registry.json` | 5 个 `research.*` 作业已登记（本轮已完成）；`unattended-jobs.mjs` 队列对接前默认不调度 |

**实施顺序建议（与裁定时的建议一致）**：先落 #2（成本最低、最紧迫，只收窄现有机制）→ 再以 **LR-ADS-01** 验证 #1/#3/#4 → 全部守卫转绿后才扩大 Research 生产。

> **已知前置风险**：`pnpm test` 仍 **21 failed**（ESC-05 未结），N01–N06 在 `unattended-jobs.mjs` 中尚无对应实现。定向线自身尚未真正跑通过——因此**不得**把本轮生效理解为"可以立即扩大生产规模"。
