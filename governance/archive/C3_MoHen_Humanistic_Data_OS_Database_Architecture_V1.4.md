# 墨痕 · Humanistic Data OS 数据库与文化世界架构 V1.4

**版本：V1.4 · 2026-10-15**  
**定位：C3 Database & Cultural World Constitution**


> **状态：REVIEW_DRAFT_NOT_APPLIED｜2026-10-15（Asia/Shanghai）。** 依据用户本轮指令编制；供本轮架构终审与用户审核，尚未替换GitHub或成为运行切换事实。
> **原文基线：** `xiezuojie03-web/mohen-agent-2.0`，`handoff/local-b-20260930`，提交`8966d1bf62d7c2ea199d6568cc1b16bba664bd26`；原路径`governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.3.md`；Git blob `39c76afccce349f89713af37f32b4a49ae2b9561`；原文SHA256 `8451c1d382e12d5a408519831f4cb3b071f66bb98e40ec24d36f9f1600870d02`。
> **目标工程路径：** `governance/C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.4.md`。旧版本依R14归档并留替代关系；本稿中的仓库相对路径按未来工程落点解释，不能视为当前Library文件相对位置。

> 六阶段D00—D05各生产一个主要L层，L0—L5成果由唯一阶段Owner写入，G0—G5独立裁决资格；L6—L8是下游运行与长期反馈层，不是额外生产Stage。

# 0｜数据库核心命题

数据库不是为了把历史“装进去”，而是为了让墨痕能够在证据边界内持续形成可信文化世界、发现文化关系、产生受约束的人文理解，并把过去重新连接到今天。

四条数据库宪法继续冻结：

1. **Evidence before Knowledge**；
2. **Fact–Interpretation Firewall**；
3. **Geometry is a Claim**；
4. **Stable Truth, Variable Experience**。

另外增加两条结构原则：

5. **Stage–Layer Alignment**：一个 D 阶段只负责一个主要 L 层，一个 L 层不跨 D 生产责任；
6. **Logical Separation without Lineage Break**：Candidate/Adjudicated 可在同层分状态，但全链 lineage 必须不断。

# PART I｜九层长期数据地图

| 层/生产Owner | 核心内容 | 不得冒充 |
|---|---|---|
| L0/D00 来源与原始资产 | source identity/version、provider、raw、rights、provenance、获取状态与依赖；Raw保全 | 来源身份不等于已读懂或历史事实 |
| L1/D01 读取内容 | C方法版本、可读单元/区域、页面/时间定位、原貌/完整性/缺失、技术画像与原件引用 | OCR或补字不等于理解证据；读取修订不同于原始资产 |
| L2/D02 理解观察与证据 | H方法、结构单元、source_voice、原文/规范化陈述、支持范围、locator、uncertainty与依赖 | 材料陈述不直接等于世界事实；Evidence Fragment≠Claim Evidence Link |
| L3/D03 历史世界 | Entity、Event、RelationClaim、Change、HistoricalSpaceClaim、ExternalCulturalNode、视觉文化对象；支持/反证与认识状态 | Mention≠Entity，Event≠Change，结构关系≠文化关系，现代坐标≠历史空间 |
| L4/D04 人文发现与解释 | finding、meaning、comparison、open_question、alternative_explanation、understanding_delta、present_connection | 解释不反写L3，分数不是历史真伪概率 |
| L5/D05 可信发布 | 六类派生、可重算、只读模型，绑定来源及上游修订/资格/用途 | 不是真相单一真源，不新增事实；候选写入不等于公开发布 |
| L6/Runtime | ExperienceState、CompositionState、Action、Trail、Replan | Agent Memory、Runtime状态不等于Truth |
| L7/Participation | 观察、行走、记录、贡献、口述、策展、分享 | Contribution≠Truth；物理产品化HOLD |
| L8/Living Culture | 当代实践、记忆、新文化痕迹及受治理反馈 | 回流重新经D00，不能直写L2/L3；Schema/Community HOLD |

六类L5：world_projections、agent_contexts、story_seeds、discovery_paths、map_timeline_projections、evidence_pointers。P08控制事件和Gate审计归control职责，不是第七类内容。具体对象与方法原文见各P成果资格合同，物理表名按PART VIII核验。

# PART II｜六个同轴且独立的Gate

| Gate | 独立资格职责 | 失败/禁止 |
|---|---|---|
| G0/D00/L0 | 来源/资产身份、版本、rights、provenance、raw完整性、获取及操作用途 | 登记线索不授予读取/展示全部权限 |
| G1/D01/L1 | 技术读取正确/完整、原件局部可回放、载体及子画像批准、缺失与不确定性 | 主C不替所有子C；DRAFT画像或定位断链阻断 |
| G2/D02/L2 | 类型理解、声音/转引依赖、证据陈述与引用适用性 | 不裁决世界事实，不把同源转引计多源 |
| G3/D03/L3 | 身份/时空/事件/关系/变化/空间主张及支持反证；按七用途核定世界消费 | 事实裁决不延后到G5；不混G4五用途 |
| G4/D04/L4 | 事实基础、解释边界、替代解释、认识增量及现实依据；五用途 | 有界解释/比较/关系焦点/过程序列/当下联系分别限定；不替G3事实资格 |
| G5/D05/L5 | 发布修订、上游资格/定位/权利、用途映射、scope/consumer/时点及双读限制 | 不扩大上游许可；世界投影不虚构G4，解释不偷渡事实 |

方法Owner写成果；独立Gate Owner写资格和追加审计；Guard只读判断当前ELIGIBLE/BLOCKED，不伪造Gate审计。资格五态PASS/HOLD/REJECT/REVOKED/UNASSESSED，不与对象认识状态或Human Review混用。

最小资格键为`artifact_revision × purpose(namespace/version) × allowed_scope × consumer × dependency_snapshot × effective_time`，另携gate/rule/method/binding版本及证据定位。旧五门与新六门须分架构代际，不能仅加减编号继承PASS。默认无有效匹配裁决即不可消费；null、未审、到期、范围错配不默认可用。

R15晋级原则保留但不先固定物理审计表：任何正式可用对象都须有对应独立Gate证据。`evidence_gate_audit`是旧承载线索，实际表列、约束和多门分表/共享方案TO_VERIFY_IN_M0，不把历史名字当已核Schema。


# PART III｜状态与成熟度

## 3.1 统一成熟度原则

不再使用“Research World vs Truth World”两套顶层状态系统。

每个 L 层内部可以具有自己的成熟度状态，例如：

`candidate → reviewed/adjudicated → eligible`

具体枚举可按对象类型不同，但必须满足：
- 状态含义明确；
- 不允许通过名称暗示超出证据边界；
- 晋级必须留下 Gate 记录；
- 失败/HOLD 不删除原始 lineage。

## 3.2 Candidate Reservoir ≠ Human Review Queue

候选可以大量存在，但不能全部制造人工债务。只有 narrative-critical、promotion-critical、conflict-critical 或明确需要人工判断的对象进入内部 adjudication queue。

项目拥有者 Human Review View 与内部 queue 分离：前者看叙事成果，后者处理机器无法裁决的技术/证据问题。

# PART IV｜核心文化世界对象模型

## 4.1 Entity
统一人、地、物、机构、文本、建筑、器物等对象身份；允许历史别名、模糊时空范围与 candidate 状态。

## 4.2 Event 与 Change
Event 表示发生了什么；Change 表示对象/关系从什么状态变成什么状态。两者不得合并。

## 4.3 RelationClaim
文化关系必须记录 subject / predicate / object、时空条件、Evidence、认识状态、冲突、Meaning 引用和表达规则。

文化关系须保持一个逻辑真源。旧`relation_claim`为候选物理承载，不据名称宣称实际表存在或允许删并数据；真实承载与去重迁移按PART VIII和M0核验。

## 4.4 Epistemic Status
至少表达：supported、candidate、conflicted、interpretive、open_question、unsupported。Runtime 表达必须与状态一致。

# PART V｜时间、空间、视觉

## 5.1 TemporalScope
必须支持确定时间、约略时间、区间、相对年代、原文纪年与 confidence。

## 5.2 Historical Space ≠ Historical Geometry
modern_location、historical_space_claim、historical_geometry、spatial_anchor、reconstruction_geometry 语义继续分离。

## 5.3 Visual Asset
creation_date 与 depicted_period 分离；来源、rights、对象关联、空间对应、可信度与体验用途必须可追溯。AI生成图像不得冒充历史证据。

# PART VI｜Lineage与精准撤权

解释发布可沿L5→L4→L3→L2→L1→L0返回；纯世界事实投影可沿L5→L3→L2→L1→L0，不强造L4。所有路径必须保留真实依赖、原件局部锚点与方法/规则版本，不能因为逻辑隔离丢失lineage。

正向生产：D00来源→D01读取→D02理解证据→D03世界→D04人文发现→D05按动作选择合法输入发布。并非每个方法或对象必须机械走全链；实际依赖必须完整并受相应资格约束。

来源换版、权限变化、证据失效、世界/解释修订和有效期到期，按实际反向依赖计算受影响修订/用途/范围/消费者。立即拒绝已失效读取，独立Gate随后追加审计；不等待新G5 PASS才停用，不删旧记录。不明依赖涉及的请求失败关闭，独立已证未受影响分面保留。重新发布生成新修订、新裁决；并发/缓存/原子停用需工程验收。

# PART VII｜Agent/UI消费与反馈

默认以匹配G5的L5分面供Agent/舞台读取并形成L6运行体验。两消费者共享事实身份、证据与限制，但展示、引用等资格分别核对；L6不反写L0—L5。Evidence on Demand只读回溯，不允许UI跨底层表自行拼造事实解释。

L7参与和L8新痕迹不自动进入历史知识；值得回流者经D00核来源/版本/权利及后续必要阶段。仅重新投影已有合法来源时，按依赖与Owner补算，不无理由重采全部资料。不新增Participation/Living Culture Schema许可。

**消费层数据访问（2026-10-18 样板试验收口确立）**：L6 消费层（Agent/视觉舞台读 L5 分面）经 `packages/data-access` 的 **node pg 只读通道**访问（`DATABASE_URL` 直连，适配 serverless/云端）；D00–D05 生产链写库仍走 **psql 二进制**（本地离线、确定性、零运行时依赖）。生产链与消费层访问方式分离——写路径不引入运行时 npm 依赖，读路径不依赖本地 psql 二进制。云端 Supabase 一律经**连接池 pooler（IPv4）**访问（`aws-0-<region>.pooler.supabase.com`，user=`postgres.<ref>`，SSL），不用直连域名（IPv6-only，IPv4 环境不可达）。

# PART VIII｜逻辑到物理及迁移边界

本版定义逻辑职责，未执行DDL或数据迁移。旧L0保持来源，旧混合读取/理解须区分新L1与L2；旧L1证据→新L2、旧L2世界→新L3、旧L3解释→新L4、旧L4读模型→新L5、旧L5/6/7下游→新L6/7/8。旧D02混合读取/理解能力按C/H拆分，不只是改号。

`source/evidence/world/meaning/read_model/control`及旧表名是规划复用线索；逻辑改号不强制Schema/表重命名。优先复用同功能对象、适配字段/约束/权限；新L1若需独立版本化实体，先给必要性、唯一Owner、引用、索引、回填、对账、失败及回滚合同，再由M0确认真实表列/FK/唯一键/视图。不能把raw覆盖为读取结果。

真实路径、数据库Schema、部署迁移记录、当前审计承载及数据保护清单未核部分统一TO_VERIFY_IN_M0。本轮GitHub锁定工程文件基线按用户2026-10-16确认的同步停工状态直接采用，不再核GitHub/本地差异；PG部署实况仍须实际证据。旧运行样板不证明新六阶段通过。

迁移M0只读核验；后续写入需用户授权。先将目标宪法/协议/Registry/Gate/Owner及消费者一致接入，再按受控批次验证。失败关闭新入口，旧链仍合法才可恢复；禁止恢复已撤资格/缓存、删除原始资产或历史审计。56正式延期边DESIGN_HOLD，真实G5和MIG-01 HOLD；本稿不授予运行准出。


# PART IX｜数据库验收

数据库验收重点：
- Traceability；
- Epistemic Honesty；
- Temporal Honesty；
- Spatial Honesty；
- Relation Depth；
- Meaning Firewall；
- Present Connection；
- Agent Usability；
- Stage–Layer Alignment；
- Lineage Integrity；
- Human Debt Control。

# 附录｜一句话记住 C3

原始资料不等于证据；证据不等于事实；事实不等于解释；解释不等于可消费表达；可消费表达也不能反向改写真相。每一步都有自己的数据层和 Gate，但所有结果必须能回到原始来源。
