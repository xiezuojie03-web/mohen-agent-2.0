# TASK-0015 — Humanistic Surface Visual Grammar & Spatial Canvas V1.0

**状态**：READY FOR EXECUTION  
**前置**：TASK-0014 = PASS / FROZEN  
**施工者**：WorkBuddy  
**原则**：研究可以并行，施工不要并行。完成后 STOP，不得自行启动 TASK-0016。

## 1. 任务目标

TASK-0014 已建立：`Evidence State → Surface Eligibility → Evidence-aware Selection → Composition → Registry → Surface`。

TASK-0015 不增加 Surface 数量、不扩 Evidence、不做“大 GIS”。本任务只解决：**同样正确的信息，怎样通过空间、时间、关系和状态变化，形成真正值得继续探索的人文体验？**

只升级三个核心 Surface，并建立可复用的 Humanistic Visual Grammar / SpatialCanvas：

- `CurrentMapSurface V2`
- `RelationalSpaceSurface V3`
- `TimelineSurface V3`

## 2. 核心冻结

长期链路必须保持：`Evidence State → Eligibility → Selection → Composition Recipe → Registry → Surface → Visual Grammar`。视觉层不得绕过 Evidence-aware Surface Selection。

Visual Grammar 至少稳定表达：certainty/uncertainty；current/historical；exact/approximate/relational；E1/E2/E3/missing；primary/secondary/context；emerging/fading/absent；evidence-backed/interpretation/unknown；spine/node/crossing/cultural node；continuity/change/destruction/reconstruction/unknown。

继续冻结 **Geometry itself is a Claim**：current geometry ≠ historical geometry；禁止当前坐标继承为历史位置；禁止伪造历史河道、道路、桥位、寺院点位；无 Historical Geometry 时继续使用 relational / approximate / native-map / unknown。

## 3. 范围

IN：Visual Grammar V1；SpatialCanvas；三个目标 Surface；三者转场；一个 very small current GIS/spatial slice；现有金泽体验作为验收样本；测试/E2E/截图；通用性检查。

OUT：新增 Surface；历史地图配准；Historical Geometry；PostGIS/QGIS 大工程；历史资料搜索；历史图片/AI 历史图像；Agent Runtime 重写；数据库重构；全站 UI Design System；移动端完整适配；TASK-0016。

## 4. Phase 0 — Baseline Guard

执行前确认 TASK-0014 commits 存在、tracked worktree clean、Legacy 零写，记录 tests/build 基线。若发现另一 session/process 正在修改同一 worktree，立即 STOP。不得删除历史文件来清环境。TASK-0014 的 15 Surfaces 与 eligibility/composition 链路视为冻结基础，只允许升级三个目标 Surface 的内部视觉实现和公共视觉基础。

## 5. Humanistic Visual Grammar V1

优先复用现有结构，禁止为了“架构漂亮”创建大量新包。

### Epistemic Grammar
支持 `FACT/EVIDENCE_BACKED`、`INTERPRETATION_CANDIDATE`、`UNKNOWN`、`CONFLICT`、`EVIDENCE_GAP`。差异不得只靠 badge 或颜色，至少组合 stroke/opacity/fill/rhythm/prominence 中两种以上变量，同时保留文字可访问标签。

### Spatial Grammar
支持 `spine`、`crossing`、`node`、`cultural_node`、`approximate_area`、`relation_confirmed`、`relation_candidate`、`relation_missing`。Relational Space 不得表现成普通知识图谱。

### Temporal Grammar
支持 `continuity`、`appearance`、`change`、`destruction`、`reconstruction`、`unknown`、`return_to_present`。时间不得只是年份卡片列表。

### Composition / Depth Grammar
支持 `primary`、`secondary`、`context`、`emerging`、`fading`、`inactive`。视觉层级承担叙事，不靠新增正文。

## 6. SpatialCanvas

建立最小可复用 SpatialCanvas：stable coordinate/view space、semantic layers、focus/de-emphasis、transitions、basic label collision、uncertainty rendering、spatial primitives、deterministic rendering。

禁止镇级节点坐标进入通用 Canvas；禁止 Surface 硬编码镇名；禁止为了截图写死位置；禁止 historical relation 转成伪经纬度。

## 7. CurrentMapSurface V2 — tiny GIS

把工程网格推进为第一代真正的 Current Geographic Surface，只表示“今天”。优先使用仓库已有且 provenance 可追的 current provider coordinates、水道/道路/POI 数据和当前对象锚点，不扩大外部数据采集。

先检查 repo 是否已有 MapLibre/map stack。若已有且可稳定离线/本地运行，可复用；若网络瓦片或底图不可靠，**不得让瓦片阻塞任务**，改做 deterministic vector geographic canvas。只有可靠数据才画 waterway/road/context line；否则宁可抽象，也不能编造。

必须保留 Current/Today 与 CRS 语义；不得把 current map 延伸成 historical map。

## 8. RelationalSpaceSurface V3 — 最高优先级

目标：从“知识图谱感”升级为 **Topological Humanistic Space / 人文拓扑空间**。

必须保持：无经纬度、无距离表达、无方向冒充历史事实、水道仅为 semantic spine 而非 historical geometry、E1/E2/E3/missing 清晰、寺↔桥缺证时仍表现“没有已证实的线”、E2 永不升 E1。

视觉上：水道 spine 成为构图骨架；crossing node 与 cultural node 角色不同；confirmed relation 稳定；candidate relation 可追问但未落定；missing relation 成为有意义的 negative space/interrupted relation；支持 progressive reveal 和 focus 转移；标签不能成为主视觉。

**人工硬验收**：遮住解释文字后，仍应大致看出“水系骨架—两桥与水强关系—寺进入同一探索空间—寺桥关系未证”。否则不通过。

## 9. TimelineSurface V3 — Temporal Landscape

从“年份标题 + 资料卡”升级为 **Temporal Landscape / 时间景观**。仍以冻结切片为准，不因本任务修改史实。

时间必须是连续结构；object lifeline/event marker/rupture/reconstruction 有不同语法；unknown 可合法占据时间结构；可聚焦对象，其余退为 context；Relational Space → Timeline → Return to Present 有状态连续性；禁止靠大量新增正文解释。

## 10. Cross-Surface Transition

至少走通：`Current Geographic → current geometry fades → Relational Historical → relationship discovery → Temporal Landscape → Return to Present`。

Surface 可换但 Experience 不重启；transition 必须表达 epistemic change，不只是 CSS 动画；当前坐标退出时失去历史定位资格；回到今天可恢复 Current Geographic；Patch 行为不得回归。

## 11. GIS 边界

本轮只解决：**让 Current Geographic 更像真实地理空间，并为未来 Spatial Intelligence 留接口。** 如需 GIS adapter，只允许极小实现并说明 input/CRS/provenance/output/confidence。不得引入 PostGIS migration、historical reconstruction、georeferencing workflow、spatial inference、route engine、bulk GIS pipeline 或大型 GIS 依赖。

## 12. 文字预算

TASK-0014 减量成果冻结：默认 narrative 总量不得明显高于 130 字符；每 Beat 默认 block ≤1；Evidence 继续 progressive reveal；墨痕短句；增加视觉表达不得靠增加解释正文。

## 13. 通用性红线

三个目标 Surface、新 Visual Grammar、SpatialCanvas 不得硬编码 `金泽/万安桥/普济桥/颐浩寺/金泽塘`；不得存在 `JinzeVisualGrammar/JinzeSpatialCanvas`；不得通过 sceneId 决定视觉真相；金泽只能作为 fixture/adapter。增加静态扫描测试。

## 14. 测试要求

至少覆盖：CurrentMap 只消费 current geometry；历史场景不继承 current coordinates；Relational Space 无 lat/lng；E1/E2/E3/missing visual state 不同；E2 不变 confirmed；missing 不生成伪 relation；approximate/unknown 无 exact marker；destruction/reconstruction 状态不同；unknown temporal 合法；无年代断言不伪造时间；Visual Grammar/SpatialCanvas 无镇级事实；TASK-0014 eligibility 不回归；Registry 不少于 15；narrative budget 不回升；Patch not Replace；URL 不 reload；ExperienceState/trail 保持；deterministic render；DB/Legacy/migration 零；historical geometry fabricated=0；historical coordinate leak=0。

## 15. 人工视觉验收

至少 8 张：Current Geographic；Current→Historical 退场；桥—水关系空间；寺进入+未证关系；relation focus/progressive reveal；Temporal Landscape 全局；1938→1992 temporal focus；Return to Present。

验收重点：比 TASK-0014 更少 Debug View 感；有空间层级和时间流动；不靠大段文字；已证/候选/未知可辨；保持证据诚实；仍是连续 Experience 而非页面轮播。

## 16. Gates

必须报告：

- `HUMANISTIC_VISUAL_GRAMMAR_READY`
- `SPATIAL_CANVAS_READY`
- `CURRENT_GEOGRAPHIC_SURFACE_V2_READY`
- `RELATIONAL_HISTORICAL_SURFACE_V3_READY`
- `TEMPORAL_LANDSCAPE_V3_READY`
- `CROSS_SURFACE_TRANSITION_READY`
- `EVIDENCE_AWARE_SURFACE_SELECTION_READY`
- `PATCH_NOT_REPLACE_UI`
- `HISTORICAL_MAP_NATIVE_PROTOTYPE`

均为 YES/PARTIAL/NO，不得隐藏 PARTIAL。

## 17. PASS 标准

三个核心 Surface 明显脱离 TASK-0014 的 debug/prototype 表达；Visual Grammar 可复用；SpatialCanvas 无场景真相；Relational Space 形成“人文拓扑空间”；Timeline 形成“时间景观”；Current Geographic 比工程网格更接近真实空间；三者连续转场；Evidence/uncertainty/geometry 红线保持；不依赖大规模新数据工程；tests/build/E2E/screenshots 有证据；tracked worktree clean。

若 Current Geographic 因可靠几何不足只能 PARTIAL，但另外两项成立，应如实报告，不得伪造 GIS 数据换 PASS。

## 18. 交付物

任务书入库；Visual Grammar；SpatialCanvas；三个目标 Surface；transition；tests；E2E/capture script；≥8 screenshots；`data/exports/jinze-humanistic-visual-grammar-readiness.md`；`tasks/results/TASK-0015-result.md`；必要时更新 CONTEXT；Git commit(s)；tracked worktree clean。

## 19. Result Report 量化

报告 reusable visual primitives、visual semantic states、SpatialCanvas layers、三个 Surface 数据依赖、实际 current GIS/geographic data、historical geometry count、historical coordinate leaks、visible narrative chars、Registry count、eligibility regressions、E2→E1 promotions、fabricated relations、DB writes/migrations、Legacy writes、tests/E2E/screenshots、known limitations。

## 20. STOP

完成 implementation、tests、E2E、人工截图、readiness、result、commit、clean 后立即 STOP。不得顺手开 TASK-0016、补 Historical Map、做 route/QGIS、扩大采集、新增 Surface、重构数据库或修改 Legacy。等待架构验收。
