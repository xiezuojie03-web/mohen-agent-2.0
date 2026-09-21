# TASK-0003 — Data Factory Minimum Pipeline + Jinze Legacy Staging

Status: READY FOR LOCAL EXECUTION
Decision owner: MoHen Agent 2.0 Architecture
Depends on: TASK-0001 PASS + TASK-0002 PASS

## Goal
建立第一条可运行、可审计的数据生产链，只用“金泽”做首批 Legacy staging：
`Legacy Source → Raw Snapshot → Source Record → Candidate → Evidence Gate → Human Review Queue → Verified Knowledge`

目标不是迁完金泽，而是证明以后人文数据必须走同一条受控管线。

## Read First
只读：`CONTEXT.md`、`specs/FOUNDATION.md`、`specs/DATA_CONTRACT.md`、`specs/SOURCE_REGISTRY.md`、`specs/OWNERSHIP_MAP.md`、`skills/mohen-project-guard/SKILL.md`、`skills/mohen-data-ingest/SKILL.md`、`skills/mohen-evidence-gate/SKILL.md`、`skills/mohen-acceptance/SKILL.md`、本 Task。不要继续通读历史文档。

## Hard Decisions
- PostgreSQL = 正式结构化真源；Raw Store = 原始资料真源。
- Legacy 只作为待迁移来源，不能直接视为 verified truth。
- AI/脚本只能创建 Candidate/Pending，不得直接创建 Verified/Published 历史事实。
- 只处理金泽；不全量迁移 3308 entities / 11 镇。
- 不开发 UI、Agent Runtime、地图、Discovery、RAG、向量库。
- 不安装 Docker/Supabase/PostGIS。
- Legacy 仓库只读。
- 无法证明来源的数据进入 Human Review Queue，不猜值。

## A. TASK-0002 bootstrap 收口
允许新增：
- `scripts/db-bootstrap.ps1`：必要超级用户 bootstrap（extension/role/database preconditions），不得含密码。
- `scripts/db-apply.ps1`：顺序应用 committed migrations。
- `scripts/db-verify.ps1`：验证核心对象与 Evidence Gate。

密码必须交互输入或来自本机安全环境；禁止硬编码/打印/提交。
必须证明 `bootstrap → migrate → verify` 可复现。

## B. Data Factory Migration
新增 `supabase/migrations/202609210002_data_factory.sql`，不得修改历史 migration。

至少新增：

### ingest_runs
`ingest_run_id, pipeline_name, source_scope, started_at, finished_at, status, input_count, candidate_count, verified_count, rejected_count, pending_count, error_count, metadata_json`

### review_queue
`review_id, object_type, object_id, review_tier(A|B|C), reason_code, summary, evidence_ids, status(pending|approved|rejected|needs_research), created_at, reviewed_at, review_note`
Tier C 不得自动 approved。

### legacy_mappings
`mapping_id, legacy_source, legacy_type, legacy_id, target_type, target_id, mapping_status, mapping_method, confidence, ingest_run_id`
唯一约束：`legacy_source + legacy_type + legacy_id + target_type`。

### evidence_gate_audit
`audit_id, object_type, object_id, gate_code, result, reason, actor_type(rule|ai|human), created_at`

## C. Minimum Pipeline
`pipelines/ingest`：读取指定 Legacy snapshot；checksum；Raw snapshot；Source Record；ingest_run；不得 verified。
`pipelines/normalize`：Legacy → candidate；保留 legacy_id；不补猜缺失值。
`pipelines/evidence`：实现最小 G0–G6：
G0 Source completeness；G1 Object identity；G2 Time semantics；G3 Spatial honesty；G4 Evidence support；G5 Conflict detection；G6 Publication eligibility。每个 Gate 写 audit。

## D. Human Review
以下至少 Tier C：
同名异地/身份不确定；坐标来源无法证明；历史年代冲突；只有 crossLink/belongsTo 而无法证明具体人文语义；关键结论缺 Evidence；AI 推断因果/空间对应；历史图像与现代地点疑似同景。

生成 `data/exports/jinze-review-queue.csv`：
`review_id, object_type, display_name, reason, evidence_summary, confidence, recommended_action`
用户不直接审核数据库表。

## E. Jinze Legacy Input
Legacy 仓库只读。先实际确认正式数据入口（预计 `data/seed.master.json`，但必须检查）。

只取首批最小样本：
- ≤15 核心 entities；
- 与这些 entities 直接相关 relations；
- ≤20 visual/photo assets；
- ≤20 agent_knowledge / narrative evidence candidates；
- 金泽 historical map metadata；
- 金泽 story 仅作 Legacy narrative input，不作 verified conclusion。

优先覆盖桥、水系、寺庙/宗教、市场/聚落、关键人物/事件。不为凑数量导入弱数据。

## F. Raw Snapshot
在 `D:\MoHen\data\raw\legacy\jinze\<ingest-run-id>\` 保存本次最小输入 snapshot/manifest。
至少：`manifest.json`、input checksum、Legacy repo commit/hash（可取得时）、source path、extracted legacy IDs、created_at。
Append-only；重跑不得覆盖旧 run。

## G. Candidate Rules
Legacy 导入后默认：
Entity/Relation/Claim = candidate；Visual linkage = pending/candidate；Evidence = candidate/pending。
只有确定性机器转换可 Tier A。本任务不得批量 Legacy → verified。

## H. Data Quality Report
生成 `data/exports/jinze-data-factory-report.md`，至少包含：
ingest run id；输入数量；Source/Evidence/Entity/Relation/Visual counts；G0–G6 pass/fail/pending；Tier A/B/C；缺 source_uri；缺 evidence；缺/可疑 coordinates；structural relation 数；semantic relation 数；visual provenance 风险；待人工审核 Top 10；拒绝/跳过原因。
禁止用单一总分掩盖问题。

## I. Tests
至少覆盖：
1. Raw snapshot 不覆盖旧 run。
2. 同 Legacy ID 重跑不重复 mapping。
3. Legacy Entity 默认 candidate。
4. 无 Evidence Claim 不能 published。
5. Tier C 不能自动 approved。
6. 缺 source/identity/spatial provenance 时 Gate pending/fail。
7. Pipeline 只选金泽，不误迁其他镇。
8. Legacy repo 无写入。

## Allowed Repo Changes
仅：新 migration；上述 3 个 db scripts；`pipelines/ingest/**`、`pipelines/normalize/**`、`pipelines/evidence/**`、必要 `packages/data-access/**`、`tests/data/**`、`legacy/manifests/**`、`data/fixtures/**`、`data/exports/**`、`CONTEXT.md`、`tasks/results/TASK-0003-result.md`。
需要修改其他 owner 时 STOP。

## Forbidden
修改 Legacy；全量 11 镇；正式 UI；Agent Runtime；Experience Canvas；地图；Discovery generator；Vector DB/RAG；AI 自动 verified/published；AI 历史生图；真实 secret 入库；重复职责脚本/文档；修改历史 migration。

## Execution Order
1. Project Guard + clean Git。
2. bootstrap 收口。
3. Data Factory migration。
4. fresh `mohen_test`：bootstrap → all migrations → verify。
5. 实现 ingest/normalize/evidence。
6. 只读确认 Legacy 金泽输入。
7. 创建首个 Jinze Raw Snapshot + ingest_run。
8. 最小样本 → Candidate。
9. 跑 Evidence Gate。
10. 生成 Human Review Queue CSV。
11. 生成 Data Factory Report。
12. 跑旧测试 + 新测试。
13. 验证 Legacy git/status/mtime 无写入。
14. `git diff --check`。
15. 提交并确认 working tree clean。

## PASS Criteria
全部满足才 PASS：
1. bootstrap→migrate→verify 可复现。
2. 新 migration fresh DB 可重建。
3. 首个 Jinze ingest_run 成功。
4. Raw snapshot append-only + checksum/manifest。
5. 只迁金泽最小样本。
6. Legacy 知识默认 candidate/pending。
7. G0–G6 有 audit trail。
8. Tier C review queue 实际生成。
9. CSV 可供非程序员审核。
10. Data Factory report 生成。
11. 重跑无重复 mapping。
12. Evidence Gate invariant 仍通过。
13. 新旧 tests 全绿。
14. Next build/guards 仍通过。
15. Legacy 零修改。
16. Git/report 无 secret。
17. commit 后 working tree clean。

## Stop Conditions
找不到 Legacy 正式入口；无法可靠限定金泽；migration 破坏 TASK-0002 invariant；需要修改 Legacy；必须直接 verified 才能继续；出现平行真源/重复职责；secret staged；可能覆盖 Raw；必须引入 Docker/Supabase/PostGIS/向量库 —— 任一发生立即 STOP，不绕行。

## Result
生成 `tasks/results/TASK-0003-result.md`：
changed files；bootstrap/migration proof；ingest run id；Legacy input scope；Raw snapshot path/checksum；migrated counts；G0–G6；Tier A/B/C；review queue path/count；data quality report path；tests/guards/build；Legacy zero-write proof；deviations/unresolved；git commit/status；rollback。
不得含密码、完整 DATABASE_URL/API key。

## After PASS
停止，不自行开始下一任务。总架构根据真实金泽报告决定先补 Evidence，还是进入 Knowledge Weave。
