# TASK-DATA-20261004 · C4 结果记录（1246 图挖掘并入主线 · R25 解冻）

- **任务书**：`tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md` · C4
- **执行日期**：2026-10-04 23:35 起跑 → 2026-10-05 01:30 完成（本地 +08:00）
- **模型**：HY4（起跑时刻 23:35 ≥23:00，与任务书模型选择规则一致）
- **Registry 作业**：`unattended.image-link`（kind=`imagelink`；Skill：`mohen-visual-asset`；Entry：`pipelines/legacy/unattended-runner.mjs`）
- **模式**：DRY_RUN 先跑（3 次：实现验证 / 字典修正后 / 幂等复跑）→ `MOHEN_WRITE_ENABLED=true` 实跑；`MOHEN_ENV=dev`
- **零自动晋级**：confirmed 链接 **0**、published 实体 **0**、verified 证据 **0**、近 1 日 auto 分诊 **0**
- **冻结项未触**：`visual_assets` 总数 1325 → 1325、excluded 68 → 68（**零 UPDATE**）

---

## 1. 完成判定（对照任务书 C4 验收）

| 验收项 | 结果 | 证据 |
|---|---|---|
| 复用 `mohen-visual-asset` 技能 + Entry 复用 runner（R26） | ✅ | 新增登记 `unattended.image-link`，`implementation={skill:mohen-visual-asset, entry:pipelines/legacy/unattended-runner.mjs}`；`guard:registry` entries=15 unresolved=0；技能唯一 entry 校验通过 |
| 按 `acquisition-intents.json` 的 `hushang-legacy-image-anchor` 归属，避免误挂 | ✅ | 图批次按 `provider=hushang_legacy` 且 `metadata_json->>'kind' <> 'image_source'` 判定（＝老项目 1246 批次，不含图片专用锚点源的 37 张）；题录证据挂**题录 JSON 自身的 source_record**（`shanghai_images_census_20260905.json` / `commons_images.json`），不再误挂"诗词源" |
| 图-实体链接 ＋ 资格判定 | ✅ | `visual_entity_links` +894（对象级 R1 `suspected` 68／镇域 R3 `unconfirmed` 826）；资格判定分布 named_object 68 / town_scope_only 758 / identity_unresolved 372 |
| 全部走 `review_queue` 三分 | ✅ | 2210 条（链接 894／题录证据 692／身份未决 624），全部 `hold`；auto=0 |
| 图-实体链接有 `evidence_ids`（任务书验收） | ✅ | 742 条链接带 `link_evidence_id`（指向本批题录 evidence）；其余 152 条为无题录图的镇域链接，`link_evidence_id` 为 NULL（无可引材料，不伪造） |
| `guard:source-gate` / `guard:registry` 绿 | ✅ | provider resolved=22/22 unknown=0；registry entries=15 queued=107 unresolved=0 |
| **不处置**冻结描述项 | ✅ | 既有 excluded 48 张（1246 批内）未纳入本批、状态未改；pending/excluded 状态表达收敛留 C6 |
| 无自动晋级 | ✅ | `links_confirmed=0`；`visual_assets.eligibility_status` 零改动 |

---

## 2. 执行摘要（数字来自 runner `progress.json` 与 DB 复核）

### 2.1 `unattended.image-link`（实跑，ingest_run_id `e40ab0ef-f401-494c-a68b-15c41b122eb7`）

| 指标 | 数值 |
|---|---|
| 入范围图数（1246 − 既有 excluded 48） | **1198**（census727 727 ／ commons519 471） |
| 题录证据（新增 `evidence`） | **692**（census 304 ／ commons 388；缺 locator **0**） |
| 图-实体链接（新增 `visual_entity_links`） | **894** |
| — 对象级 R1（题录显式点名遗产对象，`suspected`） | **68** |
| — 镇域 R3（镇域/place 归属，`unconfirmed`） | **826** |
| 完成归属的图 | **826** 张（其中 68 张同时具对象级＋镇域） |
| 资格判定 | named_object **68** ／ town_scope_only **758** ／ identity_unresolved **372** |
| 门禁审计 `evidence_gate_audit` | **9636**（visual_asset 4792：G0/G1/G3/G4 × 1198；evidence 4844：G0–G6 × 692） |
| `review_queue` 三分 | **2210** 条 hold（链接 894／题录证据 692／身份未决 624） |
| `legacy_mappings` 溯源（幂等） | **1198** |
| 同名冲突 HOLD（不自选边） | **0**（修正字典后） |

### 2.2 镇域归属分布（R3 弱归属）

新场 92 · 嘉定 136 · 练塘 46 · 高桥 102 · 川沙 126 · 南翔 63 · 罗店 53 · 枫泾 119 · 朱家角 40 · **金泽 14** · 张堰 35（合计 826）

### 2.3 下游转化支撑（可视化报告）

- 产物：`tasks/results/TASK-DATA-20261004-C4-impact.html` + `.json`
- 语料类别：上图记忆 census727 304 ／ Wikimedia commons519 388 ／ 无题录（仅 URL）506
- 可转化信号密度：空间 1500（68.9%）· 时间 491（54.9%）· 人物 **0**（本作业不做人物识别，不硬猜）· 关系 68（5.7%，对象＋镇域双挂 → 可成"对象—位于—镇"）
- M1–M5 母题支撑量：M1 793 · M2 1240 · M3 827 · M4 1139 · M5 1173
- 待补实体清单原料：624 张有题录图未匹配到库内遗产对象（top：罗店镇 7／黄家花园八张 6／高昌庙 5／南翔车站 5／川沙县 4…）
- 红线：locator 完整率 100% · verified 0 · published 0 · auto 0 · confirmed 0 · 冻结项零改动 · 幂等 in_scope=0

---

## 3. 作业实现说明（代码落点：`pipelines/legacy/unattended-runner.mjs`）

### 3.1 题录从哪来（本阶段最关键的一步）

老项目 1246 张图在库里**只有 URL**：无题录、无归属、无链接。题录其实一直在老项目预抓取 JSON 里，只是入库时被丢弃：

- `shanghai_images_census_20260905.json`（727）：`title` 198 非空 / `place` 180 / `town_hint`（金泽 14…空 372）/ `_file` / `_key`
- `commons_images.json`（519）：`File:` 标题 437 / `description` 417 / `date` 490 / `towns[]` 全部有

本作业从 Raw（`FETCHED` 目录）**离线重放**题录（0 网络请求），URL 规范化（去 query）拼接命中率 **1198/1198 = 100%**。

### 3.2 链接规则（`jobImageLink`）

| 规则 | 判定 | link_status |
|---|---|---|
| R1 对象级 | 题录标题（剥掉 `File:` / 扩展名 / "· 建置沿革"类后缀）**包含**遗产对象字典名（长名优先） | `suspected` |
| R3 镇域 | `towns[]` / `town_hint` / `place`（含镇名做包含匹配，如"南翔车站"→南翔）命中镇域字典 | `unconfirmed` |
| 同名多实体 | 同一名字命中 ≥2 个不同 `canonical_name` → 不自选边 | 不建链接，`HOMONYM_CONFLICT` HOLD |

- **现代照片永不成为历史状态证据**：`current_or_historical` 由题录日期判定（≥2000 → current，≤1949 → historical，否则 unknown），491 条可判古今。
- 证据绑定：有题录才建 evidence（`locator` 指向 JSON 条目，100% 完整）；无题录的图只做资格判定、不伪造证据。

### 3.3 资格判定（只留痕，不处置）

对每张图写 4 条 `evidence_gate_audit`（`object_type='visual_asset'`）：

- **G0**（归属）：图属老项目 1246 批次且 source 可解析 → pass（1198/1198）
- **G1**（身份）：题录点名唯一遗产对象 → pass（68）；否则 pending（HOLD，`IMAGE_IDENTITY_UNRESOLVED`）
- **G3**（空间）：镇域/place 已解析 → pass（826）；否则 pending（`TOWN_SCOPE_UNRESOLVED`）
- **G4**（证据）：链接绑定题录 evidence → pass（692）；否则 pending（`NO_CAPTION_EVIDENCE`）

> 注：库层 `evidence_gate_audit.result` 只允许 `pass/fail/pending`，故"HOLD（未定案）"落 `pending`，语义写在 `reason` 里（不新造结果值）。

### 3.4 人审只送真不确定项（避免长尾制造人工债务）

- 链接（894）＋题录证据（692）＋**有题录但身份未决**（624）→ 进 `review_queue`；
- **无题录（506 张）不进人审**，只留 audit —— 无信息可审，不制造人工债务（主协议 §3.3 / R-DP-04）。

---

## 4. 本轮修掉的两个真实缺口（重要）

1. **字典重复实体行 → 253 条假"同名冲突"**：老项目移植把同一对象写了两行（`JZ-BLD-001` 与 `hushang-jingwei:entity:JZ-BLD-001`），且每镇既有 `town-金泽` 又有 `place:金泽`。首版按"命中实体数 >1 即歧义"，实测 253 张图被假冲突卡住、一条链接都建不出来。修法：**拆两套字典**（镇域字典一镇一条、对象字典排除镇名）＋ **按 `canonical_name` 去重**（同一对象的重复行不是同名异义），并在"≥2 个不同 canonical_name"时才判真歧义 → 假冲突归零。
2. **首跑半批提交 → 整批回滚重跑**：首跑因 `evidence_gate_audit.result` 检查约束（我写了 `hold`，库层只允许 pass/fail/pending）中断，但 `evidence`/`links` 已在审计之前提交（psql 自动提交），二次运行又产生 692 条无引用的重复题录证据。处置：**整批回滚**（链接 894／证据 1366／审计 9636／溯源 1198／三分 2210 全部按批次清除）后重跑一次干净的单批次；回滚未触碰 `visual_assets`（1325/68 前后一致）。

---

## 5. 已知限制与偏差（诚实记录）

1. **遗产对象字典只有 113 个老项目移植实体**（刻意排除 C2 的 `unattended-ce:*` 启发式候选 —— 那批混有"包括村／版的书"类噪声）。因此 **624 张有题录的图判 `identity_unresolved`**：不是"图无关"，而是"库内还没有这个对象"。这些题录点名的对象名已列为**待补实体清单原料**（impact 报告 ⑤ 节）。
2. **镇域链接是弱归属**（`unconfirmed`）：`town_hint` 来自老项目结构/题录，镇域 ≠ 具体对象，不冒充 `confirmed`。
3. **金泽视觉证据的主力仍被冻结**：1246 批内 34 张 Commons 金泽图（普济桥／如意桥／万安桥…）处于 `eligibility_status='excluded'`（2026-10-02 cleanup 的既有处置），属**冻结描述项**，C4 只测量不处置 → 解冻范围内金泽仅 **14 张**。**是否恢复这 34 张须拥有者裁定**（C6 状态表达收敛一并处理）。
4. **人物信号为 0**：本作业不做人物识别（图题录无人物实体字典），不硬猜。
5. **`link_evidence_id` 有 152 条为 NULL**：对应无题录图的镇域链接（无可引材料），按 Hard Rules 不伪造证据。
6. **`pnpm test` 22 failed / 245 passed**（`real_db_untouched=YES`，真库一行未动）：失败项均为冻结基底计数漂移类断言（如 `visual_assets` excluded 基线 20 vs 实际 68、`Knowledge Weave 计数不变`），与 C1–C3 后已存在的漂移同类（ESC-05 ③ 待裁决）。C4 未改动测试代码，也未改动被断言的表（`visual_assets`/`entities`/`relations`/`claims`）。

---

## 6. 变更文件

| 文件 | 变更 |
|---|---|
| `specs/data-production/production-registry.json` | 新增 `unattended.image-link` 条目（全 required_fields + `implementation` 三向绑定） |
| `pipelines/legacy/unattended-jobs.mjs` | PRODUCTION 增 `{ id:"unattended.image-link", kind:"imagelink" }` |
| `pipelines/legacy/unattended-runner.mjs` | 新增 `buildCaptionIndex` / `buildEntityDict` / `jobImageLink` / `periodKind`；preflight 放行 `imagelink`；`RUNNERS.imagelink` |
| `pipelines/legacy/unattended-report.mjs` | 新增 `analyzeImageImpact` / `renderImageImpactHtml`；CLI `--stage C4` |
| `skills/mohen-visual-asset/SKILL.md` | 实体化档案补 `unattended.image-link` 作业行 + C4 要点 |
| `specs/data-production/identifier-registry.json` | `visual_entity_links.eligibility_tags` 补登记 `pending_heritage_review` |

---

## 7. 下一步（C5 · 外部扩源）— **Auto-Chain 模型校验闸门拦截**

- C4 完成判定已全部满足（含下游转化支撑可视化报告）；守卫全绿、零自动晋级、冻结项未触。
- **模型闸门**：C5 起跑时刻为 2026-10-05 01:30（+08:00），**< 23:00 → 首选 HY3**；当前会话为 **HY4**，模型不一致 → 按任务书「模型校验闸门」**暂停自动续跑**，本会话不跨模型续跑。
- **交接说明**：请以 **HY3** 新开会话，加载 `tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md`，从 **C5** 继续（工作区固定 `\mohen-agent-2.0`）。
- 另请拥有者裁定：① 1246 批内 34 张 excluded 金泽 Commons 图是否恢复（见 §5.3）；② 624 张有题录图的"待补实体"是否立项（可作为 C5 扩源输入）。
