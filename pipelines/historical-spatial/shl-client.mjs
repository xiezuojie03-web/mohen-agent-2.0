// pipelines/historical-spatial/shl-client.mjs — TASK-0011 上图（Shanghai Library）结构化资源客户端
//
// 安全铁律（沿用 TASK-0005 约定，并叠加 TASK-0011 §12-19）：
//   · SHANGHAI_LIBRARY_API_KEY 只在内存中取用，仅注入请求 query/body；绝不打印、绝不写入
//     文件 / DB / 日志 / 导出 / 报告。
//   · source_uri / 检索日志只记「不含 key 的端点与查询」，绝不记带 key 的 URL。
//   · 响应体本身不含 key，故可安全落盘为 raw（append-only）与打印摘要。
//
// 通道纪律（来自已固化的实测结论，不重复踩坑）：
//   · 必须全串行；并发 > 3 会触发对方限流返回空 data。
//   · HTTP 200 ≠ 成功：`pdf/stream` 限流时返回 200 + {"state":-1,"msg":"操作频繁…"}，
//     只靠 try/catch 会 100% 漏掉 → 必须先读响应体的内容再判 PDF。
//   · 405/404 先怀疑方法与路径，不要怀疑权限；SPARQL 必须 GET（POST 返 406）。
//   · 取标题一律用 dc:title，不要用 rdfs:label（label 常是标识符 → 假阴性）。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";

const PROJECT_ROOT = "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0";
const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
// 2026-11-21 实测：检索端点（gj/*、shnh/dmz/*）在 data1.library.sh.cn 上一律 {"result":"-1"}，
// 换到 data.library.sh.cn 才正常；BASE 改指后者并保留 SHL_BASE 覆盖。
const BASE = process.env.SHL_BASE || "https://data.library.sh.cn";
const USER_AGENT = "MoHenAgent2.0/0.1 (TASK-0011 evidence closure)";
const THROTTLE_MS = 900;
const RATE_MSG = ["操作频繁", "請稍後", "请稍后", "稍后再试", "稍後再試", "频繁"];

let KEY = null;
export function loadKey() {
  if (KEY) return KEY;
  const p = path.join(PROJECT_ROOT, ".env.local");
  if (!fs.existsSync(p)) return null;
  const text = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === "SHANGHAI_LIBRARY_API_KEY") KEY = m[2].replace(/^["']|["']$/g, "");
  }
  return KEY;
}

export const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
export const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 逐次请求的节流（全局串行）
let lastCall = 0;
async function throttle() {
  const wait = THROTTLE_MS - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

function httpRequest(url, { method = "GET", body = null, binary = false, headers = {} } = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: { "User-Agent": USER_AGENT, ...headers },
    };
    if (body !== null) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      opts.headers["Content-Type"] = "application/json";
      opts.headers["Content-Length"] = Buffer.byteLength(payload);
      opts._payload = payload;
    }
    const req = https.request(opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : BASE + res.headers.location;
        res.resume();
        resolve(httpRequest(next, { method: "GET", binary, headers }));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          ctype: res.headers["content-type"] || "",
          buf,
          text: binary ? null : buf.toString("utf8"),
          error: null,
        });
      });
    });
    req.on("error", (e) => resolve({ status: 0, ctype: "", buf: Buffer.alloc(0), text: "", error: e.message }));
    req.setTimeout(60000, () => req.destroy(new Error("timeout")));
    if (opts._payload) req.write(opts._payload);
    req.end();
  });
}

const isRateLimited = (text) => !!text && RATE_MSG.some((m) => text.slice(0, 300).includes(m));

/**
 * 业务级失败判定。🔴 本平台用 **HTTP 200 + {"state":-1,"msg":"操作频繁…"}** 表示限流，
 * 与「真的没有数据」（state:0, data:[], total:0）**必须分开**：
 * 前者要退避重试，后者才能记 0 命中。混为一谈会得出「某书不存在」的假结论。
 */
const businessFail = (parsed) =>
  !!parsed && typeof parsed === "object" && (parsed.state === -1 || parsed.success === false);

/**
 * 带重试与限流识别的调用。
 * 返回 { status, text, parsed, attempts, rate_limited, ok }
 * ok=false 表示「重试后仍未拿到可信结果」——调用方**不得**把这种情况当成 0 命中。
 */
export async function call(urlPath, { method = "GET", body = null, retries = 3, headers = {}, isPdfEndpoint = false } = {}) {
  const key = loadKey();
  if (!key) throw new Error("SHANGHAI_LIBRARY_API_KEY 未配置");
  const waitBase = isPdfEndpoint ? 20000 : 1500;
  let last = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    await throttle();
    let res;
    if (method === "POST") {
      res = await httpRequest(BASE + urlPath, { method: "POST", body: { ...body, apiKey: key }, headers });
    } else {
      const sep = urlPath.includes("?") ? "&" : "?";
      res = await httpRequest(`${BASE}${urlPath}${sep}key=${encodeURIComponent(key)}`, { method: "GET", headers });
    }
    const rateLimited = isRateLimited(res.text);
    let parsed = null;
    try { parsed = res.text ? JSON.parse(res.text) : null; } catch {}
    const failed = rateLimited || businessFail(parsed) || res.status === 0 || res.status >= 500;
    last = { status: res.status, text: res.text, parsed, attempts: attempt + 1, rate_limited: rateLimited, ok: !failed };
    if (!failed) return last;
    if (attempt < retries - 1) await sleep(waitBase * (attempt + 1));
  }
  return { ...last, ok: false, failed_reason: last.rate_limited ? "rate_limited" : "business_or_http_fail" };
}

// ---- 高层封装 ----

/** webapi GET，qs 为查询参数对象（不含 key） */
export const getJson = (pathname, qs = {}) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  const q = usp.toString();
  return call(q ? `${pathname}?${q}` : pathname, { method: "GET" });
};

/**
 * 解析 SPARQL XML 结果（Virtuoso 默认返回 XML；实测 `format=` 参数被忽略，
 * 故不能只依赖 JSON —— 这一条曾导致「图枚举恒 0 条」的假阴性）。
 */
export function parseSparqlXml(xml) {
  if (typeof xml !== "string" || !xml.includes("<sparql")) return null;
  const rows = [];
  const blocks = xml.split(/<result[\s>]/).slice(1);
  for (const blk of blocks) {
    const body = blk.split("</result>")[0];
    const row = {};
    const re = /<binding\s+name="([^"]+)"\s*>\s*<(\w+)>([\s\S]*?)<\/\2>/g;
    let m;
    while ((m = re.exec(body))) {
      row[m[1]] = m[3]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
    }
    if (Object.keys(row).length) rows.push(row);
  }
  return rows;
}

/** SPARQL GET（POST 会 406）；优先请求 JSON，失败则解析 XML。返回 {status, text, parsed, rows, format} */
export async function sparql(query) {
  const res = await call(`/sparql?query=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: { Accept: "application/sparql-results+json" },
  });
  let rows = null;
  let format = "none";
  if (res.parsed?.results?.bindings) {
    rows = res.parsed.results.bindings.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.value]))
    );
    format = "json";
  } else {
    const xml = parseSparqlXml(res.text);
    if (xml) {
      rows = xml;
      format = "xml";
    }
  }
  return { ...res, rows: rows ?? [], format };
}

/** @deprecated 直接用 sparql() 返回的 .rows；保留以兼容旧调用 */
export function sparqlRows(res) {
  if (Array.isArray(res?.rows)) return res.rows;
  const b = res?.parsed?.results?.bindings;
  if (!Array.isArray(b)) return [];
  return b.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v.value])));
}

// ---- PDF 三步链（全部 POST，apiKey 在 body） ----
// 🔴 响应形状（实测，别再解析错）：`pdf/list` 的 data 是【书目数组】，
//    每本 = {id, title, dbname, items:[{id, value(=索书号)}]}；
//    `pdf/info` 的 data.items[] = {value(=内部册 ID), name, pageCount}。
//    早前按 `data.items` 读会恒得 0 条 —— 那是解析错，不是「没有资料」。
export function normalizePdfList(parsed) {
  const books = Array.isArray(parsed?.data) ? parsed.data : [];
  return books.map((b) => ({
    book_id: b.id,
    title: b.title ?? "",
    dbname: b.dbname ?? "",
    callnos: (b.items || []).map((i) => i.value),
  }));
}
export const pdfList = (dbname, by) =>
  call("/service_pdf_race/race/pdf/list", { method: "POST", body: { dbname, pageNo: 1, pageSize: 50, ...by }, retries: 4, isPdfEndpoint: true });
export const pdfInfo = (dbname, value) =>
  call("/service_pdf_race/race/pdf/info", { method: "POST", body: { dbname, value }, retries: 4, isPdfEndpoint: true });
export const pdfStreamRaw = (dbname, itemId, pageNo) =>
  call("/service_pdf_race/race/pdf/stream", { method: "POST", body: { dbname, itemId, pageNo }, retries: 4, isPdfEndpoint: true });

/** 取单页 PDF 二进制；限流时返回 {ok:false, rate_limited:true}，不判成「没有全文」 */
export async function pdfPage(dbname, itemId, pageNo, { retries = 4 } = {}) {
  const key = loadKey();
  for (let attempt = 0; attempt < retries; attempt++) {
    await throttle();
    const res = await httpRequest(BASE + "/service_pdf_race/race/pdf/stream", {
      method: "POST",
      body: { dbname, itemId, pageNo, apiKey: key },
      binary: true,
    });
    const isPdf = res.buf.slice(0, 5).toString("latin1") === "%PDF-";
    if (isPdf) return { ok: true, buf: res.buf, attempts: attempt + 1 };
    const head = res.buf.toString("utf8", 0, 300);
    if (RATE_MSG.some((m) => head.includes(m))) {
      await sleep(20000 * (attempt + 1));
      continue;
    }
    return { ok: false, rate_limited: false, status: res.status, head: head.slice(0, 200), attempts: attempt + 1 };
  }
  return { ok: false, rate_limited: true, status: 200, head: "rate limited", attempts: retries };
}

// ---- Raw Store 落盘（append-only：文件已存在则跳过，不改写） ----
export function makeRunDir(prefix) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const runId = `${prefix}-${ymd}-${crypto.randomBytes(4).toString("hex")}`;
  const dir = path.join(RAW_STORE, "historical-spatial", "jinze", "t11-closure", runId);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, runId };
}

export function saveRaw(dir, name, text) {
  const p = path.join(dir, name);
  if (fs.existsSync(p)) return { path: p, existed: true, checksum: null };
  fs.writeFileSync(p, text, "utf8");
  return { path: p, existed: false, checksum: sha256(text) };
}

export function saveBinary(dir, name, buf) {
  const p = path.join(dir, name);
  if (fs.existsSync(p)) return { path: p, existed: true, checksum: null };
  fs.writeFileSync(p, buf);
  return { path: p, existed: false, checksum: sha256(buf) };
}
