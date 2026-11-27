# PDW-02｜Studio设计与工程自检报告

> 报告编号：PDW-02-20261127-01  
> 审查基线：GitHub main 7ebacda9a9c3f718778462b87c2d8fad21006e5f  
> 审查日期：2026-11-27  
> 交付状态：**PASS_WITH_GAPS / OWNER_REVIEW_REQUIRED**  
> 范围：设计与工程只读自检；未修改业务代码、数据库、API、权限、CI或部署。

## 1. 审查结论

| 维度 | 结论 | 判断 |
|---|---|---|
| 设计完整度 | PARTIAL | 桌面三工作区和四阶段主线已存在，但项目、研究、知识资产、作品编辑与恢复尚未构成连贯的创作环境。 |
| 工程实现度 | PARTIAL / P0_BLOCKED | 项目、研究、来源获取、生产调用、导演方案、修订、审核和WATCH读取均有真实代码；关键Schema与云端资格链存在阻断。 |
| 运行验证 | NOT_RUN | 当前没有与本次main基线一致的READY部署；未能进行当前main的登录浏览器实测。数据库只读Schema与数量核验已完成。 |
| Studio真实生产闭环 | NOT_PASS | 不能据现有证据认定用户可以在当前云端环境稳定完成从自然语言委托到WATCH发布消费的全流程。 |

**最终判定：PDW-02 = PASS_WITH_GAPS / OWNER_REVIEW_REQUIRED。**

该状态只表示本轮自检已形成可追溯的设计—代码—数据库差距判断和后续施工建议；不表示Studio工程完成、生产闭环通过、数据库迁移获批或云端运行PASS。

### 核心结论

1. Studio并非空壳。项目管理、Agent研究、来源候选、合法原件保存、D00—D05生产调用、A/B导演方案、分镜生成、作品修订、Admin审核与WATCH消费已有真实代码和持久化模型。
2. 现有能力没有被组织成完整的创作体验。聊天上下文不连续、研究过程反馈不足、研究记录与知识资产分离、作品编辑界面缺失、恢复不完整，用户仍需跨入口和技术阶段自行推进。
3. 当前云端交付链有P0阻断：正式投稿资格补齐代码仅允许loopback隔离数据库；连接的mohen-cloud数据库又缺少main代码要求的项目/正式修订绑定列。
4. Admin与WATCH的正式业务连接值得继承，不应为Studio改版重建；优先修复Studio上游与M5既有合同的集成缺口。

## 2. 审查依据与方法

### 2.1 正式设计依据

- MAB PLAN V1.8 §3.6 PDW-02：真实创作旅程、代码级证据、根因分类、Owner可判断的用户任务及M5缺口回归主线。
- MHKA-02《Humanistic Product and Experience》§3、§7、§9：Studio三工作区、连续创作、角色职责、状态与异常表达。
- MHKA-03《Knowledge World and Data Architecture》：知识资产身份、来源、版本、资格、回流和可追溯性。
- MHKA-04《Agent and Professional Capabilities》：情境感知、任务理解、工具执行、持续跟踪、确认与恢复。
- KAD2《混合任务委托、执行、成果回流与Studio全链合同》：Studio从委托到作品交付的合同边界。
- CEI E《Studio与Admin专项》：已提出的Studio体验问题，作为历史设计证据；本报告重新核对代码，不直接沿用其结论。
- PDW-01正式入口报告V0.1（现行内容V0.3）：全站视觉方向为整体明亮、清润，深青绿局部沉浸，弱化暖金。

### 2.2 工程与运行证据

- GitHub main：审查基线 7ebacda9a9c3f718778462b87c2d8fad21006e5f；按CURRENT、PLAN、PDW-01入口定位文件后定向读取页面、组件、API、服务、数据库调用与正式发布链。
- Vercel：最新READY Preview对应代码提交e563161c；与本次main基线比较，main领先175个提交。该Preview不能代表本次main运行状态。
- Supabase：对已连接的mohen-cloud执行只读表结构、迁移记录、数据量、RLS与角色权限查询；未执行DDL、DML或数据修复。
- 浏览器：未完成当前main版本的登录后浏览器实测；不得把静态代码或旧部署推断为运行PASS。

### 2.3 审查边界

本轮只沿Studio调用、状态传递和交付衔接检查必要代码；不重新验收D00—D05、Gate、Runner底层能力，不改业务代码，不改数据库，不启动其他PDW工作包。

## 3. Studio用户旅程审查

| 用户步骤 | 当前体验与实现 | 主要差距 | 结论 |
|---|---|---|---|
| 第一次进入Studio | 主入口为创作Studio；桌面三栏分别承载对话、研究进展、作品；顶部有四阶段状态轴。 | 定位可理解，但页面没有把项目、任务、材料、知识成果、作品版本解释成一个完整工作空间。 | 部分符合 |
| 发起创作 | 输入一句话后自动创建Project并创建Research Task；Owner身份由服务端会话确定。 | 前端对话记录没有随新问题传给后端；每次提问实际创建独立研究任务。 | 有真实能力，协作连续性不足 |
| 继续已有项目 | 可列出、改名、重新打开项目；恢复时核验任务与Project绑定。 | 仅恢复一个研究任务、研究结论和生产状态；没有恢复A/B方案、已选方案、分镜编辑状态和作品修订。 | 部分符合 |
| 提交来源材料 | 有附件读取、来源候选、许可提示、原件获取、来源登记和页码绑定能力；/studio/desk另有导入与资料记录。 | 主工作台与资料台是分开的入口；用户需理解原件、来源版本、绑定状态和页码等工程概念。 | 工程较完整，体验割裂 |
| 等待研究 | 后端保存研究任务、checkpoint、事件和工具回执。 | 前端没有消费research-tasks/:id/events；研究请求等待完整HTTP结果，无法连续展示真实研究事件。 | 反馈不足 |
| 查看证据与知识成果 | 主界面展示材料类别、认识状态、来源和缺口；资料台有项目笔记与研究计划。 | 研究任务结果主要保存在checkpoint/事件中；没有证据证明主流程会自动把研究发现转成可复用、可版本化的知识资产。 | 部分符合 |
| 选择创作方向 | H1/H2生成A/B导演方案，用户可选方案；H3生成分镜。 | 方案与分镜主要是只读展示，缺少可见的逐段编辑、局部重写和保存体验。 | 部分符合 |
| 修改、保存、恢复作品 | 后端有rewrite-beat、panel、revision、restore等API。 | StudioWorkbench没有调用这些编辑API，也没有分镜编辑控件；项目恢复不恢复作品编辑上下文。 | 不符合 |
| 提交审核 | 有作品草稿、不可变修订、正式资格、投稿快照和审核API。 | 当前main的云端资格链和数据库Schema有P0阻断；不能证明用户能在云端完成提交。 | 未通过 |
| Admin审核与发布 | Admin界面、独立Reviewer签核、正式裁决和发布调用链存在。 | 上游Studio投稿阻断，且当前main无匹配READY部署，无法完成同一作品现场验收。 | 代码链存在，运行未验证 |
| WATCH消费 | WATCH读取正式可消费作品，并有撤权/发布指针逻辑。 | 无法证明本次main生成的同一Studio作品已在当前部署中完整经历发布与消费。 | 代码链存在，运行未验证 |

## 4. 设计要求—工程实现对照

| 设计要求 / 来源 | 代码位置与实际实现 | 运行证据 | 差距与结论 |
|---|---|---|---|
| Studio是研究室与创作编辑部；MHKA-02 §3 | apps/web/app/studio/page.tsx、StudioWorkbench.tsx；桌面三栏对话/研究/作品。 | 静态代码；无当前main浏览器实测。 | 桌面空间骨架符合；项目、材料、知识资产、作品编辑和恢复没有形成统一工作空间。PARTIAL |
| Project/Root/Task绑定；KAD2 | /api/studio/projects、/api/studio/research-tasks；studio-research.ts；Studio项目Owner由服务端会话核验。 | Supabase实际存在17个Projects、44个Research Tasks。 | 有真实持久化；恢复逻辑只重建研究任务，不重建完整作品上下文。PARTIAL |
| Agent理解与持续协作；MHKA-04 | StudioWorkbench.ask()只向/api/studio/research-tasks提交当前prompt、topic、project_id和幂等键；未提交前端messages或conversation_id。 | 静态调用链。 | 页面聊天记录与后端任务上下文不一致；连续对话主要是UI连续，不是同一Agent会话连续。P1 |
| 研究过程反馈；MHKA-02 §9 | 后端有research_events与GET /api/studio/research-tasks/:id/events。 | 代码确认事件API存在。 | StudioWorkbench没有调用events接口；用户看不到连续事件进度。P1 |
| 合法来源与原件绑定；KAD2 / 来源权利合同 | source-selection、source-acquisition、attachments、studio-commons-acquisition.ts、studio-shl-acquisition.ts。 | 静态代码；未进行浏览器/真实Provider操作。 | 权利提示、原件保存和来源登记的工程基础可继承；主工作台与/studio/desk入口割裂。PARTIAL |
| D00—D05/G0—G5生产调用；既有M5合同 | /api/studio/research-tasks/:id/production、studio-production.ts及现有生产运行/回执接口。 | 仅追踪Studio调用和状态读取；不重新验收底层生产能力。 | 调用入口存在；本轮不据此宣称当前main云端生产通过。NOT_RUN |
| 知识资产与研究成果回流；MHKA-03 | /api/studio/assets、ProjectNotebook、ResearchPlan、studio/assets相关存储；研究任务checkpoint/receipt保存研究状态。 | Supabase存在项目、研究任务及知识相关表；未做逐条资产质量验收。 | 项目笔记/资产接口存在，但主研究任务结果到版本化知识资产的自动衔接证据不足。PARTIAL |
| H1/H2/H3导演方案；MHKA-04 / KAD2 | /api/studio/director-plans、studio-director.ts：创建A/B方案、保存选择和beats；有Project、delegation、root task及research snapshot绑定设计。 | main代码存在；数据库字段核验发现缺失。 | 生成与持久化设计存在，但当前mohen-cloud Schema不满足代码要求。P0 |
| 作品修订与编辑；KAD2 | /api/studio/works/:id/revisions、rewrite-beat、revision/panel等API；commitWorkRevision写入publication.work_revisions并做版本冲突核验。 | 静态代码。 | 主界面没有调用rewrite-beat、panel编辑或revision恢复API；预览不能等同可编辑工作台。P1 |
| 正式投稿资格；ST-08 | publication.ts submitWork()调用studio-formal-qualification.ts ensureStudioWorkQualification()。 | 静态代码明确确认隔离条件。 | isolatedDatabaseOk()只接受loopback且数据库名含dev/isolat/test；云端不满足时失败关闭。P0 |
| Admin独立审核与发布；ST-09 | AdminWorkbench.tsx → /api/governance/gates/decisions → gate-review.ts signWorkPublication() → formalDecide()；发布调用publishWork()→formalPublish()。 | 静态调用链；数据库有5条editorial_decisions、3条publication_snapshots。 | 正式业务链存在，值得继承；当前main云端运行未验证。PARTIAL |
| WATCH合法消费；M5 / WATCH合同 | WatchGallery.tsx调用/api/works/published；路由调用listWatchEligible()，正式修订通过资格过滤。 | 静态调用链；无当前main浏览器实测。 | 消费入口与正式发布模型连接；同一Studio作品端到端未验证。PARTIAL |
| 窄屏三工作区；MHKA-02 §3 | apps/web/app/studio.css：max-width:1100px时studio__body变为单列；max-width:767px时顶部阶段轴换行。 | 静态CSS。 | 三工作区纵向堆叠，不是合同要求的窄屏工作区切换。P2 |
| 明亮清润视觉；PDW-01 | studio.css使用mo-paper-50、mo-white、teal token；局部作品预览保留深色沉浸表达。 | 静态CSS；无当前main视觉实测。 | 基础色彩方向总体一致；后续应先解决结构和交互，再微调密度、层级与局部沉浸面。P3 |

## 5. 生产闭环逐阶段核验

| 阶段 | 当前入口/处理/持久化 | 下一阶段衔接 | 验证状态 |
|---|---|---|---|
| Creator/Owner进入Studio | 登录会话与角色校验；/studio主入口。 | 创建或选择Project。 | 代码存在；未浏览器实测 |
| Project/Root | /api/studio/projects、research_tasks；Root/委托绑定由studio.delegations承载。 | 研究任务和合法来源。 | 数据库有17个Projects、44个Tasks；完整恢复未通过 |
| 合法来源素材 | 附件读取、候选选择、来源获取、rights提示、私有原件和来源版本绑定。 | D00/G0。 | 代码存在；真实上传/Provider未运行 |
| D00/G0 | Studio生产申请调用既有生产入口和资格前置检查。 | D01/G1。 | 只核调用衔接；底层不重验 |
| D01/G1 | 通过既有生产运行与状态读取衔接。 | D02持久化回执。 | 只核调用衔接；底层不重验 |
| D02 | 任务状态、checkpoint、receipt、事件记录有持久化结构。 | D03—D05。 | Schema/运行环境未完成同一任务实测 |
| D03—D05 | 继续使用既有生产运行与Gate链；Studio读取生产状态。 | 合格知识资产。 | 不重新审计底层；Studio端到端未验证 |
| 知识资产 | assets API与项目笔记存在；研究结果保存在任务checkpoint/receipt。 | H1/H2/H3。 | 自动回流和版本化资产衔接证据不足 |
| H1/H2/H3 | director-plans创建A/B方案、选择方案、生成beats并持久化。 | 作品修订。 | main代码存在；mohen-cloud缺绑定字段 |
| 作品修订/编辑 | 创建草稿、commitWorkRevision、revision API；主UI展示分镜。 | 投稿审核。 | 编辑UI未接线；DB缺project_id/formal_revision_id |
| Admin审核/发布 | Reviewer签核、正式裁决、发布指针与权利核验。 | WATCH。 | 代码链存在；当前main运行未验证 |
| WATCH消费 | /api/works/published读取合格正式作品；撤权接口存在。 | 撤权后停止消费。 | 代码链存在；同一作品实测NOT_RUN |

**闭环判断：** 不是底层生产模块不存在，而是Studio前端协作与编辑体验、正式资格链的云端执行条件、当前数据库Schema和可运行部署尚未形成一致的可验收闭环。

## 6. P0/P1/P2/P3问题分级

### P0｜阻断核心生产闭环

**P0-01｜正式作品资格补齐仅允许loopback隔离数据库。**

- 证据：apps/web/lib/studio-formal-qualification.ts中的isolatedDatabaseOk()检查DATABASE_URL主机为localhost/127.0.0.1/::1且数据库名含dev/isolat/test；ensureG5Signed()在非隔离环境返回machine_signing_isolation_required。
- 调用关系：apps/web/lib/publication.ts的submitWork()调用ensureStudioWorkQualification()；Studio投稿入口最终进入该路径。
- 影响：Vercel/云端数据库不满足loopback条件时，Studio正式作品无法通过该资格补齐路径完成投稿。
- 处理：将正式资格补齐接入既有独立Reviewer/Gate授权服务；保留Producer/Reviewer分离，不删除隔离保护、不自签、不绕过G5。

**P0-02｜连接的mohen-cloud Schema不满足当前main正式作品绑定合同。**

- 数据库迁移记录最新为20261120045054；main已有20261123120000_mab_m5_st05_st07_project_and_body_authority.sql与20261123130000_mab_m5_director_plan_formal_body_authority.sql。
- 实际缺少publication.works.project_id；public.director_plans缺delegation_id、root_task_ref、research_snapshot_hash、research_source_refs；studio.work_revisions缺formal_revision_id。
- 代码影响：createWorkDraft()、isDirectorPlanProjectBindingReady()及ensureStudioWorkQualification()依赖上述字段，缺失时会失败关闭或无法建立正式修订封套。
- 处理：先确认持久化非生产集成环境与Vercel Preview的实际数据库映射；按PLAN迁移纪律在隔离环境验证上述迁移，不得未经授权直接应用到生产数据库。

### P1｜严重影响核心使用体验或后续施工

**P1-01｜连续对话未形成连续Agent上下文。** StudioWorkbench.ask()只提交当前prompt和Project标识，不提交历史messages/conversation_id；每次新提问重置currentResearch并创建新研究任务。

**P1-02｜研究事件未进入界面。** 后端events API已存在，主工作台未消费；研究过程反馈不是实时可观察的阶段事件。

**P1-03｜作品预览缺少真正编辑与保存体验。** rewrite-beat、panel和revision API存在，但StudioWorkbench未接线；界面没有可用的分镜编辑器。作品提交路径承担了草稿创建/修订提交，用户无法自然地在同一工作面持续编辑。

**P1-04｜项目恢复不完整。** reopenProject()只恢复一个研究任务、decision和production readback；不恢复导演方案、已选A/B、beats、作品修订及未完成编辑。

**P1-05｜RLS与Project隔离防线需补强。** Supabase Security Advisor标记10张表未启用RLS。只读权限查询未发现这些非公开Schema向anon/authenticated开放USAGE或表权限，因此没有证据证明直接公众泄漏；但Studio/Publication关键表仍缺数据库行级防御，且部分mohen_app_runtime策略为宽泛USING true。必须设计Project/Owner作用域策略后再处理。

### P2｜重要体验与结构改进

**P2-01｜内部工程术语直接暴露。** 主工作台研究详情显示D00—D05、G0—G5、H1/H2/H3等；普通创作者不应需要理解这些内部代号才能判断下一步。

**P2-02｜主工作台与资料台分离。** /studio自动创建项目；/studio/desk又提供项目笔记、研究计划、材料导入和记录入口。应合并为同一Project工作空间中的不同视图，而不是两个独立的主入口。

**P2-03｜窄屏工作区机械纵向堆叠。** CSS在1100px以下将三栏变成单列；没有实现三工作区切换，长页面会降低连续操作效率。

### P3｜一般视觉与细节优化

**P3-01｜视觉基础可继承，但需后续细化。** 当前使用浅纸、白色、青绿令牌，整体方向与PDW-01一致；后续在完成工作流和信息层级修复后，再调整密度、字号、状态强调与局部沉浸预览，不应先做纯装饰性改版。

## 7. 数据库权限核验补充

### 7.1 实际数据规模

| 数据对象 | 行数 |
|---|---:|
| studio.projects | 17 |
| public.research_tasks | 44 |
| public.director_plans | 21（其中仅2条project_id非空） |
| publication.works | 16 |
| publication.work_revisions | 24 |
| studio.director_plans | 3 |
| studio.work_revisions | 5 |
| studio.submission_snapshots | 5 |
| publication.editorial_decisions | 5 |
| publication.publication_snapshots | 3 |

这证明数据库有既有数据，不应以“空库”作为重建理由；但旧对象与当前正式Project绑定合同并不完全一致，不得按题名或Owner弱信息自动回填。

### 7.2 RLS判断

Supabase Security Advisor标记以下10张表RLS未启用：

- publication.publication_schedules
- studio.work_revisions
- studio.director_plans
- control.artifact_content_columns
- studio.submission_snapshots
- studio.execution_controls
- studio.execution_control_events
- publication.editorial_decisions
- publication.publication_snapshots
- publication.withdrawals

额外只读权限查询显示：上述非公开Schema没有向anon/authenticated开放Schema USAGE和表级权限；因此Advisor关于这些表已全部对公众开放的概括性提示未被本次权限查询证实。public.director_plans与public.research_tasks启用RLS但没有策略，默认拒绝anon/authenticated行访问。

仍需补强RLS。以下仅为Advisor提出的RLS启用语句，**不是可直接执行的完整修复**。启用前必须先定义并验证Owner/Project/Reviewer/Operator作用域策略，特别要修正宽泛的USING true策略；本轮没有执行：

```
ALTER TABLE "publication"."publication_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio"."work_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio"."director_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "control"."artifact_content_columns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio"."submission_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio"."execution_controls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio"."execution_control_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "publication"."editorial_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "publication"."publication_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "publication"."withdrawals" ENABLE ROW LEVEL SECURITY;
```

## 8. 运行验证边界

| 项目 | 结果 | 说明 |
|---|---|---|
| GitHub main | VERIFIED | 审查基线为 7ebacda9a9c3f718778462b87c2d8fad21006e5f。 |
| 真实代码调用关系 | VERIFIED_STATIC | 关键页面、API、服务、发布与WATCH调用已追踪。 |
| Supabase Schema/迁移/数量/权限 | VERIFIED_READ_ONLY | 已连接mohen-cloud执行只读查询；未做写入。 |
| Vercel当前main部署 | NOT_VERIFIED | 最新READY Preview为e563161c；与本次main相差175个提交。 |
| 当前main浏览器操作 | NOT_RUN | 未取得与main一致的READY部署，浏览器自动化本轮未能启动；没有登录或提交任何表单。 |
| 同一Project端到端 | NOT_RUN | 未验证同一作品从Studio到Admin再到WATCH的线上连续旅程。 |

注意：mohen-cloud是否就是当前READY Preview实际使用的DATABASE_URL，未通过解密环境变量或线上请求确认。因此本报告将数据库Schema差异作为已连接数据库的确定事实，将其与当前Preview的运行关系标记为未验证。

## 9. 后续施工建议

### 9.1 继承、修改、重构与暂不触碰

| 处理 | 对象 | 裁决 |
|---|---|---|
| 继承 | Project/Task存储、Owner校验、来源候选/权利/原件绑定、D00—D05生产调用、tool ledger、导演生成、作品正式发布模型、Admin审核与WATCH读取 | 保留现有业务能力和数据权威，不另建第二套生产链。 |
| 修改 | StudioWorkbench的Agent上下文、事件反馈、项目恢复、用户状态说明 | 在现有主入口上补齐连续协作和任务推进体验。 |
| 重构 | /studio与/studio/desk的信息架构；只读分镜预览到可编辑工作区；研究成果到资产的衔接 | 统一Project工作空间和作品版本管理，不复制数据库正文。 |
| 暂不触碰 | D00—D05/Gate/Runner底层已验收能力、知识库权威结构、正式发布/WATCH数据模型 | 除Studio调用链发现明确问题外，不重审、不推倒、不建立平行系统。 |
| 暂不施工 | 大面积视觉翻新、EXP、HOME、Admin整体重设计、个人空间 | 不属于PDW-02。 |

### 9.2 建议施工顺序与可验收交付

| 顺序 | 施工阶段 | 必须交付的可验证结果 |
|---|---|---|
| S0 | M5云端集成前置条件 | 确认持久非生产集成环境、Vercel Preview实际DB映射、两份迁移的隔离验证结果；正式Gate签发路径不再依赖loopback，且Producer/Reviewer分离。 |
| S1 | Project与材料入口统一 | 从Studio创建/打开一个Project；在同一空间提交合法来源；材料、权利、原件和来源版本状态清晰可见。 |
| S2 | Agent连续协作与过程反馈 | 同一Project会话保留对话上下文；跟踪真实研究事件；能澄清、确认、暂停、续跑，并解释证据和缺口。 |
| S3 | 研究成果与知识资产衔接 | 研究发现可从任务结果转为有来源、版本、认识状态和资格边界的正式资产；不得把候选线索冒充合格知识。 |
| S4 | 作品编辑与版本恢复 | 用户可修改分镜/面板、局部重写、保存新修订、查看版本差异、恢复指定版本；刷新后仍可继续编辑。 |
| S5 | Admin/WATCH真实交付 | 同一Project同一WorkRevision完成独立资格、正式投稿快照、Admin审核、发布指针、WATCH消费和撤权；全链可追溯。 |
| S6 | 视觉、响应式与可访问性 | 明亮清润、深青绿局部沉浸；桌面三栏、窄屏工作区切换；完成键盘、焦点、空态、错误、权限和不同视口测试。 |

### 9.3 Owner体验验收任务

后续工程方自验后，Owner只需按真实用户任务检查：

1. 新建一个历史人文Project，直接用自然语言描述目标；墨痕能否理解并提出有针对性的必要澄清？
2. 添加一份合法来源材料；能否看懂来源、权利、原件与证据状态？
3. 继续追问；墨痕是否记得当前研究问题、已经找到的材料和未解决缺口？
4. 观察研究过程；能否知道正在做什么、完成什么、为什么暂停、如何恢复？
5. 查看研究成果；能否形成可复用的知识资产，并看见它与作品的关系？
6. 选择导演方向、修改具体分镜、保存版本、刷新后继续编辑；是否不需要重新生成或重新寻找入口？
7. 提交Admin审核，完成独立资格审核与运营发布；WATCH能否消费同一正式修订？撤权后是否停止消费？
8. 在390px窄屏下继续同一Project；工作区是否可以切换，而不是只能不断向下滚动？

### 9.4 施工纪律

- P0-01、P0-02回归M5主线，需先完成环境、迁移与独立Reviewer授权边界核验；不在PDW-02报告中直接授权修改。
- 不把缺失迁移直接应用到生产，不绕过G5，不由Producer自签。
- 不新建第二套Agent Runtime、知识库、作品正文或发布系统。
- 每阶段按PLAN现有规则提交测试、真实运行和失败/恢复证据；没有运行证据写NOT_RUN。
- 在Owner审阅本报告前，不启动代码施工，不启动PDW-03或其他PDW工作包。

## 10. 本轮变更与最终状态

- 新增唯一正式结论文件：本报告。
- 同步更新：MAB PLAN V1.8 §3.6、CURRENT.md、MAB progress.md。
- 未修改业务代码、数据库Schema/数据、API、权限、CI、Vercel部署或环境变量。
- 本轮数据库查询全部只读；没有执行上述RLS SQL或两份迁移。

**PDW-02最终状态：PASS_WITH_GAPS / OWNER_REVIEW_REQUIRED。**

关闭含义：审查交付完成，根因和施工建议有代码/数据库证据，Owner可以据此判断后续任务。Studio工程仍为PARTIAL，真实生产闭环为NOT_PASS，当前main云端运行验证为NOT_RUN。