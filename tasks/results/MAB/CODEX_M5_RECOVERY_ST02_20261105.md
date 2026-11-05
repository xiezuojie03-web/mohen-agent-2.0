# Codex M5 中断现场核对与 ST-02 有界接续｜2026-11-05

基线 `5efd0085edc979f99dec51df159a68f88fa8eee4`；Owner V1.2 连续施工授权；本批三项操作，M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。

## 1. 恢复与三方核对

- 找到 `/workspace/mohen-agent-2.0`，work@759dbbd0c206c4acfe2ebdc3e94aa556528b330c；暂存/未暂存/未跟踪均空，stash空，reflog最近只有旧work重定位；fsck未发现不可达施工对象。其它可访问scratch/shared/library-files、挂载的.codex/.agents为空；全域补查仅见已跟踪历史patch，未找到中断源码。原implementation_artifacts/preflight/GIT_DIFF_BEFORE.patch和现行MAB归档UI_RECOVERY_UNAPPLIED.patch均已在Git历史保留，未重放或删除。忽略文件仅构建/依赖缓存及tsbuildinfo，无额外未提交施工补丁。**未找回额度中断时的未提交现场，不能声称恢复该现场。**
- 本地对象库已有origin/main@5efd0085，与GitHub实时API及随后成功fetch一致；旧work领先0/落后369，无独有未推送提交。三条历史线索9cc25f65/9838abb3/3edfb0e6全部在main祖先，分别为ST02服务/限额/3单测；不是重新施工指令。
- 操作前完整Git bundle保全在 `/workspace/work/m5-recovery/pre-fetch.bundle`，bundle verify通过；原work目录不改，独立非硬链接副本 `/workspace/work/mohen-m5`，分支m5/continuation-20261105。未reset/clean/强推。
- 基线CI 41984534921 FAILURE；本地准确复现TS2353(title不属于Material)和2×TS2451(privateMaterialIds重声明)。已有代码不等于ST02已验收，旧账中的ST02下一任务正确。

## 2. 三项操作与回退

1. 继承Material合同：entityIds=[]，标题进入sourceRef；去掉重复局部声明，未扩张Material或伪造实体。
2. ST02现有服务接私有POST `/api/studio/research-read`：服务端签会话、UUID项目、ACTIVE校验、no-store/统一错误、候选身份及外发禁止。POST因现有reading_note幂等写入，不提供有副作用GET。沿现有仓储/RLS读取，不调用模型或正式生产。独立审查找到生成note首次/重放重复，已回归并仅由当前L1上下文纳入自动note；仓储在LIMIT100前排除生成note，避免挤掉旧候选，普通笔记列表不受影响。现有PG套件补100候选边界；现有HTTP套件补真实Owner/跨Owner/no-store/候选精确版本/重复读取，runner仅在标记隔离DB应用已有原件元数据迁移（不接Storage/生产）。
3. DS03首个离线经验分析基础：严格脱敏结构回执、相同签名分组、去重冲突拒绝、四路待评价建议、失败不计成功、默认不可激活。接口在同一Skill references/EXPERIENCE.md，脚本experience.mjs；非宿主遥测采集/模糊语义发现/自动准入。权限不因建议增加。

回退：撤回本批新增私有入口/分析脚本或按Git差异回退；保留已合法保存笔记与原件。数据库及Storage生产环境未改；不能复活撤权材料。仅测试runner使用现有迁移，不创建新Schema权威。

## 3. 实测与宿主边界

- Node24.19.0、git2.52.0；宿主pnpm11.25.0有版本差异，已改用仓库指定pnpm9.15.4完成frozen安装，锁文件不变。pnpm11自动生成workspace占位配置已定向移除，不提交依赖变化。
- 沙箱Node spawnSync初报EPERM、git fetch代理端口拒绝；相同授权命令在正常执行权限下成功。无绕过网络策略或关闭TLS。初次offline缓存缺元数据、pnpm11忽略构建均真实失败，不冒称安装PASS；pnpm9安装成功后执行测试。
- 本轮会话已实际读取canonical Skill正文、工具映射与宿主规范，实际运行doctor/static/typecheck/unit/production负例。CLI的hostSkillLoaded:false仅表示CLI不能证明宿主加载，读取与执行由本轮会话轨迹证明；不声称原生自动发现/后台调度或CodeBuddy验收。
- 类型修复后六workspace typecheck PASS；首次完整unit467PASS/4既有SKIP；生产边界133PASS；Skill11PASS；新入口/服务最终16PASS；Playwright收集20项/7文件仅语法证据；Build PASS。审查后最终整套与精确远端CI/PG/HTTP结果待补§4。
- 中间一次Skill unit profile与新增RED测试并行，返回FAIL，已保留，须最终稳定源码重跑后独立记录，不用较早单测PASS覆盖。
- 首次目标审计发现六MHKA已改但旧差异账仍称字节相同，按实际字节原位修正为ADAPTED；不撤销历史M0，不把修账当语义验收。

## 4. 精确提交与远端证据（收尾更新）

- 业务源码已非强制推送 `b8e139c93d860c5cfdb997c9b9e25b208f944d43`。初次提交4bbc027推送被GitHub邮箱隐私保护GH007拒绝；仅本仓库改Codex noreply后重做尚未发布提交，未修改账户隐私配置或强推。
- 主CI [41992897348](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41992897348) / job127129102712 **SUCCESS**：六workspace类型、468PASS/4既有SKIP、133边界PASS、开发Skill11PASS、Next Build、20规格收集、鉴权0缺口、74目标审计errors=[]/HANDOFF_NOT_READY。
- 已提交精确源码SHA本地通过Skill static/typecheck/unit，独立JSON `CODEX_M5_RECOVERY_ST02_20261105_verification.json`；早期profile FAIL为新增RED测试施工期间结果，后续稳定源码PASS并未改写其历史。
- 源码HTTP [41992896865](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41992896865) / job127129101069 **SUCCESS**，实际19PASS/1官方Storage缺配置SKIP；日志MAB_ST02_CANDIDATE_HTTP_PASS、MAB_HTTP_BROWSER_PASS，清理步骤成功。该新测试只有私人候选/无原件，**不证明真实L1生成note或L2完整回放**。
- 源码PG [41992897220](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41992897220) / job127129102048 **FAILURE**：旧矩阵consented_feedback夹具未携带现行consent/withdrawal_allowed，先于新增ST02断言失败；不能把本次PG标PASS。定向测试补丁 `d12f20da2cc876df41191b655e24dfff9a6ba025` 为两版夹具保留明确同意，并增加缺同意拒绝负例，业务守卫不变。补丁主CI [41993463899](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41993463899) / job127130936916 和PG [41993463958](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41993463958) / job127130937629 均 **SUCCESS**。PG真实日志有MAB_ST02_PRELIMIT_REPLAY_PASS（100候选＋自动note＋Owner边界）、MAB_STUDIO_REPOSITORY_PASS、K3_DB_TEST_PASS，测试迁移/回退及清理成功。
- 分析器实际处理本轮5条回执并生成3个UPGRADE_EXISTING/DRAFT_PENDING_EVALUATION草案：Material合同诊断1FAIL+1PASS、项目读取回放1PASS、反馈夹具合同漂移1FAIL+1PASS；不是新Skill发布，原输入和生成结果分别为同目录 `_experience.json` / `_drafts.json`。失败样本未计成功，未执行候选检查或自动修改方法。
- Codex H01显式读取canonical会话证据、H02精确源码static PASS、H03环境差异如实诊断、H04 production退出64、H05真实修复/测试/提交/回写已完成到本批受测范围。宿主工具版本未由接口公开，保持unknown；不宣称自动Skill发现、跨会话触发或CodeBuddy通过。**CodeBuddy HOST_NOT_RUN / DEFERRED_TO_CODEBUDDY_HANDOFF**。
- 独立审查两次发现并闭合自动note回放及LIMIT100挤出候选问题，最后定向复审无重要问题；真实PG与L1完整回放只按实际运行断言计证，不由审查通过推定。
- M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY；正式Gate/生产/外发/费用/Owner体验及M6—M8所有HOLD不变。

唯一下一优先：继续原M5/ST02真实原件L0→L1→L2→自动reading_note的PG/HTTP首次与回放、撤权正反验证；再接用户材料选择与ST03，不跳过来源/资格依赖，不重复ST01。

## 5. 权威读取版本登记（首次基线Blob，仅内容变化或需补证才重读）

| 路径 | 基线Git Blob |
|---|---|
| `AGENTS.md` | `1ae97ba50b8c29d0e63a5294759dba3cbdc2e460` |
| `CURRENT.md` | `f62810f2131e97bae333ffc993faa808d6e6164a` |
| `OWNERSHIP_MAP.md` | `62993e03095d1f1cec13bcdafc0979644cb9f046` |
| `.agents/skills/mohen-dev-continuation/SKILL.md` | `54431250e8056f8113508e73ba40e56989619b0e` |
| `.agents/skills/mohen-dev-continuation/references/task-tool-environment-map.json` | `6645ae6fd9badf3144d2e4bc033d6bdf01860826` |
| `.agents/skills/mohen-dev-continuation/references/HOST_ACCEPTANCE.md` | `0c9cc540eecf6b4e8e0b346b9460e5d67cb364c5` |
| `tasks/implementation/MAB/PLAN.md` | `2781a955fd0cc0d10ad352d0d4a4a3a08c85e8a3` |
| `tasks/implementation/MAB/progress.md` | `dbbe4c90883f09f527def498b2e350828b222459` |
| `tasks/implementation/MAB/target-diff.csv` | `6fc68f613d81ca60875bf9582734805811444542` |
| `tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md` | `d1cdeda6893c5498a23abb5c7ac3c3ddc2d95fba` |
| `specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md` | `5fea854f0a1f99d69274ce2a0be652ae7d8911aa` |
| `specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md` | `0baf7ad220a37fe8d11b042a6ad43d9b0b488008` |
| `specs/SYSTEM_RUNTIME_ARCHITECTURE.md` | `1416984966fe0152ece8c32e8f5c7c61e9417f0f` |
| `specs/API_TOOL_CONTRACT.md` | `0f8d72d9f7521b87487636dad361e7f22df65c22` |
| `specs/SECURITY_ACCESS_CONTRACT.md` | `041e7a2fa01b38b822a27af1a96f95d137b2709c` |
| `governance/mhka/MHKA-00_Governance_Charter.md` | `d318d9b6bcfdd51cb49acd322269f0809bcb4aaa` |
| `governance/mhka/MHKA-01_Value_and_Strategy.md` | `2fe9641cdfb0d354300c2cc464e893ebddf21b74` |
| `governance/mhka/MHKA-02_Humanistic_Product_and_Experience.md` | `92caa84b3622cfb1d8f6bc61baab649bc27c340a` |
| `governance/mhka/MHKA-03_Knowledge_World_and_Data_Architecture.md` | `33444c93f6e95106a091fd07748a31c4ab36cada` |
| `governance/mhka/MHKA-04_Agent_and_Professional_Capabilities.md` | `1adfc849a2643deea5bf4bbf6c76464808df9a83` |
| `governance/mhka/MHKA-05_Software_Engineering_and_Operations.md` | `1c2d1c685ffcd308417423114e391c60f96e1138` |

本轮只按任务需要读取章程/合同相关条款；上表记录对象版本，不表示每份均全文阅读。后续仅原账/Skill本批变更内容重核。

规范冲突记录：SYSTEM_RUNTIME_ARCHITECTURE §2旧文仍有工程切换前C0—C4现行的措辞；按本轮Owner裁决、根AGENTS和MHKA-00优先级使用MHKA，不将该历史措辞作为新工程许可，不扩散修改无关合同。

## 6. 检查点与唯一接续

本批三项操作完成，含必要的测试失败修复，不再启动新功能。业务b8e139c、夹具补证d12f20d均已入main；精确CI/PG/HTTP分别核证如§4，最终验收回写仅文档/脱敏证据。工作树收尾须clean，HEAD与origin/main相同；旧work@759dbbd保留，无独有未推送源码。

接续指令：从最新main读取本回执§4和原MAB最新进度；直接继续ST02真实原件L0→L1→L2→自动reading_note首次/回放/撤权PG与HTTP验证。继承已通过候选HTTP和LIMIT100仓储断言，不重做ST01，不提前签ST03；其后才接材料选择与AnalyzeAndSaveCandidates。按同一开发Skill最多三项操作形成下一检查点，无需Owner重发任务书。


## 7. 2026-11-05｜M5全量剩余项复核与施工回执（续接7246ec0，非全量准出）

本轮按原PLAN M5六分母逐项复核，不以检查点替代完成；具体剩余依赖及分类见PLAN置顶本轮核销表。跨额度中断只继承已落盘改动和日志，不覆盖旧work；中断前未终态单测不作PASS。三批源码51f1234/82afee6/14b4d2c未改生产Schema、Bucket、权限、Key、Gate或Registry。新helper/test是实际源码，不是重复权威文件。

### 7.1 实际验证与失败保留

- Node24.19.0/Git2.52.0，固定corepack pnpm9.15.4 frozen安装，锁文件不变；六工作区Typecheck PASS。
- 新逻辑先RED后GREEN：Admin4FAIL→定向26PASS；a0014FAIL及媒体7FAIL→GREEN；改稿/Provider结构19FAIL、preview5FAIL→GREEN；真实getTaskStatus对象/字符串CP与幂等旧正文泄漏3FAIL→GREEN；stages错误关联4FAIL→7PASS；media-selection与候选接口3FAIL→4PASS；开发triage新增3FAIL→9PASS（全Skill14PASS）。所有单测均为工程隔离，不是原件资格。
- 最终完整无联网单测`CI=true pnpm test:unit`：567PASS/4既有联网SKIP；边界133PASS；类型PASS。第一次完整本地默认CI未设，Commons真实联网降级FAIL，另3条media新RED施工中FAIL（550PASS/2SKIP）；没有把实网失败改PASS，最后按现有CI隔离模式4联网SKIP。额度中断的一次检查无终态，不算通过。
- 实际本地PG17.11一次性合成实例标记codex-k3-isolated：原`test-k3-db`完整PASS，新增Admin101资产分页/搜索/Owner/游标边界实际执行；K3_DB_TEST_PASS，711旧行不变，迁移重放/回滚失败关闭、研究恢复/当前资格撤权均有原runner断言。Storage配置缺失仍MAB_PRIVATE_ORIGINAL_STORAGE_HOLD，**无真实原件新增验证**。
- PG首两次初始化失败分别因官方entrypoint初始化仍用默认socket，保留日志；未复用失败实例，查因后改工作流相同/var/run/postgresql映射，第三个合成实例成功。无生产容器或数据库受影响。
- 最终Chromium `/usr/bin/chromium` localhost真浏览器5PASS：撤权、服务失败/重试、focus与轮询、长章计时、当前出处面板/关闭返回。HTTP目录由测试显式合成拦截，不代验真实G5/原件；新spec纳入原MAB HTTP runner和workflow路径。Watch旧码最初RED受环境影响未执行；后补相关探索假tab enabled断言实际RED。自动审批拒绝过一次覆盖活动Watch文件以回跑旧码的可选操作，理由保护未提交现场；未执行、未覆盖，不把它声称RED证据。
- 独立复审未发现新增材料重验/Owner join/Admin游标确定安全bug，但明确指出导演外发恒HOLD是**未完成的受控执行适配**，不能归为全量工程已完成或仅外部数据缺失。本轮保留该未完成事实；正式外发/支出授权来源没有在仓库取得（现有plan/delegation仓储声明不授执行权），已向Owner询问该现有业务权威来源，不能自行建立新许可或假造授权正例。

### 7.2 产品能力/19组件责任，不吞掉分母

| UI项 | 本轮实际/继承 | 未达条件 |
|---|---|---|
| W01/W02/W08/W11 | 同已发布WorkRevision的轻量图文/章导航/播放语义，失败关闭和重核；不造第二正文 | 真实作品/G5/媒体+完整人文体验仍待验 |
| W03 | 作品时码与历史时间分开；未伪造历史变化轴 | 合法历史时间资产/变化证据及完整组件未验 |
| W04/W06/W07 | 既有合格读/低覆盖退路保留，媒体现行权利收紧 | 真实空间/可比口径/关系证据及专业表达未准出；不是已实现全组件 |
| W05 | 继承私有原件工程接口；本轮不造书影 | 真实合法原件+精确定位+展示权DATA/GATE_BLOCKED |
| W09 | 未接模型就不伪装对话成功 | 外发/支出/受控执行适配未接通 |
| W10 | 当前已发布章的出处字符串可打开/关闭、无出处禁用，保留章位 | 不冒称可返原件/逐字locator；真实Evidence详情资格独立 |
| X01/X02 | EXP暂停但长期入口/OriginSnapshot/返回版本合同及S01—S08保持 | 不启动完整EXP/UXD-01；不算本轮组件运行PASS |
| C01 | 私有Admin/资产API可检索分页，素材目录基于真实savedWork，失败可见 | canonical媒资选用仍需精确修订/动作权绑定，POST只安全拒绝 |
| C02 | 方案比较/支持边界保存和结构验证；项目快照/ref绑定 | 正向模型执行受控适配未完成，不能用恒HOLD充作READY |
| C03 | 局部字段/索引/类型/时码/CAS/引用保护和其它节拍保存 | 真实历史含义改变须回H1/D/G，技术校验不代审 |
| C04 | 继承不可变保存/fork/restore/CAS；preview no-store | 主工作台完整恢复/对比体验未全验，不能用API存在签体验完成 |
| C05 | 投稿同rev、审核/G5/rights不同谓词；旧假选材已拒绝 | 正式导出/发布须许可，不伪造导出服务成功 |
| F01 | 缺口明确“已识别、尚未提交”，不造工厂进度 | 正式请求/回流依赖ST02→ST03→ST04，仍按序不提前启动 |

生产D00—D05、L0—L5、G0—G5、63方法与现有产品Skill/Registry保持；本轮是实际产品执行器安全/状态/交互适配，不新增产品Skill。Studio工作资产候选及WATCH合法消费与CTX-ENG方法严格分离；EXP S01—S08、跨域比较/连续追问/证据缺口长期准备未删除。

### 7.3 开发Skill、恢复与下一步

同一canonical升级v0.2.1，loader/map/CLI/guard/tests同步。新增显式worklist的四类阻塞/依赖传播、连续两次同证据失败暂停及替代READY拓扑顺序（不执行）。本次Owner全量授权下，3操作限制为每批检查点，不再错误当整轮停止。原回执分析与5样本/3草案保留，本轮真实脱敏经验追加并生成新的不可执行草案；不声称自动宿主采集/语义发现/自动评价准入。CodeBuddy仍HOST_NOT_RUN不阻断。

回滚：非强制revert上述源批及Skill批/文档后继（或按文件受控撤回），不得回滚出已发现越权泄露、假成功或撤权复活；如无法保留安全修复则关闭受影响入口。PG仅合成数据，由runner清理；源/回执/合法资产保留。无需生产SQL/Key/Bucket回滚。

最终提交/精确CI见本节收尾。M5整体HOLD；ST02真实数据依赖和ST05受控执行适配（工程未完成＋有权输入/支出契约缺席）分别记账，不混成“均已完成只等生产”。这是一份完整可追溯工程检查点，**不是原M5全部准出或全部READY完成的声明**。

本轮Skill提交c55da7c（v0.2.1）；原5回执/3草案历史条目保留，追加4条真实脱敏工程经验，现9回执/7份不可执行待评价草案。分析器实跑成功，未自动准入。目标差异账仅将实际已变kad1-policy.d.mts原“字节相同”改ADAPTED；审计由HANDOFF_DECLARED_SHA256_MISMATCH定向修正后errors=[]/HANDOFF_NOT_READY。25条HTTP规格收集通过（不是25条实际HTTP PASS）。

### 7.4 最终精确远端核证与补丁

- 源批`22b8c1ca0de991306114206b73cc19d4a9f7c0aa`：主CI [42035692765](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/42035692765) SUCCESS（567单测/4旧SKIP、133边界、14Skill、类型/Build/严格鉴权）；PG17 [42035692988](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/42035692988) SUCCESS（新增101资产分页与原仓储/撤权/迁移回放/回滚，711旧行不变，K3_DB_TEST_PASS）；HTTP [42035692756](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/42035692756) SUCCESS（24PASS/1官方StorageSKIP，合成DB清理成功）。
- 最终相邻检查发现`works/:id/status`仍用旧done布尔值，与本批`stages`当前材料/回执不一致；4项RED→11项定向GREEN，将status改为同一Owner/当前材料/真实回执的状态投影，保留显式guard/no-store和原revision元数据wire。补丁`eec13b2373ac74101f497be40f928d2b89d40690`已非强制推main。
- **最终源码主CI [42037766176](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/42037766176) SUCCESS**：571单测PASS/4旧联网SKIP、133边界PASS、14 Skill PASS、六workspace类型/Next Build、25规格收集、严格鉴权0缺口/0无Owner、74目标errors=[]且HANDOFF_NOT_READY。
- **最终源码HTTP [42037766124](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/42037766124) / job127280273773 SUCCESS**：24PASS/1官方Storage缺配置SKIP，MAB_HTTP_BROWSER_PASS、MAB_HTTP_SYNTHETIC_DATABASE_CLEANED。补丁未改DB代码，PG按前一精确22b8c1c证据继承，不假称本补丁另跑PG。
- 本地localhost Next测试服务及本轮三个合成PG容器/卷已清理；原work@759dbbd干净，独立源码副本收尾clean。运行中日志一次只读下载被存储端拒绝，未重复或绕过；最终完成日志正常核实。未执行生产SQL/Storage/权限/Key/正式Gate/外发或付费调用。
- 最后仅证据/状态补记使用`[skip ci]`，不能称其又跑过完整CI；实际代码/测试精确源为eec13b2。核证JSON在原文件追加本轮worklist及triage，ready=[]但complete=false；其中DIRECTOR-EXECUTION-ADAPTER与CANONICAL-MEDIA-SELECTION-ADAPTER明确为未完成工程，依赖未落实的有权外发/费用来源及当前媒资权利/修订绑定，不能用机器分类掩盖代码缺失。其他独立修补已实码/受测，仍不签M5全量完成或降低原HOLD。尚待Owner回答现有可信外发/费用授权来源；该答案未到前不凭客户端声明/API key接通模型。

**下一步**：先落实现行业务可信授权源/契约，再接通受控导演执行与规范选材写入（保留原Registry/Tool/预算/权限体系，不造平行许可）；合法真实原件与隔离身份齐备后完成ST02首次/回放/撤权，再依ST03→ST04顺序。原六项完整验收、19组件/13资产专业语义/真实Owner体验及全部生产条件仍未全部达到，M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。不可将本次完整GitHub检查点称为M5全部任务准出。
