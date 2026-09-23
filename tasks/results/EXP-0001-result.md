# EXP-0001 — Human Experience Translation Slice V1.0 · Result

> Track: **E (Human Experience Translation，P0)**
> Baseline: `f74d0be` (TASK-0017 PASS) · Branch: `track/experience-exp-0001`
> 任务书：`tasks/EXP-0001-Human-Experience-Translation-Slice-V1.0.md`

---

## 0. 一句话结论

**`MOHEN_HUMAN_EXPERIENCE_TRANSLATION_SLICE_READY = YES`** —— 把 TASK-0017 的四类 Runtime intent 翻译成了普通用户**不读任何内部 label**就能感知的世界变化；Inspector 降为 DEV-only，墨痕的存在性不再依赖右侧调试抽屉（硬测试通过）。双验收 `RUNTIME_ACCEPTANCE = PASS` / `HUMAN_EXPERIENCE_ACCEPTANCE = PASS`（WorkBuddy 建议值，终签待架构侧 + 独立浏览器实测）。

**核心产品纪律落实**：EXP-0001 不是"重新设计右侧卡片"。四条体验目标主要通过 **Canvas / Surface / 时间 / 空间 / Evidence / Guide** 的变化让普通用户感知，Inspector 仅保留给开发/评审。

> 硬测试：`If the inspector disappears, does Mohen still exist? → YES`（普通模式 `replan-card` 完全隐藏，新增 `IntentGuide` 收口层 + 主角 Surface 切换仍完整表达四类意图）。

---

## 1. 双验收

| 验收 | 结论 | 依据 |
|---|---|---|
| `RUNTIME_ACCEPTANCE` | **PASS** | Runtime contract 未扩张（§2 冻结项全保留）；TASK-0017 DEV E2E 36/36 复跑通过；epistemic 诚实不退化（E2 不升 E1、D 不显坐标失权威）。 |
| `HUMAN_EXPERIENCE_ACCEPTANCE` | **PASS（WorkBuddy 建议值）** | 四意图普通模式收口句正确、身份芯片（思维切换提示）生效、B evidence-inspection 可读、D 2–3 现场观察问题可行动、Surface 按意图切换；残 2 项均文案层（见 §5）。**终签权在架构侧 + 浏览器实测**，本报告不代签。 |

---

## 2. §17 Gate 逐项

| Gate | 结论 | 说明 |
|---|---|---|
| `CONTEXT_HYGIENE_READY` | YES | `translateIntentToExperience` 为纯函数，只读 runtime state + 冻结 slice/world，不改 contract、不升 E1。 |
| `SESSION_ISOLATION_READY` | YES | 沿用 TASK-0017 的 `RETURN_TO_PRESENT` 语义（只关 `replanViewActive`，不丢 trail/experienceId）；新增 `devInspector` 仅读 `location.search`，不入 runtime state。 |
| `RUNTIME_CONTRACT_PRESERVED` | YES | 未改 `evidence-aware-replan.ts` 任何分支；`ReplanPlan` 字段、`actionStatus`、`routeVerified` 恒 false 全保持；无第 5 Intent、无第二套 Surface/Experience 框架。 |
| `INSPECTOR_NOT_PRIMARY` | YES | `replan-card` 渲染前置 `devInspector &&` 门控，普通用户不可见；普通模式由 `IntentGuide` 收口。 |
| `RELATION_TRANSLATION_READY` | YES | A 意图收口句"现在还不能说它们历史上就有关系" + `relational_space`(historical_lost) 切换；B 的 `relationKey` 噪音仅在 DEV 显（`ctx.devMode &&`）。 |
| `EVIDENCE_TRANSLATION_READY` | YES | B 意图 `EvidenceRevealSurface` 主表达 + `IntentGuide` 的"已知/缺口"区块（源自 runtime `supportedEpistemicClass`，E2 不升 E1）。 |
| `TEMPORAL_TRANSLATION_READY` | YES | C 意图 `timeline` 切换 + `buildTemporalSummary` 消费 `slice.changes`(evidenced)，不编造年份；人话收口句。 |
| `PRESENT_CONNECTION_READY` | YES | D 意图回 `current_map` + `proposal_not_routed`；`IntentGuide` 生成 2–3 条可追溯现场观察问题（不含 turn-by-turn）。 |
| `PATCH_NOT_REPLACE_PRESERVED` | YES | Replan 激活时冻结 patch 结果卡让位（避免两 fixed 抽屉重叠、冻结结果不冒充 runtime）；TASK-0017 不变量保持。 |
| `EVIDENCE_BOUNDARY_PRESERVED` | YES | 证据块只展示既有 `relationEvidence`，无新增/伪造 evidence；溯源 relationKey 仅 DEV 显。 |
| `NO_FALSE_HISTORICAL_GEOMETRY` | YES | 本 slice 不画任何几何；D 回 present 不显"坐标失权威"（按 `currentCoordsLoseHistoricalAuthority` 分流）。 |
| `NO_FALSE_ROUTING` | YES | D `routeVerified` 恒 false；`observationPrompts` 明确不含导航/turn-by-turn 文案（单测断言）。 |
| `HUMAN_EXPERIENCE_REVIEW_READY` | YES（建议值） | 四意图截图已落盘并核验；Human Experience Review 见 §5，残 2 项文案层、非阻断。 |

**总 Gate：`MOHEN_HUMAN_EXPERIENCE_TRANSLATION_SLICE_READY = YES`**

---

## 3. 四意图体验目标达成（对照 §4 冻结句）

| 意图 | 冻结体验目标 | 普通用户如何感知 | 达成 |
|---|---|---|---|
| **A** verify_historical_relation | "现在还不能说它们历史上就有关系" | Canvas 切 `relational_space`(historical_lost) + 顶部朱砂收口句 + 思维切换芯片 | ✅ |
| **B** inspect_evidence | "我为什么这样判断？已知什么、缺什么？" | Canvas 切 `evidence_reveal` + 石绿收口句 + 已知/缺口清单（DEV 才显 relationKey） | ✅ |
| **C** explore_temporal_change | "它们没沿同一条时间线走到今天" | Canvas 切 `timeline` + 褐收口句 + 人话时间总结 | ✅（总结偏密集，见 §5） |
| **D** propose_present_action | "历史知识改变我今天怎么看这地方" | Canvas 回 `current_map`(present_held) + 青收口句 + 2–3 现场观察问题 | ✅（Vision 验收重点，达成） |

---

## 4. 验证证据

| 层 | 命令/来源 | 结果 |
|---|---|---|
| 单测 | `vitest run tests/experience/exp-0001-intent-translation.test.ts` | **10/10 passed** |
| 单测（回归） | TASK-0017 `multi-intent.test.ts` | 29/29（不动） |
| 类型 | `pnpm -r typecheck`（6 包） | **0 error**（Done ×6） |
| clean-runtime E2E | `scripts/e2e-exp-0001-human-experience.mjs` | **47/47 PASS**（普通模式 Inspector 隐藏硬测试通过；四意图收口/主角 Surface/身份提示/B evidence-inspection/D 观察问题/D 不显坐标失权威/无 reload/patch 让位） |
| Runtime 保留 E2E | `scripts/e2e-multi-intent-capture.mjs`（DEV `?inspector=1`） | **36/36 PASS**（runtime 内部 label 保留、contract 未退化） |
| 运行时健康 | clean runtime 实测 | `pageerror = 0`；`console.error` 168 条为 TASK-0017 既有 "two children same key" 警告（非本轮引入，功能无碍），透明记录不判失败 |
| 四意图截图 | `data/exports/exp-0001-captures/` | A-verify_historical_relation.png / B-inspect_evidence.png / C-explore_temporal_change.png / D-propose_present_action.png（已肉眼核验顶部 IntentGuide + 切换画布符合预期） |

---

## 5. USER_SENSORY_GAP 残余（TASK-0017 五项，本轮翻译后）

| # | TASK-0017 GAP | 本轮处理 | 残余 |
|---|---|---|---|
| #1 | ReplanCard 偏开发/评审 | Inspector 降 DEV-only + IntentGuide 收口 | **已解** |
| #2 | B 的 relationKey 噪音 | `ctx.devMode && r.relationKey` 仅 DEV 显 | **已解** |
| #3 | C 缺人话时间总结 | `buildTemporalSummary` 消费 `slice.changes` | **部分**：句子偏密集（"寺毁于1938、原址1992重建"塞一句），普通用户仍偏读图 → 建议后续拆句/加视觉停顿，**文案层可优化，非 translator 缺陷** |
| #4 | D 缺可行动引导 | `buildObservationPrompts` 生成 2–3 条可追溯现场观察问题 | **已解** |
| #5 | 缺"思考方式切换"提示 | IntentGuide 身份芯片（"墨痕现在的思考方式"） | **已解** |

**残 2 项均位于文案/呈现层，不阻断 `READY=YES`，不触发越界（不扩 Runtime、不伪造事实）。** 建议由架构侧在下一轮（非 EXP-0001 范围）按真实体验微调。

---

## 6. 跨 Track 间隙（§越界纪律）

| 类型 | 值 | 说明 |
|---|---|---|
| `DATA_GAP` | **NONE** | 本 slice 只读 runtime state + 冻结 slice，未触碰数据/Legacy。 |
| `SPATIAL_GAP` | **NONE** | 未改动任何空间/几何；D 回 present 不显坐标失权威（按既有分流）。 |
| `RUNTIME_BLOCKER` | **NONE** | Runtime contract 冻结项全保留，未扩张 Agent Runtime、未写 DB/migration。 |

> 越界禁令全部遵守：无第 5 Intent、不改 Runtime contract、不扩 Agent Runtime、不写 DB/migration/Legacy、不伪造几何/历史坐标/未验证路线、不启动 W/S/A Track、不建第二套 Surface/Experience 框架；跨 Track 问题只记间隙（本 slice 无新间隙）。

---

## 7. 改动文件清单（9 个）

**新增（4）**
- `apps/web/app/experience/jinze-water-net/intentTranslation.ts` — 冻结适配器（纯函数 `translateIntentToExperience` + `GUIDE_LEAD` + `buildTemporalSummary`/`buildObservationPrompts`）
- `apps/web/app/experience/jinze-water-net/IntentGuide.tsx` — 收口层组件（身份芯片 + 收口句 + 意图专属补充 + 下一步 + 回今天）
- `scripts/e2e-exp-0001-human-experience.mjs` — EXP-0001 clean-runtime E2E（47 断言）
- `tests/experience/exp-0001-intent-translation.test.ts` — 单测 10 用例

**修改（5）**
- `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx` — 导演层接入 IntentGuide + devInspector 门控 + `data-intent-experience` + `handleReplanExplore`
- `apps/web/app/experience/jinze-water-net/experience.css` — `.exp-intent-guide` 系列 + 四意图边框强调 + 响应式
- `apps/web/app/experience/jinze-water-net/surfaces/EvidenceNarrativeSurfaces.tsx` — B relationKey 仅 DEV 显
- `apps/web/app/experience/jinze-water-net/surfaces/types.ts` — `SurfaceContext.devMode?`
- `scripts/e2e-multi-intent-capture.mjs` — 加 `INSPECTOR_QS="?inspector=1"`（runtime 内部 label 验证须 DEV 模式）

---

## 8. 提交与收尾

- Commit：`5d91b70`（branch `track/experience-exp-0001`，baseline `f74d0be`，11 files / +875 / -6）
- Worktree：`clean`（仅本任务 9 文件改动，无遗留 dev server / `.next` 残留；captures 为 gitignored 本地证据）
- `CONTEXT.md`：已追加 EXP-0001 PASS 条目，TASK-0017 降为 Prior

---

## 9. §18 STOP

结果、commit、clean 完成后 **STOP**。
**不得自行启动** EXP-0002 / WORLD-0001 / SPATIAL-R-0001，不得恢复 Runtime 扩张。
下一步由总架构侧根据真实体验与 gap（§5 残 2 项）决定。
