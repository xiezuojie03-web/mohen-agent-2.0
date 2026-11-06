# G0—G5 独立资格与机器Gate合同 V3.1（MHKA目标代际）

> **2026-11-06 KAD1-B继承补核／设计规范有效、实际Gate运行仍HOLD。** 依2026-11-05 Owner裁决，MHKA及授权专业合同现已是工程设计与施工依据，不得把M8旧系统退役误认为MHKA设计准入时点。本合同仅定义G0—G5正式资格目标；GitHub文件存在、旧样板PASS或设计检查通过不代表独立Reviewer、DB事务、当前目的资格或生产Gate已激活。实际可用性仍以最新源码、迁移、权限及真实正反证据独立核准。

**语义Owner：** MHKA-00（权力）、MHKA-03（资格对象）、MHKA-04（专业审核）、MHKA-05（DB签发实现）。
**机器唯一配置：** 同目录 `gate-contracts.v3.json`；`configs/gate-contracts.json`仅可代理/路由，不可复制另一套规则。旧审核历史不可自动升级为新版资格。
**归位：** 原有目标 `specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md` 原位修订，避免新增并行Gate合同。

## 0｜核心原则

1. G0—G5是六个彼此独立、与D00—D05一一对应的专业资格审查，不是一个全局“数据通过”标志。
2. Stage Producer只产生候选与证据；Gate Reviewer独立裁决；消费者Guard只检查当前资格是否匹配。生产成功、Studio保存、作者认可、运营发布、Agent自检均不能签发G资格。
3. 资格必须绑定`artifact_ref@revision × gate × purpose × scope × consumer(if applicable) × rule_version × dependency_snapshot × reviewer_identity × effective_time`。对象修订、用途、范围、消费者或依赖变化后，旧资格不得自动沿用。
4. G0—G5的PASS均为限定用途的资格，不是“内容绝对为真”。HOLD/REJECT/REVOKED/UNASSESSED含义严格分开。
5. 作品Reviewer/Operator与知识Gate Reviewer职责分离；Owner的战略裁决权不等于G签发权；工程师/CodeBuddy不因维护代码而拥有专业资格签发权。
6. 机器自动审核只有在原D/G权威明确批准的规则版本和范围内才可执行；规则未签核、Reviewer身份未绑定、策略版本缺失时默认HOLD，不得由KAD1替原责任方签发政策。

## 1｜资格对象与决策记录

**GateReviewRequest**至少含：`request_id,run_id,stage,gate_code,artifact_ref(type/id/revision),producer_method_id/version,definition_ref,input_hashes,output_hash,source_refs,lineage_refs,evidence_refs,purpose,allowed_scope,consumer,dependency_snapshot,ruleset_version,requested_at,requester_identity`。

**QualificationDecision**至少含：`decision_ref,architecture_generation,gate_code,artifact_ref@revision,purpose,scope,consumer,dependency_snapshot,decision,rule_version,reviewer_id,reviewer_role,evidence_refs,reasons,valid_from,valid_until_or_long_term_basis,previous_decision_ref,created_at`。字段为语义必需，不表示当前数据库已有对应列。

**五态**：
- `UNASSESSED`：尚无有效审查决定；不是默认通过。
- `PASS`：只在决定明确的对象修订、用途、范围、消费者和有效期内可用。
- `HOLD`：证据/权限/质量/策略不充分，可补证或定向退回。
- `REJECT`：该候选/用途不被接受；不得重试复用旧候选冒充新证据。
- `REVOKED`：既有资格因来源、权利、证据、规则或依赖变化被撤销；历史审计保留，当前消费阻断。

另设当前活动性投影：`active / stale / expired / blocked / revoked`，它不是第六种Gate裁决。

## 2｜六个Gate的独立职责与准入规则

| Gate | 对应阶段/L | 独立审查输入 | PASS所允许的事 | 典型HOLD/REJECT反例 |
| --- | --- | --- | --- | --- |
| G0｜来源准入 | D00/L0 | 来源作品身份、具体版本、数字载体/原件、取得范围、获取真实性、访问/引用/展示/下载/改编权利、来源依赖、项目范围。 | 允许指定来源/动作进入D01；不判断材料真伪或历史事实。 | 无原件/版本、只有目录却称全文、权利不明却请求下载/展示、同源复制冒充独立来源。 |
| G1｜读取质量资格 | D01/L1 | read_unit原件定位、覆盖/完整性、读取方法/工具版本、页序/结构、字符/数值/图像/音视频精度、可回放性、用途画像。 | 按搜索/引文/地图/数值/音视频等用途限定可供D02使用的读取单元。 | OCR疑字被隐藏、扫描页漏页、无locator、模型置信替代校核、一个用途PASS外推全部用途。 |
| G2｜材料理解资格 | D02/L2 | 材料类型、来源声音、作者/说话者/记录者、材料形成与事件时间、文体语境、原文主张、转引/同源、支持/反证和不确定性。 | 允许特定材料观察进入D03世界建构；不直接签发世界主张。 | 后世转引冒充原件、规定冒充执行、诉词冒充中立、模型摘要冒充原文、同源多本冒充独立见证。 |
| G3｜历史世界主张资格 | D03/L3 | 实体/事件/关系/状态主张、身份/时空、谓词、证据支持与反证、见证独立性、竞争解释、版本/依赖。 | 按七种世界用途限定解释、原图阅读、锚点、配准、重建、变化比较、关系解释。 | 同名合并、共现当关系、先后当因果、现代坐标冒充历史定位、无证配准/重建。 |
| G4｜人文解释资格 | D04/L4 | 解释问题、非同义理解增量、A方法、上游G3匹配用途、证据/反证、竞争解释、比较口径、时空与当下端时效。 | 按BE/BC/RF/PS/PL五种用途分别允许D05消费；不改写L3。 | 只换文风无理解增量、跨期不可比、共现冒关系、未知阶段补动画、同名同址冒延续。 |
| G5｜消费分面资格 | D05/L5 | L5修订、上游G3/G4用途、权利动作、scope、consumer、依赖快照、方法/规则版本、有效期、失效事件。 | 允许指定视觉舞台或Agent消费者在限定范围读取L5分面。 | Agent/视觉分面互相继承资格、引用权冒展示权、过期PASS、缓存复活撤权、P08自签G5。 |

## 3｜G3/G4/G5用途级规则

### 3.1 G3七种世界用途
- `world.explain_bounded`：有限主张/解释，须身份、时空、证据和反证边界可审。
- `world.show_original_region`：原件局部阅读，须原件版本、L1区域、来源许可；不自动授予高清下载。
- `world.map_anchor_link`：图面符号到历史对象的锚点关联，须有对应证据；同名/近邻不够。
- `world.map_registered_overlay`：注册叠加，须控制点、参数、残差、误差、年代与有效域。
- `world.reconstruct_bounded`：有限空间重建，须分段推理、替代候选和不确定区；创作图形不能当历史原貌。
- `world.change_compare`：状态变化比较，须同一对象/可比属性/两端证据；图像差异不证明变化原因。
- `world.relation_explain`：关系解释，须角色、方向、有效期、原文活动证据；同页共现不够。

### 3.2 G4五种人文用途
- `bounded_explanation (BE)`：有依据的有界解释；不自动授权史实重建或比较。
- `bounded_comparison (BC)`：对象、时期、指标、尺度和口径可比；不以单项解释PASS替代可比性审核。
- `grounded_relation_focus (RF)`：有证关系的观察焦点；不授予图像权利或历史地图配准。
- `bounded_process_sequence (PS)`：有证阶段及明确未知空白的序列；先后不自动成为因果。
- `qualified_present_link (PL)`：分层标记历史延续、受控类比、启发联想；同名同址不等于实体连续。

`return_to_evidence`和`agent_followup`是跨用途能力，不是第六/第七种G4资格；新的追问答案必须重新命中五用途之一或HOLD。

### 3.3 G5双读消费者

消费者至少区分`visual_stage`与`agent`。同一L5身份可以生成不同表达分面，但各自的`consumer/purpose/scope/rights/dependency_snapshot`独立审查。`audience`不替代consumer。舞台可展示某张图不代表Agent可复制/下载；Agent可引用文字不代表舞台可显示原图。G5只审消费资格，不创造上游事实或扩大G3/G4范围。

## 4｜Reviewer角色、职责分离和授权

| 角色 | 可做 | 不可做 |
|---|---|---|
| D Stage Producer/Executor | 生成阶段候选、证据包、质量报告、审查请求 | 不签发G资格，不自行写当前有效资格投影 |
| 墨痕Agent | 组织方法、准备候选、检查资格引用、发起受控请求 | 不签G，不绕过Reviewer/Guard |
| 外部AI受托者 | 在授权子任务范围产出候选、工具回执、来源/读取/理解线索 | 不持生产数据库凭据，不自签G，不直接写正式L/G |
| 独立Gate Reviewer | 依据有权批准的政策版本审核并追加不可变资格决定 | 不代替作者选题/导演，不作作品出版审批 |
| 运营负责人/作品Reviewer | 管理平台规则、风险升级、作品发布/退回/撤回 | 不因运营身份自动签G0—G5，不逐Stage代替专业审查 |
| 工程/安全责任人 | 实现Reviewer服务、数据库角色/RLS、Guard、审计和恢复 | 不决定历史事实、解释含义或自行批准Gate政策 |
| Owner | 批准价值方向、重大范围/预算/授权、产品体验和必要风险决策 | 不因Owner身份直接代签专业G资格 |

若同一自然人依法兼任多个角色，必须显式`active_role`、审计切换并满足政策独立性；不允许伪造第二审核人。机器自动审核仅限有权原D/G签核的规则集，且机器Reviewer身份/凭证与Producer分离。

## 5｜资格有效性、依赖变更和撤销

1. 每次消费前重新核对对象修订、用途、范围、consumer、规则版本、权利动作、依赖快照和有效期；缺任一关键匹配即BLOCKED/UNASSESSED。
2. 新修订不得静默继承旧PASS；需明确是否新审或按政策定义的有限兼容期。
3. 来源撤权/证据修订/身份拆分/规则变更/时效到期/依赖未知触发精准失效；先阻断受影响消费，再独立复审。旧审计保留但不可复活。
4. 未知依赖不能当空集合；无法计算影响闭包时，对受影响不明范围fail-closed，不能无证全局清空无关合法分面。
5. 资格变更是追加式审计；当前活动资格是受控投影，不能仅靠生产者`current_valid`布尔值自授。

## 6｜最小状态机和阶段交接

`Producer: READY→CANDIDATE_WRITTEN→EVIDENCE_SUBMITTED→REVIEW_PENDING`；`Gate: UNASSESSED→PASS|HOLD|REJECT`，已发资格可因后续事件转`REVOKED`；`StageHandoff: BLOCKED→ELIGIBLE→CONSUMED`。只有独立Reviewer对同一不可变候选修订签发匹配PASS且当前依赖/权利仍有效，才可ELIGIBLE。Stage Executor的raw `PASS`或exit code不得代替资格。

| 情形 | 后续阶段 | Studio/Agent | 消费者 |
|---|---|---|---|
| 候选未审 | 不交下一Stage | 可保存私有候选/补证 | 不公开为正式知识 |
| PASS且当前有效 | 允许限定交接 | 显示资格范围和依据 | 只在对应consumer/purpose/scope读取 |
| HOLD | 冻结该分支，允许补证新修订 | 展示最小补证和退路 | 不确定性表达不得冒确定结论 |
| REJECT | 不复用旧候选；可新建有依据的新候选 | 保留理由和申诉/重研路径 | 不消费被拒用途 |
| REVOKED/STALE/EXPIRED | 受影响分支重审 | 告警、替代资料或降级 | 先阻断再重审；旧缓存不复活 |
| Reviewer服务/政策不可验证 | 默认HOLD/UNASSESSED | 显示服务/政策阻断 | 不签发新资格；无撤权的合法旧分面按批准策略处理 |

## 7｜原D/G策略未签核事项（明确保留HOLD）

原R4.4提出的DG-R4-03仍须由原D/G治理责任方明确：`policy_version, reviewer_role_or_service, approved_machine_checks, escalation_rules, scope, consumer, cutover_and_rollback_rules`。KAD1只把专业规则重塑为新架构合同，不代替原责任方签发Reviewer身份、机审范围或政策生效决定。当前不得标记`GATE_ACTIVE`。

## 8｜设计级反例与未来测试

必须保留原R4.4 T01—T26全部回归场景和原R4.3 AT-01—16/A01—07；重点包括Producer自签、伪造Reviewer、无G资格跨Stage、用途/consumer错配、G2 HOLD公开、P08先阻断、旧PASS复活、D05新旧版本原子切换、发布审核与G5混同、run终态与DB写回不一致。上述仅为测试合同，真实执行归KAD4—KAD5。

## 9｜本合同的设计准出与工程边界

设计准出：G0—G5每门的输入、独立用途、Reviewer角色、决策字段、五态、消费者限制、依赖失效和反例均可直接执行；六门不混成一个总PASS；原D/G权威仍是政策签发Owner。

工程/运行HOLD：真实Reviewer身份、数据库GRANT/RLS、审计事务、消费者Guard、历史资格迁移、P08缓存阻断、26项R4.4测试及AT/X1真实执行均未因合同重塑写成PASS。

## 10｜26项独立Gate与Production Tool正反验收（新架构自足）

下表是本代直接可用于编制测试夹具的**规范性验收预期**，旧R4.4编号只作来源追溯。实测均为`NOT_RUN`，不得当作运行PASS。

| Test ID | 输入/触发 | 受控预期/禁止行为 | 当前运行状态 |
|---|---|---|---|
| G-T01 | 金泽/A001历史生产报告及两消费端基线核查 | 旧run、素材、投影与历史Gate记录可追溯；不宣称本轮重跑 | NOT_RUN |
| G-T02 | 创作者合法新专题Manifest、method Binding有效 | Tool准入成功，Runner/六Stage与既有Adapter复用，不需要逐篇JS更改 | NOT_RUN |
| G-T03 | Agent传入未经批准JS/URL路径作为Adapter | 入站拦截；不导入不执行 | NOT_RUN |
| G-T04 | 项目角色不符/项目过期/预算不足 | Tool拒绝；不触发DB副作用 | NOT_RUN |
| G-T05 | Registry job=false、顶层=true冲突或策略缺失 | 受信有效政策未明确时新Agent任务HOLD，差异可追溯 | NOT_RUN |
| G-T06 | 63方法中绑定缺失的任意方法 | `METHOD_BINDING_UNAVAILABLE`，不谎称已执行 | NOT_RUN |
| G-T07 | Adapter回`PASS`但没有独立Gate记录 | 禁止下一Stage交接，运行保持WAITING_GATE/HOLD | NOT_RUN |
| G-T08 | Adapter/Agent直接写资格表尝试 | 数据库或服务权限拒绝，并有审计 | NOT_RUN |
| G-T09 | 伪造Reviewer身份/证书/旧签发证据 | 拒绝资格，记录不可抵赖拒绝原因 | NOT_RUN |
| G-T10 | 通过获批策略自动机器Reviewer G0—G5 | 每Stage独立审核、有审计、合法后交接，无逐条运营人工审批 | NOT_RUN |
| G-T11 | 高风险/政策要求的独立人工复核 | 只针对条件命中对象升级；运营负责人不自动成为G Reviewer | NOT_RUN |
| G-T12 | G0缺来源版本、版权、下载权或方法profile | HOLD并给合法最小补证，不得强行采集 | NOT_RUN |
| G-T13 | G1/G2读取单元与证据锚点断裂 | 不得递交D03或伪造原件引用 | NOT_RUN |
| G-T14 | G3冲突未决、来源独立性不足 | 不冒事实PASS；限定目的或HOLD由原专业政策决定 | NOT_RUN |
| G-T15 | G4解释超出上游资格/以导演文案替代历史事实 | HOLD解释资格；不污染正式world层 | NOT_RUN |
| G-T16 | G5对象revision、purpose、scope、consumer不匹配或过期 | Agent/visual_stage分面均拒绝非法读取，未受影响分面保持 | NOT_RUN |
| G-T17 | 新D05开始生成但Gate故障或HOLD | 新读模型不激活，合法旧版本继续服务 | NOT_RUN |
| G-T18 | 新D05得到独立G5通过 | 按对象/分面原子切换可见性，无旧版/新版竞态双激活 | NOT_RUN |
| G-T19 | 来源撤权或版权变化（P08） | 受影响分面先BLOCKED再重审；其它分面不牵连；旧PASS不复活 | NOT_RUN |
| G-T20 | 同键并发Reviewer、超时重试、冲突snapshot | 唯一当前资格、版本冲突报错、无隐性签发覆盖 | NOT_RUN |
| G-T21 | 运行终态已完成但DB终态回写失败 | Tool报告状态不一致并标记待对账；不得声称业务已可靠持久化 | NOT_RUN |
| G-T22 | HOLD后申请从D03恢复，输入/政策/依赖变动 | 复查前序合法资格、checkpoint；不接受用户自填resume_input | NOT_RUN |
| G-T23 | 旧样板/历史资格迁移：旧记录缺独立Reviewer元数据 | 留证、差异及准入策略；不批量抹除、不无证自动转新PASS | NOT_RUN |
| G-T24 | 功能回滚：新Gate异常但旧许可证已被撤销 | 停止新任务，合法旧服务可保留；已撤权旧内容不能复活 | NOT_RUN |
| G-T25 | P08独立控制与D05混绑 | 独立控制生成HOLD+控制请求；混绑不执行失效，不误认为Gate PASS | NOT_RUN |
| G-T26 | 创作者交稿与运营作品审核 | 作品审核独立于G5；运营不参与选题/导演且不逐Stage人审 | NOT_RUN |

## KAD6｜候选提交、独立签发、动态消费与KAD5真实资格验收

- `control.gate_candidates`仅承载Producer按`run_id/stage/gate/artifact_revision/purpose_namespace/code/version/allowed_scope/consumer/dependency_snapshot/evidence_refs/input_fingerprint`提交的资格**候选**；该表不是第二个Gate，也不是合法PASS；现main repository代码已引用此表但当前实库未部署，必须以当前真实schema补迁移并回归，不许退回Producer直接写`gate_audits`。
- 独立Reviewer的授权身份与签发事务仍是唯一`control.gate_audits`决定Owner。必须校验`revision,purpose,consumer,action,policy,valid_from/valid_until or long_term_basis,dependency_snapshot,rights,independence`并保留不可变旧裁决；`result=PASS/current_valid=true`不足以满足全部资格。撤权先由Guard拒消费，合法不受影响分面保持独立，历史PASS不因回滚复活。
- Studio `SaveRevision`保留候选不需要假G，`RequestFormalProduction`必须有合法上游资格及可定位来源/原件；外部AI回包仅经过T1—T7进入研究候选或拒收。发布作品另需作品运营审及媒体操作许可；WATCH与Agent/visual_stage的G5用途和consumer不能互授。
- 工程强制反例`G-K6-N1`Producer或Operator自签G；`N2`无gate_candidates物理表而报告签发成功；`N3`合法书目却无原件申请逐字引文；`N4`当前资格只按历史PASS查询；`N5`撤权后旧缓存继续；`N6`工程回滚恢复了已撤资格。KAD6仅签完整设计规则，真实事务/权限/并发/撤权各须工程`NOT_RUN→PASS/FAIL`实测。

## 11｜旧BR正式边与历次Gate证据的保护（继承补核）

原BR图谱曾记录325条正式边、201项条件性设计批准及124项HOLD（其中56项延期关系）。这些均为**当时历史版本/原评审范围的证据**，不构成当前`main`运行时可用的资格表、权限或可释放许可；不得静默抹除、自动晋级或仅按编号决定当前消费。对应历史`edge_id`、`release_requirement`及原Gate证据须保留可追溯；若未来要消费或恢复，应按现行MHKA、资产修订、用途、范围、消费者、Reviewer和实际部署状态重新审查。

本合同的源码映射须区分：(a)机器`gate-contracts.v3.json`的设计规则；(b)`control.gate_candidates`的Producer候选与`control.gate_audits`的独立审计职责；(c)数据库中是否真正迁移和授予独立Reviewer权限；(d)当前Guard消费是否逐项校验资格；(e)旧样板G0—G5 PASS与新架构G0—G5真实PASS。这五项绝不因同一目录或Gate代码存在而合并。M5施工按Owner 2026-11-06裁决暂停，本次只写规范、不触及配置/Skill/执行器/SQL/权限。
