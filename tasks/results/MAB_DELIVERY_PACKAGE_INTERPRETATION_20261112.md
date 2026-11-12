# MAB 完整设计交付包（20261102）解读报告｜缺失依据盘点与受控吸收方案

- 报告时间：2026-11-12（Asia/Shanghai）
- 解读对象：`D:\work Buddy\2026-08-23-23-12-38\MoHen_MAB_完整设计交付包_20261102`（88 个文件，5 个分区）
- 对照仓库：本地 `mohen-agent-2.0`（= GitHub `main`，基线锚点 `db21cef`，2026-11-01）
- 性质：只读解读。未修改任何仓库文件、未推送、未做数据库操作。
- Owner 指令边界：**只提取有用文件，不用交付包覆盖已完成施工。**

---

## 0｜一句话结论

这个包是 2026-11-02 经 KAD6 十门静态终审签发的设计基线（`MAB_DESIGN_BASELINE_EXIT_PASS`），包内 74 份仓库目标文件**路径全部已存在于 GitHub 仓库、无一缺失**，但其中 **24 份"修订类"目标至今停留在 11-01 旧版**——Codex 只完成了一半工程，另一半的设计更新从未推送；另有 **19 份包外文档（KAD2—KAD5 设计来源、74 目标账、KAD6 验收矩阵）在仓库中完全没有对应物**。这些就是此前施工"缺依据"的缺口。经逐文件哈希比对确认：**缺口与我已完成的施工（MHKA 六章、D00 全链、Gate/Persistence 合同、Studio 原件链）零重叠，吸收这些文件不会覆盖任何已建成果，也不需要重排 M0—M8 计划**——只需在对应批次开工前做三次"受控吸收"。

---

## 1｜这个包的身份（先讲清楚它是什么、不是什么）

| 项 | 事实 |
|---|---|
| 打包日期 | 2026-11-02（KAD6 全量静态终审当天签发） |
| 基线 | GitHub `main@db21cef`（2026-11-01 05:39）——该提交在本地仓库历史中存在，可直接核验 |
| 裁决状态 | `MAB_DESIGN_BASELINE_EXIT_PASS`：**设计准出、工程未授权**（包内 manifest 明写 `engineering_authorization: NOT_GRANTED_BY_THIS_PACKAGE`、`runtime_status: NOT_RUN`） |
| 与 MHKA 关系 | 六份 MHKA 是架构权威，此包不是第七份宪章；包内 MHKA 副本是 11-02 快照，**已被仓库 11-05 Owner 批准版超越** |
| 四个分区 | `repo_target/`（74 份工程目标文件）、`manifest/`（74 目标账 + 字段级责任 + 哈希）、`acceptance/`（KAD6 十门审查 + 全量自检矩阵）、`evidence_only/`（KAD-02 任务书与 KAD2—KAD5 设计来源） |
| 关键计数 | 74 目标（21 CREATE / 53 REVISE）、234 行路径索引、20 项字段级工程责任、85 条 API、152 项产品动作、63 方法 |

它本是交给 Codex 的一次性工程交接包。Codex 做了 M0 盘点（M0_AUDIT_EXIT_PASS）和 M2—M5 一部分就中断；我接手时只拿到仓库、没拿到这个包，所以凡是"设计写在包里、没写进仓库"的内容，我此前只能靠 PLAN.md 附录 A 等二手转述。

---

## 2｜核查方法（结论可复现）

1. 包内 `repo_target/` 76 个文件逐一与仓库同路径文件比对 SHA256。
2. 对每个差异文件，用 `git rev-parse db21cef:<路径>` 取基线版本 blob，判定仓库是"停在基线"还是"基线之后自己演进过"。
3. 对照包内 manifest 的逐文件动作（CREATE/REVISE）与 SHA256，交叉验证。
4. 抽查两版 AGENT_CONTRACT 全文，确认差异方向是"代际替换"而非等价改写。
5. 核对仓库 `tasks/implementation/MAB/PLAN.md` 附录 A 与 11-09 的 D00 交付包接收审计，确认哪些包内容已被转述入库。

**结果分三类：**
- **A 类｜24 个文件：仓库停在 11-01 基线，包里有 11-02 设计更新，从未推送**（真正的缺口）。
- **B 类｜14 个文件：包外文档，仓库中无对应物**（设计来源与验收账本）。
- **C 类｜其余全部：仓库已领先或字节一致**（包括 21 个 CREATE 目标全部已入库；MHKA、data-production、Gate、Persistence、AGENTS/OWNERSHIP、ci.yml 等 38 个文件仓库版本更新，**不得用包回写**）。

---

## 3｜A 类：24 份从未推送的设计目标（真正的"缺依据"）

### 3.1 七份 MHKA 代际合同替换候选（specs/）

| 文件 | 仓库现状 | 包内版本 | 差异要点 |
|---|---|---|---|
| `specs/AGENT_CONTRACT.md` | C 时代 V2.0（L4 Trusted Read Model 体系，10-13 后未动） | mhka.v1 代际候选（7.2KB，双读取合同 + KAD2 混合研究绑定 §9） | 全文换代。包版明确"只有 Owner 授权并同步切换 AGENTS.md 后生效，原 V2.0 归档" |
| `specs/API_TOOL_CONTRACT.md` | 32KB（10-31 版） | 39.3KB | +7KB 工具调用契约增量 |
| `specs/DATA_CONTRACT.md` | 5.7KB（10-18 版） | 8.7KB | 包版含 KAD2—KAD5 融合的封套/资格语义增量；仓库现行版已被 D00 审计确认具备 D00 所需语义，需逐节取增量 |
| `specs/EXPERIENCE_CONTRACT.md` | 2.4KB | 7.1KB | 结构性重写 |
| `specs/FOUNDATION.md` | 1.9KB（09-21 版） | 5.5KB | 基础术语与分层重写 |
| `specs/OPERATIONS_DEPLOYMENT.md` | 7.7KB | 9.8KB | 运维部署增量 |
| `specs/SECURITY_ACCESS_CONTRACT.md` | 33.5KB（10-31 版） | 38.8KB | +5KB 权限/撤权契约增量 |

注意：这 7 份**都不在现行 AGENTS.md 权威路由表里**——它们是"下一代合同候选"，不是现行正在生效的权威。吸收时只能作为施工依据参照与逐节合并素材，**生效切换本身是 Owner 级动作**（AGENT_CONTRACT 包内原文明确要求 AGENTS.md 同步切换）。

### 3.2 三份验收矩阵（specs/requirements/）

| 文件 | 仓库现状 | 包内版本 | 用途 |
|---|---|---|---|
| `api-route-contracts.csv` | 249KB（行数相同、字段更薄） | 343KB（85 条 API 全字段版） | M6"85 API 逐 ID 确认"的字段级验收依据 |
| `u07-action-contracts.csv` | 316KB（同上） | 415KB（152 动作全字段版） | M6"152 动作逐 ID 核验"的字段级依据 |
| `TRACEABILITY_INDEX.md` | 3.0KB（11-01 版） | 5.8KB | 85 API × 152 动作 × 63 方法的追溯总索引 |

M0 盘点当年用过包里的数据冻结了分母（85/152/63），但**文件本体从未入库**——M6 回归时如果没有这两份全字段 CSV，逐 ID 验收只能靠 M0 的二手记录，无法逐字段核对。

### 3.3 七份 Skill 设计更新（skills/）

`mohen-acceptance`、`mohen-experience-prototype`、`mohen-historical-spatial-reconstruction`、`mohen-historical-spatial-source`、`mohen-project-guard`、`mohen-vertical-slice`、`mohen-visual-asset`——七份 SKILL.md 仓库停留在 11-01 版，包内有 11-02 的 MHKA-04 权威更新。注意仓库在 11-06 已对 skills 目录做过一次六阶段对齐（README 与另 5 份 skill 是仓库领先），所以这 7 份吸收时须与 11-06 对齐结果做三方合并，不能直接覆盖。

### 3.4 七份消费侧路由目标（apps/web/app/api/）

`admin/acl`、`admin/publications`、`admin/users/[id]/status`、`explore/entities|events|relations/[id]`、`watch/sessions`——七份 route.ts 仓库停留在 11-01 基线。这是 KAD1 消费侧（WATCH 会话隔离、Admin 权限视图、EXP 实体详情）的**未施工半截**：数据库层的三份 kad1 迁移早已入库（字节一致），但消费这些表的路由修订一直没做。它们正好落在 M5 八维度矩阵的"Admin / WATCH 合法消费"批次上，**不在 PLAN.md 附录 A 的 20 项责任里**，属于附录之外的新增待办。

---

## 4｜B 类：19 份包外文档（仓库完全没有对应物）

| 文档 | 大小 | 价值 |
|---|---|---|
| `evidence_only/KAD-02_…专项任务书_V0.4.md` | 74KB | **KAD0—KAD6 唯一专项任务书**（总索引明确指定），含 Owner 2026-11-02 四项裁决与阶段切换纪律。它是整个 MAB 设计体系的"任务书母本" |
| `evidence_only/KAD2_混合任务委托…合同_现行.md` | 31KB | M4 混合 Agent 的设计正源（同 root 任务 DAG、Delegation/Receipt、T1—T7、外包经济路由）；M4 已施工部分当时就是按它做的，文档本身没入库 |
| `evidence_only/KAD3_Admin知识对象与业务行为验收_现行.md` | 21KB | M5 Admin 批次的验收合同（AdminAuthorizedItemViewV1、六工作视图、轻量 WATCH 复用） |
| `evidence_only/KAD4_九层知识资产存储…V0.1.md` + 最小 DDL 草案 + 正反矩阵 + 责任矩阵 + 终审 | 32+16+8+4+8KB | 九层主数据、13 类 Studio 资产、12 候选表上限、私有原件/Storage 生命周期、分阶段实施策略——M2 已映射、后续存储与治理施工的设计依据 |
| `evidence_only/KAD5_关联双课题…验证设计_V0.1.md` | 8KB | **M7 双课题验收的直接依据**（A 题隋唐大运河、B 题宋代江南运河，逐 revision 复用与知识增量判定） |
| `manifest/MAB_墨痕新架构设计基线_总索引…现行.md` | 24KB | 设计基线总索引：MAB-A—H 工作包、P0 差异表（MAB-P0-01—10）、跨工具交接协议。是理解"为什么这么设计"的最佳单一入口 |
| `manifest/MAB_74份正式工程目标_manifest.csv` + `MAB_完整设计基线_manifest.json` | 56+27KB | 74 目标逐文件动作/SHA 总账（M0 用过其数据，文件未入库） |
| `manifest/MAB_工程目标文件审查总索引_现行.csv` | 305KB | 234 行逐路径归属索引 |
| `acceptance/KAD6_全量工程目标_交付自检矩阵_现行.csv` | 147KB | 十门静态审查的全量逐项矩阵，M6/M7 验收对照物 |
| `acceptance/KAD6_…十门静态审查机器结果.json` + `…双向自检准则与初查报告_现行.md` | 2+8KB | 终审记录与十门结果（十门全 PASS 的证据本体） |

PLAN.md 附录 A 已把 KAD6 字段级差异清单（20 项）转写成 A01—A20 批次映射，这部分不算缺失；其余 19 份均无入库对应物。

---

## 5｜C 类：不许回写清单（保护已建成果）

以下内容仓库版本已领先或等价，**交付包对应文件一律不得覆盖**：

- `governance/mhka/MHKA-00—05`：仓库 11-05 Owner 批准版 > 包 11-02 快照。
- `specs/data-production/` 全部五件（Protocol、Registry、Binding、Gate 合同、Handoff 合同）：仓库 11-06—11-10 含 D00-A/B/C 施工增量（Y01—Y08、C 方法预选、M5 隔离授权），包版本若回写会把 D00 Job 打回未激活、关掉现役隔离链路——这正是 11-09 D00 交付审计里预警过的"危险漂移"，同样适用于本包。
- `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`、`AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md`、`SYSTEM_RUNTIME_ARCHITECTURE.md`、`H1_H2_H3_AND_COMPONENTS_CONTRACT.md`：与包字节一致，无需动作。
- `AGENTS.md`、`OWNERSHIP_MAP.md`、`.github/workflows/ci.yml`、`skills/README` 及 5 份已对齐 skill、全部 `apps/web/lib` 代码：仓库 11-03—11-10 演进版为准。
- kad1 三迁移 + 三回滚：字节一致。

---

## 6｜对后续施工的帮助（按批次映射）

| 批次 | 包内依据 | 帮助 |
|---|---|---|
| 当前 D00 收尾 / 剩余 57 方法 | KAD-02 任务书 §04、总索引 §3.2 | 明确 D00—D02 优先级与"找到≠得到"边界；无新信息冲突 |
| M5 Studio/Admin/WATCH 八维度矩阵 | KAD3 合同 + 7 份 route.ts 目标 + KAD4 §5/§9.5 | Admin 知识视图、WATCH 会话隔离、EXP 实体详情的**唯一完整设计**；消费侧路由修订可直接按包目标 + 当前 HEAD 三方合并施工 |
| M4 混合 Agent 剩余项 | KAD2 合同 | 委托/回执/T1—T7 的设计正源，核对已施工部分是否有遗漏语义 |
| M6 全量回归 | api-route-contracts.csv（85 API 全字段）、u07-action-contracts.csv（152 动作全字段）、TRACEABILITY_INDEX、KAD6 矩阵 | 逐 ID 字段级验收的唯一依据；没有它们 M6 只能靠 M0 二手记录 |
| M7 KAD5 双课题 | KAD5 验证设计 | 验收脚本、逐门编号（A1—O1）、跨题复用 13 字段记录格式的直接依据 |
| M8 权威切换 | 7 份代际合同候选 + FOUNDATION | M8 做 AGENTS.md 权威切换时的正式替换文本来源（生效仍需 Owner 授权） |

---

## 7｜对施工计划的影响评估

**结论：M0—M8 不需要重排，无批次冲突，只有三处输入补齐动作。**

固定四问：

1. **本阶段按计划应完成什么**：按 PLAN.md 继续推进当前主线（D00 剩余环节收口、M5 全链真实可用性），不受本包影响。
2. **是否全部完成**：已完成的施工全部有效，无一被包内内容否定或取代。
3. **未完成的原因**：过去缺的只是"依据文件不在库里"，不是计划缺项——20 项字段责任已在 PLAN.md 附录 A，85/152/63 分母已在 M0 冻结，74 目标路径全部存在。
4. **对下一步的影响**：需要插入三个**不改变批次顺序**的吸收动作（见 §8），其中只有"消费侧 7 路由"是真正的新增施工工作量，且天然属于 M5 Admin/WATCH 批次。

**一处需要登记的修正**：M5 的 Admin/WATCH 批次待办里应补上"7 份消费侧 route.ts 修订"（KAD1 消费侧未施工半截），因为它们不在 PLAN.md 附录 A 的 20 项内，不登记就可能漏做。

---

## 8｜建议的受控吸收方式（防覆盖原则）

1. **第一吸收（随时可做，纯归档，零风险）**：把 19 份 B 类文档按"设计证据"身份入库（建议 `tasks/implementation/MAB/inputs/mab-package-20261102/` 原样收存 + 在 PLAN.md 或 progress.md 登记清单与 SHA）。只增不改，不进权威路由。
2. **第二吸收（M5 Admin/WATCH 批次开工时）**：7 份 route.ts + 7 份 SKILL.md 作为 REVISE 施工目标，按"包目标 × 当前 HEAD × 11-06 skills 对齐"三方合并逐条实施，禁止整文件覆盖；逐项按 CODE_PRESENT → VERIFIED_ISOLATED 记账。
3. **第三吸收（M6 开工前）**：3 份 requirements 矩阵做逐字段 diff 合并入库（保留仓库行、以包版补全字段）；7 份 specs 代际合同以"参照 + 逐节合并"方式吸收，**生效切换留给 M8 并需 Owner 具名授权**（AGENT_CONTRACT 包内原文即如此要求）。

**红线**：§5 的 C 类清单任何情况下不得用包回写；吸收过程中若发现包设计与仓库现行实现冲突（尤其 data-production/Gate 方向），按 MHKA 与现行施工为准，冲突登记到 target-diff.csv，不静默取舍。

---

## 9｜附录｜A 类 24 文件清单（包内 SHA 均经 manifest 校验，仓库 blob = 基线 db21cef）

| # | 路径 | 类别 | 受影响批次 |
|---|---|---|---|
| 1 | specs/AGENT_CONTRACT.md | 代际合同候选 | M4/M8 |
| 2 | specs/API_TOOL_CONTRACT.md | 代际合同候选 | M4/M6/M8 |
| 3 | specs/DATA_CONTRACT.md | 代际合同候选（需逐节 diff） | M5/M6/M8 |
| 4 | specs/EXPERIENCE_CONTRACT.md | 代际合同候选 | M5/M8 |
| 5 | specs/FOUNDATION.md | 基础术语换代 | M8 |
| 6 | specs/OPERATIONS_DEPLOYMENT.md | 运维部署契约 | M8 |
| 7 | specs/SECURITY_ACCESS_CONTRACT.md | 权限/撤权契约 | M5/M6/M8 |
| 8 | specs/requirements/api-route-contracts.csv | 85 API 全字段矩阵 | M6 |
| 9 | specs/requirements/u07-action-contracts.csv | 152 动作全字段矩阵 | M6 |
| 10 | specs/requirements/TRACEABILITY_INDEX.md | 追溯总索引 | M6 |
| 11 | skills/mohen-acceptance/SKILL.md | Skill 更新 | M6 |
| 12 | skills/mohen-experience-prototype/SKILL.md | Skill 更新 | M5/M6 |
| 13 | skills/mohen-historical-spatial-reconstruction/SKILL.md | Skill 更新 | M6 |
| 14 | skills/mohen-historical-spatial-source/SKILL.md | Skill 更新 | M5/M6 |
| 15 | skills/mohen-project-guard/SKILL.md | Skill 更新 | M6 |
| 16 | skills/mohen-vertical-slice/SKILL.md | Skill 更新 | M6 |
| 17 | skills/mohen-visual-asset/SKILL.md | Skill 更新 | M6 |
| 18 | apps/web/app/api/admin/acl/route.ts | 消费侧路由 | M5 Admin |
| 19 | apps/web/app/api/admin/publications/route.ts | 消费侧路由 | M5 Admin |
| 20 | apps/web/app/api/admin/users/[id]/status/route.ts | 消费侧路由 | M5 Admin |
| 21 | apps/web/app/api/explore/entities/[id]/route.ts | 消费侧路由 | M5/EXP |
| 22 | apps/web/app/api/explore/events/[id]/route.ts | 消费侧路由 | M5/EXP |
| 23 | apps/web/app/api/explore/relations/[id]/route.ts | 消费侧路由 | M5/EXP |
| 24 | apps/web/app/api/watch/sessions/route.ts | 消费侧路由 | M5 WATCH |

---

**报告状态**：`READ_ONLY_INTERPRETATION_COMPLETE / NO_REPO_CHANGE / NO_OVERWRITE_RISK_FOUND`
**待 Owner 决定**：是否按 §8 的三次受控吸收执行（第一吸收纯归档、零风险；第二、三次绑定到对应批次开工点，不提前打断当前 D00/M5 主线）。
