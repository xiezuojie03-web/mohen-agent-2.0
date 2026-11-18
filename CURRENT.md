# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **核验日期：2026-11-18。** 本快照依据main代码基线`758270d10cc66465b5c25ac1971b02b2e2923b0b`、施工计划`PLAN.md`（八维口径修订提交`d74243db76fa541278ac2372681ed8b111e12f2c`）、最新进展记录`progress.md`的`M5-QUALITY-16`及`mohen-cloud`实际回读。此文件只记录当前事实与下一最前阻断，不替代PLAN。

## 1. 唯一业务目标

以PLAN §3.5 B/C/D为唯一准出标准：同一真实Creator/Project/Root任务，从Studio问题→L0—L5统一检索与当前资格/权利判断→按缺口选择必要D00—D05及独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin审核/发布→WATCH精确修订消费和撤权。已有合格资产可复用；用户上传原件是可选输入，不得重复获取或生产。

## 2. 当前已核事实

### 2.1 同一真实Studio任务

- 当前开发Project：`e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`。
- 朱家角研究任务：`53ad1a29-22e5-43c2-816d-b02b6e85abbd`；最后一次数据库核验状态为`hold / research_prerequisites`，`work_id=null`，最后更新时间`2026-11-18T01:58:09Z`。
- 该任务曾结算一次`llm-understand`（成本1），随后`retrieve-local`确定性失败；历史Receipt仅有`invocation_id`，没有可恢复结构化模型输出。旧任务不得盲目重放已结算模型步骤。
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
- **Y05来源身份边界**：已修复“提供方被误当作馆藏机构”的过度推断。现在只有明确`holding_institution`与馆方目录号/件号同时存在，holding才标known；否则unknown。现有登记投影尚不提供`holding_institution`，因此当前不会伪造藏所信息。正反测试已增加，尚未由CI执行。
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

1. Studio旧`/api/studio/materials/import`导入路径与新`/api/studio/attachments`私有原件路径仍然分离。
2. 私有原件路径可以保存字节、SHA回读及Asset Revision，但本次受影响链路未发现Source/Version/Raw登记写入者。
3. `private_source_registration`是只读登记投影；`source-discovery.ts`只产生外部候选线索。
4. D00 Worker当前要求已存在的`original_id`和正式登记绑定，因此上游尚无连续的候选/上传→权利与取得核验→合法获取→私有字节→SHA→Source/Version/Raw登记→D00输入链。

外部候选不是原件、事实、权利许可或Gate资格。不得将上传回读冒充外部获取证明；权利未知时必须保持HOLD。

### 2.6 云端环境、CI与Preview

- Vercel Preview环境中Producer/Worker数据库URL与密码变量名存在，数据库CA和会话Secret变量存在；本轮未读取或解密任何Secret值。变量存在不等于真实TLS身份登录通过。
- 已为精确main提交`ce970f9c5ea4d50a193f8d0582ba42d83c4170c1`创建Vercel Preview部署：`dpl_6h39T1DCBZ7K3PFHV5fQxXf4idPw`，target=null，状态`READY`。这证明该提交的Next.js构建成功，不证明单测或Worker TLS通过。仓库`vercel.json`的`git.deploymentEnabled=false`，Preview SSO保护开启；本轮未修改Production。
- Vercel项目Node运行时为24.x，GitHub CI已从Node22对齐到Node24（提交`758270d`）。最新GitHub Actions run `44298746528`仍在步骤执行前失败，Job无runner、steps或logs；本轮新增路由、Worker、Y05单测尚未执行，不能宣布PASS。

## 3. 当前唯一工程前沿

按PLAN §3.5 D推进，不重建D00—D05、Runner、Registry或Gate：

1. **完成Preview构建核验**：确认当前main代码可构建；保持target为Preview，不触碰Production。
2. **完成真实Worker TLS与身份核验**：使用现有Preview专用Worker URL/密码/CA，验证登录身份、`mohen_private_worker` SET、正反权限及失败关闭；不要求Owner重置或提供密码。
3. **恢复代码回归验证**：CI runner恢复后运行本轮新增Worker角色单测、项目范围路由正反测试及受影响回归。
4. **统一Studio原件入口与来源登记生产者**：让Owner上传原件与外部候选获取最终汇入同一登记/资格路径；补齐Source/Version/Raw写入者和真实权利/取得账，形成D00可接受`original_id`。
5. **真实任务连续生产**：以同一Project/Root推进D00/G0→D01/G1→D02；随后依据真实研究缺口推进后续D/L/G与作品，不重跑历史PASS。

## 4. 当前不可宣称事项

尚无当前Project私有原件、Source/Version/Raw登记；尚无本轮真实D00/G0运行、D01/G1、D02持久回执；尚无同一作品WorkRevision、Admin审核、独立G5发布、WATCH消费与撤权。不得把迁移安装、代码存在、Preview BUILDING或历史测试PASS解释为M5准出。

## 5. 文件读取与更新

施工标准只读PLAN相关章节；当前事实只读CURRENT；逐批证据追加progress；仅平台/环境切换时读取ENGINEERING_HANDOFF_CURRENT。交互导航JSON/MD/HTML已停用，不再维护或作为施工依据。