# 独立Gate、用途与事件工程承载实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `pipelines/data-production/adapters/adapter-contract.mjs`
- `pipelines/data-production/executors/create-stage-executor.mjs`
- `packages/data-access/src/data-production-repository.mjs`
- `packages/data-access/src/lineage-validator.mjs`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. M0确认独立reviewer与审计权限，不假设存在独立服务；缺绑定阻断，不由Stage签票。
2. 按gates v3和qualification schema验证五态/用途/consumer/time/current dependency，跨字段语义不靠schema形状代替。
3. 正式BR 325/56原状态保持，方法路由与图谱节点不作自动allowlist。
4. 签发竞争和追加审计事件顺序、当前资格投影、失效先阻断必须有受测实现。

## Interfaces
- 审查请求输入artifact_ref/method/rule/purpose/scope/consumer/snapshot/effective_time，输出独立decision_ref及五态；具体服务/DB绑定M0落实。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S13、S15、S16、S29、S35；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

