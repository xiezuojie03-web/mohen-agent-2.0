# 六阶段编排、方法选路与故障恢复实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `pipelines/data-production/adapters/adapter-contract.mjs`
- `pipelines/data-production/adapters/persistence-contract.mjs`
- `pipelines/data-production/executors/create-stage-executor.mjs`
- `pipelines/data-production/executors/d01-source-intake.mjs`
- `pipelines/data-production/executors/d02-material-understanding.mjs`
- `pipelines/data-production/executors/d03-world-construction.mjs`
- `pipelines/data-production/executors/d04-humanistic-discovery.mjs`
- `pipelines/data-production/executors/d05-read-model-publication.mjs`
- `pipelines/data-production/orchestrator/contracts.mjs`
- `pipelines/data-production/orchestrator/load-executor.mjs`
- `pipelines/data-production/orchestrator/orchestrator.mjs`
- `pipelines/data-production/orchestrator/registry.mjs`
- `pipelines/data-production/orchestrator/run-state.mjs`
- `pipelines/data-production/reporting/human-review-report.mjs`
- `pipelines/data-production/reporting/machine-report.mjs`
- `pipelines/data-production/reporting/write-reports.mjs`
- `pipelines/data-production/run.mjs`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. run.mjs接受scope/resume/requested_outputs/current snapshot并默认新链禁用。
2. registry.mjs由固定5 job改为六Owner，并真正校验schema、方法/source版本、引用与独立Gate绑定。
3. contracts.mjs六阶段且成果/资格/run处置分离，assertHandoff不能仅检查outputs含键。
4. orchestrator.mjs不再顺序转发首个output；按显式角色路由、多产物/部分HOLD/合法局部重算，resume重核。
5. create-stage-executor与Adapter分离typed candidate和独立审核，不沿用raw.disposition自授PASS；D00/D01新entry，旧d01-source退出新代际。
6. run-state及reporting记录方法/refs/版本/快照与空结果/partial/重试及新旧代际；持久化和独立审计分Owner。

## Interfaces
- runProduction({run,registry,context,from_stage,to_stage})保留入口形状，context须显式提供合法resume及独立服务；返回stage_results不能默认所有输出可用。
- createStageExecutor(stage)仍生成stage-owned execute，但方法结果与Gate决定不同来源；原requireStageAdapter只查stage函数不够，补方法/画像绑定核验。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S01、S02、S03、S08、S09、S10、S11、S12、S36；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

