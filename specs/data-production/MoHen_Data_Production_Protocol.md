# MOHEN · DATA PRODUCTION PROTOCOL V4.0

**版本：V4.0 · 2026-10-06**
**Authority：C2 V1.2 + C3 V1.3 之下唯一正式数据生产协议**

> 目标：把文化资料沿 D01–D05 稳定生产为 L0–L4，并由 G0–G4逐阶段验收。无人值守、有值守、开放搜寻、定向补证都不得形成平行生产链。

# PART 0｜总则

## 0.1 三链同轴

```text
D01 / L0 / G0
 ↓
D02 / L1 / G1
 ↓
D03 / L2 / G2
 ↓
D04 / L3 / G3
 ↓
D05 / L4 / G4
 ↓
L5 → L6 → L7 → D01
```

## 0.2 阶段交接合同

每个阶段统一采用：

`Entry → Work → Output → Gate → Disposition → Downstream Promise`

规则：**Dn 的 Gate PASS Output = Dn+1 的合法 Entry。**

## 0.3 规则即强制

每条长期生产规则必须能够映射到至少一种机器 enforcement：schema constraint、guard、registry validation、typed contract、test 或显式人工 Gate。无法强制的内容只能称为指导原则，不能冒充硬规则。

## 0.4 机器 Gate 与 Human Review View 分离

Machine Gate 判断“能不能过”。Human Review View 供项目拥有者判断“值不值得继续”。

每阶段必须提供：
- 叙事导向统计；
- 数据库真实内容表；
- 关键缺口/反例；
- ACCEPT / DEEPEN / DROP。

项目拥有者版本禁止塞入 run log、trigger、retry、checksum、token、latency 等技术控制噪声。

## 0.5 通用 disposition

机器侧允许：PASS / HOLD / REJECT。
人类内容侧允许：ACCEPT / DEEPEN / DROP。

二者不得混用。

---

# PART I｜D01 · Source Intake / L0 / G0

## 1.1 目标

找到**值得进入研究、实际可取得、身份清楚、可追溯**的文化资料，而不是尽可能多抓网页。

## 1.2 Entry

D01 的 Entry 是 `Research Intent + Scope`：
- place / region；
- time；
- object / topic；
- current question；
- known gaps；
- search_strategy = broad | directed；
- source classes to prioritize；
- negative/counter search intent。

Narrative Gap 只是 Research Intent 的一种来源，不是唯一入口。

## 1.3 Source Discovery Contract

### A. Search Context Pack
至少包含：研究对象、空间范围、时间范围、历史名称/别名、当前已知、未知、需反证点、已掌握来源传统。

### B. Query Matrix
至少允许组合：
- 地名 / 历史地名；
- 人物 / 机构；
- 对象 / 别名；
- 事件 / 动作；
- 时间；
- 制度 / 产业 / 交通 / 水系等主题；
- 相邻地区 / 同时期比较；
- 支持性查询 + 反例查询。

### C. Source Universe：T01–T14
T01 地方志/地方文献；T02 典籍/文学；T03 档案/契约/账簿/谱牒/碑刻；T04 报刊；T05 现代研究/文保/考古；T06 古代舆图；T07 现代测绘/地籍/规划；T08 历史照片/明信片/影像；T09 绘画/版画/插图；T10 器物/博物馆/考古图版；T11 现代现场；T12 结构化数据库/目录/开放数据；T13 口述/活态记忆；T14 内部派生/旧Story等。

T01–T14 是 source universe，不要求每次机械全覆盖。

### D. Source Independence
转引、转载、数据库镜像、同源复制必须识别依赖关系，不能把五次转引算成五个独立来源传统。

### E. Content Availability
至少区分：metadata_only / toc_or_index / OCR / fulltext / page_image / original_image / structured_record / field_verified。

只有 title/index 的对象可进入 L0 Source Lead，但不得作为 D02 PASS 输入。

### F. Search Saturation / Stop
可在以下情况停止扩展：
- 连续扩展只得到重复来源；
- 当前问题所需关键 source class 已覆盖；
- 新来源不再带来新的 proposition / counter-signal；
- 继续搜索的预期价值低于成本。

不得用“每类至少 N 条”作为通用完成标准。

## 1.4 Work

Discover → Acquire → Preserve Raw → Register Source/Version → classify carrier → record rights/provenance/dependency。

Raw append-only；不得用清洗结果覆盖原始材料。

## 1.5 Output：L0 Cultural Sources

至少包含 source identity、version、raw item、provider、rights、provenance、locator、availability、source dependency、why_relevant。

## 1.6 G0 Source Gate

检查：identity / version / raw integrity / rights / provenance / locator / provider / dependency / acquisition policy。

Disposition：PASS → Qualified Source；HOLD → acquisition/identity/rights问题；REJECT → 非法、损坏、错误范围或不可恢复。

## 1.7 Owner Review View

展示：来源类型覆盖、时期/地域覆盖、来源独立性、可获得性、关键缺口；并展示真实 Source title/type/date/place/availability/why_relevant/counter_value。

---

# PART II｜D02 · Material Understanding & Evidence / L1 / G1

## 2.1 目标

把 Qualified Source 真正读懂，形成可定位、可引用、可评价的 Material Evidence。

## 2.2 共用 Material Evidence Contract

每个合格材料单元至少包含：
- source_id / source_version；
- exact locator / media region；
- modality；
- raw excerpt / region；
- literal_reading；
- normalized evidence statement；
- research proposition；
- source_voice；
- time/place scope；
- uncertainty；
- extraction/reading method。

## 2.3 载体专用阅读规则

### 地方志 / 古籍
全文保留原文、版本、页码；书影必须有页级定位；OCR差时使用图像阅读+局部转录。题名/目录不能冒充正文证据。

### 古舆图
必须读图，不得只认标题。至少处理 label、symbol、topology、relative spatial relation、map semantics 与 geometry qualification。不能强迫所有古图变成现代精确GIS。

### 图片 / 绘画 / 影像
必须做 content-level visual reading：对象、活动、空间、视觉关系、画面时间/描绘时期、不确定性。

### 档案/契约/账簿/报刊等记录材料
优先识别 action/event/actor/object/time/place，而不是只做实体抽取。

### 现代研究
区分作者解释与作者引用的原始史料；二手解释不能伪装成一手证据。

### 结构化数据库
先恢复字段语义、provider、原始来源依赖、更新/版本语义，再消费字段值。

### 内部派生/Legacy
只能作为 lead / prior hypothesis，除非能回到原始来源，否则不得直接晋级为证据。

## 2.4 Evidence 成熟度

建议语义：interpreted → evidence_candidate → evidence_qualified。

Evidence Fragment 可以先于 Claim 存在；Claim Evidence Link 在 D03形成 Claim 后建立。

## 2.5 G1 Evidence Quality Gate

检查：
- 是否真正理解而非OCR/关键词；
- locator 可否重放；
- source_voice 是否明确；
- literal_reading 与 raw 是否一致；
- evidence applicability 边界；
- uncertainty；
- temporal/spatial fit；
- AI生成内容是否被错误当 Evidence。

## 2.6 Owner Review View

展示可理解率、Evidence类型/时期/地点/不确定性，以及真实 `raw excerpt/region + literal reading + proposition + source voice + uncertainty`。

---

# PART III｜D03 · Cultural World Structuring / L2 / G2

## 3.1 目标

把 L1 证据组织成受证据约束的文化世界对象，而不是把 Mention/共现直接实体化或关系化。

## 3.2 核心对象

Entity / Event / RelationClaim / Change / HistoricalSpaceClaim / ExternalCulturalNode / Visual-Material Object。

## 3.3 Structuring Rules

- Mention ≠ Entity；
- aliases / historical names 必须可追溯；
- Event 与 Change 分开；
- RelationClaim 必须带时空条件和 Evidence；
- same_name / near / located_in / same_period 不自动等于文化关系；
- modern_location 不自动等于 historical_space_claim；
- geometry 本身是 Claim。

## 3.4 Source Dependency

L2 Claim 的独立支撑必须识别来源依赖。同一引用链不得被误算为多源独立证成。

## 3.5 G2 World Integrity Gate

内部 checklist：
- identity；
- time semantics；
- spatial honesty；
- evidence support；
- source independence；
- factual conflict；
- candidate/adjudicated state；
- expression boundary。

旧 G1/G2/G3 与事实层旧 G4/G5 内容在此归并。

## 3.6 Owner Review View

展示人物/地点/事件/关系/变化/历史空间的结构统计，以及真实 L2 对象和 Evidence pointer。

---

# PART IV｜D04 · Humanistic Discovery / L3 / G3

## 4.1 目标

从可信文化世界中发现非平凡、可解释、可继续研究、真正增加理解的人文关系与问题。

## 4.2 Discovery 过程

Evidence/World objects → Signal → Finding/Question Candidate → humanistic selection / comparison / interpretation。

Signal 只说明“为什么可能有关”，不等于事实。

## 4.3 A01–A12 关联方法

A01 explicit predicate；A02 cross-source co-occurrence；A03 temporal overlap/sequence；A04 spatial topology；A05 action/material flow；A06 institution/mechanism；A07 cross-modal coreference；A08 structural cluster；A09 change chain；A10 conflict；A11 cross-regional/same-period comparison；A12 history-to-present trace。

每一种方法都必须记录 generation_method、supporting_signals、counter_signals。

## 4.4 Humanistic Finding Contract

至少包含：
- based_on L2 objects；
- generation_method；
- supporting_signals；
- counter_signals；
- human_question；
- understanding_delta；
- why_interesting；
- alternative_explanation；
- missing_evidence；
- present_connection（如适用）；
- uncertainty；
- next_research_action。

## 4.5 反噪声规则

- 同源重复不算独立支持；
- mentioned_in / near / same town / same period 为弱信号；
- embedding 只做 recall，不作证成；
- 标题相似只作 lead；
- 高频 supernode 降权；
- 内部 Story/StoryChapter 不作为独立证据；
- 模型常识只能作为外部假设，不能入 Evidence。

## 4.6 AVS / Ranking

AVS 可综合 source independence、specificity、temporal/spatial fit、action/mechanism、cross-modal、novelty、humanistic value、researchability、noise penalty。

**AVS 是排序工具，不是历史真伪概率。** 权重和阈值必须进入 versioned config，不写死在宪法。

## 4.7 五母题

五母题用于深化 interpretation 与 Narrative Readiness，可多母题、无母题、跨母题；不得作为 Source Gate 或 Truth Gate。

## 4.8 G3 Interpretation Gate

检查：fact basis、interpretation boundary、counter-view、alternative explanation、uncertainty、understanding_delta、present basis、non-triviality。

## 4.9 Owner Review View

展示发现类型、比较、变化链、冲突/替代解释、人文问题、Present Connection，并展示真实 `humanistic finding / question / understanding_delta / supporting facts / counter-view`。

---

# PART V｜D05 · Trusted Read Model Publication / L4 / G4

## 5.1 目标

把已通过 G0–G3 的 L0–L3 组合成 Agent/UI 可安全消费、可重算、只读的 L4。

## 5.2 L4 对象

world_projection / agent_context_view / story_seed / map-timeline projection / runtime discovery path / evidence pointer / expression_rule。

## 5.3 禁止事项

- D05 不回头制造 L2事实；
- D05 不替 D04新增无事实基础的意义；
- projection 不反写 Truth；
- Story Seed 不是历史事实。

## 5.4 G4 Runtime Eligibility

检查：L0–L3 lineage、前序 Gate状态、冲突表达规则、Evidence on Demand、expression_rule、projection只读、runtime eligibility。

## 5.5 Owner Review View

展示可发布 story seed、地图/时间轴投影、Evidence on Demand覆盖、Agent Context，并展示最终真实 L4 内容。

---

# PART VI｜Execution Contract

## 6.1 无人值守只是 execution mode

`execution_mode = attended | unattended | batch | interactive`。它不改变 D/L/G、表语义或 Gate。

## 6.2 Fail-closed

自动执行默认不猜。语义歧义、事实冲突、无法解释的空间重建等进入 HOLD，而不是靠重试或概率硬写。

## 6.3 Write Controls

- DRY_RUN / explicit write enable；
- environment allowlist；
- per-stage write_scope；
- minimum privilege；
- secrets 与 DB 凭据隔离；
- Raw append-only；
- no architecture mutation。

## 6.4 Reliability

Fail isolated / Idempotent / Bounded retry / No destructive cleanup / Rollback pointer / Stop condition。

语义歧义不得靠 retry 碰运气。

## 6.5 Run Attribution

每次正式生产执行必须可追踪 run_id、stage、rule_version、input scope、output set、Gate结果和 rollback pointer。

## 6.6 Production Registry

每个 Job 至少绑定：

```text
stage
data_layer
exit_gate
skill
executor
adapter
inputs
outputs
write_scope
lineage_requirements
gates_enforced_by
automation_policy
retry
rollback
stop_conditions
tests
```

无法回答“属于哪个 D、写哪个 L、过哪个 G”的 Job 不得进入正式 Registry。

## 6.7 Guard / Enforcement

Guard 属于 Cross-cutting Control，不是 Production Skill。任何硬规则都必须有相应 enforcement；Guard失败视为协议违反。

## 6.8 Reporting：机器报告与拥有者报告分离

### Machine Execution Report
面向自动化/工程：run、errors、retry、rollback、guard、SQL/constraint结果等。

### Human Review View
面向项目拥有者：叙事成果统计、真实内容、缺口/反例、ACCEPT/DEEPEN/DROP。

两者可由同一结构化 JSON 派生，但不得把机器噪声强塞给拥有者。

---

# PART VII｜L5–L7 消费、参与与回流

L4 → L5 Experience Runtime。

L6 保存观察、行走、贡献、策展、分享；L7保存今天仍发生的文化实践与新痕迹。

任何 L6/L7 内容若要成为长期 Source/Evidence/World，必须重新从 D01 开始。

---

# Appendix A｜T01–T14 Source Carrier Taxonomy

保留 PART I §1.3 的 T01–T14 为标准载体分类；具体 adapter 名称不属于宪法冻结项。

# Appendix B｜A01–A12 Association Methods

保留 PART IV §4.3 的 A01–A12 为首版可解释关联方法；未来可以增加方法，但必须维持 generation_method 可回放。

# Appendix C｜冻结边界

- 参数权重、阈值、Top-K → versioned config；
- 金泽/Legacy → cases/fixtures/validation；
- Skill 是否跨阶段 → Skill Migration Phase；
- 物理 Schema → Phase E；
- 无人值守不得形成独立数据链。
