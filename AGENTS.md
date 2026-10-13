# 墨痕 MoHen · 入口路由

> 只回答“遇到什么任务去读哪个文件”。
> 规则冲突以 C0–C4 为准；目录职责以 `OWNERSHIP_MAP.md` 为准。

# 新会话最短入口

```text
CURRENT.md
→ AGENTS.md
→ 按任务读取对应 Authority / Contract
```

| 任务 | 去读 |
|---|---|
| 当前系统状态 | `CURRENT.md` |
| 项目治理 / 权限 / 架构变更 | `governance/C0_*` |
| 产品方向 / 总体架构 | `governance/C1_*` |
| 数据生产方法 / Skill职责 | `governance/C2_*V1.2` |
| L0–L7 / Truth / DB边界 | `governance/C3_*V1.3` |
| Human-facing Experience | `governance/C4_*V2.1` |
| 数据生产总协议 | `specs/data-production/MoHen_Data_Production_Protocol.md` |
| 数据对象与字段边界 | `specs/DATA_CONTRACT.md` |
| Machine Job绑定 | `specs/data-production/production-registry.json` |
| G0–G4完整规则 | `specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md` |
| 阶段输出模板 | `specs/data-production/templates/` |
| 物理数据库 | `specs/data-production/PHYSICAL_DATA_MODEL_V2.md` |
| Persistence边界 | `specs/data-production/PERSISTENCE_BINDING_CONTRACT.md` |
| Agent Runtime边界 | `specs/AGENT_CONTRACT.md` |
| Experience Runtime | `specs/EXPERIENCE_CONTRACT.md` |
| L4–L7消费反馈闭环 | `specs/data-production/L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md` |
| 生产体系快速导航 | `specs/data-production/MoHen_Data_Production_System_Map.html` |
| Skill | `skills/<skill>/SKILL.md` |
| 执行体 | `pipelines/data-production/` |
| Runtime组件 | `packages/agent-runtime/` / `packages/experience-engine/` |
| 动文件 / 目录职责 | `OWNERSHIP_MAP.md` |
| 最终CodeBuddy实施顺序 | `tasks/implementation/FINAL_CODEBUDDY_IMPLEMENTATION_SEQUENCE.md` |

# 正式全链

```text
D01/L0/G0
→ D02/L1/G1
→ D03/L2/G2
→ D04/L3/G3
→ D05/L4/G4
→ L5
→ L6
→ L7
→ D01
```

旧 Discovery / Directed / N01–N06 / Research Workspace 不再是正式入口。
