# 墨痕｜当前真实工程状态

更新：2026-11-08。本文只记录当前状态，不承担施工计划或过程日志。

## 当前工程基线

- main HEAD：`3262fe431386d4f86c1d74d963f38b768d604532`（2026-11-08质量整改最新提交）。
- 补齐推送：远端 main 此前停在 `d1cf3fc`，本地 26 个提交（M2—M5 批次 C—K）于本日补推，区间 `d1cf3fc..99a33a2`。
- 最新远端 CI（`3262fe4`）：run 42453345351 **SUCCESS**；84个测试文件通过/4跳过，614项单测通过/4跳过，172项Node测试通过/0失败，K3追溯85 API/152动作/62模块/5屏通过，Next build通过。
- 推送后基线 CI（`99a33a2`）：`ci` 42442455790 **FAILURE**；`MAB isolated PostgreSQL 17 verification` 42442455901 SUCCESS；`MAB M1 isolated authenticated HTTP acceptance` 42442455811 SUCCESS。失败步骤为 MAB 74 目标交接审计，根因 `target-diff.csv` 携带 UTF-8 BOM（表头首列成为不可见的 `\uFEFFpath`），已在 `3f8cc1b` 修复。

## 当前测试与门禁事实

- 最新GitHub CI Vitest：**614通过/0失败/4跳过**（84个文件通过、4跳过）；Node集成/边界测试：**172通过/0失败**。此前`3f8cc1b`全量隔离套件668通过/0失败/2跳过仍作为历史基线，不与本轮CI计数混写。
- 10 项历史失败已于 `3f8cc1b` 全部处置，**未使用 skip 或放宽断言**：5 个文件因全量配置缺 `next/server`、`next/headers` 别名而无法收集（已补齐，与 unit 配置同源）；`tests/setup/db-guard.ts` 曾因 import data-access 而把 `.env.local` 全量键注入测试进程（已改为只读 `DATABASE_URL`）；`studio-original-attachment-route` 4 例因上述环境泄漏误走本地存储分支（已固定 env 并失败关闭）；`publish-gate` 收敛为 M5 收紧后的 G5 契约。
- 最新单测门禁：614通过 / 0失败 / 4跳过。
- `pnpm -r typecheck`：6/6 项目通过。
- `pnpm build`：通过。
- Playwright 规格解析：25 条用例 / 8 个文件。
- auth coverage strict：routes=110，public=18，protected=92，`missing_route_auth=0`，`auth_only_no_owner=0`。
- 本地环境缺口（`DEFERRED_ENV`，非代码缺陷）：`tests/data-production/independent-gate-service-runtime.test.mjs` 依赖 `openssl` CLI，本机 Windows 无此命令；该步骤在远端 CI 通过。

## 当前施工与准出

- 当前施工：M5_REMEDIATION_ACTIVE / QUALITY_REMEDIATION_ACTIVE（Trae推送后独立质量整改）。
- M5整体：M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY。
- M0：审查级EXIT_PASS，冻结继承，不重做全量盘点。
- M1—M4：仅补M5真实作品所需的具名缺口；原CONDITIONAL_EXIT和M1-C01—C04、M2-C01—C03、M3-C01—C03、M4-C01—C04继续有效。
- M6—M8：未启动，保持原依赖和准出范围。
- M5 分维度进度、批次证据与各自证据边界以 `tasks/implementation/MAB/progress.md` 为准（唯一进度账）；Trae批次K的隔离证据继续保留，但本次QR-01—QR-10质量问题未关闭前，不接受“仅剩Owner体验签收”的准出表述。

## 未关闭事项

- **SEC-01已关闭（生产只读复核）**：`public.imported_materials` RLS=true；anon/authenticated均无SELECT/INSERT/UPDATE；`mohen_app_runtime`保留SELECT。FORCE RLS=false，但应用运行角色不是该表所有者且不具绕过权限；无需重复施工。
- **7 个 `guard:*` 在本地为红，且不在远端 CI 范围内**：已确认两类根因——`check-structure` 报 `skills/archive` 缺 `SKILL.md` 及 6 个 `SKILL_MD_NO_ENTRY`；`check-naming-map` 报真库存在未登记表名。其余（source-gate、identifier-registry、escalations、links、gate-enforcement）未逐一定位。均需具名任务处置，当前不进入 CI 门禁，也不改变本次 CI 结论。
- **生产运行证据仍为零**：Studio projects=0、asset_revisions=0、private_originals表不存在、Storage buckets=0；Gate候选表存在但策略版本表/Reviewer绑定表/当前资格函数不存在；无`VERIFIED_LIVE`，M8未启动。

## 工具分工

- 2026-11-08 Owner裁决后：**Trae在用户电脑本地担任唯一工程总装执行者**，须先备份并安全同步GitHub main；按PLAN §0.2 CP0—CP5过程检查点暂停、汇报方向、接续。
- ChatGPT按需独立审计、合同和准出证据复核；不与Trae并行改写同一main。CodeBuddy仅在Trae具名环境受阻且Owner指示时接力；不再使用Codex。
- 最终目标是按原M5—M8强制门形成**Owner首用户私有真实环境**：实际Web/UI、真实全链数据/能力、按真实独立角色体验，具备对外开放质量但未授权不向公众开放；当前仅为目标，未准出。

## 授权边界

M5范围内现有Provider必要低成本调用已获Owner授权，但必须通过受控执行器并绑定逐来源权利、purpose、输入、预算、实际费用和持久Receipt。新增Provider/账号/密钥、订阅/充值或明显扩大费用须另行确认。不得擅自执行生产DB/Storage迁移、正式Reviewer/Gate启用或公开生产发布。向 GitHub 推送需明确授权范围；本次补推与 CI 修复推送已获 Owner 授权。


## 本轮质量整改快照（2026-11-08）

- 独立复核基线已更新为：`main@3262fe431386d4f86c1d74d963f38b768d604532`；CI 42453345351 SUCCESS；MAB隔离HTTP 42453345284 SUCCESS；Vercel status success。
- 当前质量整改：QR-01已实现隔离项目绑定及生产schema preflight；**QR-02已关闭**（同一连接池同一物理连接上Owner A/B/匿名连续切换正反实测，`tools/verify-qr02-session-switch.mjs`=QR02_ALL_PASS）；QR-03已补未知费用冻结/费用累计/正文超时/UTF-8上界/成功重放，持久原子预算预留未完成；QR-04/05权利动作合同与生产数据缺口已确认；QR-06/07仍开放；**QR-08已关闭**（`enable_requires` 改由 `tools/verify-local-execution-env.mjs` 独立生成证据，授权器增加隔离目标闸门+证据新鲜度闸门+逐项PASS闸门，无证据/过期/生产环境/远端库四类负例均拒绝）；QR-09 SEC-01关闭、7项Guard待复核；QR-10 M5仍HOLD。详见PLAN §0.1和progress最新记录。
- **CP1（本地隔离持久环境与M1/M2）已完成并停点**：`20261108100000` 迁移落库（nullable `director_plans.project_id` + FK，旧20条计划保持 NULL 不推断回填，请求在铸Grant前409 HOLD）；新增 `tools/check-env-parity.mjs` 环境契约检查 `ENV_PARITY_PASS`（13 PASS/2 HOLD：QR-04/05权利字段、QR-07使用事件）；本地 `mohen_dev` 快照还原到临时库后13项计数与原件sha摘要完全一致、私有原件逐字节一致；typecheck 6/6 通过，unit 615 pass/2 skip/1 失败为 `k7-five-themes` 真实外网来源不可达超时（既有联网依赖，非代码缺陷）；顺带修复 `resume-input.mjs` 符号链接在Windows被误报UNAVAILABLE（改INVALID失败关闭），data-production 套件172 pass/0 fail。生产库迁移仍未执行，M5继续 `M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`。
- 发现两个未合并候选分支：`mab/m4-provider-spend-controls-20261107`（持久预算预留候选，待适配审查）及`mab/owner-led-execution-plan-20261107`（旧计划分支，不合并）。main保持当前唯一施工基线。
- M5继续`M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`；所有能力当前仍为隔离证据，未获得生产启用授权。

## 生产只读快照（2026-11-08）

- source.sources=39；source.raw_items=98；source.source_versions=39；source_versions中rights/rights_by_action快照=0。
- Studio projects=0；studio.asset_revisions=0；studio.private_originals表不存在；Storage buckets=0。
- public.director_plans.project_id列不存在；新代码已增加schema readiness preflight，未部署该列时返回HOLD，不发起模型调用。
- control.gate_candidates存在；gate_policy_versions、gate_reviewer_bindings、current_qualification_is_valid(uuid)不存在。
- source.sources.rights无rights_by_action/external_processing/status；仅8条有basis，5条有CC BY-SA标识，3条有政府摘录限制，31条信息不完整。不得推断外部模型处理许可。
- 本次只读核查未修改生产数据库、Storage、权限、数据或密钥。
