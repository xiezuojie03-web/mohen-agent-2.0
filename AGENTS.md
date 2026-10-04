# 墨痕 MoHen · 入口路由

> 纯入口路由（工具中立）：只回答"遇到什么任务去读哪个文件"。规则冲突以 C0–C4 为准；每条路径由 `pnpm guard:structure` 校验存在性，改路径须同步引用。

## 读取顺序

新会话：`CURRENT.md`（状态）→ `C0`（角色/治理）→ `C1`（方向）→ `C2/C3/C4`（专业域，不得反向改写 C1）。层级与仲裁见 C0 §3；最小开发协议五步见 C0 §7。

## 触发表（按任务类型）

> 行序即读取顺序：CURRENT → C0 → C1 → C2 → C3 → C4 → OWNERSHIP_MAP（动文件）→ §9（拍板）。

| 你在做什么 | 去读 |
|---|---|
| 当前真实问题 / 样板 / HOLD / 施工入口 | **`CURRENT.md`** |
| 角色 / 边界治理 / 提交确认机制 | **C0**（`governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md`） |
| 产品方向 / 架构 / 阶段边界 / 冻结原则 | **C1**（`governance/C1_MoHen_Product_Architecture_Evolution_Constitution_V1.0.md`） |
| 数据生产 / 研究流程 / Agent 能力 | **C2**（`governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.1.md`）；主协议 `specs/data-production/MoHen_Data_Production_Protocol.md`（V3.0）；Discovery Research 细则 `specs/data-production/墨痕_数据生产机制_宽进与广联详细协议_V1.0.md`；作业最小契约 `specs/data-production/T07_无人值守作业最小Contract.md` |
| 数据库 / 迁移 / 边界 / Truth Store | **C3**（`governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.2.md`） |
| Human-facing 改动（体验 / UI / Surface / Renderer / 地图 / 时间线 / 证据呈现 / 视觉资产） | **C4**（`governance/C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.1.md`）；施工图 `specs/experience-ui/施工图/`；母题框架 `specs/experience-ui/MoHen_Narrative_Motif_Framework.md` |
| 动文件 / 找文件 / 目录归谁管 / 被取代的东西去哪 / 归档规则 | **`OWNERSHIP_MAP.md`**（结构 SOT，唯一答案） |
| 需要拍板（架构 / 数据 / 宪法级决断） | 写入 `CURRENT.md` §9 Architecture Escalations（状态+指针），提交项目拥有者确认（C0 §7 第 5 步）；开发总工程师不得自裁，不设第三方裁决方 |
