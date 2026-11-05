# MAB M5｜ST-01 CreateWorkBrief：项目绑定、不可变Brief与幂等回放

日期：2026-11-05（北京时间）。本批承接M5既有ST01研究HOLD分支，不新建阶段，不改变M0—M8顺序。

## 1. 设计约束与本次边界

唯一对照：
- specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md §6.2：ST-01由创作者决定选题/核心问题/受众，Agent负责资料可得性/问题收敛，必须输出 research_brief@rev；ST-02才是StudioResearchRead；ST-04是创作者决定补证/正式生产后构造受控ProductionRequest。
- specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md与现有Studio资产表：使用现有 studio.asset_heads/asset_revisions 不可变版本；项目权限、Owner身份、来源与依赖、资格/权利状态分轴，不另建第二正文。
- 原 tasks/implementation/MAB/PLAN.md M5与现有HP08研究预算/不确定调用恢复规则；本批不重写任务书结构。

边界：本批完成**ST-01 Brief资产持久化和请求幂等绑定**，并保留Provider/来源/资格不足的显式HOLD；不是外部混合研究成功、D00—D05正式生产、ST02—04全链或M5整体准出。无新DDL/迁移，无生产数据、正式Gate、付费Provider、外发或费用操作。

## 2. 实施内容（原位扩展）

- apps/web/app/studio/StudioWorkbench.tsx（82c78ce6）：Studio主入口读取当前Owner可访问项目；无项目时提供创建入口，有项目时可选择；创建项目与委托请求都用稳定UUID重试。自然语言委托随请求发送 project_id 与 idempotency_key。
- apps/web/app/api/studio/research-tasks/route.ts（94ac574d，ST04边界修正 cdb330af）：要求合法项目ID和幂等UUID；项目scope从Owner受限的 listProjects 服务端结果取得，不信任客户端scope；不属于当前Owner的项目返回404；同一个ST01任务重试返回原结果。响应带 brief_asset_ref、replayed。
- apps/web/lib/studio-research.ts（1636be11，结构修正 c0f3c3f0，恢复/追问血缘 33491000、7bab9bf6）：以幂等UUID作为研究任务ID；先持久化 research_brief@rev，再CAS认领并进入研究；同key同输入重放同任务/同资产，不同输入哈希409；资产保存中断时任务留在 BRIEF_PENDING HOLD，可安全用同key续存；运行中重放不重复调用模型。resume/follow-up checkpoint保留原brief引用。
- packages/data-access/src/studio-asset-repository.mjs（1636be11）与 index.d.mts（cbee20c2）：在既有修订表内写入 origin_task_id 和不可变 origin_task_snapshot，并纳入内容hash；未创建新表。
- Brief内容：保存原始问题、主题、purpose、受众未指定状态、项目scope、关联work；明确为 epistemic_class=editorial、content_state=WORKING、access_state=RESTRICTED、freshness_state=UNKNOWN_DEPENDENCY、validation=UNASSESSED、全部rights unknown、formal L refs空。它是作者研究意图，不是历史证据。
- **ST04权限分离**：旧ST01路由曾在研究done后自动调用 requestProduction。这与§6.2“ST04创作者决定补证/正式生产”冲突。本批移除自动派发；ST01只创建研究任务和Brief，返回 production:null。现有 /production GET只查询状态，并非ST04请求动作；ST04显式POST/Creator确认仍待按原序实现。不得因本次关闭自动派发而宣称ST04已完成。

## 3. 真实隔离验收

- tests/e2e/mab-m4-plan.spec.ts（465d3862）沿用现有一次性PG17+Chromium套件，日志明确 MAB_ST01_BRIEF_HTTP_PASS：在真实Studio UI创建项目、选项目、提交自然语言委托；研究因真实Provider/来源/资格缺失进入HOLD；检查项目下仅一份Brief、精确revision、origin_task_id与snapshot、状态/rights/validation；同请求重放返回同task和同brief，改prompt同key 409，缺project/key拒绝，跨Owner不能借项目，恢复仍为零工具费用/不伪造完成/不自动ST04；隔离DB已清理。
- 精确HTTP回执：[41956024859](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41956024859) SUCCESS，job127010993314：18 PASS / 1官方Storage配置缺失SKIP；MAB_HTTP_BROWSER_PASS、MAB_HTTP_SYNTHETIC_DATABASE_CLEANED。无生产数据/付费Provider调用。
- 单元测试夹具随新合同更新（0956cf73）。主CI [41956280247](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41956280247) SUCCESS：65 test files PASS、447 tests PASS/4既有联网SKIP；生产边界133 PASS；Next Build成功；74目标审计 errors=[]。
- 中间CI失败保留，不抹除：41955486156—41956024833的单测失败均因旧HP08 fixture仍调用无project binding的旧函数签名；并非降低新合同的理由。0956cf73把单测改为提供合成项目/签名session与资产存储fixture，最终41956280247全通过。HTTP 41956024859已先证明应用代码与真实PG/Chromium通过。

## 4. 精确状态判定与下一步

- ST01_BRIEF_PERSISTENCE_VERIFIED_ISOLATED：项目归属、Brief不可变修订、task lineage、同key幂等重放、不同输入冲突和HOLD边界已验证。
- ST01_AGENT_AVAILABILITY_AND_QUESTION_CONVERGENCE=HOLD：本次没有外部Provider/来源/资格服务，Agent未完成资料可得性与问题收敛；不把一个被持久化的Brief误报为研究完成。
- ST02 StudioResearchRead、ST03 AnalyzeAndSaveCandidates、ST04 RequestFormalProduction未准出。下一任务按合同顺序进入ST02，先核实可读L层真实存储、项目授权、引用精确性、权限与资格复核；复用既有读模型/谱系服务，不另建知识副本。若当前底座不能支持跨L授权读取，应先形成具名最小缺口及隔离测试，不伪造返回。
- H1/H2/H3、19组件、13类完整专业语义、独立G5、完整作品/出版/WATCH消费未因本批改变。
- **M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**。M1—M4生产/安全/Storage/外发/费用/专业Gate固定条件和M6—M8保持原样。

## 5. 回滚与数据保全

可回滚Studio项目选择UI、ST01路由和编排代码至前一版本，但不能删除已经生成的合法私有Brief、任务快照和修订历史；回滚期间必须阻断新请求，不能回退到无项目归属、无幂等的旧写入旁路。无生产迁移，未改74目标冻结差异账。
