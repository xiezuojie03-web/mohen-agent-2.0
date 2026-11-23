# 墨痕｜当前施工断点

> **Owner 授权口径（2026-11-22，长期有效）**：目标是墨痕**真正运行、持久运行**；除**安全问题**与**费用问题**外，施工方自行授权推进，不再逐项请示技术选择。费用边界：D02–D05 模型调用封顶 **0.05 USD**（约 ¥0.36，已建委托 `3f5585d0…`），超出该额度、新增付费来源或扩大用途仍需 Owner 批准。安全底线（密钥不入 git、不自签 Gate、不伪造会话/资格/PASS、不改迁移规避授权）不因该授权放宽。

> 核验时间 2026-11-22 第二十三批收口（**施工成果 SHA `e563161c`**：web staging 新部署即此 SHA；authority production 未改动、仍为上一施工成果 `48c9169b`；其后仅追加本批文档收口提交，无代码差异）｜环境：云端真实库 + 真实部署实测；D05 真实续跑与 G5 独立签发均有库内回读证据。CI 宿主本窗口不可达（无 `gh`/GH_TOKEN、私有库 API 404）记 `DEFERRED_ENV`；生产自动部署 `git.deploymentEnabled=false` 已核隔离。本文件只维护**当前事实 / 最前阻断 / 下一动作**；逐批原始回执见 [progress.md](tasks/implementation/MAB/progress.md)，施工标准见 [PLAN.md](tasks/implementation/MAB/PLAN.md)。

## 主线进度（按 PLAN §3.5 C 业务主干，同一任务 `b2143002` / Project `d9d48901` / run `b9989b90`）

主干共 **10 段**：**0 段完整验收、4 段在跑、6 段未启**；其中生产链 12 个节点已验 **12/12**（D00/G0/D01/G1/D02/G2/D03/G3/D04/G4/D05/G5），**最远已验节点 = D05 事实分支 P02 `world_projection` 落库 + G5 独立机器评审正式 PASS（`3aa1c2de`）**。

| # | 主干段（PLAN §3.5 C） | 状态 | 同任务实证 / 剩余 |
|---|---|---|---|
| 1 | Studio 受权委托与研究意图 | 在跑 | 真实任务/项目/Root 已固定；ST-01 的真 UI 入口与问题收敛未完整验收 |
| 2 | 统一检索 L0—L5 并核权利与当前资格 | 在跑 | 权利投影与 Gate 读通道已真实跑通；统一检索视图/契约未完整验收 |
| 3 | D00—D05 必要工序 + G0—G5 独立资格 | 在跑 | **12/12 节点已验**（含 D05 P02 落库与 G5 `3aa1c2de`）；剩 P03/P06 事实分支（方法绑定 HOLD）与 A01–A12 其余 11 项方法绑定 |
| 4 | 可追溯知识资产与合法研究读 | 在跑 | evidence / finding / claim_revision 已落库且带 revision/refs；13 类资产合同未全验 |
| 5 | 导演 H1/H2/H3 与 19 组件 → WorkRevision | 未启 | — |
| 6 | Admin 回链、运营审核、作品资格与媒资许可 | 未启 | — |
| 7 | 精确发布（发布指针） | 未启 | — |
| 8 | WATCH 消费与即时撤权 | 未启 | — |
| 9 | 第二个非模板题材复用验证（PLAN §3.5 C-1） | 未启 | — |
| 10 | Owner 真实体验与最终签收 | 未启 | — |

- 六道 Gate 当前资格均有效：G0 `c0ee5a2f` / G1 `113c2bbe` / G2 `1a9402cb` / G3 `f1d9163e` / G4 `ec893e90`（valid_until 2026-11-28）/ G5 `3aa1c2de`（valid_until 2026-11-28），全部 `independent_gate` + `current_valid=true`，`details.checks` 全 true。
- 八维只作 **M5 准出条件**（同一作品贯通后才逐维判定）；`0/8 OVERALL_HOLD` 不表示进度，已按 Owner 2026-11-22 裁决不再作进展汇报项（见 PLAN §6.2 与 §3.5 B 进度报告口径）。

### 副表：Studio 用户动作可用性（ST-01—ST-09）

分母取自现行权威 [AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md §6.2](specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md) R4.5 九项。**这是"Owner 能上手用到什么"的视角**，与上表工程主干是同一任务的两个切面，不互相折算、不另立验收分母。**0 项完整验收、4 项在跑、5 项未启**。

| ST | 动作（§6.2） | 状态 | 同任务实证 / 剩余 |
|---|---|---|---|
| ST-01 | CreateWorkBrief | 在跑 | 任务 `b2143002` 已带 topic/prompt/project 绑定；真 UI 入口与问题收敛按 PLAN §84 未完整验收 |
| ST-02 | StudioResearchRead | 在跑 | G0/G1 读通道真实 200，跨 L 研究读已跑；统一检索视图/契约未完整验收 |
| ST-03 | AnalyzeAndSaveCandidates | 在跑 | evidence `031dd3d9` / claim `0617b049` / finding `7f713c60` 已落库且带 revision/refs |
| ST-04 | RequestFormalProduction | 在跑 | run `b9989b90` 已实执行到 D05：G0—G5 六门 PASS（G5 `3aa1c2de`），P02 `a17059e3` 落库并按资格读通道回读；run 终态仍 HOLD（设计内「独立门已签、run 不自动改写」，与 G3/G4 时一致） |
| ST-05 | AssembleDirectorPlan | 未启 | 尚未产生 `director_plan@rev` |
| ST-06 | PreviewWork | 未启 | 尚未产生 `preview_snapshot` |
| ST-07 | SaveWorkRevision | 未启 | 尚未产生 `work_revision@rev` |
| ST-08 | SubmitForEditorialReview | 未启 | 尚未产生 `submission_snapshot` |
| ST-09 | EditorialDecision/Publish/Withdraw | 未启 | 尚未产生 publication / withdraw 回执 |

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

- **最前阻断**：ST-05—ST-07前置修补，详见[PLAN §0.4](tasks/implementation/MAB/PLAN.md)。第一步（施工计划与CURRENT同步）已完成，提交 `200c68938135`；第二步代码/迁移修补尚未开始。
- **正式表与平行表现状**：`public.director_plans` 21行（2条已绑定Project、19条未绑定）；`publication.works` 16行但缺`project_id`列；`publication.work_revisions` 24行。另有`studio.director_plans` 3行、`studio.work_revisions` 5行，与正式表ID不重叠；5条Studio修订均无对应`publication.works`。保留全部历史数据，不猜测合并。
- **资格边界**：当前5条DirectorPlan G5 PASS、7条WorkRevision G5 PASS均绑定Studio平行表对象，不绑定正式表对象；不转移、不复用。正式对象须重新经过独立G5。
- **追溯缺口**：现有导演方案未持久绑定delegation/root_task_ref和研究读取snapshot；WorkRevision提交只校验Owner，没有同Project校验。必须补齐Project＋Root＋snapshot的端到端绑定。
- **安全/迁移**：Supabase安全检查报告10张表RLS未启用；已核的9张Studio/Publication表无anon/authenticated直接表权限，但若干app_runtime策略仍为全行`true`，另有一张publication_schedules无策略。先修策略并正反验证，不一键启用。数据库迁移账止于`20261120045054`，而两张Studio平行表及数据已存在、对应迁移版本未入账；不得盲目重跑或删除。
- **CI**：最新main SHA `200c68938135`对应run `45114509705`失败于runner启动前（`runner_id=0`、`steps=[]`）；上一run `45028810958`同样失败。均为`CI_BLOCKED`，不是代码测试红灯。
- **验证条件**：当前Supabase项目没有隔离分支；本轮未执行任何数据库DDL/RLS修改、未改业务代码、未触发部署。第二步需要可验证的隔离PG环境，完成迁移、权限、API、Gate正反测试后才能关闭。
- **下一动作**：先取得隔离验证环境，再按PLAN §0.4完成单一正文权威、Project/Root/snapshot绑定、G5对象重绑、RLS策略与迁移账修补；完成后Owner再在本地进入第三步M5业务主线。

## 部署 / 费用 / 凭据

- web staging：`mohen-agent-2-0-eytp0i3no-napoles1.vercel.app`（`dpl_Cqdz7vPYHrzQTn711rkGEh35rter`，target staging / VERCEL_ENV=preview，SHA `e563161c`）；上一部署 `mohen-agent-2-0-5g38pnq17-napoles1.vercel.app`（`48c9169b`）为本批 D05 真实续跑所用。authority production：`mohen-d00-authority.vercel.app`（未改动，仍 `48c9169b`；D04/D05 issue 未签名探测 401=路由存在）。提交作者须为 `xiezuojie03 <315303392+xiezuojie03-web@users.noreply.github.com>`，否则 Vercel 拒部署；网络经本地代理 `127.0.0.1:51081`。
- 费用：本批 **0 次 Provider 调用 / 0 USD 新增**（D05 为确定性事实分支；`studio.execution_receipts` 仍 27 条、最新仍 2026-11-22T04:24:08Z）；委托 `3f5585d0…` 累计仍 **0.005989 USD**，未新增付费来源、未扩大用途。含令牌/签名的临时脚本均在 gitignored `work/scratch/`，未入 git。
- 已知并发写入方：`main` 上有另一执行方传 `tasks/research/MERA-01/*`；推送被拒时 fetch + rebase，绝不 force push / reset / 新建分支。
- 安全：密钥仅在 `.secrets/`（gitignored），签名私钥与机器签发连接不出部署（G5 在部署内签发）；G0—G5 均为独立机器评审签发，非自签。

## 历史索引（细节只在 progress.md，不在本文件重述）

- 第十八批 G3 全过程（含 Owner「选一」授权、`artifact_revision_for(claim_revision)` 修复与 G3 签发）：[progress.md](tasks/implementation/MAB/progress.md) 搜「G3 签发回执」「D04 准备起点」。
- 第十—十七批（D00→G1、权利投射、D02 付费回执与失败分类、环境漂移修复、G2 签发）：同上按「核验时间 第 N 批」定位。
- 2026-11-19 工程数据统一专项 P0–P4 已结案：[P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，证据在 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。
