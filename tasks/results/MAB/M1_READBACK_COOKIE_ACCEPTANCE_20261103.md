# M1｜私有材料回读与会话Cookie安全增量验收回执

日期：2026-11-03；受控任务：MAB-ENG-01 §11.2。状态：**CODE_AND_CI_VERIFIED / M1_SECURITY_ACCEPTANCE_HOLD**。

## 变更及实证
- 提交`1b3ef31b`：私有导入材料GET新增可选`material_id`单条全文读取，原列表/POST接口保持兼容；DB会话签名绑定当前账户和原`imported_materials`RLS，跨Owner及不存在统一404，不在JSON错误中泄漏SQL或他人全文，`Cache-Control: private, no-store`。已有集成PG测试补本人/跨Owner/禁用/过期/伪造身份负例。
- `CI 41566616583`：SUCCESS，包含类型检查、单元测试、构建。最初提交`59fa4ba9`的Next GET参数类型异常已在`1b3ef31b`修复，不留已知构建阻断。
- 提交`2a8c2b49`：登录/注册/退出使用统一Cookie选项，在生产启用`Secure`，保留`HttpOnly`、`SameSite=Lax`、`path=/`和退出失效行为；新增不同运行环境的正反单测。`CI 41566911728`：SUCCESS。
- 本次无生产SQL写入、无测试账号或私有导入记录生成、无存储桶、无Gate签发/启用；未要求提供、读取或重置任何真实密码。

## 仍待正式准出
- 生产端Owner合法登录、导入和读取真实业务回归（需有权会话/专用隔离测试环境）；生产库目前只读观察为1用户、0私有导入记录，不能靠创建未获授权的生产测试数据假造实测。
- 旧暴露凭据的非敏感撤权/轮换及旧连接失效回执；现Codex记录显示新数据库密码配置与网站只读访问成功，倾向已轮换，不应重复重置。
- 过期/禁用/跨Owner直接Data API/DB负例及恢复不复活危险权限的真实验收，保留各次有效的隔离测试凭证。

**裁决：M1仍HOLD；上述两批增量CODE_AND_CI_VERIFIED。** 后续真实验收通过才能按任务书对M1独立签发PASS，不连带等待M2/M3激活。


## 2026-11-03五项准出责任补证（最新）

M1唯一现行施工计划`tasks/implementation/MAB/PLAN.md`已对五项原任务分别记载已通过的代码/隔离测试证据及生产验收剩余项。当前CI基线：`1b3ef31b` Actions 41566616583 SUCCESS；`2a8c2b49` Actions 41566911728 SUCCESS；`deed13e1` Actions 41570721926 SUCCESS。

这些证据证明私有材料读取、会话Cookie和M3预检的代码质量及既有测试均满足本轮CI要求，**不能代替**本人的线上合法导入/读取与第二账户跨Owner/撤权/失败恢复实际E2E，以及此前可能泄露凭据已失效的非敏感回执。密码轮换很可能已完成，禁止要求默认重复重置。阶段状态仍`M1_SECURITY_ACCEPTANCE_HOLD`，不依赖M2私有Bucket或M3专业Gate正式启动才能完成M1自身验收。
