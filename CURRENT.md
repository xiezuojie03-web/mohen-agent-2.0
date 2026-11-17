# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **2026-11-17 定向收口**。本页只保留最近可信事实与具名阻断，不承载旧批次“下一步”。所有旧批次原样归档至 [M5活跃文件旧口径留档](tasks/results/MAB/archive/M5_ACTIVE_DOCUMENTS_BEFORE_20261117_CONSISTENCY_CLEANUP.md)；精确提交、测试与失败回执仍在 [progress.md](tasks/implementation/MAB/progress.md)。**本站数字是带时点快照，必须复核最新main/CI/云库/部署；不得把此页视为运行PASS。**

## 1. 唯一业务目标、执行顺序及验收

以 [PLAN.md §3.5 B/C/D](tasks/implementation/MAB/PLAN.md) 为唯一执行和验收标准：一项真实Creator/Project/Root任务，从Studio自然语言问题→统一L0—L5可访问知识资产检索与当前资格/权利判断→按缺口选择D00—D05必要能力及独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin独立审核/运营发布→WATCH同修订消费和撤权。用户上传/指定原件是**可选输入**；有合格存量不重复获取和读取。对应定向事实与旧语义纠偏见[Studio主链审计 §7](tasks/results/MAB/M5_STUDIO_TO_ADMIN_CHAIN_AUDIT_20261117.md)。

## 2. 最近有据可核的云端事实（2026-11-17）

- **本批新进展**：M5-STUDIO-UNIFIED-KNOWLEDGE-ROUTING-01代码已推main（测试文件提交`344a763d`，API响应增量`adb1c0a6`）。新增项目内L0—L4候选＋已合格G5 L5的有界路由、缺口分类及Studio三个研究动作的Owner上下文接线；无需外部来源密钥即可尝试库内检索。**仍没有合法共享L0—L4的全局资格检索，空项目只能判`SOURCE_GAP_UNCONFIRMED`，不能自动调D00；业务同Root尚未实跑。**代码/文档回执见`progress.md#M5-STUDIO-UNIFIED-KNOWLEDGE-ROUTING-01`。
- **受控构建证据**：Vercel非生产staging部署`dpl_3kbNeBYWFK1WCMijUb6zoVKZQGN6` READY、精确代码`344a763d`，Next编译/类型检查/页面构建通过；不覆盖稍后的`adb1c0a6`。**GitHub 9组新增单测、PG/HTTP实测结果尚未得到可信回执**，NOT_VERIFIED，不报PASS。Production最新部署仍`dpl_JAsr7xw2UyMmqkdZ8uYMBjB4eYmc` SHA`83560224`。

- 最近审计记录的业务代码Preview `dpl_6cNbCqaHKGJWfdhqKkxFneKK3aYv` READY，精确代码SHA `2830f462`、SSO保护；`/studio`、`/admin` 页面GET 200，`/api/works/published` GET 200且为空列表。这只证明页面/空列表可访问，不证明真实创作、G5与发布。
- Owner本人已确认受保护Preview登录；执行方没有Owner浏览器Cookie，不得代Owner执行创建、上传和提交。
- `mohen-cloud`最近只读审计：`studio.projects=0`、`studio.private_originals=0`、`studio.asset_heads/revisions/links/use_events=0`；23条旧research_tasks的Studio Project绑定=0；20条旧production_runs的Project scope=0；旧publication修订和指针不可冒充新同Root作品。
- 既有私有桶、原件API/工作流、唯一Runner/Registry、专业D链、独立Gate模块、Studio/Admin/发布代码存在或有隔离验证，**须继承，不因云端数据为0重建**。
- Producer/Worker两低权LOGIN角色已安装，但最近检查口令均未激活；Preview缺有效Cloud Executor配置、正式私有上传功能开关/Storage服务密钥；当前启用Gate policy/active binding/service credential均为0。
- 当前只有同一用户持有Operator与Reviewer两角色，无法完成同一身份自审自发；`studio.work_revisions`不存在，现有作品修订写`publication.work_revisions`，canonical revision仍需定向收口。

## 3. 当前两种前沿（不能混淆）

1. **业务/代码最前缺口（已局部前移）**：`runResearch`现已组合当前Owner Project的L0—L4候选读取和G5合格L5读取，并产出有界`knowledge_route`：复用、缺当前资格、有L0未完成读取、受限/截断、范围未审、确证缺来源等分类。**仍缺合法共享全局L0—L4的当前权限/资格读取和来源缺口闭合证明；尚未把分流真正接入连续D00—D05的自动执行**。下一批优先补共享查询和真正缺口判断，不能按无项目材料即D00。
2. **真实云端生产前沿**：既有Producer/Worker凭据、Cloud Executor、独立Reviewer/Gate服务未完成有效运行配置；`E_D00_REVIEW`和`E_D00_QUALIFY`只代表“选择了新原件的D00→G0子路径”当前运行阻断，**不能再当作所有Studio研究的统一入口或首个代码任务**。同Root G0/G1→D02仍未实跑。

**M5整体：0/8，OVERALL_HOLD**（同一真实作品八维整链尚无准出证据；不是代码完成率）。

## 4. 必须同步维护

施工小批只以实际相邻接口与当前证据更新[progress.md](tasks/implementation/MAB/progress.md)和本页；导航JSON/MD/HTML现有D00/G0定位为**局部子路径**，如调整整体业务前沿，必须同一提交更新三件套，不得仅修改其中一份，也不得将尚未实测的边改为PASS。定向审计原始诊断为核查来源，不另定顺序。正式执行回到PLAN §3.5 B/C/D与[交接入口](tasks/implementation/MAB/ENGINEERING_HANDOFF_CURRENT.md)。
