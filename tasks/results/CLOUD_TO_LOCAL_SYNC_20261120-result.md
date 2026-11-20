# 云端→本地回写结果（GitHub + Supabase）｜2026-11-20

## 授权与范围
Owner 2026-11-20 授权「远端已无施工，同意方案，请执行」。方案为阶段 0 保全→阶段 1 GitHub merge→阶段 2 Supabase 增量回写→阶段 3 验证。全程未 push、未部署、未触碰 Production、未迁认证凭据。

## 阶段 0｜保全（全部完成）
- 静止窗口复核：`origin/main` 两次 fetch 均为 `ce8812e`，无其他写入方。
- Git 保全：标签 `backup/local-before-cloud-sync-20261120` → `7ad8506`；本地独有提交 patch、工作区 P0 CSV 的 6 行 diff、未跟踪文件清单均存入 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/backups/`。
- 数据库保全：本地 `mohen_dev` 全库 `pg_dump -Fc` → `backups/local_mohen_dev_before_cloud_sync_20261120.dump`，SHA256 `3F3C1F465B383DCEBB21CEA651F10D3BF9C8A5E2F5F11588E699D3B3B60CA9FA`，大小 1,142,416 字节。
- 双端 manifest（同一时点只读）：本地 96 表 / 云端 105 表；共有 96、云端独有 9、本地独有 0、行数差异 21。
- 凭据体检：Supabase / GitHub / 本地 PG 三项 PASS；Vercel 令牌因网络超时 FAIL，本次回写不依赖，未处理。

## 阶段 1｜GitHub 回写（完成）
- 从 `c6337d2` 分叉点 merge `origin/main`（66 个提交）到本地 `7ad8506`。
- 两处文档冲突按规则解决：`CURRENT.md` 取远端当前 D00 断点并附 P4 历史回执引用；`progress.md` 保留本地 P4 批次与远端 D00 全部证据。
- 合并提交 `ca8f4a5`；本地 main 现领先远端 2 个提交（P4 提交 + 合并提交），未 push。
- 工作区 P0 CSV 的 6 行修改经 stash→pop 完整恢复。

## 阶段 2｜Supabase 回写（完成）
回写方向 cloud→local，全部在主键差集确认为「纯增量、无同主键内容冲突」后执行；20 张表结构逐列比对完全一致。

- 事务内按依赖拓扑顺序 INSERT `ON CONFLICT DO NOTHING`，因 `studio.asset_revisions ↔ private_originals` 存在真实循环引用，仅在该事务内 `SET LOCAL session_replication_role=replica` 容纳，结束恢复 `origin`。
- 实际回写 77 行：
  - `public.study_asset_receipts` +38、`public.research_events` +18、`control.production_runs` +3；
  - `studio.asset_heads` +2、`studio.asset_revisions` +2；
  - 其余 14 张表各 +1（`research_tasks`/`projects`/`sources`/`source_versions`/`raw_items`/`private_originals`/`gate_candidates`/`gate_service_credentials`/D00 账本 6 表等）。
- 逐「云端独有主键」回读内容比对：0 失败。DRY-RUN 与 APPLY 均全项 PASS。
- `control.d00_execution_grant_journal`：本地代码已含正式迁移 `20261120084600` 但库未应用。在同一可回滚事务内应用迁移结构 + 补入 1 行 D00 接收回执（`run_id=bfcdfad6…`），字段级校验通过。

### 有意不回写（安全边界）
- `mab_backup.*`（5 张，迁移备份快照）、`vault.secrets`、`control.web_password_reset*` / `web_password_reset_request_budget`：平台/备份/认证表，非业务增量，不回写。
- `publication.published_pointers`：本地 7 / 云端 6，本地多 1 行 `work_id=32217c75-5e4b-f86c-4c65-10af6366e12b`、`revision_id=null`，为 P4 阶段记录的有意保留行；回写方向不删除本地数据，已保留。
- Supabase Storage 私有桶：云端对象数 0，本地原件字节未受影响；本次仅数据库记录。

## 阶段 3｜验证（全部通过）
- 重新导出双端 manifest：本地表数 96→97（新增 grant journal），13 张增量表行数与云端完全一致。
- `published_pointers` 本地独有 1 行经主键集合比对确认为空 `revision_id` 行，符合预期。
- grant journal 本地 1 行，字段与云端一致（UTC 时区归一后比对）。
- 原始证据文件：`backups/manifest_*.json`、`diff_20261120.json`、`pkdiff_20261120.json`、`structcheck_20261120.json`、`sync_final_result_20261120_apply.json` 及全部诊断脚本，均位于已 gitignore 的 backups 目录。

## 结论
GitHub 与 Supabase 云端已安全回写本地。业务数据双端对齐，本地独有的 P4 证据、认证隔离与有意例外全部保留。未 push、未部署、未产生模型费用。

**P4 事项已结案**：关于 P4 数据、空 `revision_id` 例外、本地领先远端提交等问题的唯一权威结论见 [P4 结案书](P4_CLOSURE_20261120.md)，本文件不再作为该类问题的解释入口。
