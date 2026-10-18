# ARCH-MIG-01工程任务顺序（交付任务，未发令）

状态：PACKAGE_AUTHORIZED / DESIGN_TARGET_NOT_APPLIED；用户2026-10-16明确确认：GitHub仓库就是CodeBuddy上一轮执行并同步的工程，执行完已停止一切工程任务，等待新架构迁移。直接采用handoff/local-b-20260930@8966d1bf62d7c2ea199d6568cc1b16bba664bd26作为已确认工程基线；不再开展GitHub与本地同步/差异审计，也不要求重新盘点HEAD、分支、worktree、未提交状态作为M0准出项。

用户已审阅宪法并授权文件补齐与核验后打包。此文件不授权M0或工程写入。

| 批次 | 唯一范围 | 必须提交与停止条件 |
|---|---|---|
| M0 | 直接采用用户已确认同步停工基线；只读核对新架构接口/配置/Schema证据及回滚条件；完成刚性必读、K29/251文件处置/36测试分派台账和跨组一致性复核 | 不运行SQL、不stash/checkout/reset/clean/commit/push、不部署；无法核实的运行库事实保留TO_VERIFY_IN_M0并列所需证据，不用迁移文件冒已应用 |
| M1 | 获准后适配治理/入口/协议/Registry/Gate/Skill与Schema差异方案，隔离代际 | Schema只提交差异/备份/回滚方案；真实DDL、回填、数据库读写须相应独立授权。新Registry继续禁用 |
| M2 | D00—D02、L0—L2、G0—G2与C/H方法 | PRODUCTION/METHODS/PERSISTENCE/QUALIFICATION/REPORTING合同；来源—读取—材料分别Owner，独立门，不继承旧PASS |
| M3 | D03—D04、L3/L4、G3/G4及W/A方法 | 同组合同按本批裁切；事实/解释分离、竞争主张与精准依赖，不提前实施D05消费切换 |
| M4 | D05、六类L5、P01—P08、独立G5、双消费/返证/缓存/精准撤权与真实Web接线 | CONSUMPTION/WEB/INVALIDATION等合同；纯事实与解释分流；P08控制即时阻断而非第七L5；正式56边不放行 |
| M5 | 全量回归、分层E2E、回滚复验及获准范围内Preview | GUARDS/REPORTING/ROLLBACK和36场景；合成、工程与真实实例分别记录，用户视觉/业务终验；无部署授权不部署 |

每批获用户授权后执行；FAIL/BLOCKED不得自动推进。代码与SQL由CodeBuddy实施及技术自检；ChatGPT仅按需专业咨询。每批直接向用户交标准回执，列实际diff、测试命令/结果、剩余条件及回滚。没有真实证据不得写运行PASS；MIG-01、真实G5仍HOLD，56正式延期DESIGN_HOLD。

M0采用两步顺序执行：M0-A先按包内候选索引、清单和K01—K29定位文件/章节及真实工程接口，生成带分类、理由、合同映射、后续批次与STOP的阅读计划；M0-B按计划读取必要原文、实际源码/配置并扩读疑点。50项改为候选入口，不是50份全文必读；不以1.8万或45万字符决定范围。主协议/DATA/PERSISTENCE/六门配置全文及权威Owner、六阶段交接、独立资格、双消费返证、精准撤权/缓存/回退等关键相关条款必须在B核验；长宪法及阶段规范可按完整相关章节读取，算法细节只在接口需要时追读，实施前仍须读对应方法原文。A自核路线通过自主继续B，不要求中间人工批准；A只记M0_A_ROUTING_COMPLETE，不代表M0准出。 仅在M0-results/保存审查输出，不改包内输入或工程。

交付包根codebuddy_tasks/M0—M5文件细化本表，包根START_CODEBUDDY.md为用户可复制发令稿；它们不作为日常生产入口。
