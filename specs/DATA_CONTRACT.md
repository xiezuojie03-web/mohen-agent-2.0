# MoHen Data Contract V3.0（目标）

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。基于handoff/local-b-20260930@8966d1b和现行P0—P5/BR规范。资料中的专业目标文件，未应用工程；真实Schema/绑定/运行待M0，ZIP未制作，真实G5/MIG-01 HOLD，56正式延期关系DESIGN_HOLD。

## 1｜层与对象

| Stage | Owner layer | 独立Gate | 职责 | 专业标准 |
|---|---|---|---|---|
| D00 | L0 | G0 | 来源准备 | specs/data-production/standards/d00/ |
| D01 | L1 | G1 | 载体读取C | specs/data-production/standards/d01/ |
| D02 | L2 | G2 | 材料理解H | specs/data-production/standards/d02/ |
| D03 | L3 | G3 | 世界构建W | specs/data-production/standards/d03/ |
| D04 | L4 | G4 | 人文发现A | specs/data-production/standards/d04/ |
| D05 | L5 | G5 | 可信发布P | specs/data-production/standards/d05/ |

L0 source_asset；L1 reading_unit；L2 material_observation；L3 world_claim_revision；L4 humanistic_finding_revision是逻辑合同类型，不能据名称推定物理表存在。L5固定六类world_projections、agent_contexts、story_seeds、discovery_paths、map_timeline_projections、evidence_pointers；以artifact_ref.type/id/revision唯一引用。selection_manifest是发布选入记录、consumer_facet是六类内容的用途/消费者分面，均不另成第七类L5；invalidation_event属control。

视觉资产（world.visual_objects，属L3事实对象）**不另成第七类L5**：它经G3七用途之一的合法资格 + 当前G5，投影为①`world_projections.payload.visuals`（视觉舞台分面，供V1–V5展示）②`evidence_pointers`（visual_type=today_photo，返证指针）。consumer=visual_stage消费视觉展示权，consumer=agent只消费其文字引用与来源；二者许可按purpose/scope分别核查，图像展示权≠Agent复刻/下载权≠文字引用权。

## 2｜成果封套

结构约束见`specs/data-production/schemas/artifact-envelope.schema.json`：architecture_generation、artifact_ref、owner_stage、producer_method{id,version}、definition_ref、source_refs、dependency_snapshot、purpose、scope、limitations、created_at。payload按专业对象合同解释；source_refs必须含原资产/版本与定位，不能只给标题。源时间、描绘/发生时间、现代观察时间、资格有效时间不同。

输入须保留type/id/revision及所消费的qualification_ref；revision/version别名只能在版本化映射中统一，不得丢修订号。方法规则源必须可定位到专业原文/章节/源散列；当前工程配置或工具名不等于专业权威。

## 3｜独立资格

结构约束见qualification.schema.json。五态和对象认识状态分离。PASS要求匹配当前架构代际、对象修订、用途namespace/code/version、范围、消费者、依赖、有效区间/长期依据及独立审计。有效区间必须valid_from<valid_until且时区明确；JSON Schema只验证形状/格式，跨字段时间顺序和当前依赖须语义校验。null/未审不默认PASS。

Gate审计Owner独立于成果生产者，追加前序决定引用，活动资格投影以确定顺序计算；禁止旧五门PASS直接继承新六门。某一消费者资格不代表另一消费者资格。

## 4｜输入输出与控制封套

method route decision须run_id、method_id/version、输入refs、purpose、consumer、snapshot、selection及理由。Adapter须返回artifact_drafts[]、producing_method、source/locator_refs、limitations[]、control_requests[]及机器/人类报告字段。Gate独立返回qualification decisions[]。stage result显式区分produced_refs、qualification_refs、eligible_handoff_refs、blocked_refs、control_events与disposition；不得取首输出键猜交接。

control.invalidation_event须change_event_ref、changed_dependency_ref、affected_publication_revisions、affected_purpose_scope_consumers、dependency_paths、reason、suspension_request、recheck_request。事件写入不需新G5许可；消费者立即重核事实前提，Gate随后追加裁决。

## 5｜类型和权利不变量

L1读取≠L2证据≠L3事实≠L4解释≠L5可消费表达。G3七用途、G4五用途、G0资产操作权利/G1技术用途各保原义；G5显式引用上游用途和发布动作，未知映射HOLD，不拼成裸字符串全链通用。

可研究、可引用、可展示、可下载/裁剪/变换分别核查，版权缺口不以修改文案解决。Geometry is a Claim；现代地点不自动证明历史位置或实测路线。支持/反证与未决争议不能被发布丢弃。

## 6｜持久化和边界

每L成果唯一阶段Owner，独立G写资格，控制事件有明确唯一Owner，Guard只读判阻断。业务Adapter不获得通用control.*写权限。真实表列/PK/FK/索引、版本字段和Gate存储由PERSISTENCE_BINDING_CONTRACT与M0映射确定；候选写入不进入公开缓存，发布激活须当前资格。

## 7｜实际消费者

统一L5读取服务接ask/materials API及页面冻结数据加载，禁止一条路径受G5而另一条靠旧status/静态JSON绕过。静态数据只能是版本化授权快照或明确隔离演示fixture，过期不能fallback旧知识。Evidence on Demand返回具体修订/证据/读取/原件局部链，缺失明确BLOCKED/partial，不静默消失。

## 8｜失败、审计、报告

空输出与失败/未执行区分；局部成功按refs报告，不给整批假PASS。run恢复/重试带不可变快照，失败回责任Owner；回滚不能恢复已撤资格。Machine报告、Human Review schema及场景验收为合同的一部分。Schema形状通过不等于事实正确、算法有效或运行Gate通过。

