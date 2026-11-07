# 墨痕｜当前真实工程状态

更新：2026-11-07。本文只记录当前状态，不承担施工计划或过程日志。

## 当前工程基线

- main：c1652c4b9bcf865c08d46c6baf5f4cc020286a86。
- 当前执行分支：mab/owner-led-execution-plan-20261107（Owner主导执行方式与计划结构收敛，等待PR CI）。
- 本次分支只修改工程计划、权威入口、执行交接和CI静态守卫；尚未修改应用源码、数据库、Storage、Gate运行配置或部署。
- 最新main主CI：42238756963 FAILURE；失败原因为权威路由守卫未找到交接文档中的MHKA裁决章节。当前分支已恢复该权威章节并将守卫改为检查工具无关的ENGINEERING_HANDOFF_CURRENT.md；必须以PR CI实际结果核验，不预先标PASS。

## 当前施工与准出

- 当前施工：M5_REMEDIATION_ACTIVE。
- M5整体：M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。
- M0：审查级EXIT_PASS，冻结继承，不重做全量盘点。
- M1—M4：仅补M5真实作品所需的具名缺口；原CONDITIONAL_EXIT和M1-C01—C04、M2-C01—C03、M3-C01—C03、M4-C01—C04继续有效。
- M6—M8：未启动，保持原依赖和准出范围。

## 当前两条并行施工线

**A线｜M1/M2真实原件条件**
- 在隔离环境完成真实Owner会话、最小权限、跨Owner/匿名/禁用/过期/退出撤权和恢复。
- 以NAJ《松江府志7》为首选原件，核定原件canvas/page locator，取得实际字节，私有持久化并回读SHA。
- 完成L0→L1→L2首次读取、同输入回放和撤权拒绝的PG/HTTP正反验证。
- 当前原件派生页仍只有临时文件证据；未持久化，不是ST02 PASS。

**B线｜M4受控Provider执行器**
- 在现有Delegation、Tool Registry、预算、Receipt、Guard和唯一Runner内施工。
- 先以合成输入完成PG/HTTP正反测试、真实币种费用模型、失败HOLD和恢复。
- 真实材料外发/模型调用必须等M1—M3真实Owner、来源权利、原件和独立资格前置满足。

**汇合后**
- M3完成D00—D05、63方法绑定、独立Reviewer和G0—G5签发/撤权/当前资格消费。
- M4完成同一root下Agent与外部AI真实互补及费用/Receipt/恢复。
- M5按ST-01→ST-09完成同一真实作品，并按PLAN八维度验收。

## 工具分工

- ChatGPT主导GitHub源码、文档、测试、CI、审查和状态回写。
- 不再使用Codex。
- 只有必须访问用户本地文件、本机浏览器、本地运行环境或本地凭据的任务，才集中交给CodeBuddy；完成后由ChatGPT核验commit与真实证据。

## 授权边界

M5范围内现有Provider必要低成本调用已获Owner授权，但必须通过受控执行器并绑定逐来源权利、purpose、输入、预算、实际费用和持久Receipt。新增Provider/账号/密钥、订阅/充值或明显扩大费用须另行确认。不得擅自执行生产DB/Storage迁移、正式Reviewer/Gate启用或公开生产发布。
