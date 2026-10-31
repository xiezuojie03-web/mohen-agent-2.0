# K3连续施工入口（2026-11-01）

Owner已明确授权完成全部设计迁移工程，直至推送部署；已有GitHub→Vercel自动部署绑定。不能每完成局部批次便结束施工，也不能把本文件当整轮验收。

固定起点`759dbbd0c206c4acfe2ebdc3e94aa556528b330c`。已保留安全提交`253ae4c`、UXD7局部呈现`f9ad909`；工程备存分支`codex/k3-migration-20261101`用于环境更新恢复，生产目标仍为`a001/production`。恢复时核对实际Git HEAD/未提交改动，不reset/clean或重做已完成提交。

输入原件（附件可重新下载恢复，不从摘要重造）：
- K3增量包：`sediment://file_0000000084e4823090128f870181039a`
- H1/H2/H3、H/I及MHKA补包：`sediment://file_0000000023e48230b5d238ad75a1a28c`
- UXD7包：`sediment://file_00000000e1d88230a3f3c1f5971f34ee`

工作区原件位置`/workspace/design-input/{k3-20261031,k3-supplement-20261031,uxd7-20261031}`；原12任务计划`/workspace/mohen-k3-plan-20261031/施工计划.md`，UI定向修订见同目录`uxd7/施工计划修订.md`。原104/85/152 ID不重算，MHKA-00/01/02按最新UXD7正文作设计来源，03—05沿原包；当前AGENTS权威未切换。

## 已验证的新增数据库基础

`202611010900_k3_independent_gate_authority.sql`新增最小独立签发/撤权事务，当前资格指针CAS、请求幂等、追加历史、实际物理行SHA256修订、相邻上游资格和精确依赖、用途/范围/消费者检查。没有预置真实Reviewer/策略，public.users reviewer角色不等于专业签发身份。

`gate-authority-repository.mjs`只接受独立低权signer连接，在同一池客户端内BEGIN→验证真实DB角色→SET LOCAL可信HMAC→函数调用→COMMIT/ROLLBACK→释放；token不跨请求泄漏。私有CLI在`packages/data-access/scripts/gate-authority.mjs`，须单独`MOHEN_GATE_DATABASE_URL`及正式专业绑定，普通Web/Producer不能调用签发。

`read-model-repository.mjs`已改为当前独立资格+精确purpose/consumer/scope；拒绝旧历史PASS，无上下文拒绝。在真实隔离PG构造完整G0→G5物理及资格链，测试撤销根依赖后旧ID不再可读。

`pnpm test:k3-db`安全入口自动创建一次性标记库，22基线+3新迁移、711模拟旧行哈希、真实低权限、签发/撤权/并发/幂等/故障、仓储作用域、G0—G5消费、重放/回退均通过。需要明确标记的本地PG/socket与MOHEN_TEST_PSQL/MOHEN_TEST_SOCKET；不是生产711条实测。函数仅作用域禁JIT，避免复杂递归计划高CPU。

## 必须继续的工作

- 任务3/4：Web低权身份作用域、真实环境目录/角色/密钥绑定，可信Stage授权服务及冻结输入握手，不启用未经绑定的Job。
- 任务5/6：签发与控制失效接口闭环、旧生产DAL/lineage查询迁移、所有Web/public/静态/缓存/返证旁路、POL-01内研与公开G5双门面。仅仓储PASS不能销任务6。
- 任务7—9：持久任务/预算/恢复、H1/H2/H3方法接线、不可变revision/CAS与兼容GET、审核/发布版本绑定、85 API逐ID验收。
- 任务10/11：完整Engine/Replan/焦点/历史恢复、Origin、局部diff、152真实动作与多端可访问性/失败恢复；UXD7 38浏览器用例只是局部呈现/网络fixture/冻结退路。桌面初始叙事区Esc焦点问题此前minor仍待定向修复。
- 任务12：实际前置门完成后一次切换MHKA/旧规范归档/引用与职责，真实DB兼容迁移、推送目标分支、观察Vercel部署及线上冒烟；不伪造专业G或设计PASS=运行PASS。

## 环境与部署条件

当前Git ls-remote和push --dry-run成功；GitHub API原被出站策略Forbidden。已保存环境配置草稿追加api.github.com/api.vercel.com/api.supabase.com/既有生产URL、既有Supabase pooler及模型主机，需用户在环境设置保存并发布。运行变量要求已列DATABASE_URL/AUTH_SECRET/MOHEN_LLM_API_KEY等，Supabase管理API凭据要求按SUPABASE_ACCESS_TOKEN绑定；不把任何密钥贴进聊天、提交或日志。Vercel已有变量不自动进入Codex环境。生产Postgres TCP还须实际网络/身份验证，不能把HTTPS域名放行等同TCP可用。

Owner确认复用GitHub自动部署，不因没有VERCEL_TOKEN就认为代码不能部署；环境管理与DB迁移仍需实际凭据/通道。当前不具备这些凭据时继续所有独立施工，最后精确列出真实阻断，不把局部完成汇报为整轮完成。
