# M5公开作品消费边界首批

基线`df4eeb885680e0caefd25b8429beadafbcc9cacd`。先取得该SHA主CI41823975350和实际HTTP41823975358 SUCCESS，关闭M4远端HTTP回归后才进入M5。本批不是M5准出。

## 实际问题与修改

`/api/public/works`目录及详情/program/share/related、`/api/search`的作品分面直接复用`listPublished`。它只是Admin运营用的已发布指针查询，没有逐请求当前专业资格；即使WATCH入口已过滤，上述旁路仍可泄露作品。真实PG/Chromium测试先创建合成作品，再直接安装无G5的legacy发布指针；旧代码在匿名目录原样返回正文，测试真实FAIL。

六入口现复用既有`listWatchEligible`，逐请求检查同一work/revision的WATCH消费者资格，不将运营pointer或审批当G5；正文/元数据成功及拒绝结果均`no-store`。保留原wire字段、404与share原因，Admin原始运营列表保留原权限用途。没有新增Gate或资格伪造。现行精确WorkRevision→L5/G5/rights映射未实现，资格服务继续失败关闭，不因本批接线公开历史作品。

## 测试与范围

- 新6项路由单测：6 FAIL→6 PASS；覆盖目录/搜索不借运营列表、详情/节目单/分享拒绝、相关作品元数据过滤、当前资格变化后重查、成功与拒绝均不可缓存。
- 实际标记PG17+Next生产构建+Chromium：8 PASS/1官方Storage配置缺失SKIP；新增匿名公开旁路负例，已存在无G5指针仍不披露正文或work ID，内部Owner仍能查该作品，数据库修订未删除。既有M1/M4/Notebook回归通过。
- 全单测395 PASS/4既有实网SKIP；生产边界133 PASS/0 SKIP；六workspace类型检查及107路由鉴权矩阵无缺口。独立review无重要问题，复跑目标6项通过。

原始日志见`evidence/CODEX_M5_PUBLIC_CONSUMERS_20261104/`。GitHub本次源码实际CI/HTTP取得后补记，不能用M4的成功代验M5。

## 未覆盖和下一步

M5仍在施工：精确G5及媒体rights服务、实际资格撤销整链、私有预览漏读content、改稿分离读写CAS竞态、九动作/13类型逐业务验证未闭合。新单测的合格响应和变更使用受控测试替身，真实HTTP只证无G5拒绝，不能称真实专业审核/撤销已通过。

特别留账：`/api/search`的knowledge分面及共享`mohen-agent/retrieve.ts`仍沿用旧audit PASS/current_valid/agent读取，不是本批作品分面；需下一P0按consumer/purpose/scope/祖先撤权复现并接现行资格。不得把本批称全搜索/全部公众知识已安全准出。

本批无生产DB/Storage/账户/权限/开关操作，无私人外发或Provider费用。M1—M4固定条件全部继承。回退仅可关闭公开入口，不能恢复原始运营列表公开旁路；保全私有草稿、版本、撤销和审计。
