# mohen-acceptance

Purpose: 交付验收  
Trigger: 任何 Task 声称完成之前

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. 运行 docs/structure guard。
2. 运行 typecheck/unit/data tests。
3. 需要 UI 时运行 Playwright + 截图/状态断言。
4. 核对 Task Acceptance 一项不少。
5. 输出 changed files、tests、evidence、risks、rollback。
6. 未运行的测试必须明确写“未运行”。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
禁止凭“代码看起来正确”宣布完成；禁止伪造测试结果。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
