// 钥匙体检：一条命令核查所有外部凭据是否有效，失效项给出精确换新路径。
// 安全：只输出状态与错误码，绝不打印密钥明文。
// 位置索引唯一权威：specs/OPERATIONS_DEPLOYMENT.md §4。
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const dataAccessRequire = createRequire(path.join(REPO, "packages/data-access/package.json"));
const PROXY = process.env.MOHEN_CHECK_PROXY || "http://127.0.0.1:51081";
const SECRETS_DIR = path.join(REPO, ".secrets");
const CA_FILE = path.join(SECRETS_DIR, "supabase-ca", "prod-ca-2021.crt");
const SUPABASE_DB_URL_FILE = path.join(SECRETS_DIR, "supabase-db-url.txt");
const SUPABASE_DB_URL_LEGACY = "D:\\MoHen\\supabase\\db_url.txt";
const SUPABASE_REF = "fwrhxddcpkibsnmddcfl";
const POOLER_HOST = `aws-0-ap-southeast-1.pooler.supabase.com`;
const VERCEL_AUTH_JSON = path.join(os.homedir(), "AppData", "Roaming", "com.vercel.cli", "Data", "auth.json");

function readDbUrl() {
  // 唯一存放处为仓库 .secrets/（gitignored）；旧位置仅作只读兼容回退。
  const f = fs.existsSync(SUPABASE_DB_URL_FILE) ? SUPABASE_DB_URL_FILE : SUPABASE_DB_URL_LEGACY;
  if (!fs.existsSync(f)) return null;
  const raw = fs.readFileSync(f, "utf8").trim();
  const m = raw.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/(.+)$/);
  if (!m) return null;
  return { raw, user: m[1], password: m[2], host: m[3], port: Number(m[4]), db: m[5], file: f };
}

function readVercelToken() {
  if (!fs.existsSync(VERCEL_AUTH_JSON)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(VERCEL_AUTH_JSON, "utf8"));
    return j.token ?? null;
  } catch {
    return null;
  }
}

function readLocalDbUrl() {
  const envFile = path.join(REPO, ".env.local");
  if (!fs.existsSync(envFile)) return null;
  const line = fs.readFileSync(envFile, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  if (!line) return null;
  return line.slice("DATABASE_URL=".length).trim();
}

async function tryPg(connectionString, label, sslOptions) {
  const { Client } = dataAccessRequire("pg");
  const client = new Client({
    connectionString,
    ...(sslOptions ? { ssl: sslOptions } : {}),
    connectionTimeoutMillis: 12000,
  });
  try {
    await client.connect();
    const r = await client.query("select 1 as ok");
    await client.end();
    return r.rows[0]?.ok === 1 ? { ok: true } : { ok: false, code: "UNEXPECTED_EMPTY" };
  } catch (e) {
    try { await client.end(); } catch {}
    return { ok: false, code: e.code || e.message?.slice(0, 60) || "UNKNOWN" };
  }
}

async function checkSupabase() {
  const u = readDbUrl();
  if (!u) {
    return { name: "Supabase 生产库口令", ok: false, code: "FILE_MISSING",
      renew: `钥匙册缺 Supabase 连接串。换新：浏览器 supabase.com/dashboard → mohen-cloud 项目 → Settings → Database → 复制 Connection string（URI）→ 整行存入 .secrets/supabase-db-url.txt（仓库根，已 gitignore）→ 重跑体检。` };
  }
  // pooler 会话串：密码取自直连串，user 必须带 ref 前缀（Supavisor tenant 标识）。
  const poolerUrl = `postgresql://postgres.${SUPABASE_REF}:${encodeURIComponent(u.password)}@${POOLER_HOST}:5432/postgres`;
  if (!fs.existsSync(CA_FILE)) {
    return { name: "Supabase 生产库口令", ok: false, code: "CA_MISSING",
      renew: `缺少 Supabase 官方 CA 副本（.secrets/supabase-ca/prod-ca-2021.crt）。先执行 CA 下载（见运维手册 §4.5），再重跑体检；不降级跳过证书校验。` };
  }
  const r = await tryPg(poolerUrl, "supabase-pooler", { rejectUnauthorized: true, ca: fs.readFileSync(CA_FILE, "utf8") });
  if (r.ok) return { name: "Supabase 生产库口令", ok: true, detail: "pooler 会话连接 SELECT 1 通过" };
  const paused = r.code === "ENOTFOUND" || r.code === "ECONNREFUSED" || /Non-existent|paused/i.test(r.code || "");
  return { name: "Supabase 生产库口令", ok: false, code: r.code,
    renew: paused
      ? `疑似 Free 计划 7 天不活跃被暂停：supabase.com/dashboard → mohen-cloud 项目页点 Restore 恢复，再重跑体检。`
      : `口令失效（${r.code}）：浏览器 supabase.com/dashboard → mohen-cloud 项目 → Settings → Database → Reset database password → 复制新 Connection string（URI）→ 覆盖存入 .secrets/supabase-db-url.txt（旧位置 D:\\MoHen\\supabase\\db_url.txt 已停止维护）→ 重跑体检。` };
}

async function checkVercel() {
  const token = readVercelToken();
  if (!token) {
    return { name: "Vercel 部署令牌", ok: false, code: "NO_LOGIN",
      renew: `未找到 vercel 登录文件。换新：命令行运行 npx vercel@latest login（浏览器点确认），完成后重跑体检。` };
  }
  try {
    const res = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) return { name: "Vercel 部署令牌", ok: true, detail: "GET /v2/user 200" };
    return { name: "Vercel 部署令牌", ok: false, code: `HTTP_${res.status}`,
      renew: `令牌失效（HTTP ${res.status}）：npx vercel@latest login 重新登录，或浏览器 vercel.com/account/tokens 新建 token 后由工程方写入 auth.json；然后重跑体检。` };
  } catch (e) {
    return { name: "Vercel 部署令牌", ok: false, code: e?.cause?.code || e.code || "NETWORK",
      renew: `网络不可达（${e?.cause?.code || e.code || "NETWORK"}）：如本机 DNS 污染 vercel 域名，开启芒果 VPN 或经代理后重跑。` };
  }
}

function checkGithub() {
  try {
    const out = execFileSync("git", ["ls-remote", "origin", "-h", "refs/heads/main"], {
      cwd: REPO, timeout: 15000, env: { ...process.env, HTTPS_PROXY: PROXY, HTTP_PROXY: PROXY },
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { name: "GitHub 仓库连通", ok: true, detail: `ls-remote 返回 ${out.split("\n").filter(Boolean).length} 条` };
  } catch (e) {
    return { name: "GitHub 仓库连通", ok: false, code: (e.status ?? "") + (e.stderr?.slice(0, 40) || ""),
      renew: `推送/取回失败：先确认芒果 VPN（127.0.0.1:51081）运行中，再重跑体检；凭据由 git 凭据管理器缓存，一般无需换新。` };
  }
}

async function checkLocalPg() {
  const url = readLocalDbUrl();
  if (!url) return { name: "本地开发库", ok: false, code: "ENV_MISSING", renew: `.env.local 缺 DATABASE_URL，属异常，联系工程方。` };
  const r = await tryPg(url, "local-pg"); // 本地库：不覆盖 SSL 配置，遵循连接串自身语义
  return r.ok
    ? { name: "本地开发库", ok: true, detail: "SELECT 1 通过" }
    : { name: "本地开发库", ok: false, code: r.code, renew: `本地 PostgreSQL 未启动或配置漂移（${r.code}）：启动本地 PG 服务后重跑。` };
}

const results = [];
results.push(await checkSupabase());
results.push(await checkVercel());
results.push(checkGithub());
results.push(await checkLocalPg());

console.log("== 墨痕钥匙体检 ==");
let fail = 0;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) fail++;
  console.log(`\n[${mark}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}${r.code && !r.ok ? `（错误码: ${r.code}）` : ""}`);
  if (!r.ok && r.renew) console.log(`  换新: ${r.renew}`);
}
console.log(`\n合计 ${results.length} 项，通过 ${results.length - fail}，失效 ${fail}。`);
console.log("位置索引与换新 SOP 唯一权威：specs/OPERATIONS_DEPLOYMENT.md §4/§4.5。");
process.exit(fail === 0 ? 0 : 1);
