# MAB M5｜研究恢复PG回归与Studio私有资产缓存守卫

日期：2026-11-05（北京时间）。执行工具：ChatGPT GitHub连接。现行依据：`tasks/implementation/MAB/PLAN.md` M0—M8/HP01—HP13、`progress.md`、`CURRENT.md`，继承 Codex 的 `1bef80b7` 及既有SHA/真实隔离验收；不调整MHKA/KAD6、架构或验收分母。

## 1. 触发缺陷与实际定位

最新业务源 `876ff39b` 在缺Provider/来源/资格时正确生成持久 `research_prerequisites` HOLD；`main@1bef80b7` 主 CI `41941909931` 与隔离HTTP `41941909867` 成功，但独立PG17 `41941909920` **FAILURE**。读取失败job `126964552203` 原日志：`tests/integration/research-resume.integration.ts:35` 的“并发恢复唯一获胜者”断言预期1次done实际0次。检查测试替身确认：默认mock标记 `degraded:true`，而现行恢复函数按正确业务规则将其持久化为HOLD；这是旧成功夹具与新降级语义冲突，不能通过放宽生产 `degraded` 守卫修复。

### 源码与测试批次

- `935a1e1e9fb7ef47a551db1198baf2e94c02cf59`：仅改 `tests/integration/research-resume.integration.ts`。成功路径改用明确非降级的合成研究返回，保留“两条独立PG连接竞争仅一完成、另一HOLD、仅一次模型替身调用、预算8与事件数”的原断言；增加降级后仍持久HOLD、无research_done、费用0的负例。不修改真实 `studio-research.ts` 安全逻辑。
- `243ac2ab845a4e91a684e4f3191ddeec51b862aa`：`apps/web/app/api/studio/assets/route.ts` 对私有项目资产/精确修订/历史/使用事件GET、POST成功、认证拒绝/404/存储故障统一显式 `Cache-Control: no-store`，保持Owner RLS、JSON wire、版本及原API不变；不扩大公众读取。
- `9d7b1c4c680833c3d09722bc2fa3fad005abc91f`：`tests/unit/studio-asset-routes.test.ts` 增加列表、精确私有修订、404、503、POST成功和401的no-store正反断言；不改原其他正反例。

## 2. 验收证据及严格边界

- 旧失败：PG17 `41941909920` FAILURE，原失败历史必须保留，不覆盖。
- `935a1e1e` 主CI [41945060178](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41945060178) **SUCCESS**；隔离PG17 [41945060135](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41945060135) **SUCCESS**。原始job 126975088981显示 `research-resume.integration.ts` 4/4及相关联6/6 PASS，`MAB_RESEARCH_RESUME_PG_PASS`、`K3_DB_TEST_PASS`、711旧合成审计记录保持不变及回滚失败关闭。只核销PG恢复定向回归。
- `9d7b1c4c` 主CI [41945285925](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41945285925) **SUCCESS**。原始job 126975860823显示单测445 PASS/4既有联网SKIP、生产边界133 PASS、Next生产build/目标审计errors=[]，新`studio-asset-routes`禁缓存断言随该SHA入账；这不是生产网站的实际撤权浏览器验收。
- 本批GitHub插件环境未自建PG、本地容器或浏览器；PG与主CI均为GitHub Actions按对应源码SHA运行的真实日志。没有运行真实Provider/外发、正式存储迁移、生产访问或付费。
- 74冻结目标/20责任行/234历史路径账保持原分母；本批两类文件是M5/HP10、HP11的补充回归子项，并非独立M阶段，不修改`target-diff.csv`的冻结语义。**研究恢复PG子项及私有资产禁缓存主CI子项 `VERIFIED_ISOLATED`，不升级为M5整体PASS或任何生产验证**。

## 3. 受影响范围、回滚与后续

回滚边界：问题测试可以定向回退 `935a1e1e` 的夹具/新增断言，不能使 `degraded` 真正转done；Studio端可关闭私有资产入口或定向回退 `243ac2ab`，不得允许缓存恢复已经撤销的资格。资产历史、旧项目、修订、研究暂停与使用审计必须保留。

下一轮仍沿原M5，重点是 `ST01—ST04` 真正来源→有据材料→委托/候选→Studio导演作品、13类资产字段语义/跨项目有权复用、`consented_feedback` 同意撤回及canonical媒资；保留现有六类L5×四消费者、13类10+3隔离PG和导演CAS等成功证据，拒绝重复施工。真实专业G、原件Storage、私人外发、费用与生产迁移仍受M1-C01—C04、M2-C01—C03、M3-C01—C03及M4-C01—C04的已签条件约束。**M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY；M6—M8未准出**。

本批不作Owner体验或产品可运行整体签收。

## 4. 继续闭合：私有资产真实Chromium HTTP回归（同一M5缺口）

在同一批次的单测/PG成功后，核查既有 `tests/e2e/mab-notebook.spec.ts` 已覆盖实际Studio本人项目、13类型和跨Owner读取，直接复用现行 `scripts/test-mab-http.mjs`、`.github/workflows/mab-m1-isolated-http.yml`。不新建测试框架或另起阶段。

- `b063876aeb08af06977988b3e690847be877aa86` 修复一个真实漏口：私有POST提交非对象JSON时，`studioObjectBody` 产生的提前400响应原未经过 `privateFailure`，补原地no-store。
- `3ae28f18b71ed3ffba14985d6fd1d5faf3b378a4` 追加400非对象输入三分支禁缓存单测。
- `9f3af8b12475ac72c5e99e03d919b102d92bfa50` 在原 `mab-notebook.spec.ts` 补Chromium真实HTTP禁缓存断言：首次及二次保存200、本人GET列表200、历史200、跨Owner修订404、跨Owner历史和use_events受限空结果、跨Owner写入404。沿已有合成双账号与独立PG，不涉及生产。
- 最新该源码SHA自动触发主CI `41945997957` 与隔离PG17+Chromium `41945997916`；**本节初写时尚在运行，未取得结论不记PASS**。待真实日志核证，如失败先修复再更新此节。原M5/HP11完整业务与缓存撤权LIVE验收仍HOLD。


### HTTP初次失败及定向修复（不能遮盖）

- `9f3af8b1` 主CI `41945997957` SUCCESS，但隔离HTTP `41945997916` **FAILURE**，真实job `126978221845` 日志指出 `mab-notebook.spec.ts:76` 外部Owner合成保存fixture的JS对象右括号缺失，Playwright在测试收集前报`SyntaxError: Unexpected token`；不是已通过HTTP验收，也不能据此推断应用路由失败。
- `af074521ad6bfddfcdbe295c4844130f9b04a5ca` 修复精确一处语法闭合，不改业务接口与断言。重跑主CI `41946337981` 与隔离HTTP `41946337974`，结果需查询真实GitHub Actions之后再签；失败原始日志保留。


## 5. 最终GitHub核证与本批定向准出

**两次实际失败如实保留**：先前研究恢复PG `41941909920` FAILURE源于旧成功fixture错误；首次本批浏览器 `41945997916` FAILURE源于新增测试行76语法漏括号。两者分别通过定向回归及原有完整测试修复，不改安全守卫或数据库生产权限。

| 准确源码/配置 SHA | GitHub Actions | 现场原始日志与子项结论 |
|---|---|---|
| `935a1e1e` | 主CI `41945060178` SUCCESS；PG17 `41945060135` SUCCESS | Job `126975088981`：研究恢复4/4，`MAB_RESEARCH_RESUME_PG_PASS`；全PG `K3_DB_TEST_PASS`，711旧合成记录保全 |
| `9d7b1c4c` | 主CI `41945285925` SUCCESS | 单测445 PASS/4预存联网SKIP、生产边界133 PASS、Build与74目标审计通过 |
| `af074521ad6bfddfcdbe295c4844130f9b04a5ca` | 主CI `41946337981` SUCCESS；隔离HTTP `41946337974` SUCCESS | Job `126979363687`：Chromium **17PASS/1官方Storage无配置SKIP**，`MAB_HTTP_BROWSER_PASS`、`MAB_HTTP_SYNTHETIC_DATABASE_CLEANED`；覆盖本批真实私人资产no-store正反断言；13类资产原隔离矩阵和Admin精确历史未回退 |
| `abff4e4d2f473e0ec453916a238bade6c58c4c1a` | 主CI `41946517684` SUCCESS | Job `126979974001`：新增不启动浏览器/DB的Playwright语法收集 **6文件18用例** 成功；445单测PASS/4旧SKIP、133边界PASS、Next编译成功、目标差异审计errors=[] |

**签发边界**：研究恢复、私有资产HTTP缓存保护、HTTP规格预解析防漏，且仅上述各自SHA对应的**VERIFIED_ISOLATED**子项可核销；新增HTTP回归不是当前正式Vercel/生产实例的撤权缓存验收，不是13类专业同意撤回、跨项目合法复用、H1/H2/H3/19组件或独立G5完整准出。M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY，M6—M8、M1—M4既有生产固定条件、外发/费用仍HOLD。

**最终改动**：在现行`.github/workflows/ci.yml`加无数据库/浏览器的Playwright `--list` 收集关卡（`abff4e4d`），阻断未来无效测试语法耗费完整PG启动，但该静态关卡不替代真正Chromium。测试、业务API和合同均未建立平行实现。生产数据/Storage/真实Provider未写入、未调用。
