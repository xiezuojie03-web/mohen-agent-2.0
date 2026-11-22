# 墨痕｜当前施工断点

> **Owner 授权口径（2026-11-22，长期有效）**：目标是墨痕**真正运行、持久运行**；除**安全问题**与**费用问题**外，施工方自行授权推进，不再逐项请示技术选择。费用边界：D02–D05 模型调用封顶 **0.05 USD**（约 ¥0.36，已建委托 `3f5585d0…`），超出该额度、新增付费来源或扩大用途仍需 Owner 批准。安全底线（密钥不入 git、不自签 Gate、不伪造会话/资格/PASS、不改迁移规避授权）不因该授权放宽。

> 核验时间 2026-11-22 第二十一批（新窗口，远端 main 与本地 HEAD 同为 `17e0b8ce`，`ahead=0 behind=0`）｜环境：云端真实库 + 真实部署实测；HEAD/部署见下。CI 宿主本窗口不可达（无 `gh`/GH_TOKEN、私有库 API 404）记 `DEFERRED_ENV`；生产自动部署 `git.deploymentEnabled=false` 已核隔离。本文件只维护**当前事实 / 最前阻断 / 下一动作**；逐批原始回执见 [progress.md](tasks/implementation/MAB/progress.md)，施工标准见 [PLAN.md](tasks/implementation/MAB/PLAN.md)。

## 主线进度（按 PLAN §3.5 C 业务主干，同一任务 `b2143002` / Project `d9d48901` / run `b9989b90`）

主干共 **10 段**：**0 段完整验收、4 段在跑、6 段未启**；其中生产链 12 个节点已验 **10/12**（D00/G0/D01/G1/D02/G2/D03/G3/D04/G4），**最远已验节点 = D04 UNASSESSED finding 候选落库 + G4 机器评审正式 PASS**。

| # | 主干段（PLAN §3.5 C） | 状态 | 同任务实证 / 剩余 |
|---|---|---|---|
| 1 | Studio 受权委托与研究意图 | 在跑 | 真实任务/项目/Root 已固定；ST-01 的真 UI 入口与问题收敛未完整验收 |
| 2 | 统一检索 L0—L5 并核权利与当前资格 | 在跑 | 权利投影与 Gate 读通道已真实跑通；统一检索视图/契约未完整验收 |
| 3 | D00—D05 必要工序 + G0—G5 独立资格 | 在跑 | **10/12 节点已验**；剩 D05 事实分支（零付费确定性派生）与 G5 |
| 4 | 可追溯知识资产与合法研究读 | 在跑 | evidence / finding / claim_revision 已落库且带 revision/refs；13 类资产合同未全验 |
| 5 | 导演 H1/H2/H3 与 19 组件 → WorkRevision | 未启 | — |
| 6 | Admin 回链、运营审核、作品资格与媒资许可 | 未启 | — |
| 7 | 精确发布（发布指针） | 未启 | — |
| 8 | WATCH 消费与即时撤权 | 未启 | — |
| 9 | 第二个非模板题材复用验证（PLAN §3.5 C-1） | 未启 | — |
| 10 | Owner 真实体验与最终签收 | 未启 | — |

- 五道 Gate 当前资格均有效（valid_until 2026-11-28）：G0 `c0ee5a2f` / G1 `113c2bbe` / G2 `1a9402cb` / G3 `f1d9163e` / G4 `ec893e90`，全部 `independent_gate` + `current_valid=true`，`details.checks` 全 true。
- 八维只作 **M5 准出条件**（同一作品贯通后才逐维判定）；`0/8 OVERALL_HOLD` 不表示进度，已按 Owner 2026-11-22 裁决不再作进展汇报项（见 PLAN §6.2 与 §3.5 B 进度报告口径）。

### 副表：Studio 用户动作可用性（ST-01—ST-09）

分母取自现行权威 [AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md §6.2](specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md) R4.5 九项。**这是"Owner 能上手用到什么"的视角**，与上表工程主干是同一任务的两个切面，不互相折算、不另立验收分母。**0 项完整验收、4 项在跑、5 项未启**。

| ST | 动作（§6.2） | 状态 | 同任务实证 / 剩余 |
|---|---|---|---|
| ST-01 | CreateWorkBrief | 在跑 | 任务 `b2143002` 已带 topic/prompt/project 绑定；真 UI 入口与问题收敛按 PLAN §84 未完整验收 |
| ST-02 | StudioResearchRead | 在跑 | G0/G1 读通道真实 200，跨 L 研究读已跑；统一检索视图/契约未完整验收 |
| ST-03 | AnalyzeAndSaveCandidates | 在跑 | evidence `031dd3d9` / claim `0617b049` / finding `7f713c60` 已落库且带 revision/refs |
| ST-04 | RequestFormalProduction | 在跑 | run `b9989b90` 已开出并实执行到 D04，G0—G4 PASS；D05/G5 未启 |
| ST-05 | AssembleDirectorPlan | 未启 | 尚未产生 `director_plan@rev` |
| ST-06 | PreviewWork | 未启 | 尚未产生 `preview_snapshot` |
| ST-07 | SaveWorkRevision | 未启 | 尚未产生 `work_revision@rev` |
| ST-08 | SubmitForEditorialReview | 未启 | 尚未产生 `submission_snapshot` |
| ST-09 | EditorialDecision/Publish/Withdraw | 未启 | 尚未产生 publication / withdraw 回执 |

## 上一批（第二十批）关键落地（细节只在 progress.md）

- D04 授权通道 + 真实续跑 + G4 正式签发：`d2f1da86` finding 候选落库（`a5a4e8c1…` journal 核销、A06/BE/UNASSESSED、零 Provider），部署内 `/api/internal/gate-review` 非自签 PASS（审计 `ec893e90…`，`stage_binding` job `d04.humanistic-discovery`）；`qualification_current` 新增 finding 行。专业方法层：A01–A12 中 11 项 HOLD 与 N01–N06 属人文解释深度缺口，不阻断已跑部分。

## 本批（第二十一批）已落地

- **G4 签发路径无付费失败关闭单测补强**（零生产代码改动）：新增 `tests/unit/gate-review-route.test.ts`（11 项：404/401/400/503/500 分支、精确委派参数、脱敏错误码）与 `tests/data-production/gate-d04-g4-stage-output.test.mjs`（6 项：G4 只读重建、伪造摘要/错绑定/非当前 G3/非 A06 finding 失败关闭）。两文件隔离与全量均 PASS；web typecheck、静态 guard 退出 0。
- **测试边界**：全量 unit 有 20 项既有基线失败（6 个未触碰文件，含陈旧 `vi.mock`、网络抓取、断言漂移），单独复跑确认可复现、与本批无关；未 skip/未放宽断言，留作独立工作包。CI 本窗口 `DEFERRED_ENV`，未签运行 PASS。
- 本批未新增付费来源/用途、未碰 D05、未改方法表、未自签、密钥未入 git；主线与 ST 进度不变，未扩大用户可用范围。

## 最前阻断 / 下一动作

- **最前阻断**：D05 事实分支无付费阻断——按协议 §11、§13.5 与 D05 主规，D05 定义是对已合格 L3/G3 内容作零付费确定性派生发布（事实型 P02/P03/P06），G5 合同 checks 无付费/推理条件；付费是实现 choice 非合同 obligation。上一窗口「D05 必须付费扩用途、须 Owner 批准」的误读已撤销（裁决来源与证据见 progress.md「第二十二批」）。剩余为工程缺口：D05 授权通道/白名单/attestation/G5 凭据未补齐；A01–A12 其余 11 项方法绑定与 N01–N06 仍是专业深度缺口，不阻断事实分支。
- **下一动作**：①按 D04 同构补齐 D05 事实分支零付费执行链（resume/input 重建、授权通道、from_stage 白名单、G5 stage-output attestation、reviewer 凭据），先单测再 staging 真实续跑 `b9989b90`，G5 走部署内 `/api/internal/gate-review`（dry_run→正式）；②20 项既有基线单测失败按独立工作包在 main 定向修复（不 skip/不放宽）；③八维其余维度按 PLAN 逐项取证，不以本批 Gate 链替代作品发布/WATCH 验收。CI `DEFERRED_ENV` 待宿主恢复后核精确 SHA 再签。D05 事实分支本批预期 0 次 Provider 调用 / 0 USD。

## 部署 / 费用 / 凭据

- web staging：`mohen-agent-2-0-37r2cms8g-napoles1.vercel.app`（本批新部署）；authority production：`mohen-d00-authority.vercel.app`（git source，API 端点实测 401=存在）；提交作者须为 `xiezuojie03 <315303392+xiezuojie03-web@users.noreply.github.com>`，否则 Vercel 拒部署；网络经本地代理 `127.0.0.1:51081`，令牌到期先 `npx vercel whoami` 续期。
- 费用：本批 **0 次 Provider 调用 / 0 USD 新增**；委托 `3f5585d0…` 累计仍 **0.005989 USD**（0.05 封顶 12%），未新增付费来源、未扩大用途。
- 已知并发写入方：`main` 上有另一执行方传 `tasks/research/MERA-01/*`；推送被拒时 fetch + rebase，绝不 force push / reset / 新建分支。
- 安全：密钥仅在 `.secrets/`（gitignored），签名私钥与机器签发连接不出部署；G3/G4 均为独立机器评审签发，非自签。

## 历史索引（细节只在 progress.md，不在本文件重述）

- 第十八批 G3 全过程（含 Owner「选一」授权、`artifact_revision_for(claim_revision)` 修复与 G3 签发）：[progress.md](tasks/implementation/MAB/progress.md) 搜「G3 签发回执」「D04 准备起点」。
- 第十—十七批（D00→G1、权利投射、D02 付费回执与失败分类、环境漂移修复、G2 签发）：同上按「核验时间 第 N 批」定位。
- 2026-11-19 工程数据统一专项 P0–P4 已结案：[P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，证据在 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。
