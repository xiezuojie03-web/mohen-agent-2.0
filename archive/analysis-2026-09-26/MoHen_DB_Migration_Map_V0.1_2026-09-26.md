# MoHen DB Migration Map V0.1 — V1.1 架构 vs 真实 PostgreSQL 匹配度审计

> 生成：2026-09-26 ｜ 审计对象：《墨痕 Humanistic Data OS 数据库与文化世界数据架构 V1.1》（ChatGPT 据对话整理）
> 真源：**只读 grep `supabase/migrations/*.sql` 的 DDL**（7 个迁移，小写 `create table`），非凭记忆。
> 目的：逐对象判 KEEP / MIGRATE / SPLIT / DEPRECATE / NEW，产出 V1.1 §10.3 要求的《MoHen DB Migration Map V0.1》。
> 读法：✅ KEEP（概念已覆盖）｜🟡 MIGRATE（名差/结构差，需修才能让 doc 当契约）｜🔶 NEW（真库缺、doc 标"现在需要"）｜⚪ DEFERRED（doc 说可后建，当前无，合理）｜❌ DEPRECATE（建议弃用）

---

## 〇、真实库权威清单（grep 实测，覆盖此前"26 表/4 枚举/6 触发器"旧数）

| 迁移 | 表（小写 DDL） | 枚举 / 视图 / 触发器 |
|---|---|---|
| `202609210001_foundation` | `source_records` `evidence` `entities` `claims` `claim_evidence` `relations` `relation_evidence` `visual_assets` | enum `verification_status`(8值) |
| `202609210002_data_factory` | `ingest_runs` `review_queue` `legacy_mappings` `evidence_gate_audit` | trigger `review_queue_tier_c_guard` |
| `202609210003_human_review` | `human_review_decisions` | — |
| `202609220004_knowledge_weave` | `knowledge_paths` `knowledge_path_steps` `discovery_candidates` | trigger `discovery_not_publishable_guard` |
| `202609220006_visual_linkage` | `visual_entity_links` | view `effective_visual_assets`；trigger `vel_confirmed_requires_evidence` `vel_excluded_not_confirmed` |
| `202609220007_historical_spatial` | `historical_spatial_slices` `historical_features` `historical_feature_anchors` `historical_change_records` `historical_spatial_relations` | enum `historical_geometry_type` `historical_spatial_status` `historical_change_status` `historical_relation_class` |
| `202609220008_cultural_world` | `cultural_events` `cultural_relation_claims` `cultural_meaning_candidates` `cultural_present_connections` `evidence_fragments` `cultural_conflicts` | — |

**实测计数：28 表 + 1 视图 + 5 枚举 + 4 触发器。** 此前《数据库架构设计》写的"26 表/4 枚举/6 触发器"偏低（多算了触发、少算了表），以本次 grep 为准。

---

## 一、逐层匹配审计（L0–L7）

### L0 · Cultural Sources

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| `source_record` | `source_records` | ✅ KEEP | 001:6（仅复数名差） |
| `source_version` | 无独立表（版本/checksum 维度未建模） | 🔶 NEW（低优先） | grep 无 `source_version` |
| `raw_item` | 无表；`source_records.raw_path` 指向 `data/raw` 文件 + 工作区 | 🟡 MIGRATE | 001:17 `raw_path`；L0 治理弱（旧诊断） |
| `ingestion_run` | `ingest_runs` | ✅ KEEP | 002:10 |

### L1 · Evidence & Provenance

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| `evidence_fragment` | `evidence_fragments` | ✅ KEEP | 008:132（doc 的"最小可引用片段"=此；另 001 `evidence` 为高层对象） |
| `evidence_assessment` | `evidence_gate_audit`(002:56) + `claims.review_tier` + `verification_status` | 🟡 MIGRATE | 002:56；无独立 assessment 表，语义分散 |
| `claim_evidence_link` | `claim_evidence` | ✅ KEEP | 001:65（名差 link↔无 link） |
| `conflict_set` | `cultural_conflicts` | ✅ KEEP | 008:149（名差） |
| `human_review` | `human_review_decisions` | ✅ KEEP | 003:13（名差） |

### L2 · Cultural World

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| `entity` | `entities` | ✅ KEEP | 001:39 |
| `event` | `cultural_events` | ✅ KEEP | 008:26（doc 单数 `event`，真库 `cultural_events`） |
| `relation_claim` | `cultural_relation_claims`(008:53) **+** `relations`(001:72) 双存储 | ❌ DEPRECATE/合并 | 两处并存，doc 假设单一；建议弃用 001 `relations` 或明确分工 |
| `change` | `historical_change_records` | ✅ KEEP | 007:200（doc `Change` ≈ 此，加 `historical_` 前缀） |
| `historical_space_claim` | `historical_spatial_slices`/`historical_features`/`historical_feature_anchors`/`historical_spatial_relations` | 🟡 SPLIT | 007 拆成 5 张表，概念覆盖但结构更细 |
| `external_node` | 无 | 🔶 NEW | grep 无（doc P1"关系扩展时需要"） |
| `visual_asset` | `visual_assets`(001:91) + `visual_entity_links`(006:18) | ✅ KEEP | — |

### L3 · Meaning & Present Connection

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| `meaning_candidate` | `cultural_meaning_candidates` | ✅ KEEP | 008:92 |
| `present_connection` | `cultural_present_connections` | ✅ KEEP | 008:112 |
| `open_question` | 无 | 🔶 NEW | grep 无（doc L3/L2 P1；"下一步值得追什么"是发现感关键，建议补） |

### L4 · Discovery / Agent Read Model

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| `world_projection` | 无物化表；`retrieve.ts` 运行时 UNION 充当投影 | ⚪ DEFERRED | doc 自认"可后建"；当前 runtime_read schema 未建 |
| `discovery_candidate` | `discovery_candidates` | ✅ KEEP | 004:36 |
| `story_seed` | 无（不当事实） | ⚪ DEFERRED | 符合 doc"Story 不是事实" |
| `agent_context_view` | 无（运行时生成） | ⚪ DEFERRED | 符合 doc"派生/可重算" |

### L5 · Experience Runtime

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| `ExperienceState`/`CompositionState`/`ExperienceAction`/`Trail` | 无物理表；由 5 个冻结 JSON（`apps/web/data/experience/`）承载 | ⚪ DEFERRED(符合设计) | doc 明确"仅需要持久化时"才进 runtime schema；当前冻结 JSON 分区，符合"Truth Store ≠ Experience State" |

### L6 · Participation（doc 标 LATER）

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| `Contribution`/`Trace` 等 | 无 | 🔶 NEW-LATER | grep 无；符合 doc HOLD/LATER，不应现在建 |

### L7 · Living Culture（doc 标 LATER）

| doc 对象 | 真实落点 | 判定 | 证据 |
|---|---|---|---|
| 活态文化层 | 无 | 🔶 NEW-LATER | 符合 doc LATER；与 L0/L1 闭环待真实行为出现后建 |

---

## 二、5 个重大发现（doc 不能直接当数据契约 SOT 的根因）

1. **🔴 命名分叉（最该修）**：doc PART VI「当前建议表」用的是**单数** `source_record / event / relation_claim / meaning_candidate / present_connection / visual_asset / evidence_fragment / claim_evidence_link / human_review`，真实 DDL 是**复数 + 前缀** `source_records / cultural_events / cultural_relation_claims / cultural_meaning_candidates / cultural_present_connections / visual_assets / evidence_fragments / claim_evidence / human_review_decisions`。**doc 的 PART VI 物理建议表 ≠ 真实 DDL**——Developer Skills / Agent Skills 若照 doc 名写 SQL 会找不到表。必须先附一份"doc 名 ↔ 真库名"对账表，doc 才能当 Contract。

2. **🔴 双 relation 存储**：`relations`(001) 与 `cultural_relation_claims`(008) 并存，doc 假设单一 `relation_claim`。建议：明确 001 `relations` 为早期简化版、008 为富版（带 epistemic/meaning/present refs），后续合并或弃用 `relations`，避免 Agent 读到两份不一致的关系。

3. **🟡 epistemic 双轴未建模**：真实库有两条状态轴——`verification_status`（8 值：raw→published，**管道阶段**）与 `cultural_*` 上的 `epistemic_status`（6 值：SUPPORTED/…/UNSUPPORTED，**认识档位**）。doc L3.4 只给了 6 值认识模型，没建模 8 值管道。Agent 读 status 时易混淆两轴，doc 应补"两轴分离"说明。

4. **🟡 三个 doc 自己标"现在需要"的 P1 表真库缺**：`modern_location`（doc P1"需要，防止空间混淆"）、`open_question`、`external_node` 均未建。尤其 `modern_location` 缺失与 doc"现代坐标 ≠ 历史位置"红线直接冲突风险——当前 modern coords 散落 `entities`/`historical_feature_anchors`，无统一现代位置表。

5. **⚪ raw 不进库**：doc 想要 `raw_item` 表存原始材料本体；真实设计是 raw 走文件系统（`data/raw` + `source_records.raw_path` 指针）。这是合理设计选择（raw 永留文件系统、库只存元数据），但 doc 未写明此决策，应补"raw 永留文件系统，不进库"以对齐。

---

## 三、命名对账表（并入 V1.1 附录即可成为正式 Contract 修正案）

| doc V1.1 名 | 真实 DDL 名 | 备注 |
|---|---|---|
| `source_record` | `source_records` | 复数 |
| `source_version` | （无） | 🔶 待建 |
| `raw_item` | （无，文件系统） | 设计选择 |
| `ingestion_run` | `ingest_runs` | 复数 |
| `evidence_fragment` | `evidence_fragments` | 复数 |
| `evidence_assessment` | `evidence_gate_audit` + status 字段 | 语义分散 |
| `claim_evidence_link` | `claim_evidence` | 去 link |
| `conflict_set` | `cultural_conflicts` | 加 cultural_ 前缀 |
| `human_review` | `human_review_decisions` | 加 _decisions |
| `entity` | `entities` | 复数 |
| `event` | `cultural_events` | 加 cultural_ 前缀 |
| `relation_claim` | `cultural_relation_claims` / `relations` | 双存储待并 |
| `change` | `historical_change_records` | 加 historical_ 前缀 |
| `historical_space_claim` | `historical_spatial_slices` 等 5 表 | 拆细 |
| `external_node` | （无） | 🔶 待建 |
| `visual_asset` | `visual_assets` | 复数 |
| `meaning_candidate` | `cultural_meaning_candidates` | 加 cultural_ 前缀 |
| `present_connection` | `cultural_present_connections` | 加 cultural_ 前缀 |
| `open_question` | （无） | 🔶 待建 |
| `discovery_candidate` | `discovery_candidates` | 复数 |

---

## 四、结论与建议（待你拍板，未执行）

- **概念匹配度：高**。L0–L5 几乎所有 doc 对象在真实库都有对应表，红线（Geometry is a Claim / Fact–Interpretation Firewall / Evidence before Knowledge）也由触发器守门落地。V1.1 不是画饼，是真实可行的长期架构。
- **物理/命名匹配度：低**。doc PART VI 的"当前建议表"是一套**单数理想名**，与真实**复数+前缀 DDL** 不一致。doc 不能直接当 Developer/Agent Skill 的数据契约 SOT，除非先附第三节命名对账表。
- **建议下一步（按 doc §10.3 顺序，架构基线 → 审计 → 最小迁移 → 施工）**：
  1. **立 Contract 修正案**：把第三节命名对账表 + 第二节 5 大发现并入 V1.1 附录，使 doc 名副当其"数据契约"。
  2. **补 3 个 P1 缺口**（小迁移，不动红线）：`modern_location`、`open_question`、`external_node`。尤其 `modern_location` 直接支撑 doc 空间红线。
  3. **处理双 relation 存储**：明确 `relations`(001) 与 `cultural_relation_claims`(008) 分工，弃用或合并其一。
  4. **补 epistemic 双轴说明**：doc 增"verification_status(管道) vs epistemic_status(认识)"两轴分离章节。
  5. **L6/L7 维持 LATER**：不 now 建，符合 doc HOLD；待真实参与行为出现再决定物理表。
- 以上均为**数据库层**审计与建议；与上一轮"Agent Skills 活化（S07）"是两条独立线——后者读库不改库，本审计改库不碰体验。可并行。
