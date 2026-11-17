# 墨痕｜当前工程事实与唯一前沿（非施工标准）

> **2026-11-17 定向收口**。本页只保留最近可信事实与具名阻断，不承载旧批次“下一步”。所有旧批次原样归档至 [M5活跃文件旧口径留档](tasks/results/MAB/archive/M5_ACTIVE_DOCUMENTS_BEFORE_20261117_CONSISTENCY_CLEANUP.md)；精确提交、测试与失败回执仍在 [progress.md](tasks/implementation/MAB/progress.md)。**本站数字是带时点快照，必须复核最新main/CI/云库/部署；不得把此页视为运行PASS。**

## 1. 唯一业务目标、执行顺序及验收

以 [PLAN.md §3.5 B/C/D](tasks/implementation/MAB/PLAN.md) 为唯一执行和验收标准：一项真实Creator/Project/Root任务，从Studio自然语言问题→统一L0—L5可访问知识资产检索与当前资格/权利判断→按缺口选择D00—D05必要能力及独立G0—G5→知识资产积累→H1/H2/H3作品修订→Admin独立审核/运营发布→WATCH同修订消费和撤权。用户上传/指定原件是**可选输入**；有合格存量不重复获取和读取。对应定向事实与旧语义纠偏见[Studio主链审计 §7](tasks/results/MAB/M5_STUDIO_TO_ADMIN_CHAIN_AUDIT_20261117.md)。

## 2. 最近有据可核的云端事实（2026-11-17，补入2026-11-18定向工程证据）

- **2026-11-18最新：M5-SECURE-MACHINE-READY-03（已推main、非生产构建通过）**：承接既有Studio L0—L4候选、正式G0—G4/G5读。正式G0—G4适配器现**必须经已有签名Owner会话及`createAppTransaction`受限应用角色，在同一事务核实ACTIVE Project归属后**才尝试当前独立Gate查询；不用通用DB身份冒充项目权限。不同L层查询单独降级，已经确证合格的G5/G3知识可复用，未可核实的缺口仍HOLD；超限扫描为PARTIAL。云端机器预检远程必须`sslmode=verify-full`，并彻底删除Runner缺专用Producer URL时回退到通用`DATABASE_URL`的风险。GitHub精确代码`b6c4c45c12507a47bb73dea4b1c0c44a9d90e6a3`在受保护**非生产staging** `dpl_EhZKtPbJ7o3RupsxqFv6gRA4GAzt`状态**READY**，编译/类型检查通过；当前源码纯路由隔离V8 **8/8 PASS**，**GitHub完整Node测试未取得执行回执，NOT_VERIFIED**。Producer/Worker角色密码依然NULL、Preview敏感连接变量仍为无效占位；Cloud Executor/独立Gate/Storage尚无必备凭据，现行Gate资格0、启用Policy0、active Reviewer绑定0，真实Owner Project/Root仍未运行；M5仍0/8。Production仍旧SHA`83560224`，无本批发布。


- **2026-11-18 A线新增（M5-STUDIO-UNIFIED-KNOWLEDGE-ROUTING-02）**：新增`apps/web/lib/mohen-agent/retrieve-formal.ts`，复用既有`control.qualification_current`/`gate_audits`/资格函数读取限定当前Project的G0—G4正式知识；在Studio `runResearch`联入原Project候选/G5读模型，路由能区分当前G0/G1合格上游和G2—G4合格知识，避免重跑D00。已有受保护非生产staging `dpl_CeeUpSCcEuULZ2BxRcs7dyp9MYTN` 对代码SHA `b4bbd1cc82447ccf2efeb61f8540967aed55fc60` 构建READY、编译/类型检查通过。新增正反测试共14项，**GitHub真实测试回执尚未取得，NOT_VERIFIED**。当前云库`qualification_current=0`，旧711条gate_audits不等于现行资格。正式查询使用当前postgres测试身份被资格函数EXECUTE权限拒绝；`mohen_app_runtime`虽然有函数EXECUTE但缺正式知识表SELECT，**真实授权读取及同Owner Project测试仍HOLD**。仅SQL结构只读验证通过（以false替代授权谓词），不是资格PASS。
- **2026-11-18 B线（CLOUD-IDENTITY-PREP-01）**：Producer/Worker角色存在、LOGIN许可且不绕过RLS，但角色密码仍NULL，**未激活**；当前执行通道阻止安全执行密码设置。Vercel两项仅Preview敏感连接变量已复位为不可登录占位，Production变量/服务未改；Cloud Executor及独立Gate策略、绑定、凭据均未启用。需要具备安全凭据写入的独立授权管理通道后，再做实际TLS、允许/越权正反测试，不得伪造连接。


- **本批新进展**：M5-STUDIO-UNIFIED-KNOWLEDGE-ROUTING-01代码已推main（测试文件提交`344a763d`，API响应增量`adb1c0a6`）。新增项目内L0—L4候选＋已合格G5 L5的有界路由、缺口分类及Studio三个研究动作的Owner上下文接线；无需外部来源密钥即可尝试库内检索。**仍没有合法共享L0—L4的全局资格检索，空项目只能判`SOURCE_GAP_UNCONFIRMED`，不能自动调D00；业务同Root尚未实跑。**代码/文档回执见`progress.md#M5-STUDIO-UNIFIED-KNOWLEDGE-ROUTING-01`。
- **受控构建证据**：最终Vercel非生产staging部署`dpl_6nUPbgonYdjiktnBkcrosJp2Qadj` READY、精确代码main@`fb7e5c52`（涵盖`adb1c0a6`），Next编译/类型检查/页面构建通过，Preview SSO开启；**GitHub 9组新增单测、PG/HTTP/真实Owner读尚无可信运行回执**，NOT_VERIFIED，绝不报PASS。Production仍`dpl_JAsr7xw2UyMmqkdZ8uYMBjB4eYmc` SHA`83560224`。开发云库只读复查Producer/Worker的LOGIN均存在，但数据库密码仍NULL，云端执行与独立Gate尚未激活。

- 最近审计记录的业务代码Preview `dpl_6cNbCqaHKGJWfdhqKkxFneKK3aYv` READY，精确代码SHA `2830f462`、SSO保护；`/studio`、`/admin` 页面GET 200，`/api/works/published` GET 200且为空列表。这只证明页面/空列表可访问，不证明真实创作、G5与发布。
- Owner本人已确认受保护Preview登录；执行方没有Owner浏览器Cookie，不得代Owner执行创建、上传和提交。
- `mohen-cloud`最近只读审计：`studio.projects=0`、`studio.private_originals=0`、`studio.asset_heads/revisions/links/use_events=0`；23条旧research_tasks的Studio Project绑定=0；20条旧production_runs的Project scope=0；旧publication修订和指针不可冒充新同Root作品。
- 既有私有桶、原件API/工作流、唯一Runner/Registry、专业D链、独立Gate模块、Studio/Admin/发布代码存在或有隔离验证，**须继承，不因云端数据为0重建**。
- Producer/Worker两低权LOGIN角色已安装，但最近检查口令均未激活；Preview缺有效Cloud Executor配置、正式私有上传功能开关/Storage服务密钥；当前启用Gate policy/active binding/service credential均为0。
- 当前只有同一用户持有Operator与Reviewer两角色，无法完成同一身份自审自发；`studio.work_revisions`不存在，现有作品修订写`publication.work_revisions`，canonical revision仍需定向收口。

## 3. 当前两种前沿（不能混淆）

1. **业务/代码最前缺口（第三批后）**：Studio已继承Project候选、G5合格读并完成Project限定G0—G4当前资格读适配器及签名Owner事务/缺口路由。**但现行资格投影为0、受限应用角色仅有资格函数EXECUTE而缺对应业务表的受控SELECT/读桥，真实合格读取尚未验通；跨Project合法共享没有授权索引。**下一批只定向解决现有Gate/Studio授权读取边界，做真实同Project有权/错权/当前资格和撤权正反，确认真正缺来源后再进入已有D阶段；不重做以上已接代码或扩大全表授权。
2. **真实云端生产前沿**：既有Producer/Worker凭据、Cloud Executor、独立Reviewer/Gate服务未完成有效运行配置；`E_D00_REVIEW`和`E_D00_QUALIFY`只代表“选择了新原件的D00→G0子路径”当前运行阻断，**不能再当作所有Studio研究的统一入口或首个代码任务**。同Root G0/G1→D02仍未实跑。

**M5整体：0/8，OVERALL_HOLD**（同一真实作品八维整链尚无准出证据；不是代码完成率）。

## 4. 必须同步维护

施工小批只以实际相邻接口与当前证据更新[progress.md](tasks/implementation/MAB/progress.md)和本页；导航JSON/MD/HTML现有D00/G0定位为**局部子路径**，如调整整体业务前沿，必须同一提交更新三件套，不得仅修改其中一份，也不得将尚未实测的边改为PASS。定向审计原始诊断为核查来源，不另定顺序。正式执行回到PLAN §3.5 B/C/D与[交接入口](tasks/implementation/MAB/ENGINEERING_HANDOFF_CURRENT.md)。
