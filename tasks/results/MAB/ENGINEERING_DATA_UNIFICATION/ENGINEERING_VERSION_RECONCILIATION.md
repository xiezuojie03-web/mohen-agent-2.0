# P0 工程版本统一核账报告

> 专项：MOHEN-ENGINEERING-DATA-UNIFICATION-01
> 阶段：P0 工程版本统一
> 核账时间：2026-11-19
> 执行环境：本地工程环境（Windows，仓库 `d:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0`）
> 状态：CODE_PRESENT / INVENTORY_COMPLETE（工程基线已对齐，未涉及数据库业务数据）

## 1. P0.1 三端工程状态核查结果

### 1.1 本地 Git 仓库（合并前）

| 项目 | 值 |
|---|---|
| 本地分支 | `main` |
| 本地 HEAD（合并前） | `b137483f52e023bd4b7064747480f30571866192` |
| 工作区修改文件 | 0 |
| 未跟踪条目 | 16（清单见 §2） |
| 本地独有提交（相对 origin/main） | **0** |
| 仓库完整性 | `git fsck` 通过，无错误 |

### 1.2 GitHub main

| 项目 | 值 |
|---|---|
| origin/main HEAD | `709f4dde9de5d7dfed46d4065067a63cd442fd02`（2026-11-19 10:48:48 +0800） |
| GitHub 独有提交（相对本地） | **379** |
| 差异规模 | 231 文件，+29070 / -1174 行 |
| 差异性质 | 云端侧（Codex 等）2026-11-16 起推进的 M5 正式知识读取、来源权利投影、D00 环境与 Y05 修复、密码恢复、云端生产调度、历史 run 对账等工程；含 21 个新增数据库迁移文件与配套测试 |

### 1.3 云端 Vercel 部署

| 项目 | 值 |
|---|---|
| 最新部署 | `dpl_BxpZG6SP455F51fEtoP2t4pEX5hC`，Preview，**Ready** |
| 创建时间 | 2026-11-19 09:36:20 +0800（2 小时前） |
| URL | https://mohen-agent-2-0-f5scpkmg7-napoles1.vercel.app |
| git-main 别名 | https://mohen-agent-2-0-git-main-napoles1.vercel.app（HTTP 200 实测） |
| 部署 Git SHA | `6e31431b332b5aed40d47206a0229718f7784807`（fix(studio): correct formal read diagnostic imports） |
| 部署落后 main 的提交 | 10 个，全部为 docs-only（CURRENT.md / progress.md / M5 继承文档），无代码差异 |
| Production 部署 | 可见部署列表中全部为 Preview，未发现 Production 环境部署 |
| 次新部署 | `65zv2osqw`，Preview，Ready，约 15 小时前 |

### 1.4 数据库迁移脚本版本

- 合并前本地相对 main 缺少 21 个迁移文件（2026-11-14 至 2026-11-19），本地无独有迁移、无被删除迁移。
- 合并后本地迁移目录与 main 完全一致，最新迁移为 `20261119110000_m5_private_source_rights_projection.sql`。
- 云端数据库（mohen-cloud）已安装迁移版本的核对属于 P1 范围，本阶段未核。

## 2. P0.2 本地成果保护

### 2.1 备份

- 备份位置：`%TEMP%\mohen_p0_backup_20261119`（含全部未跟踪文件副本、合并前本地 HEAD SHA、未跟踪清单）。
- 合并前本地 HEAD `b137483` 已包含于 GitHub 历史（其为 origin/main 祖先），git 层面无丢失风险。

### 2.2 未跟踪文件分类（合并前后不变，均保留在原地）

| 分类 | 文件 | 判定 |
|---|---|---|
| 临时诊断脚本 | `.tmp_check_audits.mjs`、`.tmp_check_gates.cjs/.mjs`、`.tmp_check_projects.mjs`、`.tmp_check_run_scope.mjs`、`.tmp_check_runs.mjs`、`.tmp_check_runs2.mjs`、`.tmp_check_scope.mjs`、`.tmp_check_success.mjs`、`.tmp_check_task.cjs`、`.tmp_dbcheck.mjs`、`.tmp_gen_evidence.mjs`、`apps/web/.tmp_trigger.ts` | 历史断点诊断一次性脚本，无归档价值，已备份留底 |
| 运行时状态 | `.mohen/execution-auth/issued-grants.jsonl`、`apps/web/.mohen/execution-auth/issued-grants.jsonl` | 本地运行时签发的授权记录，含会话数据，不应提交 git |
| 高敏临时脚本 | `.tmp_disable_rls.sql` | 历史调试用 RLS 禁用脚本，从未提交，不归档 |

### 2.3 本地独有有效工程成果

**结论：无。** 本地无独有提交、无独有迁移、无修改文件；未跟踪文件均为临时诊断脚本与本地运行时状态。无需向 main 归档任何本地独有成果。

## 3. P0.3 工程合并执行

- 方式：`git merge --ff-only origin/main`（本地无独有提交，纯快进，零冲突、零丢失）。
- 结果：本地 `main` 由 `b137483` 快进至 `709f4dd`，与 origin/main 完全一致。
- 工作区未跟踪文件不受影响（16 项保持原样，已编目备份）。
- 云端部署版本已明确：部署 SHA `6e31431`，与 main HEAD 的差异仅为 docs-only，不构成工程版本分歧。

## 4. 结论与状态

1. **唯一工程基线已成立**：本地 = GitHub main = `709f4dd`；云端部署可追溯至明确提交 `6e31431`（docs-only 落后）。
2. **本地无丢失风险**：所有本地内容已在 GitHub 或备份中。
3. **环境差异说明**：本地此前落后 379 提交是因云端侧持续施工推送；本地从未分叉，不存在两套互不一致的工程版本。
4. 本阶段未触碰任何数据库业务数据（P1 起处理），未产生任何费用。

- 阶段状态：P0 = **INVENTORY_COMPLETE / CODE_PRESENT**（本地基线对齐完成）
- 下一阶段：P1 数据库结构统一认知（本地 mohen_dev 与云端 mohen-cloud 真实 Schema 盘点与比较）
