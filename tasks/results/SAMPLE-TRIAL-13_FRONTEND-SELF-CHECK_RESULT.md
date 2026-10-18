# 前端视觉自检报告（SAMPLE-TRIAL-13）

> 日期：2026-10-17
> 性质：**只读自检 + 诊断**。未写库、未部署、未改任何前端代码；方法 = 读前端代码 + 查 read_model 真实数据 + 实测追问 API + 真实前端预览（IDE 内置浏览器，`http://localhost:3000/experience/jinze-water-net`，请 Owner 同看）。
> 红线复核：全程只读 SELECT / GET / POST 追问接口；未碰 hushang-jingwei Production；未伪造历史事实。

---

## 〇、一句话结论

**数据侧全部属实，但"真实产出"只到达顶栏徽章，没有进入世界本身。** 舞台上演的仍是旧冻结 JSON 的全部内容；真实数据生产链的 7 实体 / 7 关系 / 4 发现 / 3 故事种子 / 4 证据指针，在画面里一处都看不到。同时，墨痕 Agent 的追问回答已接上真实库，但裁决逻辑有两个确定性缺陷，导致"寺与桥有关系吗"这类问题**答反了**——嘴上说"有据可依"，画面里却画着"还没有一条线"，体验自相矛盾。

---

## 一、顶栏徽章（指令 §4.3）

**正常。** 实测链路与数据：

- `page.tsx` 服务端调 `readProductionRelationSummary()`（`apps/web/lib/read-model-bridge.ts`），只读 `read_model.world_projections` + `control.gate_audits`（G5 PASS · current_valid · consumer='visual_stage'）；
- 库中实查：world_projection 1 条（`jinze-layer1-world`，7 实体 / 7 关系）、story_seeds 3 条、evidence_pointers 4 条，G5 双消费端（visual_stage / agent）均 PASS；
- 徽章渲染于 `ExperienceShell.tsx` 顶栏右侧，文案「真实产出 · 7 实体 · 7 关系」，数字与库一致。

**但徽章是目前真实数据唯一的落点**——这正是问题 P1（见第三节）。

---

## 二、逐场景走查结果（指令 §4.1）

画面内容来源：`data/experience/jinze-3min-experience-script.json`（8 场景叙事）+ `jinze-historical-spatial-slice.json`（5 对象 / 8 关系 / 5 变化）+ 008 文化投影副本。**三者全部是冻结 JSON；真实生产数据未注入任何一个 Surface。**

| 场景 | 现状（实际主角/文字/证据） | 对照 C4 应然 | 问题定位 |
|---|---|---|---|
| s01 当下钩子 | 主角=坐标网格三点图（经纬网框+3 锚点+比例尺+指北，无底色地物）；底部 3 张今貌照片条；右侧钩子问题；叙事默认 0 条（按需揭示） | Space Before Text 达标（文字克制、证据按需）；但 C4 §16 要求"先给一张足够强的图像建立情绪"，§24 永久反模式明确列有「坐标网格第一视觉：地点被抽象成技术对象」 | **第一幕主角是网格+三个点，不是金泽的现场感**； beats.ts:145 注释写明这是 v0.3 的刻意取舍（诚实优先），属产品方向权衡 → 决策 D1 |
| s02 时间穿越 | 主角=关系空间；现代坐标淡出退场动画+"当前坐标在此失去历史定位资格"提示；默认仅 1 条交互提示可见 | Show→Question→Reveal、认知节奏达标 | 无突出问题 |
| s03 桥水关系 | 主角=人文拓扑空间（水系骨架+两桥跨越节点，E1 实线）；寺默认不进画面 | 空间先于文字、渐进揭示达标 | 内容来自冻结切片（金泽塘/两桥）；真实产出中的"姐妹桥""迎祥桥"不在画面 |
| s04 寺登场 | 点"把寺也放进来"后寺节点浮现（emerging）；寺↔桥 E2 虚线 | Agent Changes the World 的雏形（行动改变世界）达标 | 同上，演的全是旧数据 |
| s05 证据揭示 | 主角=冲突并列（T11-C1/C2 着录冲突，须逐组点开）+008 双值冲突卡；证据默认不倾倒 | Evidence on Demand、冲突不选边达标 | 冲突内容全部来自旧冻结；真实链的 4 条证据指针原文（方志原句）未接入 |
| s06 时间变化 | 主角=时间景观 V3（生命线/断裂/重建/未知占位）；1342 廊亭、1938 毁损、1992 重建都有 | 时间即叙事镜头达标 | 时间内容全部来自旧冻结；真实链未产出时间投影被消费（map_timeline_projections 检索路存在但本页不读） |
| s07 回到当下 | 主角=今貌照片/当前地图；现场观察提示 | Return to Present 达标 | 照片为 Wikimedia 外链策展清单（旧策划产物），与真实产出无关 |
| s08 追问收口 | 主角=Discovery 解释框架，徽标"墨痕的解释 / 尚未证实"+未决对点 | 事实/解释分层达标（本页最守边界的一幕） | 主发现文本是冻结 JSON 里的旧表述；真实链 D04 的 4 条新发现（地名层积/成对渡口结构/纪念双重属性/两层未必同步）一条都没出现 |

**小结**：冻结体验本身的 C4 合规度不低（有 e2e 约束）。真正的问题不在单场景细节，而在**两层错位**：
1. **"真实产出"只到徽章**：画面里没有一处内容来自真实数据链，徽章宣称的 7 实体/7 关系与世界内容无对应（世界画的是 5 对象/8 关系的旧切片，连谓词都不一样：`sister_bridge_with` vs 冻结的 `spans_same_waterway`，真实链连"水道"实体都没有）；
2. **Owner 要的内容看板缺位**：按 Owner 既定偏好（原始资料 → AI 读出 → 发现 → 可讲的故事），真实产出本应成为新的主角内容层，目前没有任何 Surface 承载它。

---

## 三、墨痕 Agent 走查结果（指令 §4.2）

### 3.1 数据来源：是真数据（属实）

实测 `POST /api/mohen/ask`（dev server 实跑）：

- 链路：`AskBar → /api/mohen/ask → retrieve.ts（read_model 六路 UNION，仅 G5 PASS · consumer='agent'）→ decideStep`；
- 返回的 materials 确为库中真实行（证据指针原文「南宋景定年间建（万安桥），与普济桥一北一南同跨一河，形制相仿，并称'姐妹桥'」等），非冻结 JSON、非编造；
- 库不可用时走 `degraded` 明示路径（代码已守）。

### 3.2 但裁决逻辑有两个确定性缺陷（实测复现）

**实测 1：问「寺和桥真的有关系吗？」** → 回答：「它们之间这一条是有据可依的。金泽古桥·寺院·水道（第一层真实闭环）」，verdict=answered；同一条响应的 gaps 却写「没有登记到这条对象对的历史关系」。

- **答反了**。真实库里寺↔桥没有任何关系记录；正确口径应是冻结体验里的那句"还不能……没有找到寺与桥历史功能联系的证据"。
- **根因①（检索层）**：`retrieve.ts` 给 world_projection 硬编码 `vstatus='SUPPORTED'`→FACT_EVIDENCED，且每行的 entity_txt 都是全部 7 个实体名——任何含"寺/桥"的问句都会命中所有行，关键词命中≠问题有答案。
- **根因②（裁决层）**：`packages/agent-runtime/src/select.ts:187` —— relation 意图只要第一条材料是 FACT_EVIDENCED 就说"有据可依"，**不校验材料是否真支持被问的那条关系**；同时 `select.ts:154` 的 gap「没有登记到这条对象对的历史关系」要求材料 kind='relation'，而 retrieve.ts 的六路 UNION **从不产出 relation 类**（关系三元组躺在 world_projection.payload.relations 数组里，没人解析）——所以这句 gap 对**所有**关系问题都会出现。

**实测 2：问「万安桥和普济桥是什么关系？」** → 回答正确（引用了姐妹桥原文），但 gaps 仍附一句"没有登记到这条对象对的历史关系"——**对也补一句错话**。

- 附加问题：答句主体直接拼接投影标题「金泽古桥·寺院·水道（第一层真实闭环）」这类工程运行标签，不是给人看的叙事语言。

### 3.3 呈现方式：半"改变世界"，且两个数据源分裂

- 追问后世界确实会变：`handleAgentDecision` 走既有 `FOLLOWUP_REPLAN`（Patch-not-Replace），换主角 surface + 浮出 IntentGuide 收口层——符合 C4 方向，不是纯聊天窗。
- **但世界变化的数据源是冻结 JSON**：`experience-runtime.ts` 的 FOLLOWUP_REPLAN 只消费由冻结切片构建的 `WorldEvidenceState`；Agent 刚从真实库检索到的 materials 不参与世界变化。
- 结果：**嘴和世界各说各话**。寺桥问题上，嘴（真实库+缺陷裁决）说"有据可依"，世界（冻结世界+正确裁决）画"还没有一条线"。同一时刻同一问题，两种相反答案同框。
- 另：4 个冻结追问按钮（beat-05 actions）仍走冻结世界；自由输入走真实库——两个入口口径不一。

---

## 四、问题清单（按严重度排序）

### P0-1 ｜ Agent 对"无证据关系"回答"有据可依"（事实诚实性缺陷，最高优先）

- **现象**：问寺↔桥关系，Agent 答"有据可依"+工程标题；与同屏世界呈现的"还没有一条线"直接矛盾。违反 select.ts 自述红线"无材料 = 明确说不知道"，也违反 C4 证据诚实。
- **根因**：① `retrieve.ts` 硬编码 vstatus/全实体 entity_txt，命中≠相关；② `select.ts:103-106,187` verdict 与措辞只看材料存在性与档位，不做"材料是否支持所问关系"的校验。
- **建议改法**（纯技术，可自判执行）：裁决前先做"对象对→关系"核验——解析 world_projection.payload.relations 为 relation 类材料；所问对象对在关系集中无记录时，verdict 必须 cannot_answer/partial，措辞走"还没有登记"模板（等价于把冻结 TEMPLE_BRIDGE_NON_ANSWER 的口径搬到真实数据上）；删除或修正恒出现的 gap 文案。
- **涉及文件**：`apps/web/lib/mohen-agent/retrieve.ts`、`packages/agent-runtime/src/select.ts`（`buildGaps`/`buildMohenLine`）、`apps/web/app/api/mohen/ask/route.ts`。

### P0-2 ｜ 真实产出只到徽章，未进入世界（本任务的"主诉"）

- **现象**：徽章宣称"真实产出 · 7 实体 · 7 关系"，但 8 个场景的画面、叙事、证据、发现 100% 来自冻结 JSON；真实链的实体/关系/发现/故事种子/证据原文在体验里不可见。
- **根因**：`read-model-bridge.ts` 的 `ProductionRelationSummary` 只在 `ExperienceShell.tsx` 顶栏渲染一次；没有任何 Surface 消费它；FOLLOWUP_REPLAN 的世界状态也不含真实数据。
- **建议改法**：方向需 Owner 拍板（见 D2）；技术上已具备条件——桥已通、G5 双消费端 PASS、真实 payload 结构清晰（entities 空格串 / relations 三元组数组 / story_seeds.statement / evidence_pointers.display_excerpt）。
- **涉及文件**：`apps/web/lib/read-model-bridge.ts`、`apps/web/app/experience/jinze-water-net/page.tsx`、`ExperienceShell.tsx`、`surfaces/`（新增或改造）、`packages/experience-engine`（若让世界状态吃真实数据）。

### P1-3 ｜ Agent 答句混入工程标签、两个追问入口口径分裂

- **现象**：mohenLine 直接引用「（第一层真实闭环）」等 run 标签；冻结按钮（旧世界）与自由输入（真实库）对同一问题给不同答案。
- **根因**：`buildMohenLine` 直接拼 `first.snippet`（投影标题）；冻结 action 与 `/api/mohen/ask` 是两套互不知情的回答路径。
- **建议改法**：发布层 payload 增加面向人的表述字段（或由 D05 故事种子 statement 承担答句主体）；冻结 4 按钮改走同一 ask 链路（或以真实裁决结果覆盖冻结口径）。
- **涉及文件**：`packages/agent-runtime/src/select.ts`、`beats.ts`（actions）、`ask/route.ts`。

### P2-4 ｜ 第一幕"坐标网格三点图"与 C4 §16 视觉张力相悖

- **现象**：进场第一眼是经纬网框+三个点；三张照片被压在底部配图条。
- **根因**：beats.ts:145 的 v0.3 取舍（"第一幕主角=真实坐标三点图"）——诚实性达标，但撞上 §24 永久反模式「坐标网格第一视觉」。
- **建议改法**：这是产品方向权衡，不是 bug → 交 Owner（D1）。
- **涉及文件**：`beats.ts`（beat-01 primaryPreference）、`surfaces/SpatialSurfaces.tsx`（CurrentMapSurface）。

### P3-5 ｜ 检索召回精度低（entity_txt 全员命中）

- **现象**：任何含"桥/寺/金泽"的问句都命中全部材料，match_score 无区分度；答案质量靠运气。
- **根因**：retrieve.ts 把 payload.entities（7 实体全名串）当作每行的匹配文本。
- **建议改法**：关系/证据级材料应有各自的实体关联（如 evidence_pointer 只挂它实际支撑的实体）；排序引入"问句对象对 ∩ 材料实体"的精确加权。
- **涉及文件**：`apps/web/lib/mohen-agent/retrieve.ts`、上游 D05 payload 生成器。

---

## 五、需 Owner 决策的事项（非技术语言）

### D1 ｜ 第一眼：先看"现场照片"还是先看"诚实的抽象地图"？

- **现状**：进入体验第一眼是一张"格子纸+三个点"的示意图（它很诚实：不假装有真实地图数据），三张金泽真实照片被放在页面底部的小图条里。
- **选择**：A. 保持现状（诚实优先，第一眼是抽象示意）；B. 第一眼改为大幅真实照片建立现场感，抽象地图退为第二步（更贴近"先看见、再理解"的产品基调，代价是首屏信息精度下降）。
- **影响**：只改变第一眼的感觉，不动任何数据与证据逻辑。

### D2 ｜ 真实产出怎样"进入世界"？（本任务的核心方向题）

- **背景**：真实数据链目前产出了 7 个对象、7 条关系、4 条发现、3 个故事种子、4 段史料原文——全部合格（G5 双门通过），但观众在体验里看不到它们，只能看到顶栏一行徽章。
- **三个方向**：
  - **A. 换主角**：舞台世界整体切换为真实数据（旧冻结内容退场）。最"真"，但真实数据目前比旧冻结内容薄（没有水道骨架、没有时间变化、没有冲突并列），画面会明显变素。
  - **B. 叠层**：旧冻结内容继续当"讲解层"，真实产出作为"新发现层"浮现（例如："生产链新确认了 3 个故事种子"）。信息量大，但要小心两个事实源混讲。
  - **C. 内容看板**：按您此前定的看板偏好，新增一个"真实产出"呈现位——按资料类别展示：原始资料原文 → AI 读出了什么 → 发现了什么 → 能讲什么故事。与舞台并行，不稀释现有体验。
- **我的建议**：C 为先（最贴您的看板偏好、风险最小），A 为终态（等第三层视觉/空间数据厚实后再换主角）。
- **补充**：无论选哪个，P0-1 的"答反"缺陷都应先修（纯技术，不必等决策）。

---

## 六、附：本次自检的实测留痕

- DB 实查（只读）：world_projections 1 行 / story_seeds 3 行 / evidence_pointers 4 行 / G5 PASS（agent×9、visual_stage×8）；
- API 实测（dev server 实跑）：两问两答全文见第三节，请求体临时文件已清理；
- 真实预览：IDE 内置浏览器打开 `http://localhost:3000/experience/jinze-water-net`（dev server 本机已在运行）；
- 冻结内容核查：`jinze-3min-experience-script.json`（8 场景叙事全量）、`jinze-historical-spatial-slice.json`（5 对象/8 关系）。
