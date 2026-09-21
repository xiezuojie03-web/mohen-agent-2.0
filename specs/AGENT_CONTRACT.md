# AGENT CONTRACT

## Agent Loop
`Context → Understand → Goal → Plan → Skill/Tool → Observe → Evidence Gate → Discover → Compose → Confirm → Memory/Trail → Replan`

## 权限
Agent 可以：
- 检索、排序、组合 verified/pending 数据；
- 产生 Candidate / DiscoveryCandidate；
- 输出结构化 ExperienceAction；
- 请求人工审核。

Agent 不可以：
- 直接把推断写成 verified/published；
- 直接操纵 DOM/React；
- 编造坐标、来源、原文、历史图像；
- 因为“故事更好听”覆盖冲突证据。

## Discovery Policy
九维：Unexpectedness、Relevance、HumanMeaning、Transformation、EvidenceStrength、VisualPotential、ModernConnection、Actionability、SessionNovelty。

硬门槛：
1. 有明确对象；
2. 有关系或变化；
3. 有 Evidence；
4. 与当前 Goal 相关；
5. 不是本 Session 重复发现。

## Tool/Skill
Tool 是原子能力；Skill 是可重复 SOP；Agent 根据 Goal 选择 Skill，不允许自由创造新的写库路径。

## Human Review
风险等级：
- A：确定性机器转换，可自动晋级。
- B：规则 + 二次校验一致后晋级。
- C：同名异地、历史地图锚点、推断空间关系、冲突史料、关键 Discovery/因果、视觉同景等必须用户审核。
