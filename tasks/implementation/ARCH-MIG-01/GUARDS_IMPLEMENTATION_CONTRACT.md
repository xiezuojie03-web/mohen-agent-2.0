# Guard、脚本入口与旧状态残留实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `package.json`
- `scripts/check-acquisition-intents.mjs`
- `scripts/check-doc-budget.mjs`
- `scripts/check-escalations.mjs`
- `scripts/check-identifier-registry.mjs`
- `scripts/check-links.mjs`
- `scripts/check-name-resolution.mjs`
- `scripts/check-naming-map.mjs`
- `scripts/check-production-registry.mjs`
- `scripts/check-promotion-gate.mjs`
- `scripts/check-reconciliation.mjs`
- `scripts/check-research.mjs`
- `scripts/check-review-triage.mjs`
- `scripts/check-source-gate.mjs`
- `scripts/check-structure-map.mjs`
- `scripts/check-structure.mjs`
- `scripts/guards/check-cross-layer-write-boundary.mjs`
- `scripts/guards/check-e2e-contract-completeness.mjs`
- `scripts/guards/check-gate-enforcement.mjs`
- `scripts/guards/check-no-legacy-production-entry.mjs`
- `scripts/guards/check-physical-data-model.mjs`
- `scripts/guards/check-production-registry.mjs`
- `scripts/guards/check-runtime-data-boundary.mjs`
- `scripts/guards/check-stage-handoff.mjs`
- `scripts/test-isolated.mjs`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. package.json两套root/guards校验都检查新六阶段与退役引用，不只新增一个从未执行的guard。
2. check-stage-handoff旧只检查prev.output/cur.input有值不足，增加types/qualification/explicit mapping/negative cases。
3. check-gate-enforcement旧mock/旧PASS views重新按新G测试，同时测真实API/读取服务接线。
4. check-runtime-data-boundary/check-cross-layer-write-boundary不能把control通配写权限当独立审核。
5. root structure/registry/identifier/naming/links/docs-budget守卫逐路径适配，保持预算，不能为通过删除必需规则。

## Interfaces
- 现有package脚本入口维持可调用；如命令新增/改名必须同批任务清单登记并测试。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S34；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 完整Schema验收
后续工程必须用支持Draft 2020-12的完整校验器验证目标schemas与实际配置/正反例；本轮仅JSON解析、使用到的关键词定向结构断言和9个变异负例，不宣称全标准验证。区间顺序、当前依赖和独立权限另作行为测试。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

