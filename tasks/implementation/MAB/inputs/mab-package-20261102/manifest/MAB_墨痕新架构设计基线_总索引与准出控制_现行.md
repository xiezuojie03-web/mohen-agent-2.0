# 墨痕｜MAB 新架构设计基线——总索引、真实工程差分与准出控制（现行）

**版本：** MAB-DESIGN-2026-11-02-D（KAD6全量静态设计准出，未工程激活）  
**唯一身份：** MoHen Architecture Baseline（MAB）；六份 MHKA 是架构权威，MAB 不是第七份 MHKA。  
**状态：** `MAB_DESIGN_BASELINE_EXIT_PASS / KAD6_DESIGN_BIDIRECTIONAL_STATIC_PASS / ENGINEERING_IMPLEMENTATION_HOLD / KAD5_REAL_RUN_HOLD / KAD3_UI_DEFERRED`。**设计目标已经定稿并可交给Owner备存；工程写入、部署与真实验证仍须独立授权。**  
**Owner最新目标（2026-11-02）：** 一次完成墨痕所有受控设计研究，汇总唯一工程目标；先对完整候选交付包做全量正反自检，P0/P1设计矛盾闭环并签发，之后一次性交给Codex工程线；工程自行处理不改义的适配，KAD5真实双课题测试进入工程验收，不提前做最小试验。  
**存放：** `/墨痕/产品知识体系与工程治理重建_专项/04_工程规范与Codex接入/00_总览/`  
**执行任务书：** `06_知识资产生产与Admin管理深化_受控子任务/KAD-02_墨痕能力体系继承补缺与知识生产深化_专项任务书_V0.4.md`。它仍是本轮 KAD0—6 的唯一专项任务书；原上位 `00_MOHEN-KNOWLEDGE-01_专项任务书_V0.4.md` 不被替代。

## 1. 新基线的身份边界

- **章程层**：MHKA-00 治理／MHKA-01 价值与战略／MHKA-02 人文、产品与体验／MHKA-03 知识世界与数据／MHKA-04 Agent与专业能力／MHKA-05 软件工程与运行。六份原一级章节结构和唯一Owner必须稳定，不新立并行架构权威。
- **专业方法层**：继续使用 KAD1-A（D00—D05及63方法）、KAD1-B（G0—G5）、KAD1-C（H1/H2/H3及I）、KAD1-D（R4/CAP与调度）、R4.3知识资产新版合同。历史九阶段和KAD0继承账负责溯源，旧文件不能成为新代执行合同的隐藏依赖。
- **工程合同层**：唯一当前工程文件、schema/DDL、API/Tool、Registry/Skill/Loader、UI动作、权限、安全、持久化与回滚。K3既有57字段、85 API、152动作、104路径仅作已批准设计来源；必须以真实最新HEAD补差，禁止直接覆盖Codex的新工程。
- **交接层**：下游实施工具只读 `MAB入口→MHKA六章→受权专业合同→目标文件manifest→正反测试→状态/恢复`，无需再次选择价值理念、研发主线或资源语义。Manifest与可执行工程指令不能以“参考旧研究”代替。
- **证据层**：`DESIGN_ONLY / CODE_PRESENT / VERIFIED_ISOLATED / VERIFIED_LIVE / OWNER_ACCEPTED / HOLD`单独记录；设计准出、Git提交、数据库迁移、真实G资格投运、部署和Owner体验签收不是同一种PASS。

## 2. 2026-11-01 真实工程固定观察（只读）

| 对象 | 可核对基线 | 不得推断 |
|---|---|---|
| GitHub默认分支 | `a001/production@759dbbd0c206c4acfe2ebdc3e94aa556528b330c` | 不等于当前线上部署 |
| 最新开发源码 | `main@db21cefcc09c6bcb5d7e3fca16d100cc0accd13d` | 不等于已部署或全面合格 |
| 工程备份分支 | `codex/k3-migration-20261101@65b26cd81eaec2e99368572775f44ac5e26201b4` | 不应直接合并或丢弃 |
| 仓库记录的正式线上版本 | `main@1fa6d9f52115377987ddb4f10e4639f603eb8ece`，见`CURRENT.md`；Git对比显示最新main在其上仅多一个提交 | Vercel团队接口返回403，尚未在本轮独立重验线上部署 |
| K3设计清单 | 104个目标：8 KEEP／83 REVISE／13 CREATE；`final_frozen=NO` | 设计范围冻结≠工程最终文件冻结 |
| 与main比对 | 104项中96个目标路径已在main出现、8项不存在；main相对默认分支共有133个文件变更 | 文件出现≠设计目标实现或运行验收通过 |
| 原清单外变更 | 在旧104项清单与64项职责表之外另有79个main相对默认分支变更文件 | 旧104项不能直接作为新交付manifest |
| 综合受检文件路径 | 旧104＋64＋133条比较的去重联合路径为**214项**，含历史保留、源码、迁移、文档及测试 | 214是差异与职责核查全集，**不是214项必改项** |
| 现行权威入口 | `AGENTS.md`仍路由旧C0—C4；`governance/mhka/MHKA-00—05`六份目标仍不存在 | K2/KAD1静态准出≠工程完成权威原子切换 |

**原104项未在main出现的8项**：六份`governance/mhka/MHKA-00—05_*.md`；`apps/web/app/api/studio/works/[id]/revisions/[rev]/panels/[panel]/route.ts`；以及`supabase/migrations/<CLI-GENERATED-K3-MIGRATION>.sql`占位符。后者不应按字面创建尖括号文件，应与main已有三项K3迁移及真实数据库状态核查后去占位化。六份MHKA缺席不能用六份旧C章程仍存在而误判已启用。

**文件资产使用限制（2026-11-02已执行一次清理）**：原`repo_target`的26份K3设计候选与main同名Blob均不一致。20份非本次正式规范已按原相对路径移入90历史目录（非迁移），其余6份旧候选已按KAD1新规范重塑并替换；2026-11-02 KAD1-E扩大定向施工并完成双向审查后，当前repo_target精确为74份正式工程设计目标（21 CREATE、53 REVISE）；不改动KEEP仅在索引保留。上述旧18份为历史阶段镜像规模，不再作为现行文件集合。当前设计依据仍为历史main SHA；真实施工前必须重新计算最新HEAD三方差分。历史K3候选都不得直接复制覆盖main。

## 3. 必须保留的完整产品和知识链

### 3.1 价值与认知

价值：帮助人发现历史文化与今天的生活之间的连接，兼顾**乐趣**与**意义**。时间×空间×关系×比较是理解历史的方法；GIS、地图、时间轴、图像、典籍、考古与Agent是可替换实现媒介。通史骨架＋局部深挖＋可复用知识资产是近期组织方法，不是永久限制研究范围；初中历史主要知识点是近期内容索引，而非应试产品。

### 3.2 D/L/G 不可替代生产主链

`D00→L0/G0来源准备；D01→L1/G1 C01—08载体读取；D02→L2/G2 H01—25材料理解；D03→L3/G3 W01—10历史世界；D04→L4/G4 A01—12人文发现；D05→L5/G5 P01—08可信发布`。六阶段共有63项专业方法，历史资料、原件、证据、事实主张、人文解释、出版资格各有身份与不可越界写入责任。Stage候选与独立Gate最终签发分离；Studio项目内研究候选可以按授权保存，不得伪装成可公众消费的G5资格。

### 3.3 能力、知识资产与人文消费

- **MoHen Agent与外部AI**：从第一项真实研究即混合委托。Agent须承担已有资产查找、任务拆分、选择内部Stage/Skill/专业Tool或外部AI、候选接收和下一步推荐；外部AI不获正式G签发或无限数据库写权。
- **知识资产**：13类研究/知识/编导/作品资产必须在R4.3本代合同下带稳定身份、修订、原件locator、用途权利、来源依赖、资格/版本与状态；`save`、`research-reuse`、`qualified-G`、`editorial-publish`、`rights-for-action`不能合成一个approved布尔值。
- **Studio**：自然语言创作和研究主工作面，受托研究→候选回收→有据理解→H1/H2/H3编导→实时作品、保存/局部修改/跨刷新恢复→投稿。知识资产和作品是两种不同产品。
- **Admin**：面向Owner的人文知识管理平台，应能逐条观察史料、人物、地点、关系、发现、证据、权利、缺口、复用历史，而不只展示统计卡与日志。
- **WATCH**：消费与Studio同一个已合法发布的WorkRevision；遇无资格、权利撤回、失效依赖时阻断受影响分面。**EXP**和完整双组件探索灵魂保留长期约束，UXD-01暂停但未废止；不得暗中重开全面UI设计。
- **人文交互**：H1五母题、H2七导演判断、H3协同节拍、I19能力组件、F01—F05视觉目标、62模块、152动作、85候选API既不相互等同，也不能因某文件改名而失效。

## 4. 源码审查发现的高优先设计／工程落差（尚未视作全部风险）

| ID | main当前具体事实 | MAB目标与责任 | 验收/阻断 |
|---|---|---|---|
| MAB-P0-01 | `AGENTS.md`仍将C0—C4视作Authority入口，六份MHKA还未写入目标repo | MHKA-00/05归属；原子更换路由、合同代际、旧C留档和恢复入口 | 旧新权威不得双活；无工程授权保持HOLD |
| MAB-P0-02 | `packages/data-access/src/gate-authority-repository.mjs`、三项K3数据库迁移及资格函数已在main；非空Reviewer/策略激活尚不能从有文件证明 | 保留既有分权实现，逐项核真实DB角色、策略版本、签发身份、回滚与历史711行 | 隔离与真实环境分别测：Producer不可自签；旧资格撤销不复活；实际G状态不得凭代码判PASS |
| MAB-P0-03 | `apps/web/lib/publication.ts::checkPublishEligibility`当前静态检查provenanceRefs数量、作品Reviewer签核、媒体申报；尚未观察其实际逐条查询当前独立G5/用途/权限 | MHKA-03/05修订作品资格对接；保留运营审与G签发独立 | 旧G/撤权/过期证据必须精确阻断；已有引用字符串不能替代资格判定；对线上作品兼容设计 |
| MAB-P0-04 | `apps/web/lib/asset-reflow.ts`目前明确返回`reflowed:0`和`independent_gate_required`；`publication.ts`仍捕获回流失败并不阻断发布 | 作品回流为受控候选任务，经D05/独立G后才可升为合格知识，或以明确失败回执待办；不得直接写read_model | 发布作品不自动产生正式知识；Admin能看到待回流、失败和审核状态 |
| MAB-P0-05 | `publication.ts::getWorkStageStatus()`当前将`delegated/researched/directed`直接固定`true` | Studio进度必须由实际研究任务、方案和版本行/回执派生，不伪称Agent已完成 | 无研究数据时不可显示已研究；恢复、重放、错误、跨用户隔离正反测试 |
| MAB-P0-06 | `publication.ts::publishWork()`先更新修订status再另行写published_pointer，两步在该TS层并非单一显式事务；`listPublished()`按指针读取，但未见消费时按每分面实时权利过滤 | 保留兼容的已发布数据；设计CAS+事务/补偿、精准撤权消费者投影 | 指针写入失败不得留下错误公开状态；已撤权媒体不因缓存/旧稿复现 |
| MAB-P0-07 | `pipeline...layer1-adapters.mjs`顶部仍含早期“adapter完成gate审核”历史注释，但现`data-production-repository.mjs::recordGate`实际插入候选表；`run.mjs`已接执行授权/持久化 | 区分旧注释、真实调用链和新生效约束，核 `run_id` 幂等、子任务恢复、G资格投影，不按注释判事实 | 逐Stage反例、DB权限、报告与恢复校验；不破坏已验证六Stage |
| MAB-P1-08 | `skills/mohen-source-intake/SKILL.md`仍自述旧D01来源摄取，但现行D00与`mohen-carrier-reading`承担不同职责 | Skill Manifest明确ACTIVE与ARCHIVED身份、旧名到新D00映射、Registry真实调用关系 | 不允许因旧名误启动第二条D01或抹除正式D00 |
| MAB-P1-09 | `specs/data-production/method-binding-contract.json`存在63个方法绑定和真实规范路径；新合同含D/L/G业务体系 | 静态绑定不是“63个方法均有运行Executor”证据；需要按方法关联Skill、Adapter与实际验证 | `DESIGN_ONLY`/`CODE_PRESENT`/`ISOLATED`逐项独立归属，不虚报能力可用 |
| MAB-P1-10 | `apps/web/app/api/governance/gates/decisions/route.ts`实现的是作品Reviewer签核记录，而main另有独立G签发仓储；两个能力处于不同上下文 | API命名/分权/正反测试不应把作品出版审核当成`control.sign_gate_candidate`资格签发 | Operator/作者/Agent不能因有出版签核直接写G；角色兼任也须显式隔离审计 |

上表是已读取源码的**高价值定向差异**，不是对整个仓库/数据库的完整安全审计，不能据此宣告某条漏洞在线上可利用。具体实施必须由工程工具重新检查最新文件及其调用链。

## 5. 跨工具可执行交接协议（必需字段）

每一项未来工程变更记录至少具有：

`change_id, requirement_id, authority_owner, normative_clause, history_sources[], repo_relative_path, file_role, current_branch, current_commit_sha, original_blob_sha, source_observation, action(KEEP/REVISE/CREATE/ARCHIVE/HOLD), precise_target_or_replacement_file, dependency_ids[], target_schema_or_interface, positive_assertion[], negative_assertion[], security_test[], data_migration_policy, rollback, execution_status, code_sha_after, environment, reviewer, gate_evidence`。

工具启动协议：

1. **重新锁定环境**：读取远端`main`、默认分支、部署实际SHA、数据库当前迁移与角色；旧清单只是证据，不是文件覆盖命令。不同SHA时先做三方合并差分，禁止强推。
2. **加载权威顺序**：六MHKA设计章程→专业合同→本代接口/设计目标→Repo当前代码及运行事实；语义冲突向唯一MHKA Owner定向退回。现行未切换时不伪称MHKA已经在Repo active。
3. **按依赖施工**：先安全/资格/身份/数据库和现存兼容，再Agent/资产持久化、Studio/Admin/WATCH、生产专业D00—D02补强。先写测试再最小修复；源用户资料先备份，任何真正DDL/部署都须明确授权。
4. **为每项提交回执**：`input_sha→changed_paths→new_sha→commands→environment→tests PASS/FAIL/SKIP/HOLD→migration/backups→observed_behavior→unresolved`。如果缺少权限/CA/费用/服务，只报阻断，不用假成功。
5. **反向更新设计**：工程验证结果和新增需求按唯一Owner修正本代合同/manifest；不要求工具创建第二份宪章、并行生产协议或另一个Gem/Agent平台。

## 6. MAB-A—H全范围责任与KAD6最新裁决（设计/运行分开）

| 工作包 | KAD6设计审查现行结论 | 工程验收状态 |
|---|---|---|
| MAB-A 历史继承 | KAD0九历史阶段继承与KAD1六章/专业合同，74目标/234责任行双向静态核对完成 | 非运行问题，设计PASS |
| MAB-B 六章与专业合同 | 六MHKA、D/G、H/I、CAP、13资产、双主体与九层归单一Owner；KAD2—5核心条款定向融合 | Repo写入未授权 |
| MAB-C 全路径与增量 | GitHub树212路径Blob匹配；21新增＋1占位符；74目标20修改/54继承及20项额外源码差异指令均有SHA/验收责任 | 工程三方差分待运行 |
| MAB-D 数据与Gate | 九层主实体、原件存储、独立Gate候选/Review、项目修订、权限和恢复都有字段级设计与反例 | SEC-P0/DB/Storage/Gate实际验证HOLD |
| MAB-E API/Action/Skill | 85 API／152动作／63方法与六Job的原身份和机器格式不损坏；源码字段修订交20条精确责任 | 真实Handler/调用/E2E测试HOLD |
| MAB-F 用户价值闭环 | Studio→Admin内部知识→WATCH与KAD5两题逐revision复用及有据增长完整验收设计 | KAD5真实双题HOLD |
| MAB-G 可移植执行 | 单一MAB包含74个原路径目标、逐路径manifest、正反矩阵、20精确源码差异和回滚 | Codex工程实施未授权 |
| MAB-H 激活与持续治理 | 新旧权威原子切换、三方差分、状态/Hash/审计/回滚/自主管理已设合同 | GitHub、DB、Vercel及真实授权HOLD |

**准出规则：** A—H的设计合同、责任、正反反例、失败恢复和可移植交付达到KAD6静态准出门，即`MAB_DESIGN_BASELINE_EXIT_PASS`；真实工程验收独立，不因设计通过自动授权实施。

## 7. 历史设计阶段推进记录（以§10最新完整设计优先裁决为准）

1. **基线协调层**：固定本索引及最新Git SHA，建立214条联合受检目录和全量工程差分责任单；查明原`repo_target/`草案哪些被Codex更新覆盖。**本条过去禁止的是未经设计自检的提前出包；完整设计集成并通过KAD6后应制作正式ZIP。**
2. **KAD1-E终审前置**：KAD1-E对74份目标已完成设计审查并签`KAD1_DESIGN_CONTENT_EXIT_PASS`，准入KAD2设计。**KAD2产品能力深化**：先形成内外AI同题委托契约、Studio流程及失败恢复；以现有KAD1规则为输入，不重新做专业理论。
3. **KAD3管理/消费**：形成Admin资产具体页面与轻量WATCH的业务状态及字段契约，保留UXD-01长期成果但不重启视觉创新。
4. **KAD4物理实现目标**：基于现行main三项K3迁移与既有6Stage/Registry，给出DDL/RLS/Gate/研究资产持久化/Tool连接的完整目标内容或精确增量；不猜生产库已应用。
5. **KAD5真实验证合同**：两题连贯研究、资产版本复用、D/G权限、媒体和引用撤权、跨用户负例、保存恢复、两AI交接回执。
6. **KAD6全域终审**：更新全部目标文件清单、逐项冲突裁决、基线SHA与可重复测试；只有达到设计准出条件才发布可移植工程交接版本并请Owner审批迁移授权。

## 8. 严格未解决项及证据位置

- K3设计文件与最新main有时代差：尤其main新增的Gate权威SQL、生产身份、测试与Studio JSONB兼容应当继承；**不可按旧Library草案覆盖**。
- Vercel连接本轮因403无法独立核生产SHA；仓库CURRENT关于线上READY/HTTP200属于**工程状态记录**，不是本轮重测。
- `supabase/migrations/*.sql`仅能证明代码存在；真实云端是否应用、签发者策略是否激活、未授权用户访问与持久修订依赖需有环境级证据。历史隔离测试记录可引用，但本轮未重新运行。
- 公开作品审核的`work_publication_decisions`与历史事实`control.gate_audits`是两类合法性，不允许合并为同一Reviewer PASS。
- **设计级问题已在KAD6完成集成并形成最终设计交付ZIP**；C—H的真实工程实现与验证仍HOLD，不能把完成设计推断为生产可用。

**最后更新：** 2026-11-02（KAD6完整设计静态终审已签发；工程HOLD）。后续只在原位更新这一索引及其受权目标文件，不再堆积多份“现行基线”。

## 9. KAD1-E完整镜像设计终审（2026-11-02）

六份MHKA＋自足专业合同及全路径规范/机器/代码目标共74份（21 CREATE/53 REVISE）已按`repo_target/`逐文件设计审阅，原154项KEEP不混入。最新处置索引234条；每份目标新的SHA256/Git blob、正向设计责任和反向拒绝/失败条件已回写现行CSV。发现并修订18份目标（生产章程/合同路由、账户Operator与Reviewer、出版资格/待审修订、读模型隔离、CodeBuddy旧指令、机器方法Hash和测试等），新增本轮19项纯策略与静态正反测试通过。

**KAD1当时的阶段裁决（历史快照，现行MAB以§11为准）**：`KAD1_DESIGN_CONTENT_EXIT_PASS`（规范及工程镜像设计全文和正反合同准出，允许进入KAD2设计）。历史`KAD1_BIDIRECTIONAL_CONTENT_REVIEW_HOLD`状态撤回；它原本是针对74份尚未逐项审阅的状态。**注意**：这不签发GitHub写入、线上DB迁移、真实独立Gate投运或MAB整体基线；`MAB_INTEGRATION_IN_PROGRESS / DESIGN_RELEASE_HOLD`在KAD1阶段继续有效，**现已由§11的KAD6设计PASS取代**。真实main HEAD变化、完整应用类型检查、DB/RLS/SEC-01、KAD2—5的用户与生产实证继续各自HOLD。

唯一KAD1详细证据为本目录`KAD1_工程镜像强制准出审查_现行.md`、`KAD1_工程镜像静态核查结果_现行.json`、74行交付清单与234行MAB工程目标索引。不得将旧18份文件说明或K3旧ZIP作为现行迁移输入。

## 10. 2026-11-02 Owner新裁决｜完整设计优先、整体自检、一次工程交接（优先于旧阶段次序）

- **先设计后工程**：保持KAD0—KAD6原编号。KAD5在设计阶段冻结完整双课题测试和知识增长验收方案，实际两题运行由工程在完整交接后执行；不得以真实LIVE证据阻断KAD6设计终审。目标是完整MAB设计基线，而非只交一个最小可运行实验。
- **集成范围**：现行KAD1 `74`份工程镜像（`21 CREATE / 53 REVISE`）与`234`行工程路径总索引只能作为基线。KAD2、KAD3非UI、KAD4新长期存储与L6—8、KAD5测试合同的新增内容必须按唯一Owner定向合入04/repo_target及机器矩阵；不得新造第二生产Protocol、第二数据资产库或独立Admin知识产品。
- **必须查的设计完整性**：九阶段历史继承→六章→专业合同→机器注册/63方法19Skill→实际接口85/前端152动作→数据库L0—8与13 Studio资产/Storage→Agent/外部AI→Studio/Admin/WATCH→安全/Gate/撤权→正反验收与回滚；从目标文件/字段/动作反向找到受权条款及来源。先以文件清单、目录Hash、字段/身份/状态/权限/调用与失败分支做P0/P1审查，修订后再核；禁止以KAD1已审的静态SHA直接判最新MAB全量PASS。
- **此前缺口已修复**：`studio.projects`、`studio.asset_revisions`与九层主实体/12候选表、Gate候选、受控消费、回滚等已定向写入04/repo_target唯一Knowledge/Persistence/Security/API/Experience/Agent/Production合约；06研究稿仅为证据，不能独立生效。
- **交付权限**：设计自检通过即可打包供Owner备存与后续Codex交接；真实推送/云端DB与Storage、生产Gate、Vercel和私有原件外传仍需独立工程授权。Codex可以自行技术等价适配、调试、修复及运行分批提交，但须记录改动、测试、成本、回滚；改动产品目的、MHKA、D/L/G分权、版权/外传/安全原则等需具名冲突裁决，不反复让Owner审核技术小节。
- **KAD6设计收口状态**：已完成74份实际目标正反静态审查及20项规范融合，234项索引、GitHub树base blob、目标Hash、85 API/152动作/63方法机器形状与设计10门均可复核，形成唯一正式设计ZIP。`MAB_DESIGN_BASELINE_EXIT_PASS`只适用于设计与静态交付；真实项目工程、独立Gate/RLS/Storage、双题运行与Owner UI继续HOLD。

详见`KAD6_设计研究完整交付包_双向自检准则与初查报告_现行.md`及`KAD6_全量工程目标_交付自检矩阵_现行.csv`。**该节为原执行前设计，下一项以§11工程交接为准。**

## 11. KAD6完整MAB设计交付静态终审（2026-11-02，现行裁决）

- **仓库快照**：GitHub `main@db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`经本次直接对比未变化。原234项索引按GitHub递归树逐路径核验：212个预期存在路径Blob全匹配，21个CREATE与1个CLI迁移占位符预期缺席，没有意外KEEP/REVISE缺件。
- **正式设计目标**：74份仓库相对路径目标全部材料化并校验原始KAD1 SHA；按KAD2—KAD5新增成果对20份原位规范/机器矩阵定向合并，54份沿用经KAD1审查的正文；新目标SHA全部重算。63方法、6Job、85API、152动作保留ID与格式。
- **专业十门与反查**：权威、继承、D/G、九层/13资产与原件、内外混合Agent、Studio/Admin/WATCH、API/动作、权限/撤权、KAD5验证脚本及包完整性10门静态设计通过；新增Studio委托幂等使用稳定root_task_ref，避免任务FK置NULL后失去唯一约束。详见唯一`KAD6_设计研究完整交付包_双向自检准则与初查报告_现行.md`（已升级为终审记录）、机器结果和234行审查矩阵。
- **正式裁决：`MAB_DESIGN_BASELINE_EXIT_PASS / KAD6_DESIGN_BIDIRECTIONAL_STATIC_PASS / PACKAGE_RELEASED_FOR_OWNER_HANDOFF`。** 这是专业设计与静态文件签发，不是CODE已实施、隔离PG/Storage已测、独立G已启用、KAD5真实研究完成或Owner UI已签收。工程权限、真实部署、外部AI访问原件另需受权。
- **唯一工程交接方式**：Owner保存一个MAB完整版ZIP→Codex先校验包哈希/最新HEAD/实际PG与Storage→按manifest的74正式目标+字段级实现差异增量施工，并自主处理不改义的实现调整→逐项提交POS/NEG/AUTH、Git/DB/原件、发布与恢复证据→验证双课题A/B。KEEP不复制覆盖；KAD3已否定HTML不交付；KAD4非执行DDL只作研究输入。

**下一阶段**：完整设计包交Owner备存，由Owner另行授权工程施工和数据/发布/外发等受限操作。设计归档不是产品运行准出。
