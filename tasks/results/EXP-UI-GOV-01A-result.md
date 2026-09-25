# EXP-UI-GOV-01A · Governance Correction Pass — Result

- **Task Book**: `tasks/EXP_UI_GOV_01A_Correction_Task_Book_V1_0.docx`（Architect Review 裁决后正式签发）
- **Parent Task**: `EXP-UI-GOV-01`（Architect Review = **PARTIAL / HOLD**，commit `8891875`）
- **Author**: WorkBuddy（Governance / Archive Integration 角色，无产品写权限）
- **Date**: 2026-09-25
- **Repo**: `mohen-agent-2.0`（继承 HEAD = `aaf6910`；本 correction 不重写 HEAD，单独 commit）
- **Final Gate Recommendation**: **PASS_TO_UI_BASELINE_DRIFT_AUDIT**

---

## 1. 任务性质与范围

本任务是 `EXP-UI-GOV-01` 的 **Architect-authorized Correction Pass**，不是新产品任务，也不新开 Drift Audit。
Architect 对 `EXP-UI-GOV-01` Result §13 的两个问题完成裁决，授权两项修正：

- **Correction A｜Baseline Evidence Path**（factual-path correction）
- **Correction B｜L1 V4.9 Governance Reconstruction**（按冻结语义恢复 L1 当前状态）

严格受 Scope Firewall 约束（§9）：不改产品代码 / UI / CSS / Component / Surface / Renderer / Runtime / DB / schema / seed / tests；不改 source / canonical / evidence 原始资产；不升级 Baseline V1.1；不执行 Drift Audit；不继续 M5 Round B；不启动 M6；不创建第二套 L1 或 Baseline；不猜测已丢失的用户手工文本。

---

## 2. Correction A｜Baseline Evidence Path

**裁决**：实际 Repo 录像文件名为 `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4.mp4`（双扩展名 `.mp4.mp4` 是真实落盘名，**禁止重命名**）。`EXP-UI-GOV-01` 期间 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 中 3 处误写为单扩展名 `current-runtime-recording.mp4`，须精确修正为 `.mp4.mp4`。

**执行**（仅 `replace_all` 精确替换，未动任何 doctrine / 章节 / 规则）：

| 行 | 修正前 | 修正后 |
|---|---|---|
| 105 | `current-runtime-recording.mp4` | `current-runtime-recording.mp4.mp4` |
| 1284 | `current-runtime-recording.mp4` | `current-runtime-recording.mp4.mp4` |
| 1293 | `current-runtime-recording.mp4` | `current-runtime-recording.mp4.mp4` |

**核验**：Grep 复核，`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 中全部 3 处引用均为 `.mp4.mp4`，无任何单扩展名残留。`Baseline` 版本号保持 **V1.0**，未升级。

→ Correction A **PASS**（factual-path correction，零语义改动）。

---

## 3. Correction B｜L1 V4.9 Governance Reconstruction

**裁决**：按 Task Book 冻结语义恢复 / 核验 L1 当前状态；保留架构级引用 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md = Human-facing Experience/UI Implementation Authority`；不复制 Baseline 正文。

### 3.1 冻结语义（已恢复 / 核验）

| 项 | 冻结值 |
|---|---|
| M4 | **DONE / CLOSED** |
| M4-CLOSURE-01 | **PASS / CLOSED @ `aaf6910`** |
| Timeline | **KEEP_COMPATIBILITY_PATH** |
| M5 | **CURRENT / HOLD after Round-A Human Experience FAIL SIGNAL** |
| M5-HUMAN-01 | **HOLD**（Round A FAIL SIGNAL；Round B / H1–H10 不运行） |
| Round B / H1–H10 | **NOT RUN** |
| NEXT | **Architect-authorized Current Runtime vs Canonical Experience/UI Baseline Drift Audit — pending** |

### 3.2 §6.4 Canonical Repository Directory Map（已恢复 / 核验）

冻结职责全部就位：

- `governance/` = Living Architecture + Master Plan SOT
- `specs/` = Human-facing Authority（含 Baseline）
- `decisions/` = Architect 决策归档
- `tasks/` + `tasks/results/` = 任务与结果
- `data/` + `exports/` = 数据与导出
- `CONTEXT.md` + `tasks/CURRENT_TASK.md` = Current-only working tree（Git 保留历史）
- Architect-authorized Task Book = tracked governance artifact
- Candidate Registry ≠ Architecture SOT / Decision Authority
- **WorkBuddy 无权自行改变 Canonical Repository Directory**（补入 E5 条款，明确新增 / 移动 / 重命名 / 重组须经 Architect 授权）
- 架构级引用 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md = Human-facing Experience/UI Implementation Authority` 保留（段落 [181]）

### 3.3 编辑落点（Temp Copy 上完成）

- 段落编辑（PARA_EDITS ×7）：主线 `Phase II / M4` → `Phase II / M4 DONE / CLOSED · M5 CURRENT/HOLD`；更新索引、当前主线、M4-CLOSURE-01 状态、NEXT = Drift Audit（pending）等。
- 单元格编辑（CELL_EDITS ×15）：TABLE 0 / 7 / 9 / 14 / 16 的 Phase·Milestone、NEXT TASK、M4/M5 状态、Drift Audit 指向。
- 补修（Final Patch）：TABLE 7 第 4 行「Human sensory quality」残留 stale
  - `HOLD / M5 NOT YET RUN` → `HOLD / M5 Round A FAIL SIGNAL`
  - `M4.1 Runtime Integration PASS；浏览器级 Human Gate 尚未执行` → `M5 Round A Human Experience FAIL SIGNAL → HOLD（Round B / H1–H10 NOT RUN；NEXT = Drift Audit）`

---

## 4. 硬安全门执行记录（L1 DOCX 操作）

按 Task Book §04 硬安全门，**禁止直接覆写 Canonical L1**。执行顺序：

1. **Canonical L1 → temporary copy**：`governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx` → `C:/Users/Administrator/AppData/Local/Temp/l1_correct.docx`
2. **edit temporary**：python-docx 在临时副本上完成全部 PARA_EDITS / CELL_EDITS / Final Patch
3. **close ALL handles**：编辑脚本结束即释放 python-docx 句柄；渲染脚本 `word.Quit()` + `pythoncom.CoUninitialize()` 后关闭 Word COM 句柄
4. **reopen structural validation**：重新 `Document(TMP)` 做 16 项结构校验（全 OK）
5. **full-page DOCX render**：MS Word COM `ExportAsFixedFormat` → PDF，pymupdf 栅格化为 **19 页** PNG
6. **visual QA every page**：每页 `get_text()` 提取 + 19 页穷尽 stale 扫描（见 §5）；环境无 LibreOffice/poppler，但 Word COM + pymupdf 组合**可完成全页渲染**，故**非** `BLOCKED_BY_DOCX_QA_ENVIRONMENT`
7. **PASS → atomic replace**：因 Temp 在 `C:`、Canonical 在 `D:`（跨卷 `os.replace` 不原子），改为先在 **同卷 D:** 暂存 `governance/_l1_stage_tmp.docx`，再 `os.replace(stage, canonical)` **原子替换**；sha256 校验 Temp == Canonical 一致；暂存文件被 `os.replace` 消费，无残留
8. **reopen Canonical verification**：重新 `Document(SRC)` 做 16 项校验（全 OK）+ 重新 Word COM 渲染 **19 页**（证明仍为有效可打开 DOCX）

---

## 5. QA 证据

### 5.1 结构校验（16 项，Temp + Canonical 双重 PASS）

```
OK  M4 DONE / CLOSED          OK  aaf6910
OK  M5 CURRENT/HOLD           OK  M5-HUMAN-01 = HOLD
OK  Round B / H1              OK  Drift Audit
OK  KEEP_COMPATIBILITY_PATH   OK  Baseline Authority ref
OK  Directory Map             OK  WorkBuddy 无权
OK  no stale M4 CURRENT       OK  no stale M5 NOT YET RUN
OK  no stale Human Gate 尚未执行
OK  T7r4c1 fixed              OK  T7r4c2 fixed
```

### 5.2 逐页 stale 扫描（19 页，全 OK）

扫描 token：`M4 CURRENT` / `M5 NOT YET RUN` / `M3 DONE / M4` / `ENG-GOV-01 正在独立执行` / `浏览器级 Human Gate 尚未执行` / `M4.1 Runtime Integration PASS；浏览器级` / `先恢复 regression baseline` / `当前 Milestone = M4` 等。

```
P01 OK  P02 OK  P03 OK  P04 OK  P05 OK  P06 OK  P07 OK  P08 OK  P09 OK
P10 OK  P11 OK  P12 OK  P13 OK  P14 OK  P15 OK  P16 OK  P17 OK  P18 OK  P19 OK
ANY STALE: False
```

### 5.3 Canonical 物理证据

- Canonical 终态大小：**64,275 B**（214 段落 / 17 表 / 19 页）
- sha256（修正后 Temp == Canonical）：`82ff9394190e5735f84e65152a1003d8ba37ea4e5dc6443eb920640ae1ee54fa`
- 重新渲染页数：**19**（与修正前一致，无页损 / 无截断）

---

## 6. 未改动确认（Scope Firewall）

- **产品代码 / UI / CSS / Component / Surface / Renderer / Runtime / DB / schema / seed / tests**：零改动。
- **source / canonical / evidence 原始资产**：零改写、零重命名、零转换（仅 `EXP-UI-GOV-01` 期间 `git add` 纳入，本 correction 不动实体内容）。
- **Baseline V1.0**：仅 3 处路径 token 修正，未升级 V1.1、未动 doctrine。
- **不执行 Drift Audit**、**不继续 M5 Round B**、**不启动 M6**、**不创建第二套 L1/Baseline**。

---

## 7. 资产变更清单（待 commit）

| 文件 | 状态 | 说明 |
|---|---|---|
| `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` | M（modified） | Correction A：3 处 `.mp4.mp4` 路径修正，V1.0 不变 |
| `governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx` | M（modified） | Correction B：按冻结语义重建 L1 当前状态，原子替换 |
| `tasks/EXP_UI_GOV_01A_Correction_Task_Book_V1_0.docx` | ??（untracked） | Architect 签发 Task Book，纳入 tracked governance |
| `tasks/results/EXP-UI-GOV-01A-result.md` | ??（新增） | 本 Result |

---

## 8. Final Gate Recommendation

**PASS_TO_UI_BASELINE_DRIFT_AUDIT**

依据：
1. Correction A 完成（Baseline 3 处路径精确修正，V1.0 不变，Grep 复核无残留）。
2. Correction B 完成（L1 按冻结语义完整重建，16 项结构校验 + 19 页穷尽 stale 扫描全 OK，Canonical 原子替换后重新渲染验证 19 页一致）。
3. 硬安全门全程遵守（Temp 编辑 → 关句柄 → 重开校验 → 全页渲染 → 逐页 QA → 原子替换 → 重开验证）；环境可全页渲染，未触发 `BLOCKED_BY_DOCX_QA_ENVIRONMENT`。
4. Scope Firewall 未被突破（产品代码 / source / canonical / evidence / Baseline doctrine / Drift Audit / M6 均未动）。

下一步（**不在本 correction 内**，待 Architect 授权启动）：Current Runtime vs Canonical Experience/UI Baseline Drift Audit。

---

## 9. §15 简报（Task Book 规定）

> **EXP-UI-GOV-01A · Governance Correction Pass — 完成**
>
> - **Gate**: PASS_TO_UI_BASELINE_DRIFT_AUDIT
> - **Correction A**: Baseline 3 处录像路径 `current-runtime-recording.mp4` → `current-runtime-recording.mp4.mp4`（V1.0 不变，Grep 复核通过）
> - **Correction B**: L1 V4.9 按冻结语义重建 — M4=DONE/CLOSED、M4-CLOSURE-01=PASS/CLOSED@aaf6910、Timeline=KEEP_COMPATIBILITY_PATH、M5=CURRENT/HOLD(Round-A FAIL SIGNAL)、M5-HUMAN-01=HOLD、Round B/H1–H10=NOT RUN、NEXT=Drift Audit(pending)；§6.4 Directory Map + Baseline Authority 引用保留
> - **QA**: 16 项结构校验 + 19 页穷尽 stale 扫描全 OK；Canonical 原子替换后重新渲染 19 页一致（sha256 `82ff9394…54fa`）
> - **安全门**: Temp 编辑 → 关句柄 → 重开校验 → 全页渲染 → 逐页 QA → 原子替换（跨卷先 D: 暂存再 `os.replace`）→ 重开验证；非 BLOCKED
> - **Firewall**: 产品代码 / source / canonical / evidence / Baseline doctrine / Drift Audit / M6 均未动
> - **STOP**: correction + Result + commit 后停止，不自行启动 Drift Audit
