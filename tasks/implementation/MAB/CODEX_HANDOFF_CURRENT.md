# 墨痕 MAB｜Codex 当前执行交接书

> **唯一权威分工**：`AGENTS.md`规定工程权威路由；`tasks/implementation/MAB/PLAN.md`是唯一施工计划、顺序与验收标准；`progress.md`记录施工证据；`target-diff.csv`记录目标差异；根`CURRENT.md`只记录运行状态。本文件只负责本轮接续指令，不另立任务范围或准出标准。

## 当前接续状态

- 施工：`M5_REMEDIATION_ACTIVE`
- 整体验收：`M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`
- 目标：按PLAN八维度矩阵，完成同一项真实历史文化作品的端到端垂直切片。
- M0：审查级PASS，冻结继承，不重做全量盘点。
- M1—M4：只补齐M5真实作品所必需的具名缺口；已通过且未受影响的源码、合同和测试直接继承。

## 本轮执行顺序

1. 从GitHub `main`最新HEAD开始；先读取`AGENTS.md`、本交接书、`PLAN.md`当前施工裁决及M5八维矩阵、`progress.md`最新条目、`target-diff.csv`受影响行，并按需读取MHKA/专业合同。不得从历史SHA重置或覆盖Codex环境中未提交成果；先检查本地/云端工作树、分支、未提交改动和提交差异。
2. A线：核实并补齐M1隔离Owner会话、最小权限、跨Owner/匿名/禁用/过期/退出撤权与恢复；完成M2合法真实原件字节持久化、回读/hash/locator及L0→L1→L2首次/回放/撤权PG+HTTP正反。
3. B线可并行：在既有M4 Delegation/Tool Registry/预算/Receipt/Guard体系内实现受控Provider执行器；先用合成输入完成代码、PG/HTTP正反、真实币种/token成本核销、失败/未知费用HOLD与恢复测试。不得新建平行调度/账本/授权系统。
4. A/B汇合后完成M3真实D00—D05与独立Reviewer/G0—G5签发/撤权/当前资格消费；再完成M4真实混合协作。真实材料外发/模型调用必须等M1—M3真实来源、权利、Owner和独立资格前置满足。
5. 按PLAN的ST-01→ST-09补齐同一作品闭环；ST01已通过的Brief持久化/幂等子项直接继承，只补未完成部分。最终八维度必须由同一真实作品贯通，不能用独立演示拼凑PASS。

## 授权与硬边界

- M5范围内使用现有已配置Provider进行必要低成本开发、隔离测试和受控真实研究调用已获Owner授权；新增Provider/账号/密钥、订阅/额度/充值或明显扩大费用/批量调用，先向Owner说明并确认。
- 每次外部调用必须经过受控执行器，绑定来源权利、purpose、provider/model、input manifest/hash、预算、token/用量、实际币种费用、输出hash和持久Receipt。密钥只从受控服务端Secret读取；不得写入仓库、提示词、日志或客户端。费用未知/结果不确定即HOLD，不自动重试、不补零。
- 不得擅自执行生产DB/Storage迁移、创建生产桶、启用正式Reviewer/Gate、生产发布或公开发布；这些权限不在本轮复工范围。
- 不重做KAD设计、来源搜索、容量/Key评估或无变化的全量测试；不得把CI、mock、静态结构、CODE_PRESENT或隔离PASS升级成真实生产/专业Gate/Owner体验PASS。
- 保留F01—F05与UI五图已批准体验；不重开UXD，不制作新UI模拟，不删除早期五阶段代码，除非完整调用者/CI/DB迁移/回滚依赖证明满足既有清退条件。

## 施工回执

每个批次完成后立即更新`progress.md`、受影响的`target-diff.csv`与PLAN状态；只有运行事实变化才更新根`CURRENT.md`。记录before/after SHA、变更路径、原要求ID、依赖、测试命令与环境、正反/权限证据、PG/HTTP、真实调用成本与Receipt、HOLD、回滚。测试未运行写`NOT_RUN`；失败如实保留，不以新文档覆盖旧失败。

**停止条件**：若当前工具无法执行真实PG/HTTP/浏览器或安全Secret读取，只完成其可核验范围，并把精确待执行命令、环境要求、预期正反结果和回滚写入回执；不得假报PASS。相同障碍连续两次无新证据时，停止重复尝试，改路径或标记具名BLOCKED。
