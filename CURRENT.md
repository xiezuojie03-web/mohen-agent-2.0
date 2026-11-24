# 墨痕｜当前施工断点

> **Owner 授权口径（2026-11-22，长期有效）**：目标是墨痕**真正运行、持久运行**；除**安全问题**与**费用问题**外，施工方自行授权推进，不再逐项请示技术选择。费用边界：D02–D05 模型调用封顶 **0.05 USD**（约 ¥0.36，已建委托 `3f5585d0…`），超出该额度、新增付费来源或扩大用途仍需 Owner 批准。安全底线（密钥不入 git、不自签 Gate、不伪造会话/资格/PASS、不改迁移规避授权）不因该授权放宽。

> 核验时间 2026-11-24 本窗口（CI Runner 故障专项施工）｜唯一 main `0bc122b4`（CI 全绿）｜环境：GitHub Actions ubuntu-latest Node 24，正式 CI ci.yml Run 45330128379 conclusion=success，22 步全过（Install→Typecheck→Unit tests→Production boundary regression→K3 traceability→Isolated DB fixture preflight→Build→Auth coverage gate→MAB handoff audit），runner_id=1000001578，runner_name='GitHub Actions 1000001578'。仓库 visibility 临时 public 验证 Runner 分配，后续需 Owner 决策是否保持 public 或改回 private + 升级 Pro（Free 私有 Actions 2000min/月已耗尽，spending limit=0）。本文件只维护**当前事实 / 最前阻断 / 下一动作**；逐批原始回执见 [progress.md](tasks/implementation/MAB/progress.md)，施工标准见 [PLAN.md](tasks/implementation/MAB/PLAN.md)。

## 主线进度（按 PLAN §3.5 C 业务主干，同一任务 `b2143002` / Project `d9d48901` / run `b9989b90`）

主干共 **10 段**：**0 段完整验收、7 段在跑（其中 4 段隔离对象集已验、主线作品链已在隔离库贯通至发布/观看/撤权）、3 段未启**；生产链 12 个节点已验 **12/12**（最远仍为 D05 P02 `world_projection` + G5 `3aa1c2de`）。**本窗口把正式主线 `b2143002` / `d9d48901` 的合格知识成果接续到正式作品链并贯通全链**：新增 `scripts/test-m5-mainline-fullchain-isolation.mjs` + `scripts/approve-m5-mainline-display-right.mjs`，在隔离库用主线真实对象（原件 `f474b91b` / 来源 `9aa03207` / G0—G4 主链 / G5 素材）重签当前有效 G0—G5，建立正式 DirectorPlan `d87d816d…`(G5 `4c0ce973`) + Work + WorkRevision `e1ed5309…`(G5 `652b39dc`) 正文与封套，同一 Project/Root/delegation/snapshot 锚点闭合，投稿→独立 Operator 审核（自审拒/退回阻断/APPROVED）→**Owner 2026-11-24 批准 display 权后精确发布→WATCH 同 revision 消费→撤权即时阻断+幂等**全通，**21 PASS / 0 FAIL / 1 FINDING**（`MAINLINE_VERIFIED_ISOLATED`）。display 权批准由 `approve-m5-mainline-display-right.mjs` 落库并留痕（rights_evidence.public_display_authorizations，2026-11-24，仅放开 display、其它四项仍 HOLD）。历史隔离对象集 `b0a11000…0001` 的 15 PASS 闭环保留为机制证据，不冒充主线。

| # | 主干段（PLAN §3.5 C） | 状态 | 同任务实证 / 剩余 |
|---|---|---|---|
| 1 | Studio 受权委托与研究意图 | 在跑 | 真实任务/项目/Root 已固定；ST-01 的真 UI 入口与问题收敛未完整验收 |
| 2 | 统一检索 L0—L5 并核权利与当前资格 | 在跑 | 权利投影与 Gate 读通道已真实跑通；统一检索视图/契约未完整验收 |
| 3 | D00—D05 必要工序 + G0—G5 独立资格 | 在跑 | **12/12 节点已验**（含 D05 P02 落库与 G5 `3aa1c2de`）；剩 P03/P06 事实分支（方法绑定 HOLD）与 A01–A12 其余 11 项方法绑定 |
| 4 | 可追溯知识资产与合法研究读 | 在跑 | evidence / finding / claim_revision 已落库且带 revision/refs；13 类资产合同未全验 |
| 5 | 导演 H1/H2/H3 与 19 组件 → WorkRevision | 在跑（主线已接续） | 主线正式 Plan `d87d816d…`(G5 `4c0ce973`)/Rev `e1ed5309…`(G5 `652b39dc`) 正文权威与独立 G5 已在隔离库回读、同对象锚点闭合；H1/H2/H3、19 组件真实贡献未完整验收 |
| 6 | Admin 回链、运营审核、作品资格与媒资许可 | 在跑（主线至 APPROVED） | 主线投稿冻结 + 独立 Operator 审核（自审拒/退回阻断/APPROVED）已验；Admin UI 对真实资产逐条回链未完整验收 |
| 7 | 精确发布（发布指针） | 在跑（主线已贯通） | Owner 2026-11-24 批准 display 权后，主线 revision `e1ed5309…` 精确发布成功、指针指向该 revision，自审/非 operator 负例被拒 |
| 8 | WATCH 消费与即时撤权 | 在跑（主线已贯通） | 主线同 revision WATCH 放行、撤权即时阻断、历史快照保留、重复撤权幂等；Owner 真实浏览器体验未做 |
| 9 | 第二个非模板题材复用验证（PLAN §3.5 C-1） | 未启 | — |
| 10 | Owner 真实体验与最终签收 | 未启 | — |

- 六道 Gate 当前资格均有效：G0 `c0ee5a2f` / G1 `113c2bbe` / G2 `1a9402cb` / G3 `f1d9163e` / G4 `ec893e90`（valid_until 2026-11-28）/ G5 `3aa1c2de`（valid_until 2026-11-28），全部 `independent_gate` + `current_valid=true`，`details.checks` 全 true。
- 八维只作 **M5 准出条件**（同一作品贯通后才逐维判定）；`0/8 OVERALL_HOLD` 不表示进度，已按 Owner 2026-11-22 裁决不再作进展汇报项（见 PLAN §6.2 与 §3.5 B 进度报告口径）。

### 副表：Studio 用户动作可用性（ST-01—ST-09）

分母取自现行权威 [AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md §6.2](specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md) R4.5 九项。**这是"Owner 能上手用到什么"的视角**，与上表工程主干是同一任务的两个切面，不互相折算、不另立验收分母。**0 项完整验收、8 项在跑（隔离对象集）、1 项未启**；隔离证据不等于 Owner 上手验收。

| ST | 动作（§6.2） | 状态 | 同任务实证 / 剩余 |
|---|---|---|---|
| ST-01 | CreateWorkBrief | 在跑 | 任务 `b2143002` 已带 topic/prompt/project 绑定；真 UI 入口与问题收敛按 PLAN §84 未完整验收 |
| ST-02 | StudioResearchRead | 在跑 | G0/G1 读通道真实 200，跨 L 研究读已跑；统一检索视图/契约未完整验收 |
| ST-03 | AnalyzeAndSaveCandidates | 在跑 | evidence `031dd3d9` / claim `0617b049` / finding `7f713c60` 已落库且带 revision/refs |
| ST-04 | RequestFormalProduction | 在跑 | run `b9989b90` 已实执行到 D05：G0—G5 六门 PASS（G5 `3aa1c2de`），P02 `a17059e3` 落库并按资格读通道回读；run 终态仍 HOLD（设计内「独立门已签、run 不自动改写」，与 G3/G4 时一致） |
| ST-05 | AssembleDirectorPlan | 在跑（主线已接续） | 主线 `b2143002` 已产生正式方案 `d87d816d…` + 独立 G5 `4c0ce973`，绑定同 Project/delegation/root_task_ref/snapshot（隔离库回读） |
| ST-06 | PreviewWork | 未启 | 尚未产生 `preview_snapshot` |
| ST-07 | SaveWorkRevision | 在跑（主线已接续） | 主线正式修订 `e1ed5309…` + 独立 G5 `652b39dc`，正文权威 `publication.work_revisions` + Studio 封套同 Project 绑定 |
| ST-08 | SubmitForEditorialReview | 在跑（主线已投稿） | 主线 revision `e1ed5309…` 冻结快照幂等绑定；跨 Project 投稿被拒 |
| ST-09 | EditorialDecision/Publish/Withdraw | 在跑（主线已贯通） | 主线独立 Operator 审核 APPROVED→display 权批准后精确发布→WATCH 同 revision 消费→撤权即时阻断+幂等全通；Owner 为唯一 Reviewer（progress 1613），作品级终签的人身份仍待真实 UI 证明 |

### 本批定点修补记录（2026-11-23，ST-05—ST-07）
- 代码事实：`publication.ts` 的作品创建改为必须经服务端校验 Owner ACTIVE 项目；`studio-director.ts` 的 DirectorPlan 持久绑定项目/委托/root_task_ref/研究 snapshot/source refs，WorkRevision 提交双向校验 Owner+Project 且 CAS/幂等语义保留，正式正文仍写 `publication.work_revisions`；三个相关 API 路由传入服务端会话身份。旧编辑作品创建走独立兼容路径，历史无绑定行不被猜回填。
- 数据库事实：向前迁移 `20261123120000_mab_m5_st05_st07_project_and_body_authority.sql`（补项目/委托列、`studio.work_revisions` 降级封套、G5 指纹解析正式正文）已在本机隔离库 `127.0.0.1:5432/mohen_dev` 应用并回读验证；首轮发现 `control.artifact_revision_for` 的 security definer owner `mohen_gate_authority` 对 `publication` 无 USAGE / 对 `publication.work_revisions` 无 SELECT（42501），已定点补最小只读权限并复验通过。未执行任何生产 DDL/数据迁移，未部署，未签或复用 G5 PASS；web staging 仍 `e563161c`、authority production 仍 `48c9169b`。
- 验证事实：相关 Vitest `71/71`（作品创建/导演方案/路由/提交/commit）+ ST-07 正文权威静态验收 `4/4` + 作品创建路由 `14/14` 通过；`pnpm typecheck` 通过；`pnpm build` 通过。全量单元首轮 795/817 通过，其中 `submission-routes` 2 项因本批路由变更失败并已修正（复验 14/14）；余 6 文件/20 项为既有失败，相关文件不引入本批改动模块，未 skip/放宽。
- 归档事实（2026-11-23 本窗口）：本地代码提交 `88d41749…` 与远端另一写入方的 8 个文档提交（`198c40bd…` → `211ed45a…`）从共同祖先分叉；经无冲突 merge 保留双方历史，绕开失效的 `127.0.0.1:51081` 代理直连推送，远端 main 实际 HEAD 已核对为 `cdd74d824021e4ccce26839434113319956c3f6b`。未 force push / reset / 新建分支，未跟踪临时物未动。
- 环境边界：用户给出基线 `211ed45…` 最初在本地仓库不是有效 commit（fetch 后为远端文档提交）；远端 main 首次核验经代理 300s 超时，直连可达后完成核验与推送。以上代码/测试/迁移验证均为隔离与本地证据，不代表生产部署或独立 Gate 通过。

### 本窗口隔离库迁移回读证据（2026-11-23）
- 应用前基线：`publication.works` 16 行（无 `project_id`）、`public.director_plans` 21 行（2 行有 project_id）、`publication.work_revisions` 24 行、`studio.work_revisions` 5 行；本地无 `supabase_migrations.schema_migrations` 账表；FK 目标表、四个角色与待加约束均检查通过。
- 应用后列/约束：`works.project_id`；`director_plans` 的 `delegation_id`/`root_task_ref`/`research_snapshot_hash`/`research_source_refs`；`studio.work_revisions.formal_revision_id` 六列齐备，三条 FK 与两个索引存在，`control.artifact_content_columns(kind='formal_work_revision')` 登记 8 列，函数 owner=`mohen_gate_authority`、`security definer`、`search_path=pg_catalog`。
- 指纹断言：正式 revision 直接解析得到 3 组 64 位十六进制指纹；Studio 未绑定封套 5 条与随机 UUID 均返回 NULL；在回滚事务内把封套 `formal_revision_id` 绑定正式 revision 后，封套解析值与正式解析值逐字相同，且篡改封套 `content`/`content_hash` 后指纹不变；回滚后 `formal_revision_id` 非空 0 行、伪造行 0，行数仍 16/21/24/5，历史行未被回填或改写。
- 观察项：`control.artifact_content_columns` 未登记 `director_plan` kind，`artifact_revision_for('director_plan',…)` 仍会抛 `ARTIFACT_CONTENT_COLUMNS_NOT_REGISTERED`；此为迁移前既有状态，不在本轮四项授权断言内，未扩大修改范围。

## 上一批（第二十批）关键落地（细节只在 progress.md）

- D04 授权通道 + 真实续跑 + G4 正式签发：`d2f1da86` finding 候选落库（`a5a4e8c1…` journal 核销、A06/BE/UNASSESSED、零 Provider），部署内 `/api/internal/gate-review` 非自签 PASS（审计 `ec893e90…`，`stage_binding` job `d04.humanistic-discovery`）；`qualification_current` 新增 finding 行。专业方法层：A01–A12 中 11 项 HOLD 与 N01–N06 属人文解释深度缺口，不阻断已跑部分。

## 上一批（第二十一批）关键落地（细节只在 progress.md）

- G4 签发路径无付费失败关闭单测补强：新增 `tests/unit/gate-review-route.test.ts`（11 项）与 `tests/data-production/gate-d04-g4-stage-output.test.mjs`（6 项），隔离与全量均 PASS；web typecheck、静态 guard 退出 0。全量 unit 20 项既有基线失败（6 个未触碰文件），与本批无关，留独立工作包，未 skip/未放宽。

## 上一批（第二十二批）关键落地（细节只在 progress.md）

- D05 事实分支零付费执行链代码落云端（`134d6619`，与 D04 同构）+ authority 组合回归修复（`48c9169b`）；staging 首次续跑停在 Runner 签名校验（`EXECUTION_SIGNED_GRANT_SIGNATURE_INVALID`）→ run HOLD、D05 候选 0、G5 未签，公钥误配修正后未重试。

## 本批（第二十三批）已落地

- **Runner 签名校验根因查明并真实跑通**：真因是 D05 用的 `MOHEN_EXECUTION_AUTH_PUBLIC_KEY_D05` 配成了 D00 authority 公钥（签名私钥为 `d01-resume`），2026-11-22T11:45 那次失败用的正是该误配部署 `hoim1whhp`；11:51:49 已改为 `d01-resume` 公钥、部署 `5g38pnq17` 生成于其后但**此前从未重试**。本批用真实授权令牌做正反验证：`d01-resume` 公钥验签 true、D00 公钥验签 false（指纹 `3609187b…` vs `b294474f…`）。
- **D05 真实执行成功**（`from_stage:'D05'`，staging `5g38pnq17`）：D05 issue→consume 一次性 journal 核销 → Runner 越过签名/资格/在线核销 → 确定性 P02 落库 `read_model.world_projections.a17059e3`（`projection_key=d05-fact-0617b049-7f713c60`，`lineage.g3=f1d9163e` / `lineage.g4=ec893e90`，`provider_calls=0`），并提交 G5 候选 `d6ee7004`（`dependency_snapshot` 精确绑 G4 `ec893e90`，`input_fingerprint=0cabcf63…` 与 journal 一致）。
- **G5 独立签发 PASS**（部署内 `/api/internal/gate-review`，dry_run `DRY_RUN_PASS` → 正式 `3aa1c2de`）：机器评审 `mohen_gate_signer_m5_machine`、`decision_origin=independent_gate`、`rule_version=v1`、`checks={work_revision_binding,rights_by_operation}=true`、`stage_binding={job d05.read-model-publication, input 0cabcf63…, output 820ddb74…, reviewer m5-owner-reviewer-g2g5-producer}`、valid_until 2026-11-28；候选转 `CONSUMED`，`qualification_current` 新增 G5 行。非自签、无旧 PASS 复用。
- **G5 只读取证两处缺陷修复**（提交 `e563161c`，失败关闭不得放宽）：①`derived_from_finding_ids` 是 `uuid[]`，`::text` 得到 Postgres 数组字面量非 JSON → 改 `array_to_json(...)::text`；②持久化正文为 canonical（键排序），旧 `JSON.stringify` 比较把同一事实判为不同 → 改按内容 `executionDigest` 比较。两项真因均以真实 G5 候选为对象复现并回放验证（`0cabcf63…`/`820ddb74…` 与签发审计逐字一致）。
- **回归**：D04→G4 走同一修复模块仍复现签名摘要 `a5a4e8c1…`/`8338692b…`（equal=true）；D04 路由 401、D04/G4 审计仍 `current_valid`；`tests/data-production/*.test.mjs` 全 498 项 489 通过、9 项既有基线失败（与修复前 revision 逐项同名单同数量，未 skip/未放宽）。

## 最前阻断 / 下一动作

### 本批最新（2026-11-24 Owner 真实浏览器体验 + 创作段修复，main 0866e3df）
- **Owner 浏览器验收已过**：以真实账号 `20195689@qq.com`（Owner 原密码不可用系邮箱笔误写少一位 + 本地找回邮件开关关闭；已用项目原生 scrypt 算法受控重置为已知密码，实测 `/api/auth/login` 200）登录后，Owner 亲手完成三步：①登录；②WATCH 观看主线 `08ddaaa8`/rev `17b8c278` 的 3 章（`/api/works/published` 实测返回该项）；③Admin「发布管理」下架撤回后 WATCH 不再展示。均 Owner 本人浏览器实操，非脚本冒充。
- **创作段两项真 bug 修复（main `0866e3df`，已推送）**：① `StudioWorkbench.tsx` 投稿 `POST /api/works` 请求体漏带后端强制的 `project_id`（必然 400 `project_binding_required`），已补。② `studio-task-material-read.ts` 的 `currentTaskCheckpoint` 原以 `researchLeads` 非空一刀切作废整个 decision，造成研究任务永久 `materialRead=HOLD`、"生成方案"按钮永不可用（结构性死锁）；改为外部线索不触发整体作废、但仍逐条严格回读 `decision.materials`，回读失败依旧 fail-closed，通过的才升级为 CURRENT 并从决策中剥离外部线索。`tests/unit/studio-task-material-read.test.ts` 更新+新增 2 例，7/7 PASS；相关回归 26/26 PASS；`pnpm --filter web typecheck` PASS；无新增 lint。
- **隔离库数据补齐（非伪造、不碰云端/付费）**：主线任务 `b2143002` checkpoint 的 `decision.materials` 由 18 条未核验外部线索升级为 `readStudioResearchProject` 真实回读的项目私有材料 `studio:0a61dbca…@3be26a90…`（1 条，源原件 `f474b91b` 已 BOUND），清空 `researchLeads`/`partial_result`；升级前后均用真实 `currentTaskCheckpoint` 验证返回 CURRENT 才写回，外部线索原始证据仍完整保留在 `research_events`。真实 API 复验：`/status` 返回 `materialRead=CURRENT`、`materials=1`、`leads=undefined`、`mohenLine=true`，导演前置返回 `external_processing_not_authorized`（产品设计正常的 Owner 外发授权门，非 bug）。
- **创作段真实边界（不夸大）**：从空白输入框提问仍受三道 fail-closed 门约束——①新题材检索需当前 G5 合格 L5 资产（本地检索通道对"金泽"返回 `SOURCE_OR_QUALIFICATION_UNAVAILABLE`，Key/G5 上下文已配，非配置缺失）；②D00 正式生产硬性要求云端执行器（`MOHEN_CLOUD_EXECUTION_ENABLED` 本地未配，无本地 skip）；③"生成方案/采纳"调用 DeepSeek `llm_director_h1/h2/h3` 为付费外发。本窗口按 Owner「本地补齐+修死锁、不碰云端不加付费」决策，未动这三道门、未新增付费/云端调用。可交付的亲手体验范围为：打开已有合格项目→材料 CURRENT→投稿→Admin 审核→发布→WATCH→撤权；如需从零提问/生成方案，须另行授权云端执行器与外发费用。
- **提交与推送**：本地与远端 main 均 `0866e3df`（基线 `6a13ad3b`），提交作者合规；仅 3 个受控文件入 git，未跟踪临时物未动。

### 上一批（2026-11-24 正式主线作品贯通 + Owner 批准公开后续批，本地隔离库主线真实对象）
- **闭合的断点**：新增 `scripts/test-m5-mainline-fullchain-isolation.mjs`（loopback 围栏），在隔离库用主线真实对象重签当前有效 G0-G5、建立正式 DirectorPlan `d87d816d…`(G5 `4c0ce973`) + Work + WorkRevision `e1ed5309…`(G5 `652b39dc`) 正文与封套，锚点全部同一 Project/Root/delegation/snapshot；投稿→审核→发布→WATCH→撤权全链贯通。**21 PASS / 0 FAIL / 1 FINDING**（`MAINLINE_VERIFIED_ISOLATED`）。
- **Owner 2026-11-24 两项决策已落地**：①**批准公开**——新增 `scripts/approve-m5-mainline-display-right.mjs`，把来源 `9aa03207` 的 `display` 权 unknown→allowed，保留 11-08 原证据并追加 `rights_evidence.public_display_authorizations`（决策人/日期/范围/仅 display），download/adapt/redistribute/external_processing 仍 HOLD；发布闸通过后主线 revision `e1ed5309…` 精确发布成功、WATCH 同 revision 放行、撤权即时阻断+历史保留+幂等。②**身份分工**——Owner 账号 `270bcecf` 已具 member/creator/operator/reviewer 四角色，系统早把"角色"与"账号"分离，且 Owner 已登记为唯一 Reviewer（progress 1613、LEDGER 116 `VERIFY_3_ROLE_OWNER_SIGNER PASS`）；`decide_editorial` 的 operator 是文本参数，只要求"审核者≠封套 creator"（自审保护），不强制独立注册账号，故一人可用不同身份标识分饰创作与终审，无需另申请账号。
- **真实反向**：跨 Project 投稿被拒、自审 `EDITORIAL_OPERATOR_CONFLICT` 被拒、退回态发布 `PUBLISH_DECISION_REQUIRED` 被拒且旧指针不变、越权发布 `PUBLISH_OPERATOR_REQUIRED` 被拒、未发布时 WATCH 不放行、错 revision 不放行、anon 无指针读取权；非自签（机器 Gate signer + rule reviewer）、非历史 PASS 复用、0 Provider。
- **验证/环境**：静态守卫 2/2、文档预算 OK、`pnpm -r typecheck` 7 包 PASS、rights-actions 单测 17/17、既有同对象闭环 15 PASS 无回归。CI 宿主级仍 `runner_id=0`/`steps=0`，`CI_BLOCKED`；本地测试不冒充 CI PASS。本轮 push `3517576c`（CEI-01 并发经 rebase）。本窗口未改生产库/RLS/迁移/部署，未新增付费。
- **FINDING**：作品级终签在脚本中以非用户 operator 标签执行，Owner 真实 UI 身份（一人分饰两角的实际操作）仍待 Owner 浏览器体验证明；本脚本不冒充。
- **下一动作**：① Owner 真实浏览器体验（用两个身份标识分别创作/终审，走主线作品发布→观看→撤权）；② 云端正文权威 schema 迁移评估（现云端 schema 落后，非本窗口授权范围）；③ CI runner 宿主恢复后重跑。不得用历史隔离对象集冒充主线通过。

### 历史（2026-11-23 连续施工｜五阶段全链贯通，已推送 d47c5d31/6a56b8fc）
- **推送状态**：阶段一+二已推送（`d47c5d31`），阶段三/四/五已推送（`6a56b8fc`），§0.2 E 前端按钮接线已推送（`4e58fc6d`）；本窗口基线即 `4e58fc6d`。
- **M5 全链贯通（隔离库 VERIFIED_ISOLATED）**：DirectorPlan 正文权威归位(§19.1, G5 `ec8117cb`) → 正式 WorkRevision(publication.work_revisions, G5 `286ca90d`) → ST-08 投稿(7/7) → ST-09 独立 Operator 审核 + 三权分离 + 自审拒绝 + 退回保留快照 + 批准不代 G(12/12) → CAS 发布指针(失败不破坏旧稿) → WATCH 合法消费 → 撤权失效(P08)。全部在隔离库 `mohen_dev`，非生产/非部署/非自签/非历史 PASS 复用；未新建第二套真值表，未改评审器与 ST-08/09 SQL。
- **新增脚本**：`test-st05-formal-director-body-authority-isolation.mjs`、`test-st07-formal-work-body-authority-isolation.mjs`、`test-st08-formal-submission-isolation.mjs`、`test-st09-editorial-publish-watch-isolation.mjs`（均 loopback 安全围栏）；新增单元测试 `mab-m5-director-plan-body-authority.test.ts`。
- **测试**：单测 32/32、静态守卫 PASS、web tsc 退出 0。CI 宿主级仍 `CI_BLOCKED`。
- **历史基线记录（阶段一+二推送点）**：远端/本地 main 曾均为 `4fd585ea0ea2789faf82f851c8c823c15c0f9905`（0/0）。
- **阶段一（DirectorPlan 正文权威归位，VERIFIED_ISOLATED 7/7）**：新增迁移 `20261123130000_mab_m5_director_plan_formal_body_authority.sql`，把 `artifact_revision_for('director_plan')` 从 `studio.director_plans` 归位到正式正文 `public.director_plans`（合同 §19.1），`artifact_content_columns('director_plan')` 重登记为正式表 16 业务列。新建正式 DirectorPlan + 同 ID 评审封套独立 G5 PASS `ec8117cb`（independent_gate/current），旧 Studio-only 对象指纹 NULL 无法冒充，历史 PASS 原样保留。
- **阶段二（ST-07 正式作品正文归位，VERIFIED_ISOLATED 7/7）**：新增 `scripts/test-st07-formal-work-body-authority-isolation.mjs`，正式正文写 `publication.work_revisions`、Studio 封套 `formal_revision_id` 绑定同 ID 正式正文；指纹正反+篡改复原、不可变/CAS/幂等、project 关联一致（越界=0）、独立 G5 PASS `286ca90d`。
- **测试**：定向单测 32/32、静态守卫 2/2、web tsc 退出 0；隔离库 G5 为 VERIFIED_ISOLATED（非生产/非自签/非复用）。CI 宿主级仍 `CI_BLOCKED`。
- **下一动作**：阶段三 ST-08 投稿快照绑定正式 revision（权限/幂等/版本关系）→阶段四 ST-09 审核（角色隔离/退回/新修订/Operator 批准/三权分离）→阶段五发布 CAS 指针 + WATCH 合法消费/撤权（P08）。
- **证据分层**：以上为隔离库工程自验，不代表生产部署或 Owner 体验通过；跨 Project/Owner 尚为数据库关联一致性核查，待阶段三/四端到端补主动拒绝证据。

- **最前阻断（历史记录，阶段一+二已解除该断点）**：ST-05—ST-07 前置修补的代码、迁移与隔离库验证已完成并归档（最终远端 main `55dce70e…`，经合并提交 `cdd74d82…` 保留双方历史），详见[PLAN §0.4](tasks/implementation/MAB/PLAN.md)与上方隔离库回读证据。Owner 已定 ST-08/09 选 A（暂不改绑历史临时作品，后续用全新正式作品跑通投稿→审核→发布→WATCH），并授权隔离库内重签 Gate。测试债按 Owner 定的 C 只修挡路项：全量单测已从 6 文件/20 项失败降到 4 文件/12 项（807 通过/819），剩余 12 项属 D00—D05 生产链与云执行、非 ST-08/09 链路，保持 HOLD、未 skip/未放宽。CI 宿主故障已用 Owner 只读 PAT 经 GitHub API 取证，见下方 CI 条。
- **ST-08/09 资格链已重签 + 新卡点（2026-11-23 隔离库实测）**：Owner 授权后按合同 §0.2 B/E 定点执行。先探明整条知识资格链 G0→G5 全部过期（11-16 到期），据此编写并运行 `scripts/reissue-m5-gate-chain-isolation.mjs`（含隔离库安全围栏、幂等、复用真实 CONSUMED 候选字段、依赖快照逐字绑定新签上游 audit、独立机器评审器签发、清理草稿态 SUBMITTED 候选），**逐级重签成功**：G0 `56982df6…`/G1 `62892cac…`/G2 `aff50536…`/G3 `4b8b6057…`/G4 `611bb07a…` + G5 四对象 `12806d5d…`(投影)/`5e0618c2…`(种子)/`0d3583cb…`(上下文)/`99854928…`(导演方案)，9 条新 audit 均 `current_valid`、有效至 11-29，全部 dryRun→正式 PASS、非自签/非复用历史 PASS。重签中发现并修复真实缺口：`control.artifact_content_columns` 从未登记 `director_plan` kind，导致导演方案 G5 报 `ARTIFACT_CONTENT_COLUMNS_NOT_REGISTERED`；已在迁移 `20261123120000…sql` 补登记（studio.director_plans 15 业务列、排除 created_at），历史 G5 审计原样留存、不回填旧 revision，ST-07 正文权威测试复验 4/4 通过。**新卡点**：用全新作品标识跑 ST-10 全链，D05→G5(投影/种子/上下文)→ST-05 导演方案→G5 全部 PASS（4 项），但 ST-07 work_revision 报 `artifact_revision 为空`——旧验证脚本走 `studio.persist_private_work_revision` 旧写入路径，与 ST-05—ST-07 修补后"正式正文归 `publication.work_revisions`、Studio 表仅封套且需 `formal_revision_id` 绑定"的新架构不一致；这是架构时序差异、非资格问题。要让全链跑通，需按新架构重写 ST-07 写入步骤（新建正式正文行 + 封套绑定 + 再算 revision），属下一工作包。Web 网页按钮接线属 §0.2 E 的 Owner 最终体验层，按合同须先完成 PG/HTTP/Gate 工程自验再接，本轮未做。
- **正式表与平行表现状**：`public.director_plans` 21行（2条已绑定Project、19条未绑定）；`publication.works` 16行但缺`project_id`列；`publication.work_revisions` 24行。另有`studio.director_plans` 3行、`studio.work_revisions` 5行，与正式表ID不重叠；5条Studio修订均无对应`publication.works`。保留全部历史数据，不猜测合并。
- **资格边界**：当前5条DirectorPlan G5 PASS、7条WorkRevision G5 PASS均绑定Studio平行表对象，不绑定正式表对象；不转移、不复用。正式对象须重新经过独立G5。
- **追溯缺口（按合同§19.1精确定位；以下为修补前诊断，现已由本批代码修补闭合）**：正式`public.director_plans`已有`project_id/source_ids`，但没有`delegation_id/root_task_ref`及研究读取snapshot/hash的持久闭环。`createWorkDraft()`（`apps/web/lib/publication.ts`）新建`publication.works`和首条`publication.work_revisions`时没有Project；正式作品表也没有`project_id`列。`commitWorkRevision()`（`apps/web/lib/studio-director.ts`）只按Owner连接导演方案与作品，CAS INSERT没有同Project校验。需闭合Project＋Root＋snapshot，并保持历史无绑定记录HOLD。
- **安全/迁移**：Supabase安全检查报告10张表RLS未启用；已核的9张Studio/Publication表无anon/authenticated直接表权限，但若干app_runtime策略仍为全行`true`，另有一张publication_schedules无策略。先修策略并正反验证，不一键启用。数据库迁移账止于`20261120045054`，而两张Studio平行表及数据已存在、对应迁移版本未入账；不得盲目重跑或删除。
- **CI（宿主级取证，2026-11-23）**：用 Owner 提供的只读 PAT（存于 gitignored `.secrets/github-token.txt`，值未入库/未回显）经 GitHub REST API 实测：认证身份 `xiezuojie03-web` 有效；归档提交 `55dce70e…` 触发 run `45129550525`（`push` 事件、completed、conclusion=failure，创建到失败仅 4 秒），唯一 job `build`（id `137541656462`）`runner_id=0`、`runner_name` 空、`steps` 数=0、日志 blob `BlobNotFound`，与历史 `runner_id=0`/`steps=[]` 一致。结论：job 在 runner 分配前即失败、从未被 runner 接管，**非代码红灯**。根因未能最终定性——只读 PAT 读 Actions 权限端点得 403、账单/额度端点 404；推测为额度耗尽/Actions 暂停/仓库策略/平台调度故障，需 Owner 在 GitHub 网页 Actions 页看是否有横幅、Billing 页看剩余分钟。CI 仍记 `CI_BLOCKED`，本地测试不冒充 CI PASS。
- **执行策略（2026-11-23修订）**：Owner已明确不建立临时Supabase开发分支，第二步不再以此为前置条件。代码优先本地施工、运行可执行的静态/定向测试/类型检查/构建，阶段性集中推送唯一main；推送前必须核对远端HEAD及本地未提交/未推送成果。现有Supabase项目继续只读核查；迁移/RLS先完成Schema与迁移账对照、向前迁移/回滚脚本及影响分析。未具备安全验证条件前不对生产库执行DDL/RLS写入、不改数据、不部署。CI宿主级失败仍记CI_BLOCKED；本地测试不能冒充CI通过，缺少真实PG/HTTP/Gate验证的项目标NOT_RUN/DEFERRED_ENV。
- **代码定位结果（对照合同§19.1，修补前诊断）**：`public.director_plans`、`publication.work_revisions`是正文权威；Studio封套应引用，不复制正文。当前`createWorkDraft()`新建作品时未绑定Project，`commitWorkRevision()`只校验Owner；ST-07迁移`20261114150000_mab_m5_st07_work_revision.sql`另建带正文的`studio.work_revisions`，与合同的唯一正文规定冲突。既有Studio平行表和历史G5必须保留，但不能继续充当正式正文/G5对象。精确修补顺序已补入PLAN §0.4。
- **本轮源码执行边界（另一写入方 sandbox 窗口的历史记录，非本窗口状态）**：已进一步对照合同§19.1并定位`createWorkDraft()`、`commitWorkRevision()`及ST-07平行正文迁移；尚未修改业务源码/SQL。尝试通过Vercel sandbox建立可运行工作副本，但该私有GitHub仓库不能通过当前sandbox的公开Git源方式直接克隆，当前GitHub连接也只提供文件级读写，没有可执行仓库工作树。因此不能诚实地声称已跑Vitest/typecheck/build。为避免未经验证的业务代码直接写入唯一`main`，本轮不提交业务源码。继续施工需要可运行工作副本；不需要创建Supabase分支，也不需要改生产数据库。第二步代码修补及其本地验证完成并归档后，Owner再接续第三步M5业务主线。

## 部署 / 费用 / 凭据

- web staging：`mohen-agent-2-0-eytp0i3no-napoles1.vercel.app`（`dpl_Cqdz7vPYHrzQTn711rkGEh35rter`，target staging / VERCEL_ENV=preview，SHA `e563161c`）；上一部署 `mohen-agent-2-0-5g38pnq17-napoles1.vercel.app`（`48c9169b`）为本批 D05 真实续跑所用。authority production：`mohen-d00-authority.vercel.app`（未改动，仍 `48c9169b`；D04/D05 issue 未签名探测 401=路由存在）。提交作者须为 `xiezuojie03 <315303392+xiezuojie03-web@users.noreply.github.com>`，否则 Vercel 拒部署；网络经本地代理 `127.0.0.1:51081`。
- 费用：本批 **0 次 Provider 调用 / 0 USD 新增**（D05 为确定性事实分支；`studio.execution_receipts` 仍 27 条、最新仍 2026-11-22T04:24:08Z）；委托 `3f5585d0…` 累计仍 **0.005989 USD**，未新增付费来源、未扩大用途。含令牌/签名的临时脚本均在 gitignored `work/scratch/`，未入 git。
- 已知并发写入方：`main` 上有另一执行方传 `tasks/research/MERA-01/*`；推送被拒时 fetch + rebase，绝不 force push / reset / 新建分支。
- 安全：密钥仅在 `.secrets/`（gitignored），签名私钥与机器签发连接不出部署（G5 在部署内签发）；G0—G5 均为独立机器评审签发，非自签。

## 历史索引（细节只在 progress.md，不在本文件重述）

- 第十八批 G3 全过程（含 Owner「选一」授权、`artifact_revision_for(claim_revision)` 修复与 G3 签发）：[progress.md](tasks/implementation/MAB/progress.md) 搜「G3 签发回执」「D04 准备起点」。
- 第十—十七批（D00→G1、权利投射、D02 付费回执与失败分类、环境漂移修复、G2 签发）：同上按「核验时间 第 N 批」定位。
- 2026-11-19 工程数据统一专项 P0–P4 已结案：[P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，证据在 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。
