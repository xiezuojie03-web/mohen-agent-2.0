# 墨痕 MoHen｜入口路由

> **SAMPLE-TRIAL-16 收口｜2026-10-18。** 首轮数据生产样板试验已完成（六阶段 D00–D05 + G0–G5 真实闭环、真实 G5、vercel 上线）。运行状态见 `CURRENT.md`；部署/连接见 `specs/OPERATIONS_DEPLOYMENT.md`；复盘见 `specs/data-production/SAMPLE-TRIAL_CLOSURE_ANALYSIS.md`。原稿基线 handoff@8966d1b。

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
| 未来迁移任务 | `tasks/implementation/ARCH-MIG-01/` |

# 2｜代际与路由限制

表中standards、方法新增合同、六门v3及L5_L8反馈合同等为目标路径，尚无已实现承诺；未交付/未验证不得路由执行。旧G0-G4 v2和L4_L7合同只服务隔离旧代际，切换时归档并登记替代，不与新规则同名混用。目标Gate文档版本V3.0已编制为交付目标，尚未在真实工程生效。

目标链D00/L0/G0→D01/L1/G1→D02/L2/G2→D03/L3/G3→D04/L4/G4→D05/L5/G5→L6→L7→L8→D00。生产唯一入口仍为pipelines/data-production/run.mjs；未完成适配与核验时不准执行新链。Archive、HTML和审查PASS均不发Gate许可。
