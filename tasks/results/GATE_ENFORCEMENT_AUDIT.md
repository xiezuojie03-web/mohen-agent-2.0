# GATE_ENFORCEMENT_AUDIT · 生产链 Gate Enforcement 加固审计

**任务：** TASK_CodeBuddy_Gate_Hardening_EXP01_Correction_V1.0 · PART A  
**日期：** 2026-10-08  
**结论：** SYSTEM_GATE_ENFORCEMENT = PASS

---

## 1｜真实 Stage Input Path 追踪（A1）

| 阶段交接 | 当前真实读取 | 是否受 PASS-only 约束（加固前） |
|---|---|---|
| D02 → D03 | 下游 executor 理论上读 `evidence.material_evidence`（base table） | ❌ 无约束，HOLD 可进入 |
| D03 → D04 | 下游 executor 读 `world.*`（base table） | ❌ 无约束 |
| D04 → D05 | 下游 executor 读 `meaning.findings`（base table） | ❌ 无约束 |
| D05 → Runtime | `read-model-repository.listRuntimeEligible` 已 join `control.g4_pass_read_models` | ✅ 已约束（T5 本来满足） |

补充事实：
- `control.g0_pass_sources … g4_pass_read_models` 五个 PASS view **已存在于物理模型**（`supabase/migrations/202610070100_data_production_v2_baseline.sql`），按 `gate_audits.result='PASS'` 过滤。
- `data-production-repository.passed(stage)` 已能返回 PASS view，但**仅作通用查询，未被下游 executor 强制使用**；lineage 合法性也无校验。
- `check-stage-handoff.mjs` 只校验 orchestrator contract 的 `output/input` 键存在（结构性），不校验数据级 PASS-only。

→ 加固重点 = 让 D03/D04/D05 的输入与跨阶段 lineage 落到既有 PASS view + 新增 lineage validator。

---

## 2｜Legal Input Selector（A2，已落地）

| 阶段 | Legal input selector（强制唯一入口） | 底层 PASS view |
|---|---|---|
| **D03** | `createDataProductionRepository(db).legalInputForD03()` | `control.g1_pass_evidence` |
| **D04** | `legalInputForD04()` | `control.g2_pass_world_objects` |
| **D05** | `legalInputForD05()` | `control.g3_pass_findings` |
| **Runtime** | `read-model-repository.listRuntimeEligible(kind)` / `getRuntimeEligible` | `control.g4_pass_read_models` |

- 通用入口 `legalInput(stage)` 映射到上述三者（D01/D02 读上游 research_intent / qualified_source，不在本加固范围）。
- HOLD / REJECT 行**结构上不存在于 PASS view**，因此下游无法读到 → 实现「Dn Gate PASS Output = Dn+1 Legal Entry」硬约束，且**未引入第二套 Gate 状态**。

---

## 3｜Lineage Hard Check（A4，新增）

文件：`packages/data-access/src/lineage-validator.mjs`（只读 `control.gate_audits` + `world.conflicts` + maturity，无新状态）

- `validateG2Lineage(db, evidenceIds)` — 每个 G2 支撑证据必须 G1 PASS，否则抛 `G2_LINEAGE_BLOCKED`
- `validateG3Lineage(db, worldObjectIds)` — 每个 G3 支撑世界对象必须 G2 PASS，否则抛 `G3_LINEAGE_BLOCKED`
- `validateG4Lineage(db, findingIds, worldObjectIds)` — G4 依赖的 finding 必须 G3 PASS、world 必须 G2 PASS，否则抛 `G4_LINEAGE_BLOCKED`
- `validateNoConflictedAdjudicated(db)` — 任何 OPEN conflict 的 entity / 被其引用的 relation 若 `maturity='adjudicated'`，抛 `CONFLICTED_ADJUDICATED`（conflicted 不得伪装成 adjudicated）
- `assertLegalPassLineage(...)` — 组合入口，fail-closed

---

## 4｜Guard 加固（§5）

- 扩展既有 guard 不适用（既有的 `stage-handoff` 仅结构性），故**新增** `scripts/guards/check-gate-enforcement.mjs`：
  - 静态：repository 的 legal-input 选择器必须读取 `control.g1/g2/g3_pass_*` view（不得读 base table）
  - 运行时（mock db）：T1 G1 HOLD 不入 D03、T2 G2 HOLD 不入 D04、T3 G3 HOLD 不入 D05、T4 conflicted≠adjudicated、T5 Runtime 仅 G4 PASS
- 未创建第二套 lifecycle；仅为既有 PASS view + gate_audits 的查询层。

---

## 5｜Regression Tests（§4，永久，已加）

文件：`tests/data-production/gate-enforcement.test.mjs`（memfs 经 `mock-db.mjs`）

| 测试 | 验证 |
|---|---|
| T1 | G1 HOLD cannot enter D03 |
| T2 | G2 HOLD cannot enter D04 |
| T3 | G3 HOLD cannot enter D05 |
| T4 | conflicted dependency cannot masquerade as adjudicated |
| T5 | Runtime only consumes G4 PASS |
| + | positive full PASS lineage accepted |

`node --test tests/data-production/*.test.mjs` → **20 passed / 0 failed**（含既有 14 项，无回归）。

---

## 6｜PART A 验证结果（§8 成功门）

```text
G1 HOLD cannot enter D03        = PASS (T1 + guard)
G2 HOLD cannot enter D04        = PASS (T2 + guard)
G3 HOLD cannot enter D05        = PASS (T3 + guard)
Runtime cannot read non-G4 PASS = PASS (T5 + 既有 read-model-repo)
lineage validator blocks illegal = PASS (T4 + validator)
regression tests PASS           = PASS (6 新 + 14 既有)
guard:gate-enforcement          = PASS
```

→ SYSTEM_GATE_ENFORCEMENT = PASS，允许进入 PART B。

---

## 7｜未改事项（合规）

- 未修改 DB Schema（仅读取既有 PASS view / gate_audits / conflicts）
- 未修改 A–G Authority
- 未降低任何 Gate
- 未改 `hushang-jingwei`
