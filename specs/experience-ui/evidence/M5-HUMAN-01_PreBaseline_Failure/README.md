# M5-HUMAN-01 Pre-Baseline Failure — 失败证据治理说明（EXP-UI-GOV-01 登记）

本目录保存 M5-HUMAN-01（Canonical Human Experience Validation）Round A 期间观测到的 **Human Experience FAIL SIGNAL** 证据，作为未来实现对比的负面 Canonical 样本。本文件只记录已发生事实与资产定位，**不虚构** Human Tester 评分、H1–H10 回答或尚未发生的 Round B 结论。

## 1. 基线（前置工程状态）

- **M4-CLOSURE-01 = PASS / CLOSED @ `aaf6910`**（Integration Closure PASS_TO_M5；Canonical Integration Chain 六层全通；0 blocker）。
- 含义：Runtime / Evidence / Five-Beat 工程集成在 M4 已被判定闭合。

## 2. 失败事件

- **M5-HUMAN-01 · Round A · Blind Experience**（Human Tester 自然体验，不预读内部资料）出现重大 **Human Experience FAIL SIGNAL**。
- 事件后 M5 进入 **HOLD**；M5-HUMAN-01 **不继续 Round B**（H1–H10 Structured Probe 不运行），等待 Architect 完成 Experience/UI Governance 与后续 Drift Audit。

## 3. 失败性质（按已观察现象，不推测心理）

- **Runtime / Integration 已通过**，但 **Human-facing Experience 出现 Canonical Drift**：
  - 系统状态 / 证据结构 / 技术元数据在用户主界面抢占了人文体验的主视觉权威；
  - 当下真实场所与文化提问失去了首要视觉地位；
  - 体验更接近于「系统状态 / 证据结构展示」，而非沉浸式人文探索。
- **失败不是历史事实错误**：未断言错误史实，问题在体验层级（人文性 / 主次 / 留白）而非数据正确性。
- 治理含义（来自 Baseline §17）：**Engineering PASS ≠ Human Experience PASS**。该失败样本须保留，供未来实现对比、避免重演同一回归。

## 4. 证据资产

- `current-runtime-recording.mp4.mp4` —— Round A 失败证据录像（实际 Repo 文件名，双扩展名 `.mp4.mp4`）。
  - **性质**：失败证据（negative canonical evidence sample），**不是 Canonical Reference**，**不得作为未来 UI 实现模板**。
  - Baseline 附录与结构图中引用名为 `current-runtime-recording.mp4`（单扩展名），为内部引用偏差；本目录以实际 Repo 文件名为准，禁止改名匹配示意名（见 `specs/experience-ui/README.md` §2）。
- 本 `README.md` 由 EXP-UI-GOV-01（2026-09-25）创建，仅做治理登记。

## 5. 禁止登记的内容（防止误导）

- 不得替 Human Tester 发明评分（如 1–10 / 加权总分 / 自创及格线）。
- 不得替 Human Tester 编写 H1–H10 回答（Round B 未运行）。
- 不得声称 Round B 结论或 Human PASS / FAIL（最终 Gate 由 Architect 裁决）。
- 不得把本失败录像当作 Canonical Reference 或未来 UI 设计模板。

## 6. 关联

- Baseline：`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` §17（Pre-Baseline Failure Evidence — M5-HUMAN-01）、附录 A·B。
- 治理任务：EXP-UI-GOV-01（Experience/UI Baseline & Source Archive Governance Integration）。
- NEXT：Architect-authorized **Current Runtime vs Canonical Experience/UI Baseline Drift Audit**（pending Architect Task Book）。
