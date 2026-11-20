# 墨痕｜当前施工断点

> 核验时间 2026-11-20 15:40 +08:00｜HEAD `5996574`｜local=remote **分叉 ahead 2 / behind 0 — PENDING_PUSH**（本机代理 127.0.0.1 连不上 github.com:443，非文档问题；恢复后须 push 两个本地提交 `a1453cd`、`5996574`）｜环境：本地 mohen_dev（回写后）+ 云端 mohen-cloud；未验证项：CI 宿主、独立 G0 签发、正式读取命中。今日已完成云端→本地回写与 push，并完成 B 路径第①项云端 signer 安装（详见 progress 今日批次）。

**Studio 已登记原件 → D00 接收已验收，停在独立 G0 审核前。**

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 已提交 D00 接收候选 `48766904-c409-4b37-b602-9339a582b7e6`（SUBMITTED），绑定原 Source Version `67839b1e-a344-4dd4-adf8-f7798ddf82d7`。原件 SHA 和 Raw 关联通过回读。

⑤接收断点关闭。执行器外层仍记录 HOLD / CLOUD_EXECUTOR_PROCESS_FAILED，保留该收尾结果。独立 G0 决定与后续阶段候选均为零，machine_read 仍为 unknown。按原范围在此停止。

**B 路径进展（2026-11-20）**：云端机器审核账号已恢复（active/reviewer），G0 专用低权 signer `mohen_gate_signer_m5_machine` 已安装且只读回读 VERIFY: PASS（非 super/非 bypassrls/仅继承签名执行权/无 Gate 写权，RLS scope=真实 project）。但前置核查确认：当前 project `e03c4ba8` 上 `gate_reviewer_bindings` 与 `gate_service_credentials` 的 G0 精确 scope 命中均为 0，现有机器 binding 绑测试 project 或通配 scope，不可冒用；因此独立 G0 签发仍会 HOLD。G0 policy（enabled=true）、session key、执行许可 journal 1 条已齐备。

**下一动作**：先为当前真实 project 安装合法受限的 G0 reviewer binding 与 service consume credential（须 Owner 具名放行；不写 qualification_current、不伪造 Gate），再由 Owner 设置 signer/reader 登录口令，最后由工程侧用本地 Node 双连接池驱动真实 G0 签发并回读 gate_audits。Vercel Preview 10 个环境变量与 Ed25519 私钥注入是否必需，待本地签发路径确认后决定，避免重复配置。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
