**MOHEN · DATA PRODUCTION**

**墨痕 · 数据生产协议 V3.0（一套控制面 · 两种生产模式）**

*Unattended & Attended Developer Skills × Evidence Gate × Enforced Promotion*

|                                                                                                           |
| --------------------------------------------------------------------------------------------------------- |
| **目标：让你不在场时持续"造世界"，但只自动做可追溯、可回滚、低判断风险的工作。遇到身份歧义、历史因果、空间重建、来源冲突，不打断无人值守施工，也不硬猜——统一 HOLD，到点后只给你一份异常摘要。** |

**定位：** 这是 C2/C3 之下的 Developer-Skill 施工协议，不是 C0–C4 的新宪法。它把"知识生产循环、Developer Skills、Evidence Gate G0–G6、Human Review"整理成可无人值守运行的批次规则。

**依据：** C2 Humanistic Data OS & Dual Skill **V1.1**、C3 Database & Cultural World **V1.2**（均 2026-10-03 定向升版）。文中"无人值守批次、自动晋级边界、失败隔离、执行报告"是本次为无人值守场景补充的执行规则。

> **V2.0 说明（相对 V1.x 的根本变化）**：V1.x 只写"应该"，没写"靠什么保证"——于是 `source-providers.json` 三处写"取回必须遵守"却无一行代码读它，341 张外镇图照样入库。V2.0 把**强制**提为第一原则：每条机制 = 规则 + 强制（靠什么落地）+ 守卫（哪个 `pnpm guard` 验证）。守卫失败 = 协议违反。

> **V3.0 正式升版：2026-10-03（一套控制面 · 两种生产模式）· 已生效**
> **裁定依据**：项目拥有者 2026-10-03 确认 **R-DP-01～R-DP-05 全部通过**（登记见 `CURRENT.md` §12 **R16**；对照与文件清单见 `tasks/results/DATA-PRODUCTION-RECON-20261003-result.md`）。本节自确认之日起**生效**，不再是候选稿。
> 依据《墨痕 · 数据生产链架构审查与修订结论 V1.1》§7。本轮**升级而不替换**：本协议继续是 `specs/data-production` 的**唯一主生产协议**，不再另立同级"精选与严证总协议"。
> 本轮变更：§0.4 从"每批必须命中 Narrative Gap"改为**双入口**；§0.6 新增两种模式；§1.1 从单条流水线改为**两种模式流水线**；§1.3 研究态 disposition；§3.3 增加**研究长尾与 Human Review 解耦**；§4 增加 **Research Workspace `truth_write_ceiling = 0`**；§5.1 增加 `production_mode` / `research_scope` / `truth_write_ceiling` / `selection_policy`；§7 增加 **Discovery Research Acquisition** 意图；§10 增加研究生产 KPI；§12 保留 N01–N06 为 Directed Job Family，新增 **D01–D05 Research Job Family**。
> **继承不变**：Source Gate、Raw 保全、run 归因、DRY_RUN/WRITE、安全停止、回滚、G0–G6、R15 与执行报告三形态全部沿用，**任何一道 Gate 的严格性不降低**。
> **生效边界**：本轮生效的是**架构与合同**，不是"立即扩大生产"。第一轮只跑 **LR-ADS-01**（Legacy-first，不扩大外部抓取、不新增基础设施）；研究物理 Schema 不随之冻结（C3 §2.9.3）。

# 0｜核心立场

## 0.1 一句话原则

**无人值守自动化不是"AI 自动写历史"，而是"机器自动扩大 Candidate / Evidence / 可验证关系的供给；只有确定性足够高的结构化结果才能自动晋级，判断性内容一律 HOLD"。**

成功指标不是"上一轮新增了多少条"，而是：新增了多少可追溯 Source / Evidence / Candidate；多少确定性记录安全通过 Gate；多少高价值疑难被准确送入 HOLD 而未污染可信文化世界。

## 0.2 铁律：规则即强制（本协议与第一版的根本区别）

> **本协议的每一条规则，必须对应一个机器可执行的校验（守卫 / 触发器 / 注册表校验）。没有被强制的规则不是规则，只是意图。**

来源门禁 `source-providers.json` 曾三处写"取回必须遵守"，却无一行代码读它——它什么也没挡住（实测 341 张外镇图入库）。这是本协议存在的起点教训：**规则写在文档里、代码里没有，等于没写。**

因此本协议统一写法：每条机制先写**规则**，紧跟**强制**（靠什么保证——迁移 / 守卫 / 注册表字段），最后列**守卫**（哪个 `pnpm guard` 验证它）。第 9 章集中登记全部守卫；**守卫失败 = 协议违反，CI 红线，不得靠改断言让绿**。

本协议只承载**已裁定、已强制**的规则。任何尚待拥有者拍板的未决项（如 A 组断点裁决、C 组解禁时机）不写进本协议正文，留在其活跃任务结果文件与 `CURRENT.md`；协议与待裁决保持解耦，避免重演"机制只活在结果文件、未被协议吸收"的脱节。

## 0.3 两种值守模式（2026-10-02 术语澄清）

数据生产按**谁做判断**分两种模式，二者**共用同一条流水线、同一套 Gate、同一个生产注册表**。

|  | **无人值守生产**（Unattended） | **有人值守生产**（Attended） |
|---|---|---|
| 触发 | 项目拥有者发指令 | 项目拥有者召开值守会话 |
| 边界 | 给定**范围**与**截止时间**，期间自动运行 | 拥有者在场，逐项处理需要判断的事 |
| 只做 | 确定性、可回滚、低判断风险；歧义一律 HOLD | 身份消解、跨源冲突取舍、历史空间判断、Meaning / Present Connection 边界 |
| 产出 | Candidate / Evidence / 可用记录 + HOLD 队列 | 裁决记录（`human_review_decisions` / `review_queue`）+ 叙事缺口回填 |
| 拥有者必看 | **执行报告一页**：三值结论 + 最多 3 条 Escalation | 值守工作清单（HOLD 队列，按价值排序） |
| 绝不做 | 不自动判歧义、不自动发布、不扩 Schema / 写权限 / 基础设施 | 不代替证据——人也不能把无据判断写成历史事实 |

**术语更正**：原"夜间"是误导，真正约束不是时钟而是判断风险边界；它是按需触发 + 截止时间，不是定时调度。

## 0.4 有效生产：两个入口，一个终点（2026-10-03 修订）

产出的不是数据量，而是"某条叙事从讲不出变成讲得出"，或"一个新问题从没人提出变成值得去证"。

**修订要点：上游锚点从"唯一"改为"双入口"。**

| 模式 | 上游入口 | 有效性判据 |
|---|---|---|
| **B · Directed Production** | **Narrative Gap Register**：按叙事单元登记"需要什么材料 / 现在有什么 / 缺什么 / 缺什么裁决"。当前实例＝`specs/data-production/T03_金泽材料盘点_覆盖矩阵.md`（范围：金泽·五母题）。 | 本批是否让某个**缺口推进或关闭**。 |
| **A · Discovery Research** | **Discovery Intent / Research Scope**：限定地点/时间/来源/规模的研究范围，不预设答案。 | 本批是否产出**可研究、非平凡、可执行的 Selected Discovery**。 |

- **Directed 模式每一批都必须声明它瞄准哪个缺口**（与 §7 采集意图声明是同一件事）；**Discovery 模式改为声明 `research_scope`**，`narrative_gaps` 不再是所有 job 的必填项（见 §5.1）。
- **只报"落库新增 N 条"不算有效生产**。执行报告必须回答：Directed 模式"推进了哪几个叙事缺口"；Discovery 模式"产出了哪几个值得继续查的 Selected Discovery"。答"没有"＝本批无效，应停下问为什么。
- **T03 不是上游锚点本身**，它是"金泽·五母题"这一范围的 Narrative Gap Register **实例**（T03 自身已如此声明）；换范围须另立登记册。

## 0.5 执行报告：任务执行结果，不是按时辰命名的"晨报"

**三种形态，一次生成、同源产出**（机器可读落地＝`pipelines/legacy/unattended-report.mjs`，先构造成一个对象再渲染 `report.json` / `report.html` / `result.md`，三者不可能漂移）：

| 形态 | 文件 | 给谁 | 硬要求 |
|---|---|---|---|
| 机器可读 | `report.json` | 后续自动化 | 稳定 schema + 版本号；每个数字附 SQL；不得含模板断言 |
| 可视化 | `report.html` | 拥有者审查 | 单文件离线可开；结论与 Escalation 置顶 |
| 人读 | `result.md` | 文本/diff/归档 | 与 json 同源，不得各写一套 |

**内容最低集（三形态一致）**：① 结论三值 `PASS` / `PASS WITH HOLD` / `STOPPED`；② Escalation 最多 3 条；③ 本批推进/关闭了哪几个叙事缺口，或产出了哪几个 Selected Discovery（§0.4）；④ 事实表每行附 SQL 出处；⑤ 作业明细；⑥ 归因口径与已知限制。

**研究生产 KPI（2026-10-03 增加，Discovery 模式必报）**：`Observation Yield`（Source → 有内容 Observation 的转化率）· `Association Yield` · `Selected Discovery` 数 · `Novelty`（非旧库已有 relation/story 复述的比例）· `Source Independence`（转引链是否被识别为单一来源传统）· `Human Selection Precision`（人工抽样判断"值得继续查"的比例）。

**禁止**：任何未经查询的断言。历史教训——曾用模板字符串断言"未绕过 Evidence Gate"，而同批 1246 张图片在 `evidence_gate_audit` 中为 0 条。

## 0.6 两种生产模式（2026-10-03 新增，冻结）

| 模式 | 入口 | 主要动作 | 终点 | 自动晋级 |
|---|---|---|---|---|
| **A · Discovery Research（开放发现）** | Discovery Intent / Research Scope | Content Reading → Observation → Mention / Source Dependency → Association Discovery → Humanistic Selection | **Research World** | **0** |
| **B · Directed Production（定向补证 / 补缺）** | T03 Narrative Gap，或 A 模式精选后的 Selected Discovery | Directed Research → N01 → N02 → N03 → N04 → N05 → N06 → G0–G6 | Truth / Cultural World | 仅确定性、无冲突且满足 Contract 者 |

**两种模式不是两套系统。** 它们共用 Source Gate、Raw 保全、production-registry、run attribution、DRY_RUN/WRITE、安全停止、回滚、守卫与执行报告。区别只在："此刻是在找值得研究的问题，还是在把已选问题证成可信世界"。

**汇流点**：Selected Discovery 与 Narrative Gap 在 N 系列入口汇合。Discovery 模式产出的候选**只有被精选为 Priority / Truth-Promotion / Narrative-Critical** 才进入 N 系列与人工队列。

# 1｜流水线

## 1.1 主流水线（2026-10-03 修订为两种模式）

**共用前置**：Acquire → Preserve Raw → Normalize →（G0 入库卫生门）→ run 归因 → 守卫 → 执行报告

**A · Discovery Research 流水线**：
**Source Inventory → Content Reading → Observation → Mention / Source Dependency → Association Discovery → Humanistic Selection →（Long Tail 机器处置 ｜ Selected Discovery → 交 B 模式）**

**B · Directed Production 流水线**（原主流水线，语义不变）：
**Acquire → Preserve Raw → Normalize → Extract Candidates → Build Evidence → Resolve Identity → Build Claims/Relations → G0–G6 → AUTO-PROMOTE / HOLD / REJECT → Projection Refresh → Acceptance → 执行报告**

| 阶段 | 必须产物 | 失败时 |
|---|---|---|
| 01 Acquire | source_id、provider、URI、retrieved_at、license/rights、checksum | 记 ERROR；不影响已完成来源 |
| 02 Preserve Raw | immutable raw snapshot / raw item | 禁止覆盖；写失败则该 source 整体停止 |
| 03 Normalize | 标准字段、编码、日期/URI 格式、去重指纹 | 无法确定则保留原值 + warning |
| 04 Extract | Entity/Event/Place/Time/Relation Candidate | 只写 Candidate |
| 05 Evidence | fragment、page/locator、quote/region、source link | locator 不完整则 HOLD |
| 06 Resolve | canonical candidate + alias + confidence + basis | 同名/歧义 HOLD |
| 07 Weave | Claim/Relation Candidate + evidence_ids + relation path | 证据不足 HOLD |
| 08 Gate | G0–G6 结果 + reason code | 任一硬 Gate 失败不得发布 |
| 09 Promote | 仅确定性、无冲突、满足 Contract 的记录进入允许层 | 其余 HOLD/REJECT |
| 10 Projection | 刷新 Agent Read Model | 不得反写 Truth Store |
| 11 Acceptance | run_id、counts、errors、holds、tests、rollback pointer | 批次不完整标 PARTIAL |

> 上表为 **B · Directed Production** 的阶段表。Discovery Research 阶段的产物与失败处理见 §12.2（D01–D05）。两种模式共用 01–03（Acquire / Preserve Raw / Normalize）与 11（Acceptance）。

## 1.3 状态机补充：研究态不得混用 Truth 状态（2026-10-03 新增）

Truth 侧状态机（C3 §4.1）**RAW → CANDIDATE → ADJUDICATED → RUNTIME_ELIGIBLE → PUBLISHED** 继续不变。

**Research 侧使用独立 disposition**：`signal` → `candidate` → `review-worthy` → `selected` → `paused` / `rejected` / `promoted_to_research`。

**硬约束**：Research 侧**禁止**出现 `usable` / `published` / `verified` / `runtime_eligible` 等 Truth 资格词；R15 的"`evidence_gate_audit` 才可标可用"仅约束 Truth 晋级，不被研究态借用。

## 1.2 状态机（C3 §4.1）

RAW → CANDIDATE → ADJUDICATED → RUNTIME_ELIGIBLE → PUBLISHED。RAW 不得当事实输出；CANDIDATE 不得进体验；ADJUDICATED 不得超证据边界；RUNTIME_ELIGIBLE 不得绕过 expression_rule；PUBLISHED 不得失 provenance 链。

# 2｜证据门禁 G0–G6（无人值守裁决规则）

| Gate | 核心问题 | 无人值守处理 | 强制落点（C3 §4.2） |
|---|---|---|---|
| G0 来源完整 | 来源身份/URI/时间/许可/checksum | 缺关键 provenance → HOLD | source_record / source_version |
| G1 对象身份 | 对象身份可信？ | 精确 ID 可继续；同名/别名冲突 → HOLD | entity_identity_review |
| G2 时间语义 | 时间语义明确？ | 确定/区间可继续；约略保留 uncertainty；无法解释 → HOLD | temporal_scope + assessment |
| G3 空间诚实 | 现代坐标/历史空间混淆？ | 现代确定坐标可继续；历史锚点/几何/同景 → HOLD | historical_space_claim |
| G4 证据支撑 | Claim 有可定位 Evidence？ | 无 Evidence → 不得晋级 | claim_evidence_link |
| G5 冲突 | 跨源冲突？ | 有冲突 → HOLD，保留双方 Evidence，不自动选边 | conflict_set |
| G6 发布资格 | 达到发布 Contract？ | PASS 才进 Runtime World / Projection | eligibility / status |

**强制通则（C3 §4.2，已落地 R15）**：任何表要把一行标成"可用/已发布"，必须能在 `evidence_gate_audit` 找到该对象对应门禁记录；无记录者不得晋级。落地形态照 `claims_require_evidence`（deferrable initially deferred 约束触发器，校验在 COMMIT）。详见 §8。

# 3｜三分流：AUTO / HOLD / REJECT

## 3.1 分流表

| **AUTO：无需逐条审核** | **HOLD：到点后再看，不打断无人值守** | **REJECT：自动拒绝/隔离** |
|---|---|---|
| Raw 抓取 append-only；checksum/version；确定性清洗；精确去重；Evidence Fragment；明确 ID 的实体对齐；无冲突且 Contract 明确的结构化晋级；Projection rebuild；批次测试与统计 | 同名实体；别名无法消歧；历史因果；跨源复杂关系；史料冲突；历史地图锚点；Historical Geometry；老照片同景判断；rights/license 不清；AI 解释性 Meaning；低置信 relation；任何需"猜"的内容 | Raw 损坏/无法校验；来源明显重复且 checksum 相同（保留去重日志）；违反 schema 的非法记录；缺失不可恢复主键/来源标识；被规则明确禁止的写入 |

HOLD 只是隔离区，不是待办箱。普通 HOLD 可积累，等未来批量规则成熟再处理；只有高价值、会阻塞当前体验或反复出现的疑难才汇总给拥有者。

## 3.2 强制：review_queue 三分（＝ B-02 正解，M2 第四条）

每条进入 Candidate 及以上层的写入，**必须**在 `review_queue` 留下一条分诊记录，且分诊随写入**同时出生**（不是事后补登）。

- `review_queue` 必有 `triage_outcome ∈ {auto, hold, reject}` 与 `ingest_run_id`（FK → `ingest_runs`）。
- **auto**：禁 Tier C（宪法级数据分级，不得自动发布）；出生即 `approved`；必记 `rule_version`。
- **hold**：出生即 `pending`，进隔离区（reason code 必填）。
- **reject**：出生即 `rejected`，记拒收 reason。
- 分诊行不可被改写（审计不可篡改）。
- 触发器保证上述不变量；`unattended-runner` 的 `jobImages` / `jobCoords` / 拒收路径同步产出 auto/hold/reject 三分行。
- 同 `(ingest_run_id, 对象)` 唯一索引，幂等。

**守卫**：`guard:triage`（验证分诊存在性、Tier C 禁 auto、归因完整）。迁移 `202610020009_review_queue_triage.sql`（R15 后第一条），机制层不触碰既有数据。

## 3.3 强制：研究长尾与 Human Review 解耦（2026-10-03 新增）

**问题**：§3.2 的"Candidate 及以上写入必须留 `review_queue` 分诊行"对 Truth-Promotion Candidate 是正确的；但开放发现一次可产生数千个 Observation / Signal / Association Candidate，若全部变成 `review_queue` 对象，等于用新机制重新制造人工债务（真库当前已有 293 条 `review_queue` 待裁）。

**规则**：

1. **研究候选先有机器 disposition**（§1.3）：`signal` / `candidate` / `review-worthy` / `selected` / `paused` / `rejected` / `promoted_to_research`。
2. **只有进入 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 的对象才创建 `review_queue` 行**；其余研究态对象只在 Research Workspace 内留痕，不进人工队列。
3. **§3.2 的"每条 Candidate 及以上写入必须有分诊行"收窄为：进入 Truth 晋升通道的候选必须有分诊行。**
4. **研究态禁止使用 `usable` / `published` / `verified` 等资格词**（§1.3）；`association_readiness` 使用 `ready` / `limited` / `catalog_only` / `unreadable`。

**守卫**：`guard:triage`（扩展：验证研究长尾未 1:1 制造 `review_queue`）+ 新增 `guard:research`（验证 Research Workspace 无 Runtime Truth 写入）。

# 4｜写权限与可审计性

## 4.1 写权限原则（C3 §8.3）

- LLM / Agent 不直接写主库事实层；产物只进 Candidate / Proposal，写入须经受控 Developer Skill / Contract。
- Raw 永久 append-only；不得覆盖来源原件或原始 API 响应。
- Candidate Reservoir 与 Runtime World 分离；旧数据/开放数据/外部资料先进 Candidate。
- Discovery Candidate / Story Seed / MeaningCandidate / Agent 推理草稿 ≠ 历史事实。
- Projection Builder 只消费已满足条件的 World；不得反写 Truth Store。
- 无人值守不得改变 C0–C4，不得偷偷扩大 Schema / 写权限 / 基础设施。
- **（2026-10-03 新增）Research Workspace 写入上限 `truth_write_ceiling = 0`**：Discovery Research 执行体**不拥有任何 Runtime Truth 写权限**。它可以写 Observation / Signal / Association Candidate / Research Task，**不得写** `claims` / `relations` / `entities` 事实层、`visual_assets` 资格字段，或任何会触发 R15 资格语义的列。
- **（2026-10-03 新增）0 自动 Truth Promotion**：任何 Research Association Candidate 都不得自动晋级 Runtime Truth；它必须先被精选为 Selected Discovery，再走 Directed Production（N01–N06）与 G0–G6。

## 4.2 强制：run 级归因（§0.2 铁律在写权限上的落地，B-03 正解）

任何自动晋级必须可审计到：**哪个 run、哪版规则、过了哪些 Gate、怎么回滚**。

- 每次无人值守写入登记 `ingest_runs`（skill_id / started_at / params / result / errors）。
- `unattended-runner` WRITE 模式在批次开始登记 run；**每一个候选写入（图片/坐标/REJECT 拒收）均带 `ingest_run_id` 出生**。
- 历史既有数据无 run（冻结资产，按拥有者指定留待数据生产）；本强制只约束**未来写入**。

**守卫**：`guard:triage`（归因完整性）+ 注册表 `rollback` 字段必填（§5.1）。

## 4.3 失败 / 重试 / 回滚

| 规则 | 要求 |
|---|---|
| Fail isolated | 单条/单源失败不拖垮整轮；隔离后继续其他 source |
| Idempotent | 同批重跑不造重复事实；依赖 checksum / natural key |
| Bounded retry | 网络/限流等瞬时错误有限重试；语义歧义不靠重试碰运气 |
| No destructive cleanup | 禁止不可逆批量删除、覆盖 Raw、无审计大规模 merge |
| Rollback pointer | 每批保留 run_id / 变更集合 / 事务边界 |
| Stop condition | schema drift / 写权限异常 / 连续高错误率 / 来源结构突变 → 停止相关 pipeline |
| No architecture mutation | 不得自行新增核心表、改 Evidence/Meaning 边界、改写权限、引新基础设施 |

## 4.4 无人值守层数上限（与 C3 PART II 八层地图对齐）

**协议级不变量**：无人值守生产**可达且只允许**到 **L2（Cultural World）候选层 + 仅 E1 类确定性空间关系晋级的事实薄片**，并产出**只读 L4（Discovery / Agent Read Model）投影**；**L3（Meaning & Present）、L5（Experience Runtime）、L6（Participation）、L7（Living Culture）一律不可由无人值守产出**（HOLD 或明确排除），必须人工裁决。本节是 §4.1「Agent 不直写事实层 / Candidate 与 Runtime World 分离 / Projection 不反写」在八层坐标上的具体化，也是 §0.2 铁律「机器负责规模与纪律、人保留文化判断」的层数边界。

| 层（C3 PART II） | 无人值守可写？ | 约束 / 备注 |
|---|---|---|
| **L0** Cultural Sources | ✅ | `source_records` + Raw append-only；禁止覆盖来源原件 |
| **L1** Evidence & Provenance | ✅（受控 skill） | 须有 locator/quote；AI 生成文字不得当 Evidence |
| **L2** Cultural World | ✅ 候选 + **仅 E1 确定性空间关系** AUTO-PROMOTE | 其余一律候选 / HOLD；历史因果·功能·跨源冲突不自动晋级 |
| **L3** Meaning & Present Connection | ❌ **HOLD，永不自动** | 协议 #3 三分流；meaning_candidate / present_connection 必须人审 |
| **L4** Discovery / Agent Read Model | ✅ **只读投影** | Projection 单向，不反写 Truth Store |
| **L5** Experience Runtime | ❌ 分区 | 会话态，逻辑隔离，非生产目标 |
| **L6** Participation | ❌ **明确排除**（协议 #12 第一阶段白名单） | 人的贡献/痕迹，非自动产出 |
| **L7** Living Culture | ❌ **明确排除**（协议 #12 第一阶段白名单） | 活态闭环，回 L0 才成 Source |

**当前实现落差（2026-10-02）**：上述为设计上限。今日真在跑的 `unattended-runner` 因（a）图片/坐标候选作业在 `production-registry.json` 标 `forbidden`（冻结待裁定）、（b）N02–N06 抽取作业尚未实现，实际**仅产 L0**（来源登记 + Raw）；L1/L2 目前只由已完成的**手工老库移植批**（NIGHT-BATCH-003…006，C0 现场授权，非 runner）一次性产出。把上限从 L0 拉到设计的 L2(+L4) 即 Phase 1（N02→L1 / N03–N05→L2 候选 / N06→晋级+L4）。T06 §4、T07 §1.3 为本节派生，冲突以本节为准。

# 5｜生产注册表（机器可读 Contract，强制入口）

## 5.1 Contract（19 字段，§4 M1 落地，是 V1.x「13 字段」的超集）

每个无人值守 Skill / Job 至少声明以下字段，开发总工程师才能加入调度：

`id` / `version` / `kind` / `purpose` / `inputs` / `outputs` / `write_scope` / `gates` / `auto_promote_policy` / `hold_reasons` / `stop_conditions` / `retry_policy` / `tests` / `rollback` / `summary` / `unattended`(`allowed`/`forbidden`) / `unattended_reason`(forbidden 必填) / `gates_enforced_by`(allowed 必写明门禁**靠什么落地**——防"写着有门、其实没有") / `narrative_gaps`(瞄准哪个叙事缺口，见 §0.4)。

`auto_promote_policy` 未声明 = 不自动晋级；`write_scope` 必须列明表名。

**2026-10-03 新增字段（双模式 Contract）**：

| 新增字段 | 要求 |
|---|---|
| `production_mode` | `directed` \| `discovery`。**必填**；决定上游入口、必填字段与验收口径。 |
| `research_scope` / `discovery` | Discovery 模式**必填**：限定的地点 / 时间 / 来源 / 规模；禁止开放式的"随便搜"。 |
| `truth_write_ceiling` | **必填**。Discovery 作业一律 `0`；Directed 作业按 `write_scope` 声明。 |
| `selection_policy` | Discovery 作业必填：AVS 分层、Long Tail 处置、进入 Selected 的条件。 |
| `narrative_gaps` | **改为 Directed 模式必填**；Discovery 模式不要求（改填 `research_scope`）。 |

**强制**：注册表校验器必须检查 `production_mode` 与 `truth_write_ceiling` 的一致性——声明 `discovery` 却 `truth_write_ceiling ≠ 0`，或未声明 `research_scope`，视为未声明作业（整轮不启动）。

## 5.2 强制（M1）

- 机器可读落地＝`specs/data-production/production-registry.json`，由 `scripts/check-production-registry.mjs` 校验（纳入 `pnpm guard`）。
- `unattended-runner` 启动时读取：队列中**未在注册表唯一声明的作业 → 整轮不启动**（不做半截）；声明 `forbidden` 的作业 → 确定性剔除（非失败、不计连续失败），报告列明理由。
- **为什么是闸**：注册表若不被读、或被读不校验，同 `source-providers.json` 一样只是意图。

**守卫**：`guard:registry`。

# 6｜来源门禁（机器可读，强制入口）

## 6.1 S1–S4 分级与规则

`specs/SOURCE_REGISTRY.md` 定义 S1–S4 来源分级（可否直接生成 Evidence）；其机器可读落地为 `data/fixtures/source-providers.json`（见 §6.2，由 `source-gate.mjs` 加载，`guard:source-gate` 校验）。二者为「定义 ↔ 落地」同一机制，非两套来源表。核心规则：S3 只允许现代空间、S4 不得生成 Evidence、未登记 provider 一律拒收。

## 6.2 强制（M4）

- 机器可读落地＝`data/fixtures/source-providers.json`（provider → tier → 门禁），由 `packages/data-access/src/source-gate.mjs` 加载，取回与入库按 provider 查 tier。
- **运维表三项必填**（B-08 闭口）：每个 provider 必须维护 `rate_limit` / `failure_notes` / `last_verified`；未使用过的来源如实记"未使用过（真库 0 行）"，不写"待查"、不伪造验证日期。
- 真库出现的每一 provider 字符串必须能解析（§9.1 `guard:source-gate` ③ 覆盖所有写入路径，无需逐个改脚本）。

**守卫**：`guard:source-gate`（结构 + 运维三字段 + 被代码 import + 真库 provider 全覆盖）。

# 7｜采集意图声明（强制）

## 7.1 每批声明

采集前必须声明：地点 / 主题 / 来源 / 许可 / 半径或关键词 / 预期量。写入时每条数据带 `query_intent` + `acquisition_batch`。

**（2026-10-03 修订）两类采集意图**：

| 意图类型 | 适用模式 | 必填 |
|---|---|---|
| **Narrative Gap Acquisition** | Directed Production | 瞄准哪个 T03 缺口（或另立的登记册缺口） |
| **Discovery Research Acquisition** | Discovery Research | `research_scope`（地点 / 时间 / 来源类型 / 规模上限）+ 研究问题或开放问题 |

**两类意图都必须限地点 / 时间 / 来源 / 规模**。Discovery 意图**不得**写成"把所有相关材料都抓一遍"；它必须回答"这次想弄清什么、凭什么认为这里可能有答案"。

## 7.2 强制（M4.2）

- **未声明采集意图的批次只能进 Raw，不得进入 Candidate。**
- 批次须命中唯一已声明采集意图（269 行来源全部命中即证明机制生效）。

**守卫**：`guard:acquisition`。

# 8｜晋级闸门数据库强制（跨对象）

## 8.1 通则（C3 §4.2，R15）

标"可用/已发布"必须有 `evidence_gate_audit` 对应记录；无记录不得晋级。触发器照 `claims_require_evidence` 形态（deferrable initially deferred，COMMIT 校验）。

## 8.2 已强制 vs 只读监控

| 状态 | 表 |
|---|---|
| 已强制（写入即校验） | claims · visual_asset 链接 · review_queue(Tier C) · visual_assets(`eligibility_status`) |
| 只读监控（guard:promotion 报数，待补强制） | 其余 6 张表；`cultural_*` 尚未覆盖门禁审计 |

`guard:promotion` 不阻断写入，只报"被标可用却无门禁记录"的行数，供分批补强制。

## 8.3 禁反向排除名单

禁止用"反向排除名单 + 空值默认可用"表达资格。`visual_assets` 曾如此（`eligibility_tags default '{}'`，空＝可用），是 1246 张图片污染与 20 张人工排除被洗掉的根因；已改为正面资格字段 `eligibility_status`（默认 `pending_review`）。新对象不得重蹈。

# 9｜守卫体系（本协议的 executable 部分）

> 本协议的全部强制，最终收敛为下面这组守卫。守卫失败 = 协议违反，CI 红线；不得靠改断言让绿（ESC-05 性质判定）。

## 9.1 `pnpm guard` 清单

| 守卫 | 校验内容 | 失败后果 |
|---|---|---|
| `registry` | 队列作业全在注册表且字段全；forbidden 已剔除 | 不启动 |
| `source-gate` | provider 全解析 + 运维三字段 + 被代码 import + 真库全覆盖 | 红 |
| `promotion` | 已标可用却无门禁记录（只读报数） | 红 |
| `triage` | review_queue 三分 + Tier C 禁 auto + 归因完整 | 红 |
| `acquisition` | 来源命中唯一已声明批次 | 红 |
| `identifiers` | 真库无约束词表型标识符须已登记定义来源（`identifier-registry.json`）；derived/coined 的 `defined_at` 必真实存在，coined 必有非空 `definition` | 红 |
| **`research`**（2026-10-03 新增） | ① Research Job 的 `truth_write_ceiling` 与 `production_mode` 一致（`discovery` 必须为 `0`）；② Research Workspace **无任何 Runtime Truth 写入**（`claims` / `relations` / `entities` 事实层、`visual_assets` 资格字段均 0 行）；③ 研究态对象**不得出现 `usable` / `published` / `verified` 等 Truth 资格词**；④ 0 个 Association Candidate 自动晋级；⑤ 每条 `research_observation` 有 `source_id` + `locator/region` | 红 |
| `triage`（2026-10-03 **扩展**） | 原三分 + Tier C 禁 auto + 归因完整；**新增**：研究长尾未 1:1 制造 `review_queue`（只有 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical 才创建分诊行） | 红 |

> 上表为数据生产相关的 **8 道守卫**（原 6 + 新增 `research` + `triage` 扩展）；`pnpm guard` 全量另含 docs / structure / identifiers / reconciliation / escalations / links（见 package.json）。`identifiers` 守卫对应 `specs/data-production/identifier-registry.json` 与 `scripts/check-identifier-registry.mjs`，是 §0.2「规则即强制」在「真库无约束词表型标识符」上的落地——防止复现 `scc_legacy` 挂 10 天无定义连接的孤儿问题。

> **§0.2 铁律对本轮的约束（2026-10-03）**：§3.3「研究长尾与 Human Review 解耦」与 §4.1「`truth_write_ceiling = 0`」**只有在 `guard:triage` 扩展与 `guard:research` 真正落地后才算生效**。在此之前，研究作业一律按 §5.2「未声明作业整轮不启动」处理——**只改文档不改守卫等于没改**（这正是 `source-providers.json` 三处写"取回必须遵守"却无一行代码读它的教训）。回仓实现清单见 `tasks/results/DATA-PRODUCTION-RECON-20261003-result.md` §7。

## 9.2 测试写库隔离

`pnpm test` 在 `<真库名>_test` 快照库跑（新增 `scripts/test-isolated.mjs` + `tests/setup/db-guard.ts` 拒绝非 `_test` 库）。真库按构造不被触碰；测试失败暴露的是**真实库层不变量违反**，不是陈旧测试。

## 9.3 红线

守卫失败即协议违反。任何"让守卫变绿"的改法若是通过弱化规则或删断言，而非修复不变量，一律禁止。

# 10｜验收：你只看执行报告

默认不要求打开数据库逐条验收。每轮一份极短执行报告（§0.5）；正常批次完全不打扰你。结论三值：`PASS`（无需做任何事）/ `PASS WITH HOLD`（正常）/ `STOPPED`（管线异常，需开发总工程师修复）。**有 HOLD 不是失败。**

报告字段：Run / Sources / Evidence / Candidates / Promoted / Held(reason Top 5) / Rejected / Conflicts / Projection / Tests / Escalation(0–3)。

**（2026-10-03 增加）Discovery 模式追加字段**：Observation Yield / Association Yield / Selected Discovery / Novelty / Source Independence / Human Selection Precision（定义见 §0.5）。

> **控制面全绿 ≠ 研究生产成立。** 守卫全绿只证明纪律被遵守，不证明"读懂了内容、发现了值得追的问题"。研究生产的验收以 §0.5 的 KPI 与《宽进与广联》的 G-LINK-1～10 为准。

# 11｜与开发总工程师分工

| 角色 | 无人值守职责 |
|---|---|
| 你 / Product Owner | 不做数据录入员；只处理影响产品方向、文化判断或高价值 Human Review 的少数问题 |
| 开发总工程师 | 实现/运行/测试/修复 Developer Skills；维护 runner / 日志 / HOLD queue / 执行报告；不得越权改 C0–C4 |
| 开发平台（架构建议方） | 暴露跨架构问题时主动提示核心对象模型 / Evidence·Meaning 边界 / 写权限 / L6-L7；提交拥有者确认后方可改 |
| Agent Runtime | 消费受控 World Projection；可发现 Candidate，不拥有 Truth Store 自由写权 |

# 12｜批次白名单：两个 Job Family（2026-10-03 修订）

## 12.1 Directed / Promotion Job Family：N01–N06（保留，重新定位）

只自动生产能补金泽真实体验缺口的数据（§0.4）。N01 Source Refresh · N02 Evidence Fragment · N03 Candidate Extraction · N04 Deterministic Resolution · N05 Relation Candidate Weave · N06 Gate & Projection。

**重新定位**：N01–N06 **不废弃**，其价值在于已把 Source、Evidence、Identity、Relation、G0–G6 与 Projection 的安全边界写清楚。它们是 **Directed Production / Evidence Promotion Job Family**：T03 既有金泽缺口走 N 系列；Discovery 模式精选出的 Selected Discovery 也进入 N 系列完成补证与晋级。

暂不作为第一阶段：Historical Geometry 重建、历史地图配准、同景老照片判定、历史因果自动裁决、跨源冲突裁决、Meaning/Present Connection 自动发布、Participation/Living Culture 正式入库。

## 12.2 Research Job Family：D01–D05（2026-10-03 新增）

| 建议 Job | 职责 | truth_write_ceiling |
|---|---|---|
| **D01 Corpus / Source Inventory** | 按来源性质、原始载体、可读程度盘点 Legacy Reservoir；不复制 Truth。 | 0 |
| **D02 Content Observation** | 文本 / 书影 / 舆图 / 图片 / 结构化数据分别运行 adapter，产出内容级 Observation。 | 0 |
| **D03 Mention & Dependency** | Mention Resolution 候选 + `source_dependency`；不急于 Entity 化。 | 0 |
| **D04 Association Scan** | 运行 A01–A12 或等价方法，生成 Signal 与 Association Candidate。 | 0 |
| **D05 Humanistic Selection** | AVS / 反噪声 / 多透镜审查，输出 Top Priority + Long Tail + Directed Research Task。 | 0 |

> **D01–D05 只是当前建议的 Job family 语义名，不作为宪法冻结代码目录。** 是否最终叫 D01–D05，应在生产注册表与 `skills/` 实现时按 §13 Skill 晋升规则确定。
> **细则不在本协议内重复**：T01–T14 载体读取、Observation Contract、A01–A12、AVS、反噪声与 Legacy Stress Test 由 `specs/data-production/《宽进与广联》` 承载（主协议下属详细操作协议）。
> **算法权重、阈值、Top-K 等参数进入版本化 Registry / Config**，不写入 C2/C3 宪法。

# 13｜Skill 晋升

Candidate → Task Pattern → Draft Skill → Mature Skill → Deprecated。**晋升公式：真实任务 → 重复方法 → 稳定输入输出 → 明确 Gate → 可回滚测试 → 才进生产注册表。不能因"AI 能做"就建 Skill。**

# 14｜冻结规则

- 无人值守目标是扩大可信世界供给，不是扩大未经裁决的"历史内容"。
- 机器处理确定性转换；歧义/因果/冲突/历史空间重建进 HOLD / Human Review。
- Human Review 是质量防线，但用户不是录入员；普通 HOLD 可积累。
- Raw 永久保留；Evidence 可追溯；Candidate 与 Verified World 分离；AI 生成 ≠ Evidence。
- 每个作业必须可重复、可停止、可追溯、可回滚，并有执行报告。
- 当前只服务 Jinze Canonical Experience 真实数据缺口；不以"昨晚新增多少条"为成功指标。
- **（2026-10-03 追加）本研究层只生产 Research World**：Discovery Research 的产出是 Observation / Signal / Association Candidate / Research Question，**不是 Truth**；0 自动 Truth Promotion。
- **（2026-10-03 追加）Gate 分两类而非降低**：G0 作为入库卫生门提前执行；G1–G6 作为 Truth Promotion 门在晋级时集中执行。研究候选不因"未过 G4"而被 HOLD 成待审事实对象。
- **（2026-10-03 追加）Human Review 只处理 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical**；研究长尾由机器保留、合并、降级或淘汰。
- **（2026-10-03 追加）Legacy-first**：第一验证场为沪上经纬 Legacy Reservoir；在关联发现能力通过 LR-ADS-01 压力测试前，**不扩大外部抓取规模**。
- 本层对结构性迁移（如 `cultural_judgments` 表、`entities.relation_to_jinze` 等跨核心对象 / Evidence·Meaning 边界 / 写权限的改动）设「须 Contract + 人审、不进无人值守」的加严要求，是对 C3 §10.3 自主权边界的**执行层强化**，**不削弱** C3 §10.3 赋予开发总工程师在既有 Contract 内直接实施 KEEP/MIGRATE/CLEANUP 的自主权。

**最终一句话：白天由你决定"什么值得成为墨痕"；无人值守让 Developer Skills 安静地把资料、证据和候选关系准备好。机器负责规模与纪律（§0.2 铁律 + §9 守卫），人保留文化判断与最终证据裁决。**

# 15｜生产线通畅性核验（2026-10-02 基线）

> **性质：状态快照，非"完成认证"。** 本节能让每次重跑 `pnpm guard` / 只读基线时快速判断生产线是否通畅。
> **通畅判定标准**：协议层 `guard:*` 全绿 ＋ 执行体（runner）可跑且默认 DRY_RUN ＋ 库层闸门就位 ＋ 旧项目导入通道已验证 ＝ **控制面通畅**；其余为已知缺口，单列。

## 15.1 已验证通畅（控制面 ＋ 旧项目导入面）
- **协议层守卫**：`guard:*` 8/8 全绿（registry / identifiers / acquisition / source-gate / reconciliation / promotion / triage / escalations）。
  - 注：`pnpm guard` 末步串 `pnpm test`，而 `pnpm test` 仍 **21 failed**（ESC-05 已知：真实库层不变量违反 ＋ 测试污染，**不强行改绿**）；故"guard 全绿"指 `guard:*` 子集，不含 `test`。
- **生产注册表 Contract（M1.2）**：`unattended-jobs.mjs` 队列 66 作业与 `production-registry.json` 匹配 `unresolved=0`；未声明作业整轮不启动（exit 3）。
- **执行体 `unattended-runner.mjs`**：三道闸齐备——`MOHEN_WRITE_ENABLED`(DRY_RUN/WRITE)、`MOHEN_ENV∈{dev,staging}`、`source-gate`（provider 须登记）；preflight（M1.3）开跑前剔除；事实驱动报告（禁止模板断言）。
- **库层闸门**：`claims` / `discovery_candidates` / `review_queue` / `visual_assets` / `visual_entity_links` 共 5 表已有晋级/资格强制触发器；`review_queue` 三分（`triage_outcome`）已落地（M2 第四条，迁移 202610020009）。
- **旧项目数据再利用通道已验证**：`hushang-jingwei` 经 `port-*.mjs` ＋ `unattended-runner` 实跑批次 003–006 全 PASS——3308 实体 / 3223 证据 / 519 图 / 334 关系 / 238 坐标（`SHL-LEGACY-COORDS`）已入 `mohen_dev`，均 candidate、零自动晋级、Raw append-only、可回滚（见 `tasks/results/NIGHT-BATCH-LEGACY-PORT-result.md`）。
- **只读合规基线已建立**：`scripts/db-compliance-baseline.mjs` ＋ `tasks/results/DATA-PRODUCTION-BASELINE-01-result.md`，量出 B 组 / E 组可处置差距。

## 15.2 已知缺口（不全通畅之处）
- **验证层未全绿**：`pnpm test` 21 failed（ESC-05）——真实库层不变量违反 ＋ 测试污染；按 MECHANISM-01 结论不强行改绿。建议将 `guard` 与 `test` 在 CI 中解耦，`test` 失败单独跟踪并文档化豁免清单。
- **N01–N06 抽取作业未实现**：注册表已声明 `unattended.source-refresh` / `unattended.evidence-fragment` / `unattended.candidate-extraction` / `unattended.deterministic-resolution` / `unattended.relation-weave` / `unattended.gate-projection`，但 `unattended-jobs.mjs` 队列未生成这些 id、runner 无对应实现——**旧项目内容（2038 PDF / corpus / jp_prefaces 等）尚未自动化抽成 Candidate/Evidence**。这是"再利用"从"来源登记"走向"内容充盈"的关键缺口。
- **B 组库层强制不全**：R15 第二批 6 张核心表（`entities` / `evidence` / `cultural_*` / `historical_*` / `relations`）仍缺晋级强制触发器（现仅 5 表有）；`evidence_gate_audit` 对 5 张 `cultural_*` 表 **0 覆盖**。
- **无自主调度**：runner 为"按需触发 ＋ 截止时间"（M1.2 设计），无 cron / 任务计划常驻；今夜批次为现场授权实跑，非自动。
- **状态表达未收敛**：跨表 `status` / `verification_status` / `eligibility_status` / `triage_outcome` / `review_tier` 共 5+ 种状态列，未统一到 C3 §4.1 单一状态机。

## 15.3 "通畅"判定清单（每次复跑自检）
1. `pnpm guard:registry && … && pnpm guard:escalations` 全 0 退出码；
2. `node scripts/db-compliance-baseline.mjs` 可跑、SELECT 不报错；
3. `node pipelines/legacy/unattended-runner.mjs --until 06:00` 默认 DRY_RUN 不写库、且 `unresolved=0`；
4. `effective_visual_assets` 仍为 8（冻结未被触碰）；
5. `entities` 中 `published`=0、`evidence` 中 `verified`=0（无人值守零自动晋级红线）。
