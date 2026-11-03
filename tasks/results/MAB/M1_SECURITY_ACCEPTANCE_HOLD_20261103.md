# M1｜安全准出只读核验与剩余闭环责任（2026-11-03）

**判定：`M1_SECURITY_ACCEPTANCE_HOLD`。** 上位规则：资料库 `MAB-ENG-01 §11.2`。本报告不是再次要求Owner批准既有轮换，也不授权扩权或修改生产数据库。

## A. 本次复核实际通过的基线

- 生产Supabase：`public.imported_materials` RLS=true；anon直接SELECT/INSERT=false、authenticated直接INSERT=false。Studio项目/资产修订与Gate候选表RLS启用，运行/Gate的三个NOLOGIN角色均不是SUPERUSER、无BYPASSRLS。
- 已有五个20261102工程迁移记录；生产Storage桶0、私有原件表未部署，**属于M2/M3后续事项，不作为M1安全底座自动延期理由**。
- Vercel Production环境元数据（**从未解密值**）：`AUTH_SECRET`、`MOHEN_DATABASE_PASSWORD`、`MOHEN_DATABASE_SESSION_SECRET`均为Sensitive类型；最近生产构建在配置变动后显示READY。这只证明配置类型/存在/时间，不证明此前泄露的全部旧密钥已吊销、旧数据库密码已失效。
- 已有真实隔离PG/Storage、Owner/跨用户/禁用/过期及回滚测试证据：`tasks/results/MAB/M0_M1_20261102.md`、`M2_SECURITY_RECEIPT_20261102.md`；不得机械重做，需核当前真实运行差异。

## B. Supabase Security Advisor复核

- `rls_enabled_no_policy` 58项INFO：不少私有表应默认拒绝，**不等于58项漏洞或要批量给权限**；逐个开放业务场景必须在相应阶段验证合法角色可用。
- `function_search_path_mutable` 16项WARN：本次只读确认16项均为`RETURNS trigger`、`SECURITY INVOKER`（非SECURITY DEFINER）。其中15项旧`public.guard_*`当前未挂任何用户触发器，`source.forbid_raw_mutation`挂1项。不能把未挂触发器的旧函数当作实际运行保护，相关业务状态提升/专业Gate规则归M3/M5恢复前进行定义/触发器检验；如需加固search_path，应先在隔离环境做实际业务正反测试，不得盲改生产函数。
- 当前没有证据显示上述16项因调用权限导致直接提权；但也没有因此签发完整生产安全准出。官方建议参考：`https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable`。

## C. M1关闭前必须补齐的证据

1. **密钥轮换失效：最高优先级**。提供官方重置/安全界面中的已完成状态或不含秘密值的运维回执；工程侧确认旧数据库连接失败、新正式连接成功，受影响旧凭据的服务权限及会话均已吊销或替换。不得读取、存储或在聊天发送任何旧/新值。
2. **现行合法与拒绝E2E**：确认本人登录与素材导入/读取可用；匿名/跨Owner/禁用账户/过期撤权身份在业务API及可达Data API/数据库均受阻。已有隔离测试可作为依据，但不能替代特定生产合法流量最终验收。
3. **回滚与恢复**：不复活旧匿名GRANT、旧会话或此前已撤权密码；形成一次成功与拒绝测试的非敏感摘要，引用构建SHA与运行环境。
4. **职责边界**：若现有Supabase工具不能重置数据库密码，Owner只需使用官方控制台安全操作并提供“已经重置”的非秘密完成信号；其余核对由工程执行，不重复索取已批准的同一授权。

## 状态与下一步

`M1_SECURITY_ACCEPTANCE_HOLD`；**不要因M0审查准出而勾选M1 PASS**。本报告只做生产安全只读观察，不更改数据库/角色/秘密/Storage/Gate。完成C项之后，按MAB-ENG-01分别签发M1而不是依赖M2/M3投运。


### 2026-11-03 轮换事实纠偏（后补，不改变原审查时点）

此前文案将数据库密码轮换描述为仍需Owner执行，不够准确：Codex交接文件已记录Owner向Vercel Production加入新数据库密码变量并且网站随后的只读DB查询成功。本轮Owner反馈“Supabase数据库密码轮换应该已经完成”。据此调整为**很可能已完成、待补非敏感证据核实**；不再自动要求Owner重复重置或提供任何密码。旧密码失效及其他历史暴露凭据是否撤销仍不能由新环境变量存在推导，M1继续HOLD，合法登录/导入及拒绝回归仍应独立执行。


## 2026-11-03｜Owner批准有条件准出后的M1最新核销（优先于历史总HOLD的施工范围解释）

**裁定：M1_CONDITIONAL_EXIT，仅供M2代码/明确标记隔离环境施工；M1完整生产准出仍M1_SECURITY_ACCEPTANCE_HOLD。** 现行定义、固定条件M1-C01—C04及M2接收要求均在唯一PLAN的“M阶段有条件准出与顺序收口”节，不另设第二计划。Owner允许有条件准出，不授权生产操作或降低最终标准。

| 原五项 | 可继承的真实输出及证据 | 残余条件归属 |
|---|---|---|
| 01 身份传递 | auth.ts当前角色/账号状态实时复查；30秒DB签名；app-transaction.mjs事务内Owner身份、role与失败回滚；过期/伪造拒绝由当前PG suite实跑 | M1-C01生产合法链及实际连接身份；M1-C02生产会话切换 |
| 02 账户/ACL/私人访问 | HTTP六项：disabled立即读写拒绝及恢复不复活、退出旧Cookie拒绝、另一独立会话有效、503不伪造退出成功、私有回执跨Owner拒绝、Notebook本人保存/历史/跨Owner/ACK故障；PG补过期/伪造/数据库边界 | M1-C01/C02真实部署及业务授权范围；不能据此称全部角色/85API已端到端验收 |
| 03 SEC-P0兼容 | 生产本轮只读确认imported_materials RLS开启、anon/authenticated SELECT与INSERT均false；本人全文/跨Owner/禁用/过期由导入仓储PG实测 | M1-C01生产合法导入回读及可达调用路径；本轮HTTP Storage SKIP不是文本导入浏览器通过 |
| 04 兼容迁移/回滚 | 候选20261103095024及rollback源码齐全；PG重演、失败关闭且撤销摘要/失效边界保留；旧工程迁移证据继承 | M1-C02/C04生产备份/授权切换及恢复对应验证；不重新执行既有生产DDL |
| 05 低权限/备份/凭据 | 三组NOLOGIN且非高权；PG真低权私有worker、Signer与伪装高权拒绝；隔离恢复/回滚证据继承。生产新变量/新连接历史已存在，禁止默认重复轮换 | M1-C01实际生产登录权限；M1-C03旧凭据失效；M1-C04恢复不复活 |

证据冻结：`b609efa2`，[M1 HTTP41641918101](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918101)实际日志**6 passed/1 skipped**、[PG1741641918045](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41641918045)SUCCESS；最新`982c5ae6`仅文档/TLS测试变更，M1实现未变，[主CI41642390511](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41642390511)SUCCESS。本轮重新读取这些实际日志并比较代码，不冒称重跑当前环境HTTP。

生产只读2026-11-03 22:11:50+08：web_session_revocations=null、session_not_before列不存在；imported_materials RLS=true、anon/authenticated SELECT/INSERT全false。三个内部组NOLOGIN/无super/bypass/createrole/createdb，**没有据此推出Web实际LOGIN无高权**。没有读取真实会话、原文、密码或密钥，没有生产写入。

### 给M2的固定交付

- API请求必须由服务端getSession/resolveSession认证，角色从当前账号读取；调用仓储时签30秒数据库身份。Owner从可信身份和项目RLS得出，不能信任body.owner_id。
- PG事务复用createAppTransaction与现有私有仓储；身份在事务结束清除，回滚失败丢弃连接。私有worker的专用实际LOGIN拒绝admin/Producer/Signer/authority成员。
- 隔离环境应用现有安全/Studio迁移，测试会话开关true及独立DB验证key；不得把合成服务密钥/用户/Storage冒充生产。
- 回退与恢复继承撤销摘要及单调失效边界；上线前须满足固定四条件，不通过关闭撤销开关/恢复危险GRANT回退。
- M2接收验收必须在其有权原件/资产操作中实际使用上述身份链并验证跨Owner/失效拒绝；这是M2接口集成验收，不重新施工M1。M2的未持久化原件/资产和跨系统恢复问题由M2自行闭合，不反复退回M1。

重开M1的限定触发：auth/session/DB身份/Owner事务/相关RLS与GRANT/迁移配置有实际变更，或出现可复现安全负例失败；只定向修复受影响交付。生产条件到点未满足时阻断生产，不撤销未受影响的隔离工程准出。M8最终验收不得遗留本四项。
