# M4 调度、收包及持久恢复工程收口｜2026-11-04（北京时间）

BASE：远端main `f8a32c72f1029df2e670937f3b41f0800f27fdcf`；先fetch核对HEAD及工作树。额度中断后保全全部未提交文件并接续，没有reset/覆盖新成果。继承M1/M2/M3已有源码与固定条件，不重新研究架构。

## 本批实际交付

1. **冻结Plan DAG**：最多32节点，稳定内容hash、精确source@revision、依赖/循环/重复验证、深复制冻结、防可执行URL/JS注入、精确十进制预算；checkpoint绑定输入/政策/Registry/依赖/权利/lease指纹与epoch。完成项不重放，执行不确定需核销，权限/预算/资格不足保持HOLD。`input_hash`是冻结请求，不代实际Runner授权；未执行节点不虚构output hash，完成证明必须有实际hash和回执。
2. **既有工具边界**：计划使用既有`retrieve-local`、`llm-extract-entities`、`production-run`；新增`receive-candidate`为本地只读核验的零信用工具元数据，不价格化外部模型或自动机器Reviewer生成。不另建Runner/Dispatcher/Gate，正式派工仍由原Production Tool、Registry和签名输入约束，当前不激活。
3. **Owner永久计划**：新`/api/studio/plans`保存既有`research_brief@revision`和不可变delegation，预算固定0 CRD（内部信用单位），外发DENIED，不能从JSON覆盖Actor/预算/政策/Adapter。真实Studio资料台可保存、重开、读取旧计划、撤销委托；不把入队/保存显示完成。
4. **精确恢复**：计划payload与委托绑定准确request/series/asset，不以同root+plan hash误关联；数据库按计划筛选、有界游标分页，旧计划不因混合笔记或20项截断丢入口。私有计划保留原登记请求，半途只存成计划时可从当前Owner的最新修订恢复登记，不能改目标资产/项目、覆写预算或复活撤销状态。固定请求幂等，丢成功回执不重复资产/委托。
5. **ReceiveCandidate七项检查**：T1身份/来源绑定；T2真实UTF8字节、范围及quote/hash；T3当前服务端动作权利，内部读取不等于第三方传输；T4原文/识读候选/解释分声部；T5权威谱系同源归并；T6精确profile/指纹的独立专业证明；T7复用既有当前资格。缺权威证明保持HOLD，不接受模型布尔自证。每item accept/quarantine/reject/request_stage/hold；accept仅为私有候选，整体始终HOLD、知识/执行授权false，不写world/meaning/Gate。
6. **持久撤销/租约/CAS**：新增候选迁移`20261104013351_mab_m4_execution_controls.sql`及保留数据rollback；独立NOLOGIN、无BYPASS/成员关系authority，窄SECURITY DEFINER接口。当前Owner/账户/项目/期限核验、并发单赢家、旧lease拒绝、单向永久撤销、请求幂等、checkpoint版本校验、未知费用/外部尝试不能靠payload清零。同lease的IN_FLIGHT→HOLD→IN_FLIGHT也拒绝。Web只可查状态和撤销，不能领worker lease、伪造完成checkpoint或授预算。

## 原M4六项核销与交付边界

| 原任务 | 已具备的代码/隔离可验证输出 | 尚未完成或需具名条件 |
|---|---|---|
| 01 复用检索/Production Tool构建DAG | 原工具ID、冻结请求/依赖、当前准入分类；保留唯一Tool/Runner所有授权拦截 | 正式自动派工、动态签名输入及实际运行整链仍受M4-C01 |
| 02 Envelope/Receipt | 原永久仓储+本批精确计划/委托绑定、Owner恢复、hash/版本、控制审计和费用未知保全 | 真实Provider可信回执/实际费用核证受M4-C02/C03 |
| 03 真实双主体互补 | 受控接口、外发DENIED、预算0、权限不足HOLD；未调用外部Provider | **MIXED_NOT_VERIFIED**；不能用本批合成fixture关闭M4-C02 |
| 04 T1—T7逐item收包 | 真实PG/Owner原件bytes/source→合成独立G1→七项核验；错quote/权利/谱系/语义/资格各自拒绝；撤权重查 | 已证范围仅UTF8字面读取；生产权利/谱系/专业语义权威配置及其它媒体受M4-C01和既有M2/M3条件 |
| 05 Studio九动作/13类型 | 继承原Studio/单套13类长期资产仓储；新增可运行计划、缺口、持久版本及撤销/恢复视图 | 九动作与13类资产的专业业务全验收衔接M5，M4-C04固定，不以generic保存或现有路径代完整通过 |
| 06 失败与跨会话恢复 | 并发CAS、丢回执、半存登记、同root多委托、21+计划、过期、撤权、权利/Owner变化、未知费用不重试、任务删除留证、rollback | 真实Provider进程/费用/生产灾备现场恢复受M4-C03；未做付费重试 |

## 真实验证

- 全套单测：**389 PASS / 4既有实网SKIP**；生产边界：**133 PASS / 0 SKIP**；六工作区typecheck通过。
- 真实一次性PG17全套exit0：专用低权LOGIN，拒绝切换authority/Producer/Signer；新控制CAS/同lease重试阻断、Owner/禁用/归档、不可变撤销、费用保全及rollback；实际Owner计划与不可变委托持久化、同root不同委托不混淆、分页旧计划恢复、任务删除留存；M2真实持久L1→M3精确合成G1→M4逐项T1—T7及撤权拒绝。
- 真实Next build＋Chromium：**7 PASS / 1 Storage配置缺失SKIP**，包括M4计划丢回执幂等、重开、永久撤销、同root正确委托、半存计划登记恢复、跨Owner拒绝。其它M1/既有Notebook回归通过。
- 107路由权限覆盖无缺口，85API/152动作源测映射通过（静态追溯不是85/152全部运行验收）。本批未配置官方Storage，PG的原件字节为受控buffer，日志明确no-Storage；继承M3原官方Storage成功证据，不冒充本批又跑一次。
- 原始日志、RED/修复证明及SHA256清单在`evidence/CODEX_M4_CLOSURE_20261104/`；GitHub实际源码CI取得后追加。

## 审查与定向修复

- 控制任务审查：发现同lease不确定重试漏洞、实际低权LOGIN证明缺失。真实PG先复现缺失拒绝，再补转换守卫及专用LOGIN/角色拒绝；全套GREEN。
- 全批独立审查：发现相同root/hash委托混用及第21项计划不可恢复；已逐项RED→GREEN，增加真实PG和HTTP复现回归。恢复还绑定原私有请求及当前最新修订，重放已撤销登记不返回假有效状态。
- Tool注册及新UI的HTTP CI路径同步补齐；源码没有绕过Gate、RLS或费用条件。先前M4类型收窄minor仍可在后续类型维护处理，不影响运行时失败关闭。
- 测试环境失败如实保留：首次HTTP有2项旧M1用例拒绝repo内psql包装器路径，改用其已允许的`/workspace/work/`包装器；一次新增HTTP分支用APIRequestContext未发送生产Secure Cookie而401，改用既有Chromium真实同源请求helper；未降低Cookie安全。一次未设CI的实网Commons degraded失败，CI模式按既定4项实网SKIP计量。默认Windows/.env隔离脚本仍不适用于此环境，本批使用标记PG17专用脚本，无未标记库访问。

## 裁定与固定条件

按Owner已批准的M阶段有条件准出规则，裁定 **M4_CONDITIONAL_EXIT，仅本批代码/标记隔离环境的计划、候选收包及持久协调/恢复工程交付**。不是完整真实混合运行PASS，原六项完整复选框不勾，原最终标准不改。下一M5可直接使用真实可查的Owner计划/精确修订、永久候选回执和撤销/恢复服务，只做相应合法私有草稿/既定失败关闭消费；不能借此开正式生产或公开发布。

| 固定条件 | 责任与关闭证据 | 最迟完成点及未满足影响 |
|---|---|---|
| M4-C01 正式受控派工与运行配置 | 工程/有权运维经Owner批准窗口，依M1/M2/M3所有相关条件部署迁移/最小LOGIN/独立身份/动态输入与执行授权/Registry；实际Owner→既有Production Tool→唯一Runner逐阶段资格现场回执 | **任何正式新生产派工前**；当前Registry/Job和正式新服务激活保持关闭 |
| M4-C02 真实同root混合与外发/预算 | Owner明确Provider/版本、允许资料及最小外发范围、价格/预算上限；工程接获有权凭据与可信费用策略后，实际内部Agent和外部AI互补事件/回执/转交齐全，非模拟provider/零补费用 | **任何真实外部委托/收费调用前**；且M7双题复用、M8最终准出前；当前MIXED_NOT_VERIFIED |
| M4-C03 正式恢复与费用核证 | 工程/有权运维验证真实进程中断、未知响应/费用核销适配与当前Actor/权利/policy/依赖/lease重核；恢复保持关停，核最新撤销，不得普通payload清除不确定或重复计费 | **首个真实长流程/无人值守任务前**，并在M8前关闭；未核证只能HOLD，不自动重试 |
| M4-C04 Studio逐业务验收 | M5工程接收现有接口，按ST-01—ST-09及13类资产特定字段/权限/精确WorkRevision逐项实测，作品审核不代专业Gate | **对应M5业务启用、跨项目正式复用/公开消费前**；不以原路径存在/通用保存当通过，M8不得带条件准出 |

M1-C01—C04、M2-C01—C03、M3-C01—C03全部继承；未改生产、外发私人资料、执行真实模型或产生Provider费用。

## 本批工程裁定记录

- Ruling: DAG计划时未知的实际output hash不要求/不伪造，完成checkpoint必须有真实hash和回执；冻结input hash不代Runner实际输入授权。若不适配，下游仍拒绝而不会假交接。
- Ruling: CRD只表示既有工具内部信用单位；计划0预算不代表外部模型免费，未知费用仍UNKNOWN。若价格不明，保持HOLD且不调用Provider。
- Ruling: T1—T7的accept只接纳私有候选；缺真实专业/权利权威仍HOLD，不能把Producer资格转换为Agent许可。代价是暂不可消费，不会放松最终资格。
- Ruling: 九动作/13类专业业务核销以M4-C04具名交M5，真实派工/双主体/费用恢复以C01—C03分别固定；原完整M4验收未获PASS，M8最终不得带条件。此分工避免重复重建调度底座，代价是受影响真实业务必须继续被阻断直至对应证据关闭。
