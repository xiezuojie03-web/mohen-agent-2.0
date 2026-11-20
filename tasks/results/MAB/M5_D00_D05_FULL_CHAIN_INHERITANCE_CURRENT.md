# M5｜D00—D05／G0—G5 全链历史施工成果继承核查（按需复用索引）

> **状态标注（2026-11-20）**：本文为历史继承索引，§8.1「当前云端实存」等带时间的快照只代表当时时点，不代表当前事实；当前事实以 `CURRENT.md` 与 progress 最新批次为准。文中对 `M5_MAINLINE_NAVIGATION_20261115.*` 的"实时工作入口"引用已按 AGENTS §2 停用，不再作为状态源或维护对象；`#m5-continuation` 锚点在 `ENGINEERING_HANDOFF_CURRENT.md` 不存在。本标注不改变历史记录内容。

> **持续施工说明（2026-11-16）**：本索引用于利用已有成果，不设全量继承核查门槛。当前实现能用就用，接口/配置缺口定向修，不符合现行设计者在原职责内受控替换；详见PLAN §0/§3.5 D。下文带历史时点的缺口不作为当前施工命令。


> **2026-11-16 更新优先说明（M5-NAV-CORRECTION-01）**：本文R01—R11及§3/§5中的“尚缺原M2/Storage”保留为先前时点的判断，现已过时；`mohen-cloud`的M2私有表、Storage桶、C01/C02与来源查询、M3受限Gate Service和ACL均在2026-11-16安装并回读。2026-11-08本地真实原件（236005字节、SHA、source/version/raw）、11-13朱家角/七宝D01/G1真实分段、11-16隔离PG17同Root G0签发资格验证继续有效，禁止重复造“原件接入”及Gate/Runner。**当前云端运行HOLD**是尚无当前同Root原件/机器Reviewer/持续Runner实际消费，C01 `E_L1_TO_D02` typed转换与受控H05生成现已由712a08b补齐代码接线，Owner读及D02—D05候选函数已由20261116122301安装；接续应验证真实同Root G1→D02/G2，C02及后续接口另核，不照旧缺口重做。实时工作入口见`tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json#construction_tracking`与`CURRENT.md`顶端最新事实；历史原段不得当作最新缺口指令。

> **用途和权威边界（2026-11-16）**：这是面向 M5 后续 D00—D05 全链断点修复的**历史实跑证据、可继承能力与缺口索引**；不是新任务书、设计合同、技术方案或新验收标准。唯一施工依据仍为 `tasks/implementation/MAB/PLAN.md` V1.7 第0章、第3.5 B/C节及第6章，当前事实见 `CURRENT.md`，原始逐批记录见 `tasks/implementation/MAB/progress.md`。**只按本次受影响阶段/连接查阅相关条目及必要原始记录；不要求每批通读第2—6节或补齐全部R编号**；本索引只判历史可复用范围，不宣布当前 G0/G5 或 M5 运行PASS。
>
> **核查方法**：先检查原始历史运行报告、2026-11-07—16期间 `progress.md` 相关批次、11月10日结构化正反回执、11月15日既有遗产源码核查，再对照 GitHub `main` 的原 Runner、两类 Adapter、Private Worker、Reviewer、Registry、Signer、当前资格读取和11月16日两批代码及 CI。**原始材料与当前源码是不同证据层**；以下“验证”按原记录的当时环境与运行身份解释，本索引初稿未重新连接PG；R11已在现有`mohen-cloud`真实PG17实装K3基础及ACL修复，但未启动正式Reviewer、私有Storage、同Root业务Gate或付费模型。
>
> **现行全局结论**：历史上多次跑通真实阶段与专业审核；旧版整链、独立Gate逐门、真实项目多题材与作品垂直切片均有可继承实现和证据。**尚未证实**同一 Studio/Creator/Project/root 在现行受控私有路径中、由真实 Runner 连续产生精确输入输出摘要、独立 Reviewer 签发每一阶段 `stage_binding`、资格逐次消费、受控Provider与费用、资产/作品/Admin/WATCH的M5八维全链。此差异是集成缺口，不准误述为 D00—D05 从未实现。

## 1. 机器和后续执行方的最短入口

**2026-11-16执行安排入口**：Owner要求的完整继承/连续总装已写入唯一[PLAN §3.5 D](../../implementation/MAB/PLAN.md#m5-continuous-assembly)，覆盖原件、G/Runner、专业方法、Agent/费用、资产、Studio、Admin/发布/WATCH及回归的逐域复用与六个工作包；新窗口指令在[工程交接入口§4](../../implementation/MAB/ENGINEERING_HANDOFF_CURRENT.md#m5-continuation)。本索引继续只管历史证据，不另立顺序；下文§3—5的历史环境缺口须结合顶端更新、实时CURRENT和PLAN判断，不能据旧“先核G0”无限重复上游或阻止独立代码修复。此次只有执行安排落文，未新增任何业务运行PASS。

1. 先从 `PLAN.md` 第0章及第3.5 B/C节确认本次主干边与唯一八维，不从历史报告中的“下一步”决定当前顺序。
2. **本文件第2节是历次成功证据目录，第3节是 D00—D05 逐段继承清单，第4节是 Gate 与 Runner 交接差异，第5节是当前最小断点，第6节是原文件定位。** 只顺着当前边阅读关联条目，不必每次重读整个数千行施工账。
3. 对被修边记录：以前哪个主题／run／审计曾成功，**成功的权限/环境/方法/输出合同**，当前哪一项不同；能引用旧源码或测试的直接继承，按当前设计和实际差异决定复用、修复或在原职责内替换；没有运行环境标 `NOT_RUN/DEFERRED_ENV`，不能说“原能力不存在”。
4. 精确实跑后将新证据追加 `progress.md`，事实变化更新 `CURRENT.md`；对应导航边在 `M5_MAINLINE_NAVIGATION_20261115.json/MD/HTML` 原位更新三层状态，不因为把旧成功写入本索引就调为PASS。若未来有更高等级的可重复实证可对本索引**原位增补**，不另建并行台账。

## 2. 历次施工、真实运行与验证记录（按日期；不可混算“跑通次数”）

| ID / 日期 | 题材或批次、主证据 | 当时实证与可继承能力 | 不可扩大的证明边界 |
|---|---|---|---|
| R01 · 10-17/18 | 金泽古桥、水乡；`SAMPLE-TRIAL-12`，包括 run `71901d36…` 干净重跑；`SAMPLE-TRIAL_CLOSURE_ANALYSIS` | 真实方志文本、D00—D05 六阶段、DeepSeek D02—D04、七实体七关系、L4发现/L5故事，原 `read_model` 和视觉舞台消费；旧时期 G0—G5 `current_valid`；测试和实际展示记录在案 | 旧 `layer1-adapters.mjs` 的 `writeGate` **由 Producer 自己直接向 `control.gate_audits` 写 PASS/current_valid**；不具备现行独立Sign/Owner原件字节／精确 `stage_binding` 资格 |
| R02 · 10-18 | A001「绿之丘」；run `5176ade3-2892-4179-96d0-c27184b42ebd`；`STRAT-PROD-A001/P2` | 独立于金泽的主题、三文本+两有权照片、DeepSeek 三阶段、D00—D05、G0—G5旧资格、20文本+2图像阅读单元、L3关系/变化、L4今日联系、六种L5投影、前端取数/撤权演练 | 同属旧Gate写入语义；照片权利、建筑本体缺图、多模态读图和正式消费仍有范围边界；不应将其成果迁移成当前专业G签名 |
| R03 · 11-07 | 田赋卷《一亩三分地的账》；`progress.md`「M5闭环跑通」 | 真实史料OCR、作品创建、G5对象资格、作品发布与 WATCH 本地HTTP 200，证明素材→作品→观看存在历史可用路径 | 报告未证明**该作品的 D00—D05 同一Runner连续运行**；当时Owner签G5及SQL落地不能冒充现行机器Reviewer/G0—G5同Root；不能等于M5八维完成 |
| R04 · 11-08 | 《松江府田赋：一亩低田的税单》；`progress.md`「第5步批次H」 | 真实隔离PG+实际 DeepSeek+受控委托，11/11同一作品路径到修订/发布/WATCH、撤权与重新签发恢复；旧L2/G5成果实际用于创作；已有验收脚本 `tests/integration/m5-batch-h.integration.ts` | 是**复用历史合格知识的作品链**，不是再从D00自动产生六阶段；当时G5候选部分由超级用户登记，Owner体验与现行严格资格仍独立待核 |
| R05 · 11-09 | 《松江府志》第51页，`progress.md`「CP2-E第五步」；G0 `97a6c3a1…`、G1 `128a27ec…`、G2 `b4807c1c…`、G3 `ba852243…`、G4 `62751b3f…`、G5 `b00a6751…` | 本地 `mohen_dev` 真扫描页、C02/OCR后L1、H05/L2、W07/L3、A类L4、P02/L5；六个阶段分别有运行报告与**机器签+Owner签**、现行资格验证及撤权/修订相关正反；原 `verify-3-gate-chain.mjs` 9正/11负实测 | **各D阶段采用不同run_id逐段提交/签发并人工提供合规输入**；不等于“单Runner一次自动穿过所有G”；Owner本地签名不等于生产G；OCR有字符误差，来源仅允许读/留存 |
| R06 · 11-10 | D00→独立G0方法预选，`evidence/method-plan-gate/d00-g0-method-plan.json`，C01@v1，19项0失败 | 本地隔离DB出现 G0 `PASS / independent_gate`、`current_qualification_is_valid=true`、来源版本/权利/方法预选检查成立；无方法计划的负例拒签；可以继承 `tools/verify-d00-g0-method-plan.mjs` 与既有 Reviewer/DB 签发 | **同份证据正例Runner仍 `HOLD:INDEPENDENT_GATE_NOT_VERIFIED`**；G0对象资格成功≠Producer该次输出已绑定并被Runner消费；不是G1—G5实跑 |
| R07 · 11-13 | **朱家角**非模板主题，`progress.md`「B4、ST-02～ST-06」，`qr10-generalization-smoke-20261113.json` | 真实SHL API取得1259B地名志正文，ST-01/D00/G0 current，C01 D01/G1文本字节范围，H05 D02/G2，W07 D03/G3、A05 D04/G4、P02 D05/G5，独立机器审核与持久证据；另有 P04 `story_seed/agent_context` G5 | D00—D05按阶段各有run和审批；D03/D04专业陈述部分受控构造/人工输入，非全自动Agent+LLM；资料允许 machine_read/retain，display等另审；非同一个Runner连续执行 |
| R08 · 11-13 | **七宝**非模板主题，同上，原件1121B | 第二个独立Project/Topic的真实取件→G0、C01读取/G1、H05/G2、W07/G3、A09/G4、P02/G5，P04两分面独立G5，验证多项目和A方法泛化，不依赖金泽样板固定项目 | 同R07的分段run/人工专业输入/用途范围限制；不是第二次自动全链作品验收 |
| R09 · 11-14 | 自由题材 `layer1` 六门，`progress.md`「A'逐门落地 G1～G5」；样例 `dead0003`；G0→G5均有审计 | **真实隔离DB+真实本地8789服务**，逐门建对象/候选、按依赖独立签发，G0 `113f71d9…`、G1 `d3a84419…`、G2 `8094994e…`、G3 `93611955…`、G4 `9c2b27fb…`、G5 `78114b50…`； `layer1` 非私有来源审核/方法/对象绑定已修 | 每门**组件级正向**，不是 Studio→单Runner→六门顺序真实串联；部分DB对象手工构造；该执行环境子进程spawn `EPERM`，同Root运行未证；当时tests/data-production记录243P/3环境失败，不能说全套0失败 |
| R10 · 11-15/16 | M5受控私有链：D00→D01 C01、D01→D02 HOLD、G0签署精确 `stage_binding` 的安全改造；`CURRENT.md`及本账末批 | 原私有 Worker/可信来源的C01读取、typed D01请求、Runner边界HOLD已进入main；11-16 BATCH-01 `718503e6` 精确唯一候选+真实Project；BATCH-02 `56ac0ccb` 独立从持久字段重构C01请求digest，签署接口增强 `501829ac`；CI分别SUCCESS，BATCH-02边界回归270P/0F | **这不是新增的一次G0真实PASS**。BATCH-02仍为模拟DB Reviewer接口与CI；持久PG独立机器Signer、同Root资格读/撤权、真实Owner/Storage/HTTP = `NOT_RUN/DEFERRED_ENV`。C02及G1—G5的同类型绑定不能借C01代码推定通过 |
| R11 · 11-16 | 云端PG17 K3兼容与安全ACL实装；`dd954921`、`3ac4fd3`、`1c5b131`及本账BATCH-04 | `mohen-cloud`成功装入原K3签发/资格/撤权事务，SECURITY DEFINER函数PUBLIC EXECUTE被修复；Producer/anon不能签发、Signer可签；旧711审计原字段摘要不变；复用原PG17/HTTP测试链，后续[主CI 43819354344](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43819354344)、[PG17 43819354362](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43819354362)、[HTTP 43819354334](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43819354334)全部SUCCESS | **非当前G0 PASS**：云端M2原件表、Storage及正式机器Reviewer策略/绑定未接入，当前签名/资格均0；同Root Runner、撤权/恢复尚未实跑 |

**计数口径**：R01、R02、R05、R07、R08是至少五个不同历史主题/试验对象的六段生产或逐段资格验证记录；R03、R04属作品垂直切片，R06属独立G0专项，R09属六门组件验证，R10属代码/CI修复，R11属云端K3迁移与安全ACL实证（不属于新增G0业务签发）。它们**不能累加为十次同等验收标准的“一次运行全PASS”**，也不能被抹成“只做过两次”。R05与R07/R08已证明**新独立Gate体系下多次分段签发**，不能重新实现同义G0—G5能力。

## 3. D00—D05逐段：能直接继承的实际资产与尚缺的最小接口

| 段 | 已存在并可继承（具体实现、证据） | 当前可信缺口/不得伪称 | 下一修复只准触达的差异 |
|---|---|---|---|
| **D00/L0/G0** | R01/R02旧源、版本、raw、照片的登记/幂等；R05真实页图+Owner/机器G0；R06 C01方法计划+独立G0；R07/R08真实非模板REST取件→source/version/raw→G0；R09 `layer1`独立G0非私有来源规则；现行 `private-evidence-stage.mjs`、`private-evidence-adapters.mjs`、`tools/rule-gate-reviewer.mjs`、`tools/local-gate-service.mjs`、`gate-stage-candidate-selection.mjs`、`gate-stage-output-attestation.mjs`、既有 `control.sign_gate_candidate` | R06对象资格成功但Runner HOLD；现行新链所需精确 `run/job/stage/reviewer/consumer/input_digest/output_digest` 独立签署和Reader/Runner同Root仍无持久正反；旧 `writeGate` 不能复活 | **只核当前C01独立Signer真实审签与精确阶段输出/资格消费**；R05/R07/R08证明 Gate 权威与规则可复用；对C02另核可重构扫描输出，非私有 `layer1` 不与Private混同 |
| **D01/L1/G1** | R01 4读取单元、R02 20文本+2图像、R05 C02页/识读候选、R07/R08 C01真实字节范围+G1独立签发；`private-text-reading-repository.mjs`、`private-scanned-page-reading-repository.mjs`、`private-evidence-stage.mjs`的 `draftTextReading` / `draftScannedPageReading`；现行Studio Owner读取上下文一致性迁移 | C02扫页定位/字节校验**不等于OCR准确识字**；现行单Runner由G0向D01以及G1精确 `stage_binding`、签后读尚未同Root证明 | 合法当前G0→D01、真实L1候选→独立G1→Runner当前资格；复用R07/R08已解的 C01/C02方法与ref筛选，不重写阅读仓储 |
| **D02/L2/G2** | R01/R02实际DeepSeek观察、mention及证据入库；R05真实H05、R07/R08 C01 text_quote+G2；既有 `private-evidence-stage.mjs` H05 `observeMaterial`、`persist_private_material_observation` 及 `layer1-adapters.mjs` D02模型结构处理 | **已签G1阅读单元→D02合法 typed observation request** 的现行Producer自动生成/接收尚缺；原“上一阶段output直接当下一input”会HOLD；受控Provider派发/费用要实际接线 | 先消费真实 `L1/G1` 并构造符合合同的D02输入，复用H05 Worker、原DeepSeek专业处理思想；不新建D02或用手工观察冒充自动生成 |
| **D03/L3/G3** | R01/R02七实体/关系、时间、冲突拒绝；R05 W07签发；R07/R08多项目W07、七用途其中explain_bounded G3；R09独立组件G3；现行 `assertWorldClaim`、`world.claim_revisions`和原 `layer1` 的实体关系/时空实现存在 | 当前D02证据→D03 W07 typed claim自动适配、原件/用途及精确G3同Root未证；W05关系方法与W07世界主张不可仅改标签伪转换；非签用途不能复用G3 | 复用现有世界建构代码和 `claim_revision` 存储/审核，补已签L2→受控方法输入及真实Runner签后消费；保留冲突/推断边界 |
| **D04/L4/G4** | R01/R02真实AI人文发现与今日联系；R05 institutional_mechanism；R07/R08 A05、A09不同finding_type、G4 BE用途；R09 A01组件验证；现行 `recordHumanisticFinding`、`meaning.findings`、A01—A12方法检查 | 从真实 `L3/G3` 经专业方法/受控Provider生成 `finding` 的现行自动链未证；A方法登记不等于全部专业实现，机器签发不代替人文质量裁决 | 复用原人文发现/反证、A族持久化及G4现有规则，只补前序世界对象→合法专业输入/实际模型授权与回执 |
| **D05/L5/G5** | R01/R02 `story_seeds/world_projections/map_timeline/evidence_pointers/agent_contexts/discovery_paths` 已实际产出消费；R05 P02投影+G5；R07/R08 P02 G5及P04 seeds/context 独立G5；R09独立组件G5；现行 `projectWorld`、`persist_private_story_seed` / `persist_private_agent_context`、旧 `layer1` D05投影等实现 | 现行 `private-evidence-adapters.mjs` D05尚非六分面自动调用；L4→D05 typed分面与P04接线、逐分面consumer/purpose/rights及当前G5、Studio/Admin/WATCH合法消费未同Root证实；不能把作品编辑审核等同专业G5 | 从已有P02/P04/六分面实现选**确有必要**的分面作受控适配；守住现有G5专业签发、独立运营审批、精确WorkRevision与媒体许可，不重写全部D05 |

**跨段正式可继承代码根**（都在现行 `main`，须按真实HEAD复查）：`pipelines/data-production/run.mjs`、`pipelines/data-production/orchestrator/orchestrator.mjs`、`specs/data-production/production-registry.json`、`pipelines/data-production/adapters/layer1-adapters.mjs`、`pipelines/data-production/adapters/private-evidence-adapters.mjs`、`pipelines/data-production/workers/private-evidence-stage.mjs`、`tools/rule-gate-reviewer.mjs`、`packages/data-access/src/gate-stage-qualification.mjs`。旧 `layer1` 内容专业能力**应按方法与输入输出做最小适配**，但旧Producer自签/旧直接Provider/未核权利不可直接复用。

## 4. G0—G5和单Runner的继承裁决（重点防止第N次重做Gate）

| 已有验收面 | 历史实证 | **本轮裁决** |
|---|---|---|
| **Gate建表、Reviewer身份、策略/用途、CAS签发、资格当前性、失效** | 11-09真PG双身份六门、资格退休正反；11-10独立G0及负例；11-13两个项目G0—G5；11-14真库8789逐门PASS | **可继承已有Gate/Signer/资格存储，不得另造第二Gate或以“尚无运行闭环”为由重建规则。** 历史签名对当前代码/对象仍有效与否必须按实际revision/current再次读，不能直接拷贝历史PASS。 |
| **专业方法、真实存储候选** | 10-17/18实资料与DeepSeek、11-09扫页、11-13 C01/H05/W07/A05/A09/P02/P04 | **可继承方法能力与持久落点；明确“原实现存在但新调用未接”**；任何方法扩展只针对真实欠缺，不能把人工构造的专业内容标成Agent自动生产。 |
| **单次阶段输出精确绑定（当前前沿）** | 11-10审计PASS但Runner HOLD；11-14独立服务组件PASS但没有真实同Runner; 11-16 BATCH-02新接口mock回归PASS | **不可直接继承为同Root PASS**。只核独立Reviewer能否用可信持久事实重构本次C01输出摘要并签 `stage_binding`，Runner能否在同一事务/上下文读到准确当前资格且撤权/篡改拒绝。 |
| **D01→D02及后续 typed 专业交接** | 11-09/13分别运行各段；旧 `layer1` 内容能力存在 | **已证分段≠已证自动衔接**；只补上游真实合格输出转换成下游明确类型/权限输入，不能再逐门造相同demo证明G已存在。 |
| **Studio/内外Agent/费用/作品/Admin/WATCH** | 11-07/08曾以合法材料/已有知识跑到作品/发布/WATCH；11-08有真实委托DeepSeek费用回执 | **复用既成UI/创作/发布能力及回归**，但这两次作品记录不允许代替同一新生产run的M5八维；费用、审签、Owner等需在现行同Root重新证实。 |

**特殊警戒：同名不同合同。** 旧10月 `gate_audits.current_valid`、11月新 `control.qualification_current`/`current_qualification_is_valid`、签发对象 `PASS`、单Runner的 `stage_binding`，是不同的资格证明面。11月14日 `layer1` 的“非私有来源fallback”与新Private Worker `STORED_VERIFIED` 不同，不得把较弱的证据校验嫁接到Private路线。旧人工/超级用户在本地登记候选不证明现行低权限Producer已可连续运行。

## 5. 历史断点定位与不可重复施工项（逐条时点见证据；当前顺序回PLAN/CURRENT）

1. **首先仅核 `E_D00_REVIEW` → `E_D00_QUALIFY`**：R05/R06/R07/R08/R09的G0规则、真签名和资格有效性是继承前提；11-16 BATCH-01（`718503e6f5ce9166a25628bcff437c2daab5ded1`，CI `43797796219` SUCCESS）已修候选唯一性/真实项目；BATCH-02（`56ac0ccb14f6154a8f203eb37712047c622d8f61`、`501829ac1509b2e5eb11d454be2247be7e01c8ed`，CI `43799675858`、`43800172713` SUCCESS，270正/反PASS）已修C01摘要独立重构及决定接口。**不要再写一份功能相同的候选选择器、Gate Reviewer或签发器。** R11已确认现有云库可用、K3函数及ACL已接入，环境不再被描述为“缺少非生产PG”；尚缺原M2/Storage/机器Reviewer策略与真实Owner/Worker/Runner同Root的正反签名、读取、撤权；未具备条件则继续HOLD。
2. **随后 `E_L0_TO_D01`、`E_D01_REVIEW`、`E_D01_QUALIFY` 与 `E_L1_TO_D02`**：R05/R07/R08已证明C01/C02、G1和真实L1读取能力；优先定位同run真实typed承接，缺 `stage_binding` 与G1当前消费才补合同，不重建识读/G1规则。
3. **再按实际首阻断逐段到G5**：从L1/G1→H05/D02/G2→W07/D03/G3→A/D04/G4→P/D05/G5逐段接合法typed输入、源与rights/用途、专业调用、模型/预算回执及资格签后消费；每段用R01/R02/R05/R07/R08/R09既成实现与正反基准，**不会因为新输入类型HOLD就宣称“D02—D05没实现”**。
4. **最终仍按PLAN八维而非本索引收口**：真实同Root内容、资产版本、Studio编导作品、Admin审核、发布、WATCH/撤权和实际用户体验；历史分段成果不能拼为一次新PASS，生产迁移/正式服务启用/公众开放仍需独立授权。

**施工前不能遗漏的五个回归哨点**：A) 10月合法旧内容路径不得恢复Producer直写G；B) 11-09独立G签发及撤权/CAS有效性；C) 11-13多项目（朱家角/七宝）C01/权利/方法与G0—G5；D) 11-14非私有与Private审核分支不能互相放宽；E) 11-16精确digest/不同项目/错run/错job/撤权均失败关闭。没有某个实验原本的本地库时**继承代码与历史证明，不伪造现场重跑**，在新的持久隔离环境中执行针对受影响接口的最小POS/NEG。不能为了缺数据库环境另起一套Gate/Runner。

## 6. 原始证据、源码和回归定位（长期直接读取）

### 6.1 生产样板与真实作品

- `tasks/results/SAMPLE-TRIAL-12_LAYER1_REAL-LOOP_RESULT.md`；原始 `tasks/results/sample-trial-12-layer1-real-run/*.machine.json`；收口分析 `specs/data-production/SAMPLE-TRIAL_CLOSURE_ANALYSIS.md`；10月原 `layer1` 写Gate证据参照 `main@a4e597f480138aca1bcaf7c40b95ce9740ba56d5`。
- `tasks/results/STRAT-PROD-A001/P2_REAL_PRODUCTION_AND_EVIDENCE.md`；同目录 `P3_UI_CONSUMPTION_AND_EXPERIENCE.md`、`P4_REGRESSION_AND_HUMAN_REVIEW.md`；A001独立run `5176ade3…`。
- `tasks/implementation/MAB/progress.md`：搜索标题「2026-11-07｜M5闭环跑通」「2026-11-08 第5步批次H」「CP2-E 第五步：G0—G5 全链在真实原件上打通」「2026-11-13｜B4 泛化冒烟」「2026-11-13｜ST-02/03/04/05/06」「2026-11-14｜D05 P04」「2026-11-14｜A' 逐门落地」。这些历史小节**具有独立日期/环境/输入/审计ID**，不应只查11月15日简化继承报告。
- `tasks/results/MAB/evidence/qr10-generalization-smoke/qr10-generalization-smoke-20261113.json`：朱家角/七宝真实项目与G0；专业逐门的脚本 `scripts/test-d05-g5-isolation.mjs`、`scripts/test-d05-p04-g5-isolation.mjs`；隔离作品 `tests/integration/m5-batch-h.integration.ts`。

### 6.2 独立Gate、来源与新接口

- `tasks/results/MAB/evidence/method-plan-gate/d00-g0-method-plan.json`：11-10 19项真库审核，**同时包含独立G0 PASS及Runner HOLD**；工具 `tools/verify-d00-g0-method-plan.mjs`。
- `tasks/results/MAB/evidence/method-isolation/d00c2-stage-wiring.json`、`d00c4-remaining-stages.json`、`tasks/results/MAB/evidence/d00-real-run/d00-sections-real-run.json`：D00方法/存储/执行子项的已验限度（一些仅表结构/隔离脚本，不得拔高为外部资源生产全通过）。
- `tools/verify-3-gate-chain.mjs`、`tools/rule-gate-reviewer.mjs`、`tools/local-gate-verifier.mjs`、`tools/local-gate-service.mjs`、`packages/data-access/src/gate-stage-qualification.mjs`；`supabase/migrations/202610310910_k3_gate_candidates.sql`、`202611010900_k3_independent_gate_authority.sql`（文件名按完整路径拼接）。
- 11-16 R11云端K3：`supabase/migrations/202611010900_k3_independent_gate_authority.sql`及`20261116080000_m5_k3_gate_function_acl_owner_fix.sql`；实装、安全正反、旧审计校验见`CURRENT.md`与`progress.md`的BATCH-04。无需新Gate。
- 11-16精确修复：`tools/gate-stage-candidate-selection.mjs`、`tools/gate-stage-output-attestation.mjs`； `tests/data-production/gate-stage-candidate-selection.test.mjs`、`gate-stage-output-attestation.test.mjs`；对应3条CI SUCCESS。**未发生真持久机器Signer的当批运行验证**。

### 6.3 现行总图/档案对应

- `tasks/results/MAB/M5_DLG_LEGACY_INHERITANCE_CODE_AUDIT_20261115.md`：**历史版本有限源码核查**，只有金泽/A001/五主题是其主要历史样本；不能用它取代本报告中新增的11月7—14执行证据。
- `tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json`、同名 `.md/.html`：当前最前 `E_D00_REVIEW`、`E_D00_QUALIFY`；HTML本地打开后可通过 `#edge-E_D00_REVIEW`、`#edge-E_D00_QUALIFY` 定位。导航的三层运行状态目前仍 NOT_VERIFIED/HOLD；**索引历史PASS不修改当前边状态**。
- `CURRENT.md` 2026-11-16 BATCH-01—04； `tasks/implementation/MAB/progress.md` 对应最近两批的CI/缺口； `PLAN.md` 第3.5 B/C和第6章是唯一准出/试验/日志标准。

## 7. 本轮成果、核查边界和持续原位维护

- **本轮实际完成**：对R01—R10（其中R07/R08为两个独立主题）已发现的记录做证据性质辨析；按六段及跨段Gate/Studio归类可继承代码、接口、原始记录和剩余合同差异；把“11-10独立G0 PASS但Runner HOLD”“11-09真六门分段”“11-13双主题G0—G5”“11-14真库六门组件”明确纳入可读继承基线。
- **未做**：不声称已穷尽所有历史运行ID或旧本地未推送日志，不在本轮连接当地 `mohen_dev` 或生产库，不复跑真实模型/私人原件、没有新的独立Gate PASS，也未重新判定 M5八维。旧纪录的成功只对其原环境/修订范围成立；证据冲突时先回原始回执和对应SHA，不能以表格总结覆盖原始事实。
- **后续维护规则**：新发现历史成功或合同漂移，只修改本文件相应R行、D行、断点及原始链接；真正的工程进展仍写 `CURRENT.md`、逐批 `progress.md` 和导航三层原边；本文件**不累计另一个完成率、不修改PLAN准出条件**。


## 8. 2026-11-19 云端历史数据实存盘点与资产复用原则

本节为对R01—R11历史继承索引的当前云端数据库补充，不改变历史运行证据等级，也不把历史PASS升级为当前PASS。

### 8.1 当前mohen-cloud数据实存（只读查询）

| 数据表 | 当前行数 |
|---|---:|
| source.sources / source.source_versions / source.raw_items | 39 / 39 / 98 |
| source.read_runs / evidence.reading_units | 16 / 38 |
| evidence.material_evidence | 166 |
| world.entities / world.relation_claims | 106 / 89 |
| meaning.findings | 50 |
| read_model.world_projections / map_timeline_projections | 11 / 9 |
| read_model.story_seeds / agent_contexts | 42 / 41 |
| read_model.discovery_paths / evidence_pointers | 63 / 132 |
| control.production_runs / control.gate_audits | 20 / 711 |
| control.qualification_current | **0** |

### 8.2 为什么已有数据不出现在当前Owner正式读取

1. 711条历史Gate审计的`decision_origin`均为`legacy_untrusted`，历史审计没有形成现行独立Reviewer身份与purpose namespace/code合同；当前`qualification_current`为空。因此历史Gate的`PASS/current_valid`字段只证明旧系统当时记录的状态，不等于现行独立签发的资格。
2. 当前39条source的`scope`均为`{}`；历史production_runs的scope也为空对象。历史D/L对象未与当前Creator/Owner/Project/Root建立可直接使用的完整作用域关系。现有Studio读取按当前Owner/Project及Gate资格合同执行，故合法返回空结果。
3. 部分旧production_runs经受限的legacy unclaimed reconciliation对账，历史prior_status及对账原因写入metadata；这是运行终态治理，不是删除数据或重跑生产。应以历史样板报告判断当时真实生产，以当前数据库判断对象是否仍在及当前资格状态。

### 8.3 资产价值与独立复用裁决

- D/L各层的来源、版本、Raw、Read Unit、Material Evidence、Entity、Relation/Claim、Finding、Read Model等都是可独立持久化、可被不同下游消费者使用的知识对象，不因没有同一次完整D00—D05 run而失去价值。
- **复用判定以对象为单位，不以整条run为单位**：对象自身内容/版本/来源/权利/成熟度及必要依赖均满足现行合同，且通过对应Gate对指定consumer/purpose的当前资格检查，即可在相应范围独立使用。无需强制所有对象来自同一Runner或同一生产run。
- 但“历史对象可用”与“历史对象值得复用”要分开：旧内容可作为研究资料/候选输入；旧Producer自签Gate、缺少当前Reviewer与用途授权的历史PASS不能直接转为当前资格。依赖关系决定哪些下游对象必须复核；上游资格失效不应无差别撤销没有依赖关系的原始来源或其他独立对象。
- 资产盘活先只读盘点：生成对象级清单，追踪source→version→raw→read_run/read_unit→evidence→world/meaning→read_model→gate audit/qualification依赖；按`REUSE_AS_IS`、`REUSE_AFTER_REVIEW`、`REPAIR_PROVENANCE_OR_RIGHTS`、`REBUILD_ONLY_IF_IRRECOVERABLE`分类。不得批量改写历史Gate、手工插入qualification_current或重复付费重跑。
- 后续外部资源到D00—D05的端到端生产验证，应与历史资产盘活相互衔接：先复用可恢复对象和已验证能力，再仅生产真实缺口；不为证明单Runner而把已有的合格独立对象全部重做。

### 8.4 历史run ID精确核对与纠错

当前云端control.production_runs共20条，包含10月17日金泽运行（8a32171c…、ff11231a…、a3cb68ac…）、10月18日A001绿之丘多轮运行（包括5176ade3…）及10月29日金泽/朱家角/作品链运行。此前将报告中省略的run ID擅自补成完整UUID并据此判定缺失，是错误方法，撤销相关缺失结论。后续必须从原始machine.json/日志读取完整ID再做精确映射。

### 8.5 本地→云端迁移机制与双端差异线索

- specs/OPERATIONS_DEPLOYMENT.md §3记载一次本地mohen_dev六Schema/42表pg_dump→mohen-cloud psql导入；SAMPLE-TRIAL_CLOSURE_ANALYSIS.md将云端42表迁移列入收口成果。该操作属于一次性快照导入，不是持续双向同步。尚未找到迁移前后逐表/逐对象完整校验回执。
- 本地11-12历史只读盘点：source.raw_items=179、studio.private_originals=81；其中81个JPEG字节已与本地登记SHA 81/81匹配。云端本轮直查：source.raw_items=98、studio.private_originals=0。差值81与本地私有原件数相同，是11月本地新增私有原件及Raw登记未同步的强线索，但不是逐ID证明；由于两端快照时间不同，状态为HIGH_PRIORITY_UNVERIFIED。
- 云端另有source.sources=39、source_versions=39、read_runs=16、reading_units=38、projects=1、asset_heads=1、asset_revisions=1、gate_candidates=0、qualification_current=0。本地当时项目同为1，但其他资产/Gate/资格计数不同，须按对象ID与依赖映射比较。
- pg_dump覆盖数据库行，不含Storage对象、私有文件系统字节、gitignore排除的data/raw/staging/exports文件或本机密钥；必须分开盘点。
- 未发现本地持续CDC/自动双向同步/生产后自动推送服务。GitHub push、Vercel deploy、schema migration均不是业务数据同步。
- 下一步先确认原mohen_dev及最新备份是否可读；随后同一时间点双端只读manifest，按表/PK集合/行数/关键字段hash比对；优先核验42表初始迁移及11月81私有原件增量，最后独立核Storage对象字节。未核对前禁止批量回填、覆盖或重跑。

### 8.6 本轮边界

本轮只读查询mohen-cloud与GitHub历史报告；无数据库写入、无权限变更、无模型调用。该清单是当前数据库总量快照，不等于全部对象已完成逐条内容/权利/依赖审核；逐对象复用清单仍待按需生产。
