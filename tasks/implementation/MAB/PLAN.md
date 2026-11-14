# 墨痕 MoHen｜MAB工程施工方案与计划

版本：V1.6（单 main、工具无关执行与质量发布隔离；2026-11-14）  
设计基线：MAB完整设计交付包（2026-11-02）  
本次修订读取基线：GitHub main@b137483f52e023bd4b7064747480f30571866192（修订前观察点，非后续固定HEAD；每批必须重核）  
本次修订：继承V1.5的M0—M8、QR-01—QR-10、CP0—CP5（含CP4.1—4.4）、M5八维度及全部生产授权边界；取消施工主体与特定平台绑定，唯一代码施工分支为main，定向明确代码质量门禁、独立发布和具名环境接力；不新增第二任务书、分支或验收体系。

> 本文件是MAB-ENG-01受控任务书下M0—M8唯一施工计划、唯一执行顺序和唯一阶段验收标准。MHKA-00—05及授权专业合同是设计权威；本计划负责把它们落实为工程任务。不得以历史过程记录、旧交接指令或局部CI成功替代当前工程事实。

## 0. 当前执行裁决

**当前状态：** M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。

**2026-11-14 质量状态新证据（优先于下方历史复核快照）：** 远端 `main@b137483f` 对应的近期CI仍失败（单测676通过、6失败、4跳过），失败集中在导入权利枚举、私有证据绑定、生产触发错误码和独立Gate Reviewer测试；先前隔离PostgreSQL及HTTP验收存在失败批次，须针对当前精确SHA重新执行，不推断仍失败或已通过。Vercel已将CI失败的main提交构建为生产READY；READY不是CI通过、真实运行或M5准出证明。生产数据库迁移、正式Gate和公开发布仍保持原授权HOLD。

**单main施工与发布先决条件：** 工程代码只能原位提交到 `main`，不新建施工分支、不通过PR合并、不并行竞争写入；历史分支仅作为只读候选资料。每次改动前重核HEAD、文件版本及正在进行的写入；每批小范围修改并保存精确commit，相关CI结果未确认前不记PASS。**开始新的业务代码修改前**，须先核实并完成Git提交与生产自动部署的隔离，生产部署仅按既有授权单独触发和验收；未隔离时仅可进行获授权的文档修订、只读核验和不触生产的测试准备。尚未完成的发布隔离必须标HOLD，不得写成已完成。

**当前最近的施工入口（不改变§0.1 QR依赖顺序）：** ①核实并隔离自动生产部署；②关闭当前6个单测失败，并重跑受影响的隔离PG/HTTP、安全与Gate正反门；③从既有M5断点恢复同一作品的Studio→D00—D05/G0—G5→Admin/发布/WATCH整链；④按§3.5八维矩阵与§5—§6验收，之后依原阶段进入M6—M8。代码已推送、CI成功、独立隔离测试成功、持久总装及Owner签收各自独立记账。

**目标：** 在受控隔离环境中，以同一项真实历史文化作品完成端到端产品垂直切片：自然语言Brief、墨痕Agent与外部AI受控协作、合法真实来源与原件读取、D00—D05/L0—L5/G0—G5生产链、知识资产沉淀、Studio创作与修订、Admin逐条管理、独立G5及媒资权利、精确WorkRevision发布、WATCH消费和撤权验证。

**阶段状态：**

| 阶段 | 当前裁定 | 可继承范围与未完成责任 |
|---|---|---|
| M0 | EXIT_PASS | 审查级基线完成并冻结；不重做234路径、74目标、85 API、152动作全量盘点 |
| M1 | CONDITIONAL_EXIT | 代码/隔离安全底座可继承；M5实验所需真实Owner会话及M1-C01—C04仍按各自时点关闭 |
| M2 | CONDITIONAL_EXIT | UTF8候选及部分私有持久化/恢复可继承；真实NAJ原件页、PDF/page locator、L0—L2首次/回放/撤权仍未完成 |
| M3 | CONDITIONAL_EXIT | 独立服务/Runner客户端等隔离工程可继承；真实Reviewer、D00—D05、G0—G5资格签发/撤权/当前消费仍未闭环 |
| M4 | CONDITIONAL_EXIT | 委托、计划、候选收包、T1—T7及恢复基础可继承；真实Provider派发、实际费用、双主体互补仍未验证 |
| M5 | REMEDIATION_ACTIVE / HOLD | Studio/Admin/WATCH已有局部真实工程；同一真实作品八维度闭环尚未完成 |
| M6—M8 | NOT_STARTED | 保留原范围与依赖，不提前并入M5 |

**历史工程阻断快照（基于 main@3262fe43；2026-11-08复核，非当前测试结论）：**

1. **远端工程门禁已恢复绿灯。** main@3262fe43 的 GitHub CI run 42453345351 SUCCESS；84个测试文件通过、4个跳过，614项单测通过、4项跳过，172项Node测试通过、0失败；K3追溯85 API/152动作/62模块/5屏通过，Next build通过。MAB隔离HTTP run 42453345284 SUCCESS，24项通过、1项私有原件测试跳过；Vercel状态success。0fe38aa本身也有CI run 42445203315 SUCCESS；此前“无HEAD CI”的审查记录已纠正。
2. **Registry只在隔离范围激活。** production-registry.json 当前为 ACTIVE_AUTHORIZED，但activation明确限定M5本地隔离环境，生产未授权。D00—D05六个Stage的本地执行策略为attended；63项方法中6项有实现绑定、57项为HOLD。
3. **本地执行授权仍需补强。** local-execution-authorizer.mjs按Registry的enable_requires列表直接生成全部true声明；execution-authority.mjs验证签名与声明一致性，但不独立证明这些前置条件实际成立。当前脚手架只可按隔离工具使用。
4. **Provider预算仍未形成持久化原子闭环。** 已补项目绑定、未知费用冻结、全状态费用累计、UTF-8保守估算、响应正文超时及成功重放；但跨实例原子预算预留、Receipt写失败后的持久不确定状态、对账与恢复仍未完成。
5. **权利字段与专业合同存在实证不一致。** 生产39条source.sources.rights均无rights_by_action和external_processing字段，source_versions 39条均无rights快照；KAD动作词典未覆盖Gate明确要求的machine_read/retain。G5 Reviewer对缺失动作字段仍未做到显式允许才通过，媒体权利也未完成动作级验证。
6. **Agent与外部AI尚未证明同一root协作。** Studio研究task与外部模型授权/派发仍使用不同任务引用，前端未把研究task_id及Agent产物传入外部委托链。
7. **知识资产来源回链仍有缺口。** 隔离批次I记录5/5资产source_refs/dependency_refs为空、use_events=0；生产Studio项目和资产修订当前均为0，不能把隔离样本当作生产资产。
8. **生产运行条件尚未建立。** 生产只读核查：Studio项目0、Studio资产修订0、private_originals表不存在、Storage桶0；Gate候选表存在，但Gate策略版本表、Reviewer绑定表及current_qualification_is_valid函数不存在。director_plans.project_id列尚未部署；新代码会在模型调用前返回HOLD，不会为缺失迁移发起付费调用。
9. **SEC-01已关闭；7项本地Guard仍待复核。** 生产public.imported_materials的RLS=true；anon/authenticated无SELECT/INSERT/UPDATE权限；mohen_app_runtime的SELECT保留。7项本地guard最后记录为红，未在本轮重新执行，不能销账。
10. **M5八维度不能提前准出。** 最新CI、隔离PG和隔离HTTP通过只证明对应隔离证据；无VERIFIED_LIVE，正式生产Reviewer/Gate未启用，来源权利、同root协作、真实原件、Admin回链及Owner体验仍未完成，M5继续HOLD。

### 0.1 既有工程质量复核与整改任务（2026-11-08起，原编号保留）

本节是本轮Owner同意启动的质量整改任务，属于本PLAN的增量施工范围；不另建任务书、不改变MHKA/KAD/D-L-G专业定义，也不授权生产迁移、正式Gate启用或新增Provider支出。所有发现以源码、既有测试和当前进度账为依据，分为代码缺陷、合同/接线缺口、证据不足及已有环境阻断；不得混为同一类。

| ID | 优先级 | 复核发现与证据位置 | 必须关闭的验收条件 |
|---|---|---|---|
| QR-01 | P1 | **第一批修复已提交。** 新增director_plans.project_id迁移；所有导演/分镜/面板/旁白Grant入口绑定项目；授权校验delegation.project_id；项目切换清除临时Grant/方案/作品状态。隔离PG迁移及外键检查通过；生产列尚不存在，代码会在Provider调用前HOLD。 | 继续完成项目身份真实连接池/HTTP正反测试；生产迁移仍需单独授权；旧project_id为空的计划必须保持HOLD，不推测回填。 |
| QR-02 | P1 | **代码已改为事务局部且物化的session_context CTE。** project source读取、Provider source-right读取及隔离验证脚本均已同步；单测检查SQL使用MATERIALIZED + set_config(...,true)。 | 仍需同一Node PG连接复用下Owner A/B/匿名连续切换的真实数据库正反测试，完成后才可关闭。 |
| QR-03 | P1 | **第一批安全修复已提交。** HOLD/UNKNOWN/空费用回执冻结新调用；所有已知费用状态计入spent；UTF-8字节作为保守输入上界；超时覆盖完整响应正文；相同成功输入可无额外费用重放。 | 持久化原子预留、跨实例并发防超支、Receipt写失败后的持久不确定状态、人工对账/恢复仍未实现。评估现有M4分支时必须先解决多调用Delegation兼容，不直接合并。 |
| QR-04 | P1 | **生产只读核查确认权利数据缺口。** 39条source.sources记录均无rights_by_action/external_processing；仅8条有basis，31条权利信息不完整；source_versions 39条均无rights快照。Studio资产修订0条，当前没有可供Provider核验的正式source_anchor权利快照。 | 先统一动作词典与source_anchor/asset_revision权利快照来源；逐来源、逐版本绑定原件/locator/hash/purpose/rights evidence；任何缺失或unknown均HOLD，禁止从CC许可标签或来源类别自动推断外发权限。 |
| QR-05 | P1 | **动作词典冲突已确认。** KAD rights_by_action仅列read/quote/display/download/adapt/external_processing；Gate G0明确machine_read/retain及其他逐动作许可。当前Reviewer缺失字段仍可能通过；生产无rights_by_action数据。 | 先修订既有KAD/Gate合同形成唯一动作词典，再接入source_anchor与媒体的不可变权利快照；G0/G5按实际动作显式ALLOW，缺失/unknown/restricted/过期一律HOLD；补G0—G5正反测试。 |
| QR-06 | P1 | **内外AI不是同一研究root的可验证协作。** `research-tasks/route.ts`创建Studio研究task并运行Agent研究；`dispatch-authorizations/route.ts`另建固定rootTaskRef=`studio-llm-dispatch`；Studio前端没有将研究task_id/Agent发现传给授权及导演派发。 | 同一root_task_id/ref下形成Agent与Provider互补子任务；外部输入包含经筛选的Agent研究成果和来源快照；输出分别回写同一任务事件/资产；保存双方input/output hash、贡献、Receipt、成本与失败状态。 |
| QR-07 | P1 | **已由 CP2-F 关闭（2026-11-09，仅本地隔离）。** 迁移 `20261109130000_mab_cp2f_asset_backlink.sql` 建立 `studio.reference_kinds` 18 种类型登记、`resolve_asset_reference(s)` 逐条回查、`asset_consumption_disposition` 六动作裁决与两道 BEFORE INSERT 守卫；生产代码 `private-original-repository.finalize()` 漏写 `source_refs` 的复发缺陷已修，`saveRevision` 硬编码 `epistemic_class='editorial'` 已改按 `asset_kind` 映射。`tools/verify-6-asset-backlinks.mjs`=`VERIFY_6_BACKLINK_PASS`，真实消费路径 `blocked=2 eligible=4 new_use_events=4`，`GAP_ASSET_USAGE` 由 HOLD 转 PASS。 | 新资产创建时写入可验证source/dependency refs；已有记录逐条核实后再补，不能推断；Admin按条逆查原件、source_version、locator、证据、D/G资格、rights/purpose和use_events。**残留**：2条m2脚本legacy证据类行仍`BLOCKED(NO_SOURCE_REF)`（不可变、不回填；Owner 2026-11-09裁决「不用了，标为历史演示数据」，原样保留不参与研究）；`studio.asset_links` 仍无真实写入方；生产Studio项目与资产修订仍为0。 |
| QR-08 | P1 | **本地执行授权条件不能自证。** Registry的enable_requires被本地授权脚手架直接转为true，需验证运行环境/隔离标记/绑定/测试事实，而不是签名自报。 | 生产与本地隔离授权分离；本地脚手架仅接受明确的隔离目标并拒绝生产端点/生产密钥；每个enable_requires由独立可验证检查生成，缺任一证据不签发。 |
| QR-09 | P0（生产前/门禁） | **SEC-01已由生产只读核查确认关闭**（RLS=true，anon/auth无SELECT/INSERT/UPDATE）；7项本地Guard最后记录为红，本轮未重跑。 | 只针对7项Guard逐一定位、修复或有据延期并纳入持续CI；SEC-01保留关闭证据，不重复施工。生产变更仍须单独授权。 |
| QR-10 | P1 | **M5准出证据被批次摘要过度概括。** 同一作品的隔离PG/HTTP链路有价值，但Owner体验、正式Reviewer、媒体权利、同root混合协作、来源依赖和全链D/L/G尚未全部达到PLAN准出条件。**泛化冒烟（2026-11-13补入）**：一条模板作品链路跑通≠通用创作入口闭环；research.ts 强制 generic→understand() 导致非模板topic崩、D00 registry methods=[] 导致无多渠道来源发现。 | 逐项按本PLAN八维度矩阵及M1—M4条件准出复核；所有P0/P1关闭、同一真实作品证据齐全、隔离PG/HTTP正反通过；**泛化冒烟补证**：至少两个非模板topic跑通 ST-01（通用委托入口）→D00（多渠道来源发现+权利字段）→G0→Admin 资产流入；未过泛化冒烟的维度不得转 ✅；最后Owner实际体验签收；之前保持M5_OVERALL_HOLD。 |

**历史分支候选（仅可只读评估，唯一施工分支仍为main；不新建分支、不整支合并）：**

- `mab/m4-provider-spend-controls-20261107`：比main多13个提交，包含执行预算预留/释放/费用对账迁移、repository和PG测试；是QR-03的重要设计/代码候选。它目前与main分叉，且其控制模型按单个delegation限制外部attempt，而当前Studio授权是多动作/多调用Grant；权利封套也使用与当前路由不同的ALLOWED/source_refs字段。因此只能先做兼容性审查和定向移植，禁止整分支盲合并。
- `mab/owner-led-execution-plan-20261107`：是早期计划/治理修订分支；main已有更晚M5施工与质量状态，不把该分支整体合并进main。

**整改顺序（唯一顺序，按依赖可并行测试，不改变M0—M8）：**

1. QR-01/02/08：先关闭项目身份、数据库会话隔离和本地执行授权边界。
2. **QR-06（前调）**：把Studio Agent研究task与Provider委托合并为同一root任务DAG。没有同根协作，外部AI Agent调用就是孤立Provider派发，不是用户要求的"墨痕+外部Agent都能跑通"。与QR-01/02/08一并先关。
3. QR-04/05：对齐权利动作词典与source/media权利读取，补独立G0/G5正反证据。D00多渠道发现（QR-10泛化补证）依赖权利字段。
4. QR-03：在现有Delegation/ExecutionControl/Receipt内完成持久预算预留、未知费用冻结、核销和恢复；先评估分支候选，再决定最小增量。
5. QR-07：修复知识资产来源/依赖回链及Admin逐条逆查。
6. QR-09：在只读核实后关闭SEC-01及7项Guard；生产迁移仍需独立授权。
7. 对受影响链路执行完整测试，重算M5八维度；泛化冒烟（至少两个非模板topic跑通ST-01→D00→G0→Admin链）；Owner体验签收仍是最后一步。

**顺序调整依据（2026-11-13 Owner裁决）**：原顺序把QR-06放在第4位、QR-04/05放在第2位，是基于"先有权利再做协作"的假设。但用户目标明确说"墨痕自主+外部AI（比如你）都能跑通"——同根协作是创作线的核心能力，没有它外部AI就是孤立Provider调用。故QR-06前调到第2位，与QR-01/02/08一并作为创作线的前置基础。

**质量整改准出纪律：** 代码存在、单测通过、CI通过、隔离PG/HTTP通过、生产LIVE、Owner体验签收是不同证据级别。每项必须分别记录；不得以Vercel READY、主CI绿灯、机器Reviewer账号或合成fixture替代真实业务验收。所有整改优先原位修复现有代码/合同；不新增第二套Provider账本、第二套Gate、第二Runner或第二权威进度文件。
### 0.2 Owner裁决｜单main、工具无关总装、过程控制与首用户交付（2026-11-14）

本节是**现有MAB计划的执行机制与最终交付标准**，不是新任务体系；2026-11-14仅替换此前绑定某一开发平台的责任指派及分支/发布机制，继续执行§0.1的QR-01—QR-10、§3.1—3.5的M1—M5门、§5的M0—M8及§6质量规则。不得因重新聚焦内容锚点而降低D00—D05、G0—G5、Agent自主调度、Studio和Admin/WATCH的通用能力准出；初中历史主干是持续内容方向，不替代本次已选合法真实原件的工程验收。

**A. 总装责任及不可替代的交付定义**

1. **唯一工程执行责任（不指定平台）**：每轮仅由Owner当前授权的工程执行方对代码写入、回执和总装结果负责，具体工具不构成工程主体、权威或准出依据。执行方负责贯通同一仓库、同一可重演环境、同一真实研究任务的Web/UI、数据库、私有Storage、唯一Runner/Registry、D00—D05/L0—L5、独立G0—G5、Agent/受控外部AI、13类资产合同、Studio、Admin、合法发布、WATCH与撤权。可按实际环境能力委托具名验证动作，但必须由同一执行责任闭环；其他工具/人员不得未经授权同时写main、另起施工分支或另立质量标准。
2. **两级准出，不能混同**。M5必须在**持久、隔离、可反复进入**的真实集成环境以同一项合法原件和真实业务数据通过原八维度；一次性销毁的合成PG/HTTP测试、静态演示和预置Gate PASS不能代替。M6全面回归、M7双课题真实跨题复用、M8经授权的受控部署/迁移/恢复/发布继续按原门执行。**最终交付**是具备对外开放的安全、稳定、内容、功能和运维质量，但公众入口保持关闭；Owner作为第一位实际用户从Web UI独立完成多角色业务。不得以M5隔离PASS冒充M8或“可对外开放”。
3. **只认同一运行实例的整链结果**：每一关键动作须能从前台入口关联到真实`root_task_id → 原件byte/hash/locator → D/L/G候选和独立决定 → Agent/Provider事件/真实费用Receipt → asset@revision/source_refs/use_events → WorkRevision → G5/媒资动作许可 → 发布pointer → WATCH消费者与撤权`。界面展示必须对应真实后端状态，空库/缺权/失败如实HOLD；不得注入假材料、手工签PASS、直接改数据库伪造作品或以多个互不相干的切片拼成成功。
4. **先完成工程内部验收，后交Owner体验**。工程执行方必须在可达的真实浏览器/HTTP/PG/Storage/Provider环境取得角色正反用例证据；不具备环境时标记NOT_RUN和具名阻断，协调具名执行，不以口头结果代替。只有M5—M8各适用门证据完整，且持久首用户环境可复演，才发正式体验入口。Owner只评价实际内容、视觉、交互和角色体验，不代替工程侧排查基本可用性。
5. **能力与作品两条线同时问责**：通用能力按§3.5八维、§5/§6逐项准出；历史主题必须产出真实、可读、可操作的内容体验，不能仅有后台产物。现有《松江府志7》先按原计划承担M5真实原件总装，首期面向公众的历史主题及中学历史内容锚点在内容验收中继续评估，不据此重做原件来源调查。

**B. 单main开工核对与本地环境安全对齐（第一道强制门）**

1. 每次工程写入前先核GitHub远端main最新HEAD、对应文件版本、当前CI/生产部署状态及是否存在其他未结束写入。本地环境参与时，另核实本地目录、分支、origin、未提交/未跟踪文件、未推送commit和凭据配置，安全保全尚未同步的独有成果；不得把Secret、私有原件或本地配置误提交到GitHub。无本地执行环境时，不凭空声称已经完成本地检查。
2. **唯一可写代码分支为main**，不创建或切换到施工分支、不发PR、不以整分支合并作为施工入口。直接GitHub写文件时必须以刚读取的blob SHA执行条件写入，遇并发变更先回读对比，禁止强推覆盖。本地参与时执行`git fetch origin main`并对比`HEAD...origin/main`，仅在安全且为远端祖先时fast-forward；如存在未提交、未推送或分叉，先保全并逐项对账，保持main不写入直至解决，不通过新增分支绕开冲突；禁止`reset --hard`、force-push及盲目stash/rebase/pull。
3. **CP0停点**须交付远端main精确HEAD、CI/自动部署隔离现状、执行环境可达性、已有证据与当前具名阻断；有本地工作树时再交本地状态、与main差分、独有成果保全及恢复方式。只有来源与差异处理清楚、生产发布隔离已确认后才开始新业务代码修改。同步不等于清除任何未推送的施工成果。

**C. 持久集成环境与集成施工纪律**

- 建立一个**可持续使用、具名、非生产且具隔离防护**的集成验收环境，具备真实Web/浏览器、PG、私有对象存储、Runner、独立Reviewer/Gate、Agent和已批准的受控Provider；有数据迁移、私有备份、失败恢复和重复进入能力。允许保留一次性CI作为回归门，但它不能代替此环境。未取得外部Secret、真实Reviewer、合法原件或隔离Storage条件时，登记具名阻断与必要Owner动作，不得转向无限叠加外围功能。
- 按§3.5 C及§0.1原先依赖顺序修缺口、做集成，不另建“最小切片”或第二架构。M1—M4每项仅有条件PASS时，不得将未关闭条件默认为下游已满足。真实历史材料、独立Gate与外发费用均受既有权利/最小权限/预算控制。
- 每个可验证的业务闭环都要同时交付**UI真实动作、服务端实际行为、持久数据及证据、POS/NEG/AUTH、恢复/撤权**五类结果。每次代码提交保留精确SHA和影响回归；远端CI绿色只代表其实际执行的检查，不视为完整集成PASS。

**D. 过程控制检查点（防上下文漂移，不是让Owner验收半成品）**

| 检查点 | 触发条件 | 工程执行方提交给Owner的精简方向报告 | Owner动作 |
|---|---|---|---|
| **CP0 本地同步/总装开工** | 备份、同步、环境盘点完成 | 本地/远端SHA及差异、当前阻断、首个实际施工包与依赖 | 审阅方向后继续 |
| **CP1 持久环境与M1/M2** | 可持续集成环境建成，真实身份/原件字节/回读与恢复证据具备 | 环境入口及权限边界、原件/Storage/PG证据、未关闭条件 | 审阅是否按原计划总装 |
| **CP2 M3独立生产资格** | 同一原件D00—D05真实运行、G0—G5独立正反回执齐备 | 六阶段/Gate逐项事实、HOLD及原因、输入输出链 | 审阅是否把局部测试冒充准出 |
| **CP3 M4真实Agent协作** | 同root双主体真实任务、受控外发与费用/恢复验证完成 | Agent与Provider各自产物、真实Receipt/费用、失败/撤权 | 审阅方向与合法边界 |
| **CP4 M5及M6/M7总装回归** | 同一作品Studio→Admin→G5→WATCH及M6/M7既定门完成 | 八维度矩阵、全角色路径、双课题复用、端到端回归与缺陷 | 审阅是否具备发布候选 |
| **CP5 M8首用户交付** | 经授权完成受控首用户环境部署、预发布验收和回退演练 | 实际入口、角色测试账户/交接方式、版本、恢复证据、未开放公众的证明 | Owner才开始正式全角色体验和签收 |

检查点仅是**方向/范围控制点**：工程执行方应在每个点**暂停新增施工、保全main已提交SHA与尚未同步的成果并简要报告**，等Owner发出“继续”再进入下一区段；不要求Owner逐条审核源码或提前体验半成品。同一检查点内允许连续开发、调试和重跑，不每个小commit都停。若上下文压缩/切换、关键策略偏离、不可逆操作或真实阻断早于检查点发生，也应先在`progress.md`保存“当前目标—已完成SHA—未完成与阻断—下一精确动作”，暂停续作；恢复时只读取PLAN相关章节、该恢复记录及受影响文件，不重新开题或凭AI记忆重规划。遇到失败要在区段内定向修好，不将失败标成完成；确需Owner授权的高风险操作按既有§6与M8规则另行申请。

**E. 最终首用户多角色验收（不可被单角色Admin演示替代）**

- Owner经真实Web首页/登录入口，分别按产品既有角色/权限进入：Creator/Studio研究创作、知识资产Admin、独立Reviewer审核、Operator发布与撤回、WATCH观看者，以及首发范围中已启用的探索/查询等用户入口。每个角色都要使用实际生效的身份与最小权限；独立Reviewer必须保持独立，不能让Creator、Owner或系统管理员自签；需多个独立测试身份时由受控角色账号覆盖，Owner作为第一体验者可查看对应真实角色会话。
- 逐角色验证完整正向操作、越权/撤权反例、登录/恢复、真实页面/手机和桌面可用性、无空壳占位、真实可追溯内容、错误说明及实际响应；页面可访问、按钮可点击、结构快照或预置演示均不算用户功能PASS。既定延期功能必须明确HOLD/未启用，不得把不可用角色或EXP装作已开放；若首发范围宣称覆盖该角色，必须在M6/M8关闭对应延期并通过真实测试。
- 所谓**“具备对外开放条件”**是**可公开发布的发布候选**，而非擅自公开：含隔离/生产环境一致性、权限、资料与媒资权利、全角色体验、持久数据、日志/监控、备份恢复、撤权、错误与成本、回退和安全审查。**最终Owner私有首用户入口经授权才可启用；公网匿名开放、公开作品发布或扩大其他用户访问须Owner另行授权。** 未完成M6/M7/M8任何强制门时不得宣称交付可开放级系统。

**F. 环境一致性最高原则（Owner 2026-11-08裁决，2026-11-14保持原合同）**

1. **本地与云端都必须朝"未来可公开发布"的条件建设**，不得任一方为省事降低标准。环境不再是长期议题：配套缺口一次性列清、一次性配置，之后只跑一致性检查出结论，不在每批重复讨论。
2. **差异只允许在实现载体，不允许在契约**。同一份迁移、同一套 env 键契约、同一套 RLS/权限、同一套存储适配接口。本地＝本地 PostgreSQL + 本地私有原件文件系统；云端＝云端 PostgreSQL + 私有对象桶，二者由 `private-original-storage` 适配器在同一接口下切换，**禁止出现两条业务代码路径**。缺 Docker、缺 Supabase CLI 属工具便利性差异，不构成架构分歧，不得作为阻断理由反复重提。
3. **环境配置与费用是 Owner 决定事项**：工程侧只负责给出精确配置清单、费用区间、影响与不可逆点，不自行降级目标，也不自行扩大支出。
4. 建立**一次性环境一致性检查**（清单＋脚本），覆盖本地与云端两套环境的键、权限、迁移版本与存储后端；每次施工先跑检查，把"环境是否有问题"变成可复核结论而非讨论。

**G. 单main同步与必要成果保全（不建长期冗余副本）**

1. GitHub `main` 是唯一远端施工代码基线；不新增长期镜像、施工分支或全量交付包。每个定向批次通过可用预检后及时提交main并核对远端SHA，不积累大量未推送提交；现有独有本地成果在安全对账前允许必要的临时保全，禁止以“零冗余”为理由丢弃尚未同步的代码。CI失败时继续同一main具名修复，不得把红灯提交标为准出。
2. 禁止 `reset --hard`／force-push 仍为硬约束；同步只允许 fast-forward，分叉即停。
3. 数据库迁移前的**运行数据快照（dump）允许短期保留**，验收后清理；它属于数据快照，不属于代码副本。

**H. 费用治理（能省则省第一原则，满足试验需要第二原则）**

1. 原有 **¥20 累计上限不变，不上调**。当前真实累计花费 ≈ ¥0.06（批次F $0.000074＋批次G $0.007452＋批次K $0.001314），远未触及上限。
2. 每次调用前先估算最坏费用；能复用既有回执／同输入回放的一律不重复付费；能合并为一次调用不拆成多次。
3. 每个检查点报**真实累计费用**；累计触达 ¥20 的一半（¥10）即停止新增付费调用并请示，不默默花完。
4. 新增 Provider／账号／密钥／订阅或明显扩大调用量，仍按原规则单独请示。

**I. 检查点最终编号（Owner 2026-11-08 确认，CP4 分拆）**

CP4 原范围（M5八维度＋M6全量回归＋M7双课题）跨度过大，拆为四个子检查点，其余不变。**共 9 个停点**：

| 编号 | 范围 | 交付证据 |
|---|---|---|
| CP0 | 本地同步、备份／恢复、环境与库现状盘点 | 已完成（见 progress.md） |
| CP1 | 持久集成环境定版＋M1／M2＋QR-02、QR-08 | 环境一致性检查、迁移落到真实本地库、原件字节与回读、备份恢复实测 |
| CP2 | M3 真实 D00—D05＋独立 G0—G5＋QR-04／QR-05 | 六阶段与Gate逐项事实、动作词典与逐动作权利快照、HOLD原因 |
| CP3 | M4 同root内外AI＋QR-03／QR-06 | 双主体产物、真实费用与Receipt、失败与恢复 |
| **CP4.1** | M5 维度1—5：自然语言入口、内外AI、来源证据D·L·G、13类资产、Studio创作 | 五维逐项真实数据与PG/HTTP正反 |
| **CP4.2** | M5 维度6—8：Admin逐条逆查＋QR-07回链、独立G5与媒资动作权利、发布指针、WATCH消费与撤权 | 三维逐项正反＋撤权即时拒绝＋Admin每条可逆查原件 |
| **CP4.3** | M6 全量回归：85 API／152动作／63方法／19 Skill／H1H2H3／19组件／AT-01—16／X1／Gate 26项＋QR-09 七项guard入CI | 分母逐行结果与证据，延期项标延期 |
| **CP4.4** | M7 KAD5 双课题真实跨题复用 | 跨题复用记录字段齐全、B课题真实增量 |
| CP5 | M8 经授权受控首用户交付、预发布验收、回退演练 | 真实入口、角色账号、恢复证据、公众未开放证明 |

**八维度不得继承旧结论**：progress/LOCAL-BUILD-LEDGER 中"M5八维度全部机器验证闭环"的说法与 §0.1 QR-10 冲突，在 CP4.1／CP4.2 按矩阵重新基线核验，未重算前该结论降级为"待重算"。

**J. 环境与投产裁定（Owner 2026-11-08 第二轮）**

1. **云端凭据路径更正**：GitHub Actions Secrets 按设计**只能写入、不能读回**，故"从 Secrets 取凭据"不可执行。改为经 **Vercel 项目环境变量**取得：安装 `vercel` CLI、登录后 `vercel env pull .env.production.local`（该文件已在 `.gitignore`）。凭据不入库、不进日志、不进对话；本地当前无 `gh`／`vercel` CLI，属工具缺口，装一次即可。
2. **云端套餐先免费层**，容量、备份或平台级访问保护不足时再议升级，不提前付费。
3. **入口：本地与云端双入口**，均走产品自有注册与邀请码（`MOHEN_REGISTRATION_MODE`＋`MOHEN_INVITE_CODE`）。免费层不提供平台级访问保护，属**已知残余风险**，如实登记，不宣称平台级封锁。
4. **生产 Gate 采用"机器预审 + Owner 终签"**：机器规则评审为独立通道，须与 Creator/Operator/系统管理员身份隔离；Owner 终签保留人文判断。**Owner 同时为 Creator 时构成自签例外**，须在证据中显式标注并说明风险，不得隐去或以机器签掩盖；本条为 Owner 明示裁定，不改变 MHKA 独立性要求在其他情形下的适用。
5. **上云时机**：CP4.2 本地全链稳定后，一次性把迁移与配置整体推到云端，之后两端只跑环境一致性检查；不得边改 schema 边反复推云端制造双环境漂移。

## 1. 施工目标与总边界

### 1.1 目标结构

- 设计权威：MHKA-00—05。
- 唯一知识生产主线：D00—D05；L0—L5；G0—G5。
- 唯一生产编排入口：现有Runner/Registry；不得另造第二Runner、第二Registry或平行Gate。
- 知识资产：复用现有13类资产合同、唯一资产正文、不可变revision、CAS/幂等、来源/权利/用途/使用史。
- 产品：Studio是研究与创作核心；Admin管理Studio产生的知识资产；WATCH只消费合法发布的同一WorkRevision；EXP及L6—L8按既有延后激活边界处理。
- 人文方法：H1/H2/H3与19组件必须进入真实作品，不以静态页面、组件存在或结构测试代替实际职责验证。

### 1.2 M5验收场景

M5必须在**可持续进入、可恢复的非生产集成环境**完成至少一项真实历史文化作品的完整垂直切片。真实输入必须包含合法史料字节、精确来源和locator、真实Provider调用、Agent与外部AI互补、真实D/L/G链路、真实知识资产与作品修订。mock、合成业务材料、临时sandbox文件、静态页面或单项CI均不能代替真实全链验收。集成环境须能提供真实Web/UI操作、实际存储/审签/消费和回放证据；仍不等于正式生产启用。

隔离环境中的受控发布和WATCH消费可以用于M5验收；不因此授权生产DB/Storage迁移、生产Gate启用或公开生产发布。M6/M7/M8继续分别承担全量合同、双课题和正式生产切换。

### 1.3 明确不做

- 不重新研究MHKA/KAD-02/D00—D05/L0—L5/G0—G5已完成的设计。
- 不重新制作独立知识平台，不另建同义Truth库、第二套Agent调度、第二套Gate。
- 不重做五图UI模拟，不重开UXD-01；保留既有F01—F05和Owner认可的UI目标。
- 不因工程方便而删除旧五阶段代码；清退必须有调用者、CI、数据库迁移、引用和回滚证据。
- 不执行未经单独授权的生产迁移、生产Storage创建/写入、正式Reviewer/Gate启用或公开生产发布。

## 2. 权威文件与记录分工

| 文件 | 唯一职责 |
|---|---|
| MHKA-00—05 | 新架构唯一上位设计权威 |
| MAB-ENG-01受控任务书 | 任务身份、总体范围、Owner裁决及不可突破的上位约束 |
| 本文件 PLAN.md | M0—M8唯一施工计划、顺序、任务和验收标准 |
| progress.md | 只记录实际施工、SHA、测试、环境、证据、HOLD、失败和回滚；不另立任务或改变标准 |
| target-diff.csv | 74目标/路径级差异与证据；不承担施工规划 |
| CURRENT.md | 只反映当前真实运行和施工快照，不保存过程日志 |
| ENGINEERING_HANDOFF_CURRENT.md | 只提供当前工具接续、环境限制和交接入口；不另立任务、顺序或验收标准 |
| tasks/results/MAB/ | 特定批次证据和历史报告，不构成新的权威任务书 |

ENGINEERING_HANDOFF_CURRENT.md只提供当前工程接续入口，不指定固定施工平台。工程执行主体始终为本轮Owner授权的唯一责任方；可执行动作依当前授权与环境能力分配，无法直接完成的本地/云端测试应登记准确阻断并受控交接。不得以工具切换另立施工计划或让两方同时写main。

工程辅助Skill的唯一方法源为 `.agents/skills/mohen-dev-continuation/SKILL.md`；其他工具适配文件仅为接口，不代表施工主体、权威或授权。Skill只辅助工程执行，不替代MHKA/MAB计划、不进入产品Registry、不赋予数据库、Gate、Provider或生产权限。

### 原HP01—HP13工作包追溯（保留原编号，不构成第二施工计划）

HP编号用于保持原工程责任和74目标审计的可追溯性；当前执行顺序、阶段准出和任务归属一律以本文件M0—M8及A/B线为准，不再按HP编号并行派工。

| HP | 归属阶段 | 工程责任 | 关闭边界 | 优先级 |
|---|---|---|---|---|
| HP01 | M1—M5/M6 | 核验最近源码主CI、M1隔离HTTP、M3撤权、类型与构建；修复真实失败，保存SHA和运行ID | 只有真实成功日志才记VERIFIED_ISOLATED；无Actions证据不得填PASS | P0 |
| HP02 | M1 | Owner/匿名/跨账户/禁用/登出/恢复自动化正反测试，防旧附件入口放行 | 生产Owner、旧凭据失效、备用账号和生产恢复由有权环境补验 | P0 |
| HP03 | M2 | 复用现有资产模型，核复合唯一、不可变revision、head CAS、links/use_events、delegation/receipt | 只补真实缺口，不建第二套资产正文；生产迁移仍受控 | P0 |
| HP04 | M2/M3 | 私有原件字节→source_version/read_unit/evidence/claim→唯一Runner/D00—D03授权适配与候选交接 | 禁止memory假原件、batch_level或首条材料冒充精确来源；正式Storage/Reviewer启用须授权 | P0 |
| HP05 | M2 | 隔离PG/Storage/签名/备份恢复/ACK失败/撤权/并发幂等正反测试 | 生产备份、桶、密钥和迁移由有权环境实施，不提前开放私有上传 | P0 |
| HP06 | M3 | 独立Reviewer服务、Signer身份/角色、签发与撤权、事件幂等和失败关闭 | 独立服务身份/密钥/部署须实测；旧Operator端点不得假借签名 | P0 |
| HP07 | M3/M5 | 当前qualification、purpose/consumer/scope/精确revision及P08撤权即时阻断 | 专业Gate不可由作品Reviewer批准或Producer伪造；缺映射对象/分面保持HOLD | P0 |
| HP08 | M4 | 同root任务DAG、不可变DelegationEnvelope/ExecutionReceipt、预算费用与跨会话恢复 | 不得静默费用记零或伪造Provider回执 | P1 |
| HP09 | M4 | T1—T7接包负例、最小合法传输、幂等/超时/撤委托/重试及权限前置失败关闭 | 真实Provider、原件外发、收费上限、凭据和资料权利须满足原授权 | P1 |
| HP10 | M5 | H1/H2/H3与Studio自然语言研究创作、导演、作品原本/分镜/局部修改及持久修订 | 不以关键词模拟Agent完成研究；真实体验由Owner后验 | P1 |
| HP11 | M5 | F05 Admin管理内部知识条目的来源、精确revision、证据、rights/purpose、use_events和缺口 | 保留原运营功能；条目不得假造，高权限操作另做身份验收 | P1 |
| HP12 | M3/M5 | 出版Operator/作品rev/独立知识G5/媒体许可；WATCH/Evidence/visual_stage/Agent逐请求资格和撤权 | 无合法精确G5映射则关闭相应发布或分面；作品Reviewer不替代G5 | P0 |
| HP13 | 全部 | 74目标逐项CREATE/REVISE/等价/延期双向语义核销；20责任/85API/152动作源→测试→证据清单 | 只在剩余本地/生产权限或完整体验验收条件明确后冻结唯一增量交接包 | 最终 |

过程性重复记录从PLAN移出，保留在progress.md及原结果报告中；PLAN只保留当前有效的任务、依赖、条件和验收。不得为了简短删除原M0—M8任务分母、固定条件、20项工程责任或74项目标登记。

## 3. M1—M4条件准出与固定条件

条件准出只表示明确范围的工程成果可供下游使用，不等于该阶段完整PASS。固定条件必须在对应动作发生前关闭；未关闭的条件只阻断其关联的生产、外发、签发、消费或恢复动作，不阻断不依赖它的隔离源码施工。已通过且未受影响的源码和测试直接继承。

### 3.1 M1｜安全底座

当前：M1_CONDITIONAL_EXIT，仅限代码与标记隔离环境。已验证的签名身份、短时DB身份、Owner事务/RLS、伪造/过期/禁用/登出旧Cookie拒绝及隔离迁移回滚直接继承。

M5实验前置必须在隔离环境完成：真实Owner登录→本人项目读写→匿名/跨Owner/禁用/过期拒绝→退出后旧会话拒绝→隔离备份恢复；验证Web与Worker实际数据库身份和最小权限。此项不等于M1生产条件PASS。

| 条件 | 关闭证据 | 最迟关闭点 |
|---|---|---|
| M1-C01 生产合法身份及最小权限 | 当前部署本人登录/导入/读取；匿名、跨人、禁用、过期拒绝；Web/Worker实际连接身份与权限非敏感证明 | M2任何新增生产业务写入或原件上传前 |
| M1-C02 生产会话撤销 | 正式迁移与开关经授权实施；复制Cookie退出重放拒绝；disabled→active旧会话不复活；DB故障失败关闭 | M2任何新增生产业务写入或原件上传前 |
| M1-C03 历史凭据失效 | 既有轮换/撤销回执，或有权环境旧连接失败、新连接成功的无秘密证据；不默认重置密码 | M2任何新增生产业务写入或原件上传前 |
| M1-C04 安全恢复 | 生产备份/恢复方案、迁移失败关闭、撤销摘要与失效边界保留；不恢复危险GRANT | 首次M2生产切换前，M8最终准出前必须关闭 |

### 3.2 M2｜原件、持久化与知识资产

当前：M2_CONDITIONAL_EXIT，仅已验证UTF8候选和现有长期资产最小持久层。已完成的私有Storage/PG/HTTPS、SHA、不可变revision、候选refs/digests、证据桥及同backup_id隔离恢复直接继承。

当前真实原件首选：国立公文书馆1663年《松江府志7》（item 4252790；正式source original为NAJDA-292-0017；IIIF Manifest 73页；原PDF约21.67MB）。馆方二次利用规则已核实允许复制、修改和再分发。卷次/页码映射仍须按原件canvas核定；Harvard-Yenching同版v.7只作卷次定位参考，不能把另一馆藏副本分页当作NAJ原件locator；NLC 1818版为不同版本，不得混用。M2单件对象10MiB限制内，只持久化本次研究所需页/页组，不上传整册PDF。当前派生页仍是临时文件，必须重新从官方来源取得并验证后入私有Storage。

| 条件 | 关闭证据 | 最迟关闭点 |
|---|---|---|
| M2-C01 生产原件/迁移/恢复 | Owner及有权运维批准正式私有桶、迁移、独立核验key、备份和正反验收；先关闭M1-C01—C04 | 任何新增生产原件写入/正式资产使用前；M8最终必须关闭 |
| M2-C02 非UTF8载体读取 | PDF/page/region等typed locator读取与原件返演；验证真实字节、权限、定位和恢复 | M3消费相应非文本候选前；最终必交范围不得在M8豁免 |
| M2-C03 授权复用服务 | asset_links/use_events真实授权写入、精确revision/project/rights、幂等和拒绝测试；需要资格时消费M3接口 | M4跨任务/跨项目复用或产品将事件当授权前；M8最终必须关闭 |

M5隔离实验必须形成真实来源→原件字节→私有Storage→SHA回读→L0→L1→L2的首次读取、同输入回放和撤权拒绝；并以PG+HTTP正反证据核验。只有ref/hash、临时sandbox文件或目录元数据均不算原件PASS。

### 3.3 M3｜D00—D05、Registry与独立Gate

当前：M3_CONDITIONAL_EXIT，仅代码/标记隔离环境的独立服务工程闭环。已验证的独立HTTPS协议、专用Signer/Reader隔离、Runner精确资格读取、撤权客户端及隔离PG/HTTP证据直接继承。

当前工程缺口：Registry仍关闭；六Stage绑定待核；63项方法均未完成唯一执行绑定；当前Registry仍指向旧layer1-adapters；新private-evidence-adapters未成为正式绑定；独立Reviewer真实鉴权与当前资格消费未完成。

施工要求：
- 以现有唯一Runner为执行入口，完成D00—D05六阶段与63方法的逐项唯一绑定；每项记录Stage、L输入/输出、Gate、Skill、Executor、Adapter、Tool、权限和版本。
- 每项要么有唯一可执行绑定及正反测试，要么明确HOLD；不得用TO_VERIFY_IN_M0作为永久状态。
- D00通用来源获取必须从来源意图/Provider/Work/Version/Holding/Digital Asset/获取尝试连到真实原件、SHA、权利和L0/G0；不得固定金泽样板。
- D01载体读取和D02材料理解使用精确原件、页/区域locator、read_unit、evidence和revision；原文、转引、模型解释和推断分层。
- D03/D04/D05按既有专业合同实现；事实G3与解释G4分支分离；P08独立触发，先阻断受影响消费者再复审；P01—P07按各自发布职责绑定。
- Producer只提交候选；独立Reviewer签发当前资格；Runner和Consumer必须核验精确source/revision/input/output/purpose/scope/consumer及撤权/有效期。Producer、Agent、Operator和共享高权限连接不得自签。

| 条件 | 关闭证据 | 最迟关闭点 |
|---|---|---|
| M3-C01 正式独立服务部署 | 经授权部署迁移、专用LOGIN/TLS/最小权限/独立Secret与可撤销凭据；真实服务合法/拒绝/提交失败验证 | 正式签发、撤权或依赖新服务的生产资格消费前 |
| M3-C02 真实Reviewer与资格 | 真实专业Reviewer及Owner核定策略/责任/范围/资料权利；真实原件逐阶段G0—G5审签、撤权和精确修订消费 | 对应真实阶段交接前；M7/M8最终准出前 |
| M3-C03 正式恢复与业务消费 | 备份恢复后保持OFF；重核当前用户、binding、策略和最新撤销；旧凭据/旧许可不复活 | 首次生产启用、M5公开消费及M8最终准出前 |

隔离环境的真实D/G实验资格与生产Reviewer/Gate启用是两件事。没有真实独立Reviewer时保持HOLD，不用Producer/Operator模拟审签。

### 3.4 M4｜混合Agent与受控Provider执行器

当前：M4_CONDITIONAL_EXIT，仅计划、候选收包、协调和恢复工程可继承。M4真实双主体仍MIXED_NOT_VERIFIED。

施工要求：
- 复用现有Agent、research/production入口、Delegation、Tool Registry、预算、Receipt和唯一Runner；不得新增平行调度器或第二账本。
- 同一root任务下明确内部Agent与外部Provider的互补子任务、输入/输出hash、Provider/model/version、allowed_actions、权利、purpose、期限和预算。
- Provider执行前逐来源核验外发权、purpose和最小输入；无权时TRANSFER_DENIED，禁止发送后补授权。
- 先用合成输入完成PG/HTTP正反测试；再在A线真实原件、Owner和M3隔离资格条件满足后进行真实调用。
- Receipt记录实际Provider/model/version、input manifest/hash、rights decision、token/用量、真实币种费用、输出hash、开始/结束时间、失败状态及成本可信度。
- 费用未知、请求超时或响应不确定时进入HOLD；不得自动重试可能已收费的调用，不得把未知费用补零，不得把内部credit当真实货币。

| 条件 | 关闭证据 | 最迟关闭点 |
|---|---|---|
| M4-C01 正式受控派工 | Owner批准运行配置、动态签名输入、Registry/最小LOGIN/独立身份；Owner→既有Tool→唯一Runner真实回执 | 任何正式新生产派工前 |
| M4-C02 真实混合/外发/预算 | 同root双主体互补事件；逐源合法最小外发；真实Provider/版本、价格、预算、费用与永久Receipt | 任何真实外部委托或收费调用前；M7/M8前 |
| M4-C03 正式恢复与费用核证 | 真实进程中断、未知响应/费用核销、Actor/权利/policy/依赖/lease重核；恢复不重复计费、不复活撤权 | 首个真实长流程/无人值守任务前；M8前 |
| M4-C04 Studio逐业务验收 | M5按ST-01—ST-09和13类资产字段/权限/精确WorkRevision逐项实测 | 对应M5业务启用、正式复用或公开消费前；M8不得遗留 |

### 3.5 M5｜Studio创作、Admin、发布与WATCH

M5按ST-01→ST-09顺序施工；不跳过依赖、不把任务入队显示为完成。按§0.2由本轮工程执行方在持久隔离集成环境完成真实业务总装，Owner过程检查点只核方向，正式体验仅在工程自验和原准出门全部满足后进行。ST-01已验证的Brief项目绑定、不可变修订和幂等回放直接继承，只补Agent资料可得性与问题收敛。ST-02真实原件L0—L2未完成前不启动依赖真实材料的ST-03；ST-04必须是Creator显式正式请求，不能由ST-01自动触发。

- H1/H2/H3与19组件必须绑定真实研究来源、导演、创作、修改和保存；同一作品母本，不复制第二正文。
- 创建/提交/修订保持既有wire兼容；CAS、幂等和存储失败不得误报成功。
- F05 Admin管理Studio真实产生的条目、精确revision、来源、证据、认识状态、权利、purpose、使用史、缺口和撤回。
- 发布必须核对Operator权限、精确WorkRevision、独立知识G5及媒资逐动作许可；发布指针采用事务或可验证补偿。
- WATCH、Evidence、visual_stage和Agent消费者逐请求核当前用途、consumer、rights、scope、revision和资格；消费者不得互借资格。
- 撤权立即阻断受影响消费并清理可控缓存；原件采用逐请求代理等可证方案，不能把短签URL称为即时失效。

验收：编辑→投稿→审核→发布→WATCH读取同一WorkRevision；并发/重复发布、部分失败、旧pointer、媒体撤权、错consumer、匿名访问私有原件均有拒绝证据。合法章节可局部保留，但不能绕过作品整体资格。

**Owner已批准的Provider调用范围：** M5必要低成本开发、隔离测试及受控真实研究使用现有已配置Provider已获授权；不再逐次申请同一范围。新增Provider/账号/密钥、订阅/额度/充值或明显扩大费用/批量调用须先说明并取得确认。该授权不替代来源权利、数据主体同意、Provider条款，也不授权生产迁移、正式Reviewer/Gate启用或公开生产发布。

#### B. M5八个维度的唯一验收矩阵

以下八项必须由**同一项真实作品**贯通；各项可分批施工，但最终不能用八个互不相关的演示拼成PASS。

| M5维度 | 对应既有合同/动作 | 当前状态 | 必须补齐的真实验收 |
|---|---|---|---|
| **1. 自然语言创作入口** | ST-01 CreateWorkBrief | Brief项目绑定、不可变修订、幂等/恢复已有隔离PASS；Agent资料可得性和问题收敛仍HOLD | Owner以自然语言提出真实问题；Agent读取项目授权资产、判断资料可得性、收敛问题并形成可追溯Brief/Plan；失败原因和继续条件可见 |
| **2. 内外AI混合协作** | M4 Delegation/ExecutionReceipt及M4受控Provider执行器 | 未完成真实Provider派发与双主体互补 | 同一root下Agent和外部AI分别产生可核验贡献；真实Provider、合法最小输入、实际成本、永久Receipt、失败/恢复均闭环 |
| **3. 真实来源、证据和D/L/G生产** | ST-02/03/04；D00—D05、L0—L5、G0—G5 | ST02真实字节未持久化；ST03/04未准出；正式独立资格未就绪 | 从原件来源到读取单元、证据、主张、人文解释及合法消费分面，所有阶段有精确source/version/locator/revision和独立Gate回执；原文、转引、模型解释、推断分层 |
| **4. 13类知识资产沉淀** | R4.3资产合同、M4-C04、Admin | 10类私有候选+3类规范对象有持久化/权限矩阵，不等于13类完整业务 | 13类各自的字段、创建/修订、状态、来源/权利、ACL、幂等/CAS、引用和失效规则均有真实业务正反验收；真实作品只沉淀研究实际产生的类型，不为凑数伪造资产；不适用类型须说明原因 |
| **5. Studio真实创作** | ST-05/06/07；H1/H2/H3与19组件合同 | 结构/时码/引用校验和部分交互已验；没有真实研究驱动的完整创作 | H1/H2/H3实际参与导演、叙事、镜头/材料组织；19组件按真实作品内容逐项验证；创作者可预览、局部修改、保存/恢复并形成不可变WorkRevision |
| **6. Admin知识资产管理** | F05 Admin；ST-07/08/09关联 | 条目、历史修订、部分use_events已有隔离能力；13类专业语义及全链来源仍不完整 | 对同一作品实际形成的知识条目逐条显示类型、内容、认识状态、精确来源/locator、D/G资格、权利/用途、版本、研究贡献、被何处复用及缺口；仅授权Owner可执行相应管理/撤回动作 |
| **7. 独立G5、媒资权利与发布** | ST-08/09；独立Reviewer/G5、canonical media rights、精确WorkRevision | G5桥接和部分ST08/ST09隔离证据存在；正式Reviewer未启用，canonical media-selection POST仍HOLD/503 | 独立Reviewer对精确WorkRevision及其知识/媒资依赖作当前资格审查；媒资逐动作权利明确；发布指针原子指向该修订；退回、通过、发布、撤回均有真实正反证据 |
| **8. WATCH同修订合法消费与撤权** | WATCH、Evidence、visual_stage及所有公开消费者 | 部分消费者PG/HTTP已验；当前约15秒周期重核不等于严格即时撤权 | WATCH只消费第7项发布的同一WorkRevision；每次新请求核当前G5、rights、purpose、consumer、scope和source；撤权后新请求立即拒绝、可控缓存失效、原件字节不经长期公开URL泄露；已交付字节的不可逆边界如实说明 |

**与原六项M5施工任务的关系**：原六项任务继续作为施工动作与源码责任分解，保留原编号和已完成证据；它们不是另一套最终准出标准。M5整体准出只按本节八维度矩阵核验，原六项任务必须映射到八维度，不得各自局部PASS后直接宣布M5完成。

**编号与验收口径**：R4.5《AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md》§6.2中的正式`ST-05`是`AssembleDirectorPlan`，与progress历史记录中曾简称为“ST05受控模型执行”的M4 Provider执行器不是同一对象。后续统一称后者为“M4受控Provider执行器”，不得混用编号。13类必须全部完成类型级业务合同与正反测试，但真实作品不强制生成不符合研究语义的资产；19组件必须逐项证明在真实作品内容中的职责、输入输出和交互，不以组件文件存在或静态截图代替。H1/H2/H3的专业判断按现有合同执行，不另造方法编号。

#### C. 按依赖顺序补缺，不再反复重开阶段

1. **冻结M0基线**：继承M0_AUDIT_EXIT_PASS和已有234/74/85/152差异证据；不重做盘点，只处理M5反推发现的具体差异。
2. **先关闭M1的M5隔离实验前置**：真实Owner会话、最小权限、项目ACL、撤权/旧会话拒绝和隔离恢复；生产C01—C04仍按原规则管理。
3. **再关闭M2的真实原件链**：沿已选NAJ《松江府志7》完成合法页定位、真实字节持久化、L0/L1/L2首次/回放/撤权。不得再次把来源搜索、容量核验或临时sandbox下载当作本阶段完成。
4. **接着关闭M3的真实D/G链**：让同一原件沿D00—D05运行，并在隔离环境完成独立Reviewer、G0—G5签发/撤权/当前资格消费。不得用Producer/Operator模拟Reviewer。
5. **再关闭M4真实混合协作**：既有执行器/账本代码可先用合成输入补齐；真实调用必须等M1—M3的材料、权利和资格前置完成，再以同一root完成Agent+外部AI互补、费用、Receipt和恢复。
6. **按ST-01→ST-09完成M5真实作品**：ST01已通过的Brief持久化/幂等子项直接继承，只补Agent资料可得性和问题收敛；随后ST02→ST03→ST04→ST05→ST06→ST07→ST08→ST09。Admin在知识资产产生时同步验收，WATCH在合法发布后验收。
7. **只做一次完整端到端验收**：上述关键链路的代码、接线、权限、真实输入和PG/HTTP正反证据齐备后，运行同一真实作品全链实验；Owner本人实际完成Studio创作、Admin条目核查和WATCH消费，逐项填写本节八维矩阵，全部通过并完成Owner体验签收才签M5。M6的85 API/152动作全量回归、M7双课题跨题复用、M8生产切换仍保持原边界。

**执行纪律**：
- 允许不互相依赖的代码施工并行（例如M4执行器先用合成输入开发）；真实数据调用和阶段验收仍按M1→M2→M3→M4依赖顺序，不得越过前置。
- 任何已通过且相关源码/合同未变化的测试直接继承；只重跑受变更影响的回归，不从M0反复重审。
- 每关闭一个缺口，必须在本PLAN对应任务/矩阵中更新状态，并在progress记录commit、环境、POS/NEG/AUTH、真实输入、回执和回滚；target-diff只更新对应路径证据。
- M5真实作品实验使用隔离环境，不要求提前执行生产迁移/公开发布；生产固定条件仍留在原责任节点，不得用M5隔离PASS销账。
- 当前M5仍为`M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`。本节只确立从M5反推的施工与验收路径，不把任何未完成项预先标PASS。

历史复盘材料仅供追溯：[M5/M0—M4阶段准出复盘](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/tasks/results/MAB/M5_M0_M4_GATE_RETROSPECTIVE_20261106.md)。它不是任务书、执行计划或验收标准；本文件本节才是本轮Owner裁决后的唯一执行依据。

## 4. 两条并行工程线与汇合顺序

### A线｜真实原件与M1/M2实验条件

1. 完成M1隔离Owner会话、本人项目读写、匿名/跨Owner/禁用/过期/登出拒绝、低权限Worker和隔离恢复。
2. 继续使用已核实的NAJ《松江府志7》原件，不重复已完成的来源搜索、权利、容量和Key调查；核定目标卷次对应的NAJ原件canvas/page locator。
3. 从官方来源重新取得本轮所需页/页组，确认字节、MIME、大小、页码/canvas、来源版本、权利和SHA；单对象不超过10MiB。
4. 写入隔离私有Storage和现有资产/原件仓储；服务器回读字节与SHA完全一致；不写生产Storage。
5. 完成L0→L1→L2首次读取、同输入回放、撤权拒绝；使用真实PG/HTTP正反测试和隔离备份恢复。

### B线｜M4受控Provider执行器

1. 复用现有Delegation/Tool Registry/预算/Receipt/Guard/唯一Runner，先完成代码接线。
2. 用合成输入完成PG/HTTP正反测试：授权允许/拒绝、预算不足、错误purpose、超时、重复请求、回执写入失败、未知费用、跨会话恢复。
3. 接入真实Provider派发和实际token/币种费用核销，但在A线真实来源、M1 Owner、M2权利/原件、M3独立资格前置完成前，真实材料外发与真实模型调用保持阻断。
4. 任何不确定费用或Receipt丢失进入HOLD，不自动重试、不补零。

### A/B汇合及M3—M5

1. M3：将真实原件接入D00—D05，完成63方法唯一绑定、候选元数据、独立Reviewer、G0—G5签发/撤权/当前资格消费及P08。
2. M4：完成同一root下Agent与外部AI真实互补、合法最小外发、实际费用、永久Receipt、T1—T7和跨会话恢复。
3. M5：ST-01→ST-09完成同一真实作品；Admin在知识资产产生时同步核验；WATCH在合法发布后核验。
4. 关键路径代码、接线、权限、真实输入和PG/HTTP正反齐备后，只进行一次同一真实作品全链验收；八维度全部通过并由Owner完成实际体验签收，才签M5。

## 5. M0—M8阶段施工与准出

### M0｜现场盘点与三方差分

状态：M0_AUDIT_EXIT_PASS。已完成分支/HEAD/部署/迁移/连接身份、234路径、74目标、20责任、85 API、152动作、63方法、19 Skill及数据库/权限/Storage/Gate审查。M0冻结继承；只有出现具体源码/目标冲突时，才对受影响条目定向更新，不重做全量盘点。

### M1｜安全底座与兼容迁移准备

完成安全身份、Owner事务、RLS/ACL、匿名/跨Owner/禁用/过期/登出、会话撤销、低权限Worker、备份/恢复和兼容迁移。按3.1关闭固定条件；不得默认重复轮换已经可能完成的数据库密码，先核既有失效回执。

### M2｜私有原件、九层映射与长期资产

完成L0—L8逻辑/物理责任映射；复用现有source/evidence/world/meaning/read_model/control真源；资产head/revision/links/use_events/delegation/receipt保持单一权威。完成私有原件字节、SHA、locator、版本、ACL、首次/回放/恢复；按3.2关闭固定条件。不得用memory://、公共照片目录或临时sandbox代替私有原件。

### M3｜原D链、Registry及独立Gate

按3.3完成唯一Runner、Registry、63方法、六Stage Skill/Executor/Adapter绑定、候选持久化、独立Reviewer、G0—G5当前资格和P08。所有未绑定方法明确HOLD，不得以文件存在或测试fixture视为执行通过。

### M4｜混合Agent与Studio长流程

按3.4完成受控Provider执行器、同root任务DAG、DelegationEnvelope、ExecutionReceipt、T1—T7、预算/真实费用、失败关闭和跨会话恢复。真实混合与合成测试分别签证，不把合成Provider或内部credit当真实双主体PASS。

### M5｜创作、Admin、发布与WATCH合法消费

按3.5和本文件八维度矩阵完成同一真实作品全链。未满足专业G5/媒资权利不得公开消费；M5隔离验收不等于生产启用。

- [x] 吸收②（附录D）：消费侧 7 路由目标（admin/acl、admin/publications、admin/users/[id]/status、explore entities/events/relations、watch/sessions）与 7 份 Skill 更新按交付包目标三方合并施工，禁止整文件覆盖；未完成不得关闭 M5。（2026-11-12 本地批完成，PENDING_PUSH：7 路由以包目标为骨架落地 KAD1 生成代语义——acl/users 收敛库内事务 `control.kad1_change_account`、publications 到期发布显式化、explore 详情 423 资格投影失败关闭、watch/sessions 会话隔离逐请求核发布指针；7 Skill 逐字节采用包版（HEAD==基线，含 D00 纳入调用阶段与独立 Gate 表述）。适配两处：UUID 正则硬化、`processDueSchedules` 无参调用。实证 typecheck 6/6、unit 650P/2S、guard:auth:strict 111 路由 0 缺口、structure/gate-enforcement PASS；PG/HTTP 实证与生产 kad1 迁移应用仍按原门禁 HOLD。回执见 progress.md 2026-11-12 批。）

### M6｜全量合同回归与延期能力闭环

依赖：M1—M5。

- [ ] 85 API逐ID确认合法、错误、鉴权、版本/并发、幂等与wire兼容；仅同名路由存在不能通过。
- [ ] 152动作逐ID核前端触发→handler→API/事件→持久化/授权→界面状态，覆盖62模块和五图归属。
- [ ] 63方法/19Skill、H1/H2/H3、19组件及专业验收条款分别映射测试或明确激活延期。
- [ ] 验证AT-01—16、X1 A01—A07、Gate合同26项及相关安全反例，不以方法/组件数量直接算运行通过。
- [ ] 对L6—L8及完整EXP形成设计冻结、实现、测试、启用四列账；实施范围内全部闭合，晚启用部分提交具名排期。
- [ ] 完整仓库类型检查、构建、既有回归、集成、E2E及设备体验检查；命令依M0实际脚本，不在本计划伪造项目命令。

- [ ] 吸收③（附录D）：7 份代际合同与 3 份 requirements 验收矩阵完成逐字段 diff 合并入库；7 份合同生效切换留待 M8 并需 Owner 具名授权；未完成不得关闭 M6。

验收：全部分母逐行有结果与证据；核心准出不允许未关闭P0/P1或关键链路NOT_RUN。延期项只能标延期，不计入完整运行验收通过。

### M7｜KAD5关联双课题真实验收

依赖：M6核心链路通过、合法原件、真实Provider权限/预算及Gate启用范围具备。

A：隋唐大运河及江南水路连接。B：宋代江南运河沿线的城镇与日常生活。不是采用KAD2早期上海苏州河备选题。

- [ ] A首次即双主体协作；至少一份合法可校验原件、一段可回放读取、一条材料观察，向有据主张及人文解释延伸；不足如实HOLD。
- [ ] A保存research_brief、source_anchor、reading_note、evidence_note及研究集合等真实asset@rev，并留永久委托回执。
- [ ] B开题合法检索A，精确复用至少一个稳定修订；源项目与目标项目分别鉴权。
- [ ] B新增来源、读取、关系或人文发现至少一类，保存证据与不确定性；重复摘要不能记增长。
- [ ] 通过创作、Admin条目、合法发布/观看、撤权及恢复，保存provider/版本/费用、DB迁移及G决定引用。

逐门保留KAD5原编号A1/A2/A3/A4/B1/B2/P1/G1/O1；其中G1是该验收表的“恢复安全”行名，不等同专业G1读取资格。真实研究无原件或资格时可交诚实失败报告，但不能签`KAD5_VERIFIED_LIVE`。

跨题复用记录至少含：`A_project_id,A_asset_id,A_revision_id,B_project_id,B_reuse_event_id,requested_action,rights_decision_ref,actual_source_locator,B_new_asset_revision_ref,knowledge_delta_type,qualification_state,work_revision_id,used_at`。

### M8｜生产授权启用、旧运行代际退役与交接

> **2026-11-05 Owner 纠偏**：六 MHKA 已是本轮全部工程施工的唯一设计权威，根 AGENTS 不得继续以旧 C0—C4 为默认入口。**M8 所等待的是正式生产激活、旧代际运行退役及交接，不是 MHKA 开始指导开发的时间。** 所有未准出项仍 HOLD，M0—M8 施工阶段不变。

依赖：M6/M7结果及具体投运范围审定；若仍有延期项，交接明确为核心范围阶段交付。

- [ ] 形成可审阅发布包：准确commit、构建/测试报告、Schema差分、备份ID、恢复实测、权限/策略清单、风险与回退触发条件。
- [ ] 对权威入口切换、真实DB/Storage变更、Gate启用、远端推送/合并及生产部署分别记录既有或新增授权范围。
- [ ] 核实已纠正的 AGENTS→MHKA 工程设计路由；C0—C4 **治理文档**已按 `governance/archive/C0_C4_TO_MHKA_ARCHIVAL_20261105.md` 在 M5 并行只读归档，不再把文档整理重复列为 M8 待办。**正式生产运行资格、旧运行代际与权限/数据/兼容路径的退役、剩余只读运行资料归档**仍由 M8 受控切换与回退，不双活。
- [ ] 先在隔离/预发验证兼容，再按窗口执行生产迁移、切换及部署；记录各步骤SHA、操作者和结果。
- [ ] 运行冒烟覆盖本人导入、跨用户拒绝、候选待G、合法发布/消费、撤权及恢复检查；新旧合法能力回归。
- [ ] 建立经授权的**Owner首用户私有入口**，公众仍不开放；真实浏览器从首页、登录、Studio、Admin、独立审核/发布、WATCH和已启用探索角色走完实际数据链，完成多角色POS/NEG/AUTH、可恢复与撤权验证。不得以管理员全权账户代替真实独立Reviewer，也不得以无数据演示代替内容可用。
- [ ] 满足§0.2 E“具备对外开放条件”的全角色体验、权限、性能/稳定性、原件和媒资权利、日志监测、备份恢复、回滚与发布门；未覆盖的角色/功能标HOLD，不得谎称全功能可开放。
- [ ] 更新CURRENT真实状态，工程执行方先完成工程自验及CP5报告，Owner再从各真实角色进行人文体验、业务和可开放级签收；未完成项逐项HOLD并给下一批计划。

回退：优先关闭新入口/新写入，按已演练的兼容方案回到仍合法版本；DB和对象需一致恢复，撤权审计必须保留并重放，不盲恢复旧公开权限。

## 6. 质量、测试与准出规则

### 6.1 证明层级不可混用

| 证明层 | 必需证据 | 不能推出 |
|---|---|---|
| 设计完整 | 合同、追溯、哈希、静态审查 | 代码或数据库已运行 |
| 代码就位 | 精确commit、构建、静态校验 | 真实RLS/Storage有效 |
| 隔离通过 | 真实PG/对象/服务正反测试 | 生产Gate已启用 |
| 线上验证 | 对应部署/环境/策略运行日志 | Owner已签体验 |
| 持久集成总装 | 同一运行实例的真实原件、D/G、Agent、资产、作品、UI、身份及失败/恢复证据 | M8私有首用户可开放级交付 |
| 首用户可开放级 | 经授权的私有入口、真实多角色全链、公开访问关闭、备份/监控/回滚、安全审查 | 未经Owner授权可向公众开放 |
| Owner签收 | 实际业务/人文体验确认 | 自动扩大资料外发或版权许可 |

### 6.2 每批必备回执

记录变更路径、before/after SHA、原要求ID、依赖、测试命令与环境、POS/NEG/AUTH、PG/HTTP、真实输入与来源权利、Provider/model/实际费用/Receipt（如适用）、HOLD、回滚及下游接收结果。未运行写NOT_RUN；失败保留原始记录，不用后续文档成功覆盖代码/HTTP失败。

### 6.3 高风险交叉测试

| 条件 | 必须行为 | 责任阶段 |
|---|---|---|
| anon/跨用户/同名项目/禁用账户 | 拒绝私有读取和写入，不泄露对象URL | M1/M2 |
| task删除、旧revision、并发CAS、重复请求 | 永久资产保留、revision不覆盖、收费步骤不重复 | M2/M4 |
| 原件只有ref、hash错、locator空、OCR错位 | 不假称已取得/识读，不提升事实资格 | M2/M3/M7 |
| Producer/Operator代签、旧PASS/错用途 | 独立签发边界生效，失败关闭 | M3/M5 |
| 外发无权、预算不足、Provider超时 | 不发送或停止，保存真实失败回执 | M4 |
| 发布部分失败、错作品rev、旧缓存 | 不报成功、不公开非法分面、合法旧版保留 | M5 |
| 撤权、恢复、签名URL | 阻断可控消费，验证撤销不复活 | M2/M5/M8 |
| 空库、服务不可用、无资料 | UI区分空、失败、待审核，不显示假DONE | M4/M5/M6 |

### 6.4 批次准出

代码和迁移与当批合同一致；必要POS/NEG/AUTH、构建和原功能回归通过；变更、恢复和回滚可重演；无未关闭P0/P1；剩余范围具名记录。关键真实用例NOT_RUN不得签运行PASS。条件准出必须注明范围、条件、责任、关闭证据、最迟完成点和被阻断动作。

## 7. 单main工程执行、质量复核与环境交接

### 唯一施工责任与代码写入
- 本轮Owner授权的工程执行方承担唯一写入与集成总责，不因使用的工具或平台名称变化而改变。所有代码变更仅写入GitHub `main`；禁止新增施工分支、PR并行开发、其他执行方未经移交直接改写同一main。任何交接都须明确起止SHA、未完成工作、实际权限与环境边界，接替方从最新main继续。
- 开工执行§0.2 B的远端HEAD/CI/环境核查；如涉及本地仓库，再安全对齐未推送成果，禁止以本地历史状态覆盖main。每个小批次按§6留精确SHA、合同ID、变更文件及POS/NEG/AUTH/回归回执，失败继续定向修复；不存在“提交即完成”的准出。

### CI与生产发布分离
- **在首次新业务代码提交前**核查现有自动生产部署配置，完成“main推送≠立即生产发布”的隔离并验证实际生效。若尚未隔离，只能进行已授权的文档修订、只读核查和不触生产的测试准备；任何会改变生产运行行为的提交均HOLD。无需新增代码分支；生产版本由既有授权流程选择精确已验收SHA独立部署、观测与回退。
- CI在main提交后运行，失败在原main提交修复，按受影响路径运行单测、独立Gate正反、隔离PG、真实HTTP/浏览器及Build；不能用仅解析Playwright列表冒充HTTP验收。质量门禁不能控制既有自动部署时，先处理发布耦合，不能把Vercel READY当作已验收成功。
- 质量复核可由当轮工程执行方实施并接受独立只读复核；复核不构成第二施工指挥主体，不得重开M0—M8或自行改专业合同。

### 具名环境阻断与受控接力
- 直接可达的GitHub、CI及隔离服务由本轮执行方负责；无法直接访问的用户本地目录、受限密钥、长驻进程、私有原件或特定网络，仅针对该具名能力生成最小移交任务及正反验收，执行结果回归同一main与progress证据账。环境未实测一律记NOT_RUN/DEFERRED_ENV，不以其他平台的口述结果代替。
- CP0—CP5（含CP4.1—4.4）继续作为阶段方向检查点，Owner只需核方向、授权及最终实际体验；不得要求Owner承担基本工程调试。生产DB/Storage迁移、正式Reviewer/Gate、Provider新增费用或公开部署继续依原规则单独授权。

## 8. 风险与处理

| 风险 | 影响 | 处理 |
|---|---|---|
| main变化或未提交成果 | 覆盖工作/引入回归 | 写入前重核远端HEAD和文件blob SHA；本地参与时保全独有成果并双向比对，只安全fast-forward；有分叉就HOLD对账，不建新分支、不强推/盲重置 |
| 实际DB身份与应用身份不一致 | RLS表面正确但可绕过 | 验证current_user/session_user及真实低权连接 |
| 原件指针与对象字节不一致 | 无法研究或恢复 | 服务器回读SHA；缺失对象隔离并HOLD |
| 独立Reviewer未就绪 | 无正式G链和合法消费 | 隔离实现可继续；正式资格保持HOLD |
| Provider权利/费用未知 | 违法外发或重复计费 | 逐来源授权、最小输入、真实费用、未知即HOLD |
| 长作业中断/回执丢失 | 重复执行/丢失成果 | 唯一幂等键、持久checkpoint、恢复重核权利与资格 |
| DB与对象恢复不一致 | 丢原件或复活旧许可 | 同backup_id恢复；撤权审计保留并重放 |
| 完整范围与延期激活混淆 | 把局部交付误报总完成 | 每项分别标记PASS/CONDITIONAL/HOLD/DEFERRED_ENV；M5/M6/M7/M8和首用户多角色验收分别签证 |
| AI长上下文丢失/方向漂移 | 重复施工、重开架构或丢失本地成果 | CP0—CP5关键停点+异常提前停点；先保存SHA和恢复摘要，再请Owner核方向后续作 |
| 测试通过但无真实可用入口 | 代码进展与实际产品体验脱节 | 持久非生产总装→M5全链→M6/M7→M8受控首用户运行；不得以临时CI、静态演示或预置PASS销账 |
| main自动生产部署与CI脱钩 | 红灯提交被自动发布为生产READY | 首次新业务代码提交前核实并完成自动部署隔离；发布必须指定已验收SHA并另获授权；未隔离不得推进业务代码施工 |
| 只用main导致提交后CI红灯 | 缺少PR预合并门，无法保证每个提交先绿 | 严格小批次/版本条件写入，先跑可执行检查，提交后立即复核CI；红灯在main修复，禁止放宽负例、强推或将失败当PASS |

## 9. 附录A｜20项补充工程责任及批次映射

下表直接提取字段级差异清单，责任与断言以原包CSV为准。它约束那些没有随74目标完整提供源码的既有路径，必须先取得当前源码再适配。

### A01｜`apps/web/lib/studio-research.ts`

- 建议批次：M2/M4；责任：MHKA-04/MHKA-03。
- 工程要求：将短期research_tasks.checkpoint与长期Studio修订/项目Owner分离，保留任务事件，新增有权搜索和Agent回执身份。
- 正验：保存同一project的asset@rev并可跨run恢复；无权限/预算或原件时HOLD；原研究功能不退化。
- 反验：删除task后长期修订不消失；跨Owner不得读取；重试不重复写。
- 恢复边界：关闭新资产写路由，保留旧合法任务及永久资产，绝不删除数据库行。

### A02｜`apps/web/lib/studio-production.ts`

- 建议批次：M3/M4；责任：MHKA-04/MHKA-05。
- 工程要求：正式D/G请求仍走原run.mjs和Registry，收到候选与资格拒绝按真实stage恢复；本服务不能冒名Gate。
- 正验：返回run/Stage/候选/G资格精确身份；未激活明确WAITING_GATE。
- 反验：不存在独立G而报道已合格，直接写world/meaning/gate审计。
- 恢复边界：停新Runner写入与发布，保留真实run回执。

### A03｜`apps/web/lib/studio/tool-ledger.ts`

- 建议批次：M2/M4；责任：MHKA-04/MHKA-03。
- 工程要求：现study_asset_receipts可继续做短期日志，长期Delegation/ExecutionReceipt独立追加保存；工具费用与重试关联。
- 正验：两主体回执真实可核，Cost unknown不补0。
- 反验：删除root任务带走长期唯一回执；重复工具计费。
- 恢复边界：保留历史账和新回执，不删除账本。

### A04｜`apps/web/lib/mohen-agent/research.ts`

- 建议批次：M4；责任：MHKA-04。
- 工程要求：依真实project旧资产检索→Plan DAG→批准委托→候选校验T1-T7→D/G请求；Agent必须有可观察动作。
- 正验：首次真实课题内生Agent与外部委托同root，职责互补。
- 反验：模拟回执/外部全包；无外发权仍调用供应商。
- 恢复边界：禁止外部委托，保留合法内部计划与候选。

### A05｜`apps/web/lib/mohen-agent/retrieve.ts`

- 建议批次：M4/M5；责任：MHKA-03/MHKA-05。
- 工程要求：保留现六类L5 agent资格搜索，另增项目内L0-L4/Studio候选合法检索的独立适配器。
- 正验：consumer/purpose/action/revision/current_g/rights每次生效。
- 反验：旧PASS/公众搜索绕过私有项目ACL。
- 恢复边界：关闭新检索端点，不降现有合法读权限。

### A06｜`apps/web/lib/read-model-bridge.ts`

- 建议批次：M5；责任：MHKA-03/MHKA-05。
- 工程要求：visual_stage目的和用途校验、媒体图片权利及撤权、动态G5，主题参数安全。
- 正验：同一ref已获visual_stage展示许可才返回。
- 反验：agent资格直接给visual_stage、旧静态JSON回退。
- 恢复边界：关闭不合规视觉分面，保留其他合法分面。

### A07｜`apps/web/lib/publication.ts`

- 建议批次：M5；责任：MHKA-05/MHKA-03。
- 工程要求：作品修订CAS/Reviewer/合法G5/媒体权限综合可见性；公开pointer与作品状态事务原子或补偿；出版回流仅D/G候选。
- 正验：同一作品rev的发布/撤回和WATCH读一致。
- 反验：只有published pointer即可公开、旧撤权缓存复活、作品审核代G。
- 恢复边界：禁不安全发布，旧合法指针保留并重核权利。

### A08｜`apps/web/lib/asset-reflow.ts`

- 建议批次：M3/M5；责任：MHKA-03。
- 工程要求：保留当前independent_gate_required失败关闭；仅在受控D/G候选申请+独立签发就绪后逐项回流。
- 正验：无资格时明确不回流，有资格后审计知识与作品分流。
- 反验：发布作品就直接回写read_model真值。
- 恢复边界：保持0回流的安全阻断，不自动删旧知识。

### A09｜`apps/web/app/studio/desk/page.tsx`

- 建议批次：M4/M5；责任：MHKA-02/MHKA-04。
- 工程要求：现Studio研究资料台接项目资产授权视图及真实agent子任务进度与可恢复草稿；不用新独立知识平台。
- 正验：首次对话能看见真实候选/缺口/进度，不假DONE。
- 反验：无Agent回执只显示已研究；私有原件被展示。
- 恢复边界：显示有界HOLD与合法工作区。

### A10｜`apps/web/app/admin/AdminWorkbench.tsx`

- 建议批次：M5；责任：MHKA-02/MHKA-05。
- 工程要求：在五图F05 Admin原运营平台内部接AdminAuthorizedItemViewV1/条目/来源/修订/使用历史/缺口；保持现有运营功能。
- 正验：能具体管理历史知识，所有跳转可回具体修订与来源。
- 反验：重新制造独立知识管理平台；以运营者身份签G。
- 恢复边界：关闭新知识面板，其他Admin业务可用。

### A11｜`apps/web/app/watch/WatchGallery.tsx`

- 建议批次：M5；责任：MHKA-02/MHKA-05。
- 工程要求：继续图文章节阅读同published WorkRevision@rev，消费时按现G5/媒体权利对逐分面校验。
- 正验：合法已发布文案可读、失效分面阻断。
- 反验：旧章节缓存/无资格媒体仍公开。
- 恢复边界：仅关闭受影响内容，保留合法章节。

### A12｜`packages/data-access/src/data-production-repository.mjs`

- 建议批次：M3；责任：MHKA-05/MHKA-03。
- 工程要求：main现recordGate写control.gate_candidates但数据库缺表；补表/DB角色及修订/用途检查，不恢复Producer签G。
- 正验：Producer只写候选/独立签发单身份且有有效证据。
- 反验：候选表不存在却报告成功；passed()任意旧PASS可公开。
- 恢复边界：暂停Gate候选新写入，保留旧历史审计。

### A13｜`packages/data-access/src/read-model-repository.mjs`

- 建议批次：M3/M5；责任：MHKA-05/MHKA-03。
- 工程要求：六类L5每次核现行G5用途、consumer、revision、依赖、有效期和操作权，P08精准阻断。
- 正验：合法分面返回来源完整链。
- 反验：跨消费者资格复用、失效缓存复活。
- 恢复边界：只阻断新受影响分面。

### A14｜`pipelines/data-production/run.mjs`

- 建议批次：M3；责任：MHKA-04/MHKA-05。
- 工程要求：保留六阶段唯一runner/Registry授权和D00-D05专业方法，接长期资产来源、原件校验及真实Gate候选申请。
- 正验：只按已激活Job+权限运行；Stage与G资格分别出回执。
- 反验：禁用Job仍被启动；单一模型替换D链。
- 恢复边界：停止新run，保留已有审计与合法中间成果。

### A15｜`apps/web/app/api/studio/materials/import/route.ts`

- 建议批次：M1/M2；责任：MHKA-05。
- 工程要求：适配public.imported_materials RLS/anon权限修复，核当前session/owner，安全上传必须有Storage权。
- 正验：合法本人可导入并查看状态。
- 反验：anon/跨账号可查询或写入其他用户素材。
- 恢复边界：先关闭对外写，修补兼容后灰度。

### A16｜`apps/web/app/api/works/[id]/publish/route.ts`

- 建议批次：M5；责任：MHKA-05。
- 工程要求：有运营角色且精确作品revision、G5/rights仍合法才能切发布指针，失败事务回退。
- 正验：合法发布结果与修订准确一致。
- 反验：编辑审核充当G5、部分发布成功被误报。
- 恢复边界：维持原合法版，拒非法新指针。

### A17｜`apps/web/app/api/public/works/[id]/eligibility/route.ts`

- 建议批次：M5；责任：MHKA-05。
- 工程要求：eligible不只判published pointer，动态验证知识/媒体权利与现行Gate及失效闭包，保持旧wire兼容。
- 正验：现行可公开且资格有效才能eligible。
- 反验：旧pointer存在但证据撤权仍返回true。
- 恢复边界：撤销公众返回权而非降低安全。

### A18｜`apps/web/app/api/public/evidence/[id]/route.ts`

- 建议批次：M5；责任：MHKA-05/MHKA-03。
- 工程要求：Evidence on Demand按当前合法资格展示精确source_version+typed locator，字段最小化。
- 正验：有效权限可返页图证据；无许可报告有界原因。
- 反验：返回source原件给无授权者、只有引用名未定位。
- 恢复边界：不暴露受限引用，保留合规缩略描述。

### A19｜`supabase/migrations/<ENGINEER_CLI_GENERATED_KAD4>.sql`

- 建议批次：M1/M2；责任：MHKA-05。
- 工程要求：只有授权工程按最新main/真实schema去重后生成KAD4迁移：12候选表上限+RLS/Storage物理状态/项目Owner/Gate候选。
- 正验：独立隔离迁移前后PK/FK/CAS/权限/审计/恢复均可重跑。
- 反验：盲执行KAD4非执行SQL、复制现有L/作品/Gate真源。
- 恢复边界：先只追加/兼容迁移、回滚关闭新能力不删数据。

### A20｜`tests/**`

- 建议批次：M6/M7；责任：MHKA-05。
- 工程要求：在既有单元/integration/E2E测试布局扩展KAD5的授权双主体、九层、13资产、SEC-P0、双题跨rev复用与回滚。
- 正验：正例、越权/错rev/无原件/旧PASS/撤权/保存恢复反例均实测。
- 反验：合成fixture替代真实运行；失败码只HTTP200但UI显示成功。
- 恢复边界：保留既有测试与过去有效数据，不撤掉失败关闭。

## 10. 附录B｜74份正式目标登记

此表为范围登记，不表示已实现。CREATE/REVISE是包内原始定性；正式施工需按最新HEAD及等价能力重判。每项后续均须链接真实变更或KEEP依据、测试与恢复证据。

| 序号 | 目标路径（相对真实仓库根目录） | 原动作 | 语义归属 |
|---:|---|---|---|
| 1 | `.github/workflows/ci.yml` | REVISE | MHKA-05 |
| 2 | `AGENTS.md` | REVISE | MHKA-00 |
| 3 | `OWNERSHIP_MAP.md` | REVISE | MHKA-05 |
| 4 | `apps/web/app/api/admin/acl/route.ts` | REVISE | MHKA-05 |
| 5 | `apps/web/app/api/admin/assets/[id]/invalidation-requests/route.ts` | REVISE | MHKA-05 |
| 6 | `apps/web/app/api/admin/publications/route.ts` | REVISE | MHKA-05 |
| 7 | `apps/web/app/api/admin/rights/invalidate/route.ts` | REVISE | MHKA-05 |
| 8 | `apps/web/app/api/admin/users/[id]/status/route.ts` | REVISE | MHKA-05 |
| 9 | `apps/web/app/api/explore/entities/[id]/route.ts` | REVISE | MHKA-05 |
| 10 | `apps/web/app/api/explore/events/[id]/route.ts` | REVISE | MHKA-05 |
| 11 | `apps/web/app/api/explore/relations/[id]/route.ts` | REVISE | MHKA-05 |
| 12 | `apps/web/app/api/governance/gates/revoke/route.ts` | REVISE | MHKA-05 |
| 13 | `apps/web/app/api/public/evidence/[id]/route.ts` | REVISE | MHKA-05 |
| 14 | `apps/web/app/api/studio/attachments/route.ts` | REVISE | MHKA-05 |
| 15 | `apps/web/app/api/studio/works/[id]/revisions/[rev]/panels/[panel]/route.ts` | CREATE | MHKA-05 |
| 16 | `apps/web/app/api/studio/works/[id]/revisions/[rev]/route.ts` | REVISE | MHKA-05 |
| 17 | `apps/web/app/api/studio/works/[id]/revisions/route.ts` | REVISE | MHKA-05 |
| 18 | `apps/web/app/api/watch/sessions/route.ts` | REVISE | MHKA-05 |
| 19 | `apps/web/lib/gate-review.ts` | REVISE | MHKA-05 |
| 20 | `apps/web/lib/gate-revoke.ts` | REVISE | MHKA-05 |
| 21 | `apps/web/lib/mohen-agent/retrieve.ts` | REVISE | MHKA-05 |
| 22 | `apps/web/lib/publication.ts` | REVISE | MHKA-05 |
| 23 | `apps/web/lib/read-model-bridge.ts` | REVISE | MHKA-05 |
| 24 | `apps/web/lib/studio-director.ts` | REVISE | MHKA-05 |
| 25 | `governance/mhka/MHKA-00_Governance_Charter.md` | CREATE | MHKA-00 |
| 26 | `governance/mhka/MHKA-01_Value_and_Strategy.md` | CREATE | MHKA-01 |
| 27 | `governance/mhka/MHKA-02_Humanistic_Product_and_Experience.md` | CREATE | MHKA-02 |
| 28 | `governance/mhka/MHKA-03_Knowledge_World_and_Data_Architecture.md` | CREATE | MHKA-03 |
| 29 | `governance/mhka/MHKA-04_Agent_and_Professional_Capabilities.md` | CREATE | MHKA-04 |
| 30 | `governance/mhka/MHKA-05_Software_Engineering_and_Operations.md` | CREATE | MHKA-05 |
| 31 | `skills/README_DATA_PRODUCTION_SKILLS.md` | REVISE | MHKA-04 |
| 32 | `skills/mohen-carrier-reading/SKILL.md` | REVISE | MHKA-04 |
| 33 | `skills/mohen-humanistic-discovery/SKILL.md` | REVISE | MHKA-04 |
| 34 | `skills/mohen-material-understanding/SKILL.md` | REVISE | MHKA-04 |
| 35 | `skills/mohen-read-model-publication/SKILL.md` | REVISE | MHKA-04 |
| 36 | `skills/mohen-source-intake/SKILL.md` | REVISE | MHKA-04 |
| 37 | `skills/mohen-world-construction/SKILL.md` | REVISE | MHKA-04 |
| 38 | `specs/AGENT_CONTRACT.md` | REVISE | MHKA-04 |
| 39 | `specs/API_TOOL_CONTRACT.md` | REVISE | MHKA-05 |
| 40 | `specs/DATA_CONTRACT.md` | REVISE | MHKA-03 |
| 41 | `specs/EXPERIENCE_CONTRACT.md` | REVISE | MHKA-02 |
| 42 | `specs/FOUNDATION.md` | REVISE | MHKA-05 |
| 43 | `specs/OPERATIONS_DEPLOYMENT.md` | REVISE | MHKA-05 |
| 44 | `specs/SECURITY_ACCESS_CONTRACT.md` | REVISE | MHKA-05 |
| 45 | `specs/SYSTEM_RUNTIME_ARCHITECTURE.md` | CREATE | MHKA-05 |
| 46 | `specs/data-production/MoHen_Data_Production_Protocol.md` | REVISE | MHKA-04 |
| 47 | `specs/data-production/PERSISTENCE_BINDING_CONTRACT.md` | REVISE | MHKA-05 |
| 48 | `specs/data-production/contracts/ENGINEERING_HANDOFF_CONTRACT.md` | REVISE | MHKA-05 |
| 49 | `specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md` | REVISE | MHKA-03 |
| 50 | `specs/data-production/method-binding-contract.json` | REVISE | MHKA-04 |
| 51 | `specs/data-production/production-registry.json` | REVISE | MHKA-04 |
| 52 | `specs/requirements/TRACEABILITY_INDEX.md` | REVISE | MHKA-05 |
| 53 | `specs/requirements/api-route-contracts.csv` | REVISE | MHKA-05 |
| 54 | `specs/requirements/u07-action-contracts.csv` | REVISE | MHKA-05 |
| 55 | `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` | CREATE | MHKA-03 |
| 56 | `specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` | CREATE | MHKA-04 |
| 57 | `specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md` | CREATE | MHKA-02 |
| 58 | `skills/mohen-acceptance/SKILL.md` | REVISE | MHKA-04 |
| 59 | `skills/mohen-project-guard/SKILL.md` | REVISE | MHKA-04 |
| 60 | `skills/mohen-vertical-slice/SKILL.md` | REVISE | MHKA-04 |
| 61 | `skills/mohen-historical-spatial-source/SKILL.md` | REVISE | MHKA-04 |
| 62 | `skills/mohen-historical-spatial-reconstruction/SKILL.md` | REVISE | MHKA-04 |
| 63 | `skills/mohen-visual-asset/SKILL.md` | REVISE | MHKA-04 |
| 64 | `skills/mohen-experience-prototype/SKILL.md` | REVISE | MHKA-04 |
| 65 | `apps/web/lib/kad1-policy.d.mts` | CREATE | MHKA-05 |
| 66 | `apps/web/lib/kad1-policy.mjs` | CREATE | MHKA-05 |
| 67 | `supabase/migrations/202611020900_kad1_watch_revision_isolation.sql` | CREATE | MHKA-05 |
| 68 | `supabase/migrations/202611020910_kad1_consumption_blocks.sql` | CREATE | MHKA-05 |
| 69 | `supabase/migrations/202611020920_kad1_account_transactions.sql` | CREATE | MHKA-05 |
| 70 | `supabase/rollback/202611020900_kad1_watch_revision_isolation.rollback.sql` | CREATE | MHKA-05 |
| 71 | `supabase/rollback/202611020910_kad1_consumption_blocks.rollback.sql` | CREATE | MHKA-05 |
| 72 | `supabase/rollback/202611020920_kad1_account_transactions.rollback.sql` | CREATE | MHKA-05 |
| 73 | `tests/unit/kad1-policy.test.mjs` | CREATE | MHKA-05 |
| 74 | `tests/unit/kad1-route.test.mjs` | CREATE | MHKA-05 |

## 11. 附录C｜来源与本轮交付检查

主要来源（路径均相对原ZIP）：

1. `00_README_交接指引.md`：阅读顺序、完整范围、三方差分、20责任及权限边界。
2. `manifest/MAB_完整设计基线_manifest.json`、`FILE_HASHES.sha256`：基线与文件身份。
3. `repo_target/AGENTS.md`、六MHKA及各唯一专业合同：权威、生效、专业语义与工程边界。
4. `manifest/MAB_74份正式工程目标_manifest.csv`、工程目标审查总索引、KAD6字段级差异CSV：目标范围与原位责任。
5. `acceptance/KAD6_全量工程目标_交付自检矩阵_现行.csv`及静态报告：234路径、设计证据和运行HOLD。
6. `repo_target/specs/requirements/`两份CSV及TRACEABILITY_INDEX：85API/152动作及兼容要求。
7. Knowledge §19、Persistence KAD6完整绑定、安全 §11、Agent能力KAD6与系统运行架构：长期身份/原件/权限/委托的关键增量。
8. `evidence_only/KAD5_关联双课题_知识生产存储与复用验证设计_V0.1.md`：A/B课题、原始验收编号及真实复用证据。

本轮完成：附件解包；92项哈希及74目标哈希核验；完整范围与批次计划编制；20项责任与74目标登记；UTF-8 Markdown实体文件生成与回读检查。

本轮未执行：最新远端/生产现场盘点、代码施工、PG/Storage迁移、真实模型委托、正式Gate签发、部署、双课题研究与Owner业务签收。本文各项未来检查框保持未勾选。

## 12. 附录D｜MAB完整设计交付包（20261102）受控吸收账

**包身份**：KAD6 十门静态终审签发的设计基线（`MAB_DESIGN_BASELINE_EXIT_PASS`），基线 `main@db21cef`（2026-11-01）。Owner 2026-11-12 指令：本地优先施工、推送批量延后（AGENTS.md §0A）；只提取有用文件，不覆盖已建成果。完整解读与核查方法见 `tasks/results/MAB_DELIVERY_PACKAGE_INTERPRETATION_20261112.md`。逐文件哈希比对已确认：包内 74 份 repo_target 路径全部已存在于仓库，无整文件缺失；缺口为 24 份 REVISE 目标（仓库停留在基线）与 19 份包外文档。

**吸收①｜归档（已完成 2026-11-12，本地批）**：19 份包外文档原样归档至 `tasks/implementation/MAB/inputs/mab-package-20261102/`（acceptance 3 + evidence_only 9 + manifest 6 + 交接指引 1）。归档时逐文件 SHA256 与包内原件比对 0 差异；完整性锚为随档 `manifest/FILE_HASHES.sha256`。身份：只读设计证据，不进权威路由正文，不构成第二套现行合同。

**吸收②｜挂 M5**：24 份未推送目标中的消费侧部分——7 份 route.ts（admin/acl、admin/publications、admin/users/[id]/status、explore entities/events/relations、watch/sessions）+ 7 份 SKILL.md（mohen-acceptance、mohen-experience-prototype、mohen-historical-spatial-reconstruction、mohen-historical-spatial-source、mohen-project-guard、mohen-vertical-slice、mohen-visual-asset）。施工方式：包目标 × 当前 HEAD 三方合并，禁止整文件覆盖；7 份 Skill 须与仓库 11-06 六阶段对齐结果合并。见 §5 M5 checklist。

**吸收③｜挂 M6**：7 份代际合同（AGENT/API_TOOL/DATA/EXPERIENCE/FOUNDATION/OPERATIONS_DEPLOYMENT/SECURITY_ACCESS）+ 3 份 requirements（api-route-contracts.csv 85 API 全字段、u07-action-contracts.csv 152 动作全字段、TRACEABILITY_INDEX）。入库方式为逐字段 diff 合并（保留仓库行、以包版补全字段）；**7 份合同的"生效切换"属 M8 并需 Owner 具名授权**（AGENT_CONTRACT 包内原文要求 AGENTS.md 同步切换），M6 前仅作施工依据参照。见 §6 M6 checklist。

**禁止回写清单（护栏，任何批次不得违反）**：以下内容仓库版本已领先，交付包对应文件一律不得覆盖——①六 MHKA（仓库 11-05 Owner 批准版）；②`specs/data-production/` 全部五件（Protocol、Registry、Binding、Gate 合同、Handoff 合同，含 D00-A/B/C 施工增量与隔离链路激活状态，照抄包版会关停现役链路，参见 2026-11-09 D00 交付审计的"危险漂移"预警）；③G0-G5 合同与 Persistence 合同（仓库 11-06 定稿）；④AGENTS.md、OWNERSHIP_MAP.md、ci.yml、skills README 及 5 份已对齐 skill；⑤apps/web/lib 全部演进代码。与包字节一致、无需动作：KNOWLEDGE_ASSET、AGENT_PROFESSIONAL、SYSTEM_RUNTIME、H1_H2_H3、kad1 三迁移+三回滚。

**差异账说明**：24 份未推送目标已在 target-diff.csv 按 MAB234 账逐行登记（状态 BASE_UNCHANGED），本附录不重复登记；本吸收批未改变任何目标语义，target-diff.csv 无需增行。

**推送状态：`PENDING_PUSH`**——本附录及吸收①归档、AGENTS.md §0A 目前仅在本地提交，待 Owner 确认窗口一次性推送 GitHub；推送完成后在此销项并记 `PUSHED`。

**汇报纪律（Owner 2026-11-12 指令）**：自本账生效起，后续每批施工的汇报与 progress.md 回执必须注明：本批实际引用了哪些交付包归档/吸收文件（归档根：`tasks/implementation/MAB/inputs/mab-package-20261102/`）及其发挥的具体作用；某批确无引用时如实写明"本批未引用交付包文件"，不得虚构引用。
