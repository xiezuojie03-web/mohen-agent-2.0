# mohen-knowledge-weave

Purpose: 人文知识编织  
Trigger: Verified Evidence 形成关系与发现候选

## Preconditions
先执行 `mohen-project-guard`；读取当前 Task。

## Steps
1. 从 verified evidence 生成/补充 Entity、Event、Relation、HistoricalFeature。
2. Relation 必须显式 predicate，不用 crossLink 代替语义。
3. 生成 StorySeed 与 DiscoveryCandidate。
4. Discovery 按九维评分，并执行硬门槛。
5. 保存 evidence_ids，保证可回溯。

## Outputs
- 结构化结果/报告；
- changed/created files 清单；
- 可复现验收命令；
- unresolved / human-review 项。

## Hard Rules
不得把相关性写成因果；不得把视觉类比写成历史事实。

## Acceptance
输出必须能被下一 Skill/Task 直接消费；不能只给自然语言总结。

## Failure / Recovery
失败时保留 Raw/日志/中间结果，停止晋级；修复后从最近稳定状态重跑，不创建平行真源。
