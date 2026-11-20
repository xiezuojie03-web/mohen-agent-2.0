# 三问结论｜2026-11-20

## 问题 1：当前施工方案应该怎么样？

当前断点（`CURRENT.md`）：**Studio 原件已登记 → D00 接收已验收 → 停在独立 G0 审核前**。唯一正确方案是沿 PLAN §3.5「最前阻断」继续，不换 Root、不另造链。建议顺序：

1. **先解证据链上游堵点：CI 宿主故障。** 当前 4 次 main run 都是 `runner_id=0/steps=[]` 启动前失败，导致精确 SHA 的单测/类型/构建事实上没跑。先定位 runner 为何未启动（这是环境与基础设施问题，不得归因为代码或账单，也不能跳过断言伪绿）。恢复前把受影响批次记 `CI_BLOCKED`。
2. **同一 D00 候选交独立 Reviewer，回读 G0。** 候选 `48766904`（SUBMITTED）、运行 `bfcdfad6`、来源版本 `67839b1e`、原件 `4ca22839` 都已在 CURRENT 固定。这是 CURRENT 写明的「下一动作」，也是从"接收"迈向"生产链真正跑通"的第一步。必须独立低权身份签发，Creator/Operator 不能代签。
3. **G0 通过后按顺序推进 D01—D05 各相邻交接**，每批只验证下一处实际交接，核精确 artifact revision、依赖快照、当前资格，不编造默认 PASS。
4. **资格正向命中验证**：回写后本地 `qualification_current=49`，但当前 Project `e03c4ba8` 的精确 scope 是否命中、正式读取能否读到真实合格知识，仍无正向证据——这是「统一门面从未读到真实知识」的直接原因，需在 D01+ 交接中一并验。
5. **最后才进入八维总装与 Owner 体验**：工程先在持久非生产环境真实浏览器/HTTP/PG/Storage/Provider 正反自验，再请 Owner 从各角色做最终体验；任一维 HOLD 保留准确阻断，不自签 M5。

**边界不变**：不碰 production 迁移、不启用正式 Gate/公众开放、不新增付费、不用合成测试或历史 PASS 冒充当前运行结论。

## 问题 2：是否需要修改施工计划文档？

**不需要改原则，需要改一处、补两处。** PLAN V1.7 与审查缺陷高度匹配（10 项中 8 项完全匹配），属于"要求明确、执行未达"，不是计划失配。

- **需要补（1 项，唯一真缺口）**：§0.2 增加 CI 宿主级失败口径。现有"红灯定向修""两次失败停止"都针对操作失败，未覆盖 `runner_id=0/steps=[]` 这种步骤未启动。建议加：宿主级失败记 `CI_BLOCKED` 而非静默 `NOT_RUN`，须记原始 run 结论、排除代码/配置原因、具名移交恢复责任。
- **需要补（1 项，部分匹配）**：§9 或工作包补「开发 Skill 自生长闭环」验收落点，或明确列为延期项。现在只有 Skill 逐项验收，没有"采集回执→生成候选→Owner 激活"的闭环能力对照。
- **需要改（1 项，事实同步而非计划原则）**：不改 PLAN，改证据账——给 `progress.md` 追加今日回写+push 批次，记 HEAD `c456f8c` 与回写后库状态（49/6/46/91 等），遵循 PLAN §3.5 A「新事实定向改判」与 AGENTS §4「每批追加 SHA」。

## 问题 3：与施工文档相关的不一致文档清单

按严重度排序（详见另文审计报告）。今天是审计当天，其中前 4 项已由本次审计**直接发现并修正**（均是我此前评估文档造成的错误）：

### 已修正（本次审计产出）
1. `tasks/results/P4_CLOSURE_20261120.md` — 曾把"未 push"写成定稿事实；已改为 local=remote=`c456f8c`。
2. `tasks/results/CLOUD_TO_LOCAL_SYNC_20261120-result.md` — 同上两处；已改。
3. `tasks/results/PLAN_VS_AUDIT_MATCH_20261120.md` — 曾把 `qualification_current=0` 等旧数字误归给 `CURRENT.md`；已改为正确归属 `progress.md` 快照批次。
4. `tasks/results/DESIGN_VS_REALITY_ASSESSMENT_20261120.md` — 曾把"正式读取 count=0"误归 CURRENT；已改。

### 仍需处理（既有文档）
5. `CURRENT.md` — 全文 13 行，缺 AGENTS §4 要求的核验日期/时间/HEAD，也未记今日回写+push；断点描述本身与 progress 一致。**建议补头部元数据与一行回写事实**，勿改断点。
6. `tasks/results/MAB/M5_D00_D05_FULL_CHAIN_INHERITANCE_CURRENT.md` — 把已停用的 `M5_MAINLINE_NAVIGATION_*` 当"实时工作入口"（违反 AGENTS §2）；§8.1 标题写"当前云端实存"却是 11 月初零值（39/98/0/711）。**建议加失效标注或更新，去掉停用导航引用与坏锚点**。
7. `tasks/results/MAB/M5_NAVIGATION_MODULE_ROLES_AGENT_MODES_DISCUSSION_CURRENT.md` — 仍授权修改停用导航 JSON/MD/HTML 并称其为"唯一导航状态源"。**建议加失效声明**。
8. `tasks/implementation/FINAL_CODEBUDDY_IMPLEMENTATION_SEQUENCE.md` — 16 步"第二施工顺序"，含 V2 基线迁移、G0—G4 re-gating 等，无失效标注。**建议标注为历史方案、不得执行**。
9. `tasks/implementation/ARCH-MIG-01/IMPLEMENTATION_SEQUENCE.md` — 另一份任务顺序，且写明"不再盘点 HEAD"，与 AGENTS/PLAN "写入前核远端 HEAD"直接相反。**建议标注未发令/失效**。
10. `tasks/implementation/MAB/progress.md` — 最新批次断点与 CURRENT 一致，但无今日回写/push 批次、无 HEAD/CI。**建议追加新批次，不改写历史**。
11. `specs/data-production/SAMPLE-TRIAL_CLOSURE_ANALYSIS.md`、`DATA_PRODUCTION_MAP.md` — 把 10 月样板"六门全 PASS/真实 G5/上线"写成能力陈述，未显式绑定"不得外推为当前运行结论"，与 CURRENT"独立 G0 决定 0"易误读。**建议加限定语**。

### 明确未发现冲突（不用改）
- `ENGINEERING_HANDOFF_CURRENT.md`：8 行，无旧 HEAD/平台/断点，只指回 CURRENT/PLAN，今日回写非平台切换，无需更新。
- `target-diff.csv`：确为 M0 路径账，但 AGENTS 已限定其"按需读取目标差异"，与 M5 阶段不越界。
- `MHKA-05`/`MHKA-02` 的 152 统计：原文已限定为"当时记载/不同验收账"，未写成当前运行结论。
- `PLAN.md` 自身唯一顺序自洽。

---
说明：本答复基于只读审计；我发现的自身文档错误已即时修正，其余既有不一致只列出建议、未擅自改动任何文件。
