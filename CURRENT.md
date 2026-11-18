# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **核验日期：2026-11-18。** 本快照当前代码基线为GitHub main提交e5d1bff0b358417680ebfba0435b3fa7539593dc；本轮修复提交包括09cc1cd14e86a8bda9b49660d28ffa71ec63384、b76fd96f5138c46550c8c83e000faed1d4204aef、86ebb7685926931c4e98a27ed64d8ea37c7990c7、c95e71ef2e8ebc3dff50d12cf40b12ad357132f26、e5d1bff0b358417680ebfba0435b3fa7539593dc。数据库事实来自2026-11-18对mohen-cloud的定向验证。施工标准与顺序只以tasks/implementation/MAB/PLAN.md为准；逐批证据以tasks/implementation/MAB/progress.md为准。

## 1. 唯一业务目标

以PLAN §3.5 B/C/D为唯一准出标准：同一真实Creator/Project/Root任务，从Studio问题→L0—L5统一知识检索及当前资格/权利判断→按缺口选择D00—D05必要能力与独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin独立审核/运营发布→WATCH同修订消费和撤权。用户上传/指定原件是可选输入；已有合格资产不得重复获取或生产。

## 2. 当前已核事实（2026-11-18）

### 2.1 同一真实Studio任务

- 开发库当前有1个Studio Project：e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5。
- 朱家角研究任务：53ad1a29-22e5-43c2-816d-b02b6e85abbd；状态hold / research_prerequisites，work_id=null，最后更新时间2026-11-18T01:58:09Z。
- 当前checkpoint缺口：FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE；holdAt.toolId=llm-understand，已用预算1、预留0，settledUnderstandingSaved=false。
- 该任务的工具Receipt显示：一次llm-understand已结算（cost=1）；随后retrieve-local以deterministic_execution_failed进入HOLD。Receipt仅有invocation_id，没有结构化模型输出。故旧任务不能仅凭新代码的续跑能力认定可恢复；不得盲目重放已结算模型步骤。
- Project当前Asset Head数量1；该Project私有原件0、Source记录0、Source Version 0、Raw Item 0。当前尚无可供本任务D00接续的已登记原件。

### 2.2 正式知识读取与权限

- 数据库函数studio.search_qualified_project_layers存在；mohen_app_runtime有受限EXECUTE，anon、authenticated、service_role无EXECUTE。该边界未放宽。
- 零费用安全诊断已定位该函数此前的两个底层故障：一是RETURNS TABLE输出列layer与ORDER BY case layer发生PL/pgSQL变量歧义；二是SECURITY DEFINER owner为postgres时，调用的control.qualification_allows已撤销PUBLIC EXECUTE，导致owner缺少嵌套函数EXECUTE。新增迁移20261118120000修复排序并仅补postgres对嵌套函数的EXECUTE。
- 正确Owner/Project签名事务现在可进入函数并返回受控空结果0条；错Project拒绝为M5_FORMAL_READ_OWNER_REQUIRED；错用途拒绝为M5_FORMAL_READ_CONTEXT_INVALID。数据库层不再是此前的FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE根因；下一步只需从真实Studio应用路径回读，确认应用层正确接收该结果。
- 当前有效知识资格0、启用Gate Policy 0、Active Reviewer Binding 0、Studio Delegation 0、Execution Receipt 0。Project私有原件/Source/Version/Raw仍为0。
- 旧Production Run已完成对账：原5条RUNNING均无cloud_dispatch认领；其中2条有D00 production_failed回执并终结FAILED，另3条无执行事件并终结HOLD。当前不可复用这些run_id，也不得把它们视为仍在执行。
### 2.3 知识路由与D00来源获取

- retrieve-formal.ts第一阶段只按Owner/Project读取；跨Project共享范围为NOT_VERIFIED。因此sharedL0L4CoverageComplete=false是当前安全边界，不能为触发D00而强改为true。
- planStudioKnowledgeRoute目前只在共享范围完整时把无合格资产判为SOURCE_GAP_CONFIRMED并触发Studio外部发现；缺少“当前Project授权范围完整但无合格来源”的独立分支。需要补项目范围来源缺口状态，不得声称全局共享库已检索完整。
- source-discovery.ts能产生外部来源候选线索；现有Studio生产接口及D00私有Adapter要求已经存在的original_id、登记绑定和可信Worker校验。本轮未发现外部候选到合法原件获取、权利判断、字节持久化、SHA回读、Source/Version/Raw登记及D00输入的完整主线连接。
- 外部候选不是原件、事实、来源权利许可或Gate资格；无合法字节/权利时必须仅保留线索并HOLD。

### 2.4 云端与独立运行条件

- Gate Policy=0、Active Reviewer Binding=0、当前资格=0；Cloud Executor和真实云端Producer/Worker TLS/低权身份尚未在同一真实任务中完成验证。Registry六个Job启用及本地隔离历史成果不能代表云端独立Gate可签发。
- Producer/Worker登录角色密码此前已由Owner安全初始化，BYPASSRLS=false；Vercel四项Producer/Worker Preview变量此前已核实存在且为Sensitive/Secret，原始值未读取。**不得再次要求Owner重置密码或提供密码**。变量存在不等于云端TLS/真实身份连接通过。
- 既有受保护Preview和Production隔离状态以此前精确部署回执为准；本轮未改部署、环境变量、Production或数据库配置。

### 2.5 当前CI

- 主CI连续出现零步骤、极短时失败：09cc1cd对应run 44243279147，b76fd96对应run 44243282116，均约4秒结束；build job没有可读取steps/logs。44243282116已执行失败job重跑，目前处于queued。
- 因同形态跨不同提交持续出现，当前没有证据把它归因于本轮SQL/测试代码；也没有日志足以确认是账单、Runner分配或工作流层故障。CI继续标HOLD，不把红灯解释成业务失败，也不等待CI才推进零费用业务诊断。

## 3. 当前唯一工程前沿

按PLAN §3.5 D执行：

1. **真实应用回读正式知识函数修复**：同一朱家角Project/Owner任务重新进入既有retrieve-local；不重放已结算模型。
2. **保护旧任务成本**：Receipt仍只有invocation_id，没有可恢复结构化模型输出；维持旧任务HOLD边界。
3. **旧Production Run对账已完成**：5条旧RUNNING全部收敛为2 FAILED + 3 HOLD，不再复用。
4. **当前下一处业务施工是项目范围来源缺口路由**：在不放宽跨Project共享的情况下，让“项目内完整授权检索无合格来源”进入稳定的PROJECT_SOURCE_GAP_CONFIRMED分支。
5. **随后补外部候选→合法原件获取/登记→D00输入的相邻交接**；仍不新建Runner/Registry/Gate。
6. **独立Policy/Reviewer/Cloud Executor/机器身份具备后**，再做同一Root D00/G0→D01/G1→D02真实运行。
7. **CI**：等待44243282116重跑结果；在无日志前不作根因结论。

## 4. M5整体状态

**0/8 OVERALL_HOLD。** 这表示同一真实作品的八维整体验收尚未完成，不是代码完成率。数据库层正式知识读取函数的两个确定性故障已经修复；当前最前业务阻断转为“真实应用回读确认 → 项目范围来源缺口路由”。其后仍有外部来源获取交接、独立云端运行条件及同一作品后续D/L/G、作品、Admin/WATCH链路。

## 4. M5整体状态

**0/8 OVERALL_HOLD。** 这表示同一真实作品的八维整体验收尚未完成，不是代码完成率。当前最前运行阻断是正式项目知识读取失败；其后还有项目范围D00路由、外部来源获取交接和独立云端运行条件。

## 5. 文件读取与更新

每批按AGENTS.md与PLAN §0.3读取：AGENTS → PLAN相关章节 → CURRENT → progress最新批次/相关证据；仅平台/环境切换时读取ENGINEERING_HANDOFF_CURRENT。交互导航JSON/MD/HTML已停用，不再维护或作为施工依据。
