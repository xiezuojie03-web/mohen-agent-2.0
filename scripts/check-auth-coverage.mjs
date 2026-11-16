// scripts/check-auth-coverage.mjs — P0-1 鉴权矩阵与回归门（2026-10-29）
//
// 背景：修复前 99 条 API 里 70 条完全不引用鉴权。middleware 已做统一登录门，
// 但"登录 ≠ 有权限"：内容类接口还必须做归属/角色校验。本脚本：
//   1) 列出每条 route 的公开/受保护分类；
//   2) 检查受保护 route 是否引用会话/角色/归属 helper；
//   3) 内容类（studio/works/explore）额外检查是否做 owner 校验；
//   4) 输出 CSV 供人工核对；--strict 时有缺口即退出 1（CI 用）。
//
// 用法：node scripts/check-auth-coverage.mjs [--strict] [--out <csv>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_ROOT = path.join(ROOT, "apps", "web", "app", "api");
const STRICT = process.argv.includes("--strict");
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx >= 0 ? process.argv[outIdx + 1] : path.join(ROOT, "tasks", "results", "P0_鉴权矩阵_20261029.csv");

const PUBLIC_EXACT = new Set([
  "auth/login",
  "auth/register",
  // One-time capability, Preview-only; no unauthenticated issuance endpoint.
  "auth/password-setup",
  "auth/logout",
  "auth/me",
  "session/me",
  "search",
  "works/published",
  "mohen/ask",
  "mohen/materials",
]);
// works/media/ 是观看侧只读取图：与 /api/works/published 同属公开消费面，
// 每次请求在 route 内重跑 WATCH 资格校验（未发布/撤权即 404），不依赖登录态。
const PUBLIC_PREFIX = ["public/", "help/", "works/media/"];

const AUTH_TOKENS = /getSession|isOperator|getSessionUser|hasRole|parseSessionToken|canAccess|isOwnedBy|guardRoute|verifyReviewer/;
const OWNER_TOKENS = /canAccess|isOwnedBy|owner_user_id|guardRoute\(params,\s*"|listWorks\(\s*session\.uid/;
const ROLE_TOKENS = /isOperator|hasRole\s*\(\s*session|session\.r\.includes\("operator"\)|verifyReviewer/;
// 需要逐资源归属校验的私有内容（知识对象/工具结果/会话默认登录即可，见 LOGIN_ONLY）。
const CONTENT_PREFIX = /^(studio\/works|studio\/research-tasks|studio\/director-plans|explore\/sessions)\//;
const LOGIN_ONLY = new Set([
  "studio/conversations",
  "studio/create",
  "studio/direct",
  "studio/tasks",
  "studio/materials",
  "studio/attachments",
  "watch/sessions",
  "notifications",
  "explore/search",
  "explore/spatial",
  "explore/entities",
  "explore/events",
  "explore/relations",
]);

function walk(dir, rel = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(p, r));
    else if (e.name === "route.ts") out.push({ rel: r.replace(/\/route\.ts$/, ""), file: p });
  }
  return out;
}

const rows = [];
for (const r of walk(API_ROOT)) {
  const src = fs.readFileSync(r.file, "utf8");
  const isPublic = PUBLIC_EXACT.has(r.rel) || PUBLIC_PREFIX.some((p) => r.rel.startsWith(p));
  // This internal receiver authenticates HMAC before any durable claim and
  // rechecks Owner/original scope in the reviewed server adapter. Never public.
  const cloudReceiver = r.rel === "internal/production-execute"
    && /import\s*\{createCloudProductionServer\}\s*from/.test(src)
    && /await createCloudProductionServer\([\s\S]*\)\(request\)/.test(src);
  const hasAuth = AUTH_TOKENS.test(src) || cloudReceiver;
  const hasOwner = OWNER_TOKENS.test(src);
  const hasRole = ROLE_TOKENS.test(src);
  const isContent = CONTENT_PREFIX.test(r.rel);
  const ownerCheck = !isContent ? "n/a" : hasOwner ? "yes" : hasRole ? "role" : "no";
  rows.push({
    route: "/api/" + r.rel,
    kind: isPublic ? "public" : "protected",
    route_auth: hasAuth ? "yes" : "no",
    owner_check: ownerCheck,
    verdict: isPublic
      ? "OK_PUBLIC"
      : !hasAuth
        ? "MISSING_AUTH"
        : isContent && ownerCheck === "no"
          ? "AUTH_ONLY"
          : "OK",
  });
}
rows.sort((a, b) => a.route.localeCompare(b.route));

const summary = {
  total: rows.length,
  public: rows.filter((r) => r.kind === "public").length,
  protected: rows.filter((r) => r.kind === "protected").length,
  missing_auth: rows.filter((r) => r.verdict === "MISSING_AUTH").length,
  auth_only: rows.filter((r) => r.verdict === "AUTH_ONLY").length,
};

const csv = [
  "route,kind,route_auth,owner_check,verdict",
  ...rows.map((r) => [r.route, r.kind, r.route_auth, r.owner_check, r.verdict].join(",")),
].join("\n");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, "\uFEFF" + csv, "utf8");

console.log("=== P0 鉴权矩阵 ===");
console.log(`routes=${summary.total} public=${summary.public} protected=${summary.protected}`);
console.log(`missing_route_auth=${summary.missing_auth} auth_only_no_owner=${summary.auth_only}`);
console.log(`matrix=${path.relative(ROOT, OUT)}`);
if (summary.missing_auth) {
  console.log("\n-- 受保护但无 route 级鉴权（middleware 已兜底，仍需补角色/归属）--");
  for (const r of rows.filter((x) => x.verdict === "MISSING_AUTH")) console.log("  " + r.route);
}
if (summary.auth_only) {
  console.log("\n-- 内容类仅登录、无归属校验 --");
  for (const r of rows.filter((x) => x.verdict === "AUTH_ONLY")) console.log("  " + r.route);
}

if (STRICT && (summary.missing_auth > 0 || summary.auth_only > 0)) process.exit(1);
