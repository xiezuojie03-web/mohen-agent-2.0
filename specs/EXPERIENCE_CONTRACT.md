# MoHen Experience Contract V2.0

**Status:** TARGET · Phase F
**Authority:** C4 Human-facing Experience Constitution

# 1｜L5 Experience Runtime

L5 不是真相层，也不拥有新的文化知识。

L5 保存和计算：

- ExperienceState
- ExperienceAction
- CompositionState
- Trail
- Proposal
- temporary interaction context

L5 默认消费 L4 Trusted Read Model。

# 2｜ExperienceState

最低字段：

```text
goal
intent
place
period
theme
depth

focus
viewport
time
visual
discovery
narrative
evidence
route
trail
nextActions
agentMessage
uiPreferences
```

其中 `uiPreferences`：

- dock mode
- visibility
- size
- position

属于用户界面偏好。

历史体验快照恢复时：

> 恢复语义状态，但保留用户最新 UI 偏好。

# 3｜ExperienceAction

合法语义 Action：

```text
map.focus
map.showLayer
map.hideLayer
map.compare
map.showRelation
time.set
time.compare
image.show
image.compare
entity.focus
entity.open
story.reveal
story.next
evidence.open
route.propose
route.start
experience.patch
experience.replace
agent.ask
agent.propose
```

Renderer 只渲染注册 Surface。

Agent 不操作 DOM，不动态生成未注册 UI。

# 4｜Patch-not-Replace

默认：

```text
experience.patch
```

只有 Goal 本身实质改变时：

```text
experience.replace
```

追问不得清空：

- place
- time
- selected discovery
- trail
- user layout preference

除非该字段与新 Goal 冲突。

# 5｜Evidence on Demand

Evidence 默认第二层。

`evidence.open`：

- 不新增独立 Truth；
- 调用 Agent Runtime Evidence Service；
- 原件细读可进入 Visual Stage；
- 证据摘要进入 MoHen Narrative；
- 必须保留 provenance / uncertainty / support scope。

# 6｜Observe → Replan

以下行为可成为 Participation Event：

- click
- dwell
- close
- skip
- ask
- map zoom/pan
- timeline move
- evidence open
- route start/end
- field observation
- correction
- contribution

这些事件首先属于 L6，不反向修改 L4。

# 7｜Two-primary-component rule

Human-facing 一级组件只保持：

```text
Visual Stage
Mohen Narrative
```

Map / Timeline / Evidence / Trail / Route / Proposal 是职责与 Surface，不强制成为常驻一级栏。

# 8｜Runtime honesty

UI 必须能表达：

- fact
- interpretation
- analogy
- reconstruction
- uncertainty
- conflict
- unknown

表达规则来自 L4，不由 Renderer 自行推断。
