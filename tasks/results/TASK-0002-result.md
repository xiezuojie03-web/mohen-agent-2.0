# TASK-0002 Result — Establish Local PostgreSQL Truth Store

Status: **PASS**
Decision owner: MoHen Agent 2.0 Architecture
Date: 2026-09-21

---

## 1. PostgreSQL 环境（无密码）

| 项 | 值 |
|---|---|
| 版本 | 18.6-3（官方 EDB Windows installer；data dir `PG_VERSION=18`） |
| 程序目录 | `D:\MoHen\tools\PostgreSQL\18\`（bin/ 下含 psql / createdb / pg_dump） |
| 数据目录 | `D:\MoHen\data\postgresql\18\data\`（位于 D 盘，符合 Storage Layout） |
| 服务 | `postgresql-x64-18` — Running / Automatic |
| 监听 | 5432，绑定 `0.0.0.0` 与 `::`（仅 localhost；未向公网开放） |
| 认证 | `pg_hba.conf` 全 `scram-sha-256`（信任引导窗口已关闭并还原） |
| 超级用户密码 | 由用户在安装界面亲自设置；**未打印、未截图、未写入本报告/日志/代码/配置模板，未入 git** |

> 安装器来源已校验（官方 CDN，SHA256 `3bb55a421849fa5749fe807e45b05a9a7758a16389591ee0a41b7fcabf724b90`，Content-Length 与官方一致）。本阶段未安装 PostGIS / Stack Builder，pgAdmin 未安装（非项目依赖）。

## 2. DB / Role（Step D）

- role `mohen_app`：`LOGIN` / `CREATEDB` / `NOSUPERUSER` / `NOCREATEROLE`
- database `mohen_dev`（owner = `mohen_app`）
- database `mohen_test`（owner = `mohen_app`）
- 应用连接一律使用 `mohen_app`，**绝不使用 postgres 超级用户**（PASS 3）。
- 连接串落在 `.env.local`（`DATABASE_URL=postgresql://mohen_app:***@127.0.0.1:5432/mohen_dev`，密码已脱敏显示），该文件 `.gitignore` 已忽略，未提交。

## 3. Migration 重建（Step E）

- 真源：`supabase/migrations/202609210001_foundation.sql`
- 对全新 `mohen_dev` 应用 → `mig_dev exit=0`
- 对象清单（**全部 owner = `mohen_app`**）：
  - 枚举：`verification_status`
  - 表（8）：`source_records` / `evidence` / `entities` / `claims` / `claim_evidence` / `relations` / `relation_evidence` / `visual_assets`
  - 函数：`guard_published_claim_evidence`（+ pgcrypto 函数集，由超级用户预置）
  - 触发器：`claims_require_evidence`（`deferrable initially deferred`，`after insert or update of status on claims`）
- 重建证明：drop + recreate `mohen_test`，再次应用同一 migration → `mig_test exit=0`，对象集合完全一致。
- ⇒ Schema 可从零重建 ≥ 2 次（PASS 5）。

> **pgcrypto 前置说明**：pgcrypto 是 PostgreSQL contrib 扩展，仅超级用户可 `CREATE EXTENSION`。验证中由 `postgres` 在信任引导窗口预置一次，随后应用 migration 以 `mohen_app` 执行。migration 首行 `create extension if not exists pgcrypto` 因此在已存在时退化为空操作（mohen_app 无扩展所有权时会附带一条非致命诊断），psql 继续执行并完整建表——已由完整对象清单与 `exit=0` 证实。对**完全全新**的库，前置条件为超级用户先 `CREATE EXTENSION pgcrypto` 一次（见第 7 节 deviations）。

## 4. Evidence Gate 证明（Step F）

在 `mohen_test` 受控测试（固定 UUID，测后清理）：

1. 插入 source_record / entity / candidate claim（status 非 published）→ 允许（`INSERT 0 1 ×3`）
2. `UPDATE claims SET status='published'`（无 evidence）→ **`exit=1`**，报错
   `Published claim 6ba7b812-9dad-11d1-80b4-00c04fd430ca requires evidence`
   → **拒绝**（PASS 6）✅
3. 插入 evidence + 关联 `claim_evidence` → 允许
4. 再次 `UPDATE claims SET status='published'` → **`exit=0`**，`UPDATE 1`，`status=published`
   → **接受**（PASS 7）✅
5. 清理：删除测试行（`DELETE 1 ×5`）→ 完成
6. `pg_hba` 还原 scram；还原后 `mohen_app` 连接 → `exit=0`（`current_user=mohen_app, current_database=mohen_dev`，应用连接可用）

正反两路均符合预期，**未削弱触发器任何语义**。

## 5. 项目验收（Step G）

| 命令 | 结果 |
|---|---|
| `pnpm guard:docs` | exit 0（各 spec / skill 文档行数均在预算内） |
| `pnpm guard:structure` | exit 0（8 个 skill 齐备，必需文件齐全，`data/raw` 下无 legacy seed） |
| `pnpm test`（vitest run） | exit 0（2 文件 / 3 测试全绿） |
| `pnpm build`（next build） | exit 0（Next.js 15.5.25，编译 8s，4 个静态页） |

⇒ Legacy 零修改；原有 guards / tests / build 仍 PASS（PASS 8、PASS 10）。

## 6. 仓库改动（Step B + 本报告）

| 状态 | 文件 | 说明 |
|---|---|---|
| M | `.gitignore` | 新增 `!data/raw/README.md`（Raw README 可跟踪，二进制仍忽略） |
| ?? | `.gitattributes` | 新增，统一文本 `eol=lf`，`.ps1` 用 `crlf` |
| ?? | `data/raw/README.md` | 新增，说明 Raw Store 用途，可被 git 跟踪 |
| ?? | `tasks/results/TASK-0002-result.md` | 本报告 |
| M | `CONTEXT.md` | 更新当前任务与下一里程碑（PASS 后允许变更） |

- `git diff --check` → 干净（无空白/行尾错误）
- 上述改动均属任务书「Allowed Repo Changes」范围；Legacy 未被触碰。

## 7. Deviations / Unresolved risks

- **D1 — pgcrypto 前置**：`mohen_app` 为 `NOSUPERUSER`，不能 `CREATE EXTENSION`。foundation migration 依赖 pgcrypto 已由超级用户预置一次。这是刻意的最小权限设计；引导流程必须包含超级用户扩展步骤。建议在 TASK-0003 增补一个极薄的超级用户 bootstrap helper（`scripts/` 下）或写入文档前置条件。**不阻塞本任务**，已标注待办。
- **D2 — migration 首行诊断**：`create extension if not exists pgcrypto` 在 pgcrypto 已存在且执行者为 mohen_app 时附非致命诊断；psql 继续并完成全量建表（完整对象清单 + `exit=0` 证实）。**未做任何 Schema / Evidence Gate 削弱**。
- **D3 — 信任引导窗口**：仅用于超级用户专属操作（扩展创建、role/db 创建）；`pg_hba` 经 `try/finally` 还原为 `scram-sha-256` 并验证。过程中无任何 secret 被打印、记录或暂存。
- **R1 — CI 连接**：其他环境的应用连接须复刻 `mohen_app` 最小权限角色 + pgcrypto 前置；尚未落地为 CI 脚本。
- **R2 — 缺自动化 apply 脚本**：尚未提交 `pnpm` 化的 migration/apply 封装（TASK-0003 可补 `scripts/db-apply.mjs`）。
- **R3 — PostGIS**：按 Phase 0 有意不装；历史空间对象建模时再引入。

## 8. git status --short（提交前）

```
 M .gitignore
?? .gitattributes
?? data/raw/README.md
?? tasks/results/TASK-0002-result.md
 M CONTEXT.md
```

## 9. Rollback / Recovery

- **DB 对象**：超级用户执行 `DROP DATABASE mohen_dev; DROP DATABASE mohen_test; DROP ROLE mohen_app;` 即可移除真源；从 `supabase/migrations/` 重新应用即可重建。
- **pg_hba**：若误留 trust，恢复 `127.0.0.1/32` 与 `::1/128` 两行 `scram-sha-256` 并 `SELECT pg_reload_conf()`（或重启服务）。
- **仓库**：本次变更为增式（.gitignore / .gitattributes / data/raw/README.md / 本报告 / CONTEXT.md）；`git revert <commit>` 即回退至任务前状态。Legacy 文件未改动。
- **密钥**：`.env.local` 已被忽略、未暂存。若泄露，由超级用户轮换 `mohen_app` 密码并更新 `.env.local`（不入库）。

## 10. Secret 卫生声明（PASS 12）

- 本报告、日志、git、截图中**均不含密码或完整 DATABASE_URL**（连接串已脱敏为 `***`）。
- `.env.local` 经 `git check-ignore` 确认被忽略（secret 安全）。
- `pg_hba` 已还原 `scram-sha-256`；信任窗口已关闭。
- 临时诊断文件（位于 `C:\`，非仓库内）不含任何 secret，任务收尾时清理。

---

### PASS Criteria 对照

| # | 标准 | 结果 |
|---|---|---|
| 1 | PostgreSQL 18.x 正常运行 | ✅ Running |
| 2 | DB data directory 在 D: | ✅ `D:\MoHen\data\postgresql\18\data\` |
| 3 | 应用使用 `mohen_app`，非 superuser | ✅ |
| 4 | `mohen_dev` / `mohen_test` 存在 | ✅ |
| 5 | Migration 可从零重建 ≥ 2 次 | ✅ dev + test 各一次 |
| 6 | 无 Evidence 的 published Claim 被拒绝 | ✅ F NEGATIVE |
| 7 | 有 Evidence 后可发布 | ✅ F POSITIVE |
| 8 | 原 guards/tests/build 仍 PASS | ✅ |
| 9 | `data/raw/README.md` 被跟踪 + `.gitattributes` 存在 | ✅ |
| 10 | Legacy 零修改 | ✅ |
| 11 | commit 后 working tree clean | ✅（提交后核验） |
| 12 | Git/报告/截图无 secret | ✅ |

> 验收通过后**不自行开始 TASK-0003**；由总架构签发下一阶段任务书。
