# specs/experience-ui — 目录治理说明（EXP-UI-GOV-01 登记；2026-10-02 修订）

本目录是 **Experience / UI 的唯一归属地**（2026-10-02 项目拥有者决定：docs/ 与 prototypes/ 退役，其 UI 内容全部并入此处）。它保存规范、施工图、Canonical 参考与验证证据。

> **Authority 归属**：Human-facing Experience / UI 的当前**唯一 Authority 是 C4**（`governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md`）。`specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 已降为 **SOURCE ARCHIVE / TRACE**，其"CURRENT IMPLEMENTATION AUTHORITY"登记失效（见根目录 `OWNERSHIP_MAP.md` §2）。
> 本目录由项目拥有者人工放置；EXP-UI-GOV-01 仅做治理登记与纳入 Git，不搬运、不重命名、不转换、不重建、不改写资产。

## 1. Authority 关系

| 层 | 路径 | Authority 等级 | 规则 |
|---|---|---|---|
| **C4** | `governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md` | **CURRENT AUTHORITY（唯一）** | 所有 Human-facing Experience/UI 实施与验收必须服从；开发总工程师无权重新定义其内容。 |
| **施工图** | `specs/experience-ui/施工图/` | **CURRENT 施工依据（第 3 代，拥有者 2026-10-02 确认）** | 逐帧施工以它为准；尚未接入代码。 |
| **canonical** | `specs/experience-ui/canonical/` | CANONICAL REFERENCE | 体验基线 2 张 + 原型图谱 8 张（C4 §1/§2 与 PART IV 引用）。 |
| **规范** | `specs/experience-ui/source/两个组件_尺寸与母题叙事规范- 墨痕 V0.9.1.md`、`specs/experience-ui/source/交互原型- 墨痕 V0.9.1.html` | 有效规范 / 样册 | 双组件、构图、空间与逐帧规范。 |
| **source** | `specs/experience-ui/source/`（其余） | TRACE / SOURCE ARCHIVE | 历史设计意图；**不得作为当前实现依据**（**注意：与 C4 §11/§15 的表述存在未决矛盾**，见 `CURRENT.md` §9）。 |
| **evidence** | `specs/experience-ui/evidence/` | VALIDATION / FAILURE EVIDENCE | 用于证明体验结果与漂移；不得作为未来 UI 设计模板。 |
| **archive** | `specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | SOURCE ARCHIVE / TRACE | 历史参考；已不再是 Implementation Authority。 |

**Context Gate 顺序**：① 先读 **C4**（唯一 Required Read）→ ② 读 `施工图/`（当前施工依据）→ ③ 相关时读 `canonical/` → ④ `source/` 与 `specs/archive/` 仅用于追溯。

## 2. 当前真实资产清单（实际 Repo 文件名，禁止改名）

### 施工图/（CURRENT 施工依据 · 第 3 代）
- `墨痕_五母题施工审阅_第一批_M1_配套规格_V0.1.md` — M1 配套规格（25 页 / 50 视图 / 12 帧主线）。**原在 docs/，2026-10-02 迁入。**
- `墨痕_五母题施工审阅_第一批_M1_V0.1.html` — 可操作施工图册。**原在 prototypes/，2026-10-02 迁入。**
- 上一代 `T05_B1_*` 已归档至根 `archive/2026-10-02-superseded/`。

### 方法、审查与需求（有效）
- `MoHen_Narrative_Motif_Framework.md` — 五母题叙事与定向研究方法 V1.3。**原在 docs/，2026-10-02 迁入。**
- `墨痕_UI架构与人文叙事_完整审查及后续任务.md` — UI 审查与后续任务记录。**原在 docs/，2026-10-02 迁入。**
- `五母题深化_UI施工图与数据生产需求_V1.1.md` — 逐母题施工图与数据生产需求。
- `墨痕_Agent_2.0_金泽最小体验导演稿_V1.0.docx` — 最高体验权威（H2 计划自述）。
- `T03_金泽材料盘点_覆盖矩阵.md`、`T06_数据生产_NightBatch派工与Gap映射.md`、`T07_NightJob_最小Contract与安全施工基线.md`。
- 夜间生产协议已迁至 `specs/MoHen_Night_Data_Production_Protocol.md`（T06/T07 依赖其 §12）。

### canonical/（CANONICAL REFERENCE）
**体验基线 2 张**（C4 §1 / §2 引用）：
- `金泽历史关系探索体验板.png` —— Canonical Experience Grammar Reference。
- `EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png` —— Canonical Visual Composition Reference。

**原型图谱 8 张**（C4 PART IV 引用；`image3.png` – `image10.png`）：
- 原型 00–07（体验闭环 / Persistent Experience Space / 历史地图五模式 / 视觉张力 / Presence / State Patch / 从知道去看 / 历史改造顺序）。
- **来源与修复记录（2026-10-02）**：由 `source/MoHen_C4_UI_Architecture_V2.1.docx` 内嵌媒体精确还原（docx 内文件名与 C4 引用名一致）。还原前 C4 PART IV 的 8 条图片链接全部断链，已修复。

### source/（TRACE / SOURCE ARCHIVE — 原文件名保留）
- `source/墨痕_Agent_2.0_Agent_Experience_UI_交互设计_V1.0.md`
- `source/墨痕_Agent_2.0_UI_设计规格_V1.0.docx`
- `source/墨痕_Agent_2.0_WorkBuddy_UI改造任务包_V1.0.docx` —— 文件名含工具名为历史原名，**禁止改名**；不构成治理 Authority（见 R13）。
- `source/墨痕_Agent_2.0_可视化原型_V1.0.pptx`
- `source/MoHen_C4_UI_Architecture_V2.1.docx`、`source/MoHen_Narrative_Motif_Framework_V1.3.docx`、`source/墨痕_UI架构与人文叙事_完整审查及后续任务_V1.2.docx`、`source/墨痕_五母题叙事与生产深化主稿_V0.1.md`（及同名 `.docx`）
- `source/两个组件_尺寸与母题叙事规范- 墨痕 V0.9.1.md`、`source/交互原型- 墨痕 V0.9.1.html` —— **例外：这两份是有效规范与样册，见 §1。**
- `source/叙事母题过程5轮论证/`、`source/墨痕_附录AB深化路径回看_第六轮存档_V0.1.md`

### evidence/（VALIDATION / FAILURE EVIDENCE）
- `evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4.mp4` —— Round A 失败证据录像（**实际文件名为双扩展名**，禁止改名匹配）。
- `evidence/M5-HUMAN-01_PreBaseline_Failure/README.md` —— 失败事件治理说明。

### mockups/（trace）
2026-09-27 的 6 个布局验证原型 html + 11 个 `.cjs` 校验脚本 + `layout_report.json`。非当前施工依据。

## 3. 目录结构变更治理

本目录结构原由历史 Baseline §1.3 / §25 冻结，现由 **C4 §25** 承接。开发总工程师**无自主权**新增、移动、重命名或重组 `specs/experience-ui/` 及其子目录；任何目录结构变化须经**项目拥有者确认**（2026-10-02 的 docs/+prototypes/ 并入即属此类），并在 Result 中报告 Directory Structure Change，同步根目录 `OWNERSHIP_MAP.md`。
