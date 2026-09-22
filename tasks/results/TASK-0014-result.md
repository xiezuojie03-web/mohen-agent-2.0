# TASK-0014 Result — Experience Composition 2.0 & Surface Component System

- 任务书：`tasks/TASK-0014-experience-composition-2-surface-component-system-V1.1.md`（**V1.1 = 本轮唯一 Source of Truth；V1.0 已废止**）
- 就绪报告：`data/exports/jinze-experience-composition2-readiness.md`（本地产物，不入库）
- 截图证据：`data/exports/task-0014-captures/`（9 张，覆盖 §16 全部条目）
- 前置：TASK-0013 = PASS / FROZEN；本轮**未改动任何冻结语义与冻结 JSON**

## 1. 交付物

| 类 | 文件 |
|---|---|
| Eligibility 层（HARD RULE） | `packages/experience-engine/src/surface-eligibility.ts`（300 行：`SurfaceType` 19 / `WorldEvidenceState` / `SurfaceEligibility` / `SurfaceSelection` / `SELECTION_REASON` 常量表 / `evaluateSurfaceEligibility` / `selectSurfaces`） |
| Composition 层 | `packages/experience-engine/src/composition-recipes.ts`（109 行：6 个通用 Recipe + `resolveComposition`，只从 eligible 选） |
| Beat 层 | `packages/experience-engine/src/experience-beats.ts`（40 行：`BeatDefinition` / `validateBeatCoverage` / `beatForScene`，泛型保留调用方子类型） |
| 引擎导出 | `packages/experience-engine/src/index.ts`（追加 3 条 `export *`） |
| 表演编排 | `apps/web/app/experience/jinze-water-net/beats.ts`（151 行：`buildWorldEvidenceState` 适配器 + 5 Beat 表演数据 + 固定缺证据回应） |
| Reusable Surfaces | `surfaces/SpatialSurfaces.tsx`（412 行：CurrentMap / ApproximateArea / RelationalSpace 2.0 / HistoricalMapNative）+ `surfaces/EvidenceNarrativeSurfaces.tsx`（273 行：Timeline 2.0 / EvidenceReveal / ConflictCompare / SourceInspect / Question / Discovery / AgentPrompt / ActionDock / CurrentPhoto / BeforeAfter） |
| Registry | `surfaceRegistry.tsx`（87 行：19 个 surfaceType → 组件；ineligible 类型统一落 `UnknownGapSurface`；`resolveSurface` 对 ineligible 返回 null） |
| Shell | `ExperienceShell.tsx`（316 行，重写为 Beat → World → Eligibility → Recipe → Registry → Surface 驱动；偏好链受 eligibility 过滤） |
| 样式 | `experience.css`（新增 Composition 2.0 全套 + secondary/context 退让层） |
| 测试 | `tests/experience/composition2.test.ts`（525 行 / 25 用例，§15 全 25 条 + §5A.5 canonical cases）；`tests/experience/renderer.test.ts`（17 用例，随新组件布局同义更新）；`tests/e2e/experience.spec.ts`（重写为新 DOM 等价断言） |
| E2E + 截图 | `scripts/e2e-composition2-capture.mjs`（真实浏览器 25 断言 + 9 截图） |
| 只读取证 | `scripts/audit-readonly-invariants.mjs`（新增：published/orphan 只读快照，零写入） |
| 删除 | 旧 7 个被替代表面文件（ModernMap/RelationalSpace/Timeline/EvidencePanel/CurrentPhoto/TextFocus/SurfaceRenderer） |

## 2. §18 Required Metrics

| 项 | 值 |
|---|---|
| reusable Surface components | **15**（Spatial 4 + Temporal 1 + Evidence 4 + Visual 2 + Agent/Narrative 3 + UnknownGap 1） |
| Evidence-aware selection rules | **10 组确定性规则**，覆盖全部 **19** 个 surfaceType（每条必有 `reasonCode`；ineligible 必有 `blockedBy`） |
| eligible / blocked surfaces（冻结切片世界） | eligible **14** / ineligible **5**（`historical_map_georeferenced`、`historical_geometry`、`resolved_single_answer`、`historical_photo`、`before_after`） |
| Unknown / Question / Evidence-Gap fallback | 三态均可达且**有实现**：空证据→`unknown`；有冲突→`evidence_gap`；有历史关系→`question`；`unknown_gap` 恒 eligible（`WITHHOLDING_IS_LEGITIMATE`） |
| Composition Recipes | **6**（IMMERSIVE_SPATIAL / TIME_SHIFT / RELATION_DISCOVERY / EVIDENCE_FOCUS / RETURN_TO_PRESENT / DISCOVERY_QUESTION；无金泽场景名） |
| Experience Beats | **5**（01 Hook / 02 Time-Space Shift / 03 Relationship Discovery / 04 Evidence & Change / 05 Return & Next Question） |
| 8 semantic states → 5 Beats 映射 | s01→B01；s02→B02；s03·s04→B03；s05·s06→B04；s07·s08→B05（`validateBeatCoverage` 全覆盖且互斥，测试断言 errors=[]） |
| 每 Beat Primary Surface | s01 `current_map`；s02 `relational_space`；s03/s04 `relational_space`；s05 `conflict_compare`；s06 `timeline`；s07 `current_map`；s08 `discovery` |
| **每 Beat 默认可见 narrative 字符数** | B01 **0** / B02 **38** / B03 **48** / B04 **0** / B05 **44**；合计 **130** |
| 与 TASK-0013 对比 | TASK-0013 默认全量铺开＝**1550** 字符 → **130**，**降至 8.4%**（每 Beat 均严格下降：178→0、151→38、353→48、514→0、354→44） |
| 最大 simultaneous narrative blocks | 默认 **1**；揭示到底时 **4**（B04/B05） |
| progressive evidence reveals | **22** 条（B01 2 / B02 2 / B03 5 / B04 8 / B05 5） |
| Current Exact / Approximate / Relational 2.0 / HistMapNative | **YES / YES / YES / PARTIAL**（后者＝本机无合格史料图像，非实现缺失） |
| historical coordinate leaks | **0** |
| fabricated historical geometry | **0** |
| historical visual assets | **0**；current photos = 3（Commons confirmed，CC BY-SA） |
| AI historical visual paths | **0** |
| DB writes / migrations | **0 / 0** |
| Legacy writes | **0**（`git status --porcelain hushang-jingwei/data/seed.master.json` 为空） |
| published / orphan invariants | `claims_published=0` / `orphan_relation_audit=63`（与 TASK-0013 同值，未增加；只读快照取证） |
| tests | experience **43/43**（composition2 25 + renderer 17 + contract 1）；全量 **146/150** |
| 全量测试 4 例失败定性 | 全部为**已知环境限制**（node 自旋子进程 `spawnSync EBUSY`）：evidence-recovery #8 / human-review-s1 #11 / knowledge-weave #12 / spatial-grounding #16 —— **非回归**（与 TASK-0013 完全同一组） |
| E2E | `scripts/e2e-composition2-capture.mjs` **25/25 PASS**（真实 Chromium，`next start` 生产构建） |
| typecheck / build / guards | 6 workspace 全过 / `next build` 过（路由 prerender 成功，12.4 kB / 115 kB First Load）/ doc-budget + structure 全过 |
| capture paths | `data/exports/task-0014-captures/`（9 PNG） |
| tracked worktree | 见 §5（提交后 clean） |

## 3. 关键架构事实

1. **链路不可绕过**：`WorldEvidenceState → evaluateSurfaceEligibility → selectSurfaces → resolveComposition → Registry → Component`。Shell 里连「用户显式切换主角」（看时间变化／看今貌照片／寺的位置有多确定／看史料原页）与「Beat 的 primaryPreference」都要过 `isEligible` 过滤——**偏好不是许可证**（测试 §15-23/23b 用「把 current_map 设为偏好 + 空精确坐标」证明不会被选中）。
2. **「不画」是一等公民**：`unknown_gap` 有独立实现与文案（「这一刻，墨痕选择不画」），并说明三条理由（无历史几何不画河形/街形/点位、无历史视觉不伪造旧照、有未裁决冲突不代选边）。
3. **Geometry itself is a Claim 落地**：`historical_geometry` 恒 ineligible，`blockedBy` 含 `GEOMETRY_IS_A_CLAIM` 与 `current geometry must not inherit as historical geometry`；即便把 `hasHistoricalGeometry` 置 true 也不放行（测试双向断言）。
4. **Relational 2.0 是人文空间不是 Debug 图**：水道为 spine 宽幅、桥在带上「跨越」、水道名取切片 `canonical_label`；E1 实线 / E2·E3 虚线 / 缺失＝点线 + 「还没有一条线 · 这不是遗漏，是证据状态」；**同对节点的多条关系沿法线分配平行偏移**，对称镜像关系（同一主张两向各存一条）在展示层去重（切片条数不变）；文字用同底色 halo 保证互穿时可读。
5. **Surfaces 无镇级真相**：`surfaces/` 全目录源码对 `金泽|颐浩寺|万安桥|普济桥|金泽塘|朱家角|蔡浜|枪开河|青浦` **零命中**；名称来自 `slice.features[].canonical_label`，布局按 `feature_type` 确定性分配槽位，历史地图面板由 `world.historicalMapSource` + `slice.historical_sources` 驱动。测试 §15-2 静态断言把这条钉死。
6. **墨痕少说**：每 Beat 默认 1–2 句短发言（10–27 字），默认叙事块 ≤1，其余靠空间/时间/关系/证据的**状态变化**说话。

## 4. 本轮修复/发现（如实记录）

| # | 问题 | 处理 |
|---|---|---|
| 1 | `beatForScene` 非泛型，`BeatPresentation` 丢失子类型 | 改 `<T extends BeatDefinition>` 泛型 |
| 2 | Beat01 问题在 QuestionSurface 与 narrative 单元**重复出现** | 默认 unit 归零，问题只由 QuestionSurface 承担 |
| 3 | Beat04 默认铺出 5 条出处清单（`source_inspect` 作为 secondary 自动渲染） | Recipe 去掉 `source_inspect`；出处改由「看史料原页」显式打开，且该抽屉改为复用 Registry 组件；换场自动收起 |
| 4 | 「看事实」按钮重复出现（Beat actions 与 Shell 揭示按钮） | 从 Beat actions 移除，保留 Shell 的条件揭示按钮 |
| 5 | 关系图标签互相压叠（水道标签 / E2 标签 / 缺失标签 / 对称重合线） | 平行偏移 + band 避让 + 水道标签靠左 + halo 描边 + 对称去重 |
| 6 | 截图拍到点击后页面被滚动的位置 | capture 脚本截图前 `scrollTo(0,0)` |
| 7 | `tests/experience/renderer.test.ts` 5 例指向被删除的旧表面文件 | 同义改写为指向新组件（断言意图不变：关系面不碰坐标、冲突不替用户选边、解释框架身份、current photo 不做旧、Registry 分发） |
| 8 | 根级测试无法解析 `@mohen/experience-engine`（workspace 链接只在 apps/web） | `vitest.config.ts` 加显式 alias 到引擎源码 |
| 9 | `data/exports/` 里的临时查看目录 | 用后即删 |
| 10 | 22 个 TASK-0007/0009 期未跟踪探测脚本挡住 worktree clean | **不删除**：统一移入 `pipelines/historical-spatial/_probes/`（留痕）并加入 `.gitignore`；如需入库请明示 |

## 5. 提交

| commit | 内容 |
|---|---|
| `d7393cd` | TASK-0014 主体：Eligibility/Composition/Beat 引擎层 + Registry + 15 个可复用 Surface + Shell 重写 + 测试/E2E/截图脚本 + 报告 + `TASK-0013/0014` 任务书入库 + `_probes/` 忽略规则（28 files） |

- tracked worktree：提交后 `git status --short` 为空（tracked）；`_probes/` 按设计被忽略。
- DB / Legacy / 迁移：**零触碰**。

## 6. STOP

按任务书 §22：implementation、tests、E2E、human visual captures、result/readiness reports、commit、tracked worktree clean 全部完成后 **立即 STOP**。

**未启动 TASK-0015。**
