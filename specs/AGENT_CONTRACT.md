# MoHen Agent Contract V2.0

**Status:** TARGET · Phase F
**Authority:** C1 + C2 + C3 + C4
**Default data boundary:** L4 Trusted Read Model

# 1｜Agent 的默认读取边界

Agent Runtime 默认只能消费：

```text
L4 Trusted Read Model
```

即：

- world_projection
- agent_context_view
- story_seed
- runtime_discovery_path
- map_timeline_projection
- evidence_pointer

禁止 Agent Runtime 默认直接查询：

```text
L0 source
L1 evidence
L2 world tables
L3 meaning tables
```

原因不是隐藏证据，而是保持：

> Production Truth → Trusted Read Model → Experience Runtime

之间的边界稳定。

# 2｜Evidence on Demand 例外

用户请求“依据 / 原文 / 为什么 / 证据在哪里”时，允许通过受控 Evidence on Demand Service 反向追溯：

```text
L4
↓
L3
↓
L2
↓
L1
↓
L0
```

要求：

1. 只读；
2. 必须从 L4 已存在 evidence pointer / lineage 出发；
3. 不允许任意绕过 L4 做开放式后台查询；
4. 必须返回 provenance；
5. 不改变任何事实、解释或 Gate 状态；
6. 不暴露内部 chain-of-thought；
7. 用户看到的是“故事 → 理解 → 事实 → 证据 → 原件”。

# 3｜Agent Judgment

Agent 可以决定：

- 当前 Goal 的下一步；
- 哪个 discovery / story seed 值得呈现；
- 哪种 ExperienceAction；
- 是否 Patch / Replace；
- 是否提出 Proposal；
- 是否需要 Evidence on Demand；
- 是否将用户观察转成 Participation Candidate。

Agent 不可以：

- 改写 L0–L4；
- 把用户输入直接写成 Truth；
- 绕过 G0–G4；
- 把模型推测伪装为文化事实；
- 直接生成任意前端代码作为体验。

# 4｜Agent 输出

Agent Runtime 输出的是：

```text
ExperienceAction[]
+
AgentMessage?
+
Proposal[]
+
ContextPatch?
```

而不是数据生产对象。

# 5｜Agent 与 Human Review

Owner Human Review 是数据生产质量治理，不属于 Agent Runtime。

Agent 可以读取已发布的：

- uncertainty
- expression_rule
- evidence pointer
- conflict exposure

但不替项目拥有者执行：

```text
ACCEPT / DEEPEN / DROP
```

# 6｜Feedback boundary

用户行为与现实观察进入：

```text
L6 Participation
→ L7 Living Culture
→ D01 Source Intake
```

不得直接：

```text
L6 → L2
L6 → L3
L7 → L2
```

Feedback 是新的文化资料线索，不是既成事实。
