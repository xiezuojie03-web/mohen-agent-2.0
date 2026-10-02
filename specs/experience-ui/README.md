# specs/experience-ui — 目录治理说明（EXP-UI-GOV-01 登记；2026-10-01 依 R13 修订）

本目录是 Human-facing Experience/UI 的**归档附属资产区**：保存 Canonical 参考、历史设计意图与验证 / 失败证据。它**不承载当前实现 Authority**。

> **Authority 归属（2026-10-01 修订）**：Human-facing Experience/UI 的当前**唯一 Authority 是 C4**（`governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md`）。`specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 已降为 **SOURCE ARCHIVE / TRACE**，其"CURRENT IMPLEMENTATION AUTHORITY"登记失效（见 `OWNERSHIP_MAP.md`）。本文件此前"Baseline 为 CURRENT IMPLEMENTATION AUTHORITY、且位于 `specs/`"的表述与 C4 / OWNERSHIP_MAP 冲突，已一并更正。

> 本目录由项目拥有者人工放置；EXP-UI-GOV-01 仅做治理登记与纳入 Git，**不搬运、不重命名、不转换、不重建、不改写**其中任何资产。

## 1. Authority 关系

| 层 | 路径 | Authority 等级 | 规则 |
|---|---|---|---|
| **C4** | `governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md` | **CURRENT AUTHORITY（唯一）** | 所有 Human-facing Experience/UI 实施与验收必须服从；开发总工程师无权重新定义其内容。 |
| **canonical** | `specs/experience-ui/canonical/*` | CANONICAL REFERENCE | 约束体验语法 / 视觉构成；非 pixel-perfect code spec。 |
| **source** | `specs/experience-ui/source/*` | TRACE / SOURCE ARCHIVE | 保留历史设计意图；不得作为当前实现依据。 |
| **evidence** | `specs/experience-ui/evidence/*` | VALIDATION / FAILURE EVIDENCE | 用于证明体验结果与漂移；不得作为未来 UI 设计模板。 |
| **archive** | `specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | SOURCE ARCHIVE / TRACE | 历史参考；已不再是 Implementation Authority。 |

任何 Human-facing Experience/UI 任务的 **Context Gate 顺序**：

1. 先读 **C4**（唯一 Required Read）；
2. 相关时再读 `canonical`（体验语法 / 视觉构成参考）；
3. `source` 与 `specs/archive/` 仅用于追溯历史设计意图，**不作为当前实现依据**。

## 2. 当前真实资产清单（实际 Repo 文件名，禁止改名）

### source/（TRACE / SOURCE ARCHIVE — 原文件名保留）
- `墨痕_Agent_2.0_Agent_Experience_UI_交互设计_V1.0.md`
- `墨痕_Agent_2.0_UI_设计规格_V1.0.docx`
- `墨痕_Agent_2.0_WorkBuddy_UI改造任务包_V1.0.docx` —— **文件名中的工具名为历史资产原名，禁止改名**；它不构成任何治理 Authority（见 R13）。
- `墨痕_Agent_2.0_可视化原型_V1.0.pptx`

> 上述中文原始文件名与既有 Canonical 文件名均为实际 Repo 文件名。**禁止为整齐而重命名为旧示意英文名**；重命名 / 重组须经项目拥有者确认的治理任务。

### canonical/（CANONICAL REFERENCE）

**体验基线 2 张**（C4 §1 / §2 引用；不可退化的体验与视觉底线）：
- `金泽历史关系探索体验板.png` —— **Canonical Experience Grammar Reference**（冻结认知节奏 / 视觉层级 / 提问推进 / 体验转化；非逐像素模板）。
- `EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png` —— **Canonical Visual Composition Reference**（冻结视觉优先级 / 主次 / 留白 / 文本密度逻辑；实现不必复刻精确像素）。

**原型图谱 8 张**（C4 PART IV 引用；`image3.png` – `image10.png`）：
- `image3.png` – `image10.png` —— 原型 00–07（体验闭环 / Persistent Experience Space / 历史地图五模式 / 视觉张力 / Presence / State Patch / 从知道去看 / 历史改造顺序）。
- **来源与修复记录（2026-10-02）**：这 8 张由 `specs/experience-ui/source/MoHen_C4_UI_Architecture_V2.1.docx` 的内嵌媒体**精确还原**（docx 内文件名与 C4 正文引用名一致）。还原前 C4 PART IV 的 8 条图片链接**全部断链**，现已全部解析通过。

### evidence/（VALIDATION / FAILURE EVIDENCE）
- `M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4.mp4` —— M5-HUMAN-01 Round A 失败证据录像（**注意：实际 Repo 文件名为双扩展名 `.mp4.mp4`**；历史 Baseline 附录与结构图中写作 `current-runtime-recording.mp4`，为示意 / 内部引用偏差，资产本身以本实际文件名为准，禁止改名匹配）。
- `M5-HUMAN-01_PreBaseline_Failure/README.md` —— 失败事件治理说明。

## 3. 目录结构变更治理

本目录结构原由历史 Baseline §1.3 / §25 冻结，现由 **C4 §25（开发总工程师的 UI 硬边界）** 承接。开发总工程师**无自主权**新增、移动、重命名或重组 `specs/experience-ui/` 及其子目录；任何目录结构变化须经**项目拥有者确认**，并在 Result 中报告 Directory Structure Change，同步 `OWNERSHIP_MAP.md`。

## 4. 引用关系

- 历史 Baseline（现 `specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`）§1.3 / §25 给出 V1.0 冻结仓库结构。
- 历史 Baseline §17 / 附录 A·B 曾将 `evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4` 登记为负面 Canonical 证据样本（实际文件名见 §2，双扩展名）。
- 以上 Baseline 条款现已为 **trace**；当前规则一律以 **C4** 为准。
