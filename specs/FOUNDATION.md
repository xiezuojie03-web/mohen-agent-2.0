# FOUNDATION

## 1. 产品定义
墨痕 Agent 2.0 是“证据驱动的人文时空探索 Agent”。核心循环：

`Context → Understand → Goal → Plan → Act → Observe → Evidence Gate → Discover → Experience → Confirm → Replan`

用户不需要看 Agent 的思考过程；用户应看见地图、时间、图像、关系、证据与路线被重新组织。

## 2. 三层架构
- Agent Action Layer：Tool → Skill → ExperienceAction。
- Agent Runtime：理解、计划、执行、观察、证据、发现、确认、Replan。
- Humanistic World：Raw → Source → Evidence → Knowledge → Experience。

## 3. UI 原则
- Experience Canvas 是视觉主体。
- Mohen Presence 是交互灵魂：Ambient / Guide / Dialogue。
- Dialogue 是通道，不是产品容器。
- Follow-up 优先 Patch 当前体验，不重置世界。
- 每一刻只允许一个 Primary Surface；其余为 Secondary / Context / Hidden。

## 4. 数据原则
- Raw 永久、append-only；结构可重算。
- 来源先于结论；Evidence 先于 Discovery。
- AI 只能创建 Candidate，不能越权成为历史事实。
- 历史地图允许全局配准、局部配准、锚点、空间重建、原图叙事；禁止强行统一配准。
- 视觉类比不能伪装成历史对应。
- 首期禁止生成式历史图像。

## 5. 工程原则
- Greenfield with Existing Assets；老项目只读。
- Git + Contract + Skill + Test 是项目组织记忆；AI 工具是可替换 Worker。
- Vertical Slice First：先一镇、一问、一发现链、一追问、一路线。
- 重复工作第三次出现必须评估升格为 pipeline/skill。
- 代码/Schema/Test 能表达的规则，不复制到长文档。

## 6. 变更边界
改变五层数据模型、Evidence Gate、ExperienceAction、核心目录 Ownership、首期无 AI 生图规则，必须新增 ADR。
