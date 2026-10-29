// P1 浏览器截图证据（本地）：以 operator 测试账号登录，按 1672×941 截五页 + 资料台 + 来源健康。
// 用法：node scripts/p1-screens.mjs [baseUrl] [email] [password]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:3100";
const EMAIL = process.argv[3] || "p1_1793287703359@test.local";
const PASSWORD = process.argv[4] || "test123456";
const OUT = "tasks/results/P1_screens";

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!login.ok) { console.error("login failed", login.status); process.exit(1); }
const raw = login.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("mohen_role="));
const value = raw.slice("mohen_role=".length);

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
await context.addCookies([{ name: "mohen_role", value, domain: "127.0.0.1", path: "/" }]);
const page = await context.newPage();

const pages = [
  ["home", "/"],
  ["studio", "/studio"],
  ["desk", "/studio/desk"],
  ["watch", "/watch"],
  ["explore", "/explore"],
  ["admin", "/admin"],
  ["admin-sources", "/admin/sources"],
];
const results = [];
for (const [name, url] of pages) {
  const res = await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(700);
  const file = path.join(OUT, `${name}_1672x941.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push({ name, url, status: res?.status() ?? 0, file, bytes: fs.statSync(file).size });
}
await browser.close();
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
