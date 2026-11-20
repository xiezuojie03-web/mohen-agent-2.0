# 云端 D00→D01 续跑入口｜受控设计 V1.0

> 日期 2026-11-20｜Owner "走方案①，全面授权"｜施工基线 main `deac990`｜状态 DESIGN_LOCKED，分段施工进行中
>
> 目标：让真实 run `bfcdfad6`（D00 已合格、G0 审计 `888db9e6` current PASS）能在云端**复用已合格 G0、只跑 D01**，不重跑已完成 D00。

## 1. 不可越界的安全底线（任何段都不得降低）

- 不伪造 Owner 会话、RLS token、Gate 资格或 PASS；不自签独立 Gate；不绕过原件所有权校验。
- 真实生产发起仍必须 Owner 本人已登录 Studio 会话：`getSession()` → 30s `owner_session_token` → 原件 `getStored(originalId,token)` + 云端 private-worker 二次复核。本改造**不提供**任何长期 service/operator 代发入口。
- D01 grant 必须由**独立授权服务**签发（非 Runner/Creator/Operator），签发前用低权 reader 校验 G0 当前有效且 input/output digest 精确绑定。
- D01 输入由**服务端从 DB 事实确定性重建**，绝不信任浏览器传入的 JSON。
- 不碰 Production、不启用正式 Gate/公众开放、不新增付费/Provider 调用超出既有授权。本次续跑 D01 不调用 LLM（D01 是私有原件读取，C01/C02 走本地抽取）。

## 2. 信任模型与数据流

```
Owner(已登录) → Studio"续跑 D01"按钮
  → POST /api/studio/research-tasks/:id/production { from_stage:"D01", original_id, page_number }
  → 服务端 RLS 校验原件 + 预算 CAS（沿用现有 requestProduction 前置）
  → 服务端用低权 reader 读 G0 current PASS（888db9e6 类）→ 校验绑定 input/output digest
  → 服务端用 gate-stage-output-attestation 从 DB 事实重建 D01 resume_input
  → 独立授权端点签 D01 stage grant（前置 G0 已验，journal 键 (run_id,stage) 一次签一次消费）
  → 云派发 dispatch 带 from_stage + 服务端可信 resume 引用（HMAC 签名覆盖）
  → 云端 handler claim（冻结输入含 from_stage/resume digest）→ Runner
  → Runner --from D01 --resume-input-file <受限文件>；assertStageExecutionAuthorized 校验 D01 grant
  → D01 executor 产出 → requireIndependentStageQualification 需 G1（若无 G1 则 HOLD，符合现状）
  → 终态写回 control.production_runs
```

## 3. 改造分段（每段独立可测、小批次提交）

### 段 A｜独立 D01 grant 签发与消费（核心安全边界）
- 新增 stage-aware authorizer：从 `createD00ExecutionAuthorizer` 派生，支持 D01，binding=(run_id,stage,job_id,mode)；issue 前置校验 G0 current PASS + input digest 绑定（用低权 reader 读 `read_gate_stage_qualification`）。
- journal 键从 `run_id` 扩展为 `(run_id,stage)`（新增迁移，不动 D00 既有行）；一条 grant 一次 issue 一次 consume。
- consume 端点 stage-aware（现有 D00 `/consume` 不能原样用于 D01）。
- HTTP 层复用 `createD00ExecutionAuthorityHandler`（已抽象 authority.issue/consume + 双 credential + bounded JSON）。
- 端点部署在 d00-authority（独立权限域）。
- 验证：单测覆盖 D01 签发/消费/一次性/G0 未合格拒绝/digest 不匹配拒绝；真实低权 reader 读回。

### 段 B｜D01 输入重建与 resume 白名单
- 复用 `tools/gate-stage-output-attestation.mjs` 的重建逻辑，抽成服务端可调用函数（从 source/raw/scope 事实构造 `{schema,stage:'D01',originalId,method_plan,page|text}`）。
- `resume-input.mjs` D01 白名单扩展 `method_plan` + `text` 载体（C01/C02），保持与 D00 adapter 产出逐字一致，digest 等于 G0 output_digest。
- 验证：真实候选 `48766904` 重建输入 `executionDigest == 002bb07f…`（复用已实测路径）。

### 段 C｜云端续跑传输与 Runner
- `cloud-production-dispatch.mjs`：`FIELDS`/`SCOPE` 白名单加 `from_stage`、`resume_input_digest`（不传原始 JSON）；摘要覆盖 from_stage。
- `cloud-production-runtime.mjs`：`runnerEnvironment` 白名单加 `MOHEN_TRUSTED_RESUME_INPUT_DIR`；服务端把重建的 resume_input 落为受限文件（0700 目录、0600 文件）；Runner args 加 `--from D01 --resume-input-file`。
- `cloud-production-server.mjs`：claim 前在服务端完成 G0 校验 + 输入重建（非 Runner 侧）；冻结 input digest 含 from_stage。
- 验证：定向测试 claim 摘要一致性、受限文件权限、from/to 参数。

### 段 D｜Studio/API 受约束续跑入口
- `production/route.ts`：POST 接受 `from_stage`（仅 D01，且仅当 boss run 已合格）；沿用原件 RLS + 会话校验。
- `StudioWorkbench.tsx`：当 D00 已合格且存在续跑能力时显示"续跑下一阶段（D01）"按钮，POST 带 `from_stage:"D01"`。
- 验证：权限/阶段白名单/无会话拒绝/重复消费拒绝的正反测试。

### 段 E｜联调、回归、交付
- 全套相关单测 + 隔离 PG/HTTP/Gate 回归；同步 CURRENT/progress/PLAN。
- 无缓存部署 Preview；Owner 本人 SSO 登录 Studio 点"续跑 D01"；回读 run 终态与 D01 证据。
- 若无 G1 独立资格，D01 产出后 HOLD 属预期（当前八维仍 0/8），不伪造 PASS。

## 4. 关键复用组件（已实证存在）

| 用途 | 组件 | 证据 |
|---|---|---|
| D01 输入重建 + digest 校验 | `tools/gate-stage-output-attestation.mjs` | 真实候选 `DRY_ATTEST_PASS/DIGEST_MATCH=true`（progress 5432） |
| G0 current 只读校验 | `apps/d00-authority/api/current.mjs` + `createIndependentGateClient` | 终态 reader 已验证读回 888db9e6 PASS |
| grant HTTP 抽象 | `createD00ExecutionAuthorityHandler` | 双 credential + bounded JSON（d00-execution-authority-http.mjs:9-44） |
| JWT/摘要/一次性 | `d00-execution-authorizer.mjs` + `execution-authority.mjs` | 可派生 stage-aware |
| CLI 续跑参数 | `run.mjs --from/--resume-input-file` + `resume-input.mjs` | 已存在，仅需扩展白名单 |
| D01 typed 形状 | `adapter-binding.mjs:82-113` | 已接受 method_plan + scanned_page/text |

## 5. 当前阻断事实（施工前基底）

- run `bfcdfad6` HOLD@D00（外层 `CLOUD_EXECUTOR_PROCESS_FAILED`，历史收尾）；D00 grant `consumed_at=05:46:28Z` 一次性消费，不能重放。
- G0 审计 `888db9e6` PASS/independent_gate/current_valid/valid_until 2026-11-26，stage_binding input `478a8668…`/output `002bb07f…`。
- 云端 D01 grant 签发方、journal (run_id,stage) 键、consume、resume 传输、UI 入口均缺失——本设计逐段补齐。

## 6. 证据边界

- 本设计是施工蓝图，不是运行 PASS。每段以真实测试/回执为准；任一红灯停在 main 定向修复，不 skip、不放松断言。
- 全部完成后仍需 Owner 本人登录 Preview 点击发起，AI 不代点、不伪造会话。
