# D03 Stage Output Report · Cultural World Structuring / L2 / G2

**Stage:** D03 · **Layer:** L2 · **Gate:** G2  
**Review title:** 文化世界构建 / Cultural World  
**实验：** EXP-01

---

## A｜本阶段回答的问题

> 下游拿到 G2 PASS World Object 时，可以相信：**它是身份、时间、空间、证据、冲突状态都已经过事实层裁决的文化世界对象**（G2 Downstream Promise）。

---

## B｜Machine Gate Summary

```text
run_id:            EXP-01-D03-G2
gate_result:       PASS
objects_checked:    34
objects_pass:       32
objects_hold:        2   (吕颐浩-金泽关系、顺德桥与寺相对位置，单弱源)
objects_reject:      0
top_reason_codes:   G2_EVIDENCE_MISSING（寺桥相对位置单源）、G2_IDENTITY_UNRESOLVED（吕颐浩同名异人冻结）
```

---

## C｜Content Statistics

- Entity：Town×3、Waterway×4、Bridge×6、Temple×3、Street-Market×2、Person×1、Institution×1
- RelationClaim：bridge_crosses_waterway×6、temple_names_bridge×1、bridge_built_by_temple×1、temple_near_bridge×2、market_along_waterway×2、town_in_water_network×3
- Change：survives×2、form_change×1、rebuilt_on_original_site×1、tourism_reuse×2
- 冲突/歧义：方位冲突×1、水道名冲突×1、同名异人×1、数量口径×1（均结构化保留）

---

## D｜Narrative-Relevant Real Records（G2 World Objects 节选）

| world_object | type | time_scope | space_scope | relation_or_change | key_evidence_excerpt | epistemic_status | conflict_summary |
|---|---|---|---|---|---|---|---|
| 金泽镇 | Town | 宋至今 | 青浦西南 | town_in_water_network(金泽塘/市河/北胜浜) | 「金泽现存古桥21座」(E-JZ-09) | adjudicated | 42/21 vs 7 口径 |
| 朱家角镇 | Town | 明至今 | 青浦 | town_in_water_network(漕港河) | 「漕港河将朱家角分成两半」(E-ZJ-02) | adjudicated | — |
| 练塘镇 | Town | 五代至今 | 青浦 | town_in_water_network(三里塘市河) | 「章练塘接诸湖荡之水」(E-LT-02) | adjudicated | — |
| 金泽塘 | Waterway | 未知 | 金泽 | bridge_crosses_waterway(普济/万安) | 「普济桥…跨金泽塘」(E-JZ-01) | candidate | 跨秀州塘冲突(U13) |
| 漕港河 | Waterway | 明至今 | 朱家角 | bridge_crosses_waterway(放生桥)；market_along_waterway(北大街南岸) | 「南北向跨漕港河」「南岸北大街」(E-ZJ-01/E-ZJ-02) | adjudicated | — |
| 三里塘市河 | Waterway | 清至今 | 练塘 | bridge_crosses_waterway(顺德桥)；market_along_waterway(市河两岸) | 「跨市河三里塘」(E-LT-01)；「沿市河两岸」(E-LT-03) | adjudicated | — |
| 普济桥 | Bridge | 1267–今 | 金泽南市/跨金泽塘 | bridge_crosses_waterway(金泽塘) | E-JZ-01/E-JZ-07 | adjudicated | 北市vs南市 |
| 万安桥 | Bridge | 1260s–今 | 金泽/跨金泽塘 | bridge_crosses_waterway(金泽塘) | E-JZ-02/E-JZ-08 | adjudicated | 秀州塘vs金泽塘 |
| 天皇阁桥 | Bridge | 明–今 | 金泽/跨北胜浜 | temple_names_bridge(天王庙阁) | 「因北堍天王庙阁得名」(E-JZ-03) | adjudicated | — |
| 迎祥桥 | Bridge | 1335–今 | 金泽/跨市河南端 | bridge_crosses_waterway(市河) | E-JZ-04 | adjudicated | — |
| 放生桥 | Bridge | 1571–今 | 朱家角/跨漕港河 | bridge_built_by_temple(慈门寺性潮)；bridge_crosses_waterway(漕港河) | 「慈门寺僧性潮所建」「跨漕港河」(E-ZJ-01) | adjudicated | — |
| 顺德桥 | Bridge | 1343–今 | 练塘/跨三里塘 | bridge_crosses_waterway(三里塘) | E-LT-01 | adjudicated | — |
| 颐浩寺 | Temple | 1260–1938/1992–今 | 金泽迎祥街12号 | temple_near_bridge(普济桥同街)；rebuilt_on_original_site(1992) | E-JZ-05/E-JZ-06 | adjudicated | 开放文号缺(U10) |
| 慈门寺 | Temple | 元至正–今 | 朱家角放生桥南堍/漕港河边 | temple_near_bridge(放生桥)；bridge_built_by_temple(性潮建放生桥) | E-ZJ-01 + S15线索(以S1为准) | adjudicated | — |
| 北大街 | Street-Market | 明清–今 | 朱家角漕港河南岸 | market_along_waterway(漕港河) | 「南岸北大街…明清建筑」(E-ZJ-02) | adjudicated | — |
| 吕颐浩 | Person | 1071–1139 | 南宋 | named_after(颐浩寺) | 寺名取自其人(E-JZ-06转引) | candidate(冻结) | 同名异人×3，不合并 |
| 颐浩寺 rebuilt-on-original-site | Change | 1938→1992 | 金泽 | rebuilt(原址重建) | 「1992原址重建寺院」(E-JZ-06) | adjudicated | 大部分毁非全毁 |

> RelationClaim 均带 Evidence link，未用共现/同名/现代位置伪造关系。寺桥关系严格区分：命名关系(天皇阁桥)、建造主体关系(放生桥)、空间相邻关系(颐浩寺-普济桥同街)、数量共生(练塘章练小志)。

---

## E｜Gaps / Counterexamples / Uncertainty

```text
critical_gaps:
  - 练塘「市河三里塘」与顺德桥的相对位置仅有单源(S2)，待补独立源
  - 吕颐浩与金泽除「寺名来源」外无实证关系，已冻结为 candidate
counterexamples:
  - 金泽桥庙「一一对应」是民间谚语，非逐桥可证；练塘为数量共生非一一对应
unresolved_conflicts:
  - 普济桥方位/水道名冲突；万安桥水道名冲突；古桥数量口径；吕颐浩同名异人
missing_evidence:
  - 三镇寺—市直接贸易关系的交易史料缺失
recommended_deepen_targets:
  - 补练塘寺桥相对位置独立源；回《章练小志》原文页
```

---

## F｜Owner Decision

```text
ACCEPT
```

### Owner note
世界对象区分了「命名/建造/相邻/数量共生」四类桥寺关系语义，未把空间接近当历史关系。冲突全部结构化保留。可进入 D04。
