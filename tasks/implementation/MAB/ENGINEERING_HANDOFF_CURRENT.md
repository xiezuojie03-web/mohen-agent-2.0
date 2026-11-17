# 墨痕 MAB｜当前工程接续入口（唯一有效入口）

> 本文件只做执行路由，不复制旧窗口长指令、旧现场SHA或第二套计划。整理前全文见[旧口径归档](../../results/MAB/archive/M5_ACTIVE_DOCUMENTS_BEFORE_20261117_CONSISTENCY_CLEANUP.md)，其旧“先原件→G0”指令**不可执行**。

## 1. 按顺序读取

1. 仓库根目录[AGENTS.md](../../../AGENTS.md)确认文件权威、安全与单main规则。
2. [PLAN.md §0、§0.2、§3.5 B/C/D、§6](PLAN.md)——**唯一施工顺序与M5八维准出**；本轮不能按历史M编号或D00/G0旧断点重排任务。
3. [CURRENT.md](../../../CURRENT.md)——最新可信现场快照，实时复核GitHub HEAD、CI、Vercel部署隔离、相关PG/HTTP；旧回执仅按需查[progress.md](progress.md)末尾相关批及[Studio主链审计 §7](../../results/MAB/M5_STUDIO_TO_ADMIN_CHAIN_AUDIT_20261117.md)。
4. [M5机器导航JSON](../../results/MAB/M5_MAINLINE_NAVIGATION_20261115.json)的`navigation_policy/acceptance_dimensions/nodes/edges`，MD/HTML按需展开。注意其`E_D00_REVIEW/E_D00_QUALIFY`是**新原件生产子路径的运行前沿**，不是整条Studio主线的先行任务；以PLAN §3.5 C和CURRENT §3判读业务前沿。
5. 只查受影响的MHKA/专业合同、源码、测试、target-diff及继承索引。不全仓盘点、不重复旧模块。

## 2. 当批唯一工作方法

围绕同一Creator/Project/Root：从Studio用户问题开始，先核L0—L5统一检索/合法复用与缺口判断，再按缺口选择最小D阶段及对应独立Gate。合法输入可来自存量、外部取得或用户可选上传，不能把新增原件视为每次必经路径。对真实云执行所需Producer/Worker、Executor、Reviewer/Gate凭据安全条件可并行定向补齐；未获独立签发/当前资格不冒充PASS。随后同任务推进知识资产、真实Provider/费用Receipt、H1/H2/H3导演与不可变作品修订、Admin三职责审核发布、WATCH合法消费与撤权。不得新建第二套Runner/Registry/Gate、绕过权限或以历史回执拼接整链。

每批先定位可复用实现→确认唯一差异→最小修复→POS/NEG/AUTH及必要真实下游验证→追加progress记录。只在事实改变时更新CURRENT；如果影响导航语义，同步更新JSON/MD/HTML，并按精确证据维持HOLD/PASS。PLAN仅在正式执行规则变化时修改。施工遵循既有单main和生产部署隔离要求，不允许未经授权的生产发布、密钥或新费用。账号已经恢复，不要重复重置Owner账号。

## 3. 当前最前行动与阻断（2026-11-18第四批）

**A线完成并有云端证据**：`supabase/migrations/20261118025600_m5_scoped_formal_project_gate_read.sql`已在开发`mohen-cloud`实际迁移成功（云迁移台账`20261117172439`）；按现有`createAppTransaction`签名Owner/ACTIVE Project会话调用**唯一窄读接口**`studio.search_qualified_project_layers`，仅开放`mohen_app_runtime` EXECUTE，不授`control/source/evidence/world/meaning`裸表SELECT、无新的Gate签发器。应用适配器`retrieve-formal.ts`已经切换到受限函数；非生产Vercel Preview代码`3d0ace33` READY/编译/类型检查通过。真实SQL权限证据：anon/authenticated/service_role/Producer执行权均false，app_runtime true；无签名Owner`42501`，anon/Producer实际调用拒绝，虚假Gate audit当前有效性false。**不要重做这一批**。

**A线剩余的业务验收阻断**：开发云库当前`studio.projects=0`、`control.qualification_current=0`、启用Policy=0、active Reviewer绑定=0；因此**真实有权同Project的G0—G4正向读取、错Owner、错目的、撤权再消费、来源动作权利**不能凭空造PASS，等经原业务机制合法形成相同Owner/Root当前资格后直接复测。无合法跨Project共享授权索引，不称全局无来源；不因为某层检索失效而复取D00或重写Gate。GitHub Node测试套件实际CI仍NOT_VERIFIED，不以Vercel构建替代。

**B线仍需一次安全管理员凭据初始化，当前工具做不到**：已有`mohen_m5_producer_login`、`mohen_m5_worker_login` LOGIN存在但`rolpassword IS NOT NULL=false`、`BYPASSRLS=false`，并已证Producer/Worker都不能直接写Gate。Vercel两项仅Preview机器URL为不可登录敏感占位；当前Supabase插件无自定义数据库Role密码的受保护管理动作、此前SQL设置被安全拦截。**禁止借用Owner个人密码、把明文机器密码放SQL/对话/GitHub，或通过其他执行入口绕过被阻断操作。** 需要拥有安全管理员数据库连接的本地运维环境对**现有角色**分别执行`psql`交互式`\\password mohen_m5_producer_login`、`\\password mohen_m5_worker_login`（不同随机密码，不显示、不留下SQL历史），随后在Vercel项目Preview受保护敏感环境变量`MOHEN_PRODUCER_DATABASE_URL`、`MOHEN_PRIVATE_WORKER_DATABASE_URL`中设置相应低权限连接URL及`sslmode=verify-full`；不改Production。完成之后才可实测每个角色TLS登录、许可操作与跨角色/写Gate拒绝，最后在Owner授权的有效Policy/Reviewer Binding下对接既有Cloud Executor/独立Gate。当前Cloud Executor URL/credential、独立Gate verify及Storage钥匙仍不齐，不因密码初始化自动解封。

**唯一准出**：M5`0/8 OVERALL_HOLD`。不重建Studio登录、G0/G1/Runner、原件接入；只沿可信现行Gate与同Project后续实际业务验证推进。证据见`progress.md`末尾`M5-FORMAL-READ-BRIDGE-04`。

## 4. 新窗口最短指令

> 请按最新main `AGENTS.md`、`PLAN.md §3.5 B/C/D`、`CURRENT.md`与本交接入口继续；A线直接继承第四批已经在mohen-cloud安装并通过拒绝回执的Studio Owner窄读函数，**不再修这条权限桥**，等合规当前Gate资格与真实Owner Project出现后验证正向/错权/撤权，未出现前推进不依赖它的Studio最小生产调度。B线机器角色密码初始化已超出当前连接工具的安全能力，只接受受保护管理员渠道，不索取用户密码、不绕过安全阻断；配置完成才做真实TLS/Cloud Executor/独立Gate。逐批真实验证并写入progress/CURRENT，导航JSON/MD/HTML同步，仅按M5八维验收，仍0/8 HOLD。
