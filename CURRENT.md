# 墨痕｜当前工程事实快照

> **职责**：当前代码与运行证据及剩余阻断，不规定工程施工标准。唯一计划：`tasks/implementation/MAB/PLAN.md` V1.7；历史逐批证据：`tasks/implementation/MAB/progress.md`。每次施工仍须实时查询GitHub `main` HEAD、CI、PG/HTTP及部署，不能把本页SHA当永久最新版本。

**核验日期：2026-11-14。最新批次A业务/测试提交：`main@8b0efba79a41ea15238343688c3b3ac1f646a265`；主CI [43610692797](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43610692797) SUCCESS。** 后续文档提交将生成另一个main SHA，不替换该业务测试证据身份。真实持久Studio→D00→独立G0仍未实测准出。

## 1. 唯一当前验收：PLAN §3.5 B 八维

- M0：`EXIT_PASS`（审查级证据冻结继承，不重做全量差异核查）。
- M1—M4：`CONDITIONAL_EXIT`，原固定条件与M5所需具名缺口仍有效，已验未变化的实现复用。
- M5：`M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`；六个独立Gate的组件正向与局部UI/作品证据，**不能代替同一持久隔离实例中从Studio真实自由选题到D00—D05/G0—G5、Agent/Provider、知识资产、导演修订、Admin、发布与WATCH的八维度完整验收**。
- M6—M8：`NOT_STARTED`；本轮没有执行生产库/Storage迁移、正式Gate投运、公众开放或Owner最终签收。

**Owner进度口径**：只报告同一真实作品已达到的最远受证节点、下一处不能继续的连接及M5八维准出；QR、CP、HP、旧M1—M4是工程回溯索引，不是另几套准出率。

## 2. 最新可核的质量与发布事实

| 门 | SHA与可核结果 | 不能推出 |
|---|---|---|
| **批次A最新代码质量** | `8b0efba`，[run 43610692797](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43610692797) **SUCCESS**；修复Registry私有Adapter正式双绑定、Studio携带可信Owner/session/source/page、运行D00选择C01/C02、Y07受限本地实际回读记录及失败关闭测试 | **非**同一真实作品的独立G0 PASS；Y07本地回读不证明外部机构获取或权利 |
| **批次A隔离回归** | `86faf76a`及前序 `c6a05f83`有隔离PG17 SUCCESS [43609531072](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43609531072)；`642c3323`隔离HTTP/Chromium [43610472680](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43610472680) SUCCESS；旧 `2a34f3f6` CI类型红灯、`642c3323` CI旧测试断言红灯已分别由后续提交修复 | 已有隔离PG/HTTP证据仍不等于`8b0efba`的真实Studio→D00/G0持续环境验收 |
| GitHub 主CI | `15fda338`，[run 43591589635](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43591589635) **SUCCESS**：类型、构建、单测、生产边界与鉴权守卫通过，覆盖本次Studio真实来源/版本准入与错误Binding提前拒绝 | 不等于Runner已完成Private Worker/G0连续签发 |
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
- **批次A当前最远受证节点（准确区分）**：Studio身份/项目/原件元数据→Owner-RLS真实L0登记核对→明确页码→统一Registry审核的私有Adapter绑定→单一Runner D00-only真实启动参数与Owner会话传递→Y07本地原件已上传时间和可信Worker字节回读生成候选的**代码与测试**已进入main并主CI通过；原layer1非私有合法路径仍保留。**本轮尚无持久真实项目从UI启动D00写入G0候选、独立Reviewer签PASS与当前资格回读的正向实机证据**。
- **下一最前阻断**：同一持久、具名、非生产环境的真实Creator/Project/Root Task及合法原件正向实跑；需要已持久化真实原件/来源版本/逐动作权利依据、Owner会话、低权Worker、独立授权和G0 Reviewer。当前GitHub/CI无法访问Owner本地持久私有Storage与独立审签环境，故真实D00→G0记录为`NOT_RUN/DEFERRED_ENV`，不是模拟PASS。Y07的`M9001@private-original-readback.v1`仅为本次实际私有存储回读路径（DRAFT），不证明馆藏机构下载、来源合法许可或G0专业资格；若G0拒绝，保留准确拒因，不得降低权利门。
- **自动Git生产部署已隔离**，但手工部署的精确SHA选择、回滚、服务可用性仍归M8与原授权，不因CI全绿而自动执行。

## 4. 下一实际施工入口

依据`PLAN.md` §0.1/§3.5/§5/§6，从现有M5真实UI整链断点继续：同一合法真实来源→D00—D05/G0—G5连续执行→同root内外AI及实际权限/Receipt→可追溯资产/Studio修订→Admin/发布/WATCH/撤权；完成八维度正反、持久恢复及Owner正式体验。CI/隔离PG/HTTP的**已验证质量底座直接继承**，不无证据重复修，M6—M8仍按原门推进。
