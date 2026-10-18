# 数据生产作业样板试验 · 第一步重做（字段级夯实 + 改库）结果

> 日期：2026-10-17
> 批次：第一步前置准备（评估 A 字段级盘点 → 执行字段级改库 → 评估 B → 落地 C）
> 依据：立项任务书 V1.0 §七第一步；契约 P0.3 / P1 / P2 §7.2 / P3 §3 / P4 / P5
> 性质：字段级改库已授权执行（Owner 2026-10-16）；真实 LLM / 325/56 改动 / 真实 G5 放行 / hushang-jingwei 未触碰

---

## 一、评估 A：字段级盘点 → 可执行 DDL 清单（结论）

以 `SAMPLE-TRIAL-03_DB-FIELD-INTEGRITY_RESULT.md` 的缺口清单为基础，逐表逐字段对照六层契约，并直接读取真实库 `mohen_dev`（PostgreSQL 18.6，127.0.0.1:5432，36 表全 0 行）复核。结论：**表级骨架无缺口（36 表已在）；字段级缺口共 3 处须改库（L2 最重、L3 次之），1 处 L1/L5/L0 仅需"落点确认"（不建表/不补列）。**

### 1.1 真实库基线核对（全部通过）
- 36 表 = source 7 + evidence 2 + world 14 + meaning 4 + read_model 6 + control 3 ✓
- `control.gate_audits` = 22 列，`gate_result` 五态（PASS/HOLD/REJECT/REVOKED/UNASSESSED）✓
- 第一代 public 37 表已退役（无残留）✓；36 表全 0 行（"水未灌"）✓
- 运行时代码（`packages/`、`pipelines/`）**零引用**本次待改/待建的实体与列名 → 改名安全。

### 1.2 L2（evidence）缺口清单 → 已执行
| 项 | 动作 | 契约依据 |
|---|---|---|
| `material_evidence` 补 8 列 | `reading_unit_id`(FK)/`assertion_kind`/`voice_basis`/`quote_review_status`/`quote_review_ref`/`evidence_version_no`/`input_fingerprint`/`supersedes_evidence_id`(self-FK) | P2 §7.2 |
| 建 `evidence.reading_units` | 卷篇/条目/图幅结构单元 + 主 H 类型（11 列） | P2 §7.2 |
| 建 `evidence.classification_decisions` | H 类型判定历史与改判（9 列，追加式） | P2 §7.2 |
| 建 `evidence.material_mentions` | 字面提及 人/时/地/物/数（8 列，禁止强写 world.entity_id） | P2 §7.2 |
| 建 `evidence.reading_unit_dependencies` | 引书/转录/编辑依赖（8 列，目标单元或外部版本至少一项） | P2 §7.2 |
| `read_unit_evidence_links` 补 3 列 | `extent_order`/`allowed_purpose`/`locator_schema_version` + `UNIQUE(evidence_id,extent_order)` | P2 §7.2 |

> 注：`read_unit_evidence_links` 上轮判定"已落地"，但逐列对照契约 §7.2 发现仍缺 `extent_order`（有序映射关键列）/`allowed_purpose`/`locator_schema_version` 三列——属上轮清单**遗漏项**，本轮一并补全。

### 1.3 L3（world）缺口清单 → 已执行
| 项 | 动作 | 契约依据 |
|---|---|---|
| 建 `world.world_decision_events` | W10 依赖传播决策事件（from/to 主张修订 + 失效范围 + 上一输入快照 + 变更原因） | P3 §3.5 |
| `dependency_edges` 对齐 | 补 `from_claim_revision_id`/`to_claim_revision_id`(FK→claim_revisions，修订级锚点)，保留旧对象级多态列 | P3 §3.5 |
| `claim_revisions` 对齐 | 改名 `object_type→subject_kind`、`object_id→subject_id`、`revision_content→assertion_payload_json`、`supersedes_id→supersedes_revision_id`、`created_at→authored_at`；补 `claim_family_id`/`evidence_snapshot_id`/`asserted_time_json`；加 self-FK + 防自引用 CHECK | P3 §3.1 |
| `identity_decisions` 对齐 | 补 `temporal_scope`/`decision_version`/`upstream_g2_snapshot`（G2 输入快照） | P3 §3.2 |
| `event_participations` 对齐 | 改名 `entity_id→candidate_entity_id`、`role→role_code`；补 `claim_revision_id`(FK)/`temporal_scope` | P3 §3.3 |
| `provenance_assessments` 对齐 | 补 `claim_revision_id`(FK)/`independence_state`(CHECK UNKNOWN/POSSIBLY_SHARED/INDEPENDENT/DERIVED)/`source_fingerprint`/`assessment_version`/`evidence_input_snapshot` | P3 §3.4 |

### 1.4 L1 / L4 / L5 / L0 落点确认（不建表 / 不补列）
- **L4（`meaning` 四表）**：契约 P4 §3 明说"以上九类为信息职责，**不等于需要九张新表**……**P4 现在不开展逐列 DDL 审查**"、"此稿不判断其现行 DDL 兼容、不批准新表列"。九类语义职责（发现线索/解释版本/理解增量/支持反证/竞争解释/组合依赖/当下联系/G4 裁决记录/D05 消费需求）由 `meaning.findings`(15 列)+`meaning.claim_revisions`(8 列)+`meaning.present_connections`(8 列)+`meaning.open_questions`(7 列) 承载。**确认落点成立，无需改库。**
- **L1（`source.read_units`）**：契约 P1 §B 已采纳"可选高吞吐设计"——候选原文大文本存对象存储、DB 只留 `payload_ref` + `hash`；`transcription_candidates` 为逻辑语义，物理承载 = `payload_ref`(外部) + `uncertainty`。**确认落点成立，无需补列。**
- **L5（`read_model` 六表）**：契约 P5 §二 明确"本轮**不建立 Schema/DDL**，物理落点优先沿用既有表"；`revision/producer_method_version/dependency_snapshot/purpose/scope/audience/validity` 等审计字段由 `payload`(jsonb) 兜底，属"逻辑待定"而非缺列。**确认落点成立，无需补列**（"审计藏进 JSON"风险记为后续优化项，不阻塞）。
- **L0（`source` 三表 + `read_handoffs`）**：契约 P0.3 §2 的"最小交接字段"是**语义契约**（原文明说"字段名是目标语义，不表示与既有物理列一一对应"）；G0 决策落 `control.gate_audits`(22 列)，L0→D01 交接由 `source.*` + `source.read_handoffs` 承载。**确认落点成立，无需建独立 handoff 表。**

### 1.5 本轮遗漏核查（上轮清单外新增）
| 遗漏项 | 处置 |
|---|---|
| `read_unit_evidence_links` 缺 3 列 | 已补（见 1.2） |
| `world.dependency_edges` 缺"主张修订依赖方向"锚点（契约 §3.5） | **已补对齐**（见 1.3，第二批迁移 `202610170700_dependency_edges_align.sql` 补 `from/to_claim_revision_id`）——原首轮清单未列入，本轮按"纯技术已授权"直接补齐，不再留观察项 |

---

## 二、执行字段级改库（已授权，逐项留痕）

### 2.1 preflight 备份
- `pg_dump`（-F p，完整 schema+data）→ `implementation_artifacts/preflight/202610170600_field_level_backfill_preflight.sql`（76,242 B，EXIT=0）。
- 36 表全 0 行，dump 为纯 DDL + 空数据，可完整还原改库前状态。

### 2.2 逐列差异 SQL
- 迁移 DDL：`supabase/migrations/202610170600_field_level_backfill.sql`（每条 ALTER/CREATE 均为逐列差异的直接落库）+ 第二批 `202610170700_dependency_edges_align.sql`（dependency_edges 修订级锚点）+ 第三批 `202610170800_invalidation_events.sql`（P08 失效事件落点）。
- 回滚脚本：`supabase/rollback/202610170600...` / `202610170700...` / `202610170800...` 三份（精确逆操作，先删 L3 后删 L2，先删约束/索引再删列）。

### 2.3 执行与复核（一环扣一环闭环）
- `psql -v ON_ERROR_STOP=1 -f` 应用 → **COMMIT，EXIT=0**。
- 复核结果：36 → **42 表**；逐表逐列与契约一致（见 §1.2/1.3 目标列均已就位）。
- 重命名传播验证：`claim_revisions_object_type_check` 现解引用为 `subject_kind IN (...)`；`event_participations_entity_id_fkey` 现解引用为 `candidate_entity_id → world.entities`；self-FK `claim_revisions_supersedes_fk`、防自引用 `claim_revisions_no_self_supersede`、`provenance_assessments_independence_state_check` 全部挂载正确。

### 2.4 完整数据链落点（D00→D05，六层全图）
```text
D00 L0  source.sources/source_versions/raw_items ──(G0→gate_audits)──▶ D01      [落点原本到位，未改]
D01 L1  source.read_runs/read_units/read_quality_checks/read_handoffs      [落点原本到位，未改]
           └──read_unit_evidence_links.read_unit_id──▶ D02                 [已存在，本轮补 extent_order 等 3 列]
D02 L2  evidence.reading_units ◀── material_evidence.reading_unit_id       [本轮新建+补列]
        material_evidence ──▶ material_mentions / classification_decisions / reading_unit_dependencies  [本轮新建]
D03 L3  world.claim_revisions ◀── event_participations.claim_revision_id  [本轮对齐]
                             ◀── provenance_assessments.claim_revision_id [本轮对齐]
                             ◀── dependency_edges.from/to_claim_revision_id [本轮对齐]
                             ◀── world_decision_events.from/to_claim_revision_id [本轮新建]
D04 L4  meaning.findings/claim_revisions/present_connections/open_questions [落点原本到位，未改]
D05 L5  read_model 六表（payload 承载审计字段，契约明说本轮不建 DDL）            [落点原本到位，未改]
```
结论：**六层 L0→L5 落点现已全部到位，无断点**。其中 L2/L3 是本次字段级改库补上的断点；L0/L1/L4/L5 经逐层核对"落点已存在、契约明说不建 DDL/不补列"，无需改动。

---

## 三、下一步（交 Owner 确认后）
- 评估 B（UI 补强夯实）与落地 C（BR-M1 复核）已同批完成（见 `SAMPLE-TRIAL-05_UI-AND-BRM1_RESULT.md`）。
- 字段级落点闭环后，方可进入第二步模型选用与成本评估。
