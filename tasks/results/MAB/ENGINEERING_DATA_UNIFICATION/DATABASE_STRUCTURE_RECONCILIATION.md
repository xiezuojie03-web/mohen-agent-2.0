# P1 数据库结构统一认知核账报告

> 专项：MOHEN-ENGINEERING-DATA-UNIFICATION-01
> 阶段：P1 数据库结构统一认知
> 核账时间：2026-11-19
> 数据来源：双端 PostgreSQL catalog 只读盘点（无任何写入）
> 交付物：DATABASE_SCHEMA_LOCAL.json / DATABASE_SCHEMA_CLOUD.json / DATABASE_SCHEMA_DIFF.json / DATABASE_MIGRATION_VERSION_DIFF.json / cloud_migration_ledger.json / 本报告
> 状态：INVENTORY_COMPLETE（结构差异已分类解释，未做任何结构变更）

## 1. 双端基本事实

| 项 | 本地 mohen_dev | 云端 mohen-cloud |
|---|---|---|
| PostgreSQL 版本 | **18.6** | **17.11**（Supabase） |
| 连接身份 | postgres（superuser） | postgres（经 pooler） |
| 业务 Schema | control / evidence / meaning / public / publication / read_model / source / studio / world（另有 pg_temp* 临时噪声） | 同上 9 个（另有 mab_backup 备份 schema、pgbouncer） |
| 表数量 | 96 | 88（不含 mab_backup 5 张备份表） |
| 迁移账本 | **无**（supabase_migrations.schema_migrations 不存在） | 有，29 条（version 为安装时间戳，与仓库文件名不同源） |
| Storage | 无（纯 PostgreSQL，原件在本地文件系统） | 有（Supabase storage，含 mohen-private-originals 桶） |

## 2. 差异分类总账

### 2.1 IDENTICAL（结构一致）

- 表集合：88 张共有表（除下列差异表外）列结构、类型、NOT NULL 全部一致（列级仅 11 处差异，见 2.4）。
- 枚举类型：双端完全一致（0 差异）。
- 视图：双端一致。

### 2.2 LOCAL_ONLY（本地独有）

**10 张有数据的本地独有表**（均来自仓库已提交但云端未安装的迁移）：

| 表 | 行数 | 来源迁移 | 能力 |
|---|---|---|---|
| studio.execution_controls / execution_control_events | 4 / 11 | 20261104013351 | M4 执行控制 |
| studio.work_revisions | 5 | 20261114150000 | ST-07 作品修订 |
| studio.submission_snapshots | 5 | 20261114180000 | ST-08 提交快照 |
| publication.editorial_decisions / publication_snapshots / withdrawals | 5 / 3 / 1 | 20261114190000 | ST-09 编辑发布/撤回 |
| studio.director_plans | 3 | 20261114120000 | 导演计划 |
| studio.reference_kinds | 18 | 同上 | 引用类型 |
| control.artifact_content_columns | 234 | 20261109120000 | 内容列登记 |

**22 个本地独有函数**：execution_controls 保护/应用函数、persist_private_* 系列（story_seed/director_plan/agent_context/submission_snapshot/work_revision）、publication decide/publish/withdraw 与不可变保护函数、studio guard 系列。

**44 条本地独有 RLS 策略**：m5_machine_reviewer_read 系列（本地 Gate 机器评审读取）、producer_run_progress 等。

**11 个本地独有触发器**：publication/work_revisions/submission_snapshots/withdrawals 不可变保护、execution_controls 永久保护、asset_revision_reference_guard、use_event_guard 等。

**5 个本地独有角色**：mohen_app / mohen_editorial_operator / mohen_execution_authority / mohen_gate_signer_m5_machine / mohen_gate_signer_m5_owner。

**public.assets / public.director_plans / publication.published_pointers 的本地列扩展**：assets 的 original_id/source_id/page_locator/content_sha256/rights_by_action（权利追踪列）；director_plans 的 source_ids/project_id；published_pointers 的 source_schema/studio_revision_id/publication_id。

### 2.3 CLOUD_ONLY（云端独有）

- **2 张表**：control.web_password_resets / web_password_reset_request_budget（密码恢复，本地未装 20261117080000 迁移）。
- **mab_backup schema**（5 张 M1 备份表）：M1 时代遗留备份，云端侧 2026-11-02 处理 M1 退役时创建。
- **3 个云端独有函数**：studio.search_qualified_project_layers（正式知识读取核心）、control.m5_write_production_progress、control.m5_reconcile_legacy_unclaimed_run（历史 run 对账修复）。
- **1 条云端独有策略**：control.gate_audits.k3_gate_signer_audit_read。
- **1 处约束更强**：source.sources 的 rights_by_action CHECK 云端多 `source.is_rights_actions_valid()` 校验（20261119110000 权利投影迁移）。
- **云端独有角色**：mohen_m5_worker_login / mohen_m5_producer_login（M5 机器登录）及 Supabase 内建角色。

### 2.4 DEFINITION_DIFFERENT（定义不同）

- 11 处列差异：见 2.2 末（本地多列）+ publication.published_pointers.revision_id（本地可空、云端 NOT NULL）+ sources 权利 CHECK 云端更强（2.3）。
- 85 张共有表 **RLS 开关不同：云端全部启用 RLS，本地全部未启用**——本地库的 124 条策略因 RLS 关闭而全部处于不生效状态。

### 2.5 MIGRATION_PENDING（迁移待办解释）

- 仓库 53 个迁移文件中，24 个未在云端安装（清单见 DATABASE_MIGRATION_VERSION_DIFF.json），对应上文本地独有结构。
- 本地无迁移账本，本地结构只能以 catalog 实况为准；云端账本 version 与仓库文件名不同源，已按名称完成人工映射。
- 云端 5 条 M1 时代迁移（20261102xxxx）已不在仓库，属正常的历史退役（有 mab_backup 留证）。

### 2.6 UNKNOWN

- 无（所有结构差异均已归因到具体迁移或环境差异）。

## 3. 伪差说明（不计入真实差异）

1. **764 个 contype='n' 约束**：PG18 的 pg_constraint 暴露 NOT NULL 项而 PG17 不暴露，纯版本目录差异；权威口径以列级 not_null 比对（仅 11 处真实差异）。
2. **37 个 public 下 pgcrypto 函数**：本地装在 public、Supabase 装在 extensions schema，环境差异。

## 4. 哪边包含现行正式设计（逐项判断）

| 结构 | 判定 | 依据 |
|---|---|---|
| 正式知识读取函数 search_qualified_project_layers | **云端为现行** | 云端 M5 正式读取主线（20261118 迁移系列），本地无此函数 |
| sources 权利投影 is_rights_actions_valid | **云端为现行** | 最新迁移 20261119110000 |
| 密码恢复表 | 云端为现行 | 云端运行中的 Web 能力，本地未装 |
| M4 执行控制 / ST-07/08/09 / 导演计划 / artifact_content_columns | **仓库为现行、本地已装、云端待装** | 均为已合入 main 的正式迁移，云端未安装 |
| public.assets 权利追踪列 / director_plans 列扩展 | 同上 | 仓库正式迁移（20261110130000 等） |
| RLS 开关 | **云端为现行安全基线** | 本地 RLS 全关属开发便利偏离，与 MHKA 安全底线不符 |
| published_pointers.revision_id 可空性 | **需设计裁决** | 两版本来自不同迁移时序，P4 前须对照现行发布设计 |

## 5. P1 结论

1. 双端结构差异**全部可解释**：来源为「本地已装、云端未装的 24 个仓库迁移」+「云端侧新增的 M5 正式读取/密码恢复/对账能力」+「PG17/18 与 Supabase 环境伪差」。
2. 云端不是简单的「较新」或「较旧」：云端在正式知识读取与权利校验上更新，本地在 M4 执行控制、ST-07/08/09 出版链路、资产权利追踪列上更全。两端互有缺失，符合「先结构解释、后数据合并」的本专项前提。
3. 本地 RLS 全关是安全维度的重要偏离，P4 迁移适配与 P6 长期机制必须以云端 RLS 基线为准。
4. 下一阶段 P2（双端业务数据只读盘点）可以直接开始，行计数差异已在 DATABASE_SCHEMA_DIFF.json 的 row_count_differences 中给出首层线索（本地数据量全面大于云端：如 source_versions 128 vs 39、private_originals 90 vs 0、asset_heads 110 vs 1、qualification_current 49 vs 0 等）。

- 阶段状态：P1 = **INVENTORY_COMPLETE**
- 下一阶段：P2 双端业务数据完整盘点（只读）
