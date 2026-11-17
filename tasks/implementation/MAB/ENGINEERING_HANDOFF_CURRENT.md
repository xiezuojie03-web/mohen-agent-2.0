# 墨痕 M5｜工程执行接续入口（平台无关）

> **当前执行平台可在ChatGPT与Codex Cloud之间按额度切换，不是永久托管模式。** GitHub main是唯一代码事实基线；同一时点只允许一个执行方写入main。切换前后均以本文件、CURRENT.md、progress.md及PLAN.md为准。

## 1. 必读入口与权威层级

1. AGENTS.md：仓库级执行约束及 MHKA-00—05 权威路由。
2. tasks/implementation/MAB/PLAN.md：唯一施工计划和M5八维准出标准，重点§0、§0.2、§3.5 B/C/D。
3. CURRENT.md：当前真实工程事实与最前断点。
4. tasks/implementation/MAB/progress.md：历史追加式施工证据账；只读末尾最新批次及受影响历史，不从头扫描。
5. tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json：机器导航；必要时同步阅读同目录MD/HTML。导航不替代PLAN、运行证据或验收。
6. 本文件：平台交接和当前接续动作，不另立标准。

## 2. 不可改变的执行边界

- 唯一仓库：xiezuojie03-web/mohen-agent-2.0；唯一写入分支：main。禁止施工分支、PR、force-push、并发写main。
- 每批先核最新HEAD、受影响文件和CI；不得覆盖并发成果。
- 已实现且有效的Runner、Registry、D00—D05、L0—L5、G0—G5、Studio原件路径、Owner事务、Admin/WATCH代码直接继承；只修当前真实差异，不全仓重盘、不重复重建。
- 区分CODE_PRESENT、源码测试、隔离PG/HTTP、真实云端运行和Owner体验；Vercel READY不等于TLS、Gate或业务PASS。
- 不读取、输出、提交任何密码/Token/私有原件；不使用高权DATABASE_URL替代专用身份；Producer不得签发独立Gate。
- 不改Production、不关闭Preview/部署保护、不启动未经授权的付费Provider、不伪造Owner/Project/Root/Reviewer/Gate记录。
- 每批必须更新progress；运行事实变化更新CURRENT；导航语义/节点边状态变化时同步JSON/MD/HTML三件套。

## 3. 当前已完成与待验证

### A线：正式知识窄读桥

- 开发库迁移20261117172439 m5_scoped_formal_project_gate_read已实际应用。
- Studio通过原签名Owner会话和createAppTransaction调用studio.search_qualified_project_layers。
- 仅mohen_app_runtime获受限EXECUTE；正式知识表不向应用身份开放裸SELECT。
- anon/authenticated/service_role/Producer拒绝；无签名Owner调用返回42501。
- **不得重做。** 当前真实Project=0、当前资格=0、Policy=0、active Reviewer Binding=0；正向读取、错Owner、错用途、撤权待合法业务数据后验证。

### B线：机器身份与Vercel配置

- Supabase既有mohen_m5_producer_login和mohen_m5_worker_login密码均已由Owner通过Dashboard安全初始化；只读确认密码已设置且BYPASSRLS=false。**不得再次要求Owner重置密码。**
- Vercel以下四项变量均已核实存在，范围仅Preview、类型Sensitive/Secret；值均未读取：
  - MOHEN_PRODUCER_DATABASE_URL
  - MOHEN_PRODUCER_DATABASE_PASSWORD
  - MOHEN_PRIVATE_WORKER_DATABASE_URL
  - MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD
- 最新部署dpl_Gzbgit2J8N8QXhv2vGhxvkJuyuk5，SHA 954760da7d6cc33b7fd8116e8d64f07ae27edce3，READY，target=staging。项目SSO Protection元数据为deploymentType=preview，Custom Environments列表为空。匿名 HTTP 实测该 staging 部署受 SSO 保护，部署列表的 Preview 和 staging 过滤返回同组部署。**四项 Preview 变量的实际注入仍未证实。**
- Producer/Worker真实TLS、实际数据库身份、低权限正反、Secret不透传均未验证。变量存在与密码已激活不能代替连接成功。

## 4. Codex Cloud或ChatGPT均可直接执行的下一批（无需Owner参与）

- 首批解决旧测试夹具与现行 TLS/Owner 会话合同不一致的问题，并修复 Executor 认领前未解析拆分密码、专用池拒绝 `sslmode=verify-full`。Node 数据生产回归通过 357/357。精确 GitHub Actions 回执及隔离 PG 见 progress。GitHub 托管 runner 的账单/支出上限恢复后重跑最新 main。
- staging 唯一部署 URL 的登录、Admin readiness 和 Executor 入口匿名请求均实测 302 至 Vercel SSO。项目级四项配置均仅 Preview。部署实际注入仍 HOLD。在既有受保护非生产部署路径可用时，以新 main 构建并由现有合法 Operator 访问 Admin readiness 的 `machine_variable_presence`，四项均为 true 才进入真实 TLS 验证。确认保护与注入后，复用低权池及身份检查运行云端 TLS、允许/拒绝和 Secret 隔离验证。
- 真实同作品沿 PLAN §3.5 B/C/D 继续。待业务路径产生真实 Project/Root 及独立 Reviewer/Policy，再执行权限内的正向读、独立签发、发布和撤权。无需重复机器密码或变量配置。

## 5. 停止与切换协议

- 每次停工前，代码改动必须已安全提交到main并完成必要回读；如受PLAN §0.2生产隔离条件限制而不能提交，必须明确记录未提交文件、精确工作区状态和恢复方法，不得说已入库。
- progress追加本批；CURRENT只更新最新事实；导航JSON/MD/HTML仅在节点/边/执行前沿改变时同步。
- 下一平台接手时重新核main HEAD和CI，不依赖上个会话摘要或平台内部状态。
- M5唯一准出仍为同一真实作品八维完整闭环，当前0/8 OVERALL_HOLD。
