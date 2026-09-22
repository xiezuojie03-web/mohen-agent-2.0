# TASK-0014 --- Experience Composition 2.0 & Surface Component System V1.0

**Status:** SIGNED FOR EXECUTION\
**Precondition:** TASK-0013 = PASS / FROZEN\
**Primary principle:** **墨痕少说，世界多变。**\
**STOP:** 完成实现、测试、人工视觉验收材料、报告、提交后立即
STOP，不启动 TASK-0015。

## 0. 任务定位

TASK-0013 已证明：
`Experience Script → ExperienceState → CompositionState → Renderer → User Action → Patch`
成立。

真实体验暴露的新瓶颈是：Agent
驱动有效，但文字过多、排版偏研究报告、关系空间偏工程视图，削弱探索欲。

TASK-0014 不是"把现有页面做漂亮"，而是建立长期稳定的：
`ExperienceState → CompositionState → Surface Selection → Reusable Surface Components → Experience Beat → Transition → Action → Patch`

金泽只是第一条验证样本。视觉能力必须沉淀为可复用组件，而不是金泽专用页面。

## 1. 唯一目标

把冻结的金泽 8 个 semantic states 重新导演成约 5 个 Experience
Beats，并建立第一版 **MoHen Surface Component System**。

必须同时满足： - 默认体验明显减少阅读负担； -
空间、时间、关系、图像、Evidence 成为主要叙事媒介； - Surface
组件可被未来其他古镇/专题/Agent Experience 重组使用； - 不改变
TASK-0012/0012A 的历史语义和证据边界。

## 2. 冻结的 Experience 2.0 原则

1.  **One Moment, One Focus**：一个时刻只有一个视觉主角。
2.  **Show → Question → Reveal**：先看见，再产生问题，再揭示。
3.  **Space Before Text**：能由空间/时间/视觉变化表达的，不用段落解释。
4.  **Evidence on Demand**：证据按问题逐层展开，不默认铺满。
5.  **Agent Changes the
    World**：墨痕主要通过改变焦点、空间、时间、关系、证据层和下一行动"说话"。
6.  **Text Budget**：默认墨痕发言通常 1--2 个短句；辅助说明通常 1
    句；长史料只在显式查看后出现。不要靠缩小字号容纳文字。

## 3. 核心架构：Surface Components，不是固定视觉页面

严禁建立 `Beat01Hook.tsx`、`Beat02TimeShift.tsx`、`JinzeSceneNN.tsx`
等把剧情真相写进组件的结构。

应建立可复用语义组件。名称可按 repo convention 调整，但职责必须保留。

### Spatial Surfaces

**CurrentMapSurface** - 当前精确地理、已落地对象、距离/范围、当前
POI。 - 只消费语义数据，不硬编码金泽事实。 -
可先沿用确定性投影；若能干净接入现有 MapLibre/真实底图可做
prototype，但不得让网络瓦片阻塞本任务。 - 架构上必须允许以后替换为 GIS
renderer，而无需改变 Experience Script。

**ApproximateAreaSurface** - 表达"约在这里"，不得伪装成精确点。 -
支持范围/不确定边界/精度说明/选择聚焦。 - 不得用一个中心 marker
暗示精确坐标。 - 这是 TASK-0014 新增的第一种低风险空间能力。

**RelationalSpaceSurface** - 表达历史/拓扑关系，不使用历史经纬度。 -
支持 spans、对象---水道、候选关联、人物---地点、变化、未知连接等。 -
evidenced / candidate / unknown 必须视觉不同。 - 不得继续像通用知识图谱
Debug View。 - 不得使用随机 force layout 改变语义。

**HistoricalMapNativeSurface --- prototype only** -
历史地图/原始史料在自己的图像空间中查看，不强制配准现代地图。 -
可缩放/查看（条件允许时）。 - 显示来源、年代、状态。 -
confirmed/unresolved 标签必须区分。 - 禁止现代底图叠加暗示配准。 -
HR-MAP-01 仍为 PARTIAL_CONFIRM；1879 p36 不得升级为金泽直接历史地图。 -
若现有安全资产不足，可判 PROTOTYPE_PARTIAL，不阻塞主任务。

### Temporal Surfaces

**TimelineSurface** - 让时间成为视觉主角。 -
支持出现、毁损/消失、重建、当代。 - 颐浩寺必须表达
`1938 毁损/毁坏 → 1992 原址重建`，不得暗示原建筑连续保存。

**TimeShiftSurface（或等价 transition layer）** - 协调当前精确空间 →
历史关系空间。 - 现代坐标/现代地理权威必须显式退出。

### Evidence Surfaces

**EvidenceRevealSurface** - 只揭示当前问题所需 Evidence。 - 支持
evidenced / limited / conflict / unknown / interpretation candidate。

**ConflictCompareSurface** - 并列冲突来源，不替用户选边。 -
T11-C1/T11-C2 为首个 canonical fixture。

**SourceInspectSurface** - 用户显式要求时查看史料图像/摘录/metadata。 -
Source 是 Evidence，不是装饰。

### Visual Surfaces

**CurrentPhotoSurface** - 仅批准的 current imagery。 - 保持
current/historical 区分及 attribution。

**BeforeAfterSurface** -
本任务只定义接口；若无历史视觉证据，不得为了展示组件而伪造历史侧。

### Agent / Narrative Surfaces

**QuestionSurface**：一个强问题，最少解释。\
**DiscoverySurface**：明确区分 FACT_EVIDENCED / INTERPRETATION_CANDIDATE
/ UNKNOWN。\
**AgentPromptSurface**：短引导，不是聊天记录。\
**ActionDock**：继续、看证据、聚焦对象、移动时间、揭示关系、追问、回到今天等；Action
是 state transition，不是 page link。

## 4. Surface Component Contract

Surface 必须消费 semantic props/state，而不是拥有历史真相。

概念输入至少覆盖： - experienceId / beatId / sceneIds - surfaceType -
role: primary / secondary / context - timeState - spatialState -
entities - relations - evidence - visualAssets - epistemicState -
uncertainty - actions - transitionIntent

若现有 domain types 已覆盖，可复用，不强制另造接口。

硬规则：Reusable Surface 不得为了渲染自行硬编码/查询金泽专用历史事实。

## 5. Surface Registry

建立稳定 resolver：

`surfaceType + semantic state → renderer component`

至少覆盖： - current_map - approximate_area - relational_space -
timeline - evidence_reveal - conflict_compare - current_photo -
discovery - question

Experience/Composition 层选择"要什么语义 Surface"；Registry
选择实现组件。这是未来 Agent 稳定输出的基础。

## 5A. Evidence-aware Surface Selection --- HARD ARCHITECTURE RULE

This layer is mandatory. Surface selection is **not** a visual-variety
mechanism.

The renderer must not choose a map, graph, photo, conflict panel, or
historical map merely because it looks richer. The eligible visual
expression must be constrained by what the current evidence actually
supports.

Freeze the architecture as:

`Evidence / Knowledge State` →
`Epistemic + Spatial + Visual Availability` → `Surface Eligibility` →
`Evidence-aware Surface Selection` → `Composition Engine` →
`Surface Registry` → `Reusable Surface Components` → `Renderer`

### 5A.1 Selection principle

**What we know, how precisely we know it, and what verified assets exist
determine what MoHen is allowed to show.**

Composition answers: \> Which eligible surface should be visually
primary now?

Evidence-aware Surface Selection answers first: \> Which surfaces are
epistemically eligible at all?

Composition must never override an evidence restriction for visual
effect.

### 5A.2 Minimum eligibility rules

Implement or encode deterministic rules equivalent to:

-   reliable current exact coordinates\
    → `CurrentMapSurface` eligible.

-   only approximate/current area grounding\
    → `ApproximateAreaSurface` eligible; exact-point presentation
    ineligible.

-   historical relations exist but reliable historical geometry does
    not\
    → `RelationalSpaceSurface` eligible; reconstructed/exact historical
    map geometry ineligible.

-   original historical map/source image exists but reliable modern
    georeferencing does not\
    → `HistoricalMapNativeSurface` may be eligible in its own native
    document space; modern overlay/georeferenced presentation
    ineligible.

-   conflicting evidence exists\
    → `ConflictCompareSurface` eligible; silently resolved single-answer
    presentation ineligible.

-   confirmed current photograph exists\
    → `CurrentPhotoSurface` eligible and must remain
    labelled/current-contextualized.

-   reliable historical visual asset exists\
    → a future historical-visual surface may become eligible; TASK-0014
    must not invent one because the current slice has zero historical
    visual assets.

-   evidence is insufficient for any stronger spatial/visual claim\
    → `Unknown / Question / Evidence Gap` is a valid output. **Not
    drawing is a legitimate surface decision.**

### 5A.3 Geometry rule

Freeze:

> **Geometry itself is a Claim.**

A historical point, line, polygon, route, waterway shape, street shape,
or alignment may only become eligible when its historical spatial claim
has adequate source/evidence/reconstruction semantics.

Current geometry must not become historical geometry merely because the
same entity persists across time.

### 5A.4 Selection result contract

Introduce a small reusable selection result or equivalent domain
concept. Exact naming may follow repo conventions, but it must expose
enough information to test the decision.

Conceptually:

``` ts
type SurfaceEligibility = {
  surfaceType: SurfaceType
  eligible: boolean
  reasonCode: string
  evidenceRefs?: string[]
  blockedBy?: string[]
}

type SurfaceSelection = {
  eligibleSurfaces: SurfaceEligibility[]
  selectedPrimary?: SurfaceType
  selectedSecondary?: SurfaceType[]
  fallback?: "unknown" | "question" | "evidence_gap"
}
```

Do not create a large rules engine. TASK-0014 only needs the minimum
deterministic policy required by the current vertical slice and reusable
architecture.

### 5A.5 Required canonical cases

Tests/fixtures must prove at least:

1.  current exact Wanan/Puji grounding can select `CurrentMapSurface`;
2.  approximate Yihaosi/current grounding can select
    `ApproximateAreaSurface` without an exact marker;
3.  historical bridge--water relations with no historical geometry
    select `RelationalSpaceSurface`;
4.  HR-MAP-01 / 1879 p36 cannot select a modern-georeferenced historical
    surface; at most native historical-map inspection is eligible under
    frozen source status;
5.  T11-C1/T11-C2 make `ConflictCompareSurface` eligible and prevent
    silent resolution;
6.  confirmed modern photos make `CurrentPhotoSurface` eligible but
    never historical-photo presentation;
7.  absence of sufficient evidence returns a legitimate
    Unknown/Question/Evidence-Gap fallback rather than a fabricated
    visual.

### 5A.6 Long-term boundary

TASK-0014 must establish the boundary, not build autonomous general
reasoning.

For now: - eligibility policy may be deterministic; - Surface Selection
may be rule-based; - Composition may consume the eligible set.

Later MoHen Runtime may reason over this layer, but it must never be
allowed to bypass Evidence Gate / eligibility constraints.

This is the foundation for future **Evidence-aware Experience
Composition**.

## 6. Composition Recipes

在 TASK-0013 的 CompositionState 基础上建立可复用
Recipe，不得按金泽场景命名。

至少支持等价于：

-   `IMMERSIVE_SPATIAL`：空间为主角，问题/行动为辅。
-   `TIME_SHIFT`：时间变化为主，现代空间退出、关系空间进入。
-   `RELATION_DISCOVERY`：关系空间为主，Evidence cue 为辅。
-   `EVIDENCE_FOCUS`：冲突/Evidence 为主，空间上下文为辅。
-   `RETURN_TO_PRESENT`：当前地图/照片恢复权威。
-   `DISCOVERY_QUESTION`：解释框架 + 未决关系 + 下一追问。

## 7. 五个 Experience Beats

冻结的 8 semantic scenes/states 仍是 source material；五 Beat 是
presentation/composition 层，不得删改证据语义。

### Beat 01 --- Hook / 进入现场

Primary：Current Exact Space。

第一眼主要看到今天真实空间中的三处对象，而不是大段说明。

墨痕尽量只问： \> 两座古桥、一处宋寺遗址，今天为什么离得这么近？

不立即回答。

主要行动： \> 回到它们刚出现的时代

Preferred surfaces： CurrentMapSurface + QuestionSurface +
ActionDock；CurrentPhotoSurface 可作为 context。

### Beat 02 --- Time / Space Shift

Primary：现代精确空间失去权威。

顺序：
`2026 exact geography → 时间后退 → 坐标/现代地理淡出 → relational historical space`

先让用户经历变化，再解释。

墨痕可短句： \> 再往前，我不能继续用今天的坐标。 \>
但有一种关系留下来了。

这是 MoHen Signature Interaction 候选。

### Beat 03 --- Relationship Discovery

Primary： `万安桥 → 金泽塘 ← 普济桥`

先揭示两桥---水道的 evidenced
relation，再让颐浩寺进入，但**不要自动画寺↔桥历史功能连线**。

行动： \> 把寺也放进来

当用户尝试/询问关联： \>
还不能。今天它们彼此很近，但我还没有找到寺与桥存在历史功能联系的证据。

"没有一条线"必须成为有意义的视觉表达。

### Beat 04 --- Evidence & Change

Primary：历史知识如何形成。

不要一次铺满研究档案。

先问： \> 为什么不能确定？

逐层 Reveal T11-C1/T11-C2，通过 ConflictCompareSurface 展示，不裁决。

同 Beat 内允许切换到 temporal focus： `1260 → 1938 → 1992 → today`

颐浩寺的毁损/毁坏与原址重建必须视觉区分。

HistoricalMapNativeSurface 可作为 Source Inspect 分支
prototype，不是强制主线。

### Beat 05 --- Return & Next Question

Primary：回到今天。

现代地图/照片重新获得权威。用户再次看到相同三处对象，但已经带着前面的问题。

墨痕： \> 现在，再看一次它们。

随后显示 Discovery（必须是 interpretation）： \>
如果不把它们只当三件孤立文物，而把它们放回水的关系中理解，会不会更接近金泽？

显式标签： `墨痕的解释 / 尚未证实`

自然引出： \> 那颐浩寺和普济桥以前真的有关系吗？

继续消费既有 Patch-not-Replace，不重启 Experience。

## 8. 文字减量验收

必须明显减少默认可见 prose，但不能通过删除 Evidence/不确定性来实现。

依靠： - progressive disclosure - visual state change - focused
surface - evidence/source on demand - contextual actions - short MoHen
utterances

结果报告必须给出： - 每 Beat 默认可见 narrative 字符数； - 同时可见
narrative block 最大数量； - 默认折叠、需行动才 Reveal 的 evidence
数； - 与 TASK-0013 对应状态的对比。

不强制拍脑袋的百分比，但人工验收必须肉眼明显减负。

## 9. TASK-0014 GIS / Spatial Scope

本任务不是 Historical GIS Reconstruction。

允许： 1. Current Exact
Space：改善当前空间表达；真实底图若能低风险接入可 prototype。 2.
Approximate Area：正式实现第一版。 3. Relational Historical Space
2.0：从工程关系图升级为人文空间表达。 4. Historical Map Native Space：小
prototype，条件不足可 PARTIAL。

明确延后： - 大规模历史地图配准； - 历史河网/街道重建； - PostGIS
扩展； - Temporal GIS engine； - 泛化历史几何生成。

历史几何伪造数必须保持 0。

## 10. Relational Space 2.0 Visual Grammar

-   水道可作为空间 spine。
-   桥应表达"跨越"而不是任意 graph edge。
-   candidate / unknown connection 与 evidenced relation 明显不同。
-   absence of line 可以表达"尚无证据"。
-   relation label 用人话。
-   Evidence level 可查看但不主导画面。
-   canonical fixture 布局 deterministic。
-   historical mode 无 longitude/latitude。
-   symbolic/topological 可以；不得冒充 reconstructed geometry。

## 11. Approximate Area Visual Grammar

-   与 exact point 明显不同。
-   禁止中心精确 marker 暗示 certainty。
-   可查看 uncertainty/precision。
-   可 focus/select。
-   API 能兼容未来真实 polygon/radius/confidence geometry。
-   current approximation 不得继承成 historical geometry。

## 12. Historical Map Native Prototype

若使用现有合格 source： - native image space； -
inspect/zoom（条件允许）； - title/date/status； - confirmed/unresolved
分开； - no modern basemap overlay； - no georeferencing implication； -
no invented anchor； - no HR-MAP-01 promotion。

若必须开启新研究才能实现，标 `PROTOTYPE_PARTIAL`，不要扩任务。

## 13. Visual Hierarchy

每个 Beat： - 一个 Primary Surface 明确占视觉主导； - secondary/context
必须退让； - evidence details 默认折叠； -
不再以主画布下方长卡片堆叠作为默认阅读路径； - controls 少而情境化； -
进度可感知但不抢主角； - 墨痕身份存在但克制； - 视觉张力来自 focus /
transition / contrast / reveal / withholding，而不是装饰。

默认解法不是"增加卡片"。

## 14. WorkBuddy 不依赖识图

本任务书是实现 Source of Truth。

Pre-Design 图片仅供人类设计参考。

WorkBuddy 不得依赖识图去猜： - spacing - hierarchy - interaction -
color - typography - GIS semantics

所有关键要求必须从本任务书执行。

## 15. Tests

至少验证：

1.  Surface Registry 覆盖已实现 surface。
2.  Surface 组件消费 semantic input，无金泽 truth hardcode。
3.  无 BeatNN/JinzeSceneNN truth components。
4.  五 Beats 可由冻结 semantic states 组合。
5.  每一时刻只有一个 Primary Surface。
6.  Current Exact 可用 current coordinates。
7.  Historical relational 无 current coordinate geometry。
8.  Approximate Area 不能退化成 exact point。
9.  RelationalSpace 区分 evidenced/candidate/unknown。
10. 寺↔桥 evidenced line 不得出现。
11. T11-C1/C2 未裁决。
12. Evidence 默认 progressive disclosure。
13. Primary Discovery 保持 INTERPRETATION_CANDIDATE。
14. Follow-up 保持 Patch-not-Replace。
15. historical visual assets = 0。
16. AI historical visual path = 0。
17. HistoricalMapNative 若存在，不得暗示现代配准。
18. HR-MAP-01 = PARTIAL_CONFIRM。
19. DB zero-write。
20. Legacy zero-write。
21. build/typecheck/guards PASS。
22. Evidence-aware Surface Selection 返回可解释 eligibility / blocked
    reason。
23. Composition 不能选择 evidence-ineligible Surface。
24. insufficient evidence 必须允许 Unknown/Question/Evidence-Gap
    fallback，不能为了视觉丰富强行选 Surface。
25. historical geometry eligibility 不得从 current geometry 自动继承。

浏览器工具可用时，为五 Beat 和 Patch 增加 E2E/capture。

## 16. Human Visual Acceptance --- mandatory

至少生成可复核截图：

1.  Beat01 Hook / Current Space
2.  Beat02 坐标退出后的 Time/Space Shift
3.  Beat03 Bridge--Water--Bridge + Temple without false connection
4.  Beat04 一次 progressive conflict reveal
5.  Beat04 Yihaosi temporal change
6.  Beat05 Return + Discovery / next question
7.  Follow-up Patch
8.  Approximate Area
9.  Historical Map Native（若实现）

自动测试全绿不等于视觉 PASS。

## 17. Readiness Gates

分别报告：

`EXPERIENCE_COMPOSITION_2_READY` - 五 Beat 已从 text-led reading
明显转为 visual/action-led exploration 才能 YES。

`SURFACE_COMPONENT_SYSTEM_READY` - reusable semantic Surface +
Registry + Composition Recipes 成立，且无 Jinze truth hardcode 才能
YES。

`SPATIAL_EXPRESSION_V2_READY` - Current Exact + Approximate Area +
Relational Historical 2.0 均诚实实现才 YES。

`HISTORICAL_MAP_NATIVE_PROTOTYPE` - YES / PARTIAL / NO
独立判断，不阻塞前三门。

`PATCH_NOT_REPLACE_UI` - 必须继续 YES。

## 18. Required Metrics

报告： - reusable Surface components 数； - Evidence-aware selection
rules 数； - eligible / blocked Surface canonical fixtures 数； -
Unknown/Question/Evidence-Gap fallback 状态； - Composition Recipes
数； - Experience Beats 数； - 8 semantic states → 5 Beats 映射； - 每
Beat Primary Surface； - 每 Beat 默认可见 narrative 字符数； - 最大
simultaneous narrative blocks； - progressive evidence reveals； -
Current Exact / Approximate Area / Relational Historical 2.0 /
Historical Map Native 状态； - historical coordinate leaks； -
fabricated historical geometry； - historical visual assets； - AI
historical visual paths； - DB writes/migrations； - Legacy writes； -
published/orphan invariants； - tests/E2E/typecheck/build/guards； -
capture paths； - commits； - tracked worktree status。

## 19. Hard Invariants

1.  TASK-0012/0012A 历史语义冻结。
2.  TASK-0013 Agent-driven state architecture 保持有效。
3.  Experience 2.0 是 composition layer，不是新 truth store。
4.  Surface reusable + semantic。
5.  reusable component 内无 town-specific historical truth。
6.  Legacy zero-write。
7.  DB zero-write / no migration。
8.  published unchanged。
9.  orphan 不增加。
10. fabricated historical geometry = 0。
11. historical visual assets = 0。
12. no AI historical imagery。
13. no modern coordinate as historical coordinate。
14. no fake historical map/river/street geometry。
15. T11-C1/C2 保持 conflict。
16. T11-C3 retired。
17. T11-C4 limited/attributed。
18. T11-C5 temporal semantics honest。
19. Primary Discovery = interpretation, not fact。
20. no E2→E1。
21. HR-MAP-01 = PARTIAL_CONFIRM。
22. 1879 p36 不升级。
23. no production Agent Runtime。
24. no general free-form chat。
25. no broad GIS reconstruction。
26. no video/TTS。
27. no multi-town expansion。
28. no new broad research campaign。
29. tests 验 semantic，不绑死像素。
30. Composition 不得绕过 Surface Eligibility。
31. 视觉丰富性不得成为 Evidence-ineligible Surface 的选择理由。
32. insufficient evidence 时允许"不画"。
33. Geometry itself is a Claim。
34. current geometry 不得自动继承为 historical geometry。
35. commit 后 tracked worktree clean。

## 20. Explicit Non-goals

不做最终品牌系统、全站重设计、传统首页、镇页、账户、Persistent
Memory、自由 LLM 对话、多镇扩展、完整 GIS 基建、全量历史地图配准、历史
3D、AI 历史图像、视频、TTS、独立移动端项目。

## 21. PASS Condition

用户应该感受到：

`看见 → 好奇 → 行动 → 世界变化 → 关系出现 → 缺失关系也有意义 → 追问原因 → Evidence Reveal → 时间改变对象 → 回到今天重新理解 → 墨痕提出解释 → 自然产生下一问题 → Existing Experience 被 Patch`

默认体验不能再像"带交互控件的研究报告"。

目标是：

> **墨痕在带我看、让我发现、在必要的时候才解释。**

架构上，未来体验必须能够通过重组 Surface Components
输出，而不是每个故事重新写网页。

## 22. STOP

完成 implementation、tests、E2E status、human visual
captures、result/readiness reports、commits、tracked worktree clean 后：

**STOP。不得启动 TASK-0015。**
