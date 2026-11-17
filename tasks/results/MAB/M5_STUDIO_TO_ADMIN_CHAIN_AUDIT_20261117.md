# M5 Studio → Admin 审核发布链路核查记录

> 日期：2026-11-17  
> 性质：一次定向工程现场核查记录；**不是新任务书、不是第二套施工计划、不是验收准出标准**。唯一施工与准出依据仍为 `tasks/implementation/MAB/PLAN.md` V1.7 §3.5 B/C/D。  
> 目标范围：从 Studio 用户入口，沿同一 Creator / Project / Root Task / 原件 / 作品修订，追踪至 Admin 独立审核、运营发布。WATCH 与撤权列为发布后的下游，不在本次链路终点内。

## 1. 现场基线与证据等级

- GitHub `main` HEAD：`b25fbe332b19e48014f8bf5dd556d4a10e1c2010`。
- 本轮业务代码实际部署的受保护 Preview：`dpl_6cNbCqaHKGJWfdhqKkxFneKK3aYv`，状态 `READY`，target=`staging`，代码 SHA `2830f46256b5f7cc6aa8395f9d7c3c7e863e22a8`；Vercel SSO 保护开启，未向公众开放。
- Preview 实际页面 GET：`/studio` HTTP 200、`/admin` HTTP 200；`GET /api/works/published` HTTP 200，返回空作品列表。后者只证明列表接口在当前缺失 Studio 发布表的数据库上不再 500，不证明创作、审核、G5 或发布成功。
- 本轮用于探测的 Vercel 连接不持有 Owner 浏览器应用 Cookie；`/api/auth/me` 返回 unauthenticated，故没有代替 Owner 执行任何 Studio 创建、上传、提交、审核或发布 POST。Owner 已在此前确认本人登录成功。
- Supabase 项目 `mohen-cloud` 只读核查；不拼接历史 Root 的 PASS。

状态定义：
- **UI**：页面和用户可见入口。
- **APP/API**：前后端业务模块及其请求契约。
- **DATA**：数据库表、持久关系及当前真实数据。
- **RUNTIME**：Preview 环境变量、数据库身份、Storage、Runner、Reviewer/Gate 等真实运行依赖。
- **EVIDENCE**：当前环境实际执行过的 HTTP、数据库或同 Root 回执。

## 2. 从 Studio 到 Admin 的主链

### 2.1 Studio 自然语言入口、Project 与 Root Task

**UI**
- [Studio 主工作台](https://mohen-agent-2-0-idmd3wmtc-napoles1.vercel.app/studio)
- [StudioWorkbench.tsx](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/studio/StudioWorkbench.tsx)

**APP/API**
- [Project API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/projects/route.ts)：Owner 会话下创建、列出和改名 Project。
- [Research Task API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/research-tasks/route.ts)：要求 project_id 和幂等键，创建研究任务与不可变 Brief。
- [studio-research.ts](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/lib/studio-research.ts)：`task_id` 由幂等键确定；Project ID 写入 checkpoint；Brief 写入 Studio 资产修订；ST-01 初步研究与正式 ST-04 生产分离。

**数据**
- Project：`studio.projects`。
- Root Task：`public.research_tasks` 中的任务；本实现以 task_id 作为本次 Root Task 标识，并在 checkpoint.studio.project_id 中绑定 Project。
- Brief：`studio.asset_heads / studio.asset_revisions` 中的 `research_brief`。

**当前现场**
- `studio.projects=0`。
- `public.research_tasks=23`，其中 checkpoint 含新 Studio 绑定的任务为 0。
- 这23条旧任务不能充当当前 Project/Root。
- Studio UI 的第一句话会后台自动建立 Project，不要求用户先手工命名项目；之后保存研究任务。正式 D00-D05 生产仍是 Creator 明确触发的 ST-04，不由 ST-01 自动启动。

**判断**：UI/API/数据结构已存在；当前云端同一 Project/Root 真实创建与持久回执未运行。不是需要重新开发 Project 模块。

### 2.2 两种“资料导入”必须区分

**旧资料台路径**
- [Studio 资料台页面](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/studio/desk/page.tsx)，页面路由 `/studio/desk`。
- [ImportForm.tsx](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/studio/desk/ImportForm.tsx)。
- [旧材料导入 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/materials/import/route.ts)。
- 上传 PDF/TXT/MD 或粘贴文本，主要将抽取文本写入 `public.imported_materials`；图片 OCR 路径只在 Windows 本地可用。
- 这条路径是旧的研究文本导入，不等于原件字节私有存储、原件 SHA 回读、source_version 登记或 D00 合格输入。

**正式私有原件路径**
- [StudioWorkbench 原件清单读取](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/studio/StudioWorkbench.tsx)：当前仅见 `GET /api/studio/attachments?project_id=...` 读取项目原件清单；没有从该主工作台调用上传 POST。
- [正式原件 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/attachments/route.ts)：已有 POST 上传与 GET 清单/字节读取；上传需 `MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED=true`。
- [Private Original Repository / Workflow](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/packages/data-access/src/private-original-repository.mjs)：先 Owner-RLS 预留，再私有 Storage 写入，重新读取并核对字节/SHA，最后 finalize 为 `STORED_VERIFIED`，并建立资产修订与来源登记关系。
- [Private Storage Adapter](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/packages/data-access/src/private-original-storage.mjs)：服务端专用 Storage key，禁止向客户端暴露对象 key 或长期公开 URL。

**当前现场**
- `studio.private_originals` 表存在，记录 0。
- 私有桶 `mohen-private-originals` 存在。
- Preview 环境变量清单中没有 `MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED`，也没有 `MOHEN_PRIVATE_STORAGE_SERVICE_KEY`。
- `MOHEN_SUPABASE_URL` 已存在，但它不能替代 Storage 服务密钥。
- 所以正式私有原件 API 虽有代码、表和桶，Preview 上传运行条件仍未具备；主 Studio 也没有把上传 POST 接到可见操作上。

**判断**：这是明确的 UI/API 接线缺口 + Preview 运行配置缺口。应复用正式私有原件流程，不应把旧 ImportForm 当作 D00 原件入口，也不应重建 Storage。

### 2.3 正式生产请求、唯一 Runner 与云端执行

**APP/API**
- [ST-04 Production API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/research-tasks/%5Bid%5D/production/route.ts)：要求任务已完成、checkpoint 中绑定 Project、选择同一 Project 内已验证原件及真实页码；重新核 Owner、原件状态、SHA、asset revision、source_version、来源登记与上传回执。
- [studio-production.ts](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/lib/studio-production.ts)：生产预检、Run 预登记、唯一 Runner/Cloud Dispatch。
- [唯一 Runner](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/run.mjs)。
- [D00-D05 Orchestrator](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/orchestrator/orchestrator.mjs)。
- [Cloud Dispatch](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/orchestrator/cloud-production-dispatch.mjs) 与 [Cloud Runtime](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/orchestrator/cloud-production-runtime.mjs)。

**已具备、应直接继承**
- [唯一 Registry](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/specs/data-production/production-registry.json)：当前为 `ACTIVE_AUTHORIZED`，六个 D00-D05 job 均 enabled，均绑定既有 `private-evidence-adapters.mjs`。
- 该 Registry 的授权范围是原有本地隔离执行授权；它不等于 Vercel Preview 云执行已授权或已接通。
- [Execution Authority](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/lib/studio-execution-authority.ts)：当前本地路径明确要求 localhost 数据库与本地签名/证据文件，不能直接拿来当 Vercel 云端宿主。
- Producer / Private Worker 的低权 LOGIN 角色已存在；隔离 PG17 上的角色/ACL及受限写回曾有验证。

**当前云端运行阻断**
- Supabase `mohen_m5_producer_login`、`mohen_m5_worker_login` 均存在，但 `pg_authid.rolpassword IS NOT NULL` 均为 false，真实数据库密码未激活。
- Preview 有对应敏感环境变量条目，但不能因此认定凭据有效。
- Preview 环境变量清单没有 `MOHEN_CLOUD_EXECUTION_ENABLED`、`MOHEN_CLOUD_EXECUTOR_URL`、`MOHEN_CLOUD_EXECUTOR_CREDENTIAL`。
- 因而当前既没有可用的 Producer/Worker 云端登录，也没有 Vercel 到持续云执行宿主的有效接线。不能用本地 Execution Authority 代替。

**当前数据**
- `control.production_runs=20`，其中14 PASS、5 RUNNING、1 FAILED；全部带 Project scope 的 Run 为 0。
- 历史无 Project Run 不得拼成当前任务的 D00-D05 PASS。

### 2.4 D00/G0、D01/G1、D02 与知识资产

**代码/模块**
- D00：[private-evidence-stage.mjs](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/workers/private-evidence-stage.mjs)、[private-evidence-adapters.mjs](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/adapters/private-evidence-adapters.mjs)。
- 独立 Gate：[rule-gate-reviewer.mjs](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/tools/rule-gate-reviewer.mjs)、[local-gate-service.mjs](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/tools/local-gate-service.mjs)、[independent-stage-qualification.mjs](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/orchestrator/independent-stage-qualification.mjs)。
- D01：[private-text-reading-repository.mjs](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/packages/data-access/src/private-text-reading-repository.mjs)；C01/C02 既有代码与历史隔离验证继承。
- D02：[private-material-generation.mjs](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/pipelines/data-production/workers/private-material-generation.mjs)；既有 C01 G1→D02 typed 请求代码继承，不重建。

**当前云端 Gate 运行配置**
- `control.gate_audits=711` 是历史审计记录，不代表当前有效 Gate。
- 当前 enabled Gate Policy=0、active Reviewer Binding=0、active Gate Service Credential=0。
- `mohen_gate_reader` 当前不是可登录角色。
- 因此当前云端没有可用的独立 G0/G1 Reviewer/Policy/Binding 服务配置；同一 Root 的 G0/G1 签发与资格消费未运行。
- D02 typed 接口有代码，当前同 Root 的 G1→D02 接收和 G2 回执未运行。

**知识资产**
- [Studio Assets API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/assets/route.ts) 与 [Studio Asset Repository](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/packages/data-access/src/studio-asset-repository.mjs) 已存在，13类 `asset_kind` 合同已定义。
- 当前 `studio.asset_heads / asset_revisions / asset_links / use_events` 均为0。
- [Studio Research Read API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/research-read/route.ts) 已有精确版本、当前资格、Owner 权利检查入口；无当前 Project/L0-L5 资产可证明其同 Root 真实消费。
- [Director Plan API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/director-plans/route.ts) 要求 Project、已绑定来源、delegation grant 与真实材料；无来源/授权时会 HOLD，不应视作完整创作能力已运行。

### 2.5 Studio WorkRevision、投稿与 Admin 审核发布

**Studio 创作 UI / API**
- [Studio H1/H2/H3 UI](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/studio/StudioWorkbench.tsx)。
- [Studio Director / WorkRevision](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/lib/studio-director.ts)。
- [创建作品 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/works/route.ts)。
- [保存 Studio Revision API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/studio/works/%5Bid%5D/revisions/route.ts)。
- [提交审核 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/works/%5Bid%5D/submit/route.ts)。

**需要明确的数据模型差异**
- 当前 `commitWorkRevision` 实际写入 `publication.works / publication.work_revisions`；提交、Admin 待审队列和发布也读取同一旧 `publication.work_revisions`。
- 当前数据库存在 `publication.work_revisions`，但不存在 `studio.work_revisions`；新版 WATCH 查询缺表兼容只保证列表接口可返回空列表，不会自动把旧写入链升级为新的 Studio WorkRevision 数据模型。
- 所以现有旧投稿/发布代码可以被复用，但 Studio 新资产修订、最终 WorkRevision、Admin 审核及 WATCH 精确修订之间的 canonical revision 映射必须在工程中明确收口；不能只靠 HTTP 200 认定新模型已贯通。

**Admin UI / 审核与发布 API**
- [Admin 页面](https://mohen-agent-2-0-idmd3wmtc-napoles1.vercel.app/admin)。
- [AdminWorkbench.tsx](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/admin/AdminWorkbench.tsx)：已有运行概览、资格审核、作品审核、发布管理、知识资产、权限撤权、用户管理等界面。
- [作品待审列表 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/works/submitted/route.ts)。
- [作品 Reviewer 待签核 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/governance/gates/pending/route.ts)。
- [作品 Reviewer 决策 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/governance/gates/decisions/route.ts)。
- [Operator 发布 API](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/app/api/works/%5Bid%5D/publish/route.ts)。
- [发布资格/原子指针实现](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/apps/web/lib/publication.ts)。

**三类审核/权限不可混为一谈**
1. D00-G5 专业 Gate：独立知识资格签发，使用 Gate Policy、Reviewer Binding、Gate Service Credential、Gate Audit。
2. 作品发布 Reviewer：对精确 WorkRevision 的知识引用与媒体权利作 `approved/rejected`，写入 `control.work_publication_decisions`；它不等于专业 G5。
3. Operator：只能在作品 Reviewer 已批准、精确 G5 合格、来源引用和媒体逐动作权利齐备后，发布准确 WorkRevision 并原子写入 `publication.published_pointers`。

**当前 Admin 真实阻断**
- 当前只有一个活跃用户同时拥有 operator 与 reviewer 两角色；两角色重合用户=1，operator-only=0，reviewer-only=0。
- `control.work_publication_decisions=0`。
- `publishWork` 明确拒绝 reviewer 与 publisher 是同一身份（除受控环境的显式例外；当前没有启用）。因此当前不能让唯一 Owner 账号自己签核后又自己发布。
- 当前独立 G5 的 Policy/Binding/Service Credential 均为0，故即使作品 Reviewer 决策通过，也不能替代专业 G5。
- `publication.work_revisions` 当前有4条 published、1条 submitted；`published_pointers=4`。这是旧发布模型的试验数据，不属于当前新 Studio Project/Root。
- Admin 页面 HTTP 200 仅证明页面能渲染，不证明已登录会话、队列读取、Reviewer 决策或发布 POST 已真实运行。

## 3. 当前缺口按类型汇总

| 类型 | 已有 | 当前缺口 | 对主链的影响 |
|---|---|---|---|
| UI/导航 | /studio、/studio/desk、/admin 页面；Studio 项目/任务入口；Admin 审核/发布界面 | 主 Studio 没有正式私有原件上传 POST 的用户操作；资料台旧导入不是正式原件 | 无法从正确入口把合法原件送入 D00 |
| APP/API | Project、Research Task、附件上传、唯一 Runner、D00-D05、D02 typed、Studio Assets、WorkRevision、Submit、Admin Review/Publish 代码存在 | 正式上传 API 未接 UI；新 Studio WorkRevision 与旧 publication WorkRevision 模型未统一 | 有模块不等于链路接通 |
| DATA | studio.projects/private_originals/assets、publication works/revisions、Gate表均存在 | Project/原件/Studio资产为0；Root任务不绑定Project；新 studio.work_revisions 缺失 | 没有当前同一任务的输入、资产、作品与审核对象 |
| RUNTIME | Supabase DB 通用连接可用；私有桶存在；Registry本地六阶段已授权 | Storage flag/service key 缺失；Producer/Worker密码未激活；Cloud Executor配置缺失；Gate Policy/Binding/Service Credential为0 | 正式原件上传、云端Runner、独立G0/G1无法运行 |
| REVIEW/PUBLISH | Admin UI、作品Reviewer决策和Operator发布 API存在 | 唯一账号同时担任Operator/Reviewer；决策0；专业G5配置0；canonical WorkRevision需收口 | 当前不能完成合法独立审核及发布 |
| EVIDENCE | Preview READY；Studio/Admin页面200；WATCH空列表接口200 | 当前Project/Root/原件/D00-G0/D01-G1/D02/WorkRevision/Admin决策/发布同链证据均无 | 不可宣布真实业务链通过 |

## 4. 数据与运行现场快照

- `studio.projects=0`；`studio.private_originals=0`；`studio.asset_heads=0`；`studio.asset_revisions=0`；`studio.asset_links=0`；`studio.use_events=0`。
- `public.research_tasks=23`，其中 Studio Project 绑定任务=0。
- `control.production_runs=20`，带 Project scope=0；历史状态14 PASS、5 RUNNING、1 FAILED。
- `publication.works=5`；`publication.work_revisions=5`（4 published、1 submitted）；`publication.published_pointers=4`。
- `control.work_publication_decisions=0`；active Operator/Reviewer 用户均为1且为同一用户。
- `control.gate_audits=711`，但 enabled policy=0、active reviewer binding=0、active gate service credential=0。
- Producer/Worker LOGIN 角色存在，但数据库密码未激活；`mohen-private-originals`桶存在。
- Preview `GET /api/works/published` HTTP 200，返回 `{"works":[]}`；这是当前资格过滤后的空列表，不是发布成功。

## 5. 下一步按 Studio 主线施工的顺序

1. **先补正式原件入口，不重建原件能力**：把现有 `POST /api/studio/attachments` 接到 Studio 可见的上传操作；在受控 Preview 安全配置中补齐现有功能开关和 Storage 服务凭据；验证原件字节写入、重新读取、SHA/长度、source_version 登记、Owner RLS 与幂等恢复。
2. **接通现有云执行宿主**：在获准的安全凭据界面激活既有 Producer/Worker 低权数据库身份；配置 Preview Cloud Executor；验证真实 TLS、数据库角色、最小权限及执行授权。不要改造第二个 Runner，不重建 Registry。
3. **接通独立专业 Gate**：沿既有 Gate Service 配置有效 Policy、Reviewer Binding 和服务凭据，正反验证同一 Project/Root 的 G0/G1 签发、资格消费、撤权；之后真实验证已存在的 C01 G1→D02 typed 接收和 G2 回执。
4. **继续同一 Root 的知识资产和创作**：复用 Research Read、13类资产、H1/H2/H3、19组件及现有 WorkRevision 代码；定向收口 Studio资产修订与最终 WorkRevision 的 canonical 映射。
5. **完成 Admin 两把钥匙与精确发布**：准备独立于 Operator 的 Reviewer 身份；验证作品级 Reviewer 决策、独立专业 G5、来源引用、媒体逐动作权利、精确 revision、Operator 原子发布。不能让同一账号自审自发。
6. Admin 发布成功后，再沿同一 WorkRevision 验证 WATCH 合法消费与撤权；这仍是 M5 八维的下游要求。

**本次没有要求 Owner 开始实际创作或执行验收。** 只有工程把原件入口、云端执行、独立Gate和同Root连续运行准备好后，才安排最小必要的 Owner 操作。

## 6. 边界声明

- 本记录不提升 M5 节点、边或八维状态；当前 M5 仍为 `0/8 / OVERALL_HOLD`。
- 不将历史隔离 PASS、旧 Project 外的 Run、旧作品发布指针、Preview READY 或单个 HTTP 200 拼接成当前整链 PASS。
- 不新增收费环境、不切换正式 Production、不公开部署；不输出密钥、不代用 Owner 浏览器会话。
- 施工顺序和最终验收继续以 [PLAN V1.7 §3.5](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/tasks/implementation/MAB/PLAN.md) 为唯一权威。
