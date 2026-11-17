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

## 3. 当前最前行动与阻断

**本轮已完成的代码增量（2026-11-18第三批）**：继续继承`runResearch`、当前Project L0—L4候选/G5合格读和已有G0—G4检索适配器。将正式G0—G4检索改接已有`createAppTransaction`（当前Owner签名会话、`SET LOCAL mohen_app_runtime`、同连接核实ACTIVE Project/Owner）而不是通用DB查询；查询截断不再声称全覆盖。独立记录G5与正式G0—G4检索故障：**已找到当前有效知识仍可定向复用，尚不能判断无源的部分必须HOLD**。云端`cloud-execution-readiness.mjs`远程机器连接只接受`sslmode=verify-full`，`cloud-production-runtime.mjs`彻底取消Producer URL缺失时退回通用`DATABASE_URL`。新增云端机器身份拒绝负测6组，Studio路由用例累计16组；单独V8实际执行当前路由8/8 PASS，只代表纯决策逻辑，GitHub/Node正式测试仍NOT_VERIFIED。受保护Preview的代码构建须按最新精确SHA核对，不能用旧快照。

**业务/代码当前最前差异**：`control.qualification_current=0`，无可用于真实同Project正向测例的当前Gate资格；`mohen_app_runtime`具独立资格函数EXECUTE却没有需要的部分正式对象SELECT，不能为了返回结果给postgres/public/anon全表读权；现行第一阶段Owner-only合同没有跨Project共享授权索引。优先沿既有MHKA-05/Gate授权合同补定向安全只读桥接，做同Owner/错Owner/错purpose/资格撤权正反、再证明本研究确实缺来源后才调用既有D00；不重做已交付适配器、D00、Registry或Runner。

**B线当前最前差异**：两个专用低权机器LOGIN均存在但数据库密码仍NULL；本工具安全检查拒绝直接写入密码，Vercel两个Preview敏感URL只保留**不可登录占位**，无Production变更。需要经安全管理员通道对原角色初始化各自独立凭据（不得索取/重用Owner个人账户密码），同步Preview密钥并实测TLS、角色读写权限和越权拒绝。Cloud Executor URL/凭据、Storage服务钥匙仍不齐；独立Gate Policy/Reviewer active binding均0，不得将「机器登录成功」等同「Gate可签发」。这只阻断依赖云执行的路径，A线合法代码/测试继续。

**M5整体仍`0/8 OVERALL_HOLD`**，代码BUILD、纯决策V8、隔离PG、云端同Root和Owner实际验收不能互替；只需追加`progress.md`最近一批，不重新全仓盘点。

## 4. 新窗口最短指令

> 请按最新main的AGENTS.md、PLAN.md §3.5 B/C/D、CURRENT.md与本交接入口，从第三批已接入可信Owner事务的当前Project候选/G0—G4/G5统一路由继续，先补最小正式读授权桥及真实Gate资格正反，共享ACL未生效不宣布无源；B线独立机器密码激活经安全管理员通道，验证成功才启动Cloud Executor，继承原能力；并行推进云端安全配置中可授权的独立运行阻断。对同一真实Project/Root逐节点验证实际下游，保持独立Gate、最小权限、单main及生产部署隔离。按批追加progress，真实事实有变才更新CURRENT，导航变化时JSON/MD/HTML同提交同步。只按唯一八维验收，不从上传或G0重头施工，也不把已完成历史工作重新做一遍。
