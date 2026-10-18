# 墨痕｜部署与连接运维手册（Runbook）

> 用途：后续生产/开发再次执行「GitHub 推送 / vercel 部署 / Supabase 连接」时，照此操作即可，避免重踩已踩过的坑。
> 记录：2026-10-18（SAMPLE-TRIAL-16 收口）。
> 安全：本文件**只记录密钥「存放位置」与「获取方式」，绝不写入密钥明文**。明文密钥一律留在本机 gitignored 文件内。

---

## 0｜一句话前提

- 本机在中国网络环境：**GitHub HTTPS 直连被墙**，需走本地代理「芒果 VPN」`http://127.0.0.1:51081`。
- Supabase 直连域名是 **IPv6-only**，任何 IPv4 环境（vercel、多数本地）都连不上，**必须用连接池（pooler）**。
- 所有线上/云端写入前先看「密钥位置」§4，不要凭记忆写密码。

---

## 1｜GitHub 推送

- 仓库：`https://github.com/xiezuojie03-web/mohen-agent-2.0.git`
- 分支：`handoff/local-b-20260930`（**不要动 main**）
- 作者（已配置）：`xiezuojie03 <315303392+xiezuojie03-web@users.noreply.github.com>`
  - 为什么用 noreply 邮箱：真实邮箱 `xiezuojie03@gmail.com` 会触发 GitHub `GH007`（私有邮箱保护）拒绝推送；noreply 邮箱既过 GitHub 又过 Vercel「commit 作者 Git 账户」识别。

```bash
# 先开芒果 VPN（否则 github.com:443 连不上）
git config http.proxy http://127.0.0.1:51081
git config https.proxy http://127.0.0.1:51081
git push origin handoff/local-b-20260930
git config --unset http.proxy
git config --unset https.proxy
```

- 如需改写已推送的 commit 作者（force push，仅 handoff 分支，需 Owner 授权）：
  ```bash
  git commit --amend --reset-author --no-edit
  git push --force-with-lease origin handoff/local-b-20260930
  ```

---

## 2｜vercel 部署

- 项目：`napoles1/mohen-agent-2-0`（projectId `prj_nzfi9XWLJKuIMxWGKmYUrNpcyLtV`，orgId `team_hUpVPUMnytgHi0OOs5YVc4NF`）
- 生产 URL：`https://mohen-agent-2-0.vercel.app`
- 登录状态：`C:\Users\Administrator\AppData\Roaming\com.vercel.cli\Data\auth.json`（token 在 `token` 字段）

```bash
# 登录（一次性，device flow，浏览器确认）
npx vercel@latest login

# 生产部署（走代理）
$env:HTTPS_PROXY="http://127.0.0.1:51081"; $env:HTTP_PROXY="http://127.0.0.1:51081"
npx vercel@latest deploy --prod --yes
```

**关键坑（务必照做）**：
1. **环境变量用 API 写入，不要用 `vercel env add` 的 stdin 管道**——CLI 经 stdin 传值会引入 UTF-8 BOM，pg 解析连接串时 host 会错成 `"base"`。正确做法见 §3 末尾的 API 写法。
2. **DATABASE_URL 用 `Config` 类型（不是 `Secret`）**——`Secret` 在 build 时（SSG 静态生成）不可用，体验页会退化为冻结数据。
3. **Vercel Authentication 已关闭**（`ssoProtection=null`，公开访问）。如需重新开启，见 §5。
4. 提交作者必须是 noreply 邮箱，否则部署 Blocked（`Vercel couldn't find a Git account for the commit author`）。

---

## 3｜Supabase 连接与迁移

- 项目：`mohen-cloud`，ref `fwrhxddcpkibsnmddcfl`，region `ap-southeast-1`，Free 计划。
- **Free 计划 7 天不活动会自动暂停**（域名变 Non-existent）；恢复后直连域名只解析出 IPv6。

**连接串（生产用 transaction pooler）**：
```
postgresql://postgres.<ref>:<密码>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

| 用途 | host:port | 说明 |
|---|---|---|
| 直连 | `db.fwrhxddcpkibsnmddcfl.supabase.co:5432` | **IPv6-only**，IPv4 环境连不上，避免用 |
| transaction pooler | `aws-0-ap-southeast-1.pooler.supabase.com:6543` | serverless / 运行期只读查询用（推荐） |
| session pooler | `aws-0-ap-southeast-1.pooler.supabase.com:5432` | pg_dump / pg_restore / DDL 用 |

- pooler 的 user 必须是 `postgres.<ref>`（带 ref 前缀，这是 Supavisor 的 tenant 标识；不带会报 `no tenant identifier provided`）。
- SSL 必开（`sslmode=require` 或 `ssl: { rejectUnauthorized: false }`）。

**云端 42 表迁移（本地 → 云端）**：本地六 schema `source/evidence/world/meaning/read_model/control`，用 session pooler：
```bash
# 备份云端 public（DROP 前留痕）
pg_dump -h aws-0-ap-southeast-1.pooler.supabase.com -p 5432 -U postgres.<ref> -d postgres \
  --schema=public --no-owner --no-privileges -f cloud_public_pre_mig.sql
# 导本地六 schema（42 表）
pg_dump -h 127.0.0.1 -p 5432 -U postgres -d mohen_dev \
  --schema=source --schema=evidence --schema=world --schema=meaning --schema=read_model --schema=control \
  --no-owner --no-privileges -f local_6schema.sql
# 灌入云端
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 5432 -U postgres.<ref> -d postgres -v ON_ERROR_STOP=1 -f local_6schema.sql
# DROP 云端第一代 public 表（已备份）
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 5432 -U postgres.<ref> -d postgres -f supabase/migrations/202610160400_drop_legacy_v1_public.sql
```

---

## 4｜密钥位置索引（不写明文）

| 密钥/凭据 | 存放位置 | 说明 |
|---|---|---|
| Supabase 数据库密码 | `D:\MoHen\supabase\db_url.txt`（直连串，含密码） | 本地 gitignored，**绝不提交**；pooler 串用它拼 |
| vercel CLI token | `C:\Users\Administrator\AppData\Roaming\com.vercel.cli\Data\auth.json` | `vercel login` 自动生成 |
| vercel 项目 id/org | `mohen-agent-2.0/.vercel/project.json` | 本地 gitignored |
| GitHub 凭据 | git 凭据管理器缓存 | HTTPS + 代理，无单独 token |
| 本地 PG 密码 | `mohen-agent-2.0/.env.local`（DATABASE_URL） | 本地 gitignored |
| DeepSeek / 上海图书馆 / 高德 key | `mohen-agent-2.0/.env.local` | 本地 gitignored |
| 代理（芒果 VPN） | `http://127.0.0.1:51081` | 需 VPN 运行中 |

---

## 5｜附：vercel API 直接写环境变量（避 BOM 坑）

用 `curl` 走 vercel API 写 `DATABASE_URL`，不经 CLI stdin，值保持干净：

```bash
# token 从 auth.json 读，projectId/orgId 从 .vercel/project.json 读
curl -X POST "https://api.vercel.com/v10/projects/<projectId>/env?teamId=<orgId>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  --data-binary '{"key":"DATABASE_URL","value":"<pooler串>","type":"plain","target":["production"]}'
```

关闭/开启 Vercel Authentication（`ssoProtection`）：
```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<projectId>?teamId=<orgId>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  --data-binary '{"ssoProtection":null}'   # null=关闭(公开)；{"deploymentType":"all_except_custom_domains"}=开启
```
