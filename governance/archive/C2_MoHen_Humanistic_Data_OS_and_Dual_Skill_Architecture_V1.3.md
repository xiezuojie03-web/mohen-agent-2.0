# 墨痕 · Humanistic Data OS 与双 Skill 架构 V1.3

**版本：V1.3 · 2026-10-15**  
**定位：C2 Professional Constitution / Humanistic Data OS 与能力架构基线**

> **状态：REVIEW_DRAFT_NOT_APPLIED｜2026-10-15（Asia/Shanghai）。** 依据用户本轮指令编制；供本轮架构终审与用户审核，尚未替换GitHub或成为运行切换事实。
> **原文基线：** `xiezuojie03-web/mohen-agent-2.0`，`handoff/local-b-20260930`，提交`8966d1bf62d7c2ea199d6568cc1b16bba664bd26`；原路径`governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.2.md`；Git blob `80163d310f4b8a253a22a6f4930f0aaa72da7454`；原文SHA256 `30df74e79508d2b6c59027c426aef9f1868e89e2c31ee0d21f0de1fed9daa55f`。
> **目标工程路径：** `governance/C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.3.md`。旧版本依R14归档并留替代关系；本稿中的仓库相对路径按未来工程落点解释，不能视为当前Library文件相对位置。

# 1｜最高目标

以可信、可关联、可发现、可体验的人文文化世界，让人在历史文化中发现今天生活的意义、乐趣、文化根源与个人共鸣。生产完备性服从这一目标，不以资料数量、方法数量或地图复杂度代替产品价值。

# 2｜双Skill系统与复用

| 系统 | 职责 | 边界 |
|---|---|---|
| Developer Skills | 在用户授权与独立Gate下生产L0—L5及专业方法成果 | 各阶段只写自己的L成果；不自行签发资格 |
| Agent Skills | 只读合法发布成果，理解意图、比较、解释、引导、追问与Replan | 不制造历史事实、不反写Truth |
| Humanistic Data OS | L0—L8长期生产、消费和受治理反馈 | Runtime、Memory、Truth分离 |

## 2.1 实体化与唯一实现

正式能力须有SKILL.md、固定entry、输入输出/读写范围/独立Gate/停止与失败合同、Registry实现映射和测试。一个能力只有一个canonical implementation；复用优先，重复实现合并并归档，禁止为63方法机械生成63个Stage Owner或executor。

复用Skill可跨阶段调用，但一个L成果只有一个生产阶段Owner；资格审计有独立Gate Owner。Registry须可追踪Skill↔entry↔job↔method_id/version，不能以文件存在冒充方法实现。

# 3｜唯一六阶段主线：D00—D05

| 阶段 | 专业职责与输入 | 唯一成果Owner | 独立出口 |
|---|---|---|---|
| D00 来源发现与准备 | 研究意图/范围；渠道、检索、获取、身份、版本、权利、依赖、原始资产保全 | L0来源/原始资产包 | G0来源资格 |
| D01 载体读取 | 当前合法来源资产；C01—C08按载体技术读取、保真、完整性及局部定位 | L1版本化读取内容 | G1读取质量 |
| D02 材料理解 | 当前合法L1；H01—H25按材料类型深读、恢复结构、声音、观察与证据陈述 | L2理解观察与证据 | G2理解/证据质量 |
| D03 历史世界构建 | 合格L2及所需依赖；W01—W10身份、时空、事件、关系、过程、冲突与一致性 | L3世界主张/修订 | G3世界完整性 |
| D04 人文发现 | 有相应用途资格的L3；A01—A12比较、关系、解释、问题、理解增量与当下联系 | L4人文发现与解释 | G4发现/解释质量 |
| D05 可信发布 | 依各发布动作选择合法L3事实、L4解释与证据链；P01—P08 | L5六类派生读模型及控制请求（分Owner） | G5发布资格 |

不另建Discovery/Directed、Research Workspace或N01—N06并行生产链；broad/directed只是阶段内部策略，attended/unattended只是执行模式。

## 3.1 D00：来源准备

不以数量代替价值；来源可宽进登记，但元数据线索不冒已取得原件。保留原始资产与版本、访问/研究/展示权利、转引依赖与可获得级别；支持反证搜寻、替代渠道和可解释停止。D00不读出历史含义，不因身份可追溯即授予所有下游用途。

## 3.2 D01：载体读取

技术读取与历史理解分层。C方法产生可复查内容、页面/区块/时间定位、完整性与未读区域，不把OCR、题名、AI补字、视觉标题当理解或证据。原始资产与读取修订不同身份；主C不能替全部子载体质量画像。画像未批准、原件定位缺失、输入资格/用途不匹配即阻断。

## 3.3 D02：材料理解

H方法恢复材料结构、作者/编者/转引声音、原文与规范化陈述、支持范围及不确定性；复合与嵌套文献逐单元处理，引用链不能伪造来源独立性。L1读取不是L2证据；L2材料陈述不直接证明历史世界事实。Evidence Fragment与Claim Evidence Link仍分开。

## 3.4 D03：世界构建

W方法可联合调用但须逐输入/决策/修订回放。Mention≠Entity，Event≠Change，结构关系≠文化关系，现代坐标≠历史位置，Candidate≠Adjudicated。保留支持/反证、竞争身份、历史空间精度和时间语义；事实裁决归D03/G3，不交发布阶段补造。

## 3.5 D04：人文发现

co-occurrence≠relation，score≠truth probability；L4不能反写L3事实。A方法保留counter-signal、alternative explanation、missing evidence、understanding_delta与现实端依据。五母题是非排他的深化视角，不是事实Gate、来源过滤器或强制故事模板。G4用途资格不得替代G3事实资格。

## 3.6 D05：可信发布

P01—P08以P5现行专业规范为定义，PD1—PD7是既有BR职责/控制接点，不是P方法别名。P01—P07生产选入包、内容候选或消费分面；P08计算失效影响并请求控制/复审，不能自授G5或成为第七类L5内容。

六类L5为world_projections、agent_contexts、story_seeds、discovery_paths、map_timeline_projections、evidence_pointers。P02世界投影只取合法L3/G3事实；L4解释走P04等相应分面并保留G4用途；不能强制世界事实投影虚构G4解释，也不能让A→PD1解释直接充当事实。G5不扩大上游权限。

# 4｜阶段交接与失败回退

每阶段均为Entry→Work→Output→独立Gate→Disposition→合法消费者。**必要且匹配的当前资格只是消费前提，不是充分条件**：还须方法版本、输入类型、目的、范围、消费者、有效时点与依赖快照一致。不得将“上一步PASS”理解为整阶段全体对象自动可用，也不得让每个发布动作机械依赖无关解释阶段。

方法生成成果，Gate独立作资格裁决；数据不经Gate物理转运。资格状态PASS/HOLD/REJECT/REVOKED/UNASSESSED，与候选/已裁定认识状态、Guard的ELIGIBLE/BLOCKED、Human Review的ACCEPT/DEEPEN/DROP分别保存。非PASS不可当正式消费许可。

失败须给原因、证据定位、最小补证责任阶段/方法和受阻消费者；不允许下游擅改上游成果。来源重取回D00、读取缺口回D01、理解错误回D02、事实/解释冲突回各Owner；已合法来源局部重算不必无理由全链重启。回滚先关新入口，仅仍合法旧修订/路由可恢复，不复活已撤资格/缓存。

# 5｜Machine Gate与Human Review

独立Gate检查资格、来源/版本/定位、质量与权限；方法执行者、消费者和Guard不得自授通过。用户只看叙事支撑统计、真实内容、缺口与反例，判断ACCEPT/DEEPEN/DROP；技术正确性、逐字段/逐关系/算法审计由承担专业审查和工程技术自检的工具负责。

# 6｜L0—L8长期地图

L0来源与原始资产；L1技术读取；L2理解证据；L3历史世界；L4人文发现；L5可信发布；L6体验Runtime；L7参与；L8当代文化新痕迹。逻辑编号不是物理Schema/表名。L8回D00须重新核验来源和权利，参与贡献不自动成为历史事实。L7/L8物理产品化仍HOLD，编号明确不授权建社区或新Schema。

# 7｜Living Cultural Relationship Model

关系须有对象/谓词、时间/空间条件、证据、认识状态、冲突、意义连接、表达边界和后续发现能力。结构连通不等于专业成立；正式325关系和候选设计不同。56延期关系持续DESIGN_HOLD，设计审查不释放正式边。

# 8｜Agent与视觉舞台双读

两者消费同一L5修订的各自合法分面，共享事实身份、证据与限制，不得一边撤权另一边继续用同一已失效资格。L6不写Truth；Evidence on Demand沿实际依赖返回L4（若有解释）/L3→L2→L1→L0，路径可跳过不适用层但不可省略实际依赖或伪造解释。舞台显示权与Agent引用权分别核查。

上游改版/权利变化/资格失效时按修订×用途×范围×消费者×依赖快照×有效时点立即阻断受影响消费；独立有效分面保留。P08/PD7/Guard无需先拿新G5 PASS才可阻断，独立Gate随后追加审计，不删历史。

# 9｜专业权威与工程承载

C0/C1保持上位；本C2与C3授权工程协议、`specs/data-production/standards/d00/`—`d05/`的现行阶段标准及相应合同承载细则，准确文件清单见11契约矩阵§8.4。C/H/W/A/P定义由对应专业规范负责，BR-M2方法路由、M3成果Owner、M4独立资格、M5全链衔接不得各自改写方法。

原文身份/版本/散列/条款、工程方法版本及实现绑定可反查。Skill、协议、Registry/Schema、Adapter/Executor、Guard、测试须联动一致；参数/阈值按载体画像与用途版本化，不把任意数值或旧样板默认值升为宪法。真实实现路径、数据库列/键、命令与运行能力未核部分TO_VERIFY_IN_M0。

# 10｜本版冻结与采用条件

- 唯一六阶段D00—D05，生产L0—L5及独立G0—G5；不恢复旧双主线。
- Developer/Agent分权，C/H分层，方法产出与Gate资格分离，唯一成果Owner。
- 五母题不替事实裁决，逻辑层不等于物理重命名，宽进登记不等于宽松发布。
- 每阶段Machine Gate与Human Review分开；用户终审业务与体验，工具负责专业/工程审计。
- 本稿待用户审核；新运行链尚未切换。真实G5与MIG-01 HOLD；56正式延期边DESIGN_HOLD。
- 旧五阶段运行样板不推定新六阶段通过；采用/切换和回退按C0 §12，普通工程问题自主处理，重大目标/架构/风险交用户。
