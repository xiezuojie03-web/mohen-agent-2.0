# 墨痕｜当前施工断点

> **Owner 授权口径（2026-11-22，长期有效）**：目标是墨痕**真正运行、持久运行**；除**安全问题**与**费用问题**外，施工方自行授权推进，不再逐项请示技术选择。费用边界：D02–D05 模型调用封顶 **0.05 USD**（约 ¥0.36，已建委托 `3f5585d0…`），超出该额度、新增付费来源或扩大用途仍需 Owner 批准。安全底线（密钥不入 git、不自签 Gate、不伪造会话/资格/PASS、不改迁移规避授权）不因该授权放宽。

> 核验时间 2026-11-22 第十五批（批次起始 HEAD `077de49`）｜环境：云端真实库 + 真实部署实测；未验证项：D02 执行本身（缺 D02 执行授权通道）。

**本批结论：Owner 已批准 D02–D05 的付费边界（0.05 USD 封顶），委托、逐来源外发许可、G2 读凭据与相关 env 已落地；D02 仍无法执行，阻断点是「D02 独立 stage grant 尚无签发通道」，与费用无关。本批 Provider 费用 0 USD。**

- **已建的授权对象**：委托 `3f5585d0…`（仅 `d02_material_observation`、deepseek-flash、`budget_limit=0.050000 USD`、7 天）；来源 `9aa03207` 的 `external_processing` 由 `unknown` → `allowed`（保留原 held 快照与 Owner 决定留痕，其余 4 项仍 HOLD）；G2 读凭据 `31e1fdec…`（job `d02.material-understanding`）。
- **部署**：preview env 增 `MOHEN_PRIVATE_D02_DELEGATION_ID`、`MOHEN_PRIVATE_D02_MODEL=deepseek-flash`、d01+d02 凭据映射；新 staging 部署 `mohen-agent-2-0-hmfwpnw2p-napoles1.vercel.app`，readiness 六组件全 CONFIGURED。
- **代码**：`from_stage` 白名单扩为 `D01|D02`（dispatch、自检通道、类型），测试 9/9；未改 Gate 判定规则。
- **最前阻断（实测）**：`production-execute` 只注入 `createD01ResumeProvider`，D02 的独立 stage grant 无签发/核销通道。以 `from_stage:"D02"` 续跑后 run `b9989b90` 被 claim（`2026-11-22T03:04:22Z`）但终态 **`HOLD@D01 / CLOUD_EXECUTOR_SETUP_FAILED`**；`studio.execution_receipts` 无新增、任务预留未动 → **零 Provider 调用、本批费用 0 USD**。下一步按设计补 D02 执行授权通道后再续跑；费用额度已批无需再请示。
- **凭证**：Vercel 账号令牌有效期至 `2026-11-22T17:29:13Z`（到期 `npx vercel whoami` 续期）。

> 核验时间 2026-11-22 第十四批（批次起始 HEAD `a984ef7`）｜环境：云端真实库 + 真实部署实测；未验证项：D02 及以后（付费 Provider）。

**本批结论：多阶段 Gate 读凭据按「一 job 一凭据」补齐，G1 读通道实测 200；同一真实 run 仍停在 D02 前（付费 Provider，需先核费用）。**

- **读通道（`VERIFIED_LIVE`）**：新建 G1 精确项目绑定 `75c80b6d…`（`d9d48901`，30 天）与 consume 凭据 `82b2ccb5…`（job `d01.carrier-reading` / G1 / ref `m5-owner-reviewer-g0g1-producer` / scope 仅本项目；token 只在 `.secrets/gate-reader-bearer-d9d48901-g1.txt`）。直连 `https://mohen-d00-authority.vercel.app/api/current`：正例 → **200 + PASS receipt**（`gate_audit_id 113c2bbe…`、`read_unit 43951035…`、双 digest 与 `stage_binding` 精确一致、`valid_until 2026-11-28T02:06:37Z`）；篡改 `output_digest` → **409 `current_qualification_required`**；用 G0 凭据查同一 G1 请求 → **403 `consumer_binding_denied`**。
- **代码（本批唯一改动，未改 Gate 判定规则）**：`createIndependentGateClient` 支持 `credentials`（`job_id → 凭据`）映射并按 job 选择，未列出的 job 回落默认单值、映射缺 job 且无默认则失败关闭；新增 env `MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIALS`（JSON），已进 cloud runner env 白名单、web spawn 透传与 readiness 判定；新增 `tools/provision-stage-gate-reader.mjs`（按注册表解析 job→stage/gate/ref，幂等开通绑定+凭据，token 只写 `.secrets/`），D02—D05 可复用。
- **部署（`VERIFIED_LIVE`）**：preview 目标已配 `MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIALS`；新 staging 部署 `mohen-agent-2-0-2pj5kd46r-napoles1.vercel.app` READY，`/api/internal/self-test-resume` readiness 回读 `configuration_ready=true`、`independent_gate` CONFIGURED（只证配置齐备，`runtime_verified=false`）。提交作者须为已绑定 Vercel 的 `xiezuojie03`，否则 `COMMIT_AUTHOR_REQUIRED` 阻断部署。
- **下一步（唯一最前阻断）**：D02 属付费 Provider。按 PLAN §0.2 D 先核真实费用与累计上限（¥20 累计授权、达 ¥10 先停）并报备，之后才以 `from_stage:"D02"` 续跑并核 G2 交接；在此之前不发起 D02、不产生费用。
- **凭证**：Vercel 账号令牌有效期至 `2026-11-22T17:29:13Z`（到期 `npx vercel whoami` 续期）。

> 核验时间 2026-11-22 第十三批（批次起始 HEAD `fcec37a`）｜环境：云端真实库 + 真实部署实测；未验证项：D02 及以后（付费 Provider）、读服务对 G1+ 的复核入口。

**本批结论：同一真实 run 已连续打通 D00→G0→D01→G1（两个独立 Gate 均为机器评审签发），现停在 D02 前。**

- **run `b9989b90`**：D00 候选 `9c55df1e` → G0 审计 `c0ee5a2f`（input `8a19ba7a…` / output `54278096…`）；`from_stage:"D01"` 续跑成功 → D01 候选 `06b71b4d` → G1 审计 `113c2bbe`（input `54278096…` / output `df4457db…` / carrier `C01`）；run 终态 `HOLD@D01`（形成于签发前，未回改）。
- **为打通所做的配置（非业务代码）**：web preview 换本项目 consume 凭据、批准 run、Protection Bypass；authority 的 `MOHEN_GATE_CONSUME_CREDENTIAL` 换成本项目凭据（旧值仍指旧项目，是续跑被拒的真因）；新部署 web `h2tpku26l`（staging）、authority `4ptizii5a`（production）。
- **最前缺口（已更正定位）**：读服务 `/api/current` 对 G1 返回 403，真因**不是** stage/gate 白名单，而是 `control.gate_service_credentials` **按 job/gate 绑定**：本项目 consume 凭据只绑了 `d00.source-intake/G0`，因此 `authenticate_gate_service` 对 `d01.carrier-reading/G1` 返回空 → `consumer_binding_denied`。资格本身在库内有效：`qualification_current` 中 G0→`source_version 36ea7ffc`（至 11-27）、G1→`read_unit 43951035`（至 11-28）。进入 D02 前需二选一并落地：①按阶段各建一条凭据（并让 `MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL` 支持按 job 选择）；②在该 Gate 读通道上改用可按 job 解析的凭据集合。
- **凭证**：Vercel 账号令牌已于本批续期（有效期至 `2026-11-22T17:29:13Z`，到期可 `npx vercel whoami` 再续）；新增 `.secrets/vercel-protection-bypass.txt`、`selftest-credential.txt`、`gate-reader-bearer-d9d48901.txt`（均 gitignored）。

> 核验时间 2026-11-21 第十二批（批次起始 HEAD `d0d208d`）｜环境：云端真实库实测（`postgres 17.11`，`.secrets/` 凭据可用）；未验证项：云端 Runner 对 G0 的实际消费（需部署侧 env，见阻断）、D01 执行、G1。

**本批（2026-11-21 第十二批）结论：D00 真实候选的独立 G0 已按设计合同签发并经低权 reader 回读 PASS；run 仍 `HOLD@D00`，下一步受阻于部署侧验证通道配置（Vercel 账号令牌已过期）。**

- **签发回执（云端实库）**：候选 `9c55df1e` → `CONSUMED`；`gate_audits.c0ee5a2f-77df-4bbb-8b46-8f4b55ba150e` = G0/PASS/`independent_gate`/`consumer=producer`/`reviewer= b0a11000…（机器评审）/db=mohen_gate_signer_m5_machine`；`details.stage_binding` = `{job_id d00.source-intake, consumer producer, input_digest 8a19ba7a…, output_digest 54278096…, reviewer_binding_ref m5-owner-reviewer-g0g1-producer}`；`qualification_current` 已指向该审计（有效至 `2026-11-27T14:47:43Z`）。三项确定性检查 `identity_version / rights_by_operation / method_plan_preselection` 全 PASS。
- **两处云端漂移按设计迁移消除**：①`studio.private_originals` 的机器评审只读策略恢复为 `20261113150000` 的"跟随有 SUBMITTED 候选的项目"（原为写死旧项目 `e03c4ba8`）；②`control.sign_gate_candidate` 与 `control.current_qualification_is_valid` 恢复为 `20261113160000` 设计版（含 `scope_kind=studio_project` 规则分支；CAS 按对象键取当前资格，不再按 `artifact_revision` 过滤——原漂移导致 `QUALIFICATION_CAS_CONFLICT`）。该迁移末尾的规则化绑定 INSERT 未执行（云端已有 26 条同类绑定）。
- **授权与只读凭据**：新增 `tasks/results/G0_MACHINE_BINDING_D9D48901_20261121.sql`，为机器评审装一条**仅本项目 + G0** 的精确范围绑定 `65dd1fae-e7a3-46dd-a97f-b9613bf71578`（30 天，`source_ref=plan-3.5C-2026-11-21…`）；新建 consume 凭据 `b0bb78fa-19a9-45af-ae31-96b7b51bbbcb`（scope 仅 `project_id d9d48901`，绑定上条绑定，token 明文只在 `.secrets/gate-reader-bearer-d9d48901.txt`）。旧凭据 `e7a89d2f`（旧项目）未撤销。
- **回读证据（真实低权路径）**：以 `mohen_runner_reader_v2` + 新凭据走 `createInProcessGateReaderVerifier` → `control.read_gate_stage_qualification` 返回完整 receipt（`qualification_current=true`、双 digest 对、`gate_audit_id c0ee5a2f…`）；负例（篡改 `output_digest`）返回 `INDEPENDENT_GATE_VERIFY_DENIED`。
- **最前阻断（需平台凭据）**：云端 Runner 的验证通道指向已部署读服务，而 `https://mohen-d00-authority.vercel.app/api/current` 对 run `b9989b90` 与历史 `bfcdfad6` 均返回 **403**（部署侧 `MOHEN_D00_GATE_APPROVED_RUN_ID` 未含这些 run）；同时 Vercel **账号令牌已于 `2026-11-21T14:36:24Z` 过期**（`/v9/projects` → 403），本批无法改 env 或重新部署。→ 因此本批**未发起 D01**，run 保持既有 `HOLD@D00 / INDEPENDENT_GATE_NOT_VERIFIED` 记录（该记录形成于签发前，未回改）。
- **零付费/零伪造**：未调用 Provider、未新增付费；未伪造会话/资格/PASS；密钥与 token 未入 git（`.secrets/` gitignored）；未触碰生产 DB 迁移与公众开放。

> 核验时间 2026-11-21 第十批（批次起始 HEAD `eaef9d7`，local=remote 分叉 0/0；本批实测 Vercel 对 main 推送只产生 production 目标部署且被 "the commit didn't affect this project" 取消，不再自动产生 preview 部署）｜环境：云端真实库实测（`postgres 17.11`，`.secrets/` 凭据可用）；未验证项：云端 executor 实际执行（本批未 claim）、独立 Gate 读服务的实际部署地址。

**本批（2026-11-21 第十批）结论：云端真实 run 已用上图地名志正文开出，但 executor 未 claim → `HOLD@D00 / CLOUD_DISPATCH_UNCLAIMED`；未进入 G0/D01/G1。**

- **材料（云端实况，已回读）**：`source 9aa03207-6d60-4984-8c1f-347df2532842`「上海地名志·朱家角」、`source_version 36ea7ffc`（`extent_kind=utf8_byte_range/v1`、`start_byte=335`、`end_byte=995`）、`raw_item c26c07cc`（1,259 B）、`rights_by_action` 含 `machine_read: allowed`；原件 `studio.private_originals.f474b91b`（`text/plain`、`verified_at=2026-11-13T05:46:01Z`、`sha256 273222ee…`）属项目 `d9d48901`，任务 `b2143002`（`status=done`、`ceiling 8 / spent 4 / 无 reservation`）。**第二条「朱家角镇」1,411 B 不在云端**：云端 `private_originals` 仅 3 条文本原件（1,259 / 1,121 / 1,015 B），补传需私有存储服务密钥（sensitive 不可读），施工侧不得伪造上传身份。
- **本批开出的 run**：`06512899-d17f-4863-97e5-940bebcd9be4`（新代码路径：自检通道 `end_stage:"D00"`，价 0，经 `MOHEN_D00_APPROVED_RUN` 预批准绑定 digest `8a19ba7a…`）。`scope` = 上述 project/original/source_version/raw_sha256/page 1 全部一致；终态 `HOLD@D00`、`reason_code=CLOUD_DISPATCH_UNCLAIMED`、`metadata.cloud_dispatch.input_digest=2c2ef0fe…`、`cloud_dispatch_uncertain=true`；task 预算留痕 `cost 0 / production-d00-intake / requires_receipt_reconciliation=true`。
- **根因（代码+实测）**：`apps/web/lib/studio-production.ts:109-125` 的 `cloudProductionDispatch()` 只有在 `VERCEL_ENV==='preview'` 且 `MOHEN_D00_TRUSTED_PREVIEW_ACCESS==='true'` 时把任务派回**自身** `/api/internal/production-execute`；否则回落到 `MOHEN_CLOUD_EXECUTOR_URL`（未配置）。本批唯一可访问的部署是自定义环境 `staging`（`VERCEL_ENV='staging'`）→ 派发目标为空 → executor 从未 claim。

**三处硬阻断（需 Owner 侧动作，施工侧无法自行解锁）**

1. **部署通道**：main 推送只生成 production 目标（两次均被 "the commit didn't affect this project" 取消）；`POST /v13/deployments` 明确拒绝 `target:'preview'`；`customEnvironmentSlug` 不被接受；自定义环境 `staging` 受 Vercel Authentication 保护，`x-vercel-protection-bypass` 仅 query 参数形式有效但 staging 无对应 bypass 变量。→ 新提交目前**无法以可访问的 preview 部署上线**，云端 executor 自派发通道因此不可用。
2. **intake 对账缺口**：`requires_receipt_reconciliation: true` 后，`studio-research.ts:414` 直接返回 `production_reservation_reconciliation_required`，而仓库只有写入该标记、**没有对账/恢复实现** → 任务 `b2143002` 现在无法再次发起 intake。旧通道（不带 `end_stage`）还会被预算挡住：`production-run` 价 5 > 可用 4。
3. **独立 Gate 读服务**：`apps/d00-authority/api/current.mjs` 只接受单一预批准 run 且 `stage==='D00' && gate_code==='G0'`，G1 无对应入口（与 run `bfcdfad6` 在 G1 被判 `INDEPENDENT_GATE_VERIFY_DENIED` 一致）。该服务所在 Vercel 项目不在本 token 可见团队内（`/v9/projects` 仅 `mohen-agent-2-0`），`mohen-d00-authority.vercel.app/api/current|readiness` 均 404，实际地址未定位。

**本批代码（`afa3cc1`，已推送）**：`apps/web/app/api/internal/self-test-resume/route.ts` 增加 `end_stage:"D00"`（`end_stage` 与 `from_stage` 互斥；仍只认服务端 `MOHEN_D00_APPROVED_RUN` 预批准绑定，不发 Gate、不造会话）。该提交的唯一可访问部署：`mohen-agent-2-0-bwgxkafm9-napoles1.vercel.app`（staging，需 query 形式 bypass）。

**本批边界**：零付费、未签任何 Gate、未改迁移与方法表绑定、未伪造会话/资格；未改 `b2143002` 的 checkpoint（保留真实 HOLD 留痕）。

> 核验时间 2026-11-21 第八批（批次起始 HEAD `b804e75`，local=remote 分叉 0/0）｜环境：本地隔离库 + 云端只读实测（凭据在 `.secrets/`，**云端可达**，`postgres 17.11`，前批"C4 无凭据"已更正）；未验证项：CI 宿主（本机 gh 缺失 → `DEFERRED_ENV`）、模型执行者（未接任何模型）。

**本批（2026-11-21 第九批）裁定：暂缓视觉（C04）路径，主线回到文本 C01 直读与结构化数据 C05。** 依据：本机 i7-8550U / 7.8 GB RAM / MX150，无可用 CUDA 栈，8B 级视觉模型不可用；`ollama.com` 安装包重定向到 GitHub Releases（1,857,946,272 B），直连与失效系统代理（`127.0.0.1:11719` 无监听）均在传输中被重置，`gh-proxy.com` 仅 0.16 MB/s、`hf-mirror.com` 约 1.0—1.5 MB/s。`D:\temp` 下载痕迹（合计约 1.57 GB）已全部删除，未安装 Ollama、无 `~/.ollama`。C04 观察契约（`2c11cee`，18/18 测试）保留备用，**方法表 C04 仍 `HOLD`，本批未改任何绑定、零付费**。

**本批（2026-11-21 第八批）结论：C04 视觉观察契约已可执行（18/18 测试），但 C04 在方法表仍 `implementation_binding: HOLD`——契约备好、模型执行者未接入。**

**分工口径（Owner 2026-11-21 裁定）**：古文字层优先用既有免费转录走 C01 直读，C02 只对"有字但无可靠转录"兜底；多模态的主战场是**无字可读的视觉材料 → C04**。新增 `pipelines/data-production/adapters/c04-observation-contract.mjs`：`routeVisualMaterial()` 检出文字即转 C02、未做文字检测一律 HOLD；`validateC04Observation()` 按 C01-C08 规范 C04 章原文落判定（框坐标/像素尺寸、图题与观察分离、增强须可逆、低清不得确定断言、不得断言人物年代地名同一性）。

**前期（2026-11-21 第四批）结论（保留）：生产链已能自己找到并核验真实史料；本地取件落库受环境身份限制。**

**已找到的真实材料（可复现）**：维基文库《欽定大清一統志（四庫全書本）》卷058（松江府），固定修订 `oldid 745167`，`action=raw&oldid=745167` 取件 **55,958 字节**、SHA-256 `6cd08f0a…3523`（三次独立取件一致）；内证「珠街鎮（在青浦縣西十里，商賈輻輳，為邑巨鎮）」「朱家角」「津梁」。**关键段落字节位置：珠街鎮 43,629、朱家角 45,775、津梁 47,033**——均超过单次全文读取上限 32768 B，D01 只能走有界片段 extent（且须 G0 批准的 C01 范围），不能再用"全文直读"。

**本批修复的真实缺陷（`tools/acquire-http-file.mjs`，Y07 取件此前根本落不了库）**：①`content_availability` 写死 `file_download` 与库内 CHECK 冲突 → 改 `--content-availability`（默认 `full_content`）；②首次建来源无法带权利依据 → 新增 `--rights-evidence`（只登记不推断，冲突报 `HTTP_SOURCE_RIGHTS_CONFLICT`）；③网络层失败不重试 → 与 429/403/5xx 同规则重试；权利比较改规范化键序。

**本地隔离库已落（回读核验）**：需求回执 `090b7c4a…`（produced_by `Y01/production-self-acquisition`）；来源 `b8ca4183-491c-45b4-88e9-2b34f0fe7ae8`（provider `wikisource`、`digital_text`、`full_content`、`verified`）携显式 `rights_by_action`（读/下载/保有/引用 allowed；展示/改编/再分发/外发模型 denied）与 `rights_evidence`（PD-old + 转录层 CC BY-SA 4.0 署名义务 + 裁决 A 本地隔离范围 + 「未经 Owner 逐条复核」边界声明）。**字节未落**：`source_versions=0`。

**新阻断（环境身份，非代码）**：落私有原件需合规私有 worker 登录；`assertPrivateWorkerIdentity` 拒绝以 NOLOGIN 的 `mohen_private_worker` 直连，而本机 dev 库无 `mohen_m5_worker_login`（迁移 `20261117020000` 未在本机应用，且要求上线前单独轮换口令）→ 按纪律不自行造角色/口令绕过。

**通道可用性（实测，第五批已更正）**：archive.org 443 超时；`shidianguji.com` robots 全站 Disallow；`圖書集成` 職方典松江府各卷为 423 B 占位；`三呉水考/卷04`(33,717 B)、`江南通志/卷025`(39,929 B) 均超 32 KiB；**上图通道本身可用——上一批"Key 失效"的判断是错的**：`gj/webapi/works`、`gj/webapi/instances`、`shnh/dmz/webapi/geonames` 在 `data1.library.sh.cn` 上已一律 `{"result":"-1"}`，同一套 query 换到 `data.library.sh.cn` 才正常返回（已改 BASE 并实跑验证）。

**云端真实 run `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 仍为 `HOLD@D01`**（上批事实，未变）：G0 `888db9e6`、G1 `292792c8` 均 PASS/current；L1 仅一条 `read_unit 215b61ef`（C02 页定位、`interpretation=not_performed`）；原件为 Commons 照片（无 `external_processing`；`C04` 方法绑定仍 `implementation_binding: HOLD`，观察契约已实现但模型执行者未接入）；D02 生成仍需付费 Provider（`MOHEN_PRIVATE_D02_DELEGATION_ID`/`MODEL`），云端无 D02 阶段授权端点。八维维持 `0/8 OVERALL_HOLD`；本批 ¥0。

**上批（2026-11-21 第二批）结论：D02 续跑输入合约已补齐，但真实 run 无法离开 D01——阻断不在代码能力，而在三处授权/素材条件。**

**Studio 已登记原件 → D00 接收已验收 → 独立 G0（`888db9e6`）与 G1（`292792c8`）均已签发 PASS。**

**真实 run `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` 现状**：`current_stage=D01`、`HOLD`，终态 `INDEPENDENT_GATE_NOT_VERIFIED / INDEPENDENT_GATE_VERIFY_DENIED`（早于 G1 签发，未重跑）。资格层已成立：G0 `888db9e6` PASS/current（valid_until 11-26）、G1 `292792c8-aad1-485d-9e3d-b73d5914c14d` PASS/independent_gate/current（valid_until 2026-11-27T07:38Z）；`stage_binding` = {job `d01.carrier-reading`、input `002bb07f…`、output `fa256f6d…`、reviewer `m5-owner-reviewer-g0g1-producer`}。**本批只读回读（2026-11-21 第三批补正）**：L1 仅一条 `read_unit 215b61ef` = `C02`/`page`/`scanned_page/v1`/`uncertainty.interpretation=not_performed`。**该原件不是书影，而是一张 Commons 照片**：`source 47875bca` = provider `wikimedia-commons`、title `朱家角古镇，Zhujiajiao Water Village - panoramio.jpg`、`source_type=image`、`content_availability=image_scan`（`carrier_type=scanned_page` 为 D00 登记标签，不等于材料是扫描书页）。`rights_by_action` 仅 `retain/download/access_view/machine_read=allowed`，**无 `external_processing`**；`C04`（照片、版画与插图）在方法表中仍是 `implementation_binding:"HOLD"`。因此"OCR 转录"对本材料无字可读、外部 VLM 亦无权利授权。

**上批能力（`CODE_PRESENT`+`VERIFIED_ISOLATED`）**：①`adapter-binding.mjs` 新增 `isTypedD02ReadingRequest`（D02 生成请求的纯形状校验，无授权语义）；②`resume-input.mjs` D02 受信输入接受 orchestrator 派生的 `readUnitId + reading` 形态，并把 qualified reading / observation / legacy link 定为三选一互斥——修复前该派生请求会被续跑入口拒绝，即"G1 合格也无法续跑 D02"；③测试：定向 15/15 PASS，全量 `tests/data-production` 409 tests / 405 pass / 4 fail（4 条为既有基线）。零 DDL、零付费、未改核心 Gate 与 Worker 判据。

**上上批（第三批）已确认 A′ 中"由 Owner 上传有字原件"这一步不再需要**：第六批已用上图通道取到并落库两条地名志正文（`朱家角` 1,259 B / `朱家角镇` 1,411 B，含"放生桥""淀浦河/朱昆河/朱泖河""聚落跨井亭港两侧"），来源 `879cb42a…`、`e97724c8…` 各 1 版本 + 1 raw_item，权利按 Owner 2026-11-08 裁定写入。第七批已在**本机 dev 库**应用仓库既有迁移 `20261119235412`（函数替换），两条来源的 `d00_lookup.ok=true`、`SHL_LAND_TEXT_OK`，私有原件→L0→D00 绑定打通（云端账本早有同名迁移）。当前前置条件仅剩：①**云端库可达且已实测连通**（凭据在 `.secrets/supabase-db-url.txt`；2026-11-21 第四批曾误判"无凭据/不可达"，实为我未定位该目录，已更正）：云端 `postgres 17.11`、迁移账本 46 条（max `20261120045054`）、真实 run `bfcdfad6` 仍 `D01/HOLD`、云端 L1 共 260 条；②D02 生成仍需付费 Provider 与云端 D02 阶段授权端点。**本地/云端一致性**：函数 `studio.private_source_registration` 的 md5 两侧一致（`25267f89…d05a`，2475 字节），三列权利字段两侧都在；结构快照已生成（`DATABASE_SCHEMA_LOCAL.json` / `DATABASE_SCHEMA_CLOUD.json`），差异为云端多 8 张表（`control.d01_resume_grant_journal`、`control.web_password_reset*`、5 张 `mab_backup.*`）与 4 个函数（`control.m5_reconcile_legacy_unclaimed_run`、`control.m5_write_production_progress`、`pgbouncer.get_auth`、`studio.search_qualified_project_layers`），本地无独有表；本地 `mohen_dev` 仍无迁移账本，版本一致性只能靠 catalog 比对。

**其余最前阻断（承接上批）**：②D02 H05 生成需付费 Provider 委派/预算/权利（`MOHEN_PRIVATE_D02_DELEGATION_ID`/`MODEL`，现零付费）；③云端无 D02 阶段授权端点与一次性 journal（现仅 D00/D01 有 `token`/`issue`/`consume`）。另：既有 `privateD02Request` 仅覆盖 C01 文本，C02 扫页一律落 `PRIVATE_NEXT_STAGE_REQUEST_NOT_READY`；D00 把照片登记为 `carrier_type=scanned_page` 并预选 C02 属方法选择错误，应在新材料/新 run 中纠正，不改旧 L1。八维维持 `0/8 OVERALL_HOLD`；本批 ¥0。

> **历史回执（2026-11-19 工程数据统一专项 P0–P4）已结案**：唯一结论见 [P4 结案书](tasks/results/P4_CLOSURE_20261120.md)，完整证据见 `tasks/results/MAB/ENGINEERING_DATA_UNIFICATION/`。背景细节不再重述。

朱家角任务 `53ad1a29-22e5-43c2-816d-b02b6e85abbd`、Project `e03c4ba8-7069-4d6c-92b5-fcae1b6e17c5`、同一 Root 与原件 `4ca22839-e3e9-4d14-8ec7-677cd740aa0e` 已在持久回执中核对。Creator 已在受保护 Preview 发起单次 D00，执行许可已消费，运行 `bfcdfad6` 已提交 D00 接收候选 `48766904`（后由 G0 重签候选 `c50a941c` 承接，均 CONSUMED）。原件 SHA 和 Raw 关联通过回读。

**B 路径历史要点（2026-11-20 已完成，保留）**：云端机器审核账号恢复；低权 signer `mohen_gate_signer_m5_machine` 安装并验登录；按真实 CC BY-SA 3.0 授权据实补来源 `47875bca…` 的 `machine_read=allowed` + `basis`；因云端 `sign_gate_candidate` 仍是旧版（只认精确 scope），新增精确 scope binding `d2307be3`（G0，project e03c4ba8，30 天）与本批 `ba571016`（G1，同口径）；G0 先以 `802c740f` 签发、后带真实 `stage_binding` 重签为 `888db9e6`（旧审计保留非当前）。

**Runner 消费与 D01 续跑历史要点（2026-11-20，保留）**：进程内低权 reader verifier、终态持久 reader 凭据 `e7a89d2f…`（绑 `d2307be3`、valid_until 2027-12-20）、D01 续跑 A/B/C/D 四段（`4fd763d`/`7f8cfa5`/`73b84c8`/`da0df48`）、自检通道 `/api/internal/self-test-resume`、probe 回归闭环（`d9ace70` + 无缓存重部署 `7ad46u6ba` → `runner_ready`）。该链条已支撑真实 D01 执行到 G1。

[施工与验收标准](tasks/implementation/MAB/PLAN.md#studio-d00-handoff) · [施工证据账](tasks/implementation/MAB/progress.md)
