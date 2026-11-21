# 墨痕｜当前施工断点

> 核验时间 2026-11-21（批次起始 HEAD `6b6a29c`，local=remote 分叉 0/0，无其他写入方；云端 DB now `2026-11-21T09:1xZ`）｜环境：本地定向测试 + 云端 mohen-cloud 真实签发/回读（机器 signer 与 admin 只读双连接池）；未验证项：CI 宿主（本机 gh 缺失 → `DEFERRED_ENV`，不伪造结论）。B 路径已完成云端 signer 安装、权利事实登记、G0/G1 精确 scope binding、真实 G0 签发与重签（`888db9e6` current）、Runner 低权 reader 消费、D01 typed 校验。**本批（2026-11-21）完成 D01→G1 独立签发闭环**：补齐 D01 阶段输出的独立重建 attester + 重复候选的摘要绑定定位，云端真实签发 G1 审计 `292792c8` 并写入资格。旧审计与旧候选原样保留（详见 progress 2026-11-21 批）。

**Studio 已登记原件 → D00 接收已验收 → 独立 G0（`888db9e6`）与 G1（`292792c8`）均已签发 PASS，当前停在 D01→D02 typed 转换前。**

**真实 run `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 现状**：`current_stage=D01`、`HOLD`，终态 `INDEPENDENT_GATE_NOT_VERIFIED / INDEPENDENT_GATE_VERIFY_DENIED`（该终态产生于本批签发之前，未重跑）。资格层已成立：G0 `888db9e6` PASS/current（valid_until 11-26）、**G1 `292792c8-aad1-485d-9e3d-b73d5914c14d` PASS/independent_gate/current（valid_until 2026-11-27T07:38Z）**，`qualification_current` 含 `read_unit 215b61ef-11c5-d0e9-e76b-711ed237cde6`（revision `dc8f0ec9…`）；`stage_binding` = {job `d01.carrier-reading`、input `002bb07f…`、output `fa256f6d…`、reviewer `m5-owner-reviewer-g0g1-producer`}。候选 `ee37c47b` = CONSUMED，另两条同输入指纹的重复候选保留 SUBMITTED（不可变，不删）。

**本批能力（`CODE_PRESENT`+`VERIFIED_ISOLATED`+`VERIFIED_LIVE`）**：①`tools/gate-stage-output-attestation.mjs` 新增 `attestG1ReadingStageOutput`/`deriveD01ReadingStageDigests`/`attestStageOutputForRequest`——D01 输入与输出均从持久事实独立重建（G0 当前批准方法计划、run scope、`read_units.locator`、`read_runs.config.request_digest`、`artifact_revision_for`），C01 仅全文可重建、片段失败关闭；②`selectDigestBoundStageCandidate` 解决重复候选：只认重建摘要严格相符的唯一一条，0/多匹配 HOLD；③`rule-gate-reviewer.mjs` CLI 支持 `--candidate`/`--attest-stage-binding`；④测试 12/12 PASS，全量 `tests/data-production` 403/4（4 条为既有基线）。证据边界：原 Runner 已退出，D01 那次 Producer 的 `output_digest` 无留存，本次绑定摘要为 signer 独立重建（输入侧有候选指纹交叉校验）。

**下一动作（唯一最前阻断，非凭据问题）**：D01→D02 typed 转换未实现（`PRIVATE_NEXT_STAGE_REQUEST_NOT_READY`），且云执行器只传 `--to`、无 D02 续跑入口；需另批做 D02 typed 请求 + D02 续跑路径，随后才能让真实 run 离开 D01。八维维持 `0/8 OVERALL_HOLD`；零付费模型调用（本批 ¥0）。

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6` 已提交 D00 接收候选 `48766904`（后由 G0 重签候选 `c50a941c` 承接，均 CONSUMED）。原件 SHA 和 Raw 关联通过回读。

**B 路径历史要点（2026-11-20 已完成，保留）**：云端机器审核账号恢复；低权 signer `mohen_gate_signer_m5_machine` 安装并验登录；按真实 CC BY-SA 3.0 授权据实补来源 `47875bca…` 的 `machine_read=allowed` + `basis`；因云端 `sign_gate_candidate` 仍是旧版（只认精确 scope），新增精确 scope binding `d2307be3`（G0，project e03c4ba8，30 天）与本批 `ba571016`（G1，同口径）；G0 先以 `802c740f` 签发、后带真实 `stage_binding` 重签为 `888db9e6`（旧审计保留非当前）。

**Runner 消费与 D01 续跑历史要点（2026-11-20，保留）**：进程内低权 reader verifier、终态持久 reader 凭据 `e7a89d2f…`（绑 `d2307be3`、valid_until 2027-12-20）、D01 续跑 A/B/C/D 四段（`4fd763d`/`7f8cfa5`/`73b84c8`/`da0df48`）、自检通道 `/api/internal/self-test-resume`、probe 回归闭环（`d9ace70` + 无缓存重部署 `7ad46u6ba` → `runner_ready`）。该链条已支撑真实 D01 执行到 G1。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
