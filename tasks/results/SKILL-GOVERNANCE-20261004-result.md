# SKILL-GOVERNANCE-20261004 · 数据生产 Skill 能力治理 · 执行结果

> **性质**：项目拥有者 2026-10-04 授权执行「数据生产 Skill 能力治理」任务书的完整记录（第 0–4 步）。
> **任务书**：`tasks/TASK-SKILL-20261004_数据生产Skill能力治理_Task-Book_V1.0.md`（唯一进展载体）。
> **治理决断**：`C0` §11 **R26**（C2 增补 Skill 实体化与复用铁律）。
> **边界**：只改契约 / 登记 / 文档 ＋ 少量脚本移动；**未动数据库、未动数据、未改 C0–C4 原则**；未自动晋级任何数据（R15 门禁不变）。
> **裁决方**：项目拥有者（C0 §11 R13，不设第三方裁决方）。

---

## 1. 执行摘要

把"每次数据生产重写脚本、攒下一大堆重复脚本"从**散文里的原则**变成**机器强制的既成事实**：

| 步骤 | 内容 | 状态 |
|---|---|---|
| 第 0 步 | C2 宪法基线（实体化 / 唯一权威实现 / 复用优先 / 三向绑定 / 重复即合并） | 完成 · R26 |
| 第 1 步 | 生产注册表 14 作业全绑 `implementation:{skill,entry}` ＋ 守卫第 ⑧ 项 | 完成 · 反证 4 类 |
| 第 2 步 | 5 生产技能补实体化档案 ＋ 新建 3 个 Discovery 技能 ＋ 结构交叉校验 | 完成 · 反证 2 类 |
| 第 3 步 | 14 个根目录一次性探针归档（R14）＋ 归档清单 | 完成 · 未登记根条目 14→0 |
| 第 4 步 | 「先查技能再写脚本」四步登记流程 ＋ 三处机器强制 | 完成 · 反证 1 类 |

**核心转变**：`skills/`（曾是纯文字）↔ `pipelines/`（执行体）↔ `production-registry.json`（作业清单）三者**首次打通并可互相查证**，且由三道守卫持续强制。

---

## 2. 第 0 步 · C2 宪法基线（决断 R26）

项目拥有者授权修改 C2。**C2 是"规则"，四步是"执行规则"——规则先立，四步才有宪法依据**（故提为前置第 0 步）。

| 位置 | 增补内容 |
|---|---|
| `C2 §2.1`（新增·冻结） | **Skill 实体化判定四条**（`SKILL.md` ＋ 固定 entry ＋ 契约化 ＋ 注册表登记 `implementation` 才算落地）；**唯一权威实现（canonical entry）**；**复用优先 / 禁止平行重复**（新增脚本前先查复用、重复即收敛并按 R14 归档）；**三向绑定**；未登记且不属任何 Skill 的新脚本不允许合入 |
| `C2 §3.1` | 每个 Skill 对应唯一权威实现；新增实现前先查复用；平行实现按 §2.1 收敛 |
| `C2 §9` | **重复即合并**（不新增第三个、也不并存，收敛为唯一权威实现，其余 R14 归档） |
| `C2 §9.1` | 最小合同扩为含 **Implementation**（三向绑定）/ **Reuse Source**（复用来源）/ **Merge·Deprecate**（合并·归档去向） |
| `C0 §11` | 登记为治理级决断 **R26**（含版本源唯一说明：内容增补、文件不改名，C2 维持 V1.1） |

---

## 3. 第 1 步 · 生产注册表三向绑定（地基）

`specs/data-production/production-registry.json`：**14 个作业全部**增 `implementation:{skill, entry}`；`schema_version 1→2`；`required_fields` 增 `implementation`（由守卫自动强制）。

| 作业（14） | Skill | 唯一权威 Entry |
|---|---|---|
| `src-*`、`coords-wikidata`、`unattended.source-refresh` | `mohen-data-ingest` | `pipelines/legacy/unattended-runner.mjs` |
| `unattended.evidence-fragment` / `.candidate-extraction` / `.deterministic-resolution` | `mohen-evidence-gate` | `pipelines/legacy/unattended-runner.mjs` |
| `unattended.relation-weave` | `mohen-knowledge-weave` | `pipelines/legacy/unattended-runner.mjs` |
| `unattended.gate-projection` | `mohen-project-guard` | `pipelines/legacy/unattended-runner.mjs` |
| `images-*` | `mohen-visual-asset` | `pipelines/legacy/unattended-runner.mjs` |
| `research.source-inventory` / `.content-observation` | `mohen-research-intake`（新建） | `pipelines/research/research-pipeline.mjs` |
| `research.mention-dependency` / `.association-scan` | `mohen-association-discovery`（新建） | `pipelines/research/research-pipeline.mjs` |
| `research.humanistic-selection` | `mohen-humanistic-selection`（新建） | `pipelines/research/research-pipeline.mjs` |

**守卫第 ⑧ 项**（`check-production-registry.mjs`）：`implementation` 必填且为对象；`entry` 真实存在；`skill` ∈ 已知集合（`skills/` 目录 ∪ C2 §3.1 候选）；**每个技能唯一权威 entry**。

> **设计修正（诚实记录）**：原设想守卫规则「一个 entry 不得被多 job 声明」**是错的**——`unattended-runner.mjs` 是单体 runner，合法服务 9 个作业。已改为 C2 §2.1 的正确规则「**每个技能一个权威 entry**」。

**反证（4 类违规均会红，注册表已还原）**：
- entry 指向不存在脚本 → 红；
- 未知 skill → 红；
- 同一 skill 两个不同 entry → 红；
- 缺 `implementation` → 红。

---

## 4. 第 2 步 · 技能实体化

- **5 个生产技能**补机器可读「实体化档案」（`Entry` ＋ 对应作业 ＋ Reuse Source ＋ Merge/Deprecate）：`mohen-data-ingest`、`mohen-evidence-gate`、`mohen-visual-asset`、`mohen-knowledge-weave`、`mohen-project-guard`。
- **新建 3 个 Discovery 技能 `SKILL.md`**（承认落地，`Entry`＝`research-pipeline.mjs`，标注 Discovery 模式 0 Truth 写入）：`mohen-research-intake`(D01/D02)、`mohen-association-discovery`(D03/D04)、`mohen-humanistic-selection`(D05)。
- **强化 `check-structure`**：交叉校验**注册表 ⇄ SKILL.md**——注册表挂了作业的技能必须有 `SKILL.md`（落地）且其 `Entry` 与注册表 `implementation.entry` 一致（防文档漂移 / 未落地）。
- **C2 §3.1 同步**：3 个技能由 CANDIDATE 改为「已落地（Draft·R26）」并标注 entry / 作业；`mohen-spatial-grounding` 无作业、保持 CANDIDATE。

**反证（2 类均会红，已还原）**：缺 `SKILL.md`（`SKILL_NOT_LANDED`）→ 红；`Entry` 漂移（`SKILL_ENTRY_DRIFT`）→ 红。

**`skills/` 目录数**：10 → **13**（`SKILL_FLOOR=8` 为下限，未撞红）。

---

## 5. 第 3 步 · 收敛重复脚本（R14 归档不删除）

**归档（机器已捕获的那批）**：根目录 **14 个一次性 DB 探针**（`_full/_gen_list/_probe/_probe2..5/_rebuild/_schema/_unlock/_v2/_v3/_v4/_verify.mjs`）。
- **依赖核查**：全仓检索确认**无任何活跃代码 import**；功能已被 `tools/production/probe-*.mjs`、`scripts/gen-schema-diff.mjs`、`scripts/gen-l0-schema-map.mjs` 及 `pipelines/` 正规执行体覆盖；仅历史运行日志提及脚本名。
- **处置**：按 R14 移入 `archive/20261004-root-probes/`（保留内容，未改写正文，未用 `git rm`），并按归档规则 4 产出**清单** `archive/20261004-root-probes/README.md`（原路径→归档路径→理由→取代者→被引用于）。
- **效果**：`check-structure-map` 未登记根条目 **14 → 0**（`root_entries 46→32`），此长期告警清零。

**遗留（5 类内部重复，本轮未做，需逐类核对后合并）**：
1. 库探针：根目录已归档，但 `tools/production/check-evidence-dupes.mjs`（查）与 `cleanup-dupe-evidence.mjs`（清）仍各自实现同一去重判定 → 抽共享。
2. 空间对齐三胞胎：`pipelines/historical-spatial/probe-align-{entities,extra,final}.mjs` 三份 `run()` helper 几乎逐字重复 → 参数化为 1。
3. e2e 脚手架 ×5：`scripts/e2e-*-capture.mjs` 共用同一套 `BASE/OUT/record/shot/next/clickBtn` → 抽公共 helper。
4. 去重双轨：同 1。
5. 证据恢复双轨：`pipelines/evidence/recover.mjs`（51KB）之外，`scripts/repair-polluted-runs.mjs`、`scripts/db-dedup-gate-audit.mjs` 又各做一遍污染修复 / 去重门禁。

> 这些在子目录、非"散落根脚本"，机器未报警；合并需逐类核对真实引用，**未在本轮冒险改动**，留作后续。

---

## 6. 第 4 步 · 「先查技能再写脚本」硬规矩

**新增任何数据生产脚本前，必须走四步**：① 先查注册表（该能力是否已有作业？entry 是什么？）→ ② 再查 `skills/<name>/SKILL.md` 实体化档案（是否已有可复用 Skill/Entry？）→ ③ 能复用就复用（在既有 Entry 加参数 / 加作业，不新建脚本）→ ④ 确属全新能力（新建 Skill ＋ 注册表登记 `implementation` ＋ 同步 `OWNERSHIP_MAP`；**禁止**根目录留一次性脚本）。

**三处机器强制（不依赖自觉）**：
- `guard:registry` 第 ⑧ 项——作业↔实现↔技能绑定、每个技能唯一 entry；
- `guard:structure` 绑定校验——技能落地 + Entry 防漂移；
- `guard:structure-map`——**根目录任何新 `.mjs` 都因未登记而红**（"不许散落脚本"闸门）。

**反证**：故意在根目录丢一个脚本 → `UNDECLARED_ROOT_ENTRIES` 红（exit 1）；移除后恢复 `undeclared=0`。

---

## 7. 守卫总览（执行后全绿）

| 守卫 | 结果 |
|---|---|
| `guard:docs` | `CURRENT.md 155/180`、`OWNERSHIP_MAP 170/170`、各 `SKILL.md ≤150` 全 OK |
| `guard:structure` | `skills=13 (floor 8)`、`skills_with_jobs=8`、绑定一致 |
| `guard:structure-map` | `undeclared=0`、`tree_missing=0`、`router_broken=0` |
| `guard:registry` | `schema=v2 entries=14 unresolved=0` |
| `guard:links` | `broken=0` |
| `guard:triage` / `guard:promotion` | `violations=0` |

---

## 8. 目标可达性（诚实结论，回应拥有者"能否实现数据底座建厚实"）

**四步本身不产任何数据，它是"使能器"。** 「把数据底座建厚实」＝ **四步（把数据生产修成可复用流水线）＋ 实际数据扩展（老项目深透 ＋ 外部扩源，产数据）** 两者配合。

- 四步解决**机制可持续性**：让后续扩源跑在可复用 Entry 上，而不是边扩边堆重复脚本——这**直接服务**目标，也是扩源的**必要前置**。
- **为何先做四步**：先扩源、后治理＝边扩边堆重复脚本，底座越厚越难维护；先修机器、再用修好的机器扩源才可持续。
- **两条线并行**：① Skill 治理（本任务书，修机器，已完成 0–4 步）；② 数据扩展（老项目深透 ＋ 外部扩源，产数据）。四步让 ② 跑在可复用流水线上。

---

## 9. 附录 A · 预存在守卫报错修复（2026-10-04，随 A 阶段）

执行第 0–4 步时发现 4 条**预存在**的守卫 stderr 报错（非本次改动引起），本阶段一并修复并验证：

| 守卫 | 原问题 | 修复 | 验证 |
|---|---|---|---|
| `guard:source-gate` | `hushang_legacy` 的 `defined_at` 指向已不存在的 C3 **V1.1** | `data/fixtures/source-providers.json`：指针更新为 C3 **V1.2** | `resolved=22 unknown=0` exit 0 |
| `guard:identifier` | `evidence.extraction_method` 有 1 个 DB 值 `unattended-N03` 未登记 | `identifier-registry.json` 增 `^unattended-` 前缀族（无人值守批次代号） | `uncovered=0` exit 0 |
| `guard:acquisition` | `hushang_legacy` 的 `image_source` 锚点批次未命中任何采集意图 | `acquisition-intents.json` 增 `hushang-legacy-image-anchor`（metadata_kind=image_source） | `resolved=304 unresolved=0` exit 0 |
| `guard:reconciliation` | RECON-02 状态 `已处置（…）` 不在白名单 | 改为 `已裁定` ＋ 补 `**裁定结果**` 行 | `decided=2` exit 0 |

> 均为登记/指针类修复，**未动真库数据**。

## 10. 附录 B · 5 类内部重复脚本：现状与风险分级（未合并，附建议）

执行第 0–4 步后，以下 5 类内部重复**仍存在**（在子目录，机器未报警，非"散落根脚本"）。本阶段**未冒险合并**，原因如下——它们触及**正在工作的**生产 / 测试代码，仓促重构可能破坏数据管线（恰与本任务目标相反）：

| 类 | 位置 | 风险 | 建议 |
|---|---|---|---|
| 空间对齐三胞胎 | `pipelines/historical-spatial/probe-align-{entities,extra,final}.mjs` | **低**（诊断探针，`run()` helper 逐字重复） | 可安全参数化为 1；先确认三者输出无差异 |
| e2e 脚手架 ×5 | `scripts/e2e-*-capture.mjs` | **低–中**（共用 helper，但 steps 各异） | 抽 `scripts/e2e/_harness.mjs`；需跑 Playwright 回归 |
| 去重双轨（查/清） | `tools/production/check-evidence-dupes.mjs` / `cleanup-dupe-evidence.mjs` | **中**（触及 evidence 去重正确性） | 抽共享判定模块；须比对两脚本判定结果一致后再合 |
| 证据恢复双轨 | `pipelines/evidence/recover.mjs`（51KB）/ `scripts/repair-polluted-runs.mjs` / `scripts/db-dedup-gate-audit.mjs` | **高**（触及 evidence 恢复 / 门禁完整性） | **建议单独一轮**：这是数据正确性核心，须配套 DB 回归，不可与文档治理同批做 |

> **结论**：低风险两类（探针三胞胎 / e2e 脚手架）可作为下一步独立小任务立即做；中高风险两类（去重 / 恢复）**必须配套真库回归**、单独一轮执行，不宜仓促。

## 附录 C · 低风险合并（探针三胞胎 → shl-probe.mjs · R26 唯一权威实现落地）

A-2 低风险第 1 类。空间对齐三胞胎 `pipelines/historical-spatial/probe-align-{entities,extra,final}.mjs` 三者**逐字复制** SPARQL 查询 helper（`find`/`run`）与属性打印，违反 C2 §2.1「每个能力唯一权威实现」。

- **做法**：抽唯一权威实现 `pipelines/historical-spatial/shl-probe.mjs`（导出 `sparql` / `subjectRows` / `printProps`）；三脚本改为 `import` 复用，**各自分析逻辑（TASK-0011 三步骤 S1-A4/A5/A6）与输出文件不变**，仅去掉重复 helper。
- **验证**：4 文件 `node --check` 全过；无残留对已删除函数（`find`/`dumpSubject`/`run`/`call`/`parseSparqlXml`）引用（仅剩 `Array.find` 合法）。
- **提交**：已并入 c033954。

## 附录 D · 提交（聚焦提交 c033954）

2026-10-04 于分支 `handoff/local-b-20260930` 执行 `git commit`，提交号 **c033954**，83 文件 +6578/-487，**本地未 push、未碰 main**。

- **范围（A1 聚焦）**：内聚单元 = Skill 治理（第 0–4 步）＋ 与之**不可分**的 R-DP 架构层（C2 V1.0→V1.1、C3 V1.1→V1.2 升版、research 执行体与研究表 migration、注册表 D01–D05、主协议/契约/命名映射、新守卫与运维脚本）。
- **排除**：40+ 数据运行 trace 产物（UNATTENDED / LR-ADS / SMOKE / WRITE-TEST / BRIDGE 等）仍留工作区未提交。
- **真库未动**；提交后守卫 14 道全绿。
- **未做的提交**：本结果文件的附录 C/D/E/F 增补、C 任务书与 CURRENT §7 指针更新，属本次"沉淀"动作，未纳入 c033954，仍在工作区（待你后续提交）。

## 附录 E · e2e 脚手架治理暂缓

A-2 低风险第 2 类（e2e 脚手架抽取）经摸底发现：实为 **7 个**脚本（非初判 5 个），结构有差异（部分带 `pageErrors`/console 监听、部分带 `INSPECTOR_QS`、`cur/next/clickBtn` helper 各异），且属 **Human Experience 验收脚本**，须跑 Playwright + dev server 方可验证。盲改 7 个验收脚本风险高、且无法本环境回归。

- **用户 2026-10-04 决定**：暂缓 e2e，先做 B（提交）。e2e 抽取（抽 `scripts/e2e/_harness.mjs` 共享 helper）留待**可跑 Playwright 的环境**再做。

## 附录 F · C-0 数据现状盘点（指向 C 任务书）

- 老项目源 `hushang-jingwei/data/` 共 **2596 文件**（2038 PDF、349 JSON、corpus / fetched / raw_snapshots）。
- **已落地**：仅 95 个 JSON 完成来源登记 ＋ Raw 快照（N01 搬运子集）。
- **最大缺口**：2038 PDF ＋ corpus **完全未抽取** → 无 Evidence / Candidate / Relation。此即"数据底座薄"根因。
- **机器状态**：无人值守执行模式已成立（runner 安全外壳 + 注册表闸 + 三分诊 + fail-closed），但 **N01–N06 六类生产作业尚未写成可运行代码**（差内容实现，非协议有洞）。
- **下一步**：见任务书 `tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md`（分 C1–C6 阶段，每阶段独立对话执行；完成提醒新开窗口）。

## 12. 变更清单（受影响文件）

- 宪法/治理：`governance/C2…V1.1.md`（§2.1/§3.1/§9/§9.1）、`governance/C0…V1.0.md`（§11 R26）。
- 状态/契约：`CURRENT.md`（§7 指针）、`specs/data-production/production-registry.json`（14 作业 ＋ schema v2）。
- 守卫：`scripts/check-production-registry.mjs`（第 ⑧ 项）、`scripts/check-structure.mjs`（绑定校验）。
- 技能：`skills/` 5 个补档案 ＋ 3 个新建 `SKILL.md`。
- 归档：`archive/20261004-root-probes/`（14 脚本 ＋ README 清单）；根目录 14 个 `_*.mjs` 移出。
- 探针合并：`pipelines/historical-spatial/shl-probe.mjs`（新增）＋ 3 个 `probe-align-*` 复用（附录 C）。
- 文档：`tasks/TASK-SKILL-20261004_…_Task-Book_V1.0.md`（本任务进展载体）、`tasks/results/SKILL-GOVERNANCE-20261004-result.md`（本结果）。
- 提交：`c033954`（本地，未 push）。

- 宪法/治理：`governance/C2…V1.1.md`（§2.1/§3.1/§9/§9.1）、`governance/C0…V1.0.md`（§11 R26）。
- 状态/契约：`CURRENT.md`（§7 指针）、`specs/data-production/production-registry.json`（14 作业 ＋ schema v2）。
- 守卫：`scripts/check-production-registry.mjs`（第 ⑧ 项）、`scripts/check-structure.mjs`（绑定校验）。
- 技能：`skills/` 5 个补档案 ＋ 3 个新建 `SKILL.md`。
- 归档：`archive/20261004-root-probes/`（14 脚本 ＋ README 清单）；根目录 14 个 `_*.mjs` 移出。
- 文档：`tasks/TASK-SKILL-20261004_…_Task-Book_V1.0.md`（本任务进展载体）。
