# 载体/材料方法与可复用能力边界实施合同

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。专业与工程衔接文件准备，非开工指令。基线handoff/local-b-20260930@8966d1b；已获准编制交付ZIP，尚未应用真实代码/PG/Schema/Git/Production；56正式延期DESIGN_HOLD，真实G5及MIG-01 HOLD。

## 前提
用户独立发令，M0验证真实环境/文件差异后才允许实施。本文件是专业任务合同，不是已经实现的源码，不预填真实DDL或命令结果。

## Files（锁定提交已存在，需按事实适配）
- `skills/mohen-acceptance/SKILL.md`
- `skills/mohen-association-discovery/SKILL.md`
- `skills/mohen-data-ingest/SKILL.md`
- `skills/mohen-evidence-gate/SKILL.md`
- `skills/mohen-experience-prototype/SKILL.md`
- `skills/mohen-historical-spatial-reconstruction/SKILL.md`
- `skills/mohen-historical-spatial-source/SKILL.md`
- `skills/mohen-humanistic-discovery/SKILL.md`
- `skills/mohen-humanistic-selection/SKILL.md`
- `skills/mohen-knowledge-weave/SKILL.md`
- `skills/mohen-material-understanding/SKILL.md`
- `skills/mohen-project-guard/SKILL.md`
- `skills/mohen-read-model-publication/SKILL.md`
- `skills/mohen-research-intake/SKILL.md`
- `skills/mohen-source-intake/SKILL.md`
- `skills/mohen-vertical-slice/SKILL.md`
- `skills/mohen-visual-asset/SKILL.md`
- `skills/mohen-world-construction/SKILL.md`

## Consumes
完整目标Protocol/DATA/PERSISTENCE/Gate/Skill和standards原文；当前文件基线以M0核对。

## 必须实施的具体差异
1. 六阶段Owner按target Skill替换；可复用visual/historical-spatial等保持scope，不拥有第二生命周期。
2. 旧material-understanding把C/H混合且自行G1审计的职责退出新链；图片身份对应不能阻止对原件内容作技术读取，身份推断应在W/G3。
3. 转引/载体/材料区分，读取画像与专业证据资格分开；未知阈值保持DRAFT，不沿用旧DateTimeOriginal为唯一历史判据。
4. 旧重复Owner归档，长期资源/provider资料保持配置/参考身份，不能自动晋级来源或Gate。

## Interfaces
- 每个method id/version来源完整standards章节及hash；63绑定与D00来源方法分开计数。

## 验证步骤
- [ ] 直接采用用户已确认的同步停工基线；M0只核本接口的新架构适配条件、真实绑定与保护项，不做GitHub/本地差异审计。
- [ ] 先编写本组场景的失败测试，证明旧行为能被捕捉；不能只做文本字符串搜索。
- [ ] 在获准隔离工程中实现以上差异，保持专业规则与Owner。
- [ ] 执行本组与跨组依赖测试及相应真实API/页面/DB验收；留命令/结果/refs，未执行NOT_VERIFIED。
- [ ] 复核撤权和失败回滚，不恢复已撤资格；FAIL停止该批。

## 场景
S06、S26、S27、S28；完整输入/预期见verification/arch-mig-prep-01/acceptance/scenario-contracts.csv。

## 回执
逐文件REUSE/MODIFY/NEW/ARCHIVE、实际修改、测试证据、剩余NOT_VERIFIED与STOP/回退结果；用户直接审核业务/风险，普通专业技术问题不交用户逐字段做。

