# MAB M5｜HP07／HP11／HP12 只读工程核查与 Codex 继续施工输入

> 核验日期：2026-11-04。核验GitHub源基线 `main@edce77451fba459b9027192923d9a8faa5e38a29`，对应 Actions `41842068185` SUCCESS。
> **本件仅READ_ONLY_AUDIT；不是新源码、测试PASS、生产准出或Owner验收。** 前一聊天环境尝试提交补强源码与13类PG矩阵时，GitHub写入调用被安全检查拒绝，HEAD当时未改变；严禁把这些未提交修改写成CODE_PRESENT。

## 1. WorkRevision → L5 → 独立G5的真实状态（HP07／HP12）

- `apps/web/lib/work-publish-qualification.ts` 中 `requireIndependentWorkPublicationG5` 和 `requireCurrentWorkConsumerQualification` 当前均返回 `independent_g5_required`；这是有意的安全失败关闭，**不是待关闭开关**。
- `apps/web/lib/publication.ts` 检查精确提交修订、文字出处、作品Reviewer审核与媒体声明，但作品Reviewer/媒体字段不能充当独立专业G5；`listWatchEligible` 是逐项资格校验的公开消费入口。旧发布指针不能自动获得资格。
- `packages/data-access/src/qualification-read-context.mjs` 已列明 `producer/watch/visual_stage/agent/evidence_on_demand` 的非空目的与范围；`packages/data-access/src/read-model-repository.mjs` 用 `control.qualification_current` 和 `control.qualification_allows` 读取六类合法L5。
- `apps/web/lib/kad1-policy.mjs` 有 `qualificationRefs`、`qualifiedContentSql` 旧桥，`consumerContext` 当前仅处理 `visual_stage/agent`；编辑者自带的 `qualification_refs` 仅是待核资料，绝非对 `work_revision_id + L5 artifact@immutable revision + exact consumer/purpose/scope + dependency snapshot + rights + current G5` 的独立权威证明。
- `apps/web/lib/asset-reflow.ts` 阻断旧的直接写入读模型/自签G5；严禁为打开WATCH恢复旧路径。
- 下一施工：依据现行MHKA和D05/G5合同，补**服务端可信的具名映射及只读当前资格核验**，验证错版、错用途、错消费者、错范围、换版、祖先撤权、媒资权利不足、服务不可用等正反例；缺正式独立Reviewer和可审计签发时保持公开/Agent/Evidence各受影响分面HOLD。不要创建第二Gate。

## 2. Studio 13类长期资产和Admin真实状态（HP11／M4-C04）

- `supabase/migrations/20261102105810_mab_studio_assets.sql` 与 `packages/data-access/src/studio-asset-repository.mjs` 已列同一13种 `asset_kind`。
- 其中十种只能在`studio.asset_revisions`写入**私有、工作中、受限、未评估**候选：`research_brief`、`source_anchor`、`reading_note`、`evidence_note`、`spacetime_candidate`、`relation_hypothesis`、`humanistic_insight`、`research_collection`、`citation_snapshot`、`consented_feedback`。默认 `WORKING / RESTRICTED / UNKNOWN_DEPENDENCY / UNASSESSED`，不等于知识生产Gate或跨项目复用许可。
- 另外三种 `director_plan / media_selection / work_revision` 被通用saveRevision以 `STUDIO_CANONICAL_BINDING_REQUIRED` 拒绝，分别应由既有导演、媒资、不可变作品修订规范入口负责，不能生成第二套正文。
- `apps/web/app/api/studio/assets/route.ts` 支持Owner私有资产、history和use_events；`apps/web/app/api/admin/assets/route.ts` + `apps/web/lib/admin-assets.ts` 仍是 `public.assets` 图像候选台账，不是13类历史人文知识条目完整后台。不得因同名“asset”合并两个不同Owner、权限或真实资料责任。
- `tests/data-production/studio-asset-repository.integration.mjs` 已有CAS、请求幂等、历史、跨Owner、使用事件私有读、单个`work_revision`通用写入拒绝；**没有13种逐类的真实PG和应用级完整验收**。
- 下一施工：在现有标记一次性隔离PG/Chromium中做10种私有候选逐类 `save→revision/history→owner隔离→未获G5`、3种规范对象通用写入拒绝；测试精确来源、依赖、权利、use_events，与原ST-01—ST-09/API合同双向核销；Admin提供受限可解释的条目/来源/版本/资格缺口视图，保留旧图片台账且不创建平行知识库。

## 3. Codex严格执行次序与证据要求

1. `git fetch origin`，以**实时最新main**和本件实际核验基线对比，先审 `tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md`、`PLAN.md`、`progress.md`、`target-diff.csv`、`CURRENT.md`，保留所有更新与其它Agent工作树，不回滚到历史SHA。
2. 不重复 `608ff72f` 导演提交、`08fa04e` fork/restore 的真实PG/Chromium已验子项；准确历史主CI `41841366673`，隔离HTTP `41841366704`（13PASS/1StorageSKIP）。它们不能证明13类资产或正式G5。
3. 先按现行规范补 WorkRevision↔L5↔current G5的服务端权威映射和每消费者用途/范围/权利的正反测试，同时保留所有未核公开调用拒绝；再补13类型真实PG/HTTP业务、Admin接线、ST-01—09及M6接口动作责任。
4. 对每个实际写入提交保存 Git SHA、成功与失败Actions原始run、PG/HTTP实际覆盖、回滚策略，原位维护 `progress.md` 和 `target-diff.csv`；只在已有 `PLAN.md` 的对应任务更新状态，不新建权威阶段。
5. M1—M4所有生产固定条件、正式原件Storage/Reviewer、Provider凭据外发和预算、M5正式公开及M6—M8仍依原合同HOLD；不得自行迁移生产、签发Gate、解除安全守卫、访问私人原件或花费外部模型。

本件是对前轮未能写入GitHub的只读审查的保全回执；与现行`PLAN.md`、MHKA／KAD6不形成新权威冲突。技术交接可执行但不意味着`HANDOFF_READY`或正式整体PASS。
