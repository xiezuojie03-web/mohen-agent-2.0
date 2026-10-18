# V1.4 组合批结果：第三层边界纠错 + 时间维度真实闭环（SAMPLE-TRIAL-14）

> 日期：2026-10-17
> 性质：授权内工程改造 + 真实生产（真实 DeepSeek 调用、真实写库）+ 真实预览自检
> 依据：任务书 V1.4 §七（Owner 拍板：组合批 = 第三层核心 + 时间维度；视觉维度分期；追加式重跑）
> 前置备份：`D:\MoHen\backups\SAMPLE-TRIAL-14_20261017\mohen_dev_preflight.dump`（custom 格式，pg_restore --list 实测可读；批次内两次实测恢复成功）

---

## 〇、一句话结论

**第三层第一次有了真实机器产出：生产链自己判出了"寺↔桥无据、拒绝建关系"，把水道名称分歧（秀州塘/金泽塘/市河）和普济桥方位分歧（南市/中部）原样并列登记而不裁决；时间维度从方志原文抽出 1260/1267/1962 真实年代并首次进入前端时间轴。s05 冲突并列、s06 时间轴、s08 未决问题、内容看板四新区全部接真实 read_model，20/20 自检通过；Agent 对"寺和桥有关系吗"不再答反（P0-1 数据级根治）。**

## 一、生产链改造（pipelines/data-production/adapters/layer1-adapters.mjs）

### 1.1 素材扩充（全部逐字取自沪上经纬人工裁决记录，零转述）
- 新增 4 个真实来源 6 段原文：上海图书馆开放数据·地名库（万安桥/迎祥桥条）、上海市青浦区人民政府（万安桥 2023、「遗珠拾粹」2025）、上海青浦博物馆（普济桥 2019）、江南古桥文化研究会（普济桥）。
- 携带真实着录分歧：水道名三变体（秀州塘/金泽塘/市河）、普济桥方位两说（南市/中部）、普济桥 1267 年号两源互证。

### 1.2 D03 扩展（W01/W02/W05/W09）
- **W02 时间**：只抽材料明文年代 → `world.changes`（precision: exact_year/era；"元代"按 era 不猜确年）。
- **W09 冲突**：`world.conflicts` 并列登记不裁决；conflict_key 对齐人工裁决编号（T11-C1 方位 / T11-C2 水道名称 / U4 年代口径），resolution_note 逐条对应人工裁决口径（含「秀州塘＋万安桥见于金山朱泾、疑跨镇误配」留档）。
- **W09 边界**：无据关系（寺↔桥）**明确拒绝**并登记 `meaning.open_questions`（finding_id 可空，属 D03 认识层产出）。
- **W01 临时实体**：水道名互斥且无法判定 → 建临时实体「桥所跨水道（名称待定）」，不静默合并名称、不生成任何河道几何。
- **护栏**：单一变体的"冲突"自动转登记为开放问题（精度缺口 ≠ 冲突）。

### 1.3 D04 扩展（A01/A10）
- 输入扩展为「关系 + 着录分歧 + 边界拒绝」；A10 冲突发现落 `meaning.findings`（counter_view_or_alternative / missing_evidence 如实登记）；对 refusals 不得生成"证实关系"类发现。
- 输出透传本 run 世界对象（entities/relations/changes/conflicts/refusals/evidences）。

### 1.4 D05 扩展（P03/P05/P02/P04/P06）
- **P03 时空投影（新发布类型）**：`world.changes` → `read_model.map_timeline_projections`（payload.events 带 entity/change_type/after_state/dynasty/year/precision）。
- **P05 探索路径（新发布类型）**：未决问题 → `read_model.discovery_paths`（steps[0] = 问题 + 缺证 + 状态 open）。
- **P02 世界投影**：payload 增挂结构化 `conflicts_detail` 与 `open_questions`（人话消费面）。
- **P04 agent_contexts**：summary 增补「着录分歧（未裁决）」与「已拒绝的无据关系」——Agent 对无证据关系必须回答"还没有登记"的数据基础（P0-1 数据级根治）。
- **追加式 supersession**：新 run 发布前将本切片此前 current_valid G5 决策（六类 × 双消费端）置失效（append-only 保留审计痕迹）；旧数据不叠加、不重复投影。
- 修复合批中实测发现的 3 个缺陷：`missing_evidence` jsonb 投射、`after_state` 透传丢失、单变体冲突误登记。

## 二、真实生产结果（run `ff11231a-424f-4277-9f90-173a70ad6dac`，status=PASS）

| 层 | 产出（本 run 新增） |
|---|---|
| L0 | 6 来源 / 10 片段（G0 PASS；旧 2 来源决策按 supersession 失效） |
| L1 | read_run + read_units（G1 PASS） |
| L2 | 10 条 material_evidence + mentions（G2 PASS） |
| L3 | **8 实体**（含临时水道实体；temporal_scope：万安桥≈1260 era、普济桥 1267 exact、迎祥桥 元 era、颐浩寺遗址 1260 exact）+ **10 关系**（含 3 条 spans_waterway）+ **4 时间变化** + **2 真实冲突**（T11-C1 3 变体 → 实收 2 变体、T11-C2 3 变体）+ **3 条寺桥关系拒绝**（G3 PASS） |
| L4 | 4 findings（含 A10 冲突发现）（G4 PASS） |
| L5 | world_projection ×1 + **map_timeline_projections ×1（历史首个）** + story_seeds ×4 + agent_contexts ×4 + evidence_pointers ×10 + **discovery_paths ×6（历史首个）**（G5 双消费端 PASS） |

- 开放问题 6 条：寺↔万安桥/普济桥/迎祥桥拒绝 ×3、普济桥方位、水道名称、万安桥 precision 缺口。
- 门禁：旧 run 全部 G5 current_valid=f；新 run 全部 t（supersession 生效）。
- 报告：`verification/data-production-runs/sample-trial-14/ff11231a-*.json`。

## 三、前端接线（真实优先、冻结降级，沿用 T4 模式）

| 面 | 改造 | 数据源 |
|---|---|---|
| `read-model-bridge.ts` | 新增 timeline / conflicts / openQuestions 三类读取（G5 · visual_stage · current_valid） | map_timeline_projections + world_projections.payload |
| s05 冲突并列 | 真实优先分支；保留 `conflict-<key>` testid 与「未裁决」文案；inspector 模式内部诊断标签保留（R3） | payload.conflicts_detail |
| s06 时间轴 | 新增 `ProductionTimeline`；era 显示「约」；无载年代不画（留白即诚实） | map_timeline_projections.payload.events |
| s08 发现 | 新增「仍未解决的问题 · 墨痕不装懂」区（含关系拒绝登记） | payload.open_questions |
| 内容看板 | 新增时间变化 / 着录分歧 / 未决问题三区（共六区） | 同上 |
| 谓词人话表 | 补 same_waterway_as「同跨一河」/ similar_form_to「形制相仿」/ built_on_site_of「建于其故宅」（前端 + Agent 检索两侧同步） | — |

顺带修复两个既存类型/路径缺陷（阻塞 typecheck）：`surfaces/types.ts` 相对导入路径、`ProductionRelationCanvas.tsx` filter 谓词类型。

## 四、验证

- **单元测试**：data-production 25/25；experience 144/146（2 失败为既存：spec 文档内容断言、迁移期 `seed.master.json` 工作区状态，均非本批）；隔离测试 `real_db_untouched=YES`（修复 `test-isolated.mjs` 对已 DROP 第一代表的失效引用后验证通过）。
- **e2e（playwright）**：3/4 通过（唯一失败为脚手架时代遗留 foundation 冒烟测试；experience.spec.ts 五幕 + recon-01 inspector 全过）。
- **真实预览自检（20/20 PASS）**：徽章「8 实体 · 10 关系」；s05 两张真实冲突卡（未裁决、带来源）；s06 真实时间轴（1260/约1260/1267/1962）；s08 寺桥拒绝登记；看板六区；Agent 三问（寺桥 → verdict=partial「已审核材料里还没有登记它们之间的历史关系」；姐妹桥 → 有据可依；水道问句 → 澄清不编造）。截图与结果 JSON：`D:\MoHen\selfcheck-14\`。

## 五、已知限制（留档，不冒充完成）

1. **Agent 意图词表未覆盖水道类问句**（"万安桥跨的是哪条河"未命中 relation 信号 → 转澄清）。澄清符合"不装懂"红线，且分歧数据已由 s05/看板完整呈现；词表扩展属 Agent 能力批次事项。
2. **视觉维度未启动**（按 Owner 拍板分期至下一批）：`world.visual_objects` 仍为 0，s01 照片仍为 Wikimedia 策展清单（冻结）。
3. 本批 LLM 输出存在自然波动（如迎祥桥"元代"在两次试跑中分别落为 era change 与开放问题）——均属诚实区间内，门禁与资格判定未受影响。

## 六、红线复核

真实写库前两次 preflight pg_dump 备份并实测可恢复；未碰 hushang-jingwei Production；未伪造历史（年代/分歧全部逐字来自原材料）；真实 G5 只来自真实生产（run ff11231a）；56 条 HOLD 未动；隔离测试证实真库一行未动。
