> **提案类型：Architecture Reconciliation**
> **提案编号**：RECON-01
> **日期**：2026-10-02
> **状态**：待裁决
> **涉及层级**：C3（核心对象 + 写权限语义）

# RECON-01 · `visual_assets` 资格模型：把「默认可用」翻转为「默认待审」

## 改什么

按**方案 A（推荐）**改四处，其余一切不动：

1. **新增列** `eligibility_status text NOT NULL DEFAULT 'pending_review'`，取值 `pending_review` / `gate_passed` / `gate_failed` / `excluded`。默认值即"未审"——**与现状"默认可用"语义相反**。
2. **新增触发器**：置 `gate_passed` 必须在 `evidence_gate_audit` 有对应 G0–G6 记录（与既有 `vel_confirmed_requires_evidence` 同构）。
3. **改视图** `effective_visual_assets`：过滤条件由"未被排除"改为 `eligibility_status = 'gate_passed'`。
4. **迁移既有 1288 行**：统一置 `pending_review`（**不删除**）；已排除的 68 行置 `excluded`。

**不改什么**（边界声明）：不改 `eligibility_tags` 的既有含义与取值（保留为辅助标记）；不改 `visual_entity_links` 及其触发器；**不删除任何行**、不改任何图片内容字段；不改 G0–G6 的定义本身。

## 为什么

实测（2026-10-02，对 `mohen_dev` 只读 `SELECT`）：

| 事实 | 实测值 |
|---|---|
| `visual_assets` 有无"资格/状态"字段 | **没有**。仅有 `eligibility_tags text[] NOT NULL DEFAULT '{}'` |
| 该列语义 | **反向排除名单**："未排除 = 可用" |
| `eligibility_tags = '{}'` 的行 | **1220 / 1288** |
| `quality_score` | **1288 / 1288 全 NULL**（唯一量化质量字段从未写入） |
| `visual_assets` 上的触发器 | **0 个** |
| 无任何实体关联的图片 | **1266 / 1288 = 98.29%** |
| 真正"有效可用"（视图） | **8 张（0.62%）** |
| 夜跑窗口内门禁审计 | **0 条**；1246 张夜跑图片 **0 条** G0–G6 记录 |

**机制**：没有正面资格字段 → 唯一表达"不合格"的办法是往 `eligibility_tags` 加排除标记 → 而两条夜跑写入路径的 INSERT **都不带该列** → 落入默认 `'{}'` → **无条件"可用"**。

**已发生的后果**：20 条人工排除（HR-5）被同 URL 重灌洗掉（其中 19 条是"金泽**火车站**"的高铁列车照）；341/519 图片与金泽无关；30 条根本不是图片却标 `image`；727 张 provenance 错位挂到一个"诗词"源；23 张死链入库。

**不改的代价**：任何忘记查 `eligibility_tags` 的新代码，都会把未审图片当成可用——**默认值站在错误的一边**。已证明夜跑可静默绕过人工裁决。

## 影响谁

| 受谁影响 | 变化 |
|---|---|
| 视图 `effective_visual_assets` | 有效口径由"未排除"变为 `gate_passed`；当前 8 张不变，但**新增图片不再自动进入** |
| 读该视图的代码 | `scripts/audit-visual-assets.mjs`、`pipelines/visual/build-visual-reports.mjs`、`pipelines/visual/build-visual-linkage.mjs`、执行报告事实表 —— 需逐一确认读的是视图还是表 |
| `visual_assets` 全部 1288 行 | 由"未排除"变为 `pending_review`（**语义上从可用变待审**；实际可用集合仍为 8，因视图另要求 confirmed 链接） |
| `evidence_gate_audit` | 成为写入前置条件 → 这是夜跑 `images-*` 作业（现已在生产注册表里标 `forbidden`）**解禁的前提** |
| 体验层 | **未知且是本提案最大风险**：若有任何代码/页面**直接**从 `visual_assets` 取图（不过视图），改动会让它们少掉 1220 张待审图片 |

## 怎么回滚

- **可完全回滚**：新列 `DROP COLUMN`、触发器 `DROP TRIGGER`、视图 `CREATE OR REPLACE` 回原定义（原定义在迁移历史中）。
- **数据可重建**：迁移把 1288 行置 `pending_review` 后，原有状态可由 `eligibility_tags` 推导（`= '{}'` 即原"未排除"），**无需单独备份**。
- **建议分两步**：① 先只加列 + 触发器（不动视图，行为不变）；② 观察一轮后再改视图过滤条件。第二步才是真正改变可用口径的那一步。

## 请你回答什么

1. 采用 **A / B / C** 哪个方案？（推荐 **A**）
2. 本提案最大未知：**是否有代码/页面绕过 `effective_visual_assets` 视图、直接从 `visual_assets` 取图？** 若有，改动会让它们少掉 1220 张。**是否授权我先把这条查清、再实施？**（选项：先查清 / 直接实施 / 先只做第 1 步）
3. 是否按上面的"分两步"实施？（选项：分两步 / 一次到位）
4. 727 张 provenance 纠正（`source_id` 指向"诗词"源）是否授权执行？
5. 341 张内容可疑图片 —— 授权我按"非金泽 / 现代设施"批量排除，还是你逐批抽看？
6. 109 个门禁 `fail` 对象 —— 置 `rejected`（不删、保留审计）还是继续留置？

> **方案 B / C 备选**（供比较）：
> **B**＝不新增列，只用 `eligibility_tags` 表达（已改为显式写 `pending_heritage_review`）。代价最小、无需迁移；**缺陷是仍是反向名单语义，"默认可用"的根问题未解**。
> **C**＝维持现状，仅在 `CURRENT.md` 记为已知风险。**缺陷是不解决问题**。
>
> **决策所需上下文**：本轮已修的 7 处夜跑根因（图片源 fail-loud / HTTP fail-closed / 非图片拒收 / 跨批幂等 / 显式 pending 标记 / 去伪 depicted_period 断言 / 执行报告改真查询）**均未实跑验证**——它们只降低再犯概率，**不改变"默认可用"这一结构缺陷**。
>
> **本提案未列入、但同样未决的项**（不在此处展开，避免超一页）：727 张"无法从库内回答拍的是什么"的图片处置、`entities.canonical_name` 543 条重名未做 resolution。二者已登记在 `CURRENT.md` §9。
