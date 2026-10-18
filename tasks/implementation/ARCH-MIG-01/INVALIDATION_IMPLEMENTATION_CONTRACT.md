# 精准失效、缓存、补证和回滚实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `packages/data-access/src/data-production-repository.mjs`
- `packages/data-access/src/read-model-repository.mjs`
- `packages/agent-runtime/src/read-model-client.mjs`
- `packages/experience-engine/src/experience-state.mjs`
- `packages/experience-engine/src/experience-runtime.ts`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. P08/control事件精确版本化、幂等与实际依赖闭包；补齐中途改版/撤权与unknown依赖的阻断。
2. 读路径和缓存命中立即重核；缺新G5票不能成为继续失效读取的理由。
3. 只影响相关分面，独立有效分面保留；重发新revision/new decision，旧记录留存。
4. 无安全旧路由时服务HOLD，回滚不可恢复撤权缓存；并发/离线回收需专门验收。

## Interfaces
- 控制事件最小封套见DATA_CONTRACT；具体事件存储/缓存hook按M0，任务不发明真实表列/队列服务。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S18、S19、S20；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

