# 墨痕｜当前施工断点

> 核验时间 2026-11-21 第二批（批次起始 HEAD `6fc424d`，local=remote 分叉 0/0，无其他写入方）｜环境：本地定向/全量测试 + 云端 admin 只读事实核对；未验证项：CI 宿主（本机 gh 缺失 → `DEFERRED_ENV`）、Vercel 侧 Provider 环境变量（未做未授权外部调用）。

**本批（2026-11-21 第二批）结论：D02 续跑输入合约已补齐，但真实 run 无法离开 D01——阻断不在代码能力，而在三处授权/素材条件（见下）。**

**Studio 已登记原件 → D00 接收已验收 → 独立 G0（`888db9e6`）与 G1（`292792c8`）均已签发 PASS。**

**真实 run `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 现状**：`current_stage=D01`、`HOLD`，终态 `INDEPENDENT_GATE_NOT_VERIFIED / INDEPENDENT_GATE_VERIFY_DENIED`（早于 G1 签发，未重跑）。资格层已成立：G0 `888db9e6` PASS/current（valid_until 11-26）、G1 `292792c8-aad1-485d-9e3d-b73d5914c14d` PASS/independent_gate/current（valid_until 2026-11-27T07:38Z）；`stage_binding` = {job `d01.carrier-reading`、input `002bb07f…`、output `fa256f6d…`、reviewer `m5-owner-reviewer-g0g1-producer`}。**本批只读回读：L1 仅一条 `read_unit 215b61ef` = `C02`/`page`/`scanned_page/v1`/`uncertainty.interpretation=not_performed`；项目原件仅 1 份 `image/jpeg`（260,342 B），无 text/plain 原件。**

**本批能力（`CODE_PRESENT`+`VERIFIED_ISOLATED`）**：①`adapter-binding.mjs` 新增 `isTypedD02ReadingRequest`（D02 生成请求的纯形状校验，无授权语义）；②`resume-input.mjs` D02 受信输入接受 orchestrator 派生的 `readUnitId + reading` 形态，并把 qualified reading / observation / legacy link 定为三选一互斥——修复前该派生请求会被续跑入口拒绝，即"G1 合格也无法续跑 D02"；③测试：定向 15/15 PASS，全量 `tests/data-production` 409 tests / 405 pass / 4 fail（4 条为既有基线）。零 DDL、零付费、未改核心 Gate 与 Worker 判据。

**下一动作（最前阻断，需 Owner 裁决，三者缺一不可）**：①C02 扫页 → 可验文本的转录路径（授权 OCR/VLM Tool，或改用 `text/plain` 原件；D02 Worker 硬性要求 `method_code==='C01'` + 原文 `text/plain` + `utf8_byte_range/v1`）；②D02 H05 生成的付费 Provider 委派/预算/权利（`MOHEN_PRIVATE_D02_DELEGATION_ID`/`MODEL`，现为零付费窗口）；③云端 D02 阶段授权端点与一次性 journal（现仅 D00/D01 有 `token`/`issue`/`consume`）。另：既有 `privateD02Request` 仅覆盖 C01 文本，C02 扫页一律落 `PRIVATE_NEXT_STAGE_REQUEST_NOT_READY`。八维维持 `0/8 OVERALL_HOLD`；本批 ¥0。

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6` 已提交 D00 接收候选 `48766904`（后由 G0 重签候选 `c50a941c` 承接，均 CONSUMED）。原件 SHA 和 Raw 关联通过回读。

**B 路径历史要点（2026-11-20 已完成，保留）**：云端机器审核账号恢复；低权 signer `mohen_gate_signer_m5_machine` 安装并验登录；按真实 CC BY-SA 3.0 授权据实补来源 `47875bca…` 的 `machine_read=allowed` + `basis`；因云端 `sign_gate_candidate` 仍是旧版（只认精确 scope），新增精确 scope binding `d2307be3`（G0，project e03c4ba8，30 天）与本批 `ba571016`（G1，同口径）；G0 先以 `802c740f` 签发、后带真实 `stage_binding` 重签为 `888db9e6`（旧审计保留非当前）。

**Runner 消费与 D01 续跑历史要点（2026-11-20，保留）**：进程内低权 reader verifier、终态持久 reader 凭据 `e7a89d2f…`（绑 `d2307be3`、valid_until 2027-12-20）、D01 续跑 A/B/C/D 四段（`4fd763d`/`7f8cfa5`/`73b84c8`/`da0df48`）、自检通道 `/api/internal/self-test-resume`、probe 回归闭环（`d9ace70` + 无缓存重部署 `7ad46u6ba` → `runner_ready`）。该链条已支撑真实 D01 执行到 G1。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
