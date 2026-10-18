# OWNERSHIP_MAP.md

> **REVIEW_DRAFT_NOT_APPLIED｜2026-10-15。** 目标根入口稿，基于handoff/local-b-20260930@8966d1bf62d7c2ea199d6568cc1b16bba664bd26；尚未替换工程。原文件与实际运行状态留M0核验。



> **结构 SOT**：Repo 按文件类别 / 系统职责组织，不按D00—D05生产步骤组织。

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
- `L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md`（目标文件；旧L4_L7版本按代际归档）
- `MoHen_Data_Production_System_Map.md/html`
- `standards/d00/`—`d05/`：现行专业标准，逐文件清单见11矩阵§8.4，不复制进多个Skill
- `relations/`：正式关系登记与设计处置分层，不作为默认Runtime allowlist
- `schemas/`：机器结构约束；含拟新增`method-route-decisions.schema.json`
- `gates/`
- `templates/`
- machine-readable configs / schemas

## skills/
一个目录一个Skill。阶段Owner与可复用能力分别登记；每阶段只拥有一个生命周期Owner。保留五个可适配Stage Skill，新增mohen-carrier-reading承接D01/C，material-understanding承接D02/H。新Skill是PLANNED，未实现不称正式能力。

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
- `data-access/`（唯一 DB 访问层，**双后端**：写路径 `run`/`runMany` 走 psql 二进制——本地生产链离线/确定性/零依赖；读路径 `queryRows`/`queryValue` 自动切换 psql 或 node pg——消费层 serverless 部署时经 `DATABASE_URL` 直连，见 `node-pg-client.mjs`。`MOHEN_DB_DRIVER=pg|psql` 可显式指定，默认本机有 psql 用 psql、否则 node pg。）

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

D00—D05 / L0—L5 / G0—G5是目标生产语义，不是 Repo 顶层目录。

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

# 5｜交付目录与工程归档

Library现行研究树继续用于专业研究与审阅，不因未来包装迁移而搬空或改成源码树。交付包根建议为README.md、DELIVERY_MANIFEST.csv、repo_target/、reference/；这是**未来布局规格，当前未建包**。

`repo_target/`下每项相对路径必须等于其仓库目标相对路径，例如repo_target/governance/<C2新版本文件>→仓库governance/<同文件>。只含获准采用且已适配的目标文件，不嵌套旧工程包、不复制整个资料目录、不整目录覆盖；替换/新建/归档均逐文件登记。reference/只放必要追溯依据及源目录索引，不拥有active Authority。包根操作说明和映射清单不自动复制到仓库根。

当前DESIGN_TARGET_NOT_APPLIED仅是资料目标文件，不可直接覆盖工程。用户本轮已授权ChatGPT补齐协议/Registry/Skill等完整专业目标文件及真实源码改造合同；原11矩阵只描述接口与落点，不能代替这些目标文件，也不能把全部专业适配推给CodeBuddy。

被替代治理放governance/archive/、契约放specs/archive/、跨域快照放archive/，留替代清单；归档不等于允许继续执行。数据放data/，正式Contract不放data/；过去研究任务与审查记录不挤占tasks/未来任务入口。测试规格与实测证据区分。
