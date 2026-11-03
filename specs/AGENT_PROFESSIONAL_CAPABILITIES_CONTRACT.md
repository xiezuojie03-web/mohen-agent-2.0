# 墨痕Agent专业方法、Skill与模型工具路由完整执行合同

> 设计镜像声明：本文件是可交付的**完整目标规范正文**，仅当经Owner授权的工程原子切换及测试通过后在仓库生效。Library状态不等于GitHub/生产已生效；任何未授权操作继续HOLD。

**唯一上位：** MHKA-04（专业能力），MHKA-05（运行），MHKA-00（授权）。
**专业职责：** 19 Skill身份与63专业方法由本合同声明业务与失败语义；`specs/AGENT_CONTRACT.md`负责Agent对外研究/消费/权限接口；`method-binding-contract.json`和实际 `SKILL.md` 为机器绑定，源码与此合同不一致必须HOLD。独立G资格以Gate合同为唯一签发权。

## 0｜能力对象与责任边界

- **METHOD专业方法**：有明确输入、操作、判断、输出、失败条件、版本和适用范围的知识工作方法；63项C/H/W/A/P方法属于这一层。
- **Skill**：可复用任务方法，声明触发条件、输入输出、依赖、权限、预算、失败与停止条件；不是数据库表、API或独立Stage。
- **Tool/Service/Adapter**：执行检索、计算、OCR/ASR/VLM、GIS、转换、读取或与模型/服务适配；工具可替换，能力合同不绑定单一供应商。
- **Registry/Manifest**：描述能力可发现/可绑定、版本、权限和激活策略；注册不等于授权运行，激活不等于Job可执行。
- **Dispatcher/Agent Loop**：理解任务、选择方法/Skill/Tool/Stage、委托、预算、状态、检查点、Replan与恢复；不能签发G资格。
- **Action/Composition/Renderer**：把有资格结果转换为19组件可见表达；不得反推历史事实或授予资格。

## 1｜R0—R4.9及CAP-D01—D05的规则转译

| 原研究 | 新架构吸收的规则 | 唯一Owner | 新合同承载 |
|---|---|---|---|
| R0基线锁定 | 真实源码、专题样板、设计目标、运行事实分级；规划不能冒充运行能力。 | MHKA-00/05 | §2/§8 |
| R1职责合同 | 数据生产、能力、调度、表达分层；StudioResearchRead与公众L5隔离；作品审核/G资格分离。 | MHKA-00/04/05 | §0/§3/§5 |
| R2实现盘点 | 代码存在、主题可用、通用Agent能力、设计目标、未核事项分开。 | MHKA-05 | §2 |
| R3能力架构 | 六Stage Owner与旧双Skill职责重组；S01—S08是任务语义，不是新Stage/Skill。 | MHKA-04 | §3 |
| R4.1能力事实 | 复用CLI→Orchestrator→Executor→Adapter六Stage与Experience Engine，不复制生产链。 | MHKA-04/05 | §2/§5 |
| R4.2方法/Skill映射 | 63方法、19 Skill身份、六Stage绑定；静态证据等级不代表通用运行。 | MHKA-04/05 | §3 |
| R4.3资产生命周期 | 13资产、不可变revision、状态/权利/依赖/跨L读，归KAD1-E1。 | MHKA-03/05 | KAD1-E1 |
| R4.4受控生产/Gate | Production Tool包装旧Runner/Adapter；候选→独立Reviewer→资格→下一Stage。 | MHKA-04/05 | §5 |
| R4.5 Studio闭环 | 九个业务动作映射创作者流程；资产/资格/作品状态分离；发布修订供WATCH消费。 | MHKA-02/04 | §6 |
| R4.6 GIS/时间/视觉 | 12项横向能力按空间/时间/视觉域；不是第四模式或第20组件。 | MHKA-04 | §7 |
| R4.7调度 | 持久Plan/Event/Checkpoint、五状态轴、权限/预算/租约/幂等/重试/恢复和30项负例。 | MHKA-04/05 | §5/§8 |
| R4.8组件/三模式 | H/I职责、19组件、三组合、Studio/WATCH/EXP分工。 | MHKA-02/04 | KAD1-C |
| R4.9收口 | 设计、工程应用、隔离测试、真实运行、Owner接受分开；不提前启动后续阶段。 | MHKA-00/05 | §8/§9 |
| CAP-D01 | 任务画像、确定性/专业工具/模型经济路由和成本预算。 | MHKA-04 | §4 |
| CAP-D02 | T1—T7候选证据、幻觉、权利与资格只读校验。 | MHKA-03/04 | §5 |
| CAP-D03 | GIS/时间/视觉D1身份→D2方法→D3接口协同。 | MHKA-04 | §7 |
| CAP-D04 | 四组跨域组合和BASE→PROD→PURPOSE纵向故事板。 | MHKA-04 | §7 |
| CAP-D05 | 成熟度证据等级、五条双向追溯链和缺口收口。 | MHKA-00/04/05 | §8 |

## 2｜方法证据等级与禁止推断

R4.2静态核对63项专业方法的证据分布：M3=14（找到专题动作）、M2=6（参与专题语义）、M1=43（未找到专属专题Adapter证据）。M1不证明没有共用底层实现；M3不证明跨题材通用、质量达标或独立G资格。实际工程状态另按SHA、部署、数据库和真实测试确认。

现有生产链按显式CLI→固定Executor→显式Adapter组织。Skill名称是职责标识，不自动意味着动态加载。Registry顶层激活、Job级execution_policy、Reviewer binding、Adapter method binding逐层核实；缺少真实绑定返回`METHOD_BINDING_UNAVAILABLE`，不能用自然语言宣称已执行。

## 3｜63项专业方法与19个Skill身份

### 3.1 63项专业方法完整清单

| Stage | Stage Owner Skill | 方法ID | 原方法名 | 静态证据等级 | 源码证据说明 |
| --- | --- | --- | --- | --- | --- |
| D01 | mohen-carrier-reading | C01 | 数字文本 | M3 | D01:413/429，文本read_units插入、method_code=C01；确定性 |
| D01 | mohen-carrier-reading | C02 | 扫描书影与影像PDF | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D01 | mohen-carrier-reading | C03 | 历史舆图与图形 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D01 | mohen-carrier-reading | C04 | 照片、版画与插图 | M3 | D01:413/446/455，图片read_units及Commons定位元数据；仅技术读取 |
| D01 | mohen-carrier-reading | C05 | 结构化数据 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D01 | mohen-carrier-reading | C06 | 音频 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D01 | mohen-carrier-reading | C07 | 视频 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D01 | mohen-carrier-reading | C08 | 实物与现场采集 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H01 | 通史与断代史 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H02 | 编年与专题史 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H03 | 制度与政书 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H04 | 历史地理著作 | M2 | D02:485/490—491，提示词候选旁类；没有独立H04调度 |
| D02 | mohen-material-understanding | H05 | 地方志 | M3 | D02:485/540/558/705，主类Prompt→DeepSeek→evidence与Gate证据 |
| D02 | mohen-material-understanding | H06 | 谱牒与传记 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H07 | 行政档案 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H08 | 民间文书 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H09 | 金石铭刻 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H10 | 经学与儒家经典 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H11 | 诸子与思想著作 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H12 | 宗教与信仰文献 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H13 | 文学与私人著述 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H14 | 笔记游记与小说 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H15 | 农业与生产文献 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H16 | 科学医学与技术文献 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H17 | 生活礼俗与艺术文献 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H18 | 历史舆图与图谱 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H19 | 出土与特殊文献 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H20 | 目录类书与文献汇编 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H21 | 近现代报刊与期刊 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H22 | 口述史与访谈记录 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H23 | 现代考古与田野调查报告 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H24 | 现代学术研究与遗产调查 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D02 | mohen-material-understanding | H25 | 历史摄影与纪实图像材料 | M3 | D02:540—579，image reading_unit分类落库；不是图像模型视觉理解 |
| D03 | mohen-world-construction | W01 | 历史对象身份与连续性判定 | M2 | D03:712—731，身份提取Prompt/实体结果；专题固定规则 |
| D03 | mohen-world-construction | W02 | 历史时间与时序约束建构 | M3 | D03:712—831，原纪年与time_scope/change；含P03依赖 |
| D03 | mohen-world-construction | W03 | 历史空间与视觉对应核定 | M3 | D03:796，视觉对应对象及依赖边1612；仅今貌/条目对应 |
| D03 | mohen-world-construction | W04 | 历史事件与行动过程建构 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D03 | mohen-world-construction | W05 | 历史关系与角色约束建构 | M3 | D03:790/1003，关系claim revisions/来源关联，约束Prompt |
| D03 | mohen-world-construction | W06 | 历史状态变化与连续性建构 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D03 | mohen-world-construction | W07 | 世界事实主张与证据支持评定 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D03 | mohen-world-construction | W08 | 来源谱系与独立见证评估 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D03 | mohen-world-construction | W09 | 世界主张冲突与认识状态管理 | M3 | D03:853/921/953，冲突与拒绝、开放问题登记 |
| D03 | mohen-world-construction | W10 | 跨对象世界一致性与变更传播 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A01 | 显式关系：关系解释 | M2 | D04:1014—1016/1114，Prompt关系解释、findings；无独立方法Router |
| D04 | mohen-humanistic-discovery | A02 | 共现与跨源：问题线索发现 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A03 | 时间序列：节律解释 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A04 | 空间拓扑：场所结构解释 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A05 | 行动链：行动者处境 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A06 | 制度机制：规则执行机制 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A07 | 跨模态共指：载体表征差异 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A08 | 结构聚类：网络结构解释 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A09 | 变化链：历史生成与断裂 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A10 | 冲突发现：历史认识与争议模式 | M2 | D04:1014—1016，冲突解释Prompt；无独立方法Router |
| D04 | mohen-humanistic-discovery | A11 | 跨时空比较：跨尺度历史比较 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D04 | mohen-humanistic-discovery | A12 | 当下线索：历史与当下联系 | M1 | 未发现该方法ID的专题Adapter调用点；不能从静态缺名推断无底层共用实现。 |
| D05 | mohen-read-model-publication | P01 | 资格选入 | M2 | D05:1121/1195—1251，发布选入语义仅部分逻辑；Gate签发有冲突 |
| D05 | mohen-read-model-publication | P02 | 世界投影 | M3 | D05:1292—1330，read_model.world_projections与consumer Gate |
| D05 | mohen-read-model-publication | P03 | 时空变换 | M3 | D05:1354—1387，时间/空间投影（实际为时间事件）；无通用GIS |
| D05 | mohen-read-model-publication | P04 | 有界解释组合 | M3 | D05:1390—1451，story_seed与agent_context写入 |
| D05 | mohen-read-model-publication | P05 | 探索关系编排 | M3 | D05:1453—1478，discovery_path（未决问题与补证线索） |
| D05 | mohen-read-model-publication | P06 | 证据返还 | M3 | D05:1481—1561，evidence_pointer及visual pointer来源指针 |
| D05 | mohen-read-model-publication | P07 | 消费分面 | M2 | D05:多处writeGate consumer agent/visual_stage；无独立P07函数 |
| D05 | mohen-read-model-publication | P08 | 精准失效 | M3 | D05:1187—1251，纯P08 job触发控制HOLD和invalidation_events；标准混绑则deferred |

### 3.2 19个Skill身份的状态与职责

| Skill ID | 当前状态/职责层 | 可复用语义 |
| --- | --- | --- |
| mohen-source-intake | DESIGN_OWNER · D00 Stage Owner | 来源发现、获取、来源身份与L0候选 |
| mohen-carrier-reading | DESIGN_OWNER · D01 Stage Owner | C01—C08载体读取与L1候选 |
| mohen-material-understanding | DESIGN_OWNER · D02 Stage Owner | H01—H25材料理解与L2观察 |
| mohen-world-construction | DESIGN_OWNER · D03 Stage Owner | W01—W10历史世界建构与L3主张 |
| mohen-humanistic-discovery | DESIGN_OWNER · D04 Stage Owner | A01—A12人文发现与L4解释 |
| mohen-read-model-publication | DESIGN_OWNER · D05 Stage Owner | P01—P08消费分面与L5发布候选 |
| mohen-acceptance | DESIGN_SHARED · shared | 验收与证据检查；不等于独立G签发 |
| mohen-experience-prototype | DESIGN_SHARED · shared | 体验原型与表达验证；不改写知识资格 |
| mohen-historical-spatial-reconstruction | DESIGN_SHARED · shared | 历史空间重建候选；受W/G及空间资格约束 |
| mohen-historical-spatial-source | DESIGN_SHARED · shared | 历史空间来源发现与谱系 |
| mohen-project-guard | DESIGN_SHARED · shared | 项目/上下文授权守卫；不能替代数据库RLS |
| mohen-vertical-slice | DESIGN_SHARED · shared | 纵向切片组织与交付；不新增生产Stage |
| mohen-visual-asset | DESIGN_SHARED · shared | 视觉资产整理、来源与权利边界 |
| mohen-association-discovery | ARCHIVED · LEGACY DISCOVERY | 旧关联扫描经验；方法可吸收，不能平行写Truth |
| mohen-data-ingest | ARCHIVED · LEGACY | 旧采集入口经验；不复活无人值守写入 |
| mohen-evidence-gate | ARCHIVED · LEGACY | 旧证据门经验；不等同现行独立Reviewer |
| mohen-humanistic-selection | ARCHIVED · LEGACY DISCOVERY | 旧筛选/研究任务经验；候选不等于D04/G4资格 |
| mohen-knowledge-weave | ARCHIVED · LEGACY | 旧知识编织经验；不建第二真值链 |
| mohen-research-intake | ARCHIVED · LEGACY DISCOVERY | 旧研究采集经验；保留宽进候选，不自动晋级 |

六个Stage Owner Skill分别负责D00—D05；63项C/H/W/A/P方法按其Stage Owner绑定。七个共享活动Skill只在其合同授权范围内横向支援，不新建Stage或替代专业Owner。六个归档Skill只保留可复用经验，不复活旧无人值守写入、平行Truth链或旧Discovery入口。

### 3.3 S01—S08八类探索任务语义

| 语义任务 | 任务目的 | 专业依赖 | 失败边界 |
|---|---|---|---|
| S01空间探索 | 从地点/周边空间发现历史地点、地名和空间关系 | SP核心；TM/VS协同 | 缺精确几何不伪造地图。 |
| S02时空追踪 | 追踪历史对象出现、变化、消失和当今痕迹 | SP+TM核心；VS协同 | 时间精度/对象身份不足时保留区间和候选。 |
| S03关系发现 | 发现人物、事件、地点、文献、器物之间值得追问的联系 | SP/TM/VS协同 | 共现/相似不等于关系或因果。 |
| S04典籍材料发现 | 在合法范围从典籍、地方志、档案、书影发现线索 | VS/来源核心；TM/SP协同 | 目录命中不等于取得原文；权利不明HOLD。 |
| S05证据返查 | 返回原件、区域、时间码、冲突和证据边界 | 三域协同 | 引用权与展示权分离。 |
| S06叙事编织 | 将探索问题组织为可理解、可追问的人文叙事 | TM+VS核心；SP协同 | 不越过H1/H2和G4/G5。 |
| S07体验编排 | 将探索意图转为受控Action/Composition/Renderer | VS核心；SP/TM协同 | 组件编号与METHOD编号隔离。 |
| S08当下生活联系 | 从历史文化发现今天的地点、生活、旅行和意义 | SP核心；TM/VS协同 | 当代端时效、身份与历史延续分别核验。 |

## 4｜CAP-D01模型/专业工具经济路由

### 4.1 六步决策链

`明确任务目的与副作用 → 先检索已有合格资产 → 选择确定性工具或专用模型 → 必要时受控调用语言/多模态模型 → 校验引用/结构/不确定性 → 由原D/G或作品审核主体按权限判资格`。

调用必要性四问：是否有真实理解缺口；规则/SQL/专用OCR/ASR/GIS能否更可靠低成本完成；原件/版本/用途/权利能否合法提供；输出能否定位、验证、HOLD并限制费用。任一关键前提缺失，不调用生成模型填补事实缺口。

### 4.2 十二种任务画像

| 任务画像 | 默认最小技术 | 路由决策 | 强制阻断/退路 |
| --- | --- | --- | --- |
| 1 既有合格知识查询 | REUSE_ASSET + 资格/用途/版本匹配 | 先查已有资产；合格且用途匹配则不调用LLM。 | 资格失效/用途不匹配HOLD。 |
| 2 既有Studio研究笔记复用 | REUSE_ASSET（仅项目授权范围） | 复用工作资产但不把编辑候选升级为G知识。 | 跨项目无授权拒绝。 |
| 3 新馆藏资源发现/去重 | DETERMINISTIC | 来源API、目录、全文索引、hash/规则优先。 | 无合法API/访问权HOLD，不让LLM编造馆藏。 |
| 4 扫描书影/舆图转定位原文 | SPECIALIST_TOOL；必要时有界VLM候选 | OCR/版面/图像坐标工具优先，金样本验证。 | 工具未接通/原件权利不明HOLD。 |
| 5 新材料正式入L | EXISTING_PRODUCTION | 通过R4.4受控Tool调用原D00—D05和G0—G5。 | 方法绑定缺失返回METHOD_BINDING_UNAVAILABLE。 |
| 6 同名/矛盾/复杂史料 | 规则约束+受控D03；必要时有限推理模型 | 竞争解释、反证、同源关系并列。 | 不能用模型升档解除证据HOLD。 |
| 7 人文发现/跨期比较 | 先复用合格L3/L4，再D04/A方法 | 解释/比较/当下联系候选必须有理解增量。 | 不以新颖措辞冒充发现。 |
| 8 时间/空间/路线问题 | DETERMINISTIC或专业GIS/时间Tool | 历法、CRS、拓扑和区间规则优先。 | 精度/身份不足退近似或关系图。 |
| 9 图片/声音/视频素材整理 | 元数据/专用ASR/OCR/关键帧候选 | 记录时码、原件区域、权利和工具版本。 | 无展示/下载权仅保留合法元数据。 |
| 10 导演提纲/镜头方案/预览 | Studio既有资产+作者授权的有界LLM | LLM给建议，作者选择，保存为作品修订。 | 不得替作者选题或自动发布。 |
| 11 Gate资格/来源撤权 | 确定性资格校验+原D/G独立签发 | 资格与撤权由独立Reviewer和Guard控制。 | 模型不得自签PASS。 |
| 12 超时/预算/恢复 | R4.7 checkpoint/幂等/预算对账 | 核验回执和副作用后有界恢复。 | 未知副作用/账单先对账，不盲目重试。 |

### 4.3 路由输入、输出和预算政策

`AgentCapabilityRouteRequestV1`必须含request/project/actor/active_role/delegation/intent/purpose/outcome/asset_refs/source_scope/layer/time/space/media/evidence_readiness/rights/methods/action/side_effect/allowed_tools/allowed_models/risk/accuracy_profile/budget/deadline/idem/policy_rev/registry_rev/input_fingerprint/privacy_scope。`AgentCapabilityRouteDecisionV1`返回choice、候选工具/模型类、资产复用项、缺前提、成本区间及价格版本、预算预留、风险、评测profile、调用/重试上限、fallback、grant_required、HOLD理由、next_action、audit_ref和状态`PROPOSED|POLICY_APPROVED|HOLD`。POLICY_APPROVED只允许Tool调用，不等于知识资格/作品发表。

`choice∈REUSE_ASSET|DETERMINISTIC|SPECIALIST_TOOL|EXISTING_PRODUCTION|BOUNDED_LLM|BOUNDED_VLM|HOLD`。按符合用途质量门槛的单位合格成果总成本衡量；未知价格标unknown，不虚构时价。缓存键必须包含来源版本、用途、权利、consumer、schema/prompt/model/tool/policy版本；撤权/资格失效时缓存不能复活资格。

## 5｜CAP-D02候选证据化、幻觉与版权防线

所有外部模型/专业Tool输出先进入不受信候选封套：

| 校验 | 必须证明 | 失败状态/处理 |
|---|---|---|
| T1 来源身份与原件存在 | 来源/版本/副本真实可回查 | `SOURCE_UNVERIFIED`，候选不引用为事实。 |
| T2 定位与可回放 | 页/区域/时间码/字段定位可返回原件 | `LOCATOR_UNVERIFIED`，不得称精确引文。 |
| T3 权利与数据处理范围 | 读取/云处理/引用/展示/下载动作许可 | `RIGHTS_UNKNOWN/RIGHTS_DENIED`，限制或阻断。 |
| T4 原文与模型解释分离 | 原文、OCR/ASR候选、模型解释、人工修订分别保存 | `VOICE_COLLISION`，回原件复核。 |
| T5 同源/转引/独立性 | 多份复制件不被计为独立见证 | `DEPENDENCY_UNRESOLVED`，降级同源组。 |
| T6 语义/时空/单位/实体一致性 | 年代、单位、身份、空间、因果口径一致 | `SEMANTIC_CONFLICT`，拆候选或HOLD。 |
| T7 资格与消费用途 | 只读校验既有D/G资格和purpose/consumer | `GATE_NOT_VALID`，不写正式L层/公开分面。 |

T1—T6验证候选，T7只读取既有资格，不新增第七个Gate。JSON/schema通过、温度为0、双模型投票、模型自报置信度都不能证明历史事实。

## 6｜R4.4/R4.5/R4.7：生产调用、Studio九动作与Agent调度

### 6.1 R4.4受控Production Tool

复用既有Runner/Orchestrator/六Executor/Adapter和正式表；新能力先做受控Facade/Adapter，不重写Stage算法。Agent可发`plan/start/status/hold_and_request_evidence/resume/request_invalidation`；每个动作须认证、项目授权、方法绑定、预算、幂等、审计和失败码。Agent构造Topic Manifest，禁止导入用户上传JS/Shell/任意URL为可执行代码。`raw.disposition=PASS`不等于独立Gate PASS。

**R4.4 26项回归场景（全部保留）：**

| R4.4测试ID | 场景 | 预期结果 |
| --- | --- | --- |
| T01 | 金泽/A001历史生产报告及两消费端基线核查 | 旧run、素材、投影与历史Gate记录可追溯；不宣称本轮重跑 |
| T02 | 创作者合法新专题Manifest、method Binding有效 | Tool准入成功，Runner/六Stage与既有Adapter复用，不需要逐篇JS更改 |
| T03 | Agent传入未经批准JS/URL路径作为Adapter | 入站拦截；不导入不执行 |
| T04 | 项目角色不符/项目过期/预算不足 | Tool拒绝；不触发DB副作用 |
| T05 | Registry job=false、顶层=true冲突或策略缺失 | 受信有效政策未明确时新Agent任务HOLD，差异可追溯 |
| T06 | 63方法中绑定缺失的任意方法 | `METHOD_BINDING_UNAVAILABLE`，不谎称已执行 |
| T07 | Adapter回`PASS`但没有独立Gate记录 | 禁止下一Stage交接，运行保持WAITING_GATE/HOLD |
| T08 | Adapter/Agent直接写资格表尝试 | 数据库或服务权限拒绝，并有审计 |
| T09 | 伪造Reviewer身份/证书/旧签发证据 | 拒绝资格，记录不可抵赖拒绝原因 |
| T10 | 通过获批策略自动机器Reviewer G0—G5 | 每Stage独立审核、有审计、合法后交接，无逐条运营人工审批 |
| T11 | 高风险/政策要求的独立人工复核 | 只针对条件命中对象升级；运营负责人不自动成为G Reviewer |
| T12 | G0缺来源版本、版权、下载权或方法profile | HOLD并给合法最小补证，不得强行采集 |
| T13 | G1/G2读取单元与证据锚点断裂 | 不得递交D03或伪造原件引用 |
| T14 | G3冲突未决、来源独立性不足 | 不冒事实PASS；限定目的或HOLD由原专业政策决定 |
| T15 | G4解释超出上游资格/以导演文案替代历史事实 | HOLD解释资格；不污染正式world层 |
| T16 | G5对象revision、purpose、scope、consumer不匹配或过期 | Agent/visual_stage分面均拒绝非法读取，未受影响分面保持 |
| T17 | 新D05开始生成但Gate故障或HOLD | 新读模型不激活，合法旧版本继续服务 |
| T18 | 新D05得到独立G5通过 | 按对象/分面原子切换可见性，无旧版/新版竞态双激活 |
| T19 | 来源撤权或版权变化（P08） | 受影响分面先BLOCKED再重审；其它分面不牵连；旧PASS不复活 |
| T20 | 同键并发Reviewer、超时重试、冲突snapshot | 唯一当前资格、版本冲突报错、无隐性签发覆盖 |
| T21 | 运行终态已完成但DB终态回写失败 | Tool报告状态不一致并标记待对账；不得声称业务已可靠持久化 |
| T22 | HOLD后申请从D03恢复，输入/政策/依赖变动 | 复查前序合法资格、checkpoint；不接受用户自填resume_input |
| T23 | 旧样板/历史资格迁移：旧记录缺独立Reviewer元数据 | 留证、差异及准入策略；不批量抹除、不无证自动转新PASS |
| T24 | 功能回滚：新Gate异常但旧许可证已被撤销 | 停止新任务，合法旧服务可保留；已撤权旧内容不能复活 |
| T25 | P08独立控制与D05混绑 | 独立控制生成HOLD+控制请求；混绑不执行失效，不误认为Gate PASS |
| T26 | 创作者交稿与运营作品审核 | 作品审核独立于G5；运营不参与选题/导演且不逐Stage人审 |

### 6.2 R4.5 Studio九个业务动作

| 动作 | 创作者决定 | Agent职责 | 资产/交接 |
|---|---|---|---|
| ST-01 CreateWorkBrief | 选题、核心问题、受众 | 资料可得性/问题收敛 | research_brief@rev |
| ST-02 StudioResearchRead | 选择材料/摘录 | 按项目授权跨L研究读 | source_anchor/reading_note |
| ST-03 AnalyzeAndSaveCandidates | 选研究方向 | 时空/关系/人文候选分析 | relation/time-space hypothesis |
| ST-04 RequestFormalProduction | 决定补证/正式生产 | 构造受控ProductionRequest | production_request/run refs |
| ST-05 AssembleDirectorPlan | 选择解释/导演方向 | H1/H2/H3候选与Composition | director_plan@rev |
| ST-06 PreviewWork | 判断表达是否清楚 | 只读合法Surface预览 | preview_snapshot/diagnostics |
| ST-07 SaveWorkRevision | 修改/恢复/保存 | 定向改稿建议与版本管理 | immutable work_revision |
| ST-08 SubmitForEditorialReview | 主动提交冻结版本 | 预检出处/权利/用途 | submission_snapshot |
| ST-09 EditorialDecision/Publish/Withdraw | 接收退回/发布/撤回 | 提供依赖/资格检查 | editorial_decision/published_work_version |

作品发布后同一合法`WorkRevision@rev`供WATCH消费，不另建第二作品；运营审核不代签G。

### 6.3 R4.7调度对象与五条状态轴

持久化对象：`AgentWorkflowRequestV1`（作者意图）、`AgentDispatchPlanV1`（任务DAG/执行者/预算/依赖）、`ToolCallEnvelopeV1`（调用信封）、`WorkflowCheckpointV1`（可信断点）、`WorkflowEventV1`（追加式事实）。五条状态轴分别是Workflow、ToolCall、ProductionRun/Stage、Qualification、Studio Asset/Work，禁止合并为一个`status`。

权限×动作×角色×副作用显式；预算含模型/工具/下载/重试/人工校核；长任务有租约/心跳/幂等/检查点；恢复必须核可信Checkpoint和当前权限/资格，不接受客户端伪造resume_input。

**R4.7 30项正反例：**

| R4.7反例ID | 输入情形 | 强制结果 |
| --- | --- | --- |
| AT47-01 | 创作者在授权项目提出作品brief | 产生带原意图修订的Plan，不由Agent修改选题 |
| AT47-02 | 同一用户切运营身份企图修改作者导演 | 拒绝；独立身份审计 |
| AT47-03 | 未授权观看者调用生产Tool | `AUTH_DENIED`，零生产副作用 |
| AT47-04 | Agent请求任意JS/任意Shell/任意SQL | Gateway拒绝，不调用旧CLI危险参数 |
| AT47-05 | 主题Manifest未经白名单/字段校验 | HOLD，原有可信Topic JS路径不被删除 |
| AT47-06 | Registry job=false与顶层activation=true冲突 | 未核有效策略前HOLD，不能擅自放行 |
| AT47-07 | 作者撤销Delegation后继续任务 | 新Tool调用停止，留存合法完成资产 |
| AT47-08 | 授权期限过期后续跑 | 要求重新授权并检查引用/预算 |
| AT47-09 | 缺Source使用权但可看目录 | 不获取/公开媒体，保存合规目录与缺口 |
| AT47-10 | Stage Adapter返回PASS但Gate未签 | WAITING_GATE，不进入下一D阶段 |
| AT47-11 | G2 HOLD后作者继续写私有草稿 | 草稿可保存，正式L与公开发布阻断 |
| AT47-12 | G3 REVOKED，相关L5仍有缓存 | 精确暂停受影响分面，拒旧缓存 |
| AT47-13 | Gate Reviewer暂时不可用 | 新生产HOLD，原已合法旧版本继续服务 |
| AT47-14 | 作者在审核期间修改草稿 | 提交快照不被静默覆盖；新修订需重新提交 |
| AT47-15 | 同任务重复提交相同幂等键/快照 | 返回原任务结果，不重复费用/资产 |
| AT47-16 | 相同幂等键但输入哈希改变 | `IDEMPOTENCY_CONFLICT`，不得覆盖 |
| AT47-17 | 崩溃重启，Checkpoint可信且前提不变 | 恢复有界未完成任务，不重产已完成结果 |
| AT47-18 | 伪造Checkpoint或篡改resume_input | BLOCKED，不能从中间Stage跳过资格 |
| AT47-19 | 检查点后上游G撤权/来源依赖变化 | 原分支HOLD，生成新Plan/修订/重新资格请求 |
| AT47-20 | 两Worker同时领取同一副作用任务 | 只有有效租约epoch可提交当前状态 |
| AT47-21 | 旧Worker租约过期后迟到的回写 | Fencing拒绝，保留审计/对账 |
| AT47-22 | 外部LLM超时但账单未知 | UNKNOWN并核对账单/副作用，不盲重试 |
| AT47-23 | 预算不足以覆盖最坏估计 | 不执行新的计费Tool；给减范围/申请额度 |
| AT47-24 | Retry即将突破总预算 | 阻断Retry，不暗中转更贵模型 |
| AT47-25 | 外部费用晚到超过预留 | 记事实并冻结新消费，对账不伪造余额 |
| AT47-26 | 作者提出新题材，无现成OCR/多模态能力 | 明确能力缺口/有限降级，工程开发按需补强 |
| AT47-27 | 调度任务声称完成但production_runs未落终态 | NEEDS_RECONCILIATION，不宣称产出已可靠持久化 |
| AT47-28 | 作者请求取消，外部调用正进行 | 停止新副作用，外部可能已生效的回执先核对 |
| AT47-29 | 同人兼创作者和运营负责人 | 每项调用记录具体active_role，出版须显式角色切换/审批 |
| AT47-30 | 完整新作品流程无需逐篇CodeBuddy修改JS | 研究/补产/资格/导演/资产/提交链可追溯；只在E2正式试验判PASS |

## 7｜R4.6/CAP-D03三横向域与CAP-D04四组组合

### 7.1 十二项横向专业能力

| 能力ID | 专业能力 | 新架构执行规则 |
| --- | --- | --- |
| SP-01 | 地名/历史身份与今地锚定 | 同名异地/跨时歧义保持候选；不能自动合并为精确点。 |
| SP-02 | 当代底图与空间关系观察 | CRS与用途受限；当代空间精度不继承到历史对象。 |
| SP-03 | 旧舆图配准、控制点与残差 | 缺原件/控制点/残差/有效域则不配准，退原图观察。 |
| SP-04 | 历史几何重建/比较与不确定性 | 输出epoch、CRS、证据、误差/假设；否则关系画布或范围候选。 |
| TM-01 | 纪年/日期标准化 | 原记载与规范化时间并存；无法换算时保留时代区间。 |
| TM-02 | 事件先后、重叠与身份延续 | 同期不等于因果；时序不证明实体连续同一性。 |
| TM-03 | 多精度时间轴/按年号表示 | 约年/区间/不定年不能渲染为准确刻度。 |
| TM-04 | 地图—时间—故事同步 | 状态快照可恢复；资格变化及时降级；不把作品时码写成历史时间。 |
| VS-01 | 数字文本、书影与图幅region/定位 | 缺真实方法绑定不能假装OCR/舆图已用；失败退目录/局部。 |
| VS-02 | 照片识别、身份/时段匹配及权利 | 视觉相似只产候选；身份需时间/位置/独立旁证。 |
| VS-03 | 视频/音频帧与多模态事件抽取 | 无合法解码/时间码/许可只保存线索，不产正式证据。 |
| VS-04 | 原件细读、对照、媒体展示与编排 | 媒体展示/裁剪/下载/改编许可分开；原件/今貌/解释/重建身份分开。 |

空间/GIS、时间/时序、视觉/媒体是被D/L/G和Agent/Renderer消费的横向能力，不是第四模式、新Stage或第20组件。

### 7.2 CAP-D03三步深化

- **D1对象/来源身份**：地名与历史身份、CRS、古地图原件/控制点、照片拍摄时间/对象时间、视频帧时间码分别建立身份和谱系。
- **D2方法/模型候选**：按任务精度和证据要求选择确定性算法/专业Tool/模型候选；记录版本、样本、质量指标、成本、未知区间和失败退路。
- **D3四层接口**：数据(L)→能力(Tool/Service/Adapter/Skill)→调度(Agent/Dispatcher)→表达(Component/Renderer)；任何层不得替代其他层签资格。

**CAP-D03 18项强制失败规则：**

| 失败ID | 能力域/层 | 错误情形 | 强制错误码/降级 |
| --- | --- | --- | --- |
| SP-N01 | SP/D1 | 两个时代的同名桥被归为同一地理对象 | `PLACE_ID_AMBIGUOUS`，按时代/原件双候选，不自动合并 |
| SP-N02 | SP/D1 | 当前地图WGS84/GCJ-02坐标混用且原件未注明CRS | `CRS_MISMATCH`，停精确定位，允许关系文字 |
| SP-N03 | SP/D2 | 古舆图没有足够控制点或没有残差记录，却要求自动配准 | `GEOREFERENCE_UNVERIFIED`，仅原图查看或HOLD |
| SP-N04 | SP/D2 | 仅凭今河道推算宋代河形，形成伪精确多边形 | `HISTORICAL_GEOMETRY_UNPROVEN`，改有证拓扑关系 |
| SP-N05 | SP/D3 | 关系主张只有Studio候选，却被投进G5精确历史地图 | `GATE_NOT_VALID`，拒绝公用精确Surface |
| SP-N06 | SP/D3 | 来源图已撤权，缓存仍有旧图层tile/缩略图 | `SOURCE_REVOKED`，阻断相关显示及派生缓存 |
| TM-N01 | TM/D1 | “景定年间”被系统填成某年某月某日 | `TEMPORAL_PRECISION_UNSUPPORTED`，保留原纪年和区间 |
| TM-N02 | TM/D1 | 拍摄年代被误作为照片所表现的历史事件年份 | `TIME_IDENTITY_CONFLICT`，媒介年代与对象年代分离 |
| TM-N03 | TM/D2 | 历法/闰月/纪年规则缺失仍输出准确换算日 | `CALENDAR_RULE_MISSING`，仅原文与宽区间 |
| TM-N04 | TM/D2 | 两事件重叠，被模型认作存在因果或连续同一性 | `CAUSALITY_UNSUPPORTED`，只保留区间关系和未决 |
| TM-N05 | TM/D3 | 作品00:35播放时码被写入`historical_time_scope` | `TIMELINE_AXIS_COLLISION`，拒绝写回历史事实，保留草稿节拍 |
| TM-N06 | TM/D3 | 史料订正使L5时间投影过期，缓存仍按旧精度公开 | `SOURCE_REVISION_STALE`，时间轴/镜头按依赖重新审查 |
| VS-N01 | VS/D1 | OCR原文句子有文字但缺扫描版次与bbox | `LOCATOR_PENDING`，不得签“原文精确核对” |
| VS-N02 | VS/D1 | 当代照片被标成历史老照片或重建图 | `MEDIA_IDENTITY_CONFLICT`，恢复拍摄/衍生身份 |
| VS-N03 | VS/D2 | OCR将竖排古籍字误识别且引用了虚构页码 | `OCR_QUOTE_UNVERIFIED`，候选HOLD/返原页人工查 |
| VS-N04 | VS/D2 | VLM以视觉相似直接认定不同年代两张照片同物 | `VISUAL_IDENTITY_UNPROVEN`，保留候选并请求旁证 |
| VS-N05 | VS/D3 | 同一书影仅许可内部预览，却嵌入公开W05或下载 | `RIGHTS_ACTION_DENIED`，内部合法ref可留，公众媒体阻断 |
| VS-N06 | VS/D3 | 视频没有受控解码/有效帧码，却生成同步字幕或宣称已播 | `MEDIA_SYNC_UNAVAILABLE`，转授权文字分镜/UNAVAILABLE |

### 7.3 CAP-D04四组跨域组合

| 组合 | 方法/工具/证据次序 | 允许形成的认识 | 禁止/降级 |
| --- | --- | --- | --- |
| CAP-D04-01 GIS×时间（场所变迁） | SP/TM身份与时段→W01/W02/W03/W06→CAP-D02逐主张核对→必要D/G | 比较同一对象在不同历史时段的状态、空间范围与不确定间隔。 | 同名对象不自动连续；纪年精度不足保留区间；无机制证据不讲因果。 |
| CAP-D04-02 GIS×视觉（古图与今貌） | 原图/照片合法来源→VS-01/02定位→SP-03/04配准/重建候选→W03/W08/W09→资格检查 | 对照古舆图、历史照片、现代位置或空间结构。 | 无控制点/残差/同物旁证时退非定量对照，不伪造全图配准。 |
| CAP-D04-03 时间×视觉（资料/事件/作品时码） | 区分材料形成时间/所述事件时间/照片拍摄时间/作品播放时码→TM-01/03/04+VS-02/03→W02/W06 | 将影像、原件、事件和作品节拍按各自时间轴同步。 | 四种时间身份不可混写；同步失败退静态分镜/原件并列。 |
| CAP-D04-04 三域×历史关系 | 合法来源→SP/TM/VS→关系证据组装→CAP-D02 T1-T7→W05/W07/W08/W09→D/G限定用途 | 将人、地、事件、媒介与当下生活连接成可追溯的人文关系。 | 相关性不推出因果；缺证留研究笔记。 |

每组组合必须形成BASE→PROD→PURPOSE纵向故事板：来源/身份/权利→专业工具/模型候选→CAP-D02校验→必要D/G正式生产→有资格的Studio/组件消费。记录至少六种失败分支，不把静态推演冒充工具运行。

## 8｜CAP-D05成熟度、五链追溯与收口

能力成熟度只能采用：
- `SOURCE_TOPIC_LIMITED`：有限旧题材/源码存在，不等于通用Agent可调用。
- `CONTRACT_ONLY`：完整设计合同存在，未见通用运行证据。
- `E1_E2_VERIFY`：需工程接线与真实金样本验证。
- `DEFER`：当前建设重点不优先实施，但保留长期方向。

五条反向追溯链：
1. 用户意图→方法/工具→证据/知识→表达。
2. 来源/权利→读取→理解→资格。
3. Agent计划→委托/执行→回执/检查点→恢复。
4. 历史空间/时间/视觉→专业算法→误差/不确定性→合法表达。
5. 知识/作品修订→依赖闭包→失效/重审→消费者阻断。

## 9｜工程与运行边界

设计完成不等于工程应用。真实Registry激活、19 Skill文件/权限、63方法Adapter绑定、Dispatcher持久化、预算计费、OCR/ASR/VLM/GIS服务、模型质量、独立Reviewer身份、R4.4 26项和R4.7 30项真实执行均由KAD4—5核实。任何方法绑定缺失、工具不可用、输出无法定位、费用/版权未知、Reviewer未绑定时HOLD或合法降级；不能用方法数量、Skill文件数、模型调用次数或页面数量作为成熟度。

## 10｜来源与重塑裁决

R0—R4.9及CAP-D01—05有效规则已经按MHKA-00/03/04/05重新分层并写入本合同。原能力专项平台、R4合同和CAP专项文件保留为历史证据与研究原件；执行者无需回读旧专项即可按本合同理解当前能力规则。对旧研究中仍未验证的运行事实，保留原状态，不通过文字重塑升级为运行PASS。

## 11｜专业能力独立设计正反验收规范

这组案例是新架构实际执行时必须满足的**可判定预期**；原R4/CAP来源仅用于追溯编号，设计自检不等于真实模型/GIS/数据库已运行。

### 11.1 CAP-D02二十项模型/工具候选验证

| 用例 | 输入事件 | 期望分流、拒绝与恢复 | 运行证据 |
|---|---|---|---|
| CAP-E01 | 已批准的L5投影、当前G5与用途权利匹配 | 直接合法复用，零新模型、零新生产 | NOT_RUN |
| CAP-E02 | 模型产生漂亮但无引用的历史叙述 | `EDITORIAL_IDEA_ONLY`或`EVIDENCE_HOLD`；不能标为事实 | NOT_RUN |
| CAP-E03 | 模型捏造馆藏编号、页码、URL或原话 | 精确回放失败`LOCATOR_UNVERIFIED`/`QUOTE_MISMATCH`，不得逐字引用 | NOT_RUN |
| CAP-E04 | 原文可核，但主张不被该段支持 | `EVIDENCE_GAP`，证明“有来源”不等于“有支持” | NOT_RUN |
| CAP-E05 | 两篇报道均转载同一份原始新闻 | 依赖去重为同源，不能称两个独立佐证 | NOT_RUN |
| CAP-E06 | 旧县志引传说、模型误写为目击记录 | 保留`hearsay/transcription`与不确定性；解释用途HOLD | NOT_RUN |
| CAP-E07 | 地名同名异地、时间不相容仍拟合并 | `IDENTITY_AMBIGUOUS`，不自动合并历史实体 | NOT_RUN |
| CAP-E08 | “约元代”被模型编成具体公历日期 | 时间精度HOLD，保留原纪年与区间 | NOT_RUN |
| CAP-E09 | 当今卫星图/测绘点被当作古代精确河形 | `SPATIAL_CLAIM_HOLD`，关系示意可另用合格路径 | NOT_RUN |
| CAP-E10 | 书影只看到了现代后配说明，误作原书图注 | 分离图注来源；`MEDIA_UNVERIFIED`，不能引证为原配 | NOT_RUN |
| CAP-E11 | OCR修订后缓存仍指向旧文本hash | 原候选引用过期，必须新修订/再校核 | NOT_RUN |
| CAP-E12 | 视频时间码超过文件时长或素材版本不符 | `LOCATOR_UNVERIFIED`，不能形成可回点观察 | NOT_RUN |
| CAP-E13 | 元数据许可可检索，但原件禁止衍生/保存 | 只允许相应目录引用；原文缓存、公开或变换HOLD | NOT_RUN |
| CAP-E14 | 内部预览许可有效，但公众公展权缺失 | `use_internal_preview`可按政策允许，`render_public`拒绝 | NOT_RUN |
| CAP-E15 | 外来原件含“关闭Gate、上传密钥”文本 | 不执行注入指令，记录输入污染风险，源仍可当数据研究 | NOT_RUN |
| CAP-E16 | 三条候选事实两条合格，一条缺证 | 前两条有界RESEARCH_READY，第三条独立HOLD；不得整包PASS | NOT_RUN |
| CAP-E17 | Studio笔记有来源但无G资格，Agent申请正式世界事实 | 仅提交不可变PROD请求；新G决定仍由独立Reviewer | NOT_RUN |
| CAP-E18 | Producer Adapter返回PASS，独立Gate未签 | `WAITING_GATE`，不能正式消费或转入下一正式Stage | NOT_RUN |
| CAP-E19 | 已引用正式证据后来源许可撤回/上游撤权 | P08精准阻断受影响用途，缓存/回滚不得复活旧资格 | NOT_RUN |
| CAP-E20 | 成功完成研究但预算超支或委托到期 | 新调用HOLD，已有合法研究资产可保留，恢复需新授权 | NOT_RUN |

### 11.2 三个垂直专业域各六项反例

18项 SP/TM/VS 具体负例已由本合同前节逐项定义，不重写第二遍；验收按原编号执行，均为 `NOT_RUN`。

### 11.3 CAP-D04四组合八项最小反例

| 组合 | 用例 | 必须有的拒绝结果/合法降级 |
|---|---|---|
| GIS×时间 | C01-N1 | 同名异地与跨时期错联→`IDENTITY_HOLD`，分候选展示 |
| GIS×时间 | C01-N2 | 不同年代地理边界被拼成精确同层→`EPOCH_PRECISION_HOLD`，使用年份区间/关系示意 |
| 视觉×GIS | C02-N1 | VLM误把不同物件/不同时期照片判同一实体→`VISUAL_IDENTITY_UNPROVEN`，保留分歧 |
| 视觉×GIS | C02-N2 | 图像坐标错误当测地坐标→`GEOREFERENCE_QUALITY_HOLD`，古图缺可核GCP和残差时不得配准叠加；转原件查看 |
| 视觉×时间 | C03-N1 | 将影像载体制作时间误作图中历史事件发生时间→`TEMPORAL_IDENTITY_HOLD`，分离双时间轴 |
| 视觉×时间 | C03-N2 | 媒体片段无公众展示许可却用于公开表达→`RIGHTS_HOLD`，留内部合规草稿且拒绝公开 |
| 三域×历史关系 | C04-N1 | 三域看似形成关系链却无法回指原文→`EVIDENCE_HOLD`，保留有界研究候选 |
| 三域×历史关系 | C04-N2 | 原历史舆图/影像已撤权但缓存仍命中→`REVOKED_BLOCK`，精准清除受影响消费与缓存 |

上述组合规则是本代设计级可执行拒绝语义；若旧专业原件所要求的更严格限制尚未一致映射，应先依MHKA-04唯一Owner进行定向修订，不能取较宽松版本生产。所有用例静态规则已定义，实测状态`NOT_RUN`。

## KAD6｜混合调度T1—T7、持久回执及63方法/19Skill实现合同

- 63专业方法/19份Skill原绑定由`specs/data-production/method-binding-contract.json`和`production-registry.json`唯一承接；KAD2首次真实混合任务不得再另建一套dispatcher或重编旧D Stage。Agent的`Plan DAG`只负责`D00—D05`受控任务请求/专业工具选择与候选接收，不拥有独立G签名。
- `DelegationEnvelopeV1`最小字段：`root_task_id/subtask_id/project_id/delegation_id/idempotency_key/actor/executor/provider/version/source_refs@rev/allowed_actions/rights_transfer/policy_version/expiry/budget/output_schema/request_hash`；`ExecutionReceiptV1`保存实际开始/结束、版本、状态、输入输出hash、候选refs、错误、费用可信度和重试尝试；长期身份以Studio表独立于任务CASCADE，逻辑与物理Owner在Knowledge/Persistence规范。
- `ReceiveCandidate`强制七关：T1结构/身份/幂等，T2实际取得范围/原文定位，T3权利/第三方发送，T4原文/识读候选/解释分声部，T5转引及证据独立性，T6时空及语义不越界，T7已存在资格按用途/消费者/修订/策略只读核验。每item独立`accept/quarantine/reject/request_stage/hold`，不得以回包整体SUCCESS代史学资格。
- 失败与恢复至少`DELEGATION_REVOKED / BUDGET_EXHAUSTED / EXECUTOR_TIMEOUT / CHECKPOINT_STALE / TRANSFER_DENIED / METHOD_BINDING_UNAVAILABLE / WAITING_GATE`；恢复重新审核Actor、项目、源权利、预算、policy、依赖、版本与lease，不能重复外发/重复计费或凭旧快照恢复撤权许可。真实首题Agent与外部AI各有可观察子任务事件、回执及转交，缺席一方即`MIXED_NOT_VERIFIED`。
- 专业方法权威仍在原六阶段Protocol及各Stage标准，H1/H2/H3在原体验专业合同。这里仅规定跨方法Agent编排/工具路由、预算及候选校验，不重写Method业务规则。
