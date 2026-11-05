# M5 / HP07 / HP12：三个消费者实际产品HTTP接续

日期：2026-11-05（北京时间）。BASE `ca0a7909556369faebcdd10eae3e43addd334b72`；本批源码 `6696ab1a42597da46a929d63dcacbcb800a0e8ab`。仅 VERIFIED_ISOLATED，M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。

## 实际完成与边界

- 已实际 fetch main；旧 work@759dbbd 原样保留。初次沙箱代理连接失败，使用受支持执行权限后普通 fetch 成功；GitHub API独立确认main@ca0a790。四条指定Actions 41933637116、41933636834、41933636716、41934377243均completed/success，精确SHA分别3929d9d/ca0a790。
- `GET /api/explore/spatial` → 真实 read-model-bridge → PG 当前独立G5：visual_stage/display；补no-store。`POST /api/mohen/materials` → 真实retrieveMaterials：服务端agent/read上下文，忽略请求内资格；未配置仍降级。`GET /api/public/evidence/:id` → 原read-model-repository：修复误用visual_stage为evidence_on_demand/quote，旧错消费者配置失败关闭。
- scope必须显式包含对应requested_action，实际SQL复用唯一qualification_allows与物理修订/祖先闭包；没有新Gate、签审器、知识正文、生产context或生产DDL。
- 每个实际HTTP入口均有正例以及错purpose、project scope、consumer、action scope、到期、物理修订、祖先撤权、同请求缓存失效、资格表不可用及恢复后重查。服务不可用通过标记测试库临时重命名qualification_current触发，finally恢复。原WorkRevision四消费者PG/应用wrapper/媒体许可测试完整继承。
- 这三个是实际L5业务入口，**不是三条整稿WorkRevision HTTP授权证明**。错work/revision/整稿hash/独立rights_by_action等继承原真实PG证据，不扩写成新HTTP覆盖。action scope反例不等于独立版权回执撤回；真实locator合法解引用/媒体权利业务与13类专业闭环仍HOLD。

## 测试与失败

- Evidence单测2 FAIL→GREEN；Agent服务端接线1 FAIL→GREEN；操作范围3 FAIL→GREEN、视觉操作1 FAIL→GREEN。18项定向测试通过。
- 最终CI=true单测438 PASS/4原实网SKIP；首次未设CI触发Commons实网测试1 FAIL（网络不可达），原始日志保留；不改旧实网测试或冒称通过。
- 完整PG17 `K3_DB_TEST_PASS`，六L5×四消费者/应用wrapper/媒体、711旧审计保全、重复迁移及回滚失败关闭均通过。
- 完整Next生产构建＋Chromium最终16 PASS/1官方Storage缺配置SKIP；三条MAB_PRODUCT_CONSUMER_HTTP_PASS及数据库清理标记存在。HTTP首轮14PASS/2FAIL/1SKIP，其中视觉no-store为实际缺陷；WATCH为新fixture server scope加入操作后与既有整稿binding精确scope不匹配，修正隔离配置保留WATCH原scope。次轮15PASS/1FAIL/1SKIP是旧负例把“有合法服务配置但无匹配条目”错误断言为degraded；改为ok/空材料，旧PASS仍不得泄漏。失败日志均保留。
- 六workspace类型全部通过；133边界PASS/0SKIP；auth107缺口0；85API/152动作静态追溯与74目标审计errors=[]。静态追溯不代M6逐ID运行。
- 独立review无Critical/Important，重跑18定向测试通过；minor为action反例只证明动作scope拒绝，非独立权利回执撤回；本报告已限定声明。review未独立重跑HTTP，不虚称双人HTTP实测。

## 余项、分工及回滚

M5继续：ST01—04实际自然语言研究/长期资产/导演链；13类字段语义、合法解引用、跨项目复用、consented_feedback同意撤回、canonical媒资；完整H1/H2/H3/19组件及逐ID验收仍由Codex继续，不能整体转给CodeBuddy。M5未准出，M6仅静态准备未全量验收，M7真实双课题受原件/Provider/正式专业G和授权阻断，M8禁止提前生产操作。

本地资料准备/OCR/GIS/原件哈希与受控上传/本地备份演练等只有实际证实依赖本地时按原progress登记DEFERRED_ENV；本批Docker/网络已恢复，不列DEFERRED_ENV。正式PG/Storage迁移、独立Reviewer/Gate/policy、私人原件外发、收费Provider及M8部署恢复切换继续原固定条件与独立授权。

回滚：关闭对应服务端context或回退本批接线，维持失败关闭；保留全部作品、资产修订及撤销审计，不恢复旧PASS/缓存或错误consumer旁路。本批无生产写入、私人原件、收费调用。GitHub精确源码CI/PG/HTTP取得后追加，不把本地实测冒称远端成功。
