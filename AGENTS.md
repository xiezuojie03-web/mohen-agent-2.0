# 墨痕 MoHen｜入口路由

> **REVIEW_DRAFT_NOT_APPLIED｜2026-10-15。** 目标根入口稿，基于handoff/local-b-20260930@8966d1bf62d7c2ea199d6568cc1b16bba664bd26；尚未替换工程。原文件与实际运行状态留M0核验。

入口只负责找Authority，不定义运行状态或提升任务书权限。新会话先读CURRENT→本表→相应Authority/Contract；冲突依C0/C1及专业域仲裁，目录职责依OWNERSHIP_MAP。

# 1｜唯一版本路径表

| 任务 | 目标工程文件 |
|---|---|
| C0宪法 | `governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.1.md` |
| C1宪法 | `governance/C1_MoHen_Product_Architecture_Evolution_Constitution_V1.1.md` |
| C2宪法 | `governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.3.md` |
| C3宪法 | `governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.4.md` |
| C4宪法 | `governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.2.md` |
| 当前设计/运行与HOLD | `CURRENT.md` |
| 目录职责 | `OWNERSHIP_MAP.md` |
| 唯一生产总协议 | `specs/data-production/MoHen_Data_Production_Protocol.md` |
| 现行专业原文 | `specs/data-production/standards/d00/`—`d05/`，逐文件见`verification/arch-mig-prep-01/TARGET_FILE_COVERAGE.csv` |
| 数据字段/物理承载 | `specs/DATA_CONTRACT.md`、`specs/data-production/PHYSICAL_DATA_MODEL_V2.md`、`PERSISTENCE_BINDING_CONTRACT.md` |
| 方法/执行绑定 | `specs/data-production/production-registry.json`及其schemas、method-binding-contract.json |
| 六门独立合同（拟迁移） | `specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md`及同目录`gate-contracts.v3.json` |
| 消费/反馈（拟迁移） | `specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md` |
| Agent/体验边界 | `specs/AGENT_CONTRACT.md`、`specs/EXPERIENCE_CONTRACT.md` |
| 生产导航 | `specs/data-production/MoHen_Data_Production_System_Map.md/html`；根`DATA_PRODUCTION_MAP.md`只指向这组入口 |
| Skill / 执行体 | `skills/<skill>/SKILL.md`；`pipelines/data-production/` |
| Runtime | `packages/agent-runtime/`、`packages/experience-engine/`、`packages/data-access/` |
| 部署/连接运维手册 | `tasks/results/DEPLOYMENT-OPERATIONS-RUNBOOK.md`（GitHub 推送 / vercel 部署 / Supabase 连接 / 密钥位置，含全部踩坑固化） |
| 样板试验全景复盘 | `tasks/results/SAMPLE-TRIAL-16_CLOSURE-ANALYSIS_RESULT.md`（首轮数据生产样板试验全景分析 + 后续指导清单） |
| 未来迁移任务 | `tasks/implementation/ARCH-MIG-01/` |

# 2｜代际与路由限制

表中standards、方法新增合同、六门v3及L5_L8反馈合同等为目标路径，尚无已实现承诺；未交付/未验证不得路由执行。旧G0-G4 v2和L4_L7合同只服务隔离旧代际，切换时归档并登记替代，不与新规则同名混用。目标Gate文档版本V3.0已编制为交付目标，尚未在真实工程生效。

目标链D00/L0/G0→D01/L1/G1→D02/L2/G2→D03/L3/G3→D04/L4/G4→D05/L5/G5→L6→L7→L8→D00。生产唯一入口仍为pipelines/data-production/run.mjs；未完成适配与核验时不准执行新链。Archive、HTML和审查PASS均不发Gate许可。

# 3｜部署与连接注意事项（AI 执行前必读）

涉及 GitHub 推送 / vercel 部署 / Supabase 连接时，先读 `tasks/results/DEPLOYMENT-OPERATIONS-RUNBOOK.md`。三条硬约束：① GitHub HTTPS 直连被墙，须走本地代理 `127.0.0.1:51081`；② Supabase 直连是 IPv6-only，必须用连接池 pooler（IPv4）；③ 密钥一律不写仓库，只从 runbook §4 指明的本机 gitignored 文件读取。数据生产复盘与后续指导见 `tasks/results/SAMPLE-TRIAL-16_CLOSURE-ANALYSIS_RESULT.md`。
