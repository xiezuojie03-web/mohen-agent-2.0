# Agent、体验与当前资格双读实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `packages/agent-runtime/src/evidence-on-demand.mjs`
- `packages/agent-runtime/src/index.ts`
- `packages/agent-runtime/src/llm.ts`
- `packages/agent-runtime/src/read-model-client.mjs`
- `packages/agent-runtime/src/select.ts`
- `packages/agent-runtime/src/types.ts`
- `packages/agent-runtime/src/understand.ts`
- `packages/experience-engine/src/composition-recipes.ts`
- `packages/experience-engine/src/evidence-aware-replan.ts`
- `packages/experience-engine/src/experience-beats.ts`
- `packages/experience-engine/src/experience-runtime.ts`
- `packages/experience-engine/src/experience-state.mjs`
- `packages/experience-engine/src/index.ts`
- `packages/experience-engine/src/participation-feedback.mjs`
- `packages/experience-engine/src/surface-eligibility.ts`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. read-model-client现assertL4Resource及L4命名更新新L5，但名称兼容不改变资格要求；旧无ctx调用失败关闭。
2. evidence-on-demand不再要求必须finding_ids；按实际依赖支持世界事实/解释返证，并含L1读取和局部定位。
3. trace链中missing不再continue而返回缺口或BLOCKED，不把局部链称完整。
4. types/select输入Material须带发布修订/分面/资格信息，LLM polish只润色合法事实，不用epistemic标签代替当前授权。
5. experience-runtime/state与participation-feedback保持用户布局，补版本化L5快照及撤权；L6/L7/L8新逻辑不授权新Schema。

## Interfaces
- createReadModelClient(repository)的list/get将consumer context透传；禁止默认全公开。
- createEvidenceOnDemandService(lineageRepository).traceFromPointer须带consumer context与确切refs；旧pointerId-only调用受控迁移。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S14、S21、S31；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

