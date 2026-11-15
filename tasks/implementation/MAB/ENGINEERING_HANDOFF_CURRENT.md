# 墨痕 MAB｜工程接续入口（工具无关）

> 只负责说明**从哪里继续、读什么、把结果写到哪里**。不指定施工平台，不设任务、计划或验收标准，也不固定“最新HEAD”。历史交接记载与本页冲突时，以现行`AGENTS.md`、`PLAN.md`和对应真实证据为准。

## 1. 唯一文件职责

| 文件 | 职责 |
|---|---|
| 根 `AGENTS.md` | 设计权威、合同导航及最短读取顺序 |
| `tasks/implementation/MAB/PLAN.md` V1.7 | M0—M8、QR-01—QR-10、九个CP停点、M5八维及唯一准出标准 |
| 根 `CURRENT.md` | 最近可核的代码/CI/云端/隔离状态、当前HOLD；仅为带日期快照 |
| `tasks/implementation/MAB/progress.md` | 历史追加式施工与测试证据；末尾为最近写入的批次，不保证现场已停止变化 |
| `tasks/implementation/MAB/target-diff.csv` | 74目标与对应文件级差异、证据 |
| `tasks/results/MAB/` | 详细回执及历史报告，只供定向回查 |
| `tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json` | **M5接续必读的机器导航**：主干节点、连接、来源代码定位与八维映射；同目录MD/HTML分别供解释与交互核查，非权威验收；三份需同步更新 |

## 2. 每次接续最短路径

1. **实时核查**：从GitHub `main`读取HEAD、最新CI/job、受影响文件版本和Vercel生产自动部署隔离状态；有本地任务时才核本地工作树与未推送内容。**不要直接相信文档里以前的SHA是最新**。
2. **找准唯一断点**：读`CURRENT.md`当前HOLD与`progress.md`顶端使用说明、末尾最近批次及与本次任务相关的历史回执；结合`PLAN.md` §0/§0.1/§0.2和对应阶段/QR/验收条件判断，不重做M0全量盘点。
3. **先找工程导航中的最前断点**：M5任务须读取上述机器JSON的 `navigation_policy`、`acceptance_dimensions`、`nodes[]`、`edges[]`，并结合CURRENT/PLAN与当前真实代码、CI/PG/HTTP/Provider/独立Gate证据复核；标记未运行或HOLD，不把源码路径存在当成PASS。必要时展开MD/HTML。导航受影响时原位更新三份，不创设另一套标准。
4. **核专业边界**：按`AGENTS.md`定位受影响MHKA和现行专业合同，只读实际涉及的章节、源码与测试；若新发现设计冲突，按原授权边界上报，不自行改合同。
5. **在单main执行**：只允许Owner授权的当前工程执行方写main；不建施工分支，不通过PR施工，也不与其他执行方并发写。**若自动生产部署隔离未实测成立，不进行新的业务代码修改**。必要本地/受限环境事项仅做具名、可验的定向交接。
6. **准确留账**：每批保存before/after SHA、受影响路径、原ID、POS/NEG/AUTH、PG/HTTP/Gate/权限测试、环境、失败、真实费用/Receipt（适用时）和回滚；记入`progress.md`。仅运行事实有变化时更新`CURRENT.md`；仅任务/顺序/标准改变时修改`PLAN.md`；受影响路径差异进入`target-diff.csv`。

## 3. 当前恢复条件（以实时核查为准）

本入口不自行宣布实时CI、Vercel部署状态或准出结论：旧记录曾出现代码质量红灯与自动部署未隔离，但**这些属于历史事实，不能当作现在的状态**。实时HEAD/CI、部署隔离及同一真实Studio作品八维HOLD以GitHub与`CURRENT.md`最新事实核实；恢复顺序及准出只读`PLAN.md` §3.5 B/C；具体连接从上述导航定位并再次验证，不能把导航静态状态当作最新证据。

**授权边界保持不变**：生产数据库/Storage迁移、正式独立Gate/Reviewer启用、发布或公众开放、Provider新增费用/凭据及来源外发等必须满足原任务书与PLAN既定授权；密钥、私有字节、数据库dump不得进入GitHub/日志/对话。遇到无权、环境不可达或证据不足，标`HOLD/NOT_RUN/DEFERRED_ENV`并说明具体恢复条件；不能以切换执行工具代替验证。
