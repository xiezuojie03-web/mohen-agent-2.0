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

## 5. 现行施工顺序的唯一引用（旧列表已归档）

**本节不再另列步骤。** Owner于2026-11-17纠正的唯一业务顺序见本报告[§7.6](#76-修正后的施工优先顺序)；正式施工以[PLAN §3.5 B/C/D](../../implementation/MAB/PLAN.md)为准。原先把“正式原件上传POST”列为通用第一步的旧清单已原样移至[旧口径留档](archive/M5_ACTIVE_DOCUMENTS_BEFORE_20261117_CONSISTENCY_CLEANUP.md)，不得执行。当前最前**业务功能**缺口是统一L0—L5检索与缺口路由；云端独立G0运行前沿属于新来源D00子路径，不代表所有研究都先做D00。

## 6. 边界声明

- 本记录不提升 M5 节点、边或八维状态；当前 M5 仍为 `0/8 / OVERALL_HOLD`。
- 不将历史隔离 PASS、旧 Project 外的 Run、旧作品发布指针、Preview READY 或单个 HTTP 200 拼接成当前整链 PASS。
- 不新增收费环境、不切换正式 Production、不公开部署；不输出密钥、不代用 Owner 浏览器会话。
- 施工顺序和最终验收继续以 [PLAN V1.7 §3.5](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/tasks/implementation/MAB/PLAN.md) 为唯一权威。


## 7. Owner反馈后的架构语义补正（2026-11-17）

> 本节纠正第5节将“正式原件上传接入Studio”过度表述为第一主线的偏差。不得把“原件字节→SHA→Source Version→D00→G0”理解为每次Studio研究的必经顺序；该序列只描述“新增/用户提供原件”完成存储登记后进入私有来源准入的一条路径。

### 7.1 正确业务分流：先查可复用存量，再决定是否D00

Studio收到自然语言问题后，Agent应先检索墨痕所有当前可访问的L0—L5知识/来源资产，逐项核对Owner/Project/共享ACL、当前revision、来源身份、逐动作权利、consumer、purpose、scope及对应当前Gate资格，再作分流：

- **已有L0**：若source_version、原件身份/来源绑定、逐动作权利及当前G0对本次consumer/purpose/scope有效，可直接将原件作为来源调用；若原件已在库但缺少有效G0，只定向补齐来源登记/准入和G0，不重新搜索或下载；只有尚无可用L1读取成果时，才按批准方法进入D01/G1读取。L0原件存在不等于其内容已被读取。
- **已有L1**：若其上游来源G0、L1定位/版本、当前G1资格及本次用途/权限均有效，可直接复用L1，不重新执行D00或D01。若仅有未签发/未评估的L1候选，可作为待核线索，不能冒充合格事实。
- **已有L2—L5**：按当前层级资格、用途和消费权限直接复用；只对研究中确实缺少的下游成果继续生产。L5仍走现有G5/consumer/purpose/scope合格读模型。
- **只有在可用存量不足或存在明确缺口时**，才为缺失部分启动D00来源发现与获取；不得为已经存在且合格的资产重复获取、重复读取或重复生产。

“数据库里有合法资源”是可调用的必要条件，但不是无条件全库可读：还须满足身份/项目/共享范围、来源版本与权利逐动作许可、用途和consumer限制、当前资格。允许人工读取也不自动等于允许发给外部模型处理、公开展示或发布。

### 7.2 新增资源时的完整D00路径

D00是来源发现与获取链，不应简化为一个上传按钮。正确顺序为：

1. Y01：先盘点全局/当前作用域的可用存量与本题研究需求，确定真实缺口。
2. Y02/Y03：仅对缺口开展机构目录、多渠道检索、异名/时代/跨语言扩展，产生可追溯候选。
3. Y04—Y06：核对目录回溯、取得覆盖、来源身份、权利线索与优先级。
4. Y07：形成合法获取方案并执行实际取得；必要时由Agent调用允许的外部资源服务，也允许Owner提供原件作为其中一种输入方式。
5. 对实际取得的字节进行私有存储、SHA/长度回读、source/source_version/raw_item身份登记和获取尝试/覆盖记录。
6. Y08形成取得回执并提交G0候选；独立G0核准来源和D01方法计划后，D01才按批准方法读取，随后G1、D02/G2等按实际缺口继续。

### 7.3 当前代码真实情况：尚未形成上述统一路由

- [`runResearch`](../../../apps/web/lib/mohen-agent/research.ts) 当前调用 [`retrieveMaterials`](../../../apps/web/lib/mohen-agent/retrieve.ts) 检索现有六类L5 read-model成果，再调用 [`discoverExternalSources`](../../../apps/web/lib/mohen-agent/source-discovery.ts) 检索上海图书馆、Commons、国会图书馆、维基文库候选。后者输出的是`RESEARCH_LEAD`线索，不是已下载原件或合格知识。
- 当前`source-discovery.ts`的`diagnoseSourceNeed`只接收`localMaterialCount`；而`runResearch`传入的数量来自L5检索结果，不是全局L0—L5存量。且`discoverExternalSources`即使有本地材料，仍会执行外部候选检索。因此它尚不是完整的“全层级存量盘点→只对缺口获取”编排。
- [`readStudioResearchProject`](../../../apps/web/lib/studio-research-read.ts) 已有项目内读取能力：Owner当前Project的L0私有原件、L1阅读单元、L2证据链接及项目L3/L4候选；L1/L2在该路径中仍标为`UNASSESSED_CANDIDATE`。L5走单独的G5合格读模型。该读取服务目前是项目作用域，不是全库共享L0—L4检索；新建Research Task的初始`runResearch`路径没有调用它。
- [`verifySourceIntake`](../../../pipelines/data-production/workers/private-evidence-stage.mjs) 的D00 Worker要求原件已经`STORED_VERIFIED`并完成source registration，然后复核字节/SHA、项目作用域、来源绑定，记录Y01—Y08相关准入/获取账，最后提交G0候选。这是“实际取得后”的私有来源准入实现，不是外部资源搜索/下载本身。
- [`StudioWorkbench`](../../../apps/web/app/studio/StudioWorkbench.tsx) 当前正式生产操作要求用户从本Project原件清单中手动选择一个已登记原件并输入页码；这只是用户提供/已入库原件的受控生产入口，不应被提升为所有Studio研究的普遍入口。
- 因此当前真正缺少的是**统一的L0—L5知识存量检索/资格路由，以及“发现缺口→D00合法获取→原件存储登记→G0”的连续编排**。单独把上传POST加到Studio UI，并不能解决这个核心问题。上传应保留为用户提供原件的一种可选方式。

### 7.4 两个Studio页面的实际职责

- [`/studio`](../../../apps/web/app/studio/StudioWorkbench.tsx)：当前主自然语言研究/创作工作台，自动建立Project/Research Task，显示研究结果和缺口，承载导演、分镜、作品修订及投稿。
- [`/studio/desk`](../../../apps/web/app/studio/desk/page.tsx)：历史保留的资料台/辅助观察页，包含旧`ImportForm`（写入`public.imported_materials`，不是正式私有原件）、`ProjectNotebook`（Project/研究资产手工记录）、材料篮以及D00 Y01—Y08来源/获取回执展示。
- 现行上位架构没有要求用户必须面对两个独立Studio入口。长期以`/studio`为唯一主入口；资料台中仍有价值的资料详情、记录和D00观察能力作为Studio上下文子视图/辅助诊断保留。先继承功能，不把旧导入流程当正式原件流程，也不因入口重复立即删除页面。

### 7.5 Admin角色补充说明

- `Admin`是管理工作台，不是独立用户角色；现行登录角色为`member/creator/operator/reviewer`。
- 登录角色`reviewer`签署作品级精确WorkRevision审核决定；`operator`执行发布/撤回。二者可以出现在同一Admin工作台，但同一身份不能对同一作品既审核又发布。
- 作品Reviewer决定不等于专业G0—G5/G5；专业Gate资格仍由独立资格服务验证。
- 当前单一Owner账号同时持有Operator与Reviewer，阻断的是“同一身份真实签核后再发布”的正向集成验收，不阻断开发、模块测试或分别验证两种权限。最终真实发布测试时再准备Reviewer-only测试身份；当前Admin用户管理页面没有角色分配操作，需通过受控配置授予，不可把普通注册账号自动视为Reviewer。

### 7.6 修正后的施工优先顺序

1. 先实现Studio统一的L0—L5存量检索与当前资格/权限路由，覆盖项目私有和可共享的全局知识范围。
2. 只有检测到明确缺口时才启动D00；把现有多渠道候选发现、合法获取/下载、私有存储与source_version登记、Y01—Y08记录和G0候选连成一条可恢复链。
3. 对已有L1及以上成果直接按资格复用；只有L0缺少读取成果时才进入D01/G1；下游按缺口继续。
4. 用户上传/指定原件保留为可选来源输入，不是每次研究必填项。
5. 将`/studio/desk`有价值的资料与过程观察能力收敛到主Studio的上下文视图；不再以“接上传按钮”作为Studio主链唯一首要任务。
6. 在作品发布阶段再准备独立Reviewer测试身份，并完成作品级Reviewer、专业G5、Operator三者职责验证。

本节是2026-11-17当批审计的设计与代码差异判断；其原则已汇入现行PLAN §3.3与§3.5 C。后续执行以PLAN为唯一权威，不因报告与PLAN重复而产生第二套标准。本次整理未提升任何导航节点/边或M5八维状态。
