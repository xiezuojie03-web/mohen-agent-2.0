# OWNERSHIP_MAP.md

> **2026-11-05 Owner 工程入口纠偏**：现行新架构施工以 `AGENTS.md` 指向的六份 MHKA 为唯一设计规范。原2026-10-18样板试验作为历史证据保留；实时运行状态只看 `CURRENT.md`，不把旧代码或文档当作新架构裁决依据。



> **结构 SOT**：Repo 按文件类别 / 系统职责组织，不按D00—D05生产步骤组织。

# 0｜正式目录树

```text
mohen-agent-2.0/
├── AGENTS.md
├── CURRENT.md
├── OWNERSHIP_MAP.md
├── DATA_PRODUCTION_MAP.md
├── package.json pnpm-workspace.yaml pnpm-lock.yaml   # 工作区清单与锁文件
├── vitest.config.ts vitest.unit.config.ts vitest.legacy.config.ts vitest.research-db.config.ts vitest.submission-db.config.ts vitest.work-binding-db.config.ts vitest.qualified-retrieve-db.config.ts vitest.m5-batch-h.config.ts   # Vitest 各套件配置
├── playwright.config.ts playwright.mab.config.ts playwright.uxd7.config.ts   # Playwright 配置
├── .gitattributes .gitignore .env.example    # Git 配置与环境变量样例
├── .github/                    # CI 工作流
├── governance/                 # 宪法与治理
├── specs/                      # 当前有效协议 / Contract / Registry / Config
├── .agents/                    # CTX-ENG 开发工具 canonical Skill（不入产品 Registry）
├── .codebuddy/                 # 仅有允许入库的 CodeBuddy Skill 适配器
├── skills/                     # 产品内部专业生产/体验 Skill 定义
├── pipelines/                  # 执行体
├── scripts/                    # Guard / Report / Maintenance
├── packages/                   # 可复用运行时代码包
├── supabase/                   # migration / rollback
├── apps/                       # Web 应用（Next.js）
├── sources/                    # 来源登记与健康快照（registry.json / health）
├── implementation_artifacts/   # 实施产物证据（预检 SQL、SHA 清单等）
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
- `governance/mhka/`：MHKA-00—05 是本轮工程设计的唯一上位权威，专业领域按各自语义 Owner 分工。
- C0—C4 的最后版本现已与更早版本一并归入 `governance/archive/`，保持原 Git Blob 与历史替代索引，**不再为新工程下达规范指令**。旧运行代际正式退役、权限/数据切换及最终交接仍保留到 M8。
- `governance/archive/`：历史证据和替代关系；迁移清单为 `governance/archive/C0_C4_TO_MHKA_ARCHIVAL_20261105.md`，不能因文档存在而自动成为 active Authority。

## specs/
只放当前有效 Contract / Protocol / Registry / stable specification。
- `OPERATIONS_DEPLOYMENT.md`：部署与连接运维手册（GitHub 推送 / vercel 部署 / Supabase 连接，密钥只记位置不写明文）

### specs/data-production/
核心：
- `MoHen_Data_Production_Protocol.md`
- `SAMPLE-TRIAL_CLOSURE_ANALYSIS.md`：首轮样板试验全景复盘 + 后续数据生产指导清单
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

## .agents/ 与 .codebuddy/（CTX-ENG）
- `.agents/skills/mohen-dev-continuation/SKILL.md` 是跨开发工具开发方法的唯一 canonical 正文；仅供获授权的工程建设与后续维护，不是产品 Agent Skill。
- `.codebuddy/skills/mohen-dev-continuation/SKILL.md` 只负责 CodeBuddy 识别并加载 canonical 正文，不独立维护方法。CodeBuddy 的本地凭据、日志、运行状态等目录继续被 .gitignore 排除。
- `.agents/skills/mohen-dev-continuation/references/task-tool-environment-map.json` 统一记录任务—工具—执行环境—验收及不允许自动运行的环境依赖；`scripts/dev-skills/continuation.mjs` 以固定白名单执行环境探测与只读/离线验证，`tests/dev-skills/continuation.test.mjs` 作标准 Node.js 正反测试，`.agents/skills/mohen-dev-continuation/references/HOST_ACCEPTANCE.md` 保留跨工具历史验收定义；本轮仅执行CodeBuddy宿主验收，Codex不再作为当前工具。不是新产品或专业知识 Registry。
- 加载、静态检查和实际工具使用属于不同证明级别，不能以文件存在推定 CodeBuddy 宿主已加载、可后台运行或 M5 产品验收已通过。跨工具打包检查见 `scripts/guards/check-dev-skill-layout.mjs`。

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

历史 DESIGN_TARGET_NOT_APPLIED 说明旧时点的运行能力未落地，不等于本轮 MHKA 不指导施工；任何目标代码不得直接覆盖最新 main。M8 只负责运行激活与旧代际退役，不再推迟工程设计入口。

被替代治理放governance/archive/、契约放specs/archive/、跨域快照放archive/，留替代清单；归档不等于允许继续执行。数据放data/，正式Contract不放data/；过去研究任务与审查记录不挤占tasks/未来任务入口。测试规格与实测证据区分。
