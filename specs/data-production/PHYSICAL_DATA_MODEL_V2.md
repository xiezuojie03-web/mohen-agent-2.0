# Physical Data Model：六阶段逻辑映射修订（目标）

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。基于handoff/local-b-20260930@8966d1b和现行P0—P5/BR规范。资料中的专业目标文件，未应用工程；真实Schema/绑定/运行待M0，ZIP未制作，真实G5/MIG-01 HOLD，56正式延期关系DESIGN_HOLD。

## 1｜当前文件身份

保留既有工程文件路径以稳定入口，正文升级为六阶段目标映射；文件名V2不表示旧五阶段语义仍有效。旧正文应按specs/archive存证，不同时active。无DDL、未核真实PG。

| 逻辑层 | 候选复用域 | 必须确认 |
|---|---|---|
| L0 | source.* | source/version/raw的不可变身份与资产权限 |
| L1 | TO_VERIFY_IN_M0 | 独立读取单元/区域/修订及原件链接，不覆盖raw |
| L2 | evidence.* | H方法/材料单元/声音/依赖/读取修订 |
| L3 | world.* | 身份/事件/关系/变化/空间主张的修订与支持反证 |
| L4 | meaning.* | 发现/解释/问题/当下联系及G4用途 |
| L5 | read_model.* | 六类内容修订、消费者分面及依赖/资格 |
| control | control.* | 生产run、独立Gate追加审计、事件与反向依赖 |
| L6—L8 | 不强设物理Schema | Runtime与参与/新痕迹隔离；产品化HOLD |

## 2｜不得妥协的不变量

Raw保全；每成果唯一D Owner；资格独立且追加；type/id/revision不可丢；来源和原件局部可重放；事实解释分权；几何是主张；L5派生可重算；用户贡献不自动Truth。旧Schema名不是历史真伪依据，旧PASS视图不是新门准入。

## 3｜M0必须产出

逐表/字段AS_IS→目标语义→REUSE/EXTEND/NEW/ARCHIVE及依据；真实FK/视图/唯一性与空值、旧代码和回填/回滚影响；新L1必要实体；审计追加和时效/消费者资格；数据量与保护范围。未知统一TO_VERIFY_IN_M0，不能用此表自动生成migration。DB实现/回填/恢复测试分后续授权批次。

