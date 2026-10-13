# 库内资料「读懂」解读方案（Interpretation Plan）

> **状态**：方案稿（仅规划，未执行）。
> **定位**：按项目合法数据生产链路，补全"对历史资料进行分类读懂"这一缺失环节——先回答"库内资料到底是什么内容"，再回答"如何支撑叙事转化"。
> **SOT 依据**：主协议 V3.0 §12.2（D01–D05）＋《宽进与广联》V1.0（T01–T14 / A01–A12 / AVS）＋ C2 V1.1 / C3 V1.2 / C4 V2.1。
> **模式**：A · Discovery Research（不是 B-mode Directed）；`truth_write_ceiling = 0`，全程只写 `research_*`，**零 Truth Promotion、零自动晋级**。

---

## 0. 诊断：之前为什么"没读懂"

| 环节 | 之前的实际做法 | 合法链路要求 | 缺口 |
|---|---|---|---|
| 入口 | C1–C6 走 `unattended-runner.mjs`（**B-mode 定向补证**） | 读懂应先走 **A-mode 发现**：D01 分类 → D02 按载体读懂 | 一开始就跳到抽候选/关系，没"读" |
| 分类 | 旧路线按 source_record→evidence stub→entity candidate 同一套路处理所有 JSON | D01 按"来源性质＋原始载体＋可读程度"重新分类（宽进 §5.6 / §19） | 资料从未按 T01–T14 归类 |
| 读取 | 新 D02 体（`research-pipeline.mjs`）只做**通用文本切块**（`extractText`→excerpt），按文件名打 `carrier_type` 标签 | D02 须按载体跑 **adapter**：地方志读卷目/条目、舆图读图面/拓扑、图片读画面对象/活动/视角 | 产出的是"片段"，不是"读懂的内容" |
| 交付 | `TASK-DATA-20261004_原始数据样本报告.html` 只抽样 dump evidence_fragments，**0 处出现"地方志/舆图/图片"等材料类别词** | 报告须按资料类别呈现"原始资料→读出原文→发现关系→可支撑故事"（你 2026-10-05 硬性偏好） | 报告无材料分类、无内容解读层 |

**结论**：问题不在"没抽到数据"，而在"抽到的不是读懂的内容"。补的不是更多脚本，而是 **D01 分类 ＋ D02 载体适配器** 这一环。

---

## 1. 合法链路定位：用哪种姿势"读懂"

```
A · Discovery Research（只读，不证）
  D01 盘点/分类  →  D02 按载体内容读取  →  D03 Mention/Dependency
       →  D04 关联扫描(A01–A12)  →  D05 人文精选(AVS)  →  交 B-mode 严证
  本方案聚焦前两段（"读懂"），D03–D05 仅作下游衔接设计。
```

- **入口唯一**：`pipelines/research/research-pipeline.mjs` 的 `research.content-observation`（作业 D02），**禁用 `unattended-runner` 的 C1–C6 旧路线**。
- **三道闸**：`MOHEN_WRITE_ENABLED=true` ＋ `MOHEN_ENV∈{dev,staging}` ＋ 作业 `write_scope ⊆` 生产注册表声明；缺一道即 DRY_RUN。
- **材料源**：Legacy Reservoir（沪上经纬旧库 JSON，路径 `D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/fetched`，只读）。

---

## 2. 库内资料盘点（D01 输出）

对 Legacy Reservoir 逐源打标：**载体类型（T01–T14）＋ 原始载体性质 ＋ 可读性 ＋ 权利状态 ＋ 是否仅目录/cache**。

按代码 `classify()` 已识别的载体与宽进 §19 列出的旧库文件，当前库内主要类别与可读取重点如下（具体逐源清单由 D01 实跑产出 `01_source_inventory`）：

| T 类 | 载体 | 旧库典型文件 | 可读重点 |
|---|---|---|---|
| **T01 方志/地方文献** | 县志/镇志/乡土志/地名志 | `gazetteer_*`、`gj_fangzhi`、`dmz_*`、`geo_placenames` | 卷目结构、建置沿革、桥梁水利、人物、寺观、风俗、物产、艺文、灾异 |
| **T02 古籍/诗文/笔记** | 文集/诗词/游记/题记 | `gj_*`、`mgts_*`（扫描本）、`jp_*`、`souyun_*`、`works` | 作者/时代/作品语境、人物—地点—活动—感知 |
| **T03 档案/契约/族谱/碑刻** | 公文/契约/账册/谱牒/碑记 | `clans*`、`clan_pdf_index` | 动作/交易/制度执行/人物网络/迁徙 |
| **T04 报刊/近现代文献** | 报纸/调查/通讯 | （待 D01 识别） | 日期/版面/栏目/事件/社会生活变化节点 |
| **T05 现代研究/文保** | 论文/文保档案/考古简报 | `protection*`、`sh_protection` | 作者解释 vs 被引原始来源（须拆分） |
| **T06 古代舆图** | 方志图/城图/河防图/驿路图 | `yutu_*`、`commons_oldmaps`、`rumsey_maps` | **读图**：图面语义＋拓扑＋几何资格 |
| **T07 近现代测绘/地籍图** | 测绘/地籍/航运图 | （待 D01 识别） | 坐标/比例/图例/较强几何约束 |
| **T08 历史照片/明信片** | 老照片/明信片/新闻摄影/航拍 | `commons_*`、`shanghai_images` | **读画面**：对象/活动/空间/视角/图中文字 |
| **T09 绘画/版画/插图** | 风俗画/山水画/书籍插图 | （待 D01 识别） | 画面语义＋类型/目的；警惕写意程式化 |
| **T12 结构化库/目录** | CBDB/馆藏目录/旧项目 JSON | `cbdb_*`、`narrative_*`、`events_*`、`hsly_events`、`jinze_*` | 字段语义＋原始来源依赖（只产 Lead） |
| **T14 旧叙事资产** | 已上线故事/章节/候选 | `narrative_*`、`suzhou_*` | 回拆为 Research Lead，追不到源则待查 |

> D01 同时输出 `catalog_only` / `unreadable` / `visual_carrier` 三类的**明确原因**（不是只靠条数掩盖），这是"读懂"的前置欠账清单。

---

## 3. 「读懂」的载体适配方案（D02 核心 · 本方案重点）

> 原则（宽进 §5）：分类按"载体如何被读取"组织，不是按学科。原始身份保持唯一。以下每个 adapter 都须**替换现有通用切块**，改为结构化内容 Observation。

### T01 地方志 —— 从"有一本书"到"可关联条目网络"
- **读懂要回答**：版本/卷目结构是什么？相关门类（建置沿革·桥梁水利·人物·寺观·风俗·物产·艺文·灾异·交通·镇市）下各有什么条目？条目里的人/地/机构/活动/时间/对象用途/变化词是什么？
- **产出 Observation**：`TextObservation`（按条目/段落切，带卷目 locator）+ `Mention` + `Action` + `Time/Place Scope`。
- **已有全文 vs 仅有 PDF 书影**：书影走页级类型识别→目录定位→区域转写→保留 `uncertainty`，原书影区域仍是根锚点（宽进 §5.1）。
- **关联发现优先**：读"条目之间的交叉"（建置↔桥梁↔人物↔寺观），不是把卷目分类当历史关系。

### T02 古籍/诗文/笔记 —— 人物—地点—活动—感知
- **读懂要回答**：谁在何时何地、因何写、写到了什么对象/景观/活动/情感？与方志条目能否互证？
- **产出**：`TextObservation` + 作者/时代/作品语境 + 感知性 Mention。
- **注意**：诗文是表达而非事实记录，qualifiers 必须标"创作性/抒情性"。

### T03 档案/契约/账册/族谱/碑刻 —— 优先抽"动作"而非实体
- **读懂要回答**：发生了什么动作/交易/制度约束？actor/object/from/to/time/quantity/role 是什么？
- **产出**：`ActionObservation` / `TransactionObservation` / `InstitutionObservation` / `ChangeObservation` / `GenealogyObservation`（宽进 §5.4），保留 action/event 结构，不只剩"又一个人名"。

### T05 现代研究/文保 —— 解释与原始证据分离
- **读懂要回答**：研究者说了什么结论？他引用了哪条原文/图表/档案号？
- **产出**：拆成"研究者解释 Observation" + "被引原始来源 Lead"；二手分歧记 `Conflict/Competing Interpretation`，不强行合并。

### T06 古代舆图 —— 必须"读图"，不能只认标题（重点补）
- **读懂要回答（图面语义层）**：题名/编绘者/年代/图幅/地图类型/绘制目的？方向/比例/图例/符号/文字标签/边界/道路·水系·桥·聚落·寺观等可见要素？
- **拓扑观察层**：谁在谁旁、谁跨越谁、上下游/内外/沿线/围合/节点/中心？区分"图上可见"与"现实推断"。
- **几何资格层**：能否 registration/anchor/reconstruction，理由是什么？证据不足时**禁止全图 GIS 配准**。
- **产出**：`MapLabelObservation` + `MapFeatureObservation` + `MapTopologyObservation` + `MapAnnotationObservation`。**仅产生 visual_asset 不是内容观察——必须产上述 Observation 才进关联池。**

### T07 近现代测绘/地籍图 —— 较强几何约束
- **读懂要回答**：坐标/比例/图例/要素是什么？与历史舆图的同名对象能否对照？
- **产出**：带几何约束的 `MapFeatureObservation`，可作空间锚点。

### T08 历史照片/明信片/影像 —— 进库前先过"内容级理解"（重点补）
- **读懂要回答（宽进 §5.3）**：来源/摄影者/拍摄时间/描绘时期/权利？画面可辨对象（人/建筑/桥/河/街巷/器物/标识）？人在做什么、对象如何被使用、谁与谁同框、空间如何组织？拍摄/观看方向、前后景、岸桥街关系？图中招牌/题记/碑铭/印章？"图中确实可见"与"据标题/说明得知"**分开**；创作性 vs 纪实分开；叙事资格（主角原件/辅助说明/仅目录价值）？
- **产出**：`VisualObservation`（画面对象 + 活动 + 空间视角 + 图中文字 + 证据身份 + 叙事资格）。
- **红线（视觉 Gate）**：100% 进关联池的图必须有内容级 Visual Observation；只有标题/文件名/自动标签的，只能停留 `Source Lead / Asset Pending`。

### T09 绘画/版画/插图 —— 画面语义＋类型/目的
- **读懂要回答**：画了什么场景/物件？属于哪类作品、为何而作？是否写意/程式化（需警示）？
- **产出**：`VisualObservation` + 类型/目的 qualifiers。

### T12 结构化库/目录 —— 先恢复字段语义与来源依赖
- **读懂要回答**：这是原始事实库、二次索引、目录、抓取 cache 还是旧项目生成物？不同性质决定只产 Lead / Observation / 可核验 Evidence。
- **产出**：字段级 `Mention` + `source_dependency`；CBDB/旧 JSON 的高结构化优势只用于生成 Lead/别名/索引，不自动当事实。

### T14 旧叙事资产 —— 回拆为 Lead
- **读懂要回答**：这条旧故事依赖哪些旧 Source/Observation？追不到源的保持待查。
- **产出**：叙事陈述拆回 对象/观察/来源线索，作高价值 Research Lead。

---

## 4. 输出契约与质量闸（D02 强制）

**每条 Observation 必带**（宽进 §6 Observation Contract；§1.3 研究态）：
`source_id + locator`（页/段/图号/区域可回溯）· `modality` · `raw_excerpt_or_region` · `normalized_observation` · `mentions` · `actions_events` · `time_scope/place_scope`（确定/约略/未知）· `relation_signals` · `qualifiers` · `extraction_method + uncertainty` · `association_readiness`（`ready/limited/catalog_only/unreadable`，**禁** `usable/published/verified`）。

**质量闸 W1–W7（宽进 §7）须在覆盖率报告中逐项核验**：
- W1 来源完整（100% 有 provider/版本/权利/状态）
- W2 内容读取（"已处理"＝读到内容层；catalog_only 单独计数，不混入）
- W3 定位可回溯（所有可关联 Observation 能定位到页/段/图/区域/记录 ID）
- W4 多模态真实读取（进关联池的图/图 100% 有 Map/Visual Observation，禁标题替代读图）
- W5 扫描降级诚实（OCR 失败保留区域图＋uncertainty，不造伪全文）
- W6 Observation Yield（Source→有内容 Observation 转化率，无产出要原因分类）
- W7 旧叙事回拆（旧 Story 只作 Lead，追不到源保持待查）

**反噪声（宽进 §15）**：同源重复去重、转引链建 `source_dependency`、near/同年代只作弱信号、标题/文件名相似只产 Source Lead、模型常识补关系标 `external hypothesis` 不混入 legacy 信号。

---

## 5. 读懂之后如何支撑叙事转化（D03 → D05 → M1–M5）

```
读懂的 Observation ──D03──> Mention/Dependency（含转引链）
       │
       └──D04──> A01–A12 生成 Signal / AssociationCandidate（Observation Graph，双图分离）
                 │
                 └──D05──> AVS 评分＋反噪声＋五母题后置透镜 ──> Top30 + Long Tail
                           │
                           └── Selected Discovery ──交 B-mode N01–N06 严证（零自动晋级）
```

**五母题后置为解释透镜**（宽进 §13，不得作搜索前置硬筛选）：
- 地方志/古籍 → 支撑 **M2**（地方为何长这样）、**M4**（地方如何活起来）
- 舆图＋照片＋今日现场 → 支撑 **M3**（过去的人活在怎样的地图里）、**M5**（今天还剩多少过去）
- 档案/契约/诗文 → 支撑 **M1**（消失的关系世界）、**M3/M4**
- 跨模态对齐（方志↔舆图↔照片↔现场）→ 多母题交叉

**交付形态（对齐你 2026-10-05 偏好 · 内容看板，不堆 DB schema）**：
按资料类别展示 —— ① 原始资料是什么（类别/来源/载体） → ② AI 读出了哪些原文（条目/图面/画面 Observation 样例） → ③ 发现哪些人物/地点/事件/关系（Mention/Signal） → ④ 可支撑什么故事（Top Discovery ＋ 母题透镜 ＋ 缺什么/下一搜什么）。

**出口纪律**：仅 Selected Discovery 进 `review_queue` 分诊；Long Tail 留 Research Workspace 由机器合并/降级；**AssociationCandidate 0 个自动晋级 Runtime Truth**（G-LINK-10）。

---

## 6. 执行纪律与交付物（仍不执行，仅登记）

- **唯一入口**：`research-pipeline.mjs` 的 `research.content-observation`（D02）；如需新增"按载体读懂"的子作业，先登记 `production-registry.json` 并过 `guard:registry`。
- **三道闸 ＋ `pnpm guard:research`**：discovery ceiling=0、研究区未写 Truth、0 自动晋级、Observation 有 `source_id + locator`。
- **交付物**（宽进 §20 适配）：`01_source_inventory`（分类＋可读性＋原因）· `02_observation_sample`（每载体≥20 条真实 Observation，含 locator 与 uncertainty）· 覆盖率报告（W1–W7）· 下游支撑热力图（D02→M1–M5）。
- **治理落点**：状态指针进 `CURRENT.md` §7（新增"材料读懂"阶段，如 C7）；结果进 `tasks/results/`；本方案为 plan，不混入结果。

---

## 7. 建议的第一步（待你确认后，再进入实际读取）

为不偏离你的预期，建议**先不写代码**，而是先产出两份"读前设计"交付物由你确认：

1. **`01_source_inventory` 草案**：对 Legacy Reservoir 逐源按 T01–T14 分类＋可读性＋权利＋是否仅目录，列出"已可读 / 仅目录 / 不可读 / 视觉载体需图读层"四档清单。
2. **每类资料的"读懂提纲"**：对 T01 方志 / T06 舆图 / T08 图片 / T03 档案 / T02 诗文 等，分别写出"读懂要回答的问题清单 + 预期 Observation 字段样例 + 抽样 2–3 条真实材料试读"。

你确认分类口径与"读懂标准"对齐后，再正式跑 D02 载体适配器并产出覆盖率报告与内容看板。

---

> **本文件性质**：方案（plan）。未执行任何数据生产、未写库、未改动宪法/协议。批准后由新会话按 §7 第一步执行。
