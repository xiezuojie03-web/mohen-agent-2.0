# mohen-visual-asset

Purpose: 视觉资产治理  
Trigger: 处理图片、舆图、书影、老照片、现代照片

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. 登记来源/版权/checksum/原图。
2. 分开 created_date 与 depicted_period。
3. 建立地点/实体关联与 confidence。
4. 视觉对应只允许 confirmed/suspected/similar/unconfirmed。
5. 历史地图登记 georef_status、anchors、uncertainty。
6. 输出可供 Experience 使用的 visual chain。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
首期禁止生成式历史图像；不得把 similar 当 same-place。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
