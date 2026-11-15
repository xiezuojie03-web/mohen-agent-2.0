# M5｜D00—D05历史生产能力与新架构继承断点：实际代码核查（2026-11-15）

> **性质**：现有 MAB 工程施工的源码核查结果/证据，不是新任务书、施工计划或准出标准。唯一验收依旧是 `tasks/implementation/MAB/PLAN.md` V1.7 §3.5 B 八维度与 §3.5 C 同一作品主干。状态：**源码级定位；未进行本轮真实 PG/HTTP/独立 Gate 同作品实跑；M5_OVERALL_HOLD**。
> **精确核查基线**：`main@fbaa76243020dccc9d93bf8e053b08cca123c165`（本报告提交前）；CI [43612865959](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43612865959) SUCCESS。报告提交后的 HEAD 会变化，不能将文档提交误报为新业务代码已测试。
> **重要纠错**：2026-11-14 对话中形成的《首轮代码核查》并**未**入库；先前说“D00—D05未接通”时，**未先复核 10 月真实样板、A001、历史版本的 Adapter/Gate 代码，不足以评判既有能力**。本报告纠正该缺陷；只对下列读过的代码/记录下结论，不宣称已看遍整个仓库。

## 1. 已确证历史：旧生产系统真实运行过，不能判为“没做过”

1. **金泽样板（2026-10-17/18）**：`tasks/results/SAMPLE-TRIAL-12_LAYER1_REAL-LOOP_RESULT.md` 记录真实史料、同 run 六阶段 D00—D05、D02—D04 DeepSeek、逐层数据库写入和 G0—G5 当时的 current_valid；`specs/data-production/SAMPLE-TRIAL_CLOSURE_ANALYSIS.md` 记录从 read_model 到前端展示与线上消费。历史报告本身不是本次重新实跑证据，但与仍存在的 `pipelines/data-production/adapters/layer1-adapters.mjs` 内容生产函数相互印证。
2. **A001 绿之丘（2026-10-18）**：`tasks/results/STRAT-PROD-A001/P2_REAL_PRODUCTION_AND_EVIDENCE.md` 标识 `run=5176ade3-2892-4179-96d0-c27184b42ebd`、本地 PG18、DeepSeek 三次调用、D00—D05 六阶段、六种 L5 投影与可追溯原句；`A001_FINAL_HANDOFF_AND_B_CARD.md` 及 P4 回归报告记录可用前端及未关闭的建筑本体照片/多模态/Owner UI 验收，不得把这些边界改写为全部交付。
3. **2026-10-29 五主题记录**：`tasks/results/K7K8_资料台与五主题重跑_20261029.md` 的“重跑”是检索、素材评分/证据篮、故事篮与入口测试；不能把五题检索计数都称为五次独立 D00—D05/G0—G5 完整生产。
4. **旧 Gate 的重要语义差别（查过历史真实代码）**：在 `main` 仍可追溯的历史提交 `a4e597f480138aca1bcaf7c40b95ce9740ba56d5` 中，`layer1-adapters.mjs` 的 `writeGate` 直接 `update/insert control.gate_audits` 写 `result='PASS'`、`current_valid=true`。注释虽然说“producer 不自授 PASS”，**实际代码就是生产 Adapter 写审计行**。这是当时实验成功的实际机制，不能将旧记录无条件等同于 MHKA 新独立 Reviewer 签发；新约束需要单独正向证明。当前 `layer1-adapters.mjs` 已将 `writeGate` 转为 `recordGate` 候选，独立资格由另一安全上下文负责。
5. **旧的可继承内容生产代码还在**：`layer1-adapters.mjs` 有 D00、D01、D02—D04 实际 DeepSeek 调用/结构处理/各层持久化、D05 多类型 L5 发布；`topic-a001.mjs` 的主题配置仍在。判定 **专业处理实现存在**，但当时的来源片段、权利与发布前置不能直接降级移植到私人原件/当前 G0—G5；尤其旧版 `deepseekChat` 直接调 Provider，不符合现行委托/逐源外发/预算 Receipt 安全合同。

## 2. 逐段检查：旧功能在哪里，新 Studio 实际调用什么

| 实际路径节点 | 源码证据 | 可继承实现 | 现行接线/语义断点及判定 |
|---|---|---|---|
| Studio 创建→生产触发 | `apps/web/app/studio/StudioWorkbench.tsx`、`apps/web/app/api/studio/research-tasks/[id]/production/route.ts`、`apps/web/lib/studio-research.ts` | 现有自由文字研究委托、Owner 项目、来源/原件校验、CAS 预算预留和真实生产申请 | 生产入口 `apps/web/lib/studio-production.ts` 明确以 `--to D00` 启动 **仅 D00** 的本轮受控链；网页标题“申请进入 D00—D05”是总体目标，不能冒充已跑六阶段。 |
| 唯一 Runner、Registry、Gate | `pipelines/data-production/run.mjs`、`orchestrator/orchestrator.mjs`、`specs/data-production/production-registry.json`、`independent-stage-qualification.mjs` | 六阶段同一 Runner、旧 layer1 与新 private 的双绑定；逐阶段授权和 Gate 精确输入/输出摘要验证 | Registry 本地隔离标记 ACTIVE_AUTHORIZED **不代表正式投运**；Runner 的下一阶段输入仅是上一阶段 contract output，只有当前后数据形状吻合才能连续。Producer PASS 不能代替独立 Gate PASS。 |
| D00/G0 → D01 | `private-evidence-adapters.mjs` 54—105、`private-evidence-stage.mjs` 137—416 | L0 原件字节 SHA、来源注册、rights、来源发现 Y01/Y07 账及已提交 G0 候选；**已有**构造 D01 类型化请求，不能说完全没交接 | D00 的候选 `source_version` 审核须真正独立签发。D01 请求无条件含 `page:{kind:'scanned_page/v1'}`；图像 C02 可以按页核字节，但文本 C01 缺必要 `extent+quote`，不能直接消费。 |
| D01/G1 → D02 | `private-evidence-stage.mjs` 418—511、`private-evidence-adapters.mjs` 108—165 | C01 文本精确字节区间/引文、C02 扫描页精确定位及 read_unit 私有落库函数均在；D01 可产生候选并提交 G1 | **C02 当前实现是“页图字节已核 + 原件页定位”，非 OCR 的专业文字识读。** D01 Adapter 返回的是带 `stage:'D01'` 的存储候选；Runner 直接把它传给 D02，而 D02 Adapter 要求 `schema:'mohen.private-evidence-stage-request.v1',stage:'D02'` 和读后观察输入。不存在本次 Studio 自动构造 D02 观察的调用。 |
| D02/G2 → D03 | `private-evidence-adapters.mjs`、`private-evidence-stage.mjs` 514—575；旧 `layer1-adapters.mjs` D02 | 新 Worker 的 H05 `observeMaterial` 已落库并提 G2 候选；旧 Adapter 有真实 DeepSeek H 类结构化内容生产 | 当前新 Adapter 无自动从 D01 已签发读取单元生成 `observation` 的桥；默认 `linkReading` 仅负责已有证据关联，不产生历史观察内容，更不等于旧版模型处理已继承进新路径。 |
| D03/G3 → D04 | `private-evidence-stage.mjs` 576—623、旧 `layer1-adapters.mjs` D03 | 新 W07 `assertWorldClaim` 持久化、精确 evidence ID、候选和上游 G2 依赖已有；旧 LLM 世界建构、实体、时空、关系和冲突拒绝能力代码还在 | 新 Adapter 未把 D02 专业观察转换为当前审签 G3 的 `claim` 结构。默认 `linkClaim` 只关联既有主张，不能把它当世界建构。 |
| D04/G4 → D05 | `private-evidence-stage.mjs` 624—659、旧 `layer1-adapters.mjs` D04 | 新 `recordHumanisticFinding` 已有 A01—A12 格式检查、可追溯 claim、G4 候选；旧版 AI 人文发现与今日联系可供适配 | 当前新 Adapter 缺从 D03 事实/冲突经合法模型执行生成 `finding` 的 Studio 接线；若直接将 D03 候选作为 D04 输入，只会阶段格式 HOLD。 |
| D05/G5 → Studio/知识资产 | `private-evidence-stage.mjs` 660—685、旧 `layer1-adapters.mjs` D05、`supabase/migrations/20261114090000_mab_m5_d05_p04_story_seed.sql` | 新 D05 P02 世界投影候选落库；历史 D05 六种 read_model 可输出，并已建新 story_seed/agent_context 的受控存储函数 | **现行私有 D05 Adapter 只调用 `projectWorld`，未调用新 P04 seed/context 函数**；更未接通 Studio 合法读取/导演。旧 D05 的六类投影不能误称现行 private run 已生成。 |
| Studio→作品→Admin→WATCH | `apps/web/lib/studio-director.ts`、`apps/web/lib/publication.ts`、`apps/web/app/api/studio/works/[id]/revisions/route.ts`、`supabase/migrations/20261114120000/150000/180000/190000` 系列、`apps/web/lib/publication-watch-sql.mjs` | 旧 Studio/作品路线存在；新 `studio.director_plans`、`studio.work_revisions`、投稿/Operator/WATCH SQL 合同也已设计与部分实现 | 新旧作品路径并存：当前页面业务仍调用 `public.director_plans` 和 `publication.work_revisions`，新修订的可发布/可观看 SQL 存在，但不等于同一研究结果已穿过新导演→新作品→Reviewer/Operator。须沿实际 API 逐接口核对，不能只按 SQL 文件存在判 PASS。 |
| 费用终态与恢复 | `apps/web/lib/studio-research.ts` `requestProduction`、`studio-production.ts` `getProductionStatus` | 真实预算预占、单任务 CAS、Runner HOLD/FAILED 持久诊断 | `productionReservation` 成为后续再执行的阻断；当前查询/终态流程没有已核实的受控结算和对账动作。不可无依据自动退款或重放收费调用。 |

## 3. 关键归因与对先前表述的修正

- **不是“旧 D00—D05 没有闭环”。** 旧金泽与 A001 实际运行、LLM、数据库、前端消费有正式历史记录，也有对应实现；不能重新立项把旧能力再造一遍。
- **不是“只有六个空壳 Worker”。** 一部分现行私有数据库表、SQL、可信字节/证据桥、候选存储和独立 Gate 接线已存在；当前问题主要是**两条已实现能力之间的专业转换/授权衔接未完成**。
- **也不是“改动一个 --to D05 就能恢复”。** 现行私有链 D01→D02→D03→D04 仍要求不同 typed request，旧 LLM 需要纳入现行可审计 Provider/合法最小外发/权限/费用控制，旧 Gate 写审计模式不能直接恢复；这些是当前可定位的实质断点。
- 旧系统“六门全部 current_valid=true”属于**当时的数据库/代码口径**；新合同要求的独立签发与精确修订回读必须另验。同理，过去五主题的检索/评分重跑不等于五次完整 D/L/G 生产。
- **此前核查确有遗漏并过度概括**：此前只看到 private Adapter 便判断 D00—D05“缺专业生成”，没有先核对 `layer1-adapters.mjs` 的既成模型生产、10 月真实成果和历史直接写审计机制。修正为“专业代码可继承，但私有链尚未完成受控适配、精确交接、同作品实跑”，比直接断言需要重新建设准确。

## 4. 本次“代码查全”的边界（明确没有查全）

**已逐路径核过的主干**：历史样板/A001/五主题记录；历史 `a4e597f` Gate 写入；现行单 Registry/Runner/六阶段 contracts、两套 Adapter、私有 Worker、源版本绑定、独立 Gate current client、主要 Studio POST/读状态、预算预留、旧/新导演修订及发布表/SQL；相关 D/L/G 单元测试名称和正负例。足以对**断点在哪里、什么应该继承**做有源码依据的定位。

**本次没有完成**：全部 63 个专业方法逐项实参对照、全部 13 种资产的使用端点、H1/H2/H3 与 19 个组件逐个渲染/回读、所有 API 审核/媒资/撤权完整调用图、全部数据库迁移真实状态、真实同 root 私有 PG/HTTP/Storage/Provider 运行及独立 Reviewer 签章。因此不能声称“全仓库代码逐文件查完”，更不能称 M5 八维已通过。下一施工必须把**最前一处邻接合同**落到代码与自动测试上，随后沿同一真实任务推进，而不是重新做旧样板或全量盘点。

## 5. 继承与实施裁决（沿原 PLAN 执行，无新规范）

1. **保留单 Runner、Registry、已有 L0—L5 持久层/原件桥/Gate 服务、旧 layer1 的专业生成能力**；对 `layer1-adapters.mjs` 的模型提示与数据结构按专业阶段定向抽取/适配，**不整体切回其原始 direct-provider、权利推断或旧 Gate 写入路径**。
2. 当前真实最前节点仍为 **Studio 同任务 → D00 候选 → 独立 G0 有效资格/读取 → D01**。已知 D00 到 D01 的 typed 交接存在，优先核验合法签名的当前状态；文本 C01 需要字节区间与准确 quote、图像 C02 需要确认“页级校验”与“专业 OCR”不可混淆。
3. 对后续 **D01→D02→D03→D04→D05** 定向打通按已签前序生成专业 typed input、输出存储候选和独立资格；阻断点分为“有实现未接线”“旧能力需合规适配”“专业方法尚缺实现”“真实环境/授权未就绪”四类，绝不都算作从零开发。
4. Studio 新旧导演/作品链和预算核销是本次路线的**后续实际交汇**，不能先拿无来源旧修订演示替代最终同一作品。所有代码修复须用同一 root、精确证据/版本、Owner/Reviewer/Operator 权限和真实 Receipt 自证。
5. **证据等级**：本报告只达到 `SOURCE_REVIEWED + HISTORICAL_RUN_DOCUMENTED + CURRENT_CODE_AUDITED`；无本次新业务代码提交/真实数据库操作/真实 Provider 调用/独立 Gate 正签或 Owner 验收。准出保持 `M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD`。

**追踪与归档**：本报告是 `tasks/results/MAB/` 下的现有工程证据文件；`CURRENT.md` 只增加本次准确断点与链接；`tasks/implementation/MAB/progress.md` 只追加本次查询的源码、事实和下一入口；不修改 `PLAN.md` V1.7，也不创造并列施工标准。
