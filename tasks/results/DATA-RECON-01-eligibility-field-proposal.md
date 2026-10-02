# DATA-RECON-01 · `visual_assets` 资格模型缺口 — Architecture Reconciliation 提案

- **性质**：**提案，未施工**。属 C3 核心对象变更，依 C0 §2.1 / §7 第 5 步 / §6.2 须由项目拥有者确认后方可实施。
- **提出**：开发总工程师 · 2026-10-02
- **证据**：`tasks/results/` 下的数据库取证（见 `CURRENT.md` §9 ESC-01/02/03 同批）；本提案引用的一切数字均为对 `mohen_dev` 的只读 `SELECT` 实测。

---

## 1. 问题：图片"可用"由列默认值决定，而不是由门禁决定

实测（2026-10-02）：

| 事实 | 实测值 |
|---|---|
| `visual_assets` 是否有"资格 / 状态"字段 | **没有**。仅有 `eligibility_tags text[] NOT NULL DEFAULT '{}'` |
| 语义 | **反向排除名单**："未排除 = 可用" |
| `eligibility_tags = '{}'` 的行 | **1220 / 1288**（另有 68 行已排除） |
| `quality_score` | **1288 / 1288 全为 NULL**（唯一量化质量字段从未写入） |
| `visual_assets` 上的触发器 | **0 个**（视觉门禁只挂在关联表 `visual_entity_links` 上） |
| 无任何实体关联的图片 | **1266 / 1288 = 98.29%** |
| 真正"有效可用"（视图 `effective_visual_assets`） | **8 张（0.62%）** |
| 夜跑时段（≥22:00）内的门禁审计 | **0 条**；1246 张夜跑图片 **0 条** G0–G6 记录 |

**机制**：`visual_assets` 没有正面资格字段 → 唯一表达"不合格"的方式是往 `eligibility_tags` 加排除标记 → 而两条夜跑写入路径（`night-runner.mjs` / `port-photos.mjs`）的 INSERT **都不带该列** → 落入默认 `'{}'` → **无条件"可用"**。

**已发生的后果**（同一批实测）：
- **20 条**被人工作废（HR-5 `excluded_from_heritage_primary`）的资产，被夜跑以**同一 URL** 重新入册为"未排除"（其中 19 条是"金泽**火车站**"的 CRH 高铁列车照）。**已于 2026-10-02 逆转**（`cleanup_20261002_hr5_restore`）。
- **341 / 519**（65.7%）的 BATCH-004 图片在 URL 层面可判读为与金泽无关（他镇桥梁、金山超市、嘉定工业区…）。
- **30 条根本不是图片**（29 个 `.djvu` 古籍扫描 + 1 个 `.webm` 视频）却标 `asset_type='image'`。**其中 28 条已于 2026-10-02 排除**（`cleanup_20261002_nonimage`）。
- **727 张**图片的 `source_id` 指向一个标注为"沪上经纬**诗词**"的源记录（provenance 错位）。
- 23 张 HTTP 非 200 死链入库。

---

## 2. 提案（三选一，请项目拥有者裁决）

### 方案 A（推荐）：给 `visual_assets` 增加正面资格字段 + 门禁触发器

1. **新增列** `eligibility_status text NOT NULL DEFAULT 'pending_review'`，取值：
   `pending_review` / `gate_passed` / `gate_failed` / `excluded`。
   - 默认值即"未审"，**新数据默认为不可用**——与现状"默认为可用"语义相反。
   - 保留 `eligibility_tags` 作为**辅助标记**（如 `excluded_from_heritage_primary`、`pending_heritage_review`），但不再由它单独决定可用性。
2. **新增触发器**：图片写入后必须在 `evidence_gate_audit` 留下 G0–G6 记录，否则 `eligibility_status` 不得为 `gate_passed`（与既有 `vel_confirmed_requires_evidence` 同构）。
3. **改造下游视图** `effective_visual_assets`：由"未被排除"改为 `eligibility_status = 'gate_passed'`。
4. **写入路径改造**：`night-runner.mjs` / `port-photos.mjs` 已改为写入 `pending_heritage_review`（2026-10-02），只需把该标记映射到新列的 `pending_review`。
5. **迁移既有数据**：1288 行统一置 `pending_review`（**不删除**），再按人工复核逐批转 `gate_passed`；已排除的 68 行置 `excluded`。

**代价**：涉及 C3 核心对象（`visual_assets`）与视图、触发器、迁移，属正式 Reconciliation。
**收益**：从"默认可用"翻转为"默认不可用"，图片表首次拥有守门人。

### 方案 B：不新增列，仅把门禁挂到 `visual_assets` 的 `eligibility_tags`

用既有机制表达：所有新写入图片一律先加 `pending_heritage_review`（2026-10-02 已改为此），并在 C3 写明"未经 G0–G6 的图片不得进入体验层"。
**代价**：最小，无需迁移。
**缺陷**：仍是**反向名单**语义，且需要所有下游主动查询该标记；**"默认可用"的根问题未解**。任何忘记查询的新代码仍会把未审图片当成可用。

### 方案 C：维持现状，只在 `CURRENT.md` 记为已知风险

不做结构变更，靠人工复核队列（`review_queue`）逐步清理。
**缺陷**：不解决问题；且已证明夜跑可静默绕过人工裁决。

---

## 3. 配套（无论选哪个方案都应做，均属工程问题）

| # | 项 | 状态 |
|---|---|---|
| 1 | `night-runner.mjs`：图片源必须唯一可确定，否则 **fail loud**（原为无 `ORDER BY` 任意取值） | **已修（2026-10-02）** |
| 2 | `night-runner.mjs`：HTTP 校验改 **fail-closed**（原 fail-open，23 张死链入库） | **已修** |
| 3 | 两脚本：非图片扩展名不再冒充 `asset_type='image'` | **已修** |
| 4 | 两脚本：跨批幂等改为并集 `legacy_id` + 规范化 `file_path`（原致 14 组重复入库） | **已修** |
| 5 | 两脚本：新增图片显式写 `pending_heritage_review`，不再依赖默认 `'{}'` | **已修** |
| 6 | `port-photos.mjs`：不再对全部照片断言 `depicted_period='现代影像（非历史）'` | **已修** |
| 7 | 晨报"安全"段：删除硬编码断言，改为要求查询（原句曾声称"未绕过 Evidence Gate"） | **已修** |
| 8 | **727 张图片的 provenance 纠正**：需为其建立专属 image `source_record` 并回写 `source_id`（数据修复，待裁决） | **未做** |
| 9 | **341 张内容可疑图片的处置**（他镇 / 现代设施）：属**内容判断**，须项目拥有者裁决 | **未做** |
| 10 | **727 张"无法从库内回答拍的是什么"的图片**：需打开原图或读源 JSON 的 caption 才能判定 | **未做** |
| 11 | **109 个门禁 `fail` 对象仍驻留库中**：门禁结果对库内容无清退效力 | **未做** |
| 12 | **`entities.canonical_name` 543 条重名**未做 resolution | **未做** |

> 第 1–7 项已在本轮修复，但**均未运行验证**（无 `MOHEN_WRITE_ENABLED=true` 的实跑环境，且本机 `pwsh` 受限已解除但夜跑需源文件在位）。**建议下一次夜跑前先跑 DRY_RUN 并核对 `inserted / not_image / unverified_status` 三项计数。**

---

## 4. 请裁决

1. 采用 **A / B / C** 哪个方案？
2. 第 8 项（727 张 provenance 纠正）是否授权执行？
3. 第 9 项（341 张内容可疑图片）—— 授权开发总工程师按"非金泽 / 现代设施"标准批量排除，还是由你逐批抽看？
4. 第 11 项（109 个门禁 fail 对象）—— 置为 `rejected`（不删除、保留审计）还是继续留置？
