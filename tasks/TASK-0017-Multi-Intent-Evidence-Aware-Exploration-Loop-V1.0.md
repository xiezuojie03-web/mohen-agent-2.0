# TASK-0017 — Multi-Intent Evidence-Aware Exploration Loop V1.0

> 状态：SIGNED / READY FOR WORKBUDDY
> 前置：TASK-0016 = PASS；`MOHEN_EVIDENCE_AWARE_REPLAN_LOOP_READY = YES`
> 施工模式：Short-Session / Context Bootstrap
> 核心目标：把 TASK-0016 的单一“历史关系核验”闭环扩展为少量、明确、可测试的多意图探索闭环；证明墨痕面对不同问题会选择不同的证据动作与 Experience Replan。
> STOP：完成本 Task 后停止，不启动 TASK-0018。

## §0 CONTEXT_GATE — 先报告，不施工

新开 WorkBuddy 对话/session。禁止依赖旧聊天与 MEMORY.md。

只允许先读取：
1. 本任务书；
2. `CONTEXT.md`；
3. `tasks/results/TASK-0016-result.md`；
4. TASK-0016 直接依赖：
   - `packages/experience-engine/src/evidence-aware-replan.ts`
   - `packages/experience-engine/src/experience-runtime.ts`
   - `packages/experience-engine/src/surface-eligibility.ts`
   - `packages/experience-engine/src/index.ts`
   - `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx`
   - `apps/web/app/experience/jinze-water-net/beats.ts`
   - `apps/web/app/experience/jinze-water-net/surfaces/*`
   - `tests/experience/replan-loop.test.ts`
   - TASK-0016 E2E 脚本
5. 仅在上述文件明确指向时再读一个直接依赖。

禁止：
- 读取/整理任何 MEMORY.md；
- 批量扫描 docs/tasks/results；
- 重做架构研究；
- 重新研究金泽史料；
- 触碰 Legacy / DB / migration。

先输出 `CONTEXT_HYGIENE_READY = YES/NO`，列出实际读取文件、原因、冲突。NO 则 STOP。

## §1 SESSION_GATE — 再报告，不施工

检查 repo / branch / HEAD / git status / worktree / 其它施工 session / 3001 / next dev-build-test worker / `.next` 写入者。

冻结纪律：
- 研究可并行，施工不可并行；
- 同一 worktree 不并发施工；
- dev 与 build 不共享 `.next`；
- 本任务默认 `BUILD = NOT_RUN`；如确需 build，必须先停 dev、隔离 build 输出后再做；
- DB / Legacy zero-write。

输出 `SESSION_ISOLATION_READY = YES/NO`。NO 则 STOP。

只有 §0、§1 都 YES，才进入正式施工。

## §2 本任务唯一产品问题

TASK-0016 已证明：
“那颐浩寺和普济桥以前真的有关系吗？”
可运行：
User Input → Intent → Evidence Decision → Replan Plan → Experience Patch → Composition Patch → Surface → Observe。

TASK-0017 只回答一个问题：

**同一个持续 Experience 中，用户提出不同类型的人文探索问题时，墨痕能否选择不同的证据动作与 Replan，而不是所有问题都走同一个关系核验模板？**

## §3 Canonical Intent Set — 只做四类

保留 TASK-0016：
A. `verify_historical_relation`
示例：`那颐浩寺和普济桥以前真的有关系吗？`

新增三类：
B. `inspect_evidence`
Canonical：`你凭什么这么判断？`
目标：打开/聚焦当前判断的 Evidence，不制造新结论。

C. `explore_temporal_change`
Canonical：`它们后来发生了什么变化？`
目标：把主角转向有证据的时间变化；未知年份必须保持未知，不补齐连续历史。

D. `propose_present_action`
Canonical：`那我现在去现场可以看什么？`
目标：基于当前已知现代对象提出“观察建议/候选顺序”，不是导航，不声称 walkability 已验证。

禁止增加第五类意图。禁止通用 intent ontology。

## §4 Agent Runtime 目标链

四类输入都必须真实经过：

`USER_INPUT
→ FollowUpIntent
→ EvidenceDecision
→ ReplanPlan
→ ExperiencePatch
→ CompositionPatch / Surface Selection
→ Observed UI State`

不得把预写答案 JSON 当 runtime。
不得为每个问题写一套页面分支冒充 Agent。
允许 deterministic classifier；本任务不接 DeepSeek/LLM/API。

## §5 Evidence Decision 必须因意图而不同

A relation verification：
- 维持 TASK-0016 语义；
- E2 不升 E1；
- current coords lose historical authority。

B evidence inspection：
- 决策目标是“展示当前 claim/relation 的依据与缺口”；
- primary/secondary surface 必须体现 evidence focus；
- provenance/locator/evidence refs 可追溯；
- 不因为“打开证据”自动提高 epistemic class。

C temporal exploration：
- 只消费已有 evidenced change/time assertions；
- 允许展示 1342 / 1938 / 1992 / 当代等现有有据节点；
- 没有年份的对象不得伪造年份；
- 不把时间重叠写成因果；
- historical geometry 仍 absent 时不得恢复现代坐标权威。

D present action：
- 只使用现代位置/现代视觉/已知对象作为现场观察建议；
- 输出必须标记 `proposal_not_routed` 或仓库现有等价语义；
- 禁止 turn-by-turn；
- 禁止声称 walkability verified；
- 历史判断与现代行动证据分开。

## §6 ReplanPlan 不得“一模板四皮肤”

每个 intent 至少在以下两项产生真实差异：
- goal/focus
- evidenceFocus
- targetSurface / surface preference
- temporal focus
- spatial authority
- nextActions
- uncertainty presentation
- action status

要求通过测试证明不同 intent 生成不同 plan，而不是仅换文案。

## §7 Persistent Experience / Patch-not-Replace

冻结 TASK-0016 不变量：
- `experienceId` 不变；
- 不 full reload；
- 不 restart；
- trail 追加；
- Replan 作用于当前 ExperienceState；
- 用户可返回当前主体验；
- 返回后判定痕迹可保留；
- Renderer 不直接承担证据判断。

如现有 `FOLLOWUP_REPLAN` 可扩展，优先扩展，不建立第二套 runtime。

## §8 Experience / Composition 行为

优先复用既有 Surface 与 Visual Grammar。

期望语义：
- verify relation → `relational_space`
- inspect evidence → 既有 `evidence_reveal` 或现有可组合证据 surface
- temporal change → 既有 timeline / temporal landscape
- present action → current geographic surface + action/observation overlay（如已有能力可表达）

若某一目标 surface 当前不存在：
1. 先证明现有 surface 无法诚实表达；
2. 只允许最小新增；
3. 禁止借机 UI 重构。

AI 不直接操作 DOM/React；仍由 semantic state → renderer。

## §9 UI 红线

本任务不是视觉改版。

允许：
- 为四类 Replan 提供最小可辨认状态；
- 修复阻断交互；
- 增加必要 data-* 测试钩子。

禁止：
- 大改版式；
- 重做右侧 ReplanCard；
- 新视觉主题；
- 动效系统；
- 视频/TTS；
- 为“好看”改写证据语义。

但结果报告必须新增一节：
`USER_SENSORY_GAP`
记录从普通用户视角仍显得“开发者工具/基础能力演示”的地方，为下一次 Experience Upgrade 提供输入。

## §10 必测不变量

至少覆盖：

1. 四个 canonical question 均得到确定 intent。
2. 四类 intent 均进入同一 Replan runtime。
3. 四类 plan 至少有两项结构差异。
4. relation verification 仍 E2，不升 E1。
5. evidence inspection 不改变 epistemic class。
6. evidence inspection 的 evidence refs 可解析到现有 evidence/world state。
7. temporal exploration 不生成不存在的年份。
8. temporal exploration 不把现代坐标作为历史几何。
9. present action 明确不是 verified route。
10. present action 不产生 turn-by-turn。
11. `experienceId` 全程不变。
12. scene/state 不因追问 reset。
13. no full reload。
14. trail 只追加。
15. current visual 不冒充 historical visual。
16. historical geometry 仍遵守 `GEOMETRY_IS_A_CLAIM`。
17. 未读取 frozen answer JSON 冒充决策。
18. Legacy zero-write / DB zero-write。
19. TASK-0016 canonical follow-up 回归通过。
20. clean runtime 浏览器 E2E 覆盖四类 intent。

## §11 E2E 最小验收路径

在 `/experience/jinze-water-net` 的同一 Experience 内完成至少四条可重复路径。

每条必须记录：
- input
- intent
- evidence decision
- plan
- selected surface
- observed UI state
- experienceId before/after
- scene/beat before/after
- reload marker
- screenshot

截图至少 4 张：每个 intent 一张最终状态。可额外一张总览，但不要求。

## §12 Runtime / Next.js 纪律

沿用 TASK-0015-FIX / 0016：
- 开始 E2E 前停旧 dev；
- 清 `.next`；
- 单一 `next dev -p 3001`；
- 不同时跑 build；
- 不用旧截图冒充本轮；
- pageerror 必须 0；
- console warning 如存在，区分本轮新增与既有。

`BUILD = NOT_RUN` 不构成失败，但必须如实写结果报告。

## §13 测试策略

必须运行：
- `pnpm typecheck`
- `tests/experience` 全量
- 本任务新增 multi-intent tests
- clean-runtime E2E

全量 vitest 若仍遇既有 `spawnSync EBUSY`：
- 如实报告；
- 不得写“全量 PASS”；
- 本任务相关 suite 必须 100% PASS；
- 不得借机修改旧 Data Factory 测试。

## §14 禁止范围

本任务禁止：
- DeepSeek / OpenAI / 任意 LLM 接入
- 第二古镇
- 新数据库表 / migration
- PostGIS / GIS reconstruction
- 历史地图配准
- 新史料大搜索
- AI 生图
- Video Renderer / TTS
- 路线导航引擎
- MEMORY.md 清理
- 全 Runtime 重构
- UI 美化专项
- 新 Skill，除非能证明没有现有 Skill 可承载且先 STOP 请求批准

## §15 交付物

必须提交：
1. runtime/code 最小修改；
2. multi-intent unit tests；
3. clean-runtime E2E；
4. 4 类 intent 的 runtime trace；
5. 4+ screenshots；
6. `tasks/results/TASK-0017-result.md`；
7. 更新短 `CONTEXT.md`；
8. git commit(s)，最终 worktree clean。

结果报告必须包含：
- Context Gate
- Session Gate
- changed files
- 四类 canonical trace
- plan structural diff
- evidence/epistemic invariants
- ExperienceState persistence
- tests/typecheck/build/runtime
- screenshots
- Legacy/DB zero-write
- `USER_SENSORY_GAP`
- unresolved/non-blocking
- commits
- STOP

## §16 Gates

最终逐项给 YES/NO：

- `CONTEXT_HYGIENE_READY`
- `SESSION_ISOLATION_READY`
- `MULTI_INTENT_CLASSIFICATION_READY`
- `INTENT_SPECIFIC_EVIDENCE_DECISION_READY`
- `INTENT_SPECIFIC_REPLAN_READY`
- `EVIDENCE_INSPECTION_READY`
- `TEMPORAL_EXPLORATION_READY`
- `PRESENT_ACTION_PROPOSAL_READY`
- `PATCH_NOT_REPLACE_PRESERVED`
- `SPATIAL_EPISTEMIC_HONESTY_PRESERVED`
- `MULTI_INTENT_BROWSER_E2E_READY`
- `CLEAN_RUNTIME_DELIVERY_READY`
- 总 Gate：`MOHEN_MULTI_INTENT_EXPLORATION_LOOP_READY`

总 Gate 只有在前述核心 Gate 全 YES 时才可 YES。

## §17 Human Acceptance / Sensory Gap

本任务技术 PASS 不等于体验成熟。

结果中明确分开：
- `RUNTIME_ACCEPTANCE`
- `HUMAN_EXPERIENCE_ACCEPTANCE`

后者默认 `PENDING`，由用户看截图/浏览器实测决定。

不得因为 runtime tests 全过就写“用户体验已完成”。

## §18 STOP

完成后：
- 不启动 TASK-0018；
- 不自行继续 UI 优化；
- 不自行接 LLM；
- 不清 MEMORY；
- 等待架构验收。

---

# 给 WorkBuddy 的开工指令

你正在执行 `TASK-0017 — Multi-Intent Evidence-Aware Exploration Loop V1.0`。

这是一个全新的 Short Session。不要依赖旧对话，不读取任何 MEMORY.md。

第一阶段只执行任务书 §0 CONTEXT_GATE 和 §1 SESSION_GATE。严格按允许清单读取最小上下文，检查单 worktree / 无并发施工 / 3001 / `.next` / dev-build 隔离 / DB 与 Legacy zero-write。

先把两份 Gate 报告返回给我。**在我确认之前，不进入 §2–§18 正式施工。**

如果两 Gate 均 YES，等待我的“放行”后再施工。

不要启动 TASK-0018。
