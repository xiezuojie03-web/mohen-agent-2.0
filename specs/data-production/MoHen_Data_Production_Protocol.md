# MoHen Data Production Protocol V5.0（目标）

> DESIGN_TARGET_NOT_APPLIED｜2026-10-15。基于handoff/local-b-20260930@8966d1b和现行P0—P5/BR规范。资料中的专业目标文件，未应用工程；真实Schema/绑定/运行待M0，ZIP未制作，真实G5/MIG-01 HOLD，56正式延期关系DESIGN_HOLD。

## 0｜权威与单一主线

受C0 V1.1/C1 V1.1方向及C2 V1.3/C3 V1.4专业宪法统领；C4 V2.2约束人类体验。专业方法定义由standards内完整原文负责，本协议负责运行编排，不重复改写方法算法。Registry是执行绑定，不能反向修改专业语义。旧五阶段协议V4.0仅属于隔离旧代际。

| Stage | Owner layer | 独立Gate | 职责 | 专业标准 |
|---|---|---|---|---|
| D00 | L0 | G0 | 来源准备 | specs/data-production/standards/d00/ |
| D01 | L1 | G1 | 载体读取C | specs/data-production/standards/d01/ |
| D02 | L2 | G2 | 材料理解H | specs/data-production/standards/d02/ |
| D03 | L3 | G3 | 世界构建W | specs/data-production/standards/d03/ |
| D04 | L4 | G4 | 人文发现A | specs/data-production/standards/d04/ |
| D05 | L5 | G5 | 可信发布P | specs/data-production/standards/d05/ |

## 1｜一次run的输入

必须有research_intent、scope（问题、地域/时间、材料或资产范围、允许用途与预算边界）、architecture_generation、execution_mode、request_id、requested_outputs、consumer、effective_time、规则/方法/画像版本以及允许的起止阶段/重算理由。凭据与个人原始资料不写入报告。from/to只是候选范围，不证明输入合法。

首次来源发现可从D00开始；部分重算使用已存在成果时必须带精确type/id/revision、当前资格、原件/局部定位与依赖快照。没有resume_input或依赖不明时HOLD，不从旧run的PASS直接恢复。混合材料按可独立审核的单元分路，保留父子关系，主载体画像不替所有子载体。

## 2｜选路与方法执行

1. orchestrator读取唯一Registry与method-binding，按载体/材料类型、方法前置、用途与目标成果选择方法；不把63方法全部广播。
2. 方法定义必须锁到standards具体章节和源版本/散列。DRAFT质量画像、未知枚举、输入type不匹配、权利不足即给明确拒绝/补证原因；不让模型常识补成历史事实。
3. Adapter返回typed artifact drafts、方法记录、原件锚点、限制、依赖和控制请求；不能返回一个未经独立审核的自称PASS作为下游许可。
4. 阶段Owner只写本L候选/修订，成果版本不可覆盖；独立Gate另写资格审计。共享Executor可复用，但不能把写入control的通用权限授予所有业务方法。
5. 多成果必须有显式角色/类型/修订引用；下游选择对应输入角色，不取Object.keys(outputs)[0]，不默认把上一步整个输出数组全传给全部下游方法。

## 3｜资格与提交

资格键：对象修订×用途命名空间/版本×范围×消费者×依赖快照×有效时点；另记录gate、规则/方法/绑定版本、审查者、证据和前序裁决。PASS/HOLD/REJECT/REVOKED/UNASSESSED为资格五态；run处置、对象认识状态与人类ACCEPT/DEEPEN/DROP分别存储。

选择、候选提交、独立签发、激活、每次消费/缓存命中均核当前依赖和合法性。签发期间换版或撤权不得激活。Gate审计追加；不得ON CONFLICT覆盖旧裁决，不任意挑历史PASS。有效区间带时区，长期资格须依据与复审条件；缺值、非法区间、到期、消费者/用途错配均失败关闭。

## 4｜各阶段特殊边界

D00：宽进登记线索不等于获得原文；来源身份、研究读取和公开展示权分别保存。Raw保全，来源镜像/转载与独立性分开。

D01：只作技术读取，保留未读区域、错误与校准画像；原资产和读取修订不同身份。不把OCR/图片标题/AI补字当历史证据。

D02：材料结构、声音、转引与观察保真；嵌套单元逐个定位，二手解释不伪装一手事实。

D03：W方法联合构建身份/时间/空间/事件/关系/变化/主张与冲突。G3七用途保持原定义；不为好看制造配准精度或历史位置。

D04：A方法及五母题增加理解，不反写世界事实；G4 BE/BC/RF/PS/PL分别约束解释。分数不是历史真伪概率，开放问题不升确定解释。

D05：P01选入；P02世界投影；P03时空变换；P04有界解释；P05探索路径；P06返证；P07消费者分面申请；P08精准失效。P/PD不同编号空间。P02只能消费合法L3/G3事实；L4解释保留G4走P04，不混入world_projections。纯事实投影不强迫伪造G4，解释性发布必须G4。P01/P07候选不等于G5；P08控制事件不是第七类L5内容。六类L5定义见DATA_CONTRACT。

## 5｜全链、分支与局部完成

完整run可串行经过六阶段；事实投影、证据返回或局部重算按实际依赖选择必要阶段，不机械制造中间解释。阶段完成、某方法完成、部分成果有资格与整批业务完成分别报告。空结果必须区分合法无发现、未执行、失败、HOLD，不能把0行算有效发布。

单个分面HOLD只阻断实际相关消费者；独立有效分面继续，但run须给partial outcome及blocked refs，不能谎报整批PASS。要修改目标或扩大scope时形成新请求/版本，不能在旧批次隐藏变更。

## 6｜四种执行模式与故障

attended/unattended/batch/interactive只改变调度，不改变Owner/Gate/权利。当前目标配置默认全禁用，启用须用户工程授权及验收；数据缺口不交用户逐字段审。API短时失败可对相同快照有界重试（目标默认最多3次，可由批准配置收窄）；语义歧义、证据冲突、权利不明不靠重试碰运气。幂等以request/input snapshot/method/version为基础，重复事件不重复晋级。中断/恢复必须重核当前资格；不能以相同run_id覆盖历史审计。

## 7｜撤权、补证与回滚

来源/权利/证据/事实/解释/发布或规则换版触发实际反向依赖分析。P08给影响闭包和暂停/重审请求，PD7承接控制职责；Guard立即阻断失效消费，不等新G5 PASS，也不伪造REVOKED记录。独立Gate追加决定。依赖不明的请求失败关闭，已证无关分面不作推测清空。

补证归对应D Owner；生成新成果修订、新资格，旧链审计保留。回滚先关新入口，仅仍合法的旧修订/路由可恢复；否则服务HOLD。不能恢复已撤缓存/权利或删除原始资产。并发/原子停用/缓存与离线回收由工程测试证明。

## 8｜运行消费与真实入口

Agent与舞台只读当前G5合法L5分面，L6为运行态。Evidence on Demand沿真实依赖回溯L4（有解释时）/L3→L2→L1→L0。缺链须返回明确缺口，不静默continue成“完整证据链”。网页ask/materials检索入口和冻结JSON体验页都必须纳入同一消费资格边界；新增客户端不能替代对实际页面/API的接线和验证。

L7/L8参与/新痕迹要回流则经D00；当下贡献不直接写历史Truth。未来逻辑编号不授权建社区/新Schema。

## 9｜报告与验收

机器报告给run/方法/输出版本/资格请求与独立裁决/失败/事件/回滚；拥有者报告给真实叙事内容、可视统计、限制/反例/缺口及ACCEPT/DEEPEN/DROP。两份报告来自同一run refs，不把fixture写实测PASS。人类内容判断不能替代机器资格。

`verification/arch-mig-prep-01/acceptance/scenario-contracts.csv`是最低正反例合同；`tasks/implementation/ARCH-MIG-01/`给实际文件改造责任。真实DDL/端口/表列/迁移命令保持TO_VERIFY_IN_M0，不在协议虚构。

