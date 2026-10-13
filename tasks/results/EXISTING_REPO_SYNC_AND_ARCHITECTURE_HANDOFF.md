# EXISTING_REPO_SYNC_AND_ARCHITECTURE_HANDOFF

> 一次性「同仓安全同步＋工程承载快照」任务交接记录
> 生成时间：2026-10-13（同日完成同步与验证）
> 最终结论：**SYNC=PASS**（推送成功，远端 SHA 与本地一致，敏感文件未入库，关键文件抽核通过）
> 本文件为只读记录，未借本任务修改任何代码逻辑。

---

## 0. 结论与核心阻塞

| 项 | 值 |
|---|---|
| 最终结论 | **SYNC=PASS** |
| REPO_HANDOFF | **PASS**（远端可读取到同步提交，SHA 与本地一致，抽核通过，无机密泄露） |
| 同步分支 / 提交 | `handoff/local-b-20260930` @ `c3b990a220c096cd367fd345146755af91fc9d83`（快进推送，非 force） |
| 部署触发 | 未触发：Vercel 生产部署仅绑定 `main`；本次仅推 `handoff/*` 分支，`main` 保持 `87bb56d` 未动 |

网络诊断证据（2026-10-13 实测）：

| 通道 | 结果 |
|---|---|
| `https://github.com` (443) | TCP 连接失败（`Failed to connect to github.com:443`，git ls-remote / fetch / push --dry-run 均报此错误，EXIT=128） |
| `github.com` ICMP (ping) | 通（184ms，0% loss）→ 属典型「ICMP 通 / 443 端口被阻断」 |
| `git@github.com` SSH (22) | TCP 端口通，但 SSH 会话超时（深度阻断） |
| `git@ssh.github.com` (443 SSH over HTTPS) | 可达，但 `Permission denied (publickey)`（无 SSH 私钥） |
| `api.github.com` (443) | TCP 通（但 git push 走 github.com 域名，无法替代） |
| 本地代理 | 系统代理 `ProxyEnable=0`；`~/.ssh` 无任何私钥（仅 known_hosts）；无 `~/.git-credentials`；常见代理端口（7890/1080/10808 等）无监听 |

**【已解决 2026-10-13】** 发现本机 `mgvpn` 进程在 `127.0.0.1:51081` 提供可用 HTTP/SOCKS 代理（实测经其访问 `https://github.com` 返回 200）。全程以 `git -c http.proxy=http://127.0.0.1:51081 …` 临时参数借用该通道，**未修改任何全局配置**。认证复用 Windows 凭据管理器既存的 `git:https://github.com` 凭据（`credential.helper=manager`，系统级配置），验证有效，**未新建 token**。

---

## 1. 仓库与分支状态（本地实测，只读）

| 项 | 值 |
|---|---|
| 仓库根 | `D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0` |
| remote `origin` | `https://github.com/xiezuojie03-web/mohen-agent-2.0.git`（与任务指定的私有仓库一致，无换仓） |
| 本地当前分支 / HEAD | `handoff/local-b-20260930` @ `c033954f555d0fa3f1a914ec2ae48e28e2090de8` |
| `main` 本地 | `87bb56d` |
| HEAD 与 main 关系 | `merge-base(HEAD, main) = 87bb56d` → main 是当前分支祖先（无分叉冲突） |
| 相对本地缓存 `origin/handoff/local-b-20260930` | **47 ahead / 0 behind**（缓存引用，非实时远端） |
| 本地分支列表 | `main`、`handoff/local-b-20260930`、`track/experience-exp-0001`、`track/experience-exp-0002`、`track/world-cultural-world-02` |
| 未提交变更 | 已跟踪修改 183 个 porcelain 条目 + 未追踪 368 个（`git add -A --dry-run` 合计 399 条目） |

**远端 HEAD / 分支保护 / 部署触发风险**：NOT_VERIFIED（网络阻断，`git ls-remote` 无法读取）。已知既有安全约束：勿动 `main` / `track/experience-exp-0002` / `hushang-jingwei`，勿提交「B 的脏工作区」——本任务未触碰任何分支，未做任何写操作。

---

## 2. 可恢复冷备份（已完成并核对）

| 项 | 值 |
|---|---|
| 备份位置 | `D:\MoHen\backups\REPO_SYNC_20261013\mohen-agent-2.0\` |
| 方式 | robocopy 全量物理复制（保留 `.git` 完整历史与 47 个未推送提交） |
| 排除 | `node_modules`、`.next`、`test-results`、`coverage`、`playwright-report`、`dist`（可再生成） |
| 结果 | 342 目录 / 1369 文件 / 143.48 MB / 0 失败 / 0 失配（ROBOCOPY_EXIT=1，成功） |
| 核对 | `.git\HEAD`、`.git\config`、`.env`、`.env.local`、`.env.example`、`AGENTS.md`、`CURRENT.md`、`DATA_PRODUCTION_MAP.md`、`OWNERSHIP_MAP.md`、`supabase\migrations`、`data\raw`、`data\staging`、`data\exports`、`data\fixtures`、`tasks\results` 均在备份中；`.git` 字节数 39,623,526 与源一致 |

敏感文件（`.env` / `.env.local`）已物理保留在备份中，但被 `.gitignore` 排除，**不会进入 Git 提交**。

---

## 3. 拟提交清单复核与排除类别

已按仓库既有 `.gitignore` 复核 `git add -A --dry-run` 结果（399 条目）。`.gitignore` 已排除：`node_modules/`、`.next/`、`dist/`、`coverage/`、`playwright-report/`、`test-results/`、`.env`、`.env.local`、`.env.*.local`（保留 `.env.example`）、`data/raw/*`、`data/staging/*`、`data/exports/*`、`*.log`、`pipelines/**/_probes/`、`verification/*`。

**凭据/连接串扫描结果：无真实凭据泄露。** 对全部拟提交文件及 `implementation_artifacts/` 全量扫描 `postgres://`、`password=`、`BEGIN RSA`、`-----BEGIN`、`ghp_`、`gho_`、`sk-…` 均无命中；「token」命中仅为代码变量名 `TOKEN_RE` / `TOKEN_NUM`。

**仍需在 push 前排除的敏感/非正式文件（本次识别，未写 .gitignore，未 commit）：**

| 文件 | 类别 | 处理 |
|---|---|---|
| `implementation_artifacts/preflight/DB_SCHEMA_BEFORE.sql` (84.9KB) | PG schema dump（`pg_dump` 产物），含 `\restrict`/`\unrestrict` 52 字符随机令牌 | **排除（PG dump）** |
| `implementation_artifacts/preflight/DB_ENVIRONMENT.md` | 环境信息（host/port/db/超级用户，虽无密码） | **排除（环境配置）** |
| `implementation_artifacts/preflight/GIT_DIFF_BEFORE.patch` (496.9KB) | 历史 diff 原始快照 | **排除（原始快照，非正式源码/协议）** |
| `_probe.mjs` | 一次性探针脚本，引用外部 `hushang-jingwei` 目录 | **排除（临时脚本）** |
| `implementation_artifacts/` 整个目录 | 预检（preflight）工程快照，含上述 dump / 环境信息 | 建议**整体排除**（不属于源码/协议/Skill/Contract/Guard/测试/导航图） |

> 说明：`implementation_artifacts/preflight/_after_raw.txt`、`_counts_raw.txt`、`_public_after.txt` 仅为表名+行数元数据快照，无数据内容；`TARGET_SHA256.txt` 为校验和。若拥有者确需保留 preflight 快照，仅上述三个元数据文件可考虑纳入，dump / 环境 / patch 仍须排除。

---

## 4. 本地 / 远端 SHA

| 项 | 值 |
|---|---|
| 同步前本地 HEAD | `c033954f555d0fa3f1a914ec2ae48e28e2090de8` |
| 本次同步提交 | `c3b990a220c096cd367fd345146755af91fc9d83`（384 文件：M29 / A353 / R2） |
| 实际同步分支 | `handoff/local-b-20260930`（快进 `c04486f → c3b990a`，未用 force） |
| 远端回读 SHA | `c3b990a220c096cd367fd345146755af91fc9d83`（`git ls-remote` 实读，与本地一致） |
| 远端 main | `87bb56d`（未触碰，与远端一致） |

---

## 5. 文件范围（拟同步范围，未执行）

应同步（一次性有据入库）：
- 源码：`apps/`、`packages/`、`pipelines/`、`scripts/`
- 架构协议：`governance/C0–C4`、`specs/`（`AGENT_CONTRACT` / `DATA_CONTRACT` / `EXPERIENCE_CONTRACT` / `FOUNDATION` / `SOURCE_REGISTRY` 及 `specs/data-production/`）
- Skill：`skills/`（18 个 skill 目录各含 `SKILL.md` + `README_DATA_PRODUCTION_SKILLS.md`）
- Guard：`scripts/guards/`
- 测试：`tests/`
- `specs/data-production/` 下导航图：`DATA_PRODUCTION_MAP.md` → `MoHen_Data_Production_System_Map.{html,md}`
- 数据库迁移/回滚：`supabase/migrations/`、`supabase/rollback/`（均为 schema 脚本，非数据 dump）

排除（不入库）：第 3 节敏感/非正式清单 + `.gitignore` 既有排除项 + `data/raw|staging|exports`。

---

## 6. 目录树（顶层，实测）

```text
mohen-agent-2.0/
├─ .git/            (39.6MB，完整历史，含 47 未推送提交)
├─ apps/web/
├─ archive/
├─ data/            (raw/ staging/ exports/ fixtures/)
├─ decisions/
├─ governance/      (C0 C1 C2_V1.2 C3_V1.3 C4_V2.1 + archive/)
├─ implementation_artifacts/   ← 敏感，建议排除
├─ legacy/
├─ node_modules/    ← 排除
├─ packages/        (agent-runtime/ data-access/ domain/ experience-engine/ ui/)
├─ pipelines/       (build cultural-world data-production evidence experience
│                    extract historical-spatial ingest legacy normalize research
│                    review visual weave)
├─ scripts/         (guards/ reports/ + check-*.mjs + db-*.mjs|ps1)
├─ skills/          (18 skill 目录)
├─ specs/           (AGENT_CONTRACT DATA_CONTRACT EXPERIENCE_CONTRACT FOUNDATION
│                    SOURCE_REGISTRY + data-production/)
├─ supabase/        (migrations/ rollback/)
├─ tasks/           (results/ experiments/ implementation/ ...)
├─ tests/           (data/ data-production/ e2e/ end-to-end/ experience/ setup/)
├─ tools/
├─ verification/
├─ AGENTS.md  CURRENT.md  DATA_PRODUCTION_MAP.md  OWNERSHIP_MAP.md
├─ package.json  pnpm-lock.yaml  pnpm-workspace.yaml  vitest.config.ts
├─ .env  .env.local  .env.example   ← .env/.env.local 被 gitignore 排除
```

---

## 7. Registry → Router → Skill → Executor → L Contract → Gate/Guard → Tests 实际入口与真实路径

以下路径均已在本机 `D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0` 实测存在（存在性 = 已确认）。

| 环节 | 实际路径（存在性已确认） |
|---|---|
| Router（入口路由） | `AGENTS.md`（根路由）。**`CODEBUDDY.md` NOT_FOUND**——根目录无此文件，路由已由 `AGENTS.md` 承载；`tasks/implementation/FINAL_CODEBUDDY_IMPLEMENTATION_SEQUENCE.md` 为实施序列文档（非路由） |
| 导航图 | `DATA_PRODUCTION_MAP.md` → `specs/data-production/MoHen_Data_Production_System_Map.html`(14419B) + `.md`(7943B) |
| Registry | `specs/data-production/production-registry.json`、`identifier-registry.json`、`naming-map.json`、`acquisition-intents.json`、`source-providers.json` |
| Skill | `skills/<18个>/SKILL.md`（如 `mohen-source-intake`、`mohen-material-understanding`、`mohen-world-construction`、`mohen-humanistic-discovery`、`mohen-read-model-publication` …） |
| Adapter（数据访问） | `packages/data-access/src/{data-production-repository,lineage-read-repository,read-model-repository,source-gate,acquisition-gate,lineage-validator}.mjs` |
| Executor（唯一执行入口） | `pipelines/data-production/run.mjs`（结构：run → orchestrator → D01–D05 executors → adapters → reporting；子目录 `adapters/` `executors/` `orchestrator/` `reporting/`） |
| Agent Runtime | `packages/agent-runtime/src/{evidence-on-demand,read-model-client}.mjs` + `llm.ts` `understand.ts` `select.ts` `types.ts` |
| L Contract | `specs/AGENT_CONTRACT.md`、`specs/DATA_CONTRACT.md`、`specs/EXPERIENCE_CONTRACT.md`、`specs/data-production/PERSISTENCE_BINDING_CONTRACT.md`、`PHYSICAL_DATA_MODEL_V2.md`、`L4_L7_CONSUMPTION_FEEDBACK_CONTRACT.md` |
| Gate | `specs/data-production/gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md` + `gate-contracts.v2.json` |
| Guard | `scripts/guards/`：`check-runtime-data-boundary.mjs`、`check-no-legacy-production-entry.mjs`、`check-stage-handoff.mjs`、`check-e2e-contract-completeness.mjs`、`check-cross-layer-write-boundary.mjs`、`check-gate-enforcement.mjs`、`check-physical-data-model.mjs`、`check-production-registry.mjs` + `G0–G4_*_GATE.md` + `README.md` |
| Tests | `tests/data-production/`（`gate-enforcement.test.mjs`、`orchestrator.test.mjs`、`physical-model.test.mjs`、`phase-e-migration.test.mjs`…）、`tests/end-to-end/phase-g-e2e.test.mjs`、`tests/experience/phase-f-alignment.test.mjs` |

---

## 8. A—G 旧工程 与 D00–D05 映射（可确认差异/缺口）

可确认（基于已读文档）：
- `specs/data-production/MoHen_Data_Production_System_Map.md` 开篇明确「**不包含 Phase A–G 执行过程**」。
- `AGENTS.md` 明确「旧 Discovery / Directed / N01–N06 / Research Workspace 不再是正式入口」。
- 现行正式全链：`D01/L0/G0 → D02/L1/G1 → D03/L2/G2 → D04/L3/G3 → D05/L4/G4 → L5 → L6 → L7 → D01`。
- 语义层映射：L0=`source`、L1=`evidence`、L2=`world`、L3=`meaning`、L4=`read_model`、Control=`control`。

缺口 / 未验证：
- A–G（Phase A–G 旧执行阶段）到 D01–D05 的**逐阶段字段级映射差异**：NOT_VERIFIED（需专门审计，非本同步任务范围，未借本任务修改代码）。
- 旧 `relations(521)` 与 `relation_claim` 合并设计：属于待拥有者裁决的架构项（记忆中的 ESC-02），本任务不触碰。

---

## 9. 运行状态证据等级

| 环节 | 证据等级 |
|---|---|
| 文件**存在** | 已确认（第 7 节全部路径实测存在） |
| 配置（被 Registry/契约引用） | 部分确认（`System_Map.md` / `AGENTS.md` 引用一致），未逐一验证运行时加载 |
| 调用（运行时实际调用链） | NOT_VERIFIED（未运行 `run.mjs` / 未跑 pipeline） |
| 测试（测试通过） | NOT_VERIFIED（未运行 `vitest` / `tests/`） |
| 远端同步 | NOT_VERIFIED（网络阻断，未 push） |

---

## 10. 抽核结果（任务指定文件真实存在性）

| 抽核对象 | 结果 |
|---|---|
| `DATA_PRODUCTION_MAP.md` | 存在（导航两个 Map 文件） |
| `specs/data-production/MoHen_Data_Production_System_Map.html` | 存在（14419 B） |
| `specs/data-production/MoHen_Data_Production_System_Map.md` | 存在（7943 B） |
| `OWNERSHIP_MAP.md` | 存在（工作区已修改） |
| 方法 Registry `production-registry.json` | 存在 |
| `skills/` | 存在（18 skill 目录） |
| `pipelines/` | 存在（含 `data-production/run.mjs`） |
| Gate/Guard | 存在（`gates/` + `scripts/guards/`） |
| `supabase/` | 存在（`migrations/` + `rollback/`） |
| `tests/` | 存在（`data-production/` `end-to-end/` `experience/`） |

无 NOT_FOUND 项（仅 `CODEBUDDY.md` 路由文件缺失，已在第 7 节单独标注）。

**远端（`origin/handoff/local-b-20260930` @ `c3b990a`）树内抽核（18/18 OK）**：`DATA_PRODUCTION_MAP.md`、两个 `MoHen_Data_Production_System_Map.*`、`OWNERSHIP_MAP.md`、`production-registry.json` / `identifier-registry.json` / `naming-map.json`、`skills/mohen-source-intake/SKILL.md`、`skills/mohen-material-understanding/SKILL.md`、`pipelines/data-production/run.mjs`、`executors/d01-source-intake.mjs`、`executors/d05-read-model-publication.mjs`、`gates/G0-G4_MACHINE_GATE_CONTRACT_V2.0.md`、`scripts/guards/check-runtime-data-boundary.mjs`、`supabase/migrations/202610070100_data_production_v2_baseline.sql`、`tests/data-production/gate-enforcement.test.mjs`、`tests/end-to-end/phase-g-e2e.test.mjs`、本交接文件——全部 OK。

远端树规模：918 文件（skills 18 个 SKILL.md / pipelines 75 / tests 30 / supabase 15 / specs/data-production 35）。
**敏感文件终检：CLEAN**——`implementation_artifacts/`、`_probe.mjs`、`.env`、`.env.local`、`db_url` 均不在远端树中。

---

## 11. 遗留事项

1. 无同步遗留：推送、远端 SHA 回读、关键文件抽核、敏感文件终检全部完成。
2. 待拥有者后续裁决（非本任务范围）：A–G 旧工程 → D01–D05 字段级映射差异专项审计；ESC-02 `relations(521)` 合并设计。
3. 工作区仍有 15 个文件**有意排除、未入库**：`_probe.mjs`（1）+ `implementation_artifacts/`（14，含 PG schema dump、环境信息、历史 diff patch）。如需转正入库，须拥有者明确指示后另行处理。

> 本任务 Git 写操作范围：选择性 `git add`（含排除 pathspec）→ 主体提交 `c3b990a` → push（fast-forward，非 force）→ 本交接文件更新落档提交。未部署，未改数据库，未做新六阶段迁移，未修改任何代码逻辑。
