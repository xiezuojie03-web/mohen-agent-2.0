# CORRECTION-MAP-01 · 现有项目取舍 × 金泽导演稿映射 — Result

> Task ID：CORRECTION-MAP-01 ｜ 性质：READ-ONLY ANALYSIS / NO IMPLEMENTATION
> 基线：GOV-STATUS-AUDIT-01（已实测，不重做）；最高体验权威：《墨痕 Agent 2.0 · 金泽最小体验导演稿 V1.0》
> 审计对象：`D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0`（分支 `track/world-cultural-world-02` @ `dacc96d`）
> 事实来源：**当前 repo 真实文件 + 本次实际运行观测**（非治理文档转述）

---

## 0. 给项目负责人看的结论（10 行以内）

1. 金泽这条链的**工程和证据是真的**：8 场景全通、Patch-not-Replace 生效、冲突并列不替用户选边、"寺↔桥无线"表达正确——这些必须保留。
2. 但它现在**不像导演稿**，核心不是丑，是**主角选错了**：第一幕的主画面是抽象的经纬网加坐标术语，而不是"今天的金泽"。
3. 第一幕到第五幕的**能力大部分已经在 repo 里**（拓扑空间、时间景观、冲突比较、出处抽屉、坐标淡出、墨痕台词），缺的是**编排位置、主次关系和真实素材**，不是重做组件。
4. 第二幕的"时间真正后退"**只有一步跳变**（2026→1260–1267），连续后退所需的年刻度其实已经存在于 `TimelineSurface`，只是被放在第五、六场。
5. 第三幕的关系发现**呈现成研究图**，原因是把 4 档线型图例和语法说明句当成了主视觉交给用户读，而不是把"两桥同跨一条水道"当成一个画面事件。
6. 第四幕的可信性**最后一环断了**：1879/1788/1934 方志原件已采集入库，但体验里"史料原页"是一个空槽，用户点开只能看到"本机无合格史料图像可用"。
7. 第五幕回到今天后**没有任何历史痕迹保留**，s07 的画面和 s01 完全一样，导演稿要求的"再看一次它们"没有成立。
8. 第六步的"墨痕"**目前不是墨痕**：`agent-runtime` 是 1 行空壳且零 import，追问靠 4 组正则分类，页面上**没有任何输入框**，用户只能点 4 个冻结按钮。
9. 裁决总计：**KEEP 29 / BACKSTAGE 12 / STOP 7 / MISSING 9**；真正阻止体验成立的缺口 17 条（见 §10）。
10. 建议下一份施工任务**只做第一幕 + 第二幕前半**，边界见 §12；不要碰第三至五幕、不要做自由输入、不要扩数据。

---

## 1. 执行方式与只读证明

| 动作 | 性质 |
|---|---|
| 读 `ExperienceShell.tsx` / `beats.ts` / `surfaceRegistry.tsx` / `SpatialSurfaces.tsx` / `EvidenceNarrativeSurfaces.tsx` / `humanLabels.ts` / `intentTranslation.ts` / `IntentGuide.tsx` / `page.tsx`（体验页 + 首页） | 只读 |
| 读 `packages/experience-engine/src/*`（runtime 376 / evidence-aware-replan 490 / surface-eligibility 413 / composition-recipes 109 行） | 只读 |
| 读 `packages/agent-runtime` / `packages/ui` / `packages/data-access` / `packages/domain` | 只读 |
| 解析 5 个冻结 JSON（script / patch / state-sequence / cultural-world-008 / historical-spatial-slice） | 只读 |
| **启动 `next dev` :3111 + Playwright 实际走查 8 场景 + 追问交互**（截图 10 张 + 逐场景 innerText） | 运行观测 |
| `git status` / `git log` | 只读 |

**零修改证明**：任务结束时 `git status --short` 仍只有 3 个 GOV-STATUS-AUDIT-01 期已存在的未跟踪证据文件，**无任何 modified / staged 产品文件**。

**本次运行观测实测要点**（证据：`data/exports/correction-map-01/`，10 张截图 + `walkthrough.json`）：

- 首页 `/`：**0 个 `<a>` 链接**，文案自述"当前页面只是工程健康面，不是正式产品首页"。
- 体验页默认 Human 模式 8 场景全通；s01/s07 画布实测直出：`GCJ-02 原值`、`120.9196°E`、`31.0395°N`、`50 m（按切片声明跨度估读）`、`WGS-84 · 另一坐标系参考锚` ×3。
- s02 画布出现"当前坐标在此失去历史定位资格"常驻文字；s03/s04 拓扑说明**同屏出现两次**。
- s05 冲突卡页脚实测直出 `来源：008/cultural_conflicts`；证据闸门词"有条件可用 / 整条可用"重复出现 10+ 次。
- s07 画布 = s01 画布（同一张 GCJ-02 抽象图，无历史痕迹叠加）；照片需点"看今貌照片"才出现。
- 追问"那颐浩寺和普济桥以前真的有关系吗？"→ `IntentGuide` 出现，输出"现在还不能确定它们历史上有关系。今天相邻，不等于从前相连。"（内容正确，但入口是按钮，不是自由输入）。
- 控制台唯一报错：React duplicate-key（≥1 条，与 GOV-STATUS-AUDIT-01 D7 一致）。

---

## 2. A｜用户入口与页面（实测）

| 对象 | 当前作用 | 真实状态 | 与导演稿关系 |
|---|---|---|---|
| `apps/web/app/page.tsx`（`/`） | Foundation 工程健康面，4 项硬编码检查 | 生效；HTML 中 **0 个 `<a>`** | 导演稿 §1 明令"不先看到工程健康状态 / Foundation / Phase / 测试结果" |
| 首页 → 体验页入口 | — | **不存在**，用户必须手输 URL | 第一幕的前提：用户根本到不了 |
| `apps/web/app/experience/jinze-water-net/page.tsx` | 服务端读 4 个冻结 JSON + `checkFrozenInvariants`（fail loud） | 生效，`GET` 200 | 唯一真实体验入口，全幕底座 |
| `?inspector=1` 门控 | DEV 模式，默认隐藏 replan-card / transition-hint / relationKey | 生效（实测默认 `replan-card` = 0） | 技术语言的正确归宿已存在 |
| 顶部 timebar（Beat 编号 / 时间状态 / 空间模式） | 常驻 | 8/8 场景均显示 `Beat n/5 · m/8` | 第一、二、五幕的"后台语言外露"源头之一 |

**判定**：首页 STOP（不作为产品入口）；体验路由 KEEP；入口本身 MISSING；Beat 编号 BACKSTAGE。

---

## 3. B｜体验呈现组件（实测定位）

**空间**：`CurrentMapSurface`（`SpatialSurfaces.tsx:81-256`，GCJ-02 抽象经纬网 + 3 锚点 + 比例尺，无任何底图/瓦片）｜`ApproximateAreaSurface`（:261-302）｜`RelationalSpaceSurface`（:319-480，人文拓扑空间，E1 实线 / E2 虚线 / 被问到的关联画成**中断线**）｜`HistoricalMapNativeSurface`（:485-542，史料原页空槽）。

**时间**：`TimelineSurface`（`EvidenceNarrativeSurfaces.tsx:65-272`，实测年刻度 **1260 / 1267 / 1342 / 1938 / 1992 / 今**，毁损=断裂、原址重建=重起线、无年份事件挂轴外）。

**证据**：`EvidenceRevealSurface`（:282-409，按需揭示 + 008 片段闸门）｜`ConflictCompareSurface`（:414-469，双值并存不替用户选边）｜`SourceInspectSurface`（:474-495，出处抽屉，`sourceOpen` 控制、换场自动收起）。

**叙事/行动**：`QuestionSurface`（提问）｜`AgentPromptSurface`（墨痕短发言）｜`DiscoverySurface`（解释框架）｜`UnknownGapSurface`（"这一刻，墨痕选择不画"）｜`ActionDock` / `ExperienceShell.onAction`（`把寺也放进来` / `寺与桥有关系吗` / `看时间变化` / `看今貌照片` / `看史料原页` / 4 个 `追问：`）。

**追问收口**：`IntentGuide.tsx` + `intentTranslation.ts`（四类意图人话收口，实测输出正确）。

**视觉基础**：`lib/mohen-visual/spatial-canvas.tsx`（644 行）+ `visual-grammar.ts`（521 行）+ `label-layout.ts`（104 行）。

**人话化**：`humanLabels.ts`（113 行）——引擎内部值 → 人话的映射**已经存在且被 8 个组件调用**，只是默认 UI 仍有漏网（D1–D4）。

**判定要点**：
- 拓扑空间 / 时间景观 / 冲突比较 / 出处抽屉 / 墨痕台词 / 视觉语法库 = **KEEP**（这些就是导演稿第 3–5 幕的骨架）。
- `CurrentMapSurface` 退 **BACKSTAGE**：它是诚实的精确坐标视图，但绝不是"进入今天的金泽"该给的第一眼。
- 关系图例 7 项 + "实线＝有据；虚线＝候选…"说明句 = **BACKSTAGE**（研究图感的直接来源）。
- `BeforeAfterSurface` = **STOP**（历史侧恒空，`historicalVisualAssets = 0`，无弹药）。
- 第一幕版式（`.exp-canvas { min-height: 46vh }` + `.exp-stage { max-width: 1080px }` 文字舞台）= **STOP**：非全屏、文字占主位，与"地方先于文字"正面冲突。

---

## 4. C｜运行流程（真实链路，逐项标注是否动态）

```
浏览器 /experience/jinze-water-net
  → page.tsx（服务端）：读 4 个冻结 JSON → checkFrozenInvariants（失败即 throw）   【构建期冻结，非动态】
  → ExperienceShell.tsx（客户端导演层）
      · buildWorldEvidenceState(script, slice, {historicalVisualAssets:0, historicalMapImageAvailable:false}, projection)
      · Beat → evaluateSurfaceEligibility → resolveComposition → Surface Registry
  → reduceExperience（纯 reducer）：NEXT / PREV / FOLLOWUP_REPLAN / RETURN_TO_PRESENT / RESTART
  → 渲染：Primary / Secondary / Context Surface（一个时刻一个主角）
```

| 环节 | 真实动态选择？ | 说明 |
|---|---|---|
| 场景推进 NEXT/PREV | **否** | 8 个冻结场景线性推进，`sceneIndex ± 1` |
| 主角 Surface 选择 | **半动态** | `preferChain`（beat 偏好）逐项被 `selection.eligibleSurfaces` 过滤，ineligible 一律丢弃——**由证据裁决，不是写死** |
| `把寺也放进来` | **是（局部）** | `setTempleIncluded(true)` → `visibleNodes` 真实新增对象，不是换一张图 |
| `寺与桥有关系吗` | **否** | 返回冻结常量 `TEMPLE_BRIDGE_NON_ANSWER` |
| 问到的关联线 | **是** | `askedMissingRelation` → 画成**中断**的线（负空间），非文字声明 |
| 证据揭示 | **是（渐进）** | `revealed[]` 逐步 push，默认折叠 |
| 坐标退出 | **是** | `exiting` 保留上一幕画布 + `exp-canvas__fading--coords-out`（1100ms）淡出 |
| `FOLLOWUP_REPLAN` | **确定性规则** | `classifyFollowUp`（正则）→ `decideEvidence`（switch + world 查表）→ `planReplan`（switch 固定返回）→ `selectReplanSurface`。**同一追问永远同一结果**，无检索、无规划搜索、无生成 |
| `RETURN_TO_PRESENT` | **是** | 只关 replan 视角，trail / sceneIndex / 判定痕迹全保留（Patch-not-Replace） |

**判定**：引擎与导演层 KEEP；冻结 8 场景脚本与 `followup-patch.json` 分别是 BACKSTAGE / STOP；`classifyFollowUp` 这条"理解"路径 STOP。

---

## 5. D｜Agent 能力（严格区分四类）

| 能力 | 是否具备 | 证据 |
|---|---|---|
| **关键词分类** | ✅ 具备 | `evidence-aware-replan.ts:62-68` 四组正则：`RELATION_QUERY` / `EVIDENCE_QUERY` / `TEMPORAL_QUERY` / `PRESENT_QUERY` |
| **固定规则** | ✅ 具备 | `decideEvidence` 按意图 switch，A/B/C/D 各自返回**硬编码** known / unknown / missingEvidence 文案；`planReplan` 返回固定 `nextActions` |
| **预烘焙冻结内容** | ✅ 具备 | 4 个冻结 JSON；`ENTITY_NAME_ALIASES` 只有 3 个对象别名（颐浩寺/普济桥/万安桥）；4 个 `追问：` 按钮的问句写死在 `beats.ts:196-199` |
| **真正的理解当前问题** | ❌ 无 | `packages/agent-runtime/src/index.ts` = 1 行 `foundation-only`，**全 repo 零 import**；`packages/ui` 同 |
| **从已审核材料中选择下一步** | ❌ 无 | 体验页**零 DB 访问、零 fetch**；`packages/data-access`（psql 246 行）只被 pipeline 用；无检索层 |
| **决定主角呈现** | 🟡 半 | `selectReplanSurface` 由 EvidenceDecision 选 surface（真实），但**输入是 4 类意图的枚举**，不是对问题的理解 |
| **守住边界** | ✅ 具备且优秀 | E2 不升 E1、冲突并列不择一、`routeVerified` 恒 false、无证据就说"还不能"——**这块的规则层已经很好，不是缺口** |

**未匹配路径**：问句不含任何关键词 → `kind: "unknown"` → `decideUnknown` 直接返回"未能识别为可处理的追问意图"，**无澄清、无兜底追问**。
**自由输入**：`apps/web/app` 全量 **0 个 `<input>` / `<textarea>`**（grep 实测）。
**LLM**：`apps/web` + `packages/*` 对 `openai|deepseek|anthropic|chat/completions|fetch(` 全量 grep **零命中**。

---

## 6. E｜数据与证据

| 来源 | 状态 | 是否支撑导演稿 |
|---|---|---|
| `jinze-3min-experience-script.json`（45KB，8 场景） | 冻结副本，服务端 fail-loud 校验 | 支撑全幕编排，但**编排顺序是工程验证顺序**，不是导演稿体验顺序 |
| `jinze-historical-spatial-slice.json`（72KB） | features 5 / relations 8 / changes 5 / current_sources 6 / historical_sources 4 | **足够**支撑第一至五幕的最小叙事（"不到一公里"有数据：GCJ-02 跨度 ew 213m、ns 620m） |
| `jinze-cultural-world-008.json`（14KB：events 9 / claims 8 / meanings 2 / presents 2 / fragments 16 / conflicts 1） | 冻结副本，**`data/exports/` 无同名导出**（单点依赖） | 支撑第四幕双值冲突（1265 vs 1267） |
| PostgreSQL `mohen_dev` 28 表（evidence 185 / source_records 212 / 门禁审计 2205） | 真实 populated | **后台底座**；运行期零访问 |
| 方志原件 1879《青浦县志》/ 1788 / 1934 | **A_ACQUIRED**（含 p36 二里半方图索引、4800px 全页 OCR） | **弹药存在但未接入**：`historicalMapSource.imageAvailable = false`、`attributable = false` → 体验里史料原页是空槽 |
| Commons 当代照片 | 3 张（万安桥 / 普济桥 / 颐浩寺遗址，CC BY-SA 3.0） | 第一幕与第五幕唯一真实影像，但每对象仅 1 张 |
| 历史视觉资产 / 金泽历史地图 | **0 / 0** | 不得伪造；导演稿第二幕的"时代气氛"素材 MISSING |

**关键判读**：导演稿缺的**不是数据量**。寺↔桥关系、双值冲突、时间变化链、三处坐标都在库里且有证据；缺的是①史料原页未接入、②真实底图未接入、③运行期不读库因而"从材料里选下一步"无从发生。

---

## 7. F｜视觉资产（不假设不存在的素材）

| 资产 | 真实状态 |
|---|---|
| 真实底图 / 航拍 / 瓦片 | **MISSING**——`apps/web` 无 maplibre、无瓦片、无 basemap（grep 零命中） |
| 当代实景照片 | ✅ 3 张 Commons（第一幕只有万安桥 1 张进入画面，且位于次级位） |
| 史料原页图像 | **MISSING**（空槽；源资产已采集） |
| 历史地图配准 | **STOP**（HR-MAP-01 = PARTIAL_CONFIRM，1879 p36 不可归因于切片任一对象，配准即编造） |
| 抽象表达资产 | ✅ 拓扑空间 / 时间景观 / 近似区域 / 坐标淡出层 / UnknownGap —— 齐全且已实现 |
| 体验母版 | ✅ `specs/experience-ui/canonical/` 2 张 PNG；`evidence/M5-HUMAN-01_PreBaseline_Failure/` 录像（negative sample） |
| 视觉语法库 | ✅ 1269 行（spatial-canvas + visual-grammar + label-layout），可复用 |

---

## 8. 资产取舍总表（57 项）

> 裁决定义：KEEP=继续作为产品基础｜BACKSTAGE=保留但退出默认舞台｜STOP=技术上存在但不再投入｜MISSING=导演稿需要而当前不存在

| # | 对象 / 文件或模块 | 当前作用 | 真实状态 | 裁决 | 幕次 | 理由 | 后续施工 |
|---|---|---|---|---|---|---|---|
| A1 | `apps/web/app/page.tsx`（`/`） | Foundation 工程健康面 | 生效，0 个链接 | **STOP** | 全局/§1 | 导演稿明令不先看到工程健康状态 | 否（保留文件，不再作为入口投入） |
| A2 | 首页 → 体验页入口 | — | 不存在 | **MISSING** | 第一幕 | 用户必须手输 URL | **是** |
| A3 | `experience/jinze-water-net/page.tsx`（服务端读冻结 + 不变量校验） | 体验入口 | 生效 | **KEEP** | 全部 | fail-loud 是可信性资产 | 否 |
| A4 | `?inspector=1` DEV 门控 | 隐藏内部诊断 | 生效 | **KEEP** | 全部 | 技术语言已有正确归宿 | 否 |
| A5 | 顶部常驻 `Beat n/5 · m/8` | 制作层进度 | 8/8 常驻 | **BACKSTAGE** | 全部 | AP-01 制作层编号外露 | **是**（并入 devMode） |
| A6 | 顶部时间状态 / 空间模式标签 | 时代与空间语境 | 生效 | **KEEP** | 一/二/五 | 人话化后即导演稿要的"时代感" | 否 |
| A7 | 全站第二屏 / 导航 | — | 不存在 | **MISSING** | 第六步 | 无第二屏，探索无处可去 | 是（后续阶段） |
| B1 | `CurrentMapSurface`（GCJ-02 抽象经纬网 + 3 锚点） | 第一幕主角 | 生效但无底图 | **BACKSTAGE** | 第一幕 | 精确坐标视图有价值，但不是"进入金泽"的第一眼 | **是**（另建今日主角） |
| B2 | GCJ-02/WGS-84 术语 + 6 位坐标 + 经纬刻度 + 参考锚×3 | 诚实坐标系标注 | 默认直出 | **BACKSTAGE** | 一/二 | D1；导演稿要求"不显示坐标系" | **是** |
| B3 | `RelationalSpaceSurface`（拓扑空间） | 第三幕主角 | E1 实线/中断线已通 | **KEEP** | 第三幕 | 桥—水有据、寺桥缺席均正确表达 | 否（仅减图例） |
| B4 | 关系图例 7 项 + "实线＝有据…"说明句 | 语法解释 | 默认常驻 | **BACKSTAGE** | 第三幕 | 研究图感直接来源 | **是**（压到 3 项） |
| B5 | s03/s04 拓扑说明同屏重复渲染 | 双 surface 对照 | 实测出现两次 | **STOP** | 第三幕 | D5，破坏主视觉唯一性 | **是** |
| B6 | `TimelineSurface`（时间景观） | 第四幕主角 | 6 个年刻度已具备 | **KEEP** | 二/四幕 | 连续时间结构已实现 | **是**（前移到第二幕） |
| B7 | `ConflictCompareSurface`（双值并存） | 第四幕核心 | 不替用户选边 | **KEEP** | 第四幕 | 认识论表达正确 | 否 |
| B8 | `EvidenceRevealSurface`（按需揭示） | 证据渐进展开 | 生效 | **KEEP** | 第四幕 | Evidence on Demand 已实现 | 否 |
| B9 | 证据片段闸门文案（有条件可用/整条可用 ×10+） | 片段级放行标记 | 默认直出 | **BACKSTAGE** | 第四幕 | D2，像档案管理系统 | **是** |
| B10 | `来源：008/cultural_conflicts` 库表 ID | 溯源 | 默认直出 | **BACKSTAGE** | 第四幕 | D3 | **是** |
| B11 | `SourceInspectSurface`（出处抽屉） | 按需查看出处 | 换场自动收起 | **KEEP** | 第四幕 | 证据是"打开的一层"已成立 | 否 |
| B12 | `HistoricalMapNativeSurface`（接口） | 史料原页空间 | 空槽 | **KEEP** | 第四幕 | 结构与纪律正确（不配准、不叠底图） | **是**（填内容） |
| B13 | `CurrentPhotoSurface`（3 张 Commons 照） | 今貌 | 生效，第一幕仅 1 张在次级位 | **KEEP** | 一/五幕 | 唯一真实影像 | **是**（提升为主角） |
| B14 | `BeforeAfterSurface` | 今昔对照 | 历史侧恒空 | **STOP** | 第五幕 | 历史视觉资产=0，无弹药 | 否 |
| B15 | `UnknownGapSurface` | "墨痕选择不画" | 生效 | **KEEP** | 全幕 | 可信性资产 | 否 |
| B16 | `QuestionSurface` / `AgentPromptSurface` | 墨痕提问与短发言 | 台词已接近导演稿 | **KEEP** | 一/三/五 | "两座古桥、一处宋寺遗址，今天为什么离得这么近？"已对齐 | 否（微调） |
| B17 | `ActionDock` / `onAction` 行动集 | 状态转移式行动 | 生效 | **KEEP** | 三/四/六 | 行动不是跳页，方向正确 | **是**（加自由输入） |
| B18 | `IntentGuide` + `intentTranslation` | 四类意图人话收口 | 输出正确 | **KEEP** | 第六步 | 骨架对，输入错 | **是**（换输入源） |
| B19 | `humanLabels.ts` | 内部值→人话 | 8 个组件调用 | **KEEP** | 全部 | 门控基础设施已存在 | 否 |
| B20 | `lib/mohen-visual/*`（1269 行） | 视觉语法与画布 | 生效 | **KEEP** | 全部 | 可复用表达资产 | 否 |
| B21 | `exp-canvas__fading--coords-out` 退场层 | 坐标淡出 | 生效（1100ms） | **KEEP** | 第二幕 | "精确点失去权威"已视觉化 | **是**（延长为连续后退） |
| B22 | "当前坐标在此失去历史定位资格"常驻文字 | epistemic 提示 | 5 个场景常驻 | **BACKSTAGE** | 第二幕 | D6；导演稿要求用淡出表达、不用技术说明占屏 | **是** |
| B23 | 版式 `canvas 46vh + stage 1080px` | 布局 | 生效 | **STOP** | 第一幕 | 非全屏、文字占主位 | **是**（重建第一幕版式） |
| C1 | 服务端读 4 冻结 JSON + `checkFrozenInvariants` | 冻结校验 | 生效 | **KEEP** | 全部 | fail-loud | 否 |
| C2 | `ExperienceShell`（useReducer + useMemo 编排） | 导演层 | 生效 | **KEEP** | 全部 | Beat→Eligibility→Composition 链路正确 | 否 |
| C3 | `@mohen/experience-engine`（1519 行） | 体验控制层 | 生效 | **KEEP** | 全部 | 复用价值最高的一层 | 否 |
| C4 | 8 场景冻结脚本 / state-sequence | 预烘焙体验 | 生效 | **BACKSTAGE** | 全部 | 可证明流程，不得冒充 Agent | 否 |
| C5 | `jinze-3min-experience-followup-patch.json` | 冻结答案补丁 | 已被 runtime 让位 | **STOP** | 第六步 | 代码已注"冻结结果不得冒充 runtime 输出" | 否 |
| C6 | `FOLLOWUP_REPLAN` 编排骨架 | 追问→世界修补 | 确定性 | **KEEP** | 第六步 | Patch-not-Replace 与 surface 重选已正确 | **是**（替换意图判定） |
| C7 | `RETURN_TO_PRESENT` / Patch-not-Replace | 关闭证据不重置 | 生效 | **KEEP** | 四/五幕 | 导演稿第四幕硬要求已满足 | 否 |
| C8 | vitest 253 / Playwright 4 | 工程健康 | 全通过 | **BACKSTAGE** | 全部 | 只证明程序没坏 | 否 |
| D1 | `packages/agent-runtime`（1 行，零 import） | — | 空壳 | **MISSING** | 第六步 | 真正的理解/选择层 | **是**（导演稿 C 步） |
| D2 | `packages/ui`（1 行） | — | 空壳 | **MISSING** | 全部 | 无共享 UI 层 | 是（低优先） |
| D3 | `ENTITY_NAME_ALIASES`（3 个硬编码别名） | 对象识别 | 生效 | **BACKSTAGE** | 第六步 | 硬编码词表，非理解 | 否 |
| D4 | `classifyFollowUp` 4 组正则 | 意图判定 | 生效 | **STOP** | 第六步 | 关键词分类不是"听懂"；继续加正则只会让假理解更真 | **是**（替换，保留为降级兜底） |
| D5 | 运行期 DB 读取 | — | 不存在 | **MISSING** | 第六步 | 体验页零 DB、零 fetch | **是** |
| D6 | 检索 / 规划 / LLM 调用 | — | 零命中 | **MISSING** | 第六步 | 无 openai/deepseek/fetch | **是** |
| D7 | `packages/data-access`（psql 246 行） | 构建期读库 | 仅 pipeline 用 | **KEEP** | 后台 | 底座已在，可升为运行期读库 | 否 |
| E1 | 5 个冻结 JSON | 运行期唯一真源 | 生效 | **KEEP** | 全部 | 体验输入 | 否（008 需补 exports 副本） |
| E2 | PostgreSQL `mohen_dev` 28 表 | 证据底座 | 真实 populated | **BACKSTAGE** | 全部 | 可信性基础，不应在默认舞台 | 否 |
| E3 | 金泽切片（features 5/relations 8/changes 5/anchors 6） | 世界状态 | 生效 | **KEEP** | 全幕 | 足够支撑最小叙事 | 否 |
| E4 | 方志原件 1879/1788/1934（A_ACQUIRED） | 史料弹药 | 已采集**未接入** | **KEEP** | 第四幕 | 弹药存在 | **是**（接入原页） |
| E5 | Commons 3 张当代照片 | 今貌 | 生效 | **KEEP** | 一/五幕 | 唯一真实影像 | 否 |
| E6 | 历史视觉资产 / 金泽历史地图 | — | **0 / 0** | **MISSING** | 二/四幕 | 不得伪造；第二幕时代气氛无素材 | 是（或明确保留为空并诚实标注） |
| F1 | 真实底图 / 航拍 / 瓦片 | — | 不存在 | **MISSING** | 第一幕 | 第一幕要"真实地图/航拍" | **是** |
| F2 | 史料原页图像 | 空槽 | 不可渲染 | **MISSING** | 第四幕 | "凭什么"没有实物 | **是** |
| F3 | 历史地图配准表达 | 禁止 | HR-MAP-01 PARTIAL | **STOP** | 第二幕 | 再投入即走向编造 | 否 |
| F4 | 拓扑图/时间景观/近似区/退场层/UnknownGap | 抽象表达 | 齐全 | **KEEP** | 二/三/五/六 | 抽象能力是本项目最强资产 | 否 |
| F5 | `specs/experience-ui/canonical/` 2 张 PNG | 体验母版 | 在位 | **KEEP** | 全幕 | TASK-0014 视觉权威 | 否 |
| F6 | `M5-HUMAN-01_PreBaseline_Failure` 录像 | 反例 | 在位 | **BACKSTAGE** | 全部 | negative canonical sample | 否 |

**计数：KEEP 29 ｜ BACKSTAGE 12 ｜ STOP 7 ｜ MISSING 9**

---

## 9. G｜导演稿逐幕映射

### 第一幕｜进入今天的金泽（30–45s）

- **现有可复用**：`beats.ts` beat-01-hook（intent / defaultUnitIds / actions 已定义且台词已对齐）；`AgentPromptSurface` 台词"两座古桥、一处宋寺遗址，今天为什么离得这么近？"；`CurrentPhotoSurface`（万安桥 Commons 照 + `commonsDirectUrl` 直链实现）；`visual-grammar.ts` + `spatial-canvas.tsx`；`humanLabels.ts`；`surfaceRegistry` + engine（新主角可直接挂载）；切片跨度数据（ew 213m / ns 620m，"不到一公里"有据）。
- **当前阻碍**：主画面 = 抽象经纬网 + GCJ-02/WGS-84 术语 + 6 位坐标 + 比例尺 + 参考锚×3；照片在次级位；canvas 仅 46vh、下方 1080px 文字舞台；三处遗存一次性静态渲染（无依次点亮）；`Beat 1/5 · 1/8` 常驻；首页无入口。
- **真正缺失**：真实底图/航拍；三处依次点亮的时序；全屏/近全屏版式；首页入口。
- **最小施工范围**：新增"今日金泽主角"Surface（照片/底图为主体 + 三处依次点亮 + 唯一主行动"回到南宋"）；`current_map` 退到 `?inspector=1`；D1–D4 并入 devMode；首页加一条入口。**不碰第三至五幕。**

### 第二幕｜时间真正后退（30–45s）

- **现有可复用**：`spatial_mode` 由 `GEOGRAPHIC_EXACT` → `RELATIONAL_HISTORICAL` 是**数据字段真实切换**；`exp-canvas__fading--coords-out` 已把精确坐标层整体淡出（CSS 已定义且生效）；`TimelineSurface` 已有 1260/1267/1342/1938/1992/今 六个真实年刻度；冻结不变量禁止 `RECONSTRUCTED_HISTORICAL`、禁止 `GEOGRAPHIC_EXACT` 出现在历史场景（服务端强制）。
- **当前阻碍**：时间从 2026 **一步跳**到 1260–1267，无 1992/1938/1342 中间档；年刻度只在 s05/s06（第四幕），不在第二幕；"不知道历史精确位置"靠常驻文字表达。
- **真正缺失**：连续后退的时间序列编排；时代气氛素材（历史视觉资产 0 / 历史地图 0）。
- **最小施工范围**：复用 `TimelineSurface` 已有年刻度，把已有淡出层从 1100ms 延长为 2026→1992→1938→1342→1260–1267 的分档后退；常驻文字退为 devMode；时代气氛**明确留白**（不伪造素材）。

### 第三幕｜关系被发现（40–60s）

- **现有可复用**：`RelationalSpaceSurface` 已实现 E1 实线（两桥同跨一条水道）、被问到的关联画成**中断线**（`absent-relation`）、"把寺也放进来"是真实的对象新增（`visibleNodes`）。
- **当前阻碍**：7 项图例 + "实线＝有据；虚线＝候选；点线＝弱线索；断开＝…"说明句成为主视觉；s03/s04 同屏重复渲染；寺进入后墨痕台词与画面事件**无变化**（s03/s04 台词相同）。
- **真正缺失**："两桥同跨一条水道"作为**一个画面事件**（而非图例语法）的表达；寺进入后的新台词与新画面事件。
- **最小施工范围**：图例压到 3 项人话；去掉同屏重复；给寺进入补一句墨痕台词与一次画面事件。**不动 epistemic 逻辑。**

### 第四幕｜我为什么相信你（50–80s）

- **现有可复用**：`ConflictCompareSurface` 双值并存（1267 ↔ 1265）不替用户选边；`SourceInspectSurface` 抽屉按需、换场自动收起；`EvidenceRevealSurface` 渐进揭示；`Patch-not-Replace` 保证关闭证据后世界不重置；`?inspector=1` 已把 verdict / epistemic / relationKey 全部门控。
- **当前阻碍**：史料原页是**空槽**（`imageAvailable = false`）；证据闸门词与库表 ID 仍在默认 UI；"当前坐标在此失去历史定位资格"常驻。
- **真正缺失**：史料原页图像接入（1879/1788/1934 已 A_ACQUIRED）；"一次只比较一个矛盾"的呈现收口。
- **最小施工范围**：把已采集的方志原页接入 `HistoricalMapNativeSurface`（不配准、不叠底图）；闸门词 + 库表 ID + 常驻 epistemic 文字并入 devMode。

### 第五幕｜重新看今天（30–45s）

- **现有可复用**：`s07` 回到 `GEOGRAPHIC_EXACT` 的空间切换是真实的；三种去向中的"继续追问/换关系"已由 4 个追问按钮承载；`DiscoverySurface` 的解释框架与未决对点表达正确。
- **当前阻碍**：**s07 画面与 s01 完全相同**，无任何历史痕迹叠加（无"刚才看见过什么"的可切换层）；照片需点击才出现；"去现场走一段"只有文字建议（`routeVerified = false`，无路线层/现场图层）。
- **真正缺失**：今日画面上的极轻历史痕迹层（水道关系 / 时间痕迹 / 刚才看见过什么）；真实的现场观察层。
- **最小施工范围**：在 s07 叠加一层可切换的"刚才看见过什么"（复用已有 relations / changes 数据）；现场去向保留为受约束建议，**明确不承诺路线**。

### 第六步｜继续探索（非固定第六幕）

- **现有可复用**：`IntentGuide` + `intentTranslation` 的四类意图人话收口（关系/证据/时间/现场）**骨架正确**；`selectReplanSurface` 由 EvidenceDecision 选主角是真实的；边界守住（不升 E1 / 冲突并列 / routeVerified=false）已经很好。
- **当前阻碍**：无自由输入（0 个 input/textarea，只能点 4 个冻结按钮）；意图 = 4 组正则；`agent-runtime` 空壳；运行期零读库。
- **真正缺失**：① 意图理解（非正则）；② 自由输入；③ 运行期检索/读库；④ "从已审核材料里选下一步"的选择器。
- **最小施工范围**：**不在本轮**。导演稿冻结顺序 C 步（先补墨痕最小能力）在 D 步（重建舞台）之前，但 Architect 若签第一份施工任务，建议先做 A/B 步（取舍 + 第一、二幕），C 步单独立项。

---

## 10. 导演稿缺口表（只列真正阻止体验成立的缺口）

| # | 幕次 | 缺口 | 证据 |
|---|---|---|---|
| G-1 | 第一幕 | 主画面无真实底图/航拍，只有抽象经纬网 | grep 零 maplibre/瓦片；实测 s01 画布文本 |
| G-2 | 第一幕 | 三处遗存一次性静态渲染，无"依次点亮" | `CurrentMapSurface` 循环一次性 push，无时序 |
| G-3 | 第一幕 | 真实照片不在主画面（仅 1 张在次级位） | 实测 s01 stage 文本；`visual_assets` 仅 1 张 |
| G-4 | 第一幕 | 首页无入口，用户必须手输 URL | 实测首页 `<a>` = 0 |
| G-5 | 第二幕 | 无 2026→1992→1938→1342→1260–1267 连续后退（一步跳） | `scenes[1].time_state` 直接为 1260–1267 |
| G-6 | 第二幕 | "不知道历史精确位置"用常驻技术文字表达 | 实测 5 个场景常驻"当前坐标在此失去历史定位资格" |
| G-7 | 第二幕 | 无时代气氛素材（历史视觉资产 0 / 历史地图 0） | `visual-readiness`；`historicalVisualAssets=0` |
| G-8 | 第三幕 | 4 档线型图例 + 语法说明句成为主视觉（研究图感） | `SpatialSurfaces.tsx:450/475` + `VisualLegend` 7 项 |
| G-9 | 第三幕 | 寺进入后无新台词、无新画面事件 | `beats.ts` beat-03 的 mohen 两句在 s03/s04 相同 |
| G-10 | 第三幕 | s03/s04 同屏重复渲染 | 实测 canvas 文本重复两次 |
| G-11 | 第四幕 | 史料原页为空槽，"凭什么"没有实物 | `imageAvailable=false`；卡片显示"本机无合格史料图像可用" |
| G-12 | 第四幕 | 证据闸门词 / 库表 ID 仍在默认 UI | 实测"有条件可用"×10+、`来源：008/cultural_conflicts` |
| G-13 | 第五幕 | 回到今天后无任何历史痕迹（s07 = s01） | 实测两场画布文本完全一致 |
| G-14 | 第五幕 | "去现场走一段"只有文字建议，无现场层 | `routeVerified=false`；无路线/现场 Surface |
| G-15 | 第六步 | 无自由输入，只能点 4 个冻结按钮 | `apps/web/app` 全量 0 个 input/textarea |
| G-16 | 第六步 | 意图=关键词正则，非理解 | `evidence-aware-replan.ts:62-99` |
| G-17 | 第六步 | 运行期零检索/读库，"从材料里选下一步"不存在 | 体验页零 DB、零 fetch；data-access 仅 pipeline 用 |

> 说明：美化、文案润色、数据字段扩充**未混入**本表。G 级缺口均为"遮掉文字后体验仍不成立"级别。

---

## 11. 必须回答的 8 个问题

**Q1. 明天只重建金泽第一幕，哪些现有文件/组件可直接复用？**
`beats.ts` beat-01-hook（intent/actions 已定义，主行动"回到它们刚出现的时代"已存在）｜`AgentPromptSurface` + `QuestionSurface`（台词已对齐）｜`CurrentPhotoSurface` + `commonsDirectUrl()`（Commons 直链已实现）｜`lib/mohen-visual/spatial-canvas.tsx` + `visual-grammar.ts` + `label-layout.ts`（1269 行）｜`humanLabels.ts`（人话映射）｜`surfaceRegistry.tsx` + `@mohen/experience-engine`（新 Surface 直接注册即可挂上）｜`experience.css` 的 `exp-canvas__fading` 转场｜切片 `spatial_extent_current`（213m/620m，"不到一公里"有据）｜`page.tsx` 的服务端冻结校验（不用改）。
**需新建**：今日主角 Surface（真实影像/底图）、依次点亮时序、首页入口。

**Q2. 第一幕为什么目前不像 TASK-0014？是素材、布局、运行逻辑还是任务目标？**
四者都有，但**主因是任务目标 + 素材**：①目标——TASK-0014 的目标是"建立可复用 Surface 组件系统 + 降低阅读负担"，不是"让第一眼像在探索一个地方"，工程正确性优先于现场感，所以 `current_map`（最诚实的组件）被选为第一幕主角；②素材——无底图/瓦片，照片仅 1 张且在次级位；③布局——canvas 46vh + 1080px 文字舞台，非全屏，与"地方先于文字"正面冲突；④运行逻辑——`preferPrimaryByScene`/`primaryPreference` 把 `current_map` 排在第一位，且 eligibility 不会否决它（它合法），所以逻辑没错、选角错了。

**Q3. 从今天切到历史的第二幕，哪些能力已有，哪些只是视觉替代？**
**已有（真实能力）**：`spatial_mode` 数据字段真实切换；`exp-canvas__fading--coords-out` 把精确坐标层整体淡出（真实视觉表达）；`hasHistoricalGeometry = false` 恒真且服务端不变量禁止历史场景出现 `GEOGRAPHIC_EXACT`/`RECONSTRUCTED_HISTORICAL`；`TimelineSurface` 六个真实年刻度。
**只是视觉替代/不足**：连续后退不存在（一步跳）；年刻度被放在第四幕而非第二幕；"不知道历史精确位置"目前靠常驻文字而非淡出表达；时代气氛素材为零（第二幕的气氛层是空的，不是"替代"，是"没有"）。

**Q4. 关系发现为什么呈现成研究图，而不是用户发现？代码在哪里？**
`SpatialSurfaces.tsx:319-480` 的 `RelationalSpaceSurface`：caption "人文拓扑空间 · 无经纬度 · 不表达距离与走向"（:450）+ `VisualLegend` 7 项（水系骨架/跨越节点/文化节点/已证/候选（未落定）/弱线索/无线，:461-471）+ 语法说明句"实线＝有据；虚线＝候选；点线＝弱线索；断开＝被问到的连接还没有证据"（:475），并在 s03/s04 同屏重复渲染两次。
根因：组件把**证据语法**（给审图人看的 4 档线型）当成主视觉交付给用户，而把"两桥同跨同一条水道"这个**发现**只当作其中一条线。用户读到的是"这里有四种线"，而不是"原来两座桥跨的是同一条河"。

**Q5. 证据系统如何保留可信性，同时退出默认舞台中央？**
可信性机制**已经全部在位且门控基础设施已存在**：渐进揭示（`revealed[]` + "展开这一刻的证据（还有 N 条未显示）"）｜出处抽屉按需且换场自动收起｜冲突需点击才展开且不替用户选边｜`Patch-not-Replace`（关闭证据世界不重置）｜`?inspector=1` 已把 verdict / epistemic class / relationKey / Beat 编号 / 伪公式全部内部门控化（R1–R5 模式）。
**所以做法不是重写，而是把 D1–D4 + 证据闸门词 + 库表 ID 并入同一个 `ctx.devMode` 门控**，并把证据入口收敛到一个"凭什么？"行动。保留 `UnknownGapSurface` 与"墨痕不替你选边"——这两句是可信性资产，不能删。

**Q6. 真正的墨痕最小能力缺哪几块？**
四块：①**意图理解**（`agent-runtime` 1 行空壳、零 import；`classifyFollowUp` 仅 4 组正则 + 3 个硬编码别名；未匹配时直接返回"未能识别"，无澄清兜底）；②**自由输入**（`apps/web/app` 全量 0 个 input/textarea）；③**运行期检索/读库**（体验页零 DB 零 fetch，`data-access` 只被 pipeline 用）；④**从已审核材料中选下一步的选择器**（`decideEvidence`/`planReplan` 是 switch + 固定返回，`nextActions` 是硬编码文案，没有"在 N 条材料里挑最相关"这一步）。
**注意**：导演稿第四项"守住边界"**已经具备**（不升 E1、冲突并列、无证据说不知道、`routeVerified=false` 恒 false）——这块是已有能力，不是缺口。

**Q7. 哪些当前实现即使技术正确，也不该继续投入？**
`/` 工程健康首页（作为产品入口方向错误）｜`BeforeAfterSurface`（历史侧恒空，无弹药）｜`followup-patch.json` 冻结答案补丁（已被 replan 让位，维护即重复）｜`classifyFollowUp` 正则的**继续扩展**（加正则只会让"假理解"更像真的）｜历史地图配准表达（HR-MAP-01 PARTIAL，再投入即走向编造）｜第一幕 46vh + 1080px 文字舞台版式的打磨（版式方向本身要换）｜证据闸门/坐标系术语的**逐句文案优化**（应整体门控，不是逐句改人话）。

**Q8. 若只允许下一份施工任务做一个窄切片，最合理的边界是什么？**
**范围＝"第一幕 + 第二幕前半（进入今天的金泽 → 时间开始后退）"**，六条边界：
1. 为第一幕新增一个"今日金泽主角"Surface：真实影像/底图为画面主体，万安桥、普济桥、颐浩寺遗址**依次点亮**，"回到南宋"为唯一主行动；`CurrentMapSurface` 退到 `?inspector=1` / 按需。
2. 首页只加**一条**通往体验页的入口；不重做首页、不做产品化首页。
3. 把 D1–D4（GCJ-02/WGS-84 术语与原始坐标、证据闸门词、库表 ID、Beat 编号）并入既有 `devMode` 门控，沿用 R1–R5 模式，不动引擎。
4. 把已有的 `exp-canvas__fading--coords-out` 从 1100ms 延长为 2026→1992→1938→1342→1260–1267 的分档后退，复用 `TimelineSurface` 已有年刻度。
5. 常驻 epistemic 文字退为 devMode，改由淡出表达。
6. 交 3 张真实截图（第一幕首屏 / 点亮过程中 / 后退中）+ 一段录像，与导演稿第一、二幕逐条对照。
**明确不在范围内**：第三至五幕重建、自由输入、`agent-runtime`、数据扩充、第二古镇、全站重构、首页产品化。

---

## 12. 工作区变化（只读证明）

| 项 | 状态 |
|---|---|
| 产品代码 / UI / 路由 / 数据库 / schema / migration / seed / 配置 / 测试 / 设计资产 | **零改动** |
| `git status --short` | 仍只有 3 个 GOV-STATUS-AUDIT-01 期已存在的未跟踪证据文件，**无 modified / 无 staged** |
| 新增（本次唯一交付与只读附件） | `tasks/results/CORRECTION-MAP-01-result.md`；`data/exports/correction-map-01/`（10 张截图 + `walkthrough.json`，`data/exports/*` 已 gitignore） |
| 运行期副产物 | `apps/web/.next/`（`node_modules/`、`dist/`、`.next/` 已 gitignore）；dev server 已停止 |

---

**STOP**
本任务到此结束。未修复任何已发现问题（D1–D7、duplicate-key、史料原页空槽、首页无入口等均仅记录不处理），未修改任何产品文件，未接大模型，未扩数据，未做第二古镇，未自行启动下一任务。下一份施工任务待 Architect 签发。
