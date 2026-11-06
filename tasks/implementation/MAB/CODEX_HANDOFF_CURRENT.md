# 墨痕 MAB｜Codex 当前执行交接书（唯一现行入口）

> **2026-11-06｜Owner最新裁决：M5全链垂直切片与API/模型调用授权（优先于下方全部历史授权状态）**
>
> - M5须验证至少一项真实历史文化作品的完整垂直切片：自然语言Brief→M4混合Agent/外部AI受控协作→合法原件→D00—D05/L0—L5/G0—G5→13类知识资产→H1/H2/H3+19组件→Studio修订→F05 Admin→独立G5/媒资权利→同一WorkRevision发布→WATCH合法消费与撤权。M4提供混合协作基础；M5做Studio/Admin/发布/WATCH；M6仍全量85API/152动作合同回归；M7仍KAD5双课题跨题复用；M8仍正式架构切换/Owner签收。
> - Owner已授权M5必要开发、隔离测试及受控真实研究使用现有Vercel/API Provider密钥（含大模型）；对现有Provider在M5范围内必要低成本调用无需逐次重复请示。若新增专业模型/Provider账号或密钥、订阅/额度/充值、显著扩大费用/批量调用，及时告知Owner具体能力、权限与费用。此授权取代此前单次DeepSeek OCR待授权状态。
> - 密钥仅服务端Secret使用，不写入GitHub、任务书、Codex提示词、日志、聊天正文或客户端；Vercel密钥不会自动进入Codex Cloud/CodeBuddy。Owner授权不替代逐来源权利、数据主体同意、Provider条款、purpose/input/预算绑定；不授权生产DB/Storage迁移、正式Reviewer/G5启用或生产发布。
> - **禁止提前启动真实全链实验**：ST01 Brief仅局部VERIFIED_ISOLATED；ST02原件字节未持久化、L0/L1/L2未验；ST03/04未准出；ST05受控模型执行器尚未实现，studio-creation的directorExternalProcessingBlocker恒HOLD，M4委托仓储只存委托/只收HOLD回执、不派发Provider；Tool Ledger现以内部credit而非真实Provider币种/Token成本核销。13类10+3矩阵非完整专业语义；H1/H2/H3及19组件未真实运行；正式G5/Reviewer和canonical媒资动作仍HOLD；M4真实混合协作仍受M1—M3原件/Owner/独立Reviewer条件约束。
> - 接续采用两条可并行工程线：A线完成真实原件与M2私有Storage/PG隔离、ST02 L0/L1/L2首次/回放/撤权；B线在既有M4委托/Tool Registry/预算/回执体系实现ST05受控Provider与真实成本，并先用合成输入完成代码/PG/HTTP正反。B线代码不等待A线原件，但A线来源/权利及M1—M3真实前置未就绪前禁止对真实材料外部调用。A/B就绪后按ST03→ST04，再完成13类专业语义/H1/H2/H3/19组件/Admin、正式独立G5/媒资权利/精确修订发布/WATCH撤权。关键代码、调用接线、权限/数据、PG/HTTP正反和真实输入全部就绪后，才运行一项真实作品端到端实验。详细裁决见PLAN/progress 2026-11-06条目；M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY保持。

> **2026-11-06｜卷次定位最新补证（优先于下方历史）**：已在progress/PLAN追加：NAJ 1663年《松江府志》item4252790 / NAJDA-292-0017第7册（73页、21.67MB、公共领域、官方可再利用）为正式source original；另有Harvard-Yenching同版v.7卷十四—十六的独立副本（78页、76,674,953 bytes、SHA256 5466a31f417f71bbeb909aed4defc2744db50b941b9f67f6caf56a1c3f49b39c），仅用于定位卷十五/十六水利内容，不能混为NAJ原件，且其v.7单文件授权尚未独立核实。NAJ与Harvard分页不等同，须先建立跨副本locator；NLC 1818版卷十五实为建置志古署，已排除。Harvard PDF无文本层。Owner单次DeepSeek Flash图像识读授权仍待确认；DEEPSEEK_API_KEY已在Vercel运行环境通过GET /models认证，不能假设Codex Cloud自动可读。ST-02仍HOLD；不重复搜索来源、不重复测容量、不批量外发，不应用生产Storage迁移。

> **2026-11-06｜最新Owner接续状态（优先于下方全部历史检查点）**：main当前文档基线见PLAN/progress最新记录。ST-02已选定国立公文书馆《松江府志７》（item 4252790；请款号292-0017-0007；73页IIIF manifest）；馆方官方二次利用政策允许数字内容商业/非商业复制、修改、再分发，无需申请。第3页IIIF派生JPEG曾在临时Vercel sandbox取得HTTP200/399,600 bytes，但未持久化，不能记STORED_VERIFIED；连续取页触发馆方403短时限流，禁止重复高频请求。识典古籍“水利”章仅作辅助转录，卷次/页码须对照原件核定。Supabase mohen-cloud Free真实容量核验：DB约18MB，Storage buckets=0/objects=0，1GB配额足够，M2应用层单件上限10MiB；候选M2生产迁移/私有桶未启用，生产DDL/桶仍须先做隔离Storage+PG正反/备份回滚并取得Owner授权。Vercel项目存在有效加密DEEPSEEK_API_KEY，GET /models HTTP200，deepseek-flash支持text+image；这是Vercel runtime key，不会自动注入Codex Cloud或CodeBuddy，未做任何推理调用。Owner待批准仅一次公开史料单页OCR：deepseek-flash、max_tokens=1000、单次不重试/不批量、费用上限USD0.01；批准前不得调用。完整证据及状态在原PLAN/progress的2026-11-06记录。当前：SOURCE_SELECTED / RIGHTS_VERIFIED / PAGE_FETCHED_EPHEMERAL / SUPABASE_CAPACITY_SUFFICIENT / DEEPSEEK_KEY_AUTH_VALID / DEEPSEEK_INFERENCE_NOT_AUTHORIZED / STORAGE_BUCKET_NOT_PROVISIONED；ST-02仍HOLD，未进入ST-03。Codex接续不得重复来源/容量/Key评估，不得写入密钥、不得假定可读Vercel env、不得应用生产M2迁移或桶；等待Owner单次OCR许可，随后接续真实原件持久化、L0→L1→L2首次/回放/撤权PG+HTTP。开发Skill与产品Skill双线、M5其余任务及原全部Gate/HOLD保持。

> **本轮最终远端核证**：源码`eec13b2373ac74101f497be40f928d2b89d40690`已入main，主CI42037766176 SUCCESS（571单测/4既有联网SKIP、133边界、14Skill、类型/Build/鉴权）；HTTP42037766124 SUCCESS（24PASS/1官方StorageSKIP）。PG42035692988在22b8c1c通过，后续补丁未改DB。Admin/当前材料/Owner/改稿/消费/状态及Skill v0.2.1修补已受测；**ST02真实原件、受控导演与canonical选材适配及正式资格/体验仍未全部完成**，M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。完整回执沿原文件§7.4，收尾仅证据补记[skip ci]。

> **2026-11-05｜M5全量清单施工最新状态**：从main@7246ec0接续，Admin/Studio/消费三批源码51f1234、82afee6、14b4d2c已本地完成定向与全检查（567单测/4旧联网SKIP、133边界、类型、合成PG17及Chromium5PASS），精确远端CI按progress最终核证。原PLAN M5六项及既有回执§7逐项记账。开发Skill同源v0.2.1补四类阻塞/依赖调度/两次失败停止；产品Skill与EXP S01—S08保留。**ST02真实原件DATA_BLOCKED；ST05受控外发/费用执行适配、canonical选材写入绑定尚未完成，安全HOLD不等于功能完成**。正式G5/生产/真实作品/Owner体验继续阻塞；ST03/04未提前启动。M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY，不声明M5全量完成。下一步先取得既有业务授权源契约以接通受控创作适配，同时等待合法真实原件/隔离授权；不重做已验工程。

> **2026-11-05｜ST-02 环境与双线接续检查点（本条优先于下方历史状态）**：最新远端基线 `77d854e95f46f659a944e6e063c1f5dab468d296`，主 CI `41994159578` SUCCESS；旧 work@759dbbd 保留且无独有提交。云端只读复核 bucket=0/object=0、`studio.private_originals` 不存在、raw_items=98/memory=93，因此云端真实字节验证为 **DEFERRED_DATA**，不是 PASS；可访问 VM 未发现已配置的隔离 Storage/DB，Owner 本机原件位置与权限尚未核实，不能宣称 LOCAL_ONLY 或 READY。已继承 ST01、ST02 候选 HTTP/满页 PG 与 M0—M4 有界成果，不重复施工、不启动 ST03。开发 Skill v0.2.0 继续使用；DS03 已有5条脱敏回执→3份待评价草案，自动采集/语义发现/自动准入未完整实现；CodeBuddy仍待本地宿主实测。产品生产/创作/观看/探索四类能力及 S01—S08 保留，EXP仅准备、不启动完整工程。调度表独立安全项已记原PLAN/progress：API角色当前无schema/table权限，但有效权限不只postgres；Data API实时暴露及部署运行身份仍待核，不执行生产修复。**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**。详细证据、四层环境、恢复条件、最小修复及回归矩阵见 `tasks/implementation/MAB/progress.md` 最新“环境核实与双线检查点”。

> **本检查点远端收尾核证**：文档提交 `6cd2fa9a07ae7d089ba00f0beff5b7d16d8b6079` 已入main；完整CI [42002088920](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/42002088920) / job127159555541 SUCCESS（468单测/4既有SKIP、133边界、11 Skill、类型/Build/鉴权、74目标审计errors=[]且HANDOFF_NOT_READY）。此后仅补本核证记录，`[skip ci]`不重跑同源码完整CI；真实原件PG/HTTP及调度安全矩阵仍NOT_RUN，DEFERRED_DATA及M5整体HOLD不变。

> **2026-11-05｜V1.2最终核证（优先于下方历史PENDING）**：源码b8e139c主CI41992897348和HTTP41992896865 SUCCESS（468单测/4旧SKIP、133边界、19HTTP/1官方StorageSKIP）；首PG反馈夹具失败已由d12f20d定向修正，CI41993463899/PG41993463958 SUCCESS，100候选预LIMIT回放和K3_DB_TEST_PASS已实测。DS03仅显式脱敏回执→精确签名分组→3份待评价草案，未实现自动采集/准入。已达三项操作检查点；下一唯一优先ST02真实原件L0-L2自动note首次/回放/撤权PG及HTTP，之后ST03。完整证据/Blob/回退见CODEX_M5_RECOVERY_ST02_20261105回执；**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**及CodeBuddy延后与全部原HOLD保持。

> **2026-11-05｜Codex V1.2真实接续**：基线5efd0085，旧work保全且无独有未推送成果；ST02三类型错误已本地修复，新增私有项目读取入口和DS03离线脱敏经验草案。三项操作完成后形成检查点；正式源码/最终CI与PG/HTTP只按 `tasks/results/MAB/CODEX_M5_RECOVERY_ST02_20261105.md §4` 核准，以下旧FAIL/NOT_RUN是历史。下一唯一优先仍ST02真实原件L0-L2自动note的PG/HTTP回放和撤权，不重做ST01、不冒称ST03/M5准出。**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**；CodeBuddy未来切换时验。

> **2026-11-05｜自生长宪章双位置同步和 CI 回执**：设计修订 `c1e95b20` 已纳入 MHKA-04/05、MAB §6B.4；两章分别同步到 ChatGPT 资料库研究目录和 `repo_target` 镜像，4/4 Git Blob SHA 匹配。Actions [41984181833](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41984181833) MHKA、开发 Skill 包装、CLI 5/5 SUCCESS，但 M5 原 Typecheck 三错令全 CI FAILURE。自动发现/候选生成尚无实现回执，不冒称 Skill 自生长已运行。先继续 Codex M5，CodeBuddy 验证延后。


> **2026-11-05｜开发 Skill 自生长长期方法已纳入宪章/MAB（新增方向，不冒充实现）**：按 MHKA-04 §3.6、MHKA-05 §10 与 MAB §6B.4，同步设计和建设经验采集→重复发现→四路分流→候选生成→隔离评价→受控准入→版本淘汰；真实 Codex M5 施工逐步检验，不以先做局部验证作为自动发现设计的前置条件。当前只有受控方法及计划，**自动自生长执行器未因此变成 CODE_PRESENT**。Codex 先验证 `mohen-dev-continuation` 并接续原 M5；CodeBuddy 待未来切换时验证、不阻断主线；维持全部权限和 Gate/HOLD。


> **2026-11-05｜旧宪法归档与 CI 核证（新于下方待验文字）**：C0—C4 最后版文档已在 `main@2c188bec` 完整归档并移除原根路径，原 Git Blob 未更改，档案 `governance/archive/C0_C4_TO_MHKA_ARCHIVAL_20261105.md`；MHKA-00 修改同步到 ChatGPT 资料库两处现行副本并哈希核准。Actions [41980554210](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41980554210) MHKA 和开发 Skill 静态守卫 SUCCESS、DS-02 CLI 5PASS/0FAIL，但原 M5 Typecheck 三错误未修、整体 CI FAILURE。**Codex 先验 Skill 并继续 M5；CodeBuddy 仅未来换工具时验，非当前阻断。** 文档归档不代表 M8 旧运行代际退役或生产权限准出。


> **2026-11-05｜Owner 确认 Codex 优先验 Skill；旧 C 治理文件归档（新于以下 DS-02 交接）**：马上在 Codex 继续 M5，并按 `.agents/skills/mohen-dev-continuation/references/HOST_ACCEPTANCE.md` 验证宿主加载及真实代码验证闭环。**CodeBuddy 直到未来工具切换才单独验收**；当前 `HOST_NOT_RUN/DEFERRED_TO_CODEBUDDY_HANDOFF` 不阻断 Codex/M5。原 `governance/C0—C4` 最后版本已原 Git Blob 保全到 `governance/archive/`，索引 `governance/archive/C0_C4_TO_MHKA_ARCHIVAL_20261105.md`；根 `AGENTS.md` → MHKA-00—05 仍唯一工程设计入口，不得恢复旧 C 作为现行规范。M8 旧运行代际/生产许可退役仍未完成，M5 既有 Typecheck 和全部其他 HOLD 保留。


> **2026-11-05｜DS-02 精确 CI 结果（优先于下方刚实施描述）**：`main@20e89cdb` 的 Actions [41978849756](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41978849756)：MHKA/Skill 两项静态守卫 SUCCESS，新增实际 CLI 正反 **5PASS/0FAIL**；但原 M5 `studio-research-read.ts` TS2353＋2×TS2451 使整体 CI FAILURE，后续 Unit/Build SKIP。**DS02_LOCAL_CLI_STATIC_VERIFIED / CODEX_HOST_NOT_RUN / CODEBUDDY_HOST_NOT_RUN / CROSS_TOOL_PENDING**。下一可在 Codex 按 `.agents/skills/mohen-dev-continuation/references/HOST_ACCEPTANCE.md` 显式加载并运行 doctor/static，并在原 M5 范围定向修类型错误；CodeBuddy 须另行验收，不能以 Codex 通过代替。生产/专业 Gate/费用/外发/Owner HOLD 均不变。


> **2026-11-05｜DS-02 同一开发 Skill 受控工具执行增强**：在 `.agents/skills/mohen-dev-continuation/SKILL.md` 继续深化唯一能力方法源（v0.2.0），新增 `.agents/skills/mohen-dev-continuation/references/task-tool-environment-map.json`、`scripts/dev-skills/continuation.mjs` 及测试 `tests/dev-skills/continuation.test.mjs`；只许可 doctor、static/typecheck/unit 三种本地受控 profile，不可调用 DB/发布/收费工具。不同平台分别按 `.agents/skills/mohen-dev-continuation/references/HOST_ACCEPTANCE.md` 验收宿主真实加载；GitHub CI 静态成功 ≠ Codex 已加载 ≠ CodeBuddy 已加载。M5/ST-02 Typecheck 是下一次真实故障验证候选，尚未因本次 DS-02 修复；原 MHKA、MAB、生产 Gate 和 HOLD 不变。


> **2026-11-05｜DS-01 新增远端核证（优先于下方同日准备阶段文字）**：canonical 开发 Skill / CodeBuddy loader `4497cf10` 已入 main，GitHub Actions [41975584235](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41975584235) 的 MHKA 路由守卫与 `DS_DEV_SKILL_LAYOUT_PASS` 均 SUCCESS；同轮完整 CI 因既有 M5 `apps/web/lib/studio-research-read.ts` 的 TS2353 和两处 TS2451 失败，后续测试/构建 SKIP。**DS01_STATIC_VERIFIED / DS02_CODE_PRESENT / HOST_NOT_RUN / DS03_NOT_RUN**；下次先按实际 main 继续修 Typecheck/ST-02，再分别实测 Codex 与 CodeBuddy 加载，不冒称跨会话自动运行。


> **2026-11-05｜DS-01 工具 Skill 仓库准备（新于下方历史提示）**：基于 main@a2fb10c2fbf973b450a360775745a67de6bb37c7 的审查，在原 §6B.4 内新增 canonical `.agents/skills/mohen-dev-continuation/SKILL.md`、CodeBuddy 轻量加载适配器 `.codebuddy/skills/mohen-dev-continuation/SKILL.md`、机器防漂移守卫 `scripts/guards/check-dev-skill-layout.mjs` 及单份回执 `tasks/results/MAB/DS01_DEV_SKILL_ENVIRONMENT_20261105.md`。此为 CTX-ENG 工程提效，不能变更 MHKA、原 M5/ST-02、产品生产 Skill/Registry、专业 Gate 或任何 HOLD。**静态 CI、Codex/CodeBuddy 实机加载与 DS-03 连续工作均待分别验收**。执行时先核最新 main 和 CI，再选择现有 MAB 下一任务；不要把 Skill 文件存在当自动加载或后台连续执行的证明。

> **2026-11-05｜开发 Skill 提效任务已纳入原施工计划（尚未实现）**：Owner 确认继承 C2 双 Skill 长期能力积累理念，按 MHKA-04 四执行上下文区分 CTX-ENG 工具开发与产品 PROD/STUDIO/EXPLORE；唯一新增执行要求见 `tasks/implementation/MAB/PLAN.md §6B.4`（DS-01—DS-04）。先让跨工具 `mohen-dev-continuation` 服务当前 M5 持续施工，公共方法兼顾未来维护；不修改现行 M0—M8、HP01—HP13、ST-02 下一优先任务及任何正式 HOLD。**本批仅记录决策，未创建 Skill 或获得自动运行证明。**


> **2026-11-05｜最新ST-01接续点（优先于下方HP11旧接续）**：已完成项目绑定research_brief@rev持久化、origin_task_id/snapshot血缘、task UUID幂等、同key原task/rev重放、不同输入409、brief保存中断HOLD和resume/follow-up血缘保留。Studio UI创建/选择Owner项目；ST01不再自动触发正式生产，符合AGENT合同ST04由Creator明确决定。源码82c78ce6、94ac574d、cdb330af、1636be11/c0f3c3f0、33491000、7bab9bf6；真实隔离HTTP [41956024859](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41956024859) SUCCESS（18PASS/1StorageSKIP，MAB_ST01_BRIEF_HTTP_PASS），主CI [41956280247](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41956280247) SUCCESS（447单测/4旧SKIP、133边界、Build、审计errors=[]）。详细证据与中间失败修复见tasks/results/MAB/CHATGPT_M5_ST01_BRIEF_20261105.md、原PLAN M5、progress末尾。**下一步严格进入ST02 StudioResearchRead**：先审计现有L0—L5真实数据表、read-model/lineage读取服务、project ACL与来源/资格合同，找最小可安全实现接口；不得重做ST01、不得创建知识副本或绕开L/G/资格。ST01 Agent可得性/问题收敛仍HOLD；ST02/03/04、13类专业完整语义、H1/H2/H3/19组件和正式G5仍未准出。M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY，M1—M4生产/费用/外发等原条件不变。

> **2026-11-05｜最新GitHub施工接续（优先于以下历史“下一步”）**：在原M5/HP11继续了反馈同意与撤回实际源码，现有`studio.asset_heads/asset_revisions`强制`consented_feedback`私人声明、Owner精确修订CAS/幂等的不可变REVOKED终止修订、旧正文私有API失效与历史脱敏；现行F05 Admin条目增加两步撤回，**未另造长期资产正文/独立Gate/任务书**。源`17b9863e`、API`322a5e76`、Admin`eaf1515f`、HTTP`000327ca`；主CI[41950478739](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41950478739) SUCCESS（447单测/4既有SKIP、133边界、Build），真实隔离PG17＋Chromium[41950478723](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41950478723) SUCCESS（18PASS/1StorageSKIP，含Admin点击与撤回后旧内容拒读）。唯一回执`tasks/results/MAB/CHATGPT_M5_FEEDBACK_CONSENT_20261105.md`、原`PLAN.md` M5和`progress.md`末尾已同步。**仅私有候选同意声明/撤回VERIFIED_ISOLATED，不是真实反馈人同意凭证/物理删除/外发副本撤回或13类完整专业链路PASS**。下一M5仍围绕ST01—04真实有据研究、13类其它类型的专业语义/合法解引用跨项目复用、canonical媒资、完整H1/H2/H3及19组件、独立G5与正式消费；沿原计划，不重复已通过的六L5消费者PG、导演CAS或本批。所有M1—M4生产/专业/费用/外发固定条件、M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY继续。

> **2026-11-05｜最新ChatGPT实码回执及下一接续依据（优先于以下旧接续）**：基于Codex`1bef80b7`继续原M5，首个研究恢复PG失败定向修复 `935a1e1e`，主CI41945060178与PG1741945060135 SUCCESS；私有资产GET/POST、400/401/404/503 no-store与单测 `243ac2ab`→`b063876a`/`3ae28f18`，旧主CI41945285925 SUCCESS；现有Chromium单一隔离套件增加实际私有资产缓存正反 `af074521`，HTTP41946337974 **17PASS/1StorageSKIP**、主CI41946337981 SUCCESS；补CI仅收集Playwright规格语法 `abff4e4d`，主CI41946517684 SUCCESS（6文件18项收集、445单测PASS/4旧SKIP、133边界PASS、Build/74差异审计无错）。初次新HTTP41945997916语法错误FAILURE保留及修复。逐提交、真实日志、范围、回退以`tasks/results/MAB/CHATGPT_M5_RESUME_CACHE_20261105.md`§5与`progress.md`末尾为准。**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**：下一继续原M5 ST01—04真实有据研究委托、13类专业语义/consented_feedback撤回、跨项目合法复用及canonical媒资、H1/H2/H3/19组件、完整知识G5与消费正反；不重复六L5四消费者PG、既有导演CAS和本批已验工程。生产迁移、G5签审、外发/费用等原有固定条件不变。

> **2026-11-05｜ChatGPT最新接续与CI阻断闭合（优先于下方历史接续点）**：基于`main@1bef80b7`实查PG17 [41941909920](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41941909920)失败，根因是研究恢复测试把`degraded:true`误作成功完成。已用`935a1e1e`修复非降级并发夹具、增加降级持久HOLD负例；主CI[41945060178](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41945060178)和PG[41945060135](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41945060135)均SUCCESS，实际research-resume 4PASS及`K3_DB_TEST_PASS`。同时`243ac2ab`/`9d7b1c4c`为Studio私有资产GET/POST加no-store与正反断言；主CI[41945285925](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41945285925) SUCCESS（445单测PASS/4旧联网SKIP、133边界PASS、Build/目标审计通过）。详细源码、回退与证据见`tasks/results/MAB/CHATGPT_M5_RESUME_CACHE_20261105.md`，以及`progress.md`末尾。**这是M5/HP10、HP11定向VERIFIED_ISOLATED，不是ST01—04正例、专业G5、13类业务或M5整体准出**。下一仍原M5：有据来源→真实研究/导演与资产链、13类专业语义/同意撤回/跨项目合法复用/canonical媒资；不得重复导演CAS/既有六L5四消费者隔离通过项。M1—M4原所有生产固定条件及外发/费用HOLD保留。

> **最新M5接续**：前批3873256三条Actions全SUCCESS（41940583300/41940583316/41940583384）；本批研究HOLD源码`876ff39`本地444单测/类型、HTTP17PASS/1StorageSKIP，任务与原因真实持久、零费恢复/跨Owner负验。不签ST01—04完整正例；仍M5/HANDOFF_NOT_READY，继续consented_feedback/13类专业与实际研究链。报告`tasks/results/MAB/CODEX_M5_RESEARCH_HOLD_20261105.md`。

> **2026-11-05最新批次**：产品入口源码`1cd8544`，三个实际L5产品HTTP正反本地通过（16PASS/1StorageSKIP）；Evidence独立consumer/quote、Agent服务端read、visual display/no-store。PG全套、438单测/133边界/类型通过；GitHub本批结果待核，不冒称整稿三消费者HTTP或M5准出。报告`tasks/results/MAB/CODEX_M5_PRODUCT_CONSUMERS_20261105.md`；下一继续ST01—04/13类专业闭环，生产/专业/外发/费用条件及M5_OVERALL_HOLD保持。

> **2026-11-05｜本轮最终核证（最高时序）**：业务源码`ff5283e`、补证`3929d9df7496fc883c684304f19c1908977b7982`已推main；精确主CI[41933637116](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41933637116)、PG[41933636834](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41933636834)、HTTP[41933636716](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41933636716)全SUCCESS，HTTP15PASS/1StorageSKIP。六L5×四消费者PG/实际应用wrapper/整稿媒体权利、WATCH真实HTTP撤权、13类10+3持久、Admin精确历史/事件与ST08/ST09仅核销VERIFIED_ISOLATED；原两次CI失败保留并定向闭合。其它三消费者产品HTTP、13类完整专业/同意撤回/合法复用/canonical媒资、ST01—04/19组件及全部生产专业外发费用条件继续HOLD。**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**，下一步沿原M5剩余项，不重复已验导演CAS/fork/restore/本批能力；精确证据与回滚见`tasks/results/MAB/CODEX_M5_BINDING_ASSETS_20261105.md`§6.2。下方本轮PENDING和仅story_seed表述为历史。

> **2026-11-05｜最新远端接续点**：补证`3929d9df7496fc883c684304f19c1908977b7982`已推main；精确主CI41933637116/PG41933636834/HTTP41933636716结果以CODEX_M5_BINDING_ASSETS_20261105回执§6.1—6.2及progress最新核证为准。六L5/媒体/实际应用wrapper PG已本地补证，不再把“只story_seed”当当前缺口；其它三消费者各自产品HTTP及13类专业/反馈撤回/合法复用/canonical媒资、ST01—04/19组件继续原M5，不重复导演CAS/fork/restore/本批已验能力。M5_OVERALL_HOLD与全部生产/专业/外发/费用条件不变。

> **2026-11-05｜同轮最新补证**：六类L5×四消费者真实PG绑定、物理修订变化拒绝、祖先撤销及整稿媒体权利正反已完成，实际应用wrapper PG也通过；共享fixture参数化后完整PG17与HTTP15PASS/1StorageSKIP复验通过。取代下方首批“仅story_seed/其它五类未验”的PG局限；其它三消费者各自产品HTTP、13类完整专业语义/反馈同意撤回/合法复用/canonical媒资、ST01—04/19组件仍未验。first-source ff5283e的PG41932575876/HTTP41932576000 SUCCESS，主CI41932575992因差异账字节等同旧声明FAIL，已原位改ADAPTED待新CI核证，不掩盖失败。最新补证SHA/CI见本批CODEX_M5_BINDING_ASSETS_20261105回执；M5整体/全部生产专业外发费用条件HOLD不变。

> **2026-11-05｜最新实码接续（优先于以下历史入口）**：本批源码`ff5283ea8a719f69d37eee4ff4e8a1d4c5e4738e`新增只读精确WorkRevision→当前独立G5签审整稿/动作权利桥、10+3资产PG/HTTP持久矩阵、Admin历史精确版本/使用事件、ST08/ST09实际业务测试；本地432单测/133边界/六workspace类型/PG全套/Next+Chromium15PASS+1StorageSKIP，GitHub三流水线结果以`tasks/results/MAB/CODEX_M5_BINDING_ASSETS_20261105.md`最新核证为准。最新旧main CI41929766191的assessment超时2callback已稳定RED→GREEN修复。不要重做本批或此前导演CAS/fork/restore。
>
> **下一未闭合范围仍原M5/HP07/HP11/HP12**：四消费者中仅WATCH走真实Next HTTP，其余三个当前仅PG reader；绑定正例仅story_seed，其余五L5待逐类。10+3是持久/权限矩阵，不等于13类完整专业语义；真实来源合法解引用/跨题复用、反馈同意撤回、canonical媒资、ST01—04与完整H1/H2/H3/19组件及生产最小身份/Reviewer均未全验。M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY及M1—M4全部原固定条件保留；签审策略/生产context/正式Gate、外发与费用无新授权。原PLAN/progress/target-diff/CURRENT已原位记账，精确SHA/CI/证据与回退见本批回执。

> **2026-11-05｜Owner要求Codex接续的最新交接入口（优先于本文以下历史“下一步”描述）**
>
> - 最新已核实源业务提交 `608ff72fe9d2c141b1ca5a4bc49c804e5c8a6b74`：导演方案提交CAS＋丢失HTTP成功回执的原expected版本幂等。主CI [41841366673](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41841366673) SUCCESS、真实隔离PG/Chromium [41841366704](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41841366704) SUCCESS（13PASS／1StorageSKIP）。此前`08fa04e`的fork／restore真实隔离PG已PASS。上述仅是M5局部`VERIFIED_ISOLATED`，不要重复，不是发布G5/完整产品PASS。
> - 本次只读差异核验的精确基准 `edce77451fba459b9027192923d9a8faa5e38a29`，其文档CI [41842068185](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41842068185) SUCCESS。核验发现：`work-publish-qualification.ts`仍合法拒绝缺精确专业G5的作品公开；当前仅有L5分消费者资格读取基础，尚无已授权`WorkRevision→L5不可变修订→当前独立G5→purpose/scope/consumer/rights`可信映射；13资产类型十种私人候选、三种规范入口，但缺逐类真实PG业务验证；Admin旧图片台账不等于13类具体知识条目运营后台。
> - 最新新增**只读核验和执行恢复资料**：`tasks/results/MAB/M5_HP07_HP11_HP12_READONLY_AUDIT_20261104.md`。上一轮尝试源码/13类PG测试时GitHub写入遭工具安全检查拦截，**没有产生该两项的源码提交和测试PASS**。本次仅把真实审查写入GitHub，不要把审查文件的commit当成功能代码。
> - **Codex接力唯一当前主任务**：先`git fetch origin`并核实实时`origin/main`与工作树，读取此入口、原`PLAN.md`／`progress.md`／`target-diff.csv`／`CURRENT.md`及上述新回执；继续原M5/HP07/HP12权威精确G5来源关联与四消费者逐用途正反验收（无独立资格仍按原失败关闭）；并按M5/HP11及M4-C04补13种资产10+3的隔离PG／HTTP正反矩阵、Admin具体知识条目视图、ST-01—09业务测试。复用现有M3读验证器和独立G5，不另建第二套知识库/审签/任务书。
> - M1—M4所有固定生产条件、G5 Reviewer/最小正式凭据、Storage、真实Provider外发和费用及M5—M8最终验收保持原HOLD；没有取得生产操作或费用授权。保持`M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`，**Owner授权Codex接续施工不等于正式PASS**。逐项保存git SHA、Actions运行ID、原始PG/Chromium POS/NEG/AUTH结果和回退；原位更新既有进度、差异账，不降门禁。

> **2026-11-04 最新实绩／当前M5继续**：共享检索修复`4f57421`、私有预览/局部改稿与重排CAS/共享时限修复`e5a3a5b035833e70f07d928695401920ebaadee3`均已推main。后者主CI [41828369677](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41828369677)、隔离PG17 [41828369318](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41828369318)、实际HTTP/Chromium [41828369462](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41828369462)全SUCCESS；417单测/133边界、类型与真实HTTP11PASS/1StorageSKIP。旧247bee0文档CI时限失败已定根因并有确定性回归/修复。**M5未准出**，下一施工为导演方案初始保存及fork/restore等其它版本写入口的并发/幂等与来源归属，再按原PLAN补同WorkRevision/G5/rights及九动作/13类型业务。公共检索缺合法server purpose/scope仍degraded，不自授资格；生产/专业/外发/费用HOLD不变。报告`tasks/results/MAB/CODEX_M5_RETRIEVE_20261104.md`、`CODEX_M5_REVISIONS_20261104.md`；下方旧“下一P0共享retrieve/preview/CAS”已由本批替代，不重复施工。

> **2026-11-04 最新实绩／M5继续施工**：M4远端HTTP已由`df4eeb8`定向修复闭合。M5首批源码`eb9ee3ed8b3957e85495e73937ca39a71cfe12e9`已推main，主CI [41824906758](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41824906758)和实际HTTP/Chromium [41824906796](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41824906796)均SUCCESS，8PASS/1StorageSKIP；本地395单测/133边界/类型通过。公开作品目录/详情/program/share/related/search作品分面已复用逐请求WATCH当前资格并no-store，真实无G5旧pointer泄露已先RED后GREEN。**M5未准出**，精确G5/rights与所有上游固定条件保持HOLD；下一P0是search知识分面及共享retrieve旧PASS读取（按consumer/purpose/scope/祖先撤权核证），然后私有preview正文和改稿CAS竞态。先继承本批，不重做M1—M4；见`tasks/results/MAB/CODEX_M5_PUBLIC_CONSUMERS_20261104.md`及progress末尾。

> **2026-11-04 M4远端回归已闭合，当前M5**：修复源码`df4eeb885680e0caefd25b8429beadafbcc9cacd`的主CI [41823975350](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41823975350)与实际HTTP/Chromium [41823975358](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41823975358)均SUCCESS；HTTP日志7PASS/1Storage缺配置SKIP。旧失败job126441897574已定位为新PG17缺anon等测试角色，定向补隔离bootstrap且先RED后GREEN；没有改生产DDL或放宽REVOKE。M4有限工程准出提案现可按原条件接收，转M5私有/合法消费施工；M4-C01—C04及M1/M2/M3所有固定条件保持，真实双主体/生产/费用/专业资格仍HOLD。详见`tasks/results/MAB/CODEX_M4_HTTP_20261104.md`；下方远端失败尚未定位的文字仅保留历史。

> **2026-11-04 新窗口最新接续状态（优先于下方历史M5表述）**：源码已推main@`64c2402929ff229d32b232cabf4ca8cdbf6d0b89`，工作树核对干净。主CI [41790309817](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41790309817) SUCCESS、隔离PG17 [41790310006](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41790310006) SUCCESS；远端HTTP/Chromium [41790309838](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41790309838) **FAILURE**，失败job `126441897574` 的步骤为 `Assert synthetic instance marker and run actual HTTP/browser suite`。当前唯一优先任务是 **M4远端HTTP回归收口**，暂不正式进入M5。M4本地389单测/133边界/PG/浏览器7PASS+1StorageSKIP证据保留，但不能覆盖这次远端FAIL；M4有条件准出提案待此具体回归闭合。新窗口先fetch，读本入口→PLAN→progress→target-diff→CURRENT→本批回执；保全全部M4源码，定位该job日志、定向修复并核实GitHub成功后，再按既有固定条件转M5。不重做M1—M3或总体架构，不绕过Gate/权限/费用。当前gh日志命令返回空正文，失败根因**尚未确认**，不能猜成已定位或已修复。后续仅文档CI成功不得代验此HTTP回归。

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
2. **2026-11-05 Owner 纠偏后的读取顺序**：先 `AGENTS.md` → `governance/mhka/` 六 MHKA 与相关专业合同 → 本交接书 → PLAN.md §5/§6A/§6B → progress.md → target-diff.csv → CURRENT.md → 源码/测试与精确CI。从实时 main 开始，旧 C0—C4 仅用于历史兼容。现有PLATFORM_HANDOFF_20261103.md是**较早的阶段性切换记录**，其历史SUCCESS、批准状态和此前SHA不可替代本文件新施工状态。
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
- **新工程权威入口（2026-11-05 Owner 纠偏）**：`AGENTS.md` 已指向六份 `governance/mhka/` MHKA 作为施工唯一设计权威；C0—C4 只作历史来源与合法旧代码兼容依据。M8 仅处理正式运行启用、受控退役及交接，不再延误新工程规范入口。
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
12. M6全量闭环后，以现行KAD5唯一双题A“隋唐大运河及江南水路连接”→B“宋代江南运河沿线的城镇与日常生活”验证真实A资产@revision被B有权引用并产生新知识，而不是重复摘要；完成运营/Owner体验与M8有备份的**生产运行代际激活/旧系统退役**；不再推迟 MHKA 工程设计入口。生产动作仍不可提前执行。

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


> **2026-11-06阶段准出复盘**：完整证据审查归档于[`tasks/results/MAB/M5_M0_M4_GATE_RETROSPECTIVE_20261106.md`](https://github.com/xiezuojie03-web/mohen-agent-2.0/blob/main/tasks/results/MAB/M5_M0_M4_GATE_RETROSPECTIVE_20261106.md)。M1—M4均为限定范围CONDITIONAL_EXIT，M4真实混合仍未验证；M5完整作品E2E矩阵与上游真实实验准入门的缺口已记录。不得把条件准出当全阶段PASS；当前M5全链实验仍HOLD。该复盘不改变阶段顺序或授权。
