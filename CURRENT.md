# 墨痕｜当前施工断点

> 核验时间 2026-11-20（批次起始 HEAD `1605634`，local=remote 分叉 0/0；云端 DB now `2026-11-20T11:03Z`）｜环境：本地定向测试 + 云端 mohen-cloud 真实签发/回读（机器 signer 与低权 reader 双连接池）；未验证项：CI 宿主（本机 gh 缺失、web 读 Actions 返回 404，记 `DEFERRED_ENV`，不伪造结论）、托管环境持久 reader 凭据注入（本批用临时低权登录验证能力）。本机 `http.proxy=127.0.0.1:51081` 不通 GitHub，push 一律用 `git -c http.proxy= -c https.proxy= push origin main`。B 路径已完成云端 signer 安装、权利事实登记、精确 scope binding、真实 G0 签发与带 `stage_binding` 重签（`888db9e6` current）、低权 reader 回读 PASS；Owner 全权授权后本批补齐 **Runner 进程内低权 reader 资格消费**（复用只读 `/current`，隔离测试+真实云端均 PASS）与 **D01 typed 载体一致性校验**。旧审计 `802c740f` 原样保留为非当前（详见 progress 今日末批）。

**Studio 已登记原件 → D00 接收已验收 → 独立 G0 已签发 PASS，停在 D00→D01 阶段绑定 / consume 回读前。**

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 已提交 D00 接收候选 `48766904-c409-4b37-b602-9339a582b7e6`（SUBMITTED），绑定原 Source Version `67839b1e-a344-4dd4-adf8-f7798ddf82d7`。原件 SHA 和 Raw 关联通过回读。

⑤接收断点关闭。执行器外层仍记录 HOLD / CLOUD_EXECUTOR_PROCESS_FAILED（历史收尾，保留）。

**B 路径进展（2026-11-20，已完成）**：云端机器审核账号恢复（active/reviewer）；低权 signer `mohen_gate_signer_m5_machine` 安装并验登录通过；按真实 CC BY-SA 3.0 授权为来源 `47875bca…` 据实补 `machine_read=allowed` + `basis`（不改 Gate/资格/其他数据）；因云端函数仍是旧版（只认精确 scope，无 studio_project 规则分支），新增精确 scope binding `d2307be3…`（G0 + project e03c4ba8 + 30 天）。云端 dry-run 三检查全 PASS 后落库签发。

**独立 G0 签发结果（里程碑）**：候选 `48766904` 已 `CONSUMED`；G0 审计 `802c740f-d3d0-45c8-80e8-e85798ccab35` = PASS / independent_gate / producer，`current=true`，valid_until `2026-11-26T08:38Z`；`qualification_current` 已写入。历史首次真实作品独立 G0 机器签发成功（此前仅隔离测试 PASS）。

**两缺口只读核验结论（2026-11-20，不改库、不签发、不注入凭据）**：

- **缺口1｜consume 回读**：admin 只读探针（backups `_verify_g0_current_read_20261120.mjs`）实证审计 `802c740f` = PASS / independent_gate / `current_valid=true` / valid_until `2026-11-26T08:38Z`；`qualification_current` 有对应行（source_version `67839b1e`、revision `28de6385…`）；`control.qualification_allows(audit,'producer','data-production','m5-remediation','v1',{"project_id":e03c4ba8…})` = **true**，下游资格谓词成立。但审计 `details->'stage_binding'` 为 NULL（`has_stage_binding=false`），而 consume RPC `read_gate_stage_qualification` 强制要求四项摘要精确匹配且经 `mohen_gate_reader` 低权登录——**完整 typed consume 回读当前被阻断，不写成 PASS**。consume credential `f0355674…` 明文不在本地（仅存 SHA-256 hash），按云端时钟尚未到 13:10Z（now 08:57Z）但已无法复原 token，不能伪造 reader 登录。
- **缺口2｜D00→D01 typed handoff（能力本批已补齐，`CODE_PRESENT`）**：原核验确认无图片阶段绑定实现；Owner 2026-11-20 授权后本批新增 `attestG0ImageStageOutput`（`tools/gate-stage-output-attestation.mjs`），`local-gate-service.mjs` 按候选持久 `method_plan`（C01→text / C02→image）分派，新增 `tests/data-production/gate-stage-image-attestation.test.mjs`。**非循环设计**：`page_number` 不取 Producer 请求，而从 signer 可读的持久化 `control.production_runs.scope` 读取（真实 run `bfcdfad6` scope 含 `page_number=1` + original/version/raw_sha256，D00 grant 已绑定），carrier 从 DB `content_type` 复核，sha/byte/page_sha256 全由 signer 独立读回，digest 不匹配即失败关闭。真实候选 `48766904` 只读干跑（`backups/_dryrun_image_attest_real_20261120.mjs`）**DRY_ATTEST_PASS / DIGEST_MATCH=true**（method C02、image/jpeg、page 1、digest `002bb07f…`）。能力已随重签审计 `888db9e6` 生效（见下）。

**三写操作已完成（Owner 2026-11-20 授权）**：①新候选 `c50a941c…` 由真实候选 `48766904` 的事实原样复制成 SUBMITTED，机器 signer **带真实 `stageRequest`** 重签 → 新审计 `888db9e6-87bd-42b5-a932-4489e0270a5b` = PASS / independent_gate / `current=true` / valid_until `2026-11-26T11:03:30Z`，`details.stage_binding` 含真实 `input_digest=478a8668…` / `output_digest=002bb07f…` / job / reviewer_binding_ref / consumer；旧审计 `802c740f` 原样保留、非当前，`qualification_current` 已指向新审计。②新建临时低权 reader 登录 + consume credential，以真实 `mohen_gate_reader` 会话调用 `control.read_gate_stage_qualification` → PASS receipt（audit/双 digest/current 全对），错 output_digest、错 run_id 两负例均返回 null；验证后凭据已撤销、临时登录已删除。③验证脚本在 gitignored `backups/`，未部署生产、未公众开放、未新增付费、密钥未入 git/日志/对话。

**Runner 进程内消费 + D01 typed 贯通（Owner 全权授权，本批完成，`VERIFIED_ISOLATED`+`VERIFIED_LIVE`）**：①新增 `pipelines/data-production/orchestrator/inprocess-gate-reader-verifier.mjs`——复用只读 `createIndependentGateService({readOnly:true})` + `createIndependentGateClient`，用独立低权 reader pool（禁 postgres/producer/signer/authority 身份）进程内跑 `/current`；`run.mjs` 注入：配置 `MOHEN_RUNNER_GATE_READER_DATABASE_URL`+`MOHEN_RUNNER_GATE_CONSUME_CREDENTIAL`（+可选 CA）即用它，否则回退托管 HTTPS client，二者皆无仍 HOLD（无 fallback PASS）。②新增 `tests/data-production/inprocess-gate-reader-verifier.test.mjs` 4/4 PASS；Gate/Runner 定向全套 24/24 PASS。③**真实云端**：临时低权 reader + consume credential 进程内读到真审计 `888db9e6` PASS receipt（双 digest/current 全对、错 digest 拒绝），验证后凭据撤销、登录删除（`backups/_verify_inprocess_verifier_live_20261120.mjs`）。④D01 typed 贯通：`adapter-binding.mjs` 的 `isTypedPrivateStageRequest` 对 D01 增加 method_plan↔载体一致性形状校验（`isTypedD01Carrier`，C02→scanned_page/v1/sha 自洽、C01→verified_utf8_full/v1；无 method_plan 保留历史兼容），D02–D05 不变；新增测试，adapter/orchestrator 全套 48/48 PASS。全量 `tests/data-production/*.test.mjs` 386 中 4 失败为既有基线（Windows `file://` scheme、private-candidate holding、studio 知识路由 source-gap 语义），与本批无关。

**下一动作（非阻断）**：真正跑一轮带 reader 的 D00→D01 Runner 需在托管环境提供持久低权 reader URL + consume credential（本批用临时登录验证能力，未留持久凭据）；D01→D02 非 C01 的 typed 转换仍未实现（`PRIVATE_NEXT_STAGE_REQUEST_NOT_READY`）。CI 宿主仍 `DEFERRED_ENV`，不伪装 PASS。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
