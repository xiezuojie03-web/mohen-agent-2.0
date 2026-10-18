# G0—G5独立资格合同 V3.0（目标）

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。基于handoff/local-b-20260930@8966d1b和现行P0—P5/BR规范。资料中的专业目标文件，未应用工程；真实Schema/绑定/运行待M0，ZIP未制作，真实G5/MIG-01 HOLD，56正式延期关系DESIGN_HOLD。

## 1｜规则源与职责

机器规则为同目录gate-contracts.v3.json，configs/gate-contracts.json仅指向该规则，不再复制第二套gate定义。专业细则由各阶段standards成果资格契约与BR-M4规定；语义冲突先修合同，不以加载顺序掩盖。

| 门 | 必须独立核验 |
|---|---|
| G0 | identity_version、raw_provenance、rights_by_operation、acquisition_scope、source_dependency |
| G1 | source_authorization、carrier_profile_approved、reading_fidelity、coverage_and_missing、locator_replayable |
| G2 | reading_authorization、material_type_method、source_voice、nested_dependency、evidence_scope、no_world_assertion |
| G3 | evidence_authorization、identity_time_space、support_counterevidence、source_independence、epistemic_status、purpose_specific_extent |
| G4 | world_authorization、fact_interpretation_firewall、understanding_delta、alternatives_counterview、present_basis_if_applicable、purpose_specific_extent |
| G5 | upstream_authorization_by_action、revision_dependency_snapshot、rights_scope_consumer、purpose_mapping、lineage_replay、read_only_recomputable、time_current_at_consume |

## 2｜资格与状态

五态PASS/HOLD/REJECT/REVOKED/UNASSESSED。对象成熟度、run状态、Guard结果和Human Review独立。每次裁决对应不可变artifact_ref与方法/规则/snapshot，带purpose{namespace,code,version}、scope、consumer、有效时点/区间、审核者、理由、证据与previous_decision_ref。没有匹配的当前决定禁止消费，不选任意旧PASS。

Gate审计写入者独立；producer只提交审核请求，Guard判当前阻断不冒独立审核。签发前后换版/撤权不激活；追加审计不能覆盖历史。长期资格须复审依据；null、非法时区/顺序、过期均阻断。JSON schema不能代替时间/依赖语义核验。

## 3｜用途不可混同

G3七用途：world.explain_bounded, world.show_original_region, world.map_anchor_link, world.map_registered_overlay, world.reconstruct_bounded, world.change_compare, world.relation_explain。G4五用途BE有界解释、BC有界比较、RF有证关系焦点、PS有界过程序列、PL合格当下联系。G0资产操作权利、G1技术用途及G2证据适用范围分别引用原规范，未批准画像/用途代码不自动发明。

G5保存upstream_purpose_refs和publication_action的显式关系；世界投影检查G3不强造G4，解释分面必须有效G4。给图像显示权不等于给Agent复刻/下载权，文字引用与原图展示分别审核。未知映射HOLD，不能扩大上游许可。

## 4｜失败与撤权

missing/version/locator/profile/scope/consumer/dependency/time任一失败给reason code、原件定位、受阻refs及最小Owner补证。HOLD可保留研究候选，不得以候选名冒正式消费。

P08/PD7/Guard发现失效前提立即拒绝相关消费；独立G随后追加REVOKED/HOLD等决定。无需等待新的G5 PASS；不把控制事件放进第七读模型。独立未受影响分面保持合法消费。补证后新修订/新审查，回滚不能复活旧权限。

## 5｜正式BR边界

正式325表原件状态保持；201条件设计批准不是Runtime资格，124 HOLD含56延期边。P方法定义或此合同都不能释放原正式边；需按原edge_id及release_requirement独立受控审批。迁移/图谱/fixture不替代批准。

## 6｜验收

按verification场景合同至少验证六门独立性、错代际/版本/用途/消费者/时点拒绝、审计追加、缺依赖/空依赖处理、签发竞争、双读分面与精确撤权。工程真实独立身份、角色/事务/缓存与性能TO_VERIFY_IN_M0；设计测试不标生产PASS。

