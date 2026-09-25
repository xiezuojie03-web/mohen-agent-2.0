# CULTURAL-WORLD-02 · First Living Cultural Relation Cluster — Result

> SESSION = CULTURAL-WORLD-02
> MODE = TRACK-W MINIMUM CONSTRUCTION（STEP 1–8 全部完成）· EVIDENCE-GATED · NO WEB
> 报告生成时间：2026-09-25（本地）
> TASK_STATUS = **COMPLETE（施工完成，AT-01~09 全 10/10 PASS）· STOP（不启动第二簇 / 不批量迁移 / 不做 UI·GIS·Agent Runtime）**
> 严格遵守：不联网补资料；Legacy `hushang-jingwei` 只读；未碰 ExternalCulturalNode；未提升任何 Claim 的 epistemic status 越过 SUPPORTED_CANDIDATE。

---

## 0. EXECUTIVE VERDICT（总裁决）

**判定：COMPLETE + STOP。**

STEP 1（Schema Fit Audit）于前一轮完成并标记 PARTIAL+STOP；本轮经 **Architect Review 冻结裁决 AD-01~AD-08**，正式解除 B-1 / B-2 / B-3，并从 **STEP 2 接续至 STEP 8 全部完成**，迁移落地、数据 seed、四类验收（Evidence Trace / Expression Guard / Cluster Query / Negative Tests）通过，AT-01~09 **10/10 PASS**。

接手前的三条 STOP 触发项与裁决落点：

| 原 Block | Architect 冻结裁决 | 本轮落点 |
|---|---|---|
| **B-1**（epistemic 第四套词汇 vs 禁止平行真源） | **AD-01**：V4.8 六值（SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION）作为 **008 新建表独立列 + CHECK** 落地；不改动既有三套（`verification_status` / `historical_relation_class` / `discovery_candidates.epistemic_status`），新建表即该领域的认识论权威，无需声明映射关系 | 008 六表均带 `epistemic_status text CHECK(六值)`，全簇统一用 SUPPORTED_CANDIDATE / CONFLICTED 两值，未引入平行真源 |
| **B-2**（01C R1 与库内 `mentioned_in` 错配） | **AD-02**：补一条 `relations(predicate='former_site_of', subject=颐浩寺, object=吕颐浩)`，并将 hsr `f4b9bcad…` 的 `existing_relation_id` 指向它；原 `592ee347…`（吕颐浩→mentioned_in→颐浩寺）保留不删 | 已落地：新关系 `e0e00e41…`；hsr 指针已改指它；原 `mentioned_in` 行未被修改 |
| **B-3**（分支 / ADR / working tree） | **AD-03**：分支 `track/world-cultural-world-02`（已建，基于 baseline `6947c55`）；**ADR-002**（`becf1b3`）已 commit；7 个 untracked 治理文档**不随本簇入库**（属治理资产，另行处理） | 当前 HEAD = `becf1b3`（ADR-002）；本簇施工产物（008 migration + seed/verify 脚本 + 本 result）将在 **construction commit** 中提交 |

**三条硬边界在本簇得到结构性保证（非口头声明）**：
1. 镇级灾害（1861/1884）不 seed → AT-04 无传播路径可测，记 **vacuously PASS**（已明示，非「防火墙已验证」）。
2. 1265 vs 1267 冲突结构化保留，1265 为 `CONFLICTED` 变体、绝不下游默认 → AT-05 通过。
3. 1992「开放为宗教活动场所」仅作 `OPEN_QUESTION` 出现在 PresentConnection，不进事实层 → AT-07 通过。

---

## 1. Session / Context Gate（施工后实测值）

| Gate 项 | 实测结果 | 判定 |
|---|---|---|
| Git root | `D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0` | ✅ |
| branch | `track/world-cultural-world-02` | ✅（AD-03） |
| HEAD (before construction) | `becf1b3`（ADR-002） | ✅ |
| working tree | 本簇新增 `supabase/migrations/008…`、`pipelines/cultural-world/seed-cw02-cluster.mjs`、`pipelines/cultural-world/verify-cw02-cluster.mjs`、本 result；7 个治理文档仍 untracked（不入库） | ✅ |
| Legacy 只读 | 未读未写任何 `hushang-jingwei` 路径 | ✅ |
| 联网 | 未发起任何外部请求 | ✅ |
| UI / GIS / Agent Runtime | 未触碰 | ✅（AD-08 边界） |

---

## 2. STEP 1–8 完成度总览

| STEP | 内容 | 状态 | 产物 |
|---|---|---|---|
| STEP 1 | Schema Fit Audit | ✅ DONE | 见历史版 result §2（本轮沿用其结论） |
| STEP 2 | Minimal Migration（008） | ✅ DONE | `supabase/migrations/008_cultural_world_objects.sql` 已应用 |
| STEP 3 | Seed First Cluster（AD-02/04/05/06） | ✅ DONE | `seed-cw02-cluster.mjs` 运行 `ok:true`；9 events / 8 claims / 2 meanings / 2 presents / 16 fragments / 1 conflict / 1 新 relations 行 |
| STEP 4 | Evidence Trace | ✅ DONE | AT-02 PASS（含 CONFLICTED 豁免） |
| STEP 5 | Expression Guard | ✅ DONE | AT-05（step5 + conflict）PASS，0 违规 |
| STEP 6 | Cluster Query | ✅ DONE | AT-08 PASS；颐浩寺簇单次聚合 events/relations/meanings/presents |
| STEP 7 | Negative Tests + 硬边界 | ✅ DONE | AT-03 / AT-04 / AT-06 / AT-07 PASS |
| STEP 8 | Result + STOP | ✅ DONE | 本文件（原地更新，非第二份） |

| Acceptance Test | 状态 | 说明 |
|---|---|---|
| AT-01 World Object Separation | ✅ PASS | events/claims/meanings/presents 四类对象均可区分且非空 |
| AT-02 Evidence Trace | ✅ PASS | 8 claims + 9 events 全部 traceable；CONFLICTED 的 1265 事件按设计豁免正向片段 |
| AT-03 Meaning Firewall | ✅ PASS | meaning 不反向依赖、claim 无 meaning_refs；meaning 仅 derived_from 已存在 claim |
| AT-04 Town Event Firewall | ✅ vacuously PASS | 1861/1884 未 seed，无传播路径 |
| AT-05 Conflict Preservation | ✅ PASS | 1267=SUPPORTED_CANDIDATE；1265=CONFLICTED 且 `cultural_conflicts` 双向定位、`preserved_open` |
| AT-06 HR-4 | ✅ PASS | 两条 HR-4 claim 均为 SUPPORTED_CANDIDATE 且保留「据方志记载」限定；原 `mentioned_in` 行未删 |
| AT-07 1992 Boundary | ✅ PASS | 原址重建可返回；「开放为宗教活动场所」仅作 OPEN_QUESTION，不进事实层 |
| AT-08 Living Cluster Query | ✅ PASS | 单次查询聚合时间变化/关系/意义/今日连接 |
| AT-09 No Scope Creep | ✅ PASS | 仅 008 migration + seed/verify 脚本 + result；无 UI/GIS/Agent/Legacy/批量 |

---

## 3. Migration 008 与 Schema Delta

`008_cultural_world_objects.sql` 新建六表，**不扩展** `historical_spatial_relations`（保持既有 E1–E4 职责），**不修改** 既有三套状态枚举（AD-01）：

| 表 | 关键列 | 说明 |
|---|---|---|
| `cultural_events` | `event_id, slice_id, event_type, canonical_label, subject_feature_key, time_scope_start/end, time_scope_unknown, evidence_fragment_ids uuid[], epistemic_status CHECK(六值), expression_rule jsonb` | V4.8 Event |
| `cultural_relation_claims` | `claim_id, slice_id, claim_type(FACT/RELATION), subject/object_feature_key, object_value, evidence_fragment_ids, epistemic_status, hr_constraint text[], existing_relation_id uuid→relations, expression_rule jsonb` | V4.8 RelationClaim；`existing_relation_id` 为 External 留路（nullable） |
| `cultural_meaning_candidates` | `meaning_id, subject_feature_key, interpretive_text, derived_from_claim_ids uuid[], epistemic_status, expression_rule jsonb` | V4.8 MeaningCandidate（仅基于已支持 claim，INTERPRETIVE） |
| `cultural_present_connections` | `present_id, subject_feature_key, connection_type, observed_state, basis_claim_ids uuid[], open_questions text[], expression_rule jsonb` | V4.8 PresentConnection（遗址—复建双层；OPEN_QUESTION 留口） |
| `evidence_fragments` | `fragment_id, evidence_id→evidence, span_type CHECK(hr4_usable/u10_forbidden/generic), quote_fragment, usable_for_claim, usage_note` | AD-05：在同一 evidence 内切割可用/禁用片段 |
| `cultural_conflicts` | `conflict_id, conflict_key UNIQUE, subject_feature_key, primary_claim_id, conflicted_variant_id, primary_value, conflicted_value, source_of_conflict, resolution_status` | AD-06：结构化互指 |

**设计纪律（008 落地时遵守）**：
- 主键非 `id`，而是 `entity_id/relation_id/hs_relation_id/event_id/claim_id/meaning_id/present_id/conflict_id/fragment_id/evidence_id`。
- `cultural_events` **无 `conflict_refs` 列**（原 draft 方案被 Architect 否决，避免超范围扩展）；冲突由 `cultural_conflicts` 表承载，Runtime / Cluster Query 必须显式读取。
- 所有外键以 `feature_key(text)` 寻址且 nullable，为 ExternalCulturalNode 留路（AD-08 本轮不施工）。
- 确定性 UUID（`sha256(seed)→uuid v4`）+ `ON CONFLICT DO NOTHING`，重跑幂等。

---

## 4. Seeded IDs（完整清单 · slice = `jinze-minimum-slice-001`）

### 4.1 cultural_events（9 行）
| event_id | label | 年代 | epistemic |
|---|---|---|---|
| `7fb4e9d4-4519-4865-9c51-a8e9660bf676` | 颐浩寺创建 | 1260 | SUPPORTED_CANDIDATE |
| `bbf95110-250b-42d8-b4da-6b617b28b637` | 颐浩寺建大雄宝殿等 | 1288 | SUPPORTED_CANDIDATE |
| `200b1b7f-7189-446c-9c13-a6b28d1b727d` | 颐浩寺升院为寺 | 1295 | SUPPORTED_CANDIDATE |
| `44ae4956-aaa7-4a1d-955c-112b81dc9ff0` | 颐浩寺大部分建筑毁于日军轰炸 | 1938 | SUPPORTED_CANDIDATE |
| `1de2d196-9d67-43b8-9e1c-3e4ae21383b2` | 颐浩寺原址重建寺院 | 1992 | SUPPORTED_CANDIDATE |
| `59ab1ce6-73a5-46bd-a1f7-ead7c46d22de` | 万安桥创建 | 1260–1264 | SUPPORTED_CANDIDATE |
| `7c7d8357-9ac4-468c-8885-4d8d28141d71` | 万安桥加建廊亭 | 1342 | SUPPORTED_CANDIDATE |
| `1232f6e9-27e3-436a-b89f-fdfee989b2df` | 普济桥建（南宋咸淳三年） | 1267 | SUPPORTED_CANDIDATE |
| `f741022b-2615-41d2-a775-e518fdd043c7` | 普济桥建造年代冲突值（1265） | 1265 | **CONFLICTED**（豁免正向片段） |

### 4.2 cultural_relation_claims（8 行，均 SUPPORTED_CANDIDATE，各挂 1 fragment）
| claim_id | 关系（subject → object） |
|---|---|
| `32752c92-140c-48ab-882c-48fb6bfafa82` | yihaosi-site —**former_site_of**→ lvyihao（AD-02；existing_relation_id = `e0e00e41…`） |
| `406ba707-6094-484b-89ff-bb47285536dd` | yihaosi-site —**named_after**→ lvyihao（HR-4） |
| `26025fd2-37e5-43bc-ae6d-91865058df8e` | wananqiao —spans_same_waterway→ pujiqiao（姐妹桥） |
| `c9b17c6c-9265-4c22-bcd6-9aa15a9ed49d` | pujiqiao —spans_same_waterway→ wananqiao（镜像） |
| `4626e91a-3b9d-4c68-bcb1-46a09732b869` | pujiqiao —relative_position_south_of→ wananqiao（E3） |
| `2f8e2ab8-af96-4061-90f9-6013145e6f8b` | wananqiao —spans_waterway→ jinzetang |
| `187c1291-1a8b-4fc9-980b-53396f4a1fb0` | pujiqiao —spans_waterway→ jinzetang |
| `031ea707-d494-4b19-bed6-983ef215637f` | yihaosi-site —temple_bridge_association→ pujiqiao（E2 当前空间相邻） |

### 4.3 cultural_meaning_candidates（2 行，interpretive，各 derived 2 claims）
| meaning_id | subject | derived_from |
|---|---|---|
| `a1fa6d8b-d89f-4979-b48a-0a571a526654` | yihaosi-site | `32752c92…`(former_site_of) + `406ba707…`(named_after) |
| `d8663e7f-b63b-45a3-93bb-03a8cb2f08a3` | pujiqiao | `26025fd2…`(spans_same_waterway) + `4626e91a…`(south_of) |

### 4.4 cultural_present_connections（2 行）
| present_id | type | subject |
|---|---|---|
| `bfd045a0-ec89-4b73-b7e1-8e2b98280111` | site_vs_rebuilt（遗址—复建双层；含 OPEN_QUESTION：1992 开放为宗教活动场所） | yihaosi-site |
| `54a091a0-7f46-4f06-8d8e-22c6878f6066` | today_location（今址迎祥街12号；当前坐标非历史位置证明） | yihaosi-site |

### 4.5 evidence_fragments（16 行）
| fragment_id（前缀） | evidence_id | span_type | 用途 |
|---|---|---|---|
| `0174c9d3…` / `1961f62f…` | `b24576ed…` | hr4_usable | 颐浩寺故宅 / 寺名取自吕颐浩（HR-4 精确放行） |
| `9a7ed63b…` | `b24576ed…` | **u10_forbidden** | 「1992年修复开放」仅非权威转载，禁用为事实 |
| `028ca8bd…` | `faadce12…` | generic | 普济桥 1267 建 |
| `84b84ef2…` / `39de7037…` / `0c61dbdf…` | `faadce12…` | generic | 颐浩寺 1288 建大雄宝殿 / 1295 升院为寺 / 1938 毁于轰炸 |
| `9e56d1d7…` / `a7774c4e…` / `03265ea1…` | `02190cbd…` | generic | 万安桥创建 / 姐妹桥 / 普济桥在南 |
| `e82e1b8f…` | `87ca8734…` | generic | 普济桥—万安桥姐妹桥（镜像） |
| `b7fe69d2…` | `04ee5f86…` | generic | 万安桥 1342 加建廊亭 |
| `5376a80f…` | `1bff151e…` | generic | 颐浩寺 1992 原址重建 |
| `60fdf9b5…` | `020b8bcf…` | generic | 万安桥跨金泽塘 |
| `02d48445…` | `c79b0580…` | generic | 普济桥跨金泽塘 |
| `079d86a4…` | `b4c2a239…` | generic | 寺桥当前空间相邻（E2，仅当前，非历史关联） |

### 4.6 cultural_conflicts（1 行）
| conflict_id | key | primary（1267） | conflicted（1265） | resolution |
|---|---|---|---|---|
| `5720eb77-7af7-416c-ba08-65697636677f` | `pujiqiao-build-year-1265-1267` | `1232f6e9…`（SUPPORTED_CANDIDATE） | `f741022b…`（CONFLICTED） | `preserved_open` |

### 4.7 relations 新增行（AD-02）
| relation_id | subject → predicate → object |
|---|---|
| `e0e00e41-8479-4c26-b23e-7d5ac7690fdf` | 颐浩寺 `f9b41231…` —**former_site_of**→ 吕颐浩 `6db1f52e…` |

hsr `f4b9bcad…` 的 `existing_relation_id` 已改指 `e0e00e41…`；原 `592ee347…`（吕颐浩→mentioned_in→颐浩寺）保留未删。

---

## 5. STEP 4 · Evidence Fragment Trace（AT-02）

- **Claim 层**：8/8 全部 `traceable=true`（各挂 1 个 real-evidence fragment，无孤立片段）。
- **Event 层**：9/9 `traceable=true`；其中 `f741022b…`（1265 CONFLICTED 变体）按设计 **exempt**（冲突记录本就不要求正向证据片段）。
- **Meaning 层**：2/2 `derivesFromClaims=true`（derived 的 claim_id 全部存在于 claims 表）。
- **Present 层**：2/2 `basisResolves=true`（basis 的 event_id 全部存在于 events 表）。
- 全簇 16 个 fragment 全部指向 20 条已升级 `evidence_linked` 的真实 evidence 行，链路闭合。

---

## 6. STEP 5 · Expression Guard（AT-05）

- 六值 epistemic 与表达绑定：SUPPORTED_CANDIDATE 一律 `tone=attributed` + 非空 `must_keep_qualifier`（如「据方志记载（HR-4）」「据青浦博物馆转引」「不得称全毁」）。
- CONFLICTED 事件 `tone=conflict_explicit`，模板显式声明「内部朝代自相矛盾，与权威 1267 冲突」。
- Meaning 一律 `tone=interpretive` + `must_keep_qualifier`（「此为解释层，非史料原文」），并带 `forbidden`（如「不得改写为『吕颐浩创建了颐浩寺』这一历史事实」）—— 该 forbidden 是**禁止升格**声明，verify 已修正误报逻辑（不再用正则误判「事实」二字为违规）。
- 运行结果：`expression_guard.issues = []`，**0 违规**。

---

## 7. STEP 6 · Living Cluster Query（AT-08，颐浩寺簇单次聚合）

```
subject: jinze-min-001/feature/yihaosi-site
events (5):  颐浩寺创建(1260) → 建大雄宝殿等(1288) → 升院为寺(1295)
             → 大部分建筑毁于日军轰炸(1938) → 原址重建寺院(1992)   [均 SUPPORTED_CANDIDATE, evidence=1]
relations (3): former_site_of→lvyihao | named_after→lvyihao | temple_bridge_association→pujiqiao
meanings (1): 颐浩寺以南宋名相吕颐浩故宅为基、以其人命名，寺与人的绑定是金泽宋韵的一条可感线索
present (2):
  · site_vs_rebuilt — 今址迎祥街12号；遗址—复建双层：元代遗物与1992原址重建殿宇并置
       open_question: 1992年开放为宗教活动场所（U10：仅非权威转载，无官方文号，不进事实层）
  · today_location — 现坐落金泽镇迎祥街12号（当前坐标仅为近似对象范围，非历史位置证明）
```

---

## 8. STEP 7 · Negative Tests & 四条硬边界（AT-03 / 04 / 06 / 07）

- **AT-03 Meaning Firewall**：claim 表无 `meaning_refs`；meaning 仅 `derived_from` 既有 claim，不存在「meaning → 事实证据」反向依赖。✅
- **AT-04 Town Event Firewall**：1861/1884 镇级灾害证据零命中，本簇未 seed 任何镇级事件 → 颐浩寺查询不可能返回「寺受灾」。记 **vacuously PASS**（如实标注，未夸称防火墙已验证）。✅
- **AT-06 HR-4**：两条 HR-4 claim 维持 SUPPORTED_CANDIDATE 并保留「据方志记载」限定；原 `mentioned_in` 行未删。✅
- **AT-07 1992 Boundary**：`颐浩寺原址重建寺院` 事件可返回；「开放为宗教活动场所」**仅**以 OPEN_QUESTION 出现在 PresentConnection，未写入任何 event/claim 事实层。✅

---

## 9. 修改文件 / Migration / Seeded IDs / Commit

| 项 | 结果 |
|---|---|
| **Migration** | `supabase/migrations/008_cultural_world_objects.sql` —— 新建六表，已应用（未回滚） |
| **Seed 脚本** | `pipelines/cultural-world/seed-cw02-cluster.mjs`（唯一写库入口，含幂等清理 + AD-02/04/05/06） |
| **Verify 脚本** | `pipelines/cultural-world/verify-cw02-cluster.mjs`（STEP 4–7 + AT-01~09 只读验收，写出 `cw02-cluster-snapshot.json`） |
| **Seeded IDs** | events 9 / claims 8 / meanings 2 / presents 2 / fragments 16 / conflicts 1 / relations +1（详见 §4） |
| **Evidence 提升** | 20 条本簇 evidence `candidate → evidence_linked`（AD-04，幂等已跳过非 candidate） |
| **Modified tracked files** | 0（未改任何既有 tracked 文件；008 为新建、seed/verify 为新建） |
| **Legacy 修改** | 无 |
| **baseline commit** | `6947c55`（TRACK-W 分支基点） |
| **ADR-002 commit** | `becf1b3`（已提交，Architect 裁决落档） |
| **construction commit** | 待提交：008 migration + seed/verify 脚本 + 本 result（本次一同 commit 后回填值） |
| **Git commit 范围** | 不含 7 个治理文档（untracked，依 AD-03 不随本簇入库） |

**幂等构造要点**：seed 脚本开头清理 `events/claims/meanings/presents` 本 slice 全量（含上轮双重前缀错 ID 孤儿）与 `cultural_conflicts` 本 key，再统一以正确确定性 UUID 重插；`evidence_fragments` 因 ID 从未受双重前缀 bug 影响而保留，`ON CONFLICT DO NOTHING` 补挂新片段。重跑 `seed` → `ok:true`；重跑 `verify` → `10/10`。

---

## 10. Final Status Block（Taskbook §8）

```
TASK_STATUS        = COMPLETE
TRACK_W            = ACTIVE（首次最小施工；STEP 1–8 全部完成）
CONSTRUCTION_PERFORMED = YES
SCHEMA_CHANGED     = YES（新增 008 六表，未扩展既有表）
LEGACY_MODIFIED    = NO
WEB_USED           = NO
UI_WORK            = NO
GIS_WORK           = NO
AGENT_RUNTIME_WORK = NO
FIRST_CLUSTER_SEEDED = YES
ACCEPTANCE_TESTS  = 10/10 PASS（AT-01..AT-09）
ARCHITECTURE_RECONCILIATION = RESOLVED（AD-01~AD-08 冻结裁决已落地）
PLAN_RECONCILIATION = OK（未触碰 01B 候选池、External、UI/GIS/Agent）
GIT_COMMIT         = PENDING（construction commit 待执行）
RECOMMENDED_NEXT_STEP = 提交 construction commit → STOP，等待 Architect Review / 用户指定是否启动第二簇
```

---

## 11. STOP 声明

**STOP — 不启动第二 Cultural Relation Cluster，不批量迁移 Candidate Reservoir，不进入 UI / GIS / Agent Runtime，不联网。**

本簇已满足 Taskbook 全部交付项（STEP 1–8 + AT-01~09），且以结构化数据（六表 + fragment 切割 + conflict 互指）而非口头声明固化了三条硬边界。下一步仅余 **construction commit**（将 008 migration + seed/verify 脚本 + 本 result 提交至 `track/world-cultural-world-02`），随后停止，等待 Architect Review 或用户就第二簇 / 批量迁移的明确指令。

---

## 12. Known Gaps（留痕，不在本次解决）

- **G-1**：`evidence.verification_status` 与 01C 的 SUPPORTED 双轨未对齐 —— 本簇采用 AD-04 将本簇 evidence 升 `evidence_linked`，但库内其余 165 条 `candidate` evidence 的口径统一仍待专项裁决（非本簇范围）。
- **G-2**：`b24576ed…` 单条 evidence 同时含 HR-4 可用片段与 U10 禁用片段，已用 `evidence_fragments`（hr4_usable / u10_forbidden 两片）逐片段切割，方案成立。
- **G-3**：`attested_time_evidence_backed`（U12）字段名误导，金泽 5/5 全 `true`；本簇 Event 时间锚定直接引用 01C 裁决 + evidence，不依赖该字段。
- **G-4**：ExternalCulturalNode 未施工（AD-08 本轮不施工）；008 外键全部 nullable 已为其留路。
- **G-5**：7 个治理文档 untracked，不随本簇入库，另行处理。
