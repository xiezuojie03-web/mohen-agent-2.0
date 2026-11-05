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
