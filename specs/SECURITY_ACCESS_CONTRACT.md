# MoHen｜软件安全、身份与专业签发权限合同（K3目标候选）

> 2026-10-31：随Owner批准的K3本地施工接入的技术设计要求；本文设计状态和历史源码证据不等于当前运行准出。首批工程范围、已测结果及剩余HOLD见 `tasks/results/K3_C1_LOCAL_CONSTRUCTION_20261031.md`。MHKA与生产权限未激活。

> `status: DESIGN_CANDIDATE_NOT_APPLIED` · `owner: MHKA-05`，治理职责依MHKA-00、知识权利依MHKA-03、执行分责依MHKA-04。

## 1. 身份与上下文

访问判断至少包括：认证用户/服务、活跃角色、项目、对象及其Owner、操作、用途和时点、来源/素材权利、目标消费者、数据认识/资格状态。多角色同一人每次按当前活动角色审计，不允许Owner或运营者身份直接绕过专业Gate。禁止靠前端隐藏按钮或仓库README判断授权成功。

## 2. 最小操作分权（目标义务，不表示真实数据库策略已经配置）

| 主体/上下文 | 允许动作 | 必须拒绝 |
|---|---|---|
| Creator/Studio | 自己项目内合法来源与L0—L4研究读取、作品/草稿/任务处理 | 直接写正式L Truth、独立G PASS、公开无权图片 |
| Production Stage Owner | 自己D阶段候选与证据、合法交接申请 | 给自己签G PASS、写其他阶段Truth |
| 独立 G Reviewer | 按专业政策签自己的G决定/追加审计 | 擅自改生产候选史实、超越G0权利 |
| Operator | 有权审核/发布作品、管理已授权运营资产 | 用运营审核代替G或越权读取用户私密资料 |
| Public WATCH/EXP | 当前可公开作品与指定G5知识分面 | 内部研究表、私有草稿、失效缓存 |
| 工程维护者 | Owner明确授权的限时维护、备份及测试 | 无授权变更生产数据/G资格/发布权限 |

## 3. SEC-01真实阻断

K0-G只读事实发现 `public.imported_materials` 未启用RLS，anon/auth具SELECT/INSERT/UPDATE数据库权限。**不得**因为当时无数据或应用层有Guard而销项。工程恢复后：先核实际Data API暴露、合法导入调用、所有权字段/服务账号角色，再设计最小GRANT/RLS策略，验证匿名/未授权/跨账号的查改删拒绝及正常用户导入成功，并准备失败回退。任何SQL修复均需要独立工程授权和实际测试。

## 4. Gate和生产写入信任边界

当前生产Adapter直接写 `control.gate_audits`，与新版独立Gate目标冲突。保留原Orchestrator与Stage执行器，只允许Producer提交候选、证据和签发请求；真正决定写入要由具有单独身份/权限的Reviewer服务实现，并验证旧Adapter不能通过数据库超级用户连接伪造签发；资格审计只追加，旧PASS不能按当前规则静默复活。

## 5. 许可、撤权与缓存

对图像展示、文本引述、模型复刻/发送、下载和空间再现分别审查用途；撤权先停止非法消费，不等新的G5 PASS。未受影响的有效分面允许继续消费，但必须有依赖闭包证明。Studio内部研究读许可不授予公众缓存再利用权。外部模型与专业工具的传输必须按来源权利/预算/隐私审计。

## 6. 未来机器验证门

- 权限矩阵：匿名、member、creator、operator、G reviewer、Producer、工程维护服务，覆盖本人与其他用户对象。
- 数据库角色：实际GRANT、RLS、service role和数据API到真实query的链路；不止路由mock。
- 资格：独立签发/拒绝/撤权/超时/权限篡改/并发、审计不可覆盖。
- 作品：投稿→运营审核→专业资产资格→发布→撤权→缓存失效的纵向回归。
- 运行：秘钥、日志脱敏、云端Schema及备份/恢复，均须固定环境、提交与回执。

**生效边界：** K3文件只描述需实施/验证的合同，不能改变当前Supabase、Vercel、GitHub或真实Gate权限。


## K3定向补充：跨域签发与数据库防线

`layer1-adapters.mjs/writeGate()`与`governance-gate.ts/writeGovernanceGate()`均可向`control.gate_audits`写PASS并更新current_valid；此事实与`producer_may_self_qualify=false`冲突。独立Gate目标：生产者仅写候选和证据；专业Reviewer单独权限在校验对象修订、purpose、consumer、依赖、时效后签发不可变裁决；当前有效投影独立事务重建，原裁决审计不可被生产/运营改写。作品Reviewer`signWorkPublication`不等于G0—G5。

Studio写入时，对work_id路由guard之外，应对plan_id与work_id、Owner及同项目在事务内交叉验证；Operator跨作品改稿不得由笼统`canAccess`自动授权；CAS必须由数据库唯一性/原子条件写保证而非“先读最大版本再INSERT”。

物理验收前置：逐条列出Supabase schema、GRANT、RLS、security definer、服务密钥运行路径、违规角色SQL负例、历史资格撤权和恢复测试。`SEC-01`不得撤销，也不得把历史PASS自动升级。


## 7. K3可迁移的数据库权限设计条款（须基于环境预检执行，禁止直接运行）

### 7.1 既有表优先与角色负面授权
- 源文件 `supabase/migrations/202610160300_six_stage_gate_audits.sql` 已定义 `control.gate_audits` 六门、`source.read_runs/read_units/read_quality_checks/read_handoffs` 等对象。**不得为 K3 另建六阶段副本表**。新增列只在实际表 `information_schema`/`pg_catalog` 检查无同义列、无历史冲突后提出。
- 生产运行连接身份不得拥有 `UPDATE/DELETE control.gate_audits` 或直接 `INSERT result='PASS'` 的权限；运营服务也不得拥有此权限。即使服务端调用 PostgreSQL 特权角色，必须拆分连接凭证/能力，不允许靠应用层 `if` 检查实现独立性。
- 独立 Reviewer 签发应经最小权限的受控事务入口：先验证 `reviewer` 的有效专业签发权，再核对 `(gate, artifact type/id/revision, purpose namespace/code/version, allowed scope, consumer, dependency_snapshot, rule_version, effective_at)`，然后记录不可变裁决事件并更新可重建的当前投影。单数据库事务防并发重复PASS；多次签发保留不同 decision_ref 和先后关系。
- 操作审核（`approved/rejected`）与G0—G5资格（`PASS/HOLD/REJECT/REVOKED/UNASSESSED`）不共用授予/撤权方法。发布策略必须同时满足作品审查和实际知识资产资格/权利约束。

### 7.2 DB 授权预检的机器可验清单
未来授权施工前，使用只读SQL获取 `pg_roles`, `pg_auth_members`, `pg_class.relrowsecurity`, `pg_policies`, `information_schema.role_table_grants`, `pg_proc.prosecdef`, 以及各表实际列、约束、视图依赖与行数；结果需留受控校验回执，**不可将开发/历史迁移当作生产现实**。

| 测试ID | 身份与操作 | 期待结果 |
|---|---|---|
| SEC-GATE-01 | Producer直接 INSERT PASS / UPDATE current_valid / DELETE gate_audits | 全部拒绝，不能靠有权服务账号代写绕行 |
| SEC-GATE-02 | Operator以作品审核结果请求G5 PASS | 拒绝；作品审核结果保持独立 |
| SEC-GATE-03 | 有效独立Reviewer签发同 revision/purpose/scope/consumer | 一次事务产不可变裁决、合法投影及可追溯审计 |
| SEC-GATE-04 | 并发签发与撤权竞态 | 序列化或显式冲突，撤权后旧缓存不可恢复 |
| SEC-GATE-05 | 历史无Reviewer/无purpose版本的旧PASS | 不自动升级为新合法PASS |
| SEC-RLS-01 | anon/authenticated跨账号访问 imported_materials | 不得读取/改动未授权行；合法导入不受误伤 |
| SEC-RLS-02 | 浏览器直接触发服务角色能力 | 拒绝，服务密钥永不进入客户端 |

### 7.3 DDL候选准入门
1. 确认现有 `gate_audits` 的 PK、FK、约束、purpose text、supersedes_id、`current_valid` 和线上真实行量；历史记录、run_id 引用不可随意重建。
2. 不在原审计表覆盖裁决实体；若历史表既充当不可变日志又充当当前投影，则**先设计兼容迁移及过渡视图/投影**，切换后才能收紧 UPDATE 权限。不得直接执行 `DROP VIEW ... CASCADE` 等可能影响运行消费者的旧迁移脚本。
3. `public.imported_materials` RLS 和 GRANT 必须提供真实调用角色、所有权列及现有导入方式；未检出合法业务链时禁止凭空应用 RLS 模板。
4. 数据量、索引影响、事务回滚、视图消费者、生产密钥与历史审计保全未知时，本K3只能签发**设计上的安全不变量**，不得声称已经形成可直接执行生产库的完整DDL。

**状态：** `K3_SECURITY_DESIGN_BOUNDARY_DEFINED / PHYSICAL_DDL_NOT_CERTIFIED`; `SEC-01=HOLD`。本章提供未来工程入门验收门，不授权实际SQL执行。

## 8. K3公众消费与作品发布：源码实证的新阻断（2026-10-31）

固定只读提交 `759dbbd0c206c4acfe2ebdc3e94aa556528b330c`；以下是源码直接证实的实现事实，非推断线上数据已经泄漏。

1. **API-023 `/api/public/evidence/:id`** (`route.ts` blob `4daedd91ec207bc291dc7683a0ed768b1b33a17b`)直接通过`queryRows`选择`read_model.evidence_pointers`，只按`evidence_pointer_id`过滤；路由SQL未连接当前G5、消费者、用途/有效期/依赖，也未调用合法消费Guard。现有`read-model-repository.mjs`已具有基于G5 PASS/current_valid的读取骨架，**应复用并补齐**而非另建一个证据仓储；默认公开入口必须拒绝未取得独立合法G5的内容。
2. **API-025—028/030** 均依赖`apps/web/lib/publication.ts/listPublished`。`listPublished()`原SQL仅通过`publication.published_pointers`关联作品/修订后返回，未对所引用知识资产做实时G5/版权/依赖有效性Join。原`checkPublishEligibility()`在发布之前检查「submitted修订 + 至少一个provenanceRefs + 作品Reviewer批准 + 媒体授权」，但从源码中**未见对每一条实际引用的专业G0—G5当前资格核验**。不能把前置作品审查等同专业资格，也不能把曾经发布视为撤权后可继续消费。
3. `publication.ts/publishWork()`在发布成功后异步意义上的`reflowWorkToAssets`失败时仅warn不阻断作品发布。**作品发布与知识资产回流是两类状态**：必须提供独立重试/告警回执，不能把发布成功误报为知识世界已增加一项合格资产。
4. `read-model-bridge.ts`对世界投影、故事种子、证据和时空投影的 SQL 只查`G5 PASS+current_valid+consumer='visual_stage'`和部分`run_id`，缺用途版本、有效期和依赖快照动态校验。该桥的六类读模型、主题run隔离、实际结果与降级返回都应继承，**只补严格资格Guard**；冻结JSON降级结果不能冒充现行资格数据。
5. `getWorkStageStatus()`返回`delegated/researched/directed=true`常量，只用修订数判`revisioned`。这不是真实阶段证明，前端状态轴必须从实际任务/导演/提交/资格事件投影并保留缺数据。不得把静态true当已经完成的研究或导演阶段。

### 安全与消费必需拒绝测试

- `SEC-PUBLIC-01`：取消G5但保留`published_pointer`，公开works详情/节目单/分享/证据不得返回失效资产；仅合法不涉及该资产的作品分面可继续。
- `SEC-PUBLIC-02`：公开evidence_id属于另一consumer/未获用途/过期，API-023返回拒绝或隐藏，绝不直接SELECT并泄漏excerpt。
- `SEC-PUBLIC-03`：作品Reviewer批准但引用史学资格已撤，发布/再次观看必须阻断；保留作品审核历史而不伪造G资格。
- `SEC-PUBLIC-04`：`reflowWorkToAssets`失败时，发布和回流分别报告状态；不得展示假的“知识资产已形成”。
- `SEC-PUBLIC-05`：公共冻结JSON/Bridge降级不允许复活撤销知识/媒体许可，且应在UI明确降级。
- `SEC-PUBLIC-06`：作品进度状态不得固定研究/导演完成，状态只能从可靠事件或实际对象得出。

**K3设计处置：**现有`publication`作品线、作品审核、`published_pointers`和六类read model均`KEEP`；对消费资格Guard、撤权联动、回流记账及进度投影进行`TARGETED_REVISE`，不拆掉已实现的发布系统。真实数据库角色/RLS仍需线上授权工程实测，当前为`TARGET_DESIGN / IMPLEMENTATION_NOT_RUN / FORMAL_EXIT_HOLD`。

## 9. 六阶段权限守卫的已有实现复用核查

原`persistence-contract.mjs`仅允许D阶段写所属业务schema及广义`control`，缺表/操作级隔离；原`check-cross-layer-write-boundary.mjs`验证Schema不越界，但不能否认直接写`control.gate_audits`。未来修订需把`control.production_runs`合法记账与专业资格表写入分别授权，既不取消已有生产进度，也不继续允许Producer自签PASS。`check-gate-enforcement.mjs`已有5级上游负测，须扩充而不重写。

根默认`pnpm guard`使用旧Registry守卫，要求旧数字版本，与六阶段Registry不兼容；目标`repo_target/package.json`只改`guard:registry`脚本指向已存在的六阶段守卫。这个改变不表明现有独立G已恢复安全。


## 9. K3 独立 Gate 事务与迁移的最小执行设计（设计合同，不是可直接上线的 SQL）

**现存字段与不可复用语义**：`control.gate_audits(gate_audit_id,run_id,stage,gate_code,object_type,object_id,result,reason_codes,details,architecture_generation,purpose,allowed_scope,consumer,dependency_snapshot,effective_time,rule_version,supersedes_id,current_valid)`；现有 `purpose text` 不等价于 `{namespace,code,version}`，`object_id` 未携带不可变修订，`current_valid` 是可变投影而非不可变裁决历史。不能只 ADD reviewer 列即宣布合格。

**目标事务的严格分步顺序**（未来在同一个最小权限 `SECURITY DEFINER` 或独立最小授权服务中实现；部署前预检当前 schema/roles）：
1. `BEGIN`；校验数据库签发主体与业务 Reviewer 资格，producer/operator/client 角色直接拒绝；锁定精确资格键 `(gate, artifact_type, artifact_id, revision, purpose_namespace, purpose_code, purpose_version, scope_hash, consumer, dependency_hash)`；签发角色必须与产物实际生产主体分离。
2. 按原 Gate Policy 核实证据、用途和权限；以当前不可变输入修订及依赖快照对比；错误、过期、签发中撤权为 HOLD（不得补默认值）。
3. 追加新裁决事件：`decision_ref` 唯一、`reviewer_id/role`、版本、证据、时效、原先裁决引用齐全；原始事件禁止 UPDATE/DELETE。`result=PASS` 不从 producer 参数直接透传。
4. 同一事务以比较当前决策版本的 CAS 更新单独的当前资格投影；投影只服务消费校验，旧PASS迁入独立历史留存但默认 `legacy_unqualified`。
5. `COMMIT`；失败整事务回滚。Guard 以精确消费者、用途、修订、范围、依赖、有效时点匹配当前资格，不单凭 `PASS+current_valid`。撤权先同步阻断读入口，再独立裁决并重建投影。

**DDL生成约束**：优先复用 `gate_audits` 作为历史映射来源；不可在未确定历史 UPDATE、外键、PK、现有数据库角色与 RLS 情况下直接改成 `append_only`（现有实现仍 UPDATE `current_valid`）。未来 migration 应按扩展→双读/只读校验→受控角色切换→冻结旧写→回归→移除兼容分支的有界序列，不进行历史表 DROP/CASCADE。

**必须有的具体负测**：`GSQL-01` producer INSERT PASS 拒绝；`GSQL-02` producer UPDATE current_valid 拒绝；`GSQL-03` Operator/作品Reviewer申请专业G5拒绝；`GSQL-04` 不匹配修订、用途、消费者、过期、变更依赖各拒绝；`GSQL-05` 并发双签只保留合法最新投影且两个审计均保全；`GSQL-06` 历史PASS无审查者与版本不能晋级；`GSQL-07` 动态撤权后既存 published_pointer 也不能公开旧证据；`GSQL-08` 失败注入在追加裁决与更新投影之间，不出现半签发；`GSQL-09` `public.imported_materials` 匿名/跨用户行访问拒绝，合法导入保持。

**准出分级**：本节是**完整的操作次序与安全不变量目标**，不是生产库 DDL 字段确定证明；在实际 pg_catalog/role grants 未读到前，本节不得生成冒充可执行且安全的迁移 SQL。


## 10. K3-C1｜物理角色与RLS逐主体目标责任矩阵（新增强制合同）

固定依据：`202610070100_data_production_v2_baseline.sql@49d3b9d5`、`202610160300_six_stage_gate_audits.sql@2e5aa5bb3`、`202610292100_imported_materials.sql@b824ee5e`。本节为目标权限**矩阵**而非已经执行的GRANT/RLS。

| 可信DB主体/调用上下文 | `control.production_runs` | `control.gate_audits` 正式裁决 | 当前资格投影 | `public.imported_materials` | 前端合法消费 |
|---|---|---|---|---|---|
| Producer Stage受限凭据 | 创建/更新本run阶段状态 | **无INSERT/UPDATE/DELETE** | 只读合法自身候选及资格 | 无跨Owner权限 | 不得直接对外发布 |
| 独立G Reviewer专用签发入口 | 审核时只读核证 | 原子事务追加合法裁决，禁止修改/删除旧行 | 同事务CAS更新唯一键 | 不借签发读私有用户导入 | 仅返回审查结果 |
| Studio/Creator项目身份 | 自己受托项目任务状态 | 无写权；只读合法结果 | 按项目授权只读 | 自己/合法委托项目读写，其他用户拒绝 | 仅已授权Studio研究读取 |
| Operator/作品Reviewer | 运营作品及审核相关状态 | **无正式资格写权** | 可以核发布资格，但不可签发 | 无通配私有导入读取 | 仅按作品审核/权利发布 |
| Public WATCH/EXP | 不暴露内部run表 | 不暴露内部审计明细 | 服务端经当前合法G5/用途/权利筛选 | **禁止** | 当前已发布、未撤权、匹配consumer的分面 |
| 工程维护者 | 需Owner限时授权与审计 | 不用普通生产凭据授G PASS | 只读/受控迁移，不伪造决定 | 仅备份或合法迁移用途 | 按独立授权 |

**最小权限不变量**：只对Reviewer专用签发过程授最窄`EXECUTE`，调用人身份由可信会话验证；即使存在`SECURITY DEFINER`，也必须审查函数Owner、`search_path`、动态SQL、PUBLIC默认EXECUTE及生产连接是否可以调用。若生产Agent与Reviewer共用可绕过RLS的服务端高权凭据，**不能宣称独立Gate已实现**。物理角色名以真实pg catalog固定，不虚构现存角色。

**SEC-01的源级确定性**：`imported_materials`已有`owner_user_id`且原迁移没有RLS。目标为`ENABLE RLS`并设计`SELECT/INSERT/UPDATE/DELETE`四个操作的Owner/授权项目政策，验证会话主体与`public.users.user_id`的映射、合法服务端导入和历史记录可用性；**不可直接写 `owner_user_id = auth.uid()` 并假定UUID天然相等**。撤销多余anon/auth默认授权之前须确认真正使用PostgREST还是服务器受控DB查询路径。跨用户与匿名负例、正常导入正例、回退脚本均是强制工程门。

**明确缺项**：当前没有生产库可读`pg_catalog`结果，也没有全量数据库角色/服务连接凭证证据，故没有声称RLS已修复或安全DDL可立即上线。K3要补完源码/迁移中可获的静态角色链；只有真实环境的身份和权限差异可以延至工程预检，其他不得无解释延后。


### 10.1 已证实的自建认证与共享数据库凭据冲突（2026-10-31直接源码）

- `supabase/migrations/202610291300_users_auth.sql@f84c7fde2adaf78351f493f3a6292d07adf3c5ac` 定义 `public.users(user_id uuid,roles text[],status text)`，仅对users表启用RLS；**没有证明**已接通Supabase Auth uid/JWT。`apps/web/lib/auth.ts@10186ead382db1d9f14b441e23c69bdfc11a101c` 真实签发的session为自身HMAC payload `{uid,r,exp}`，不是Supabase JWT。
- `apps/web/app/api/studio/materials/import/route.ts@973bc0e81fe4ef22cc9cde9e4705224fcce5c890` 的GET与POST均调用`getSession()`，SQL直接使用`session.uid`筛选/写入`owner_user_id`；无登录401。POST还对授权声明、内容长度、文件格式设有限制；应完整继承此能力而不是新建导入服务。**已证业务层Owner限制，但不等于数据库物理RLS已安全**。
- `packages/data-access/src/index.mjs@d3f8ebc00dd3d3f48d6d8d2770e2e8777dd77193` 根据`MOHEN_DB_DRIVER`在`psql`和`node-pg`间选择，使用`DATABASE_URL`连接；现有读取接口并没有展示按Producer/Reviewer/Studio各自分配专用DB角色的机制。

**K3强制目标裁定**：不可把 `auth.uid()=owner_user_id` 当作当前有效RLS实现。未来必须选择并固定**一种可验证的可信身份传递机制**：推荐由独立服务在验证HMAC会话且核实时效/用户状态后，以最小受限DB角色进入用户作用域；RLS依赖经过DB可信通道认证/绑定的用户身份，而非浏览器可任意SET的GUC。若无法使DB可靠识别`public.users.user_id`，则在真实工程切换前不得开放面向浏览器的直接数据库访问；服务端的`owner_user_id`谓词与独立权限凭证需先作为受控边界并强制跨用户、冒名、权限提升负测。对于专业Gate还必须**真实拆分Producer与Reviewer数据库连接身份**，禁止共用可UPDATE/INSERT资格的`DATABASE_URL`超级权限；任何配置降级必须失败关闭。

**可执行迁移依赖**：先确定各环境 `DATABASE_URL`的实际角色与权限、连接池事务语义、`getSession()`用户状态复查、Supabase Data API是否暴露相关schema，再细化GRANT/RLS和受控签发函数的调用凭证；历史有效数据保留，正常导入链不中断。以上静态事实已定，运行授权与DB角色实测继续`SEC-01_HOLD`。


### 10.2 源码已核的账户禁用与会话即时失效缺口

`public.users.status`在管理Route可以改为`disabled`，但`apps/web/lib/session.ts@8e5b4dcd`只解析HMAC，`apps/web/middleware.ts@99d24fd2`也只验证签名/过期，未发现每次检查当前用户状态；`/api/auth/me@a000eb69`虽读用户`active`，不能证明其它受保护路由也调用它。需按**不可立即撤销既有token的风险**设计：用户/角色失效版本检查，所有敏感API统一实时/受控短缓存复核，审核/发布/签发/管理禁止沿用旧角色声明；关键撤权事件主动失效会话，并对禁用后旧Cookie访问及Operator最后账号并发分别做负测。不能把仅`/auth/me`显示未登录当作全站会话已撤销。


### 10.3 全部既存迁移SQL的权限定义检查（36份，固定提交）

已在固定提交 `759dbbd0c206c4acfe2ebdc3e94aa556528b330c` 逐一读取 `supabase/migrations/`目录列出的**36份SQL文件**，专门检查`GRANT/REVOKE`、角色创建/修改、`CREATE POLICY`、`ENABLE RLS`与`SECURITY DEFINER`的源码定义。本范围**未看到显式GRANT/REVOKE、CREATE/ALTER ROLE或SECURITY DEFINER授权定义**，只看到多处`ENABLE ROW LEVEL SECURITY`和下述两条显式Policy；这只说明**仓库迁移中的静态定义缺口**，不能推断远端DB没有平台默认授权、手动授权或已有策略。不得据此声称线上不安全或安全。

两条已证Policy都在`202610280900_publication_work_revisions.sql@f0397b2f23`：

- `publication.published_pointers`：`FOR SELECT USING (true)`，按指针本身没有当前G5/权限/撤权的额外约束；
- `publication.work_revisions`：`FOR SELECT USING (status='published')`，以修订状态判断，**不要求修订仍是当前已发布指针**，也未附专业资格/素材许可实时校验；相关库级访问仍依真实schema GRANT与会话身份。

这意味着最终公开合同应将「已发布指针仍生效、知识引用当前独立G5、消费者/用途、素材许可、依赖与时效」形成一个可审计的受控公开读取边界。撤回发布指针而旧revision仍为published时，直接访问旧修订必须被权限/消费Guard拒绝，不能只在UI下架。**不能单靠API作品Reviewer或上述两条RLS策略推出合法公开权。**

**C1静态权限决策可收敛为**：现有迁移缺少角色GRANT/RLS完整体系的显式声明，是未来新增最小安全迁移的设计责任；必须定向定义Producer/独立Reviewer/Studio/Operator/Public各物理主体、表/操作级授权及Session桥接与公开资格Guard，不重写旧迁移也不删除正常发布系统。对生产库事实的`pg_catalog`读取及迁移运行只在Owner独立授权工程后进行。


## K3-C2｜跨用户历史对话与审查角色的目标修补（固定源码直取）

- **P0：Studio历史对话**。`API-033 apps/web/app/api/studio/conversations/[id]/route.ts@d9d3fc2c` 仅用`guardRoute(params,null)`验证有会话；`fine-capabilities.ts@getConversation@77dba838`按`conversation_id`不带Owner查询；`202610290100_fine_capabilities.sql@03134890` 的`public.conversations`没有`owner_user_id`。目标是在现有表有界增加不可空Owner/项目授权引用（先分类历史孤儿，未知归属绝不猜分配）、路由与`getConversation/appendConversationMessage`统一按可信User+Owner约束读写，数据库权限以受限身份验证；跨用户已知UUID应拒绝/隐藏，登录并不等于授权。
- **P0：角色管理**。`API-047 apps/web/app/api/admin/acl/route.ts@96c48901`检查角色白名单、禁止自改、尝试保留最后一名Operator/Reviewer，但读取人数后更新用户角色**不是单一原子事务**，当前HMAC会话携旧roles而不主动撤回。目标单事务锁/版本并发保护、用户状态与签发权限实时复查、撤销Token后立即禁止旧角色；Reviewer角色的赋予不能隐含G0—G5独立签发者认证，更不能让Operator单方拥有专业签发权限。
- **审查列表不能冒充专业签发队列**。`API-020 apps/web/app/api/governance/gates/requests/route.ts@56e92ee5`允许Reviewer或Operator读取最近50条`control.gate_audits`，它们是过去的审计行而非独立待审候选。目标保持运营必要的最小脱敏摘要，真正独立专业G候选需要以Reviewer授权、对象/版本/项目和用途限制的受控申请源为准；不可将Operation作品审核判定替代G裁决。

对应最小修订应进入原有`fine-capabilities.ts`/Studio对话Route、`public.conversations`有界新增迁移、`admin/acl`、G申请/审核服务，并以`API-033/047/020`的跨Owner、并发、失效会话、拒绝伪Gate用例为合格门。当前仅源码审查+目标合同，不主张在线问题已实际发生。


## C1-SEC-01｜当前Supabase只读元数据实证与权限边界（2026-10-31）

**真实证据**：`public.imported_materials`当前`RLS=false`且`anon/authenticated`均被授予SELECT、INSERT、UPDATE、DELETE等权限；表在`public`下，Supabase Advisor明确报Critical RLS缺失。当前目录行数=0不能作为取消风险理由。`public.conversations` RLS=true无现行Policy、无Owner列但有一条记录；`control.gate_audits`RLS=true、表Owner postgres/`rolbypassrls=true`，约711条历史记录且仍可通过具Owner权限的连接更新。当前系统并无`mohen%`项目专用DB角色。以上全为只读目录/ACL检索，未执行测试写入或真实用户读取。

**修复顺序（未来获Owner授权工程后）**：①确认自建HMAC会话身份与实际DB连接账户，列出当前PostgREST暴露schema、现有合法导入访问链；②切分Producer/独立Reviewer/受限Studio/公众消费的最小授权数据库身份，禁止将postgres或service_role共用凭证当分权；③把public导入表的anon/authenticated直通权限撤销与RLS策略设计作为**一个原子受控迁移**，保留合法导入，且对旧HMAC用户不可盲用`auth.uid()`；④按官方RLS建议执行匿名、本人、跨用户、违规INSERT/UPDATE、合法导入返回行的正负测试；⑤再切换、审计和回滚。安全顾问给出的单句`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`只是建议的一部分，本阶段**没有执行，也不能未经策略审查立即执行**。

`publication.work_revisions`的仅status发布Policy、`published_pointers`的using(true)不是专业资格/媒体撤权保障；生产资格G5的独立签发/用途/依赖守卫必须在API服务与DB资格投影层强制实现。将此真实静态结构证据登记为`SEC-01_LIVE_CATALOG_CONFIRMED_CRITICAL / IMPLEMENTATION_HOLD`，而不是工程已修复。


## K3-C1/C2｜只读真实PG目录后的最终权限分层及公开读取责任（2026-10-31）

**已证事实**：连接的`mohen-cloud`实际库`control.gate_audits`存在711历史行、RLS启用但由`postgres`拥有且`force_rls=false`，`postgres/service_role`可bypassrls；`public.imported_materials`匿名/认证角色可执行CRUD且RLS关闭（Advisor critical）；`public.conversations`已有1行，RLS开但无Owner列，`anon/authenticated`有表级权限但无普通用户Policy；作品指针及修订表的RLS有公开读政策，但不能证明专业资格/版权仍有效。K3不得通过纯SQL模板误把自建HMAC当Supabase Auth `auth.uid()`，也不能把RLS启用但服务端使用`postgres`当安全证明。

**最低可恢复权限链（全部是工程目标，不是当前运行事实）**：边缘会话和服务器端fresh角色/Owner核准 → 最小角色DB凭据 → `mohen_producer`仅候选、`mohen_gate_signer`仅独立资格事务、`mohen_app_runtime`仅受控用户/作品消费 → 按当前资格指针＋G5目的/消费者/有效期/依赖＋资产rights过滤 → 用持续可复测的匿名/跨Owner/失效负例放行。不得让任何HTTP Router直接拿到签发私钥、Reviewer DB凭据、生产库Owner连接；单一用户兼任多角色时仍须不同签发动作和来源审计。

**SEC-01安全拒绝优先**：恢复工程后第一个安全治理迁移需在合法后端导入路径存在时，收紧`imported_materials`的anon/authenticated访问，启用RLS并保持已认证Owner通过受限后端访问（或经受信身份映射的严谨RLS）；在签发隔离、会话撤权、公开版本资格仍未通过专项负测前保持正式发布/生产解禁HOLD。特别是`public.conversations`旧行不能猜测Owner，其读写必须物理owner字段与服务层双重过滤。

**风险不得被统计掩盖**：`get_advisors`报告约52表“RLS on but no policy”为INFO类，不等于52项可公开泄露；恰恰需区分RLS默认拒绝与`bypassrls`后台连接。`list_migrations`为空不代表从未执行迁移，不能凭此直接重放DDL。实际查询记录与字段级DDL放在同一`PERSISTENCE_BINDING_CONTRACT`，不得复制第二套安全法规。

## K3-C1/C2｜可落地的会话与私人对话原路径安全修订（2026-10-31）

- 已形成未来仓库同路径目标候选：`apps/web/lib/{session.ts,ownership.ts,fine-capabilities.ts}`、`apps/web/app/api/studio/conversations/{route.ts,[id]/route.ts}`。所有数据层查询以 `owner_user_id` 为过滤，客户端不得传owner字段改变归属；默认不为存量未知Owner对话授予访问。
- `session.ts` 在 HMAC 验签后从 `public.users` 现查 `status=active` 与 roles，不依赖旧token角色直接授权。数据库不可用拒绝而不是盲信旧token。
- **仍待修补的旁路不能隐去**：`apps/web/lib/auth.ts` 的 `getSessionUser/isOperator/hasRole` 同步解析HMAC；多个Admin路由（如API-001/009/055/062）直接使用旧同步解析，不能仅替换 `getSession()`就声称全站禁用实时生效。全部特权API必须使用同一个新鲜 `getSession()`/角色判定或独立DB认证守卫，并证明不存在同步JWT角色捷径。
- 后端库仍可能以 `postgres` 或 `service_role` BYPASSRLS连接，源码Owner过滤只是防线之一。未来需把高权账户从普通App/Producer运行凭据剥离、按低权限连接实测。
- 未来安全负测：`SESS-01` disabled, `SESS-02` withdrawn reviewer/operator, `SESS-03` DB down, `CONV-01` guess another conversation ID, `CONV-02` legacy owner NULL, `CONV-03` unauthenticated, `CONV-04` anon direct DB. 旧公开发布/证据读取仍需G5/rights即时守卫。

## K3当前实际API直读新增SEC-01分支（2026-10-31）

- **API-054特权数据泄漏**：实际Admin Settings `GET`未检查登录/Operator，已经在Library未来原路径保存修订候选；未授权真实应用，仍需所有配置key与返回数据审计。
- **API-022通知未按Owner**、**API-045 DirectorPlans失配JOIN**、**API-081观看进度共享**：均需要物理Owner字段/关联键、DB最低权限与跨用户负例，不能只依赖页面权限。
- **API-063用户文件公开路径**：旧实现`fs.writeFileSync(public/uploads)`，缺大小/格式/权利/Owner边界，不适合作为私有证据或素材存储；需私有存储+显式披露授权+清理回退。
- **API-050公开发布GET有持久副作用**：`processDueSchedules()`必须移至经独立身份的定时作业，不能由查看页面触发。
本节已落实到现有API合同与85项账；所有安全风险仍为`ENGINEERING_NOT_RUN / SEC-01_HOLD`。

### K3精确修正｜通知直接归属字段及WATCH遗留主键

已由云端目录只读确认`public.notifications`使用`user_ref text`，不是`owner_user_id`。API-022目标代码已直接复用原字段、对话仍由新`owner_user_id uuid`实现。`watch_sessions(work_id PRIMARY KEY)`无法支持用户/修订隔离，必须先变更主键与Owner/Revision字段，游客不使用共享表。所有改变都是Library设计，不是Supabase实际DDL。
