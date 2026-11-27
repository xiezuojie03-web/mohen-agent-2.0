# PDW-02｜Studio完整产品体验设计与工程衔接正式入口

> 正式入口编号：PDW-02-20261127-01  
> 现行内容版本：V0.3（增加全局体验底座与Studio结构重构方向索引；保留原自检报告作为诊断输入）  
> 审查基线：GitHub main 7ebacda9a9c3f718778462b87c2d8fad21006e5f  
> 审查日期：2026-11-27  
> 原自检诊断状态：**PASS_WITH_GAPS / OWNER_REVIEW_REQUIRED**  
> PDW-02整体状态：**DESIGN_REVIEW / OWNER_REVIEW_REQUIRED**  
> 范围：设计与工程只读自检；未修改业务代码、数据库、API、权限、CI或部署。

## 1. 既有自检诊断结论（保留为设计输入）

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

---

# 11. Studio完整产品设计交付（V0.2）

> 本节起为PDW-02完整设计交付；第1—10节既有自检报告保留为诊断证据，不重复改写。  
> 设计基线：Studio业务代码 main 2388af125300efb73e27b3c3804982a56f5a9d36。从自检基线 7ebacda9a9c3f718778462b87c2d8fad21006e5f 到该SHA的比较结果为6个提交，变更仅涉及CURRENT、PLAN、progress和自检报告，无Studio业务代码变更。随后原型/概念图提交也仅增加设计文件。

## 11.1 工作面职责与边界

**Studio定位：** 墨痕的历史人文研究室与创作编辑部。用户通过自然语言提出研究/创作目标；墨痕承担情境理解、必要澄清、合法研究组织、证据整理、知识工作资产沉淀、H1/H2/H3编导和作品持续修改。Studio不是D/L/G后台控制台，也不是一个聊天框加若干功能卡片。

| 角色 | Studio内职责 | 明确不拥有的职责 |
|---|---|---|
| Creator / Owner | 创建/选择项目、表达目标、确认研究范围、选择导演方案、编辑作品、授权必要外发、决定是否提交 | 不代替独立Reviewer/Gate签发；不因Owner身份自动获得其他项目访问权 |
| 墨痕Agent（CTX-STUDIO） | 理解目标、读取当前授权项目材料、组织研究、提出澄清/建议、展示依据与缺口、协助H1/H2/H3、接收修改、管理可恢复任务 | 不直接修改正式Truth、不签G0—G5、不替用户授权外发、不越权提交/发布 |
| 内部生产链D00—D05 / L0—L5 / G0—G5 | 按现有Registry/Runner和授权执行受控生产与资格判定 | 不在Studio另建平行生产链 |
| Admin Reviewer / Operator | 接收正式投稿快照，按各自独立职责审核、签发或运营发布 | 不并入Creator的Studio权限；Studio不代行审核和发布 |
| WATCH | 消费合法发布的精确WorkRevision及当前允许分面 | 不读取私有草稿、候选或失效内容 |

边界关系：HOME负责发现与入口；Studio负责研究和创作；EXP是独立探索工作面，本轮不设计；Admin负责治理/审核/运营，本轮只定义交接；个人空间负责用户长期连续性，本轮只保留项目归属和恢复交接，不设计其独立工作面；WATCH合法消费/撤权仍归M5及既有合同。

## 11.2 信息架构与工作空间组织

### 11.2.1 桌面主工作台

采用**三工作区协同**，继承MHKA-02 F02的左—中—右工作面关系，但不把当前三栏直接等比例保留：

| 工作区 | 主职责 | 用户看到的内容 | 主要动作 |
|---|---|---|---|
| 左：委托与墨痕协作 | 项目上下文、目标理解、持续对话、Agent主动反馈 | 当前项目/项目切换、用户目标、必要澄清、Agent判断、项目动态/事件摘要 | 新建/切换/重命名项目；补充目标；回答澄清；纠正方向；暂停/继续/取消 |
| 中：研究与知识工作区 | 研究过程、证据、知识资产、导演方案 | 研究事件流、资料/来源、证据定位、事实/解释/未知、缺口、资产版本与资格身份、H1/H2/H3方案 | 查看事件；追溯来源；核验材料；查看资产修订；比较/选择导演方案 |
| 右：作品舞台 | 作品逐步形成、可编辑内容、版本与提交准备 | 当前作品、段落/分镜/面板、材料引用、选中段落编辑、保存状态、版本差异、恢复、资格/权利缺口 | 编辑段落；局部重写；保存修订；比较/恢复版本；检查提交条件 |

**组织原则：**
- 项目是所有视图的上下文根。切换项目时，左/中/右三工作区必须同时切换到同一project_id，禁止项目A的材料与项目B的作品混显。
- 三栏不是三套独立页面，也不是后端模块列表。左侧持续承担人机委托关系；中侧根据当前任务在研究进展/证据资料/知识资产/导演方案间切换；右侧始终优先显示正在形成的作品。
- /studio/desk中的资料导入、项目笔记和研究计划能力应收敛为同一Project工作空间的资料/研究视图，不再成为另一个主入口；其有效能力继续继承，不删除业务数据或API。
- 研究与作品双输出并行：研究候选/知识工作资产与作品正文修订分别显示身份、版本和状态，不能将作品生成等同知识资格通过。
- D/L/G、Runner、Registry、内部Executor和数据库字段不作为Creator主导航或主要操作术语；必要时置于“技术详情/依据”二级信息中。

### 11.2.2 项目进入与项目总览

项目入口提供：新建项目、最近项目、继续上次工作、项目状态、最近研究事件、当前作品修订、待用户决策和待补证事项。创建项目时以自然语言目标为主，不强迫用户填写技术型研究表。用户可在创建后补充受众、范围、口吻、时间/地域、来源偏好与预算边界；系统只在对研究路径有实质影响时澄清。

项目状态不是单一completed：至少分别显示研究任务状态、来源/权利状态、知识资产成熟度、导演方案状态、作品修订状态、投稿状态。项目结束/取消不得删除已保存资产或不可变修订。

### 11.2.3 中间工作区的四个视图

1. **研究进展：** 展示当前目标、已完成动作、正在执行、排队、失败、暂停、需要Owner决策的事件；事件按真实回执更新，不以进度百分比冒充完成证据。
2. **证据资料：** 来源版本、原件取得状态、locator、摘录/主张、证据支持/反证、权利/用途限制、材料是否仅为候选。可从主张反向追到材料和来源。
3. **知识资产：** 13类工作资产封套、asset@revision、来源/依赖、认识类别、当前资格、引用关系和使用回执；工作资产不是正式L0—L5知识对象，候选不得显示为G5合格。
4. **导演方案：** H1认识主线、H2至少两种有实质差别的导演选择、H3作品母本与联合返查；比较方案的承诺、入口、揭示顺序、节奏、声画、收束、优势/代价/风险。用户选择后可继续修改或返回H1补证。

### 11.2.4 右侧作品视图

右侧提供三个上下文视图：
- **认识主线：** 当前作品目标、H1发现、必要理解、证据边界与待核事项。
- **导演方案：** 方案A/B比较、已选方案、节拍/段落结构与每段材料引用。
- **作品编辑：** 正文/分镜/面板局部编辑、局部重写、版本保存、版本差异和恢复。改动历史含义/人物行动/时间/地点/关系/因果/引文含义或证据范围时必须回H1复核；只改变表达、顺序、构图或节奏可由H2受控修改。

## 11.3 端到端用户旅程

| 序号 | 用户动作 | 墨痕/系统响应 | 可观察结果与持久身份 |
|---|---|---|---|
| 1 | 进入Studio | 服务端确认登录会话和Creator权限；列出本人项目 | 项目列表/空态；不泄露他人项目 |
| 2 | 新建或选择项目 | 创建/读取studio.projects并加载项目上下文 | 同一Project身份贯穿全部视图 |
| 3 | 自然语言描述目标 | Agent提炼主题、核心问题、期望认识增量和限制 | 可读的“我理解你想做什么”摘要 |
| 4 | 必要澄清 | 只询问影响研究方向/权限/预算/作品目标的必要问题 | 用户确认/纠正；保留原始目标和修订 |
| 5 | 提出研究计划 | Agent说明检索方向、预期材料、风险/缺口和预计动作 | 用户确认后执行；高风险外发另行授权 |
| 6 | 开始持续研究 | 复用授权项目读取和既有生产入口 | 真实任务ID、Root/Delegation及状态；UI消费研究事件 |
| 7 | 查看材料进入 | 展示来源候选、精确版本、原件/读取/locator、权利状态 | 材料身份与资格分开，不把目录记录当原件 |
| 8 | 查看证据与认识增量 | Agent区分事实、解释、假说、争议、未知、反证与适用范围 | 每个主张可回链到证据；缺口有具体下一步 |
| 9 | 沉淀知识资产 | 用户/Agent将研究成果保存为对应工作资产修订 | asset@revision、source/dependency refs、epistemic class、rights状态 |
| 10 | 组织H1/H2/H3 | 先明确认识主线，再比较导演方案，生成可检查节拍 | 方案A/B可比较；H3作品母本可返查 |
| 11 | 形成作品草稿 | 右侧舞台随研究/导演结果逐步形成场景、段落、图像/地图/旁白/互动结构 | 正文写入唯一publication.work_revisions；Studio封套仅引用 |
| 12 | 编辑和局部重写 | 对选中段落执行编辑；改动涉及史实则返回H1，表达调整由H2处理 | 作品内容与当前revision清楚对应 |
| 13 | 保存/比较/恢复 | 以不可变revision、CAS/幂等和父版本关系保存 | 可看差异、恢复指定修订、刷新后继续 |
| 14 | 检查投稿资格/权利 | 汇总来源/媒资逐动作权利、资格、缺口和当前版本 | 未满足时显示阻断原因和可行补证，不显示假成功 |
| 15 | 提交Admin审核 | Creator明确提交精确WorkRevision和所需快照 | 正式投稿快照、提交状态与Admin交接引用 |
| 16 | 返回项目继续工作 | 重新加载Project、Root/Task、来源、资产、方案、作品revision及未完成编辑恢复提示 | 恢复到同一对象和精确版本；撤权对象不复活 |

## 11.4 Agent交互合同与人工控制点

### 11.4.1 Agent状态

| 状态 | Agent行为 | 用户可做的事 |
|---|---|---|
| CONTEXT_READY | 说明当前项目/问题/来源/作品上下文 | 继续、纠正或切换项目 |
| UNDERSTANDING | 归纳目标、受众、问题与预期认识增量 | 修正理解 |
| NEEDS_CLARIFICATION | 只提出影响结果的必要问题 | 回答、跳过可选项或缩小范围 |
| PLAN_PROPOSED | 提出研究计划、预期材料、成本/权利/风险边界 | 确认、修改、拒绝 |
| WAITING_USER | 等待项目范围、外发、方案选择或提交等决策 | 确认/拒绝/纠正 |
| EXECUTING | 在当前授权内检索、读取、整理和委托 | 观察、暂停、取消或补充问题 |
| EVENT_UPDATING | 把真实research event/receipt映射为人类可理解进展 | 展开依据、继续追问 |
| HOLD / BLOCKED | 解释失败原因、缺少权限/材料/预算/资格 | 补证、申请授权、改走合法替代路径 |
| PAUSED | 停止新执行，保留已保存结果和事件 | 继续或取消 |
| COMPLETED | 仅表示本任务所定义的动作完成，不推导知识资格或作品发布 | 查看结果、沉淀资产或进入下一步 |

### 11.4.2 主动执行与必须等待的边界

**可主动执行（在既有项目授权范围内）：** 项目级合法内部研究读取、已授权的来源检索/比对、证据归整、缺口提示、研究事件汇总、H1候选组织、导演备选建议、局部表达改写建议。

**必须等待用户决策/授权：** 改变研究目标或范围；扩大预算；向外部Provider发送资料；对某来源/媒资新增展示、下载、改编等动作；选择导演主方案；采用会改变历史含义的修改；提交精确作品修订供Admin审核。

**Agent不得执行：** 绕过项目ACL；将候选写成正式Truth；自签Gate；以Creator权限代替Reviewer/Operator；把模型生成、任务排队或计划完成显示为原件已取得/研究已完成/资格已通过/作品已发布。

### 11.4.3 人机交互表达

- Agent建议必须带“为什么建议、依据是什么、未知什么、可能影响什么”；能查看依据、纠正、拒绝和撤销。
- 主动提示短、具体、贴合当前焦点；不以固定长篇聊天占据右侧作品舞台。
- Agent不可用时，项目、资料、作品的已保存状态仍可查看和编辑；错误不清空用户输入。
- 暂停/取消停止后续执行，不删除历史资产/作品revision；恢复时重核身份、ACL、租约、预算、权利与撤权状态，禁止旧checkpoint复活。
- 内部D/L/G/Runner/Registry术语仅放在“技术详情”，主UI使用“资料获取、证据核对、知识整理、作品修订、审核状态”等用户语言。

## 11.5 视觉与交互设计规范

### 11.5.1 视觉方向

- 基调：温润浅纸/浅青灰/暖白，明亮、清润、中式雅致；不使用大面积纯白刺眼背景，也不做普通后台式白底卡片堆叠。
- 深青绿：用于关键焦点、当前工作区、Agent局部沉浸面、主要行动按钮与状态锚点；不铺满全屏。
- 暖金：降为极少量细节提示，不承担大面积边框/主强调。
- 文字：深青黑为主，灰绿为辅助；正文保持适合长时间阅读的行高和层级。
- 纹理/图像：真实来源材料优先；地图、典籍、器物、人物、遗址和生活材料按认知任务呈现。示意/复原/当代观察必须标识身份；没有合法材料时用诚实占位，不生图冒充史料。
- 三工作区应有整体连续的纸面/案头感，边界轻、层次清楚；避免等高卡片墙、厚重金边、暗色后台和过多分割线。

### 11.5.2 交互与状态

- 桌面：左委托/Agent、中研究、右作品；右侧作品始终为主要视觉主体。
- 平板：保留三工作区语义，可调整宽度和折叠辅助区，不机械挤压。
- 手机：改为“委托/研究/作品”三工作区切换，当前项目、任务状态、作品版本和返回路径持续可见；不得将三栏简单纵向堆叠成长页。
- 视口验收：1440×900、768px、390px；320px防横向溢出。
- 空态、加载、成功、失败、无权、撤权、候选、权利待核、暂停、继续、取消、Agent离线、网络中断、保存冲突、恢复失败、投稿被拒等状态均须有独立文案与下一动作。
- 键盘可达、焦点可见、弹层关闭后焦点返回；支持Enter/Space、Escape、减少动态效果、放大字体和触控目标。
- 研究百分比只有在真实事件/可量化阶段有明确定义时才展示；否则优先显示具体事件与已完成/未完成动作，不能用虚构进度条制造“研究已完成”错觉。

### 11.5.3 完整工作面概念图

- **正式概念图源：** [PDW-02 Studio整体工作面概念图.svg](concepts/PDW-02_Studio整体工作面概念图.svg)。
- **概念图说明：** 一张完整桌面工作面构图，呈现项目/Agent委托、研究事件与证据、右侧作品舞台、版本和投稿状态；不是多个模块图拼贴。
- 概念图采用Owner已接受的HOME视觉方向：明亮浅纸/浅青灰、深青绿局部强调、弱化暖金。它是设计表达，不代表真实数据或运行能力。

## 11.6 既有设计/工程继承裁决

| 对象 | 裁决 | 理由与后续处理 |
|---|---|---|
| /studio登录保护与Studio主入口 | KEEP | 服务端会话校验和登录重定向继续保留 |
| StudioWorkbench.tsx三工作区骨架 | ADAPT | 保留项目/对话/研究/作品基础，补连续上下文、事件、证据/资产视图、真实编辑和完整恢复 |
| /studio/desk及ImportForm/ProjectNotebook/ResearchPlan | ADAPT | 有效资料导入/笔记/研究计划能力并入同一Project视图，不保留割裂的第二主入口 |
| studio.css与现有mo-paper/teal token | KEEP + ADAPT | 保留浅纸、青绿和现有三列布局基底；细化层级、密度、移动工作区切换和状态 |
| Project/Task/Owner校验及研究任务服务 | KEEP | 复用studio.projects、Research Task和现有Owner校验，不重建项目身份 |
| 来源候选、原件上传、来源注册和权利提示 | KEEP + ADAPT | 复用attachments/source-selection/source-acquisition等链；把身份、版本、locator和权利呈现在同一上下文 |
| 研究事件API与checkpoint/receipt | KEEP + ADAPT | 后端事件/回执存在，主工作台需接入并可视化；不把事件日志当长期知识资产 |
| Studio资产封套与正式知识资产合同 | KEEP | 复用13类资产及asset@revision、links/use_events；不建第二知识库 |
| H1/H2/H3导演服务与正式导演正文 | KEEP + ADAPT | 复用public.director_plans及现有服务；补可比较/可选择/可编辑的UI；不以Studio平行表复制正式正文 |
| 正式作品正文/修订 | KEEP | publication.work_revisions仍为作品正文权威；Studio只用受控封套/引用关联，不复制第二份正文 |
| rewrite/panel/revision/restore服务 | KEEP + ADAPT | 服务端入口存在；将编辑、局部重写、版本对比、恢复接入主工作台 |
| Admin审核/正式发布/WATCH消费 | KEEP | 复用现有独立Reviewer/Gate、formal publication pointer和WATCH资格读取链；Studio仅提供正式交接 |
| Owner指定整合HTML原型（Blob 52334737...） | REFERENCE_ONLY | 归档存在及历史核验结论可继承；本轮GitHub读取接口对约2.4MB文件返回空内容，未能重新解码workflow-source，故不据此臆定Studio细节或直接复制Base64/iframe封装 |
| 旧门户式、工程模块清单式或单独资料台主入口 | DROP（作为主导航组织方式） | 不删除现有API/数据；只取消用户必须跨入口完成同一项目的体验方式 |

## 11.7 自检报告P0/P1/P2/P3逐项设计处置

| 问题 | 影响Studio设计 | 设计处理 | 工程归属/依赖 | 是否回归M5 | Owner授权 |
|---|---|---|---|---|---|
| P0-01 loopback限定机器G5 | 投稿准备与失败状态必须可解释，不能显示“已可提交” | 显示资格阻断原因、独立Reviewer/Gate责任和补救路径；Creator不可自签 | studio-formal-qualification.ts、publication.ts、既有Gate服务 | 是，原M5资格主线 | 代码/权限/资格修改另行授权 |
| P0-02 Schema缺Project/Root/Revision字段 | 项目、导演方案和作品身份必须连续 | UI明确项目/委托/研究快照/作品revision关联；历史无绑定对象HOLD，不猜测回填 | 既有迁移、studio.projects、public.director_plans、publication.work_revisions、Studio envelope | 是，原M5 Schema/迁移主线 | DDL/数据迁移另行授权 |
| P1-01 Agent上下文不连续 | 用户会觉得墨痕遗忘问题 | 设计持续项目会话/任务上下文，恢复后显示原问题、澄清、研究状态 | /api/studio/conversations、research task messages及既有Task/Root合同；现Workbench只提交当前prompt/Project | 是，M5 Studio接线 | 业务代码另行授权 |
| P1-02 研究事件未展示 | 用户看不到研究正在做什么 | 中区事件流按真实event/receipt更新，失败/暂停可观察 | /api/studio/research-tasks/[id]/events；主UI当前未消费 | 是，M5 Studio接线 | 业务代码另行授权 |
| P1-03 作品不可编辑 | 作品预览与创作脱节 | 右区编辑器接入rewrite-beat/panels/revisions/restore，逐段编辑并保留引用 | /api/studio/works/[id]/rewrite-beat、panels、revisions、restore | 是，M5作品修订主线 | 业务代码另行授权 |
| P1-04 项目恢复不完整 | 跨会话不能继续工作 | 恢复Project/Root/Task、材料/权利、资产rev、导演方案、作品revision和未保存编辑恢复提示 | /api/studio/projects、tasks、status、director-plans、works；现恢复逻辑只重建一个研究任务/生产readback | 是，M5恢复主线 | 业务代码另行授权 |
| P1-05 RLS/Project隔离防线 | 私有项目、资产和作品状态必须按身份隔离 | UI显示无权/项目不存在/权限失效；绝不以隐藏按钮代替服务端拒绝 | SECURITY_ACCESS_CONTRACT、Owner/Project RLS与服务端授权 | 是，M5安全主线 | RLS/权限修改另行授权 |
| P2-01 内部术语暴露 | Creator需理解技术代号 | 主UI使用人文研究语言，技术细节折叠 | StudioWorkbench文案与组件 | 是，M5 UI接线 | UI代码另行授权 |
| P2-02 /studio与/studio/desk割裂 | 同项目跨入口、上下文断裂 | 统一Project上下文，以视图/抽屉承载资料台能力 | StudioWorkbench.tsx、desk/page.tsx及其子组件 | 是，M5 UI接线 | UI代码另行授权 |
| P2-03 窄屏纵向堆叠 | 研究和作品难以连续操作 | 移动端切换委托/研究/作品三工作区 | studio.css和Workbench状态 | 是，M5 UI接线 | UI代码另行授权 |
| P3-01 视觉细节 | 影响长时间使用与全站一致性 | 保留浅纸/青绿token，细化留白、状态密度和局部沉浸，不做全页暗色或金边 | studio.css、全局token | 是，M5 UI接线 | UI代码另行授权 |

## 11.8 设计—工程逐项映射表

> 静态已存在仅说明代码/路由/数据合同可定位，不代表真实运行通过。运行未实测统一标NOT_RUN或NOT_VERIFIED。

| 设计要求 | 用户旅程 | 页面/视图 | 组件 | API/服务 | 数据与权限合同 | 当前实现证据 | 裁决/后续施工动作 | 验收方式 |
|---|---|---|---|---|---|---|---|---|
| 登录后进入本人Studio | 1 | Studio入口 | page.tsx | getSession() | session/Creator | apps/web/app/studio/page.tsx服务端无会话重定向/login | KEEP；继承服务端门禁 | 未登录拒绝/登录进入，浏览器NOT_RUN |
| 创建/切换/重命名Project | 2 | 项目选择器/项目总览 | StudioWorkbench项目状态 | GET/POST/PATCH /api/studio/projects | studio.projects、Owner ACL | projects/route.ts与Workbench调用存在 | KEEP + ADAPT；补项目总览/同项目上下文切换 | 同Owner正向、跨Owner拒绝；真实DB NOT_RUN |
| 目标理解与必要澄清 | 3—5 | 左侧委托/Agent | 对话、澄清卡、计划确认 | POST /api/studio/research-tasks；/api/studio/conversations | brief@rev、Project、Root/Delegation | Workbench ask()提交prompt/project/idempotency；conversation API存在但当前主流程未形成连续上下文 | ADAPT；统一会话/任务关系，不新建Agent Runtime | 多轮追问保留上下文，Agent真实调用NOT_RUN |
| 研究任务与状态恢复 | 6、16 | 左动态/中研究进展 | 事件流、任务状态、恢复条 | /api/studio/tasks、research-tasks/[id]/status、resume | Root/Task/lease/idempotency/ACL | API及studio-research.ts存在；当前恢复只还原单个任务和production readback | ADAPT；恢复完整Project工作面 | 刷新/跨会话恢复，真实运行NOT_RUN |
| 研究事件可见 | 6、8 | 中研究进展 | 事件时间线、进度/异常状态 | /api/studio/research-tasks/[id]/events | research_events、receipts；事件不是永久资产 | 事件API存在；Workbench当前未消费 | ADAPT；按真实event更新，不伪造百分比 | 真实事件与UI状态一致，NOT_RUN |
| 来源/原件/权利 | 7 | 中证据资料 | 来源列表、原件状态、locator、权利提示 | attachments、source-selection、source-acquisition、materials | source/version/bytes/hash/locator/rights_by_action | 上传/登记/选择/获取路由和服务存在；本轮未做真实上传/Provider | KEEP + ADAPT；一处查看完整来源链 | 原件/权利正反测试，NOT_RUN |
| 证据与缺口 | 8 | 中证据资料 | 主张—证据链、反证/未知、研究缺口 | research-read、task materials/events | source refs、locator、epistemic class、资格分轴 | 代码与读取服务可定位；没有浏览器运行证据 | ADAPT；区分事实/解释/候选/未知 | 每个主张可回链、无证降级，NOT_RUN |
| 知识工作资产 | 9 | 中知识资产 | Asset list/detail/revision/ref | /api/studio/assets | studio.asset_heads/revisions/links/use_events；13类封套 | assets API与studio-assets服务存在 | KEEP；不建第二知识库；补版本/来源/用途视图 | 同项目版本与引用正反验证，NOT_RUN |
| H1/H2/H3导演方案 | 10 | 中导演方案/右导演视图 | 方案比较、选择、节拍编辑 | /api/studio/director-plans、[id]/select、[id]/panels | 正式public.director_plans；delegation/root/snapshot refs | studio-director.ts及路由存在；mohen-cloud Schema缺绑定列 | KEEP + ADAPT；不复制正式导演正文 | 方案差异/选择/返H1测试，NOT_RUN |
| 作品正文与修订 | 11—13 | 右作品舞台/编辑 | Beat/Panel editor、Revision history | /api/works、/api/studio/works/[id]/revisions | publication.work_revisions唯一正文；CAS/幂等 | publication.ts创建草稿/修订服务存在；UI缺完整编辑接线 | KEEP + ADAPT；右区逐段编辑并引用证据 | 编辑/保存/版本差异/恢复，NOT_RUN |
| 局部改写与恢复 | 12—13 | 右作品编辑 | 局部重写、面板编辑、恢复选择器 | rewrite-beat、panels、restore、fork | 不覆盖旧revision；变更含义返回H1 | 相关API目录存在；主Workbench未接完整编辑体验 | ADAPT；先合同核对再接线 | 改一段不污染其他段，旧版可恢复，NOT_RUN |
| 投稿资格/权利检查 | 14 | 右侧提交准备 | Checklist、阻断原因、补证动作 | /api/works/[id]/submit、ensureStudioWorkQualification() | G5独立签发、rights、精确WorkRevision | publication.ts调用资格补齐；studio-formal-qualification.ts仅loopback隔离机器签发 | 设计上显示真实阻断；工程P0回M5 | 正向/反向资格测试，NOT_RUN |
| Admin交接 | 15 | 投稿回执/交接状态 | 精确revision摘要、提交receipt | formalSubmit、formal review/decision chain | Reviewer/Gate/Operator角色分离、submission snapshot | Admin调用链代码存在；同一作品未实测 | KEEP；Studio只交接，不重做Admin | 独立Reviewer正反测试，NOT_RUN |
| WATCH消费与撤权回链 | 15之后 | 交接回执/返回项目 | 发布指针状态、撤权提示 | formalPublish、listWatchEligible、withdraw | 同一WorkRevision与当前资格/权利 | 代码链存在；当前main同一作品端到端NOT_RUN | KEEP；仍归M5/WATCH合同 | 同一修订消费/撤权阻断，NOT_RUN |
| 窄屏与无障碍 | 全旅程 | 三工作区切换 | Mobile workspace switch、focus/status | 前端状态/CSS | 视图偏好与语义状态分离 | studio.css在1100px以下纵向单列；不满足切换要求 | ADAPT；移动端切换委托/研究/作品 | 1440×900/768/390/320、键盘实测NOT_RUN |

### 11.8.1 关键数据权威约束

- 项目身份首期继续使用studio.projects；Root/Task/Delegation使用现有任务/委托身份和精确回执。
- 工作资产继续使用studio.asset_heads、studio.asset_revisions、studio.asset_links、studio.use_events；任务级research_events/checkpoint不能替代长期资产。
- 导演正文使用public.director_plans；作品正文使用publication.work_revisions；媒资正文使用public.assets。Studio封套/引用只建立关联，不复制正文。
- delegation_id/root_task_ref/research_snapshot_hash/research_source_refs等绑定缺口按既有迁移合同回归M5，不在PDW-02新增字段或写迁移。
- Studio研究读取可按项目授权范围复用合法L0—L4及私有候选；这不等于公众展示、正式史学G资格或媒资许可。
- Creator不能代签专业Gate；Admin运营审核不能替代知识资格；Agent不得直接写正式Truth。

## 11.9 原型真实性与可操作范围

**原型源：** [PDW-02 Studio完整创作工作空间HTML原型](prototypes/PDW-02_Studio_完整创作工作空间_可操作原型.html)。

**已实现的本地模拟交互：**
- 新建项目、项目切换/列表入口；
- 自然语言输入、对话追加、澄清选项选择；
- 研究进展/证据资料/知识资产/导演方案四视图切换；
- 方案A/B选择；
- 研究暂停、继续、取消的状态反馈；
- 作品认识主线/导演方案/编辑视图切换；
- 段落选择、局部改写、段落编辑；
- 草稿保存、版本选择、版本差异提示、恢复最近保存点；
- 模拟提交预检与资格/权利缺口阻断；
- 桌面三工作区与窄屏委托/研究/作品切换。

**真实性声明：**
- 项目、材料、证据、资产、研究事件、导演方案、作品正文和资格缺口均为明确的设计夹具。
- 所有按钮只在浏览器本地改变演示状态，不调用真实Agent、Provider、数据库、D/L/G、Admin或WATCH。
- HTML的JavaScript语法检查为PASS；结构检查确认核心视图、按钮、移动切换、编辑/恢复、模拟提交和模拟标识均存在。
- 本轮未在真实浏览器中执行点击/视口验收；浏览器运行状态为NOT_RUN。原型代码已形成可操作交互，但视觉细节、触控/键盘和完整路径仍需Owner体验及后续浏览器自验。

## 11.10 Owner体验验收任务与失败判据

| 任务 | 起始条件 | 操作步骤 | 预期体验/可观察结果 | 失败判据 | 当前验证层 |
|---|---|---|---|---|---|
| O1 新建研究项目 | 打开HTML原型，处于Studio主工作面 | 新建项目→输入名称和自然语言目标→确认 | 项目标题/当前上下文更新；事件流出现创建记录 | 创建后标题不更新、状态混乱或要求填写技术字段 | HTML模拟可操作；真实Project创建NOT_RUN |
| O2 Agent理解与澄清 | 进入已有项目 | 阅读Agent理解摘要→选择方向→输入补充问题→发送 | Agent回应与当前项目/目标一致；用户可纠正 | Agent忽略当前上下文、只弹固定话术或清空用户输入 | HTML模拟可操作；真实Agent NOT_RUN |
| O3 研究事件和暂停恢复 | 当前研究进行中 | 查看事件→暂停→继续→取消 | 能看见正在做/已做/缺口；暂停不丢项目和已保存资料 | 只显示转圈/百分比；暂停后丢失历史或取消删除资产 | HTML模拟可操作；真实事件流NOT_RUN |
| O4 证据与权利判断 | 中区证据资料 | 打开每项材料，区分来源版本、候选、原件和权利状态 | 用户知道什么已取得、什么待核、什么不可公开 | 将候选/目录/示意材料显示为正式史料或G5合格 | HTML模拟可操作；真实材料/权利NOT_RUN |
| O5 知识资产沉淀 | 中区知识资产 | 查看资产类型、revision、来源/缺口/资格说明 | 能区分工作资产与正式知识对象 | 把研究笔记、作品正文和正式Truth混成一个对象 | HTML模拟可操作；真实资产写入NOT_RUN |
| O6 比较H1/H2/H3方案 | 中区导演方案 | 比较A/B→选择→回看认识主线→进入作品 | 两方案有实质差异，选择不改史实/证据边界 | 仅换标题/颜色；方案无法回到证据或H1 | HTML模拟可操作；真实导演API NOT_RUN |
| O7 编辑、保存、对比、恢复 | 右侧作品 | 选段→编辑/局部重写→保存→查看差异→恢复 | 只改目标段落；保存产生新版本；恢复后可继续编辑 | 编辑覆盖其他段、版本不可区分、刷新后丢失或恢复旧权限 | HTML模拟可操作；真实WorkRevision NOT_RUN |
| O8 投稿准备与Admin交接 | 作品草稿已保存 | 点击模拟提交→查看资格/权利阻断 | 明确看到待核项和不能自签的原因 | 未满足资格仍显示已提交/已发布，或Creator可自签 | HTML模拟阻断可操作；真实Admin交接NOT_RUN |
| O9 窄屏连续工作 | 390px及320px视口 | 在委托/研究/作品间切换，编辑并返回 | 主要操作可达，当前项目/任务/版本连续，320无横向溢出 | 三栏纵向堆叠导致无法回到当前任务或横向溢出 | 原型有切换逻辑；视口实测NOT_RUN |

**签收记录：** Owner体验后，按O1—O9记录PASS/FAIL和具体意见；任何误导性证据、对象错配、权限泄漏、不可恢复的关键操作失败均不得平均通过。Owner意见在本入口内修订，不另建平行缺陷报告。

## 11.11 未决事项、风险与工程移交顺序

1. P0-01/P0-02及P1-05仍是M5既有主线问题，不属于PDW-02设计施工；必须由原M5授权批次处理。
2. P1-01—P1-04、P2-01—P2-03、P3-01是后续Studio工程接线/体验实现项；设计已给出归属和验收，不在本轮修改业务代码。
3. 当前main的真实浏览器、Agent、DB/权限、Provider、同一WorkRevision到Admin/WATCH端到端均未验证。
4. Owner未签收前，PDW-02保持DESIGN_REVIEW / OWNER_REVIEW_REQUIRED；PDW-03/04/05保持NOT_STARTED。
5. 后续工程施工应以本入口第11.8映射为接续依据，先处理M5 P0依赖，再按Project/来源→Agent/事件→知识资产→导演方案→作品编辑/恢复→投稿交接→响应式的顺序接线；不得另建第二套D/L/G生产链。

## 11.12 交付文件索引

- 唯一正式入口：本文件 tasks/implementation/PDW/PDW-02_Studio设计与工程自检报告_V0.1.md（现行内容V0.2）。
- 完整概念图：tasks/implementation/PDW/concepts/PDW-02_Studio整体工作面概念图.svg。
- 完整可操作HTML原型：tasks/implementation/PDW/prototypes/PDW-02_Studio_完整创作工作空间_可操作原型.html。
- 原自检诊断证据：本文件第1—10节，保持历史内容，不另复制成第二份报告。
- 全站视觉上位输入：PDW-01正式入口第11.7、11.10节。

## 11.13 PDW-02当前结论

**设计交付状态：** DESIGN_REVIEW / OWNER_REVIEW_REQUIRED。

已完成：Studio职责边界、信息架构、端到端旅程、Agent交互合同、视觉规范、完整工作面概念图、可操作HTML原型、P0—P3逐项处置、设计—工程映射、Owner体验任务。

尚未完成：Owner实际体验并签收；真实浏览器验收；真实Agent/数据库/权限/同一作品发布链运行验收（后者属于M5工程施工，不是PDW-02关闭条件）。

**关闭前唯一关键动作：** Owner按第11.10节体验原型并签收。若体验发现设计缺陷，回到本入口修订后再次提交；Owner未签收前不得标记CLOSED / OWNER_APPROVED，不得启动PDW-03。

**明确声明：** PDW-02关闭只代表Studio产品设计交付和工程移交完成；不代表Studio代码施工完成、M5真实生产闭环通过、Admin/WATCH运行验收通过或公众开放。


## 11.14｜2026-11-27全局体验底座与Studio工作空间结构方向补强

**独立方向裁决记录：** [PDW-02全平台统一体验底座与Studio工作空间重构方向裁决记录V0.2](PDW-02_全平台统一体验底座与Studio工作空间重构方向裁决记录_V0.2.md)。

本次Owner明确要求先完成全局层设计，再独立重构Studio工作空间。该方向记录已找回并对照：
- M5既有Agent专项：`tasks/results/MAB/M5_NAVIGATION_MODULE_ROLES_AGENT_MODES_DISCUSSION_CURRENT.md`（2026-11-16讨论定论稿）。
- 沪上经纬原始“世界＋意识＋看法”理念、墨痕意识层样稿和旧项目MohenFab/墨痕API源码（详见方向记录第3节及附录A2）。
- PDW-01 HOME已签收视觉方向和全工作面整合HTML原型。
- 当前PDW-02三栏原型、概念图、自检和设计—工程映射。

### 11.14.1 两个必须分开执行的子任务

1. **PDW-02-B｜全平台统一体验底座设计补强**：先完成全局墨痕智能服务机制、全局顶部/底部/移动端导航、全站统一视觉系统、HOME/EXP/Studio/Admin/WATCH/个人空间页面适配、共用组件边界及上下文交接规范。它是跨页面设计依据，不重做各页面专属产品工作面。
2. **PDW-02-SR｜Studio工作空间结构重构**：仍归原PDW-02，作为独立设计任务；在PDW-02-B完成后执行。重新评估原五图UI继承的固定三栏布局、左侧墨痕、中间研究栏和右侧作品舞台；不预设三栏常驻。研究进展、证据资料、知识资产、导演方案必须保留业务身份和可追溯性，但应按创作情境选择承载方式。

两项不能合并为一个笼统的“全局+Studio改版”任务。PDW-02-B先形成全局规范；PDW-02-SR使用该规范独立交付Studio结构、概念图、可操作HTML原型、工程映射及Owner体验任务。

### 11.14.2 对现有V0.2 Studio设计的状态影响

- 原明亮清润、中式雅致视觉方向继续保留，但必须服从全站统一视觉系统并与HOME一致。
- 原Studio固定左侧墨痕设计不再作为默认结构前提；墨痕应使用全局统一组件。
- 原三栏职责（委托/研究/作品）仍是功能职责盘点依据，但不等于必须保持三栏布局。
- 原中间栏四类能力（研究进展、证据资料、知识资产、导演方案）均须保留并逐项映射，不得因取消常驻栏而丢失。
- 原右侧作品舞台继续作为核心创作成果视图的重要输入，但其是否成为唯一默认主舞台，由PDW-02-SR基于完整旅程比较后裁决。
- 原HTML原型、SVG概念图和O1—O9体验任务作为历史设计资产保留；PDW-02-SR须逐项决定继承、修改或替换，不把原型模拟描述为真实Agent/DB能力。

### 11.14.3 当前顺序与状态

- 本方向记录及既有研究对照：完成，见独立方向裁决记录V0.2。
- PLAN唯一施工计划：已升级V1.10，§3.6增加PDW-02-B和PDW-02-SR。
- 当前下一设计任务：**PDW-02-B**。
- PDW-02-SR：待PDW-02-B完成后启动。
- PDW-02整体仍为`DESIGN_REVIEW / OWNER_REVIEW_REQUIRED`，尚未关闭；PDW-03不得提前启动。
- 本轮仅更新设计方向与文档索引，不修改业务代码、API、数据库、权限、RLS、CI、部署或生产资格；不改变M5施工主线和既有专业合同。
