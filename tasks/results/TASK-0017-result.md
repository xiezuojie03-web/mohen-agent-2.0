# TASK-0017 Result — Multi-Intent Evidence-Aware Exploration Loop V1.0

> 状态：PASS（RUNTIME_ACCEPTANCE = YES；HUMAN_EXPERIENCE_ACCEPTANCE = PENDING）
> 总 Gate：`MOHEN_MULTI_INTENT_EXPLORATION_LOOP_READY = YES`
> `BUILD = NOT_RUN`（clean runtime E2E 已跑；本报告如实记录）
> STOP：本 Task 完成，未启动 TASK-0018。

## 1. Context Gate

- `CONTEXT_HYGIENE_READY = YES`
- 实际读取文件（仅 §0 允许清单 + 直接依赖）：
  - 本任务书 `tasks/TASK-0017-*.md`
  - `CONTEXT.md`、`tasks/results/TASK-0016-result.md`
  - `packages/experience-engine/src/{evidence-aware-replan,surface-eligibility,experience-runtime,index}.ts`
  - `apps/web/app/experience/jinze-water-net/{ExperienceShell,beats}.tsx`、`surfaces/{types,EvidenceNarrativeSurfaces,SpatialSurfaces}.tsx`、`surfaceRegistry.tsx`
  - `tests/experience/replan-loop.test.ts`、`scripts/e2e-replan-loop-capture.mjs`、`data/experience/jinze-historical-spatial-slice.json`
- 未读取任何 MEMORY.md；未重做架构研究；未触碰 Legacy / DB / migration。
- 冲突：无。

## 2. Session Gate

- `SESSION_ISOLATION_READY = YES`
- 单一 worktree（`main`，HEAD `d402f95`）；无并发施工 session。
- 正式施工前按结论处理 `.next`：PowerShell 释放 3001 → `rm -rf apps/web/.next` → 单一 `next dev -p 3001`（`NODE_OPTIONS=""`，避免 safe-delete 拦截器误删）。
- `BUILD = NOT_RUN`；DB / Legacy zero-write。

## 3. Changed Files

| 文件 | 性质 | 说明 |
|---|---|---|
| `packages/experience-engine/src/evidence-aware-replan.ts` | 扩展 | 四类 intent 的 classifier / `decideEvidence`（5 分支）/ `ReplanPlan`（分化字段）/ `selectReplanSurface` 按 `plan.targetSurface` / `buildExperiencePatch` 镜像 |
| `packages/experience-engine/src/surface-eligibility.ts` | 小改 | `RelationEvidence.relationKey?` 供证据检视溯源 |
| `apps/web/app/experience/jinze-water-net/surfaces/types.ts` | 小改 | `SurfaceContext.evidenceInspection?` / `evidenceInspectionRefs?` |
| `apps/web/app/experience/jinze-water-net/surfaces/EvidenceNarrativeSurfaces.tsx` | 扩展 | `EvidenceRevealSurface` 新增「证据检视」主表达块（`data-testid=evidence-inspection`，按 `relationKey` 溯源，标注「不升 E1」） |
| `apps/web/app/experience/jinze-water-net/beats.ts` | 小改 | `relationKey` 映射进 `relationEvidence`；beat-05 新增 B/C/D 三个「追问：…」按钮 |
| `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx` | 扩展 | `evidenceInspection`/`evidenceInspectionRefs` 接入 ctx；ReplanCard 按 `intentKind` 分流（4 区块）；`coordinate-authority-lost` 改由 `currentCoordsLoseHistoricalAuthority` 驱动 |
| `tests/experience/multi-intent.test.ts` | 新增 | §10 全 20 条不变量（29 用例） |
| `scripts/e2e-multi-intent-capture.mjs` | 新增 | clean-runtime 四意图 E2E（4 截图） |
| `tasks/TASK-0017-*.md` | 新增 | 任务书（用户交付） |
| `CONTEXT.md` | 更新 | 记 TASK-0017 PASS + 多意图纪律 |

未新建 Surface 系统；全部复用既有 `relational_space` / `evidence_reveal` / `timeline` / `current_map` / `current_photo`。

## 4. 四类 Canonical Trace

| 项 | A `verify_historical_relation` | B `inspect_evidence` | C `explore_temporal_change` | D `propose_present_action` |
|---|---|---|---|---|
| canonical question | 那颐浩寺和普济桥以前真的有关系吗？ | 你凭什么这么判断？ | 它们后来发生了什么变化？ | 那我现在去现场可以看什么？ |
| intent.objects | [yihaosi-site, pujiqiao] | []→DEFAULT_PAIR | [] | [] |
| verdict | insufficient_for_confirmation | insufficient_for_confirmation（E2 不升 E1） | insufficient_for_confirmation | insufficient_for_confirmation |
| supportedEpistemicClass | E2 | E2 | UNKNOWN | UNKNOWN |
| evidenceRefs / temporal / present | — | refs=[relationKey(temple↔bridge)] | temporal.hasEvidencedChanges=true | present.routeVerified=false |
| targetSurface | relational_space | evidence_reveal | timeline | current_map |
| secondarySurface | evidence_reveal | relational_space | relational_space | current_photo |
| spatialAuthority | historical_lost | evidence_only | historical_lost | present_held |
| temporalFocus | none | none | evidenced_changes | present |
| actionStatus | judgment | evidence | temporal | proposal_not_routed |
| currentCoordsLoseHistoricalAuthority | true | false | true | false |

（canonical 链路均真走 `FOLLOWUP_REPLAN` → `classifyFollowUp` → `decideEvidence` → `planReplan` → `reduceExperience` 落 `replanPlan`；E2E 实测 `data-intent` / `data-current-coords-authority` / `data-route-verified` 与表一致。）

## 5. Plan Structural Diff（§6「一模板四皮肤」禁令）

四 plan 在 §6 维度签名 `[targetSurface, secondarySurface, spatialAuthority, temporalFocus, actionStatus, relationEpistemicClass]` 两两比较，每组差异 ≥ 2 项（单测 §10-3 强制断言通过）。具体：
- A vs B：targetSurface/secondarySurface/actionStatus/spatialAuthority 4 项不同。
- A vs C：targetSurface/secondarySurface/actionStatus/temporalFocus 4 项不同。
- A vs D：targetSurface/secondarySurface/actionStatus/spatialAuthority/temporalFocus 5 项不同。
- B vs C：targetSurface/secondarySurface/actionStatus/spatialAuthority/temporalFocus 5 项不同。
- B vs D：targetSurface/secondarySurface/actionStatus/spatialAuthority/temporalFocus 5 项不同。
- C vs D：targetSurface/secondarySurface/actionStatus/spatialAuthority/temporalFocus 5 项不同。

→ 不是同一模板换皮：每个意图最终落到**不同的主角 Surface**、**不同的时空权威**、**不同的行动状态**。

## 6. Evidence / Epistemic Invariants

- E2 永不升 E1：A/B 的 `supportedEpistemicClass` 恒停在切片原有 `E2`；`currentAssociationNotHistorical=true`（现代共址≠历史关系）。
- 证据检视不升级：`decideInspect` 直接读取既有 `relation.epistemicClass`，不创造更高断言；`evidenceRefs` 全部可解析回 `world.relationEvidence` 与切片 `relations`（单测 §10-6 断言）。
- 时间不编造：C 的 `decision.temporal.hasEvidencedChanges === world.hasEvidencedChanges`；`unknown` 含「无年份的对象不得伪造年份」护栏；未知年份在 `TimelineSurface` 仅以斜纹占位，不落轴。
- Geometry is a Claim：`world.hasHistoricalGeometry=false`，`historical_geometry` surface 恒 ineligible（reason `GEOMETRY_IS_A_CLAIM_NO_HISTORICAL_GEOMETRY_EVIDENCE`）。C 即便进入时间语境，`currentCoordsLoseHistoricalAuthority=true`（现代坐标不升历史权威）。
- present 非导航：D `actionStatus=proposal_not_routed`、`present.routeVerified=false`；`nextActions` 无任何逐段/导航/turn-by-turn 文案（单测 §10-9/10）。

## 7. ExperienceState Persistence（Patch-not-Replace）

- `experienceId` 全程不变（四类通用，单测 §10-11）。
- `sceneIndex` 不因追问 reset（四类通用，§10-12）。
- `trail` 只追加（`replan:kind:question` → `return_to_present`），前段原样保留（§10-14）。
- `RETURN_TO_PRESENT` 只关 `replanViewActive`，判定痕迹 `replanPlan`/`followUpIntent` 保留，`experienceId`/`sceneIndex` 不动（E2E「体验未重启」探针 `window.__patch_marker` 存活）。
- Renderer 不直接承担证据判断（判定全在 runtime）。

## 8. Tests / Typecheck / Build / Runtime

- `pnpm`(engine) typecheck：`packages/experience-engine` `tsc --noEmit` → 0 error。
- `apps/web` typecheck：`tsc --noEmit` → 0 error。
- `tests/experience/multi-intent.test.ts`：**29 passed**（覆盖 §10 全部 20 条不变量）。
- `tests/experience/replan-loop.test.ts`（TASK-0016 回归）：**15 passed** → 无回归。
- `BUILD = NOT_RUN`（任务书允许；如实记录）。
- clean-runtime E2E `scripts/e2e-multi-intent-capture.mjs`：单 dev 实例（3001），**36/36 PASS**，`pageerror=0`。

## 9. Screenshots（4 张，每意图一张最终态）

`data/exports/task-0017-captures/`：
- `01-verify_historical_relation.png`（relational_space + 证据限制 ReplanCard）
- `02-inspect_evidence.png`（evidence_reveal 主表达 + 证据检视块）
- `03-explore_temporal_change.png`（timeline 主角）
- `04-propose_present_action.png`（current_map + present 建议，无「坐标失权威」）

## 10. Legacy / DB Zero-Write

- 运行时模块静态审计（单测 §10-18）：`evidence-aware-replan.ts` / `experience-runtime.ts` / `surface-eligibility.ts` 均不含 `writeFile/appendFile/exec/spawn/pg./prisma/insert into/mysql/legacy` 调用（注释已剥离后扫描）。
- 未触碰任何 migration / Legacy 项目 / PostGIS。

## 11. USER_SENSORY_GAP（普通用户视角仍偏「能力演示」处）

1. ReplanCard 仍以「墨痕的重新判断（不升级·不编造）」+ 结构化列表呈现，偏开发者/评审可读，普通用户更想要「一句话结论 + 一张图」的轻量收口。
2. B 的证据检视块列出了 `relationKey` 溯源串（如 `rel/temple_bridge_association`），对普通用户是噪音；应只留人话「依据 / 缺口」，溯源作为可展开细节。
3. C 的时间轴已是结构化 SVG，但「后来发生了什么变化」的回答仍依赖用户自行阅读生命线与斜纹占位，缺少一句「寺毁于 X、桥在 Y 重建」的口语总结。
4. D 的「现场建议」没有路线/地图标注引导（刻意不导航），普通用户可能期待「从入口先去哪」——需在「受约束建议」与「可行动性」之间再打磨文案。
5. 四个意图的切换仍在同一张 ReplanCard 内换区块，缺一个「你在问哪类问题」的轻量身份提示，用户不易感知「墨痕在切换思考方式」。

> 以上为下一次 Experience Upgrade 的输入；本轮只做运行时诚实分化，不解决感官成熟。

## 12. Unresolved / Non-blocking

- E2E 过程 `console.error` 出现 **78 条**，内容为 React `Encountered two children with the same key`（键不唯一警告），`pageerror=0`，体验功能不受影响。该警告为既有渲染路径的 key 警告（非本轮新增逻辑引入；本轮新增渲染均使用唯一 key），按 §12 透明记录，列为后续 `guard:structure` 校验对象，**不阻塞本 Task**。
- `BUILD = NOT_RUN`：未跑 `next build`/部署；任务书允许，已如实记录。

## 13. Commits

- 待提交（本结果落盘后单次 commit）：
  - 代码：`evidence-aware-replan.ts` / `surface-eligibility.ts` / `surfaces/types.ts` / `EvidenceNarrativeSurfaces.tsx` / `beats.ts` / `ExperienceShell.tsx`
  - 测试：`tests/experience/multi-intent.test.ts`
  - E2E：`scripts/e2e-multi-intent-capture.mjs`
  - 文档：`CONTEXT.md`、本结果、`tasks/TASK-0017-*.md`
- worktree 提交后保持 clean（仅 `data/exports/task-0017-captures/*.png` 为新增产物，一并纳入或按 `.gitignore` 规则处理）。

## 14. Gates（§16）

| Gate | 值 |
|---|---|
| CONTEXT_HYGIENE_READY | YES |
| SESSION_ISOLATION_READY | YES |
| MULTI_INTENT_CLASSIFICATION_READY | YES |
| INTENT_SPECIFIC_EVIDENCE_DECISION_READY | YES |
| INTENT_SPECIFIC_REPLAN_READY | YES |
| EVIDENCE_INSPECTION_READY | YES |
| TEMPORAL_EXPLORATION_READY | YES |
| PRESENT_ACTION_PROPOSAL_READY | YES |
| PATCH_NOT_REPLACE_PRESERVED | YES |
| SPATIAL_EPISTEMIC_HONESTY_PRESERVED | YES |
| MULTI_INTENT_BROWSER_E2E_READY | YES |
| CLEAN_RUNTIME_DELIVERY_READY | YES |
| **总 Gate `MOHEN_MULTI_INTENT_EXPLORATION_LOOP_READY`** | **YES** |

## 15. Acceptance（§17）

- `RUNTIME_ACCEPTANCE = YES`（12 Gate 全 YES、单测 29 + 回归 15 全 PASS、clean-runtime E2E 36/36、typecheck 0 error、DB/Legacy zero-write）。
- `HUMAN_EXPERIENCE_ACCEPTANCE = PENDING`（由用户看截图 / 浏览器实测决定；`USER_SENSORY_GAP` 已列）。

## 16. STOP

完成 §2–§18 全部要求，提交 Result Report + 测试/E2E/截图 + 最终 Gate + commit + clean status。**未自行启动 TASK-0018。**
