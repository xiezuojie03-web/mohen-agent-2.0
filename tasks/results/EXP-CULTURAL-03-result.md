# EXP-CULTURAL-03 Result — M4.1 Cultural World → Experience Projection Runtime Slice

- Task Book: `tasks/EXP-CULTURAL-03_M4.1_Cultural-World-to-Experience-Projection-Runtime-Slice_Task-Book_V1.0.docx`
- Track / Phase: Track E / Experience · Phase II / M4.1 · CONSTRUCTION
- Branch: `track/world-cultural-world-02` · Baseline: M3 Contract Baseline `0152e90`
- Date: 2026-09-25 · Executor: WorkBuddy（施工权，无架构裁决权）

---

## 01 Executive Verdict

**Runtime Integration PASS / Human Experience Gate NOT YET RUN。**

`jinze-min-001` 第一簇 008 cultural_* 已通过单一只读 Projection Reader 进入现有体验运行链路：
`008 cultural_* →（冻结只读投影副本）→ projectCulturalWorldState(sliceId, source) → WorldEvidenceState → 现有 Surface Eligibility / Composition / ExperienceAction → Canonical Five-Beat`。
六值轴 A 与 E1–E4 轴 B 正交并存；1265/1267 `preserved_open` 双值进入冲突面；fragment-level gate 进入证据抽屉（u10_forbidden 零正向事实出口）；U10 单一真源迁移至 `presentConnections.open_questions`；未新增 ExperienceAction / Surface / Runtime / schema / seed。真实 Cultural World 已成为体验输入，不再是 seed/verify 孤岛（AT-01）。

**不虚报**：本判定的证据为**自动化测试 + 真实投影驱动的运行链数据 dump**（§10）；浏览器级 Human Experience 验证未在本任务执行（M5 范畴），故 Human Experience Gate = NOT YET RUN。

## 02 Sources / Context Gate

按 Task Book §2 核实，全部在案：

| 来源 | 路径 | 核实结果 |
|---|---|---|
| Epistemic SOT | ADR-002 + `supabase/migrations/008_cultural_world_objects.sql` CHECK（line 40/68/99） | 六值 = SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION；INTERPRETIVE 仅属 expression tone（008 line 90/99-100） |
| Projection Contract | `tasks/results/EXP-CULTURAL-02-result.md` §03–§11（commit `0152e90`） | §05 五个新增最小共字段 + relationEvidence[].epistemicStatus 逐项落实 |
| Frozen contracts | EXPERIENCE_CONTRACT.md / surface-eligibility.ts / index.ts（ExperienceAction V0.1 十项） | 未改动语义；仅追加可选字段与类型（§03） |
| CW-02 第一簇 | 008 seed（`pipelines/cultural-world/seed-cw02-cluster.mjs`）+ `cw02-cluster-snapshot.json`（9/8/2/2/16/1） | 投影副本计数逐项一致 |
| Five-Beat heritage | `beats.ts` / `jinze-3min-experience-script.json` / composition-recipes | 仅按既定职责复用；未重写 grammar |

**Context Gate 裁定：无架构语义冲突 → 不触发 STOP（§15 全项核查通过，详见 §14/§15）。**

## 03 Changed Files / Scope Audit

| 文件 | 变更 | 授权依据（Task Book §10） |
|---|---|---|
| `packages/experience-engine/src/surface-eligibility.ts` | 新增 `SixValue`、`CulturalEventProjection`、`EvidenceFragmentGate`、`MeaningCandidateProjection`、`PresentConnectionProjection`、`WorldConflict` 类型；`RelationEvidence` 增可选 `epistemicStatus`（轴 A）；`WorldEvidenceState` 增 4 个可选投影字段 | experience-engine 最小实现与类型 ✔ |
| `apps/web/app/experience/jinze-water-net/culturalWorldProjection.ts` | **新增**：只读 `projectCulturalWorldState(sliceId, source)` + `fragmentGateDisplayItems()` + `presentOpenQuestions()` + `CulturalWorldProjectionSource` 类型 | 固定 slice 的最小 data-access/adapter ✔ |
| `apps/web/data/experience/jinze-cultural-world-008.json` | **新增**：008 第一簇只读投影副本（9 events / 8 claims / 2 meanings / 2 presents / 16 fragments / 1 conflict；UUID 与 seed `det()` 确定性一致） | 同上（读副本，非事实真源） |
| `apps/web/app/experience/jinze-water-net/beats.ts` | `buildWorldEvidenceState` 增可选第 4 参 projection：relationEvidence 补轴 A、conflicts 并入 008 双值冲突、透传 4 个投影字段；缺省行为与 M4.1 前逐字段一致（T-10） | Evidence/Conflict/Present 接通所必需 ✔ |
| `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx` | 增 `culturalSource` prop；`projectCulturalWorldState` memo；world 携带投影进入 ctx | 同上 ✔ |
| `apps/web/app/experience/jinze-water-net/page.tsx` | 服务端读冻结投影副本并传入 Shell | 同上 ✔ |
| `apps/web/app/experience/jinze-water-net/surfaces/EvidenceNarrativeSurfaces.tsx` | EvidenceRevealSurface 增「证据片段闸门」+「今日开放问题」两节；ConflictCompareSurface 增 008 双值冲突卡 | M4-S2/S3 ✔ |
| `apps/web/data/experience/jinze-3min-experience-script.json` + `data/exports/…`（gitignored 原件）+ `pipelines/experience/build-jinze-3min-experience.mjs` | s06-u4 最小对齐（同一句三处同步：构建器 → exports 原件 → 冻结副本，逐字节一致由既有测试守护） | §3.4/§6：U10 单一真源最小必要改动 ✔ |
| `tests/experience/cultural-world-projection.test.ts` | **新增**：T-01～T-10 + AT-09 支撑（11 用例） | 相关自动测试 ✔ |
| `tasks/results/exp-cultural-03-runtime-evidence.json` | **新增**：真实投影驱动的逐 Beat 运行链证据 dump | §8 Human-readable Runtime Evidence ✔ |
| `tasks/CURRENT_TASK.md` / `CONTEXT.md` | 最小治理指针切换 | 授权内治理指针 ✔ |

**未触碰**：008 schema/migration/seed、DB 数据、Runtime reducer、Surface Registry/SurfaceType、GIS、Agent 架构、Legacy、第二簇/第二镇。临时脚本（docx 抽取、投影 JSON 一次性生成器、运行链证据一次性 emitter）已全部删除，未入 commit。

## 04 Projection Reader Implementation

`projectCulturalWorldState(sliceId, source)`（`culturalWorldProjection.ts`）：

- **只读纯函数**：同入参恒同出参（T-01 断言 `toEqual` 幂等）；不回写 008、不复制成第二事实存储——入参是 008 的冻结只读投影副本（与 `jinze-historical-spatial-slice.json` 同性质：真源在 DB，副本只服务体验运行时）。
- **输出**（`CulturalWorldProjection`）：`culturalEvents`(9) / `evidenceFragmentGates`(16) / `meaningCandidates`(2, tone=INTERPRETIVE) / `presentConnections`(2) / `claimEpistemicByKey`(8 条 claim 的六值索引，键=`subject|predicate|object`) / `conflicts`(1 条双值 preserved_open)。
- **落点**：Task Book §3.1「buildWorldEvidenceState 邻近职责位置」——reader 与消费方同层放置；类型定义放 experience-engine（冻结契约的家）。
- **轴 A 接合**：`buildWorldEvidenceState` 用 `claimEpistemicByKey` 把 008 六值 join 到既有 `relationEvidence`（legacy SliceShape.relations 8 条与 008 claims 8 条 subject/predicate/object 一一对应，实测全命中）。

## 05 WorldEvidenceState / ExperienceState Integration

- `WorldEvidenceState` 新字段全部**可选**：未传 projection 时与 M4.1 之前逐字段一致（T-10 回归守护断言逐字段相等）。
- `conflicts` 类型扩展为 `WorldConflict[]`（ruling/topic 之外新增可选 primaryValue/conflictedValue/resolutionStatus/dualValue/source）；T11-C1/C2（脚本冲突）保持在前，008 双值冲突追加在后，互不挤占（T-03）。
- 既有 eligibility/selection/composition 消费路径零改动：`evaluateSurfaceEligibility` / `selectSurfaces` / `resolveComposition` 只读 `conflicts.length` 等既有字段，新字段对它们透明。
- `SurfaceContext.world` 携带全部新字段直达 Surface 层（组件不自行推断）。

## 06 Epistemic & Expression Firewall Verification

| 边界（Task Book §4） | 实现与验证 |
|---|---|
| 六值不压缩成 E1–E4 | T-02：8 条 relationEvidence 的 `epistemicStatus` 全部 ∈ 六值且全为 SUPPORTED_CANDIDATE；`epistemicClass` 保持 E1×6/E2×1/E3×1；E2 条目 axisA=SUPPORTED_CANDIDATE 与 axisB=E2 **并存**（正交实证）；断言轴 A 值不匹配 `/^E[1-4]$/` |
| E1–E4 仅形态学职责 | 轴 B 字段未被赋任何真值语义；无代码把六值改写为 E 值或反之 |
| CONFLICTED 显式双值 | T-03：`pujiqiao-build-year-1265-1267` primaryValue=1267 / conflictedValue=1265 / resolutionStatus=preserved_open / dualValue=true；1265 独立 event（epistemic_status=CONFLICTED）在 008 中保留，投影不静默择一 |
| RESEARCH_LEAD | 本簇无 RESEARCH_LEAD claim（008 实况）；投影层对六值不做任何语义改写， vocabulary 原样透传 |
| OPEN_QUESTION / U10 不事实化 | T-06：U10 字符串只存在于 `presentConnections.open_questions` 与 u10_forbidden 片段（禁用边界）；9 个事件标签、8 条 claim 键中「开放为宗教活动场所」零出现 |
| UNSUPPORTED 禁正向 | 本簇无 UNSUPPORTED；`fragmentGateDisplayItems` 对 u10_forbidden 强制 `fact=null`（同类防火墙机制） |
| Meaning→Fact 禁止 | T-05：tone=INTERPRETIVE 与 epistemic_status=SUPPORTED_CANDIDATE 分离；投影对象无 `fact` 字段；derived_from_claim_ids 非空（仅基于已支持 Claims） |
| PresentConnection 不反向污染 Fact | observed_state/open_questions 只进入 Drawer 呈现层，不参与 eligibility 判定、不生成任何事实单元 |
| currentCoordsLoseHistoricalAuthority | T-07：`hasHistoricalGeometry` 恒 false；`historicalMapSource.georeferenced/attributable` 恒 false；投影 JSON 零坐标（正则断言无经纬度数值、无 GCJ）；现代精确锚在场但不继承历史几何 |

## 07 Evidence Fragment Gate Verification

M4-S2：`EvidenceRevealSurface`（既有 OPEN_EVIDENCE/Evidence Drawer 载体，未新增 Surface）新增「证据片段闸门」节，消费 `fragmentGateDisplayItems(world.evidenceFragmentGates)`：

- **hr4_usable ×2**：`kind=usable`，携带 `usable_for_claim` 正向说明（如「颐浩寺 former_site_of 吕颐浩（HR-4）」），标注为受 claim 约束的可用片段；`data-has-fact="true"`。
- **u10_forbidden ×1**：`kind=forbidden`，`fact=null`（类型与测试双重强制），仅渲染「禁用片段 · 不作为事实」边界标记 + 禁用理由（`data-has-fact="false"`）——该片段在运行链路上**不存在任何正向事实出口**（T-04）。
- **generic ×13**：`kind=generic`，渲染 usage_note（claim/usage 约束说明）。

## 08 Conflict 1265/1267 Verification

M4-S3：`ConflictCompareSurface`（EVIDENCE_FOCUS 拍主角，实测 composition.primarySurface=conflict_compare）新增 008 双值冲突卡（`data-testid="conflict-008-pujiqiao-build-year-1265-1267"`）：

- 两值并列：**1267**（权威着录）↔ **1265**（冲突变体，Wikimedia Commons caption，内部朝代自相矛盾）；`resolutionStatus=preserved_open · 未裁决`；页脚「双值并存 · 静默裁决：ineligible」。
- 未为 UI 简化选择任何单一年份；T11-C1/C2 卡片原样保留（T-03 断言两者共存）。
- `resolved_single_answer` Surface 仍被 eligibility 恒判 ineligible（既有规则未动）。

## 09 PresentConnection / U10 Single-Source Verification

M4-S4 单一真源迁移（G-06 闭合）：

- **真源侧**：U10 详细口径「1992年开放为宗教活动场所（U10：仅非权威转载，无官方文号，不进事实层）」**唯一**存在于 008 投影 `presentConnections[site_vs_rebuilt].open_questions`。
- **表达侧**：`presentOpenQuestions(world)` 单一提取函数 → EvidenceRevealSurface「今日开放问题」节渲染（`data-testid="present-open-questions"`），只作为问题呈现。
- **脚本侧最小对齐**：s06-u4（FACT_LIMITED）改为「……本体验不将其作为事实呈现——权威口径只来自证据面板的『今日开放问题』（由遗址—今址记录单一提供）」。测试证明脚本 JSON **不再包含**「仅非权威转载」「U10：」「不进事实层」——U10 详细口径不在脚本中独立存在（T-09）。
- **三处同步**：构建器（build-jinze-3min-experience.mjs）→ exports 原件 → 冻结副本，逐字节一致（既有 renderer 测试 + `cmp` 实证）；重建脚本跑通且 script.json 判定 unchanged（= 构建输出与盘上一致）。
- 1992 口径不混同：1992 事实事件唯一为「颐浩寺原址重建寺院」（SUPPORTED_CANDIDATE）；「开放宗教活动场所」仅为 open question（T-06 / AT-08）。

## 10 Five-Beat Runtime Evidence

证据文件：`tasks/results/exp-cultural-03-runtime-evidence.json`（由真实投影驱动的 world 对象计算生成，非手写声明；一次性 emitter 已删）。摘要（World Object ID / Projection 字段 / 既有 Action / Surface）：

| Beat | 场景 | 实际消费的 World/Projection | 既有 Action（未新增） | 主 Surface（实测） |
|---|---|---|---|---|
| 1 进入现场 | s01-today-hook | `currentExactEntities`（pujiqiao/wananqiao 当前锚）；`culturalEvents(9)` 在场 | NEXT / 看事实（reveal） | current_map |
| 2 时空转换 | s02-time-travel | `relationEvidence(8)`：axisA=SUPPORTED_CANDIDATE + axisB=E1/E2/E3 并列；`hasHistoricalRelations=true`；坐标退出（历史几何恒 false） | NEXT / 看留下的关系 | relational_space |
| 3 关系发现 | s03/s04 | `claimEpistemicByKey`（008 claims×8）；E2 寺桥相邻不升 E1 | 把寺也放进来 / 寺与桥有关系吗 / 寺的位置有多确定？ | relational_space |
| 4 证据与变化 | s05/s06 | `conflicts`（T11-C1/C2 + **008 双值 1265↔1267 preserved_open**）；`evidenceFragmentGates(16: usable2/forbidden1/generic13)`；`presentConnections.open_questions(U10)`；`culturalEvents(1938/1992)` | 看第一/二组分歧 / 看时间变化 / 看史料原页 / 看事实 | **conflict_compare**（008 冲突卡可见） |
| 5 回到今天 | s07/s08 | `currentExactEntities`；`presentConnections(2)`（site_vs_rebuilt / today_location）；`currentPhotosConfirmed` | 看今貌照片 / 了解更多 / 追问×4（既有四意图 replan） | current_map |

- Beat 5 recipe=`RETURN_TO_PRESENT` 属 **CompositionRecipe**（表达层配方），非 ExperienceAction V0.1；「回到今天」由既有 NEXT/场景状态 + replan 的 `RETURN_TO_PRESENT` runtime action（TASK-0016 既有层）表达，未新增 Action（T-08 / AT-11）。
- 五拍全部 `fallback=undefined`（真实世界数据在场，无证据缺口退化）；`validateBeatCoverage` ok。
- **Human Experience（浏览器走查、四意图 E2E 截图等）未在本任务执行 → Human Experience Gate = NOT YET RUN（M5 范畴）。**

## 11 Automated Tests / Regression

| 套件 | 结果 |
|---|---|
| 新增 `tests/experience/cultural-world-projection.test.ts` | **11/11 PASS**（T-01～T-10 + AT-09 支撑） |
| `tests/experience/`（含 renderer/composition2/replan-loop/multi-intent/exp-0001/visual-grammar）+ `tests/data/experience-script.test.ts` | **167/167 PASS**（T-10 相关回归全绿；含冻结副本逐字节一致、脚本 19 条不变量、buildExperience 确定性对账） |
| `tsc --noEmit` experience-engine | 0 error |
| `tsc --noEmit` apps/web | 0 error |
| 全量 `vitest run`（17 文件/254 用例） | 245 pass / **9 fail——经 `git stash -u` 基线复跑实证为存量失败**（见下），与本任务无关 |

**存量失败明细（如实记录，AT-13）**：`tests/data/` 下 evidence-recovery(2) / historical-spatial-reconstruction(1) / human-review-s1(2) / knowledge-weave(2) / spatial-grounding(2)——均为「Evidence linkage / 重跑幂等计数 / 冻结基底计数」类 DB 状态断言。基线复跑（stash 本任务全部改动后）**同样 9 failed | 67 passed**，故非本任务引入；根因指向 CW-02 seed（commit `83fdefb`）对 DB 状态的合法变更（AD-02 relations +1、AD-04 证据 20 行 candidate→evidence_linked）使早期 TASK-0004/0005/0006/0007 的计数型断言过期。**未在本任务内修复**：修复需改 DB 断言/数据，超出 M4.1 授权范围（§9/§10）；建议另立最小治理任务（或按既有「测试只断言不变量，不断言过期总数」规则修正守卫）。

## 12 Acceptance Tests AT-01～AT-16

| AT | 判定 | 依据 |
|---|---|---|
| AT-01 单一 Reader 进体验 | **PASS** | T-01：world 携带 9/16/2/2 投影字段；reader 是唯一 008→体验通道 |
| AT-02 只读派生、无第二真源、无回写 | **PASS** | reader 为纯函数；投影副本性质与 spatial-slice JSON 同构；无任何 008 写路径 |
| AT-03 双轴正交 | **PASS** | T-02：axisA 六值 + axisB E1–E4 并存且互不改写 |
| AT-04 1265/1267 双值可见 | **PASS** | T-03 + §08：双值冲突卡 + preserved_open |
| AT-05 fragment gate / u10 无正向出口 | **PASS** | T-04：`fact=null` 类型+测试双强制；§07 |
| AT-06 Meaning firewall | **PASS** | T-05：tone 与六值分离、无 fact 字段 |
| AT-07 U10 单一真源 + OPEN_QUESTION | **PASS** | T-09：U10 详细口径仅在投影；§09 |
| AT-08 1938/1992 scope 内表达 | **PASS** | T-06：1992 重建为唯一 1992 事实事件；开放表述不混入 |
| AT-09 Five-Beat 由真实 Projection 支撑 | **PASS**（Runtime Integration 层） | §10 运行链证据 JSON + AT-09 support 测试 |
| AT-10 复用现有 Surface/Action/Patch | **PASS** | 零新增 SurfaceType/Action；Registry 未改 |
| AT-11 Beat 5 无 RETURN_TO_PRESENT Action | **PASS** | T-08：V0.1 十项联合类型无该值 |
| AT-12 legacy/script 最小对齐 | **PASS** | 仅 s06-u4 一句（三处同步）+ builder 同句；无批量退役 |
| AT-13 自动测试 + 回归 | **PASS（相关回归全绿）**；存量 9 失败如实记录（基线复跑实证非本任务引入） | §11 |
| AT-14 两 Gate 分开 | **PASS** | Runtime Integration PASS / Human Experience NOT YET RUN（§01/§10） |
| AT-15 严格限第一簇 | **PASS** | 数据仅 jinze-min-001（9/8/2/2/16/1）；无第二簇/镇/批量 |
| AT-16 Result 生成 + 简短摘要 + STOP | **PASS** | 本文档 + 对话框摘要 + §17 |

## 13 Remaining Gaps / Deferred Items

1. **Human Experience Gate 未跑**（M5）：浏览器级五拍走查、四意图 E2E、截图证据留待 M5；本任务运行链证据为 runtime 数据层。
2. **存量 9 个 DB 测试失败**（§11）：根因在早期任务的计数型断言过期（疑与 CW-02 seed 合法变更相关），需独立最小治理任务修复；本任务无权触碰。
3. **`timeline` 主面仍消费 `SliceShape.changes`**：culturalEvents 已在场（Beat 1/4 可消费），但 TimelineSurface 的 lifeline 数据源切换未在本任务做——按 EXP-CULTURAL-02 §05 该字段本就标注 CALIBRATE/渐进，非本 AT 要求。
4. **投影副本刷新机制**：`jinze-cultural-world-008.json` 为一次性确定性导出（生成器已删、产物入库）。008 数据再演化时需重新导出；是否固化为正式导出脚本由 Architect 裁决（本任务按 §9 未建 Data Factory）。
5. **observations（不改 CURRENT/NEXT）**：① `claimEpistemicByKey` 全命中（8/8），说明 legacy relations 与 008 claims 键位天然对齐，后续簇可复用该 join 模式；② `WorldConflict` 双值结构可承载未来 cultural_conflicts 扩容，无需再改类型。

## 14 ARCHITECTURE_RECONCILIATION

**NONE。** 六值 SOT、Fact–Interpretation Firewall、WorldEvidenceState/ExperienceAction/Composition/Patch-not-Replace 冻结契约全部成立；本任务仅向 WorldEvidenceState 追加最小可选共字段 + 一个只读 reader，未触发任何架构语义冲突（Context Gate §02 全绿）。

## 15 PLAN_RECONCILIATION

**NONE。** Phase II 路线与 M4.1 顺序成立；M4 下一施工单元（M4.2）由 Architect 决定。

## 16 Gate Recommendation

**PASS_TO_M4_NEXT** —— vertical slice 工程接通完成、两项 SOT 与全部硬边界无回归、相关回归 167/167 全绿；存量 9 个 DB 测试失败已实证为基线既有（与本任务无关），已如实记录并建议独立治理（不阻塞 M4 推进的判定依据：其涉及文件/数据层与本任务零交集）。

## 17 STOP

本 Result 已写入；commit 完成后立即 STOP。不自行开始 M4 下一施工单元，不进入 M5，等待 ChatGPT Architect Review。
