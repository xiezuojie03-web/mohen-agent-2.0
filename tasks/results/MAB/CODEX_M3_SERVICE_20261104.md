# M3 独立服务工程验收｜2026-11-04（北京时间）

基线：远端 main `af85d9ddc01ac1e0739531c0eb1072cfce8e91d4`，fetch 后 HEAD 一致，初始工作树干净。继承 M1/M2 已有条件准出与全部生产限制；不重做已有 Runner、独立 Gate SQL 或总体设计。

## 已实现的交付

- 独立 HTTPS 进程，默认 OFF。签审和资格读取分别使用专用最小权限 LOGIN/连接池；拒绝共享高权、Producer、Web、危险继承成员和 SET ROLE 伪装。
- 随机不透明服务凭据只存 SHA256，绑定身份、数据库登录、review/consume、任务、Reviewer、Gate、用途、consumer、非空范围与期限；失效用户、binding、过期或撤销凭据均拒绝。凭据只可单向撤销，不能删除或恢复。
- 在同一事务中锁定凭据、设置短时身份并调用既有唯一签审/撤权 SQL；COMMIT 确认后才返回成功。独立 reader 只执行窄函数，无审计表读取权限；不缓存旧 PASS。
- 撤权目标也核验目标不可变回执的 job/Reviewer/consumer，封闭同用途范围跨任务撤权。
- 整体请求正文期限、字节上限、HTTPS、数据库证书验证、连接/SQL/锁等待上限已落地。错误不回显数据库细节、凭据或会话 key。
- M2 原持久 L1 保持不变；新增合法 G0 依赖后由 Producer 提交新的 G1 待审候选，再交独立服务签审和消费。原无依赖候选保持 SUBMITTED，未补写假依赖。

## 原 M3 六项核销范围

| 原任务 | 本轮交付及继承证据 | 最终剩余 |
|---|---|---|
| Runner/Registry/方法/Skill与独立启用 | 原唯一 Runner、冻结输入、按阶段 adapter 和授权/启用边界回归；本服务独立启用，默认 OFF | 正式 Registry/专业 Reviewer 不自动开启 |
| Producer仅提交候选 | 真实 PG 持久 L1→Producer候选→独立签审；旧审计保留 | 正式资料专业审核 |
| 独立身份/策略/修订/用途/依赖/有效期 | 新 LOGIN+hash凭据认证及既有 authority/qualification_allows，G0→G1、原G0—G5链正反验证 | 真实生产身份/策略配发和审核 |
| Stage/候选/WAITING_GATE/合格交接 | M2无资格时Runner HOLD及持久refs继承；实际资格回执精确输入/输出 | 正式任务专业资格 |
| P08失效/即时消费阻断 | 凭据/账户/binding禁用、资格撤销和祖先撤销后当前消费拒绝；无缓存PASS | 生产真实业务逐请求验收 |
| 不可越权签G/恢复重核 | 专用LOGIN、reader无表权限、角色混用/高权伪装拒绝；原恢复/当前资格回归 | 正式部署及恢复演练 |

## 启动与运维边界

入口：`node pipelines/data-production/orchestrator/independent-gate-service-runtime.mjs`。启用须显式设置 `MOHEN_INDEPENDENT_GATE_SERVICE_ENABLED=true`、分别的 `MOHEN_GATE_SIGNER_DATABASE_URL` / `MOHEN_GATE_READER_DATABASE_URL`、`MOHEN_GATE_DATABASE_SESSION_KEY`、`MOHEN_GATE_TLS_CERT_PATH` / `MOHEN_GATE_TLS_KEY_PATH`。数据库 URL 禁止查询参数；始终校验证书，私有 CA 可分别通过 `MOHEN_GATE_SIGNER_DATABASE_CA_PATH` / `MOHEN_GATE_READER_DATABASE_CA_PATH` 引用。默认监听 `127.0.0.1:8443`，HOST/PORT 可显式配置。此处只记配置名称，不生成生产秘密。

候选迁移 `20261103234154_mab_m3_gate_service_auth.sql` 不创建生产 LOGIN、凭据或启用开关；回滚关闭全部服务函数入口，保留凭据撤销记录及 Gate 历史。发证与撤销只能由有权运维在批准窗口执行；不得授 Web/Producer 写凭据表或替代 Reviewer。

## 验证边界与失败记录

本批只使用一次性标记 PG17、合成用户/原件/审核检查和本地 TLS。合成 PASS 只证明工程身份/依赖链，不证明原件历史事实或真实专业审核。首轮 G1 因缺 G0 依赖被正确拒绝；已补独立 G0 及新候选，未弱化 Gate。一次测试新增高权负例缺 import 已修复。原 unit 默认实网 Commons 因受限联网失败，按现有 CI 模式重跑并保留4项联网 SKIP；未修改或掩盖该测试。首次 Next 构建受只读遥测目录影响，使用禁用遥测及可写临时配置后通过。

生产迁移、LOGIN/凭据/Reviewer策略配发、服务发布、Registry启用、私有资料外发和付费调用均未执行。M1-C01—C04、M2-C01—C03继续有效，M8不得带条件正式准出。

## 有条件准出与下一阶段输入

裁定范围限定为 `M3_CONDITIONAL_EXIT`：代码及标记隔离环境的独立服务工程闭环；不勾选原完整生产验收复选框。M4可直接复用本服务、当前资格/撤权客户端、同一事务 authority、精确依赖及 M2 待审资产，继续无外发/无费用的 DAG、T1—T7、预算与恢复施工。不得重复重建 M1/M2/M3 已验证能力。

| 固定条件 | 责任及关闭证据 | 最迟完成点 / 阻断范围 |
|---|---|---|
| M3-C01 正式独立服务部署 | 工程准备；Owner/有权运维批准生产窗口。部署候选迁移、专用LOGIN、TLS、最小权限、独立secret引用及可撤销凭据；在实际部署上完成合法/拒绝/提交失败验证 | 任何正式签发、撤权或依赖新服务的生产资格消费前；不得以源码到位代生产启用 |
| M3-C02 真实专业Reviewer与资格 | 有权专业Reviewer/Owner核定真实策略、责任、范围和资料权限；真实原件逐阶段G0—G5审签及即时失效/精确修订消费回执 | 对应真实阶段交接/专业资格消费前，且M7真实双题复用、M8最终准出前；合成fixture不能关闭 |
| M3-C03 正式恢复与业务消费 | 工程在有权窗口内恢复备份；恢复保持OFF，重核当前用户/binding/策略及最新撤销记录，必要时废止恢复出来的旧服务凭据再配发；实际业务恢复后旧许可不得复活 | 首次生产启用前及M5公开消费/最终M8前；不能把本批函数回滚保留记录等同完整生产灾备 |

改变上述条件须具名记账；条件未关闭仅阻断其关联生产动作，不阻断M4合成/隔离源码施工。最终标准与生产安全、资料外发及费用约束不变。

## 最终本地回执

原始成功日志及SHA256清单：`evidence/CODEX_M3_SERVICE_20261104/`。

- `CI=true pnpm test:unit`：**324 PASS / 4既有实网SKIP**；Storage定向7项新增先红后绿，现16/16。
- `pnpm test:data-production`：**133 PASS / 0 SKIP**，含真实localhost HTTPS及慢正文期限。
- `pnpm typecheck`、`pnpm build`：**PASS**；105路由auth覆盖无缺口，85API/152动作追溯通过。
- `scripts/test-k3-db.mjs`＋标记PG17＋官方Storage v1.43.0：**exit0**。原始日志同时包含 `MAB_PRIVATE_READING_BACKUP_PASS`、`MAB_PRIVATE_READING_M3_SERVICE_PASS`、`MAB_PRIVATE_ORIGINAL_WORKFLOW_PASS`、`MAB_EVIDENCE_BRIDGE_PASS`、`MAB_GATE_SERVICE_PASS`、`MAB_GATE_SERVICE_ROLLBACK_PASS`、`K3_DB_TEST_PASS`；恢复3项也通过。
- runtime实际PG17 TLS：受信CA成功、未信证书拒绝；HTTP侧使用一次性自签CA并校验SAN，未关闭证书校验。PG+HTTPS的服务用例注入真实socket连接池；runtime池选项的数据库TLS单独验证，未声称正式生产入口已部署。

测试环境定向修正：官方Storage最初与应用安全测试共用cluster，既有service_role无BYPASSRLS导致bucket创建403；改用独立第二PG17实例承载Storage，不改变应用角色。首次Storage HTTPS遗漏新临时CA，被正确拒绝；只添加该合成CA的信任引用后通过。完整并发上传回归一度因上游短暂5xx失败，已按上文有界GET重试修复并全套重跑成功。无环境失败改写成PASS，无权限/证书/费用约束放宽。
