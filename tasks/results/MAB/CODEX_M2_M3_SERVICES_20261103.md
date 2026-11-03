# MAB HP04—HP07｜私有 worker 与独立 Gate 服务接线

基线：远端 `main@02eecd6e4a511738fb7cca81287295f88022b539`。日期：2026-11-03（香港时间）。本批是既有 M2/M3 子能力施工，不是阶段准出或生产启用。

## 工程事实

- 开工实际执行 `git fetch origin`，随后显式 fetch `main:refs/remotes/origin/main`；原 checkout 为干净 `work@759dbbd`，保留原分支，从最新 main 创建本地施工分支。无 reset、旧镜像覆盖或生产数据修改。
- M2：唯一 `run.mjs` 提供惰性私有 runtime；仅精确私有 Adapter 请求在 Registry/独立执行授权之后初始化。独立 worker 登录必须属于 `mohen_app_runtime`，不得为 Producer/Signer/authority、高权登录或其成员；SET ROLE 不能隐藏实际登录。Owner 短时会话仍由现有 RLS/当前用户、原件回读和来源版本窄核验执行，不从请求伪造。
- worker 默认关闭；必须显式配置 `MOHEN_PRIVATE_EVIDENCE_WORKER_ENABLED=true`、`MOHEN_PRIVATE_WORKER_DATABASE_URL`、`MOHEN_PRIVATE_WORKER_OWNER_SESSION`、`MOHEN_SUPABASE_URL`、`MOHEN_PRIVATE_STORAGE_SERVICE_KEY`、`MOHEN_ORIGINAL_BRIDGE_SECRET`、`MOHEN_ORIGINAL_BRIDGE_KEY_VERSION`。这些只是源码配置项，本批未向生产注入或开启。禁止回退共享 DATABASE_URL；连接串须显式密码、不得带 query/startup/SSL 覆盖；远端及 localhost 一律验证 TLS，可追加现有受信 CA。Pool 在失败/终态关闭。
- M3：新增独立签发 HTTP handler，复用现有专用低权 Signer 仓储与 SQL，不新增签发真源。精确 candidate/request、CAS、规则版本、时效、专业回执与 stage_binding 由 Reviewer 提交；数据库再次核当前身份、策略、证据、依赖及修订。HTTP 签发回执不冒充当前资格。
- 当前资格 reader + HTTP handler 对接原 `createIndependentGateClient`。server-owned 凭据映射限定 job、Reviewer binding、purpose 与非空 scope；请求仅携 run/stage/job/digest，不接私有正文。仅独立签审 receipt 的 stage_binding 与 candidate input_fingerprint、run、job、输入/输出摘要全部吻合，并经 `control.qualification_allows` 时返回；无缓存、无旧 PASS 补签、歧义拒绝。
- 对应协议及 PG17 workflow 路径触发已补齐；strict auth guard 原位补全既有 delegation 路由账。

## 本次真实验证

环境工具：仓库固定 pnpm **9.15.4**。系统预装 pnpm 的自动安装路径/构建策略与本仓库不一致，最初命令失败；随后在 `/tmp` 使用确切 9.15.4，设置本地 PATH shim 使嵌套脚本也使用它。未提交该环境工具、node_modules 或凭据。

| 命令 | 实际结果与界限 |
|---|---|
| `pnpm install --frozen-lockfile --store-dir /tmp/mohen-pnpm9-store`（CI=true, pnpm9） | PASS；锁文件无修改 |
| `pnpm -r typecheck` | 六工作区 PASS |
| `CI=true pnpm test:unit` | 313 PASS，4 既有联网 SKIP；不是 317 全实跑 |
| `pnpm test:data-production` / 等价 `node --test --experimental-test-isolation=none tests/data-production/*.test.mjs` | 116 PASS，0 SKIP |
| `pnpm guard:auth:strict` / 等价 Node 命令 | 105 routes，18 public、87 protected；missing/auth-only-no-owner 均 0 |
| `CI=true pnpm build` | Next production build PASS；未据此声明真实产品链准出 |
| `node scripts/audit-mab-handoff-targets.mjs --out work/mab-target-audit.json` | 74 路径均存在，0 missing；仍 HANDOFF_NOT_READY、74 全语义未准出 |
| `MOHEN_TEST_PSQL=… MOHEN_TEST_SOCKET=/workspace/mab-isolated-pg MOHEN_TEST_PORT=55432 node scripts/test-k3-db.mjs` | 一次性官方 postgres:17，标识 codex-k3-isolated；真实 PG17 整套 PASS，包括下述新增场景。无生产连接 |

新增正反场景：

1. 真低权 Signer→HTTP 签发/幂等→真只读 fixture 登录→HTTP 当前资格→现有 Producer 客户端；错 run/job/binding/digest/purpose/scope 拒绝。
2. Reviewer 用户 disabled、专业 binding inactive、规则 disabled 后逐请求拒绝；恢复隔离 fixture 后再验证；撤权 HTTP→真实 SQL→下一次读取立即拒绝。
3. 原711条旧审计保全、原迁移重演/撤权不复活/回滚权限失败关闭、研究恢复并发与费用 HOLD 继续 PASS。
4. 私有来源核验改由实际专用 worker LOGIN 执行；Owner 精确原件/来源版本成功，跨人、过期、伪造、disabled、项目归档拒绝；admin、伪装 SET ROLE 与兼具 Signer 的 worker 身份拒绝。
5. runtime 默认关闭、缺必填项、无共享凭据回退、一次初始化、关闭与初始化并发、Storage/worker 构造失败的清理；池配置验证 TLS 与拒绝 URI 参数。随后另以一次性PG17启用自签fixture TLS，真实验证专用低权worker经受信CA连接且pg_stat_ssl.ssl=true，未信CA的连接拒绝。可复跑入口为 tests/data-production/private-worker-tls.integration.mjs，必须显式合成TLS连接/CA及codex-k3-isolated标识；未测试生产证书。

测试驱动：新 reader/handler/runtime 测试先因模块缺失失败；惰性 Adapter 测试先因 HOLD≠PASS 失败；显式密码负例先失败，修复后通过。最初非 CI 单测的 Commons 实网检索降级失败，未修改测试或产品来伪造通过；CI=true 的四项历史 SKIP 仍如实保留。

## 独立审查与未完成边界

独立 reviewer 对 M3 和 M2 源码/测试进行了只读审查，并独立运行新协议/runtime 测试；未发现 Critical/Important。显式密码隐患已以失败→通过的直接 pg.Pool 配置测试修复。

**Minor deferred：** 两个新 HTTP handler 仅限制请求字节量，尚无独立 body-read deadline；正式部署前必须补请求读取超时或提供可核验的宿主强制超时，不能据本批直接上线。

- 认证 callback 仍需真正独立的已授权 Reviewer/consumer 认证服务；合成凭据映射不证明生产凭据撤销/过期。PG reader 登录及 SELECT/EXECUTE/RLS 授权仅为一次性 fixture，不是已部署生产权限方案。
- M2 runtime 惰性装配与真实 PG Owner/来源权限已验；本批**没有**官方 Storage 配置、原件实际字节→Runner→L1持久化→独立 G1—G3 整链证据。`MAB_PRIVATE_ORIGINAL_STORAGE_HOLD` 保留，不把原件数据库 fixture 当真实 Storage。
- D01 仍输出已核验阅读候选，尚非真实 L1 落库/准出；D02/D03依旧须准确持久对象、证据桥与独立资格。Studio `production_input_binding_required` 仍在，Registry 全局/Job 未开启。
- M4—M8及 HP 总状态未提升；新增模块是既有 HP04/HP06/HP07 的工程责任，74目标分母不变。

## 生产只读快照及回退

2026-11-03 **21:00:00+08:00**，Supabase fwrhxddcpkibsnmddcfl 只读查询：`studio.projects=0`、`control.qualification_current=0`、`storage.buckets=0`、`studio.private_originals` 不存在、`control.sign_gate_candidate(...)` 不存在。此时点事实不推断后续状态。

本批无生产 migration/角色/Storage/Registry 修改，无收费 Provider 请求，无私人原文外发。未重置任何生产口令。

回退：关闭 worker 配置，回退本批 CLI/runtime/service 源码；保留现行旧端点503、独立 Gate 必须校验、Studio生产HOLD、所有不可变资产和撤权审计。未来上线另须真实独立认证、受审最小权限/迁移与备份回退、Storage字节/来源/L1—L3/G1—G3正反整链及明确生产授权。


## 已推送提交与补充握手证据

源码已推远端main：`b609efa2c5883cd732cc1a1ce2100bb0d96d8265`；无force push。首次推送因GH007邮箱隐私保护拒绝，改用仓库近期相同的GitHub noreply提交身份后成功，未改账户设置。

补充实际TLS测试：在本批一次性PG17容器内生成一天有效的合成证书，仅本地fixture专用LOGIN具有app-runtime成员资格；`MOHEN_TEST_TLS_INSTANCE=codex-k3-isolated MOHEN_TEST_TLS_CA_FILE=<workspace synthetic CA> MOHEN_TEST_TLS_DATABASE_URL=<local synthetic login URI> node tests/data-production/private-worker-tls.integration.mjs`输出`MAB_PRIVATE_WORKER_TLS_PASS`。可信CA+实际专用worker身份成功，pg_stat_ssl证明加密，缺可信CA的握手失败；无生产证书/口令使用或外部Provider请求。测试脚本与本回执提交，私钥、CA与连接串不入Git。


### main源码提交的GitHub真实push验证

`b609efa2c5883cd732cc1a1ce2100bb0d96d8265`四流水线均COMPLETED/SUCCESS：

- 主CI [41641917991](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641917991)：Install、Typecheck、Unit、Production boundary、K3追溯、Next Build、strict Auth、74目标审计及artifact上传均成功。
- 独立PG17 [41641918045](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918045)：真实迁移、专用低权Signer/worker、签发/当前资格读取/撤权及历史/回滚完整套通过。
- M1 HTTP/Chromium [41641918101](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918101)：一次性PG17与真实HTTP/浏览器验收通过。
- M3协议 [41641918296](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918296)：纯合成协议与禁止直接写Gate检查成功。

以上只对精确源码SHA与隔离合同有效；后续TLS测试脚本/本回执提交不冒称四流水线也已在该未来SHA执行。生产迁移、原件Storage整链、真实独立认证和M1—M8阶段HOLD均不变。
