# K3 增量迁移执行入口

Owner于2026-10-31批准依施工计划开展本地工程施工。基线为 `759dbbd0c206c4acfe2ebdc3e94aa556528b330c`，使用现有隔离分支 `work`。

## 输入与授权

- `104-targets.csv` 保留104原ID、源SHA、主责任任务与本地进展。不是工程冻结清单；所有 `final_frozen=NO`。
- 85 API和152动作的唯一技术机器输入在 `specs/requirements/`；现有D/L/G/P专业标准原位继承。
- 完整施工计划保存在本次会话工作区 `/workspace/mohen-k3-plan-20261031/施工计划.md`。本入口不重定义产品、专业规则或权限。
- 本地源码、测试和新建隔离测试库已获施工授权；远端推送/PR、真实数据库凭据/迁移、部署、专业Gate投运、MHKA正式激活尚未执行。

## 当前工作包与剩余门

| 任务 | 当前结果 | 尚未完成 |
|---|---|---|
| 1 合同追溯 | 85/152机器输入、唯一性/源码路径/目标handler证明检查已接入 | MHKA-00审查指纹差异、H1/H2/H3与442/41原件缺源；治理不激活 |
| 2 身份与Owner | 新鲜账户状态/角色、过期校验、私有对话Owner、设置权限、非法禁用输入已有回归 | 整套101路由真实集成及角色变更并发事务验收 |
| 3 数据库安全 | 新建隔离PG中验证22份现有迁移、两份安全迁移、低权RLS和安全回滚 | 真实环境只读预检、受限LOGIN凭据和HMAC密钥安全绑定/请求作用域传递 |
| 4 生产授权 | Schema 4、执行前签名/作用域/nonce验证、实际Producer角色检查、审计失败不报PASS | 可信授权服务部署、独立密钥/策略/角色绑定；当前Registry禁用 |
| 5 独立G | Producer只提交完整元数据候选；拆除治理自签与作品自动G5；历史审计保全 | 独立Reviewer签发事务、资格当前投影消费、撤权事务和正式身份验证 |
| 6 双读与撤权 | 尚未准出 | POL-01与公开G5门面、依赖/时效/缓存全链；旧消费者必须同步迁移 |
| 7 Agent创作 | 尚未准出 | 持久worker/预算/恢复、H1/H2/H3方法与实际工具 |
| 8 不可变版本 | 尚未准出 | 兼容GET、事务CAS、版本分镜与外来plan检查 |
| 9 全面API闭环 | 部分安全调用方已更新，不等于85接口验收 | 逐ID服务/事务/权限测试、发布和调度语义 |
| 10 五图 | 未施工验收 | 62模块/152动作及三设备真实E2E |
| 11 冻结 | 当前包做本地验证 | 全部必需安全/产品/恢复测试，不能用本包测试数替代 |
| 12 权威/发布 | 未激活、未发布 | 输入审定、所有前置门及对应独立授权 |

## 支持文件的范围

本次auth异步化涉及原104之外的既有token授权调用方、单元测试、middleware和CI配置；数据库隔离及角色验证新增测试/迁移/回滚支持文件，均从任务2—5派生。首页22动作仍在完整范围，但本包未声称完成首页修订。不得为了保持“只改104路径”而漏掉真实消费者。

## 重跑

```sh
pnpm -r typecheck
CI=true pnpm test:unit
pnpm test:data-production
pnpm guard:k3-traceability
node scripts/check-auth-coverage.mjs --strict --out /tmp/k3-auth-coverage.csv
pnpm build
```

build与dev/start必须顺序执行。`pnpm test` 的旧快照包装器依赖Windows工具和已有源库，不作为此包离线验收入口；没有隔离源库不运行它。

数据库回归用 `pnpm test:k3-db`：提供 `MOHEN_TEST_PSQL`、`MOHEN_TEST_SOCKET`、可选 `MOHEN_TEST_PORT`。仅接受workspace Unix socket且实例须显式标记 `mohen.test_instance=codex-k3-isolated`；自动创建一次性库，安装新代际基线、验证711条**模拟**旧审计、权限及回滚，最后删除该一次性库。它不连接已有生产数据库，不声称验证了真实711行。

## 安全迁移的投运前置

迁移不含任何生产密钥，三个服务角色默认NOLOGIN。数据库RLS只接受实际HMAC签名会话并实时核用户状态，裸UUID GUC与Supabase `auth.uid()`不能充当本项目身份。必须由受信通道安全配置验证密钥，并在同一事务内传递/清理 `mohen.session_token`；未完成此绑定前，受限角色默认拒绝。

Ed25519执行授权只在独立授权者签发正确run/stage/job/mode/真实输入和Registry摘要、且可信HTTPS服务实时核销nonce后通过。本地测试的签发密钥/内存verifier仅存在于 `tests/`，不提供生产绕过。即使签名校验通过，CLI也会核实际数据库连接必须是无签发权限的低权Producer。

正式新G签发仍HOLD：迁移只准备候选与空资格投影，旧审计默认 `legacy_untrusted`，没有自动补资格。运营资产晋级和作品知识回流返回独立G所需的明确阻断；这不是已完成产品功能。
