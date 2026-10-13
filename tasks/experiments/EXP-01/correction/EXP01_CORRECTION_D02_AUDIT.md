# EXP01_CORRECTION_D02_AUDIT · D02 Evidence 重审

**目的：** 逐条检查 G1 Evidence 是否 HOLD 却穿透进 D03 的 G2 PASS lineage；是则从所有 G2 PASS lineage 移除，不强行升 PASS。

---

## 审计规则

- `legal_for_D03 = (current_gate_status == PASS)` 且 `used_by_D03 == true` 才能支撑 G2 PASS。
- `current_gate_status == HOLD` 且 `used_by_D03 == true` → **非法穿透**，必须移除并降级依赖对象。

---

## 逐条审计

| evidence_id | current_gate_status | used_by_D03 | legal_for_D03 | correction |
|---|---|---|---|---|
| E-JZ-01 普济桥(遗珠拾粹) | PASS | 是(普济桥 G2) | ✅ | 保留 |
| E-JZ-02 万安桥(遗珠拾粹) | PASS | 是(万安桥 G2) | ✅ | 保留 |
| E-JZ-03 天皇阁桥(遗珠拾粹) | PASS | 是(天皇阁桥 G2 + 寺命名关系) | ✅ | 保留 |
| E-JZ-04 迎祥桥(遗珠拾粹) | PASS | 是(迎祥桥 G2) | ✅ | 保留 |
| E-ZJ-01 放生桥(遗珠拾粹) | PASS | 是(放生桥/慈门寺/漕港河 G2) | ✅ | 保留 |
| E-ZJ-02 古镇朱家角(青浦政府) | PASS | 是(朱家角镇/漕港河/北大街 G2) | ✅ | 保留 |
| E-LT-01 顺德桥(遗珠拾粹) | PASS | 是(顺德桥/练塘市河 G2) | ✅ | 保留 |
| E-LT-02 章练小志卷一(识典古籍) | PASS | 是(练塘镇/练塘市河 G2) | ✅ | 保留 |
| **E-LT-03 章练小志桥18寺十余(S4转引)** | **HOLD** | **是(练塘市河 market + 桥寺数量共生 G2)** | ❌ **非法穿透** | **从 G2 PASS lineage 移除**；练塘 market 关系降级 candidate；桥寺数量共生降级 candidate |
| E-JZ-05 颐浩禅寺1938(青浦博物馆) | PASS | 是(颐浩寺 G2 + rebuilt change) | ✅ | 保留 |
| E-JZ-06 颐浩寺松江府志/1992(青浦文明网) | PASS | 是(颐浩寺 G2 + rebuilt change) | ✅ | 保留 |
| **E-JZ-07 普济桥南市/市河(青浦博物馆)** | **HOLD** | **是(普济桥南市属性 + F5 counter)** | ❌ **非法穿透** | **从 G2 PASS lineage 移除**；普济桥 G2 删除「南市」属性，仅保留 E-JZ-01 的北市/金泽塘；F5 删除（缺 PASS 支撑） |
| E-JZ-08 上图地名库万安桥秀州塘 | PASS(冲突记录) | 否(仅作 conflict 登记) | ✅(作冲突,非支撑) | 保留为 conflicted 记录 |
| E-JZ-09 上图地名库金泽21桥 | PASS | 是(金泽镇 G2) | ✅ | 保留（注：数量口径，表达加 uncertainty） |
| E-JZ-10 上图家谱吕颐浩同名异人 | PASS(消歧) | 是(吕颐浩实体) | ✅(实体为 candidate/HOLD,不入 PASS lineage) | 吕颐浩实体保持 candidate，named_after 关系保持 candidate |
| E-LT-05 陈云故居(青浦政府) | PASS | 是(陈云故居/练塘镇 G2) | ✅ | 保留 |

> 另有 2 条「天王阁/如意桥线索、城隍庙」为旅游类(S4)仅作线索，未入 Evidence 表，不影响。

---

## 结论

- **2 处 HOLD 穿透（E-LT-03、E-JZ-07）已识别并移除。**
- 受影响的 G2 对象处置：
  - 普济桥：删除南市属性 → 仍由 E-JZ-01(PASS) 支撑，保持 G2 PASS（桥体事实：1267/跨金泽塘/单孔石拱）。
  - 练塘市河：保留 E-LT-02(PASS) 支撑的水道对象；其 `market_along_waterway` 关系失去 E-LT-03 → 降级为 candidate。
  - 桥寺数量共生(练塘)：失去 E-LT-03 → 降级为 candidate，**不进入任何 G3 PASS finding**。
- 无一行 HOLD 被强行升 PASS。
