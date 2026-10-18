# 数据生产作业样板试验 · 第一步前置准备（评估 A/B/C）结果

> 日期：2026-10-16
> 任务窗口：数据生产作业样板试验 启动指令
> 批次性质：**技术性执行**（只读盘点 + 受控落地）；改库/LLM/G5 放行等决策项单列待 Owner 拍板
> 授权边界遵守：未触碰真实 LLM 接入、325/56 边改动、G5 放行、hushang-jingwei Production

---

## 一、评估 A：真实数据库盘点（逐表逐字段核对）

### A1. 总体结论
真实库 `mohen_dev` 已完成 ARCH-MIG-01 六阶段迁移：schema 完整、六阶段六门载体齐备、全部 36 表空（"水未灌"状态）。**结论：无 schema 缺口，不需要 DDL 改库。**

### A2. 盘点结果（6 schema / 36 表）

| schema | 表数 | 承载层（新分层） | 表名 |
|---|---|---|---|
| source | 7 | L0(D00) + L1(D01) | sources, source_versions, raw_items, read_runs, read_units, read_quality_checks, read_handoffs |
| evidence | 2 | L1↔L2(D01/D02) | material_evidence, read_unit_evidence_links |
| control | 3 | 门禁/审计 | gate_audits(22列), production_runs, owner_reviews |
| world | 14 | L3(D03) | entities, events, relation_claims, claim_revisions, changes, conflicts, claim_evidence_links, historical_space_claims, visual_objects, identity_decisions, identity_decision_evidence, provenance_assessments, dependency_edges, event_participations |
| meaning | 4 | L4(D04) | claim_revisions, findings, open_questions, present_connections |
| read_model | 6 | L5(D05) | world_projections, map_timeline_projections, story_seeds, agent_contexts, discovery_paths, evidence_pointers |

### A3. 关键核对项（全部通过）
- `control.gate_audits` = **22 列** ✓（原 11 列 + 11 追加审计列：architecture_generation/purpose/allowed_scope/consumer/dependency_snapshot/effective_time/input_fingerprint/output_fingerprint/rule_version/supersedes_id/current_valid）
- `gate_result` 枚举 = 五态 ✓（PASS/HOLD/REJECT/REVOKED/UNASSESSED）
- 旧门视图 g0–g4_pass_* 已 DROP ✓
- 第一代 public 37 表已 DROP ✓（无 public schema 残留）
- 全部 36 表 0 行 ✓（read_model 空、gate_audits 空，符合"水未灌"）

### A4. 改库清单
**表级结论：无表级缺口，无需改表。**（Owner 2026-10-16 已确认）

**⚠️ 字段级修正（2026-10-17 Owner 追问后重评）**：本结论仅覆盖"表级骨架"（6 schema / 36 表 / gate_audits 22 列）。经全 6 层契约逐字段核对，**字段级落点存在系统性缺口**（L2 缺 4 实体 + 8 列、L3 缺 world_decision_events + 多表字段不一致、L1/L5 靠 JSON 兜底），需执行**字段级改库**。详见 `SAMPLE-TRIAL-03_DB-FIELD-INTEGRITY_RESULT.md` 第四章清单。

需修正的口径（非缺陷）：任务书第六节"六 schema 24 表"是**第二代基线旧口径**。第三代 ARCH-MIG-01 迁移后实际为 **36 表** = 24 二代复用 + 4 L1 新表（read_runs/read_units/read_quality_checks/read_handoffs）+ 1 关联表（read_unit_evidence_links）+ 6 world 新表 + 1 meaning 新表。后续引用统一用"36 表"。（Owner 已认可口径更正：24 表 → 36 表）

待 Owner 确认的 1 处命名观察（已并入字段级评估）：`world.claim_revisions`（L3，10 列）与 `meaning.claim_revisions`（L4，8 列）同名，且 L3 侧字段名与契约不一致（见 SAMPLE-TRIAL-03）。

---

## 二、评估 B：前端 UI 支撑评估

### B1. 总体结论
现有前端**能展示一半**：检索层（`apps/web/lib/mohen-agent/retrieve.ts`）已正确切到 read_model 六表（不再查已删的第一代 public 旧表）；但金泽 water-net 的视觉舞台（地图/关系/时间轴/证据/实体卡）只读 5 个冻结 JSON，**不读 read_model**。

### B2. UI 补强清单（按严重度）

| 优先级 | 缺口 | 证据 |
|---|---|---|
| P0（根因） | 数据生产未产出 read_model 六表内容（无 G5 PASS）。上游抽取 + D05 发布组合未实现，检索恒空。**这正是第三步样板试验要解决的。** | `pipelines/data-production/adapters/d05-read-model-publication.mjs` 返回 `PUBLICATION_NOT_IMPLEMENTED` |
| P1 | 视觉舞台无 read_model 数据通道：所有可视面只读冻结 JSON，无组件接 read_model 六表 | `jinze-water-net/` 组件全部 `ctx.slice/ctx.script/culturalSource` |
| P2 | API 缺 visual_stage 分面端点：`retrieve.ts` 硬编码 `consumer='agent'`，`read-model-repository.mjs` 支持的双读 `visual_stage` 前端未接 | `retrieve.ts` 六路 UNION 均 `consumer='agent'` |
| P3 | read_model payload 字段（title/source_ref/time_hint/entities 等）无组件消费映射 | 仅 AskBar 材料列表用到，未映射到可视结构 |
| P4（一致性） | 冻结 JSON（008 副本）与未来 read_model 真源存在双事实源风险 | `jinze-cultural-world-008.json` 只读投影 vs read_model |
| P5（低） | 检索层 SLICE_TOWN/OTHER_TOWNS 过滤机制已空转 | `retrieve.ts` 行 256-258 |

---

## 三、落地 C：BR-M1 图谱工作台落地

### C1. 落地动作（已执行，字节校验通过）
已复制到 `specs/data-production/relations/`：

| 文件 | 大小 | SHA256（源=目标） |
|---|---|---|
| BR-M1图谱_V2.3_BR-M5_HR0方案B线型图例候选_V1.2.html | 431,988 B | 169935D1… ✓（Owner 已替换为正确版） |
| BR-M1_V2.1.4_325边正式审定注册表.csv | 603,980 B | D9D62650… ✓ |
| P5_0_56条延期关系逐ID处置台账_20261015.csv | 123,287 B | 60161689… ✓ |

红线满足：325 正式注册表字节未变（SHA256 一致）；未改任何边、未放行 56 条。

> **2026-10-16 Owner 勘误**：首次落地的 HTML 为错误版本（误标"P5方法设计已有界闭环"）。Owner 已把正确文件放入目录，经核实正确版修正为"P5方法**正在研究**，全部56条延期关系保持HOLD，真实G5和工程迁移HOLD"；"当前执行"链接亦由"09任务书"改为"P5启动任务书"。交付包根目录与 `relations/` 目录现已字节一致（均 431,988 B，SHA256 169935D1…）。

### C2. AI 技术验收（按任务书四项逐项核验）
| 核验项 | 结论 | 证据 |
|---|---|---|
| 证据版本 | ✓ | 325 注册表含 `review_version`（如 BR-M1-V2.1-B-C-20261011-AUTH01）、`approval_basis=METHOD_DESIGN_ONLY_CONDITIONAL_NOT_RUNTIME_G_PASS` |
| 用途范围 | ✓ | 每边含 `approval_scope`/`effective_scope`，区分设计层 vs 运行层 |
| G 资格 | ✓ | 工作台区分 G0–G5；56 台账 `p5_gate_decision=NO_RUNTIME_G5_DECISION`、`p5_formal_registry_state=DESIGN_HOLD_UNCHANGED`，明确非运行 PASS |
| 撤权传播 | ✓ | 台账含 `p5_evidence_and_qualification_test` + "P08 never self-revokes G5" |
| 状态标注 | ✓ | 头部/页脚明确"类型图≠已运行数据及审核""全部56条HOLD""此为类型设计，不是发布资格PASS" |
| P5 口径 | ✓ | 正确版修正为"P5方法正在研究"（非旧版误标的"已有界闭环"），与任务书"56 条 DESIGN_HOLD 因 P5 未设计完成"一致 |

### C3. 待 Owner 效果验收
视觉与交互清晰度（AI 无法替代）：请 Owner 浏览器打开 `specs/data-production/relations/BR-M1图谱_V2.3_BR-M5_HR0方案B线型图例候选_V1.2.html` 核验。

### C4. 发现的小缺口
工作台头部有 2 个相对链接指向交付包内文件（`墨痕_HR五阶段文件整编可视化目录_V1.6.html`、`01_V1.9全阶段研究基线_最新现行/08_P5_D05可信发布_启动任务书_V0.1.md`），真实仓库目前无此二文件，点击会 404。建议后续补录或改为说明文字（非阻塞）。

---

## 四、本批结论与下一步

**本批完成：** 评估 A（无改库缺口，Owner 已确认）、评估 B（UI 补强清单 6 项）、落地 C（工作台已落地 + AI 技术验收通过）。

**Owner 2026-10-16 已确认/勘误：**
1. BR-M1 工作台 HTML 已由 Owner 替换为正确版（P5 口径修正），AI 技术验收已更新。
2. "无需改库"结论 + 口径更正（24 表 → 36 表）已获 Owner 认可。
3. 进入第二步评估 D。

**本批未触碰（均留待授权/决策）：** 真实 LLM 接入、325/56 边改动与放行、真实 G5 放行、`activation.enabled` 转 true、hushang-jingwei Production。

**下一步：** 第二步评估 D（分阶段模型选型/性能/成本，供 Owner 决策，不擅自接 LLM）。
