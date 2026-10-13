# 沪上经纬老数据「全量挖干」· 制度障碍清理与无人值守启动记录

> **日期**：2026-10-03 夜
> **授权**：项目拥有者明确授权「完整挖掘沪上经纬老数据，不受任何限制；修掉制度上的所有障碍；今晚启动无人值守生产至明早 06:00 并输出生产报告」
> **执行**：开发总工程师
> **落点**：`tasks/results/UNATTENDED-START-20261003-result.md`

---

## 1. 目标

把 `hushang-jingwei/data/fetched` 的**全部 95 个 JSON（26.0 MB）**按墨痕八层架构完整挖掘，不遗漏任何来源。

---

## 2. 制度障碍清理清单（7 项）

| # | 障碍 | 处置 | 依据与边界 |
|---|---|---|---|
| 1 | **N01 来源清单只登记 61 / 95 个文件**，34 个从未进入 L0（方志 OCR 全文 `gj_*_ocr`、诗词 `souyun_*`、舆图三元组 `yutu_triples_cache`、图片普查 `commons_images` 等） | `pipelines/legacy/unattended-jobs.mjs` 的 `SOURCE_FILES` **扩为目录全量 95 个** | 新增作业由注册表 `src-*` 前缀条目自动覆盖，无需新增注册表条目 |
| 2 | **`images-*` 作业被标 `unattended=forbidden`**，727 张照片被制度卡住 | **解禁为 `allowed`** | 边界：只**新增候选行**，不修改任何既有行（1246 张夜跑图处置仍冻结）；每条出生即带 `eligibility_status=pending_review` 与 `review_queue` hold 三分行，不自动晋级 |
| 3 | **`coords-wikidata` 作业被标 `forbidden`** | **解禁为 `allowed`** | 只写 candidate，`historical_position_proof` 恒 false（不做历史位置证明） |
| 4 | **preflight 的 `metadata_json` 判断失效**：`queryRows` 走 psql --csv，jsonb 返回**字符串**，`r.metadata_json.kind` 恒为 undefined →「排除诗词源」与「图片源唯一确定」两个判断**从未真正生效** | 新增 `metaOf()` 解析，两处判断修正 | 这是静默失效型缺陷：不报错，只是永远剔除 |
| 5 | **图片归属无唯一锚点**（历史根因：727 张图曾挂到「诗词」源上） | 建立**图片批次专属 `source_record`**（`metadata.kind='image_source'`，1 条） | preflight 据此认定唯一 → 图片作业放行 |
| 6 | **研究线 D02 全局预算截断**：按文件顺序取、撞到 `maxObs` 就 break → **字母序靠后的来源一条都没被读**（`commons_images` 519→0、`yutu_plaquettes` 36→0） | 改为**多轮轮转配额**（8 轮 × 每源配额），保证全部可读来源被覆盖；默认 `max-obs 20000 / max-per-source 500` | 实测 Observation 2,714 → **6,913** |
| 7 | **启动方式缺陷**：命令行设 `$env:MOHEN_WRITE_ENABLED` 再起后台进程，嵌套引号把值变成字面量 `'true'` → runner 静默降级 **DRY_RUN（跑一夜一行不写）** | 新增 `scripts/unattended-start.ps1` 固化三道闸与启动动作 | 已实测：用它启动后 `mode=WRITE` |

配套新增工具：`scripts/unattended-start.ps1`（启动入口）· `scripts/db-research-reset.mjs`（研究区按 scope 重置，默认试算）· `scripts/db-apply-migration.mjs`（单文件迁移）· `scripts/db-dedup-gate-audit.mjs`（门禁审计去重）。

---

## 3. 无人值守链路审查结论

| 审查项 | 结果 |
|---|---|
| 三道闸（写开关 / 环境 / write_scope 白名单） | ✅ 齐备（`MOHEN_WRITE_ENABLED=true`、`MOHEN_ENV=dev`、越界即停） |
| 生产注册表 | ✅ `queued=106 declared=106 runnable=104 forbidden=0 unresolved=0` |
| preflight | ✅ 104 可跑；2 个剔除（见 §5） |
| 来源门禁 | ✅ `hushang_legacy → hushang_legacy（LEGACY）` |
| run 级归因 | ✅ `ingest_run_id=e26f9ed9-08b6-4404-820d-9623a9369eb9` |
| 连续失败风险 | ✅ 无（preflight 提前剔除，不在运行中抛错） |

**启动参数**：`--until 06:00 --interval-min 2 --tag UNATTENDED-20261003`
**实测启动**：`START mode=WRITE cutoff=2026-10-03T22:00:00.000Z（本地 06:00）interval=2min jobs=104`
**预计完成**：约 **02:50**（104 × 2 分钟 + 执行耗时），早于截止时间，有余量。

---

## 4. 已执行作业实测（截至记录时）

| 作业 | 结果 | 说明 |
|---|---|---|
| `images-shanghai-verified` | ok / inserted 0 | 727 条中 **704 已在库**（幂等跳过）、23 条 HTTP 非 200 被 fail-closed 拒绝 → 新增 0 是**正确结果**，不是故障 |
| `images-shanghai-census` | ok / inserted 0 | 727 条 **HTTP 状态未知 → fail-closed 全拒**（协议 #7；拒绝即留痕 triaged=727） |
| `coords-wikidata` | ok / inserted 0 | 2 条已存在，幂等 |
| `unattended.source-refresh` | 执行中 | **本轮 L0 增长的关键**：95 个文件登记 + Raw 快照（预计新增 34 条来源） |

---

## 5. 遗留（明早补跑）

- `images-commons-baoshan`（26 条）与 `images-commons-maps`（12 条）：这两个文件的数组键是 `candidates` / `known`，不在读取键表内 → 被 preflight 剔除。
  已在代码里补充键（`rows/records/entries/list`），但**本次运行的进程已加载旧代码**，需明早补跑一次才会生效。合计 38 张图。

---

## 6. 研究线（Discovery）深度重跑

同一目标下的另一半：把老数据**读懂**。

| 指标 | 浅挖首轮 | 深度重跑 |
|---|---|---|
| Observation | 2,714 | **6,913** |
| Mention（已解析） | 3,791（2,149） | **8,610（4,715）** |
| 转引/同源依赖 | 19 | **884** |
| 跨来源候选 | 893 | **2,219** |
| 写入行数 | 10,308 | **23,782** |

守卫复核：`truth_leak=0 promoted=0 longtail_review=0 obs_no_locator=0`；`guard:triage` 研究候选 2,219 / 精选 20 / **分诊行 0**。

---

## 7. 监控与产物

```bash
# 实时进度
cat tasks/results/UNATTENDED-20261003/runner.log        # 逐作业日志
cat tasks/results/UNATTENDED-20261003/progress.json     # 计数与失败清单

# 提前停止（不写报告之外的破坏）
#   在 tasks/results/UNATTENDED-20261003/ 下创建 STOP 文件

# 明早报告（runner 自动三形态输出）
tasks/results/UNATTENDED-20261003/result.md · report.html · report.json
```

启动命令（可复用）：
```powershell
powershell -File scripts/unattended-start.ps1 -Until 06:00 -IntervalMin 2 -Tag UNATTENDED-20261003
```
