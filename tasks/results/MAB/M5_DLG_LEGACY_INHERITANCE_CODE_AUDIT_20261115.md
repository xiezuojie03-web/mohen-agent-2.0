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

## 6. 仓库、分支与代码位置清点（2026-11-15）

本节是针对 Owner“到底有几个仓库、代码有几个位置、为什么按线查仍漏”的事实补充，不改变 PLAN、验收标准或当前施工路线。

- **GitHub 账户 `xiezuojie03-web` 可见且归其所有的仓库共 6 个**：`mohen-agent-2.0`（现行墨痕主工程，private），`hushang-jingwei`（沪上经纬历史工程，private），`modu-guzhen-zhilue`（早期古镇工程，private），`OpenSH-mcp`（外部开源 fork），`jiangshan-map`（外部开源 fork），`-`（其他历史仓库；尚无当前施工职责证据）。**M5 正式工程只有 `mohen-agent-2.0` 一个主仓库**；外部 fork/历史工程不作为第二主链。
- **当前主仓库有 3 个远端分支**：`main`（唯一可写现行基线），`mab/m4-provider-spend-controls-20261107`、`mab/owner-led-execution-plan-20261107`（历史分支，仅在证据需要时只读）。不以“分支存在”认定其中藏有更新的合格工程。
- **当前仓库按技术职责分目录，而不是按 D00—D05 线性分仓**：`apps/web/`（UI、Studio、Admin、WATCH及 API），`pipelines/data-production/`（唯一生产 Runner、Registry 调用、Adapter、Worker；同一目录同时存在旧 `layer1-adapters.mjs` 与新 `private-evidence-adapters.mjs`），`packages/`（Agent 运行时和数据库访问），`supabase/migrations/`（结构/权限 SQL），`skills/`（专业方法声明），`scripts/` 与 `tools/`（工具/脚本），`tests/`（验证），`governance/`、`specs/`（权威设计/合同），`tasks/results/`（历史成果及证据）。`pipelines/research/`、`pipelines/legacy/` 和 `archive/` 保留历史材料，不能当现行 Runner。根目录实际树已查：2632 个树项（文件+目录），不是2632个要逐一重写的代码文件。
- **三种“位置”不可混为一谈**：① GitHub `main` 是当前应审查的远端源码基线；② Trae/其他开发工具的本地 Git 工作树可能含未提交/未推送代码，本轮无法直接访问，**不能证明完全同步**；③ Vercel 部署是另一个精确 SHA 的构建副本，Supabase 运行库是数据/模式状态，均不等于 GitHub 最新源码。不能把旧部署当现行运行事实。
- **漏查根因（本次责任归属）**：初次核查只顺着目前 Studio 调用的私有 Adapter→Worker 读，虽然看过 Runner，却**没有同时对照同一目录下仍存在的旧 layer1 内容生产函数、历史运行代码及其 Gate 语义**，还没有把 `apps/web` 各真实消费者/业务路径完全反向追踪。由于动态加载、Registry 的双 Adapter 绑定、历史与当前并存，在只看“当前执行路径”时就可能漏掉“必须继承的可用实现”。这不是六个仓库引起，也不是必须先跑程序才可发现，是**我对代码范围与继承核查不完整**。
- **后续同一路线的正确核法**：先钉住 `main@SHA` 和本地差异可知性，逐段记录实际调用者→被调用实现→输入/输出契约→旧可继承实现→DB/Gate/权限/费用→后续消费者；每个节点同时核对“在用、已实现但未接线、历史仅供移植、未实现”四类。**源代码路径走通和 Owner 实机验收是两种不同证据**；没有查过的节点标未查，不写“已查全”。

## 7. PLAN V1.7 任务标准清晰度与实际执行合规复核（2026-11-15）

**裁决：现行任务标准在本轮主干断点上已足够明确；主要失效在施工落实与自动检查覆盖，而非缺任务书或需要再升 PLAN 版本。** 本节只记录“要求→实际代码/测试→判定”，不修改权威施工标准、不宣称本轮已修复业务代码。

### 7.1 现行权威已明确约束输入—执行—输出—下游接收

- `PLAN.md` §0：以同一 Creator/Project/root_task 从 Studio 开始，找最前断点，优先继承已有能力；每节点核真实输入/输出、失败回执、权限和来源。
- §3.3：D00—D05 每个专业方法要有 Stage、L输入/输出、Gate、Skill、Executor、Adapter、Tool、权限及版本的唯一绑定；每项有正反测试或具名 HOLD。
- §3.5 C(1)：**逐站**核上游真实输出与下游真实消费、同一 project/root/source/version/revision/rights/purpose/receipt及失败恢复；区分已有模块、邻接合同和新缺口。
- §3.5 C(2)、(5)：优先贯通同一用户作品主干；每批记录最远可信节点、最前阻断、可继承证据及下游接收，局部 PASS 不准冒充同 root 整链 PASS。
- §6.2、§6.4：每批回执含实际输入、依赖、真实输出、下游接受结果，必要正/负例与运行环境；未跑必须标 NOT_RUN。§7只提供接续入口，不另立标准。

**小幅可执行性局限**：PLAN 描述的是业务准出标准，没有逐字段枚举每一种阶段请求的 JSON schema；这应由各阶段现行专业合同和可执行测试落实，不是必须新增另一套 PLAN/验收任务才能开发的缺失。现有计划本身已要求核对字段和邻接真实消费。

### 7.2 对照当前 HEAD 的具体不合规/不充分实现

1. **静态交接守卫名存实亡（确定）**：`scripts/guards/check-stage-handoff.mjs` 仅断言 `prev.output` 和 `cur.input` 非空，不核是否相等、对象 schema、真实生产 Adapter 的返回结构、下一阶段实际可消费。打印 `STAGE_HANDOFF_OK` 不能证明阶段输入输出匹配。
2. **“六阶段 PASS”测试使用合成 Adapter（确定）**：`tests/data-production/orchestrator.test.mjs` 的 `full PASS flows D00→D05` 调用 `runAuthorizedFixture` 与 `fixture-adapters.mjs`；证明 Runner 可在 *fixture* 条件下流转，不证明 `private-evidence-adapters.mjs` 的 D00→D05 真实结构交接。
3. **私有测试主要覆盖单阶段而非前后两站（确定）**：`tests/data-production/private-runner-stage-handoff.test.mjs` 显式以 D01→D01 一阶段范围运行，验证授权/Gate HOLD；`private-evidence-adapters.test.mjs` 独立给 D02/D03/D04/D05 预构造请求测试 Worker 候选持久化，没有构造 `D01 output → D02 input` 的正例，不能证明自动连续交接。
4. **真实代码的具体断点（确定）**：`apps/web/lib/studio-production.ts` 仍指定 `--to D00`；`orchestrator.mjs` 把上游 `result.outputs[contract.output]` 直接传下一阶段；`private-evidence-adapters.mjs` 的 D01 output 是 `stage:'D01'` 候选，D02 Adapter 则要求 `schema:'mohen.private-evidence-stage-request.v1', stage:'D02'` 及专业 `observation` 或证据关联输入。旧 `layer1-adapters.mjs` 的专业内容生成虽存在，但新的受控路径尚未完整适配。因此：**即便把启动终点改为 D05，也不能仅凭已有守卫/fixture 测试判断整链可用**。
5. **历史继承输入盘点不足（确定）**：本轮之前排查新私有 Adapter 却未先查同仓库旧 `layer1-adapters.mjs` 和金泽/A001真实代码/报告。这违反 §0 和 §3.5 C 要求“优先复用已验能力、区分模块与邻接合同”。不应以“新代码没调用到”为由认定专业生产能力须重建。
6. **受限真实运行是另一个事实（不能误称违反计划）**：最近 `progress.md` 的 D00-only 是受控小批次，已明确不冒充全链 PASS；当前远程连接缺 Owner 本地持久 PG/Storage/Gate 环境，本轮实机 NOT_RUN 是如实标注。问题是**在此限制下仍应先完成静态邻接兼容检查、既有能力继承审计和可用的定向单测**，不能把缺本地运行条件当作代码断点无法查清的理由。

### 7.3 责任归因、执行调整与验收

- **主要原因**：执行者没有持续按§3.5 C的“同一 root 从前到后逐站追踪、对旧实现同步继承”开展核查和交接修复；质量守卫与测试名称容易让局部 PASS 被误读为全链 PASS。归类为 **工程执行/自动测试覆盖失效**。
- **非主要原因**：PLAN文字含糊。业务标准、原有职责及准出条件已清楚；不另建“输入执行输出专项/新矩阵/新计划版本”，也不追加验收分母。
- **后续必须真正落实在业务代码而非再写承诺**：从真实 Studio 入口，逐节点确认①输入（精确身份/source/rights/schema）②执行（当前调用的 Worker/Adapter/Agent/Gate）③输出（持久候选+资格/失败回执）④下游接收（下一站实际接受的字段、精确修订/用途）；每处识别历史可继承实现，修适配层而非重造能力。使定向交接测试在上述真实输入输出不兼容时明确 FAIL。只能在实际代码和对应测试提交之后记 `CODE_FIXED`，在真实持久环境同任务跑过之后记 `RUN_VERIFIED`。本次只提供诊断，未做这两类变更。
