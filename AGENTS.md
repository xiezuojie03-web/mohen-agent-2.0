# 墨痕 MoHen｜工程入口与权威导航

> 本文件只回答“到哪里找唯一依据、按什么顺序核实事实”。**不另立施工计划、验收标准、执行平台或生产授权**。2026-11-14起统一按 `tasks/implementation/MAB/PLAN.md` V1.7 的单main、工具无关执行规则。

## 1. 权威顺序与不可越界的底线

Owner已批准的裁决 → `MHKA-00—05` 相应设计职责 → 现行授权专业合同 → `MAB-ENG-01` 受控任务书 → `tasks/implementation/MAB/PLAN.md` 唯一施工顺序与准出标准。旧C0—C4仅为历史来源与运行兼容，不是当前目标设计权威；M8负责生产启用及旧运行代际受控退役，并非MHKA开始指导施工的时间。

**设计、代码、CI、隔离验证、线上验证、Owner签收是不同证据层。** 任何工具不得自签专业Gate、绕过来源权利或权限、擅用生产密钥、迁移生产数据、增加付费或向公众开放。不能因旧代码、部署READY、历史快照或工具输出否定现行合同，也不能因合同存在冒充运行PASS。

## 2. 依任务领域按需读取的唯一索引

| 需要解决的问题 | 权威入口 |
|---|---|
| 治理、Owner裁决 | `governance/mhka/MHKA-00_Governance_Charter.md` |
| 核心价值与战略 | `governance/mhka/MHKA-01_Value_and_Strategy.md` |
| 人文产品、Studio/WATCH/EXP | `governance/mhka/MHKA-02_Humanistic_Product_and_Experience.md` |
| 知识世界、资产、D/L/G | `governance/mhka/MHKA-03_Knowledge_World_and_Data_Architecture.md` |
| Agent、方法、Skill、混合AI | `governance/mhka/MHKA-04_Agent_and_Professional_Capabilities.md` |
| 工程、安全与运维 | `governance/mhka/MHKA-05_Software_Engineering_and_Operations.md` |
| 知识资产生命周期 | `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` |
| Agent专业合同 | `specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` |
| 运行架构合同 | `specs/SYSTEM_RUNTIME_ARCHITECTURE.md` |
| 人文叙事与组件 | `specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md` |
| 数据生产与Registry | `specs/data-production/MoHen_Data_Production_Protocol.md`；`specs/data-production/production-registry.json` |
| **唯一施工计划、标准** | `tasks/implementation/MAB/PLAN.md` |
| **当前工程事实与风险** | `CURRENT.md`（事实仍需对照实时GitHub/CI/DB/部署验证） |
| **M5主干工程指南针（非权威、持续更新）** | `tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json`（机器按节点/边与八维定位）＋同目录`.md`（人机解释）/`.html`（点击检查），三份同一提交同步；须再对照当前HEAD与实跑证据 |
| **不可变历史过程与证据** | `tasks/implementation/MAB/progress.md`（优先读顶端说明、末尾最新批及所需历史段落） |
| 目标级差异与实际接线 | `tasks/implementation/MAB/target-diff.csv` |
| 快速接续入口 | `tasks/implementation/MAB/ENGINEERING_HANDOFF_CURRENT.md` |
| 文件归属及执行代码 | `OWNERSHIP_MAP.md`；`pipelines/data-production/run.mjs` |
| 冻结设计交付包与吸收记录 | `tasks/implementation/MAB/inputs/mab-package-20261102/`；PLAN附录D |

## 3. 一次施工的最短读取与写入顺序

1. **先核实现场**：重新取远端`main` HEAD、最新相关CI及生产自动部署隔离状态；用`CURRENT.md`定位已知断点。历史SHA与旧报告不能充作当前基线。
2. **再读精准合同**：读本PLAN对应阶段/QR/CP和相应MHKA及专业合同，必要时定位`progress.md`最后一批/精确证据；**不从头通读数千行施工史，也不无条件读全部架构文件**。 **M5主干施工必读导航JSON（含 navigation_policy、acceptance_dimensions、nodes[]、edges[]）；再按实际缺口读取MD/HTML。该导航不是准出依据，任何边以当前源码与运行证据核实。**
3. **只在单main范围施工**：依PLAN §0.2先确认“提交不会自动发布生产”的隔离已实测；未完成只能做获授权的文档/只读任务及不触生产的准备。每批检查受影响文件版本，禁止并行竞争写、强推、重置及新建施工分支/PR。
4. **验证和留账**：按任务实际执行POS/NEG/AUTH、PG/HTTP、Gate/权限、恢复/撤权等必要用例；没运行标NOT_RUN，遇到阻断标具名HOLD。只把实际SHA/测试/费用/回滚写`progress.md`，运行事实变化时刷新`CURRENT.md`；`PLAN.md`只在任务/规则/验收标准变化时修改。

**持续施工口径**：只按PLAN §0及§3.5 D选同一真实任务的当前最前断点；可用成果直接复用，缺交接补交接，必要时在原职责内修复或替换。历史继承索引按本次受影响范围查阅，不设每批全量历史审计前置；不因旧记录缺失从零重建。配置阻断只挡依赖它的真实操作，继续其他已授权可执行工作；旧已修断点须先对照当前代码，不能重复施工。

## 4. Owner先前裁决的适用边界

2026-11-12“本地优先、批量推送”仅用于Owner明确安排且网络/环境无法及时同步的施工窗口；临时未推送提交必须标`PENDING_PUSH`、受控保全并在恢复时对账。**正常连接时按最新PLAN执行小批次main提交**；不得把历史窗口规则误当永久禁令。工具转换不改变唯一执行责任，也不允许多人并发写main。

如上位规则造成循环、真实冲突或不可执行障碍，提交条款位置、原始失败、风险和最小修正建议，请Owner裁决；安全底线不得暗中降低。辅助开发Skill `.agents/skills/mohen-dev-continuation/SKILL.md` 只作为方法入口，不具产品Registry、正式Gate或生产权限。
