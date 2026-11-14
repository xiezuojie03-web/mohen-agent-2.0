# 墨痕｜当前工程事实快照

> **职责**：当前代码与运行证据及剩余阻断，不规定工程施工标准。唯一计划：`tasks/implementation/MAB/PLAN.md` V1.6；历史逐批证据：`tasks/implementation/MAB/progress.md`。每次施工仍须实时查询GitHub `main` HEAD、CI、PG/HTTP及部署，不能把本页SHA当永久最新版本。

**核验日期：2026-11-14。最近完整业务代码/CI检查点：`main@c594f4eeca1adf6fbe37f741635eac90787a3492`。** 本页后续文档更新会形成新的main SHA，但不改变该次业务测试的证据身份。

## 1. 阶段与准出

- M0：`EXIT_PASS`（审查级证据冻结继承，不重做全量差异核查）。
- M1—M4：`CONDITIONAL_EXIT`，原固定条件与M5所需具名缺口仍有效，已验未变化的实现复用。
- M5：`M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`；六个独立Gate的组件正向与局部UI/作品证据，**不能代替同一持久隔离实例中从Studio真实自由选题到D00—D05/G0—G5、Agent/Provider、知识资产、导演修订、Admin、发布与WATCH的八维度完整验收**。
- M6—M8：`NOT_STARTED`；本轮没有执行生产库/Storage迁移、正式Gate投运、公众开放或Owner最终签收。

## 2. 最新可核的质量与发布事实

| 门 | SHA与可核结果 | 不能推出 |
|---|---|---|
| GitHub 主CI | `c594f4ee`， [run 43582293608](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43582293608) **SUCCESS**：工程权威导航、Skill检查、类型、Playwright规格解析、单测**682 PASS/0 FAIL/4 SKIP**、数据生产**246 PASS/0 FAIL**、迁移预检、K3追溯、**Next Build**、严格权限覆盖均过 | 不等于M5真作品全链或生产可用 |
| 隔离PostgreSQL17 | `76b7ffd2`，[run 43582203932](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43582203932) **SUCCESS**，日志 `K3_DB_TEST_PASS`，包括真实权限/RLS、Studio资产、Gate Reviewer动态范围、内容指纹、撤权、备份回滚；其后仅变更HTTP执行脚本，未影响PG测试源码/迁移 | 不等于正式生产DB已迁移或真实云端身份通过 |
| 隔离HTTP/Chromium | `c594f4ee`，[run 43582293680](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43582293680) **SUCCESS**，**24 passed/0 failed**：真实Next服务、隔离PG17、Chromium、公开消费者资格/缓存、Studio修订、独立G5、撤权与Admin路径 | 不等于真实历史原件、付费模型或Owner全角色运行的验收 |
| HP13 74目标哈希审计 | `missing_target_count=0`，但仍有`HANDOFF_DECLARED_SHA256_MISMATCH`及`unverified_semantics_count=74`；原审计结果仍上传，CI将此明确的“informational”步骤记为允许失败 | 不得将74目标当成已完成语义级准出 |
| Vercel部署隔离 | 仓库根`vercel.json` `git.deploymentEnabled=false`（`5b02081b`）。随后`51ba77f7`、`6ea907d4`、`091c5ac5`、`61e6e3a1`、`76b7ffd2`、`c594f4ee`等main提交均触发GitHub CI，**未触发新Vercel production部署**；最近列表中的生产READY仍来自配置关闭前的`83560224` | 不等于生产部署/手动发布已演练，亦不授权生产切换 |

## 3. 关键修复与未关闭的运行边界

- 原6项单测问题已经修复并在最新主CI全部转绿。包括导入权利状态枚举、D04证据方法夹具、Registry部分激活前置与独立Gate Reviewer错误诊断/当前资格CAS夹具。负例和Gate失败关闭未取消。
- 新发现并修复真实的内容指纹回归：`20261114210000`迁移意外覆盖K5“登记内容列计算artifact revision”函数；已以**后续补偿迁移**`20261114220000_mab_m5_restore_registered_content_revision.sql`恢复，隔离PG证实无关列变化不移动内容修订，并保留G3 claim_revision映射。
- 原隔离PG失败涉及QR05权利词典迁移时序及旧固定项目Reviewer断言，已在真实隔离PG复核通过。原公开消费HTTP 500由于隔离DB缺ST05/07/08/09正式Schema，补入HTTP隔离迁移链后24项浏览器测试均过。
- **生产环境与持久首用户环境没有在本轮重新启用或验证**；先前只读云端核查显示Schema/Storage与本地隔离环境存在差异，未获正式生产迁移/Reviewer/Gate激活授权前仍HOLD。
- **自动Git生产部署已隔离**，但手工部署的精确SHA选择、回滚、服务可用性仍归M8与原授权，不因CI全绿而自动执行。

## 4. 下一实际施工入口

依据`PLAN.md` §0.1/§3.5/§5/§6，从现有M5真实UI整链断点继续：同一合法真实来源→D00—D05/G0—G5连续执行→同root内外AI及实际权限/Receipt→可追溯资产/Studio修订→Admin/发布/WATCH/撤权；完成八维度正反、持久恢复及Owner正式体验。CI/隔离PG/HTTP的**已验证质量底座直接继承**，不无证据重复修，M6—M8仍按原门推进。
