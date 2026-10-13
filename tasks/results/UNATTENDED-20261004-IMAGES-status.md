# 补跑 38 张图 · 状态与明早报告说明

> **日期**：2026-10-04
> **依据**：用户指令「补跑 38 张图，产出明早报告」+ R17（沪上经纬完整挖干解禁，2026-10-03）。

## 1. 发现的关键 bug（否则 38 张仍读不到）

38 张图 = `commons_baoshan_chuansha_20260831.json`（26 条）+ `commons_external_maps_20260831.json`（12 条）。
它们的顶层数组键是 **`candidates`** 与 **`known`**，而 `unattended-runner.mjs` 的 `readArr` 读取键表原为
`items/images/results/data/rows/records/entries/list`——**不含 `candidates`/`known`**。
此前所谓"已补充键（rows/records/entries/list）"的修复**并未覆盖这两个实际键**，因此 preflight 仍会报"未识别出条目数组"并剔除。

**修复**：在 `unattended-runner.mjs` 读取键表补入 `candidates, known, searched`。
验证（用新键表直接计数）：`commons_baoshan → 26`、`commons_external_maps → 12`，合计 38 张图现在可被读取。

## 2. 已启动后台重跑

- 命令：`node pipelines/legacy/unattended-runner.mjs --until 06:00 --interval-min 5 --tag UNATTENDED-20261004`
- 环境：`MOHEN_WRITE_ENABLED=true`、`MOHEN_ENV=dev`（WRITE 模式）
- 进程：已启动（后台 detached），106 个作业、幂等；截止明早 06:00 本地（2026-10-04T22:00Z）。
- 日志：`D:/MoHen/unattended-20261004.log` / `.err`
- 启动校验：`registry entries=14 queued=106 runnable=106 forbidden=0 preflight_excluded=0`，首个作业 `images-shanghai-verified` 幂等跳过（inserted=0）——符合预期。

## 3. 明早报告落点

本轮运行结束时由 runner 自动产出：
`tasks/results/UNATTENDED-20261004/result.md` + `progress.json` + `runner.log`。
其中应包含 38 张图（commons_baoshan 26 + commons_maps 12）的 `visual_assets` 入库行（默认 `eligibility_status=pending_review`，不自动晋级，符合 R15/R17 边界）。

## 4. 边界说明

- 本轮为 WRITE 全量重跑（R17 授权完整挖干），其余 95 来源按 checksum 幂等跳过，仅新增内容（含 38 图）入库。
- 新增图片出生即带 `pending_review` + `review_queue` hold 三分行，不触碰 ESC-04 对既有 1246 张夜跑图的**数据处置冻结**。
- 待明早 result.md 生成后，将补一份「38 图入库 + 全量重跑」的精简报告给用户。
