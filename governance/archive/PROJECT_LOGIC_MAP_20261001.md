> ⚠️ **归档过程文件（2026-10-01 梳理快照）**。7 条用户决断已固化进 `mohen-agent-2.0/CURRENT.md` §决断；本文件不再作为真相源，仅供历史追溯。活动入口见 `mohen-agent-2.0/CODEBUDDY.md`。

# 墨痕 · 项目逻辑地图 (PROJECT LOGIC MAP)

> **用途（已归档）**：本文件曾是跨会话逻辑地图过程稿；其决断与缺口已分别固化进 `CURRENT.md` §决断 与各 C0–C4。不再作为任何读取入口。
> **状态**：ARCHIVED · 2026-10-01 · 仅供历史追溯，活动真相源以 `CODEBUDDY.md` + `CURRENT.md` + C0–C4 为准。

---

## 0. 怎么用本文件
1. （已归档）活动入口为 `CODEBUDDY.md` → `CURRENT.md` → C0–C4，本文件不再读取。
2. 读 `mohen-agent-2.0/CURRENT.md` 看当前施工状态。
3. 按任务类型读对应宪法 C0–C4（路径见 §6）。
4. 在边界内直接施工；触及架构边界先提交项目拥有者确认（见 §2）。

---

## 1. 身份与关键路径
- **项目**：mohen-agent-2.0（墨痕 Agent 2.0）
- **工作区根**：`d:/work Buddy/2026-08-23-23-12-38/`
- **代码/宪法/文档主仓**：`mohen-agent-2.0/`
- **运行时数据根（D 盘，独立于工作区）**：`D:\MoHen\`
  - 本地 PG 数据目录：`D:\MoHen\data\postgresql\18\data`
  - 冷备：`D:\MoHen\backups\`
  - 云端直连串：`D:\MoHen\supabase\db_url.txt`（**勿提交 / 勿写入任何报告**）
- **新宪法参考包（元宝AI 梳理，本次宪法重构的参考蓝本）**：`D:\Gemini Chrome下载\墨痕_开发模式配置包_v2\mohen-codebuddy\`（含 `governance/*.md` 版 C0–C4、`CURRENT.md`、`CODEBUDDY.md`、`README-安装说明.md`、`specs/`、`docs/`、`prototypes/`）

---

## 2. 开发逻辑链（mohen 逻辑链 / 新模式）
来源：参考包 C0《项目宪法与开发治理 V1.0》

- **两方角色**：
  - **项目拥有者 = 用户本人**：唯一架构设计师、唯一决策者（"这是不是墨痕"唯一裁决权）。
  - **开发平台 = 开发总工程师**：任何具备 AI 的开发工具（可替换）；既负责工程实施，**也具备架构思考能力**，可主动提优化建议，但**任何架构修改必须经项目拥有者确认**。
- **工作模式**：自然语言开发；宪法文件（C0–C4 + CURRENT）为双方唯一共享边界；不再靠用户在多工具间传话。
- **施工四步（C0 §7）**：读宪法 → 读当前代码/运行态 → 自然语言确认目标 → 边界内施工。
- **边界（C0 §2.1，需提交确认）**：数据库核心对象、Evidence 边界、RelationClaim/Meaning/Present 边界、Agent 能力、PostGIS/图/向量库、第二古镇泛化。
- **自主决定**：页面细节、构建/测试、组件重构（不改契约）、边界内数据录入清洗。
- **开发平台快速入口**：`mohen-agent-2.0/CODEBUDDY.md`（每次新会话可先读）。

---

## 3. 已决断事项（用户 2026-10-01 确认）
### R6 真相源（关键）
- **本地 PostgreSQL = 主库（master）；Supabase 云端 = 仅备份（backup）。** 云端不是可写第二真相源，不用于日常读取/生产。
- `.env.local` 的 `DATABASE_URL` **必须指向本地 PG（端口 5432）**，不是云。
  - 注：此前曾建议"改 DATABASE_URL 接云库 54322"，在"本地=主"确认后该建议**作废**。本地 PG 实际监听 5432（历史误判为 54322 是端口错配+密码错，数据从未损坏）。
  - 用户原话："这个不应该昨天就跑通了的吗？" → 是，主库即本地，应早已可连；以本地 5432 为准。

### 备份策略（取代原"云库 RLS 只读"意图）
- 原 DB-01 §I "补 Supabase RLS SELECT 策略让 AI 只读云库"在"本地=主、云端=备份"下**不再必要**：云端只是备份，不需 AI 在线读。
- 改为：**每次数据生产（本地主库写入）后，自动把结构化数据推送到云端备份**。
  - 结构化数据（L1 Evidence / L2 Cultural World / L3 Meaning 等表）→ 同步到 Supabase。
  - 原始数据（raw_item 大文件、扫描图、PDF）：**本地只存，不传云端**；但云端保留**记录（catalog/index：来源、文件清单、checksum、locator、大小）**，不含文件本身。
- 实现：需一个 local→cloud 备份推送脚本（pg_dump/逻辑同步 + raw catalog 记录），取代"AI 读云 RLS"。

### R12 逻辑备份
- 重跑 `pg_dump` 生成本地主库有效逻辑备份，修复 SAFETY_BASELINE 的 0 字节 dump。属数据生产可恢复性基础设施，应在恢复生产前完成。

### R8 Schema 漂移
- 不做原因调查；**以本地主库为准（source of truth）**。云端如有漂移，以本地覆盖。

### R9 重复证据
- 15 Wikidata + 5–6 上图 locator 重复证据位于老项目文件夹，**暂不处理**。

### hushang 原始资料接入
- 原则：**依据叙事反推，避免盲目扩充**（不批量盲导）。
- 顺序：先种子（坐标/镇/桥/宗族，补 WGS84 CRS）→ 再叙事/诗词/方志证据。
- 来源：`hushang-jingwei/`（竞赛物料，勿改）、`hushang-press/`、`mohen-2-draft/`（旧）。

---

## 4. 数据生产现状与缺口（DB-01 系列）
- **迁移已完成**：本地 `mohen_dev`（PG18, 5432）已 `pg_restore` 到 Supabase `mohen-cloud`（28 张表，行数逐表一致，DB-01_RESULT.md = SUCCESS）。
- **缺口**：
  - G1：`pg_dump` 本地逻辑备份无效（0 字节）→ 需 R12 修复。
  - G2：缺 local→cloud 备份推送机制（见 §3 备份策略）。
  - G3：数据生产未真正跑通（昨晚诊断出的问题）→ 恢复生产是下一步重点。
  - G4：raw 数据云端 catalog 记录机制缺失。

---

## 5. 可复用资源（勿误改）
- `hushang-jingwei/`：沪上经纬竞赛源材料（20696 文件，**勿改**）。
- `hushang-press/`：媒体物料。
- `mohen-2-draft/`：旧 draft（14274 文件）。
- `mohen-agent-2.0-exp/`：Experience 实验。
- **安全红线（长期约束）**：勿动 `main` 分支、`track/experience-exp-0002`、`hushang-jingwei`；勿提交 B 的脏工作区。

---

## 6. 宪法文件落点（目标 8 已落地）
- **权威模型（2026-10-01 决断）：元宝参考包 markdown = 唯一 canonical；旧 docx 母版已移入 `governance/archive/`。**
- `mohen-agent-2.0/governance/`（C0–C3）：
  - C0 `MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md`
  - C1 `MoHen_Product_Architecture_Evolution_Constitution_V1.0.md`
  - C2 `MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.0.md`
  - C3 `MoHen_Humanistic_Data_OS_Database_Architecture_V1.1.md`
- `mohen-agent-2.0/specs/`：C4 `MoHen_Agent-native_Human_Experience_UI_Architecture_V2.0.md`
- `mohen-agent-2.0/CURRENT.md`：当前状态入口（已替换为新 canonical 版；旧版备份 `governance/archive/CURRENT_before_20261001.md`）。
- `mohen-agent-2.0/CODEBUDDY.md`：开发平台快速入口（来自参考包）。
- 参考源包（只读，勿改）：`D:\Gemini Chrome下载\墨痕_开发模式配置包_v2\mohen-codebuddy\`
- 旧 Roadmap / Phase Plan / Task Book / 旧 docx 已退居 `governance/archive/` 与历史记录。

---

## 7. 本次目标（8 & 9）
- **目标 8（已落地）**：markdown = 唯一 canonical；旧 docx 母版移入 `governance/archive/`；C0/C1/CURRENT 内部 `.docx` 引用已切到 `.md`；`CODEBUDDY.md` 已就位。
- **目标 9（进行中）**：依据新宪法完善 **文件结构 / 数据结构 / 数据生产** 使其有效运行 → 重点：R6 备份推送、R12 逻辑备份、hushang 叙事反推导入、本地=主库连接跑通。

---

## 8. 长期约束速查（standing rules）
- 本地 PG 5432 = master；Supabase = backup only。
- 任何架构/宪法修改须项目拥有者确认（开发平台不得自行改 C0–C4 原则）。
- 不盲扩数据；叙事反推。
- 勿动红线分支/目录；勿提交脏工作区；云端串 `D:\MoHen\supabase\db_url.txt` 不入库。
- （已归档）活动路径：CODEBUDDY.md → CURRENT.md → C0–C4，本文件仅供追溯。
