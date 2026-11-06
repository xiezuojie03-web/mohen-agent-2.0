# Pipeline Internal Flows：六阶段与分支

> **2026-11-06数据生产线继承补核｜设计合同已入GitHub，执行闭环仍HOLD。** 本文件说明C0—C4认可的D00—D05六阶段，在MHKA新架构下的生产路由、分支与失效边界；仅是工程设计规范，不证明当前Registry已激活、独立G已获正式授权或真实端到端运行。M5施工依Owner暂停，代码/配置不得借本文件自动改变。

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

## 6｜C0—C4六阶段→MHKA六阶段的工程路由验收边界（2026-11-06）

本次唯一需要完整继承的是已经认可的`D00—D05/L0—L5/G0—G5`主链；早期无D00、从D01起步的旧五阶段、Discovery/Directed及N01—N06桥接不拥有现行生产权威。任何历史样板试验PASS仅在原样本、原环境和规则版本有效。

### 6.1 真实执行链的必要条件

- `pipelines/data-production/run.mjs`→`orchestrator/registry.mjs`必须选择唯一六Job；`production-registry.json`、方法选路、`load-executor.mjs`和每个Skill的Stage/L/G身份逐项一致。每阶段执行入口可存在，但`DESIGN_TARGET_NOT_APPLIED`、全部Job禁用或Reviewer绑定待核时不得宣称生产已激活。
- 不能仅凭`method-binding-contract.json`中63项C/H/W/A/P定义视为63项实际已可调用；每项`implementation_binding=TO_VERIFY_IN_M0`在获得执行证据、真实模块、预算/授权、来源快照与隔离测试前仍是HOLD。D00的P0.1/P0.2/P0.3属于单独来源标准，不机械塞入63个方法计数。
- **双指纹不可混同（原件比对已核）**：63项方法引用的五组`definition.source_sha256`逐一匹配Library P1—P5原始正式方法文件。GitHub对应标准均另加受控迁移说明前缀；剥离该说明后C/H/W/P正文与原件相同，D04另有两处阶段状态和来源索引文句更新。故GitHub整文件Hash不同是正常工程镜像现象，不得将原`source_sha256`改成GitHub Blob或整文件SHA256。必要时在执行时分别验证历史来源指纹、工程文件/章节版本与实际Tool/Adapter版本；这项来源核对不证明实际方法可执行。
- D00须从合法来源检索/资源目录与方法版本选路到真实原件取得、字节与Hash、身份/版权、不可覆盖尝试日志、L0修订及独立G0特定用途资格。固定`MATERIALS`/照片清单与历史样本成功不能冒充通用来源获取。
- 各D Stage只产生自身L层候选；Producer声明PASS不代表G通过。`independent-stage-qualification.mjs`按当前审计、对象修订、输入输出指纹、Reviewer绑定和时效阻断失效消费；真实专业签发、DB最小权限和撤权须用实际测试证明，不以静态合同代替。

### 6.2 非直线合法运行：事实发布与P08独立控制

1. **纯事实分面：** 经独立G3在特定用途认可的L3世界对象，允许由D05的P02/P03等形成事实读模型；不得为通过顺序型Runner而伪造L4/G4解释。若另有解释分面，P04必须验证相应L4/G4当前资格。两路可由D05按依赖与消费者分面合法合成，最终G5独立签发。
2. **当前工程待补差异（代码未改）：** `orchestrator/contracts.mjs`的D05默认输入只有`qualified_humanistic_finding`，`orchestrator/orchestrator.mjs`沿`STAGE_ORDER.slice(start,end+1)`逐Stage执行，尚未证明可以从G3合法事实分支绕过不需要的D04而进入D05。须在原MAB工程责任下实现可信route decision、精确resume/上游依赖快照、当前G3校验及正反测试，且不能以跳过独立Gate换取分支。
3. **P08职责与默认Job不一致（代码未改）：** `production-registry.json`当前D05 Job的`methods`包括P01—P08，而独立`adapters/d05-read-model-publication.mjs`拒绝P08和P01—P07同Job（`MIXED_CONTROL_PUBLISH`）；现有Registry当前绑定`layer1-adapters.mjs`，不能由此推定该拒绝已发生在当前Runner。后续若采用独立Adapter，必须将P08作为独立控制请求，与发布方法选路分离；不得为规避错误删掉P08或将它误记为第七类L5内容。
4. **负例必须实测：** 仅有G3无G4的事实分面应合法被选择且不产生伪解释；解释分面缺G4须HOLD；不同用途/消费者、撤权/到期、L3变更、P08与发布混绑、没有真实原件/缺当前G0、旧五阶段回退入口全部失败关闭。除已有符合范围的真实回执外，未测项标`NOT_VERIFIED`。

### 6.3 已发现的身份和权威漂移（只读保护）

当前GitHub`skills/mohen-source-intake/SKILL.md`写D01而Registry为D00，`mohen-material-understanding`至`mohen-read-model-publication`四份Skill仍使用上一个L/G编号；`mohen-carrier-reading`D01/L1/G1正确。Registry`authority`仍指向旧C2/C3路径，而本代上位权威是MHKA。修复需由原MAB核现行Skill/Registry实际调用和回归后实施；**本轮不得借文档更新修改已施工Skill、机器配置或执行器**。

### 6.4 旧五阶段退出条件

当前`scripts/guards/check-no-legacy-production-entry.mjs`只能证明Registry未指向`pipelines/research/`、`pipelines/legacy/`及已知旧Runner，不能证明仓库旧源码/文档零残留。清理须按GitHub实际引用、CLI/CI、测试、数据库历史迁移及回滚依赖逐文件确认；可确定纯旧且无有效引用的删除，仍有当前依赖则先有界替换再删。旧历史运行数据与不可变审计不得删除。施工暂停期间旧运行代码只读，目录存在不得成为可调用兼容入口。

**本节状态：** `DESIGN_GAP_IDENTIFIED / EXECUTION_VERIFICATION_HOLD / M5_OWNER_PAUSED`。现有规范写入不自动解除生产运行HOLD，最终以仓库代码、真实隔离/线上证据及Owner恢复授权分别判定。
