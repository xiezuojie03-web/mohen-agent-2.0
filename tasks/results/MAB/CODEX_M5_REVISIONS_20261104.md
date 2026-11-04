# M5私有预览、改稿CAS及CI共享时限收口

基线`4f57421608d763b6e412a85cf1625294525f0e15`，继承该SHA主CI/PG/HTTP真实成功。

## 预览与改稿

真实Next/PG/Chromium先复现：保存的正文预览为`{}`；八个同时改同一revision的请求只有1成功、3个409，另外4个唯一键异常500。前者是查询漏content且原生JSONB解码错误；后者是查询后校验与插入分离。

现预览取真实保存正文并统一处理pg原生JSONB/psql文本；坏JSON报503，保留Owner守卫。局部改稿与重排复用单个INSERT expected-head谓词、原有唯一(work_id,revision_no)约束、ON CONFLICT DO NOTHING及RETURNING；实际落库才成功，竞争失败报告当前版本409，不覆盖原修订。API字段不变、无新迁移。

真实HTTP证明正文可读、跨Owner403；八并发仅1成功/7冲突，同一精确rev提交可幂等重试；旧expected重排拒绝、当前expected新增v3。新4项CAS/写故障单测与4项预览/损坏/权限单测通过，原JSON双编码测试保留。

## 真实CI时限失败

旧文档SHA247bee0的CI41825365579/job126558624358在`studio-receive-candidate`时限测试失败（callback预期1次，实际2次）。根因是定时器可能先于Date.now的deadline判定触发，批次却仍启动后一个item。

确定性测试冻结墙钟并推进timer，先实跑失败；定时器超时现在单向耗尽共享预算，T7验证同样进入共享call，后续item不再读原件，最后复核也撤回先前accept。审查进一步补出先前接受项与T7/最大10000ms路径，逐项RED→GREEN；17项receiver测试最终通过，不靠延长生产期限或删除断言。

## 验证与边界

最终单测417 PASS/4既有实网SKIP，生产边界133 PASS/0 SKIP，六workspace类型和107路由权限检查通过；独立审查无剩余重要问题。真实HTTP11PASS/1官方Storage缺配置SKIP，PG17全套与新资格检索/撤权、恢复回滚均实跑。原始日志在`evidence/CODEX_M5_REVISIONS_20261104/`。首个构建PgRow参数类型失败与修正、审查补例失败均保留。

本批只覆盖局部改稿/重排；导演方案初始提交、fork/restore等其它写入口的并发/幂等仍待核，不能泛签所有版本保存。正式G5/rights映射、九动作/13类型业务全验收仍HOLD，M5未准出。无生产写入/角色/开关/真实模型费用。回退可关闭相关入口，不允许恢复假成功、旧PASS或过期候选accept，保留已有合法版本与审计。GitHub精确源码结果取得后补记。
