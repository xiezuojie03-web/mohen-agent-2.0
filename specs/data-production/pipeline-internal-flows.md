# Pipeline Internal Flows：六阶段与分支

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。基于handoff/local-b-20260930@8966d1b和现行P0—P5/BR规范。资料中的专业目标文件，未应用工程；真实Schema/绑定/运行待M0，ZIP未制作，真实G5/MIG-01 HOLD，56正式延期关系DESIGN_HOLD。

## 1｜入口

run.mjs解析明确scope/intent/mode及resume refs；orchestrator加载经schema与语义核验的Registry、method/gate binding，拒绝未授权启用和旧代际配置。

## 2｜生产

request→按问题/载体/用途选择方法→读取精确上游refs并核当前资格→Adapter生成typed drafts→阶段Owner保存候选修订→独立Gate裁决→只激活匹配当前资格的handoff refs→目标消费者选对应角色。数据不经Gate转运；不取首输出键，不混方法完成与发布。

## 3｜非直线情形

resume已有合法L1/L2/L3/L4时重核必要上游；事实投影跳过不适用的解释，不省真实证据；多载体按子单元分路；一支失败时按实际依赖阻断该支，其余独立有效支可继续；空发现给明确空结果不是PASS发布。

## 4｜失败与变更

技术暂时错误有界重试，语义/权利/画像问题HOLD到最小Owner。P08计算闭包，先拒绝失效消费，独立审计随后追加；补证形成新修订/新裁决。重启/缓存命中都重核资格，控制事件幂等；回退不恢复撤权内容。

## 5｜实际消费入口

read-model repository/client接线ask/materials API、网页retrieve、page冻结JSON入口和体验Runtime；每一路相同资格条件。旧切片仅可隔离演示或形成获准版本化L5快照，不能作为新发布失败时的无资格fallback。状态/事件/证据与人类报告见相应合同。

