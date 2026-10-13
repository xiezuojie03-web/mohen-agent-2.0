# D05 Stage Output Report · Trusted Read Model Publication / L4 / G4

**Stage:** D05 · **Layer:** L4 · **Gate:** G4  
**Review title：** 可信阅读模型发布 / Trusted Read Model  
**实验：** EXP-01

---

## A｜本阶段回答的问题

> 下游（L5 / Agent / UI）拿到 G4 PASS Read Model 时，可以相信：**它可直接用于体验，同时仍能逐层回到解释、事实、证据与原件**（G4 Downstream Promise）。

---

## B｜Machine Gate Summary

```text
run_id:            EXP-01-D05-G4
gate_result:       PASS
objects_checked:    9 (4 story_seed + 1 world_projection + 1 timeline + 2 evidence_on_demand + 1 agent_context)
objects_pass:       9
objects_hold:       0
objects_reject:     0
top_reason_codes:   —（lineage 完整、EoD 链闭合）
```

---

## C｜Content Statistics

- story_seed：4（含 1 跨镇比较 seed）
- map/timeline projection：2（三镇桥寺市水关系投影 + 宋→当代时间轴）
- Evidence on Demand 覆盖：每个 L4 对象可回溯到 L0 source_id
- unresolved conflict 暴露：古桥数量/方位/水道名冲突在 projection 中显式标注
- Runtime Eligible 组成：world_projection + story_seed×4 + agent_context

---

## D｜Narrative-Relevant Real Records（G4 Runtime Objects）

### L4-01 · world_projection：三镇「桥—寺—市—水」关系网络
- 内容：以三镇市河水系为轴，叠加 bridge_crosses_waterway / temple_near_bridge / bridge_built_by_temple / market_along_waterway 关系；标注金泽(高密度桥庙一一对应)、朱家角(寺建桥+漕港河主轴)、练塘(数量共生+三里塘轴线)三类模式
- lineage：F1/F2 → G2(普济/万安/放生/顺德/颐浩/慈门/北大街) → G1(E-JZ-01~09, E-ZJ-01/02, E-LT-01~03) → G0(S1~S14)
- expression_rule：断言(已证)/推断(桥庙机制)/传说(颐浩寺巨刹规模引文)/疑问(数量口径)分色表达
- conflict：古桥数量/方位/水道名冲突以 ? 标记，不隐藏

### L4-02 · timeline projection：宋→当代
- 节点：1260s 普济/万安(宋) → 1335/1343 迎祥/顺德(元) → 1571 放生桥(明,慈门寺建) → 1698/1748 天皇阁/迎祥重建(清) → 1938 颐浩寺毁 → 1992 原址重建 → 2000 陈云故居开馆 → 2025 古桥专文
- lineage：全部 G2 Change + G1 年代 evidence

### L4-03 · story_seed：金泽「桥桥有庙」的宗教市镇
- 一句核心：金泽以元代巨刹颐浩寺驱动沪上最高桥庙密度（天皇阁桥因庙得名、迎祥街寺桥同街）
- Evidence on Demand：E-JZ-03/E-JZ-04/E-JZ-06

### L4-04 · story_seed：朱家角慈门寺僧建放生桥
- 一句核心：1571 年慈门寺僧性潮化缘建放生桥，寺在桥南堍——桥由宗教主体建造并锚定漕港河商业主轴
- Evidence on Demand：E-ZJ-01/E-ZJ-02

### L4-05 · story_seed：练塘三里塘市河轴线
- 一句核心：章练塘以三里塘市河为单一轴线丁字型铺展，桥18、寺十余沿河，下塘街保留原生生活
- Evidence on Demand：E-LT-01/E-LT-02/E-LT-03

### L4-06 · story_seed（跨镇比较）：水路如何决定市镇形态
- 一句核心：三镇同处青浦水网，却因「水路主轴宽度×桥跨河力×寺市复合度」组合不同，分化为宗教型(金泽)/商业旅游型(朱家角)/原真生活型(练塘)
- Evidence on Demand：F1/F2 全链

### L4-07 · evidence_on_demand_path（示例）
- 用户追问「放生桥为什么叫放生桥」→ L4-04 → L3(F1/F2) → L2(放生桥/慈门寺) → L1(E-ZJ-01「慈门寺僧性潮所建」「桥下为放生之地」) → L0(S1 遗珠拾粹)

### L4-08 · agent_context（供墨痕 Agent 使用）
```json
{
  "exp": "EXP-01",
  "theme": "桥寺市水如何共同塑造市镇生活",
  "towns": ["金泽","朱家角","练塘"],
  "core_mechanism": "waterway→bridge→temple/market 线性共生，绑定方式三镇不同",
  "comparison_axes": ["水网主轴","桥梁跨河力","寺市复合度","对外交通","当代延续"],
  "key_facts_lineage": "见 L4-01/02",
  "do_not_claim": ["42座古桥为精确数","普济桥北市/南市已裁决","万安桥跨秀州塘已裁决","吕颐浩与金泽除寺名外有关系"],
  "open_conflicts": ["古桥数量口径","普济方位","万安水道","吕颐浩同名异人"],
  "runtime_eligible": true
}
```

---

## E｜Gaps / Counterexamples / Uncertainty

```text
critical_gaps:
  - 朱家角/练塘上图 S1 证据缺失（依赖政府 S1）
unresolved_conflicts:
  - 数量/方位/水道名冲突在 L4 中显式标记 ? ，不隐藏
missing_evidence:
  - 市集一手史料；水运→公路转折
recommended_deepen_targets:
  - 补上图实时取回后升级 L4-01 金泽外两镇精度
```

---

## F｜Owner Decision

```text
ACCEPT
```

### Owner note
L4 全部 lineage 闭合、可回溯到 L0；冲突未隐藏；expression_rule 区分断言/推断/传说/疑问。可发布到墨痕 Runtime 作内容看板试点。
