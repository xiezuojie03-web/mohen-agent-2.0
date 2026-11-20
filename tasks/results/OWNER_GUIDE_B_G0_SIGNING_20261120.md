# 走 B 路径：Owner 配合事项手把手指南｜2026-11-20

> 目标：在云端 `mohen-cloud` 为真实 D00 候选 `48766904`（run `bfcdfad6`）完成独立 G0 签发。
> 本指南只写"你要做什么"和"我做什么"。**任何密钥/口令都不要发给 Chat、不要写进仓库、不要贴进聊天框**——一旦贴出即视为泄露，必须轮换。

## 0. 先说清楚：B 的真实难度

- 好消息：历史上云端**配过并跑通过** D00 执行许可（progress L5282/L5355），说明这套基础设施不是从零开始。当前云端 `mohen_gate_signer_m5_machine` 角色显示为 0，更可能是环境重建后丢失，需要重装。
- 坏消息：独立的 **G0 机器签发**从来只在一次性隔离测试里成功过（`m5-root-g0-handoff.integration.mjs`），**真实作品 G0 没有成功先例**。所以某些环节（binding/credential/policy 是否齐备）要边做边查，我不承诺"照做必成"，但会逐步给你确切的下一步。
- 分工：**所有密钥、口令、具名放行由你在平台侧操作**；所有 SQL 我写好给你贴、所有工程动作（起服务、发签发、回读、记账）我来做。

---

## 第 1 项：在云端安装 G0 机器签发角色

**做什么**：在 Supabase `mohen-cloud` 的 SQL Editor 里执行一段幂等 DDL，创建低权签发 login 和它的读权限。

**我给你的东西**（已生成）：`tasks/results/G0_SIGNER_CLOUD_DDL_20261120.sql`，内容基于仓库现成迁移 `20261107220000_mab_m5_machine_rule_reviewer.sql`，已把 private_originals 的 RLS scope 改为真实项目 `e03c4ba8`。幂等、不含任何密钥。

**你怎么操作**：
1. 打开 Supabase 控制台 → 项目 `mohen-cloud` → 左侧 **SQL Editor** → New query。
2. 粘贴我给你的 SQL，点 **Run**。
3. 把执行结果（成功/报错原文）截图或文字回我。**不要贴任何密钥**——这段 SQL 本身不含密钥。
4. 我会回读确认角色已建、权限正确。

**为什么要你做**：这需要在云端用 admin 权限建角色，是"正式 Gate 启用"的一部分，必须由项目所有者在平台操作。

---

## 第 2 项：给签发角色设置登录口令，并安全注入

**做什么**：给 `mohen_gate_signer_m5_machine` 和 reader 角色设置强随机口令，作为数据库连接凭据。

**你怎么做**（二选一，推荐 A）：
- **A（推荐）**：你在本地用密码管理器生成一个 ≥32 位随机口令，记在密码管理器里，**不要发我**。告诉我"口令已设好"，我会指导你在 Supabase 里用它，后续连接串也由你在平台侧配置。
- **B**：如果确实需要我代管连接串，你只能通过加密渠道给我——但我建议避免。

**关键约束**：
- 这个口令只能出现在 Supabase / Vercel 的平台配置里，绝不能进 Git、聊天、日志。
- 该角色必须保持 `NOINHERIT / NOSUPERUSER / NOBYPASSRLS`，只能读指定表 + 执行 `sign_gate_candidate` 等函数，不能写 gate 表（DDL 里已强制）。

---

## 第 3 项：Vercel Preview 环境变量（如果走 HTTPS 服务路径）

**背景**：G0 签发有两种执行形态。仓库现成的隔离测试直接在 Node 进程里用两个 DB 连接池跑（`createIndependentGateService`），不一定需要 Vercel。但若最终走云端受保护 Preview 的 HTTPS 服务路径，则需要以下变量。

**现状**（我已只读查过，只看键名）：Vercel 项目 `mohen-agent-2-0` 的 preview 目前**只配了**：`MOHEN_INDEPENDENT_GATE_VERIFY_URL`、`MOHEN_INDEPENDENT_GATE_VERIFY_CREDENTIAL`、`MOHEN_SUPABASE_URL`。以下**全部缺失**。

**你需要在 Vercel 控制台 → 项目 → Settings → Environment Variables 添加**（Scope 选 **Preview**）：

| 变量名 | 值怎么来 | 谁生成 |
|---|---|---|
| `MOHEN_D00_AUTHORITY_ENABLED` | 固定填 `true` | 你填 |
| `MOHEN_D00_GATE_READER_ENABLED` | 固定填 `true` | 你填 |
| `MOHEN_D00_AUTHORITY_DATABASE_URL` | 指向云端库、用第 2 项凭据的连接串 | 你填 |
| `MOHEN_D00_AUTHORITY_DATABASE_CA` | Supabase CA 证书内容（`.secrets/supabase-ca/prod-ca-2021.crt`） | 我给你文件内容，你粘贴 |
| `MOHEN_D00_GATE_READER_DATABASE_URL` | reader 低权连接串 | 你填 |
| `MOHEN_GATE_APPROVED_RUN_ID` | 固定填 `bfcdfad6-bbcb-4b68-946a-82e1302eeb80` | 你填 |
| `MOHEN_D00_AUTHORITY_ISSUE_CREDENTIAL` | ≥32 位随机串，Bearer 凭据 | 你生成 |
| `MOHEN_D00_AUTHORITY_VERIFY_CREDENTIAL` | ≥32 位随机串 | 你生成 |
| `MOHEN_D00_AUTHORITY_APPROVAL` | 一个 JSON 字符串（见第 4 项） | 我算好后给你 |
| `MOHEN_D00_AUTHORITY_SIGNING_KEY` | Ed25519 私钥 PEM | 我给你生成命令，你在本地生成后填入 |

> 注：`MOHEN_D00_AUTHORITY_DATABASE_CA` Platform 里通常贴 PEM 文本。我会在你需要时把 CA 内容准备好。

---

## 第 4 项：Owner 具名放行（APPROVAL）

**做什么**：生成一个绑定当前 run 的一次性放行 JSON。这不是随便填的——它的 `inputDigest` 必须等于 run 的真实规范化输入摘要，`registryDigest` 必须等于当前 Registry 的摘要，否则 authorizer 会拒绝（`D00_EXECUTION_AUTHORITY_CONFIG_INVALID`）。

**APPROVAL 结构**（来自 `d00-execution-authorizer.mjs`）——我已从真实 run/registry/progress 算出并填好，除 `holdEpoch` 外均可直接核验：

```json
{
  "runId": "bfcdfad6-bbcb-4b68-946a-82e1302eeb80",
  "inputDigest": "478a8668c699fae2d66b771a536251cb05e6c1e4fc85ce212b60cd85db5a2199",
  "registryDigest": "869dcaaf40c1cd70ef8324f702b196cd013214da3e2880749f1eeaf13910b597",
  "holdEpoch": "OWNER-2026-11-20-G0-01",
  "authorizedConditions": {
    "user_engineering_authorization": true,
    "M0_environment_and_bindings_verified": true,
    "isolation_and_contract_tests_pass": true,
    "no_formal_hold_bypass": true
  }
}
```

字段来源（都可复算核对）：
- `inputDigest` = progress L5349 记录的该 run 规范化输入摘要（当时"用同一输入测试签发通过"）。
- `registryDigest` = 我对当前 `production-registry.json` 跑 `executionDigest()` 的结果（status=ACTIVE_AUTHORIZED、activation.enabled=true、arch_gen=mohen.six-stage.v1）。
- `authorizedConditions` 的四个 key = registry 里 D00 job 的 `enable_requires`，必须全为 true。
- `holdEpoch` = 占位示例，你可用自己本次的唯一标记替换。

**分工**：
- 前三项 + conditions keys —— 我已算好，你不用管。
- `holdEpoch` —— 你给一个本次放行的唯一标记，表示"这是你本人这次的放行"。
- 你确认这句："我授权对 run `bfcdfad6` / 候选 `48766904` 执行独立 G0 签发，holdEpoch = <你给的标记>"——这就是具名放行。

---

## 第 5 项：Ed25519 签名密钥

**做什么**：D00 Authority 用 Ed25519 私钥签发放行令牌。

**你怎么做**（本地终端，不联网、不进仓库）：
```
node -e "const {generateKeyPairSync}=require('crypto');const {privateKey,publicKey}=generateKeyPairSync('ed25519');console.log(privateKey.export({type:'pkcs8',format:'pem'}));console.log('---PUBLIC---');console.log(publicKey.export({type:'spki',format:'pem'}))"
```
- 把 **私钥 PEM**（`-----BEGIN PRIVATE KEY-----` 开头那一整段）填入 Vercel 的 `MOHEN_D00_AUTHORITY_SIGNING_KEY`。
- **公钥**回我一份（公钥不是秘密，可发），用于核对。
- 私钥只留在 Vercel 和你本地密码管理器，绝不发我。

---

## 需要你实际动手的清单（汇总）

1. ✅ SQL Editor 执行我给的 G0 角色 DDL（第 1 项）——**最优先**
2. ✅ 给 signer / reader 角色设强口令（第 2 项）
3. ✅ Vercel Preview 填 10 个环境变量（第 3 项）——其中 3 个我算好给你
4. ✅ 确认一句具名放行 + 给 holdEpoch（第 4 项）
5. ✅ 本地生成 Ed25519 密钥对，私钥填 Vercel、公钥给我（第 5 项）

## 我已完成、不需要你等的

- ✅ 第 1 项 DDL 文件已生成：`tasks/results/G0_SIGNER_CLOUD_DDL_20261120.sql`（已改为真实 project scope）。
- ✅ 第 4 项 APPROVAL 已算好（见上，含可复算的 inputDigest/registryDigest/conditions）。
- 待你执行第 1 项后：我会回读校验角色、准备 CA 证书内容、驱动后续签发与回读。

## 一个重要判断（可能减少你的工作量）

历史 progress 显示：D00 **执行许可**（Ed25519 + 持久账本）在云端**曾成功签发并一次性消费**（L5282/L5329/L5355），且本次 Preview `dpl_Hiis45...` 回执为 `journal/gateReader ready`。这说明第 3 项里那些 `MOHEN_D00_AUTHORITY_*` 变量**历史上是配过且工作的**——我之前查到 Vercel 当前 MISSING，可能是不同 deployment 或后续清理所致。

因此更省事的路径可能是：在现有已 READY 的授权 Preview 上**复用既有配置**，只需你补齐 G0 签发侧（第 1 项角色 + 第 5 项密钥），而不必重填全部 10 个变量。等你执行完第 1 项，我会先核验现有 Preview 到底还活着哪些能力，再告诉你第 3 项到底要填几个——避免你做无用功。

## 一个诚实的边界提醒

即使以上全部完成，G0 签发仍可能因"候选依赖的 reviewer binding / service credential / gate policy 在云端不齐备"而 HOLD——这些是历史上从没在真实作品上跑通的部分。遇到时我会把确切缺口和下一步给你，不会假装成功，也不会用假数据灌过去（PLAN 明令禁止）。

---
下一步：你说"开始"，我先产出**第 1 项 DDL 文件 + 第 4 项 APPROVAL 计算**，交给你执行和确认。
