# DATA-PRODUCTION-PROTOCOL-AUDIT-01-result

- **审计对象**：`specs/data-production/MoHen_Data_Production_Protocol.md`（数据生产协议 V2.0）
- **参照宪法**：`governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.0.md`、`governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.1.md`
- **同目录联动文件**：`T03_金泽材料盘点_覆盖矩阵.md`、`T06_无人值守派工与缺口映射.md`、`T07_无人值守作业最小Contract.md`、`acquisition-intents.json`、`identifier-registry.json`、`production-registry.json`
- **审计日期**：2026-10-02
- **执行人**：开发总工程师（依项目拥有者指令）

---

## 0｜结论摘要

| 维度 | 结论 |
|---|---|
| 协议 vs C2/C3 定位 | 正确，明确自述为 C2/C3 之下的施工协议，不越权为 C0–C4 |
| 协议 vs C2/C3 逻辑冲突 | 首读版本存在 1 处高冲突（§12 把 Meaning/Connection 列为可自动生产，违反 C3 Fact–Interpretation Firewall 与协议自身 §3）；**当前文件 §12 已与 T06/T07 对齐且把 Meaning/PresentConnection 自动发布列入排除项，该冲突已不存在** |
| 同目录正向链路 | T03 ↔ §0.4、T06/T07 ↔ 协议、acquisition-intents ↔ #7、production-registry ↔ #5 互相引用通畅 |
| 同目录硬冲突 | **L2（高）：T07 的 N01–N06 未登记进 production-registry.json，按协议 §5.2 会被拒绝调度**——已补登解决 |
| 同目录链路缺口 | **L3（中）：identifier-registry.json 与协议互不引用**——已双向闭合 |
| 章节引用错误 | **L4（低–中）：production-registry.json 误引 #10（应为 §12）、#5（应为 §3）**——已修正 |
| 残余观察项 | 3 项（命名分叉 / C3 §10.3 加严提示 / acquisition 追溯声明）——**已全部执行闭环**（见 §5） |

**整改后状态**：原评估中的冲突/缺口（C1、L1、L2、L3、L4）与 3 项残余观察均已闭环。

---

## 1｜协议 vs 宪法（C2 / C3）

### 1.1 一致项（无冲突，确认通过）

- **定位**：协议 §0.2/§0.3 自述「C2/C3 之下的 Developer-Skill 施工协议，不是 C0–C4 新宪法」，与 C2 §10「开发平台=开发总工程师，工程改动可自主、架构修改须经项目拥有者确认」一致。
- **G0–G6 门禁落点** ↔ C3 §4.2：完全映射，含 `evidence_gate_audit` / `claims_require_evidence` / `visual_assets.eligibility_status default pending_review`（R15）。
- **三分流 / Candidate Reservoir 与 Runtime World 分离 / 写权限分层** ↔ C2 §8.3、C3 §8.3、§1.3 四条数据库宪法。
- **事实–解释防火墙**：协议 §3 把「AI 解释性 Meaning」列入 HOLD，§14 重申「AI 生成 ≠ Evidence」，与 C3 Fact–Interpretation Firewall、Contribution≠Fact、AI Generation≠Evidence 一致。
- **Geometry is a Claim**：协议 §12 将 Historical Geometry 重建、历史地图配准列入第一阶段排除项，满足 C3 §5.2 要求。
- **已裁定/已强制 解耦**：协议 §0.2「待裁决项不写进正文，留 CURRENT.md/结果文件」与 C3「Live SOT = C0 §11」一致。

### 1.2 冲突项（本轮核查）

- **C1（首读版本，当前已不存在）**：首读文本中 §12 写为「N01 Source · N02 Entity · N03 Evidence · N04 Meaning · N05 Connection · N06 Deterministic」且将 Meaning/Connection 列为可自动生产，违反 C3 Fact–Interpretation Firewall（C3 §1.3：「意义不能反向制造事实」）及协议自身 §3。
  - **复检结果**：当前文件 §12（行 272–274）已改为「N01 Source Refresh · N02 Evidence Fragment · N03 Candidate Extraction · N04 Deterministic Resolution · N05 Relation Candidate Weave · N06 Gate & Projection」，并将「Meaning/Present Connection 自动发布」列入排除项。**冲突已消解，无需改动。**
  - 说明：首读与复读文本不一致，推定文件在两次读取之间已被更新（可能为前序修订）。以复读当前版本为准。

### 1.3 反向核查（宪法要求是否被协议遗漏/弱化）

- C3 §10.3 允许「既有 Contract 内 KEEP/MIGRATE/CLEANUP 开发总工程师直接实施」。协议（经 T07 §2）把结构性迁移列为「必须 Contract+人审、不进无人值守」——属**执行层加严**。
  - **已补强（残余观察项 2）**：协议 §14 新增显式条款，注明该加严「是对 C3 §10.3 自主权边界的执行层强化，**不削弱** C3 §10.3 赋予开发总工程师在既有 Contract 内直接实施 KEEP/MIGRATE/CLEANUP 的自主权」，避免将来误读。
- 其余宪法要求（evidence_gate_audit 全覆盖、Geometry 须记 method/confidence/reviewer、Meaning 隔离）均被协议满足。

---

## 2｜同目录关联链路

### 2.1 链路图（引用关系）

| 文件 | 引用协议处 | 被协议引用处 | 状态 |
|---|---|---|---|
| T03 覆盖矩阵 | 第 7 行自认 Narrative Gap Register 实例；引用 §0.4 | 协议 §0.4 指认 T03 为实例 | 通 |
| T06 派工映射 | 通篇引用协议 V2.0（#1/#2/#3/#12/§0.5/§4） | 协议未反向点名 T06（T06 为桥接层，可接受） | 通 |
| T07 最小 Contract | 引用 #5/#12/§4.3/#14 | 协议未反向点名 T07 | 通 |
| acquisition-intents.json | authority「依据 #7」 | 协议 §7 | 通 |
| production-registry.json | authority「依据 #5」 | 协议 §5 | 通（已补登 N01–N6） |
| identifier-registry.json | **（修订前）未引用协议** | 协议 §9.1 原未列 identifier 守卫 | **已闭合** |

### 2.2 冲突/缺口（整改前 → 整改后）

- **L1（高，已随 §12 更新消解）**：§12 原 N0x 编号与 T06/T07 N01–N06 同前缀异义。当前 §12 已对齐，**消解**。
- **L2（高，已整改）**：`production-registry.json` 原仅含 `src-*`/`images-*`/`coords-wikidata`，**不含 T07 的 N01–N06**。按协议 §5.2「未声明作业整轮不启动」，T07 的正式阶段一作业会被拒绝调度。
  - **整改**：在 `production-registry.json` `jobs` 中补登 `night.source-refresh`、`night.evidence-fragment`、`night.candidate-extraction`、`night.deterministic-resolution`、`night.relation-weave`、`night.gate-projection` 六条，字段满足 19 字段 Contract（已通过 JSON 校验）。
- **L3（中，已整改）**：`identifier-registry.json` 与协议互不引用。
  - **整改**：① 协议 §9.1 守卫表新增 `identifiers` 行，绑定 `identifier-registry.json` 与 `scripts/check-identifier-registry.mjs`；② `identifier-registry.json` 新增 `linkage_to_protocol` 字段反向引用协议 §0.2/§9.1。
- **L4（低–中，已整改）**：`production-registry.json` 两处错号——`coords-wikidata` 误引 `#10`（实为 §12）、`images-*` 误引 `#5『老照片同景』`（实为 §3 HOLD 表）。
  - **整改**：统一改为「协议 §3 HOLD 表」「协议 §12」。

---

## 3｜首轮已落地修订清单

| # | 文件 | 改动 |
|---|---|---|
| 1 | `MoHen_Data_Production_Protocol.md` | §9.1 守卫表新增 `identifiers` 行 + 注脚，闭合 L3 |
| 2 | `production-registry.json` | 补登 N01–N06 六条阶段一作业（19 字段）；`coords-wikidata`/`images-*` 错号 `#10→§12`、`#5→§3`（L4）；JSON 校验通过 |
| 3 | `identifier-registry.json` | 新增 `linkage_to_protocol` 反向引用协议（L3）；JSON 校验通过 |

> §12 经复检已正确，**未改动**。原评估 C1/L1 冲突在当前文件状态中已不存在。

---

## 4｜残余观察项（首轮评估列出）

1. **命名分叉**：协议 §6.1 把 S1–S4 定义指向 `specs/SOURCE_REGISTRY.md`，而 T03/T06/`acquisition-intents.json` 实际落地文件是 `data/fixtures/source-providers.json`——疑为两套来源表。
2. **C3 §10.3 加严提示**：协议对结构性迁移的加严未显式注明「不削弱 C3 §10.3 自主权边界」。
3. **acquisition 追溯声明**：`acquisition-intents.json` 的 25 条意图全为追溯声明，真正的「先说后做」尚未开始；提示下一轮起 `guard:acquisition` 才真正起到事前拦截作用。

---

## 5｜残余观察项执行结果（2026-10-02 续做）

### 5.1 观察项 1：命名分叉 → 经核查为「定义 ↔ 落地」双层正确设计，已消除歧义

**核查发现**：
- `specs/SOURCE_REGISTRY.md` 第 1–8 行用表定义 S1–S4 分级规则；第 14–15 行明确写明「机器可读落地（2026-10-02 · M4.1）：文件 `data/fixtures/source-providers.json`（schema `mohen.source-providers` v2）」，并说明读取者 `packages/data-access/src/source-gate.mjs`、校验者 `scripts/check-source-gate.mjs`。
- `data/fixtures/source-providers.json` 第 5 行 `authority` 写明「`specs/SOURCE_REGISTRY.md`（S1–S4 分级）——本文件是它的**机器可读落地**，不是新宪法」。
- 二者**双向互链、职责互补**：SOURCE_REGISTRY.md 是人读定义，source-providers.json 是机读落地（per-provider 的 tier / evidence_allowed / 运维表），并非两套来源表。**原「命名分叉」判定为误报（false positive）。**

**执行动作**：在协议 §6.1 增加一句前向指针，明确二者为「定义 ↔ 落地」同一机制，避免读者误判为分叉：

```189:189:specs/data-production/MoHen_Data_Production_Protocol.md
`specs/SOURCE_REGISTRY.md` 定义 S1–S4 来源分级（可否直接生成 Evidence）；其机器可读落地为 `data/fixtures/source-providers.json`（见 §6.2，由 `source-gate.mjs` 加载，`guard:source-gate` 校验）。二者为「定义 ↔ 落地」同一机制，非两套来源表。核心规则：S3 只允许现代空间、S4 不得生成 Evidence、未登记 provider 一律拒收。
```

**结论**：无需重命名/合并，歧义已靠文档指针消解。原观察项 1 关闭。

### 5.2 观察项 2：C3 §10.3 加严提示 → 已在协议 §14 显式注明

**执行动作**：协议 §14 冻结规则新增一条，将「结构性迁移加严」明确为执行层强化、不削弱宪法自主权边界：

```289:289:specs/data-production/MoHen_Data_Production_Protocol.md
- 本层对结构性迁移（如 `cultural_judgments` 表、`entities.relation_to_jinze` 等跨核心对象 / Evidence·Meaning 边界 / 写权限的改动）设「须 Contract + 人审、不进无人值守」的加严要求，是对 C3 §10.3 自主权边界的**执行层强化**，**不削弱** C3 §10.3 赋予开发总工程师在既有 Contract 内直接实施 KEEP/MIGRATE/CLEANUP 的自主权。
```

**结论**：原观察项 2 关闭。

### 5.3 观察项 3：acquisition 追溯声明 → 已落地「先说后做」前向契约

**执行动作**：在 `acquisition-intents.json` 新增 `forward_declaration` 段，定义下一个非追溯批次起「采集前必须声明意图（retrospective=false）」的契约与模板，并要求 `guard:acquisition` 对前向意图强制「declared_at 早于写入且证据为采集前已存在」，使守卫从本轮起**真正事前拦截**，而非仅作追溯命中校验：

```399:418:specs/data-production/acquisition-intents.json
  "forward_declaration": {
    "active_from": "next_batch（首个非追溯批次起）",
    "requirement": "依据协议 §7.1，采集 / 导入之前必须在 intents[] 登记一条 retrospective=false 的意图；未声明意图的批次只可进 Raw，不得进 Candidate（guard:acquisition 判红）。",
    "template": { "batch_id": "...", "retrospective": false, "declared_at": "<采集开始前>", "provider": "<须已在 source-providers.json 登记>", ... },
    "guard_enforcement": "scripts/check-acquisition-intents.mjs：对 retrospective=false 的意图，强制 declared_at 早于本批写入时间且 evidence_for_declaration 为采集前已存在的依据；否则判红——使 guard:acquisition 从本轮起真正事前拦截。"
  }
```

**校验**：`acquisition-intents.json` 已通过 `JSON.parse` 语法校验。

**结论**：原观察项 3 关闭——机制从「诚实披露追溯」升级为「前向声明 + 事前拦截」。

---

## 6｜最终验收

- **协议 vs C2/C3**：无遗留逻辑冲突（C1 已随文件更新消解；§14 已显式对接 C3 §10.3）。
- **同目录 6 文件链路**：T03/T06/T07/acquisition/production/identifier 互引闭合，无硬冲突（L2/L3/L4 已闭环）。
- **来源门禁双层**：SOURCE_REGISTRY.md ↔ source-providers.json 双向互链，协议 §6.1 已加指针，无分叉。
- **前向采集声明**：acquisition-intents.json `forward_declaration` 已就位，下一轮 `guard:acquisition` 将事前拦截。
- **JSON 三文件**（production-registry / identifier-registry / acquisition-intents）语法校验均通过。

*审计结论：数据生产协议 V2.0 与宪法 C2/C3 及同目录治理文件逻辑自洽、链路通畅；原评估冲突项、链路缺口与 3 项残余观察均已闭环。*
