# 墨痕系统运行与调用架构合同

**身份：** DESIGN_TARGET_NOT_APPLIED；软件拓扑Owner=MHKA-05，专业语义引用MHKA-02/03/04。基于main@db21cefcc09c6bcb5d7e3fca16d100cc0accd13d，不声明真实部署或DB迁移完成。

## 1｜实际模块与调用

| 入口/模块 | 调用与职责 | 约束 |
|---|---|---|
| apps/web/app/studio、StudioWorkbench | 用户委托→studio-research/studio-director/studio-creation/publication | 保存研究资产与作品分责；未接模型/回执不显示已完成 |
| apps/web/app/admin、AdminWorkbench | admin-assets、管理API、项目与条目读取 | 具体史料/发现/关系/缺口可读；管理动作不签史学G |
| apps/web/app/watch | public works→publication→已发布修订 | 消费同一WorkRevision；撤权、空库、服务失败分开 |
| pipelines/data-production/run.mjs | Orchestrator→Registry→六Executor→Adapter→数据仓储 | 执行授权、幂等、恢复；不由Stage签G |
| packages/data-access/src/gate-authority-repository.mjs | 独立资格候选、Reviewer/Policy与追加审计 | 有SQL文件不等于策略/身份已激活 |
| packages/data-access/src/read-model-repository.mjs | 合法L5消费/资格检查 | 目的、consumer、依赖、时效和权限匹配；不能旁路公开表 |

## 2｜规则路由与身份

根AGENTS→六MHKA→专业规范→机器合同→源码/测试。生产规范`specs/data-production/MoHen_Data_Production_Protocol.md`、资格`specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md`、资产`specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`、能力`specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md`、人文`specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md`各守唯一Owner。六MHKA镜像落governance/mhka；新旧代际必须原子切换，切换前工程C0—C4保持现行身份。
生产代际mohen.six-stage.v1与治理mhka.v1分开。根任务/子任务/run/executor/模型工具版本、输入输出修订、来源/权利/费用/交接回执和幂等键沿调用链保留；未知如实unknown。内部职责与外部成果同一课题追踪，不建立第二Truth链。

## 3｜持久化与服务边界

`specs/data-production/PERSISTENCE_BINDING_CONTRACT.md`唯一规定实际字段/表/迁移；沿用source/evidence/world/meaning/read_model/control。知识、研究资产和作品不是同一个存储状态。用户和项目隔离必须传递到SQL，不能仅校验路由登录。对象存储承载许可原件，DB保存稳定ref/hash/locator。权利撤销沿依赖传播并使缓存失效。
本代数据库目标已在持久化及安全完整合同中承接，不复制历史迁移SQL，不创建<CLI-GENERATED-K3-MIGRATION>.sql；真实增量DDL、版本号、低权限证明与备份恢复属于KAD4授权施工。

## 4｜故障和恢复

请求接收、入队、执行、候选已保存、待G审、合格、已发布不同。模型不可达、无原件、读取失败、预算、版权、角色撤销分别返回限制，已保存合法资产可继续。幂等重试同输入快照；恢复重核资格/权利，局部成功只报告具体refs。Stage不能把自身完成回执当G PASS，Agent不能伪造研究进度。

## 5｜验收与启用

正例：沿上述唯一调用链形成候选、独立资格请求、不可变作品与合法消费；反例：Producer自签、跨Owner、撤权缓存复活、旧Skill双活、无回执显示研究完成均阻断。验收归85API、152动作及各专业合同的正反断言；设计/代码/隔离/线上/Owner分别记证。
先核最新HEAD、完整备份和回滚，再按授权切换。GitHub写入、DB/角色、生产Gate和部署各自授权；本文件归位不触发任一动作。回滚关闭新路由但不恢复已撤资格，运行事实只回CURRENT。

## KAD6｜知识真实主数据、内外AI消费者与工程代际边界

- 唯一正式历史知识生产系统仍为六阶段Stage与独立G、六类L5 `read_model`；Studio工作资产库是**并行可持久化工作对象层**，L6会话/L7贡献/L8当代新痕迹不抢占正式Truth。跨层都通过受控`ArtifactRef@revision + purpose/consumer/rights/ACL`边界，不用第二知识服务跳过原D/G。
- `PostgreSQL`存项目、正式L0—L5、Studio修订、委托/回执、出版与审计；**private object Storage**存合法取得的原件/大型派生文件，DB ref+hash+version+typed locator+rights只作定位；搜索/FTS/空间/向量为可重建索引，随资格变更使缓存失效。**原件流式读取**须授权，不给外部AI原库凭据。
- 现有`apps/web/lib/studio-research.ts`、`studio-production.ts`、`mohen-agent/retrieve.ts`、`publication.ts`及原Runner/Registry以最小变动承接工作流，工程目标合同归`AGENT_CONTRACT`、`KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT`、`PERSISTENCE_BINDING_CONTRACT`、`API_TOOL_CONTRACT`和`SECURITY_ACCESS_CONTRACT`。F05 Admin只提供合法授权视图，WATCH只读合法作品rev；UXD未授权原型不得成为新主工程。
