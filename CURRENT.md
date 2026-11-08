# 墨痕｜当前真实工程状态

更新：2026-11-08。本文只记录当前状态，不承担施工计划或过程日志。

## 当前工程基线

- main：`3f8cc1b`（本文回写提交紧随其后）。
- 补齐推送：远端 main 此前停在 `d1cf3fc`，本地 26 个提交（M2—M5 批次 C—K）于本日补推，区间 `d1cf3fc..99a33a2`。
- 远端 CI（`3f8cc1b`）：`ci` 42444946341 **SUCCESS**，11 个步骤全通过——权威路由、Dev Skill 版式与用例、typecheck、Playwright 规格解析、单测、数据生产边界、K3 追溯、build、auth coverage strict、MAB 74 目标交接审计。
- 推送后基线 CI（`99a33a2`）：`ci` 42442455790 **FAILURE**；`MAB isolated PostgreSQL 17 verification` 42442455901 SUCCESS；`MAB M1 isolated authenticated HTTP acceptance` 42442455811 SUCCESS。失败步骤为 MAB 74 目标交接审计，根因 `target-diff.csv` 携带 UTF-8 BOM（表头首列成为不可见的 `\uFEFFpath`），已在 `3f8cc1b` 修复。

## 当前测试与门禁事实

- 全量隔离套件（`pnpm test`；真库只读快照 → `_test` 库执行 → 前后行数对账）：**668 通过 / 0 失败 / 2 跳过**，84 个文件通过、2 跳过，`real_db_untouched=YES`。上一记录为 622 通过 / 10 失败。
- 10 项历史失败已于 `3f8cc1b` 全部处置，**未使用 skip 或放宽断言**：5 个文件因全量配置缺 `next/server`、`next/headers` 别名而无法收集（已补齐，与 unit 配置同源）；`tests/setup/db-guard.ts` 曾因 import data-access 而把 `.env.local` 全量键注入测试进程（已改为只读 `DATABASE_URL`）；`studio-original-attachment-route` 4 例因上述环境泄漏误走本地存储分支（已固定 env 并失败关闭）；`publish-gate` 收敛为 M5 收紧后的 G5 契约。
- 单测门禁（`pnpm test:unit`）：606 通过 / 0 失败 / 2 跳过。
- `pnpm -r typecheck`：6/6 项目通过。
- `pnpm build`：通过。
- Playwright 规格解析：25 条用例 / 8 个文件。
- auth coverage strict：routes=110，public=18，protected=92，`missing_route_auth=0`，`auth_only_no_owner=0`。
- 本地环境缺口（`DEFERRED_ENV`，非代码缺陷）：`tests/data-production/independent-gate-service-runtime.test.mjs` 依赖 `openssl` CLI，本机 Windows 无此命令；该步骤在远端 CI 通过。

## 当前施工与准出

- 当前施工：M5_REMEDIATION_ACTIVE。
- M5整体：M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。
- M0：审查级EXIT_PASS，冻结继承，不重做全量盘点。
- M1—M4：仅补M5真实作品所需的具名缺口；原CONDITIONAL_EXIT和M1-C01—C04、M2-C01—C03、M3-C01—C03、M4-C01—C04继续有效。
- M6—M8：未启动，保持原依赖和准出范围。
- M5 分维度进度、批次证据与各自证据边界以 `tasks/implementation/MAB/progress.md` 为准（唯一进度账）；本文不再复写施工线细节，避免出现第二个进度真值源。

## 未关闭事项

- **SEC-01 仍开放**：`public.imported_materials` 未启 RLS，`anon`/`authenticated` 持有 SELECT/INSERT/UPDATE 权限；需权责任人在授权窗口整改，进入真实数据前必须关闭。
- **7 个 `guard:*` 在本地为红，且不在远端 CI 范围内**：已确认两类根因——`check-structure` 报 `skills/archive` 缺 `SKILL.md` 及 6 个 `SKILL_MD_NO_ENTRY`；`check-naming-map` 报真库存在未登记表名。其余（source-gate、identifier-registry、escalations、links、gate-enforcement）未逐一定位。均需具名任务处置，当前不进入 CI 门禁，也不改变本次 CI 结论。
- **生产运行证据仍为零**：全部能力停留在 `VERIFIED_ISOLATED`；无 `VERIFIED_LIVE`，正式 Gate Reviewer 未启用，M8 生产启用与旧系统退役未启动。

## 工具分工

- ChatGPT主导GitHub源码、文档、测试、CI、审查和状态回写。
- 不再使用Codex。
- 只有必须访问用户本地文件、本机浏览器、本地运行环境或本地凭据的任务，才集中交给CodeBuddy；完成后由ChatGPT核验commit与真实证据。

## 授权边界

M5范围内现有Provider必要低成本调用已获Owner授权，但必须通过受控执行器并绑定逐来源权利、purpose、输入、预算、实际费用和持久Receipt。新增Provider/账号/密钥、订阅/充值或明显扩大费用须另行确认。不得擅自执行生产DB/Storage迁移、正式Reviewer/Gate启用或公开生产发布。向 GitHub 推送需明确授权范围；本次补推与 CI 修复推送已获 Owner 授权。
