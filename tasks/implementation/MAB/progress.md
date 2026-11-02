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
