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
- **CP1（本地隔离持久环境与M1/M2）已完成并停点**：`20261108100000` 迁移落库（nullable `director_plans.project_id` + FK，旧20条计划保持 NULL 不推断回填，请求在铸Grant前409 HOLD）；新增 `tools/check-env-parity.mjs` 环境契约检查 `ENV_PARITY_PASS`（13 PASS/2 HOLD：QR-04/05权利字段、QR-07使用事件）；本地 `mohen_dev` 快照还原到临时库后13项计数与原件sha摘要完全一致、私有原件逐字节一致；typecheck 6/6 通过，unit **616 pass / 2 skip / 0 fail**（首跑曾因把上海图书馆接口误判为不可达而记 1 失败，实测该接口 200 正常、真实原因是联网用例并行时限流超时，已把该用例超时上限放宽到 600 秒，断言未放松）；顺带修复 `resume-input.mjs` 符号链接在Windows被误报UNAVAILABLE（改INVALID失败关闭），data-production 套件172 pass/0 fail。生产库迁移仍未执行，M5继续 `M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`。
- **CP2（M3 独立生产资格）进行中**：CP2-A 唯一权利动作词典（`packages/data-access/src/rights-actions.mjs`，九动作、只认显式 `allowed`、缺失/unknown/restricted/denied 一律 HOLD 并带原因码）；CP2-B 本地 `mohen_dev` 加列 `source.sources.rights_by_action`/`rights_evidence` 与不可变 `source.source_versions.rights_snapshot`（默认全空、不推断回填，第二次改写实测被触发器拒绝）；CP2-C `tools/stamp-shl-open-data-rights.mjs` 只给上海图书馆开放数据集 27 条写显式许可（`access_view/machine_read/retain/quote=allowed`，`display/download/adapt/redistribute/external_processing=unknown`），其余 7 类 provider 未改动并列为 HOLD；CP2-D 派发器与机器 Reviewer 改读统一词典、删除 `rights.status='public_domain_secondary_use'` 推断旁路。typecheck 6/6 通过，unit **637 pass / 2 skip / 0 fail**。CP2-E（从上海图书馆开放数据取真实古籍全文原件）与 CP2-F（QR-07 回链）未完成；`verify-3-gate-chain`（7 FAIL）与 `verify-2-c-d-chain`（D05 投影键 FAIL）为本地既有签名基线失效，根因是 `control.artifact_revision_for` 对整行 `to_jsonb` 取哈希、加列后旧签名即不再"当前"，需在 CP2-E 用上海图书馆原件重建基线，不能记作通过。**CP2-E 前置实测（已更正）**：上图开放数据 `works/instances/instanceInfo` 返回目录与版本元数据；`instanceContent/instanceText/fulltext/catalog` 是我猜的路径、全部 404。吸收 `D:\work Buddy\2026-08-23-23-12-38\hushang-jingwei` 既有经验后确认：**官方 2026 改版 API 提供全文影像下载**——`POST /service_pdf_race/race/pdf/list`（`dbname`∈`gj`/`mgts`/`jp`）→ `pdf/info` 取 `data.items[].value` 为 `itemId` → `POST pdf/stream`（`itemId`+`pageNo`）；`isDownload:0` 只限整本打包，逐页可下；古籍 `gj` 纯扫描无文本层（需 OCR，繁体竖排），民国图书 `mgts` 自带 OCR 文本层可直接抽正文；限流返回 HTTP 200 + `{"state":-1,"msg":"操作频繁"}`，必须串行节流；上海地名志 `shnh/dmz` 亦属上图开放数据。可下载台账：古籍 75 部 29,386 页、民国图书 98 部 9,746 页、家谱 952 部 260,304 页；沪上经纬 `corpus/gazetteers/高层通志府州/[崇禎]松江府志九十四卷.pdf`（685 MB，itemId `14373`，1,845 页）可直接吸纳，无需重复下载。
- **CP2-E 已在授权真实原件上落到本地并跑通 D00（2026-11-08，仅本地隔离）**：新增 `tools/land-shl-original.mjs`，从沪上经纬已下载的上图逐页 PDF（gj itemId `14373`、第 51 页）按 `/Length` **原样抽取**内嵌 `/Filter/DCTDecode` 影像流（不重编码），落本地私有原件 `b0a11000-…-0004.bin`（`image/jpeg` 236,005 字节，sha256 `3b47ed4b…`，`STORED_VERIFIED` 且回读校验一致），登记 `source`/`source_version`/`raw_item` 三元链并经 D00 窄口回查一致；`stamp-shl-open-data-rights --apply` 将 SHL 来源扩到 **28/28** 显式许可并首次冻结 **28/28** 不可变 `rights_snapshot`。`tools/verify-local-execution-env.mjs` 在 HEAD `dbb2ea9` 重新全 PASS 出证后，`local-execution-authorizer run --stage D00`（run_id `c0a12000-…-0010`）产出完整 Gate 候选证据但结果为 **HOLD**（`INDEPENDENT_GATE_NOT_VERIFIED`，因本机授权器不提供独立 Gate 决策，属设计内失败关闭）。**CP2-E 未完成**：D01—D05 未开始，G0—G5 需按新 `artifact_revision` 重签；且上图古籍无文本层，D02 转写需 OCR——本机无离线 OCR 引擎，外部模型 OCR 属 `external_processing` 当前显式 `unknown` → **HOLD 待 Owner 授权**；替代路径（mgts 平台自带文本层）本机缺容器字节且 `pdf/stream` 今日空正文（疑 24 小时页配额）。
- 发现两个未合并候选分支：`mab/m4-provider-spend-controls-20261107`（持久预算预留候选，待适配审查）及`mab/owner-led-execution-plan-20261107`（旧计划分支，不合并）。main保持当前唯一施工基线。
- M5继续`M5_OVERALL_HOLD / TECHNICAL_HANDOFF_NOT_READY`；所有能力当前仍为隔离证据，未获得生产启用授权。

## 生产只读快照（2026-11-08）

- source.sources=39；source.raw_items=98；source.source_versions=39；source_versions中rights/rights_by_action快照=0。
- Studio projects=0；studio.asset_revisions=0；studio.private_originals表不存在；Storage buckets=0。
- public.director_plans.project_id列不存在；新代码已增加schema readiness preflight，未部署该列时返回HOLD，不发起模型调用。
- control.gate_candidates存在；gate_policy_versions、gate_reviewer_bindings、current_qualification_is_valid(uuid)不存在。
- source.sources.rights无rights_by_action/external_processing/status；仅8条有basis，5条有CC BY-SA标识，3条有政府摘录限制，31条信息不完整。不得推断外部模型处理许可。
- 本次只读核查未修改生产数据库、Storage、权限、数据或密钥。
- **CP2-E（Owner 2026-11-08 选定"同平台文字正文"路线）已吸纳一份真实文本原件，但 D00 准入不一致尚未修（2026-11-08，仅本地隔离）**：`tools/fetch-shl-dmz-text.mjs` 取 `shnh/dmz`（上海地名志）原始响应字节（踩实两坑：key 只能放查询参数；必须 `Accept-Encoding: identity` 否则正文尾部混入压缩残片），`tools/land-shl-original.mjs --mode text` 将其原样存为 `text/plain` 私有原件 `b0a11000-…-0006`（1,015 字节，sha256 `b6f03053…`，`STORED_VERIFIED` 回读一致），登记 `source`（`carrier_type=text_record`）→`source_version`→`raw_item` 并经 D00 窄口回查 `ok=true`；转写区间为字节 332—751（419 字节，`quote_sha256=2a2661da…`）；SHL 权利标定扩到 **29/29** 且 **29/29** 快照冻结。**阻塞点**：`pipelines/data-production/workers/private-evidence-stage.mjs` 的 D00 准入 `IMAGE_TYPE` 只收 `image/(png|jpeg|webp)`，而 D01 的 `draftTextReading` 已明确支持 `text/plain` + `utf8_byte_range/v1`——需一处最小必要适配（D00 准入放宽为 `image/* or text/plain` 并补正向测试、同步核对既有反例），**该适配尚未落地**，故文本路线 D00 仍 BLOCKED，D01—D05 与 G0—G5 仍未开始。
- **本地与生产的"预期内差异"清单（截至 2026-11-08，Owner 已选定"本地做完再一次性上生产"）**：本地 `mohen_dev` `source.sources=42`/`source_versions=42`/`raw_items=102`/私有原件 4 份、SHL 显式许可 29 条、冻结权利快照 29 份；生产为 `sources=39`/`versions=39`/`raw_items=98`、`rights_by_action` 与 `rights_snapshot` 两列不存在、SHL 许可 0 条、`studio.private_originals` 表尚未创建。差异来源是 CP2-B 迁移（仅在本地）与 CP2-C/E 的标定/落库（仅在本地）；`tools/check-env-parity.mjs` 会持续把这些项报为 HOLD，待 CP2 全部在本地验证完成后一次性上生产并重签 Gate。
