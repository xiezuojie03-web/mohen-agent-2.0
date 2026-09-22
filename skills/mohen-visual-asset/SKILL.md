# mohen-visual-asset

Purpose: 视觉资产治理（盘底 → 定向检索 → 视觉—实体链接 → 证据门槛 → 表达就绪度）
Trigger: 处理图片、舆图、书影、老照片、现代照片；判断「某张图凭什么属于某个对象」；评估「现在能用图做什么表达」

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。**不要把「有量」当「有质」**：图有 N 张，若不挂在具体实体上、没有可辩护的身份，用户点开仍是零图。

## Steps（TASK-0008 已跑通的顺序）

1. **盘底（不动数据）** — 全量既有资产重新分类，互斥、可字段回读：
   `modern_heritage_object` / `historical_townscape` / `general_contemporary` / `unrelated_or_mislabeled` /
   `identity_unresolved` / `metadata_only` / `rights_unknown` / `duplicate`。
   → `pipelines/visual/build-visual-reports.mjs` 产出 `jinze-visual-inventory.md`。
   **「身份未决」必须独立成类**，不得硬塞进「不相关」——说不清的东西塞进"无关"同样是失真。
2. **定向检索（窄，不爬）** — 只查任务书列明靶子；Raw Store append-only、checksum、Source Record、
   权利、检索时刻、**无 secret 的 source URI**；必须支持 `--from-raw` 离线重放（0 网络请求）。
3. **先立规则再判资产** — 可用判据：来源标题/说明**显式点名**该对象且在其行政范围内（`R1`）、
   经**已冻结的名称异写**点名（`R3`）、跨镇同名排除（`R4`）、题录不足（`R5`）。
   **禁止**用视觉相似度、AI 观感、上传日期推断年代。
4. **链接即证据** — `confirmed` 必须指向一条 Evidence；`confirmed 且 link_evidence_id is null` 必须为 0。
5. **门槛** — `VISUAL_EVIDENCE_READY = YES/PARTIAL/NO`，逐条判据写明实测。
   历史/档案项若确不可得，**如实判 PARTIAL，不伪造、不降级判据**（任务书明文允许 PARTIAL 不算失败）。
6. **表达就绪度（不设计 UI）** — `image_immersion` / `past_present_comparison` /
   `spatiotemporal_overlay` / `scene_reconstruction`，各 YES/PARTIAL/NO + 精确原因。
7. **人审只送真不确定项** — 确定性情形（名称异写、已冻结排除）一律按规则定案，不得推给用户。

## Outputs
- `data/exports/jinze-visual-{inventory,evidence,linkage,readiness}.md` + `jinze-visual-human-review.csv`
- 结构化结果 + changed/created files 清单 + 可复现验收命令 + unresolved / human-review 项

## Hard Rules
- 首期**禁止**生成式历史图像；不得把 `similar` 当 same-place；**现代照片永不成为历史状态证据**。
- `creation_date`（照片本身拍摄/制作时点）与 `depicted_period`（被描绘年代）**严格分列**。
- 图片配错属底线错误：身份不可辩护的图宁可不用。

## 已反复踩过的坑（TASK-0008 实测）

- **「零结果」不能直接定性为「没有」**。Commons CirrusSearch 加引号会走**短语匹配**，多词查询天然漏检。
  必须改**不加引号**的单词查询并**枚举全部结果**（`金泽镇` 上限 50 逐条看过），才能说「枚举完也没有」。
- **分类成员身份 ≠ 对象身份**。Commons 分类「金泽」49 个成员以**高铁列车照**为主；
  一张图属于某分类，不代表它描绘了该地的遗产对象。
- **`region_json` 可能被整体覆盖**：`retrieve-amap-jinze.mjs` 的 `on conflict` 是
  `region_json = excluded.region_json`（整体覆盖，非合并），任何重跑都会静默抹掉人工叠加层。
  人工裁决一律**叠加**写入（保留自动判定原值 + `human_review` 键），并用
  `pipelines/visual/check-shr-overlay.mjs` 把静默失败变显式失败（缺失即非零退出）。
- **排除类标记的选择条件必须是「批次身份」，不能是「文件托管位置」**。
  HR-5 曾按 `file_path ilike '%commons.wikimedia%'` 选批次，后续任务新增同托管的合法遗产证据后，
  重跑该管线会把它们一并排除，`effective_visual_assets` **静默归零**。
  修法：按 `source_records.provider='hushang-jingwei'`（该批次真正的来源记录）限定；
  数据修复脚本 `pipelines/visual/repair-hr5-scope.mjs`（带越界断言）。
- **`text[]` 经 psql CSV 回读是 Postgres 字面量字符串**（`{}` / `{天王阁桥}`），**不是 JS 数组**，
  必须自行解析（`pgTextArray`）。`jsonb` 列同理需 `JSON.parse`；SQL NULL 被渲染成空串。
- **别用「当时库内绝对计数」做断言**：`visual_assets` 总量、`human_review_decisions` 总数、
  migration 文件数都会随后续任务合法增长。要断言就断言**不变量**（HR 命名空间隔离、
  「被排除资产进入 effective 者 = 0」、migration 内容不得含配准实现）。
- **确定性 UUID（v3/v5 风格）是幂等的关键**：证据/链接 id 用 `detUuid("visual-evidence:"+checksum)`
  这类派生，配合 `on conflict do update`，重跑计数不变。
- 前端/下游 `effective_visual_assets` 是 WP-E 的**唯一口径**（confirmed + 双方均未被排除），
  不要各写 SQL 漂移。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。
验收须含：`vitest run` 全绿、`guard:docs`/`guard:structure`、各包 `tsc --noEmit`、
**重跑幂等（逐项计数相同）**、`audit orphan` 前后相等、`published = 0`、Legacy 零写、工作树 clean。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
**自检顺序**：`persist-spatial-review.mjs` → `repair-hr5-scope.mjs --dry-run` → `check-shr-overlay.mjs`
（空间管线 `retrieve-amap-jinze` 的任何重跑之后，必须重跑 `persist-spatial-review.mjs` 才能恢复叠加层）。
