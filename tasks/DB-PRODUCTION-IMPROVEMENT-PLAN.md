# 本地数据库完善 · 阶段性计划（任务书）

- **创建**：2026-10-02
- **目标库**：本地 PostgreSQL `mohen_dev`（唯一真相源，R6）
- **老项目源**：`d:\work Buddy\2026-08-23-23-12-38\hushang-jingwei`
- **依据**：`specs/data-production/MoHen_Data_Production_Protocol.md` V2.0（含 #15 通畅性核验）、
  `tasks/results/DATA-PRODUCTION-MECHANISM-01-result.md`、`tasks/results/DATA-PRODUCTION-BASELINE-01-result.md`、
  `tasks/results/NIGHT-BATCH-LEGACY-PORT-result.md`
- **状态**：规划已立，Phase 0 进行中
- **指针登记**：`CURRENT.md` §14

> 本任务书是"数据生产线完善"工作的**唯一进展载体**（CURRENT.md §11）。每完成一项，在下方 `[ ]` 勾选并补一行"完成记录"。

---

## 0｜范围与硬边界（贯穿全部阶段，不可逾越）

**冻结项（只测量、不处置、不计入待办）**
- 既有 1246 张夜跑图（`visual_assets` 中 pending 1212 / excluded 68）的数据处置；
- `historical_features` 切片 `SHL-LEGACY-COORDS`（240 行，全零证据零置信）；
- `visual_assets.depicted_period` 写死；
- ESC-04 数据部分。

**A 组待项目拥有者裁定（不擅自动）**
- RECON-02 命名分叉、ESC-02 双 relation 存储、ESC-03 `modern_location` 落位、ESC-05①③。

**零自动晋级红线（任何阶段都不得违反）**
- 无人值守期间 `entities.published`=0、`evidence.verified`=0；
- 所有候选层写入必带 `review_queue` 三分（`triage_outcome`）+ `ingest_run_id`。

> **无人值守层数上限（按 C3 八层地图）**：可达 **L0 → L2 候选 + 只读 L4 投影**；**L3 / L5 / L6 / L7 一律排除**（HOLD 或明确排除）。完整协议级不变量见 `specs/data-production/MoHen_Data_Production_Protocol.md` **§4.4**，本任务书只转述、以协议 §4.4 为准。

**可处置范围（本计划主体）**：B 组（闸门/审计/状态收敛，非冻结）、E 组（标识符治理，非冻结）。

---

## Phase 0 · 收尾验证（让生产线可复核、可发布）

目标：把"机制就位"固化为"可重复验证"，为后续阶段开绿灯。

- [ ] **P0-1 解耦 `guard` 与 `test`**：`pnpm guard` 末步 `pnpm test` 因 ESC-05 21 failed 使整链判红。
  方案：在 CI / `package.json` 中将 `test` 移出 `guard`，改为 `guard`（仅 `guard:*`）＋ 独立 `verify`（含 `test`）两脚本；
  `test` 的已知失败项在 `tasks/results/` 建 `TEST-ESC05-BASELINE.md` 文档化豁免清单（不删断言、不强行改绿）。
- [ ] **P0-2 固化只读基线**：`scripts/db-compliance-baseline.mjs` 已可跑；补一条 npm script `baseline` 指向它，
  并使其输出可被 Phase 4 复跑比对（B/E 组差距闭合判定）。
- [ ] **P0-3 登记协议 #15 状态快照**（已完成）：`MoHen_Data_Production_Protocol.md` #15 已写入。
- [ ] **P0-4 复跑 §15.3 判定清单**：5 项全过，确认控制面通畅基准。

**Phase 0 完成标准**：`pnpm guard`（仅 `guard:*`）稳定 0 退出；`pnpm baseline` 可跑；§15.3 全过。

---

## Phase 1 · 老项目内容再利用（核心新增价值）

现状：旧项目 `hushang-jingwei/data/` 含 2596 文件（2038 PDF、349 JSON、corpus、fetched、raw_snapshots、seed.master.json、town_aliases.json、wikidata_towns.json）。
已落地：61 个 JSON 来源登记 ＋ Raw 快照（`src-*` 已跑）；图片/坐标作业 `forbidden`（冻结/待裁定）保持不动。
**缺口（实现层，非协议/设计层）**：数据生产协议 §10 已完整规定 N01–N06，runner 安全外壳（注册表闸 / 来源门禁 / preflight / 三向分诊 / fail-closed）也已就位——**无人值守「执行模式」本身已经成立**。剩余的是「内容」：规范的 N01–N06 生产作业尚未写成可运行代码；目前仅落地了「老库一次性来源登记(src-*) + Raw 快照」（属 N01 的搬运子集），PDF/corpus 抽取与编织尚未产出 Candidate/Evidence。这正是 Phase 1 要补的**实现**工作，不是协议有洞。

- [ ] **P1-1 实现 `unattended.source-refresh`**：增量刷新已知 S1（上图/方志·寺观卷·津梁卷·寺志）/ S2（Wikimedia/IA）来源；
  接入 `unattended-jobs.mjs` 队列（加 `unattended.source-refresh` 作业 id），runner 增加 `source-refresh` 分发；
  gate 同 `src-*`（库层唯一约束 ＋ `guard:source-gate`）。
- [ ] **P1-2 实现 `unattended.evidence-fragment`**：从已入库 `source_records` / PDF / corpus 抽 Evidence Fragment（locator/page/quote/source link）；
  定义抽取规则版本；写入 `evidence` ＋ `evidence_fragments`；`locator` 缺 → G0 HOLD。
- [ ] **P1-3 实现 `unattended.candidate-extraction`**：从 evidence 抽 Entity / Time / Place / Relation 候选，
  写入候选库各表（entities/claims/cultural_*/discovery_candidates/historical_spatial_relations/relations）；
  随生 `review_queue` 三分（`guard:triage`）。
- [ ] **P1-4 实现 `unattended.deterministic-resolution`**：精确 ID / 强一致对齐（吕颐浩 Wikidata ID、双桥 strong ID）；
  输出 canonical ＋ alias（落 `legacy_mappings`），歧义一律 HOLD。
- [ ] **P1-5 实现 `unattended.relation-weave`**：金泽关系簇（E1 桥—水—桥）＋ M1/M3/M5 候选生成 relation candidate ＋ `evidence_ids` 绑定；
  E1 类确定性关系 AUTO-PROMOTE，历史因果/跨源冲突 G5 HOLD。
- [ ] **P1-6 实现 `unattended.gate-projection`**：执行 G0–G6 → AUTO/HOLD/REJECT → 刷 Agent Read Model；
  晋级须有 `evidence_gate_audit`（C3 §4.2 R15），Projection 不反写 Truth Store。
- [ ] **P1-7 每阶段先 DRY_RUN 后 WRITE**：严格 `MOHEN_WRITE_ENABLED=true` ＋ `MOHEN_ENV=dev` ＋ 先 DRY_RUN 验证；
  每批独立 `ingest_run_id`，可回滚。

**Phase 1 完成标准**：`unattended.*` 六作业均可 DRY_RUN 跑通、队列 `unresolved=0`；旧项目 PDF/corpus 开始稳定产生 candidate/evidence（均带三分留痕）。

---

## Phase 2 · B 组：库层强制补全（非冻结，提升通畅度）

- [ ] **P2-1 R15 第二批晋级闸门**：给 `entities` / `evidence` / `cultural_*` / `historical_*` / `relations` 补晋级强制触发器
  （约束触发器 ＋ `deferrable initially deferred`，照 `claims_require_evidence` 先例）；由 `pnpm guard:promotion` 逐表报违规行数后分批补。
- [ ] **P2-2 `evidence_gate_audit` 覆盖 `cultural_*`**：扩展审计写入，使 5 张 `cultural_*` 表有门禁记录（现 0 覆盖）；
  对应 unattended.relation-weave / candidate-extraction 写入时落审计。
- [ ] **P2-3 状态表达收敛**：统一 `status` / `verification_status` / `eligibility_status` / `triage_outcome` / `review_tier` 到 C3 §4.1 单一状态机；
  先出规范 ＋ `guard`（只读报差异），再分批迁移存量（不动冻结项）。

**Phase 2 完成标准**：`pnpm guard:promotion` 对全 28 表报违规行数趋零；`cultural_*` 审计有覆盖；状态列语义一致。

---

## Phase 3 · E 组：标识符治理（非冻结）

- [ ] **P3-1 `entities.canonical_name` 367 组重名 resolution**：结合 `identifier-registry.json` 做 canonical/alias 归并；
  用 `legacy_mappings` 保留可追溯；歧义进 `review_queue` HOLD（不自选边）。
- [ ] **P3-2 provider 字符串归一复核**：基线已 `resolved=22/22`（`guard:source-gate`），保持并纳入回归。

**Phase 3 完成标准**：重名组数下降且每组合法解析；`guard:identifiers` 仍 PASS。

---

## Phase 4 · 验收与常态化

- [ ] **P4-1 复跑只读基线**：对照 `DATA-PRODUCTION-BASELINE-01-result.md` §4.2/§4.3，确认 B/E 组差距闭合、冻结项未动。
- [ ] **P4-2 调度决策**：是否引入"按需触发"以外的轻量 cron wrapper（保持 DRY_RUN 默认）；属架构决定，提交拥有者确认（CURRENT.md §9 登记）。
- [ ] **P4-3 晨报/result.md 模板**：反映新覆盖率（B/E 组闭合后）。

**总验收（"完全通畅"门槛）**：
1. `pnpm guard`（仅 `guard:*`）全绿；2. `pnpm test` 已知失败有文档化豁免且不再新增；
3. `unattended.*` 六作业 DRY_RUN 跑通、`unresolved=0`；4. B/E 组差距闭合、冻结项未触；
5. §15.3 五判定全过。

---

## 风险与回滚

- 所有写库走 `unattended-runner.mjs`（DRY_RUN 默认）；实跑必 `MOHEN_WRITE_ENABLED=true` ＋ `MOHEN_ENV=dev` ＋ 先 DRY_RUN。
- 每批独立 `ingest_run_id`；回滚按 run_id 范围 DELETE（协议 #7 No destructive cleanup：Raw 不删）。
- 迁移（`supabase/migrations`）单向、带版本号；回滚用反向迁移或 run_id 删除，不物理删历史数据。
- 任何触及核心 Cultural World 对象 / Relation / Meaning 模型或 Truth Store 写权限的变更，先登记 `CURRENT.md` §9 提交拥有者裁定（不自行改 C0–C4）。
