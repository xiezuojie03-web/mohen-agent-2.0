# MoHen Data Production Protocol V5.0（目标）

> **MHKA目标代际／DESIGN_TARGET_NOT_APPLIED（2026-11-02）**。本协议是D00—D05唯一正式生产协议的未来目标全文；其2026-10-15旧设计及handoff/local-b-20260930来源仅是继承证据，不是当前执行业务权威。六阶段方法、独立G资格、复用和延期项的真实运行仍按工程证据分级；GitHub原子切换、策略签发、DDL、G5/MIG-01保持HOLD，不能从本镜像推断已投运。

## 0｜权威与单一主线

**现行工程设计唯一上位职责（继承2026-11-05 Owner裁决）**：MHKA-00治理/签权，MHKA-03知识对象与资格语义，MHKA-04生产/专业方法与Agent职责，MHKA-05工程运行与安全；MHKA-02仅拥有体验消费规则。新架构**当前已是工程设计与施工依据**，不得再写“等M8才启用MHKA设计权威”；但六阶段正式生产运行激活、旧系统受控退役和生产Gate仍需按MAB/M8及独立验收HOLD。C0—C4仅为历史研究来源和旧实现兼容参照，不是并列现行规范。原专业standards作为可追溯的详细专业定义和获取规则来源，执行约束以本协议及授权Gate合同为准；Registry只能绑定执行，不能更改专业语义。旧五阶段协议V4.0仅属隔离历史代际。

| Stage | Owner layer | 独立Gate | 职责 | 专业标准 |
|---|---|---|---|---|
| D00 | L0 | G0 | 来源准备 | specs/data-production/standards/d00/ |
| D01 | L1 | G1 | 载体读取C | specs/data-production/standards/d01/ |
| D02 | L2 | G2 | 材料理解H | specs/data-production/standards/d02/ |
| D03 | L3 | G3 | 世界构建W | specs/data-production/standards/d03/ |
| D04 | L4 | G4 | 人文发现A | specs/data-production/standards/d04/ |
| D05 | L5 | G5 | 可信发布P | specs/data-production/standards/d05/ |

## 1｜一次run的输入

必须有research_intent、scope（问题、地域/时间、材料或资产范围、允许用途与预算边界）、architecture_generation、execution_mode、request_id、requested_outputs、consumer、effective_time、规则/方法/画像版本以及允许的起止阶段/重算理由。凭据与个人原始资料不写入报告。from/to只是候选范围，不证明输入合法。

首次来源发现可从D00开始；部分重算使用已存在成果时必须带精确type/id/revision、当前资格、原件/局部定位与依赖快照。没有resume_input或依赖不明时HOLD，不从旧run的PASS直接恢复。混合材料按可独立审核的单元分路，保留父子关系，主载体画像不替所有子载体。

## 2｜选路与方法执行

1. orchestrator读取唯一Registry与method-binding，按载体/材料类型、方法前置、用途与目标成果选择方法；不把63方法全部广播。
2. 方法定义必须锁到standards具体章节和源版本/散列。DRAFT质量画像、未知枚举、输入type不匹配、权利不足即给明确拒绝/补证原因；不让模型常识补成历史事实。
3. Adapter返回typed artifact drafts、方法记录、原件锚点、限制、依赖和控制请求；不能返回一个未经独立审核的自称PASS作为下游许可。
4. 阶段Owner只写本L候选/修订，成果版本不可覆盖；独立Gate另写资格审计。共享Executor可复用，但不能把写入control的通用权限授予所有业务方法。
5. 多成果必须有显式角色/类型/修订引用；下游选择对应输入角色，不取Object.keys(outputs)[0]，不默认把上一步整个输出数组全传给全部下游方法。

## 3｜资格与提交

资格键：对象修订×用途命名空间/版本×范围×消费者×依赖快照×有效时点；另记录gate、规则/方法/绑定版本、审查者、证据和前序裁决。PASS/HOLD/REJECT/REVOKED/UNASSESSED为资格五态；run处置、对象认识状态与人类ACCEPT/DEEPEN/DROP分别存储。

选择、候选提交、独立签发、激活、每次消费/缓存命中均核当前依赖和合法性。签发期间换版或撤权不得激活。Gate审计追加；不得ON CONFLICT覆盖旧裁决，不任意挑历史PASS。有效区间带时区，长期资格须依据与复审条件；缺值、非法区间、到期、消费者/用途错配均失败关闭。

## 4｜各阶段特殊边界

D00：宽进登记线索不等于获得原文；来源身份、研究读取和公开展示权分别保存。Raw保全，来源镜像/转载与独立性分开。

D01：只作技术读取，保留未读区域、错误与校准画像；原资产和读取修订不同身份。不把OCR/图片标题/AI补字当历史证据。

D02：材料结构、声音、转引与观察保真；嵌套单元逐个定位，二手解释不伪装一手事实。

D03：W方法联合构建身份/时间/空间/事件/关系/变化/主张与冲突。G3七用途保持原定义；不为好看制造配准精度或历史位置。

D04：A方法及五母题增加理解，不反写世界事实；G4 BE/BC/RF/PS/PL分别约束解释。分数不是历史真伪概率，开放问题不升确定解释。

D05：P01选入；P02世界投影；P03时空变换；P04有界解释；P05探索路径；P06返证；P07消费者分面申请；P08精准失效。P/PD不同编号空间。P02只能消费合法L3/G3事实；L4解释保留G4走P04，不混入world_projections。纯事实投影不强迫伪造G4，解释性发布必须G4。P01/P07候选不等于G5；P08控制事件不是第七类L5内容。六类L5定义见DATA_CONTRACT。

## 5｜全链、分支与局部完成

完整run可串行经过六阶段；事实投影、证据返回或局部重算按实际依赖选择必要阶段，不机械制造中间解释。阶段完成、某方法完成、部分成果有资格与整批业务完成分别报告。空结果必须区分合法无发现、未执行、失败、HOLD，不能把0行算有效发布。

单个分面HOLD只阻断实际相关消费者；独立有效分面继续，但run须给partial outcome及blocked refs，不能谎报整批PASS。要修改目标或扩大scope时形成新请求/版本，不能在旧批次隐藏变更。

## 6｜四种执行模式与故障

attended/unattended/batch/interactive只改变调度，不改变Owner/Gate/权利。当前目标配置默认全禁用，启用须用户工程授权及验收；数据缺口不交用户逐字段审。API短时失败可对相同快照有界重试（目标默认最多3次，可由批准配置收窄）；语义歧义、证据冲突、权利不明不靠重试碰运气。幂等以request/input snapshot/method/version为基础，重复事件不重复晋级。中断/恢复必须重核当前资格；不能以相同run_id覆盖历史审计。

## 7｜撤权、补证与回滚

来源/权利/证据/事实/解释/发布或规则换版触发实际反向依赖分析。P08给影响闭包和暂停/重审请求，PD7承接控制职责；Guard立即阻断失效消费，不等新G5 PASS，也不伪造REVOKED记录。独立Gate追加决定。依赖不明的请求失败关闭，已证无关分面不作推测清空。

补证归对应D Owner；生成新成果修订、新资格，旧链审计保留。回滚先关新入口，仅仍合法的旧修订/路由可恢复；否则服务HOLD。不能恢复已撤缓存/权利或删除原始资产。并发/原子停用/缓存与离线回收由工程测试证明。

## 8｜运行消费与真实入口

Agent与舞台只读当前G5合法L5分面，L6为运行态。Evidence on Demand沿真实依赖回溯L4（有解释时）/L3→L2→L1→L0。缺链须返回明确缺口，不静默continue成“完整证据链”。网页ask/materials检索入口和冻结JSON体验页都必须纳入同一消费资格边界；新增客户端不能替代对实际页面/API的接线和验证。

L7/L8参与/新痕迹要回流则经D00；当下贡献不直接写历史Truth。未来逻辑编号不授权建社区/新Schema。

## 9｜报告与验收

机器报告给run/方法/输出版本/资格请求与独立裁决/失败/事件/回滚；拥有者报告给真实叙事内容、可视统计、限制/反例/缺口及ACCEPT/DEEPEN/DROP。两份报告来自同一run refs，不把fixture写实测PASS。人类内容判断不能替代机器资格。

`verification/arch-mig-prep-01/acceptance/scenario-contracts.csv`是最低正反例合同；`tasks/implementation/ARCH-MIG-01/`给实际文件改造责任。真实DDL/端口/表列/迁移命令保持TO_VERIFY_IN_M0，不在协议虚构。

## 10｜K3 Registry Loader 与运行授权的精确增补（2026-10-31）

本节只补充原协议第2、3、6、9节的机器约束，不改变上述原专业内容。源码固定证据：`orchestrator/registry.mjs` blob `df41d29d62521380599918767d1f8e2bc1b41b07`、`orchestrator/orchestrator.mjs` blob `ce0a61cba2cb04d913213461d558c82545421ffa`、`production-registry.json` blob `277b0e77e3193329634c18b59f8935378016988d`。

1. **结构验证层**：原`registry.mjs`保留六阶段计数和对齐检查，在同函数增加原路径`production-registry.schema.json`校验；校验正确版本`4.0-target`、架构`mohen.six-stage.v1`、逐阶段唯一、Dn/Ln/Gn一致、完整Job和引用字段。不允许新建平行注册表。当前六Job关闭与`DESIGN_TARGET_NOT_APPLIED`可被设计工具读取，**不得表示可实际运行**。
2. **全局及单Job执行授权层**：执行请求需独立检查当前环境授权、全局`activation`、`status`、Job的`execution_policy.enabled`及相应`attended/unattended/batch/interactive`、操作者执行范围、预算及`gate_reviewer_binding`合法有效。任何一项不符即`BLOCKED`。历史`activation.enabled=true`不得绕过Job禁用或工程暂停。
3. **绕过CLI保护层**：`orchestrator.mjs`每调用`loadExecutor`之前重新校验Job/模式/资格/撤权/不可变快照和调用主体，避免外部直接导入`runProduction`规避`run.mjs`预检。已有`STAGE_CONTRACTS[stage].output`和恢复输入校验不得删除。
4. **生产者与签发者分权层**：`layer1-adapters.mjs`和现有`data-production-repository.mjs/recordGate`直接写`control.gate_audits`正式PASS的实现需定向改为候选提交；具有独立审查角色的专用服务按原G0—G5机器规则、资格schema、时间/版本/用途/消费者/依赖签发。Gate历史审计与当前投影逻辑分离；绝不因Stage PASS自动资格PASS。
5. **运行记录一致性层**：`run.mjs`当前onStage/终态写入异常被catch后仍可能退出0；未来必须区分业务run结果与审计写库状态。终态记录失败不得作为完整可审计PASS发布，需明确`runtime_record_consistency=FAIL`及恢复操作，保留所有已产生的真实证据。

### 10.1 最小工程定位与正负验收

| 原文件 | 处理方式 | 继承保留 | 未来拒绝测试 |
|---|---|---|---|
| `orchestrator/registry.mjs` | TARGETED_REVISE | 原六Job检查和查找 | 错版本、字段缺失、重复Stage、错Gate、未绑定签发者 |
| `orchestrator/orchestrator.mjs` | TARGETED_REVISE | 六阶段、精确输出交接、恢复输入 | Job disabled、模式未授权、绕过CLI、途中新撤权 |
| `run.mjs` | TARGETED_REVISE | CLI、进度、报表 | 写库失败不得成功退出或宣称完整审计 |
| `adapters/layer1-adapters.mjs` | TARGETED_REVISE | 候选成果与证据写入 | producer自签PASS、UPDATE历史审计 |
| `packages/data-access/src/data-production-repository.mjs` | TARGETED_REVISE | 六阶段读写、run持久化 | 历史PASS、跨purpose/consumer、过期、依赖变更 |
| `packages/data-access/src/read-model-repository.mjs` | TARGETED_REVISE | 六类L5读模型 | 公开消费者缺匹配G5、无consumer走审计宽读取、撤权缓存复活 |

工程未来每项需记录旧Blob SHA、最小差异、原调用者、前后状态、数据库角色及正反测试；仅有设计目标不代表实际代码已经修复。独立G与`SEC-01`保持HOLD，K3未完成整体验收时本候选不得提升为工程active。

---

## 11｜新架构专业方法与L0—L5执行细则（正式下位规范）

> 设计镜像声明：本文件是可交付的**完整目标规范正文**，仅当经Owner授权的工程原子切换及测试通过后在仓库生效。Library状态不等于GitHub/生产已生效；任何未授权操作继续HOLD。

本节继承KAD1-A已重塑的六阶段全内容，专业方法的唯一调用入口仍为本协议；具体阶段Standards可作为专项采集方法和历史证据继续存在，但同一生产字段、状态或门禁不能被独立改写。冲突由MHKA-03/04/05唯一Owner裁决，正式G签发由独立Gate合同定义。

### 11.0｜重塑原则与总体链条

1. 正式生产唯一链仍为 **D00→D01→D02→D03→D04→D05**；每阶段产出候选/专业成果，由对应L层持久化，独立G门按指定资格审核。Studio、Agent、外部AI、Skill、Tool、UI组件均不能创建第二条Truth链。
2. 六阶段并非六个同质模型调用。D00解决“来源是否找到并合法取得”；D01解决“载体能否可回放读取”；D02解决“材料究竟说了什么、由谁说、在何种语境”；D03解决“哪些历史世界主张得到何种支持”；D04解决“这些主张能产生什么有增量的人文理解”；D05解决“哪些已合格内容能以何种用途/范围/消费者方式被消费”。
3. **L层不是六个审批状态。** L0—L5分别承载来源、读取、材料观察、历史世界、人文解释、受控消费投影；候选可留存，但未获得匹配资格不能冒充可公开事实。
4. **G层不是D层的PASS别名。** Stage Producer提交候选和证据；独立Reviewer依据批准规则版本签发用途/范围/消费者限定资格。D Stage PASS、Studio保存、作者确认、作品运营发布都不能推导G PASS。
5. 方法按问题选择、并行和回退，不按编号强制流水。C/H/W/A/P编号属于METHOD命名空间，与UI:W03等组件ID严格区分。
6. 原P0—P5主规、专业方法、资格合同的有效决策在本合同内重构为操作规则、输入、输出、禁止边界、失败退路和验收；原件仍保留为来源证据，但不再是执行者理解本合同的必要补丁。

### 11.1｜六阶段统一输入输出与Owner

| 阶段 | 输入 | 核心输出 | L层 | 独立Gate | Stage Owner Skill | 停止/边界 |
| --- | --- | --- | --- | --- | --- | --- |
| D00｜来源发现与获取 | 研究问题/时空范围/来源线索/项目授权/预算/权利限制 | 来源身份、版本、载体副本、获取状态、权利/依赖、可用定位 | L0 | G0 | mohen-source-intake | 没有全文也可保存目录线索；不得谎称取得正文。 |
| D01｜载体读取 | G0当前有效的L0来源与许可范围、原件/数字载体、目标读取用途 | 可回放read_unit、原件定位、原貌/派生文本、质量画像、方法/工具版本、不确定性 | L1 | G1 | mohen-carrier-reading | 读取是技术事实，不做历史解释；OCR/ASR/VLM结果是候选。 |
| D02｜材料理解 | G1有效L1读取单元、材料类型、上下文/转引关系 | 来源声音、原文主张、语境、证据观察、同源依赖、矛盾/反证、不确定性 | L2 | G2 | mohen-material-understanding | 摘要不等于材料理解；模型解释不得伪装原文。 |
| D03｜历史世界建构 | G2有效材料观察、待核世界主张、对象/时空/关系候选 | 版本化实体/事件/状态/关系/主张、证据谱系、竞争解释、认识状态、依赖闭包 | L3 | G3 | mohen-world-construction | 同名不等于同物、共现不等于关系、先后不等于因果。 |
| D04｜人文发现与解释 | G3有效且用途匹配的L3主张、问题、比较对象/当下端资料 | 开放问题、解释修订、理解增量、支持/反证、竞争解释、五用途候选 | L4 | G4 | mohen-humanistic-discovery | 不改写L3事实；发现线索不自动成为合格解释。 |
| D05｜可信发布与双读消费 | 有效G3/G4资格、来源权利、依赖快照、消费者和用途 | 六类L5消费投影、视觉/Agent分面、证据指针、失效闭包/重审请求 | L5 | G5 | mohen-read-model-publication | P08只发起失效/复审，不签G5；WATCH不是第二份作品库。 |

### 11.2｜D00：来源发现、获取与L0

### 2.1 P0原三类专业责任与Y方法继承关系

| P0原专业责任/资格合同 | 必须执行的专业规则 | 最小输出 | 禁止/失败边界 |
| --- | --- | --- | --- |
| P0.1 资源发现与获取 | 以研究问题、时空范围、来源类型和权利边界驱动多源检索；区分命中、可访问、已取得正文/原件、已核版本。 | source_candidate、acquisition_attempt、availability、fulltext/scan/excerpt/bibliography-only、失败原因与替代源。 | 目录命中/书目条数不能冒充取得全文；被拒绝/无权/无资源应保留明确状态。 |
| P0.2 来源身份、版本、权利与依赖 | 稳定标识来源作品、具体版本、数字载体、持有/访问/引用/展示/下载/改编许可；记录转载、转引、底本和依赖关系。 | source_identity、edition/version、carrier_copy、locator、rights_by_action、dependency/provenance。 | 作品身份不等于某一数字副本；访问权不等于展示/再分发权；同源副本不算独立见证。 |
| P0.3 L0/G0与D01交接 | 仅将身份/版本/权利/定位达到用途要求的来源形成L0候选；按用途申请G0，G0有效后向D01交付可读载体。 | L0 source_ref@revision、原件/数字副本hash、权利/用途、取得状态、D01 handoff packet。 | G0不批准史实；无正文仍可保存合法目录候选但不得伪称可读取；未获授权不得下发D01。 |

**D00 的正式方法集为 Y01—Y08（V1.2 接收，2026-11-09）**：上表 P0.1—P0.3 是原三类专业责任与资格合同，其规则继续适用，但不再作为独立方法身份计数；C/H/W/A/P 六十三条语义不变。Y01—Y08 均为 `stage=D00`、`layer=L0`、`independent_gate=G0`、`may_grant_gate=false`，八条职责与主输出如下。

| 方法 | 专业职责 | 主输出 |
| --- | --- | --- |
| Y01 | 来源需求与存量缺口诊断 | source_need、source_candidate、search_trace |
| Y02 | 机构集合与多渠道来源发现 | source_candidate、source_need、search_trace |
| Y03 | 时空异名与跨语言检索扩展 | source_candidate、source_need、search_trace |
| Y04 | 聚合目录原机构回溯 | source_candidate、source_need、search_trace |
| Y05 | 来源对象、版本与依赖鉴别 | source_identity、source_version、source_dependency |
| Y06 | 资源价值互补与取得优先级评估 | source_candidate、source_need、search_trace |
| Y07 | 合法获取方案与协议路径组合 | source_candidate、acquisition_attempt、raw_asset_candidate |
| Y08 | 来源资产完整性与取得证据鉴定 | raw_asset_candidate、asset_integrity_receipt、gate_review_request |

上述八条同时受七条约束，缺一不得视为已联通：

1. **无 Gate 签权**：Y01—Y08 只能产出候选与评审申请；G0 由独立 Reviewer 依机器合同签发，生产者自签一律无效，登记不等于可执行。
2. **获取方法另有身份**：Y07 使用的具体路径必须登记为 `ACQUISITION_METHOD:Mxxxx@version`（见 §2.5 获取方法目录），不得以 Y 编号代替方法版本，也不得靠历史成功推定当前有效。
3. **十类输出不等于原件**：`source_need`、`source_candidate`、`search_trace`、`source_identity`、`source_version`、`source_dependency`、`acquisition_attempt`、`raw_asset_candidate`、`asset_integrity_receipt`、`gate_review_request` 是阶段产物类型；只有经 Y08 核验并落 L0 的字节资产才可作为原件引用。
4. **逐动作权利**：一律使用 `packages/data-access/src/rights-actions.mjs` 的九动作——`access_view / machine_read / retain / download / quote / display / adapt / redistribute / external_processing`；取值 `allowed / denied / unknown / restricted`，空或缺失等价 `unknown` 并 HOLD，禁止按来源类别或开放许可标签推断放行，禁止另立第三套动作词典。
5. **阶段结果与逻辑类型分开**：D00 阶段结果名为 `qualified_source`（运行合同），`source_asset` 是 L0 逻辑资产类型名，二者是同义指代而非并列类型，不得并存两个类型名。
6. **D01 才读取**：Y01—Y06 的输出不得直接构成 D01 读取依据；只有 `content_availability` 达可读、且 `machine_read`（需留副本时叠加 `retain`，外部模型/OCR 另核 `external_processing`）为 `allowed` 的来源才进入 D01。
7. **C 方法预选已在 G0 承载（D00-B，2026-11-10，零 DDL）**：`GateReviewRequest` 不加字段，消费者方法计划以 `evidence_refs` 内的类型化引用 `{kind:'method_plan',id:'Cxx@vN',stage:'D01',method_id,method_version,artifact_revision}` 承载；`artifact_revision` 是该引用的规范化 JSON 摘要，改任一字段即摘要不符。D00 只在调用方给出 `consumer_method_plan` 时构造该引用（不补默认方法），独立机器评审器在 G0 做策略外结构性前置校验：缺引用、id 与字段不符、摘要不符、方法未登记在 `identifier-registry.json`、重复同一方法，一律失败关闭。**仍 HOLD 的部分**：D01 尚未以该预选作为选法依据（选法仍按载体与现行实现，C 方法也尚未进入 `production-registry.json` 路由），故"预选决定读法"这一层不得声称已联通。

**身份账本必须机器派生（D00-A3，2026-11-10）**：设计身份目录（71）、执行分母（63）与实现绑定数不是三个可以分别手写的数字。唯一派生入口是 `tools/report-method-ledger.mjs`，其来源为 `identifier-registry.json`、`method-binding-contract.json` 与 `method-route-decisions.schema.json`；`scripts/check-identifier-registry.mjs` 强制不变量（`method_count` 等于合同条目数、非 Y 身份全部入合同、Y 阶段工序不得占用执行分母）。任何文档、进度账、M6 验收与交接材料引用分母时须引用该派生结果，不得手写，也不得另建第二份身份清单。「隔离已验证」需逐项独立证据，派生工具不推断，未取得证据前一律不计入。

### 2.2 来源取得的状态必须分清

`not_found / catalog_found / metadata_only / bibliography_only / excerpt / full_text / scan_or_image / restricted / unavailable / acquired_unverified / acquired_verified`是研究状态语义，不得把它们压成一个“已获取”。每次获取需保存：来源作品身份、具体版本/版次、数字载体副本、获取渠道/时间、原始URL或档案定位、文件hash、取得范围、是否完整、权利动作、访问限制、依赖/转引、失败/重试与成本（未知即unknown）。

### 2.3 搜索与获取执行规则

- 先以研究问题分解检索意图：主题、人物/机构、地名/历史地名、时期、材料类型、版本/语言、地域与机构；来源发现需多渠道交叉，不把单一搜索排名当权威。
- 搜索命中、元数据可见、可在线访问、实际下载/取得、正文/原件完整性验证是不同事件；记录每一步和未完成原因。
- 对馆藏/数据库/开放数据分页获取，保留查询语句、筛选参数、分页游标、返回总量语义和原始响应hash；没有可信总量时只报告已取得范围。
- 受限资料允许保存合法目录和补证线索，不得绕过登录/付费/访问控制；外部AI只获得项目授权范围内必要内容。
- 书目、目录、后世转引、节录、影印、数字化图像各自有来源身份和依赖边；不得把转载件数计成独立见证。

### 2.4 G0前置与D01交接

L0候选最小字段语义：`source_id,source_revision,work_identity,edition_or_version,carrier_copy_id,carrier_hash,source_locator,acquisition_status,acquired_extent,access_rights,citation_rights,display_rights,download_rights,adaptation_rights,retain_rights,machine_read_rights,redistribute_rights,rights_evidence,dependency_refs,provenance,project_scope,created_at`。缺值标`unknown/restricted/not_applicable`，不填乐观默认。G0按来源身份、版本、取得范围、权利和用途分别裁决；G0 PASS只表示指定来源动作/范围可进入下一阶段，不表示材料内容为真。


**P0.2原权利矩阵的逐动作继承（设计纠偏，非新数据库字段）：** 原正式P0.2§3把`access/view`、`download`、`retain`、`machine_read`、`redistribute`、`public_display`列为六个独立操作；它们不能被一个`access_rights`、`rights_clear`或`license_note`替代。上列`*_rights`只是目标语义占位，并非承诺数据库已有同名列；实现可使用带`action/status/evidence/version/validity/scope`的`rights_by_action`结构。D01载体读取必须分别核查`machine_read`与实际处理所需的`retain`，若调用外部模型、OCR或第三方处理服务，还须单独核查适用的`external_processing`与数据传输限制；浏览/下载权不推导机器处理权，原作品公版不自动解除数字副本使用限制。上述必要操作任一为`unknown/denied`或缺证时，G0对该次D01用途只能HOLD/阻断，不得签PASS。`quote/citation`、`adapt`、`redistribute`和`public_display`另按使用情景独立校验，不可自动相互转换。

**D00准入D01的交接包**：来源作品+具体版本+数字载体副本hash+页/卷/图幅/记录定位+取得范围+权利动作+依赖/转引+G0决策ref+已知缺口。没有可读取正文时保留L0线索，不进入D01读取任务。

### 2.5｜长期资源、获取方法与尝试证据的继承合同（2026-11-06 KAD1-A定向补核）

**原始依据**：原P0《规范_P0_长期资源与获取方法维护_最终版》§1—§8及P0.1/P0.2/P0.3、工程仓库`specs/data-production/standards/d00/`对应五份规范。这一部分属于原有D00正式专业成果，而非新增资源专项或新建生产阶段。它与§2.1—§2.4同时适用；原文专业细则继续保留，可追溯但不得成为新架构运行时的隐藏前提。

**必须继承三个不同的长期逻辑资产**，不是同一张可用性表：

1. **资源总目录（Resource Catalog）**：记录机构、集合、目录记录、作品、版本、馆藏件、数字副本/单件及上下级关系；稳定`resource_id`，允许修订当前可用状态，保留失效与变更历史。资源状态为`DISCOVERED / IDENTIFIED / ACCESSIBLE / ACQUIRED / BLOCKED / HISTORICAL_UNVERIFIED`；其中历史未复验不等于当前取得，目录命中不等于取得原件。
2. **获取方法目录（Acquisition Method Register）**：以`method_id + method_version`保存适用资源/集合范围、访问方式（API、IIIF、单件下载、合法申请等）、权限/限流前提、逐步方法、成功判据、失败模式、替代路径、上次复验与当前推荐关系。方法状态为`DRAFT / HISTORICALLY_VALIDATED_CURRENT_UNVERIFIED / TESTED_SUCCESS / TESTED_FAILURE / DEGRADED / RETIRED`。跨资源复用须重新核实`resource_scope`，不能以同机构或历史成功自动推定有效。
3. **不可覆盖的获取尝试日志（Acquisition Attempt Log）**：每次实际尝试以独立`attempt_id`追加；必须绑定当次`resource_id`、`method_id/version`、执行环境、脱敏请求/分页、时间、实际响应、失败原因的`CONFIRMED/HYPOTHESIS`确定程度、证据、取得范围、字节数/`asset_sha256`（若确已取得）、替代来源和恢复条件。失败和成功均保留；更正使用新的更正记录，不覆盖历史尝试。

**单向权威与物理落点**：原P0阶段的唯一人工主库是`06_资源资产/资产_P0_资源与获取方法主库.xlsx`三个工作表；CSV仅为带版本/哈希的派生物，不能平行编辑。未来数据库成为唯一权威源，必须经过字段级迁移、同步/停写与可回滚验收，Excel随即降为只读/受控界面。逻辑对象不直接推出三张数据库表；优先复用`source.sources/source_versions/raw_items`与现行Provider Registry、Acquisition Intent、`control.*`，只有在证明事件不可变性/生命周期和现有表不足时，才提出必要DDL设计。D00不能直接写独立G0审计。


**已存在Provider和采集意图的继承边界（EX01设计裁决）：** `source-providers.json`/`data/fixtures/source-providers.json`管理平台身份、分级、运维与历史来源标签；`acquisition-intents.json`管理抓取批次的意图、地域/主题、声明证据与追溯。两者是D00可复用的辅助登记，**不等于**可持续扩展的单件`Resource Catalog`、按`method_id + method_version`维护的获取路径目录、每次独立`attempt_id`的追加日志。平台`S1/S2`或`evidence_allowed=true`是进入相应候选/证据处理机制的来源分级策略，不得直接产生D00/G0机器读取资格，更不得代签G2/G3史实；`retrospective=true`的历史采集意图仅是附证回溯，不能伪装为当次抓取前的批准。**现有目录和辅助守卫优先复用，补缺不新造第二套Provider或意图主库。**

**获取及交接约束**：源作品、馆藏件与数字副本不可仅凭同名合并；资源目录状态、方法状态、尝试结果、真实原件存储状态、独立G0资格是五种不同事实。真正取得须有合法文件/等价可验证资产、版本、字节/哈希、完整性与按动作权利；仅浏览、书目/PDF list命中或临时sandbox取得不自动成为`STORED_VERIFIED`。正式进入D01前必须以具体`L0 asset@revision × D01 intended action/scope × rights × current dependencies`由独立G0裁决PASS，目录或历史尝试不能绕过G0。授权变化、版本变更或资产哈希不匹配时，停止受影响消费并记录反向依赖，不静默删除旧日志。

**失败与维护**：默认同一获取路径同类失败至多重试两次；明确权限拒绝不机械重试；无新增授权、证据或策略则HOLD并追索替代资源，不把网络/环境问题冒充“原件不存在”，HOLD不等于REJECT。资源发现长期开放，P0专业设计准出不等于全部资源取得、G0投运或D01实际读取。

**最低正反验收**：POS=真实取得版本、字节/哈希、合法机器读取权利、G0独立PASS后才有D01合法消费；NEG-1=只有书目无文件→目录保留、D01阻断；NEG-2=历史成功但当期未复验→`HISTORICAL_UNVERIFIED`不可晋级；NEG-3=合法下载但禁止机器读取→G0 HOLD；NEG-4=源方法换版/权利撤回→保留旧尝试、阻断旧资格；NEG-5=方法跨集合使用或同名地点身份冲突→需范围/身份重新核验。每个案例须区分设计断言、GitHub源码存在、隔离测试与真实运行，不能以KAD1静态审查签发Gate。

**接口归属**：国际/国内资源调查研究仅提供候选机构、资源、获取方法和可核验证据，不能创建平行主库或生产Gate；D00按实际研究任务消费候选并负责L0，D01负责技术读取，D02负责材料理解。Provider Registry回答平台身份和分级，Acquisition Intent回答本次采集目的，二者均不代替资源、方法或尝试事件。

### 11.3｜D01：载体读取、C01—C08与L1

### 3.1 统一载体路由决策

1. 先核有效G0授权、文件魔数/容器/内部结构，不仅凭扩展名选C方法。
2. 判断复合载体：PDF文字层+扫描页、地图内文字、视频音轨/字幕等允许多C方法，记录主辅方法、父子关系和各自定位。
3. 优先无损原生抽取，其次保真转换，再使用OCR/ASR/视觉模型候选；原生结构已保真时不无故改成模型生成文本。
4. 以真实标注样本比较格式保真、页序/阅读序、位置、精度、覆盖、可读性、重现性、授权、成本和工具版本；没有金样本不得宣称准确率。
5. 原件、派生候选、人工校订、增强/修复视图必须分开保存；任何读取策略改变生成新revision，不覆盖原貌。
6. 按用途（搜索、逐字引文、地图标注、数字摘录、音视频引用、一般观察）申请G1；一个用途PASS不能泛化全部用途。

### 3.2 C01—C08专业方法规则

| 方法 | 载体 | 专业操作与最小输出 | HOLD/禁止反例 |
| --- | --- | --- | --- |
| C01 | 数字文本 | 原字节/编码→原生结构抽取→字符与DOM/章节定位→可选规范化副本；保存字节偏移、字符偏移、原文和规范化映射。 | 乱码、模板混入、合字归一断链、章节丢失；不可回原字节/DOM则不能作逐字引用。 |
| C02 | 扫描书影与影像PDF | 物理页枚举→旋转/裁切/空白→双页拆分保留母页→栏行与阅读序→OCR候选→原字形/校订文字并存。 | 漏页、夹注错序、页码混淆、异体字误识；关键页无法定位或OCR疑字被隐去则HOLD。 |
| C03 | 历史舆图与图形 | 登记图幅方向与图例→定位文字/符号/河线→保留像素区域与原貌→提取明确比例尺/方位/坐标声明；无配准亦可交接。 | 装饰性方位误作现代北向、强制WGS84、标签移位；像素位置不得当现代经纬度。 |
| C04 | 照片、版画与插图 | 保留原图hash/EXIF/方向→可见区域与bbox→图题/背注分离→增强变换可逆记录→视觉描述仅作候选。 | 按文件名臆造内容、增强伪细节、修复图冒充原图、图注冒充画面观察。 |
| C05 | 结构化数据 | 封存查询/响应→分页/游标语义→原值保留→schema/类型另列→行键/JSONPath→缺失值与空值区分→重算覆盖。 | 浮点精度/前导零丢失、null转0、分页重复漏页、未知总量冒充全量。 |
| C06 | 音频 | 记录codec/采样率/声道→时长与静音检测→按sample offset切段→ASR多候选→说话人/疑词标记→关键片段复听。 | 静音生成幻觉、方言专名误听、多人叠话、VAD截句；无回听定位不得作引文。 |
| C07 | 视频 | 记录容器/帧率/音轨/字幕→镜头与帧时码→音画同步→关键帧/区域候选→字幕/口述分层。 | 变帧率时码错位、关键镜头漏取、字幕来源不明、画面描述越过可见范围。 |
| C08 | 实物与现场采集 | 记录对象编号/采集者/时间/地点/设备/校准/CRS/观测值/许可；原始观测与整理值并存。 | 推测坐标当实测、未经校准的测量冒精度、采集许可不明、后期修订覆盖原始记录。 |

### 3.3 L1读取单元最小结构

每个read_unit至少关联：`raw_item_id,raw_version,read_run_id,unit_id,method_id,method_version,tool/provider/model_version,config_hash,locator_type,locator_value,raw_value,candidate_value,normalization_map,quality_profile,uncertainty,review_status,rights_scope,created_at,dependency_refs`。locator可为页码/印页号/栏行/bbox/多边形/JSONPath/行键/sample offset/时间码/现场采集点；不得用一个无类型“页码”覆盖所有载体。原件锚点不能回放时对应用途HOLD。

### 3.4 G1画像与交接

质量画像至少分开报告：完整性/覆盖、定位可回指、读取准确性、顺序/结构保真、可读性、复现性、版本稳定性、工具权利与处理许可。覆盖分母必须可核；未知总量只报已取得范围。OCR置信分不等于人工校核；音视频模型置信不等于说话人/事件身份。G1按读取用途和范围独立审查；关键引用/数字/身份争议、无原件定位、页序断裂、来源版本不明时HOLD。

**D01→D02交接**：仅交G1当前有效范围内的L1 read_units、原件/区域定位、原文/识读候选、工具版本、质量画像、疑字/遮挡/缺页/时码偏差、材料候选类型和权利边界。D01不得在交接时生成历史事实解释。

### 11.4｜D02：材料理解、H01—H25与L2

### 4.1 材料理解的对象

D02不是“摘要一段文字”，而是从可回放的L1单元中识别：材料载体和文体、作者/说话者/记录机关、受众和目的、材料形成时间与所述事件时间、文书结构/论证结构、原文主张、语气/模态、转引/引用链、支持/反证/沉默/缺漏、不确定性及其适用范围。

### 4.2 H01—H25材料类型与首要判读规则

| H方法/材料类型 | 首先辨别的阅读结构 | 主要错判风险 |
| --- | --- | --- |
| H01 通史与断代史 | 纪、传、志、表、后世综合叙述 | 后出史书引早期材料不能算独立同时代见证 |
| H02 编年与专题史 | 年号、干支、月份、纪事单元、专题章 | 事件排序不等于事件间因果 |
| H03 制度与政书 | 制度门类、条文、修订、实施例、处罚例 | 规定存在不等于实际落实 |
| H04 历史地理著作 | 地理条、山川水道、行程、郡县沿革 | 同名异地、历史辖属变动 |
| H05 地方志 | 序跋凡例、舆图、沿革、山川、建置、人物、风俗、艺文、杂记 | “旧传”“俗云”及旧志转录不能当独立证实 |
| H06 谱牒与传记 | 谱序、世系表、房支、传记、迁徙录、修谱跋 | 谱牒自证未必可独立确认血缘 |
| H07 行政档案 | 件号、收发机关、日期、呈文、批示、附件、套卷 | 批准不等于落实；案卷并置不等于同一事实 |
| H08 民间文书 | 契约首尾、条款、当事方、押记、账目、诉词、附单 | 签约不等于履行；诉词是单方陈述 |
| H09 金石铭刻 | 原刻、拓片、录文、校补、碑阴碑额、题跋 | 补刻与补字不得恢复成“原文明确” |
| H10 经学与儒家经典 | 经、传、注、疏、音义、校记 | 后人注解不等于原作者观点 |
| H11 诸子与思想著作 | 篇题、问答、辩难、论证、寓言、辑校 | 寓言与立论不作为具体事实报道 |
| H12 宗教与信仰文献 | 经文、戒律、仪轨、灵验记、寺产记、题跋 | 灵验叙事不等于超自然事实已证 |
| H13 文学与私人著述 | 诗题、序、正文、注、组诗、日记日期 | 典故、借景不能直接定位实地 |
| H14 笔记游记与小说 | 游程、见闻条、奇闻、叙事场景、引述 | 小说情节及传奇事件不能做史实 |
| H15 农业与生产文献 | 物料、工具、配方、工序、节令、成本表 | “可如此制作”不代表“当地曾如此制作” |
| H16 科学医学与技术文献 | 公式、病例、方剂、历算、测量图表 | 不要未标换算来源就同比数值 |
| H17 生活礼俗与艺术文献 | 节令、仪式、戏曲角色、乐谱、画题、题跋 | 艺术表达不等于社会生活普遍如此 |
| H18 历史舆图与图谱 | 图幅、图题、图例、局部地名、图说、比例尺声明 | 未经独立依据不得以示意位置赋现代精确坐标 |
| H19 出土与特殊文献 | 残简、缀合、释文、发掘单位、整理意见 | 整理意见不是原物自明事实 |
| H20 目录类书与文献汇编 | 书目条、提要、节引、辑佚、出处 | 类书与原书不构成两个独立证据 |
| H21 近现代报刊与期刊 | 期号、版面、栏目、消息源、转载链、更正启事 | 新闻、广告、评论不能混读；多报转载不能算独立见证 |
| H22 口述史与访谈记录 | 说话轮次、采访、录制、转写与回忆时间 | 后来回忆不等于当时记录；采访影响与剪辑不可隐去 |
| H23 现代考古与田野调查报告 | 探方层位、样本、测年、图版、报告推断 | 实测与解释须分离，测年区间不得伪成确切日期 |
| H24 现代学术研究与遗产调查 | 研究问题、方法、样本、引证、论证链 | 二手研究不得冒充新增一手见证 |
| H25 历史摄影与纪实图像材料 | 原图、拍摄视角、裁切、原配文、后配文、传播 | 后加标题不得冒充摄制时的事实 |

### 4.3 材料类型裁决和复合材料

- 以材料形成机制、文体结构和独立可定位单元为主类；混合材料允许父子类别，不因收藏地点或装订方式决定类型。
- 规定不等于实施；诉词不等于中立事实；谱牒自证不等于独立血缘确认；后世注疏不等于原作者观点；小说/寓言不等于事实报道；新闻转载不等于独立见证；测年区间不等于精确日期。
- 复合/嵌套文献保留母本、摘录、转引、原件和整理者之间的有向依赖；若原件未见，必须标明只读到转引或目录，不升级为原始证据。
- 材料类型争议保留主类与候选类、裁决理由和可推翻条件；分类不清时`unclassified/HOLD`，不硬套。

### 4.4 L2观察的最小内容与声音分层

每项观察必须关联：`material_ref@revision,read_unit_ref,source_voice,author_or_speaker,recording_agent,quoted_voice,editorial_voice,material_time,event_time,claim_text,claim_modality,scope,context,transmission_dependency,support_or_counter,uncertainty,locator,method_version`。原文、转述、编者按、现代研究者解释、模型解释和墨痕推断分别标识；不得合并为同一“史料原话”。

### 4.5 D02停止条件和交接

当原文声音/时代/材料结构不清、转引链影响独立性、识读锚点断裂、上下文不足以解释主张或材料类别争议会改变下游判断时HOLD，定向回D01/D00。L2输出是可追溯观察和证据候选，不是历史世界实体/关系结论。交D03时必须提供精确主张、来源声音、所述时空、支持/反证、同源依赖、限制与G2有效决策ref。

### 11.5｜D03：历史世界建构、W01—W10与L3

### 5.1 十法是循环调用，不是W01→W10固定流水

| 方法 | 专业判断 | 执行规则 | 最低产物 |
| --- | --- | --- | --- |
| W01 | 历史对象身份与连续性判定 | 辨认实体、别名、角色、活动时期与身份连续性；同名、近邻、图像相似不能自动合并。 | 实体候选、别名适用区间、合并/拆分理由、排除项、反证。 |
| W02 | 历史时间与时序约束建构 | 保存原纪年并分离事件时间、材料形成时间、版本刊刻/数字化时间、评定与发布时间；换算须记录规则、精度和不确定区间。 | 原纪年、规范化时间候选、区间、精度、转换依据、时序约束。 |
| W03 | 历史空间与视觉对应核定 | 区分图面像素/局部锚点、历史对象、拓扑关系、现代坐标和配准几何；S01—S05资格不可相互推导。 | 图面区域、空间拓扑/几何候选、CRS、配准方法/误差/有效域、对应依据。 |
| W04 | 历史事件与行动过程建构 | 区分传说、讨论、拟议、命令、募集、开工、完工、追记等状态；核对施事、受事、角色、阶段、时空和证据。 | 事件候选、阶段/状态、时空、参与对象与角色、过程依赖、证据和反证。 |
| W05 | 历史关系与角色约束建构 | 将亲属、隶属、任职、所有权、参与、运输、影响、因果等谓词分别建模，注明方向、角色、时效与条件。 | 关系候选、谓词/方向、主客体、角色、有效期、条件、支持/反证。 |
| W06 | 历史状态变化与连续性建构 | 先验证同一对象与同一属性可比，再比较前后状态；变化原因和中间过程是额外主张。 | 状态快照、可比属性、变化窗口、关联事件、未知间隔和竞争解释。 |
| W07 | 世界事实主张与证据支持评定 | 把材料陈述拆成单义主张，区分“资料记载X”与“X实际发生”；分别关联支持、反证、无法判断。 | 主张版本、支持/反证、范围、推理链、认识状态、原件回指。 |
| W08 | 来源谱系与独立见证评估 | 识别转引、重版、同一碑刻底本、同一通稿、照片裁剪等依赖；书名/件数不同不等于独立见证。 | 主张—见证组映射、源本/版本链、独立性判断、未知依赖。 |
| W09 | 世界主张冲突与认识状态管理 | 先对齐身份、谓词、单位、阶段、时空口径，再判断实质互斥或表面差异；保留竞争解释和历史版本。 | 冲突组、竞争主张、口径校正、认识状态、改判历史。 |
| W10 | 跨对象世界一致性与变更传播 | 检查跨对象身份/时序/空间/角色/状态约束，沿依赖闭包传播来源纠错、撤权、改判和下游失效。 | 一致性结果、影响集合、失效事件、版本指纹、重审要求。 |

### 5.2 世界主张最小语义

每条L3主张必须区分主体/谓词/客体或值、所指时空、条件、来源声音、主张模态、证据支持、反证、见证独立性、认识状态、版本和依赖。实体、事件、状态、关系和解释性主张不得压成无类型的“知识点”。历史时间至少区分事件/状态有效时间、材料记载时间、载体版本时间、评定时间和发布时间；空间至少区分原图像素、历史拓扑、历史范围/几何、现代坐标、配准模型与误差。

### 5.3 建构循环和回退

候选主张→对象/时空约束→事件/关系/状态→同步检查来源独立性/反证/竞争解释→跨对象一致性→修订/拆分/撤回/保留→按用途申请G3。可从任意W方法进入，反证会让循环重开。六类回退触发：来源原义纠错、身份合并/拆分、时空约束冲突、谓词越界、见证不独立/新反证、世界一致性或发布依赖失效。每次回退保留旧版本、触发依据、受影响对象/用途、回退目标和下一版或HOLD理由。

### 5.4 历史空间与视觉资格

S01全局配准、S02局部配准、S03锚点关联、S04空间重建、S05原图叙事是不同用途候选；S03成立不推S01，S04不能以创作画面生成历史几何，S05原图可读不代表公开展示许可。没有控制点/残差/有效域只允许原图或关系表达，不伪造现代精确定位。

### 5.5 G3七种独立用途

`world.explain_bounded`、`world.show_original_region`、`world.map_anchor_link`、`world.map_registered_overlay`、`world.reconstruct_bounded`、`world.change_compare`、`world.relation_explain`。每种用途分别检查身份/时间/主张/证据/空间精度/权利/范围；不得把原图局部阅读资格外推成配准、重建或现代导航资格。

### 11.6｜D04：人文发现、A01—A12与L4

### 6.1 十二法的重塑规则

| 方法 | 名称 | 专业职责与必须形成的规则 | 硬边界 |
| --- | --- | --- | --- |
| A01 | 显式关系：关系解释 | 解释已经有L3/G3依据的关系端点、谓词、角色和作用；不能把共现直接写成关系。 | BE/RF为主；关系资格仍归W/G3。 |
| A02 | 共现与跨源：问题线索发现 | 从共现、跨源重复和线索组合提出待研究问题；默认产物是open_question/candidate。 | 不得单凭共现产生确定关系或因果；G4需有额外合法证据与非同义理解增量。 |
| A03 | 时间序列：节律解释 | 对有据时序、间隔、节律、重叠和变化窗口作解释；保留时间精度和断档。 | 先后不等于因果；BE/BC/PS候选。 |
| A04 | 空间拓扑：场所结构解释 | 从邻接、包含、通达、边界和空间组织解释场所结构。 | 精确几何与历史定位资格归W03/G3及GIS工具；不得把拓扑候选变精确点。 |
| A05 | 行动链：行动者处境 | 解释行动主体、选择、任务、限制、资源和后果。 | 不从行为臆测心理动机；行动证据与人物内心分离。 |
| A06 | 制度机制：规则执行机制 | 比较制度规则、实施条件、执行记录和社会作用机制。 | 政策存在不等于落实；规范文本与实际行为分离。 |
| A07 | 跨模态共指：载体表征差异 | 比较文本、图像、地图、影像等载体对同一议题的视角、信息差和遗漏。 | 共指身份认证归W方法；媒体展示权按动作独立核验。 |
| A08 | 结构聚类：模式解释 | 从多对象、多关系和分布模式提出结构性解释。 | 聚类/网络算法输出是候选，不是社会事实；报告口径、样本和稳健性。 |
| A09 | 变化链：变化过程解释 | 解释有据状态转化、断裂、生成和持续过程。 | 不得补造缺失阶段或把先后关系直接写成因果。 |
| A10 | 冲突发现：争议模式解释 | 解释历史叙述中不同声音、立场、记录制度和知识生产过程的差异。 | 事实主张冲突裁决归W09；解释争议不代替G4。 |
| A11 | 跨时空比较：差异解释 | 在对象、时间、尺度、单位和样本口径可比时解释跨时空差异。 | 不同尺度强行比较应HOLD；比较结论须保留口径。 |
| A12 | 当下线索：历史与当代联系 | 区分历史延续、受控类比和启发联想，提出与当下生活的有界连接。 | 同名/同址不等于物质连续；当代端时效和来源单独核。 |

### 6.2 三种非排他性研究视角

- **候选问题与关联入口**：A01显式关系、A02共现与跨源、A08结构聚类。
- **时空组织与行动入口**：A03时间序列、A04空间拓扑、A05行动链、A06制度机制、A09变化链。
- **证据视角与当下入口**：A07跨模态共指、A10冲突发现、A11跨时空比较、A12当下线索。

三个入口只是阅读地图，不是三个新生产Stage，也不是固定工序。A01—A12可并行、组合、回退；每项解释都必须给出相对L3事实复述的非同义`understanding_delta`。

### 6.3 L4候选、解释与理解增量

必须区分开放问题/发现线索、解释候选、正式解释修订和G4资格。L4解释最小包含`human_question,interpretive_statement,understanding_delta,method_refs,upstream_L3_refs,valid_G3_purposes,support,counterevidence,competing_interpretations,scope,limits,revision,dependencies`。只有文风变化、画面变化、重新命名或同义复述不构成理解增量。A02共现通常只产生开放问题；A07跨模态身份判断仍归W；A10不替代W09。

### 6.4 G4五种用途

`bounded_explanation (BE)`、`bounded_comparison (BC)`、`grounded_relation_focus (RF)`、`bounded_process_sequence (PS)`、`qualified_present_link (PL)`。五项独立审查，不互相继承PASS；`return_to_evidence`和`agent_followup`是跨用途能力，不是第六/第七用途。比较必须口径/尺度/时段可比；过程序列必须显示未知间隔；当下联系分层说明延续/类比/联想。

### 11.7｜D05：可信发布、P01—P08、L5与双读消费

### 7.1 八项方法

| 方法 | 名称 | 专业职责与输出 | 硬边界 |
| --- | --- | --- | --- |
| P01 | 资格选入 | 核对象修订、G3/G4用途、范围、来源权利与依赖快照；输出受限选入包。 | 不得签G5。 |
| P02 | 世界投影 | 对L3/G3合格实体、关系、认识状态和冲突作无增事实投影。 | 不将G4解释并入历史事实。 |
| P03 | 时空变换 | 把有资格的时间/空间精度转换为舞台与Agent可读分面。 | 不虚构坐标、比例尺、行程或时间精度。 |
| P04 | 有界解释组合 | 仅组合G4允许用途的解释、主张、限制和开放问题。 | 不回写L3。 |
| P05 | 探索关系编排 | 按节点/边逐项资格与可达证据组织路径和探索顺序。 | 推荐顺序不等于历史因果或实测导航。 |
| P06 | 证据返还 | 提供可回原件/页图/合法引文的定位指针，并分开引用权与展示权。 | 索引可读不等于原件可展示。 |
| P07 | 消费分面 | 同一L5修订形成视觉舞台与Agent各自许可的表达分面，分别申请G5。 | 消费者不得自授资格。 |
| P08 | 精准失效 | 依赖变更时计算受影响修订/用途/消费者，先阻断，再请求独立G5复审。 | 不自签G5、不改写G3/G4、不复活旧版本。 |

### 7.2 六类L5逻辑成果

| L5逻辑成果 | 主方法 | 最低边界 |
|---|---|---|
| `world_projections` | P02 | 只投影L3/G3世界对象/关系/认识状态，不加事实或G4解释。 |
| `map_timeline_projections` | P03 | 保留时间精度、空间精度、CRS、有效域和来源依据，不造坐标/补帧。 |
| `agent_contexts` | P04/P07 | 仅包含G4限定用途及消费者可用内容，缺资格不得回答确定事实。 |
| `story_seeds` | P04 | 解释候选和导演线索，不自动成为剧本/正式史实。 |
| `discovery_paths` | P05 | 每个节点/边分别具资格与来源，可达性不由推荐序列推断。 |
| `evidence_pointers` | P06 | 可逆回原件/页图/引文；引用权、访问权、展示权、下载权分别校验。 |

### 7.3 双读消费者与G5

视觉舞台与墨痕Agent可共享同一事实身份/依赖快照，但各自分面、consumer、purpose、scope、rights_by_action必须独立获G5当前有效资格。`audience`不代替consumer；引用权不等于展示权；舞台读图不等于Agent可复制原件。G5只审指定L5修订/用途/范围/消费者，不改写L5事实内容，也不扩大G3/G4权限。

### 7.4 P08精准失效

来源版本、G3/G4/G5、权利、L5修订或依赖变化时，P08按`publication_revision × purpose × scope × consumer × dependency_snapshot`计算影响闭包；先阻断受影响读取，再交PD7/独立G5复审。依赖未知即`BLOCKED/unknown_dependency`，空集合不代表安全。撤权不自动推翻无关历史主张，也不全局清空无关分面；新发布需新L5修订和新G5决定。

### 11.8｜跨阶段统一字段、事件与失败边界

### 8.1 全链共同元数据

每个阶段产物至少有稳定对象ID、不可变revision、来源与上游引用、方法/工具/模型版本、输入指纹、权限/权利动作、依赖快照、创建者/执行者、当前资格引用、失效/撤权记录和审计事件。字段物理实现由MHKA-05/KAD4负责；本合同定义语义必需，不擅自指定新表数。

### 8.2 共同失败语义

`HOLD`表示当前条件不足但可补证；`REJECT`表示该候选/用途不接受；`REVOKED`表示既有资格已失效；`UNASSESSED`表示未取得有效决定；`STALE`表示输入/依赖修订后需重审；`BLOCKED`表示权限/依赖/系统前置不满足。不得将所有失败统一成FAILED或用Agent自然语言“已完成”掩盖机器状态。

### 8.3 上游变更回退

- D00来源身份/权利/版本变更→L0新修订→重评G0→只重开受影响D01/D02等分支。
- D01原件/识读/locator变更→L1新修订→重评G1→定向重开D02及依赖。
- D02来源声音/原义/转引/反证变更→L2新修订→重评G2→重开相关W判断。
- D03身份/时空/关系/事实改判→L3新修订→重评G3→重开依赖L4/G4与L5/G5。
- D04解释/理解增量/用途变更→L4新修订→重评G4→定向重建L5/G5分面。
- D05消费依赖/权利变化→P08先阻断→独立G5复审→新L5修订。

### 11.9｜与外部AI、墨痕Agent和Studio的接口

- 墨痕Agent是研究任务编排者和长期资产组织者，负责召回旧资产、拆解问题、选择阶段/方法、内外分工、接收回执、对比证据、整理候选、提出补证和复用建议；它不能自签G。
- 外部AI是有界受托执行者，按`root_task_id/subtask_id/delegation_id/executor/model_tool_version/input_refs/allowed_scope/rights/budget/deadline/output_receipt`受托。只输出候选和执行回执，不能直接写正式L层/G资格或公开读模型。
- Studio长期研究资产可保存未合格候选和解释工作，不要求每个研究笔记先获G资格；但正式历史事实/公众消费必须进入原D/L/G链。
- 失败、无服务、成本超限、版权不允许云处理、OCR/ASR不可用时，系统应降级为合法目录、原件局部、文字摘要候选、人工复核或HOLD；不虚构工具已执行。

### 11.10｜本合同的设计准出与运行状态

**设计准出**：D00—D05每阶段专业职责、输入/输出、方法集合、L对象、独立Gate、禁止边界、回退、与Studio/Agent接口可直接执行；C01—C08、H01—H25、W01—W10、A01—A12、P01—P08均在本合同拥有具体语义；没有旧编号只引用而没有规则转化。

**仍属HOLD**：真实D/G签发政策、数据库角色/RLS、六Stage Executor/Adapter实际绑定、各C/H/W/A/P方法的真实运行覆盖、工具/模型质量阈值、跨题材金样本、当前main代码与本合同逐字段映射。R4.2静态M1/M2/M3不当运行覆盖率。

### 11.11｜来源与裁决记录

本合同的有效规则由原P0—P5主规/方法/资格合同重塑，重点来源包括：P0 D00机制总规、P0.1资源发现与获取、P0.2来源身份版本权利与依赖、P0.3 L0/G0交接；P1 D01生命周期/质量画像、C01—C08方法、G1和D01→D02交接；P2 D02主规、H01—H25、复合嵌套/转引、G2；P3 D03主规、W01—W10、L3/G3及D04交接；P4 D04主规、A01—A12、L4/G4五用途；P5 D05主规、P01—P08、L5/G5双读与P08。来源文件保留为历史证据和方法原稿；本合同自身承载重塑后的执行规则。

## 12｜KAD2—KAD5研究候选/原件/跨题复用与原D链衔接（KAD6）

1. **D00**收到`project_id,root_task_ref,candidate_asset_id@rev,source_identity/edition,availability,acquisition_scope,rights_by_action,external_provenance`；`bibliography_only/metadata_only`可保存候选但不得发给D01假全文。实际原件`source.raw_items`必须与private object的bytes+SHA+来源版本+操作许可一致；无合法保存权只登记目录和原始URL。源身份优先复用既有`source.*`不造第二套。
2. **D01**只接合法G0范围内实际可读取载体，使用`source.read_runs/source.read_units`和typed locator（页/行/bbox/时码/行键等）保存原字节/读候选/模型版本及质量；D01交D02经既有`evidence.read_unit_evidence_links`绑定精确read_unit、G1及选区。`evidence.reading_units`继续作为D02材料结构，不得复制成第二个OCR真源。
3. **D02**的原文、作者/叙述人、语境、转引谱系、同源、反证、不确定性和H01—H25必须逐证据记录；D03经`world.claim_evidence_links`实际绑定L2证据与主张，不能仅凭对话总结写L3。D04合法产生解释/当下连接，D05仍只生成六类L5派生消费分面并需独立G5。
4. `StudioAsset@rev`与受控外部AI回包可申请`ProductionRequest`，但Agent/Creator/Operator或Stage一概不得自签专业G；`control.gate_candidates`仅为生产者签发申请候选而非审计决定。前序Gate/HOLD、权利、版本、依赖、目的范围及消费者在每个stage和消费时重核；复用旧L@rev需新项目权限和现行资格。
5. D00—D05不因KAD5双题被缩减为“试验流水线”；A隋唐运河、B宋代江南运河城镇的真实研究属于对完整架构的工程验收合同。回执需实际来源/页位/模型、G reviewer、资产修订、作品及增量，重复摘要和只有书目不得算知识增长。所有SQL/Gate/私有原件真跑继续`NOT_RUN`，KAD6为设计验收，不授运行资格。

## 13｜KAD1-A六阶段设计继承最终接口裁决（2026-11-06，EX01—EX06）

> **裁决性质：DESIGN_CONTRACT_READY / ENGINEERING_HOLD。** 本章是§0—12的执行形状收口，不新建七阶段、不复活最早D01—D05五阶段。C0—C4下获认可的D00—D05/L0—L5/G0—G5是唯一继承对象；MHKA-03定义知识/资格语义，MHKA-04负责方法和Agent专业选择，MHKA-05负责系统实现与安全，MHKA-00拥有有权签发治理。原P0—P5详细原件可追溯，不是运行前的第二权威。以下规则一经设计准出仍**不**表示Registry、G、原件、代码、数据库已投运。

### 13.1｜EX01：D00三长期资产到现有来源身份链的唯一合同

| 不变的专业对象 | 唯一逻辑ID/关联 | 已有机制的可复用归属 | 工程最小映射与拒绝条件 |
|---|---|---|---|
| Resource Catalog资源目录 | `resource_id`；`provider→collection→catalog_record→work→version→holding→digital_asset`（允许真实缺失且标unknown） | 当前Provider注册/分级是**平台字典**，`source.sources/source_versions/raw_items`为可复用L0主体 | 单件/集合/作品各自稳定身份、版本与权利；不能将Provider记录自动当作已取得的Source/Raw；只有目录命中仍留候选 |
| Acquisition Method Register获取方法 | `method_id + method_version + resource_scope`，与`resource_id`有适用范围关系 | Provider运维`access/rate_limit/failure_notes`可引用；采集意图保留当前研究批次目的 | 保存前置、逐步方法、工具/版本、授权、失败及替代、上次验证；历史成功不能替代本次资源/端点版本验证 |
| Acquisition Attempt Log获取尝试 | 不可覆盖`attempt_id`，外键`resource_id / method_id+version / intent_id` | 既有Acquisition Intent仅负责批次声明，不当尝试日志；当前run日志可按实际能力适配 | 每次尝试新增快照，含环境、脱敏参数、分页/响应、时间、真实字节/hash/失败确定性、重试、成本与恢复；事后追溯声明不得冒充事前批准 |
| L0受控原件及资格 | `source_id/version_id/raw_item_id@revision + asset_sha256 + rights_by_action`，独立G0资格键 | 唯一`source.*`主表+私有Storage+专业G0签发服务（尚须工程核实） | `PENDING→STORED_VERIFIED`需要服务端回读实际字节/hash；`memory://`、网页URL、书目与临时路径不满足真实Storage；G0 PASS仅授权明确D01机器读取动作 |

设计层**不预先指定必须新增三张SQL表**：若现有`source.* / control.*`和受控目录不能维持版本/追加日志及去重，再由MHKA-05按最小物理差分提出迁移和回滚。原三工作表主库在获授权、验证完整迁移前仍是历史/受控目录权威，不准并列写两个活动主库。D00的P0.1/P0.2/P0.3不计入C/H/W/A/P 63项。Provider分级、获取意图、实际尝试、取得范围、原件状态、G0资格是**六种独立事实**；S1/S2、`evidence_allowed`、`retrospective=true`都不能代替G0。

P0.2权利至少按`access_view/download/retain/machine_read/redistribute/public_display`逐动作保存`allowed/denied/unknown`、证据、对象版本、用途、范围、时间；外部模型处理另核`external_processing`。**D01读取必须有当次`machine_read`和若涉及保存时`retain`的合法权限及当前G0**。目录候选可长期保存，但无可读文件或动作权限时不能向D01递交虚构全文。

### 13.2｜EX02：63方法不是广播列表，必须有唯一选择/执行回执

每次实际调用使用`MethodInvocation`最小封套：`run_id,stage,method_id,method_version,source_definition_ref/source_sha256,engineering_definition_ref/sha,skill_id,adapter_binding,tool_or_model_version,requested_input_roles_and_refs@revision,carrier_or_material_profile,scope,purpose,consumer,rights_check_ref,budget,max_retries,output_contract,selection_reason`。调用后产生`MethodReceipt`：`input_fingerprint,selected_method_id/version,actual_adapter_tool_version,typed_output_refs@revision,source_locators,uncertainty,provenance,evidence_refs,resource_cost,failed_or_held_reason,attempt_log_ref`。没有真实调用回执时标`NOT_IMPLEMENTED/HOLD`，不得填PASS。

- 既有`method-binding-contract.json`63项是专业**定义登记**，`source_sha256`保留原C/H/W/A/P原件身份；工程文件sha和运行方法/Tool sha须独立保存，不能用工程修改覆盖原来源SHA。
- D01按载体C01—C08多方法；D02按材料/复合层次H01—H25；D03的W01—W10循环选用（W10作收口判断）；D04的A01—A12按有据人文问题选用；D05的P01—P07按读模型分面选用，P08只能走独立控制入口。63项**不要求每个任务全部运行**，但每个方法应有可选路前置、唯一Owner、typed输入输出、合法拒绝与未来正反测试。
- 固定样板prompt、某个含方法编号的Gate evidence、Fixture、只登记Skill不等于对应方法实际执行。未来M2—M4接线必须逐项证明选择条件→唯一绑定→真实回执；保留已验证样板能力，废止未使用的平行旧生产Runner。

### 13.3｜EX03：Producer候选、Reviewer签发和下游Guard严格分责

`ProducerCandidate`的完整语义为`run_id,stage,gate_code,artifact_type/id/revision,method_id/version,input_fingerprint,output_hash,evidence_refs,source_refs,dependency_snapshot,purpose(namespace/code/version),allowed_scope,consumer,rights_by_action,policy_version,requester_identity,idempotency_key`。Producer仅产生候选与申请；独立Reviewer凭已批准策略在`control.gate_audits/qualification_current`相关唯一权威中签发有界决定；Guard在每次读取和Stage交接时以`artifact@revision × gate × purpose × scope × consumer × dependencies × rights × effective_time`重新校验。无候选/无Reviewer绑定/旧PASS/跨用途/权利变更→HOLD。候选表不是正式Gate审计表。

当前选中`layer1-adapters.mjs`的D00—D05调用遗漏`qualification_request`，会抛`GATE_CANDIDATE_METADATA_REQUIRED`，属于**M2/M3确定性工程接线断点**，不是缺乏本章专业设计。禁止让生产者补权限直接签G。签发政策版本、自动审查范围和身份由原有权D/G治理方批准，KAD1不代签。

### 13.4｜EX04：持久化唯一写入Owner与一致性边界

**规范性职责裁决**：Stage Executor/Orchestrator拥有**事务和流程协调权**（输入合法性、资格、幂等和阶段结果）；专业Adapter负责**纯专业转换和候选提议**，不得直接拥有最终G签发能力；受控Data Repository/Storage服务为**正式数据/对象写入Owner**；独立Gate服务为**资格审计/投影写入Owner**。历史样板Adapter内直接写多表是需要M2/M3适配的现有实现，不是可以反过来修改该设计原则的先例。数据库物理每张表或操作按MAB既有权限矩阵唯一归属，不能因共享`control` schema给予Producer修改`gate_audits`的权限。

L0`source.*`→L1`source.read_runs/read_units`→L2`evidence.reading_units/material_evidence/links`→L3`world.entities/events/claims/relations`→L4`meaning.findings`→L5六类`read_model.*`构成权威主数据链；L3事实型L5可不生成L4，不能为了表格完整强制虚构L4。大型原件先`PENDING`，私有对象不可变上传、服务端回读SHA校验、再`STORED_VERIFIED`；写库与对象存储不同事务，必须有失败补偿/幂等/孤儿回收，版本/ACL/撤权/备份与DB+对象恢复同步保留。L1读取单位独立与原件字节有稳定locator，不以`memory://`或`apps/web/public`冒真实私有证据。**优先ADAPT已施工表**，新DDL仅在真实Schema差分和最小权限/回滚有据时由M2/M3执行。

### 13.5｜EX05：D05事实/解释分支与P08独立控制的唯一选路合同

- **事实分支**：输入`L3_fact_ref@revision + valid_G3_for_purpose + dependency_snapshot + rights/consumer/scope`，合法形成事实型`world_projections/map_timeline_projections/evidence_pointers`等P02/P03/P06读模型；未要求G4时不生成L4、不调用无关D04。仍须G5针对具体消费者/分面签发。
- **解释分支**：输入`L4_finding_ref@revision + valid_G4 + supporting_G3_refs + dependency_snapshot + rights/consumer/scope`，方可生成`agent_contexts/story_seeds`等P04解释类分面。缺G4不得以G3替换；上游证据和用途不得扩大。
- **P08控制**：属于**D05 Owner下独立控制请求**而不是第七Stage、不是新的L5真值对象，也不是与P01—P07混合发布的同一Job。触发于来源/版权/依赖/资格/版本变化，按受影响`revision×purpose×scope×consumer`先由Guard拒消费，再作失效闭包与追加审计；恢复只凭新修订及独立G5新资格。被选中样板Adapter在混用时只`p08Deferred`，不算完成；未绑定Adapter在混用时HOLD，不证明当前运行。**Library目标Registry**中D05 `methods=P01—P07`, `control_methods=P08`, `input_routes=fact_only/interpretive`, activation仍false；由M4实施Validator、Loader、Router和正反测试，不将目标JSON直接覆盖已施工机器配置。

### 13.6｜EX06：旧五阶段退出和测试证据分级

保留的只有被认可的六阶段生产权威。原无D00五阶段`pipelines/research`及Discovery/Directed/N桥、旧G1证据/G2世界/G3解释/G4运行错号文档一律**不再是现行规范或回退入口**。工程清理按文件逐项裁决：`DELETE_AFTER_NO_DEPENDENCY`（无CLI/CI/test/import/DB/回滚有效依赖）；`REWIRE_THEN_DELETE`（先在六阶段路径复用必要功能并验证）；`KEEP_AS_MIGRATION_EVIDENCE_ONLY`（真实旧库移植、历史审计、可验证回滚证据）；不得误删`pipelines/legacy`真实迁移脚本或老数据库历史记录。Git记录保留历史可追溯性不构成继续运行授权。

测试证据五级：`STATIC_CONTRACT`、`FIXTURE_UNIT`、`ACTUAL_SELECTED_ADAPTER_ISOLATED`、`REAL_DB_STORAGE_GATE_ISOLATED`、`END_TO_END_AUTHORIZED`。每个未来测试记录测试文件、Registry和Adapter/Tool版本、有效输入及预期输出、负例、环境、数据库/对象回执、commit、失败与回滚；CI success只证明其覆盖的级别，绝不跨级签PASS。至少覆盖P0目录误称原件、缺machine_read/retain、G候选缺字段、Producer越权签Gate、63方法路由、不必要G4、P08混绑/撤权、跨用户读取、旧五阶段入口、存储恢复失败。

### 13.7｜研究设计准出与工程施工分界

本章关闭的是**专业设计应当如何正确施工**的歧义，而非声称相关工程已完成。EX01—EX06只要原专业规则→MHKA唯一Owner→本协议/独立Gate/持久化/Registry目标→MAB具名源码路径与正反验收可双向追溯，即可记`DESIGN_CLOSED / ENGINEERING_HOLD`。被保护的GitHub现行Skill/Registry/Adapter/SQL/测试仍有明确未通过问题，保留P0工程阻断，不得消除或降低。KAD6仅可对**本次受影响的规范与追溯**签`DATA_PRODUCTION_DELTA_DESIGN_PASS`；需要Owner另行批准才能恢复M0—M5施工。恢复并不自动激活Gate、DB、Studio或WATCH消费者，仍按MAB既有门逐项准出。
