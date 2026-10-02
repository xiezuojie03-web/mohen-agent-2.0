# EXP-UI-AUDIT-01 · Current Runtime vs Canonical Experience/UI Baseline Drift Audit — Result

> 性质：**只诊断，不施工**（Diagnosis Only · No UI Reconstruction · No Product Modification）
> 前置 Gate：`EXP-UI-GOV-01A = PASS / CLOSED @ ade565e`
> 当前 Phase：II / M5 CURRENT / HOLD；M5-HUMAN-01：HOLD；Round B / H1–H10 = NOT RUN
> 最高 Authority（**2026-10-02 更正**）：`governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md`（Human-facing Experience / UI 唯一 Authority）。原文所引 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` **已移至 `specs/archive/` 并降为 SOURCE ARCHIVE / TRACE**（见 `specs/OWNERSHIP_MAP.md` §2）——本审计当时的对照版本应视为该历史 Baseline，审计结论本身不受影响。
> 审计方法：实际启动 `/experience/jinze-water-net`（Next 15.5 dev, port 3001）+ Playwright 文本化取证（截图 + `state-*.json`），只读追踪 ExperienceState→Composition→Surface→Renderer。

---

## 01｜Executive Verdict

**当前 Jinze Runtime 在工程链路层面是正确的（M4-CLOSURE-01 PASS@aaf6910），且其体验主干在结构上符合冻结的 Canonical Experience。** Five-Beat 以认知节奏表达（非五个面板）、One-Moment-One-Focus 成立、Agent 判断力转化为可感知的世界重组（非文字解释状态）、坐标系诚实分离（GCJ-02 / WGS-84 不并入、不换算）、Evidence-on-Demand 与 Patch-not-Replace 连续性均到位。

**它仍偏离冻结 Human-facing Experience 的唯一集中原因：默认人类界面泄露了系统自身的"技术 / 元数据词汇"。** 具体为：常驻调试条（recipe + 主角变量）、每个证据单元的 epistemic / 闸门徽章（可用片段 / 禁用片段 / 受约束片段 / AD-05 U10…）、冲突比较面的内部裁决状态标签（静默裁决：ineligible）、Discovery 面的伪公式 `<code>Evidence(A)+Evidence(B)+Evidence(C) ≠ …</code>`、以及当前地图的 6 位小数原始 GPS 子标签。

这些词汇正是 Baseline §13.1 明确写明的"通常不在默认用户界面"的内部枚举。开发团队已对**部分**组件施加了 `?inspector=1` 的 DEV 门控（replan-card、IntentGuide 内部标签），但**未一致性地**施加到 transition-hint、narrative 徽章、冲突标签、Discovery 公式、GPS 子标签——于是默认 UI 读起来像"带调试开关没关的构建版"。

**结论：Drift 已定位到可执行层（Styling / Surface），边界清晰，且存在可复用的门控模式（`?inspector=1`）。** 不需要新架构、不需要新数据、不需要扩第二古镇。可由 Architect 签发最小 Reconstruction Task。

**Gate Recommendation：`PASS_TO_EXPERIENCE_UI_RECONSTRUCTION_PLANNING`**（详见 §18）。

---

## 02｜Context Gate / Authority Confirmation

Context Gate 9 项 Required Reads 全部完成，顺序与 Authority 层级无误：

1. `governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx` — 确认 M5 CURRENT/HOLD、NEXT = 本 Drift Audit；禁止扩第二簇 / GIS / Data Factory。
2. `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` — 唯一 Human-facing Authority；本审计最高判断依据（§4 五幕契约、§5 Visual Hierarchy、§13.1 证据人话化、§16 Anti-pattern AP-01~AP-14）。
3. `specs/experience-ui/README.md` — Authority 层级：Baseline > canonical > source > evidence；canonical PNG 为参考非 pixel-spec。
4. `specs/experience-ui/canonical/金泽历史关系探索体验板.png` — Canonical Experience Grammar Reference（五幕节奏、One Moment One Focus、Show→Question→Reveal、Space Before Text、Return to Present）。
5. `specs/experience-ui/canonical/EXP-DESIGN-02 · Round 2 · Jinze Canonical Reconstruction.png` — Canonical Visual Composition Reference。
6. `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4.mp4` — 仅作 negative evidence（已过时的失败录像）。
7. `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/README.md` — 失败性质：Runtime/Integration PASS 但 Human-facing Canonical Drift；禁止替 Human Tester 虚构评分。
8. `tasks/results/M4-CLOSURE-01-result.md` — 确认 Integration 六层全通、0 blocker；避免把工程问题误判成 UI 漂移。
9. 当前 Jinze Runtime 实现代码（route / ExperienceState / CompositionState / SurfaceRegistry / Renderer / 测试）— 只读追踪，Runtime 实际启动观察。

---

## 03｜Current Runtime Capture

- **启动方式**：`apps/web/node_modules/next/dist/bin/next dev -p 3001`（cwd=apps/web），Next 15.5。
- **走查覆盖**：首屏（s01）→ 第一次 meaningful transition（s02 时间/空间转换）→ 关系发现（s03 relational_space）→ 证据展开（s04 寺进入 / s05a 冲突 / s05b 历史地图）→ 时间轴（s06）→ 回到今天（s07 + s07b 今貌照片）→ 下一个问题 + Follow-up Replan（s08 → s08b inspect_evidence → s08c propose_present_action → s08d return-to-present）。
- **取证产物**：`tasks/results/EXP-UI-AUDIT-01-evidence/` — 19 张 PNG（首屏/各幕 viewport + 关键 full 页）+ 14 个 `state-*.json`（含 beat / scene / spatialMode / transitionHint / primaryTestId / fullText 等文本化字段）+ `drive-log.txt`。截图仅作证据留存，结论推断以 `state-*.json` 文本字段为准（模型不可视觉读 PNG）。
- **关键文本化证据**：
  - `state-01-first-screen.json`：`transitionHint.inViewport=true`，`text="IMMERSIVE_SPATIAL · 主角=current_map"`；`progress="Beat 1/5 · 1/8"`；`spatialMode="现代精确坐标"`。
  - `state-03-relation.json`：`spatialMode="关系历史空间（无坐标）"`；units 含 `可用片段/禁用片段/受约束片段/开放问题/有据事实` 等徽章；`progress="Beat 3/5 · 3/8"`。
  - `state-08-s08.json`：`progress="Beat 5/5 · 8/8"`；primary 含 `Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C interpretation)`。
  - `state-07b-photo.json`：今貌照片面三张 caption + `CC BY-SA 3.0 来源` 均渲染（图像在沙箱直连 Wikimedia 空白，资产经 curl 验证存在，见 §06 D6-F04）。

---

## 04｜Canonical Comparison Summary

| 比较对象 | 结论 | 一句话 |
|---|---|---|
| A 当前 Runtime | 已实际观察 | 体验主干合规，默认 UI 泄露技术元数据 |
| B Baseline（冻结原则） | 主干符合，§13.1 违反 | 内部枚举出现在默认 UI |
| C Canonical Grammar（体验板 PNG） | 五幕节奏 / One Focus / Space Before Text 符合 | 仅默认 UI 噪声削弱沉浸 |
| D Canonical Composition（EXP-DESIGN-02） | 视觉主次结构符合 | 调试条 / 徽章 / GPS 子标签破坏留白与文本密度 |

**核心判断**：Runtime 的"骨架"与 Canonical 对齐；偏差 100% 落在"默认 UI 是否把系统内部词汇当成人话呈现"这一层。这正是 M5 Round-A Human FAIL SIGNAL 的可执行根因。

---

## 05｜Nine-Domain Drift Audit

**D1 · Entry / First 10 Seconds** — 用户首屏先看到 `IMMERSIVE_SPATIAL · 主角=current_map` 调试条（inViewport=true），叠加 6 位 GPS 与坐标系说明。地方/视觉/问题被技术状态抢占。**Finding：D1-F01（REMOVE, BLOCKING）**。

**D2 · Primary Visual Focus** — 每 Moment 仅一个主表面（surface-current-map / surface-relational-space…），Canvas 主导，One-Moment-One-Focus 成立。**Finding：D2-F01（KEEP）**；调试条 / 徽章 / GPS 子标签作为次级技术文本与主焦点竞争，并入 D1-F01 / D4-F02 / D6。

**D3 · Five-Beat Experience Grammar** — `BEATS[]` 5 项（hook→time-space-shift→relationship→evidence-change→return-next），状态机 `Beat 1/5·1/8`→`Beat 5/5·8/8`，认知节奏成立，非五个面板。**Finding：D3-F01（KEEP）** — 这是"Runtime 结构正确"的决定性证据。

**D4 · Map / Time / Relation Transformation** — s01 当前地图 → s02 时间转换 → s03 关系拓扑 → s04 寺进入 → s06 时间轴 lifeline；世界重组而非文字解释状态。**Finding：D4-F01（KEEP）**；但 CurrentMapSurface 暴露 6 位小数原始 GPS 子标签（`SpatialSurfaces.tsx:123 toFixed(6)`），坐标系诚实分离本身 KEEP，原始 GPS 字面量属技术元数据泄露。**Finding：D4-F02（REMOVE, MODERATE）**。

**D5 · Progressive Reveal & Text Density** — Show→Question→Reveal 成立（"展开这一刻的证据（还有 3 条未显示）"，state-03）；Space Before Text 在 Canvas 成立。**Finding：D5-F01（KEEP）**；但 reveal 内的闸门徽章注入密集内部词汇，并入 D6-F01。

**D6 · Evidence Presentation** — Evidence-on-Demand 成立且可追溯；但默认 UI 泄露三类内部词汇：① 每证据单元 `unit__badge` 渲染 epistemic / 闸门标签（可用片段/禁用片段/受约束片段/AD-05 U10 禁用…/开放问题/有据事实）；② 冲突面内部裁决状态标签（静默裁决：ineligible / 并列比较：eligible）；③ Discovery 面伪公式 `<code>Evidence(A)+Evidence(B)+Evidence(C) ≠ …</code>`。**Finding：D6-F01（REMOVE, BLOCKING）、D6-F02（REMOVE, MAJOR）、D6-F03（REMOVE, MAJOR）**；今貌照片资产存在、直连空白属加载可靠性，非资产缺失。**Finding：D6-F04（RECOVER, MODERATE / DEFER 边界）**。

**D7 · MoHen Presence / Agent-Native** — 无 chat input；墨痕短句（"墨痕先看它们和水的关系。把寺也放进来。"）+ IntentGuide（EXP-0001 人类可感知收口层，无内部 label）+ AgentPromptSurface；默认模式不退化成 Chat-first / Inspector-first（inspector 已门控）。**Finding：D7-F01（KEEP）**；Discovery 伪公式属系统自我解释，并入 D6-F03。

**D8 · Present-day Connection（P1/P2/P3）** — P1"重新看见今天"结构存在（s07 回到今天 + 3 张今貌照片 + "现在，再看一次它们"）；P2"与我有关"部分成立（追问："那我现在去现场可以看什么"）；P3"继续行动"成立（追问链 + 看事实 / 了解更多）。条件已具备，但技术元数据泄露削弱 P1 沉浸（见 §14）。**Finding：D8-F01（KEEP, readiness 评估见 §14）；D8-F02（MODERATE, REMOVE，并入 D1/D6）**。

**D9 · Continuity / Patch-not-Replace** — Follow-up / Replan 保持空间 / 时间 / 叙事连续（s08→s08b→s08c→s08d）；replan-card 仅 `?inspector=1` 可见（EXP-0001 §5）；不重新生成页面 / 卡片堆。**Finding：D9-F01（KEEP）**。

---

## 06｜Anti-pattern Audit（逐项 PRESENT / ABSENT / PARTIAL）

| Anti-pattern | 判定 | Evidence |
|---|---|---|
| AP-01 Debugger UI | **PRESENT** | `exp-transition-hint` 常驻（ExperienceShell.tsx:307；state-01.inViewport=true）；Discovery 伪公式（:501） |
| AP-02 Architecture-on-screen | **PARTIAL** | recipe/主角 hint + 冲突裁决标签暴露架构内部状态，非完整架构上屏 |
| AP-03 Evidence Database Browser | **ABSENT** | 证据以叙事片段按需呈现，非 DB 浏览器 |
| AP-04 Card-stack Website | **ABSENT** | Canvas 主导、单主焦点，非卡片堆 |
| AP-05 Text-first History | **ABSENT** | Space Before Text，Canvas 先行 |
| AP-06 Chat-first Agent | **ABSENT** | 无 chat input，Agent-native 经世界重组 |
| AP-07 Technical Metadata Dominance | **PRESENT（主漂移）** | transition-hint + narrative 徽章 + 冲突标签 + Discovery 公式 + 6 位 GPS 子标签 |
| AP-08 Five Beats as Five Panels | **ABSENT** | 五幕以节奏表达（D3-F01 KEEP） |
| AP-09 Fake Historical Precision | **ABSENT** | GCJ-02/WGS-84 诚实分离、"历史视觉资产=0"、"宁可抽象不画编出来的河" |
| AP-10 Correct but Uninteresting | **PARTIAL** | 结构正确且有趣，但元数据泄露使默认 UI 读起来像调试构建；Reconstruction 后应为成品人类体验，非结构性失败 |

---

## 07｜Code / Architecture Root-Cause Trace（只读）

| Finding | Root Cause Layer | 实现位置（可追溯） |
|---|---|---|
| D1-F01 / D2 次级 | Styling + ExperienceShell | `ExperienceShell.tsx:307` `<span className="exp-transition-hint" …>{composition.recipe} · 主角={primaryType ?? …}</span>`；`experience.css:141` `.exp-transition-hint`；无 `?inspector` 门控 |
| D3-F01（KEEP） | Composition + beats | `beats.ts:124 BEATS[]`（5 项）；`ExperienceState` 进度 `Beat x/5` |
| D4-F01（KEEP）/ D4-F02 | Surface + Styling | `SpatialSurfaces.tsx:123 sub:\`${pair.a.toFixed(6)}, ${pair.b.toFixed(6)}\``；坐标系诚实分离在 `state-01` canvasText |
| D5-F01（KEEP） | Surface + Evidence | `EvidenceNarrativeSurfaces.tsx` fragment gates（"还有 3 条未显示"） |
| D6-F01 | Surface + Styling + Content | `ExperienceShell.tsx:334-335`（LEVEL_LABELS 徽章）、`EvidenceNarrativeSurfaces.tsx:339`、`SpatialSurfaces.tsx:289`；`LEVEL_LABELS` 来自 `packages/experience-engine/src/experience-runtime.ts` |
| D6-F02 | Surface | `EvidenceNarrativeSurfaces.tsx:443-444` `<span className="tag tag--unresolved">静默裁决：ineligible</span>` |
| D6-F03 | Surface + Content | `EvidenceNarrativeSurfaces.tsx:501` `<code>Evidence(A)+Evidence(B)+Evidence(C) ≠ …</code>` |
| D6-F04 | Asset + Runtime | `EvidenceNarrativeSurfaces.tsx:552,588 commonsDirectUrl`；资产存（curl 200），沙箱直连空白 |
| D7-F01（KEEP） | Agent Presence | `IntentGuide.tsx`（EXP-0001 收口，无内部 label）、`AgentPromptSurface`；`?inspector=1` 门控（ExperienceShell.tsx:419） |
| D9-F01（KEEP） | Composition + Continuity | `replan-card` 仅 `devInspector`（ExperienceShell.tsx:419）；patch-not-replace |

**根因归纳**：`?inspector=1` DEV 门控模式（EXP-0001 §5）已成功应用于 replan-card 与 IntentGuide 内部标签，但**未一致性地**应用到 transition-hint、narrative 徽章、冲突标签、Discovery 公式、GPS 子标签。可复用的修复模式已存在。

---

## 08｜Drift Map Summary

逐 Finding 完整 Drift Map 见 `tasks/results/EXP-UI-AUDIT-01-drift-map.md`。汇总：

| Finding | Domain | Classification | Severity | Root Layer |
|---|---|---|---|---|
| D1-F01 | D1 | REMOVE | **BLOCKING** | Styling/ExperienceShell |
| D2-F01 | D2 | KEEP | — | — |
| D3-F01 | D3 | KEEP | — | Composition |
| D4-F01 | D4 | KEEP | — | Surface |
| D4-F02 | D4 | REMOVE | MODERATE | Surface/Styling |
| D5-F01 | D5 | KEEP | — | Surface |
| D6-F01 | D6 | REMOVE | **BLOCKING** | Surface/Styling/Content |
| D6-F02 | D6 | REMOVE | MAJOR | Surface |
| D6-F03 | D6 | REMOVE | MAJOR | Surface/Content |
| D6-F04 | D6 | RECOVER | MODERATE | Asset/Runtime (DEFER 边界) |
| D7-F01 | D7 | KEEP | — | Agent Presence |
| D8-F01 | D8 | KEEP | — | — |
| D8-F02 | D8 | REMOVE(MODERATE) | MODERATE | 并入 D1/D6 |
| D9-F01 | D9 | KEEP | — | Composition |

---

## 09｜KEEP Protection List（Reconstruction 不得破坏）

1. **D3-F01 五幕认知节奏** — `BEATS[]` 五幕以节奏表达，非五个面板。
2. **D4-F01 / D9-F01 世界重组 + Patch-not-Replace 连续性** — Agent 判断→可感知世界变化；Follow-up 不重生成页面。
3. **D7-F01 Agent-native Presence（无 chat input）** — 墨痕短句 + IntentGuide 收口层 + AgentPromptSurface。
4. **坐标系诚实分离（GCJ-02 / WGS-84 不并入、不换算；"历史视觉资产=0"；"宁可抽象不画编出来的河"）** — AP-09 ABSENT 的核心资产，Reconstruction 必须保留。
5. **D5-F01 / D6 Evidence-on-Demand 闸门逻辑** — 片段级放行/禁用能力本身正确，仅其"呈现词汇"需人话化（见 §10/§11）。

---

## 10｜RECOVER Inventory（已存在能力，未正确暴露 → 优先恢复）

1. **`?inspector=1` DEV 门控模式**（EXP-0001 §5，已用于 replan-card / IntentGuide 内部标签）— 应复用于 transition-hint、narrative 徽章、冲突标签、Discovery 公式、GPS 子标签，使默认人类 UI 隐藏技术词汇、DEV 模式仍可见。
2. **`LEVEL_LABELS` / `SPATIAL_MODE_LABELS` / `ACTION_LABELS`**（experience-runtime.ts）— 内部枚举已存在；需一套"人类可感知标签集"（如 可用片段→可引用 / 禁用片段→存疑 / 受约束片段→有条件可用），而非删除闸门逻辑。
3. **D6-F04 今貌照片资产** — 3 张 Commons 照片（Wan'anqiao.jpg / Yihaosi_Yizhi.jpg / Pujiqiao_(Jinze).jpg）资产存在（curl 200），只需修复运行时直连加载可靠性；非资产缺失。

---

## 11｜RECONSTRUCT Boundary（下一任务必须修 / 明确不修）

**必须修（最小 Reconstruction）：**
- 默认 UI 移除 / 隐藏技术元数据词汇：transition-hint 调试条、narrative epistemic/闸门徽章、冲突裁决状态标签、Discovery 伪公式、6 位 GPS 子标签（复用 `?inspector=1` 门控 + 人类标签集）。
- 目标：默认人类 UI 只呈现"地方 / 视觉 / 问题 / 关系 / 证据人话"，技术词汇仅在 `?inspector=1` 出现。

**明确不修（Scope Firewall）：**
- 不重写 ExperienceState / Composition / SurfaceRegistry / Renderer 架构（结构已合规）。
- 不新增古镇、不扩 GIS Track / Data Factory / 商业化 / 账号社区。
- 不补 M4 D1（culturalEvents / meaningCandidates 未进渲染层）、D3（颐浩寺 1288/1295 未上轴）、O1（文案密度）作为本审计范围——它们是可被真实暴露的观察点，属后续独立任务，不得借 Audit 扩 scope。
- 不逐像素复刻 Canonical PNG、不输出新设计稿、不写 Reconstruction code。

---

## 12｜REMOVE List

1. **D1-F01** `exp-transition-hint` 常驻调试条（默认 UI 移除，移入 `?inspector=1`）。
2. **D6-F01** narrative `unit__badge` 内部 epistemic/闸门词汇（默认 UI 改为人类标签或隐藏）。
3. **D6-F02** ConflictCompareSurface 内部裁决状态标签（静默裁决：ineligible / 并列比较：eligible）。
4. **D6-F03** DiscoverySurface 伪公式 `<code>Evidence(A)+…</code>`。
5. **D4-F02** CurrentMapSurface 6 位小数原始 GPS 子标签（保留地图几何 + 诚实坐标系 banner）。

---

## 13｜DEFER List

1. **D6-F04 今貌照片运行时加载可靠性** — 资产存在，沙箱直连空白属环境限制；生产加载可靠性验证延后，不阻断 Canonical Baseline 验收。
2. **M4 D1 / D3 / O1 观察点** — 由后续独立任务处理，不在本 Audit / 最小 Reconstruction scope（见 §11 明确不修）。
3. **轴 A 进 decideEvidence（M4 D2）** — 独立数据/证据任务，不借 UI Audit 扩 scope。

---

## 14｜P1 / P2 / P3 Readiness Assessment

仅评估 readiness / 阻碍，不伪造尚未进行的 Round B 人类回答（AT-09）。

- **P1 重新看见今天** — *Readiness：结构具备（s07 回今天 + 3 张今貌照片 + "现在，再看一次它们"）；阻碍：默认 UI 技术元数据泄露（D1-F01 / D6 / D4-F02）削弱"回到当下"的沉浸与留白，使首屏与回归幕读起来像调试构建。Reconstruction 移除泄露后即满足。*
- **P2 与我有关** — *Readiness：部分成立（追问："那我现在去现场可以看什么" 提供现场行动指向）；阻碍：无结构性缺口，仅需在 Reconstruction 后由 Human Tester 在 Round B 确认"与我有关"是否成立。*
- **P3 继续行动** — *Readiness：成立（追问链 + 看事实 / 了解更多 + Follow-up Replan 连续）；阻碍：无。*

**结论**：P1/P2/P3 的条件（结构、组件、追问链）均已存在于当前 Runtime；当前唯一削弱 P1 沉浸的是技术元数据泄露，属可 Reconstruction 修复的阻碍，非能力缺失。

---

## 15｜Architecture Reconciliation

- **架构候选登记（Architecture Candidate Registry, C1/C2）**：本审计**未新增**任何架构候选；C1/C2 维持 CANDIDATE ONLY / NO TASK / NO MIGRATION。
- **与现有架构一致**：ExperienceState→CompositionState→surfaceRegistry→Renderer 链路本身合规（M4-CLOSURE PASS + D3/D4/D7/D9 KEEP）。Drift 不要求架构变更，仅要求 Surface/Styling 层对"人类可见词汇"的一致性门控。
- **复用而非新建**：`?inspector=1` 门控 + `LEVEL_LABELS` 已存在，Reconstruction 是"扩展门控覆盖范围 + 增加人类标签集"，非新机制。

---

## 16｜Plan Reconciliation

- **M5 状态保持**：CURRENT / HOLD；本 Audit 不继续 Round B（H1–H10 NOT RUN），不启动 M6。
- **NEXT 对齐 Roadmap**：Roadmap NEXT = 本 Drift Audit（EXP-UI-GOV-01A NEXT）。Audit 结论 `PASS_TO_EXPERIENCE_UI_RECONSTRUCTION_PLANNING` 与 Roadmap 允许的最小 Reconstruction 路径一致。
- **禁止扩 scope**：不触发第二古镇 / GIS / Data Factory（见 §11）。

---

## 17｜Remaining Unknowns / Risks

1. **Human Tester Round B 未运行** — P1/P2/P3 的"真实人类感受"结论须 Round B 给出；本审计只证明"结构/条件已具备 + 唯一削弱项可修复"，不替代人类评分（AT-09）。
2. **沙箱网络限制** — 截图内 Commons 照片空白系沙箱直连限制，不代表生产加载失败；D6-F04 归 DEFER 以待生产验证。
3. **人类标签集措辞未定** — §10/§11 要求"可用片段→可引用"等人类标签，具体措辞属 Reconstruction Task 的设计决策，不在本诊断 scope。
4. **M4 D1/D3/O1 仍为空观察点** — 它们是真实暴露点，但明确不属本 Audit scope，须 Architect 另行签发。

---

## 18｜Gate Recommendation

**`PASS_TO_EXPERIENCE_UI_RECONSTRUCTION_PLANNING`**

判定依据（满足 PASS 条件）：
- Runtime 已实际启动并观察（非仅旧录像），取证齐备（AT-02 ✅）。
- 九域全部有结论与证据（AT-03 ✅）；Anti-pattern 全部 PRESENT/ABSENT/PARTIAL（AT-04 ✅）。
- 所有 MAJOR/BLOCKING Finding 至少追到一个实现层原因（AT-05 ✅，§07）。
- 所有 Finding 使用五类分类（AT-06 ✅）；KEEP / RECOVER / RECONSTRUCT / REMOVE / DEFER 边界明确（AT-07/AT-08 ✅，§09–§13）。
- P1/P2/P3 仅评估 readiness，未伪造 Round B 回答（AT-09 ✅）。
- Drift 定位到可执行层（Styling/Surface），边界清晰，存在可复用 `?inspector=1` 门控模式 → 可由 Architect 签发最小 Reconstruction Task。

> 非 `HOLD_FOR_AUDIT_CORRECTION`（证据充分、分类完整、根因已追清）；非 `BLOCKED_BY_RUNTIME_ACCESS`（Runtime 已成功启动观察）。

---

## 19｜Commit / Working Tree / STOP

- **本任务允许新增/修改（Scope Firewall §16）**：本 Task Book、Result、Drift Map、Audit evidence、`CONTEXT.md` / `CURRENT_TASK.md` 最小状态指针。
- **禁止纳入 Git**：Audit 过程产生的临时 build/cache/browser artifacts（驱动脚本置于仓库外 `.workbuddy/tmp`，不 track）。
- **产品代码/UI/runtime/data/tests 零修改**（AT-10 ✅）。
- **commit 内容**：`tasks/EXP_UI_AUDIT_01_..._Task_Book_V1_0.docx` + `tasks/results/EXP-UI-AUDIT-01-result.md` + `tasks/results/EXP-UI-AUDIT-01-drift-map.md` + `tasks/results/EXP-UI-AUDIT-01-evidence/`。
- **working tree**：commit 后 clean（scope 外无残留）。
- **未启动**：UI Reconstruction、M5 Round B、M6（AT-12 ✅）。
- **STOP**：Audit 完成后立即 STOP，不自行修 UI，不因为某项 Drift 已明显就顺手修复；下一步由 Architect Review 本 Result 后另行签发 Reconstruction Task。
