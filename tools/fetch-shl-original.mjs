#!/usr/bin/env node
// CP2-E：从上海图书馆开放数据（官方 2026 改版 API）取真实原件字节。
//
// 依据（非猜测，来自既有实测档案 `hushang-jingwei/docs/01_知识库/上图可下载全文资源普查_20260830.md`）：
//   POST /service_pdf_race/race/pdf/list  {dbname, title, pageNo, pageSize, apiKey}
//   POST /service_pdf_race/race/pdf/info  {dbname, value, apiKey}      value = list 的 data[].value
//   POST /service_pdf_race/race/pdf/stream{dbname, itemId, pageNo, apiKey}  itemId = info 的 data.items[].value
// 事实约束：
//   · dbname: gj=古籍（纯扫描、无文本层，需 OCR）、mgts=民国图书（自带 OCR 文本层）、jp=家谱
//   · isDownload:0 只限制整本打包，逐页可下
//   · 限流不走异常：HTTP 200 + {"state":-1,"msg":"操作频繁"}，或瞬时返回空 data → 必须串行+节流重试
//   · 检索词用区县名/旧称/志书通名，不用现代镇名（镇名在古籍库多为 0 命中）
//
// 本工具只做"取真实字节 + 校验 + 存到暂存区 + 留来源凭据"，不写数据库、不写私有原件库。
// 落库（private_originals / source_version / raw_item）由既有 M3 工具按身份与 RLS 规则执行。

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

const BASE = "https://data1.library.sh.cn";
const STAGING_PREFIXES = ["/service_pdf_race/race/pdf/list", "/service_pdf_race/race/pdf/info", "/service_pdf_race/race/pdf/stream"];
const MIN_INTERVAL_MS = 1200;
const MAX_ATTEMPTS = 4;

function loadKey() {
  if (process.env.SHANGHAI_LIBRARY_KEY) return process.env.SHANGHAI_LIBRARY_KEY.trim();
  const envPath = path.resolve(".env.local");
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8").split(/\r?\n/)
      .find((row) => row.startsWith("SHANGHAI_LIBRARY_KEY="));
    if (line) return line.slice("SHANGHAI_LIBRARY_KEY=".length).trim();
  }
  throw new Error("SHANGHAI_LIBRARY_KEY_MISSING");
}

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

let lastCallAt = 0;
async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCallAt = Date.now();
}

/** 串行 POST；限流（state=-1 / 操作频繁 / 空 data）按退避重试，绝不并发。
 * 二进制响应（`%PDF-`）视为成功，不能被当成"限流/无数据"。 */
async function postJson(apiPath, body) {
  let last = { status: 0, bytes: null, text: "", parsed: null };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await throttle();
    const response = await fetch(BASE + apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json, application/pdf" },
      body: JSON.stringify({ ...body, apiKey: loadKey() }),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const isBinary = bytes.subarray(0, 5).toString("latin1") === "%PDF-";
    const text = isBinary ? "" : bytes.toString("utf8");
    let parsed = null;
    if (!isBinary) {
      try { parsed = JSON.parse(text); } catch { parsed = null; }
    }
    last = { status: response.status, bytes: isBinary ? bytes : null, text, parsed };
    if (response.status !== 200 || isBinary) return last;
    const limited = !parsed || parsed.state === -1
      || (typeof parsed.msg === "string" && parsed.msg.includes("\u64cd\u4f5c\u9891\u7e41"));
    const empty = apiPath.endsWith("/list") && (!parsed?.data || (Array.isArray(parsed.data) && !parsed.data.length));
    if (!limited && !empty) return last;
    await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
  }
  return last;
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function pickItem({ dbname, title, itemId }) {
  if (itemId) return { itemId, book: null };
  const listed = await postJson(STAGING_PREFIXES[0], { dbname, title, pageNo: 1, pageSize: 100 });
  const rows = Array.isArray(listed.parsed?.data) ? listed.parsed.data : [];
  if (!rows.length) throw new Error(`SHL_LIST_EMPTY:${title}`);
  // 2026 版形状：data[] = 书目 {id,title,dbname,items:[{id,value}]}；
  // 传给 pdf/info 的 value 是"书目条目"的 items[0].value（不是整行 value）。
  const exact = rows.find((row) => String(row.title ?? "").trim() === String(title ?? "").trim());
  const book = exact ?? rows[0];
  const bookValue = book?.items?.[0]?.value ?? book?.value;
  if (bookValue == null || String(bookValue) === "") throw new Error(`SHL_BOOK_VALUE_MISSING:${book?.id ?? "?"}`);
  const info = await postJson(STAGING_PREFIXES[1], { dbname, value: String(bookValue) });
  const items = Array.isArray(info.parsed?.data?.items) ? info.parsed.data.items : [];
  if (!items.length) throw new Error(`SHL_ITEM_INFO_EMPTY:${bookValue}`);
  return {
    itemId: String(items[0].value),
    book,
    bookValue: String(bookValue),
    itemName: String(items[0].name ?? ""),
  };
}

async function main() {
  const dbname = arg("dbname", "gj");
  if (!["gj", "mgts", "jp"].includes(dbname)) throw new Error("SHL_DBNAME_INVALID");
  const pageNo = Number(arg("page", "1"));
  if (!Number.isSafeInteger(pageNo) || pageNo < 1) throw new Error("SHL_PAGE_INVALID");
  const outDir = arg("out-dir", "D:/MoHen/data/shl_fetch");
  const title = arg("title");
  const itemIdArg = arg("item-id");
  if (!title && !itemIdArg) throw new Error("SHL_TITLE_OR_ITEM_REQUIRED");

  const { itemId, book, bookValue, itemName } = await pickItem({ dbname, title, itemId: itemIdArg });
  const streamed = await postJson(STAGING_PREFIXES[2], { dbname, itemId, pageNo });
  let bytes = streamed.bytes;
  let note = "";
  if (!bytes) {
    // 兼容"返回 JSON 再给下载地址"的形态；拿不到真字节就失败关闭。
    note = `json_response:${streamed.text.slice(0, 120)}`;
    const maybeUrl = streamed.parsed?.data?.url ?? streamed.parsed?.data?.path ?? null;
    if (typeof maybeUrl === "string" && maybeUrl.startsWith("http")) {
      const binary = await fetch(maybeUrl);
      const candidate = Buffer.from(await binary.arrayBuffer());
      if (candidate.subarray(0, 5).toString("latin1") === "%PDF-") bytes = candidate;
    }
  }
  if (!bytes || !bytes.length) {
    // 实测（2026-11-08）：pdf/stream 返回 HTTP 200 但正文为空时，优先怀疑当日页配额/限流
    // （既有档案记载上限为"24 小时内访问页数"），不是"这本书没有全文"。
    const empty = streamed.text === "" ? "empty_body_suspected_daily_quota" : note;
    throw new Error(`SHL_STREAM_NOT_BINARY:${itemId}:${pageNo}:${empty}`);
  }

  const checksum = sha256(bytes);
  const isPdf = bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  await mkdir(path.join(outDir, dbname), { recursive: true });
  const target = path.join(outDir, dbname, `${itemId}-p${pageNo}${isPdf ? ".pdf" : ".bin"}`);
  await writeFile(target, bytes, { flag: "wx" });
  const back = await readFile(target);
  if (sha256(back) !== checksum || back.length !== bytes.length) throw new Error("SHL_BYTES_MISMATCH");

  const record = {
    schema: "mohen.shl-fetch.v1",
    status: "SHL_ORIGINAL_BYTES_OK",
    dbname,
    requested_title: title ?? null,
    book_value: bookValue ?? null,
    book_title: book?.title ?? book?.dtitle ?? null,
    item_id: itemId,
    item_name: itemName || null,
    page_no: pageNo,
    bytes: bytes.length,
    sha256: checksum,
    pdf_magic: isPdf,
    saved_path: target,
    note,
    endpoints: STAGING_PREFIXES,
    fetched_at: new Date().toISOString(),
    caveats: {
      gj_text_layer: dbname === "gj" ? "none (scan only, OCR required)" : "present (mgts OCR text layer)",
      isDownload_zero_means_whole_book_only: true,
      rate_limit_signal: "HTTP200 state=-1 / empty data (serial + throttle required)",
    },
  };
  await writeFile(target.replace(/\.[a-z]+$/, ".provenance.json"), JSON.stringify(record, null, 2), { flag: "wx" });
  console.log(JSON.stringify(record, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ status: "SHL_FETCH_FAILED", error: String(error?.message ?? error) }));
  process.exitCode = 1;
});
