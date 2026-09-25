> ARCHITECT REVIEW = PASS / CLOSED
> GATE DECISION = PASS_TO_M3.3
> 归档时间：2026-09-25（Architect Review 通过后归档；原样归档，未重新分析 / 未改写结论 / 未增加施工内容）

# EXP-CULTURAL-01 · Result
**Living Cultural World → Canonical Experience · Mapping & Gap Audit**
**Track:** E / Experience · Phase II / M3.1 + M3.2 ｜ **Mode:** READ-ONLY · NO UI CONSTRUCTION · NO DATA ACQUISITION
**Repo:** `mohen-agent-2.0` @ `track/world-cultural-world-02`（HEAD `91edbc9`，本任务零改动）
**Task Book：** `tasks/EXP-CULTURAL-01_..._Task-Book_V1.0.docx`

---

## 01 · Executive Verdict

**判定：审计完成（10/10 AT 通过），M3 Gate 建议 = `PASS_TO_M3.3`（带 Gap Register 作为 M3.3 输入）。STOP，等待 Architect Review。**

核心结论：**第一 Living Cultural Relation Cluster（CW-02）能被 Canonical Five-Beat Grammar 完整映射**（5 个 Beat 均可落到真实 World Object，可构造一条从当下→历史关系/变化→证据→回到 Present Connection 的完整 discovery chain）。但存在一个**结构性集成缺口**：CW-02 的 008 表（`cultural_events` / `cultural_relation_claims` / `cultural_meaning_candidates` / `cultural_present_connections` / `cultural_conflicts` / `evidence_fragments`）目前**未被任何 Experience/Runtime 代码消费**——体验仍跑在 legacy `historical_spatial_relations`（E1–E4 词汇）+ 静态脚本 JSON 上。这个缺口正是 **M3.3（World→Experience Contract 设计）的法定职责**，不是阻止进入 M3.3 的前置 blocker，因此建议直接 PASS 到 M3.3，并把下方 Gap Register 作为其必须闭合的输入。

---

## 02 · Sources / Context Gate

**实际读取路径（均为只读）：**
| 类别 | 文件 / 对象 | 用途 |
|---|---|---|
| L1 | `governance/...V4.9_三层计划治理与Phase-II-M3同步版.docx` | Architecture Roadmap；确认 Phase II/M3 CURRENT、EXP-CULTURAL-01 = M3.1+M3.2 READ-ONLY |
| L2 | `governance/...PHASE-II_Canonical-Experience-Productization_Execution-Plan_V1.0.docx` | M3 执行计划；M3.1 映射 / M3.2 Gap Audit；M3.3 = DESIGN-CONTRACT |
| CW-02 真实状态 | `tasks/results/CULTURAL-WORLD-02-result.md` + `cw02-cluster-snapshot.json` | 第一簇 9 events / 8 claims / 2 meanings / 2 presents / 16 fragments / 1 conflict / 1 relations 行（全部 ID 与 epistemic 已核实） |
| Canonical Experience | `apps/web/data/experience/jinze-3min-experience-script.json`（8 场景 s01–s08）+ `apps/web/app/experience/jinze-water-net/beats.ts` | 五 Beat 表演编排与叙事单元 |
| 冻结契约 | `specs/EXPERIENCE_CONTRACT.md` + `surfaces/types.ts`（`SliceShape`/`WorldEvidenceState` 形状） | ExperienceState / CompositionState / Evidence / Patch-not-Replace / Fact–Interpretation Firewall |
| 代码实证 | Grep 全仓 `*.{ts,tsx,mjs,js}`：`cultural_*` 表仅出现于 seed/verify 脚本；`SliceShape.relations[].epistemic_class` 为 E1–E4 词汇 | 确认 008 表未进入体验运行时 |

**Context Gate 结果：无 BLOCKER。** L1（V4.9）/ L2（Phase II Plan）/ repo CURRENT（`CURRENT_TASK.md`→EXP-CULTURAL-01、`CONTEXT.md`→Phase II）三方一致，无实质冲突，未触发 STOP。扫描未发现「需 Architect 裁决的版本矛盾」。

**硬边界合规声明（全部满足，无违反）：** 未修改代码/DB/migration/seed/schema/UI/Figma/GIS/Agent Runtime；未联网补资料；未新建 Evidence；未提升任何 claim 的 epistemic status（仍全为 SUPPORTED_CANDIDATE / CONFLICTED）；未把 Meaning/Present 反向当 Fact；未把 near/located_in/same-name 推导为历史/宗教/因果；未把 1861/1884 镇级事件传播到颐浩寺；1265/1267 冲突在 008 表结构化保留（`cultural_conflicts` `5720eb77` `preserved_open`）；U10「1992 开放为宗教活动场所」仅作 `open_question` 不进事实层；未生成 AI 历史图；未提出 CW-03/批量迁移/Data Factory。**未引入第二 Cultural Relation Cluster。**

---

## 03 · Five-Beat × World Object Mapping

> 映射从 CW-02 真实对象出发（ID 取自 `CULTURAL-WORLD-02-result.md §4`），并标注每个 Beat 的「缺失/薄弱元素」。

**Beat 1 · 进入当下（Enter Present）**
- 用户认知变化：从「地图上的三个点」→「今天可感知的现场」。
- 入口问题：「为什么万安桥、普济桥、颐浩寺遗址离得这么近？」
- World Objects：`yihaosi-site`（颐浩寺遗址）、`wananqiao`、`pujiqiao`（当前 POI）+ Present `today_location`（`54a091a0`，今址迎祥街12号）。
- 揭示时机：此刻**不揭示**历史证据，仅 GEOGRAPHIC_EXACT 现代坐标。
- Epistemic：`KNOWN` + uncertainty「当前坐标仅为现代 POI，非历史位置」。
- Meaning/Present 角色：Present `today_location` 提供「今天在哪」；意义层不出现。
- Agent 判断：modern_map 聚焦三处对象点。
- 可见变化：地图三处高亮 + 问题浮层（beat-01-hook 已实现）。
- 复用 Surface：`modern_map`(primary) / `current_photo`(secondary) / `text_focus`。
- **缺失/薄弱**：CW-02 的 `cultural_present_connections` 未进入 `WorldEvidenceState`（G-05）。

**Beat 2 · 时空变化（Time/Space Shift）**
- 用户认知变化：现代坐标权威退场，进入南宋时间窗。
- 入口：「回到它们刚出现的时代」。
- World Objects（均 SUPPORTED_CANDIDATE）：颐浩寺创建 1260(`7fb4e9d4`)、建大雄宝殿 1288(`bbf95110`)、升院为寺 1295(`200b1b7f`)；万安桥创建 1260–1264(`59ab1ce6`)；普济桥 1267(`1232f6e9`)。关系：`former_site_of`(`32752c92`, E1↔`e0e00e41`)、`named_after`(`406ba707`, HR-4)。
- 揭示时机：坐标淡出 → RELATIONAL_HISTORICAL。
- Epistemic：SUPPORTED_CANDIDATE（带「据方志记载」限定）。
- 复用 Surface：`timeline`(primary) / `modern_map`(secondary)（beat-02 已实现）。
- **缺失/薄弱**：CW-02 的 9 events 未进入 `SliceShape.changes`/events 流；当前 s02 用脚本硬编码事件文本，未从 `cultural_events` 读取（G-05）。

**Beat 3 · 关系/变化发现（Relation/Change Discovery）**
- 用户认知变化：看到桥—水—桥，再让寺以「人—寺」关系进入。
- 入口：「看留下的关系」/「把寺也放进来」/「寺与桥有关系吗」。
- World Objects（Relation 层）：`wananqiao—spans_waterway→jinzetang`(`2f8e2ab8`,E1)、`pujiqiao—spans_waterway→jinzetang`(`187c1291`,E1)、姐妹桥 `spans_same_waterway`(`26025fd2`/`c9b17c6c`,E1)、`relative_position_south_of`(`4626e91a`,E3)、`temple_bridge_association`(`031ea707`,**E2 仅当前**)、`former_site_of`(`32752c92`,E1)、`named_after`(`406ba707`,HR-4)。
- Meaning 角色（Beat 3 末/4 出现）：`a1fa6d8b`（寺以吕颐浩故宅为基、以其人命名，derived `32752c92`+`406ba707`）以 INTERPRETIVE 出现。
- Epistemic：E1=SUPPORTED_CANDIDATE；E2=当前关联非历史（固定回应 `TEMPLE_BRIDGE_NON_ANSWER`）。
- 复用 Surface：`relational_space`(primary) / `timeline` / `evidence_panel`（beat-03 已实现）。
- **缺失/薄弱**：8 claims 存在于 008 表，但体验经 legacy `historical_spatial_relations` 读同名关系；`cultural_relation_claims` 与 `cultural_meaning_candidates` 未被读取，意义目前脚本硬编码（G-01/G-02/G-05）。

**Beat 4 · 证据改变理解（Evidence Changes Understanding）**
- 用户认知变化：知道哪些成立、哪些冲突、哪些未知。
- 入口：「为什么不能确定？」/「看分歧」/「看时间变化」/「看史料原页」。
- World Objects：
  - **Conflict**：普济桥建年 1265/1267（`cultural_conflicts` `5720eb77`；primary `1232f6e9` SUPPORTED_CANDIDATE，conflicted `f741022b` CONFLICTED，`preserved_open`）。
  - **Fragments**：`hr4_usable`(`0174c9d3`/`1961f62f`：寺址/寺名精确放行)、`u10_forbidden`(`9a7ed63b`：1992开放禁用)、其余 `generic`。
  - Events：1938 毁(`44ae4956`)、1992 重建(`1de2d196`)、1342 加廊亭(`7c7d8357`)。
- Meaning 角色：`d8663e7f`（普济桥姐妹桥意义，derived `26025fd2`+`4626e91a`）INTERPRETIVE。
- Epistemic：CONFLICTED(1265) 显式暴露；SUPPORTED_CANDIDATE（其余）；OPEN_QUESTION（1992开放）。
- 复用 Surface：`evidence_panel` / `conflict_compare` / `timeline` / `text_focus`（beat-04 已实现）。
- **缺失/薄弱（关键）**：① `cultural_conflicts`(1265/1267) **未进入体验冲突面**；当前 s05 仅显示 legacy T11-C1/C2（方位、水道名），建年冲突无体验位置（G-03，关联 AT-04）。② `evidence_fragments` 的 fragment 级闸门（hr4_usable/u10_forbidden）**未进入 Evidence Drawer**；体验用脚本 `evidence_refs` 字符串，不消费 `evidence_fragments`（G-04）。

**Beat 5 · 回到今天（Return to Present）**
- 用户认知变化：带着历史理解重新看今天，产生下一问题。
- 入口：「看今貌照片」/「那我现在去现场可以看什么？」/「寺和桥以前真有关系吗？」
- World Objects：Present `site_vs_rebuilt`(`bfd045a0`：遗址—复建双层，元代遗物与1992原址重建殿宇并置；`open_question`=1992开放为宗教活动场所 U10) + `today_location`(`54a091a0`)；支撑事件 1992 重建(`1de2d196`)；Meaning `a1fa6d8b` 作为回看框架。
- Epistemic：SUPPORTED_CANDIDATE（重建）+ OPEN_QUESTION（开放）。
- Meaning/Present 角色：`a1fa6d8b` 让「寺与人的绑定」成为回看今天的框架；`site_vs_rebuilt`+`today_location` 直接驱动「回到今天」。
- 复用 Surface：`current_map` / `current_photo` / `discovery` / `text_focus`（beat-05 已实现）。
- **缺失/薄弱**：两个 PresentConnection 未进入 `WorldEvidenceState`；Beat 5 回看目前靠脚本 s07/s08 硬编码（G-05）。U10 在脚本 s06-u4 以 FACT_LIMITED 出现，未与 `cultural_present_connections.open_questions` 字段对齐，存在 World Model 与脚本分叉风险（G-06）。

---

## 04 · Discovery Chain（一条最短完整链）

**链：今天颐浩寺遗址(迎祥街12号) → 1260 寺以吕颐浩故宅为基创建 → 1938 毁于轰炸 → 1992 原址重建 → 普济桥建年 1265/1267 冲突 → 回到今天「遗址—复建并置」+ U10 开放为 OPEN_QUESTION**

| 步 | 从→到 | World Object（真实 ID） | 表达边界 | 用户为何进入下一步 |
|---|---|---|---|---|
| 0 | 当下锚点 | `today_location` `54a091a0`；POI 万安/普济/颐浩寺 | KNOWN（现代坐标） | 「为什么离这么近？」→ 拨回时间 |
| 1 | 时间跃迁 | 颐浩寺创建 `7fb4e9d4`(1260)、`former_site_of` `32752c92`(E1) | SUPPORTED_CANDIDATE（据方志） | 坐标退场，关系浮现 |
| 2 | 关系发现 | `named_after` `406ba707`(HR-4) + `temple_bridge_association` `031ea707`(E2 仅当前) | E1=SUPPORTED_CANDIDATE；E2=当前关联非历史（`TEMPLE_BRIDGE_NON_ANSWER`） | 「寺与桥有关系吗？」→ 证据层面回答 |
| 3 | 时间变化 | 1938 毁 `44ae4956` → 1992 重建 `1de2d196` | SUPPORTED_CANDIDATE（attributed） | 看到「毁—建」双层，追问确定性 |
| 4 | 证据改变理解 | `cultural_conflicts` `5720eb77`（1265 `f741022b` CONFLICTED vs 1267 `1232f6e9`）；fragments `hr4_usable`/`u10_forbidden` | CONFLICTED 显式暴露；OPEN_QUESTION（U10） | 冲突与未知本身成为理解的一部分 |
| 5 | 回到今天 | `site_vs_rebuilt` `bfd045a0`（遗址—复建并置）+ `open_question` U10 | SUPPORTED_CANDIDATE + OPEN_QUESTION | 「寺和桥以前真有关系吗？」→ 自然产生的 Next Question（非 UI 强推） |

**AT-09 明确回答：** 过去没有变——`cultural_events` 的 9 个事件、`cultural_relation_claims` 的 8 条关系、`cultural_conflicts` 的 1265/1267 冲突，自 seed 起即固定，本审计未改动其一字。变化的是**用户与过去的关系**：链 step 0 用户把三处当「地图上的孤立点」；step 5 用户带着「寺址即南宋宰相故宅→1938 被毁→1992 原址重建并置→建年仍有 1265/1267 分歧→寺桥功能关联仍无证据」的结构化理解重新看今天，并自然产生「它们以前真有关系吗」的追问。这条链的全部节点均有 `cultural_*` 表 ID 与 epistemic 状态支撑（见 §3/§4），不是口号式结论，也不是 UI 强推的推荐。

---

## 05 · Epistemic / Evidence Expression Audit

- **三层不混淆（AT-03）**：Relation=`cultural_relation_claims`（E1/E2/E3/HR-4，事实/关系层）；Meaning=`cultural_meaning_candidates`（INTERPRETIVE，仅 `derived_from_claim_ids`，不反向污染事实）；Present=`cultural_present_connections`（当下观察 + `open_question`，非事实）。Fact→Interpretation Firewall 在 008 表结构层面成立（meaning 无 `meaning_refs` 指回事实；present 不进事实层）。
- **1265/1267 冲突保留（AT-04）**：在 World Model 中结构化保留（`cultural_conflicts` `5720eb77` `preserved_open`，双向定位 primary/conflicted）。**但**当前体验冲突面（s05）只显示 legacy T11-C1/C2，**建年冲突尚无体验合法位置** → 记为 Gap G-03（不影响「World 层保留」判定，但影响「体验表达中有合法位置」）。
- **1938/1992 不越界（AT-05）**：1938 毁(`44ae4956`)、1992 重建(`1de2d196`) 均 SUPPORTED_CANDIDATE（带「据…记载」限定），未越 Evidence scope；1992「开放」**仅**作 `open_question`（U10）于 `site_vs_rebuilt`，不进事实层。
- **U10 不正向事实化（AT-06）**：全程 `open_question`，无 SUPPORTED/CANDIDATE 事实化路径；`u10_forbidden` fragment 禁作事实。
- **证据最小单位（fragment 级）**：008 表 `evidence_fragments` 以 `span_type`(hr4_usable/u10_forbidden/generic) 切割同一 evidence 内可用/禁用片段——这是 CW-02 的关键诚实特征，但**未进入体验 Evidence Drawer**（G-04）。

---

## 06 · Existing Capability Reuse Matrix

优先级遵循 **REUSE → CALIBRATE → COMPOSE → ONLY IF BLOCKED propose new**。

| 现有能力 | 能否承载本链 | 结论 |
|---|---|---|
| `modern_map` / `current_photo`（Beat 1/5） | 能承载当下锚点 + 今貌回看 | **REUSE**（无需新 UI） |
| `timeline` / `relational_space`（Beat 2/3） | 能承载时间窗 + 桥水关系拓扑 | **REUSE** |
| `evidence_panel` / `conflict_compare`（Beat 4） | 能承载 known/conflicting/unknown 三栏 | **REUSE**，但需把 `cultural_conflicts`/`evidence_fragments` **喂入**（G-03/G-04） |
| `discovery` / `text_focus`（Beat 5） | 能承载主发现 + Next Question | **REUSE** |
| `WorldEvidenceState` / `SliceShape` 数据输入 | **不能**直接消费 008 表（vocab + shape 不匹配） | **需 COMPOSE**：M3.3 定义 008→`WorldEvidenceState` 投影（G-01/G-02） |
| `ExperienceAction`（FOCUS_PLACE/SET_TIME/OPEN_EVIDENCE/REPLAN…） | 足以驱动五 Beat 状态转移 | **REUSE**（不扩 Runtime） |
| `Patch-not-Replace` / `followup` 补丁 | 足以支撑「寺桥关系」追问不重启 | **REUSE** |

**判定：现有 Surface / Action / Patch 能力足够承载五 Beat 表达，无新 UI/Runtime/GIS 需求（AT-08）。唯一缺口是「World Model → ExperienceState 的数据绑定层」，属 M3.3 契约设计范畴，不是新增能力。**

---

## 07 · Experience Gap Register

> 仅登记影响 Canonical Experience 成立的真实 Gap；每条锚定 Beat + 用户体验阻塞；无「数据不够多/页面不够丰富/再做个功能」类泛化建议（AT-07）。

| gap_id | beat | gap_type | observed_problem | user_experience_impact | blocking_level | existing_asset | missing_capability | recommended_track | minimum_next_action | evidence_for_gap | can_degrade |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **G-01** | 全 5 Beat | COMPOSITION / RUNTIME | 008 表无运行时读取路径；体验只读 legacy `historical_spatial_relations`+静态脚本 | World Model（CW-02）与 Experience 实际脱钩，五 Beat 当前由硬编码脚本驱动而非 World Object | MATERIAL（M3.3 必须闭合） | `SliceShape`/`WorldEvidenceState` 形状已定义 | 008→`WorldEvidenceState` 适配器/读取器 | COMPOSITION（M3.3 契约） | M3.3 定义 `cultural_*` 表→`WorldEvidenceState` 投影 + 新增只读 data-access reader | Grep：`cultural_*` 仅 seed/verify；`buildWorldEvidenceState` 读 `SliceShape` | 否（是集成主线） |
| **G-02** | 3/4 | COMPOSITION / VOCAB | 词汇分歧：008 用六值 `epistemic_status`，体验用 E1–E4 `epistemicClass`；AD-01 曾裁定「无需映射」 | M3.3 绑定 claim 时须定义投影，否则两层认识论无法对齐 | MATERIAL | 六值 CHECK + E1–E4 均已存在 | 六值→`epistemicClass`/表达层的显式投影规则（不引入平行真源） | COMPOSITION（M3.3 设计裁决） | M3.3 冻结投影契约，复用 `expression_rule` jsonb | `SliceShape.relations[].epistemic_class` vs 008 `epistemic_status CHECK(六值)` | 否 |
| **G-03** | 4 | EVIDENCE | `cultural_conflicts`(1265/1267) 未进体验冲突面；s05 仅 legacy T11-C1/C2 | 建年冲突在 World 层保留但在体验中无合法位置，违反 AT-04「体验表达中有合法位置」 | MATERIAL | `evidence_panel`/`conflict_compare` Surface 已存在 | 把 `cultural_conflicts` 绑定到冲突面 | COMPOSITION | M3.3 将 `cultural_conflicts` 映射为 `WorldEvidenceState.conflicts` | `cultural_conflicts` `5720eb77` 存在；s05 仅 T11-C1/C2 | 可降级（冲突不显），但削弱诚实性 |
| **G-04** | 4 | EVIDENCE | `evidence_fragments` fragment 级闸门(hr4_usable/u10_forbidden) 未进 Evidence Drawer | HR-4 精确放行 / U10 禁用 的细粒度诚实特征不在体验中生效 | MINOR | `OPEN_EVIDENCE` Action 已存在 | fragment 级 gating 喂入 Evidence Drawer | COMPOSITION | M3.3 用 `evidence_fragments` 替代脚本 `evidence_refs` 字符串 | `evidence_fragments` 16 行，`span_type` 三值 | 可降级（用脚本字符串近似） |
| **G-05** | 2/3/5 | COMPOSITION / DATA | `cultural_events`(9,含1938/1992时间链) + `cultural_present_connections`(2) + `cultural_meaning_candidates`(2) 未绑定 `SliceShape` | 时间毁建链、Present Connection、Meaning 未由 World Model 驱动，体验依赖脚本硬编码 | MATERIAL | `SliceShape.changes`/`features` 形状已定义 | 事件/意义/当下连接绑定到 ExperienceState | COMPOSITION（M3.3） | M3.3 将 events/meanings/presents 投影进 `WorldEvidenceState` | CW-02 §4 全部 ID 已 seeded | 否 |
| **G-06** | 5 | DATA | `site_vs_rebuilt.open_questions`(U10) 与脚本 s06-u4 FACT_LIMITED 文本未对齐 | World Model 真源与脚本分叉风险，未来易漂移 | MINOR | `cultural_present_connections.open_questions` 字段 | 单一真源对齐（脚本不再硬编码 U10） | DATA（M3.3 契约内） | M3.3 以 `open_questions` 字段为唯一来源 | `bfd045a0.open_questions` vs s06-u4 | 可降级 |

---

## 08 · M3 Gate Recommendation

**唯一建议：`PASS_TO_M3.3`**

理由：
1. **映射可行（AT-01/02/03 通过）**：五 Beat 均能落到 CW-02 真实 World Object；可构造完整 discovery chain；Relation/Meaning/Present 三层在结构与表达上均不混淆。
2. **能力可复用（AT-08 通过）**：现有 Surface / Action / Patch-not-Replace 足以承载五 Beat，无需新 UI/Runtime/GIS。
3. **缺口属 M3.3 法定职责**：G-01~G-06 全部是「World Model → ExperienceState 的绑定/契约」问题，正是 M3.3（DESIGN-CONTRACT：World 对象 → ExperienceState/Action/Composition/Patch）的输入，而非阻止进入 M3.3 的前置 blocker。因此不取 `MINIMAL_GAP_FIRST`（那会另立一个与 M3.3 重复的 Gap Task），也不取 `PLAN_BLOCKED`（L1/L2/repo CURRENT 无矛盾）。
4. **Gate 输入**：上方 Gap Register（G-01 为主线，G-02 为关键设计裁决点，G-03/G-04/G-05/G-06 为次级闭合项）必须作为 M3.3 契约设计的强制输入。

**不自行开始 M3.3 或任何施工（AT-10）。STOP，等待 Architect 对 `PASS_TO_M3.3` 的签字与 M3.3 Task Book 签发。**

---

## 09 · ARCHITECTURE_RECONCILIATION = NONE
无需修改 V4.9 核心架构。六值认识论模型、Fact–Interpretation Firewall、ExperienceState/CompositionState/Patch-not-Replace 等冻结契约均成立。G-02 的词汇投影是 M3.3 契约层设计裁决，不触发架构层 Reconciliation（不新增平行真源，复用 `expression_rule`）。

## 10 · PLAN_RECONCILIATION = NONE
Phase II Plan V1.0 已明确 M3.1+M3.2 → M3.3 的滚动顺序；本审计结论（映射可行 + 集成缺口待 M3.3 闭合）完全落在计划内，不改变 CURRENT/NEXT 或 Exit Condition。

---

## 11 · STOP

**STOP — EXP-CULTURAL-01 审计完成，零 repo 改动，等待 ChatGPT Architect Review。**

- 完成项：STEP 0 Context Gate（无 BLOCKER）/ STEP 1 五 Beat×World Object 映射 / STEP 2 discovery chain / STEP 3 Gap Audit / STEP 4 Capability Reuse / STEP 5 M3 Gate Rec。
- 验收：AT-01~AT-10 全部通过（见 §3–§8 逐条落点）。
- 不执行：M3.3 / M4 / CW-03 / 第二古镇 / 批量迁移 / Data Factory / GIS 扩张 / Runtime 扩张 / Figma 重设计（均不在授权边界）。
- 交付物：本 11 节 Result（供 Architect Review）。按 Task Book §12，「PASS 后再按既定治理规则归档」——**本轮不写文件、不 commit**；待 Architect 签字 PASS 后，按治理规则写入 `tasks/results/EXP-CULTURAL-01-result.md` 并归档。

---

### Observation / Candidate（超出范围，仅记录，不改变任务范围 — Task Book §12）
- **O-1（词汇投影优先裁决）**：M3.3 应尽早裁定六值 `epistemic_status` → `epistemicClass`(E1–E4) 的投影，并明确 `cultural_conflicts`/`cultural_present_connections.open_questions`/`cultural_meaning_candidates` 在 `WorldEvidenceState` 中的承载字段，避免 M3.3 重蹈「两套词汇并存」。
- **O-2（单一真源）**：建议 M3.3 以 008 表为 Canonical Experience 的 World 输入真源，逐步退役 `jinze-3min-experience-script.json` 的硬编码叙事（保留为冻结视觉基线参考，而非运行时数据）。
- **O-3（未来，非本任务）**：若 M5 Human Gate 暴露历史视觉缺失，再按触发规则启动 Visual slice；当前不预建。

**ARCHITECT REVIEW = PASS / CLOSED ｜ GATE DECISION = PASS_TO_M3.3 ｜ 归档完成，不开始 M3.3。**
