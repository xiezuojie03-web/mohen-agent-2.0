# 墨痕｜当前施工断点

> 核验时间 2026-11-20 16:40 +08:00｜HEAD `a3b35d0`｜local=remote 分叉 0/0｜环境：本地 mohen_dev（回写后）+ 云端 mohen-cloud；未验证项：CI 宿主、consume/Runner handoff、正式读取命中。本机 `http.proxy=127.0.0.1:51081` 不通 GitHub，历次 push 均用直连完成，待 Owner 环境侧修复。今日完成 B 路径云端 signer 安装、权利事实登记、精确 scope binding，并**首次在真实作品上完成独立 G0 机器签发**（详见 progress 今日末批）。

**Studio 已登记原件 → D00 接收已验收 → 独立 G0 已签发 PASS，停在 D00→D01 阶段绑定 / consume 回读前。**

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 已提交 D00 接收候选 `48766904-c409-4b37-b602-9339a582b7e6`（SUBMITTED），绑定原 Source Version `67839b1e-a344-4dd4-adf8-f7798ddf82d7`。原件 SHA 和 Raw 关联通过回读。

⑤接收断点关闭。执行器外层仍记录 HOLD / CLOUD_EXECUTOR_PROCESS_FAILED（历史收尾，保留）。

**B 路径进展（2026-11-20，已完成）**：云端机器审核账号恢复（active/reviewer）；低权 signer `mohen_gate_signer_m5_machine` 安装并验登录通过；按真实 CC BY-SA 3.0 授权为来源 `47875bca…` 据实补 `machine_read=allowed` + `basis`（不改 Gate/资格/其他数据）；因云端函数仍是旧版（只认精确 scope，无 studio_project 规则分支），新增精确 scope binding `d2307be3…`（G0 + project e03c4ba8 + 30 天）。云端 dry-run 三检查全 PASS 后落库签发。

**独立 G0 签发结果（里程碑）**：候选 `48766904` 已 `CONSUMED`；G0 审计 `802c740f-d3d0-45c8-80e8-e85798ccab35` = PASS / independent_gate / producer，`current=true`，valid_until `2026-11-26T08:38Z`；`qualification_current` 已写入。历史首次真实作品独立 G0 机器签发成功（此前仅隔离测试 PASS）。

**下一动作**：①核验 consume 通道能否回读该 G0 current（现有 consume credential token 明文不在本地、且 2026-11-20 13:10Z 到期，需据实处理）；②D00→D01 typed handoff：本候选原件为图片扫描件（C02），现成 `attestG0TextStageOutput` 仅支持 text/plain+C01，图片阶段绑定路径需另行核验或如实报缺口。Vercel Preview 环境变量与 Ed25519 私钥注入暂不需要（本地签发路径已通）。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
