# pipelines/research · Research Production 执行体（Discovery 模式）
> **RETIRED_FIVE_STAGE_NO_CURRENT_AUTHORITY（2026-11-06）**：本文件以下内容仅为早期无D00的D01—D05/Discovery/Directed研究和迁移的历史记录。**已被C0—C4认可、MHKA继续继承的D00—D05/L0—L5/G0—G5六阶段主链取代，禁止再把本文件当现行SKILL、Runner、Registry、Gate/权限或生产操作指令。**
> **当前正式入口**：`pipelines/data-production/run.mjs`，规则与状态见`specs/data-production/MoHen_Data_Production_Protocol.md`及`production-registry.json`；此Registry仍默认禁用。旧代码/本文件处于`DELETE_CANDIDATE / DEPENDENCY_AUDIT_HOLD`，待逐调用者、CLI/CI、数据及回滚依据核查后按MAB移除。M5已依Owner暂停；下面的历史命令不得复制执行。


> **定位**：Discovery Research（D01–D05）的唯一执行体。对应 C2 V1.1 §1.5「两种生产模式」、
> C3 V1.2 §2.9「Research Workspace」、主生产协议 V3.0 §12.2「Research Job Family」。
> **Authority**：本目录不承载任何规则。规则在 C2/C3 与主协议；本目录只负责把规则**跑出来**。

---

## 1. 它做什么

在 **Source 与 Truth Store 之间**补上缺失的一环：把材料**读懂**成内容级 Observation，
再把弱信号**广联**成 Association Candidate，最后**精选**少量候选交回 Directed 线（N01–N06）严证。

```
D01 盘点 → D02 内容读取 → D03 Mention/Dependency → D04 关联扫描 → D05 人文精选
  ↓            ↓                ↓                      ↓                ↓
inventory   observation     mention/dependency    signal/candidate   task/disposition
```

## 2. 它绝对不做什么（硬边界）

1. **0 自动 Truth Promotion**：不写 `entities` / `claims` / `relations` / `visual_assets` / `evidence`
   等任何 Truth 层表。库层由 `research_candidate_zero_auto_promotion`（CHECK `promoted = false`）强制。
2. **只写生产注册表声明的 write_scope**：越界写入 = 停止（主协议 §5.2）。
3. **研究长尾不 1:1 制造 `review_queue`**：只有 Selected / Truth-Promotion / Narrative-Critical /
   Conflict-Critical 才允许挂分诊行（主协议 §3.3）。
4. **研究态不使用资格词汇**：不用 `usable` / `published` / `verified`；用 `association_readiness`
   与 research disposition。
5. **Legacy-first**：第一轮只跑 LR-ADS-01（沪上经纬 Legacy Reservoir，只读本地已抓取 JSON），
   不扩大外部抓取、不新增基础设施（CURRENT §8 HOLD / R16 护栏）。
6. **默认 DRY_RUN**：三道闸不齐只出 plan，不落库。

## 3. 三道闸

| 闸 | 变量 | 不齐的后果 |
|---|---|---|
| 写开关 | `MOHEN_WRITE_ENABLED=true` | DRY_RUN（只算不写） |
| 环境 | `MOHEN_ENV ∈ {dev, staging}` | 拒绝启动 |
| 写范围 | 作业 write_scope ⊆ 生产注册表声明 | 拒绝启动 |

## 4. 用法

```bash
# DRY_RUN（默认）：只出 plan 与计数，不写库
node pipelines/research/research-runner.mjs --scope LR-ADS-01

# 真实写入（三道闸齐备）
$env:MOHEN_WRITE_ENABLED="true"; $env:MOHEN_ENV="dev"
node pipelines/research/research-runner.mjs --scope LR-ADS-01 --max-obs 3000

# 常用参数
#   --scope LR-ADS-01      研究范围标签（写入 research_run.research_scope，机器可校验）
#   --max-obs 3000         Observation 总量上限（控制首轮规模）
#   --max-per-source 200   单来源 Observation 上限
#   --top-k 20             D05 Top-K 精选数
#   --sources a.json,b.json  只跑指定来源（调试用）
```

产物：`tasks/results/LR-ADS-01-<date>/`（`result.md` + `progress.json`）。

## 5. 与守卫的关系

| 守卫 | 校验本目录的什么 |
|---|---|
| `guard:research` | discovery ceiling=0、研究区未写 Truth、0 自动晋级、Observation 有 source_id + locator |
| `guard:registry` | D01–D05 已声明、双模式字段齐备、write_scope 表名真实存在 |
| `guard:triage` | 研究长尾未 1:1 制造 `review_queue` |

**守卫未落地 = 规则未生效**（主协议 §0.2 铁律）。改动本目录后必须跑 `pnpm guard:research`。

## 6. 存储（最小表集，迁移 `202610030010`）

`research_run` · `research_source_inventory` · `research_observation` · `research_mention` ·
`research_source_dependency` · `research_signal` · `research_association_candidate` · `research_task`

物理形态**未冻结**：是否拆为独立 research schema 由 LR-ADS-01 结果决定（C3 §2.9.3）。
