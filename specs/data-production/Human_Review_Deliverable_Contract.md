# Phase C6｜Human Review Deliverable Contract V1.0

**对象：项目拥有者阶段审阅成果**  
**不是：Machine Gate Report / Run Log / Guard Audit**

---

# 1｜统一输出

每个 D 阶段生成：

```text
stage-review-D0X.json   # Canonical structured review data
stage-review-D0X.md     # 人读审阅版
stage-review-D0X.html   # 可选，由 JSON/MD 生成
```

三者不得各自维护不同数字。

---

# 2｜统一结构

```json
{
  "stage": "D01",
  "data_layer": "L0",
  "gate": "G0",
  "scope": {},
  "content_stats": {},
  "narrative_relevant_records": [],
  "gaps_and_counterexamples": [],
  "owner_decision": null
}
```

Owner Decision：

```text
ACCEPT
DEEPEN
DROP
```

不是 PASS/HOLD/REJECT；不得回写 Machine Gate。

---

# 3｜D01 Review View

可视化：
- carrier/source-type覆盖；
- 时间/地域覆盖；
- Source Independence；
- content availability；
- 关键缺口；
- counter-source coverage。

真实表字段：
```text
title
source_type
carrier_type
date
place_scope
creator/institution
content_availability
source_independence
why_relevant
counter_value
```

不展示：
checksum、HTTP、retry、raw path、技术异常栈。

---

# 4｜D02 Review View

可视化：
- readable → evidence-qualified 转化；
- 载体分布；
- Evidence type；
- 时间/空间适用；
- uncertainty；
- source_voice。

真实内容：
```text
source_title
locator
raw_excerpt_or_region
literal_reading
research_proposition
source_voice
uncertainty
```

必须让拥有者能够判断：
> AI是真的读懂了，还是只做了OCR/标题/NER。

---

# 5｜D03 Review View

可视化：
- Entity/Event/Relation/Change/HistoricalSpace结构；
- relation类型；
- 时序分布；
- evidence density；
- conflict / ambiguity。

真实内容：
```text
world_object
type
time_scope
space_scope
relation_or_change
key_evidence_excerpt
epistemic_status
conflict_summary
```

---

# 6｜D04 Review View

可视化：
- finding type；
- 变化链/比较/关系/机制；
- source independence；
- counter-view；
- humanistic theme；
- present connection；
- novelty / specificity。

真实内容：
```text
human_question
finding
understanding_delta
supporting_facts
counter_view
missing_evidence
present_connection
uncertainty
```

这里是项目拥有者最重要的“值不值得讲”审核层。

---

# 7｜D05 Review View

可视化：
- story seed数量与类型；
- map/timeline projection coverage；
- Evidence on Demand coverage；
- unresolved conflict exposure；
- Runtime Eligible composition。

真实内容：
```text
story_seed
agent_context
map_time_projection
evidence_pointer
expression_rule
source_trace_summary
```

---

# 8｜Owner Review 不得包含

除非用户主动要求：
- SQL
- trigger
- guard
- run log
- retry
- latency
- token
- checksum list
- constraint trace
- full internal audit rows

原则：

> **项目拥有者审核内容价值；机器审核技术合法性。**
