# CULTURAL-WORLD-01B · 金泽文化世界扩展候选审计 — Candidate Audit 报告

> SESSION = CULTURAL-WORLD-01B
> MODE = READ_ONLY · EXISTING MATERIALS ONLY · NO CONSTRUCTION
> 报告生成时间：2026-09-24（本地）
> 本文件位于仓库父目录 `D:/work Buddy/2026-08-23-23-12-38/`，**不在** `mohen-agent-2.0/` 或 `hushang-jingwei/` 任一 git 仓库内，故未创建/修改任何仓库文件。
> 严格遵守：禁止联网、禁止补资料/OCR、禁止修改任何仓库/数据库/代码/UI、禁止创建正式实体或关系、禁止按五幕倒推、禁止启动 TRACK-W/S/A。

---

## A. EXECUTIVE FINDING（核心结论）

1. **材料池 ≠ 世界**。当前 Greenfield 世界是一个 5 节点最小切片（01A 已坐实）。但**既有材料池（主要是 Legacy `hushang-jingwei/data/seed.master.json`）对全部 9 个文化维度都有覆盖**，且成形的 `crossLinks` 关系图已经把金泽编织成一个跨域文化世界。**瓶颈不是"没有材料"，而是"世界只落地了材料的极少部分"。**
2. **真正缺失的是 World Depth，不是 DATA VOLUME**。当前 Greenfield 切片只把 9 维中的约 3 维（空间/水网/桥梁、宗教—寺院遗址、人物—叶子）落地；其余 6 维（人物网络深度、庙会/信仰经济、市镇形成、经济行业、社会生活/社区、典籍方志命名、今天活态）全部停留在 Legacy 未入世界。
3. **高杠杆候选集中在三类**：(a) 引入**新关系类型**而非新对象（如 林老桥→"建桥人/善举留名"、金泽放生桥→"同名异地"、簖→"'沪'语源"）；(b) 引入**跨域连接**（簖→上海城市名源、田山歌/放生桥→朱家角跨镇、赵孟頫→艺术史）；(c) 引入**过去→今天**的活态/叠影连接（非遗活态、'四十二虹桥'→七桥、1992 修复）。
4. **最被低估的单一候选：簖 · '沪'字源头的渔作**。它把金泽的渔作生计直接连到"上海（沪）"的城市名源，是一个跨语言/经济/历史维度的意义钩子，且全部落在 Legacy 已有材料内（实体 + crossLinks + 白苎里地名叠影），无需补资料。
5. **认识论纪律必须延续**：Legacy 中大量金泽关系为"转述/传说/俟考"级（赵孟頫"不断云"、林老桥"林青"、多处"据地方文史资料说法，俟考"）。这些只能作为 `RESEARCH_LEAD` 或 frozen `SUPPORTED_CANDIDATE`，**不得升 verified**，沿用 01A 的 HR-4 冻结精神。
6. **视觉资产仍是硬约束**：本 seed 中金泽遗产图像实际为 0（town `gallery` 是 Wikimedia 高铁站照片；历史影像池误挂已于 2026-09-04 撤下）。因此所有 present-day 表达仍受 `historical_visual_evidence=0` 限制，只能做文字/证据对照，不能做旧影↔今貌或时空叠加——与 01A 结论一致。
7. **结论**：本审计产出 **15 张高价值候选卡 + 一批 LOW-VALUE/SUPPORTING 对象**。它们能显著抬升 World Depth（新增约 11 种关系类型、至少 4 种新对象类型、至少 3 条跨域链、至少 4 条过去→今天链），但**全部依赖既有材料，零新增采集**。

---

## B. EXISTING MATERIAL POOL（实测检索范围）

| 池 | 路径 / 标识 | 检索到的金泽相关材料 | 只读方式 |
|---|---|---|---|
| Greenfield 5-node 世界 | `mohen-agent-2.0/apps/web/data/experience/jinze-historical-spatial-slice.json` + 01A 报告 | 5 对象 / 8 关系 / 13 不确定性 | 已读（01A 边界） |
| Greenfield 知识编织 | `mohen-agent-2.0/pipelines/weave/build-jinze-minimum-weave.mjs` | S1《上海地名志》桥列表：宋(万安/普济)、元(迎祥/如意)、清(天王阁/放生)，"桥乡/21 古桥" | 已读 |
| Greenfield 方志采集 | `mohen-agent-2.0/tasks/results/TASK-0009-result.md`（1879/1788/1934 三部方志 A_ACQUIRED） | 7 Source + 17 Evidence；无 BREAKTHROUGH_CANDIDATE | 已读 |
| Greenfield 源登记 | `mohen-agent-2.0/specs/SOURCE_REGISTRY.md` | 证据/源登记（含上图地名库 SHL 条目） | 已读 |
| SHL（上图）知识对齐 | `mohen-agent-2.0/pipelines/historical-spatial/probe-align-*.mjs` + 上图地名库条目（迎祥桥"跨金泽塘"、万安桥"跨秀州塘"） | SHL 同镇对象：迎祥桥/如意桥/天皇阁桥/放生桥；跨镇疑点 T11-C2 | 已读 |
| Legacy 实体 | `hushang-jingwei/data/seed.master.json`（10.7 MB） | **31 个金泽相关实体**（含 desc、lat/lng、era、extra、crossLinks） | 已读（python json 解析，未改） |
| Legacy 关系图 | 同上 `entities[].extra.crossLinks` | **成形跨域关系图**（桥—桥、桥—庙会、庙会—茶桌、人物—寺、镇志—纂修人、地名叠影等） | 已读 |
| Legacy 方志原文 A档 | 同上 `entities[].extra.timeline[].source_snippet` + 金泽 town `timeline` | **金泽 12 条 A档原文 snippet**（水文/寺观诗/乱后书感/兵灾/风灾） | 已读 |
| Legacy 典籍引文 B档 | 金泽 town `extra.classical_citations`（10 条 = 5 书×2） | 吴中水利全书/唐荆川文集/岭上白云集/东吴水利攷/汤迪功诗草（苏图古籍，ocr_unverified） | 已读 |
| Legacy 叙事知识 | `agent_knowledge`（778 条，83 条含"金泽"，字数 28–663） | 金泽叙事文本池（已存在，可作为 Meaning/Discovery 内容源） | 已读 |
| Legacy 视觉资产 | `photos`（全局仅 2 条，0 条含金泽）；金泽 town `gallery`=12 条均为高铁站 Wikimedia 图 | **金泽遗产图像=0**（历史影像已撤下） | 已读 |
| Legacy 报刊/诗文 | 金泽 town `papers`=40（全国报刊索引）、`poems_count`=12（搜韵，已 offline） | 报刊题录 40、诗文 12（非叙事正文） | 已读 |

**检索纪律**：未联网、未新 OCR、未改任何文件。所有候选均可回指上表文件/字段。

---

## C. CANDIDATE CARDS（统一格式；15 张高价值 + LOW-VALUE 另列）

> 字段：candidate_id / name / type / why_it_matters / connects_to / candidate_relation + direction / temporal_scope / spatial_scope / existing_source_refs / epistemic_status / meaning_candidate / present_connection_candidate / world_depth_gain / risk

### C-01 · 迎祥桥
- **type**: bridge（元·连续简支梁桥）
- **why_it_matters**: 引入**新桥型**（不做拱券、多孔连续简支、砖木石混合、桥面极薄）——与金泽既有的宋代驼峰石拱（普济/万安）形成"形制两极"对照，把"桥乡"从"数量"提升为"形制谱系"。
- **connects_to**: 普济桥（形制两极）、'四十二虹桥'→今存七桥（七桥之一，形制最独特）
- **candidate_relation + direction**: `contrasts_typologically_with` → 普济桥；`is_member_of` → 七桥叠影
- **temporal_scope**: 元（后）至元年间
- **spatial_scope**: 金泽镇南市（lat 31.0905 / lng 120.9185）
- **existing_source_refs**: `seed.master.json` 实体"迎祥桥"desc(152字)；`crossLinks`；`build-jinze-minimum-weave.mjs`（S1 元桥列表）
- **epistemic_status**: SUPPORTED_CANDIDATE（桥名/年代/形制有地方志与梁桥史表述）
- **meaning_candidate**: INTERPRETIVE（"一镇之内驼峰拱与平薄梁并存，是水乡桥艺的两个答案"）
- **present_connection_candidate**: FACT（桥体现存，可现场观察薄桥面）
- **world_depth_gain**: 新增对象类型（梁桥）/ 关系类型（形制对比）/ 分叉
- **risk**: 桥体年代"后至元"精度弱；"鼻祖"之说为学术/媒体通行表述，非定论

### C-02 · 金泽放生桥
- **type**: bridge（明·单孔石拱）
- **why_it_matters**: (a) 桥名"放生"与桥畔颐浩寺放生传统**互为表里**——桥不再是孤立建筑，而是宗教实践的物化；(b) 上海有朱家角、金泽**两座同名放生桥**（一五孔一单孔），引入**"同名异地"跨镇关系类型**。
- **connects_to**: 颐浩寺遗址（放生传统呼应）、朱家角"放生桥"（同名异地）
- **candidate_relation + direction**: `named_after_buddhist_practice` → 颐浩寺放生传统；`same_name_distinct_place` → 朱家角放生桥
- **temporal_scope**: 明始建 / 清乾隆五十六年(1791) 里人陆开诚募资重建
- **spatial_scope**: 金泽镇区（lat 31.092 / lng 120.9145）
- **existing_source_refs**: `seed.master.json` 实体"金泽放生桥"desc(151字)；`crossLinks`（朱家角放生桥）；颐浩寺遗址 desc（放生传统）
- **epistemic_status**: SUPPORTED_CANDIDATE（重建年代/募资人有载）；"与朱家角同名"为地方通识
- **meaning_candidate**: INTERPRETIVE（"桥名即佛门慈悲的物化；同名双桥是上海桥梁文化的一段趣谈"）
- **present_connection_candidate**: FACT（单孔小桥现存）
- **world_depth_gain**: 新增关系类型（宗教实践命名 / 同名异地跨镇）/ 跨域（宗教↔桥梁）
- **risk**: 朱家角放生桥实体未在金泽切片，需跨镇轨道；"互为表里"属解释层

### C-03 · 林老桥
- **type**: bridge（元·单孔石拱）
- **why_it_matters**: 桥以建桥人**林青**之姓名名桥（"老"为乡里敬称），在金泽吉祥桥名序列中别具一格——引入**"人物—桥（建桥人/善举留名）"关系类型**，把桥从"吉祥字"维度拉到"人物功德"维度。
- **connects_to**: 天皇阁桥（相邻共存，一元一明）、白苎里地名叠影（善举留名属水乡生计伦理）
- **candidate_relation + direction**: `named_after_builder` → 林青（林老=林青敬称）；`coexists_with` → 天皇阁桥
- **temporal_scope**: 元至元年间里人林青建 / 清雍正八年(1730) 重建
- **spatial_scope**: 金泽镇区（lat 31.095 / lng 120.918）
- **existing_source_refs**: `seed.master.json` 实体"林老桥"desc(123字)；`crossLinks`；"林青"仅存于 desc，无独立实体
- **epistemic_status**: RESEARCH_LEAD（"相传""据地方文史资料说法，俟考"）
- **meaning_candidate**: INTERPRETIVE（"以建桥者名桥而非吉祥字，是水乡'善举留名'传统的实证"）
- **present_connection_candidate**: FACT（单孔石拱现存）
- **world_depth_gain**: 新增关系类型（人物—桥 建桥人）/ 分叉（人物功德维度）
- **risk**: 林青是否真实人物、桥名是否确为其名——传说级，须人审；同名误挂风险

### C-04 · 簖 · "沪"字源头的渔作 ⭐最高杠杆
- **type**: economic_practice / toponym_etymology（古代→当代）
- **why_it_matters**: "簖"是沪上水乡一种拦鱼竹栅渔具；**"沪"字即源于此类渔作**——这把金泽的渔猎生计直接连到**上海城市名源**。是一个跨**语言/经济/历史/地名**四域的意义钩子，且完全落在 Legacy 内（实体 + crossLinks + 白苎里地名叠影 mutually cited）。
- **connects_to**: 白苎里→金溪→金泽（"'沪'源于渔具、'金泽'源于获泽如金——地名皆含水乡生计记忆"）、'四十二虹桥'叠影（"簖渔所依水网即七桥所跨市河水系"）
- **candidate_relation + direction**: `etymological_source_of` → 上海"沪"；`shares_livelihood_memory_with` → 白苎里地名叠影
- **temporal_scope**: 古代渔作 → 当代（吴语仍用"簖"）
- **spatial_scope**: 金泽水网（lat 31.054182 / lng 120.895838）
- **existing_source_refs**: `seed.master.json` 实体"簖 · '沪'字源头的渔作"；`crossLinks`（白苎里、七桥叠影）；`金泽·地名志沿革` desc（"穑人获泽如金"）
- **epistemic_status**: SUPPORTED_CANDIDATE（"沪"字源出《沪渎》渔具为语源学通说；金泽水乡渔作可证）
- **meaning_candidate**: INTERPRETIVE（"金泽的竹栅，是上海城市符号'沪'的活化石"）
- **present_connection_candidate**: OPEN_QUESTION（"'沪'之语源虽为通说，但金泽具体哪一水网、是否仍可指认簖作现场，需现场考"）
- **world_depth_gain**: 跨域（语言↔经济↔历史↔地名）/ 关系类型（语源）/ 意义钩子
- **risk**: 易过度引申（须防止把"金泽=上海名源"写成定论）；语源学为通说非金泽专属

### C-05 · 金泽庙会（廿八汛与重阳汛）
- **type**: religious_festival / economic_spatial_carrier（清→当代）
- **why_it_matters**: 一年两度"香汛"（三月廿八东岳神诞、九月初九重阳）；**"桥桥有庙"的格局正是香火经济的空间载体——庙以桥通、桥因市盛**。引入**"庙会—桥—市"空间载体关系类型**，把宗教、桥梁、市镇经济三者编织成一环。已列入上海市非遗。
- **connects_to**: '四十二虹桥'叠影（"香客舟行入镇、过桥进庙，桥网是庙会动线骨架"）、商榻阿婆茶（"茶桌与庙市共构乡民公共生活"）
- **candidate_relation + direction**: `spatial_carrier_of` → 桥网；`co_occurs_with` → 市集/阿婆茶
- **temporal_scope**: 清（道光《金泽小志》直载）→ 当代（非遗）
- **spatial_scope**: 金泽镇（lat 31.0535 / lng 120.9）
- **existing_source_refs**: `seed.master.json` 实体"金泽庙会…"desc(192字，含道光《金泽小志》直引)；`crossLinks`；A档 snippet（咸丰辛酉贼扰金泽镇——可证庙会中断背景）
- **epistemic_status**: SUPPORTED_CANDIDATE（道光小志原文直引 + 非遗名录）
- **meaning_candidate**: INTERPRETIVE（"一镇桥网不是交通设施，而是香火经济的经络"）
- **present_connection_candidate**: FACT（列入上海市非遗，今仍举；当代实景可观察庙会/市集）
- **world_depth_gain**: 新增关系类型（宗教—桥—市 空间载体）/ 跨域（宗教↔经济↔桥梁）/ 当下连接
- **risk**: "桥桥有庙"为概数修辞，具体哪桥配哪庙需逐桥核验；庙会今貌与清制差异未证

### C-06 · 商榻阿婆茶
- **type**: social_practice / gendered_community（清→当代）
- **why_it_matters**: 水乡中老年妇女的轮值茶俗，是**女性社会网络与信息交换**的节点——引入当前世界完全缺失的**"社会生活/社区/日常实践 + 性别视角"维度**。2007 列入第一批上海市非遗（扩展）。
- **connects_to**: 商榻宣卷（"茶桌即书场，一茶一卷"）、金泽庙会（"茶桌与庙市同为乡民公共生活节点"）
- **candidate_relation + direction**: `co_occurs_with` → 宣卷（茶桌书场）；`public_life_node_with` → 庙会
- **temporal_scope**: 清→当代
- **spatial_scope**: 商榻地区及淀山湖周缘（lat 31.046977 / lng 120.90277）
- **existing_source_refs**: `seed.master.json` 实体"商榻阿婆茶…"desc(159字)；`crossLinks`
- **epistemic_status**: SUPPORTED_CANDIDATE（非遗名录 + 民俗学描述）
- **meaning_candidate**: INTERPRETIVE（"吃阿婆茶既是解劳，更是水乡女性维系人情的公共领域"）
- **present_connection_candidate**: FACT（非遗活态，今仍传）
- **world_depth_gain**: 新增对象类型（日常实践/社区）/ 关系类型（茶桌书场共生）/ 当下连接
- **risk**: 商榻今属金泽镇域但历史为独立社区，边界须厘清；"女性网络"为解释层

### C-07 · 商榻宣卷
- **type**: performing_art / religious_folk_origin（清→当代）
- **why_it_matters**: 源于佛教俗讲的说唱曲艺，与阿婆茶**共生一体**（茶桌即书场）——同时引入**"宗教俗讲→民间曲艺"渊源关系类型**与表演艺术维度。2007 与阿婆茶同批列入上海市非遗。
- **connects_to**: 商榻阿婆茶（共生）、颐浩禅寺·古今叠影（"宣卷源于宗教俗讲，与寺观香火一脉相通"）
- **candidate_relation + direction**: `originates_from` → 佛教俗讲/寺观香火；`co_occurs_with` → 阿婆茶
- **temporal_scope**: 清→当代
- **spatial_scope**: 商榻（lat 31.050411 / lng 120.895318）
- **existing_source_refs**: `seed.master.json` 实体"商榻宣卷…"desc(181字)；`crossLinks`
- **epistemic_status**: SUPPORTED_CANDIDATE
- **meaning_candidate**: INTERPRETIVE（"茶桌即书场：一项非遗寄生在另一项非遗的社交空间里"）
- **present_connection_candidate**: FACT（非遗活态）
- **world_depth_gain**: 新增关系类型（宗教渊源）/ 对象类型（表演艺术）/ 当下连接
- **risk**: 与苏州/嘉善宣卷同源，金泽土风边界需界定；"源于俗讲"为学界定说非金泽孤证

### C-08 · 田山歌（金泽）
- **type**: folk_song / intangible_heritage（清→当代）
- **why_it_matters**: 吴语稻作民歌，2008 以民间文学类列入**国家级**非遗（《吴歌》扩展）；青浦为核，练塘/赵巷/朱家角/**金泽**并称四大传承基地——引入**跨镇（朱家角）同脉关系类型**与"农事—声音遗产"维度。
- **connects_to**: 朱家角"田山歌"（"一歌连四镇"）、白苎里地名叠影（"白苎里之名即稻作棉纺物产的记忆"）
- **candidate_relation + direction**: `same_tradition_with` → 朱家角田山歌（四大基地同脉）；`voices_land_of` → 白苎里稻作记忆
- **temporal_scope**: 清→当代（耘稻劳动歌）
- **spatial_scope**: 金泽淀山湖稻作区（lat 31.053225 / lng 120.904206）
- **existing_source_refs**: `seed.master.json` 实体"田山歌（金泽）…"desc(217字，最详实体之一)；`crossLinks`
- **epistemic_status**: SUPPORTED_CANDIDATE（国家级非遗 + 四大基地记载）
- **meaning_candidate**: INTERPRETIVE（"田山歌是同一片稻作土壤的声音遗产"）
- **present_connection_candidate**: FACT（传承基地 + 进校园活动延续）
- **world_depth_gain**: 跨域（跨镇同脉）/ 对象类型（民歌）/ 当下连接
- **risk**: 田山歌为青浦共性，金泽特异性须突出；跨镇实体（朱家角田山歌）需另建

### C-09 · 赵孟頫（颐浩寺"不断云"传说）
- **type**: person / artist_legend（元）
- **why_it_maters**: 元代书画巨匠与颐浩寺"不断云"石刻的传说关联——引入**"人物—寺（艺术传说/题写）"关系类型**与艺术史维度。但**认识论上必须冻结为传说级**。
- **connects_to**: 颐浩寺遗址（"'不断云'石刻即传说所指之物，今存寺中"）、颐浩禅寺·古今叠影（"元代颐浩寺鼎盛正当赵孟頫之世"）
- **candidate_relation + direction**: `legendarily_associated_with` → 颐浩寺"不断云"石刻（传说）
- **temporal_scope**: 元
- **spatial_scope**: 颐浩寺（lat 31.053851 / lng 120.901406）
- **existing_source_refs**: `seed.master.json` 实体"赵孟頫"desc(36字，"传说性质，如实标注待核")；`crossLinks`；颐浩寺遗址 desc（"传与赵孟頫相关，属传说性质"）
- **epistemic_status**: CONFLICTED/RESEARCH_LEAD（明确标注传说性质）
- **meaning_candidate**: INTERPRETIVE（"元代最显赫的笔墨，传说落在金泽一座镇寺的云纹石上"）
- **present_connection_candidate**: OPEN_QUESTION（石刻今存，但"赵孟頫相关"无实证）
- **world_depth_gain**: 新增关系类型（人物—寺 传说）/ 对象类型（艺术史人物）/ 分叉
- **risk**: 传说级，严禁升 verified；易与真迹混淆；须沿用 HR-4 冻结

### C-10 · 赵朴初（1992 题额）
- **type**: person / modern_inscription（当代）
- **why_it_matters**: 1992 为颐浩禅寺修复开放题额——引入**"当代人物—寺（题额）"关系类型**，并且是一条干净的**过去→今天**连接（毁于1938 → 1992修复 → 赵朴初题额）。
- **connects_to**: 颐浩禅寺1992年修复开放（"题额即本次修复开放的直接产物"）、颐浩寺遗址
- **candidate_relation + direction**: `inscribed_for` → 颐浩寺1992修复开放（当代）
- **temporal_scope**: 当代（1992）
- **spatial_scope**: 颐浩寺（lat 31.051766 / lng 120.90563）
- **existing_source_refs**: `seed.master.json` 实体"赵朴初"desc(31字，"据青浦区官方渠道及媒体资料转述")；`crossLinks`
- **epistemic_status**: SUPPORTED_CANDIDATE（官方/媒体转述）
- **meaning_candidate**: —（事实链，非解释）
- **present_connection_candidate**: FACT（题额现存建筑本体）
- **world_depth_gain**: 关系类型（当代人物—寺）/ 当下连接（修复—题额链）
- **risk**: 题额真伪须官方核验；属于当代次要节点

### C-11 · 白苎里 → 金溪 → 金泽 地名叠影
- **type**: toponym_layering / local_memory（唐末五代→当代）
- **why_it_matters**: 古名白苎里（"白苎"=苎麻，纺织物产记忆）→金溪→金泽——引入**"地名叠影/层积"对象类型**与"地名即生计记忆"的意义框架，是金泽地方记忆的主轴。
- **connects_to**: 《金泽小志》续纂（"白苎里、金溪等古名序列主要赖该志传世"）、簖（"'沪'源于渔具、'金泽'源于获泽如金"）、田山歌（稻作声景）、金泽锭子谢家车（纺织物产）
- **candidate_relation + direction**: `name_layer_of` → 金泽；`preserved_by` → 《金泽小志》
- **temporal_scope**: 唐末五代→当代
- **spatial_scope**: 金泽（lat 31.04419 / lng 120.898972）
- **existing_source_refs**: `seed.master.json` 实体"白苎里→金溪→金泽…"；`crossLinks`；`金泽·地名志沿革` desc；金泽 town `timeline` A档
- **epistemic_status**: SUPPORTED_CANDIDATE（地名沿革有载）
- **meaning_candidate**: INTERPRETIVE（"一个镇的三层名字，叠着稻作、纺织、获泽如金的生计史"）
- **present_connection_candidate**: OPEN_QUESTION（古名具体对应范围待考）
- **world_depth_gain**: 新增对象类型（地名叠影）/ 关系类型（层积/记忆）/ 跨域（纺织—渔作—稻作）
- **risk**: 古名沿革多为转述；"白苎=苎麻"为训诂推论，非金泽孤证

### C-12 · 《金泽小志》道光续纂 + 蔡自申/周凤池
- **type**: gazetteer / local_ literati（清）
- **why_it_matters**: 镇志是金泽古名、桥名、庙会、物产的**主要传世文献源**；纂修人蔡自申（续纂）、周凤池（源流）引入**"镇志—纂修人"关系类型**与典籍维度。并与朱家角《珠里小志》/周郁滨形成**跨镇方志对照**。
- **connects_to**: 蔡自申/周凤池（"人书互证"）、白苎里（"古名赖该志传世"）、朱家角《珠里小志》(周郁滨)
- **candidate_relation + direction**: `compiled_by` → 蔡自申/周凤池；`counterpart_gazetteer_of` → 朱家角《珠里小志》
- **temporal_scope**: 清（道光续纂 1644-1912）
- **spatial_scope**: 金泽（lat 31.047987 / lng 120.902863）
- **existing_source_refs**: `seed.master.json` 实体"《金泽小志》道光续纂成书" + "蔡自申" + "周凤池" desc；`crossLinks`；金泽 town `classical_citations`（苏图古籍）
- **epistemic_status**: SUPPORTED_CANDIDATE（志书流传可证；蔡/周生平"据地方志研究转述"）
- **meaning_candidate**: —（典籍事实）
- **present_connection_candidate**: —（典籍，非现场）
- **world_depth_gain**: 新增对象类型（镇志/纂修人）/ 关系类型（人书互证、跨镇方志对照）/ 典籍维度
- **risk**: 蔡自申本"道光续纂抄本传世"、周凤池"本佚"——文本存佚须核验；跨镇对照需另建朱家角实体

### C-13 · 颐浩寺事件时间轴（创建/敕名/毁/复建）+ 咸丰兵灾/光绪风灾
- **type**: event_sequence / historical_rupture（宋→当代）
- **why_it_matters**: 颐浩寺有完整事件链：宋景定创寺（吕颐浩故宅舍建）→ 元奉旨敕名 → 咸丰辛酉(1861)嘉善贼北扰金泽镇及赵田村 → 光绪甲申(1884)风灾屋宇坍塌 → 民国(1938)毁于日军兵燹 → 1992 修复开放。引入**"历史事件/断裂"对象类型序列**与多条 rupture 关系，并补齐吕颐浩作为人物的外延（person—event）。
- **connects_to**: 吕颐浩（舍宅为寺）、颐浩禅寺·古今叠影（时间轴锚点）、赵朴初（题额）、咸丰/光绪 A档 snippet
- **candidate_relation + direction**: `founded_via` → 吕颐浩故宅（舍宅为寺）；`ruptured_by` → 1938兵燹/咸丰兵灾/光绪风灾；`restored_in` → 1992
- **temporal_scope**: 宋(1260) → 元 → 清 → 民国(1938) → 当代(1992)
- **spatial_scope**: 颐浩寺（lat 31.044376~31.053594 / lng 120.896741~120.903029）
- **existing_source_refs**: `seed.master.json` 事件实体(创建/敕名/毁/复建) desc + A档 snippet（咸丰辛酉、光绪甲申）；`crossLinks`；颐浩寺遗址 desc（1938毁/1992复建）
- **epistemic_status**: SUPPORTED_CANDIDATE（事件实体有载 + A档 snippet 佐证兵灾/风灾）；1938/1992 已在 Greenfield changes
- **meaning_candidate**: INTERPRETIVE（"一座寺的七百年：创于相宅、敕于元、毁于兵、复于今"）
- **present_connection_candidate**: FACT（1992 修复开放现存）
- **world_depth_gain**: 新增对象类型（事件序列/断裂）/ 关系类型（ruptured_by/restored_in/person—event）/ 跨域（兵灾—风灾—寺运）
- **risk**: 咸丰/光绪两条仅 A档 snippet 支撑、无独立实体（RESEARCH_LEAD 级）；兵灾波及范围（金泽镇及赵田村）须厘清

### C-14 · '四十二虹桥' → 今存七桥 古今叠影
- **type**: temporal_overlay / quantity_decline（宋元→当代）
- **why_it_matters**: "旧有四十二虹桥之誉，今存七古桥"——引入**"古今叠影/数量衰减"对象类型与关系类型**，把"过去—今天"的对比凝成一个可导航的叙事单元（42→7 的失落与存续）。
- **connects_to**: 普济桥/迎祥桥等七桥（"不变一侧的锚点"）、颐浩寺·古今叠影（同构时空记忆）、簖（"七桥所跨即簖渔水网"）、金泽庙会（"桥网是庙会动线"）
- **candidate_relation + direction**: `overlays` → 七桥（今存）；`contrasts_with` → 四十二虹桥（古誉）
- **temporal_scope**: 宋元（四十二虹桥）→ 当代（七桥）
- **spatial_scope**: 金泽镇（lat 31.055484 / lng 120.896511）
- **existing_source_refs**: `seed.master.json` 实体"'四十二虹桥'→今存七桥…"；`金泽` desc（"旧有四十二虹桥之誉，今存…七古桥"）；`crossLinks`
- **epistemic_status**: SUPPORTED_CANDIDATE（"四十二虹桥"为方志通载；今存七桥可数）
- **meaning_candidate**: INTERPRETIVE（"四十二到七：一座水乡桥乡的缩水史"）
- **present_connection_candidate**: FACT（七桥今存可现场点数）
- **world_depth_gain**: 新增对象类型（古今叠影）/ 关系类型（数量衰减叠影）/ 当下连接
- **risk**: "四十二"为方志修辞性总数，具体名录不可考；易与现存七桥一一对应误配

### C-15 · 苏图古籍 classical_citations（5 书 10 条，B档方志原文）
- **type**: source_evidence / gazetteer_primary（宋—清）
- **why_it_matters**: 金泽 town `extra.classical_citations` 含 10 条苏图古籍引文（吴中水利全书/唐荆川先生文集/岭上白云集/东吴水利攷/汤迪功诗草），主题覆盖**水文地理、寺观诗题、乱后书感、水利建制**——是 A档之外的**真·典籍原文（B档）**，可直接作为 Meaning/Discovery 的内容底料与证据。
- **connects_to**: 金泽塘（水文地理）、颐浩寺（寺观诗/乱后书感）、金泽镇（水利建制）
- **candidate_relation + direction**: `evidences` → 金泽塘水文 / 颐浩寺诗题（作为 source_evidence 节点）
- **temporal_scope**: 明—清（古籍刊刻）
- **spatial_scope**: 金泽（引文源 fzk.szlib.com）
- **existing_source_refs**: `seed.master.json` 金泽 town `extra.classical_citations`（10 条，含 source_uri）；A档 `timeline[].source_snippet`（12 条）
- **epistemic_status**: SUPPORTED_CANDIDATE（古籍扫描页存在；但 `ocr_unverified`，待人核）
- **meaning_candidate**: INTERPRETIVE（"宋人咏金泽寺的诗，七百年后仍在"）
- **present_connection_candidate**: —（典籍证据）
- **world_depth_gain**: 新增证据类型（B档方志原文）/ 关系类型（source_evidence 直挂对象）/ 典籍维度
- **risk**: `ocr_unverified`——引文文字须人核；苏图古籍版权/访问须合规；不得冒充 A档已核验

---

## D. CANDIDATE EXPANSION GRAPH（若候选经 Human Review 进入世界）

> 以当前 5 节点为根，高杠杆候选将长出以下分支与关系类型（文字拓扑 + 关系类型清单）：

```
                          [金泽塘 waterway]  (切片内 E1)
                                │ spans_waterway ×2
            ┌───────────────────┴───────────────────┐
        [万安桥] ──sisters── [普济桥]                [迎祥桥]──contrasts_typologically──► 普济桥(形制两极·新关系)
        (宋·拱)              (宋·拱·紫石)            (元·梁桥·新对象类型)
            │                                                  │
            └──── relatives ──── [颐浩寺遗址] ──former_site_of/named_after── [吕颐浩(leaf→扩 person-event)]
                                      │                                         │
                          temple_bridge(E2)                         舍宅为寺 ──► [颐浩寺创建/敕名/毁/复建]事件序列
                                      │                                         │
                          [金泽放生桥]──same_name_distinct_place──► [朱家角放生桥](跨镇·新关系)
                          (明·单孔·放生传统呼应颐浩寺)
                                      │
        【跨域链 A·渔作语源】  [簖]──etymological_source_of──► 上海"沪"  (语言↔经济↔历史↔地名)
                                      │ shares_livelihood_memory_with
                              [白苎里→金溪→金泽 地名叠影]──name_layer_of──► 金泽
                                      │ preserved_by
                              [《金泽小志》]──compiled_by──► [蔡自申/周凤池]──counterpart──► [朱家角《珠里小志》]
                                      │
        【社会链 B·公共生活】  [金泽庙会]──spatial_carrier_of──► 七桥网 ──co_occurs──► [市集]/[阿婆茶]──co_occurs──► [宣卷]
                          (宗教↔桥↔市 新关系)                  (女性网络·新对象)   (茶桌书场·宗教俗讲源)
                                      │
        【声景链 C·跨镇同脉】  [田山歌(金泽)]──same_tradition_with──► [朱家角田山歌]  (国家级非遗·四大基地)
                                      │
        【艺术/当代链 D】      [赵孟頫]──legendarily_associated──► 颐浩寺"不断云"(传说·冻结)   [赵朴初]──inscribed_for──► 1992修复(当代·新关系)
                                      │
        【叠影链 E·过去→今天】 [四十二虹桥→七桥 古今叠影]──overlays──► 七桥  (数量衰减·新对象/关系)
                                      │
        【证据层】             [苏图古籍 classical_citations ×10 / A档 snippet ×12] ──evidences──► 金泽塘/颐浩寺/金泽镇
```

**将出现的新分支节点（对象类型）**：梁桥、单孔/三孔石拱（形制谱系）、放生传统桥、建桥人桥、渔作语源、地名叠影、镇志、纂修人、事件序列/断裂、庙会、茶俗、说唱、民歌、艺术史人物、当代题额人物、古今叠影。
**将出现的新关系类型（≥11）**：contrasts_typologically_with、same_name_distinct_place、named_after_builder、etymological_source_of、spatial_carrier_of（庙会—桥—市）、originates_from（俗讲→宣卷）、same_tradition_with（跨镇同脉）、legendarily_associated_with（人物—寺传说）、inscribed_for（当代人物—寺）、compiled_by/counterpart_gazetteer（镇志—纂修人/跨镇方志）、overlays/quantity_decline（古今叠影）。
**将出现的跨域连接（≥4）**：簖→上海"沪"（语言↔经济↔历史↔地名）、田山歌/放生桥→朱家角（跨镇同脉/同名）、赵孟頫→艺术史（人物↔艺术）、庙会→市集经济（宗教↔经济）。
**将出现的过去→今天连接（≥4）**：四十二虹桥→七桥（数量衰减叠影）、1992 修复—赵朴初题额（寺运延续）、非遗活态（阿婆茶/宣卷/田山歌/庙会今仍举）、七桥今存可现场点数。

---

## E. HIGH-LEVERAGE CANDIDATES（不评分、不排名，仅标注"杠杆点"）

按 spec 5D 三条高杠杆标准（连接≥两种对象类型 / 引入新维度 / 形成过去→今天连接）判定：

| candidate_id | 命中杠杆标准 | 理由 |
|---|---|---|
| **C-04 簖·'沪'语源** | ③跨域 + ②新维度 | 单条即跨语言/经济/历史/地名四域，且是上海城市名源钩子 |
| **C-05 金泽庙会** | ③ + ② | 庙会—桥—市 把宗教↔桥梁↔经济三域织成环；且有非遗活态（过去→今天） |
| **C-02 金泽放生桥** | ② + ③跨域 | 同名异地跨镇 + 宗教实践命名 |
| **C-01 迎祥桥** | ② | 引入梁桥新桥型，与驼峰拱成"形制两极" |
| **C-03 林老桥** | ② | 引入人物—桥（建桥人）关系类型 |
| **C-08 田山歌** | ③跨域 | 跨镇同脉（朱家角）+ 国家级非遗 |
| **C-11 白苎里地名叠影** | ② + ③跨域 | 地名层积新对象类型，串起纺织/渔作/稻作三生计记忆 |
| **C-13 颐浩寺事件时间轴** | ② + ③ | 事件序列/断裂新对象类型 + 1938→1992 过去→今天 |
| **C-14 四十二虹桥→七桥** | ③ | 古今叠影新对象类型，凝练"过去→今天"失落叙事 |
| **C-12 《金泽小志》+纂修人** | ② + ③跨域 | 镇志—纂修人 + 跨镇方志对照 |
| **C-06/C-07 阿婆茶/宣卷** | ② | 引入社会生活/社区（含性别视角）+ 宗教俗讲渊源 |

**其余 C-09/C-10/C-15** 为"关系补全型"——不新开维度，但补全艺术史人物链、当代题额链、B档证据层，属高价值支撑，非独立杠杆点。

---

## F. LOW-VALUE / DUPLICATE / UNSUPPORTED（只增数量、不增关系深度者）

> 原则（spec 5E）：只增加对象数量、不增加关系深度的，列入本类，不入高价值卡。

| 对象 | 判定 | 理由 / 与高价值卡的关系 |
|---|---|---|
| **如意桥**（元·单孔石拱） | LOW-VALUE（SUPPORTING） | 与普济/万安同属"吉祥桥名序列+单孔石拱"，新增主要是**数量**（DATA VOLUME）；其唯一增量"桥桥有庙"已并入 C-05 庙会。若独立入世界，须靠"桥—庙配对"关系才算 depth，否则仅为第 N 座桥。 |
| **天皇阁桥**（明·三孔石拱） | LOW-VALUE（SUPPORTING） | 补全桥型谱系（唯一三孔），但关系仍属"镇区古桥相邻共存"（crossLinks 已与林老桥互引），增量偏 volume。可随 C-01 桥型谱系一并入，不必单列高价值。 |
| **吕颐浩（扩 person-event）** | SUPPORTED/SUPPORTING | 已在切片内为叶子；其深度靠 C-13（舍宅为寺事件）与 C-12 人物链补全，本身不是新候选。 |
| **周凤池 / 蔡自申（单条）** | SUPPORTING（并入 C-12） | 仅作为《金泽小志》纂修人出现，独立成卡=数量，已并入 C-12。 |
| **金泽状元糕 / 赵家香干** | LOW-VALUE（SUPPORTING） | 土产饮食双招牌，主要支撑"庙会市集经济"（C-05），独立成卡仅为饮食 POI，depth 有限；可作法相维度注脚。 |
| **金泽锭子谢家车** | LOW-VALUE（SUPPORTING） | 纺织物产，与白苎里地名记忆（C-11）互引；独立成卡偏 volume，建议并入 C-11 生计记忆簇。 |
| **颐浩禅寺·古今叠影 / 颐浩寺创建（单条）** | SUPPORTING（并入 C-13/C-11） | 已并入事件时间轴与叠影叙事。 |
| **咸丰辛酉兵灾 / 光绪甲申风灾** | RESEARCH_LEAD（UNSUPPORTED 为独立实体） | 仅 A档 snippet 支撑、无独立实体；须人审/补实体后方可升 SUPPORTED，当前不宜直接入世界。 |
| **林青（建桥人）** | UNSUPPORTED（传说） | 仅存于林老桥 desc 的"相传"，无独立实体、无证据行；须先核验再决定是否建 person 实体（C-03 已标 RESEARCH_LEAD）。 |
| **金泽（town 实体本身）** | NONE 新增 | 已在切片外作为父容器存在，非候选。 |

**结论**：若只把"如意桥/天皇阁桥/林老桥之外的更多桥"等无新关系的对象堆入世界，是典型 **DATA VOLUME 陷阱**。真正抬升 World Depth 的是上节 11 个高杠杆候选所携带的**新关系类型与跨域/过去→今天连接**。

---

## G. NEW RELATION TYPES（候选新增，汇总）

| 关系类型 | 触发候选 | 类型性质 | 认识论上限建议 |
|---|---|---|---|
| contrasts_typologically_with（形制两极） | C-01 | 结构/文化 | candidate（E1 地方志+梁桥史） |
| same_name_distinct_place（同名异地） | C-02 | 跨镇/命名 | candidate |
| named_after_builder（建桥人） | C-03 | 人物—桥 | RESEARCH_LEAD（传说） |
| etymological_source_of（语源） | C-04 | 跨域/语言 | candidate（通说） |
| spatial_carrier_of（庙会—桥—市） | C-05 | 宗教—桥—经济 | candidate（小志原文+非遗） |
| originates_from（俗讲→宣卷） | C-07 | 宗教—曲艺渊源 | candidate（学界定说） |
| same_tradition_with（跨镇同脉） | C-08 | 跨镇/非遗 | candidate |
| legendarily_associated_with（人物—寺传说） | C-09 | 人物—寺（传说） | **冻结 RESEARCH_LEAD**（HR-4 精神） |
| inscribed_for（当代人物—寺题额） | C-10 | 当代人物—寺 | candidate |
| name_layer_of / preserved_by（地名叠影） | C-11 | 地名/记忆 | candidate |
| compiled_by / counterpart_gazetteer（镇志—纂修人/跨镇方志） | C-12 | 典籍 | candidate（文本存佚待核） |
| ruptured_by / restored_in / founded_via（事件序列） | C-13 | 历史断裂 | candidate（A档+事件实体） |
| overlays / quantity_decline（古今叠影） | C-14 | 过去→今天 | candidate |
| evidences（B档方志原文直挂） | C-15 | 证据—对象 | candidate（ocr_unverified） |

---

## H. MEANING & PRESENT CONNECTION SEEDS（FACT / INTERPRETIVE / OPEN QUESTION）

> 仅列"过去→今天 / 意义"种子。MEANING 一律标 INTERPRETIVE，不得写成历史事实（spec 验收第 4 条）。

**MEANING seeds（INTERPRETIVE，全部需标注"解释层/非定论"）**
- M1 桥乡不是数量而是形制谱系：驼峰拱(宋) 与平薄梁(元) 在水乡同一镇并存（C-01）。
- M2 桥名即民间祈愿史：万安/如意/迎祥/放生——吉祥桥名序列（C-02/C-03 旁证）。
- M3 "沪"的活化石：金泽竹栅渔作是上海城市符号"沪"的语源（C-04）。
- M4 桥网是香火经济的经络：庙以桥通、桥因市盛（C-05）。
- M5 茶桌即书场：一项非遗寄生在另一项非遗的社交空间（C-07）。
- M6 镇的三层名字叠着稻作/纺织/获泽如金的生计史（C-11）。
- M7 四十二到七：一座水乡桥乡的缩水史（C-14）。
- M8 一座寺的七百年：创于相宅、敕于元、毁于兵、复于今（C-13）。

**PRESENT CONNECTION seeds**
- **FACT**：1992 颐浩禅寺修复开放、赵朴初题额现存（C-10）；七桥今存可现场点数（C-14）；田山歌/阿婆茶/宣卷/庙会仍为非遗传承（C-05/06/07/08）；万安/普济/迎祥/如意/放生/林老/天皇阁 桥体现存。
- **INTERPRETIVE**：把"桥网=香火经济经络""地名=生计记忆""四十二→七=失落史"作为现场观察的解释框架（与 01A present-day 总判一致，仅 proposal 级，不导航）。
- **OPEN QUESTION**：簖作具体水网与现场可否指认（C-04）；"沪"语源虽通说但金泽专属度待考；白苎里古名具体范围；四十二虹桥具体名录；咸丰/光绪兵灾/风灾波及范围与寺运关联；1938 毁寺对镇格局改变（01A Q7 解释层）。

---

## I. MINIMUM HUMAN REVIEW QUEUE（最小人审队列）

> 在进入任何施工前，Architect/Human 须裁决以下（按优先级）：

1. **跨镇范围裁决**：朱家角放生桥、朱家角田山歌、朱家角《珠里小志》/周郁滨 是否纳入"金泽文化世界"范围，还是另设跨镇轨道？（影响 C-02/C-08/C-12 的边界）
2. **'沪'语源钩子裁决**：C-04 是否作为意义主轴；如何措辞避免"金泽=上海名源"的过度引申。
3. **传说冻结裁决**：C-09 赵孟頫"不断云"、C-03 林青——沿用 HR-4 冻结为 RESEARCH_LEAD，还是允许某人审后升 SUPPORTED。
4. **视觉约束确认**：金泽 heritage 图像=0、历史影像已撤下；是否接受 present-day 仅文字/证据对照（不旧影↔今貌、不时空叠加）。
5. **实体化裁决**：咸丰兵灾/光绪风灾/林青 是否先补实体与证据再入世界（当前 UNSUPPORTED）。
6. **B档 OCR 核验**：C-15 苏图古籍 10 条 `ocr_unverified`，是否先人核文字再引用。
7. **取舍优先级**：在 11 个高杠杆候选中，若先扩一个簇，建议优先"桥型谱系+庙会—桥—市+非遗活态"（空间↔宗教↔社会三域闭环，材料最强）。

---

## J. ARCHITECT QUESTIONS（需 ChatGPT Architect 裁决）

1. **Legacy `crossLinks` 能否作为候选关系蓝本？** 这些 crossLinks 已是成形的金泽文化关系图（桥—桥、桥—庙会、人物—寺、镇志—纂修人、地名叠影），认识论多为"转述/传说"。是否允许其作为 SUPPORTED_CANDIDATE 进入 Greenfield，还是仅作 RESEARCH_LEAD 蓝本？这决定 World Depth 能否快速跃升。
2. **跨镇关系是否属本文化世界？** 01A 中 Q9（跨镇比较）判 NONE 因"仓库无跨镇数据"——但 Legacy crossLinks 已把金泽连到朱家角（放生桥/田山歌/方志）。这是 01A 的"仓库零数据"结论被 Legacy 既有 material 推翻的点，请 Architect 重新裁定跨镇是否纳入范围。
3. **'沪'语源是否适合做意义钩子？** 它跨域极强（语言/经济/历史/地名），但"沪"为江南通名、非金泽专属；请裁决其作为"金泽→上海"连接的可辩护边界。
4. **人物传说冻结强度**：赵孟頫"不断云"、林老桥"林青"是否沿用 HR-4（"据方志记载/传说"级，永不得升 verified），还是本审计允许更宽？
5. **'四十二虹桥'古今叠影 与 '沪'语源 的 present-day 定位**：二者把过去→今天接得很紧，是否升为 Present-day Connection 主叙事，还是仅留 OPEN_QUESTION？
6. **视觉资产归零的验收口径**：本 seed 金泽 heritage 图=0（gallery 是高铁站照、历史影像已撤），`historical_visual_evidence=0` 仍生效。是否接受"仅文字/证据对照"的 present-day 表达作为竞赛交付口径？
7. **世界边界再定义**：01A Q5 曾问"5 节点是否即 CULTURAL-WORLD-01 全部"。本审计证明材料池可支撑约 9 维、≥15 候选。请 Architect 明确：CULTURAL-WORLD-01 是"5 节点最小切片"还是"可扩至 9 维的镇级文化世界"。

---

## K. FINAL STATUS BLOCK

```
TEST_STATUS = COMPLETE
REPO_CONFIRMED = YES (readonly; 未改任何仓库文件)
GIT_ROOT_CHECKED = D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0 (read) + hushang-jingwei (read)
BRANCH = (未切换；仅只读)
CONSTRUCTION_PERFORMED = NO
FILES_MODIFIED = NONE
WEB_USED = NO
NARRATIVE_WRITTEN = NO (仅本报告，位于仓库父目录，非仓库文件)
UI_WORK_PERFORMED = NO
TRACK_W_S_A_STARTED = NO (spec 1 禁止)

CANDIDATE_COUNT = 15 (高价值卡) + 10 (LOW-VALUE/SUPPORTING/UNSUPPORTED 另列)
DIMENSIONS_COVERED = 9/9 (材料池全覆盖；当前世界仅落地 ~3/9)
MATERIAL_POOL_SCANNED =
  Greenfield: jinze-historical-spatial-slice.json, build-jinze-minimum-weave.mjs, TASK-0009/0011 results, SOURCE_REGISTRY.md
  SHL(pilot): probe-align-*.mjs, 上图地名库条目
  Legacy: seed.master.json (31 金泽实体 + crossLinks 关系图 + 12 A档 snippet + 10 classical_citations + 83 agent_knowledge条)

NEW_ENTITY_TYPES_CANDIDATE =
  bridge_typology(梁桥/三孔拱), fishing_practice_etymology(簖), toponym_layering(地名叠影),
  gazetteer(镇志), compiler(纂修人), event_sequence/rupture(事件序列), religious_festival(庙会),
  social_practice(茶俗), performing_art(宣卷), folk_song(田山歌), artist_legend(赵孟頫),
  modern_inscriber(赵朴初), temporal_overlay(古今叠影)

NEW_RELATION_TYPES_CANDIDATE =
  contrasts_typologically_with, same_name_distinct_place, named_after_builder, etymological_source_of,
  spatial_carrier_of(庙会—桥—市), originates_from(俗讲→宣卷), same_tradition_with(跨镇同脉),
  legendarily_associated_with(人物—寺传说), inscribed_for(当代人物—寺),
  name_layer_of/preserved_by(地名叠影), compiled_by/counterpart_gazetteer(镇志—纂修人/跨镇方志),
  ruptured_by/restored_in/founded_via(事件序列), overlays/quantity_decline(古今叠影), evidences(B档原文直挂)

HIGH_LEVERAGE_CANDIDATES =
  C-04 簖·'沪'语源, C-05 金泽庙会, C-02 金泽放生桥, C-01 迎祥桥, C-03 林老桥,
  C-08 田山歌, C-11 白苎里地名叠影, C-13 颐浩寺事件时间轴, C-14 四十二虹桥→七桥,
  C-12 《金泽小志》+纂修人, C-06/C-07 阿婆茶/宣卷

CROSS_DOMAIN_CHAINS_CANDIDATE = 4 (簖→沪; 田山歌/放生桥→朱家角; 赵孟頫→艺术史; 庙会→市集经济)
PAST_TO_PRESENT_CHAINS_CANDIDATE = 4 (四十二→七桥; 1992修复—题额; 非遗活态; 七桥今存)

PRIMARY_BLOCKERS =
  (1) 跨镇范围未决(朱家角实体是否纳入)
  (2) 人物传说冻结强度未决(HR-4 沿用 or 放宽)
  (3) 视觉资产=0 → present-day 仅文字/证据对照
  (4) B档 OCR 未核验(苏图古籍 10 条)
  (5) 咸丰/光绪兵灾/林青 无独立实体(UNSUPPORTED)

RECOMMENDED_NEXT_STEP = ARCHITECT_REVIEW
STOP — 等待 ChatGPT Architect 验收。未启动 TRACK-W / TRACK-S / TRACK-A 或任何施工。
```

---

### 附：检索纪律自检（验收第 1 条）

- 每个候选均回指现有文件/source/evidence：✅（Legacy `seed.master.json` 的实体/crossLinks/timeline/classical_citations；Greenfield `*.mjs`/`*.json`/`TASK-*`；01A 报告）。无来源者（咸丰兵灾/林青）已标 UNSUPPORTED，未进入高价值卡。
- 对象增加 ≠ World Depth 增加：✅（F 节单列 LOW-VALUE 数量型桥/食/织，明确 DATA VOLUME 陷阱）。
- 至少能判断哪些文化维度在现有材料里完全缺失：✅（B 节结论——材料池 9/9 全覆盖；真正缺失的是"世界深度"：当前切片仅落地 ~3/9 维）。
- 未把 Meaning Candidate 写成历史事实：✅（H 节 MEANING 全标 INTERPRETIVE，附"解释层/非定论"警示）。
- 报告足以让 Architect 决定下一步是扩 World/Data、补 Evidence、还是先设计 Meaning/Discovery 机制：✅（I/J/K 三节给出裁决清单与 Next Step）。
