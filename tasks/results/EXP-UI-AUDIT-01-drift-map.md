# EXP-UI-AUDIT-01 · Drift Map（逐 Finding 完整证据结构）

> 配套 `EXP-UI-AUDIT-01-result.md`。每项 Finding 含强制字段：Observed Runtime → Runtime Evidence → Canonical Expectation → Drift Type → Severity → Root Cause Layer → Why It Matters → Reconstruction Implication → Dependencies/Risk。
> 所有结论基于实际启动的 Runtime 取证（`tasks/results/EXP-UI-AUDIT-01-evidence/`），非旧录像推断。

---

## D1-F01 · 首屏常驻调试条泄露 recipe + 主角变量

- **Observed Runtime**：首屏（s01）右下常驻一行小字 `IMMERSIVE_SPATIAL · 主角=current_map`，灰绿色 11px，位于视口内（inViewport=true），与"当前地理空间 · GCJ-02 原值"地图并列呈现。
- **Runtime Evidence**：`state-01-first-screen.json` → `transitionHint:{text:"IMMERSIVE_SPATIAL · 主角=current_map", inViewport:true}`；`ExperienceShell.tsx:307` `<span className="exp-transition-hint" …>{composition.recipe} · 主角={primaryType ?? composition.fallback ?? "fallback"}</span>`；`experience.css:141` `.exp-transition-hint`（无 `?inspector` 门控）。
- **Canonical Expectation**：Baseline §4（Hook Today 首屏应是地方/视觉/问题）、§5（Visual Hierarchy 第一 10 秒主视觉优先）、§13.1（内部枚举"通常不在默认用户界面"）；Canonical Grammar PNG（Space Before Text）。
- **Drift Type**：REMOVE
- **Severity**：BLOCKING（直接造成"首屏先看到系统状态而非地方"，是 M5 Round-A Human FAIL SIGNAL 的首要可执行根因）
- **Root Cause Layer**：Styling + ExperienceShell
- **Why It Matters**：用户进入体验的第一眼被内部 recipe 名 + 主角变量抢占，破坏"进入现场"的沉浸；使成品读起来像调试构建。
- **Reconstruction Implication**：将 transition-hint 移入 `?inspector=1` DEV 门控（复用 replan-card / IntentGuide 既有模式），默认人类 UI 不显示。
- **Dependencies / Risk**：依赖既有 `?inspector=1` 门控机制（已存在）；无新数据/架构依赖。

---

## D2-F01 · One-Moment-One-Focus 成立（KEEP）

- **Observed Runtime**：每个 Moment 仅一个 `primaryTestId` 主表面（surface-current-map / surface-relational-space / surface-timeline / surface-discovery…），Canvas 主导。
- **Runtime Evidence**：`state-01` primaryTestId=surface-current-map；`state-03` primaryTestId=surface-relational-space；`state-08` primaryTestId=surface-discovery。
- **Canonical Expectation**：Baseline §3 G1 / §4；Canonical Grammar PNG（One Moment One Focus）。
- **Drift Type**：KEEP
- **Severity**：—（合规）
- **Root Cause Layer**：Composition / Surface
- **Why It Matters**：证明体验主干符合 Canonical，偏差不在焦点结构而在焦点周边的技术噪声（并入 D1/D4/D6）。
- **Reconstruction Implication**：保持；后续 Reconstruction 不得为视觉改造破坏单主焦点。
- **Dependencies / Risk**：无。

---

## D3-F01 · 五幕以认知节奏表达，非五个面板（KEEP）

- **Observed Runtime**：状态机进度 `Beat 1/5 · 1/8` → `Beat 5/5 · 8/8`；5 幕标签：进入现场 / 时间·空间转换 / 关系发现 / 证据与时间变化 / 回到今天·下一个问题。
- **Runtime Evidence**：`beats.ts:124 BEATS[]`（beat-01-hook … beat-05-return-next，5 项）；`state-01` progress="Beat 1/5 · 1/8"；`state-08` progress="Beat 5/5 · 8/8"。
- **Canonical Expectation**：Baseline §4 五幕契约（Hook Today→Shift→Relation Discovery→Evidence & Change→Return & Next Question）；AP-08（Five Beats as Five Panels = ABSENT）。
- **Drift Type**：KEEP
- **Severity**：—（合规；本审计"Runtime 结构正确"的决定性证据）
- **Root Cause Layer**：Composition / beats
- **Why It Matters**：确认工程链路闭合后体验节奏本身合规；偏差不在此层。
- **Reconstruction Implication**：保持五幕节奏表达；不改为五面板。
- **Dependencies / Risk**：无。

---

## D4-F01 · Agent 判断→可感知世界重组（KEEP）

- **Observed Runtime**：s01 当前地图 → s02 时间/空间转换 → s03 关系拓扑（桥—水—桥骨架）→ s04 寺进入 → s06 时间轴 lifeline；世界随判断重组，非文字解释状态。
- **Runtime Evidence**：`state-03` spatialMode="关系历史空间（无坐标）" + canvasText 拓扑骨架；`SpatialSurfaces.tsx` RelationalSpaceSurface / CurrentMapSurface / ApproximateAreaSurface / HistoricalMapNativeSurface。
- **Canonical Expectation**：Baseline §4（Show→Question→Reveal）、G4（Agent-Changes-the-World）；Canonical Grammar（Relation Discovery 靠空间重组而非文字）。
- **Drift Type**：KEEP
- **Severity**：—（合规）
- **Root Cause Layer**：Surface
- **Why It Matters**：证明 Agent-native 世界变化成立，是 Canonical 核心体验能力。
- **Reconstruction Implication**：保持。
- **Dependencies / Risk**：无。

---

## D4-F02 · 当前地图暴露 6 位小数原始 GPS 子标签

- **Observed Runtime**：当前地图每座桥旁标注 `120.919639, 31.039508` 等 6 位小数坐标；坐标系诚实分离（GCJ-02 vs WGS-84 分列登记、不并入、不换算）保留。
- **Runtime Evidence**：`SpatialSurfaces.tsx:123 sub:\`${pair.a.toFixed(6)}, ${pair.b.toFixed(6)}\``；`state-01` canvasText 含 `120.919639, 31.039508` / `120.920423, 31.033940`。
- **Canonical Expectation**：Baseline §13.1（坐标/枚举通常不在默认 UI）；§5（视觉主次、留白）；诚实坐标系 banner 本身符合 AP-09（Fake Historical Precision = ABSENT），但原始 GPS 字面量属技术元数据泄露。
- **Drift Type**：REMOVE
- **Severity**：MODERATE（坐标系诚实分离 KEEP，仅原始字面量需移除）
- **Root Cause Layer**：Surface / Styling
- **Why It Matters**：6 位 GPS 子标签与桥名并列，破坏 Space Before Text 与留白；但地图几何与诚实坐标系 banner 必须保留。
- **Reconstruction Implication**：移除 `toFixed(6)` 字面量子标签；保留地图点几何 + "本图坐标系 GCJ-02（原值，零换算）"诚实 banner。
- **Dependencies / Risk**：无新数据依赖；保留坐标权威诚实呈现。

---

## D5-F01 · Progressive Reveal / Space Before Text 成立（KEEP）

- **Observed Runtime**：证据按需展开（"展开这一刻的证据（还有 3 条未显示）"），Show→Question→Reveal 成立；Canvas 先于文字理解。
- **Runtime Evidence**：`state-03` secondary="证据按需出现 · 不一次铺满"；`EvidenceNarrativeSurfaces.tsx` fragment gates。
- **Canonical Expectation**：Baseline §5（Progressive Reveal、Space Before Text）；AP-05（Text-first History = ABSENT）。
- **Drift Type**：KEEP
- **Severity**：—（合规）
- **Root Cause Layer**：Surface / Evidence
- **Why It Matters**：证明 reveal 机制正确，偏差仅在 reveal 内呈现的词汇（并入 D6-F01）。
- **Reconstruction Implication**：保持 reveal 机制；仅人话化其徽章词汇。
- **Dependencies / Risk**：无。

---

## D6-F01 · 证据单元渲染内部 epistemic / 闸门徽章（可用片段/禁用片段/受约束片段…）

- **Observed Runtime**：关系发现幕每证据单元渲染 `unit__badge`：可用片段 / 禁用片段 / 受约束片段 / `AD-05 U10 禁用：仅非权威转载，无官方文号，不得作为事实` / 开放问题 / 有据事实。
- **Runtime Evidence**：`state-03-relation.json` units[] 含上述 badge；`ExperienceShell.tsx:334-335` `<span className="unit__badge">{LEVEL_LABELS[u.level]}</span>`；`EvidenceNarrativeSurfaces.tsx:339`；`SpatialSurfaces.tsx:289`；`LEVEL_LABELS` 来自 `packages/experience-engine/src/experience-runtime.ts`。
- **Canonical Expectation**：Baseline §13.1（epistemic_status 枚举"通常不在默认用户界面"）；AP-07（Technical Metadata Dominance = PRESENT）。
- **Drift Type**：REMOVE
- **Severity**：BLOCKING（每证据 reveal 均泄露内部闸门词汇，是 AP-07 主漂移；直接削弱 Evidence 沉浸与可信感）
- **Root Cause Layer**：Surface + Styling + Content
- **Why It Matters**：用户读到的不是"证据"，而是内部审稿/闸门术语；闸门逻辑本身正确，仅呈现词汇需人话化或隐藏。
- **Reconstruction Implication**：默认 UI 用人类标签集（可用片段→可引用 / 禁用片段→存疑 / 受约束片段→有条件可用 / 开放问题→未决 / 有据事实→已证），或移入 `?inspector=1`；保留片段级放行/禁用能力本身。
- **Dependencies / Risk**：依赖 `LEVEL_LABELS` 既有枚举（可派生人类标签集）；无需新数据。

---

## D6-F02 · 冲突比较面暴露内部裁决状态标签

- **Observed Runtime**：冲突比较面渲染状态条 `静默裁决：ineligible` 与 `并列比较：eligible`（tag 样式）。
- **Runtime Evidence**：`EvidenceNarrativeSurfaces.tsx:443-444` `<span className="tag tag--unresolved">静默裁决：ineligible</span><span className="tag tag--confirmed">并列比较：eligible</span>`（其 footer 亦含 `双值并存 · 静默裁决：ineligible`）。
- **Canonical Expectation**：Baseline §13.1（内部裁决/枚举不在默认 UI）；AP-07（PRESENT）。
- **Drift Type**：REMOVE
- **Severity**：MAJOR
- **Root Cause Layer**：Surface
- **Why It Matters**：把 Runtime 内部 adjudication 状态直接当 UI 标签，用户看到的是系统内部决策而非证据双值本身。
- **Reconstruction Implication**：默认 UI 移除裁决状态标签，仅呈现"两说并存、由你判断"的人话；内部裁决状态保留于 `?inspector=1`。
- **Dependencies / Risk**：无新数据依赖。

---

## D6-F03 · Discovery 面渲染伪公式 `<code>Evidence(A)+…</code>`

- **Observed Runtime**：s08 下一问题幕 primary 文本含 `Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C interpretation)`。
- **Runtime Evidence**：`EvidenceNarrativeSurfaces.tsx:501` `<code>Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C interpretation)</code>`；`state-08-s08.json` primary 含该句。
- **Canonical Expectation**：Baseline §13.1（系统内部记号不在默认 UI）；AP-07 / AP-01（系统自我解释）。
- **Drift Type**：REMOVE
- **Severity**：MAJOR
- **Root Cause Layer**：Surface + Content
- **Why It Matters**：用系统记号向用户解释"证据不等于叠加解读"，是典型技术元数据 dominance；应改为人话句子。
- **Reconstruction Implication**：默认 UI 以人话呈现（如"三条证据各自成立，合起来怎么解读，还需要独立判断"）；伪公式移入 `?inspector=1`。
- **Dependencies / Risk**：无新数据依赖。

---

## D6-F04 · 今貌照片资产存在、运行时直连空白（RECOVER / DEFER 边界）

- **Observed Runtime**：s07b 今貌照片面三张 caption + `CC BY-SA 3.0 来源` 均渲染，但图像在沙箱空白。
- **Runtime Evidence**：`state-07b-photo.json` primary 含三桥 caption + 来源；`EvidenceNarrativeSurfaces.tsx:552,588 commonsDirectUrl` 直连 Wikimedia；资产经 curl 验证 Wan'anqiao.jpg / Pujiqiao_(Jinze).jpg 返回 200，Yihaosi_Yizhi.jpg 经 API 确认存在（标题规范化 "Yihaosi Yizhi.jpg"）。
- **Canonical Expectation**：Baseline §10.2（Missing Asset ≠ Experience Failure：照片空白 ≠ 资产缺失）。
- **Drift Type**：RECOVER（资产存在，修运行时加载即可）
- **Severity**：MODERATE（DEFER 边界：加载可靠性非 Canonical Baseline 阻断项）
- **Root Cause Layer**：Asset + Runtime
- **Why It Matters**：澄清"空白卡"是沙箱直连限制，非资产缺失；避免误判为数据缺口而扩 scope。
- **Reconstruction Implication**：验证生产环境直连/代理加载可靠性；不在本 Audit scope 内强制修复。
- **Dependencies / Risk**：依赖 Wikimedia 可达性；生产验收待 Round B / 线上确认。

---

## D7-F01 · Agent-native Presence 无 chat input（KEEP）

- **Observed Runtime**：墨痕短句（"墨痕先看它们和水的关系。把寺也放进来。"）+ IntentGuide（人类可感知收口层，无内部 label）+ AgentPromptSurface；默认模式不显 replan-card 内部 label（`?inspector=1` 才显）。
- **Runtime Evidence**：`IntentGuide.tsx`（EXP-0001 收口，内部 label 仅 `?inspector=1`）；`ExperienceShell.tsx:419` `{devInspector && … replan-card}`；`AgentPromptSurface`（KEEP）。
- **Canonical Expectation**：Baseline §7（MoHen Presence：Ambient/Guide/Dialogue）；AP-06（Chat-first Agent = ABSENT）。
- **Drift Type**：KEEP
- **Severity**：—（合规）
- **Root Cause Layer**：Agent Presence
- **Why It Matters**：证明去掉 chat input 后用户仍能从世界重组感知墨痕；不退化成 Chat-first / Inspector-first。
- **Reconstruction Implication**：保持；门控模式可供 D1/D6 复用。
- **Dependencies / Risk**：无。

---

## D8-F01 · Present-day Connection（P1/P2/P3）条件具备（KEEP）

- **Observed Runtime**：s07 回到今天 + 3 张今貌照片 + "现在，再看一次它们"；追问链含"那我现在去现场可以看什么"（P2）、看事实/了解更多（P3）。
- **Runtime Evidence**：`state-07` return-to-present；`state-07b` 照片；`state-08` 追问 prompts。
- **Canonical Expectation**：Baseline §4（Return & Next Question）；P1 重新看见 / P2 与我有关 / P3 继续行动。
- **Drift Type**：KEEP（readiness 见 result §14）
- **Severity**：—（结构具备；唯一削弱 P1 的是 D1/D6 泄露，属可修复阻碍）
- **Root Cause Layer**：Composition / Surface
- **Why It Matters**：P1/P2/P3 的条件已存在于 Runtime，无需新能力；仅待 Reconstruction 移除泄露 + Round B 人类确认。
- **Reconstruction Implication**：保持结构；Reconstruction 后由 Human Tester 在 Round B 实测 P1/P2/P3。
- **Dependencies / Risk**：依赖 Round B 人类评分（未运行）。

---

## D8-F02 · 技术元数据泄露削弱 P1 沉浸（REMOVE，并入 D1/D6）

- **Observed Runtime**：回到今天幕与首屏同样受 transition-hint / GPS 子标签 / 徽章噪声影响。
- **Runtime Evidence**：同 D1-F01 / D4-F02 / D6-F01。
- **Canonical Expectation**：Baseline §4（Return to Present 应是干净的"回到当下"）。
- **Drift Type**：REMOVE（MODERATE，作为 D1/D6 的跨域影响）
- **Severity**：MODERATE
- **Root Cause Layer**：Styling / Surface
- **Why It Matters**：回归幕的沉浸被调试噪声削弱，是 P1 体验未达成品感的直接原因。
- **Reconstruction Implication**：随 D1/D6 REMOVE 一并解决。
- **Dependencies / Risk**：无。

---

## D9-F01 · Follow-up / Replan 保持连续（Patch-not-Replace，KEEP）

- **Observed Runtime**：s08 discovery → s08b inspect_evidence → s08c propose_present_action → s08d return-to-present，空间/时间/叙事连续；replan-card 仅 `?inspector=1`。
- **Runtime Evidence**：`ExperienceShell.tsx:419` replan-card `devInspector` 门控；`state-08b/08c/08d` 连续进度 `Beat 5/5`。
- **Canonical Expectation**：Baseline §4（Return & Next Question）；EXP-0001 §5（patch-not-replace）。
- **Drift Type**：KEEP
- **Severity**：—（合规）
- **Root Cause Layer**：Composition / Continuity
- **Why It Matters**：证明 Follow-up 不重生成页面/卡片堆，连续性成立。
- **Reconstruction Implication**：保持。
- **Dependencies / Risk**：无。

---

## Drift Map 索引（按 Classification）

- **KEEP（保护，不得破坏）**：D2-F01、D3-F01、D4-F01、D5-F01、D7-F01、D8-F01、D9-F01
- **REMOVE（默认 UI 移除/隐藏技术元数据）**：D1-F01、D4-F02、D6-F01、D6-F02、D6-F03、D8-F02
- **RECOVER（已存在能力，修暴露/加载）**：D6-F04
- **RECONSTRUCT**：无（结构已合规，仅 Surface/Styling 词汇门控；见 result §11 边界）
- **DEFER（不阻断 Baseline）**：D6-F04 加载可靠性、M4 D1/D3/O1、轴 A 进 decideEvidence（M4 D2）

## Top Blocking / Major（≤5，用于简报）

1. **D1-F01**（BLOCKING）— 首屏常驻调试条 `IMMERSIVE_SPATIAL · 主角=current_map`
2. **D6-F01**（BLOCKING）— 证据单元内部 epistemic/闸门徽章（可用/禁用/受约束片段…）
3. **D6-F02**（MAJOR）— 冲突面内部裁决状态标签（静默裁决：ineligible）
4. **D6-F03**（MAJOR）— Discovery 伪公式 `<code>Evidence(A)+…</code>`
5. **D4-F02**（MODERATE→列示）— 当前地图 6 位小数原始 GPS 子标签
