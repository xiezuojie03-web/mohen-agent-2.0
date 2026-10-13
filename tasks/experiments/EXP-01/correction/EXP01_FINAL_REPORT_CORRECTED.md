# EXP01_FINAL_REPORT_CORRECTED · 青浦西部水乡桥·寺·市·水路网络实验（纠偏版）

**实验：** EXP-01 · Correction V1.0 · 2026-10-08  
**前置：** PART A SYSTEM_GATE_ENFORCEMENT = PASS  
**研究题目：** 青浦西部水乡：桥、寺、市与水路如何共同塑造市镇生活？  
**对象：** 金泽 / 朱家角 / 练塘

---

## 0｜纠偏后结论速览

```text
EXP01 corrected findings = 3   (FA / FB / FC)
all corrected G3 PASS only depend on G2 PASS
all corrected G2 PASS only depend on G1 PASS
all corrected G4 only depend on legal PASS lineage
SYSTEM_GATE_ENFORCEMENT = PASS
```

---

## A｜Gate 计数（修正口径，checked ≠ PASS）

| 阶段 | checked | PASS | HOLD | REJECT |
|---|---|---|---|---|
| D01/G0 | 15 | 13 | 2 | 0 |
| D02/G1 | 18 | 16 | 2 | 0 |
| D03/G2 | 34 | 32 | 2 | 0 |
| D04/G3 | 5 | 3 | 0 | 2 |
| D05/G4 | 7 | 8(对象) | 0 | 0 |

> D04 的 2 个 REJECT = F4（降为 present_connection 字段）、F5（缺 PASS 支撑 DROP）。D02 的 2 HOLD（E-LT-03、E-JZ-07）已被移除出所有 G2 PASS lineage，未强行升 PASS。

---

## B｜HOLD 穿透修复（ILLEGAL → LEGAL）

- E-LT-03 (G1 HOLD) 曾支撑练塘市河 market + 桥寺数量共生 → 已移除，二者降 candidate。
- E-JZ-07 (G1 HOLD) 曾支撑普济桥南市属性 + F5 counter → 已移除，普济桥删南市，F5 DROP。
- 金泽塘 (G2 conflicted) 曾支撑 adjudicated bridge_crosses_waterway → 关系降 candidate（T4 修复）。
- 吕颐浩 (G2 HOLD) named_after 保持 candidate，未入 PASS lineage。

---

## C｜保留的 3 条 G3 PASS Finding

- **FA（relational）：** 桥与宗教/街市节点的直接关联存在，但方式不同、强度不等；「桥桥有庙一一对应」未逐桥证实。
- **FB（interpretive）：** 横向比较揭示差异，比统一类型更值得研究；三镇不可被单一机制解释。
- **FC（descriptive）：** 部分历史桥寺街今天继续承担功能，三镇再利用方式不同。

（详见 `EXP01_CORRECTED_FINDINGS.md`）

---

## D｜11 古镇战略结论（修正理由）

```text
REDUCE_TO_THEMATIC_CLUSTERS + KEEP_11_AS_PLACE_INDEX
```

理由（改为比较本身的价值，不依赖未证实 F2 因果机制）：

> 跨地点比较天然产生问题、差异和反例，理解增量高于单镇目录式介绍。资料密度在 11 镇间悬殊，若以「11 古镇」为一级叙事主体，弱资料镇将被迫降 Gate 或补造内容。故把叙事主权从「行政镇列表」移交「人文问题 / 空间机制」，11 古镇降级为地点索引。

---

## E｜未解决缺口（unresolved_gaps）

1. 朱家角/练塘缺上图文物名录级 S1 实时取回（本环境无 API key）。
2. 三镇市集一手商业史料未系统取得。
3. 《章练小志》已取得全文，待页级 locator。
4. 古桥数量口径（42/21/7）、普济方位、万安水道名冲突保留为 unresolved。
5. 颐浩寺「1992 开放为佛教活动场所」缺官方文号（U10）。

---

## F｜合规声明（禁止项）

- 未修改 DB Schema
- 未修改 A–G Authority
- 未降低 Gate
- 未重新做 D01 / 未大规模扩搜 / 未扩 11 镇
- 未 Production deploy / 未 push / merge main
- 未改 hushang-jingwei

---

## G｜最终判定

```text
SYSTEM_GATE_ENFORCEMENT = PASS
EXP01 corrected findings = 3
FINAL_STATUS = PASS
```
