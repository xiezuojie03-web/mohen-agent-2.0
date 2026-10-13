# mohen-data-ingest

Purpose: 数据采集与登记  
Trigger: 新增 API/PDF/图片/网页/地图原始资料

## 实体化档案（C2 §2.1 · C0 §11 R26）
- **Entry**：`pipelines/legacy/unattended-runner.mjs`
- **Registry 作业**：`src-*`、`coords-wikidata`、`unattended.source-refresh`、`unattended.external-identity`（C5）
- **Reuse Source**：新增来源 / 坐标采集 / 外部身份取回复用本 Entry；动手前先查本档案与生产注册表，不得新建平行脚本。
- **C5 作业要点（2026-10-05 · 外部扩源身份线）**：Wikidata SPARQL 按种子名（`rdfs:label|skos:altLabel` 精确命中）取回 Q-id/P131/P625/P18/P31/P1435；**地域必判**——有 P131 时以 P131 属上海为准（坐标不得翻案，因为矩形必覆盖邻省），无 P131 才用上海外接矩形补漏；同名命中 ≥2 个本地对象时不自选边（HOMONYM_CONFLICT 只留痕）；**按 S3 裁决本作业不写任何 Evidence**，只写 Q-id 线索（`legacy_mappings`）与库外新对象候选（`legacy_id=unattended-ext:wd:<QID>`）。
- **Merge / Deprecate**：重复实现并入本 Entry；被替代时按 R14 归档并写迁移说明。

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. 保存 L0 原始文件；计算 checksum。
2. 建 L1 Source Record。
3. 记录 provider、URI、retrieved_at、license、raw_path。
4. 提取结果只写 staging/candidate。
5. 输出 ingest report：成功、重复、失败、待人工。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
不得直接写 verified/published；不得覆盖 Raw。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
