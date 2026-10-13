# D01 Stage Output Report Template

**Stage:** D01  
**Layer:** L0  
**Gate:** G0  
**Review title:** 资料进入 / Source Intake

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

- 来源类型覆盖
- 载体覆盖
- 时间覆盖
- 地域覆盖
- 独立来源比例
- 内容可获得性
- 反例/反向来源覆盖

---

## D｜Narrative-Relevant Real Records

真实内容表至少包含：

- `title`
- `provider`
- `source_type`
- `carrier_type`
- `date`
- `place_scope`
- `creator_or_institution`
- `content_availability`
- `source_independence`
- `why_relevant`
- `counter_value`

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
