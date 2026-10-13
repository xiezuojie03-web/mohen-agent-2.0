# TASK-DATA-20261004 · C3 结果记录（关系编织与门禁投影）

- **任务书**：`tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md` · C3（Phase 1 · P1-5~P1-6）
- **执行日期**：2026-10-04
- **Registry 作业**：`unattended.relation-weave`（Skill：`mohen-knowledge-weave`）+ `unattended.gate-projection`（Skill：`mohen-project-guard`）；Entry 同为 `pipelines/legacy/unattended-runner.mjs`
- **模式**：DRY_RUN 先跑 → `MOHEN_WRITE_ENABLED=true` 实跑；`MOHEN_ENV=dev`
- **零自动晋级**：`rel_passed=0` / `promoted=0`；全局 `triage_outcome='auto'` = 0；`published=0`、`verified=0`、关系 `verified=0`

---

## 1. 完成判定（对照任务书 C3 验收）

| 验收项 | 结果 | 证据 |
|---|---|---|
| 实现 `unattended.relation-weave` | ✅ | 新增 `jobWeave`（`unattended-runner.mjs`）；RUNNERS 注册 `weave`；队列 kind 由 `resolution` 改为 `weave` |
| 实现 `unattended.gate-projection` | ✅ | 扩展 `jobGate`，新增 relations 门禁分支（G0–G6）+ L4-WEAVE 投影重建 |
| 先 DRY_RUN 再实跑 | ✅ | 两作业均先 DRY_RUN（weave 15:00、gate 15:20），后 WRITE（weave 15:13、gate 15:23） |
| `relations` 有数据 | ✅ | 2923 条候选关系（C2 产出）全部消费；`relation_evidence` 由 496 → **13091**（本批 +12595） |
| `evidence_ids` 绑定 | ✅ | `relations` 无 `evidence_ids` 列，按 C3 §8 走 `relation_evidence` 联结表；2923/2923 条关系完成绑定（100%），1880 条 ≥2 证据 |
| Read Model 投影更新 | ✅ | `knowledge_paths` 2931 条（其中 `L4-WEAVE` 2923）+ `knowledge_path_steps` 15544 步；重跑整批删除重建（幂等） |
| `evidence_gate_audit` 有记录 | ✅ | relation 门禁审计 **20461** 行（2923 × G0–G6）；`guard:promotion` `violations=0` |
| 无自动晋级 | ✅ | `rel_passed=0`、`promoted=0`、`rel_rejected=0`、`rel_held=2923`；97 条满足 E1 确定性条件但未开门控 → 全部 HOLD |
| `guard:registry` / `guard:structure` / `guard:promotion` 绿 | ✅ | `unresolved=0`；`skills=13 required=10`，Skill-作业绑定 8/8；`violations=0`、`db_checked=7` |
| `guard:review-triage` / `guard:source-gate` 绿 | ✅ | 分诊分布仅 hold/reject，auto=0；provider `resolved=22/22`、`unknown=0` |

---

## 2. 执行摘要（数字来自 runner `progress.json` 与 DB 复核）

### 2.1 `unattended.relation-weave`（实跑）

| 指标 | 数值 |
|---|---|
| 候选关系扫描 / 处理 | **2923** / **2923** |
| `relation_evidence` 绑定写入 | **12595** |
| 完成绑定的关系 | **2923**（100%）；其中 ≥2 条证据 **1880**（64.3%） |
| E1 桥—水—桥簇识别 | **183**（`review_queue.reason_code='E1_BRIDGE_WATER_CANDIDATE'`） |
| `legacy_mappings` 溯源（unattended-weave） | **2923**（`on conflict do nothing`，幂等） |
| `review_queue` HOLD | **2923**（全部 hold） |

### 2.2 `unattended.gate-projection`（实跑）

| 指标 | 数值 |
|---|---|
| 关系门禁扫描 | **2923**（全部；上限由 2000 提到 5000 以覆盖全量） |
| 新审计对象 / 审计行 | **2923** / **20461** |
| HOLD / AUTO / REJECT | **2923** / **0** / **0** |
| E1 确定性达标（可晋级候选） | **97**（未开 `MOHEN_ALLOW_E1_PROMOTE` → 全部 HOLD） |
| L4 投影路径 / 步骤 | **2931**（`L4-WEAVE` 2923）/ **15544** |
| 文化断言扫描（`cultural_relation_claims`） | 8 |

### 2.3 下游转化支撑（可视化报告）

- 产物：`tasks/results/TASK-DATA-20261004-C3-impact.html` + `.json`
- 关系构成：地点—地点 1768 / 建筑—地点建筑 868 / E1 桥—水—桥簇 287
- M1–M5 母题支撑量：M1 721 · M2 2780 · M3 2039 · M4 1896 · M5 2039
- 红线：verified 证据 0 / published 实体 0 / verified 关系 0 / 近 1 日 auto 分诊 0

---

## 3. 作业实现说明（代码落点：`pipelines/legacy/unattended-runner.mjs`）

### 3.1 `jobWeave` — unattended.relation-weave
- 消费 C2 候选关系（`relations.legacy_id like 'unattended-ce-rel:%'`、`status='candidate'`）及主体/客体实体名。
- ① **证据绑定**：在 `evidence`（`extraction_method='unattended-evidence-fragment'`）中查 `quote_text` 同时含主体名与客体名的片段 → 写 `relation_evidence(relation_id, evidence_id, 'supports')`，`on conflict do nothing`。
  （`relations` 表无 `evidence_ids` 列，故按 C3 §8 走联结表；这是任务书「evidence_ids 绑定」的落地形态。）
- ② **E1 簇识别**：主体/客体名满足「桥↔水」「桥↔桥」后缀启发式 → 标 `E1_BRIDGE_WATER_CANDIDATE`；其余标 `woven_relation_candidate`。
- ③ **幂等 + 溯源**：`legacy_mappings(legacy_source='unattended-weave', legacy_type='relation')` 标记，重跑跳过已处理关系。
- ④ **零晋级**：本作业 `truth_write_ceiling=0`，只写候选层；每条关系出生即带 `review_queue` HOLD。

### 3.2 `jobGate` 扩展 — unattended.gate-projection（relations 分支）
- G0/G4：有 `relation_evidence` 绑定即 pass，否则 fail → REJECT（`G0_NO_EVIDENCE_BINDING` / `G4_NO_EVIDENCE`）。
- G5：同主体-客体存在多谓词并列 → 判冲突 → HOLD（不自选边）。
- E1 确定性：`ev_count>=2 && 无冲突 && 主体/客体含 building` → 仅在 `MOHEN_ALLOW_E1_PROMOTE=true` 时 AUTO-PROMOTE，否则 `E1_PENDING_HUMAN` HOLD。
- **投影**：重建 `knowledge_paths`/`knowledge_path_steps`（namespace `L4-WEAVE`），每步带 `evidence_ids`；**不反写 Truth Store**。

### 3.3 报告
- `pipelines/legacy/unattended-report.mjs` 新增 `analyzeWeaveImpact` / `renderWeaveImpactHtml`，CLI 接线 `--stage C3`；与 C1/C2 共用 `donut/hbar/heatmap` 与同一套样式（同源渲染，避免漂移）。

---

## 4. 本轮修复的三个真实缺口（重要）

1. **队列 kind 错配**：`unattended-jobs.mjs` 中 `unattended.relation-weave` 原为 `kind:"resolution"`（会误路由到 `jobResolution`），而 registry 声明 `kind:"weave"`。`guard:registry` 要求队列↔registry 精确一致 → 已改为 `"weave"` 并新增 `weave: jobWeave` 到 `RUNNERS`。
2. **preflight 遗漏 `weave`**：`preflight` 的「无本地源文件的 DB 作业」放行清单里没有 `"weave"`，导致该作业落到「绑定单文件」分支、`j.file` 为 `undefined` 抛错被静默剔除（实测 `--only weave` 过滤为 0）。已把 `"weave"` 加入放行清单。
3. **C2 占位审计会让 C3 门禁变空转**：C2 给全部关系写过「占位 G0–G6 全 pass」审计，而 gate 原逻辑「曾被审计即跳过」，实测 `relations 2000 → 审计/分诊全 0`，C3 门禁对关系**根本没执行**。已修正：只把 `reason` 非 `C2-candidate-extraction%` 的审计视为「真正评估过」，C2 占位一律重评（与 C2 result.md「占位全 pass、晋级判定留待 C3」自洽）。同时门禁查询上限 2000 → 5000，覆盖全部 2923 条。

---

## 5. 已知限制与偏差（诚实记录）

1. **E1 AUTO-PROMOTE 的位置**：任务书把「E1 类确定性关系 AUTO-PROMOTE」写在 `relation-weave` 名下，但 registry 给 `relation-weave` 的 `truth_write_ceiling=0`（只写 candidate），`gate-projection` 才是 `ceiling=1` 的唯一晋级作业。故 **晋级逻辑落在 gate-projection**，且仍由 `MOHEN_ALLOW_E1_PROMOTE` 门控；C3 未开启该门控 → 97 条达标关系全部 HOLD。是否开启由拥有者裁定。
2. **证据绑定为文本共现回溯**（`quote_text` 同时含两实体名），属启发式：可能漏绑（异名/代词）与误绑（同名片段）。100% 绑定率说明启发式偏宽，须由人审/后续精确对齐收敛。
3. **E1 簇识别依赖桥/水后缀启发式**（287 条按类型组合、183 条按名称），非权威水系/桥梁拓扑；金泽「桥—水—桥」的真实拓扑需拥有者提供权威关系簇定义（registry 已把「关系簇定义变更」列为 stop_condition）。
4. **M1/M3/M5 母题支撑为「类型 × 亲和度」近似**，不代表已生成叙事；`cultural_*` / `historical_spatial_relations` 仍需 feature_key / slice 上下文，C3 未代写（沿用 C2 边界）。
5. **`relations` 全部仍为 candidate**（status 未变），投影在 L4 只读层；任何 Truth 晋级都待拥有者开门控 + 人审。

---

## 6. 下一步（C4 · 1246 图挖掘并入主线）

- C3 已交付：2923 条关系完成证据绑定（12595 条）、2923 条经 G0–G6 门禁评估并全部 HOLD、L4 投影 2931 路径 / 15544 步、零自动晋级。
- C4 复用 `mohen-visual-asset`（Entry 同为 `unattended-runner.mjs`，作业 `images-*`），按 `acquisition-intents.json` 的 `hushang-legacy-image-anchor` 归属做图-实体链接与资格判定，全部走三分诊；**不处置**冻结描述项（pending/excluded 状态表达收敛留 C6）。
- 按新 Auto-Chain 协议：C3 完成判定满足 → 自动续跑 **C4**。
