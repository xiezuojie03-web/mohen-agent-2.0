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
| `governance` | evolving high-level governance documents（GOV-SYNC-02 冻结）：Phase Gates、Domain Governance Contracts、Architecture Candidate / Research Backlog；L1 Architecture Roadmap 与 L2 Phase Execution Plan 已依 C0 归位为 ARCHIVE / LEGACY（见 `governance/archive/`） | 已稳定为 Contract 的内容应下沉 `specs/`；已裁决策应落 `decisions/`；Candidate Backlog 行使 SOT / Decision Authority |
| `specs` | 当前稳定契约 | 过程记录 |
| `specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | Human-facing Experience/UI 参考（依 C4 V2.0 §27 由 Implementation Authority 降为 SOURCE ARCHIVE / TRACE；原 EXP-UI-GOV-01 登记已失效） | 当作当前实现 Authority 直接施工；将其规则视为唯一强制 |
| `specs/experience-ui/{source,canonical,evidence}/` | Baseline 附属归档：source=历史设计意图(trace-only)；canonical=体验语法/视觉构成参考；evidence=验证/失败证据 | 把 source/canonical/evidence 当作当前实现 Authority；重命名/改写/转换资产 |
| `decisions` | 重大架构变更理由 | 操作 SOP |
| `tasks` | 当前可验收工作单（Architect-authorized Task Books，一律 tracked） | 长期知识 |
| `tests` | 机器验收 | 产品规则解释 |
| `legacy` | 迁移 manifest | 复制老工程 |

新建文件前必须搜索是否已有同职责 owner。禁止平行真源。

补充规则（GOV-SYNC-02 冻结）：

- `governance/` 中的 Architecture Candidate Backlog 是正式治理登记处，但**不是** Architecture SOT / Decision Authority；Candidate 只有经过 Architect Reconciliation / Plan Reconciliation 才能晋升为 Contract / Plan / Task Book。
- 治理文档版本纪律：**Current-only working tree + Git preserves history**——治理文档被新版本正式取代后即从 working tree 删除（`git rm`），不创建 `history/` 子目录、不保留 `_superseded` 副本、不改写 Git 历史。
- **当前架构真源集（SOT Set）= C0–C4 + CURRENT**（由 Architect 于 2026-09-29 明确）：C0 = `governance/MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.docx`；C1 = `governance/MoHen_Product_Architecture_Evolution_Constitution_V1.0.docx`；C2 = `governance/MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.0.docx`；C3 = `governance/MoHen_Humanistic_Data_OS_Database_Architecture_V1.1.docx`；C4 = `specs/MoHen_Agent-native_Human_Experience_UI_Architecture_V2.0.docx`；CURRENT = `CURRENT.md`。L1 Roadmap V4.9 与 L2 PHASE-II Plan V1.1 已依 C0 归位 `governance/archive/`（ARCHIVE / LEGACY PHASE RECORD，不再作为当前 SOT）；Candidate Registry = `governance/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`（非 SOT）。

---

## Experience/UI Authority（依 C4 V2.0 §27 重新登记，2026-09-29）

`specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 已依 C4 V2.0 §27 由 **Implementation Authority 降为 SOURCE ARCHIVE / TRACE**；原 EXP-UI-GOV-01 的"CURRENT IMPLEMENTATION AUTHORITY"登记已失效。Human-facing Experience/UI 的当前权威以 **C4（`specs/MoHen_Agent-native_Human_Experience_UI_Architecture_V2.0.docx`）** 为唯一真源：

- 适用范围：Experience、UI、Surface、Renderer、Map / Timeline / Evidence presentation、Visual Asset、MoHen Presence——以 C4 为准。
- Baseline 中经 C4 吸收的成熟规则仍为有效参考；未被 C4 吸收或与之冲突者以 C4 为准，Baseline 仅作 trace。
- 与 Agent / Data / Experience Contract 发生真实冲突时，WorkBuddy **不得自行裁决**，必须报告 Architect Reconciliation。
