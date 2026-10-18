# 报告、模板及测试实际覆盖实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `pipelines/data-production/reporting/human-review-report.mjs`
- `pipelines/data-production/reporting/machine-report.mjs`
- `pipelines/data-production/reporting/write-reports.mjs`
- `tests/data-production/fixture-adapters.mjs`
- `tests/data-production/gate-enforcement.test.mjs`
- `tests/data-production/mock-db.mjs`
- `tests/data-production/orchestrator.test.mjs`
- `tests/data-production/phase-e-migration.test.mjs`
- `tests/data-production/physical-model.test.mjs`
- `tests/end-to-end/fixture-system.mjs`
- `tests/end-to-end/phase-g-e2e.test.mjs`
- `tests/experience/phase-f-alignment.test.mjs`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. 六阶段模板/JSON schema与实际report builder字段统一；机器/human从同run refs派生。
2. fixture独立G模拟可用于工程，但不得标真实G5；空结果、partial、blocked与未执行分别报告。
3. 新六阶段/画像/63方法绑定、选择性发布、撤权/返证、API/页面及回滚负例归自动测试。
4. 旧mocks fixture adapters写raw.disposition PASS不能证明独立Gate；变更fixture仍保留代际明确的旧基线测试。

## Interfaces
- buildMachineReport/buildHumanReviewReport返回结构必须通过对应schema；run层状态与逐对象资格不得混同。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S07；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

