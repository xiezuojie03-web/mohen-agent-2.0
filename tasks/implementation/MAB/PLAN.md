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
| 治理代际 | 六 MHKA 从工程开始即为唯一设计规范，旧 C 留历史与兼容；运行切换在 M8 | AGENTS、六MHKA、OWNERSHIP、FOUNDATION | 工程路由守卫、运行授权与历史差异分别核证 |
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

**权威文件与执行账唯一性（本轮起严格执行）**：

- `MAB-ENG-01_墨痕新架构工程接续施工与体验保全_受控任务书_V1.0.md`：已批准的任务身份、总体范围、Owner裁决和不可突破的上位约束。
- **本文件 `tasks/implementation/MAB/PLAN.md`：M0—M8唯一施工计划、唯一执行顺序和唯一阶段/任务验收标准。** 后续所有缺口、施工任务、责任、依赖、验收和顺序调整，只在本文件原位维护；不新建平行任务书、M5专项计划、补缺清单或第二套验收标准。
- `progress.md`：只记实际施工、commit、测试、环境、证据、HOLD和回滚，不另行制定任务或改变准出标准。
- `target-diff.csv`：只记74目标/路径级实现差异与证据，不承担任务规划。
- `CURRENT.md`：只反映实际运行状态；`CODEX_HANDOFF_CURRENT.md`只提供工具接续入口/命令，不得另立任务顺序或验收标准。
- `tasks/results/MAB/`内已有报告仅为特定批次证据或历史审查材料，不构成新的权威任务书；与本文件不一致时以本文件为执行依据，必要时在本文件原位修正。

批次回执继续使用`changed_paths / before_sha / after_sha / requirement_id / method / tests(POS,NEG,AUTH) / environment / policy_version / source_refs / unresolved_HOLD / rollback`。状态使用`DESIGN_ONLY / CODE_PRESENT / VERIFIED_ISOLATED / VERIFIED_LIVE / HOLD`并分别记录Owner体验签收；不得把一列综合PASS覆盖所有证明层次。

每批建议分支/PR独立审阅；当前用户尚未要求创建分支或PR，本轮不执行。代码提交粒度以可独立回退的能力为界，不以74份文件一次性大提交。

## 5. 分批施工方案

以下检查框是后续执行清单，当前均未执行。批次编号M0—M8仅是本文施工编排，不新增项目正式Gate。

### M0｜现场盘点与三方差分

前置（2026-11-02 历史盘点方法）：取得实际仓库与必要只读环境入口；读取当时真实AGENTS和CURRENT，不把目标包误作已运行事实。2026-11-05 Owner 明确：此历史审查方法不意味着继续让旧 C0—C4 指导新工程。

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

**2026-11-03 M1独立收口施工增量**：已将现成`scripts/test-mab-http.mjs`的真实Next.js＋Playwright测试接入一次性PG17 GitHub Actions（`172a1dd5`，Chromium安装补正`7c9902c7`），包含原有本人Studio研究/修订、跨Owner拒绝与新增账户禁用、退出后旧Cookie失效HTTP测试（`4d4fb2e6`、`e8251d5d`、`ff0c9503`）。所有用户与数据库均为标记隔离合成数据，正式Storage浏览器导入用例因缺受控官方Storage配置会被跳过，不记成功。

**证据状态**：当前此批工作流真实运行回执尚待核实，标`M1_ISOLATED_HTTP_CI_PENDING`，不能称已验收PASS。M1仍需生产合法Owner/回读、真实撤权及跨Owner、旧凭据失效非敏感回执、安全恢复验收；不要求默认重轮换密码，也不将M2/M3正式激活当作M1前置。详见`progress.md`最新M1条目。依赖生产身份的事项独立HOLD，M2/M3原计划并行不变。

### 2026-11-03 Owner裁决｜M阶段有条件准出与顺序收口（当前执行规则）

Owner本轮明确允许“该有条件准出的，也可以采取有条件准出，或者调整施工方案匹配实际准出标准，但不能降低最终标准”。本节落实**M施工阶段**的依赖和准出，不修改数据生产闸门、专业合同、安全、成本或生产授权。优先于此前无范围的总HOLD和默认多阶段并行施工表述；原任务分母、复选框与最终验收不删。

1. **三种裁定**：`EXIT_PASS`（本阶段完整要求已满足）、`CONDITIONAL_EXIT`（具名条件、影响、责任及最迟完成点明确，允许的下游范围明确）、`BLOCKED`（已知可触发安全/数据破坏/无有效输入的问题，禁止受影响下游）。条件准出不将未验项变成PASS，最终M8不得带未关闭的安全/生产必验条件准出。
2. **单一当前施工阶段**：M1、M2按下表在限定范围有条件准出，M3完成下述隔离工程闭环后有条件准出，M4按下述限定工程范围有条件准出，当前先收口M4远端HTTP已证失败；M5待其闭合后接续，保留既有M3—M5合法源码和证据，暂停其新增独立功能施工。主线按M1→M2→M3→M4→M5→M6→M7→M8推进。仅做当前阶段必需的接口适配、受影响回归或明确安全缺陷修复，不再任意横向展开。
3. **固定交付与接收**：下表明确上一M的工程交付、下一M接收方式与禁止事项；上一阶段的完工标准须落在其职责内。M2交付待审候选，M3负责独立审签及资格消费；不得形成“M2要等M3生产验收、M3又要等M2完工”的循环。最终正式运行仍须全部依赖与原专业闸门满足。
4. **条件不无限滚动**：每条条件固定ID/责任/完成证据/最迟完成点；不能随阶段推进默默延期或改成通过。到点未满足，阻断相应上线/写入/消费；普通隔离源码施工不必因生产授权未到位而原地等待。改变条件或最终标准要在本节与progress具名说明，不靠反复重写总状态消失。
5. **只重开有证据的缺陷**：记录`触发变更/失败证据→受影响交付→定向修复与回归→下游接收结果`。无相关源码/配置/契约变化且已通过的证据直接继承，不因“开始新批次”重跑全部M1—M3；任何真实失败不得用历史PASS覆盖。相同障碍连续两次尝试仍无新证据时停止重复命令，改路径或明确条件准出/BLOCKED。

| 施工阶段 | 当前工程交付/裁定 | 下阶段有效输入与接收要求 | 本轮不授予的权限 |
|---|---|---|---|
| M1 | **M1_CONDITIONAL_EXIT，范围仅代码/标记隔离环境**；签名身份、30秒DB身份、Owner事务/RLS、禁用/过期/伪造/登出旧Cookie拒绝、迁移及失败关闭已有下述真实证据 | M2复用`getSession/resolveSession → signDatabaseSessionToken → createAppTransaction`和既有仓储；测试环境明确启用会话撤销候选及独立验证key，身份与Owner负测不删；专用worker按低权登录检查。不得用传入owner_id或共享高权身份替代 | 生产数据新增写入/新原件上传、正式角色/密钥/迁移和开关激活仍受M1-C01—C04及独立授权约束 |
| M2 | **M2_CONDITIONAL_EXIT，仅已验证UTF8待审候选及长期资产最小持久层**；七项逐项核销见 `tasks/results/MAB/CODEX_M2_L1_20261103.md`，生产/非文本/正式复用条件M2-C01—C03不得隐去 | M3须实际接收M2持久candidate/ref@revision、Owner/rights/provenance、输入输出hash与执行回执；可读取、幂等重试、无权限拒绝。缺文件字节/持久实体/精确修订/所需接线属于M2阻断，不可用mock或延后到M3掩盖 | M2工程准出不签专业资格，不放行待审候选的正式跨阶段生产/公众消费；生产Storage授权单列 |
| M3 | **M3_CONDITIONAL_EXIT，仅代码/标记隔离环境独立服务工程闭环**；凭据认证、专用Signer/Reader LOGIN、实际HTTPS、G0→持久L1/G1→Runner精确消费→祖先撤销拒绝及回滚保留；见 `tasks/results/MAB/CODEX_M3_SERVICE_20261104.md` | M4接收默认关闭但可独立启动的服务、窄读取、签审/撤权客户端与既有Runner资格校验；M3-C01—C03生产条件固定保留 | 不得以合成专业检查代真实审核；生产迁移/凭据/服务激活、真实模型外发与费用仍需原授权 |
| M4 | **M4_CONDITIONAL_EXIT，仅代码/标记隔离的计划、UTF8候选收包和持久协调/恢复**；六项逐项范围及M4-C01—C04见 `tasks/results/MAB/CODEX_M4_CLOSURE_20261104.md` | M5实际接收Owner计划@rev、精确委托/永久回执、逐项候选审查、撤销/恢复及已有13类型仓储；九动作/类型业务验证由M4-C04具名交M5，不重做已验调度 | 真实混合仍MIXED_NOT_VERIFIED，生产/实际费用/专业权威条件不关闭；原完整验收不勾 |
| M5 | **当前施工；M4远端HTTP已由df4eeb8/41823975358闭合**；继承Studio/Admin/WATCH合法已有源码，接收M4工程输出 | 先完整实现并验证私有创作/运营流程、精确WorkRevision、权利/用途/当前资格、合法WATCH；缺专业G5不公开消费 | 不以Owner草稿或运营审核代专业Gate；生产和公开发布仍须具名条件及原授权 |

**M1证据基准**：源代码`b609efa2c5883cd732cc1a1ce2100bb0d96d8265`，M1 HTTP/Chromium [41641918101](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918101)为6 PASS/1 Storage SKIP（跳过属M2官方Storage，不冒充M1私有文本导入浏览器已实跑）；隔离PG17 [41641918045](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918045)含本人/跨Owner/失效签名、低权角色、会话撤销、回滚保留及重演。`982c5ae6`相对该SHA仅文档/差异账与独立TLS测试脚本变化，M1身份实现未改，最新主CI [41642390511](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41642390511) SUCCESS；本轮读取真实日志核销，不重跑无变化M1全套。

| 固定条件 | 责任/需要的前提 | 关闭证据 | 最迟完成点；未完成影响 |
|---|---|---|---|
| M1-C01 生产合法身份及最小连接权限 | 工程执行；Owner提供/批准有权会话或明确测试账号/数据范围 | 当前部署SHA的本人登录→合法导入/读取，以及匿名/跨人/禁用/过期拒绝；实际Web/worker连接current_user/session_user及角色权限非敏感证明，不能只凭NOLOGIN组安全断言实际连接安全 | **M2任何新增生产业务写入/原件上传前**；此前只允许明确隔离合成环境施工 |
| M1-C02 生产会话撤销切换 | 工程准备并在生产明确授权/备份窗口内实施 | 应用`20261103095024_mab_web_session_revocation.sql`、检查角色/索引/触发器、启用候选会话开关；复制Cookie退出重放拒绝、disabled→active旧会话不复活、DB故障不报成功；开关回退不得复活令牌 | **M2任何新增生产业务写入/原件上传前**；仅源码提交不关闭 |
| M1-C03 历史凭据失效核证 | 工程先找既有非敏感回执；Owner/有权运维在工程无权核证时补完成信号 | 官方轮换/撤销审计或有权环境旧连接失败、新连接成功的无秘密回执；不得重索旧密码、默认重做轮换或把新变量存在当旧凭据失效 | **M2任何新增生产业务写入/原件上传前**；真实生产安全准出未通过 |
| M1-C04 安全恢复与回退 | 工程实施隔离演练；生产窗口由有权运维批准 | 当前生产备份/恢复方案引用、迁移故障失败关闭、撤销摘要与单调失效边界保全/重放或受控全会话失效；不恢复危险GRANT。已有隔离回退证据继承，生产对应方案/验证另补 | **首次M2生产切换/恢复前**，且M8最终准出前必须关闭；不能把生产恢复记成隔离PASS |

生产只读核验（2026-11-03 22:11:50+08:00）：导入表RLS=true，anon/authenticated的SELECT/INSERT均false；会话撤销表不存在、users.session_not_before列不存在。实际登录用户/生产有效开关/旧凭据失效尚无新证据。三个内部NOLOGIN组无super/bypassrls/createrole/createdb仅证明组定义，本轮未探测或暴露任何凭据、未修改生产。M1完整生产验收仍`M1_SECURITY_ACCEPTANCE_HOLD`，与上述限定工程准出并存。详细核销写回既有`tasks/results/MAB/M1_SECURITY_ACCEPTANCE_HOLD_20261103.md`与progress。

### M2｜私有原件、九层映射与长期资产

依赖：M1。本轮按上节M1_CONDITIONAL_EXIT仅接收代码/标记隔离环境输入，生产受M1-C01—C04阻断。M2只签其工程资产交付，不等待M3正式审核投运；候选表先去重，采用先扩展兼容、后切读写的顺序。

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

**2026-11-03 Runner真实执行路径补缺**：`a726b26a`修复一次性授权nonce核验与`current_stage`更新先后冲突，使真实Runner在授权完成后可把严格绑定的一次性授权交给受控私有D01—D03工作器；`e71d04b9`、`a9464fa2`新增完整Runner入口正例（仍因独立Gate未启用而HOLD）与Registry未启用/无签名授权前置拒绝负例。此批暂`CODE_PRESENT / CI_PENDING`，Owner短时身份注入、受审Registry真实绑定、Storage+PG+独立Gate全链仍未验收，不改变阶段HOLD。验收与运行事实见`progress.md`。

**2026-11-03 M2专用候选适配器接线增量**：`33589ef5`/`1836f831`把私有证据输入的安全守卫由“一律拒绝”收窄为只接受唯一Reviewed Adapter路径与D01—D03阶段顶层typed request，其它含私有输入的legacy路径继续HOLD；`5a08bf94`新增仅候选的D01/D02/D03适配器模块，`39cb1c96`由唯一Runner传入真实Registry，`fd758bb5`补正反单测。此时仍无可信运行端Owner会话注入、正式Registry激活、来源→阅读→证据→主张有Gate资格的完整交接，也没有实际PG/Storage/Reviewer整链PASS；本批只记`CODE_PRESENT / TEST_PENDING`。详见progress.md。

**2026-11-03 M2执行授权交接增量**：`b69baa5f`/`2f94998f` 为现有一次性签名授权添加Runner→私有工作器同run/job/registry/input、digest、stage严格绑定的单次交接；`419f85c7`补合成Ed25519与Verifier负例测试。消除合法Runner已消费nonce时工作器再次验证的接线冲突。阶段仍`CODE_PRESENT / TEST_PENDING`，当前Registry未启用、私有Stage尚未正式绑定、PG/Storage/独立Gate整链未在本批实测。下一批优先完成真实独立授权的唯一Registry适配器装配和跨身份正反联调，且不得放开旧legacy输入路径。详情以`progress.md`为准。

验收：原件可回读且hash匹配；指针有而对象缺失被拒；删除/归档task不丢资产与回执；跨Owner拒绝；并发CAS仅一个成功；恢复后不自动公开或激活Gate。

回退：停新资产写入，保留已存修订和回执；不以删表或级联删除作为常规回滚。

### 2026-11-03｜M2交付与M3接收核销（有限条件准出，非生产PASS）

基线main@331dfc9，本轮只补M2持久交付，未再施工M1或横向扩M4/M5。`private-text-reading-repository`与候选迁移`20261103143451`将Owner/官方Storage实际字节、精确source/version/raw/hash接到原source.read_runs/read_units；不可变、并发幂等、输入/输出digest、SQL原子失败/回退和同backup_id恢复已实跑。唯一Runner未取得独立资格时仍HOLD，但持久机器回执保留准确candidate refs；现有Producer.recordGate已以同一ref@revision与真正stage input digest接收，原证据桥直接消费本次持久L1输出后连到精确claim revision。不能把待审候选当正式知识，也不能用幂等request_digest冒充Runner input_digest。

原七项工程证据逐项核销、实际测试、支持范围与回退见`tasks/results/MAB/CODEX_M2_L1_20261103.md`及evidence。317单测PASS/4既有SKIP，117生产边界PASS，六workspace类型/Next build/鉴权通过；真实PG17+官方Storage v1.43.0/HTTPS/唯一Runner/候选接收/精确证据桥/同身份备份恢复和迁移重演回滚PASS。本轮没有重跑无变化的M1浏览器链；PG共用依赖由现有suite一起验证。

**裁定：M2_CONDITIONAL_EXIT，可转M3，只消费本批已验证UTF8候选和既有长期资产最小持久层。** 原七个完整验收复选框不因此伪勾；最终完整准出标准不改。M3接收有效输入已验证，M2的以下残余不能变成无名HOLD或让整个上游反复重建：

| 固定条件 | 责任及关闭证据 | 最迟完成点与阻断范围 |
|---|---|---|
| M2-C01 正式原件/迁移/恢复 | 工程准备，有权运维在Owner明确批准下完成私有桶、候选迁移/角色/核验key、备份及正反验收；M1-C01—C04先按各自时点关闭 | 任一新增生产原件写入/正式资产使用前；此前只用标记隔离环境。M8最终必须关闭 |
| M2-C02 非UTF8载体读取 | 工程补PDF/page/region等typed locator读取与返演，外发/收费按原授权；实际权限、字节、定位及恢复负例通过 | M3接收相应非文本候选前；未满足只允许已证UTF8文本，不得拿文本PASS充全格式。最终必交范围不得在M8豁免 |
| M2-C03 授权复用服务 | 工程实现asset_links/use_events真实授权写入与幂等/精确revision/project/rights负例，需要资格时消费M3接口；表/RLS存在及SQL合成事件不等于已授权复用 | M4实际跨任务/项目复用、或任何产品将事件当授权前；M8最终必须关闭。M3仅接本批持久L1审查，不依赖该复用服务 |

只在关联接口变化/可复现缺陷时重开M2受影响部分。新候选函数rollback只撤EXECUTE，保留实体、原件版本钉住、审计和旧安全边界；生产Registry及上传开关不因本裁定开启。

### M3｜原D链、Registry及独立Gate

依赖：M1/M2。

- [ ] 对齐原Runner、六阶段Executor、Registry、方法绑定与Skill状态；全局enabled、Job enabled、Reviewer启用分别校验。
- [ ] Producer仅能提交候选；补齐真实候选存储或复用等价实现，保留原审计历史。
- [ ] 在独立身份下实现策略版本、修订、purpose/consumer/action/scope、依赖与有效期核查及追加审计。
- [ ] 区分Stage完成、候选已存、WAITING_GATE与合格交接；无Reviewer启用就保持HOLD。
- [ ] 打通P08依赖失效与消费者即时阻断，不要求等下一次G5 PASS才停止非法消费。
- [ ] 验证Producer、Agent、Operator、共享高权限连接均不能绕过服务边界签G；恢复重核当前许可与策略。

**2026-11-03 M3只读验Gate客户端接线**：`main@1606ddcc` 为唯一Runner按需注入独立HTTPS资格当前状态读取回调，仅传run/job/stage/Gate/输入与输出摘要、绑定引用，拒绝缺配置、非法应答与超长响应。真实独立Gate服务不在Producer进程中签发，原`requireIndependentStageQualification`仍按当前审计、精确输入输出、失效时间拒绝非法交接；`34d68fec`新增对PASS匹配、撤权、输出变化、过期的组合合同负例。CI `41579537812`、`41579907762`、`41580080729` 均SUCCESS。**仅Runner查询接口代码就绪，不等于独立Verifier服务已经运行、Reviewer资格绑定或生产G签发通过**。Registry维持`DESIGN_TARGET_NOT_APPLIED`、六个Job disabled、Reviewer仍TO_VERIFY；正式M3仍HOLD。

**2026-11-03 旧撤权入口兼容安全修复**：`1dfedaa2`关闭旧Operator对`gate_audits.current_valid`的直接UPDATE路径；`6fe89f5c`、`2eeed56a`使两API明确返回503/不可缓存，不谎报撤权；`59f392ad`补无DB写入的负例单元。此改动临时关闭旧Operator撤权业务，**不**意味着旧作品已撤权或独立Reviewer正式可用。后续须通过已设计的`control.revoke_gate_qualification`由独立身份+精确audit ID+request UUID执行，绑定M5的WATCH逐请求资格拒绝；相关生产/隔离验证仍HOLD。详见`progress.md`本轮回执。

**2026-11-03 M3独立撤权服务协议客户端施工**：`89cda1db`在唯一Runner现有M3独立资格读取模块旁增加`independent-gate-revocation-client.mjs`：精确audit UUID、幂等request UUID、reason和Reviewer binding引用才可发往HTTPS独立撤权服务；严格拒绝URL凭据/查询、过大或错身份回执、未授权和非JSON。返回只作为服务回执，消费时仍须查询当前合法资格。旧Operator HTTP接口保持503，**不连接该客户端**，防止Operator借传输模块成为Reviewer。`c3ef1095`补合成正反node:test。此项仅为候选客户端与合同测试（`CODE_PRESENT/CI_PENDING`），没有真实独立服务、Reviewer登录、签发、撤权或生产Gate激活；后续服务端必须在独立身份下调用现行`control.revoke_gate_qualification`，并核验端到端即时消费拒绝。

**2026-11-03 M3独立Reviewer服务处理链候选**：核对现有`packages/data-access/src/gate-authority-repository.mjs`已有`createGateAuthorityRepository.revoke`，可在专用Signer低权限连接、短时Reviewer身份事务中调用唯一`control.revoke_gate_qualification`。据此`2d166d74`新建独立服务的受审请求处理器，要求独立authenticateReviewer实证（不是普通Operator），精确audit/request UUID、理由和绑定，复用已有仓储而非第二套SQL；`328f3bfe`补合成客户端→服务处理器→仓储调用及伪造身份/错绑定/DB失败拒绝。原SQL仅返回blocked_count，没有事件UUID，`7ac30843`修正客户端不要求服务伪造事件ID、以request UUID做现有不可变审计检索键；`d28ebbb6`、`f9752f29`严格匹配Reviewer binding回执。**尚缺独立Reviewer鉴权实现与独立服务实际部署、专用DB登录/数据库RLS实测及当前消费重核**；旧Operator路径仍503。本批属于代码候选及待核CI，M3/M5正式G资格保持HOLD。

**2026-11-03 M3独立撤权服务限额与CI入口**：`6c46a6e1`修正处理器读取完整请求后才检查4096字节的缺陷，改为按块限制、超限413/非法400并确保未写DB；`d93b841c`补异常Content-Length、超大body、畸形JSON/方法负例；`c99d952c`新增`mab-m3-independent-revocation.yml`纯Node22协议测试工作流及禁止直接写Gate静态检查。最新代码与自动测试入口已提交，但需取得实际GitHub Actions SUCCESS才能认隔离合同测试PASS。独立Reviewer、专属PG身份、线上撤权与M5消费实时资格仍HOLD，不能提前启用。

验收：合法独立审签可追溯；生产者自签、旧PASS泛授权、错rev、过期依赖、禁用Job均拒绝。策略的真实启用须有单独明确范围，隔离测试通过不等于正式投运。

回退：暂停新run/候选/资格激活，保留所有审计；不回滚已发生的合法撤权。

### M4｜混合Agent与Studio长流程

**2026-11-04 当前施工增量**：M3有效L1/G1输出已接入Owner永久委托回执的逐项T7只读检查，祖先撤权后同回执立即拒绝；选定回执可经既有Owner GET查看缺口，Web无Producer凭据。unit332/4既有SKIP、边界133、实际PG17、类型/构建通过，见 `tasks/results/MAB/CODEX_M4_RECEIPTS_20261104.md`。此批只闭合第2/4/5项之间的接线，T2—T6未验、整体HOLD、UNKNOWN费用不补零；**M4继续当前施工且未整体准出**。

**2026-11-03 接续准入裁定（按受控任务书§4／§10，非阶段PASS）**：

- **M4代码级并行准入：允许**。在M2私有原件和M3独立Gate仍HOLD期间，可有界施工同root/subtask任务模型、DelegationEnvelope／ExecutionReceipt不可变合同、T1—T7候选校验、权限与预算失败关闭、Studio真实状态及跨会话恢复。上述开发只能以合成/隔离测试判证；不能标记真实外部委托或正式知识增长已运行。
- **M4真实双主体调用准入：未满足**。需先取得M1合法Owner会话与素材导入/回读及撤权的可核证安全验收；M2 Owner私有原件真实字节→D01读取单元→D02证据→D03主张的Registry/Runner合法接线、隔离PG/Storage正反联调及真实授权范围；M3独立Reviewer服务、当前资格/撤权、用途/消费者/精确修订与编排器的真实验证。外部AI另需Owner已批准的原件外发范围、Provider和预算，不能以旧额度或模拟回执替代。
- **M5并行边界：允许低依赖实现，不许提前发布**。Studio草稿/版本视图、F05内部知识条目只读检索、WATCH空态和旧UI防退化可以与M4开发并行；依赖独立G5、媒体许可或发布指针的真正公开消费仍须待M3/M4验收。
- **本轮观察依据**：main最新查询为`acfe2874`；M2来源窄RPC隔离PG17回执`41576958641` SUCCESS；M3只读资格客户端回归`41579537812`、`41579907762`、`41580080729` SUCCESS；M1四项匿名生产HTTP验证`41580710096` attempt 2 SUCCESS。均为限定证据，不能代签M1/M2/M3；生产Registry仍`DESIGN_TARGET_NOT_APPLIED`、全局与六Job disabled。
- **接续施工顺序**：①M1本人登录/导入/读取及撤权证据独立收口（旧密码先核既有失效回执，不要求默认重置）；②M2合法Owner私有会话与D01—D03 Registry/Runner接线及隔离整链；③M3独立Reviewer服务真实可验的资格/撤权闭环；④并行M4长期委托/回执与T1—T7合成正反测试；⑤仅在合法外发许可、真实Provider与费用界限及前述能力到位后进行M4双主体真实验收。M2/M3生产迁移、Gate激活及外发仍按既有独立授权执行。
- **回执规则**：本段仅是`M4_CODE_PREPARATION_ALLOWED / M4_LIVE_EXECUTION_HOLD`的依赖归位，不更新`CURRENT.md`，不勾选M4任务复选框。下一代码批次必须另在`progress.md`与`target-diff.csv`登记commit/测试/NOT_RUN及回滚。



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

### 2026-11-05｜M5全量清单复核与独立READY施工（本条为本轮现行核销，不改变原准出）

**最终核证**：eec13b2主CI42037766176 SUCCESS（571单测/4旧SKIP、133边界、14Skill、类型/Build/鉴权），HTTP42037766124 SUCCESS（24PASS/1StorageSKIP）；PG42035692988按未变的22b8c1c继承。精确SHA、失败历史、实际范围及回退见原回执§7.4。所有未达原准出的行仍不勾选。

基线main `7246ec0eb0ed8f45e1e64610e790b99b4b6f18fa`；不重复M0—M4/云端无原件调查。原work@759dbbd与已有成果保留；本轮原独立副本连续批次、无强推/生产改动。以下按M5六项原分母核销，checkbox仅在完整准出时才勾选。

| 原M5项/依赖 | 本轮已施工及实际证据 | 剩余分类、真实条件及代码完整度 |
|---|---|---|
| 1 H1/H2/H3、19组件、真实研究到创作 | 修复H1有效母题/必填边界、H2/H3结构/时码/引用校验；WorkRevision保全完整H1；项目只读snapshot+精确ref/content SHA接入导演请求；WATCH出处/缺口交互；相关单测及Chromium通过 | ST02真实L0/L1/L2/首读/回放/撤权=DATA_BLOCKED，非新PASS。ST03/04严格依赖未启动。ST05受控模型执行适配**工程未完成**，并缺真实每源外发权、provider/purpose/input绑定及支出授权：不得把它包装成仅数据阻塞；已集中失败关闭，只有获得可信授权源/契约后才能接通，不允许API key自授。H1专业45项/H2七判断/H3真实作品与异材料=DATA/GATE/OWNER_BLOCKED，不能由结构测试代签。 |
| 2 创建/提交/修订/CAS/幂等/失败语义 | 继承已验创建/提交/导演CAS/fork/restore；局部patch严格字段/类型/索引/时码、禁止改引用，全部改稿入口400/no-store；修复stages全库导演笛卡尔泄露，精确work_revision.director_source.plan_id及Owner关联；不再以task.done推定research完成 | 隔离工程正反已验；真实全链作品及Owner体验仍DATA/GATE/OWNER_BLOCKED。私有保存不等于历史语义通过。 |
| 3 F05条目/修订/来源/用途/使用史/缺口 | Admin展示实际validation/findings/permission_scope/use purpose/time/revision，缺值明确；显式browse搜索/稳定游标，默认ST02行为不变；真实PG101资产无遗漏/重复、精确搜索、跨Owner/跨项目游标拒绝通过 | 13类10+3已有矩阵继承，未补造全专业语义。合法跨项目复用、真实来源解引用/数据主体同意证据=DATA/GATE/OWNER_BLOCKED。Operator跨项目业务授权未核，不能自扩权限。 |
| 4 Operator+精确rev+G5/rights+事务 | 继承独立审核/发布资格桥与原子指针；遗漏旧撤权申请改503/no-store而非假成功；media-selection原POST只返候选假成功改明确HOLD/零写；主Studio去掉preview假work ID并显式目录失败/候选身份 | 正式Reviewer/G5、生产身份/权限、真实媒体动作级权利=GATE/OWNER/DATA_BLOCKED。canonical选材动作当前只具拒绝路径，真正写入绑定/权利适配尚未完成，不以status=verified授选材权。调度表风险仍独立跟踪，不执行RLS/GRANT。 |
| 5 WATCH/Evidence/visual_stage/Agent逐请求 | a001五个活动读取改qualification_current+既有qualification_allows，按用途/scope/display，agent许可不借舞台；共享媒体rights判定拒绝未清权/过期；研究材料/status/幂等重放重验当前私有/qualified资料，旧CP不是许可；GET重验不生成note | 公开Evidence等已验Guard继承。真实G5消费正链=GATE/DATA_BLOCKED；不得用合成授权代生产。当前章出处仅发布版本文本，不伪造原件URL/精确locator或Evidence详情成功。 |
| 6 撤权/缓存/即时原件 | WATCH切作品/章/自动翻页/focus/可见性及15秒周期重核，错误清空停播，旧响应不覆盖，长章节计时保持；5条真实Chromium正反PASS；私有preview、材料/status/stages/改稿均no-store | 浏览器周期重核为15秒+请求耗时(10秒超时)，不是严格瞬时撤权或擦除已交付字节。原件逐请求代理已有M2工程证据继承，真实原件即时拒绝=DATA/GATE_BLOCKED。 |

**READY工程成果提交**：Admin `51f1234`；合格消费/WATCH `82afee6`；Studio/当前材料/作品边界 `14b4d2c`。本轮完整检查结果与最终精确CI在原progress/回执收尾，不由本表冒称生产准出。**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**；仍有以上已明示工程适配未完成，不能将本次检查点叫“M5全量完成”。

**2026-11-05 环境核实后的 ST-02 执行分支（不改变 M5 顺序/准出）**：Supabase `mohen-cloud` 只读实测 bucket=0/object=0、private_originals不存在、98来源记录/93 memory。云端真实原件链为 `DEFERRED_DATA`；现有M2本地合成Storage工程证据继续继承，不能代替云端历史原件。VM缺应用DB/私有Storage配置及已配置隔离实例；Owner本机原件未核，5个仓库JPEG路径不等于项目授权隔离原件。后续只在来源位置/原字节/权利/Owner项目/隔离DB与Storage授权齐备时转 `READY_FOR_ISOLATED_REAL_BYTES`；数据存在但缺配置转 `NEEDS_OWNER_CONFIGURATION`；仅本机有原件转 `LOCAL_ONLY` 并由CodeBuddy读取本机授权文件，数据库权限另配。不得把现有synthetic-only HTTP runner接到真实数据或生产库。无真实原件时保留SKIP/HOLD，不重复试错；ST03仍不启动。具体重入条件与回归断言见progress最新检查点。

**双线持续继承**：CTX-ENG的工程诊断/施工/测试/接续/经验与产品Skill并行；现有v0.2.0及受控CLI不重写。DS03已有5回执/3草案，仅显式脱敏输入和精确签名分组，自动采集、语义发现、自动评价准入/版本演化未完整实现。产品保留生产D00—D05/L0—L5/G0—G5、Studio研究导演编排创作、WATCH合法作品消费、EXP开放探索与连续认知；按MHKA-02/04和既有Registry/合同，不复制平台。EXP保留S01空间入口/S02时空追踪/S03关系/S04典籍材料/S05返证/S06叙事/S07编排/S08当下联系，跨域比较、连续追问、版本化返回和证据缺口列入原准备/延期责任；不要求完整知识库先行，也不启动暂停的UXD-01/完整EXP。产品经验供开发Skill吸收，开发Skill未完备不阻塞合法M5工作。

**独立安全跟踪：publication.publication_schedules（沿现有HP02/HP12责任，非新阶段）**：只读核实RLS=false、0策略/0行；anon/authenticated/service_role/authenticator均无schema USAGE及表读写，当前未证外部直接可访问；全有效权限还含平台管理/全库读写角色，不能只报显式postgres。实际调用经Operator守卫的安排/取消POST及Admin GET惰性处理→既有data-access→数据库，发布重验G5/rights。实时Data API暴露配置和部署DB角色尚未证实，保持风险未闭合、独立不阻断M5。先核业务角色/全局Operator职责和暴露，再在隔离库验证最小GRANT/RLS及回滚提案；未获生产授权不执行DDL/GRANT/策略。回归要求及条件化最小修复见progress；不把RLS开启本身等同安全PASS。

> **2026-11-05｜M5/ST-02 外部来源能力缺口候选登记（Owner批准，仅登记，非施工启动）**：来源能力候选 **RAD-014 · OpenSH-mcp**（上游 https://github.com/FreyaBit/OpenSH-mcp；Owner Fork https://github.com/xiezuojie03-web/OpenSH-mcp；两库 main 在核查时同为 `707f4fbb464d1748b3a0da5b7ab0d70d256243ea`）。源码封装12个MCP工具/99个登记API，潜在补齐上海图书馆历史书目、地名、建筑、家谱、舆图、人物与纪年检索；**只复用现有** `sources/registry.json#shl-open-data` 与 `specs/data-production/source-providers.json#shanghai_library` 的来源身份，作为MHKA-04 Tool/Adapter扩展候选，不新增第二来源Registry、Skill、正式生产链或Gate。当前缺口为：M5/ST02真实资料可得性/Provider合法调用与证据精确定位尚未验证；OpenSH所登记接口可用性、API key、数据许可及PDF字节/locator、远程HTTP鉴权均未通过墨痕实测，项目现有 `SHANGHAI_LIBRARY_KEY` 与MCP `SLC_API_KEY` 映射待评估。**执行边界**：本次 `INTELLIGENCE_ONLY / M5_SOURCE_GAP_CANDIDATE / E2_SOURCE_READ / NOT_INTEGRATED`；不得修改现有Provider/Registry运行配置、启用网络外发或收费、上传私有原件、部署远程MCP，也不改变ST02现行修复和验收顺序。仅当原M5/ST02真实来源需要且授权/隔离条件具备时可选少数只读接口验证；合格后纳入原M6合同回归、M7真实双课题，不提前宣布M5、D00—D05/G0—G5或任何正式生产Gate通过。情报唯一索引：ChatGPT资料库平行目录 `/墨痕外部技术情报/01_墨痕外部技术与专业能力候选目录_现行.md` 和 `02_候选台账_现行.json`（`RAD-014`）。

**2026-11-05 M5/HP11局部实码核销（不改本阶段勾选状态）**：现有私有`studio.asset_heads/asset_revisions`增加`consented_feedback`明确同意声明检查、Owner不可变撤回修订/并发幂等/历史正文API脱敏，Admin现行条目两步撤回；源码`17b9863e`→`eaf1515f`／HTTP测试`000327ca`。主CI[41950478739](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41950478739)、隔离真实HTTP[41950478723](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41950478723)均SUCCESS（447单测、133边界、Chromium18PASS/1StorageSKIP）；详见`tasks/results/MAB/CHATGPT_M5_FEEDBACK_CONSENT_20261105.md`。仅私人候选声明/撤回`VERIFIED_ISOLATED`，不代表真实数据主体同意凭证、物理删除、外部传播撤回、正式G5或全13类专业完成；**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**，原M1—M4所有生产固定条件不变。

**2026-11-05 M5/ST-01项目绑定Brief正向子项（不改本阶段勾选状态）**：按AGENT专业能力合同§6.2，Studio主入口增加Owner项目选择/创建；ST01请求要求project_id+幂等UUID，服务端解析项目scope；在runResearch前先写入现有studio.asset_heads/asset_revisions的research_brief@rev，origin_task_id/snapshot纳入hash；同key回放复用同task/rev、不同输入409，resume/follow-up保留brief lineage。关键源码82c78ce6、94ac574d、cdb330af、1636be11/c0f3c3f0、33491000、7bab9bf6；E2E 465d3862，单测夹具0956cf73。真实PG17+Chromium [41956024859](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41956024859) SUCCESS（ST01标记、18PASS/1官方StorageSKIP、合成DB清理）；最新主CI [41956280247](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41956280247) SUCCESS（447单测PASS/4既有SKIP、133边界PASS、Build、目标审计errors=[]）。详见tasks/results/MAB/CHATGPT_M5_ST01_BRIEF_20261105.md。只核销ST01 Brief项目绑定/不可变持久/幂等回放VERIFIED_ISOLATED；Agent资料可得性/问题收敛仍因Provider/来源/资格不足HOLD。ST01路由不再自动触发ST04；现有production路由仅GET状态，ST04显式请求动作仍待按序实现。ST02—04、13类完整专业语义、H1/H2/H3/19组件、独立G5均未准出；**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**。


**2026-11-03 M5并行施工实际增量（非准出）**：按既有允许低依赖实施的边界，`64cdb2e6`将已提交修订→发布指针改为同一条SQL原子操作，并对并发状态变化返回明确拒绝；`3eca7df3`新增原子发布与写失败单元测试。`e9bde789`补WATCH旧指针修订非published时的过滤，`68b334bf`补对应合同测试。现为`CODE_PRESENT / CI_PENDING`，不等于完整Editor→Admin→G5→WATCH实时撤权闭环。仍须精确G5/consumer/rights验收、媒体许可与当前资格逐请求核验、真实PG事务及完整作品E2E；M1—M4独立门槛保留。实际执行回执见`progress.md`。



**2026-11-03 M5精确修订审核竞态增量**：`c0fa6c04`使发布始终使用同一次资格检查的精确WorkRevision，并在同一原子SQL中复核最新作品Reviewer决定仍approved且绑定该修订；`afa2f590`补相应竞态拒绝单元合同。此Reviewer审核**不是**原D/L/G链的独立知识G5，真正正式发布和WATCH逐请求合法消费仍必须另核当前独立G5、精确revision、用途、consumer、rights及撤权。提交与测试证据限于源码及待核CI，M5`CODE_PRESENT / TEST_PENDING`而非准出。

依赖：M2—M4。

- [ ] H1/H2/H3与19组件绑定真实研究来源、导演、创作、修改与保存；同一作品母本，不复制第二正文。
- [ ] 创建/提交/修订保持包内既有wire兼容与显式例外，CAS、创建幂等及存储失败不误报成功。
- [ ] F05 Admin接内部授权条目视图，能查来源、精确修订、证据链、用途、使用史和缺口；保留原运营功能。
- [ ] 出版检查Operator权限、精确WorkRevision、独立知识G5与媒资许可；状态和发布pointer采用事务或可验证补偿。
- [ ] WATCH、Evidence on Demand、visual_stage和Agent消费者每次读按当前用途/consumer/rights核查；各消费者不能互借资格。
- [ ] 撤权立即阻断受影响分面，清理可控缓存；严格即时撤权原件采用逐请求代理等可证方案，短签URL不能假称即时失效。

验收：编辑→投稿→审核→发布→WATCH读同rev；并发/重复发布、部分失败、旧pointer、媒体撤权、错consumer、匿名读私有原件均有拒绝证据。合法章节可局部保留。

回退：维持仍合法旧版；关闭受影响新发布/分面，不清除已存合法草稿，不复活已撤权缓存。

### 2026-11-06 Owner裁决｜M5完整垂直切片与模型/API调用授权（优先于此前单次OCR待授权）

**M5完整验收定义**：至少完成一项真实历史文化作品的端到端产品垂直切片：自然语言Brief → M4混合Agent/外部AI受控协作 → 合法来源与真实原件读取 → D00—D05/L0—L5/G0—G5生产链 → 13类知识资产沉淀 → H1/H2/H3及19组件参与创作/修订 → F05 Admin逐条管理 → 独立G5与媒资权利核验 → 发布精确WorkRevision → WATCH消费同一修订并验证撤权。M4负责混合协作基础，M5负责Studio/Admin/发布/WATCH产品闭环并真实消费M4；M6仍是85 API/152动作全量合同回归，M7仍是KAD5双课题真实验收/跨题复用，M8仍是正式架构切换与Owner签收。M5完成一项真实作品全链，不提前吞并M7/M8。

**Owner API授权**：Owner授权M5必要开发、隔离测试及受控真实研究使用现有已配置API密钥/Provider凭据，包括大模型调用；已配置Provider在M5范围内的必要低成本调用不再逐次重复请示。若需要新的专业模型、Provider账号/密钥、订阅/额度/充值或明显扩大费用/批量调用，及时向Owner说明具体能力缺口、候选、权限和费用。密钥只在受控服务端Secret使用，不写入仓库/提示词/日志/聊天或客户端；调用须绑定来源权利、purpose、provider、input manifest、预算/实际费用和持久回执。Owner授权取代此前单次DeepSeek OCR等待，但不替代第三方来源权利/数据主体同意/Provider条款，也不授权生产DB/Storage迁移、正式Reviewer/G5启用或生产发布。

**全链实验硬门槛**：不得在关键组件仅有结构/静态代码、恒HOLD、stub/mock、关键HTTP/PG未运行或关键Storage SKIP时启动真实全链实验。当前ST01 Brief项目绑定已VERIFIED_ISOLATED；ST02真实原件字节未持久化、L0/L1/L2未验；ST03/04未准出；ST05受控模型执行适配尚未实现（directorExternalProcessingBlocker恒HOLD，M4委托仓储仅持久化、不派发Provider；现有Tool Ledger以credit计价，尚非真实Provider成本）；H1/H2/H3与19组件只有结构/部分交互证据；13类10+3矩阵不等于完整专业语义；正式G5/Reviewer和canonical媒资动作仍HOLD；M4真实双主体仍受M1—M3真实Owner/原件/独立Reviewer条件约束。详细逐项状态及执行顺序见progress.md本裁决记录。

**执行要求**：采用两条可并行的工程线，避免等待循环：A线补真实原件/私有Storage及ST02 L0→L1→L2首次/回放/撤权；B线在既有M4委托/Tool Registry/预算/回执/权限体系内完成ST05受控Provider执行器，并先以合成输入完成代码/PG/HTTP正反测试与真实费用核销。B线代码施工不等待A线原件，但A线来源/权利及M1—M3真实前置未就绪前，不得向真实材料发起外部模型调用。A/B就绪后按ST03→ST04完成真实候选分析与Creator正式请求；继而完成13类专业语义、H1/H2/H3/19组件、Admin、独立G5/媒资权利、精确修订发布及WATCH撤权。所有关键路径代码、接线、权限/数据、PG/HTTP正反及真实输入就绪后，才进行一次真实作品全链实验。此裁决不勾选未完成项，不改变M0—M8阶段顺序或既有安全/Gate/生产条件；M5仍HOLD直至原验收全部满足。

### 2026-11-06 Owner裁决｜以M5真实作品验收反推M0—M4缺口并逐项补齐（本计划唯一执行标准）

**本节是下一步施工的直接依据，取代继续讨论历史原因。** 目标不是重开M0—M4，而是从M5真实作品全链验收反推必要条件，继承已完成的源码、合同和测试，只关闭尚未满足的缺口。

**M5真实验收场景边界**：至少一项真实历史文化作品，在受控、隔离的非生产环境中完成完整垂直切片。必须使用真实合法史料字节、真实Provider调用、墨痕Agent与外部AI真实互补、真实D00—D05/L0—L5/G0—G5链路、真实知识资产和作品修订；不能以mock、合成业务材料、静态页面或单项CI替代。隔离环境中的受控发布和WATCH消费可以作为M5验收；不因此授权生产DB/Storage迁移、生产Gate启用或公开生产发布，后者仍属M8及原独立授权范围。

#### A. 从M5反推M0—M4的必要缺口

| 上游阶段 | M5真实作品所依赖的必要条件 | 当前继承证据与未完成点 | 补缺完成证据及边界 |
|---|---|---|---|
| **M0** | 唯一工程基线、目标分母、源码路径和证据索引 | M0审查级EXIT_PASS已完成；234路径、74目标、85 API、152动作及差异账已有基线 | **不重开M0、不重做全量盘点**。只在发现具体源码/目标冲突时，按受影响条目定向更新PLAN、progress和target-diff |
| **M1** | M5实验环境中的真实Owner会话、项目/用户最小权限、私有资料访问、禁用/过期/跨Owner拒绝、退出撤权和实验数据恢复 | 签名身份、Owner事务/RLS及多项隔离PG/HTTP证据可继承；M1-C01—C04生产条件仍未全部核证，M5实验所需的真实Owner会话与受控环境端到端证据尚未形成 | 在**非生产隔离环境**完成真实登录→本人项目读写→跨Owner/匿名/禁用/过期拒绝→退出后旧会话拒绝→隔离备份恢复；实际Web/worker DB身份与最小权限可核。该证据只满足M5实验前置，不把M1生产C01—C04改成PASS；历史凭据失效、生产切换和生产恢复仍按原时点/M8处理 |
| **M2** | 一份合法原件的真实字节可持久化、回读、hash校验、精确定位；完成D00来源登记、D01载体读取、D02证据理解；首次/回放/撤权均可验证 | UTF8持久候选和隔离Storage/PG工程证据可继承；上图《金泽小志》本轮未命中开放PDF目录；NAJ《松江府志7》权利和IIIF manifest已核，但当前仅有临时派生页、未持久化；Storage生产桶仍0；ST02 L0/L1/L2未完成 | 在隔离私有Storage中持久化一份经权利确认的NAJ原件页/页组（遵守单件10MiB限制），保存source/version/canvas或页码/locator/hash/rights/provider/method；实际回读字节与hash一致；跑L0→L1→L2首次、同输入回放、撤权拒绝的PG+HTTP正反。不得把临时下载或目录元数据当原件PASS；生产桶/迁移仍需独立授权 |
| **M3** | 原D00—D05生产链能接收M2真实输入并逐阶段产生精确修订；G0—G5由独立Reviewer/服务签发、撤权和当前资格消费，不由Producer/Agent/Operator自签 | 独立Gate客户端、服务处理器、专用角色与部分隔离PG/HTTP工程可继承；独立Reviewer真实鉴权/正式部署、真实材料全链D阶段、真实专业资格签发与撤权恢复仍未完成 | 在M5隔离实验环境完成真实原件从D00—D05的阶段接线与输出引用；独立Reviewer身份真实认证，逐阶段Gate绑定source/revision/input/output/purpose/scope/consumer；Producer/Operator不能代签；通过有效、拒绝、过期、依赖撤销、恢复不复活的PG+HTTP正反。此处是隔离实验资格，不授权生产Reviewer/Gate启用 |
| **M4** | 同一root任务中，墨痕Agent与外部AI均有可证明的互补贡献；Provider真实派发、逐源外发授权、实际成本、永久Receipt、失败/未知费用HOLD和跨会话恢复 | Plan/Delegation/Receipt/T1—T7候选收包与隔离协调基础可继承；M4真实Provider dispatch尚未完成，外发DENIED/预算0，真实混合仍MIXED_NOT_VERIFIED；内部credit不是Provider实际费用 | 在既有M4委托、Tool Registry、权限和账本内完成受控Provider执行器；先以合成输入做PG/HTTP正反，再在M1—M3真实前置满足后用合法最小材料执行真实调用。Receipt记录同root/subtask、Provider/model/version、input manifest/hash、purpose、rights decision、allowed actions、token/用量、实际币种费用、输出hash、失败与成本终态；真实超时/不确定费用/中断恢复不自动重试、不补零。不得裸调脚本绕过Guard |

**重要边界**：M1—M4原有生产固定条件和最迟关闭点不因M5实验而取消。M5只需先具备上述受控隔离实验的等价条件；不能把隔离证据升级成生产PASS。M2-C03跨项目授权复用按真实使用范围关闭：M5至少验证同项目精确revision、来源引用和use_events；跨项目复用的完整正反验收在M5确实使用时必须完成，否则保留至M7，不得伪造使用事件。

#### B. M5八个维度的唯一验收矩阵

以下八项必须由**同一项真实作品**贯通；各项可分批施工，但最终不能用八个互不相关的演示拼成PASS。

| M5维度 | 对应既有合同/动作 | 当前状态 | 必须补齐的真实验收 |
|---|---|---|---|
| **1. 自然语言创作入口** | ST-01 CreateWorkBrief | Brief项目绑定、不可变修订、幂等/恢复已有隔离PASS；Agent资料可得性和问题收敛仍HOLD | Owner以自然语言提出真实问题；Agent读取项目授权资产、判断资料可得性、收敛问题并形成可追溯Brief/Plan；失败原因和继续条件可见 |
| **2. 内外AI混合协作** | M4 Delegation/ExecutionReceipt、ST-05受控执行 | 未完成真实Provider派发与双主体互补 | 同一root下Agent和外部AI分别产生可核验贡献；真实Provider、合法最小输入、实际成本、永久Receipt、失败/恢复均闭环 |
| **3. 真实来源、证据和D/L/G生产** | ST-02/03/04；D00—D05、L0—L5、G0—G5 | ST02真实字节未持久化；ST03/04未准出；正式独立资格未就绪 | 从原件来源到读取单元、证据、主张、人文解释及合法消费分面，所有阶段有精确source/version/locator/revision和独立Gate回执；原文、转引、模型解释、推断分层 |
| **4. 13类知识资产沉淀** | R4.3资产合同、M4-C04、Admin | 10类私有候选+3类规范对象有持久化/权限矩阵，不等于13类完整业务 | 13类各自的字段、创建/修订、状态、来源/权利、ACL、幂等/CAS、引用和失效规则均有真实业务正反验收；真实作品只沉淀研究实际产生的类型，不为凑数伪造资产；不适用类型须说明原因 |
| **5. Studio真实创作** | ST-05/06/07；H1/H2/H3与19组件合同 | 结构/时码/引用校验和部分交互已验；没有真实研究驱动的完整创作 | H1/H2/H3实际参与导演、叙事、镜头/材料组织；19组件按真实作品内容逐项验证；创作者可预览、局部修改、保存/恢复并形成不可变WorkRevision |
| **6. Admin知识资产管理** | F05 Admin；ST-07/08/09关联 | 条目、历史修订、部分use_events已有隔离能力；13类专业语义及全链来源仍不完整 | 对同一作品实际形成的知识条目逐条显示类型、内容、认识状态、精确来源/locator、D/G资格、权利/用途、版本、研究贡献、被何处复用及缺口；仅授权Owner可执行相应管理/撤回动作 |
| **7. 独立G5、媒资权利与发布** | ST-08/09；独立Reviewer/G5、canonical media rights、精确WorkRevision | G5桥接和部分ST08/ST09隔离证据存在；正式Reviewer未启用，canonical media-selection POST仍HOLD/503 | 独立Reviewer对精确WorkRevision及其知识/媒资依赖作当前资格审查；媒资逐动作权利明确；发布指针原子指向该修订；退回、通过、发布、撤回均有真实正反证据 |
| **8. WATCH同修订合法消费与撤权** | WATCH、Evidence、visual_stage及所有公开消费者 | 部分消费者PG/HTTP已验；当前约15秒周期重核不等于严格即时撤权 | WATCH只消费第7项发布的同一WorkRevision；每次新请求核当前G5、rights、purpose、consumer、scope和source；撤权后新请求立即拒绝、可控缓存失效、原件字节不经长期公开URL泄露；已交付字节的不可逆边界如实说明 |

**13类和19组件的验收口径**：13类必须全部完成类型级业务合同与正反测试，但真实作品不强制生成不符合研究语义的资产；19组件必须逐项证明在真实作品内容中的职责、输入输出和交互，不以组件文件存在或静态截图代替。H1/H2/H3的专业判断按现有合同执行，不另造方法编号。

#### C. 按依赖顺序补缺，不再反复重开阶段

1. **冻结M0基线**：继承M0_AUDIT_EXIT_PASS和已有234/74/85/152差异证据；不重做盘点，只处理M5反推发现的具体差异。
2. **先关闭M1的M5隔离实验前置**：真实Owner会话、最小权限、项目ACL、撤权/旧会话拒绝和隔离恢复；生产C01—C04仍按原规则管理。
3. **再关闭M2的真实原件链**：沿已选NAJ《松江府志7》完成合法页定位、真实字节持久化、L0/L1/L2首次/回放/撤权。不得再次把来源搜索、容量核验或临时sandbox下载当作本阶段完成。
4. **接着关闭M3的真实D/G链**：让同一原件沿D00—D05运行，并在隔离环境完成独立Reviewer、G0—G5签发/撤权/当前资格消费。不得用Producer/Operator模拟Reviewer。
5. **再关闭M4真实混合协作**：既有执行器/账本代码可先用合成输入补齐；真实调用必须等M1—M3的材料、权利和资格前置完成，再以同一root完成Agent+外部AI互补、费用、Receipt和恢复。
6. **按ST-01→ST-09完成M5真实作品**：ST01已通过的Brief持久化/幂等子项直接继承，只补Agent资料可得性和问题收敛；随后ST02→ST03→ST04→ST05→ST06→ST07→ST08→ST09。Admin在知识资产产生时同步验收，WATCH在合法发布后验收。
7. **只做一次完整端到端验收**：上述关键链路的代码、接线、权限、真实输入和PG/HTTP正反证据齐备后，运行同一真实作品全链实验；逐项填写本节八维矩阵，全部通过才签M5。M6的85 API/152动作全量回归、M7双课题跨题复用、M8生产切换仍保持原边界。

**执行纪律**：
- 允许不互相依赖的代码施工并行（例如M4执行器先用合成输入开发）；真实数据调用和阶段验收仍按M1→M2→M3→M4依赖顺序，不得越过前置。
- 任何已通过且相关源码/合同未变化的测试直接继承；只重跑受变更影响的回归，不从M0反复重审。
- 每关闭一个缺口，必须在本PLAN对应任务/矩阵中更新状态，并在progress记录commit、环境、POS/NEG/AUTH、真实输入、回执和回滚；target-diff只更新对应路径证据。
- M5真实作品实验使用隔离环境，不要求提前执行生产迁移/公开发布；生产固定条件仍留在原责任节点，不得用M5隔离PASS销账。
- 当前M5仍为`M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`。本节只确立从M5反推的施工与验收路径，不把任何未完成项预先标PASS。

历史复盘材料仅供追溯：[M5/M0—M4阶段准出复盘](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/tasks/results/MAB/M5_M0_M4_GATE_RETROSPECTIVE_20261106.md)。它不是任务书、执行计划或验收标准；本文件本节才是本轮Owner裁决后的唯一执行依据。


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

### M8｜生产授权切换、发布与交接

> **2026-11-05 Owner 纠偏**：六 MHKA 已是本轮全部工程施工的唯一设计权威，根 AGENTS 不得继续以旧 C0—C4 为默认入口。**M8 所等待的是正式生产激活、旧代际运行退役及交接，不是 MHKA 开始指导开发的时间。** 所有未准出项仍 HOLD，M0—M8 施工阶段不变。

依赖：M6/M7结果及具体投运范围审定；若仍有延期项，交接明确为核心范围阶段交付。

- [ ] 形成可审阅发布包：准确commit、构建/测试报告、Schema差分、备份ID、恢复实测、权限/策略清单、风险与回退触发条件。
- [ ] 对权威入口切换、真实DB/Storage变更、Gate启用、远端推送/合并及生产部署分别记录既有或新增授权范围。
- [ ] 核实已纠正的 AGENTS→MHKA 工程设计路由；C0—C4 **治理文档**已按 `governance/archive/C0_C4_TO_MHKA_ARCHIVAL_20261105.md` 在 M5 并行只读归档，不再把文档整理重复列为 M8 待办。**正式生产运行资格、旧运行代际与权限/数据/兼容路径的退役、剩余只读运行资料归档**仍由 M8 受控切换与回退，不双活。
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

## 6A. Owner裁决｜优先聊天插件施工，单次CodeBuddy交接（2026-11-03）

本节是Owner对**工程执行方式**的明确裁决，不改变M0—M8的任务范围、设计标准、MHKA或阶段Gate。此前分批提交GitHub仍继续，但**不在每一轮小批次后重复要求Owner向CodeBuddy迁移**。目标是聊天模式经已连接GitHub等插件尽量实施到可验收程度，最后才集中移交环境依赖的实操任务。未获证据的项目继续HOLD，禁止因“一次性交接”虚构已经准出。

### A. ChatGPT聊天插件执行责任（先做完能做的）

- 直接读取最新main与受控任务书，逐项做源码、契约、最小迁移/回滚候选、自动测试、CI工作流、Vercel只读状态审查及允许范围内的可逆安全修补；测试用匿名/合成、一次性明确标记的隔离PG/Storage，真实用户和生产密钥不放进源码、任务书或日志。
- M1优先关闭匿名/合法合成用户/跨Owner/禁用/登出/恢复等可自动化项目，取得**真实测试回执**而非只建测试脚本。M2集中接完私有原件→现有D/L链→唯一Runner的可信身份和候选/资格交接，严格不能开放legacy私有输入；M3独立资格读取、签发身份隔离和撤权的服务/DB合同、正反测试；M4同root双主体账、T1—T7、成本与回执失败关闭、跨会话恢复；M5 Studio/H1—H3、F05内部知识条目、同作品修订、合法发布/WATCH状态与动态消费授权。
- 不能因为缺生产身份就暂停其它不依赖的工程项；必要时对M1—M5按功能垂直切片并行，保持每次commit、正反测试、环境、前后SHA、回滚、HOLD、未验收责任可追溯。
- 只读核对GitHub Actions及部署结果；部署READY不能替代测试、隔离PASS不能代签线上Gate。严禁无明确范围许可地轮换生产密码、执行真实DDL、创建生产Owner、发送私有史料给外部模型、生产Gate签发/撤权、发布任何新增公开内容。

### B. 最终只移交确实无法在聊天环境安全完成的工作

- 需要合法生产Owner/第二账号交互、安全凭据失效证明、真实生产备份恢复/受控窗口、官方私有Storage凭据或不可被当前工具读取的本地文件、独立Reviewer签名身份、真实Provider原件外发许可/预算审批、完整浏览器人工体验签收的项目，逐项说明**为何插件无法执行**，不能把普通源码工作打包转交。
- 未得到授权或尚不具备外部条件的事项必须保留HOLD，CodeBuddy也不得被指令绕过。M1、M2、M3、M4、M5可分别达到代码或隔离证据准出，但各自生产级PASS必须按原专业条件独立签发。

### C. 唯一迁移时点与交付内容

- 在已连接插件可以完成的代码、合同、自动化正反测试、修复回归均实施，且实际CI/构建结果及其失败根因已充分核销之后，才形成**单一增量交接包**；不把完整仓库已有不变文件重新打包。
- 交接包应包含：①当前main准确SHA与目标SHA、变更/不变文件索引及冲突风险；②M0—M5逐任务的CODE_PRESENT、VERIFIED_ISOLATED、VERIFIED_LIVE、HOLD证据矩阵；③仅残余环境任务的逐条可执行指令、前置授权、POS/NEG/AUTH验收、失败关闭和回滚；④CI运行ID、日志/测试报告、受控DDL候选与版本依赖（如确有需要）；⑤唯一Owner验收清单和完成后更新既有PLAN/progress/CURRENT的规则。
- 迁移之前由ChatGPT做一次**双向对账**（任务→源码→测试→证据，以及源码→任务→授权→消费者）；P0/P1、测试失败与权限风险不得被掩盖。交接的目的，是让CodeBuddy完成**剩余实施和受控环境验收**，不是让它重研架构或再施工一遍GitHub已有合法变更。
- 本轮用户尚未要求生成迁移压缩包或启动CodeBuddy；不得提前交接。所有新增判断继续原位写回本任务书及`progress.md`，不另立冲突的权威体系。

## 6B. M0—M8交接前13工作包与单次CodeBuddy交接门槛（2026-11-03 Owner批准）

**性质与不变项**：这是对§5 M0—M8和§6A执行责任的有界收口编排，不新设阶段、不替换MHKA/D/L/G/KAD合同、不把既有仓库源码重新施工。13项为**工程工作包**而非13条新增Gate或13次对话。以main真实源码、实际测试回执和生产授权为准，执行中必须原位更新本计划、`progress.md`和74目标差异账；不能以设计文件路径存在、合成测试PASS或Vercel READY冒充正式功能准出。

**审查起点**：任务书原有M0—M8共53项复选任务（M0已完成6项，M1—M8尚未勾选47项），这47项**不是交接前必须全部完成的47项**；M6全量合同、M7 KAD5双题、M8授权投运属于交接后的验收和切换责任。74正式目标当前登记53项REVISE、21项CREATE，目标差异账中74项的语义验收均为未确认；目标路径存在≠语义等价，21个目标路径目前未在main的所列精确位置落地。M0审查PASS只证明审查准出；此前PG/Storage/Chromium/CI分批成果不得消失或在未重新运行时冒充最新main整体验收。

### 6B.1 十三个施工工作包及验证标准

| ID | 归属 | 聊天插件优先交付的成果 | 实际验收和待CodeBuddy环境边界 | 优先级 |
|---|---|---|---|---|
| HP01 | M1—M5/M6 | 核销最近源码对应的主CI、M1隔离HTTP、M3撤权、类型/构建；修复真实失败，保存SHA和运行ID | `VERIFIED_ISOLATED`仅对真实成功日志；若无Actions访问，标`CI_UNVERIFIED`并记原因，不随意填PASS | P0 |
| HP02 | M1 | 完成Owner/匿名/跨账户/禁用/登出/恢复的自动化正反测试，防旧附件入口放行 | 真实生产Owner、旧凭据失效、备用账号与生产恢复由有权环境按正式要求补验 | P0 |
| HP03 | M2 | 复用现有资产模型，核复合唯一、immutable revision、head CAS、links/use_events、delegation/receipt并补测试 | 仅增量改缺口，不能创建第二套资产正文；生产迁移仍受控 | P0 |
| HP04 | M2/M3 | 私有原件真实字节→source_version/read_unit/evidence/claim→唯一Runner/D00—D03授权适配及候选/资格交接 | 禁止memory假原件、batch_level或第一条材料冒充精确来源；正式Storage/Reviewer激活需有权环境 | P0 |
| HP05 | M2 | 隔离PG+Storage+签名与备份恢复、ACK失败、撤权、并发/幂等正反测试，复用已有回执补最新接线证据 | 实际生产备份、桶、密钥和迁移由授权实施，不提前开放私有上传 | P0 |
| HP06 | M3 | 独立Reviewer受控服务、Signer身份/角色、签发与撤权接口、事件幂等、明确失败关闭 | 独立服务端合法身份/密钥/托管部署必须实际验收；旧Operator端点不得假借签名 | P0 |
| HP07 | M3/M5 | 当前qualification、目的/consumer/scope/精确revision以及P08撤权对消费者的即时阻断合同与测试 | 专业Gate不可由作品Reviewer批准或Presenter伪造；缺映射的对象/分面保持HOLD | P0 |
| HP08 | M4 | 同root任务DAG、不可变DelegationEnvelope/ExecutionReceipt、预算费用与跨会话恢复的低依赖源码 | 不得静默费用记零或伪造Provider回执 | P1 |
| HP09 | M4 | T1—T7接包负例、最小合法传输、幂等/超时/撤委托/重试、权限前置失败关闭 | 真实Provider及原件外发、收费上限、凭据和资料权利必须另获受控授权 | P1 |
| HP10 | M5 | H1/H2/H3+Studio自然语言研究创作、导演、作品原本/分镜/局部修改与持久修订闭环 | 不以关键词模拟Agent真正完成研究；真实体验由Owner后验 | P1 |
| HP11 | M5 | F05 Admin内部知识条目来源、精确revision、证据、rights/purpose、use_events和缺口可查询管理 | 原有运营功能不得回退，条目不可假造；高权限操作真实身份验收另行进行 | P1 |
| HP12 | M3/M5 | 出版Operator+作品rev+独立知识G5+媒体许可，WATCH/Evidence/visual_stage/Agent逐请求当前资格和撤权 | 没有合法精确G5映射则关闭相应新发布或受影响分面；作品Reviewer不替代G5 | P0 |
| HP13 | 全部 | 74目标逐项`CREATE/REVISE/等价/延期`双向语义消项、20责任/85API/152动作源→测试→证据清单、测试与回滚 | 仅余本地/生产权限或完整体验验收时才冻结唯一增量交接包，不重研/不覆盖最新main | 最终 |

### 6B.2 执行顺序与独立验收纪律

1. **HP01先行、持续复核**：每批核最新main的实际CI工作流；历史SUCCESS只引用对应SHA，最新异常先定根因，源码与任务条目均可追溯。若连接器不支持push工作流查询，应明确说明这个能力缺口、尝试授权可用的其他核证方式，**不得因此无限期只做小补丁而忽略其他HP**。
2. **主线贯通而非零散修补**：M1身份边界（HP02）→M2原件/资产/Runner（HP03—05）→M3独立Gate+消费（HP06—07）→M4同root双主体（HP08—09）→M5 Studio/Admin/WATCH（HP10—12）；依赖清楚时可并行代码工作，必须以真实端到端正反证据收口。
3. **74正式目标与20责任**：现行`target-diff.csv`不得只写`CODE_PRESENT`；逐文件出示实际当前文件、源设计差异、功能/协议影响、正反测试、真实运行证据、回滚和最终`EQUIVALENT/IMPLEMENTED/DEFERRED_ENV/HOLD`。对于21项CREATE不机械创建空文件；若已有等价目标须给出精确源码路径与验证。2026-11-05 Owner 已撤销“旧 AGENTS 施工路由等到 M8”的安排：开发工具立即遵循 MHKA 新架构，旧 C0—C4 仅供历史和兼容核查。正式生产许可、独立 G 签发与 M8 运行激活仍按原合同 HOLD。
4. **正式生产与交接边界**：M1生产Owner/旧密码失效，M2生产Storage/正式迁移，M3合法Reviewer/专业Gate，M4真实外部模型（资料权利及费用），M5合法正式公开与Owner体验，M6全量合同、M7真实双题、M8原子切换，只有确属当前插件不可实施且已给出精确指令与负例的项目才归最终CodeBuddy。
5. **禁止虚假收口**：定义`CODE_PRESENT`、`VERIFIED_ISOLATED`、`VERIFIED_LIVE`、`HOLD`、`DEFERRED_ENV`。仅一个`HOLD`或`CI_UNVERIFIED`未说明就不能宣布可交接；可以在受控环境任务明确分配且当前插件已达能力边界时交接，但绝不能称M0—M8生产全部PASS。

### 6B.3 一次性交付READY判定

- ChatGPT可访问范围内的源码、候选迁移/回滚、合同、各HP正反测试、全量语义差异与必要修复已实施且逐项有证据；阻断不得因缺真实Provider/Reviewer而伪造PASS。
- 可运行CI的失败已经核实或给出最小复现；缺push-run读取权限或本地工具的项目单独列出确切工具限制、准确SHA与下一环境验证命令。
- 74目标与20责任账经双向核销，不把“全部原目标CREATE路径缺失”自动转成完工；每个遗留都是具体`HOLD/DEFERRED_ENV`、Owner批准条件、回滚和CodeBuddy可执行操作。
- 唯一交接包以**冻结时最新main**作基准，包含受控差分/索引、剩余环境指令及验收/回滚清单，不提前打包，也不把M6—M8的投运准出当成移交前置。必须明确书面`HANDOFF_READY`或`HANDOFF_NOT_READY`及证据。

**2026-11-03 HP施工实绩（状态不替代Gate）**：HP13已按冻结来源落仓19/21个原缺席CREATE目标，并在差异账附本批blob/冻结文本匹配/启用HOLD；剩余2个KAD1目标测试需与尚未完整接线的运行合同正反核对。HP07视觉舞台六处从旧PASS改为当前独立G5+用途/consumer校验；HP11精确WorkRevision审核前端/路由/原子写入接线；HP12新发布与WATCH未取得专业G5时拒绝，并保留后台合法草稿及审查记录。源码、测试和机器目标审查已提交；**本批最新主CI、隔离PG和合法Owner的实际回执未核，现状`HANDOFF_NOT_READY`，不得勾M1—M8**。执行细节、实际SHA、正反缺口与回退见`progress.md`最新“HP01—HP13实际施工第一收口批”。

**2026-11-03 HP08专项收口增量（非阶段PASS）**：已将工具调用的预约/结算/待核回执绑定精确invocation ID；外部/LLM执行超时不得自行释放可能已收费的reserved；结算落库失败不得把已发生费用退回。Studio研究完成检查点保存累计spent/ceiling，追问通过done→running CAS和已有预算执行，恢复API不得绕过账本重跑收费步骤；`requestProduction`新增零成本注册表/签名输入预检、现有预算CAS预占与reserved回执先于Runner启动的硬顺序，禁止调用参数任意增额。实际源码提交与测试范围详见`progress.md`最新两条HP08记录；当前Registry依旧`production_input_binding_required` HOLD，已付费流程的逐步骤恢复、Runner执行终态结算和真实Provider授权/费用需后续独立验收。**新提交Vitest、真实PG和最新main构建尚无SUCCESS证据，HP08=CODE_PRESENT/CI_UNVERIFIED/LIVE_HOLD；交接=HANDOFF_NOT_READY。**

**2026-11-03 HP03资产历史可读能力增量（非准出）**：依托既有单一`studio.asset_heads/asset_revisions/use_events`和低权限Owner事务，新增同项目精确资产全修订历史、同项目精确revision的长期使用记录只读能力，并通过原`GET /api/studio/assets`私有模式访问；保留旧API合同和正式Gate/rights判断边界。源码`3ee30107`、`a611899e`，隔离PG及HTTP合同测试`a46aa20e`、`75b35b39`，本批真实CI/PG回执尚缺，不得将其等于跨项目合法复用/UseEvent签发完成；详见`progress.md`最新HP03记录。

**2026-11-03 Owner执行权转移裁决（最新，优先于§6B“先由聊天插件做满”的原执行安排）**：Owner明确要求现在返回Codex续建，**不再以13个HP必须先由聊天插件全部施工完成作为转移执行权的前置条件**；HP01—HP13原任务、顺序、验收和独立HOLD均保留，由Codex从远端main最新HEAD接手。唯一现行执行交接文件：`tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md`；旧`PLATFORM_HANDOFF_20261103.md`与ZIP只是历史输入。转移执行权**不等于**§6B.3技术HANDOFF_READY或任何M1—M8正式PASS，也不等于Owner批准生产迁移、私有资料外发、正式Gate签名或额外付费调用。接续优先运行真实CI/typecheck/unit/build/隔离PG、补53项REVISE语义核销及剩2项CREATE测试，按真实回执继续工程闭环。当前状态标识：`CODEX_EXECUTION_HANDOFF_ACCEPTED / TECHNICAL_HANDOFF_NOT_VERIFIED`，详细风险/命令/权限见该交接书及进度账。

### 6B.4｜双 Skill 理念继承与跨工具开发 Skill 提效（2026-11-05 Owner 确认；工程并行任务）

**身份、归属、优先级。** 本项是 MAB 现行工程计划的有界提效任务，服务正在执行的 M5/ST-02 及后续 M0—M8 施工和长期运维，**不是** M9、第十四个 HP、独立产品专项、另一套 Skill/Registry 权威，也不改变既定功能目标、工程主线、合同、Gate 或 M5 准出门槛。设计依据：MHKA-04 §3.6（双 Skill 长期理念与 CTX-ENG/PROD/STUDIO/EXPLORE 不变的职责）、MHKA-05 §10（跨工具开发 Skill 工程实现与长期运维）；历史依据仅供继承：C2 V1.1/V1.2/V1.3 双 Skill 理念。技术侧由 CTX-ENG 执行，原 MAB/PLAN 与 progress 为唯一任务和进度归属；Owner 只审需要授权或产品/成本变化的内容。

**继承裁决。** “双 Skill”保留为**两条长期能力建设线**而非两套物理 Skill 平台或替代 MHKA-04 四执行上下文的权威分类：
- **开发 Skill（面向建造与维护墨痕的 AI 开发工具）：** 在 CTX-ENG 下学习并执行工程接续、诊断、修改、测试、发布准备、变更影响与维护方法；原则上可被 Codex、CodeBuddy、ChatGPT 等支持的开发环境复用。
- **产品 Skill（面向墨痕自身的研究/生产/创作/消费运行）：** 继续沿现行 CTX-PROD、CTX-STUDIO、CTX-EXPLORE 及 D00—D05/L0—L5/G0—G5、原 63 方法/19 身份的既有合同施工，不因创建开发 Skill 而更名、混同或改 Registry。旧 C2 的 Developer Skills 曾兼有知识生产与工程职责，此处**只将其工程部分在 CTX-ENG 下提效**，不是擅自重新定义历史术语。两线可复用方法和代码工具，但不得共享未经授权的运行权限、知识 Truth 写入或 G 签发。

**生命周期目标。** 同一套开发方法兼顾当前**BUILD（建设）**和后续**MAINTAIN（迭代维护）**；两者是执行策略，不是新增架构或阶段。公共核心：读取最新 GitHub main/MHKA/专业合同及 MAB 任务/真实证据 → 选择符合依赖的最小任务 → 修改代码和受控脚本 → 类型/测试/安全/回滚验证 → 准确提交和记录状态 → 可恢复接续。BUILD 先围绕 M5 与未准出工作包实现；MAINTAIN 从现在保留接口、版本与变更纪律，在建成后补依赖升级、兼容与故障、线上回归、性能/成本、安全维护策略；如有资源冲突，优先保当前系统搭建。

**2026-11-05 开发工具验收先后序裁决：** Owner 先在 Codex 会话通过同一 Skill 继续真实 M5 施工并取得该宿主加载与开发闭环回执；只有以后切换 CodeBuddy 时才执行 CodeBuddy 的独立宿主验收。CodeBuddy 当前 `HOST_NOT_RUN/DEFERRED_TO_CODEBUDDY_HANDOFF` **不阻断 M5 或 Codex 施工**，也不得提前声称跨平台完全验证。原 DS-01—04 阶段、产品/专业 Gate 和成本权限一律不变。

**2026-11-05 Owner 长期方法论补充裁决｜开发 Skill 自生长与经验提炼同步建设：** 本任务仍属 §6B.4，保持一个 canonical 开发方法源与 DS-01—04 原编号；先完整设计并同步建设“**脱敏回执采集→重复模式和能力缺口识别→复用价值与四路分流→自动生成受控候选→隔离正反评价→授权准入→版本演化、降级与淘汰**”，随后随 M5 的真实 Codex 施工逐步验证。**不得以先通过局部案例测试作为自动发现设计和工程实现的前置门**；但设计、源码落地、真实运行、候选正式启用是四种不同状态，不能凭文档准出伪称运行。

**DS-02 完整机制设计交付约束：** 明确经验记录最小字段（任务与工作流签名、执行宿主、工具与环境能力、输入/产出 SHA、结果/失败/停止、真实测试及 CI 引用、权限/费用/脱敏状态）；机器可检查的发现与相似性规则；已有 Skill 升级／共享脚本或适配器／新 Skill 候选／不复用的四路决策；候选生命周期（观察、提案、草案、待评估、驳回、合格待授权、生效、降级或归档）及不自动提权的准入、回滚、撤销责任。采用同一 MAB 进度与源码测试，不增加平行注册表或任务治理文件。样本≥3、成功≥2仅作为**试行提示条件**，不得成为固定硬阈值或自动发布条件；单次有价值的经验也可先生成候选建议，重复失败只计风险/缺陷。

**DS-03/DS-04 并行建设与验收约束：** 从 Codex 接续 M5 的第一次真实任务就启动受控经验采集、发现与候选建议的实现/验证，不等待频次阈值；比较真实 Git/CI/可观测工具证据和失败闭环，不假设可导出 Codex/CodeBuddy 内部运行轨迹。自动生成只准形成隔离候选与可执行检查草案，绝不自行获取生产数据库/Storage、专业 G、私有原件、付费外部模型或部署权。验证失败默认仅登记，不阻断获授权 M5 施工；未满足环境与授权须 `HOLD/DEFERRED_ENV`。后续 DS-04 迭代识别准确度、候选测试、跨工具适配与版本淘汰。**Codex 先验，CodeBuddy 留到未来实际切换时再验**，两者不互代、CodeBuddy 不阻断 M5。

**实施顺序（不额外阻断 M5 主施工）。**
1. **DS-01 方法与环境适配准备（P0，已实现并静态核验；CodeBuddy宿主待测）：** 从实际 main 审查 Codex、CodeBuddy 和 ChatGPT 网页/GitHub 连接器的可用 Skill 入口、执行权限、文件读写和后台/本地限制；以仓库内**一份 canonical 开发方法源**为准，通过必要的轻量平台适配装载，禁止多份正文漂移。精确目录与插件适配方式在验证后确定，不强行将产品 `skills/` 或 `production-registry.json` 作为开发工具 Skill 的运行注册表。
2. **DS-02 首个可执行 Skill 与完整自生长设计（P0）：** 在现有 `mohen-dev-continuation` 和 DS-02 工具映射/受控 CLI 的基础上，补齐经验回执、自动发现、四路分流、候选生成、评价准入和全生命周期的整体设计与工程接口合同，同步形成不影响 M5 的可执行基础；独立区分设计/静态/宿主/实战证据，不机械新增 Skill。
3. **DS-03 真实 M5 施工＋自生长并行建设与验证（P0）：** 在 Codex 显式加载并验证 `mohen-dev-continuation`，围绕实际 M5/ST-02 合法任务形成诊断→修改→测试→提交→回写闭环；同步实现/试用经验采集、模式发现和候选草案能力，不等待 DS-03 局部验证通过才启动自动发现。记录精确 SHA、正反测试和错误恢复；CodeBuddy 未来切换时独立验收，不阻断当前 M5。
4. **DS-04 受控演化与长期维护（P1，随真实施工反馈深化）：** 利用 DS-03 及后续真实案例迭代自动识别质量、候选的安全/效益评价、跨工具复用、版本升级/回退、撤销与淘汰。只有具备独立复用价值及正式授权依据时才允许增加独立开发 Skill；优先升级既有 Skill 或共享脚本，不以 Skill 数量为目标，不打断 M5。

**自主性的实际边界。** Skill 是可复用方法，**不等于** Agent 连续运行调度器、定时触发器或跨会话后台执行。短期目标是“一次任务授权，在现有工具会话里连续处理一组允许的工程步骤”；跨会话自动恢复和无人值守须另核 Codex/CodeBuddy/宿主实际触发能力及 Owner 授权。需要正式生产数据库/Storage、密钥、独立 Reviewer、付费模型、受限资料外发或改变产品/成本时必须停下并明确移交，不得因 Skill 便利越权。

**强制验收与防跑偏。**
- 设计继承：始终按当前 `AGENTS.md` → MHKA → 专业合同 → MAB 计划加载；旧 C0—C4 只作历史证据，产品 D/L/G 不受开发 Skill 扰动。
- 跨工具：canonical 方法有唯一来源、版本/哈希与平台适配映射；至少分别核 Codex、CodeBuddy 的实际载入、触发、可用命令和限制；ChatGPT 无法自动加载时明示 GitHub 读取/执行边界，不伪称支持。
- 实际有效：真实 M5 有界工作组实现至少两项相邻允许的工程步骤（或一项故障诊断＋验证＋接续），有代码/日志/SHA、正反测试和状态回写；未取得环境许可时诚实 STOP/HOLD 而非空循环。
- 长期性：同一方法文件必须具备 BUILD/MAINTAIN 可扩展入口、版本策略和回退，不在本阶段要求完整维护场景生产验收。
- 效率及安全：减少人工重复“请继续”、重复 M0 盘点、无新证据的重复失败；设置重试和任务范围上限，不能为了连续运行跳过 Gate、覆盖别人最新 main、合并旧 PASS、绕过凭据/资料权利及成本审批。
- **状态纪律（2026-11-05 初始决策记录）**：本段最初为 `DESIGN_DECISION_RECORDED / DS-01..04 NOT_STARTED`；实际文件、触发、工具兼容、测试及正式可用性必须以每批真实 GitHub 回执登记在现行 `progress.md`，不能充作 M5 工程准出或修改现行 HP/74 目标的真假状态。

**2026-11-05 DS-02 真实静态回执增补**：同轮 `main@20e89cdb` Actions 41978849756 的开发 Skill 包装及新增 Node CLI 5项正反测试全部 SUCCESS，证实 JSON 能力映射、白名单 dry-run/实际 static、非授权 production 拒绝可以在 GitHub CI 的 Node 环境运行；**两个 AI 开发宿主均未实际加载验收**，旧 M5 TypeScript 失败导致完整 CI FAILURE。故 `DS02_LOCAL_CLI_STATIC_VERIFIED / CODEX_HOST_NOT_RUN / CODEBUDDY_HOST_NOT_RUN`；DS-03 真实施工与 DS-04 维护仍未准出。完整回执见 `tasks/results/MAB/DS02_EXECUTABLE_TOOL_MAPPING_20261105.md`。原 M5、生产权限及 M8 规则不变。

**2026-11-05 DS-02 工具能力映射与受控执行深化（Owner 同意；不改 DS 阶段与 M5 准出）**：在已落仓的同一个 `mohen-dev-continuation` 内补 v0.2.0 的 `references/task-tool-environment-map.json`（八类任务映射；仅 static/typecheck/unit 三个本地白名单执行 profile），新增 `scripts/dev-skills/continuation.mjs` 的 `doctor` 环境探测与 `verify` 受控真实执行/干跑、`tests/dev-skills/continuation.test.mjs` 正反测试和 `.agents/skills/mohen-dev-continuation/references/HOST_ACCEPTANCE.md` Codex/CodeBuddy 独立宿主验收。CI 在业务 Typecheck 前单独执行 dev Skill 测试。DS-02 的文件/测试就位不等于宿主已经加载；需要 CI 实际回执和两端实机会话分别核验。命令不接生产DB、不执行任意shell、不外发资料、不调用付费模型；缺数据库/浏览器/真实部署在原 MAB 专业授权线继续 `HOLD/DEFERRED_ENV`。原 M5/ST-02 主任务、Gate 和 74目标保持不变。实施与验收回执 `tasks/results/MAB/DS02_EXECUTABLE_TOOL_MAPPING_20261105.md`。

**2026-11-05 DS-01 实施接续（受控增量）**：已按第1项核查 Codex/CodeBuddy/ChatGPT 环境，选 `.agents/skills/mohen-dev-continuation/SKILL.md` 唯一方法正文、`.codebuddy/skills/mohen-dev-continuation/SKILL.md` 轻量适配器，补静态机器守卫及 CI 检查；DS-01 仓库准备进入 CODE_PRESENT，实际 CI、平台原生加载仍须独立验证。DS-02 首个 `mohen-dev-continuation` v0.1.0 方法正文已实体化，尚无 Codex/CodeBuddy 真实加载与连续 M5 施工回执；DS-03、DS-04 未开始。原 M5/ST-02 优先级、HP任务、74目标、Gate和风险权限不变；精确方案与剩余验收见 `tasks/results/MAB/DS01_DEV_SKILL_ENVIRONMENT_20261105.md`。

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


### 2026-11-03 Codex HP01首轮真实验证增量（原M0—M8/HP结构不变）

基线main@3618a630；修复HP03缺类型、Runner拒绝授权仍改current_stage、HP08无ledger收费/外部调用及过时测试。六工作区类型/Next构建、246单测（4既有联网SKIP）、98生产边界、真实隔离PG17与Chromium3项通过，官方Storage浏览器1项SKIP。对应[本批回执](../../results/MAB/CODEX_HP01_20261103.md)及progress逐批账。主push基线CI41610775902的FAIL已经真实核对；本批push结果另记，不借历史成功代验。M1复制旧Cookie注销后重放尚无服务端失效机制，列HP02下一P0；M2官方Storage/生产、M3实际Reviewer、M4费用终态/真实混合、M5精确G5/rights及HP13剩余目标继续HOLD；M1—M8复选框不提前勾选。


HP01同批推送复核：修复代码67b2984，主CI41612672544及M1真实隔离HTTP41612672479均SUCCESS；仅签本批限定验证，不签M1整体。默认pnpm test因缺.env.local实际失败，另列DEFERRED_ENV；详细证据与未覆盖的服务端Cookie重放见progress及本批回执。


### 2026-11-03 Codex HP02会话安全增量（M1整体仍HOLD）

补旧Cookie复制重放、禁用恢复复活及退出UI假成功缺口；候选撤销迁移与默认关闭开关已实现，隔离PG17/Next/Chromium通过，未应用生产。单测258 PASS/4原联网SKIP，生产边界98 PASS，HTTP5 PASS/1官方StorageSKIP。参见[HP02回执](../../results/MAB/CODEX_HP02_20261103.md)。生产激活须独立批准；启用后不可关闭校验或恢复旧auth绕过撤销，备份恢复还须保全撤销/受控密钥失效。M1生产Owner/旧数据库凭据/恢复等正式准出仍HOLD；继续HP03—07原件证据及独立资格链，不改变原M0—M8、HP结构。


### 2026-11-03 HP03—05/HP13后续实绩（不改变M0—M8准出）

最新隔离PG17+官方Storage v1.43.0原件、备份恢复及精确L1→L2→L3证据桥实测PASS；Next+Chromium完整6 PASS/0 SKIP，unit280 PASS/4原SKIP，production98 PASS。发现并修复真实Origin/Host误拒问题，仍拒跨站和伪造转发Host。HP13两缺席KAD1目标已按当前合同适配并执行，原74完整语义仍待核；未激活MHKA。HP02代码2ecde5e对应主CI41615477077、M1浏览器41615477096、PG17 41615477219全SUCCESS。生产只读确认候选会话/原件迁移仍未应用、桶与当前资格仍0；M1—M5正式HOLD不取消。回执及下一步见progress与CODEX_M2_HP13_20261103.md。


### 2026-11-03 HP06真实登录隔离增量

修复Signer只查current_user可被高权登录SET ROLE伪装的缺口；增加session_user、实际LOGIN与最小权限/互斥成员关系检查，并要求current_user与session_user一致，避免逻辑role遮蔽真实登录。新7单测先红后绿；真实PG以独立低权LOGIN签审/撤权并拒管理员伪装，unit287 PASS/4旧联网SKIP，production98 PASS，类型/构建PASS。精确证据见progress及CODEX_HP06_20261103.md；这不是生产Reviewer/独立托管服务或M3准出。M2/HP13上批8dd2b5e的主CI41617100385、M1 HTTP41617100327均SUCCESS，官方Storage本地证据与GitHub未配Storage的SKIP分别计量。原阶段树及全部生产HOLD保持。


### 2026-11-03 HP08费用授权与恢复增量

禁止客户端additionalCeiling直接增额、缺费用字段补0及无CAS恢复；仅原持久额度内可信零花费第一步可原子领取，先保存崩溃不可重放标记。真实PG并发/DB失败3项通过，全unit298 PASS/4原SKIP、production98 PASS、类型/构建PASS。正式新增预算审批、付费步骤精确续跑、永久账与Runner终态结算继续HOLD。5950ccf的主CI41618239611、M1 41618239774、PG17 41618239520全SUCCESS。详见progress及CODEX_HP08_20261103.md；不修改M0—M8结构或生产授权。


HP08同批push核证：94cdb5d的主CI41619741669、PG17 41619741406、M1 HTTP41619741435均SUCCESS；最新代码unit298 PASS/4既有联网SKIP、production98 PASS、真实PG恢复3项PASS、类型/构建PASS。该证据不等于完整M4或生产准出；四批累计结果、环境清理及M1—M8逐项剩余见progress最新汇总。

### 2026-11-03 HP08永久委托/待核回执增量

复用已有Studio两表，实现Owner事务仓储、稳定root/snapshot、请求/观察hash、并发幂等和永久HOLD回执；新增Owner只读HTTP查证，保存不等于执行/外发/费用/Gate授权。UNKNOWN费用保持null，ACTUAL核销与候选准入仍拒绝。修复尚未上线Studio候选迁移的共享immutable触发器缺列，隔离验证三表保护与task合法置空。unit308 PASS/4既有SKIP、production98、六工作区类型、Next构建、真实PG和Chromium6 PASS/1Storage缺配置SKIP。见[逐批回执](../../results/MAB/CODEX_HP08_RECEIPTS_20261103.md)。完整任务DAG、正式审批、T1—T7、外部双主体、费用账接线/核销及Runner终态仍HOLD；M4不准出，继续依现HP09与HP10—12顺序补齐。

本批push核证：5645bb2主CI41623523765、PG17 41623523800、HTTP41623523678均SUCCESS；22f4e2c声明修正主CI41623818622与HTTP41623818662均SUCCESS。真实日志及精确SHA机器回执入HP08永久回执evidence，未借此升级M4或整体准出；剩余按progress最新账继续。

### 2026-11-03 ChatGPT GitHub接续｜HP11 + M3精确资格回执（非阶段准出）

Owner因Codex额度不足再次改由ChatGPT＋GitHub插件接力，**工具迁移不改变**M0—M8、HP01—HP13、MHKA、D/L/G和现行设计决策。继续以最新main施工；旧`CODEX_HANDOFF_CURRENT.md`保留既有Codex接续证据，本次实绩只写现行`PLAN.md`/`progress.md`，不建平行进度账。

- **HP11 F05私有资产阅读**：`ea4abd51`新增Admin内仅Owner有权查询的Studio项目／长期研究资产／精确修订／使用事件只读视图，复用既有Studio读API与数据库RLS；工作态、受限资料和已签发G5分面分开。GitHub主CI `41627651710 SUCCESS`、M1隔离HTTP `41627651529 SUCCESS`。后续补展示来源/依赖实际存储引用，但**不授跨Owner访问、不提供跨项目复用写入或正式知识发布**；正式F05全面验收仍HOLD。
- **M3精确回执合同**：`f8ae5d0a`使独立Gate只读资格回执绑定`run_id/job_id/reviewer_binding_ref/consumer=producer`及既有阶段、G、输入输出摘要、版本与到期时间；首轮CI `41628043957 FAIL`是3项合成编排测试替身缺新增字段，未弱化真实校验；`f5cd2d38`修正原测试替身后，主CI `41628357443 SUCCESS`（含98项生产边界回归）。真实Reviewer签发服务/正式DB角色和G5仍未部署，M3继续HOLD。
- **2026-11-03 11:31 UTC生产只读复核**：source.raw_items=98，evidence.material_evidence=166，studio.projects=0，studio.asset_revisions=0，control.qualification_current=0，storage.buckets=0；正式原件表、独立Reviewer绑定表与Web会话撤销表仍不存在。统计只是现状证据，不代表生产迁移已经批准。
- **边界/下轮**：M0审查PASS，M1—M8的既有HOLD不变；继续优先M2真正私有原件／唯一Runner来源绑定与M3独立Reviewer/资格消费，之后M4真混合、M5真正创作/管理/观看。未经单独生产授权，禁止执行候选DDL、创建bucket/签发密钥、支付Provider费用或提前开启正式Gate。相关源测与实际回执详见`progress.md`本批记录。

### 2026-11-03｜M3真实资格读取消除旧PASS继承（ChatGPT GitHub接续，P0候选实施）

**保持M0—M8和HP01—HP13原任务结构**：已确认`packages/data-access/src/data-production-repository.mjs`与`lineage-validator.mjs`此前把`control.gate_audits.current_valid=true`和`result='PASS'`当成独立资格读取，这是与K3/MHKA专业当前资格相冲突的旧代际残留。按已有合同原位修补，而不新增Gate/知识库/治理体系。

- `2352c368`：新建`qualification-read-context.mjs`统一强制`consumer/purpose(namespace,code,version)/非空scope`；Producer`passed/ legalInput`和G0—G5谱系校验改读`control.qualification_allows(gate_audit_id,...)`，只读`decision_origin='independent_gate'`且现行签审依赖有效的资格。不再凭旧audit PASS或`current_valid`单独准入；缺上下文、错scope、错consumer、过期或撤权均拒绝。旧无上下文调用不再兼容，属于合法性收紧，禁止恢复隐式泛权限。
- `faddc2a4`：将上述实现与`read-model-qualification.integration.mjs`纳入既有隔离PG17的push触发；[CI 41636244069](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41636244069)及[隔离PG17 41636244060](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41636244060)均SUCCESS。PG17真实G0—G5、禁用legacy PASS、跨消费者/用途拒绝、G0撤权后G4/G5即时拒绝和历史回滚保全已实测；基线711条synthetic legacy未改变。隔离环境的真实SQL PASS≠正式生产Reviewer签发。
- `10b7a3dd`：`read-model-repository.mjs`也复用统一资格上下文守卫，拒绝`scope={}`，保留visual_stage/agent原消费者合法枚举；增加缺范围/版本的真实PG负例、更新隔离PG触发范围。正式G5/public/Evidence on Demand仍须专门按工作修订、媒体rights和消费用途对位验收。
- 继续P0：正式M2原件私有存储、Owner会话/Runner合法接线及M3独立Reviewer服务、当前签审/撤权/业务消费者服务均未投运。M4真实双主体/付费、M5发布/WATCH真实闭环、M6—M8仍按原依赖HOLD。现行`control.qualification_allows`服务和候选SQL以独立PG证据为准，不将其解释成可直接激活正式环境的授权。


**本批推送／真实测试收口**：`10b7a3dda43106241bfe2fb08191d2e53d0a5ecc`的主CI 41636848862、隔离PG17 41636848766、M1隔离HTTP 41636848777全SUCCESS。最终源码提交`f79dc436723679c70d8c32e7cde18fe125da8504`：非空JSON权限scope校验进一步拒绝`{project:undefined}`序列化成为`{}`以及不可序列化范围；并将此次P0源改、真实PG17证据及M1—M8 HOLD状态原位记入计划/进度/CURRENT。最终源码提交的[主CI 41637141950](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141950)、[隔离PG17 41637142076](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637142076)、[M1 HTTP 41637141998](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141998)均为**SUCCESS**。隔离PG日志为`K3_READ_MODEL_QUALIFICATION_PASS`和`K3_DB_TEST_PASS`，无真实生产库写入。此批M3合法读取子项完成源测收口，**正式M3 Gate Reviewer服务部署/真实G签发/生产资格消费仍HOLD**。

### 2026-11-03｜M2唯一Runner有界续跑及适配器范围补齐（GitHub ChatGPT接续）

`64eed3f55d8a6f6d21d1b62c0629f139e5dfe341`已对现有`pipelines/data-production/run.mjs`和`orchestrator/adapter-binding.mjs`补齐**D01—D05阶段续跑的受控冻结输入**：只从运行者显式指定、0600文件/0700目录且无symlink越界的信任目录读取有限长度JSON；D01—D03私有类型拒绝错阶段/额外隐形字段；精确JSON由现有独立执行授权的`executionDigest(input)`和一次性nonce绑定。取消了“一个Adapter必须同时覆盖D00—D05全部Job”的不必要限制——仅单/多阶段续跑时按该次选定阶段逐Job匹配Registry模块路径；默认整链仍全阶段严格核验，禁止路由外模块。新的模块`orchestrator/resume-input.mjs`不是第二Runner、不是私有原件服务，也不是正式Gate。

[GitHub主CI41638126713](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638126713) **SUCCESS**，包含新`resume-input.test.mjs`、`adapter-binding.test.mjs`的信任边界负例以及既有类型/单测/98生产边界/构建/权限覆盖。未单独证明有Owner实际原件字节、真实G1或Studio受控派工，亦未在此批触发真实PG/Storage联调；因此M2只更新“续跑输入+Stage adapter selection”**子能力CODE_PRESENT / CI_PASS / LIVE_HOLD**。

下一个P0并非重新规划：需要将合法Owner短时会话、只读私有原件工作器与已合格L0精确来源绑定至唯一Runner；输出形成可持久的L1读取单位、真实证据桥与G1—G3独立签审。Studio动态主题仍因缺合法冻结输入及费用账授权而被`production_input_binding_required`阻断；不得绕过。正式Registry保持全局和Job关闭，代码不得被误认为生产激活。


### 2026-11-03｜HP04—HP07 私有 worker 与独立 Gate 服务接线（Codex）

继承远端 main@02eecd6e，现有唯一 Runner 增加默认关闭、执行授权后惰性装配的专用低权私有 worker；Owner短时会话、原件RLS/真实字节与精确来源绑定仍由既有仓储执行。新增独立签发与当前资格HTTP处理器，复用专用Signer SQL和资格校验，精确绑定run/job/Reviewer/输入输出摘要及server-owned用途/非空scope。无共享高权连接回退、无第二Runner/Gate。

真实隔离PG17已验证专用Signer签发→当前资格读取→旧Producer客户端→撤权即时拒绝，及专用private worker登录下Owner/错版本/跨人/失效/禁用/归档正反核验；源码与隔离子能力见 `tasks/results/MAB/CODEX_M2_M3_SERVICES_20261103.md`。生产独立认证、reader最小权限部署、官方Storage原件字节→L1持久化→G1—G3整链仍未验证；M1—M8及HANDOFF_NOT_READY不变。两个新HTTP handler读取超时是正式部署前须处理的minor；不以源码/PG fixture当生产准出。


### 2026-11-04｜M3独立服务有条件准出，顺序转入M4

本轮完成随机hash凭据、专用review/consume LOGIN、独立HTTPS进程（默认OFF）、同事务认证/锁/唯一签审或撤权、COMMIT确认及窄资格读取；实际接收M2持久L1并以合成独立G0→G1回执供Runner精确校验，祖先撤销即拒绝。M3六项逐项核销、测试与边界见 `tasks/results/MAB/CODEX_M3_SERVICE_20261104.md`。原完整复选框和最终生产标准不提前通过。

固定条件并入本计划：**M3-C01**（Owner/有权运维批准并部署正式迁移、LOGIN、TLS、secret/凭据及现场正反验收，任何正式签审/撤权/新服务消费前）；**M3-C02**（真实专业Reviewer/策略/原件逐阶段资格回执，对应正式交接前且M7/M8前）；**M3-C03**（有权恢复保持OFF，重核当前权利及最新撤销记录、废止恢复旧凭据后现场验收，首次生产启用及M5公开消费/M8前）。责任、关闭证据、受阻范围详见同回执固定条件表；条件不得随阶段默默延期。M1-C01—C04、M2-C01—C03继续有效。

有证据重开范围仅两处：跨job撤权缺少目标stage_binding核查（本批新服务修复）；官方Storage并发上传回读临时5xx（定向有界只读重试，hash/权限不放宽，不改原M2交付）。其余已验M1/M2成果直接继承。当前下一施工阶段为M4，不回到M1/M2重建，不启动未授权的生产或收费调用。


### 2026-11-04｜M4受限工程有条件准出 → M5

Owner既有准出规则落实到本批：冻结DAG、Owner永久计划、T1—T7逐项候选、真实字节/当前G1接收、不可变撤销/lease/CAS、旧计划分页和半存登记恢复已完成源码与标记隔离验证。389单测/4既有实网SKIP、133边界、真实PG17、六工作区类型、真实Next构建/Chromium7PASS/1Storage缺配置SKIP。证据及原六项核销见 `tasks/results/MAB/CODEX_M4_CLOSURE_20261104.md`。

**不签完整M4真实混合PASS**：M4-C01正式派工/运行环境（首次正式生产前），M4-C02真实同root双主体/外发/价格/预算与费用（任何真实外部委托或收费前且M7/M8前），M4-C03真实进程/费用/当前权利与撤销恢复（首次真实长流程前且M8前），M4-C04 ST-01—ST-09与13类型专业业务全验收（对应M5业务启用/复用/公开消费前）固定保留。各条责任/关闭证据/影响在同回执条件表，不能默默顺延。M1/M2/M3条件全部继承。

Ruling: M4准出只覆盖可运行的调度数据/收包/协调恢复工程，九动作/13类逐业务核销以C04明确交M5，正式派工/真实混合/费用恢复以C01—C03具名保留。原最终标准和完整复选框不降，不把合成Provider或费用补零当完成；下一阶段不得消费未合格资产或正式发布。


### 2026-11-04 新窗口接续核证｜M4远端HTTP仍须闭合（最新优先）

源码64c2402929ff229d32b232cabf4ca8cdbf6d0b89已落远端main。主CI41790309817、PG1741790310006 SUCCESS；HTTP41790309838 FAILURE，job126441897574的实际HTTP/browser执行步骤失败。**当前M4_REMOTE_HTTP_RECONCILIATION_HOLD，暂不正式转M5**；前述M4有限工程准出与M5接续是待该回归闭合的提案，不可借本地成功或后续文档CI覆盖FAIL。新窗口首要事项是获取失败job日志、定位本地与GitHub差异并定向修复/复验，不重新拆解总体方案或重做M1—M3。gh日志读取当前空正文，根因未确认。精确回执入同批结果/evidence，全部生产/专业/外发/费用固定条件不变。


### 2026-11-04｜M4远端HTTP定向闭合 → M5合法消费接续

源码df4eeb8的主CI41823975350、HTTP41823975358均SUCCESS（实际7PASS/1StorageSKIP），旧41790309838的anon缺角色初始化失败已用全新PG17复现并定向修复。M4_REMOTE_HTTP_RECONCILIATION_HOLD仅此项关闭，M4_CONDITIONAL_EXIT按原隔离范围接收；全部生产/专业/费用条件保留，旧失败历史不删除。证据见CODEX_M4_HTTP_20261104.md。

M5本批优先P0：公开作品目录/详情/节目单/分享/相关/搜索曾绕过listWatchEligible直接使用Admin原始发布列表；补逐请求WATCH资格与no-store，增加旧published指针无当前G5的真实PG/HTTP拒绝测试。现行精确G5映射未实现仍HOLD，不伪造资格以打开公开消费。私有preview/CAS缺口已只读识别，随后按真实回归推进，不借本批宣称M5整体完成。


M5首批核证：源码eb9ee3e主CI41824906758、实际HTTP41824906796全部SUCCESS（8PASS/1StorageSKIP）。公开作品旁路修复完成，M5整体与专业G5/rights仍HOLD。下一个P0先处理共享retrieve/search知识分面的旧audit资格；后续私有preview正文及改稿CAS竞态，仍按原M5/HP07/HP10/HP12施工，不开新计划。详细边界与失败记录见CODEX_M5_PUBLIC_CONSUMERS_20261104.md。


### 2026-11-04｜M5共享检索与私有修订续建

共享retrieve八分支现行资格/非空context与去材料/问答衍生缓存已补，源码4f57421的CI41826797550、PG41826797881、HTTP41826797505均SUCCESS；缺合法服务端consumer/purpose/scope仍degraded，不采信公众自报映射。

私有preview漏正文/JSONB和局部改稿/重排的分离读写CAS已补，真实八并发1成功7冲突、同rev提交及重排通过；旧247bee0文档CI的共享时限2callback失败已取得日志并用确定性墙钟/timer负例修复，T7与最终accept也共享耗尽标记。417单测/133边界、类型、真实PG和HTTP11PASS/1StorageSKIP，实际源码push回执另补。报告见CODEX_M5_REVISIONS_20261104.md；本计划原M5完整复选框不勾。

下一轮仍原M5/HP10—12：导演方案初始保存及fork/restore等版本写入口的并发/幂等与来源归属、同一WorkRevision链；继而精确G5/rights合法消费映射、九动作/13类型逐业务核验。不能把局部改稿CAS当所有写入口通过，不新开架构，不激活生产/付费。


M5本批源码最终核证：e5a3a5b主CI41828369677、隔离PG41828369318、实际HTTP41828369462均SUCCESS，实际11PASS/1StorageSKIP。局部预览/改稿/重排/共享deadline子项完成，M5整体不准出；后续按上节其它版本写入口→同WorkRevision/G5/rights及业务全验收继续，原准出和生产条件不变。


**2026-11-04 M5原顺序接续与定向验收（仅状态回写，不改阶段/标准）**：沿上节既定“其它版本写入口→同WorkRevision/G5/rights→九动作/13类型”施工。`19ff534c`与`4d5c05e`完成导演选定方案与作品同Owner/快照/不可变CAS及测试修正，CI41836604791 SUCCESS；`c8379b0`完成fork/restore历史精确来源、CAS与operation_id幂等，CI41837221858及隔离HTTP41837221734 SUCCESS；`08fa04e`增加既有Playwright真实PG并发/重复请求/历史恢复负例，CI41838116485和HTTP41838116408均SUCCESS（12PASS/1Storage SKIP）。这些是M5局部`VERIFIED_ISOLATED`，尚未进行导演提交整条正式PG/生产E2E，**M5整体及精确G5/rights/STA九动作/13类验收仍HOLD**。下一步只做同WorkRevision与合法专业资格/消费者/权利及未覆盖业务，不重复已证的fork并发子项。M1—M4原条件、生产安全与M8标准不变；回执`tasks/results/MAB/CHATGPT_M5_REVISION_CAS_20261104.md`，progress与target-diff原位核销。


**2026-11-04 M5导演提交隔离PG专项补充核销（不改变原计划）**：上条此前“导演提交未进行正式PG/E2E”的阶段性说明，现由`608ff72f`实际隔离PG17/Chromium补证。`CI41841366673`、`HTTP41841366704`均SUCCESS，原expected-head丢回执重试、8个不同导演方案版本争用、来源与跨Owner正反验证PASS（13PASS/1StorageSKIP）。本项仅`M5_DIRECTOR_REVISION_VERIFIED_ISOLATED`；生产Owner、历史专业原件/独立G5、正式发表、九动作/13类型及M6—M8仍按原条件HOLD。见原M5回执`tasks/results/MAB/CHATGPT_M5_REVISION_CAS_20261104.md`第5节。下一步不再重复该成功测试，优先处理合法WorkRevision→L5/G5与逐消费者rights/purpose/scope映射，再做原专业业务验收。


### 2026-11-05｜M5只读差异确认与Codex执行权接续（非计划变更）

Owner要求把ChatGPT上一轮M5/HP07/HP11/HP12只读审查写回仓库并交Codex继续执行。已归档`tasks/results/MAB/M5_HP07_HP11_HP12_READONLY_AUDIT_20261104.md`并更新唯一交接入口`tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md`。此前`608ff72f`导演提交/回执幂等与`08fa04e`fork/restore已具真实隔离PG/Chromium正反证据；**此轮只读审查不含新源码或新增测试PASS**，对目标差异账不新增`CODE_PRESENT`。核实仍缺WorkRevision→L5精确不可变修订→当前独立G5→每consumer/purpose/scope/rights的权威映射、13类资产10+3真实PG矩阵与Admin具体条目业务核销。按原M5/HP07/HP11/HP12及M4-C04继续，原M0—M8/HP01—HP13结构、MHKA/KAD6、生产固定条件、独立Gate与费用/外发边界均不改变；Codex工作以实时origin/main接续，技术准出及M5整体保持HOLD。

### 2026-11-05｜原M5/HP07/HP11/HP12源码续建（不改阶段与准出标准）

已沿现行顺序补只读WorkRevision→真实L5 fingerprint/current独立G5→精确purpose/scope/consumer及签审整稿动作权利桥；原G5 policy/receipt必须明确核整稿与权利，否则继续失败关闭。同步补10+3类私有持久PG/HTTP矩阵、Admin具体条目历史修订与use_events、WATCH及ST08/ST09隔离业务证据；取得源码SHA/Actions后在本节与progress核证，不把当前源码/合成审签称专业PASS。最新main的assessment超时CI失败已定向RED→GREEN，既有导演CAS/fork/restore继承。明细tasks/results/MAB/CODEX_M5_BINDING_ASSETS_20261105.md。

**原复选框不勾、M5_OVERALL_HOLD不变**：三其它消费者各自HTTP、其余五L5绑定、13类完整专业业务/同意撤回/来源合法复用/canonical媒资、ST01—04与H1/H2/H3/19组件、真实Reviewer及所有M1—M4固定生产条件仍保留。仅测试环境配置consumer contexts，不执行生产迁移/激活/私人资料外发或收费调用。回滚为关闭新context或资格桥恢复原拒绝，保留全部作品/历史/审计，不恢复legacy旁路。

本批源码`ff5283ea8a719f69d37eee4ff4e8a1d4c5e4738e`最终本地：432单测/4原SKIP、133边界、六工作区类型、PG全套、Next/Chromium15PASS/1Storage缺配置SKIP。仅本批隔离工程子项；GitHub实际三流水线结果待核后追加，原M5复选框和全部具名HOLD不改。

同轮按原M5继续补证：六类L5×四消费者已逐类真实PG正例/物理换版拒绝/祖先撤销，签审整稿媒体权利正反与实际应用wrapper PG也PASS；完整PG17exit0、共享fixture参数化后HTTP仍15PASS/1StorageSKIP。首批仅story_seed的PG覆盖缺口关闭；其它三产品HTTP、13类专业语义/反馈撤回/合法复用/canonical媒资及ST01—04/19组件和全部生产条件保持原HOLD。实际精确SHA/CI依本批回执§5—6核证，不改变阶段准出分母。

补证源码/测试及账证`3929d9df7496fc883c684304f19c1908977b7982`已推main；实际主CI41933637116/PG41933636834/HTTP41933636716目前SUCCESS_VERIFIED_3929D9D，本批回执§6.1取得结果后核销。74差异账M0冻结列逐行确认未改，当前policy适配声明如实修正；不降验收标准或取消未关闭条件。

**本轮最终实际核证（2026-11-05）**：业务桥ff5283e、补证及差异账修正3929d9df7496fc883c684304f19c1908977b7982已推main；后者主CI41933637116/PG17 41933636834/HTTP41933636716均SUCCESS，实际HTTP15PASS/1Storage缺配置SKIP。六L5×四消费者PG/真实应用wrapper/媒体正反、WATCH当前资格与祖先撤销、Admin历史精确使用史、13类10+3持久和ST08/ST09隔离业务按本批回执§6.2核销；first-source audit失败已如实ADAPTED修正，M0冻结列与原分母不变。其它三产品HTTP、13类完整专业语义/同意撤回/合法复用/canonical媒资、ST01—04/19组件及所有生产固定条件仍具名HOLD；本阶段完整复选框不勾，M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY，原MHKA/KAD6/M0—M8/最终标准不变。


## 2026-11-05｜M5三个实际L5产品HTTP入口接续（源码1cd8544）

已fetch核main@ca0a790并继承四条指定成功CI；本批修Evidence消费者错配、Agent服务端read上下文与visual display/no-store，唯一qualification_allows及既有整稿桥不变。最终本地438单测/4旧SKIP、133边界、六workspace类型、完整PG17/711旧审计/回滚通过，Next+Chromium16PASS/1StorageSKIP；三消费者逐实际入口purpose/scope/consumer/action/expiry/revision/ancestor/cache/service恢复正反通过。失败原始日志保留，独立review无重要问题。仅VERIFIED_ISOLATED；action scope不代独立版权回执撤回，原整稿四消费者PG不扩写为新整稿HTTP。详见tasks/results/MAB/CODEX_M5_PRODUCT_CONSUMERS_20261105.md与同名evidence，远端CI待追加。

M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY；下一仍原M5 ST01—04/13类专业/同意撤回/合法复用/canonical媒资/H1-H3与19组件。云端可施工项继续由Codex做；本次环境已可运行PG/HTTP，不将网络Docker问题登记DEFERRED_ENV。正式生产/专业/外发/费用及M7/M8原条件不变。


## 2026-11-05｜M5 ST01自然语言委托HOLD业务（源码876ff39）

原位修复缺Provider/来源/资格/账本时的首工具前HOLD、任务持久化、零费恢复CAS、Studio可见原因；来源运行降级保留有限结果但不得research_done。公开Agent改专门server context，不借内部研究context。最终444单测/4旧SKIP、类型通过，真实Next/Chromium17PASS/1StorageSKIP，含自然语言输入→API→持久HOLD→可见暂停→Owner恢复/跨人拒绝；无生产或外部调用。详见tasks/results/MAB/CODEX_M5_RESEARCH_HOLD_20261105.md。仅ST01负/恢复分支VERIFIED_ISOLATED，不签ST01—04全链或混合研究完成。

前批3873256主CI41940583300、PG41940583316、HTTP41940583384全SUCCESS，实际HTTP16PASS/1StorageSKIP已核。当前M5继续13类专业/consented_feedback及真正研究创作链，M6未全量准出，M7/M8与所有原固定生产/专业/外发/费用条件不变。

## 2026-11-05｜Codex V1.2恢复接续：ST02类型根因、私有入口、DS03离线经验基础

基线5efd0085；旧work@759dbbd干净、无stash或独有提交，落后369。完整bundle已保全，原工作区未覆盖；未找回中断时未提交现场，不声称已恢复。历史9cc25f65/9838abb3/3edfb0e6均已在main。实际加载mohen-dev-continuation、工具映射及宿主规范，独立副本三项有界操作：修复Material合同/重复声明；接ST02私有POST、ACTIVE/no-store/Owner边界和首次重放生成note排重（LIMIT前过滤）；DS03脱敏显式回执按签名分组、四路不可执行草案，非自动遥测/准入。源码/最终测试/精确CI后续按单一回执§4核准：tasks/results/MAB/CODEX_M5_RECOVERY_ST02_20261105.md。M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。CodeBuddy延后；下一唯一优先ST02真实原件L0-L2自动note的PG/HTTP回放及撤权，之后才ST03。

### 2026-11-05 V1.2本批精确远端验收与检查点

业务源码b8e139c93d860c5cfdb997c9b9e25b208f944d43：CI41992897348 SUCCESS（468PASS/4既有SKIP、133边界、Skill11项、Build、审计errors=[]），HTTP41992896865 SUCCESS（19PASS/1官方StorageSKIP，ST02候选精确版本/Owner隔离/no-store/重放）。首PG41992897220因旧反馈矩阵缺consent字段FAIL；定向夹具d12f20da2cc876df41191b655e24dfff9a6ba025保留明确同意并加缺同意拒绝，CI41993463899与PG41993463958 SUCCESS，真实MAB_ST02_PRELIMIT_REPLAY_PASS（100候选不被自动note挤出）、K3_DB_TEST_PASS。原始失败不删。5条脱敏经验真实运行离线分析生成3个不可自动执行的待评价草案；无宿主自动采集/自动准入。Codex显式读Skill并完成受控修复/验证/提交/原账回写，CodeBuddy仍HOST_NOT_RUN且不阻断。单一回执tasks/results/MAB/CODEX_M5_RECOVERY_ST02_20261105.md及同目录experience/drafts/verification JSON保留SHA/接口/回退/读取Blob。达到三项操作边界；M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY、全部生产/专业/费用/外发HOLD不变。**唯一下一优先：ST02真实原件L0-L2自动note首次/回放/撤权PG与HTTP**；现有候选HTTP和满页仓储断言不重做，之后才ST03。


## 2026-11-06｜Owner意见后的ST-02执行补充（不改变原阶段与准出）

上海图书馆 Provider 已由 ChatGPT 在受控服务端使用现有 SHANGHAI_LIBRARY_KEY 完成真实只读目录API调用，检索《金泽小志》并返回7条版本/载体记录；状态仅为 VERIFIED_LIVE_METADATA_READ，不代表原件字节取得。道光抄本馆藏条目 accessLevel=9；1962年铅印本条目 accessLevel=1，含索书号与DOI。instancesDisplayInfo 对作品URI与馆藏item URI均返回空数据，未取得PDF/扫描件或页级locator。下一步按progress 2026-11-06记录核对官方PDF接口文档和访问级别规则，再进行单条、只读、隔离的真实字节验证。不得将API Key等同于版权/下载授权，不得向生产Supabase迁移或上传；ST-02仍DATA_BLOCKED，ST03仍依赖ST02。受控导演、媒体权利绑定、独立G5与真实作品验收等其余HOLD不变。双Skill继续按本计划§6B.4并行建设。


### 2026-11-06｜上图PDF开放下载资格核验增量（ST-02仍HOLD）

官方2025 API说明书已确认PDF开放下载为list→info→stream三步POST JSON流程，API Key放body；资源类型仅jp/gj/mgts。对本轮发现的《金泽小志》两个DOI（STGJ073678、STGJ073677）、索书号線普553957及题名四种list检索均返回state=0但total=0/data=[]，未调用stream，未下载字节。故该书目真实可检索，但本次核验的具体馆藏条目未进入PDF开放下载目录；accessLevel=1不能替代下载资格。下一步只测试明确命中list的另一条合格`gj`原件，或转用另一个已授权来源；不重复查询上述参数。详细调用证据、边界和sandbox清理记录见progress 2026-11-06追加记录。ST-02仍DATA_BLOCKED，ST03仍依赖ST02，原M5准出不变。


## 2026-11-06｜Owner继续接续：真实原件来源与运行环境核验（不改变M0—M8门槛）

- ST-02首选真实来源改为国立公文书馆《松江府志７》（item 4252790；请款号292-0017-0007；IIIF manifest 73页、单canvas 6300×4400）。馆方官方二次利用规则允许数字内容商业/非商业自由复制、修改、再分发，无需申请；公开使用应标注来源并披露加工。权利来源已核实，但具体卷次/页码映射须回到原件核定。当前仅有一张派生页在临时sandbox成功获取、未持久化，状态不得记为STORED_VERIFIED。
- Supabase mohen-cloud Free项目真实只读核验：DB约18MB，Storage桶/对象均0；官方1GB Storage配额足够；M2应用层单件10MiB限制优先。未创建生产桶、未应用候选迁移。生产激活仍须完成隔离Storage/PG正反验证、备份回滚与Owner单独授权。
- Vercel环境已配置并通过只读认证检查的 `DEEPSEEK_API_KEY` 可用；官方 `deepseek-flash` 支持图像输入。此key仅属于Vercel运行环境，不自动属于Codex Cloud或CodeBuddy本地。尚未进行任何模型推理；单页OCR调用需Owner明确批准（单次、max_tokens=1000、不重试/不批量、预算上限USD $0.01），不得扩展为长期付费/外发授权。
- 详细来源、rights、manifest、辅助转录、容量SQL、凭据边界及后续顺序见 `progress.md` 2026-11-06记录。ST-02仍HOLD；取得原件并完成L0/L1/L2首次/回放/撤权PG+HTTP前不启动ST-03。双Skill与其它M5任务继续按原计划，不因本次外部来源核验改写职责或门槛。


### 2026-11-06｜卷次定位与原件分册策略补充

NAJ 1663年《松江府志》正式source original仍为 `NAJDA-292-0017 松江府志7.pdf` / item4252790（73页、21.67MB、公共领域，馆方二次利用规则允许复制/修改/再分发）。Harvard-Yenching同版v.7明确覆盖卷十四—十六，可帮助定位卷十五/十六水利内容，但属于另一馆藏副本，分页不等同；其单文件权利尚未独立核实，暂仅作卷次定位参考。识典古籍“水利”章仅辅助转录。NLC 1818版卷十五是“建置志·古署”，不是本次1663版水利卷，排除。正式链路须以NAJ原件页建立locator；选定页/页组按M2单件10MiB限制持久化，不上传整册PDF。详细哈希、页数、证据见progress 2026-11-06卷次定位补证。OCR仍等待Owner单次授权；ST-02未准出，ST03不启动。
