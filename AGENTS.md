# 墨痕 MoHen｜AI 工程入口与新架构权威路由

> **2026-11-05 Owner 纠偏：新架构从施工开始即为工程设计依据，不得等到 M8。** 本入口只指向 Authority 和执行资料；它不授权生产上线、付费、真实数据变更或独立 Gate 签发，也不证明尚未验收的功能已实现。

## 0｜强制设计权威与事实边界

**本轮所有 ChatGPT、CodeBuddy 工程设计、开发、审查、修复、测试和交接，必须以已批准的 MHKA-00—05 新架构及其授权的现行专业合同为唯一上位依据。** 旧 C0—C4 只保留作历史来源与旧实现的兼容参照，不是新架构工程的默认裁决依据。不得以旧规范、旧代码或过去任务记录否决新的 Owner 决策。

权威顺序：Owner 已批准裁决 → MHKA-00 治理及相应 MHKA 专业语义 Owner → 授权的现行专业合同 → MAB 受控任务书。旧实现可以在安全和合规前提下继续运行、被复用及逐步适配，但不得由此反向改变目标架构。

实现与许可另行判定：`CURRENT.md`、真实源码、CI/隔离测试、数据库和部署证据说明何者已实现、验证、准出或 HOLD。设计正确不等于运行生效，发现安全问题须按 MHKA 失败关闭。**M8 仍负责生产启用、旧运行系统受控退役和正式交接，不是新 MHKA 开始指导施工的时间。**

## 0A｜Owner 执行纪律补充（2026-11-12）

1. **本地优先，批量推送**：GitHub 网络受限期间，全部施工在本地完成，本地 git 提交照常；推送合并为批量动作，待 Owner 确认窗口一次性执行。未推送状态必须在 `progress.md` 显式登记（`PENDING_PUSH`），推送后销项。不得因推送不可用阻塞或放缓本地施工。
2. **规则服务施工，不得死循环**：设计文档不完全代表 Owner 意愿（尤其技术部分）。任何上位条款若导致死循环、重复劳动、过度确认或明显阻碍推进，执行方必须立即向 Owner 具名上报（条款位置、卡点事实、最小修正建议），不得静默僵持，也不得擅自修改权威文本。安全合格底线（Gate 分权、数据不可变、权限隔离、失败关闭）不在简化范围。

## 1｜新架构唯一索引

| 领域 | 本轮上位工程设计与施工依据 |
|---|---|
| 项目治理、Owner 裁决与迁移 | `governance/mhka/MHKA-00_Governance_Charter.md` |
| 核心价值与战略方向 | `governance/mhka/MHKA-01_Value_and_Strategy.md` |
| 人文产品、Studio/WATCH/EXP 体验 | `governance/mhka/MHKA-02_Humanistic_Product_and_Experience.md` |
| 知识世界、数据、资产和 D/L/G | `governance/mhka/MHKA-03_Knowledge_World_and_Data_Architecture.md` |
| Agent、专业方法、Skill、混合协作 | `governance/mhka/MHKA-04_Agent_and_Professional_Capabilities.md` |
| 软件工程、权限、发布和运维 | `governance/mhka/MHKA-05_Software_Engineering_and_Operations.md` |
| 知识资产专业生命周期 | `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` |
| Agent 专业合同 | `specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` |
| 运行技术合同 | `specs/SYSTEM_RUNTIME_ARCHITECTURE.md` |
| 人文体验与组件合同 | `specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md` |
| 数据生产协议与方法 Registry | `specs/data-production/MoHen_Data_Production_Protocol.md`；`specs/data-production/production-registry.json` |
| 唯一施工计划 | `tasks/implementation/MAB/PLAN.md` |
| 当前真实状态 | `CURRENT.md` |
| 唯一执行进度与目标差异账 | `tasks/implementation/MAB/progress.md`；`tasks/implementation/MAB/target-diff.csv` |
| 当前工程执行入口 | `tasks/implementation/MAB/ENGINEERING_HANDOFF_CURRENT.md` |
| 目录与源码职责 | `OWNERSHIP_MAP.md` |
| 现有数据生产执行入口 | `pipelines/data-production/run.mjs` |
| MAB 交付包设计证据（只读）与吸收账 | `tasks/implementation/MAB/inputs/mab-package-20261102/`；吸收账见 `tasks/implementation/MAB/PLAN.md` 附录D |

## 2｜所有 AI 开发工具必须遵循的施工顺序

1. 从远端 `main` 最新 HEAD 起读本入口，按任务领域读取六 MHKA 及所需现行专业合同。
2. 读取 MAB 的计划、进度、差异账与 `CURRENT.md`；以源代码、精确 CI、测试及环境证据核实真实状态，不能让历史 SHA 和旧 C0—C4 覆盖新目标。
3. 根据原有 M0—M8 依赖与 Owner 决策继续施工，复用已验证的合法能力；发现旧实现不符新架构时，按新架构做最小必要适配，不再造第二 Runner、第二 Gate 或第二套知识真值。
4. 执行对应正反、权限/撤权、版本和恢复验证；按 `CODE_PRESENT`、`VERIFIED_ISOLATED`、`VERIFIED_LIVE`、`HOLD`、`DEFERRED_ENV` 如实记账。没有独立资格不能自签 G0—G5；CI 通过不等于生产/Owner 准出。
5. 每批完成后回写唯一计划、进度、目标差异账和证据。当前任务可继续则继续，不因工具切换或旧入口反复重新审查。
6. 只有产品方向、额外费用、生产启用、资料权利/外发或超出既有授权的事项才请求 Owner 决定。阻塞时记录精确原因、受影响对象、恢复条件，保持相关功能 HOLD。

## 2A｜跨工具开发 Skill 的可选入口（CTX-ENG）

获授权的建设、诊断与维护任务可使用 `.agents/skills/mohen-dev-continuation/SKILL.md` 作为唯一开发方法源；CodeBuddy 通过仓库级轻量适配器发现并引用它。此 Skill 只能辅助执行上述 MHKA 与原 MAB 计划，不代替本入口、不赋予产品 Registry、正式 Gate、生产数据库或自动持续运行权限；实际加载和运行结果须独立核验。

## 3｜施工依据与运行切换不可混同

**已纠正：工程设计与施工入口现在指向 MHKA。** 历史 C0—C4 文本保留证据身份，不得继续充当工程规范。

**仍未准出：生产 Gate、真实原件/数据、外部模型费用、发布授权及 M8 运行切换。** 所有原 HOLD、验证/回滚义务与用户体验验收不变。

本文件不是第七份宪章，不修改 MHKA 正文，不以旧代码现状或 `CURRENT.md` 的事实记录覆盖新架构的规范。
