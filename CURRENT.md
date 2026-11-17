# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **2026-11-18最新接续快照**。本页只记当前可信事实与具名阻断；精确施工过程、SHA、测试和失败回执以progress.md为准。旧批次内容只作历史证据，不能把旧“下一步”当现行指令。PLAN.md §3.5 B/C/D仍是唯一施工与验收标准。

## 1. 唯一业务目标

以PLAN.md §3.5 B/C/D为唯一准出标准：同一真实Creator/Project/Root任务，从Studio问题→统一L0—L5知识检索及当前资格/权利判断→按缺口选择D00—D05必要能力与独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin独立审核/运营发布→WATCH同修订消费和撤权。用户上传/指定原件是可选输入；已有合格资产不得重复获取或生产。

## 2. 最新已核事实（2026-11-18）

- **A线正式知识窄读桥已完成部署与安全拒绝验证**：开发库迁移20261117172439 m5_scoped_formal_project_gate_read已应用；Studio经原签名Owner会话和createAppTransaction调用studio.search_qualified_project_layers。只授mohen_app_runtime受限EXECUTE，不授正式表SELECT；anon/authenticated/service_role/Producer拒绝，无签名Owner返回42501。真实同Project正向读取、错Owner、错用途、撤权仍NOT_RUN，因为studio.projects=0、当前资格=0、Policy=0、active Reviewer Binding=0。**不重做读桥，不伪造PASS。**
- **Producer/Worker机器身份已由Owner安全激活**：Supabase只读核验两个既有LOGIN角色密码均已设置，BYPASSRLS=false。Owner无需再次重置密码。
- **四项Vercel Preview变量均已存在**：Producer URL、Producer密码Secret、Worker URL、Worker密码Secret，均为Sensitive/Secret且范围为Preview；原始值未读取。此前“等待Owner补Worker密码”的旧记录失效。不得要求Owner重复操作或索取密码。
- **最新Vercel部署**：dpl_Gzbgit2J8N8QXhv2vGhxvkJuyuk5，SHA 954760da7d6cc33b7fd8116e8d64f07ae27edce3，READY，target=staging。项目Protection元数据显示SSO的deploymentType=preview，Custom Environments列表为空。**环境映射尚未核实**：Preview变量不自动证明已进入target=staging部署，Preview SSO也不自动证明staging部署受保护。必须先只读核清部署环境/变量注入/保护范围，再进行真实TLS测试。READY仅是部署结果。
- **CI**：SHA 954760da的GitHub combined status目前只显示Vercel success；Node专项测试执行结果仍未取得可核回执。不得把Vercel成功当Node测试PASS。
- **Production**：最近已核Production SHA仍为835602242cab31b1fcb372c7ff5efd4fc41dfd89；本批未改Production、未推广代码。
- **独立Gate**：真实启用Policy=0、active Reviewer Binding=0；Cloud Executor、独立Gate真实运行/签发尚未验证。
- **M5整体**：0/8 OVERALL_HOLD，不是代码完成率。

## 3. 当前唯一工程前沿（先做无需Owner的工作）

1. **Codex Cloud先做源码/测试工作**：以最新main为基线，执行现有Node专项测试、核对GitHub Actions与精确SHA回执，修复真实失败；检查Producer/Worker URL+Secret拆分、sslmode=verify-full、无高权DATABASE_URL回退、原始Secret不透传、Producer不得Gate自签等合同，并补齐自动化正反测试。
2. **只读厘清Vercel环境边界**：确认staging target的真实环境归属、Preview变量是否实际注入、SSO是否覆盖该部署。Custom Environments当前列表为空；不得自行创建环境、改变Production或关闭保护。必要时先选用现有、明确受保护且加载Preview变量的非生产部署方式。
3. **代码级Executor/Gate预检**：复用既有Cloud Executor、Runner、Registry、独立Reviewer/Gate；补配置缺失、身份不符、TLS不符、Policy/Binding缺失时的fail-closed测试。不得生成真实Gate资格或伪造Owner任务。
4. **条件满足后真实机器验证**：只有确认部署受保护且四项变量确实注入，才执行Producer/Worker TLS登录、真实数据库身份和权限正反、Secret不透传。此步骤目前没有Owner额外操作前置，但不得绕过环境安全边界。
5. **等待真实业务资格后验证A线正向**：当前Project/资格/Policy/Reviewer均为0，故真实正向知识复用与撤权要等既有业务机制产生合法数据；不由工程方伪造。

## 4. 持续施工与平台切换

Codex Cloud是**按额度启停的执行载体，不是永久模式**。ChatGPT与Codex Cloud可以交替施工，但任何时点只允许一个执行方写main。每次切换以GitHub main、CURRENT.md、progress.md、PLAN.md和交接文件为事实来源；任务结束前将代码、测试、SHA、运行回执、HOLD和下一步写入GitHub。不得留下仅存在于云工作区的未提交成果而声称已交接。
