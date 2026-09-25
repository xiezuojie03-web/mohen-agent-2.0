# GOV-DIR-AUDIT-01 Result — Repository Directory & Governance SOT Audit

- 模式: READ-ONLY AUDIT · NO FILE MOVE · NO RENAME · NO DIRECTORY CHANGE · NO PRODUCT CONSTRUCTION
- 前置: ENG-GOV-01 = PASS / CLOSED @ `7f786c9`
- 日期: 2026-09-25
- 本 Result 是本任务唯一产出；未创建/删除/移动/重命名任何目录或文件，未 commit，未改任何治理文件。

---

## 01 Executive Summary

对 `mohen-agent-2.0` 仓库完成一次真实文件目录与治理 SOT 审计。核心结论：

1. **L1/L2 SOT 均已落在 `governance/` 且 tracked**（V4.9 Roadmap + PHASE-II Execution-Plan V1.0，commit `91edbc9` 2026-09-25 明示 SOT）——SOT 主干清晰，**不存在平行真源冲突**。
2. 发现 **4 项 ambiguity / 不一致**（无一项是产品风险）：①CURRENT_TASK/CONTEXT 指针滞后（ENG-GOV-01 已 CLOSED 仍标 CURRENT）；②V4.8 旧 Roadmap 与 V4.9 平放于 governance/，无 superseded 标记；③Task Book 的 tracked 政策不一致（早期全 tracked，最近 3 份 untracked）；④**架构级 Candidate/Backlog 无规范位置**。
3. 三个待归档文件：两个有 existing-compatible destination（`governance/`），一个（Architecture-Candidate-Backlog）**NO EXISTING CANONICAL DESTINATION**。
4. 第 09 节为 Recommendation，本任务无权执行。

## 02 Canonical Repository Directory Tree

真实存在的目录（`ls` 实测，非"应该有"）。大代码目录只展开 1–2 层，治理目录展开到文件级（见 §03）。

```
mohen-agent-2.0/                    ← repo root（独立 git，分支 track/world-cultural-world-02）
├── CONTEXT.md                      ← 会话上下文 / 指针（root，tracked）
├── README.md                       ← 入口说明（root，tracked）
├── PACKAGE_MANIFEST.json / package.json / pnpm-workspace.yaml / pnpm-lock.yaml
├── vitest.config.ts / playwright.config.ts
├── .env.example / .env.local(gitignored) / .gitignore / .gitattributes
├── apps/                           ← Web Shell
│   └── web/  (app/ lib/ data/ .next/ node_modules/)
├── packages/                       ← workspace 包（6 个 tsconfig）
│   ├── agent-runtime/  data-access/  domain/
│   ├── experience-engine/  ui/
├── pipelines/                      ← 数据/经验管线（build / cultural-world / evidence /
│   │                                  experience / extract / historical-spatial /
│   │                                  ingest / normalize / review / visual / weave）
├── data/                           ← exports/（任务交付报告、CSV、JSON 快照；gitignored 大件除外）
├── supabase/  (migrations/)
├── tests/                          ← vitest 机器验收
│   ├── data/      (8 个 .test.ts，DB 集成)
│   ├── experience/(8 个 .test.ts)
│   └── e2e/       (Playwright)
├── scripts/                        ← guard / db / e2e 捕获等运维脚本
├── skills/                         ← 10 个 mohen-* 可执行 SOP（各含 SKILL.md）
├── test-results/                   ← 空（Playwright 输出目录）
├── legacy/                         ← manifests/（老工程只读迁移）
├── governance/                     ← ★ 治理文档（L1/L2/Gate/EXP 契约，见 §03）
│   └── experience/
├── specs/                          ← ★ 当前稳定契约（6 份 .md）
├── decisions/                      ← ★ ADR（2 份）
└── tasks/                          ← ★ 任务层（Task Books + CURRENT_TASK.md + results/）
    └── results/                    ← ★ 31 项 Result/证据附件
```

## 03 Governance File Inventory

逐文件实测（role / current-or-history / tracked-or-untracked）。tracked 状态以 `git ls-files` / `git status` 为准（2026-09-25）。

### Level 1 / Level 2 / Phase Gate（governance/）
| repo path | role | 状态 | tracked |
|---|---|---|---|
| `governance/墨痕_Agent_2.0_总体架构与改造路线图_V4.9_三层计划治理与Phase-II-M3同步版.docx` | **L1 Architecture Roadmap（现行 SOT）** | current | tracked（91edbc9） |
| `governance/墨痕_Agent_2.0_PHASE-II_Canonical-Experience-Productization_Execution-Plan_V1.0.docx` | **L2 Current Phase Execution Plan（现行 SOT）** | current | tracked（91edbc9） |
| `governance/墨痕_Agent_2.0_总体架构与改造路线图_V4.8_Cultural-Relation-Contract与World-Object-Model版.docx` | L1 前版 | **history（未标记 superseded，与 V4.9 平放）** | tracked（6947c55） |
| `governance/墨痕_Agent_2.0_PHASE-GATE-01_Phase-I-to-II_Architecture-Gate_V1.0.md` | Phase Gate（I→II 架构门） | current（已通过的门文档） | tracked（83d7fed） |
| `governance/experience/EXP-DESIGN-01-Final-Decision-and-Experience-Transformation-Contract-V1.0.docx` | Experience 域治理契约 | current | tracked（83d7fed） |

### ADR（decisions/）
| repo path | role | 状态 | tracked |
|---|---|---|---|
| `decisions/ADR-001-greenfield-local-first.md` | ADR（Greenfield local-first） | current | tracked（5ada7c9，Phase 0） |
| `decisions/ADR-002-cultural-world-claim-epistemic-model.md` | ADR（Claim 六值认识论映射） | current | tracked（becf1b3） |

### Specs / Contracts（specs/）
| repo path | role | 状态 | tracked |
|---|---|---|---|
| `specs/FOUNDATION.md` | 不可轻改原则 | current | tracked（check-structure 强制） |
| `specs/DATA_CONTRACT.md` | 数据契约 | current | tracked（同上） |
| `specs/AGENT_CONTRACT.md` | Agent 契约 | current | tracked（同上） |
| `specs/EXPERIENCE_CONTRACT.md` | Experience 契约 | current | tracked（同上） |
| `specs/SOURCE_REGISTRY.md` | 源登记契约 | current | tracked（同上） |
| `specs/OWNERSHIP_MAP.md` | 目录职责与禁止事项 | current | tracked（同上） |

### 指针 / 入口（repo root + tasks/）
| repo path | role | 状态 | tracked |
|---|---|---|---|
| `CONTEXT.md` | 会话上下文 + Prior task 状态册 | current（**指针滞后**，见 §06-1） | tracked |
| `README.md` | 仓库入口（5 个必读入口 + 验收 + 文档纪律） | current | tracked |
| `tasks/CURRENT_TASK.md` | 当前唯一任务指针 | current（**指针滞后**，见 §06-1） | tracked |

### Task Books（tasks/）
| repo path | 状态 | tracked |
|---|---|---|
| `tasks/TASK-0001…0017`（17 份 .md，含 0009/0014 V1.1） | history（已执行） | tracked |
| `tasks/EXP-0001-Human-Experience-Translation-Slice-V1.0.md` | history（已执行） | tracked |
| `tasks/EXP-0002-Persistent-Experience-Transformation-Slice-V1.0.docx` | 已授权未开工（EXP 轨道） | tracked |
| `tasks/EXP-MAP-01_金泽CanonicalExperience产品化映射_V1.0.docx` | history | tracked |
| `tasks/CULTURAL-WORLD-01A/01B/01C_*.docx`、`tasks/CULTURAL-WORLD-02_Taskbook_V1.0.docx` | history | tracked |
| `tasks/EXP-CULTURAL-01_…Task-Book_V1.0.docx` | history | tracked |
| `tasks/EXP-CULTURAL-02_M3.3_…Task-Book_V1.0.docx` | history | **untracked** |
| `tasks/EXP-CULTURAL-03_M4.1_…Task-Book_V1.0.docx` | history | **untracked** |
| `tasks/ENG-GOV-01_…Task-Book_V1.0.docx` | history（PASS/CLOSED） | **untracked** |

### Task Results（tasks/results/，31 项）
| repo path | 状态 | tracked |
|---|---|---|
| `tasks/results/TASK-0001…0017-result.md`（含 TASK-0015-FIX） | history | tracked |
| `tasks/results/EXP-0001-result.md`、`EXP-CULTURAL-01/02/03-result.md`、`ENG-GOV-01-result.md` | history | tracked |
| `tasks/results/CULTURAL-WORLD-01A/01B/01C_*_REPORT.md`、`CULTURAL-WORLD-02-result.md` | history | tracked |
| `tasks/results/GOV-01_READONLY_INVENTORY_REPORT.md` | history（此前只读盘点） | tracked |
| `tasks/results/cw02-cluster-snapshot.json`、`exp-cultural-03-runtime-evidence.json`、`foundation.png` | **证据附件（非 Result 文本）** | tracked |

### 其他 architecture / roadmap / phase / candidate / backlog 类文件
| repo path | role | 状态 |
|---|---|---|
| `data/exports/jinze-manual-acquisition-backlog.csv` | **数据层**人工采集 backlog | current |
| `data/exports/jinze-discovery-candidates.md` | 数据层 discovery 候选 | current |
| `data/exports/jinze-map-breakthrough-candidates.md` | 数据层地图候选 | current |
| `data/exports/jinze-*-readiness.md`（多份） | 任务级 readiness 判定 | history/current |
| —（governance/ 下） | **架构级 Candidate/Backlog：不存在** | — |

## 04 Current SOT Map

| 问题 | 实际答案（依据） |
|---|---|
| L1 SOT 放在哪 | `governance/墨痕_Agent_2.0_总体架构与改造路线图_V4.9_三层计划治理与Phase-II-M3同步版.docx`。依据：commit `91edbc9` 提交信息明示 "SOT=V4.9/PhaseII-Plan/…"；governance/ 内无更新版本 |
| L2 SOT 放在哪 | `governance/墨痕_Agent_2.0_PHASE-II_Canonical-Experience-Productization_Execution-Plan_V1.0.docx`（同上 commit） |
| Task Book 规范位置 | `tasks/`（TASK-0001 起全部在此；命名已收敛为 `<任务号>_<主题>_<版本>`） |
| Result 规范位置 | `tasks/results/`（31 项全部在此，含证据附件） |
| ADR 规范位置 | `decisions/`（`ADR-<序号>-<主题>.md`；OWNERSHIP_MAP 定义职责=「重大架构变更理由，禁止操作 SOP」） |
| specs 与 governance 分工 | `specs/` = 当前稳定契约（6 份，check-structure.mjs 强制存在，OWNERSHIP_MAP：「当前稳定契约，禁止过程记录」）；`governance/` = 会随版本推进被取代的计划/门/路线图类文档（V4.8→V4.9、Phase Gate、EXP 域契约）。分工实际成立：specs 稳、governance 演进 |
| Candidate/Backlog 规范位置 | **架构级：不存在**。只有数据层 candidate/backlog（`data/exports/` 的 CSV/MD），无架构级对应物 |
| 是否存在重复/冲突/无法判断的 SOT | 无平行真源冲突；存在 4 项 ambiguity，见 §06 |

## 05 Directory Responsibility Map

| 目录 | 实际承担的职责（由内容反推） | OWNERSHIP_MAP 是否定义 |
|---|---|---|
| `governance/` | L1/L2/Phase Gate/域契约等**高层治理文档**（会演进、会被新版本取代） | ⚠️ **未定义**（OWNERSHIP_MAP 表中无 governance 行——目录晚于该表建立，属规则缺口） |
| `specs/` | 当前稳定契约 | ✓（「当前稳定契约，禁止过程记录」） |
| `decisions/` | ADR | ✓（「重大架构变更理由」） |
| `tasks/` + `tasks/results/` | Task Book + Result | ✓（「当前可验收工作单，禁止长期知识」） |
| `data/exports/` | 任务交付报告/CSV/JSON 快照（数据层产物） | ⚠️ 未逐条定义（README 提及 data 原则） |
| `pipelines/`、`skills/`、`tests/`、`packages/`、`apps/`、`legacy/` | 与 OWNERSHIP_MAP 一致 | ✓ |

## 06 Duplicate / Ambiguous Governance Findings

**只报告，不整改。** 按严重度排序：

1. **指针滞后（低风险，随下一任务自然修复）**：ENG-GOV-01 已 PASS/CLOSED @ `7f786c9`，但 `tasks/CURRENT_TASK.md` 仍为 "See tasks/ENG-GOV-01…docx"、`CONTEXT.md` current task 行仍标 ENG-GOV-01 为 **CURRENT**（未降为 Prior）。ENG-GOV-01 Task Book §11 规定 commit 只含授权文件，指针轮转未被授权 → 属流程内已知滞后，**Architect 下发下一任务时须同步轮转两处指针**。
2. **V4.8 未标记 superseded**：`governance/` 内 V4.8 与 V4.9 平放，仅凭文件名可辨新旧；README 文档纪律「Git 保存历史」暗示旧版可留在 git 历史而非目录，但两者矛盾——当前实际是"平放"而非"归档"。未来 V4.10/Governance-Sync 入库时需要统一处置规则（替换删除 / _superseded 后缀 / history 子目录，三选一由 Architect 裁决）。
3. **Task Book tracked 政策不一致**：2026-09-25 前的 Task Book 全部 tracked；EXP-CULTURAL-02/03、ENG-GOV-01 三份 docx untracked（ENG-GOV-01 §11 "允许提交授权文件"被从窄解读为不含 docx）。同一类文件两种入库先例并存，**无规则规定 docx Task Book 是否入库**。
4. **架构级 Candidate/Backlog 无规范位置**：OWNERSHIP_MAP 与 check-structure 均未定义；三个待归档文件中的 Backlog 因此无自然落点（见 §07-3）。
5. **`tasks/results/` 混放证据附件**（快照 JSON/PNG 与 Result 同级）：可读性尚可、量小（3 项），登记为观察项，不构成风险。
6. **governance/ 职责未写入 OWNERSHIP_MAP**（见 §05）：目录存在且承担 L1/L2，但"什么该进 governance/"无成文规则。

## 07 Three Pending Files — Existing Destination Candidates

三个文件经全工作区深度搜索（含 mohen-2-draft/、mohen-agent-2.0-exp/、桌面）**均不在本机工作区内**，由 Architect/用户侧持有。以下仅报告 repo 内 compatible destination，**本任务未复制/创建任何文件**：

1. **`MoHen_Agent_2.0_Roadmap_V4.9_Governance-Sync.docx`**
   → existing-compatible destination: **`governance/`**（L1 V4.9 现行版已在此）。
   ⚠️ 归档裁决要点：与既有 `…V4.9_三层计划治理与Phase-II-M3同步版.docx` 的关系（同一文件的 Governance-Sync 重命名版？还是更新修订？）必须先判定；若为替代，须同步处置旧文件的 superseded 语义（见 §06-2）。

2. **`MoHen_Agent_2.0_PHASE-II_Execution-Plan_V1.1.docx`**
   → existing-compatible destination: **`governance/`**（V1.0 已在此，V1.1 为其直接继任；归档时须处置 V1.0——同 §06-2 规则）。

3. **`MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`**
   → **NO EXISTING CANONICAL DESTINATION**。
   说明：repo 无架构级 backlog 角色的任何先例（数据层 backlog 在 `data/exports/`，语义不同；specs/ 禁过程记录；decisions/ 只收已裁决策）。最接近的同族目录是 `governance/`（同为架构治理文档），但"backlog"从未被定义为 governance/ 的合法角色——按任务书要求如实报告 **NO EXISTING CANONICAL DESTINATION**，`governance/` 仅可作为 fallback 候选供 Architect 裁决（若采纳，建议同步把该角色写入 OWNERSHIP_MAP）。

## 08 Relevant Git History

治理结构的正式调整均有 Architect Task 对应的 commit（非顺手改动）：

| commit | 日期 | 内容 | 结构意义 |
|---|---|---|---|
| `5ada7c9` | 2026-09-21 | Phase 0 脚手架 | **长期稳定结构一次建立**：specs/ 6 份、decisions/ADR-001、tasks/（含 results/）、tests/、packages/、apps/、pipelines/、legacy/、supabase/、scripts/check-structure.mjs |
| `9afced1` / `8981af7` | 2026-09-21 | TASK-0001/0002 Result | 确立 `tasks/results/<任务号>-result.md` 命名惯例 |
| `83d7fed` | 2026-09-23 | freeze Phase II experience baseline | **正式新增** `governance/`（PHASE-GATE-01 md）与 `governance/experience/`（EXP-DESIGN-01 契约） |
| `6947c55` | 2026-09-25 | baseline 治理与任务输入文档 | V4.8 Roadmap docx 入 governance/ |
| `becf1b3` | 2026-09-25 | ADR-002 | decisions/ 第二份 ADR |
| `91edbc9` | 2026-09-25 | Phase II 三层计划治理同步 | **V4.9（L1）+ PHASE-II Plan V1.0（L2）入库并明示 SOT**——即当前 L1/L2 的确立 commit |
| `87bb56d` / `2a875f7` / `7f786c9` | 2026-09-24/25 | CW-01A–C / EXP-CULTURAL-01 / ENG-GOV-01 Result 归档 | results/ 持续按惯例追加 |

**废弃/遗留结构判定**：无已废弃但残留的治理目录。观察项：`test-results/`（空，Playwright 输出，非治理结构）；governance/ 内 V4.8 为被取代版本仍平放（见 §06-2）。

## 09 Recommended Canonical Directory Map

> **仅 Recommendation，无修改权限。** 与现状 95% 一致，目的是给 Architect 一张可直接引用的归属表。

| 角色 | Canonical 位置 | 入库规则建议 |
|---|---|---|
| L1 Architecture Roadmap（现行版） | `governance/` | tracked；新版本入库时旧版处置规则须统一（见 §06-2 三选一） |
| L2 Phase Execution Plan（现行版） | `governance/` | 同上 |
| Phase Gate 文档 | `governance/` | tracked（PHASE-GATE-01 为先例） |
| 域级治理契约（如 EXP-DESIGN-01） | `governance/<域>/`（先例 `governance/experience/`） | tracked |
| 架构级 Candidate/Backlog | **现状无位置**；若设立，建议 `governance/` + 写入 OWNERSHIP_MAP 一行（唯一职责=「架构候选与待裁事项；禁止已裁决策与操作 SOP」） | 待 Architect 裁决 |
| ADR | `decisions/ADR-<序号>-<主题>.md` | tracked |
| 稳定契约 | `specs/*.md` | tracked，check-structure 强制 |
| Task Book | `tasks/<任务号>_<主题>_<版本>.{md,docx}` | **建议统一 tracked**（多数先例如此；untracked 先例仅最近 3 份）——待 Architect 裁决 |
| Task Result | `tasks/results/<任务号>-result.md`；机器证据附件同目录（现状可接受） | tracked |
| 当前任务指针 | `tasks/CURRENT_TASK.md` + `CONTEXT.md` current 行（**两处必须同步轮转**） | 随任务下发 commit |
| 数据层产物报告/backlog | `data/exports/`（维持现状，勿与架构级 Backlog 混淆） | 按现有 gitignore 规则 |
| 域级 EXP 轨道副本 | （外部）`mohen-agent-2.0-exp/`——与本 repo 的 governance/ **不共享 SOT**，其 governance/ 仅含 PHASE-GATE-01 + experience/，审计范围外仅此一条记录 | — |

## 10 Architect Decisions Required

1. **三个待归档文件的位置裁决**（§07）：前两个建议 `governance/`；Backlog 明确 NO EXISTING CANONICAL DESTINATION——是否在 governance/ 设立该角色（并同步 OWNERSHIP_MAP）请裁决。
2. **旧版治理文档处置规则**（§06-2）：替换删除 / `_superseded` 后缀 / history 子目录，三选一；V4.9-Governance-Sync 与既有 V4.9 的关系（同一文件？新修订？）请先判定。
3. **Task Book docx 是否统一 tracked**（§06-3）：补规则或维持"逐任务在 Task Book §11 声明"。
4. **CURRENT_TASK/CONTEXT 指针轮转**（§06-1）：ENG-GOV-01 已 CLOSED，请在下发下一任务时同步轮转两处（或授权单独的指针轮转 commit）。
5. （可选）**OWNERSHIP_MAP 补 `governance/` 行**（§05/§06-6），使目录职责成文。

## 11 STOP

本审计 READ-ONLY 执行完毕：未创建/删除/移动/重命名任何目录或文件（唯一写动作 = 本 Result 文件），未 commit，未改动任何治理/代码/数据文件，未归档三个待归档文件，未开始 M4 Integration Closure Audit。
