#!/usr/bin/env node
// CP2-E（Owner 2026-11-08 选定路线）：从上海图书馆开放数据平台取"自带正文"的数据
// （`shnh/dmz` 上海地名志，同平台合作单位），把**接口原始响应字节**原样留存为
// text/plain 私有原件，供 D02 做 utf8 字节区间转写。零外发、零模型、零 OCR。
//
// 只做下载与落盘，不写数据库；落库由 tools/land-shl-original.mjs --mode text 完成。
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// 2026-11-21 实测：dmz 地名志检索在 data1.library.sh.cn 上返回 {"result":"-1"}，
// 换到 data.library.sh.cn 才返回正文（type=3&freetext=朱家角 有 description 全文）。
const BASE = process.env.SHL_BASE ?? "https://data.library.sh.cn";
const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

function apiKey() {
  const raw = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = raw.split(/\r?\n/).find((l) => /^SHANGHAI_LIBRARY_KEY\s*=/.test(l));
  if (!line) throw new Error("SHL_KEY_MISSING");
  return line.replace(/^[^=]*=/, "").trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const type = arg("type", "3");
  const freetext = arg("freetext");
  const outDir = arg("out-dir", "D:/MoHen/data/shl-dmz");
  if (!freetext) throw new Error("DMZ_FREETEXT_REQUIRED");
  const url = `${BASE}/shnh/dmz/webapi/geonames/list?type=${encodeURIComponent(type)}&freetext=${encodeURIComponent(freetext)}`;
  const key = apiKey();
  // 实测（2026-11-08）：`shnh/dmz` 只认查询参数 `key`；放请求头会回
  // `{"result":"2","data":"缺少参数Key"}`（HTTP 仍是 200，容易误判为"无数据"）。
  const res = await fetch(`${url}&key=${encodeURIComponent(key)}`, {
    // 实测（2026-11-08）：不声明 identity 时取到的正文尾部会混入压缩残片
    // （U+FFFD/U+0000），JSON 仍能 parse 但正文已损坏 —— 必须按原文拿未压缩字节。
    headers: { Accept: "application/json", "Accept-Encoding": "identity" },
    signal: AbortSignal.timeout(30000),
  });
  const body = Buffer.from(await res.arrayBuffer());
  if (!res.ok || body.length === 0) throw new Error(`DMZ_HTTP_${res.status}_${body.length}`);
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 0 && declared !== body.length) {
    throw new Error(`DMZ_BODY_TRUNCATED:${body.length}/${declared}`);
  }
  const asText = body.toString("utf8");
  // 该平台的正文偶有自身损坏（U+FFFD/U+0000 混入）。不作全局硬失败，但要如实
  // 报告，并由落库工具的 locateFieldExtent 只许接受**完全干净**的字段。
  const corrupted = /\uFFFD|\u0000/.test(asText);
  const sha256 = createHash("sha256").update(body).digest("hex");
  const json = JSON.parse(asText);
  if (String(json?.result) !== "0") throw new Error(`DMZ_RESULT_${json?.result}:${String(json?.data).slice(0, 80)}`);
  const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : null;
  const entries = (data ?? []).map((row, index) => ({
    index,
    name: row?.name ?? row?.title ?? row?.value ?? null,
    field_keys: Object.keys(row ?? {}),
    descriptions: Object.entries(row ?? {})
      .filter(([, v]) => typeof v === "string" && v.length > 20)
      .map(([k, v]) => ({ field: k, chars: v.length, clean_bytes: !/[\\"`]/.test(v), sample: v.slice(0, 60) })),
  }));
  const dir = path.resolve(outDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `dmz-type${type}-${encodeURIComponent(freetext)}.json`);
  fs.writeFileSync(file, body, { flag: "w" });
  console.log(JSON.stringify({
    status: "DMZ_FETCHED",
    url, http_status: res.status, raw_bytes: body.length, sha256, body_has_corrupted_chars: corrupted,
    saved: file, top_level_keys: Array.isArray(json) ? "array" : Object.keys(json ?? {}),
    entries: entries.slice(0, 8), entry_count: entries.length,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ status: "DMZ_FETCH_FAILED", error: String(error?.message ?? error) }));
  process.exitCode = 1;
});
