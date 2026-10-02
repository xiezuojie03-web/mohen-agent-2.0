# EXP-UI-RECON-01 · Jinze Canonical Experience Humanization Pass — Result

> 性质：最小 Human-facing Experience Reconstruction / Humanization Pass（只执行 Task Book R1–R5）
> 前置：EXP-UI-AUDIT-01 = PASS / CLOSED @ `c062a43`；Gate = `PASS_TO_EXPERIENCE_UI_RECONSTRUCTION_PLANNING`
> 当前 Phase：II / M5 CURRENT / HOLD；M5-HUMAN-01 = HOLD；Round B / H1–H10 = NOT RUN（本任务未触碰）
> 最高 Authority（**2026-10-02 更正**）：`governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md`（Human-facing Experience / UI 唯一 Authority）。原文所引 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` **已移至 `specs/archive/` 并降为 SOURCE ARCHIVE / TRACE**；本任务当时的对照版本应视为该历史 Baseline。

---

## 01｜Executive Verdict

**R1–R5 全部完成；默认 Human UI 的内部技术/元数据泄露已全部关闭或人话化；全部内部能力保留于 `?inspector=1`；KEEP Protection Gate（K1–K7）零回归；DEFER 零偷做。**

实现方式为「扩展既有 `?inspector=1`（`devInspector` / `ctx.devMode`）门控覆盖面 + 极小 Human-facing 标签映射（`humanLabels.ts`）」，未新增架构层、未改 ExperienceState / CompositionState / SurfaceRegistry / Renderer、未改 Evidence Gate 逻辑、未改 Cultural World 数据与冻结产物（3 份冻结 JSON 逐字节未动）。

**Gate Recommendation：`PASS_TO_M5_HUMAN_ROUND_B`**（详见 §18）。

## 02｜Context Gate / Baseline

- §03 Required Reads 9 项全部完成（Baseline spec、Audit result + drift map、canonical PNG ×2、experience-ui README、CONTEXT.md、CURRENT_TASK.md、相关实现与测试）。
- 实际 baseline：`c062a43`（branch `track/world-cultural-world-02`），与任务书一致，其间无产品改动提交。
- 实施前已实际启动 `/experience/jinze-water-net`（`next dev :3000`，Next 15.5.25）确认现状与 Audit 一致（D1 调试条常驻、徽章内部词汇、裁决标签、伪公式、6 位 GPS 均在场）。

## 03｜KEEP Protection Pre-check

编码前逐项声明并验证（方案层面确认不触碰，实施后 §12 再验）：
K1 五幕节奏 / K2 One-Moment-One-Focus / K3 Agent→世界重组 / K4 Patch-not-Replace / K5 Agent-native Presence / K6 Evidence-on-Demand / K7 GCJ-02·WGS-84 诚实分离 —— 全部不受 R1–R5 方案影响；方案无需 STOP。

## 04｜R1 Debug Layer（D1-F01）

- `ExperienceShell.tsx`：`exp-transition-hint`（`{composition.recipe} · 主角={primaryType…}`）改为仅 `devInspector` 渲染；默认 Human UI 不再出现。`title` 提示一并随门控。
- `composition.recipe` / `primaryType` 数据与 Composition 行为零改动（外层 `recipe-*` / `intensity-*` 样式 hook 保留，供既有 CSS 使用）。
- Inspector（`?inspector=1`）下 hint 原文恢复：`IMMERSIVE_SPATIAL · 主角=current_map`。

## 05｜R2 Evidence Language（D6-F01）

- 新建 `humanLabels.ts`（R5 授权的极小 helper）：narrative level / 片段闸门 kind / resolutionStatus / 内部标记剥离四类映射；`devMode=true` 时一律透出内部原值。
- 徽章映射（默认 ↔ 内部）：有据事实→**有资料支持**；可用片段→**可引用（有依据）**；禁用片段→**暂不采用（依据不足）**；受约束片段→**有条件可用**；开放问题→**待确认**；墨痕的解释框架→**墨痕的解释（尚待证实）**。未把任何候选/冲突/受约束信息包装成「已证实」（发现仍以「尚未证实」身份呈现）。
- 内部标记剥离（默认 UI）：`AD-05 U10 禁用：`前缀、行内 `Uxx：`、括号内 `（U5）（E1）（HR-4）`、E1/E2/E3 枚举（→已证/候选级/弱线索，与关系图例同一词汇）、`unresolved`→未定、谓词枚举键（`former_site_of`→原址即等，与 SpatialSurfaces `predicateLabel` 同表）。
- `scene.uncertainty`（史料抽屉）：默认剥离标记后若仍残留系统状态码（ACCEPT_CONFLICT / PARTIAL_CONFIRM / HR-MAP-xx），按 R2「无法无损人话化→默认隐藏」处理；Inspector 显示原文。
- Audit 未点名但同类的默认泄露（实施中发现并一并关闭）：① `scene.uncertainty` 的 U-xx/E2（冻结剧本 scenes[2]/[3]）；② Discovery 冻结文本的 `（E1）（U5）（U7）`；③ 片段闸门 fact 文本的 `（HR-4）` 与谓词键；④ 证据检视视图中 `E1（不升 E1）` epistemic 标签（→ 仅 Inspector）；⑤ 双值冲突卡 `resolutionStatus: preserved_open`（→ 两值并存）。冻结数据全部未改，仅在渲染层处理。

## 06｜R3 Conflict / Discovery（D6-F02 / D6-F03）

- 冲突状态条：默认渲染人话 `两种资料并存，目前不能据此裁定`；`静默裁决：ineligible` / `并列比较：eligible` 仅 Inspector。双值冲突卡页脚同理（默认 `来源：008/cultural_conflicts · 双值并存`）。
- 冲突事实完整保留：三张冲突卡未裁决、双值并列（1308 ↔ 1260 建造年代开放），墨痕不替用户选边。
- Discovery 伪公式：默认改人话 `三条证据各自成立；把它们合起来怎么解读，还需要独立的判断。`（不创造新历史结论）；`<code>Evidence(A)+Evidence(B)+Evidence(C) ≠ …</code>` 移入 Inspector。规则本体以 `DISCOVERY_FORMULA` 常量保留于 `humanLabels.ts`（源码契约测试同步更新）。

## 07｜R4 Spatial Labels（D4-F02）

- `CurrentMapSurface` 精确点 `sub` 6 位 GPS 字面量：默认不渲染（`undefined`）；Inspector 显示 `120.919639, 31.039508`。
- 另一坐标系参考锚（offFrame）的 raw 坐标同规则：默认只显示 `WGS-84 · 另一坐标系参考锚`；Inspector 显示原值。
- 地图点几何、graticule / 比例尺 / 指北 / `本图坐标系 GCJ-02（原值，零换算）` 诚实 banner、`↓ 另一坐标系的记录：分列登记，不并入本图、不做换算` 全部保留（K7）；未做任何坐标转换 / 配准 / GIS 扩展。

## 08｜R5 Inspector Consistency

- 五类内部信息（transition-hint、Evidence internal labels、conflict adjudication、Discovery formula、raw GPS）统一为同一规则：**默认 Human UI = 人话/隐藏；`?inspector=1` = 内部原值**；实现全部经 `devInspector`（Shell）或 `ctx.devMode`（Surface）单一开关。
- Inspector 保持既有定位（EXP-0001 §5 开发/诊断机制），未升级为产品模式 / L1 概念 / 用户功能；replan-card 原有门控未动。

## 09｜Automated Tests

- 新增 `tests/e2e/experience-recon-01.spec.ts`（2 用例）：默认 UI 全五幕走查断言 AT-01/02/03/04/05 + 徽章/闸门/状态条逐载体检查 + KEEP（AT-07/08/09/10）；`?inspector=1` 用例断言 AT-06（hint 原文、GPS、裁决标签、伪公式、replan-card）。**2/2 PASS**。
- 既有测试：`tests/e2e/experience.spec.ts` 存在两处与本次改动无关的存量失效（A/B stash 验证：改动前后同样失败）——① TASK-0014 时代的 `/追问/` 单按钮假设 vs TASK-0017 的 4 按钮（strict mode violation）；② TASK-0013 时代冻结 patch-card 断言 vs TASK-0016 起追问走真实 Replan Runtime（冻结卡让位）。按任务书「补充/更新自动测试」授权做最小更新（`.first()` + 断言对齐 patch-pill 契约），Patch-not-Replace 验证语义不变。
- `tests/experience/composition2.test.ts` 用例 13 为源码文本断言（要求 tsx 内含伪公式字面量），按 R3 新契约更新：默认 UI 无公式、`DISCOVERY_FORMULA` 常量保留于 `humanLabels.ts`、仅 devMode 渲染。
- **全量 vitest：16 files / 253 passed (253)**；**全量 Playwright E2E：4 passed**；`tsc --noEmit`（apps/web + pnpm -r）0 error。

## 10｜Runtime Human-mode Verification

实际启动 Runtime 走查（非单元测试替代）：`next dev :3000` + Playwright 双模式取证，产物 50 件（24 PNG + 24 state JSON + drive-log + drift-recheck.md）于 `tasks/results/EXP-UI-RECON-01-evidence/`。
默认模式 12 场走查：首屏（干净地图 + 诚实坐标系 banner，无调试条/GPS）→ 时间/空间转换 → 关系发现 → 寺进入 + 非答案 → 冲突（人话状态条，冲突卡未裁决保留）→ 史料原页（状态码句隐藏）→ 时间轴 → 回到今天 → 今貌照片 → 发现（人话规则 + 解释身份）→ 追问/Replan（IntentGuide 收口、进度不重置、无内部 replan-card）→ 回到今天。`transitionHint.present` 全程 false；`rawGpsPairOnPage` 全程 null；内部词汇全文 0 命中；pageerror = 0。

## 11｜Inspector-mode Verification

`?inspector=1` 12 场走查：`IMMERSIVE_SPATIAL · 主角=current_map` 每幕可见；6 位精确坐标恢复；内部徽章原值（可用片段/禁用片段/受约束片段/有据事实）；AD-05 / U10 / former_site_of 原文；`静默裁决：ineligible`+`并列比较：eligible`；史料抽屉 ACCEPT_CONFLICT/PARTIAL_CONFIRM 状态句原文；伪公式 code；replan-card。**信息无删除，仅门控。**

## 12｜KEEP Protection Post-check

K1 五幕进度 `Beat 1/5·1/8 → 5/5·8/8`（节奏表达非面板）✓；K2 每场单一 primaryTestId（8 种主表面随世界重组切换）✓；K3 世界重组保持（时间/空间/关系/时间轴/照片/发现全部为世界变化）✓；K4 Patch-not-Replace（追问后 `8/8` 不重置、URL 不变、trail 保留、s08c 回到今天）✓；K5 无 chat input、墨痕短句 + IntentGuide + AgentPromptSurface 在场 ✓；K6 Evidence-on-Demand（「展开这一刻的证据（还有 N 条未显示）」+ 片段级 gate 能力未动，仅词汇人话化）✓；K7 坐标系诚实分离（GCJ-02 原值 banner + 分列登记说明保留，无换算/配准）✓。

## 13｜DEFER / Scope Firewall Audit

D6-F04 今貌照片加载可靠性（照片面结构未动，Wikimedia 直连保持）/ M4 D1 culturalEvents·meaningCandidates / M4 D3 颐浩寺 1288·1295 / M4 O1 文案密度 / M4 D2 轴 A 进 decideEvidence / 第二古镇 / GIS Track / Data Factory / Figma 新稿 —— **全部未触碰**。数据/seed/schema 零改动；3 份冻结 JSON 逐字节未动；Cultural World 投影逻辑未动。

## 14｜Changed Files

- `apps/web/app/experience/jinze-water-net/humanLabels.ts`（**新增**，唯一 helper）
- `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx`（R1 门控 + R2 徽章映射）
- `apps/web/app/experience/jinze-water-net/surfaces/EvidenceNarrativeSurfaces.tsx`（R2/R3 徽章/裁决/公式/不确定度/检视标签）
- `apps/web/app/experience/jinze-water-net/surfaces/SpatialSurfaces.tsx`（R4 GPS 子标签）
- `apps/web/app/experience/jinze-water-net/beats.ts`（1 处呈现字符串：`存在 E1 据证历史关系`→`存在有据的历史关系`；无逻辑改动）
- `apps/web/app/experience/jinze-water-net/experience.css`（+2 个极小人话元素样式）
- `tests/e2e/experience-recon-01.spec.ts`（**新增**）；`tests/e2e/experience.spec.ts`、`tests/experience/composition2.test.ts`（存量失效最小修复，见 §09）
- `tasks/EXP_UI_RECON_01_…_Task_Book_V1_0.docx`、`tasks/results/EXP-UI-RECON-01-result.md`、`tasks/results/EXP-UI-RECON-01-evidence/`（50 件）
- `tasks/CURRENT_TASK.md`、`CONTEXT.md`（最小状态指针）

## 15｜Architecture Reconciliation

无新架构候选（C1/C2 维持 CANDIDATE ONLY / NO TASK / NO MIGRATION）。无 STOP 事件：实现全程未触碰 ExperienceState / CompositionState / SurfaceRegistry / Renderer 架构、五幕状态机、Evidence Gate 判定逻辑、Replan / Patch-not-Replace 语义、Cultural World 数据与 schema。`humanLabels.ts` 属 R5 明文授权的「极小 helper / label map」，被引擎测试（composition2）以路径引用，不构成新层。

## 16｜Plan Reconciliation

M5 保持 CURRENT / HOLD；Round B / H1–H10 未运行；M6 未启动。Gate `PASS_TO_M5_HUMAN_ROUND_B` 与 Roadmap 允许路径一致：Humanization 完成、REMOVE drift 关闭、KEEP 无回归，可由 Architect 决定启动 M5 Human Round B。本任务未替代 Round B 人类评分。

## 17｜Remaining Risks

1. **人话措辞为 Architect 语义边界的首次落地**（R2 表格授权范围内的具体措辞选择），最终语感以 M5 Round B 人类实测为准；映射集中在 `humanLabels.ts`，调词零散改。
2. **默认模式隐藏了史料抽屉的一句状态码型不确定度**（scenes[4]，含 ACCEPT_CONFLICT/PARTIAL_CONFIRM）——按 R2「不能无损人话化→隐藏」处理，Inspector 可见；若 Architect 认为该信息必须面向用户，需另出人话文案任务（冻结数据未改）。
3. **既有 E2E 的存量失效修复超出严格 R1–R5**（仅为让全量测试集可绿的测试维护，A/B 已证明与本次产品改动无关）；若 Architect 认为应还原，可单独 revert 该两个测试文件。

## 18｜Gate Recommendation

**`PASS_TO_M5_HUMAN_ROUND_B`**

判定依据：AT-01…AT-10 全部通过（自动测试 + Runtime 双模式走查双重验证，27/27 drift-recheck PASS）；REMOVE 清单（D1-F01 / D4-F02 / D6-F01 / D6-F02 / D6-F03）全部关闭或人话化；KEEP（K1–K7）零回归；Inspector 能力零删除；DEFER 零偷做；全量 vitest 253/253、E2E 4/4、typecheck 0 error；Result + evidence + commit 齐、working tree clean。非 HOLD（无残留泄露/回归/scope 偏差）、非 BLOCKED（未触碰冻结边界）。

## 19｜Commit / Working Tree / STOP

- Commit：`feat(exp-ui-recon-01): Jinze Canonical Experience Humanization Pass (R1–R5)` —— Task Book + Result + evidence + 产品/测试代码 + 指针更新。
- Working tree：commit 后 clean（`.workbuddy/tmp` 走查脚本与 `/tmp` 日志均在仓库外）。
- **STOP**：Humanization Pass 完成，立即停止。不启动 M5 Round B / H1–H10，不做继续视觉美化，不开始第二古镇或任何 DEFER 项；下一步由 Architect 裁决 Round B。
