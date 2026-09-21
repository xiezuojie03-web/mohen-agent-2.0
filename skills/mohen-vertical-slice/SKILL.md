# mohen-vertical-slice

Purpose: 纵向切片编排  
Trigger: 实现完整用户体验链

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. 固定“一镇、一问、一主发现、一追问、一路线”。
2. 列出从 Evidence 到 Experience 的最短依赖链。
3. 先补最短板，不横向建设整个平台。
4. 每层只做到足以贯通下一层。
5. 以 3 分钟连续回放作为最终验收。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
禁止把纵向切片拆成长期孤立的技术工程。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
