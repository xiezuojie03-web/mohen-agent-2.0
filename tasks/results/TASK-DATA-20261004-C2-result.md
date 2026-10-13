# TASK-DATA-20261004 · C2 结果记录（候选抽取与确定性对齐）

- **任务书**：`tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md` · C2（Phase 1 · P1-3~P1-4）
- **执行日期**：2026-10-04
- **Registry 作业**：`unattended.candidate-extraction` + `unattended.deterministic-resolution`（实现 Skill：`mohen-evidence-gate`，Entry：`pipelines/legacy/unattended-runner.mjs`）
- **模式**：`MOHEN_WRITE_ENABLED=true` 实跑（非 DRY_RUN）；`MOHEN_ENV=dev`
- **零自动晋级**：verified/published = 0，auto 分诊 = 0（全量 HOLD）

---

## 1. 完成判定（对照任务书 C2 验收）

| 验收项 | 结果 | 证据 |
|---|---|---|
| `entities`/`relations` 候选表有老项目来源数据 | ✅ | `entities` +3041（legacy_id=`unattended-ce:*`）、`relations` +2923（`unattended-ce-rel:*`），均源自 C1 证据（`extraction_method='unattended-evidence-fragment'`） |
| `legacy_mappings` 记录精确对齐 | ✅ | deterministic-resolution 写 `legacy_mappings` +5（method=`deterministic-resolution`），按 normalized(name)+同类型精确对齐 |
| 歧义进 HOLD，不自选边 | ✅ | 同名异类型冲突 HOLD +11（`HOMONYM_CONFLICT`）；新候选对齐后 HOLD +5（`ALIGNED_DUPLICATE`）；其余 3134 个为新候选（无冲突，保持 candidate 待 C3） |
| `guard:registry` 绿 | ✅ | `PRODUCTION_REGISTRY schema=v2 entries=14 queued=106 runnable=106 unresolved=0` |
| `guard:structure` 绿 | ✅ | `required=10 skills=13 dirs=13`，Skill-作业绑定 8/8 |
| `guard:review-triage` 绿（无 AUTO） | ✅ | 分诊分布仅 hold/reject，auto=0（近 1 日） |
| `guard:source-gate` 绿 | ✅ | 来源 `hushang_legacy`，`evidence_allowed=false`，无越权写证据 |

> 本阶段 `cultural_*` 与 `historical_spatial_relations` 属 C3 关系编织/门禁投影范畴，按任务书 write_scope 边界**不落**（C2 只建立实体/关系候选蓄水池供其消费）。`discovery_candidates` 已在 C2 落库（+1138），与 C3 消费链一致。

---

## 2. 执行摘要（数字来自 runner `progress.json`）

| 指标 | 数值 |
|---|---|
| C1 证据已处理 | 4812（全量，幂等：legacy_mappings 标记 `unattended-ce`/evidence 跳过） |
| 新实体候选 `entities` | **3041**（place 2178 / building 972） |
| 弱共现关系候选 `relations` | **2923**（`co_mentioned_in`，confidence 0.2，candidate） |
| 弱归属 claim `claims` | **3041**（`candidate_extracted_from` + 对应 `claim_evidence`） |
| discovery 候选 `discovery_candidates` | **1138**（多实体共现片段） |
| 确定性对齐 `legacy_mappings` | **5**（精确对齐）+ 11 个同名异类型 HOLD |
| 全量 `review_queue` HOLD | **10159**（抽取 10143 + 对齐 16） |
| `evidence_gate_audit` 行 | **41748**（每个候选实体/关系 G0–G6 占位全 pass，晋级判定留待 C3） |

---

## 3. 作业实现说明（代码落点：`pipelines/legacy/unattended-runner.mjs`）

### 3.1 `jobExtraction` — unattended.candidate-extraction
- 消费 C1 证据片段；每条证据抽取候选 mention：
  - `place_hint`（3399 行存在）→ `place`；`subject_hint`（295 行）→ `unknown`；
  - 启发式中文地名扫描：`/[一-龿]{1,2}(桥|寺|镇|湖|…后缀)/g`，过滤虚词首字（`之/游/据/…`）+ 数字/十百千万。
- 每个 mention → 候选实体 `entities`（legacy_id=`unattended-ce:sha(norm+type)`，status=`candidate`，confidence 0.42–0.55）。
- 同证据 ≥2 实体 → 弱共现 `relations`（`co_mentioned_in`，封顶每证据 3 对）。
- 每条新实体 → `claims`（`candidate_extracted_from`）+ `claim_evidence`；同证据 ≥2 实体 → `discovery_candidates`。
- **出生即带 HOLD 三分行 + G0–G6 审计**；零自动晋级。
- 幂等：本批内按 normalized(name+type) 去重；跨批由 `legacy_mappings`(unattended-ce/evidence) 标记跳过。

### 3.2 `jobResolution` — unattended.deterministic-resolution
- 仅对**本次 C2 新候选**（legacy_id like `unattended-ce:*` 且未对齐）做精确对齐：
  - 同名 + 同类型 → 写 `legacy_mappings`（target=既有 canonical），并 HOLD（`ALIGNED_DUPLICATE`，待人工确认合并）；
  - 同名异类型（歧义）→ HOLD（`HOMONYM_CONFLICT`），**不自选边**。
- 既存同名簇（如 吕颐浩 等历史 3 项）属历史数据卫生问题，C2 **不做危险批量合并**，仅统计上报（见 §5）。
- 幂等：已对齐实体由 `legacy_mappings`(unattended-ce/entity) 标记跳过。

### 3.3 下游转化支撑报告
- `pipelines/legacy/unattended-report.mjs --impact --stage C2` 新增 `analyzeCandidateImpact`/`renderCandidateImpactHtml`：
  实体类型分布（donut/hbar）、可转化信号密度（空间/人物/关系）、M1–M5 母题支撑矩阵、下游候选产出预估、红线校验。
- 产物：`tasks/results/TASK-DATA-20261004-C2-impact.html` + `.json`。

---

## 4. 数据落库明细（SQL 出处）

- 实体候选：`insert into entities (…) values (…) where legacy_id='unattended-ce:*'` → +3041
- 弱关系：`insert into relations (…) predicate='co_mentioned_in' legacy_id='unattended-ce-rel:*'` → +2923
- 弱 claim：`insert into claims (…) predicate='candidate_extracted_from'` + `claim_evidence` → +3041
- discovery：`insert into discovery_candidates (…) discovery_code='unattended-ce:*'` → +1138
- 对齐：`insert into legacy_mappings (legacy_source='unattended-ce', mapping_method='deterministic-resolution')` → +5
- 分诊：`insert into review_queue (triage_outcome='hold', review_tier='C', ingest_run_id=…)` → +10159
- 审计：`insert into evidence_gate_audit (object_type in ('entity','relation'), gate_code in G0..G6, result='pass')` → +41748

---

## 5. 已知限制与偏差（诚实记录）

1. **启发式抽取噪声**：正则无 NLP 模型，单字/双字地名易夹带短语碎片（如「畔有亭」「距淀山」）。已通过「1–2 字前缀 + 虚词首字/数字过滤」将虚词前缀噪声压到 0、四字短语噪声消除；实体名长度分布现为 2 字 505 / 3 字 2536，绝大多数为真实地名/建筑名。**仍属宽进范畴，全部 candidate，由人工/门禁在 C3 甄别。**
2. **`cultural_*` / `historical_spatial_relations` 未落**：需 feature_key / slice 上下文与 C3 编织/投影机制，C2 不代写（遵循任务书边界）。
3. **锚点强 ID（吕颐浩 Wikidata ID、双桥 strong ID）**：DB 内无权威外部 ID，未编造。吕颐浩现有 3 个 pre-C2 实体（同名同类型簇），其精确对齐/合并待**项目拥有者提供权威 ID 或裁定**后在 C3 处理；双桥在现有数据中不存在，需拥有者确认实体化来源。
4. **既存同名簇（约 540 个 same-name same-type）**：历史数据卫生问题，C2 不批量自动合并（避免错误合并），留待专门数据清洗/拥有者裁定。
5. **PDF 深文本抽取**：同 C1，缺 PDF 解析库，留作 R26 后续能力；C2 不受影响（消费 C1 文本片段）。

---

## 6. 下一步（C3 · 关系编织与投影）

- C2 已建立实体/关系候选蓄水池（entities 3041 + relations 2923 + discovery 1138 + legacy_mappings 对齐 5）。
- C3 应对候选做门禁投影（G0–G6 → AUTO/HOLD/REJECT）、关系编织（relation-weave）、并落 `cultural_*` / `historical_spatial_relations`（在特征/切片上下文内）。
- 请新开对话，加载任务书执行 **C3**。
