# 数据底座建厚实 · 任务书（C）

- **创建**：2026-10-04
- **目标**：把数据底座做厚做实——先深透老项目（沪上经纬 2596 文件，核心 2038 PDF + corpus 抽取），再外部扩源（R19 闸门），底座达标后做 Human Experience 验收。
- **前置（已完成）**：能力治理（Skill 实体化 + 三向绑定 + 守卫强制），见 `tasks/results/SKILL-GOVERNANCE-20261004-result.md`（已提交 c033954）。**机器已修好**：本任务严禁新增散落脚本，一律复用既有技能或按 R26 新建并登记。
- **依据**：`specs/data-production/MoHen_Data_Production_Protocol.md` V3.0、`specs/data-production/墨痕_数据生产机制_宽进与广联详细协议_V1.0.md`、`tasks/DB-PRODUCTION-IMPROVEMENT-PLAN.md`（详细设计，本任务书只转述执行阶段）。
- **指针登记**：`CURRENT.md` §7。
- **执行纪律（贯穿全部阶段）**：宪法约束 R6 本地主库 / R15 证据门禁 / R18–R20 数据主线 / R25 图解冻 / R26 复用优先；**零自动晋级**（`entities.published=0`、`evidence.verified=0`）；每批独立 `ingest_run_id`；`DRY_RUN` 默认；`review_queue` 三分（`triage_outcome`）留痕。
- **每阶段完成 → 自动续跑（Auto-Chain）**：完成一项后系统在本会话内自动登记并启动下一阶段任务（见「🔗 自动续跑协议」），不再要求拥有者手动新开对话。各任务结果标准不变（见通用验收标准）。

---

## 验收标准（数据生产类任务通用 · 与协议 §0.4/§0.5 对齐）

每次数据生产（C1–C6 各阶段）的**完成判定不得只看数字变化**（如"新增 N 条"），必须附一份**下游转化支撑可视化报告**，回答"这次生产给未来叙事提供了多少真实可用的数据"。报告由 `pipelines/legacy/unattended-report.mjs --impact` 生成（单文件离线 HTML，零外部依赖），至少包含：

1. **语料类别分布**：覆盖哪些一手来源（诗词/宗族/人物/事件/方志/地名/文保…）及各占比；
2. **可转化信号密度**：时间/空间/人物/关系信号的命中量与占比（启发式，用于预估下游候选抽取可消费量）；
3. **叙事母题支撑矩阵**：本批数据对 M1–M5 五个叙事母题（定义见 `specs/experience-ui/MoHen_Narrative_Motif_Framework.md`）的支撑量热力图；
4. **下游候选产出预估**：供 C2 candidate-extraction 消费的时间/空间/人物/关系候选信号体量（明确标注"信号命中数≠已落库候选"）；
5. **红线与质量校验**：locator 完整率、verified/published=0、auto 分诊=0、review_queue HOLD 数。

> 该报告与 runner 生成的 `report.json/html` 同源互补，是协议 §0.5「只报'落库新增 N 条'不算有效生产」的落地视图。通用生成器已写入 canonical 入口（`pipelines/legacy/unattended-report.mjs`），后续阶段直接复用，不另写散落脚本。

---

## 🔗 自动续跑协议（Auto-Chain · 替代"新开对话"纪律）

**目标**：把原本"每阶段=一次对话、完成→提醒拥有者新开对话"的手动接力，改为**完成一项后自动新建并续跑下一项**，全程在本会话内连贯执行；同时**不降低任何单任务结果标准**。

### 续跑规则
1. 完成阶段 C(n) 且满足其全部「完成判定」（含下游转化支撑可视化报告 + `*-result.md` + 守卫绿 + 零自动晋级）后，agent 立即：
   - 在「进度表」将 C(n+1) 状态置为「进行中」，并写入新建任务的起始时间戳；
   - 直接以 C(n+1) 内容作为当前任务继续推进，**不等待、不提示拥有者新开对话**。
2. 每个新建任务沿用原阶段定义的目标 / 范围 / 落地方式（R26）/ 验证 / 回滚 / 完成判定，**结果标准与原任务书完全一致**：仍须产出 `tasks/results/TASK-DATA-20261004-C{n+1}-impact.html` + `tasks/results/TASK-DATA-20261004-C{n+1}-result.md` 并更新进度表。
3. 跨阶段衔接仍通过本任务书 + `production-registry.json` + `skills/` 实体化档案，不依赖会话上下文（与原设计一致，仅去掉"手动新对话"这一步）。

### 安全闸门（不可逾越）
- **DRY_RUN 门禁失败即停**：任一阶段在实跑前 DRY_RUN 或 `guard:*` 校验不绿，**自动续跑必须中断**，把阻塞点显式上报给拥有者，待裁定后再续；严禁带病续跑。
- **零自动晋级红线**、每批独立 `ingest_run_id`、`review_queue` 三分 等宪法约束对每一续跑任务同样绝对生效。
- 拥有者可在任意阶段用一条指令中止续跑（如"停在 C4"），续跑协议尊重即时指令。

### 模型选择规则（按时间 · 固定 \mohen-agent-2.0 工作区）
- 每个新建 / 续跑任务按**实际开始时刻**选择模型：本地时间 **< 23:00 → HY3**；**≥ 23:00 → HY4**。
- 所有任务均在 `\mohen-agent-2.0` 工作区下执行（路径固定，不跨空间）。
- **模型校验闸门**：进入下一阶段前，agent 比对"当前会话运行模型"与"本阶段首选模型"：
  - 一致 → 本会话直接续跑；
  - 不一致 → 自动续跑**暂停**，输出交接说明（注明所需模型 ＋ 本任务书路径），由以对应模型新开会话继续；**严禁跨模型强行续跑**（避免模型能力错配导致门禁 / 抽取质量风险）。

### 进度表即续跑指针
进度表是自动续跑的唯一真相源（SOT）：状态列驱动"下一个该跑谁"，完成记录列驱动"已交付什么"。agent 每完成一项即更新该行，并据其决定下一跳。

---

## 0｜范围与硬边界（不可逾越）

**冻结项（只测量、不处置）**：既有 1246 张夜跑图 `visual_assets` 中 `pending 1212 / excluded 68` 的数据处置（C4 仅处理 R25 解冻的部分，不处置冻结描述）；`historical_features` 切片 `SHL-LEGACY-COORDS`（全零证据）；`visual_assets.depicted_period` 写死；ESC-04 数据部分。

**A 组待拥有者裁定（不擅自动）**：RECON-02 命名分叉、ESC-02 双 relation 存储、ESC-03 `modern_location` 落位、ESC-05①③。

**零自动晋级红线**：任何阶段都不得违反；候选层写入必带 `review_queue` 三分 ＋ `ingest_run_id`。

**可处置范围（本任务主体）**：老项目 PDF/corpus 抽取、1246 图（R25 解冻部分）、外部扩源、B/E 组闭合。

---

## 阶段总览（按工作量拆分 · 每阶段一次对话）

| 阶段 | 内容 | 对应 DB 计划 | 核心产出 |
|---|---|---|---|
| **C1** | 老项目抽取（source-refresh ＋ evidence-fragment） | Phase 1 · P1-1~P1-2 | `evidence` / `evidence_fragments` 有老项目 PDF/corpus 来源内容 |
| **C2** | 候选抽取与确定性对齐（candidate-extraction ＋ deterministic-resolution） | Phase 1 · P1-3~P1-4 | `entities`/`relations` 候选表有数据 ＋ `legacy_mappings` 精确对齐 |
| **C3** | 关系编织与门禁投影（relation-weave ＋ gate-projection） | Phase 1 · P1-5~P1-6 | `relations` 有数据 ＋ Agent Read Model 投影更新 ＋ `evidence_gate_audit` 有记录 |
| **C4** | 1246 图挖掘并入主线（R25 解冻） | — | 图-实体链接 ＋ 资格判定，按三分诊留痕 |
| **C5** | 外部扩源（R19 闸门：先证明老项目价值再扩） | Research 子线 | 新来源接入，底座做厚 |
| **C6** | 验收与常态化（B/E 组闭合 ＋ 守卫全绿） | Phase 2/3/4 | `guard:*` 全绿 ＋ 数据量达标 ＋ Human Experience Gate 前置满足 |

> 每阶段目标 / 范围相互独立，但按 Auto-Chain 在本会话内自动续跑；跨阶段仍通过本任务书 + `production-registry.json` + `skills/` 实体化档案衔接，不依赖会话上下文（仅去掉"手动新对话"这一步）。

---

## C1 · 老项目抽取（source-refresh ＋ evidence-fragment）

**目标**：让老项目 2038 PDF ＋ corpus **真正产出 Evidence Fragment**（当前几乎只有 `source_records`，无 evidence fragment）。这是后续候选/关系的前提。

**范围**：
1. 实现 `unattended.source-refresh`：增量刷新已知 S1（上图/方志·寺观卷·津梁卷·寺志）/ S2（Wikimedia/IA）来源；接入 `pipelines/legacy/unattended-jobs.mjs` 队列（加 `unattended.source-refresh` 作业 id），runner 增加 `source-refresh` 分发；gate 同 `src-*`（库层唯一约束 ＋ `guard:source-gate`）。
2. 实现 `unattended.evidence-fragment`：从已入库 `source_records` / PDF / corpus 抽 Evidence Fragment（`locator` / `page` / `quote` / `source link`）；写入 `evidence` ＋ `evidence_fragments`；`locator` 缺 → G0 HOLD。

**落地方式（R26 铁律）**：
- 在 `specs/data-production/production-registry.json` 登记这两个 job ＋ `implementation: { skill, entry }`（建议 skill=`mohen-evidence-gate`，entry 复用 `pipelines/legacy/unattended-runner.mjs`）；若确属新能力则新建 `skills/<name>/SKILL.md` 含 §9.1 最小合同 ＋ 实体化档案。
- `skills/mohen-evidence-gate/SKILL.md` 实体化档案同步补 `unattended.source-refresh` / `unattended.evidence-fragment` 作业行。
- **禁止**在根目录丢一次性脚本（`guard:structure-map` 会红）。

**验证**：`MOHEN_WRITE_ENABLED=true` ＋ `MOHEN_ENV=dev` 前先 `DRY_RUN`；`guard:registry` / `guard:source-gate` / `check-structure` 绿；`review_queue` 三分；0 自动晋级。

**回滚**：每批独立 `ingest_run_id`，按 run_id 范围 `DELETE`（协议 #7：Raw 不删）。

**完成判定**：`evidence` 表出现老项目 PDF/corpus 来源的 fragment，且 `locator` 完整率达标（无大量 G0 HOLD）；**并产出下游转化支撑可视化报告**（见通用验收标准），见 `tasks/results/TASK-DATA-20261004-C1-impact.html`。

> ✅ **本阶段完成后**：满足全部完成判定（含下游转化支撑可视化报告）即自动续跑 **C2**（候选抽取与确定性对齐）——更新进度表「C2 → 进行中」→ 本会话直接开始 C2 任务，不提示新开对话。若 DRY_RUN / 守卫门禁失败则中断上报。

---

## C2 · 候选抽取与确定性对齐（candidate-extraction ＋ deterministic-resolution）

**目标**：从 evidence 抽 Entity / Time / Place / Relation 候选，并做精确 ID 对齐（吕颐浩 Wikidata ID、双桥 strong ID）。

**范围**：
1. 实现 `unattended.candidate-extraction`：从 evidence 抽候选，写入候选库各表（`entities` / `claims` / `cultural_*` / `discovery_candidates` / `historical_spatial_relations` / `relations`）；随生 `review_queue` 三分（`guard:triage`）。
2. 实现 `unattended.deterministic-resolution`：精确 ID / 强一致对齐；输出 canonical ＋ alias（落 `legacy_mappings`），歧义一律 HOLD。

**落地方式（R26）**：登记 job ＋ `implementation`（skill=`mohen-evidence-gate` 或 `mohen-knowledge-weave`；entry 复用 runner）；同步 `SKILL.md` 实体化档案。

**验证**：DRY_RUN 先；`guard:registry` / `guard:structure` / `guard:review-triage` 绿；候选表有数据且不重复（去重依赖既有 `tools/production/check-evidence-dupes.mjs`，但**不得**为去重另写脚本）。

**回滚**：run_id 范围 DELETE。

**完成判定**：`entities` / `relations` 候选表有老项目来源数据，`legacy_mappings` 记录精确对齐，歧义进 HOLD 不自选边。

> ✅ **完成后**：自动续跑 **C3**（关系编织与门禁投影）——更新进度表并本会话直接开始，结果标准不变。DRY_RUN / 守卫失败则中断上报。

---

## C3 · 关系编织与门禁投影（relation-weave ＋ gate-projection）

**目标**：把候选织成可信关系，并经门禁投影到 Agent Read Model。

**范围**：
1. 实现 `unattended.relation-weave`：金泽关系簇（E1 桥—水—桥）＋ M1/M3/M5 候选生成 relation candidate ＋ `evidence_ids` 绑定；E1 类确定性关系 AUTO-PROMOTE，历史因果/跨源冲突 G5 HOLD。
2. 实现 `unattended.gate-projection`：执行 G0–G6 → AUTO/HOLD/REJECT → 刷 Agent Read Model；晋级须有 `evidence_gate_audit`（C3 §4.2 R15），Projection 不反写 Truth Store。

**落地方式（R26）**：登记 job ＋ `implementation`（skill=`mohen-knowledge-weave` / `mohen-project-guard`；entry 复用 runner）；同步 `SKILL.md`。

**验证**：DRY_RUN 先；`guard:promotion` 报违规行数趋零；`evidence_gate_audit` 对 `cultural_*` 有覆盖（C2 §2）；`guard:registry` 绿。

**回滚**：run_id 范围 DELETE；Projection 不反写 Truth Store（回滚只清投影）。

**完成判定**：`relations` 有数据，Read Model 投影更新，`evidence_gate_audit` 有记录，无自动晋级。

> ✅ **完成后**：自动续跑 **C4**（1246 图挖掘并入主线）——更新进度表并本会话直接开始，结果标准不变。DRY_RUN / 守卫失败则中断上报。

---

## C4 · 1246 图挖掘并入主线（R25 解冻）

**目标**：把 1246 张图（R25 解冻）并入数据挖掘主线，建图-实体链接与资格判定。

**范围**：
- 复用 `mohen-visual-asset` 技能（entry=`pipelines/legacy/unattended-runner.mjs`，作业 `images-*`）；按 `acquisition-intents.json` 的 `hushang-legacy-image-anchor`（image_source 锚点）归属，避免误挂。
- 图-实体链接 ＋ 资格判定，全部走 `review_queue` 三分；**不处置**冻结描述项（pending/excluded 的状态表达收敛见 C6）。

**验证**：`guard:source-gate`（image_source 锚点已登记）/ `guard:registry` 绿；图-实体链接有 `evidence_ids`。

**完成判定**：1246 图中解冻部分完成链接 ＋ 资格留痕，无自动晋级。

> ✅ **完成后**：自动续跑 **C5**（外部扩源）——更新进度表并本会话直接开始，结果标准不变。DRY_RUN / 守卫失败则中断上报。

---

## C5 · 外部扩源（R19 闸门：先证明老项目价值再扩）

**目标**：在老项目已产可信数据的前提下，规模化接入外部来源，把底座做厚。

**范围**：
- **闸门（R19）**：必须先用 C1–C4 结果证明老项目已产可信数据（evidence 量 / 候选量 / 关系量达标），方可规模化扩源；扩源同样走 `production-registry.json` 登记 ＋ `implementation` 三向绑定。
- 候选外部源：Wikimedia / Internet Archive 扩展、地方志数字化外部源、Wikidata 扩展属性。
- 每个新源按 R26 登记 skill ＋ entry，不新建散落脚本。

**验证**：闸门前置达标判定先过；`guard:registry` / `guard:source-gate` 绿；新源 evidence 带 `review_queue` 三分。

**完成判定**：底座来源数与规模显著增厚，且每源可溯源、可回滚。

> ✅ **完成后**：自动续跑 **C6**（验收与常态化）——更新进度表并本会话直接开始，结果标准不变。DRY_RUN / 守卫失败则中断上报。

---

## C6 · 验收与常态化（B/E 组闭合 ＋ 守卫全绿）

**目标**：数据底座达标，守卫全绿，Human Experience Gate 前置条件满足。

**范围**（对应 DB 计划 Phase 2/3/4）：
- **B 组（库层强制）**：R15 第二批晋级闸门（`entities`/`evidence`/`cultural_*`/`historical_*`/`relations` 补晋级触发器）；`evidence_gate_audit` 覆盖 `cultural_*`；状态表达收敛到 C3 §4.1 单一状态机。
- **E 组（标识符）**：`entities.canonical_name` 重名 resolution（结合 `identifier-registry.json`）；provider 字符串归一（基线 `resolved=22/22` 保持）。
- **验收**：复跑只读基线对照 `DATA-PRODUCTION-BASELINE-01-result.md`；`pnpm guard`（仅 `guard:*`）全绿；`unattended.*` 六作业 DRY_RUN 跑通、`unresolved=0`；冻结项未触；§15.3 五判定全过。

**完成判定（"完全通畅"门槛）**：1. `pnpm guard` 全绿；2. `pnpm test` 已知失败有文档化豁免且不新增；3. `unattended.*` DRY_RUN 跑通、`unresolved=0`；4. B/E 组差距闭合、冻结项未触；5. §15.3 五判定全过。

> ✅ **全部阶段完成（自动续跑终点）**：数据底座建厚实达标，可进入 Human Experience 验收（依 C1 方向，Gate 顺延至底座达标）。自动续跑协议在此自然终止。

---

## 风险与回滚（通用）

- 所有写库走 `pipelines/legacy/unattended-runner.mjs`（DRY_RUN 默认）；实跑必 `MOHEN_WRITE_ENABLED=true` ＋ `MOHEN_ENV=dev` ＋ 先 DRY_RUN。
- 每批独立 `ingest_run_id`；回滚按 run_id 范围 `DELETE`（协议 #7：Raw 不删）。
- 迁移（`supabase/migrations`）单向、带版本号；回滚用反向迁移或 run_id 删除，不物理删历史数据。
- 触 Truth Store / Cultural World 模型 / Relation / Meaning 模型写权限的变更，先登记 `CURRENT.md` §9 提交拥有者裁定（不自行改 C0–C4）。
- **防退化**：沿用 Skill 治理的守卫（`guard:registry` 第 ⑧ 项 / `guard:structure` 绑定 / `guard:structure-map` 根闸门），确保不退回"重复写脚本"。

---

## 进度表

| 阶段 | 状态 | 首选模型(开跑时刻定) | 完成记录 |
|---|---|---|---|
| C1 · 老项目抽取 | 完成（代码+真实数据：corpus 文本片段 +4812，evidence_fragments 16→4828，零自动晋级） | —（规则前） | 见 `tasks/results/TASK-DATA-20261004-C1-result.md` · 下游转化支撑可视化 `tasks/results/TASK-DATA-20261004-C1-impact.html` |
| C2 · 候选抽取与对齐 | 完成（代码+真实数据：entities +3041、relations +2923、discovery +1138、legacy_mappings 精确对齐 +5，零自动晋级） | —（规则前） | 见 `tasks/results/TASK-DATA-20261004-C2-result.md` · 下游转化支撑可视化 `tasks/results/TASK-DATA-20261004-C2-impact.html` |
| C3 · 关系编织与投影 | 完成（代码+真实数据：relation_evidence 496→13091（本批 +12595），2923 条关系全部绑定（1880 条 ≥2 证据），E1 簇 183，门禁审计 +20461，L4 投影 2931 路径/15544 步，零自动晋级） | HY3（起跑 <23:00，与闸门一致→已续跑） | 见 `tasks/results/TASK-DATA-20261004-C3-result.md` · 下游转化支撑可视化 `tasks/results/TASK-DATA-20261004-C3-impact.html` |
| C4 · 1246 图挖掘 | 完成（代码+真实数据：题录证据 +692，图-实体链接 +894（对象级 suspected 68／镇域 unconfirmed 826），资格判定审计 +9636，三分 +2210，零自动晋级、冻结项零改动） | **HY4**（起跑 23:35 ≥23:00，与闸门一致） | 见 `tasks/results/TASK-DATA-20261004-C4-result.md` · 下游转化支撑可视化 `tasks/results/TASK-DATA-20261004-C4-impact.html` |
| C5 · 外部扩源 | 完成（代码+真实数据：R19 闸门先过；身份线 entities +151／mappings +161／来源 +7，视觉线 图像 +140／链接 +140／证据 +140／审计 +840，地域拒收 163、类型拒收 34，零自动晋级、身份线 Evidence=0 守 S3） | **HY3**（起跑 06:33 <23:00，与闸门一致 → 已续跑） | 见 `tasks/results/TASK-DATA-20261004-C5-result.md` · 下游转化支撑可视化 `tasks/results/TASK-DATA-20261004-C5-impact.html` |
| C6 · 验收与常态化 | 完成（B 组晋级闸门 2→10 个 + 实测拦得住；E 组重名 383/383 覆盖 100%、实体行零改动；门禁审计首次覆盖 cultural_*；§15.3 五判定全过；守卫总线 15 条全绿；测试 22 failed/245 passed 与基线一致无新增） | **HY3**（起跑 08:50 <23:00，模型一致 → 已续跑并收尾） | 见 `tasks/results/TASK-DATA-20261004-C6-result.md` · 验收可视化 `tasks/results/TASK-DATA-20261004-C6-impact.html` |

> **C1–C6 全部完成（2026-10-05）**：数据底座建厚实六阶段收尾。全库规模 source_records 317／entities 6745／evidence 13053／relations 3444＋绑定 13091／visual_assets 1465／链接 1056／投影 2931 路径；零自动晋级全程成立（published=0、verified=0、auto=0），冻结项全程未触（effective_visual_assets=8）。自动续跑协议在此自然终止。
