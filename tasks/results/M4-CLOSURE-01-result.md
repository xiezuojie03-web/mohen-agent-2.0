# M4-CLOSURE-01 Result — M4 Integration Closure Audit

- 模式: READ-ONLY PRODUCT AUDIT · Phase II / M4 · Architect-authorized
- Governance Baseline: `fef5aae`（GOV-SYNC-02 PASS/CLOSED）
- Engineering Regression Baseline: `7f786c9`（ENG-GOV-01 PASS/CLOSED）
- M4.1 Runtime Integration Baseline: `8391815`（EXP-CULTURAL-03 PASS/CLOSED）
- 日期: 2026-09-25

---

## 01 Executive Verdict

**M4 Integration Closure 成立：PASS_TO_M5。**
Canonical Integration Chain（Cultural World → Projection → WorldEvidenceState → Agent Judgment/ExperienceAction → CompositionState → Surface/Renderer → Canonical Five-Beat）逐层验证成立，全部有 repo evidence。重点审计项 **Timeline legacy path 裁决 = KEEP_COMPATIBILITY_PATH**（详见 §05）：`TimelineSurface` 消费 legacy `SliceShape.changes` 与 008 `culturalEvents` 语义一致、无矛盾、不绕过任何 Firewall，且冲突值由同 Beat 的 ConflictCompareSurface preserved_open 呈现——不构成 M4 blocker。**Blocker 数量 = 0**；发现 3 项 NON-BLOCKING DEBT、2 项 FUTURE CANDIDATE、3 项 OBSERVATION。M5 Human Experience Validation 可在不先施工新功能的情况下开始（仍须 Architect 另行签发 Task）。

## 02 Context / Baseline Gate

- L1 = `governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx`（§6.4 含 Canonical Repository Directory Map）；L2 = `governance/MoHen_Agent_2.0_PHASE-II_Execution-Plan_V1.1.docx`（M4-C 条款：「Timeline legacy path 是待审项，不是自动施工项。Audit 若无 blocker → PASS_TO_M5；若有 blocker → 只签最小 calibration」）；Candidate Registry = `governance/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`。均从仓库实读。
- CONTEXT.md / tasks/CURRENT_TASK.md：NO ACTIVE CONSTRUCTION TASK；M4 CURRENT；NEXT = 本审计。
- specs：EXPERIENCE_CONTRACT（ExperienceState 字段、CompositionState 单主角、ExperienceAction V0.1 冻结集、渐进揭示、历史视觉禁令）、FOUNDATION、OWNERSHIP_MAP（含 GOV-SYNC-02 补充规则）。decisions：ADR-002（四套认识论状态正交，六值恒 SUPPORTED_CANDIDATE 不升级）。
- Baseline Gate：EXP-CULTURAL-02-result（M3.3 Contract PASS）、EXP-CULTURAL-03-result（M4.1 Runtime Integration PASS / Human Experience NOT YET RUN）、ENG-GOV-01-result（9 failures 全解，全量 253/253）、GOV-SYNC-02-result。
- **工程 baseline 可信性**：`git diff --name-only 7f786c9..fef5aae -- apps packages pipelines supabase data tests` = **0 文件**——两个治理 commit 未触碰任何产品/测试/数据，253/253 baseline 未被后续 product change 破坏（按 Task Book §06-6 不重复长耗时测试）。

## 03 Canonical Integration Chain Trace

| 层 | 机制（repo evidence） | 判定 |
|---|---|---|
| ① Cultural World → Projection | `page.tsx` 服务端读冻结 `jinze-cultural-world-008.json`（008 seed 的确定性只读副本）→ `ExperienceShell` prop `culturalSource` → `projectCulturalWorldState()` 纯函数投影：9 events / 8 claims / 2 meanings / 2 presents / 16 fragments / 1 conflict | ✓ 真进入 projection，非仅存 DB |
| ② → WorldEvidenceState | `beats.ts buildWorldEvidenceState(…, projection)`：注入 `culturalEvents` / `evidenceFragmentGates` / `meaningCandidates` / `presentConnections`；`relationEvidence[].epistemicStatus` 轴 A 按 `subject\|predicate\|object` join（8/8）；conflicts = script T11-C1/C2 + 008 preserved_open 双值 | ✓ |
| ③ → Agent Judgment / ExperienceAction | runtime reducer = engine `createRuntimeState`（`ExperienceShell.tsx:108`）；追问走真实 `dispatch({type:"FOLLOWUP_REPLAN"})` → `evidence-aware-replan.ts` `decideEvidence` 消费 `world.relationEvidence`（E1/E2 + basis）；动作集 = `experience-engine/src/index.ts` 冻结 ExperienceAction + runtime NEXT/PREV/OPEN_EVIDENCE/CLOSE_EVIDENCE/TRIGGER_FOLLOWUP/FOLLOWUP_REPLAN/RETURN_TO_PRESENT/RESTART，Shell `onAction` 无旁路动作（reveal/override 皆为 presentation 层，override 仍受 isEligible 过滤） | ✓ |
| ④ → CompositionState | engine `composition-recipes.ts`（5 冻结 recipe）+ `selectSurfaces`；`ExperienceShell.tsx:139-155`：primary 只从 eligible 链选（preference 只是排序不是许可证），fallback = UnknownGapSurface；secondary/context 退让、bespoke action_dock/agent_prompt 去重 | ✓ one-primary-focus |
| ⑤ → Surface / Renderer | `surfaceRegistry.tsx`：18 种 SurfaceType → 组件；ineligible → `resolveSurface` 返回 null → UnknownGap；`historical_map_georeferenced`/`historical_geometry`/`resolved_single_answer`/`historical_photo` 恒落 UnknownGap | ✓ |
| ⑥ → Canonical Five-Beat | `BEATS`（beats.ts:124-201）覆盖 s01–s08 全部 8 场景（`validateBeatCoverage`）；Beat 01 hook(current_map) → 02 TIME_SHIFT → 03 RELATION_DISCOVERY → 04 EVIDENCE_FOCUS(s05+s06) → 05 RETURN_TO_PRESENT(current_map/photo/discovery)；场景序列由 `NEXT` 状态机推进，转场表达 epistemic change（`coordinate-authority-lost` 由 replanPlan/场景级规则驱动） | ✓ 连续成立，非文字拼接 |

## 04 Five-Beat Integration Audit

| Beat | 主要证据（repo） | Living World 驱动证据 |
|---|---|---|
| beat-01 进入现场 | s01-today-hook；primary=current_map | 今天三对象（provider 点位来自 slice.current_sources，G3 已审） |
| beat-02 时间/空间转换 | s02-time-travel；TIME_SHIFT；「坐标退出本身是内容」 | coordinate-authority-lost 提示（`data-testid="coordinate-authority-lost"`） |
| beat-03 关系发现 | s03/s04；RELATION_DISCOVERY | 寺↔桥 E2 关联：`isCurrentAssociationOnly` + `TEMPLE_BRIDGE_NON_ANSWER`（不升 E1，ADR-002/§16 纪律） |
| beat-04 证据与时间变化 | s05 evidence-reveal + s06 change-through-time；s06 prefer timeline | **008 驱动**：fragment 闸门（usable×2 / forbidden×1 `data-has-fact="false"` / generic×13）、008 双值冲突卡（`conflict-008-pujiqiao-build-year-1265-1267`，preserved_open 不选边）、今日开放问题（U10 单一真源） |
| beat-05 回到今天 | s07/s08；RETURN_TO_PRESENT | current_map/photo 回今天；s08 追问四意图 → replan runtime |

## 05 Timeline Legacy Path Audit（重点项，§05 六问）

**Q1 TimelineSurface 在 Five-Beat 中的实际职责与位置？**
主表达偏好出现在：beat-02（TIME_SHIFT，primaryPreference 含 timeline）、beat-04 s06-change-through-time（`preferPrimaryByScene` 显式"让时间成为主角"）；用户行动「看时间变化」→ `setSurfaceOverride("timeline")`（仍受 isEligible 过滤，ExperienceShell:236）；Replan 意图 C（explore_temporal_change）targetSurface=timeline（evidence-aware-replan.ts:397）。eligible 条件 = `world.hasEvidencedChanges`（slice 有 ≥1 evidenced change；当前 4/5 条 evidenced）。体验职责：把三对象的 evidenced 生命线（含 unknown 占位）画成连续时间结构，右端=回到今天。

**Q2 `SliceShape.changes` 与 008 `culturalEvents` 语义是否冲突/遗漏/重复/错误？**
- **无矛盾**：逐值比对——颐浩寺 1260 创建 / 1938 毁 / 1992 原址重建、万安桥 1260–1264 创建 / 1342 加建廊亭、普济桥主值 1267：两数据源完全一致（008 events 为 `SUPPORTED_CANDIDATE`，slice time_hint 同值）。
- **遗漏（非矛盾）**：008 有颐浩寺 1288 建大雄宝殿、1295 升院为寺两事件，slice timeline 行未含（时间轴粒度较粗，s06 叙事单元 u3 亦未逐年列出）。影响丰富度，不影响正确性。
- **粒度差异（非矛盾）**：slice 有「万安桥亭阁废（年份无证据）」——008 无对应事件；TimelineSurface 对无年份 token 不落轴（parseTimeHint 无年→year=null），渲染为「不作时间断言」，不编造。
- **重复**：重叠事件在两条冻结数据路径各存一份（值一致）——见 §09 F1。

**Q3 legacy timeline 是否导致用户看到的时间信息与 Cultural World / Evidence / Meaning 不一致？**
否。用户在 beat-04 看到的时间值全部一致；普济桥 1265 冲突变体**没有被隐藏**——它作为 008 结构化冲突（CONFLICTED event + preserved_open conflict）在同一 beat 的 ConflictCompareSurface 以双值卡呈现（"两说着录并列保留：1267↔1265……墨痕不替你选边"），且 s06 叙事单元 u1–u4 明示每步的着录支撑与不采信项（如「开放为宗教活动场所」缺文号不采）。

**Q4 是否绕过 Evidence Gate / epistemic status / conflict presentation / uncertainty / present-return？**
否，四条均未绕过：
- **Evidence Gate**：timeline 只消费冻结 slice 的 changes（每条带 evidence_ids、evidence_count≥1，产生于 TASK-0010/0011 的 G0–G6 审计 + 人审链）；Surface 层零新增事实（"只对切片自带的 time_hint 做分类，不生成任何新的年代断言"，EvidenceNarrativeSurfaces.tsx:44）。
- **Epistemic/uncertainty**：金泽塘行渲染为斜纹「未知 · 不作时间断言」占位；「亭阁废（年份无证据）」不上轴；时间轴右端「今」即 present-return 结构终点，beat-05 回 current_map。
- **Conflict presentation**：不静默择一（1265 值在冲突卡 preserved_open）；TimelineSurface 自身展示主值 1267 与 008 primary_value 一致。
- **008 数据同样未被绕过**：008 的 forbidden fragment（u10）以 `fact=null` 禁用边界呈现，绝不形成正向事实；008 events 未在 gate 之外被任何 Surface 直接渲染。

**Q5 保持 compatibility path（不迁移），M5 Human Experience Test 是否仍能真实检验？**
能。用户体验到的时间信息 = evidenced 生命线 + 显式 unknown + 同 Beat 的双值冲突卡 + 开放问题，内部一致、可溯源、无脱节信息污染。M5 的 P1/P2/P3（重新看见今天 / 感到与我有关 / 产生行动意愿）检验的是体验是否成立，timeline 数据路径的实现来源不影响其检验真实性。已登记的 EXP-0001 文案残余（C 时间总结偏密集）属文案层，M5 会真实暴露它——这正是 M5 的职责。

**Q6 若判 BLOCKER，最小校准是什么？**
不适用（判 KEEP）。

**裁决：KEEP_COMPATIBILITY_PATH。** 依据 Task Book §03「Compatibility path ≠ blocker」与 L2 M4-C「Timeline legacy path 是待审项，不是自动施工项」：legacy path 不破坏冻结 Contract、不破坏 Evidence/Meaning Firewall、不破坏 Agent-native Experience、不破坏 Canonical Five-Beat。

## 06 Evidence / Conflict / Meaning / Present Connection Audit

| 008 对象 | 进入状态？ | 进入 Surface？ | evidence |
|---|---|---|---|
| events（9） | ✓ `world.culturalEvents` | **暂无直接消费者**（见 F2）；时间表达经 slice path 等值呈现 | beats.ts:93 |
| claims（8）→ 轴 A | ✓ `relationEvidence[].epistemicStatus`（8/8 join） | 证据检视显示 E 类与 basis；**轴 A 尚未进入 decideEvidence 判定**（F3） | beats.ts:49-53 |
| conflicts（1） | ✓ `world.conflicts` 追加 | ✓ ConflictCompareSurface 双值卡 | EvidenceNarrativeSurfaces.tsx:427-440 |
| fragments（16）→ gates | ✓ `evidenceFragmentGates` | ✓ EvidenceRevealSurface 证据片段闸门（forbidden fact=null） | :290-377 |
| presents（2）→ open_questions | ✓ `presentConnections` | ✓「今日开放问题」（只作问题，不进事实层） | :379-393 |
| meanings（2） | ✓ `world.meaningCandidates` | **暂无直接消费者**（F2） | beats.ts:95 |

结论：Evidence / Conflict / Present Connection 已真实驱动 Surface；Meaning 与 culturalEvents 已进状态层、未进渲染层——不违反任何 Contract（Contract 未承诺 M4 渲染全部六值字段），列为 DEBT 而非 blocker。

## 07 Agent-native Experience Architecture Audit

- Agent 判断经 `ExperienceState → ExperienceAction（冻结集）→ CompositionState → controlled surfaces` 表达：追问 → `FOLLOWUP_REPLAN` → `decideEvidence`（消费 relationEvidence，E2 永不升 E1）→ `ReplanPlan` → `IntentGuide` 收口（presentation 适配器，读 runtime state，不读冻结答案 JSON 冒充 runtime——TASK-0016 规则保持）。
- Patch-not-Replace：replan 视角为 patch 态（`replanViewActive`），`RETURN_TO_PRESENT` 只切回当下（保留 trail/plan），冻结 patch 结果卡在 replan 激活时让位。
- 无固定 chat/page flow 绕过：页面内无第二套动作系统；`onAction` 映射到冻结动作或 presentation 局部状态。

## 08 M4 Exit Criteria Matrix（对照 L2 V1.1）

| # | L2 Exit 条件 | 判定 | 证据 |
|---|---|---|---|
| 1 | M3 Projection Contract 被 M4.1 实现消费（非停留文档） | ✓ | `culturalWorldProjection.ts` + beats.ts 第 4 参 + 008 冲突/闸门/开放问题三处 Surface + cultural-world-projection.test.ts 11 用例 |
| 2 | Beat / Surface / Evidence / Asset / Gap mapping 足以支撑当前 slice | ✓ | surfaceRegistry 18 类型（含 unknown_gap 合法）；historical_photo/before_after 恒 blocked（historicalVisualAssets=0），缺口被诚实呈现 |
| 3 | Living Cultural World 驱动关键 Experience（非静态 UI copy） | ✓ | §06：冲突卡/闸门/开放问题/轴 A join 均由 008 投影驱动 |
| 4 | Evidence / Geometry / Uncertainty / Meaning Firewall 未回归 | ✓ | historical_geometry=0 冻结；forbidden fragment fact=null；unknown 占位；无静默裁决 |
| 5 | Agent-native 未被固定 chat/page flow 绕过 | ✓ | §07 |
| 6 | 工程 baseline 可信（253/253 @ 7f786c9） | ✓ | 7f786c9→fef5aae 产品目录 diff=0 |
| 7 | 无尚未处理的明确 M4 integration blocker | ✓ | §09：blocker=0 |

## 09 Findings Classification

**BLOCKER：无。**

**NON-BLOCKING DEBT：**
- **D1**：`culturalEvents` 与 `meaningCandidates` 已入 `WorldEvidenceState` 但无 Surface 消费者（时间语义经 slice path 等值呈现；Meaning 未进渲染层）。
- **D2**：轴 A 六值 `epistemicStatus` 已 join 进 `relationEvidence`（8/8）但尚未参与 `decideEvidence` 判定（类型已就位）。
- **D3**：颐浩寺 1288/1295 两事件在 timeline 行未呈现（008 有、slice 无）——丰富度缺口。

**FUTURE CANDIDATE（建议 Architect 考虑登记 Candidate Registry，本任务不登记、不施工）：**
- **C1**：Timeline 数据源统一（culturalEvents 驱动 timeline / 决策逻辑消费轴 A）——待真实触发（如 M5 暴露时间表达不足或第二簇 Cultural World 接入）后再立项。
- **C2**：slice.changes 与 008 events 双冻结投影的值一致性目前靠人工对齐（本审计逐值核验一致）——若未来任一侧变更，需要一致性守卫。

**OBSERVATION：**
- **O1**：EXP-0001 已登记文案残余（C 时间总结偏密集、explore 长文案退化）——M5 将真实检验。
- **O2**：L1 Roadmap 状态表「ENG-GOV-01 正在独立执行」一行滞后于实际（ENG-GOV-01 已 CLOSED）——属 L1 状态同步，归 Architect Plan Reconciliation，本任务无权修改。
- **O3**：TimelineSurface 的 experience 职责横跨 beat-02/beat-04/Replan-C 三处，均为同一 eligible 门（hasEvidencedChanges），行为一致。

## 10 M5 Readiness Boundary

- **M5 可以在不先施工新功能的情况下开始**：无 blocker；现实现即可承载真实 Human Experience Validation（Five-Beat 完整可走、四意图 replan 真实运行、证据/冲突/开放问题已由 Living World 驱动）。
- 本审计**不声称** Human Experience Gate 已 PASS；**未执行** Present-day Connection P1/P2/P3；**未用**代码测试代替真实 Human Experience Validation。
- M5 须由 Architect 另行签发 Task Book 后启动。
- 对 M5 的一个提示（非前置条件）：P1–P3 检验应包含时间叙事与证据收口的「人话」可感性——D1/D3 与 O1 恰好是 M5 最可能暴露的点。

## 11 Remaining Risks / Technical Debt

1. D1–D3（见 §09）：均为「已入状态、未进渲染/判定」的半程接入，风险方向是"用户感知不到 008 的部分增量"，不是"用户被误导"。
2. C2 双投影人工对齐：未来任一冻结 JSON 变更时需重新逐值核对（本审计的比对表可作基线）。
3. L1 状态行滞后（O2）：下一次 L1 Plan Reconciliation 时顺带修正。

## 12 Architecture Reconciliation

**NONE。** 未发现冻结架构 Contract 与实现冲突；无原则/边界/能力模型变化需要落 ADR。D1–D3、C1、C2 均不构成架构级待裁事项（C1/C2 建议走 Candidate Registry 登记流程）。

## 13 Plan Reconciliation

**NONE。** M4 Exit 条件逐项满足，Phase II / M4 → M5 顺序与 L2 V1.1 一致；M5 保持 LOCKED AFTER M4 CLOSURE，由 Architect 签发。O2（L1 状态行滞后）不改变 Milestone 顺序，不足以构成 Plan Reconciliation 事项。

## 14 Changed Files / Scope Audit

仅 §10 允许的最小治理记录变更：

| 文件 | 变更 |
|---|---|
| `tasks/CURRENT_TASK.md` | 指针：M4-CLOSURE-01 完成态 + NEXT=M5 pending |
| `CONTEXT.md` | 登记 M4-CLOSURE-01 = PASS/CLOSED + 审计结论 + NEXT |
| `tasks/M4-CLOSURE-01_M4-Integration-Closure-Audit_Task-Book_V1.0.docx` | tracked（本 Task Book，Architect 签发，未改内容） |
| `tasks/results/M4-CLOSURE-01-result.md` | 本文件（tracked） |

未修改：product code、tests、DB、schema、migration、seed、Cultural World data、Runtime、UI、GIS、L1/L2/ADR/specs。未执行 Timeline calibration，未启动 M5。

## 15 Gate Recommendation

**PASS_TO_M5** —— M4 Integration Closure 成立：Integration Chain 六层全通、Five-Beat 有真实 repo evidence、Firewalls 无回归、Agent-native 架构未被绕过、工程 baseline 可信、Timeline legacy path 判 KEEP_COMPATIBILITY_PATH（0 blocker）。M5 Human Experience Validation 待 Architect 另行签发 Task Book。

## 16 STOP

Result 完成、治理型 commit 完成，**立即 STOP**。不自行启动 Timeline calibration，不启动 M5。
