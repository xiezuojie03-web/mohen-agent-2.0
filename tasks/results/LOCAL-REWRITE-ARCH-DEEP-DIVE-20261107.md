# 墨痕｜新架构深度解读补充 · 发展节奏 / 当前重心 / 知识资产生态 / 用户类别 / 施工计划全解

> 生成：2026-11-07 · 作者：总系统工程师（CodeBuddy）· 承接 `LOCAL-REWRITE-ARCH-DIFF-REPORT-20261107.md`
> 依据：MHKA-01/00/03、KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md、MAB PLAN.md V1.2、progress.md（至 2026-11-07）、target-diff.csv

---

# 第一部分｜发展节奏与当前重心

## 1. 发展节奏：三个成熟度阶段（不是建设阶段编号）

墨痕的"节奏"是**成熟度递进**，由资源与知识积累驱动，不是按模块排期：

| 成熟度 | 目标 | 关键 |
|---|---|---|
| **Ⅰ** | Agent 真正能检索外部及已有知识来源、合法完成材料研究，驱动稳定的创作与可复用资产积累 | **Studio 是现实闭环的关键** |
| **Ⅱ** | 可编辑作品经运营审核、合法公开后，以 WATCH 实现沉浸式观看阅读 | WATCH 承接作品消费 |
| **Ⅲ** | 知识库有效资产和关系足够丰富后，EXP 自主探索深度自然成长 | 资产稀疏时"诚实低覆盖"，不伪装已建成历史宇宙 |

**三种"顺序"必须分清（这是理解节奏的钥匙，MHKA-01 §55）**：
1. **长期价值层级**：EXP 探索发现 = 核心目的；Studio = 自驱动研究与资产生长能力；WATCH = 作品消费与传播桥梁。
2. **分阶段建设顺序**：先强化 Studio → 再 WATCH 提供近期内容体验 → 逐步提高 EXP 深度。
3. **用户进入路径**：始终允许**独立进入** Studio / WATCH / EXP，不设"创作→观看→探索"的必经漏斗。

> 换句话说：**战略上 EXP 是灵魂，但建设节奏上 Studio 先打底、WATCH 先出内容、EXP 靠资产积累自然成熟。** 三者独立可达，不搞漏斗。

## 2. 当前重心（KAD1 建设重点，MHKA-01 §44）

在不改变历史九段建设历程的前提下，本轮优先保障五件事：

1. **D00–D05 可靠生产 + 长期知识资产**（生产链要真正能跑，且沉淀可复用资产）
2. **同题内外 AI 从首次真实任务协作**（墨痕 Agent 与外部 AI 同根任务互补，非先外包后挂名）
3. **Studio 真实研究创作**（一句话委托 → 真实研究 → 成稿）
4. **Admin 可阅读具体知识条目**（Owner 能看到"这条知识是什么/来源在哪/谁在研究/缺什么"）
5. **轻量 WATCH 消费合法作品**（读已发布的同一 WorkRevision，失败/空态/撤权守卫）

**明确压后/暂停（不是删除）**：UXD-01 暂停但未终止；EXP 保留长期目标但不作为本轮依赖；L6–L8 延后激活。

---

# 第二部分｜知识资产生产与管理（与"纯数据生产链"的最大差异）

## 3. 核心变化：从"一次性生产流水线"到"三轨知识资产生态"

**旧模式（纯数据生产链）**：找资料 → 建记录 → 抽标题/文本 → 连实体 → 出 G5 → 展示。研究**过程不沉淀**，只有"最终合格事实"才入库。

**新模式**：在保留原 D00–D05/L0–L5/G0–G5 生产链的基础上，**新增一层"知识资产生命周期管理"**，把研究创作过程中产生的每一类中间产物都变成"有身份、有版本、可复用、可追溯"的长期资产。

### 三类资产三分（绝不混同）

| 资产类别 | 是什么 | 由谁产生 | 能否公开 |
|---|---|---|---|
| **正式知识对象** | L0 来源 / L1 读取 / L2 证据 / L3 世界 / L4 发现 / L5 消费分面 | D00–D05 生产链 + 独立 G0–G5 资格 | 仅获对应 G 资格后 |
| **Studio 研究/创作资产（13 类）** | 假说、笔记、分镜、引用等研究中间产物 | 创作者/Agent 研究过程 | **不能**当历史事实，除非晋级获 G |
| **作品/表达资产** | WorkRevision、DirectorPlan、PublicationSnapshot | Creator/Operator 创作审核 | 运营审核 + 合法发布后 |

### 13 类工作资产（`asset_kind`，不是 13 张表）

`research_brief`（研究简报）/ `source_anchor`（来源锚点）/ `reading_note`（阅读笔记）/ `evidence_note`（证据笔记）/ `spacetime_candidate`（时空候选）/ `relation_hypothesis`（关系假说）/ `humanistic_insight`（人文洞察）/ `research_collection`（研究集合）/ `director_plan`（导演方案）/ `media_selection`（媒资选择）/ `work_revision`（作品修订）/ `citation_snapshot`（引用快照）/ `consented_feedback`（同意反馈）

### 五个独立谓词（状态绝不能用一个 `approved` 布尔值覆盖）

1. `saved` — 已写入稳定修订
2. `reuse_ready_for_research` — 可在合法研究中复用（需项目授权 + 有效来源 + 依赖闭包）
3. `valid_gate_qualification_for_purpose` — 获独立 Gate 的用途资格
4. `editorial_publication_approved` — 运营审批通过
5. `rights_permitted_for_action` — 某动作的媒资/文本权利当前有效

### 不可变修订 + 三维状态

- **身份**：`asset_id` 跨修订稳定；`revision_id`/`revision_no` 只增不改；引用都是"身份+版本"，不接受隐式"最新版"。
- **三维状态**：`content_state`（WORKING/SNAPSHOTTED/REUSE_READY/ARCHIVED）+ `access_state`（AUTHORIZED/RESTRICTED/REVOKED）+ `freshness_state`（CURRENT/STALE/UNKNOWN_DEPENDENCY）。

### 物理承载（§19，最小服务组）

```
studio.projects                    项目身份（首期 Owner-only）
studio.asset_heads + asset_revisions   13 类资产 head + 不可变修订
studio.asset_links + use_events        多态引用 + 实际使用事件
studio.delegations + execution_receipts 内外 AI 委托 + 不可变回执
（复用）publication.work_revisions / public.director_plans / public.assets
（复用）source/evidence/world/meaning/read_model/control  正式知识真源
```

### 8 类核心服务

`CreateAsset/SaveRevision`、`AttachReference/ResolveReferences`、`SearchStudioAndL`、`ForkAssetForProject`、`RequestFormalProduction`、`CreateWorkRevision/SubmitWork`、`EditorialPublish/WithdrawWork`、`ApplyInvalidation/Revalidate`。

### 这为什么是"长期壁垒"

MHKA-01 明确：**长期竞争壁垒 = 持续生长、可追溯、可关联、可复用的合格知识资产及其研究能力，不能用作品数量代替。** 旧的"作品库"是一次性产出；新的"知识资产生态"让每次研究都留下可被下一题复用的资产（KAD5 双课题 B 必须真实引用 A 的 `asset@revision` 就是验证这一点）。

---

# 第三部分｜用户类别

## 4. 三种维度的"人"（治理身份 / 执行上下文 / 产品用户）

### 4.1 五种责任身份（MHKA-00 §2，治理层）

1. **项目 Owner** — 最终决定使命/产品方向/核心体验/架构边界/重大成本/授权恢复
2. **工程开发者/开发总工程师** — 技术实现自主负责，主动识别风险（我当前的角色）
3. **受托研究 Agent / 生产执行责任** — 可规划/检索/调用工具，但**无正式 D/L 写入权**，须经受控 Production Tool
4. **Creator 创作者 + Operator 运营负责人** — 选题/编辑/确认；审核/发布/撤回
5. **独立 Gate Reviewer** — 仅在被正式授权时执行 G0–G5 资格审查/追加审计/受控撤权（业务资格审核，**不是与 Owner 平级的终裁机关**）

### 4.2 四类执行上下文（运行层，不是四套 Skill 平台）

`CTX-ENG`（工程维护）/ `CTX-PROD`（可信生产）/ `CTX-STUDIO`（创作运营）/ `CTX-EXPLORE`（公众探索）。同一自然人兼多角色时，按活跃角色/项目/操作/对象/结果**逐次单独鉴权**（R1 POL-04）。

### 4.3 产品用户（MHKA-01 §2 + MHKA-02）

- **公众**（Viewer/Explorer）— 初识历史的普通人、重看熟悉街区的人、兴趣者、深入调查的作者；**不要求先懂史料分级/GIS/数据库**
- **Creator 创作者** — 一句话委托研究、选题、局部修改、确认
- **Operator 运营者** — 作品审核、发布/撤回、资源权限预算运营
- **独立 Reviewer** — 专业资格签发

> 关键：产品面向"非专业用户可直接开始"，不要求掌握专业术语；但后台的知识资格/权利/权限仍由专业角色严格把关。

---

# 第四部分｜施工计划全解（MAB PLAN.md V1.2）

## 5. 施工总框架：M0–M8，当前 M5 补救期

### 5.1 阶段状态与"已完成 / 待完成"明细

| 阶段 | 裁定 | ✅ 已完成（可继承，不重做） | ⬜ 待完成（真实缺口） |
|---|---|---|---|
| **M0** 审查级盘点 | EXIT_PASS（冻结） | 234 路径/74 目标/85 API/152 动作/63 方法/19 Skill/DB 权限盘点 | 无（冻结，只处理 M5 反推的具体差异） |
| **M1** 安全底座 | CONDITIONAL_EXIT | 受限身份、短时 DB 身份、RLS/ACL、伪造/过期/禁用/登出拒绝、隔离迁移回滚 | C01 生产身份最小权限、C02 会话撤销、C03 凭据失效、C04 安全恢复（真实 Owner 会话） |
| **M2** 原件/资产 | CONDITIONAL_EXIT | UTF8 候选、私有 Storage/PG/HTTPS、SHA、不可变 revision、证据桥、同 backup_id 恢复 | C01 生产原件迁移恢复、C02 非 UTF8 载体读取、C03 授权复用；**真实 NAJ 原件 L0–L2 首读/回放/撤权** |
| **M3** D 链/Gate | CONDITIONAL_EXIT | 独立 HTTPS 协议、专用 Signer/Reader、Runner 精确资格读取、撤权客户端 | C01 正式独立服务部署、C02 真实 Reviewer 与资格、C03 恢复；**真实 D00–D05 + G0–G5** |
| **M4** 混合执行器 | CONDITIONAL_EXIT | 委托/计划/候选收包/T1–T7 基础/恢复 | C01 正式受控派工、C02 真实混合外发预算、C03 恢复费用核证、C04 Studio 逐业务验收 |
| **M5** 真实作品切片 | HOLD（REMEDIATION_ACTIVE） | ST01 项目绑定/不可变修订/幂等；Studio/Admin/WATCH 局部工程 | **八维度闭环**（见下） |
| **M6** 全量回归 | NOT_STARTED | — | 85 API/152 动作/63 方法/19 组件全量回归 |
| **M7** 双课题 | NOT_STARTED | — | KAD5 A（隋唐大运河）→B（宋代江南运河城镇）跨题复用 |
| **M8** 生产切换 | NOT_STARTED | — | 生产授权启用、旧代际退役、Owner 签收 |

### 5.2 M5 八维度验收矩阵（必须由**同一真实作品**贯通，不能八个演示拼凑）

1. 自然语言创作入口（ST-01）
2. 内外 AI 混合协作（M4）
3. 真实来源/证据/D/L/G 生产（ST-02/03/04）
4. 13 类知识资产沉淀（M4-C04/Admin）
5. Studio 真实创作（ST-05/06/07，H1/H2/H3 + 19 组件）
6. Admin 知识资产管理（F05）
7. 独立 G5 + 媒资权利 + 发布（ST-08/09）
8. WATCH 同修订合法消费与撤权

### 5.3 施工顺序（关键依赖链，PLAN §4）

```
【A线】M1 隔离 Owner 会话/最小权限/撤权/恢复
        → M2 真实 NAJ《松江府志7》：核定 canvas/page locator
              → 官方来源取字节（≤10MiB）→ 私有 Storage → SHA 回读
              → L0→L1→L2 首次/回放/撤权（PG+HTTP 正反）

【B线】M4 受控 Provider 执行器（并行，不依赖 A 线）
        → 复用 Delegation/Tool Registry/预算/Receipt/Guard/唯一 Runner
        → 合成输入 PG/HTTP 正反 → 真实费用模型 → 失败 HOLD/恢复

【汇合】M3 真实 D00–D05 + 63 方法绑定 + 独立 Reviewer/G0–G5
        → M4 真实混合协作（Agent+外部 AI 互补、费用、Receipt、恢复）
        → M5 ST-01→ST-09 同一作品 → 八维度验收 → Owner 体验签收
```

**硬依赖（不可跳过）**：
- ST02（真实原件 L0–L2）未完成前，**不启动依赖真实材料的 ST03**。
- ST04（正式生产请求）必须是 **Creator 显式请求**，不能由 ST01 自动触发。
- **真实材料外发/模型调用，必须等 M1–M3 来源、权利、Owner、独立资格前置满足**；B 线合成测试可先行，但不得向真实材料发起调用。

### 5.4 当前关键阻塞（progress.md 11-07 就绪审查）

| 环节 | 状态 | 具体缺口 |
|---|---|---|
| ST01 创作入口 | 局部 PASS | Brief 绑定/幂等已验证，研究执行未通 |
| ST02 原件读取 | **DATA_BLOCKED** | Storage 桶 0；NAJ 页未持久化；L0/L1/L2 未跑 |
| ST03/ST04 | NOT_READY | 依赖 ST02；显式生产请求未完成 |
| ST05 受控执行 | **CODE_NOT_READY** | `directorExternalProcessingBlocker` 恒阻断；需受控执行适配 |
| LLM 配置 | 需统一 | 有 DEEPSEEK_API_KEY 等，缺 MOHEN_LLM_BASE_URL/API_KEY 映射 |
| 费用模型 | 需补 | tool-ledger 用内部 credit（LLM=1），非真实币种/token 成本 |
| 13 类资产 | 部分 | 10 类私有候选 + 3 类规范对象有矩阵；完整专业语义不完整 |
| G5/发布 | HOLD | canonical media-selection POST 仍 503；正式 Reviewer 未启用 |

### 5.5 20 项补充工程责任（A01–A20，PLAN 附录 A）

覆盖 20 个既有源码路径需按新架构适配（如 `studio-research.ts` 分离短期 checkpoint 与长期修订、`tool-ledger.ts` 补真实费用、`publication.ts` 发布原子性、`run.mjs` 保持唯一 Runner 等），每项含正验/反验/恢复边界，责任落在 MHKA-02/03/04/05。

---

## 6. 一句总结（给施工排期的落点）

**当前唯一要务 = 用同一项真实作品跑通 M5 八维度垂直切片。** 排期顺序固定为：先 A 线补真实原件（ST02 是当前最大硬阻塞），B 线并行补 Provider 执行器（纯代码可先动），汇合后依次补 M3 真实 D/G 链 → M4 真实混合 → M5 全链，最终由 Owner 亲自完成一次真实作品的创作、Admin 核查、WATCH 消费并签收。
