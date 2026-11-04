# 墨痕 MAB｜Codex 当前执行交接书（唯一现行入口）

> **2026-11-04 最新接续点：M5**：M4受限工程有条件准出，完整任务核销/实测/固定M4-C01—C04见 `tasks/results/MAB/CODEX_M4_CLOSURE_20261104.md`。DAG、逐项候选、Owner计划、撤销/lease/CAS及恢复已施工，不重做；真实双主体/生产/费用和ST九动作/13类专业业务条件继续HOLD。按PLAN进入M5，接续既有Studio/Admin/WATCH，不公开未合格内容，不把条件消失成PASS。额度中断前后工作已原位保全并实测；下方早期当前M4条目为历史。

> **2026-11-04 M4最新已施工**：Owner永久回执逐item只读T7核验已接M3精确资格及祖先撤销，既有Owner GET支持选定回执查看缺口，Web无Producer凭据。见 `tasks/results/MAB/CODEX_M4_RECEIPTS_20261104.md`；不要重复实现此接线。M4仍当前施工，完整DAG/T1—T6/真实混合/费用与恢复未整体准出，所有上游固定条件保留。

> **2026-11-04 最新接续位置**：M3独立服务已在标记隔离环境完成工程闭环并有限条件准出，当前唯一施工阶段转为M4。先继承 `tasks/results/MAB/CODEX_M3_SERVICE_20261104.md` 的六项核销、实测与固定M3-C01—C03；M1/M2既有条件不变。M4直接使用既有独立服务/当前资格与撤权接口，不重做M1—M3；生产激活、真实专业审签、私有外发及费用仍按原条件执行。下方较早“当前M3”只作历史记录。

> **2026-11-03 Owner后续施工裁定（最新）**：按M阶段顺序收口，允许具名有条件准出但最终标准不降。M1已核销为`M1_CONDITIONAL_EXIT`（仅代码/标记隔离环境），生产固定条件M1-C01—C04仍阻断新生产写入；M2已有限条件准出（仅已证UTF8待审候选与长期资产最小持久层；M2-C01—C03保留），唯一当前收口阶段转为M3。最新交付和实际接收证据见 `tasks/results/MAB/CODEX_M2_L1_20261103.md`。先读PLAN“M阶段有条件准出与顺序收口”及progress最新条目，保全M3—M5已有成果并暂停新增横向功能。M2交付持久待审资产给M3，不以M3正式审核已完成作M2工程前置。本文件其余“并行施工/整体HOLD”等较早描述按本裁定的范围解释，不取消任何最终或生产授权条件。

> **最新 Owner 执行权裁决｜2026-11-03 20:23+08:00｜Codex 接手，优先于本文早期 ChatGPT 接力描述**：Owner明确要求再次转回 Codex 工程施工。本文件是当前唯一 Codex 接续入口。聊天模式施工已结束，并已全部推送到远端 `main`；转交时远端代码及施工记录已核对到 `9f4e1485150c02db48425525a435c9527104b390`，对应主 CI [41638572066](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638572066) **SUCCESS**。此 SHA 是核查时的基准而非锁死的工程版本；Codex 开工须再次 fetch 最新 `origin/main`。执行权转交 ≠ M1—M8 正式准出或生产迁移、付费模型、独立 Reviewer 启用授权。

## 当前正式接续差异：已落 main、无需重做（2026-11-03 20:23+08:00）

| 施工批次 | GitHub 代码 SHA / 验证 | Codex 要继承的成果与限制 |
|---|---|---|
| Admin／HP11 | `ea4abd51`、`c949a082`；CI [41628855225](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41628855225) SUCCESS | F05 在当前 Owner 权限内读取 Studio 项目、私有资产、精确修订/使用事件及来源依赖引用；不是跨 Owner 运营授权或专业 G5 |
| M3 精确 Reviewer 回执 | `f8ae5d0a` → 测试修复 `f5cd2d38`；CI [41628357443](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41628357443) SUCCESS | 回执必须绑定 job、Reviewer、consumer 和精确阶段输入输出；旧合成回执缺字段的 CI 失败已修正，真实认证服务仍未上线 |
| M3 当前知识资格 | `2352c368`、`faddc2a4`、`10b7a3dd`、`f79dc436`；隔离 PG17 [41637142076](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637142076)、CI [41637141950](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141950)、M1 HTTP [41637141998](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141998) 均 SUCCESS | Producer legalInput/passed、G0—G5 lineage 和 read_model 消费统一精确 consumer/purpose/非空scope + `control.qualification_allows`；旧 PASS 不能继承，祖先撤销立即拒绝；生产 Reviewer 仍 HOLD |
| M2 Runner 续跑 | `64eed3f55d8a6f6d21d1b62c0629f139e5dfe341`；CI [41638126713](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638126713) SUCCESS | `run.mjs` 受控 `--resume-input-file` 与 `MOHEN_TRUSTED_RESUME_INPUT_DIR`；冻结 JSON、POSIX 权限/容量/符号链接、私有请求字段和选定阶段 Adapter 核查。依旧需要合法 Owner/worker、真实原件字节、注册启用、独立授权及 Gate |
| 计划与单一记录 | `79beec85`、`9f4e1485150c02db48425525a435c9527104b390`；后者 CI [41638572066](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638572066) SUCCESS | `PLAN.md`、`progress.md`、`CURRENT.md` 原位更新；完整测试与局限按各批 SHA 追溯，不能旧报告覆盖最新记录 |

**Codex 下一步唯一优先入口**：先核远端 main 最新 SHA、工作树、CI 和现行 `PLAN.md`／`progress.md`；在 M2 已有受控续跑入口上，补接 **合法 Owner 会话 → 私有原件真实字节与精确source-version → 唯一 Runner D01—D03 → L1读取单位／L2证据／L3有据主张 → 独立 G1—G3**；并行把 M3 独立 Reviewer 认证、专用 DB 登录、签发／撤销和当前消费资格服务实现并在隔离环境正反测试。继续完成 M4 真实混合 Agent、M5 Studio/Admin/WATCH 等既定任务，不另建权威任务树，不重新开发已通过的子能力。

**当前硬阻断**：正式 Supabase 私有原件候选迁移/Storage 桶、真实 Owner 到 Runner 的动态输入与私有 worker、独立 Reviewer/Signer 生产服务尚未完成；Studio 实际项目、G5 正式资格与真实作品消费未闭环。历史生产只读证据 `studio.projects=0`、`control.qualification_current=0`、`storage.buckets=0` 是 2026-11-03 11:31 UTC 的现场快照，Codex 应重新只读核验。当前生产 Registry 继续关闭；外部收费调用、受控生产迁移和发布不得因工具切换而默认授权。

**执行纪律**：基于现行 M0—M8／HP01—HP13 持续施工，优先实码、真实隔离测试和修复，逐批回写同一 `progress.md`、必要时更新 `PLAN.md` 与 `target-diff.csv`。只把源码到位、隔离验证、在线验证和准出分别记账；不删除 M1—M8 HOLD、不把跳过项视为通过。技术问题自主修复，只有产品方向、成本、正式环境/隐私外发的授权范围发生变化时请 Owner 决定。


**交接日期**：2026-11-03  
**交接决定**：Owner明确要求从ChatGPT聊天插件施工转回Codex执行后续工程，不再等待此前13个交接前工作包全部由聊天插件完成。  
**性质**：执行权转移及可继续施工的工程交接，**不是**M0—M8生产准出，不将PLAN §6B.3的技术HANDOFF_READY条件虚构为已经达到。  
**仓库**：xiezuojie03-web/mohen-agent-2.0  
**唯一基线**：GitHub远端main的**实时最新HEAD**，不可重置到本文件写入前的某个SHA。交接成稿前核对到main@2d6b47e3fa273987e13092543430c5eac00d54ad；本交接书及入口更新将产生更新的HEAD，Codex务必自行git fetch、确认工作树及git rev-parse HEAD。

## 1. Codex开工要求：先接续，不重做

1. 拉取远端main，确认默认分支及实际HEAD、未提交变更；如果本地分支与main分叉，先保全再对比，严禁强制覆盖受控变更或现有业务数据。
2. 按顺序阅读：本交接书 → tasks/implementation/MAB/PLAN.md（重点§5原M0—M8、§6A A01—A20、§6B HP01—HP13）→ progress.md → target-diff.csv → CURRENT.md → AGENTS.md → 权威专业合同、源码与测试。现有PLATFORM_HANDOFF_20261103.md是**较早的阶段性切换记录**，其历史SUCCESS、批准状态和此前SHA不可替代本文件新施工状态。
3. 这是**既有架构上的工程续建**。保留MHKA既定设计方向、D00—D05/L0—L5/G0—G5唯一可信生产链、现有Studio/Agent/体验与数据库成果。不要重做总体架构，不另造平行Gate、不新增第二套长期资产正文、不以改文档代替工程实现。
4. 目标是建设真正能研究、积累资产和创作作品的墨痕：**通史骨架＋局部深挖＋可复用知识资产**；从首个真实生产任务就坚持内部Agent与受控外部AI协作的混合路线。产品实施优先Studio与Admin知识资产运营，WATCH合法消费，EXP体验深化暂缓；历史文化与当下生活的**乐趣和意义**都要保留。
5. 施工中逐批更新原位PLAN.md、progress.md及target-diff.csv，保留原M0—M8和6B工作包结构；每项区分CODE_PRESENT、VERIFIED_ISOLATED、VERIFIED_LIVE、HOLD、DEFERRED_ENV，不得把源码存在、Vercel READY、旧代际PASS、mock测试PASS冒称当前正式G5或产品准出。无必要的阶段确认可自行判断、测试、修复，只有用户应决定的成本、权限、生产/产品重大变更再请求确认。

## 2. 权威索引与当前输入

- 任务书：tasks/implementation/MAB/PLAN.md。
- 最新逐提交施工账：tasks/implementation/MAB/progress.md；此文件长、按章节读取最新条目，旧回执只用于对应SHA。
- 74份冻结目标差异账：tasks/implementation/MAB/target-diff.csv；53 REVISE + 21 CREATE；截至本次交接检查，19个CREATE目标按冻结原文进入main，**另2个缺席**：tests/unit/kad1-policy.test.mjs、tests/unit/kad1-route.test.mjs。53 REVISE及已落仓目标仍要**双向语义核销**，不能按路径存在视为完成。
- 自动差异审计：node scripts/audit-mab-handoff-targets.mjs --out /tmp/mab-target-audit.json；脚本测字节差和缺口，不替代API、DB、Gate与产品的正反验收。
- 历史隔离有效证据：tasks/results/MAB/M2_SECURITY_RECEIPT_20261102.md及相邻evidence；只对当时提交与环境有效。
- 早期设计及来源：tasks/implementation/MAB/inputs/及其中的原交付ZIP/增量交接指引。不得直接将repo_target旧工程镜像覆盖现在的main。
- 旧UI参考：tasks/results/MAB/archives/20261103_UI_RECOVERY_UNAPPLIED.patch，**未经差异审查不得直接git apply**。
- 工程入口：AGENTS.md现在仍指向旧C0—C4现行路由；六份governance/mhka/MHKA-00—05虽然已按目标文本放入main，但设计就位**不等于M8权威入口已切换**；必须满足受控M8原子切换条件。
- 正式专业合同：specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md、specs/AGENT_PROFESSIONAL_CAPABILITIES_CONTRACT.md、specs/SYSTEM_RUNTIME_ARCHITECTURE.md、specs/experience-ui/H1_H2_H3_AND_COMPONENTS_CONTRACT.md及D/L/G现行规范。

## 3. 实际完成与未验收的状态

| 原阶段 | 可继承的实际成果 | 下一步必须补证/实施 | 当前裁定 |
|---|---|---|---|
| M0 | 现状盘点、原目标差异和M0审查 | 更新差异账的当前语义证据，不重启M0架构盘点 | M0审查PASS |
| M1 | 身份、RLS、匿名访问、跨账户/禁用测试、旧入口失败关闭已有代码及分批隔离证据 | 当前main实跑Owner/跨账户/失效/登出/旧凭据失败/恢复；生产安全最小角色核销 | 正式HOLD |
| M2 | 私有原件候选、真实PG17/官方Storage隔离回执、UTF8字节证据桥、唯一Runner适配、长期Studio资产修订CAS | 生产迁移尚未获独立授权；D00—D03真实原件与权限链、恢复与当前main测试，资产links/use_events正式授权 | 正式HOLD |
| M3 | 独立Gate SQL合同、资格读取客户端、撤权传输与候选Reviewer服务处理器 | 真正独立Reviewer身份、Signer DB角色、受审签/撤权与消费者即时失效 | 正式HOLD |
| M4 | 工具注册、预算预约/结算、收费待核HOLD、Studio追问累计预算、生产Runner启动前预占，候选委托与回执合同 | 当前main完整测试；精确逐步骤恢复、跨进程幂等、Runner终态结算、T1—T7、真实混合协作 | 代码部分完成、运行HOLD |
| M5 | Studio修订、Admin精确WorkRevision审核、候选作品发布原子指针、WATCH资格失败关闭、私有资产历史只读 | 真正可运行Studio/Admin、严格G5/媒体rights/consumer资格、可视化知识条目与合法WATCH全链E2E | 整体HOLD |
| M6—M8 | 现有合同/设计及局部工程基础 | 全85 API/152动作源测映射、双题真实A→B复用、受控MHKA入口/权限/部署原子切换 | 后续任务，未准出 |

**非常重要：** 客观上交接目标本身尚未达到PLAN §6B.3所说的技术READY；本次为Owner主动决定转移到Codex继续完成剩余工作。不要因交接文件已写入就把项目改为HANDOFF_READY、把M1—M8改为PASS或将生产安全条件视为已授权。

## 4. 最近一轮聊天插件施工：源码已落main，必须首先运行验证

**HP08/M4费用与恢复链**：

- apps/web/lib/studio/tool-ledger.ts：每次invocation_id绑定reserve/settle/HOLD；外部/LLM/production的不确定执行不得释放可能已发生的收费预算；settled回执失败不得退费；无ledger的production工具拒绝。注意：**对无ledger的LLM/external调用是否也需要拒绝**，应依据调用链及现行合同核查，不要只看production一类。
- apps/web/lib/studio-research.ts：创建任务保存spent/reserved/ceiling；不确定收费任务进入不可自动重放HOLD；追加研究消息使用累计预算及done→running CAS；resume必须有可复核的逐步骤位置及明确追加授权；requestProduction先预检、CAS抢预算、持久reserved回执，再触发Runner。
- apps/web/lib/studio-production.ts：新增getProductionBlocker；当前productionBlocker仍明确返回production_input_binding_required，不是完整签名输入适配，**不得为跑通而删掉阻断**。
- apps/web/app/api/studio/research-tasks/[id]/messages/route.ts 与 .../resume/route.ts：失败/待核返回显式409，恢复需明确预算。检查身份、输入、状态和并发。
- 新测试：tests/unit/mab-hp08-tool-ledger.test.ts、mab-hp08-research-resume.test.ts、mab-hp08-studio-routes.test.ts、mab-hp08-production-reservation.test.ts。以上近期提交**尚未取得实际最新main Vitest/PG/Next构建全绿凭证**，优先运行并修复，勿引用较早READY冒充本批通过。
- 需要特别核实：预算参数是否由真实授权服务持久审批、研究任务旧checkpoint迁移/兼容、checkpoints的原子性和原子领取结果、日志不泄露原料、生产run启动后如何在唯一真实terminal receipt中结算而非只标started。

**HP03/M2长期资产与Admin知识可读能力**：

- packages/data-access/src/studio-asset-repository.mjs：保留原不可变revision、head CAS、内容hash和请求幂等；新加同项目/Owner精确资产版本历史与精确revision使用事件只读方法。
- apps/web/app/api/studio/assets/route.ts：新增history=1与use_events=1私有查询；不得因历史查询给跨用户或跨项目的实际素材权限。
- 测试：tests/unit/mab-hp03-asset-history-route.test.ts、tests/data-production/studio-asset-repository.integration.mjs（新增跨Owner版本/使用记录负例）。**待实跑隔离PG**；伪造的use_event字符串不等于已授权知识复用。
- 仍缺真正的项目授权复用、使用事件写入服务、Admin逐知识条目检索/追根、源→L证据→正式资格反查。

**HP07/HP11/HP12/M3—M5**：

- apps/web/lib/read-model-bridge.ts：六处视觉数据读取改用当前资格及qualification_allows，但尚需真实独立Gate角色、准确revision/purpose/consumer/scope/rights正反实测。
- apps/web/lib/gate-review.ts 与Admin审批路由/前端：要求精确WorkRevision ID且该修订属于该作品、仍submitted；作品Reviewer决定**不是**专业G5。
- apps/web/lib/gate-revoke.ts：旧Operator直接撤权已安全返回HOLD，两个旧HTTP端点返回503；不得重新启用直接UPDATE签名审计的旧路径。独立传输/处理器位于pipelines/data-production/orchestrator/independent-gate-revocation-*.mjs，尚非实际已授权服务。
- apps/web/lib/work-publish-qualification.ts：**故意返回independent_g5_required**，因为目前尚无WorkRevision所引用正式L5分面到当前G5的精确合法映射；故新增发布与公众WATCH可能为空。必须先建设按对象/修订/用途/媒体rights/consumer逐次校验，再有界开放；**绝不可注释掉失败关闭或用作品Reviewer approved替代G5**。
- apps/web/lib/publication.ts：精确修订、原子发布与待审队列已修过竞态，但需要在真实Postgres上确认最新审核决定、发布指针和知识资格的同一性；asset-reflow.ts仍有无实质回流的情况，需完善。
- 六份MHKA、四份专业规范、两份KAD1策略文件及六份KAD1候选SQL已按冻结来源落main；其中SQL**只入库为源码，未授权不得应用生产**。target-diff.csv的19项SHA256字节匹配只是设计文件对位，并非M8运行生效证明。

## 5. 生产环境事实与不可越权边界

截至2026-11-03**上次只读核查**，Supabase mohen-cloud（项目ID fwrhxddcpkibsnmddcfl）为ACTIVE；studio.private_originals不存在、Storage桶0、control.qualification_current为0条，正式Reviewer绑定/专业撤权函数未应用。保留原98条旧原件登记、历史Gate审计，不可把历史记录误认为当前专业G5。**这些是历史快照，Codex进入时应重新只读核查，不推断后续是否已有变化。**

- 候选M2：supabase/migrations/20261102140000_mab_m2_private_originals.sql 与 20261102145410_mab_m2_evidence_bridge.sql及其rollback；须先得到Owner针对真实生产迁移、私有桶、核验密钥的明确批准，先备份及权限核查，应用后开关先保持关闭，合成/授权样本隔离测试通过才考虑开启。
- 候选M3：supabase/migrations/202611010900_k3_independent_gate_authority.sql。独立Signer角色及Reviewer身份必须与Producer、Web Operator分开；候选签审、当前资格、吊销、消费者撤权即时拒绝均需实际验收。
- KAD1新增三个migration及配套rollback只是设计候选；不得把入GitHub视为部署批准。
- 旧public/uploads与匿名素材访问保持禁止；服务账号不得绕过RLS、消费用途和所有权控制；涉及私有资料外发的OCR/VLM或外部AI先核实际权利及明示成本上限。
- Supabase安全Advisor曾报告publication.publication_schedules无RLS，但当时anon/authenticated无该表直接权限；需检查当前权限与真实调用路径，不能误报“已公开”，也不能盲目开启RLS导致合法调度故障。
- 生产DB密码轮换状态应以新的可验证事实为准，不要根据历史提示让Owner无必要重做；仅在旧凭据有效性仍未证实或出现风险时按安全规程处理。不得泄露或提交任何密码、连接串、签名密钥、cookie及私人原文。
- 外部模型/Provider费用、账户权限、用户正式发布和真实生产Gate激活**没有借交接自动获得新授权**。不为了跑通测试擅自启动收费Provider或真实数据生成。所有正式环境修改应具备备份/回退、正反证据和必要Owner确认。

## 6. Codex接续执行顺序：13工作包不重新研究

### 第一轮必须立即做（HP01+已落源码验证）

1. 从最新main创建可回滚工作起点并记录git SHA；先运行无外部费用的固定流水线：pnpm install --frozen-lockfile；pnpm -r typecheck；pnpm test:unit；pnpm test:data-production；pnpm guard:auth:strict；pnpm build；node scripts/audit-mab-handoff-targets.mjs --out /tmp/mab-target-audit.json。
2. 如有失败：核对新增加的HP08预算、追问与resume测试及HP03资产历史测试，优先修真实产品代码或真实测试错误，不通过全局skip/mock假PASS；附每项测试命令、日志摘要、commit SHA和修复提交。
3. 查GitHub Actions主CI、M1隔离HTTP、M3独立撤权的**真实push run ID与logs**；当前ChatGPT GitHub连接器仅提供PR触发运行查询，无法用0条返回判定push运行不存在。Vercel较早提交READY只代表对应SHA构建成功，不是最新main全套验收。
4. 在独立PG17/官方Storage的明确测试环境重跑受影响数据库、API及Chromium正反流程；不得把旧本地/合成环境测试库误接生产。保留测试输入、schema标识、角色及恢复回执。

### 第二轮P0（HP02—HP07、HP12）

5. M1合法Owner/禁用/过期/跨人/撤销/旧凭据失效及恢复，按服务身份与表级/函数级权限逐接口验收。
6. M2长期资产/原件真实字节→源版本→读取单元→候选证据/解释→唯一Runner D00—D03，按精确源、精确revision、rights绑定，不以memory引用、batch-level或首条史料伪装正式出处；恢复/幂等/备份如已有旧证据先比对最新差异再补测。
7. M3独立Reviewer合法会话、签署、撤权、依赖失效、不同consumer/purpose/scope与rights拒绝；接入M5合法发布和WATCH逐请求当前资格，先完成受控审核/资格链，再考虑对外消费。现有旧撤权端点503和新发布资格HOLD保留至真实链验证。
8. HP12新发布、public/evidence/visual_stage/Agent/WATCH消费一致性，与Media license、源引用、撤权和缓存失效负例合并验证。

### 第三轮P1+冻结（HP08—HP13，M6—M8依赖明确）

9. HP08/09补唯一root任务DAG、DelegationEnvelope/ExecutionReceipt、T1—T7收包、模型/工具最小外发与预算终态核销；外部AI/内生Agent从第一真实任务即混合协作，但未获授权不调用收费服务。
10. HP10/11完成Studio真实自然语言研究与作品导演/修订持久闭环、F05 Admin可视化精确知识条目/来源/Gate/使用史/缺口管理；WATCH保持简单合法消费；EXP不抢占当前优先级。
11. HP13按74目标及A01—A20、85 API、152 UI动作逐项建立当前路径、设计/实现差异、真实权限/正反测试、结果及回滚；剩2个KAD1目标测试需按**真实合同与可运行预期**接入，不能直接照搬旧镜像造成虚假PASS。仅在可合法签署时标相应阶段准出。
12. M6全量闭环后，以现行KAD5唯一双题A“隋唐大运河及江南水路连接”→B“宋代江南运河沿线的城镇与日常生活”验证真实A资产@revision被B有权引用并产生新知识，而不是重复摘要；完成运营/Owner体验与M8有备份的MHKA路由原子切换。不可提前执行。

## 7. 施工质量、成本和交付报告

- **不要重新写研究报告代替施工**。依照已有权威任务与差异账持续实施、实测和修复；遇实际环境不可控的项目清楚记录DEFERRED_ENV、准确原因、需要谁批准、所需验证和回滚。
- 每个批次在progress.md原位记录：基准SHA、变更文件、原因、测试命令与真实结果、未覆盖负例、生产权限/成本变化、回退方案；必要时更新PLAN.md与target-diff.csv。不要随意改变权威文档阶段树或消除历史任务。
- 优先保持低费用：能本地/隔离测试的不调用实际外部模型；保持原预算边界，未获得新成本批准不得新增收费调用。
- 任何Go/No-Go必须使用证据：**源码已提交≠运行通过；mock PASS≠真实数据库PASS；Vercel READY≠专业G5/业务准出；Owner决定换平台≠生产授权**。
- 定期向Owner用简明中文提供四块信息：本批真的完成了什么、测试/证据是什么、仍有何风险、下一轮继续做什么。只有涉及成本增加、不可逆生产权限和重大产品方向才请求决策，其他工程问题自行闭环。
- 最终目标：Codex接续把PLAN §6B已定义13工作包收口到真正可验证的交付状态，随后在合法权限下推进M6—M8，不做无效反复补丁、不重开设计研究。

## 8. 交接回执（执行者开工时填写）

Codex开工后在progress.md追加：
- 实际读取的main HEAD；
- 目前本地工作树与远端差异；
- 第一批typecheck/unit/data-production/build/HP13审计及隔离测试的真实PASS/FAIL/SKIP证据；
- 首个P0失败的具体根因及已提交修复SHA；
- 未获生产授权而继续保持HOLD的开关、迁移和费用；
- 当前批下一步明确施工文件与验收标准。

**本文件是唯一当前Codex执行交接索引；历史PLATFORM_HANDOFF_20261103.md仍保留为历史证据，不与当前任务书形成第二套计划。**

## 9. Codex接续后已落成果索引（2026-11-03）

本文件§1—8保留原交接时点，接续施工后的实际状态以[progress.md](progress.md)最新逐批回执与[PLAN.md](PLAN.md)末尾增量为准，不能重复已验收工作或把本节当作新计划。

- [HP01首轮CI与授权边界修复](../../results/MAB/CODEX_HP01_20261103.md)。
- [HP02隔离会话撤销与真实退出](../../results/MAB/CODEX_HP02_20261103.md)：生产开关/迁移仍未激活。
- [M2官方Storage、精确证据桥及HP13两缺席测试适配](../../results/MAB/CODEX_M2_HP13_20261103.md)：原交接的“缺2目标”已补为可运行测试，74路径均存在但全语义未准出。
- [HP06真实低权Signer登录边界](../../results/MAB/CODEX_HP06_20261103.md)：隔离证据，不是正式Reviewer部署或G激活。
- [HP08费用授权拒绝、CAS恢复与崩溃HOLD](../../results/MAB/CODEX_HP08_20261103.md)。
- [HP08永久委托/待核回执与Owner只读HTTP](../../results/MAB/CODEX_HP08_RECEIPTS_20261103.md)：长期身份和费用UNKNOWN保留，仍不授权执行/外发/ACTUAL核销。

后续按既有HP09、HP10—12及未完成P0继续；完整DAG、T1—T7、永久工具账接线、Runner终态核销和真实Studio/Admin/WATCH闭环仍待工程验证。生产迁移、正式Gate及新增费用仍受原授权边界约束；M1—M8与HANDOFF_NOT_READY不变。

## 10. ChatGPT接续工程事实索引（2026-11-03，供下一次工程执行者避免重复）

Codex额度不足后的ChatGPT/GitHub工具施工仍延续同一`PLAN.md`/`progress.md`，不是第二任务书。本节只更新真实继承状态，后续执行工具以Owner最新指令为准：

- `ea4abd51` F05 Admin增加**本人有权访问**的Studio私有知识条目/修订/使用史只读入口；`c949a082`补来源依赖展示并原位归档；主CI41628855225成功。无跨Owner管理或正式知识资格承诺。
- `f5cd2d38` 加强独立Gate回执的job/Reviewer/consumer绑定且首批失败已修，主CI41628357443成功。
- `2352c368`、`faddc2a4`、`10b7a3dd`、`f79dc436` 完成旧PASS继承的Producer/lineage/read_model当前资格读取收紧（非空scope、精确用途消费者、上游撤权），最后主CI41637141950、独立PG1741637142076、M1 HTTP41637141998均成功；PG17为合成业务数据真实数据库隔离，不是生产Gate签发。
- `64eed3f55d8a6f6d21d1b62c0629f139e5dfe341` M2 Runner增加受控冻结stage输入文件与部分阶段Adapter一致性核查，主CI41638126713成功；Owner worker/真实原件/Stage Gate未接入，Registry维持关闭。
- 最新M1—M8与HANDOFF_NOT_READY不变：下一步优先在有合法权限的环境完成M2真实Owner+原件bytes/版本绑定→L1和证据桥→独立G；M3专有Reviewer/签发服务、当前G5消费者即时撤权；其后M4实际混合与预算、M5作品业务及M6—M8真实验收。不得因代码路径/CI存在而宣布系统可运行。
