# specs/experience-ui — 目录治理说明（EXP-UI-GOV-01 登记）

本目录是 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`（Human-facing Experience/UI Implementation Authority）的附属资产归档区。它**不承载当前实现 Authority**，只保存 Authority 所依赖的历史设计意图、Canonical 参考与失败/验证证据。

> 本目录由用户人工放置，EXP-UI-GOV-01 仅做治理登记与纳入 Git，**不搬运、不重命名、不转换、不重建、不改写**其中任何资产。

## 1. 四层 Authority 权力关系

| 层 | 路径 | Authority 等级 | 规则 |
|---|---|---|---|
| **Baseline** | `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | **CURRENT IMPLEMENTATION AUTHORITY** | 所有 Human-facing Experience/UI 实施与验收必须服从；WorkBuddy 无权重新定义其内容（§18.6 / §30）。 |
| **canonical** | `specs/experience-ui/canonical/*` | CANONICAL REFERENCE | 约束体验语法 / 视觉构成；非 pixel-perfect code spec。 |
| **source** | `specs/experience-ui/source/*` | TRACE / SOURCE ARCHIVE | 保留历史设计意图；不得自行覆盖当前 Baseline。 |
| **evidence** | `specs/experience-ui/evidence/*` | VALIDATION / FAILURE EVIDENCE | 用于证明体验结果与漂移；不得作为未来 UI 设计模板。 |

任何 Human-facing Experience/UI 任务的 **Context Gate 顺序**：
1. 先读 Baseline（Required Read）——`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`；
2. 相关时再读 `canonical`（体验语法 / 视觉构成参考）；
3. `source` 仅用于追溯历史设计意图，不作为当前实现依据。

## 2. 当前真实资产清单（实际 Repo 文件名，禁止改名）

### source/（TRACE / SOURCE ARCHIVE — 原文件名保留）
- `墨痕_Agent_2.0_Agent_Experience_UI_交互设计_V1.0.md`
- `墨痕_Agent_2.0_UI_设计规格_V1.0.docx`
- `墨痕_Agent_2.0_WorkBuddy_UI改造任务包_V1.0.docx`
- `墨痕_Agent_2.0_可视化原型_V1.0.pptx`

> 上述中文原始文件名与既有 Canonical 文件名均为实际 Repo 文件名。**禁止为整齐而重命名为旧示意英文名**；重命名/重组须经 Architect 授权治理任务。

### canonical/（CANONICAL REFERENCE）
- `金泽历史关系探索体验板.png` —— **Canonical Experience Grammar Reference**（冻结认知节奏 / 视觉层级 / 提问推进 / 体验转化；非逐像素模板）。
- `EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png` —— **Canonical Visual Composition Reference**（冻结视觉优先级 / 主次 / 留白 / 文本密度逻辑；实现不必复刻精确像素）。

### evidence/（VALIDATION / FAILURE EVIDENCE）
- `M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4.mp4` —— M5-HUMAN-01 Round A 失败证据录像（**注意：实际 Repo 文件名为双扩展名 `.mp4.mp4`**；Baseline 附录与结构图中写作 `current-runtime-recording.mp4`，为示意/内部引用偏差，资产本身以本实际文件名为准，禁止改名匹配）。
- `M5-HUMAN-01_PreBaseline_Failure/README.md` —— 失败事件治理说明（本任务创建）。

## 3. 目录结构变更治理

本目录结构由 Baseline §1.3 / §25 冻结。WorkBuddy **无自主权**新增、移动、重命名或重组 `specs/experience-ui/` 及其子目录；任何经 Architect 授权的目录结构变化须在 Task Result 中报告 Directory Structure Change，并在 Governance Sync 中同步 L1 Canonical Repository Directory Map 与 `specs/OWNERSHIP_MAP.md`。

## 4. 引用关系（来自 Baseline）

- Baseline §1.3 给出 V1.0 冻结仓库结构，明确 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` + `specs/experience-ui/{README.md, source/, canonical/, evidence/}`。
- Baseline §25 明确 source 四件资产与 canonical 两件资产为归档对象，且 source 不取代 Baseline、canonical 为参考而非代码权威。
- Baseline §17 / 附录 A·B 将 `evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4` 登记为负面 Canonical 证据样本（实际文件名见 §2，双扩展名）。
