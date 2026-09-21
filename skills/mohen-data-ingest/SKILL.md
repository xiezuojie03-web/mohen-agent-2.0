# mohen-data-ingest

Purpose: 数据采集与登记  
Trigger: 新增 API/PDF/图片/网页/地图原始资料

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
