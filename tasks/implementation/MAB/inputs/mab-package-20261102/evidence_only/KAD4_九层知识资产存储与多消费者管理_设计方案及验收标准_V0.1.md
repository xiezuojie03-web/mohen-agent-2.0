# KAD4｜九层主数据落点、多形态存储与多消费者知识资产服务——设计约束与验收方案 V0.1

**日期：** 2026-11-02。**身份：** KAD-02任务书KAD4的从属专业设计输入与验收细目，非第二份任务书、非新MHKA、非GitHub已生效规范。**状态：** `KAD4_PROFESSIONAL_DESIGN_EXIT_PASS / PHYSICAL_DDL_NON_EXECUTABLE / ENGINEERING_AND_RUNTIME_HOLD`。设计结论按本文件§10，不改变真实工程和Gate授权。


## 0.1 阶段与任务重心纠偏（2026-11-02）

Owner明确指出KAD3交互原型仍将“知识资产管理”做成独立平台，不符合五图中`Admin运营管理平台 → 知识资产子功能`的归属；决定停止本轮UI迭代，将呈现与交互验收递延到以后UI专项，**不得把不认可的原型标成Owner通过**。KAD3历史知识对象、权限、关联、Admin子功能业务合同与WATCH轻量消费方法保留`BUSINESS_DESIGN_EXIT_PASS`；KAD3 UI状态为`OWNER_REJECTED_DEFERRED`，真实运行继续HOLD。

**KAD4自此正式进入专业设计研究，不再等待KAD3 HTML签收**。先澄清生产对象、原件和长存、每层主数据实体、工作资产及版本、内外AI读取与贡献回执、消费者用途与权限；在新合同不清楚前，任何UI可视化都不构成设计进展。KAD5等待受控工程条件，做两题真实端到端验证，不是重新设计KAD3页面。

## 1. 最新四项Owner裁决（高于此前局部界面或数据库优化偏好）

1. 知识积累的终极功能是服务**Studio研究创作、WATCH合法阅读/观看、EXP未来探索**，而不是为了填表、单纯存储、知识问答或发表统计。现阶段实施顺序仍以Studio为先、WATCH轻量消费、EXP保留能力合同和晚期激活为原则。
2. 存储是知识资产成立的先决条件。KAD4本阶段必须确定**多形态存储方案、九层主数据落点、文件回放、版本身份、权限、AI可消费入口、备份恢复及必要物理变化**；不能用“以后接存储”准出。
3. 五图F01—F05的首页/Studio/WATCH/EXP/Admin总体布局为产品结构约束。**知识资产平台是Admin运营管理平台下的一个功能域**（可含目录、详情、生命周期、消费、资料与缺口、审计），不是第五图之外的新顶层产品/独立首页，也不以KAD4重启UXD/Figma审美研究。Admin仍承担作品运营、账户权限、审核/发布、数据资产、运营健康等既有职责；知识运营下沉为功能子模块。
4. L0—L8是9个**逻辑职责层**，并非9个独立数据库、9张表或9条生产链；但**每一层必须有1项以上明确的权威持久化主数据实体/表及其身份和管理责任**。同层可由多张表共同实现、可使用规范视图；索引、缓存、向量、渲染结果不冒充权威主表。缺失层须在KAD4提交明确的新建或现有表适配方案，含DDL/ACL/迁移/回滚设计，即使EXP暂缓也不得留成没有物理落点的口号。设计通过不等于云端DDL已执行。

## 2. 事实边界及证据

- Supabase只读 `mohen-cloud` 项目（2026-11-02）：`source.sources`/`source.read_units`、`evidence.material_evidence`、`world.entities`/`world.claim_revisions`/`world.relation_claims`、`meaning.findings`、六张`read_model.*`表均有记录；`public.research_tasks`、`study_asset_receipts`、`publication.work_revisions`等存在。**记录数、行级RLS启用或某个Gate审计PASS均不能独立证明全链合规和资产内容完整**。
- Supabase Storage当前`storage.buckets=0`且`storage.objects=0`：暂不能宣称已经具备真实的长期原件/图片/地图/音视频私有对象存储；`source.raw_items.storage_ref`是指针字段，不证明所指文件存在可回放。
- `vector`扩展当前未安装；代码已有按G5/agent的L5检索及部分Studio查询，**未证研究工作资产的统一长期检索、外部AI最小授权知识包与跨项目复用已端到端运行**。
- 安全事实：`public.imported_materials`的RLS关闭，且`anon`具有SELECT/INSERT表级权限；`publication.publication_schedules`RLS亦关闭但当前`anon`无表级读写授权。**SEC-P0**：先记录受影响服务和线上实际暴露面，设计Owner/角色策略及读写兼容，再在受控工程授权下修正并做越权负测。未经授权不直接启RLS/清数据/改生产库；无用户原件可安全入库的假定。
- 最新实际GitHub参照 `xiezuojie03-web/mohen-agent-2.0 main@db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`（施工前必须重新锁SHA）；实际`apps/web/app/admin/AdminWorkbench.tsx`知识栏是汇总投影，`WatchGallery.tsx`有图文消费基础，`asset-reflow.ts`明确占位`independent_gate_required`。不将旧投影入口当完整Admin资产管理。

## 3. 决定的基础存储架构（KAD4不可随意再改成单一聊天/文件库）

**主数据层：现有Supabase PostgreSQL**。继续沿用`source/evidence/world/meaning/read_model/control`、现有Studio/Publication schema和D00—D05/G0—G5，所有原子身份、revision、资格、访问策略、消费事件与依赖链必须有永久数据库落点。R4.3十三种Studio `asset_kind`维持逻辑类型，不机械新建13张表；为不可变StudioAssetRevision、混合Delegation/ExecutionReceipt、PublicationSnapshot及跨题use_history补确实缺失的物理责任。研究候选、正式知识、作品三种Truth/State严格分离。

**原件与大文件层：有权限制的私有对象存储**。优先复用当前Supabase Storage设施建立最少必要的**private**业务bucket，存原始PDF、古籍扫描、舆图、影像、音视频、可回放OCR源包等。可使用带版本的路径但**真正版本不可变**；DB存`asset_id@revision → raw_item/source_version → storage_ref + SHA256 + content_type + byte_length + source_locator + permission_scope + retention + owner`，检索和正式消费均经服务端授权、短时访问凭证；明确全文取得程度、上传内容版权、个人材料外发许可。不能把私有原件放在公开静态目录/Git仓库、靠永久公网URL当授权。无合法原件保存权时只保留目录/位置/最小元数据并明确HOLD。

**索引/AI派生层：可重建，绝不代替主数据**。第一步在PostgreSQL内使用有权限范围的精确字段、FTS/文本索引、时空/关系查询；必要时按中文文本检索实测选择索引技术。按实际规模和召回结果再决定pgvector与embedding/向量索引；向量搜索结果必须回指`artifact_ref@revision`和有效权限/资格，更新/撤权必须使旧索引不可被消费。知识图谱优先用现有world实体/关系/依赖表和受控查询，不因要有“图谱”而先引入第二真值图数据库。

**交换/归档层：版本化机器可消费知识包**。标准包应支持JSON/JSONL+manifest/hash与引用链，必要时GeoJSON/Parquet及被授权的文本、图片索引；保存资产身份、版本、来源位置、权利、用途/消费者、认识状态、依赖、工具生成回执；跨源恢复须验证hash/数据库版本/文件存在及权限复核。导出包不是未经授权可公开的第二数据库。

**运行与消费日志层**：保存`studio_request/agent_search/delegation/ingest/reuse/production/commit/publish/watch/explore/feedback/invalidation`有意义事件，记录project、consumer、purpose、asset_ref@rev、decision、合法资格、撤权与可用性；不得把点击或曝光自动提升为史学贡献，用户贡献/隐私保留同意和可删除边界。聚合指标可重算，原始合规事件要有明确存期。

### 3.1 对内外AI的唯一服务原则

- **内部MoHen Agent**：从Studio有项目授权的`SearchStudioAndL / ResolveAssetRevision / GetEvidenceLocator / ExplainRelations`读取L0—L4合法工作与正式知识候选，公共消费另走有当前G5的L5读取；产生结果只能经`SaveRevision / RequestFormalProduction`受控接口，不能绕D/G写Truth。每次查询需可审计的`consumer,purpose,project,ref@rev,rights_decision`。
- **外部AI**：不得用DB service role、全库SQL账号或原件永久URL访问。由墨痕Agent/服务端依据`DelegationEnvelope`生成**最小授权知识包**，保留不可外传原件的阻断；外部回传`ExternalResultPack+ExecutionReceipt`先隔离、验证来源和权利，再保存候选并请求正式D/G生产。
- **Studio/WATCH/EXP**：Studio可消费项目授权的研究候选和正式知识；WATCH仅已发布同一作品修订的当前合法引用/展示媒资；EXP未来查询受限定L5+L6状态与关联，当前不要求全面开发EXP。任何缓存和检索索引被撤权后必须先守卫拒读，不能等异步索引刷新。

## 4. L0—L8主数据落点与准出责任（必须一层一项以上权威主实体，不是一层一张表）

| 逻辑层 | 该层真正的主数据及消费者 | 当前真实主表/缺口 | KAD4本阶段必须固定的物理设计 | 当前判断 |
|---|---|---|---|---|
| L0 来源 | 来源身份、版本、获取范围/权利、原件hash；Studio/Agent | `source.sources`, `source.source_versions`, `source.raw_items`已有 | 源/版本/原件三主实体；对接private blob及可回放测试；书目≠全文 | `ADAPT` |
| L1 读取 | 载体页/图幅/区域、OCR候选、方法与疑点；D02/Studio | `source.read_units`,`source.read_runs`；另有`evidence.reading_units`，历史职责可能重叠 | 确定唯一L1读取主ID/版本/parent/locator；核对双表职责、禁止平行真源 | `ADAPT / RECONCILE` |
| L2 证据 | 材料原句/声音/转引/反证/观察；D03/研究 | `evidence.material_evidence`, `evidence.material_mentions` | 定义证据核心主实体、见证谱系、关联L1及具体原件指针 | `ADAPT` |
| L3 世界 | 人地事物实体、事件、关系、变化、历史主张版本；创作/EXP | `world.entities`, `world.relation_claims`, `world.claim_revisions`, `world.changes`；另有部分事件相关空表 | 指定实体、主张与关系**各自主表**和交叉引用；不能挑一张表代替整个L3 | `ADAPT` |
| L4 解释 | 人文发现、当下联系、竞争解释；Studio/Agent/WATCH通过L5 | `meaning.findings`, `meaning.present_connections`, `meaning.open_questions` | `findings`主实体及修订/资格/证据依赖；开放问题和当代连接不能冒G4合格 | `ADAPT` |
| L5 可信消费 | 世界投影、时空、Agent上下文、故事种子、探索路径、证据指针；WATCH/Agent/未来EXP | 六类`read_model`主表已存在 | 六表联合构成L5权威**派生集合**，登记唯一发布引用/版本及G5按consumer/purpose/action的真实有效守卫；不能因用户要求“一层一个主表”造第七份Truth | `ADAPT` |
| L6 体验运行 | 用户体验会话与Action/Composition/Trail/状态；WATCH/未来EXP | `public.explore_sessions`, `public.watch_sessions`已有但不足统一体验状态/会话责任 | 固定一项L6**会话主实体**及持续状态/动作事件的存储方案：明确`ADAPT existing`或有理由`CREATE`，包含访问、版本、保留/撤回 | `PARTIAL / DESIGN_REQUIRED` |
| L7 参与贡献 | 经同意的参与、贡献、反馈及被接受/拒绝记录 | `public.work_engagement`主要是聚合计数，不能充当事件/同意主记录 | 固定一项L7**授权贡献主实体/事件主账**，与聚合统计分开，含同意/撤回/权利和数据保留；当前不强行扩大社区功能 | `GAP / DESIGN_REQUIRED` |
| L8 当代文化新痕迹 | 用户/社区或现场合法提交的当代文化材料候选、版本和D00再入路径 | 当前已核schema中无明确L8主数据表，不能因为未来EXP延期而永久缺失 | 固定一项L8**文化新痕迹候选主实体**（必要时最小CREATE），注明时间地点、采集同意、媒体引用、认识类型、是否回D00；不得把反馈自动晋级史实 | `GAP / DESIGN_REQUIRED` |

**固定验收口径**：KAD4必须生成一张逐层的`layer → primary_business_entity → canonical_table(s) → PK/revision → objects/source_refs → rights/ACL → read/write API → consumer/use → retention → export/restore → migration_action(KEEP/ADAPT/CREATE) → source_evidence → POS/NEG/AUTH`物理合同矩阵。已经有的表不得一味新建；L6—L8目前不足时可以先冻结物理设计、受控分阶段落地，不能签已经在生产运行。

## 5. Admin在五图中的唯一归属与展示/操作标准

- F01—F05的顶层入口仍为**首页、Studio、WATCH、EXP、Admin**；**Admin → 知识资产（子功能）**。Admin内将知识目录、条目明细、原件定位、资产库/文件引用、版本与资格、关系与发现、生命周期、消费影响、缺口与补证、研究贡献和复用串联；其它运营/作品/账户/审查职能继续存在。
- Admin应按**业务对象→条目→原件和关系→存储与资格→被谁在何处消费→受影响作品/任务→下一步管理动作**逐级展开；L0—L8是专业层次导航/字段和筛选，可看也可不看，不是强迫Owner按9张技术表管理知识。可以显示“该条目存于哪个主表/文件”但不能直接给予普通Operator任意数据库写权。
- L5消费资产和L6—L8运营资产要**另有消费管理视图**：按`consumer`（Studio/WATCH/EXP/agent/external_adapter）、`purpose`、`action`、`asset_ref@rev`、`access/usage/rights`、`event`以及已撤权影响进行索引。WATCH播放计数≠知识消费回执；用户贡献≠可信事实；Admin统计数字须可追具体行。
- 唯一入口基于KAD3既有Admin六工作面增补，避免新建独立“知识资产平台”路由/全局导航，也不复开UXD-01美学研究或五图细节复刻。KAD4只定义这些内容的**后台查询/管理接口、字段、状态及安全验收**，Owner的实际UI体验放到后续UXD，不作为本阶段阻断。

## 6. KAD4必需的工程设计交付（设计完整≠修改生产系统）

1. **九层主表/物理映射冻结表**：现有表/列/主键/索引/参照、0数据表也说明原因、缺口ADAPT/CREATE依据、DDL和迁移SQL的精确需求/差异，L6—L8的主实体按可施工字段落实，不做虚假已投运声明。
2. **原件持久化及恢复方案**：私有bucket及目录/访问/版本/sha/存储容量策略/成本上限/备份恢复、多源导入授权、截图/GIS/音视频和失效负例；至少一条“原件→源版本→读取单元→证据/关系/发现”的可返查结构链；测试脚本待工程授权执行。
3. **AI受控消费与知识资产服务接口**：Studio L0—L4项目级读取、L5合法按消费者读取、外部最小知识包与回执，跨题版本复用，明确代码路径与字段/失败/权限/缓存撤权契约；R4.3 13 asset_kind逐种主存储映射和稳定版本。
4. **Admin下属知识业务的数据服务**：五图结构不变，明确查询业务对象、来源和原件、版本、资格、存储状态、引用消费和失效影响的API/权限/数据来源、正常/空/受限/错误四态；**不制作新UI原型或独立平台路由**。
5. **安全/隐私/成本与回滚合同**：SEC-P0导入权限、数据库RLS/服务角色/行级隔离、Gate Reviewer与Operator分权、外部AI发送权、备份/恢复和文件一致性、过期数据保留/删除、月度云费预算、对旧K3和已有业务的兼容回退。
6. **双题运行的准出脚本**：第一题从D00原件获取与阅读到Studio资产/作品，第二题精确复用资产修订、增加有证关系/人文认识，Admin能看增长及L0—L8消费踪迹；WATCH合法读同一作品，EXP只验证未来合同不必全面实施。KAD2首题真实协作HOLD与KAD3 Owner UI未通过且递延均不得改成通过；后者不阻断当前KAD4。

## 7. 不可豁免的设计终审门与反例

- **ST-01层主实体**：9/9层均有明确主数据持久化实体、PK/rev、唯一表或表组及权限/消费者/迁移措施；L6—L8可明确`DESIGN_FROZEN / LIVE_HOLD`，不得`UNMAPPED`。
- **ST-02文件存取**：原件/地图/影像与SQL元数据有稳定反向引用、hash、出处版本/许可/读取位置；仅`storage_ref`字段、空Storage桶或不存在的外链不算资产已保存。
- **ST-03权利安全**：导入原件RLS及anon权限缺口列P0、可执行回归责任，内部外部AI、Studio/运营/公众权限彻底分离；未修复不得开放敏感上传/外部共享。
- **ST-04真实复用**：保存工作修订、跨刷新恢复、指定版本查找、第二题引用和增量，全部有正例与删除run/越权/版本冲突反例；理论合同可准设计，实跑才可准运行。
- **ST-05检索消费**：L0—L4项目授权检索、L5视觉/Agent/公开资格、外部受托最小知识包、WATCH当前权利与撤权失效均有字段级接口和回执；向量索引可延期但不可把缓存当真值。
- **ST-06运营归属**：知识资产永远是Admin子功能，不成为第六个主模式；后端必须具备从具体条目到存储与消费去向的授权查询/管理接口；实际界面展示与Owner体验由后续UI专项验收。
- **ST-07九层差异**：L6体验状态、L7参与贡献、L8新痕迹必须区分业务主记录和统计/缓存；反馈新来源须合法经D00，不得自动改已批准史实。
- **ST-08备份恢复成本**：数据库+对象文件+manifest的一致性备份/恢复、泄漏和版权失效回滚、跨区域恢复/数据迁移与预算边界完整设计，实际恢复试验留KAD5/工程授权。
- **ST-09旧链保护**：D00—D05/G0—G5/13资产、H/I、KAD1镜像合法继承、不重复Truth表，原技术合同版本/角色无冲突；设计与线上独立证据分级。

KAD4**不得准出设计**若上述任一项只写原则没有具体物理落点、接口、失败、验收责任；**不得准出运行**若仅有本方案/DDL候选/空桶配置而没有真实测试。任何未获Owner明确工程授权的生产写入、Supabase bucket创建、GitHub推送和公开发布都禁止。

## 8. 正反双向追溯与交接

`KAD-02 V0.4 §00.7 + §KAD4 + §07 → 本方案ST-01—09 → 04/repo_target既有KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT/AGENT_CONTRACT/API_TOOL_CONTRACT/EXPERIENCE_CONTRACT → 实际DB表/Storage/Repo方法 → 工程POS/NEG/AUTH测试 → Studio/Admin/WATCH/未来EXP`。反向从每个新增列、bucket、接口、Admin动作追问其唯一上位Owner、实际消费/证据、避免平行真值和重复工程。在KAD4按真实最新main及现行云DB重审差异，不倒退重审KAD1准出。


## 9｜最终统一设计合同（KAD4本轮专业裁决，取代此前增量记录）

### 9.1 唯一知识生成与保存链

`Studio题目/授权项目 → Agent检索旧知识/委托 → D00来源发现与实际取得 → L0源作品/版本/原件 → 独立G0 → D01原件分段/读取 → L1可回放单元 → G1 → D02材料语境/声音/证据观察 → L2 → G2 → D03历史世界实体/主张/关系/演变 → L3 → G3 → D04人文发现/当下关联 → L4 → G4 → D05按消费者目的生成六类L5分面 → G5 → Studio/WATCH/未来EXP合法消费`。

**Studio资产与正式知识并行积累**，工作候选能保存不代表具有G资格；AI检索、工作区保存、原D阶段验收、独立G、作品编辑批准、媒资权利、公开消费分别持有自己的状态。L6是体验事件与状态，L7是经同意的参与/贡献，L8是当代新痕迹候选；L8再进入历史研究必须重新经过D00，不存在D06/G6。

### 9.2 九层主数据的业务身份与唯一物理责任

| 层 | 稳定主实体/主表组 | 关键引用和边界 | 裁决 |
|---|---|---|---|
| L0 | `source.sources(source_id)`, `source.source_versions(source_version_id)`, `source.raw_items(raw_item_id)` | 原件桶对象须hash/版本/许可；`storage_ref`有值不等于字节存在 | `KEEP+ADAPT raw_items` |
| L1 | `source.read_runs(read_run_id)`, `source.read_units(read_unit_id)` | D01逐页/区域/方法读取；`evidence.reading_units(reading_unit_id)`仅担任D02材料结构/分类与语境单元，**不成为第二个D01读单元真源** | `KEEP+ADAPT bridge` |
| L2 | `evidence.material_evidence(evidence_id)`, `evidence.reading_units`, `evidence.read_unit_evidence_links(link_id)` | 通过`read_unit_evidence_links`精确从D01 read_unit→G1→材料证据，必要时再由material_evidence的D02材料结构ref回溯 | `KEEP+ADAPT links` |
| L3 | `world.entities(entity_id)`, `world.claim_revisions(claim_revision_id)`, `world.relation_claims(relation_claim_id)`, `world.changes(change_id)`, `world.claim_evidence_links` | L3不是单表：实体身份/关系/可修订主张独立；主张引用证据必须精确修订，不靠自然语言名称关联 | `KEEP+ADAPT evidence edge` |
| L4 | `meaning.findings(finding_id)`, `meaning.claim_revisions(claim_revision_id)`, `meaning.present_connections(present_connection_id)` | 解释修订可追到L3及反方观点；当下联系不自带事实资格 | `KEEP` |
| L5 | `read_model.world_projections/agent_contexts/story_seeds/discovery_paths/map_timeline_projections/evidence_pointers` | 六类可重建的正式消费分面；现有`projection_key`等只做检索键，目标消费必须持久绑定发布时`projection_revision_ref + payload_hash + source_dependency_snapshot + Gate decision`，按当前独立G5、revision、consumer、action、rights和依赖核验；不能造第七份Truth | `KEEP+REVISE guard` |
| L6 | `experience.runtime_sessions(session_id)`, `experience.runtime_events(event_id)` | 会话可以按隐私保留期清除，不因为L6有主表而永久保存用户轨迹；现有`explore_sessions/watch_sessions`只做迁移/兼容 | `CREATE设计冻结/启用DEFER` |
| L7 | `participation.contributions(contribution_id)`，同意变更为追加版本 | 浏览/点赞的聚合指标不算文化贡献；撤回触发守卫与下游清理 | `CREATE设计冻结/启用DEFER` |
| L8 | `culture.trace_candidates(trace_id,trace_series_id,trace_revision_no)` | 观察时间/地域/来源及同意；进入正式历史知识只能先建有权的D00输入请求 | `CREATE设计冻结/启用DEFER` |

L0—L8全部具名物理落点；正式长期知识以L0—L5为核心；L6—L8并不要求在Studio首次生产前全部上线。新增表的名称为**专业语义与迁移候选**，不是生产DDL已执行声明；实施前必须与当前仓库migration去重。

### 9.3 13类Studio资产：既有功能优先、长期身份唯一

**新增最小长期主记录意图**：`studio.projects(project_id,owner_user_id)`（项目稳定身份）；`studio.asset_heads(asset_id,project_id,kind,current_revision_id)`和只追加`studio.asset_revisions(revision_id,asset_id,revision_no,sha256,origin_snapshot,source_refs,dependency_refs,rights_by_action,payload|blob_ref)`；`studio.asset_links`精确绑定来源/目标修订；`studio.use_events`记录授权消费结果。`project_id`由受控服务核发，不能信任外部AI自己提供的文字项目名；项目间复用必须核源、目标双方授权与许可。

十三个`asset_kind`全保留，按源身份分三组：

- **研究独立修订**：`research_brief`、`source_anchor`、`reading_note`、`evidence_note`、`spacetime_candidate`、`relation_hypothesis`、`humanistic_insight`、`research_collection`——存Studio自身版本，引用正式L@rev或材料候选，未经独立G不得公开当事实。
- **现有业务真实对象的精确引用封套**：`director_plan`→`public.director_plans.plan_id`；`media_selection`→`public.assets.asset_id`与按动作媒资许可；`work_revision`→`publication.work_revisions.revision_id`。封套可保存研究用途/引用，但**不复制第二份作品/媒资/导演主正文**。
- **消费与贡献快照**：`citation_snapshot`保存当时引用/签发/权利快照但不取代当前Guard；`consented_feedback`是研究中经许可的反馈资产，关联L7经同意贡献及撤回记录；普通点击不产生此资产。

修订`(asset_id,revision_no)`、内容hash与幂等键保证“不变+去重”；`current_revision_id`仅作为可核的CAS指针而不是旧版被覆写。`study_asset_receipts/research_events`现有任务级联不担任永久真账。长期委托/执行回执必须拥有稳定ID、源任务ID的**不可变值快照**，即便原任务按策略删除仍可依法保留不包含不必要私人资料的追溯元数据；既有任务FK仅可作为可空关联，不作为永久委托存在的前提。所有研究身份按脱敏和法定保留要求保存，不强制无限期保存私人原文。

### 9.4 对象文件生命周期与可恢复性（必须设计，现在不创建桶）

方案为**最少一个私有业务bucket**，目录候选`raw/{source_id}/{source_version_id}/{raw_item_id}/{sha256}`，Studio大型派生内容使用分离前缀并明确原件/衍生区别；每次版本生成新键，禁止覆盖旧对象。登记MIME、字节长、SHA-256、来源版次、具体卷页/图幅/区域locator、来源权利、数据保留级别、存储状态及校验时间。

写入采用**补偿式两阶段**而非虚构跨PG/Storage事务：`PENDING → 字节上传+实际回读校验 → STORED_VERIFIED`，失败为`UNAVAILABLE/RIGHTS_BLOCKED`并记录孤儿对象清理；真正可核对的内容hash与授权回放是存储成功条件。现库98条带ref却无业务对象的旧行默认为`POINTER_UNVERIFIED`，按合法外部来源逐一验证，不自动判“已存”或“全丢失”。没有合法保存权只存目录级证据及原站locator，禁止擅自复制受限图像。

读取使用受控服务按项目、actor、purpose、action、rights及当前资格返原件页/区域或返回限制原因，不直接给AI永久URL。签名URL在有效期内可能继续可用，**即时撤权要求敏感原件采用逐请求授权的服务器代理读取，或不可共享的短时URL及明示撤权窗口**；撤权后不再签新URL且清除可控缓存。外部AI传输单独核外发/模型处理权，不能以“研究可读”推导“可发第三方”。

备份与恢复是`数据库快照 + 对象清单/文件副本 + policy/rights快照 + SHA/locator核验manifest`的整体，不认为数据库备份自带Storage文件；灾难恢复环境默认无外网公开/G授权，再逐项核文件hash、PK/FK、版本链、项目隔离和现行撤权。脱敏日志和同意保留按时限执行。费用优先使用既有Supabase，计DB/存储/出站/备份/读取解析/工具/AI；超月度Owner批准预算则有界HOLD，不先引入向量库/图数据库。

### 9.5 唯一授权消费接口（**职责合同**，不强制创建新HTTP路由）

| 服务职责 | 核心请求字段 | 必需返回及可拒绝原因 | 合法写入/唯一Owner |
|---|---|---|---|
| `SaveRevision` | `actor,project_id,asset_id/kind,expected_rev,sha256,idempotency,rights,source_refs,payload` | `asset_id@rev`及来源；`PROJECT_DENIED/VERSION_CONFLICT/RIGHTS_MISSING/IDEMPOTENCY_CONFLICT` | Studio资产头与不可变rev；**不写正式L/G** |
| `SearchStudioAndL` | `actor,project,consumer,purpose,action,layers,query,scope,policy_version` | 分项目裁剪`ref@rev`/来源/资格/未决；`CROSS_PROJECT_DENIED/UNQUALIFIED/STALE` | 只读Studio与L0—L4授权数据；公开L5另走Guard |
| `ResolveSourceAndEvidence` | `ref@rev,raw_item,typed_locator,action,actor` | 字节状态、原卷页/区域/对应识读/证据；`BIBLIOGRAPHY_ONLY/LOCATOR_MISSING/BLOB_MISSING/RIGHTS_DENIED` | 只读source/evidence +私有对象，留审计 |
| `DelegateExternal/AcceptCandidate` | `root_task_ref,subtask,project,provider,scope,source_refs,rights_transfer,budget,idempotency,pack_hash` | 委托修订/回执、候选ref、保留/隔离/失败；`EXTERNAL_TRANSFER_DENIED/RECEIPT_MISSING/BUDGET_HOLD` | Studio委托/执行回执；经原D生产申请，不给G写权 |
| `RequestFormalProduction` | `candidate_ref@rev,target_D_stage,scope,source_refs,expected_qualification` | D阶段请求与独立G决定或`WAITING_GATE/UPSTREAM_HOLD` | 原run/受控Gate申请，不允许自签 |
| `ReadQualified` | `work_revision/ref@rev,consumer,purpose,action,policy_version,time` | 当前合法L5分面或`GATE_NOT_VALID/RIGHTS_REVOKED/DEPENDENCY_STALE` | 原六类read_model与作品公开接口；Guard每次重新检查 |
| `AdminKnowledgeRead/UseHistory` | `actor,operator_scope,project,ref@rev,filters` | 知识条目、来源、存储状态、关联、证据、资格、用量与缺口或`AUTH_DENIED/NOT_FOUND` | F05 Admin**内部子功能**，仅业务授权查询/请求补证，不新Truth |

**统一响应封套**：`request_id,status,origin_kind,artifact_ref,revision_ref,decision_ref,source_chain_refs,restrictions,reason_code,blocked_refs,next_allowed_action`；列表允许`partial`并列出拒给字段。消费事件只在真实有意义的检索/引用/复用/撤权时记录actor/项目/消费者/用途/版本/决定，不把“曝光/点击”硬塞进长期知识审计。匿名负例、外传拒绝、过期资格、任务中断及幂等均要有可判的错误结果。

### 9.6 工程去重、角色和分阶段实施策略

- 当前`main`已将`recordGate()`改向`control.gate_candidates`提交候选，但云DB无此表；因此候选表是必需的**物理设计补缺**，仍只能通过独立Reviewer写Gate审计。`passed/legalInput`仅看G PASS/current_valid尚不足以当消费Guard。
- `source.read_units`承担D01，`evidence.reading_units`承担D02材料分类/分段，已有`evidence.read_unit_evidence_links`是正式桥，不能造第二桥；`world.claim_evidence_links`承担证据到世界主张，当前0行只能未来真实生产，严禁自动回填伪历史连接。
- `public.imported_materials`无RLS且anon具有表权限，视为必须工程优先处理的`SEC-P0`；目标为匿名/跨Owner拒绝且合法Owner导入仍成功，核真实Data API和服务端调用后再实施RLS/GRANT。未来任何新增后端服务需拆生产者与独立Reviewer数据库角色，不得将服务角色密钥交外部AI。
- 当前非执行SQL的**12张候选表是设计上限候选，不是造表KPI**：Studio项目/资产/委托/回执/用途记录6+，`control.gate_candidates`一项，L6—L8最小业务记录其余；L6—L8暂缓落地但主实体/字段/责任已冻结。真实Repo若发现等价表则`ADAPT`优先。
- 工程接入原位修改既有`specs/data-production/PERSISTENCE_BINDING_CONTRACT.md`（主物理Owner）、`KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`（13资产Owner）、`SECURITY_ACCESS_CONTRACT.md`（权限Owner）、`API_TOOL_CONTRACT.md`与既有数据生产/Gate/Experience规范（各自身职责），**本方案不作为并行生效工程权威**。只交付差异，不提前打工程包，不重启Admin独立UI原型。
- 工程的SQL建表、静态执行测试、真实ACL/RLS、上传回放、备份恢复、有效独立Gate、真实接口和KAD5双题测试仍全为`NOT_RUN`。**这些是工程/运行准出门，不属于KAD4专业设计准出的前置试运行义务**；工程若发现真正新设计矛盾，再定向回滚设计准出并修正，而不是预设持续HOLD。

## 10｜KAD4设计准出与后继责任

- 本设计§1—9、非执行DDL草案、九层映射及工程责任矩阵，对照ST-01—ST-09与13种类型完成正/反设计级归属审查。已知源数据断链、物理缺表、RLS问题均在**目标字段+责任服务+拒绝后果+工程独立测试**有具名处理；不作为“已实际修复”。
- **专业设计结论：`KAD4_PROFESSIONAL_DESIGN_EXIT_PASS / KAD4_PHYSICAL_IMPLEMENTATION_HOLD / KAD4_RUNTIME_HOLD`**。前者仅证明知识生产与多形态存储方案、九层主数据身份、13资产、受控AI接口、权限/恢复语义及最小工程变更已设计到可交接程度；不宣称候选SQL已经通过PG编译、现有权限已修复或运行已通。
- 后续次序：**授权的工程方**先基于当时最新`main`做原路径规范合并/迁移去重、安全止血、隔离正反测试和真实对象存储→受控真实双题KAD5→KAD6全域设计/工程一致性总审。KAD3 UI仍`REJECTED_DEFERRED`，EXP不提前激活；若具体工程事实推翻某设计假设，应回写对应单一Owner合同，不重复启动UI或KAD1研究。
