# TASK-0007 结果报告 — 金泽空间锚定（Jinze Spatial Grounding）

- 状态：**完成并 STOP**（未进入 TASK-0008 / 路线 / UI / Agent Runtime / Vertical Slice）
- commit：见 §12；工作树 clean
- 主链：`Source → Raw → Evidence → Spatial Anchor → Historical Map Assessment → Spatial Readiness` ✅ 贯通

---

## 1. 两个门槛（任务书要求分别作答）

| 门槛 | 判定 |
|---|---|
| **`SPATIAL_TARGET_SET_READY`** | **YES**（4 个 P0/P1 对象具备可辩护的对象级当前坐标，≥3 达标） |
| **`HISTORICAL_MAP_READY`** | **PARTIAL**（有 1 张图在 provenance/资产/分辨率/用途模式 4 项达标，但**无任何图绘出金泽** → 不可作空间锚） |

> **NO / PARTIAL 均不构成 fail**（任务书 §13）。本次为 **YES + PARTIAL**。

---

## 2. 任务书 §12 要求的精确计数

| 指标 | 值 |
|---|---|
| P0/P1 查询对象 | **9**（P0 ×5 + P1 ×4） |
| **`verified_object_point`** | **0**（本任务**未产出任何** verified 级对象点） |
| **provider/official 对象点** | **4**（`official_or_provider_object_point`） |
| `approximate_object_area` | **0** |
| `ambiguous` | **5** |
| `unresolved` | **0** |
| **新增 Source Records** | **10**（36 → **46**；全部 `provider='amap'`） |
| **新增 Evidence** | **9**（92 → **101**；`extraction_method='spatial_anchor:amap_place_text_v3'`） |
| **raw 快照** | **11 个文件 / 10 个 distinct checksum / 2 个 run 目录**（+ 1 个地图取回目录） |
| 审计的历史地图 | **3 张**（已登记）+ **36 页**（Legacy `public/yutu/`，未登记） |
| 地图按用途模式 | `original_map_narrative` **2** / `not_usable` **1**（另有 36 页因无 provenance 判 `not_usable`） |
| **G3 before → after** | pass **42 → 46** / pending **129 → 134** / fail **15 → 15** |
| **audit orphan rows before → after** | **63 → 63**（**未增大**） |
| `evidence_gate_audit` 总行 | **1302 → 1365**（+63 = 9 evidence × 7 门）；`distinct(object,gate)` = **1365**（快照语义保持） |
| **published** | **0**（claims 0 / discoveries 0 / paths 0） |

**未改动**：Knowledge Weave `claims 5 / paths 3 / discoveries 4 / relations 30`。

---

## 3. WP-B 对象级坐标结果

| 层 | 对象 | 状态 | 坐标（GCJ-02，原样） |
|---|---|---|---|
| P0 | 万安桥 | ✅ provider 对象点 | 120.919639, 31.039508 |
| P0 | 普济桥 | ✅ provider 对象点 | 120.920423, 31.033940 |
| P0 | 迎祥桥 | ✅ provider 对象点 | 120.920157, 31.031353 |
| P0 | 颐浩寺遗址 | ⚠️ ambiguous → HR-01 | — |
| P0 | 金泽镇（镇锚） | ⚠️ ambiguous → HR-02 | — |
| P1 | 如意桥 | ⚠️ ambiguous → HR-03 | — |
| P1 | 天皇阁桥 | ⚠️ ambiguous → HR-04 | — |
| P1 | 金泽放生桥 | ⚠️ ambiguous → HR-05 | — |
| P1 | 林老桥 | ✅ provider 对象点 | 120.919344, 31.040169 |

**决策规则（入库、可复现）**：仅当「名称与检索词完全一致」且「`adname`/`address` 含『金泽』」的候选**恰为 1 个**时才接受；**禁止以距离远近取舍**。4 个接受点互距 79–983 m，全簇落在「金泽古镇」半径 632 m 内 → 几何自洽（**不等于**经独立测绘验证，故仍非 `verified`）。

---

## 4. 本任务最有价值的两个发现（均为"防错"成果）

### 4.1 规则严格性阻止了一次**跨镇误配**（金泽放生桥）

AMap 中名称**完全一致**的「放生桥」位于**朱家角**（121.056217, 31.111395，距金泽约 **11 km**，属另一个古镇）；而金泽镇内的 POI 名为「**金泽**放生桥」（120.921131, 31.033258），**名称并不完全一致**。

→ 若规则仅按「名称完全一致」取舍，会把**朱家角的桥配给金泽对象** —— 属用户视角的**配错底线错误**。
→ 正是「还须地址落在金泽」这一条把它挡住。**该歧义不应被"修掉"，它是机制生效的证据。**

### 4.2 Legacy 对象坐标**内部自相矛盾**，不可作为对象级坐标

| 对象 | Legacy 坐标 | AMap 当前点 | 差异 |
|---|---|---|---|
| 普济桥 | 31.033940, 120.920423 | 31.033940, 120.920423 | **0 m**（完全相同 → Legacy 该点取自 AMap POI） |
| 万安桥 | 31.097000, 120.916500 | 31.039508, 120.919639 | **6,400 m** |
| 迎祥桥 | 31.090500, 120.918500 | 31.031353, 120.920157 | **6,579 m** |
| 林老桥 | 31.095000, 120.918000 | 31.040169, 120.919344 | **6,098 m** |

- **同一批对象内部不自洽**：普济桥与 AMap 分毫不差，而与之相隔数百米的万安桥却差 6.4 km。
- 7 个对象被统一放在镇点**以北 6.0–6.7 km**，且纬度值整齐排开（31.0905→31.097）→ **手工填列特征**，非测绘或权威著录。
- Legacy 镇点 `31.036942,120.921377` 与 AMap「金泽古镇」**完全相同**（溯源即 AMap）；与 Wikidata `P625`（WGS-84）相差 **561 m**。
- → **结论：Legacy 坐标不得作为对象级坐标，也不得作为"参考答案"**（这是既有 G3 在 15 个 entity 上 fail 的成因）。

---

## 5. WP-C 历史地图审计结论

| # | 地图 | 金泽可见性 | 分辨率 | 用途模式 |
|---|---|---|---|---|
| 1 | 松江府境图（1754，大清分省舆图） | **否** | 充分（原图 1293×1094，已实测辨读） | **`original_map_narrative`** |
| 2 | 青浦县城图（1879，青浦县志） | **否**（且不含其所在区域） | 充分（原图 2239×1607） | **`original_map_narrative`**（仅县域语境） |
| 3 | 松江府疆域图（古今图书集成） | **不可判定** | **不足**（**原图仅 471×445 / 4.9 KB**） | **`not_usable`** |
| 4 | `public/yutu/` 36 页 | 未知 | — | **`not_usable`**（**零 provenance**） |

### 5.1 关键负面结论已被**强化**
1754 图上**确有镇级地名（許墅）** → 说明该图**并非只标县城**，故**金泽的缺席不能归因于"本图不标镇"**。图上可辨：蘇州/吳江/新陽/崑山/嘉定/寶山/青浦/松江、**澱山湖**/泖湖/新洋江、許墅。

### 5.2 疆域图的分辨率硬伤（可复现）
Commons **原图 = 471×445 / 4,922 B**；本地 1280×1209 文件是 **MediaWiki 放大产物**（PNG `tEXt` 含 `date:create`）→ **放大不产生信息**。
→ 第 2 次取回额度**原理上无收益**，故**未消耗**（额度使用 **1/2**）。

### 5.3 发现一处 Legacy 元数据实质错误
`ext-qingpu-1879` 的 `scope` 记为 **「县域图」**，而 Commons 题注为 **「青浦县治图」**、本次目视亦确认绘的是**城郭**（城牆/水關/縣署/城守營/趙屯浦）→ **应为县治图**。**下游使用前必须修正。**

### 5.4 点破一个口径陷阱
Legacy `external_maps[].towns` **不能**读作「该图上画了金泽」：
- `松江府境图1754` 与 `疆域图` 的 `towns` **逐字相同**（9 镇）→ 按行政归属**批量套用**，非逐图判读；
- 两图 `coverage_note` 自述「**非某镇专图**」；
- 目视反证：1754 图无金泽。
→ 语义实为「**金泽的行政归属在本图范围内**」。

---

## 6. WP-F 人审包（6 项待裁）

`data/exports/jinze-spatial-human-review.csv`

| id | 议题 |
|---|---|
| HR-01 | 颐浩寺遗址：AMap 无独立 POI，是否接受复合 POI「普济桥-颐浩禅寺」为 `approximate_object_area` |
| HR-02 | 金泽镇：镇锚取景区口径 / 行政口径 / 双口径 / 不设统一镇锚 |
| HR-03 | 如意桥：是否核准（旁证：同址 16 m 有「冬冬的厨房(如意桥店)」，地址为**金泽村59号**） |
| HR-04 | 天皇阁桥：用字取 S1 原字「天王阁桥」还是 POI/Legacy「天皇阁桥」；是否核准 |
| HR-05 | 金泽放生桥：核准金泽放生桥、排除朱家角放生桥 |
| HR-06 | **判据口径**：`HISTORICAL_MAP_READY` 的「Jinze-relevant content」是否要求图上绘有金泽 |

> **4 个确定性对象点未送人审**（任务书 §WP-F：不要让人审确定性情形）。

---

## 7. 18 项不变量核对

| # | 不变量 | 结果 |
|---|---|---|
| 1 | 不猜坐标 | ✅ 5 歧义对象 `original=null` |
| 2 | 镇级锚点不冒充对象点 | ✅ Wikidata 15 条仍 `town_level`；金泽镇判 ambiguous 未接受 |
| 3 | 当前 POI 不冒充历史位置 | ✅ 全 `current_vs_historical='current'`；G2 对 9 条**全 pending**（0 pass） |
| 4 | 原始坐标保留 | ✅ 与 raw 快照逐点比对通过（4/4） |
| 5 | 换算显式可复现 | ✅ `transform_applied=false`、`transformed=null`，换算数 0，理由入库 |
| 6 | 歧义不自动消歧 | ✅ 5 例全转人审，候选与决策规则均留存 |
| 7 | 每个锚点有 Evidence | ✅ 4/4，G0/G1/G3 pass、来源可追溯 |
| 8 | 地图 provenance 显式 | ✅ `source_uri`/许可/作者/年代齐备（**但见 §9 缺口**） |
| 9 | 地图用途模式显式 | ✅ 逐图判定 + 6 词表落档 |
| 10 | 不强制全局配准 | ✅ 0 次配准；migration 仍 4 个；管线无配准实现 |
| 11 | HR-1…HR-6 冻结 | ✅ `part_of=0`；视觉排除 20；legend 未升级 |
| 12 | Knowledge Weave 不变 | ✅ 5/3/4/30 未变；无 spatial claim/discovery |
| 13 | 无新增 published | ✅ 0/0/0 |
| 14 | raw append-only | ✅ 11 文件两 run 各自留存，未被覆盖 |
| 15 | 无 secret 泄露 | ✅ key 不打印/不落盘/不入库/不入 Git |
| 16 | 重跑幂等 | ✅ 离线重放两次计数一致（`source_created=0`） |
| 17 | Legacy 零写 | ✅ size 10721985 / mtimeMs 1789635108668.4368 未变 |
| 18 | 既有测试保持绿 | ✅ 全量 **70 passed / 7 files** |

---

## 8. 验证证据（命令级）

| 项 | 结果 |
|---|---|
| `guard:docs` | ✅ exit 0 |
| `guard:structure` | ✅ exit 0（`skills=8 required=10`） |
| `typecheck`（`pnpm -r typecheck`） | ✅ **6/6** 通过 |
| `next build` | ✅ `BUILD_EXIT=0`（4 路由，Compiled successfully） |
| `vitest run`（全量） | ✅ **70 passed / 7 files**，exit 0 |
| 新增测试 | `tests/data/spatial-grounding.test.ts` — **20 passed** |
| 幂等 | ✅ 真实 `--from-raw` 重放两次，evidence 9 / sources 10 / audit 63 不变 |
| diff check | ✅ 工作树 clean，无游离文件 |

---

## 9. 三处**主动披露**（请架构方知悉）

### 9.1 ⚠️ 已披露缺口：3 张地图 Source Record 的 `license_code` 为空
- `content_type='image/map'` 的 3 条记录，`license_code` **全为空字符串**；而 Legacy `external_maps[].license` 记有「Public domain」。
- 本次已用 Commons `imageinfo/extmetadata` **独立核实** 3 张图均为 **Public domain**，并将许可/作者/年代逐图登记在审计报告 → **provenance 在文档层显式，DB 字段层缺失**（不变量 8 的字段级缺口）。
- **未回填**：修改既有 `source_records` 属 provenance 硬化范围，**超出本任务授权**。已登记为后续任务项（最小修复建议见审计报告 §9），并由测试用例 **8b** 设为**「缺口绊线」**，防文档与 DB 长期脱节。

### 9.2 测试中发现并修复的两个真实缺陷（本任务代码）
1. **`--from-raw` 重放时 `region_json.run_id` 指向不存在的目录** → 破坏 evidence→raw 可追溯性。
   已修：新增 `raw_run_id`，证据一律指向 **raw 实际所属 run 目录**，并增设 `replay_from`；`retrieved_at` 改用 **raw 落盘时间**（使重放真正可复现）。修复后 9/9 条 run_id 均指向真实目录。
2. **未按查询逐条登记 Source Record**：初版只给"被采纳的查询"建 Source Record，导致 11 个 raw 文件只有 9 条 Source。
   已修：`registerSource()` 移入查询循环，**每次查询都登记**。修正后 11 文件 → **10 条 distinct Source（10 个 distinct checksum）**，唯一重合是「颐浩寺 / 颐浩禅寺」**响应字节完全相同**（AMap 对两词返回同一组 POI），按 checksum 去重**正确合并**，两 raw 路径均在 `query_attempts[].raw_path` 保留。

### 9.3 `ambiguous → conflict` 的保守映射（设计选择）
歧义证据一律标 `conflict=true` → **G5 fail → G6 fail（阻断发布）**；`unresolved` 则不触发冲突标记。
此为**保守映射**，目的是让歧义**不可能**溜进发布态。**属本任务设计选择，非 schema 规定**，故显式披露。

---

## 10. 门槛可推翻性（不写死）

| 门槛 | 当前 | 升级条件 |
|---|---|---|
| `SPATIAL_TARGET_SET_READY` | YES | 若架构方裁定「对象级点须经独立测绘/文献交叉验证方可用」，则 4 点降为不可用 → 变 PARTIAL |
| `HISTORICAL_MAP_READY` | PARTIAL | ① 采宽松读法（HR-06）→ **YES**（1754 图 + `original_map_narrative`）；② 发现任一绘有金泽的图 → 可升级并解锁 `anchor_points_only`；③ 取得疆域图非 471×445 的高分原版 |

> 无论采哪种读法，**「无任何地图可为金泽提供空间锚、配准一律不可行」不变** —— 该判定的**实质限制不随口径漂移**。

---

## 11. 未做（红线遵守）

未建路线 / 未收集视觉资产（`visual_assets` 仍 20）/ 未扩 Knowledge Weave / 未生成 Discovery / 未做 UI·Canvas·Agent Runtime / 未扩其他古镇 / 未改 migration 001–004 / 未实施 `evidence_gate_ledger` / 未改 Legacy / 未发布任何内容 / 未改 TASK-0005·0006 历史报告。

**未触碰 `vitest.config.ts`**（§10 警示的 TASK-0006 偏离未重演；该文件已含 `fileParallelism:false`，本任务无需再改）。

---

## 12. 变更文件与 commit

**入库（Git）**
- `pipelines/ingest/retrieve-amap-jinze.mjs`（新增，§10 允许）
- `tests/data/spatial-grounding.test.ts`（新增，§10 允许）
- `tasks/results/TASK-0007-result.md`（本文件）
- `tasks/TASK-0007-jinze-spatial-grounding-sprint.md`（架构方任务书，随任务入库）

**未入库（按项目设计 gitignored：`.gitignore:16 data/exports/*`）**
- `data/exports/jinze-spatial-inventory.md`
- `data/exports/jinze-object-coordinate-evidence.md`
- `data/exports/jinze-historical-map-audit.md`
- `data/exports/jinze-spatial-readiness.md`
- `data/exports/jinze-spatial-human-review.csv`

> `data/exports/**` 被 `.gitignore` 排除、仅保留 `.gitkeep`（TASK-0006 的报告同样未入库）→ **未强制 `-f` 添加**，保持项目既有约定。

commit：`<见提交后回填>`

---

## 13. STOP

本任务止于 TASK-0007。**未自行启动 TASK-0008。** 路线 / UI / Agent Runtime / Vertical Slice 一律未进入。
需求裁决：**HR-01…HR-06**（尤以 **HR-06 判据口径**与 **HR-02 镇锚口径**最影响后续任务）。
