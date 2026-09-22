# TASK-0015 Result — Humanistic Surface Visual Grammar + SpatialCanvas V1.0

- 任务书：`tasks/TASK-0015-humanistic-surface-visual-grammar-spatial-canvas-V1.0.md`
- 前置：TASK-0014 = PASS / FROZEN（本轮未推翻任何已冻结链路）
- 完成日期：2026-09-23
- 状态：**DELIVERED（STOP，未启动 TASK-0016）**

---

## §19 Result 量化

| # | 指标 | 实测值 | 说明 |
|---|---|---|---|
| 1 | 可复用空间原语种类（SpatialCanvas） | **10** | spine / node / relation / approximate / marker / extent / hatch / graticule / scalebar / northarrow |
| 2 | 视觉语义状态数（SEMANTIC_STATE_COUNT） | **27** | Epistemic 5 + Spatial（NodeRole 5 + RelationRole 4）+ Temporal 7 + Depth 6 = 27；同语法群内差异 ≥2 视觉变量 |
| 3 | SpatialCanvas 语义层 | **6** | frame / water / relations / nodes / annotations / labels（LAYER_ORDER 稳定） |
| 4 | 三 Surface 数据依赖（仅语义输入，无镇级事实） | — | CurrentMap V2：`current_sources`+`gcj02_bbox`+`gcj02_span_m`；Relational V3：`features.role`+`relations(predicate,epistemic_class)`+`optionalGroupIncluded`+`askedMissingRelation`；Timeline V3：`changes(feature_key,time_hint,state)`+`features` |
| 5 | 实际 current GIS 数据 | **6 源** = 2 point + 1 area + 3 town_ref；**水道/道路几何 = 0** | 见 §三边界；未虚构河道/道路 |
| 6 | historical geometry 条数 | **0** | 符合冻结纪律 `current geometry ≠ historical geometry` |
| 7 | 历史坐标泄漏 | **0** | Relational / Timeline 无任何 lat/lng；Current 仅用 GCJ-02 原值零换算，WGS-84 镇级参考锚分列隔离带不并入 |
| 8 | 默认可见 narrative 字符 | **≤130**（冻结基线，本轮未增文字） | TASK-0014 基线 130 可见 / 1550 全量 = 8.4%；TASK-0015 未增加正文，未用文字解决视觉问题 |
| 9 | Surface Registry 数量 | **21**（≥15） | REGISTERED_SURFACES 实测 21；composition2/visual-grammar 测试断言 ≥15 |
| 10 | eligibility 回归数 | **0** | 6 核心 Surface 仍 eligible；composition2.test 25 passed 未回归 |
| 11 | E2→E1 非法升级数 | **0** | 寺↔桥关系保持 E2（composition2.test 断言 `epistemic_class==="E2"`） |
| 12 | 编造关系数 | **0** | askedMissing 的寺↔桥只渲染「中断线 + 负空间」（`absent-relation`），不生成关系；回应「没有找到证据」 |
| 13 | DB / Legacy 写入 | **0** | 仅前端组件 + 脚本；未触碰主库 / Legacy / 迁移 |
| 14 | 测试 | 单元 **81 passed**；E2E **17/17 PASS**；截图 **8 张** | vitest tests/experience（renderer 17 + composition2 25 + visual-grammar 38 + contract 1）；Playwright 真实浏览器 8 步全绿 |
| 15 | 构建 | `next build` exit 0；`tsc --noEmit` exit 0 | 5 静态页，/experience/jinze-water-net 20.3 kB |

---

## 九门 Gate 结论（分别报告）

| Gate | 判定 |
|---|---|
| HUMANISTIC_VISUAL_GRAMMAR_READY | **YES** |
| SPATIAL_CANVAS_READY | **YES** |
| CURRENT_GEOGRAPHIC_SURFACE_V2_READY | **PARTIAL**（无可靠水道/道路几何 → 只画来源锚点+声明跨度，未虚构） |
| RELATIONAL_HISTORICAL_SURFACE_V3_READY | **YES** |
| TEMPORAL_LANDSCAPE_V3_READY | **YES** |
| CROSS_SURFACE_TRANSITION_READY | **YES** |
| EVIDENCE_AWARE_SURFACE_SELECTION_READY | **YES** |
| PATCH_NOT_REPLACE_UI | **YES** |
| HISTORICAL_MAP_NATIVE_PROTOTYPE | **PARTIAL**（原型，无合格史料图像，不配准不升级） |

**汇总：6 YES + 3 PARTIAL，0 NO。** 所有 PARTIAL 均因可靠数据边界，非实现缺陷，已如实上报，未隐藏。

---

## 交付物

- `apps/web/lib/mohen-visual/visual-grammar.ts`（Visual Grammar V1，27 状态，纯语义映射）
- `apps/web/lib/mohen-visual/spatial-canvas.tsx`（SpatialCanvas：6 层 / 10 原语 / 标签避让 / focus / uncertainty）
- `apps/web/lib/mohen-visual/label-layout.ts`（确定性标签避让单源）
- `apps/web/app/experience/jinze-water-net/surfaces/SpatialSurfaces.tsx`（CurrentMap V2 + Relational V3）
- `apps/web/app/experience/jinze-water-net/surfaces/EvidenceNarrativeSurfaces.tsx`（Timeline V3）
- `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx`（§10 转场：坐标失去历史定位资格持久标记）
- `tests/experience/visual-grammar.test.ts`（38 测试）
- `scripts/e2e-visual-grammar-capture.mjs`（E2E 17/17，8 截图）
- `data/exports/jinze-humanistic-visual-grammar-readiness.md`（就绪报告）
- `data/exports/task-0015-captures/`（8 张人工视觉验收截图）
- 本文件 `tasks/results/TASK-0015-result.md`

---

## 已知限制

1. Current Geographic V2 仅 PARTIAL：无可靠线面几何，现代地图为确定性矢量画布（锚点+跨度），非 GIS 大工程。
2. Historical Geometry 本轮仍 0：历史空间一律走拓扑/语义表达。
3. Relational V3 遮字硬验收为「设计意图 + 截图佐证」，严格人工遮字复核见截图 03/04。
4. Historical Map Native 仍 PARTIAL：原型，无合格史料图像。
5. 金泽仅作 fixture；Visual Grammar / SpatialCanvas 为通用资产，不含镇级事实。
