# 数据生产作业样板试验 · 第一步重做（评估 B + 落地 C）结果

> 日期：2026-10-17
> 批次：第一步前置准备 · 评估 B（UI 补强夯实）+ 落地 C（BR-M1 复核）
> 配套：字段级改库见 `SAMPLE-TRIAL-04_FIELD-LEVEL-DDL_RESULT.md`

---

## 一、评估 B：UI 补强夯实（金泽 water-net + AskBar + retrieve）

### B1. 现状复核（与首轮 P0–P5 一致，本轮无变化）
| 层 | 现状 | 证据文件 |
|---|---|---|
| 检索层 | 已正确切 read_model 六表，`join G5 PASS`、`consumer='agent'`；六路 UNION 单数 `object_type` 与 read-model-repository 的 kind 一致 | `apps/web/lib/mohen-agent/retrieve.ts` |
| AskBar 追问 | 走 `/api/mohen/ask` → `understand` → `retrieveMaterials` → `decideStep`，只读、零写库、库不可用 degraded 诚实告知 | `apps/web/app/api/mohen/ask/route.ts`、`AskBar.tsx` |
| 视觉舞台 | 仍只读 5 个冻结 JSON（`apps/web/data/experience/`），**不读 read_model**；`culturalWorldProjection.ts` 是纯函数只读投影 | `page.tsx`、`culturalWorldProjection.ts` |
| 双读仓储 | `read-model-repository.mjs` 已实现 `CONSUMERS=["visual_stage","agent"]` 双读，但 `retrieve.ts` 与前端均**未接 visual_stage** | `packages/data-access/src/read-model-repository.mjs` |

### B2. 反向验证结论：数据生产输出**能**支撑 UI，但有两条硬前提
1. **read_model 六表 → 组件映射是确定性的**（逐字段可核对），故数据生产输出能驱动舞台与 Agent 双消费者。
2. **硬前提**：`payload`(jsonb) 目前是自由 JSON、无 schema 约束——若 D05 写入的字段与 UI 读取的字段不齐，舞台仍会空转。必须把六表的 `payload` 结构**固化为约定 schema**（D05 写 / UI 读 同源），否则"骨架层落地"仍可能"前端看不见"。

### B3. 六表 → 组件 → 生产方法 映射（确定性核对的锚点）
| L5 表 | 需承载的 payload 关键字段 | 对应舞台组件（surfaceRegistry） | 生产方法 | LLM 成本 |
|---|---|---|---|---|
| `world_projections` | `title/entities/relations(subject,predicate,object)/geometry_hint/time_hint/source_ref` | RelationalSpaceSurface / CurrentMapSurface | P02 规则化 | 低 |
| `map_timeline_projections` | `title/time_series/spatial_anchor/entities/time_hint` | TimelineSurface / CurrentMapSurface | P03 规则化 | 低 |
| `evidence_pointers` | `display_locator(source_title,entities,time_hint)/display_excerpt` | EvidenceRevealSurface | P06 规则化 | 低 |
| `story_seeds` | `title/narrative_question/payload` | DiscoverySurface | P04 LLM 组合 | 中 |
| `agent_contexts` | `context_key/payload(summary,source_ref,entities)` | AskBar 追问回答 | P04+P07 | 中 |
| `discovery_paths` | `path_key/steps[]` | 探索路径编排 | P05 图算法 | 中低 |

### B4. UI 补强清单 → 可执行项（夯实结果）
| 优先级 | 缺口 | 可执行项（待第三步随数据生产一并落地） | 依赖 |
|---|---|---|---|
| P0（根因） | 数据生产未产出 read_model（无 G5 PASS） | 实现 `pipelines/data-production/adapters/d05-read-model-publication.mjs` 的 `publishReadModels`，真实写 read_model 六表并申请 G5 | 第三步样板试验 |
| P1 | 视觉舞台无 read_model 通道 | 新增 `apps/web/app/api/mohen/stage/route.ts`（只读，`consumer='visual_stage'`）；`page.tsx` 服务端改读该端点注入 `ExperienceShell`，替换冻结 JSON 入参 | P0 产出后 |
| P2 | API 缺 visual_stage 分面 | `retrieve.ts` 增加 `consumer` 参数（agent/visual_stage）复用 `read-model-repository`；或另建 stage 检索函数；舞台走 `visual_stage`、AskBar 走 `agent` | P1 |
| P3 | payload 无组件映射/schema | 为六表各自定义 payload JSON schema（字段名与 §B3 锚点一致），D05 写入与 UI 读取共用；新增 `stageProjection` 纯函数把 read_model payload 投影为 `SurfaceComponentProps` | P2 |
| P4（一致性） | 冻结 JSON 与 read_model 双事实源 | read_model 成为运行期唯一事实源后，冻结 JSON 降级为「离线/测试种子」并显式标注非真源；`jinze-cultural-world-008.json` 等在 read_model 就绪后移除运行时引用 | P0 产出后 |
| P5（低） | SLICE_TOWN/OTHER_TOWNS 过滤空转 | 删除 `retrieve.ts` 中 `void opts.town/opts.excludeTowns` 死代码；归属由 G5 `scope`/`audience`（payload）负责，不再做镇名硬编码排除 | 独立可做 |

> 落地顺序（与 SAMPLE-TRIAL-02 §8.3 成本平衡一致）：**骨架层（P02/P03/P06，≈0 LLM）→ 内容层（P04）→ 增强层（P05）**；P1/P2/P3（UI 通道）须与骨架层同步，否则 read_model 有产出前端也看不见。

---

## 二、落地 C：BR-M1 图谱工作台复核

### C1. 文件落点与字节不变（复核通过）
`specs/data-production/relations/` 三文件仍为 Owner 勘误后正确版，SHA256 与首轮完全一致：

| 文件 | 大小 | SHA256 |
|---|---|---|
| BR-M1_V2.1.4_325边正式审定注册表.csv | 603,980 B | D9D62650…B38 ✓ |
| BR-M1图谱_V2.3_BR-M5_HR0方案B线型图例候选_V1.2.html | 431,988 B | 169935D1…003 ✓ |
| P5_0_56条延期关系逐ID处置台账_20261015.csv | 123,287 B | 60161689…017 ✓ |

红线满足：325 注册表字节未变、未改任何边、未放行 56 条 HOLD。

### C2. AI 技术验收（四项，本轮复核通过）
| 核验项 | 结论 | 复核证据（本轮直接读 CSV） |
|---|---|---|
| 证据版本 | ✓ | 325 注册表 `review_version = BR-M1-V2.1-B-C-20261011-AUTH01` |
| 用途范围 | ✓ | `approval_scope` 分布：`DESIGN_CONDITIONAL_APPROVED`=201、`DESIGN_HOLD`=124；`approval_basis` 含"用户2026-10-11关系级范围授权" |
| G 资格 | ✓ | 56 台账 56/56 行 `p5_gate_decision=NO_RUNTIME_G5_DECISION`、`p5_formal_registry_state=DESIGN_HOLD_UNCHANGED`（明确非运行 PASS） |
| 撤权传播 | ✓ | 56 台账 `p5_evidence_and_qualification_test` 逐条保留（如 BR-E270"两分路独立 G5、消费者及权利匹配"、BR-E271"候选发现不得升级为事实结论"）；HTML 含 "HOLD" 31 处、"P5" 51 处标注 |

### C3. 待 Owner 效果验收（AI 无法替代）
请 Owner 浏览器打开 `specs/data-production/relations/BR-M1图谱_V2.3_BR-M5_HR0方案B线型图例候选_V1.2.html`，核验视觉与交互清晰度（线型图例可读性、P5"正在研究"口径呈现、56 条 HOLD 状态可视化）。

### C4. 首轮遗留小缺口（非阻塞，未变化）
工作台头部 2 个相对链接指向交付包内文件（`墨痕_HR五阶段文件整编可视化目录_V1.6.html`、`08_P5_D05可信发布_启动任务书_V0.1.md`），仓库内无此二文件，点击 404。建议后续补录或改为说明文字。
