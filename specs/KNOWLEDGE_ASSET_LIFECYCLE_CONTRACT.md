# 墨痕知识资产生命周期、混合研究与作品原子提交合同

> 设计镜像声明：本文件是可交付的**完整目标规范正文**，仅当经Owner授权的工程原子切换及测试通过后在仓库生效。Library状态不等于GitHub/生产已生效；任何未授权操作继续HOLD。

**责任边界：** MHKA-03唯一拥有资产/资格语义；`specs/DATA_CONTRACT.md`负责原D/L/G核心逻辑数据；本文件负责13资产、不可变修订、跨研究复用及Studio/Admin/WATCH资产转换；物理表DDL/RLS在PERSISTENCE_BINDING/SECURITY及实际迁移中实现。

## 0｜应用原则与冲突裁决

1. 原有 **D00—D05/L0—L5/G0—G5** 是唯一正式历史文化知识生产链，专业阶段责任不可由 Studio/Agent/外部 AI 取代。外部 AI 的候选应进受控 D00/D01/D02/...请求；Agent 可以编排、补证、继续创作，不能直接签 G0—G5。
2. 本合同重塑 R4.3 的对象是**知识资产长期积累、跨研究与作品复用、Studio 工作资产/正式知识/作品之间的版本、来源、权限和转换**；它不重新定义六阶段专业方法，也不改变独立 Gate 策略。
3. 各条款发生冲突时按 MHKA 唯一语义Owner决议修正正文，不以旧期历史措辞反向覆盖新章程。旧文件的“2026-10-25源码已核”是**历史证据级别**，任何当前运行断言以2026-11-01以后的明确SHA、部署、SQL和测试为准。
4. 与旧 R4.3 不等价的变更包括：本轮起即内外 AI 混合协作而非先外部后内部；Studio 是本轮必须可用生产空间；Admin 是本轮可读知识资产控制台；WATCH 为作品轻消费；EXP 延后。这是目标与执行次序修订，不允许借此删掉旧13资产、16+7反例和历史专用合约。
5. 下列条款为本轮专业合同的设计级规范；**未被Codex/真实数据库受控启用之前，不是已激活的生产指令**。

## 1｜范围与对象：三类资产、13个类型、三种资格绝不混同

- **正式知识对象**：L0来源（D00）、L1载体读取（D01）、L2证据理解（D02）、L3历史世界（D03）、L4人文发现（D04）、L5合法消费者分面（D05）。以原D/G产生的 `artifact_ref@revision` 与独立有效资格为主。
- **Studio研究/创作资产**：按原 R4.3 §3 的13类 `asset_kind`（不是13张新表）持有 `asset_id + revision_id`，可包括假说、资料、笔记、分镜和引用，但未获得独立 G 资格的条目不能直接当历史事实公开使用。
- **作品/表达资产**：`WorkRevision`、`DirectorPlan`、`PublicationSnapshot` 和合法 WATCH 消费；作品编辑/运营通过 ≠ 史学 G PASS；媒体版权展示许可另计。

13类资产完整类型列表：`research_brief / source_anchor / reading_note / evidence_note / spacetime_candidate / relation_hypothesis / humanistic_insight / research_collection / director_plan / media_selection / work_revision / citation_snapshot / consented_feedback`。各类型的完整字段、合法 L 引用、禁止事项由本合同§10/§16独立定义；KAD1 逐条物理对应 `existing/adapt/new/blocked`，特别禁止把旧 `public.assets` 图片账本误判为全部研究资产承载。

必须区分：`saved`、`reuse_ready_for_research`、`valid_gate_qualification_for_purpose`、`editorial_publication_approved`、`rights_permitted_for_action` 五个独立谓词。Admin 仅翻译这些状态给用户，不能点“已完成”后修改史学资格。

## 2｜不可变资产修订与可追溯关系

承接旧 R4.3 §4 `StudioAssetRevision` 原始字段全集：稳定ID、rev序号、supersedes、project/workspace/actor、content_hash/payload_ref、origin/认识类型、来源与L refs、dependency_refs、rights、access/consent、生命周期、限制、validation、idempotency_key/correlation_id。任何修改生成新修订，乐观锁冲突不得覆盖旧版；来源/书影/地图的 locator 必须能回到原文页/图幅/版次或明确标不可定位。对外部 AI 增补 `delegation_id/subtask_id/executor_kind/provider/model_version/tool_version/input_refs/output_receipt` 的可空且明确来源的元数据，不可从旧结果凭空补值。

长期身份应与暂存run解耦；旧 `research_run` 关联表含删除级联风险，未经隔离不可充当永久研究知识资产主库。原来的“Promoted”应是 `studio_candidate_rev → production_request_ref → qualified_L_ref@rev` 的可追证派生关系，不是改候选的状态字段。

## 3｜本轮内外双主体协作、D00—D02强约束

墨痕 Agent 从**首个课题**就须参与：合法旧资产检索、任务理解/拆解、内外分工、受控请求、外部回执/原件与证据比对、研究资产归档、复用建议、Studio导演编排；外部 AI 负责授权的来源发现、载体 OCR/VLM、复杂史料解读及适合的创作部分。**真实运行中缺能力时标HOLD和必要人工接收，不伪称Agent已自主调度。**

统一委托：`root_task_id, subtask_id, delegation_id, requester, executor, target_D_stage, input_asset_refs@[revision], research_question, temporal_scope, spatial_scope, allowed_sources, rights_transfer, budget_limit, outputs, deadline_or_stop, expected_schema_version, idempotency_key`。外部执行者仅在授权 scope 获得资料，不能持生产数据库超级凭据或独立 Gate 签发凭据。

统一成果：`execution_receipt, source_candidates, source_versions_and_locators, read_units_and_uncertainty, material_understanding_candidates, historical_claim_candidates, insight_candidates, creative_candidates, provenance, rights, files_hashes, failures, blocked_refs, cost_if_known`。导入首先获得稳定**候选**身份；必须经过字段格式、权利、来源身份、引用真实存在、同源转引、幂等去重和项目ACL检查；对接原 D/G 请求经专用 Production Tool/Adapter，而非外部结果直接插入 `world.* / meaning.* / control.gate_audits`。

**D00** 必须区分 `bibliography_only/excerpt/full_text/scan/restricted/unavailable`，书目数量不算原文取得。**D01** 读取必须保存可返演的 `source_version + page/region + method + 原文/识读候选+不确定性`；云端OCR/VLM失败不能伪造内容。**D02** 必须区分原文/转引/模型解释/推断，核对时地语义、证据声音、同源/反证与 H01—H25 材料类型。后续正式 D03—D05沿原链和独立G控制，不重写。

## 4｜研究资产、正式知识、作品的独立状态机与权利

研究/创作：`WORKING → SNAPSHOTTED → REUSE_READY`，以及 `STALE / ACCESS_RESTRICTED / ARCHIVED`；保留内容、访问、新鲜度三个独立子状态；跨项目使用需重新核授权。

正式知识：`candidate_rev + bound_request → existing D00…D05 → G0…G5 → qualified ref / HOLD / REJECT / REVOKED`。必须按 `purpose / scope / consumer / action / policy_version / revision` 检查，每次重新消费查资格当前有效性。

作品：`DRAFT → SUBMITTED → CHANGES_REQUESTED | APPROVED → PUBLISHED → SUSPENDED | WITHDRAWN`；运营编辑决定不构成知识G资格，WATCH不使用未发布作品作公开内容。媒资复制、改绘、公开展示、下载的权利分别校验，权利不明只允许受限目录/内部研究用途。

## 5｜统一存储、查询和最小服务组

正式知识尽可能复用 `source/evidence/world/meaning/read_model/control`，原件及大型文件使用权限管理的对象存储，DB保存不可变ID/ref、哈希、引用位置和权利元数据；Studio工作资产复用已有 `research_*`、研究任务及作品表，补充缺少的稳定修订/长期保存/权限/依赖时优先 `ADAPT`，不先要求固定新表数量。

保留原 R4.3 §6/8 的 `StudioResearchRead` 项目授权跨L读取与8类服务合同：`CreateAsset/SaveRevision`、`AttachReference/ResolveReferences`、`SearchStudioAndL`、`ForkAssetForProject`、`RequestFormalProduction`、`CreateWorkRevision/SubmitWork`、`EditorialPublish/WithdrawWork`、`ApplyInvalidation/Revalidate`。新增的混合调度任务/成果接收可以**扩展**现有工程 API 或Adapter，不先发明平行后端；每个接口须给出写副作用、ACL、幂等、失败码及正反测试。公众消费 API 与项目内 StudioResearchRead 权限隔离，不能把公众L5接口变成底层无限读取。

作品/知识来源变更要沿 `Studio asset ↔ immutable L ref ↔ Studio work ↔ PublicationSnapshot` 精确计算失效；P08 Guard 阻断优先，已发布无关内容保持；缓存、下线、回滚和重审都有审计，不因旧合法快照恢复撤权许可。

## 6｜Studio、Admin、WATCH 的本轮契约与可读验收

**Studio**：真实研究委托、旧资产检索、混合分工、D00来源/原件与D01读取/D02理解、H1/H2/H3导演、可见作品、局部修改/保存/恢复；两种产物并行形成：知识工作资产和作品草稿。一个完成的回答不能等于完整生产。

**Admin**：读懂某条历史知识是什么、为什么重要、来源在哪、属于原件/主张/假说/人文发现哪个类别、认识状态与权利、关联人物/地点/事件、被什么研究复用、缺哪个D阶段的证据/读取、谁正在研究、下一步要什么。支持检索/条目详情/时空主题覆盖/来源健康/任务与贡献/Owner真正需要的方向决策；技术SQL/独立G审查由受权者处理。

**WATCH**：轻量阅读 Studio 同一合法已发布 `WorkRevision` 的人文成果、图文/必要时空线索及出处；仅保持失败/空态/权限与撤权守卫，不另造作品资产。**EXP**：暂缓，保留既有长期语义和代码。

## 7｜X1原子保存、作品出版和撤权必须原意继承

原R4.3 §14的五个不可混同对象 `Delegation@rev`、`StudioResearchPacket@rev`、`DirectorPlan@rev`、`WorkRevision@rev`、`PublicationSnapshot@rev` 必须保留；`CommitWorkRevision`以期望revision+hash+幂等键原子提交、`SubmitForOperatorReview`精确提交、`Publish`使用CAS别名指向经过合格资格/版权/运营审查的修订。发布失败不能破坏旧合法版；研究修订触发依赖 `STALE`；撤权优先于缓存。具体断言由本合同§7/§11/§13/§16/§17定义并在新源码逐项映射。新的本轮轻量 WATCH 不得删掉已发布内容的实际资格检查。

## 8｜完整旧合同覆盖、移交及准出

本合同须覆盖旧R4.3 §1—14的逐条正反规则核查；13资产类型各有生命周期/存储/权利；16个旧AT场景、7个X1原子反例逐条绑定新服务、测试、当前实现证据和修订状态。当前已形成设计级条款映射和原编号测试规范；**真实工程实现、数据库权限、独立Gate投运与端到端测试仍为HOLD**。KAD1审查时按 MHKA 的唯一责任原位增补与上位一致性修订，旧历史状态和遗留编号按新工程版本做引用映射，不因文字继承即认定旧功能真实可用。

**不准通过的情形：** 旧R4.3缺失、正式知识被Studio/外部AI直写、工作资产因run删除丢失、同源转引冒多来源、只有书目却标全本史料、OCR无原图定位、G签发和作品审核共用角色、Admin只给数字/SQL、作品发布依赖过期权利、没有真实内外双主体任务回执却宣称混合自驱成熟。

---

## 9｜R4.3 §1—14 全条款继承与唯一Owner合同

本节属于可执行设计级继承，不是重新发明史学标准。原文§1—14单独保留为历史证据；新合同以本文件§0—17及KAD1-A/B/C/D的独立规则完整执行，GitHub实现状态单独标记。旧编号仅作为证据追溯ID，不是第二规范。

| 原节 | 规范责任 | 唯一Owner | 新架构合同详细执行位置 | 设计状态 |
|---|---|---|---|---|
| R4.3 §1 | 候选可保存但不能自动升G | MHKA-03 03§3 | KAD1§1/§9，来源R4.3 §1 | `INHERITED_DESIGN` |
| R4.3 §2 | 实际仓库/DB与旧2026-10-25快照隔离 | MHKA-05 05§2/§9 | KAD1§14，来源R4.3 §2 | `INHERITED_DESIGN` |
| R4.3 §3 | 类型可追踪但不得机械增加13表 | MHKA-03 03§3 | KAD1§1/§10，来源R4.3 §3 | `INHERITED_DESIGN` |
| R4.3 §4 | 资产ID+不可变rev/hash/依赖/权限/幂等 | MHKA-03 03§3 | KAD1§2/§11，来源R4.3 §4 | `INHERITED_DESIGN` |
| R4.3 §5 | 编辑复用、G资格、出版审核互不推导 | MHKA-03 03§3/§5 | KAD1§4/§11，来源R4.3 §5 | `INHERITED_DESIGN` |
| R4.3 §6 | 项目级ACL+purpose/consumer/action；不复用公开L5穿透 | MHKA-05 05§3/§5 | KAD1§5/§12，来源R4.3 §6 | `INHERITED_DESIGN` |
| R4.3 §7 | 只能发D/G请求，不能直接写正式world/G | MHKA-04 04§2/§4/§8 | KAD1§3/§12，来源R4.3 §7 | `INHERITED_DESIGN` |
| R4.3 §8 | 逐接口角色、读写副作用、幂等失败和测试 | MHKA-05 05§2/§3 | KAD1§5/§12，来源R4.3 §8 | `INHERITED_DESIGN` |
| R4.3 §9 | unknown_dependency禁止当安全；先阻断 | MHKA-03 03§7 | KAD1§4/§12，来源R4.3 §9 | `INHERITED_DESIGN` |
| R4.3 §10 | 普通浏览非文化贡献；撤回即失效 | MHKA-03 03§3/§7 | KAD1§10，来源R4.3 §10 | `INHERITED_DESIGN` |
| R4.3 §11 | 保留16正反场景独立编号/预期断言 | MHKA-05 05§9 | KAD1§13，来源R4.3 §11 | `INHERITED_DESIGN` |
| R4.3 §12 | 不替换正式生产库、备份合法回滚 | MHKA-05 05§6/§9/§10 | KAD1§14，来源R4.3 §12 | `INHERITED_DESIGN` |
| R4.3 §13 | KAD1设计与E1/E2运行证据分开 | MHKA-00 00§5/§6 | KAD1§14，来源R4.3 §13 | `INHERITED_DESIGN` |
| R4.3 §14 | 五类对象；CAS；A01—A07保全 | MHKA-03 03§3/§7 | KAD1§7/§13，来源R4.3 §14 | `INHERITED_DESIGN` |

兼容性裁决：①任何正式知识的来源/解释与资格保留原D/L/G；②作品审核、研究资产存储、公开用途和媒资权利互不等价；③旧R4.3中历史R5/E1及2026-10-25静态源码描述只作为旧期证据，工程执行走本轮K3/KAD4/KAD5及正式授权。

## 10｜13资产类型：身份、知识意义、永久存储与消费约束

十三种为原`asset_kind`语义集合，并非数据库迁移脚本或独立知识真值库。每个条目最小包含：`asset_id,revision_id,revision_no,project_id,owner_actor_id,epistemic_class,content_hash,payload_ref,source_version/locator,dependency_refs,rights{action/expiry},access,created_at,idempotency_key`；缺某个来源/权利字段时标`unknown/restricted`，不填虚假默认；旧知识修订保留、当前资格每次读前重新核查。跨工作区`Fork`不继承源项目授权。

| 资产类型 | 原始锚点与强制差异 | 允许用途与反例 |
|---|---|---|
| `research_brief` | 问题/范围/作者/目的 | 问题/范围/作者/目的；编辑态非史实 |
| `source_anchor` | L0源版本/原件页码/持有与再分发权分别核 | L0源版本/原件页码/持有与再分发权分别核 |
| `reading_note` | L1 read_unit+页/图幅+识读限制 | L1 read_unit+页/图幅+识读限制；不更改正式L1 |
| `evidence_note` | L2原句/定位/声音/矛盾 | L2原句/定位/声音/矛盾；未经G不得公称史实 |
| `spacetime_candidate` | 原纪年/精度/地名/推断，地图几何非事实 | 原纪年/精度/地名/推断，地图几何非事实 |
| `relation_hypothesis` | 主客谓词/同源/反证 | 主客谓词/同源/反证；未G3不得事实化 |
| `humanistic_insight` | L4比较/当下连接/反观点 | L4比较/当下连接/反观点；编辑选择非G4 |
| `research_collection` | 跨L引用索引，不复制或批量晋级子项资格 | 跨L引用索引，不复制或批量晋级子项资格 |
| `director_plan` | H1/H2/H3来源/导演选择/节拍/合法参考 | H1/H2/H3来源/导演选择/节拍/合法参考 |
| `media_selection` | 媒体动作级展示/改编/下载/期限/署名 | 媒体动作级展示/改编/下载/期限/署名 |
| `work_revision` | 稳定作品版本/原子修订，发布独立 | 稳定作品版本/原子修订，发布独立 |
| `citation_snapshot` | 当时资格快照不抵当前用途/权利实时复核 | 当时资格快照不抵当前用途/权利实时复核 |
| `consented_feedback` | 仅主动同意/可撤销 | 仅主动同意/可撤销；回D00调查不直接事实化 |

**特别规则：** `work_draft`是原名称，现行语义名称为`work_revision`，仅保留旧别名迁移索引；`public.assets`原图像台账不自动等于13种Studio资产库。`research_run`级联删除不能破坏不可变长期研究与作品依赖；恢复必须真实测试。详细类型与校验合同见本合同§16；原技术稿只用来审计来源和差异。

## 11｜版本、权限、状态、资格和最小事务不变量

- **保存**：`SaveRevision`需校验`expected_revision_id`、`idempotency_key`、内容hash、project/member权限；同一幂等键同一内容最多一个rev，冲突返回`VERSION_CONFLICT`，不能原地改旧rev。
- **三维状态**：工作资产`content_state/access_state/freshness_state`各自记录；`REUSE_READY`只为合法研究复用；正式知识资格由独立G0—G5独占，作品版本由独立运营审核，并另验媒体展示/修改/分发动作授权。
- **跨L读取**：`StudioResearchRead`只可通过后端按用户/项目/层级/资料/动作/用途和`policy_version`裁剪返回，拒绝/脱敏内容留审计，不给浏览器原件存储密钥。普通WATCH/EXP只访问原G5合格且对应消费者、用途当前有效的L5分面。
- **变更与撤权**：`source_version/rights/G policy/L rev`变化按依赖闭包计算影响对象；依赖未知/无法访问则`BLOCKED`，先守卫再异步重审，历史快照不能复活撤销权利；不得因媒体撤销而无依据清空无关知识。
- **X1五实体**：`Delegation@rev`, `StudioResearchPacket@rev`, `DirectorPlan@rev`, `WorkRevision@rev`, `PublicationSnapshot@rev`身份分离；CAS发布只指向批准且当下合法的不可变WorkRevision；新版本失败不破坏旧合法发布指针。

## 12｜跨域服务、生产交接与内外AI受托的强制响应

| 接口族/节点 | 授权主体及必须输入 | 必须输出与关键失败 | 原领域契约 |
|---|---|---|---|
| `CreateAsset/SaveRevision` | Creator/Agent受控项目、expected_rev、hash、idem | 新asset/rev、审计；CAS或ACL错拒绝 | R4.3 §8，05物理 |
| `AttachReference/ResolveReferences` | 项目+精确L@rev+locator+用途 | 引用身份与有效权利/资格；未知`UNVERIFIED_REF` | R4.3 §6/8 |
| `SearchStudioAndL` | 有项目和读动作授权的Studio研究者、layers、policy | 最小AuthorizedResearchView、拒绝清单与audit；不能用公众接口穿透 | R4.3 §6/8 |
| `ForkAssetForProject` | 源授权+目标项目主体 | 新身份/依赖、不得继承旧许可；无权拒绝 | R4.3 §8 |
| `RequestFormalProduction` | `asset@rev`+source/rights+target purpose+预算 | `directed_production_request`及run/Stage回执，绝不直接G PASS | R4.3 §7、R4.4 |
| `CreateWorkRevision/SubmitWork` | Creator/Agent草稿+DirectorPlan/证据/媒体+expected_rev | 原子稿件修订与提交快照；G HOLD不能公开 | R4.3 §8/14、R4.5 |
| `EditorialPublish/WithdrawWork` | 有权Operator+审核+当前G/rights | CAS合法发布指针/撤销；未审核/失权阻断 | R4.3 §14、MHKA-02 |
| `ApplyInvalidation/Revalidate` | 受控安全/Reviewer+撤权因果+版本 | 精确消费者集合或依赖未知BLOCKED、审计、缓存失效 | R4.3 §9、P08 |
| `DelegateExternal/ReceiveCandidate` | 受控Agent+root/subtask+provider/model/tool_version+范围与许可+预算/时限 | 受托执行回执、raw来源/读取定位、失败、费用、资产候选、去重；无授权拒绝 | R4.7、CAP-D01/02 |

**D00—D05进出责任不可改义：** D00 `source_version+rights+acquired_kind`，D01 `read_unit+raw_locator+method+uncertainty`，D02 `evidence+speaker/temporal_scope+source_lineage`，D03 `entity/event/relation/spacetime`，D04 `finding/present_connection`，D05 `qualified_consumer_projection+invalidation`。从候选到正式层必须走原有D00—D05专业Stage及G0—G5独立审核，不以AI子任务代签。上游G HOLD时，Studio可保存标识清楚的草稿；不得替代公开事实资格。各Stage的可执行新架构规则在本代生产协议及Gate机器合同中明确；旧P0—P5、C/H/W/A/P用于历史来源与差异审计。

**H/I消费边界（完整执行见本代`specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md`）：** H1负责五母题每母题九项叙事约束；H2七项导演选择；H3负责二者协同、节拍和验证；I/19组件仅消费，不反向改写历史认知。Studio导演的每个实质事实/画面/时序选择必须能反查合法来源、选择理由、对应版本或明确`editorial/hypothesis`，并允许定向差异修改。

## 13｜完整23项独立正反验收合同（源编号不改）

原`R4.3 §11 AT-01—16`与`§14.3 A01—A07`为**设计级必测**；本节给出最小可观测断言，KAD4编制可执行夹具、KAD5用真实课题测试。当前`DESIGN_ONLY / NOT_RUN`，不得写PASS。

| 原测试ID | 操作与预期结果（测试谓词） | 责任面 | 真实状态 |
|---|---|---|---|
| AT-01 | 并发保存+相同幂等键不得覆盖旧revision | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-02 | 项目内L0—L4合法读与对公众入口隔离 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-03 | 纯editorial导演无源可存但不变史实 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-04 | 同源转引关系仅hypothesis | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-05 | 请求正式生产不生成G PASS | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-06 | G2 HOLD允许草稿但禁止无资格公开 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-07 | consumer/purpose/action不跨权利传播 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-08 | 媒体到期精确局部撤权并清缓存 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-09 | 历史ref旧rev触发重审且不复活资格 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-10 | 作者不得自签G和出版 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-11 | 普通浏览不同意反馈不可入文化资产 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-12 | 研究run删除长期版本仍可恢复 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-13 | 旧N桥候选不可绕过D/G | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-14 | 假说与许可媒体不传递对方资格 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-15 | rights unclear只许受限目录/研究 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| AT-16 | 依赖未知BLOCKED，空集合不等于安全 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| A01 | 同一幂等键并发仅一WorkRevision | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| A02 | 过期expected_rev不能覆盖当前稿 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| A03 | 研究包修订令导演分支STALE | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| A04 | 无display权不可将原件送WATCH/EXP | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| A05 | 未通过运营审核不能切发布别名 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| A06 | 发布失败不得破坏旧合法版 | KAD4/05实现，KAD5运行 | `NOT_RUN` |
| A07 | 撤权即时阻断包括离线缓存 | KAD4/05实现，KAD5运行 | `NOT_RUN` |

这些断言均不由本次静态检查代签。新增的内外协同、D00书目误判、D01 OCR无定位、D02同源转引/记载时代混淆、Admin单条知识与WATCH同版本消费等反例，属于KAD2—KAD5增量验收，不覆盖原23项编号。

## 14｜工程复用、真实状态与最小增量阻断

1. 既有`source/evidence/world/meaning/read_model/control`数据和D Stage/Registry/P08/Agent/Studio优先REUSE，唯一的工程真相以锁定SHA和实际数据库验证为准；不创建与正式L层竞争的Knowledge Truth库。R4.3长期Studio存储如当前代码不可保障不可变修订，则在KAD4以最小增量ADAPT。
2. 外部AI交接不能将未经独立G审定的候选直接写正式world/meaning/qualification；来源许可未知时不设为`clear`。当前Studio导入来源在源码曾出现`rights_clear=clear`默认以及Admin G5汇总代替条目管理，两者属于**待KAD4实码和KAD3体验整改的已定位风险，不是已修复**。
3. `AGENTS.md`旧C0—C4仍active；MHKA六章和本合同是Library设计权威，不得因本轮文档修订宣称GitHub已激活。真实DB独立G reviewer/policy/迁移执行与SEC-01 RLS、手工/外部成果上传权利、长期资产恢复均待受控验证；无授权不得写生产库。
4. 工程交接须注明`DESIGN_READY / CODE_PRESENT / VERIFIED_ISOLATED / VERIFIED_LIVE / OWNER_ACCEPTED / HOLD`五类以上不同状态；KAD4精确绑定接口、表、角色、正反测试及回滚；KAD5真实双题验证。

## 15｜与KAD1-A/B/C/D的唯一新架构依赖

这四份文件和本合同共同属于MHKA授权的**新专业合同**，旧P/R/H/I/CAP仅为来源和审计依据，不能越过当前合同另行定义生效规则：

| 新合同 | 执行域/唯一详细执行内容 | 与本合同的交接 | 禁止事项 |
|---|---|---|---|
| `specs/data-production/MoHen_Data_Production_Protocol.md` | 六阶段、63方法、L0-L5数据与专业交接 | `RequestFormalProduction`产生受控请求，回写qualified ref及权利/来源证据 | Studio不得直接写正式L/G |
| `specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md` | Gate资格、Reviewer、用途消费者、失效、审计 | 本合同的`valid_gate_qualification_for_purpose`只读消费当前资格 | 禁止工作资产状态替代Gate |
| `specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md` | 五母题、导演、19组件、五图业务状态 | Studio资产及WorkRevision供导演/预演/合法作品消费 | 不因导演改变历史事实/素材许可 |
| `specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` | Agent、Skill、Tool、模型/垂类、预算、委托、候选验证与恢复 | 交接`delegation_id`及不可变候选/受控生产申请 | 外部AI不得获得生产G权限 |

若两份合同对同一字段的语义相异，按MHKA唯一Owner裁决并原位修订；不能任意选择有利版本。历史原件只供调查原意及变更证据，任何实际接口/SQL仍需按KAD4核真实仓库、角色与环境。

## 16｜`StudioAssetRevisionV1`完整字段、类型约束和互斥状态

**对象定义（新合同规范性，不是对已有库字段的确认）：**

```ts
type StudioAssetRevisionV1 = {
  asset_id: string; revision_id: string; revision_no: number;
  supersedes_revision_id: string | null; asset_kind:
    | 'research_brief' | 'source_anchor' | 'reading_note' | 'evidence_note'
    | 'spacetime_candidate' | 'relation_hypothesis' | 'humanistic_insight'
    | 'research_collection' | 'director_plan' | 'media_selection'
    | 'work_revision' | 'citation_snapshot' | 'consented_feedback';
  project_id: string; workspace_id: string; actor_id: string;
  origin_kind: 'human'|'internal_agent'|'external_delegate'|'formal_L_import';
  epistemic_class: 'original_material'|'observation'|'claim'|'hypothesis'|'editorial'|'qualified_L_ref';
  content_hash: string; payload_ref: string; payload_format: string;
  source_refs: Array<{source_id:string; version:string; locator_type:string; locator:string}>;
  formal_L_refs: Array<{layer:string; artifact_id:string; revision:string; gate_decision_ref:string|null}>;
  dependency_refs: Array<{type:string; id:string; revision:string; relation:string}>;
  rights_by_action: Record<'access_view'|'machine_read'|'retain'|'download'|'quote'|'display'|'adapt'|'redistribute'|'external_processing', 'allowed'|'denied'|'unknown'|'restricted'>;
  permission_scope: {project_id:string; roles:string[]; purposes:string[]; consent_ref:string|null};
  content_state: 'WORKING'|'SNAPSHOTTED'|'REUSE_READY'|'ARCHIVED';
  access_state: 'AUTHORIZED'|'RESTRICTED'|'REVOKED';
  freshness_state: 'CURRENT'|'STALE'|'UNKNOWN_DEPENDENCY';
  validation: {status:'UNASSESSED'|'CHECKED'|'HOLD'|'REJECTED'; rule_version:string|null; findings:string[]};
  delegation_id?: string; external_receipt_id?: string; tool_model_version?: string;
  idempotency_key: string; correlation_id: string; created_at: string;
}
```

**唯一权利动作词典：** `rights_by_action` 的动作名与取值一律取 `packages/data-access/src/rights-actions.mjs`（`mohen.rights-actions.v1`）的九动作四取值，本合同只引用不复述，禁止另立第二套词表；键缺失等价 `unknown`。除 `access_view` 外，只有显式 `allowed` 才放行，`unknown / restricted / denied` 一律阻断。`access_view`（本项目内研究读取）的取证语义是：显式 `denied` 即拒，`unknown` 不阻断，但项目归属、`access_state`、`content_state`、依赖解析与原件绑定仍须另行通过——该动作裁决的是本项目内的读取，不构成任何对外许可，也不得由它推出 `quote / display / download / machine_read / retain / redistribute / external_processing` 的授权。

**校验要求：** `asset_id`跨修订稳定、`revision_id`及`revision_no`只增不改；`supersedes`必须指向同asset的既有版本；所有引用均是身份+版本，不接收隐式“最新版”。引用来源缺原件定位则不得生成`quote`合格引用；权利`unknown`不能默认`allowed`；`qualified_L_ref`必须含正式层当前有效资格引用，其他`epistemic_class`不能自行改为该枚举；`content_hash`绑定内容与必需元数据。项目/用户隔离和下游用途必须另验，不因引用某个已合格L而继承所有动作授权。

**13种资产的特定字段与守卫：** `research_brief`保存问题、背景/时空、成果用途及预算；`source_anchor`保存来源版本、原件locator、持有与展示分离；`reading_note`保存L1读取单元/方法/疑字；`evidence_note`保存L2声音/转引/反证；`spacetime_candidate`保存时期原文/精度/替代定位；`relation_hypothesis`保存主客/谓词/方向/时间/反证；`humanistic_insight`保存L4比较口径/当下端/竞争解释；`research_collection`保存带版本的引用索引并逐项验权；`director_plan`保存H1/H2/H3选择与节拍；`media_selection`按展示/下载/修改分权；`work_revision`保存稳定稿号/差异/引用/发布待审；`citation_snapshot`保留当时版本但重新消费须查当前资格；`consented_feedback`须显式同意、允许撤回、不得由浏览行为自动生成历史主张。

**五谓词不混同：** `saved`仅代表写入稳定修订；`reuse_ready_for_research`需项目授权/有效来源/依赖闭包；`valid_gate_qualification_for_purpose`须读独立Gate；`editorial_publication_approved`须读运营不可变审批；`rights_permitted_for_action`需逐媒资/文本/用途/期限实时审查。五者可有不同真假值。研究、正式G和作品各自独立状态，不能使用一个`approved`布尔值覆盖。

## 17｜合同验收与拒收反例

- **正例**：原件页/区域定位存在、研究作者有目的和范围授权、带幂等键保存修订、独立G所需用途真实PASS、作品另经运营审核、权利覆盖当前展示动作且未到期；Studio可合法复用该引用并经CAS发布已审稿。
- **反例A**：仅书目命中、外部AI臆造原文或D02候选未过G2 → 保存候选允许，升级为正式事实及公众展示必须阻断。
- **反例B**：run删除、旧rev冲突、并发双提交、研究包变更、媒体display撤权、依赖未知 → 历史rev不能丢失/覆盖，相关作品变STALE，合法发布分面精准fail-closed。
- **反例C**：已公开旧稿不等于新稿可发布；WATCH缓存不得恢复过期图片许可；作者、Agent、Operator任一身份都不能自签正式G。
- **反例D**：跨项目`Fork`只有新身份与来源依赖，旧项目的私人权限/许可不随之继承；受托外部AI仅返回候选与原始回执，不获得任意正式L写入能力。

本合同正反测试的逐编号最低断言见§13（AT-01—16及A01—07），它们是当前规范自身的完整判据。原R4.3旧文件保留历史事实与差异证据，**不再作为本合同隐含的第二执行规范**。`SOURCE_LOCATED`不等于`RULE_RESHAPED`，`DESIGN_RESHAPED`不等于`VERIFIED_LIVE`。

## 18｜工程镜像精确绑定字段

WorkRevision.content新增可选panels与director_plan_ref，由提交动作保存不可变快照；历史修订缺快照返回panel_snapshot_unavailable，禁止临时调用模型冒充历史。公开资格使用content.qualification_refs[]，每项qualification_ref、artifact_ref{type,id,revision}、consumer、purpose{namespace,code,version}、scope；旧provenanceRefs文字继续保留作叙事出处，不能自动转换成资格。媒资的artifact_ref必须在当前合法引用内，license、rights_status及有效期另核。无引用上下文、旧字符串或缺资格应HOLD，不能自动给历史作品补签。

## 19｜KAD2—KAD5长期资产物理身份、写入、双题复用唯一规范（KAD6集成）

### 19.1 长期实体与既有正文去重

- **资产与项目**：`studio.projects(project_id uuid PK, owner_user_id → public.users, project_title, research_scope, lifecycle_status)`为第一阶段受控研究项目身份；当前没有经证实可供长期ACL的项目主表，旧`research_tasks`归项目需要有依据的映射，不按题名/任意`project_ref`自动归属。首期Owner-only；跨题复用分别验证来源项目与目标项目权利。
- **13类工作资产**：单套`studio.asset_heads(asset_id uuid PK, project_id FK, asset_kind ∈ 13类, current_revision_id CAS)`与`studio.asset_revisions(revision_id uuid PK, asset_id FK, revision_no, supersedes_revision_id, payload|payload_storage_ref, content_hash, epistemic_class, source_refs, dependency_refs, rights_by_action, original_task_id NULLABLE, origin_task_snapshot, provenance, idempotency_key)`；禁止同资产两个current、覆盖旧rev、靠删除task删除历史资产。`asset_heads.current_revision_id`需验证属于同asset的唯一修订。
- **多态链接与实用回执**：`studio.asset_links(link_id, source_revision_id FK, target_kind, target_ref, target_revision_ref, link_role, project_id, rights_decision_ref)`在服务内逐目标类型验证真实对象+版本；`studio.use_events`记录确实执行的授权引用/检索/复用。多态文本ref在数据库没有FK不意味着任何字符串均合法，缺源即`REVISION_NOT_FOUND`。
- 已有作品正文为`publication.work_revisions`，导演为`public.director_plans`，媒资为`public.assets`，分别通过Studio封套引用**而不复制第二份主正文**。保留原R4.3 `research_brief/source_anchor/reading_note/evidence_note/spacetime_candidate/relation_hypothesis/humanistic_insight/research_collection/director_plan/media_selection/work_revision/citation_snapshot/consented_feedback`全部类型及原AT-01—16与X1 A01—A07；正式L0—L5知识对象仍由原D/G负责，文中`work_revision`类型封套不替代作品数据库。

### 19.2 首题起真实混合委托与不可变回执

`studio.delegations(delegation_id, delegation_series_id, delegation_revision_no, root_task_ref, root_task_snapshot, optional root_task_id, subtask_ref, project_id, requester, executor, input_manifest, allowed_actions, transfer_rights_decision, budget_limit, request_hash, idempotency_key)`；`studio.execution_receipts(receipt_id,delegation_id,attempt_no,request_hash,result_hash,result_manifest,candidate_refs,acceptance_state,cost/tool_version)`。`root_task_ref`保留不可变文字键，业务去重使用`(project_id,root_task_ref,idempotency_key)`，**不能**只用可被置NULL的`root_task_id`作为唯一约束键。收包T1—T7检查结构、真实原件、权利、原文与解释、转引依赖、时空语义、当前资格，逐item`ACCEPT_AS_CANDIDATE/QUARANTINE/REJECT/REQUEST_D_STAGE/WAITING_GATE`；不批量自动写world/meaning/Gate。

首轮流程的每一步生成服务端可验证的`root_task_id,subtask_id,delegation_id,receipt_id,producer/engine_version,input/output_hash,created_asset@rev,rights_decision_ref,cost_if_known`。`research_events`/`study_asset_receipts`可继续作短期调度日志，但带`ON DELETE CASCADE`的task级表不能充当长期唯一回执。并发、重试与恢复必须通过`idempotency_key + lease_epoch + current ACL/policy/rights`检查，不允许旧checkpoint复活已撤权委托。

### 19.3 消费、增长、失效与KAD5设计验收

唯一受控消费从**存储身份→项目ACL→revision→目的/操作/权利→匹配现行Gate资格与来源依赖→授权结果→可复核使用事件**。Studio项目研究读取可获得合法L0—L4与私有候选，公众WATCH仅合法作品rev及当前允许G5分面；外部AI只拿明确允许发送的最小包，不能持数据库管理员凭据；Admin为F05内部知识子功能，视图每条能逆查source/raw/locator/G/use_events/knowledge_delta。

KAD5双题（第二题必须引用第一题修订）统一以 **A“隋唐大运河及江南水路连接”→B“宋代江南运河城镇与日常生活”** 作为真实研究测试计划；KAD2的上海苏州河两题仅为早期备选样例，不作为另一个强制工程验收方案。B必须真实`A_asset_id@A_revision`有权引用，形成`B_reuse_event_id`和新增来源/读取/关系/人文发现至少一类，重复摘要不能记知识增长。每项工作/正式知识/出版/媒资许可四轴独立，发生撤权则对受影响分面立即Guard阻断，已签短URL的失效窗口需另外保护。

**设计验收**：KA-19-P1同项目重试同一key不重复修订；KA-19-N1删除task后仍能从合法资产追溯脱敏任务；KA-19-N2跨项目无授权不得命中原件；KA-19-N3旧rev已撤权不能从缓存复活；KA-19-N4旧合格G5、运营批准或重复摘要均不能替代B的新增有据知识。DB/Storage真实回归仍标`NOT_RUN`。
