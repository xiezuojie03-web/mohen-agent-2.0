# Persistence Binding Contract V2.0（目标）

> **2026-11-06 数据生产继承补核／工程设计规范现行、运行资格HOLD。** 本文件在MHKA现行工程设计权威下约束候选、Gate、存储和权利；2026-10-15与旧工程文件仅作为历史设计来源。新架构设计现已指导工程，不等于数据库DDL/Storage/Reviewer已实装；M5施工按Owner暂停。第1—5节原有实现保护约束继续有效；具体数据库物理差异仍须按最新main与真实Schema核定，禁止把旧设计快照当当前实库事实。

## 1｜唯一写入责任

| 责任主体 | 允许写 | 禁止写 |
|---|---|---|
| D00 | L0候选/不可变修订及自身生产过程记录 | 其他L成果；独立Gate决定；任意control.* |
| D01 | L1候选/不可变修订及自身生产过程记录 | 其他L成果；独立Gate决定；任意control.* |
| D02 | L2候选/不可变修订及自身生产过程记录 | 其他L成果；独立Gate决定；任意control.* |
| D03 | L3候选/不可变修订及自身生产过程记录 | 其他L成果；独立Gate决定；任意control.* |
| D04 | L4候选/不可变修订及自身生产过程记录 | 其他L成果；独立Gate决定；任意control.* |
| D05 | L5候选/不可变修订及自身生产过程记录 | 其他L成果；独立Gate决定；任意control.* |
| 独立G0—G5 | 资格追加审计与对应当前资格投影 | 替方法改成果；覆盖历史决定 |
| P08/控制接点 | 失效事件、影响及暂停/重审请求（明确单一事件Owner） | 自授G5；伪造G3/G4/G5撤销审计 |
| Guard | 不写业务真相，判定ELIGIBLE/BLOCKED并可记录自身技术日志 | 授予资格、覆盖审计、改成果 |
| Agent/舞台 | L6运行状态/用户偏好；反馈请求另隔离 | L0—L5 Truth/资格 |

## 2｜物理映射约束

旧source/evidence/world/meaning/read_model/control为复用线索，不是实际Schema承诺。旧source同功能优先保留；新L1须独立读取修订/稳定局部引用和独立G1，是否新增表由M0按必要性定；不得覆盖raw_items。旧证据/世界/解释/读模型按新L2/L3/L4/L5重绑定逻辑，不强制改表名。Stage编号不能替换SQL中所有数字。

M0必须逐对象给真实限定名、列类型/空值、PK/FK/唯一键/索引/视图、读写角色、row counts、迁移历史、旧消费者及备份/回滚。现有GitHub migration文件不证明真实PG已应用；本合同无可执行DDL。新实体必要性、回填来源和不可恢复风险未说明则STOP。

## 3｜版本与事务边界

原始资产及历史修订保留，业务版本化引用不能只存object_id。一次方法运行锁定输入/方法/规则/画像/snapshot；幂等重试不重复创建同一逻辑成果，但真实新修订要保留。候选保存与Gate审计分Owner，不以同事务方便而让producer签PASS。发布激活须核签发期间依赖未变，失败候选不得可见。

审计必须追加；旧recordGate的ON CONFLICT DO UPDATE不能沿用为新资格事件语义。新物理主键/唯一性与当前投影由M0列级设计核定；确定前不写猜测SQL。活动资格不是任意历史PASS集合。

## 4｜撤权和恢复

事件有幂等ID、前后版本、实际反向依赖、用途/范围/消费者和原因。先阻断已失效读取，再异步/同步独立复审；原子性、并发签发、缓存/离线回收须用工程测试证明。不明依赖失败关闭相应请求，不推测全局清空；独立资格合法分面保留。

源/读取/证据/世界/解释补证各回Owner，形成新修订/新裁决。回退只恢复仍合法旧路由，不复活旧缓存和已撤权限，不删除原始资产/旧审计。实际恢复点和校验命令TO_VERIFY_IN_M0。

## 5｜代码改造点

`packages/data-access/src/data-production-repository.mjs`需精确refs/资格条件、六阶段合法输入和追加审计；`read-model-repository.mjs`须修订/用途/消费者/时间/snapshot匹配；`lineage-read-repository.mjs`和`lineage-validator.mjs`补新L1及实际依赖、空依赖与历史PASS拒绝。通用DB包装器与repository.query接口差异需接线测试；不能将queryRows直接冒充query返回结构。

Stage Executor只控制本成果写入与资格请求，不拥有独立Gate。完整实现由CodeBuddy获准后按tasks/implementation/ARCH-MIG-01合同进行。未运行前标NOT_VERIFIED_RUNTIME。

## KAD1-A/P0长期资源维护的物理合同与执行状态区分（2026-11-06，设计限定）

原P0长期资源维护（资源总目录、获取方法目录、不可覆盖的尝试日志）与L0原件资产是**相互关联但不同生命周期**的逻辑对象。以`resource_id`、`method_id+method_version`、`attempt_id`及实际`source/raw_item@revision+asset_sha256`建立明确关联；目录可以有DISCOVERED/HISTORICAL_UNVERIFIED项目，方法可以有TESTED_FAILURE或历史成功记录，但只有合法取得且通过具体用途G0审查的L0资产才可向D01消费。

原唯一P0人工主库：`/墨痕/数据生产体系_现行/02_P0_D00最终成果/06_资源资产/资产_P0_资源与获取方法主库.xlsx`，三工作表分别为资源、方法、尝试。其逻辑权威及CSV只读派生在正式数据库受控迁移前保持；迁移后数据库成为唯一权威源，Excel只读或受控界面。禁止另造平行Provider Registry、资源总目录或第二套Acquisition Intent。

物理字段映射必须先做已施工仓库与真实Schema只读盘点：优先复用`source.sources`、`source.source_versions`、`source.raw_items`、现有Provider Registry及`acquisition-intents`；审查是否能够保持获取方法多版本、尝试日志追加不覆盖、错误`CONFIRMED/HYPOTHESIS`、请求脱敏、文件真实存储、SHA/范围、权利证据和下游G0资格失效。只有证明现有表不能承载某项生命周期，才提出最小字段/事件表的未来迁移候选，并记录唯一Owner、DDL、ACL、旧数据回填、回滚和正反测试；不得由三个Excel工作表自动推导三个新SQL表。

**当前运行状态与历史设计快照必须分离**：本合同旧章的2026-10-31只读数据库调查、`control.gate_candidates`当时是否部署、KAD4的12张候选表，以及Storage空桶/旧权限状态，都不代表2026-11-06当前实库事实。真实可用性只能凭最新main源码及有权限的当前数据库/Storage/CI回执判定；已施工实现一律只读保护。本节不授权执行DDL、修改Role/RLS、激活Gate或恢复M5。
