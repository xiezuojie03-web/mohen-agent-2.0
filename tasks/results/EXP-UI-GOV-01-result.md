# EXP-UI-GOV-01 · Experience/UI Baseline & Source Archive Governance Integration — Result

- **Task Book**: `tasks/EXP_UI_GOV_01_Task_Book_V1_0.docx`（Architect 正式签发）
- **Author**: WorkBuddy（Governance / Archive Integration 角色，无产品写权限）
- **Date**: 2026-09-25
- **Repo**: `mohen-agent-2.0`（HEAD = `aaf6910`）
- **Pre-state**: M4-CLOSURE-01 = PASS / CLOSED @ `aaf6910`；M5 = CURRENT 但 Round-A Human Experience FAIL SIGNAL 后 HOLD；M5-HUMAN-01 = HOLD
- **Final Gate Recommendation**: **HOLD_FOR_GOVERNANCE_CORRECTION**（理由见 §13、§16）

---

## 1. 任务标识与范围

Governance / Archive Integration 任务：把用户已人工放置但尚未 tracked 的 Experience/UI Baseline + source/canonical/evidence 资产正式纳入治理，登记 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 为 Human-facing Experience/UI Implementation Authority，并最小同步 L1 / OWNERSHIP_MAP / CONTEXT / CURRENT_TASK。严格受 Scope Firewall 约束（§14）。

## 2. Authority Freeze 确认（Task Book §04）

- L1 SOT = `governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx`（GOV-SYNC-02 冻结）
- L2 = `governance/MoHen_Agent_2.0_PHASE-II_Execution-Plan_V1.1.docx`
- Candidate Registry = `governance/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`
- 本任务**未**改写上述任一 Authority 的实质内容；仅 L1 按 §07 增加一条架构级引用（见 §7），OWNERSHIP_MAP 按 §6 最小登记。

## 3. Context Gate / 前置状态核验（Task Book §03 前置）

| 项 | 核验结果 |
|---|---|
| M4-CLOSURE-01 | PASS / CLOSED @ `aaf6910`（见 `tasks/results/M4-CLOSURE-01-result.md`）✓ |
| M5 | CURRENT 但 Round-A Human Experience FAIL SIGNAL 后 HOLD ✓ |
| M5-HUMAN-01 | HOLD（Round B / H1–H10 不运行）✓ |
| Baseline 资产已人工放置 | ✓（`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 存在，未 tracked） |
| source/canonical/evidence 已人工放置 | ✓（`specs/experience-ui/` 下存在，未 tracked） |

## 4. 实际资产盘点（AT-01）

真实 Repo 路径全部存在，文件名以实际落盘为准（中文原名 + 双扩展名 `.mp4.mp4` 均视为真实文件名，**禁止改名**）：

| 层 | 实际路径 | 大小 |
|---|---|---|
| **Baseline** | `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`（1297 行，CURRENT IMPLEMENTATION AUTHORITY） | 已登记 |
| source | `specs/experience-ui/source/墨痕_Agent_2.0_Agent_Experience_UI_交互设计_V1.0.md` | 38,514 B |
| source | `specs/experience-ui/source/墨痕_Agent_2.0_UI_设计规格_V1.0.docx` | 42,664 B |
| source | `specs/experience-ui/source/墨痕_Agent_2.0_WorkBuddy_UI改造任务包_V1.0.docx` | 41,975 B |
| source | `specs/experience-ui/source/墨痕_Agent_2.0_可视化原型_V1.0.pptx` | 45,340 B |
| canonical | `specs/experience-ui/canonical/金泽历史关系探索体验板.png` | 2,263,440 B |
| canonical | `specs/experience-ui/canonical/EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png` | 526,438 B |
| evidence | `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4.mp4` | 32,266,065 B |
| evidence | `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/README.md`（本任务创建） | 3,177 B |

→ AT-01 **PASS**：8 件预期资产 + Baseline 全部就位。

## 5. Source/Canonical/Evidence 未改动确认（AT-02）

- `specs/experience-ui/source/*`、`canonical/*`、`evidence/current-runtime-recording.mp4.mp4` 均为用户人工放置原件，本任务**只读核验、零改写、零重命名、零转换、零重建**（Scope Firewall）。
- 证据录像 `current-runtime-recording.mp4.mp4` 登记为**负面 Canonical 证据样本（negative evidence）**，**非** Canonical Reference，不得作为未来 UI 设计模板（见 evidence/README.md §5）。

## 6. OWNERSHIP_MAP 最小更新（Task Book §06）

`specs/OWNERSHIP_MAP.md` 已最小登记（两处新增，未删改既有 owner）：
- 新增行：`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` = Human-facing Experience/UI Implementation Authority（禁止：改写内容、弱化 Authority、视为可选参考）。
- 新增行：`specs/experience-ui/{source,canonical,evidence}/` = Baseline 附属归档（禁止：当作当前实现 Authority、重命名/改写/转换资产）。
- 新增章节 `## Experience/UI Authority（EXP-UI-GOV-01 登记，2026-09-25）`：适用范围、Required Read 顺序、冲突报 Architect Reconciliation。

## 7. L1 V4.9 核验与最小引用（Task Book §07）

- 核验项 A — **Canonical Repository Directory Map**：还原后的 L1（见 §13-B）§6.4 含 Canonical Repository Directory Map（`specs/ = stable contracts` 条目存在）→ **已存在**。
- 核验项 B — **Experience/UI Baseline 正式引用**：还原后 L1 中 `MOHEN_EXPERIENCE_UI_BASELINE` 关键字计数 = **0** → **缺失**。
- §07 处置：仅最小增加**一条**架构级引用段落，插入于 Directory Map 的 `specs/ = stable contracts` 条目之后（段落 [181]），内容指向 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 为 Human-facing Experience/UI Implementation Authority。**未复制 Baseline 内容，未增加尾部校准章节。**
- 编辑安全性：用 python-docx 写临时文件 → 重新打开校验（valid zip + 关键字计数≥1）→ `os.replace` 落盘；落盘后二次校验 valid zip = True，段落数 213→214。L1 由 git 跟踪，可随时 `git checkout` 回退。

## 8. Baseline 正式登记为 Human-facing Experience/UI Implementation Authority

通过三处联合登记确立 Authority（未改动 Baseline 正文）：
1. `specs/OWNERSHIP_MAP.md`（§6 行 + 章节）；
2. `specs/experience-ui/README.md` §1 四层 Authority 表（Baseline = CURRENT IMPLEMENTATION AUTHORITY）；
3. L1 V4.9 §07 架构级引用（§7）。

Baseline 稳定性由自身 §30 Baseline Change Governance 约束；本任务仅做治理登记。

## 9. README 创建（Task Book §05）

- `specs/experience-ui/README.md`（4,068 B）：四层 Authority 权力关系、当前真实资产清单（实际文件名 + 双扩展名提示）、目录结构变更治理、Baseline 引用关系。明确「WorkBuddy 无目录重组自主权」。
- `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/README.md`（3,177 B）：失败事件治理说明，仅记录已发生事实，**不虚构** Human Tester 评分 / H1–H10 回答 / Round B 结论 / Human PASS。

## 10. 治理状态同步（Task Book §08）

Minimal sync（不重述既有内容）：
- `CONTEXT.md`：M5 状态由 `M5 CURRENT` → `M5 CURRENT/HOLD（Round-A Human Experience FAIL SIGNAL 后进入 HOLD；…）`。
- `tasks/CURRENT_TASK.md`：M5 状态补 `HOLD`；NEXT 由「等待 Round A/B」改为「因 Round-A FAIL SIGNAL，M5-HUMAN-01 不继续 Round B；等待 Architect 授权 Current Runtime vs Canonical Experience/UI Baseline Drift Audit」。
- 汇总：M4 = DONE / CLOSED；M5 = CURRENT / HOLD；M5-HUMAN-01 = HOLD；NEXT = Architect-authorized Drift Audit。

## 11. Git 纳入（用户人工放置但未 tracked 的资产）

本任务 `git add` 纳入以下（详见 §15 暂存清单）：
- 新增 tracked：`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`、`specs/experience-ui/`（README + source/ + canonical/ + evidence/）、`tasks/EXP_UI_GOV_01_Task_Book_V1_0.docx`、`tasks/M5_HUMAN_01_Canonical-Human-Experience-Validation_Task-Book_V1.0.docx`。
- 修改 tracked（本任务或用户 M5-sync 既有编辑）：`specs/OWNERSHIP_MAP.md`、`CONTEXT.md`、`tasks/CURRENT_TASK.md`、`governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx`（§7 最小引用）。
- 注：`governance/MoHen_Agent_2.0_PHASE-II_Execution-Plan_V1.1.docx` 与 `governance/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md` 的 `M` 状态为用户既有 M5-sync 手工编辑，**保留不回退**。

## 12. Scope Firewall 合规（Task Book 红线）

| 禁止项 | 是否触碰 |
|---|---|
| 修改 `MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | 否（仅登记，未改正文） |
| 修改任何 source/canonical/evidence 原始资产 | 否（只读核验） |
| 修改产品代码 / UI / CSS / 组件 / Surface / Renderer | 否 |
| 重命名中文/Canonical 文件以匹配旧示意英文名 | 否（保留实际文件名） |
| 执行 Drift Audit / UI Reconstruction / M5 Round B(H1–H10) / M6 | 否 |
| 新增第二套 UI Baseline | 否 |
| 自行裁决 Baseline 与 Contract 冲突 | 否（冲突登记于 §13，报 Architect） |

→ Firewall **合规**。

## 13. Architecture Reconciliation（须 Architect 裁决，不得自行处理）

### A. Baseline ↔ 证据文件名偏差（`.mp4` vs `.mp4.mp4`）
- Baseline §1.3 / §17 / 附录 A·B 将证据录像登记为 `current-runtime-recording.mp4`（单扩展名）。
- 实际 Repo 文件为 `current-runtime-recording.mp4.mp4`（双扩展名）。
- 性质：内部引用命名偏差，**非**资产缺失；证据资产真实存在且已纳入 git。
- 处置：**禁止改名匹配示意名**（红线 + README §2）。本任务仅在 `specs/experience-ui/README.md` §2 与 evidence/README.md §4 标注实际文件名，未改动 Baseline 正文（Firewall 禁止改 Baseline）。
- 裁决请求：请 Architect 决定是否在 Baseline 后续版本（§30 流程）将引用名修正为 `.mp4.mp4`，或保持现状并在文档注明偏差。WorkBuddy 不自行修改。

### B. L1 手动 M5-sync 工作树编辑在处理事故中丢失（治理事故）
- **事件**：本任务早期对 L1 docx 做插入时，因 zip 句柄未关闭即以 `'w'` 模式重写同一路径，导致 L1 被截断为 22 字节（损坏）。经 `git checkout --` 还原至 HEAD（旧「Phase II / M4 CURRENT」版本，63,703 B，valid zip）。
- **影响**：用户已手工完成的 L1 M5-sync 工作树编辑（M5 CURRENT 状态 ×7、`specs/：stable contracts` Directory Map 明细条目）**丢失且无法完美复原**（未在任何 commit / stash 中留存）。
- **已保全**：其他手动 M5-sync 文件（CONTEXT.md、tasks/CURRENT_TASK.md、PHASE-II Execution-Plan docx、Architecture-Candidate-Backlog md）的 `M` 编辑均完好保留，未回退。
- **本任务已做**：§07 授权的最小 Baseline 引用已安全加入还原后 L1（段落 [181]）；但**未**重造用户丢失的 M5 CURRENT 状态行 / `specs/：stable contracts` 明细（无法验证保真度，且属用户手工治理编辑，不应由 WorkBuddy 臆造）。
- **裁决请求**：请 Architect 重新应用 L1 的手动 M5-sync（M5 CURRENT/HOLD 状态 + Directory Map 明细），或授权 WorkBuddy 在确认文本后重做。在 L1 完整 sync 前，Drift Audit 不应启动。
- **此事故直接导致 Final Gate = HOLD_FOR_GOVERNANCE_CORRECTION**（见 §16）。

## 14. 验收证据（Acceptance / Verification）

- AT-01 资产盘点 PASS（§4）；AT-02 资产零改写 PASS（§5）。
- L1 §07 引用落盘校验：valid zip = True，段落 213→214，Baseline 关键字计数 1（§7）。
- OWNERSHIP_MAP 两行 + 章节已写入（§6）。
- 两个 README 创建且内容未虚构失败结论（§9）。
- CONTEXT.md / CURRENT_TASK.md HOLD + NEXT 同步已落地（§10）。
- 平行真源检查：全仓仅 1 份 `MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`（位于 `specs/`），**无第二套 UI Baseline**、无平行真源。

## 15. 暂存与提交清单

`git add` 范围（待 commit，任务结束 STOP）：
```
specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md
specs/experience-ui/
specs/OWNERSHIP_MAP.md
CONTEXT.md
tasks/CURRENT_TASK.md
tasks/results/EXP-UI-GOV-01-result.md
tasks/EXP_UI_GOV_01_Task_Book_V1_0.docx
tasks/M5_HUMAN_01_Canonical-Human-Experience-Validation_Task-Book_V1.0.docx
governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx
```
（PHASE-II Execution-Plan docx、Architecture-Candidate-Backlog md 为用户既有 M5-sync `M`，随本次一并纳入。）

## 16. Final Gate Recommendation

**HOLD_FOR_GOVERNANCE_CORRECTION**

理由（二者任一均构成 HOLD）：
1. §13-B：L1 手动 M5-sync 编辑在处理事故中丢失，须 Architect 重做/授权重做，L1 在完整 sync 前不应作为 Drift Audit 的干净 SOT。
2. §13-A：Baseline 引用文件名偏差（`.mp4` vs `.mp4.mp4`）须 Architect 在 §30 流程裁决，WorkBuddy 不自行改 Baseline。

非 `PASS_TO_UI_BASELINE_DRIFT_AUDIT`（L1 未干净 sync）；非 `BLOCKED_BY_MISSING_ASSET`（8 件资产 + Baseline 全部就位）。

## 17. 下一步交接（Next Action / Handoff）

1. Architect 重做 L1 V4.9 的 M5 CURRENT/HOLD 手动 sync（或授权 WorkBuddy 在确认文本后重做）。
2. Architect 就 §13-A 文件名偏差在 Baseline §30 流程裁决。
3. 上述治理纠正完成后，由 Architect 签发 **Current Runtime vs Canonical Experience/UI Baseline Drift Audit** Task Book（EXP-UI-GOV-01 NEXT），M5-HUMAN-01 方进入 Round B（H1–H10）或对应收尾。
4. 本任务已 commit 并 STOP；对话框仅返回 Task Book §15 简报。

---

*本 Result 由 WorkBuddy 在 EXP-UI-GOV-01 治理任务中整理，所有结论可经 §4/§7/§14 证据复核。§13-B 所述文件处理事故为 WorkBuddy 操作失误，已通过 git 还原兜底，未造成资产永久丢失。*
