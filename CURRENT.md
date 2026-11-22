# 墨痕｜当前施工断点

> **Owner 授权口径（2026-11-22，长期有效）**：目标是墨痕**真正运行、持久运行**；除**安全问题**与**费用问题**外，施工方自行授权推进，不再逐项请示技术选择。费用边界：D02–D05 模型调用封顶 **0.05 USD**（约 ¥0.36，已建委托 `3f5585d0…`），超出该额度、新增付费来源或扩大用途仍需 Owner 批准。安全底线（密钥不入 git、不自签 Gate、不伪造会话/资格/PASS、不改迁移规避授权）不因该授权放宽。

> 核验时间 2026-11-22 第二十批｜环境：云端真实库 + 真实部署实测；HEAD/部署见下。本文件只维护**当前事实 / 最前阻断 / 下一动作**；逐批原始回执见 [progress.md](tasks/implementation/MAB/progress.md)，施工标准见 [PLAN.md](tasks/implementation/MAB/PLAN.md)。

## 当前唯一任务与最远已验节点

- 同一真实任务 `b2143002` / Project `d9d48901` / run `b9989b90`（原件 `f474b91b`，朱家角）已连续贯通 **D00→G0→D01→G1→D02→G2→D03→G3→D04→G4**；**最远已验节点 = D04 UNASSESSED finding 候选落库 + G4 机器评审正式 PASS**。
- 五道独立 Gate 当前资格均有效（valid_until 2026-11-28）：G0 `c0ee5a2f` / G1 `113c2bbe` / G2 `1a9402cb` / G3 `f1d9163e` / G4 `ec893e90`，全部 `independent_gate` + `current_valid=true`，`details.checks` 全 true。
- **八维状态：`0/8 OVERALL_HOLD`（M5 整体准出尚未取得，不等于无进展）**；第 3 维（D00–D05 生产与 G0–G5 资格）在同任务已到 G4，其余维度按 PLAN §3.5 B/C/D 分别验收，不得折算完成率。

## 本批（第二十批）已落地

- **D04 授权通道**（按 D03 同构，零付费派生）：`d04-resume-{journal,authorizer,input,issue,provider}.mjs` + `d04-g3-qualification.mjs`；authority 增 `/api/d04-issue|/api/d04-consume`（因 Hobby 计划 12 函数上限，两路径合并为单个 `/api/d04` 函数 + vercel.json rewrite，授权逻辑不变）；迁移 `20261122210000_d04_resume_grant_journal.sql`（独立表、stage='D04' CHECK、无 DELETE、RLS 四策略）；`from_stage` 白名单扩 D04（dispatch/self-test/types/stageSuffix），白名单单测 10/10；D04 通道单测 16/16。
- **D04 真实执行**：staging `from_stage:"D04"` 续跑 run `b9989b90` → journal 签发并核销（`a5a4e8c1…`）；候选 `d2f1da86`（object=finding `7f713c60`，`input_fingerprint=a5a4e8c1…` 与 journal 一致）；typed input 从当前 G3 资格 + 持久 claim_revision `0617b049` 确定性重建，A06 / `G4.interpretation.v1:BE` / `UNASSESSED`，derived_from_claim_revision=`0617b049`、`evidence_refs` 含 finding+claim_revision、`dependency_snapshot` 精确绑 G3 审计 `f1d9163e`，零 Provider/LLM 调用。
- **G4 正式签发**：部署内 `/api/internal/gate-review` 先 `DRY_RUN_PASS` 再 PASS（审计 `ec893e90-ddfd-4cc3-b6cc-685ca4a85f11`，`identity_version=true` / `finding_grounding=true`，`stage_binding`={job `d04.humanistic-discovery`, input `a5a4e8c1…`, output `8338692b…`, reviewer `m5-owner-reviewer-g2g5-producer`}）；`qualification_current` 新增 finding 行。评审/签名全在部署内完成，非自签。
- **专业方法层判定**：D04 真实执行前置是「G3 合格 claim + A06 绑定」，无需 N01–N06 付费推理；A01–A12 中 11 项 HOLD 与 N01–N06 属于**人文解释深度**缺口，不阻断本批运行。本批未新增付费来源、未扩大委托用途。

## 最前阻断 / 下一动作

- **最前阻断**：D05（generalize）若需真实解释性推理，须新增/扩大付费委托（现委托 `3f5585d0…` 仅授权 `d02_material_observation`），属**扩大用途**，按授权口径须 Owner 批准；A01–A12 其余 11 项方法绑定与 N01–N06 仍是专业深度缺口。
- **下一动作**：①若推进 D05，先就付费委托扩用途报备 Owner 并核费用（累计 `0.005989 USD`，达 `0.025 USD` 半封顶须停报）；②纯技术的方法绑定/单测可自行推进；③八维其余维度按 PLAN 逐项取证，不以本批 Gate 链替代作品发布/WATCH 验收。

## 部署 / 费用 / 凭据

- web staging：`mohen-agent-2-0-37r2cms8g-napoles1.vercel.app`（本批新部署）；authority production：`mohen-d00-authority.vercel.app`（git source，API 端点实测 401=存在）；提交作者须为 `xiezuojie03 <315303392+xiezuojie03-web@users.noreply.github.com>`，否则 Vercel 拒部署；网络经本地代理 `127.0.0.1:51081`，令牌到期先 `npx vercel whoami` 续期。
- 费用：本批 **0 次 Provider 调用 / 0 USD 新增**；委托 `3f5585d0…` 累计仍 **0.005989 USD**（0.05 封顶 12%），未新增付费来源、未扩大用途。
- 已知并发写入方：`main` 上有另一执行方传 `tasks/research/MERA-01/*`；推送被拒时 fetch + rebase，绝不 force push / reset / 新建分支。
- 安全：密钥仅在 `.secrets/`（gitignored），签名私钥与机器签发连接不出部署；G3/G4 均为独立机器评审签发，非自签。

## 历史索引（细节只在 progress.md，不在本文件重述）

- 第十八批 G3 全过程（含 Owner「选一」授权、`artifact_revision_for(claim_revision)` 修复与 G3 签发）：[progress.md](tasks/implementation/MAB/progress.md) 搜「G3 签发回执」「D04 准备起点」。
- 第十—十七批（D00→G1、权利投射、D02 付费回执与失败分类、环境漂移修复、G2 签发）：同上按「核验时间 第 N 批」定位。
- 2026-11-19 工程数据统一专项 P0–P4 已结案：[P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，证据在 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。
