# NIGHT-BATCH-002 · 夜间数据生产第二批结果

- 批次：`night-batch-002` · 2026-09-30 夜 → 2026-10-01 凌晨
- 执行：CodeBuddy（用户 沙漠绿洲 授权数据生产，`CURRENT.md` §11.4）
- 依据：夜间协议 V1.0 §7（幂等/失败隔离）· §9（晨报）· §13（冻结规则）；T07 Night Job Contract §1 安全基线；T06 Gap→批次映射
- 性质：**候选 / 证据供给，零自动晋级**（Tier A = 0）
- 上一批：`NIGHT-BATCH-001-result.md`（2026-09-29）

---

## 1. 做了什么（按阶段）

| 阶段 | 状态 | 内容 |
|---|---|---|
| N00 只读探针 | ✅ | `probe-connection.mjs`：确认 Truth Store 可达，盘点 29 表 |
| N00 污染修复 | ✅ | `repair-polluted-runs.mjs`：清理孤儿 / 污染 `ingest_run` |
| Phase 1.1 ingest | ✅ | Legacy → Raw Snapshot + Source Record（幂等） |
| Phase 1.2 normalize | ✅ | Raw → Candidate（保留 legacy_id，不补猜缺失值） |
| Phase 1.3 evidence | ✅ | Evidence Gate G0–G6 评估 + 审计留痕 + 复核队列 + 导出 |
| Phase 2 本地核验 | ✅ | 连接探针复跑，逐表计数核对 |
| Phase 2 查重 | ✅ | `check-evidence-dupes.mjs`：locator 重复组核查 |
| Phase 3 云端同步 | ⏭ 跳过 | 用户裁决跳过（见 §5.4） |

### 1.1 落盘凭证

```
run_id         = jinze-20260930-d9ec9320
ingest_run_id  = a6f3c009-9f29-42ae-a5a0-6a91f9f93b3a
source_id      = bb392bef-f435-4f6f-9284-fbfa95e86e21
source_reused  = true
snapshot_dir   = D:/MoHen/data/raw/legacy/jinze/jinze-20260930-d9ec9320
```

`source_reused=true` → 该样本早已入库，本批无新增来源。

### 1.2 执行过程中的工具故障（如实记录）

批次执行中段，命令执行工具发生**调用层故障**（连 `Write-Host ok` 都报"缺少 command 参数"），导致 Phase 1.3 与 Phase 2 一度中断等待。

- 该故障出现在 **Phase 1.1 / 1.2 完成之后**，已完成状态已落本地库，**未丢失**；
- 工具层恢复后，Phase 1.3 与 Phase 2 合并为**一次调用**跑完，降低再次触障概率；
- 结论：属工具通道瞬时故障，**非管线缺陷、非数据问题**。

---

## 2. 产出（真实计数）

| 阶段 | 结果 |
|---|---|
| ingest | `source_reused=true`；快照 append-only 写入 Raw；无新增来源 |
| normalize | 新增 0（幂等；`relations` 库内 31 条在位） |
| evidence | 审计对象 **293**；G0–G6 审计行 **2051**；**review_queue 新增 0**、既有 **293** |
| 分级 | **Tier A=0**（零自动晋级）/ B=185 / C=108 |
| 导出 | `data/exports/jinze-review-queue.csv`、`jinze-data-factory-report.md` |

### 2.1 Phase 2 本地核验（逐表）

`source_records=212` · `evidence=185` · `entities=15` · `historical_features=5` · `historical_feature_anchors=9` · `relations=31` · `historical_spatial_relations=8` · `historical_change_records=5` · `cultural_events=9` · `cultural_relation_claims=8` · `cultural_present_connections=2` · `visual_assets=42` · `visual_entity_links=22`

**与 NIGHT-BATCH-001 基线逐表一致**，DB 健康。

### 2.2 Phase 2 查重结果

- 检出 **21 组** locator 重复；
- **全部为 2026-09-22 历史遗留**（Wikidata `Q13694319` 一组 15 条；上图多个 locator 5–6 条），**非本批造成**；
- 60 分钟窗口核查：**新建 evidence = 0，新建但 locator 已存在的 evidence = 0** → 本批**未制造任何新重复**；
- 处置：**仅核查、未删除**（遵守夜间协议 §7 No destructive cleanup）。

---

## 3. 安全核验（逐条对照 T07 §1）

- **零自动晋级**：Tier A=0，未写入任何 `verified` / `published`；未绕过 Evidence Gate。
- **未碰历史几何**：无 geometry 写入，未补画河道、未做历史复原。
- **未生成式历史图像**：无新增视觉资产。
- **未改 C0–C4 / Schema / 写权限 / 用户布局**：本批仅按管线运行，无 DDL。
- **Raw 保留**：快照 append-only 写入 `D:/MoHen/data/raw/legacy/jinze/`，未覆盖、未删除。
- **幂等已验证**：review_queue 新增 0、`evidence` 保持 185、`source_reused=true`，重跑不制造重复事实。
- **无破坏性清理**：`repair-polluted-runs` 只标记 `failed`（不删除、保留审计链）；重复 evidence 只核查未删。

### 3.1 污染 run 处置明细

```
POLLUTED_RUNS=2
  138388f2-9948-4e45-8bb0-69487f6a0bb5  status=failed  started=2026-09-29 23:15:39
  6ff7018e-9fa1-45c6-8278-86f5cd3b3fb4  status=failed  started=2026-09-29 23:15:40
REPAIRED=2
```

两条均为 09-29 那批调试遗留（`source_record_id="INSERT 0 0"`），本批**未新增孤儿 run**。

---

## 4. 改动文件

本批**未修改任何管线代码**，仅运行既有脚本并产出：

- `data/exports/jinze-review-queue.csv`
- `data/exports/jinze-data-factory-report.md`
- `tasks/results/NIGHT-BATCH-002-result.md`（本文件）

---

## 5. 遗留 / 风险（不粉饰）

### 5.1 本批零新增内容（最重要）

管线链路跑通、计数健康，但**没有产出任何新的史料内容**：

- `source_reused=true` → 无新增来源；
- evidence 新增 0、review_queue 新增 0；
- 全部数字与 NIGHT-BATCH-001 **逐个对得上**，属**纯幂等重跑**。

**真正的解锁点仍未解**：颐浩寺 / 普济桥 / 吕颐浩 / 赵孟頫 相关 U1–U8 断言全库无 Evidence 行，`c6_every_assertion_traceable` 未过。此项**不得用 OCR 升级为历史事实、不得编造 locator/引文**，故本批未做，只能靠**新的检索式**或**原件级辨读**。

### 5.2 历史重复 evidence 仍待决策

21 组 locator 重复（2026-09-22 遗留）**未清理**，需单独决策处置。清理前必须确认无子表引用（`claim_evidence` / `evidence_fragments`），且不得动 Raw。

### 5.3 review_queue 待人工复核

既有 **293** 项在队（普通 HOLD 可积累，不要求每日清空）。其中含待补证的待审项。

### 5.4 云端同步跳过（用户裁决）

Phase 3（`pg_dump` + `pg_restore` 到 Supabase `mohen-cloud`）**本批未执行**，理由：

- 本批**零新增数据**，云端与本地实际一致（DB-01 已 SUCCESS，28 表一致）；
- 唯一差异：本地新增 1 条 `ingest_runs` 记录（`a6f3c009-…`）尚未进云端；
- `pg_restore` 具覆盖性质，在无新增内容时执行收益不抵风险。

**遗留待办**：若后续认定云端需与本地严格一致，需补一次同步，届时本条差异一并带入。

---

## 6. 下一步（建议）

1. **新的检索式**优先：针对 U6/U7/U8（high）设计指向颐浩寺 / 普济桥 / 吕颐浩 / 赵孟頫 的检索式，而非重跑既有固定查询；
2. **原件级辨读**：定位已获取方志原件（1879/1788/1934，TASK-0009），确认是否具备可提取文本层；有真实 locator 后再补 Evidence 行，才可能推动 `c6`；
3. **决策 21 组历史重复**：确认清理方案与范围，再执行；
4. 待 S1 接口契约确认后，再启用 N01 Source Refresh 实跑；
5. 云端同步按需补跑（见 §5.4）。

---

**结论：PASS WITH HOLD**（夜间协议 §8）——管线跑通、幂等成立、零越权晋级、未制造新重复；有 HOLD 不是失败。

**必须明确的实话**：本夜**未获得任何新的史料内容**。这是纯幂等重跑，所有计数与上一批逐个一致。真正的解锁（补证据 U1–U8）仍需**新的检索式**或**原件级辨读**，不能靠重跑既有管线刷出数量。
