# NIGHT-BATCH-001 · 夜间数据生产首跑结果

- 批次：`night-batch-001` · 2026-09-29
- 执行：CodeBuddy（用户 沙漠绿洲 授权数据生产）
- 依据：夜间协议 V1.0 §7（幂等/失败隔离）· §13（冻结规则）；T07 Night Job Contract §1 安全基线；CONTEXT §25 既有工厂链
- 性质：**候选 / 证据供给扩展，零自动晋级**（Tier A = 0）

---

## 1. 做了什么

1. **只读探针确认真源可达**：`db=mohen_dev`、`user=mohen_app`，29 张表；`source_records=212`、`evidence=185`、`entities=15`、`relations=31`、`visual_assets=42`。
2. **修复 ingest 幂等缺陷**（阻塞无人值守的真因）：
   - 原实现裸 `INSERT`，重跑撞 `source_records_provider_checksum_key` 唯一约束直接崩溃；
   - 改为 `ON CONFLICT (provider, checksum) DO NOTHING`；
   - **并发现二次陷阱**：命中冲突时 `RETURNING` 返回 0 行，`queryRows(--csv)` 会把 psql 的 `INSERT 0 0` **命令标签解析成一行伪数据**，导致 `source_id` 取到字符串 `"INSERT 0 0"`。已改为「先查 → 无则插 → 再查」，`source_id` 始终来自 `SELECT`，并显式拦截 `INSERT ` 前缀。
3. **清理调试期污染**：3 条 run（2 条 `source_record_id="INSERT 0 0"`、1 条 `status='running'` 孤儿）**标记 `failed` 保留审计，不删除**。
4. **跑通工厂链**：`ingest → normalize → evidence`。

## 2. 产出（真实计数）

| 阶段 | 结果 |
|---|---|
| ingest | 15 entities / 45 relations / 20 photos / 20 narrative_assets / 3 external_maps / 1 story；`source_reused=true`（该样本**早已入库**，本次无新增来源） |
| normalize | 新增 0（幂等：`relations_existing=24`、`relations_skipped=21`、`claims=0`） |
| evidence | 审计对象 293；G0–G6 审计行 2051；**review_queue 新增 181**、既有 112 |
| 分级 | **Tier A=0**（无自动晋级）/ B=185 / C=108 |
| 导出 | `data/exports/jinze-review-queue.csv`、`data/exports/jinze-data-factory-report.md` |

## 3. 安全核验（逐条对照 T07 §1）

- **零自动晋级**：Tier A=0，未写入任何 `verified` / `published`；符合「AI 不得绕过 Evidence Gate 写入 verified/published」。
- **未碰历史几何**：无 geometry 写入，未补画河道、未做历史复原。
- **未生成式历史图像**：无新增视觉资产（visual 0）。
- **未改 C0–C4 / Schema / 写权限 / 用户布局**：本次仅改管线代码，无 DDL。
- **Raw 保留**：快照 append-only 写入 `D:\MoHen\data\raw\legacy\jinze\`，未覆盖。
- **幂等已验证**：ingest 连跑两遍，`source_id` 同为 `bb392bef-…` 且 `source_reused=true`，第二遍不制造重复来源。

## 4. 改动文件

- `pipelines/ingest/run.mjs`（幂等修复 + `source_reused` 输出）
- `tools/night/probe-connection.mjs`（新增，只读连接/规模探针）
- `tools/night/probe-schema.mjs`（新增，只读列结构探针）
- `tools/night/repair-polluted-runs.mjs`（新增，污染 run 标记 failed，不删除）

## 5. 遗留 / 风险（不粉饰）

1. **无新外部来源入库**。Legacy 金泽样本早已登记（212 条中已有），故 ingest 幂等无新增；S1 上图 API（`SHANGHAI_LIBRARY_API_KEY` 存在）**未调用**——需先确认网络可达与接口契约，不臆测调用。
2. **真正的解锁点仍未解**：CONTEXT §31 指出下一步唯一解锁点是**补证据**（U1–U8，`c6_every_assertion_traceable` 未过，5 条历史断言全库无 Evidence 行）。这需要对方志（1879/1788/1934，TASK-0009 已获取）做**页级 locator + 原文引文**。此项**不得用 OCR 升级为历史事实、不得编造 locator/引文**，故本批未做。
3. **181 项 HOLD 待人工复核**（普通 HOLD 可积累，不要求每日清空）。

## 6. 下一步（建议）

1. 定位已获取的方志原件（含 sha256），确认是否具备可提取文本层；
2. 在有真实 locator 的前提下，为 U6/U7/U8（high）补 Evidence 行，才可能推动 `c6`；
3. 待 S1 接口契约确认后，再启用 N01 Source Refresh 实跑（当前保持 DRY_RUN 语义，不臆测调用）；
4. 夜间调度本身已具备：幂等已修、失败会留痕，可进入 Night Registry。

## 7. 追加批次 · S1 上图定向取回（2026-09-29 23:45）

- 执行：`pipelines/ingest/retrieve-s1-jinze.mjs`（既有取回器；API key 仅内存取用，不落盘 / 不入库 / 不打印）。
- 结果：**12 个查询全部 HTTP 200**；命中 `金泽小志 1 / 青浦 2 / 松江 5 / 地名志 2 / hsly 2`；脚本自报 `source_records_inserted=20`、`evidence_inserted=12`。
- **核验发现（重要，不粉饰）**：
  1. `source_records` 总数**未变（212）** → 这 20 条来源在 2026-09-22 已入库，**本次无新增来源**。
  2. `evidence` 185 → 197：新增 12 条**全部为重复行**（每条 locator 均存在更早孪生行）→ 已按 `source_id + locator + 引文` 精确删除，恢复至 **185**；无子表引用（`claim_evidence=0`、`evidence_fragments=0`）。
  3. **该取回器不具备幂等性**（重跑即产生重复）。库中另有**更早遗留的重复**（同一 Wikidata locator 15 条；多个上图 locator 5–6 条），非本次造成，**需单独决策处置**。
- **关键缺口仍 0 命中**：颐浩寺、普济桥、吕颐浩、赵孟頫 的定向查询全部 `items=0` —— 即 U1–U8 的解锁点**无法由当前这组固定查询获得**。

---

**结论：PASS WITH HOLD**（夜间协议 §8）——管线跑通、181 项候选入 HOLD、零越权晋级；有 HOLD 不是失败。

**必须明确的实话**：本夜**未获得任何新的史料内容**。S1 命中项均为既有（重跑只产生重复并已清理），Legacy 样本亦早已入库。真正的解锁（补证据 U1–U8）仍需**新的检索式**或**原件级辨读**，不能靠重跑既有管线刷出数量。
