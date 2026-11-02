# 墨痕 MoHen｜MAB-ENG-01 工程施工增量交接书

**文件身份**：交接说明（增量、非设计权威、非新专项任务书）  
**版本 / 日期**：V1.0 / 2026-11-02  
**接收执行者**：Codex 云端工程施工窗口  
**工程仓库**：[`xiezuojie03-web/mohen-agent-2.0`](https://github.com/xiezuojie03-web/mohen-agent-2.0)  
**唯一工作分支**：`main`  
**本次交接时已核实最新 HEAD**：`dae824fa5f47a9a239a0c98285c002f69a79b717`  
**工程任务归属**：`MOHEN-KNOWLEDGE-01` → `MAB-ENG-01` 受控工程子任务 → 当前 `ENG-NEXT-01`，后续 M0—M8 同一施工序列。

> **先读此结论：** Codex 仍可使用原来的 `MoHen_MAB_完整设计交付包_20261102.zip`，**无须重发全部设计文件或重启KAD研究**。原包提供已批准的完整设计目标；本交接书仅说明原包形成以后，GitHub发生的真实施工变化及接下来的工作。不要用原包 `repo_target/` 的旧镜像直接覆盖已更新的 `main`。

## 一、权威、文件职责与进入方式

1. **原设计权威不变**：原 MAB/KAD6 完整设计交付包、六份 MHKA-00—05 目标、专业合同、74 份正式工程目标（21 CREATE / 53 REVISE）、20 项补充责任、234 路径审查、85 API、152 动作、63 方法、19 Skill、F01—F05 五图及 H1/H2/H3 / U07 / UXD7 继承结果。**设计准出不等于工程准出**。
2. **新上位施工约束**：资料库中的《`MAB-ENG-01_墨痕新架构工程接续施工与体验保全_受控任务书_V1.0.md`》，路径：`/墨痕/产品知识体系与工程治理重建_专项/04_工程规范与Codex接入/01_MAB工程接续施工_受控子任务/`。若 Codex 不能直接读取 ChatGPT 资料库，以本交接书中的强制约束承接；不据此虚构读到原文。需要时向 Owner 索取该**单份**受控任务书，而非重索整包。
3. **GitHub 是施工事实源**：每次施工前从真实 `origin/main` 读取 `AGENTS.md`、`CURRENT.md`、`tasks/implementation/MAB/PLAN.md`、`target-diff.csv`、`progress.md`，并检查最新源码、CI 与真实数据库对象。`AGENTS.md` 此前仍指向旧治理入口；新 MHKA 不可在 M8 原子切换前擅自宣布双重生效。
4. **唯一执行账**：原位维护 `PLAN.md`（M0—M8计划）、`target-diff.csv`（目标与当前事实的差异）、`progress.md`（按提交/测试/授权/回滚的执行证据）、`CURRENT.md`（真正当前运行状态）。不得因工具转换再造第二套进度账、第二个 D/G 系统或新知识平台。
5. **执行工具交接**：Codex 从当前 `main` 继续施工。**此交接后 ChatGPT 不再并行写入同一仓库**，避免冲突；Owner 若再切换工具，仍以最新 HEAD 和同一施工账接续。

## 二、原包之后已进入 main 的施工提交（均须保留）

| 提交（由旧至新） | 已提交的改动 | 验收边界 |
|---|---|---|
| [`8b3b9e1`](https://github.com/xiezuojie03-web/mohen-agent-2.0/commit/8b3b9e177bb14fe9751c1843e46acdcb8346cff1) | HOME 恢复“开始创作”；Studio 新对话、研究记录入口及动态阶段高亮；WATCH 零章节空态；74 目标路径差异账回写 | 此提交的 GitHub CI 成功、曾核公开页面可见；不等于 Studio 登录态/五图 Owner 验收 |
| [`c912c9c`](https://github.com/xiezuojie03-web/mohen-agent-2.0/commit/c912c9cdd2cf37e1ebb4765b622be9099acae4f8) | 关闭旧 `/api/studio/attachments` 向 `public/uploads` 写入原件并登记公有URL的不安全路径，增加单测 | 旧入口暂时失败关闭，不删任何既有资产，保留原私有文本/PDF阅读导入 |
| [`4e27594`](https://github.com/xiezuojie03-web/mohen-agent-2.0/commit/4e275947f5d8cbdedd66abf7719f2d1c30a9b8f3) | 私有原件存储适配器、无覆盖上传、服务端回读、SHA-256、模拟测试 | 该提交的7项新增测试中1项失败，后续已修正fixture；不得把这次失败忽略 |
| [`8f18f87`](https://github.com/xiezuojie03-web/mohen-agent-2.0/commit/8f18f871c5a8eef81ae7fb13e930ca7ea0a82a8e) | 新增私有原件登记/关联仓储、`PENDING→STORED_VERIFIED`及不可变 `source_anchor` 修订、**待执行**的 SQL 迁移；修复存储测试fixture | 此提交 GitHub CI 成功；没有应用新迁移、没有建立 Storage 桶 |
| [`d7961ac`](https://github.com/xiezuojie03-web/mohen-agent-2.0/commit/d7961aca382832dc8136af8749bf06a273582710) | 重接附件 POST/GET：受身份验证、项目权限、原件字节与哈希校验、读取二次复核；默认特性开关关闭；新增路由测试 | 初次 CI 类型检查失败，后续修复 |
| [`dae824f`](https://github.com/xiezuojie03-web/mohen-agent-2.0/commit/dae824fa5f47a9a239a0c98285c002f69a79b717) | 补齐数据访问层统一导出及 TS 类型声明，修复前一提交的 TS2614/TS7016 | **当前 HEAD，最新CI失败：5项路由单测未通过，必须先修** |

**注意历史账的时间差**：`CURRENT.md` 和 `progress.md` 有部分段落仍记载较早 HEAD/部署、且部分文字为历史计划阶段状态；不要据此覆盖上表。以最新 HEAD、CI 与真实环境为准原位修正，不删除历史审计。

## 三、接手时已核查的准确运行与测试状态

| 项目 | 当前结论 | 不得误写成 |
|---|---|---|
| GitHub `main` | 截至交接核查为 `dae824f`，需在开始时重取 HEAD | “固定不再变化” |
| GitHub Actions 最新CI | [run `41458964029`](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41458964029) **FAIL**：`Typecheck` 通过，`Unit tests (no DB)` 失败，Build 等后续步骤未运行 | 全量 PASS；不能仅看 Vercel 绿色状态 |
| 失败的直接原因 | `tests/unit/studio-original-attachment-route.test.ts` 的 `vi.mock('../../packages/data-access/src/index.mjs')` 没有模拟新的 `MAX_ORIGINAL_BYTES` / `createPrivateOriginalStorage` 导出；5个用例失败，其中下载状态误为503；需修 mock 并重跑 | 已证明生产数据或真实Storage本身出错；也不能只修模拟就算真实Storage PASS |
| 现有生产Studio基础 | 之前已迁移7张 Studio 表及 Gate 候选表；项目、不可变修订/幂等/CAS有既有隔离测试历史 | 完整原件/知识/Gate全链已通过 |
| 新增 `studio.private_originals` 迁移 | `supabase/migrations/20261102140000_mab_m2_private_originals.sql` **仅提交到GitHub，尚未应用生产** | 已有这张真实生产表 |
| 私有原件对象 | 此前生产只读查询 `storage.buckets=0`；本轮未新建桶、未注入新Storage凭据、未存真实原件。需重新核查最新环境 | “已能真实上传与回读原件” |
| 旧历史原件指针/证据桥 | 以前只读查询 `source.raw_items=98`、`evidence.reading_units=38`、`evidence.material_evidence=166`；`evidence.read_unit_evidence_links=0`、`world.claim_evidence_links=0` | 98条原件已经拥有可回读的私有对象；主张链条已闭合 |
| 特性开关 | `MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED` **默认不是 `true`，因此新附件POST/GET失败关闭** | 现网用户已能使用附件原件功能 |
| Gate | 独立Gate尚未按正式 Reviewer 身份/策略完全启用 | 作品审核或Agent生产即正式G PASS |
| Vercel | 用户已裁决**不再每小批单独核对或手动触发Vercel**；仓库main自动部署机制此前仍存在；关键集成门集中验收 | “禁止一切自动构建”或“READY等于工程准出” |

## 四、当前 M2 代码接线、接口与权利边界

**源码入口（均为真实仓库文件，不要用旧目标镜像覆盖）：**

- `packages/data-access/src/private-original-storage.mjs`：服务器端私有对象适配器、路径及SHA-256。需核实 Supabase Storage HTTP API 的上传、认证回读、错误码/不存在对象语义与权限路径；不依赖单纯模拟。
- `packages/data-access/src/private-original-repository.mjs`：在 `createAppTransaction` / `mohen_app_runtime` / 当前用户RLS下预约原件，最终创建 `source_anchor` 资产修订，关联 `studio.private_originals`。
- `packages/data-access/src/index.mjs` 与 `index.d.mts`：运行时导出和TS声明一致性，需加到正反类型覆盖。
- `apps/web/app/api/studio/attachments/route.ts`：同一旧API路径上的受限 POST/GET，默认安全开关关闭；检查请求体大小、内容类型、权利声明、错误返回、同源/会话、防缓存、公开URL泄漏。
- `supabase/migrations/20261102140000_mab_m2_private_originals.sql`：Studio原件元数据及项目绑定候选DDL；**生产库不得无隔离验证直接执行**。
- `tests/unit/private-original-storage.test.ts`、`tests/unit/studio-original-attachment-route.test.ts`、`tests/unit/studio-attachment-storage.test.ts`：不同阶段单测有共享的同一路由假设，应去冲突、修mock、核新入口故障关闭；历史测试不是独立真实DB验收。
- `apps/web/app/api/studio/materials/import/route.ts`、`packages/data-access/src/imported-material-repository.mjs`：已有私人文本/PDF抽取及合法导入入口，不可因原件施工破坏；它保存抽取文本不等于原件字节持久化。
- `packages/data-access/src/studio-asset-repository.mjs`、`supabase/migrations/20261102105810_mab_studio_assets.sql`：已有Studio长期资产逻辑，不可另造重复主数据系统。

**权利/资产三条不可合并的身份**：上传者声明可私人研究使用 ≠ 原件存储完整性已经证明 ≠ 知识专业G资格/公众媒体展示许可。原件成功只可成为带权利状态的私有工作资产候选；任何G正式PASS由独立Reviewer按专业策略决定。

## 五、Codex接手后的唯一下一批：M2原件闭环（先恢复CI）

### A. 首要：修复红色CI，不绕过测试门

1. `git fetch`、校验最新 `origin/main` 和工作树；如 HEAD 已前进，先对照此交接书与最新变动，不强行覆盖。
2. 阅读 [run 41458964029](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41458964029) 的 `Unit tests (no DB)` 失败日志。首先同步 `studio-original-attachment-route.test.ts` 的 `@mohen/data-access` mock，正确提供 `MAX_ORIGINAL_BYTES` 与 `createPrivateOriginalStorage`（当前原测试模拟的是已不再由路由直接import的 `private-original-storage.mjs`）。
3. 跑 `pnpm test:unit`、`pnpm typecheck`、`pnpm build` 或仓库CI精确同等命令，确保新旧附件测试不冲突；留下命令、环境、pass/fail数量和对应commit。若有真实逻辑错误，按证据修真实代码而非弱化断言或跳过用例。
4. 如 CI 有新故障，按日志继续闭合，直到**源码/类型/单测/构建**都有真实回执，或给出具名HOLD和确切环境障碍。

### B. 原件元数据、私有Storage、失败恢复与权限（M2核心）

1. **先隔离后生产**：以当前实际PG17 Schema比对 `studio.private_originals` 与已有 `studio.projects` / `asset_heads` / `asset_revisions`；验证FK、`RLS`、INSERT/UPDATE字段权限、`mohen_app_runtime` 会话签名、disabled/跨Owner/过期角色。安全地检视并修正迁移候选，不覆盖历史已应用DDL。补必要的回滚/失败恢复说明。
2. **确认真实Storage API**：以隔离用私有bucket和合成样本验证 `POST`/私有GET、路径编码、覆盖拒绝、404、SHA-256和文件长度、权限与凭据。服务凭据只在服务端受保护配置，浏览器/响应/日志不可出现；不得把后端 service key 视为面向用户的授权，先由DB RLS核定项目归属，再调用 Storage。
3. **双系统非原子性**：数据库PENDING → 私有上传 → 服务端回读验证 → 同事务`source_anchor`修订+`STORED_VERIFIED`。测超时且对象已写、重复请求、上传失败、回读hash错误、DB最终提交失败、孤儿PENDING、项目撤销/封存、已存修订不可覆盖；提供明确的补偿与恢复规则，不能假称DB与Storage天然事务原子。
4. **真实拒绝矩阵**：匿名、用户A访问用户B项目、伪造 `project_id`、其它用户`original_id`、禁用身份、过期会话、读取中撤权、重复同`idempotency_key`但内容不同、对象缺失/被篡改、超大/不支持文件、直接公共URL访问，均必须明确拒绝；合法用户带权利声明的私有样本能真实上传及回读hash一致。
5. **审查上传资源和历史附件**：旧 `public/uploads` 不可重新开放；确认历史公有链接是否存在、是否需要停止暴露或授权清理；请求体在 `formData()` 前的上游大小限制、流式/超时及重复请求成本要做负测；不得删除历史记录或真原件充当清理。
6. **备份与回滚**：对象清单/字节hash、DB元数据、权利与策略、版本使用同一备份标识，在隔离库演练恢复；回退不得恢复公有存储、已撤销的凭据或过期资格。
7. **激活门**：未通过隔离PG+Storage+浏览器权限正反测试、备份回滚与合法Owner授权，保持 `MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED` 关闭。对生产DDL、生产bucket策略、真实权限/密钥调整按现行批准及平台权限检查执行；无权或高风险时明确HOLD，不以旧设计包文字当作即时无限授权。

### C. 原件成功后继续M2证据桥，不另立体系

在已有 `source` / `evidence` / `world` 真源上贯通 **L0原件/来源版本 → L1读取单元 → L2可定位证据 → L3历史主张**，复用现有 `evidence.read_unit_evidence_links`、`world.claim_evidence_links` 等合法关联表和D00—D05执行器；精确记录 `source_version_id`、页码/区域/偏移、哈希、观察/解释差异、权利与Gate资格。所有已记录的98个旧原件指针需逐类判断可否回读，不能批量把元数据“升级”为可验证字节。对每一条正向/反向关系提供真样本、缺失/错误定位的拒绝及版本可追溯证据。

### D. 完成M2以后按原M0—M8持续接续

- M0：74项目标的`CODE_PRESENT`不是目标PASS；20补充与234源路径逐ID闭环，85 API/152动作继续可追溯。
- M1：旧已修复的RLS、短时身份及Studio资产测试不重复改写；凭据轮换和真人登录E2E未取得新证据仍HOLD。
- M3：独立Gate Reviewer物理权限、候选、追加审计、用途/consumer/撤权测试；不得由Producer/作品审核代签专业资格。
- M4：从首题开始内外AI混合协作，外发授权、成本和永久Receipt可追溯；不借技术工程名义增加费用或外发私有材料。
- M5：Studio真实研究与可见作品创作，F05 Admin内部逐条知识资产管理，WATCH合法消费；保留认可的F01—F05和双组件体验，不制作Owner已拒绝的独立知识平台。
- M6/M7/M8：全量合同回归、KAD5双课题真实复用、正式MHKA原子切换与Owner体验签收；EXP/L6—L8已批准阶段排序，不得偷删最终责任。

## 六、工程协作与准出纪律

- **不停工式工程协作**：在获准范围内自主完成技术实现、测试与小批提交；不要每个技术细节都来问Owner，也不要因为工具切换重做MAB/KAD研究。需产品方向、UI完成态、真实费用、私有数据外发、重大生产权限或超原授权变更时，才提交简洁的原因、选项、推荐与影响供Owner裁决。
- **唯一main、小提交、可恢复**：用户明确坚持最终只保留`main`；遵循实际仓库与Codex运行环境的安全提交/同步规则，先读后写，不使用强推覆盖其他工具提交。
- **Vercel节奏**：本阶段**GitHub优先、CI按批、关键集成门再集中验收Vercel**。现有main自动部署连接可能在推送时构建，但不要每一步手动部署或拿READY作M2验收。
- **真实状态四分**：设计完成、代码已提交、隔离验证通过、真实运行/Owner签收分别记账；不得把单测模拟、Vercel部署、PG隔离测试混为一项PASS。
- **回写**：每次实际工程交付把 `commit SHA / changed_paths / 原需求ID / 测试命令与回执 / 正反权限 / DB迁移与环境 / 未完成HOLD / 回滚 / UI退化检查` 更新到 `progress.md`、`target-diff.csv`、必要的`PLAN.md`和`CURRENT.md`。不要新建平行任务书；历史段落可保留但应标识观察时点。
- **费用**：此前工程账记录模型费用上限人民币20元，不能据此推断余额、授权范围或新的付费调用已经批准；额度变化以现行Owner批准为准。

## 七、立即施工批次的验收标准（Codex不得自称M2已全部PASS）

`M2_PRIVATE_ORIGINAL_GITHUB_CODE_READY`：当前CI恢复绿，类型/单测/构建有真实命令回执；原件上传/存储/恢复/下载及服务端权限模块静态与单测完整，迁移/回滚脚本与环境配置审查无悬空接口。

`M2_PRIVATE_ORIGINAL_VERIFIED_ISOLATED`：独立PG/Storage合成真实样本通过合法读写+跨Owner/撤权/损坏/中断/重复负例；明确DB与对象的不一致补偿和备份恢复；测试身份、时间、版本、命令和回滚证据齐全。

`M2_PRIVATE_ORIGINAL_VERIFIED_LIVE`：获得相应生产授权，在真实独立权限和私有Bucket上成功做受控合法样本上传→回读→hash→Studio修订→恢复，生产业务未受损，实际入口行为复核通过。**未拿到真实生产授权/样本条件仍为HOLD，不伪造PASS**。

`ENG_NEXT_01_EVIDENCE_COMPLETE`：M0/M1剩余工作证据齐全、M2上述工程内容及证据桥可明确准出或具名HOLD，受控UI退化修复可见且未倒退；不等于整个M0—M8已完成。

---

## 八、交给Codex的直接开工指令（可整段复制）

> 继续墨痕 MoHen 项目已批准的 `MOHEN-KNOWLEDGE-01 → MAB-ENG-01 → ENG-NEXT-01` 受控工程施工。你此前可见的 `MoHen_MAB_完整设计交付包_20261102.zip` 继续作为设计权威；新增的《MAB-ENG-01 工程施工增量交接书 V1.0》（本附件）是**增量施工状态**，不能用旧包源码镜像覆盖已有GitHub成果。请直接连接 `xiezuojie03-web/mohen-agent-2.0`，获取最新 `origin/main`，核对 `AGENTS.md`、`CURRENT.md`、`tasks/implementation/MAB/{PLAN.md,target-diff.csv,progress.md}` 和真实源码。交接时HEAD是 `dae824fa5f47a9a239a0c98285c002f69a79b717`；若已变化，以新HEAD为准先对差分。**第一件事恢复最新失败CI run `41458964029`（新增附件路由测试mock接口缺失），重跑类型、单测、构建并回写证据；然后按本文件第五部分继续M2私有原件迁移的隔离测试、真实私有Storage、项目Owner权限、PENDING→STORED_VERIFIED、源资产修订、故障恢复以及L1→L2→L3证据桥。** 不重新研究新架构、不创建平行进度账、不绕过独立Gate、不覆盖合法旧数据、不提前启用未经验证的生产原件入口。GitHub按批施工，不必每一步Vercel专项部署；保留自动部署现状。已授权范围内技术问题自主闭环，只有确实超出产品/成本/外发/生产权限边界的问题再向Owner提出决策。每批将真实SHA、测试、错误、HOLD及回滚原位写回现有账册，完成完整可验证施工后再提交Owner验收。

**交接结束。此文档不代表生产Migration已执行，不替代旧交付包，不自行签发Gate、工程或Owner准出。**
