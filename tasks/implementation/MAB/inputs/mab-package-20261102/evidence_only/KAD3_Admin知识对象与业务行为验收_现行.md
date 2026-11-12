# KAD3｜Admin具体知识对象与业务行为验收合同（设计现行）

**阶段：** KAD3；**日期：** 2026-11-02；**身份：** 06专项下的业务设计研究与验收来源，**不是**独立新MHKA章程、Repo现行规范或数据库迁移文件。  
**上位：** KAD-02 V0.4 §00/02/03/KAD3/07/08；KAD2《混合任务委托、执行、成果回流与Studio全链合同》；KAD1设计准出及现行`04_工程规范与Codex接入/repo_target/`目标规范。  
**职责归属：** MHKA-02拥有Admin/WATCH业务与体验语义；MHKA-03拥有知识身份、资格、权利及复用语义；MHKA-04拥有D/L/G生产与Agent分工；MHKA-05拥有API/DDL/ACL/执行；MHKA-00拥有角色治理。具体机器消费者应在KAD4最小增量阶段**原位**落入现有`specs/EXPERIENCE_CONTRACT.md`、`specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`、`specs/API_TOOL_CONTRACT.md`以及对应代码/测试，**不另造平行运行权威**。  
**状态：** `KAD3_DESIGN_ONLY`；本设计包含交互式合成样本，运行端到端、真实G/RLS/素材许可、真实Owner验收均`NOT_VERIFIED`。

## 0. 目标、界限与裁决

**本阶段优先解决：Owner能把历史知识当“具体内容”读懂、管理与延续，而非面对SQL表/纯统计/技术日志；下一项研究可精确使用已保存的知识对象和研究修订。** 具体包括知识目录、条目细读、原件证据、时空关系、知识价值与今天生活的连接、获取/识读/解释缺口、混合研究贡献、项目进展、跨题复用和人类方向决策。Admin按项目、来源、用途分权访问内审资产；不把候选自动公开。轻量WATCH只消费Studio同一合法发布修订。UXD-01暂停、EXP暂缓；不重做五图美学、不新增第二知识库或作品库。

**KAD2保持完整已设计输入。** 首题真实内外AI协作、生产DB/RLS/Gate和双题运行仍需KAD4—5负责；本轮的交互操作与数据均是明确模拟，不得标记`VERIFIED_LIVE`。

## 1. 唯一输入与实际代码差分（只读基线）

GitHub `xiezuojie03-web/mohen-agent-2.0`, `ref=main`, commit `db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`；默认分支并不是main，故后续必须重新锁定ref与HEAD。此处仅列本轮**实际fetch**到的证据，不推断实时部署。

| 实际位置／当前Blob | 已证源码行为（CODE_PRESENT） | KAD3设计差分/风险 |
|---|---|---|
| `apps/web/app/admin/page.tsx` `b182ab4b` | 取`readProductionRelationSummary()`后渲染AdminWorkbench | 顶层整包汇总不等于可逐项查的多层知识目录 |
| `apps/web/app/admin/AdminWorkbench.tsx` `55e67fb3` | 九导航含“知识资产”；当前资产页将`summary.entities`、`summary.stories`、`summary.timeline`展示成汇总卡/故事条目，标题称“G5已发布” | 不是包含候选、L0—L4、原始源定位、精确rev、权利/缺口/复用的项目级知识管理台；`entities.length+stories.length`非真实唯一知识对象数；页面中的作品“资格审核”不得误认为独立G0—G5签发 |
| `apps/web/app/admin/sources/page.tsx` `ca9f9f98`; `api/admin/sources/route.ts` `8efcfbf1` | Operator可探测V1来源API健康/人工接入 | 健康≠“某一研究任务获得全文”“某页可读取”；增加D00/01/02条目级缺口视图，保留原健康功能 |
| `apps/web/app/studio/desk/page.tsx` `ee0f75d4` | 按Owner查`research_tasks`及`imported_materials`，从checkpoint聚合研究线索并按篮评分 | 当前资料篮不等于长期不可变StudioAssetRevision；`license`由上传声明不必然证明全部展示/外传权；Admin必须明确来源和待验证状态 |
| `apps/web/app/watch/WatchGallery.tsx` `a8f1e55d` | 从`/api/works/published`加载作品，区分失败/真空，展示章节与“图文阅读、非媒体播放” | 保留，无需重新建观看流程；每个章节/媒资合法消费守卫、引用返查与撤权仍待实现核实 |
| `apps/web/app/api/public/works/route.ts` `99c284a1`; `[id]/route.ts` `3092b23d`; `[id]/eligibility/route.ts` `88cdbcd0` | 底层`listPublished()`提供作品，eligibility目前按列表有无判断 | 仅出版指针不能推断当前G5/rights；公开列表/详情/节目/分享必须一致验当前消费者授权 |
| `apps/web/lib/publication.ts` `028cff6d` | 作品保存、提交、发布与Published pointer等 | 作品审核不能替代史学资格；作品/知识回流及发布事务、旧合法版回滚仍需运行验证 |
| `apps/web/lib/read-model-bridge.ts` `7f352651` | 当前某些世界/时间投影可读取，含`visual_stage`相关查询 | 检查真实资格/消费者/时效/来源限制，不直接当Studio所有知识对象的万能搜索API |
| `CURRENT.md` `d64ab71f` | 记录2026-11-01已测旧正式版本，及未部署的最新JSONB修复 | 不据此认为本轮KAD3新设计或G5已上线；部署SHA另验 |

**静态重要发现：** Admin当前已经有“知识资产”入口，不能以“没有Admin”立项；但内容域过窄。WATCH当前有图文章节阅读，不能以“没有观看模式”立项。两者应在**现有功能上最小补齐**。

## 2. 业务知识对象、双身份与来源

Admin目录是**跨资产类别的授权视图**，不是新第14类资产，不是从世界L3另复制一份Truth。目录行使用`catalog_item_ref`作前端投影键，始终保留`source_kind+artifact_ref@revision`或`studio_asset_id@revision`或`work_id+revision_id`之一；相互关联必须显式identity/revision/关系类型与作用域，不允许同名字符串自动合并。

| 目录类别（业务可读） | 背后的真实资产来源 | Admin可读核心 | 特别禁止 |
|---|---|---|---|
| 史料来源/原件 | L0、source_anchor | 作品/版本/馆藏/版权/取得程度、可用原件 | 书目线索标“已取得原文” |
| 原文读取/材料观察 | L1 read_unit、L2 observation、reading_note/evidence_note | 页/图幅/区域、OCR候选、作者与记述年代、转引/疑点 | OCR串字冒充原貌，模型理解冒原文 |
| 人物/地点/事件/历史状态 | 具名L3对象及其版本、spacetime_candidate | 身份消歧、时空范围与精度、证据支持/反证 | 同名视为同物，时间精度虚构 |
| 历史关系与变化 | L3关系/变迁及relation_hypothesis | 主体/客体、谓词、方向、时段、推断/有证边界 | 共现自动等于因果 |
| 人文发现/当下连接 | L4解释、humanistic_insight | 历史理解的增量、比较口径、当下生活连接、竞争解释 | 文案好看即G4合格 |
| 课题/研究集合 | research_brief、research_collection、KAD2 root/subtasks | 研究目标、内外贡献、欠缺和后续复用 | run日志删除即永久丢失 |
| 编导与作品 | director_plan、work_revision、PublicationSnapshot | H1/H2/H3、修订/引用、投稿与出版状态 | 运营批准直接晋升G或改写L3 |
| 反馈 | consented_feedback（仅有同意） | 反馈用途、授权撤回、是否构成后续研究候选 | 普通点击自动生成史学资料 |

13种Studio资产类型完整由`KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`继承，KAD3只为Owner提供可读聚合分类，不改asset_kind或造13张表。

## 3. 统一AdminAuthorizedItemViewV1（设计视图，不声称数据库已具备）

最小输出：

```
item_key                  ← 唯一视图key，精确绑定不可变来源
origin_kind               ← L0..L5 / studio_revision / work_revision
artifact_ref,revision_id  ← 有源真实版本；缺时标unknown，不造UUID
asset_kind, epistemic_class
human_title, summary, excerpt_if_rights_allow, significance, everyday_connection
period{original,normalized_range,precision,uncertainty}, geography{historical_name,modern_hint,precision,geometry_status}
source_refs[{source_id,source_version,carrier_id,locator_type,locator,availability}]
claims_and_counterclaims[{claim_ref,polarity,scope,voice,source_lineage}]
relations[{relation_type,target_ref,target_rev,confidence_basis}]
contribution[{root_task_id,subtask_id,actor_kind,executor_ref,receipt_ref,operation,accepted_at}]
use_history[{project_ref,asset_ref@rev,use_kind,use_time,permission_decision}]
qualification{G0..G5 refs,purpose,scope,consumer,action,policy_version,checked_at}
rights{read,quote,display,derive,share,export,external_transfer,expiry,reason}
work_state / content_state / access_state / freshness_state (independent)
gaps[{D00|D01|D02|D03|D04|D05,reason_code,impacted_refs,next_evidence_request}]
authorised_actions[],project_scope,generated_at,view_version,denied_fields[]
```

规则：不允许一条目录行提供`qualified:true`这种缺用途的布尔值；页面把资格翻译成“仅内部研究可用 / 可公开引用 / 需要补证 / 不可使用”等人类语言，展开才能看到限定资格细节。`unknown`、`unavailable`、`forbidden`、`empty`、`error`互不等价。服务只返回授权字段，前端不是安全边界。并发/分页/筛选按受授权对象查，不通过全表读取后浏览器过滤。已撤权资源的`excerpt`和媒体预览不能因为历史版本存在而重现。

## 4. Admin六工作视图与关键交互

| 工作面 | Owner必须能回答的真实问题 | 输入/交互 | 结果/失败 |
|---|---|---|---|
| A 总览（不是纯KPI） | 在研究什么？增加了哪些有价值的知识？卡在哪里？ | 主题覆盖、最新有效资产、研究项目、待补证和方向决策 | 数字均能点击到具体条目；后端不可达显示错误而不是0 |
| B 知识目录 | 我们积累了哪些史料/人物/地点/关系/发现？ | 全文关键字、类别、时期、地点、课题、认识身份、G/权利/新鲜度筛选 | 每行显示人文标题+摘要+来源/时空+可用性；无权条目不可窥探 |
| C 条目详情 | 它说了什么、为什么重要、依据什么、与生活有什么联系？ | 摘要、原文定位、支持/反证、关系、修订、权利、引用及贡献逐标签查看 | 精确`asset@rev`往返；无原文只显示线索，不生成演示“原文” |
| D 研究项目 | 墨痕Agent和外部AI分别贡献了什么、谁还在研究？ | root→子任务→回执→候选接收→D/G→知识/作品，显示实际状态与下一步 | 无执行回执时写“未接线/人工受理”，不显示伪实时进度 |
| E 缺口/待办 | D00只取得书目还是全文？D01哪一页读不了？D02哪里解释冲突？ | 失败原因/阶段/影响对象/补证建议；仅Owner决策项可提交 | 技术OCR/SQL/G资格交专业角色，不要求Owner手工签G |
| F 复用与影响 | 第二项研究继承哪一版、增加什么新的关系或发现？ | 精确引用、使用课题、增量分类、新旧修订差异、来源变更影响 | “同文再摘要”不得当新增知识；未授权跨题复用HOLD |

**关键动作**：`OpenItem(ref@rev)`、`SearchAuthorizedCatalog`、`OpenSourceLocator`、`InspectProvenance`、`InspectContribution`、`InspectRevisions`、`InspectUseHistory`、`RequestEvidenceWork`、`SetOwnerResearchPriority`、`OpenRelatedStudioTask`。最后两项是有界业务选择，**不是**史学审核/数据库编辑/外部源发送授权。任务创建前要分别验证角色、项目及费用授权，UI表达不等于已派工成功。

### 4.1 可解释增长口径

至少拆分`new_source_obtained`（已取得不是仅命中）、`new_read_unit`（可定位）、`new_material_observation`（证据候选）、`new_world_claim_qualified`、`new_humanistic_finding_qualified`、`new_research_link`（明确带版引用）、`new_studio_work_revision`（表达成果）。统计按稳定ref+revision+事件去重；`new_relation`与`new_insight`必须来源于新增有据主张或新增有界比较，不从Agent字数推算。“项目有产出”不自动等于“知识世界有增长”。

### 4.2 来源健康与知识来源缺口不混同

API HTTP 200只能说明探测成功；某书只有书目、某扫描件OCR失败、某事件多份史料同源转引，都是独立D00/01/02缺口。每一缺口必须锚定`project + affected_asset@rev + D_stage + reason + needed_evidence + owner_for_next_action`，且能跳到相关原件或明确“尚无原件”。

## 5. 可读权限与Owner可作的决定

| 主体/上下文 | 可读与可作 | 强制拒绝 |
|---|---|---|
| Owner/Operator（Admin） | 授权项目的条目、增长与缺口，可改研究方向优先级/请求补证/审核作品出版（按既有operator角色） | 不可直接改L3/L4 Truth、批准G、提升版权许可、越过项目范围 |
| Creator（Studio） | 自己项目的合法候选/研究资产、草稿、受控补证申请 | 不可用Admin运营身份看别人的私有项目或代签G |
| 独立G Reviewer | 按任命政策访问应审查的G候选与证据，正式签发/拒绝/撤权 | Admin作品审核不自动获得其权限；Reviewer不自动获Operator权限 |
| Agent/外部AI | 仅当前委托scope、项目ACL、action和预算，输出候选/回执 | 禁止带DB管理密钥、批量读私人项目、直接写G或发布 |
| 公众 WATCH | 唯一已发布`WorkRevision@rev`及当前允许的知识L5/媒体分面 | 无G5/撤权/到期/私有草稿/不允许的媒体不给公开访问 |

专用业务错误语义：`AUTH_DENIED`、`ITEM_NOT_FOUND`（对无权也可用于防枚举）、`PROJECT_SCOPE_DENIED`、`REVISION_NOT_FOUND`、`SOURCE_BIBLIOGRAPHY_ONLY`、`LOCATOR_UNAVAILABLE`、`READING_UNVERIFIED`、`SOURCE_DEPENDENCY_UNRESOLVED`、`EVIDENCE_CONFLICT`、`GATE_NOT_VALID`、`RIGHTS_FOR_ACTION_MISSING`、`EXTERNAL_TRANSFER_NOT_ALLOWED`、`DATA_UNAVAILABLE`、`VERSION_CONFLICT`、`TASK_NOT_EXECUTED`、`DELEGATION_RECEIPT_MISSING`、`REUSE_NOT_AUTHORIZED`、`STALE_DEPENDENCY`、`PUBLIC_SNAPSHOT_REVOKED`。这些是设计语义而不是现行HTTP实现的已证枚举；后续逐条对照旧API并保持兼容。

## 6. 轻量WATCH复用：既有图文阅读优先

**唯一必要结果**：从Studio `WorkRevision@rev` 经Operator审批、当前知识资格与权利检查形成合法`PublicationSnapshot@rev`与published pointer；WATCH读取同一版本的标题、简介、章节/旁白文字、合法图文/必要时空表达和引用来源。它不另建作品数据库，不单独生成新史学解释或复杂沉浸场景。现有`WatchGallery.tsx`图文阅读、加载失败/真空、章节切换可保留；“自动翻页”不能描述成真实音视频播放。

**消费者判定顺序（每次公开响应/缓存命中都成立）**：合法published pointer→精确WorkRevision@rev→Operator审批与当前作品可见状态→所用知识引用的当前独立G5/用途/范围/consumer/action→媒体权利（展示/改绘/下载区分）与失效闭包→按合法分面返回。内部Studio草稿可保存预览，但无任何默认公开权。

**最小观看字段**：`work_id,revision_id,published_pointer_version,title,description,chapters[{beat_id,title,narration,text_or_media_refs,source_ref@rev,qual_status}],rights_filtered_assets,citation_items[{source/edition/locator,usage}],reading_state,error_state,last_checked_at`。不可得到有权引用时显示“此处资料暂不可展示”而不是编造引文；删除/撤权仅影响相关分面，合规正文可继续阅读。知识引用无有效Gate而构成不可分割的主要叙事事实时，阻断该章节或整作品，不能只藏小标签。

**现有路由复用优先表**：`/api/works/published`（WATCH现有实际请求）、`/api/public/works`、`/api/public/works/:id`、`/api/public/works/:id/eligibility`、`apps/web/lib/publication.ts::listPublished`、`/api/admin/submissions/:id/decision`。这些存在不证明真实全链消费守卫；如两套目录API重复，应在KAD4做一套底层资格服务复用，不扩展双真值API。

**轻量范围明确排除**：新播放器、自动配音/视频、全五图152动作再设计、EXP深探索、另一条发布审查链、新的知识模型/13表。

## 7. KAD2→Admin→WATCH正反映射

| KAD2身份与业务事件 | Admin正向消费者 | 反向必须能追溯 | WATCH是否消费 |
|---|---|---|---|
| `root_task_id/subtask_id/delegation_id/execution_receipt` | D研究任务，贡献列表 | 实际executor/input/output、成本未知标unknown、受托权利 | 不消费技术日志 |
| `source_candidate/source_version/rights` | B/C/E来源/缺口 | D00取得范围、版本/馆藏、原件锚点、权限 | 仅合法引用文本/展示片段 |
| `read_unit@rev/material_observation@rev` | C原件与证据 | D01方法/页区、D02声音/转引/反证 | 必要时按需合法出处 |
| `L3/L4@rev + independent_G` | B/C/F合格世界与人文发现 | 用途/范围/消费者/政策/失效 | 仅现行有效L5派生分面 |
| `StudioAssetRevision@rev` | B/C/F工作资产与关联 | 五谓词、依赖/修订、项目/同意 | 不消费内部未获发布资格候选 |
| `DirectorPlan/WorkRevision@rev` | C/D作品与导演修订 | H1/H2/H3、工作源引用、受权媒体 | 发布后按版本消费 |
| `PublicationSnapshot@rev + pointer` | F与作品管理 | Operator决议和资格/版权当前快照 | 公开读同一准确版本 |
| `use_history/next_task_root` | F复用与知识增长 | 旧资产身份+新关系/证据增量 | 不因复用自动创建公开作品 |

## 8. 接口与数据最小增量责任（待KAD4精确物理核验）

**优先复用已有服务，不在KAD3发明正式API路径。** 业务调用语义可映射现有AdminWorkbench、read-model-bridge、Studio研究/来源读取、现有`publication`读/审和KAD2混合receipt。建议KAD4按如下能力逐项检查有无等价实现：

1. `ListAuthorizedKnowledgeItems(filters,cursor,project_scope)`：可分页的授权目录投影、明确来源类型/多态身份。
2. `GetAuthorizedKnowledgeItem(item_ref,revision)`：条目详情、`source locator`、rights、G资格、关系、已授权复用历史。
3. `GetResearchContribution(root_task_id)`：由受信事件/回执构建内外贡献；没有回执不凭描述拼接。
4. `ListResearchGaps(project,stage)`：按D00—D02和实际资料缺口归并、指向原文/失败原因。
5. `RecordOwnerDirection(project,priority,comment,expected_rev)`与`RequestEvidenceFollowup`：Owner仅能调整研究方向或发起请求，不能自签G或调用任意Tool。
6. `ListPublicWorks/GetPublicWork`：所有公开路径共享一套用途/版权/当前G5顾问能力，旧合法数据兼容过渡。

物理设计优先**受控读视图/服务组合**，对旧已存在的`source/evidence/world/meaning/read_model/control`和`public.research_tasks/imported_materials`按需关联，不先新建总表，不让`public.assets`图片账冒充13类资产；需要长期Studio修订/receipt时由KAD4依据实际DDL最小修订。不得将目录缓存作为资格权威。

## 9. 样本原型与验收

唯一交互文件：`KAD3_Admin知识资产管理_可交互原型_现行.html`，包含可点击总览→目录→详情→证据/关联/版本/权利/贡献→任务缺口/Owner方向→复用→轻量WATCH的路径。**数据全部合成、操作仅在浏览器内模拟，不接GitHub、Supabase或模型；UI不得出现真实知识已资格批准的暗示。** 可以验收视觉/交互是否使Owner看清内容与决策，但不等于真实系统实现。

KAD3正反测试矩阵（同目录CSV）覆盖目录与详情、原件限制、跨项目、D00—D02差异、独立Gate、三状态机、13资产映射、作品修订/pointer、撤权、重复API、故障空态、双题增长及Owner操作。**本轮实际运行测试状态全部`NOT_RUN`，交互原型静态校验另列本地结果。**

### 9.1 专业设计准出规则

1. 可从具体历史人文对象及资料出发完成目录→详情→原件/证据/关联→复用，不以统计代替内容；
2. 能从混合任务逐项返查KAD2受托ID/回执、D阶段缺口、研究价值及下一步；
3. Owner仅评审方向/内容/体验，不能在UI直接作独立G、版权或SQL操作；
4. WATCH全链复用与合法失败语义自足、尊重旧真实代码；
5. 新旧设计层、真实代码/数据库/发布验证各自显性记录；全部重要业务动作具名正反用例且可反向追源；
6. 仅设计/模拟完成可判`KAD3_DESIGN_EXIT_PASS`，但`KAD3_OWNER_EXPERIENCE_HOLD`与`KAD4_5_RUNTIME_HOLD`另列。

## 10. 阶段未验证事实（不倒逼重开KAD1）

- 真实Admin能否查齐每一类授权L0—L4、13资产、具体来源/版本/定位、混合root/receipt，以及跨项目复用真实写入，需KAD4/5受控验证。
- GitHub active仍是旧C入口；Library的MHKA/KAD1目标规范没有因此自动生效。最新main的权限/迁移/接口以工程施工前再锁SHA、做实际SQL角色/访问/部署验证为准。
- WATCH实际已发布的历史作品能否逐段按当前有效G5/consumer/purpose/rights过滤，当前代码静态证据**不足**，归KAD4/5测试责任。
- 原型中的资料和事件仅示范交互，不代表真实苏州河历史知识已完成考证。两题真实复用仍按KAD5。
