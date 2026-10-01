# HANDOVER · WorkBuddy → CodeBuddy 接管基线与授权迁移（草案 V1.0 · 待 沙漠绿洲 定稿）

> 性质：本文件是**授权执行主体迁移 + 接管基线**的提议稿。
> **本文件不自行改写 `CURRENT.md` §11.1 原文。** 按 CURRENT.md §11，授权变更属用户（沙漠绿洲）权限；定稿后以独立修订落地（处理方式参照 §11.1 F 项：先定稿、再以独立修订执行）。
> 依据：`CURRENT.md` §11 / §11.1 / §11.2 / §11.3、夜间协议 V1.0 §9（分工）、V1.1 红线 11、T03 §0/§4。

---

## 1. 交接的本质：不是"让 WorkBuddy 写一份说明"

AI 会话会失忆，交接不能依赖对话记忆或一份聊天总结。交接 = 把三样东西**固化进仓库**：

1. **约束**（什么永远不能改）→ 冻结清单（本文件 §4）。
2. **真源**（什么才是事实来源）→ PostgreSQL `mohen_dev`；JSON 仅为投影。
3. **未完成状态**（卡在哪、开放项）→ 接手项移交（本文件 §5）。

因此交接动作 = **先冻结基线 → 再只读验证 → 才允许写入施工**。

---

## 2. 授权迁移（需用户定稿）

### 2.1 迁移什么（执行主体变更）

| 原条款 | 原执行主体 | 迁移后 |
|---|---|---|
| `CURRENT.md` §11.1 六项授权 A–F（日常验收权归用户 / 契约沉默可决断 / 轻量化报告 / 冻结可受控修订 / 允许镇无关重构 / 收紧 §9 触发词） | WorkBuddy | **CodeBuddy** |
| `CURRENT.md` §11.2 跨会话同步规则（阶段完成时同步更新计划文件 + CURRENT.md，不依赖用户提醒） | WorkBuddy | **CodeBuddy** |
| `CURRENT.md` §11.3 结果文档规则（每次施工产出 `tasks/results/` 结果文档；聊天仅留一句话定位） | WorkBuddy | **CodeBuddy** |
| 夜间协议 §9「WorkBuddy / Construction Partner」职责（实现、运行、测试、修复 Developer Skills；维护 batch runner / 日志 / HOLD queue / Morning Summary） | WorkBuddy | **CodeBuddy** |

### 2.2 不迁移、不放宽（红线原样继承）

- **Agent 无 Truth Store 写权、不绕过 Evidence Gate**；
- **Evidence Gate / 事实-解释防火墙**；
- **不编造坐标、来源、原文、古图**；
- **Geometry 是 Claim**（历史空间 ≠ 历史几何）；
- **Canonical 五幕与视觉层级不退化**；
- **Human Experience Gate P1/P2/P3 为验收定义**；
- **双线治理与 C0–C4 权威**；
- **数据诚实与 provenance**（L4 不反向污染 L0–L3，协议 §6/§13）；
- **用户布局选择优先**（V1.1 红线 4）、**仅承载现有 `ExperienceShell` / `resolveComposition` / `selectReplanSurface`，不重做独立 Agent UI**（V1.1 红线 11）。

### 2.3 定稿方式（建议）

由用户在 `CURRENT.md` 新增 **§11.4「Construction Partner 迁移 · CodeBuddy」** 注记，本文件作为附件引用；或直接在浏览器验收本文件后批准落地。授权主体未定稿前，CodeBuddy 只做**只读验证与 Contract 设计**，不做写入施工。

---

## 3. 交接前必须先做的基线冻结（按序执行）

### 3.1 先处置工作区风险（已发现，需你裁决）

`git status` 当前显示（HEAD `5941b56`）：

- **已删除（D）**：`governance/MoHen_Agent_2.0_PHASE-II_Execution-Plan_V1.1.docx`、`governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx`、`specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`；
- **已修改（M）**：`apps/web/app/experience/jinze-water-net/*`（ExperienceShell / beats / surfaces 等）、`specs/OWNERSHIP_MAP.md`、`pnpm-lock.yaml`、`tests/e2e/experience-recon-01.spec.ts`；
- **未跟踪（??）**：`CURRENT.md`、`MohenPresence.tsx`、`apps/web/.next.bak/`、`apps/web/.next.dev.bak/`。

**处置原则：不盲 commit、不盲 restore。** 被删的 governance docx 与 UI BASELINE 涉及 C0–C4 权威与体验基线，须先确认是否为有意清理（或已迁往他处）；`.next.bak/` 属构建残留，应 gitignore 或清理。

### 3.2 固化可回滚基线

风险处置确认后，提交或打 tag（如 `handover-baseline-2026-09-29`），使接管点可回滚、可比对。

### 3.3 只读接管验证（CodeBuddy 先只读，不写）

- [ ] 比对 PG 真源与 `apps/web/data/experience/*.json` 投影是否一致（投影不得反写真源）；
- [ ] 跑 schema / integrity / referential 测试；
- [ ] 确认 Stage 0+1 机器断言 A1 仍 PASS（`tasks/results/STAGE0-1_RESULT.md`）；
- [ ] 确认无未审计写入、无 Agent 越权写；
- [ ] 确认 `source-providers.json` 门禁仍生效（S3 仅现代、S4 不可证）。

**上述全部通过后才进入任何写入施工。**

---

## 4. 不可改冻结清单（继承，CodeBuddy 同受约束）

| 来源 | 冻结内容 |
|---|---|
| `CURRENT.md` §11 | North Star；C0–C4 权威；Evidence / Cultural World / Agent / Experience 核心边界；Canonical Non-Regression；Human Experience Gate 定义；长期 Evolution Horizons |
| V1.1 §1 红线 | 双组件唯一；命名空间消歧；C/S 按理解任务；用户布局优先；对接既有模型不新建事实库；证据诚实；历史视觉非生成式；时间非工具条；墨痕不堆控制面板；依据绑定判断；WorkBuddy/CodeBuddy 硬边界；四类待补画面为验收硬要求 |
| 夜间协议 §13 | Raw 永久保留；AI 生成 ≠ Evidence；Candidate 与 Verified World 分离；夜间不改 C0–C4、不扩 Schema/写权限/基础设施 |
| 协议 §9 | 仅跨架构问题（核心对象模型、Evidence/Meaning 边界、写权限、L6/L7 Schema、核心基础设施）才回到产品与架构线 |

---

## 5. 接手项移交（开放状态盘点）

| 项 | 状态 | 移交说明 |
|---|---|---|
| **H2 施工计划** `tasks/H2_JINZE_CONSTRUCTION_PLAN_V1.0.md` | Stage 0 ✅、Stage 1 ✅；**Stage 2–5 待启动** | 唯一施工计划真源；接管后按 §11.2 同步更新阶段状态 |
| **资产探针** `tasks/results/STAGE0-1_ASSET_PROBE_RESULT.md` | 8 张 Commons 今貌照可加载；GCJ-02 默认泄漏坐实；**历史影像 0 件（硬缺口）** | 与 T03「历史视觉证据=0」一致，属 T06 缺口 4 |
| **数据生产** `T06` | 已出派工与 Gap 映射 | 依本文件 §6 首个动作推进 |
| **结构性前置**（T03 §0/§4、T06 §2） | `packages/domain` 无 `Material/Motif/Judgment/SpatialEntity/Actor`；PG 中 M1–M5 无表/枚举 | **阻塞数据生产与 M1 真实数据替换**，属 in-contract 迁移 |
| **T05 M1 实例** | 仍为原型 EX1 数据 | 待真实 Evidence/Claim 替换各帧 `dataIn` / `evidenceText`；EX1 不得入库 |
| **Architecture Escalations** | CURRENT.md §9 = **NONE** | 出现架构问题写入此处，不自改 C0–C4 |
| **来源凭证** | S1/S2 **未配置** | 夜间 job 默认 DRY_RUN（见 T07 §1）；凭证只走环境变量/密钥管理 |

---

## 6. 接管后的施工分类路由

- **施工问题** → CodeBuddy 直接解决 + 产出结果文档（`tasks/results/`，含改动文件、验收证据、遗留风险），聊天仅留一句话定位（§11.3）。
- **架构问题** → 写入 `CURRENT.md` §9 Architecture Escalations，**不自行改写 C0–C4**；确属跨架构（核心对象模型 / Evidence 边界 / 写权限 / 基础设施）才回到产品与架构线（协议 §9）。

## 7. 建议的接管后首个动作

1. **§2.3 授权定稿**（你拍板）→ 落 `CURRENT.md` §11.4。
2. **§3 基线冻结**（处置删除项 → 打 baseline → 只读验证通过）。
3. **T06 §2 结构性迁移 Contract**：`cultural_judgments(judgment_id, claim_ids, status)` + `entities.type / relation_to_jinze` + `Claim` 的 `motif / beat` 标签；**带 up/down、dry-run、测试、回滚**，in-contract 不触碰 C0–C4。
4. **T07 Night Job** 以 DRY_RUN 试跑 N01（Source Refresh）/ N02（Evidence Fragment）。

---

## 8. 待你拍板（三个问题）

1. 授权迁移是否按本文件 §2 定稿，落地为 `CURRENT.md` §11.4？
2. `governance/*.docx`（2 份）与 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 的删除**是否有意**？如何处置（恢复 / 确认删除 / 迁移到 `governance/` 新路径）？
3. 是否批准 CodeBuddy 在风险处置确认后提交 `handover-baseline` commit？

> 在第 1、2 项定稿前，CodeBuddy 只做只读验证与 Contract 设计，不做写入施工、不擅自提交。
