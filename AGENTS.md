# 墨痕 MoHen · 入口路由

> 本文件是**纯入口路由**（工具中立）。它只回答"新会话按什么顺序读哪些文件"，**不承载宪法或状态内容**；任何规则冲突以 **C0–C4** 为准。

---

## 0. 你是谁（开发总工程师）

**你是本项目的开发总工程师（Chief Development Engineer）。**

角色定义、边界治理与提交确认机制见 **C0**（`governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md`）。本文件为**工具中立**入口：任何具备 AI 能力的开发工具接手本项目，即认定为开发总工程师。当前生效的开发授权、执行主体与裁决方登记见 `CURRENT.md` §12（R13）。

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

> **本节是 C0–C4 路径与当前状态的唯一路由源。** C0–C4 升版或更名时，由同一次 Architecture Reconciliation 同步本节与 CURRENT §10；机制见 **C0 §10（版本源唯一）**。
>
> **根目录三件套**：`AGENTS.md`（**路由**，本文件）· `CURRENT.md`（**状态**）· `OWNERSHIP_MAP.md`（**结构 SOT**：每个目录归谁管 / 被取代的东西去哪 / 归档规则）。**本节列出的每条路径都由 `pnpm guard:structure` 机器校验存在性**——改路径不更新引用会直接让守卫为红。

**补充权威**（非宪法，但当前开发直接依赖）：

- `specs/experience-ui/MoHen_Narrative_Motif_Framework.md` — 五母题叙事与定向研究方法（V1.3）
- `specs/experience-ui/source/墨痕_五母题叙事与生产深化主稿_V0.1.md` — 母题九项展开与生产填写规则
- `specs/experience-ui/source/两个组件_尺寸与母题叙事规范- 墨痕 V0.9.1.md` — 双组件 / 构图 / 空间逐帧施工规范
- `specs/experience-ui/source/交互原型- 墨痕 V0.9.1.html` — 29 页 / 58 视图施工样册
- `specs/MoHen_Night_Data_Production_Protocol.md` — 夜间自动化数据生产协议（C2/C3 之下；T06/T07 依赖其 §12 Contract）
- `specs/experience-ui/T07_NightJob_最小Contract与安全施工基线.md` — 夜间自动化数据生产边界
- `specs/experience-ui/施工图/墨痕_五母题施工审阅_第一批_M1_配套规格_V0.1.md` + `specs/experience-ui/施工图/墨痕_五母题施工审阅_第一批_M1_V0.1.html` — **当前施工图**（第 3 代，25 页 / 50 视图 / 12 帧主线；项目拥有者 2026-10-02 确认）。上一代 T05 批次1 已归档 `archive/2026-10-02-superseded/`。**五母题仅交付 M1（1/5），且尚未接入代码。**

> **Experience / UI 相关内容一律放 `specs/`**（含 `specs/experience-ui/`）。docs/ 与 prototypes/ 已于 2026-10-02 退役并移除，其内容并入 `specs/`；不再新建这两个目录。

---

## 2. 读取顺序

新会话读取本文件后，按以下顺序进入。**层级与仲裁规则见 C0 §3；最小开发协议五步见 C0 §7** —— 本文件不重复。

1. **CURRENT.md**（状态）：当前真实问题、样板、HOLD 与施工入口。
2. **C0**（角色 / 治理 / 开发逻辑）：开发总工程师角色、边界治理、提交确认机制。
3. **C1**（方向 / 冻结原则）：产品理念、方向与长期冻结原则。
4. **C2 / C3 / C4**（专业域）：代码工具 / 数据库 / UI，各自专业域更高细节 Authority，但**不得反向改写 C1**。
