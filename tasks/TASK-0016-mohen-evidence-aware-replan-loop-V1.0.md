# TASK-0016 — MoHen Agent Runtime: Evidence-Aware Replan Loop V1.0

> 施工模式：Short-Session / Context Bootstrap  
> 必须在新的 WorkBuddy 对话执行；旧对话只读。  
> 前置：TASK-0015 = PASS；TASK-0015-FIX = PASS。

## 0. Context Bootstrap
不要依赖旧聊天、模型记忆或 MEMORY.md 恢复项目。

Source of Truth：当前 TASK > CONTEXT.md > 本 TASK 指定 Contract/Schema/Skill > 相关 tests > 当前代码 > 必要时 Git history。MEMORY.md 不是 Source of Truth。

开始只读：CONTEXT.md；TASK-0015/TASK-0015-FIX result；当前 Jinze Experience Script / ExperienceState / CompositionState；与 follow-up/Patch 直接相关的 Agent/Experience action、renderer、surface registry；相关 tests；已有直接相关 Skill。仅可沿直接依赖继续读取并说明原因。

禁止通读 MEMORY.md、全部 docs/tasks/results、批量 Legacy/DB；禁止重新研究金泽、扫描全仓后重做架构。TASK 与仓库冲突则 STOP。

修改代码前输出 CONTEXT_GATE：实际读取文件及原因、MEMORY.md 是否读取（必须 NO）、冲突、HEAD、git status。
Gate：CONTEXT_HYGIENE_READY = YES/NO；NO 即 STOP。

## 1. Session Gate
施工前记录 repo/branch/HEAD、worktree、其他施工 session、旧 next dev/build/test worker、3001 端口、.next 写进程、并行 DB 写入。
同一 worktree + runtime + DB 同时仅一个施工会话写入。禁止 dev/build 同时共享 .next；build 前停 dev，之后 clean restart。
Gate：SESSION_ISOLATION_READY = YES/NO；NO 即 STOP。

## 2. Goal
在现有金泽体验切片实现第一代 Evidence-Aware Replan Loop：

User Intent → Context → Evidence-aware Decision → Replan → ExperienceState Patch → Composition Patch → Existing Surface。

唯一完整链路：用户在“回到今天”后追问「那颐浩寺和普济桥以前真的有关系吗？」

墨痕必须判断：不能回答“有”；不得虚构历史空间关系；temple–bridge association 仍是非确定/E2；带用户回到关系历史空间+证据；通过 Patch 改变当前 Experience，不开新页、不重启、不退化成普通聊天。

## 3. Frozen Invariants
1. Evidence Gate 优先于叙事流畅。
2. Geometry itself is a Claim。
3. 现代坐标不得作为历史坐标。
4. 无历史几何时诚实降级为 relational_historical 等模式。
5. E2 不得升级 E1。
6. 颐浩寺↔普济桥不得陈述为已证实历史关系。
7. Current Visual 不冒充 Historical Visual。
8. Follow-up 必须 Patch 持续 ExperienceState，不 reset。
9. Agent 不直接生成 DOM/React/SVG。
10. Agent 选语义 Action/Experience Mode，Renderer 负责视觉。
11. 不重构 TASK-0015 Visual Grammar/SpatialCanvas/Surface Registry。
12. 无 AI 历史图像、无新历史事实、无新 GIS/georeferencing。
13. Legacy zero-write；DB zero-write；migration zero。
14. 不增加大而泛的新 Skill。

## 4. Scope
IN：最小链路 FollowUpIntent → EvidenceDecision → ReplanPlan → ExperiencePatch → CompositionPatch → existing RelationalHistoricalSurface → evidence presentation。允许最小 typed runtime/domain structures，名称服从现有代码。

OUT：通用聊天、LLM API、DeepSeek/OpenAI、prompt 框架、长期 Memory、用户画像、多 Agent、MCP 新接入、Tool marketplace、新历史研究/GIS/地图配准、路线执行、新页面体系、大 UI redesign、Video/TTS、DB schema 重构。

## 5. Runtime Contract
Current ExperienceState + User Follow-up → FollowUpIntent → Evidence-aware Decision → ReplanPlan → ExperiencePatch → CompositionState Patch → Existing Surface Renderer → Observe。

禁止 User text → React/SVG；禁止 User text → replace whole Experience。

## 6. Canonical Fixture
问题：「那颐浩寺和普济桥以前真的有关系吗？」
Intent：verify_historical_relation；对象：颐浩寺/遗址、普济桥。
Evidence Decision：insufficient_for_confirmation（或现有等价枚举）。
核心语义：“现在还不能确认。”

依据只能来自已有状态：今天接近≠历史功能关系已证明；已有材料支持各自历史/变化及部分水系关系；temple–bridge association 尚不足以成为已证实历史关系。因此切换“关系历史空间+证据”，不得画确定关系。核心是 typed semantic decision，不要求硬编码固定文案。

## 7. Replan Behavior
Before：Return to Present/current geographic。
Replan：保留 experience/session/visited beats；focus=颐浩寺+普济桥；target surface=existing relational historical；evidence focus=temple–bridge association；uncertainty visible；current coordinates lose historical authority；relation=unconfirmed/E2；next actions=看证据/看各自时间变化/回到今天。
After：只 Patch ExperienceState/CompositionState。

禁止 reset Beat1、新 Experience ID、整页 reload、E1 实线、现代坐标证明历史邻近、断言寺桥历史系统成立。

## 8. Evidence-aware Surface Selection
必须证明 Surface 可由 Evidence Decision + Replan 选择，而非固定 beat：
verify_historical_relation + insufficient_for_confirmation + historical_geometry_absent → relational_historical。
复用 Relational Historical Surface V3；寺↔桥保持 candidate/unconfirmed/askedMissing/absent-relation 合法视觉语义。

## 9. Patch-not-Replace Contract
必须证明：experienceId 不变；visited history 不丢；问题加入 session trace；focus/primary surface/evidence focus/uncertainty/actions 被 patch；可回 present；无整页 reload。不得复制整个 ExperienceState 冒充 Patch。

## 10. Humanistic Behavior
不是只回答“证据不足”，而是：
判断不足 → 收缩断言 → 切换关系空间 → 高亮寺/桥 → 显示关系缺口 → 提供继续调查方向。
这才算 Agent 行动。

## 11. Required Tests
至少验证：
1 canonical follow-up→verify_historical_relation；
2 decision≠confirmed；
3 E2 不升 E1；
4 experienceId 不变；
5 visited/session trace 不清空；
6 真 Patch，不创建全新 Experience；
7 current geographic→relational historical；
8 historical scene 无 current coords 充当 historical geometry；
9 寺桥不渲染 confirmed solid relation；
10 uncertainty/evidence limitation UI 可见；
11 可返回 present；
12 返回后 session identity 不变；
13 无 full reload；
14 无 unsupported historical fact；
15 current visual 不标 historical；
16 fixture deterministic；
17 TASK-0015 核心 tests 不回归。

若现有结构允许，真实浏览器 E2E：Return to Present → canonical follow-up → Relational Historical → evidence limitation visible → return present。

## 12. Runtime Discipline
只运行一个 dev。不得遗留旧 server；dev/build 不同时写 .next。若 build：停 dev→clean/build→记录→清可再生产物→clean dev restart→runtime smoke。最终人工访问必须来自最终 clean runtime。

## 13. Memory Discipline
禁止整理父级 MEMORY.md。只更新短 CONTEXT.md：current phase/slice/TASK status/frozen runtime invariants/blockers/next decision。不得从 MEMORY 批量搬历史。

## 14. Deliverables
1 tasks/results/TASK-0016-result.md
2 typed Runtime Contract/domain implementation
3 canonical follow-up fixture
4 Evidence Decision
5 Replan/ExperiencePatch
6 Composition patch integration
7 automated tests
8 browser E2E
9 至少3张 clean-runtime 截图：follow-up 前、Replan关系空间+证据限制、Replan 后返回 Present
10 CONTEXT.md 更新

遵循现有目录，不强造新目录。

## 15. Gates
分别报告 YES/PARTIAL/NO：
CONTEXT_HYGIENE_READY
SESSION_ISOLATION_READY
FOLLOWUP_INTENT_READY
EVIDENCE_DECISION_READY
REPLAN_PLAN_READY
EXPERIENCE_PATCH_READY
EVIDENCE_AWARE_SURFACE_SELECTION_READY
PATCH_NOT_REPLACE_RUNTIME_READY
REPLAN_BROWSER_E2E_READY
CLEAN_RUNTIME_DELIVERY_READY

总 Gate：MOHEN_EVIDENCE_AWARE_REPLAN_LOOP_READY。关键链路可运行且无 epistemic violation 才能 YES。

## 16. Acceptance
A Agent：追问改变 Goal 并 Replan。
B Evidence-aware：证据不足主动降低断言。
C World action：Replan 真改变 Surface/focus/evidence。
D Persistent：不 reset/reload。
E Spatial honesty：不偷渡现代坐标。
F Reuse：复用 TASK-0015 Surface/Grammar。
G Clean runtime：最终链路来自 clean runtime。
H Short-session：不依赖旧聊天/巨大 MEMORY。

## 17. Non-blocking
React duplicate-key、Current Geographic 缺水道/道路 geometry、Historical Map Native PARTIAL、historical visual=0、historical geometry=0，只记录不扩 scope，除非直接阻断 canonical follow-up。

## 18. Result Report
必须写：Context Gate读取清单；Session Gate；前后 commit；修改文件；follow-up intent/decision/replan/patch；Evidence Level 是否变化；Experience ID 前后；是否 full reload；是否 current coords→historical geometry；tests/E2E/typecheck/build/runtime；截图；10 Gates；unresolved；git status；并行施工 session。不得只写“全部完成”。

## 19. Commit/Cleanliness
完成后 commit code/tests/result/CONTEXT；git status clean；不提交 .next/PID/临时文件；截图遵循既有规则；Legacy/DB/migration 均 zero-write。

## 20. STOP
完成 TASK-0016 立即 STOP。禁止自动 TASK-0017；禁止通用 LLM Agent、模型 API、第二镇、GIS 重建、历史地图、Video Renderer、全 MEMORY 清理、全 Runtime 重构。

## Architect Intent
TASK-0012 建立可验证 Experience Script；0013/0014 建立 ExperienceState→Composition→Surface；0015 建立 Humanistic Visual Grammar + SpatialCanvas。

TASK-0016 第一次完成真正 Agent 闭环：
用户提出问题 → 墨痕判断证据 → 改变计划 → 世界随之改变 → 不确定处诚实呈现“不确定”。

这条链成立，墨痕才从“可交互人文叙事”进入“Agent 主导的人文体验”。
