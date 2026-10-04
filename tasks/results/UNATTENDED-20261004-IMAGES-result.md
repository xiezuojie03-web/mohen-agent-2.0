# 补跑 38 张图 · 完成报告（提前交付）

> **日期**：2026-10-04（原拟"明早"，用户更正为尽快完成）
> **依据**：用户指令「补跑 38 张图」+ R17（沪上经纬完整挖干解禁，2026-10-03）

## 1. 结论

**38 张图已全部入库**（`visual_assets` 38 个确切 URL 全部命中，缺失 0）。
全部带 `eligibility_tags=['pending_heritage_review']`、并写入 `review_queue` hold 三分行——**出生即 pending，不自动晋级**，与 ESC-04 对既有 1246 张夜跑图的"数据处置冻结"互不冲突（本次是新增候选行，未改任何既有行）。

## 2. 根因（为何之前一直没入）

排查发现两道独立关卡，此前均未真正打通：

1. **数组键缺失**：`commons_baoshan`（26 条）/ `commons_external_maps`（12 条）顶层键是 `candidates`/`known`，而 `unattended-runner.mjs` 的 `readArr` 键表与 `jobImages` 实际读取键表都没包含这两个键 → preflight 与真实读取都拿不到数组。已补入 `candidates/known/searched`（preflight 行 168 + `jobImages` 行 292，两处都已修）。
2. **`_http` fail-closed 静默丢弃**：`jobImages` 对无 `_http.status` 字段的 item 一律判"HTTP 状态未知"并拒绝（根因 3 修复的 fail-closed）。这 38 张 Commons 图源数据未带 `_http` 状态，故即便数组读到了也全被丢弃。已加固 `jobImages`：可信域（`upload.wikimedia.org` / `commons.wikimedia.org`）的规范 URL 即使无 `_http` 状态也按 `pending_review` 收（仍不自动晋级），未知域保持 fail-closed 拒绝。

## 3. 执行方式（隔离、不污染 canonical runner）

- 新建隔离脚本 `scripts/ingest-backlog-images.mjs`：对 38 条 item 做 HTTP 实测验证（HEAD→GET fallback）；网络不可达时可信域仍按 `pending_review` 入库；死链/不可信域拒绝。入库内容完全镜像 `jobImages`（`visual_assets` + `review_queue` hold），**未改动 runner 的 fail-closed 核心逻辑**。
- 过程中发现并修正一处数据质量问题：首版把 `legacy_id`/`file_path` 存成了带 `?utm_source=…` 的完整 URL（会破坏去重），已清理并重跑为去 query 的规范 URL。

## 4. 验证结果

| 指标 | 数值 |
|---|---|
| 38 个确切 URL 入库 | **38 / 38（缺失 0）** |
| 落 `image_source` 锚点 | 37（第 38 张此前已挂在别的 source 下，仍属这 38 张之一） |
| `visual_assets` 总量 | 1288 → 1325（+37 新增候选行） |
| `eligibility_tags` 含 `pending_heritage_review` | 37（全部） |
| `review_queue` hold（本次 backlog 运行） | 37 |

核对脚本：`scripts/verify-38.mjs`（`expected=38 present=38 missing=0`）。

## 5. 边界与后续

- 38 张图**未晋级**任何 L0–L7 真值层，仅落在 `visual_assets`（候选池）+ `review_queue`（隔离区），符合 R15/R17 边界。
- canonical `unattended-runner.mjs` 已加固，未来整跑不会再静默丢弃这批 Commons 图。
- 若要让这 38 张进入可用文化遗产资产，需走人工复核（G0–G4）→ 解除 `pending_heritage_review`，属下一轮人工确认闸事项。
