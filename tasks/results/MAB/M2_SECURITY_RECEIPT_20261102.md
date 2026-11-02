# MAB-ENG-01｜本批实际测试与安全回执

日期：2026-11-02。**这是批次证据，不是整个M2或M0—M8准出。** 唯一施工账仍为[progress.md](../../implementation/MAB/progress.md)，总计划仍为[PLAN.md](../../implementation/MAB/PLAN.md)。

## 交付与实际CI

| 批次 | 已推送main | GitHub实际结果 |
|---|---|---|
| 修复交接时5项路由单测失败 | `7e83f3b9f05643c310ee0524808b0f364913efaa` | [41460853487](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41460853487) SUCCESS |
| 原件真实隔离闭环、权限、恢复、资源限制 | `4b75c7a2d4911952048c2d8cb3115d107425dcc1` | [41465083552](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41465083552) SUCCESS |
| 两座私有文本证据桥、准确主张修订、独立字节核验凭据 | `cf1c3ed61babd92179c886ebbebf36afcc3c159b` | [41469702928](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41469702928) SUCCESS |

CI检查包含源码类型、无DB单测、生产边界、85 API/152动作追溯、Next生产构建和鉴权静态门；它不运行本地真实PG/Storage整套，也不代替Owner验收。未逐提交人工部署或体验核验Vercel。

## 实际测试

- **单测：109 PASS / 4既有联网SKIP**。最新补停滞上传408与不支持文件类型拒绝的资源回归；109是本地实际运行结果，追加该测试前的代码CI为107 PASS/4 SKIP。命令：`CI=true node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts`。
- **生产边界：73 PASS**。命令：`node --test --experimental-test-isolation=none tests/data-production/*.test.mjs`。
- **类型与构建：通过**。六工作区tsc；新增正反consumer类型覆盖；Next生产构建。CI Node22/pnpm9.15.4；本地Node24.19/锁定node_modules，未改锁文件。
- **真实数据库：通过**。PostgreSQL17.11，明确`codex-k3-isolated`标记、Unix socket、每次新建合成库；public与extensions两种pgcrypto位置。命令：配置`MOHEN_TEST_PSQL`、`MOHEN_TEST_SOCKET`和可选`MOHEN_TEST_STORAGE_CONFIG`后运行`node scripts/test-k3-db.mjs`。
- **真实Storage：通过**。官方Supabase Storage `v1.43.0`，localhost文件后端，独立合成私有bucket与密钥。真实HTTP覆盖上传、认证回读、HTTP400/正文404、无覆盖、匿名公有/认证URL拒绝、篡改拒绝。版本协议验证不冒充当前托管服务的LIVE验证。环境复现入口：`scripts/serve-mab-storage-isolated.mjs`，准备命令及固定上游lock哈希见施工账。
- **真实浏览器/HTTP：2 PASS**。Next生产构建→隔离库→Chromium：研究记录保存/修订/刷新/重试/跨Owner；原件multipart上传→同key重试→同hash下载→另一账户拒绝→声明和内容冲突拒绝。命令：上述隔离环境下运行`node scripts/test-mab-http.mjs`。无生产测试账户或资料，无付费模型调用。

实际输出摘录：[PG+Storage+桥接](evidence/M2_PG_Storage_bridges_20261102.txt)、[extensions布局](evidence/M2_PG_extensions_20261102.txt)、[Chromium](evidence/M2_Chromium_20261102.txt)、[单测](evidence/M2_unit_20261102.txt)。默认`pnpm test`的旧本地`.env.local`前置仍未满足，未声明默认全套PASS。

## 安全与失败回执

| 检查 | 已观察的行为 |
|---|---|
| Owner/匿名/跨账户/禁用/过期/伪造 | 匿名或不合法身份拒绝；A不能读写B项目或原件；连接池无身份残留 |
| 原件完整性 | 服务端真实回读SHA-256/长度；对象不可覆盖；错hash/篡改/缺对象拒绝 |
| 幂等与失败恢复 | 写成功但ACK丢失可回读恢复；DB最终提交失败保留PENDING、不留半资产；同key不同内容拒绝；并发只得一个准确修订 |
| 撤权 | 下载期间撤权不返回字节；最终保存回执前身份撤销则事务回滚；封存项目拒绝 |
| 请求资源 | 有界流读取；超量在multipart解析前413；停滞408；异源浏览器POST403；拒绝不支持MIME；成功/失败no-store |
| 原件/资产历史 | STORED_VERIFIED不可退回PENDING、原件元数据不可改；准确同asset/source_anchor/project/hash绑定 |
| 证据定位 | 真实中文UTF8字节范围；错引文、断字符、错版本/raw/read_run/unit拒绝；主张引用准确revision而不是“最新”或第一条材料 |
| SQL绕过 | 独立审查指出初版通用runtime可绕过JS。已真实失败重现并修复：独立30秒HMAC核验，绑定Actor/项目/原件/hash/证据/单元/定位/引文/序号；无凭据的低权限SQL直调及错范围/过期/缺exp拒绝 |
| 密钥隔离 | 字节核验key与登录、DB会话、Storage key分离；runtime不能读key表；撤销key阻断新绑定；仅合成环境provision |
| 正式知识边界 | 新连接仅private_research_candidate/UNASSESSED；不授任何G PASS、不开放公众，不伪造Reviewer身份 |
| 恢复与回滚 | 同backup_id字节/hash/元数据/DB dump，实际pg_restore；准确revision与ARCHIVED保留，恢复库清除旧会话key，旧token拒绝；rollback仅撤新入口权限，历史连接/收据hash不变 |

审查方式：独立静态审查提出的重要SQL边界问题，已通过新增真实直调负测RED→GREEN关闭；其他检查为工程执行的实际测试，并非Owner体验签收。

## 真实生产状态与剩余HOLD

生产只读复核：尚无`studio.private_originals`、Storage桶0；98条旧原件中93条memory指针，5条仓库图片的实际字节hash匹配；全部仍非已验证的私有对象。[98条逐项回执](M2_legacy_original_audit_20261102.csv)。旧`/uploads/`登记计数0，不据此宣称所有历史部署/缓存都无遗留，也未删除旧资产。

两份候选迁移`20261102140000_mab_m2_private_originals.sql`、`20261102145410_mab_m2_evidence_bridge.sql`尚未生产执行；私有桶、服务凭据、独立核验key及受控LIVE验证待生产准备授权。上传开关保持关闭。

D00—D03实际worker接线、PDF页码/图像区域读取、正式G1/G2/G3与真实Reviewer、公众消费的当前资格/准确修订过滤、Owner体验验收仍HOLD。M3生产资格守卫/策略/Reviewer绑定表尚不存在，不能由本批测试制造正式资格。继续原M0—M8，无新并行任务体系。
