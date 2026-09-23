# EXP-0001 — Human Experience Translation Slice V1.0

**Track:** E — Experience / Human Experience  
**Priority:** P0  
**Baseline:** TASK-0017 PASS / `f74d0be`  
**Authority:** PHASE-GATE-01 V1.0  
**Status:** SIGNED FOR GATES ONLY

## 0. 目标
TASK-0017 已证明四类问题产生不同 EvidenceDecision / ReplanPlan / ExperiencePatch / Surface。本任务不扩 Runtime，只证明：

> 普通用户无需理解 Runtime 术语，也能感受到墨痕因为问题不同，改变了观察历史、组织证据、展开时间以及回到今天的方式。

目标链路：`Agent Judgment → World Change → Human Understanding`。

## 1. Vision Gate
本任务不是 UI 美化。所有体验服务于：**从历史中理解当下，在当下重新发现历史。**

四条 canonical follow-up 中，D 必须明确完成 `历史理解 → 今天的观察方式`；A/B/C 为这一回归今天建立认知基础。

## 2. Frozen Runtime Contract
冻结：四 Intent、EvidenceDecision、ReplanPlan、ExperiencePatch、Patch-not-Replace、Persistent Experience、E1/E2/UNKNOWN、`currentCoordsLoseHistoricalAuthority`、`proposal_not_routed`、Surface eligibility、spatialAuthority / temporalFocus / actionStatus。

允许消费，不允许为 UI 方便修改语义。若现有 contract 无法支撑体验，记录 `RUNTIME_BLOCKER`，不得自行改 contract。

## 3. Canonical Inputs
仅限：
A `那颐浩寺和普济桥以前真的有关系吗？`
B `你凭什么这么判断？`
C `它们后来发生了什么变化？`
D `那我现在去现场可以看什么？`

禁止第五 Intent。

## 4. 四类体验翻译
### A 关系核验
Runtime：`relational_space / E2 / historical_lost / judgment`  
首要理解：**现在还不能说它们历史上就有关系。**
- “今天相邻”与“历史关系未知”视觉分离；
- 历史关系不得画成确定实线；
- 现代精确坐标不得制造历史确定感；
- 墨痕用一个主要判断句收口；
- 可自然进入看依据 / 看时间 / 回今天。

### B 证据检视
Runtime：`evidence_reveal / evidence_only / evidence`  
首要理解：**墨痕为什么这样判断，以及还缺哪块证据。**
- Evidence 像摊开研究材料，不像 Inspector；
- 明确 `已知 / 仍缺`；
- relationKey、epistemic class、surface 等内部标识默认隐藏；
- provenance 可继续展开；
- 不因解释理由把 E2 升 E1。

### C 时间探索
Runtime：`timeline / historical_lost / temporal`  
首要理解：**这些对象没有沿着同一条时间线走到今天。**
- 时间成为 Primary Focus；
- 不只是年份与线条；
- 用现有证据允许的延续/变化/毁损/重建/未知形成节奏；
- UNKNOWN 保持 UNKNOWN；
- 无年份对象不硬放精确年代；
- 必须有人话总结。

### D 现场建议
Runtime：`current_map / present_held / proposal_not_routed`  
首要理解：**历史知识可以改变我今天怎么看这个地方。**
- 回到 today/current space；
- 不生成未经验证路线，不出现 turn-by-turn；
- 现有证据转化为 2–3 个现场观察问题/动作；
- 每项可追溯到已知事实或明确不确定性；
- 目标不是打卡，而是重新理解桥、水、寺址、聚落或空间关系。

## 5. Inspector 降级
TASK-0017 右侧 ReplanCard / Inspector 只作为 DEV/debug 能力保留，不再是普通用户 Primary Surface。普通模式默认隐藏 intent kind / epistemic class / surface / evidenceFocus / spatialAuthority / actionStatus。

硬验收：**If the inspector disappears, does Mohen still exist? → YES。**

## 6. Mohen Presence
每条 canonical path 至少通过以下三项中的两项体现墨痕：
1. 一句简洁、口语化、带判断边界的 Guide；
2. Canvas / Surface 明确变化；
3. 与当前判断直接相关的下一步探索建议。

禁止长篇聊天覆盖 Canvas、把 Runtime JSON 换成另一套标签、每次 Replan 跳新页面、用动画掩盖结构问题。

## 7. Composition / Transition
复用现有 Surface，不建平行 Runtime。允许调整 Primary/Secondary/Context、信息密度、Surface 内布局、Transition、Narrative placement、Evidence reveal、guide copy、current/past emphasis。四 Intent 必须形成可感知 composition 差异。

## 8. Frozen Fixtures 与 Gap
优先使用 TASK-0017 四种稳定状态作为 frozen fixtures。不得为演示伪造事实。
- 缺数据 → `DATA_GAP`
- 缺历史空间证据 → `SPATIAL_GAP`
- 确需 Runtime 新能力 → `RUNTIME_BLOCKER`

本 Task 不顺手解决 W/S/A Track 问题。

## 9. UI 方向
保留克制、人文、纸本感基础，但不靠“古风装饰”制造历史感。优先级：清楚 → 探索节奏 → 人文气质 → 视觉记忆点 → 装饰。地图/时间/证据/图像谁是主角由 Intent 决定。“回到今天”是体验结构，不只是按钮。

## 10. 禁止事项
禁止：新增 Intent；重做 Runtime；DB/migration/Legacy write；大而全 Design System；第二套 Surface framework；AI 历史图冒充史料；伪造 historical geometry；现代坐标冒充历史坐标；未经验证路线；为好看隐藏不确定性；启动其他 Track。

## 11. Context Gate
新 Session 第一轮只读：
1. 本任务书；
2. `CONTEXT.md`；
3. `tasks/results/TASK-0017-result.md`；
4. TASK-0017 四张 E2E capture；
5. `ExperienceShell.tsx`、`beats.ts`、`surfaces/*` 及 Composition/renderer 的直接依赖；
6. PHASE-GATE-01 V1.0。

不得读 MEMORY.md，不得批量扫描历史 tasks/results/docs。

输出 `CONTEXT_HYGIENE_READY = YES/NO`，然后 STOP，等待确认。

## 12. Session Gate
确认 repo/branch/HEAD；baseline=`f74d0be` 或架构侧确认 integration baseline；**不得在 main 正式施工**；Track-E 独立 branch/worktree；worktree clean；无其他执行器占用；dev/.next/端口无冲突；DB/Legacy zero-write；BUILD 默认 NOT_RUN。

建议 branch：`track/experience-exp-0001`；独立 worktree：`mohen-agent-2.0-exp`。

输出 `SESSION_ISOLATION_READY = YES/NO`，然后 STOP，等待第二次放行。

## 13. Gate 放行后的实施顺序
frozen fixture/adapter → Inspector DEV-only → A → B → C → D → transition → responsive check → tests/typecheck → clean-runtime E2E → 四 path capture → Human Experience Review → Result → commit → clean → STOP。

## 14. 测试不变量
至少验证：
1. 四 Intent Runtime truth 未改变；
2. E2 不升 E1；
3. UNKNOWN 不补年份；
4. modern coords 不成 historical geometry；
5. D 仍 `proposal_not_routed`；
6. 无 turn-by-turn；
7. experienceId 保持；
8. sceneIndex 不 reset；
9. trail append；
10. Inspector hidden 时四 path 可理解；
11. A 首要信息=关系未证实；
12. B 可看出已知/缺口；
13. C 有人话时间总结；
14. D 有 2–3 个 evidence-aware 现场观察建议；
15. 四 path composition 可区分；
16. internal runtime labels 不占 Primary Surface；
17. 无 DB write；
18. 无 Legacy write；
19. 无第五 Intent；
20. pageerror=0。

## 15. 双验收
Result 必须分别报告：
`RUNTIME_ACCEPTANCE = PASS/PARTIAL/FAIL`
`HUMAN_EXPERIENCE_ACCEPTANCE = PASS/PARTIAL/FAIL`

Human Experience 检查：3 秒内是否知道墨痕在表达什么；不看 Inspector 能否理解；是否感到世界因问题变化；Evidence 是否清楚不过载；uncertainty 是否自然；是否产生继续探索动机；D 是否建立“历史→今天”；墨痕是否像引导者而不是状态面板。

WorkBuddy 只能给 Human Experience 建议值；最终签字由架构侧 + 用户浏览器实测决定。

## 16. 必交付
代码；tests；四 canonical E2E capture；关键 transition 如有则短录屏/连续 capture；`EXP-0001-result.md`；`DATA_GAP`；`SPATIAL_GAP`；`RUNTIME_BLOCKER`；`USER_SENSORY_GAP`；commit hash；clean status。

## 17. Gate
报告：
`CONTEXT_HYGIENE_READY`
`SESSION_ISOLATION_READY`
`RUNTIME_CONTRACT_PRESERVED`
`INSPECTOR_NOT_PRIMARY`
`RELATION_TRANSLATION_READY`
`EVIDENCE_TRANSLATION_READY`
`TEMPORAL_TRANSLATION_READY`
`PRESENT_CONNECTION_READY`
`PATCH_NOT_REPLACE_PRESERVED`
`EVIDENCE_BOUNDARY_PRESERVED`
`NO_FALSE_HISTORICAL_GEOMETRY`
`NO_FALSE_ROUTING`
`HUMAN_EXPERIENCE_REVIEW_READY`

总 Gate：`MOHEN_HUMAN_EXPERIENCE_TRANSLATION_SLICE_READY = YES/NO`

## 18. STOP
Result、commit、clean 后 STOP。不得自行启动 EXP-0002 / WORLD-0001 / SPATIAL-R-0001，不得恢复 Runtime 扩张。下一步由总架构侧根据真实体验与 gap 决定。
