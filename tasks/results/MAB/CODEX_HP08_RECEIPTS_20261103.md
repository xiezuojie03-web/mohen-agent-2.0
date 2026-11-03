# Codex HP08｜永久委托与待核执行回执持久化

基线 main@1ae44a41453890b87a5d73524c42e3cd056d3b75。沿现M4/HP08与知识资产合同§19.2执行，不重建调度器或资产正文。该批是未验证委托/执行观察的私有持久化，不是可执行授权，也不表示完整DelegationEnvelopeV1、ExecutionReceiptV1或M4已验收。

## 实现与边界

- 复用已有studio.delegations与studio.execution_receipts，新增事务型createStudioDelegationRepository及类型/导出。通过当前账户验证、事务SET LOCAL ROLE与项目Owner RLS存取；输入受限JSON复制，服务端生成稳定请求/观察内容hash。
- 委托保存包含稳定root/subtask、项目、不可变snapshot、series/revision、请求人、executor/provider/version、输入manifest、allowed_actions、权利决策原文、policy/期限、预算/币种、输出schema与幂等键。权利决策/预算字段在此仅为待核记录，不授予外发/执行/消费许可；不将已保存等同当前权利。
- 当前不绑定root_task_id FK：未完成专用任务归属核验，显式传非空FK即STUDIO_TASK_BINDING_REQUIRED。稳定root_task_ref和snapshot与短期task独立，删除task不丢永久身份。正式同root DAG、源修订逐项核验和执行lease仍待实现。
- 同(project,root,key)并发仅一份，输入变化冲突；同(delegation,attempt)并发仅一回执，变化冲突；request_hash必须精确匹配委托。观察结果hash覆盖结果manifest、候选refs、provider/version、起止、费用与错误等完整观察体，不冒称Provider签名。
- appendHeldReceipt只允许HOLD，不能直接ACCEPT_AS_CANDIDATE或ACTUAL费用。UNKNOWN必须cost/currency=null；估计值用显式十进制金额和币种保存，真实观察即使超过委托额度仍保留HOLD供核销，不能丢账或自动零元化。当前不对账、不释放预约、不自动重试、不调用Provider。
- 新GET /api/studio/delegations/[id]供Owner跨会话查永久委托和回执；隐形对象404、失效身份401、存储失败503、不暴露SQL错误；no-store且execution_authorized=false。没有公开写接口或调度入口。
- 发现并修复原未上线Studio迁移候选的共享immutable触发器：SQL AND不会保证避开不存在的record字段，receipt/use_event原更新会报root_task_id不存在。现先按表/操作嵌套分支，再仅在delegation上判断task FK置空；三表仍不可变，task合法置空不丢snapshot。修改候选文件而非执行生产DDL；既有生产Studio表仍未激活。

## 实测与证据

见[evidence/CODEX_HP08_RECEIPTS_20261103](evidence/CODEX_HP08_RECEIPTS_20261103)。

- 新5项仓储接口/负例先红后绿；5项HTTP单测先缺路由红再绿，覆盖匿名、不可见Owner、签名身份传递、HOLD/未知费用原样、不缓存、无错误泄漏、非法ID。
- 全单元308 PASS / 4原联网SKIP；production98 PASS；六工作区typecheck PASS。
- 真PG17隔离集成：同键并发幂等/变化冲突、过期新委托拒绝、跨Owner读写拒绝、receipt请求hash拒绝、UNKNOWN不记0、估计超额仅HOLD、删除root后永久回执仍在、禁用账户拒绝、池身份清理全部PASS。旧全套22基线迁移/711历史合成审计、真实低权Signer、来源/原件、会话与回滚仍PASS。新增三表immutable断言以及旧task FK置空同时PASS。
- 首次PG发现actual_provider/version为NOT NULL，已按真实Schema要求显式观察版本，不填虚构真实Provider；合成fixture明确synthetic-fixture-no-provider。第二次PG捕获共享trigger缺列，留存红证据并修正后PASS。
- 真Next生产构建和Chromium HTTP：6 PASS / 1官方Storage缺配置SKIP。新增回执Owner读200/HOLD/null/禁止执行、匿名401与另一Owner404为实际浏览器→API→PG→浏览器链；插入的是明确合成测试夹具，不冒称外部主体执行。前批官方Storage证据不冒充本批通过。
- auth strict105路由缺口0，85API/152动作追溯仍仅静态PASS。74目标缺席0、全合同语义仍未验收。默认pnpm test旧环境依赖继续DEFERRED_ENV。

## 余项与恢复

T1—T7逐item证据验证、真实最小包传输/撤委托/lease恢复、正式追加预算审批、ACTUAL费用核销、短期tool-ledger到永久回执原子接线、已付费步骤恢复和Runner终态结算仍HOLD。新只读接口/仓储可停用；永久行和历史观察不得删除，不能回退到客户端数字增额或未知费用补0。M1—M8与整体HANDOFF_NOT_READY不升级；未执行生产迁移、Gate激活、真实资料外发或收费模型调用。push后精确CI证据另附。

代码审阅：独立代码审阅员只读检查本批diff/新源码，未发现实质问题；未独立重跑测试。此审阅不具有专业Gate/生产Reviewer身份，也不替代正式准出。

声明复核：读取方法按真实Schema声明全部receipt状态与ACTUAL/ESTIMATED/UNKNOWN，不能因本仓储只追加HOLD而把其他合法服务留下的历史记录也静态标成HOLD。appendHeldReceipt返回类型仍限定HOLD/非ACTUAL。仅修正声明，无执行权限或运行行为变化；六工作区typecheck再次通过。

## Push最终核证与清理

- 实现SHA `5645bb2de7cb5590cb4085a6e44e5ba4563b350f`：主CI [41623523765](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41623523765)、PG17 [41623523800](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41623523800)、HTTP [41623523678](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41623523678) 全SUCCESS。已查实际logs，新增仓储PASS及22迁移/711行保持、308单元/98边界/6浏览器与1Storage SKIP均有真实push证据。
- 声明修正与日志归档SHA `22f4e2cd9cf9c67668e196fe03b8025dccbb2aec`：主CI [41623818622](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41623818622)、HTTP [41623818662](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41623818662) 全SUCCESS。此后无运行代码修改；PG证据限定前一实现SHA，不伪造本次未触发的PG运行。
- 精确headSha/步骤JSON与日志摘录在同evidence目录；.log受仓库忽略，已用.txt归档真实日志，红证据一并保留。
- 查询确认合成业务测试库0、随机Signer登录角色0；新HTTP测试库自动清理，一次性PG17容器及数据卷已移除。无生产数据清理。

总状态仍HANDOFF_NOT_READY。上述成功只覆盖本批范围，不替代M4全链、M5业务验收或Owner生产授权。
