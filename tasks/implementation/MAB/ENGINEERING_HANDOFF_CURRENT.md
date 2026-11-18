# 墨痕 M5｜工程执行接续入口（平台无关）

> **当前执行平台可在ChatGPT与Codex Cloud之间按额度切换，不是永久托管模式。** GitHub main是唯一代码事实基线；同一时点只允许一个执行方写入main。切换前后均以本文件、CURRENT.md、progress.md及PLAN.md为准。

## 1. 必读入口与权威层级

1. AGENTS.md：仓库级执行约束及 MHKA-00—05 权威路由。
2. tasks/implementation/MAB/PLAN.md：唯一施工计划和M5八维准出标准，重点§0、§0.2、§3.5 B/C/D。
3. CURRENT.md：当前真实工程事实与最前断点。
4. tasks/implementation/MAB/progress.md：历史追加式施工证据账；只读末尾最新批次及受影响历史，不从头扫描。
5. tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json：机器导航；必要时同步阅读同目录MD/HTML。导航不替代PLAN、运行证据或验收。
6. 本文件：平台交接和当前接续动作，不另立标准。

## 2. 不可改变的执行边界

- 唯一仓库：xiezuojie03-web/mohen-agent-2.0；唯一写入分支：main。禁止施工分支、PR、force-push、并发写main。
- 每批先核最新HEAD、受影响文件和CI；不得覆盖并发成果。
- 已实现且有效的Runner、Registry、D00—D05、L0—L5、G0—G5、Studio原件路径、Owner事务、Admin/WATCH代码直接继承；只修当前真实差异，不全仓重盘、不重复重建。
- 区分CODE_PRESENT、源码测试、隔离PG/HTTP、真实云端运行和Owner体验；Vercel READY不等于TLS、Gate或业务PASS。
- 不读取、输出、提交任何密码/Token/私有原件；不使用高权DATABASE_URL替代专用身份；Producer不得签发独立Gate。
- 不改Production、不关闭Preview/部署保护、不启动未经授权的付费Provider、不伪造Owner/Project/Root/Reviewer/Gate记录。
- 每批必须更新progress；运行事实变化更新CURRENT；导航语义/节点边状态变化时同步JSON/MD/HTML三件套。

## 3. 当前已完成与待验证

### A线：正式知识窄读桥

- 开发库迁移20261117172439 m5_scoped_formal_project_gate_read已实际应用。
- Studio通过原签名Owner会话和createAppTransaction调用studio.search_qualified_project_layers。
- 仅mohen_app_runtime获受限EXECUTE；正式知识表不向应用身份开放裸SELECT。
- anon/authenticated/service_role/Producer拒绝；无签名Owner调用返回42501。
- **不得重做。** 当前真实Project=0、当前资格=0、Policy=0、active Reviewer Binding=0；正向读取、错Owner、错用途、撤权待合法业务数据后验证。

### B线：机器身份与Vercel配置

- Supabase既有mohen_m5_producer_login和mohen_m5_worker_login密码均已由Owner通过Dashboard安全初始化；只读确认密码已设置且BYPASSRLS=false。**不得再次要求Owner重置密码。**
- Vercel以下四项变量均已核实存在，范围仅Preview、类型Sensitive/Secret；值均未读取：
  - MOHEN_PRODUCER_DATABASE_URL
  - MOHEN_PRODUCER_DATABASE_PASSWORD
  - MOHEN_PRIVATE_WORKER_DATABASE_URL
  - MOHEN_PRIVATE_WORKER_DATABASE_PASSWORD
- 精确 `ddc54a53` 已有 READY 的受保护 Preview `dpl_BC4Tnp6xv8HSUwmb5Hd83FJYffnV`，含 readiness 四项布尔诊断；匿名实测 302 至 SSO。复用此部署，当前缺有效应用内 Operator 会话及同部署布尔回执。详见 CURRENT 和 M5-CLOUD-PREVIEW-03。
- Producer/Worker真实TLS、实际数据库身份、低权限正反、Secret不透传均未验证。变量存在与密码已激活不能代替连接成功。

## 4. Codex Cloud或ChatGPT均可直接执行的下一批（无需Owner参与）

- 已修复 Executor 认领前的拆分密码解析及专用池对合规 TLS 参数的处理。GitHub 托管 runner 恢复后复测精确 SHA，隔离证据单独留账。
- 在既有受保护 Preview 由合法 Operator 访问 `GET /api/admin/metrics`；只记录 `execution_readiness.machine_variable_presence`。如四项均为 true，再运行真实云端机器 TLS、身份、权限及 Secret 隔离验证。

### A 线同作品预备输入

- 候选作品使用「朱家角古桥如何联系水路与集镇空间？请区分地方志可证事实与解释，并指出证据不足处」。沿现有 Studio 创建项目、提出研究问题，绑定实际 Creator、Project、Root 和幂等键。ST-01 返回 Brief、知识路由及生产空值，依实际结果决定是否需 Creator 显式申请 ST-04。
- 候选来源为上海图书馆开放数据《上海地名志》`shnh/dmz`。11-13 隔离证据有 1259 字节和完整 SHA256，见 [原始回执](../../results/MAB/evidence/qr10-generalization-smoke/qr10-generalization-smoke-20261113.json)。当前先检索并查精确版本、用途、权限、逐动作权利与有效 Gate；命中合格结果即复用。已有原件但缺 G0 时仅补准入；仅在合法范围检索确认缺来源时进入 D00。历史对象 ID 只用于回查。当前开发库按历史完整 SHA256 和字节数回查，朱家角、七宝在私有原件表与来源 raw 表均为零匹配；这一结果仅覆盖对应字节版本。
- 11-08 权利裁决及冻结回执覆盖该平台的数据内部查阅、机器读、留存和引用。当前版本须复核权利证据；展示、下载、改编、再分发及外部模型处理保持 HOLD，需对应明确许可。暂用来源定位及哈希作为候选输入，不复制正文。七宝仍保留作 QR-10 独立题材。
- 真实验收次序：合法 Owner/Project/用途读取指定修订 → 错 Owner、错 Project、错用途和未签名分别拒绝 → 通过独立 Gate 撤权后同会话重查拒绝。每项附当前来源版本、用途、资格审签引用及脱敏回执。独立 Policy/Reviewer Binding 未就绪时保留真实签发和撤权为 NOT_RUN，继续可用的授权准备与隔离回归。

## 5. 停止与切换协议

- 每次停工前，代码改动必须已安全提交到main并完成必要回读；如受PLAN §0.2生产隔离条件限制而不能提交，必须明确记录未提交文件、精确工作区状态和恢复方法，不得说已入库。
- progress追加本批；CURRENT只更新最新事实；导航JSON/MD/HTML仅在节点/边/执行前沿改变时同步。
- 下一平台接手时重新核main HEAD和CI，不依赖上个会话摘要或平台内部状态。
- M5唯一准出仍为同一真实作品八维完整闭环，当前0/8 OVERALL_HOLD。
