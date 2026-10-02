# GOV-R13 · 开发授权与权责归一（单线治理）— Result

- **任务**：GOV-R13（治理级 Architecture Reconciliation 落地）
- **性质**：授权主体归一 + 消除第三方裁决方绑定 + 顺带修复既有治理缺陷
- **执行**：开发总工程师
- **日期**：2026-10-01
- **授权依据**：项目拥有者 2026-10-01 **直接授权**——"授权你来进行后续开发，你可以根据这个授权进行架构权责调整，不需要第三方，如 codebuddy、work Buddy 等"；依 C0 §6.2（Architecture Reconciliation）、C0 §7 第 5 步、C0 §11（决断登记）与 CURRENT §13 落地。
- **基线**：`f481c90`（本次改动前最后一次提交）

---

## 1. 授权内容（R13）

1. **授权主体**：项目拥有者**直接授权「开发总工程师」**进行后续开发。开发总工程师是**角色名，不是产品名**（C0 §0）。
2. **单一执行主体**：本项目只有两方——项目拥有者与开发总工程师。**不设第三方裁决方**：不设独立架构顾问，也不设由第三方 AI 担任的"架构侧 / 总架构师"或 Human Experience Gate 终裁者。
3. **取代旧授权链**：历史 `CURRENT.md` §11.1–§11.4（WorkBuddy → CodeBuddy 日常施工授权迁移）**从未定稿**，自 R13 起失效，不再作为任何授权依据。
4. **权责边界不变**：开发总工程师可在宪法边界内连续实施、运行、测试、修复并自主决定工程取舍；**架构决定权仍唯一属于项目拥有者**（改变 C0–C4 的原则或 Contract 仍须提交确认）。
5. **验收标准不变，终裁权归位**：Human Experience Gate 与 Integration Gate 的判定标准一字未改（C1 §36 / CURRENT §2 / C4 §22）；仅把**终裁权**从"第三方 Architect"归还**项目拥有者**。开发总工程师**不得自宣布 Human PASS**（C2 §86 / C4 §438）。
6. **入口命名**：宪法级入口路由文件改为 **`AGENTS.md`**（工具中立）；`CODEBUDDY.md` 废弃删除。

---

## 2. 落地清单

| 文件 | 变更 |
|---|---|
| `AGENTS.md` | **新增**。由 `CODEBUDDY.md` 改名并工具中立化：§0 声明本项目只有两方、路由文件为角色中立入口；§2 自指由"CODEBUDDY"改为"本文件"；§2 末修正原"C0 §11"为**正确的 C0 §10**（C0 章节号已随净化位移）。仍保持**纯路由**，不承载宪法内容（CONSTITUTION-LOGIC-AUDIT-01 #3）。 |
| `CODEBUDDY.md` | **删除**（`git rm`）。产品名不再出现在活跃路由层。 |
| `governance/C0_…V1.0.md` | §0 新增「**第三方裁决方的取消**（2026-10-01 · R13）」；§3「层级与仲裁」`CODEBUDDY` → `AGENTS.md`；§10 路由源 `CODEBUDDY §1` → `AGENTS.md §1`；§11 增列 **R13 为治理级决断**。 |
| `CURRENT.md` | §9 增「裁决方 = 项目拥有者，不设第三方裁决方」；§11 入口 `CODEBUDDY.md` → `AGENTS.md`；§12 新增 **R13**（8 条子项，含取代旧授权链、Gate 终裁权归位、命名纪律）。 |
| `specs/OWNERSHIP_MAP.md` | 新增「入口路由 = `AGENTS.md`（非 Authority）」与「执行主体命名纪律（R13）」；`Architect Reconciliation`→项目拥有者确认（C0 §6.2）；`WorkBuddy 不得自行裁决`→开发总工程师提交项目拥有者确认；**修复 Candidate Registry 失效路径**（已归位 `governance/archive/`）；Author 由 `Architect` 改为项目拥有者。 |
| `specs/experience-ui/README.md` | **重写**。消除与 C4 的双真源冲突（见 §3.1）；Authority 表改为 C4 唯一；补 `archive` 层；Context Gate 顺序改为先读 C4；`Architect 授权`/`WorkBuddy 无自主权`→项目拥有者确认。 |
| `specs/experience-ui/evidence/M5-HUMAN-01_PreBaseline_Failure/README.md` | Gate 裁决方 `Architect`→**项目拥有者**；Baseline 路径更正为 `specs/archive/`；NEXT 由"pending Architect Task Book"更正为"已由 EXP-UI-AUDIT-01 执行完毕"。 |
| `specs/experience-ui/T06_…md` | 派工定义者 `WorkBuddy / Construction` → 开发总工程师。 |
| `specs/experience-ui/T07_…md` | `WorkBuddy/CodeBuddy` → 开发总工程师（2 处）。 |
| `specs/experience-ui/五母题深化_…V1.1.md` | 红线 11 `WorkBuddy 硬边界`→开发总工程师硬边界（**红线内容一字未改**）；§12 任务转派对象去产品名。 |
| `docs/MoHen_Narrative_Motif_Framework.md` | §12.4 任务转派对象去产品名。 |
| `tasks/H2_JINZE_CONSTRUCTION_PLAN_V1.0.md` | `Executor: WorkBuddy（墨策）`→开发总工程师（角色名）；授权依据 `CURRENT §11.1（A–F 六项）`（**已失效**）→ `CURRENT §12 R13`；§VAG-4 去掉"可请 ChatGPT 复核"。 |
| `tasks/CURRENT_TASK.md` | 顶部加**历史 Trace 横幅**（声明自 2026-10-01 起不再是当前状态 SOT，指向 `CURRENT.md`；旧三层 SOT 与工具名均不具 Authority）；角色行与 M5 状态行去第三方裁决方。 |

**范围外（有意不动）**：`governance/archive/`、`specs/archive/`、`archive/`、`legacy/`、`tasks/TASK-00xx`、`tasks/EXP-000x`、`tasks/results/*`（既有）、`decisions/ADR-*`、`specs/experience-ui/source/*`。依据 C0 §5：这些是 Archive / Trace，**不拥有日常 Authority**，改写历史记录反而破坏可追溯性。

---

## 3. 顺带修复的既有缺陷（均为实测，非文档声称）

### 3.1 `specs/experience-ui/README.md` 与 C4 构成双真源（高）

该文件（EXP-UI-GOV-01 登记）仍声明 `specs/MOHEN_EXPERIENCE_UI_BASELINE_V1.0.md` 为 **CURRENT IMPLEMENTATION AUTHORITY**，且按 §1.3/§25/§17 把 Baseline 设为 Context Gate 第一步 Required Read；而 `specs/OWNERSHIP_MAP.md` 与 C4 §27 登记早已把该 Baseline **降为 SOURCE ARCHIVE / TRACE**，且文件实际已移至 `specs/archive/`。→ 同一目录内两份活跃文档对"UI 权威是谁"给出相反答案，且 README 引用的路径已不存在。已按 C4 唯一 Authority 重写。

### 3.2 `specs/OWNERSHIP_MAP.md` 悬空引用与失效路径（中）

- 3 处以 **"C4 V2.1 §27"** 为降级依据；实测 C4 **已无 §27**（章号由 `## 26` 直接跳至 `## 28`），该节号在 2026-10-01 宪法净化中退出正文。
- Candidate Registry 路径写为 `governance/MoHen_Agent_2.0_Architecture-Candidate-Backlog_V1.0.md`，实测文件已归位 `governance/archive/`。

→ 已改为以本条登记 + 「C4 为 UI 唯一 Authority」为据，并更正归档路径。

### 3.3 `CONSTITUTION-CLEANUP-02-EXECUTION.md` §三 的记录与实测不符（中）

该报告 §三 声称"C1 §1 整章 + 附录 A/B"与"C4 §27 整节"被**移出正文**并"统一收纳到对应文件末尾的 `## 溯源与变更记录` 节…**可追溯性不丢**"。

实测：

- `grep "溯源与变更记录"` 遍查 `governance/*.md` → **零匹配**，该节在任何文件中都不存在；
- C1 章号由 `## 1` 直接跳至 `## 2`（§1 已消失）；C4 章号由 `## 26` 直接跳至 `## 28`（§27 已消失）。

结论：内容是**被删除**而非"移出到溯源节"，承诺的溯源节从未创建。**但未造成不可恢复的丢失**——相关内容仍在净化前最后一次提交 `f481c90` 中，可用 `git show <rev>:<path>` 完整取回；且依 C0 §5 与 OWNERSHIP_MAP 的「Current-only working tree + Git preserves history」纪律，沿革/归位表本就不应占据宪法正文。故本次**不恢复正文**，仅在此更正记录，避免后续会话继续引用一条不成立的执行声明。

### 3.4 环境缺陷：受限沙箱下 `pwsh` 无法启动（高 · 阻塞自动化）

- **症状**：`pwsh` 的每次调用均返回 `exit code 3221225794`（Windows `STATUS_DLL_INIT_FAILED`），无任何输出。
- **定性（实测）**：`diagnose-windows-sandbox-acl.ps1` 判定 `VERDICT=NOT_THIS_CLASS` —— 工作区根及其全部上级目录均具备 `WRITE_DAC`/`WRITE_OWNER`、无 `S-1-15-2-*` 包权限项、子树扫描 1858 个对象无 package ACE、`truncated=false`、`unreadable=0`。**ACL 不是原因**（`FIXED=0 GRANTED=0 REFUSED=0 RESTORED=0`）。
- **反证**：同一条命令在**完全访问权限**下正常执行。
- **结论**：受限沙箱令牌下 `pwsh` 进程初始化失败。后果是 **`git` / `pnpm test` / Playwright 等一切 shell 操作都需逐次授权**，无法无人值守连续施工。
- **待项目拥有者决策**：将本会话切换为完全权限（可连续施工），或接受逐命令授权。

---

## 4. 验证

- 活跃 Authority 文件（`governance/`（排除 `archive/`）、`specs/experience-ui/`（排除 `source/`）、`docs/`、`AGENTS.md`、`CURRENT.md`、`tasks/CURRENT_TASK.md`、`tasks/H2_…md`）已 **grep 复核**：`WorkBuddy|CodeBuddy|CODEBUDDY|ChatGPT` 零残留（除 C0 §0/§11 为**声明取消**而有意点名者）。
- 宪法边界未放松：Human Experience Gate 定义（C4 §22）、Canonical Non-Regression、Evidence Gate、Geometry is a Claim、Agent 无 Truth Store 写权——**一字未改**。
- 未运行测试：本任务为治理文本变更，不触碰代码 / DB / schema / 冻结 JSON；`pwsh` 受限（见 §3.4），无法执行 `pnpm test` 与 E2E。**不声称工程回归 PASS**。
- Commit：见文末回填。

## 5. 未做 / 明确不做

- 未改 `CURRENT.md` §2（Horizon）、§4（Proven Baseline）、§5（Gates）——**Human Experience Gate 仍为 HOLD**，R13 不构成任何 Gate 转 PASS 的依据。
- 未启动任何产品施工、未改代码 / DB / schema / 冻结数据。
- 未恢复 C1 §1 / C4 §27 正文（理由见 §3.3）。
- 未改写历史 Result / Task Book / ADR 中的旧工具名（Trace，无 Authority）。
