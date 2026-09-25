# ENG-GOV-01 Result — Baseline Regression Test Reconciliation

- Task: ENG-GOV-01 · Baseline Regression Test Reconciliation
- Track: Engineering Governance · Phase II / M4 Integration Hygiene
- 模式: TEST-GOVERNANCE / MINIMAL FIX · NO PRODUCT FEATURE
- Baseline commit: `8391815`（EXP-CULTURAL-03 PASS/CLOSED）
- 执行分支: `track/world-cultural-world-02`
- 日期: 2026-09-25

---

## 01 Executive Verdict

**PASS**。原 9 个 baseline tests/data failures 全部解决：5 个为 A/B 类（CW-02 AD-02 合法演进使旧计数/旧状态断言过期），4 个为 fixture 类（沙箱已记录限制：`spawnSync(process.execPath,…)` 恒 EBUSY，CONTEXT.md line 29）。**0 个 C（真实不变量回归）、0 个 D（无法归因）**。全部修复仅改动测试表达与 fixture 执行方式，未改任何产品代码、DB/schema/migration/008 seed/事实数据/UI/Runtime。最终验证：targeted 76/76、tests/data 107/107、experience 146/146（含 experience-script）、全量 suite **253/253 全绿**、`pnpm -r typecheck` 0 error。Gate Recommendation = **PASS_TO_M4_CLOSURE_AUDIT**。

## 02 Context Gate / Pre-fix Reproduction

- Source of Truth：EXP-CULTURAL-03 Result §11/§13（commit `8391815`）；CW-02 construction baseline commit `83fdefb`、ADR-002、migration 008；现行 Evidence Gate / epistemic / HR / HSR / weave / spatial grounding 冻结规则。
- **T-01 在零修改状态精确复现**（证据：tasks/_prefix-repro.log，Start at 13:30:00）：targeted 5 文件 = **9 failed | 67 passed (76)**，与 EXP-CULTURAL-03 Result 报告的失败集合**完全一致**，无新增失败、无产品回归嫌疑 → 未触发 STOP 条件，继续分类。
- 治理指针切换：CURRENT_TASK.md → ENG-GOV-01 Task Book；CONTEXT.md current task → ENG-GOV-01，EXP-CULTURAL-03 降为 PASS/CLOSED prior @ `8391815`。

## 03 Failure Inventory (9 items)

| # | 文件 | 用例 | 失败信息 |
|---|---|---|---|
| F1 | evidence-recovery.test.ts | test 4 semantic relation candidate 必须至少有 Evidence linkage | `expected 0 to be greater than 0` |
| F2 | evidence-recovery.test.ts | test 8 Evidence recovery 重跑幂等 | `spawnSync … EBUSY` |
| F3 | historical-spatial-reconstruction.test.ts | test 14 冻结基底未被本任务改动 | `expected 25 to be 24` |
| F4 | human-review-s1.test.ts | test 10 semantic relation 必须有 Evidence linkage | `relation e0e00e41-8479-4c26-b23e-7d5ac7690fdf (former_site_of) 缺 evidence` |
| F5 | human-review-s1.test.ts | test 11 重跑 persist-human-review 幂等 | `spawnSync … EBUSY` |
| F6 | knowledge-weave.test.ts | test 2 语义关系不来自词语共现 | `expected 1 to be +0` |
| F7 | knowledge-weave.test.ts | test 12 重跑幂等（真实执行两次） | `spawnSync … EBUSY` |
| F8 | spatial-grounding.test.ts | test 12 Knowledge Weave 未被改动 | `expected 25 to be 24` |
| F9 | spatial-grounding.test.ts | test 16 重跑幂等（--from-raw 离线重放两次） | `spawnSync … EBUSY` |

## 04 Root-Cause Classification

**根因 1（F1/F3/F4/F6/F8 的共同根因，CW-02 AD-02 合法演进，commit `83fdefb`）**：
CW-02 新增规范锚 relation `e0e00e41-8479-4c26-b23e-7d5ac7690fdf`（predicate=`former_site_of`，subject=颐浩寺遗址，object=颐浩禅寺旧址方位），其证据挂接在 **008 claim 层**（`cultural_relation_claims` claim `32752c92…`，`evidence_fragment_ids` length=1），而非 legacy `relation_evidence` 表（0 行）。同时该 relation 以 **`legacy_id=''`（空串而非 NULL）** 入列，使旧断言 `legacy_id is not null` 误含该行（24→25）。DB 实测 `legacy_id` 分布：empty=1 / null=6 / nonempty=24。
→ F1/F4 = **B | STALE_STATE_ASSERTION**（证据挂接位演进）；F6 = **B | STALE_STATE_ASSERTION**（无证据语义边误报 1）；F3/F8 = **A | STALE_COUNT_ASSERTION**（固定总数过期）。

**根因 2（F2/F5/F7/F9，沙箱已记录限制）**：
本机沙箱禁止 node 进程内 `spawnSync(process.execPath,…)` 自旋 node 子进程（恒 EBUSY；CONTEXT.md line 29 明确记录）。4 个幂等用例以 `execFileSync` 子进程模式执行管线，属于 **fixture 层执行方式不可用**，与被测不变量（幂等）无关。
→ 分类为 **fixture（非 A/B/C/D 四类中的产品回归）**；处理方式 = 进程内执行同一管线（等价证据），幂等断言零变更。

**C（REAL_INVARIANT_REGRESSION）= 0；D（UNKNOWN/MIXED）= 0。** 未触发 STOP 条件。

## 05 Assertion Reconciliation

> 全部调和**保不变量本体、只改表达**；无删除、无 skip/todo/only、无无理由放宽。

### R1. 双路径证据挂接（修 F1/F4/F6）
- 旧断言：语义关系必须有 `relation_evidence` 行，否则违规（`ev > 0` / `noEv = 0`）。
- 过期原因：CW-02 AD-02 的 former_site_of 证据挂接在 `cultural_relation_claims.evidence_fragment_ids`（008 claim 层、fragment 级），legacy 表 0 行——挂接位合法演进，非证据缺失。
- 新不变量（本体不变）：**无任何证据的语义关系恒为 0**。挂接路径承认两条：legacy `relation_evidence` ∨ 008 `cultural_relation_claims.evidence_fragment_ids`（`coalesce(array_length(...,1),0) > 0`）。
- 新断言（三处：er test 4 / hr test 10 / kw test 2 的 noEv 双路径 SQL）：`Number(r.ev) > 0 || claimEvidence`，其中 claimEvidence 对 data-access 层 `exists()` 返回的字符串 `"t"/"f"` 归一化（`=== true || === "t"`）。

### R2. `nullif(legacy_id,'') is not null = 24`（修 F3/F8）
- 旧断言：`legacy_id is not null` 的 relations = 24（TASK-0006 weave legacy 映射恒 24）。
- 过期原因：CW-02 AD-02 规范锚以 `legacy_id=''`（空串非 NULL）合法入列，`is not null` 误含该行 → 25。
- 判定：24 本身是「weave legacy 映射恒 24」的历史冻结不变量，**不得放宽为 `>=24` 或删除**；用 `nullif(legacy_id,'') is not null` 排除空串，把断言拉回其本义（真正的 legacy 映射 id 必非空），计数回到 24。**不变量本体与数值零变更。**

### R3. 切片谓词行收紧为对象级不变量（修 F6 关联，kw test 2 / hsr test 14）
- 旧断言（TASK-0010 起）：relations 中切片谓词行（spans_waterway / relative_position_south_of / temple_bridge_association）= 0——「weave 不写切片关系」。
- 过期原因：CW-02 AD-02 把 `former_site_of` 规范锚合法写入 relations（被 `historical_spatial_relations.existing_relation_id` 反向指认），切片谓词集合扩展且不再恒 0。
- 新不变量（收紧而非放松）：relations 中的切片谓词行（含 `former_site_of`）**必须是 HSR 规范锚**——未锚定的切片谓词行恒为 0（对无锚切片关系仍然禁止）。SQL：`... and not exists (select 1 from historical_spatial_relations hsr where hsr.existing_relation_id = r.relation_id)` = 0。

### R4. fixture：spawnSync EBUSY → 进程内执行（修 F2/F5/F7/F9）
- 旧 fixture：`execFileSync(process.execPath, [pipeline…])` 子进程执行。
- 不可用原因：沙箱 EBUSY 限制（非产品缺陷，非不变量问题）。
- 新 fixture：**进程内**执行同一管线（等价证据），幂等断言与计数快照零变更：
  - `recover.mjs`（er test 8）：顶层脚本，`await import(pathToFileURL(...))` 自然等待完成；第二次带 `?engov01-rerun=2` 查询串绕过 ESM 模块缓存。
  - `persist-human-review.mjs`（hr test 11）/ `build-jinze-minimum-weave.mjs`（kw test 12）/ `retrieve-amap-jinze.mjs`（sg test 16，另注入 `process.argv` 传 `--from-raw <dir>`）：fire-and-forget `main().catch(...)`（无 TLA），`await import` 不会等 main() 完成 → 以「捕获到**可解析 JSON summary**」为完成信号（管线最后一条语句均为 `console.log(JSON.stringify(summary…))`；等价于子进程模式「进程退出 = main 完成」），≤120s 轮询（200ms 间隔），超时显式 throw。
  - 测试时限调整（fixture 参数，断言零变更）：kw test 12 `90s→300s`（单次 weave 实测 ≈47s）、sg test 16 `120s→300s`（单次重放实测 ≈51s）、hr test 11 `60s`（单次 ≈数秒，未动）、轮询上限 60s/120s 均留足余量。

## 06 Changed Files / Scope Audit

`git diff --stat`（7 files changed, 224 insertions(+), 56 deletions(-)）：

| 文件 | 性质 |
|---|---|
| CONTEXT.md（4 行） | 治理指针（授权） |
| tasks/CURRENT_TASK.md（2 行） | 治理指针（授权） |
| tests/data/evidence-recovery.test.ts | R1 + R4（er4 双路径/"t" 归一化；er8 进程内 import ×2） |
| tests/data/historical-spatial-reconstruction.test.ts | R2 + R3（hsr14 三式调和） |
| tests/data/human-review-s1.test.ts | R1 + R4（hr10 双路径/"t" 归一化；hr11 进程内 import + 完成轮询） |
| tests/data/knowledge-weave.test.ts | R1 + R2 + R3 + R4（kw2 双路径/nullif/HSR 锚定；kw12 进程内 import ×2 + 完成轮询） |
| tests/data/spatial-grounding.test.ts | R2 + R1 + R4（sg12 nullif/双路径；sg16 进程内 --from-raw 注入 ×2 + 完成轮询） |

- **T-10/AT-10 审计结论**：diff 无产品代码、无 DB/schema/migration/008 seed/事实数据、无 UI/GIS/Runtime、无 Timeline calibration、无 M5 改动。无删除测试、无 skip/todo/only（`grep -n "\.skip\|\.todo\|\.only" tests/data/*.test.ts` = 0 命中）。
- 临时文件已清理：`_extract_docx.py`、`tasks/_eng-gov-01-taskbook.txt`、`tasks/_prefix-repro.log`（复现证据已登记于 §02/§03）。3 份 Task Book .docx 按 repo 先例保持 untracked 不提交。

## 07 Targeted Test Results

T-05：targeted 5 文件（evidence-recovery / historical-spatial-reconstruction / human-review-s1 / knowledge-weave / spatial-grounding）
= **76/76 全绿**（其中 kw12 101s 内完成、sg16 101.4s 完成两轮真实管线执行，幂等断言通过）。
第一轮中间态（轮询补齐前）：9→4（4 = er4/hr10 "t" 归一化缺 + kw12/sg16 完成信号缺），全部按 §05 修复。

## 08 tests/data Regression

T-06/AT-07：`npx vitest run tests/data` = **8 文件 107/107 全绿**（含 experience-script 21 用例、foundation、data-factory 等全部文件）。

## 09 Experience/M4.1 Regression

T-07/AT-08：`npx vitest run tests/experience` = **8 文件 146/146 全绿**（含 cultural-world-projection 11 用例、exp-0001、contract、composition2、renderer、visual-grammar、multi-intent、replan-loop）。M4.1 experience regression 继续全绿，EXP-CULTURAL-03 交付零回归。

## 10 Full Suite Result

T-08/AT-09：全量 `npx vitest run`（fileParallelism=false）= **16 文件 253/253 全绿**，EXIT=0，Duration 319.52s。
- 253 = tests/data 107 + tests/experience 146（tests/e2e 为 Playwright，不入 vitest suite）。
- 全量 suite 无任何失败，**无"无法解释的失败"**，满足自评 PASS 前置。

T-09：`pnpm -r typecheck`（6 workspace 包 tsc --noEmit）= **全部 Done，0 error**。本任务改动均在 tests/（vitest 运行时转换，不入包 tsconfig），包级 typecheck 与改动前一致通过。

## 11 Acceptance Tests AT-01~AT-12

| AT | 内容 | 结果 |
|---|---|---|
| AT-01 | 修改前 9 failures 精确复现并登记 | ✓（T-01：9 failed \| 67 passed，集合与 EXP-CULTURAL-03 报告一致） |
| AT-02 | 逐项 A/B/C/D 分类与证据 | ✓（5×A/B + 4×fixture EBUSY；DB legacy_id 分布 empty=1/null=6/nonempty=24；claim `32752c92…` evidence_fragment_ids=1） |
| AT-03 | A/B 修复只改过期测试表达/fixture | ✓（§05 R1–R4；产品与数据真源零改动） |
| AT-04 | 无删测试、skip、todo、only、无理由放宽 | ✓（grep 0 命中；唯一数值断言 24 经 nullif 回到本义，非放宽） |
| AT-05 | 新断言均对应明确 invariant | ✓（无证据语义边恒 0 / legacy 映射恒 24 / 未锚定切片谓词恒 0 / 幂等） |
| AT-06 | 原 9 failures 全部 PASS | ✓ |
| AT-07 | tests/data 全绿 | ✓ 107/107 |
| AT-08 | M4.1 experience regression 全绿 | ✓ 146/146 |
| AT-09 | 全量 suite 全绿 | ✓ 253/253 |
| AT-10 | git scope audit 无越界 | ✓（§06） |
| AT-11 | Architecture/Plan Reconciliation 明确判断 | ✓（§13 = NONE；§14 = NONE） |
| AT-12 | 生成 Result.md；对话框只简报；STOP | ✓（本文件；简报后即 STOP） |

## 12 Remaining Risks

1. **幂等测试的"完成信号"依赖管线末句 `console.log(JSON.stringify(summary))` 的约定**：若未来管线重构改掉末句输出形态，4 个进程内幂等用例会以显式 timeout 报错（fail loud，不静默）。已在代码注释与本 Result 双处登记该约定。
2. **测试时限依赖本机 DB 性能**：kw12/sg16 单次管线实测 ≈47s/≈51s，轮询上限 120s 留 2.3–2.5× 余量；若 DB 显著变慢会 fail loud（可再调 fixture 时限，不影响断言）。
3. **`legacy_id=''` 空串语义**：CW-02 AD-02 规范锚以空串而非 NULL 表示"非 legacy 映射"，属于 schema 约定层面的一个坑（`nullif` 已在各断言统一处理）。建议 M4 Closure Audit 关注是否值得在 ADR 层显式登记该约定。

## 13 ARCHITECTURE_RECONCILIATION

**NONE**。未发现真实冻结不变量与当前实现的冲突：所有过期断言均能用「保本体、改表达」的方式映射回现行冻结架构（Evidence Gate 双路径挂接是 CW-02 AD-02 的合法演进，已有 ADR-002/008 schema 支撑）。

## 14 PLAN_RECONCILIATION

**NONE**。本任务未改变 Phase II/M4 主线或顺序；M4.1 交付物（commit `8391815`）回归全绿。

## 15 Gate Recommendation

**PASS_TO_M4_CLOSURE_AUDIT** —— baseline regression 恢复可信（targeted 76/76、tests/data 107/107、experience 146/146、全量 253/253 全绿），无产品语义变化，无 schema/seed 改动，typecheck 0 error。

## 16 STOP

本 Result 完成，commit 完成后**立即 STOP**。不自行开始 M4 Closure Audit、Timeline calibration 或 M5。
