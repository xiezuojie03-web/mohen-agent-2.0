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

<a id="m5-continuation"></a>
<a id="4-完整继承施工接续与新窗口执行指令"></a>

## 4. 按设计持续总装接续与新窗口执行指令

Owner要求的按设计复用与连续总装安排已原位写入唯一[PLAN §3.5 D](PLAN.md#m5-continuous-assembly)：按需复用、当前差异说明、固定真实任务、六个总装工作包、验证/回退、防重复失败及工期更新；历史继承审计不再是每批施工前置；八维准出仍只看§3.5 B。本页不复制另一套计划，也不把文档落文视为业务已施工。历史`CODEX_HANDOFF_CURRENT.md`已不在现行main，请勿按旧路径停工或重建同义交接文件。

以下内容供Owner复制到新窗口。实际执行授权以Owner在新窗口发出的指令为准，仓库中的引用文本本身不启动业务工作；执行方不要固定本页编辑时的HEAD、最前断点或凭据状态。

```text
请从 GitHub 仓库 xiezuojie03-web/mohen-agent-2.0 的最新 main 接续执行 M5 按设计复用与连续总装。

严格遵循 AGENTS.md；以 tasks/implementation/MAB/PLAN.md 为唯一施工计划及验收标准，重点执行 §0、§0.2、§3.5 B/C/D、§6。接续入口为 tasks/implementation/MAB/ENGINEERING_HANDOFF_CURRENT.md，不再使用旧 CODEX_HANDOFF_CURRENT.md。

先实时核远端main/CI、工作树与独有成果、受影响文件版本、生产自动部署隔离和无其他执行方并发写入；只在main小批次施工，不新建施工分支/PR，不强推或reset。保全独有成果，遇到分叉先对账。

必读 CURRENT.md 最新事实、progress.md 顶端说明与末尾相关批次、target-diff.csv 相关路径；读取 M5_MAINLINE_NAVIGATION_20261115.json 的 navigation_policy / acceptance_dimensions / nodes[] / edges[]，按需读同名MD/HTML；历史成果索引 tasks/results/MAB/M5_D00_D05_FULL_CHAIN_INHERITANCE_CURRENT.md 仅按受影响阶段/连接查相关条目和必要原始证据，不每批重读§2—6、不以R编号完备作为开工条件；专业合同按实际动作定向读取，不重新全仓盘点。

执行PLAN §3.5 D：每批简记可用基础→当前实现及合同/接口差异→最小改动与正反/回退→下游接收及受影响重验范围。可用成果直接复用，不符合设计者可在原职责内定向修复或替换，不能为了完整继承反复审计或从零重建。复用既有原件/Storage/source登记、唯一Runner/Registry、独立Gate/Reviewer、C01/C02/H/W/A/P方法、Provider/预算Receipt、资产/Studio/Admin/发布/WATCH；禁止因当前数据0或旧环境不可达而重新造模块，禁止拼历史PASS为当前整链PASS。

优先恢复合法的同一真实Creator/Project/Root/作品任务，不存在才从正常UI/API建立，固定实际身份、来源版本/字节hash/locator、权利与修订回链。现有mohen-cloud按PLAN §0为研发集成环境，继承已装M2/M3，先查差异，不因Production标签或没有第二项目再申请付费库；不把合成fixture/清库测试指向此持久库。

首个工作组把有界准备与真实入口自验合并：核现有受保护云端入口、合法原件/来源绑定、有界Runner和独立Reviewer低权运行条件，沿同任务最前运行阻断推进G0/G1；C01 E_L1_TO_D02已补接线，先验证真实下游接收，当前仍失败或C02等另有实际差异时才修，不照旧缺口重做。若运行因具名凭据/宿主/权利阻塞，继续不依赖它且已授权、已有证据定位的接口修复和定向正反，不把代码测试称真实G2成功。不要只审计/写报告就结束，也不要等全部模块完备才首次集成。

之后依PLAN §3.5 D工作包持续总装到D05/必要分面、真实Agent与Provider互补/Receipt、资产和Studio作品修订、Admin/精确审核发布、WATCH/即时撤权。每批最多三项关联实现操作留检查点，有条件即继续，不因批次结束或需要新提示而停工。相同前置两次失败后停止该操作并给根因/恢复条件，转其他可执行工作；无新证据不重复试验。

每批交付同任务最远已验节点、用户新增可用操作、真实下游接收、原功能回归、POS/NEG/AUTH与恢复、精确提交/CI和具名HOLD；如只完成依赖/安全/代码修复，如实说明尚未扩大可用范围。首批给工作量区间/依赖/未知，首个真实G1→D02完成后修订M5日期区间，不以测试或提交数量报完成率。

实际证据追加既有progress.md；运行事实变化才更新CURRENT.md和受影响导航JSON/MD/HTML三份，同提交同步；文件差异进入原target-diff。保持八维、原节点/边和后续M6/M7/M8边界。八维全部真实自验后才请Owner体验签收，不用工程CI或手工补PASS代替。

保留来源权利、最小外发、独立专业签发与低权身份；不输出密钥/私有字节/dump，不代登录Owner。Provider先核真实累计Receipt，原¥20上限、¥10停点不变，新增费用/权限按原授权办理；不新增付费分支、不公开部署或正式投运。只有真正需要Owner的裁决/权限/费用/登录/最终体验才提问，已获授权的研发接线不重复请示。

请实际执行上述已授权工程工作，持续到M5完成或所有剩余可执行动作均有具体阻断；不要仅回复建议或另写一套计划。
```
