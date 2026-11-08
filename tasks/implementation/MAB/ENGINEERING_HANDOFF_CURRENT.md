# 墨痕 MAB｜当前工程执行交接书

> 本文件只提供当前工程执行入口，不另立任务范围、顺序、专业合同或验收标准。唯一施工计划是 tasks/implementation/MAB/PLAN.md；实际进度和证据写入 progress.md；74目标差异写入 target-diff.csv；当前运行快照写入根 CURRENT.md。

## 新工程权威入口（2026-11-05 Owner 纠偏）

- 根 AGENTS.md → governance/mhka/MHKA-00—05：新工程唯一设计权威。
- 授权专业合同：落实D00—D05/L0—L5/G0—G5、知识资产、Agent、人文创作及产品消费职责。
- tasks/implementation/MAB/PLAN.md：M0—M8唯一施工计划、当前顺序和验收标准。
- 旧C0—C4只作历史来源和兼容参照；M8负责正式生产启用、旧运行代际退役，不是新架构开始指导开发的时间。

## 当前状态

- 远端基线：main@0fe38aa88cd1150fdae55f0a3190dfc299cc5fa7（2026-11-08最新HEAD）；父提交3f8cc1b的CI 42444946341 SUCCESS，0fe38aa自身完整CI待复跑。
- 当前施工：M5_REMEDIATION_ACTIVE / QUALITY_REMEDIATION_ACTIVE；唯一施工计划PLAN.md §0.1已登记QR-01—QR-10。
- 整体验收：M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。
- M0审查级EXIT_PASS冻结继承；M1—M4仅补M5真实作品必需缺口；M6—M8不提前启动。
- 起始main主CI 42238756963的MHKA权威入口失败已关闭；PR完整CI 42318629059与合并后main CI 42318924701均SUCCESS。历史失败保留，不以文档提交本身认定通过。

## 当前施工顺序

1. 每次先核最新main、commit差异、Actions、Vercel和受控文档状态；不强推、不盲目reset、不覆盖未提交成果。现有两个MAB分支只作候选评估，不整支合并。
2. 按PLAN §0.1优先关闭QR-01/02/08：项目—委托绑定、连接池身份上下文、本地执行授权条件；补正反和真实PG测试。
3. 对齐QR-04/05权利动作合同及G5/媒体许可，再定向修复Provider外发和独立Reviewer；缺失权利字段一律HOLD。
4. 评估`mab/m4-provider-spend-controls-20261107`并在既有ExecutionControl/Receipt内完成QR-03持久预算预留、未知费用冻结、对账和恢复；先验证与当前多调用Grant兼容，不新建平行账本。
5. 完成QR-06同root Agent+外部AI协作、QR-07知识资产来源依赖回链；随后按PLAN既有M1—M5条件和八维度矩阵做一次完整回归。Owner体验签收最后进行。

## 工具分工

- **ChatGPT主导：** GitHub源码和文档修改、测试与CI、代码审查、受控迁移候选、进度/差异/当前状态回写。
- **CodeBuddy集中处理：** 仅处理必须访问用户本地原件、本机浏览器、本地运行环境、本地凭据或当前连接器无法安全触达的任务。每次交接必须包含精确路径/命令、环境、授权、POS/NEG/AUTH验收、失败关闭和回滚。
- **Codex不再作为本轮执行工具。**
- CodeBuddy完成后将commit和实际测试回执交回，由ChatGPT核对GitHub源码、CI、环境和证据；不能只凭口头报告准出。

## 授权与硬边界

- M5范围内现有Provider必要低成本开发、隔离测试和受控真实研究调用已获Owner授权；新增Provider/账号/密钥、订阅/额度/充值或明显扩大费用/批量调用，先说明并取得确认。
- 每次外部调用必须经过受控执行器，绑定逐来源权利、purpose、provider/model、input manifest/hash、预算、实际token/用量、币种费用、输出hash和持久Receipt。密钥只从受控服务端Secret读取；不得写入仓库、提示词、日志、客户端或聊天。
- 费用未知、响应不确定或Receipt持久化失败即HOLD；不自动重试可能已收费调用，不补零，不以内部credit冒充实际费用。
- 不执行未经单独授权的生产DB/Storage迁移、创建生产桶、启用正式Reviewer/Gate、生产发布或公开发布。
- 真实材料外发/模型调用必须满足M1—M3真实Owner、来源权利、原件和独立资格前置；Provider执行器的合成测试可以并行。
- 不重做KAD设计、来源搜索、容量/Key评估或无变化的全量测试；不重开UXD，不制作新UI模拟，不删除早期五阶段代码，除非既有清退条件全部有证据。

## 施工回执

每批完成后更新PLAN对应状态、progress.md和受影响的target-diff.csv；只有运行事实变化才更新根CURRENT.md。记录before/after SHA、变更路径、要求ID、依赖、测试命令/环境、POS/NEG/AUTH、PG/HTTP、真实调用成本与Receipt、HOLD和回滚。未运行写NOT_RUN；失败原样保留。

若当前环境无法执行真实PG/HTTP/浏览器或安全Secret读取，先完成可独立的源码和合成测试，再将确实需要本地/用户环境的任务集中交给CodeBuddy。相同障碍连续两次无新证据时，停止重复尝试，改路径或登记具名BLOCKED。


## 2026-11-08质量整改接续提示

- 最新main：`0fe38aa88cd1150fdae55f0a3190dfc299cc5fa7`。先读PLAN §0.1、§3.5及progress最新记录，不按旧CURRENT/历史交接描述推断。
- 两个MAB候选分支未合并。Provider spend分支有持久预留/对账设计，但需先解决当前多调用Delegation与source_refs权利合同的兼容问题。
- 本轮不执行生产DB/Storage迁移、正式Reviewer/Gate启用或公开生产发布；任何新增Provider、账号、密钥、订阅/额度或明显扩大费用仍须单独确认。
