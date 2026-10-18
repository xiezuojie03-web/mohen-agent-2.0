# 数据生产作业样板试验 · 第一步按 Owner 重申目标重新检查结果

> 日期：2026-10-17
> 触发：Owner 重申评估 A/B/C 目标，要求不依赖第一轮结论、重新核对；并把本次疑问反馈写入任务书 §十。
> 方法：评估 A 补"方法 output_contract→落点"逐条核对 + 跨阶段 L0→L5 全链 + 门 checks→落点字段；评估 B 改双向核对；评估 C 重定义为"可视化工作平台"。

---

## 一、评估 A 重新检查：D/L/G 阶段内 + 跨阶段理论闭环

> 口径（Owner 重申）：最终落点 = L；方法（63 法）= 准确找到落点的路径；G（六门）= 保障落点准确性。

### 1.1 阶段内逻辑：63 方法 output_contract → L 落点（逐条核对）

| 阶段 | 方法 | output_contract | L 落点表 | 状态 |
|---|---|---|---|---|
| D00 | （source standards，不计 63） | source_asset | `source.sources/source_versions/raw_items` | 已存在 |
| D01 | C01–C08 | reading_unit | `source.read_units` | 已存在 |
| D02 | H01–H25 | material_observation | `evidence.material_evidence` + 本轮 4 实体 | 本轮补齐 |
| D03 | W01–W10 | world_claim_revision | `world.claim_revisions` + 世界表 | 本轮对齐 |
| D04 | A01–A12 | humanistic_finding_revision | `meaning.findings` + `meaning.claim_revisions` | 已存在 |
| D05 | P01 | selection_manifest | `gate_audits`（G5 申请）+ read_model `derived_from_*` | 确认成立，无需独立表 |
| D05 | P02 | world_projections | `read_model.world_projections` | 已存在 |
| D05 | P03 | map_timeline_projections | `read_model.map_timeline_projections` | 已存在 |
| D05 | P04 | story_seeds / agent_contexts | `read_model.story_seeds` / `agent_contexts` | 已存在 |
| D05 | P05 | discovery_paths | `read_model.discovery_paths` | 已存在 |
| D05 | P06 | evidence_pointers | `read_model.evidence_pointers` | 已存在 |
| D05 | P07 | consumer_facet | `gate_audits.consumer` + read_model payload | 确认成立，无需独立表 |
| D05 | P08 | control.invalidation_event | `control.invalidation_events` | **本轮补建（第一轮遗漏的新缺口）** |

**新发现并已修复的缺口**：P08 精准失效的产出 `control.invalidation_event` 在 control 层无物理表。契约 P5 §9.4 明确 P08 输出 `change_event_ref / changed_dependency_ref / affected_publication_revisions / affected_purpose_scope_consumers / dependency_paths / reason / suspension_request / recheck_request`；`computePreciseInvalidation` 返回结构与之对齐。已建 `control.invalidation_events`（迁移 `202610170800_invalidation_events.sql`）。

### 1.2 跨阶段逻辑：L0→L5 全链衔接（本轮补全 L3→L4→L5）
```text
L0 source.* ──(G0)──▶ L1 read_units ──read_unit_evidence_links──▶ L2 material_evidence ──(G2)──▶
L3 claim_revisions ──findings.supporting_world_objects(jsonb)──▶ L4 meaning.findings ──(G4)──▶
L5 read_model.* (derived_from_finding_ids uuid[])
```
- L1→L2→L3：**外键级**（本轮补齐）。
- L3→L4→L5：**jsonb/uuid[] 引用级**（原本存在；契约 P4 明说"不批准新表列"，靠 jsonb 承载上游引用，属契约认可兜底）。
- 门衔接：`UPSTREAM_GATE` = D01:G0 / D02:G1 / D03:G2 / D04:G3 / D05:G4（`data-production-repository.mjs`）。

### 1.3 门禁逻辑：G0→G5 checks → 落点字段（本轮补全）
- `gate_audits` 22 列覆盖资格键 `[artifact_ref(object_type+object_id), purpose, allowed_scope, consumer, dependency_snapshot, effective_time]` ✓
- G0（identity_version/rights_by_operation…）→ `source.*`（rights/provenance_status/checksum_sha256/scope）✓
- G1（reading_fidelity/locator_replayable…）→ `source.read_units`（locator/uncertainty/payload_ref）+ `read_quality_checks` ✓
- G2（source_voice/no_world_assertion…）→ `material_evidence.source_voice/assertion_kind`（本轮补 assertion_kind）+ `reading_unit_dependencies` ✓
- G3（source_independence/identity_time_space…）→ `world.*`（temporal_scope/spatial_scope）+ `provenance_assessments.independence_state`（本轮补）✓
- G4（understanding_delta/alternatives_counterview…）→ `meaning.findings`（understanding_delta/counter_view_or_alternative）✓
- G5（dependency_snapshot/rights_scope_consumer…）→ `gate_audits`（dependency_snapshot/consumer/allowed_scope）+ read_model 六表 ✓

**结论：D/L/G 阶段内 + 跨阶段理论闭环成立**（本轮补齐 P08 落点后，63 方法产出 + L0→L5 衔接 + G0→G5 保障均无断点）。

---

## 二、评估 B 重新检查：双向核对

**正向（UI 要数据 → 库有没有）**：AskBar（read_model 六表字段）+ 视觉舞台 surface（关系/时空/证据/叙事）所需字段，read_model 六表 schema 均已承载。**成立。**

**反向（库有数据 → UI 有没有舞台）**：六层 L0→L5 数据均有对应展示能力——L2 证据→`EvidenceRevealSurface`、L3 关系/时空/冲突→`RelationalSpaceSurface`/`TimelineSurface`/`ConflictCompareSurface`、L4 发现/问题→`DiscoverySurface`/`QuestionSurface`、L5→`retrieve`(AskBar)。**唯一系统性缺口**：视觉舞台仍读 5 个冻结 JSON、不读 read_model（= P1/P2），即"库有数据、前端没接舞台"。

**结论**：与第一轮 P0–P5 一致，但本轮以"双向"表述坐实：缺口只有一条主线——**视觉舞台未接 read_model 通道**（P1/P2），其余映射确定性成立。

---

## 三、评估 C 重新检查：可视化工作平台

> 口径（Owner 重申）：目标 = 让 Owner 通过可视化工作平台"感受"完整数据生产链 + 前端 UI 展示，同时是 AI 自检平台。

| 组成 | 现状 | 缺口 |
|---|---|---|
| 关系注册表可视化（BR-M1） | 已落地（325 边 + 56 台账，`specs/data-production/relations/`） | — |
| 内容生产看板（原始资料→AI 读出→发现→故事） | 未建 | **缺**（Owner 硬性偏好，见历史记录） |
| AI 自检看板（生产链落点/门禁/数据流闭环自检） | 未建 | **缺** |

**结论**：第一轮把落地 C 等同于"BR-M1 落地"，**理解偏窄**。BR-M1 只是"关系连接层"可视化；Owner 要的"感受完整生产链 + 前端 UI 展示"还需补"内容生产看板"与"AI 自检看板"两块。此项留待进入第三步时与前端 UI 一并规划。

---

## 四、视觉能力边界（Owner 要求 3）

以下自检/验收任务**需要"看"渲染结果**，当前模型无法可靠完成，须由 Owner **切换到有视觉能力的模型**执行：
1. 打开 `specs/data-production/relations/BR-M1图谱_V2.3_...V1.2.html` 核验图例清晰度 / P5"正在研究"标注 / 56 条 HOLD 可视化。
2. 打开金泽 water-net 前端页（`apps/web` 起 dev server 后截图）核验视觉舞台（地图/关系/时间轴/证据/实体卡）渲染效果。
3. 任何"内容生产看板 / AI 自检看板"建成后的视觉验收。

**提醒**：这些涉及"视觉渲染效果"的验收，请切换模型；文字/结构/字段级核对无需视觉，已由当前模型完成。
