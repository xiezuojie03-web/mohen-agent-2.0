# M4远端HTTP定向收口

基线`256ba6c`，修复源码`df4eeb885680e0caefd25b8429beadafbcc9cacd`。

旧run41790309838/job126441897574真实日志：`20261104013351_mab_m4_execution_controls.sql:54: ERROR: role "anon" does not exist`，尚未执行应用构建或浏览器。PG套件初始化了Supabase API测试角色，HTTP套件缺此步骤；本地旧集群有角色，掩盖了新集群差异。

在新建PG17.11实例先查询确认三个角色不存在，旧脚本实际重现同一错误。修复仅在HTTP脚本本地socket/实例标记守卫后补NOLOGIN角色初始化，沿用PG套件写法；生产迁移、REVOKE和权限不变。

本地：389单测PASS/4既有实网SKIP；133生产边界PASS；Next真实构建及HTTP/Chromium7PASS/1Storage缺配置SKIP，结束清除一次性数据库。独立代码审查无问题。

GitHub精确修复SHA：主CI [41823975350](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41823975350)与实际HTTP [41823975358](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41823975358)均SUCCESS；下载job126553881524日志确认7PASS/1SKIP。原始RED/GREEN及机器回执在`evidence/CODEX_M4_HTTP_20261104/`。PG本次未触发，不借旧PG成功冒充本次新跑。

仅关闭`M4_REMOTE_HTTP_RECONCILIATION_HOLD`，按原有限工程范围接收M4并转M5。M1/M2/M3/M4全部固定条件、真实混合/生产/专业审核/外发/费用HOLD保持，完整M4复选框不勾。无生产操作、无模型调用。回退脚本不允许删除安全REVOKE或复活既撤权限。
