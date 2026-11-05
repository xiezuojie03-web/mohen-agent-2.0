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


## 2026-11-03｜M4工具注册失败关闭：第一批可并行施工源码

- **范围与基线**：继承`M4_CODE_PREPARATION_ALLOWED / M4_LIVE_EXECUTION_HOLD`；基线`main@d289f4c`，业务源码提交`f71578b835d66bb5f3576940c93017e0460acb81`、单测提交`9a892009b9654aa8fbf7ac05edf03000de483d8a`。没有改六阶段Registry、旧D/L/G、生产数据库、Storage、权限或模型Provider。
- **发现与修复**：`apps/web/lib/studio/tool-ledger.ts`的`useTool`在有/无Ledger两条路径上把未知工具ID直接`fn()`执行，与工具注册及预算/回执保护合同矛盾。现在先查询唯一工具注册表，对未登记ID直接`TOOL_NOT_REGISTERED`拒绝；无Ledger的已登记即时问答调用沿用原行为，不扩大受控外部委托权限。
- **正反测试**：`tests/unit/mab-m4-tool-registration.test.ts`增加无Ledger未知外部工具拒绝、有Ledger未知生产工具拒绝且预算不变、已登记无Ledger检索兼容三例。提交时GitHub Actions CI未获确认回执，标`NOT_RUN_OR_PENDING`，禁止自报PASS。最新提交`9a892009`Vercel检查初始为pending，仅部署检查，不能代表实际测试。
- **残余风险**：`useTool`不带Ledger的已登记工具可保持历史即时问答兼容，不代表M4已获得外发或费用授权；已登记工具的动态成本、长期ExecutionReceipt、同root委托、T1—T7及真实跨会话恢复尚未施工。正式M4双主体运行仍HOLD。下一批应优先补M2唯一Registry/Runner的签名私有请求装配，保持旧legacy适配器拒绝私有输入；M3独立Reviewer服务继续按授权接续。
- **回滚**：还原`tool-ledger.ts`原blob`9d303d63609e6b8099130110c8b484a92c336db3`仅用于必要兼容回退；原行为存在未登记调用安全缺口，实际回退时应优先停用不明调用入口，不能把漏洞当正常降级路径。本批不涉及生产DB回滚。阶段`M0审查PASS/M1 HOLD/M2部分/M3 HOLD/M4真实运行HOLD`不变。


## 2026-11-03｜M4工具预算预占／回执原子失败关闭补强

- 继承原MAB-ENG-01及前批工具注册修复；本轮`main@92ff324d`后发现`useTool`先`reserve`再写`reserved`回执，若数据库写失败，旧代码会直接抛出而遗留内存预占。该失败路径可能导致后续误判预算不足，并破坏M4委托可恢复语义。
- 源码提交`8f55ea316b7a28b8b15ef4da8a78b538c5f9eed4`：预占回执写入失败时释放预算并阻断回调，且保持此前未登记工具失败关闭。无费用调整、无真实Provider调用、无新业务方向。
- 测试提交`9d5dfd800de889bfcf7d34de43a73cdc4d7704fd`：新增合成DB拒写时回调不执行/预算归零；正常预占→调用→结算时两份回执及准确预算的正例。测试文件`tests/unit/mab-m4-tool-receipt-failure.test.ts`，使用Vitest DB mock，不触及生产数据。
- **回执状态**：源码已提交；本环境尚无本批完整GitHub Actions unit/type/build成功证明，`CI_NOT_VERIFIED`，不能签工程验证PASS；业务/生产M4依旧HOLD。M2唯一Runner私有来源正式接线、M3独立Reviewer服务及M1在线合法验收仍是关键路径。施工账只记录实际结果，非阶段准出。
- **回滚**：仅代码兼容变更；如回退需保持「回执失败不执行Provider」的阻断和未登记工具拒绝，不准以旧回退恢复费用失控路径。DB/Storage/Gate未更改。


## 2026-11-03｜M4费用未知不得静默记零

- 源码`ea566c7249b1af04e3c05368cef32a2debf0dada`原位更新`apps/web/lib/studio/tool-ledger.ts`：仅对`kind=tool`的费用回执强制明确有限非负数字，缺失或NaN拒绝`TOOL_RECEIPT_COST_UNKNOWN`；明确已登记免费确定性工具的显式`cost=0`仍合法，非工具checkpoint保留旧行为。不会调用新的付费Provider。
- 测试`62e044af51556c1063cce9cd0276e17e1ebafe0e`在原`mab-m4-tool-receipt-failure.test.ts`补缺费用与NaN的拒绝、无数据库写入断言。此前同轮`8f55ea31`修复预占回执失败后释放预算，`9d5dfd80`增加失败及正常回执测试。
- **证据级别**：仅GitHub源码和新增测试代码可确认；CI检查/真实DB/Provider运行均未在本轮核实PASS，继续`NOT_RUN/CI_PENDING_VERIFICATION`，不把M4认作完整混合委托。M0/M1/M2/M3状态保持原裁决。下一工作仍以M2受控Registry/Runner和M3独立签发服务为关键路径。
- 回退优先停止未定价外部工具，不允许恢复将未知真实费用写0的路径；不涉及生产数据库、模型费用、Gate或部署变更。


## 2026-11-03｜本轮Vercel准确部署状态核销

- 先前GitHub combined status对`9a892009`呈failure，进一步用Vercel部署记录查明`dpl_AUf2dApzYyKubU62mSWM1wDhdq5u`真实状态为`CANCELED`，并非有具体构建错误日志支撑的`BUILD_FAILED`。不凭GitHub聚合failure擅自认定测试失败。
- 最新`main@56506bf427e92b46bda6cf4f3c209286908898ef`对应生产Vercel部署`dpl_4ifBsyNBYj6uLNioYkwnsoBW2iWL`经官方部署查询为`READY`；包含本轮M4工具注册拒绝、预占回执失败释放及未知费用拒零的源码/测试文件提交。**READY仅证明部署构建，不证明本轮Vitest单元或真实模型调用、正式运行验收**。
- 本轮没有真实模型费用、生产数据库/Storage/正式Gate状态变更，M1/M2/M3/M4阶段HOLD维持；待GitHub Actions单元/类型等独立回执明确后再归档各个验证项，不从部署READY推导`OWNER_ACCEPTED`。


## 2026-11-03｜M2 Runner→私有工作器一次性执行授权交接补缺

- **问题与责任**：现行唯一Runner在 `runProduction` 进入阶段前调用 `assertStageExecutionAuthorized`，可信Verifier会消耗一次性 `jti`；既有 `private-evidence-stage.mjs` 内部又调用相同验权函数。若直接接入，合法工作器会重放同一nonce，既有正向原件读取被拒。这属于M2/M3真实接线的集成P1，不是设计合同或额外Gate。
- **源码**：`b69baa5f3596eb259609e8ef49d2851795be6ab6` 在唯一 `execution-authority.mjs` 新增私有WeakMap一次性交接记录，只在独立Verifier成功确认nonce/精确digest后登记，不对Producer暴露生成接口；`2f94998fcf8f9196eaecc435c974c5ac8f10bb92` 让私有工作器消费同一run/job/registry/input身份、当前stage及输入digest的**一次性**凭证，已消费/错绑定不得复用。脱离Runner的直接独立工作器调用仍须完成原签名授权并立即消费交接。
- **测试**：`419f85c7b5a364cd2695a53307e111e8df06830a` 增加 `tests/data-production/private-stage-authorization-handoff.test.mjs`，使用本地合成Ed25519签名、假的可信Verifier响应、受控私有文本字节；断言一份Runner授权只发一次Verifier调用、一次工作器候选读取、重复调用不能再读取、结果仅 `UNASSESSED/G1`；没有真实DB或Provider。
- **证据边界**：这批源码/测试已推送main；当前未取得完整GitHub Actions test:data-production成功回执，状态`CODE_PRESENT / TEST_PENDING`，不能签`VERIFIED_ISOLATED`。该交接机制仍须在正式的唯一Registry D01—D03适配器接线后以隔离PG+官方Storage和真实独立身份重测。全局Registry目前仍处`DESIGN_TARGET_NOT_APPLIED`且Job disabled，Reviewer仍未激活；本次绝未开启新D/G运行或正式知识资格。
- **恢复**：可关闭尚未激活的私有适配器调用路径并回退两个增量；必须保留授权nonce只可使用一次和无原件就失败关闭的不变量。无生产DDL、Storage、凭据、费用或产品UI变化。M0审查PASS、M1安全HOLD、M2/M3正式生产HOLD、M4真实混合运行HOLD不变。


## 2026-11-03｜M2唯一Runner受控私有D01—D03专用适配器候选接线

- **边界**：仍按原M0—M8施工；产品目标/体验/付费路由不变，Registry保持`DESIGN_TARGET_NOT_APPLIED`、六Job禁用、Gate Reviewer未启用。本批**只完成候选级软件接口**，不代表真实生产链准出。
- **核心改动**：`33589ef5`在`adapter-binding.mjs`加入唯一专用适配器的精确受审路径`pipelines/data-production/adapters/private-evidence-adapters.mjs`，限定仅stage D01—D03且最外层`mohen.private-evidence-stage-request.v1`/精确stage/original UUID；旧legacy路径、嵌套载荷、错stage及未知标记继续`PRIVATE_EVIDENCE_STAGE_BINDING_REQUIRED`失败关闭。`1836f831`改授权守卫读取实际job登记，不再无差别拦截未来已受控绑定的专用请求。生产授权签名、nonce、registry digest、job enable及独立Gate校验原逻辑不变。
- **接口与执行**：`5a08bf94`新增候选型`private-evidence-adapters.mjs`：按D01文本reading、D02 reading→evidence bridge、D03 claim revision bridge分别转发至已有受控`privateEvidenceWorker`；仅从可信上下文获取Owner短时会话和真实Registry，缺失即HOLD，候选必须`UNASSESSED`，D00/D04/D05在本模块强制HOLD。`39cb1c96`让唯一Runner传入**自己已核定的Registry对象**而非信任外部`context.registry`。`fd758bb5`新增测试，包含legacy/错阶段/嵌套拒绝、缺Owner上下文HOLD、D01—D03候选及禁止伪造自签PASS。
- **验证状态**：文件已提交`main`；截至本回执`fd758bb5` GitHub聚合Vercel pending、未取得GitHub Actions完整成功日志。状态`CODE_PRESENT / TEST_PENDING`，不可写成`VERIFIED_ISOLATED`。本次没有生产DB/Storage/Reviewer、真实原件、用户会话或付费模型调用。
- **未闭合责任**：受控Owner短时会话与私有worker在可信CLI运行端注入，D00合格来源→D01正式输入及D01→D02→D03合法候选/资格载体转换（禁止把UNASSESSED作为qualified层交给下一阶段），同一条真实隔离PG+官方Storage+独立Reviewer的正反验证；而后再经过M1现场安全验收才具备正式激活资格。专项新增路径是原Runner专用模块，不另建Runner、知识真值库或第二Gate。
- **回退**：退回受控适配器模块及守卫放行的限定修改即可恢复“全部私有请求HOLD”的安全状态，不恢复旧legacy读取，不触碰生产数据和历史审计。


## 2026-11-03｜M2唯一Runner真实阶段授权顺序修复与入口级回归

- **发现的集成冲突**：现行 `runProduction` 先执行含可信nonce的 `assertStageExecutionAuthorized`，再更新 `state.current_stage`；而已批准的一次性交接凭证要求当前stage与job.stage一致。因此早前工作器直调的合成测试虽然可PASS，但实际Runner在进入D01私有工作器时可能失败。不能用直调测试替代真实编排。
- **源码已提交**：`a726b26a4c907d402efb9bf6dd2cbfd87d671169` 原位调整唯一Runner，在签名授权及nonce消耗之前设置当前stage；不改变原Registry校验、阶段Executor、独立G(n)资格核验、生产开关或Stage结果合同。
- **测试已提交**：`e71d04b917502bf5bc5b2df5b19a1d895338c433` 新增 `tests/data-production/private-runner-stage-handoff.test.mjs`：从真实`runProduction` D01 resumed入口出发，合成Ed25519 + verifier，通过专用private adapter验证当前stage、相同registry/job/input、一次性handoff、无G1则最终HOLD且不得交给D02。`a9464fa267531bad79cc5769369cb8cb029653b8` 补禁用Registry和缺授权时拒绝且绝不加载adapter/调用私有工作器的负例。
- **确认边界**：使用纯合成输入与假Verifier测试代码；本批未在真实PostgreSQL、Storage、独立Reviewer及Owner生产身份环境完成整链测试，GitHub Actions正式成功回执尚待核实。标`CODE_PRESENT / TEST_PENDING`，不得把测试文件存在称为测试PASS。当前`production-registry.json`保持全局/各Job禁用；D00/D04/D05专用候选模块仍强制HOLD，M1/M2/M3及M4真实生产运行准出状态不变。
- **接续顺序**：验证本批真实CI→可信Runner侧Owner短时会话与受控Storage/DB工作器装配→合法来源D00→D01→D02→D03阶段载体及独立G0—G3资格映射→隔离DB+官方Storage+独立Reviewer正反联调；不得为模拟通关放开legacy私有输入或写入伪造的合格候选。无新产品功能、费用或生产迁移。


## 2026-11-03｜M1独立收口：隔离真实HTTP/Chromium验收接入CI及撤权E2E

- **独立目标**：从既有M1五项缺口出发，优先关闭不需生产身份的合法本人/跨Owner/会话撤权HTTP证据。不重置已轮换数据库密码、不启动真实外部AI、不变更产品UI和原M2/M3施工顺序；与生产Owner验收严格分层。
- **已完成代码提交**：`172a1dd5`新建`.github/workflows/mab-m1-isolated-http.yml`，每批创建带 `mohen.test_instance=codex-k3-isolated` 标记的本机一次性PostgreSQL17，运行现有 `pnpm test:mab:http` 的真实Next.js与Playwright合成用户测试；`7c9902c7`改用官方Playwright安装Chromium，避免Ubuntu Chromium snap依赖。不会注入生产DB/Storage或密钥；真实Storage导入测试因无隔离官方Storage而仍为SKIPPED，不记PASS。
- `4d4fb2e6`让该隔离HTTP测试入口仅传一次性测试库名；`e8251d5d`新建 `tests/e2e/mab-m1-session-revocation.spec.ts`：已登录并拥有私人项目的合成账号在该次隔离PG被禁用后，原Cookie访问项目GET/POST均应401、`auth/me`未登录、再次登录403；第二例验证logout清Cookie后私有API继续401。每个写入先检查Unix socket路径、专用合成库名与PG实例标记，拒绝接触未标记数据库。`ff0c9503`加入Playwright测试名单。
- **既有测试继承**：`mab-notebook.spec.ts`已有合法本人研究项目、不可变修订、跨Owner只读/写入拒绝、丢回执幂等；`private-original-http.spec.ts`需要官方本地Storage配置，当前CI不验证字节导入。原M1生产匿名只读子项`41580710096` attempt2 PASS、隔离PG来源绑定`41576958641` PASS不重复记账。
- **验证状态**：GitHub源码/CI入口/浏览器正反用例已提交；当前还未获得本批`mab-m1-isolated-http`真实SUCCESS及测试细目回执，状态`M1_ISOLATED_HTTP_CI_PENDING`，禁止把“已接入工作流”写成E2E PASS。下一步以Actions实际运行日志为准修正环境或行为问题；Vercel READY与本专项不等价。
- **仍需生产签收**：真实Owner登录、合法本人导入及回读、跨Owner和撤权当前生产策略、旧数据库凭据连接失效的非敏感证明、生产适用备份恢复。正式`M1_SECURITY_ACCEPTANCE_HOLD`仍保留；无需让M2生产或M3 Reviewer启用成为M1的准出前置。受控日志中不得写身份Cookie或数据库密钥。


## 2026-11-03｜M1—M5关键路径增量施工：M5发布原子性与M1测试触发

- **执行目标与边界**：Owner要求按原受控计划持续推进到M5闭环，保持既有产品方向/成本约束。该目标不代表可跳过M1合法Owner/旧凭据安全验收、M2真实证据链/Registry、M3独立Reviewer及M4真实双主体授权。此回执仅记录本批已实施增量，**不签M5整体PASS**。
- **M5源码**：`64cdb2e6b011f8e7e75267411632a3beb47be963` 原位修改`apps/web/lib/publication.ts`，将`publishWork`中“更新submitted修订为published”与“insert/upsert publication.published_pointers”由两次独立DB调用收敛为单一SQL `WITH promoted AS (UPDATE ... WHERE status='submitted' RETURNING ... ) INSERT ... SELECT FROM promoted ON CONFLICT ... RETURNING`。若修订已被并发拒绝/变更，则返回`revision_not_submittable`且不触发资产回流；SQL异常传播，不能把指针失败记录成成功。本改动不撤销既有Publisher、Reviewer和媒体权利校验，但它们尚未达到M5目标的精确G5/consumer实时资格要求。
- **M5测试**：`3eca7df379d4999db4575c64df338f3406f27e23`新增`tests/unit/mab-m5-publication-atomic.test.ts`，以隔离mock检查单条原子操作、并发修订冲突不回流、DB指针写入失败不假报成功。此为单元合同测试，完整真实PG并发/独立G5撤权/媒体许可/两端消费未验收。
- **M1验收接线**：`e1ed01d7574176a8db253739967faebdc26781f9`补齐原`.github/workflows/mab-m1-isolated-http.yml`对新`mab-m1-session-revocation.spec.ts`的触发路径，使撤权E2E后续更新能够运行原隔离PG17工作流；合成测试不能替代线上身份验收。
- **本批待核**：新提交的GitHub Actions/Vitest/实际SQL运行尚无可核实SUCCESS回执，均标`CODE_PRESENT / CI_PENDING`；不据Vercel READY写成独立G/真实M5 PASS。不写生产DB、Storage、Gate策略或密钥；未调用外部AI、未新增费用。
- **剩余关键路径**：M1生产Owner/撤权/旧凭据/恢复；M2官方Storage字节→D01—D03真实Runner+Registry及资格载体；M3独立Reviewer签审与当前资格撤权；M4同root双主体真实委托/可恢复执行账/预算授权；M5 Studio创作同作品rev、F05 Admin知识细目、Operator+精确G5+媒体权利发布门、WATCH逐请求合法消费及撤权、完整E2E。逐项独立证据闭合之后才可宣布M5准出。
- **回滚**：M5单条原子更新可恢复旧调用接口，但不得恢复写两次成功一半的风险；如兼容冲突，优先临时停止新发布写入而不清除旧合法作品/审计，不能以绕过G5、媒体权利和已撤销许可作为降级。M1 workflow仅测试，不触及生产数据。


## 2026-11-03｜M5 WATCH旧发布状态的最小读取保护

- `e9bde789f30c1e53c23833a35447eefb2f725e97` 在既有 `publication.listPublished()` 的published pointer与精确work_revision关联查询增加 `where r.status='published'`，避免修订状态已被撤销/更改而旧指针仍在时直接列出。该过滤仅是已发布状态约束，**不能替代独立当前G5、consumer=watch、用途/权利与媒体撤权逐请求认证**。
- `68b334bf13052a2ed73607a80436ab70e825ed2f`为原`mab-m5-publication-atomic.test.ts`补WATCH列表状态过滤合同测试。新测试提交但尚未核实CI的实际SUCCESS回执；不能标记M5整体运行验收或宣称实时撤权已经实现。


## 2026-11-03｜Owner最终CodeBuddy单次交接策略与M5 Studio真实进度修复

- **执行策略裁决**：按Owner明确意见，以聊天模式已连接GitHub等插件承担尽可能多的源码施工、合同对照、正反测试和可安全自动化的验收，直至取得实际CI/隔离证据；只有真正依赖本地/受控生产身份与权限/独立Reviewer/真实Provider许可或Owner体验签收的剩余工作，才一次性交给CodeBuddy。不能因待移交就停止其余M1—M5施工，不生成提前交付包，不重新研究架构。具体准则已原位写入`PLAN.md §6A`（commit `a97e340417979440410e6e68987e4fbe8dc9eb3c`）。
- **本批M5源码**：`d96a658e155fa7754645be317a86c3f9952d5880`修复`publication.getWorkStageStatus`将委托/研究/编导硬编码为true的错误。现在按工作绑定的`research_tasks`真实存在与`status='done'`区分已委托与已研究；旧`director_plans`当前没有work_id直接关联，故仅在该作品精确修订存有plan对象+非空beats数组时才表示编导证据，不能把其它作品计划当成该作品已完成；修订根据work_revisions实际存在判断。node-pg布尔及psql字符串均明确转换，不推断未知记录为成功。
- **本批单测**：`8765fc978f9895e4a404fe80c0af43f0d3603b9b`扩展`mab-m5-publication-atomic.test.ts`：空数据四项false、委托存在但研究未done不报完成、四项有真实存储依据才为true。此为mock单元测试源码，尚未有本批真实CI SUCCESS回执，严禁写`VERIFIED_ISOLATED`。
- **待继续的最大化施工**：现M5仍需同作品精确修订/并发授权、Admin内读详细知识与来源缺口、按消费者/用途的独立当前G5和媒体撤权、WATCH动态重验与完整E2E；M1合法生产身份/失效凭据/恢复，M2私有原件/Runner+Storage整链，M3独立审核签发与撤权，M4受控同root混合委托的真实身份/费用/回执均仍按原约束分别HOLD。优先推进能够通过插件直接修正的代码，不假报阶段闭环。
- **安全/费用**：本批没有对生产PG、Storage、Reviewer或Provider写入，也没有实际外部模型调用；所有现行启用HOLD维持。回退时不得恢复硬编码Studio已完成状态，必要时宁显示未完成/待确认。

- **兼容修正**：`223ade795d92a965cb144f70cb657104cce3d9fe`对历史作品修订`beats`非数组载荷使用SQL CASE防守，避免仅凭AND短路假设调用`jsonb_array_length`导致整个作品状态读取异常。最新提交的Vercel初查QUEUED，GitHub Actions完整成功回执仍未获得。本修正也不改变M5整体HOLD。


## 2026-11-03｜M5精确作品修订与最新Reviewer竞态防护

- **真实源码**：`c0fa6c04b226f4bdac1bb960f62bec5f8cc7151d`修复`publication.publishWork`的先审A修订再独立查询最新submitted而可能改发B修订的TOCTOU。现在`checkPublishEligibility`在成功时返回所查的精确`revisionId`，发布沿用同一ID；单条原子SQL写入时额外再次确认当前最新`control.work_publication_decisions`依然是该rev的`approved`，否则不改变状态/不落指针/不回流并返回`revision_not_submittable`。旧代码已先保留作品来源引用、媒体权利、审核身份/本人不自签的原先检查。
- **测试**：`afa2f590b1b3e0a25aefc4fd9cfdcc79536fbada`补M5发布合同回归，断言只有一次取待审rev、原子SQL重核最新Reviewer决定与精确rev、撤审竞态无发布及不触发资产回流。这是mock检查，**不等于真实PostgreSQL竞态验证**。
- **准确资格范围**：`work_publication_decisions`是作品发布Reviewer审核表，**不可等同于独立专业知识G5资格**。当前`publishWork`尚未接入对当前独立G5、用途/consumer/rights的正式确认；WATCH列表亦仍缺精确逐次G5与媒资失效核查。因此M5完整发布资格及正式上线仍HOLD，不能借本批审核加强冒称已达M5出版门。正式M3独立Reviewer启用、M2证据链及M1安全验收均不跳过。
- **实测状态**：提交已推GitHub main，但本批尚未拿到完整CI/真实PG SUCCESS回执，状态`CODE_PRESENT / TEST_PENDING`。本批无生产DB/Storage/模型、G签名/角色/费用写入。


## 2026-11-03｜M5 WATCH资格消费与M3专业Gate合同核对（不伪造接线）

- 本轮核对`supabase/migrations/202611010900_k3_independent_gate_authority.sql`与`202610310910_k3_gate_candidates.sql`：已有`control.qualification_current`的正式键由architecture_generation、G、object_type/id、artifact_revision、purpose_namespace/code/version、consumer共同构成；`control.qualification_allows`还要求当前依赖/策略、角色/Reviewer及允许scope。不能把旧`control.work_publication_decisions`中的作品Reviewer的approved直接映射成专业G5，也不能把专属agent/visual_stage资格直接给WATCH复用。
- 现`publication.listPublished()`仅基于发布指针+revision状态，仍未有作品rev与独立G5真实资格/媒资许可证的正式消费映射。后续须依据KAD/MHKA现有专业合同确定**作品发布指针、精确WorkRevision与各知识/媒体分面的合法对象映射**，再以独立只读资格Verifier或数据库受审窄RPC逐次执行，包含错consumer、旧rev、过期/撤权/媒体失效负例。不得简单JOIN到另一个无关G5记录构造PASS。
- M3受审迁移已含独立`control.revoke_gate_qualification`函数，它在独立Reviewer绑定下删除`qualification_current`并追加事件、历史签名不可变；旧`apps/web/lib/gate-revoke.ts`仍直接试图UPDATE `gate_audits.current_valid`，与签名不可变触发器以及最小角色权限冲突。正式M3/M5接线不得复用旧应用账号直接UPDATE路径，必须经独立撤权服务/身份且以实际隔离测试取证。
- 此项为**权威合同核查得到的具体工程缺口**，不是新架构研究；本轮不启动生产G5或撤权、不假写当前资格。M5完整消费验收维持HOLD；源代码可并行施工。


## 2026-11-03｜M3/M5旧Operator撤权入口安全失败关闭

- **合同冲突核实**：现`control.revoke_gate_qualification(uuid,uuid,text)`属于K3独立Gate权威：需精确`gate_audit_id`、幂等请求ID、理由、独立Reviewer身份及专用DB角色绑定；经`qualification_current`删除当前资格与追加不可变失效事件。旧`apps/web/lib/gate-revoke.ts`由Operator API调用，直接UPDATE`control.gate_audits.current_valid`，与独立签名历史不可变触发器以及最小权限矛盾，不能冒充专业Gate撤权。
- **已修改源码**：`1dfedaa21e136504545f55993335d1338eaff463`原位关闭旧Operator应用层直接撤权，无论是否传objectType/id都不能写Gate表；合法legacy输入返回`ok:false,reason:INDEPENDENT_GATE_REVOCATION_REQUIRED,invalidatedGates:0`，缺对象则返回`object_required`。两真实API `/api/governance/gates/revoke` 和 `/api/admin/rights/invalidate` 分别由`6fe89f5c`、`2eeed56a`返回显式HTTP 503及`no-store`，不再把未执行撤权的响应误作200。
- **自动测试源码**：`59f392adc9d1dc15729f87a439759f57fc2b0ead`新增`tests/unit/mab-m3-independent-revocation-boundary.test.ts`，检查合法/非法请求均失败关闭、不调用DB写。尚未取得本批实际CI成功回执，状态`CODE_PRESENT/TEST_PENDING`，不得称M3正式撤权实现PASS。
- **行为兼容重要提示**：此次**有意临时关闭旧的Operator撤权写入口**，避免其在权限/触发器不兼容时返回不可靠结果。它不表示Gate实际已撤权；如果生产有正在依赖旧端点的操作，必须保持相关新发布/新消费受控停用，不能用恢复危险UPDATE/绕过独立Reviewer作为回退。
- **后续插件施工**：沿现有独立服务合同实现Reviewer当前身份核实、精确audit ID与幂等事件、已撤权/权限拒绝/到期/错scope正反测试，并使M5消费者按用途/consumer/rights每请求校验。未具备正式签发身份和真实环境之前保持M3与M5 HOLD，不把旧work_publication_decisions当专业G5。

- **HTTP回归补齐**：`ab41b4afebfc32789b1d6cb4373eb903903b57f3`新增`tests/unit/mab-m3-revocation-http.test.ts`，覆盖两个真实Route的Operator已登录但服务未就绪返回503/no-store/zero invalidations，以及非Operator仍403。此为测试源码，实际CI运行未核，不提前计PASS。


## 2026-11-03｜M5旧版通过不得隐藏新版审核

- `5fb3316bc65329d0ef026da621eb176437915948`原位修复`publication.listPendingReview()`，审核队列NOT EXISTS approved从“同一work有任何旧批准”改为“同一work且**exact work_revision_id**批准”，避免旧版approved导致新版submitted被错误隐藏。这是M5精确修订身份合同的低依赖修复。
- `db689b256b46652ac102422d6ecafd82a94fed13`新增上述队列查询合同测试。提交后本批真实CI/PG执行回执待核，不称测试PASS。正式审核仍需独立G5资格以及媒体/用途/consumer/撤权测试，不能把作品Reviewer审批当知识资格。


## 2026-11-03｜M3独立Reviewer撤权传输协议客户端（仅受控候选）

- 已在原M3独立资格只读接口旁新增`pipelines/data-production/orchestrator/independent-gate-revocation-client.mjs`（`89cda1db86f49d693d578b9afcb0b0ebb9cebeec`），只以HTTPS POST提交精确`gate_audit_id`、幂等`request_id`、理由和Reviewer绑定引用；URL不得带凭据、查询或片段，请求不含原始史料/候选正文，响应限制8192 bytes、核对schema/对象/请求ID/撤权状态/事件UUID/身份引用，拒绝401/403/非JSON/错绑定或过大响应。
- `c3ef1095e396e20e935eec491ae20895f561a198`添加`tests/data-production/independent-gate-revocation-client.test.mjs`，覆盖精确协议请求、非法ID/理由时零网络、服务拒绝和伪造回执。不具备服务端Reviewer身份时不可调用现行`control.revoke_gate_qualification`；旧Operator两个HTTP撤权入口仍503，绝不间接调用该传输客户端。
- **证据边界**：客户端本身不签署、撤销或查询最终资格，返回的服务回执**不等于当前资格已失效**；真实消费者每次必须重查`qualification_current`/现行`qualification_allows`。正式独立Reviewer服务端/受控数据库角色/身份绑定及跨消费者撤权E2E依旧HOLD。GitHub CI和真实PG服务端回执本批尚未核实，标`CODE_PRESENT/CI_PENDING`，绝不冒称M3或M5准出。
- 本批无生产数据库、Storage、Gate正式签名/撤权和外部AI费用。已在`PLAN.md`原位补对应责任，不提前交给CodeBuddy。

- **M5正式消费资格映射补充核查**：现行`control.artifact_revision_for`逐项支持来源、证据、世界、解释与L5发布对象，但**不含`publication.work_revisions` / `work_revision`**；它不能基于作品revision本身生成合格的专业G5。故`WATCH`不得将作品Reviewer批准、发布指针或任意故事种子G5伪装成整部作品的资格。需要逐条映射作品内容所引用的合法source/evidence/L5对象，按实际用途及consumer请求独立`qualification_allows`与权利验证；不能覆盖的分面HOLD，不能先公开再补验。该缺口不要求重建MHKA或另造第七门。

- **客户端精确审核者绑定补正**：`d28ebbb65a54cab32cff92ede8a5a5b6c072dfa0`进一步要求独立服务回执`reviewer_binding_ref`与申请完全相同，不接受其它Reviewer绑定的真形状回执；`f9752f2904a18f3e3da6a72d9f40202fbed9376f`补此负例。仍为合同源码及测试文件，**无独立服务运行回执**。


## 2026-11-03｜M3独立Reviewer受控撤权服务候选与原仓储联调

- 发现原仓库已有`packages/data-access/src/gate-authority-repository.mjs`的`createGateAuthorityRepository.revoke`：专用DB signer身份、不可超权/Producer、短时session token在事务内设置并清理、现有`control.revoke_gate_qualification`原子执行、幂等请求和追加审计。**不另建撤权SQL或第二套Gate**。
- 源码`2d166d74be093a9e1b5e895f91051853efac4e04`增加`independent-gate-revocation-handler.mjs`候选受控服务处理器：只接受POST+JSON、独立authenticateReviewer回调返回有效Reviewer短时会话和精确绑定、匹配audit/request UUID/理由、请求限制4096 bytes，委托已有authorityRepository.revoke；鉴权失败403/无token401，DB拒绝或失效503/no-store，不回显会话token/私有史料。
- `328f3bfe000c820dc85e6d9dba6037c5b77d6200`新增`independent-gate-revocation-handler.test.mjs`，合成客户端→处理器→仓储调用成功，伪造Bearer/错Reviewer绑定/错误UUID/DB拒写时失败关闭。`7ac30843`将旧客户端要求事件UUID的合同改为**可选**：真实K3 SQL仅返回`blocked_count`，`request_id`已是失效审计事件的受控索引，不能要求服务造假事件ID；`d28ebbb6`和`f9752f29`补回执Reviewer绑定一致性及负测。
- **证据与使用边界**：本批仅提交源码/合成测试/PLAN责任，不曾启动实际独立HTTPS服务、合法Reviewer认证、专用Signer生产连接或真实撤权。旧Operator入口仍统一503；服务处理器无生产注册入口，不能被普通Web/Producer调用；正式服务仍须独立身份部署、专用DB和签发者绑定、隔离PG+真实HTTP及WATCH当前资格逐请求反例。在未取得CI实际SUCCESS回执前标`CODE_PRESENT/CI_PENDING`，M3和M5正式HOLD。
- 本批未使用生产数据库、Storage、Gate凭据和外部付费模型。最终CodeBuddy单次交接策略不变：聊天插件仍继续可实施的软件和隔离验证，待确定无法完成的环境任务才集中交接。


## 2026-11-03｜M3独立撤权服务输入限额与独立CI验收入口

- **具体问题**：原独立Reviewer撤权处理器先调用`request.text()`把任意长度的HTTP body整体读入内存，再检查4096字节。这不符合服务层流式限制的安全边界。
- **已提交源码**：`6c46a6e101b94327585761a7bfb2b2a5d424a95d`将`independent-gate-revocation-handler.mjs`改为通过ReadableStream逐块读取并累计字节；提前拒绝无效/超4096声明长度，流中超过4096立即中断，JSON畸形报400，超限报413。异常和超限均发生在调用`authorityRepository.revoke`之前；不改变独立Reviewer鉴权与最小数据库身份。
- **正反测试**：`d93b841c4d7c982e42ef32a50896e48e1aca1d53`补超大实际body、伪造超大Content-Length、畸形JSON、非POST的拒绝测试，验证不会触发数据库撤权。保留现有审核身份/错绑定/非法UUID/数据库拒绝测试。
- **CI核销入口**：`c99d952c141ce25ca26101727a1e6f448e517e90`新增`.github/workflows/mab-m3-independent-revocation.yml`，在main相关文件变化及手动触发时使用Node22运行两份纯合成测试，并保护客户端/处理器不直写专业Gate审计表。不接入生产数据库或真实签名凭据。
- **证据边界**：本批源码、测试和CI入口均已提交，但尚未取得该新工作流真实`SUCCESS`回执；保持`CODE_PRESENT / CI_PENDING`，不能冒称`VERIFIED_ISOLATED`。正式Reviewer独立认证、实际低权限数据库连接、真实撤权/资格撤销后M5各消费者即时拒绝仍HOLD；旧Operator撤权API保持503。
- **恢复与费用**：全部属于纯代码/CI调整，没有运行付费模型、执行生产SQL、迁移Storage、启用Gate或变更用户凭据。若CI出现不兼容，优先修复流式限额与测试，严禁退回无限制读取。

- **本批自查补正**：首次流式限额代码含多转义的Content-Length数字正则，会把正常长度值误判。已以`f14d081cd1efd71a228e1d8feed7ea284d7a4f60`修正为`/^\\d+$/`的正确代码表达；`7215b842bcb778381138a63e6d089fc682869d8e`补显式合法长度请求必须HTTP 200且仅一次独立仓储调用的正例。新CI实际回执尚待核验，不把本次自查等同测试通过。


## 2026-11-03｜HP01—HP13交接收口工作包准入基线（Owner批准，非HANDOFF_READY）

- **权威裁决**：Owner批准把本次“13交接前工作包”落入原M0—M8任务书并立即按其执行，尽可能在聊天插件完成工程与测试后一次性交接CodeBuddy。已原位增加`PLAN.md §6B`（`c91a430b973f54bf150f4076c36a15511a2c1464`）；不另起新独立阶段或架构，不提前制作交接包。工程安全仍受§6A及原M0—M8独立Gate约束。
- **清单起点**：M0—M8原53任务，M0已核准6，M1—M8 47项正式未勾选，不等于47项必须在交接前全部完成；74正式目标为53 REVISE路径存在、21 CREATE目标路径缺席，74项`DESIGN_TARGET_SEMANTICS_NOT_VERIFIED`；20增量责任A01—A18为18存在路径、A19迁移模式、A20测试集合，均不能仅凭存在算语义达标。资料与主线以本次审查main和真实验收报表为准。
- **启动状态（工作包≠阶段PASS）**：
  - HP01 CI/类型/隔离核销：`IN_PROGRESS / CI_UNVERIFIED`。主CI是push触发，而现有GitHub connector的`fetch_commit_workflow_runs`只查询PR触发项，不能从0条误判为未运行；已知最近Vercel独立状态包含failure，但不能直接断定主CI失败。需寻找真实runID/日志与可复现命令。
  - HP02 M1自动化安全：`PARTIAL`。隔离测试与匿名生产HTTP部分有历史PASS；完整Owner旧凭据失效/恢复和最新撤权E2E回执未准出。
  - HP03 M2持久资产合同：`PARTIAL`；HP04 M2字节→D00—D03真实Runner：`PARTIAL/HOLD`；HP05 M2隔离备份恢复：`HISTORICAL_ISOLATED_PASS / LATEST_NOT_VERIFIED`。
  - HP06 M3独立Reviewer：`CODE_PRESENT / LIVE_HOLD`；HP07资格与撤权即时消费：`PARTIAL/HOLD`。不把旧Operator审批等于专业G5。
  - HP08 M4同root持久委托：`PARTIAL`；HP09 M4 T1—T7/外发安全：`PARTIAL/LIVE_HOLD`。
  - HP10 M5 Studio创作：`PARTIAL`；HP11 F05知识条目：`PARTIAL`；HP12 M5合法发布与WATCH：`P0_HOLD`（已做原子指针和Reviewer精确rev修复，但未核正式G5/媒体/当前consumer，`asset-reflow.ts`仅返回`reflowed:0`）。
  - HP13 74目标/20责任语义审查与唯一交接冻结：`NOT_STARTED / HANDOFF_NOT_READY`。
- **首轮P0审阅结论**：`publication.checkPublishEligibility`验证旧作品Reviewer批准、来源引用及媒体许可文本，但未验证独立专业G5；`listPublished()`仅检查pointer和published status，`/api/public/works/[id]/eligibility`仅查列表即称eligible，尚未达到WATCH合法消费门。不得仅因作品状态published或作品Reviewer批准允许新增公开作品。必须在HP12安排受控失败关闭/精确资产资格路径及正反测试。
- **版本与阶段纪律**：此条仅准入、证据状态及执行责任；最新main SHA应在各具体改动后记录。实际CI/PG/权限证明完成之前不勾M1—M8；未激活Registry或收费模型，无生产DB/Storage/Reviewer写操作，交接标`HANDOFF_NOT_READY`。


## 2026-11-03｜HP01—HP13实际施工第一收口批（仍非HANDOFF_READY）

**Owner裁决已写入权威任务书**：`PLAN.md §6B`（`c91a430b`）；13项为交接前工作包，保持M0—M8与独立G、Owner生产授权。此批已实施代码与文件如下，不把源码提交误判为真实生产PASS。

### HP12｜独立G5未就绪时的新发布及WATCH失败关闭

- `d05d8f97`、`c99a075c`新增`apps/web/lib/work-publish-qualification.ts`，显式区分作品Reviewer批准、知识专业G5和WATCH/visual_stage/agent/evidence_on_demand各消费者资格。**当前WorkRevision未建立精确L5资产资格映射，服务默认HOLD**，严禁旧PASS/出处字符串或作品审核借专业G资格。
- `097d3db7`在`publication.checkPublishEligibility`内要求专业G5，否则拒绝新发布；`35391251`拆分后台运营`listPublished`与公众`listWatchEligible`，后者每次读逐WorkRevision核WATCH独立资格。公开`/api/works/published`（`a51dfbbc`）和`/api/public/works/[id]/eligibility`（`c3a66c6f`）接失败关闭及no-store。重要行为影响：**在正式专业G5映射前，新发布拒绝、WATCH公众作品列表为空**，但原合法草稿和后台审核记录仍保留。不是完整可运行发布功能；不允许为恢复显示而使用旧作品指针冒充资格。
- `9853699c`、`e3638a81`修订原M5发布mock测试，补资格不存在时不得进入原子SQL与按work逐条WATCH过滤；`a076403d`新建默认拒绝/跨消费者拒绝测试。源码`CODE_PRESENT`，本批仍`CI_UNVERIFIED/ISOLATED_PENDING`，不标HP12 PASS。

### HP13｜74目标差异追踪及冻结工程镜像候选（不生效）

- `827495c9`创建`scripts/audit-mab-handoff-targets.mjs`读取当前仓库PLAN、74目标差异账和A01—A20责任，输出客观`HANDOFF_NOT_READY`/缺文件/语义未核销机器报告；`4361a6f8`补CSV/语义负例；`beb703d7`将只读报告纳入通用CI的证据上传，**不因缺席21个目标而中断其它代码构建**；`04bbda4e`区分冻结字节目标与运行/语义验收。
- 只通过ChatGPT资料库`/墨痕/产品知识体系与工程治理重建_专项/04_工程规范与Codex接入/repo_target/`的既有设计镜像查源，并与当前目标SHA256逐件确认。已把原21个CREATE中**19个精确目标文件**按冻结字节提交：六份MHKA-00—05（`3c3f14a7,6dba87ae,650b71b5,8a4db6ac,28fcfe3f,a0535abc`）；四份系统、知识资产、Agent能力、H1/H2/H3规范（`5d273705,5d0d41f9,b02acab0,c76bf4b7`）；KAD1纯策略mjs/类型（`cad13815,0e86b055`）；六份受控KAD1 migration/rollback设计候选（`ea0bb728,d73a68c7,9f7475e9,77715b58,9ae16b05,c5d534dc`）；精确属主和修订快照的Studio局部panels只读路由（`937fd438`）。**没有执行任何生产或隔离迁移**，没有切换`AGENTS.md`权威生效路由。11项治理/专业合同仅设计文本已按目标落仓，不代表工程语义、运行资格已准出。
- `target-diff.csv`新增`hp13_*`六字段记录源目标哈希/现行Git blob/提交及激活HOLD，**保留所有历史M0列与74目标**（`daf8830d,416dc5eb,88521aca,e2af3694`）。仍缺2份正式KAD1目标测试（`tests/unit/kad1-policy.test.mjs`、`tests/unit/kad1-route.test.mjs`）；完整镜像测试含AGENTS/M8切换、Reviewer不自签、消费G5、定时发布/旧权限等未来合同，不得盲复制后标PASS。原53 REVISE仍须逐项语义双向审查；缺席目标降至**2/21**不等于HP13全量完成。

### HP07｜视觉舞台当前专业资格

- `c711dc9a`修改`apps/web/lib/read-model-bridge.ts`的六处读模型查询：从legacy `gate_audits.current_valid`直接读改为`control.qualification_current`和`control.qualification_allows`，必须明确当前`MOHEN_G5_CONTEXTS.visual_stage`中的purpose/scope；缺配置则返回`available=false`。topicKey改有界参数化LIKE并转义通配符，照片必须`rights_status=cleared`且license非空才进入输出。不得混用Agent、WATCH资格；真实读取仍须隔离PG当前资格负例。
- `fca16447`新增前述六类读取、参数、防旧PASS、无许可媒体及DB失败的单测源码。最新CI/真实PG未核，不称HP07 PASS。

### HP10/HP11｜Studio修订快照与Admin精确Reviewer审批

- Studio每个局部panel GET（`937fd438`）复用正式KAD1冻结设计：必须登录、Owner精确work_id、正整数revision_no、取已经保存的panel值；无快照返回404而不是重生导演内容。尚需HTTP+DB运行验证。
- Admin旧代码对某个待审WorkRevision仅提交`work_id`，导致批准可能不绑定真实版本。`e963fdfb`将两审核按钮改传`revision_id`；`e444da35`在API要求合法work/revision UUID及真实Reviewer身份；`bd563cbf`将`gate-review.ts`的审批插入改为单条`INSERT ... SELECT`仅在准确work+revision仍submitted时写入，取消null、跨作品/旧rev签核，并修正过时“注册邮箱自动提Reviewer”的注释。作品Reviewer与专业G5继续分责。
- `d878a04c`和`0bf6587d`新增仓储及HTTP路由正反单测，分别核精确revision、错work/旧版/未登录/非Reviewer不得写决定。**源码与测试文件已推main，但真实CI/PG/HTTP结果未核**。注意现有后台审核与专业G5仍均HOLD，不能把作品审批当新发布准出。

### 状态、下轮主线、回滚

- 本批`HP01`只有机器报告入口，**未取得最新main的真实GitHub Actions成功回执**：GitHub连接器的commit workflow runs仅返回PR触发结果，push记录缺口不能据0条判断未运行。Vercel READY仅对应旧SHA，不代替本批验证。不得提前签`HANDOFF_READY`。
- `HP02—HP06`、`HP08—HP09`依原计划继续M1身份/恢复、M2私有原件→D00—D03 Runner、M3独立签发/撤权、M4同root委托与T1—T7；HP10—12继续完成专业Gate映射、Admin完整知识条目、WATCH与媒资撤权。HP13剩余2个目标测试及53份REVISE语义责任需核销。最终CodeBuddy只接受当前插件确实无法安全完成的受控环境任务。
- 所有新增SQL均未执行，外部付费AI、生产Storage/Gate与真实私有原件仍未启用。**HANDOFF_NOT_READY**。回退时只可关闭受影响消费/发布或恢复受审代码，不可恢复旧公开未授权资格、旧Operator自签或已撤销权利。


## 2026-11-03｜HP01/HP02/HP06/HP11生产只读再核：真实迁移、最小角色与RLS（本批无生产修改）

- **来源**：连接的Supabase项目`mohen-cloud`，2026-11-03现场调用`list_projects`/`list_migrations`/`list_tables`/`get_advisors(security)`与受限SELECT元数据查询。没有读取真实用户明文、密钥、史料或其他业务行，**没有DDL/DML/生产写入**。
- **部署事实**：PG17.11/ACTIVE_HEALTHY；迁移历史仅五项20261102 M1安全/运行身份及Studio候选、Gate candidates；`studio.private_originals`不存在，`storage.buckets=0`、`storage.objects=0`；`control.gate_reviewer_bindings`、`control.gate_policy_versions`、`control.consumption_blocks`以及`control.revoke_gate_qualification(uuid,uuid,text)`均不存在；`control.qualification_current`存在但0行，`control.gate_audits`711行均不能以旧历史证明当前专业资格。**据此M2/M3正式生产激活明确HOLD**。本次已冻结在GitHub的KAD1三个SQL候选及K3专业Signer迁移绝未自动投运。
- **权限核查**：`mohen_app_runtime`在当下对`control.work_publication_decisions`、`publication.work_revisions`、`publication.published_pointers`及`public.users`均无直接SELECT/INSERT/UPDATE表权限；`control.work_publication_decisions`当前RLS打开但无策略。现有`@mohen/data-access`实际连接池身份可能不同，不能只据此断言全部Web调用失败，但**HP11合法Reviewer审批接口需要真实运行身份与最小权限事务E2E**，不可假设普通应用role能写。Producer/Signer对`control.gate_audits`直接表授权均缺失符合候选自签禁止，正式专业Service尚待独立角色/受控函数迁移。
- **Supabase安全Advisor**：`publication.publication_schedules`目前RLS=false且无策略，`list_tables`返回风险；进一步只读`has_schema_privilege`/`has_table_privilege`核实：anon/publication schema USAGE=false；anon和authenticated对该表SELECT/INSERT/UPDATE均false，当前不能据Advisor泛化为已公开。此项仍需在**后续有界受控迁移**设计最小授权+RLS（贸然开启可能阻断合法调度），本轮不执行。Security advisors额外显示58项RLS开启无policy（多属受限内部schema，不能视为自动开放）及16项mutable search_path warning，需按实际暴露/权限分级；不机械新增全表策略。
- **下一验收**：M1合法Owner/失效旧凭据及跨会话真实验收；M2两份私有Storage/桥迁移和独立身份供给；M3独立Reviewer角色、策略、候选签发/撤权；HP11审批写/拒绝真实PG/HTTP；HP12专业G5和消费者权益。以上分别保持`DEFERRED_ENV/HOLD`，不进入全局自动迁移。对已取得实际隔离PASS的旧批次只按原SHA引用。
- **HP13机器核查补缺**：`3dead082`在只读目标审计脚本增加对74路径当前实际文件SHA256和冻结目标SHA256逐项字节比较并列出全部53 REVISE偏差；`110b1c6e`/`740d66db`补合成哈希与CSV转义测试；`68fef380`让当前HP13语义核销读取独立后续审查字段，不覆盖M0历史列。脚本CI已接，但最新GitHub实际运行成功证据未得。
- **HP11细化补正**：`d12a322b`修正旧Reviewer已拒绝某精确rev却仍在待审队列的问题；`2bc27dce`补待审核只保留尚无approved/rejected决定的精确rev测试。修订重投仍须保存新的不可变rev。暂无实际CI与PG回执。
- **准出结论**：`HP01/HANDOFF_NOT_READY`；未启用生产Gate、原件上传、外部模型或平台授权切换。所有用户可见产品功能改变需实际浏览器验证；GitHub源提交不等于部署有效。回退不能重开旧匿名素材/旧自签Gate。


## 2026-11-03｜HP08工具调用收费不确定、累计预算与Studio追问/恢复安全收口批

- **继承与目标**：依据Owner批准的`PLAN.md §6B HP08/HP09`，本批从上一轮`d9b38a76`的“工具成功但settled回执存储失败不得退费/重试”继续，解决“收费服务执行超时但可能已扣款仍释放预占”与Studio追问/恢复绕开账本的问题。不增加收费Provider调用、不修改生产数据库或现有Agent能力方向。
- **HP08账本源码**：`96328bdf`修改`apps/web/lib/studio/tool-ledger.ts`，为每次登记的工具调用生成唯一invocation UUID，reserved/settled/hold回执共用此ID。普通确定性本地工具失败可释放预算；LLM、external、production等可能收费工具执行抛错则**保留reserved**，存`provider_execution_uncertain`与`retry_requires_reconciliation`，抛`ToolExecutionUncertainError`；成功但settled写入失败则spent仍保留，抛带invocationId的`ToolReceiptPersistenceError`，不得将远端已运行当未执行。无账本的production工具继续拒绝。
- **HP08研究任务恢复**：`0b34c8fc`及`93750d59`修改`apps/web/lib/studio-research.ts`：创建研究任务遇收费/回执不确定时持久化status=hold、预算spent/reserved/ceiling、精确invocationId和工具标识；正常完成保存累计预算上限和费用。恢复时读取旧checkpoint：凡是`retry_requires_reconciliation`、收费已发生或缺逐工具位置的HOLD均**不重跑首步**；仅在尚无收费步骤、追加预算明确且checkpoint有效时允许受控重试。原`runResearch`暂无精确per-step continuation，故真实已付费任务复跑继续HOLD。
- **HP08 Studio追问入口**：`f604e6f3`把`appendResearchMessage`从无账本直接调用模型改为：先校验已完成任务的累计预算checkpoint，使用数据库`status=done→running` CAS抢占，传入同一task ledger且保存更新spent/ceiling；无可信预算、并发争抢、预算不足和收费回执不确定均明确拒绝/HOLD，不重置费用。`c5b6d6c1`同步修正研究消息API返回409/404及no-store。`c28ea2bf`使resume HTTP必须授权明确additionalCeiling，改走`resumeResearchTask`，不再调用无预算`appendResearchMessage`直接重做收费工具。
- **HP08新增测试**：`293d8a52`新增工具reserve→settle成功、预占写库失败零Provider调用、外部工具超时待核、HOLD写失败、确定性失败、settled写失败保留实际spent、无ledger production拒绝等单测；`3ce3c296`覆盖研究任务uncertain HOLD、累计费用与无精确步骤不得恢复、追问CAS；`1d8c7a62`覆盖Studio HTTP恢复追加预算、no automatic replay及追问待核409。所有均为新提交的测试源码，**本批尚无实际Vitest PASS及最新Next构建回执**；不能按测试数量签准出。
- **真实证据**：Vercel连接器确认较早代码`0b34c8fc`部署为READY，并从部署日志查到构建完成；这是该SHA的build-only证明，**不是**本批后续`f604e6f3`/`c5b6d6c1`/`c28ea2bf`/测试的成功证据，也不能代替实际运营安全验收。当前M4`HP08_CODE_PRESENT / CI_UNVERIFIED / LIVE_HOLD`。
- **下一缺口**：`requestProduction`当前`triggerProduction`可能在记reserved成本回执之前启动异步Runner，缺生产签名输入绑定和原子预算授予；必须在HP08/HP04正反核查之后解决，不能启动生产。研究任务已发生收费后的精确步骤恢复、跨进程长期receipt确认及T1—T7真实Provider授权还缺正式隔离E2E；不得因安全失败关闭就宣布M4真实双主体能力PASS。
- **费用和回滚**：没有发起任何实际外部模型/Provider调用，没有改变生产Storage/Gate/数据库，无新增费用。回退不得恢复“工具超时自动退款后再试”、无账本研究追问或工作队列并发重做的风险；必要时继续保留HOLD和显式需核销状态。一次性CodeBuddy交接仍`HANDOFF_NOT_READY`。


## 2026-11-03｜HP08追加收口：生产Runner启动前原子预算与持久回执（非准出）

- **触发问题**：既有`requestProduction`先调用`triggerProduction`（潜在材料准备及Runner spawn），后落`cost=5`的`reserved`回执。如果实际生产将来启用，费用授权/回执可能晚于真实执行，不符合CR-13及HP08先授权、后执行的边界。当前Registry仍未激活、`production_input_binding_required`依然阻断真实调用；本批仅修正候选代码的危险先后关系。
- **源码**：`d693aaab`在`apps/web/lib/studio-production.ts`新增只读零成本的`getProductionBlocker`，复用原Registry及签名输入预检，未重开Runner。`4eb6c9cf`在`studio-research.requestProduction`按如下固定顺序执行：核任务必须done→校验注册工具费用与现有已授权预算（调用参数`extraBudget`不等于授权）→零成本签名Registry预检→解析持久spent/reserved/ceiling→拒绝重复productionReservation→CAS绑定同一research_task checkpoint与唯一invocation UUID、原子预占5 credit→**在Runner之前成功持久化reserved回执**→才调用原`triggerProduction`。预算不足、CAS并发冲突、回执保存失败均返回明确HOLD，不调用Runner；Runner启动不确定/失败保留reserved并尽力追加带相同invocationId的HOLD回执，禁止自动归零/重试。`started=true`只证明启动，后续真实执行完成仍须正式结果回执核销，不能被本入口结算。
- **隔离单测源码**：`3321eadb`新增`tests/unit/mab-hp08-production-reservation.test.ts`，覆盖未启用Registry零启动、精确CAS与reserved回执早于Runner、并发CAS失败零调用、回执失败零调用、任意extraBudget不生效、余额不足、启动失败保留待核预算等正反场景。先前`293d8a52`、`3ce3c296`和`1d8c7a62`的账本、研究任务、HTTP续跑测试保持继承。**本批真实CI/Vitest/PG运行尚无核实SUCCESS回执**，不能标HP08 PASS。
- **精确后续责任**：Runner实际terminal receipt→settlement/补偿、跨进程幂等和任务步骤级续跑仍缺；没有独立Signer的真实D00—D05材料合法输入不得启动。原先的生产角色、真实Owner和Provider权限仍HOLD。当前改动没有让业务收费，也没有实际数据库写入；隔离mock通过与否尚未核实。
- **范围对账**：本批变更属于`PLAN.md §6B HP08`的既有文件增量，不在74个目标文件路径的REVISE集合里；在`progress.md`中记录真实文件/commit/测试责任，不擅自向74项目标新增行。CodeBuddy单次交接继续`HANDOFF_NOT_READY`。


## 2026-11-03｜HP03精确资产历史与实际使用记录的私有可读能力

- **继承合同与必要性**：沿现行`specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md §19.1`，长期资产单一`studio.asset_heads+asset_revisions`已具备不可变revision、head CAS、幂等key和跨Owner RLS，原`studio-asset-repository.integration.mjs`历史隔离测试有正反案例。本批**不新建第二套知识正文**、不把工作资产当正式L5、也不将`use_events`中任意字符串当成合法Gate授权。
- **仓储实现**：`3ee30107`在`packages/data-access/src/studio-asset-repository.mjs`复用`createAppTransaction`和现有精确属主RLS，新增`listAssetRevisions(projectId,assetId,sessionToken)`读取同项目同资产按revision_no倒序的不可变历史，及`listRevisionUseEvents(projectId,revisionId,sessionToken)`读取同项目同修订的真实持久化使用回执。两个方法只读、UUID先验证、返回上限100，跨Owner拒绝由数据库真实session身份/RLS保护。
- **已有Studio接口增量**：`a611899e`在现有`GET /api/studio/assets`上加`history=1&project_id&asset_id`和`use_events=1&project_id&revision_id`两种显式只读模式；使用已登录用户生成的真实签名数据库session，返回`no-store`，缺参数400，未登录401。原当前资产列表、精确单修订读取及POST接口均保留，不发明冲突的新API ID。
- **测试源码**：`a46aa20e`在原隔离PG仓储集成测试中追加revision 1/2/3不可变沿革、跨Owner历史为空、合成use_event只对精确revision可见且跨Owner不可见；`75b35b39`新建Studio API正反单测覆盖登录、缺参数、签名会话、no-store及原列表兼容。测试使用fixture rights文字只用于读取/隔离，不构成真实授权或发出跨项目使用行为。
- **状态**：`HP03_CODE_PRESENT / ISOLATED_TEST_SOURCE_ADDED / CI_UNVERIFIED`。尚未有本批实际PG17和Vitest成功回执；跨项目正式复用写操作、Studio与L0—L5授权核验及真实UseEvent创建服务仍HOLD，需按HP03/HP07/HP11剩余任务执行。没有生产DB修改、没有真实资料/权限变更、没有新费用。CodeBuddy单次交接仍`HANDOFF_NOT_READY`。


## 2026-11-03｜Owner批准立即转回Codex执行（唯一当前交接）

- **新Owner决定**：不再要求ChatGPT聊天插件先做满HP01—HP13才可以转移。继续保留13工作包、M0—M8原任务及所有安全准出条件；由Codex直接在真实最新GitHub `main`上继续源码、测试、环境核证、完整产品闭环和后续M6—M8。
- **唯一当前执行交接文档**：`tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md`（首次写入`8368d576b4eb8e02c4e837c43fa7f24a7bbc80c3`），包含全部读文件顺序、53 REVISE/19已放置CREATE/2缺失CREATE、M0—M8状态、HP03/HP08最新代码、HP07/HP11/HP12合法消费/审核HOLD、真实Supabase只读快照及不能越过的生产权限门、具体命令和验收清单。原`PLATFORM_HANDOFF_20261103.md`保留历史证据，不是当前施工唯一入口。PLAN已同步更新此Owner执行权转移裁决（`134b34c3`）。
- **转移定义**：`CODEX_EXECUTION_HANDOFF_ACCEPTED / TECHNICAL_HANDOFF_NOT_VERIFIED`。这是**执行责任移交**，不是原§6B.3技术验收已READY；最近新代码的完整GitHub Actions push-CI、Vitest、PG17、Next构建及真实授权仍有缺口，M1—M8不因换平台而PASS。
- **权限与成本**：本次没有执行生产DB/Storage迁移、没有正式G签发、没有真实AI收费调用；私有原件上传及独立G5仍关闭。Codex正式执行生产/付费/资料外发前必须沿原Owner审批、角色、rights与费用规程取证，不得从“同意转平台”推断获得批准。
- **开工后回执**：Codex必须先fetch实时main，按文档逐项核实CI/typecheck/unit/data-production/build和本批HP03/HP08新增测试，记录实际命令、SHA、PASS/FAIL/SKIP、独立PG测试与回滚证据，再按P0真实缺口施工并原位回写三份权威账；历史旧SUCCESS只按原SHA引用。


## 2026-11-03｜Codex HP01 首轮接续：真实 CI 失败修复及隔离复核

- **实际 main 基线**：`3618a630c94a683d727be59939d916c5544694fd`。起始本地759dbbd工作树干净，仅快进；已完整读取CODEX_HANDOFF_CURRENT并按PLAN §5/6A/6B、最新进度/74差异与专业合同核对本批范围，不重开M0架构。
- **首个P0根因**：push CI `41610775902`与本地TS2339一致，HP03既有历史方法缺声明；已补类型。原Runner授权失败推进current_stage也已修复；无ledger的LLM/external可绕预算回执，三项先红后绿反例后补失败关闭。
- **真实结果**：冻结安装pnpm9.15.4 PASS；六工作区typecheck PASS；单测246 PASS/4原联网SKIP；production98 PASS；auth strict 104路由缺口0；85/152静态追溯PASS；Next build PASS；真实PG17身份/RLS/独立Gate/精确用途消费者/撤权/资产CAS历史/来源绑定/rollback重跑PASS；真实Next+Chromium+PG17浏览器3 PASS/1官方Storage SKIP；独立撤权协议9 PASS。初次失败和环境修正均保留于[本批回执](../../results/MAB/CODEX_HP01_20261103.md)及相邻evidence，不引用历史READY。
- **CI事实**：主push基线确实FAIL，已读日志；M1最近`41609441324` FAIL；M3历史`41597387094` SUCCESS@7215b842；隔离PG历史`41576958641` SUCCESS@bcd0715b。历史仅对应各自SHA；本批推送后主CI与M1运行待核，不提前填SUCCESS。
- **安全边界**：M1客户端退出清Cookie通过不等于复制旧Cookie重放失效，当前无服务端撤销，独立记HOLD；官方Storage未配，生产身份/旧凭据/恢复未验；M2生产候选迁移/M3正式Gate/M4真实外发及收费均未执行。M1—M8、HANDOFF_READY不提升。
- **下一轮**：HP02旧Cookie重放与禁用恢复会话；HP03项目授权use_event及当前历史只读证据；HP04—07官方Storage/唯一Runner/独立Reviewer授权整链；HP08跨进程预算与终态结算；HP12精确G5/rights映射；HP13剩2个KAD1测试及53份语义核销。生产依赖继续独立HOLD。
- **回滚**：只revert本批应用/类型/测试变更，不恢复无账本收费或旧Gate旁路；测试随机库已清理，生产无变化。修复代码SHA与push运行将在本节后追加。


### Codex HP01推送后复核（同批追加）

- **已提交修复SHA**：`67b2984ef8b7f0b4ab97edcb725d1048074f2e1d`，已推远端main；使用GitHub隐私noreply身份后推送成功，没有更改账户隐私设置。
- **新push证据**：主CI [41612672544](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41612672544) SUCCESS；M1隔离HTTP [41612672479](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41612672479) SUCCESS，日志明确3 PASS/1官方Storage SKIP及测试库清理。两者headSha均精确为67b2984，不引用旧代际PASS。机器步骤JSON已写入本批evidence。
- **默认测试入口补测**：`pnpm test`实际FAIL（缺本地.env.local，尚未连接DB），状态DEFERRED_ENV；真实PG17、专用production/unit/HTTP的成功分别记账，不宣称默认全套PASS。独立临时PG容器已移除。
- **裁定**：本批HP01验证/失败修复完成到限定隔离证据；M1会话重放/生产恢复、M2官方Storage、M3正式Reviewer与Gate、M4真实授权费用与M5合法发布继续HOLD，M0—M8无新增准出。下一P0仍为HP02服务端旧会话失效及禁用恢复不复活，后续施工不得把本批客户端退出验收当作这一能力。


## 2026-11-03｜Codex HP02：服务端会话撤销与退出真实反馈

- 基线main@6b24f7f，承接既有M1/HP02，不覆盖既有代码。明确复现旧logout仅清Cookie、disabled→active复活旧会话；新增iat/jti、摘要撤销与安全字段变化的单调失效时间。logout先持久ACK，503/false ACK不报成功；GlobalNav/Admin同样保留失败时登录态。
- 候选迁移20261103095024由CLI生成；RLS owner、无公开GRANT、运行角色不可改删；rollback保留失效事实。默认开关false，生产未迁移未启用，不能称生产重放问题已解决。精确文件/原因/恢复风险见[HP02批次回执](../../results/MAB/CODEX_HP02_20261103.md)。
- 真实验证：12项新增单测含最初6 FAIL→GREEN及false ACK反例；全单测258 PASS/4原SKIP，六工作区typecheck/Next build PASS，production98 PASS，strict auth104无缺口，85/152静态追溯PASS；真实PG17权限/失效/重复迁移/rollback PASS；真实HTTP浏览器5 PASS/1 Storage SKIP，退出UI先红后绿。所有测试均合成标记隔离库，无生产/付费Provider。
- 本批CODE_PRESENT/VERIFIED_ISOLATED，正式M1仍HOLD。生产需既有独立授权、最低角色与时钟验证；恢复不能丢失后续撤销记录。原默认pnpm test缺.env.local继续DEFERRED_ENV。push CI精确SHA/运行ID后续追加。
- 下一主线：HP03—05官方隔离Storage与D01—D03证据链补最新实测，HP06—07独立资格与消费者；HP08预算终态与HP10—12业务闭环继续。无产品方向和新增成本变化，未请求微步骤确认。


### HP02 push实测追加（2ecde5e）

代码SHA `2ecde5e516eae3885e7d8d2492a8556aebfdfdc2`：主CI41615477077 SUCCESS、M1隔离HTTP41615477096 SUCCESS、PG17隔离41615477219 SUCCESS；三项精确headSha一致，机器步骤JSON已写HP02 evidence。成功范围是候选源码及隔离，不是生产会话撤销已激活。

## 2026-11-03｜Codex HP03—05官方Storage整链复核及HP13两缺席测试适配

- 从最新main@2ecde5e接续；复现官方Storage v1.43.0锁定源码、PG17.11及真实HTTPS代理，补此前本轮Storage缺口。实际ENOSPC和供应商测试角色前置失败已查因解决，仅改一次性标记测试环境，不改生产。
- 实际产品失败：Secure Cookie客户端修正后，真实Chromium暴露原件接口以Next内部req.url判断Origin误拒403；单测先红后绿修复为实际Host同源判断，伪造x-forwarded-host不获放行。multipart和二进制helper保持真实浏览器，不通过关闭Secure/权限检查跑通。
- 真实结果：官方Storage私有上传/读回/匿名拒绝/篡改PASS；PG17+官方Storage原件PENDING/并发/ACK丢失/DB回滚/对象与DB备份恢复、精确source/raw/read_unit/evidence/claim_revision桥PASS；完整Next+Chromium6 PASS/0 SKIP；unit280 PASS/4原联网SKIP，production98 PASS。精确输入授权/唯一Runner与独立Reviewer整链仍未签运行PASS。
- HP13两缺席目标测试现已适配，20项通过且已接Vitest；冻结原测试中提前MHKA切换/旧文本断言未照搬，差异账记录ADAPTED与限定单位验证，不假称字节相同或74语义完成。原M8不激活。
- 生产只读现场：mohen-cloud ACTIVE_HEALTHY；会话撤销表/失效字段、private_originals仍缺，bucket=0、qualification_current=0；三内部角色非super/无bypassrls；publication_schedules无RLS但anon/authenticated无SELECT。Advisor INFO/WARN逐类记录，未据此盲改生产。详见[本批回执](../../results/MAB/CODEX_M2_HP13_20261103.md)。
- 全部数据为合成隔离数据；无生产DDL/桶/账号/正式G/模型费用/真实资料外发。生产准出及旧凭据/生产恢复依然HOLD。最新push SHA/CI待提交后追加。


### M2/HP13 push复核（8dd2b5e）

源码8dd2b5e7cffe9189cf73875ec5cb46424edb37c8的主CI41617100385及M1隔离HTTP41617100327均SUCCESS，机器JSON入M2 evidence。GitHub浏览器没有官方Storage配置，仍以其实际SKIP为准；本地完整官方Storage6 PASS/0 SKIP为另一明确环境证据，不混写。74目标当前路径缺席0，但74项完整语义仍未签完，HANDOFF_NOT_READY。

## 2026-11-03｜Codex HP06：Signer session_user独立登录边界

- 基线main@8dd2b5e。实际发现GateAuthorityRepository只检查current_user，管理员/共享Web登录先SET ROLE即可伪装；首轮6项新测试先5 FAIL/1 PASS，另补低权登录SET ROLE隐藏身份反例先FAIL后GREEN（总7项）。现同时检查session_user真实登录、Signer成员关系及低权限，拒Producer/Web/authority兼任与高权继承，检查先于Reviewer会话和变更。
- 原repository集成Pool从k3_admin+role改为真实随机低权LOGIN，仅授Signer并绑定精确Reviewer身份；真实PG17签审/撤权成功、管理登录SET ROLE伪装拒绝、rollback/池身份清理通过。此前SQL角色测试不再被误称独立凭据测试；新连接仍仅为Unix socket合成身份，不冒充真实Reviewer托管服务。
- 实测unit287 PASS/4原联网SKIP，production98 PASS，六工作区typecheck/Next build PASS，PG17全套含新增角色边界PASS；证据与完整源测对应见[HP06回执](../../results/MAB/CODEX_HP06_20261103.md)。本批未配置Storage，前批官方Storage证据按8dd2b5e独立引用。
- 无生产角色/Schema/真实Gate/收费Provider变更；本批CODE_PRESENT/VERIFIED_ISOLATED，M3正式身份、stage输入输出映射、实际服务签审/撤权与消费闭环继续HOLD。下一步HP04/06/07合法私有输入与独立资格服务/消费者整链；HP08/09委托恢复及费用终态、HP10—12产品全链继续，不另立架构。


### HP06 push实测追加（5950ccf）

5950ccfd4b2ad7d68a4f92954e26f21581e29cb7：主CI41618239611、M1隔离HTTP41618239774、PG17隔离41618239520均SUCCESS，精确headSha一致，机器回执入HP06 evidence。无生产Reviewer/Gate激活。

## 2026-11-03｜Codex HP08：客户端预算不作授权、CAS恢复与崩溃检查点

- 基线main@5950ccf。实际复现resume客户端additionalCeiling直接增额、无CAS并发重入、缺spent/reserved补0。先红后绿：3项授权/CAS反例及2项未知费用反例；API拒未经持久审批的数字增额，只允许原额度下可信零花费起点恢复。
- 原子hold+checkpoint CAS，领取即保存resume_claim_ref与不可自动重放标记；未知异常写review-required HOLD。已收费步骤、不确定费用和缺字段旧checkpoint仍不重跑。没有审批服务则不增加额度，未用Owner本次技术授权冒充成本批准。
- 新真实PG17集成3 PASS：请求增额不改变上限；两并发调用仅一个赢家且一条恢复事件；模拟事件DB失败后持久HOLD，后续reconciliation拒绝。真实服务/SQL，模型边界合成替身，无Provider费用。已接原PG17流水线。
- 全unit298 PASS/4原联网SKIP，production98 PASS，类型/Next build PASS，auth104无缺口、85/152静态追溯PASS。原Gate/资产/来源/回滚隔离链继续通过。本批Storage未配，前批6 PASS/0 SKIP明确分环境引用。
- [本批回执](../../results/MAB/CODEX_HP08_20261103.md)列文件、真实结果、遗留和回滚。尚缺正式预算审批、已付费步骤恢复、长期费用账与Runner终态结算；M4整体HOLD，M1—M8未准出。无生产写入、模型调用或新成本投入。push运行待提交后追加。


### HP08最终push及本轮四批汇总

- 最新修复代码SHA `94cdb5db5f111edd484ea9dafe59789d870669ff`：主CI41619741669、PG17隔离41619741406、M1隔离HTTP41619741435均SUCCESS，机器JSON入HP08 evidence；最终代码类型/构建与新PG CAS测试均实际核证。
- 本轮连续施工：HP02会话撤销/退出真实状态；HP03—05官方Storage、原件恢复与精确证据桥及Origin误拒修复；HP13两缺席KAD1测试适配；HP06真实Signer登录边界；HP08增额授权拒绝、原子恢复及崩溃HOLD。每批命令/源测/正反失败/回滚已原位入账，未重启架构。
- 最终unit298 PASS/4原联网SKIP、production98 PASS、PG恢复新集成3 PASS；六工作区类型/构建PASS。前批本地官方Storage浏览器6 PASS/0 SKIP按8dd2b5e限定引用，GitHub无Storage配置的SKIP不混写。
- 合成业务/Storage库与随机Signer登录角色均0，Storage fixture已清理，一次性PG容器及数据卷已移除。无生产迁移/桶/正式Gate/收费Provider/私有资料外发/新产品方向变更。
- 余项保持：M1生产会话开关/Owner/旧DB凭据/恢复；M2受控生产原件/核验密钥及唯一Runner完整授权；M3真实独立Reviewer/Signer服务与精确资格映射及即时撤权；M4持久预算审批、永久委托/费用账、T1—T7、付费步骤恢复与Runner终态核销；M5 Studio/Admin/WATCH完整合法业务与媒体权利；M6全量真实85API/152动作、M7真实A/B复用、M8原子投运。74路径缺席0不等于74语义通过，整体HANDOFF_NOT_READY与各阶段HOLD不取消。

## 2026-11-03｜Codex HP08：永久委托与待核回执

- 基线main@1ae44a4，继承前批全部成果。新增Owner事务仓储/类型、并发幂等、稳定root与snapshot、精确请求/观察hash、HOLD-only永久回执；Owner只读HTTP可跨会话查询，明确execution_authorized=false。
- 新委托过期拒绝；缺任务归属绑定拒绝FK；UNKNOWN费用不补0，ACTUAL需独立核销而拒绝，超过预算的已观察估计费用保留HOLD证据。原权利/预算字段是待核记录，不授予执行或外发许可。
- 真PG发现共享immutable函数在非delegation表访问root_task_id；保留失败日志，修正未激活候选的嵌套分支。三表immutable、task置空与长期身份保留、跨Owner、禁用身份、并发与池清理PASS。首次fixture与actual_provider NOT NULL不符，按真实Schema改为显式合成provider/version，无真实Provider调用。
- unit308 PASS/4既有联网SKIP，production98、六工作区类型、Next build PASS；全真实PG/回滚PASS；Chromium6 PASS/1官方Storage未配置SKIP，新增Owner读200/匿名401/跨Owner404。auth105缺口0；85/152仅静态，74语义仍HOLD。默认pnpm test继续DEFERRED_ENV。
- [本批回执](../../results/MAB/CODEX_HP08_RECEIPTS_20261103.md)与机器日志已落盘。T1—T7、永久账与工具账原子接线、正式预算审批、Provider核销/lease/重试/真实混合与Runner终态仍HOLD；M4不升级，其他阶段未准出。
- Ruling: 保留原Studio物理合同，只保存未验证封套及HOLD观察，不把字段完备误作可执行许可 — 当前没有受控Provider/权利/费用核验与lease — 若误接执行入口会造成越权或费用，故无dispatch/写HTTP接口且只读返回禁止执行。
- Ruling: 修订尚未生产激活的Studio迁移候选中的真实触发器缺列，而不另建同义表或执行生产DDL — 隔离PG直接复现且原Studio生产尚未激活 — 后续部署必须使用修正候选并重新核验，不能引用旧文件hash准出。
- 代码审阅：独立只读审阅未发现实质问题，未独立重跑测试；这是工程代码审阅，不是正式Gate或生产Reviewer签发。精确push CI待提交后追加。
- 声明复核修正：listReceipts可读取其他合法服务写入的全Schema状态/费用可信度，不将全历史类型误缩为本仓储可追加的HOLD。append返回仍窄化；此为类型准确性修正，六工作区typecheck复验PASS。

### HP08永久回执push收口

实现5645bb2：CI41623523765、PG17 41623523800、HTTP41623523678全SUCCESS；已查logs核对新仓储PASS、308/98/6通过与1Storage SKIP。后续声明修正22f4e2c：CI41623818622、HTTP41623818662均SUCCESS，PG限定5645bb2同运行代码证据。JSON/日志摘录已Git归档。合成业务库及随机Signer角色0，一次性PG容器/卷已清理。交接索引已追加已完成批次，避免后续重复施工；本次最终回执提交仅文档/证据，无运行代码。完整T1—T7、DAG、永久账接线和费用终态/M5合法业务仍待完成，HANDOFF_NOT_READY不变。

## 2026-11-03｜ChatGPT GitHub插件接力 HP11/M3施工与生产只读复核（非正式准出）

- **接续与基线**：Owner明确Codex额度不足，改由ChatGPT调用已连接GitHub插件从`main@ac760ecde4aefa228c03686cd49c5ee7125e29c7`接力；未更换工程总任务、阶段树和唯一计划，不重做MHKA/KAD设计。GitHub直接提交main，无付费Provider调用、无生产DDL/数据写入/Storage操作、无真实Reviewer动作。
- **HP11实现**：`ea4abd51bccf7d253d3b896fc3432044e662c4d9`修改`apps/web/app/admin/AdminWorkbench.tsx`，新增`KnowledgeAssetInspector.tsx`、`knowledge-asset-view.ts`和`tests/unit/mab-hp11-knowledge-inspector-contract.test.ts`。F05 Admin运营账号在自己合法Owner权限范围内，通过既有`/api/studio/projects`与`/api/studio/assets`查询项目、资产当前修订、历史版本、精确修订使用事件；区分工作态候选与当前独立G5分面，读取失败与零记录分开，不新增数据库或跨Owner后门。展示的是存储的来源/依赖引用，不是来源审查结论。实际主CI [41627651710](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41627651710) SUCCESS，M1隔离HTTP [41627651529](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41627651529) SUCCESS。**未实跑Owner交互/视觉E2E，也没有Admin跨Owner条目管理授权，HP11只是可继承的Owner私有只读子能力**。
- **M3校验加强、失败与修复**：`f8ae5d0a240bb84449cadb902820d2322a9a96fb`修正`independent-stage-qualification.mjs`：精确回执增加`job_id`、`reviewer_binding_ref`和`consumer=producer`强制匹配；新增错任务、错Reviewer、错消费者与缺任务ID负例。首批Actions [41628043957](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41628043957) FAIL（98生产边界测试中3个旧编排模拟回执缺字段：预期PASS变HOLD），失败未被抹掉。随后`f5cd2d38a5cf43349a26a506833fffc185d6739b`只补`authorized-fixture.mjs`与`orchestrator.test.mjs`中**合成Reviewer回执**的真实合同字段；正式校验不回退、测试不skip。Actions [41628357443](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41628357443) **SUCCESS**，安装、六工作区类型、单测、98生产边界、85API/152动作静态追踪、Next Build、鉴权及74目标差分审计成功。该测试不含正式Reviewer/专业Gate投运。
- **真实生产只读事实**：Supabase`mohen-cloud` 2026-11-03T11:31:00Z：`source.raw_items=98`、`evidence.material_evidence=166`、`studio.projects=0`、`studio.asset_revisions=0`、`control.qualification_current=0`、`storage.buckets=0`，`control.gate_reviewer_bindings`、`studio.private_originals`、`control.web_session_revocations`均不存在。未读取任何私有条目正文/凭据。已有M1/M2/M3候选迁移仍是候选，不以源码/CI代替生产就绪。
- **本批补充展示和归档**：Admin详情增加实际保存的`source_refs`与`dependency_refs`受限只读预览；`PLAN.md`、`progress.md`、`CURRENT.md`均原位记账；本归档批最终push CI需按本批具体SHA另核。74目标仍需完整语义核销，不能凭路径在位宣布已实现。
- **待验证及回退**：HP11 UI效果/本人合法登录浏览器/异常状态待Owner验收；当前生产没有Studio真实项目，页面应诚实显示空资产。M3仅合成只读回执绑定范围验收，正式Reviewer身份、实际SQL签审、最新资格及消费撤权仍HOLD。回滚如有问题只撤本批Admin只读组件和M3严格回执合约相关提交，不撤生产安全RLS，不复活旧PASS或公有原件入口。后续优先M2 Runner受控原件链、M3独立服务与当前资格、M1生产会话/凭据/恢复证据；真实生产迁移和外部AI付费需独立授权。

## 2026-11-03｜M3旧PASS继承清除 + 真实PG17正反验收（ChatGPT GitHub接续）

1. **基线与精确缺口**：从`main@c949a082a8561a0370a201709b2e254db72140ba`检查，发现`data-production-repository.passed/legalInput`及`lineage-validator.passedIds`查询仅依赖审计`PASS + current_valid`；没有执行现行`control.qualification_allows`的审签身份、实际对象修订、依赖链、当前时间、scope/purpose/consumer校验，属于潜在跨代际知识继承。Owner批准按原M3/M2工程线继续施工，无产品/预算/正式权限变更。
2. **代码施工SHA**：`2352c36817cf83bf853ec32aa4f54b192036a0e3`修复`packages/data-access/src/data-production-repository.mjs`和`lineage-validator.mjs`；新增统一`qualification-read-context.mjs`。两类上游读入必须有明确消费者、用途三元组、非空权限scope，数据库使用独立资格函数且需`decision_origin='independent_gate'`；默认无上下文不准入。合成`mock-db.mjs`不再把旧PASS等同有效G；`gate-enforcement.test.mjs`新增旧PASS、空scope、错consumer/purpose/project拒绝。
3. **PG隔离CI纳管SHA**：`faddc2a48c2771c8e2afdcb0d5d41498c82db559`扩展现有`.github/workflows/mab-isolated-db.yml`的文件变更触发：资格上下文、数据生产仓储、谱系校验、read-model资格实测。没有创建新工作流或使用正式Supabase数据库。主[41636244069](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41636244069) **SUCCESS**；隔离PG17 [41636244060](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41636244060) **SUCCESS**，日志含`K3_READ_MODEL_QUALIFICATION_PASS`与`K3_DB_TEST_PASS`。隔离实测独立G0→G5合法用途/精确scope消费，生产仓储G4→D05谱系交接，撤上游G0后G4/G5拒绝，711条旧审计不升格，权限回退保全、迁移重放。不是生产真Reviewer登陆或实际授权。
4. **read_model一致性补强SHA**：`10b7a3dda43106241bfe2fb08191d2e53d0a5ecc`将`read-model-repository`统一为拒绝空scope和缺用途；新增PG负例，隔离工作流对本文件变更自动验收。最终有无最新CI/PG PASS，需以本次SHA的Actions实际结果核定，不能借前批替代。
5. **本批交付保真与回退**：只修改源代码/测试/CI触发/施工权威账。无生产数据库/Storage写入、真实Reviewer/Signer、私有字节外发、付费Provider请求、Runtime Registry激活。M2真实原件来源/字节回读/唯一Runner、M3独立Reviewer服务和业务消费者权限仍HOLD；`CONTROL current_qualification`正式仍0的最近一次现场只读证据见上批记录。本批修复仅需按SHA回退代码，但任何后续已正式吊销的证据不得凭代码回退复活。

### M3当前代码批次最终GitHub回执（2026-11-03）

- `2352c368`消除Producer与谱系读取旧PASS继承；`faddc2a4`纳入真实PG17；`10b7a3dd`拒绝未限定范围的read_model消费者；`f79dc436`补JSON擦除范围边界与回归测试。代码不需要再次重建六章MHKA或D/L/G。
- 最终代码SHA`f79dc436723679c70d8c32e7cde18fe125da8504`：主[CI41637141950](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141950) **SUCCESS**，隔离[PG17 41637142076](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637142076) **SUCCESS**，[M1 HTTP 41637141998](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41637141998) **SUCCESS**；前一代码批次`10b7a3dd`的同类三流水线41636848862/41636848766/41636848777也均SUCCESS。
- 真实SQL正反验收包含G0→G5、Reviewer资格／策略时效／递归依赖、legacy PASS拒绝、目的及消费者不匹配、上游G0撤权后G4/G5立即拒绝、711条旧audit保全、控制表DDL重演与回滚权限拒绝。mock与isolated PG真实验收分开计证；DB/Storage生产迁移NOT_RUN、真实Gate签发NOT_RUN、真实业务E2E NOT_RUN。
- **结果裁定**：本批M3 scoped-producer-read和read-model-consumer-read源码＋隔离真实PG正反测试**子能力验证通过**；不能把本子能力通过升级为M3阶段准出、M2真实数据生产完工或全系统可运行。现行总体仍HANDOFF_NOT_READY，继续M2私有原件→唯一Runner、M3专用Reviewer服务与权限/撤权生产验收，再按计划推进M4/M5/M6/M7/M8。

## 2026-11-03｜M2唯一Runner续跑输入与单阶段Adapter绑定（本轮代码候选，CI准）

- **真实缺口**：唯一CLI`pipelines/data-production/run.mjs`允许`--from D01`但未给`context.resume_input`赋值，实际报`RESUME_INPUT_REQUIRED`；同时`assertAdapterBinding`要求所有六阶段Adapter路径一致，无法只将D01—D03合法私有阅读绑定到候选Adapter。原生产`Registry`仍关闭，故这些是受控待实现缺口，不说明曾发生私人生产。
- **源码SHA**：`64eed3f55d8a6f6d21d1b62c0629f139e5dfe341`更新`run.mjs`、`adapter-binding.mjs`；新建`resume-input.mjs`和`resume-input.test.mjs`，扩`adapter-binding.test.mjs`。Runner可显式接收`--resume-input-file`，唯以`MOHEN_TRUSTED_RESUME_INPUT_DIR`信任路径限定、POSIX目录0700/文件0600、符号链接拒绝、128KiB上限、JSON对象、私有阶段字段白名单，不自动接受动态主题文件；加载前检查阶段范围与Registry active。Stage范围选定后只核该范围Job的实际Adapter路径，整链默认仍查全部。独立授权仍核精确输入digest/run/job/Registry/nonce，未增加旁路。
- **真实测试**：[main CI 41638126713](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638126713) **SUCCESS**，确认编译、单测、production boundary、构建与鉴权；测试含有权路径、选定Stage绑定、错模块/重复Stage、目录越界/符号链接/非私有权限/超大文件、错私有Stage/隐形字段/坏JSON。尚未为此批运行真PG17或完整Owner工作器；不能把新CLI参数解释成可以读取原件或执行真实Gate。
- **剩余P0/后续**：`context.privateEvidenceWorker`、`privateEvidenceOwnerSessionToken`在CLI尚无已批准的运行实例/注入，`Studio`生产触发继续显式HOLD；D01候选无实际真实L1持久写入＋独立G1验收，D02/D03需真实桥与G2/G3。M2正式生产仍HOLD。M3上批资格读链正式SQL与隔离PG通过，但Reviewer服务正式激活HOLD。无生产数据库迁移、无对象桶或真实字节、无收费Provider。
- **回退**：若新Stage续跑存在隐患，可回退本批Runner参数/Adapter范围支持，保留原全链Registry与执行权、Gate失败关闭；不能通过启用旧全局adapter或legacy PASS来修复。新支持文件属于既有M2执行结构补强，74项目标登记的总分母不变；在后续HP13按合同测试责任追加，不将文件数伪作达标数量。


## 2026-11-03 20:23+08:00｜Owner 执行权转回 Codex：GitHub 交接确认（不变更阶段准出）

- Owner明确：“请确保施工写入GitHub，我又要回codex施工了。”本轮 ChatGPT 已推送到`main@9f4e1485150c02db48425525a435c9527104b390`（2026-11-03 20:23+08:00 核查时）；主 CI [41638572066](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41638572066) **SUCCESS**，此前 M2代码`64eed3f5` CI41638126713成功，M3代码`f79dc436` CI41637141950、隔离PG17 41637142076、M1 HTTP 41637141998成功。
- 全量新增及修改已在远端main，不需传包：Admin私有资产只读组件/测试、M3精确Gate回执与全谱系资格读取、M2有界续跑输入和精确阶段adapter验证、上述CI工作流与全部现行施工记录。
- `CODEX_HANDOFF_CURRENT.md`开头原位补最新Owner裁决、已提交成果表、精确SHA、CI、M2/M3下一步P0及生产权限边界；`CURRENT.md`明确Codex接手优先。原M0—M8／HP01—HP13和历史归档不删，旧交接不成为第二套入口。
- 本文档交接提交后会产生新HEAD，Codex需`git fetch origin main`后以实时`origin/main`为准；历史SHAs仅做验收与回滚证据。本次只写GitHub文档，没有生产DB/Storage写入、真实Gate签发、付费模型调用及私有资料外发；M2/M3正式生产HOLD，技术HANDOFF_NOT_READY不因Owner转回Codex而改写。


## 2026-11-03｜Codex接续 HP04—HP07：私有worker装配及独立Gate签发/当前读取

- **基线/保全**：实际fetch远端main@02eecd6e4a511738fb7cca81287295f88022b539；原本地干净work@759dbbd保留，建立本地施工分支，未reset/覆盖最新成果。先读当前交接、PLAN/progress/74差异账/CURRENT与相关专业合同；没有重建架构。
- **M2实码**：run.mjs→精确私有Adapter→惰性runtime，默认关闭；显式独立worker URI/Owner短时session/私有Storage与核验key版本配置；真实登录须低权app-runtime成员，拒绝Producer/Signer/authority/高权及伪装SET ROLE；强制TLS校验、显式密码、无URI参数/共享DATABASE_URL回退。原件权限/字节/来源版本复用现有worker；异常和终态清理Pool。D01仍为候选，未冒称L1持久化。
- **M3实码**：独立decision handler复用专用Signer仓储；current reader+handler对接原客户端，仅接受带immutable stage_binding的独立PASS，精确run/job/Reviewer/input/output及server-owned purpose/scope，逐请求qualification_allows；错配/歧义/撤权拒绝，无资格缓存。新workflow路径已接。
- **实际测试**：pnpm9.15.4冻结安装、六workspace typecheck、CI=true单测313 PASS/4既有联网SKIP、生产边界116 PASS/0 SKIP、strict auth105 routes无缺项、Next build PASS；74目标audit零缺路径但仍HANDOFF_NOT_READY。PG17一次性实例标识codex-k3-isolated，专用低权Signer HTTP签发→当前read→Producer→撤权与Reviewer禁用/binding禁用/policy禁用拒绝，专用private worker Owner/来源/跨人/过期/伪造/disabled/归档及admin/Signer身份拒绝；全套迁移/回滚/711历史审计保全均PASS。真实输出见同批回执。
- **环境失败如实保留**：预装pnpm非9.15.4导致最初安装/脚本失败，后改用/tmp精确版本与PATH shim，锁文件未改；非CI Commons联网失败未伪造通过，CI历史4项SKIP保留。官方Storage未配置，PG脚本明确Storage_HOLD；TLS池配置已测；其后补一次性PG17实际TLS验证：受信合成CA+专用低权身份成功，pg_stat_ssl加密成立，未信CA拒绝，入口private-worker-tls.integration.mjs。
- **独立审查**：只读reviewer审查M3及M2、独立跑新协议/worker测试，无Critical/Important；空密码回落环境凭据隐患已RED→GREEN修复。minor deferred：两个新handler尚无body读取时限，正式部署必须补时限或证明宿主限制。
- **生产只读**：2026-11-03 21:00:00+08:00项目0/当前资格0/桶0、private_originals与签发函数不存在。无生产写入/迁移/私有外发/收费调用；Registry/Studio生产HOLD、M1—M8不提升。
- **界限与下一P0**：真实独立认证及凭据失效、受审reader最小权限部署、Owner原件实际bytes→唯一Runner→L1持久化/证据/主张→独立G1—G3未闭合；本批CODE_PRESENT+限定VERIFIED_ISOLATED，非VERIFIED_LIVE。沿同任务书继续，不授权开启生产。
- **证据/回退**：`tasks/results/MAB/CODEX_M2_M3_SERVICES_20261103.md`；关worker并回退本批接线，保全原资产/旧撤权503与所有追加审计，不回滚已合法撤权。commit与远端CI回执在取得真实SHA后追加。


### main源码提交的GitHub真实push验证

`b609efa2c5883cd732cc1a1ce2100bb0d96d8265`四流水线均COMPLETED/SUCCESS：

- 主CI [41641917991](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641917991)：Install、Typecheck、Unit、Production boundary、K3追溯、Next Build、strict Auth、74目标审计及artifact上传均成功。
- 独立PG17 [41641918045](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918045)：真实迁移、专用低权Signer/worker、签发/当前资格读取/撤权及历史/回滚完整套通过。
- M1 HTTP/Chromium [41641918101](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918101)：一次性PG17与真实HTTP/浏览器验收通过。
- M3协议 [41641918296](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918296)：纯合成协议与禁止直接写Gate检查成功。

以上只对精确源码SHA与隔离合同有效；后续TLS测试脚本/本回执提交不冒称四流水线也已在该未来SHA执行。生产迁移、原件Storage整链、真实独立认证和M1—M8阶段HOLD均不变。


## 2026-11-03｜M施工阶段顺序与M1有条件准出核销（Owner明确批准）

- **本轮授权**：Owner明确允许有条件准出或调整施工方案匹配实际准出标准，但不降低最终标准。解释对象是M施工阶段，不是数据生产闸门；未将此指令扩展成生产迁移/权限/外发/费用许可。
- **基线/保全**：fetch最新main@982c5ae6cdd17e1894f56073ca7ace945bd89306，HEAD一致、工作树干净。M1认证源码相对已通过HTTP/PG的b609efa2未变；仅有文档和TLS测试追加。直接读取实际GitHub日志继承证据，没有无理由重跑M1全套。
- **核销结果**：M1_CONDITIONAL_EXIT仅代码/标记隔离环境；M1_SECURITY_ACCEPTANCE_HOLD继续表示完整生产未通过。原五项任务逐项已在既有M1_SECURITY_ACCEPTANCE_HOLD_20261103.md核销，原完整任务复选框不伪勾。最新HTTP41641918101实际6 PASS/1 Storage SKIP，PG1741641918045和main982c5ae的CI41642390511 SUCCESS；不是所有角色/85API生产E2E都通过。
- **固定四条件**：M1-C01生产合法链及实际最小连接权限、C02生产会话撤销迁移/开关及正反验收、C03旧凭据失效非敏感核证、C04安全恢复。责任/证据/最迟点见PLAN；C01—C03在M2新增生产业务写入/原件上传前关闭，C04在首次M2生产切换/恢复前关闭，所有条件M8最终前必闭。不重复要求轮换已很可能完成的密码。
- **本次生产只读**：2026-11-03 22:11:50+08，imported_materials RLS=true且anon/authenticated SELECT/INSERT全false；撤销表及session_not_before列不存在；内部三个NOLOGIN组无super/bypass/createrole/createdb只证明组定义，不冒称实际Web登录已最小化。没有生产写入/凭据/私人正文读取。
- **消除循环依赖**：M2工程交付是权限受控、真实字节/版本、不可变修订与持久候选关联/恢复；M3负责独立审签及资格消费。M2的待审候选是M3有效工程输入，未获专业资格仍不得正式生产交接/公开。禁止让M2等待M3正式服务先投运而M3又等M2。
- **施工队列**：M1有条件交付已接收→当前唯一M2收口→M3→M4→M5→M6—M8；保全已做M3—M5及全部证据，暂停新增横向功能。M1只因具体变更/可复现缺陷定向重开，普通生产条件未满足不拖住隔离源码施工；同障碍两次无新证据必须改路径/条件准出/BLOCKED，不重复尝试。
- **M2下一实际工作**：按原七项核对长期资产/私有原件/精确持久关联/恢复的可继承证据；集中补未持久化的L1及候选实体到唯一Runner接线，验证M2交付能被M3审签接收。既有Owner/RLS成果作为固定输入调用，不重新开发。生产Storage及迁移授权单列，不把缺官方Storage测试称PASS。
- **改动/回退**：仅原位PLAN、progress、CURRENT、当前交接索引、M1核销回执和74差异账的证据/状态范围；无业务源码、SQL或开关变化。撤销本批文档解释可回退此提交；任何最终安全条件和既有撤权不得因此撤回。


## 2026-11-03｜M2持久交付闭环→M3实际接收（有限条件准出）

- **基线/范围**：fetch main@331dfc9ffca6cfbcea091daab49a9059c89ca997，工作树干净；继承M1限定工程准出，施工仅M2。最终授权/标准不变，不重新展开M1或横向M4/M5。
- **第一真实断点已补**：原私有D01仅内存候选。新仓储+CLI生成候选迁移20261103143451把已核验原件字节、精确版本/locator/hash持久到既有source.read_runs/read_units；Owner/项目与run锁、域隔离30秒HMAC、稳定幂等ID、不可变版本、原子失败回滚和最小EXECUTE。app_runtime仍无source schema/表直写，未新增第二资产正文。
- **下一步接收真实有效**：worker只有取得持久ID和实际row revision才回UNASSESSED；Runner资格未满足仍HOLD，控制输出/落盘机器报告保留无私有引文的refs、run/job/Reviewer绑定和真正input/output digest。现有Producer候选仓储接受同一ref@revision与stage input_fingerprint，原证据桥测试直接使用本次持久L1输出ID连至L2/准确claim revision，不再手工填L1。没有Reviewer PASS或生产Registry启用。
- **恢复闭环**：该候选与对应原件同backup_id封存DB dump、bytes和manifest，实际对象/PG restore保留同L1 revision及M3输入；恢复库去除旧session key后拒绝旧身份。migration重演/rollback入口关闭且候选/版本钉住不变；原711审计保全。
- **实际证据**：317单测PASS/4既有联网SKIP，117生产边界PASS/0 SKIP，六workspace类型、Next build、strict auth105路由无缺项；真实PG17.11+官方Storage v1.43.0锁哈希匹配、HTTPS、唯一Runner、M3候选接收、L1-L2-L3精确桥、同身份备份恢复及整套回滚PASS。原始日志已存 `tasks/results/MAB/evidence/CODEX_M2_L1_20261103/`，逐项回执 `tasks/results/MAB/CODEX_M2_L1_20261103.md`。M1浏览器代码未变，直接继承真实旧证据，不以本次PG代替所有生产验收。
- **审查与真实失败**：独立reviewer指出幂等request_digest不等于Runner input_digest，已RED→GREEN与真实PG跨边界断言修复，M3校验不降级。缺模块/未持久ID/HOLD及机器回执丢refs均先失败后通过。官方fixture首次缺postgres角色、pg_dump wrapper起初未就绪后输出空档等环境根因已定向修复，真实dump/restore最终通过，没skip失败或改安全标准。
- **原七项核销**：当前物理承接L0—L5与control、L6—L8延后；长期资产最小表/RLS/修订及回执、复合唯一/CAS、永久委托幂等直接继承当前PG实跑；原件状态机、本批精确持久关联与恢复逐项在回执登记，不按文件数伪签所有能力。
- **裁定及当前施工**：M2_CONDITIONAL_EXIT，支持范围仅已证UTF8待审候选和长期资产最小持久层；M3已实际接收，当前唯一阶段转M3。M2-C01正式环境/Storage/迁移，C02非UTF8读取，C03正式复用写服务固定责任/验收/截止点已写回同一PLAN；不将尚无授权的use_event字符串当实际复用，不将表存在当业务闭环，不勾完整验收PASS。M8最终不带未关闭必交条件，M1-C01—C04继续生效。
- **生产/回退**：无生产数据库/桶/账号/角色/key操作、私有原文外发或收费Provider；rollback关闭新入口保留不可变候选/资产/审计，回退代码不得恢复memory假落库或已撤权限。源码提交与GitHub CI真实回执取得后追加。


### M2源码提交后的GitHub实际回执

源代码 `c923b5bd91013fc1320d2998179af9223197a18d` 已推main；当前三条push流水线全部SUCCESS：主CI [41660282238](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41660282238)、隔离PG17 [41660282267](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41660282267)、M1真实HTTP/Chromium [41660282246](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41660282246)。PG远端日志包含新L1持久化/接收与rollback标记。远端默认PG未配置官方Storage，新增用例明确输出byte-buffer-only/no-Storage；官方Storage HTTPS/真实Runner/机器回执/精确桥及同备份恢复的完整证据来自本批本地标记PG17+官方fixture日志，不混用两类范围。

M2_CONDITIONAL_EXIT的条件和最终标准不变；此后仅回执补记不冒称新的业务源码测试。工作树和远端SHA提交后再次核对，不强推、不覆盖远端成果。

## 2026-11-04｜M3独立认证服务工程闭环／有条件准出 → M4

- **基线与范围**：先fetch核对 `main@af85d9ddc01ac1e0739531c0eb1072cfce8e91d4`，HEAD一致、初始工作树干净；按现行交接/PLAN接续，不覆盖已有成果，不重做总体架构或M1/M2。
- **实码**：新增默认OFF的独立HTTPS runtime、专用Signer/Reader LOGIN检查、只存SHA256的有期限/范围/任务/Reviewer/capability凭据、当前用户/binding核查；同事务锁凭据并调用原唯一签审/撤权SQL，确认COMMIT后成功；reader只能执行窄函数、无审计表SELECT。请求正文、SQL、锁、TLS证书均有边界；禁止Web凭据/高权连接回退。候选迁移/回滚 `20261103234154_mab_m3_gate_service_auth` 未用于生产。
- **有效输入接收**：官方Storage真实合成字节→唯一Runner→原不可变L1及候选；独立服务签合成G0后由Producer提交依赖精确G0的G1新候选；签发/当前资格交真实Runner validator，原件/输入输出摘要精确；撤销G0立即拒绝G1和同一Runner输出。原无G0依赖候选保持SUBMITTED，不能补写伪依赖。
- **定向修复**：审查发现跨任务撤权未校验目标stage_binding，已补目标job/ref/consumer正反测试。实际官方Storage并发upload回读出现暂态5xx，新增GET最多3次、共用20s期限与精确hash校验；403/404不重试、5xx不转absence、不POST/覆盖。新7项测试先RED后GREEN，独立审查无important/critical；完整PG/Storage并发回归已PASS。仅该有失败证据的M2接口定向修复，不重开整个M2。
- **验证**：unit324 PASS/4既有实网SKIP；生产边界133 PASS；六工作区类型、Next构建、85 API/152动作追溯、105路由权限覆盖通过。一次性PG17+官方Storage全套exit0（真实L1、G0→G1、专用身份/凭据、HTTPS、旧/禁用/过期/跨job拒绝、祖先撤权、备份恢复及回滚保留）；独立运行runtime实际PG TLS受信CA连接成功/未信证书拒绝。测试失败/配置修正和验证边界均见 `tasks/results/MAB/CODEX_M3_SERVICE_20261104.md`，不借历史PASS盖过本轮失败。
- **M阶段裁定**：`M3_CONDITIONAL_EXIT`仅代码/标记隔离环境独立服务工程闭环；M3-C01生产部署、C02真实专业审核、C03正式恢复/业务消费条件已固定到PLAN和回执，原完整复选框不提前勾选。M1/M2条件继承，最终标准不降低。当前唯一下一施工阶段为M4：复用既有服务/客户端和精确待审输入推进DAG、T1—T7、费用与恢复，不重复建设上游。
- **未做**：无生产DB/Storage/角色/凭据/开关写入或发布；无私人资料外发、无Provider收费调用；合成审核PASS不是真实专业资格。源码2082dd8及证据归一化e0aab7c已推main；精确e0aab7c主CI41744442502、PG1741744442477、HTTP41744442467、M3协议41744442389全部SUCCESS。HTTP6 PASS/1 Storage缺配置SKIP；CI PG无Storage，本地官方Storage已真实PASS，分开计量。实际JSON/日志标记入同evidence，未改变任何生产HOLD。


## 2026-11-04｜M4永久回执逐候选T7接线（阶段继续）

- BASE main@a7c18dde0bd423b21cad2261cf0ffb146f82f025，fetch/HEAD一致、开工工作树干净。继承M3现成接口，未重做上游。
- 完成只读逐item精确资格核验、总期限/项数限制、错误隔离、Owner选定永久回执缺口查看。Web无Producer凭据，原回执不改，T2—T6 NOT_VERIFIED、整体HOLD及UNKNOWN费用不变。
- 实际PG证明永久Owner回执→M3 scoped current client→精确持久L1/G1→祖先撤权拒绝；同attempt幂等、跨Owner不可见。新路由/期限先RED后GREEN；目标13/13，unit332/4既有实网SKIP，boundary133，types/build/auth/trace PASS，完整PG17 exit0。本批无Storage配置，不冒充官方Storage新实跑；原M3证据继承。
- Ruling: 只核Producer工具链回执，不转换成Agent许可或把Web接到签审服务 — M3现有consumer限制及专业合同约束 — 如不适配仅持续HOLD，不会误放行或收费。
- Fresh review无Critical/Important；minor(deferred)：新接口schema/cost_confidence/checks类型仍可收窄，运行时已严格验证。M4第2/4/5项仅部分接线，完整DAG/T1—T6/混合执行/对账/动作与恢复继续，不签M4准出。
- 回执 `tasks/results/MAB/CODEX_M4_RECEIPTS_20261104.md` 与同名evidence；源码push及实际CI结果取得后追加。无生产写入/私人外发/Provider费用。

- Final fixed: 新增RED→GREEN证明无验证器时T7标NOT_VERIFIED，不误报Gate失效；本地目标13/13、完整unit332/4旧SKIP通过。保留前述类型细化minor，无权限放宽。

- GitHub实际核证：源码98118c05f4dfadccc22a7c503498c3b98a9ecd24已推main；主CI41748751918、PG1741748751920、HTTP41748751905全部SUCCESS。PG包含新MAB_M4_RECEIPT_T7_PASS；HTTP6PASS/1Storage配置缺失SKIP。机器回执与日志摘录已入同evidence。M4仍当前施工，无整体准出或生产启用。

## 2026-11-04｜M4完整收口续建开工

BASE=f8a32c72f1029df2e670937f3b41f0800f27fdcf；fetch后HEAD一致且工作树干净。沿用既有批准任务书，采用subagent-driven-development并行隔离文件施工，原施工账不另建权威树。

| 接口交叉检查 | 生产者→消费者 | 裁定 |
|---|---|---|
| DAG→Studio | 冻结plan/hash/节点和checkpoint准入→现有Studio资产/Production Tool | 只请求既有Tool，不另建Runner；source/digest/当前政策变化必须拒绝恢复 |
| M2/M3→ReceiveCandidate | Owner真实字节/精确定位及独立当前资格→逐item T1—T7 | 服务端权利/专业证明缺失仍HOLD；结构通过不代历史事实 |
| 委托控制→执行接线 | Owner权限、单向撤销、lease/CAS→Studio操作 | 永久回执不改；UNKNOWN费用/不确定执行不得通过恢复清零 |
| 各任务自身范围 | 新独立模块/测试；root统一export/API/PG脚本 | 不共享修改文件，集成顺序在依赖完成后推进 |

Ruling: 当前M4允许完成可运行隔离链，真实第三方/生产验证仍须原明确授权；缺生产授权不反复重做已验M1—M3，也不以模拟双主体宣称M4正式PASS。


### 2026-11-04｜M4完整工程批次实绩与受限条件准出

- 保全额度中断时全部未提交文件，fetch再次核远端main@f8a32c72f1029df2e670937f3b41f0800f27fdcf；续建旧文件，不reset/覆盖。完成DAG/声明、Owner计划服务/API/真实UI、真实T1—T7字节收包、新候选控制迁移/Owner租约/CAS/永久撤销及rollback，复用唯一Runner/Tool和M3资格；无新Dispatcher/Gate。
- 精确计划-委托request/series/asset绑定；按计划过滤的数据库游标分页；半存后从Owner最新私有快照恢复登记，不复活撤销、不覆盖预算/Actor/目标项目。真实HTTP验证丢回执/重开/同root不同委托、恢复、跨Owner拒绝；未知费用和受限资产仍保持原HOLD。
- Task review修复：同lease IN_FLIGHT→HOLD→IN_FLIGHT漏洞，真实PG先RED后GREEN；改用实际专用低权LOGIN验证不能切authority/Producer/Signer。Whole-branch review修复：同root/hash错误委托和旧计划丢入口，补unit/真实PG/HTTP回归。补登记恢复与撤销状态回读；Root客户端无worker lease/checkpoint/Producer凭据。原minor类型细化留账；新Tool注册与UI CI追踪为本批必需接线已补齐。
- 最终本地：unit389 PASS/4既有实网SKIP；boundary133 PASS；六工作区typecheck；真实PG17全套exit0（DAG永久存储/分页恢复、同root精确委托、实际Owner/source/bytes→合成G1→七关、并发/撤权/未知费用/rollback）；真实Next build+Chromium7PASS/1Storage缺配置SKIP。107路由auth无缺口、85API/152动作静态追溯通过。本批无Storage配置，旧官方Storage成功证据继承，不借本批buffer用例冒充新Storage联调。
- Ruling: 未执行节点不伪造output hash；input hash是冻结请求，不代实际Runner grant。CRD是内部信用单位，计划0预算不代表外部模型免费；UNKNOWN费用不补零。候选accept不是知识许可，缺专业/权利权威就HOLD。误判只能造成暂时不可消费，不能放行或产生费用。
- Ruling: M4_CONDITIONAL_EXIT仅上述代码/隔离工程范围；M4-C01正式派工、C02真实混合/外发预算、C03正式恢复/费用核证、C04九动作/13类业务验证固定入PLAN与回执，原完整验收不勾。M5可继续相应私有Studio/Admin/WATCH失败关闭施工；生产/专业许可/费用最终标准不降，M8不得带未关闭条件准出。
- 逐任务核销、失败/修复记录、授权边界见 `tasks/results/MAB/CODEX_M4_CLOSURE_20261104.md` 和同名evidence。真实外部双主体未跑，仍MIXED_NOT_VERIFIED，无生产DDL/角色/开关/Provider调用或私人外发。GitHub源码与实际CI取得后追加，不预写成功。


### 2026-11-04 新窗口前最后实际核对（最高时序）

- git fetch后HEAD=origin/main=64c2402929ff229d32b232cabf4ca8cdbf6d0b89，源码工作树干净；本次仅原位同步接续状态。
- 真实远端：主CI41790309817 SUCCESS，PG1741790310006 SUCCESS；HTTP41790309838 FAILURE（job126441897574，Assert synthetic instance marker and run actual HTTP/browser suite步骤）。不得把本地389/133/PG/Chromium7PASS当远端HTTP通过，也不得用本次文档提交CI代验。
- CLI gh run view --log-failed及--log当前返回空正文；根因尚未定位，不预写角色/权限或业务故障原因。新窗口先获取job日志、定向修复并真实核证该回归。
- 当前M4_REMOTE_HTTP_RECONCILIATION_HOLD，M4受限工程准出提案待远端回归闭合，M5暂不正式进入；其余已验成果/固定生产条件均保留，不回到M1—M3重建。
- 新窗口唯一先读tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md，再依索引读取PLAN/progress/target-diff/CURRENT和CODEX_M4_CLOSURE_20261104.md。


## 2026-11-04｜M4远端HTTP失败定向修复（等待本次push核证）

- 开工HEAD=759dbbd0c206c4acfe2ebdc3e94aa556528b330c，work树干净；显式fetch main后origin/main=256ba6c。原fetch refspec只追踪a001/production，故使用refs/heads/main:refs/remotes/origin/main，不改远端配置、不覆盖旧work分支；在codex/m4-http-reconciliation接续最新main。
- 初次网络调用受命令沙箱阻断；使用受支持network权限重试fetch成功，并通过GitHub插件取得job126441897574完整日志。具体根因：HTTP独立新PG17没有anon/authenticated/service_role；M4迁移第54行REVOKE报role anon does not exist，应用/浏览器尚未执行。不是业务Gate失败，也不是已经通过的PG套件可代验。
- 本地一次性PG17.11先证明三角色不存在、运行旧脚本复现同一迁移/同一错误；修改仅scripts/test-mab-http.mjs，在本地socket及实例标记校验后、迁移前补同test-k3-db的NOLOGIN角色初始化。不改生产DDL/权限、不删除REVOKE、不放宽Cookie/Owner/Gate守卫。
- 实测：CI=true pnpm test:unit为389 PASS/4既有实网SKIP；pnpm test:data-production为133 PASS/0 SKIP；全新PG17真实Next build+HTTP/Chromium为7 PASS/1Storage缺配置SKIP，结束清除一次性数据库。独立review无问题，node语法/diff检查通过。官方Storage本批未配置，不能代称其联调PASS。
- 环境准备实况：默认pnpm11因home写权限失败，改workspace缓存corepack pnpm9.15.4 frozen install；PG容器首次init临时socket路径不一致，重启已初始化的纯合成实例后进入测试，未触碰生产或注入角色掩盖RED。源码实测均记录原始日志。
- Ruling: 此八行测试bootstrap修补不重开M1—M3；M4_REMOTE_HTTP_RECONCILIATION_HOLD保持到本次源码push的HTTP真实成功。M5暂不施工；原M1—M4固定条件/生产/专业/外发/费用HOLD不变。回退本批脚本只恢复测试缺口，不允许回退已有安全REVOKE。


### M4源码本次GitHub核证与M5开工

- 源码df4eeb885680e0caefd25b8429beadafbcc9cacd：主CI41823975350 SUCCESS、实际HTTP41823975358/job126553881524 SUCCESS，下载实际job日志含7 passed/1 skipped和MAB_HTTP_BROWSER_PASS。显式fetch核HEAD=origin/main=df4eeb8，树干净后启动M5。
- 初次push被GitHub GH007邮箱隐私保护拒绝；未改账号隐私，使用该账号既有GitHub noreply身份重新记录尚未发布的本地提交后普通快进push成功，无force。
- Ruling: 关闭的只是M4远端回归阻断；M4-C01—C04和所有上游条件不变，MIXED_NOT_VERIFIED仍保留。PG流水线本次路径未触发，继承64c2402的成功，不假称df4eeb8重跑PG。
- M5首个P0已实证于源码：公开目录/详情/program/share/related/search直接读listPublished，只是运营列表，不是当前资格。六项新路由单测先RED（6/6 FAIL）；准备旧发布pointer无G5真实HTTP负例。本批只补公开消费失败关闭，不启动生产或付费，不另造资格签发权威。


## 2026-11-04｜M5公开作品旁路定向修复（源码push前回执）

- BASE=df4eeb8；M4远端HTTP已真实闭合后推进本计划M5，不重做M1—M4。六公开作品入口直接用listPublished造成未合格正文泄露；新6单测先RED，实际匿名PG/HTTP目录也返回合成秘密正文，失败日志保留。
- 改动：五个/api/public/works路由和/api/search的works分面使用现有listWatchEligible逐请求核同work/revision/consumer；成功/404均no-store。保留原wire及Admin原始运营查询。playwright与HTTP workflow触发范围补新spec/public/search/qualification路径。
- 实测：目标6/6、全unit395 PASS/4既有实网SKIP、boundary133 PASS/0 SKIP，六workspace类型检查通过；Next真实生产构建+PG17/Chromium8 PASS/1官方Storage缺配置SKIP；107路由auth无缺口。独立review无重要问题并独立重跑6单测通过。报告CODEX_M5_PUBLIC_CONSUMERS_20261104.md，RED/GREEN原始日志同名evidence。
- Ruling: 仅复用现有WATCH失败关闭资格入口，绝不为通过正例伪造真实G5 — 当前缺精确L5/rights映射 — 代价是相应历史公开作品被扣留，私有稿件和审计保留。受控单测的allowed/撤权变化不代真实专业链；真实HTTP只证明无G5旧pointer拒绝。
- 下一P0：search的knowledge分面/共享retrieve仍旧audit PASS/current_valid/agent资格，需按现行consumer/purpose/scope与祖先撤权另做真实回归；私有preview未取正文及改稿CAS分离读写也待修。M5整体/九动作/13类及真实G5/rights仍HOLD。
- 所有M1—M4固定条件/生产/外发/费用HOLD继承；无生产写入或模型调用。回退关闭新公开入口，不得恢复运营pointer公开旁路。源码SHA及GitHub实际结果取得后追加。


### M5首批源码GitHub实际核证与清理

源码eb9ee3ed8b3957e85495e73937ca39a71cfe12e9已普通快进推main：主CI41824906758 SUCCESS，实际PG17/HTTP/Chromium41824906796/job126557036216 SUCCESS；下载实际日志确认8 passed/1 skipped、MAB_HTTP_BROWSER_PASS及一次性数据库清除。未触发独立PG全套，不冒充已重跑；本次HTTP确有新旧pointer无G5负例通过。已核本地临时HTTP数据库0残留，并移除本次合成PG容器；无生产/费用操作。证据SHA256清单、实际run JSON与日志摘录入同evidence。

本次收尾仅文档/机器回执，不把未来文档SHA称已跑本轮HTTP；对应业务源码始终指eb9ee3e。当前M5继续/HANDOFF_NOT_READY，下一P0及未覆盖在本批回执，M1—M4固定条件保持。保留本地旧work分支，不reset、不强推、不覆盖远端成果。


## 2026-11-04｜M5共享检索当前资格与缓存收口开工

- fetch main=247bee074ba07317afe25f09543ac53c45efc40b，HEAD一致，开工工作树干净。继承M4闭合与M5首批，不重建上游。
- 根因：retrieve八分支只读gate_audits PASS/current_valid/agent，不调用现行qualification_allows；所有现有调用缺服务端purpose/scope；mohen/materials另有5分钟材料缓存。
- 新单测旧代码实跑7 FAIL/1 PASS，缓存撤权负例FAIL；真实标记PG新入口先RED（缺context竟返回degraded=false）。HTTP旧agent PASS泄露负例正在实跑；测试仅纯合成一次性库，不读写生产。
- Ruling: 复用read-model现行非空context守卫及qualification_allows；上下文仅来自可信服务器配置，API不接受body/query自授用途/范围。公共搜索/现有Agent缺合法映射时degraded=true/空，不默认全局agent许可 — 原HP07/HP12失败关闭合同 — 代价是相关分面暂不可用，不能为了恢复旧可见性绕过资格。
- 先补共享资格/去缓存与真实祖先撤销正反验证，再按原M5修私有preview/CAS；无新生产/专业/外发/费用授权。


### M5共享检索本地实绩与源码提交

八分支改用qualification_current/qualification_allows及现有非空context守卫；公共输入不授资格，缺合法映射degraded。materials/ask材料衍生缓存移除，no-store，explore同样禁缓存。先RED：7项context/SQL失败、materials与ask缓存各失败、真实PG缺context失败、真实HTTP旧agent PASS泄露；后GREEN：405 unit/4旧SKIP、133boundary/0SKIP、六workspace类型、全PG17exit0、Next+HTTP9PASS/1Storage缺配置SKIP。新增实际TS检索在同一G0—G5真实SQL链前后运行，精确consumer/purpose/scope与祖先撤销断言通过。

独立review无重要问题并重跑10项通过；真实PG正例仅story_seed，其它分支结构覆盖，不泛签所有专业对象。缺正式scope/purpose映射的公共/Agent仍HOLD。ask正式启用必须有既有ledger/预算，移除缓存不授权更多费用；本批无Provider或生产操作。报告CODEX_M5_RETRIEVE_20261104.md及原始evidence。回退关闭入口不恢复旧PASS/缓存。下一原M5：私有preview正文与改稿CAS；源码push与实际CI另补。


### M5共享检索GitHub核证

精确源码4f57421608d763b6e412a85cf1625294525f0e15已推main，主CI41826797550、隔离PG1741826797881、HTTP41826797505全部SUCCESS。实际HTTP日志9PASS/1Storage缺配置SKIP，PG全套包含新增当前资格检索/祖先撤销。原始run JSON/HTTP摘录入同evidence。

## 2026-11-04｜M5私有预览/改稿CAS与实际CI时限失败收口

- BASE=4f57421，已继承上述GitHub三成功；先用真实HTTP复现preview空正文、八并发叙述改稿1成功/3冲突/4个500唯一键异常，新4单测也先RED。getLatestRevision漏content，预览String(native-jsonb)也错误；改稿read-check-plain-insert并非原子CAS。
- 修改只补原位：查真实content并用统一JSON解码；损坏JSON报503不造空成功；reviseBeat/reorderBeats共享INSERT expected-head谓词+唯一(work_id,revision_no)冲突仲裁，RETURNING才确认成功，竞争失败返回当前revision冲突；不覆盖原修订，不改wire/Owner守卫，无新正文库或生产DDL。
- 实测私有Next/PG/Chromium已11PASS/1StorageSKIP，含私有正文、跨Owner拒绝、八并发1成功7冲突、同rev重复提交与重排；首个构建发现PgRow辅助函数参数类型不匹配，已修为Record<string,unknown>且后续真实构建通过，保留失败日志。
- 发现旧文档SHA247bee0的CI41825365579/job126558624358实际失败：共享deadline测试预期1callback实际2，不能借更早SUCCESS掩盖。新冻结Date.now但推进定时器的确定性负例真实复现；sticky timedOut统一全批停止，T7也进入共享定时器，final sweep撤回已过期accept。review补出先前accept和T7/最大10000ms的两个路径，均先RED后GREEN，最终17目标测试通过。不是放宽时间/去掉断言。
- 最终全unit417PASS/4旧实网SKIP、boundary133/0SKIP、六workspace类型及auth107路由无缺口；独立review对CAS/预览无问题，deadline后续修复复跑17项通过。最后PG/HTTP整批复验与源码push实际CI取得后追加。
- 所有生产/专业G5/外发/费用HOLD不变；无Provider调用。回退可关闭相应写/读入口，不能恢复假保存或过期候选accept；原作品/审计保留。M5未准出，导演计划初始保存及fork/restore等其它版本写入口的幂等/并发、精确G5/rights和九动作/13类型全验收仍待续建，不能以本批改稿CAS泛签所有写入口。


最终本地集成回执：同一最终源码417单测PASS/4旧SKIP、133边界PASS、六workspace类型/107路由auth通过；完整PG17exit0，真实Next+HTTP11PASS/1StorageSKIP。最后PG/HTTP已在deadline审查修复后重跑，非复用修复前日志。源码push前diff检查通过；正式生产和M阶段整体状态保持上述边界。


### M5私有修订/共享时限源码实际GitHub核证

源码e5a3a5b035833e70f07d928695401920ebaadee3：主CI41828369677、独立PG1741828369318、真实HTTP41828369462全部SUCCESS；实际job126568860354日志11PASS/1StorageSKIP，MAB_HTTP_BROWSER_PASS与数据库清除标记存在。最后fetch核HEAD=origin/main=e5a3a5b，树干净。旧247bee0的CI失败保留并由本批确定性deadline回归修复，不改写成旧SHA成功。

本地最后两条集成脚本已清理全部mohen_k3_*_test数据库（查询0），本批合成PG容器已移除。源码之外此次只补文档/回执；未来文档SHA不冒称运行过上述HTTP。证据清单按Git暂存blob字节计算SHA256（避免日志CRLF入库规范化造成本地字节hash与仓库不同），各批机器回执与真实失败/成功日志均保留。

下一步严格原M5：导演方案初始保存及fork/restore等其它版本写入口的幂等/CAS/来源归属，同WorkRevision链及专业G5/rights映射与ST九动作/13类型；本批未签这些未覆盖能力。M5/HANDOFF_NOT_READY与上游所有固定生产条件保持，无生产数据/开关操作，无私人外发/费用。


## 2026-11-04｜M5导演修订CAS与fork/restore来源归属施工（ChatGPT GitHub接续）

- **既定计划不变**：仅实施M5/HP10—12局部风险修复；不调整M0—M8或MHKA/KAD6的任务、语义、Gate准出标准，延续已签M1—M4的受限工程成果。
- 源码及测试提交：`19ff534c`导演选定方案同Owner/快照/不可变CAS/显式冲突与内容幂等；`4d5c05e`校正新旧测试桩（首个`19ff534c`的主CI41836288891确实FAIL）；`c8379b0` fork/restore历史精确来源、native JSONB序列化、单SQL CAS和可选operation_id幂等。完整差异与回滚见`tasks/results/MAB/CHATGPT_M5_REVISION_CAS_20261104.md`。
- GitHub真实回执：`4d5c05e` CI41836604791 **SUCCESS**；`c8379b0` CI41837221858 **SUCCESS**、隔离HTTP41837221734 **SUCCESS**。新fork/restore的真实PG竞态专项用例未覆盖，不泛签完全E2E或M5准出。
- 同日只读实际生产检查：仍只有5条MAB已登记迁移，Storage桶0、私有原件表0、正式Gate LOGIN角色0、当前资格0、Studio项目0、会话撤销字段0。全部M1-C01—C04、M2-C01—C03及M3/M4生产/专业/外发/费用条件继续按原计划保留；本批无生产写入/迁移/费用。
- 下一任务：M5其余版本写入口真正PG并发与请求重放E2E、同WorkRevision与专业G5/rights逐消费者映射、ST-01—09/13类业务；再按M6—M8完整验证。**状态 M5_CODE_AND_CI_PARTIAL_PASS / M5_LIVE_HOLD / HANDOFF_NOT_READY**。


### M5 fork/restore专项真实PG/Chromium回归收口（2026-11-04）

- 在`c8379b0`的源码/单测成功后，提交`08fa04e7778481c0e0ac88cd0053fa7b1dd01aad`，于**现有**Playwright MAB suite新增一次性真实PG fork/restore并发8请求仅一个200、其它409、同operation_id重试不重复、历史revision精确来源恢复、错source和跨Owner拒绝。
- SHA精确主CI [41838116485](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41838116485) **SUCCESS**，隔离HTTP [41838116408](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41838116408) **SUCCESS**；job 126602232916原始日志`12 passed / 1 skipped`、新`real PG: concurrent forks...` PASS、合成数据库已清除。Storage配置缺失的SKIP照旧保留。
- 裁定：本项`M5_FORK_RESTORE_VERIFIED_ISOLATED`；不签M5阶段EXIT_PASS，不新增权限或生产正式写入。原M1—M4生产与Gate/外发/费用固定条件全保留。详见`tasks/results/MAB/CHATGPT_M5_REVISION_CAS_20261104.md`第4节。


### 2026-11-04｜M5导演首次保存真实PG验收——既有PLAN局部子项核销

- GitHub main源码`608ff72fe9d2c141b1ca5a4bc49c804e5c8a6b74`修复回执丢失时的导演提交幂等，保留精确Owner／方案来源及唯一revision竞争；未改变产品方向、MHKA／KAD6／MAB阶段顺序。
- [主CI41841366673](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41841366673) **SUCCESS**；[隔离PG17/Chromium41841366704](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41841366704) **SUCCESS**。Job126613506876明确新增导演并发/跨Owner/回执重试用例 PASS，整体13PASS/1StorageSKIP、合成数据库清理完成。8个不同方案一个200、七个409；相同方案原expected头重试返回相同revision。
- 专项`M5_DIRECTOR_REVISION_VERIFIED_ISOLATED`；现有fork/restore已验证结果继承。真实史料/独立G5/正式发布/Owner体验/上游M1—M4生产条件均未因此通过，M5整体仍HOLD、HANDOFF_NOT_READY。详细回执沿用`tasks/results/MAB/CHATGPT_M5_REVISION_CAS_20261104.md`第5节，目标差异账按行补充。
- 下一优先仍是原M5/HP07/HP10—12：`work_revision↔L5@revision↔current G5↔purpose/consumer/rights`具名合法映射与授权消费者逐请求核查；ST-01—09及13类资产实际业务正反验收。若专业映射仍无可核实权威类型/Review部署，维持HOLD、不自授资格，不重做已过隔离PG子项。


## 2026-11-05｜M5 HP07/HP11/HP12 GitHub归档与Owner转Codex接续（仅只读审查，不是代码准出）

- **Owner指令**：将ChatGPT上一轮审查成果原位写入GitHub并交给Codex持续施工。承接既有MAB M0—M8和MHKA/KAD6，不修改施工顺序或发布标准，不新设任务树。
- **已写入成果**：`tasks/results/MAB/M5_HP07_HP11_HP12_READONLY_AUDIT_20261104.md`；`tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md`置顶最新接续点。只读审查源仓库为`main@edce77451fba459b9027192923d9a8faa5e38a29`；该源HEAD的[CI41842068185](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41842068185) SUCCESS。写入这些文件仅是文档归档，不增加程序功能。
- **应继承、不要重复**：`608ff72f`导演CAS/同Owner/回执重试主CI[41841366673](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41841366673)及隔离PG/Chromium[41841366704](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41841366704) SUCCESS（13PASS/1StorageSKIP）；此前`08fa04e` fork/restore隔离PG/Chromium[41838116408](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41838116408) SUCCESS。以上均局部`VERIFIED_ISOLATED`，不能伪称正式专业G5、13类资产或M5整体PASS。
- **实查不足**：作品→六类L5不可变修订→独立G5当前资格→精确consumer/purpose/scope/rights缺可信权威映射；`work-publish-qualification.ts`按原规则正确拒绝；10类通用私有候选和3类规范正文的源码分流已有，13种真实PG矩阵没有完成；`public.assets`图片台账仍非完整13类历史知识管理。安全写入检查曾阻断上一轮源码/测试提交，该部分`NOT_COMMITTED/NOT_RUN`，不能写PASS。
- **Codex下一施工顺序**：从最新`origin/main`核CI/工作树→在现行独立G5与M3验证器上接合法WorkRevision/L5精确映射及WATCH、visual_stage、agent、evidence_on_demand四消费者逐请求验证→实际一次性PG/HTTP覆盖13类资产10私有+3规范拒绝和ST-01—09→Admin来源、版本、权利、使用事件可核查的具体知识条目后台→原M6—M8。每项真实源码SHA/正反证据与回滚继续写入`progress.md`和`target-diff.csv`。
- **判定**：`M5_OVERALL_HOLD / M1_M4_PRODUCTION_CONDITIONS_HOLD / TECHNICAL_HANDOFF_NOT_READY`。这是Owner授权Codex继续执行，不意味着全部M1—M8正式准出；未获授权不做生产迁移、Gate签发、原件外发或外部付费。

## 2026-11-05｜M5精确作品G5桥／13类持久矩阵／Admin历史／ST08—09（本批在核证）

- BASE实时origin/main=a38190ac5526beea154b2b85edcc2b8a61bb0a25；本地旧work@759dbbd干净且保留，默认fetch旧refspec失败后显式fetch main成功，从最新main施工，无覆盖新成果。
- 最新主CI41929766191 FAILURE实际为assessment定时器到期仍可能第二次查询。冻结墙钟RED→sticky timedOut GREEN，未重做既有导演CAS/fork/restore；集成套件沿用它们。
- 只读WorkRevision→真实L5/current G5桥：既有独立签审receipt绑定完整持久content SHA256、work/rev、title/description、用途/消费者/精确scope、动作/期限；原policy必须要求整稿与权利checks，作者ref和作品审核不授G。无新表/正文/Gate/Signer或生产context配置。
- 13类真实PG/HTTP私有持久矩阵（十类修订/来源依赖/Owner/rights unknown，三类规范对象通用拒写）、Admin选定历史版本及对应use_events、WATCH真实HTTP和ST08/ST09业务新增。完整结果与实际源码SHA/Actions取得后追加；未完成项不提前PASS。详见tasks/results/MAB/CODEX_M5_BINDING_ASSETS_20261105.md。
- Ruling：复用原独立G5审计的被签收receipt作为可信整稿绑定，不让作者自报ref授资格，也不形成未来audit UUID循环摘要；缺专业/当前权利时继续HOLD，代价为暂不公开，无额外外发/费用。
- 独立review无Critical/Important；minor保留三个其它消费者真实HTTP、其余五种L5逐类绑定。10+3为持久矩阵，非13类专业业务PASS；反馈同意撤回、合法解引用/跨题复用、canonical媒资、ST01—04与完整19组件仍须业务实证。M4-C04和全部上游生产/专业/外发/费用条件不变，M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。

- 本批源码已提交`ff5283ea8a719f69d37eee4ff4e8a1d4c5e4738e`；最终本地432单测PASS/4原SKIP、133边界、六工作区类型、PG17全套exit0、Next构建/Chromium15PASS/1官方Storage缺配置SKIP；ST08/ST09和Admin选定历史0/1事件已真实HTTP通过。完整证据见本批回执§5.1；远端Actions结果尚待追加，M5整体HOLD不变。

- 第一源码`ff5283e`远端PG41932575876、HTTP41932576000 SUCCESS（15PASS/1StorageSKIP）；主CI41932575992 FAILURE只在74目标审计。根因是本批policy已适配而旧差异账仍SHA256_BYTES_MATCHED，分开提交造成声明滞后；本地已原位改ADAPTED，不改冻结目标/guard，errors=[]。失败保留，待新提交CI关闭；继续独立六L5/媒体/应用wrapper实测，不把既有PG/story_seed成功扩大。

### 本轮原M5独立补证继续（不是新阶段）

沿原HP07/HP12继续补齐六类L5×四消费者真实PG绑定/物理fingerprint变化拒绝/祖先撤销、签审整稿媒体clear/license/expiry正反、实际应用wrapper真实PG（不是同名测试替身）和出版WATCH资格；最终全PG17exit0，HTTP因共享fixture变化已重新15PASS/1StorageSKIP。生产reader/Gate/策略无新增修改。原review的六类PG覆盖minor关闭；其它三消费者各自HTTP、13类专业业务/同意撤回/合法复用/canonical媒资、ST01—04/19组件和生产条件保留。回执§6及新原始日志为准。审计差异账修正与新测试将随同提交，实际新SHA/Actions另补，first-source主CI失败不抹掉。

- 补证与差异账修正已推main@3929d9df7496fc883c684304f19c1908977b7982；三条精确运行：主CI41933637116、PG41933636834、HTTP41933636716，当前SUCCESS_VERIFIED_3929D9D。六L5/媒体/真实应用wrapper最终本地PG全套及HTTP15PASS/1StorageSKIP证据已提交，原711 legacy未变，临时库计数0并已清容器。原first-source CI失败保留，最终远端结果取得后本条追加关闭状态；M5整体与原生产条件不变。

### 2026-11-05 本轮最高时序：GitHub核证完成，仍原M5

- 业务源码ff5283ea8a719f69d37eee4ff4e8a1d4c5e4738e；补证/差异账修正3929d9df7496fc883c684304f19c1908977b7982普通快进落main。**3929d9d主CI41933637116、PG17 41933636834、HTTP41933636716全部SUCCESS**；实际下载日志确认六L5/四消费者应用wrapper/媒体正反、ST08/ST09、WATCH祖先撤销与Admin精确历史。HTTP15PASS/1Storage缺配置SKIP；unit432/4既有SKIP、boundary133、六workspace类型/构建/auth107/85API与152动作追溯通过。
- 只关闭first-source CI41932575992的旧byte-equal声明审计失败与本批具名隔离子项；旧main41929766191超时失败由sticky timer RED→GREEN修复。两旧失败保留，不拿后续成功改写它们。74目标M0冻结列与53REVISE+21CREATE分母保留、最终语义74仍未全核销。
- 六类L5PG覆盖minor已追加实测关闭；其它三消费者各自产品HTTP仍未验。10+3不是13类专业业务/同意撤回/合法解引用复用/canonical媒资PASS；ST01—04/H1/H2/H3/19组件及真实混合未全验。M1-C01—C04/M2-C01—C03/M3-C01—C03/M4-C01—C04及生产/外发/费用/专业Reviewer全部原条件继续，**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY**。
- 本地标记测试库0且已删除本会话合成PG容器；无生产/正式Gate/context启用。回执CODEX_M5_BINDING_ASSETS_20261105.md §6.2和同evidence保存精确SHA/成功与失败Actions/PG/HTTP/原始日志hash；回滚为关闭context/恢复资格拒绝并保全审计，不恢复legacy旁路。


## 2026-11-05｜M5三个实际L5产品HTTP入口接续（源码1cd8544）

已fetch核main@ca0a790并继承四条指定成功CI；本批修Evidence消费者错配、Agent服务端read上下文与visual display/no-store，唯一qualification_allows及既有整稿桥不变。最终本地438单测/4旧SKIP、133边界、六workspace类型、完整PG17/711旧审计/回滚通过，Next+Chromium16PASS/1StorageSKIP；三消费者逐实际入口purpose/scope/consumer/action/expiry/revision/ancestor/cache/service恢复正反通过。失败原始日志保留，独立review无重要问题。仅VERIFIED_ISOLATED；action scope不代独立版权回执撤回，原整稿四消费者PG不扩写为新整稿HTTP。详见tasks/results/MAB/CODEX_M5_PRODUCT_CONSUMERS_20261105.md与同名evidence，远端CI待追加。

M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY；下一仍原M5 ST01—04/13类专业/同意撤回/合法复用/canonical媒资/H1-H3与19组件。云端可施工项继续由Codex做；本次环境已可运行PG/HTTP，不将网络Docker问题登记DEFERRED_ENV。正式生产/专业/外发/费用及M7/M8原条件不变。


## 2026-11-05｜M5 ST01自然语言委托HOLD业务（源码876ff39）

原位修复缺Provider/来源/资格/账本时的首工具前HOLD、任务持久化、零费恢复CAS、Studio可见原因；来源运行降级保留有限结果但不得research_done。公开Agent改专门server context，不借内部研究context。最终444单测/4旧SKIP、类型通过，真实Next/Chromium17PASS/1StorageSKIP，含自然语言输入→API→持久HOLD→可见暂停→Owner恢复/跨人拒绝；无生产或外部调用。详见tasks/results/MAB/CODEX_M5_RESEARCH_HOLD_20261105.md。仅ST01负/恢复分支VERIFIED_ISOLATED，不签ST01—04全链或混合研究完成。

前批3873256主CI41940583300、PG41940583316、HTTP41940583384全SUCCESS，实际HTTP16PASS/1StorageSKIP已核。当前M5继续13类专业/consented_feedback及真正研究创作链，M6未全量准出，M7/M8与所有原固定生产/专业/外发/费用条件不变。


## 2026-11-05｜M5 ChatGPT接续：PG恢复回归与私有资产禁缓存

- 现场源 `main@1bef80b7`：主CI41941909931 SUCCESS、HTTP41941909867 SUCCESS，但PG1741941909920 FAILURE，实际失败为research-resume.integration.ts并发恢复测试仍返回mock `degraded:true`，与新业务“降级只能HOLD”相冲突。原失败保留。
- 定向修复 `935a1e1e`：成功路径夹具改非降级，并新增真实PG测试的降级HOLD、零费、不得research_done负例；**不调整runResearch/恢复制程、Gate或费用标准**。该提交主CI41945060178 SUCCESS，隔离PG1741945060135 SUCCESS，job126975088981证实research-resume 4/4、MAB_RESEARCH_RESUME_PG_PASS、K3_DB_TEST_PASS及711旧合成记录不变。
- M5/HP11补充 `243ac2ab` 与 `9d7b1c4c`：Studio私有资产/修订/历史读取及保存返回显式no-store，新增401/404/503与成功路径单测；主CI41945285925 SUCCESS，job126975860823证实445单测PASS/4既有联网SKIP、133生产边界PASS、Next Build和74目标审计errors=[]。仅原位API/单测，不触及生产数据/DDL/Storage/专业资格。
- 逐文件记录、失败根因与回滚：`tasks/results/MAB/CHATGPT_M5_RESUME_CACHE_20261105.md`。本批是M5/HP10与HP11的定向缺口，并非新M阶段；保留74目标原差异账和全部旧证据。以上PG/主CI仅为对应定向子项VERIFIED_ISOLATED，非生产网站实测；M5整体、ST01—04完整正链、13类专业语义/反馈撤回/合法复用/canonical媒资及所有M1—M4生产固定条件继续HOLD。无生产环境写入、模型调用或费用。


### 2026-11-05｜M5/HP11追加真实Chromium私有资产缓存验证

在原已实测主CI/PG子项基础上，定向补非对象JSON 400应no-store的实际漏口（`b063876a`）、相应单测（`3ae28f18`）及现有`mab-notebook.spec.ts`真实双Owner HTTP正反断言（`9f3af8b1`）。测试沿用现有一次性隔离PG17+Chromium，不新造权限/Gate/存储/任务书。源码`9f3af8b1`已触发主CI41945997957与HTTP41945997916，待核结果前本子项标CI_PENDING；精确测试及回滚见`tasks/results/MAB/CHATGPT_M5_RESUME_CACHE_20261105.md`§4。原M5/所有正式条件HOLD不变。


### 2026-11-05｜M5/HP01、HP10、HP11定向闭环：真实PG17、HTTP和测试语法早防

- 新HTTP回归`9f3af8b1`旧run41945997916 **FAILURE**（Playwright解析测试文件76行少右括号，非接口失败）；`af074521`精确补括号，**主CI41946337981 SUCCESS、真实隔离PG17+Chromium41946337974 SUCCESS**。HTTP job126979363687：17PASS/1官方Storage无配置SKIP，`MAB_HTTP_BROWSER_PASS`，合成数据库清理；包含Studio本人保存/列表/历史与跨Owner拒绝操作的显式no-store真实HTTP断言，13类资产和Admin隔离业务既有标记无回退。
- HP01在`abff4e4d`向原主CI加入无DB/浏览器的Playwright HTTP规格`--list`语法预检；新主CI41946517684 **SUCCESS**，job126979974001：6测试文件18用例可收集、445单测PASS/4旧联网SKIP、133边界PASS、Next Build和目标审计errors=[]。该关仅防测试文件语法漏，不计作HTTP验收。
- 之前`935a1e1e`研究恢复PG1741945060135 SUCCESS、`9d7b1c4c`私有资产主CI41945285925 SUCCESS保留。精确源码、失败历史、PASS/NEG/回退在`tasks/results/MAB/CHATGPT_M5_RESUME_CACHE_20261105.md`§1—5。本轮仅M5/HP01、HP10、HP11的**VERIFIED_ISOLATED子项**，不签M5整体或专业/生产/外发/收费/13类业务、真实跨题复用与M6—M8。原M1—M4固定条件、当前真实Gate与原件Storage仍HOLD。
