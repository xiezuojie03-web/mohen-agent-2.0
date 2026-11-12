# KAD2｜混合任务委托、执行、成果回流与Studio全链合同（设计基线）

**任务身份**：KAD-02 / KAD2；版本 V1.0；日期 2026-11-02。  
**本轮状态**：`DESIGN_CONTRACT_COMPLETE / LIVE_MIXED_EXECUTION_HOLD`。本文件是设计研究交付，不是 GitHub 中已激活的运行合同，不签发工程实施/生产写入授权。  
**唯一治理**：MHKA-00授权，MHKA-01价值取舍，MHKA-02 Studio人机体验，MHKA-03知识资产与资格，MHKA-04 Agent/能力/方法，MHKA-05工程实现；不得新增第七章或第二套正式生产链。  
**规范性输入**：KAD-02任务书V0.4 §00—08；KAD1 设计准出五类目标规范（`repo_target/specs/AGENT_CONTRACT.md`、`AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md`、`KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`、`data-production/MoHen_Data_Production_Protocol.md`、`data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md`）、`experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md`、`EXPERIENCE_CONTRACT.md`。旧 KAD1-A—D/R4.3 研究稿只作来源证据。  
**只读工程锚点**：2026-11-02 GitHub `xiezuojie03-web/mohen-agent-2.0`，明确 `ref=main`，观察 HEAD `db21cefcc09c6bcb5d7e3fca16d100cc0accd13d`；仓库默认分支仍为 `a001/production`。此 SHA 是设计对照快照，不是未来施工锁；旧 `AGENTS.md`仍路由 C0—C4，不能认为新代已经激活。

## 0｜目的、边界和成立标准

本合同只解决**一项实际研究委托**如何由 Studio 创作者、墨痕 Agent、外部 AI、原有六个 D Stage 与独立 Reviewer 分工，取得/理解真实材料，保存研究与作品，并在下一项委托中复用。不会重新制定原P0—P5、63方法、19 Skill、H1/H2/H3或G0—G5。第一项任务就要有内外双方真实的可复核动作；没有实际接线即 `MIXED_HOLD`，不得把手工复制外部答案模拟为 Agent 自驱。

强制不变量：
1. **正式知识只有一条链**：`D00→D01→D02→D03→D04→D05`，分别提交L0—L5候选及独立G0—G5按用途资格；Stage/LLM/Agent/作品编辑的 PASS不等于 G PASS。
2. **资产三分**：Studio工作候选（13种）、原D/L/G的资格知识、`WorkRevision`作品及`PublicationSnapshot`彼此不同；`saved≠reuse_ready≠qualified≠approved≠rights_allowed`。
3. **一个根任务、一套子任务账**：外部AI与内部Agent可同时处理不同子任务，不能平行制作两份无法对账的“终稿”；同一副作用单责任人+幂等键。
4. **任何知识向上晋级都要带证据与当前许可**：没有原件的书目仅是线索、OCR只是候选、同源转载不得堆叠为独立证据、历史几何与现代坐标不可偷换。
5. **失败和撤权优先于流畅叙事**：权限、预算、权利、来源、资格或运行失效时，合法研究草稿可保存，正式晋级和公开消费按最小受影响范围阻断。
6. **项目价值**：从通史骨架里找到真实问题，经局部深挖产生有证据的人文发现，联系今天实际生活、旅行、观察与体验；不把史料审核本身当作品叙事主轴。

## 1｜业务参与者、权限与唯一责任

| 主体 | 被允许的动作 | 明确禁止/边界 | 独立回执 |
|---|---|---|---|
| Creator（创作者） | 自然语言立题、确定问题/取舍、同意发送外部所需资料、选择导演与稿件、保存/提交 | 不自签G、不代运营发布、不因提问获得DB管理员权限 | `AuthorDecision`、`WorkRevision` |
| MoHen Agent（CTX-STUDIO） | 授权内搜索已有资产、识别缺口、出Plan DAG、经济路由、发有界委托、收包校验、归档候选、补证/继续、H1/H2/H3建议 | 不直接写正式world/meaning/read_model或gate audit，不把模型输出标原文 | `AgentEvent`、`DispatchPlan@rev`、`ReceiptDecision` |
| External AI Adapter | 指定允许输入上执行检索、OCR/VLM、材料理解/候选建议，记录工具与原始响应 | 无数据库超级账号、无跨项目访问、不得签 G/运营出版、不擅自索取受限原件 | `ExternalResultPack` + `ExecutionReceipt` |
| D00—D05 Stage Owner | 根据原生产协议生成、更新本Stage候选与L层受控记录 | 不替独立G签资格 | `ProductionRequest/Run/StageReceipt` |
| G0—G5 Reviewer/Policy | 独立按修订、用途/范围/consumer、政策版本签/拒/撤资格 | 不为Creator/外部AI/运营所代签 | `GateDecision@policy_rev` |
| Editorial Operator | 审核准确作品修订、媒资/发布用途，执行发布/撤回 | 不得因运营批准覆盖G/权利 | `EditorialDecision`、`PublicationSnapshot` |
| Admin Owner视图 | 读具体知识、研究缺口、追踪贡献与必要方向选择 | 不直接操作SQL/GATE或技术密钥 | `OwnerDecision`（仅本人应判） |

同一物理用户兼任多职责，也不得沿一个会话/角色传递另一职责权限；后台每次动作按实际角色和资源用途授权。

## 2｜单题从委托到下一研究的完整时序

```text
S0 Creator在Studio提出题目/价值/预算
 → S1 权限、用途、历史范围与内容约束检查；CreateWorkBrief@rev
 → S2 MoHen Agent按项目ACL检索旧Studio修订、可用L0—L5及历史任务；分辨候选与当前资格
 → S3 Agent提出子任务DAG/职责/需补来源及成本；Creator只确认价值性分歧与特殊外发授权
 → S4 各子任务按最小成本：复用→确定性检索→受控专业Tool→有界外部AI；每项有单一executor、租约/幂等
 → S5 外部返回结果包（不默认事实），Agent核字段/原件/权利/同源/冲突，接收为candidate@rev或隔离拒绝
 → S6 D00取得来源、D01定位读取、D02分层理解；按原独立G逐Stage申请用途资格，前序HOLD不穿透
 → S7 D03世界关系、D04人文发现、D05合法消费者分面由现有正式生产完成（或明确WAITING_GATE）
 → S8 Agent并行组织H1叙事发现、H2七导演选择、H3联合节拍与作品版本；明确“可作私有草稿但尚不可公开”
 → S9 Studio局部修改→原子SaveWorkRevision→跨刷新恢复→Submit特定rev→运营合法发布（可选）
 → S10 知识候选/正式资格/作品版本/引用与失败差异入永久资产；Admin查可读增长，WATCH仅合法发布后消费
 → S11 新课题带项目权限搜索并显式引用上一题`asset_id@revision`和`L_ref@rev`；补新材料、比较增量、重算失效
```

S0—S11 为**业务阶段标签**（非新D Stage）。“同时参与”是首次根任务中 Agent 与External AI 至少各有真实独立子任务和回执，不要求每步双做。任何尚未接线的步骤应显示 `NOT_CONNECTED` 或 `MIXED_HOLD`，不允许虚构事件时间和费用。

### 2.1 首轮最小任务分配（不得退回“外部全包”）

| 任务 | 谁先负责 | 可委托的细分任务 | 可观察成功动作 |
|---|---|---|---|
| 读取委托与旧知识召回 | 内部Agent | 无；必要时只对查询意图用模型 | 返回`search_request_id`、命中版本/过滤原因；空库也有真实零结果回执 |
| D00搜源与取得范围 | 原Stage D00 + 授权外部/确定性来源Adapter | 外部提出渠道/原件链接/版权线索，Stage负责取得身份 | 目录、节录、全文/扫描分开，标真实文件hash/取不到原因 |
| D01载体可回放读取 | Stage D01 + 专业OCR/VLM Adapter | 扫描书影/地图 OCR，必要时人校 | 原图页/区域+候选识读+工具版本+质量/失败 |
| D02史料语境理解 | Stage D02 + 外部受控模型 | 人物/声音/原句/转引/历史年代候选 | 每条主张返查具体read_unit；同源只计一谱系 |
| 候选接收、计划调整、缺口追踪 | 内部Agent | 只在外部结果内容候选生成时委托外部，不外包接受决定 | T1—T7校验回执、拒绝码、Replan/Resume checkpoint |
| D03—D05正式生产 | 原Stage + 独立G | 禁止Agent/外部直接代替 | 真实production_request及G用途资格ref或WAITING_GATE |
| 人文导演及版本沉淀 | Agent给H1/H2/H3建议，Creator选择 | 外部可提供候选表达而非“已核实史实” | 导演选择与资源ref、可局部修改WorkRevision@rev |

## 3｜统一对象与关联（逻辑schema；非声称现有DB已有）

**共用根键**：`root_task_id`唯一归属Creator/Project；每个`subtask_id`属于唯一root，`delegation_id`属于子任务的一次授权委托，`run_id`属于执行尝试，`execution_receipt_id`代表不可变执行事实。用`correlation_id`横向串联，但不可代替稳定资产身份。

| 合同对象 | 必需字段（值未知用unknown/null；不可臆造） | 更新与约束 |
|---|---|---|
| `AgentWorkflowRequestV1` | `schema_version,root_task_id,project_id,creator_id,brief_asset_ref@rev,task_intent,goal,temporal_scope,spatial_scope,requested_outputs,privacy_class,consent_refs,budget_policy_ref,created_at` | 作者意图修订不可静默重写 |
| `AgentDispatchPlanV1` | `plan_id,revision,root_task_id,subtasks{dependencies,target_stage,owner_actor,executor_kind,allowed_tools,expected_output,estimated_cost,priority},method_binding_ref,policy_version,plan_hash,approved_decisions` | 变更Plan新revision，已完成任务不重复派发 |
| `DelegationEnvelopeV1` | `delegation_id,root_task_id,subtask_id,run_id,idempotency_key,requester,executor_kind,provider,model_tool_version,input_asset_refs,allowed_sources,allowed_actions,rights_transfer_scope,expiry,output_schema,budget_reservation,timeout,stop_conditions,policy_ref` | 以实际授权最小范围发送；不得用公网链接替换受限附件授权 |
| `ExecutionReceiptV1` | `receipt_id,delegation_id,run_id,started_at,finished_at,status,actual_executor,version_if_known,input_hashes,output_hashes,cost{value,currency,certainty},attempt,errors,artifact_refs,provenance` | 追加，不回填假成本；失败也须有回执 |
| `ExternalResultPackV1` | `pack_id,delegation_id,output_schema_version,producer,created_at,items{type,source_identity,source_version,locator,acquisition_kind,raw_excerpt,interpretation,uncertainty,transmission_chain,rights,dependency_refs},files{hash,storage_ref,content_type},warnings` | 接收前隔离，不可信输入；URL/hash/类型不一致禁止晋级 |
| `CandidateIngestDecisionV1` | `pack_id,receipt_id,accepted_items,quarantined_items,rejected_items,checks_T1_T7,rights_decision,project_acl_decision,decision_actor,timestamp,created_candidate_refs@rev,production_request_refs` | 每项独立判，不能因整个包“成功”批量成Truth |
| `WorkflowCheckpointV1` | `root_task_id,plan_revision,event_offset,eligible_subtasks,finished_receipts,asset_refs@rev,policy_version,rights_snapshot_ref,lease_epoch,created_at,checksum` | 从服务端可信快照恢复并重新鉴权；客户端不得自填resume_input |
| `StudioResearchPacket@rev` | `root_task_id,source_refs,read_unit_refs,evidence_candidates,open_questions,blocked_refs,knowledge_diff,source_versions,rights_summary,cost_summary` | Studio持续可保存；每次修订带上游来源与回执 |
| `DirectorPlan@rev` | `H1_discovery_refs,H2_decisions,H3_beats,explanation_limits,media_refs,alternative_plans,author_choices,depends_on_revisions` | 事实变化必须返H1/D，纯表达变化仅改稿 |
| `WorkRevision@rev` | `work_id,revision_id,expected_revision_id,content_hash,content,beats,source_and_rights_refs,publication_status,depend_on_studio_packet,decision_ref` | CAS保存、幂等、跨刷新恢复；运营只审核精确rev |
| `KnowledgeGrowthEventV1` | `root_task_id,asset_id,asset_revision_id,from_revision,change_kind,qualified_L_refs,source_receipts,relation_to_prior,consumer_constraints,created_at` | `candidate_added`与`qualified`、`work_created`分别统计；不是另一正式知识层 |

所有时戳为服务端可审计事件；合约设计文件不声称上述对象物理表/接口已经存在。文件和原件应存权限管控对象存储，DB只存指针、hash/页位、身份/权利，不能把敏感原件塞GitHub。

## 4｜混合分包策略与经济路由

按 CAP-D01 六步链落实：`定义任务类型→先看可用已存资产→检查确定性工具→检查专业工具/云端适配→确需推理才发有界模型委托→预算和权限预留/比较→结果核验回流`；大语言模型不是默认一切工具。允许对具体子任务做“内部/外部比重”调整，但不把“第一题完全外包，后面才混合”作为试验路线。

触发外部AI的常见情形：跨馆来源候选、中文繁体竖排/版面识读、不同材料语言与时代语境的有限理解、多版本冲突识别、人文导演备选。默认先调用确定性索引/解析；模型无法取得/读到原件时返回线索和`ACQUISITION_HOLD`，禁止合成所谓原文。外部模型输入需按`purpose,project,rights_transfer,minimum_data,retention_policy,approved_provider`逐项检查，任何一项不明不得把有权限制资料发送出去。

预算为根任务的`total_cap`、每子任务`reserved/used`、重试`retry_cap`与人工校验预估；`cost_if_known`只登记实际回执，供应商未给用量只标`unknown`。一次子任务超预算暂停**子任务**及其依赖，不自动清空已合法完成子任务；创作者确认额外预算才允许继续。每轮评估可迁回内部能力的具体任务类型/成功率/复核结果/成本，不设虚假的Agent“自主百分比”。

## 5｜委托→接收→事实资格的两段关卡

### 5.1 `DelegateExternal` 前置

核 `creator/project身份→项目授权→用途→来源访问/外发权→合法Adapter允许清单→模型/工具版本可识别→预算预留→时间/次数限制→敏感数据最小化→幂等键`。无权、不支持或未知资料外发策略：`DELEGATION_HOLD`，转用内生只读、用户合法导入或不继续；不得为让流程好看跳过外发许可。

### 5.2 `ReceiveCandidate` 七关（复用CAP-D02 T1—T7）

- T1 **结构与身份**：schema、合法任务与子任务、结果hash、来源/资产ID、版本、幂等、项目权限。
- T2 **可取得与可引用**：区分bibliography_only/excerpt/full_text/scan，真实原件锚点存在与内容取得范围匹配。
- T3 **权利与数据发送**：原权利、提取/保存/再分发/AI处理/公开展示分动作，未知不能当允许。
- T4 **原文与解释分开**：raw_excerpt、OCR候选、译注、模型判断、编辑修订的声音和版本分别标注。
- T5 **转引与证据独立性**：同源副本/引用链合并谱系，不凭重复数量计算可信度。
- T6 **时空与语义一致性**：纪年/日期类型、史实与假说、地点别名、测年范围、现代坐标/舆图几何、反证均有界。
- T7 **资格只读核验**：既有资格是否匹配当前用途、来源rev、consumer、action、policy；本关不签G、不自行升级候选。

允许结果：`ACCEPT_AS_RESEARCH_CANDIDATE / QUARANTINE_FOR_EVIDENCE / REJECT_INVALID / REQUEST_D_STAGE / WAITING_GATE`。对于同一包不同item独立分类。只要原D/G未签，客户端只显示“研究候选/待核”；不能写入正式 `world.* / meaning.* / control.*` 或公开L5。

### 5.3 生产资格返回路径

`Candidate@rev → ProductionRequest(manifest+阶段+scope+refs) → 原run.mjs/受控队列→D00/01/02…→独立Reviewer资格记录(purpose,scope,consumer,action,policy_version,artifact_rev)→可用qualified_L_ref`。如果 Runner/Registry/Gate 未激活，返回 `PRODUCTION_NOT_CONNECTED/WAITING_GATE`，保留可恢复候选，绝不能用D Stage PASS填充G。

## 6｜D00—D02第一优先的专业停机标准

| Stage | 首次课题至少留下什么 | 必须HOLD的情形 | 允许的继续动作 |
|---|---|---|---|
| D00 | 文献/原件身份、版次、可读位置、获取级别、许可动作与失败清单；同时统计书目数与真正得到原件数 | 只命中书目、无正文/无权取得、URL已失效、版本不可核 | 保留书目线索，另找合法来源，不交D01假全文 |
| D01 | `source_version+page/folio/region+method/model_version+raw_excerpt+candidate+quality`和原件可回放引用 | OCR无原图对应、扫描缺页、中文识读异常、云端Linux不可用 | 保存疑字/部分定位候选，请校订/换工具/补图，不交“无误原文” |
| D02 | 原句与说话者、材料形成/叙事时间、时代语境、转引谱系、主张/反证、适用边界 | 同源转引当多证、作者身份不清、模型编造原文、时间地点无依据 | 回D01/D00补证，保留受限假说/问题 |

D03—D05只处理已获原链所需G资格的输入，按原 W01—W10、A01—A12、P01—P08执行；Agent不给它们“直接事实”捷径。D04优先寻找**为什么这一变化与今天生活相关**的受证发现；纯趣味文案不得替代解释。涉及历史地图/现代GIS互投，坐标来源/CRS/精度、推断区间必须标出。

## 7｜Studio九个业务动作的可见全链（沿R4.5，不重新发明）

| 原动作 | Studio人能做什么 | Agent/系统的可核实行为 | 必须保存的对象与失败态 |
|---|---|---|---|
| ST-01 CreateWorkBrief | 自然语言说想研究什么、为何与当下有关 | 真实创建brief，检索旧资产，初步计划不等用户填表 | `research_brief@rev`，无资源显示缺口而不假装完成 |
| ST-02 StudioResearchRead | 查看已有知识与合法来源原件，追问为什么 | 项目级最小AuthorizedResearchView，返回精确证据与受限项 | `source_anchor/reading_note`；ACL拒绝明确，不穿透公众L5 |
| ST-03 AnalyzeAndSaveCandidates | 挑关系/时空/人文研究方向 | 外部与内部候选合并、T1—T7检测与差异汇报 | `evidence_note/relation_hypothesis/humanistic_insight`；未经G标候选 |
| ST-04 RequestFormalProduction | 决定需要补证/正式知识生产 | 只提交受控ProductionRequest并查询真实进展 | `production_request_id/run_id/G-status`；无工具则`NOT_CONNECTED` |
| ST-05 AssembleDirectorPlan | 比较有意义的两种讲法，选择其中一种 | 以H1候选→H2七导演选择→H3节拍，标依据与替代方案 | `director_plan@rev`，不得改写证据，只改叙事组织 |
| ST-06 PreviewWork | 看见逐步形成的图文/必要时空内容 | 消费允许预览的素材并标研究候选，产生非正式preview | `preview_snapshot`；引用禁用/没授权画面则显示占位/解释 |
| ST-07 SaveWorkRevision | 修改某段文字/顺序/画面并保存恢复 | 影响范围、差异、CAS与重试；不能丢掉其他节拍 | `work_revision@rev`，`VERSION_CONFLICT`可合并不覆盖 |
| ST-08 SubmitForEditorialReview | 明确提交冻结稿件 | 确认当前revision/媒体权利/知识资格缺口、版本快照 | `submission_snapshot`；投稿不代表公开/合格知识 |
| ST-09 EditorialDecision/Publish/Withdraw | 接受运营退修/合法上线/撤回 | 独立Operator决策精确revision与指针；不代G | `publication_snapshot@rev`；失败保留旧合法稿 |

**Studio人机视图**：左侧持续对话保留意图和已回答问题；中区显示真实子任务责任人、已收原件/待补证/预算/已获资格、可继续操作；右区展示逐步生成作品的导演选择和草稿。宽屏三工作面、窄屏切换工作区仅继承已有体验合同，不开启五图视觉重研究。首轮提交一句话后，若尚未规划可明确显示`PLANNING`并持续可操作，不应卡在`QUEUED`假装已经研究。

**关键修改分流**：改镜头节奏/字体/表达→H2/作品修订；改解释/故事核心→H1及相关D02—D04核查；改时间地理/来源引用→回原D层及G资格检查；更换媒资→单独检查行动级许可。保存永不等于正式知识晋级。

## 8｜持久、回流、第二题复用与知识增长定义

保存目标为13类工作资产的稳定ID/不可变revision和依赖，而不是`research_run`快照或聊天文本。`StudioResearchPacket@rev`、`DirectorPlan@rev`、`WorkRevision@rev`、`PublicationSnapshot@rev`及`Delegation@rev`不得互相覆盖。`research_run`可删/重跑的临时数据不能作为长期资产唯一存储；必须有项目级持久引用与恢复/备份/导出计划。

“知识增长”至少区分 `new_source_acquired / new_read_unit / new_material_observation / new_world_assertion_qualified / new_humanistic_finding_qualified / new_relation_hypothesis / new_work_revision / reused_prior_asset / invalidated_or_restricted`。量化只计具名对象+新修订+来源回执；同文重摘要/重复embedding不算新知识。Admin可指出“本题增加了哪条材料/关系/发现；有哪些仍不合格”及下题引用地址。

第二题必须`SearchStudioAndL`拿第一题显式稳定ref；复制到新项目需`ForkAssetForProject`、重新授予最小ACL并保留原来源关系，不能继承原项目外发权/公开权。引用旧rev时每次重查当前依赖资格与权利；旧内容`STALE/REVOKED`时只可有界参考或阻断，不偷用旧公开缓存。待补证可产生定向ResearchTask，不必丢弃已有合法作品稿。

## 9｜错误、恢复、并发、费用与撤权

| 失败码（设计级，不声称旧API已实现） | 触发条件 | 用户可见恢复方式 | 后端不变量 |
|---|---|---|---|
| `MIXED_NOT_CONNECTED` | Agent或外部适配尚无真实接线/执行回执 | 可保留brief、人工研究包，但不声称混合完成 | 标设计可执行/运行HOLD |
| `SOURCE_BIBLIO_ONLY` | D00只有目录/摘要 | 显示线索并继续寻找原件 | 不生成虚构read_unit |
| `SOURCE_RIGHTS_HOLD` | 访问/保存/外发/展示任一必要权利不明 | 请求合法替代来源/许可 | 不发送受限输入到第三方 |
| `READ_LOCATOR_MISSING` | OCR候选无页位/原图锚点 | 补页/换OCR或人工校订 | 不自动走D02正式证据 |
| `TRANSMISSION_DEPENDENCY_HOLD` | 引用关系/同源依赖未明 | 返回原件或记录同源限制 | 不统计为独立证据 |
| `CANDIDATE_VALIDATION_FAILED` | T1—T7不满足 | 逐item显示理由、隔离原包 | 无正式D/L/G写入 |
| `METHOD_BINDING_UNAVAILABLE` | Registry/Skill/Tool未绑定 | 换已授权执行器，必要时停工 | 不执行任意JS/SQL |
| `BUDGET_EXHAUSTED` | 预算余量不足或重复收费风险 | Creator确认扩额或使用已存合法结果 | 不重复副作用，计费未知明示 |
| `EXECUTOR_TIMEOUT` | 外部/内部子任务超时 | 重试该子任务并复核幂等键 | 已完成兄弟子任务和稿件不丢 |
| `DELEGATION_REVOKED` | 作者撤销任务或超权限 | 停止后续外发，保留仍合法已收内容 | 令牌和后续租约失效 |
| `CHECKPOINT_STALE` | 重启后权限/依赖/政策/计划已变 | 重新计划并选择合法断点 | 不重放过期工具权和G资格 |
| `WAITING_GATE` | Stage PASS但独立资格未签/已HOLD | 显示“可保存草稿，不能公开”，通知专业责任人 | 没有G不进入受限下游 |
| `VERSION_CONFLICT` | 保存rev落后/双击提交 | 比较冲突、CAS重试、明确新版本 | 不覆盖不可变revision |
| `PUBLISH_ELIGIBILITY_HOLD` | 作品rev资格/版权/运营核签不足 | 仅内部预览，补齐缺口 | 不切公开指针 |
| `RIGHTS_REVOKED` | 原件/图片/知识资格被撤销 | 局部下线和重审，合法其余保留 | 先Guard后失效处理，缓存不可复活 |

Worker每次副作用需要`idempotency_key`和`lease_epoch`；重复结果同键重试返回旧回执，不能重复付费/建稿/提交Gate。Checkpoint恢复时重查项目ACL、已撤Delegation、预算、文件hash、依赖与资格当前版本；回滚不恢复已撤权内容。运行中的任务取消与研究资产删除是不同动作。

## 10｜第一题/第二题的设计验证脚本（不是实际历史研究成果）

**建议的首题 T1**：`上海苏州河水岸功能的历史变迁，怎样影响今天的城市空间与步行体验？` 范围暂定近代至当代；从城市/水系通史骨架定位，再选一段资料充分的水岸局部深挖。价值问题由Creator确认或调整。设计样本不预先断言具体年代/事实，所有证据必须真实取得。预期第一题生成：研究brief、原件与书目分流、至少两个不同类型source候选及其真实取得情况、一个可回页码read_unit、一个材料观察/同源核验、至少一个人文发现候选、H1/H2导演方案及可恢复的私有WorkRevision。无合格G则公开稿保持HOLD。

**关联第二题 T2**：`苏州河沿岸四行仓库及附近水岸的历史记忆，今天如何被人们体验？` 先通过项目授权引用T1稳定asset@rev/qualified_L@rev，再基于T2新增合法原件、差异、空间坐标精度和当代观测材料，形成真正的局部深化；至少产生一条新的**可证的**差异项。是否制作WATCH必须先有运营+知识资格+媒体权利，不能把设计脚本当已上线内容。

两题都必须以真实内外混合启动；首题不能先由外部独立写成整篇，再由墨痕补做展示。T1的最低实际双主体证据：Agent真实的`search/run + dispatch + ingest decision + replan`多种事件，外部至少一个合法`delegation/receipt`，且同属一个`root_task_id`；不要求Agent一开始就能自动完成D01复杂中文识读。T2须形成`reused_prior_asset`记录和“旧知识+新差异”可返查链。

### 10.1 首题真实运行前不许代签的门

`Agent旧资产真实查询`、`外部AI合法接线`、`真实来源/读取/理解`、`独立G授权与资格`、`持久研究资产跨run恢复`、`Studio内实际局部改稿`、`真实费用和权限/版权`均为 `NOT_RUN/HOLD`，不得使用样本回执当真实证据。启动前应确认 GitHub最新main SHA、实际环境、数据库RLS和已有Codex工程工作，以KAD4/5有授权部署和真测为准。

## 11｜源码与设计镜像逐项映射（最小增量，不等于施工指令）

| 功能责任 | GitHub `main@db21cef`已只读观察 | KAD1 `repo_target`设计责任 | KAD4—KAD5核验点 |
|---|---|---|---|
| 旧研究资料台 | `apps/web/app/studio/desk/page.tsx`从`public.research_tasks`及`imported_materials`读取；导入材料存在，不能推出永久资产模型完整 | `specs/AGENT_CONTRACT.md` / `KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` | 安全检索与可回页、项目跨L读、长期版本和空/受限态 |
| Agent Runtime层 | `packages/agent-runtime/src/index.ts`有理解/选择导出，不能证明有真实外部派工 | `specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` | 检索/编排/分包/收包/中止/重放，19Skill绑定真实状态 |
| Studio研究入口 | `apps/web/lib/studio-research.ts`及`studio-production.ts`在KAD1目标合同指为复用点，**本轮未取到正文确认** | `specs/AGENT_CONTRACT.md`/`API_TOOL_CONTRACT.md` | 实际API参数、登录角色、上下文、读取范围、Tool副作用 |
| 作品修订/出版 | `apps/web/lib/publication.ts`存在createWorkDraft、submitWork及review路径；还需回读具体修订/资格语义 | `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` / `EXPERIENCE_CONTRACT.md` | CAS、投稿精确rev、独立运营、媒资、回滚与撤权 |
| 作品回流 | `apps/web/lib/asset-reflow.ts`当前明确返回`reflowed:0, reason:independent_gate_required` | `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` / `MoHen_Data_Production_Protocol.md` | 受控候选回流→原D/G，而不是发布直写read_model |
| 独立G和生产 | `CURRENT.md`声明隔离测试已执行，但真实数据库/Reviewer未验；`AGENTS.md`尚路由旧C | `specs/data-production/...`协议及Gate机器合同、SECURITY、PERSISTENCE | 真RLS/Reviewer/资格/撤权的隔离与线上分级验收 |
| UI/导演 | `specs/EXPERIENCE_CONTRACT.md`在main仍是旧L5 Experience Runtime；新目标明确L5读模型/L6体验 | `specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md` | 禁止旧新L号混义；Studio作品与原件/资格一致 |

未读取全部路由、DDL或本地工作树；表中“目标合同”均为 Library 静态设计，不得声称已经出现在 GitHub main。工程目标写入必须按MAB manifest补当前 blob SHA、目标diff、权限和测试后，由独立授权进入KAD4。

## 12｜KAD2设计正反验收门与KAD1反查

验收引用同目录 `KAD2_正反验收场景矩阵_现行.csv`（场景ID `KAD2-AT-01`起）。每个正例同时必须有反例，涵盖：旧资产召回、内外互补而非双份稿、T1—T7候选接收、书目/原文区分、OCR页位/同源、D/G分权、Studio ST01—09、资产持久/跨题复用、预算撤权、身份与权限、作品修订CAS、WATCH资格和外发权。对应既有R4.3 AT-01—16、X1 A01—A07、R4.4 T01—26、R4.7 AT47-01—30等旧专业测试保持原权威；KAD2新矩阵只对组合业务的缝隙新增验收，不复刻原规范。

设计自检指标：
- **结构**：合同规定目标、输入、执行主体、方法、输出、状态、失败、回退、授权、证据与验收，可由工程AI使用而不再询问“墨痕应做什么产品”。
- **横向**：13资产、六D/独立G、H/I、Agent、Studio、KAD3 Admin/轻WATCH责任不冲突；新对象只是消息/工作流逻辑schema，不先指定新增物理表。
- **纵向**：`Creator brief→Agent检索→内外真实委托→原件/证据→D/G→H1/H2/H3→WorkRevision→Admin/下题复用`逐步正向可指；反向从任何作品段落/资产/Source读单元可定位原来源和具体权限决定。
- **诚实证据**：设计样本均为 synthetic/NOT_EXECUTED；无真实外部AI和本仓库Agent同题执行；不签KAD2“从第一次真实课题就有内外真实贡献”的运行门。

## 13｜准出、后续与唯一变更归属

**本阶段可签结论**：`KAD2_DESIGN_CONTRACT_COMPLETE`，含完整委托/回执/收包逻辑模型、原D/G交接、Studio九动作、双题脚本及正反验收；**不签**`KAD2_FULL_EXIT_PASS`，因为任务书KAD2的真实双主体回执条件尚未实跑。其执行型验证统一交KAD4工程差异、KAD5两个真实课题；本合同不授予写GitHub/DB/Vercel/公布作品权限。

**唯一后续设计任务**：KAD3｜Admin知识条目具体可视管理与轻量WATCH业务消费，必须沿用本合同的`KnowledgeGrowthEventV1`/长期资产与WorkRevision合法消费身份，不把统计仪表或技术日志当人文知识管理。并行KAD4前置需重锁最新main及物理DB授权，禁止直接拿本合同改线上系统。KAD6才审查整体MAB；UXD-01仍PAUSED_NOT_TERMINATED，EXP不在本轮关键路径。
