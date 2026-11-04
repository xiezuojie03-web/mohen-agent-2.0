# MAB M5｜导演方案与作品版本写入的CAS、归属和来源修复

审查及施工日期：2026-11-04。只针对已批准的M5/HP10—HP12局部源码责任；不修改MHKA/KAD6、M0—M8顺序、Studio/作品产品语义、独立G0—G5资格、安全和费用授权。基线 main@`c1b47eb8b01e044b7899016f20906af8b885200b`，已推业务HEAD `c8379b0d699e2121306808a0ce45f62977c73fe4`；文档提交另有后续SHA。

## 1. 直接实施及验证

1. `19ff534c69fe56c2695810b5904a6d1d4d851c5e`：`studio-director.ts`的`commitWorkRevision`由先取`max(revision_no)+1`后直接`run INSERT`改为同Owner计划/作品限定的单次`INSERT ... WHERE current_head=expected ... ON CONFLICT DO NOTHING RETURNING`。当前选定计划、beats与finding在SQL写入时再次对照；修订正文记录`director_source.plan_id/selected`，相同内容的重试返回已有精确修订。既有`POST /works/:id/revisions`添加可选`expected_revision_no`，冲突409，不破坏旧请求字段。
2. 首次该源码的真实主CI `41836288891 FAILURE`：3个单测失败；其中旧JSONB测试仍mock旧`run`路径，新测试SQL分支匹配误判INSERT，已取得失败日志，不隐去。
3. `4d5c05e0d45d7633be619225d128b4885e39a852`：只修正测试输入/写入断言；真实主CI `41836604791 SUCCESS`，不把更早失败改写为通过。
4. `c8379b0d699e2121306808a0ce45f62977c73fe4`：现有`publication.forkWorkRevision`由分离读最大号、直接写草稿改为单SQL当前头CAS，保留精确`fork_source.work_id/revision_id/revision_no`，校正native JSONB/psql JSON的读取/写入与新内容hash。允许受控`restore`指定`source_revision_id`恢复真正历史修订，并允许可选`operation_id`幂等返回原确切草稿；旧不带请求体路径继续指向当前最新修订。严格不将新草稿继承为已出版或专业G5合格修订。
5. 新增`tests/unit/mab-m5-director-commit.test.ts`、`tests/unit/mab-m5-fork-restore.test.ts`，更新`tests/unit/studio-jsonb.test.ts`；覆盖跨Owner计划拒绝、保存来源、旧期望版本、并发冲突、DB失败、精确来源恢复、请求幂等与失真JSON拒绝。
6. `c8379b0d699e2121306808a0ce45f62977c73fe4` 真实GitHub Actions主CI [41837221858](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41837221858) SUCCESS；同SHA隔离 PostgreSQL/Chromium HTTP 工作流 [41837221734](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41837221734) SUCCESS。后者主要运行既有M1/Studio浏览器套件，**不能替代本次新增的真实PG fork/restore竞争与操作ID E2E**；此次新行为的直接证据主要为unit+静态/类型/构建通过。M5仍未整体准出。

## 2. 线上阻断的只读核销（同日 Supabase 插件实际查询）

- 实际已登记MAB迁移仅`20261102094218`、`20261102095611`、`20261102104020`、`20261102105810`、`20261102105829`，后续M2/M3/M4候选SQL仍未在正式迁移账生效。
- `storage.buckets=0`、`source.private_originals`表不存在、`studio.projects=0`、`control.qualification_current=0`，正式`mohen_gate%` LOGIN角色为0，`public.users.session_not_before`列不存在。意味着M1-C02、M2-C01、M3生产身份/服务条件仍不能自签；与旧隔离成功互不矛盾。
- M1-C01合法生产Owner/跨账户访问、M1-C03历史凭据失效和M1-C04正式安全恢复本次未取得新证据；不可猜测旧密码仍有效或要求重复轮换。
- M2-C02 PDF/图像定位、M2-C03授权资产复用，M4-C01—C04正式派工/外部双主体/可信费用/业务全验收，本批未触及，按原固定ID HOLD。
- 本轮没有任何生产DDL或数据写入，没有创建桶、激活正式Gate/Reviewer、真实Provider调用、个人原件外发和新增费用。

## 3. 判定、回滚与下一施工

- **本批M5导演提交和fork/restore为 CODE_PRESENT＋CI_SUCCESS，正式PG并发/E2E、Owner作品体验以及精确G5/rights/consumer仍HOLD。** 不以已有隔离HTTP全绿代签新版本写入的正式生产资格。
- 回滚受影响新写入口到前一合法版本或暂时禁用；已写的不可变修订/历史审计须保留，不以重开旧非CAS写入作为回退；不得开放缺独立Gate的公共发布。
- 下一步依现行PLAN原M5/HP10—12：增加实际隔离PG fork/restore并发及幂等E2E，继续同WorkRevision的其它写入口、精确G5/rights用途消费映射与ST九动作/13类型正反业务验收。M1—M4生产固定HOLD由原负责条件按原到点关闭；不用改变施工计划。
