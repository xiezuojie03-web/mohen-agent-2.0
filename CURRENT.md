# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **核验日期：2026-11-18。** 本快照依据main代码基线`ffad0e400f7094d43ca9eea0bca9489f479c2adb`、施工计划`PLAN.md`（八维口径修订提交`d74243db76fa541278ac2372681ed8b111e12f2c`）、最新进展记录`progress.md`的`M5-QUALITY-16-RECHECK`及`mohen-cloud`实际回读。此文件只记录当前事实与下一最前阻断，不替代PLAN。

## 1. 唯一业务目标

以PLAN §3.5 B/C/D为唯一准出标准：同一真实Creator/Project/Root任务，从Studio问题→L0—L5统一检索与当前资格/权利判断→按缺口选择必要D00—D05及独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin审核/发布→WATCH精确修订消费和撤权。已有合格资产可复用；用户上传原件是可选输入，不得重复获取或生产。

## 2. 当前已核事实

### 2.1 同一真实Studio任务

- 当前开发Project：`e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`。
- 朱家角研究任务：`53ad1a29-22e5-43c2-816d-b02b6e85abbd`；最新只读回查仍为`hold`，`work_id=null`，`budgetSpent=1`，`reserved=0`，缺项为`FORMAL_G0_G4_READ_NOT_AUTHORIZED_OR_UNAVAILABLE`，最后更新时间`2026-11-18T01:58:09Z`。
- `research_events`证明最初的`REAL_PROVIDER_UNAVAILABLE / AGENT_QUALIFICATION_CONTEXT_REQUIRED`已解除并续跑；一次`llm-understand`已结算，随后正式知识读取前置再次HOLD。不得重复调用已结算模型步骤。数据库层正式读取ACL/函数此前已修复，但同一Creator签名会话下的Studio应用层读取尚未复验通过。
- 最近一次Project范围回读：Asset Head 1；私有原件0、当前Project Source 0、Source Version 0、Raw Item 0。此数据未因本轮D00迁移安装而改变。

### 2.2 八维完成度报告

**整体仍为`0/8 OVERALL_HOLD`**。这只表示尚无同一真实作品八维整体验收，不代表没有工程进展，也不是代码完成率。按PLAN新增的五类证据分别报告：

| 维度 | 能力实现 | 调用集成 | 环境验证 | 同一任务证据 | Owner验收 |
|---|---|---|---|---|---|
| 1. Studio自然语言入口 | 已有 | 部分：研究与正式原件入口未统一 | 部分 | 无 | 无 |
| 2. 内外AI混合协作 | 已有相关能力 | 未证明同Root双主体贡献闭环 | 未证明 | 无 | 无 |
| 3. D/L/G知识生产 | 已有代码；D00基础表与Worker角色已安装 | 部分：来源登记/获取桥仍缺 | 部分：数据库授权已核，真实TLS未核 | 无 | 无 |
| 4. 13类知识资产 | 已有模型与部分能力 | 部分 | 未完成类型级全覆盖验收 | 无 | 无 |
| 5. Studio真实创作 | H1/H2/H3及组件代码已有 | 部分：缺真实研究驱动的完整WorkRevision | 未完成 | 无 | 无 |
| 6. Admin治理 | 已有相关接口与治理能力 | 部分 | 未完成同作品验证 | 无 | 无 |
| 7. G5与作品发布 | 已有部分审核/发布代码 | 未接通独立Reviewer与精确修订资格 | 未完成 | 无 | 无 |
| 8. WATCH与撤权 | 已有精确修订消费/撤权代码 | 未完成真实发布后闭环 | 未完成 | 无 | 无 |

### 2.3 本轮已修复的代码与标准

- **项目范围来源缺口路由**：提交`c7d48700a21ffe08100ce4a4c26293a37103e1f5`。现在`PROJECT_SOURCE_GAP_CONFIRMED`与全局`SOURCE_GAP_CONFIRMED`都能触发既有候选发现，但仍保留范围语义；跨Project共享范围继续为`NOT_VERIFIED`。已有正反回归断言，尚未获得CI执行PASS。
- **专用Worker角色接线**：`private-evidence-binding.mjs`已改用事务级`createPrivateWorkerScopedQueryPool`执行D00 ledger与Producer侧Gate候选查询；每条查询在事务内`SET LOCAL ROLE mohen_private_worker`。Owner私有原件读取仍走`mohen_app_runtime`。已增加提交/回滚单测，但尚未运行。
- **Y05来源身份边界**：已修复“提供方被误当作馆藏机构”的过度推断。只有`registration.original_locator.holding_institution`与馆方目录号/件号同时存在，holding才标known；顶层`holding_institution`不被采纳。证据路径与测试fixture已同步到`original_locator`，正反用例已增加，但CI尚未执行。当前登记投影返回完整`original_locator` JSONB；如果其中没有明确馆藏字段，就保持unknown。
- **角色迁移合同**：M3/M5迁移文件已对齐：Worker login可SET专用`mohen_private_worker`；角色本身NOLOGIN、无superuser/BYPASSRLS；不授予Gate签发或撤销能力。未激活机器Reviewer。
- **八维标准**：PLAN §3.5 B已定向修订。保持八维和同一真实作品最终准出；明确知识G5与作品发布审核边界；13类资产类型级验证、19组件逐项验证但不强迫单件作品全部使用；第5维增加人文认识增量、时间/空间/关系、当下生活连接、探索乐趣和视觉认识变化。

### 2.4 mohen-cloud开发数据库现状

**已成功安装以下七项既有迁移**（迁移历史版本与名称均已回读）：

| 数据库迁移版本 | 能力 |
|---|---|
| `20261118113540` | M3 Private Worker角色与Gate候选权限 |
| `20261118113649` | Gate Audits RLS |
| `20261118113658` | D00-C1来源需求/获取方法/获取尝试 |
| `20261118113706` | D00-C4资源目录/覆盖/候选核查/优先级 |
| `20261118113714` | D00-Y02登记定位信息 |
| `20261118113721` | D00-C5方法重新核验 |
| `20261118113729` | D00-Y04原始提供方追溯 |

- `mohen_private_worker`现已存在：NOLOGIN、非superuser、无BYPASSRLS。`mohen_m5_worker_login`为其MEMBER并具SET权。
- Worker角色可写D00需求/资源目录和Producer侧Gate候选、可读取Gate audit；无Gate签发/撤销函数权限。D00表RLS已启用。
- D00新表当前均为0条；全局旧`source.sources/source_versions/raw_items`为39/39/98，但当前Project范围Source/Version/Raw仍为0，私有原件仍为0。未制造测试业务记录。
- `mohen_gate_signer_m5_machine`不存在；这是有意保持的未激活状态，不得为方便迁移而提前创建/激活独立Reviewer。

### 2.5 尚未闭合的来源获取与登记主线

这是当前最前业务阻断，且已定位到具体代码边界：

1. 旧`/api/studio/materials/import`导入路径与`/api/studio/attachments`私有原件路径仍分离；两者尚未汇入同一来源准入输出合同。
2. `POST /api/studio/attachments`只接收项目、文件、幂等键与`rights_declared=true`，保存私有字节、SHA回读和Asset Revision，返回`rights_status=declared_unverified`；没有来源身份、逐动作权利、馆藏定位等元数据输入，也不写Source/Version/Raw。
3. `GET /api/studio/attachments?project_id=...`通过`createPrivateSourceRegistrationRepository.lookup`检查已有绑定；该Repository只读。数据库`studio.private_source_registration(uuid)`同样是只读投影，不是登记写入器。
4. `source-discovery-repository.mjs`只写D00来源需求、获取方法/尝试、目录、核查、覆盖、优先级及提供方追溯账；不写`source.sources/source_versions/raw_items`。Y05/Y07/Y08模块负责派生和校验，不负责写入；私有上传SHA回读也不证明外部取得或版权许可。
5. 因此缺少的是可信的**来源登记生产者/交接服务**：保留Owner上传与外部候选/合法获取各自不同的证据语义，再把合格输入统一绑定为Source→Version→Raw，并关联私有原件、SHA、字节数、Asset Revision、逐动作权利和取得账。未知权利保持HOLD。

外部候选不是原件、事实、权利许可或Gate资格。不得将上传回读冒充外部获取证明；权利未知时必须保持HOLD。

### 2.6 云端环境、CI与Preview

- Vercel Preview环境中Producer/Worker数据库URL与密码变量名存在，数据库CA和会话Secret变量存在；本轮未读取或解密任何Secret值。变量存在不等于真实TLS身份登录通过。
- 已为精确main提交`ffad0e400f7094d43ca9eea0bca9489f479c2adb`创建Vercel Preview部署：`dpl_9BzzYYqMCxuvLej2hzwBWDb9fSvC`，target=null，状态`READY`。构建日志确认Next build、Serverless functions和Deploying outputs完成；不证明单测或Worker TLS通过。仓库`vercel.json`的`git.deploymentEnabled=false`，Preview SSO保护开启；Production未修改。
- Vercel项目Node运行时为24.x，GitHub CI已从Node22对齐到Node24（提交`758270d`）。最新GitHub Actions run `44302569975`与`44302564923`均约3–4秒失败，Job的`steps=null`，没有可读runner/logs；失败发生在任何CI步骤前。新增路由、Worker、Y05单测均NOT_RUN，不能宣布PASS。

## 3. 当前唯一工程前沿

按PLAN §3.5 D推进，不重建D00—D05、Runner、Registry或Gate：

1. **先解除朱家角Studio任务的正式知识读取HOLD**：在同一Creator签名会话内验证应用层正式L0—L5读取；若SQL层已通过而应用层仍失败，沿签名上下文、应用事务与读取函数调用边界定位。不得重跑已结算的`llm-understand`，不得以高权限直连代替Owner应用身份。
2. **再判断是否触发D00来源发现**：只有正式读取返回完整、未降级的Project范围结果，且确认无可复用合格来源/原件后，才由既有路由触发D00；读取未授权、截断或不完整时继续HOLD。
3. **补可信Source/Version/Raw登记生产者**：把Owner上传与外部候选/合法取得汇入同一登记输出合同，保留两种输入的不同来源与权利证据；将登记、私有原件、SHA、Asset Revision和D00获取账做成可回读连续交接。
4. **并行完成Worker TLS与CI回归**：真实Worker TLS身份/SET正反验证；GitHub runner恢复后运行Y05、Worker、路由及相关回归。当前Preview已READY，CI仍在步骤执行前失败。
5. **同一Project/Root真实生产**：登记链完成后，连续跑D00/G0→D01/G1→D02持久回执，再按实际研究缺口推进后续D/L/G与作品，不重跑历史PASS。

## 4. 当前不可宣称事项

尚无当前Project私有原件、Source/Version/Raw登记；尚无本轮真实D00/G0运行、D01/G1、D02持久回执；尚无同一作品WorkRevision、Admin审核、独立G5发布、WATCH消费与撤权。不得把迁移安装、代码存在、Preview BUILDING或历史测试PASS解释为M5准出。

## 5. 文件读取与更新

施工标准只读PLAN相关章节；当前事实只读CURRENT；逐批证据追加progress；仅平台/环境切换时读取ENGINEERING_HANDOFF_CURRENT。交互导航JSON/MD/HTML已停用，不再维护或作为施工依据。