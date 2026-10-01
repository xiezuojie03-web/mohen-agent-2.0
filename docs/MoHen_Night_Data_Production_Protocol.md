**MOHEN · NIGHT DATA FACTORY**

**墨痕 · 夜间自动化数据生产协议 V1.0**

*Unattended Developer Skills × Evidence Gate × Safe Promotion*

|                                                                                                           |
| --------------------------------------------------------------------------------------------------------- |
| **目标：让机器在你睡觉时持续“造世界”，但只自动做可追溯、可回滚、低判断风险的工作。遇到身份歧义、历史因果、空间重建、来源冲突等问题，不打断夜间施工，也不硬猜——统一 HOLD，第二天只给你一份异常摘要。** |

**定位：**这是 C2/C3 之下的 Developer-Skill 施工协议，不是 C0–C4 的新宪法。它把此前“知识生产循环、Developer Skills、Evidence Gate G0–G6、Human Review”整理成可无人值守运行的 Night Batch 规则。

**依据：**C2 Humanistic Data OS & Dual Skill、C3 Database & Cultural World，以及早期 V4.0/V4.1 与 早期开发工具版本 V2 中已形成的数据生产/Evidence Gate/Discovery Pipeline。文中“夜间批次、自动晋级边界、失败隔离、晨报”是本次为无人值守场景补充的执行规则。

# 0｜一句话原则

|                                                                                                     |
| --------------------------------------------------------------------------------------------------- |
| **夜间自动化不是“AI 自动写历史”，而是“机器自动扩大 Candidate / Evidence / 可验证关系的供给；只有确定性足够高的结构化结果才能自动晋级，判断性内容一律 HOLD”。** |

因此夜间系统的成功指标不是“昨晚新增了多少故事”，而是：新增了多少可追溯 Source / Evidence / Candidate；多少确定性记录安全通过 Gate；多少高价值疑难被准确送入 HOLD，而没有污染可信文化世界。

# 1｜夜间工厂在 Humanistic Data OS 中的位置

| **层**                           | **夜间允许做什么**                                             | **夜间默认不做什么**                |
| ------------------------------- | ------------------------------------------------------- | --------------------------- |
| L0 Cultural Sources             | 抓取/导入、Raw append-only、checksum、版本、许可与来源元数据              | 删除/覆盖原始资料                   |
| L1 Evidence & Provenance        | 切 Fragment、locator/page/quote、确定性 metadata、来源链、冲突标记     | 把 AI 生成文字当 Evidence         |
| L2 Humanistic Objects           | 候选实体/事件/地点/时间抽取；确定性字段标准化                                | 歧义实体自动合并                    |
| L3 Cultural Relations           | 生成 Relation Candidate、relation path、证据绑定                | 历史因果/跨源复杂关系直接发布             |
| L4 Meaning / Present Connection | 生成 MeaningCandidate / PresentConnection Candidate 供后续使用 | 把解释性生成物写成历史事实               |
| L5 Discovery / Experience       | 可预计算 Discovery Candidate / visual hook 等候选              | 夜间擅自改变 Canonical Experience |
| L6 Participation                | 当前 HOLD                                                 | 正式用户贡献体系                    |
| L7 Living Culture               | 当前 HOLD                                                 | 把当代记忆自动晋级为历史真相              |

# 2｜Developer Skills：夜间真正使用哪几类

C2 已定义 11 个 Developer Skill 家族；夜间数据生产只启用其中与“造世界”直接相关的部分。为了避免再造一套 Skill 名称，本协议直接复用 C2/C3。

| **Skill / 能力**                              | **夜间角色**                                                    | **默认模式**                     |
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
| mohen-acceptance                            | 批次完整性、测试、计数、异常、回滚点、晨报                                       | AUTO                         |

Agent Skills（S01–S08）不是夜间数据工厂的主执行器。夜间可以调用 relationship\_discovery / evidence\_chain 一类能力辅助发现 Candidate，但其产物仍受 Developer-side Gate 管理；不得因为 Agent“觉得有意思”就写入 Truth Store。

# 3｜夜间主流水线

|                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acquire → Preserve Raw → Normalize → Extract Candidates → Build Evidence → Resolve Identity → Build Claims/Relations → G0–G6 → AUTO-PROMOTE / HOLD / REJECT → Projection Refresh → Acceptance → Morning Summary** |

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

# 4｜Evidence Gate G0–G6：夜间裁决规则

| **Gate**               | **核心问题**                         | **夜间处理**                                     |
| ---------------------- | -------------------------------- | -------------------------------------------- |
| G0 Source Completeness | 来源身份、URI/标识、时间、许可、checksum 是否完整？ | 缺关键 provenance → HOLD                        |
| G1 Object Identity     | 对象身份是否可信？                        | 精确 ID / 强一致可继续；同名、别名冲突 → HOLD                |
| G2 Temporal Semantics  | 时间语义是否明确？                        | 确定日期/区间可继续；约略、纪年歧义保留 uncertainty；无法解释 → HOLD |
| G3 Spatial Honesty     | 空间表达是否诚实？                        | 现代确定坐标可继续；历史锚点/历史几何/同景重建 → HOLD              |
| G4 Evidence Support    | Claim 是否有可定位 Evidence？           | 无 Evidence → 不得晋级                            |
| G5 Conflict            | 是否存在跨来源冲突？                       | 有冲突 → HOLD，保留双方 Evidence，不自动选边               |
| G6 Publish Eligibility | 是否达到该对象/关系的发布 Contract？          | PASS 才可进入允许的 Runtime World / Projection      |

# 5｜什么可以整夜自动跑，什么绝对不能自动判

| **AUTO：无需你逐条审核**                                                                                                                          | **HOLD：第二天再看，不打断夜间**                                                                                                     | **REJECT：自动拒绝/隔离**                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Raw 抓取与 append-only 保存；checksum/version；确定性字段清洗；精确去重；Evidence Fragment；明确 ID 的实体对齐；候选抽取；无冲突且 Contract 明确的结构化晋级；Projection rebuild；批次测试与统计 | 同名实体；别名无法消歧；历史因果；跨源复杂关系；史料冲突；历史地图锚点；Historical Geometry；老照片同景判断；rights/license 不清；AI 解释性 Meaning；低置信 relation；任何需要“猜”的内容 | Raw 损坏/无法校验；来源明显重复且 checksum 相同（保留去重日志）；违反 schema 的非法记录；缺失不可恢复主键/来源标识；被规则明确禁止的写入 |

这里的关键不是“所有进入 HOLD 的内容都必须由你亲自审核”。HOLD 只是隔离区。第二天系统只应把高价值、会阻塞当前金泽体验或反复出现的疑难汇总给你；普通 HOLD 可以继续积累，等待未来批量规则成熟后再处理。

# 6｜Truth Store 写权限：夜间最重要的防线

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
| No destructive cleanup   | 夜间禁止不可逆批量删除、覆盖 Raw、无审计的大规模 merge。                             |
| Rollback pointer         | 每次批次保留 run\_id、变更集合/事务边界或等价回滚依据。                              |
| Stop condition           | 出现 schema drift、写权限异常、连续高错误率、来源结构突变时停止相关 pipeline，不扩大影响。      |
| No architecture mutation | 不得夜间自行新增核心表、改变 Evidence/Meaning 边界、改变写权限或引入新基础设施。             |

# 8｜夜间批次验收：第二天你只看什么

默认不要求你打开数据库逐条验收。每晚只生成一份极短 Morning Summary；正常批次可以完全不打扰你。

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
| **Morning Summary 的默认结论只有三种：PASS（无需你做任何事） / PASS WITH HOLD（正常，有候选待以后处理） / STOPPED（管线异常，需要 开发总工程师 修复）。不要把“有 HOLD”误判为失败。** |

# 9｜与开发总工程师的分工

| **角色**                                   | **夜间职责**                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| 你 / Product Owner                        | 不做夜间数据录入员；只处理真正影响产品方向、文化判断或高价值 Human Review 的少数问题。                                      |
| 开发总工程师 / Chief Development Engineer         | 实现、运行、测试、修复 Developer Skills；维护 batch runner、日志、HOLD queue、Morning Summary；不得越权改 C0–C4。 |
| 开发平台（架构建议方）          | 在夜间运行暴露跨架构问题时主动提示：核心对象模型、Evidence/Meaning 边界、写权限、L6/L7 Schema、核心基础设施等；提交项目拥有者确认后方可修改。 |
| Agent Runtime                            | 消费受控 World Projection；可以发现 Candidate，但不拥有 Truth Store 的自由写权。                            |

# 10｜建议的第一阶段 Night Batch

不要一开始做“全上海自动知识生产”。第一阶段仍服从当前 H2 / Jinze Canonical Experience：只自动生产能补金泽真实体验缺口的数据。

| **Batch**                    | **范围**                                       | **为什么适合先跑**                 |
| ---------------------------- | -------------------------------------------- | --------------------------- |
| N01 Source Refresh           | 已知上图/开放数据来源的增量抓取、checksum、Raw snapshot       | 确定性高，最容易做到无人值守              |
| N02 Evidence Fragment        | 对已知资料生成可定位 Fragment / locator / metadata     | 直接增强 Evidence，不要求历史判断       |
| N03 Candidate Extraction     | 抽 Entity/Time/Place/Relation Candidate       | 只进 Candidate Reservoir，风险可控 |
| N04 Deterministic Resolution | 有稳定 ID/URI/强规则的实体对齐、精确去重                     | 把机器擅长的确定性劳动自动化              |
| N05 Relation Candidate Weave | 围绕金泽当前关系簇生成 relation path + evidence binding | 服务当前体验，不追求数据量               |
| N06 Gate & Projection        | G0–G6、AUTO/HOLD/REJECT、刷新 Agent Read Model   | 形成完整夜间闭环                    |

暂不作为第一阶段无人值守任务：Historical Geometry reconstruction、历史地图配准、同景老照片判定、历史因果自动裁决、跨来源冲突裁决、Meaning/Present Connection 自动发布、Participation/Living Culture 正式入库。

# 11｜什么时候一种夜间流程才能晋升为正式 Skill

| **阶段**       | **判定**                                |
| ------------ | ------------------------------------- |
| Candidate    | 只是发现一种可能自动化的方法；先记录。                   |
| Task Pattern | 在真实数据任务中重复出现，开始观察输入/输出/失败模式。          |
| Draft Skill  | 边界稳定，能写出 Contract、Gate、停止条件、测试；小范围夜跑。 |
| Mature Skill | 跨批次复用，多次验收稳定，可进入 Night Registry 默认调度。 |
| Deprecated   | 被更好机制替代或长期不再需要；停止默认调用但保留迁移说明。         |

|                                                                                            |
| ------------------------------------------------------------------------------------------ |
| **晋升公式：真实任务 → 重复方法 → 稳定输入输出 → 明确 Gate → 可回滚测试 → 才进入 Night Registry。不能因为“AI 能做”就创建 Skill。** |

# 12｜Night Registry 最小 Contract

每个夜间 Skill / Job 至少声明以下字段，开发总工程师 才能把它加入无人值守调度：

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
| summary               | Morning Summary 要输出什么                            |

# 13｜最终冻结规则

  - 夜间自动化的目标是扩大可信世界的供给，不是扩大未经裁决的“历史内容”。

  - 机器处理确定性转换；歧义、因果、冲突、历史空间重建等进入 HOLD / Human Review。

  - Human Review 是质量防线，但用户不是数据录入员；普通 HOLD 可以积累，不要求每天人工清空。

  - Raw 永久保留；Evidence 可追溯；Candidate 与 Verified World 分离；AI 生成 ≠ Evidence。

  - 夜间不得改变 C0–C4，不得偷偷扩大 Schema/写权限/基础设施。

  - 每个 Night Job 必须可重复、可停止、可追溯、可回滚，并有 Morning Summary。

  - 当前只服务 Jinze Canonical Experience 的真实数据缺口；不以“昨晚新增多少条”作为成功指标。

|                                                                                             |
| ------------------------------------------------------------------------------------------- |
| **最终一句话：白天由你决定“什么值得成为墨痕”；夜间让 Developer Skills 安静地把资料、证据和候选关系准备好。机器负责规模与纪律，人保留文化判断与最终证据裁决。** |
