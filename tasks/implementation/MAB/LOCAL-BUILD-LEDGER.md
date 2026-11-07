# 墨痕 M5 完整闭环施工台账（本地主导 · 持久化）

> 本文件是**本地主导施工的持久台账**，任何新会话接手先读这里 + `PLAN.md` + `progress.md`。
> 目的：不受对话上下文影响，随时能知道"做到哪一步、每步闭环了没、下一步是什么、哪些断点待补"。
> 施工铁律：**严格按依赖顺序，每步做完自检清单（PG+HTTP 证据）才进下一步，不跳步、不脚本代跑表面。**
> 技术细节由 CodeBuddy 自主判断；只有产品方向/功能/效果/额外费用/生产启用/资料外发才转白话问 Owner。

## 一、施工路线（5 步，对齐 PLAN §3）

| 步 | 目标 | PLAN 依据 | 状态 |
|---|---|---|---|
| 1 | M2 底座：studio schema 全表 + 私有原件 + L0→L1→L2 真实链（含 13 类资产） | PLAN §3.2 / §5-M2 | ✅ 闭环（1.1–1.10 全完成） |
| 2 | M3 真实 D 链：production-registry 激活 + M5 实际方法唯一绑定 + D00–D05 真实执行 | PLAN §3.3 | ✅ 主体闭环（批次 A/B/C：registry 隔离激活 + 方法绑定 6/63 + D00–D05 经 run.mjs 真实端到端落库，VERIFIED_ISOLATED；全部 HOLD 待 G0–G5）。遗留：6 executor 2 行桩、D00→D05 单run串链、非私有无分支 |
| 3 | M3 独立 Gate：真实 Reviewer 投运 + G0–G5 签发/撤权/当前消费 | PLAN §3.3 | ✅ 主体闭环（批次 D：D 链 G0–G5 机器签发，VERIFY_3_ALL_PASS；遗留：候选撤回能力 HOLD、永久撤权演练待 Owner 同意、生产侧 HTTP 断言待 Web 通道） |
| 4 | M4 受控 Provider 执行器（B 线）：正道解阻断 + 真实派发/费用/Receipt | PLAN §3.4 | ✅ 批次 F 闭环（VERIFIED_ISOLATED，VERIFY_4_ALL_PASS；Studio 路由接线留第 5 步） |
| 5 | M5 八维度完整闭环：ST-01→ST-09 同一真实作品 + Owner 亲自体验 | PLAN §3.5 / 八维矩阵 | ⬜ 待施工 |

> 说明：原 6 步里的"M2 原件链"和"13 类资产表"实为**同一 studio schema 迁移链**（private_originals 依赖 projects+asset_revisions），已合并为第 1 步。5 步顺序即 PLAN §3.5-C 的依赖顺序（M1 隔离前提已在历史批次满足 → M2 → M3 → M4 → M5）。

## 二、缺口全景（M5 之前的断点清单）

> 每个断点 = 一个"必须补上才能算 M5 前置完整"的具体缺口。状态：✅已补 / 🔵进行中 / ⬜待补。

### 第 1 步 · M2 底座
- ✅ 1.1–1.9：studio 8 表、项目、私有原件、L0/L1/L2、13 类资产、幂等、RLS 撤权（见 §三）。
- ✅ **1.10 HTTP 正反**：复用 `GET /api/studio/attachments?original_id=` 私有原件下载端点，新增本地文件系统存储后端（`createLocalPrivateOriginalStorage`，与 Supabase 版同 key/同 SHA 校验/fail-closed），并在本地 provision M1 身份验签链（`MOHEN_DATABASE_SESSION_SECRET` + `control.session_verification_keys`）。字节层正反 + 身份层正反（有效 Owner token → 可见 2 原件；无/无效/跨 owner token → 0 行）全部 PASS。

### 第 2 步 · M3 真实 D 链（当前最大断点群）
- ✅ 2.1 production-registry 隔离激活（`VERIFIED_ISOLATED`）：`ACTIVE_AUTHORIZED` / `enabled=true`，D00+D01 enabled/attended、绑定私有适配器与 reviewer binding，D02–D05 保持禁用；PG 启用 SSL；producer/private_worker 登录角色 + 列级 run 进度授权（迁移 20261107160000）；本地执行授权器（Ed25519 grant + HTTPS 一次性 nonce 验证器）首次跑通 run.mjs D00/D01 真实端到端（候选落库、幂等复跑无重复、按合同 HOLD 待 G0/G1）。
- ✅ 2.2 方法唯一绑定：`method-binding-contract.json` 为 `M5_ISOLATED_PARTIAL_BINDING`——63 方法中 6 个可执行绑定（`C01`→D01:draftTextReading、`C02`→D01:readScannedPage、`H05`→D02:observeMaterial、`W07`→D03:assertWorldClaim、`A06`→D04:recordHumanisticFinding、`P02`→D05:projectWorld），其余 57 显式 `HOLD` + `hold_reason`，**无 `TO_VERIFY_IN_M0` 残留**。
- ✅ 2.3 适配器指向：`production-registry.json` D00–D05 `adapter_binding` 全部指向 `private-evidence-adapters.mjs`（D02–D05 由 `inactiveStage` 改为真实动作），`gate_reviewer_binding` → `m5-owner-reviewer-g2g5-producer`。
- ✅ 2.4 L0–L5 候选真实产出：D00→L0 登记候选、D01→L1 `read_unit`、D02→L2 `material_evidence`、D03→L3 `world.claim_revisions`、D04→L4 `meaning.findings`、D05→L5 投影候选，全部经 `run.mjs` 真实落库，`verify-2-c-d-chain.mjs` = `VERIFY_2_C_ALL_PASS`；候选一律 `UNASSESSED`，G2–G5 未签。

### 第 3 步 · M3 独立 Gate
- ✅ 3.1 独立 Reviewer 真实身份：DB 层 `control.sign_gate_candidate`/`revoke_gate_qualification`/`qualification_allows` 已存在；批次 D 新建专用登录 `mohen_gate_signer_m5_owner`（仅 `mohen_gate_signer` 成员、无 producer/app_runtime/authority 成员、无表直写）+ G0–G5 策略与 Owner reviewer 绑定；`tools/verify-3-gate-chain.mjs` 断言 `VERIFY_3_ROLE_OWNER_SIGNER PASS`。
- ✅ 3.2 G0–G5 独立签发：Owner 于本轮明确裁决 **B. 全部规则化机器签**（本地隔离 M5 内，接受机器背书风险；生产 Gate 启用仍另需授权）。新增机器 Reviewer 身份 `machine-reviewer@mohen.local`（`b0a11000-…-00a1`）+ 专用登录 `mohen_gate_signer_m5_machine`（NOINHERIT、仅 `mohen_gate_signer` 成员、19 条只读 RLS、无直写）+ 规则评审器 `tools/rule-gate-reviewer.mjs`（先序校验、逐 gate 检查映射、仅全通过才签）。本轮 D 链真实签发：G0 `00ef6451…`、G1、G2、G3 `45f9e081…`、G4 `b440e417…`、G5 `c1792c87…`。**机器签不构成 G4/G5 的专业判断**，人文解释与发布准出仍待 Owner。
- 🔵 3.3 撤权 + P08 精准失效：`revoke_gate_qualification` 已实跑（事务内演练，`blocked_count=1`、`current` true→false、回滚后恢复 true）。**永久撤权演练待专门重跑链**（会打断当前已签链，需先取得 Owner 同意再做）。
- ✅ 3.4 当前资格消费：G0–G5 逐条 `current_qualification_is_valid=true` 且 `qualification_allows(...,'producer','data-production','m5-remediation','v1')=true`（本轮 D 链对象；G5 story_seed 行因 purpose 不同为 false，属正确）。
- ✅ 3.5 撤权机制生效：`VERIFY_3_NEGATIVE` + 事务演练（见 3.3）。
- 🔵 3.6 撤权后即时拒绝：已由 `current_qualification_is_valid` 闸门翻转证明；生产侧 HTTP 断言仍待 Web 通道启用。
- ✅ 3.7 负例：Producer/Operator 代签被拒（失败关闭）— `VERIFY_3_NEGATIVE producer_cannot_sign PASS`（42501，审计数不变 718==718）。
- ✅ 3.8 旧 PASS/错 consumer 不复活：资格有效性按当前状态派生，不使用旧 PASS 缓存；`unsigned_qualification_denied allowed=f`。

**本轮由机器评审器发现并修复的真实缺陷（非放行）**：① D00 候选错绑 `raw_item` 版本（新增 `source_version_artifact_revision`，候选改绑 `source_version`）；② `control.artifact_revision_for('claim_revision',…)` 因 `world.claim_revisions` 缺 `mohen_gate_authority` RLS 策略恒返回 null（补 `k3_artifact_read` 策略）；③ 评审器 `claim_support` 漏选 `o.byte_size` 致 `PRIVATE_WORLD_CLAIM_NOT_PERSISTED` 误判（补列）。**已知限制**：同一 gate/object 存在多个 `SUBMITTED` 候选时，规则评审器显式告警并取最新一条（超期未签的旧候选 `24da0dfb…` 无法撤回，控制面尚无候选撤回能力，已记 HOLD 待补）。

### 第 4 步 · M4 受控 Provider
- ✅ 4.1 正道解阻断：`directorExternalProcessingBlocker(auth?)` 仅在持有 dispatcher 签发的有效未消费一次性句柄时放行；无句柄仍恒阻断（安全网保留）。
- ✅ 4.2 dispatcher 要求真实委托：`authorizeProviderDispatch` 核验未过期 + action 在 allowed_actions + external_processing=GRANTED + USD 预算 ≥ 最坏估算（含已花费累计）+ 逐来源权利（仅 `external_processing='allow'` 或 `status='public_domain_secondary_use'` 放行，权利未知/缺失/不可解析 = TRANSFER_DENIED）。
- ✅ 4.3 费用真实化：回执记真实 usage × 版本化价格表 `deepseek/2026-11-07`（USD/1M token，peak 保守上界）；模型不在表内 = 费用未知 = 拒绝派发。
- ✅ 4.4 Receipt 持久化：`appendVerifiedReceipt`（ACCEPT_AS_CANDIDATE + ESTIMATED；manifest 必含 usage/price_ref/rate_window/model/input_hash/output_hash；ACTUAL 保留给 M4-C03 对账核销）；unique(delegation_id,attempt_no) 幂等。

**批次 F 方案（2026-11-07 已核定，依据 PLAN §3.4 + B线）**
1. 新建 `apps/web/lib/studio/provider-pricing.ts`：版本化价格表 `deepseek/2026-11-07`（来源 api-docs.deepseek.com/pricing，USD/1M token）。deepseek-flash：in miss $0.30/hit $0.006/out $1.20（peak，off-peak 减半）；deepseek-v4-pro：$1.32/$0.044/$3.96。估算用 peak+cache-miss 最坏值；实算用 usage 的 cache_hit/miss 字段 × peak 价（**保守上界**，peak 窗口 UTC 01-04/06-10 周一至五，节假日不建模→一律 peak 计）。模型不在价格表 → 费用未知 → 拒绝派发（失败关闭）。
2. 扩 `packages/data-access/src/studio-delegation-repository.mjs`：新增 `appendVerifiedReceipt`（acceptance_state='ACCEPT_AS_CANDIDATE'，cost_confidence='ESTIMATED'，result_manifest 必含 usage/price_ref/rate_window/input_hash/output_hash；ACTUAL 保留给将来对账单核销 M4-C03）。沿用 unique(delegation_id,attempt_no) 幂等。原 `appendHeldReceipt` 不变。
3. 新建 `apps/web/lib/studio/provider-dispatcher.ts`：`authorizeProviderDispatch`（查委托：未过期/action 在 allowed_actions/transfer_rights=GRANTED/currency=USD/预算≥最坏估算；**逐来源**查 source.sources.rights：仅 `external_processing='allow'` 或 `status='public_domain_secondary_use'` 放行，其余 TRANSFER_DENIED；重复 input_hash 已有 ACCEPT 回执→回放句柄不再扣费）→ 发一次性句柄（模块内 Map，不可外部构造）；`dispatchAuthorizedCall`（30s 超时、不重试、成功写 verified receipt、失败/超时写 HOLD receipt + 抛 uncertain）。
4. 改 `studio-creation.ts`：`directorExternalProcessingBlocker(auth?)` 仅在持有有效未消费句柄时返回 null；`callLlm(...,auth)` 有句柄时走 dispatcher，无句柄仍恒阻断——**不保留任何绕过 dispatcher 的原始 fetch 路径**。H1/H2/H3/suggestNarration/workPanels/insightView 的现有无参调用行为不变（仍阻断），M5 第5步再接线路由。
5. 单测 `tests/unit/provider-dispatcher.test.ts`：合成 repo + stub fetch：正例（权利+预算→派发→ESTIMATED 回执含 usage/费用/hash）；反例：权利`{}`来源→TRANSFER_DENIED 无 fetch；预算不足→HOLD_BUDGET 无 fetch；超时→HOLD 回执+不重试；重复→回放无二次 fetch；过期委托→拒绝。现有 transfer-boundary 测试保持通过。
6. 真实隔离验证 `tools/verify-4-provider-dispatch.mjs`：铸 Owner 会话（MOHEN_DATABASE_SESSION_SECRET）→ saveDelegation 真实委托（项目 b0a11000-…-0001，GRANTED，budget 0.02 USD，allowed_actions=['llm_director_h1']）→ 对 NAJ 源（public_domain_secondary_use）做真实 DeepSeek 极小调用（deepseek-flash，maxTokens≈200，费用<¥0.02，在 Owner ≤¥20 预授权内）→ 核 PG 回执行；反例：rights='{}' 来源 TRANSFER_DENIED / 零预算 HOLD_BUDGET / 重放不增回执。打印 VERIFY_4_ALL_PASS。
7. 回归 typecheck+unit → 提交 → 回写 progress.md/本台账。不在本批：Studio 路由接线（第5步）、M4-C03 中断恢复演练、T1—T7、ACTUAL 对账核销。

**批次 F 结果（2026-11-07/08 本地，VERIFIED_ISOLATED）**：`tools/verify-4-provider-dispatch.mjs` = **VERIFY_4_ALL_PASS**。真实委托 `3a869a5d…`（budget 0.02 USD，GRANTED）；对 NAJ 源（public_domain_secondary_use）真实 DeepSeek deepseek-flash 调用成功，回执 `7c353e92…`：ACCEPT_AS_CANDIDATE + ESTIMATED，**真实费用 $0.000074（≈¥0.0005）**，usage 66 in / 10 out，price_ref `deepseek/2026-11-07`，input/output hash 齐。反例全过：同输入回放不增回执不二次扣费；rights=`{}` 来源 TRANSFER_DENIED 且无回执；零预算委托 HOLD_BUDGET 且无回执。回归：typecheck 6/6、unit 599 pass/2 skipped、data-production 166 pass + 1 既有 DEFERRED_ENV（independent-gate-service-runtime，无 openssl，非本批引入）。
**施工中发现的两个真实边界（已按失败关闭处理）**：① `deepseek-flash` 是推理型模型，`max_tokens=16` 时全部输出耗尽于 reasoning、`content` 为空 → dispatcher 如实记 HOLD 回执（`PROVIDER_USAGE_UNKNOWN`）而非当作成功；验证调用 maxTokens 提到 200 后正文正常。② data-access 文本通道下 `rights` 以 JSON 字符串返回，dispatcher 权利判定已兼容对象/字符串两形态，解析失败 = TRANSFER_DENIED。
**不在本批**：Studio 路由接线（第 5 步 M5）、M4-C03 中断恢复演练、ACTUAL 对账核销、生产启用。

### 第 5 步 · M5 八维度闭环（见 §三 第 5 步）

**批次 G 方案（2026-11-07 已核定，依据 PLAN §3.5 + ST-04/05；目标：Studio 正道接线 dispatcher）**
1. `provider-dispatcher.ts` 新增授权 Grant 层：`authorizeStudioDispatchGrant`（路由级一次性校验委托未过期/GRANTED/USD/动作白名单/逐来源权利/预算 ≥ maxCalls×单次最坏上界，发不透明 grant，绑死 delegationId+actions+model+sourceIds+sessionToken，记 maxCalls/used）+ `dispatchWithGrant`（每次 LLM 调用用真实 call 内容再走 `authorizeProviderDispatch` 全量校验铸一次性句柄执行）。句柄层语义不变，批次 F 测试不受影响。
2. 动作与 maxTokens 表：h1=2048 / h2=4096 / h3=4096 / panels=2048 / narration=1024 / insight=2048（deepseek-flash 为推理型，输出须留足）。
3. `studio-creation.ts`：blocker 接受 handle 或 grant；`callLlm` 带 grant 时经 `dispatchWithGrant`；六个入口函数接 `auth` 参数（无参调用行为不变=仍阻断）；拆出 `generateDirectorPlansFromFacts`（项目真实材料 facts 由调用方供给，不再只走 jinze/a001 topic）。
4. 迁移 `20261108090000`：`public.director_plans` 加 `source_ids jsonb not null default '[]'`（服务端权威来源绑定，防客户端 widening）。
5. 新路由 `POST /api/studio/dispatch-authorizations`：ST-04 显式 Creator 外发授权——session+项目 Owner 归属（RLS listProjects）+ 动作白名单 + 预算上限 5 USD + ttl ≤120 分钟 → GRANTED/USD 委托（幂等）。无自动触发。
6. 接线：`director-plans` POST（带 delegation_id 时走 grant + 项目 facts 正道；无则维持 409 HOLD 绑定）、`select`、`panels`、`narration-suggestions` 接 grant。`create`（旧 jinze 路径）、`direct`、`insight-views`（EXPLORE 面）本批保持阻断。
7. 单测扩展 grant 生命周期（伪造/过期/超次/动作越界/权利拒绝/预算耗尽）+ 回归。
8. `tools/verify-5-studio-dispatch.mjs`：真实 PG + 真实 DeepSeek 走 grant 正道（项目 facts → H1/H2 → select beats → panels），回执落库；负例：无 grant 阻断、grant 耗尽、权利拒绝。预算 <¥0.1。
**批次 G 结果（2026-11-08 本地，VERIFIED_ISOLATED）**：`tools/verify-5-studio-dispatch.mjs` = **VERIFY_5_ALL_PASS**。真实委托 `1ef4a7f9…`（GRANTED，预算 1.00 USD，六动作白名单）；项目来源服务端推导命中 NAJ 源；grant `a65e1223…` 签发；真实 DeepSeek 派发 H1（母题"低田等则下的正耗并征与准熟起科"，来自真实 L2 证据）+ H2（A/B 方案）+ H3（3 章节 beats）+ panels 全部成功，回执 ACCEPT+ESTIMATED、input/output hash 齐，本委托累计真实费用 **$0.007452（≈¥0.053）**；负例全过：grant 耗尽 DISPATCH_GRANT_INVALID、伪造 grant 拒绝、权利 `{}` 来源 TRANSFER_DENIED，均无回执无请求。回归：typecheck 6/6、unit 603 pass/2 skipped（新增 grant 生命周期 4 例）。
**施工中发现并如实处置的真实边界**：deepseek-flash 推理型在 H3 多章节 JSON、maxTokens 4096 下正文耗尽 → HOLD（PROVIDER_USAGE_UNKNOWN，如实记回执，不当作成功）；H3 提到 8192、h1/panels/insight 4096、narration 2048 后全链通过。
**批次 G 证据边界（诚实声明）**：本批验证到 dispatcher grant 层真实派发 + 路由静态接线（typecheck/单测）；路由 HTTP 级正反（含 guardRoute/session）归 5.9 Owner 浏览器体验批次补证。`create`/`direct`/`insight-views` 三路由仍恒阻断（不在 M5 主创作链）。
**不在本批**：ST-06–09 HTTP 全链、Admin、WATCH 撤权、Owner 体验（后续批次）。

## 三、每步闭环自检清单（做到才算"这一步闭环"）

### 第 1 步 · M2 底座（自检 10 项）
- [x] 1.1 studio schema 8 张表建齐（projects/asset_heads/asset_revisions/delegations/execution_receipts/asset_links/use_events/private_originals）
- [x] 1.2 项目创建：studio.projects 有"松江府田赋"项目（owner=Owner）
- [x] 1.3 私有原件入库：NAJ 田赋页字节入 private_originals，state=STORED_VERIFIED，SHA 回读一致（本地文件系统 D:/MoHen/data/private_originals）
- [x] 1.4 L0 来源登记：source.sources + source_versions + raw_items 有 NAJ 记录（rights/uri/locator + 字节项）
- [x] 1.5 L1 载体读取：source.read_runs + read_units（method_code=C02 扫描书影）
  - 2026-11-07 批次 A 认知更正：第 1 步当时落的是 17 条 `raw_item_id=null` 的 C01/C04 松散 read_runs，**并无绑定到私有原件的 C02 read_unit**；真实 C02 页读取由批次 A 迁移 + 隔离 PG 验证补齐（现 `source.read_units` 有 1 条 `C02/page/scanned_page/v1/ordinal=35`，精确绑定 raw_item）。第 1 步"表链与资产落地"结论不变，1.5 的 C02 语义以本条更正为准。
- [x] 1.6 L2 材料理解：evidence.reading_units + material_evidence 有 OCR 证据（literal_reading + source_voice）
- [x] 1.7 13 类资产：research_brief/source_anchor/reading_note/evidence_note 四类真实落库（不可变 revision，5 heads + 5 revisions）
- [x] 1.8 同输入回放：重复执行落地，记录数不变（rev/evi/raw = 5/2/2，幂等通过）
- [x] 1.9 撤权拒绝：RLS 无身份拒绝验证通过（超级用户可见 2 原件；mohen_app_runtime 无 session_token 时 RLS 返回 0 行，拒绝）
- [x] 1.10 HTTP 正反：本地文件系统后端读私有原件字节（正例 SHA 回读一致=200 逻辑）；有效 Owner token → RLS 可见 2 原件；无/无效/跨 owner token → 0 行（401/404 逻辑）

### 第 2 步 · M3 真实 D 链（自检 9 项）
> 勾选口径：必须 `run.mjs` 真实 D 链端到端产出候选才算闭环。2026-11-07 批次 B 完成 2.1 + D00/D01 经 run.mjs 真实端到端（签名授权 + nonce 消费 + 候选落库 + 合同 HOLD）。
- [x] 2.1 registry 激活：production-registry.json `status` → 激活态、`enabled=true`（M5 作品范围），run.mjs 不再报 `REGISTRY_NOT_ACTIVE`
- [x] 2.2 方法绑定：M5 实际方法（C02/H05 + 选定 W/A/P）`implementation_binding` → 具体 executable；其余方法登记 HOLD（不残留 TO_VERIFY_IN_M0）— 6 绑定（C01/C02/H05/W07/A06/P02）/ 57 HOLD / 0 残留
- [x] 2.3 适配器指向：`adapter_binding` 指向真实私有证据适配器（非金泽 layer1 默认），D00/D04/D05 补齐 — 六个 Stage 全部指向 `private-evidence-adapters.mjs`
- [x] 2.4 D00 来源获取：真实 NAJ 来源→原件字节→L0 候选（G0 待签）— run.mjs 真实端到端已通（run 3f6d59f2…），G0 未签 HOLD
- [x] 2.5 D01 载体读取：C02 → L1 read_unit（G1 待签）— run.mjs 真实端到端已通（run 227cff63…，read_unit 9e847de9…，幂等复跑无重复），G1 未签 HOLD
- [x] 2.6 D02 材料理解：H05 → L2 material_observation（G2 待签）— `evidence.material_evidence` + link `mab.private-material-observation.v1` 落库，UNASSESSED
- [x] 2.7 D03 世界建构：W 方法 → L3 world_claim（G3 待签）— `world.claim_revisions`(W07) 落库，UNASSESSED
- [x] 2.8 D04 人文发现：A 方法 → L4 humanistic_finding（G4 待签）— run 48b55e23…，`meaning.findings` 8412d171…，HOLD 待 G4
- [x] 2.9 D05 发布：P 方法 → L5 projection/seed（G5 待签）；run.mjs 端到端真实跑通（无 hidden fallback、无金泽样板）— run 2dd6e297…，L5 投影候选落库，HOLD 待 G5

### 第 3 步 · M3 独立 Gate（自检 8 项）
- [x] 3.1 独立 Reviewer 身份：Owner 已登记为唯一 Reviewer（G0–G5 绑定 + 专用 signer 登录 `mohen_gate_signer_m5_owner`）；`VERIFY_3_ROLE_OWNER_SIGNER PASS`
- [x] 3.2 G0–G4 独立签发：`control.sign_gate_candidate` 逐阶段 PASS（非 Producer/Operator 自签）— 依 Owner 裁决 B 由规则评审器签发：G0 `00ef6451…`、G1、G2、G3 `45f9e081…`、G4 `b440e417…`（`RULE_GATE_REVIEW … PASS current=true`）
- [x] 3.3 G5 独立签发：精确 WorkRevision + 知识/媒资依赖 — G5 `c1792c87…`（`work_revision_binding` + `rights_by_operation` PASS）
- [x] 3.4 当前资格消费：`control.qualification_allows` 逐请求核验 true — 本轮 D 链 G0–G5 全 true；负例未签时 false（`VERIFY_3_NEGATIVE unsigned_qualification_denied PASS`）
- [x] 3.5 撤权：`control.revoke_gate_qualification` 生效 — 事务演练 `blocked_count=1`、`current` true→false（永久撤权演练另行授权）
- [ ] 3.6 P08 精准失效：撤权后新请求即时拒绝（PG 断言已由资格闸门翻转证明；HTTP 断言仍待 Web 通道）
- [x] 3.7 负例：Producer/Operator 代签被拒（失败关闭）— `VERIFY_3_NEGATIVE producer_cannot_sign PASS`（42501，审计数不变 718==718）
- [x] 3.8 旧 PASS/错 consumer 不复活（非旧资格复用）— 有效性按当前状态派生，无旧 PASS 缓存

### 第 4 步 · M4 受控 Provider（自检 8 项）
- [ ] 4.1 正道解阻断：`directorExternalProcessingBlocker` 在受控派发条件满足后放行（非删除安全网）
- [ ] 4.2 逐来源外发权核验：无权 → TRANSFER_DENIED（禁止发送后补授权）
- [ ] 4.3 真实 Provider 派发：DeepSeek（已授权低成本），真实调用
- [ ] 4.4 费用真实化：内部 credit → 真实 token/币种
- [ ] 4.5 Receipt 持久化：provider/model/version、token/用量、币种费用、输入输出 hash
- [ ] 4.6 正例：合法派发成功 + 永久 Receipt
- [ ] 4.7 反例：外发无权/预算不足/超时/重复请求 → 失败 HOLD（不自动重试收费调用、不补零）
- [ ] 4.8 双主体互补：同一 root 下 Agent 内部 + 外部 Provider 职责互补

### 第 5 步 · M5 八维度闭环（自检 8 维度 + Owner 签收）
> 八维度必须由**同一项真实作品《松江府田赋》**贯通（PLAN §3.5-B 矩阵）。
- [ ] 5.1 维度 1 自然语言创作入口（ST-01）：Owner 自然语言提问 → Agent 读项目资产、判断资料可得性、收敛问题、可追溯 Brief/Plan
- [ ] 5.2 维度 2 内外 AI 混合协作（M4）：同一 root 下 Agent + 外部 AI 各自可核验贡献，真实 Receipt/费用/失败恢复闭环
- [x] 5.3 维度 3 真实来源/证据/D·L·G（ST-02/03/04）：原件→读取→证据→主张→人文解释，精确 source/version/locator/revision + 独立 Gate 回执 — 第 1–3 步闭环（私有原件 SHA 回读、C02 read_unit、material_evidence、claim、finding，G0–G5 机器签发回执）；批次 I 复核 G0–G5 全部 current 且 G5 审计绑定已发布修订
- [x] 5.4 维度 4 13 类知识资产（M4-C04/Admin）：真实作品实际产生的类型逐项字段/修订/ACL/CAS 正反验收；不适用类型说明原因（不为凑数伪造）— 批次 I `verify-5i-asset-matrix.mjs` = `VERIFY_5I_ALL_PASS`：产出 6 类（research_brief×1/source_anchor×2/reading_note×1/evidence_note×1 于 studio.asset_heads + director_plan×9 于 canonical public.director_plans + work_revision 于 publication，发布指针原子指向 revision 2）；未产出 7 类逐类如实记原因（时空/关系假设/合集/媒资/引用快照/反馈未发生，humanistic_insight 经 D04 入 meaning.findings 且 G4 已签）；字段/不可变（单修订唯一 hash）/CAS 头指针/跨 Owner 0 行/匿名拒绝/过期 expectedRevisionId 冲突且无残留写入/canonical 守卫全过
- [ ] 5.5 维度 5 Studio 真实创作（ST-05/06/07）：H1/H2/H3 + 19 组件实际参与导演/叙事/镜头；可预览、局部修改、保存/恢复、不可变 WorkRevision — 批次 G/H 已闭环 H1/H2/H3 真实派发与不可变 WorkRevision；19 组件职责核对留批次 J
- [x] 5.6 维度 6 Admin 知识资产管理（F05/ST-07/08/09）：逐条显示类型/认识状态/精确来源/D·G 资格/权利用途/版本/复用/缺口；仅授权 Owner 可管理 — 批次 I：Inspector 每条新增真实治理行（`assetGovernanceSummary`：缺口只按已存字段报告、G 资格不签发不替代）；类型/认识状态/来源/版本/复用/权利既有；ACL 仓储层正反（跨 Owner 0 行、匿名拒）；G 逆查真实断言（G0–G5 current + G5 审计绑定已发布修订）；HTTP 级正反归 5.9
- [x] 5.7 维度 7 独立 G5/媒资权利/发布（ST-08/09）：独立 Reviewer 对精确 WorkRevision + 知识/媒资依赖当前资格审查；发布指针原子指向该修订 — 批次 H：机器评审独立通道签 WATCH G5（精确修订绑定 + rights_by_operation + CAS），四道门发布指针原子指向同一修订（VERIFIED_ISOLATED；机器签不构成人文背书）
- [x] 5.8 维度 8 WATCH 消费与撤权：WATCH 只消费第 7 项发布的同一 WorkRevision；每请求核 G5/rights/purpose/consumer/scope/source；撤权后新请求立即拒绝 — 批次 H：`listWatchEligible` 仅该修订可消费、错修订拒绝、撤权即时拒绝、重签恢复（VERIFIED_ISOLATED）
- [ ] 5.9 Owner 亲自体验签收：Owner 实际完成 Studio 创作、Admin 条目核查、WATCH 消费，逐项确认八维矩阵

## 四、当前进度（最新状态，持续更新）

- **第 1 步（M2 底座）1.1–1.10 全部完成（闭环）**：
  - 应用 M2 迁移链（20261102105810 studio 资产 + 20261102140000 私有原件 + 20261102145410 证据桥 + 20261103143451 文本读取；补建 anon/authenticated/service_role 角色）。
  - 落地"松江府田赋"：项目 1 + 私有原件 2（STORED_VERIFIED，本地文件系统 D:/MoHen/data/private_originals，SHA 回读一致）+ 13类资产 5 heads/5 revisions + L0(sources/source_versions/raw_items) + L1(read_runs/read_units C02) + L2(reading_units/material_evidence)。
  - 幂等回放通过（记录数 5/2/2 不变）；RLS 撤权拒绝通过（无身份返回 0 行）。
  - 1.10 HTTP 正反：新增 `createLocalPrivateOriginalStorage`（本地文件系统后端，与 Supabase 版同 key/同校验/fail-closed）+ `attachments/route.ts` 按 `MOHEN_PRIVATE_ORIGINAL_LOCAL_FS` 选择后端 + 类型声明；本地 provision M1 身份链（`MOHEN_DATABASE_SESSION_SECRET` ↔ `control.session_verification_keys`）。验证：字节层 SHA 回读一致（正）/错误 SHA 不一致（反）；身份层有效 Owner token 可见 2 原件（正）/无 token、无效 token、跨 owner token 均 0 行（反）。
  - 关键认知修正：L1 物理表是 source.read_runs/read_units，L2 是 evidence.reading_units/material_evidence（material_evidence.reading_unit_id 引用 evidence.reading_units，非 source.read_units）；L0 含 raw_items（原始字节项）。
- **第 2 步（M3 真实 D 链）批次 A 完成（2026-11-07，部分闭环）**：
  - 迁移 `20261107120000_mab_m2_private_scanned_page.sql` 已应用到本地隔离 PG：`studio.private_source_registration(uuid)`（D00 精确 L0 登记）+ `studio.persist_private_scanned_page_reading(...)`（D01 C02，确定性 ID / 幂等 / 不可变 pin 扩到扫描页 schema）；沿用 M2 文本读取的 Owner RLS、`SECURITY DEFINER`、HMAC byte attestation 模式。
  - 新增仓储 `private-source-registration-repository.mjs` / `private-scanned-page-reading-repository.mjs`；组合根 `private-evidence-binding.mjs` 接线；`private-evidence-runtime.mjs` 支持本地 FS 私有原件后端。
  - `private-evidence-stage.mjs` 新增 `verifySourceIntake`(D00) / `readScannedPage`(D01 C02)；`private-evidence-adapters.mjs` 重写 D00 + D01 路由。所有候选一律 `qualification='UNASSESSED'`，适配器 `PASS` 只代表 Producer 完成，**不是 G0/G1 签发**。
  - 方法绑定收敛：63 方法 → 2 绑定 / 61 HOLD / 0 残留 `TO_VERIFY_IN_M0`。
  - 验证：隔离 PG 正反/幂等/不可变 12 项 `VERIFY_2_A_ALL_PASS`；私有相关 DP 定向 26/26；全量 unit 84 files / 578 tests PASS；`pnpm -r typecheck` PASS；全量 DP 139/140，唯一失败 `independent-gate-service-runtime.test.mjs` 因本机无 `openssl`（ENOENT -4058），属 `DEFERRED_ENV`，与本批改动无关。
- **关键环境事实**：
  - 本地 PostgreSQL 18（D:\MoHen\tools\PostgreSQL\18，监听 5432）是唯一真相源；`.env.local` 已配 DATABASE_URL / DEEPSEEK_API_KEY 等（不读取/记录值）。
  - 私有原件存储：本地文件系统 `D:/MoHen/data/private_originals`（Supabase Storage 本地不可用，用文件系统替代，SHA 回读）。
  - D 链框架：registry 已 `ACTIVE_AUTHORIZED`（批次 C 起 D00–D05 全部 enabled/attended，六个 Stage 均绑定 `private-evidence-adapters.mjs`）；6 executor 仍是 2 行桩（真实动作走私有适配器）；本批为隔离本地施工，未推送、未生产启用。
  - 本地 PG 已启用 SSL（本地 CA，`server.key` ACL 收紧至服务账户）；`mohen_producer` 与 `mohen_private_worker` 已是 LOGIN 角色（连接串在 `.env.local`，仅隔离库）；本地执行授权器密钥在 `D:/MoHen/keys/execution-auth`（未入库）。D 链 run 输入/报告在 `D:/MoHen/data/m5-runs`（scope.json + trusted/*.json + reports/*），未入库。
  - 本机无 `openssl` 可执行文件（CI Ubuntu 通常具备；`independent-gate-service-runtime.test.mjs` 因此 `DEFERRED_ENV`）。
  - Gate：DB 层 `control.sign_gate_candidate`/`revoke_gate_qualification`/`qualification_allows` 已存在；reviewer binding 声明 `m5-owner-reviewer-g0g1-producer`（G0/G1）与 `m5-owner-reviewer-g2g5-producer`（G2–G5，producer）已登记，但独立 Gate 服务未投运、未签任何 G；web 侧 `revokeGate` 被禁用、`signWorkPublication` 可用。
  - M4：7 工具 registry（内部 credit）、`transferRightsDecision=DENIED`、`directorExternalProcessingBlocker` 恒阻断；4 个 studio repository 存在。
- **第 2 步（M3 真实 D 链）批次 C 完成（2026-11-07，主体闭环）**：新增迁移 `20261107200000`（D02 H05 材料观察 + D03 主张 + D04 发现 + D05 投影候选，HMAC 字节证明/确定性 ID/幂等）、`private-candidate-repository.mjs`、`private-evidence-stage.mjs` 四个新动作、registry D02–D05 启用并绑定私有适配器、方法绑定 2→6。真实 run.mjs 落库：D04 run 48b55e23…（finding 8412d171…）、D05 run 2dd6e297…（L5 投影）；`verify-2-c-d-chain.mjs` = `VERIFY_2_C_ALL_PASS`；typecheck PASS、unit 577/579（2 skipped）、DP 157/158（唯一失败仍为 openssl `DEFERRED_ENV`）。G2–G5 未签，HOLD 属合同预期。
- 2026-11-07：第 3 步批次 D 完成（3.1 + 3.7）——私有 D 链每个阶段强制提交 Gate 候选（`submitGateCandidate`/`readGateAudit` 必填，G1–G5 依赖快照只取已签当前审计，未签留空不伪造）；迁移 `20261107210000`（私有 worker 仅 insert 候选 + 只读当前资格，显式 revoke 全部 Gate 权力）与 `20261107211000`（独立登录 `mohen_gate_signer_m5_owner` 仅 `mohen_gate_signer` 成员、无表直写）；新工具 `provision-3-gate-authority.mjs`（`PROVISION_3_ALL_PASS`）与 `verify-3-gate-chain.mjs`（`VERIFY_3_ALL_PASS` + 两条负例 PASS）。D00 run `33d0f84c…` 产出 G0 候选 `24da0dfb…`（`SUBMITTED`，阶段仍 HOLD）。**G0–G5 由 Owner 本人签发，AI 不代签**；3.2/3.3/3.4 待 Owner 逐级签发后推进。
- **剩余**：第 2 步遗留（6 executor 桩、D00→D05 单 run 串链、非私有分支）→ 第 3 步余项（Owner 逐级签 G0–G5、撤权/P08、当前资格消费、旧 PASS 不复活）→ 第 4 步 M4 Provider → 第 5 步 M5 八维度闭环。

## 五、施工历史（每次施工追加一行）

- 2026-11-07：建立台账，核实第 1 步前置。
- 2026-11-07：第 1 步 1.1–1.9 完成（studio schema 落地 + L0/L1/L2 链 + 私有原件 + 13类资产 + 幂等 + RLS 撤权）。
- 2026-11-07：建立 M5 完整闭环执行计划（5 步缺口全景 + 每步自检清单），覆盖 M5 之前全部断点；开始第 1 步 1.10 收尾。
- 2026-11-07：第 1 步 1.10 完成——新增本地私有原件存储后端 + route 按环境选择 + 本地 provision M1 身份验签链；字节层/身份层正反全部 PASS；**第 1 步（M2 底座）完整闭环**。
- 2026-11-07：第 2 步批次 A 前置核查——只读确认本地隔离库有 2 张 `STORED_VERIFIED` JPEG、NAJ source/version、2 条 raw_items，但旧 read_runs 未正确绑定 raw_item、`read_units_c02=[]`；故第 1 步 L1 行不能算真实 D01 C02 产出。
- 2026-11-07：第 2 步批次 A 完成——新增 `20261107120000` 迁移（D00 L0 登记查询 + D01 C02 扫描页持久化）、两个仓储、组合根/运行时接线、D00/D01 适配器与正反单测；方法绑定收敛 2/61/63；隔离 PG `VERIFY_2_A_ALL_PASS`、定向 26/26、全量 unit 578/578、typecheck PASS。**第 2 步仍为部分闭环**（2.1、D04/D05、2.4–2.9 未施工；未签 G0/G1）。
- 2026-11-07：第 2 步批次 B 完成（2.1）——registry 隔离激活（ACTIVE_AUTHORIZED，仅 D00/D01 enabled/attended + 私有适配器 + reviewer binding）；run.mjs 加 `--scope-file` 与执行授权预检（先于适配器 import）；resume-input 接受 D00 typed 扫描页请求；迁移 `20261107160000`（producer 列级 run 进度授权 + RLS 策略）；本地 PG 启用 SSL + producer/private_worker 登录角色；新工具 local-execution-authorizer / provision / prepare / verify。**run.mjs D00/D01 真实端到端首通**（签名 grant + 一次性 nonce + 候选落库 + 幂等复跑 + 合同 HOLD）；unit 578/578、DP 139/140（唯一失败为既有 openssl `DEFERRED_ENV`）。**2.1 闭环（VERIFIED_ISOLATED）**，第 2 步仍部分闭环。
- 2026-11-07：第 2 步批次 C 完成（2.2–2.9 主体）——迁移 `20261107200000`（D02–D05 私有候选持久化：HMAC 字节证明、确定性 ID、幂等、UNASSESSED、无 Gate 写入）；`private-candidate-repository.mjs` + 阶段/适配器/恢复输入接线；registry D02–D05 enabled/attended 并绑定私有适配器；方法绑定 2→6/63（0 残留）。真实 run.mjs：D04 48b55e23…、D05 2dd6e297… 落库并合同 HOLD；`verify-2-c-d-chain.mjs` = `VERIFY_2_C_ALL_PASS`；typecheck PASS、unit 577/579、DP 157/158（openssl `DEFERRED_ENV`）。**第 2 步主体闭环（VERIFIED_ISOLATED）**，未签任何 G。
- 2026-11-08：第 5 步批次 H 完成——同一真实作品 ST-05→ST-09 全链（真实委托+grant → 真实 LLM 导演方案/节拍 → 作品+不可变修订+幂等回放 → 投稿+机器编辑签发绑定同一修订 → WATCH G5 候选登记（复用 D 链 run/stage/依赖）+ 机器评审独立通道签发（精确修订绑定+逐动作权利+CAS）→ 四道门发布指针原子指向同修订 → WATCH 仅消费该修订、错修订拒绝 → 撤权即时拒绝 + 重签恢复）；`commitWorkRevision` 增 Creator 权利确认 opts 并接线 revisions 路由；新增 `m5-batch-h.integration.ts`（11/11 PASS）+ `probe-g5-state.mjs`；回归基线零新增失败（620/9/2 与干净 HEAD 一致），typecheck PASS；提交 `ab306b5`。维度 5/7/8 隔离闭环；维度 1/2/4/6 部分、19 组件、Admin、5.9 Owner 体验未做，`M5_OVERALL_HOLD` 不变。
- 2026-11-08：第 5 步批次 I 完成——维度 4+6：13 类资产矩阵真实盘点（`verify-5i-asset-matrix.mjs` = `VERIFY_5I_ALL_PASS`：产出 6 类逐项字段/不可变/CAS/ACL 正反，未产出 7 类如实记原因；G0–G5 current + G5 审计绑定已发布修订；缺口如实报告 use_events=0、5/5 条目无 refs）；Admin F05 Inspector 每条新增真实治理行 `assetGovernanceSummary`（缺口只按已存字段、G 资格不签发不替代）+ 单测 3 例；提交 `88be1f6`。维度 3/4/6/7/8 隔离闭环；剩余：维度 5 的 19 组件核对（批次 J）、维度 1/2 补强、5.9 Owner 体验（批次 K），`M5_OVERALL_HOLD` 不变。
