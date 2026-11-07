# 墨痕｜云端新架构回写本地 · 新旧架构差异理解报告

> 生成：2026-11-07 · 作者：总系统工程师（CodeBuddy）· 任务：把 GitHub 云端新架构回写本地并充分理解新架构设计要求
> 交付对象：Owner（C0）· 本报告为理解与差异记录，不构成任何生产/Gate/部署授权
> 基线：本地旧 `a001/production@759dbbd`（C0–C4）→ 云端新 `main@d1cf3fc`（MHKA-00~05 + MAB 施工框架）

---

## 0｜一句话结论

云端已完成一次**架构代际切换**：旧的 C0–C4 五份宪法被 **MHKA-00~05 六份治理章程**取代为唯一工程上位依据（旧 C0–C4 已归档为历史证据，仅作兼容参照），并在其下建立了 **MAB 受控施工框架（M0–M8）** 与 **74 份工程目标差异账**。当前施工停在 **M5（同一真实作品端到端垂直切片）HOLD 状态**，M0 审查级通过、M1–M4 条件通过、M6–M8 未启动。

---

## 1｜治理层：C0–C4 → MHKA-00~05

| 旧（C0–C4，5 份） | 新（MHKA，6 份） | 语义变化 |
|---|---|---|
| C0 项目宪法与双线协作 | MHKA-00 治理与权威生效 | 明确"五种责任身份 + 四类执行上下文 + ADR 变更控制 + 继承三判据" |
| C1 产品架构演进 | MHKA-01 价值与战略 | **新增独立战略层**：使命、受众、通史骨架+局部深挖、成熟度三阶段 |
| （并入 C1） | MHKA-02 人文产品与体验 | 五工作面 F01–F05、六步创作语义、双组件内核、H1/H2/H3 |
| C2 人文数据 OS + 双 Skill | MHKA-03 知识世界与数据 | **改名且重定位**：L0–L8 九层逻辑语义、G0–G5 独立资格、13 类资产 |
| （并入 C2） | MHKA-04 Agent 与专业能力 | 四类执行上下文、D00–D05、63 方法、开发/产品 Skill 两线 |
| C3 数据库架构 | MHKA-05 软件工程与运行 | **下沉为工程实现层**：不再另立"数据库宪法"，只持机器实现责任 |
| C4 Agent-native UI 架构 | （并入 MHKA-02） | 双组件/按需证据原则被 MHKA-02 显式继承，不再是独立最高宪法 |

**关键结论**：
1. **治理优先级链**改为：Owner 裁决 → MHKA-00 治理 → 对应语义 Owner 的 MHKA 专业章程 → 授权下位合同 → 执行代码/运行证据。旧 C0–C4 不得反向裁决新工程。
2. 旧 C0–C4 已迁入 `governance/archive/`，工程入口 `AGENTS.md` 已单向切换到 MHKA（"不允许新旧权威双活"）。
3. 新增 **KAD1-E 继承三判据**：`SOURCE_LOCATED`（原件存在）+ `RULE_RESHAPED`（规则按新体系重写）+ `VALIDATED_DESIGN`（含反例/接口/冲突校验），三者齐备才能继承旧成果，仅目录映射/引用不构成继承。

---

## 2｜知识生产层：五阶段 → 六阶段，L 层与 Gate 重定义

| 维度 | 旧 | 新 |
|---|---|---|
| 生产阶段 | D01–D05（五阶段） | **D00–D05（六阶段）**，新增 D00 来源准备，整体上移一位 |
| D 阶段映射 | D01 来源摄取 | D00 来源准备 → D01 载体技术读取 → D02 材料理解 → D03 世界建构 → D04 人文发现 → D05 可信发布 |
| 逻辑层 L | L0–L7（旧 L4=Trusted Read Model，L5=Experience Runtime） | **L0–L8（九层）**：L0 来源 → L1 载体读取 → L2 材料理解 → L3 世界 → L4 人文发现 → L5 可信发布 → L6 运行体验 → L7 参与 → L8 活态新痕迹 |
| 独立 Gate | G0–G4（v2） | **G0–G5（v3，六门）**，逐 `artifact_ref@rev/purpose/scope/consumer/action/rule_version/dependencies` 签发 |
| 方法绑定 | 旧 P/R 系列 | **63 项方法**：C01–08 / H01–25 / W01–10 / A01–12 / P01–08 |
| 唯一入口 | 旧链 run.mjs | 现有唯一 Runner/Registry，**不得另造第二套** |

**必须警惕的语义陷阱**（MHKA-03 §9 显式纠正）：
- 旧 `L4 Trusted Read Model` ≠ 新 `L4 人文发现`；旧 `L5 Experience Runtime` ≠ 新 `L5 可信发布`。**不能只替换数字，旧 L4/L5 文本在新代际下必须明确拒绝错误复用。**
- L5 只有**六类内容**（world_projections / agent_contexts / story_seeds / discovery_paths / map_timeline_projections / evidence_pointers）；selection_manifest、consumer_facet、invalidation_event 是控制记录/分面/事件，**不是第七类 L5**。
- 双消费者 `consumer=agent` 与 `consumer=visual_stage` 须按用途/权利**分别核验**。
- L0–L8 是**逻辑语义**，不是"九库九表"，不得按层建表。

---

## 3｜产品层：五图 → 五工作面，灵魂延续

| 旧 | 新 |
|---|---|
| 五图（模糊的图导向） | **F01 HOME / F02 Studio / F03 WATCH / F04 EXP / F05 Admin**（五工作面，U07 V4 细化为 62 模块/152 动作/85 API/27 组件/23 状态） |
| 三模式关系未固化 | **三模式独立可进入，非"创作→观看→探索"漏斗**；战略层级（EXP 为核心探索价值）≠ 建设顺序（先 Studio）≠ 导航顺序（独立进入） |

**延续的灵魂（重要，与旧 C4 一致）**：
- EXP 核心体验内核仍是 **"墨痕叙事 + 视觉舞台"双组件**；证据库是"可跟随的信任面板"，不是常驻第三主角。
- WATCH 消费**不可变 WorkRevision**；"历史时间" ≠ "播放器节目时码"。
- Studio 目标 = "一句话委托 → 真实研究 → 导演 → 草稿 → 定向改稿 → 保存可复现版本"；三栏（左对话/中研究进展+导演/右作品舞台）。

**新增约束**：
- **运营审核 ≠ 知识 Gate 签发**（Operator 批准作品 ≠ G0–G5 资格）。
- H1 五母题（各 9 项=45）/ H2 七导演判断 / H3 联合节拍 / 19 组件，必须进入真实作品，不以静态页面/组件存在代替职责验证。

---

## 4｜能力层：双 Skill → 四类执行上下文

| 旧 | 新 |
|---|---|
| 双 Skill（Developer Skills / Agent Skills） | **四类执行上下文**：`CTX-ENG`（工程）/ `CTX-PROD`（可信生产）/ `CTX-STUDIO`（创作运营）/ `CTX-EXPLORE`（公众探索）——是权限上下文，**不是四套 Skill 平台** |
| Developer 兼有工程+生产 | 拆分为 **开发 Skill**（工程建造/调试/维护）与 **产品 Skill**（D/L/G 生产、研究创作、合法消费）两条长期能力线 |

**七类能力对象必须分离**：Skill / Tool / Service / Adapter / Dispatcher(Agent Loop) / Experience Action / Component——**不得同名混用**。

**六阶段生产 Skill 身份**（6 Stage Owner + 7 共享 = 13 活动 + 6 归档 = 19）：
`mohen-source-intake` / `mohen-carrier-reading` / `mohen-material-understanding` / `mohen-world-construction` / `mohen-humanistic-discovery` / `mohen-read-model-publication`。

**独立 Gate 分权**：Producer 只提候选、Reviewer 独立决定、消费者 Guard 动态核资格；Agent/Executor/Operator 均不得自签 G。当前 `E1-GATE-ACTIVATE` 仍为 HOLD。

---

## 5｜工程/施工层：MAB 框架（M0–M8）

| 阶段 | 状态 | 说明 |
|---|---|---|
| M0 审查级盘点 | EXIT_PASS | 冻结；不重做 234 路径/74 目标/85 API/152 动作盘点 |
| M1 隔离安全底座 | CONDITIONAL_EXIT | 受限身份/RLS 底座可继承；真实 Owner 会话 + M1-C01~C04 待闭合 |
| M2 UTF8 候选/私有持久化 | CONDITIONAL_EXIT | 真实 NAJ 原件页/PDF locator/L0–L2 首读/回放/撤权未完成 |
| M3 独立服务/Runner 隔离 | CONDITIONAL_EXIT | 真实 Reviewer、D00–D05、G0–G5 签发/撤权/消费未闭环 |
| M4 委托/Provider 执行器 | CONDITIONAL_EXIT | 真实 Provider 派发/实际费用/双主体互补未验证 |
| M5 同一真实作品垂直切片 | REMEDIATION_ACTIVE / HOLD | 当前施工焦点，八维度闭环未完成 |
| M6–M8 | NOT_STARTED | 全量合同 / 双课题 / 生产切换 |

**74 目标账（target-diff.csv）**：53 条 REVISE（多为 `CODE_PRESENT` 但 `DESIGN_TARGET_SEMANTICS_NOT_VERIFIED`）+ 21 条 CREATE（含 MHKA 六文档、KAD1 合同、kad1-policy 代码、3 migration + 3 rollback + 2 测试，已物理生成但 `M8_ACTIVATION_HOLD`）。

**当前已知工程阻断（PLAN §0）**：
1. CI MHKA 权威路由守卫失败 → 已由 PR #1 修复（main CI SUCCESS）。
2. production-registry.json 仍 `DESIGN_TARGET_NOT_APPLIED`、全局启用关闭。
3. method-binding-contract.json 63 方法 `implementation_binding` 均 `TO_VERIFY_IN_M0`。
4. Registry 选中 layer1-adapters 仍含金泽样板路径；private-evidence-adapters 仅候选；D00/D04/D05 未实现。
5. Studio 导演外部处理被 `directorExternalProcessingBlocker` 恒定阻断；Tool Ledger 内部 credit ≠ 真实 Provider 费用。
6. NAJ《松江府志7》目标页仅临时派生文件、未入持久 Storage，**不能记为原件已存或 ST02 通过**。

---

## 6｜真实库 / 环境关键事实（来自 progress.md）

- Supabase `fwrhxddcpkibsnmddcfl` ACTIVE_HEALTHY PG17.11。
- 真实库：`source.raw_items=98`、`evidence.reading_units=38`、`evidence.material_evidence=166`、`read_unit_evidence_links=0`、`world.claim_evidence_links=0`、`storage.buckets=0`（私有桶空）。
- **SEC-01 已修复**：`imported_materials` RLS=true，anon/authenticated 无直接表 GRANT。
- 已应用迁移含 M1/M2 安全底座与 Studio 七表（全 RLS）；Gate 独立签发迁移**未启用（HOLD）**。
- 凭据：AUTH_SECRET / MOHEN_DATABASE_PASSWORD / MOHEN_DATABASE_SESSION_SECRET 已轮换或 provision，未写入代码。

---

## 7｜对后续本地施工的影响（我作为总系统工程师的认知落点）

1. **上位依据切换**：所有技术判断以 MHKA-00~05 + 授权下位合同为准；不得引用旧 C0–C4 裁决新工程。
2. **唯一生产主线**：D00–D05 / L0–L5 / G0–G5 + 唯一 Runner/Registry；不另造第二套。
3. **当前焦点**：M5 两条并行线（A=真实原件私有持久化 + L0–L2 读取/回放/撤权；B=受控 Provider 执行器 + 真实费用/Receipt）。
4. **硬边界**：新增 Provider/密钥/费用、生产 DB/Storage 迁移、正式 Reviewer/Gate 启用、公开发布，均须 Owner 单独授权。
5. **记账纪律**：每批回写 `progress.md` + `target-diff.csv`，POS/NEG/AUTH + PG/HTTP 验证，HOLD 原样保留，不把 CI PASS 当准出。

---

*本报告基于本地 `main` 工作区实际文件（MHKA-00~05、AGENTS.md、CURRENT.md、PLAN.md、ENGINEERING_HANDOFF_CURRENT.md、progress.md、target-diff.csv）精读生成，未对任何代码/数据库/部署做修改。*
