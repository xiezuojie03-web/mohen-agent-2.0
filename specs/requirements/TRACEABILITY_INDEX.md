# 墨痕 K3 需求与工程证据追溯

Owner于2026-10-31批准按增量施工计划实施。当前为本地工程迁移，未激活MHKA、未更新生产权限或部署。原AGENTS路由继续有效。

## 唯一需求输入

- `api-route-contracts.csv`：85个候选API的请求、响应、权限、事务和正反测试要求。
- `u07-action-contracts.csv`：五图62模块、152动作及真实/目标handler证据边界。
- 输入包：`MoHen_Codex_K3_增量设计迁移输入包_20261031.zip`，两个CSV与包内同名repo_target文件字节一致；输入不是实现回执。
- 保留API既有成功wire与逐ID明确例外，不以通用HTTP/字段模板覆盖已证行为。

## 状态与检查

执行 `node scripts/guards/check-k3-traceability.mjs` 核验身份唯一、覆盖、源码路径和设计handler证据；这不是85API或152动作运行验收。

四种证明分别维护：设计要求、源码可定位、隔离测试、真实投运。表中的 `ENGINEERING_NOT_RUN` 必须在对应运行证据产生后才能变更；不能因目标handler已命名而报已实现。

57字段和104项设计处置的输入身份、支持文件及批次状态见 `tasks/implementation/K3/README.md`。真实执行回执见 `tasks/results/` 对应K3报告；不把审查矩阵复制成第二套API或动作规范。

## 保留阻断

MHKA-00包内正文与K4审查指纹不一致，正式激活等待审定；H1/H2/H3正式原文和完整442/41验收原表尚缺。其余安全与原位工程整改继续；专业方法和完整产品准出不能凭摘要签发。
