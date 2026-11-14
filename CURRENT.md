# 墨痕｜当前工程事实快照

> **性质**：只记录最近可核的工程状态与未关闭风险；不是施工计划、验收合同或历史日志。每次开始施工必须重新核GitHub `main` HEAD和对应CI、数据库、部署事实。历史回执见`tasks/implementation/MAB/progress.md`；唯一施工顺序及准出见`tasks/implementation/MAB/PLAN.md` V1.6。

**观察日期：2026-11-14。** 本页依据当日连接核查与已保留的精确回执；后续提交会改变远端HEAD，**不能把下列任何SHA当作永久的“最新”**。

## 1. 当前阶段裁决

- **M0**：审查级`EXIT_PASS`，原有234路径、74目标、20工程责任及其他已验结果冻结继承。
- **M1—M4**：`CONDITIONAL_EXIT`；仅处理M5真实作品所需且有证据的命名缺口，未关闭的安全、原件、独立Gate、Provider责任继续HOLD。
- **M5**：`M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`。六门独立Gate组件正向不等于从Studio入口贯通的同一真实作品全链。
- **M6—M8**：`NOT_STARTED`。正式生产迁移、Gate激活、首用户私有部署和Owner体验尚未按M8验收。
- **工程组织**：唯一可写施工分支`main`，执行主体与具体工具无关；先完成生产自动部署隔离，再恢复新的业务代码施工。唯一具体规则见PLAN §0.2。

## 2. 代码、CI与发布事实

| 项目 | 可核事实 | 证据边界 |
|---|---|---|
| 业务代码核查点 | `b137483f`（2026-11-14 08:05 UTC前后）；后续提交截至本次观察主要为工程文档修订，实际最新HEAD仍须运行时读取 | 此SHA是已检代码观察点，不是当前分支固定HEAD |
| 主CI | `b137483f` 对应 [run 43574156788](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43574156788) **FAIL**：Vitest **676 PASS / 6 FAIL / 4 SKIP**；类型与Playwright规格解析通过，但后续必要门因单测红灯未全部运行 | 不得写成“主CI全绿”或“Build已由这次CI证明” |
| 六个单测失败 | 主要归于导入内容可用性枚举、私有证据绑定、生产触发错误码、独立Gate Reviewer依赖/查询mock等四组 | 可能同时存在测试契约漂移与真实实现缺口；先核专业合同，再改代码或测试，不削弱负例 |
| 隔离PG/HTTP | 2026-11-14较早SHA `8963c9d` 的 [隔离PG run 43536214977](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43536214977) 与 [HTTP run 43536215044](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43536215044) 都失败 | 只能证明当时版本失败；须在代码修复后的精确SHA重跑，不能外推持续失败或自动通过 |
| 文档修订CI | 原PLAN V1.6提交`f7b07c3`的 [run 43578202989](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43578202989) 为FAIL；本轮整理产生的新SHA应单独查结果 | 文档提交本身不会改变已知代码测试失败 |
| Vercel生产 | 已核实 `main` 提交会直接触发production部署；2026-11-14的文档提交也曾被部署为READY，即使对应CI并未通过 | **自动发布隔离尚未完成（HOLD）**；READY只是构建/部署状态，不是安全/DB/业务准出 |

**下一次业务代码修改的硬前置**：依据PLAN §0.2核验“main提交≠自动production发布”已经实际生效；在此之前只允许已授权的文档、只读核查及不触生产的测试准备。

## 3. 数据库与真实运行环境

- 已连接Supabase项目 `mohen-cloud`，2026-11-14只读核查：PostgreSQL 17、项目`ACTIVE_HEALTHY`，远端迁移账当时仅有 **5 条（2026-11-02）**。`studio.private_originals`、`control.gate_policy_versions`等关键对象仍缺，`source.sources.rights_by_action`与`public.director_plans.project_id`等字段未在远端核到。**不可把本地mohen_dev结构/权限视为云端已有**。
- 既有工程记录称生产Storage桶为0、Studio正式作品与资产尚未建立；这些计数并未在本轮逐表重新复核，不能代替最新生产读数。
- 2026-11-12本地隔离持久环境曾完成Studio作品修订、WATCH章节/媒资真实回读与G5撤权—恢复；2026-11-14工程账记录G0—G5逐门组件级独立签发正向。均应继承原批次证据，**但不是当前HEAD的Studio自由选题D00—D05一次完整串联，也不是Owner/M8签收**。
- 云端真实身份、原件字节存储、权利、独立Reviewer/Gate及受控Provider与持久前后端整链仍须按PLAN的对应条件核证；未授权不得因缺对象直接迁移或开放。

## 4. 当前阻断与下一步读取

**阻断**：① 自动生产部署与main质量门没有隔离；② 当前业务代码的主CI失败；③ 受影响隔离PG/HTTP、Gate负例缺当前SHA复验；④ Studio UI→D00—D05/G0—G5→资产→作品→Admin/WATCH的**同一运行实例真实全链**尚无完整准出证据；⑤ 云端Schema、私有存储、独立服务与本地持久环境存在未关闭差距。

**执行入口**：按`PLAN.md` §0、§0.1、§0.2及对应§3.5/§5/§6继续；核`main`、Actions、部署，再从`progress.md`末尾最新实际批次及受影响历史证据接续。已关闭且未变化的工作不重做；新事实仅刷新本页快照，不在本页重复施工过程。

**不应声称**：最新CI已全绿、Vercel READY即产品可用、旧环境下组件PASS等于同一次Studio全链、工程已经M5/M8准出，或文档整理即代表发布隔离已完成。
