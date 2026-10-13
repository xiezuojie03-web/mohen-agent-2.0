# D03 Stage Output Report Template

**Stage:** D03  
**Layer:** L2  
**Gate:** G2  
**Review title:** 文化世界构建 / Cultural World

---

## A｜本阶段回答的问题

> 下游拿到本阶段 PASS 输出时，可以相信什么？

`<executor fills this sentence from Stage Contract>`

---

## B｜Machine Gate Summary

```text
run_id:
gate_result: PASS / HOLD / REJECT
objects_checked:
objects_pass:
objects_hold:
objects_reject:
top_reason_codes:
```

> 这里只给结论摘要。详细 machine audit 存在机器报告，不混入项目拥有者内容审阅。

---

## C｜Content Statistics

必须至少展示：

- Entity/Event/Relation/Change/HistoricalSpace数量
- 关系类型分布
- 时间结构
- 空间结构
- Evidence density
- Conflict/Ambiguity

---

## D｜Narrative-Relevant Real Records

真实内容表至少包含：

- `object_id`
- `world_object`
- `type`
- `time_scope`
- `space_scope`
- `relation_or_change`
- `key_evidence_excerpt`
- `epistemic_state`
- `conflict_summary`

每条记录必须来自真实数据库对象，不允许用“示例性描述”代替。

---

## E｜Gaps / Counterexamples / Uncertainty

```text
critical_gaps:
counterexamples:
unresolved_conflicts:
missing_evidence:
recommended_deepen_targets:
```

---

## F｜Owner Decision

```text
ACCEPT
DEEPEN
DROP
```

### Owner note
`<free text>`

注意：Owner Decision 不改变 Machine Gate PASS/HOLD/REJECT。
