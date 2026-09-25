# OWNERSHIP MAP

| 路径 | 唯一职责 | 禁止 |
|---|---|---|
| `apps/web` | Web Shell + Renderer | 历史事实判定、直接 SQL |
| `packages/domain` | 稳定领域类型 | UI、网络请求 |
| `packages/agent-runtime` | Goal/Plan/Action/Observe/Replan | DOM/React 控制 |
| `packages/experience-engine` | ExperienceState/CompositionState/Action reducer | 数据采集 |
| `packages/data-access` | 唯一 DB 访问层 | UI 逻辑 |
| `pipelines/ingest` | Raw + Source 登记 | 写 verified knowledge |
| `pipelines/evidence` | Evidence Gate | 自由叙事 |
| `pipelines/weave` | verified → relations/story/discovery candidate | 绕过 Gate |
| `skills` | AI 可执行 SOP | 保存项目历史 |
| `governance` | evolving high-level governance documents（GOV-SYNC-02 冻结）：Current L1 Architecture Roadmap、Current L2 Phase Execution Plan、Phase Gates、Domain Governance Contracts、Architecture Candidate / Research Backlog | 已稳定为 Contract 的内容应下沉 `specs/`；已裁决策应落 `decisions/`；Candidate Backlog 行使 SOT / Decision Authority |
| `specs` | 当前稳定契约 | 过程记录 |
| `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | Human-facing Experience/UI Implementation Authority（EXP-UI-GOV-01 登记） | 改写内容、弱化 Authority、视为可选参考 |
| `specs/experience-ui/{source,canonical,evidence}/` | Baseline 附属归档：source=历史设计意图(trace-only)；canonical=体验语法/视觉构成参考；evidence=验证/失败证据 | 把 source/canonical/evidence 当作当前实现 Authority；重命名/改写/转换资产 |
| `decisions` | 重大架构变更理由 | 操作 SOP |
| `tasks` | 当前可验收工作单（Architect-authorized Task Books，一律 tracked） | 长期知识 |
| `tests` | 机器验收 | 产品规则解释 |
| `legacy` | 迁移 manifest | 复制老工程 |

新建文件前必须搜索是否已有同职责 owner。禁止平行真源。

补充规则（GOV-SYNC-02 冻结）：

- `governance/` 中的 Architecture Candidate Backlog 是正式治理登记处，但**不是** Architecture SOT / Decision Authority；Candidate 只有经过 Architect Reconciliation / Plan Reconciliation 才能晋升为 Contract / Plan / Task Book。
- 治理文档版本纪律：**Current-only working tree + Git preserves history**——治理文档被新版本正式取代后即从 working tree 删除（`git rm`），不创建 `history/` 子目录、不保留 `_superseded` 副本、不改写 Git 历史。
- 当前 SOT：L1 = `governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx`；L2 = `governance/MoHen_Agent_2.0_PHASE-II_Execution-Plan_V1.1.docx`；Candidate Registry = `governance/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`。

---

## Experience/UI Authority（EXP-UI-GOV-01 登记，2026-09-25）

`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 是 **Human-facing Experience/UI Implementation Authority**（CURRENT IMPLEMENTATION AUTHORITY）：

- 适用范围至少包括：Experience、UI、Surface、Renderer、Map presentation、Timeline presentation、Evidence presentation、Visual Asset、MoHen Presence。
- 上述任务的 **Required Read 首先是 Baseline**；canonical = reference authority；source = trace only；evidence = validation evidence。
- 与 Agent / Data / Experience Contract 发生真实冲突时，WorkBuddy **不得自行裁决**，必须报告 Architect Reconciliation（见 Task Result §13）。
- 该 Baseline 稳定性由 §30 Baseline Change Governance 约束；EXP-UI-GOV-01 仅做治理登记，未改动其内容。
