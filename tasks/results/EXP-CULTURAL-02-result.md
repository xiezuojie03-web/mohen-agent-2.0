> EXP-CULTURAL-02 · Result（M3.3 DESIGN-CONTRACT，READ-ONLY ANALYSIS，NO IMPLEMENTATION）
> 归档时间：2026-09-25（执行完成后归档；本任务零 repo 改动，仅写入本 Result 与最小治理指针）
> 前置：EXP-CULTURAL-01 = PASS / CLOSED；Gate = PASS_TO_M3.3；归档 commit = `2a875f7`
> Architect Review（后续）：PARTIAL / MINIMAL_CONTRACT_FIX，M4 暂不授权；已据 FIX-01/FIX-02 修正契约一致性，详见 §16（零代码/schema 改动，仅更新本文件）。

# EXP-CULTURAL-02 · Result
**Living Cultural World → Canonical Experience · Experience Projection Contract**
**Track:** E / Experience · Phase II / M3.3 ｜ **Mode:** DESIGN-CONTRACT · READ-ONLY ANALYSIS · NO IMPLEMENTATION
**Repo:** `mohen-agent-2.0` @ `track/world-cultural-world-02`（HEAD `2a875f7`，本任务仅新增本 Result + 治理指针切换，零类型/代码/schema 改动）
**Task Book：** `tasks/EXP-CULTURAL-02_M3.3_Experience-Projection-Contract_Task-Book_V1.0.docx`

---

## 01 · Executive Verdict

**判定：DESIGN-CONTRACT 完成，M3 Gate 建议 = `PASS_TO_M4`（无架构 blocker，Projection Contract 足以指导一个最小 M4 实现 Slice）。STOP，等待 Architect Review。**

核心结论：本任务在「不复制 World 真源、不把六值压缩进 E1–E4、不把 World 与 Experience Composition 合并」三条硬约束下，冻结了一份 **Experience Projection Contract V0.1**，覆盖 7 类 World Object（Entity / Event / RelationClaim / Conflict / EvidenceFragment / MeaningCandidate / PresentConnection），并为其定义了：六值 Expression Policy 矩阵、cultural_* → `WorldEvidenceState`/`ExperienceState` 字段级投影、Action Eligibility、Composition Boundary、Legacy/Script 职责分类，以及一次覆盖 1265/1267·hr4_usable·u10_forbidden·1938/1992·MeaningCandidate·PresentConnection 的 Five-Beat 契约级 walkthrough。

强制输入 Gap（EXP-CULTURAL-01 Gap Register）全部 **CLOSED_BY_CONTRACT**：G-01（主线 008→WorldEvidenceState 投影）、G-02（六值 vs E1–E4 词汇，Architect Ruling A 已裁决）、G-03（cultural_conflicts 进冲突面）、G-04（evidence_fragments 进 Drawer）、G-05（events/meaning/present 绑定）、G-06（U10 与脚本分叉单一真源对齐）。

**AT-01~AT-14 全部满足**（见本文件各处落点；§14 含合规速查表）。无未通过项、无 Blocker、无架构/计划 Reconciliation 需求。

---

## 02 · Sources / Context Gate

**实际读取路径（均为只读）：**
| 类别 | 文件 / 对象 | 用途 |
|---|---|---|
| L1 | `governance/...V4.9_三层计划治理与Phase-II-M3同步版.docx` | Architecture Roadmap；确认 Phase II/M3 CURRENT、EXP-CULTURAL-02 = M3.3 DESIGN-CONTRACT |
| L2 | `governance/...PHASE-II_Canonical-Experience-Productization_Execution-Plan_V1.0.docx` | M3 执行计划；M3.3 = DESIGN-CONTRACT |
| L3 前置 | `tasks/results/EXP-CULTURAL-01-result.md`（PASS / CLOSED） | Gap Register G-01~G-06 强制输入 |
| CW-02 | `tasks/results/CULTURAL-WORLD-02-result.md` + `cw02-cluster-snapshot.json` | 第一簇 9 events / 8 claims / 2 meanings / 2 presents / 16 fragments / 1 conflict / 1 relations 行（全部 ID 与六值已核实） |
| 冻结契约 | `specs/EXPERIENCE_CONTRACT.md` + `packages/experience-engine/src/surface-eligibility.ts`（`WorldEvidenceState`/`RelationEvidence` 精确形状） + `apps/web/app/experience/jinze-water-net/surfaces/types.ts`（`SliceShape`） | ExperienceState / CompositionState / ExperienceAction V0.1 / Surface eligibility / WorldEvidenceState 字段契约 |
| 体验遗产 | `apps/web/data/experience/jinze-3min-experience-script.json`（s01–s08）+ `beats.ts` | 五 Beat 表演编排与叙事单元（frozen reference） |
| 代码实证 | Grep 全仓 `*.{ts,tsx,mjs,js}`：`cultural_*` 仅现于 seed/verify；`WorldEvidenceState.relationEvidence[].epistemicClass` 为 E1–E4；`conflicts: {ruling,topic}[]` 当前仅 T11-C1/C2 | 确认 008 表未进入体验运行时、六值与 E1–E4 并存于不同层 |

**Context Gate 结果：无 BLOCKER。** L1（V4.9）/ L2（Phase II Plan）/ repo CURRENT（`CURRENT_TASK.md`→EXP-CULTURAL-02、`CONTEXT.md`→Phase II）三方一致，未触发 STOP。扫描未发现「需 Architect 裁决的版本矛盾」。

**硬边界合规声明（全部满足）：** 未修改代码/DB/migration/seed/schema/UI/Figma/GIS/Agent Runtime；未联网补资料；未新建 Evidence；未提升任何 claim 的 epistemic status；未把 Meaning/Present 反向当 Fact；六值 `epistemic_status` 与 E1–E4 `epistemicClass` 作为**正交双轴**共存，未建六值→E1–E4 压缩主契约（Architect Ruling A）；008 成为 World semantic source，但 Experience Composition 未被数据库化（Architect Ruling B）；未宣布 `jinze-3min-experience-script.json` 退役；未引入第二 Cultural Relation Cluster / 第二古镇 / 批量迁移 / Data Factory。

---

## 03 · Experience Projection Contract V0.1

> 投影是**契约层/运行时视图**，不是新的知识真源（AT-01：不复制 World 真源）。World 真源仍为 008 `cultural_*` 六表；投影只读派生，可被任意 reader 重建。

### 3.1 Projection Object Model（7 类 World Object）

| # | World Object | source identity（008 表 / 字段） | projection eligibility | epistemic payload | evidence/conflict payload | temporal/spatial scope | expression policy | action eligibility | meaning/present boundary | provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Entity** | `cultural_present_connections.subject_feature_key` + `current_sources` | 始终可投影为 current anchor | 现代坐标 `KNOWN`（非历史证明） | `currentCoordsLoseHistoricalAuthority` | 当前 POI / 现代坐标 | 只作「今天在哪」，不承载历史事实 | FOCUS_PLACE / PROPOSE_ROUTE（仅 current） | 不入 Meaning/Present 事实层 | `current_sources` + `present_id` |
| 2 | **Event** | `cultural_events`（9 行） | 投影为时间变化 payload | 六值（本簇全 SUPPORTED_CANDIDATE） | `evidence_fragment_ids` | `time_scope_start/end` | attributed 限定必带 | SET_TIME / SHOW_HISTORICAL_LAYER | 不反向进 Meaning 事实 | `event_id` + fragment |
| 3 | **RelationClaim** | `cultural_relation_claims`（8 行） | 投影为关系 payload | 六值（本簇全 SUPPORTED_CANDIDATE）+ **正交** `epistemicClass`(E1–E4) | `evidence_fragment_ids` + `hr_constraint` | feature_key 对 | attributed；CONFLICTED 不静默择一 | SELECT_DISCOVERY / SHOW_HISTORICAL_LAYER | 可经 `derived_from_claim_ids` 支撑 Meaning | `claim_id` + legacy `existing_relation_id` |
| 4 | **Conflict** | `cultural_conflicts`（1 行 `5720eb77`） | 投影为显式 conflict payload | 双向：primary SUPPORTED_CANDIDATE + conflicted CONFLICTED | `primary_claim_id` / `conflicted_variant_id` | 同 subject 的年代值 | **显式暴露双值**，不静默择一 | OPEN_EVIDENCE（双栏）/ SELECT_DISCOVERY | 不进 Meaning 事实 | `conflict_id` + 双 claim |
| 5 | **EvidenceFragment** | `evidence_fragments`（16 行） | 投影为 fragment 级闸门 | `span_type`(hr4_usable/u10_forbidden/generic) | `usable_for_claim` / `usage_note` | 同一 evidence 内片段 | hr4_usable 可正向；u10_forbidden **禁正向**；generic 受 claim 约束 | OPEN_EVIDENCE（按 fragment 过滤） | 不进 Meaning/Present 事实 | `fragment_id` + `evidence_id` |
| 6 | **MeaningCandidate** | `cultural_meaning_candidates`（2 行） | `epistemic_status` 取六值（本簇 derived from SUPPORTED_CANDIDATE claims → 实际 seed = `SUPPORTED_CANDIDATE`）；INTERPRETIVE 为 `expression_rule` 强制的**解释层 tone**（非 status） | SUPPORTED_CANDIDATE（FACT 由 basis claims 支撑，但解释本身非史料原文） | `derived_from_claim_ids` | subject feature | **解释层 tone 不得升 Fact**；`epistemic_status` 仍受六值约束 | PATCH_NARRATIVE（interpretive tone only） | 本身即 Meaning，不入 Fact | `meaning_id` + 2 claims |
| 7 | **PresentConnection** | `cultural_present_connections`（2 行） | 投影为当下连接 + open boundary | SUPPORTED_CANDIDATE（重建）+ OPEN_QUESTION（U10） | `basis_claim_ids` + `open_questions` | subject + 今址 | 重建可述；open_questions **不事实化** | FOCUS_PLACE(present) / SET_TIME(active="present") / SET_COMPOSITION(current_map) | open_questions 仅作边界，不入 Fact | `present_id` + claim |

### 3.2 六值与 E1–E4 的双轴共存原则（Architect Ruling A 落地）

- **轴 A — Claim-level 认识论真值（`epistemic_status`，六值）**：来自 008 表，是表达的**权威语义**，由 migration 008 CHECK 与 ADR-002 强制枚举 = `{SUPPORTED, SUPPORTED_CANDIDATE, CONFLICTED, RESEARCH_LEAD, UNSUPPORTED, OPEN_QUESTION}`。投影必须原样携带，禁止压缩进 E1–E4。（注：EXP-CULTURAL-02 Task Book §2/§4 误将 `INTERPRETIVE` 列为第六值；该表述与 ADR-002/DB 不一致。本 Result 以 ADR-002 + migration 008 CHECK 为权威 SOT，**不**宣布 Task Book 覆盖 ADR。）
- **轴 B — Evidence 形态学（`epistemicClass`，E1–E4）**：来自 legacy `historical_spatial_relations` / `SliceShape.relations[].epistemic_class`，描述「这条关系靠什么形态的证据支撑」（E1 文献关系 / E2 仅当前共址 / E3 相对方位 / E4 其他）。它是**正交兼容属性**，仅用于 Surface eligibility 与 legacy 链路兼容。
- **投影契约**：`RelationEvidence` 在 M4 新增最小共字段 `epistemicStatus: SixValue`（承载轴 A），保留既有 `epistemicClass: E1–E4`（轴 B）。两者分别回答「这个 claim 的认识论真相是什么」与「它的证据形态是哪一类」，互不替代、互不压缩。

---

## 04 · Epistemic Expression Policy Matrix

> 六个 `epistemic_status` 值（ADR-002 / migration 008 CHECK 权威枚举：SUPPORTED, SUPPORTED_CANDIDATE, CONFLICTED, RESEARCH_LEAD, UNSUPPORTED, OPEN_QUESTION）的体验行为边界（AT-02 / AT-03）。✅=允许 ⚠️=有条件 ❌=禁止。

| 六值 | 正向断言 | 必带归属/限定 | 证据须同步可达 | 冲突/不确定须可见 | 可触发关系发现 | 可进入 Meaning | 可触发 Present | 可作 Primary Focus |
|---|---|---|---|---|---|---|---|---|
| **SUPPORTED** | ✅ | ✅（来源引注） | ✅ | n/a（若无冲突） | ✅ | ✅（作 basis） | ✅ | ✅ |
| **SUPPORTED_CANDIDATE** | ⚠️（须带「据方志记载/据…转引」限定） | ✅（`must_keep_qualifier`） | ✅（至少 candidate） | ⚠️（标为 attributed，非定论） | ✅ | ✅（作 basis） | ✅（如 1992 重建） | ✅（带限定） |
| **CONFLICTED** | ❌（不得作为定论事实） | ✅（双方案引注） | ✅（双方） | ✅（**必须显式双值**） | ✅（冲突本身是发现） | ⚠️（仅作为未决解释，绝不替其定论） | ⚠️（仅作未决 present） | ❌（不作「已定论」焦点） |
| **RESEARCH_LEAD** | ⚠️（推断/语源推测，无文献直载；仅作研究线索） | ✅（须明示「推断/未核验」） | ❌（本就无文献直证） | ✅（标为线索非定论） | ⚠️（可作探索线索） | ❌（不进 Meaning 事实） | ❌（不进 Present 事实） | ❌（不作事实焦点） |
| **OPEN_QUESTION** | ❌（仅作问题/缺证据边界） | n/a（即「无证据」） | ❌（本就无，正是其定义） | ✅（**它即不确定性本身**） | ⚠️（作为待解问题） | ❌ | ⚠️（仅作 open present 边界，如 U10） | ⚠️（作「开放问题」焦点） |
| **UNSUPPORTED** | ❌（不得正向事实输出） | n/a | ❌ | 如需出现仅作「已考量但不成立」 | ❌ | ❌ | ❌ | ❌ |

**硬规则（写进契约）：** ① UNSUPPORTED 不得正向事实输出；② OPEN_QUESTION 只能作为问题/缺证据边界；③ MeaningCandidate 的 INTERPRETIVE **tone** 不得反向升级为 Fact（其 `epistemic_status` 仍为六值之一，本簇 = SUPPORTED_CANDIDATE）；④ CONFLICTED 不得静默选择一方；⑤ `epistemic_status` 六值以 ADR-002 / migration 008 CHECK 为唯一权威，INTERPRETIVE 仅作 expression tone，不得写入 status 列。

> **INTERPRETIVE 非枚举值说明**：`INTERPRETIVE` 不是 `epistemic_status` 的六值之一，而是 `cultural_meaning_candidates.expression_rule` 强制的**解释层 tone**（migration 008 注释「强制 INTERPRETIVE tone」；seed 脚本对 meaning 写 `epistemic_status='SUPPORTED_CANDIDATE'` + `expression_rule` 内含 interpretive 语义）。投影时 `INTERPRETIVE` 作为正交属性 `tone: "INTERPRETIVE"` 携带，**绝不**冒充第六个 epistemic status；MeaningCandidate 的 `epistemic_status` 仍受六值约束（本簇 = SUPPORTED_CANDIDATE）。

---

## 05 · World → WorldEvidenceState / ExperienceState Field Mapping

> 基于 `packages/experience-engine/src/surface-eligibility.ts` 的精确 `WorldEvidenceState` 形状（§前文已读）。处置列：REUSE / CALIBRATE / 新增最小字段（M4 实施，本任务仅设契约）。（闭合 G-01/G-02/G-03/G-04/G-05/G-06）

| 008 来源 | 投影目标（`WorldEvidenceState` 字段） | 处置 | 说明 / 闭合 Gap |
|---|---|---|---|
| `cultural_present_connections.today_location` (`54a091a0`) + `current_sources` | `currentExactEntities: string[]` | **REUSE** | 现代坐标锚点；保持 `currentCoordsLoseHistoricalAuthority`（Entity §1） |
| `cultural_relation_claims`（8 行） | `relationEvidence: RelationEvidence[]` | **CALIBRATE + 新增共字段** | 现有 `epistemicClass`(E1–E4) 保留为轴 B；**M4 新增 `epistemicStatus: SixValue`** 承载轴 A（六值）。闭合 **G-02** |
| `cultural_relation_claims` 非空 | `hasHistoricalRelations: boolean` | **REUSE** | 第一簇 8 claim → true |
| `cultural_events`（9 行） | **新增** `culturalEvents: {event_id,label,time_scope,epistemic_status,evidence_fragment_ids}[]` | **新增最小字段** | 替代 `SliceShape.changes` 硬编码（G-05）；闭合 **G-05** |
| `cultural_events` 非空 | `hasEvidencedChanges: boolean` | **REUSE** | 时间变化链存在 → true |
| `cultural_conflicts` (`5720eb77`) | `conflicts: {ruling,topic}[]` | **CALIBRATE** | 当前仅 T11-C1/C2；**M4 追加 008 冲突**（`{ruling:"preserved_open", topic:"pujiqiao-build-year-1265-1267"}`）。闭合 **G-03 / AT-04** |
| `evidence_fragments`（16 行） | **新增** `evidenceFragmentGates: {fragment_id,span_type,usable_for_claim,usage_note}[]` | **新增最小字段** | 喂入 OPEN_EVIDENCE Drawer，按 fragment 过滤；u10_forbidden 禁正向（G-04 / AT-05）。闭合 **G-04** |
| `cultural_meaning_candidates`（2 行） | **新增** `meaningCandidates: {meaning_id,subject,interpretive_text,derived_from_claim_ids,epistemic_status:SixValue,tone:"INTERPRETIVE"}[]` | **新增最小字段** | `epistemic_status` 取六值（本簇 SUPPORTED_CANDIDATE），`tone` 由 `expression_rule` 派生为 INTERPRETIVE（解释层，非 status）；禁升 Fact（G-05 / AT-06）。闭合 **G-05** |
| `cultural_present_connections`（2 行） | **新增** `presentConnections: {present_id,type,observed_state,basis_claim_ids,open_questions}[]` | **新增最小字段** | 1992 重建 SUPPORTED_CANDIDATE + U10 OPEN_QUESTION（G-05 / AT-07）。闭合 **G-05** |
| `cultural_present_connections.open_questions` (U10) | `presentConnections[].open_questions` 为**唯一真源** | **CALIBRATE（单一真源）** | M4 对齐脚本 s06-u4（原 FACT_LIMITED 文本）到此字段，消除 World/脚本分叉（G-06）。闭合 **G-06** |
| `hasHistoricalGeometry` / `historicalMapSource` / `currentPhotosConfirmed` / `historicalVisualAssets` | 同名字段 | **REUSE（不变）** | 本切片几何恒 false / 视觉资产 0，无变化 |

**字段级不变量（进 M4 验收）：** ① 六值 `epistemic_status` 全程不降级为 E1–E4；② `conflicts[]` 含 008 的 `preserved_open` 项；③ `evidenceFragmentGates` 含 `u10_forbidden` 且 OPEN_EVIDENCE 不得向其输出正向事实；④ `meaningCandidates` 全部 `epistemic_status ∈ 六值`（本簇 SUPPORTED_CANDIDATE）且 `tone='INTERPRETIVE'`（来自 expression_rule）且 `derived_from_claim_ids` 非空；⑤ `presentConnections[].open_questions` 含 U10 且未进任何事实层。

---

## 06 · Action Eligibility Matrix

> 现有 `ExperienceAction` V0.1（FOCUS_PLACE / SET_TIME / SHOW_HISTORICAL_LAYER / SELECT_DISCOVERY / OPEN_EVIDENCE / SET_VISUAL_MODE / SET_COMPOSITION / PATCH_NARRATIVE / PROPOSE_ROUTE / REPLAN）。判定：**全部 REUSE，无新 Action 需求**（AT-10）。

| Action | World Projection 授权 / 限制 | 防事实越界护栏 | 处置 |
|---|---|---|---|
| FOCUS_PLACE(placeId) | Entity/feature 有 current/approx anchor 即可 | 若焦点是 INTERPRETIVE Meaning → 仅作解释呈现；OPEN_QUESTION present → 仅显 open boundary | REUSE |
| SET_TIME(active) | 由 `culturalEvents` 时间窗驱动 | 不补连续历史；未知年份保持未知 | REUSE |
| SHOW_HISTORICAL_LAYER | 由 `relationEvidence` + `hasHistoricalRelations` 驱动 | CONFLICTED claim 显式双值，不静默择一 | REUSE |
| SELECT_DISCOVERY | 由投影（关系/冲突/意义）生成发现项 | 不把 INTERPRETIVE 当发现事实 | REUSE |
| OPEN_EVIDENCE | 由 `evidenceFragmentGates` 驱动 Drawer | **hr4_usable 可显、u10_forbidden 禁正向、generic 受 claim 约束** | REUSE + CALIBRATE（接 fragments） |
| SET_VISUAL_MODE | 视觉强度切换 | 无变化 | REUSE |
| SET_COMPOSITION | 调 `CompositionState` | World/Experience 职责边界（§07） | REUSE |
| PATCH_NARRATIVE | Patch-not-Replace | 不升 INTERPRETIVE→Fact、不静默解 CONFLICTED、不事实化 OPEN_QUESTION | REUSE |
| PROPOSE_ROUTE | 仅 current entities（today_location） | 不把 OPEN_QUESTION 当已定论导航事实 | REUSE |
| REPLAN | 证据感知 replan | 保持 epistemic 诚实，E2 不升 E1 | REUSE |

**结论：** Evidence 不足 / Conflict / Open Question / INTERPRETIVE tone Meaning 都不会因 Action 执行而被「表演成事实」。无 blocker，因此不提出任何新 Action（AT-10）。

> **层位澄清（FIX-02）**：本表仅列 Canonical `ExperienceAction` V0.1（index.ts:24-34 的 10 项）。`RETURN_TO_PRESENT` **不在**该枚举内——它定义于 `experience-runtime.ts` 的 `ExperienceRuntimeAction`（仅切换 `replanViewActive`，属 replan 视角出口）与 `composition-recipes.ts` 的 `CompositionRecipe`（surface 编排配方）。Beat 5「回到今天」由 `SET_TIME(active="present")` + `SET_COMPOSITION(current_map)` + `FOCUS_PLACE(present)` + `PATCH_NARRATIVE` 完整表达，无需、也不应将 `RETURN_TO_PRESENT` 列为 ExperienceAction。

---

## 07 · Composition Boundary Matrix

> World semantic source 与 Experience Composition 职责分离（Architect Ruling B / AT-09）。五 Beat 各自指明：**必须来自 World Projection / Agent Judgment / CompositionState / Surface·Renderer**。保留五原则：One Moment One Focus、Show→Question→Reveal、Space Before Text、Evidence on Demand、Agent Changes the World。

| Beat | 必须来自 World Projection | Agent Judgment | CompositionState | Surface / Renderer |
|---|---|---|---|---|
| **1 进入当下** | `today_location` + `currentExactEntities` | 「为何三处离得近」的提问框架 | modern_map 主 + current_photo 次 | modern_map / current_photo / text_focus |
| **2 时空变化** | `cultural_events`（1260/1267…）+ `former_site_of` claim | 时间跃迁节奏、何时退坐标 | timeline 主 + modern_map 次 | timeline / modern_map |
| **3 关系发现** | `relation_claims`（spans_waterway / 姐妹桥 / named_after / former_site_of）+ `meaning_candidates`(a1fa6d8b) | 「把寺放进来」的引导 | relational_space 主 + evidence_panel 次 | relational_space / timeline / evidence_panel |
| **4 证据改变理解** | `cultural_conflicts`(1265/1267) + `evidence_fragments`(hr4_usable/u10_forbidden) + events(1938/1992) + meaning(d8663e7f) | 「为何不能确定」的解释 | evidence_panel / conflict_compare 主 | evidence_panel / conflict_compare / timeline / text_focus |
| **5 回到今天** | `present_connections`(site_vs_rebuilt + today_location) + `open_questions`(U10) + meaning(a1fa6d8b) 框架 | 自然产生 Next Question | current_map 主 + discovery 次 | current_map / current_photo / discovery / text_focus |

**边界铁律：** World 决定「什么是真的、什么关系、证据与边界」；Experience 决定「此刻让用户看见什么、以什么节奏与 Surface 组合」。CompositionState / `jinze-3min-experience-script.json` 是**体验编排**，不被数据库化为事实真源（AT-09）。

---

## 08 · Legacy / Script Compatibility Classification

> 仅分类，不退役 / 不删除 / 不迁移（AT-11）。

| 资产 | 分类 | 理由 |
|---|---|---|
| `historical_spatial_relations`（legacy 表，E1–E4 `epistemic_class`） | **KEEP_AS_IS** | 仍是空间/历史 grounding 权威层；E1–E4 形态学继续作为正交轴 B |
| `SliceShape.relations[].epistemic_class`（E1–E4） | **COMPATIBILITY_ONLY** | 被 `buildWorldEvidenceState` 消费为 `RelationEvidence.epistemicClass`；仅作兼容形态轴，不承担六值真值 |
| `jinze-3min-experience-script.json`（s01–s08 硬编码叙事） | **HERITAGE_REFERENCE** | 冻结体验/视觉基线；Ruling B 明确不得宣布退役；M4 改由 World Projection 供叙事，脚本留作参考 |
| `beats.ts`（五 Beat 编排） | **HERITAGE_REFERENCE** | 冻结 Beat 语法结构，作为契约级 walkthrough 骨架复用 |
| `SliceShape.changes`（硬编码事件变化） | **FUTURE_REPLACEABLE** | M4 将由 `culturalEvents` 投影填充，脚本+SliceShape 在 M4 前仍是运行时源 |
| 脚本 `evidence_refs` 字符串（vs `evidence_fragments`） | **FUTURE_REPLACEABLE** | M4 由 `evidenceFragmentGates` 替代片段级闸门 |
| 008 `cultural_*` 六表 | **KEEP_AS_IS** | 即新的 World semantic source（非 legacy） |

---

## 09 · Five-Beat Contract Walkthrough

> 用 CW-02 第一簇做契约级走查；每 Beat 展示：World Object → Projection → Epistemic/Expression → ExperienceState change → Action → Composition → Surface → 用户认知变化。覆盖 1265/1267 · hr4_usable · u10_forbidden · 1938/1992 · MeaningCandidate · PresentConnection（AT-08）。

**Beat 1 · 进入当下**
- World Object：`yihaosi-site` / `wananqiao` / `pujiqiao`（POI）+ Present `today_location`(`54a091a0`)。
- Projection：`currentExactEntities` ← today_location；`epistemic = KNOWN`（现代坐标，非历史证明）。
- Epistemic/Expression：仅 GEOGRAPHIC_EXACT 现代坐标；标注「当前坐标仅为现代 POI」。
- ExperienceState change：map.focusId = 三处高亮；uncertainty「非历史位置」。
- Action：`FOCUS_PLACE` 三处。
- Composition：modern_map 主 + current_photo 次。
- Surface：modern_map / current_photo / text_focus。
- **用户认知变化**：从「地图上的三个孤立点」→「今天可感知的现场」；提问「为何离这么近」。

**Beat 2 · 时空变化**
- World Object：Event `颐浩寺创建`(`7fb4e9d4`,1260) / `普济桥建`(`1232f6e9`,1267) SUPPORTED_CANDIDATE；RelationClaim `former_site_of`(`32752c92`)。
- Projection：`culturalEvents` 时间窗；`relationEvidence` 带 `epistemicStatus:SUPPORTED_CANDIDATE` + `epistemicClass:E1`。
- Epistemic/Expression：带「据方志记载」限定（SUPPORTED_CANDIDATE 硬规则）。
- ExperienceState change：time.active = 南宋；坐标淡出 → RELATIONAL_HISTORICAL。
- Action：`SET_TIME` + `SHOW_HISTORICAL_LAYER`。
- Composition：timeline 主。
- Surface：timeline / modern_map。
- **用户认知变化**：现代坐标权威退场，进入南宋时间窗。

**Beat 3 · 关系/变化发现**
- World Object：RelationClaim `spans_waterway`(`2f8e2ab8`/`187c1291`) / `spans_same_waterway`(姐妹桥) / `named_after`(`406ba707`,HR-4) / `former_site_of`(`32752c92`)；MeaningCandidate `a1fa6d8b`（寺以吕颐浩故宅为基、以其人命名，derived `32752c92`+`406ba707`）。
- Projection：`relationEvidence[]`（E1/E3/HR-4）；`meaningCandidates[]` 的 `epistemic_status=SUPPORTED_CANDIDATE` + `tone=INTERPRETIVE`（解释层，非 status）。
- Epistemic/Expression：E1=SUPPORTED_CANDIDATE（attributed）；HR-4 走 `hr4_usable` fragment 放行；Meaning 标「解释层非史料原文」，禁升 Fact。
- ExperienceState change：relational_space 拓扑呈现桥—水—桥—寺；Meaning 作解释透镜。
- Action：`SELECT_DISCOVERY` + `SHOW_HISTORICAL_LAYER`。
- Composition：relational_space 主 + evidence_panel 次。
- Surface：relational_space / timeline / evidence_panel。
- **用户认知变化**：看到桥—水—桥，再让寺以「人—寺」关系进入；理解「寺与人的绑定」是可感线索。

**Beat 4 · 证据改变理解**（关键诚实 Beat）
- World Object：
  - Conflict `5720eb77`：普济桥建年 1265(`f741022b` CONFLICTED) vs 1267(`1232f6e9` SUPPORTED_CANDIDATE)，`preserved_open`。
  - EvidenceFragment `hr4_usable`(`0174c9d3`/`1961f62f`) 放行寺址/寺名；`u10_forbidden`(`9a7ed63b`) 禁用「1992 开放」。
  - Event `1938 毁`(`44ae4956`) / `1992 重建`(`1de2d196`) SUPPORTED_CANDIDATE。
  - MeaningCandidate `d8663e7f`（姐妹桥意义；`epistemic_status=SUPPORTED_CANDIDATE`，`tone=INTERPRETIVE` 解释层）。
- Projection：`conflicts[]` 追加 `{ruling:"preserved_open", topic:"pujiqiao-build-year-1265-1267"}`；`evidenceFragmentGates[]` 含 hr4_usable/u10_forbidden/generic；`culturalEvents` 含 1938/1992。
- Epistemic/Expression：**CONFLICTED 显式双值不静默择一**（AT-04）；u10_forbidden **禁正向输出**（AT-05）；1938/1992 attributed 限定（AT-03）；Meaning 解释层（AT-06）。
- ExperienceState change：evidence_panel 三栏 known/conflicting/unknown；conflict_compare 双值并置；OPEN_EVIDENCE 按 fragment 过滤。
- Action：`OPEN_EVIDENCE`（双栏 + fragment 闸门）+ `SELECT_DISCOVERY`。
- Composition：evidence_panel / conflict_compare 主。
- Surface：evidence_panel / conflict_compare / timeline / text_focus。
- **用户认知变化**：知道哪些成立、哪些冲突、哪些未知——冲突与未知本身成为理解的一部分。

**Beat 5 · 回到今天**
- World Object：Present `site_vs_rebuilt`(`bfd045a0`：遗址—复建并置，含 `open_question` U10「1992 开放为宗教活动场所」) + `today_location`(`54a091a0`)；支撑 Event `1992 重建`(`1de2d196`)；Meaning `a1fa6d8b` 作回看框架。
- Projection：`presentConnections[]` 含 observed_state + `open_questions:[U10]`；`culturalEvents` 含 1992 重建。
- Epistemic/Expression：重建 SUPPORTED_CANDIDATE（attributed）；**U10 仅 OPEN_QUESTION，不事实化**（AT-07）；`presentConnections.open_questions` 为唯一真源（G-06 闭合）。
- ExperienceState change：current_map 聚焦今址；discovery 提 Next Question。
- Action：`FOCUS_PLACE`(present) + `SET_TIME`(active="present") + `SET_COMPOSITION`(current_map 主) + `PATCH_NARRATIVE`(present 框架) + `PROPOSE_ROUTE`（仅 current）。（注：`RETURN_TO_PRESENT` 非 ExperienceAction V0.1 枚举，仅为 runtime replan-exit 开关 / CompositionRecipe，不在此列；Beat 5「回到今天」由上述标准 Action + ExperienceState/CompositionState 转换表达。）
- Composition：current_map 主 + discovery 次。
- Surface：current_map / current_photo / discovery / text_focus。
- **用户认知变化**：带着「寺址即南宋宰相故宅→1938 被毁→1992 原址重建并置→建年仍有 1265/1267 分歧→寺桥功能关联仍无证据」的结构化理解重新看今天，自然产生「它们以前真有关系吗」的追问（非 UI 强推）。

---

## 10 · Gap Closure Matrix（G-01~G-06）

| gap_id | 类型 / Beat | 强制输入问题 | 本契约闭合方式 | 闭合判定 |
|---|---|---|---|---|
| **G-01** | COMPOSITION/RUNTIME · 全 5 Beat | 008 表无运行时读取路径，体验只读 legacy+脚本 | §03/§05 定义 `projectCulturalWorldState(sliceId)` 投影契约（008→WorldEvidenceState 共字段），M4 实施 reader | **CLOSED_BY_CONTRACT** |
| **G-02** | VOCAB · 3/4 | 六值 vs E1–E4 词汇分歧 | §03.2 双轴正交集（轴 A 六值=`epistemicStatus` 新共字段；轴 B E1–E4=`epistemicClass` 保留兼容）；Architect Ruling A 落地 | **CLOSED_BY_CONTRACT** |
| **G-03** | EVIDENCE · 4 | `cultural_conflicts`(1265/1267) 未进体验冲突面 | §05 映射 `conflicts[]` 追加 008 `preserved_open`；§09 Beat4 显式双值 | **CLOSED_BY_CONTRACT**（AT-04） |
| **G-04** | EVIDENCE · 4 | `evidence_fragments` fragment 级闸门未进 Drawer | §05 新增 `evidenceFragmentGates[]`；§06 OPEN_EVIDENCE 按 fragment 过滤（u10_forbidden 禁正向） | **CLOSED_BY_CONTRACT**（AT-05） |
| **G-05** | COMPOSITION/DATA · 2/3/5 | events/meaning/present 未绑定 ExperienceState | §05 新增 `culturalEvents` / `meaningCandidates` / `presentConnections` 三共字段；§09 Beat2/3/5 走查 | **CLOSED_BY_CONTRACT**（AT-06/07） |
| **G-06** | DATA · 5 | U10 与脚本 s06-u4 分叉 | §05 指定 `presentConnections.open_questions` 为唯一真源；M4 对齐脚本 | **CLOSED_BY_CONTRACT** |

全部 **CLOSED_BY_CONTRACT**，无 BLOCKED、无 DEFER_TO_M4（契约本身已闭合；M4 负责落地实现）。

---

## 11 · Proposed M4 Implementation Slice

> 仅定义最小施工边界，不施工（AT-13）。**最小 vertical slice = 单簇（jinze-min-001）接通 008→WorldEvidenceState 投影**，不扩第二簇 / 第二古镇 / 批量迁移。

- **M4-S1 · Projection Reader**：新增 `projectCulturalWorldState(sliceId)`，只读 008 `cultural_*` 派生 `WorldEvidenceState`（含 §05 五个新增最小共字段 + `relationEvidence[].epistemicStatus`）。幂等、可重跑。
- **M4-S2 · Evidence Drawer 接通**：`OPEN_EVIDENCE` 由 `evidenceFragmentGates` 驱动；hr4_usable 可显、u10_forbidden 禁正向、generic 受 claim 约束。
- **M4-S3 · Conflict 面接通**：`conflict_compare` 由 `conflicts[]` 的 008 `preserved_open` 项驱动（1265/1267 双值并置）。
- **M4-S4 · 单一真源对齐**：脚本 s06-u4（U10 FACT_LIMITED 文本）改为读取 `presentConnections.open_questions`，消除 World/脚本分叉。
- **M4-S5 · 验收不变量**：§05 五条字段级不变量进单测；复用现有 Surface/Action/Patch，无新 UI/Runtime/GIS。

**不施工项（明确排除）：** 第二 Cultural Relation Cluster、第二古镇、批量迁移、Data Factory、UI/Figma 新建、GIS 扩张、Runtime 重写、schema/migration/seed 变更（008 已 seed）。

---

## 12 · ARCHITECTURE_RECONCILIATION = NONE

无需修改 V4.9 核心架构。六值认识论模型、Fact–Interpretation Firewall、ExperienceState/CompositionState/Patch-not-Replace 等冻结契约均成立。本契约仅向 `WorldEvidenceState` 追加**最小正交共字段**（不新建平行真源、不改动六值语义），属 M3.3 契约层设计，不触发架构层 Reconciliation。

## 13 · PLAN_RECONCILIATION = NONE

Phase II Plan V1.0 已明确 M3.1+M3.2 → M3.3(DESIGN-CONTRACT) → M3.4(M3 Architect Review) → M4(Construction) 的滚动顺序。本契约结论（投影契约可设计、G-01~G-06 可闭合）完全落在计划内，不改变 CURRENT/NEXT 或 Exit Condition。

## 14 · Gate Recommendation

**建议（修正后）：`PASS_TO_M4`（契约层已 SOT 对齐；M4 是否启动由 Architect 另行授权，本轮 Architect 已声明 M4 暂不授权——属治理排期，非契约缺陷）**

理由：
1. **投影契约完整（AT-01/02/03）**：7 类 World Object 全覆盖且不复制真源；六值语义（ADR-002 / migration 008 CHECK 权威枚举：SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION）完整保留、与 E1–E4 正交共存（Architect Ruling A）；INTERPRETIVE 作为正交 expression tone 处理、不冒充第六 status；各值边界明确可执行。
2. **诚实边界成立（AT-04/05/06/07）**：1265/1267 进显式 conflict payload 不静默择一；evidence_fragments 支持 fragment 级 allow/forbid，u10_forbidden 不正向；MeaningCandidate 以 INTERPRETIVE tone 表达、其 `epistemic_status` 受六值约束、禁升 Fact；PresentConnection/open_questions 不事实化。
3. **全链可走通（AT-08）**：Five-Beat walkthrough 每步指明用户认知变化，覆盖全部指定对象。
4. **职责分离（AT-09）**：World semantic source 与 Experience Composition 不合并；体验编排未被数据库化。
5. **能力可复用（AT-10/11）**：现有 Surface/Action/Patch 全 REUSE，无新 UI/Runtime/GIS；legacy/script 仅分类不退役。
6. **Gap 闭合（AT-12）**：G-01~G-06 全部 CLOSED_BY_CONTRACT。
7. **M4 边界最小（AT-13）**：提出的 Slice 为单簇最小 vertical slice，不扩范围。

**AT-01~14 合规速查：**
| AT | 落点 | 结果 |
|---|---|---|
| AT-01 | §03.1 七类 Object，不复制真源 | ✅ |
| AT-02 | §03.2 / §04 六值保留，无六→E1–E4 压缩主契约 | ✅ |
| AT-03 | §04 五值边界矩阵 | ✅ |
| AT-04 | §05 / §09 Beat4 1265/1267 显式双值 | ✅ |
| AT-05 | §05 / §09 hr4_usable·u10_forbidden fragment 闸门 | ✅ |
| AT-06 | §03.1 / §04 / §09 MeaningCandidate 以 INTERPRETIVE tone 表达、`epistemic_status` 受六值约束、禁升 Fact | ✅ |
| AT-07 | §05 / §09 PresentConnection·U10 open boundary | ✅ |
| AT-08 | §09 五 Beat 全链 + 认知变化 | ✅ |
| AT-09 | §07 World/Experience 职责分离 | ✅ |
| AT-10 | §06 全 REUSE，无新 UI/Runtime/GIS | ✅ |
| AT-11 | §08 仅分类，不退役/删/迁 | ✅ |
| AT-12 | §10 G-01~G-06 全 CLOSED_BY_CONTRACT | ✅ |
| AT-13 | §11 最小 vertical slice | ✅ |
| AT-14 | 本 Result 写入规定 .md；对话框仅简短摘要 | ✅ |

**Contract Consistency 修正（FIX-01 / FIX-02，Architect Review 指定）：** 原 Result 存在两处与 SOT 不自洽——(FIX-01) Task Book 误以 INTERPRETIVE 替 RESEARCH_LEAD 列为第六 `epistemic_status`，已按 ADR-002 / migration 008 CHECK 校正，INTERPRETIVE 归为 expression tone；(FIX-02) 误将 runtime/composition 层的 `RETURN_TO_PRESENT` 当 ExperienceAction V0.1 使用，已改为以既有标准 Action 表达 Beat 5。两处均已在正文 §03/§04/§05/§06/§09 同步修正，不另起文件。两修正均**不需**修改 ADR/schema/migration/code，故 **ARCHITECTURE_RECONCILIATION = NONE**。详见 §16。

**未通过项：无。Blocker：无。**

## 15 · STOP

**STOP — EXP-CULTURAL-02（M3.3 DESIGN-CONTRACT）完成，仅写入本 Result + 最小治理指针切换，零类型/代码/schema 改动。等待 ChatGPT Architect Review 与 M3.4 签字，不自行开始 M4。**

- 完成项：STEP 1 投影对象模型（7 类）/ STEP 2 六值 Expression Policy 矩阵 / STEP 3 cultural_*→WorldEvidenceState 字段级投影 / STEP 4 Action Eligibility / STEP 5 Composition Boundary / STEP 6 Legacy/Script 分类 / STEP 7 五 Beat 契约级 walkthrough；15 节 Result 全交付。
- 验收：AT-01~AT-14 全部满足（§14 速查表）。
- 不执行：M4 Construction / CW-03 / 第二古镇 / 批量迁移 / Data Factory / GIS 扩张 / Runtime 扩张 / Figma 重设计 / UI 新建 / schema/migration/seed 变更（均不在授权边界）。
- 交付物：本 16 节 Result（`tasks/results/EXP-CULTURAL-02-result.md`）+ 治理指针切换（`CURRENT_TASK.md`→EXP-CULTURAL-02、`CONTEXT.md` 当前/前置任务更新）。

---

## 16 · Architect Review Fix（FIX-01 / FIX-02）

> Architect Review 裁决：EXP-CULTURAL-02 = PARTIAL / MINIMAL_CONTRACT_FIX，M4 暂不授权。不重做、不扩 Scope，仅修正两处 Contract Consistency 问题。本任务（M3.3 DESIGN-CONTRACT）仍零类型/代码/schema 改动，仅更新本 Result。

### FIX-01 ｜ Epistemic Enum SOT
**核查位置**：ADR-002（line 22 六值定义）、V4.9（Roadmap，AD-01 为 SOT 裁决）、migration 008（line 40/68/99 CHECK 约束）、`cultural_meaning_candidates` DDL（line 90/99–100 `expression_rule` 强制 INTERPRETIVE tone）、seed-cw02-cluster.mjs（line 272 meaning 写 `epistemic_status='SUPPORTED_CANDIDATE'`）、EXP-CULTURAL-02 Task Book（§2/§4 误列 INTERPRETIVE 为第六值）。

**四项裁决**：
1. **RESEARCH_LEAD 与 INTERPRETIVE 是否属于同一状态维度？** 否。RESEARCH_LEAD ∈ 六值 `epistemic_status`（claim-level 认识论等级，指「推断/语源推测、无文献直载」，在 DB CHECK 与 ADR-002 中均为合法值）；INTERPRETIVE 是 `cultural_meaning_candidates.expression_rule` 强制的**表达层 tone**（解释层语义），**不在** `epistemic_status` 枚举一列。二者维度不同。
2. **DB 真实允许的 `epistemic_status` 枚举是什么？** `SUPPORTED, SUPPORTED_CANDIDATE, CONFLICTED, RESEARCH_LEAD, UNSUPPORTED, OPEN_QUESTION`（migration 008 CHECK，强制）。
3. **MeaningCandidate 的 INTERPRETIVE 是 claim epistemic status，还是 Meaning/Expression 层语义？** 是 **Meaning/Expression 层语义**（tone）。其 `epistemic_status` 列仍取六值之一（本簇 seed 实际 = `SUPPORTED_CANDIDATE`，由 basis claims 派生），INTERPRETIVE 仅由 `expression_rule` 承载为解释层语气。
4. **M4 唯一可执行的 authoritative contract 应是什么？** 以 ADR-002 + migration 008 CHECK 为权威 SOT：`epistemic_status` 严格用上述六值；INTERPRETIVE 作为正交 `tone` 属性（由 `expression_rule` 派生）进 Experience 层，**绝不**写入 `epistemic_status` 列、绝不冒充第六 status。

**是否需要 ARCHITECTURE_RECONCILIATION？** 否。SOT（ADR-002 + migration 008）自身一致；冲突源是 Task Book 的枚举漂移。按指令「不得自行宣布 Task Book 覆盖 ADR」，本 Result 以 ADR-002 + migration 008 为权威，对齐正文（§03.2/§04/§05/§09/§14），不修改 ADR/schema。建议由 Architect 后续勘正 Task Book §2/§4 的枚举表述（非本任务范围）。

### FIX-02 ｜ RETURN_TO_PRESENT
**核查位置**：`packages/experience-engine/src/index.ts:24-34`（Canonical `ExperienceAction` V0.1 枚举，10 项，无 RETURN_TO_PRESENT）；`experience-runtime.ts:211-219`（`ExperienceRuntimeAction` 含 `RETURN_TO_PRESENT`，仅切换 `replanViewActive`）；`composition-recipes.ts:18/67`（`CompositionRecipe` 含 `RETURN_TO_PRESENT`）；`beats.ts:153`（recipe 引用）。

**裁决**：
- `RETURN_TO_PRESENT` **不属于** ExperienceAction V0.1 枚举；它是 `CompositionRecipe`（surface 编排配方）与 runtime replan 视角出口（关 `replanViewActive`），属不同层位。
- **Beat 5「回到今天」可否由现有 Action + ExperienceState/CompositionState 转换完成？** 可以。`SET_TIME(active="present")` 将时间窗切回当下；`SET_COMPOSITION({primarySurface:"map"})` 恢复 current_map 为主；`FOCUS_PLACE(present anchor)` 聚焦今址；`PATCH_NARRATIVE(present 框架)` 更新叙事。四者组合即完整表达「回到今天」，无需新增 Action。
- **是否需记录 new Action candidate？** 否——现有 Contract 已可表达，故不新增（指令：仅当现有 Contract 确实无法表达才记录 candidate）。

**是否需要 ARCHITECTURE_RECONCILIATION？** 否。现有 ExperienceAction V0.1 + CompositionRecipe + runtime 已能表达 Beat 5；修正仅为文档层位澄清。

### 修正落点（正文已同步，非仅文件尾追加）
- §03.1 表行 6/7：MeaningCandidate 改为「epistemic_status 取六值（本簇 SUPPORTED_CANDIDATE）+ INTERPRETIVE 为 expression tone」；PresentConnection 动作列去除 RETURN_TO_PRESENT，改列 SET_TIME/SET_COMPOSITION。
- §03.2 轴 A：显式列出 ADR-002/migration 008 六值，并标注 Task Book 漂移、以 SOT 为准。
- §04：矩阵 INTERPRETIVE 行替换为 RESEARCH_LEAD 行；增补「INTERPRETIVE 非枚举值」说明；硬规则 ③ 改为「MeaningCandidate 的 INTERPRETIVE tone 不得升 Fact」。
- §05：`meaningCandidates` 投影字段改为 `epistemic_status:SixValue` + `tone:"INTERPRETIVE"`；字段不变量 ④ 同步。
- §06：结论补充层位澄清，指明 RETURN_TO_PRESENT 非 V0.1 枚举。
- §09：Beat 3/4 MeaningCandidate 标注 tone；Beat 5 动作改为 SET_TIME+SET_COMPOSITION+FOCUS_PLACE+PATCH_NARRATIVE，并注明 RETURN_TO_PRESENT 层位。
- §14：AT-02/AT-06 措辞对齐；Gate 理由 ①/② 更新；新增 FIX-01/FIX-02 Consistency 修正说明。
- §15：补充指向本 §16。

**最终 Gate Recommendation：`PASS_TO_M4`（契约层一致性已恢复，满足原 PASS_TO_M4 条件）。** 注：M4 是否启动由 Architect 另行授权（本轮已声明 M4 暂不授权），属治理排期，非契约缺陷。ARCHITECTURE_RECONCILIATION = NONE；PLAN_RECONCILIATION = NONE。

---

### Observation / Candidate（超出范围，仅记录）
- **O-1（六值枚举对齐 · 已据 FIX-01 校正）**：原 O-1 曾误以 Task Book 六值为权威；经 FIX-01 核查，ADR-002（line 22）与 migration 008（CHECK）的权威枚举为 `{SUPPORTED, SUPPORTED_CANDIDATE, CONFLICTED, RESEARCH_LEAD, UNSUPPORTED, OPEN_QUESTION}`，INTERPRETIVE 是 `expression_rule` 的 tone 而非 status。本 Result 现以 ADR-002 + migration 008 为 SOT；建议 Architect 勘正 Task Book §2/§4 的枚举表述（非本任务范围）。
- **O-2（投影 reader 落点）**：建议 M4 将 `projectCulturalWorldState` 置于 `packages/experience-engine` 或既有 `buildWorldEvidenceState` 旁边，作为只读派生层，不污染 008 真源。
