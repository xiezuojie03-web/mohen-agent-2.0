# 墨痕｜当前施工断点

> 核验时间 2026-11-21 第四批（批次起始 HEAD `da1494d`，local=remote 分叉 0/0，无其他写入方）｜环境：本地隔离库真实取件与登记回读 + 外网来源实测；未验证项：云端库（本会话无凭据，未做任何云端写入）、CI 宿主（本机 gh 缺失 → `DEFERRED_ENV`）、私有原件落库（本地缺少合规 worker 登录角色）。

**本批（2026-11-21 第四批）结论：生产链已能自己找到并核验真实史料，但取件落库被环境身份挡住、真实 run 因无云端凭据本批无法推进。**

**已找到的真实材料（可复现）**：维基文库《欽定大清一統志（四庫全書本）》卷058（松江府），固定修订 `oldid 745167`，`action=raw&oldid=745167` 取件 **55,958 字节**、SHA-256 `6cd08f0a…3523`（三次独立取件一致）；内证「珠街鎮（在青浦縣西十里，商賈輻輳，為邑巨鎮）」「朱家角」「津梁」。**关键段落字节位置：珠街鎮 43,629、朱家角 45,775、津梁 47,033**——均超过单次全文读取上限 32768 B，D01 只能走有界片段 extent（且须 G0 批准的 C01 范围），不能再用"全文直读"。

**本批修复的真实缺陷（`tools/acquire-http-file.mjs`，Y07 取件此前根本落不了库）**：①`content_availability` 写死 `file_download` 与库内 CHECK 冲突 → 改 `--content-availability`（默认 `full_content`）；②首次建来源无法带权利依据 → 新增 `--rights-evidence`（只登记不推断，冲突报 `HTTP_SOURCE_RIGHTS_CONFLICT`）；③网络层失败不重试 → 与 429/403/5xx 同规则重试；权利比较改规范化键序。

**本地隔离库已落（回读核验）**：需求回执 `090b7c4a…`（produced_by `Y01/production-self-acquisition`）；来源 `b8ca4183-491c-45b4-88e9-2b34f0fe7ae8`（provider `wikisource`、`digital_text`、`full_content`、`verified`）携显式 `rights_by_action`（读/下载/保有/引用 allowed；展示/改编/再分发/外发模型 denied）与 `rights_evidence`（PD-old + 转录层 CC BY-SA 4.0 署名义务 + 裁决 A 本地隔离范围 + 「未经 Owner 逐条复核」边界声明）。**字节未落**：`source_versions=0`。

**新阻断（环境身份，非代码）**：落私有原件需合规私有 worker 登录；`assertPrivateWorkerIdentity` 拒绝以 NOLOGIN 的 `mohen_private_worker` 直连，而本机 dev 库无 `mohen_m5_worker_login`（迁移 `20261117020000` 未在本机应用，且要求上线前单独轮换口令）→ 按纪律不自行造角色/口令绕过。

**通道可用性（实测，第五批已更正）**：archive.org 443 超时；`shidianguji.com` robots 全站 Disallow；`圖書集成` 職方典松江府各卷为 423 B 占位；`三呉水考/卷04`(33,717 B)、`江南通志/卷025`(39,929 B) 均超 32 KiB；**上图通道本身可用——上一批"Key 失效"的判断是错的**：`gj/webapi/works`、`gj/webapi/instances`、`shnh/dmz/webapi/geonames` 在 `data1.library.sh.cn` 上已一律 `{"result":"-1"}`，同一套 query 换到 `data.library.sh.cn` 才正常返回（已改 BASE 并实跑验证）。

**云端真实 run `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 仍为 `HOLD@D01`**（上批事实，未变）：G0 `888db9e6`、G1 `292792c8` 均 PASS/current；L1 仅一条 `read_unit 215b61ef`（C02 页定位、`interpretation=not_performed`）；原件为 Commons 照片（无 `external_processing`、C04 仍 `HOLD`）；D02 生成仍需付费 Provider（`MOHEN_PRIVATE_D02_DELEGATION_ID`/`MODEL`），云端无 D02 阶段授权端点。八维维持 `0/8 OVERALL_HOLD`；本批 ¥0。

**上批（2026-11-21 第二批）结论：D02 续跑输入合约已补齐，但真实 run 无法离开 D01——阻断不在代码能力，而在三处授权/素材条件。**

**Studio 已登记原件 → D00 接收已验收 → 独立 G0（`888db9e6`）与 G1（`292792c8`）均已签发 PASS。**

**真实 run `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 现状**：`current_stage=D01`、`HOLD`，终态 `INDEPENDENT_GATE_NOT_VERIFIED / INDEPENDENT_GATE_VERIFY_DENIED`（早于 G1 签发，未重跑）。资格层已成立：G0 `888db9e6` PASS/current（valid_until 11-26）、G1 `292792c8-aad1-485d-9e3d-b73d5914c14d` PASS/independent_gate/current（valid_until 2026-11-27T07:38Z）；`stage_binding` = {job `d01.carrier-reading`、input `002bb07f…`、output `fa256f6d…`、reviewer `m5-owner-reviewer-g0g1-producer`}。**本批只读回读（2026-11-21 第三批补正）**：L1 仅一条 `read_unit 215b61ef` = `C02`/`page`/`scanned_page/v1`/`uncertainty.interpretation=not_performed`。**该原件不是书影，而是一张 Commons 照片**：`source 47875bca` = provider `wikimedia-commons`、title `朱家角古镇，Zhujiajiao Water Village - panoramio.jpg`、`source_type=image`、`content_availability=image_scan`（`carrier_type=scanned_page` 为 D00 登记标签，不等于材料是扫描书页）。`rights_by_action` 仅 `retain/download/access_view/machine_read=allowed`，**无 `external_processing`**；`C04`（照片、版画与插图）在方法表中仍是 `implementation_binding:"HOLD"`。因此"OCR 转录"对本材料无字可读、外部 VLM 亦无权利授权。

**上批能力（`CODE_PRESENT`+`VERIFIED_ISOLATED`）**：①`adapter-binding.mjs` 新增 `isTypedD02ReadingRequest`（D02 生成请求的纯形状校验，无授权语义）；②`resume-input.mjs` D02 受信输入接受 orchestrator 派生的 `readUnitId + reading` 形态，并把 qualified reading / observation / legacy link 定为三选一互斥——修复前该派生请求会被续跑入口拒绝，即"G1 合格也无法续跑 D02"；③测试：定向 15/15 PASS，全量 `tests/data-production` 409 tests / 405 pass / 4 fail（4 条为既有基线）。零 DDL、零付费、未改核心 Gate 与 Worker 判据。

**上上批（第三批）已确认 A′ 中"由 Owner 上传有字原件"这一步不再需要**：第六批已用上图通道取到并落库两条地名志正文（`朱家角` 1,259 B / `朱家角镇` 1,411 B，含"放生桥""淀浦河/朱昆河/朱泖河""聚落跨井亭港两侧"），来源 `879cb42a…`、`e97724c8…` 各 1 版本 + 1 raw_item，权利按 Owner 2026-11-08 裁定写入。第七批已在**本机 dev 库**应用仓库既有迁移 `20261119235412`（函数替换），两条来源的 `d00_lookup.ok=true`、`SHL_LAND_TEXT_OK`，私有原件→L0→D00 绑定打通（云端账本早有同名迁移）。当前前置条件仅剩：①云端库凭据（真实 run `bfcdfad6` 在云端，本会话不可达）；②D02 生成仍需付费 Provider 与云端 D02 阶段授权端点。本机 `mohen_dev` 无迁移账本、结构由历年 SQL 直接应用，版本核对须以 catalog 盘查为准。

**其余最前阻断（承接上批）**：②D02 H05 生成需付费 Provider 委派/预算/权利（`MOHEN_PRIVATE_D02_DELEGATION_ID`/`MODEL`，现零付费）；③云端无 D02 阶段授权端点与一次性 journal（现仅 D00/D01 有 `token`/`issue`/`consume`）。另：既有 `privateD02Request` 仅覆盖 C01 文本，C02 扫页一律落 `PRIVATE_NEXT_STAGE_REQUEST_NOT_READY`；D00 把照片登记为 `carrier_type=scanned_page` 并预选 C02 属方法选择错误，应在新材料/新 run 中纠正，不改旧 L1。八维维持 `0/8 OVERALL_HOLD`；本批 ¥0。

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6` 已提交 D00 接收候选 `48766904`（后由 G0 重签候选 `c50a941c` 承接，均 CONSUMED）。原件 SHA 和 Raw 关联通过回读。

**B 路径历史要点（2026-11-20 已完成，保留）**：云端机器审核账号恢复；低权 signer `mohen_gate_signer_m5_machine` 安装并验登录；按真实 CC BY-SA 3.0 授权据实补来源 `47875bca…` 的 `machine_read=allowed` + `basis`；因云端 `sign_gate_candidate` 仍是旧版（只认精确 scope），新增精确 scope binding `d2307be3`（G0，project e03c4ba8，30 天）与本批 `ba571016`（G1，同口径）；G0 先以 `802c740f` 签发、后带真实 `stage_binding` 重签为 `888db9e6`（旧审计保留非当前）。

**Runner 消费与 D01 续跑历史要点（2026-11-20，保留）**：进程内低权 reader verifier、终态持久 reader 凭据 `e7a89d2f…`（绑 `d2307be3`、valid_until 2027-12-20）、D01 续跑 A/B/C/D 四段（`4fd763d`/`7f8cfa5`/`73b84c8`/`da0df48`）、自检通道 `/api/internal/self-test-resume`、probe 回归闭环（`d9ace70` + 无缓存重部署 `7ad46u6ba` → `runner_ready`）。该链条已支撑真实 D01 执行到 G1。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
