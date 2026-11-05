# MAB M5 / HP11｜私有反馈同意声明、不可变撤回与 Admin 实际业务

日期：2026-11-05（北京时间）。原始基线：`main@094125b3c635e3a191555e07732a976cb6b6e677`。承接`PLAN.md`原M5、HP11与13类资产合同，**不新建独立权威体系或第二套资产正文**。

## 1. 源码和职责

- `17b9863e0de17bf28f3ea776538e523cb696f804`：`packages/data-access/src/studio-asset-repository.mjs`复用现有`studio.asset_heads/asset_revisions`、Owner RLS事务、不可变历史、CAS、幂等键；仅针对`consented_feedback`私人候选强制`consent===true`、`withdrawal_allowed===true`、非空有界文本，拒绝凭空把普通浏览记录当同意。此为**Owner提交时的声明检查**，不是独立核实本人真实同意的凭证。
- `withdrawFeedback`为服务器Owner-only事务：要求精确项目、资产、expected_revision和幂等键；在锁定唯一资产头后写入无原反馈正文的`REVOKED/ARCHIVED/STALE`终止修订，六种动作rights为denied、正式Gate仍不通过；只更新head指针，不覆盖旧修订。相同请求重放返回同一终止版本，不同请求争抢冲突。通用saveRevision对已撤回反馈拒绝复活。
- 已撤回后，私有Owner普通`getRevision`不返回旧正文；`listAssetRevisions`只返回脱敏历史元数据、撤回状态和拒绝权利。原数据库不可变历史仍受限保留以供审计，**未执行物理擦除、数据主体/外部副本回收或其它渠道全局撤权**，这些仍为具名后续工作。
- `97fc01f5`对应类型声明；`322a5e76`新增`POST /api/studio/assets/withdraw`，受现行Owner会话/数据库身份/RLS保护，no-store；`bf16d6da`补400/409状态错误映射。无生产DDL、无新表、无G签审器、无费用或私人原件外发。
- `eaf1515f`在既有Admin知识资产条目检查面板补Owner二步确认撤回按钮，读取服务端精确回执成功后刷新；不是新的Admin产品模块，不改变Studio/WATCH/EXP方向。

## 2. 自动化正反测试与真实回执

- `17aa3cf0`补Owner session、非法体、错误响应、幂等撤回API及未同意拒存单测；`059f6b8a`补真实Chromium+一次性标记PG全链：未同意/伪造声明拒存，真声明私人候选、跨Owner撤回拒绝、6个并发不同key唯一成功/5冲突、同key重试幂等、旧rev普通GET拒绝、Owner历史正文脱敏/rights denied、重写旧反馈拒绝。
- `d348ea01`把新测试纳入**原`playwright.mab.config.ts`同一HTTP套件**；无新的测试框架或数据库。
- `d348ea01fe82c210e413dc50e2dfd6b70d71fb1d`精确主CI [41949822824](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41949822824) **SUCCESS**，job126990856426显示447单测PASS/4旧联网SKIP、133生产边界PASS、Playwright收集7文件19用例、Next Build和74目标审计`errors=[]`；同SHA隔离真实HTTP [41949822877](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41949822877) **SUCCESS**，job126990855903：18PASS/1官方Storage缺配置SKIP，`MAB_FEEDBACK_WITHDRAW_HTTP_PASS`、`MAB_HTTP_BROWSER_PASS`及合成数据库清理标记；原13类10+3、Admin精确历史与已有ST01负链无回退。
- `eaf1515f79cd882b820e9c9f8cca6199bee8e4de`补现行Admin Owner二步确认动作；`000327ca7cc85729ae140d5243881a0330a15039`在既有`mab-notebook.spec.ts`真实浏览器中通过Admin页面操作，撤回后新rev和旧正文拒读。精确主CI [41950478739](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41950478739) **SUCCESS**，job126992973559确认447单测PASS/4旧联网SKIP、133边界PASS、7文件19用例收集、Next Build及目标审计errors=[]；同SHA隔离HTTP [41950478723](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41950478723) **SUCCESS**，job126992973584明确`MAB_ADMIN_FEEDBACK_WITHDRAW_HTTP_PASS`及`MAB_FEEDBACK_WITHDRAW_HTTP_PASS`、18PASS/1缺官方Storage配置SKIP、`MAB_HTTP_BROWSER_PASS`和数据库清除。

## 3. 局部核销与剩余边界

仅在相应精确成功SHA上将**M5/HP11自声明反馈入库与Owner撤回/私有查询失效**记为`VERIFIED_ISOLATED`。这一批不是可信数据主体同意凭证的法务合规证明，也不是完整`AT-11`及全13类专业语义、正式复用或正式运营完成；旧修订在独立受控数据库中保留，直接高权限审计仍可访问。其它消费者如未来引用这类反馈，必须另接当前撤回状态与合法权利验证，禁止继承旧历史PASS、缓存或离线复制。

当前主要M5未闭环包括：ST01—04实际有据来源/受托研究→长期候选资产→H1/H2/H3创作、13类剩余专业字段、真实法定/数据主体同意和外部撤回、跨项目合法复用与canonical媒资、全部19组件的运行映射、知识G5/权利正式消费。上游M1—M4固定条件、生产Owner/Storage/正式Signer、外发/费用与M6—M8全部保持原HOLD。

回滚原则：若需要，关停单一撤回路由或恢复此前API代码，但**不得重启已撤回的反馈处理和读取**；保全不可变历史/撤回标记并持续拒绝旧内容，不能通过回滚恢复旧同意。无本轮生产数据或生产存储迁移。


## 4. 最终局部判定（已核证，非生产与全链准出）

本轮自声明私人反馈的创建守卫、Owner不可变撤回、同Key重试/并发排他、旧正文API失效、Admin二步操作均有对应源码/真实隔离HTTP/主CI证据，核销为`M5_HP11_FEEDBACK_WITHDRAW_VERIFIED_ISOLATED`。所有测试均使用合成身份和可销毁PG，无生产迁移，无付费Provider，无用户真实历史反馈。

**不可升级的范围**：自声明不等于真实反馈人身份与合法同意凭证；撤回不代表数据库物理删除、不保证已外发副本或离线缓存清除；无已独立签审的正式G5/合法复用或生产使用测试。若未来把本类资产交给Agent、外部AI或公众消费，必须在这些实际调用点逐请求检查撤回和权利，不能凭本轮私人API保护宣称全渠道撤回已成立。仍为`M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`。
