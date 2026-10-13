# OWNERSHIP_MAP.md

> **结构 SOT**：Repo 按文件类别 / 系统职责组织，不按 D01–D05 生产步骤组织。

# 0｜正式目录树

```text
mohen-agent-2.0/
├── AGENTS.md
├── CURRENT.md
├── OWNERSHIP_MAP.md
├── DATA_PRODUCTION_MAP.md
├── governance/                 # 宪法与治理
├── specs/                      # 当前有效协议 / Contract / Registry / Config
├── skills/                     # Skill定义
├── pipelines/                  # 执行体
├── scripts/                    # Guard / Report / Maintenance
├── packages/                   # 可复用运行时代码包
├── supabase/                   # migration / rollback
├── data/                       # 数据
├── tasks/                      # 未来实施任务
├── decisions/                  # ADR
├── tests/                      # 自动测试
├── verification/               # SQL / E2E /验证
├── tools/
├── legacy/                     # 只读遗留资产
└── archive/                    # 正式归档
```

# 1｜目录职责

## governance/
只放 C0–C4 与治理域长期 Authority。

## specs/
只放当前有效 Contract / Protocol / Registry / stable specification。

### specs/data-production/
核心：
- `MoHen_Data_Production_Protocol.md`
- `production-registry.json`
- `PHYSICAL_DATA_MODEL_V2.md`
- `PERSISTENCE_BINDING_CONTRACT.md`
- `L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md`
- `MoHen_Data_Production_System_Map.md/html`
- `gates/`
- `templates/`
- machine-readable configs / schemas

## skills/
一个目录一个 Skill。Stage Owner 与 reusable capability 都在此定义，但生命周期 Owner 只能有一套。

## pipelines/
执行体。正式数据生产入口只有：

```text
pipelines/data-production/run.mjs
```

## scripts/
工程控制与验证脚本。Guard 不承担业务真相。

## packages/
复用运行时代码：
- `agent-runtime/`
- `experience-engine/`
- `data-access/`

## supabase/
- `migrations/`：版本化物理结构
- `rollback/`：受控回滚

## data/
只放数据；不得承载正式 Contract。

## tasks/
只放**未来要执行的任务**。过去 Phase A–G 的施工过程记录不进入正式项目树。

## tests/
合同与行为测试。

## verification/
E2E / SQL / migration verification。

# 2｜D/L/G 与目录

D01–D05 / L0–L4 / G0–G4 是生产语义，不是 Repo 顶层目录。

# 3｜过程记录

Phase A–G 的重构过程记录单独存放在项目树之外：

```text
MoHen_Data_Production_Rebuild_Execution_Record_PhaseA-G.md
```

它不拥有 Authority，也不是机器日常入口。

# 4｜旧结构

以下不得恢复为 active 主结构：

- `pipelines/research/`
- `pipelines/legacy/` 中的旧 lifecycle owner
- `bridge-to-directed`
- Research Workspace
- Discovery / Directed 双生产模式
- N01–N06 主链
