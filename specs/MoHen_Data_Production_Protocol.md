**MOHEN · DATA PRODUCTION**

**墨痕 · 数据生产协议 V1.1（无人值守 + 有人值守）**

*Unattended & Attended Developer Skills × Evidence Gate × Safe Promotion*

|                                                                                                           |
| --------------------------------------------------------------------------------------------------------- |
| **目标：让系统在你不在场时持续“造世界”，但只自动做可追溯、可回滚、低判断风险的工作。遇到身份歧义、历史因果、空间重建、来源冲突等问题，不打断无人值守施工，也不硬猜——统一 HOLD，到点后只给你一份异常摘要。** |

**定位：**这是 C2/C3 之下的 Developer-Skill 施工协议，不是 C0–C4 的新宪法。它把此前“知识生产循环、Developer Skills、Evidence Gate G0–G6、Human Review”整理成可无人值守运行的批次规则。

**依据：**C2 Humanistic Data OS & Dual Skill、C3 Database & Cultural World，以及早期 V4.0/V4.1 与 早期开发工具版本 V2 中已形成的数据生产/Evidence Gate/Discovery Pipeline。文中“无人值守批次、自动晋级边界、失败隔离、执行报告”是本次为无人值守场景补充的执行规则。

# 0｜一句话原则

|                                                                                                     |
| --------------------------------------------------------------------------------------------------- |
| **无人值守自动化不是“AI 自动写历史”，而是“机器自动扩大 Candidate / Evidence / 可验证关系的供给；只有确定性足够高的结构化结果才能自动晋级，判断性内容一律 HOLD”。** |

因此无人值守系统的成功指标不是“上一轮新增了多少故事”，而是：新增了多少可追溯 Source / Evidence / Candidate；多少确定性记录安全通过 Gate；多少高价值疑难被准确送入 HOLD，而没有污染可信文化世界。

# 0.5｜两种值守模式（2026-10-02 术语与模式澄清）

数据生产按**谁做判断**分为两种模式。二者**共用同一条流水线、同一套 Gate、同一个生产注册表**，区别只在“谁做判断”。

|  | **无人值守生产**（Unattended） | **有人值守生产**（Attended） |
|---|---|---|
| 触发 | 项目拥有者发指令 | 项目拥有者召开值守会话 |
| 边界 | 给定**范围**与**截止时间**，期间自动运行 | 拥有者在场，逐项处理需要判断的事 |
| 只做 | **确定性、可回滚、低判断风险**的工作；歧义一律 HOLD | 身份消解、跨源冲突取舍、历史空间判断、Meaning / Present Connection 边界 |
| 产出 | Candidate / Evidence / 可用记录 + HOLD 队列 | 裁决记录（`human_review_decisions` / `review_queue`）+ 叙事缺口回填 |
| 拥有者必看 | **执行报告一页**：三值结论 + 最多 3 条 Escalation | 值守工作清单（HOLD 队列，按价值排序） |
| 绝不做 | 不自动判歧义、不自动发布、不扩 Schema / 写权限 / 基础设施 | 不代替证据——人也不能把无据判断写成历史事实 |

**术语更正**：本协议原名“**夜间自动化数据生产协议**”（Night Data Production Protocol）。**“夜间”是误导**：

- 它真正的约束**不是时钟**，而是**判断风险的边界**；
- 它是**按需触发 + 截止时间**，不是定时调度（执行器本来就支持“跑到某个时刻为止”，随时可发指令）；
- 无人值守期间不做某些事，不是因为“天黑了”，而是因为**那需要人**。

因此原协议中的“夜间批次 / 夜间作业 / Night Registry”分别改称**无人值守批次 / 无人值守作业 / 生产注册表**（执行层文件名与 `tools/production/` 目录将在 M1 批次一并更名）。
文件亦已更名：`MoHen_Night_Data_Production_Protocol.md` → **`MoHen_Data_Production_Protocol.md`**（`git mv`，非删除）。

# 0.6｜有效生产：数据生产服务于人文叙事（不可偏移）

**产出的不是数据量，而是“某条叙事从讲不出变成讲得出”。**

- **上游锚点**＝**叙事缺口清单（Narrative Gap Register）**：一份按叙事单元列出“需要什么材料 / 现在有什么 / 缺什么 / 缺什么裁决”的登记册。
  - 它是**一类文档的契约，不是某一个文件**；任何范围（一个镇、一个母题、一个主题）都可以有一份。
  - **当前唯一实例**＝`specs/data-production/T03_金泽材料盘点_覆盖矩阵.md`（范围：**金泽 · 五母题**）。该文件的形式已确认可用；**其有效性须按本协议复审**（已知两点：① 其中的“来源门禁”条款与实现不符；② 范围只覆盖金泽）。协议**不绑定**该实例——换一个叙事范围，就另立一份登记册。
- **叙事缺口（Narrative Gap）**＝登记册上“缺材料或缺裁决”的一格。**每一批生产都必须声明它瞄准哪个缺口**（与采集意图声明是同一件事）。
- **有效性判据**：本批是否让某个缺口**推进或关闭**。**只报“落库新增 N 条”不算有效生产。**
- **分工**：无人值守只做“**补材料**”（素材 / 证据 / 候选）；“**补判断**”（身份、冲突、历史空间、Meaning 边界）**必须有人值守**。
- 因此**执行报告必须回答一句**：“本批推进了哪几个叙事缺口”。答案是“没有”时，这批生产即为无效，应停下来问为什么——而不是继续堆数据。

# 0.7｜执行报告：无人值守任务的执行结果报告

**它是“任务执行结果报告”，不是按时辰命名的“晨报”。** 无人值守可以发生在任何时段；报告只说明一件事：**这一轮执行了什么、结果如何、哪几件事需要人看。**

**三种形态，一次生成、同源产出，用途不同：**

| 形态 | 文件 | 给谁用 | 硬要求 |
|---|---|---|---|
| **机器可读** | `report.json` | 后续自动化与机器解读（继续开发、回归比对、跨轮聚合） | 稳定 schema + schema 版本号；每个数字附其 SQL 或数据来源；**不得含模板断言** |
| **可视化** | `report.html` | **项目拥有者审查**——一眼看清结论、异常、缺口推进 | 单文件、离线可开、零外部依赖；**结论与 Escalation 置顶** |
| **人读摘要** | `result.md` | 文本阅读、diff、入库归档 | 与 json **同源生成**，不得各写一套 |

**内容最低集（三形态必须一致）：**

1. **结论**：三值 `PASS` / `PASS WITH HOLD` / `STOPPED` + 停止原因（截止时间到 / STOP 文件 / 连续失败 / 致命错误）。
2. **Escalation：最多 3 条**，只列会阻塞当前体验的。
3. **本批推进/关闭了哪几个叙事缺口**（§0.6）。答“没有”＝**本批无效**。
4. **本批事实表**：每行附其 SQL 出处（门禁审计条数、HOLD 新增、可用对象数、红线计数等）。
5. **作业明细**：成功 / 失败 / 跳过 + 原因。
6. **归因口径与已知限制**（例如：尚无 run 级关联，故“本批”＝时间窗口径）。

**禁止**：任何未经查询的断言。历史教训——曾用模板字符串断言“未绕过 Evidence Gate”，而同一批 1246 张图片在 `evidence_gate_audit` 中为 **0 条**记录。

# 1｜无人值守工厂在 Humanistic Data OS 中的位置

| **层**                           | **无人值守允许做什么**                                             | **无人值守默认不做什么**                |
| ------------------------------- | ------------------------------------------------------- | --------------------------- |
| L0 Cultural Sources             | 抓取/导入、Raw append-only、checksum、版本、许可与来源元数据              | 删除/覆盖原始资料                   |
| L1 Evidence & Provenance        | 切 Fragment、locator/page/quote、确定性 metadata、来源链、冲突标记     | 把 AI 生成文字当 Evidence         |
| L2 Humanistic Objects           | 候选实体/事件/地点/时间抽取；确定性字段标准化                                | 歧义实体自动合并                    |
| L3 Cultural Relations           | 生成 Relation Candidate、relation path、证据绑定                | 历史因果/跨源复杂关系直接发布             |
| L4 Meaning / Present Connection | 生成 MeaningCandidate / PresentConnection Candidate 供后续使用 | 把解释性生成物写成历史事实               |
| L5 Discovery / Experience       | 可预计算 Discovery Candidate / visual hook 等候选              | 无人值守擅自改变 Canonical Experience |
| L6 Participation                | 当前 HOLD                                                 | 正式用户贡献体系                    |
| L7 Living Culture               | 当前 HOLD                                                 | 把当代记忆自动晋级为历史真相              |

# 2｜Developer Skills：无人值守真正使用哪几类

C2 已定义 11 个 Developer Skill 家族；无人值守数据生产只启用其中与“造世界”直接相关的部分。为了避免再造一套 Skill 名称，本协议直接复用 C2/C3。

| **Skill / 能力**                              | **无人值守角色**                                                    | **默认模式**                     |
| ------------------------------------------- | ----------------------------------------------------------- | ---------------------------- |
| mohen-project-guard                         | 开跑前检查 Repo/Secret/Legacy/写入边界；阻止越权任务                        | AUTO                         |
| mohen-data-ingest / Source Ingest           | 外部资料 → Source Record / Version / Raw Item；Raw 永久保留          | AUTO                         |
| Structure Extraction                        | 文本/表格/图像 → Entity/Time/Place/Relation Candidate             | AUTO → CANDIDATE             |
| Evidence Fragment                           | 来源 → 可定位 Fragment / Evidence unit                           | AUTO                         |
| Entity Resolution                           | 别名、同名、历史名称对齐                                                | 仅确定性 AUTO；歧义 HOLD            |
| mohen-evidence-gate / Evidence Adjudication | 执行 G0–G6、冲突检测、review queue                                  | AUTO GATE；不替代 Human Review   |
| mohen-knowledge-weave / Claim Builder       | Evidence → Relation/Event/Change Candidate；保留 relation path | AUTO → CANDIDATE             |
| mohen-spatial-grounding / Spatial Evidence  | 现代坐标、历史空间 claim、precision/confidence                        | 现代确定坐标可 AUTO；历史锚点/几何 HOLD    |
| mohen-visual-asset / Visual Asset           | provenance、rights、creation date、depicted period、对象关联        | metadata AUTO；同景判断/权利不清 HOLD |
| Projection Builder                          | 仅把已经通过发布条件的 World 构造成 Agent 可读 Projection                   | AUTO，受 Gate 限制               |
| mohen-acceptance                            | 批次完整性、测试、计数、异常、回滚点、执行报告                                       | AUTO                         |

Agent Skills（S01–S08）不是无人值守数据工厂的主执行器。无人值守可以调用 relationship\_discovery / evidence\_chain 一类能力辅助发现 Candidate，但其产物仍受 Developer-side Gate 管理；不得因为 Agent“觉得有意思”就写入 Truth Store。

# 3｜无人值守主流水线

|                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acquire → Preserve Raw → Normalize → Extract Candidates → Build Evidence → Resolve Identity → Build Claims/Relations → G0–G6 → AUTO-PROMOTE / HOLD / REJECT → Projection Refresh → Acceptance → 执行报告** |

| **阶段**          | **必须产物**                                                      | **失败时**                |
| --------------- | ------------------------------------------------------------- | ---------------------- |
| 01 Acquire      | source\_id、provider、URI、retrieved\_at、license/rights、checksum | 记录 ERROR；不影响已完成来源      |
| 02 Preserve Raw | immutable raw snapshot / raw item                             | 禁止覆盖；写失败则该 source 整体停止 |
| 03 Normalize    | 标准字段、编码、日期/URI格式、去重指纹                                         | 无法确定则保留原值 + warning    |
| 04 Extract      | Entity/Event/Place/Time/Relation Candidate                    | 只写 Candidate           |
| 05 Evidence     | fragment、page/locator、quote/region、source link                | locator 不完整则 HOLD      |
| 06 Resolve      | canonical candidate + alias + confidence + basis              | 同名/歧义 HOLD             |
| 07 Weave        | Claim/Relation Candidate + evidence\_ids + relation path      | 证据不足 HOLD              |
| 08 Gate         | G0–G6 结果 + reason code                                        | 任一硬 Gate 失败不得发布        |
| 09 Promote      | 仅确定性、无冲突、满足 Contract 的记录进入允许层                                 | 其余 HOLD/REJECT         |
| 10 Projection   | 刷新 Agent Read Model                                           | 不得反写 Truth Store       |
| 11 Acceptance   | run\_id、counts、errors、holds、tests、rollback pointer            | 批次不完整标 PARTIAL         |

# 4｜Evidence Gate G0–G6：无人值守裁决规则

| **Gate**               | **核心问题**                         | **无人值守处理**                                     |
| ---------------------- | -------------------------------- | -------------------------------------------- |
| G0 Source Completeness | 来源身份、URI/标识、时间、许可、checksum 是否完整？ | 缺关键 provenance → HOLD                        |
| G1 Object Identity     | 对象身份是否可信？                        | 精确 ID / 强一致可继续；同名、别名冲突 → HOLD                |
| G2 Temporal Semantics  | 时间语义是否明确？                        | 确定日期/区间可继续；约略、纪年歧义保留 uncertainty；无法解释 → HOLD |
| G3 Spatial Honesty     | 空间表达是否诚实？                        | 现代确定坐标可继续；历史锚点/历史几何/同景重建 → HOLD              |
| G4 Evidence Support    | Claim 是否有可定位 Evidence？           | 无 Evidence → 不得晋级                            |
| G5 Conflict            | 是否存在跨来源冲突？                       | 有冲突 → HOLD，保留双方 Evidence，不自动选边               |
| G6 Publish Eligibility | 是否达到该对象/关系的发布 Contract？          | PASS 才可进入允许的 Runtime World / Projection      |

# 5｜什么可以整夜自动跑，什么绝对不能自动判

| **AUTO：无需你逐条审核**                                                                                                                          | **HOLD：到点后再看，不打断无人值守**                                                                                                     | **REJECT：自动拒绝/隔离**                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Raw 抓取与 append-only 保存；checksum/version；确定性字段清洗；精确去重；Evidence Fragment；明确 ID 的实体对齐；候选抽取；无冲突且 Contract 明确的结构化晋级；Projection rebuild；批次测试与统计 | 同名实体；别名无法消歧；历史因果；跨源复杂关系；史料冲突；历史地图锚点；Historical Geometry；老照片同景判断；rights/license 不清；AI 解释性 Meaning；低置信 relation；任何需要“猜”的内容 | Raw 损坏/无法校验；来源明显重复且 checksum 相同（保留去重日志）；违反 schema 的非法记录；缺失不可恢复主键/来源标识；被规则明确禁止的写入 |

这里的关键不是“所有进入 HOLD 的内容都必须由你亲自审核”。HOLD 只是隔离区。到点后系统只应把高价值、会阻塞当前金泽体验或反复出现的疑难汇总给你；普通 HOLD 可以继续积累，等待未来批量规则成熟后再处理。

# 6｜Truth Store 写权限：无人值守最重要的防线

  - LLM / Agent 不直接写主库事实层。它可以产生 Candidate、建议字段、relation path、reasoning artifact，但写入必须经过受控 Developer Skill / Contract。

  - Raw 永久 append-only；不得覆盖来源原件或原始 API 响应。

  - Candidate Reservoir 与 Runtime World 分离。旧数据、开放数据、外部资料先进入 Candidate Reservoir。

  - Discovery Candidate、Story Seed、MeaningCandidate、Agent 推理草稿不等于历史事实。

  - Projection Builder 只消费已满足条件的 World；Projection 不拥有反向修改 Truth Store 的权限。

  - 任何自动晋级必须记录 run\_id、规则版本、source/evidence IDs、Gate 结果与可回滚定位。

# 7｜无人值守的失败、重试与回滚规则

| **规则**                   | **要求**                                                        |
| ------------------------ | ------------------------------------------------------------- |
| Fail isolated            | 单条/单源失败不能拖垮整夜批次；隔离错误后继续其他 source。                             |
| Idempotent               | 同一批次重复运行不得制造重复事实；依赖 checksum / natural key / idempotency key。 |
| Bounded retry            | 网络/限流等瞬时错误可有限重试；语义歧义不得靠重试“碰运气”。                               |
| No destructive cleanup   | 无人值守禁止不可逆批量删除、覆盖 Raw、无审计的大规模 merge。                             |
| Rollback pointer         | 每次批次保留 run\_id、变更集合/事务边界或等价回滚依据。                              |
| Stop condition           | 出现 schema drift、写权限异常、连续高错误率、来源结构突变时停止相关 pipeline，不扩大影响。      |
| No architecture mutation | 不得无人值守自行新增核心表、改变 Evidence/Meaning 边界、改变写权限或引入新基础设施。             |

# 8｜无人值守批次验收：到点后你只看什么

默认不要求你打开数据库逐条验收。每轮只生成一份极短 执行报告；正常批次可以完全不打扰你。

| **字段**     | **示例含义**                                                |
| ---------- | ------------------------------------------------------- |
| Run        | night-2026-09-27-001 / start / end / duration           |
| Sources    | 扫描多少、成功多少、失败多少、去重多少                                     |
| Evidence   | 新增 Fragment/Evidence 数、缺 locator 数                      |
| Candidates | Entity / Relation / Visual / Meaning Candidate 数        |
| Promoted   | 自动晋级数，按对象类型拆分                                           |
| Held       | HOLD 数 + reason code Top 5                              |
| Rejected   | 拒绝/隔离数 + 原因                                             |
| Conflicts  | 新发现冲突数                                                  |
| Projection | 是否刷新成功                                                  |
| Tests      | schema / integrity / referential / gate tests PASS/FAIL |
| Escalation | 仅列会阻塞当前 Canonical Jinze 的 0–3 个问题                       |

|                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------- |
| **执行报告 的默认结论只有三种：PASS（无需你做任何事） / PASS WITH HOLD（正常，有候选待以后处理） / STOPPED（管线异常，需要 开发总工程师 修复）。不要把“有 HOLD”误判为失败。** |

# 9｜与开发总工程师的分工

| **角色**                                   | **无人值守职责**                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| 你 / Product Owner                        | 不做无人值守数据录入员；只处理真正影响产品方向、文化判断或高价值 Human Review 的少数问题。                                      |
| 开发总工程师 / Chief Development Engineer         | 实现、运行、测试、修复 Developer Skills；维护 batch runner、日志、HOLD queue、执行报告；不得越权改 C0–C4。 |
| 开发平台（架构建议方）          | 在无人值守运行暴露跨架构问题时主动提示：核心对象模型、Evidence/Meaning 边界、写权限、L6/L7 Schema、核心基础设施等；提交项目拥有者确认后方可修改。 |
| Agent Runtime                            | 消费受控 World Projection；可以发现 Candidate，但不拥有 Truth Store 的自由写权。                            |

# 10｜建议的第一阶段 无人值守批次

不要一开始做“全上海自动知识生产”。第一阶段仍服从当前 H2 / Jinze Canonical Experience：只自动生产能补金泽真实体验缺口的数据。

| **Batch**                    | **范围**                                       | **为什么适合先跑**                 |
| ---------------------------- | -------------------------------------------- | --------------------------- |
| N01 Source Refresh           | 已知上图/开放数据来源的增量抓取、checksum、Raw snapshot       | 确定性高，最容易做到无人值守              |
| N02 Evidence Fragment        | 对已知资料生成可定位 Fragment / locator / metadata     | 直接增强 Evidence，不要求历史判断       |
| N03 Candidate Extraction     | 抽 Entity/Time/Place/Relation Candidate       | 只进 Candidate Reservoir，风险可控 |
| N04 Deterministic Resolution | 有稳定 ID/URI/强规则的实体对齐、精确去重                     | 把机器擅长的确定性劳动自动化              |
| N05 Relation Candidate Weave | 围绕金泽当前关系簇生成 relation path + evidence binding | 服务当前体验，不追求数据量               |
| N06 Gate & Projection        | G0–G6、AUTO/HOLD/REJECT、刷新 Agent Read Model   | 形成完整无人值守闭环                    |

暂不作为第一阶段无人值守任务：Historical Geometry reconstruction、历史地图配准、同景老照片判定、历史因果自动裁决、跨来源冲突裁决、Meaning/Present Connection 自动发布、Participation/Living Culture 正式入库。

# 11｜什么时候一种无人值守流程才能晋升为正式 Skill

| **阶段**       | **判定**                                |
| ------------ | ------------------------------------- |
| Candidate    | 只是发现一种可能自动化的方法；先记录。                   |
| Task Pattern | 在真实数据任务中重复出现，开始观察输入/输出/失败模式。          |
| Draft Skill  | 边界稳定，能写出 Contract、Gate、停止条件、测试；小范围夜跑。 |
| Mature Skill | 跨批次复用，多次验收稳定，可进入 生产注册表 默认调度。 |
| Deprecated   | 被更好机制替代或长期不再需要；停止默认调用但保留迁移说明。         |

|                                                                                            |
| ------------------------------------------------------------------------------------------ |
| **晋升公式：真实任务 → 重复方法 → 稳定输入输出 → 明确 Gate → 可回滚测试 → 才进入 生产注册表。不能因为“AI 能做”就创建 Skill。** |

# 12｜生产注册表 最小 Contract

每个无人值守 Skill / Job 至少声明以下字段，开发总工程师 才能把它加入无人值守调度：

> **机器可读落地（2026-10-02 · M1.2）＝`specs/data-production/production-registry.json`。**
> 该文件由 `scripts/check-production-registry.mjs` 校验（已纳入 `pnpm guard`），并被执行体
> `pipelines/legacy/unattended-runner.mjs` 在**启动时读取**：
> - 队列里任何**未在注册表中唯一声明**的作业 → **整轮不启动**（不做半截）；
> - 声明为 `unattended: "forbidden"` 的作业 → 从队列**确定性剔除**（不是失败，不计入连续失败），
>   并在执行报告里列明理由。
>
> **为什么设这道闸**：`data/fixtures/source-providers.json` 声称 S1–S4 来源门禁，文档三处写
> “取回必须遵守”，但**全仓没有一行代码读它**——它什么也没挡住。注册表若不被读、或被读而不校验，
> 同样只是意图。
>
> 在下列字段之外，注册表另加 5 个字段：
> `kind`（作业类型）· `unattended`（`allowed` / `forbidden`）· `unattended_reason`（forbidden 必须写明理由）·
> `gates_enforced_by`（allowed 必须写明门禁**靠什么落地**——防止“写着有门、其实没有”）·
> `narrative_gaps`（本作业瞄准哪个叙事缺口，见 §0.6）。

| **字段**                | **含义**                                           |
| --------------------- | ------------------------------------------------ |
| id / version          | 稳定标识与规则版本                                        |
| purpose               | 为什么跑；服务哪个 Current Gap                            |
| inputs                | 来源、scope、增量游标                                    |
| outputs               | 写 Candidate / Evidence / World / Projection 的哪一层 |
| write\_scope          | 允许写哪些表/对象；默认最小权限                                 |
| gates                 | 必须通过哪些 G0–G6 / schema / rights / spatial gate    |
| auto\_promote\_policy | 什么条件下允许自动晋级；未声明 = 不自动晋级                          |
| hold\_reasons         | 可预期的 HOLD reason codes                           |
| stop\_conditions      | 何时停止该 job                                        |
| retry\_policy         | 仅针对技术性瞬时失败                                       |
| tests                 | 完整性、幂等、引用、Gate 测试                                |
| rollback              | 如何定位/撤销本次变更                                      |
| summary               | 执行报告 要输出什么                            |

# 13｜最终冻结规则

  - 无人值守自动化的目标是扩大可信世界的供给，不是扩大未经裁决的“历史内容”。

  - 机器处理确定性转换；歧义、因果、冲突、历史空间重建等进入 HOLD / Human Review。

  - Human Review 是质量防线，但用户不是数据录入员；普通 HOLD 可以积累，不要求每天人工清空。

  - Raw 永久保留；Evidence 可追溯；Candidate 与 Verified World 分离；AI 生成 ≠ Evidence。

  - 无人值守不得改变 C0–C4，不得偷偷扩大 Schema/写权限/基础设施。

  - 每个 无人值守作业 必须可重复、可停止、可追溯、可回滚，并有 执行报告。

  - 当前只服务 Jinze Canonical Experience 的真实数据缺口；不以“昨晚新增多少条”作为成功指标。

|                                                                                             |
| ------------------------------------------------------------------------------------------- |
| **最终一句话：白天由你决定“什么值得成为墨痕”；无人值守让 Developer Skills 安静地把资料、证据和候选关系准备好。机器负责规模与纪律，人保留文化判断与最终证据裁决。** |
