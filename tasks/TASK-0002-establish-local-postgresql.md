# TASK-0002 — Establish Local PostgreSQL Truth Store

Status: READY FOR LOCAL EXECUTION
Decision owner: MoHen Agent 2.0 Architecture

## Architecture Decision

Phase 0 使用 **原生 PostgreSQL 18.x 当前稳定小版本**，暂不安装 Supabase Local / Docker。

原因：本机 RAM 7.8 GB；完整 Supabase Local 会占用过多内存。墨痕当前真正需要的是 PostgreSQL 真源、migration 与 Evidence Gate，而不是 Auth / Realtime / Storage。未来需要时可以在 PostgreSQL 之上增加 Supabase 服务层，不改变数据模型。

本任务不安装 Docker、Supabase、PostGIS。PostGIS 留到历史空间对象正式进入 Schema 时再启用。

## Read First

`CONTEXT.md` → `specs/FOUNDATION.md` → `specs/DATA_CONTRACT.md` → `specs/OWNERSHIP_MAP.md` → `skills/mohen-project-guard/SKILL.md` → `skills/mohen-acceptance/SKILL.md` → 本 Task。

## TASK-0001 决策确认

- D1 pnpm 9.15.4 安装：ACCEPTED。
- D2 `git init` + baseline commits：ACCEPTED。
- U1：FIX。`.gitignore` 增加 `!data/raw/README.md`，Raw 二进制仍忽略。
- U4：FIX。新增 `.gitattributes` 统一文本行尾。
- U3：7.8 GB RAM 作为架构约束，因此暂不运行完整 Supabase Local/Docker stack。

## Goal

在 D: 建立本地 PostgreSQL 真源；从已提交 migration 重建 MoHen Schema；实际证明数据库 Evidence Gate 能拒绝“无证据发布”；形成可复现验收报告。

## Storage Layout

优先：
- PostgreSQL program：`D:\MoHen\tools\PostgreSQL\18\`（安装器支持时）
- PostgreSQL data：必须 `D:\MoHen\data\postgresql\18\data\`
- Raw Store：`D:\MoHen\data\raw\`
- 当前 repo 暂不搬迁；搬项目另立 Task。

若安装器无法安全地把程序/数据放到 D:，STOP 并报告；C: 仅余约 18 GB，不允许静默接受大型 C: 安装。

## Security

- postgres 管理密码由用户在安装界面亲自输入。
- 不打印、不截图、不写进结果报告、不提交、不发送给 ChatGPT。
- `.env.local` 可保存本地 `DATABASE_URL`，但必须保持 gitignored。
- `.env.example` 只留 placeholder。
- PostgreSQL Phase 0 仅监听 localhost，不向公网开放 5432。

## Allowed Repo Changes

仅允许：
- `.gitignore`
- 新增 `.gitattributes`
- `.env.example` 的 placeholder 修正（如确有必要）
- `scripts/` 下极薄的 DB reset/apply helper（仅确有必要）
- PASS 后更新 `CONTEXT.md`
- `tasks/results/TASK-0002-result.md`

Migration 若失败，先报告 SQL 错误，不得为了“跑通”擅自削弱 Schema/Evidence Gate。

## Execution

### A. Preflight
1. `git status --short` 必须 clean。
2. 重查 RAM / C: / D:。
3. 检查是否已有 postgres service / psql / 5432 占用。
4. 确认安装 PostgreSQL 时可以取得管理员权限。

### B. Repo hygiene
`.gitignore` 增加：
`!data/raw/README.md`

新增 `.gitattributes`：

```gitattributes
* text=auto
*.md text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.mjs text eol=lf
*.json text eol=lf
*.sql text eol=lf
*.yaml text eol=lf
*.yml text eol=lf
*.css text eol=lf
*.ps1 text eol=crlf
```

验证 `data/raw/README.md` 可被 Git 跟踪。不得批量格式化无关文件。

### C. PostgreSQL
1. 通过 PostgreSQL 官方 Windows installer 路径安装当前 PostgreSQL 18.x 稳定小版本。
2. data directory 必须为 `D:\MoHen\data\postgresql\18\data\`。
3. 端口保持 5432；若已被未知服务占用，STOP。
4. 安装 `psql` / `createdb` / `pg_dump`。
5. pgAdmin 可选，不作为项目依赖。
6. 本任务不装 StackBuilder/PostGIS。

### D. DB / Role
创建：
- role `mohen_app`
- database `mohen_dev` owner `mohen_app`
- database `mohen_test` owner `mohen_app`

应用连接不得使用 postgres superuser。

`.env.local`：
`DATABASE_URL=postgresql://mohen_app:<LOCAL_SECRET>@127.0.0.1:5432/mohen_dev`

任何日志不得回显完整 secret-bearing URL。

### E. Migration rebuild
Schema 真源：
`supabase/migrations/202609210001_foundation.sql`

1. 对全新 `mohen_dev` 应用 migration。
2. 列出创建的 type/table/trigger/function。
3. 只对 `mohen_test` 执行 drop/recreate，再从零应用同一 migration。
4. 第二次成功是“Schema 可重建”的证明。

预期核心对象：
`verification_status`, `source_records`, `evidence`, `entities`, `claims`, `claim_evidence`, `relations`, `relation_evidence`, `visual_assets`, `guard_published_claim_evidence`, `claims_require_evidence`。

### F. Evidence Gate proof
在 `mohen_test` 做受控测试：

1. 插入 Source。
2. 插入 Entity。
3. 插入无 Evidence 的 candidate Claim —— 应允许。
4. 把它直接改为 `published` —— **必须失败**。
5. 插入 Evidence + claim_evidence。
6. 再发布 —— **必须成功**。
7. 测试数据清理/回滚。

若第 4 步没有失败，不得削弱 trigger；STOP 并诊断。

### G. Project acceptance
实际运行：
- `pnpm guard:docs`
- `pnpm guard:structure`
- `pnpm test`
- `pnpm build`
- DB rebuild proof
- Evidence Gate negative + positive proof
- `git diff --check`
- `git status --short`

全部通过后才提交。

## PASS Criteria

1. PostgreSQL 18.x 正常运行。
2. DB data directory 在 D:。
3. 应用使用 `mohen_app`，不使用 superuser。
4. `mohen_dev` / `mohen_test` 存在。
5. Migration 能从零重建至少两次。
6. 无 Evidence 的 published Claim 被数据库拒绝。
7. 有 Evidence 后可发布。
8. 原 JS guards/tests/build 仍 PASS。
9. `data/raw/README.md` 被跟踪，`.gitattributes` 存在。
10. Legacy 零修改。
11. commit 后 working tree clean。
12. Git / 报告 / 截图无 secret。

## Stop Conditions

以下任一发生立即 STOP，不自行绕行：
- 安装器强制大型 program/data 到 C:；
- 5432 被未知服务占用；
- 无管理员权限；
- PostgreSQL 安装来源无法确认；
- migration 失败；
- Evidence Gate 无法阻止无证据发布；
- Legacy 被触碰；
- secret 被 staged。

## Result Report

创建 `tasks/results/TASK-0002-result.md`，包含：
PostgreSQL 版本（无密码）、program/data path、service/port、DB/role 名、migration object inventory、Evidence Gate 正反测试、repo changed files、guard/test/build、deviations、unresolved risks、`git status --short`、rollback/recovery。

严禁包含密码或完整 DATABASE_URL。

## After PASS

由总架构签发 TASK-0003：**Data Factory Minimum Pipeline + Jinze Legacy Migration Staging**。

PostGIS 在历史空间对象首次正式建模时引入，不提前增加系统负担。
