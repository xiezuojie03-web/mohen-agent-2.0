# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **核验日期：2026-11-18。** 本快照以GitHub main基线ae2b03abda00dadd0293dc3cce335f086b0dd387及本日对mohen-cloud开发库的只读查询为依据。文档同步提交不会改变本次运行事实。施工标准与顺序只以tasks/implementation/MAB/PLAN.md为准；逐批证据以tasks/implementation/MAB/progress.md为准。

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

- 数据库函数studio.search_qualified_project_layers存在；本轮权限核验显示受限应用角色mohen_app_runtime有EXECUTE，anon、authenticated、service_role无EXECUTE。此结果证明窄读函数授权边界，不证明Studio真实同Project读取成功。
- 当前有效知识资格0、启用Gate Policy 0、Active Reviewer Binding 0、Studio Delegation 0、Execution Receipt 0。生产Run累计20条，仅为历史记录，不代表当前20条运行。
- 当前正式知识读取错误仍被研究主流程归并为FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE；底层具体异常尚未通过安全诊断确证。不得重做已安装窄读迁移，不得把错误文案当作根因。

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

当前main基线ae2b03a对应以下工作流均失败：
- [主CI 44222580550](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/44222580550)
- [隔离PG 44222580551](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/44222580551)
- [隔离HTTP 44222580507](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/44222580507)

本轮取得的Job元数据只有失败结论，没有日志足以确证根因。必须读取本次精确失败日志；不得直接沿用旧批次的Runner账单上限解释。

## 3. 当前唯一工程前沿

按PLAN §3.5 D第7项执行，顺序如下：

1. **先做零费用正式知识读取根因诊断**：同一Project/Owner签名事务，不调用模型；把底层异常安全分类并定位，验证正确身份/用途能得到受控结果，错误Owner/Project/用途/匿名必须拒绝。
2. **保护旧任务已结算成本**：核查是否有可验证的结构化模型输出；当前Receipt只有invocation_id，checkpoint没有settledUnderstanding。没有可靠输出就不得重放付费步骤；保留原任务与费用记录，明确不可自动续跑边界。
3. **修复项目范围来源缺口路由**：保持跨Project共享NOT_VERIFIED；项目授权检索完整、未降级、未截断且无合格来源时，允许进入项目范围D00候选发现。
4. **补外部候选到合法原件获取的交接**：优先复用既有适配器；按来源版本、逐动作权利、合法获取、私有存储、SHA、Source/Version/Raw登记、Owner/Project和幂等要求形成D00所需original_id。没有合法字节或许可时只保留候选并HOLD。
5. **再处理真实云端生产依赖**：在Policy、Reviewer、Cloud Executor和机器身份具备后，同一Project/Root验证D00/G0→D01/G1→D02；未运行部分如实标NOT_RUN/HOLD。
6. **同一作品继续创作**：D02真实接收后，沿既有知识资产、H1/H2/H3、Admin、发布和WATCH主线推进，不新建样板Project、不重建Runner/Registry/Gate。

## 4. M5整体状态

**0/8 OVERALL_HOLD。** 这表示同一真实作品的八维整体验收尚未完成，不是代码完成率。当前最前运行阻断是正式项目知识读取失败；其后还有项目范围D00路由、外部来源获取交接和独立云端运行条件。

## 5. 文件读取与更新

每批按AGENTS.md与PLAN §0.3读取：AGENTS → PLAN相关章节 → CURRENT → progress最新批次/相关证据；仅平台/环境切换时读取ENGINEERING_HANDOFF_CURRENT。交互导航JSON/MD/HTML已停用，不再维护或作为施工依据。
