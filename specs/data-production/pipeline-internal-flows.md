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
3. **P08在两套Adapter中的实际语义不同（只读核实）：** Registry默认D05 Job列P01—P08，且实际绑定`layer1-adapters.mjs`。该被选中Adapter在纯P08时才执行失效闭包；若同一Job同时含P01—P07，则仅设置`p08Deferred=true`并继续发布，未在该分支发出独立P08控制请求。由于默认Job始终包含P01—P07，当前默认配置下P08实际上被持续延期。另一份未被Registry选择的`adapters/d05-read-model-publication.mjs`则对P08+发布混绑直接返回`MIXED_CONTROL_PUBLISH` HOLD。不得把未绑定Adapter的拒绝行为误报为当前Runner已发生，也不得把被选中Adapter的延期误报为P08已完成。后续需在原MAB责任中冻结唯一分路/触发合同，保留P08独立控制，不删方法、不增第七类L5内容。
4. **负例必须实测：** 仅有G3无G4的事实分面应合法被选择且不产生伪解释；解释分面缺G4须HOLD；不同用途/消费者、撤权/到期、L3变更、P08与发布混绑、没有真实原件/缺当前G0、旧五阶段回退入口全部失败关闭。除已有符合范围的真实回执外，未测项标`NOT_VERIFIED`。

### 6.3 Skill身份：目标正确、GitHub现行正文仍有五处错位

已重新读取Library唯一`repo_target`中的六份目标Skill，并与GitHub `main`逐文件对照。目标六份Skill均正确声明D00—D05/L0—L5/G0—G5；当前GitHub正文仅`mohen-carrier-reading`正确，另外五份仍残留旧代际身份：

| Registry/目标 | GitHub现行Skill | 具体差异 |
|---|---|---|
| `mohen-source-intake` D00/L0/G0 | D01/L0/G0 | Stage错误；还指向不存在的`d01-source-intake.mjs`，实际Executor映射是`d00-source-intake.mjs` |
| `mohen-carrier-reading` D01/L1/G1 | D01/L1/G1 | 一致 |
| `mohen-material-understanding` D02/L2/G2 | D02/L1/G1 | L/G仍为旧编号 |
| `mohen-world-construction` D03/L3/G3 | D03/L2/G2 | L/G仍为旧编号 |
| `mohen-humanistic-discovery` D04/L4/G4 | D04/L3/G3 | L/G仍为旧编号 |
| `mohen-read-model-publication` D05/L5/G5 | D05/L4/G4 | L/G仍为旧编号 |

`skills/README_DATA_PRODUCTION_SKILLS.md`已有正确六Stage清单，并明确声明正文冲突时保持OPEN；但清单不能替代Skill自身身份。Registry `authority`仍指向旧C2/C3，Library目标已指向MHKA-03/04/05。以上均属目标已正确、GitHub工程镜像尚未同步，不是允许在M5暂停期间直接改Skill/Registry的授权。修复仍须原MAB逐文件核实Stage输入输出、方法、Executor、Gate Owner及回归后实施。

### 6.4 被Registry选中的Adapter：六阶段存在多套实现，当前选路并未完成专业继承

**唯一当前选路已核实：** `run.mjs`要求显式`--adapters`，并由`assertAdapterBinding`强制与Registry路径一致；`production-registry.json`六个Job全部绑定`pipelines/data-production/adapters/layer1-adapters.mjs`。`load-executor.mjs`选择D00—D05六个薄Executor，`create-stage-executor.mjs`只是调用`context.adapters[stage]`并封装输出/校验交接。

仓库另有两类未被当前Registry选择的实现：
- `private-evidence-adapters.mjs`只为D01—D03提供候选工作器适配，D00/D04/D05明确返回`PRIVATE_STAGE_ADAPTER_NOT_IMPLEMENTED` HOLD；它不等于完整六阶段Adapter，也未被当前Registry绑定。
- `d03-world-construction.mjs`、`d04-humanistic-discovery.mjs`、`d05-read-model-publication.mjs`为分离的专业Adapter，需要注入`extractWorldClaim`、`extractHumanisticFinding`或`publishReadModels`等实现；对应测试明确验证未注入时HOLD。它们未被当前Registry绑定，不能把其行为当作当前Runner行为。

**当前被选中`layer1-adapters.mjs`的实际方法覆盖：**

| Stage | 当前被选中Adapter实际代码 | 与Registry/专业方法目标的差距 |
|---|---|---|
| D00/L0/G0 | 默认使用金泽`MATERIALS`与`PHOTO_MATERIALS`定题材清单，可由Topic配置替换 | 未读取`source-providers.json`或`acquisition-intents.json`作为通用来源发现/获取路由；P0.1—P0.3无可核实的动态方法选路/尝试日志调用 |
| D01/L1/G1 | `readMethods`固定为C01，若有照片则C01+C04 | 不消费`job.methods`；C02/C03/C05—C08没有从Registry进入该Adapter的执行选路证据 |
| D02/L2/G2 | 固定D02提示词与H05/H04，图像不进入本轮LLM多模态读取 | 不消费`job.methods`；H01—H25的25种方法并未由当前Adapter逐项路由 |
| D03/L3/G3 | 固定提示词/证据流，Gate evidence只列W01/W02/W05/W09 | 不消费`job.methods`；其余W方法及W10没有当前Adapter执行映射 |
| D04/L4/G4 | 固定提示词，Gate evidence只列A01/A10 | 不消费`job.methods`；A03—A09、A11—A12没有当前Adapter执行映射 |
| D05/L5/G5 | 发布逻辑主要固定执行P01—P07；P08仅按Job方法列表特殊分支 | 不消费逐项P01—P07方法选择；默认P01—P08配置使P08进入延期分支；且D05要求`findings`输入，当前不能实现纯G3事实分面直达 |

**候选提交存在确定性断点（代码静态可判）：** 被选中Adapter的`writeGate()`只从`details.qualification_request`取Gate候选元数据，没有该字段就抛`GATE_CANDIDATE_METADATA_REQUIRED`。当前D00—D05所有调用点只传`title`、计数或`kind`等展示细节，没有传`qualification_request`。而`createDataProductionRepository.recordGate()`明确要求artifact revision、purpose、allowed scope、consumer、dependency snapshot、evidence refs及input fingerprint。故按当前代码路径，即使将来解除Registry禁用，D00首次G0候选提交也会在已有来源数据写入后抛错；其他Stage同样不能完成该候选提交。Gate服务/候选仓储的独立测试通过，不等于生产Adapter已正确接线。

**持久化边界也未对齐：** `adapter-contract.mjs`说明Executor负责持久化边界、Gate决定和交接；但当前`layer1-adapters.mjs`在Adapter内部直接写多张数据表并调用候选仓储，`create-stage-executor.mjs`没有实现所述持久化事务；`run-persistence.mjs`只更新`control.production_runs`进度和最终状态。D00文本`source.raw_items.storage_ref`与D01文本`payload_ref`使用`memory://`，照片落在`apps/web/public/production-assets`。这不能证明L0真实原件私有字节、跨阶段读取单元和备份恢复已按P0/持久化合同落地。

**测试覆盖边界：** `tests/data-production/orchestrator.test.mjs`使用`fixture-adapters.mjs`验证编排；`adapter-binding.test.mjs`验证Registry路径约束，并不执行真实`layer1-adapters`；`world-meaning-adapter.test.mjs`与`d05-publication-adapter.test.mjs`使用注入函数验证未绑定Adapter；`private-evidence-adapters.test.mjs`使用合成Worker验证D01—D03候选路径。当前可见测试未覆盖Registry实际绑定的`layer1-adapters`完整D00—D05真实候选提交链。CI绿色不得外推为这条链已通过。

### 6.5 旧五阶段退出条件

当前`scripts/guards/check-no-legacy-production-entry.mjs`只能证明Registry未指向`pipelines/research/`、`pipelines/legacy/`及已知旧Runner，不能证明仓库旧源码/文档零残留。清理须按GitHub实际引用、CLI/CI、测试、数据库历史迁移及回滚依赖逐文件确认；可确定纯旧且无有效引用的删除，仍有当前依赖则先有界替换再删。旧历史运行数据与不可变审计不得删除。施工暂停期间旧运行代码只读，目录存在不得成为可调用兼容入口。
**本节状态：** `DESIGN_GAP_IDENTIFIED / EXECUTION_CONTRACT_CONFLICT_OPEN / EXECUTION_VERIFICATION_HOLD / M5_OWNER_PAUSED`。现有规范写入不自动解除生产运行HOLD，最终以仓库代码、真实隔离/线上证据及Owner恢复授权分别判定。
