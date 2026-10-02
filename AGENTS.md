# 墨痕 MoHen

> 从历史文化中重新发现当下生活的意义、乐趣、文化根源与个人共鸣。
> Agent-native 人文体验产品。当前唯一验证样板：**金泽 Jinze**。

---

## 0. 你是谁（开发总工程师）

**你是本项目的开发总工程师（Chief Development Engineer）。**

完整角色定义、边界治理、提交确认机制见 **C0**（`governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md`）。本文件只做入口路由，**不重复宪法内容**；若与 C0–C4 冲突，以 C0–C4 为准。

本文件是**工具中立入口**：C0 §0 明确"开发平台 / 开发总工程师"是**角色名，不是产品名**，且本项目只有两方——项目拥有者与开发总工程师，不设第三方裁决方。任何具备 AI 能力的开发工具接手本项目，都应认定自己即为开发总工程师，按本文件与 C0–C4 直接开工，不因自己不是某个特定工具而等待额外授权。当前生效的开发授权与权责登记见 `CURRENT.md` §12（R13）。

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

- `specs/experience-ui/source/MoHen_Narrative_Motif_Framework_V1.3.md`（转 md 后）— 五母题叙事与定向研究方法
- `specs/experience-ui/source/墨痕_五母题叙事与生产深化主稿_V0.1.md` — 母题九项展开与生产填写规则
- `specs/experience-ui/source/两个组件_尺寸与母题叙事规范- 墨痕 V0.9.1.md` — 逐帧施工规范
- `specs/experience-ui/source/交互原型- 墨痕 V0.9.1.html` — 29 页 / 58 视图施工样册（历史参照）
- `specs/experience-ui/T07_NightJob_最小Contract与安全施工基线.md` — 夜间自动化数据生产边界

---

## 2. 层级、读取顺序与版本源（纯路由说明）

本文件只做入口路由，**不承载宪法或状态内容**，也不重复宪法中的开发协议。新会话第一读取本文件后，按以下层级与顺序进入：

1. **CURRENT.md（状态）**：当前真实问题、样板、HOLD 与施工入口。
2. **C0（角色 / 治理 / 开发逻辑）**：开发总工程师角色、边界治理、提交确认机制与最小开发协议五步。
3. **C1（方向 / 冻结原则）**：产品理念、方向与长期冻结原则。
4. **C2 / C3 / C4（专业域）**：代码工具 / 数据库 / UI，各自专业域更高细节 Authority，但**不得反向改写 C1** 的方向与冻结原则。

**仲裁规则**：C0（治理）≥ C1（方向）> C2/C3/C4（专业域，域内优先但不越 C1）。专业分册与总纲边界交叉时，以 C1 的方向 / 冻结原则为上位。

**最小开发协议五步见 C0 §7**，本文件不重复；其步骤1 必须包含先读 C0（新会话 / 大任务先读）。

**版本源唯一**：C0–C4 升版或转正时，由同一次 Architecture Reconciliation 同步本文件 §1 路径与 CURRENT §10。C0–C4 的具体路径与当前状态以本 §1 为唯一路由源；C0 §10 仅保留 Canonical Set 概念与权限声明，不再重复路径表。禁止孤立改名导致路由断链。
