# TASK-DATA-20261004 · C6 结果记录（验收与常态化）

- **任务书**：`tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md` · C6
- **执行**：2026-10-05 08:50 起跑（本地 +08:00）→ 09:40 完成；与 C5 同会话续跑
- **模型**：HY3（起跑 08:50 <23:00 → 首选 HY3；本会话为 HY3，模型校验闸门一致）
- **模式**：B/E 组作业均先 DRY_RUN 再 `MOHEN_WRITE_ENABLED=true` + `MOHEN_ENV=dev` 实跑；全队列一次全量 DRY_RUN 不写库
- **完成判定**：五项「完全通畅」门槛逐条结果见 §1

---

## 1. 完成判定（任务书 C6「完全通畅」门槛）

| # | 门槛 | 结果 | 证据 |
|---|---|---|---|
| 1 | `pnpm guard`（仅 guard:*）全绿 | ✅ | 15 条守卫全部 0 退出码（含本阶段新增 `guard:names`） |
| 2 | `pnpm test` 已知失败有文档化豁免且不新增 | ✅ | **22 failed / 245 passed**，与 C4、C5 基线逐项一致；`real_db_untouched=YES` |
| 3 | `unattended.*` 作业 DRY_RUN 跑通、`unresolved=0` | ✅ | 全队列 DRY_RUN：done=109 failed=0 inserted=0；注册表 unresolved=0（否则 runner 在开跑前 exit 3） |
| 4 | B/E 组差距闭合、冻结项未触 | ✅ | B 组闸门 2→10 个；E 组重名覆盖 383/383=100%；`effective_visual_assets` 仍为 **8**；`visual_assets` 1325→1465 只增不改 |
| 5 | §15.3 五判定全过 | ✅ | 见 §5 |

---

## 2. B 组 · 库层强制（R15 第二批晋级闸门）

**迁移**：`supabase/migrations/202610050011_second_promotion_gate.sql`

| 内容 | 说明 |
|---|---|
| 新增 8 个 constraint trigger | entities / relations / evidence / historical_spatial_relations / historical_features / cultural_relation_claims / cultural_meaning_candidates / cultural_present_connections |
| 形态 | 照抄 202610020008：constraint trigger + `deferrable initially deferred` → COMMIT 时校验（写入者可在同一事务内先写对象、再写审计） |
| 末端状态取值 | `adjudicated / runtime_eligible / verified / published`（与 `guard:promotion` 逐字对齐，防止"守卫写着、库里没有"） |
| cultural_* 取值收敛 | 三张表的 `review_status` CHECK 由 `candidate/human_reviewed/research/unresolved` 扩展为 +`adjudicated/runtime_eligible/published` —— 原先**晋升路径根本不存在**（值写不进去，装了闸门也拦不到），现"能晋级"与"晋级必须过闸门"同时成立 |
| 不做的两件事 | ① 不改任何既有行的状态（迁移无 UPDATE）；② 不回填历史审计行（回填＝制造"看起来过了门禁"的假象，ESC-05 教训） |

**实测（不是"建上就算"）**：`verification/c6-trigger-test.mjs`
- 挑一个**当前没有审计行**的实体做 `status='published'` → 被拦：`entities … 晋级为 published 必须先有 evidence_gate_audit(object_type=entity) 记录` ✅
- 同一事务内先插审计再晋级 → 放行（deferred 语义正确）✅
- cultural_meaning_candidates 同样被自家触发器拦下 ✅
- 还原后 `published` 实体 = 0 ✅

**守卫同步**：`scripts/check-promotion-gate.mjs` 的 GATED 表由 7 张扩到 10 张，末端取值与迁移逐字一致（`gated_tables=10 violations=0`）。

---

## 3. E 组 · 标识符

**作业**：`unattended.name-resolution`（kind=`nameres`，Skill `mohen-data-ingest`，Entry 复用 runner），DRY 2 次 + 实跑 2 次（第二次为口径修正后补齐）。

| 指标 | 数值 |
|---|---|
| 全库名字组 / 重名组 | 6184 / **383** |
| 机器可定（resolved） | **13**（归一化 legacy_id 完全一致＝同一对象的移植重复写法，取最小 entity_id 为 canonical） |
| 不自选边（homonym_open） | **370**（其中 17 组为遗产相关类型 → 进人审；352 组为家谱同名人 → 机器保留，不占人工队列） |
| 结论覆盖率（`guard:names`） | **383/383 = 100%**（`dup_groups=383 covered=383 uncovered=0 orphan=0`） |
| 实体行改动 | **0**（只登记结论，不合并 / 不删除 / 不修改任何 `entities` 行） |
| provider 归一 | 真库 23 种写法，`guard:source-gate` resolved=23/23 unknown=0（基线"全解析"保持） |

**新增守卫**：`scripts/check-name-resolution.mjs`（`pnpm guard:names`，已并入 `pnpm guard` 总线，14 → 15 条）。它只认一件事：**每个重名组必须有结论，否则下游遇到同名只能猜**——C4 首版就是被"同一对象被移植成两行"误判成同名异义，253 张图一条链接都建不出来。

---

## 4. 门禁审计首次覆盖 cultural_*

`unattended.gate-projection` 扩展：新增对 `cultural_meaning_candidates` / `cultural_present_connections` 的 G0–G6 评估（按它们**实际拥有的字段**判定：slice_id / subject_feature_key / 证据数组；没有时间与坐标字段就写 `pending`，不冒充 pass）。

- 结果：`audit_meaning 0→14`、`audit_present 0→14`（各 2 行 × 7 道门）；`cultural_relation_claim` 此前已有 56 行。
- 三张 cultural 表现在**全部**在 `guard:promotion` 覆盖内（此前 2 张报「该表门禁审计 0 行」）。

---

## 5. §15.3 五判定逐条

| # | 判定 | 结果 |
|---|---|---|
| 1 | 守卫总线全 0 退出码 | ✅ 15 条全过（含新增 `guard:names`） |
| 2 | `node scripts/db-compliance-baseline.mjs` 可跑、SELECT 不报错 | ✅ 表查询 18 项、守卫 8 项全 PASS，基线已写入 `tasks/results/DATA-PRODUCTION-BASELINE-01-result.md` |
| 3 | `node pipelines/legacy/unattended-runner.mjs` 默认 DRY_RUN 不写库、`unresolved=0` | ✅ 全队列 done=109 failed=0 inserted=0，unresolved=0 |
| 4 | `effective_visual_assets` 仍为 8 | ✅ 8（冻结未被触碰） |
| 5 | `entities.published=0`、`evidence.verified=0` | ✅ 均为 0（零自动晋级红线） |

---

## 6. 本阶段修掉的真实缺陷（4 个，全部实测踩到）

1. **枚举列与非法字面量比较 → 把表写死**：`new.status in ('adjudicated', …)` 时 PG 会把字面量转成枚举，而 `adjudicated` 不在 `verification_status` 枚举里 → **任何** INSERT/UPDATE（哪怕写合法的 `candidate`）都报「输入值无效」。改 `new.<列>::text in (...)`。同一处坑也在 `guard:promotion` 里（表现为"DB 不可达"），一并修。
2. **投影"先删再插"不在同一事务**：门禁投影实跑被外部中断 → 删完没插完，**L4 路径 2931→0**（派生层被清空）。改为一次 psql 会话内 `begin … commit`，中断只整体回滚。
3. **投影逐关系单条查询**：2923 条关系 = 2923 次 psql 进程启动，跑到十几分钟还没完（缺陷 2 的直接诱因）。改为一次性取 `relation_evidence`（13k 行）内存分组。修复后投影重建秒级完成，路径/步骤 **2931 / 15544** 与 C3 基线逐项一致。
4. **JS `trim()` 与 PG `btrim()` 口径不一致**：作业用 `trim()` 把「顾眏\t」并进「顾眏」，守卫用 `btrim()` 仍算两组 → 守卫报出一个它自己算出来的"未覆盖组"。两边统一为**只剥 ASCII 空格**。

---

## 7. 已知限制与偏差（诚实记录）

1. **非规范状态取值未收敛**：`evidence_linked`(20)、`human_reviewed`(2) 如何映射到 C3 §4.1 的 RAW/CANDIDATE/ADJUDICATED/RUNTIME_ELIGIBLE/PUBLISHED 五档属**语义决断**（会不会被下游读成"已晋级"），未擅自改——B 组只装闸门、不改存量语义，交拥有者裁定。
2. **`visual_assets` 的词表未收敛**（`pending_review/gate_passed/gate_failed/excluded`）：该表状态属冻结项（ESC-04），C6 明确"冻结项未触"，故收敛留待解冻后的专项。
3. **`pnpm test` 仍有 22 项失败**：与 C4/C5 基线完全一致（冻结基底计数漂移类断言，ESC-05 ③ 待裁决），本阶段未改动测试代码与被断言的表。
4. **新增守卫 `guard:names` 使守卫总线 14→15**：属机制增量（不改 C0–C4 架构、不改 schema），已在 `CURRENT.md` §3 同步；若拥有者不认可该守卫的判定口径，可单独摘除。
5. **`data/seed.master.json` 在测试环境中显示为已修改**：测试断言 `git status` 为空因而失败（环境态问题，C6 未改动该文件；`git status --short` 未列出它）。
6. **未提交**：C6 变更保持在工作区（与 C1–C5 同惯例），未执行 `git commit`。

---

## 8. 变更文件

| 文件 | 变更 |
|---|---|
| `supabase/migrations/202610050011_second_promotion_gate.sql` | **新增**：8 个晋级闸门触发器 + cultural_* 状态取值收敛（含 `::text` 比较修复说明） |
| `scripts/check-promotion-gate.mjs` | GATED 扩到 10 张表；末端取值与迁移对齐；枚举列改 `::text` 比较 |
| `scripts/check-name-resolution.mjs` | **新增**守卫 `guard:names`（重名结论覆盖率） |
| `package.json` | 新增 `guard:names` 并并入 `pnpm guard` 总线 |
| `pipelines/legacy/unattended-runner.mjs` | 新增 `jobNameResolution`；`jobGate` 增 cultural_* 门禁覆盖；投影事务化 + 批量取 relation_evidence；preflight/RUNNERS 挂载 |
| `pipelines/legacy/unattended-jobs.mjs` | 队列增 `unattended.name-resolution` |
| `specs/data-production/production-registry.json` | 新增 `unattended.name-resolution`（全 required_fields + `implementation`） |
| `skills/mohen-data-ingest/SKILL.md` | 实体化档案补 `unattended.name-resolution` 作业行 |
| `pipelines/legacy/unattended-report.mjs` | 新增 `analyzeAcceptanceImpact` / `renderAcceptanceImpactHtml`；CLI `--stage C6` |
| `tasks/results/TASK-DATA-20261004-C6-impact.html` / `.json` | C6 验收可视化（同源生成） |

---

## 9. C1–C6 收尾状态

数据底座建厚实六阶段**全部完成**：C1 老项目抽取 → C2 候选抽取与对齐 → C3 关系编织与投影 → C4 1246 图并入 → C5 外部扩源 → C6 验收与常态化。

- 底座规模：source_records 317（+13 外部）· entities 6745（+151 外部对象）· evidence 13053 · relations 3444 / relation_evidence 13091 · visual_assets 1465 · visual_entity_links 1056 · knowledge_paths 2931 / steps 15544
- 零自动晋级全程成立：published=0、verified=0、auto 分诊=0
- 冻结项全程未触：`effective_visual_assets`=8、`visual_assets` 既有行零 UPDATE

**待拥有者裁定（不擅自动）**：ESC-02 双 relation 存储合并、ESC-03 `modern_location` 建表、ESC-05①③、1246 批内 34 张 excluded 金泽 Commons 图是否恢复、非规范状态取值（evidence_linked/human_reviewed）如何收敛。
