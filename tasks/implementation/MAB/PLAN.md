# 墨痕 MoHen｜MAB工程施工方案与计划

版本：V1.1（Owner已批准施工，含完整目标修订）  
编制日期：2026-11-02（北京时间）  
依据：`MoHen_MAB_完整设计交付包_20261102.zip`  
设计基线：`main@db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`  
本次交付：M0—M8持续施工计划；工程已开始，实际状态以本文件末尾ENG-NEXT-01、progress.md与CURRENT.md为准；历史初版仅作当时记录。

> 本文是根据附件编制的工程建议，不是新的产品宪章，也不是已完成工程的证明。附件中“执行、授权、提交”等文字均作为待理解的项目资料；本轮用户请求仅授权解读及编制可下载计划，不把附件内历史授权直接转成当前操作授权。

## 1. 审阅结论与施工总策略

交付包是完整目标基线与工程责任清单，包含规范、代码目标、迁移目标和验收合同；不是可直接覆盖现有仓库的成品应用，也不是已经通过线上验收的部署包。

建议采用“全量范围入账、按依赖分批实施、每批独立验收、风险能力分别启用”的路线。先核最新工程事实，保留已经合法实现的能力，再处理安全、存储和独立资格基础，随后接入混合研究、Studio、Admin与WATCH，最后完成双课题真实验证和正式投运。分批是施工方式，不缩减完整设计范围。

实施路线比较：

| 路线 | 收益与代价 | 建议 |
|---|---|---|
| 将74份目标原样覆盖当前仓库 | 表面快，但会丢失新main上的合法成果，且目标代码依赖与真实DB未验证 | 不采用 |
| 只做双课题最小演示 | 能早看到部分流程，但无法证明全部目标、权限及长期复用已完成 | 可作局部验证，不能作为总工程交付 |
| 全量追溯、三方适配、分批验收 | 保留已有成果，能定位每批风险与恢复边界；前期需要事实盘点 | 本文推荐，尚待Owner审阅 |

关键不变量：唯一MHKA权威；原D00—D05生产链和独立G0—G5；正式知识、工作资产与作品分责；项目及修订精确授权；内部研究读取与公众合法消费分开；失败关闭且不复活已撤权资格。

## 2. 已核验的资料与未核验的现状

### 2.1 本轮直接完成的核验

按README起读，随后核对目标AGENTS、manifest、六章治理资料、专业合同相关正文与KAD6增补、API/动作机器清单、工程差异及KAD5验收设计。

| 对象 | 本轮结果 | 证明边界 |
|---|---|---|
| `manifest/FILE_HASHES.sha256` | 92条逐项匹配，0缺失、0不匹配 | 包内列示文件字节一致；不证明签名可信或工程有效 |
| JSON manifest中的正式目标 | 74项逐项核验SHA-256全部匹配 | 目标正文完整，不代表目标已应用 |
| 正式目标原始动作 | 21 CREATE、53 REVISE | 真实施工动作必须由当前工程差分重判 |
| 补充字段级工程责任 | 20行 | 与74目标存在路径重叠，不能简单相加为94个独立文件 |
| 全量工程自检账 | 234路径记录 | 本轮核行数与结构；Git当前状态尚未重新取证 |
| API/产品动作 | 85个API、152个动作 | 作为逐ID验收分母，不以文件数替代 |
| 方法/Skill | 包内声明63方法、19 Skill身份 | 工程期需验证绑定、实际文件、激活及执行者 |

### 2.2 附件声明，不能当作本轮新实测

包内声明`MAB_DESIGN_BASELINE_EXIT_PASS`，十门静态审查通过。包内历史报告记录了Git路径、TypeScript解析及JavaScript语法检查；本轮未重新运行其完整静态审查流程，不将其改写为本轮构建通过。

包内指出的待复核高风险：`public.imported_materials`的SEC-01/SEC-P0；候选写入代码与`control.gate_candidates`缺表的差异；98条`source.raw_items`原件指针尚未证实字节可回读；D01→D02及证据→历史主张的真实桥接待验。上述都是历史基线线索，必须在M0确认当前是否仍存在。

本轮没有读取项目最新GitHub HEAD、线上Schema、RLS/GRANT、Storage字节、真实Reviewer策略或部署状态。当前执行环境未配置可确认的项目连接身份或密钥；本文因此不编造最新现状或固定迁移SQL。

### 2.3 资料身份与解释规则

- `repo_target/`：目标规范及源码镜像，用于比较与适配，不直接认作当前运行事实。
- `manifest/`：路径、身份、哈希与工程责任。
- `acceptance/`：静态结论与未来真实验收要求。
- `evidence_only/`：来源研究与历史任务，不能成为第二套现行法源；其中DDL尤其不是执行脚本。
- `CURRENT.md`及真实代码/环境：后续M0要读取的状态源，当前包内没有提供完整实时现场。

`TRACEABILITY_INDEX.md`保留了旧包“缺MHKA/H1-H3原文”等历史阻断，但后文明确本代已归位；不再据旧段落重复索取旧包。相反，旧Runbook中的连接地址、表数、迁移/删除命令、公开部署操作仍只作历史信息，必须重核后编制新Runbook。

## 3. 完整工程范围与边界

| 工作域 | 施工目标 | 主要规范/工程入口 | 完成证明 |
|---|---|---|---|
| 治理代际 | 新旧规范路由一致，切换可回退 | AGENTS、六MHKA、OWNERSHIP、FOUNDATION | 唯一路由检查、差异与切换回执 |
| 生产能力 | 原六阶段、63方法及19 Skill绑定可追溯 | Protocol、Registry、method-binding、原Runner/Executor | 绑定校验、受控执行、真实交接 |
| 独立资格 | Producer仅候选；Reviewer独立签发 | Gate合同、candidate/audit仓储及DB角色 | 角色隔离、策略身份、正反实测 |
| 九层主数据 | L0—L8实体责任明确，正式Truth不重复 | DATA、Persistence、既有六schema | 映射、依赖、生命周期与分层测试 |
| 原件存储 | 私有原件字节、版本、hash及定位可回放 | source、Storage、来源导入API | 服务器回读、hash、定位与恢复 |
| 长期工作资产 | 13类型不可变修订、跨任务和跨题复用 | Knowledge合同、studio资产服务 | CAS/幂等/归档/ACL/复用事件 |
| 混合Agent | 首题即内外双主体，受控委托及永久回执 | Agent合同、research、tool-ledger | 同root真实事件、费用与候选七关 |
| 人文创作 | H1/H2/H3、19组件及真实创作保存 | 体验专业合同、Studio | 真实研究→导演→改稿→修订证据 |
| 产品交互 | 五图62模块、152动作逐ID对账 | U07动作CSV、现有页面及API | 触发→API→数据→界面全链证据 |
| Admin/WATCH | F05内部知识管理、同作品rev合法观看 | Admin授权视图、publication、读守卫 | 条目可追溯、发布与撤权一致 |
| API兼容 | 85项逐ID保持wire或明确受控例外 | API合同及CSV | 请求/响应/权限/并发/失败回归 |
| 运维恢复 | DB与对象同备份身份、恢复安全 | Operations、CI及运行回执 | 隔离恢复演练、撤权不复活 |

EXP完整功能、L6—L8运行启用遵循包内“延后激活”边界：本轮总计划保留其设计、实体及安全责任，不把未启用能力写成PASS。核心批次交付与完整范围闭环分开签收；有意延后项目须单列ID、责任人、理由和激活前置，不静默删除。

不重新制作Owner已否定的独立知识平台，不把F05 Admin改造成另一套产品；不要求固定新建12张表；不另建同义真值库、第二Runner或第二套Gate。

## 4. 工作组织、版本与证据管理

建议角色：Owner负责产品/授权与最终体验；工程负责人负责适配与发布准备；数据安全负责人负责Schema/ACL/RLS/Storage与恢复；独立Gate Reviewer按实际策略资格审签；测试负责人负责证据完整性。角色可以由同一自然人兼任，但生产与Gate的机器身份、权限和审计必须真正分离。

建议在真实仓库现有任务与结果目录内复用以下账册，路径以M0核查结果为准，不预设存在：

- 工程范围账：保留234路径与74目标的原身份，新增本轮KEEP/ADAPT/CREATE/HOLD判定、批次、责任人和证据。
- API与动作账：保留85/152原ID，链接测试结果，避免复制成第二份规范。
- 迁移清单：前置Schema、兼容性、执行及回滚条件、备份ID。
- 批次回执：`changed_paths / before_sha / after_sha / requirement_id / method / tests(POS,NEG,AUTH) / environment / policy_version / source_refs / unresolved_HOLD / rollback`。
- 状态使用`DESIGN_ONLY / CODE_PRESENT / VERIFIED_ISOLATED / VERIFIED_LIVE / HOLD`并分别记录Owner体验签收；不得把一列综合PASS覆盖所有证明层次。

每批建议分支/PR独立审阅；当前用户尚未要求创建分支或PR，本轮不执行。代码提交粒度以可独立回退的能力为界，不以74份文件一次性大提交。

## 5. 分批施工方案

以下检查框是后续执行清单，当前均未执行。批次编号M0—M8仅是本文施工编排，不新增项目正式Gate。

### M0｜现场盘点与三方差分

前置：取得实际仓库与必要只读环境入口；读取真实AGENTS和CURRENT，不提前套用包内目标路由。

- [x] 记录分支、HEAD、工作树、部署SHA、数据库迁移历史、运行版本及连接身份。
- [x] 以包内base、最新main、本包target做逐路径三方比较；原CREATE若已等价实现改KEEP/ADAPT，原KEEP若受20项增量影响仍需修补。
- [x] 对234路径、74目标、20责任行、85API、152动作、63方法及19Skill建立统一追溯；目录/占位符不可当成文件。
- [x] 只读核查真实表列/索引/PK/FK/触发器、RLS/GRANT、会话到DB身份传递、Storage和Gate运行身份。
- [x] 复核SEC-P0、候选缺表、98条原件历史记录与两座证据桥；给出当前存在/已修复/不适用/无权确认的证据。
- [x] 确认全仓构建与现有测试命令、包管理器、Runner执行环境；评估长作业在实际部署中的超时及恢复限制。

交付：现状报告、三方差异账、依赖图、风险清单、可执行命令基线和M1—M8修订估算。

准出：**M0_AUDIT_EXIT_PASS（2026-11-03，仅审查阶段）**。六项盘点和三方差异已有核证结果与具名下游责任；详见 `tasks/results/MAB/M0_AUDIT_EXIT_20261103.md`、234行与20行对照CSV及原位74目标 `target-diff.csv`。并非74目标实施PASS，也不取消M1凭据轮换及登录E2E的HOLD。生产DDL及M3专业资格仍须独立授权。

### M1｜安全底座与兼容迁移准备

依赖：M0。优先处理已证实的暴露风险，再启用新业务写入。

- [ ] 基于真实认证实现确定用户/项目/角色如何传递至服务与SQL，避免机械套用不匹配的JWT/RLS模型。
- [ ] 为导入、账户状态、ACL及私人会话验证匿名、跨用户、禁用账户、普通用户、Operator、Producer及Reviewer边界。
- [ ] SEC-P0采用“保护暴露入口→最小权限及策略→合法导入回归”的兼容修复，不仅开RLS而让全部合法业务断路。
- [ ] 生成隔离环境可执行的最小增量迁移及回滚说明；包内3份KAD1迁移也须核已应用记录与依赖，不重复运行。
- [ ] 配置隔离PG/Storage测试数据和低权限身份；记录备份、密钥引用与执行窗口，不在日志输出明文凭据。

验收：合法本人可导入，匿名/跨用户及禁用身份被拒；应用层和可达Data API/DB路径均验证；迁移失败不产生假成功。

回退：关闭新写入口，保留合法旧业务；不得以恢复危险GRANT方式让旧流程重新可用。


**2026-11-03 五项任务证据核销（不提前准出）**：原复选框仍代表完整验收，不可仅因代码存在勾选。以下区分已完成技术与尚缺验收，防止以后重建。

| M1任务 | 工程与测试已经证实的范围 | 仍缺正式准出证据 |
|---|---|---|
| 01 真实认证/身份/角色传递 | 现行签名会话、短时DB身份、RLS及相关CI | 生产登录合法流、配置生效 |
| 02 账户/ACL/跨Owner/Reviewer边界 | 独立PG已证伪造、禁用、跨Owner、回滚拒绝 | 生产合法和拒绝E2E、撤权证明 |
| 03 SEC-P0兼容封堵 | RLS/最小权限、私有材料导入/全文回读、Secure Cookie CI通过 | 实际本人导入/回读，不恢复危险GRANT |
| 04 最小迁移/回滚 | 20261102已应用迁移、隔离PG及备份/恢复回执 | 当前生产迁移与回退边界复核 |
| 05 低权限/备份/凭据 | 三内部角色均非super/无BYPASSRLS，已有隔离PG备份恢复；新生产变量曾访问成功 | 历史暴露凭据旧连接失效的非敏感证据、会话撤权及安全恢复 |

**严格状态**：M0独立审查PASS，M1仍`M1_SECURITY_ACCEPTANCE_HOLD`。旧数据库密码轮换按`LIKELY_COMPLETED_EVIDENCE_RECONCILIATION_REQUIRED`处理，不要求默认重复重置。M2原件Storage和M3独立Gate的生产启用不作为M1准出前置，但M1必须完成自身真实安全门。

**2026-11-03 M1生产匿名访问子项实测**：`fb92550`修复Middleware拒绝响应缺少no-store，常规CI `41580885849 SUCCESS`；Vercel相同SHA生产READY后，Actions `41580710096` attempt 2四项匿名GET全部PASS。仅签`M1_ANONYMOUS_READ_ONLY_HTTP_PASS`；合法本人操作、跨Owner/撤权、旧凭据失效及恢复仍待最终验收，M1整体HOLD。

### M2｜私有原件、九层映射与长期资产

依赖：M1。候选表先去重，采用先扩展兼容、后切读写的顺序。

- [ ] 建立L0—L8物理映射，保留source/evidence/world/meaning/read_model/control已有真源；L6—L8晚启用责任入账。
- [ ] 实现项目Owner、asset head与不可变revision、links/use_events、delegation/receipt所需最小持久层；作品、导演与媒资复用已有主正文。
- [ ] 验证同asset复合约束、`(asset_id,revision_no)`唯一、CAS提交及supersedes同资产；禁止覆盖旧修订。
- [ ] 委托幂等键采用`(project_id,root_task_ref,idempotency_key)`，不能依赖可置空任务FK；尝试回执只追加。
- [ ] 私有对象采用PENDING→上传→服务端回读校验→STORED_VERIFIED；对象与SQL间用补偿处理，不冒称跨系统原子事务。
- [ ] 完成L1读取单元→L2证据→L3主张的精确关联，typed locator支持页、区域或文本偏移，复核source_version。
- [ ] 以同backup_id封存DB、对象字节/列表/hash、策略/权利及Schema版本，进行首次隔离恢复。

MAB-ENG-01批次进展（2026-11-02，详细证据见progress.md）：私有原件状态机、Owner/禁用/过期/撤权、不可变修订、真实官方Storage HTTP、超时与DB回滚恢复、同备份ID字节及DB dump/restore均已隔离验证。生产迁移/桶/服务凭据与正式启用尚未执行，不将上列总范围复选框整项勾PASS。98条历史指针已只读逐条分类（93 memory、5仓库字节hash匹配但非私有对象）；私有文本两桥已隔离验证并补准确claim revision/防SQL绕过核验。剩余为生产激活、D00—D03实际接线、PDF/图像读取及正式资格，再按M3—M8推进。

**2026-11-03 M2定向隔离PG验收**：`main@bcd0715` / GitHub Actions `41576958641 SUCCESS` 已以真实PostgreSQL17完成精确来源绑定窄函数、无整表GRANT的Owner查询、跨Owner/禁用/过期/错误版本与回滚的正反测试，回执见 `tasks/results/MAB/M2_SOURCE_BINDING_PG17_20261103.md`。这仅完成**数据库来源核验子能力**，未启动本批官方Storage、生产迁移、D00—D03正式Registry或Reviewer；M2七项总任务不得据此整项勾PASS。


**2026-11-03 M2防误接保护**：新提交 `1606ddcc`、`12240628` 在现行执行授权层拒绝尚未正式注册的私有原件/证据请求，包含`qualified_source`等嵌套承载，禁止它们被既有legacy公共资料适配器误处理。GitHub Actions `41579537812`、`41580080729` 均SUCCESS。这只是**接线前置安全防护**；Owner短时私有会话、D01—D03合法候选读写、正式Registry绑定与真实Gate正反测试仍未完结，M2生产准出HOLD。

验收：原件可回读且hash匹配；指针有而对象缺失被拒；删除/归档task不丢资产与回执；跨Owner拒绝；并发CAS仅一个成功；恢复后不自动公开或激活Gate。

回退：停新资产写入，保留已存修订和回执；不以删表或级联删除作为常规回滚。

### M3｜原D链、Registry及独立Gate

依赖：M1/M2。

- [ ] 对齐原Runner、六阶段Executor、Registry、方法绑定与Skill状态；全局enabled、Job enabled、Reviewer启用分别校验。
- [ ] Producer仅能提交候选；补齐真实候选存储或复用等价实现，保留原审计历史。
- [ ] 在独立身份下实现策略版本、修订、purpose/consumer/action/scope、依赖与有效期核查及追加审计。
- [ ] 区分Stage完成、候选已存、WAITING_GATE与合格交接；无Reviewer启用就保持HOLD。
- [ ] 打通P08依赖失效与消费者即时阻断，不要求等下一次G5 PASS才停止非法消费。
- [ ] 验证Producer、Agent、Operator、共享高权限连接均不能绕过服务边界签G；恢复重核当前许可与策略。

**2026-11-03 M3只读验Gate客户端接线**：`main@1606ddcc` 为唯一Runner按需注入独立HTTPS资格当前状态读取回调，仅传run/job/stage/Gate/输入与输出摘要、绑定引用，拒绝缺配置、非法应答与超长响应。真实独立Gate服务不在Producer进程中签发，原`requireIndependentStageQualification`仍按当前审计、精确输入输出、失效时间拒绝非法交接；`34d68fec`新增对PASS匹配、撤权、输出变化、过期的组合合同负例。CI `41579537812`、`41579907762`、`41580080729` 均SUCCESS。**仅Runner查询接口代码就绪，不等于独立Verifier服务已经运行、Reviewer资格绑定或生产G签发通过**。Registry维持`DESIGN_TARGET_NOT_APPLIED`、六个Job disabled、Reviewer仍TO_VERIFY；正式M3仍HOLD。

验收：合法独立审签可追溯；生产者自签、旧PASS泛授权、错rev、过期依赖、禁用Job均拒绝。策略的真实启用须有单独明确范围，隔离测试通过不等于正式投运。

回退：暂停新run/候选/资格激活，保留所有审计；不回滚已发生的合法撤权。

### M4｜混合Agent与Studio长流程

依赖：M2/M3；真实外部调用另受资料范围与预算约束。

- [ ] 复用现research/production/tool-ledger/Agent入口，从授权旧资产检索开始构建Plan DAG，连接原Production Tool。
- [ ] 实现DelegationEnvelope与ExecutionReceipt：同root、子任务、project、provider/version、输入输出hash、allowed_actions、权利、期限、预算与费用可信度。
- [ ] 首题内生Agent与外部AI都有实际互补动作；外部AI只拿有权最小包，无权时TRANSFER_DENIED，不发送后补授权。
- [ ] 收包逐项执行T1身份幂等、T2取得及定位、T3权利传输、T4原文与解释分层、T5转引独立性、T6时空语义、T7资格用途核查。
- [ ] 接入Studio九动作及13资产类型，真实显示候选、缺口、预算限制、待G与可恢复草稿，不把入队显示为完成。
- [ ] 测试撤委托、超时、预算不足、旧checkpoint、lease失效、幂等重试、任务删除及跨会话恢复。

验收：同root双主体回执齐全；没有模拟provider/费用补零；候选不直写world/meaning/Gate；长存资产可恢复且旧许可不能复活。

回退：关闭新外部委托和Runner写入，保留合法内部计划、候选、资产及账本。

### M5｜创作、Admin、发布与WATCH合法消费

依赖：M2—M4。

- [ ] H1/H2/H3与19组件绑定真实研究来源、导演、创作、修改与保存；同一作品母本，不复制第二正文。
- [ ] 创建/提交/修订保持包内既有wire兼容与显式例外，CAS、创建幂等及存储失败不误报成功。
- [ ] F05 Admin接内部授权条目视图，能查来源、精确修订、证据链、用途、使用史和缺口；保留原运营功能。
- [ ] 出版检查Operator权限、精确WorkRevision、独立知识G5与媒资许可；状态和发布pointer采用事务或可验证补偿。
- [ ] WATCH、Evidence on Demand、visual_stage和Agent消费者每次读按当前用途/consumer/rights核查；各消费者不能互借资格。
- [ ] 撤权立即阻断受影响分面，清理可控缓存；严格即时撤权原件采用逐请求代理等可证方案，短签URL不能假称即时失效。

验收：编辑→投稿→审核→发布→WATCH读同rev；并发/重复发布、部分失败、旧pointer、媒体撤权、错consumer、匿名读私有原件均有拒绝证据。合法章节可局部保留。

回退：维持仍合法旧版；关闭受影响新发布/分面，不清除已存合法草稿，不复活已撤权缓存。

### M6｜全量合同回归与延期能力闭环

依赖：M1—M5。

- [ ] 85 API逐ID确认合法、错误、鉴权、版本/并发、幂等与wire兼容；仅同名路由存在不能通过。
- [ ] 152动作逐ID核前端触发→handler→API/事件→持久化/授权→界面状态，覆盖62模块和五图归属。
- [ ] 63方法/19Skill、H1/H2/H3、19组件及专业验收条款分别映射测试或明确激活延期。
- [ ] 验证AT-01—16、X1 A01—A07、Gate合同26项及相关安全反例，不以方法/组件数量直接算运行通过。
- [ ] 对L6—L8及完整EXP形成设计冻结、实现、测试、启用四列账；实施范围内全部闭合，晚启用部分提交具名排期。
- [ ] 完整仓库类型检查、构建、既有回归、集成、E2E及设备体验检查；命令依M0实际脚本，不在本计划伪造项目命令。

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

### M8｜授权切换、发布与交接

依赖：M6/M7结果及具体投运范围审定；若仍有延期项，交接明确为核心范围阶段交付。

- [ ] 形成可审阅发布包：准确commit、构建/测试报告、Schema差分、备份ID、恢复实测、权限/策略清单、风险与回退触发条件。
- [ ] 对权威入口切换、真实DB/Storage变更、Gate启用、远端推送/合并及生产部署分别记录既有或新增授权范围。
- [ ] 经授权原子切换AGENTS/六MHKA/专业合同路由；旧C0—C4只读归档，不双活。
- [ ] 先在隔离/预发验证兼容，再按窗口执行生产迁移、切换及部署；记录各步骤SHA、操作者和结果。
- [ ] 运行冒烟覆盖本人导入、跨用户拒绝、候选待G、合法发布/消费、撤权及恢复检查；新旧合法能力回归。
- [ ] 更新CURRENT真实状态，交Owner做人文体验和业务签收；未完成项逐项HOLD并给下一批计划。

回退：优先关闭新入口/新写入，按已演练的兼容方案回到仍合法版本；DB和对象需一致恢复，撤权审计必须保留并重放，不盲恢复旧公开权限。

## 6. 依赖、工期和资源建议

以下为工程估算，非附件承诺工期。假设一名全职主工程师具备全栈与数据能力，Owner/独立Reviewer及时参与，测试环境可获得；不包含等待授权、资料采购、外部服务停机及大规模旧数据清洗。以实际获准开工日为D0，M0后重估，不直接绑定日历发布日期。

| 批次 | 建议有效工作日 | 主要依赖 | 可审阅交付物 |
|---|---:|---|---|
| M0 | 2—3 | 实际仓库/只读现场 | 三方差异与风险/命令基线 |
| M1 | 3—5 | M0 | 安全修补、兼容迁移与负测 |
| M2 | 5—8 | M1 | 存储/资产/原件与首次恢复 |
| M3 | 4—6 | M1/M2 | 原链及独立资格证据 |
| M4 | 5—8 | M2/M3 | 混合Agent与Studio恢复 |
| M5 | 5—8 | M2—M4 | 创作/Admin/发布/WATCH闭环 |
| M6 | 4—6 | 核心功能就绪 | 全量追溯与回归/延期账 |
| M7 | 4—7 | 合法原件/外部权限/Gate | A/B真实运行和复用报告 |
| M8 | 2—3 | 发布条件与范围授权 | 投运/切换/交接报告 |

单工程师串行基准合计34—54有效工作日，另预留约20%不确定性，即约41—65日（约8—13个五日工作周）。这里只是规划量级，不据此承诺全量EXP上线；延期能力须在M0核实后估出专项工作量。真实Gate策略及原件权利等待可能决定日历关键路径。

关键路径：M0→M1→M2→M3→M4→M5→M6→M7→M8。安全/测试设计、接口对账和UI状态梳理可与相关实现有限并行；数据模型未冻结前不抢先大面积改UI。若投入第二名工程师，优先分担安全数据与Web联调，工期需重估而非简单减半。

建议每批结束提交一次可下载报告，每周更新剩余范围、当前证据、成本及阻断；发现语义冲突即提交“改什么/为什么/影响谁/如何回退/Owner需决定什么”，普通字段适配由工程负责。

## 7. 质量、验收和准出规则

### 7.1 不能混用的证明层

| 证明 | 需要的证据 | 不能推出 |
|---|---|---|
| 设计完整 | 合同、追溯、哈希与静态审查 | 代码或DB已运行 |
| 代码就位 | commit、构建、静态校验 | 真实RLS/Storage有效 |
| 隔离通过 | 真实PG/对象/服务的正反测试 | 生产Gate已获准激活 |
| 线上验证 | 对应部署/环境/策略的运行日志 | Owner已签体验 |
| Owner签收 | 确认范围及可感知业务/人文成果 | 自动扩大数据外发或版权许可 |

### 7.2 高风险交叉测试

| 条件 | 应有行为 | 主要责任批次 |
|---|---|---|
| anon/跨用户/同名项目/禁用账户 | 拒绝私有读取及写入，无对象URL泄露 | M1/M2 |
| task删除、旧revision、并发CAS、重复请求 | 永久资产仍在，修订不覆盖，重试不重复计费 | M2/M4 |
| 原件仅有ref、hash错、locator空、OCR错位 | 不假称已取得/已识读，不提升事实资格 | M2/M3/M7 |
| Producer/Operator代签、旧PASS/错用途 | 独立签发边界生效，失败关闭 | M3/M5 |
| 外发无权/预算不足/Provider超时 | 不发送或明确停止，保存真实失败回执 | M4 |
| 发布一半失败/错作品rev/旧缓存 | 不报成功、不公开非法分面、合法旧版保留 | M5 |
| 撤权与恢复、签名URL有效窗口 | 立即阻断可控消费，残余窗口如实验证 | M2/M5/M8 |
| 空库/服务不可用/无资料 | UI区分空、失败、待审核，不显示假DONE | M4/M5/M6 |

### 7.3 批次完成定义

代码及迁移与当批合同一致；必要POS/NEG/AUTH、构建和原功能回归通过；变更与恢复证据可重演；没有未关闭P0/P1；剩余范围具名入账。关键真实用例NOT_RUN不得签当批运行PASS。只读设计审阅可先完成，不需要现在启动所有真实环境操作。

## 8. 风险、决策与开工输入

| 风险/未知 | 影响 | 处理 |
|---|---|---|
| main已变、base与当前实现冲突 | 覆盖成果/引入回归 | M0三方差分；等价实现优先复用 |
| 共享DB身份使应用鉴权无法覆盖SQL | RLS形式正确而实际可绕过 | 查真实认证与低权限执行，做直接路径负测 |
| 原件指针与对象不一致 | 无法真实研究/恢复 | 对象回读/hash清点，缺失隔离，保留取得HOLD |
| 独立Reviewer策略未启用 | 无正式G链及合法公开资格 | 隔离实现先完成，正式启用单列范围 |
| 外部AI权限/原件许可/费用不明 | 双主体运行无法合法完成 | 最小包、预算上限、真实Provider与传输范围明确后运行 |
| 长作业部署不支持持久执行 | 超时、回执丢失、重复计费 | M0核实际部署，复用现调度边界并补恢复机制 |
| 旧资产缺项目映射 | 错归属或资产泄露 | 有依据映射；不按题名猜；未知隔离 |
| 单库备份、恢复复活旧许可 | 丢文件/公开越权 | DB+对象双备份、默认关闭公开、重核/重放撤权 |
| 完整范围与延期激活混淆 | 阶段成果误报总完成 | 核心/延期范围分别签收，逐ID保留未完成 |

后续M0所需输入：实际仓库路径/远端和分支、真实状态文档、可用隔离环境及只读生产元数据入口、当前部署识别信息。M4/M7再需要Provider与预算、合法资料及传输范围、Reviewer策略身份；M8再核具体变更窗口和投运范围。无需Owner逐字段选择SQL或普通组件实现。

审阅建议重点：是否接受完整范围分批推进；是否认可核心Studio/Admin/WATCH优先及EXP/L6—L8延后激活的分账；人力/工期假设是否可用。上述是计划审阅点，本轮没有因这些尚待审定的条件停止文档编制。

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

## 12. Owner已批准的施工修订（2026-11-02）

- 最终GitHub仅保留main；历史分支需证明成果已保留再删除，版本追溯通过提交与标签。
- 最终是Vercel可访问的Studio/WATCH/EXP三模式、运营管理和真实知识资产存储，不能仅交付演示或以延期为全量完成。
- 原M6增加EXP及L6—L8完整设计范围的实现与运行验收；延后只表示批次顺序，不豁免最终交付。
- 常规技术问题由工程自主解决；产品功能、效果、方向或成本变化，先用白话说明原因、选项、推荐、影响及需Owner决定事项。
- Owner已授权按更新计划持续施工；已批准范围内的技术实施不重复索取确认。外部平台仍需实际可用的连接权限；新增费用及受限资料外发范围不能由工程自行扩大。
- 当前M0已发现最新main与包内base一致；两历史分支均是main祖先。真实数据库SEC-P0仍存在，candidate表未建，Storage桶为空。

## ENG-NEXT-01｜受控接续执行补充（2026-11-02，归属MAB-ENG-01）

本节补充原M0—M8，不新立并行计划。上位受控任务书位于Library `04_工程规范与Codex接入/01_MAB工程接续施工_受控子任务/MAB-ENG-01_墨痕新架构工程接续施工与体验保全_受控任务书_V1.0.md`。施工起点`main@c032ec640500e508c6345120d5e18dc804a6dc0f`，此前Vercel Production关联同SHA且READY，仅为部署证据。

- **M0差分**：74条逐项记录文件路径存在/不存在、目标未核；已有53个REVISE路径、21个设计CREATE路径缺席，不能把53项均视作目标实现。20项补充与234路径的字段级目标匹配继续HOLD，下一轮按原ID核销。
- **M1安全**：2026-11-02只读SQL确认 `public.imported_materials` RLS=true、anon/authenticated无直接表GRANT；MAB五项生产迁移已记录。登录/素材导入、跨Owner拒绝的线上E2E及凭据轮换回执仍待核。不得用旧密码或扩大权限回滚。
- **M2资产与原件**：只读SQL确认 `source.raw_items=98`、`evidence.reading_units=38`、`evidence.material_evidence=166`、`evidence.read_unit_evidence_links=0`、`world.claim_evidence_links=0`、`storage.buckets=0`、`studio.projects=0`、`studio.asset_revisions=0`。7张Studio表、候选Gate表存在不等于原件字节和证据已闭合；先核合法样本、对象回读/hash、L1→L2→L3定位、跨题授权、同备份ID恢复，再决定最小迁移。
- **UI-R01/02/04**：恢复首页“开始创作”与创作到发布的非EXP串行流程；Studio新对话以确认保全已保存资料，研究记录走真实资料台，当前步骤随用户动作变化；WATCH零章节显示真实不可阅读状态、无伪播放。须由CI、浏览器和Owner分别验收，不能以源码存在计PASS。
- **M3/M4/M5依赖**：M2可回读原件→合法读取单元→证据桥→有据主张→独立Gate资格→同root内外AI真实协作→Studio/Admin/WATCH同一WorkRevision。EXP与L6—L8按批准延期保持设计和权限约束。

本批仅修改GitHub代码和施工文档；真实DB无写操作、Gate未启用、没有付费模型调用。CI、部署与在线设备验收在有可核证回执前均记`NOT_RUN`。回退点为`c032ec640500e508c6345120d5e18dc804a6dc0f`，不得撤回既有RLS/资产数据。


### 施工部署频率裁决｜2026-11-02

Owner决定优先按任务书连续完成GitHub开发，构建/测试按批次检查，不再每个微小变更都单独跟踪或重新触发Vercel；现存main自动部署暂不改配置。M2原件私有Storage、项目元数据、证据桥与M3独立资格必须通过适用隔离测试和安全门，关键批次集成之后再集中验证在线体验。**不以Vercel READY替代M2/M3工程验收**。安全关键回退/紧急修复仍可以单独部署。
