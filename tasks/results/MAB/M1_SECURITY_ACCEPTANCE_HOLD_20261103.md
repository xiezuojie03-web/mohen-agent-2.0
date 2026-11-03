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
