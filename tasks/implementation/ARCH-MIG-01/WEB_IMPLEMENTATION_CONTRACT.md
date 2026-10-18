# 真实网页API与冻结资源加载接线实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `apps/web/app/api/mohen/ask/route.ts`
- `apps/web/app/api/mohen/materials/route.ts`
- `apps/web/app/experience/jinze-water-net/AskBar.tsx`
- `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx`
- `apps/web/app/experience/jinze-water-net/IntentGuide.tsx`
- `apps/web/app/experience/jinze-water-net/MohenPresence.tsx`
- `apps/web/app/experience/jinze-water-net/beats.ts`
- `apps/web/app/experience/jinze-water-net/culturalWorldProjection.ts`
- `apps/web/app/experience/jinze-water-net/humanLabels.ts`
- `apps/web/app/experience/jinze-water-net/intentTranslation.ts`
- `apps/web/app/experience/jinze-water-net/page.tsx`
- `apps/web/app/experience/jinze-water-net/surfaceRegistry.tsx`
- `apps/web/app/experience/jinze-water-net/surfaces/EvidenceNarrativeSurfaces.tsx`
- `apps/web/app/experience/jinze-water-net/surfaces/PresentDayPhotoSurface.tsx`
- `apps/web/app/experience/jinze-water-net/surfaces/SpatialSurfaces.tsx`
- `apps/web/app/experience/jinze-water-net/surfaces/types.ts`
- `apps/web/app/foundation/page.tsx`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/lib/mohen-agent/retrieve.ts`
- `apps/web/lib/mohen-visual/index.ts`
- `apps/web/lib/mohen-visual/label-layout.ts`
- `apps/web/lib/mohen-visual/spatial-canvas.tsx`
- `apps/web/lib/mohen-visual/visual-grammar.ts`
- `apps/web/next-env.d.ts`
- `apps/web/next.config.mjs`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. lib/mohen-agent/retrieve.ts当前UNION读旧public evidence/cultural_*；新链接统一L5资格服务，不据旧verification_status晋级。
2. app/api/mohen/ask/route.ts与materials/route.ts透传用途/消费者/有效时点和snapshot，测试从真实route到response。
3. experience/jinze-water-net/page.tsx读取冻结script/patch/slice/cultural/photos；接合法版本化发布快照或隔离fixture，禁止失败fallback旧JSON。
4. ExperienceShell及相关surfaces/AskBar/culturalWorldProjection保留C4体验/用户偏好，在真正断言/图片/焦点消费处处理精准撤权和返证。
5. 现代图/路线未核不冒历史精度或实测；不重设计UI，只改数据边界接线。

## Interfaces
- retrieveMaterials公开形状应带足资格context；实际调用者ask/materials两条都要迁移并行为验证。
- 页面加载服务输出需包含相同publication revision和每分面权限，不能用Frozen invariant校验代替G5。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S24、S25、S32；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

