# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **2026-11-18最新接续快照**。本页只记当前可信事实与具名阻断；精确施工过程、SHA、测试和失败回执以progress.md为准。旧批次内容只作历史证据，不能把旧“下一步”当现行指令。PLAN.md §3.5 B/C/D仍是唯一施工与验收标准。

## 1. 唯一业务目标

以PLAN.md §3.5 B/C/D为唯一准出标准：同一真实Creator/Project/Root任务，从Studio问题→统一L0—L5知识检索及当前资格/权利判断→按缺口选择D00—D05必要能力与独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin独立审核/运营发布→WATCH同修订消费和撤权。用户上传/指定原件是可选输入；已有合格资产不得重复获取或生产。

## 2. 最新已核事实（2026-11-18）

- **A线正式知识窄读桥已完成部署与安全拒绝验证**：开发库迁移20261117172439 m5_scoped_formal_project_gate_read已应用；Studio经原签名Owner会话和createAppTransaction调用studio.search_qualified_project_layers。只授mohen_app_runtime受限EXECUTE，不授正式表SELECT；anon/authenticated/service_role/Producer拒绝，无签名Owner返回42501。真实同Project正向读取、错Owner、错用途、撤权仍NOT_RUN，当前开发库已有朱家角 Project/Root，研究停在 Provider 与知识读取上下文前置；对应当前资格仍待建立。**不重做读桥，不伪造PASS。**
- **Producer/Worker机器身份已由Owner安全激活**：Supabase只读核验两个既有LOGIN角色密码均已设置，BYPASSRLS=false。Owner无需再次重置密码。
- **四项Vercel Preview变量均已存在**：Producer URL、Producer密码Secret、Worker URL、Worker密码Secret，均为Sensitive/Secret且范围为Preview；原始值未读取。此前“等待Owner补Worker密码”的旧记录失效。不得要求Owner重复操作或索取密码。
- **Vercel 部署与 SSO**：当前已复核精确 SHA `ddc54a53a15fbeb20e721ccd5cb95fe85ae6c5c0` 的非生产 Preview `dpl_BC4Tnp6xv8HSUwmb5Hd83FJYffnV`（API target 为 null）及 staging `dpl_2Wb5hVi78UGN6G6BH8j4nrDW3J1b` 均为 READY。两个部署的 `/login`、`/api/admin/metrics`、`/api/internal/production-execute` 匿名 GET 均返回 302 至 Vercel SSO。目标 SHA 已包含四项布尔诊断。当前执行会话缺应用内 Operator 访问，四项实际注入仍待同部署回执。
- **CI**：回执提交 `339007d` 的 [主 CI 44210656574](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/44210656574) 仍在 runner 启动前被账单或支出上限拦截。Preview SHA `ddc54a53a15fbeb20e721ccd5cb95fe85ae6c5c0` 的 [主 CI 44176653194](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/44176653194) 在 runner 启动前被账单或支出上限拦截。施工代码 SHA `7e792641618bd846417005fe1f79c77821b1ac8e` 的主 CI、隔离 PG 及隔离 HTTP 托管作业同样受阻。精确 `ddc54a53` 的本地 Node 24 数据生产套件 357/357 PASS，先前 Codex Cloud 隔离 PG17/Chromium 回执见 progress。
- **Production 自动部署隔离**：`vercel.json` 的 `git.deploymentEnabled=false` 自 `5b02081bf49683ee0cb16bd039ce96c4ef50a920` 保持，正式域仍指向 `dpl_JAsr7xw2UyMmqkdZ8uYMBjB4eYmc`（`835602242cab31b1fcb372c7ff5efd4fc41dfd89`）。隔离开启后的 main 提交未更新 Production；本轮未改 Vercel 或 Production。
- **Executor 配置预检**：复用现有 Runner、Registry 和 SQL 权限判定。修复 Executor 认领前两处连接漏用拆分密码，以及专用池拒绝合法 `sslmode=verify-full`。池仍强制证书校验且拒绝其他 URI 参数。原始拆分密码不会作为独立变量传给 Runner。既有 Operator readiness 的逐变量布尔状态已进入受保护 Preview，待应用内 Operator 读取。
- **隔离机器 TLS**：一次性 PG17 对 Worker 和 Producer 实测证书校验、加密连接、低权身份。Worker 拒绝不受信证书；Producer 拒绝错误主机名、错误密码及互换身份。此回执只覆盖隔离库；Vercel 注入与真实云端 TLS 仍待验证。
- **独立Gate**：真实启用Policy=0、active Reviewer Binding=0；Cloud Executor、独立Gate真实运行/签发尚未验证。
- **M5整体**：0/8 OVERALL_HOLD，不是代码完成率。

## 3. 当前唯一工程前沿（先做无需Owner的工作）

- **Studio 同作品已进入真实主线**：朱家角 Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd` 已在开发库回读，状态 `hold / research_prerequisites`。同一任务的下一步是接通现行受控研究 Provider 与 agent 读取上下文，随后在原任务续跑。Vercel 只读元数据仅见 `DEEPSEEK_API_KEY`，未见研究要求的 `MOHEN_LLM_BASE_URL`、`MOHEN_LLM_API_KEY` 或正式资格上下文配置；不得以其他用途的密钥或历史测试上下文冒充。

1. **取得四项服务端注入回执**：在既有受保护非生产部署核实四项配置注入。优先复用现有受 SSO 及 Operator 保护的 Admin readiness，记录部署 ID、环境及脱敏状态；部署/API 元数据不足时，需要同部署服务端布尔回执。保留真实 TLS 为 NOT_RUN，直至保护和注入均确证。
2. **运行真实机器验证**：用各自专用连接池核对 Producer/Worker 实际登录角色、TLS、允许和越权拒绝、Gate 签发拒绝及原始密码不透传。恢复 GitHub Actions runner 后重跑精确 main SHA 并回读结果。
3. **继续合法同作品链路**：已有真实 Project/Root、当前资格及独立 Policy/Reviewer Binding 就绪后，验证 A 线同项目读、错 Owner、错用途及撤权，再沿同一作品推进独立 Gate、Admin 与 WATCH。

同作品验收输入已准备，以朱家角为候选。现行开发库按历史完整哈希和字节数回查，朱家角及七宝两个版本在私有原件表和来源 raw 表均无匹配。按 Studio 路由验证可复用资产及用途资格，具体输入与正反用例见工程交接。

## 4. 持续施工与平台切换

Codex Cloud是**按额度启停的执行载体，不是永久模式**。ChatGPT与Codex Cloud可以交替施工，但任何时点只允许一个执行方写main。每次切换以GitHub main、CURRENT.md、progress.md、PLAN.md和交接文件为事实来源；任务结束前将代码、测试、SHA、运行回执、HOLD和下一步写入GitHub。不得留下仅存在于云工作区的未提交成果而声称已交接。
