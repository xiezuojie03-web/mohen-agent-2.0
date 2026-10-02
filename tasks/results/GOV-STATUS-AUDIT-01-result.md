# GOV-STATUS-AUDIT-01 · READ-ONLY PROJECT STATE AUDIT — Result

> 本文件为 GOV-STATUS-AUDIT-01 的唯一交付物。本次任务**只审计、不施工**：未修改代码 / 数据库 / schema / migration / seed / UI / 目录结构 / 配置。
> 所有结论均以**当前 repo 实际状态 + 实际运行观测**为准，不引用既有 Result 的结论作为依据。

> **2026-10-02 更正（不改写原文）**：本文 §6.1 把 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 标为"✅ CURRENT IMPLEMENTATION AUTHORITY"。该文件**已移至 `specs/archive/` 并降为 SOURCE ARCHIVE / TRACE**；Human-facing Experience / UI 的当前唯一 Authority 是 **C4**（见 `specs/OWNERSHIP_MAP.md` §2）。另：本文对 `packages/agent-runtime` 为"空壳"的判断已被其后的 ADR-003 落地取代，阅读时请结合 `decisions/ADR-003-agent-runtime-layered-architecture.md`。其余实测结论（D1–D7 漂移等）仍然有效。

---

## 0. 审计元信息

| 项 | 值 |
|---|---|
| Task ID | GOV-STATUS-AUDIT-01 |
| 执行模式 | READ-ONLY PROJECT STATE AUDIT（不允许施工） |
| 审计对象 | `D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0`（main worktree） |
| 分支 / HEAD | `track/world-cultural-world-02` @ `dacc96d` |
| 工作区状态 | 仅 2 个未跟踪文件（`tasks/results/*.rar` 证据压缩包），**无 modified / 无 staged 改动** |
| 审计时间 | 2026-09-25 23:00 – 23:25（本地） |
| Runtime 验证 | 已启动 `next dev`（3000 / 3001 双端口实例）+ Playwright 实际访问与交互 |
| 测试验证 | vitest 全量 suite 实跑；Playwright E2E 实跑 |
| 证据目录 | `data/exports/gov-audit-captures/`（11 张截图 + 3 份走查文本，gitignored） |

### 0.1 执行方式（只读证明）

- 代码/配置：仅 `Read` / `grep` / `ls` / `find`，零 `Edit` / `Write`（除本 Result 文件）。
- 数据库：仅 `SELECT` 类只读查询（表名清单 + 行数计数），零 `INSERT` / `UPDATE` / `DDL`。
- 运行：启动 dev server 与浏览器，仅产生 HTTP GET 与页面内点击（页面为纯前端 reducer，无写库路径）。
- 新增文件：仅 `data/exports/gov-audit-captures/*`（gitignored 输出目录）与本文档。测试套件自身会向 `data/exports/` 追加报告（既有设计行为，非本次改动）。

---

## 1. 结论摘要（TL;DR）

**一句话：工程集成是真的、数据是真的、但"Agent"目前不是运行时 Agent，而是一个已被固化的确定性体验——并且默认界面仍在向普通用户大量暴露内部技术语言。**

| 维度 | 判定 | 依据（实测） |
|---|---|---|
| 治理状态 | **M5 = CURRENT / HOLD**，M4 = CLOSED @ `aaf6910` | `CONTEXT.md` §状态行；`tasks/results/` 下**无** `M5-HUMAN-01-result.md`（Round B 未运行） |
| 数据底座 | **真实 populated**，非 mock | PostgreSQL `mohen_dev` 28 张表，evidence=185 / source_records=212 / evidence_gate_audit=2205 |
| 体验内容来源 | **全部来自冻结 JSON（预烘焙）**，运行期**零数据库访问** | `page.tsx` 只读 4 个 JSON；`apps/web` 与 `packages/*` 零 DB 依赖、零 LLM/HTTP 调用 |
| Agent Runtime | **未实现**（空壳） | `packages/agent-runtime/src/index.ts` = 1 行 `foundation-only`；`packages/ui` 同 |
| 追问闭环 | **真实可运行**，但为**确定性规则**（关键词分类 + 证据决策表），非推理 | `experience-runtime.ts` `FOLLOWUP_REPLAN`；实测点击追问后 IntentGuide 出现 |
| UI 实际呈现 | 8 场景全通、叙事与认识论边界表达**正确** | 实测走查 s01→s08 全 8 场景 |
| UI 与 Baseline 一致性 | **存在 7 项漂移（D1–D7）**，集中在技术元数据外露 | 默认模式画布文本实测（见 §5） |
| 工程健康度 | 高 | vitest **253/253 passed**；E2E **4/4 passed**；`?inspector=1` 门控生效 |
| 产品入口 | **无导航入口**：首页是工程健康面，无任何 `<a>` 链接 | curl 首页 HTML：0 个 `<a>`；体验页仅 1 个 Commons 外链 |

---

## 2. Governance 状态

### 2.1 三层治理 SOT（GOV-SYNC-02 冻结，实测文件均在位）

| 层 | 文件 | 存在 |
|---|---|---|
| L1 | `governance/MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx` | ✅ |
| L2 | `governance/MoHen_Agent_2.0_PHASE-II_Execution-Plan_V1.1.docx` | ✅ |
| Registry | `governance/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md` | ✅ |
| 附 | `governance/PHASE-GATE-01_Phase-I-to-II_Architecture-Gate_V1.0.md`、`governance/experience/` | ✅ |

### 2.2 阶段与门

- **Phase II — Canonical Experience Productization**；当前 Milestone **M5 = CURRENT / HOLD**。
- **M4 = CLOSED @ `aaf6910`**（Integration Closure PASS_TO_M5；Canonical Integration Chain 六层全通；0 blocker；3 条 NON-BLOCKING DEBT）。
- **M5-HUMAN-01（Canonical Human Experience Validation）Round A 出现 Human Experience FAIL SIGNAL** → M5 进入 HOLD；**Round B / H1–H10 = NOT RUN**，Human Gate 待 Architect 裁决。
  - 失败性质（来自 `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/README.md`）：**Runtime / Integration 已通过，但 Human-facing Experience 出现 Canonical Drift**——系统状态 / 证据结构 / 技术元数据抢占了人文体验的主视觉权威；当下真实场所与文化提问失去首要视觉地位。**不是史实错误**，是体验层级问题。治理含义：**Engineering PASS ≠ Human Experience PASS**。
  - 失败证据资产：`specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/current-runtime-recording.mp4.mp4`（negative canonical sample，不得作为未来 UI 模板）。
- **最近已完成并 COMMITTED 的任务**：`EXP-UI-RECON-01`（Jinze Canonical Experience Humanization Pass，R1–R5，Gate = PASS_TO_M5_HUMAN_ROUND_B，@ `dacc96d`）。

### 2.3 历史任务链（截止 HEAD，共 17 个 TASK + 9 个专项）

`TASK-0001…0017`（Foundation → PostgreSQL → Data Factory → Evidence Recovery → Human Review → Knowledge Weave → Spatial Grounding → Visual Evidence → 历史空间源采集 → 历史空间重建最小切片 → 证据闭合 → 3 分钟体验脚本 → Renderer 垂直切片 → Composition 2.0 → 视觉语法/Spatial Canvas → Evidence-aware Replan Loop → Multi-Intent 探索循环）；
专项：`EXP-0001/0002`、`EXP-CULTURAL-01/02/03`、`M5-HUMAN-01`、`EXP-UI-AUDIT-01`、`EXP-UI-GOV-01/01A`、`GOV-SYNC-02`、`GOV-DIR-AUDIT-01`、`ENG-GOV-01`、`M4-CLOSURE-01`、`CULTURAL-WORLD-01A/01B/01C/02`。

已归档 Result：40 份（`tasks/results/`）。**缺口**：`M5-HUMAN-01-result.md` 不存在 → 与"Round B NOT RUN"一致（无倒填）。

### 2.4 治理风险（G 级）

- **G-1（未决，阻塞性）**：M5 Human Gate 未裁决。`EXP-UI-RECON-01` 已自评 PASS_TO_M5_HUMAN_ROUND_B 并提交，但 Round B 未运行；当前 HOLD 状态的解除依赖 Architect。
- **G-2**：`EXP-UI-RECON-01` 的 R1–R5 自评与**本次实测的默认 UI**存在偏差（见 §5 D1–D3）。文档声称的"技术泄露全部关闭/人话化"未在实际运行画面上完全兑现。
- **G-3**：`CONTEXT.md` 与 `CURRENT_TASK.md` 为三层状态的最新入口，内容与 repo 实际一致（已交叉验证 commit hash `dacc96d`、`aaf6910`、`7f786c9`）。未发现"文档领先于代码"的倒填，但存在 G-2 类的**声称 vs 实测**落差。

---

## 3. Data 状态

### 3.1 数据库（本机 PostgreSQL 18，`mohen_dev`）

连接方式（唯一数据访问层的实现事实）：`packages/data-access/src/index.mjs` 通过 **psql 二进制**驱动（`PSQL_PATH` 默认 `D:\MoHen\tools\PostgreSQL\18\bin\psql.exe`），**零 npm pg 依赖**；凭证来自 `.env.local`（gitignored，`DATABASE_URL=postgresql://mohen_app@127.0.0.1:5432/mohen_dev`）。

**28 张表 · 实测行数**（本次只读查询）：

| 表 | 行 | 表 | 行 |
|---|---|---|---|
| evidence_gate_audit | 2205 | cultural_conflicts | 1 |
| source_records | 212 | historical_spatial_slices | 1 |
| evidence | 185 | historical_features | 5 |
| review_queue | 112 | historical_change_records | 5 |
| legacy_mappings | 97 | discovery_candidates | 4 |
| visual_assets | 42 | cultural_meaning_candidates | 2 |
| relations | 31 | cultural_present_connections | 2 |
| visual_entity_links | 22 | cultural_events | 9 |
| claim_evidence | 23 | cultural_relation_claims | 8 |
| claims | 20 | historical_spatial_relations | 8 |
| entities | 15 | historical_feature_anchors | 9 |
| evidence_fragments | 16 | human_review_decisions | 13 |
| relation_evidence | 6 | knowledge_paths | 3 |
| ingest_runs | 1 | knowledge_path_steps | 10 |

（其余 2 张：`claim_evidence` 已列；全表 28 张清单见审计记录。）

**判读**：数据库是**真实 populated** 的——185 条 evidence、212 条 source_records、2205 条门禁审计行、13 条人工复核决定，不是空库也不是 fixture。008 `cultural_*` 六表**均有数据**（events 9 / relation_claims 8 / fragments 16 / meaning_candidates 2 / present_connections 2 / conflicts 1），但体量明显小于基础层，属"首个活体簇"级别，尚未形成规模。

### 3.2 Migration

`supabase/migrations/` 共 7 个（本次实读文件名与关键内容）：

| # | 文件 | 内容 |
|---|---|---|
| 001 | `202609210001_foundation.sql` | `verification_status` 8 值 enum；source_records / evidence / entities / claims / claim_evidence / relations / relation_evidence |
| 002 | `202609210002_data_factory.sql` | G0–G6 证据门禁 |
| 003 | `202609210003_human_review.sql` | HR-1~HR-6 人工复核 |
| 004 | `202609220004_knowledge_weave.sql` | Knowledge Path / Discovery Candidate |
| 006 | `202609220006_visual_linkage.sql` | 视觉关联 |
| 007 | `202609220007_historical_spatial_reconstruction.sql` | TASK-0010 历史空间重建（5 表 + 6 条语义不变量 CHECK，**零 geometry 列、无 PostGIS**） |
| 008 | `008_cultural_world_objects.sql` | CULTURAL-WORLD-02：cultural_events / cultural_relation_claims / cultural_meaning_candidates / cultural_present_connections / evidence_fragments / cultural_conflicts；六值 CHECK `SUPPORTED / SUPPORTED_CANDIDATE / CONFLICTED / RESEARCH_LEAD / UNSUPPORTED / OPEN_QUESTION` |

**注意**：编号 **005 缺失**（直接跳到 008）。008 的文件命名不带头时间戳（与 001–007 风格不一致）。属既有事实，非本次改动。

### 3.3 数据流向（关键结论）

```
RAW/EXTRACT (pipelines/*)
      ↓  pipeline 脚本（读 PG 只读 + 写 data/exports）
data/exports/*.json  ← 构建期产物（gitignored）
      ↓  人工复制/冻结
apps/web/data/experience/*.json  ← 冻结副本（git-tracked，5 个文件）
      ↓  page.tsx 服务端读入 + checkFrozenInvariants（fail loud）
ExperienceShell → Surface Registry → 浏览器
```

- **运行期数据源 = 冻结 JSON，不是数据库。** `apps/web/app/experience/jinze-water-net/page.tsx` 只读 4 个 JSON（script / patch / slice / culturalSource），不含任何 DB 查询。
- 数据库只在 **pipeline 构建期**被访问（`pipelines/experience/build-jinze-3min-experience.mjs` 等，声明"零 DB 写 / 零迁移 / 零 Legacy 写"）。

### 3.4 冻结数据（实测位置澄清）

⚠️ **文档/代码字面与实际的偏差（本次实测坐实）**：

- `page.tsx` 写的是 `path.join(process.cwd(), "data", "experience")`，但**仓库根 `data/experience/` 并不存在**。
- 真实冻结副本目录 = **`apps/web/data/experience/`**（Next dev 的 `process.cwd()` 为 `apps/web`，故运行时解析正确）。
- 交叉验证：`git ls-files apps/web/data/experience` = **5 个文件，全部 git-tracked**；`tests/experience/renderer.test.ts` 头部 `FROZEN = apps/web/data/experience`。

5 个冻结文件：

| 文件 | 大小 | 修改时间 |
|---|---|---|
| `jinze-3min-experience-script.json` | 45,013 B | 2026-09-25 12:52 |
| `jinze-3min-experience-followup-patch.json` | 2,980 B | 2026-09-22 21:31 |
| `jinze-3min-experience-state-sequence.json` | 13,091 B | 2026-09-22 21:31 |
| `jinze-cultural-world-008.json` | 13,917 B | 2026-09-25 12:52 |
| `jinze-historical-spatial-slice.json` | 71,791 B | 2026-09-22 21:31 |

**观察**：`jinze-cultural-world-008.json` **只存在于冻结副本**，`data/exports/` 下无同名导出——008 投影产物未经由 exports 目录留存，冻结副本成为该产物的**唯一在库副本**（有单点丢失风险）。

### 3.5 数据层风险（D 级）

- **D-A1**：体验数据与数据库**是单向、离线、人工冻结**的关系。数据库更新**不会**自动反映到页面；页面也不写回数据库。这是当前阶段的有意设计（frozen artifacts），但意味着"实时 Agent 读库回答"尚不存在。
- **D-A2**：`jinze-cultural-world-008.json` 无 exports 侧副本——008 投影产物单点依赖冻结目录。
- **D-A3**：008 `cultural_*` 六表数据量小（1–16 行），若以此支撑"活的文化世界"叙事，深度有限。
- **D-A4**：migration 编号 005 缺失、008 命名风格不一致 —— 迁移序列可读性风险（低）。

---

## 4. Runtime 状态

### 4.1 包实现度（实测：每个 `src/index.ts` 的行数与内容）

| 包 | 实现状态 | 证据 |
|---|---|---|
| `packages/experience-engine` | **已实现**（1,519 行核心逻辑） | experience-runtime 376 / evidence-aware-replan 490 / surface-eligibility 413 / composition-recipes 109 / experience-beats 40 / index 45 |
| `packages/data-access` | **已实现**（`.mjs` 246 行，psql 驱动） | `index.mjs` 实读；`index.ts` 仅 1 行 `foundation-only`（**TS 与 MJS 双实现并存，TS 侧是占位**） |
| `packages/domain` | 类型/契约层（44 行） | 含 `extractionMethod: manual \| api \| parser \| ocr \| vision \| llm` 类型定义 |
| `packages/agent-runtime` | **空壳**（1 行 `foundation-only`） | ⚠️ |
| `packages/ui` | **空壳**（1 行 `foundation-only`） | ⚠️ |

**关键判定**：`specs/AGENT_CONTRACT.md` 定义的 Agent Loop（`Context → Understand → Goal → Plan → Skill/Tool → Observe → Evidence Gate → Discover → Compose → Confirm → Memory/Trail → Replan`）**是契约文档，不是运行代码**。仓库中**没有任何 LLM / 大模型 API 调用**（对 `apps/web` + `packages` 全量 grep `openai|deepseek|anthropic|claude|llm|chat/completions|fetch(`，仅命中 `packages/domain` 的一个类型字面量）。`.env.local` 中的 `SHANGHAI_LIBRARY_API_KEY` / `AMAP_API_KEY` 在运行期**未被引用**（仅 pipeline 侧使用）。

### 4.2 实际运行时调用链（实测 + 源码）

```
浏览器 /experience/jinze-water-net
  → page.tsx（服务端）
      · 读 4 个冻结 JSON
      · checkFrozenInvariants(script) —— 失败即 throw（fail loud）
  → ExperienceShell.tsx（客户端导演层）
      · Beat → buildWorldEvidenceState(script, slice, opts, projection)
      · WorldEvidenceState → Surface Eligibility → resolveComposition → Surface Registry
  → experience-runtime.ts reduceExperience（纯 reducer，框架无关）
      · NEXT / PREV / OPEN_EVIDENCE / CLOSE_EVIDENCE / TRIGGER_FOLLOWUP
      · FOLLOWUP_REPLAN / RETURN_TO_PRESENT / RESTART
  → 渲染：SpatialSurfaces / EvidenceNarrativeSurfaces（lib/mohen-visual）
```

冻结不变量由服务端强制校验（实测代码路径存在）：scene 数 6–8、duration 150–210s、禁 `RECONSTRUCTED_HISTORICAL`、`GEOGRAPHIC_EXACT` 只允许出现在 present 场景、primary discovery 必须 `INTERPRETATION_CANDIDATE`、`historical_visual_assets_used === 0`。

### 4.3 Agent 行为的实际入口

- **唯一的"Agent 行为"入口 = `FOLLOWUP_REPLAN`**：用户点击追问 → `classifyFollowUp(question)`（**关键词分类**）→ `decideEvidence(intent, world)`（**规则化证据决策**）→ `planReplan(...)` → 更新 `ExperienceState` → Patch-not-Replace 呈现。
- 这是**确定性规则系统**，不是推理系统：同一追问永远得到同一结果；不存在检索、规划搜索、工具调用或生成式回答。
- 实测验证：点击「追问：那颐浩寺和普济桥以前真的有关系吗？」→ `IntentGuide` 出现（收口层生效），默认模式下 `replan-card` 计数 = 0（DEV 门控正确生效）。

### 4.4 Runtime 层风险（R 级）

- **R-A1（定性）**：产品名称是 "MoHen **Agent** 2.0"，但 `agent-runtime` 是空壳。当前能演示的"Agent 性"来自**预烘焙脚本 + 确定性 reducer**。对外沟通若声称"AI Agent 实时推理"，与 repo 实际不符。
- **R-A2**：`packages/data-access` 的 TS 入口是 1 行占位、MJS 入口是真实实现——双实现并存，类型消费方易误接空壳。
- **R-A3**：追问是关键词分类，未见兜底/澄清路径的实测证据（若问句不含关键词，走默认分支）。

---

## 5. UI 状态（实际运行环境实测）

### 5.1 验证方式

- 启动 `next dev`：`:3000` 与 `:3001` 双实例，实测 `GET / = 200`、`GET /experience/jinze-water-net = 200`。
- Playwright（Chromium，1440×960）实际访问并交互，采集 **11 张截图** + **3 份逐场景文本走查**。
- 走查方式：点击页面底部「继续」按钮逐步推进，**8 个场景全部走通**（s01→s08）。
- 模式：**默认 Human 模式**（未加 `?inspector=1`）为主；另测 inspector 模式。

### 5.2 用户实际看到什么（逐场景，默认模式实测文本）

| # | scene_id | 顶部 | 主画面 | 墨痕发言 | 可选动作 |
|---|---|---|---|---|---|
| 1 | `s01-today-hook` | 墨痕进入现场 / 2026（当下）/ 现代精确坐标 / **Beat 1/5 · 1/8** | 当前地理空间图（3 个对象点：万安桥、普济桥、颐浩寺遗址） | "两座古桥、一处宋寺遗址，今天为什么离得这么近？" | 回到它们刚出现的时代 / 看事实 |
| 2 | `s02-time-travel` | 墨痕时间 / 空间转换 / 南宋景定—咸淳（1260–1267）/ 关系历史空间（无坐标） / **Beat 2/5 · 2/8** | 人文拓扑空间（金泽塘·关系骨架，普济桥—万安桥「同跨一条水道」） | "再往前，我不能继续用今天的坐标。但有一种关系留下来了。" | 看留下的关系 / 看事实 |
| 3 | `s03-two-bridges-water` | 墨痕关系发现 / 南宋—元 / Beat 3/5 · 3/8 | 拓扑图 + **证据面板**（颐浩寺 原址即/得名于 吕颐浩；"有条件可用"×N） | "先看它们和水的关系。把寺也放进来。" | 把寺也放进来 / 寺与桥有关系吗 / 寺的位置有多确定？ |
| 4 | `s04-temple-enters` | 南宋景定元年（1260）→ 元贞元年（1295） / Beat 3/5 · 4/8 | 同上 + 寺进入 | 同上 | 同上 |
| 5 | `s05-evidence-reveal` | 墨痕证据与时间变化 / 着录层 / Beat 4/5 · 5/8 | **着录冲突 · 并列 · 未裁决**（普济桥 1265 vs 1267）+ 时间景观轴（1260/1267/1342/1938/1992/今） | "为什么不能确定？也可以让时间成为主角。" | 看第一组分歧 / 看第二组分歧 / 看时间变化 / 看史料原页 |
| 6 | `s06-change-through-time` | 1342 → 1938 → 1992 → 当代 / Beat 4/5 · 6/8 | 时间景观（延续/变化/毁损/原址重建/未知） | 同上 | 同上 |
| 7 | `s07-return-today` | 墨痕回到今天 · 下一个问题 / 2026（当下）/ 现代精确坐标 / Beat 5/5 · 7/8 | 回到当前地理空间图 | "现在，再看一次它们。" | 看今貌照片 / 了解更多 / **4 个追问** |
| 8 | `s08-next-question` | 跨时段（发现陈述）/ Beat 5/5 · 8/8 | "墨痕的解释 / 尚未证实" + 组合命题 + 未决对点 | "现在，再看一次它们。" | 同 s07 |

**认识论表达实测为正确**：s08 明确显示「三处遗存…是同一片水网上的三个节点」并紧跟「寺与桥之间的历史功能关联仍未被证据支持」+「未决对点：寺↔桥的历史功能关系…零前现代文献支持」+「三条证据各自成立；把它们合起来怎么解读，还需要独立的判断」。符合 TASK-0012A 认识论防线（组合命题不泄漏进 `FACT_EVIDENCED`）。s05 冲突以「两值并存 · 未裁决」并列呈现，未替用户选边。**这部分是正确的、有价值的。**

### 5.3 与 Canonical Baseline 的漂移（D1–D7，实测）

对照 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`（§13 Evidence Humanization、§16 AP-01…AP-14、§20 VAG-1…VAG-5）。以下均为**默认 Human 模式**下实测文本，非 inspector。

| ID | 漂移 | 实测证据（原文） | 对照 Baseline | 级别 |
|---|---|---|---|---|
| **D1** | **坐标系术语 + 原始坐标在默认 UI 直出** | "当前地理空间 · **GCJ-02 原值** · 只代表今天" / "本图坐标系 **GCJ-02（原值，零换算）**" / "**WGS-84** · 另一坐标系参考锚" ×3 / "**120.9196,31.0395**" / "**31.0395°N**" / "50 m（按切片声明跨度估读）" | §13.1：GCJ-02 / WGS-84 通常**不应**作为默认用户 UI；AP-07 Technical Metadata Dominance | 高 |
| **D2** | **证据管线内部术语铺满默认 UI 且高频重复** | "证据片段闸门 · 精确到片段的放行/禁用" / "**有条件可用**" ×11 / "**整条可用**" ×10 / "整条可用（仅『原址重建』）" / "相对位置陈述" / "候选级：仅当前空间相邻" / "暂不采用（依据不足）" | AP-07；AP-01 Debugger UI | 高 |
| **D3** | **库表 / 来源 ID 直出** | "来源：**008/cultural_conflicts** · 双值并存" | AP-01 | 中 |
| **D4** | **制作层编号外露** | 顶部常驻 "**Beat 1/5 · 1/8**"（全 8 场景均有） | AP-01 | 中 |
| **D5** | **同一 surface 内容同屏重复渲染** | s03/s04 画布中「人文拓扑空间 · 无经纬度…金泽塘 · 关系骨架…实线＝有据…」整段**出现两次** | VAG 视觉验收门（主视觉权威唯一性） | 中 |
| **D6** | **常驻标签重复出现** | "这是还没有答案的问题" 出现在 s01/s02/s03/s05/s06；"当前坐标在此失去历史定位资格" 出现在 s02/s03/s05/s06/s08 | 留白与主次（§人文性） | 低-中 |
| **D7** | **运行时 console 报错** | React "Encountered two children with the same key …" 重复 ≥8 条 | 非致命，但为真实缺陷 | 低 |

**D1/D2 与既有声称的落差（重要）**：`CONTEXT.md` 记载 `EXP-UI-RECON-01` R1–R5 完成，含"**6 位 GPS 已人话化**""技术泄露全部关闭"。本次实测显示：**默认 UI 仍保留 GCJ-02 / WGS-84 术语与 6 位原始坐标**，且证据面板技术术语未人话化。即：R4 的声称在**实际运行画面**上未完全兑现（可能仅覆盖了 inspector 侧或部分组件）。这一点必须由 Architect 在裁决 Round B 前知悉。

### 5.4 已验证为正确/生效的部分（KEEP）

- ✅ 8 场景全通，`data-scene` 推进正常，`上一步 / 继续` 导航可用。
- ✅ `?inspector=1` 门控生效：默认模式下 `replan-card` 计数 = 0，inspector 模式下保留全部内部诊断。
- ✅ Patch-not-Replace 生效：追问后世界被"修补"而非整页替换，空间/时间/叙事连续性保留。
- ✅ 历史空间铁律生效：历史场景不出现精确坐标；`GEOGRAPHIC_EXACT` 只出现在 s01/s07（当下）。
- ✅ "这里没有水道 / 道路：本切片没有任何可靠线面几何，宁可抽象，也不画一条编出来的河"——零编造原则在 UI 上被显式告知。
- ✅ 认识论边界（s08）与冲突并列（s05）表达正确。
- ✅ 图片来源外链正确（Commons `Wan'anqiao.jpg`，CC BY-SA 3.0）；"今日实景 · 不是历史影像（历史视觉资产 = 0）"标注诚实。

### 5.5 入口与导航（实测）

- `/`（首页）：**Foundation 健康面**，硬编码 4 项检查（Project / Data / Agent / Experience）+ "当前页面只是工程健康面，不是正式产品首页"。HTML 中 **0 个 `<a>` 链接** → **没有任何入口通往体验页**，用户必须手输 URL。
- `/experience/jinze-water-net`：唯一外链为 Commons 图片来源。
- 结论：产品目前**没有首页、没有导航、没有第二屏**。

---

## 6. Assets 状态

### 6.1 关键文件 / 目录（实测在位）

| 类别 | 路径 | 状态 |
|---|---|---|
| 实施权威 | `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md`（1297 行） | ✅ CURRENT IMPLEMENTATION AUTHORITY |
| 契约 | `specs/FOUNDATION.md` / `EXPERIENCE_CONTRACT.md` / `AGENT_CONTRACT.md` / `DATA_CONTRACT.md` / `SOURCE_REGISTRY.md` / `OWNERSHIP_MAP.md` | ✅ |
| 设计基准 | `specs/experience-ui/canonical/`（2 张 PNG）、`source/`（交互设计 .md / UI 规格 .docx / 改造任务包 .docx / 可视化原型 .pptx） | ✅ |
| 失败证据 | `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/`（README + 录像） | ✅ |
| 决策 | `decisions/ADR-001-greenfield-local-first.md`、`ADR-002-cultural-world-claim-epistemic-model.md` | ✅（仅 2 份 ADR） |
| Skills | `skills/` 10 个（acceptance / data-ingest / evidence-gate / experience-prototype / historical-spatial-reconstruction / historical-spatial-source / knowledge-weave / project-guard / vertical-slice / visual-asset） | ✅ |
| Scripts | `scripts/` 14 个（audit-readonly-invariants / check-doc-budget / check-structure / db-*.ps1 / e2e-*-capture.mjs ×6 / environment-audit.ps1 等） | ✅ |
| Pipelines | `pipelines/` 含 build / cultural-world / evidence / extract / historical-spatial（含 `_probes/` 约 16 个探查脚本） | ✅ |
| 冻结数据 | `apps/web/data/experience/`（5 个，git-tracked） | ✅ |
| 导出产物 | `data/exports/`（约 40 个报告/CSV/JSON + 6 个 captures 目录） | ✅ gitignored |
| Legacy | `legacy/manifests/README.md`（仅 manifest 占位，无数据） | ✅ 只读引用 |

### 6.2 本次运行证据清单（新增，gitignored）

目录：`data/exports/gov-audit-captures/`

- 截图 11 张：`01-home.png`、`02-beat1-hook.png`、`03-beat2-timeshift.png`、`04-beat3-relation.png`、`05-beat4-evidence.png`、`06-beat5-return.png`、`08-inspector-mode.png`、`09-s07-return-today.png`、`10-s08-next-question.png`、`11-followup-replan.png`、`12-after-return.png`
- 文本走查 3 份：`beats-text.txt`（逐步画布文本 + console 报错）、`full-walkthrough.txt`、`full-walkthrough-8scenes.txt`（**8 场景完整 innerText**）

### 6.3 工程健康度（实测）

| 项 | 结果 |
|---|---|
| vitest 全量 | **16 files / 253 tests — 全部 passed**（Duration 278s） |
| Playwright E2E（`tests/e2e`，3 文件 4 测试） | **4 passed**（32.2s） |
| 运行页面 | `/` 200 / `/experience/jinze-water-net` 200 |
| console | 仅 React duplicate-key 警告（≥8 条），无 pageerror |

---

## 7. 风险清单（分级，供裁决）

| ID | 风险 | 级别 | 说明 |
|---|---|---|---|
| **V1** | **M5 HOLD 未解除，Human Gate 未裁决** | 阻塞 | Round B / H1–H10 未运行；解除依赖 Architect |
| **V2** | **RECON-01 声称的"技术泄露已关闭"与实测不符（D1/D2）** | 高 | 直接影响 Round B 的输入质量与结论可信度 |
| **V3** | **"Agent" 名实不符（agent-runtime 空壳、零 LLM）** | 高 | 对外/对上沟通风险；当前为预烘焙确定性体验 |
| **V4** | 体验内容与数据库离线冻结，运行期零 DB | 中 | 阶段性有意设计，但需明确对外表述边界 |
| **V5** | 产品无首页/导航/第二屏 | 中 | 用户实际可达内容 = 1 个 URL |
| **V6** | 008 cultural_* 数据量小（1–16 行） | 中 | "活的文化世界"深度受限 |
| **V7** | `jinze-cultural-world-008.json` 无 exports 副本 | 低 | 单点依赖冻结目录 |
| **V8** | React duplicate-key 运行时警告 | 低 | 非致命 |
| **V9** | migration 005 缺失 / 008 命名不一致 | 低 | 迁移序列可读性 |
| **V10** | data-access TS 占位 vs MJS 真实实现并存 | 低 | 类型消费易误接 |

---

## 8. 下一步建议（**仅建议，本任务不执行**）

> 按任务书 Stop Condition，以下均不在本次执行，仅供 Architect / 用户裁决。

1. **先决**：M5 Human Gate 裁决（V1）。裁决前建议先处置 V2——否则 Round B 的输入仍是当前实测画面。
2. **V2 处置建议**：针对 D1–D4 做一次"默认 UI 技术语言二次清查"，范围建议限定为：坐标系术语与原值坐标、证据面板状态词（有条件可用/整条可用/相对位置陈述/候选级）、来源 ID、Beat 编号。保留 `?inspector=1` 全部诊断能力（不删除，仅门控）。
3. **V3 处置建议**：二选一必须明确定调——(a) 承认当前为"预烘焙确定性体验"，对外表述去掉"实时 Agent"；或 (b) 立项实现 `agent-runtime`（检索 → 规划 → 证据门禁 → 动作），并与冻结体验明确分层。
4. **V5 处置建议**：明确"首页是否为产品入口"——若要对外演示，至少需要一条从 `/` 到体验页的可见路径。
5. **D5/D6 处置建议**：先由 Architect 判定 s03/s04 同屏重复是"设计意图（双 surface 对照）"还是渲染缺陷，再决定是否处理。
6. **V8 建议**：在下一次改动窗口顺手修 duplicate-key（目前不影响功能）。

---

## 9. 附：本次审计动作台账（只读证明）

| 步骤 | 动作 | 性质 |
|---|---|---|
| 1 | 解析两份任务书（工程执行版 / 用户理解版） | 只读 |
| 2 | 读 `CONTEXT.md` / `CURRENT_TASK.md` / `README.md` / `FOUNDATION.md` / `EXPERIENCE_CONTRACT.md` / `AGENT_CONTRACT.md` / `OWNERSHIP_MAP.md` / Baseline（1297 行） | 只读 |
| 3 | 读 `experience-runtime.ts` / `ExperienceShell.tsx` / `beats.ts` / `page.tsx` / `data-access/index.mjs` / `build-jinze-3min-experience.mjs` | 只读 |
| 4 | 数据库只读查询（表清单 + 28 表行数） | 只读 |
| 5 | 启动 dev server（3000 / 3001）+ Playwright 走查 8 场景 + 11 张截图 | 运行观测 |
| 6 | vitest 253/253、Playwright E2E 4/4 实跑 | 验证 |
| 7 | `git log` / `git status` / `git ls-files` / `git branch` | 只读 |
| 8 | 写入本文件 + 运行证据目录 | 交付物 |

**STOP**：本任务到此结束。未执行任何修复、未启动任何后续任务、未修改任何产品文件。
