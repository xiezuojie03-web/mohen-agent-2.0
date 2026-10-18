# 版本化成果、独立审计与实际DB接口实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `packages/data-access/src/acquisition-gate.mjs`
- `packages/data-access/src/data-production-repository.mjs`
- `packages/data-access/src/index.d.mts`
- `packages/data-access/src/index.mjs`
- `packages/data-access/src/index.ts`
- `packages/data-access/src/lineage-read-repository.mjs`
- `packages/data-access/src/lineage-validator.mjs`
- `packages/data-access/src/read-model-repository.mjs`
- `packages/data-access/src/source-gate.mjs`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. data-production-repository.recordGate禁止ON CONFLICT覆写，追加事件与前序引用；新增实际列/表仅M0核定。
2. legalInputForD03/D04/D05旧G1/G2/G3视图语义需按新L/G重绑，D01/D02也必须核当前输入，而非仅看stage。
3. read-model-repository不只join旧g4_pass_read_models按object_id；必须revision/purpose/scope/consumer/snapshot/time匹配。
4. lineage-validator禁止空依赖/任意历史PASS满足必须依赖；加新L1与代际、用途、时效校验。
5. lineage-read补reading/source-version/region与直接world pointer，不借返证开放查底层；禁止静默丢失节点。
6. index.mjs现有queryRows与repository期望db.query/rows不同；提供明确受测注入适配，不能自改连接/端口。

## Interfaces
- createDataProductionRepository(db)仍依query接口；新增输入合同须文档化request对象并返回refs/审计ID。
- createReadModelRepository(db).listRuntimeEligible/getRuntimeEligible须必传消费资格上下文，调用方全部联动；兼容调用缺上下文必须BLOCKED而非开放读取。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S17、S33；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

