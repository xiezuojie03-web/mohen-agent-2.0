# TASK｜MoHen 新数据生产实验 EXP-01
## 青浦西部水乡：桥、寺、市与水路如何共同塑造市镇生活？

**版本：V1.0 · 2026-10-07**  
**执行者：CodeBuddy**  
**体系：MoHen A–G Final**  
**任务性质：第一次真实 D01→D05 数据生产实验**  
**禁止：大规模抓取 / 旧库迁移 / 修改架构 / Production deploy**

---

# 0｜实验目的

本任务不是为了“做一篇古镇介绍”。

本实验要回答两个更重要的问题：

1. 新的 D01→D05 / G0→G4 数据生产体系，能否在真实材料上跑通；
2. 墨痕长期叙事主体应该继续是“11个古镇”，还是转向“跨地点的人文问题 / 空间机制”。

---

# 1｜研究题目

## 主问题

> **青浦西部水乡中，桥、寺、市与水路之间的关系，如何共同塑造金泽、朱家角、练塘三个市镇的形成、连接与日常生活？**

## 子问题

A. 水路与桥梁如何决定市镇内部连接和对外交通？

B. 寺庙、桥梁、街市是否形成稳定的空间组合？如果形成，其历史功能是什么？

C. 金泽、朱家角、练塘三镇在：
- 水网结构
- 桥梁体系
- 寺庙 / 信仰设施
- 街市 / 商业
- 对外交通
- 当代延续

方面有哪些共同机制与显著差异？

D. 哪些历史结构今天仍能在空间、生活、旅游体验或地方认同中被感知？

---

# 2｜为什么选三镇，而不是单镇或11镇

本实验只选：

```text
金泽
朱家角
练塘
```

理由：

- 三者都属于青浦西部水乡，具有可比较的地理背景；
- 既有共同性，又存在发展强度、旅游化程度、桥梁/宗教/街市结构差异；
- 足以测试“跨地点比较”，又不会像11镇那样导致资料量失控；
- 金泽可复用旧项目已有线索；
- 朱家角通常资料密度更高，可作为 source-rich 对照；
- 练塘作为第三点，帮助判断发现是否只是金泽/朱家角的个例。

本任务不要求三镇资料量相等。

---

# 3｜研究边界

## 地理范围

```text
上海市青浦区
金泽镇
朱家角镇
练塘镇
```

允许涉及：
- 淀山湖
- 太浦河
- 大蒸港
- 相关支流水系
- 与三镇直接发生历史联系的周边节点

但外部节点只作为关系节点，不扩大为新的研究主体。

## 时间范围

不预设单一朝代。

允许从可验证材料中建立：

```text
早期形成
→ 明清发展
→ 近代变化
→ 现代转型
→ 当代残留
```

如果某阶段无证据，必须留空，不得补齐“完整历史”。

---

# 4｜D01 Source Strategy

D01 必须同时使用三类入口。

## A｜Legacy Lead Pool

来源：

```text
沪上经纬旧项目 / 旧 public database
```

用途仅限：

```text
Research Lead
Source Lead
Entity Lead
Place Lead
Visual Lead
```

禁止：

```text
Legacy row → new Evidence
Legacy row → new Fact
Legacy row → G0 PASS automatically
```

至少提取：

- 三镇已有地点
- 桥梁
- 寺庙
- 人物
- 历史事件
- 图片线索
- 文献标题
- 旧关联线索

输出：

```text
LEGACY_LEAD_SUMMARY.md
```

只记录“值得重新查什么”。

---

## B｜上海图书馆开放数据

优先查询：

```text
上海地名志
历史文化事件
不可移动文物
优秀历史建筑
上海年华机构
人名规范库
舆图目录
古籍 / 地方文献书目
家谱 / 人物关联（仅当与三镇直接相关）
```

如 API 可使用，按现有 API key / source-provider contract 执行。

不得因为 API 返回记录，就自动认定为 Evidence。

---

## C｜外部开放来源

仅在上图数据无法回答关键问题时补充。

允许优先：

```text
政府 / 区志 / 镇志公开资料
国家或地方文物资料
开放数字图书馆
Wikidata（identity lead only）
Wikimedia Commons（confirmed identity asset retrieval only）
其它可追溯开放馆藏
```

Wikidata / Commons 必须遵守现行 Skill 边界。

---

# 5｜D01 搜索矩阵

每镇至少围绕：

```text
镇名
历史地名 / 异名
河流
桥
寺 / 庙
街 / 市 / 集
码头 / 航运
人物
产业
行政变化
旅游 / 当代改造
```

组合搜索。

不要平均搜。

使用：

```text
问题相关性
× 来源独立性
× 内容可获得性
× 可定位性
```

决定继续或停止。

---

# 6｜D01 Stop Rule

本实验禁止“大而全采集”。

单镇满足以下条件即可停止继续扩搜：

```text
≥ 3 类独立来源
≥ 2 类载体
至少覆盖：
  水路/空间
  桥或交通节点
  寺/公共文化节点
  市/商业或生活结构
至少存在 1 个可用于跨镇比较的事实组
```

若继续搜索 2 轮没有产生新的：

```text
Entity
Relation
Change
Conflict
Comparison dimension
```

则视为局部饱和。

---

# 7｜D02 Material Understanding

只处理与主问题有关的 Source。

每条 Evidence 至少：

```text
source
locator
raw_excerpt_or_region
literal_reading
research_proposition
source_voice
time_scope
space_scope
uncertainty
carrier_type
```

特别规则：

## 地方志 / PDF书影

不得只 OCR 标题。

必须尽量定位：

```text
页
卷
条目
上下文
```

## 舆图

必须区分：

```text
图上明确可见
推测对应
现代配准
```

不得把现代 GIS 对齐结果冒充原图事实。

## 图片

必须回答：

```text
画面里实际看见什么
地点身份如何确认
拍摄时间 / 大致时期
能证明什么
不能证明什么
```

---

# 8｜D03 Cultural World Construction

本实验重点对象：

```text
Town
River / Waterway
Bridge
Temple / Religious Site
Street / Market
Wharf
Institution
Person
Event
Change
```

重点 RelationClaim：

```text
bridge_crosses_waterway
bridge_connects_streets
temple_near_bridge
market_along_waterway
wharf_serves_market
town_connected_by_waterway
religious_site_supports_public_activity
transport_shift_changes_market
tourism_reuses_historic_space
```

Relation 名称可调整，但必须使用明确语义。

## 禁止

```text
空间接近 = 历史关系
同名 = 同一实体
共现 = 因果
现代位置 = 历史位置
```

---

# 9｜D04 Humanistic Discovery

至少尝试发现以下类型：

## A｜共同机制

例如：

```text
水路
→ 过河节点
→ 公共/宗教节点
→ 街市活动
```

是否反复出现？

注意：这只是待验证 hypothesis，不得预设为结论。

## B｜差异机制

例如：

```text
为什么朱家角形成更强的商业/旅游中心？
为什么金泽桥梁密度与宗教空间关系不同？
练塘的网络位置有什么不同？
```

只有证据支持才可输出。

## C｜历史变化

至少寻找一种：

```text
水运 → 公路
传统街市 → 现代商业
生活空间 → 遗产/旅游空间
宗教空间 → 公共文化空间
```

## D｜Present Connection

必须具体：

```text
今天还能在哪个地点看到？
用户站在那里能理解什么？
现在的空间为何仍是这样？
```

不得写泛泛“传承传统文化”。

---

# 10｜D04 Finding 最低标准

每个正式 Finding 必须：

```text
human_question
finding
understanding_delta
supporting G2 facts
counter_view / alternative
missing_evidence
uncertainty
present_connection
```

目标：

```text
3–6 个高质量 Finding
```

不是越多越好。

---

# 11｜D05 Trusted Read Model

选择最强的：

```text
2–4 个 Finding
```

组装为 L4。

至少产出：

```text
1 个三镇关系 world projection
1 个时间变化 projection
1 个 map/timeline projection
2–4 个 story seeds
2 个 evidence-on-demand paths
1 个可供墨痕 Agent 使用的 agent context
```

---

# 12｜实验型用户体验草案

不开发正式 UI。

只生成一个：

```text
EXP01_EXPERIENCE_PROOF.md
```

内容描述：

用户如果站在：

```text
金泽 / 朱家角 / 练塘
```

墨痕可以如何用：

```text
地图
时间
视觉材料
一句核心解释
追问
Evidence on Demand
```

让用户理解一个真实的人文变化。

这是内容证明，不是 UI 施工。

---

# 13｜Human Review

每阶段生成：

```text
D01 Human Review
D02 Human Review
D03 Human Review
D04 Human Review
D05 Human Review
```

必须使用正式模板。

Owner 审阅重点不是工程日志，而是：

```text
D01：到底找到什么资料？
D02：到底读懂什么？
D03：到底建立什么事实世界？
D04：到底发现什么值得讲？
D05：到底能给墨痕什么？
```

---

# 14｜最终实验报告

生成：

```text
tasks/experiments/EXP-01/EXP01_FINAL_REPORT.md
```

必须回答：

## A｜来源贡献

比较：

```text
Legacy Lead
上海图书馆
外部开放来源
```

分别贡献了多少：

```text
G0 PASS Source
G1 PASS Evidence
G2 World Object
G3 Finding
G4 Read Model
```

不要只比较抓取数量。

## B｜三镇比较价值

回答：

```text
三镇比较是否产生了单镇研究无法产生的理解？
```

## C｜11古镇方向评估

基于本次真实实验回答：

```text
11古镇是否应继续做顶层叙事主体？
```

从以下指标评价：

```text
资料密度差异
跨镇可比性
人文发现质量
地图/时间表达价值
用户理解增量
扩展成本
```

输出建议：

```text
KEEP_11_AS_PRIMARY
KEEP_11_AS_PLACE_INDEX
REDUCE_TO_THEMATIC_CLUSTERS
ABANDON_11
```

只能选一个主建议，并说明原因。

---

# 15｜禁止事项

```text
不得大规模爬取整个上海图书馆
不得一次扩大到11镇
不得为了数据量降低 G0–G4
不得把旧库直接迁成新事实
不得自动生成伪 Evidence
不得补齐缺失历史
不得修改 A–G 架构
不得修改 DB schema
不得改 hushang-jingwei
不得 Production deploy
不得 push / merge main
```

---

# 16｜实验成功标准

以下全部满足才算实验 PASS：

```text
三类 Source入口真实执行
D01→D05完整跑通
G0→G4真实执行
至少形成 3 个 G3 PASS Finding
至少形成 2 个 G4 PASS runtime object
Evidence on Demand 可回溯到 L0
三镇至少形成 1 个有意义的比较结果
最终能明确回答11古镇方向问题
```

若资料不足导致 Finding 不达标：

```text
实验可以 HOLD
不得造 Finding
```

---

# 17｜输出目录

```text
tasks/experiments/EXP-01/
├── EXP01_RESEARCH_INTENT.md
├── LEGACY_LEAD_SUMMARY.md
├── D01_HUMAN_REVIEW.md
├── D02_HUMAN_REVIEW.md
├── D03_HUMAN_REVIEW.md
├── D04_HUMAN_REVIEW.md
├── D05_HUMAN_REVIEW.md
├── EXP01_EXPERIENCE_PROOF.md
├── EXP01_SOURCE_CONTRIBUTION.md
├── EXP01_FINAL_REPORT.md
└── logs/
```

Machine reports 按当前正式 reporting contract 输出。

---

# 18｜最后动作

执行完成后：

```text
不扩大范围
不继续11镇
不改架构
不deploy
```

只输出：

```text
EXP01_STATUS = PASS / HOLD / FAIL
G0_source_count
G1_evidence_count
G2_world_object_count
G3_finding_count
G4_runtime_object_count
11_TOWN_RECOMMENDATION
result_path
unresolved_gaps
```

然后 STOP。

把 `EXP01_FINAL_REPORT.md` 和必要的 Human Review 文件交回 ChatGPT 做内容审查。
