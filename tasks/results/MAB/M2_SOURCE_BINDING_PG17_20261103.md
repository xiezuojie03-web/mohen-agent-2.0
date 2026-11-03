# M2｜原件来源窄权限绑定：隔离PostgreSQL 17真实回执

日期：2026-11-03。执行基线：GitHub `main@bcd0715b81e42024336345fa136e7aa87e4b4567`。

**结果：`M2_SOURCE_IDENTITY_ISOLATED_PG_PASS`；并非`M2_PRODUCTION_PASS`。**

## 运行环境与真实证据

- GitHub Actions [MAB isolated PostgreSQL 17 verification · 41576958641](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41576958641)，job已完成 `success`。官方PostgreSQL 17容器在GitHub runner临时启动，Unix socket只绑定`/workspace/mab-isolated-pg`，未暴露网络端口，全部身份、来源和证据均为合成夹具；创建`mohen_k3_*_test`独立数据库，标记`mohen.test_instance=codex-k3-isolated`，结束后销毁数据库/容器。
- 标准入口：`pnpm test:k3-db`。隔离PG结果实际输出 `MAB_PRIVATE_SOURCE_BINDING_PG_PASS real-pg17 no-source-select exact-origin-version owner expired forged disabled archived`。
- 正向：应用账户经已签短时数据库会话，调用受限`studio.private_source_binding_matches`，确切`private_originals`原件、`source_versions`版本与`raw_items`原件记录及字节摘要匹配，得到boolean=true。
- 反向：`mohen_app_runtime`仍无`source` schema USAGE和`raw_items`直接SELECT；匿名、普通认证、Producer、Signer、Service Role不能执行窄函数；跨Owner、错误raw、错误version、错误hash、过期和伪造会话、账户禁用及项目归档均拒绝。
- 同一PG运行保留：`K3_INDEPENDENT_GATE_PASS`、`MAB_PRIVATE_ORIGINAL_DB_PASS`、`MAB_EVIDENCE_BRIDGE_ROLLBACK_PASS`、`MAB_PRIVATE_ORIGINAL_ROLLBACK_PASS`、`MAB_STUDIO_ROLLBACK_PASS`、`ROLLBACK_COLUMN_ACL_PASS`、`K3_DB_TEST_PASS baseline_migrations=22 synthetic_legacy_rows=711 unchanged`。新增窄函数在回滚时已撤销应用EXECUTE权限，历史审计未被迁移重放或回滚改写。

## 故障处置与继承

最初GitHub临时数据库实例启动失败（41576000074，socket目录不一致），随后隔离测试发现候选SQL缺损（41576451194）和重复尾部片段（41576755544）。已分别在`b10f054`、`9ffc934`和`bcd0715`修复，并验证最终迁移SQL的持久blob内容。**以上失败均不代表已经完成数据库验收；以最终41576958641成功为唯一当前PG回执**。

## 严格未覆盖的条件

1. 本次未配置`MOHEN_TEST_STORAGE_CONFIG`，因此本批没有重新运行官方Supabase Storage HTTP真实字节回读。前期Codex隔离Storage结果保留其原始独立回执，不冒称在本批复测。
2. 未对生产Supabase应用新私有原件迁移、证据桥迁移，未创建私有桶或密钥，亦未启用正式Reviewer / G0—G5独立Gate。
3. `createBoundPrivateEvidenceStageWorker`具受控装配与验证，但D00—D03的正式生产Registry、候选落库与真实专业资格交接仍需后续工程和正反试验。
4. M1生产登录/私有导入/撤权/旧凭据失效证据未全部闭合，保持`M1_SECURITY_ACCEPTANCE_HOLD`，不因M2 PG隔离成功而代签。

**裁决**：仅该来源核验子能力的真实隔离PG约束及回滚通过；M2、M3正式生产准出仍HOLD。
