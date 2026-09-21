# TASK-0004 — Jinze Evidence Recovery Sprint

Status: READY FOR LOCAL EXECUTION
Decision owner: MoHen Agent 2.0 Architecture
Depends on: TASK-0003 PASS
Scope: 金泽最小纵向切片的数据补证，不做功能开发

## Goal

针对 TASK-0003 暴露的真实缺口，完成第一轮“补 Evidence，而不是扩数据量”。

优先解决三类阻断：
1. G3：15 个核心对象坐标来源/精度不可证明；
2. G4：24 条 relation 无 Evidence，且全部只是 crossLink；
3. G1：吕颐浩存在跨镇同名/身份歧义。

同时核验 20 个 visual assets 的 provenance。目标不是让所有对象变成 Tier A，而是建立一条可重复的“缺口 → 定向检索 → Evidence → 人工审核 → 晋级/保持 Pending”流程。

## Read First

只读：
1. `CONTEXT.md`
2. `specs/DATA_CONTRACT.md`
3. `specs/SOURCE_REGISTRY.md`
4. `skills/mohen-project-guard/SKILL.md`
5. `skills/mohen-data-ingest/SKILL.md`
6. `skills/mohen-evidence-gate/SKILL.md`
7. `skills/mohen-knowledge-weave/SKILL.md`
8. `skills/mohen-visual-asset/SKILL.md`
9. `skills/mohen-acceptance/SKILL.md`
10. `data/exports/jinze-data-factory-report.md`
11. `data/exports/jinze-review-queue.csv`
12. 本 Task

不要重新设计架构，不要通读 Legacy 其他镇。

## Architecture Decisions

- TASK-0003 = PASS，现有 pipeline 不推倒重来。
- `data/exports/**` 继续作为生成物，不改 `.gitignore`；正式可追溯状态在 DB + Raw Store + committed code/migrations。
- `0 = 未评定` 暂时保留；本 Task 不改 001 migration。后续单独做 schema semantics cleanup。
- 本 Task 先补 Evidence，再进入 Knowledge Weave。理由：当前 semantic relation=0，24 relations 无 Evidence，15 个核心坐标不可证明；此时直接 weave 只会把弱数据编织得更复杂。
- 不追求 Tier A 数量 KPI，不允许为了“通过率”降低 Gate。

## Source Priority

严格按 `SOURCE_REGISTRY.md`。优先：
S1：上海图书馆开放数据/馆藏、地方志/古籍原文、政府/文保公开资料；
S2：可信公共文化机构、图书馆/档案馆、Wikimedia Commons 等有 provenance 的公共资源；
S3：现代空间来源，用于当前坐标/现场位置；
S4：博客、旅游文章、社媒只可作为 clue，不可单独支撑历史 Claim。

若当前环境不能联网或现有 API 不可用，不得伪造检索结果；把检索任务与缺口写入 pending/research queue。

## Work Package A — Coordinate Provenance

对 15 个核心 entities：
- 保留 Legacy lat/lng 作为 candidate，不直接采信；
- 尝试找到可核验的现代空间来源；
- 记录 `source_id / retrieved_at / coordinate / precision_or_scope / method / object_identity_note`；
- 区分“精确点位”“入口/建筑中心”“保护范围/近似位置”“仅镇级位置”；
- 不能证明时保持 G3 fail/pending，不展示坐标。

不得用 AI 根据地名猜坐标。

## Work Package B — Relation Evidence

对 24 条 `crossLink`：
1. 不把 `crossLink` 自动改名成语义关系。
2. 为每条关系寻找 Evidence。
3. 只有 Evidence 明确支持时，才提出 semantic relation candidate，例如：
   - located_on / spans
   - adjacent_to
   - associated_with_temple
   - rebuilt_in
   - mentioned_in
   - connected_to_market
   - historical_name_of
   具体 relation type 必须来自证据，不得为了 schema 好看而硬套。
4. 无证据：保留 structural relation 或 rejected/pending。
5. 任何因果关系（caused_by / led_to / because_of 等）默认 Tier C，需要人工审核。

目标不是 24 条全部语义化；目标是找到第一批可证明的 semantic relations。

## Work Package C — Identity Resolution

对“吕颐浩”：
- 找到至少两个独立识别维度：时代/官职/活动地点/关联事件/原始出处中的任意组合；
- 判断 Legacy 中跨镇记录是同一历史人物的多地关联，还是实体混淆；
- 不确定则保持 Tier C；
- 不允许仅凭姓名一致自动 merge。

输出明确的 identity decision candidate + supporting evidence。

## Work Package D — Visual Provenance

核验本批 20 visual assets：
- 实际 URL/provider 与 source label 是否一致；
- license/rights 是否已知；
- creation date 与 depicted period 分开；
- location/entity linkage 是否 confirmed / suspected / similar / unconfirmed；
- “现代照片可证明地点存在”不得自动变成“可证明历史状态”。

不下载大规模新图片；本轮只补 provenance 和 linkage evidence。禁止 AI 生成历史图片。

## Human Review Policy

本轮将 Human Review 分成：

- Tier A：纯机械/确定性核验，可自动通过，但必须留 audit。
- Tier B：有明确来源、低解释风险，可由规则/AI提出，等待批量复核。
- Tier C：必须用户亲自判断。包括：
  - 身份歧义；
  - 历史因果；
  - 史料冲突；
  - 历史地图/现代空间的非显然对应；
  - 图像“同景”判断；
  - 影响主叙事的关键历史结论。

不要让用户审核 112 行原始队列。生成一个“人工审核精简包”，只保留真正需要用户判断的高价值 Tier C。

## Required Outputs

生成物仍放 `data/exports/`：

1. `jinze-evidence-recovery-report.md`
   - 本轮检索范围与来源；
   - 15 entity 坐标核验结果；
   - 24 relation 处理结果；
   - 吕颐浩 identity 结果；
   - 20 visual provenance 结果；
   - 新增 Evidence 数；
   - Gate 前后变化；
   - semantic relation candidate 数；
   - unresolved gaps；
   - 明确区分“已证明 / 候选 / 未解决”。

2. `jinze-human-review-pack.csv`
   字段至少：
   `review_id, priority, object_type, display_name, decision_question, evidence_for, evidence_against_or_uncertainty, source_refs, recommended_options`
   只放真正需要用户判断的 Tier C，不把机器可解决事项甩给用户。

3. `jinze-research-backlog.csv`
   对本轮无法取得来源的缺口：
   `object_type, display_name, missing_evidence, preferred_source_class, search_hint, blocking_level`

## Database / Audit

- 所有新 Evidence 必须关联 `source_records`。
- 外部资料若被实际使用，先进入 Raw Store/Source Record，再进入 Evidence。
- 所有 Gate 重评必须留下 audit。
- 不覆盖 TASK-0003 Raw Snapshot。
- 不删除旧 Evidence；如发现错误，按状态/审计处理。
- 不直接 Published。
- 允许符合现有 Gate 的对象从 candidate 进入 verified，仅限规则允许且有充分 Evidence；Tier C 不得自动 verified。

## Tests

至少新增/更新测试证明：
1. 坐标无 provenance 不能通过 G3。
2. 有 provenance 但只有镇级范围不能冒充精确点位。
3. crossLink 无 Evidence 不会自动语义化。
4. semantic relation candidate 必须至少有 Evidence linkage。
5. 同名人物不会仅凭 name 自动 merge。
6. visual source label 与实际 provider 不一致时产生风险标记。
7. Tier C 不会自动 approved/verified。
8. Evidence recovery 重跑幂等。
9. Legacy 零写入。
10. TASK-0002/0003 既有 invariants 继续通过。

## Allowed Changes

允许：
- `pipelines/evidence/**`
- 必要的 `pipelines/ingest/**`
- 必要的 `pipelines/normalize/**`
- `packages/data-access/**`
- `tests/data/**`
- `data/exports/**`（生成物，不入 Git）
- `legacy/manifests/**`
- 必要的新 migration（仅当现有 schema 无法表达 provenance/audit；不得修改 001/002）
- `CONTEXT.md`
- `tasks/results/TASK-0004-result.md`

若需要修改其他 owner，STOP 并报告。

## Forbidden

- 扩展到其他古镇；
- 全量抓取；
- 为了补数据而大规模爬取；
- UI / Agent Runtime / Canvas / Discovery 开发；
- RAG / Vector DB；
- PostGIS；
- AI 生成历史图片；
- AI 猜坐标；
- 无 Evidence 语义关系；
- 直接把 Legacy 等级 A 映射成数值 confidence；
- 降低 Gate 标准；
- 修改 Legacy；
- secret 入 Git/报告。

## Execution Order

1. Project Guard + clean Git。
2. 读取 TASK-0003 两份生成报告，建立本轮 gap list。
3. 先做 15 entity coordinate provenance。
4. 再做 24 relation evidence。
5. 单独处理吕颐浩 identity。
6. 核验 20 visual provenance。
7. 新资料走 Raw → Source → Evidence。
8. 重跑 G0–G6。
9. 生成 Evidence Recovery Report。
10. 生成精简 Human Review Pack。
11. 生成 Research Backlog。
12. 跑新旧 tests/guards/build。
13. Legacy zero-write proof。
14. `git diff --check`。
15. commit，working tree clean。
16. STOP。

## PASS Criteria

1. 15 个 entity 坐标全部得到明确状态：verified / approximate / unresolved，不再只是“Legacy lat/lng”。
2. 24 条 relation 全部得到明确状态：semantic candidate / structural only / rejected / unresolved。
3. 至少证明 pipeline 能产生 Evidence-backed semantic relation candidate；若真实资料一个也不支持，则允许 0，但报告必须给出证据说明，不能造。
4. 吕颐浩 identity 有明确 candidate decision 或明确 unresolved。
5. 20 visual assets 全部完成 provenance risk 分类。
6. 新 Evidence 全部可回溯 Source Record。
7. Gate 前后变化可量化。
8. Human Review Pack 只含真正需要用户判断的 Tier C。
9. Research Backlog 覆盖无法解决的缺口。
10. 不以 Tier A 数量作为通过条件。
11. 既有 Evidence Gate/Tier C guard 不被削弱。
12. 所有 tests/guards/build PASS。
13. Legacy 零写入。
14. 无 secret。
15. commit 后 working tree clean。

## Stop Conditions

- 需要用户提供真实 API key 才能继续：STOP，说明具体哪个 source/为什么；
- 需要付费/登录/验证码：STOP；
- 来源冲突且会影响主叙事：进入 Tier C，不自行裁决；
- 需要猜坐标/猜关系/猜身份才能继续：STOP 对该对象；
- 需要修改 Legacy：STOP；
- 需要降低 Evidence Gate：STOP；
- 任务范围开始扩展到其他镇或 UI/Agent：STOP。

## Result

生成 `tasks/results/TASK-0004-result.md`，包含：
changed files；sources used；new Raw/Source/Evidence counts；15 coordinate statuses；24 relation statuses；identity decision；visual provenance statuses；G0–G6 before/after；Tier before/after；human review pack count；research backlog count；tests/guards/build；Legacy proof；deviations；git commit/status。

完成后停止，不自行进入 Knowledge Weave。
