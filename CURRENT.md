# 墨痕｜当前工程事实快照

> **职责**：当前代码与运行证据及剩余阻断，不规定工程施工标准。唯一计划：`tasks/implementation/MAB/PLAN.md` V1.6；历史逐批证据：`tasks/implementation/MAB/progress.md`。每次施工仍须实时查询GitHub `main` HEAD、CI、PG/HTTP及部署，不能把本页SHA当永久最新版本。

**核验日期：2026-11-14。最近Studio功能代码/CI检查点：`main@78709c026f0d5bdff7dbd9d5f8249711a86907e3`。** 本页后续文档更新会形成新的main SHA，但不改变该次业务测试的证据身份。

## 1. 阶段与准出

- M0：`EXIT_PASS`（审查级证据冻结继承，不重做全量差异核查）。
- M1—M4：`CONDITIONAL_EXIT`，原固定条件与M5所需具名缺口仍有效，已验未变化的实现复用。
- M5：`M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`；六个独立Gate的组件正向与局部UI/作品证据，**不能代替同一持久隔离实例中从Studio真实自由选题到D00—D05/G0—G5、Agent/Provider、知识资产、导演修订、Admin、发布与WATCH的八维度完整验收**。
- M6—M8：`NOT_STARTED`；本轮没有执行生产库/Storage迁移、正式Gate投运、公众开放或Owner最终签收。

## 2. 最新可核的质量与发布事实

| 门 | SHA与可核结果 | 不能推出 |
|---|---|---|
| GitHub 主CI | `78709c02`，[run 43585324862](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43585324862) **SUCCESS**：类型检查、构建、路由与迁移预检，单测 **685 PASS/0 FAIL/4 SKIP**，数据生产 **248 PASS/0 FAIL**、严格权限覆盖均过 | 不等于 M5 真作品全链或生产可用 |
| 隔离PostgreSQL17 | `7f36db2d`，[run 43585072924](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43585072924) **SUCCESS**，真实PG17验证 Studio/项目范围变更后的权限、资产、Gate、撤权及回滚 | 不等于正式生产DB已迁移、真实原件/Provider已就绪 |
| 隔离HTTP/Chromium | `99ef0774`，[run 43585157777](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43585157777) **SUCCESS**，**24 PASS/0 FAIL**：真实Next/Chromium + 隔离PG，新增Studio底稿恢复、HOLD不能启动正式生产、跨Owner POST拒绝的实际浏览器/HTTP断言 | 不等于混合Agent、正式D/G真材料全链或Owner正式体验签收 |
| HP13 74目标哈希审计 | `missing_target_count=0`，但仍有`HANDOFF_DECLARED_SHA256_MISMATCH`及`unverified_semantics_count=74`；原审计结果仍上传，CI将此明确的“informational”步骤记为允许失败 | 不得将74目标当成已完成语义级准出 |
| Vercel部署隔离 | 仓库根`vercel.json` `git.deploymentEnabled=false`（`5b02081b`）。随后`51ba77f7`、`6ea907d4`、`091c5ac5`、`61e6e3a1`、`76b7ffd2`、`c594f4ee`等main提交均触发GitHub CI，**未触发新Vercel production部署**；最近列表中的生产READY仍来自配置关闭前的`83560224` | 不等于生产部署/手动发布已演练，亦不授权生产切换 |

## 3. 关键修复与未关闭的运行边界

- 原6项单测问题已经修复并在最新主CI全部转绿。包括导入权利状态枚举、D04证据方法夹具、Registry部分激活前置与独立Gate Reviewer错误诊断/当前资格CAS夹具。负例和Gate失败关闭未取消。
- 新发现并修复真实的内容指纹回归：`20261114210000`迁移意外覆盖K5“登记内容列计算artifact revision”函数；已以**后续补偿迁移**`20261114220000_mab_m5_restore_registered_content_revision.sql`恢复，隔离PG证实无关列变化不移动内容修订，并保留G3 claim_revision映射。
- 原隔离PG失败涉及QR05权利词典迁移时序及旧固定项目Reviewer断言，已在真实隔离PG复核通过。原公开消费HTTP 500由于隔离DB缺ST05/07/08/09正式Schema，补入HTTP隔离迁移链后24项浏览器测试均过。
- **生产环境与持久首用户环境没有在本轮重新启用或验证**；先前只读云端核查显示Schema/Storage与本地隔离环境存在差异，未获正式生产迁移/Reviewer/Gate激活授权前仍HOLD。
- **M5 Studio入口受控接线新增（本轮）**：ST-01研究委托已与ST-04显式生产申请在页面交接，正式启动的POST与生产run读取不再只靠不可返回的自动run_id；Runner与G0—G5候选绑定当前Creator受权真实project，不再使用样板project；持久底稿可按Owner恢复，经现行材料资格核验后才展示研究结论。真实新题材/真实独立Gate仍未被实跑准出。
- **已验证的下一M5真实阻断**：`pipelines/data-production/adapters/layer1-adapters.mjs`自由题材D00尚未承担`source.source_needs` Y01受控需求回执；`20261113160000_mab_gate_scope_rule_for_studio_projects.sql`规定新Studio项目的规则化Reviewer签发须已有该回执，且`20261110110000_mab_d00c_source_discovery_ledger.sql`仅将其写入权授予`mohen_private_worker`而非Producer。现有`private-evidence-stage.mjs`有Y01执行方法，应按PLAN在可信原件链中接续，**不得给Producer加权或伪造来源回执**。外部AI、真实原件/Storage/本地可信Reviewer/独立G仍需具备实际运行证据。
- **自动Git生产部署已隔离**，但手工部署的精确SHA选择、回滚、服务可用性仍归M8与原授权，不因CI全绿而自动执行。

## 4. 下一实际施工入口

依据`PLAN.md` §0.1/§3.5/§5/§6，从现有M5真实UI整链断点继续：同一合法真实来源→D00—D05/G0—G5连续执行→同root内外AI及实际权限/Receipt→可追溯资产/Studio修订→Admin/发布/WATCH/撤权；完成八维度正反、持久恢复及Owner正式体验。CI/隔离PG/HTTP的**已验证质量底座直接继承**，不无证据重复修，M6—M8仍按原门推进。
