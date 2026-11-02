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
- **原需求**：M2_PRIVATE_ORIGINAL_GITHUB_CODE_READY / M2_PRIVATE_ORIGINAL_VERIFIED_ISOLATED；74目标中附件路径及统一访问入口已原位补证，但不把整个路径的CODE_PRESENT升为目标全量PASS。两座证据桥与LIVE准出仍HOLD。
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
