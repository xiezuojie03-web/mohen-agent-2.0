# M0、受控应用与恢复验收实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `supabase/migrations/008_cultural_world_objects.sql`
- `supabase/migrations/202609210001_foundation.sql`
- `supabase/migrations/202609210002_data_factory.sql`
- `supabase/migrations/202609210003_human_review.sql`
- `supabase/migrations/202609220004_knowledge_weave.sql`
- `supabase/migrations/202609220006_visual_linkage.sql`
- `supabase/migrations/202609220007_historical_spatial_reconstruction.sql`
- `supabase/migrations/202610020008_visual_asset_promotion_gate.sql`
- `supabase/migrations/202610020009_review_queue_triage.sql`
- `supabase/migrations/202610030010_research_workspace.sql`
- `supabase/migrations/202610040001_research_bridge_queue.sql`
- `supabase/migrations/202610050011_second_promotion_gate.sql`
- `supabase/migrations/202610070100_data_production_v2_baseline.sql`
- `supabase/migrations/202610070200_legacy_v1_to_v2_backfill.sql`
- `supabase/rollback/202610070200_legacy_v1_to_v2_backfill.rollback.sql`
- `verification/README.md`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. 直接采用用户确认的同步停工工程基线；M0只读给环境/Schema/新架构回退与保护清单，不重新审计分支/HEAD/未提交，不checkout/stash/reset/SQL/部署。
2. 真实DDL与回填/回滚SQL由核实后的CodeBuddy受控编制，不把旧SQL改号后交付执行。
3. 按批比较schema/data refs/qualification counts与回退资格，原件及历史审计不可删。
4. 旧hushang-jingwei Production保护，不发布Production；不因设计文件准备授权任何外部副作用。

## Interfaces
- M0 evidence tables必须精确限定真实实例与版本，未知TO_VERIFY_IN_M0；无可核保护与恢复方案STOP。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S30；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

