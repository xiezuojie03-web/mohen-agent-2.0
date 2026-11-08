# 墨痕 MAB｜当前工程执行交接书

> 本文件只提供当前工程执行入口，不另立任务范围、顺序、专业合同或验收标准。唯一施工计划是 tasks/implementation/MAB/PLAN.md；实际进度和证据写入 progress.md；74目标差异写入 target-diff.csv；当前运行快照写入根 CURRENT.md。

## 新工程权威入口（2026-11-05 Owner 纠偏）

- 根 AGENTS.md → governance/mhka/MHKA-00—05：新工程唯一设计权威。
- 授权专业合同：落实D00—D05/L0—L5/G0—G5、知识资产、Agent、人文创作及产品消费职责。
- tasks/implementation/MAB/PLAN.md：M0—M8唯一施工计划、当前顺序和验收标准。
- 旧C0—C4只作历史来源和兼容参照；M8负责正式生产启用、旧运行代际退役，不是新架构开始指导开发的时间。

## 当前状态

- 施工接续读取基线：GitHub main@9c20ddf934a3f6caf5b702371d93051a1d6b1abf（本次受控文档修订之前）；Trae开工必须先重新fetch核HEAD并与本地安全对齐，不能以本行作当前HEAD断言。历史CI 42453345351及隔离HTTP 42453345284 SUCCESS，只代表其对应隔离版本。
- 当前施工：M5_REMEDIATION_ACTIVE / QUALITY_REMEDIATION_ACTIVE；PLAN.md §0.1登记QR-01—QR-10，**§0.2登记Trae本地总装和首用户交付裁决**；当前未准出。
- 整体验收：M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。
- M0审查级EXIT_PASS冻结继承；M1—M4仅补M5真实作品必需缺口；M6—M8不提前启动。
- 起始main主CI 42238756963的MHKA权威入口失败已关闭；PR完整CI 42318629059与合并后main CI 42318924701均SUCCESS。历史失败保留，不以文档提交本身认定通过。

## 当前施工顺序

1. 每次先核最新main、commit差异、Actions、Vercel和受控文档状态；不强推、不盲目reset、不覆盖未提交成果。现有两个MAB分支只作候选评估，不整支合并。
2. QR-01项目绑定已完成隔离代码/迁移测试，生产列缺失时会在Provider前HOLD；QR-02已改MATERIALIZED事务局部身份，仍需同一Node PG连接复用正反测试；继续QR-08本地执行授权条件核验。
3. 先统一KAD/Gate rights_by_action词典；生产39条来源均无rights_by_action/external_processing，Studio资产修订0条，必须先建立可审核的source_anchor/asset_revision权利快照；缺失/unknown一律HOLD。
4. QR-03已完成未知费用冻结、费用状态累计、UTF-8上界、完整响应超时和成功重放；仍需评估`mab/m4-provider-spend-controls-20261107`，解决多调用Delegation兼容后再实现持久原子预算预留/对账/恢复。
5. 完成QR-06同root Agent+外部AI协作、QR-07知识资产来源依赖回链；随后按PLAN既有M1—M5条件和八维度矩阵做一次完整回归。Owner体验签收最后进行。

## 本地Trae总装入口（2026-11-08 Owner最新执行裁决）

- **唯一施工标准**：`tasks/implementation/MAB/PLAN.md` **§0.2**（本地安全同步、总装责任、CP0—CP5过程控制、全角色首用户可开放级交付）；继续按**§0.1、§3.1—3.5、§5、§6**原工程依赖与门禁执行，不另起计划。
- **Trae本地唯一工程集成者**：先核真实本地工作树/未提交/未推送内容，备份并执行`git fetch origin main`、双向差异检查；安全fast-forward或保留冲突另作受控解决，禁止重置覆盖；再在持久非生产环境完成M1—M5真实总装、M6/M7验收及M8经授权的Owner首用户私有部署。
- **Owner过程控制**：CP0备份同步；CP1持久环境与M1/M2；CP2真实D00—D05/独立G0—G5；CP3同root内外AI；CP4 Studio/Admin/WATCH与M6/M7；CP5 M8首用户完整验收。每点提交简短证据/阻断/下一步，暂停新增施工等Owner“继续”；不让Owner体验半成品或替工程师调试。
- **ChatGPT**：仅独立代码/合同/验收核查，不同时改main；CodeBuddy按Owner指令处理具名环境缺口；Codex不使用。所有版本/证据/阻断继续原位入`progress.md`、`CURRENT.md`，不得以口头报告签PASS。
- **最终交付边界**：原M5隔离PASS不等于公开可用；跨M6/M7/M8完整门，Owner在实际Web按各独立角色测试，达到可对外开放级别**但不开放公众**；生产迁移、正式Gate和私有Owner入口启用仍须对应授权。

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


## 生产环境核验（2026-11-08）

- SEC-01已通过生产只读查询确认关闭：imported_materials RLS启用，anon/authenticated无直接SELECT/INSERT/UPDATE。
- 生产source rights未形成动作级授权快照；source.sources 39条中rights_by_action/external_processing为0，source_versions权利快照为0。
- Studio projects/asset_revisions均为0；private_originals和Storage bucket缺失；Gate policy/reviewer/current qualification缺失；director_plans.project_id列未部署。
- 当前代码在project binding schema缺失时先HOLD，不付费调用。生产DB/Storage迁移、正式Gate启用及任何公开发布仍需单独授权。
