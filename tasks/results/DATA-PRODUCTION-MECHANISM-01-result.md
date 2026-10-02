# DATA-PRODUCTION-MECHANISM-01 · 数据生产机制盘点与长效机制设计 — Result

- **日期**：2026-10-02
- **性质**：**只读盘点 + 机制设计**。本任务未修改任何代码 / DB / schema / 迁移 / 数据。
- **委托**：项目拥有者 ——「我更在乎的是数据生产的长效机制……我要成为数据的把控者，不能处于迷迷糊糊的状态，当然这不代表我要在海量数据里累死，是要一套机制。」
- **授权范围**：拥有者已批准下列 **M1–M3** 机制并同意 **M4** 方向；**现有 1246 张的处置（M5）暂时搁浅**，待机制成熟再处理。
- **沉淀约定**：**本文件是本次任务成果**；待 §3 断点解决后，再由拥有者决定是否迁入 `specs/` 作为长期文件。

> **术语说明（2026-10-02 后续更新，依项目拥有者更正）**
> 本文件写于更名之前，故正文保留当时的旧称。**依 R14 规则 5（历史记录不改写），此处只作对照，不修改正文。**
> - 旧「夜间（自动化）数据生产」→ 新「**无人值守数据生产**」。理由：真正的约束**不是时钟**，而是**判断风险的边界**；它是**按需触发 + 截止时间**，不是定时调度。
> - 新增**有人值守数据生产**模式（拥有者做判断：身份/冲突/历史空间/Meaning 边界）。**两种模式共同构成数据生产**，共用同一条流水线、同一套 Gate、同一个生产注册表。
> - 旧「Night Batch / NightJob / Night Registry」→ 新「**无人值守批次 / 无人值守作业 / 生产注册表**」。
> - 协议文件已更名：`MoHen_Night_Data_Production_Protocol.md` → **`MoHen_Data_Production_Protocol.md`**（V1.0 → **V1.1**，新增 §0.5 两种值守模式、§0.6 有效生产服务于人文叙事）。
> - 本文件 §4 的 M1/M3/M4 表述以旧名为准，实施时已按新名执行（M3 已完成）。

---

## 1. 协议文件的关系（三层）

```
第一层 · 宪法（为什么 / 边界）
├── C2  Humanistic Data OS & Dual Skill Architecture
│      双 Skill 分工（Developer Skills 造世界 / Agent Skills 用世界）
│      八层模型 L0–L7 · §9 Skill 成熟与晋升规则（Candidate→Task Pattern→Draft→Mature→Deprecated）
└── C3  Database Architecture V1.1
       §2 八层数据地图 · §3 核心对象模型（Entity/Event/RelationClaim/Epistemic Status）
       §4.1 状态机 · §4.2 Evidence Gate G0–G6 · §5 时间/空间/视觉资产
       §6 物理结构建议 · §8.3 写权限原则 · §9 旧库迁移

第二层 · 协议（怎么做 / 可执行规则）
├── specs/MoHen_Night_Data_Production_Protocol.md    夜间无人值守全套规则（14 节）
│      #3 主流水线 11 阶段 · #4 Gate 夜间裁决 · #5 AUTO/HOLD/REJECT 三分
│      #6 Truth Store 写权限 · #7 失败/重试/回滚 · #8 晨报（拥有者只看这个）
│      #10 第一阶段批次白名单 · #11 Skill 晋升 · #12 Night Registry 最小 Contract（13 字段）
├── specs/SOURCE_REGISTRY.md      S1–S4 来源分级（可否直接生成 Evidence）
├── data/fixtures/source-providers.json    provider→tier 映射（上一份的机器可读落地）
└── specs/DATA_CONTRACT.md        字段契约（待改造为机器可读，以 supabase/migrations 为唯一真源）

第三层 · 执行（谁做 / 代码与 SOP）
├── skills/*/SKILL.md ×10         Developer Skills 的 SOP（C2 §3.1 声明 11 个，缺 mohen-spatial-grounding）
├── pipelines/*                   各阶段执行体（ingest/evidence/weave/legacy/visual/historical-spatial…）
├── pipelines/legacy/night-runner.mjs + port-*.mjs    夜跑调度与批次
├── tools/night/*.mjs             运维脚本（探针/修复/校验）
└── specs/experience-ui/T03 · T06 · T07   任务级：材料盘点 / 派工与 Gap 映射 / NightJob 最小 Contract
```

**权威链**：`C0 ≥ C1 > C2/C3 > 夜间协议 / SOURCE_REGISTRY / DATA_CONTRACT > skills 与代码`（仲裁见 C0 §3）。

**关系层实测到的 3 处错位**：

1. `SOURCE_REGISTRY.md` 末行要求"每个 provider 额外维护：访问方式、限流、许可、失败经验、最后验证日期"——**该文件不存在**；`source-providers.json` 只有 `provider` + `tier` + `evidence_allowed`。
2. `specs/DATA_CONTRACT.md` 的字段清单、`supabase/migrations/*.sql` 的建表、`scripts/audit-visual-assets.mjs` 第 55–62 行硬编码的对照表——**同一件事三处并存**。
3. `T03/T06/T07` 讲数据生产，却位于 `specs/experience-ui/`（目录归属错位）。

---

## 2. 生产路径可视化

```
             ┌──────────────── Raw 永久 append-only，不得覆盖 / 删除（协议 #6/#7）────────────────┐
             ▼                                                                                    │
01 Acquire ─► 02 Preserve Raw ─► 03 Normalize ─► 04 Extract ─► 05 Evidence ─► 06 Resolve ─► 07 Weave ─► 08 Gate
  抓取           原始快照           标准化          候选抽取       证据片段        身份消解       关系编织      G0–G6
   │                                                                                                        │
   ▼                                                                                    ┌─────────────────┼─────────────────┐
source_record                                                                           │                 │                 │
+ raw_path                                                                             AUTO              HOLD             REJECT
                                                                                    确定性晋级          隔离区           自动拒绝
                                                                                                          │                 │
                                                                                                          ▼                 ▼
                                                                                                    review_queue      去重日志 / 隔离记录
                                                                                                 （可积累，不必天天清 ·
                                                                                                   协议 #5/#8/#13 明文）
09 Promote ─► 10 Projection ─► 11 Acceptance ───────────────────────────────────────────────────────────────┘
   晋级          刷新只读模型        批次验收

状态机（C3 §4.1）：
  RAW ──────► CANDIDATE ──────► ADJUDICATED ──────► RUNTIME_ELIGIBLE ──────► PUBLISHED
  原始材料      实体/关系候选      过 Evidence/人审       满足表达条件            可稳定面向用户

七道门（C3 §4.2 / 协议 #4）：
  G0 来源完整 · G1 对象身份 · G2 时间语义 · G3 空间诚实 · G4 证据支撑 · G5 冲突 · G6 发布资格

写权限（C3 §8.3 / 协议 #6）：
  Developer Skills ──► 可写 Truth Store（须过 Gate + 审计）
  Agent / LLM ─────► 只读；产物只进 Candidate / Proposal
  Projection ──────► 只读 World；不得反写 Truth Store

拥有者的固定入口（协议 #8）：
  Morning Summary 一页 —— 结论三选一：PASS / PASS WITH HOLD / STOPPED
  外加 Escalation：只列会阻塞当前金泽体验的 0–3 条
```

---

## 3. 机制断点清单（12 条，全部实测；本清单即"待解决的断点"）

| # | 协议条款 | 应有 | 实测 | 判定 |
|---|---|---|---|---|
| B-01 | **#3 阶段 08 Gate** | 每批产出 G0–G6 结果 + reason code | 夜跑窗口（≥22:00）内 `evidence_gate_audit` **0 条**；末条审计为 2026-10-01 19:57:35；1246 张图 0 条审计 | 断 |
| B-02 | **#5 三分流** | AUTO/HOLD/REJECT；HOLD 进隔离区 | 334 关系 + 1246 图片**从未进 `review_queue`**（293 条全部 created_at 为 09-22/09-29，10-01 新增 **0**） | 断 |
| B-03 | **#6 写权限** | 自动晋级须记 run_id / 规则版本 / Gate 结果 / 回滚点 | **727 张图无任何 `ingest_runs` 行**（`jobImages` 从不创 run） | 断 |
| B-04 | **#8 晨报** | 13 个字段由查询得出 | "安全"段是 `night-runner.mjs` L196 的**硬编码模板字符串**（曾断言"未绕过 Evidence Gate"） | 断 |
| B-05 | **#12 Registry Contract** | 每个 job 声明 13 字段才可入调度 | 作业队列**硬编码在 runner 里**（65 个），无 `write_scope`/`gates`/`auto_promote_policy`/`hold_reasons`/`rollback` 结构；写入范围写死在 `jobImages`/`jobCoords` 函数体内 | 断 |
| B-06 | **#7 Idempotent** | checksum / natural key 幂等 | 跨批 `legacy_id` 规则不同（`https:` / `File:标题` / `sha(url)` / `hushang-jingwei:shl:`）→ 实测 **14 组重复 `file_path`** | 断 |
| B-07 | **#2 Developer Skills** | 夜间只启用 C2 指定的 Skill 家族 | 图片批次由临时脚本 `port-photos.mjs` 执行，**绕过 `mohen-visual-asset` 的用途/权利判定** | 断 |
| B-08 | **SOURCE_REGISTRY 末行** | 每个 provider 维护访问方式/限流/许可/失败经验/最后验证日期 | **该文件不存在** | 断 |
| B-09 | **入口把关（拥有者关注点）** | 来源门禁应约束"能不能取、能生成什么" | `source-providers.json` **没有任何代码读它**——引用者全是文档（T03 §15/§93/§100、T06 §28、OWNERSHIP_MAP §0.2）与归档件；唯一代码提及是 `pipelines/ingest/retrieve-external.mjs` 第 5 行的注释。**且即便读了也对不上**：其键为 `shanghai_library`/`wikimedia_commons`/`government_heritage`/`internet_archive`/`amap`/`social_media`，而真库 22 种 provider 实际写作 `Wikimedia Commons`(98) / `wikimedia-commons`(21) / `上海图书馆开放数据`(14) / `shanghai-library`(9) / `shanghai-library-open-data`(5) / `shanghai-library-t11-alignment`(4) / `qingpu-government` 等 | 断（**关卡从未接线**） |
| B-10 | **#5「历史地图锚点 → HOLD」+ #10「暂不作为第一阶段：历史地图配准」** | 该类内容必须 HOLD，不得自动写入 | `historical_features` 中 `slice_id='SHL-LEGACY-COORDS'` 共 **240 行**（NIGHT-BATCH-006 238 + NIGHT-RUN coords 2），**全部 `confidence=0` 且 `evidence_ids={}`**，仍以 candidate 入库 | 断（**最严重**） |
| B-11 | **#5「老照片同景判断 → HOLD」** | 新旧影像判定必须 HOLD | `port-photos.mjs` 对全部 519 张**写死** `depicted_period='现代影像（非历史）'`；该批实测含 2007/2012 年 panoramio 老照片与 29 个 `.djvu` 古籍扫描、1 个 `.webm` 视频 | 断 |
| B-12 | **#10 批次白名单 + 采集范围** | 只跑 N01–N06；采集应有范围 | 63 个作业中 **58 个是 `jobSource`**（仅登记 source_record + 复制 raw，属 N01，低风险）；**5 个高风险 job** = 4 个 image + 1 个 coords，正是断点 B-10/B-11 所在。且采集方式为 **Commons 地理搜索（坐标半径）补抓**（源文件字段 `"source":"commons-geosearch-topup-20260829"`），无地点过滤：519 张 `towns` 分布为 **枫泾 104 / 川沙 73 / 新场 72 / 高桥 64 / 嘉定 41 / 张堰 39 / 金泽 34 / 练塘 33 / 南翔 23 / 朱家角 19 / 罗店 17** —— **金泽仅占 6.5%** | 断 |

**一句话诊断**：

> **协议是完备的；夜跑执行体不是按协议写的。** 它绕过了 Gate、绕过了 HOLD、绕过了 Registry Contract、绕过了 #10 的批次白名单与"老照片/历史锚点必须 HOLD"的明令，然后用一句硬编码的"未绕过 Evidence Gate"作为晨报。

**这解释了"迷迷糊糊"的来源**：不是数据难懂，而是**协议与实际生产是两套东西**——读协议看到的是规则，跑起来是另一回事。

### 3.1 现有 1246 张的构成（供 M5 参考，本轮不处置）

| 批 | 张数 | 元数据状况 | 可自动判定 |
|---|---|---|---|
| `commons_images`（BATCH-004） | 519 | `towns` **519/519 全覆盖**；title 519；description 417；license 519；date 490 | **可按 towns 自动排除非金泽 485 张**（零人工） |
| `shanghai_images_verified / census`（NIGHT-RUN） | 727（两文件为同一批 URL） | title/desc 仅 **198**；`town_hint` 355；**529 张无任何文字** | 无法自动判定内容；库内无判据 |

（其中 20 条被夜跑以同一 URL 重灌、洗掉了人工排除；28 条非图片已排除；`effective_visual_assets` = 8。）

---

## 4. 已批准的长效机制（M1–M4，含可执行规格）

> 三条着力点，正好对应被绕过的三处：**入口**（谁能跑）· **中段**（什么能晋级）· **出口**（你只看什么）。

### M1 · Night Registry 强制入口（对应 B-05）

- 新增**机器可读 registry**：`pipelines/night/registry.json`；协议 #12 的 13 字段逐 job 声明：
  `id / version / purpose / inputs / outputs / write_scope / gates / auto_promote_policy / hold_reasons / stop_conditions / retry_policy / tests / rollback / summary`。
- **`auto_promote_policy` 未声明 = 不自动晋级**；`write_scope` 必须列明表名。
- `night-runner.mjs` 启动时读 registry 并校验：**任何作业不在 registry 或字段不全 → exit 非 0，不调度**。
- 新增 `scripts/check-night-registry.mjs` 纳入 `pnpm guard`。
- **效果**：现有 5 个高风险作业必须显式声明"我要写 `visual_assets`/`historical_features`、过哪些门、什么进 HOLD、怎么回滚"——**声明不出来就不许跑**。拥有者把控的是"允许哪些自动化上线"，不是数据本身。

### M2 · Gate / HOLD 数据库层强制（对应 B-01 / B-02）

- 新迁移（编号续 009）：`visual_assets` 增 `eligibility_status text not null default 'pending_review'`
  （取值 `pending_review` / `gate_passed` / `gate_failed` / `excluded`）；**默认即"未审"，与现状"默认可用"语义相反**。
- 触发器：置 `gate_passed` 时必须在 `evidence_gate_audit` 有对应 G0–G6 记录（与既有 `vel_confirmed_requires_evidence` 同构）。
- `effective_visual_assets` 改为按 `eligibility_status='gate_passed'` 过滤。
- 任何写入 Candidate 及以上层的作业，**必须**同时产生 `review_queue` 行（AUTO/HOLD/REJECT 三分）。
- 属 C3 核心对象变更 → 走 **Architecture Reconciliation**（拥有者已原则批准）。

### M3 · 晨报改为真查询 + 三结论（对应 B-04）

- `result.md` 的全部字段**由 SQL 生成**；**删除 L196 硬编码段**。
- 结论只有三种：`PASS` / `PASS WITH HOLD` / `STOPPED`。
- 新增两个必报字段：**Gate 覆盖**（本批写入对象中有多少条带 G0–G6 记录）、**HOLD 新增数**。
- `Escalation` 只列**会阻塞当前金泽 Canonical Experience 的 0–3 条**。
- **自检要求**：晨报里每个数字都要能附上其 SQL（可复核）。
- **效果**：拥有者每天只看一页；普通 HOLD 自动积累（协议 #5/#8/#13 已经这么规定）。

### M4 · 采集意图声明 + 让门禁真正接线（对应 B-08 / B-09 / B-12）

- **前置修复（必须先做）**：provider 命名归一（22 种字符串、含 4 处同义变体）→ 与 `source-providers.json` 的键对齐；并补全 SOURCE_REGISTRY 承诺的 provider 运维表（访问方式 / 限流 / 许可 / 失败经验 / 最后验证日期）。
- **让代码真正读 `source-providers.json`**：取回与入库时按 provider 查 tier，S3 只允许现代空间、S4 不得生成 Evidence、未登记 provider 一律拒收。
- **采集意图声明**：每批采集前声明 地点 / 主题 / 来源 / 许可 / 半径或关键词 / 预期量；写入时每条数据带 `query_intent` + `acquisition_batch`。
- **门禁**：**未声明采集意图的批次只能进 Raw，不得进入 Candidate。**

### 执行顺序建议（按"最便宜且最快见效"排）

| 顺序 | 项 | 理由 |
|---|---|---|
| 1 | **M3 晨报** | 改动最小、立刻减少拥有者负担；且它反过来暴露其余断点 |
| 2 | **M1 Registry** | 入口闸，防止新的无声明作业上线 |
| 3 | **M4 采集意图 + provider 归一 + 门禁接线** | 让"入口把关"从文档变成代码 |
| 4 | **M2 DB 强制** | 需迁移，最后做；此时 M1/M4 已挡住大部分风险 |

---

## 5. 搁浅项（拥有者指定暂不处理）

**M5 · 现有 1246 张的处置** —— 拥有者意见：「现有 1246 张我全部不要都不可惜，说不定追查他们的价值比重新定规矩、按合理的数据生产路径拿到的数据更快、更有价值。」

→ **本轮不动任何一张图**；待 M1–M4 机制成熟后，再决定是整体置 `excluded`（保留审计、不删除）还是连 Raw 快照一并清出主库。

---

## 6. 本文件所有数字的证据来源

| 证据 | 位置/方法 |
|---|---|
| 协议全文与 14 节 | `specs/MoHen_Night_Data_Production_Protocol.md`（实读 §0–§13） |
| 状态机 / G0–G6 / 写权限 | `governance/C3_…V1.1.md` §4.1 / §4.2 / §8.3（实读） |
| 来源分级 | `specs/SOURCE_REGISTRY.md`（全 10 行，实读） |
| 作业队列与 L196 硬编码 | `pipelines/legacy/night-runner.mjs`（实读 1–98、98–167、186–211 行） |
| 夜跑结果与计数 | `tasks/results/NIGHT-RUN-20261001/{progress.json,result.md}`（实读） |
| 图片质量、门禁覆盖、review_queue、重复 | 对 `mohen_dev` 的只读 `SELECT`（本轮与前轮实测） |
| 519 张 towns 分布 / 727 张元数据覆盖 / `commons-geosearch-topup` | 直接读取源 JSON：`hushang-jingwei/data/fetched/{commons_images,shanghai_images_verified_20260905,shanghai_images_census_20260905}.json` |
| provider 分布与变体 | `select provider, count(*) from source_records group by 1`（22 行，实测） |
| `source-providers.json` 无人读取 | 全仓 `*.mjs` / `*.md` grep（引用者全为文档） |
| `SHL-LEGACY-COORDS` 240 行零证据零置信 | `select slice_id, count(*), count(*) filter (where confidence=0), count(*) filter (where cardinality(evidence_ids)=0) from historical_features group by 1` |

## 7. 本次未做

- 未改任何代码 / DB / schema / 迁移 / 数据 / 文档（除本结果文件）。
- 未处置 1246 张（M5 搁浅）。
- 未把本文件迁入 `specs/`（依拥有者：断点解决后再迁）。
- 未动的既有待裁决项：`CURRENT.md` §9 的 ESC-01/02/03 与 UI 权威矛盾（第三轮处理）。

---

# 第二部分 · 执行进展（持续维护区）

> **职责归位（2026-10-02 项目拥有者指定）**
> **§1–§7 是原始评估**（2026-10-02 当时的事实与方案），**不改写** —— 它们记录了"当时为什么这么判断"。
> **§8 起是执行进展**：围绕本文件的全部后续工作**一律维护在这里**，不再往 `CURRENT.md` 累积。
> `CURRENT.md` §9 只保留「状态 + 指针」，指向本文件。
>
> **维护约定**：每完成一步，更新 §8.1 对应行的状态与证据；新增的未决事项记入 §8.4；
> 拥有者裁定后更新 §8.2 与 §8.3。**本文件是机制线的唯一进展载体。**

## 8. 执行进展

### 8.1 地图完成度（B-01…B-12 + M1–M4）

> **为什么先看这张表**：2026-10-02 复盘发现，此前多轮工作"看起来一路冒新问题"，
> 真实原因是**跟着最新问题走、而不是按这张已有的地图走** —— 于是不断"重新发现"地图上早已标注的地方。
> 例：R15 落地的方案，与本文 §4 **M2 的前三条一字不差**，却在十几轮之后才被"重新发现"。

**断点（B-01…B-12）**

| 断点 | 内容 | 状态 | 证据 |
|---|---|---|---|
| B-01 | 阶段 08 Gate 未接线（夜跑窗口内审计 0 条） | **已处置** | `ee1b0ad`（M4.1 门禁接线）+ `777436a`（R15 触发器强制） |
| B-02 | 三分流未实现（334 关系 + 1246 图片从未进 `review_queue`） | **未处置** | = §4 M2 第四条；见 §8.5 |
| B-03 | 自动晋级未记 run_id / 规则版本 / Gate 结果 / 回滚点 | **已处置** | 生产注册表强制 `gates`/`rollback`（`11e6fe7`）；M2 第四条（迁移 202610020009 + `c189e5a`）后：`unattended-runner` WRITE 模式登记 `ingest_runs`（run 级归因），每个候选写入（图片/坐标/REJECT 拒收）均带 `ingest_run_id` 出生。**未来写入**的 run 级记录闭合；**727 张历史图**仍无 run（冻结数据，按拥有者指定留待数据生产） |
| B-04 | 执行报告"安全"段是硬编码字符串 | **已处置** | `abf4b67`（改真查询）+ `ceeb0c1`（三形态同源） |
| B-05 | 作业队列硬编码在 runner 里（65 个） | **已处置** | `11e6fe7`（生产注册表 + `guard:registry`） |
| B-06 | 跨批 `legacy_id` 规则不同（14 组重复 `file_path`） | **已处置** | `9e76c2d`（并集 `legacy_id` + 规范化 `file_path`） |
| B-07 | 图片批次由临时脚本执行，绕过 `mohen-visual-asset` 的用途/权利判定 | **部分处置** | 图片作业在生产注册表标 `forbidden`（不调度）；`jobImages` 已内联 eligibility gate（R15）+ 三分 HOLD（M2 第四条），用途/权利/分诊判定在代码层落实，但**非显式走 `mohen-visual-asset` Skill 协议**。机制兜底已就位，Skill 显式接线为非阻塞项，与 **C 组解禁**绑定（解禁时再定"runner 显式走 Skill"与否） |
| B-08 | `SOURCE_REGISTRY` 不存在 | **已处置** | `source-providers.json` 已建（17 个 provider、5 项分级裁定 `6a425e2`）；运维表 10 个 provider 的 `ops_status: todo` 于 `1ef9823` 全部补齐为 `documented`，守卫强制校验三项运维字段（`guard:source-gate` 现 ops_todo=0） |
| B-09 | `source-providers.json` 无人读，且键与真库对不上 | **已处置** | `ee1b0ad`（`normalizeProvider` + `source-gate.mjs` + `guard:source-gate`） |
| B-10 | `SHL-LEGACY-COORDS` 240 行零证据零置信 | **未处置** | 属**数据处置**；归入**下一步数据生产**（拥有者 2026-10-02 指定） |
| B-11 | 519 张写死 `depicted_period='现代影像（非历史）'` | **部分处置** | 脚本已修（`9e76c2d`：显式写 `pending_heritage_review`）；**既有数据未处置** → 冻结 |
| B-12 | 无批次白名单、无采集范围（Commons 坐标半径补抓、金泽仅占 6.5%） | **已处置** | `e191f22`（M4.2 采集意图登记 + `guard:acquisition`；**269 行来源全部命中唯一已声明批次**） |

**机制（M1–M4，外加 M5 搁浅）**

| 机制 | 完成度 | 证据 / 缺什么 |
|---|---|---|
| **M1** Registry 强制入口（B-05） | ✅ **完成** | `11e6fe7`；位置按更名后结构迁至 `specs/data-production/production-registry.json`（**19 字段是 §4 所列 13 字段的超集**）；`4721a95` 更名 night→unattended；`b039621` preflight |
| **M2** Gate / HOLD 数据库层强制（B-01/B-02） | 🟡 **~75%** | 前三条由 **R15**（`777436a`）完成：`eligibility_status` 默认 `pending_review` + 触发器 + 视图按状态过滤。**第四条 `review_queue` AUTO/HOLD/REJECT 三分未做** |
| **M3** 执行报告改真查询 + 三结论（B-04） | ✅ **完成** | `abf4b67` + `ceeb0c1`（`report.json`/`report.html`/`result.md` 同源）；`71db725` 补「最近一次图片门禁审计时间」 |
| **M4** 采集意图 + 门禁接线（B-08/B-09/B-12） | 🟡 **~80%** | `ee1b0ad`（M4.1）+ `e191f22`（M4.2）；**缺 B-08 的 provider 运维表**（10 个 `ops_status: todo`） |
| **M5** 现有 1246 张处置 | 🔒 **搁浅** | 拥有者指定；见 §8.3 |

**结论**：整张地图**只剩两处没做完** —— **M2 第四条**（`review_queue` 三分）与 **M4 的 provider 运维表**。

### 8.2 各升级项（ESC）的详细进展

> 本节内容原先累积在 `CURRENT.md` §9，2026-10-02 按职责归位**迁移至此**；`CURRENT.md` §9 只留状态与指针。

**ESC-01｜宪法对象命名与真库物理命名分叉** — 已升级为正式提案 `RECON-02`（一页格式，含方案 A/B/C 与"请你回答什么"）。

新查明的三件事：
1. **这不是一个分叉，是四件事，只有前三类是"命名差"** ——
   甲纯复数/缩写差（`entity`→`entities`、`ingestion_run`→`ingest_runs`）·
   乙加领域前缀（`event`→`cultural_events`、`change`→`historical_change_records`）·
   丙改名/去后缀（`claim_evidence_link`→`claim_evidence`、`human_review`→`human_review_decisions`）；
   **丁类是结构分裂**（`historical_space_claim` **拆成 5 张表**；`relation_claim` **双存储＝ESC-02**），**改名解决不了**。
2. **宪法并未强制过物理名** —— C3 §6.1 自称「当前最小核心表集（**建议** 18 张以内）」；且宪法内部本就不一致
   （§2.2 用 snake_case 单数 `evidence_fragment`，§2.3 用 CamelCase 概念 Entity / Event）。
   故"以宪法为准重命名表"不是恢复宪法，而是**先把建议升格为强制**。
3. **真库有、宪法未逐条列的 8 张**：`claims`、`evidence`、`relations`、`relation_evidence`、
   `evidence_gate_audit`、`review_queue`、`knowledge_paths`、`knowledge_path_steps`、`legacy_mappings`。
   真库实测共 **28 张表 + 1 个视图**。

**病根**：宪法与真库之间**没有唯一对照** —— 唯一对照是**活在脚本里的数组**（`scripts/gen-schema-diff.mjs` 的 `G`/`EXTRA`）。
**处置**：待拥有者裁定 A/B/C（建议 A：把"概念名 ≠ 物理名"固定成设计，物理名集中登记到 `specs/DATA_CONTRACT.md` + 守卫；不改表名、不迁移、不动数据）。

**ESC-02｜双 relation 存储（同源风险）** — 待裁决。
- **现象**：`relations`（001；旧记 365 行，**2026-10-02 实测 521 行**，计数已过期）与 `cultural_relation_claims`（008，**8 行**）并存；宪法假设单一 relation 模型。
- **影响**：Agent 可能读到两份不一致的关系表述。
- **待裁决**：收敛为单一 relation 真源，或在 C3 明确两者分工与优先级。**属核心对象模型，须拥有者确认。**

**ESC-03｜`modern_location` 缺口与现代坐标落位方式** — 待裁决（自 2026-09-26 停在待拍板）。
- **现象**：`modern_location` 表未建（`open_question` / `external_node` 同样未建）。老库 3308 实体中仅部分带坐标；已落位者走 `historical_feature_anchors`。
- **冲突点**：该表触及「现代坐标 ≠ 历史位置」红线。仓内两份产物口径不一致 —— `NIGHT-BATCH-LEGACY-PORT` 主张"无该表、以 anchors 承载反而更合规"，而 `SCHEMA-DIFF-20261002` 仍列为 **P1 缺口**。
- **待裁决**：正式确认「以 anchors 承载现代坐标」为终局（则回写 C3 并结案），或立项建表。

**ESC-04｜`visual_assets` 缺正面资格字段（图片污染的根因）** — **机制部分已由 R15 解决；数据处置部分冻结**。
- **现象**：图片表原本没有"资格/状态"字段；唯一语义是 `eligibility_tags` 的**反向排除名单**（默认 `'{}'` ＝可用）；`quality_score` 1288/1288 全 NULL；表上 0 触发器；夜跑 INSERT 不写该列 → 新增图片**无条件"可用"**。
- **已发生后果**：20 条人工排除被同 URL 重灌洗掉（其中 19 条是"金泽**火车站**"高铁列车照）；341/519 图片与金泽无关；30 条非图片（`.djvu`/`.webm`）标为 `image`；727 张 provenance 错位；23 张 HTTP 死链入库。
- **机制处置（R15，`777436a`）**：新增 `eligibility_status`（默认 `pending_review`）+ 触发器（`gate_passed` 必须有门禁记录，**照 `claims_require_evidence` 先例**）+ 视图按状态过滤 + `guard:promotion`（只读）。
  迁移前后 `effective_visual_assets` **均为 8 行** —— **一行未动，行为不变**。
- **全库核对（拥有者追问「是否所有原始资料都涉及」）**：28 张表分四组 ——
  甲组 9 张落库默认 `candidate`（本不算可用）· 乙组 10 列无默认值（写入须显式声明）·
  **丙组仅 2 张**（`visual_assets`/`visual_entity_links`）用"空排除名单＝可用"，是**全库唯一的"默认可用"形态**· 丁组默认安全。
  **全库晋级闸门触发器只有 4 个**（`claims_require_evidence` / `discovery_not_publishable_guard` / `review_queue_tier_c_guard` / `vel_confirmed_requires_evidence`）。
  → **图片层是唯一例外，它没跟上已有先例**。
  **另有三项普遍缺口**：① 状态表达有 **8 种**写法（C3 §4.1 只定义一套）；② 没有"通用晋级"闸门；③ `verification_status` 8 个值实测**只用 2 个**（`verified`/`published` 全库 0 行），`evidence_gate_audit` 只覆盖 **7 类对象**（`cultural_*` 全未覆盖）。

**ESC-05｜测试失败暴露的库层不变量违反** — 部分处置。
- **实测**：`pnpm test` 由 `17 failed | 236 passed`（隔离前）变为 `21 failed | 232 passed`（隔离开启后）。
- **性质判定**：这些**不是陈旧测试，而是真实性的探测器** —— 断言的库层不变量在当前库中**确实被违反**。**不得通过修改断言让它们变绿。**
- **② 测试写库隔离 —— 已完成**（`402d9e6`）：新增 `scripts/test-isolated.mjs`（`pnpm test` ＝在 `<真库名>_test` 上跑，真库按构造不被触碰）+ `tests/setup/db-guard.ts`（入口拒绝非 `_test` 库）。
  **实测**：真库 `evidence_gate_audit` 计数跑前跑后**完全一致**；测试把 **38,482 行**写进了**测试库**（48108 → 86590）。
- **① 28 条非图片误用 HR-5 标签 —— 待裁决**：修法只有一行（把这 28 条的 `excluded_from_heritage_primary` 换成 `non_image`），但改动对象属被冻结的那批资产 → **随冻结一并暂停**。
- **③ 其余失败的归属 —— 待裁决**。隔离开启后失败数由 17 升为 21，原因是测试跑在**跑测试之前的快照**上，从而暴露**真库早被此前的测试运行污染**（断言描述的是正确状态）。逐类归因：测试自增型（G3 fail 期望 15、实测 30，恰 2 倍）· 夜跑污染型（`entities` 3323 / `relations` 358 / `historical_feature_anchors` 240 / `historical_features` 245）· 环境型（旧仓 `hushang-jingwei` 工作树 `data/seed.master.json` 处于 `M` 状态）。

### 8.3 🔒 冻结项与冻结规则

**冻结（拥有者 2026-10-02）**：现有 **1246 张夜跑图片的数据处置** ——
727 provenance 纠正 · 341 张内容可疑图处置 · 门禁 `fail` 对象清退 · `quality_score`/实体关联等数据清理 ——
**一律暂不做**（不清理、不排除、不删除；保留在库中）。

**冻结规则**：
- 这些**不是待办事项**。只有拥有者**主动提出**才重新讨论。
- 开发平台**不得主动重提、不得当论据、不得把它们计入"未解决数量"**。
  （2026-10-02 教训：开发平台曾拿"1246 图片从未进 `review_queue`"当论证材料，等于把已冻结的事重新拖回桌面。）
- **机制类工作不受此限** —— 因为它们改变的是"**未来**写入如何被分诊"，**不触碰任何既有图片**。
  证据：R15 实施前后 `effective_visual_assets` 均为 **8 行**。
- ★ 口径备注（仅冻结解除后才需处理）：`evidence_gate_audit` 中 `result='fail'` 的**独立对象**实测 **3364**，
  与旧记"109 个"**口径不同**，届时须先对齐再定处置。

**M5 搁浅**（拥有者原话）：现有 1246 张"全部不要都不可惜"；待机制成熟后再决定整体置 `excluded`（保留审计、不删除）或连 Raw 快照一并清出主库。

### 8.4 当前未解决清单（机制线）

> **计数口径**：**不含已冻结项**（那 4 项图片数据处置不计入）。
> **2026-10-02 修正**：此前一次盘点误报为 25 项，实为 **21 项**（多算了 4 个冻结项）。

| 组 | 项数 | 内容 |
|---|---|---|
| **A 待拥有者裁定** | 4 | `RECON-02`（命名分叉 A/B/C）· `ESC-02` 双 relation 存储 · `ESC-03` `modern_location` 终局 · `ESC-05` ①③ |
| **B 规则立了、未落地** | 3 | R15 第二批（其余 **6 张表**补晋级强制，现只有只读监控）· **8 种状态表达**收敛 · 门禁审计覆盖 `cultural_*` |
| **C 被 A/B 阻塞的功能** | 2 | **图片作业解禁**（`images-*` 现标 `forbidden`）· **坐标作业解禁**（`coords-*`，需坐标侧 HOLD 机制） |
| **D 宪法列为缺口/延后的对象** | 7 | `source_version` · `external_node` · `open_question` · `modern_location`（＝ESC-03）· `evidence_assessment`（语义拆散）· `world_projection`/`story_seed`/`agent_context_view` · `geometry_claim`/ExperienceState/L6-L7 |
| **E 真库既有脏数据（非冻结部分）** | 2 | `evidence_gate_audit` 48108 行中约 **38k** 为测试所写（已止血、未清理）· `entities.canonical_name` **367 组**重名未做 resolution |
| **F 文档陈旧（本次已修）** | 3 | §9 计"4 项"实为 5 · `ESC-02` 的 `relations` 365→**521** · `ESC-04` 的"109 个 fail 对象" vs 实测 **3364**（口径待对齐） |

**按性质分**：**持续产生新问题的**＝ A 组 `RECON-02` + B 组三项 + C 组两项（命名分叉每加一张表就多一处；状态表达不统一每写一个脚本就多一种；作业因此无法安全解禁）；
**停在那里的旧账**＝ D、E 组。

### 8.5 下一步（按地图，而非按最新问题）

1. **M2 第四条**：`review_queue` AUTO/HOLD/REJECT 三分（＝ B-02 的正解，也是 C 组解禁的最后一块）。
   **方案已在 §4 M2 写好，无需重新发明。** 注意：它属**机制类**，不在冻结范围。
2. **M4 收尾**：B-08 的 provider 运维表（10 个 `ops_status: todo`）。
3. **B-03 / B-07 复核（2026-10-02 完成）**：B-03 已处置（`ingest_runs` 登记全路径落实，见 `c189e5a`）；B-07 仍部分处置——图片作业 `forbidden` + `jobImages` 内联判定就位，Skill 显式接线转 **C 组解禁**裁定。
4. **A 组 4 项待拥有者裁定**（其中 `RECON-02` 建议方案 A）。
5. **老数据问题不在此处理** —— 拥有者 2026-10-02 指定：**放到下一步"数据生产"里解决**。

### 8.6 冻结边界（本任务的边界声明）

**本任务只解决"机制"问题，不解决数据库里老数据的问题。**
老数据（1246 张及其派生指标、`SHL-LEGACY-COORDS`、重名、审计污染等）**一律留到下一步数据生产**处理。

