# CORRECTION_SUMMARY · EXP-01 纠偏总结

**任务：** TASK_CodeBuddy_Gate_Hardening_EXP01_Correction_V1.0 · PART B  
**前置条件：** SYSTEM_GATE_ENFORCEMENT = PASS（见 `tasks/results/GATE_ENFORCEMENT_AUDIT.md`）  
**结论：** FINAL_STATUS = PASS

---

## 1｜原始 Findings 重判结果

| 原 Finding | 重判 | 理由 |
|---|---|---|
| F1 桥寺绑定方式差异 | **PASS → FA** | 删「金泽高密度一一对应」；仅保留可证关联（天皇阁桥因庙命名、放生桥由慈门寺建） |
| F2 商业强度组合机制 | **DROP/重构 → FB** | 原含「水路宽度×桥连接力×寺市复合度=商业强度因果模型」（禁止）；重构为「比较揭示差异，非统一机制」 |
| F3 历史变化 | **PASS → FC** | 删「表演性旅游/原真生活」类型标签；中性陈述功能延续差异 |
| F4 Present Connection | **降为字段** | 并入 FA/FB/FC 的 present_connection + Experience Proof，不再单列 finding |
| F5 数量/方位反例 | **DROP** | 依赖 E-JZ-07(HOLD) counter_view，缺 G2 PASS 支撑；冲突登记为 gap |

**保留 = 3（FA / FB / FC），符合「2–3」要求。**

---

## 2｜ILLEGAL_LINEAGE_BEFORE（修复前）

```text
[ILLEGAL-1] E-LT-03 (G1 HOLD)
  → G2 练塘市河(market_along_waterway) + 桥寺数量共生(练塘)
  → F1 (练塘 part) G3 PASS
  → L4 world_projection / story_seed
  ❌ HOLD 穿透进 D03→D04→D05

[ILLEGAL-2] E-JZ-07 (G1 HOLD, 普济桥南市/市河)
  → G2 普济桥(南市属性)
  → F1 + F5 (counter_view) G3 PASS
  → L4
  ❌ HOLD 穿透进 D03→D04→D05

[ILLEGAL-3] 金泽塘 (G2 candidate/conflicted, 秀州塘冲突 U13)
  → relation 普济桥—bridge_crosses_waterway—金泽塘 = adjudicated
  → F1 G3 PASS
  → L4
  ❌ conflicted 目标伪装成 adjudicated (T4 违规)
```

---

## 3｜LEGAL_LINEAGE_AFTER（修复后）

```text
[LEGAL G1→G2]
  E-JZ-01..09 (G1 PASS) + E-ZJ-01/02 (G1 PASS) + E-LT-01/02/05 (G1 PASS)
  → G2 PASS: 普济桥/万安桥/天皇阁桥/迎祥桥/放生桥/顺德桥/颐浩寺/慈门寺/
              北大街/漕港河/三里塘市河/金泽镇/朱家角镇/练塘镇
  （金泽塘/吕颐浩/练塘market/桥寺数量共生 保持 candidate，不入 PASS 支撑集）

[LEGAL G2→G3]
  G2 PASS 对象
  → G3 PASS: FA / FB / FC
  （无 HOLD、无 conflicted→adjudicated）

[LEGAL G3→G4]
  FA/FB/FC (G3 PASS) + 允许的 G2 PASS 事实对象
  → G4 PASS: L4-01 world_projection + L4-02 timeline + L4-03/04/05 story_seed
            + L4-06/07 evidence_on_demand + L4-08 agent_context

[LEGAL 断言层]
  金泽塘冲突 → 普济/万安 bridge_crosses_waterway 标 candidate（不在断言层）
  吕颐浩 named_after → candidate（不在断言层）
  所有冲突在 projection 显式标注，不隐藏
```

**不变量证明：**
- 所有 G2 PASS 仅来自 G1 PASS ✅
- 所有 G3 PASS 仅来自 G2 PASS ✅
- 所有 G4 仅来自合法 PASS lineage ✅
- 无 conflicted→adjudicated ✅
- 无 unsupported causal / type label ✅

---

## 4｜Gate 计数（修正后，checked ≠ PASS）

| 阶段 | checked | PASS | HOLD | REJECT |
|---|---|---|---|---|
| D01/G0 | 15 | 13 | 2 | 0 |
| D02/G1 | 18 | 16 | 2 | 0 |
| D03/G2 | 34 | 32 | 2 | 0 |
| D04/G3 | 5 | 3 | 0 | 2 |
| D05/G4 | 7 | 8(对象) | 0 | 0 |

---

## 5｜最终状态

```text
SYSTEM_GATE_ENFORCEMENT = PASS
G1 HOLD cannot enter D03 = PASS (T1 + guard)
G2 HOLD cannot enter D04 = PASS (T2 + guard)
G3 HOLD cannot enter D05 = PASS (T3 + guard)
non-G4 PASS cannot enter default Runtime = PASS (T5 + 既有 read-model-repo)
permanent regression tests added = YES (tests/data-production/gate-enforcement.test.mjs)
illegal_lineage_fixed = YES

original_findings = 5
corrected_pass_findings = 3
corrected_g4_objects = 8

strategy_recommendation = REDUCE_TO_THEMATIC_CLUSTERS + KEEP_11_AS_PLACE_INDEX
gate_audit_path = tasks/results/GATE_ENFORCEMENT_AUDIT.md
correction_result_path = tasks/experiments/EXP-01/correction/
unresolved_risks = 朱家角/练塘缺上图S1实时取回；市集一手史料缺失；章练小志页级locator；古桥数量/方位/水道名冲突保留

FINAL_STATUS = PASS
```

---

## 6｜合规（禁止项全未触碰）

- 未修改 DB Schema
- 未改 A–G Authority 适配 bug（仅加固 executor/repository/guard/validator）
- 未降低 Gate
- 未大规模新增来源（仅复用既有 EXP-01 数据）
- 未 push / merge / deploy
- 未改 hushang-jingwei
- 未重新做 D01 / 未扩 11 镇
