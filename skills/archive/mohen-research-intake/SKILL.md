# mohen-research-intake

Purpose: 按载体把资料真正读进来（source-specific content reading），形成可定位的内容级 Observation
Trigger: 需要盘点来源（Discovery Intent / Research Scope），或需要按载体读取内容时

## 实体化档案（C2 §2.1 · C0 §11 R26）
- **Entry**：`pipelines/research/research-pipeline.mjs`
- **Registry 作业**：`research.source-inventory`(D01)、`research.content-observation`(D02)
- **Reuse Source**：来源盘点 / 载体内容读取复用本 Entry（Discovery 执行体）；不得新建平行的盘点或内容读取脚本。
- **Merge / Deprecate**：重复实现并入本 Entry；被替代时按 R14 归档并写迁移说明。
- **模式**：Discovery（`truth_write_ceiling = 0`，0 自动 Truth Promotion）

## Preconditions
先执行 `mohen-project-guard`；确认已声明 Discovery Intent / Research Scope（限地点 / 时间 / 来源 / 规模且机器可校验）。

## Steps
1. 资料盘点：列出来源与载体，形成 Search Context Pack。
2. 载体分类：按 T01–T14 判定载体类型。
3. 内容级读取：抽取 Observation，必须带 `source_id` + `locator/region` + `modality`；缺 `locator` 不得进入关联池。
4. 保留不确定性：把"材料中看到什么"记成 Observation，不抢先变 Entity / Evidence。

## Outputs
- 内容级 Observation（含 locator/region 与不确定性）；
- 来源盘点清单与载体分类结果；
- 可回放的读取报告。

## Hard Rules
- Discovery 模式 **0 Truth 写入**：不写 Runtime Truth，不自动晋级。
- 不得把 unresolved mention 写成 Entity（C3 §2.9.1）。
- 转引 / 同源必须登记为 dependency，不得计为独立来源。
- 缺 `locator` 的 Observation 不得进入关联池。

## Acceptance
Observation 可被 `mohen-association-discovery` 直接消费；有 `locator` 可回溯定位。

## Failure / Recovery
失败时保留盘点与读取中间结果，停止；修复后从最近稳定状态重跑，不创建平行真源。
