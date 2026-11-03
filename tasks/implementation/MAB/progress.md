# SDD ledger — plan: tasks/implementation/MAB/PLAN.md

## 授权与执行约束

2026-11-02 Owner批准持续施工；技术自主；产品功能/效果/方向/成本变化需白话说明并决策。最终唯一main、Vercel可访问、三模式+Admin+持久知识资产存储。

Ruling: 在现有干净checkout切换到最新main施工，不新建远端分支 — Owner要求唯一main，现目录是本任务独立执行副本 — 风险以小批提交、测试与历史记录控制。

## M0事实

- origin/main=db21cefcc09c6bcb5d7e3fca16d100cc0accd13d；与设计base一致。
- a001/production=759dbbd、codex/k3-migration-20261101=65b26cd均为main祖先，无独有提交。尚未删除。
- Supabase fwrhxddcpkibsnmddcfl ACTIVE_HEALTHY PG17.11。imported_materials RLS=false、anon/authenticated有SELECT/INSERT；gate_candidates不存在；storage.buckets为空。
- Vercel项目prj_nzfi9XWLJKuIMxWGKmYUrNpcyLtV，团队team_hUpVPUMnytgHi0OOs5YVc4NF；详情403，需要团队连接授权，链接已呈现用户。
- 现有3份K3迁移已包含安全底座和Gate设计实现，先隔离验证与接线，不重复新建同义方案。
- pnpm test基线受包管理器用户目录不可写及历史Windows-only隔离脚本影响，未通过；unit首次缺ajv且联网Commons失败；正在补依赖与隔离PG。
- Docker socket权限请求被自动审批拒绝（可控制整个容器环境），没有绕过；改用workspace下普通用户PG进程。

## 接口依赖预检

M1→M2: 数据库验证会话与项目身份先闭合再引入持久资产。
M2→M3: 现Gate候选/审计与原件/修订映射必须一致。
M3→M4/M5: 正式资格启用与业务保存、出版各自分账。
M4/M5→M6/M7: 双主体回执、同作品rev与合法消费提供真实验收前置。

## 当前工作

M0 进行中；M1兼容权限边界验证进行中；M2—M8未完成。

## 2026-11-02施工进展更新

- Owner准许沿用现有模型服务，本轮付费调用最多人民币20元；尚未发起付费研究。
- Vercel团队访问已恢复；现有正式部署READY，不代表三模式完整验收。
- 真实库98条raw_items均有ref/hash，但私有桶为空；L1→L2和L2→L3证据链接均为0。
- 常规单测75 PASS/4 SKIP（原有联网来源测试）；生产边界14 PASS；Next构建及Web tsc通过。
- 原默认pnpm test受本环境包管理器路径限制；直接运行默认隔离脚本又因缺少.env.local而安全停止，不报全套通过。新M1测试走独立本地PG17，无生产数据复制。
- PostgreSQL17真实隔离测试：现有22基线迁移+3份K3迁移；身份/越权/禁用/过期、并发、撤权、原件修订、读模型、711条合成旧审计保全、回滚和重跑均通过。新素材仓储通过同连接事务/跨用户/回滚身份清理验证。
- 发现云端pgcrypto位于extensions而非public；已用真实隔离重现合法用户误拒，再修正两份尚未生产应用的K3迁移，public/extensions两布局均通过。
- 独立代码审查未发现重要问题；其为静态审查，测试由工程执行。
- 自动审批拒绝私有对话导出到本地。没有绕过导出限制；改为同库mab_backup受保护快照，匿名无schema usage，711条审计及对话哈希与源一致。
- 真实库已应用mab_m1_private_preflight_backup和mab_m1_security_boundary；imported_materials RLS=true、anon SELECT=false、authenticated INSERT=false。Gate候选迁移确认窗口过期，尚未应用。会话验证配置尚未证实可用，M1线上仍HOLD；不推送新素材路由造成业务中断。
- Vercel原有七项敏感配置从plain改为encrypted，值未更换；此前工具结果意外回显的凭据仍需轮换，禁止把加密显示当作已消除暴露风险。

Ruling: 保留当前实际AGENTS旧权威入口，待目标合同、守卫及运行证明齐全后再原子切换 — 避免仅靠文档把新链标为已激活 — 代价是施工期目标规范与当前路由必须明确分账。

## M1受限身份接线与最新状态

- 平台自动审批拒绝复用浏览器AUTH_SECRET到PG，改为独立生成MOHEN_DATABASE_SESSION_SECRET；Vercel生产Sensitive及DB私有校验表均已provision，原浏览器密钥未复制到PG。网站先验浏览器会话，再签30秒DB身份；DB独立验签、过期与活跃账户，不改变用户登录方式。
- 受限身份需要postgres可SET mohen_app_runtime、不得INHERIT，也不涉及Gate签发角色。该关系曾被自动审批拒绝，Owner在本会话逐项批准后已执行。
- 真实库只读事务验证合法短期身份、过期身份与伪造身份行为通过，事务整体回滚，无新增生产素材或对话。
- 新增独立DB身份测试2项；总单测77通过、4既有联网项跳过。构建及类型检查通过。独立审查认可此身份方案，提醒文档必须写“服务器短时凭证”而非“原浏览器token”。
- GitHub已推送首批施工计划/状态6693ec5；清理codex/k3-migration-20261101成功。a001/production仍为GitHub默认分支，删除被服务器拒绝；修改默认分支API返回403管理权限不足，已请求Owner在设置中改main，未绕过。
- M1仍有浏览器真实登录/导入/权限E2E待发布；M2—M8未完成，不能据当前测试宣称完整目标已实现。

Ruling: 数据库验签改用独立短时服务端凭证 — 避免持久复制浏览器登录密钥、缩小泄露影响 — 多一项私有配置同步，缺失时失败关闭。

## M2资产底座与凭据轮换进展（2026-11-02）

- Owner已把默认分支切为main；两条无独有提交的旧分支已清理，远端仅main。M1提交88aad0e正式部署READY。
- 已获Owner逐项批准：受限身份切换、私有资产增量迁移、网站登录密钥轮换、数据库密码轮换并同步网站。无需再次询问同一授权。
- 生产库应用20261102105810_mab_studio_assets及20261102105829_mab_m1_gate_candidates。七张Studio表全部RLS、匿名不可读；未填生产测试数据。原711审计与对话原字段对照无改变。Gate独立签发迁移未启用，保持HOLD。
- 新增资料台项目/人工记录保存及历史版本、服务端会话身份、同连接事务、重试幂等与CAS。跨用户引用委托/回执的漏洞已由真实失败测试重现并修复；读取保存回执前身份被撤销时整个事务回滚。未知成本保留null。
- 单测86 PASS、4原联网项SKIP；真实PG迁移/仓储/撤权/跨用户/并发/历史保留/回滚PASS；浏览器创建、保存、刷新、修订、历史、越权、丢失回执后的重试防重复PASS。最新连接配置改动后再运行发布前构建及浏览器复验。默认全套pnpm test仍未通过，不混同这些专项验证。
- 网站AUTH_SECRET新配置已保存，需下一部署才生效。数据库密码尚未重置：现有Supabase连接器没有项目密码重置接口；已请求Owner通过官方控制台重置，再把新值只填Vercel Production Sensitive变量MOHEN_DATABASE_PASSWORD，不发送聊天。代码已验证特殊字符、空值拒绝与证书核验；无生产密码写入代码或测试。
- M2仍欠实际原件对象存储、规范作品绑定及外部代理来源；M3—M8继续施工。没有付费模型调用。

Ruling: 使用单独密码安全变量覆盖旧URI密码，保留连接地址与TLS参数 — 减少手工编辑连接串导致的错误，允许Owner只在官方安全界面输入密码 — 重置动作仍需官方控制台完成，不能把代码就绪写成密码已更换。

## ENG-NEXT-01｜首轮接续施工回执（2026-11-02）

- 输入GitHub`main@c032ec640500e508c6345120d5e18dc804a6dc0f`、Vercel此前production `READY@c032ec640500e508c6345120d5e18dc804a6dc0f`。本批准备以一次Git提交实施最小UI与施工账修复；实际Commit/CI/新部署需另核，不因本条预填标PASS。
- **真实只读数据库**：`source.raw_items=98`；`evidence.reading_units=38`；`evidence.material_evidence=166`；`evidence.read_unit_evidence_links=0`；`world.claim_evidence_links=0`；`storage.buckets=0`；Studio表7个、当前项目/修订0条；Gate候选表存在；`imported_materials` RLS=true，anon/authenticated无直接表GRANT。
- **已存在迁移**：`20261102094218`、`20261102095611`、`20261102104020`、`20261102105810`、`20261102105829`。仅说明已执行迁移，不代表独立Gate签发策略已正式投运。
- **M0差异账**：74正式目标：53条原REVISE路径存在（仅`CODE_PRESENT`，目标正文是否相符待验），21条CREATE路径缺席（`HOLD`）。20项额外工程差异与234路径反向对应仍需专项逐ID核对；状态`M0_RECONCILIATION_HOLD`。未伪称74项目标通过。
- **UI-R01**：HOME恢复“开始创作”主入口；创作到出版流程只呈现三步，不强制串行WATCH/EXP；Admin不升为第四内容模式。
- **UI-R02**：Studio新对话可重置本地临时状态，清空前提示，已有服务器资料不删除；把无效“历史”改成可访问的`/studio/desk`“研究记录”；阶段高亮根据交谈、分镜、提交回执变化。
- **UI-R04**：WATCH过滤无效章节并处理零章节：不显示`01 / 00`、无效自动翻页及空时间轴；作品列表仍可选择其他作品。
- **M1/M2 HOLD**：登录态与导入合法E2E、凭据轮换回执、原件对象存储/回读/哈希、两座证据桥及真实备份恢复。数据库仅SELECT，未更改RLS/Storage或真实数据；没有外部AI收费。
- **验证级别**：源码锚点与条件分支静态检查`CHECKED`，完整Next构建、GitHub CI、Playwright真实设备及Owner UI验收待提交后观察/执行，初态`NOT_RUN`。不将历史测试PASS当本轮复验。
- **失败恢复**：源代码回退到`c032ec640500e508c6345120d5e18dc804a6dc0f`，不回滚安全权限、新旧合法作品修订或生产库已存在的记录。

## ENG-NEXT-01｜M1高风险遗留附件入口防护（2026-11-02）

- **运行已核**：上一提交`8b3b9e1`的GitHub Actions `ci` run `41452175716` 结论`success`；Vercel Production同SHA `READY`。公开页面实际读取证实HOME“开始创作”、Studio“研究记录”、WATCH“暂无章节”已出现；登录态创作和Owner审美未验收。
- **新发现M1安全缺口**：`apps/web/app/api/studio/attachments/route.ts`原来接受任意附件字节，写入`public/uploads`并将公网路径登记为`public.assets`候选。无稳定私有原件存储、无字节回读/哈希证明，且在Serverless文件系统上无法承诺持久性。
- **最小安全修复**：此历史POST先验证登录，认证用户收到`503 private_original_storage_unavailable`及明确提示；无文件读取、无`public/uploads`写入、无伪资产持久化，`Cache-Control: no-store`。另增加3个正/反例单测。现有`/api/studio/materials/import`的私人受控文本/PDF阅读导入不改、不冒称原件已存。
- **产品影响**：旧附件入口在M2原件私有Storage与真实回读校验之前暂不可用；恢复门是Owner授权的私有存储策略、权利范围、上传/回读hash、失败回滚、跨用户拒绝与实际浏览器E2E。既有资产记录不删除，旧公开URL的历史影响需单独排查。
- **本次GitHub范围**：仅旧附件API、其单测、`target-diff.csv`中`apps/web/app/api/studio/attachments/route.ts`标记、当前状态与本回执。无Supabase/Storage/Gate写入，没有付费模型调用。
- **核验分级**：GitHub提交不代替CI PASS；CI/新部署/实际接口检查在有工具回执前为`NOT_RUN`，历史UI已核成果保持。M2原件功能及M0剩余20/234全量双向校验保持HOLD。


## ENG-NEXT-01 / M2｜私有原件对象适配器施工（2026-11-02）

- 新增 `packages/data-access/src/private-original-storage.mjs`：服务器端私有Bucket专用原件适配器，UUID路径、无覆盖上传、服务端私有回读、SHA-256和长度双重核验、错误失败关闭与失败时的限定清理能力；单个对象最大10 MiB，不允许公共URL。Storage API以真实服务端密钥调用，但密钥不返回浏览器。
- 新增 `tests/unit/private-original-storage.test.ts`：7条含无密钥/不安全URL、非法路径、上传回读hash、覆盖拒绝、篡改、大小及补偿的合成测试。由CI运行并附证；**不能代替真实Supabase隔离Storage回读、对象元数据RLS及浏览器E2E。**
- 此批不启用旧 `/api/studio/attachments`，不创建生产bucket，不迁移/写入真实数据库，不注入或查询生产Storage密钥。M2还缺项目所有权和`PENDING→STORED_VERIFIED`元数据事务、数据库迁移/回滚、对象与DB统一备份、D01→D02→D03桥接；不能据适配器存在宣布原件能力可用。
- **部署策略裁决**：以后按GitHub工程批次集中开发和CI，M2/M3集成关集中做Vercel真实页面验收。已有main自动构建机制暂不调整、不人工逐提交触发或检查部署；自动触发的构建不等于Owner验收。


## ENG-NEXT-01｜M2原件接线（2026-11-02）
- GitHub提交：原件仓储新增owner-RLS事务下的PENDING登记、带项目所有权的幂等保留、STORED_VERIFIED原件状态及source_anchor不可变资产修订；真实对象接口使用已有私有Storage适配器，上传前查已存在对象可在超时后恢复，不覆盖已有对象。
- POST/GET保留原API路径\`/api/studio/attachments\`，重接真实服务端受限能力；**默认\`MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED\`不为true时失败关闭**，不因代码上线自动开放。服务端会话、权益声明、字节大小与内容类型、项目RLS、私有哈希回读、保存确认、下载前后双重身份验证为必需条件。
- 迁移文件 \`supabase/migrations/20261102140000_mab_m2_private_originals.sql\` 仅作为待审增量，**尚未应用到任何真实数据库**；需隔离执行、角色权限、备份与异常恢复测试，创建非public私有bucket及必要的对象策略后才可正式开关启用。当前Storage=0桶，原件生产流程不具备条件。
- 原件保存并不取得正式L/G资格，且不等于媒体展示或外发权限。下一工程环节是数据迁移隔离测试、真实私有Storage样本、跨Owner及竞态/中断/撤权测试；结果不合格保持HOLD。
- 2026-11-02前一提交\`4e27594\` GitHub Actions单元测试 95 PASS / 1 FAIL / 4 SKIP，失败源于篡改fixture选错GET路径，已在\`8f18f87\`修正；本批测试以新CI为准，尚未声明准出。

## MAB-ENG-01 / CI修复接续（观察基线dae824f）

- 已读取Owner新上传增量交接书V1.0，保持原M0—M8与74目标/20补充/234路径体系。资料库单份受控任务书未直接读取，不虚构。
- 最新FETCH_HEAD=dae824fa5f47a9a239a0c98285c002f69a79b717；原本地origin/main因旧fetch refspec滞留db21cef，已改为只跟踪main并同步，未回退远端。旧未提交UI与状态补充保存在本地stash `pre-MAB-ENG-01 UI recovery and verified production ledger`，不覆盖其他工具已提交UI修复。
- GitHub失败run41458964029/job125322787916：Typecheck成功，Unit tests五项失败，Build未运行。读取原始日志并本地重现5 FAIL/2 PASS。原因是路由改从统一入口导入后，测试替身缺MAX_ORIGINAL_BYTES/createPrivateOriginalStorage；只同步测试入口，保留原正反断言，不skip或修改真实业务掩盖失败。
- changed_paths：tests/unit/studio-original-attachment-route.test.ts及当前账；需求M2_PRIVATE_ORIGINAL_GITHUB_CODE_READY的CI前置。修复后全单测103 PASS/4既有联网SKIP；生产边界73 PASS；六工作区tsc全0；85API/152动作/62模块/5屏追溯及鉴权103路由0缺口。构建完成后追加结论。
- pnpm11环境包装器递归检查失败；等价执行仓库锁定工具node_modules/vitest、各tsconfig的tsc、Next build，不改锁文件、不引入全局配置；GitHub仍按Node22/pnpm9.15.4精确CI作最终验证。默认pnpm test缺本地.env.local的历史障碍仍NOT_PASS。
- 回滚：仅回退本批测试替身与账的提交，不回滚原件安全关闭或历史资产。生产DB/Storage未修改，付费模型调用0。

- CI修复批本地Next生产构建成功（完整路由生成），`node apps/web/node_modules/next/dist/bin/next build`于apps/web执行；无生产DB依赖。GitHub新CI待推送后取证，不以本地结果替代。

## M2-ORIGINAL-ISOLATED｜真实原件隔离批（基线7e83f3b）

- **CI前置已闭合**：7e83f3b9f05643c310ee0524808b0f364913efaa，GitHub Actions run41460853487/job125329194614 全部success（含Typecheck、Unit、生产边界、追溯、Build、Auth）。没有人工逐提交Vercel部署/验收。
- **原需求**：M2_PRIVATE_ORIGINAL_GITHUB_CODE_READY / M2_PRIVATE_ORIGINAL_VERIFIED_ISOLATED；74目标中的附件路径及20补充责任中的统一访问入口已原位补证，但不把整个路径的CODE_PRESENT升为目标全量PASS。两座证据桥与LIVE准出仍HOLD。
- **真实生产只读复核**：studio.private_originals未创建、storage.buckets=0、source.raw_items=98、read_unit_evidence_links=0、claim_evidence_links=0。组织当前free套餐；未升级、未创建生产bucket、未改变生产角色/密钥/数据、未开启MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED；未产生付费模型调用。98条历史指针绝不批量标为已存字节。
- **真实协议而非mock**：在workspace普通用户进程启动官方supabase/storage release v1.43.0（源提交53462ff，package-lock SHA256 4d294cbe67544b8e7c4568ff692e8df67566bf7694a71692f6b99fac3efc4535），官方既有knex patch-package与原生fs-xattr构建后运行；PG17.11+文件后端、私有测试bucket、localhost HTTP及自签测试CA的HTTPS代理。未使用Docker socket，未接入任何生产服务密钥。协议验证版本不冒充当前托管服务版本或LIVE。
- **发现并修复**：官方对象不存在返回HTTP400、正文statusCode404，旧适配器误判首次上传。真实HTTP失败重现后，仅识别精确Object not found/NoSuchKey，不把鉴权/缺桶误作可上传；下载流有界，拒绝超量声明或实际字节。路由在formData之前流式限量/20秒超时，拒绝异源浏览器POST；成功/失败均no-store，不返回路径/密钥/公有URL。
- **候选迁移**：20261102140000尚未在生产执行，允许在本批修正。真实PG重现已验证收据可退回PENDING后，增加不可逆/不可改原件元数据trigger、同asset复合revision FK及source_anchor/project/actor/hash/storage_ref精确绑定；PENDING必须两验证字段皆空，STORED_VERIFIED必须皆存在。rollback只撤权限，保留收据/字节/修订，不删表或恢复公有入口。
- **DB与对象非原子性**：先Owner RLS预约；无覆盖上传并回读；同事务source_anchor+STORED_VERIFIED。实际测上传已落盘而ACK丢失→重新回读恢复、最终DB trigger失败→仅PENDING留存/无半个asset head→同请求恢复；同key不同内容409；并发请求只有一个准确revision。不自动删除PENDING孤儿：按原ID/hash恢复，无法确认则人工隔离，不在请求失败时删可能由并发成功的对象。
- **正反权限**：匿名、跨Owner、伪项目/原件、disabled、expired/forged、封存项目、读取中撤权拒绝；合法对象hash与长度一致，匿名public路径/认证路径均拒绝，错hash及篡改拒绝；pool身份清理通过。另发现finalize在UPDATE RETURNING后撤权仍可能报成功，已新增真实触发器失败测试并补RLS读取回执后再提交，最终复验另记。
- **恢复**：同backup_id保留原件bytes/hash、原件及准确revision元数据、完整隔离DB pg_dump；真实pg_restore到新测试库，验证同hash/revision且ARCHIVED保持。恢复库先清除旧session_verification_keys，旧token实际拒绝；对象删除/恢复后仍同revision，恢复字节不恢复已撤的项目访问。原件rollback后读写及列级UPDATE均撤销，收据哈希未改变。备份均合成数据，未导出生产对话/密钥。
- **类型契约**：新增tests/types/private-original-consumer.mts由Web类型检查覆盖。先重现缺可选MIME及discardUnverified声明，再补统一d.mts；错误bytes/缺hash/伪身份/缺项目的负例@ts-expect-error必须有效。无运行时测试代码进入产品组件。
- **测试命令与回执**（工作区/workspace/mohen-agent-2.0；与CI锁定工具同等入口）：
  - `CI=true node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts`：107 PASS/4既有联网SKIP。
  - `node --test --experimental-test-isolation=none tests/data-production/*.test.mjs`：73 PASS。
  - 六个工作区 `node node_modules/typescript/bin/tsc --noEmit -p <tsconfig>`，全部0；Next生产build通过（由隔离HTTP runner执行）。默认pnpm test仍因本地.env.local历史前置NOT_PASS，不混为全套通过。
  - `MOHEN_TEST_PSQL=... MOHEN_TEST_SOCKET=... node scripts/test-k3-db.mjs`：PG17真角色/RLS/修订/收据/rollback通过；extensions加密布局亦通过，无Storage配置时明确打印STORAGE_HOLD。
  - `MOHEN_TEST_STORAGE_CONFIG=<合成配置路径> node tests/data-production/private-original-storage.integration.mjs`：官方服务真实HTTP PASS。
  - 在上述PG命令额外提供MOHEN_TEST_STORAGE_CONFIG：官方HTTP+真实DB故障/恢复/pg_dump/pg_restore PASS，不是fetch模拟。
  - `MOHEN_TEST_STORAGE_CONFIG=... MOHEN_TEST_PSQL=... MOHEN_TEST_SOCKET=... PLAYWRIGHT_BROWSERS_PATH=... node scripts/test-mab-http.mjs`：真实Next生产构建+Chromium 2 PASS（原记录保存/历史/重试/跨Owner；multipart原件上传/重试/hash下载/跨Owner/声明/内容冲突），清理自己的合成DB和对象。
  - `node scripts/guards/check-k3-traceability.mjs`：85API/152动作/62模块/5屏；`node scripts/check-auth-coverage.mjs --strict`：103路由0缺口。均为静态门，不当作全动作运行PASS。
- **可复现Storage环境**：scripts/serve-mab-storage-isolated.mjs要求已标记本地PG和workspace内官方v1.43源码，核锁文件hash/无.env；拒绝覆盖已存在测试库，独立storage测试admin避免改k3_admin search_path，生成仅localhost配置及测试CA。准备源码：官方v1.43.0 tarball→`npm ci --ignore-scripts`→`node node_modules/patch-package/index.js`→`npm rebuild fs-xattr`（缓存/devdir留work）→`node build.js`→`node node_modules/resolve-tspaths/dist/main.js`。运行fixture后将打印的配置路径只用于上述隔离测试，停止fixture清除其自建合成DB。严禁把真实服务key填进测试配置。
- **审查/UI/剩余**：独立静态审查未发现重要阻断；无首页/Studio/WATCH视觉改动，保留8b3b9e1成果，未套旧包源码。测试不等于Owner体验签收。生产受控原件仍缺服务凭据/实际bucket与批准后的激活验证；Vercel请求体上游限制可能先于10MiB应用门返回413，未声明大文件LIVE可用。下一批在原source/evidence/world实现L0精确绑定及两桥，当前不宣称M2全部准出。
- **回滚**：停原件开关；执行新增fail-closed rollback（先隔离再授权生产），不删除对象或PENDING收据。代码可回退7e83f3b，旧公有上传不可重新开放。具体提交SHA与新CI待提交后补记。

- **98条旧原件逐条分类回执**：生产只读取ID/source_version/hash及指针类型，记录于tasks/results/MAB/M2_legacy_original_audit_20261102.csv（证据产物，不是第二进度账）。93条为memory://非持久字节指针；5条为仓库public/production-assets文件。五个实际仓库文件224752/260555/228891/319665/198068字节与各登记SHA-256匹配，但未迁移为私有对象，也未据此签权利/G资格；98条byte_size原字段全空，未修改历史行。public.assets共6条，其中/uploads/旧公有附件链接计数0；仓库无public/uploads文件。此范围不足以证明全部历史部署/缓存都不存在公有附件，未删除任何记录或图片。
- **最终读取回执复验**：新增after-update撤权真实PG失败测试已RED→GREEN；同库PG角色/原件/官方HTTP/恢复与rollback完整PASS，最后Next生产构建+Chromium两流程PASS，测试自己的对象/DB已清理。

## M2-EVIDENCE-BRIDGE｜私有文本证据桥隔离批（基线4b75c7a）

- **前批提交/CI**：4b75c7a2d4911952048c2d8cb3115d107425dcc1；GitHub CI41465083552 SUCCESS。后续批仍只main；不手动逐提交部署Vercel。
- **需求与范围**：沿M2/C和既有source/evidence/world真源，新增内部createEvidenceBridgeRepository；没有新建知识主表、Runner、Gate或公开API。当前仅text/plain、UTF8字节范围；PDF页码/图片区域/真实OCR仍HOLD，不用猜定位或旧memory指针冒充原件。
- **真实正向链**：官方私有Storage原件回读→源版本/raw_item全文件hash与字节长→read_run.raw_item/input_sha→read_unit.locator/payload_ref/quote_hash→material_evidence的精确source/version/raw/引文→既有read_unit_evidence_links→claim_evidence_links绑定准确claim_revision。测试用合成中文原件真实UTF8多字节，不是纯mock。quote最多32KiB且不允许截断UTF8字符。
- **物理补充**：CLI创建候选迁移20261102145410_mab_m2_evidence_bridge.sql，未生产执行。现有world.claim_evidence_links缺准确revision字段，增量补claim_revision_id；旧NULL修订行仍按旧唯一身份，带修订的新行按revision/evidence/support唯一，允许同主张不同版本各自引用同证据；不删除或猜测回填旧行。
- **权限与内容边界**：绑定函数SECURITY DEFINER固定pg_catalog路径，先显式校验Owner/活跃账户/ACTIVE项目，并锁账户/项目，随后核准确来源元组；函数只授mohen_app_runtime，anon/authenticated/service_role不开放，通用角色没有底层证据表写入权。所有新桥为private_research_candidate、UNASSESSED，g1_decision_id不伪填，绝不写Gate PASS或发布。主张必须在准确revision中显式列出project_id/evidence_ids，禁止按名称、第一条材料或旧引用猜关系。
- **独立审查的重要问题与修复**：初版仅靠JS核字节，通用runtime可绕过服务直接SQL写“verified”标记。真实低权限直调已RED重现。改为独立的control.original_bridge_verification_keys（运维配置、非知识主表）与服务端MOHEN_ORIGINAL_BRIDGE_SECRET：与浏览器/会话/Storage密钥分离、默认无配置拒绝。服务在真实字节/引文核验后签30秒HMAC，绑定当前DB已认证Actor、项目、原件/hash、证据、读取单元、完整定位、引文及序号；DB独立验签/期限/精确输入，再记录摘要回执。原始密钥和签名不返回浏览器。当前只provision合成隔离密钥，未改生产密钥。
- **核验权限负测**：无核验凭据的低权限SQL直调拒绝；带真实测试签名但过期、错unit、错quote、缺exp均拒绝；runtime读核验密钥表拒绝；撤销核验key后新读取绑定与主张绑定拒绝。回执密钥版本独立，不以旧恢复密钥/Producer身份代签G。
- **不可覆盖与回滚**：被私有桥固定的source_version/read_run/read_unit/material_evidence和准确claim_revision/两条边禁止原位UPDATE/DELETE；错误修正建新版本，账户/项目/资格仍可撤权。低权限并发/重复同链接只得同ID；错quote、UTF8偏移、来源版本、假claim revision、跨Owner、封存项目均拒绝。fail-closed rollback仅撤绑定函数EXECUTE，连接及其hash保持；不会为恢复旧唯一约束而丢弃新版本证据。
- **已执行证据**：真实PG17+官方Storage完整脚本输出MAB_EVIDENCE_BRIDGE_PASS、MAB_EVIDENCE_BRIDGE_ROLLBACK_PASS；public与extensions两种pgcrypto布局均通过。之前发现的两次RED（缺服务、固定版本可覆盖）与审查直调RED均留实际失败日志，再GREEN。Next生产build通过，Web类型/正反consumer类型通过；现有107单测PASS/4原联网SKIP、73生产边界PASS。最终提交/CI结论另追加，不用这些专项冒充默认全套pnpm test PASS。
- **当前HOLD**：未把当前Registry/旧layer1-adapters激活；新服务尚未绑到实际D00—D03受授权生产worker。旧adapter的memory原件、batch_level或第一条材料归因不能通过本桥。正式G1/G2/G3、真实Reviewer策略、生产私有桶及独立后台凭据、PDF/图像读取、公众消费者的当前资格/准确revision过滤与Owner验收继续按M2—M8推进。仅孤立来源/材料/主张连接测试通过，不称真实AI研究或整个M2完工。

- **证据桥提交/CI回执**：cf1c3ed61babd92179c886ebbebf36afcc3c159b；GitHub Actions run41469702928 SUCCESS，类型/单测/生产边界/追溯/构建/鉴权全部通过。独立审查的重要SQL绕过问题已用真实低权限直调RED→GREEN及短时签名错范围/过期/缺字段/撤密钥负测闭合。上传停滞408的额外资源回归加入后，本地108 PASS/4既有联网SKIP；此单测与汇总回执的提交CI另观察。
- **M3生产预检（只读）**：current_qualification_is_valid(uuid)函数、gate_policy_versions、gate_reviewer_bindings均不存在；qualification_current与gate_candidates各0。现有app_runtime/producer/gate_signer均NOLOGIN、非super、无BYPASSRLS。未伪造真实Reviewer或专业PASS；M3投运必须沿原独立权限迁移与真实策略/身份完成。
- **生产准备待决**：已向Owner提交有界生产准备问题（增量交接书§5.B.7）：两份M2迁移、仅后台私有bucket、独立字节核验密钥；不删历史、不授G、不开放公有访问、不升级免费套餐，开关先关。未收到本项回复前，生产依赖步骤未执行；GitHub及隔离证据不受影响。

- **汇总回执补证**：停滞上传408与不支持文件类型拒绝回归加入后，最新本地单测109 PASS/4既有联网SKIP；源码不变。安全回执与实际输出摘录已保存到tasks/results/MAB/M2_SECURITY_RECEIPT_20261102.md及evidence/，不建立第二套施工账。

- **回执提交与资源清理**：3ed0c8b89fd902e38d977564a455c92a6e45557f保存109项单测回执及安全汇总；对应CI41471113675运行中（最终以该run实际状态为准）。专用官方Storage/HTTPS合成fixture已停止并清除自建测试库；每轮业务测试库与对象已清理，未删除生产原件。远端HEAD仅refs/heads/main。

## 2026-11-03平台切换交接

Owner因额度不足要求全部施工推送GitHub并换平台；暂停新增功能。接续索引`PLATFORM_HANDOFF_20261103.md`，原ZIP和增量书完整归档inputs并记录SHA256。全部已实施源码与测试已在main；原UI stash的13文件完整patch及公开页面PNG/历史测试摘录归档results/MAB/archives，未覆盖main合法成果。d3727ab的CI41471354205与3ed0c8b的CI41471113675均SUCCESS；最终归档提交的CI以GitHub实际状态为准。未上传密钥、cookie、DB dump或临时测试数据。生产准备问题仍未收到回复，后续平台须保留此HOLD。


## 2026-11-03｜工具交接后接续：API-023公开证据资格隔离（GitHub源码批次）

- **接续基线**：Codex交接 `PLATFORM_HANDOFF_20261103.md`，最新main开始时为 `177501e122e4a046dcc5194ce54c853c3aae6a66`；继承M2真实隔离PG/Storage/证据桥回执，生产迁移/私有桶/核验key及Gate依旧未启动，生产配置本批不更改。
- **风险**：公开 `/api/public/evidence/:id` 此前直接SELECT `read_model.evidence_pointers`，只依据物理ID，未核实际G5 consumer/purpose/scope/依赖及撤权。代码存在的独立 `createReadModelRepository().getRuntimeEligible` 已具 `control.qualification_allows` 受控SQL；不能另建Gate。
- **本次最小修复**：API-023改用共享合格读模型仓储；上下文从仅服务器配置 `MOHEN_PUBLIC_EVIDENCE_QUALIFICATION_CONTEXT` 取得，要求固定consumer=visual_stage、含purpose namespace/code/version与scope对象，URL查询不接受资格参数；配置缺失/不合法/DB无实际签发函数全部503失败关闭，未合格404，合法200仅保留原字段；所有回执no-store，敏感SQL不外露。代码与声明原位扩展，添加5条正反/权限单测。
- **激活边界**：本批**未**配置该生产环境变量、不安装Gate表、不启用旧G5或发布；当前公开证据详情将失败关闭，直至M3独立资格真正可用。上线前需评估对现有WATCH证据按钮的可见降级文案，不能把未审证据重新开放以修UI。
- **验证**：提交后以GitHub真实CI检查类型、unit、traceability和build，不把源码提交记成PASS。另待M3真实DB按精准purpose/consumer/修订/权利/撤权测试，状态HOLD。


## 2026-11-03｜ENG-NEXT-01 M2→M3定向接续（GitHub施工）

- 施工前基线`c5037f532e90f4a6f90f2a2f2e8444a3641c0b07`，其GitHub CI `41544814835` 已实得 `success`（类型、单测、生产边界、Next构建）。既有Codex M2隔离PG/Storage、桥与真实浏览器回执继承，不冒称本批重跑。
- 生产Supabase只读核查（2026-11-03）：`studio.private_originals`、`control.original_bridge_verification_keys`、`studio.bind_private_read_evidence`都不存在；Storage桶=0；`raw_items=98`，两座桥记录=0；M3两份策略/Reviewer表、独立签发函数、资格有效判断函数均不存在；候选/当前资格=0。真实M2和独立M3仍HOLD。
- **M2接线组件（候选、非取代）**：新增`pipelines/data-production/workers/private-evidence-stage.mjs`，分别为D01真实UTF8私有原件读取候选、D02读取证据桥、D03准确主张修订证据桥。每个方法在读取原件或写候选前调用现有`assertStageExecutionAuthorized`签名grant及在线Verifier，不容旧memory索引或自造PASS；实际桥接调用复用`createEvidenceBridgeRepository`的字节attestation/owner/RLS。输出固定UNASSESSED；不授任何G。旧`layer1-adapters`不改、不激活；真正生产者输入/来源、数据库注册worker与独立Gate恢复仍需后续接线测试。
- **M3启用条件检查组件**：新增`packages/data-access/src/m3-gate-preflight.mjs`，只读核`gate_policy_versions`、`gate_reviewer_bindings`、独立签发/有效性函数、角色权限及六门实际启用策略和有效绑定；缺项逐项HOLD，即使齐全也只能给`READ_ONLY_PRECHECK_COMPLETE_NOT_ACTIVATED`，不冒充已签正式G或真实Reviewer身份认证。
- **正反单测**：私有来源读取必须精确按UTF8字节范围匹配引文和SHA，签署的execution grant不合法时绝不读私有对象或写桥；D02/D03仅产候选并准确绑定修订，不产生Gate PASS。M3结构缺失/无策略/无Reviewer/已配置但未签发逐态校验。
- **边界**：本提交仅源码、单测和施工账；未在生产安装M2/M3迁移、Bucket、角色、密钥或策略。旧历史98指针不可当完整字节资产；未经M3正式Reviewer的候选不可公开。后续应做合成真PG/Storage的worker端到端及签名grant低权限边界测试，然后在Owner独立批准生产准备后才部署新对象与资格角色。
- **回执级别**：本批提交后等GitHub CI真实运行结果；未记录完整M2/M3准出。Vercel按前期批准节奏关键集成关验收，不逐提交检查。

## 2026-11-03｜M3不可自签Gate的编排器强制阻断（接续main@05fc2d2577fed0c9e632efa45f6c16f3a0bfa664)

- **发现**：原`orchestrator.mjs`只依赖stage adapter的`raw.disposition=PASS`推进下一D，未再独立核当下G资格。执行授权grant与专业G审核是两个不同的安全门，不能共用。
- **原位修复**：新增`independent-stage-qualification.mjs`强制核stage/gate/run、独立decision_origin、准确输入输出digest、artifact_revision、当前资格及未过期的Gate回执。Producer返回PASS但无受信独立核验回执、签名不匹配、Gate过期或核验异常时，改为HOLD且清空待传下游outputs，不能跳至后继阶段。
- **测试边界**：原`authorized-fixture.mjs`只在合成测试中注入独立Reviewer模拟回执（生产CLI不注入）；新增缺回执及过期反例。真实运行时`run.mjs`无已激活的跨权限Verifier时须保持HOLD，不能因构建绿灯而启用D链。
- **仍需M3施工**：可信生产回执Verifier需要基于独立DB角色的真实`control.current_qualification_is_valid`/purpose/scope/依赖与准确revision字段校验，并将签发、撤权与运行传播闭合。当前只实现拒绝假PASS的编排门，并无正式Reviewer激活；M2生产迁移/Bucket仍未经独立批准。随后补隔离PG/真实身份测试。
- **CI**：以本批提交对应的GitHub Actions实际回执为准，尚不能预填PASS。

## 2026-11-03｜M0独立基线审查收口；M1安全准出证据核对

- **M0_AUDIT_EXIT_PASS（仅审查）**：以 `main@ff4577afacd9031d91695d706eea597102f2ca56`、Library正式234索引/74目标manifest/20新增清单与最新完整GitHub tree交叉核对。234行=KEEP154、REVISE53、CREATE21、授权归档5、迁移占位符1；KEEP/REVISE/归档路径无意外缺失。18个原路径blob与初始设计baseline不同；74正式目标53个REVISE路径存在/21个CREATE缺席，20新增为18实体路径及2模式/占位符，逐ID均有后续责任。详证 `tasks/results/MAB/M0_AUDIT_EXIT_20261103.md`、`M0_234_BIDIRECTIONAL_RECONCILIATION.csv`、`M0_KAD6_20_RECONCILIATION.csv` 与原位 `target-diff.csv`。此审查准出不代表74目标、M2/M3或Owner验收PASS。
- **现场核验**：GitHub Actions `41549216459` SUCCESS，Vercel生产已READY@`ff4577af`；生产Supabase迁移仍为五个20261102版本，Storage桶0，正式两桥0，私有原件表及独立Gate策略尚未启动；现有五个关键业务表RLS开启，`imported_materials`匿名/普通认证直接写入拒绝，三运行角色均无SUPER/BYPASSRLS。只读检查，不修改数据库。
- **M1_SECURITY_ACCEPTANCE_HOLD**：Vercel正式环境中`AUTH_SECRET`、`MOHEN_DATABASE_PASSWORD`、`MOHEN_DATABASE_SESSION_SECRET`均为Sensitive类型；存在更新时间及更新后的生产部署。上述**不能证明旧泄露凭据已经被轮换并失效**。已有隔离身份/RLS/禁用与跨账户、原件私有化测试继承。剩余：在官方安全控制台核实旧DB密码及此前泄露的其它凭据已轮换；保留可信完成回执（不含值），完成真实会话合法登录/导入、匿名和跨Owner拒绝、过期/撤权及直接Data API/DB负例、合法恢复与安全回退。仍然不能签M1准出；这些不是M2私有桶或M3Gate激活要求。
- **Owner仅在必要时操作**：已批准轮换，不重复征求授权；若Supabase当前连接工具不提供数据库密码重置功能，由Owner在官方控制台执行并只传“操作成功”的非秘密凭证/状态，施工方再完成旧凭据失效与合法新连接验证。不得在聊天、施工账、GitHub或日志公开任何密钥值。
- **状态纪律**：本批应在完成CI后把`PLAN.md` M0六项勾选并注明限定准出；M1复选项保持未勾，直到真实生产安全证据完整。没有修改`CURRENT.md`的生产业务准出结论，也没有为追求M0绿灯启用M2/M3。


## 2026-11-03｜M1 Security Advisor补查及严格HOLD

- 已完成`main@80442a64` M0审查，CI `41563075520 SUCCESS`。M1生产本轮只读：Supabase Security Advisor提示58项无Policy的RLS INFO（不能自动当漏洞，更不能为消除提示扩大权限）、16项函数search_path WARN。16项均是SECURITY INVOKER的触发器函数，其中15项旧public.guard_*未挂现行触发器，source.forbid_raw_mutation已挂1项；未激活的旧守卫不能据名称视为业务保护。专业Gate/状态提升守卫由M3/M5分责验证，M1仍必须保持凭据/会话与素材合法拒绝验收。
- 原位详细证据：`tasks/results/MAB/M1_SECURITY_ACCEPTANCE_HOLD_20261103.md`。此前已批准的数据库凭据轮换需要官方实际操作及旧连接失效验证，环境变量标记Sensitive与生产READY不是失效凭据的证明；M1未准出。未读取任何真实secret值，数据库全程SELECT，无SQL DDL或权限操作。


## 2026-11-03｜Owner反馈：M1数据库密码轮换很可能已经完成，纠正待办措辞

- 现有Codex平台交接文件明确记录：Owner 新增 Vercel Production `MOHEN_DATABASE_PASSWORD` 后，网站数据库只读查询成功；实际生产Sensitive变量已更新，后续新部署已存在。Owner本轮明确反馈Supabase数据库密码轮换**应该已经完成**。因此轮换操作改记为 `LIKELY_COMPLETED_EVIDENCE_RECONCILIATION_REQUIRED`，**不再默认要求Owner重复重置**。
- 这些信息尚不等于已核旧口令失效，也不能证明此前意外回显的其它凭据全部撤销。优先复用现有官方非敏感运维记录；不得读取、复用、粘贴或回放旧明文秘密做验证。
- `M1_SECURITY_ACCEPTANCE_HOLD` 暂不改变，必要余项为合法登录/素材导入、匿名和跨Owner/过期/撤权拒绝、回滚恢复及凭据失效的非敏感证据。不可把新密码是否轮换当作所有剩余M1测试停止的理由。详细见本目录M1安全回执。

## 2026-11-03｜M1私有素材真实回读闭环（GitHub增量）

- 基线 `main@8cdee833`；M0审查已准出，M1仍HOLD。确认现有`/api/studio/materials/:id`读取的是`public.assets`媒资元数据，并不是`public.imported_materials`私有导入全文；因此不能把它误认成私有原件的Owner安全回读。
- **M1受控补齐**：`GET /api/studio/materials/import?material_id=<uuid>`在原有列表接口内新增可选详情，不改变原GET列表与POST入库wire。使用`createImportedMaterialRepository.get`、30秒已签数据库会话、事务内当前用户及表RLS，实体不存在/跨Owner均404；禁止通用DB超级用户直读。读出的全文含`Cache-Control: private, no-store`。不改变M2未来私有PDF/图像对象存储规则。
- **正反验证**：新增unit合法详情、未知/跨Owner、非法ID、禁用/撤权、数据库故障、匿名，扩展现有隔离PG集成验证私有文本本人可读、另一用户读不到、过期/伪造/禁用会话被拒及无数据写入。
- 生产库本批仍无数据写入/迁移；测试状态以本批对应CI为准，单元/隔离通过不代替在线真实Owner登录、旧密码失效的非敏感回执，M1仍`M1_SECURITY_ACCEPTANCE_HOLD`。

## 2026-11-03｜M1会话Cookie安全属性统一

- GitHub `main@1b3ef31b`前一批私有材料全文读取已获CI `41566616583 SUCCESS`；现实现会话Owner下的单条`imported_materials`合法回读，包含拒绝负例与原有list/post兼容。
- **本增量**：登录、邀请/公开注册、退出共用`sessionCookieOptions`，继续HttpOnly、SameSite=Lax与全站路径；在`NODE_ENV=production`显式启用Secure，退出清除Cookie与签发保持一致；本地HTTP开发允许不Secure。新增生产/开发/退出属性测试。
- **边界**：没有重置或读取任何数据库密码，没有改动生产用户或素材数据、生产Storage、Gate，也不触发额外人工Vercel部署验收。最新CI未验收前不标PASS；M1的生产登录、旧凭据失效与实际Owner回归继续HOLD。

## 2026-11-03｜M1私有材料回读与Cookie安全两批完整CI验证结果

- `main@1b3ef31b`：在原`/api/studio/materials/import`的GET添加`material_id`精确查询，受session-token+真实RLS事务控制；单元、已有隔离PG扩展负例和Next build回执：GitHub Actions `41566616583` **SUCCESS**。代码提交 `59fa4ba9` 的首次CI曾因GET参数可选不符合Next Route Handler签名而失败，`1b3ef31b`已更正且最终构建成功。
- `main@2a8c2b49`：统一登录、注册、退出`sessionCookieOptions`并在production设置Secure，同时保持HttpOnly、SameSite=Lax和开发localhost兼容；GitHub Actions `41566911728` **SUCCESS**。两批均未执行生产DB数据写入/DDL或获取任何密码。
- **已验证工程范围**：M1的受权限约束文本详情代码及跨Owner/禁用/匿名/畸形ID/故障测试、会话Cookie生产安全属性均通过CI；但**这并不意味着生产环境真实合法导入/读取E2E、旧凭据撤销及恢复证据通过**。
- **当前正式状态**：`M1_SECURITY_ACCEPTANCE_HOLD`不变；M0仍是`M0_AUDIT_EXIT_PASS`。M1后续待办仅针对真实密码旧连接失效的非敏感凭证、本人合法登录导入、跨账户/撤权与恢复验收。M2私有对象/桥与M3独立Gate继续原计划和独立授权，不因两批UI/API工程CI绿灯提前启用。

## 2026-11-03｜M1五项证据核销；M3独立Authority角色安全补缺

- 在现有`PLAN.md`按五个M1任务逐条整理已验证证据与未完成的生产安全验收，不移动M1状态。旧凭据轮换很可能已完成但仍待非敏感失效凭证，不再默认要求Owner重复重置。M1尚未PASS。
- 对照K3 Gate迁移发现只读就绪检查漏核实际创建的`mohen_gate_authority`独立事务角色。现补四内部角色存在、NOLOGIN、非SUPER/无BYPASSRLS，额外只读检查Producer/App Runtime/Signer不得继承Authority，增加正反测试。这是现有K3专业权限体系补缺，仍不启用真实Gate，不代表Reviewer签发通过。
- 本批仅GitHub源码、单测及原位施工账；未改生产数据库、Storage、Gate或凭据。CI以实际GitHub回执为准。


## 2026-11-03｜M2受控原件工作器装配入口

- GitHub M3预检/ M1任务证据补正提交`deed13e1` CI `41570721926 SUCCESS`，继承此前隔离PG/Storage真实正反回执，M1仍HOLD；M0仅基线审查已PASS。
- 新增`private-evidence-binding.mjs`：以唯一`pool`、私有`storage`、服务端桥核验密钥装配`createPrivateOriginalRepository`→`createPrivateOriginalWorkflow.download`→`createEvidenceBridgeRepository`→`createPrivateEvidenceStageWorker`。D01与D02/D03使用同一个Owner/RLS原件回读；所有D阶段仍先核实签名执行授权，所有结果仍`UNASSESSED`、不可自签G。
- 新增合成正反测试核缺DB/Storage/核验key、真实装配引用、错误授权前不读取对象、D02/D03仅转交现有桥。**这是工作器的受控组合入口，不是注册到主编排器或生产环境启用**；仍须后续真正的Registry装配/专业资格/隔离PG端到端测试。
- 本批只提交GitHub源码/测试/施工账；无生产DB、Storage、凭据或Gate写入。当前CI待核。


## 2026-11-03｜M1独立收口优先推进、M2/M3继续施工的批次校验

- `main@deed13e1`：M1五项任务“工程证据/生产待验”已在`PLAN.md`逐项登记；M3独立`mohen_gate_authority`角色及继承/NOLOGIN/超权预检修复。GitHub Actions `41570721926` **SUCCESS**。
- `main@f3a39e6`：M2新私有证据工作器装配入口（Owner-RLS原件仓储→私有回读→现有字节证据桥→D01-D03待审核候选），新增合成装配/拒绝测试。GitHub Actions `41571059844` **SUCCESS**；该CI不能代替真PG/Storage的新增端到端验收，更不能签发M2生产PASS。
- **阶段判定**：M0`M0_AUDIT_EXIT_PASS`保持；M1`M1_SECURITY_ACCEPTANCE_HOLD`（旧密钥失效非敏感回执、当前生产合法登录/导入/读取与跨Owner/撤权/恢复验收缺）；M2隔离验证继续可继承但私有生产桶/迁移/密钥未获本批生产启用；M3独立Gate仍未安装正式审核策略/身份与真实Verifier，保持HOLD。
- **范围纪律**：本批无生产数据库、Storage、角色、Gate、密码写入；不因工具/阶段变化重新研究六份MHKA或重复已通过的低权限隔离测试。M2/M3后续围绕真实执行入口和独立Reviewer资格继续增量推进。

## 2026-11-03｜M2 D01精确来源绑定闭合（GitHub源码及测试）

- **缺口**：以前D01候选只验证私有原件字节和引文hash，却直接信任调用者提供的`source_version_id/raw_item_id`，可能产生“真实引文配错来源ID”的未审候选。D02 SQL已有更严格原件/来源绑定，但应在D01读原件前就失败关闭。
- **源码**：新增`createPrivateOriginalSourceVerifier`，使用现有`createAppTransaction`短时账号/Owner RLS，在单个只读事务核对`studio.private_originals`、项目Owner/状态、不可变原件修订、`source.raw_items`私有存储ref/hash/size及`source.source_versions`准确source_version/hash；缺任何权限/记录均拒绝，不通过放开来源表RLS修权限。D01要求此Verifier返回true才能读取私有字节并生成`UNASSESSED`候选；拒绝伪造/格式不符ID。M2单一工作器装配入口也引用同一来源绑定。
- **正反单测**：新增错来源、错误UUID、DB权限拒绝、组合装配来源Verifier等场景。**生产M2私有原件及DB桥仍未启用，未测试真实源表对app_runtime的可读性**；若角色合法查询无权限必须维持HOLD并经隔离迁移补最小SELECT，不得在本批追加生产GRANT。
- **状态**：本批提交后CI以对应GitHub Actions为准；未授G0—G5、不修改生产库、不改变M1的HOLD或M0审查PASS。

## 2026-11-03｜M2来源记录与私有原件身份的最小权限事务负例测试

- 上一批 `863310c5` CI `41572394306` 已完整SUCCESS（Typecheck、unit、生产边界与build），D01准确来源事务检查已入库；本批增加 `private-original-source-binding.test.ts` 独立验证事务级当前Owner/session、全来源路径SQL关联、确切五参数、缺源返回false、非法ID拒绝、低权限SQL拒绝时rollback与身份撤权阻断。
- 这里的事务模拟是GitHub单测，不冒充隔离PG对`source.raw_items`真实最低SELECT的证明；需在专用隔离PG逐项验证`mohen_app_runtime`合法读路径。没有权限时本功能应HOLD，不在真实生产DB开放全表权限。
- 原受控任务书§10已原位补录M0/M1/M2/M3最近成果、成功CI、下游HOLD和 `863310c5` 结果；此批新测试仍以其自身CI为准，尚未正式准出M1/M2/M3。

## 2026-11-03｜M2真实来源表权限缺口与窄接口候选修复

- 生产只读`has_schema_privilege/has_table_privilege`实测：`mohen_app_runtime`对`source.raw_items`/`source.source_versions`无schema USAGE及SELECT（`false`）；而Studio受限表可读。此前`863310c5`的D01直接join来源表在真实低权限DB会失败，单元测试并不能证明可用。该缺口不能通过放开原始史料表GRANT修复。
- **GitHub候选迁移内修复**：尚未部署的`20261102145410_mab_m2_evidence_bridge.sql`新增`studio.private_source_binding_matches`，固定`pg_catalog`search_path和逐表显式schema，只返回boolean；借用现有受控`studio.private_bridge_original`内已确认的Owner、有效会话、项目ACTIVE与原件STORED_VERIFIED身份，严格对应raw/version/hash/bytes/不可变资产修订。EXECUTE仅授`mohen_app_runtime`，明确撤销anon/authenticated/service_role/producer/signer/public；未开放来源数据表。
- Node来源验证器改为现有短时身份事务下的参数化最小RPC调用；错误/缺失RPC均失败关闭。更新unit断言禁止直接源码表SELECT；原`evidence-bridge.integration.mjs`增加真隔离PG/本地官方Storage条件下的本人、跨Owner、错raw/version/hash、过期身份及函数权限负例。
- **测试界限**：提交后以GitHub CI为准；上述真实隔离PG整链脚本目前属于`NOT_RUN_IN_THIS_BATCH`，不能冒充通过。候选迁移没有在生产应用，M1、M2、M3专业资格继续HOLD。须在受控隔离PG环境重跑完整整链后，才可考虑最小生产迁移激活。

## 2026-11-03｜M2来源窄RPC及CI最终回执（对应实测权限缺口）

- `main@1183ca63`候选迁移新增固定范围的Owner校验函数及Node受限调用，测试脚本增加真实隔离PG的Owner/跨Owner/错误来源/错hash/无全表GRANT反例；`main@1dcc13cf`修正PG返回boolean在Node验证中应判`===true`，不能按数字1判断。
- GitHub Actions `41574164960` **SUCCESS**，包含Typecheck、单元测试、生产边界回归和Next构建。此CI不执行新的M2隔离PG集成脚本；其状态仍`NOT_RUN`。真实PG来源窄函数执行、跨Owner、RLS及迁移顺序需在专用隔离数据库实际验收，避免把CI绿色冒充已合法运行。
- Production SQL权限事实仍是`mohen_app_runtime`无`source` schema USAGE/原件与版本表SELECT，原直接JOIN确认不可行；本批生产数据库0写入，原候选迁移尚未生产启用。M0审查PASS；M1/M2/M3独立HOLD继续。
- Library唯一MAB-ENG-01受控任务书§10已要求同步本轮代码、CI与真实低权限尚未验收的区分；不另开治理任务书。

## 2026-11-03｜M2来源窄RPC真实隔离PG准出测试接线与回滚保护

- 将`tests/data-production/private-original-source-binding.integration.mjs`加入现有`scripts/test-k3-db.mjs`，在新鲜标记`mohen.test_instance=codex-k3-isolated`的PostgreSQL 17测试库、全部候选迁移后执行。该测试**只使用合成原件登记**验证当前Owner、真实角色、无source表SELECT、正确raw/version/hash、跨Owner、过期/伪造/禁用、项目归档的正反结果；**不宣称测试了外部Storage字节**。
- 修复`supabase/rollback/20261102145410_mab_m2_evidence_bridge.rollback.sql`，撤销新增`studio.private_source_binding_matches`执行权限；现有隔离回滚例程增加显式残留权限负例。其目标是恢复时不能开放旧来源读取路径且不删除原有不可变证据记录。
- 如果CI环境不具备隔离PG，GitHub单元PASS**不能**替代该PG脚本实际执行成功；真实隔离PG运行结果单独签收。此批不触碰生产DB、Storage或Gate；M1/M2/M3保持HOLD。


## 2026-11-03｜真实隔离PG17 Github Actions运行入口

- 新增受限触发的`.github/workflows/mab-isolated-db.yml`：仅在M2的隔离PG脚本、候选证据桥SQL及回滚文件发生变化时启动，配置一次性Docker PostgreSQL17、本地Unix socket路径、固定合成实例标记`mohen.test_instance=codex-k3-isolated`及新鲜`mohen_k3_*_test`数据库；无公网映射端口、无生产数据库/Storage/secret连接。
- 复用原`pnpm test:k3-db`完整迁移+身份/RLS/独立Gate+Studio+M2来源核验+回滚链；新来源测试不要求真实Supabase Storage，单测语义与正式原件字节验证严格分开。此workflow本身及其结果必须以GitHub Actions真实运行日志为准，不预写PASS。
- 外部Storage整链另须在既有隔离官方Storage夹具运行；本CI只做PostgreSQL实体验证，不代替M1生产登录或M2正式Storage启用。


## 2026-11-03｜M2原件来源受限函数真实PG17验收成功

- 代码基线 `main@bcd0715`；真实GitHub隔离PG17运行 `41576958641` **SUCCESS**。新增`MAB_PRIVATE_SOURCE_BINDING_PG_PASS`：Owner正确来源绑定、错误raw/version/hash、跨Owner、失效/伪造/禁用、项目归档；应用账号没有来源表直读权限、外部角色不可调用窄函数。原K3 Gate/私有原件DB/迁移重放与回滚检查成功，原审计合成711条保持不变。
- 前三次失败分别为临时PG初始化socket、候选SQL源文件截断、重复SQL尾段；均已修正，完整过程和原回执列于`tasks/results/MAB/M2_SOURCE_BINDING_PG17_20261103.md`。最终运行才是数据库级PASS，之前的CI绿灯不重复计数。
- **仍需收口**：本次未启动官方Storage HTTP夹具，旧官方Storage隔离回执仍单独继承；尚未执行M2生产迁移/私有桶/密钥及D00—D03正式Registry接线。M0审查PASS、M1生产安全HOLD、M2/M3生产HOLD都不改变。

## 2026-11-03｜M3独立Gate只读核验服务接入Runner；M2未绑定输入拒绝

- 在原CLI生产入口\`run.mjs\`接入\`createOptionalIndependentGateClient\`；仅配置**独立、只读**的HTTPS Gate当前资格查询URL与单独只读credential时才向\`runProduction\`提供\`verifyStageQualification\`。网络、服务配置、非JSON、非法/超大响应一律拒绝，原\`requireIndependentStageQualification\`对run/stage/input/output digest/current/expiry逐字段核对保持不变，生产进程不获得Reviewer签发权限、密钥、库表权限。
- 查询只发送run/job/stage/Gate、摘要及Reviewer绑定引用，绝不发送私有史料全文、完整output或用户传入的证据内容。没有Gate验证服务时依旧停在\`INDEPENDENT_STAGE_QUALIFICATION_REQUIRED\`，**没有隐式PASS**。
- 新增\`assertNoUnboundPrivateEvidenceInput\`到现有阶段执行授权最前端；明确M2私有原件候选不能在Registry未正式绑定D01—D03适配器时落入旧金泽/历史公共材料适配器。当前M2工作器仍未完成受控正式适配器注册/Owner会话传递，不把此预检记为完整接线PASS。
- 正反测试覆盖M3只读验证URL/凭据、请求不含敏感正文、不伪造PASS、网络与越权拒绝、响应尺寸上限；M2明确私有请求阻断。只改GitHub代码和单测，未启用Gate服务/生产Storage/SQL迁移，所有阶段准出按既有状态。CI以本批实际回执为准。

## 2026-11-03｜M3独立Gate读服务客户端与M2私有输入拒绝：CI验收结果

- `1606ddcc`：原Runner增加按需只读HTTPS独立Gate当前资格客户端，仅发送候选及阶段输入/输出SHA-256摘要，不发送私人史料/完整产出；URL、只读凭据、JSON上限及网络失败全部拒绝；CI `41579537812 SUCCESS`。
- `34d68fec`：`independent-gate-client.test.mjs`将只读服务响应与已有`requireIndependentStageQualification`真实交接合同衔接，验证同run/stage/摘要/current/有效期为PASS，撤权/摘要变化/过期拒绝；CI `41579907762 SUCCESS`。
- `12240628`：M2未绑定的私有原件输入在执行授权早期拦截，包括嵌套于`qualified_source`等对象内部时不允许旧D01—D03 legacy适配器误执行；CI `41580080729 SUCCESS`。
- **保留阶段HOLD**：Registry仍`DESIGN_TARGET_NOT_APPLIED`，六Job disabled，Reviewer绑定TO_VERIFY_IN_M0；M3没有真实独立只读验证服务、Reviewer身份/签发/撤销端到端；M2尚未正式注册Private Evidence Worker与Owner会话接线，生产私有桶和迁移仍未启用；M1仍缺生产登录/撤权及历史凭据失效验收。本轮没有对生产SQL、Storage、Gate或凭据做更改。Library唯一受控任务书须与此结论同步。


## 2026-11-03｜M1匿名生产HTTP子项通过

- 首轮匿名只读检查（Actions 41580710096）发现私有导入API虽然正确返回401，但Middleware未设置no-store。已提交fb92550修复；常规CI 41580885849 SUCCESS，Vercel对应生产部署READY。
- 原匿名GET工作流在修复部署后重跑（Actions 41580710096，attempt 2，job 125735525879），四条匿名请求全部PASS：身份返回未登录，项目和史料列表/按ID读取拒绝且私有史料响应禁止缓存。
- 裁决仅M1_ANONYMOUS_READ_ONLY_HTTP_PASS；合法登录、跨账户权限、失效会话、历史凭据及恢复仍待最终验收。M1_SECURITY_ACCEPTANCE_HOLD保留。全过程未使用用户身份或写入生产数据。


## 2026-11-03｜M4分层准入与后续施工边界归位（仅计划施工）

- 基线 `main@acfe2874`；原位修改 `tasks/implementation/MAB/PLAN.md`，提交 `98e3a372d89fb55347f6ee5414d14e1920eae96c`。审阅两份MAB受控任务书及本轮真实main：M0审查PASS、M1安全HOLD、M2隔离PG来源验证子项PASS但生产HOLD、M3独立Gate客户端代码/测试已通过但正式签发HOLD。
- 明确 `M4_CODE_PREPARATION_ALLOWED` 与 `M4_LIVE_EXECUTION_HOLD`：允许先编写同root委托、不可变receipt、T1—T7及Studio恢复/负例测试，不得把合成数据、CI、旧预算或Producer候选写成真实双主体贡献、G资格与知识增长。
- 下轮实际源码关键路径：M2 Owner短时会话→私有原件读取→D01—D03→唯一Registry/Runner；M3只读Gate资格验证→独立Reviewer签发/撤权服务；M1生产登录/导入/拒绝及凭据失效非敏感凭证独立收口。M4软件开发可与上述并行，首次真实Provider传输需要独立授权、资料使用权与费用边界。
- 本回执是受控计划/责任更新，未改业务源码、DB、Storage、Gate、凭据、公开权限与部署；测试`NOT_RUN`（文档变更），M1/M2/M3/M4阶段状态不变。回退可用上次 `PLAN.md` blob `4ca7686649b5e722425bf8256cb3102d3eb7fd47` 恢复本段，不能据此反转生产权限。
