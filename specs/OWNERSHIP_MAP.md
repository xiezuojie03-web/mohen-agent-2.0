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
| `governance` | 宪法与高层治理文档：**C0–C4 宪法**、Phase Gates、Domain Governance Contracts。L1 Architecture Roadmap(V4.9)、L2 Phase Execution Plan(V1.1) 与 Architecture Candidate Backlog 已依 C0 归位 `governance/archive/`（ARCHIVE / LEGACY / TRACE，不再行使日常 Authority） | 已稳定为 Contract 的内容应下沉 `specs/`；已裁决策应落 `decisions/`；Archive 内的 Candidate Backlog 行使 SOT / Decision Authority |
| `specs` | 当前稳定契约 | 过程记录 |
| `specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | Human-facing Experience/UI 历史参考（已登记降为 SOURCE ARCHIVE / TRACE；原 EXP-UI-GOV-01 的 Implementation Authority 登记失效） | 当作当前实现 Authority 直接施工；将其规则视为唯一强制 |
| `specs/experience-ui/{source,canonical,evidence}/` | 归档附属资产：source=历史设计意图(trace-only)；canonical=体验语法/视觉构成参考；evidence=验证/失败证据 | 把 source/canonical/evidence 当作当前实现 Authority；重命名/改写/转换资产 |
| `decisions` | 重大架构变更理由 | 操作 SOP |
| `tasks` | 当前可验收工作单（一律 tracked） | 长期知识 |
| `tests` | 机器验收 | 产品规则解释 |
| `legacy` | 迁移 manifest | 复制老工程 |

新建文件前必须搜索是否已有同职责 owner。禁止平行真源。

补充规则（GOV-SYNC-02 冻结；2026-10-01 依 R13 修订）：

- **入口路由 = `AGENTS.md`**（纯路由，**非 Authority**；不承载宪法 / 状态内容）。
- `governance/archive/` 中的 Architecture Candidate Backlog 是历史治理登记件，**不是** Architecture SOT / Decision Authority；Candidate 只有经过项目拥有者确认（C0 §6.2 Architecture Reconciliation）才能晋升为 Contract / Plan / Task Book。
- 治理文档版本纪律：**Current-only working tree + Git preserves history**——治理文档被新版本正式取代后即从 working tree 删除（`git rm`），不创建 `history/` 子目录、不保留 `_superseded` 副本、不改写 Git 历史。
- **当前架构真源集（SOT Set）= C0–C4 + CURRENT**（项目拥有者于 2026-09-29 明确，2026-10-01 复核）：C0 = `governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md`；C1 = `governance/C1_MoHen_Product_Architecture_Evolution_Constitution_V1.0.md`；C2 = `governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.0.md`；C3 = `governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.1.md`；C4 = `governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md`；CURRENT = `CURRENT.md`。L1 Roadmap V4.9 与 L2 PHASE-II Plan V1.1 已依 C0 归位 `governance/archive/`（ARCHIVE / LEGACY PHASE RECORD，不再作为当前 SOT）；Candidate Registry = `governance/archive/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`（TRACE，非 SOT）。
- **执行主体命名纪律（R13）**：治理文本中的执行主体一律使用**角色名**（项目拥有者 / 开发总工程师），不得出现工具名或产品名（WorkBuddy / CodeBuddy / ChatGPT Architect 等）。历史文档中残留的旧工具名不具任何治理 Authority。

---

## Experience/UI Authority（登记 2026-09-29；2026-10-01 修订）

`specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 已登记为由 **Implementation Authority 降为 SOURCE ARCHIVE / TRACE**；原 EXP-UI-GOV-01 的"CURRENT IMPLEMENTATION AUTHORITY"登记失效。Human-facing Experience/UI 的当前权威以 **C4（`governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md`）** 为唯一真源：

- 适用范围：Experience、UI、Surface、Renderer、Map / Timeline / Evidence presentation、Visual Asset、MoHen Presence——以 C4 为准。
- Baseline 中经 C4 吸收的成熟规则仍为有效参考；未被 C4 吸收或与之冲突者以 C4 为准，Baseline 仅作 trace。
- **引用修订说明**：本条原以"C4 V2.1 §27"为据；C4 §27 已随 2026-10-01 宪法净化退出 C4 正文（内容留 Git 历史），该节号已不存在，故不再引用。降级事实以本条登记 + 「C4 为 UI 唯一 Authority」为准。
- 与 Agent / Data / Experience Contract 发生真实冲突时，开发总工程师**不得自行裁决**，必须提交项目拥有者确认（C0 §2.3 / §6.2）。
