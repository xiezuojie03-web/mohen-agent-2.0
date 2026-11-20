# 墨痕｜当前施工断点

> 核验时间 2026-11-20 16:57 +08:00（云端 DB now `2026-11-20T08:57Z`）｜HEAD `65e5b2a5d0a3226720330f8f09f19ca2f57d516e`｜local=remote 分叉 0/0｜环境：本地只读核验 + 云端 mohen-cloud admin 只读探针；未验证项：CI 宿主（本机 gh 缺失、web 读 Actions 返回 404，记 DEFERRED_ENV，不伪造结论）、Runner typed consume 回读（本批核实被阻断，见下）、正式读取命中。本机 `http.proxy=127.0.0.1:51081` 不通 GitHub，push 一律用 `git -c http.proxy= -c https.proxy= push origin main`。今日完成 B 路径云端 signer 安装、权利事实登记、精确 scope binding，**首次真实作品独立 G0 机器签发**，并对两个断点缺口做只读核验（详见 progress 今日末批）。

**Studio 已登记原件 → D00 接收已验收 → 独立 G0 已签发 PASS，停在 D00→D01 阶段绑定 / consume 回读前。**

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 已提交 D00 接收候选 `48766904-c409-4b37-b602-9339a582b7e6`（SUBMITTED），绑定原 Source Version `67839b1e-a344-4dd4-adf8-f7798ddf82d7`。原件 SHA 和 Raw 关联通过回读。

⑤接收断点关闭。执行器外层仍记录 HOLD / CLOUD_EXECUTOR_PROCESS_FAILED（历史收尾，保留）。

**B 路径进展（2026-11-20，已完成）**：云端机器审核账号恢复（active/reviewer）；低权 signer `mohen_gate_signer_m5_machine` 安装并验登录通过；按真实 CC BY-SA 3.0 授权为来源 `47875bca…` 据实补 `machine_read=allowed` + `basis`（不改 Gate/资格/其他数据）；因云端函数仍是旧版（只认精确 scope，无 studio_project 规则分支），新增精确 scope binding `d2307be3…`（G0 + project e03c4ba8 + 30 天）。云端 dry-run 三检查全 PASS 后落库签发。

**独立 G0 签发结果（里程碑）**：候选 `48766904` 已 `CONSUMED`；G0 审计 `802c740f-d3d0-45c8-80e8-e85798ccab35` = PASS / independent_gate / producer，`current=true`，valid_until `2026-11-26T08:38Z`；`qualification_current` 已写入。历史首次真实作品独立 G0 机器签发成功（此前仅隔离测试 PASS）。

**两缺口只读核验结论（2026-11-20，不改库、不签发、不注入凭据）**：

- **缺口1｜consume 回读**：admin 只读探针（backups `_verify_g0_current_read_20261120.mjs`）实证审计 `802c740f` = PASS / independent_gate / `current_valid=true` / valid_until `2026-11-26T08:38Z`；`qualification_current` 有对应行（source_version `67839b1e`、revision `28de6385…`）；`control.qualification_allows(audit,'producer','data-production','m5-remediation','v1',{"project_id":e03c4ba8…})` = **true**，下游资格谓词成立。但审计 `details->'stage_binding'` 为 NULL（`has_stage_binding=false`），而 consume RPC `read_gate_stage_qualification` 强制要求四项摘要精确匹配且经 `mohen_gate_reader` 低权登录——**完整 typed consume 回读当前被阻断，不写成 PASS**。consume credential `f0355674…` 明文不在本地（仅存 SHA-256 hash），按云端时钟尚未到 13:10Z（now 08:57Z）但已无法复原 token，不能伪造 reader 登录。
- **缺口2｜D00→D01 typed handoff**：核验确认**无图片（C02 / image/jpeg）阶段绑定实现**。唯一 attester `attestG0TextStageOutput`（`tools/gate-stage-output-attestation.mjs`）仅 C01 + text/plain，且对 C02/image 显式失败关闭；`tools/local-gate-service.mjs:116-130` 硬编码该 attester 并对图片/高阶段 HOLD。验证/消费侧（`auditHasExactStageBinding`、`read_gate_stage_qualification`）本身媒介无关，但签发侧缺图片输出重构与 `stageRequest` 接线，且真审计无 `stage_binding`。这是真实能力缺口，不硬凑。

**下一动作（需 Owner 授权，均超本批只读/不改库边界）**：①按媒介扩展独立 attester（`attestG0ImageStageOutput` + `local-gate-service` 按候选 content_type/method_plan 分派）并补 image 正反隔离 PG/单测；②以独立 signer **带 `stageRequest` 重新签发**含 `stage_binding` 的 G0（新审计，不覆盖旧审计），或授权补签；③新建未过期 consume credential 并以 `mohen_gate_reader` 低权身份跑通 `/current` + `requireIndependentStageQualification` 回读；④之后才评估 D01 typed input 贯通。上游两项涉及 Gate 重签与凭据注入，属需单独授权动作，先如实报缺口。Vercel Preview 环境变量与 Ed25519 私钥注入暂不需要（本地签发路径已通）。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
