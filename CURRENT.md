# CURRENT.md

> **MoHen · Current System State**
> Date: 2026-10-07
> 状态入口，非宪法；Authority 低于 C0–C4。

# 1｜North Star

**从历史文化中重新发现当下生活的意义、乐趣、文化根源与个人共鸣。**

# 2｜当前正式数据生产主线

```text
D01 / L0 / G0
→ D02 / L1 / G1
→ D03 / L2 / G2
→ D04 / L3 / G3
→ D05 / L4 / G4
→ L5 Experience Runtime
→ L6 Participation
→ L7 Living Culture Candidate
→ D01
```

# 3｜当前 Authority

- `governance/C0_*`
- `governance/C1_*`
- `governance/C2_*V1.2`
- `governance/C3_*V1.3`
- `governance/C4_*V2.1`
- `specs/data-production/MoHen_Data_Production_Protocol.md`
- `specs/DATA_CONTRACT.md`
- `specs/data-production/production-registry.json`
- `specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md`
- `specs/AGENT_CONTRACT.md`
- `specs/EXPERIENCE_CONTRACT.md`
- `specs/data-production/L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md`

# 4｜阶段状态

```text
Phase A  DONE
Phase B  DONE
Phase C  TARGET FILES READY
Phase D  TARGET EXECUTION TOPOLOGY READY
Phase E  TARGET FILES READY
Phase F  TARGET FILES READY
Phase G  PASS

A–G target design and implementation package = COMPLETE
```

# 5｜尚未执行

```text
Real Repo Apply = NO
Real DB Apply = NO
Real Production Runtime Apply = NO
```

下一步不是继续设计新的 Phase，而是：

> 按最终项目树与实施顺序，由 CodeBuddy 对真实 Repo / DB 进行受控迁移、验证和切换。

# 6｜已退出正式架构

- Discovery / Directed 双生产模式
- N01–N06 顶层生命周期
- Research Workspace 独立块
- G0–G6 旧 Gate 体系
- bridge-to-directed
- research-pipeline 作为 lifecycle owner
- unattended-runner 作为 lifecycle owner
- unattended 特殊生产链

# 7｜Human Review

每个 D 阶段固定存在两类输出：

```text
Machine Gate Report
Human Review Stage Report
```

Machine Gate：
- PASS / HOLD / REJECT
- 判断能不能过

Human Review：
- 内容统计
- 真实叙事相关数据
- 缺口 / 反例 / 不确定性
- ACCEPT / DEEPEN / DROP
- 判断值不值得继续

# 8｜Runtime Boundary

Default：

```text
Agent/UI → G4 PASS L4 → L5
```

Evidence on Demand：

```text
L5 → L4 → L3 → L2 → L1 → L0
```

Feedback：

```text
L5 → L6 → L7 Candidate → D01
```

禁止：

```text
Agent/UI default direct read L0–L3
Agent → Truth write
L6/L7 → L2/L3
UI → L4 write
```
