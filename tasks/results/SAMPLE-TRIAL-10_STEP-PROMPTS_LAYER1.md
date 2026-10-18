# 数据生产作业样板试验 · 第一层分步提示词（文字/结构化最小方法集）

> 日期：2026-10-17
> 编号：SAMPLE-TRIAL-10（提示词部分）
> 性质：**静态提示词文件，不接 LLM、不写库。** 供第一层真实闭环接入时逐阶段调用，配合本包 JSON schema（SAMPLE-TRIAL-10_JSON-SCHEMAS）强制输出。
> 方法集（第一层最小闭环）：`C01 → H05/H04 → W01/W02/W05/W09 → A01/A10 → P01–P07`。
> 版本：各提示词独立 `prompt_version`，与 schema 版本、模型版本、输入指纹共同构成缓存键。

---

## 〇、总纪律（跨阶段不变）

1. **禁止一法一调**：D02 一次调用产出 H05/H04 全部字段；D03 一次调用产出 W01/W02/W05/W09 全部字段；D04 一次调用产出 A01/A10 全部字段。不得为每个方法单独发一次 LLM。
2. **各阶段只做自己的事**：D01 只读载体产出 `reading_unit`；D02 只观察材料产出 `material_observation`，不建世界事实；D03 只建构世界产出 `world_claim_revision`，不写解释/故事；D04 只发现解释产出 `humanistic_finding`；D05 只发布，不补造事实。
3. **落点缺失 → 补落点，不越界代做**：上游字段缺失返回对应阶段请求补正，不靠本阶段臆造。
4. **事实与解释分离**：L3 事实（有证据主张）与 L4 解释（人文发现）不得混写；`candidate`/`contested`/`legend` 不得升 `fact`。
5. **证据可返源**：每项输出必带 `evidence_refs` / `source_version_ref` / `l1_unit_refs`，可一路回到 L0 原件。
6. **确定性优先**：D01 文本解析、D05 规则类（P01/P02/P03/P05/P06/P07）优先确定性代码，不调 LLM；仅 D02/D03/D04 及 D05-P04 组合表述走 LLM。
7. **输入指纹 + 缓存**：输入原文 hash + `prompt_version` + `model_version` 构成缓存键，命中不重复调用。

---

## 一、D01 阶段｜C01 数字文本读取（确定性为主，不调 LLM）

- **prompt_version**：`p-c01-v1.0`
- **方法**：C01（output_contract = `reading_unit`）
- **输入**：数字文本原文 + L0 来源版本引用（source_version_id/raw_item_id）。
- **输出**：对齐 `schema-d01-reading-unit.v1`。
- **指令（确定性代码实现，LLM 仅兜底分段）**：
  1. 按文本结构切分最小可引用阅读单元（卷/篇/条/段落），产出 `unit_path` 与 `parent_unit_id` 层级。
  2. 保持原文逐字快照（`literal_reading`），不静默改写、不补字、不修繁体异体；繁简/异读/编辑干预单独标注。
  3. 仅登记「可读载体」，不判史料类别、不抽实体、不建世界——那属于 D02/D03。
  4. 无法稳定切分处标 `classification_status=unresolved`，不得冒充确定。

---

## 二、D02 阶段｜H05/H04 材料观察（分步跳读，一次调用产出全部字段）

- **prompt_version**：`p-d02-h05h04-v1.0`
- **方法**：H05（主，地方志）、H04（邻类，历史地理著作）
- **输入**：C01 产出的阅读单元 + 原文片段 + L1 引用。
- **输出**：对齐 `schema-d02-material-observation.v1`（`reading_units` + `classification_decisions` + `material_mentions` + `material_evidence` 含 `assertion_kind`/`voice_basis`）。
- **分步跳读指令（必须严格按序，内部推理不分次调用）**：

  **第 1 步｜分类**：
  - 依据材料「知识组织目的 + 编纂体例」判主类，H05 方志按其「序跋凡例/舆图/沿革/山川/建置/人物/风俗/艺文/杂记」结构识别；含独立地理条目（地名沿革/山川水道/郡县）时判 H04 邻类。
  - 输出 `primary_h_type` + 最多 3 个 `alternatives` + `basis`；类型不清写 `H-UNRESOLVED`，禁止用格式/研究主题先验代替判别。

  **第 2 步｜定位关键区**：
  - 沿原书层级路径定位「关键区」：凡涉及人/时/地/物/数的段落（建置沿革、桥梁、水道、人物、艺文）逐一给出 `span_in_evidence` 与 `unit_path`。
  - 区分「本届纂修者 / 旧志引文 / 地方传闻 / 收录碑文」四类话语层。

  **第 3 步｜精读（逐句）**：
  - 逐句记录「谁在何时何种语境下说了什么」，先记原文所述，再做限定释义；推测与可见文字分离。
  - 对「旧传」「俗云」「旧志转录」**不得当独立证实**，写入 `voice_basis` 与 `assertion_kind`（记述/规范/愿望/传闻/论辩/虚构/假说）。
  - 逐字引文进 `literal_reading`，整理读本进 `normalized_text`，材料陈述进 `research_proposition`（是「某材料提出某陈述」，不是 D03 核准事实）。

  **第 4 步｜结构化输出（一次产出）**：
  - 字面提及进 `material_mentions`（`mention_kind` ∈ 人/时/地/物/数，字面原貌，**禁止写 world.entity_id**）。
  - 转引/转录/编辑依赖进 `reading_unit_dependencies`；转引不自动算独立来源。
  - 逐字引文与核读进 `material_evidence`（含 `quote_review_status`、`assertion_kind`、`voice_basis`、`evidence_version_no`、`input_fingerprint`）。
- **禁止**：不建实体、不合并同名对象、不赋现代坐标、不判史实真伪（留给 D03）。

---

## 三、D03 阶段｜W01/W02/W05/W09 世界建构（一次调用产出多方法字段）

- **prompt_version**：`p-d03-w01w02w05w09-v1.0`
- **方法**：W01 身份与连续性 / W02 时间与时序 / W05 关系与角色 / W09 冲突与认识状态（W07/W08 佐证，随包同调）
- **输入**：D02 经 G2 有界 PASS 的 `material_observation` 快照。
- **输出**：对齐 `schema-d03-world-claim-revision.v1`（`world.claim_revisions` + `conflicts` + `identity_decisions` + `event_participations` + `provenance_assessments`）。
- **指令（一条判断的连续建构循环，一次调用产出，不分次）**：
  1. **拆主张（W07）**：把每条材料说法拆成单义主张「主体—谓词—客体/值—时空—条件—说话者—断言模态」；区分「资料记载 X」与「X 真实发生」。
  2. **认身份（W01）**：从字面提及建候选实体；同名/近邻/图形相似**不构成同一性**；合并须有可核查桥接（明示同一指认 / 连续角色轨迹 / 多约束独立证据），并搜索互斥年代与「新旧/东西」之别。同名异地/异人一律列候选，不合并。
  3. **定时间（W02）**：保留原纪年与历法，区分「事件/状态有效时段、材料形成时间、版本刊刻时间、评定时间」；残缺纪年不猜精确日；先后不推因果。
  4. **建关系（W05）**：给出有方向、有时效、有角色约束的关系候选；共现 ≠ 关系；规定 ≠ 执行；跨期关系不得画确定实线。
  5. **管冲突（W09）**：先对齐身份/谓词/单位/阶段/时间/空间口径，再区分「实质互斥」与「表面差异」；每条候选保留支持/反证；认识状态 ∈ `material_report / candidate / supported_with_limits / contested / unresolved / withdrawn`；**冲突并列不择一**，改判追加新版本不覆盖旧记录。
  6. **写落点**：每个候选主张写 `world.claim_revisions`（`subject_kind`/`subject_id`/`assertion_payload_json`/`asserted_time_json`/`claim_family_id`）；冲突写 `world.conflicts`（`resolution_status` ∈ open/resolved/preserved_open/rejected）；身份裁决写 `identity_decisions`（SAME/DIFFERENT/UNRESOLVED）；来源独立性写 `provenance_assessments`（UNKNOWN/POSSIBLY_SHARED/INDEPENDENT/DERIVED）。
  7. **审计记录**：每项附 `method_code`、`rule_version`、`input_refs`、`decision`、`uncertainty`、`affected_dependencies`。
- **禁止**：不写 G3 PASS；不产 D04 解释/故事；不产 UI 画面；证据数量 ≠ 独立见证数。

---

## 四、D04 阶段｜A01/A10 人文发现（一次调用产出）

- **prompt_version**：`p-d04-a01a10-v1.0`
- **方法**：A01 显式关系解释 / A10 冲突发现（A02 共现线索仅作候选，不越界成关系）
- **输入**：D03 经 G3 有效资格的 `world.claim_revision` + 冲突 + 来源谱系。
- **输出**：对齐 `schema-d04-humanistic-finding.v1`。
- **指令**：
  1. **非平庸增量**：输出不得复述 B0 事实、不得换标题；须是「基于已证关系/冲突的进一步解释」。
  2. **守边界**：`legend`（HR-2 赵孟頫↔颐浩寺）不升 fact；`research`（HR-3 四十二虹桥）不作事实节点；`candidate`（HR-4 吕颐浩↔颐浩寺）保持「据方志」限定。
  3. **保留反证/竞争解释**：冲突（T11-C1/C2、HR-6）以并列呈现，不筛成单一答案。
  4. **分类**：`finding_kind` ∈ 显式关系解释(A01) / 冲突发现(A10) / 共现线索(A02 候选)；`epistemic_classification` 含 `INTERPRETATION_CANDIDATE`，永不静默改写为事实。
  5. 每项带 `evidence_refs`（可回 L2 证据 / L3 主张修订）。
- **禁止**：不回写世界事实；不产出 D05 台词/画面。

---

## 五、D05 阶段｜P01–P07 可信发布（规则类确定性为主，P04 走轻量 LLM）

- **prompt_version**：`p-d05-p01p07-v1.0`
- **方法**：P01 资格选入 / P02 世界投影 / P03 时空变换 / P04 有界解释组合 / P05 探索关系编排 / P06 证据返还 / P07 消费分面。
- **输出**：对齐 `schema-d05-publication.v1`（P01→`selection_manifest`；P02→`world_projections`；P03→`map_timeline_projections`；P04→`story_seeds`+`agent_contexts`；P05→`discovery_paths`；P06→`evidence_pointers`；P07→`consumer_facet`）。
- **指令**：
  1. **P01 资格选入（确定性）**：仅选入经 G3 有效资格的当前版本主张；到期/指纹错配即止，不复活旧 PASS。
  2. **P02/P03（确定性）**：投影与时空变换只消费有界世界主张；空间按精度降级（无坐标退拓扑），不配准不伪造。
  3. **P04 有界解释组合（轻量 LLM）**：把 L4 发现组合为可读故事；每个 factual unit 必带 `evidence_refs`；`QUESTION`/`INTERPRETATION_CANDIDATE` 永不改写为事实；不得补造证据之外的情节。
  4. **P05/P06/P07（确定性）**：探索关系编排、证据返还指针、消费分面按规则生成。
- **红线**：P01–P07 不补造事实；真实 G5 只来自真实生产、合格证据与规定资格检查。

---

## 六、缓存键与版本指纹约定

```
cache_key = sha256(
  concat(
    input_fingerprint(原文/观察 hash),
    prompt_version,
    schema_version,
    model_version
  )
)
```

- `input_fingerprint`：D01 用原文 hash；D02 用上游 `reading_unit` hash；D03 用上游 G2 快照 hash；D04 用 G3 当前资格 hash。
- 命中即返回缓存，不重复调用；`model_version` 未实测绑定（真实评测前不得认定具体型号）。

---

## 七、未覆盖 / 留待后续

- 第一层**不含** OCR（C02）、舆图（C03）、照片（C04）、音频（C06）、金石（H09）、空间（W03）、跨模态共指（A07）——均属第二层视觉，待第一层闭环后启用。
- 56 条 HOLD（A01–A12 → PD1–PD7 消费边）逐 ID 释放；本提示词不触发放行。
