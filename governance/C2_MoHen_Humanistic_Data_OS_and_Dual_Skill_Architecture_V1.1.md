*Humanistic Data Operating System × Developer Skills × Agent Skills*

版本定位：**V1.1 · 2026-10-03**（继承自 V1.0 · 2026-09-26）｜C2 Professional Constitution。继承早期三层架构与 Roadmap 中已被验证的设计，并以 C1 V1.0、**C3 V1.2**、C4 V2.1 的当前术语和治理边界为准。

> **V1.1 正式升版：2026-10-03 · 已生效**
> **裁定依据**：项目拥有者 2026-10-03 确认 **R-DP-01～R-DP-05 全部通过**（登记见 `CURRENT.md` §12 **R16**；对照与文件清单见 `tasks/results/DATA-PRODUCTION-RECON-20261003-result.md`）。本节自确认之日起**生效**，不再是候选稿。
> 依据《墨痕 · 数据生产链架构审查与修订结论 V1.1》§5（C2 应怎样修）。本轮新增：**两种生产模式（Discovery Research / Directed Production）**、**四个世界分离**、**Developer-side Research Discovery 与 Agent-side Runtime Discovery 的命名分离**、**Humanistic Selection**、**Research Production 与 Truth Promotion 分权**、**Developer Skills 七段职责**与**五条分界语句**。
> 本轮**不新增宪法文件、不改 C1 的 H2 主 Horizon、不动 C0/C4**；亦**不越权改写 C3**——Research Workspace 的物理形态由 **C3 V1.2 §2.9** 承载。
> **版本源唯一（C0 §10）**：本文件由 V1.0 升为 **V1.1**，同一次 Architecture Reconciliation 已同步 `AGENTS.md` §1 与 `CURRENT.md` §10 的全部路径引用；**禁止孤立改名导致路由断链**。

文档职责：回答五个问题——人文数据操作系统是什么；Developer Skills 是什么；Agent Skills 是什么；资料怎样被研究、被精选与被证成；三者怎样形成墨痕的长期能力。

> **核心判断：Developer Skills 负责“把可信的人文世界建出来”；Agent Skills 负责“带用户在这个世界里探索”；人文数据操作系统是两者共同依赖、持续生长的文化世界底座。**

> **状态入口（Live SOT）：当前 Proven / Gaps / HOLD 与施工决断以 `CURRENT.md` 为准；本文件只维护冻结的 Humanistic Data OS 与双 Skill 架构基线，不重复维护当前状态。**

# 1｜为什么需要“人文数据操作系统”

墨痕长期要处理的不是一批网页文章，而是不断进入的新资料、新地点、新人物、新事件、新图像、新地图、新考古发现与新问题。如果每增加一个主题都重新做页面、重新写故事、重新配置 Agent，项目会退化成内容站。

因此，真正需要长期建设的是一个可持续工作的中间层：它能把散落的文化资料转化为可追溯的证据，再组织为时间、空间和人文关系，并进一步形成“为什么值得看”“为什么与今天有关”的可探索世界。

> **人文数据操作系统 ≠ 大数据库。它是一套把文化资料持续转化为“可信、可关联、可发现、可体验、可回到今天”的生产与运行机制。**

## 1.1 最高目标

墨痕不是为了给历史世界做一个数字复制品，而是建立一个“活的文化关系模型”，帮助今天的人重新发现自己与过去的连接。

最高产品方向：墨痕帮助人从历史文化中发现与当下生活的连接。时间、空间、地图、时间轴、典籍、图像、考古、路线和故事都是方法与媒介，不是最终目的。

## 1.2 八层长期 Humanistic Data OS：六层当前核心 + 两层长期循环

| **层**                           | **回答的问题**     | **主要内容**                                                                 |
| ------------------------------- | ------------- | ------------------------------------------------------------------------ |
| L0 Cultural Sources             | 我们拿到了什么？      | 馆藏/开放数据/地方志/古籍/地图/照片/档案/考古资料/现代现场资料；只采集，不自动等于事实。                         |
| L1 Evidence & Provenance        | 我们凭什么这么说？     | Source、Fragment、Evidence、出处、引文、时间、可信度、不确定性、来源传统与冲突。                      |
| L2 Humanistic Objects           | 历史文化世界里有什么？   | 人物、地方、事件、时间、器物、典籍、建筑、制度、产业、文化现象等。                                        |
| L3 Cultural Relations           | 它们为什么彼此有关？    | 空间、时间、人物、功能、文献、变化、影响、同代比较、跨地域联系；关系本身也必须可追溯。                              |
| L4 Meaning / Present Connection | 为什么值得今天的人继续看？ | Meaning、Present Connection、Open Question、Human Angle；解释不能反向制造事实。         |
| L5 Discovery / Experience       | 此刻怎样发现并经历？    | Discovery Candidate、Experience State、地图/时间/图像/证据/叙事编排、追问、Replan、路线、现场观察。 |
| L6 Participation                | 人怎样从理解走向参与？   | 观察、行走、记录、个人探索轨迹、贡献、策展、分享；当前是长期架构层，不等于当前产品功能。                             |
| L7 Living Culture               | 文化怎样继续活在今天？   | 当代实践、地方记忆、新文化痕迹；必须经 Provenance / Evidence / Human Review 才能受治理地回流文化世界。   |

## 1.3 从资料到生活，再回到文化世界的主链

Cultural Sources → Evidence → Humanistic Objects → Cultural Relations → Meaning / Present Connection → Discovery / Experience → Participation → Living Culture → New Cultural Traces ↺ Evidence / Cultural World

Evidence 之后不能直连 UI。中间必须保留 Cultural Relation、Meaning / Present Connection 与 Discovery，否则系统会变成“有证据的历史展示器”。长期还必须为 Participation 与 Living Culture 留出治理位置：人的观察、行走、记录与实践可以形成新的文化痕迹，但不能自动晋级为历史事实。

## 1.4 四个世界必须分开（2026-10-03 新增，冻结）

L0–L7 描述的是**文化世界自身的生命周期**；但生产一个文化世界时，至少有四类语义世界必须分开，否则“可能的世界”会被误当成“可信的世界”。

| **世界**                  | **回答的问题**         | **典型对象**                                                                            | **边界**                             |
| ---------------------- | --------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| **Source World**       | 我们实际拿到了什么       | Source / Version / Raw / Rights / Provider / Locator / Checksum                      | 材料不等于事实；只采集不判断。                    |
| **Research World**     | 材料里读到了什么、可能怎样相关 | Observation / Mention / Source Dependency / Signal / Association Candidate / Conflict / Pattern / Research Question | 允许低确定性，但必须可回放；**0 自动 Truth Promotion**。 |
| **Truth / Cultural World** | 哪些对象、关系、变化经证据与 Gate 成立 | Evidence-backed Claim / Cultural Relation / Change / Historical Space Claim          | 进入 Runtime 的可信底座；由 G0–G6 与 R15 统治。 |
| **Experience World**   | 当前用户怎样经历可信世界    | Meaning / Present Connection / Runtime Discovery / Narrative / ExperienceState      | 只消费受控世界；**不得反向制造事实**。              |

> **Research World 不是 C3 的“第九层”，也不是 L0.5 / L1.5。** 它是跨 L0/L1/L2 **之前与之间**的**工作区**，用于承载“可能的世界”。
>
> **双图原则**：**Truth Graph** 保存已经证成的世界；**Observation Graph** 用来寻找可能的世界。两者必须逻辑分离，不得混为同一张图。

## 1.5 两种生产模式：Discovery Research 与 Directed Production（2026-10-03 新增，冻结）

“宽进 → 广联 → 精选 → 严证 → 深叙”是**语义总链**，不是一条所有任务都必须从头跑到尾的刚性流水线。它在实现上拆成**两种入口、一套控制面**。

| **模式**                                 | **职责与入口**                                                                                                        | **终点**                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **A · Discovery Research（开放发现）**       | 入口是 **Discovery Intent / Research Scope**，而不是预先知道的叙事缺口。从 Legacy Reservoir 或外部材料读取内容，形成 Observation、Signal、Association Candidate、Conflict、Pattern 与 Research Question。 | **Research World**；0 自动 Truth Promotion。 |
| **B · Directed Production（定向补证 / 补缺）** | 入口来自 **T03 Narrative Gap**，或来自 A 模式精选后的 **Selected Discovery**。围绕明确问题取得原文/原图，做 Evidence Fragment、Identity Resolution、Claim/Relation、G0–G6、Promotion。 | **Truth / Cultural World** 的受控增长。        |

**两种模式不是两套系统。** 它们共用 Source Gate、Raw 保全、production-registry、run attribution、DRY_RUN/WRITE、安全停止、回滚、守卫与执行报告；区别只在“此刻是在找值得研究的问题，还是在把已选问题证成可信世界”。

**两者在“精选（Selected Discovery / Narrative Gap）”处汇流**：开放发现产出的高价值候选，与既有叙事缺口一起进入 N01–N06 严证线。

# 2｜双 Skill 系统：两个完全不同的“能力系统”

Developer Skill 与 Agent Skill 必须分离。开发脚本、数据修复、诊断工作流不能被当作面向用户的 Agent Skill。

| **系统**             | **服务对象**                                                    | **核心问题**         | **结果**                      |
| ------------------ | ----------------------------------------------------------- | ---------------- | --------------------------- |
| Developer Skills   | 开发平台（含未来任何编码/数据执行器）                          | 怎样可靠地建设、维护、验证墨痕？ | 稳定的数据、证据、关系、视觉资产、体验实现和验收结果  |
| Agent Skills       | 最终产品中的墨痕 Agent                                              | 怎样理解用户并带他探索？     | 选择行动、发现关系、调取证据、组织体验、追问与重新规划 |
| Humanistic Data OS | 两套 Skill 共同依赖的世界底座                                          | 墨痕究竟在什么世界里工作？    | 持续生长、可信、可关联、可发现的人文文化世界      |

> **简单说：Developer Skills 是“造世界的方法”；Agent Skills 是“在世界里行动的方法”。**

## 2.1 Skill 的实体化与复用铁律（2026-10-04 新增，冻结）

**一个 Skill 只有同时满足下列四条，才算“真的落地”**，否则只是文字设想：
1. `skills/<name>/SKILL.md` 存在，写明 §9.1 最小合同（Purpose / Trigger / Inputs / Procedure / Gates / Outputs / Failure·Stop / Tests）；
2. 有一个**固定入口 entry**（脚本 / 命令），可被直接调用，不依赖临时手写；
3. 输入 / 输出**契约化**（声明读写范围、门禁、停止条件）；
4. 在 `specs/data-production/production-registry.json` 登记 `implementation: { skill, entry }`，使**技能 ↔ 入口 ↔ 作业**三者互相可查。

**复用优先、禁止平行重复（核心铁律）**：
- 每个数据生产能力有且只有一个**权威实现（canonical entry）**。
- 新增任何数据生产脚本前，**必须先查**是否已有可复用的 Skill / entry；已有则复用，不得重写。
- 同一逻辑存在多个平行实现属**违规**，不是“备胎”。发现即收敛：并入权威实现，其余按 **R14 归档（不删除）**并写迁移说明。
- 未在生产注册表登记、也不属于任何已登记 Skill 的新脚本，**不允许合入**（防“每次重写、越攒越多”）。

> §9 回答“何时可晋升”，本条回答“落地成什么、能否复用”；二者合并构成 Skill 完整生命周期。落地机制见主协议 §5.1 与 `production-registry.json`，由守卫强制。

# 3｜Developer Skills：一人项目的开发操作系统

Developer Skills 不是用户功能，而是把一人项目的关键施工经验固化为可重复执行的方法。它的价值是减少“每个任务重新解释一次”、防止 开发总工程师 或未来执行器凭自己的习惯施工，并让数据、体验和验收拥有同一套纪律。

## 3.1 当前 Developer Skill 家族

| **Skill**                               | **人话职责**             | **主要产物/门槛**                                                    |
| --------------------------------------- | -------------------- | -------------------------------------------------------------- |
| mohen-project-guard                     | 看住边界，防止项目越做越偏        | 权限/Secret/Legacy/范围/重复文件/Repo 边界检查                             |
| mohen-vertical-slice                    | 先把一个真实体验做通，再扩范围      | 单一主题从数据到用户体验的完整小切片                                             |
| mohen-data-ingest                       | 把外部资料可靠收进来           | Source/Raw/ingest、原始快照、可追溯导入                                   |
| mohen-evidence-gate                     | 决定哪些说法有资格进入可信世界      | Claim/Evidence 核验、冲突、不确定性、发布门槛                                 |
| mohen-knowledge-weave                   | 把证据织成人文关系世界          | Entity/Event/Place/Time/Relation/Relation Path                 |
| mohen-visual-asset                      | 管理真实视觉材料，而不是“找张好看的图” | 来源、版权、creation date、depicted period、对象/地点关联、用途                 |
| mohen-experience-prototype              | 把知识和关系转成用户可以经历的体验    | Beat、Primary Focus、Surface、Composition、Transition、真实资源映射       |
| mohen-acceptance                        | 判断“做完”是否真的成立         | 工程测试 + 真实截图/录屏 + Human Experience Gate + 回滚/Result             |
| mohen-spatial-grounding                 | 区分今天的位置与历史空间         | **CANDIDATE（尚未施工）**：`skills/` 下暂无对应目录。晋升须按 **本宪法 §9（Skill 的成熟与晋升规则）**；产物范围：现代坐标、历史关系、精度、不确定性、空间语义 |
| mohen-historical-spatial-source         | 寻找并取得历史空间资料          | 历史地图/图页/空间证据 Find & Acquire                                    |
| mohen-historical-spatial-reconstruction | 只在证据允许时重建历史空间        | Historical Feature / Reconstruction；Geometry itself is a Claim |
| **mohen-research-intake**（2026-10-03 新增） | 按载体把资料真正读进来：source-specific content reading | **已落地（Draft · 2026-10-04 · R26）**：Entry `pipelines/research/research-pipeline.mjs`，作业 `research.source-inventory` / `research.content-observation`；产物范围：Search Context Pack、载体分类 T01–T14、内容级 Observation（含 locator/region 与不确定性） |
| **mohen-association-discovery**（2026-10-03 新增） | 在 Observation Graph 上系统地产生关联候选 | **已落地（Draft · 2026-10-04 · R26）**：Entry `pipelines/research/research-pipeline.mjs`，作业 `research.mention-dependency` / `research.association-scan`；产物范围：Signal、Association Candidate、可回放生成方法、反噪声与 AVS 分量 |
| **mohen-humanistic-selection**（2026-10-03 新增） | 判断“哪些值得继续追”，而不是“哪些像真的” | **已落地（Draft · 2026-10-04 · R26）**：Entry `pipelines/research/research-pipeline.mjs`，作业 `research.humanistic-selection`；产物范围：Top Priority / Long Tail / Directed Research Task / Research Question |

> **新增 Skill 候选不预先冻结代码目录名。** 是否最终采用上述命名，应在生产注册表与 `skills/` 实现时按 §9 成熟规则确定；当前只冻结**语义职责**。

> **每个 Skill 对应唯一权威实现（canonical entry）**（§2.1）：表中已落地 Skill 的 entry 须在生产注册表登记 `implementation`；CANDIDATE Skill 晋升前无 entry。**新增实现前先查复用**；同一逻辑的平行实现按 §2.1 收敛为唯一权威实现，其余归档（R14）。

## 3.2 Developer Skills 的工作链（2026-10-03 修订为双模式）

**共用控制面**：项目守卫 → 范围/意图声明 → Raw 保全 → run 归因 → 门禁 → 验收 → 结果归档

**A · Discovery Research 链**：资料盘点 → 载体内容读取 → Observation / Mention / Source Dependency → Association Discovery → Humanistic Selection →（Long Tail 机器处置｜Selected Discovery 出线）
**B · Directed Production 链**：Narrative Gap / Selected Discovery → 定向检索 → Evidence Fragment → Identity Resolution → Claim / Relation → G0–G6 → PROMOTE / HOLD / REJECT → Projection → 深叙与体验

这不是要求每个任务机械跑完全部环节。开发平台根据真实问题选择入口与片段；Task Book 只在复杂、危险、跨模块或需要严格验收时作为可选工具。每个 Skill 仍必须有清楚的输入、输出、停止条件与证据边界。

## 3.3 Developer Skills 的七段职责（2026-10-03 新增）

| **阶段**                     | **典型能力**                                                                          | **职责**                                    |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| **Research Intake**        | Source discovery / acquisition / preserve raw / source-specific content reading    | 把异构载体变成**可定位 Observation**，不急于 Claim。      |
| **Research Structuring**   | Mention、Action/Event、Time/Place Scope、Source Dependency、Multimodal Observation    | 保留“材料中看到什么”，不抢先变 Entity / Evidence。       |
| **Association Discovery**  | 显式谓词、跨源共现、行动链、时空拓扑、跨模态共指、结构模式、变化链、冲突与比较                                          | 生成 Signal / Association Candidate，**必须可解释生成**。 |
| **Humanistic Selection**   | Novelty、specificity、cross-source、humanistic potential、researchability、noise penalty | 筛出值得追的 Research Discovery；**评分不是历史真伪概率**。   |
| **Directed Research**      | 围绕 Selected Discovery / Narrative Gap 精准找原文、原图、反证与身份依据                           | 把“值得追”转成“可以证”。                             |
| **Truth Promotion**        | Evidence Fragment → Resolve → Claim/Relation → G0–G6 → Promote                    | 继续由现有 Evidence Gate 与 R15 统治。             |
| **Narrative / Experience** | 五母题、Meaning / Present Connection、Runtime Discovery、C4 Experience                  | 在可信世界上形成理解变化，**不反向制造事实**。                  |

## 3.4 Developer-side 五条分界语句（2026-10-03 新增，冻结）

• **Observation ≠ Evidence**：Observation 记录材料中读到/看到什么；Evidence 只有在**支持某个 Claim** 时才成立。

• **Mention ≠ Entity**：提及可以 unresolved / ambiguous / candidate match；不得再次把所有 Mention 直接做成 unknown Entity。

• **Association Candidate ≠ Cultural Relation**：共现、相邻、相似、同一时期只产生**研究信号**，不能自动成为历史关系。

• **Research Discovery ≠ Runtime Discovery**：前者服务研究生产（Developer-side），后者服务 Agent 体验（Agent-side）；两套对象不能共用一个未区分的 Discovery 状态。

• **Human Review ≠ Candidate Review**：人工只处理 **Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical**；长尾研究候选由机器保留、合并、降级或淘汰。

## 3.5 这套系统对当前项目最重要的纠偏

• mohen-experience-prototype 不能再等同“把组件拼成页面”。它必须从用户此刻应该看见什么、产生什么问题、世界怎样变化开始。

• mohen-acceptance 不能再以 vitest/E2E 全绿为主要结论。涉及 UI/Experience 时，必须先看真实截图、录屏和用户感受，再看工程测试。

• mohen-knowledge-weave 不能只生产普通数据库 Relation；必须逐步形成有历史意义、可解释、可连接今天的 Cultural Relation。**并且：它不再负责从空白海量数据中盲目织网**——它只消费被精选/补证过的高价值候选。

• mohen-data-ingest 不能把“抓到文件”当成“读懂内容”。**取得原始载体**与**内容级读取**必须分开验收；只有目录/标题的资料停在 Source Lead。

• mohen-vertical-slice 继续坚持金泽先行：先证明一个真正成立的体验，再扩第二古镇、通用平台或大规模数据。

# 4｜Agent Skills：墨痕带用户探索的能力系统

Agent Skills 是墨痕运行时真正面向用户的能力。已冻结八类语义 Skill。它们描述“墨痕会做什么”，不等于八个按钮或八个页面。

| **编号** | **Agent Skill**           | **用户感受到的能力**                         |
| ------ | ------------------------- | ------------------------------------ |
| S01    | spatial\_exploration      | 从一个地方、附近环境或空间线索开始探索。                 |
| S02    | time\_space\_trace        | 沿时间与空间追踪对象如何出现、变化、消失或留下痕迹。           |
| S03    | relationship\_discovery   | 发现人物、地方、事件、文献、器物等之间值得看的关系。           |
| S04    | classical\_discovery      | 从典籍、地方志、档案等文献传统中发现线索，而不是只做全文搜索。      |
| S05    | evidence\_verification    | 回答“凭什么这么说”，比较来源、冲突与不确定性。             |
| S06    | story\_weaving            | 把经过证据约束的发现组织成人能理解、愿意继续看的叙事。          |
| S07    | experience\_orchestration | 决定此刻地图、时间、图像、关系、史料或现场谁成为主角，并让体验连续变化。 |
| S08    | modern\_connection        | 把过去重新连接到今天的地方、生活、观察、旅行、审美与个人经验。      |

## 4.1 第一阶段代码组织

第一阶段实际实现收敛为五个高频执行 Skill：spatial-research、relationship-discovery、evidence-chain、spatial-story、experience-orchestration。八类是长期能力语义；五类是阶段性代码组织，不应混为一谈。

## 4.2 Agent Skill 不是“提示词模板”

一个 Agent Skill 应是一套可执行的方法：知道何时使用、需要什么上下文、可调用哪些 Tool、必须经过哪些 Evidence Gate、什么情况下停止、最终产生什么 Experience Action。

行动层：Planner → Skill → Agent Tool → MCP Adapter / API / Local Knowledge。MCP 是外部数据能力，不直接等于 Skill。Tool 是原子动作，Skill 是完成一类探索任务的方法。

## 4.3 Agent Loop

Sense → Understand → Goal → Plan → Act → Observe → Evidence Gate → Discover / Synthesize → Experience → Confirm → Memory → Replan

其中最重要的两条约束继续冻结：第一，自主的是行动路径，不是历史事实；第二，每次行动后必须观察结果并允许重新规划，不能只靠关键词一路走预设剧本。

## 4.4 两类 Discovery 必须重新命名（2026-10-03 新增，冻结）

八类 Agent Skill 中“发现”相关能力（S03 relationship_discovery、S04 classical_discovery 等）消费的是**已经过严证的世界**。研究阶段的“发现候选”与之同名会造成两套对象共用一个未区分状态——这是必须消除的歧义。

| **名称**                              | **所在阶段**                | **用途**                                      | **边界**                    |
| ----------------------------------- | ----------------------- | ------------------------------------------- | ------------------------- |
| **Research Discovery Candidate**    | Developer-side；**严证之前** | 为什么值得继续查、有哪些信号、缺什么证据、下一步去哪找。                | 不得当事实；**不得直接给用户**。        |
| **Runtime Discovery Candidate**     | Agent-side；**严证之后**     | 在受控 World Projection 中，此刻哪些**可信关系**值得用户继续追。 | 消费 Truth / Meaning；**不反写 Truth**。 |

> Agent Skills 只与 **Runtime Discovery** 打交道。Research Discovery 是 Developer Skill 的产物，必须先经 Selected → Directed Research → G0–G6 才可能进入 Agent 可见世界。

# 5｜Living Cultural Relationship Model：双 Skill 之间的真正桥梁

数据库 Relation 只回答“A 与 B 有一条关系”。活的文化关系模型还要回答：这条关系发生在什么时间与空间？由什么材料留下？有何不确定？它怎样改变我们对一个地方/人物/事件的理解？为什么今天值得重新看？

| **层次** | **例子：金泽两桥与水乡**          | **墨痕需要知道什么**     |
| ------ | ----------------------- | ---------------- |
| 普通关系   | 万安桥—跨越—金泽塘              | 对象之间有联系          |
| 历史关系   | 桥、水道、寺院在特定时期共同构成地方空间    | 时间/空间/功能关系       |
| 证据关系   | 地方志、桥碑、图像或研究分别支持哪些部分    | 谁留下了这段历史、支持到什么程度 |
| 意义关系   | 桥不是孤立年代标本，而可能是水网生活体系的入口 | 这条关系为什么改变理解      |
| 当下连接   | 今天走到桥边时应该重新观察什么、追问什么    | 过去怎样让用户重新看见今天    |

> **过去没有变，用户与过去的关系变了。**

## 5.1 Cultural Relation 的最小要求

• 明确对象：关系发生在谁/什么之间。

• 时间语境：关系在何时成立、变化或未知。

• 空间语境：现代精确位置、历史关系空间、历史地图与重建几何分权。

• 证据来源：关系不是模型常识直接生成。

• 不确定性：冲突、缺口、推断必须保留。

• Human Meaning：为什么这条关系值得理解。

• Modern Connection：它是否可能让用户重新看见今天。

## 5.2 Evidence 的进一步方向

Evidence 不只回答“什么支持这个说法”，还应逐步能够回答“谁、哪一种文献传统或观察位置留下了这段历史”。但来源类型、作者/编者、机构立场、历史行动者/观察者、叙事视角、后世解释不能粗暴合并成一个 perspective 字段。该方向目前仍应作为候选模型，在真实多来源冲突场景出现后再冻结 Schema。

# 6｜Agent-native Experience：Agent Skill 怎样真正变成用户体验

墨痕不是把 Agent 放进聊天框。Agent 的判断应该通过体验空间变化被用户感知。动态的是体验编排，不是任意生成 UI。

基本链：用户问题 → Agent 判断 → Cultural World + Evidence + 时空推理 → Experience Action → Composition → 受控 Surface → 用户看到世界被重新组织。

> **不要让用户看见 Agent 在思考，而要让用户看见世界正在被重新组织。**

## 6.1 体验编排的职责

| **对象**            | **职责**                                          |
| ----------------- | ----------------------------------------------- |
| Experience State  | 当前用户正在经历什么：地点、时间、对象、证据、媒体、问题、下一行动。              |
| Composition State | 此刻谁是主角、谁辅助、谁退场；控制叙事密度、视觉强度与转场意图。                |
| Surface           | 受控的视觉表达积木：地图、时间、关系、图像、史料、现场、证据等。                |
| Experience Action | Agent 可调用的结构化体验动作，例如聚焦、时间切换、图像对照、证据打开、局部 Patch。 |
| Renderer          | 忠实呈现状态，不自行决定历史意义或用户目标。                          |

## 6.2 为什么这对双 Skill 很关键

Developer Skill \`mohen-experience-prototype\` 负责把 Surface、Composition、Transition 做成可靠的“舞台能力”；Agent Skill \`experience\_orchestration\` 则在运行时决定何时使用哪种能力。前者造舞台，后者当导演。两者不能混成一套。

# 7｜三者怎样形成墨痕长期能力

| **阶段** | **Developer Skills 做什么**             | **Humanistic Data OS 发生什么**    | **Agent Skills 做什么**                             |
| ------ | ------------------------------------ | ------------------------------ | ------------------------------------------------ |
| 资料进入   | 采集、去重、保存原始来源                         | Raw World 生长                   | 通常不直接面向用户                                        |
| 可信化    | 证据核验、冲突与不确定性管理                       | Evidence World 生长              | evidence\_verification 可调用                       |
| 关系化    | 实体对齐、关系编织、时空 grounding               | Cultural Relationship World 生长 | relationship\_discovery / time\_space\_trace 可探索 |
| 意义化    | 建立发现候选、现代连接、视觉线索                     | Meaning / Discovery 层生长        | story\_weaving / modern\_connection 选择值得看的内容     |
| 体验化    | 建立可复用 Surface、Composition、Transition | Experience World 可执行           | experience\_orchestration 把判断变成世界变化              |
| 现场化    | 路线、观察任务、现实空间校验                       | 线上知识连接现实地点                     | spatial\_exploration + modern\_connection 继续行动   |

## 7.1 长期飞轮

更多真实资料 → 更好的 Evidence → 更密的 Cultural Relations → 更有价值的 Discovery → 更好的 Agent Experience → 用户提出更好的问题/现场观察 → 暴露新的资料与关系缺口 → Developer Skills 再补世界。

这意味着墨痕真正的长期资产不是某个页面，也不是某个模型，而是：一套越来越可靠的人文世界 + 两套越来越成熟的 Skill 系统。

# 8｜与当前金泽项目的关系

这份架构不是要求现在立刻开发所有 Skill。当前金泽仍然应该坚持 Vertical Slice。现阶段最重要的是用金泽检验“双 Skill + 人文数据操作系统”是否真的能工作，而不是先建完整平台。

| **当前金泽问题**                              | **对应系统判断**                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| 已有不少证据和数据，但体验仍像研究页面                     | 不是继续扩数据；优先修复 experience-prototype / acceptance 的施工与验收方式。                        |
| 当前所谓 Agent 主要是冻结 JSON + reducer / 关键词规则 | Agent Skills 尚未真正形成；不能把已有运行链误称完整 Agent。                                         |
| 关系图存在，但用户没有“发现”的感觉                      | 普通 Relation 已有，Cultural Relation → Discovery → Experience 的转译不足。                |
| 证据很严谨，却抢占舞台                             | Evidence World 有价值，但默认 UI 应按需出现，而不是成为第一主角。                                      |
| TASK-0014 原型有吸引力，运行版失去地方感               | 说明 Experience Grammar 已找到，但 Developer Skill 对“按体验母版施工”和 Human Acceptance 还不够可靠。 |

## 8.1 当前不应做的事

• 不因为这份架构完整，就立刻开十几个 Skill 开发任务。

• 不先做“万能 Agent”或自由聊天。

• 不为了构建 Humanistic Data OS 而大规模灌库。

• 不把 Skill 数量当成熟度。

• 不让 开发总工程师 自行决定何时新增 Skill；Skill 必须来自重复、稳定、真实的任务需求。

# 9｜Skill 的成熟与晋升规则

Skill 不应该在讨论阶段就变成代码目录。建议继续采用“真实任务 → 重复方法 → 稳定输入输出 → 明确 Gate → 才晋升为 Skill”的顺序。

| **阶段**       | **含义**           | **处理**              |
| ------------ | ---------------- | ------------------- |
| Candidate    | 发现一种可能反复出现的方法    | 记录，不自动开发            |
| Task Pattern | 至少在真实任务中重复出现     | 观察输入/输出/失败方式        |
| Draft Skill  | 方法边界已经比较稳定       | 小范围固化，仍可调整          |
| Mature Skill | 跨任务复用并经多次验收      | 进入正式 Skill Registry |
| Deprecated   | 方法被更好机制替代或长期不再需要 | 停止默认调用，保留迁移说明       |

> **重复即合并（2026-10-04 补充）**：当两个 Skill / 两个 entry 承担同一逻辑时，**不是新增第三个、也不是并存**，而是收敛为一个权威实现（canonical entry），其余按 R14 归档并写迁移说明（§2.1 / §9.1）。

## 9.1 Skill 的最小合同

• Purpose：它解决什么重复问题。

• Trigger：什么情况下才调用。

• Inputs：需要哪些真实上下文/文件/数据。

• Procedure：关键步骤与允许的工具。

• Gates：证据、安全、空间、体验等不可绕过的门槛。

• Outputs：产生什么可验收结果。

• Failure / Stop：什么时候必须停，不得自行补想象。

• Tests / Evidence：怎样证明它真的完成。

• Ownership：是 Developer Skill 还是 Agent Skill，不得模糊。

• Implementation：权威入口 entry（脚本 / 命令）及其在生产注册表的位置（`implementation: { skill, entry }`）——**三向绑定（技能 ↔ 入口 ↔ 作业）必须可查**（§2.1）。

• Reuse Source：它复用哪些既有 Skill / entry；新增能力须说明复用来源，重复实现不合规。

• Merge / Deprecate：与它重复的实现合并到哪里；被替代时按 R14 归档并写迁移说明。

# 10｜治理：谁有权决定什么

| **角色**                     | **职责**                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 项目拥有者 / 唯一架构设计师           | 决定产品价值、文化判断、体验是否有意义；最终 Human Review；对架构修改拥有唯一决定权。                                                                          |
| 开发平台 / 开发总工程师             | **工程实施**：本地施工、事实报告。**架构职责**：维护 C1–C4 架构一致性、主动判断 Skill 成熟度与架构缺口、提出 Architecture Reconciliation 建议。**两者同等，但修改不得自行落地，须提交项目拥有者确认**；亦无权把一次脚本晋升为正式 Skill。 |
| 未来其他执行器                    | 遵守同一 Repo + Contract + Skill + Test + Gate；缺专业能力才增加执行器。                                                                       |

> **开发平台 = 开发总工程师，是同一个角色的两个名称，不是两个角色。** 工程实施与架构思考同属其职责；两者的区别只在“能否自行落地”——工程改动可自主，架构修改必须经项目拥有者确认。

聊天上下文不是 Source of Truth。长期有效的 Skill 定义、Contract、Evidence、Types、Tests 与架构结论必须进入 Repo 或 C0–C4；Result / Task Evidence 只在确有追溯价值时保存，不再作为每次施工的沟通税。

# 11｜本版冻结结论与尚未冻结内容

## 11.1 本版建议冻结

• Humanistic Data OS 是墨痕长期文化世界底座，而不是“大数据库”同义词。

• Developer Skills 与 Agent Skills 永久分离，但通过同一 Humanistic Data OS 协作。

• Developer Skills = 建设与维护世界的方法；Agent Skills = 面向用户探索世界的方法。

• Living Cultural Relationship Model 是 Evidence 与 Experience 之间的核心中间层。

• Agent-native Experience Architecture：Agent 改变的是 Experience State / Composition，而不是任意生成前端。

• 最高验收不是“历史知识更多”，而是用户是否从过去重新看见今天，并愿意继续观察、追问、阅读或走到现场。

**2026-10-03 定向修订追加冻结**：

• Developer-side 存在两种生产模式：**Discovery Research（开放发现）** 与 **Directed Production（定向补证/补缺）**；二者共用同一控制面，在 Selected Discovery / Narrative Gap 处汇流。

• **Research World、Source World、Truth / Cultural World、Experience World 四者分离**；Research World 允许低确定性，但 **0 自动 Truth Promotion**，且不得被塞成 C3 的“第九层”。

• **Truth Graph 与 Observation Graph 逻辑分离**：前者保存已证成世界，后者用于寻找可能的世界。

• **两类 Discovery 命名分离**：Research Discovery（Developer-side，严证前）与 Runtime Discovery（Agent-side，严证后）不得共用一个 Discovery 状态。

• **Humanistic Selection 是研究生产的正式环节**：它判断“值得不值得继续查”，其评分不是历史真伪概率。

• **Human Review 只处理 Selected / Truth-Promotion / Narrative-Critical / Conflict-Critical**；研究长尾由机器保留、合并、降级或淘汰，不 1:1 制造人工队列。

• **Evidence before Runtime Truth ≠ Evidence before Research**：研究阶段允许“先有问题、后有证据”；G0–G6 的严格性不因引入开放发现而降低。

## 11.2 仍然不应冻结

• 最终 Agent Skill 的目录数量与代码拆分方式。

• Evidence Perspective / Provenance 的最终 Schema。

• 是否引入特定知识图谱数据库、向量数据库或 GIS 服务。

• 第二古镇/第二主题的通用化方式。

• 参与式 Humanistic World、社区贡献、身份与声誉机制。

• 商业化结构。

• **Research Workspace / Observation Graph 的最终物理 Schema 与是否独立 research schema**（2026-10-03 追加）：第一轮只冻结逻辑合同，物理形态由 LR-ADS-01 结果决定，不在本版冻结。

• **D01–D05 Research Job family 的最终命名**（2026-10-03 追加）：当前只是语义名，不作为宪法冻结代码目录。

• **AVS 权重、Top-K 与各种阈值**（2026-10-03 追加）：属版本化 Registry / Config 参数，不写入宪法。

# 12｜最终总图（文字版）

Developer Skills（两种模式，一套控制面）

```
A · Discovery Research
资料盘点 → 内容读取 → Observation / Mention / Dependency
        → Association Discovery → Humanistic Selection
        ├─ Long Tail：保留 / 合并 / 降级 / 暂停（机器处置，不进人工队列）
        └─ Selected Research Discovery ──┐
                                          │ 汇流
B · Directed Production                   │
T03 Narrative Gap ────────────────────────┘
        → 定向检索 → Evidence Fragment → Identity Resolution
        → Claim / Relation → G0–G6 → PROMOTE / HOLD / REJECT
```

Humanistic Data Operating System

Cultural Sources → **Observation / Association（Research World）** → Evidence → Humanistic Objects → Cultural Relations → Meaning / Present Connection → **Runtime Discovery** / Experience → Participation → Living Culture → New Cultural Traces ↺ Evidence / Cultural World

↑ ↓

└──────────── 新问题 / 新缺口 / 现场观察 ← 用户体验 ← Agent Skills ────────────┘

Agent Skills

spatial\_exploration / time\_space\_trace / relationship\_discovery / classical\_discovery / evidence\_verification / story\_weaving / experience\_orchestration / modern\_connection

> **最终不是“开发系统 + Agent 系统 + 数据库”三块拼起来，而是一套循环：开发系统持续把文化世界建得更可信、更有关系；Agent 在其中发现、组织和带人探索；用户的新问题又反过来告诉开发系统下一步应该补什么。**
