# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **核验日期：2026-11-19。** 本次代码核验基线为main SHA `380428f1866b33ba14abb345b01f83154935cfe3`；上一进展证据追加提交为`c81436648614f9ae485235eefaac50704850e986`。本轮断点01定向诊断记录见progress最新批次。施工标准仍为PLAN V1.7（八维口径提交`d74243db76fa541278ac2372681ed8b111e12f2c`）。本文件只记录当前事实与下一最前阻断，不替代PLAN。

## 1. 唯一业务目标

以PLAN §3.5 B/C/D为唯一准出标准：同一真实Creator/Project/Root任务，从Studio问题→L0—L5统一检索与当前资格/权利判断→按缺口选择必要D00—D05及独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin审核/发布→WATCH精确修订消费和撤权。已有合格资产可复用；用户上传原件是可选输入，不得重复获取或生产。

## 2. 当前已核事实

### 2.1 同一真实Studio任务

- 当前开发Project：`e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`。
- 朱家角研究任务：`53ad1a29-22e5-43c2-816d-b02b6e85abbd`；最新只读回查仍为`hold`，`work_id=null`，`budgetSpent=1`，`reserved=0`，缺项为`FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE`，最后更新时间`2026-11-18T01:58:09Z`。
- `research_events`证明最初的`REAL_PROVIDER_UNAVAILABLE / AGENT_QUALIFICATION_CONTEXT_REQUIRED`已解除并续跑；一次`llm-understand`已结算，随后正式知识读取前置再次HOLD。不得重复调用已结算模型步骤。数据库层正式读取ACL/函数此前已修复，但同一Creator签名会话下的Studio应用层读取尚未复验通过。
- 最近一次Project范围回读：Asset Head 1；私有原件0、当前Project Source 0、Source Version 0、Raw Item 0。此数据未因本轮D00迁移安装而改变。

### 2.2 八维完成度报告

**整体仍为`0/8 OVERALL_HOLD`**。这只表示尚无同一真实作品八维整体验收，不代表没有工程进展，也不是代码完成率。按PLAN新增的五类证据分别报告：

| 维度 | 能力实现 | 调用集成 | 环境验证 | 同一任务证据 | Owner验收 |
|---|---|---|---|---|---|
| 1. Studio自然语言入口 | 已有 | 部分：研究与正式原件入口未统一 | 部分 | 无 | 无 |
| 2. 内外AI混合协作 | 已有相关能力 | 未证明同Root双主体贡献闭环 | 未证明 | 无 | 无 |
| 3. D/L/G知识生产 | 已有代码；D00基础表与Worker角色已安装 | 部分：来源登记/获取桥仍缺 | 部分：数据库授权已核，真实TLS未核 | 无 | 无 |
| 4. 13类知识资产 | 已有模型与部分能力 | 部分 | 未完成类型级全覆盖验收 | 无 | 无 |
| 5. Studio真实创作 | H1/H2/H3及组件代码已有 | 部分：缺真实研究驱动的完整WorkRevision | 未完成 | 无 | 无 |
| 6. Admin治理 | 已有相关接口与治理能力 | 部分 | 未完成同作品验证 | 无 | 无 |
| 7. G5与作品发布 | 已有部分审核/发布代码 | 未接通独立Reviewer与精确修订资格 | 未完成 | 无 | 无 |
| 8. WATCH与撤权 | 已有精确修订消费/撤权代码 | 未完成真实发布后闭环 | 未完成 | 无 | 无 |

### 2.3 本轮已修复的代码与标准

- **项目范围来源缺口路由**：提交`c7d48700a21ffe08100ce4a4c26293a37103e1f5`。现在`PROJECT_SOURCE_GAP_CONFIRMED`与全局`SOURCE_GAP_CONFIRMED`都能触发既有候选发现，但仍保留范围语义；跨Project共享范围继续为`NOT_VERIFIED`。已有正反回归断言，尚未获得CI执行PASS。
- **专用Worker角色接线**：`private-evidence-binding.mjs`已改用事务级`createPrivateWorkerScopedQueryPool`执行D00 ledger与Producer侧Gate候选查询；每条查询在事务内`SET LOCAL ROLE mohen_private_worker`。Owner私有原件读取仍走`mohen_app_runtime`。已增加提交/回滚单测，但尚未运行。
- **Y05来源身份边界**：已修复“提供方被误当作馆藏机构”的过度推断。只有`registration.original_locator.holding_institution`与馆方目录号/件号同时存在，holding才标known；顶层`holding_institution`不被采纳。证据路径与测试fixture已同步到`original_locator`，正反用例已增加，但CI尚未执行。当前登记投影返回完整`original_locator` JSONB；如果其中没有明确馆藏字段，就保持unknown。
- **角色迁移合同**：M3/M5迁移文件已对齐：Worker login可SET专用`mohen_private_worker`；角色本身NOLOGIN、无superuser/BYPASSRLS；不授予Gate签发或撤销能力。未激活机器Reviewer。
- **八维标准**：PLAN §3.5 B已定向修订。保持八维和同一真实作品最终准出；明确知识G5与作品发布审核边界；13类资产类型级验证、19组件逐项验证但不强迫单件作品全部使用；第5维增加人文认识增量、时间/空间/关系、当下生活连接、探索乐趣和视觉认识变化。

### 2.4 mohen-cloud开发数据库现状

**已成功安装以下七项既有迁移**（迁移历史版本与名称均已回读）：

| 数据库迁移版本 | 能力 |
|---|---|
| `20261118113540` | M3 Private Worker角色与Gate候选权限 |
| `20261118113649` | Gate Audits RLS |
| `20261118113658` | D00-C1来源需求/获取方法/获取尝试 |
| `20261118113706` | D00-C4资源目录/覆盖/候选核查/优先级 |
| `20261118113714` | D00-Y02登记定位信息 |
| `20261118113721` | D00-C5方法重新核验 |
| `20261118113729` | D00-Y04原始提供方追溯 |

- `mohen_private_worker`现已存在：NOLOGIN、非superuser、无BYPASSRLS。`mohen_m5_worker_login`为其MEMBER并具SET权。
- Worker角色可写D00需求/资源目录和Producer侧Gate候选、可读取Gate audit；无Gate签发/撤销函数权限。D00表RLS已启用。
- D00新表当前均为0条；全局旧`source.sources/source_versions/raw_items`为39/39/98，但当前Project范围Source/Version/Raw仍为0，私有原件仍为0。未制造测试业务记录。
- `mohen_gate_signer_m5_machine`不存在；这是有意保持的未激活状态，不得为方便迁移而提前创建/激活独立Reviewer。

### 2.5 尚未闭合的来源获取与登记主线

这是当前最前业务阻断，且已定位到具体代码边界：

1. 旧`/api/studio/materials/import`导入路径与`/api/studio/attachments`私有原件路径仍分离；两者尚未汇入同一来源准入输出合同。
2. `POST /api/studio/attachments`只接收项目、文件、幂等键与`rights_declared=true`，保存私有字节、SHA回读和Asset Revision，返回`rights_status=declared_unverified`；没有来源身份、逐动作权利、馆藏定位等元数据输入，也不写Source/Version/Raw。
3. `GET /api/studio/attachments?project_id=...`通过`createPrivateSourceRegistrationRepository.lookup`检查已有绑定；该Repository只读。数据库`studio.private_source_registration(uuid)`同样是只读投影，不是登记写入器。
4. `source-discovery-repository.mjs`只写D00来源需求、获取方法/尝试、目录、核查、覆盖、优先级及提供方追溯账；不写`source.sources/source_versions/raw_items`。Y05/Y07/Y08模块负责派生和校验，不负责写入；私有上传SHA回读也不证明外部取得或版权许可。
5. 因此缺少的是可信的**来源登记生产者/交接服务**：保留Owner上传与外部候选/合法获取各自不同的证据语义，再把合格输入统一绑定为Source→Version→Raw，并关联私有原件、SHA、字节数、Asset Revision、逐动作权利和取得账。未知权利保持HOLD。

外部候选不是原件、事实、权利许可或Gate资格。不得将上传回读冒充外部获取证明；权利未知时必须保持HOLD。

### 2.6 云端环境、CI与Preview

- Vercel Preview环境中Producer/Worker数据库URL与密码变量名存在，数据库CA和会话Secret变量存在；本轮未读取或解密任何Secret值。变量存在不等于真实TLS身份登录通过。
- 已为精确main提交`ffad0e400f7094d43ca9eea0bca9489f479c2adb`创建Vercel Preview部署：`dpl_9BzzYYqMCxuvLej2hzwBWDb9fSvC`，target=null，状态`READY`。构建日志确认Next build、Serverless functions和Deploying outputs完成；不证明单测或Worker TLS通过。仓库`vercel.json`的`git.deploymentEnabled=false`，Preview SSO保护开启；Production未修改。
- Vercel项目Node运行时为24.x，GitHub CI已从Node22对齐到Node24（提交`758270d`）。最新GitHub Actions run `44302569975`与`44302564923`均约3–4秒失败，Job的`steps=null`，没有可读runner/logs；失败发生在任何CI步骤前。新增路由、Worker、Y05单测均NOT_RUN，不能宣布PASS。


## 2.7 2026-11-19来源权利快照合同补齐

- GitHub main新增迁移文件`supabase/migrations/20261119110000_m5_private_source_rights_projection.sql`，并已在非生产开发库`mohen-cloud`实际应用；Supabase迁移历史记录为`20261119004253_m5_private_source_rights_projection_20261119`。
- `source.sources`新增`rights_by_action/rights_evidence`；`source.source_versions`新增`rights_snapshot`。三者均NOT NULL、默认空对象；只接受既有唯一权利词典的规范动作/取值，空/缺失动作仍为unknown/HOLD，未从旧rights自由文本推断许可。
- Source Version权利快照可从空对象固定一次，非空后不可改。只读投影`studio.private_source_registration(uuid)`返回版本快照及权利证据；执行权限仅`mohen_app_runtime`，Worker、anon、authenticated均无执行权。
- 数据库事务内合成fixture正反检查4项全部通过，事务已ROLLBACK，没有留下业务数据。当前Project的私有原件、Source、Version、Raw仍为0。
- GitHub main相关提交：迁移`67f0a994`；权利测试fixture`7908a229`、负例`a5933de8`；Repository校验`2524b533`；D00 Worker传递`54262812`；D00 Adapter向独立G0候选证据传递`2d325472`；Worker测试fixture`161aa2ae`。完整SHA及逐项证据见progress.md的M5-SOURCE-RIGHTS-01。
- **状态边界**：这是来源登记合同的一个子缺口修补，不是Source/Version/Raw登记生产者，不是D00运行，不是G0 PASS。Repository/Worker/Adapter的代码回归仍未执行，不能宣布代码测试通过。

## 2.8 最新CI与应用层正式知识读取状态

- main代码SHA `a5933de8a8cb5c1470fd9a30acd1b70da0acd691`对应CI run `44431800686`失败；build job `135250727724`在约2秒内结束，`runner_id=0`、runner_name为空、steps为空数组。相邻main提交的CI、隔离PG17及HTTP作业呈相同“步骤启动前失败”形态。**当前只能判断Runner/job未启动，不能判断本批测试代码失败，也不能在无证据时断言具体账单根因。**
- 正式知识读取仍HOLD。数据库日志中已有调用以`M5_FORMAL_READ_OWNER_REQUIRED`拒绝；本批没有完成真实Studio Creator会话→签名DB会话→`studio.search_qualified_project_layers`的端到端正向回读。不得用postgres高权查询或临时伪造Owner身份替代。
- 不得重复调用朱家角任务已结算的`llm-understand`；不创建新Project/Root、不启动Provider、不增加模型费用。


## 3. 当前唯一工程前沿

按PLAN §3.5 D推进，不重建D00—D05、Runner、Registry或Gate：

1. **唯一下一断点：解除朱家角Studio任务的正式知识读取HOLD**。只沿同一Creator会话→服务端签名数据库会话→受限应用事务→`studio.search_qualified_project_layers`这条真实路径核验身份与Project归属，定位`M5_FORMAL_READ_OWNER_REQUIRED`的实际产生点；用原任务做零模型调用的正式读取回归，必须同时得到完整、未降级的Project范围结果和错Project/错用途拒绝。不得重跑已结算的`llm-understand`，不得用postgres高权直连或人工构造身份代替真实Owner路径。
2. **再判断是否触发D00来源发现**：只有正式读取返回完整、未降级的Project范围结果，且确认无可复用合格来源/原件后，才由既有路由触发D00；读取未授权、截断或不完整时继续HOLD。
3. **补可信Source/Version/Raw登记生产者**：把Owner上传与外部候选/合法取得汇入同一登记输出合同，保留两种输入的不同来源与权利证据；将登记、私有原件、SHA、Asset Revision和D00获取账做成可回读连续交接。
4. **并行完成Worker TLS与CI回归**：真实Worker TLS身份/SET正反验证；GitHub runner恢复后运行Y05、Worker、路由及相关回归。当前Preview已READY，CI仍在步骤执行前失败。
5. **同一Project/Root真实生产**：登记链完成后，连续跑D00/G0→D01/G1→D02持久回执，再按实际研究缺口推进后续D/L/G与作品，不重跑历史PASS。

## 4. 当前不可宣称事项

尚无当前Project私有原件、Source/Version/Raw登记；尚无本轮真实D00/G0运行、D01/G1、D02持久回执；尚无同一作品WorkRevision、Admin审核、独立G5发布、WATCH消费与撤权。不得把迁移安装、代码存在、Preview BUILDING或历史测试PASS解释为M5准出。

## 5. 文件读取与更新

施工标准只读PLAN相关章节；当前事实只读CURRENT；逐批证据追加progress；仅平台/环境切换时读取ENGINEERING_HANDOFF_CURRENT。交互导航JSON/MD/HTML已停用，不再维护或作为施工依据。

## 2.9 2026-11-19｜断点01 Studio正式知识读取HOLD 定向诊断（未关闭）

- **核验基线**：main HEAD `380428f1866b33ba14abb345b01f83154935cfe3`；本轮只读源码、GitHub Actions、Vercel Preview元数据、mohen-cloud数据库和日志；没有修改业务代码、创建任务/Project/Root或调用模型/Provider。
- **真实任务**：朱家角任务`53ad1a29-22e5-43c2-816d-b02b6e85abbd`仍为`hold`，`work_id=null`，`budgetSpent=1`、`reserved=0`；最新事件仍为2026-11-18T01:58:10Z的`prerequisites_hold`，缺项`FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE`，没有新的业务执行事件。
- **源码定位**：`studio.search_qualified_project_layers`在Owner guard处主动抛出`M5_FORMAL_READ_OWNER_REQUIRED`（SQLSTATE 42501）。应用层`retrieveQualifiedFormalProject`在同一`createAppTransaction`中先校验Owner/Project，再调用该函数；其catch把异常统一转换为`degraded=true / projectQualifiedCoverage=UNAVAILABLE`，上层`research.ts`再转为正式读取前置HOLD。需要区分数据库Owner guard真实失败条件与应用层异常折叠问题。
- **证据边界**：mohen-cloud历史Postgres日志中的同名错误，其SQL注释标注来源为`POST /mcp`，内容是管理端直接构造数据库会话Token后执行的诊断SQL；它不是当前真实Studio HTTP请求日志。Vercel Preview最近50分钟没有匹配正式读取日志，也没有error/fatal运行日志；无request ID可把Studio Creator请求与数据库异常一一关联。
- **身份合同**：`signDatabaseSessionToken`使用Vercel环境变量`MOHEN_DATABASE_SESSION_SECRET`签名；数据库`control.current_app_user_id()`使用`control.session_verification_keys`活动槽验证。Preview环境变量名存在且目标含preview，但本轮未读取Secret明文，未完成两端密钥指纹一致性核验。开发库活动验证槽为1个、密钥长度64；Project owner为`270bcecf-9bfb-4865-9432-a0ac9db8df75`。不得以SQL自行构造Owner token替代真实应用会话。
- **既有修复继承**：`20261118120000_m5_formal_project_read_acl_order_fix.sql`仍是当前main迁移；输出列歧义和嵌套`qualification_allows`授权修复未重做。应用事务仍按`BEGIN → SET LOCAL ROLE mohen_app_runtime → set_config(mohen.session_token) → current_app_user_id()`执行；没有证据支持放宽数据库ACL。
- **部署/CI**：最近可回读的Vercel Preview为`dpl_9BzzYYqMCxuvLej2hzwBWDb9fSvC`，状态`READY`但target=null、对应旧提交`ffad0e4`，不是当前HEAD的应用层运行验证。main HEAD的CI run `44432723926`失败，build job `135253860067`的`runner_id=0`、`steps=[]`，约3秒结束；Runner/job未启动，测试NOT_RUN，不是测试失败证据。
- **施工决定**：没有足以证明真实Studio请求中Creator身份在哪一层丢失的证据，故不做猜测性代码修改、不加宽权限、不建诊断后门。当前状态维持`HOLD`，本轮无模型费用。
- **下一项诊断（仍属断点01）**：取得一次真实Studio受保护Preview请求的request ID/时间戳，并在同一请求关联服务端已验证Creator UID、Project ID、签名数据库会话生成状态（只记录是否生成，不记录Token/Secret）、数据库事务中`current_app_user_id()`解析UID及Owner/Project guard结果；若身份UID匹配但SQL guard仍失败，再用同连接/同事务证据定位上下文差异。安全日志不得包含Token、Secret或原件内容。
- **关闭判定**：断点01未关闭。合法Creator真实应用读取、错Project/错用途/无效身份反向验证、L0—L5完整结果及Studio消费均未通过本轮真实请求验证；不进入断点02。


## 2.10 2026-11-19｜断点01零模型正式知识读取诊断入口（待真实Owner请求验证）

- 在既有正式读取Repository增加安全错误分类：只记录规范化错误码，不记录SQL参数、Token、Secret或原件内容；返回`failureCode`供诊断区分Owner/Project失败与未知数据库故障。没有改变Owner/Project ACL、Gate资格或数据库授权。
- 新增只读Studio诊断路由`GET /api/studio/projects/[projectId]/formal-read`：使用真实登录Cookie解析Creator身份、同一`signDatabaseSessionToken`签发短期DB身份；调用既有`retrieveQualifiedFormalProject`（L0-L4）及`retrieveMaterials`（L5），零模型、零写入，只返回数量/覆盖/错误码，不返回材料正文或标识。
- 路由受Creator/Operator会话保护；正式读取Repository仍执行原Owner/Project与Gate资格校验。该路由不是第二套读取机制，仅为真实应用身份的零费用验收入口。
- 真实Owner请求尚未执行；未取得request ID/运行回执前，不得宣布应用验证PASS或断点关闭。原朱家角任务未恢复、未重放模型调用。


## 2.11 2026-11-19｜BP01诊断Preview部署完成

- 当前代码提交`6e31431b332b5aed40d47206a0229718f7784807`已部署到受保护Vercel Preview：`dpl_BxpZG6SP455F51fEtoP2t4pEX5hC`，URL `https://mohen-agent-2-0-f5scpkmg7-napoles1.vercel.app`，部署状态`READY`，target=null（Preview），Production未修改。
- Vercel构建日志确认Next.js优化构建成功、TypeScript类型检查阶段通过、静态页生成完成并产出Serverless路由。该结果是BUILD PASS，不是Studio真实Creator身份/正式知识读取PASS。
- 零模型诊断入口：`/api/studio/projects/{projectId}/formal-read?term=...`。必须通过Vercel Preview SSO及MoHen Creator登录Cookie；只读调用既有L0-L4/L5 Repository，返回各层数量/覆盖/规范错误码，不返回材料正文或记录标识。
- 下一步必须取得Owner在此Preview中的一次真实请求回执；未发生Owner请求前，真实应用验证仍NOT_RUN，断点01保持HOLD。


## 2.12 2026-11-19｜断点01真实Owner请求通过，知识资格存量为空（未关闭）

- **真实应用请求证据**：Owner在精确Preview `dpl_BxpZG6SP455F51fEtoP2t4pEX5hC`完成登录后访问原Project诊断入口，回执：`ok=true`、`identity.authenticated=true`、`dbSessionSigned=true`、`project.ownerCheck=evaluated`；L0-L4 `coverage=COMPLETE`、`degraded=false`、`failureCode=null`、`truncated=false`、`count=0`；L5 `degraded=false`、`count=0`。因此Creator浏览器会话、应用层身份解析、数据库签名会话生成、Owner/Project读取路径和两个Repository的无异常执行均获真实应用请求PASS；这不是知识命中PASS。
- **开发库资格存量核查**：`control.qualification_current`全表当前为0行；按Project关联`control.qualification_current`为0行。故该开发库没有任何当前有效的G0-G5资格记录可供正向知识命中测试。L5六类Read Model当前有存量：world_projections=11、map_timeline_projections=9、agent_contexts=41、story_seeds=42、discovery_paths=63、evidence_pointers=132；但对应当前G5资格记录为0，按现行读取合同必须全部拒绝作为合格知识返回。
- **Project资产情况**：指定Project有1个asset_head、1个current asset_revision、0个asset_links、0个关联当前qualification。该revision为`research_brief / editorial / WORKING / RESTRICTED / UNKNOWN_DEPENDENCY`，formal_l_refs为空；它不是L0-L4正式合格知识资产，不能拿来伪造正向命中。
- **根因边界更新**：原始`M5_FORMAL_READ_OWNER_REQUIRED`身份/Owner故障在本次真实Owner请求中未复现。当前HOLD不再有证据指向应用Creator身份丢失或数据库Owner guard；实际缺口是测试环境不存在可用于正向读取的当前资格知识资产。L0-L4的`coverage=COMPLETE`表示检索执行未截断且无异常，不代表有资产；L5同样是成功执行但零命中。
- **反向验证**：本次只验证正确Owner/正确Project正向身份路径。错误Project、错误用途、无效/过期身份仍未通过真实应用请求实测；数据库函数已有Owner/Project与用途guard，不能将历史SQL测试替代本次真实应用反向验证。
- **费用保护**：朱家角task `53ad1a29-22e5-43c2-816d-b02b6e85abbd`未恢复、未重建、未调用模型；没有新Project/Root；本次诊断零模型费用、零业务写入。
- **下一步（仍为断点01）**：先确认是否存在可合法复用的当前G0-G5资格对象，且属于同一Project或已有明确授权共享范围；若无，当前环境只能标记正向知识命中`NOT_RUN / NO_QUALIFIED_FIXTURE`，不能为了让测试通过而制造资格、伪造知识或放宽Gate。随后在不触发模型的情况下完成真实Preview的错Project/错用途/无效身份拒绝测试，并把断点结论明确拆分为`IDENTITY_PATH_PASS`、`READ_QUERY_PASS_EMPTY`、`QUALIFIED_KNOWLEDGE_POSITIVE_NOT_RUN`。
- **关闭判定**：断点01尚未关闭。身份和读取调用链的主要正向路径已PASS，但“读取自己Project下具有合法资格的L0-L5知识资产”尚无真实正向样本，反向应用测试亦未全部完成。不得转入断点02。
- **真实Preview错Project反向请求（2026-11-19）**：使用不存在且与当前Consumer上下文不匹配的Project UUID访问正式读取诊断入口，返回 `ok=false / FORMAL_PROJECT_READ_CONTEXT_REQUIRED`。确认请求在 `retrieveQualifiedFormalProject` 的应用层上下文一致性检查处被拒绝，未进入数据库Owner guard；因此应用层Project上下文隔离反向测试PASS，但数据库层跨Owner拒绝尚未单独实测。不得将该结果描述为数据库Owner guard PASS。

- **所谓退出后的无效身份测试未成立（2026-11-19）**：用户再次访问错Project诊断URL，仍返回 `FORMAL_PROJECT_READ_CONTEXT_REQUIRED`。回读当前Preview路由源码确认执行顺序为 `getSession()`→无会话返回401 `login_required`→角色校验→Project ID/terms→`consumerContext`→Repository。因此该响应说明本次请求仍通过了应用登录检查，但在Project/用途上下文阶段被拒绝；它不是无效身份拒绝测试，不能记为401 PASS。下一次无效身份测试应在无MoHen Cookie的独立浏览器隐私窗口进行（仍需通过Preview SSO时单独完成平台验证），再访问正确Project诊断地址；预期应用层返回401 `login_required`。不要求用户反复执行未完成的登出动作。

- **再次尝试的无效身份测试仍未形成**：用户从所提供的测试链接获得与Owner请求完全相同的回执：`identity.authenticated=true`、`dbSessionSigned=true`、Project ownerCheck=evaluated、L0-L4 COMPLETE零命中、L5正常零命中。由此只能确认本次HTTP请求仍携带有效MoHen应用会话并成功签发DB会话；不能记为未登录401，也不能证明请求来自真正无MoHen Cookie的隔离浏览器上下文。无需继续重复同一链接。后续若必须完成未登录负向测试，应使用全新浏览器配置文件/另一浏览器，确认没有MoHen登录Cookie后直接访问正确Project URL；若Preview SSO拦截，则先仅完成平台访问验证，避免登录MoHen账户。
