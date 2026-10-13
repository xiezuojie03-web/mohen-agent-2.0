# 墨痕数据生产体系地图 V2.1

**用途：长期生产体系导航 / 人机共同入口**  
**不包含 Phase A–G 执行过程。**

# 0｜一张图

```text
外部资料 / 新文化线索
        ↓
D01 Source Intake
L0 source.*
G0 Source Gate
        ↓
D02 Material Understanding
L1 evidence.*
G1 Evidence Quality Gate
        ↓
D03 Cultural World Construction
L2 world.*
G2 World Integrity Gate
        ↓
D04 Humanistic Discovery
L3 meaning.*
G3 Interpretation Gate
        ↓
D05 Trusted Read Model Assembly
L4 read_model.*
G4 Runtime Eligibility Gate
        ↓
L5 Experience Runtime
        ↓
L6 Participation
        ↓
L7 Living Culture Candidate
        └────────────→ D01
```

Evidence on Demand：

```text
L5
→ L4 Read Model
→ L3 Finding
→ L2 World Object
→ L1 Evidence
→ L0 Source
```

核心：

```text
Dn Gate PASS Output = Dn+1 Legal Entry
```

# 1｜总入口

| 类别 | 路径 |
|---|---|
| 当前状态 | `CURRENT.md` |
| 机器路由 | `AGENTS.md` |
| 目录职责 | `OWNERSHIP_MAP.md` |
| C0–C4 | `governance/` |
| 主协议 | `specs/data-production/MoHen_Data_Production_Protocol.md` |
| Data Contract | `specs/DATA_CONTRACT.md` |
| Registry | `specs/data-production/production-registry.json` |
| G0–G4 | `specs/data-production/gates/` |
| 阶段报告模板 | `specs/data-production/templates/` |
| 物理模型 | `specs/data-production/PHYSICAL_DATA_MODEL_V2.md` |
| 执行体 | `pipelines/data-production/` |
| Agent Runtime | `packages/agent-runtime/` |
| Experience Engine | `packages/experience-engine/` |
| Migration | `supabase/migrations/` |
| Rollback | `supabase/rollback/` |
| Tests | `tests/` |
| Verification | `verification/` |

# 2｜D01 · Source Intake

| 项 | 路径 / 内容 |
|---|---|
| Layer | L0 / `source.*` |
| Gate | G0 |
| Skill | `skills/mohen-source-intake/SKILL.md` |
| Executor | `pipelines/data-production/executors/d01-source-intake.mjs` |
| Gate Contract | `specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md` |
| Machine Report | `specs/data-production/templates/D01_machine-gate-template.json` |
| Human Review | `specs/data-production/templates/D01_human-review-template.md` |
| PASS View | `control.g0_pass_sources` |

下游承诺：

> 来源身份、溯源、locator、内容可获得性和使用边界明确。

# 3｜D02 · Material Understanding

| 项 | 路径 / 内容 |
|---|---|
| Layer | L1 / `evidence.*` |
| Gate | G1 |
| Skill | `skills/mohen-material-understanding/SKILL.md` |
| Executor | `pipelines/data-production/executors/d02-material-understanding.mjs` |
| Machine Report | `specs/data-production/templates/D02_machine-gate-template.json` |
| Human Review | `specs/data-production/templates/D02_human-review-template.md` |
| PASS View | `control.g1_pass_evidence` |

下游承诺：

> Evidence 可回放、忠实、带 source voice、时空适用范围与 uncertainty。

# 4｜D03 · Cultural World Construction

| 项 | 路径 / 内容 |
|---|---|
| Layer | L2 / `world.*` |
| Gate | G2 |
| Skill | `skills/mohen-world-construction/SKILL.md` |
| Executor | `pipelines/data-production/executors/d03-world-construction.mjs` |
| Machine Report | `specs/data-production/templates/D03_machine-gate-template.json` |
| Human Review | `specs/data-production/templates/D03_human-review-template.md` |
| PASS View | `control.g2_pass_world_objects` |

核心对象：

```text
Entity
Event
RelationClaim
Change
HistoricalSpaceClaim
VisualObject
Conflict
```

# 5｜D04 · Humanistic Discovery

| 项 | 路径 / 内容 |
|---|---|
| Layer | L3 / `meaning.*` |
| Gate | G3 |
| Skill | `skills/mohen-humanistic-discovery/SKILL.md` |
| Executor | `pipelines/data-production/executors/d04-humanistic-discovery.mjs` |
| Machine Report | `specs/data-production/templates/D04_machine-gate-template.json` |
| Human Review | `specs/data-production/templates/D04_human-review-template.md` |
| PASS View | `control.g3_pass_findings` |

必须产生：

```text
human_question
interpretive_statement
understanding_delta
counter_view
missing_evidence
present_connection
```

# 6｜D05 · Trusted Read Model Assembly

| 项 | 路径 / 内容 |
|---|---|
| Layer | L4 / `read_model.*` |
| Gate | G4 |
| Skill | `skills/mohen-read-model-publication/SKILL.md` |
| Executor | `pipelines/data-production/executors/d05-read-model-publication.mjs` |
| Machine Report | `specs/data-production/templates/D05_machine-gate-template.json` |
| Human Review | `specs/data-production/templates/D05_human-review-template.md` |
| PASS View | `control.g4_pass_read_models` |

L4：

```text
world_projection
agent_context
story_seed
discovery_path
map_timeline_projection
evidence_pointer
```

# 7｜G0–G4

正式规则：

```text
specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md
```

机器版：

```text
specs/data-production/gates/gate-contracts.v2.json
```

Gate 统一：

```text
Entry
Mandatory Checks
Machine Evidence
PASS
HOLD
REJECT
Reason Codes
Downstream Promise
Negative Examples
```

# 8｜阶段输出报告

每阶段固定两份：

```text
Machine Gate Report
Human Review Stage Report
```

目录：

```text
specs/data-production/templates/
```

Machine Gate 判断：

```text
能不能过
```

Human Review 判断：

```text
值不值得继续
```

# 9｜L5 · Experience Runtime

Authority：

```text
specs/AGENT_CONTRACT.md
specs/EXPERIENCE_CONTRACT.md
specs/data-production/L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md
```

默认边界：

```text
Agent/UI → G4 PASS L4 → L5
```

禁止 Agent/UI 默认直读：

```text
L0
L1
L2
L3
```

Runtime 实现：

```text
packages/agent-runtime/
packages/experience-engine/
```

# 10｜Evidence on Demand

实现：

```text
packages/agent-runtime/src/evidence-on-demand.mjs
```

合法链：

```text
L4 evidence pointer
→ L3 finding
→ L2 world object
→ L1 evidence
→ L0 source
```

只读，不改变 Gate / Truth。

# 11｜L6 Participation

Contract：

```text
specs/data-production/L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md
```

实现：

```text
packages/experience-engine/src/participation-feedback.mjs
```

普通 telemetry：

```text
不能自动成为文化资料
```

# 12｜L7 Living Culture

仅具有文化观察价值且满足 consent / provenance 的 L6 内容：

```text
L6
→ L7 candidate
→ D01 Source Lead
```

禁止：

```text
L7 → L2
L7 → L3
```

# 13｜物理数据

| 语义层 | PostgreSQL Schema |
|---|---|
| L0 | `source` |
| L1 | `evidence` |
| L2 | `world` |
| L3 | `meaning` |
| L4 | `read_model` |
| Control | `control` |

文件：

```text
specs/data-production/PHYSICAL_DATA_MODEL_V2.md
specs/data-production/PERSISTENCE_BINDING_CONTRACT.md
supabase/migrations/
supabase/rollback/
verification/sql/
```

# 14｜唯一执行入口

```text
pipelines/data-production/run.mjs
```

结构：

```text
run
→ orchestrator
→ D01–D05 executors
→ adapters
→ reporting
```

# 15｜验证入口

## D01–D05

```text
tests/data-production/
```

## L5–L7

```text
tests/experience/
```

## 全链 E2E

```text
tests/end-to-end/phase-g-e2e.test.mjs
```

## Guards

```text
scripts/guards/check-runtime-data-boundary.mjs
scripts/guards/check-no-legacy-production-entry.mjs
scripts/guards/check-stage-handoff.mjs
scripts/guards/check-e2e-contract-completeness.mjs
scripts/guards/check-cross-layer-write-boundary.mjs
```

# 16｜机器最短阅读路径

## 数据生产任务

```text
CURRENT
→ C2/C3
→ Protocol
→ DATA_CONTRACT
→ Registry
→ 当前 Stage Skill
→ 当前 Gate
→ 当前 Executor
```

## Agent / Experience

```text
CURRENT
→ C4
→ AGENT_CONTRACT
→ EXPERIENCE_CONTRACT
→ L4_L7_CONSUMPTION_FEEDBACK_CONTRACT
```

## DB Migration

```text
C3
→ DATA_CONTRACT
→ PHYSICAL_DATA_MODEL
→ PERSISTENCE_BINDING
→ supabase/migrations
→ verification/sql
```

## Human Review

```text
当前 Stage Human Review Report
→ 必要时 Evidence on Demand
```
