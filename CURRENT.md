# 墨痕｜当前工程事实快照

> **职责**：当前代码与运行证据及剩余阻断，不规定工程施工标准。唯一计划：`tasks/implementation/MAB/PLAN.md` V1.7；历史逐批证据：`tasks/implementation/MAB/progress.md`。每次施工仍须实时查询GitHub `main` HEAD、CI、PG/HTTP及部署，不能把本页SHA当永久最新版本。

**2026-11-16｜M5-G0-BATCH-03 最新核验（只读事实，具名环境HOLD）**：本批核查开始时GitHub `main` HEAD为`339b6b3f35186c6ca3b5374670c236e39ea013db`；业务代码基线为`501829ac1509b2e5eb11d454be2247be7e01c8ed`。本批文档同步提交为`104907608fa1c726a45ca85c937a346209f27497`，其GitHub CI [43812632618](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43812632618) SUCCESS。BATCH-02精确Reviewer签发接口模拟正反CI [43800172713](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43800172713) SUCCESS，270 PASS/0 FAIL；main HEAD Build [43810300382](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43810300382) SUCCESS。**这些都不是PG实跑**：CI job明确无数据库，另一个隔离PG工作流只启动临时合成PostgreSQL 17并在结束时清理。Supabase连接仅发现`mohen-cloud`一个项目、无开发分支，当前无法确认其为PLAN要求的持久非生产隔离库；本轮未对它查询或写入。具名阻断`M5-G0-PG-01`：真实独立Reviewer签发、精确`stage_binding`持久化、Runner同Root当前资格读取、负例/撤权/恢复未运行，故`E_D00_REVIEW`/ `E_D00_QUALIFY`仍HOLD、运行层NOT_VERIFIED，不进入D01/G1/D02。Vercel自动Git部署仍关闭，最新Production为旧SHA`835602242cab31b1fcb372c7ff5efd4fc41dfd89`，未发布本批代码。

**2026-11-16 D00—D05历史全链成果继承排查（文档归档，非新增运行PASS）**：已将10月金泽/A001、11月7/8日作品链、11月9日六门分段真签、11月10日独立G0 PASS但Runner HOLD、11月13日朱家角/七宝两个非模板主题六阶段分段签审、11月14日自由主题六门组件正向及11月16日G0签署接口修复，收拢为[全链继承必读清单](tasks/results/MAB/M5_D00_D05_FULL_CHAIN_INHERITANCE_CURRENT.md)（R01—R10，逐D段可复用和差异）。`PLAN.md` 第0章已加入强制前置阅读和逐批继承引用；本轮只改文档/索引，**没有真PG/HTTP/Reviewer复跑，G0与M5原HOLD不变**。后续应从旧真签名能力继承到本批精确stage_binding的同Root验证，而非再重建G0规则。

**核验日期：2026-11-15。本轮最新业务/隔离测试代码：`main@9730e527e71fadd94b539f7631eb5dd8fc472683`。** 本轮连续三笔业务代码提交：`ec975c3`（Studio D00→D01 C01 原件读取，主CI [43681077049](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43681077049) SUCCESS、隔离PG17 [43681076978](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43681076978) SUCCESS）；`f127751`（真实Runner私有D01→D02 typed输入不匹配时持久HOLD，主CI [43681233345](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43681233345) SUCCESS）；`977b369`（本地隔离Gate必须校验签署的精确stage_binding而不是复制请求output_digest，主CI [43681613039](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43681613039) 最后查询仍在运行，独立Gate撤权合同 [43681613052](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43681613052) SUCCESS）。本轮没有实际Owner同一作品持久环境D00/G0→G5/Studio作品实跑，不得以CI当M5 PASS。


## 2026-11-16｜M5-G0-BATCH-02：独立Reviewer D00/C01阶段输出定向重构（CI通过，运行未验）

- **边与范围**：E_D00_REVIEW／E_D00_QUALIFY，仅D00纯文本C01的同一阶段输出摘要；继承BATCH-01候选唯一定位和项目作用域修复，未重复核查。唯一依据PLAN V1.7 §0/§3.5 B/C/§6。
- **受控改动（业务代码main@56ac0ccb14f6154a8f203eb37712047c622d8f61）**：`tools/gate-stage-output-attestation.mjs`独立从G0 SUBMITTED候选中取method_plan及source_version的版本化引用；机器Reviewer只读source.raw_items与studio.private_originals的实际匹配关系（唯一性、真实project、STORED_VERIFIED、text/plain、SHA和长度相符），重构现有D00 adapter输出的D01 C01类型化请求，并以既有executionDigest重算摘要。Reviewer核当前Registry的D00 job/reviewer绑定及候选input_fingerprint，只有全部吻合时把完整stage_binding置入**现有control.sign_gate_candidate不可变receipt**，而不是信任请求output_digest或新建Gate。
- **范围限制**：当前尚未重构扫页C02和G1—G5阶段输出；不能从Producer请求/对象PASS补签旧audit；空/重复原件匹配、摘要错、job/reviewer错、项目错、来源不可信均拒绝。独立签发后的当前资格读取仍由原严格stage_binding及撤权检查执行。
- **测试与真实状态**：新增`tests/data-production/gate-stage-output-attestation.test.mjs`覆盖重构正例与错digest/身份/权限作用域/原件字节/多候选/非文本负例。业务代码CI [43799675858](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43799675858) **SUCCESS**，Typecheck、Unit、Production boundary regression（含新增D00/C01正反）、Build及Auth coverage均完成；日志中新增D00/C01摘要正反用例成功，数据生产边界共269 PASS/0 FAIL。独立机器PG签发、Reviewer进程、Owner真实原件与同Root持久HTTP=NOT_RUN/DEFERRED_ENV；不将单测模拟库视为真实G0 PASS。
- **下个阻断**：继续核真实隔离DB中C01原件source/raw唯一对应、Reviewer物理身份和签收/撤权、Runner相同run的当前资格。若环境缺失仍HOLD；C02需要可独立重构页码/扫页输出的持久字段，不借文本例放行；不启动D02。
- **生产隔离与恢复**：vercel.json git.deploymentEnabled=false；未写生产DB、未使用真实凭据或触发正式Gate/收费Provider。若生产类正反实跑不可得，保留代码和严格HOLD，不回退到旧output_digest回显。
- **直达**：交互HTML `#edge-E_D00_REVIEW`和`#edge-E_D00_QUALIFY`，导航JSON的audit_tracking.last_execution_batch记本批。M5保持M5_OVERALL_HOLD。

- **补充接口级签发回归（CI通过）**：第二批补充真实Reviewer签发请求边界的接口模拟正反：正常将独立重构的stage_binding提交至既有decide；恶意output_digest在decide前拒绝。测试使用模拟DB签发上下文，不属于持久PG/HTTP G0实跑；补充提交 `501829ac1509b2e5eb11d454be2247be7e01c8ed` 的CI [43800172713](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43800172713) **SUCCESS**，数据生产边界回归270 PASS/0 FAIL。

- **本批生产发布隔离实证补记**：已只读核对Vercel deployment list，最新production仍为`835602242cab31b1fcb372c7ff5efd4fc41dfd89`（早于本批），本批业务／测试提交未产生生产部署。无真实独立G0机器签发/撤权、PG或Owner HTTP实测；G0与M5均HOLD。

## 2026-11-16｜M5-G0-BATCH-01：精确候选定位与真实项目作用域修复（局部施工，G0仍HOLD）

- **当前业务代码**：`718503e6f5ce9166a25628bcff437c2daab5ded1`。本批修改`tools/local-gate-service.mjs`；新增无副作用候选定位`tools/gate-stage-candidate-selection.mjs`和`tests/data-production/gate-stage-candidate-selection.test.mjs`。没有修改生产数据库、正式Gate、Registry、唯一Runner或专业签发合同。
- **断点位置**：导航原边`E_D00_REVIEW`（L0候选→独立G0）及相邻`E_D00_QUALIFY`（G0→L0当前资格），属于M5八维第3项。本批定向接口核验：G0本地隔离服务`autoSign`此前仅按run/Gate/input查候选并按提交时间取第一个，再以固定`PROJECT_ID`创建规则Reviewer；因此新项目有候选但无法按真实项目授权匹配，且同Run多候选可能被任意挑选。修为`tools/gate-stage-candidate-selection.mjs`：在独立机器数据库查询中按run_id、stage、gate_code、consumer=producer、SUBMITTED、input_fingerprint精确匹配；最多2行，必须唯一；由候选已入库`allowed_scope.project_id`取得并校验真实UUID，再传给既有规则Reviewer。无候选、多个候选、无效项目或错阶段全部拒绝，不从Producer请求取得项目ID，也不凭请求output_digest签发资格。
- **已证测试**：GitHub主CI [43797796219](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43797796219) **SUCCESS**（提交`718503e6f5ce9166a25628bcff437c2daab5ded1`）；包含新候选唯一匹配、真实project来源、重复/无效project、错stage/gate、禁止输出digest自证等单元正反；既有类型、生产边界、构建均按CI结果。**未运行本批持久Owner/Private Worker/独立Reviewer同Root PG/HTTP正反，不能记G0运行PASS**。
- **仍未解除**：现行`tools/rule-gate-reviewer.mjs`签发的对象级PASS审核receipt还没有Reviewer独立核验并写入不可变的精确`stage_binding(job/reviewer/input/output)`；`gate-stage-qualification.mjs`及`local-gate-service.mjs`仍然严格拒绝旧PASS回显，故`E_D00_REVIEW`和`E_D00_QUALIFY`的⇄HOLD、●NOT_VERIFIED均保持，不冒充全链修复；D01/G1→D02的typed请求仍后置。
- **生产隔离**：本批修改前已复核`vercel.json`包含`git.deploymentEnabled=false`，Vercel production最近READY仍来自`835602242cab31b1fcb372c7ff5efd4fc41dfd89`，未见本批提交自动部署；未触碰正式DB/Storage、生产审核凭据或公开部署。
- **下一最小施工**：在独立Signer信任边界内找到并独立校验真实持久stage输出的可重构来源，然后最小受控签发精确stage_binding和正反/撤权测试；不能只把Producer传入的`output_digest`复制到签名字段。随后重跑同Root G0→当前资格；条件不足保持`NOT_RUN/DEFERRED_ENV`且将缺失具体化。
- **交互入口**：`tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.html#edge-E_D00_REVIEW`，打开HTML后自动展开D00—D05中的G0断点，并可切换`#edge-E_D00_QUALIFY`查看资格读；JSON的`audit_tracking.last_execution_batch`仅记本批施工与证据，原边三层状态仍唯一可信。

## 2026-11-15｜批次C：Studio文本读取、D01→D02错误交接和独立Gate输出绑定

- **已实现**：Studio现在按`--to D02`启动同一Runner，D00对文本按G0预选C01形成不含私有原文的D01 typed request，对图像保留C02页请求；低权D01只在源版本绑定、G0当前批准方法后读取校验原件UTF8字节，保存精确extent/quote候选，大于32KiB或非无损UTF8拒绝；不在报告/跨进程阶段输出暴露全文。来源、Gate、身份和费用底线不变。
- **下游可接收性**：真正的D01 reading candidate并不等于D02 observation请求。唯一Runner检测上游资格PASS但下游typed输入不匹配时在**D02**登记`PRIVATE_NEXT_STAGE_REQUEST_NOT_READY` HOLD，并持久化阶段与原因，不调用D02或伪造资格。该改动附有针对Runner实际接口的自动测试，并非仅fixture整链PASS。
- **新增独立G问题**：实际`tools/local-gate-service.mjs`先前只用`input_fingerprint`挑审计，再回显请求的`output_digest`，不核审计的`stage_binding`。现已改成与只读资格服务一样必须核对审计所签job/reviewer/consumer/input/output；现有机器规则Review流程尚未产生完整精确stage_binding时**严格HOLD**。这不是新Gate也不是允许Producer补签。后续需合法构建真实输出摘要和审核回执同源绑定，不得恢复旧回显漏洞。
- **可用证据**：`ec975c3`主CI+隔离PG17成功；`f127751`主CI成功；`977b369`独立Gate撤权合同成功，其主CI/PG17/HTTP最后查询尚在运行。没有本次同一真实历史作品PG/HTTP/私有存储/Agent/Provider/G0—G5连续运行业务证据；生产Vercel和正式DB/Storage未变。
- **真实下一阻断**：当前Private D02缺由已签G1读取结果生成合规H05专业观察的受控步骤，且本地隔离机器审签回执未提供独立签发的stage_binding。因此当前最远只可证明代码与CI级D00→D01条件执行、D02确定性HOLD，不得称D02/G2实际接通。保持`M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD`，继续按`PLAN.md §3.5 B/C`实施，不另立标准。

## 2026-11-15｜批次D：真实C01阅读单元的Owner授权下游回读

- **业务代码 / 隔离测试**：`5245b89`新增 `supabase/migrations/20261115130000_mab_m5_private_text_read_context_consistency.sql` 和真实PG下游读取断言；最初迁移文件文字替换误展开损坏，`0ac9a19`已修正并回读函数正文及单一定义。此后 `e625513`修正隔离PG的迁移顺序、`9730e527`将迁移同步加入隔离HTTP执行清单；没有修改原已应用迁移或生产DB。
- **真实问题**：旧 `studio.read_private_text_reading` 查询需要不存在的 `original_revision_id` 和 `byte_verification_receipt.status='VERIFIED'`，实际 C01 写入只有原件与项目绑定以及 `attestation_digest/key_version/verified_at`，导致合法源阅读单元无法出现在 Studio 的 Owner 读取视图。D02 H05的历史证据关联回执格式也与视图中的旧link_version/status字段不同。本轮新迁移定向对齐两种实际写入回执，仍要求激活验证key、可信原件hash、source/raw locator一致，保留Owner RLS/私有原件不出域，结果仍标UNASSESSED。
- **自动检查状态**：`977b369` 主CI [43681613039](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43681613039) SUCCESS、对应隔离PG17 [43681613082](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43681613082) SUCCESS；`9730e527` 主CI [43682350601](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43682350601) SUCCESS。隔离HTTP [43682350602](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43682350602) 与`e625513`对应隔离PG17 [43682283964](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43682283964) 在此记录时仍未得到最终结果。旧`5245b89`/`0ac9a19`/`e625513`的CI预检因迁移未接入两套fixture而FAIL，已根据具体失败补足清单，**不得把前序失败隐去或把在跑的隔离测试记为PASS**。
- **目前同root主干已完成的代码级接线**：Studio C01`D00→D01`输入按来源/载体分派、Worker已核G0方法与真实原件精确字节的L1持久候选；D01输出交D02前有专属schema拒绝与持久HOLD；下游Studio L1读模型已实现精确回执兼容，**仍需隔离PG新测试最终结果**。主干没有真实PG/Storage/Review/G0—G5同run实测回执，M5为`M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD`。
- **当前最前仍阻断**：独立本地机器Reviewer签发的真实stage_binding（stage+job+reviewer+input/output）尚未与Runner计算的输出摘要同源，严格HOLD，不能恢复旧Gate回显漏洞；D01候选→D02合规H05专业观察请求/受控Provider/费用回执尚未接入，不得伪造历史观察与G2资格。其后知识资产/Studio作品/Admin/发布/WATCH仍未在本轮连接到同一root。


## 2026-11-15｜M5主线可视化/机器导航（非权威、非业务完成证据）

- 导航图 `tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.html`、人机共同可读的Mermaid与工程索引 `tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.md`、节点/边/代码绑定 `tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json` 均已存 `main`；静态索引基于 `2c4db017` 主线源码，登记提交为 `e0da6997`。**这不是另一套设计/验收标准，也不是施工通过凭证**；每次必须核实时新的main、CI及真实运行事实。
- 本导航明确Dxx→Lx候选保存→Gx独立资格→同层Lx合格消费；Studio H1/H2/H3 可按授权及逐用途资格消费L0—L5（原件书影另核媒资权利），Admin横向管理六层候选/资格/修订/失效，WATCH在本次M5业务主链，EXP仅作未来接口预留。
- JSON由35节点、47关系构成，含每边连接类型、检查条件、现行/旧代码路径及BLOCKED/部分实现/未来预留状态；其状态为**该SHA定向核查快照**，绝不代替`PLAN.md §3.5 B/C`或把静态图当作D00—D05同一真实作品的PASS。下一最前阻断仍是同Root真实G0精确审签/合法消费与D01→D02专业请求生成。

**导航定向收口与持续使用要求（2026-11-15）**：本组三份导航为持续维护的工程指南针，已补齐M5八维映射、跨Agent/Provider与13类资产定位、所有连接可点击检查、原码SHA固定链接和证据等级；不是M5完成/工程实跑PASS。后续工程执行者应按`PLAN.md §0 M5主干导航必读入口`先读`CURRENT.md`、`PLAN §3.5 B/C`及`tasks/results/MAB/M5_MAINLINE_NAVIGATION_20261115.json`，对当前最前断点做定向源码与运行核验；变化时同提交同步JSON/MD/HTML。旧导航精确源代码SHA为`2c4db01783cc`，其后文档类提交不等于业务断点变化；未来业务提交仍须先核影响范围。

## 2026-11-15｜导航断点分类第一批定向源码审查（静态证据，不是业务准出）

- 由截图暴露的“橙色被误解为代码缺失”触发。原54条只是业务交接，其中16 partial、36 blocked、2 future；不是54项源码或工程完成率。30个边级唯一定位文件均在固定代码 `2c4db01783cc` 找到；除下列7边外其余未实证分类，必须注明未核。
- **G0源代码合同不匹配**：`tools/rule-gate-reviewer.mjs` 通过既有权威签发时的机器PASS receipt不含 `stage_binding`；`packages/data-access/src/gate-stage-qualification.mjs`和`tools/local-gate-service.mjs` 现必须精确核输入、输出、job及独立Reviewer。已有审签逻辑，但并非Runner准确阶段资格，可证为**交接合同不匹配**，不能以旧对象PASS冒充。
- **D01→D02源代码缺失的是适配交接**：真正的reading candidate与D02 H05观察Worker存在，唯一Runner现对下一阶段无typed request时生成`PRIVATE_NEXT_STAGE_REQUEST_NOT_READY`。先合法形成G1合格L1→D02类型化专业观察输入，不重建D02。
- D00源候选/D01读取/Owner回读有代码、此前CI与隔离PG/HTTP局部成功；上述均**没有同Root的持久真实Creator/G0/G1/Provider全链正反实证**。最新相关CI/隔离PG/HTTP需按精确SHA继续取证，不预判整体PASS。
- 本批分类已同步于导航JSON/MD/HTML。下一批从G0签发合同和下游受权消费的**最前邻接**做正反/独立身份测试；G0具备后接D01/G1→D02 typed转换与真实持久证据。每批补受影响边，最终覆盖全部M5相关边；M5唯一准出保持PLAN §3.5 B八维。

**2026-11-15导航状态三层化（非业务进展）**：同原目录的JSON/MD/HTML开始按每节点/边独立记录◆能力、⇄连接、●运行与五状态；37节点54边ID不变。只有此前7条定向诊断转换为部分/HOLD状态，45条当前未核实边保持灰色，2条EXP为未来；没有同Root运行PASS。施工仍只按PLAN §3.5 B/C唯一八维，后续证据驱动更新导航。

**分模块统计与详情索引更新（2026-11-15，文档组织变化）**：原37节点/54边全部赋予互斥主归属，共9个模块。其他非D/L/G模块可展开现有业务步骤，不添加新业务合格断言；统计明确全图37/54、M5范围36/52、EXP未来1/2。已定向诊断7/52，尚未逐接口核查45/52；此为诊断覆盖，不是工程实现率。三层PASS及根因仍只按既有证据。

## 1. 唯一当前验收：PLAN §3.5 B 八维

- M0：`EXIT_PASS`（审查级证据冻结继承，不重做全量差异核查）。
- M1—M4：`CONDITIONAL_EXIT`，原固定条件与M5所需具名缺口仍有效，已验未变化的实现复用。
- M5：`M5_REMEDIATION_ACTIVE / M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`；六个独立Gate的组件正向与局部UI/作品证据，**不能代替同一持久隔离实例中从Studio真实自由选题到D00—D05/G0—G5、Agent/Provider、知识资产、导演修订、Admin、发布与WATCH的八维度完整验收**。
- M6—M8：`NOT_STARTED`；本轮没有执行生产库/Storage迁移、正式Gate投运、公众开放或Owner最终签收。

**Owner进度口径**：只报告同一真实作品已达到的最远受证节点、下一处不能继续的连接及M5八维准出；QR、CP、HP、旧M1—M4是工程回溯索引，不是另几套准出率。

## 本轮 M5 批次B：D00/G0真实失败状态可追踪（2026-11-14）

- **同一主干的已提交增量**：`e347710bb73b73f4244e494c6a92b3d50edc50c6`将单一Runner的有限终态字段（stage、gate、经验证的独立审计ID、可公开错误代码）写入既有`control.production_runs.metadata.m5_terminal`，Studio受权GET回读；加2条无Gate/PASS伪造负例。主CI [43612054525](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43612054525) SUCCESS。
- **启动/环境连续性**：`689e13fa2f99cedc2ce997b258f84bdb2a01d279`修复独立Gate URL/credential被强制替换的接线、认证服务失败导致RUNNING滞留与私有scope临时文件清理；不改变Producer与独立Reviewer权限，不在无权环境启动Gate。主CI [43612233335](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43612233335) SUCCESS。
- **Creator可读恢复**：`da888e0c7b5c970899feebffdb5aa41b8df420e0`在既有Studio任务状态轮询/历史研究恢复展示同一run的G0 HOLD代码/阶段，区分D00-only工序状态与完整M5。主CI [43612526438](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43612526438) SUCCESS（Typecheck、Unit、Production-boundary、Build）；**本次并未在隔离PG或真实HTTP环境重新执行对应三笔代码**。
- **生产隔离复核**：Vercel项目`mohen-agent-2-0` production最新READY仍为旧`83560224`（09:29:42Z），本批三笔main代码提交未出现production deployment，未操作生产DB/Storage/手动部署/正式Gate。
- **最高运行证明仍受限**：`CODE_PRESENT + MAIN_CI_SUCCESS`。当前无具名持久非生产的真实Owner原件字节/合法rights、低权Private Worker、授权服务、独立Reviewer会话可贯通本批同一run，**D00候选落库、独立G0签PASS与现行资格回读仍`NOT_RUN/DEFERRED_ENV`**；不可把Y07本地读取称为馆藏下载/使用许可，也不可把新HOLD回读当作生产成功。原Studio生产预留因现行费用回执严格要求仍需受控核销，不能自动解锁/重试。M5八维保持`M5_OVERALL_HOLD`。
- **下个实际施工关注点**：沿同一Studio项目/任务核实际持久环境签名授权与首次D00候选→独立G0当前资格；材料、权利或签发不足时保留来源/阶段/原因和对账阻断，再定向接合法恢复与D01；不得重建Runner、Y01、Gate或模拟PASS。

## 2026-11-15｜历史六阶段能力与当前主链的源码继承复核

- **新增实际代码核查结果**：[M5 D/L/G 历史继承代码核查](tasks/results/MAB/M5_DLG_LEGACY_INHERITANCE_CODE_AUDIT_20261115.md)，源代码基线 `main@fbaa76243020dccc9d93bf8e053b08cca123c165`。此前该轮代码核查仅在对话中，现已补齐 GitHub 现有成果目录并在下列唯一进度档案登记；本文件不替代 PLAN 标准。
- **纠正误判**：金泽样板 `SAMPLE-TRIAL-12`、A001 绿之丘 `STRAT-PROD-A001/P2` 确有 D00—D05/DeepSeek/库表/L5/前端历史运行成果，原 `layer1-adapters.mjs` 专业实现仍存在；不能称六阶段从未跑通。2026-10 历史 Gate 代码曾由 Producer Adapter 直接插入 `gate_audits PASS/current_valid`，当前独立 G 签发语义不能直接继承该旧 PASS。
- **最前现行源代码断点**：Studio 仍以 `--to D00` 实跑；新 D00 有 typed D01 交接，**文本 C01 需要的 byte-range+quote 未从 D00 构造**；D01→D02 以及后续阶段没有把上一阶段实际候选经合规专业方法转换为下一阶段 typed input；原旧 LLM 能力尚未接入新受控 Provider/来源权限/费用回执；D05 私有路径仅世界投影，Studio 新旧修订链并存；生产预算 reserved 未完成终态对账。详见链接文件逐项定位，不将旧代码/新空接口/测试混为完整运行证明。
- **核查范围与未验证**：本次完成主要生产主干及历史版本针对性源码追踪，**不是整仓 2631 个路径或 63 方法/13 类资产/19 组件的全量逐文件核验**，也未在隔离持久实机重新运行同一作品/Reviewer/PG/HTTP/Provider。下次只沿同一 root 真实调用的**最前可证邻接缺口**定向修复验证，避免重建旧生产能力。M5 仍 `M5_OVERALL_HOLD`。

## 2. 最新可核的质量与发布事实

| 门 | SHA与可核结果 | 不能推出 |
|---|---|---|
| **批次A最新代码质量** | `8b0efba`，[run 43610692797](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43610692797) **SUCCESS**；修复Registry私有Adapter正式双绑定、Studio携带可信Owner/session/source/page、运行D00选择C01/C02、Y07受限本地实际回读记录及失败关闭测试 | **非**同一真实作品的独立G0 PASS；Y07本地回读不证明外部机构获取或权利 |
| **批次A隔离回归** | `86faf76a`及前序 `c6a05f83`有隔离PG17 SUCCESS [43609531072](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43609531072)；`642c3323`隔离HTTP/Chromium [43610472680](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43610472680) SUCCESS；旧 `2a34f3f6` CI类型红灯、`642c3323` CI旧测试断言红灯已分别由后续提交修复 | 已有隔离PG/HTTP证据仍不等于`8b0efba`的真实Studio→D00/G0持续环境验收 |
| GitHub 主CI | `15fda338`，[run 43591589635](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43591589635) **SUCCESS**：类型、构建、单测、生产边界与鉴权守卫通过，覆盖本次Studio真实来源/版本准入与错误Binding提前拒绝 | 不等于Runner已完成Private Worker/G0连续签发 |
| 隔离PostgreSQL17 | `7f36db2d`，[run 43585072924](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43585072924) **SUCCESS**，真实PG17验证 Studio/项目范围变更后的权限、资产、Gate、撤权及回滚 | 不等于正式生产DB已迁移、真实原件/Provider已就绪 |
| 隔离HTTP/Chromium | `99ef0774`，[run 43585157777](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/43585157777) **SUCCESS**，**24 PASS/0 FAIL**：真实Next/Chromium + 隔离PG，新增Studio底稿恢复、HOLD不能启动正式生产、跨Owner POST拒绝的实际浏览器/HTTP断言 | 不等于混合Agent、正式D/G真材料全链或Owner正式体验签收 |
| HP13 74目标哈希审计 | `missing_target_count=0`，但仍有`HANDOFF_DECLARED_SHA256_MISMATCH`及`unverified_semantics_count=74`；原审计结果仍上传，CI将此明确的“informational”步骤记为允许失败 | 不得将74目标当成已完成语义级准出 |
| Vercel部署隔离 | 仓库根`vercel.json` `git.deploymentEnabled=false`（`5b02081b`）。随后`51ba77f7`、`6ea907d4`、`091c5ac5`、`61e6e3a1`、`76b7ffd2`、`c594f4ee`等main提交均触发GitHub CI，**未触发新Vercel production部署**；最近列表中的生产READY仍来自配置关闭前的`83560224` | 不等于生产部署/手动发布已演练，亦不授权生产切换 |

## 3. 关键修复与未关闭的运行边界

- 原6项单测问题已经修复并在最新主CI全部转绿。包括导入权利状态枚举、D04证据方法夹具、Registry部分激活前置与独立Gate Reviewer错误诊断/当前资格CAS夹具。负例和Gate失败关闭未取消。
- 新发现并修复真实的内容指纹回归：`20261114210000`迁移意外覆盖K5“登记内容列计算artifact revision”函数；已以**后续补偿迁移**`20261114220000_mab_m5_restore_registered_content_revision.sql`恢复，隔离PG证实无关列变化不移动内容修订，并保留G3 claim_revision映射。
- 原隔离PG失败涉及QR05权利词典迁移时序及旧固定项目Reviewer断言，已在真实隔离PG复核通过。原公开消费HTTP 500由于隔离DB缺ST05/07/08/09正式Schema，补入HTTP隔离迁移链后24项浏览器测试均过。
- **生产环境与持久首用户环境没有在本轮重新启用或验证**；先前只读云端核查显示Schema/Storage与本地隔离环境存在差异，未获正式生产迁移/Reviewer/Gate激活授权前仍HOLD。
- **M5 Studio入口受控接线新增（本轮）**：ST-01研究委托已与ST-04显式生产申请在页面交接，正式启动的POST与生产run读取不再只靠不可返回的自动run_id；Runner与G0—G5候选绑定当前Creator受权真实project，不再使用样板project；持久底稿可按Owner恢复，经现行材料资格核验后才展示研究结论。真实新题材/真实独立Gate仍未被实跑准出。
- **批次A当前最远受证节点（准确区分）**：Studio身份/项目/原件元数据→Owner-RLS真实L0登记核对→明确页码→统一Registry审核的私有Adapter绑定→单一Runner D00-only真实启动参数与Owner会话传递→Y07本地原件已上传时间和可信Worker字节回读生成候选的**代码与测试**已进入main并主CI通过；原layer1非私有合法路径仍保留。**本轮尚无持久真实项目从UI启动D00写入G0候选、独立Reviewer签PASS与当前资格回读的正向实机证据**。
- **下一最前阻断**：同一持久、具名、非生产环境的真实Creator/Project/Root Task及合法原件正向实跑；需要已持久化真实原件/来源版本/逐动作权利依据、Owner会话、低权Worker、独立授权和G0 Reviewer。当前GitHub/CI无法访问Owner本地持久私有Storage与独立审签环境，故真实D00→G0记录为`NOT_RUN/DEFERRED_ENV`，不是模拟PASS。Y07的`M9001@private-original-readback.v1`仅为本次实际私有存储回读路径（DRAFT），不证明馆藏机构下载、来源合法许可或G0专业资格；若G0拒绝，保留准确拒因，不得降低权利门。
- **自动Git生产部署已隔离**，但手工部署的精确SHA选择、回滚、服务可用性仍归M8与原授权，不因CI全绿而自动执行。

## 4. 下一实际施工入口

依据`PLAN.md` §0.1/§3.5/§5/§6，从现有M5真实UI整链断点继续：同一合法真实来源→D00—D05/G0—G5连续执行→同root内外AI及实际权限/Receipt→可追溯资产/Studio修订→Admin/发布/WATCH/撤权；完成八维度正反、持久恢复及Owner正式体验。CI/隔离PG/HTTP的**已验证质量底座直接继承**，不无证据重复修，M6—M8仍按原门推进。
