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

**B线当前已完成的身份激活与最短接续**：Supabase项目`mohen-cloud`真实只读核实`mohen_m5_producer_login`、`mohen_m5_worker_login`的密码均已安全初始化（只核`rolpassword IS NOT NULL=true`，不得获取密码），均无`BYPASSRLS`；旧“待管理员设置数据库角色密码”断点已消除，**不得让Owner重复密码重置**。当前仅Vercel Preview尚未替换两个不可登录URL占位。为方便Owner使用iPad和避免传送密码，采用GitHub已实现的最小**拆分Secret配置**：`MOHEN_PRODUCER_DATABASE_URL`与`MOHEN_PRIVATE_WORKER_DATABASE_URL`分别填正确的**无密码**URL（各自role+项目Pooler租户标识、`sslmode=verify-full`，只在Preview）；另外新增`MOHEN_PRODUCER_DATABASE_PASSWORD`及`MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD`两个仅Preview**Secret**变量，Owner直接在Vercel浏览器中分别粘贴原始密码（无需URL编码，不用发聊天）。`resolveMachineDatabaseUrl`只在受控服务内存编码并合成，Cloud子进程仅收到分开的完整低权连接URL而不收到原始密码环境变量；不允许URL既携密码又设置Secret产生歧义，保留旧的完整URL机制兼容。在未真正配置前仍不得认为TLS登录PASS，也不得开云执行。完成Vercel配置后要重新部署受保护Preview，并通过专属身份真实TLS与权限正反回执，之后仍需Cloud Executor、Storage、独立Gate Policy/Reviewer授权，绝不能把角色激活当Gate PASS。Production不变。

**唯一准出**：M5`0/8 OVERALL_HOLD`。不重建Studio登录、G0/G1/Runner、原件接入；只沿可信现行Gate与同Project后续实际业务验证推进。证据见`progress.md`末尾`M5-FORMAL-READ-BRIDGE-04`。

## 4. 新窗口最短指令

> 请按最新main的`AGENTS.md`、`PLAN.md §3.5 B/C/D`、`CURRENT.md`继续。A线现有单Owner正式G0—G4读取桥已云端部署并拒绝负测，不再重做，待原业务产生有效当前Gate后验证同Project正向/错权/撤权。B线Supabase两个低权机器角色密码均已由Owner通过网页初始化，**不得重复要求Owner重置密码**；接下来只需在Vercel Preview放两个**不含密码**的Session Pooler URL和两个独立Secret密码，程序负责特殊字符编码并受控合成。然后以真实低权TLS/负权限回执验收，按现有Executor/独立Gate任务推进；不得借密码、不改Production、不提前Gate PASS。变更记录更新progress/CURRENT，有导航语义变化再同步机器JSON/MD/HTML，M5仍0/8 HOLD。
