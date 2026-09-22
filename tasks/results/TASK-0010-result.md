# TASK-0010 — 结果报告（Jinze Historical Spatial Grounding & Reconstruction — Minimum Slice）

**Status:** **PASS**
**基线 HEAD:** `3a59fc0cca560c27aea6bda4927e05ed29fb2b97`
**本任务 commit:** `1790ffb574b58208a557abd0f861c503f0dd1a12`（15 files changed, +4082 / −9）→ 本报告 hash 回填见紧随其后的文档 commit
**交付范围:** 金泽最小切片 —— 万安桥 → 普济桥 → 颐浩寺/颐浩寺遗址 → 连接三者所必需的最小水系语境
**Stop rule:** 本文件完成后 **STOP**，不启动 TASK-0011。

---

## 0. 结论（三个门，互不等同）

| 门 | 取值 | 依据 |
|---|---|---|
| `HISTORICAL_SPATIAL_SLICE_READY` | **`PARTIAL`** | §9 的 8 条判据中 **7 条 PASS**，仅 `c6_every_assertion_traceable` 未满足 |
| `EXPERIENCE_SCRIPT_SUBSTRATE_READY` | **`PARTIAL`** | 钩子语义齐备（5 个且全部 grounded_on 已落库行），但无任何历史视觉/可归因历史图上位置 |
| `PAST_PRESENT_COMPARISON_SUBSTRATE` | **`PARTIAL`** | 「今」一侧完整（3 个当前锚点 + 3 张 CC BY-SA 当代实景），「昔」一侧只有文本 |
| `SPATIOTEMPORAL_OVERLAY_SUBSTRATE` | **`NO`** | `historical_geometry_status = absent_no_source`；`HR-MAP-01 direct_jinze_historical_map = NOT_YET` |

**为什么停在 PARTIAL：** `c6` 要求「切片中每一条历史断言都能追到 Evidence 行」。实测有 **5 条历史断言只存在于 Legacy 实体描述、全库无对应 Evidence 行**（逐条见 §3.2）。**没有**为了把门槛刷绿而删除这些断言、放宽判据或扩大切片——正确解法是补证据，已逐条登记为 `U1–U8` 与 7 条待裁提案（§5）。

---

## 1. §16 精确计数（全部为库内实测，非手写）

### 1.1 特征（`historical_features` = 5）

| 项 | 值 | 明细 |
|---|---|---|
| **core features total** | **5** | 万安桥 `bridge` / 普济桥 `bridge` / 颐浩寺遗址 `temple_site` / 金泽塘 `waterway` / 吕颐浩 `person_reference` |
| **evidenced historical features** | **5** | 全部 `array_length(evidence_ids,1) ≥ 1`；特征侧挂证据合计 **32** 条 |
| **current grounded points** | **2** | 万安桥、普济桥 = `official_or_provider_object_point`（GCJ-02） |
| **approximate areas** | **1** | 颐浩寺遗址 = `approximate_object_area`（GCJ-02；`HR=SHR-01`） |
| （⇒ `c2_current_object_grounding` 实测值） | **3** | 2 点 + 1 面 |
| **historical anchor candidates** | **0** | 库内 `historical_anchor_candidate` = 0；无任何历史坐标 |
| **historical-relative-only features** | **3** | 普济桥、万安桥、金泽塘 = `historical_relative_position_only` |
| **unresolved features（历史位置）** | **2** | 颐浩寺遗址、吕颐浩 = `historical_position_status = unresolved` |
| 几何类型分布 | `point` 2 / `area` 1 / `unknown` 2 | 无任何 `line` |
| 当前位置状态分布 | `official_or_provider_object_point` 2 / `approximate_object_area` 1 / `unresolved` 2 | — |

### 1.2 关系（`historical_spatial_relations` = 8）

| 级别 | 条数 | 实例 |
|---|---|---|
| **E1** | **5** | `pujiqiao--spans_same_waterway--wananqiao`、`wananqiao--spans_same_waterway--pujiqiao`、`wananqiao--spans_waterway--jinzetang`、`yihaosi-site--former_site_of--lvyihao`、`yihaosi-site--named_after--lvyihao` |
| **E2** | **1** | `yihaosi-site--temple_bridge_association--pujiqiao`（`support_level = provider_geometry`，`hr_constraint = [SHR-01]`） |
| **E3** | **1** | `pujiqiao--relative_position_south_of--wananqiao` |
| **E4** | **1** | `pujiqiao--spans_waterway--jinzetang`（`support_level = none`，`status = unresolved`，note 点名缺失证据） |

⇒ `c4_relations_classified` 实测 **7**（E1/E2/E3 合计，要求 ≥2）。**E4 不计入支持**，与「无证据」事实一致（测试 #9 断言：普济桥侧 `%金泽塘%` 证据行 = 0，万安桥侧 ≥ 2）。

### 1.3 变更（`historical_change_records` = 5）

| `change_epistemic` | 条数 | 明细 |
|---|---|---|
| **evidenced** | **3** | 普济桥 `survives`（2 证据）、万安桥 `survives`（2 证据）、颐浩寺遗址 `rebuilt`（1 证据） |
| **candidate** | **1** | 万安桥 `tingqiao-form-unknown`（亭桥形制，无证据） |
| **unknown** | **1** | 金泽塘 `history-unknown` |

⇒ `c5_time_change_distinction` 实测 **3**（要求 ≥1）。

### 1.4 新增对象（对既有基底的影响）

| 项 | 值 |
|---|---|
| new Source Records | **0**（`source_records` 前后均 188） |
| new Evidence | **0**（`evidence` 前后均 126） |
| new Claims | **0**（`claims` 前后均 20） |
| new Relations（`relations` 表） | **0**（前后均 30） |
| **new HistoricalFeature records** | **5**（含 anchors 9 / changes 5 / hs_relations 8 / slices 1，合计 **28** 行，均由确定性 UUID upsert 写入） |
| new Historical Map Evidence | **0**（复用 TASK-0009 既有 17 条 `historical_map_source_acquisition`） |

### 1.5 G0–G6 审计

| 项 | 值 |
|---|---|
| **G0–G6 rows（新增）** | **91** = features 5 × 7 + hs_relations 8 × 7（`historical_feature` 35 + `historical_spatial_relation` 56） |
| `evidence_gate_audit` 总量 | 1694 → **1785**（+91） |
| （builder 的 `audit_statements`） | 182 —— 这是 **SQL 语句数**（每门 `delete` + `insert` 各一条 = 行数 2 倍），已在本轮把两个字段分开命名以免下游误读 |
| 门判据输入 | 三态 `true/false/undefined`；切片的 `spatial` 恒 `false`（历史位置状态非 `verified_*`）→ 与 TASK-0006/0007 约定一致，切片对象 tier 恒 B |
| 孤儿审计 | `historical_*` 对象孤儿 = **0** |

### 1.6 人审与不变式

| 项 | before | after |
|---|---|---|
| `human_review_decisions` 总数 | 12 | **13**（+`HR-MAP-01`） |
| 既有命名空间 `HR-1…HR-6` / `SHR-01…SHR-06` | 6 / 6 | **6 / 6（零改动、零碰撞）** |
| `HISTORICAL_MAP_READY`（`SHR-06`） | `partial` | **`partial`（未收敛）** |
| **published** | **0** | **0** |
| **audit relation orphan** | **63** | **63** |
| Raw Store 文件数 | 517 | **518**（+1 = 本轮新增的只读计数脚本 `_counts_t10_final.mjs`；**未新增任何采集产物**） |
| Legacy（`hushang-jingwei`） | — | **零写**（见 §6.1） |
| 幂等重跑（builder） | — | **`created = 0 / reused = 28`**，`before === after`，`ok = true` |
| 导出的确定性 | — | 重跑导出器后 8 个文件 **sha256 逐字节一致**（差异行数 0） |

### 1.7 验证与提交

| 项 | 结果 |
|---|---|
| `pnpm vitest run tests/data/historical-spatial-reconstruction.test.ts` | **17 tests passed (17)** |
| `pnpm guard:docs` | **OK**（5 个 spec 全在预算内） |
| `pnpm guard:structure` | **OK**（`skills=10 (floor 8) dirs=10 required=10`） |
| `pnpm -r typecheck` | **6/6 包 Done** |
| tests 类型补检 | 仅 `TS7016`（`packages/data-access/src/index.mjs` 无声明文件）—— 既有既有测试文件（如 `knowledge-weave.test.ts`）**同一告警**，非本任务引入 |
| `.js` 副作用产出 | **0 → 0**（前后各数一次；未在源码目录单文件跑 `tsc`） |
| `pnpm --filter @mohen/web build` | **✓ Compiled successfully**，静态页 4/4，Next.js 15.5.25 |
| Legacy 零写 | `legacy/` git clean、今日写入 0、索引哈希 `2adbb30d…e13d86` 未变 |
| worktree clean | **YES**（回填 commit hash 后） |

---

## 2. 任务目标逐条作答（§1 的 6 问）

| # | 问题 | 答案 |
|---|---|---|
| 1 | 本切片哪些历史对象有可靠着录？ | **5 个特征**；普济桥/万安桥的历史存在与「延续至今」有 2 条证据/座；颐浩寺遗址的「原址复建」有 1 条证据（`rebuilt`）。 |
| 2 | 什么能接地到**当前**对象点？ | **3 个**：万安桥点、普济桥点（`official_or_provider_object_point`，GCJ-02）、颐浩寺遗址面（`approximate_object_area`）。 |
| 3 | 历史位置 / 当前位置 / 近似面如何区分？ | 三者在**不同列**上表达：`historical_position_status`（3 `historical_relative_position_only` + 2 `unresolved`）≠ `current_position_status`（2 point + 1 area + 2 `unresolved`）≠ 锚点 `spatial_status`。**库层 CHECK 禁止**把 `provider_current%` 锚标为 `historical_position_proof`。 |
| 4 | 桥—寺—水系的关系哪些有证据/候选/未决？ | E1 = 5（有文献支持，含「普济桥与万安桥同跨一河，一南一北」「金泽桥桥桥有庙」类原文）、E2 = 1、E3 = 1、E4 = 1（普济桥跨金泽塘：看似合理而证据不足，**已点名缺失证据**）。 |
| 5 | 历史记载与今天之间发生了什么变化？ | `evidenced` 3（两桥 `survives`、寺 `rebuilt`）+ `candidate` 1（万安桥亭桥形制）+ `unknown` 1（金泽塘）。**未把建造年代当作「现存形制未变」的证明。** |
| 6 | 结果是否足够支撑后续 Experience Script？ | **`PARTIAL`** —— 可做**陈述/证据驱动**的脚本（谁是谁、什么还在、什么只剩遗址、来源在哪），**不可**做复原式呈现/今昔对照/时空叠加（历史视觉证据 = 0）。 |

---

## 3. 关键技术结论与红线遵守

### 3.1 现代 AMap 坐标 ≠ 历史坐标（§4 / §12-5）
9 个锚点全部登记 `historical_position_proof = false`（库层 CHECK + 测试 #5 双保险）。坐标登记**每个带坐标的记录都显式声明 CRS，两组分列、零换算**：`GCJ-02` 3 条（当前 provider 点/面，保留原值不换算）、`WGS-84` 3 条（镇级参考，来自 Wikidata P625）、`none` 3 条（纯文本相对位置陈述，库层 CHECK 强制不得带坐标）。

### 3.2 `c6` 未满足的具体条目（5 条 legacy-only 断言，**不得删除、不得改写为已证**）
| 对象 | 断言 | 状态 |
|---|---|---|
| 普济桥 | 「位于金泽镇北市，横跨金泽塘」 | 全库检索『金泽塘』仅命中万安桥 2 行；普济桥侧 **0** 行 |
| 万安桥 | 「旧志载其形制为亭桥（桥上建亭）」 | 仅存于 Legacy 描述（且自述「据方志转述」） |
| 颐浩寺遗址 | 「1938 年毁于兵燹」 | 仅存于 Legacy 描述 |
| 颐浩寺遗址 | 「1992 年原址修复开放」 | SHL 行有「当代复建殿宇并置」的**状态**证据，但**无年份**证据 |
| 颐浩寺遗址 | 「元代鼎盛时『虽杭之灵隐、苏之承天莫匹其伟』」 | 转引之转引，无原件 |

⇒ 对应 `U1`（high）、`U2`（medium）、`U3`（high）。

### 3.3 零编造几何（§12-10/11/12）
- `historical_geometry_status = absent_no_source`，**本任务不产生任何历史几何**。
- 迁移 007 **零 geometry 列、无 PostGIS**（测试 #3 断言）。
- 无任何锚把「地图上靠近」当作「同一对象」；1879 的 17 条历史地图证据全部登记 `attributable_to_slice_objects = false`（**图上目前没有可归因于本切片任一对象的要素**）。

### 3.4 不碰来源、不改旧判断（§0.2 / §11）
`HR-MAP-01` 以**新的 Human Review Decision** 追加（新命名空间，`on conflict (hr_code) do update`），**未**修改 `source_records` / `evidence`（不把来源「改成已确认」），**未**回改 TASK-0009 任何报告或 CSV。OCR 仅作导航（`role = navigation_only`，`blocked = true`），**未**把 OCR 结果升级为历史事实。

---

## 4. WP-B/C/D/E/F 的表示法决策（§10 为什么必须新增一个迁移）

既有 schema **无法无损表达**本切片，逐项论证见迁移文件头部注释：
- `entities` 无 metadata JSONB、无几何/CRS/空间状态列；
- `evidence.region_json` 已被三种不同形状复用（证据自身的空间附注 ≠ 对象的规范空间状态）——再塞一层即产生第二真源；
- `relations.status` 是含 `published` 的 enum，E1–E4 不能进；
- `relations.subject/object` 均 `not null references entities`，而**金泽塘在 `entities` 中无行**，无处安放。

⇒ 新增 **`supabase/migrations/202609220007_historical_spatial_reconstruction.sql`**（001–006 未改动）：4 枚举 + 5 表，并把 6 条语义不变量**下沉到库层 CHECK**（当前坐标永不作历史证明 / 相对位置陈述不得带坐标 / `evidenced` 变更必须带证据 / 非 E4 关系必须带证据 / `support_level=none` 只允许 E4）。

---

## 5. §15 交付物

| # | 文件 | 字节 | 说明 |
|---|---|---|---|
| 1 | `data/exports/jinze-map-human-review-decision-log.md` | 4102 | HR-MAP-01 追加式决策日志（冻结裁决逐条镜像） |
| 2 | `data/exports/jinze-historical-feature-inventory.csv` | 7131 | 特征清单（5 行） |
| 3 | `data/exports/jinze-historical-spatial-relations.csv` | 5007 | 关系清单（8 行，含 E1–E4 与证据） |
| 4 | `data/exports/jinze-historical-change-inventory.csv` | 2831 | 变更清单（5 行） |
| 5 | `data/exports/jinze-historical-spatial-slice.json` | 55699 | 机器可读切片对象（features/relations/changes/sources/uncertainties/hooks/readiness） |
| 6 | `data/exports/jinze-historical-spatial-slice-readiness.md` | 9376 | 就绪门 + 8 判据对账 + 3 子门 + 缺失证据 |
| 7 | `data/exports/jinze-historical-spatial-human-review.csv` | 3744 | **7 条待裁提案**（P-01…P-07，覆盖 U1/U2/U3/U5/U6/U7/U8；`requires_architect_adjudication=true`，`db_row_created=false`） |
| 8 | `tasks/results/TASK-0010-result.md` | 本文件 | — |
| 附 | `data/exports/jinze-historical-feature-anchors.csv` | 5144 | 锚点清单（9 行）——**§15 未列，额外提供**，因为「坐标登记与 CRS 纪律」需要独立可查台账 |

**说明：** `U4`（普济桥年代口径冲突，`low`）**未**进入 §15-7 提案表 —— 生成规则为 `severity ∈ {high, medium}`。它是**已留痕的冲突记录**（`FEATURE_CONFLICTS` 机制承载，§12-13 保留来源变体、不静默归一），不需要架构师裁定。

**代码/管线（新增，均在 §13 允许清单内）：**
- `pipelines/historical-spatial/apply-migration.mjs`（只读安全的最小迁移应用器；既有 `scripts/db-apply.ps1` 会顺序重跑全部 migration，001 起不可重复执行）
- `pipelines/historical-spatial/persist-hr-map-01.mjs`（WP-A）
- `pipelines/historical-spatial/slice-definitions/jinze-minimum-slice-001.mjs`（策展数据：5 特征 / 9 锚 / 5 变更 / 8 关系 / 8 不确定项 / 5 体验钩子）
- `pipelines/historical-spatial/build-jinze-historical-spatial-slice.mjs`（WP-B…F 唯一写库入口）
- `pipelines/historical-spatial/export-jinze-historical-spatial-slice.mjs`（§15 投影器，只读、确定性、无时间戳）
- `tests/data/historical-spatial-reconstruction.test.ts`（17 用例）
- `skills/mohen-historical-spatial-reconstruction/SKILL.md`（§14 的第三个 Skill = **Assemble**）
- `supabase/migrations/202609220007_historical_spatial_reconstruction.sql`

**§13 边界遵守：** 未做 UI / route / Agent Runtime / Experience Renderer；未扩展整个金泽；未执行 P1/P2 大规模采集；未编辑迁移 001–006；未新建框架；未合并既有 Skill。

---

## 6. 如实披露（两项）

### 6.1 Legacy 零写的证据口径
零写证据 = **今日写入 0 条 + mtime 未变**，而非「工作区与 HEAD 完全一致」：

| 项 | 值 |
|---|---|
| `hushang-jingwei/data/` 今日被写文件数 | **0** |
| `hushang-jingwei/data/seed.master.json` mtime | `2026-09-17 16:51:48.668436700`（**未变**） |
| `legacy/`（仓库内镜像，1 文件）git 状态 | **clean**；今日写入 **0**；最新 mtime `2026-09-21 11:26:34` |
| `legacy/` 索引哈希 | `2adbb30dfadde0b1d05c40fd0b62a3b8fac8ae8ec0efdce087a47f6858e13d86`（未变） |

**需披露的既有差异（非本轮引入）：** `hushang-jingwei` 工作区的 `seed.master.json` sha256 = `1aab7fc10a58fd8dfba8833ff9d2034218cc14801d9bda81b7834306f7f2e1b7`，**≠** 其 HEAD 内版本 sha256 = `a075031449c064600377ee9d033eae9eaaa63c945941ac2ef1175864fbbd74e6`。该差异在**本任务开始之前即已存在**（mtime 为 2026-09-17），本任务的零写由「今日写入 0 + mtime 未变」举证。

### 6.2 既有管线重跑改写了 TASK-0008 的一份交付物
本轮的幂等复跑批次中，既有管线 `pipelines/review/persist-human-review.mjs` 重跑后**重新生成了它自己负责的** `data/exports/jinze-human-review-decision-log.md`（mtime 11:54 → 17:20；内容已自然包含新增的 `HR-MAP-01`）。

- **未改写任何 TASK-0009 交付物**：TASK-0009 六份交付物的 mtime 完好 —— acquisition-report 16:10、breakthrough-candidates 16:09、map-index 14:56、map-human-review 14:57、backlog 14:57、source-matrix 14:56。
- 被改写者属 **TASK-0008 的**产物，且改写内容为该脚本的**确定性投影**（含新决策，非数据丢失）。
- 记录在此以保持口径完整：**「零回归」是指数据不变式不变，不等于「任何文件 mtime 不变」。**

### 6.3 其他诚实口径
- **`HISTORICAL_MAP_READY` 仍为 `PARTIAL`**：HR-MAP-01 明确「可用作 Historical Spatial Source = YES」但「直接的金泽历史地图 = NOT_YET」，本决策**不收敛**该门槛。
- **1879 p36 的三个印刷标签仍未决**（`金泽/金澤`、`蔡浜`、`枪开河/槍開河`）：不得由普通 OCR 升级为历史事实（§0.3）；`BREAKTHROUGH_CANDIDATE = NO`。
- **`historical_visual_evidence = 0`**：库内 `evidence_type='image'` 共 8 条当代实景（其中 **3 条**可归因于本切片对象：万安桥 / 普济桥 / 颐浩寺遗址，均 CC BY-SA 3.0），历史影像 **0** 条。该值由 SQL 实测得出（`region_json->>'current_or_historical'='historical'`），非硬编码。
- **`c8_no_fabricated_geometry` PASS 的理由是「没有几何」**，不是「几何被验证过」——这是本切片最本质的局限：目前没有任何历史图籍要素可归因于这三个对象（`U7`/`U8` 即为补齐此项的缺失证据）。
- §12-14（`天王阁/天皇阁` 规则）：本切片**未涉及**该对象（视觉证据层存在 `Tianhuanggeqiao.jpg`，但未进入切片特征），故规则保持待用而非被触发。

---

## 7. 提交与收尾

| 项 | 值 |
|---|---|
| 基线 HEAD | `3a59fc0cca560c27aea6bda4927e05ed29fb2b97` |
| 本任务 commit | **`1790ffb574b58208a557abd0f861c503f0dd1a12`**（15 files changed, +4082 / −9）— message：`TASK-0010: 金泽历史空间最小切片重建（HR-MAP-01 → Feature/Anchor/Change/Relation → Slice → Readiness Gate）` |
| worktree clean | **YES**（回填 commit 后干净） |
| **STOP** | 本任务完成，**不启动 TASK-0011**。 |
