# 墨痕 M5 完整闭环施工台账（本地主导 · 持久化）

> 本文件是**本地主导施工的持久台账**，任何新会话接手先读这里 + `PLAN.md` + `progress.md`。
> 目的：不受对话上下文影响，随时能知道"做到哪一步、每步闭环了没、下一步是什么、哪些断点待补"。
> 施工铁律：**严格按依赖顺序，每步做完自检清单（PG+HTTP 证据）才进下一步，不跳步、不脚本代跑表面。**
> 技术细节由 CodeBuddy 自主判断；只有产品方向/功能/效果/额外费用/生产启用/资料外发才转白话问 Owner。

## 一、施工路线（5 步，对齐 PLAN §3）

| 步 | 目标 | PLAN 依据 | 状态 |
|---|---|---|---|
| 1 | M2 底座：studio schema 全表 + 私有原件 + L0→L1→L2 真实链（含 13 类资产） | PLAN §3.2 / §5-M2 | ✅ 闭环（1.1–1.10 全完成） |
| 2 | M3 真实 D 链：production-registry 激活 + M5 实际方法唯一绑定 + D00–D05 真实执行 | PLAN §3.3 | ⬜ 待施工 |
| 3 | M3 独立 Gate：真实 Reviewer 投运 + G0–G5 签发/撤权/当前消费 | PLAN §3.3 | ⬜ 待施工 |
| 4 | M4 受控 Provider 执行器（B 线）：正道解阻断 + 真实派发/费用/Receipt | PLAN §3.4 | ⬜ 待施工 |
| 5 | M5 八维度完整闭环：ST-01→ST-09 同一真实作品 + Owner 亲自体验 | PLAN §3.5 / 八维矩阵 | ⬜ 待施工 |

> 说明：原 6 步里的"M2 原件链"和"13 类资产表"实为**同一 studio schema 迁移链**（private_originals 依赖 projects+asset_revisions），已合并为第 1 步。5 步顺序即 PLAN §3.5-C 的依赖顺序（M1 隔离前提已在历史批次满足 → M2 → M3 → M4 → M5）。

## 二、缺口全景（M5 之前的断点清单）

> 每个断点 = 一个"必须补上才能算 M5 前置完整"的具体缺口。状态：✅已补 / 🔵进行中 / ⬜待补。

### 第 1 步 · M2 底座
- ✅ 1.1–1.9：studio 8 表、项目、私有原件、L0/L1/L2、13 类资产、幂等、RLS 撤权（见 §三）。
- ✅ **1.10 HTTP 正反**：复用 `GET /api/studio/attachments?original_id=` 私有原件下载端点，新增本地文件系统存储后端（`createLocalPrivateOriginalStorage`，与 Supabase 版同 key/同 SHA 校验/fail-closed），并在本地 provision M1 身份验签链（`MOHEN_DATABASE_SESSION_SECRET` + `control.session_verification_keys`）。字节层正反 + 身份层正反（有效 Owner token → 可见 2 原件；无/无效/跨 owner token → 0 行）全部 PASS。

### 第 2 步 · M3 真实 D 链（当前最大断点群）
- ⬜ 2.1 production-registry 激活：`status=DESIGN_TARGET_NOT_APPLIED`、`activation.enabled=false` → 需对 M5 真实作品范围激活（非全量生产）。
- ⬜ 2.2 方法唯一绑定：63 方法 `implementation_binding` 全为 `TO_VERIFY_IN_M0`。M5 真实作品（松江府田赋）实际只需绑定：D01=C02（扫描书影）、D02=H05（地方志）、D03=W 方法、D04=A 方法、D05=P 方法；其余方法**明确 HOLD**（PLAN 允许）。
- ⬜ 2.3 D00/D04/D05 执行器：6 个 executor 是 2 行桩；`private-evidence-adapters.mjs` 只有 D01–D03 生效，D00/D04/D05 = inactiveStage。
- ⬜ 2.4 L0–L5 候选真实产出：D 链跑通后各层候选（含 L3 world_claim、L4 humanistic_finding、L5 projection/seed）。

### 第 3 步 · M3 独立 Gate
- ⬜ 3.1 独立 Reviewer 真实身份：DB 层 `control.sign_gate_candidate`/`revoke_gate_qualification`/`qualification_allows` 已存在；但 `m3-gate-preflight` 返回 `reviewer_identity_verified:false`（未投运）。按 Owner 决策，Owner 本人兼任唯一 Reviewer。
- ⬜ 3.2 G0–G5 独立签发（非 Producer/Operator 自签）。
- ⬜ 3.3 撤权 + P08 精准失效（`revoke_gate_qualification`，撤权后新请求即时拒绝）。
- ⬜ 3.4 当前资格消费（`qualification_allows` 逐请求核验，非旧 PASS 复用）。

### 第 4 步 · M4 受控 Provider
- ⬜ 4.1 `directorExternalProcessingBlocker()` 恒阻断（`return "external_processing_not_authorized"`）→ 正道是**实现受控派发后条件放行**，不是删掉阻断。
- ⬜ 4.2 `studio-plans.ts` 的 `transferRightsDecision.external_processing=DENIED`、`execution_authorized=false`、`budget='0'CRD` → 需接真实授权/预算。
- ⬜ 4.3 费用真实化：`tool-ledger.ts` 7 工具 cost 为内部 credit（非真实币种/token）→ 映射真实 Provider 费用。
- ⬜ 4.4 Receipt 持久化：真实 provider/model/version、token/用量、币种费用、输入输出 hash。

### 第 5 步 · M5 八维度闭环（见 §三 第 5 步）

## 三、每步闭环自检清单（做到才算"这一步闭环"）

### 第 1 步 · M2 底座（自检 10 项）
- [x] 1.1 studio schema 8 张表建齐（projects/asset_heads/asset_revisions/delegations/execution_receipts/asset_links/use_events/private_originals）
- [x] 1.2 项目创建：studio.projects 有"松江府田赋"项目（owner=Owner）
- [x] 1.3 私有原件入库：NAJ 田赋页字节入 private_originals，state=STORED_VERIFIED，SHA 回读一致（本地文件系统 D:/MoHen/data/private_originals）
- [x] 1.4 L0 来源登记：source.sources + source_versions + raw_items 有 NAJ 记录（rights/uri/locator + 字节项）
- [x] 1.5 L1 载体读取：source.read_runs + read_units（method_code=C02 扫描书影）
- [x] 1.6 L2 材料理解：evidence.reading_units + material_evidence 有 OCR 证据（literal_reading + source_voice）
- [x] 1.7 13 类资产：research_brief/source_anchor/reading_note/evidence_note 四类真实落库（不可变 revision，5 heads + 5 revisions）
- [x] 1.8 同输入回放：重复执行落地，记录数不变（rev/evi/raw = 5/2/2，幂等通过）
- [x] 1.9 撤权拒绝：RLS 无身份拒绝验证通过（超级用户可见 2 原件；mohen_app_runtime 无 session_token 时 RLS 返回 0 行，拒绝）
- [x] 1.10 HTTP 正反：本地文件系统后端读私有原件字节（正例 SHA 回读一致=200 逻辑）；有效 Owner token → RLS 可见 2 原件；无/无效/跨 owner token → 0 行（401/404 逻辑）

### 第 2 步 · M3 真实 D 链（自检 9 项）
- [ ] 2.1 registry 激活：production-registry.json `status` → 激活态、`enabled=true`（M5 作品范围），run.mjs 不再报 `REGISTRY_NOT_ACTIVE`
- [ ] 2.2 方法绑定：M5 实际方法（C02/H05 + 选定 W/A/P）`implementation_binding` → 具体 executable；其余方法登记 HOLD（不残留 TO_VERIFY_IN_M0）
- [ ] 2.3 适配器指向：`adapter_binding` 指向真实私有证据适配器（非金泽 layer1 默认），D00/D04/D05 补齐
- [ ] 2.4 D00 来源获取：真实 NAJ 来源→原件字节→L0 候选（G0 待签）
- [ ] 2.5 D01 载体读取：C02 → L1 read_unit（G1 待签）
- [ ] 2.6 D02 材料理解：H05 → L2 material_observation（G2 待签）
- [ ] 2.7 D03 世界建构：W 方法 → L3 world_claim（G3 待签）
- [ ] 2.8 D04 人文发现：A 方法 → L4 humanistic_finding（G4 待签）
- [ ] 2.9 D05 发布：P 方法 → L5 projection/seed（G5 待签）；run.mjs 端到端真实跑通（无 hidden fallback、无金泽样板）

### 第 3 步 · M3 独立 Gate（自检 8 项）
- [ ] 3.1 独立 Reviewer 身份：系统登记 Owner 为唯一 Reviewer，`m3-gate-preflight` 不再 `reviewer_identity_verified:false`
- [ ] 3.2 G0–G4 独立签发：`control.sign_gate_candidate` 逐阶段 PASS（非 Producer/Operator 自签）
- [ ] 3.3 G5 独立签发：精确 WorkRevision + 知识/媒资依赖
- [ ] 3.4 当前资格消费：`control.qualification_allows` 逐请求核验 true
- [ ] 3.5 撤权：`control.revoke_gate_qualification` 生效
- [ ] 3.6 P08 精准失效：撤权后新请求即时拒绝（PG 断言 + HTTP 断言）
- [ ] 3.7 负例：Producer/Operator 代签被拒（失败关闭）
- [ ] 3.8 旧 PASS/错 consumer 不复活（非旧资格复用）

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
- [ ] 5.3 维度 3 真实来源/证据/D·L·G（ST-02/03/04）：原件→读取→证据→主张→人文解释，精确 source/version/locator/revision + 独立 Gate 回执
- [ ] 5.4 维度 4 13 类知识资产（M4-C04/Admin）：真实作品实际产生的类型逐项字段/修订/ACL/CAS 正反验收；不适用类型说明原因（不为凑数伪造）
- [ ] 5.5 维度 5 Studio 真实创作（ST-05/06/07）：H1/H2/H3 + 19 组件实际参与导演/叙事/镜头；可预览、局部修改、保存/恢复、不可变 WorkRevision
- [ ] 5.6 维度 6 Admin 知识资产管理（F05/ST-07/08/09）：逐条显示类型/认识状态/精确来源/D·G 资格/权利用途/版本/复用/缺口；仅授权 Owner 可管理
- [ ] 5.7 维度 7 独立 G5/媒资权利/发布（ST-08/09）：独立 Reviewer 对精确 WorkRevision + 知识/媒资依赖当前资格审查；发布指针原子指向该修订
- [ ] 5.8 维度 8 WATCH 消费与撤权：WATCH 只消费第 7 项发布的同一 WorkRevision；每请求核 G5/rights/purpose/consumer/scope/source；撤权后新请求立即拒绝
- [ ] 5.9 Owner 亲自体验签收：Owner 实际完成 Studio 创作、Admin 条目核查、WATCH 消费，逐项确认八维矩阵

## 四、当前进度（最新状态，持续更新）

- **第 1 步（M2 底座）1.1–1.10 全部完成（闭环）**：
  - 应用 M2 迁移链（20261102105810 studio 资产 + 20261102140000 私有原件 + 20261102145410 证据桥 + 20261103143451 文本读取；补建 anon/authenticated/service_role 角色）。
  - 落地"松江府田赋"：项目 1 + 私有原件 2（STORED_VERIFIED，本地文件系统 D:/MoHen/data/private_originals，SHA 回读一致）+ 13类资产 5 heads/5 revisions + L0(sources/source_versions/raw_items) + L1(read_runs/read_units C02) + L2(reading_units/material_evidence)。
  - 幂等回放通过（记录数 5/2/2 不变）；RLS 撤权拒绝通过（无身份返回 0 行）。
  - 1.10 HTTP 正反：新增 `createLocalPrivateOriginalStorage`（本地文件系统后端，与 Supabase 版同 key/同校验/fail-closed）+ `attachments/route.ts` 按 `MOHEN_PRIVATE_ORIGINAL_LOCAL_FS` 选择后端 + 类型声明；本地 provision M1 身份链（`MOHEN_DATABASE_SESSION_SECRET` ↔ `control.session_verification_keys`）。验证：字节层 SHA 回读一致（正）/错误 SHA 不一致（反）；身份层有效 Owner token 可见 2 原件（正）/无 token、无效 token、跨 owner token 均 0 行（反）。
  - 关键认知修正：L1 物理表是 source.read_runs/read_units，L2 是 evidence.reading_units/material_evidence（material_evidence.reading_unit_id 引用 evidence.reading_units，非 source.read_units）；L0 含 raw_items（原始字节项）。
- **关键环境事实**：
  - 本地 PostgreSQL 18（D:\MoHen\tools\PostgreSQL\18，监听 5432）是唯一真相源；`.env.local` 已配 DATABASE_URL / DEEPSEEK_API_KEY 等（不读取/记录值）。
  - 私有原件存储：本地文件系统 `D:/MoHen/data/private_originals`（Supabase Storage 本地不可用，用文件系统替代，SHA 回读）。
  - D 链框架文件齐全但未激活：registry `DESIGN_TARGET_NOT_APPLIED`；6 executor 是 2 行桩；`private-evidence-adapters.mjs` 只 D01–D03 生效；`layer1-adapters.mjs` 默认金泽主题。
  - Gate：DB 层 `control.sign_gate_candidate`/`revoke_gate_qualification`/`qualification_allows` 已存在；web 侧 `revokeGate` 被禁用、`signWorkPublication` 可用。
  - M4：7 工具 registry（内部 credit）、`transferRightsDecision=DENIED`、`directorExternalProcessingBlocker` 恒阻断；4 个 studio repository 存在。
- **剩余**：第 2 步 M3 D 链 → 第 3 步 M3 Gate → 第 4 步 M4 Provider → 第 5 步 M5 八维度闭环。

## 五、施工历史（每次施工追加一行）

- 2026-11-07：建立台账，核实第 1 步前置。
- 2026-11-07：第 1 步 1.1–1.9 完成（studio schema 落地 + L0/L1/L2 链 + 私有原件 + 13类资产 + 幂等 + RLS 撤权）。
- 2026-11-07：建立 M5 完整闭环执行计划（5 步缺口全景 + 每步自检清单），覆盖 M5 之前全部断点；开始第 1 步 1.10 收尾。
- 2026-11-07：第 1 步 1.10 完成——新增本地私有原件存储后端 + route 按环境选择 + 本地 provision M1 身份验签链；字节层/身份层正反全部 PASS；**第 1 步（M2 底座）完整闭环**。
