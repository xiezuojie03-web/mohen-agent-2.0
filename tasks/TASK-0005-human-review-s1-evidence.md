# TASK-0005 — Human Review Decisions + S1 Evidence Sprint

Status: READY FOR LOCAL EXECUTION
Decision owner: MoHen Agent 2.0 Architecture
Depends on: TASK-0004 PASS
Scope: 金泽样板的人审决策落库 + S1 定向补证
Do not enter Knowledge Weave.

## 0. Human Review Decisions — FROZEN

用户已确认按总架构建议执行。以下六项是本 Task 的正式输入，不得自行改写：

- HR-1 = A：采纳 Wikidata Q10918454 作为吕颐浩的外部身份锚点；仅确认人物同一性，不自动证明其与金泽/颐浩寺的全部历史关系。
- HR-2 = A：赵孟頫 ↔ 颐浩寺保留为“传说关联”；必须显式标记 legend/tradition，不得表达成 verified historical fact。
- HR-3 = C：暂不确认“四十二虹桥 ↔ 今存七桥/古桥群”为可批量生成 `part_of` 的同概念集合；保持 pending/research。
- HR-4 = B：吕颐浩 ↔ 颐浩寺“创建/故宅”等关系只允许作为“据方志/地方文献记载”的 candidate；取得 S1 原文前不得升级为无条件历史事实。
- HR-5 = A：本批 20 张视觉资产移出遗产主视图；可作为当代/地点相关素材的仅保留其真实 provenance，不得作为遗产对象历史状态证据。
- HR-6 = C：赵孟頫生年冲突不静默覆盖。Legacy 1271 与外部 1254 保留冲突记录；取得权威/S1 证据后再纠错。

A/B/C 在这里是本次编辑决策代码，不等同于 Data Factory 的 Tier A/B/C。落库时必须避免语义混淆。

## 1. Goal

完成两件事：

1. 将 HR-1～HR-6 以可审计方式写回 review/audit 状态，不修改历史 Evidence，不丢失原始冲突。
2. 使用用户本机已有的上海图书馆开放数据能力进行 S1 定向补证，只解决阻塞金泽 Vertical Slice 的高价值缺口。

本 Task 不以“补完 38 条 backlog”为目标，也不追求 Tier A 数量。

## 2. Read First

只读：
- `CONTEXT.md`
- `specs/DATA_CONTRACT.md`
- `specs/SOURCE_REGISTRY.md`
- `skills/mohen-project-guard/SKILL.md`
- `skills/mohen-data-ingest/SKILL.md`
- `skills/mohen-evidence-gate/SKILL.md`
- `skills/mohen-knowledge-weave/SKILL.md`
- `skills/mohen-visual-asset/SKILL.md`
- `skills/mohen-acceptance/SKILL.md`
- TASK-0004 result
- `data/exports/jinze-evidence-recovery-report.md`
- `data/exports/jinze-human-review-pack.csv`
- `data/exports/jinze-research-backlog.csv`
- 本 Task

不要扫描其他古镇，不重新设计架构。

## 3. Secret / API Rules

- 不要求用户把上海图书馆 API Key 发到聊天、报告或 Git。
- 优先读取项目既定 `.env.local` 中已有变量；若变量不存在，STOP 并只告诉用户需要在本机配置的变量名/用途，不要求显示值。
- 不打印 key，不打印带 key 的 URL，不截图 key。
- 日志必须脱敏。
- 不把真实 key 写入 `.env.example`，只允许变量名占位。
- 若上海图书馆接口的真实调用方式/变量名无法从现有项目或只读 Legacy 配置中安全确认，STOP，不猜 API contract。

## 4. Work Package A — Persist Human Review

为 HR-1～HR-6 建立稳定、可追踪的人审记录。

要求：
- 使用现有 `review_queue` / `evidence_gate_audit` 能表达时，不新增平行 review system。
- 如果现有 schema 无法区分“用户编辑决策 A/B/C”与 Data Factory Tier，允许新增最小 migration，但不得修改 001/002。
- 每条记录必须包含 decision、review_note、reviewed_at、actor=human/user-confirmed、关联对象。
- HR-3 / HR-6 仍为 unresolved/research，不得因为“用户已审核”就变 verified。
- HR-2 的 legend 语义必须机器可读。
- HR-5 必须影响视觉使用资格：遗产主视图不可选择这批不合格资产。

生成 `data/exports/jinze-human-review-decision-log.md`。

## 5. Work Package B — S1 Query Plan

在调用 S1 前，先根据 TASK-0004 backlog 生成最小查询计划，只允许围绕以下主题：

Priority P0:
1. 金泽桥梁：普济桥、万安桥、迎祥桥、如意桥、林老桥、天皇阁桥、放生桥。
2. 水系/桥梁空间关系：能证明桥跨何河、桥与桥/水系关系的原文。
3. 颐浩寺/颐浩禅寺与吕颐浩：寺名、故宅、创建/纪念关系。
4. 《金泽小志》及金泽地方志相关原文。

Priority P1:
5. “四十二虹桥”历史记载及与现存桥群的关系。
6. 赵孟頫与颐浩寺传说的原始/地方文献出处。
7. 赵孟頫生年冲突的权威资料。

不要查询与 Vertical Slice 无关的大量人物、诗词、新闻、旅游资料。

查询计划输出到 run manifest，不单独制造长设计文档。

## 6. Work Package C — S1 Retrieval

对实际返回的上海图书馆/地方志数据：

`API Response → Raw Store append-only → Source Record → Evidence Candidate`

要求：
- 保存原始响应或最小可复现 snapshot；
- checksum；
- source/provider/query/retrieved_at；
- 书名/篇名/卷次/页码或 API 可提供的定位信息尽量保留；
- 原文 quote 必须来自实际返回，不得 AI 补写；
- 搜不到就是“未找到”，不得用 S2/S4 假装 S1；
- API 返回 metadata 但无正文时，metadata 可作 Source，不可伪装成 textual Evidence；
- 如果结果存在 OCR 错误，保存 raw 与 normalized 两层，不静默改原文。

## 7. Work Package D — Evidence Extraction

只从实际 S1 返回中提取与 P0/P1 直接相关的 Evidence。

每条至少：
- source_id
- quote / record locator
- subject/object candidates
- time expression（如有）
- place expression（如有）
- extraction_method
- confidence/unknown semantics 按现有规则
- verified_status
- review requirement

AI 可提取候选，但不得自行裁决史料冲突。

## 8. Work Package E — Re-evaluate Blocking Gaps

重点重新评估：

### Spatial
- 若 S1 只说“某桥在某河/某寺前”，可建立文字空间关系 candidate；
- 没有对象级坐标时，G3 仍不得假装精确点位；
- 不从古文位置描述自动生成现代经纬度。

### Relations
允许在 Evidence 支持下提出 semantic candidate。
不得仅靠关键词生成方向不明的谓词。
因果/创建/故宅关系仍受 HR-4 限制。

### 四十二虹桥
HR-3 已决定暂不批量 `part_of`。
即使找到相关原文，也先形成 Evidence + candidate，等待后续再次审核。

### 赵孟頫
HR-2 = legend only。
HR-6 = birth-year conflict pending until authoritative evidence.
不得因为 S1 提及传说就把 legend 升为 fact。

## 9. Work Package F — Vertical Slice Readiness Report

生成：
`data/exports/jinze-vertical-slice-readiness.md`

不要给虚假的综合分。按以下硬指标逐项 YES / PARTIAL / NO：

- ≥1 usable historical map
- ≥3 reliable spatial anchors
- ≥1 explicit spatial change
- ≥5 effective visual assets
- ≥3 cross-type Evidence-backed semantic relations
- ≥3 Evidence-backed Discovery seeds
- ≥1 meaningful Replan opportunity
- ≥1 walkable route with 3–6 observation targets
- main story thesis has sufficient Evidence
- unresolved critical conflicts listed

最后只给：
`READY_FOR_KNOWLEDGE_WEAVE = YES / NO`
并列出阻塞项。

注意：这是工程 readiness gate，不是为了让结果好看。NO 完全可以 PASS 本 Task。

## 10. Required Outputs

生成：
- `data/exports/jinze-human-review-decision-log.md`
- `data/exports/jinze-s1-evidence-report.md`
- `data/exports/jinze-vertical-slice-readiness.md`
- 更新/重生成 `data/exports/jinze-research-backlog.csv`
- `tasks/results/TASK-0005-result.md`

`data/exports/**` 继续 gitignored，不修改 `.gitignore`。

## 11. Tests

至少覆盖：
1. HR-1～HR-6 六项决策均可追溯。
2. HR-2 legend 不会被当 historical fact。
3. HR-3 pending 不会自动生成批量 part_of。
4. HR-5 视觉资产不能进入 heritage-primary selection。
5. HR-6 conflict 不会被静默覆盖。
6. API raw snapshot append-only。
7. S1 metadata-only 不能冒充正文 Evidence。
8. OCR normalized 不覆盖 raw。
9. 无对象级坐标时 G3 不会因文字位置描述而 pass。
10. semantic relation 必须有 Evidence linkage。
11. 重跑幂等。
12. Legacy 零写。
13. 既有 Evidence Gate/Tier C guard invariants 继续通过。

## 12. Allowed Changes

允许：
- 必要的最小新 migration（不得改 001/002）
- `pipelines/ingest/**`
- `pipelines/evidence/**`
- `packages/data-access/**`
- `packages/domain/**`（仅必要类型）
- `tests/data/**`
- `legacy/manifests/**`
- `data/exports/**`（生成物）
- `.env.example`（仅变量名占位，若确有必要）
- `CONTEXT.md`
- `tasks/results/TASK-0005-result.md`

若需改其他 owner，STOP。

## 13. Forbidden

- 其他古镇；
- UI / Agent Runtime / Canvas / Discovery Engine；
- Knowledge Weave；
- 大规模爬取；
- Vector DB / RAG / PostGIS；
- AI 历史生图；
- AI 猜坐标；
- 无 Evidence semantic relation；
- 把 legend 当 fact；
- 静默修正冲突；
- 为达到 readiness 降低 Gate；
- 修改 Legacy；
- secret 入 Git/日志/报告。

## 14. Execution Order

1. Project Guard + clean Git。
2. 落库 HR-1～HR-6。
3. 生成 S1 最小查询计划。
4. 检查本机 API 配置；缺失则按 Stop Condition 停止并报告。
5. S1 定向 retrieval → Raw Store → Source Record。
6. Evidence extraction。
7. 重评相关 Gate/relations/conflicts。
8. 更新 research backlog。
9. 生成三份 required reports。
10. 生成 Vertical Slice Readiness Gate。
11. 新旧 tests/guards/build。
12. Legacy zero-write proof。
13. `git diff --check`。
14. commit + working tree clean。
15. STOP。

## 15. PASS Criteria

全部满足才 PASS：
1. 六项用户决策可审计落库。
2. 决策语义未与 Data Factory Tier 混淆。
3. S1 查询严格限定 P0/P1。
4. 实际使用的 S1 返回全部 Raw + Source 可追溯；若因缺本机凭据触发 STOP，则不得声称 PASS。
5. Evidence 只来自实际返回。
6. legend/conflict/pending 语义保持诚实。
7. 无对象坐标时不虚构 G3 pass。
8. 新 semantic relation 有 Evidence linkage。
9. Readiness 报告按硬指标输出，不用总分。
10. research backlog 更新。
11. 新旧 tests 全绿。
12. guards/build PASS。
13. Legacy 零写。
14. 无 secret。
15. commit 后 working tree clean。

## 16. Stop Conditions

立即 STOP：
- 本机没有所需 S1 API 配置；
- API contract/变量名无法安全确认；
- API 登录/验证码/付费；
- S1 服务不可达且无法区分临时故障/权限问题；
- 需要猜原文、猜坐标、猜关系；
- 来源冲突影响主叙事；
- 需要修改 Legacy；
- 需要降低 Gate；
- 范围开始扩到其他镇或功能开发。

STOP 时只报告：阻塞点、已完成项、需要用户做的唯一动作。不要自行改用低等级来源替代 S1。

## 17. Result

`tasks/results/TASK-0005-result.md` 必须包含：
- human review persistence proof
- S1 query plan
- API configuration status（不含 secret）
- raw/source/evidence counts
- key evidence findings
- relation/gate changes
- unresolved conflicts
- readiness YES/NO + blockers
- tests/guards/build
- Legacy proof
- deviations
- git commit/status

完成后停止，不自行进入 Knowledge Weave 或 UI。
