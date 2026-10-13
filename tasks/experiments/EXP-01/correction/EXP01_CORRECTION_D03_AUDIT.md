# EXP01_CORRECTION_D03_AUDIT · D03 World Object 重审

**目的：** 修正 `candidate/conflicted` 被写成 `adjudicated`；按「依赖=candidate/conflicted → 精确关系不得 adjudicated」降级。

---

## 重审重点对象

### 1. 金泽塘（waterway）— conflicted
- 现状：`epistemic_status = candidate`；存在上图地名库「跨秀州塘」vs 青浦官方「跨金泽塘」冲突（U13，open）。
- 问题：原 D03 将 `普济桥—bridge_crosses_waterway—金泽塘`、`万安桥—bridge_crosses_waterway—金泽塘` 标记为 **adjudicated**。
- 规则（T4）：目标实体 conflicted → 关系 claim 不得 adjudicated。
- **修正：** 两条 bridge_crosses_waterway 关系由 `adjudicated` 降为 `candidate`，并在 expression_rule 标注「水道名冲突未完成裁决（U13），关系强度=候选」。金泽塘本身保持 candidate，不入 G2 PASS 支撑集。

### 2. 普济桥 / 万安桥（bridge）
- 现状：原 G2 PASS 含「南市」属性（来自 E-JZ-07 HOLD，已在 D02 审计移除）。
- **修正：** 删除南市属性；仅保留 E-JZ-01/E-JZ-02(PASS) 支撑的桥体事实（年代/跨金泽塘/结构）。绝对方位冲突（北市vs南市）改为 open conflict 记录，不写入 adjudicated 属性。普济桥/万安桥 G2 PASS 维持（桥体事实成立）。

### 3. 吕颐浩（person）— candidate/HOLD
- 现状：家谱库 3 个同名异人，与原南宋吕颐浩不可合并（E-JZ-10 PASS 消歧）。
- 问题：原 D03 `named_after(颐浩寺—吕颐浩)` 标记为 candidate（已冻结），未误升 adjudicated → **合规**。但 F1 曾借「金泽宗教密度」暗示寺名来源为事实。
- **修正：** 颐浩寺 G2 PASS 的事实仅限「1938毁/1992原址重建」（E-JZ-05/06 PASS）；「寺名取自吕颐浩」保持 candidate（named_after 关系 candidate），不进入 G3 PASS finding 的 adjudicated 支撑。

### 4. 练塘市河 / 顺德桥
- 练塘市河：水道对象由 E-LT-02(PASS) 支撑，保持 G2 PASS；`market_along_waterway` 关系降 candidate（失 E-LT-03）。
- 顺德桥：由 E-LT-01(PASS) 支撑，保持 G2 PASS（跨三里塘/1343）。

### 5. 颐浩寺 rebuilt-on-original-site（change）
- 由 E-JZ-05/06(PASS) 支撑，保持 G2 PASS；「开放为佛教活动场所」缺官方文号(U10) → 不入 adjudicated 表述。

---

## 修正后 G2 PASS 支撑集（仅入 G3 PASS finding）

| world_object | type | G2 PASS 支撑(G1 PASS) | 状态 |
|---|---|---|---|
| 金泽镇 | Town | E-JZ-09 | PASS |
| 朱家角镇 | Town | E-ZJ-02 | PASS |
| 练塘镇 | Town | E-LT-02, E-LT-05 | PASS |
| 漕港河 | Waterway | E-ZJ-02 | PASS |
| 三里塘市河 | Waterway | E-LT-02 | PASS |
| 普济桥 | Bridge | E-JZ-01 | PASS(删南市) |
| 万安桥 | Bridge | E-JZ-02 | PASS |
| 天皇阁桥 | Bridge | E-JZ-03 | PASS |
| 迎祥桥 | Bridge | E-JZ-04 | PASS |
| 放生桥 | Bridge | E-ZJ-01 | PASS |
| 顺德桥 | Bridge | E-LT-01 | PASS |
| 颐浩寺 | Temple | E-JZ-05, E-JZ-06 | PASS |
| 慈门寺 | Temple | E-ZJ-01 | PASS |
| 北大街 | Street-Market | E-ZJ-02 | PASS |

### 降级 / candidate（不入 G3 PASS lineage）
- 金泽塘（conflicted）→ 关系 candidate
- 吕颐浩（HOLD）→ named_after candidate
- 练塘市河 market_along_waterway（失 E-LT-03）→ candidate
- 练塘 桥寺数量共生（失 E-LT-03）→ candidate

---

## 结论

- **T4 违规已修复**：金泽塘 conflicted 不再支撑 adjudicated 关系。
- **无 candidate/conflicted 伪装为 adjudicated**。
- 所有 G2 PASS 对象依赖仅 G1 PASS Evidence（无 E-LT-03 / E-JZ-07）。
