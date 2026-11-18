# 墨痕 M5｜工程执行接续入口（平台无关）

> 本文件只承担ChatGPT、Codex Cloud等执行载体之间的接续与环境交接，不另立施工计划或重复维护工程状态。GitHub main是唯一代码事实基线；同一时点只允许一个执行方写入main。

## 1. 接续时必读文件

1. AGENTS.md：仓库级AI必读顺序、权威路由和执行纪律。
2. tasks/implementation/MAB/PLAN.md：唯一施工计划；按§0、§0.2、§0.3、§3.5 B/C/D和§6执行。
3. CURRENT.md：当前真实工程事实、同一任务、最前阻断与下一动作。
4. tasks/implementation/MAB/progress.md：末尾最新批次和本次断点相关历史证据。
5. 本文件只在平台/环境切换或需要专用宿主交接时使用。相关MHKA和专业合同按当前断点定向读取。

tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json及同目录MD/HTML已由Owner裁决停用；不再读取、维护或同步。

## 2. 当前接续任务（唯一入口）

直接执行PLAN §3.5 D第7项，不重新盘点仓库、不重做D00—D05设计、不从机器身份配置重新开始。

**同一真实任务：**
- Project：e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5
- Root/研究任务：53ad1a29-22e5-43c2-816d-b02b6e85abbd
- 当前状态：hold / research_prerequisites
- 已结算模型成本：1；checkpoint未保存结构化模型输出，工具Receipt仅有invocation_id。不得盲目重放已结算模型步骤。

**下一动作顺序：**
1. 零费用定位正式项目知识读取失败的底层原因，保留Owner/Project/用途/当前Gate权限边界。
2. 核实旧任务是否存在可验证的模型输出；当前证据显示没有。不可恢复时保留原任务及成本，不自动付费重试。
3. 修复项目范围来源缺口路由；跨Project共享仍为NOT_VERIFIED，不能把它强改为完整。
4. 接通外部候选与合法原件获取、私有存储、SHA及Source/Version/Raw登记，再进入现有D00 Worker。
5. 真实Policy/Reviewer/Cloud Executor条件具备后，同一Project/Root验证D00/G0→D01/G1→D02。

所有具体根因、数据库数量、CI状态和当前证据以CURRENT为准；任务顺序与准出以PLAN为准。

## 3. 不得重复的已完成准备

- Producer/Worker既有LOGIN角色密码已由Owner初始化；不得再次要求重置或索取密码。
- Vercel四项Producer/Worker Preview变量此前已核实存在；不得仅凭变量存在声称真实TLS通过。
- 正式知识窄读函数及受限EXECUTE授权已存在；不得重做迁移或授予正式表裸SELECT。
- 现有唯一Runner、Registry、D00—D05、私有原件上传路径、Owner事务和独立Gate实现优先继承；只修真实缺失的相邻交接。
- 不新建样板Project/Root，不重放未知或已结算费用，不以单元测试、历史隔离PASS或Vercel READY宣称M5闭环。

## 4. 执行边界与交接协议

- 唯一仓库：xiezuojie03-web/mohen-agent-2.0；唯一写入分支：main。禁止施工分支、PR、force-push、并发写main。
- 每批先核最新HEAD、受影响文件blob SHA、最新相关CI和生产自动部署隔离；不得覆盖并发成果。
- 不读取、输出、提交密码/Token/私有原件；不使用高权DATABASE_URL替代专用身份；Producer不得签发独立Gate。
- 不改Production、不关闭Preview/部署保护、不启动未经授权的付费Provider、不伪造Owner/Project/Root/Reviewer/Gate记录。
- 每批追加progress；运行事实变化更新CURRENT；任务/顺序/验收标准变化更新PLAN；通用执行规则变化更新AGENTS。本文件仅在平台/环境交接变化时更新。
- 同一事件影响多份必读文件时，尽量同一main提交同步并回读；无法同步时在progress标记SYNC_PENDING。
- 不维护已停用的交互导航JSON/MD/HTML。

## 5. 停止与切换协议

- 停工前，代码改动必须安全提交main并完成必要回读；如不能提交，明确记录未提交文件、精确工作区状态和恢复方法。
- 下一平台接手时重新核main HEAD和CI，不依赖上个会话摘要或平台内部状态。
- 最终报告：基线SHA → 实际任务 → 改动/提交 → 测试精确结果 → 真实运行证据 → HOLD/NOT_RUN → 下一最前动作。
- M5唯一准出仍为同一真实作品八维完整闭环；当前0/8 OVERALL_HOLD。
