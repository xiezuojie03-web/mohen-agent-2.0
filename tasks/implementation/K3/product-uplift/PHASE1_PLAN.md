# 墨痕系统提升首批 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Owner已委托工程方法，原位复用现有隔离checkout，不另开长期分支。每项变更完成后独立审查；不把局部修复提升为整轮完成。

**Goal:** 建立人文体验基准，修复结果不可信和错误空态，核清真实服务/数据前置，为真实研究、创作和公开消费的后续贯通提供已验证基础。

**Architecture:** 复用五图、既有任务/版本/资格及experience-engine。首批将前台真实回执、可恢复作品身份、服务故障与体验编导分开核验；生产500必须先查根因，不能猜测后批量改配置。真实服务与模拟设计证据分列。

**Tech Stack:** Next 15、React 19、TypeScript、pnpm 9.15.4、既有node-pg/PostgreSQL、Vitest、Playwright及系统Chromium。

**Spec:** [DESIGN.md](DESIGN.md)。审查起点见 `/workspace/product-audit-20261101/产品独立审查.md`，线上基线main@65b26cd。

## Global Constraints

- 复用既有唯一D00—D05，独立资格与内部研究POL-01语义不变；不新增并行Truth或批量激活Job。
- 所有密钥只通过既有安全绑定使用，不打印、提交、复制到测试/文档。
- root目录任务/接口/架构编号不重算；现有main保留全部提交，不force push、不丢弃其他会话改动。
- 不关闭TLS/校验，不放宽版权、资格或用户权限来消除500。
- 单元、夹具浏览器、真实服务和人文体验验收分别记录；没有生产DB证据不宣称迁移/权限通过。
- 每个实施任务先有失败用例，再修复，再跑相关验证。代码提交精确包含本任务文件；推送前检查分支新提交和自动部署影响。

## Review Focus

1. 服务返回非JSON的500/503时，错误不能被当成空库或成功；Task 2、3锁定。
2. 创建已成功但投稿失败，重试不得再建一个作品或清空作者输入；Task 3锁定。
3. 用户编辑内容或标题后不能误提交旧版本；Task 3记录确切保存身份，未完成修订机制前不得复用旧id覆盖新内容。
4. 低覆盖、无图片许可与资料冲突必须有值得继续且诚实的体验；Task 4逐段演练。
5. 生产故障根因与旧/新权限前置不同，诊断不能越权改变数据库或复活旧资格；Task 1、5核验。

---

### Task 1: 核清生产错误及运行前置

**Files:** Read `CURRENT.md`, `AGENTS.md`, `specs/OPERATIONS_DEPLOYMENT.md`, `apps/web/lib/publication.ts`, `packages/data-access/src/node-pg-client.mjs`, `supabase/migrations/`；证据写到checkout之外的`/workspace/product-uplift-evidence/`，完成后更新真实CURRENT状态。

**Interfaces:** Consumes：当前main完整SHA、Vercel项目/部署ID、安全绑定元数据。Produces：按提交/环境标明的`runtime-baseline.json`、`runtime-blockers.md`，每项包含observed/unknown、失败操作、证据及最小复原动作；不含凭据值。

- [ ] 重新检查工作区、远端main、Vercel正式别名/提交、只读网络与密钥ready；保留当前回退部署ID。
- [ ] 重现`GET /api/works/published`和相关页面/匿名权限；保存HTTP/请求时间/关联部署，不储存私人内容。
- [ ] 通过有权运行日志或安全诊断通道取得具体异常类别；分别核验连接、TLS、目标Schema/列和角色权限假设，每次只验证一个假设。不将“变量存在”当连接成功。
- [ ] 能在现有授权内安全修复的环境/工程根因，形成最小变更并验证；涉及数据影响的迁移须先有实际表/角色/备份/回滚证据。若缺资源，记录精确阻断并继续Tasks 2—4。
- [ ] 结果检查：原始错误已解释并消除，或明确哪项权限/通道缺失；不能只有“可能是证书/数据库”。未知项不得写PASS。

### Task 2: WATCH区分空结果与服务失败

**Files:** Modify `apps/web/app/watch/WatchGallery.tsx`, `tests/e2e/five-pages-ui-acceptance.spec.ts`。复用`playwright.uxd7.config.ts`，测试仍是夹具。

**Interfaces:** Consumes：现有GET `/api/works/published`；合法成功响应`{works: PublishedWork[]}`。Produces：明确加载/成功空结果/成功有内容/加载失败四态；失败展示“作品暂时加载失败，请重试。”与“重试”按钮，不能显示“目前还没有已发布的作品”。

- [ ] 在现有浏览器测试文件新增`WATCH distinguishes HTTP failure from an empty catalogue`：mock503 JSON和500 HTML，断言失败文案与重试可见，空库文案不存在；mock200 `{works:[]}`才显示真实空态。
- [ ] 运行`pnpm exec playwright test -c playwright.uxd7.config.ts five-pages-ui-acceptance.spec.ts --grep 'WATCH distinguishes'`，确认修复前失败并保存RED日志。
- [ ] 在组件现有请求逻辑中检查HTTP和返回结构，加入受控重试；组件卸载和迟到响应不覆盖新状态，不改变合法图文降级能力。
- [ ] 同一测试增加503→重试→200真实结构夹具，断言可以恢复已有章节；禁止用只隐藏错误文本通过测试。
- [ ] 运行对应测试与WATCH现有回归；Task1根因解决后再验证真实目录，分别记录两种证据。仅将本任务文件提交为`fix(watch): distinguish catalogue failures from empty results`。

### Task 3: 作品创建/投稿不再假成功或重复创建

**Files:** Modify `apps/web/app/studio/StudioWorkbench.tsx`, `tests/e2e/five-pages-ui-acceptance.spec.ts`, `apps/web/app/api/works/route.ts`, `apps/web/app/api/works/[id]/submit/route.ts`, `apps/web/app/api/studio/works/[id]/submissions/route.ts`, `apps/web/lib/publication.ts`；Create `tests/unit/publication-submission.test.ts`；同步受影响调用方与已有接口合同。若提取小型状态辅助模块，仅为本任务服务，不先重构全组件。

**Interfaces:** Consumes：现有创建/投稿接口并作最小修订绑定补充；创建成功须返回`{ok:true,work_id:string,revision_id:string}`，投稿输入`{revision_id:string}`，成功返回`{ok:true,work_id:string,revision_id:string,status:"submitted"}`。服务须核验确切修订归属和状态；无匹配返回明确冲突，不恒返成功。Produces：只有HTTP及服务确认成功才显示“已提交审核”；失败显示“投稿暂未成功，已创建的作品已保留，可以重试。”，保留标题/分镜及已保存作品身份。错误详情不回显密钥或SQL。

- [ ] 先读取submit真实合同、现有版本编辑接口及两个投稿调用方；当前publication.submitWork更新所有draft后恒返true，两个路由均未确认实际提交结果。确认既有revision_id物理身份及所有调用，不能只修前端res.ok。
- [ ] 新增服务用例：只提交指定work下指定draft修订；零匹配不成功；同一已submitted修订幂等成功；其他work/错误状态拒绝，不影响别的draft。先RED，再以带精确work/revision/status条件的更新和RETURNING确认结果；幂等分支只读核验确切submitted修订。两个路由共同消费相同结果，缺revision_id返回400，冲突返回409，保持服务端身份/归属守卫。更新创建回执及调用方兼容范围，并在变更中明确合同增量。
- [ ] 新增浏览器用例`Studio keeps the created work when submission fails`：模拟研究/方案/采纳；create成功一次，submit503。断言不显示成功、输入保留；点击重试仍使用同一work_id，create调用次数为1；第二次submit成功才显示成功。
- [ ] 增加create401/500和submit非JSON错误、双击防重入；RED运行并记录，不执行真实生产投稿。
- [ ] 在组件保留已创建的work_id及对应保存快照；创建/投稿均验证实际响应。如果标题或内容发生变化，走已有新修订路径后再投稿；该路径尚无可靠接线时明确提示需保存新版本，不允许将旧作品静默冒充新稿。
- [ ] 增加`Studio does not submit an old snapshot after an edit`反例；保留未修改内容的幂等重试。完整跨刷新恢复与原子修订在后续批次B解决，本任务不伪称已完成。
- [ ] 运行本组浏览器及现有Studio A/B测试，确认成功/失败/重试三态；精确提交`fix(studio): preserve saved work and verify submission results`。

### Task 4: 真实主题的人文体验基准与逐段设计

**Files:** Read最新MHKA-01/02、UXD2/3/5及现有`apps/web/data/experience/jinze-*`, `apps/web/app/experience/jinze-water-net/`, `packages/experience-engine/src/`；新增本目录`EXPERIENCE_BASELINE.md`及外部取证目录。它只细化体验，不创造新史实或资格政策。

**Interfaces:** Consumes：合法可用素材清单、现有实际页面及对应对象/来源/修订；Produces：一个真实题材的逐段体验和两类跨题材挑战，逐段含`用户的问题 / 舞台前后变化 / 认识增量 / 材料引用 / 不确定性 / 下一步 / 失败退路 / 所需能力缺口`。

- [ ] 核验当前素材身份、许可和来源；将“存在文件”“历史曾获资格”“现在可公开”分列。缺合法素材可先设计交互，不用虚构来源补满。
- [ ] 记录现有体验的首次进入、首次有意义发现、追问、证据、返回和手机行为，形成前后可比基准，不只拍空页面。
- [ ] 按DESIGN §4写逐段编导，保留现有有效画面与语义；解释每次媒介/焦点选择，避免所有题材套同一桥梁模板。第二类主题必须在表达结构上不同；第三类为非预置自然语言选题。
- [ ] 将每个所需舞台变化反向映射到现有Engine/数据/能力/资格和原FA动作；记录已具备、缺接线、缺资料、缺能力，禁止把交互夹具写成真实研究通过。
- [ ] 以实际内容的可操作演练/逐帧记录交付，检查“看见了什么、理解怎样改变、为什么与今天有关、想继续什么”。未经真实Owner/用户体验观察，不写人文质量PASS；日常技术细节自行解决。
- [ ] 独立审查：有没有仅增加装饰而没有认知变化、有没有用解释填补事实空白、有没有把后台资格字段推给公众。将设计与缺口映射提交，保持产品代码未改的界限清楚。

### Task 5: 首批验证、发布与下一批接线准备

**Files:** Modify `CURRENT.md` 的真实运行状态、既有K3入口的本轮增量引用；产出证据置checkout之外，避免私人响应/日志入库。

**Interfaces:** Consumes：Tasks1—4结果。Produces：精确提交/环境的首批交付回执、尚未关闭缺口、批次B实施范围；不批量修改152动作状态。

- [ ] 运行`pnpm typecheck`、`CI=true pnpm test:unit`、相应Playwright用例及受影响原回归、`pnpm build`；不得并行build与dev修改同一.next。
- [ ] 独立审查差异及Task2/3负例。仅有新问题、失败或未解释风险时扩展测试，避免无目的重复全套。
- [ ] 将已验证普通修复推送main并部署；先确认远端未新增未知提交，跟踪READY、正式别名及真实请求。若Task1仍有外部阻断，明确不宣称后台故障已修复。
- [ ] 更新CURRENT区分“首批已上线修复”“体验基准已设计”“后续真实研究/资格/版本/探索仍未准出”，保留历史证据及来源替代关系。
- [ ] 依据真实数据库、模型/工具和计算资源核验结果，细化批次B的研究项目、候选/合格资产、持久worker、预算与原子版本任务；复用原K3未完成项，不启动另一条工程主线。

## 首批完成不等于整体完成

首批完成的可验证结果是：故障根因有依据；用户不再得到已知假成功或把服务故障误当空库；有具体真实体验目标和对应能力缺口。完整生产、公开资格、连续EXP和人文质量必须在后续批次按DESIGN退出条件真实证明，不能因为本批测试通过就提前验收。
