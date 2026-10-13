# D05 Stage Output Report (Corrected) · Trusted Read Model / L4 / G4

**Stage:** D05 · **Layer:** L4 · **Gate：** G4  
**实验：** EXP-01 · Correction（PART B）  
**输入约束：** D05 只能消费 corrected G3 PASS（FA/FB/FC）+ 允许的 G2 PASS 事实对象。

---

## A｜本阶段回答的问题

> 下游（L5 / Agent / UI）拿到 G4 PASS Read Model 时，可相信：**它可直接用于体验，且 lineage 全部回溯到 G3/G2/G1 PASS，冲突未隐藏**。

---

## B｜Machine Gate Summary（修正后口径）

```text
run_id:            EXP-01-D05-G4-CORRECTED
gate_result:       PASS
objects_checked:    7   (1 world + 1 timeline + 3 story_seed + 2 eod + 1 agent_context = 8 对象, 计 7 类判定)
objects_pass:       8   (全部 G4 PASS)
objects_hold:       0
objects_reject:     0
top_reason_codes:   —（lineage 完整，EoD 链闭合）
```

> Gate 计数：`checked=7 / PASS=8对象 / HOLD=0 / REJECT=0`（对象数 > 类数因多 story seed）。

---

## C｜Content Statistics

- story_seed：3（FA/FB/FC 各一）
- world projection：1（三镇桥寺市水关系，conflicted 项标 candidate）
- timeline/change projection：1（宋→当代）
- Evidence on Demand paths：2
- agent context：1
- Runtime Eligible：全部 8 对象

---

## D｜L4 Runtime Objects

### L4-01 · world_projection：三镇「桥—寺—市—水」关系（仅 PASS 支撑）
- 内容：以三镇市河水系为轴叠加 PASS 级关系（天皇阁桥 temple_names_bridge、放生桥 bridge_built_by_temple + 慈门寺 temple_near_bridge、北大街 market_along_waterway、各桥 bridge_crosses_waterway）。
- **冲突标注：** 金泽塘水道名冲突 → 普济/万安 bridge_crosses_waterway 为 candidate，不在 projection 断言层；吕颐浩 named_after 为 candidate。
- lineage：FA/FB/FC → G2 PASS(天皇阁桥/慈门寺/放生桥/北大街/漕港河/颐浩寺/三里塘/三镇) → G1 PASS(E-JZ-01/02/03、E-ZJ-01/02、E-LT-01/02/05) → G0
- expression_rule：断言(已证)/推断(关联方式)/传说(颐浩寺规模引文)/疑问(数量口径)分色

### L4-02 · timeline/change projection：宋→当代
- 节点：1260s 普济/万安 → 1335/1343 迎祥/顺德 → 1571 放生桥(慈门寺建) → 1698/1748 天皇阁/迎祥重建 → 1938 颐浩寺毁 → 1992 原址重建 → 2000 陈云故居 → 2025 古桥专文
- lineage：G2 Change(颐浩寺 rebuilt) + G1 年代 evidence

### L4-03 · story_seed FA：桥与寺/市的直接关联（方式不同）
- Evidence on Demand：E-JZ-03、E-ZJ-01、E-ZJ-02

### L4-04 · story_seed FB：比较揭示差异
- Evidence on Demand：E-JZ-05/06、E-ZJ-01/02、E-LT-02

### L4-05 · story_seed FC：功能延续与差异
- Evidence on Demand：E-JZ-05/06、E-ZJ-02、E-LT-05

### L4-06 · evidence_on_demand_path（1）
- 「放生桥为什么叫放生桥」→ L4-04 → L3(FA/FB) → L2(放生桥/慈门寺) → L1(E-ZJ-01) → L0(S1 遗珠拾粹)

### L4-07 · evidence_on_demand_path（2）
- 「颐浩寺多大」→ L4-05 → L3(FC) → L2(颐浩寺) → L1(E-JZ-06) → L0(青浦文明网，注明松江府志原文未取得 U11)

### L4-08 · agent_context
```json
{
  "exp": "EXP-01-corrected",
  "theme": "桥寺市水如何共同塑造市镇生活",
  "towns": ["金泽","朱家角","练塘"],
  "findings": ["FA","FB","FC"],
  "do_not_claim": [
    "桥桥有庙=事实","金泽高密度一一对应","寺驱动商业强度因果",
    "沪上最高桥(数量修辞)","桥跨河连接力因果模型",
    "原真生活/表演性旅游/宗教型/商业旅游型/红色文化型 类型标签",
    "万安桥跨秀州塘已裁决","普济桥南市已裁决","吕颐浩与金泽除寺名外有关系"
  ],
  "open_conflicts": ["古桥数量口径","普济方位","万安水道名","吕颐浩同名异人"],
  "runtime_eligible": true
}
```

---

## E｜Gaps / Counterexamples / Uncertainty

```text
unresolved_conflicts: 数量/方位/水道名/同名异人 在 L4 显式标注，不隐藏
missing_evidence: 市集一手史料；练塘桥寺回古籍
recommended_deepen_targets: 补上图实时取回后升级 L4-01 金泽外两镇精度
```

---

## F｜Owner Decision

```text
ACCEPT
```

### Owner note
L4 全部 lineage 闭合到 G1 PASS；conflicted 项在 projection 中标 candidate 不进断言；expression_rule 区分断言/推断/传说/疑问。可发布 Runtime。
