**墨痕 · Humanistic Data OS**

数据库与文化世界数据架构 V1.1

可信、可发现、可参与、能够持续生长的活态人文世界

|                                                           |
| --------------------------------------------------------- |
| 核心命题：数据库不是为了把历史“装进去”，而是为了让墨痕能够在证据边界内持续发现文化关系，并把过去重新连接到今天。 |

版本：V1.1 · 2026-09-26  
定位：长期架构文档 / 数据模型基线 / Developer Skills 与 Agent Skills 的共同数据契约

> **状态入口（Live SOT）：当前数据库相关施工决断（R6 本地主库 / R8 漂移以主库为准 / R12 重跑 dump 等）以 `CURRENT.md` §12 为准；本文件只维护冻结的数据库与数据架构基线，不重复维护当前状态与决断。

# 0\. 执行摘要

|                                                                                               |
| --------------------------------------------------------------------------------------------- |
| 新的数据库核心不是“有多少条内容”，而是：来源是否可追溯、事实是否可判断、关系是否有证据、变化是否可解释、意义是否与事实分层、今天是否还能被重新观察，以及 Agent 能否据此继续发现。 |

| **层**                           | **回答的问题**                         | 架构性质                          |
| ------------------------------- | --------------------------------- | ----------------------------- |
| L0 Source                       | 原始资料是什么、从哪里来？                     | 长期来源                          |
| L1 Evidence                     | 哪一段材料具体支持什么？                      | 长期证据                          |
| L2 Cultural World               | 人、地、物、事、文本、机构、变化和关系是什么？           | 长期文化世界                        |
| L3 Meaning & Present            | 为什么值得理解？今天还能怎样看见？                 | 长期解释层，与事实隔离                   |
| L4 Discovery / Agent Read Model | 当前问题下哪些关系值得继续追？                   | 派生 / 可重算                      |
| L5 Experience Runtime           | 用户此刻正在经历什么？                       | 运行时状态                         |
| L6 Participation                | 人如何从理解走向观察、行走、记录、贡献、策展与分享？        | 参与层；连接数字体验与现实生活               |
| L7 Living Culture               | 今天正在发生的文化实践、地方记忆和新文化痕迹如何被保留并继续传承？ | 活态文化层；可形成新的 Source / Evidence |

墨痕数据库的最终目标，不是建立一个更大的历史资料库，也不只是让 AI 更方便地检索、讲解历史。它要支撑的是一个“活的人文世界”：过去的文化资料经过证据治理成为可信的文化世界；AI 帮助今天的人发现其中的关系、意义与当下连接；人的观察、行走、记忆、实践、贡献与再创造又形成新的文化痕迹，并在新的证据与治理过程中继续进入这个世界。

因此，墨痕真正关心的不只是“AI 如何解释文化”，而是“AI 如何影响活态文化的传承方式”：让文化从被保存、被展示、被讲解，转向在人、地方与日常生活之间持续被理解、体验、参与、传递和再生成。数据库架构必须从一开始就为这个循环服务。

完整主链不是单向漏斗，而是循环：Cultural Sources → Evidence → Cultural World → Meaning / Present Connection → Discovery → Experience → Participation → Living Culture → New Cultural Traces → Evidence / Cultural World。

这套架构同时坚持三条不可越过的边界：用户贡献不自动等于历史事实；AI 生成不等于文化证据；当代记忆不自动等于历史真相。新的文化痕迹可以进入系统，但必须保留来源、身份、语境与证据边界。

## 0.1 一张“人话版数据库总图”

**① 文化资料｜典籍、方志、档案、地图、照片、文保资料、口述、现代空间源与现场记录**

↓ 先保存“材料是谁留下的、在什么语境中留下、我们实际拿到了什么”

**② 证据｜Fragment / Span / Evidence / Conflict / Human Review**

↓ 只有证据能够支持的内容，才进入可信文化世界

**③ 文化世界｜人、地、事、物、文本、机构、关系、变化与历史空间**

↓ 事实与解释分开，在关系中理解过去

**④ 意义与今天｜Meaning / Present Connection / Open Question**

↓ AI 判断什么值得此刻继续发现，而不是把全部资料一次性倒给用户

**⑤ 发现与体验｜关系发现、比较、地图、时间、图像、证据、叙事、追问、Replan**

↓ 用户不只是“知道”，而是重新看见今天的地方、生活与自己

**⑥ 参与｜观察、行走、记录、个人探索轨迹、贡献、策展、分享、现实行动**

↓ 当代人的实践与记忆形成新的文化痕迹

**⑦ 活态文化｜今天仍在发生的地方记忆、文化实践、生活方式与新文化表达**

↓ 新文化痕迹重新进入来源与证据治理

**↺ 回到 Evidence / Cultural World：文化世界不是一次建完，而是在可信边界内持续生长**

# PART I｜数据库在 Humanistic Data OS 中的位置

## 1.1 数据库不是产品页面的后台

墨痕的长期链路应理解为一个循环：Cultural Sources → Evidence & Provenance → Cultural World → Meaning / Present Connection → Discovery & Agent Runtime → Experience → Participation → Living Culture → New Cultural Traces → Evidence / Cultural World。数据库不仅承载过去的可信真相，也必须为当代参与形成的新文化痕迹保留可治理、可追溯的回流路径。

因此，页面需要什么字段，不再反向决定数据库怎么长；Agent 想讲什么故事，也不能反向制造事实。Experience 可以变化，Truth Store 必须稳定。

## 1.2 与“双 Skill 架构”的分工

| **系统**             | **主要职责**                         | **与数据库的关系**                   |
| ------------------ | -------------------------------- | ----------------------------- |
| Humanistic Data OS | 定义资料如何成为可信、可计算、可体验的人文数据          | 提供统一数据生命周期与治理                 |
| Developer Skills   | 采集、解析、清洗、实体对齐、证据切片、关系候选、质检、导入、迁移 | 主要写入与维护 Truth Store           |
| Agent Skills       | 检索、比较、发现关系、解释证据、组织体验、追问与 Replan  | 主要读取受控 Read Model；原则上不直接改历史事实 |
| Human Review       | 处理身份歧义、历史因果、空间锚点、跨源冲突、敏感解释       | 是数据晋级的人工 Gate                 |

## 1.3 四条数据库宪法

  - Evidence before Knowledge：没有证据边界的内容不能因为“看起来合理”进入 Runtime Truth。

  - Fact–Interpretation Firewall：事实/关系可以支持意义；意义不能反向制造事实。

  - Geometry is a Claim：历史点、线、面本身也是主张，必须记录来源、方法、置信度与不确定性。

  - Stable Truth, Variable Experience：事实、证据和关系长期稳定；Agent 可以因用户目标不同而重新组合体验。

# PART II｜八层长期数据地图：从资料到活态文化循环

## 2.1 L0 · Cultural Sources

Source 层保存“材料本身”和来源身份，不直接等同于历史事实。上图开放数据、古籍/方志、档案、论文、文保资料、历史地图、老照片、现代地图与现场观察都可以进入 Source，但它们的权威性、观察位置和可表达范围不同。

| **对象**          | **职责**        | **核心字段**                                                                                                   |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| source\_record  | 来源主记录         | id, source\_type, title, creator, publisher/institution, date, url/catalog\_no, rights, provenance\_status |
| source\_version | 来源版本/抓取版本     | source\_id, version\_no, captured\_at, checksum, storage\_ref                                              |
| raw\_item       | 原始文本/图像/结构化记录 | source\_version\_id, raw\_type, raw\_payload, original\_locator                                            |
| ingestion\_run  | 一次采集/解析过程     | skill\_id, started\_at, params, result, errors                                                             |

## 2.2 L1 · Evidence & Provenance

Evidence 不再是 Relation 表里的一段备注，而是独立的一等对象。最小证据单位允许细化到 Fragment / Span：同一页材料中可以只有一句话支持某个 Claim，而另一句话不能被顺带当成证据。

| **对象**                | **职责**               | **关键字段**                                                                                     |
| --------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| evidence\_fragment    | 最小可引用证据片段            | id, source\_id, locator, quote\_or\_extract, normalized\_text, media\_region, evidence\_type |
| evidence\_assessment  | 证据质量与适用边界            | fragment\_id, reliability, directness, temporal\_fit, spatial\_fit, reviewer, decision       |
| claim\_evidence\_link | Claim 与 Evidence 多对多 | claim\_id, fragment\_id, support\_type, weight/note                                          |
| conflict\_set         | 同一问题的冲突证据集合          | id, issue, member\_claims/evidence, resolution\_status                                       |
| human\_review         | 需要人工裁决的记录            | target\_type/id, reason, reviewer, decision, rationale, reviewed\_at                         |

## 2.3 L2 · Cultural World

这是墨痕的“历史文化世界”，不是简单知识图谱。对象数量不是核心指标，关系的证据密度、时间空间条件、变化链和可继续发现能力才是核心。

| **核心对象**             | **职责**                   | **事实层级**    |
| -------------------- | ------------------------ | ----------- |
| Entity               | 相对稳定的人、地、物、机构、文本、建筑、器物等  | 事实          |
| Event                | 发生于时间中的事件或过程             | 事实          |
| RelationClaim        | 对象之间被明确主张的关系             | 事实 / 候选     |
| Change               | 对象或关系的 before → after 变化 | 事实          |
| HistoricalSpaceClaim | 历史空间位置、邻接、跨水、范围、几何等主张    | 事实 / 候选     |
| ExternalCulturalNode | 由关系触发但不属于当前地方内部世界的外部节点   | 事实 / 候选     |
| VisualAsset          | 照片、绘画、地图、图版、视频等视觉材料      | 来源事实 + 描绘语义 |

## 2.4 L3 · Meaning & Present Connection

这是墨痕区别于普通历史数据库的关键层，但它必须与事实层隔离。MeaningCandidate 回答“为什么这个关系值得理解”；PresentConnection 回答“今天还能怎样观察、理解、行走、比较或感受它”。

| **对象**              | **问题**             | **关键字段**                                                                                             |
| ------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| meaning\_candidate  | 这个关系改变了我们对什么的理解？   | derived\_from\_claims, interpretive\_statement, theme, uncertainty, expression\_rule                 |
| present\_connection | 这段过去怎样重新进入今天？      | connection\_type, basis\_claims, present\_status, observation\_hint, actionability, expression\_rule |
| open\_question      | 还缺什么证据 / 下一步值得追什么？ | question, based\_on, missing\_evidence, priority, status                                             |

## 2.5 L4 · Discovery / Agent Read Model

这一层不是新的历史真相库，而是为 Agent 提供“可安全读取、可快速发现”的投影。Relation、Discovery Candidate、Story Seed 必须分开：Relation 是被证据支持的关系；Discovery Candidate 是当前目标下值得继续探索的可能路径；Story Seed 是可组织体验的叙事入口。

| **派生对象**             | **用途**                                                   | **是否可直接当事实** |
| -------------------- | -------------------------------------------------------- | ------------ |
| world\_projection    | 把 Entity/Event/Claim/Meaning/Present 聚合成可查询世界状态          | 否，引用底层事实     |
| discovery\_candidate | 根据 Unexpectedness、Relevance、Meaning、EvidenceStrength 等排序 | 否            |
| story\_seed          | 可进入体验编排的叙事起点                                             | 否            |
| agent\_context\_view | 针对当前地点/问题/时期生成最小上下文                                      | 否            |

## 2.6 L5 · Experience Runtime

ExperienceState、CompositionState、ExperienceAction、Trail 等属于运行时。它们很重要，但不能和历史事实表混在一起。需要持久化时，应单独进入 runtime/session schema，且清楚标记为用户会话状态。

|                                                               |
| ------------------------------------------------------------- |
| 长期 Truth Store ≠ Agent Memory ≠ Experience State。三者必须物理或逻辑分区。 |

## 2.7 L6 · Participation

Participation 不是“社区功能”的同义词，而是文化理解重新进入现实生活的接口。它承载用户的现场观察、行走路线、个人探索轨迹、口述与记忆贡献、策展、分享和现实行动。其价值不在互动数量，而在于人的参与是否让文化重新与地方和生活发生关系。

参与内容首先是 Contribution / Trace，而不是 Truth。每一条可沉淀内容都必须保留 contributor / observed\_at / place\_context / source\_or\_basis / consent\_or\_rights / review\_status 等来源与语境信息；需要进入可信文化世界时，再经过 Evidence Gate 与 Human Review。

## 2.8 L7 · Living Culture

Living Culture 表示今天仍在发生、仍被人实践和记忆的文化：地方生活方式、空间使用、仪式与习俗、手艺、口述记忆、社区叙事、当代表达，以及由新的探索和参与形成的文化痕迹。它不是“历史资料的尾声”，而是墨痕整个数据世界最终重新回到生活的地方。

L7 与 L0/L1 形成闭环：新的文化痕迹可以成为新的 Source，但只有在来源、语境、权利与证据边界清楚后，才可能成为后续用户可依赖的 Evidence 或 Cultural World 内容。AI 可以帮助发现、组织、比较和连接，但不能把自身生成内容升级为文化证据。

# PART III｜核心文化世界对象模型

## 3.1 Entity：统一对象，不再以页面栏目拆表

| **字段**          | **建议类型**    | **说明**                                                            |
| --------------- | ----------- | ----------------------------------------------------------------- |
| id              | uuid        | 稳定主键                                                              |
| entity\_type    | enum/text   | person/place/building/object/organization/text/work/landscape/... |
| canonical\_name | text        | 标准名                                                               |
| aliases         | jsonb       | 旧称、俗称、异体、历史名称                                                     |
| summary         | text        | 经审核短描述；不是证据本身                                                     |
| temporal\_scope | jsonb/range | 存在或有效时期；允许模糊时间                                                    |
| spatial\_scope  | jsonb       | 空间语义引用，不等同于现代坐标                                                   |
| status          | enum        | candidate/reviewed/published/archived                             |
| source\_refs    | relation    | 来源索引；重要事实仍通过 Claim-Evidence 表达                                    |

## 3.2 Event 与 Change 必须分开

Event 表示“发生了什么”；Change 表示“这个事件使对象/关系从什么状态变成什么状态”。例如 1938 年某事件是 Event；桥梁毁损、空间关系断裂是 Change。这样 Agent 才能真正回答“时间如何改变它们”。

| **对象** | **示例结构**                                                                      |
| ------ | ----------------------------------------------------------------------------- |
| Event  | 1938 事件；time\_scope；place\_refs；participants；evidence\_refs；epistemic\_status |
| Change | target=桥/关系；before\_state；after\_state；event\_ref；evidence\_refs；status       |

## 3.3 RelationClaim：文化关系的核心

普通数据库 Relation 只说 A 与 B 有连接；墨痕的 RelationClaim 必须说明：谁与谁、是什么关系、在什么时间/空间条件下成立、证据是什么、认知状态是什么、是否存在冲突、怎样表达、它能否触发意义与进一步发现。

| **字段组** | **字段**                                            |
| ------- | ------------------------------------------------- |
| 三元组     | subject\_id, predicate, object\_id                |
| 时空条件    | temporal\_scope, spatial\_scope                   |
| 证据      | evidence\_refs / claim\_evidence\_link            |
| 认识状态    | epistemic\_status, uncertainty, conflict\_set\_id |
| 解释连接    | meaning\_refs, present\_connection\_refs          |
| 发现能力    | discovery\_affordance                             |
| 表达约束    | expression\_rule                                  |

## 3.4 Epistemic Status：把“知道多少”写进数据

| **状态**               | **Runtime 表达规则**    |
| -------------------- | ------------------- |
| SUPPORTED            | 可在证据范围内直接表达         |
| SUPPORTED\_CANDIDATE | 必须带来源或限定词，不得写成确定事实  |
| CONFLICTED           | 必须暴露冲突，不替用户偷偷裁掉异说   |
| INTERPRETIVE         | 明确是解释，可用“可以这样理解”等语气 |
| OPEN\_QUESTION       | 明确指出未知与缺失证据         |
| UNSUPPORTED          | 不得进入正向 Runtime 事实输出 |

## 3.5 Cultural Relation ≠ Structural Relation

| **结构关系**           | **不能自动推出** | **成为文化关系还需要**              |
| ------------------ | ---------- | -------------------------- |
| located\_in        | 宗教、经济、因果影响 | 明确 Claim + 时间条件 + Evidence |
| near               | 历史联系       | 关系证据或可证实的空间功能              |
| same\_name         | 同一对象/历史继承  | 身份对齐与来源证明                  |
| part\_of\_place    | 内部对象继承镇级事件 | 对象级证据                      |
| modern\_coordinate | 历史位置相同     | 历史空间 Claim / 锚点 / 配准证据     |

# PART IV｜Evidence Gate 与数据晋级

## 4.1 数据不是“导入成功”就进入墨痕世界

Developer Skill 的任务不是把材料批量塞进数据库，而是推动对象沿着明确状态晋级。建议把 Candidate Reservoir 与 Runtime World 分开：旧沪上经纬、开放数据和外部资料首先进入候选池，只有经过证据与身份判断后才成为可运行世界。

| **阶段**            | **允许内容**                           | **禁止**              |
| ----------------- | ---------------------------------- | ------------------- |
| RAW               | 原始材料与机器解析结果                        | 当作事实输出              |
| CANDIDATE         | 实体/关系/时间/空间候选                      | 直接进入用户体验            |
| ADJUDICATED       | 通过 Evidence / Human Review 的 Claim | 超出证据边界表达            |
| RUNTIME\_ELIGIBLE | 满足表达与体验条件                          | 绕过 expression\_rule |
| PUBLISHED         | 可面向用户稳定使用                          | 失去 provenance 链     |

## 4.2 Evidence Gate G0-G6 的数据库落点

| **Gate** | **检查内容**         | **建议落点**                       |
| -------- | ---------------- | ------------------------------ |
| G0 来源完整  | 来源身份、版本、定位信息     | source\_record/source\_version |
| G1 对象身份  | 同名、别名、对象是否同一     | entity\_identity\_review       |
| G2 时间语义  | 确定/约略/区间/相对年代    | temporal\_scope + assessment   |
| G3 空间诚实  | 现代坐标与历史空间是否混淆    | historical\_space\_claim       |
| G4 证据支撑  | Claim 是否有直接/间接证据 | claim\_evidence\_link          |
| G5 冲突    | 异说是否保留           | conflict\_set                  |
| G6 发布资格  | 是否允许进入 Runtime   | eligibility/status             |

## 4.3 Evidence Perspective / Provenance：保留为扩展位

现阶段不建议立即增加一个简单的 perspective 枚举字段。此前架构讨论已经确认：source\_type、作者/编者/出版者、institutional\_position、historical\_actor/observer、narrative\_perspective、later\_interpretation/legend 并不是同一维度。V1.1 只预留 provenance\_extension JSONB 或独立扩展表接口；待真实材料出现“不同来源传统导致 Agent 解释不同”的案例后，再升级正式 Contract。

# PART V｜时间、空间与视觉资产

## 5.1 时间不是一个 start\_year/end\_year 就结束

时间字段若只用 start\_year/end\_year 足以驱动筛选，但墨痕需要表达约略年代、区间、前后关系、来源中的纪年以及不确定性。建议统一 TemporalScope：precision、start、end、label、calendar/source\_text、confidence。

## 5.2 Historical Space ≠ Historical Geometry

| **空间对象**                 | **含义**            | **例子**                          |
| ------------------------ | ----------------- | ------------------------------- |
| modern\_location         | 今天可定位的真实位置        | 当前桥址、寺址、街道                      |
| historical\_space\_claim | 历史上的位置/邻接/跨越/范围主张 | “桥跨某水道”                         |
| historical\_geometry     | 有来源和方法的历史点线面      | 配准后河道、城镇边界                      |
| spatial\_anchor          | 历史图与现代空间的锚点       | 仍存桥、河口、寺址                       |
| reconstruction\_geometry | 依据证据重建的几何         | 必须记录 method/confidence/reviewer |

## 5.3 Visual Asset

| **字段组** | **关键字段**                                        |
| ------- | ----------------------------------------------- |
| 身份      | id, media\_type, title, provider, source\_id    |
| 时间      | creation\_date 与 depicted\_period 分离            |
| 内容关联    | entity\_refs, event\_refs, place\_refs          |
| 空间对应    | correspondence\_type, anchor\_refs              |
| 权利      | rights, license, usage\_scope                   |
| 可信度     | provenance\_status, uncertainty, review\_status |
| 体验用途    | eligible\_surfaces, crop/annotation metadata    |

|                                                                                              |
| -------------------------------------------------------------------------------------------- |
| 历史视觉缺失允许降级；不允许用 AI 生成图像冒充历史证据。Missing Asset ≠ Experience Failure；Fabricated Asset = Failure。 |

# PART VI｜PostgreSQL 物理结构建议

V1.1 不建议一次建设几十张高度规范化的表。物理层应保持“长期可扩展 + 当前金泽可施工”。建议按 schema 分区，而不是把所有对象扔进 public。

| **Schema**    | **当前建议表**                                                                    |
| ------------- | ---------------------------------------------------------------------------- |
| source        | source\_record, source\_version, raw\_item, ingestion\_run                   |
| evidence      | fragment, assessment, claim\_evidence\_link, conflict\_set, human\_review    |
| world         | entity, event, relation\_claim, change, external\_node                       |
| spatial       | modern\_location, historical\_space\_claim, geometry\_claim, spatial\_anchor |
| visual        | visual\_asset, visual\_link                                                  |
| meaning       | meaning\_candidate, present\_connection, open\_question                      |
| runtime\_read | world\_projection/materialized views, discovery\_candidate cache（可后建）        |
| experience    | session, experience\_state\_snapshot, trail（仅需要持久化时）                         |

## 6.1 当前最小核心表集（建议 18 张以内）

| **优先级** | **表**                                                      | **现在是否需要**    |
| ------- | ---------------------------------------------------------- | ------------- |
| P0      | source\_record / source\_version / raw\_item               | 需要            |
| P0      | evidence\_fragment / claim\_evidence\_link / human\_review | 需要            |
| P0      | entity / event / relation\_claim / change                  | 需要            |
| P0      | meaning\_candidate / present\_connection                   | 需要            |
| P0      | visual\_asset                                              | 需要            |
| P1      | conflict\_set / evidence\_assessment                       | 金泽已有冲突场景，建议需要 |
| P1      | historical\_space\_claim / modern\_location                | 需要，防止空间混淆     |
| P1      | external\_node / open\_question                            | 关系扩展时需要       |
| P2      | geometry\_claim / spatial\_anchor                          | GIS 小切片触发后再建  |
| P2      | experience session/state 持久化                               | 真实用户会话需要时再建   |

## 6.2 JSONB 与关系表的边界

aliases、temporal\_scope、expression\_rule、uncertainty detail 等可先用 JSONB 保持灵活；但 Entity↔Claim、Claim↔Evidence、Asset↔Entity 等需要查询、追踪和完整性约束的关系，不应长期塞进 JSON 数组。原则是：会被频繁 join、审计、反向查询的关系，做关联表；仅作为对象内部可变描述的结构，才用 JSONB。

## 6.3 不要现在建的东西

  - 不要为“未来社区”预建点赞、关注、评论、信息流等表。

  - 不要因为可能用知识图谱，就立刻引入独立图数据库；PostgreSQL 足以承载当前 RelationClaim 图。

  - 不要因为未来可能做 GIS，就提前批量生产历史 geometry。

  - 不要把 Discovery Candidate、Agent 推理草稿当永久历史事实。

  - 不要为每个古镇复制一套表；town/place 应是世界中的对象或 scope，不是数据库分叉单位。

  - 不要继续让 Story/StoryChapter 成为知识真相层。Story 是体验投影，不是事实容器。

# PART VII｜金泽：一条 Living Cultural Relation Cluster 如何落库

当前已工程化的第一关系簇是：颐浩寺—吕颐浩—万安桥/普济桥—1938 断裂—1992 原址重建—今天的遗址/复建观察。它适合作为数据库最小验收样本，因为同时覆盖 Entity、Event、Relation、Change、Meaning、Present Connection 与 Evidence。

| **层**             | **金泽示例**                           |
| ----------------- | ---------------------------------- |
| Source            | 方志/文保/开放数据/现代空间资料等原始来源             |
| Evidence          | 关于桥名、水道、寺院、1938 事件、1992 重建等具体片段    |
| Entity            | 颐浩寺、吕颐浩、万安桥、普济桥、相关水道               |
| Event             | 1938 断裂事件；1992 重建事件                |
| RelationClaim     | 人物—寺院；桥—水道；对象—事件；重建—原址等有证据关系       |
| Change            | 存在/毁损/重建/现状等状态变化                   |
| Meaning           | 桥、寺、水网不是三个孤立 POI，而是可共同理解地方历史结构的关系簇 |
| PresentConnection | 今天到现场还能观察哪些遗存、复建、空间关系；哪些仍不可确定      |
| Discovery         | 从桥追到寺、人物、断裂、重建与今天，而不是返回“附近还有什么景点”  |

## 7.1 一个 Claim 的示意记录

| **字段**                    | **示意**                                                  |
| ------------------------- | ------------------------------------------------------- |
| subject                   | 万安桥                                                     |
| predicate                 | crosses / related\_to\_waterway（以实际证据裁决后的 predicate 为准） |
| object                    | 相关水道对象                                                  |
| temporal\_scope           | 证据支持的历史时期                                               |
| evidence\_refs            | 指向具体 Evidence Fragment，而非只写来源名称                         |
| epistemic\_status         | SUPPORTED / SUPPORTED\_CANDIDATE 等                      |
| uncertainty               | 对象名、位置或时间若有歧义则明确记录                                      |
| meaning\_refs             | 为什么该关系有助于理解金泽水网生活世界                                     |
| present\_connection\_refs | 今天现场还能如何观察该关系                                           |
| expression\_rule          | Agent 可以说到什么程度、必须带什么限定                                  |

## 7.2 这条链如何被 Agent 使用

Agent 不直接“读数据库然后编故事”。它先从受控 World Projection 获得对象和可运行 Claim，再根据当前 Intent 选择值得追的关系；Evidence Gate 决定能否表达；Meaning / PresentConnection 决定为什么值得继续；最后 Experience Engine 才把它组织为地图、时间、图像、证据与追问。

# PART VIII｜数据生命周期与双 Skill 工作流

## 8.1 Developer Skills：把资料变成可运行世界

  - Source Ingest Skill：抓取/导入并生成 Source Record、Version、Raw Item。

  - Structure Extraction Skill：从文本/表格/图像中抽取实体、时间、地点、候选关系。

  - Entity Resolution Skill：别名、同名、历史名称与对象身份对齐。

  - Evidence Fragment Skill：把来源切成可定位、可引用的最小证据单元。

  - Claim Builder Skill：形成 Relation/Event/Change 候选，不直接发布。

  - Evidence Adjudication Skill：跑 G0-G6、标冲突、生成 Human Review 队列。

  - Spatial Evidence Skill：处理现代位置、历史空间主张、锚点与几何候选。

  - Visual Asset Skill：处理来源、权利、creation date、depicted period 与对象关联。

  - Projection Builder Skill：把已通过 Gate 的世界构造成 Agent 可读投影。

## 8.2 Agent Skills：在可信世界中发现与组织

  - Context Grounding：确定用户当前地点、对象、时期和问题。

  - Evidence Retrieval：只检索与当前目标相关的 Evidence / Claim。

  - Relation Discovery：沿有证据关系寻找意外但相关的下一跳。

  - Temporal/Spatial Compare：比较不同时期、地点、尺度与对象状态。

  - Conflict Explain：在不抹平异说的前提下解释冲突。

  - Meaning Bridge：从事实关系进入受约束的人文解释。

  - Present-day Reconnection：把历史理解重新连接到今天的观察、旅行、生活和问题。

  - Experience Compose / Replan：输出 ExperienceAction / Patch，而不是直接生成任意 UI。

## 8.3 写权限原则

|                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- |
| Developer Skills 可以在 Gate 与审计下写 Truth Store；Agent Skills 默认只读 Truth Store。Agent 产生的新关系、新解释或用户贡献，先进入 Candidate/Proposal 区，不得直接升级为历史事实。 |

# PART IX｜从“沪上经纬”旧库迁移

| **旧对象**      | **新归宿**                             | **迁移规则**                                                  |
| ------------ | ----------------------------------- | --------------------------------------------------------- |
| Town         | Entity(place/settlement) 或 scope    | 不再作为所有内容强制父表                                              |
| Entity       | world.entity                        | 重新做 identity / provenance                                 |
| Place        | modern\_location + entity           | 现代坐标不得冒充历史位置                                              |
| TimePeriod   | temporal vocabulary / TemporalScope | 从页面过滤器升级为对象时间语义                                           |
| Relation     | relation\_claim candidate           | 旧 evidence 文本拆为 Evidence；重新 Gate                          |
| Story        | story\_seed / experience projection | 不作为历史真相                                                   |
| StoryChapter | experience/narrative projection     | 不作为事实存储                                                   |
| Media        | visual\_asset                       | 补 creation\_date / depicted\_period / rights / provenance |

## 9.1 135 条古镇数据怎么处理

不建议直接“升级表结构后全量迁移”。正确做法是把旧数据视为 Candidate Reservoir：先保留原始记录和来源，再选一个真实体验需要的关系簇进行最小迁移与裁决。金泽已经证明这种方式比批量清洗更适合当前阶段。只有字段映射、Evidence Gate 和 Human Review 成熟后，才适合批量化为 Developer Skill。

# PART X｜治理、验收与版本演进

## 10.1 数据库验收不看“表建完没有”

| **Gate**           | **验收问题**                           |
| ------------------ | ---------------------------------- |
| Traceability       | 任何重要 Claim 能否追到具体来源和证据片段？          |
| Epistemic Honesty  | 支持、候选、冲突、解释、未知是否被区分？               |
| Temporal Honesty   | 时间是否允许区间、模糊与来源语义？                  |
| Spatial Honesty    | 现代坐标、历史空间、历史几何是否分权？                |
| Relation Depth     | 从一个对象出发能否沿有证据关系继续探索，而非只剩 POI？      |
| Meaning Firewall   | Meaning 是否没有反向污染事实？                |
| Present Connection | 是否能从过去回到今天，而不是停在说明牌知识？             |
| Agent Usability    | Agent 是否能在不读 Raw 的情况下安全检索与 Replan？ |

## 10.2 当前冻结 / HOLD / Later

| 实施状态                 | **内容**                                                                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FROZEN               | Source→Evidence→Cultural World→Meaning/Present→Discovery→Experience→Participation→Living Culture→New Cultural Traces→Evidence/Cultural World 的长期循环；Fact–Interpretation Firewall；Geometry is a Claim；RelationClaim Contract；Contribution ≠ Fact；AI Generation ≠ Evidence |
| CURRENT              | 以金泽 Living Cultural Relation Cluster 校准 Source / Evidence / World / Meaning / Experience 的当前物理表、迁移与 Read Model                                                                                                                                                          |
| HOLD                 | Evidence Perspective / Provenance 正式 Schema；大规模 GIS；图数据库；通用社区用户系统                                                                                                                                                                                                       |
| LATER IMPLEMENTATION | Participation / Living Culture 的物理表与用户系统，待真实行为出现后再决定；但 L6/L7 已属于正式长期数据地图与目标架构                                                                                                                                                                                           |

## 10.3 V1.1 后的正确下一步

这份文档首先是 C3 数据与文化世界宪法，不应直接触发“大改数据库”。当真实体验、数据质量或 Runtime 暴露 DB\_GAP 时，开发平台可先对现有 PostgreSQL schema 与真实数据做只读 Audit；若只是既有 Contract 内的 KEEP / MIGRATE / CLEANUP，可直接实施。只有涉及核心对象模型、Evidence/Meaning 边界、写权限、L6/L7 正式 Schema 或基础数据范式变化时，才进入 Architecture Reconciliation。

|                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 施工顺序：C1/C3 架构边界 → 真实现库只读审计 → 明确 DB\_GAP → 最小迁移/清理 → 开发总工程师 直接实施 → 数据 Gate 验收。只有涉及核心对象模型、Evidence/Meaning 边界、写权限、L6/L7 正式 Schema 或基础数据范式变化时，才升级为 Architecture Reconciliation；默认不经由 Task Book 中转。 |

# 附录 A｜推荐命名规范

数据库对象使用英文 snake\_case；用户可见中文由 presentation/translation 层处理。ID 使用 UUID；时间、空间、认识状态与来源状态使用受控枚举或可扩展 vocabulary；所有关键表保留 created\_at / updated\_at，审核类对象保留 actor / decision / rationale / timestamp。

# 附录 B｜本 V1.1 的资料依据

  - 《沪上经纬\_数据库设计说明书\_V1.0》：早期 Town / Entity / Place / TimePeriod / Relation / Story / StoryChapter / Media 模型及时间轴、关系模型。

  - 《墨痕 Agent 2.0｜总体架构与改造路线图 V4.8》：Evidence & Provenance、Humanistic World、Historical Space / Geometry、Discovery / Runtime / Experience、Living Cultural Relation Model。

  - C1《MoHen · Product, Architecture & Evolution Constitution V1.0》：Cultural World Object Model、Cultural Relation Contract、Fact–Interpretation Firewall、Present Connection、Agent-native Experience、Evolution Horizons 与治理边界。

  - C2《MoHen · Humanistic Data OS & Dual Skill Architecture V1.0》：Humanistic Data OS 作为长期数据生产与能力沉淀框架；Developer Skills 与 Agent Skills 分工；L6 Participation / L7 Living Culture 与 C3 的八层长期数据地图保持同义。

# 附录 C｜一句话记住整个数据库

|                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------- |
| 原始资料不等于事实；事实不等于关系；关系不等于意义；意义不等于今天；今天的参与也不自动等于新的历史事实。墨痕数据库的最终价值，是让过去通过可信关系重新进入今天，又让今天真实发生的文化实践与新文化痕迹在证据边界内继续进入文化世界，使文化在人、地方与日常生活之间持续活下去。 |
