# TASK-DATA-20261004 · C1 老项目抽取 · 执行结果

> **阶段**：数据底座建厚实 · C1（老项目抽取：source-refresh ＋ evidence-fragment）
> **任务书**：`tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md`（C1 节）
> **执行日期**：2026-10-04 · **环境**：`MOHEN_ENV=dev`、本地 PG `mohen_dev`（R6）、先 DRY_RUN 后 WRITE
> **纪律**：零自动晋级（`verification_status` 恒 `candidate`）；每批独立 `ingest_run_id`；`review_queue` 三分留痕；`locator` 缺 → G0 HOLD（本批未触发）

---

## 1. 完成判定（对照任务书 C1）

| 任务书要求 | 结果 |
|---|---|
| `evidence` 出现老项目 PDF/corpus 来源的 fragment | ✅ corpus 语料抽取 +4812 `evidence`（`extraction_method='unattended-evidence-fragment'`），`evidence_fragments` 由 **16 → 4828**（+4812） |
| `locator` 完整率达标（无大量 G0 HOLD） | ✅ 4812 条新片段 `locator` 全部非空（`evidence.locator is null` = 0），无 G0 HOLD 风暴 |
| 候选写入带 `review_queue` 三分 | ✅ 4812 条 `hold` 分诊（`triage_outcome='auto'` 近 1h = 0） |
| 零自动晋级（R15） | ✅ `published` 实体 = 0、`verified` 证据 = 0、`auto` 分诊 = 0 |
| 门禁审计（C3 §4.2 R15） | ✅ 本批写 `evidence_gate_audit` 33,684 行（每条证据 G0–G6 占位审计，全 pass，非自动晋级） |

**结论：C1 主体完成（代码 + 真实数据落地）。** 下面 §2–§4 记代码变更、数据事实、遗留缺口。

---

## 2. 代码变更（仅 `pipelines/legacy/unattended-runner.mjs`，未动 C0–C4 / 未动库结构）

1. **`unattended.evidence-fragment` 实质性实现**（替换原 stub `jobEvidence`）：
   - 新增 `jobEvidenceFragment(j)`：遍历 `hushang_legacy` 来源（`metadata_json.file` 有本地 corpus 文件的 88 个），`JSON.parse` 后递归抽取「实质中文文本片段」（`isSubstantialText`：长度 24–1200、含 CJK、非 URL/编号）；
   - 长文本按句切分为 ≤400 字可引用片段（`chunkText`）；每片段写 1 条 `evidence`（`evidence_type='text'`、`locator=file#json_path`、`quote_text`、`region_json`）+ 1 条 `evidence_fragments`（`quote_fragment`、`span_type='generic'`、`usable_for_claim='pending'`）；
   - `locator` 缺 → G0 HOLD（本批无触发）；幂等（已抽过的 source 跳过，同源内按 hash 去重）；每来源上限 `MOHEN_FRAG_PER_SOURCE`（默认 200，保均匀覆盖）；
   - 写 `evidence_gate_audit`（G0–G6 pass）+ `review_queue` `hold` 分诊；`verification_status` 恒 `candidate`。
2. **`--only <id|kind>` 开关**：支持单阶段/单作业隔离验收（C1 用它只跑 evidence-fragment）。
3. **修复预存在 bug（finalize）**：`update ingest_runs ... input_count = :ic, candidate_count = :cc, error_count = :ec` 用了未加引号的 `:ic` 占位符，`renderSql` 只替换 `:'name'` 形式 → WRITE 模式 finalize 必报 SQL 语法错（DRY_RUN 跳过该分支故此前未暴露）。改为 `:'ic'/:'cc'/:'ec'`。该 bug 在首次真实写跑时触发，已修；首次 run 数据已落库，仅 runner 自身 `ingest_runs` 状态卡在 `running`，已手动置 `completed`。

> 注：`unattended.source-refresh`（C1 第 1 项）经核已正确接线——队列 `PRODUCTION` 含该作业、`RUNNERS.source` 经 `jobSourceRefresh` 分发、`registry` 条目 `gates=[G0]` 且 `gates_enforced_by` 引用库层唯一约束 + `guard:source-gate`，与 `src-*` 同闸。本次未改动其逻辑（增量刷新语义由 `jobSourceRefresh` 按 `checksum` 幂等重扫 SOURCE_FILES 实现）。

---

## 3. 数据事实（真库查询，非模板断言）

| 事实 | 值 |
|---|---|
| `evidence_fragments` 总数 | 4828（基线 16 → **+4812**） |
| 新 `evidence`（method=`unattended-evidence-fragment`） | 4812 |
| 新 `evidence_fragments`（挂 C1 evidence） | 4812 |
| 新 `evidence_gate_audit`（C1） | 33,684 |
| 新 `review_queue` `hold`（C1 corpus） | 4812 |
| `locator is null`（C1 新证据） | 0 |
| `published` 实体 / `verified` 证据（必须为 0） | 0 / 0 |
| 覆盖 source 数 | 88（92 个 `hushang_legacy` 来源中带本地 corpus 文件者；4 个为 catalog/其他来源无本地文件，不在本作业范围） |

**来源覆盖**：诗词 `content`、宗族 `description`、人物 `notes`、事件 `description`、方志 OCR 等一手中文语料全部落入候选证据池。

---

## 4. 守卫与验证

`node --check` 通过；`pnpm guard:registry`（unresolved=0）、`guard:source-gate`（resolved=22/unknown=0）、`guard:structure`（skills=13）、`guard:structure-map`（undeclared=0）全绿。

执行序列：① DRY_RUN（`--only unattended.evidence-fragment`，would-be +4812，0 写）→ ② 真实 WRITE（`MOHEN_WRITE_ENABLED=true`，落地 +4812，finalize 因预存 bug 崩，数据已落）→ ③ 修 bug → ④ 重跑 WRITE（幂等，0 新增，finalize 正常，报告产出 `tasks/results/WRITE-C1b/`）。

回滚：本批 `ingest_run_id` = `1cebd3e8-…`（首次）/ `7c13bdc9-…`（二次）；按 run_id 范围 `DELETE` 可回滚（协议 #7：Raw 不删）。

---

## 5. 遗留缺口（诚实记录，待裁决/后续）

- **PDF 深文本未抽取**：`hushang-jingwei/data/fetched/` 另有 152 个 PDF、`jp_prefaces/` 1320 个 PDF，以及 `archive/`、`raw_snapshots/` 大量 PDF，**全仓无 PDF 文本抽取库（`pdftotext`/poppler 亦不可用）**。本批仅抽取已结构化的 corpus JSON（其 OCR 文本已内嵌于 `*_ocr.json` 等）。PDF 逐页文本抽取属「确属新能力」——按 R26 须新建技能 + 登记 `implementation`，**建议作为 C5 外部扩源或独立一轮**，不由本阶段静默引入重依赖。
- `evidence_gate_audit` 本批为 G0–G6 占位全 pass（证据片段本身即证据，无跨源冲突可判）；真实晋级判定留待 C3 `gate-projection`。

---

## 6. 下一步

> ✅ **请项目拥有者新开对话，加载 `tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md`，执行 C2（候选抽取与确定性对齐）。**

C2 将消费本批 `evidence`/`evidence_fragments`，抽 Entity/Time/Place/Relation 候选（`unattended.candidate-extraction`）并做精确 ID 对齐（`unattended.deterministic-resolution`），落 `entities`/`relations` 候选表 + `legacy_mappings`。
