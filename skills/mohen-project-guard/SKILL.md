# mohen-project-guard

Purpose: 任务入口守卫  
Trigger: 任何开发/数据任务开始前

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. 读 `CONTEXT.md`、`FOUNDATION.md`、`OWNERSHIP_MAP.md`、当前 Task。
2. 只再读与 Task 直接相关的 Contract/Skill；禁止默认全仓库通读。
3. 搜索同职责文件；检查 Git 状态与未提交修改。
4. 输出 Context Brief：目标、允许修改、禁止修改、验收命令、风险。
5. 发现架构冲突/平行真源/Legacy 写入风险时停止并上报。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
不得直接编码；不得扩大任务范围；不得修改 Legacy。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
