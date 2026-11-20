# D00→D01 续跑入口｜生产启用清单

> 状态：代码 A/B/C/D 段已完成并本地测试通过（main `da0df48`）；**尚未生产启用**。本文列出从"代码就绪"到"Owner 可真实点击续跑 D01"之间必须由受权配置完成的事项。任何一项缺失，续跑都会 fail closed（按钮不显示或请求被拒），不会误跑、不会重复扣费。

## 一、代码已落地（无需再做）

- 段 A：独立一次性 D01 grant（`d01-resume-authorizer.mjs`），签发前注入 CURRENT G0 校验（`d01-g0-qualification.mjs`）；journal `d01-resume-journal.mjs`。
- 段 B：从 DB 事实重建 D01 输入（`d01-resume-input.mjs`），resume 校验复用权威 `isTypedD01Carrier`。
- 段 C：dispatch `from_stage`（HMAC 覆盖）、runtime 落受限 resume 文件 + `--from D01` + 仅注入 D01 token、provider/issue 端点的 HMAC + bounded 契约。
- 段 D：Studio 按钮（仅当后端确认 `resume_d01_eligible`，即真实 G0 current PASS 时出现）、route 校验、预算复用（不新增预留/不重复扣费）。
- 测试：D01 单测 + data-production 回归 46/47（1 为既有 Windows --import fixture 问题）、vitest 路由 19/19、tsc 无新增错误。

## 二、生产 DDL（须单独授权执行；一条 additive 迁移）

- `supabase/migrations/20261120150000_d01_resume_grant_journal.sql`
  - 新建 `control.d01_resume_grant_journal`（additive，不动 D00 既有表/约束）。
  - 授权 `mohen_d00_grant_journal` 对它的 select/insert/update + RLS 策略。
- **须确认**：`mohen_d00_grant_journal` 是否已存在于云端、`mohen_d01_attestor_login`（见下）是否存在。若无对应只读角色，需另建受限 LOGIN（`nosuperuser/nobypassrls/inherit`）并授予：
  - `control.gate_candidates`、`control.gate_audits`、`control.production_runs` 的 SELECT
  - `source.raw_items`、`studio.private_originals` 的 SELECT（重建输入所需，只读）
  - 该角色绝不可有写权限、不可 superuser、不可 BYPASSRLS。

## 三、d00-authority（独立授权应用）新增环境变量

在 d00-authority 的 Vercel 项目 Preview 环境设置（值以实际托管连接串/密钥为准）：

- `MOHEN_D01_RESUME_AUTHORITY_ENABLED=true`
- `MOHEN_D01_ATTESTOR_DATABASE_URL`：第二节的受限 attestor 只读连接串（含只读角色、verify-full）
- `MOHEN_D01_RESUME_SIGNING_KEY`：D01 grant 的独立 Ed25519 私钥（新生成，绝不与 web/Runner 共享）
- `MOHEN_D01_RESUME_HOLD_EPOCH`：本轮信任锚点字符串（建议用本次授权日期+用途）
- `MOHEN_D01_ISSUE_CREDENTIAL`：issue 端点请求 HMAC 凭据（≥32 字符）
- `MOHEN_D01_VERIFY_CREDENTIAL`：consume/verify 端点 HMAC 凭据（≥32 字符）
- 复用既有：`MOHEN_D00_AUTHORITY_DATABASE_URL`、`MOHEN_D00_AUTHORITY_DATABASE_CA`、`MOHEN_D00_GATE_READER_DATABASE_URL`、`MOHEN_GATE_CONSUME_CREDENTIAL`
- 部署 d00-authority Preview（新增 `/api/d01-issue` 路由）。

## 四、web（主应用）新增环境变量

- `MOHEN_D01_ISSUE_URL=https://<d00-authority-preview-host>/api/d01-issue`
- `MOHEN_D01_ISSUE_CREDENTIAL`：与第三节 issue 凭据**同值**（两端配对）

## 五、部署顺序

1. 执行第二节 DDL + 确认只读角色（受权操作）。
2. 配置第三节 d00-authority env → 部署 d00-authority Preview → 用只读 probe/最小请求确认 `/api/d01-issue` 存在且非 200 时 fail closed。
3. 配置第四节 web env → 无缓存重部署主应用 Preview（`vercel deploy --force`，非 --prod）。
4. Owner 本人 SSO 打开 Studio，进入真实任务 `53ad1a29-…`，确认"从已合格 D00 续跑 D01"按钮出现（=后端确认 G0 current PASS）。
5. Owner 本人点击该按钮（AI 不代点、不伪造会话）；回读 run `bfcdfad6` 终态与 D01 证据。

## 六、诚实边界

- 未完成第二~四节前，本功能在生产不可用：按钮不显示或请求 503/403，属预期的 fail closed，不是 bug。
- 续跑 D01 复用 `bfcdfad6` 的 D00 预算预留，不新增费用；D01 是私有原件读取，不调用 LLM。
- D01 产出后若无 G1 独立资格，结果 HOLD 属当前真实状态（八维仍 0/8），不伪造 PASS。
- 全程不得：伪造 Owner 会话、自签 Gate、绕过 RLS、改 Production、公众开放、新增未授权付费。
