# 墨痕 M5 全链路导航｜持续维护基线（非权威标准）

> 源码核对基线：`xiezuojie03-web/mohen-agent-2.0@2c4db01783ccdb24d21f1fc99e1b28abca82d3fc`；核查日期 2026-11-15。唯一施工与准出标准仍为 `tasks/implementation/MAB/PLAN.md` V1.7 §3.5 B/C。每次施工必须先回读 `CURRENT.md` 与最新 main、CI/实际运行证据。
>
> **角色：** 本图为后续任务的“指南针”，可以在阶段性定向收口后持续生长。不是系统已跑通的证明，不构成第二套架构权威、Runner、Gate、知识库或M5验收标准。三份导航（JSON/MD/HTML）必须同步更新。

## 分模块展开与完整统计（沿用37节点/54连接）

导航把现有对象划成9个互斥主归属领域（`nodes[].primary_domain`、`edges[].primary_domain`），保持原37节点和54条结构连接不变。D00—D05继续显示完整六段主链；其它领域在HTML中可展开为有输入、责任与验收检查的业务步骤。**这些步骤是核查说明，不是新的节点、代码或已通过测试。**

### 全图与当前M5统计分母

- 全图：**37节点、54连接**；其中M5当前范围**36节点、52连接**，EXP未来**1节点、2连接**。
- 54条连接已定向诊断7条，尚未完成定向接口归因45条，另2条未来预留。当前M5连接的定向诊断覆盖为 **7/52 = 13.5%**，未定向核查 **45/52 = 86.5%**；此处是**诊断证据覆盖率**，不是工程实现或完成率。
- M5运行层 **0/52条连接具备本导航可认可的同Root PASS证据**，不等于52条连接全部没有代码。
- 下表节点与连接采用互斥主归属，可相加；M5八维是交叉映射，**一个连接可对应多个维度，八维列不可相加**。

### 三层状态完整统计（当前M5，排除EXP未来边）

| 对象与层次 | PASS | PARTIAL | HOLD | NOT_VERIFIED | 分母 |
|---|---:|---:|---:|---:|---:|
| 连接 ◆能力 | 0 | 7 | 0 | 45 | 52 |
| 连接 ⇄连接 | 0 | 3 | 4 | 45 | 52 |
| 连接 ●运行 | 0 | 0 | 0 | 52 | 52 |
| 节点 ◆能力 | 0 | 36 | 0 | 0 | 36 |
| 节点 ⇄连接 | 0 | 2 | 3 | 31 | 36 |
| 节点 ●运行 | 0 | 0 | 0 | 36 | 36 |

全图另有1个EXP未来节点、2条未来连接，三层状态均为FUTURE。每行按自己的分母算比例，例如连接能力PARTIAL为**13.5%**、连接能力NOT_VERIFIED为**86.5%**，不能用未核实比例推断开发缺失。

### 专业合同细目与工程状态的界线

- **13类知识工作资产**：`research_brief / source_anchor / reading_note / evidence_note / spacetime_candidate / relation_hypothesis / humanistic_insight / research_collection / director_plan / media_selection / work_revision / citation_snapshot / consented_feedback`（来源：`specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` §10）。均是受控的合同目标，现阶段不能用清单存在推断全部实现。
- **19组件**：W01 作品导航；W02 视觉舞台容器；W03 时间节拍轴；W04 历史空间承载；W05 原件阅读与导读；W06 对照与比较；W07 关系观察；W08 叙事字幕与声音；W09 墨痕在场；W10 证据与出处返查；W11 镜头调度与播放；X01 探索意图与路径；X02 探索快照与返回；C01 资产检索选择器；C02 AI 编排建议比较；C03 节拍与镜头编辑器；C04 预览和版本管理；C05 资格与导出发布；F01 缺口工单与回流（来源：`specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md` §4.1）。其中W族11项、X族2项、C族5项、F族1项，跨WATCH/EXP/Studio/回流，不全属于Studio页面。
- HTML在对应模块中提供可展开的**合同目录**，仅帮助后续逐项核查，**不改变37节点/54连接与M5八维准出分母**。

### 模块结构分布（互斥主归属）

| 业务领域 | 节点 | 连接 | 占全部54条 |
|---|---:|---:|---:|
| Studio入口与研究委托 | 2 | 2 | 3.7% |
| D00—D05六阶段生产主链 | 24 | 23 | 42.6% |
| 内外AI混合协作 | 1 | 3 | 5.6% |
| L0—L5合格知识复用 | 1 | 7 | 13% |
| 13类知识资产与复用生命周期 | 1 | 4 | 7.4% |
| Studio创作与作品修订 | 2 | 2 | 3.7% |
| Admin全层知识与运营治理 | 2 | 8 | 14.8% |
| 发布、WATCH与即时撤权 | 3 | 3 | 5.6% |
| EXP探索（未来预留） | 1 | 2 | 3.7% |
| **合计** | **37** | **54** | **100%** |

### M5八维交叉对应（非完成率）

| 维度 | 对应连接数 | 占52条M5连接的覆盖比例 |
|---|---:|---:|
| 1. 自然语言创作入口 | 2 | 3.8% |
| 2. 内外AI混合协作 | 3 | 5.8% |
| 3. 真实来源、证据和D/L/G生产 | 32 | 61.5% |
| 4. 13类知识资产沉淀 | 4 | 7.7% |
| 5. Studio真实创作 | 12 | 23.1% |
| 6. Admin知识资产管理 | 9 | 17.3% |
| 7. 独立G5、媒资权利与发布 | 3 | 5.8% |
| 8. WATCH同修订合法消费与撤权 | 3 | 5.8% |

**使用与持续维护**：查看HTML顶部“完整统计”模块，可在“节点/连接”以及“当前M5/全图”之间切换分母；下方可展开9个业务领域及10组内部业务链路，逐项查看输入/输出/权限和原54条连接。机器按`statistics`、`navigation_domains`读取，但**基础真相仍是`nodes[]/edges[].verification_layers`与精准证据**；每次更新必须重新计算校验统计，不能凭百分比改判PASS。

## 非D00—D05模块内部链路全分解（2026-11-16）

**本轮目标与依据**：本轮在模块职责与Agent讨论已截稿后，直接核对GitHub现存UI、专业合同、U07动作设计、M5 PLAN和源码。**不把资料库CEI研究原型当作现行工程设计**。原37节点、54条跨模块边（其中52条M5，2条EXP未来）、全部原验证三层状态、诊断覆盖和M5八维分母均保留。

新增加 **10组模块内部业务链**（含HOME/用户权限这两条横线），总计**68个可定位业务步骤、58个内部交接检查点**。它们不是58条新增的正式主图边，更不是58个新验收门；只解决原54条粗粒度业务连接内部“到底卡在哪一步”的问题。所有内部交接首次均为**NOT_VERIFIED**，源文件路径是核查入口，不等于完整功能存在，更不等于PASS。

| 内部业务链 | 归属/范围 | 业务步骤 | 细分交接 | 原主图关联 | HTML入口 |
| --- | --- | ---: | ---: | --- | --- |
| HOME入口与全局导航 | M5_ENTRY_ONLY | 5 | 4 | E00, E01 | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-intake) |
| 账户身份与权限横线 | M5_CROSSCUT_AUTH | 6 | 5 | E_ADMIN_L0, E_ADMIN_L1, E_ADMIN_L2, E_ADMIN_L3, E_ADMIN_L4, E_ADMIN_L5, E_ADMIN_TO_EDITORIAL, E_ADMIN_TO_REVOKE | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-admin) |
| Studio自然语言入口与正式生产请求 | M5_DIM_1 | 6 | 5 | E00, E01 | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-intake) |
| Agent与外部AI同Root协作 | M5_DIM_2 | 7 | 6 | E_AGENT_TO_MIXED, E_MIXED_TO_D00, E_MIXED_TO_CREATIVE | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-mixed) |
| L0—L5合法知识复用链 | M5_DIM_3_5 | 7 | 6 | E_L0_TO_CREATIVE, E_L1_TO_CREATIVE, E_L2_TO_CREATIVE, E_L3_TO_CREATIVE, E_L4_TO_CREATIVE, E_L5_TO_CREATIVE, E_REUSE_TO_STUDIO | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-knowledge_use) |
| 13类工作资产持久化和复用 | M5_DIM_4 | 8 | 7 | E_REUSE_TO_ASSETS, E_CREATIVE_TO_ASSETS, E_ASSETS_TO_CREATIVE, E_ASSETS_TO_ADMIN | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-assets) |
| Studio导演、作品修订及投稿 | M5_DIM_5 | 8 | 7 | E_STUDIO_TO_REV, E_REV_TO_EDITORIAL | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-studio) |
| Admin知识治理、运营和作品审核 | M5_DIM_6 | 8 | 7 | E_ADMIN_L0, E_ADMIN_L1, E_ADMIN_L2, E_ADMIN_L3, E_ADMIN_L4, E_ADMIN_L5, E_ADMIN_TO_EDITORIAL, E_ADMIN_TO_REVOKE | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-admin) |
| 发布→WATCH合法消费→撤权 | M5_DIM_7_8 | 8 | 7 | E_EDITORIAL_TO_PUBLISH, E_PUBLISH_TO_WATCH, E_REVOKE_TO_WATCH | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-publish) |
| EXP现有能力与未来深链 | FUTURE_NOT_M5 | 5 | 4 | E_REUSE_TO_EXP, E_WORKREV_TO_EXP | [展开](M5_MAINLINE_NAVIGATION_20261115.html#module-exp) |

### 每组链路的输入、动作、输出与守卫

#### HOME入口与全局导航（5个步骤，4条待核交接）

**1. 现有HOME呈现**（public）

- **输入 → 动作 → 输出**：URL/登录态 → 显示价值介绍和合法入口 → 模式卡与空态
- **权限及失败边界**：空态不可伪造策展世界
- **当前代码定位**：`apps/web/app/page.tsx`；`apps/web/app/components/GlobalNav.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00
- **下一内部交接**：LINK_HOME_01，接收端要求：用户点击入口；状态：NOT_VERIFIED。

**2. 选择Studio或WATCH等入口**（public/member）

- **输入 → 动作 → 输出**：用户点击入口 → 路由到对应工作面 → 有权目标页面
- **权限及失败边界**：菜单不替代服务端权限
- **当前代码定位**：`apps/web/app/page.tsx`；`apps/web/app/components/GlobalNav.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00
- **下一内部交接**：LINK_HOME_02，接收端要求：查询词和身份；状态：NOT_VERIFIED。

**3. 作品和知识搜索**（member）

- **输入 → 动作 → 输出**：查询词和身份 → 请求当前可见结果 → 作品/知识或空态
- **权限及失败边界**：跨Owner返回拒绝
- **当前代码定位**：`apps/web/app/components/GlobalNav.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：所属模块的内部检查点
- **下一内部交接**：LINK_HOME_03，接收端要求：用户问题/会话；状态：NOT_VERIFIED。

**4. 进入真实创作委托**（creator）

- **输入 → 动作 → 输出**：用户问题/会话 → 进入ST-01输入路径 → 研究委托的起点
- **权限及失败边界**：不自动触发ST-04
- **当前代码定位**：`apps/web/app/components/GlobalNav.tsx`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00
- **下一内部交接**：LINK_HOME_04，接收端要求：明确的返回动作；状态：NOT_VERIFIED。

**5. 返回主页并重新开始**（public/member）

- **输入 → 动作 → 输出**：明确的返回动作 → 安全重选工作面 → 合法路由与上下文
- **权限及失败边界**：不得自动运行旧任务/外泄焦点
- **当前代码定位**：`apps/web/app/components/GlobalNav.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：所属模块的内部检查点

#### 账户身份与权限横线（6个步骤，5条待核交接）

**1. 核当前登录与角色**（member/creator/operator）

- **输入 → 动作 → 输出**：session/角色 → 确认active_user和role → 授权身份或拒绝
- **权限及失败边界**：前端显示角色不等于服务端权限
- **当前代码定位**：`apps/web/app/components/GlobalNav.tsx`；`apps/web/app/admin/AdminWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：所属模块的内部检查点
- **下一内部交接**：LINK_IDENTITY_01，接收端要求：project_id/root_task_id；状态：NOT_VERIFIED。

**2. 绑定项目Owner与Root**（creator）

- **输入 → 动作 → 输出**：project_id/root_task_id → 核项目和资源归属 → 有权研究上下文
- **权限及失败边界**：跨Owner/HOLD
- **当前代码定位**：`apps/web/app/api/studio/projects/route.ts`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00、E01
- **下一内部交接**：LINK_IDENTITY_02，接收端要求：Delegation/rights/预算；状态：NOT_VERIFIED。

**3. 受托外发及预算动作授权**（creator）

- **输入 → 动作 → 输出**：Delegation/rights/预算 → 检查动作许可和执行范围 → grant或拒绝
- **权限及失败边界**：不能从轻提示永久提权
- **当前代码定位**：`apps/web/lib/studio-execution-authority.ts`；`apps/web/app/api/studio/dispatch-authorizations/route.ts`；`packages/data-access/src/studio-delegation-repository.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_AGENT_TO_MIXED
- **下一内部交接**：LINK_IDENTITY_03，接收端要求：L@rev/consumer/purpose；状态：NOT_VERIFIED。

**4. Gate资格与消费者权利**（system）

- **输入 → 动作 → 输出**：L@rev/consumer/purpose → 核当前独立资格与rights → 合法读取或拒绝
- **权限及失败边界**：运营approved不等于G PASS
- **当前代码定位**：`packages/data-access/src/gate-stage-qualification.mjs`；`packages/data-access/src/rights-actions.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_STUDIO
- **下一内部交接**：LINK_IDENTITY_04，接收端要求：active_role/作品修订；状态：NOT_VERIFIED。

**5. 运营与Reviewer角色隔离**（operator/reviewer）

- **输入 → 动作 → 输出**：active_role/作品修订 → 分别审核并记操作身份 → 可审计决定
- **权限及失败边界**：同人切角色不得自签Gate
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/api/governance/gates/decisions/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ADMIN_TO_EDITORIAL
- **下一内部交接**：LINK_IDENTITY_05，接收端要求：失效对象及依赖；状态：NOT_VERIFIED。

**6. 撤权后阻断新访问**（system）

- **输入 → 动作 → 输出**：失效对象及依赖 → 按范围重核消费 → 新请求DENY/HOLD
- **权限及失败边界**：旧缓存不得继续展示失权素材
- **当前代码定位**：`packages/data-access/src/invalidation.mjs`；`apps/web/app/watch/WatchGallery.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ADMIN_TO_REVOKE、E_REVOKE_TO_WATCH

#### Studio自然语言入口与正式生产请求（6个步骤，5条待核交接）

**1. Creator提出任意真实问题**（creator）

- **输入 → 动作 → 输出**：自由历史问题 → Studio接收原始意图 → 可追溯问题
- **权限及失败边界**：不可只接受示例模板
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00
- **下一内部交接**：LINK_INTAKE_01，接收端要求：会话/Owner/旧项目；状态：NOT_VERIFIED。

**2. 建立或恢复研究底稿**（creator）

- **输入 → 动作 → 输出**：会话/Owner/旧项目 → 生成或重开project → project_id与合法历史
- **权限及失败边界**：不得跨Owner恢复
- **当前代码定位**：`apps/web/app/api/studio/projects/route.ts`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00
- **下一内部交接**：LINK_INTAKE_02，接收端要求：项目/问题/幂等键；状态：NOT_VERIFIED。

**3. 正式保存ST-01研究任务**（creator）

- **输入 → 动作 → 输出**：项目/问题/幂等键 → 受控提交research-task → task_id和状态
- **权限及失败边界**：研究任务不是正式G资格
- **当前代码定位**：`apps/web/app/api/studio/research-tasks/route.ts`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00
- **下一内部交接**：LINK_INTAKE_03，接收端要求：任务和获权材料；状态：NOT_VERIFIED。

**4. Agent研究规划与缺口说明**（agent）

- **输入 → 动作 → 输出**：任务和获权材料 → 检索、解释及HOLD → AgentDecision或明确不足
- **权限及失败边界**：不能无材料编造PASS
- **当前代码定位**：`apps/web/app/api/studio/research-tasks/route.ts`；`specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md`；这是路径定位而非接口验收。
- **原主图交接锚点**：E00
- **下一内部交接**：LINK_INTAKE_04，接收端要求：任务/已绑定原件/页码；状态：NOT_VERIFIED。

**5. Creator另行请求ST-04**（creator）

- **输入 → 动作 → 输出**：任务/已绑定原件/页码 → 发起受控正式生产 → run_id或拒因
- **权限及失败边界**：提问不自动越过授权
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`apps/web/lib/studio-production.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E01
- **下一内部交接**：LINK_INTAKE_05，接收端要求：真实run/revision；状态：NOT_VERIFIED。

**6. 当前阶段回读与合法恢复**（creator）

- **输入 → 动作 → 输出**：真实run/revision → 读取阶段、HOLD与恢复依据 → 真实生产进度和补证项
- **权限及失败边界**：无独立G不显示qualified
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`apps/web/lib/studio-production.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E01

#### Agent与外部AI同Root协作（7个步骤，6条待核交接）

**1. 确定Agent和外部AI的工作分工**（agent）

- **输入 → 动作 → 输出**：Creator委托与Root → 建立受控Delegation → 工作边界和任务上下文
- **权限及失败边界**：不能让Provider代G
- **当前代码定位**：`apps/web/app/api/studio/research-tasks/route.ts`；`specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_AGENT_TO_MIXED
- **下一内部交接**：LINK_MIXED_01，接收端要求：来源/用途/模型身份；状态：NOT_VERIFIED。

**2. 逐源权利与出域许可**（creator/agent）

- **输入 → 动作 → 输出**：来源/用途/模型身份 → 申请最小外发范围 → 有权grant或HOLD
- **权限及失败边界**：研究读不自动授权外发
- **当前代码定位**：`apps/web/lib/studio-execution-authority.ts`；`apps/web/app/api/studio/dispatch-authorizations/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_AGENT_TO_MIXED
- **下一内部交接**：LINK_MIXED_02，接收端要求：root/预算/限额；状态：NOT_VERIFIED。

**3. 费用预算预留与幂等**（system）

- **输入 → 动作 → 输出**：root/预算/限额 → 核费用与执行次数 → 成本授权回执
- **权限及失败边界**：无权重试不得多扣费
- **当前代码定位**：`apps/web/lib/studio/tool-ledger.ts`；`apps/web/lib/studio-execution-authority.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_AGENT_TO_MIXED
- **下一内部交接**：LINK_MIXED_03，接收端要求：有权最小输入/模型版本；状态：NOT_VERIFIED。

**4. 调用真实Provider或专业工具**（agent/provider）

- **输入 → 动作 → 输出**：有权最小输入/模型版本 → 执行真实服务 → 可核输出与工具结果
- **权限及失败边界**：模拟内容不当真实贡献
- **当前代码定位**：`apps/web/lib/studio/provider-dispatcher.ts`；`packages/data-access/src/studio-execution-repository.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_MIXED_TO_D00
- **下一内部交接**：LINK_MIXED_04，接收端要求：真实输入输出hash/费用；状态：NOT_VERIFIED。

**5. 记录Agent/Provider独立贡献**（system）

- **输入 → 动作 → 输出**：真实输入输出hash/费用 → 持久入账ExecutionReceipt → 同Root贡献链和成本
- **权限及失败边界**：不能事后从聊天反造回执
- **当前代码定位**：`packages/data-access/src/studio-delegation-repository.mjs`；`packages/data-access/src/studio-execution-repository.mjs`；`apps/web/lib/studio/tool-ledger.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_MIXED_TO_CREATIVE
- **下一内部交接**：LINK_MIXED_05，接收端要求：来源与合法回执；状态：NOT_VERIFIED。

**6. 合法成果交D00**（creator/agent）

- **输入 → 动作 → 输出**：来源与合法回执 → 按Creator请求进入D00 → 受控候选或HOLD
- **权限及失败边界**：Provider不是专业资格签发者
- **当前代码定位**：`apps/web/lib/studio-production.ts`；`apps/web/lib/studio/provider-dispatcher.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_MIXED_TO_D00
- **下一内部交接**：LINK_MIXED_06，接收端要求：有权L知识/修订/回执；状态：NOT_VERIFIED。

**7. 合法成果进入H1/H2/H3**（creator/agent）

- **输入 → 动作 → 输出**：有权L知识/修订/回执 → 形成可审导演建议 → 真实差异方案与出处
- **权限及失败边界**：无权模型推断不得发表为史实
- **当前代码定位**：`apps/web/app/api/studio/director-plans/route.ts`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_MIXED_TO_CREATIVE

#### L0—L5合法知识复用链（7个步骤，6条待核交接）

**1. Studio/Agent提出材料需求**（creator/agent）

- **输入 → 动作 → 输出**：项目/问题/用途 → 受控调用研究读取 → 目标知识要求
- **权限及失败边界**：不直读所有私表
- **当前代码定位**：`apps/web/app/api/studio/research-read/route.ts`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_STUDIO
- **下一内部交接**：LINK_KNOWLEDGE_USE_01，接收端要求：层级、对象与revision；状态：NOT_VERIFIED。

**2. 按L0—L5精确查版本**（system）

- **输入 → 动作 → 输出**：层级、对象与revision → 定位已有可用L知识 → L@rev和来源locator
- **权限及失败边界**：不强迫每次重新生产
- **当前代码定位**：`packages/data-access/src/read-model-repository.mjs`；`apps/web/app/api/studio/research-read/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_L0_TO_CREATIVE、E_L1_TO_CREATIVE、E_L2_TO_CREATIVE、E_L3_TO_CREATIVE、E_L4_TO_CREATIVE、E_L5_TO_CREATIVE
- **下一内部交接**：LINK_KNOWLEDGE_USE_02，接收端要求：L@rev/consumer/purpose；状态：NOT_VERIFIED。

**3. 独立G当前用途资格检查**（system）

- **输入 → 动作 → 输出**：L@rev/consumer/purpose → 核同层专业签发和失效 → 当前适用资格或HOLD
- **权限及失败边界**：旧PASS不永久有效
- **当前代码定位**：`packages/data-access/src/gate-stage-qualification.mjs`；`apps/web/app/api/studio/research-read/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_STUDIO
- **下一内部交接**：LINK_KNOWLEDGE_USE_03，接收端要求：身份/machine_read/quote/display；状态：NOT_VERIFIED。

**4. Owner与动作权利检查**（system）

- **输入 → 动作 → 输出**：身份/machine_read/quote/display → 检验逐动作许可 → RightsDecision
- **权限及失败边界**：内部读取不推出公开展示书影权
- **当前代码定位**：`packages/data-access/src/rights-actions.mjs`；`apps/web/app/api/studio/research-read/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_STUDIO
- **下一内部交接**：LINK_KNOWLEDGE_USE_04，接收端要求：有效L和有权来源；状态：NOT_VERIFIED。

**5. 返回合法只读材料**（system）

- **输入 → 动作 → 输出**：有效L和有权来源 → 形成Studio研究输入 → 可追踪真实材料和缺口
- **权限及失败边界**：不得泄漏私有原件字节
- **当前代码定位**：`packages/data-access/src/read-model-repository.mjs`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_STUDIO
- **下一内部交接**：LINK_KNOWLEDGE_USE_05，接收端要求：合法L@rev/项目；状态：NOT_VERIFIED。

**6. 引用进作品及工作资产**（creator/agent）

- **输入 → 动作 → 输出**：合法L@rev/项目 → 绑定依赖与使用记录 → 被引用修订及来路
- **权限及失败边界**：不能复制第二知识真源
- **当前代码定位**：`packages/data-access/src/studio-asset-repository.mjs`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_ASSETS
- **下一内部交接**：LINK_KNOWLEDGE_USE_06，接收端要求：revocation与依赖；状态：NOT_VERIFIED。

**7. 撤权导致消费HOLD**（system）

- **输入 → 动作 → 输出**：revocation与依赖 → 重新核资格并阻断 → 受限状态与恢复条件
- **权限及失败边界**：旧缓存不能重放
- **当前代码定位**：`packages/data-access/src/invalidation.mjs`；`packages/data-access/src/gate-stage-qualification.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_STUDIO

#### 13类工作资产持久化和复用（8个步骤，7条待核交接）

**1. 识别真实知识/创作增量**（creator/agent）

- **输入 → 动作 → 输出**：研究材料或新作品行动 → 识别应保存的工作对象 → 有价值候选
- **权限及失败边界**：不为13种类型凑空数
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`apps/web/app/api/studio/assets/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_CREATIVE_TO_ASSETS
- **下一内部交接**：LINK_ASSETS_01，接收端要求：语义与原项目；状态：NOT_VERIFIED。

**2. 采用既有asset_kind合同**（system）

- **输入 → 动作 → 输出**：语义与原项目 → 映射13种枚举和数据形态 → 类型身份
- **权限及失败边界**：不擅自增加新类型
- **当前代码定位**：`packages/data-access/src/studio-asset-repository.mjs`；`specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_CREATIVE_TO_ASSETS
- **下一内部交接**：LINK_ASSETS_02，接收端要求：Owner/project/type；状态：NOT_VERIFIED。

**3. 保存asset_heads的长期身份**（system）

- **输入 → 动作 → 输出**：Owner/project/type → 创建稳定资产头 → asset_id与ACL
- **权限及失败边界**：短研究task不能冒充长期资产
- **当前代码定位**：`packages/data-access/src/studio-asset-repository.mjs`；`apps/web/app/api/studio/assets/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_CREATIVE_TO_ASSETS
- **下一内部交接**：LINK_ASSETS_03，接收端要求：内容hash/旧revision/来源；状态：NOT_VERIFIED。

**4. 保存不可变revision和真实来源**（creator/agent）

- **输入 → 动作 → 输出**：内容hash/旧revision/来源 → CAS保存asset@rev → 不可变修订与出处
- **权限及失败边界**：冲突不能覆盖旧版
- **当前代码定位**：`packages/data-access/src/studio-asset-repository.mjs`；`apps/web/app/api/studio/assets/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_CREATIVE_TO_ASSETS
- **下一内部交接**：LINK_ASSETS_04，接收端要求：canonical对象及修订；状态：NOT_VERIFIED。

**5. 关联正规导演/媒体/作品主本**（system）

- **输入 → 动作 → 输出**：canonical对象及修订 → 建立指向唯一主本的引用 → 规范化关联
- **权限及失败边界**：不能绕开CANONICAL_BINDING_REQUIRED
- **当前代码定位**：`packages/data-access/src/studio-asset-repository.mjs`；`specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_CREATIVE_TO_ASSETS
- **下一内部交接**：LINK_ASSETS_05，接收端要求：L@rev/工作资产/权限；状态：NOT_VERIFIED。

**6. 保存rights与依赖关系**（system）

- **输入 → 动作 → 输出**：L@rev/工作资产/权限 → 维护asset_links与可复用状态 → 依赖闭包及认识身份
- **权限及失败边界**：reuse_ready不等于G资格
- **当前代码定位**：`packages/data-access/src/studio-asset-repository.mjs`；`packages/data-access/src/rights-actions.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_ASSETS
- **下一内部交接**：LINK_ASSETS_06，接收端要求：A精确rev/B项目许可；状态：NOT_VERIFIED。

**7. 授权复用并记录实际use_event**（creator/agent）

- **输入 → 动作 → 输出**：A精确rev/B项目许可 → 真实复用/必要Fork并形成新认知 → 实际使用记录和新修订
- **权限及失败边界**：搜索命中不等于真实复用
- **当前代码定位**：`packages/data-access/src/studio-asset-repository.mjs`；`packages/data-access/src/studio-delegation-repository.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ASSETS_TO_CREATIVE
- **下一内部交接**：LINK_ASSETS_07，接收端要求：资产身份/使用史/撤权；状态：NOT_VERIFIED。

**8. Admin检查资产及失效后果**（operator）

- **输入 → 动作 → 输出**：资产身份/使用史/撤权 → 审计来源、版本和下游 → 可解释影响清单
- **权限及失败边界**：不能静默删不相关历史
- **当前代码定位**：`apps/web/app/admin/KnowledgeAssetInspector.tsx`；`apps/web/app/admin/AdminWorkbench.tsx`；`packages/data-access/src/studio-asset-repository.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ASSETS_TO_ADMIN

#### Studio导演、作品修订及投稿（8个步骤，7条待核交接）

**1. 构造合法导演材料上下文**（creator/agent）

- **输入 → 动作 → 输出**：研究Brief与合格L0—L5 → 形成有权证据与创作主题 → 导演可读材料集
- **权限及失败边界**：未G私有假说不当已证事实
- **当前代码定位**：`apps/web/app/api/studio/research-read/route.ts`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_STUDIO
- **下一内部交接**：LINK_STUDIO_01，接收端要求：材料/模型授权/预算；状态：NOT_VERIFIED。

**2. 在许可内生成A/B导演方案**（creator/agent）

- **输入 → 动作 → 输出**：材料/模型授权/预算 → 请求H1/H2/H3真实不同计划 → 可比较DirectorPlan与Receipt
- **权限及失败边界**：不可无权外发
- **当前代码定位**：`apps/web/app/api/studio/director-plans/route.ts`；`apps/web/app/api/studio/dispatch-authorizations/route.ts`；`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_MIXED_TO_CREATIVE
- **下一内部交接**：LINK_STUDIO_02，接收端要求：两份方案及具体差异；状态：NOT_VERIFIED。

**3. Creator选择并锁定导演方向**（creator）

- **输入 → 动作 → 输出**：两份方案及具体差异 → 采纳一个方向 → 选中计划的精确身份
- **权限及失败边界**：换标题不能冒充方案比较
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`apps/web/app/api/studio/director-plans/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_STUDIO_TO_REV
- **下一内部交接**：LINK_STUDIO_03，接收端要求：合法材料/选中导演；状态：NOT_VERIFIED。

**4. 生成可编辑节拍和分镜**（agent）

- **输入 → 动作 → 输出**：合法材料/选中导演 → 生产真实面板和旁白 → WorkPanels候选
- **权限及失败边界**：不以模板占位充作品
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`apps/web/app/api/studio/director-plans/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_STUDIO_TO_REV
- **下一内部交接**：LINK_STUDIO_04，接收端要求：原件/媒体来源和用途；状态：NOT_VERIFIED。

**5. 媒资与引文逐动作核权**（creator/system）

- **输入 → 动作 → 输出**：原件/媒体来源和用途 → 选择合法材料绑定面板 → 有权素材列表或缺口
- **权限及失败边界**：不展示未授权书影
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`packages/data-access/src/rights-actions.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_STUDIO_TO_REV
- **下一内部交接**：LINK_STUDIO_05，接收端要求：指定修改范围和当前稿；状态：NOT_VERIFIED。

**6. 局部改稿及预览**（creator/agent）

- **输入 → 动作 → 输出**：指定修改范围和当前稿 → 保留未改部分并生成差异 → 真实可观察作品预览
- **权限及失败边界**：不能静默重写全部内容
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_STUDIO_TO_REV
- **下一内部交接**：LINK_STUDIO_06，接收端要求：正文/来源/版本；状态：NOT_VERIFIED。

**7. 保存不可变WorkRevision**（creator/system）

- **输入 → 动作 → 输出**：正文/来源/版本 → 保存新版本并回读 → work_id与revision_id
- **权限及失败边界**：CAS冲突不能覆盖旧版
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`packages/data-access/src/studio-asset-repository.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_STUDIO_TO_REV
- **下一内部交接**：LINK_STUDIO_07，接收端要求：选定稿件和出处；状态：NOT_VERIFIED。

**8. Creator提交确切修订审核**（creator）

- **输入 → 动作 → 输出**：选定稿件和出处 → 单独POST submit → 冻结作品审查对象
- **权限及失败边界**：预览/保存不等于发布
- **当前代码定位**：`apps/web/app/studio/StudioWorkbench.tsx`；`apps/web/app/api/works/[id]/submit/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REV_TO_EDITORIAL

#### Admin知识治理、运营和作品审核（8个步骤，7条待核交接）

**1. 核有权运营/Reviewer登录**（operator/reviewer）

- **输入 → 动作 → 输出**：session/active_role → 确认后台功能权限 → 可操作角色或拒绝
- **权限及失败边界**：不能由前台菜单提权
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/components/GlobalNav.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ADMIN_TO_EDITORIAL
- **下一内部交接**：LINK_ADMIN_01，接收端要求：L候选/G记录/来源；状态：NOT_VERIFIED。

**2. 横向检查L0—L5资格历史**（operator）

- **输入 → 动作 → 输出**：L候选/G记录/来源 → 逐层查看资格与问题 → 可定位专业历史
- **权限及失败边界**：Admin浏览不是G签发
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/admin/KnowledgeAssetInspector.tsx`；`packages/data-access/src/gate-stage-qualification.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ADMIN_L0、E_ADMIN_L1、E_ADMIN_L2、E_ADMIN_L3、E_ADMIN_L4、E_ADMIN_L5
- **下一内部交接**：LINK_ADMIN_02，接收端要求：asset@rev/rights/use_events；状态：NOT_VERIFIED。

**3. 审计13类资产依赖**（operator）

- **输入 → 动作 → 输出**：asset@rev/rights/use_events → 核来源、权限和受影响对象 → 治理依据
- **权限及失败边界**：工作资产状态不能冒充正式G
- **当前代码定位**：`apps/web/app/admin/KnowledgeAssetInspector.tsx`；`packages/data-access/src/studio-asset-repository.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ASSETS_TO_ADMIN
- **下一内部交接**：LINK_ADMIN_03，接收端要求：Creator submitted revision；状态：NOT_VERIFIED。

**4. 读取投稿冻结修订**（operator）

- **输入 → 动作 → 输出**：Creator submitted revision → 读取待审稿和依赖 → 指定稿件及缺口
- **权限及失败边界**：不能自动换成latest
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/api/governance/gates/pending/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REV_TO_EDITORIAL
- **下一内部交接**：LINK_ADMIN_04，接收端要求：各自授权与申请；状态：NOT_VERIFIED。

**5. 运营审核与独立Reviewer分权**（operator/reviewer）

- **输入 → 动作 → 输出**：各自授权与申请 → 分别形成决定和资格 → 运营/专业两类回执
- **权限及失败边界**：Admin/Agent不能代签G
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/api/governance/gates/decisions/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ADMIN_TO_EDITORIAL
- **下一内部交接**：LINK_ADMIN_05，接收端要求：G5/运营决定/rights；状态：NOT_VERIFIED。

**6. 发布前汇总资格与媒资许可**（operator）

- **输入 → 动作 → 输出**：G5/运营决定/rights → 核准或HOLD → 准确可发布条件
- **权限及失败边界**：运营批准不代G5
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/api/works/[id]/publish/route.ts`；`packages/data-access/src/rights-actions.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_EDITORIAL_TO_PUBLISH
- **下一内部交接**：LINK_ADMIN_06，接收端要求：失效请求及具体对象；状态：NOT_VERIFIED。

**7. 授权撤权和依赖重核**（operator）

- **输入 → 动作 → 输出**：失效请求及具体对象 → 触发撤权与受影响消费检查 → 撤权回执与范围
- **权限及失败边界**：已交付离线字节不能假称回收
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`packages/data-access/src/invalidation.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ADMIN_TO_REVOKE
- **下一内部交接**：LINK_ADMIN_07，接收端要求：审计结果、版本和HOLD；状态：NOT_VERIFIED。

**8. 返回退回原因与责任人**（operator）

- **输入 → 动作 → 输出**：审计结果、版本和HOLD → 反馈需要补证的行动 → 可回查下一步
- **权限及失败边界**：不能只给PASS计数
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/admin/KnowledgeAssetInspector.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_ADMIN_TO_EDITORIAL

#### 发布→WATCH合法消费→撤权（8个步骤，7条待核交接）

**1. 接收Creator冻结投稿修订**（operator）

- **输入 → 动作 → 输出**：WorkRevision@rev及提交记录 → 锁定待发布对象 → submitted修订
- **权限及失败边界**：不能偷换成编辑中的稿
- **当前代码定位**：`apps/web/app/api/works/[id]/submit/route.ts`；`apps/web/app/admin/AdminWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REV_TO_EDITORIAL
- **下一内部交接**：LINK_PUBLISH_01，接收端要求：专业签发与编辑决定；状态：NOT_VERIFIED。

**2. 独立资格和运营审核分离**（reviewer/operator）

- **输入 → 动作 → 输出**：专业签发与编辑决定 → 验证两种不同决定 → 各自审计状态
- **权限及失败边界**：运营approved不等于G5
- **当前代码定位**：`apps/web/app/admin/AdminWorkbench.tsx`；`apps/web/app/api/governance/gates/decisions/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_EDITORIAL_TO_PUBLISH
- **下一内部交接**：LINK_PUBLISH_02，接收端要求：revision/consumer/display权限；状态：NOT_VERIFIED。

**3. 核G5和媒资逐动作权利**（system）

- **输入 → 动作 → 输出**：revision/consumer/display权限 → 合法发布前核对 → 可发布或HOLD
- **权限及失败边界**：旧资格和无权图像不能过关
- **当前代码定位**：`packages/data-access/src/gate-stage-qualification.mjs`；`packages/data-access/src/rights-actions.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_EDITORIAL_TO_PUBLISH
- **下一内部交接**：LINK_PUBLISH_03，接收端要求：所有资格齐备的准确稿；状态：NOT_VERIFIED。

**4. 原子发布准确修订指针**（operator/system）

- **输入 → 动作 → 输出**：所有资格齐备的准确稿 → 提交发布事务 → PublicationPointer和审计
- **权限及失败边界**：不能产生一半成功的指针
- **当前代码定位**：`apps/web/app/api/works/[id]/publish/route.ts`；`apps/web/app/admin/AdminWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_EDITORIAL_TO_PUBLISH
- **下一内部交接**：LINK_PUBLISH_04，接收端要求：发布指针与当前资格；状态：NOT_VERIFIED。

**5. WATCH显示合法公开目录**（public）

- **输入 → 动作 → 输出**：发布指针与当前资格 → 只读取可消费作品 → 列表及明确空态
- **权限及失败边界**：撤权作品不能进入新请求
- **当前代码定位**：`apps/web/app/api/works/published/route.ts`；`apps/web/app/watch/WatchGallery.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_PUBLISH_TO_WATCH
- **下一内部交接**：LINK_PUBLISH_05，接收端要求：WorkRevision/媒体id/用途；状态：NOT_VERIFIED。

**6. 作品章节和媒体每请求重核**（public）

- **输入 → 动作 → 输出**：WorkRevision/媒体id/用途 → 核新请求资格和权利 → 合法章节及真实素材
- **权限及失败边界**：旧URL不能绕撤权
- **当前代码定位**：`apps/web/app/watch/WatchGallery.tsx`；`packages/data-access/src/gate-stage-qualification.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_PUBLISH_TO_WATCH
- **下一内部交接**：LINK_PUBLISH_06，接收端要求：已发布作品与时码；状态：NOT_VERIFIED。

**7. 播放章节与来源返查**（public）

- **输入 → 动作 → 输出**：已发布作品与时码 → 观看、暂停、按需证据 → 同一rev的有据观看
- **权限及失败边界**：私有草稿不得补成正式事实
- **当前代码定位**：`apps/web/app/watch/WatchGallery.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_PUBLISH_TO_WATCH
- **下一内部交接**：LINK_PUBLISH_07，接收端要求：revocation和依赖；状态：NOT_VERIFIED。

**8. 撤权立即阻断后续消费**（operator/system）

- **输入 → 动作 → 输出**：revocation和依赖 → 失效资格/指针并拒绝新请求 → HOLD/原因/回溯记录
- **权限及失败边界**：不得谎称收回已下载字节
- **当前代码定位**：`apps/web/app/watch/WatchGallery.tsx`；`packages/data-access/src/invalidation.mjs`；`packages/data-access/src/rights-actions.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REVOKE_TO_WATCH

#### EXP现有能力与未来深链（5个步骤，4条待核交接）

**1. 进入独立EXP页面**（public）

- **输入 → 动作 → 输出**：合法入口URL → 展示现有探索页 → 有权的基础UI
- **权限及失败边界**：完整EXP不计当期M5
- **当前代码定位**：`apps/web/app/explore/ExploreWorkbench.tsx`；`apps/web/app/page.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_EXP
- **下一内部交接**：LINK_EXP_01，接收端要求：consumer/purpose/当前资格；状态：NOT_VERIFIED。

**2. 仅读取合格公开L5**（public）

- **输入 → 动作 → 输出**：consumer/purpose/当前资格 → 取得合法关系/时间/空间知识 → 合格L5片段或空态
- **权限及失败边界**：私有Studio未G候选不得公开
- **当前代码定位**：`apps/web/app/explore/ExploreWorkbench.tsx`；`packages/data-access/src/read-model-repository.mjs`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_EXP
- **下一内部交接**：LINK_EXP_02，接收端要求：问题/session_id；状态：NOT_VERIFIED。

**3. 用户提问触发Agent会话**（public）

- **输入 → 动作 → 输出**：问题/session_id → 调用受权探索query → AgentDecision或缺口
- **权限及失败边界**：有问答不等于连续舞台联动
- **当前代码定位**：`apps/web/app/explore/ExploreWorkbench.tsx`；`apps/web/app/api/explore/sessions/route.ts`；`apps/web/app/api/explore/sessions/[id]/query/route.ts`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_EXP
- **下一内部交接**：LINK_EXP_03，接收端要求：真实材料与视图选择；状态：NOT_VERIFIED。

**4. 四种视图和叙事证据呈现**（public）

- **输入 → 动作 → 输出**：真实材料与视图选择 → 关系/时间/空间/故事显示 → 现有舞台/证据组件
- **权限及失败边界**：静态SVG及固定HINT非主动发现
- **当前代码定位**：`apps/web/app/explore/ExploreWorkbench.tsx`；`apps/web/app/explore/ExplorePresentation.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_REUSE_TO_EXP
- **下一内部交接**：LINK_EXP_04，接收端要求：作品rev/OriginSnapshot/焦点；状态：NOT_VERIFIED。

**5. WATCH转EXP并有权返回**（public）

- **输入 → 动作 → 输出**：作品rev/OriginSnapshot/焦点 → 未来用户接受后才跳转 → 待实现的独立探索与回跳
- **权限及失败边界**：现有WATCH相关探索禁用
- **当前代码定位**：`apps/web/app/watch/WatchGallery.tsx`；`apps/web/app/explore/ExploreWorkbench.tsx`；这是路径定位而非接口验收。
- **原主图交接锚点**：E_WORKREV_TO_EXP

### 正式工程核查次序与纪律

1. 按CURRENT/PLAN §3.5 B/C先找最前实证阻断；当前顺序仍是独立G0精确stage_binding审核与资格，以及其后的合格G1/L1→D02 typed请求。
2. 找到对应根图业务边，再在本页10组内部检查链定位真实输入、下游期待输出、当前角色/权利、源码与失败回执；**先根图定位，后内部下钻**。
3. 逐连接核代码、真实HTTP/PG/Provider/Gate、同Root正反与恢复。若能证明真实状态变更，再更新原根图nodes[]/edges[].verification_layers；内部链填相同证据引用与准确结果，不凭源码文件存在把内部链标PASS。
4. 每次工程事实变化时同步JSON/MD/HTML，并使HTML嵌入的JSON与独立JSON语义完全一致；统计仍由37/54原图生成。真实状态由CURRENT、回执由progress维护，导航不是第二工程Truth。
5. EXP内部链即使已有UI与Agent代码，也属于**FUTURE_NOT_M5**，不计入本轮M5通过条件；CEI未来完成正式交付后才做设计增量映射。

**机器入口**：JSON中的module_internal_chains.modules[].steps[]/handoffs[]。本轮结构来源为GitHub main@787a5944a02006cdfa970270fc5664e3eb47f75b；原主图source_sha维持2026-11-15固定审查基线。**结构分解完成 ≠ 58个内部交接已验证**。

## 正式三层状态模型（2026-11-15）

**三个独立符号**：`◆能力 capability`核实功能代码、持久数据和专业方法是否具备；`⇄连接 handoff`核实上下游真实输入输出、身份、用途、权限、精确版本与独立Gate资格能否合法衔接；`●运行 runtime`核实同一真实Root Task的正反、持久、恢复及消费证据。任何一层通过都不能推导另一层通过。

**五状态**：`PASS 绿色`=有该层有效完整证据；`PARTIAL 蓝色`=有明确局部实现、尚未完整验证；`HOLD 橙色`=有可定位的明确阻断或合法条件不满足；`NOT_VERIFIED 灰色`=证据不足，既不算成功也不判缺代码；`FUTURE 紫色`=未来预留，非当前M5缺口。注意**状态和断点根因不同**：根因沿用既有 `engineering_diagnosis`。

**唯一机器状态入口**：每个 `nodes[]`、`edges[]` 的 `verification_layers.capability / handoff / runtime`，每层含 `status、reason、evidence_refs[]、verified_source_sha、observed_on`。先阅读顶层 `layer_status_model`。旧 `status` 仅保留历史兼容，不用于判断能力或施工完成率。三份导航的内容来自同一JSON；后续按证据原位同步更新，绝不能自动填PASS。

**当前有界证据**：此前7条连接有定向源码归因，其中G0签发/资格2条、D01→D02适配1条、D00通用业务范围1条均为◆PARTIAL/⇄HOLD/●NOT_VERIFIED；另3条局部代码路径为◆PARTIAL/⇄PARTIAL/●NOT_VERIFIED。其余45条当前范围连接三层均NOT_VERIFIED，另2条EXP预留为FUTURE。此前确认30个源码定位路径存在不能替代45条逐边核查。**本次没有任何运行PASS。**

| 连接例子 | ◆能力 | ⇄连接 | ●运行 | 下一步 |
|---|---|---|---|---|
| G0→L0当前资格 | PARTIAL | HOLD：签发回执缺精确stage_binding | NOT_VERIFIED | 修复独立签发合同，真实同Root正反实证 |
| 合格L1→D02 | PARTIAL | HOLD：缺D02 typed请求转换 | NOT_VERIFIED | 复用两端已有代码补受控交接 |
| D01→L1候选 | PARTIAL | PARTIAL：局部实现 | NOT_VERIFIED | 继承局部CI/隔离测试再做真实Root |
| 未逐接口核查 | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED | 按实际施工节点定向核查 |
| EXP未来边 | FUTURE | FUTURE | FUTURE | 不计M5，后续批准后激活 |

**交互导航**：顶部“总体/◆能力/⇄连接/●运行”切换；主图各节点显示三枚独立彩色状态符号；54条边的搜索台账按选择层和五状态筛选。点击节点或连接，查看各层原因/精确源码/证据/下一动作。颜色计数不能冒充工程完成率。

**持续施工**：最新main/CI → CURRENT → PLAN §3.5 B/C唯一八维 → JSON三层状态/根因 → 定位最前业务HOLD → 只修能力或连接或补实证 → 精确SHA/环境/Root/POS-NEG与恢复证据入progress → 更新CURRENT及同提交三份导航。三层只负责定位，**不新增验收体系**。

## 本轮已核的断点类型（持续更新，不是完成率）

当前54条连接中，2条确认签发/资格接口不匹配、1条确认受控跨阶段转换缺失、1条确认通用业务范围缺口、3条已有局部实现但缺同Root实证、45条**只定位到关联源码但尚未逐接口归因**、2条未来预留。**这些分类不是工程完成率，更不是缺代码比率。**30条唯一边级源码定位文件均能在本次固定SHA找到，但文件存在不等于边能运行。

| 当前先核边 | 分类 | 证据与下一工作 |
|---|---|---|
| `E_D00_REVIEW` / `E_D00_QUALIFY` | 签发与消费合同不匹配 | `rule-gate-reviewer.mjs` 的签发receipt缺 `stage_binding`；读取器 `auditHasExactStageBinding` 要求stage/job/reviewer/input/output同源。不能用旧G0局部PASS冒充。 |
| `E_L1_TO_D02` | 缺中间受控转换 | D01 reading candidate存在，D02 H05持久化路径存在，但需从独立签G1的L1读取候选形成D02 typed request；Runner现正确HOLD。 |
| `E01` | 通用D00范围缺口 | 已有私有原件路径不等于自然语言选题到所有合法外部来源的发现、取得、权利及G0全部贯通。 |
| `E_D00_WRITE` / `E_L0_TO_D01` / `E_D01_WRITE` | 有局部实现但缺同Root实证 | 沿用已成功的CI/隔离PG/HTTP回执，但须同一真实Root、原件、Reviewer、资格正反及持久恢复实跑。 |

**后续全面核查，不等于每次全仓扫描。** 先冻结本图M5相关节点/边的覆盖范围，按真实Root逐批核主干相邻连接及必需支管；每批留存“有代码/无代码/接口不匹配/环境或权限未就绪/实证通过”的具体理由、精确SHA与POS/NEG证据；最后审计所有M5相关边是否都有核查结论。EXP两条未来边不纳入M5通过分母；M5准出仍由PLAN八维决定。

## 一、M5主链与横向能力

```mermaid
flowchart TB
    STUDIO[Studio自然语言任务] --> PLAN[Agent研究规划 / Creator合法生产申请] --> D00
    PLAN -. 同Root受控委托 .-> MIX[内外AI协作 / Provider与Receipt]
    MIX -. 有权时参与专业生产 .-> D00
    subgraph DLGS[六阶段：生产/候选入库/独立审核/同层合格]
      direction TB
      D00[D00来源] --> L0[(L0候选)] --> G0{G0独立审核} --> Q0[L0当前合格]
      Q0 --> D01[D01识读] --> L1[(L1候选)] --> G1{G1独立审核} --> Q1[L1当前合格]
      Q1 --> D02[D02证据] --> L2[(L2候选)] --> G2{G2独立审核} --> Q2[L2当前合格]
      Q2 --> D03[D03事实与关系] --> L3[(L3候选)] --> G3{G3独立审核} --> Q3[L3当前合格]
      Q3 --> D04[D04人文发现] --> L4[(L4候选)] --> G4{G4独立审核} --> Q4[L4当前合格]
      Q4 --> D05[D05知识投影] --> L5[(L5候选)] --> G5{G5独立审核} --> Q5[L5当前合格]
    end
    Q0 & Q1 & Q2 & Q3 & Q4 & Q5 --> USE[按来源/权利/用途/精确revision/资格读]
    USE --> WORK[Studio H1/H2/H3 + 19组件]
    MIX -. 按权限提供研究贡献 .-> WORK
    USE -. 合法引用 .-> ASSETS[13类工作知识资产]
    WORK <--> ASSETS
    WORK --> REV[不可变 WorkRevision] --> EDIT[Admin作品审核] --> PUB[独立G5与媒资权利/发布] --> WATCH[WATCH逐请求合格消费]
    ADMIN[Admin横向治理] -. L0-L5知识条目 .-> ASSETS
    ADMIN -. 运营管理 .-> EDIT
    ADMIN -. 撤权/纠错 .-> REVOKE[撤权/失效] -. 新请求阻断 .-> WATCH
    USE -. 未来预留 .-> EXP[EXP探索]
```

> 线条表达职责与可消费关系，不把每条关系视为代码已贯通。候选与合格是同层不同资格状态；失效保留历史；Admin不替代G0—G5。

## 二、阶段真实工程定位（精确SHA的部分代码事实，非整链PASS）

| 阶段 | 本次导航状态 | 实际已知阻断 |
|---|---|---|
| D00 / L0 / G0 | partial | Studio 当前仍要求已登记私有原件；独立Reviewer精确签发尚未由同一真实Run验证 |
| D01 / L1 / G1 | partial | G1精确审签与D01→D02专业请求生成未连通 |
| D02 / L2 / G2 | blocked | PRIVATE_NEXT_STAGE_REQUEST_NOT_READY；需要从合格L1组织真实观察输入 |
| D03 / L3 / G3 | blocked | 缺以合格L2证据生成D03类型请求及独立G3整链实证 |
| D04 / L4 / G4 | blocked | 缺合格L3事实到人文解释的类型化与专业审签交接 |
| D05 / L5 / G5 | blocked | L4→D05专业转换、精确G5和多消费者资格未接通 |

**最前断点：** 独立G0审签须有精确stage_binding与同源输出digest的合法Reviewer证据；紧接着是已签G1读取单元→D02 H05专业观察typed请求生成。已有D00→D01代码和D02确定性HOLD不能算同一真实作品的PG/HTTP/Provider全链PASS。

**证据等级说明：** 核对了原导航引用的26条唯一代码路径均在固定源码SHA下存在，并针对Runner、Worker、Gate与Studio及13类资产/19组件合同回读关键片段；但未完成全仓每个调用者/运行路径与每条边的独立实跑。边的 `source_paths` 是**待核实的源码入口**，不是“接口已经接通”的证书。任何运行条件未实证记NOT_RUN/HOLD。

## 三、M5唯一八维验收与节点/连接索引

- **1. 自然语言创作入口**：Studio真实问题→Brief/Plan，资料可得性与可继续状态。关联节点 `AGENT_PLAN`，关联连接 2 条；导航不判定PASS。
- **2. 内外AI混合协作**：同root下Agent/外部Provider真实贡献、权利、预算、Receipt与恢复。关联节点 `AGENT_PLAN、MIXED_COLLABORATION`，关联连接 3 条；导航不判定PASS。
- **3. 真实来源、证据和D/L/G生产**：合法原件→D00-D05/L0-L5/G0-G5精确资格与整链消费。关联节点 `QUALIFIED_CONSUMPTION`，关联连接 32 条；导航不判定PASS。
- **4. 13类知识资产沉淀**：13类型级正反合同，真实作品只产生实际适用类型。关联节点 `QUALIFIED_CONSUMPTION、KNOWLEDGE_ASSETS`，关联连接 4 条；导航不判定PASS。
- **5. Studio真实创作**：H1/H2/H3与19组件真实职责、预览编辑、WorkRevision。关联节点 `QUALIFIED_CONSUMPTION、STUDIO_CREATIVE`，关联连接 12 条；导航不判定PASS。
- **6. Admin知识资产管理**：逐条精确修订、来源权利资格与使用史、撤回管理。关联节点 `ADMIN、KNOWLEDGE_ASSETS`，关联连接 9 条；导航不判定PASS。
- **7. 独立G5、媒资权利与发布**：Reviewer分权、WorkRevision及媒体逐动作许可、原子指针。关联节点 `PUBLISH`，关联连接 3 条；导航不判定PASS。
- **8. WATCH同修订合法消费与撤权**：每次资格检查、立即阻断新请求、缓存及原件保护。关联节点 `WATCH、REVOKE`，关联连接 3 条；导航不判定PASS。

13类 `asset_kind`（来自正式资产合同）：`research_brief / source_anchor / reading_note / evidence_note / spacetime_candidate / relation_hypothesis / humanistic_insight / research_collection / director_plan / media_selection / work_revision / citation_snapshot / consented_feedback`。这13类并非13个新数据库，且真实作品不应为凑数制造不适用的资产；类型合同与业务正反测试仍是不同责任。

## 四、机器接续与持续维护纪律

1. **必读入口：** 核实最新main与CI → 读 `CURRENT.md` → 读 `tasks/implementation/MAB/PLAN.md` §3.5 B/C → 读本目录JSON的 `navigation_policy`、`acceptance_dimensions`、`nodes[]`、`edges[]` → 必要时看本MD及交互HTML。
2. **实际核查：** 从同一真实Creator/Project/Root Task选最前HOLD连接，核上游真实输出、下游typed输入、准确代码、持久revision、当前Gate审签与权利/用途、负例、恢复与同Root证据。已验证未变化直接继承，不重复全仓盘点；证据不足标 `NOT_RUN/HOLD`。
3. **原位更新：** 工程实况变化时对受影响节点/连接定向复核；JSON记录事实与证据等级，MD解释，HTML展示。三份同一提交同步且HTML内嵌JSON与独立JSON完全一致。更新 `CURRENT.md`（当前事实），`progress.md`（实际证据）；不在导航里创设新标准。
4. **准出判断：** 只用 `PLAN.md` §3.5 B八维同一真实作品正反验收；WATCH属于M5当前目标，EXP未来预留。生产部署仍需独立授权。

**直接机器入口：** `tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json`；可视化入口：`tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.html`。本导航在阶段性收口后继续服务M5施工及随后合法扩展，不能因收口而停更。
