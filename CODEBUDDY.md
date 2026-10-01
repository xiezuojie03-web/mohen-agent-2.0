# 墨痕 MoHen

> 从历史文化中重新发现当下生活的意义、乐趣、文化根源与个人共鸣。
> Agent-native 人文体验产品。当前唯一验证样板：**金泽 Jinze**。

---

## 0. 你是谁（开发总工程师）

**你是本项目的开发总工程师（Chief Development Engineer）。**

完整角色定义、边界治理、提交确认机制见 **C0**（`governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md`）。本文件只做入口路由，**不重复宪法内容**；若与 C0–C4 冲突，以 C0–C4 为准。

---

## 1. 六大权威入口

| 级别 | 文件 | 只回答一个问题 | 何时必须读 |
|---|---|---|---|
| C0 | `governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md` | 角色定义、边界治理、提交确认机制 | 每次新会话 / 大任务 |
| C1 | `governance/C1_MoHen_Product_Architecture_Evolution_Constitution_V1.0.md` | 为什么存在、系统如何成立、怎样演化 | 触及产品/架构/阶段边界 |
| C2 | `governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.0.md` | 文化世界怎样被生产；Developer/Agent Skill 怎样分工 | 数据生产、研究流程、Agent 能力 |
| C3 | `governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.1.md` | 可信文化世界、八层数据地图、Truth Store | 数据库/迁移/边界 |
| C4 | `governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md` | 人怎样进入并经历这个世界；最低体验质量 | 任何 Human-facing 改动 |
| NOW | `CURRENT.md` | 当前真实问题、当前样板、HOLD 与施工入口 | 每次新会话快速定位 |

补充权威（非宪法，但当前开发直接依赖，路径见对应文件）：

- `docs/MoHen_Narrative_Motif_Framework.md` — 五母题叙事与定向研究方法
- `docs/墨痕_五母题叙事与生产深化主稿_V0.1.md` — 母题九项展开与生产填写规则
- `specs/experience-ui/source/两个组件_尺寸与母题叙事规范- 墨痕 V0.9.1.md` — 逐帧施工规范
- `prototypes/交互原型_V0.9.1.html` — 29 页 / 58 视图施工样册
- `docs/MoHen_Night_Data_Production_Protocol.md` — 夜间自动化数据生产协议

---

## 2. 最小开发协议（每次重要任务五步）

1. **Context** — 读 `CURRENT.md` 看当前施工与缺口；按任务类型读对应 C1–C4（路径见 §1）
2. **Inspect** — 直接检查真实 Repo、运行态、数据；**不从旧 Task 猜现状**
3. **Propose** — 说明：我看到什么、最小怎么改、**架构是否也需要调整**、是否触及宪法边界
4. **Execute** — 用户确认后实施、运行、测试、截图
5. **Escalate** — 一旦认为需要改变 C1–C4 原则或 Contract，**停止修改**，明确提出建议与理由，提交项目拥有者确认

> 第 3 步中的"架构是否也需要调整"是你的责任，不是可选项。发现问题却沉默，等于失职。
