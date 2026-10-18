# L4–L7 Consumption & Feedback Contract V1.0

# 1｜Forward consumption

```text
D05 / L4 / G4 PASS
↓
L5 Experience Runtime
↓
L6 Participation
↓
L7 Living Culture
```

L5 只能把 G4 PASS read model 视作正式文化内容输入。

# 2｜Evidence on Demand

```text
L5 request
→ L4 evidence_pointer
→ L3 finding lineage
→ L2 adjudicated object
→ L1 evidence
→ L0 source/raw
```

只读。

# 3｜L6 Participation

L6 记录用户与体验世界发生了什么。

Canonical event fields:

```text
participation_id
session_id
event_type
occurred_at
experience_ref
place_context
time_context
payload
user_assertion?
field_observation?
privacy_class
```

Participation 不自动等于 Cultural Source。

# 4｜L7 Living Culture

只有具备文化观察价值的 L6 事件才进入 L7 Candidate。

例如：

- 现场遗存观察；
- 当地口述线索；
- 用户上传的现场照片及说明；
- “旧图锚点今天是否仍在”的实地反馈；
- 对既有叙事的可核查纠错；
- 当代使用方式 / 仪式 / 地方记忆观察。

L7 最低字段：

```text
living_trace_id
source_participation_ids
trace_type
observed_at
place_context
claim_as_observed
media_refs
observer_context
consent
uncertainty
status = candidate
```

# 5｜Loop-back

L7 不进入 L2/L3。

合法回流：

```text
L7 candidate
→ Source Lead
→ D01
→ L0
→ G0
→ D02...
```

这样“当下生活”成为新的文化资料，而不是绕过证据链的事实注入。

# 6｜Prohibited shortcuts

```text
L6 → L2        forbidden
L6 → L3        forbidden
L7 → L2        forbidden
L7 → L3        forbidden
Agent → L2     forbidden
UI → L4 write  forbidden
```

# 7｜Privacy boundary

参与事件与文化贡献分开：

- 普通交互 telemetry 不自动变成文化资料；
- 文化贡献必须有明确 consent / provenance；
- 不需要保存身份时不保存；
- 后续 Source Intake 只接收必要文化内容和 provenance。
