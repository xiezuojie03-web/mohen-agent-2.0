# SYS-MATURITY-01｜墨痕系统成熟度补缺施工 Task-Book V1.0

**Status:** READY（Owner 2026-10-29 授权，按本任务书优先级施工）｜段 1 ✅ 完成（见 `tasks/results/SYS-MATURITY-01-1-result.md`）；段 2 ✅ 完成（见 `tasks/results/SYS-MATURITY-01-2-result.md`）；段 3 待做（扩展渠道，放后）
**Scope:** 系统搭建阶段成熟度补缺，聚焦 Studio（数据/资产累积）、Admin（平台/资产/作品管理）、外部资源获取
**依据:** 系统成熟度评估结论（`tasks/results/` 见评估底稿）＋ C0/C1 §6.2 / C2 §2·§5 / R15 / R28
**Execution model:** CodeBuddy 顺序施工，一段一验收；每段做完先给 Owner 看"能不能用"，Owner 点头再进下一段
**Stop rule:** 完成本任务书全部三段并 STOP；不擅自启动 E2 样板试验或其他新任务

---

## 一、背景与评估结论（进入本任务书的事实基线）

系统成熟度评估（2026-10-29 只读盘点）结论：

- **Admin 作品管理线**：已真实落地（草稿→版本→投稿→审核→发布→下架全生命周期，独立 Reviewer 签核 + Operator 发布强制分权）。
- **Studio 创作线**：骨架齐但"生产闭环"未通——`apps/web/lib/studio-research.ts` 的 `requestProduction()` 只落回执、不执行真实生产；运行时 `runResearch()` 是单趟研究，非多步自驱动。
- **资产累积**：创作成果只写 `publication.works/work_revisions`，没有写回 `read_model` 的链路。
- **资产治理**：`public.assets` 有台账/登记，无检索、无 candidate→verified 资格晋级。
- **外部资源获取**：运行时只有上海图书馆（`retrieve-shl.ts`）＋ DeepSeek 两个真实源；Wikidata/Commons/高德 等只在离线脚本（`pipelines/ingest/retrieve-*.mjs`），`source-providers.json` 登记 17 个 provider 多数未用。

**唯一生产入口**：`pipelines/data-production/run.mjs`（CLI，`--intent --adapters --from D00 --to D05`），真实编排在 `orchestrator/` + `adapters/layer1-adapters.mjs`（97KB）。这是任务 1 要接入的对象。

---

## 二、总目标与优先级（Owner 2026-10-29 排定，顺序不可颠倒）

| # | 任务 | 一句话目标 | 现状 |
|---|---|---|---|
| 1 | Studio 研究自驱动闭环（用现有渠道打通创作流程） | 用上海图书馆+DeepSeek 让"任意自然语言委托"走完 检索→获取全文→核验→生产；引擎接入已完成，缺"任意主题"入口 | 引擎已接入；任意主题未通 |
| 2 | 资产回流 + 资产治理 | 加"创作/研究成果 → `read_model` 知识资产"回流链路；Admin 补资产检索 + candidate→verified 晋级 | 无回流、无检索、无晋级 |
| 3 | 扩展渠道（放后） | 接入更多外部源（Wikidata/Commons/高德），在段 1 用现有渠道打通创作流程后、按需另行授权 | 离线脚本有，运行时未接 |

---

## 三、任务 1｜Studio 研究自驱动闭环（用现有渠道打通创作流程）

> Owner 2026-10-29 裁决：段 1 就要**用现有渠道（上海图书馆 + DeepSeek）打通创作流程**——让"任意自然语言委托"能真实生产；扩展渠道是段 3 的事，不在段 1。

### 3.1 现状（代码证据，已核实）

- **引擎已接入（✅ 阶段 A 完成）**：`requestProduction()` 已改为真实 `spawn run.mjs`，委托能触发 D00–D05 生产、进度可见、数据落库（见 `tasks/results/SYS-MATURITY-01-1-result.md`）。
- **但只产固定主题**（金泽/绿之丘）：生产链原料 `layer1-adapters.mjs` 的 `MATERIALS` 写死；`run.mjs --intent` 只写 `production_runs.research_intent` 存档、不参与选材。
- **检索链路已通**：`apps/web/lib/mohen-agent/retrieve-shl.ts` 的 `searchShanghaiLibrary(terms)` 对**任意词**查上海图书馆 4 端点（方志书名/古籍全文/人名规范/地名志）；`extractExternalEntities()`（DeepSeek，`retrieve-shl.ts:165`）从自然语言抽实体名。
- **断点 1——无全文**：`ShlLead`（`retrieve-shl.ts:14`）只返回 `title/summary/uri` 书目卡片，没有"获取全文正文"。
- **断点 2——未进生产链**：检索结果只作 `RESEARCH_LEAD` 线索供即时问答展示（`research.ts:146-155`），未登记 `source`、未喂 D01。

### 3.2 目标（Owner 白话）

用现有渠道（上海图书馆 + DeepSeek），让"任意自然语言委托"走完完整创作流程：**DeepSeek 抽实体 → 上海图书馆检索 → 获取全文 → 来源核验（D00/G0）→ 登记 source 原料 → 喂 D01–D05 生产 → 数据落库 → 前端可见**。

### 3.3 施工要点

**阶段 A（已完成 2026-10-29）**：`run.mjs` 接入 Studio 运行时——`child_process` spawn 唯一生产入口、`--run-id` 关联、`onStage` 进度回写、前端轮询显示（见 `tasks/results/SYS-MATURITY-01-1-result.md`）。

**阶段 B（已完成 2026-10-29）**：补"任意主题"入口，让委托不再只产固定主题：
1. **获取全文**：把上海图书馆检索到的命中条目（uri/实例）获取完整正文，在端点能力范围内；若某端点只给元数据、无法取全文，诚实标注"仅线索"。
2. **检索/获取结果 → source 原料**：取到的材料经 D00 来源核验（渠道/权利/身份，G0）→ 登记 `source.sources`（或对应表）→ 成为 D01 输入。
3. **D00 动态选材**：让生产链 D00 能接收"运行时检索来的材料"，而非只读写死的 `MATERIALS`。技术判断由 CodeBuddy 自主（如给 `run.mjs` 加动态材料注入参数、或 `layer1-adapters` 支持动态 `MATERIALS` 来源）；不改六阶段生产链边界、不新建第二套生产链。
4. **红线不变**：外部获取过 D00 渠道/权利/身份核验（C1 §6.2）；AI 生成 ≠ 文化证据；未核验材料不冒充事实。
5. **诚实降级**：取不到全文/权利不允许时如实标注，不假装生产。

### 3.4 验收标准

- Owner 委托一个**非金泽/绿之丘的新主题**，系统用上海图书馆 + DeepSeek 检索到材料、获取可用全文、经来源核验登记 source、喂 D01–D05 生产、数据真实落库、前端可见进度与结果。
- 取不到全文/权利不允许时，诚实告知"只能到线索层"，不假装生产。
- 验收终点以"前端能看到什么"为准（R28）。

---

## 四、任务 2｜资产回流 + 资产治理

### 4.1 现状（代码证据）

- 创作成果只写 `publication.works/work_revisions`，无任何函数把成果写回 `read_model`。
- `apps/web/lib/admin-assets.ts`：`listAssets`/`addAssetCandidate`（status='candidate'）真实；无资产检索/过滤；无 candidate→verified 晋级路由。
- 资产表 `public.assets`（migration `202610280940_assets.sql`，内置 6 条 verified 图片）。

### 4.2 目标（Owner 白话）

两部分：
1. **资产回流**：一部作品创作/研究完成后，其中的合格知识能沉淀成"知识资产"，在 EXP 里可见、可复用，而不是只留一个作品孤本。
2. **资产治理**：Admin 里能**检索资产**（按类别/状态/关键词），能把候选资产**晋级为 verified**（留门禁记录），实现你说的"对资产的管理"。

### 4.3 施工要点

**回流链路：**
1. 定义"什么成果、以什么资格、回流到 `read_model` 哪类 L5"——对齐 C2 §3.6 六类 L5：`world_projections / agent_contexts / story_seeds / discovery_paths / map_timeline_projections / evidence_pointers`。
2. 加一条落库路径：创作/研究合格产出 → 经资格（G5/gate 记录）→ 写 `read_model.*`。回流不绕过 `control.gate_audits`（R15：无门禁记录不得晋级）。
3. 区分"作品"与"知识资产"两支（C4 附录 V2.2）：作品供 WATCH，知识资产供 EXP 全池；回流的是"资产"这支。

**资产治理：**
4. `public.assets` 补检索：`GET /api/admin/assets` 支持 category/status/关键词过滤与分页。
5. 补 candidate→verified 晋级：新增 promotion 路由，晋级必须写 `control.gate_audits`（或对应审计记录），不带门禁记录不得晋级（R15）。
6. 晋级与撤权成对：已有 `invalidation-requests`（撤权）路径，晋级路径与之对称。

### 4.4 验收标准

- 一部真实作品创作完成后，其合格知识能回流成知识资产、在 EXP 可检索可见可复用（不是只在作品表里）。
- Admin 能按类别/状态/关键词检索资产。
- Admin 能把一条候选资产晋级为 verified，且晋级动作留有门禁/审计记录（可追溯"凭什么晋级"）。

---

## 五、任务 3｜扩展渠道（放后）

> Owner 2026-10-29 裁决：扩展渠道**放后**——在段 1 用现有渠道（上海图书馆 + DeepSeek）打通创作流程之后、按需另行授权。**本任务当前不做。**

### 5.1 现状（代码证据）

- 离线已有、未接运行时：`pipelines/ingest/retrieve-external.mjs`（Wikidata/Commons）、`retrieve-visual-jinze.mjs`（Commons）、`retrieve-amap-jinze.mjs`（高德）、`historical-spatial/shl-client.mjs`、`_probes/probe-sparql.mjs`（Wikidata SPARQL）。
- `specs/data-production/source-providers.json` 登记 17 个 provider，其中多个明确"未使用过（真库 0 行）"。

### 5.2 目标（Owner 白话）

段 1 用现有渠道打通创作流程后，按需接入更多外部源（Wikidata/Commons/高德 等），让"检索"入口更宽。

### 5.3 施工要点（届时再细化）

1. 抽统一 provider 接口：以 `source-providers.json` 为路由，定义"检索 provider"的运行时契约（输入查询词 → 输出带 `source/rights/retrieved_at` 的结果）。
2. 把离线 `retrieve-*.mjs` 的真实逻辑封装成运行时 provider，接入 `mohen-agent` 检索流程。
3. 外部获取红线不变（过 D00 渠道/权利/身份核验）。
4. 新增源密钥/费用列清单问 Owner，不自行采购或绕过访问控制。

### 5.4 验收标准（届时再定）

- 新增一个源的成本 = 配置/注册，不改主流程代码。
- 外部结果仍是"研究线索"，不自动成为历史事实。

---

## 六、执行顺序与分段交付

严格按任务 1 → 2 → 3 顺序，一段做完给 Owner 看效果，确认后再下一段：

1. **段 1**：Studio 研究自驱动闭环（任务 1）——用现有渠道（上海图书馆+DeepSeek）打通"任意自然语言→真实生产"创作流程；引擎接入已完成，补"任意主题"入口。
2. **段 2**：资产回流 + 资产治理（任务 2）——让生产出的东西能沉淀成资产、能被管理。
3. **段 3**：扩展渠道（任务 3，放后）——接入更多外部源（Wikidata/Commons/高德），按需另行授权。

> 三段之间有依赖：任务 2 的回流以任务 1 能真实生产为前提；任务 3（扩展渠道）在段 1 用现有渠道打通创作流程后按需启动。顺序按 Owner 排定，不颠倒。

---

## 七、全局硬规则（宪法红线，任何一段都不可破）

1. 保留 `run.mjs` 为唯一生产入口，不另建第二套生产链（C1 §6.2）。
2. Developer/Agent 分权：Agent 默认只读受控 World Projection，不写 Truth Store（C2 §2）。
3. 资格独立裁决：candidate→verified、回流写 `read_model` 都必须留门禁记录，无记录不得晋级（R15）。
4. 外部获取须过 D00 渠道/权利/身份核验；AI 生成 ≠ 文化证据（C1 §6.2 / §8）。
5. 数据生产以前端展示为唯一目标（R28）：每段验收终点是"前端能看到/能用"，不以表结构为准。
6. 不碰 main 分支、不碰 hushang-jingwei、不碰 Production；不擅自迁移真实数据或执行破坏性 DDL。
7. 扩展渠道（Wikidata/Commons/高德 等）放后，不在本任务书范围；如需新增外部源，密钥/费用先列清单问 Owner，不自行采购或绕过访问控制。

---

## 八、产出物

每段完成产出：
- 对应 `tasks/results/SYS-MATURITY-01-{段号}-result.md`（含改了什么/怎么验证/前端证据截图）
- 施工总账（`tasks/施工总账_Owner白话看板.md`）更新对应项状态为 ✅/🔧
- 必要时更新 `CURRENT.md` 的 §5 下一步状态（状态归位，不回抄宪法）

---

## 九、停止条件

STOP 并报告（不猜、不硬做）当遇到：
- 接入 `run.mjs` 需要改变宪法生产链边界或新建第二套生产链；
- 回流/晋级需要改变 `read_model` 六类 L5 语义或绕过 Gate；
- 外部源需要购买密钥/费用/绕过访问控制，而 Owner 未授权；
- 任何一步触碰第七节红线；
- 需要改变 C0–C4 原则或 Contract（先提交 Architecture Reconciliation 给 Owner 确认）。

> 完成后 STOP，不擅自启动 E2 样板试验或其他任务。
