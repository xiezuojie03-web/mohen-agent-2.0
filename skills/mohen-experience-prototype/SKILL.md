# mohen-experience-prototype

Purpose: 体验母版  
Trigger: Discovery 需要转为用户可见体验

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. 定义 Goal 与 ExperienceState。
2. 每一步指定一个 Primary Surface。
3. Agent 只输出 ExperienceAction/CompositionState。
4. 按 聚焦→线索→历史层→视觉证据→关系→故事→行动 渐进揭示。
5. 重要 Mohen 发言必须指向 Canvas 可见事实/变化。
6. Follow-up 使用 Patch/Replan，不默认重置。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
LLM 不直接写 DOM/React；禁止 GIS Dashboard 式堆叠。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
