# MoHen｜API / Tool 集成与安全机器合同（K3目标候选）

> 2026-10-31：随Owner批准的K3本地施工接入的技术设计要求；本文设计状态和历史源码证据不等于当前运行准出。首批工程范围、已测结果及剩余HOLD见 `tasks/results/K3_C1_LOCAL_CONSTRUCTION_20261031.md`。MHKA与生产权限未激活。

> `status: DESIGN_CANDIDATE_NOT_APPLIED` · `owner: MHKA-05`。
> 本文件针对现有真实API和Tool职责给出**最小统一约束**，不声称下列目标请求字段或错误枚举已在现有代码实现。未来可以生成OpenAPI，但不必同时维护人工合同和一份冲突的OpenAPI作为双重权威。

## 1. 合同唯一性与分类

- API = 软件请求/响应/资源权限的真实机器合同；Skill = MHKA-04的专业任务能力；Tool = 具体原子操作；Production Tool = 受控生产申请入口。`ExperienceAction`是MHKA-02用户行为，不是一条自动定义的API。
- 优先取当前 `apps/web/app/api/**/route.ts` 的实际实现和U07动作字典，逐项记录: HTTP method+path、业务资源、caller角色/上下文、项目和对象归属、作用与引用版本、响应形状、失败状态、幂等键、费用/权利、实现文件、测试、激活状态。**API存在不代表U07动作PASS；U07候选API数量也不等于现有路由数量。**
- `mohen.six-stage.v1`属于专业生产链代际，`mhka.v1`属于文档/治理代际，两者不得用同一字段混写。合同修订要保留旧客户端兼容或显式失败迁移。

## 2. 高风险既有接口和必须验证的行为

| 实际代码/路径 | 核心责任 | 正/反例要求 |
|---|---|---|
| `apps/web/app/api/studio/research-tasks/route.ts` | 建立受托研究任务 | 有项目授权成功；越权/预算/无资料HOLD |
| `apps/web/app/api/studio/research-tasks/[id]/production/route.ts` | 触发唯一生产请求 | 禁止重复run无审计；不由Agent自写G PASS |
| `apps/web/app/api/studio/works/[id]/preview/route.ts` | 预览有版本的作品 | 不把未授权研究图片公开；修改版本一致 |
| `apps/web/app/api/admin/submissions/[id]/decision/route.ts` | 运营作品决策 | 与知识G Reviewer分权；无法越权代签 |
| `apps/web/app/api/works/[id]/publish/route.ts` | 作品公开/撤回 | 作品/所用资产资格/媒体许可均实时有效 |
| `apps/web/app/api/public/works/[id]/route.ts` | 公众WATCH合法作品消费 | 撤权/私有版本/缓存必须拒绝 |
| `apps/web/app/api/explore/sessions/[id]/query/route.ts` | EXP合法知识探索 | G5用途/双消费者限定；禁止研究资料漏给公众 |
| `apps/web/app/api/governance/gates/decisions/route.ts` | 资格决定访问 | 独立Reviewer身份；与Producer物理写入隔离 |
| `apps/web/app/api/studio/materials/import/route.ts` | 用户素材导入 | SEC-01 Data API/RLS/归属/许可负测先于公开恢复 |

### 2.1 源码级接口差异及误报纠正（固定`a001/production@759dbbd0`）

U07 V4 85个候选HTTP方法及路由已完成只读源码检查：**82个方法匹配、2个方法冲突、1个未发现独立路由**。此前未规范化`:id`参数造成的“无路由”误报已校正；本结论仅证明**源码入口与HTTP方法**，不宣称请求响应与数据库权限全面合规。

| 候选需求 | 当前真实源码 | K3处理 |
|---|---|---|
| `API-043 GET /api/studio/works/:id/revisions` | 当前仅导出 `POST`，body=`plan_id` | 不更改既有POST；先核是否有等价版本列表服务，确无则设计GET并补响应、守卫和回归 |
| `API-044 GET /api/studio/works/:id/revisions/:rev` | 当前仅导出 `POST`，body=`beat_diff` | 不把修改接口冒成版本读取；保留CAS/409，另补真正GET读取定义或等价路径 |
| `API-X01 GET .../revisions/:rev/panels/:panel` | 未发现同路径route.ts | 检查导演`/panels`已有方法能否覆盖作品修订面板，缺时才新增唯一接口 |
| `API-055 POST .../admin/submissions/:id/decision` | body=`decision` approve/reject；Operator登录；存在部分业务失败仍用HTTP200的返回 | 统一业务错误与HTTP错误，作品运营审核不自动授知识G5 |
| `API-062 POST .../governance/gates/decisions` | body=`work_id,revision_id?,decision,note?`；reviewer身份 | 当前调用是作品发布Reviewer；不得冒充全套D/G独立资格签发 |
| `API-078 POST .../rewrite-beat` | body=`expected_revision_no,beat_diff`；返回版本号；409冲突 | 真实CAS正反例、缺媒体/权利、越权及版本一致性回归 |
| `API-X03 PATCH /api/explore/sessions/:id` | 已存在GET+PATCH及 `title,archived` 字段 | 保留已有实现，角色/会话所有权需在DB层负测 |

**规范边界：** 其余已匹配路由的完整成功响应、错误分支、资源角色与DB权限仍未全部归一为机器Schema。必须依据`K3_U07_V4_85候选API_源码方法与字段冲突核验_V0.2.csv`对症补齐，**不得仅因82/85同名或HTTP方法相符宣称设计合同/运行测试全面完成**。

## 3. 机器状态及异常语义

必须区分 `request_received` / `queued` / `running` / `candidate_ready` / `stage_completed` / `gate_review_pending` / `qualified` / `published` / `hold` / `blocked` / `failed` / `cancelled`。这是**合同语义集合草案**，不是声明现有数据库均有对应枚举。不得以HTTP 200或 `run.status=done` 代表知识G签发成功。

推荐统一错误封套字段（需字段级核实际现有路由）：`request_id`,`resource_ref`,`status`,`reason_code`,`blocked_refs`,`next_allowed_action`,`retryable`,`required_role`,`evidence_refs`。错误必须避免泄漏私有引用/权限细节；只有有权内部用户可见更完整的审计。

## 4. Tool与费用调用

工具注册至少标识：canonical ID/版本、目的、可用执行上下文、最小输入、合法来源范围、外传/存储限制、预算、超时、结果身份、失败码和测试。GIS、OCR、VLM、文本模型不因工具能力强而自动获得知识写入、第三方数据传输或版权许可。所有生产类调用都经现有生产入口，禁止Studio另建绕Gate的“快速正式事实”链。

## 5. 资格和两种读取消费者

Studio内部研究读取按R1 POL-01校验项目与来源用途；公开WATCH/EXP消费只用合法作品及L5分面；Agent文字与visual_stage图片展示用途隔离。证据返查不得成为通用底层开放查询API。无适用G、用途/时点/权利不合时失败关闭；缓存需同当前资格重新校验。

## 6. 一次性工程应用和测试

本文件在K3仅供未来迁移。工程恢复后先导出现有路由签名与调用方，再锁定唯一机器规范（可以直接生成OpenAPI），按请求字段/响应形状/鉴权/错误/幂等/版本/测试对照修订；未完成项不得标REAL或PASS。与现有合同无冲突的接口维持兼容，不为满足候选名义批量改路由。


## K3定向补充：已证路由与未冻结边界

`API-055 POST /api/admin/submissions/:id/decision`：现行请求仅`decision=approve|reject`、Operator cookie session；错误登录/无角色403、JSON错误400、非法decision400；委托publishWork/rejectWork返回业务失败时可能出现HTTP200但`ok:false`。目标应将业务失败映射稳定HTTP状态+reason_code并为旧客户端设迁移验证；**不得声称目标错误封套已在代码实现**。

`API-043/044`所涉同路径POST分别为保存版本（`plan_id`）和改稿（`beat_diff[]`、rev整数、409冲突），不是GET；GET读取须先搜索等价服务后有界补建。API-X01的plan级`getWorkPanels(planId)`不能被视作持久修订面板读取。新版GET必须校验work/revision/panel身份、项目归属、授权素材及缓存撤权。

路由统一审查列：真实method/path、query/body、2xx schema、4xx/5xx reason、调用者、resource_owner、项目绑定、DB角色、版本/幂等、状态变化、POS/NEG/AUTH源码和未来运行测试。85条未核字段保持`NOT_FROZEN`，不能由此段填充虚构响应。


## 7. K3源码复核后的接口兼容与修复顺序

API-043、API-044 的目标 GET 不存在（同路径现有 POST 继续保留）；API-X01 的 `work/revision/panel` 读取缺源。必须先在已有版本、导演面板和材料读取服务中查找等价能力，再决定对已有 Route 增加 GET，禁止新增同义服务。所有新增读接口应验证 Owner、Revision、关联 Plan、媒体许可和权限撤销，不能将预演中的导演 Plan 面板当作已保存作品修订。

业务失败不能只凭 HTTP200+ok:false 让用户误以为操作成功。对 API-055 等旧兼容行为制定：第一阶段客户端识别`ok:false`、展示 reason 且不更新UI成功状态；第二阶段按原因设置稳定HTTP非2xx并同步测试/调用者；全程保留旧客户端适配验证。Reviewer作品发布签核不替代专业G0—G5。

所有已核路由的成功字段、实际状态以及守卫只构成**路由级证据**，不能证明下游query参数化、DB服务账号/RLS/调用者身份或缺失的前端动作。`K3_U07_V4_85候选API_源码方法与字段冲突核验_V0.2.csv`保留逐项source blob和`NOT_FROZEN`，不生成第二份同义API规范。

**必须执行的终审矩阵**：对每个API ID提供独立的实际`request query/body -> route guard -> business service -> SQL role + resource binding -> response success/error -> client caller -> POS/NEG/AUTH`证据，不可用统一模板替代。路由重用应建立多ID到唯一实现的合法别名，不重复改写已可用逻辑。状态 `K3_API_END_TO_END_CONTRACT_HOLD`。

## 8. 公众读接口与发布/知识资格的精确兼容条款（固定源码复核）

| API | 源码实现与主要响应 | 兼容/必要修改 | 反例 |
|---|---|---|---|
| API-023 GET `/api/public/evidence/:id` | `queryRows`直接查`read_model.evidence_pointers`，200 `ok:true,evidence:{id,display_locator,display_excerpt}`；404 `not_found` | 保留响应shape，复用合法读模型资格服务，增加G5/current+purpose+consumer+expiry+snapshot，未获权时隐藏 | 无G5、撤权、其他consumer/用途 |
| API-025 GET `/api/public/works` | `listPublished`，200 `ok:true,works[]` | 保留作品published指针，逐结果过滤知识引用与媒体有效权限 | 发布后撤权仍公开 |
| API-026 GET `/api/public/works/:id` | 200 `ok:true,work`，404 `not_found` | 与目录使用同一许可策略；无权作品不可枚举 | 跨用途、已下架但缓存存在 |
| API-027 GET `/api/public/works/:id/eligibility` | 200 `ok:true,eligible,reason=published|not_published_or_revoked` | 当前按pointer membership作判断，目标应区分作品已发布与知识当前合法，必要时保持兼容字段并增加机器原因 | 旧pointer但G5无效 |
| API-028 GET `/api/public/works/:id/program` | 200 `ok:true,program:work.content`，404 | 节目单媒体和证据按修订/consumer/权利过滤，不能以作品曾审核放行历史引用 | 外部媒体已撤权 |
| API-030 GET `/api/public/works/:id/share` | 200 `ok:true,shareable,share_url,revision_no,title`，404 `not_published` | 保留原链接格式并加现行授权Guard，复制的旧链接不永久授予读取权 | 撤权/旧版链接复活 |

调用链：`route.ts → apps/web/lib/publication.ts/listPublished → publication.published_pointers + publication.works + publication.work_revisions`；本链**不是**自动的 `read_model` 合法专业资格校验。`publication.ts/checkPublishEligibility` 检查作品Reviewer及媒体权利，但与G0—G5独立Gate是两套资格。`API-062`只签作品Reviewer，不是史学G5。安全合约`SEC-PUBLIC-01—06`对应本表；前端WATCH与EXP必须消费统一合法守卫。

`API-067 POST /api/studio/research-tasks`：真实请求`prompt`必须非空且最长2000，`topic?`、`work_id?`；401无登录、403work非归属、400空/超长/坏JSON，成功200 `ok:true,task_id,degraded,decision,research_leads,production`；其`requestProduction(created.taskId)`可能自动请求真实D生产。目标要求该调用严格走现有Registry/Job授权，不能因Studio自然语言请求让全禁用Job被旁路启动。生产失败须保留`production.ok/reason`，客户端不得把 `ok:true` 解释成研究生产完成。

`API-043/044/055/062/078`及其旧POST/Reviewer语义以源码证据账和本合同前文为准；不得因增加GET或独立G签发而复写旧已合法的作品操作。实际现有DB操作权限、并发及历史客户端仍`NOT_RUN`。


## 9. K3-C2｜四项新增源码直验与不可混同的安全/状态目标（2026-10-31）

以下是**源级新增**，不把85项整体提升为已验收：

| ID/固定源码Blob | 已证真实请求/守卫/返回 | 已证限制与K3目标合同（尚非已实施） |
|---|---|---|
| `API-035 GET /api/studio/materials/:id` `route.ts@c2093c97` | `guardRoute(params,null)`只要求登录；按`public.assets.asset_id`取`id,title,kind,license,author,intended_use,status,created_at`；存在返回`ok:true,material`，缺失404 | 该路由读的是**公共资产台账而不是用户导入素材**。原`202610280940_assets.sql@c8b87b53`的`public.assets`无Owner列，含verified/demo/candidate；不可错误追加owner谓词。应按共享资产用途与许可、项目授权分面判断是否允许Studio展示/引用；裸资产查询与“已获作品使用权”分开。RLS/调用身份尚未证，未来负测candidate/未授权素材、被撤权用途及权限环境。 |
| `API-059 POST /api/explore/sessions/:id/query` `route.ts@2420f377` | `guardRoute(params,'public.explore_sessions')`；请求`question`非空字符串；无效JSON/问题400；调用`runResearch(question.trim())`，成功`ok:true,decision,degraded,research_leads` | 当前路由不向`runResearch`显式传`session_id/consumer=EXP/purpose`，需追下游是否使用当前合法G5或仅公共研究。不能由路由守卫推断搜索结果具有合法发布资格；明确EXP作用域与来源权利、不合法输入的HOLD。 |
| `API-070 POST /api/studio/works/:id/beat-order` `route.ts@a4e90da3` | `guardRoute(...,'publication.works')`；body`expected_revision_no`,`order[]`，坏JSON/不合法输入400；调用`reorderBeats()`；冲突409带`revision_no`；成功`revision_id,revision_no` | 需在下游检验`order`是否是原分镜ID唯一完整排列、work/revision所属绑定及DB原子CAS；不能仅凭HTTP409断定并发安全。原有正反路径保留，未来测试重复/缺失/越权ID、双写竞态、Operator跨用户操作。 |
| `API-057 POST /api/admin/users/:id/status` `route.ts@d383df8f` | 使用HMAC cookie，operator角色；禁止自身禁用403、目标不存在404、最后一名活动operator禁用409；除`status='active'`外都取`disabled`，成功直接UPDATE `public.users.status` | `getSession()/middleware`仅核签名和过期，未读当前users.status；`/api/auth/me`会查active但其他受保护Route不一定查，**账户禁用可能不会立即使已签Cookie失效**。目标应对所有高权/敏感请求检查当前状态与角色撤销版本，明确定义停用瞬时失效；枚举限定`active|disabled`，非法输入400；最后Operator约束用数据库事务锁与重读防并发竞态。 |

**共同证据**：`apps/web/lib/session.ts@8e5b4dcd`、`apps/web/lib/guard.ts@1c0e00e2`、`apps/web/lib/ownership.ts@28fe3fbb`、`apps/web/middleware.ts@99d24fd2`、`apps/web/lib/auth.ts@10186ead`、`apps/web/app/api/auth/me/route.ts@a000eb69`；上述路由守卫与用户状态**只在实际调用路径范围内**确认，不能把未读取DB层列为已通过。C2仍整体HOLD，余项按85行原账逐ID完成。


## K3-C2｜本轮15项真实Route逐项核验及合同差额（非运行PASS）

以下按固定提交`759dbbd0`直读Route和部分业务模块，对应完整Blob与细项已回写唯一85行账；如需字段级细目只以该账为准，而非建立第二份API规范：

| API | 已证请求与成功形状/调用 | 关键设计差额 |
|---|---|---|
| 015 | `GET ?q`，`ok,materials,degraded`；`retrieveMaterials` | 缺当前资格目的、时效、依赖动态守卫的验证，必须可见降级 |
| 016 | `GET :sessionId`，`ok,session`；Owner或Operator | Operator跨用户权限分操作收紧；PATCH复用同路由，不混淆method |
| 017 | `GET :sessionId/surfaces`，`ok,available,surfaces` | 当前全局`readProductionRelationSummary()`未按会话topic限定；跨主题防混 |
| 018—019 | `GET spatial?topic`返回coverage和数据；`GET spatial/compare`返回timeline | 无足够历史时段不得伪造可比较地理对象 |
| 020 | `GET gates/requests`，`ok,requests[]`；Operator/Reviewer | 审计列表≠独立Gate候选队列，最小脱敏和Reviewer审查资格边界 |
| 033 | `GET conversations/:id`，`ok,conversation` | P0无owner列且SQL按ID查询；必须补历史对话资源级隔离 |
| 034 | `GET director-plans/:id`，`ok,plan` | 现有Owner/Operator守卫保留，明确Plan与委托项目绑定 |
| 036—039 | task events/materials/stage/status，分别返回`events/materials/researchLeads/stage/task` | 客户端当前状态只从真实事件形成；内部材料不得跨域公开 |
| 040—041 | `GET studio/tasks`按owner返回`tasks`；`GET studio/works`按owner返回`works` | 继续复用Owner过滤，验证真正DB角色与停用会话 |
| 047 | `POST admin/acl {user_id,roles[]}`，`ok,user_id,roles` | 最后Role保护须原子事务，权限撤销须即时使旧Token失效 |

`API-033`源级缺口是有界P0安全设计阻断；`API-017`跨会话主题和`API-020`候选审核混同也是明确目标缺口。其余仍只有Route级部分字段证据，完整嵌套响应、传递性SQL授权、运行E2E不得升级PASS。对4xx/5xx、并发、角色吊销和权限撤回的具体用例见85原账。


## K3-C2｜85项唯一API的逐行目标合同及原路由兼容处理（2026-10-31设计施工）

**唯一定义规则**：每条`API-001—081`及`API-X01—X04`的可施工目标合同，现在由同目录原文件`K3_U07_V4_85候选API_源码方法与字段冲突核验_V0.2.csv`中以下新增列组成，不再新建85份API规范：`K3_C2_target_input_definition`（方法、路径、观察到的字段、目标类型及校验）、`K3_C2_target_response_and_http`（实际顶层键与目标成功/错误码）、`K3_C2_target_authorization`（用户角色、对象Owner、资源与资格授权）、`K3_C2_target_state_and_transactions`（GET纯读、POST事务与幂等/CAS）、`K3_C2_source_evidence_and_gap`（源文件、Blob、导入模块与DB证据等级）、`K3_C2_target_implementation_point`（最小改动源路径）、`K3_C2_positive_negative_security_test`（原ID的POS/NEG/AUTH）；上述字段的`TARGET`严格为**未来应该实现**，并非声称已由真实实现验证。`K3_C2_scope_status`明确区分82项现有同方法源、2项方法未实现、1项路径不存在。

### 逐项阻断的明确工程处理

- `API-043 GET /api/studio/works/:id/revisions`：当前同路径仅POST提交新修订；添加**不改变POST语义**的GET，查询授权Owner全部不可变修订，返回版本编号、时间、状态、哈希及当前资格可见性（不返回越权草稿），不得把POST当GET。
- `API-044 GET /api/studio/works/:id/revisions/:rev`：同路径仅POST局部改稿；新增GET读取指定不可变修订，正确区分Owner/不存在/已撤权，独立于CAS写路径；拒绝非数字修订。
- `API-X01 GET /api/studio/works/:id/revisions/:rev/panels/:panel`：固定源码**不存在**该路由；现有`POST /api/studio/director-plans/:id/panels`生成四面板但**不是**持久化的某作品不可变版本读取。目标必须在`commitWorkRevision`中将已生成且已核权的面板快照、对应DirectorPlan ID/来源版本标记纳入不可变WorkRevision内容（或独立不可变关联表），再以`panel∈{storyStructure,visualStyle,voiceover,soundtrack}`通过当前作品Owner+revision读取。不得每次重新调用LLM伪装为同一版本，也不能为缺失面板生成历史事实。P2接口返回`{ok:true,work_id,revision_id,revision_no,panel_key,content,qualification}`；无素材等返回明确HOLD/空态；对应`FA-*`四个依赖动作的客户端调用与状态按152账对齐。
- `API-033`：当前`getConversation(id)`只按ID，DB没有owner列；必须先做历史孤儿行隔离/Owner列迁移，再对`GET`/`POST`对话查询与后端DB连接增加所有权过滤，不得直接从原`conversations`全表读取。
- `API-062`：现有`governance/gates/decisions`的Reviewer属于**作品审核**，不能通过改返回字段变成独立G0—G5资格签发。专业资格走C1独立DB登录/签发服务/当前指针；Admin既有作品审核保留。
- `API-023/025—030/015/017—019/059`：当前公开、Agent或EXP读路径仅见局部PASS/current_valid或已发表状态，目标必须使用当前合法的资格指针、时效、purpose、consumer、依赖、版权与撤权状态；无法保证时返回`HOLD`或空态，不能用缓存绕开。
- `API-047/057`：HMAC角色/账号状态变更后必须即时撤销旧会话；加数据库事务/乐观版本或行级锁保护最后Operator/Reviewer与并发角色更改，负例不能返回`200 ok:false`。
- `API-070/073/078`：多个WorkRevision写入目前采用“读取最新版本→另行INSERT”的分离步，目标事务必须对同一work执行原子CAS并校验操作对象，否则并发场景产生冲突或无效乐观成功。

### K3静态验收与未来工程验证严格分开

逐85条已具备针对单个方法和目标语义的字段化`TARGET_DESIGN_SPECIFIED_*`候选及每项独立`POS/NEG/AUTH`用例。**这不是85条实际API已在源码中完全满足合同**：真实调用链深度、现网权限和全量E2E另列`ENGINEERING_NOT_RUN`；没有Blob的路由一律保留`CREATE_IF_GAP`。K3专业复核必须逐行检查新增字段是否相互矛盾、是否真实服务能力无法复用、是否在`MHKA-02/03/04/05`之间越权；设计不完整条目应仅定向退回具体ID。

## K3-C2｜API-033/API-064的源码到目标闭合合同（本轮原路径源码候选）

`API-064 POST /api/studio/conversations`（原 `route.ts@9d930694`）真实调用 `createConversation(title,messages)`，不写Owner。目标：校验 fresh session、title≤120、messages≤200、每条role白名单/长度≤10000，可保持空消息/空标题的原兼容；服务调用 `createConversation(title,messages,session.uid)` 写 `public.conversations.owner_user_id`，201 `{ok:true,conversation_id}`；无效401/400，数据库写失败不可返回成功。**服务端绝不接受caller传owner**。

`API-033 GET /api/studio/conversations/:id`（原 `route.ts@d9d3fc2c`）真实 `guardRoute(params,null)`只验证token，`getConversation(id)`未按owner读取；目标：fresh session、UUID格式、`getConversation(id,session.uid)`附SQL Owner谓词。成功200 `{ok:true,conversation}`；未登录401、ID格式错误400、其它Owner/未知/旧无Owner均404。只有单独获准运营路径才能跨owner查询，不在Studio前台隐式给operator越权。

**互锁前置**：`public.conversations.owner_user_id`必须先通过实际迁移预检/物理部署，才可切换以上候选路由；旧1条未知Owner不得默认回填。正负用例 `API-033-POS/NEG/AUTH`、`API-064-POS/NEG/AUTH`、`DB-OWNER-01—06`；签发级C2状态：`TARGET_SAME_PATH_CANDIDATES_EXIST / TRANSITIVE_DB_AND_SESSION_NOT_ENGINEERED`。

## K3-C2｜2026-10-31 84个实际API入口逐路由审查的新增确定性阻断（非跨服务PASS）

固定提交 `759dbbd0c206c4acfe2ebdc3e94aa556528b330c` 的84个现存候选API入口已逐一阅读路由正文（85项中仅`API-X01`没有同名路由）；上游已有方法、路径、直接SQL/模块和响应证据见唯一85项账。**这只证明路由正文，不证明库级角色、跨服务传递性与运行E2E**；不得把84/84源证误认为设计准出。

| ID | 实际已证缺口 | 未来工程定向修订（原路径优先） | 必须有的负例 |
|---|---|---|---|
| API-021 | `getHelpArticle()`可返回null，原路由不检查即访问`article.title` | `apps/web/app/api/help/articles/[id]/route.ts`完整候选已保存，缺文返回404，不用500充当空态 | 无文章404、超长ID400 |
| API-022 | 通知SQL直接返回`public.notifications`全部最近记录，路由只检查登录 | 复用实存`public.notifications.user_ref text`（不新建Owner列）；`WHERE user_ref=verified session.uid`，对未知Owner不返回 | A不见B通知、anon拒绝、禁用旧token拒绝 |
| API-045 | `public.director_plans d JOIN public.research_tasks t ON t.work_id=:wid`没有`d`到`t`的关联谓词，易混入其它导演方案 | 原Work的plan_id/明确关联表和Owner断言，消除伪JOIN；不存在关联则诚实`directed=false/[]` | 他人plan不可混入、无task时无虚构导演进度 |
| API-054 | `GET /api/admin/settings`未鉴权，`POST`旧同步HMAC角色 | 未来同路径完整候选已在Library实现GET/POST新鲜operator校验；配置key白名单与可变更安全项仍须服务层列举 | 匿名GET/POST均403、撤权role 403、非法key 400 |
| API-063 | 旧token校验后把用户文件写入`public/uploads/`并回传可公开URL，缺显式大小/MIME/存储持久性/Owner检查 | 原路由定向修订：最大文件尺寸、媒体识别、私有对象存储、扫描、owner_id、版权声明、先候选后授权公开，失败清除孤儿文件 | 私有资料不可公网直接取、伪扩展名/大文件拒绝、禁用token拒绝 |
| API-081 | `watch_sessions`只按work_id找/更新playhead，不按用户、修订或设备隔离 | 如果登录用户，唯一`(owner_user_id,work_id,revision_id)`及按Owner读取；未登录WATCH走本地状态或可撤销匿名会话，不能用共享DB全站进度 | A进度不覆盖B、旧revision不覆盖新revision、公开作品撤权清缓存 |
| API-050/API-X04 | `GET /api/admin/publications`会执行`processDueSchedules()`造成数据库写入 | 迁移到独立定时任务/明确POST job且检查签名、幂等与权限；GET必须只读 | 重复GET不得产生发布、失效资格不被定时放行 |
| API-012—014 | 登录后直读`world.entities/events/relation_claims`底层表，不等于公共G5当前资格 | 若内部研究用途，提供项目授权与G3目的；若公众EXP/WATCH，复用G5合法消费投影/撤权过滤，不可直接返回全量源表 | 未签G5/撤权/范围错配/跨项目全部拒绝 |
| API-048/API-053 | operator路由直调`revokeGate`，不能冒充独立G专业资格签发 | 保留Operator撤权请求权限；正式资格撤销仅独立Signer服务记录不可变审计与投影改变 | Operator独自不能签正式PASS/撤销审计 |
| API-056/055 | 作品审核/批量发布与G0—G5知识资格不是同一签发权 | 操作人/独立作品Reviewer不同会话+最新权利校验+发布指针原子变更 | 旧Reviewer role、无G5/过期媒体版权均拒绝 |
| API-043/044 | 原路由只有POST，U07要求版本的GET仍未实现 | `GET /revisions`列出本Work owner合法版本，`GET /revisions/:rev`返回唯一修订且Owner；保持原POST行为 | 另一Owner版本404、冲突不改最新版 |
| API-X01 | 无`works/:id/revisions/:rev/panels/:panel`的实际GET，旧`director-plans/:id/panels`POST是生成动作而非修订历史读取 | 在唯一作品revision存储形成四面板快照+版本号；GET按Work/Rev/Panel/Owner定位，不读取新生成临时计划冒充旧作品 | 历史快照不可变、错误修订404、未选计划不产生伪快照 |

上述条目仅作**现有`API_TOOL_CONTRACT.md`内容补充**，不新建独立API审计文件。85条逐项测试/负面/角色仍归唯一85项账；客户端动作归152项账。当前`K3-C2`为**目标合同深化，正式设计Gate未通过**。

## K3-C2｜通知归属目标源码与观看进度精确物理差异（2026-10-31）

- `API-022` 源文件`apps/web/app/api/notifications/route.ts@a05823b58c050aa1bd18e897a8b5efcec0a6d834`原先登录后查询全部通知。Supabase只读Catalog证实表含`user_ref text NOT NULL`，无需新建Owner列。本轮已按**原路径保存完整目标代码**：从新鲜session取得`uid`，SQL以`user_ref = :'uid'`筛选，成功200 `{ok:true,notifications:[...]}`；未登录401，跨用户不能查询。未来低权DB连接与正负用例仍需执行。
- `API-081` 源`apps/web/app/api/watch/sessions/route.ts@c63564c5b0df192801a74f2bfddb6206d1b3cb30`按全站`work_id`查/写playhead；只读目录核实`public.watch_sessions PRIMARY KEY (work_id)`、`playhead numeric`及`updated_at`，没有用户/修订列。**不能把该表现在按Owner筛选当作已可用。** 设计迁移顺序：先加`watch_session_id`、`owner_user_id`、`revision_id`，再验证历史旧行无Owner不可归属并变更主键+唯一用户/作品/修订；新的WATCH用户进度用当前用户限定，游客仅客户端本地或显式撤权匿名会话，不触碰全站共享记录。

### K3源到目标 API-050/X04：运营发布读写副作用隔离（2026-10-31）

- 固定源 `apps/web/app/api/admin/publications/route.ts@b989781fdbf1008f336524f6137a610f79628360`：GET直接调用`processDueSchedules()`，导致只读请求触发真实发布；POST仅凭旧HMAC roles签核运营权限。
- 现已形成**同路径完整目标TS候选** `repo_target/apps/web/app/api/admin/publications/route.ts`，SHA256 `be81a60c5cc55c48a8efafd7642d13e6efa38ce328bce288651c4742b3459487`；保留`listPublished/publishWork`服务。GET必须无写副作用；到期发布在单独被授予执行身份的计划任务中调用，不能凭列表查询触发。POST从`getSession()`刷新真实状态/roles；非法UUID 400；发布服务非eligible 409；成功返回`work_id`。
- 正测：active operator读列表、具当前Reviewer通过且权利合规作品发布；负测：失效会话、角色撤销、无Reviewer、媒体权利撤销、重复发布、GET多次不改变指针。**真实工程未实施/未运行，`publication.ts`内部事务与计划任务调用方仍需未来专项接口核验；本候选只对应本路由源码。**

### K3 API-045 源路径修订候选与数据库依赖
- 旧Git blob `0bb845c4b490882f31fa8dbb1192b1e1239522f4` 存在跨作品导演方案join缺陷；同路径完整目标TS静态语法通过，SHA256=`1ed60262b222bf6f5e1ecfb2afb1a48f2d72733e665e298126bcf32a55223e10`。**禁止在`director_plans.work_id`物理扩列和写入关联的生产者修改前部署**；源码兼容及完整测试均未执行。迁移顺序详见PERSISTENCE。


## C2正式设计优先级与源码兼容约束（2026-10-31）

本合同在K3中的交接基线为现有`specs/requirements/api-route-contracts.csv`85项，不以旧K3审查报告的通用字符串替代真实Runtime。`K3_wire_compatibility_authority`字段定义：**既有Route/Service实证的请求、成功字段、HTTP码是默认兼容基线**；目标可增加严格身份/资源/用途/资格检查，但涉及破坏性响应改变必须记录具体API ID、前端消费者及兼容迁移。泛化列中对GET附加POST请求体、对普通Help施加专业G5等模板错误一律不作为生效合同。

10项专项纠偏：`API-021/022/043/044/062/065/080/081/X01/X04`，以机器表`K3_specific_authoritative_delta`的明文要求为准。尤其`API-062`当前是**作品发布审核**，不可冒充知识G0—G5独立签发；`API-X01`要求不可变版本化只读而非调用导演生成POST；`API-065`须保留`plan_id, planA, planB, facts, finding`原成功形状。所有85项均要求Codex在隔离云端以实际本次HEAD复核请求响应与低权限数据调用；普通源码差异在工程阶段按明确设计验收消解，只有真实设计权威冲突才退回K4。
