# D04 Stage Output Report (Corrected) · Humanistic Discovery / L3 / G3

**Stage:** D04 · **Layer:** L3 · **Gate:** G3  
**实验：** EXP-01 · Correction（PART B）  
**输入约束：** D05 只能消费 G3 PASS；本审查所有 finding 仅依赖 G2 PASS（仅依赖 G1 PASS）。

---

## A｜本阶段回答的问题

> 下游拿到 G3 PASS Finding 时，可相信：**它建立在已裁决事实之上、经反例与边界检查、确实带来理解增量，且 lineage 全部来自 G2 PASS**。

---

## B｜Machine Gate Summary（修正后口径）

```text
run_id:            EXP-01-D04-G3-CORRECTED
gate_result:       PASS
objects_checked:    5   (F1–F5 全部重判)
objects_pass:       3   (FA, FB, FC)
objects_hold:       0
objects_reject:     2   (F4 降为 present_connection 字段 / F5 缺 PASS 支撑 DROP)
top_reason_codes:   G3_G2_BASIS_MISSING(F5), G3_TOO_GENERIC(F4)
```

> Gate 计数区分：`checked=5 / PASS=3 / HOLD=0 / REJECT=2`。不得把 checked 当 PASS。

---

## C｜Content Statistics

- finding_type：relational×1(FA)、interpretive×1(FB)、descriptive×1(FC)
- source independence：每 finding ≥2 独立 S1/S2
- counter-view 覆盖：全部含
- claim_strength：relational / interpretive / descriptive（无 causal）
- present connection：FA/FB/FC 均具体可站

---

## D｜Narrative-Relevant Real Records（G3 PASS Findings）

| finding_id | human_question | finding | understanding_delta | supporting_G2_PASS | counter_view | missing_evidence | present_connection | uncertainty | claim_strength |
|---|---|---|---|---|---|---|---|---|---|
| FA | 桥寺市是否稳定组合？ | 三镇均有可证桥寺/桥市直接关联（天皇阁桥因庙命名、放生桥由慈门寺僧建+寺在桥畔、北大街沿漕港河）；但「桥桥有庙一一对应」未逐桥证实 | 关联方式因镇而异，不能归为统一模式 | 天皇阁桥/慈门寺/放生桥/北大街/漕港河/三镇 | 金泽谚语非逐桥可证；练塘仅数量共生 | 金泽逐桥核验；练塘回古籍原文 | 天皇阁桥北堍地名；放生桥南堍慈门寺 | 金泽塘水道名冲突，关系为 candidate | relational |
| FB | 三镇共同机制与差异？ | 共享水路+桥骨架，但不可被单一机制解释：金泽宗教节点密集、朱家角跨河商业主轴、练塘单一市河轴线 | 跨地点比较天然产生差异与理解增量 | 颐浩寺/放生桥/北大街/漕港河/三里塘/三镇 | 差异部分源于当代政策/交通 | 三镇历史商业体量比较 | 三镇形态差异现场可读 | 描述为差异非因果 | interpretive |
| FC | 历史结构今天可感知？ | 部分桥寺街今天继续承担功能，再利用方式不同（金泽宗教延续/朱家角旅游/练塘纪念） | 历史功能被遗产化/旅游化/纪念化重述，方式因镇而异 | 颐浩寺/放生桥/北大街/陈云故居 | 金泽仍真实信仰；部分桥仍通行 | 「表演性/原真」类型标签缺调查 | 颐浩寺元代柱础+1992重建并置；放生桥顶看漕港河 | 颐浩寺开放文号缺(U10) | descriptive |

### DROP 记录（不计入 PASS）
- F4：内容并入 FA/FB/FC 的 present_connection 字段 + Experience Proof。
- F5：依赖 E-JZ-07(HOLD) counter_view，缺 G2 PASS 支撑 → DROP；冲突登记为 unresolved gap。

---

## E｜Gaps / Counterexamples / Uncertainty

```text
critical_gaps:
  - 练塘桥寺关系待回《章练小志》原文（E-LT-03 HOLD，未用）
  - 金泽逐桥寺庙对应未核验
counterexamples:
  - 「桥桥有庙」被练塘数量共生 + 金泽水道冲突反例削弱
unresolved_conflicts:
  - 古桥数量口径、普济方位、万安水道名、吕颐浩同名异人（均 preserved_open）
missing_evidence:
  - 三镇历史商业体量一手比较
recommended_deepen_targets:
  - 回《章练小志》原文页；补上图实时取回
```

---

## F｜Owner Decision

```text
ACCEPT
```

### Owner note
FA/FB/FC 全部仅依赖 G2 PASS（仅依赖 G1 PASS），无 HOLD 穿透、无 conflicted→adjudicated、无因果/类型标签。可进入 D05（仅消费 corrected G3 PASS）。
