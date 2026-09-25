# CULTURAL-WORLD-02 · First Living Cultural Relation Cluster — Result

> SESSION = CULTURAL-WORLD-02
> MODE = TRACK-W MINIMUM CONSTRUCTION（**实际止于 STEP 1**）· EVIDENCE-GATED · NO WEB
> 报告生成时间：2026-09-24（本地）
> TASK_STATUS = **PARTIAL**（STEP 1 Schema Fit Audit 完成；STEP 2–8 未执行，已 STOP）
> 严格遵守：不联网补资料；Legacy `hushang-jingwei` 只读；不在 main 施工；不自行重设计架构；不为形成完整故事提升任何 Claim 的 epistemic status。

---

## 0. EXECUTIVE VERDICT（总裁决）

**判定：PARTIAL + STOP。完成 STEP 1（Schema Fit Audit），未进入 STEP 2（Minimal Migration）。**

三条触发 STOP 的实质冲突（详见 §4）：

1. **B-1（架构级）epistemic_status 词汇冲突**：仓库现有 **三套**认识论词汇（`verification_status` 8 值 enum、`historical_relation_class` E1–E4、`discovery_candidates.epistemic_status` 4 值 CHECK）。V4.8 Contract V0.2 要求 **第四套**六值（SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION）。`specs/OWNERSHIP_MAP.md:20` 明文「禁止平行真源」。新增一套而不先裁决它与既有三套的映射关系，即制造平行真源 —— 属架构决策，不得由施工方自行拍板。
2. **B-2（事实级）01C 裁决 R1 与 Greenfield 库内现状错配**：`historical_spatial_relations` 的 `yihaosi-site--former_site_of--lvyihao` 通过 `existing_relation_id` 指向 `relations` 表 `592ee347…`，但该行 predicate 实为 **`mentioned_in`**，且**方向相反**（吕颐浩 → 颐浩寺）。即 01C 冻结的 HR-4 关系「颐浩寺 former_site_of 吕颐浩」在事实层**没有对应行**，只在空间关系层有一条指向错配行的代理。修正方式有两种（补行 / 语义澄清），两者都改变 01C 冻结裁决的落点 → 需 Architect 裁决。
3. **B-3（纪律级）分支 / ADR / working tree 未决**：`CONTEXT.md` 明文「绝不在 main 施工」；`specs/FOUNDATION.md:38` 要求「改变五层数据模型…必须新增 ADR」（`decisions/` 现仅 ADR-001）；Session Gate 实测 working tree **NOT clean**（7 untracked）；TRACK-W 无分支先例（现有先例为 `track/experience-exp-0001/0002`）。

**同时交付三项已坐实的正面结论**（可直接被 Architect 采用）：

- **1861 / 1884 确认不 seed**：live 校验 `evidence` 表 185 行中，咸丰辛酉(1861) / 光绪甲申(1884) 镇级灾害 **零 evidence 行**（仅 Legacy A 档 snippet，Legacy 只读不可重入库）。Taskbook §2 的条件分支「仅在现有证据足以结构化时作为 town-level candidate event」**不成立** → 不 seed，AT-04 记 **vacuously PASS**。
- **Event / MeaningCandidate / PresentConnection 确为 MISSING**，且现有 text 字段已被塞满（颐浩寺 `attested_time_label` 单字段 300+ 字塞进 1260/1288/1295/1938/1992 五段）→ 证明「塞进现有 text 字段」不是可行解，必须新表。
- **1992 原址重建有官方双源**：`deafbd03…`（人民号·绿色青浦，青浦区政府新闻办官方平台）与 `1bff151e…`（青浦文明网，中共青浦区委宣传部）。U10 禁用项「1992 年经政府批准开放为佛教活动场所」确实**无官方文号**，两条官方源的 quote 均只写「原址重建」，不写「开放为宗教活动场所」—— U10 边界在 Greenfield 侧成立。

---

## 1. Session / Context Gate（实测值）

| Gate 项 | 实测结果 | 判定 |
|---|---|---|
| Git root | `D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0` | ✅ |
| branch | `main` | ⚠️ 见 B-3 |
| HEAD (before) | `87bb56d0116ae3a938a7853a5dc8f069c7117386`（`chore(governance): archive CULTURAL-WORLD-01A to 01C results`） | ✅ |
| working tree clean | **NO** —— 7 untracked，0 modified tracked | ❌ 见 B-3 |
| HEAD (after) | **未变**（本次未 commit） | 见 §7 |
| Legacy 只读 | 未读未写任何 `hushang-jingwei` 路径 | ✅ |
| 联网 | 未发起任何外部请求 | ✅ |

**7 个 untracked**（均为治理 / Task 输入文档，非代码）：
```
?? governance/墨痕_Agent_2.0_总体架构与改造路线图_V4.8_Cultural-Relation-Contract与World-Object-Model版.docx
?? tasks/CULTURAL-WORLD-01A_金泽活的文化关系模型_World-Depth-Stress-Test_V1.0.docx
?? tasks/CULTURAL-WORLD-01B_金泽文化世界扩展候选审计_V1.0.docx
?? tasks/CULTURAL-WORLD-01C_候选文化关系证据裁决试点_V1.0.docx
?? tasks/CULTURAL-WORLD-02_Taskbook_V1.0.docx
?? tasks/EXP-MAP-01_金泽CanonicalExperience产品化映射_V1.0.docx
?? tasks/results/GOV-01_READONLY_INVENTORY_REPORT.md
```

**已读取的 Context Gate 必读项**：`CONTEXT.md`（31 行全文）、V4.8 Roadmap（§1–§8 全文）、01A/01B/01C Task Book 与 Result、`specs/` 6 文件、`supabase/migrations/001–007`、`packages/domain`、`packages/data-access`、`pipelines/evidence/gates.mjs`、Jinze slice 定义与 build/export/apply-migration 四件套、`tasks/results/TASK-0017-result.md`、`tasks/results/EXP-0001-result.md`。

**迁移纪律确认**：`005` 缺失，下一个迁移应为 **`008`**（不得回填 005）；单行迁移用 `node pipelines/historical-spatial/apply-migration.mjs <file.sql>`，**不**用 `scripts/db-apply.ps1`（后者从 001 起重跑裸 create，不可重入）。

---

## 2. STEP 1 · Schema Fit Audit（V4.8 Object Model × 现有 schema）

> 全部结论经 live `psql` 只读查询坐实（非文档推断）。查询方式：`queryRows()` via `packages/data-access`（psql 驱动，零运行时依赖）。
> 主键列名提示：仓库主键**不是** `id`，而是 `entity_id` / `relation_id` / `hs_relation_id` / `change_id` / `evidence_id` / `claim_id` / `discovery_id` / `slice_id`。

### 2.1 对象级（V4.8 §2 Object Model，8 项）

| V4.8 对象 | 判定 | 承载者 | 依据（实测） |
|---|---|---|---|
| **Entity** | **REUSE**（字段 EXTEND） | `entities` | 4 个金泽 entity 均已存在并有 `entity_id`；缺 V4.8 要求的 `spatial_scope`，`temporal_scope` 仅有 `valid_from`/`valid_to`(text) 且语义模糊（普济桥 = `1267/1279`，`valid_to` 实为「南宋结束」而非实体终止） |
| **Event** | **MISSING** | 无 | 23 张表中**无 `events` 表**；现有年代全被塞进 `historical_features.attested_time_label`（单 text，颐浩寺那条 300+ 字含 1260/1288/1295/1938/1992 五段）→ 违反 V4.8「temporal_scope 结构化、未知显式 UNKNOWN」，**不可塞 text** |
| **RelationClaim** | **EXTEND** | `historical_spatial_relations`（建议） | 该表有 `relation_key` + `subject_feature_key`/`object_feature_key` + `epistemic_class`(E1–E4) + `support_level` + `hr_constraint`(array) + `evidence_ids`(array) + `existing_relation_id`。**缺陷**：`object_feature_key NOT NULL` → 无法表达 `object_ref_or_value` 的字面值（如「1267」）；`relations` 表因 `subject_id`/`object_id` 均 NOT NULL FK `entities`，**金泽塘（无 entity_id）与 Event 无法入参** |
| **Change** | **REUSE** | `historical_change_records` | `yihaosi-site/rebuilt-on-original-site`（`change_id=6cf24d0d-4055-4c48-94e9-233b2180023d`）已承载 1938→1992，`change_status=rebuilt`、`change_epistemic=evidenced`、4 条 evidence_ids |
| **MeaningCandidate** | **MISSING** | 不可复用 `discovery_candidates` | 该表 `epistemic_status CHECK(candidate/legend/research/unresolved)` 装不下 V4.8 六值；且 `discovery_not_publishable_guard` 触发器**禁止 `publishable=true`**，语义与 MeaningCandidate 相反 |
| **PresentConnection** | **MISSING** | 无 | 无表承载「遗址—复建双层观察」；`historical_features.current_survival_or_site`(text) 与 `historical_feature_anchors` 只能表达单点现状，无 `basis_claims` / `connection_type` |
| **ExternalCulturalNode** | **MISSING**（本轮不施工） | 无 | Taskbook §2 / V4.8 §6 本轮不施工；但新建表的外键须 **nullable**，为 External 留路 |
| **Evidence** | **REUSE** | `evidence`（185 行） | 字段完整：`source_id` / `evidence_type` / `locator` / `quote_text` / `subject_hint` / `place_hint` / `time_hint` / `verification_status` / `confidence`。⚠️ `region_json` 为已知第二真源陷阱，新字段**禁止**塞 jsonb blob |

### 2.2 字段级（V4.8 §3 Contract V0.2，10 项）

| Contract 字段 | 判定 | 说明 |
|---|---|---|
| `claim_id` | REUSE | 各表均有稳定 key（`relation_key` / `change_key` / `anchor_key`） |
| `claim_type` (FACT/RELATION) | **EXTEND** | 无显式类型列；现靠表名区分 |
| `temporal_scope` | **EXTEND** | entities/relations 有 `valid_from`/`valid_to`(text)，但关系层 4 行金泽 relations **全为空串**；hsr 层无时间列 |
| `spatial_scope` | **MISSING→EXTEND** | 现有坐标只在 `historical_feature_anchors`，且 `historical_position_proof=false`（SHR-01 `approximate_object_area`），符合「今天坐标 ≠ 历史位置」纪律，但无法表达 claim 级 spatial_scope |
| `evidence_refs` | REUSE | `hsr.evidence_ids`(array) / `change.evidence_ids`(array) / `relation_evidence` / `claim_evidence` |
| **`epistemic_status`** | **⚠️ CONFLICT（B-1）** | 见 §4 B-1 |
| `uncertainty_and_conflict` | REUSE + EXTEND | `hsr.hr_constraint`(array) 可挂 HR-4；但无结构化 conflict 列承载 1265 vs 1267 |
| `meaning_refs` | **MISSING** | MeaningCandidate 无表 |
| `present_connection_refs` | **MISSING** | PresentConnection 无表 |
| **`discovery_affordance`** | **MISSING** | 必须 jsonb **结构化**，不得塞进 `note` / `description` 长文本（C-7 纪律） |
| `expression_rule` | **MISSING** | 可复用范式存在：`pipelines/evidence/gates.mjs` 的 `STRUCTURAL_PREDICATES`（crossLink/belongsTo/relatedTo/sameAs/linkedTo/partOf）→ 强制 Tier C。**但需与 V4.8 六值词汇对齐后才能落地** |
| `derived_from_claims` / `basis_claims` / `connection_type` | **MISSING** | 随 MeaningCandidate / PresentConnection 新建 |

### 2.3 结论：最小 migration 的形态（**草案，未执行**）

`008_cultural_world_objects.sql`，新增三表（Event / MeaningCandidate / PresentConnection）+ 对 `historical_spatial_relations` 做 EXTEND（加 `object_value` jsonb nullable、`expression_rule` jsonb、`discovery_affordance` jsonb、`conflict_refs` array）。**外键一律 nullable** 以为 ExternalCulturalNode 留路。**不新增任何 numeric confidence**（V4.8 §3 `reliability` 映射为 categorical `support_level`，与既有 `hsr.support_level` 一致）。

---

## 3. Evidence 现状（live 校验）

### 3.1 本簇 6 条核心 Evidence 明细

| evidence_id | 来源 | time_hint | quote（截断） |
|---|---|---|---|
| `b24576ed-1efa-40ac-9cec-45484c382b0b` | 沪上经纬 seed.master.json — 金泽最小样本 | — | 「颐浩禅寺（1992年修复开放）承其名，寺址即其故宅」⚠️ 内含 U10 禁用表述，见 §3.4 |
| `12c2fc28-ce98-4cb3-b395-13049e7c387c` | 同上 | — | 「南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人」 |
| `b4c2a239-3b06-4440-8e7e-1da7dd664121` | 同上 | — | 「江南巨刹遗址 · 元代遗物（不断云石刻、元碑、古银杏）与当代复建殿宇并置」 |
| `faadce12-0ee1-434a-8f8f-bc24d93f9c59` | 上海青浦博物馆｜颐浩禅寺／普济桥／万安桥（2019-03-04） | 1938 | 「始建于宋景定元年（1260），由里人费辅之创建，**相传**为宰相吕颐浩故宅而得名。元至元二十五年（1288）建大雄宝殿等，元贞元年（1295）奉旨名为颐浩禅寺…」 |
| `deafbd03-d821-4b26-9de1-b366605f5084` | 人民号·绿色青浦（青浦区政府新闻办官方平台）｜青浦文物·颐浩寺遗址（2020-10-28） | 1260/1288/1295/1341/1938 | 「颐浩寺遗址位于金泽镇金溪居委会**迎祥街12号**…1992年…」 |
| `1bff151e-5bb2-498a-a56e-fd0e8b03b103` | 青浦文明网（中共青浦区委宣传部）｜《品读金泽》之金泽古韵（2025-04-14） | 1992 | 「…**1992年，在颐浩寺中心原址重建寺院**，建造了大雄宝殿、观音殿、地藏王殿…」 |

### 3.2 1861 / 1884 —— **不 seed**（已坐实）

查询 `quote_text LIKE '%咸丰%' OR '%光绪%' OR subject_hint/time_hint LIKE '%1861%/%1884%'` 命中 3 条，**无一为镇级灾害**：

- `c71bfc45…`：1879 青浦县城图（**地图**证据，县域图非镇级）
- `faadce12…` / `45216d25…`：因 quote 含「光绪」被误命中，实为颐浩寺沿革文本

→ **结论：Taskbook §2 条件分支不成立，1861/1884 不进入 Greenfield，AT-04 记 vacuously PASS。** 镇级灾害与寺的防火墙在本轮无对象可测（未 seed 即无传播路径），须在 result 中明示，不得记为「已验证防火墙有效」。

### 3.3 ⚠️ 双轨未对齐（Known Gap，非 blocker）

上述 6 条 evidence 的 `verification_status` **全部 = `candidate`**（非 `evidence_linked` / `verified`）。而 01C 裁决把 1260/1267/1342/1288/1295/1938/1992 判为 **SUPPORTED（evidence_backed）**。即：**Claim 级的 SUPPORTED 与 Evidence 行级的 candidate 未对齐**。本簇若要声明 `epistemic_status=SUPPORTED`，需 Architect 明确「SUPPORTED 的判据是『存在 evidence 行且来源权威』还是『evidence.verification_status 已达 evidence_linked』」。

### 3.4 ⚠️ U10 的表达切割难点

支持 HR-4 的 `b24576ed…` 原文**同时含**「寺址即其故宅」（HR-4 可用）与「1992年修复开放」（U10 禁用）。Expression Guard 必须能在**同一条 evidence 内**切割可用与禁用片段 —— 这是本簇施工的真实难点，须在 STEP 5 实现时显式处理，不能靠「整条 evidence 放行/禁用」的粗粒度开关。

---

## 4. BLOCKERS（逐条，含证据）

### B-1 · epistemic_status 第四套词汇 vs 禁止平行真源（**架构级**）

仓库现存三套：

| 词汇 | 位置 | 取值 |
|---|---|---|
| `verification_status`（enum） | `entities.status` / `relations.status` / `claims.status` / `evidence.verification_status` | raw, extracted, candidate, evidence_linked, verified, rejected, pending, published |
| `historical_relation_class`（enum） | `historical_spatial_relations.epistemic_class` | E1, E2, E3, E4 |
| `epistemic_status`（text + CHECK） | `discovery_candidates` | candidate, legend, research, unresolved |

V4.8 §3 要求第四套：`SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION`。

`specs/OWNERSHIP_MAP.md:20`：「新建文件前必须搜索是否已有同职责 owner。**禁止平行真源**。」

→ **需 Architect 裁决**：(a) 新增独立列/表并显式声明与既有三套的映射关系；或 (b) 扩展既有枚举（会触及 `discovery_candidates` 的 CHECK 与 publishable 触发器）。施工方无权自选。

### B-2 · 01C 裁决 R1 与库内现状错配（**事实级**）

01C 冻结 R1：颐浩寺 `former_site_of` / `named_after` 吕颐浩 = SUPPORTED_CANDIDATE + HR-4 frozen。

live 校验：

```
relations.relation_id = 592ee347-15b6-4958-9266-7dc116746d78
  subject_id = 6db1f52e…（吕颐浩）
  predicate  = mentioned_in        ← 不是 former_site_of
  object_id  = f9b41231…（颐浩寺遗址）   ← 方向与 hsr 相反

historical_spatial_relations.hs_relation_id = f4b9bcad-9c13-4500-a87d-99db84589d4a
  relation_key          = yihaosi-site--former_site_of--lvyihao
  existing_relation_id  = 592ee347…   ← 指向上面那行 mentioned_in
  hr_constraint         = {HR-4}
  epistemic_class       = E1   support_level = legacy_transcription
```

对照：`yihaosi-site--named_after--lvyihao`（`732e6d39…`）→ `existing_relation_id = fdd974db…`，其 `relations.predicate = named_after` ✅ **一致**。

→ **即：`named_after` 一致，`former_site_of` 在事实层无对应行且指针指向的 predicate 与方向均不符。** 修正方式（补一条 `relations(predicate='former_site_of')` 行并改指针 / 或澄清 hsr 的 former_site_of 是 feature_key 层独立主张、与 relations 行解耦）都会改变 01C 冻结裁决的落点 → **需 Architect 裁决**。

### B-3 · 分支 / ADR / working tree（**纪律级**）

- `CONTEXT.md`：「current task = EXP-0001 PASS（branch `track/experience-exp-0001`，**绝不在 main 施工**）」
- `specs/FOUNDATION.md:38`：「改变五层数据模型、Evidence Gate、ExperienceAction、核心目录 Ownership、首期无 AI 生图规则，**必须新增 ADR**」；`decisions/` 现仅 `ADR-001-greenfield-local-first.md`
- 现有分支：`main`、`track/experience-exp-0001`、`track/experience-exp-0002`（worktree `mohen-agent-2.0-exp`）→ **TRACK-W 无分支先例**
- working tree：7 untracked，**不 clean**

→ **需 Architect 指定**：(a) TRACK-W 分支名（建议 `track/world-cultural-world-02`）；(b) 7 个 untracked 治理文档是否随本次一并入库；(c) ADR-002 是否在 B-1 裁决后由施工方起草。

### B-4 · 1861/1884 零 evidence —— **已按 Taskbook 条件分支自行处置，非 blocker**

见 §3.2：不 seed，AT-04 vacuously PASS。此处列出仅为留痕。

### B-5 · U12 / `attested_time_evidence_backed` 口径未结 —— **Known Gap，降级**

金泽 5 个 `historical_features` 该字段**全部 = true**。U12 判定其语义为「仅表示无额外时间断言，不等于历史年代已证」。字段名 `evidence_backed` 具强误导性；若新 Event 表引用它作时间锚定基础，会继承误导。→ 本簇 Event 的 `temporal_scope` 应直接引用 01C 裁决 + evidence_ids，**不依赖该字段**；并在 ADR/文档中标注口径。

---

## 5. 施工进度对照（STEP 1–8 / AT-01–09）

| STEP | 内容 | 状态 |
|---|---|---|
| STEP 1 | Schema Fit Audit（REUSE/EXTEND/MISSING 先报告） | ✅ **DONE**（本报告 §2） |
| STEP 2 | Minimal Migration | ❌ 未执行（B-1/B-3 阻断） |
| STEP 3 | Seed First Cluster | ❌ 未执行 |
| STEP 4 | Evidence Trace | ❌ 未执行 |
| STEP 5 | Expression Guard | ❌ 未执行 |
| STEP 6 | Cluster Query | ❌ 未执行 |
| STEP 7 | Negative Tests | ❌ 未执行 |
| STEP 8 | Result + STOP | ⏸ **PARTIAL**（本文件已生成；未 commit，见 §7） |

| Acceptance Test | 状态 | 说明 |
|---|---|---|
| AT-01 World Object Separation | ❌ 未测 | 依赖 STEP 2–3 |
| AT-02 Evidence Trace | ❌ 未测 | 依赖 STEP 4 |
| AT-03 Meaning Firewall | ❌ 未测 | 依赖 STEP 3（MeaningCandidate） |
| AT-04 Town Event Firewall | ⚪ **vacuously PASS** | 1861/1884 未 seed（§3.2），无对象可污染 |
| AT-05 Conflict Preservation（1265 vs 1267） | ❌ 未测 | 依赖 STEP 3 |
| AT-06 HR-4 frozen | ❌ 未测 | 依赖 STEP 3；且 B-2 未裁决 |
| AT-07 1992 Boundary | ❌ 未测 | 依赖 STEP 5；U10 边界已在 §3.1 证实成立 |
| AT-08 Living Cluster Query | ❌ 未测 | 依赖 STEP 6 |
| AT-09 No Scope Creep | ✅ **PASS** | 未新增任何 01B 候选、未碰 External、未做 UI/GIS/Agent Runtime、未联网 |

---

## 6. Machine-readable Cluster Snapshot（**PRE-CONSTRUCTION**）

> ⚠️ 这是**施工前现状快照**，不是施工后产物。因 `CONSTRUCTION_PERFORMED = NO`，无 seeded IDs 可报。

```json
{
  "snapshot_type": "PRE_CONSTRUCTION",
  "generated_at": "2026-09-24",
  "git": {
    "root": "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0",
    "branch": "main",
    "head_before": "87bb56d0116ae3a938a7853a5dc8f069c7117386",
    "head_after": "87bb56d0116ae3a938a7853a5dc8f069c7117386",
    "working_tree_clean": false,
    "untracked_count": 7
  },
  "counts": {
    "tables": 23,
    "evidence_rows": 185,
    "source_records": 4,
    "slices": 1,
    "knowledge_paths": 3,
    "discovery_candidates": 4
  },
  "cluster": {
    "slice_id": "jinze-minimum-slice-001",
    "slice_title": "金泽历史空间最小切片：万安桥 — 普济桥 — 颐浩寺遗址 — 连接水系（金泽塘）",
    "readiness_gate": "YES",
    "historical_geometry_status": "absent_no_source",
    "entities": [
      {"entity_id": "f9b41231-e064-4a84-b463-1825776f4da4", "type": "building", "name": "颐浩寺遗址", "legacy_id": "hushang-jingwei:entity:JZ-BLD-008", "status": "candidate"},
      {"entity_id": "6db1f52e-606a-4b76-b14f-3af9d2f1dde4", "type": "figure",  "name": "吕颐浩",     "legacy_id": "hushang-jingwei:entity:JZ-PPL-001", "status": "candidate"},
      {"entity_id": "2feb8aed-dd98-4ec1-9c71-84587a0a6049", "type": "building", "name": "普济桥",     "legacy_id": "hushang-jingwei:entity:JZ-BLD-001", "status": "candidate"},
      {"entity_id": "6e1ac7fd-269a-4589-9a24-5aee83a30559", "type": "building", "name": "万安桥",     "legacy_id": "hushang-jingwei:entity:JZ-BLD-002", "status": "candidate"}
    ],
    "features": [
      {"feature_key": "jinze-min-001/feature/yihaosi-site", "feature_id": "2cb1c90b-d630-4b19-bbbe-bae17ed1fd92", "type": "temple_site", "entity_id": "f9b41231-e064-4a84-b463-1825776f4da4", "change_status": "rebuilt",     "historical_position_status": "unresolved"},
      {"feature_key": "jinze-min-001/feature/lvyihao",      "feature_id": "5e5d949b-6082-4a31-a79f-faa3483de2a0", "type": "person_reference", "entity_id": "6db1f52e-606a-4b76-b14f-3af9d2f1dde4", "change_status": "unknown",     "historical_position_status": "unresolved"},
      {"feature_key": "jinze-min-001/feature/pujiqiao",     "feature_id": "c3f30c82-4fac-44df-9332-8e627fce4815", "type": "bridge",  "entity_id": "2feb8aed-dd98-4ec1-9c71-84587a0a6049", "change_status": "survives",    "historical_position_status": "historical_relative_position_only", "attested_time": "1267"},
      {"feature_key": "jinze-min-001/feature/wananqiao",    "feature_id": "b82ba941-01ef-4f63-b7af-f72f0fe3ba68", "type": "bridge",  "entity_id": "6e1ac7fd-269a-4589-9a24-5aee83a30559", "change_status": "survives",    "historical_position_status": "historical_relative_position_only", "attested_time": "1260-1264"},
      {"feature_key": "jinze-min-001/feature/jinzetang",    "feature_id": "70f1236b-948b-4338-a76d-9b369a6cade7", "type": "waterway", "entity_id": null, "change_status": "unknown", "historical_position_status": "historical_relative_position_only"}
    ],
    "relations_existing_layer": [
      {"relation_id": "592ee347-15b6-4958-9266-7dc116746d78", "subject": "吕颐浩",     "predicate": "mentioned_in",          "object": "颐浩寺遗址", "status": "candidate", "MISMATCH": "01C R1 期望 former_site_of 且方向相反（B-2）"},
      {"relation_id": "fdd974db-fef6-491d-88da-7450382343ca", "subject": "颐浩寺遗址", "predicate": "named_after",           "object": "吕颐浩",     "status": "candidate", "MISMATCH": null},
      {"relation_id": "b473e29f-a46a-4a3a-b49a-3538a3d52139", "subject": "普济桥",     "predicate": "spans_same_waterway",   "object": "万安桥",     "status": "candidate", "MISMATCH": null},
      {"relation_id": "08093494-347d-4cda-afb5-b3b7eda9076f", "subject": "万安桥",     "predicate": "spans_same_waterway",   "object": "普济桥",     "status": "candidate", "MISMATCH": null}
    ],
    "historical_spatial_relations": [
      {"hs_relation_id": "f4b9bcad-9c13-4500-a87d-99db84589d4a", "relation_key": "yihaosi-site--former_site_of--lvyihao",          "epistemic_class": "E1", "support_level": "legacy_transcription",     "hr_constraint": ["HR-4"], "existing_relation_id": "592ee347-15b6-4958-9266-7dc116746d78", "evidence_ids": ["b24576ed-1efa-40ac-9cec-45484c382b0b", "12c2fc28-ce98-4cb3-b395-13049e7c387c"]},
      {"hs_relation_id": "732e6d39-308d-4113-9ef5-16d8c7fd6c8c", "relation_key": "yihaosi-site--named_after--lvyihao",             "epistemic_class": "E1", "support_level": "legacy_transcription",     "hr_constraint": ["HR-4"], "existing_relation_id": "fdd974db-fef6-491d-88da-7450382343ca", "evidence_ids": ["12c2fc28-ce98-4cb3-b395-13049e7c387c"]},
      {"hs_relation_id": "1523e5aa-11fa-44c1-9bf0-68bfd3031406", "relation_key": "pujiqiao--spans_same_waterway--wananqiao",       "epistemic_class": "E1", "support_level": "legacy_transcription",     "hr_constraint": [],       "existing_relation_id": "b473e29f-a46a-4a3a-b49a-3538a3d52139", "evidence_ids": ["02190cbd-7e73-439e-ac8b-742b42f6863f", "87ca8734-9fb2-4846-96be-971b55bae144"]},
      {"hs_relation_id": "4e76760a-107a-4528-9f19-e9dc9ef86d62", "relation_key": "wananqiao--spans_same_waterway--pujiqiao",       "epistemic_class": "E1", "support_level": "legacy_transcription",     "hr_constraint": [],       "existing_relation_id": "08093494-347d-4cda-afb5-b3b7eda9076f", "evidence_ids": ["02190cbd-7e73-439e-ac8b-742b42f6863f"]},
      {"hs_relation_id": "66768ced-2bb7-4b9d-b8ff-f13fcc2e3ff3", "relation_key": "pujiqiao--relative_position_south_of--wananqiao","epistemic_class": "E3", "support_level": "legacy_transcription",     "hr_constraint": [],       "existing_relation_id": null, "evidence_ids": ["02190cbd-7e73-439e-ac8b-742b42f6863f", "87ca8734-9fb2-4846-96be-971b55bae144"]},
      {"hs_relation_id": "c055328d-f345-4dd8-a8c2-44e1789a0b67", "relation_key": "yihaosi-site--temple_bridge_association--pujiqiao","epistemic_class": "E2", "support_level": "provider_geometry",      "hr_constraint": ["SHR-01"],"existing_relation_id": null, "evidence_ids": ["3bddb444-0af0-a4a1-df72-b78cc361c33c", "ade1eaac-b5e7-f32a-1949-b5a6e0893ab5"]},
      {"hs_relation_id": "03dc1d17-ef52-4901-94bc-f2494f5eaf88", "relation_key": "wananqiao--spans_waterway--jinzetang",           "epistemic_class": "E1", "support_level": "legacy_transcription",     "hr_constraint": [],       "existing_relation_id": null, "evidence_ids": ["020b8bcf-bf84-4d37-8312-66194ad09f23", "af39958e-8672-4036-87b0-0d6e6d58618a", "04ee5f86-7471-4f12-8416-9616143f3982", "e4ea7c8d-1d7e-4d1b-832b-2495a823f312"]},
      {"hs_relation_id": "f5642bf8-0452-4cd2-86c4-55462a708af5", "relation_key": "pujiqiao--spans_waterway--jinzetang",            "epistemic_class": "E1", "support_level": "secondary_transcription",  "hr_constraint": [],       "existing_relation_id": null, "evidence_ids": ["02190cbd-7e73-439e-ac8b-742b42f6863f", "87ca8734-9fb2-4846-96be-971b55bae144", "c79b0580-5a1e-40bd-8459-0f9d6fed75d9", "9eb29e06-8016-4661-b12e-b55e7a2efa1a"]}
    ],
    "changes": [
      {"change_id": "6cf24d0d-4055-4c48-94e9-233b2180023d", "change_key": "yihaosi-site/rebuilt-on-original-site", "change_status": "rebuilt",  "change_epistemic": "evidenced", "time_hint": "1260 创建 → 1938 大部分被毁 → 1992 原址重建", "evidence_ids": ["b4c2a239-3b06-4440-8e7e-1da7dd664121", "faadce12-0ee1-434a-8f8f-bc24d93f9c59", "deafbd03-d821-4b26-9de1-b366605f5084", "1bff151e-5bb2-498a-a56e-fd0e8b03b103"]},
      {"change_id": "4c634131-c27f-4b21-8483-a6c40aec45aa", "change_key": "wananqiao/tingqiao-form-unknown",      "change_status": "survives", "change_epistemic": "evidenced", "time_hint": "1260–1264 始建 → 1342 加建廊亭 → 亭阁废（年份无证据）→ 当代", "evidence_ids": ["04ee5f86-7471-4f12-8416-9616143f3982", "0072b791-f791-424e-8333-98a4390d96f2", "612dca76-4986-4ae6-83d0-c83b1cc25c1a"]},
      {"change_id": "cbf74ba8-6ffa-42ff-afa9-d609cd11093f", "change_key": "wananqiao/survives-to-today",          "change_status": "survives", "change_epistemic": "evidenced", "time_hint": "1260s → 当代", "evidence_ids": ["70e7981e-36b1-4162-8e0e-496c8cefb93f", "a3132fa1-ec7a-4694-b167-20e2a01348a1"]},
      {"change_id": "19e8ae97-7d6d-44a5-873f-358dca6236a1", "change_key": "pujiqiao/survives-to-today",            "change_status": "survives", "change_epistemic": "evidenced", "time_hint": "1267 → 当代", "evidence_ids": ["f4a491f8-9ec3-4440-85bf-a837059eb9ba", "2c905d56-76de-4d0b-8b8a-0b77f222864a"]},
      {"change_id": "7d6f66ea-144c-4c5c-9a2a-157f5e816035", "change_key": "jinzetang/history-unknown",             "change_status": "unknown",  "change_epistemic": "unknown",   "time_hint": "", "review_status": "unresolved"}
    ],
    "town_level_events_1861_1884": {
      "seeded": false,
      "reason": "Greenfield evidence 表零命中（仅 Legacy A 档 snippet，Legacy 只读不可重入库）；Taskbook §2 条件分支不成立",
      "at_04": "VACUOUSLY_PASS"
    },
    "u10_1992_open_as_religious_venue": {
      "status": "MUST_NOT_ENTER_RUNTIME_WORLD_AS_FACT",
      "evidence_checked": ["deafbd03-d821-4b26-9de1-b366605f5084", "1bff151e-5bb2-498a-a56e-fd0e8b03b103"],
      "finding": "两条官方源 quote 均只写『1992 年在原址重建寺院』，未写『开放为宗教活动场所』；无官方文号 → U10 边界在 Greenfield 侧成立"
    },
    "pujiqiao_1265_vs_1267": {
      "greenfield_attested": "1267",
      "conflict_source": "Commons caption 1265",
      "status": "MUST_PRESERVE_CONFLICT_1265_NOT_DEFAULT"
    }
  },
  "blockers": ["B-1 epistemic_status 第四套词汇 vs 禁止平行真源", "B-2 01C R1 former_site_of 与库内 mentioned_in 错配", "B-3 分支/ADR/working tree 未决"],
  "known_gaps": ["G-1 evidence.verification_status 全为 candidate，与 01C SUPPORTED 双轨未对齐", "G-2 b24576ed 同一条 evidence 内含 HR-4 可用片段与 U10 禁用片段，Expression Guard 须逐片段切割", "G-3 attested_time_evidence_backed(U12) 字段名误导，金泽 5/5 全 true，本簇不以其为时间锚定依据", "G-4 未 commit（见 §7）"]
}
```

---

## 7. 修改文件 / Migration / Seeded IDs / Commit

| 项 | 结果 |
|---|---|
| **Modified files（tracked）** | **0**（未修改任何已跟踪文件） |
| **Added files** | 仅本文件 `tasks/results/CULTURAL-WORLD-02-result.md`（新增，未提交） |
| **Migration** | **无**（未创建 `008`） |
| **Seeded IDs** | **无**（未 seed） |
| **Git commit** | **未提交** |

**未提交的三条理由（需 Architect 指定后补做）**：
1. `CONTEXT.md` 明文「绝不在 main 施工」，而当前 HEAD 在 `main`；
2. TRACK-W 无分支先例，分支命名权在 Architect（建议 `track/world-cultural-world-02`）；
3. working tree 已有 7 个 untracked 治理文档，是否随本次入库需 Architect 定（避免我替用户决定把 V4.8 / 01A–01C 任务书一并提交）。

本文件已落盘，内容不依赖 commit 即可被 Architect 读取；后续在指定分支上提交时不会出现内容缺失。

---

## 8. Final Status Block（Taskbook §8）

```
TASK_STATUS = PARTIAL
TRACK_W = ACTIVE（首次最小施工；止于 STEP 1）
CONSTRUCTION_PERFORMED = NO
SCHEMA_CHANGED = NO
LEGACY_MODIFIED = NO
WEB_USED = NO
UI_WORK = NO
GIS_WORK = NO
AGENT_RUNTIME_WORK = NO
FIRST_CLUSTER_SEEDED = NO
ACCEPTANCE_TESTS = PARTIAL（AT-04 vacuously PASS；AT-09 PASS；其余 7 项未执行）
ARCHITECTURE_RECONCILIATION = BLOCKED（B-1、B-2、B-3）
PLAN_RECONCILIATION = OK（Taskbook §2 固定边界未被扩展；未触碰 01B 候选池、External、UI/GIS/Agent）
GIT_COMMIT = NO（见 §7）
RECOMMENDED_NEXT_STEP = ARCHITECT_REVIEW
```

---

## 9. Architect 一次拍板即可解除的清单

请逐条给指令，施工方（我）不再追问即可开工：

1. **B-1 词汇**：新增 V4.8 六值为独立列/表并声明与既有三套枚举的映射？（推荐：新表独立列 `epistemic_status text` + `CHECK` 六值，并在 ADR-002 中写死映射表，不改既有三套）｜或扩展既有枚举？
2. **B-2 former_site_of**：(a) 补一条 `relations(predicate='former_site_of', subject=颐浩寺, object=吕颐浩)` 并修正 `f4b9bcad…` 的 `existing_relation_id` 指向它；还是 (b) 声明 hsr 的 `former_site_of` 为 feature_key 层独立主张、与 `relations` 行解耦（此时须同步修订 01C R1 的表述）？
3. **B-3 分支与入库**：TRACK-W 分支名（建议 `track/world-cultural-world-02`）；7 个 untracked 治理文档是否随本次入库；ADR-002 是否由我在 B-1 裁决后起草？
4. **G-1 判据**：`epistemic_status='SUPPORTED'` 的判据是「存在 evidence 行且来源权威」还是「evidence.verification_status 已达 evidence_linked」？若取后者，本簇 6 条核心 evidence 现为 `candidate`，需先补一轮 evidence 提升（属新工作，须另立任务）。
5. **1265 冲突的落点**：是否要求在本簇建一条 `CONFLICTED` 的 RelationClaim 行显式承载 1265 vs 1267（Taskbook §2 只说「保留冲突、1265 不得成下游默认」，未明确是否要建行）？

---

## 10. Known Gaps（留痕，不在本次解决）

- **G-1**：`evidence.verification_status` 与 01C 的 SUPPORTED 双轨未对齐（§3.3）。
- **G-2**：`b24576ed…` 单条 evidence 同时含 HR-4 可用片段与 U10 禁用片段，Expression Guard 须逐片段切割（§3.4）。
- **G-3**：`attested_time_evidence_backed`（U12）字段名误导，金泽 5/5 全为 `true`；本簇 Event 不以它为时间锚定依据。
- **G-4**：未 commit（§7）。
- **G-5**：`relations.subject_id/object_id` 均 NOT NULL FK `entities`，使金泽塘（无 entity_id）与未来 Event 无法入该表；本簇按 §2.3 方案走 feature_key 寻址层，不改写 `relations`（改写会触及既有 4 行金泽数据，属超范围）。

---

**STOP — 不启动第二 Cultural Relation Cluster，不批量迁移 Candidate Reservoir，不进入 STEP 2。等待 ChatGPT Architect Review。**
