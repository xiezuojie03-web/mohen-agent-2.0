# OWNERSHIP MAP

> **本文件是墨痕的「结构 SOT」**：用一棵目录树回答"每个目录归谁管、放什么、禁止什么"，以及"被取代的东西去哪"。
> **权威来源**：`governance/C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.0.md` §3 / §5 / §11（R14）。本文件是**载体**，不是第六份宪法。
> **机器校验**：`pnpm guard:structure` 检查 ① 根目录每个实际条目都出现在下面的树里；② 树里出现的路径真实存在；③ `AGENTS.md` §1 的每条路径真实存在。`pnpm guard:links` 检查活跃文档的链接与路径引用。
> **分工**：**树 = 人类可读的结构图**（宽松，含 `…`、`*` 的写法会被跳过）；**`AGENTS.md` §1 = 权威路径清单**（严格，逐条校验）。改结构要同时更新这两处。
> 当前状态以 `CURRENT.md` 为准。

## 0. 目录树（结构与职责）

```
墨痕仓库根
├── AGENTS.md              入口路由：新会话按什么顺序读哪些文件（唯一路径源，机器校验）
├── CURRENT.md             当前状态：现在到哪了、卡在哪、HOLD 什么（Live SOT，Authority 低于 C0–C4）
├── OWNERSHIP_MAP.md       结构 SOT：目录职责 + 归档规则（本文件，机器校验）
│
├── governance/            宪法与治理
│   ├── C0…C4_*.md         C0 角色/边界治理 · C1 方向/冻结原则 · C2 数据生产/双 Skill · C3 数据库/Truth Store · C4 体验/UI
│   ├── experience/        体验域治理契约（EXP-DESIGN-01…）｜禁止：与 C4 竞争体验 Authority
│   └── archive/           【归档】被取代的治理件（旧 Roadmap / Phase Plan / 旧版 C0–C4 docx / 移交稿 / 旧 CURRENT 备份）｜禁止：被活跃文件当 Authority 引用
│
├── specs/                 当前稳定契约 ＋ 域操作件｜禁止：过程记录（experience-ui/ 为分级素材区）
│   ├── FOUNDATION.md      项目不可轻易改变的原则
│   ├── DATA_CONTRACT.md   字段级契约（受 C2/C3 统领；层级与状态一律指向 C3）
│   ├── AGENT_CONTRACT.md  Agent Loop 与 Discovery 契约
│   ├── EXPERIENCE_CONTRACT.md  ExperienceState / Composition 契约
│   ├── SOURCE_REGISTRY.md    来源登记
│   ├── archive/           【归档】被取代的契约与规范（旧 UI Baseline 等）｜禁止：当作当前 Authority
│   ├── data-production/   数据生产协议线（**契约 + 操作件 + JSON 注册表同目录**）
│   │   ├── MoHen_Data_Production_Protocol.md   **数据生产协议 V2.0**：无人值守 + 有人值守的强制契约（§0.2 规则即强制；守卫见 §9）
│   │   ├── production-registry.json   **生产注册表**：哪些自动化被允许无人值守运行（机器可读，守卫校验；协议 #5）
│   │   ├── identifier-registry.json   **标识符登记**：真库里"可以随便写"的标签/代号必须声明出身与定义（协议 #7 / §9.1）
│   │   ├── acquisition-intents.json   **采集意图**：每批数据"当初为什么抓的"必须抓前声明（协议 #7）
│   │   ├── T03_金泽材料盘点_覆盖矩阵.md   叙事缺口清单（当前唯一实例＝金泽）
│   │   ├── T06_无人值守派工与缺口映射.md   缺口 → 字段 → 批次
│   │   └── T07_无人值守作业最小Contract.md   作业字段契约与安全基线
│   └── experience-ui/     Experience/UI 素材与施工图（分级与 Authority 见该目录 README）
│       ├── 施工图/        当前施工图（第 3 代）：M1 配套规格 + 可操作图册
│       ├── MoHen_Narrative_Motif_Framework.md   五母题叙事与定向研究方法（V1.3）
│       ├── 墨痕_UI架构与人文叙事_完整审查及后续任务.md   UI 审查与后续任务记录
│       ├── 墨痕_Agent_2.0_金泽最小体验导演稿_V1.0.docx  最高体验权威（H2 计划自述）
│       ├── 五母题深化_UI施工图与数据生产需求_V1.1.md  逐母题施工图与数据生产需求（跨域：含数据生产需求章节）
│       ├── canonical/     体验基线 2 张 + 原型图谱 8 张（C4 引用）
│       ├── source/        TRACE：历史设计意图｜禁止：作为当前实现依据
│       ├── evidence/      失败与验证证据｜禁止：当作未来 UI 模板
│       └── mockups/       2026-09-27 布局验证原型与脚本（trace）
│
├── decisions/             重大架构变更理由（ADR）｜禁止：操作 SOP
├── tasks/                 当前可验收工作单
│   └── results/           施工结果与过程报告（Trace，非 Authority）｜禁止：代替宪法或真库
├── archive/               【归档】跨域历史快照（一次性分析、结构报告）｜禁止：当作当前状态
│
├── apps/web               Web Shell + Renderer｜禁止：历史事实判定、直接 SQL
├── packages/
│   ├── domain             稳定领域类型｜禁止：UI、网络请求
│   ├── agent-runtime      Goal/Plan/Action/Observe/Replan｜禁止：DOM/React 控制
│   ├── experience-engine  ExperienceState/CompositionState/Action reducer｜禁止：数据采集
│   ├── data-access        唯一 DB 访问层｜禁止：UI 逻辑
│   └── ui                 预留占位（未承担产品 UI）
├── pipelines/             数据生产
│   ├── ingest             Raw + Source 登记｜禁止：写 verified knowledge
│   ├── evidence           Evidence Gate｜禁止：自由叙事
│   ├── weave              verified → relations/story/discovery candidate｜禁止：绕过 Gate
│   └── legacy             老库移植与无人值守执行体（unattended-runner.mjs）｜禁止：把老库内容当已裁决事实
├── supabase/migrations    Truth Store 物理定义（schema 唯一来源）｜禁止：被绕过直接改库
├── scripts/               结构与文档守卫（check-*.mjs）＋ 报告生成器（gen-*.mjs）｜禁止：承载产品逻辑
├── tools/production/           无人值守生产运维脚本（探针 / 修复 / 校验）｜禁止：被当作调度器（调度器在 pipelines/legacy）
├── skills/                AI 可执行 SOP（每个子目录必须带 SKILL.md）｜禁止：保存项目历史
├── data/
│   ├── raw/               原始资料，append-only 永久保留｜禁止：修改或删除
│   ├── staging/           迁移中间产物｜禁止：被当作真源
│   ├── fixtures/          来源门禁 source-providers.json（S1–S4）｜禁止：门禁旁路
│   └── exports/           任务交付产物（gitignored）｜禁止：被当作 Knowledge 真源
├── tests/                 机器验收（vitest / Playwright）｜禁止：产品规则解释
├── legacy/manifests/      老项目迁移 manifest（只读）｜禁止：在老工程内安装 / 构建 / 写文件
├── verification/          开发验证产物与长期验收索引（默认不入库）
│
├── package.json pnpm-lock.yaml pnpm-workspace.yaml vitest.config.ts playwright.config.ts   工程与工具配置｜禁止：承载规则内容
├── .env .env.local .env.example   本地环境与凭证（.env.local gitignored）｜禁止：入库
├── .gitignore .gitattributes      Git 行为配置
└── .next/ test-results/ dev.log   构建与运行残留｜禁止：入库（应 gitignore / 清理）
```

> **2026-10-02 结构决定（项目拥有者）**：docs/ 与 prototypes/ **已退役**——其全部内容并入 `specs/`（UI 相关进 `specs/experience-ui/`，数据生产协议进 `specs/`）。此后 **Experience/UI 相关内容一律放 `specs/`**，不再另设目录。
> 新建文件前必须搜索是否已有同职责 owner。**禁止平行真源。**

## 1. 归档规则（R14 · 2026-10-02 项目拥有者裁定）

> **总则：被取代、重复或不再必要的文件一律归档，不删除。** 本条**取代**原"Current-only working tree + `git rm`、不建 history/ 子目录"纪律。

**三个归档落点**（见上面树中标【归档】的三处）：

1. `archive/` —— **跨域历史快照**：一次性分析、结构报告、旧工作区状态。
2. `governance/archive/` —— **被取代的治理件**：旧 Roadmap / Phase Plan / 旧版 C0–C4 / 移交稿 / 旧 CURRENT 备份 / Candidate Backlog。
3. `specs/archive/` —— **被取代的契约与规范**：旧 UI Baseline、旧设计规格。

**六条规则**：

1. **取代 → 移入归档区**（`git mv`），不 `git rm`。可追溯性由归档区 + Git 共同承载。
2. **重复副本 → 保留被路由引用的一份**，其余移入归档区。
3. **归档件不得被活跃文件当作 Authority 引用**；引用时必须显式标注 `ARCHIVE / TRACE`。
4. **每次批量归档必须产出清单**：`archive/<date>-<topic>/README.md`，逐条写明「原路径 → 归档路径 → 归档理由 → 取代者 → **被引用于**」。**没有清单的归档视为未完成**（"被引用于"一列用于同步改引用——C4 八张原型图长期断链正是漏了这一步）。
5. **历史记录不改写**：归档件正文不修改（含其中残留的旧工具名或已失效的 Authority 自述）；只在文件首部加"历史快照，不代表当前状态"横幅。
6. **`specs/experience-ui/` 结构变更须拥有者确认**（该目录 README §3）；本规则不授予开发总工程师自行重组的权限。

## 2. Experience/UI Authority（登记 2026-09-29；2026-10-02 修订）

**C4 是 Human-facing Experience / UI 的唯一 Authority**（`AGENTS.md` §1）。`specs/archive/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 已降为 **SOURCE ARCHIVE / TRACE**，原 EXP-UI-GOV-01 的"CURRENT IMPLEMENTATION AUTHORITY"登记失效。

- **适用范围**：Experience、UI、Surface、Renderer、Map / Timeline / Evidence presentation、Visual Asset、MoHen Presence——以 C4 为准。
- Baseline 中经 C4 吸收的成熟规则仍为有效参考；未被 C4 吸收或冲突者以 C4 为准。
- **引用修订说明**：本条原以"C4 V2.1 §27"为据；C4 §27 已随 2026-10-01 净化退出正文（内容留 Git 历史），故不再引用该节号。
- 与 Agent / Data / Experience Contract 发生真实冲突时，开发总工程师**不得自行裁决**，必须提交项目拥有者确认（C0 §2.3 / §6.2）。

### 2.1 施工图代际（项目拥有者 2026-10-02 确认）

1. **第 3 代（当前）** = `specs/experience-ui/施工图/墨痕_五母题施工审阅_第一批_M1_配套规格_V0.1.md` + `specs/experience-ui/施工图/墨痕_五母题施工审阅_第一批_M1_V0.1.html`（25 页 / 50 视图 / 12 帧主线·「一座仓屋背后的交接生活」）。
2. **规范与样册（有效）** = `specs/experience-ui/source/两个组件_尺寸与母题叙事规范- 墨痕 V0.9.1.md`、`specs/experience-ui/source/交互原型- 墨痕 V0.9.1.html`。
3. **体验权威（有效）** = `specs/experience-ui/墨痕_Agent_2.0_金泽最小体验导演稿_V1.0.docx`。
4. **第 2 代（已归档）** = `specs/experience-ui/施工图/T05_B1_*` → `archive/2026-10-02-superseded/`。
5. **进度：五母题仅交付 M1（1/5）**；M2–M5 只有施工索引，无画面。
6. **未接入代码**：运行时体验由 `apps/web/data/experience/*.json` 的冻结五幕 canonical 驱动，与五母题帧体系（M1-F01…M5-F40）是两套帧系统；接入点见施工图 §4。
7. **未决**：C4 §11 / §15 称"具体施工结合现行双组件逐帧规范"，而 `specs/experience-ui/README.md` 把 `source/*` 定义为 TRACE"不得作为当前实现依据"——该矛盾已登记于 `CURRENT.md` §9。

## 3. 执行主体命名纪律（R13）

治理文本中的执行主体一律使用**角色名**（项目拥有者 / 开发总工程师），不得出现工具名或产品名（WorkBuddy / CodeBuddy / ChatGPT Architect 等）。

**范围**：`*.md` **与 Office 二进制（`.docx/.pptx/.xlsx`）**——后者须解包检查，不得只 grep 文本文件。历史归档件按 §1 规则 5 豁免。

### 3.1 标识符出身纪律（2026-10-02 · 项目拥有者选定**范围 C**）

**问题（实测）**：同一批 AI 起的名字，命运相反 ——

- `T11-C1…C5`（五个人审裁定码）进了**代码**（类型定义、测试断言、运行时字段）→ 改它一堆地方报错 → **被迫被解释**，活得很好；
- `scc_legacy` 只进了**数据**（DB 里一个字符串）→ 改它什么都不报错 → **没人解释**，变成孤儿。而它的定义（SCC＝上海文化总库，`scc.library.sh.cn`）一直躺在 `tasks/TASK-0009-…V1.1.md` 里，**只需两分钟就能搜到**。

**结论**：**只进数据的名字没有任何东西逼它被解释，所以必须由守卫来逼。**

**纪律**：

1. 凡我们自己创造的标识符，必须在使用它的同一处声明**出身**（`external` 外部权威给 / `derived` 由某出处推导 / `coined` 我们自己起）与**定义处** `defined_at`；`coined` 还须 `definition`（一句话说清它指什么）。
2. **`defined_at` 指向的路径必须真实存在**——防定义指针失效。
3. **禁止写"待查"**：只允许写"**已查 <清单>，未找到**"。理由：「待查」把「我没查」包装成「将来会查」，然后永远待下去。
4. **范围**：先覆盖**真库中无 CHECK 约束的词表型标识符**（`text[]` 标签列 + 自由文本方法代号）。CHECK 约束的枚举（实测 33 列 / 131 值）定义就在 `supabase/migrations`，登记表**只指向、不复制**（复制＝制造平行真源）；表名 / 字段名的分叉属 **ESC-01**，另行裁定。
5. **执行**：`specs/data-production/identifier-registry.json` + `scripts/check-identifier-registry.mjs`（`pnpm guard:identifiers`）。**新增任何未登记的标签 / 代号 → 守卫红。**

### 3.2 采集意图声明（2026-10-02 · M4.2）

**抓取 / 导入前必须先登记采集意图**（地点 / 主题 / 来源 / 许可 / 方法 / 检索词或半径）；**未声明意图的批次可进 Raw，但不得进入 Candidate**。落地＝`specs/data-production/acquisition-intents.json` + `scripts/check-acquisition-intents.mjs`（`pnpm guard:acquisition`）：**真库每一行必须恰好命中一个已声明批次**。追溯声明同受 §3.1 约束——**不许写「待查」**。

## 4. 版本源与 SOT

- **入口路由** `AGENTS.md`（纯路由，非 Authority）；**当前状态** `CURRENT.md`；**结构 SOT** `OWNERSHIP_MAP.md`（本文件）。
- **当前架构真源集（SOT Set）= C0–C4 + CURRENT**（项目拥有者 2026-09-29 明确，2026-10-02 复核）。**路径以 `AGENTS.md` §1 为唯一路由源**，本文件不再重复。
- **版本源唯一机制**见 **C0 §10**。
- **候选登记处**：`governance/archive/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`（TRACE，非 SOT）；Candidate 须经项目拥有者确认（C0 §6.2）方可晋升为 Contract / Plan / Task Book。

## 5. 本文件如何被校验（守卫契约）

`pnpm guard:structure` = `check-structure.mjs` + `check-structure-map.mjs`；链接与文档内路径引用由 `pnpm guard:links` 校验。

1. **根目录条目覆盖**（`check-structure-map.mjs`）：根目录每个实际条目都必须出现在 §0 的树里 → 否则红，提示"请在 OWNERSHIP_MAP.md §0 声明"。
2. **树中路径存在性**（`check-structure-map.mjs`）：树里写出的路径必须真实存在 → 否则红（防止退役目录仍留在树里）。
3. **路由源路径存在性**（`check-structure-map.mjs`）：`AGENTS.md` §1 的每条路径必须存在 → 否则红。
4. **链接与文档内路径引用**（`check-links.mjs`）：活跃文档的 markdown 链接、图片引用，以及反引号包裹的路径引用必须可解析 → 否则红。

**Trace 豁免**：路径含 `archive` 的目录、`tasks/`、`data/`、`legacy/` 不参与第 4 项校验——依 §1 规则 5，归档件与历史记录正文不改写，允许保留失效路径。
