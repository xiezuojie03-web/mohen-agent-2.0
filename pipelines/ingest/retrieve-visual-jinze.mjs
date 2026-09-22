// pipelines/ingest/retrieve-visual-jinze.mjs — TASK-0008 WP-C（定向视觉检索，仅金泽）
//
// 主链：Source → Raw Asset/Metadata → Source Record → Visual Asset
//
// ★ 本脚本最重要的一条纪律（血的教训，第一次运行时踩到）★
//   Wikimedia 限流时返回 **HTTP 200 + 纯文本**「You are making too many requests to the API.」，
//   不是 JSON。若把「解析失败」当成「搜索 0 结果」，就会把【限流】静默转写为
//   【该对象不存在图像】—— 即把「没查到」伪造成「没有」。这正是本项目
//   「HTTP 200 ≠ 成功」铁律所指的陷阱，且会直接造成假阴性。
//   因此本脚本：
//     - 任何响应必须先验证「是 JSON」，否则判为查询失败 → 指数退避重试；
//     - 重试耗尽后，该目标的结果状态显式记为 `source_unavailable`，
//       **绝不**记作 `no_acceptable_asset`（两者语义完全不同）；
//     - 失败的原始响应仍 append-only 落盘并登记 Source Record（带 fetch_failed 标记）。
//
// 来源通道（§4）：
//   S2-a Wikimedia Commons（generator=search 一体化发现 + 逐文件 imageinfo 精确元数据）
//   S2-b Wikidata（**仅**身份与 P18 图版指认；TASK-0007 已定 Wikidata 坐标不得替代对象坐标
//        —— 本脚本因而不读取 P625）
//   S1   上海图书馆 img.library.sh.cn（资产本身；其元数据无标题/无年代/无作者）
//
// 其它纪律：不使用视觉相似度做身份判定；不猜端点；请求数上限 MAX_REQUESTS 防广泛爬取。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { run, queryRows } from "../../packages/data-access/src/index.mjs";

const RAW_ROOT = "D:/MoHen/data/raw/external/jinze-visual";
const PROVIDER = "Wikimedia Commons";
const PROVIDER_WD = "wikidata";
const PROVIDER_SHL = "上海图书馆开放数据";
// Wikimedia 要求可识别的 User-Agent（含用途说明），否则会被更激进地限流。
const UA = { "User-Agent": "mohen-agent-2.0/0.1 (jinze heritage visual evidence research; node-fetch)" };
const SPACING_MS = 5200;      // 基础节流（实测 1.2s 会被限流）
const MAX_RETRY = 4;
// 上限是「防广泛爬取」的自律闸：目标清单是**枚举**的（P0×5 + P1×4 + 场景类×2 通道），
// 不是搜索式扩散。P0 实测 24 次；P0+P1 实测约 55 次 → 110 仍属窄检索。
const MAX_REQUESTS = 110;

// ── 目标清单（§2 严格限定，不扩张）────────────────────────────────────────
const TARGETS = [
  { tier: "P0", object: "万安桥", entity: "JZ-BLD-002",
    names: ["万安桥"], searchTerms: ["万安桥", "Wananqiao", "Wan'anqiao"],
    wdSearch: "万安桥", excludeMarkers: [] },
  { tier: "P0", object: "普济桥", entity: "JZ-BLD-001",
    names: ["普济桥"], searchTerms: ["普济桥", "Pujiqiao"],
    wdSearch: "普济桥",
    // 跨镇同名硬闸：嘉定亦有「普济桥」(File:Pujiqiao.jpg, desc「普济桥 嘉定东大街博乐路东侧」)
    excludeMarkers: ["嘉定", "Jiading"] },
  { tier: "P0", object: "迎祥桥", entity: "JZ-BLD-003",
    names: ["迎祥桥"], searchTerms: ["迎祥桥", "Yingxiangqiao"],
    wdSearch: "迎祥桥", excludeMarkers: [] },
  { tier: "P0", object: "林老桥", entity: "JZ-BLD-006",
    names: ["林老桥"], searchTerms: ["林老桥", "Linlaoqiao"],
    wdSearch: "林老桥", excludeMarkers: [] },
  { tier: "P0", object: "颐浩寺遗址", entity: "JZ-BLD-008",
    names: ["颐浩寺遗址", "颐浩寺", "颐浩禅寺"], searchTerms: ["颐浩寺", "Yihaosi"],
    wdSearch: "颐浩寺", excludeMarkers: [] },
  // ── P1：仅当 P0 全部获得结果状态后才执行 ──
  { tier: "P1", object: "如意桥", entity: "JZ-BLD-004",
    names: ["如意桥"], searchTerms: ["如意桥", "Ruyiqiao"],
    wdSearch: "如意桥", excludeMarkers: [] },
  { tier: "P1", object: "天皇阁桥", entity: "JZ-BLD-007",
    // 不变量 11：Commons 上传者用「天皇阁桥」；S1 地名志规范名「天王阁桥」。两形式皆纳入匹配。
    names: ["天皇阁桥", "天王阁桥"], searchTerms: ["天皇阁桥", "天王阁桥", "Tianhuanggeqiao"],
    wdSearch: "天皇阁桥", excludeMarkers: [],
    nameVariants: { providerForm: "天皇阁桥", sourceCanonicalForm: "天王阁桥" } },
  { tier: "P1", object: "金泽放生桥", entity: "JZ-BLD-005",
    names: ["金泽放生桥", "放生桥"], searchTerms: ["金泽放生桥", "放生桥", "Fangshengqiao"],
    wdSearch: "金泽放生桥",
    // 跨镇同名硬闸：朱家角亦有「放生桥」，约 11km 外，属另一古镇 → 必须排除并留证
    excludeMarkers: ["朱家角", "Zhujiajiao"] },
];

const SCENE_TARGET = {
  tier: "P1",
  object: "金泽镇历史镇景与水系",
  entity: null, // entities 中无「金泽镇」行，故显式允许 entity_id 为空
  category: "Category:Jinze, Shanghai",
};

const RULE = {
  R1: "R1_caption_or_title_explicitly_names_object_within_jinze",
  R3: "R3_caption_names_object_via_frozen_source_name_variant",
  R4: "R4_cross_town_homonym_excluded",
  R5: "R5_source_metadata_insufficient_for_object_identity",
  // §3 明文要求排除：「not a train/general-town image falsely presented as a heritage object」。
  // 实测 Category:Jinze, Shanghai 的 49 个成员里绝大多数是 CRH/CR400 动车组照片 + 公交线路照，
  // 即「车在金泽拍的」，不是「金泽的遗产物」。必须作为一类显式规则拦下，否则会被当成镇景资产。
  R6: "R6_rolling_stock_or_transport_subject_excluded",
};

// P1-9 目标名为「金泽**历史**镇景与水系」——「历史」是目标的一部分，不是可选修饰。
// 因此对历史影像做一次**枚举式**定向检索（§4「narrowly」，非广泛爬取），
// 以便对 WP-E「如确可获得则至少 2 件历史/档案资产」给出有据可查的结论。
//
// ★ 检索词形态的教训（实测，第一版踩到）★
//   Commons CirrusSearch 对中文的行为很容易让人得出**假阴性**：
//     · `"金泽 历史"`（整串加引号）= 短语检索，要求两词**相邻同序** → 恒 0 结果；
//     · `金泽 历史`（不加引号）= AND，但会召回大量无关噪声
//       （实测 20 条全是拜占庭抄本细密画，因 "history"/"金泽" 被松散匹配）；
//     · `金泽镇`（单一词条）= 命中 50 条**高度相关**结果（含 11 张遗产照片）。
//   故历史探针一律采用**单一词条**或**不经引号包整串**的形态，并对结果逐条做
//   「交通排除 + 金泽范围 + 是否有早于 1990 的年代证据」三重判定。
const HISTORY_QUERIES = [
  { q: "金泽镇", label: "金泽镇", limit: "50" },
  { q: "金泽 古桥", label: "金泽 古桥", limit: "20" },
  { q: "金泽 水乡", label: "金泽 水乡", limit: "20" },
  { q: "Jinze Shanghai", label: "Jinze Shanghai", limit: "20" },
];
// 历史性判据：必须有可判读的年代证据，且早于 1990（城镇影像在此之前已具「历史」意义）。
// 仅凭「上传时间早」不算（§5：不得由上传日期推断 depicted_period）。
const HISTORICAL_CUTOFF_YEAR = 1990;
const TRANSPORT_MARKERS = [
  "CRH", "CR400", "CR300", "Bus Route", "Bus Line", "公交", "动车", "高铁",
  "站台", "车站", "Station", "metro", "Metro", "机车", "车辆段",
];

// ── 工具 ───────────────────────────────────────────────────────────────────
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
function detUuid(code) {
  const h = crypto.createHash("sha256").update("mohen-visual/v1/" + code).digest("hex");
  return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20, 32);
}
const norm = (s) => String(s || "").replace(/[\s_\-·・、,，.。()（）[\]【】'"'"]/g, "").toLowerCase();
const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const slug = (s) => String(s || "").replace(/[^\u4e00-\u9fa5A-Za-z0-9._-]/g, "_").slice(0, 80);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { fromRaw: null, p0Only: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--from-raw") o.fromRaw = a[++i];
    if (a[i] === "--p0-only") o.p0Only = true;
  }
  return o;
}

let requestCount = 0;
let lastRequestAt = 0;

// 关键函数：区分「查询失败」与「0 结果」
async function httpGetJson(url, { replayDir, rawName } = {}) {
  if (replayDir) {
    const p = path.join(replayDir, rawName);
    if (!fs.existsSync(p)) return { ok: false, status: "replay_missing_raw", text: "", json: null, rawPath: p };
    const text = fs.readFileSync(p, "utf8");
    let json = null;
    try { json = JSON.parse(text); } catch { /* 历史上就是失败响应 */ }
    return { ok: !!json, status: json ? "ok" : "replay_non_json", text, json, rawPath: p, replay: true };
  }
  let lastText = "";
  let lastStatus = "unknown";
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    if (requestCount >= MAX_REQUESTS) {
      return { ok: false, status: "request_budget_exhausted", text: lastText, json: null, rawPath: null };
    }
    // 节流：与上一次请求至少间隔 SPACING_MS
    const wait = SPACING_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    requestCount++;
    lastRequestAt = Date.now();
    try {
      const res = await fetch(url, { headers: UA });
      const text = await res.text();
      lastText = text;
      let json = null;
      try { json = JSON.parse(text); } catch { /* 非 JSON：极可能是限流纯文本 */ }
      if (json) return { ok: true, status: "ok", text, json, rawPath: null, httpStatus: res.status };
      lastStatus = /too many requests/i.test(text) ? "rate_limited" : "non_json_response";
      await sleep(SPACING_MS * (attempt + 1));
    } catch (e) {
      lastStatus = "network_error:" + e.message;
      await sleep(SPACING_MS * (attempt + 1));
    }
  }
  return { ok: false, status: lastStatus, text: lastText, json: null, rawPath: null };
}

async function httpGetBinary(url, { replayDir, rawName } = {}) {
  if (replayDir) {
    const p = path.join(replayDir, "assets", rawName);
    if (!fs.existsSync(p)) return { ok: false, status: "replay_missing_asset", buf: null, rawPath: p };
    return { ok: true, status: "ok", buf: fs.readFileSync(p), rawPath: p, replay: true };
  }
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    if (requestCount >= MAX_REQUESTS) return { ok: false, status: "request_budget_exhausted", buf: null, rawPath: null };
    const wait = SPACING_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    requestCount++;
    lastRequestAt = Date.now();
    try {
      const res = await fetch(url, { headers: UA });
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get("content-type") || "";
      if (res.ok && /^image\//.test(ct) && buf.length > 1024) return { ok: true, status: "ok", buf, rawPath: null, contentType: ct };
      await sleep(SPACING_MS * (attempt + 1));
    } catch {
      await sleep(SPACING_MS * (attempt + 1));
    }
  }
  return { ok: false, status: "download_failed", buf: null, rawPath: null };
}

async function registerSource(o) {
  const buf = Buffer.isBuffer(o.bufOrText) ? o.bufOrText : Buffer.from(String(o.bufOrText), "utf8");
  const ck = sha256(buf);
  const id = detUuid("source:" + o.provider + ":" + ck);
  const pre = await queryRows(
    "select source_id::text id from source_records where provider=:'p' and checksum=:'ck'",
    { p: o.provider, ck }
  );
  const existed = pre.length > 0;
  if (!existed) {
    await run(
      `insert into source_records(source_id, provider, title, retrieved_at, source_uri, content_type,
                                  license_code, checksum, raw_path, metadata_json, legacy_id)
       values (:'id'::uuid, :'p', :'t', now(), :'uri', :'ct', :'lic', :'ck', :'rp', :'md'::jsonb, null)
       on conflict (provider, checksum) do nothing`,
      { id, p: o.provider, t: o.title, uri: o.uri || null, ct: o.contentType,
        lic: o.license || null, ck, rp: o.rawPath || "", md: JSON.stringify(o.meta || {}) }
    );
  }
  const rows = await queryRows(
    "select source_id::text id from source_records where provider=:'p' and checksum=:'ck'",
    { p: o.provider, ck }
  );
  return { sourceId: rows[0].id, checksum: ck, created: !existed };
}

async function ensureVisualAsset(a) {
  const id = detUuid("asset:" + a.checksum);
  await run(
    `insert into visual_assets(asset_id, source_id, asset_type, file_path, created_date, depicted_period,
                               rights, checksum, quality_score, legacy_id, eligibility_tags)
     values (:'id'::uuid, :'sid'::uuid, :'at', :'fp', :'cd', '', :'rt', :'ck', null, :'lid', '{}')
     on conflict (asset_id) do update set
       source_id=excluded.source_id, asset_type=excluded.asset_type, file_path=excluded.file_path,
       created_date=excluded.created_date, rights=excluded.rights, checksum=excluded.checksum,
       legacy_id=excluded.legacy_id`,
    { id, sid: a.sourceId, at: a.assetType, fp: a.filePath, cd: a.createdDate || "",
      rt: a.rights || null, ck: a.checksum, lid: a.legacyId || null }
  );
  return id;
}

// ── 判定规则（机器可读、可测试；**不使用**视觉相似度）───────────────────────
function classifyCandidate(file, target) {
  const text = [file.title, stripHtml(file.description), stripHtml(file.objectName), (file.categories || []).join(" ")].join(" | ");
  const nText = norm(text);
  // §3 硬排除：车辆/交通设施照片不是遗产物（HR-5 同源理由，此处机器化）
  const transportHit = TRANSPORT_MARKERS.find((m) => text.includes(m));
  if (transportHit) {
    return { accepted: false, rule: RULE.R6, matchedName: null,
      reason: "命中交通/车辆标记「" + transportHit + "」：拍摄对象是车辆或站场，非金泽遗产物/镇景，禁止计入" };
  }
  for (const m of target.excludeMarkers || []) {
    if (text.includes(m)) {
      return { accepted: false, rule: RULE.R4, matchedName: null,
        reason: "命中跨镇排除标记「" + m + "」：同名异地，禁止映射到金泽" };
    }
  }
  const matchedName = (target.names || []).find((n) => nText.includes(norm(n)));
  if (!matchedName) {
    return { accepted: false, rule: null, matchedName: null,
      reason: "标题/说明未显式命名目标对象，不足以确证描绘对象" };
  }
  const jinzeScoped = /金泽/.test(text) || /Jinze/.test(text) ||
    (file.categories || []).some((c) => /Jinze, Shanghai/.test(c));
  if (!jinzeScoped) {
    return { accepted: false, rule: null, matchedName,
      reason: "命名匹配但无金泽范围证据（可能是同名异地），不足以接受" };
  }
  const isVariant = !!(target.nameVariants &&
    norm(text).includes(norm(target.nameVariants.sourceCanonicalForm)) &&
    !norm(file.title + stripHtml(file.description)).includes(norm(target.nameVariants.providerForm)));
  return {
    accepted: true,
    rule: isVariant ? RULE.R3 : RULE.R1,
    matchedName,
    reason: isVariant
      ? "标题/说明以 S1 规范名「" + matchedName + "」命名，且金泽范围内（名称异写按 SHR-04 保留）"
      : "标题/结构化说明显式命名「" + matchedName + "」，且金泽范围内",
  };
}

function extractDate(s) {
  const m = String(s || "").match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  return m ? m[1] + "-" + m[2] + "-" + m[3] : "";
}
// Commons 的 DateTimeOriginal 常为空（Mobile/iOS 上传），但编者常同时打上
// 「Photographs taken on YYYY-MM-DD」分类。二者都是**拍摄/制作**语义，与
// 「被描绘对象的历史年代」是两件事（§5 禁止混同），故只在 creation_date 一侧使用，
// 且必须标注来源是分类而非 EXIF 字段。
function extractCaptureDateFromCategories(cats) {
  for (const c of cats || []) {
    const m = String(c).match(/^Photographs taken on (\d{4})-(\d{2})-(\d{2})$/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
  }
  return "";
}
// 返回 {value, source}：明确「这个日期是怎么来的」——EXIF 字段 or Commons 分类。
// value 为空即「不可知」，不得用上传时间冒充拍摄时间。
function creationDateOf(file) {
  const fromExif = extractDate(file.dateTimeOriginal);
  if (fromExif) return { value: fromExif, source: "exif_DateTimeOriginal" };
  const fromCat = extractCaptureDateFromCategories(file.categories);
  if (fromCat) return { value: fromCat, source: "commons_category_photographs_taken_on" };
  return { value: "", source: null };
}
function readLegacyShlJinze() {
  const P = "D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/seed.master.json";
  const j = JSON.parse(fs.readFileSync(P, "utf8"));
  return (j.photos.photos || [])
    .filter((p) => p.source === "上海图书馆开放数据" && Array.isArray(p.towns) && p.towns.includes("金泽"))
    .map((p) => ({
      id: String(p.url).split("/").pop().replace(/\.jpg$/, ""), url: p.url, license: p.license,
      towns: p.towns, topic: p._topic, srcFile: p._src_file,
      dims: p.width && p.height ? p.width + "x" + p.height : null,
    }));
}

// ────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  const replayDir = args.fromRaw;
  const runId = replayDir ? path.basename(replayDir)
    : "jinze-visual-" + new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14) + "-" + crypto.randomBytes(4).toString("hex");
  const rawDir = replayDir || path.join(RAW_ROOT, runId);
  if (!replayDir) fs.mkdirSync(path.join(rawDir, "assets"), { recursive: true });

  const targets = args.p0Only ? TARGETS.filter((t) => t.tier === "P0") : TARGETS;
  const summary = {
    run_id: runId, mode: replayDir ? "replay" : "fetch", raw_dir: rawDir,
    tier_filter: args.p0Only ? "P0" : "P0+P1",
    requests: 0, source_created: 0, source_reused: 0, assets_registered: 0,
    queries_failed: [], by_tier: {}, outcomes: [],
  };
  const bk = (r) => (r.created ? summary.source_created++ : summary.source_reused++);
  const saveRaw = (name, text) => { if (!replayDir) fs.writeFileSync(path.join(rawDir, name), text, "utf8"); };

  // 批内收集 Wikidata QID（跨目标只查一次 claims）
  const allQids = new Set();
  const wdHitsByObject = {};

  for (const t of targets) {
    const out = { tier: t.tier, object: t.object, entity: t.entity,
      queries: [], candidates: [], accepted: [], excluded: [], result_state: null };

    // ── 1) Wikidata 身份检索（仅身份/P18；不取 P625）──
    const rawName = "wd-search-" + slug(t.object) + ".json";
    const r = await httpGetJson("https://www.wikidata.org/w/api.php?" + new URLSearchParams({
      action: "wbsearchentities", search: t.wdSearch, language: "zh", uselang: "zh", limit: "6", format: "json",
    }).toString(), { replayDir, rawName });
    saveRaw(rawName, r.text);
    const src = await registerSource({
      provider: PROVIDER_WD, title: "Wikidata wbsearchentities「" + t.wdSearch + "」",
      uri: "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" + encodeURIComponent(t.wdSearch),
      contentType: "application/json", license: "CC0-1.0",
      bufOrText: r.text || "FETCH_FAILED:" + r.status, rawPath: path.join(rawDir, rawName),
      meta: { endpoint: "wbsearchentities", search: t.wdSearch, run_id: runId,
        identity_only: true, coords_not_used: true, fetch_failed: !r.ok, fetch_status: r.status },
    });
    bk(src);
    out.queries.push({ kind: "wd_search", target: t.wdSearch, ok: r.ok, status: r.status });
    if (!r.ok) summary.queries_failed.push({ object: t.object, kind: "wd_search", status: r.status });

    const hits = r.ok ? ((r.json.search) || []) : [];
    wdHitsByObject[t.object] = hits.map((h) => ({ qid: h.id, label: h.label, description: h.description }));
    for (const h of hits) allQids.add(h.id);
    out.wikidata_search_hits = hits.length;

    // ── 2) Commons 一体化检索（generator=search + imageinfo，filetype:bitmap 去 djvu/doc 噪声）──
    const gsr = t.searchTerms.map((s) => '"' + s + '"').join(" OR ") + " filetype:bitmap";
    const cRawName = "commons-gensearch-" + slug(t.object) + ".json";
    const rc = await httpGetJson("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
      action: "query", generator: "search", gsrsearch: gsr, gsrnamespace: "6", gsrlimit: "15",
      prop: "imageinfo|categories", iiprop: "size|url|extmetadata", cllimit: "50", format: "json",
    }).toString(), { replayDir, rawName: cRawName });
    saveRaw(cRawName, rc.text);
    const csrc = await registerSource({
      provider: PROVIDER, title: "Commons 检索「" + t.object + "」",
      uri: "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" + encodeURIComponent(gsr),
      contentType: "application/json", license: "CC0-1.0",
      bufOrText: rc.text || "FETCH_FAILED:" + rc.status, rawPath: path.join(rawDir, cRawName),
      meta: { endpoint: "generator=search", gsrsearch: gsr, gsrnamespace: 6, gsrlimit: 15, run_id: runId,
        fetch_failed: !rc.ok, fetch_status: rc.status },
    });
    bk(csrc);
    out.queries.push({ kind: "commons_search", target: gsr, ok: rc.ok, status: rc.status });
    if (!rc.ok) summary.queries_failed.push({ object: t.object, kind: "commons_search", status: rc.status });

    const pages = rc.ok ? Object.values((rc.json.query && rc.json.query.pages) || {}) : [];
    out.candidate_titles = pages.length;

    // ── 3) 逐候选判定 ──
    for (const p of pages) {
      const ii = (p.imageinfo || [])[0];
      if (!ii) { out.candidates.push({ title: p.title, exists: false }); continue; }
      const em = ii.extmetadata || {};
      const file = {
        title: p.title, width: ii.width, height: ii.height, bytes: ii.size,
        url: ii.url, descriptionUrl: ii.descriptionurl,
        description: em.ImageDescription && em.ImageDescription.value,
        objectName: em.ObjectName && em.ObjectName.value,
        license: em.LicenseShortName && em.LicenseShortName.value,
        artist: em.Artist && em.Artist.value,
        dateTimeOriginal: em.DateTimeOriginal && em.DateTimeOriginal.value,
        categories: (p.categories || []).map((c) => c.title.replace("Category:", "")),
      };
      const cls = classifyCandidate(file, t);
      out.candidates.push({ title: p.title, accepted: cls.accepted, rule: cls.rule, matchedName: cls.matchedName,
        reason: cls.reason, license: file.license, cats: file.categories });
      if (cls.rule === RULE.R4) out.excluded.push({ title: p.title, reason: cls.reason, license: file.license });

      if (!cls.accepted) continue;

      // ── 4) 已接受：单文件精确 imageinfo（一文件一 Source Record）→ 下载字节 → Visual Asset ──
      const iRaw = "commons-imageinfo-" + slug(t.object) + "-" + slug(p.title.replace(/^File:/, "")) + ".json";
      const ri = await httpGetJson("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
        action: "query", prop: "imageinfo|categories", iiprop: "size|url|extmetadata",
        cllimit: "50", titles: p.title, format: "json",
      }).toString(), { replayDir, rawName: iRaw });
      saveRaw(iRaw, ri.text);
      let precise = file;
      if (ri.ok) {
        const pp = Object.values((ri.json.query && ri.json.query.pages) || {})[0];
        if (pp && pp.imageinfo) {
          const i2 = pp.imageinfo[0]; const e2 = i2.extmetadata || {};
          precise = { ...file, url: i2.url, descriptionUrl: i2.descriptionurl,
            license: e2.LicenseShortName ? e2.LicenseShortName.value : file.license,
            description: e2.ImageDescription ? e2.ImageDescription.value : file.description,
            categories: (pp.categories || []).map((c) => c.title.replace("Category:", "")) };
        }
      }
      const isrc = await registerSource({
        provider: PROVIDER, title: "Commons imageinfo「" + p.title + "」",
        uri: "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&titles=" + encodeURIComponent(p.title),
        contentType: "application/json", license: null,
        bufOrText: ri.text || "FETCH_FAILED:" + ri.status, rawPath: path.join(rawDir, iRaw),
        meta: { endpoint: "prop=imageinfo|categories", title: p.title, run_id: runId,
          fetch_failed: !ri.ok, fetch_status: ri.status },
      });
      bk(isrc);
      out.queries.push({ kind: "imageinfo", target: p.title, ok: ri.ok, status: ri.status });
      if (!ri.ok) summary.queries_failed.push({ object: t.object, kind: "imageinfo", title: p.title, status: ri.status });

      const assetName = slug(p.title.replace(/^File:/, "")) + ".bin";
      const rb = await httpGetBinary(precise.url, { replayDir, rawName: assetName });
      if (!rb.ok) { out.candidates.push({ title: p.title, accepted: false, rule: null, reason: "资产字节取回失败: " + rb.status }); continue; }
      const assetPath = replayDir ? rb.rawPath : path.join(rawDir, "assets", assetName);
      if (!replayDir) fs.writeFileSync(assetPath, rb.buf);
      const ck = sha256(rb.buf);
      const asrc = await registerSource({
        provider: PROVIDER, title: "Commons 资产字节「" + p.title + "」",
        uri: precise.descriptionUrl || precise.url, contentType: "image",
        license: precise.license || null, bufOrText: rb.buf, rawPath: assetPath,
        meta: { kind: "asset_bytes", title: p.title, run_id: runId, bytes: rb.buf.length, license: precise.license },
      });
      bk(asrc);

      const cdt = creationDateOf(precise);
      const assetId = await ensureVisualAsset({
        sourceId: isrc.sourceId, filePath: precise.descriptionUrl || precise.url,
        createdDate: cdt.value, rights: precise.license || null,
        checksum: ck, assetType: "photo", legacyId: "commons:" + p.title,
      });
      summary.assets_registered++;
      out.accepted.push({
        title: p.title, asset_id: assetId, tier: t.tier, entity: t.entity,
        target_object: t.object, rule: cls.rule, matched_name: cls.matchedName, reason: cls.reason,
        license: precise.license, width: precise.width, height: precise.height,
        creation_date: cdt.value, creation_date_source: cdt.source,
        artist: stripHtml(precise.artist),
        asset_bytes: rb.buf.length, asset_checksum: ck,
        imageinfo_source_id: isrc.sourceId, asset_source_id: asrc.sourceId,
        raw_asset_path: assetPath, description: stripHtml(precise.description),
        categories: precise.categories, name_variants: t.nameVariants || null,
      });
    }

    // 结果状态（三态显式，绝不把「查不到」混同为「没有」）
    const failed = out.queries.some((q) => !q.ok);
    out.result_state = out.accepted.length ? "confirmed_asset_found"
      : failed ? "source_unavailable"
      : "searched_no_acceptable_asset";
    summary.by_tier[t.tier] = (summary.by_tier[t.tier] || 0) + out.accepted.length;
    summary.outcomes.push(out);
  }

  // ── 5) 批内一次性取 Wikidata claims（P18 图版指认）──
  const qidList = [...allQids];
  if (qidList.length) {
    const rawName = "wd-entities-batch.json";
    const r = await httpGetJson("https://www.wikidata.org/w/api.php?" + new URLSearchParams({
      action: "wbgetentities", ids: qidList.join("|"), props: "claims|labels|sitelinks", languages: "zh|en", format: "json",
    }).toString(), { replayDir, rawName });
    saveRaw(rawName, r.text);
    const src = await registerSource({
      provider: PROVIDER_WD, title: "Wikidata wbgetentities（P18 身份指认，N=" + qidList.length + "）",
      uri: "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=" + qidList.join("%7C"),
      contentType: "application/json", license: "CC0-1.0",
      bufOrText: r.text || "FETCH_FAILED:" + r.status, rawPath: path.join(rawDir, rawName),
      meta: { endpoint: "wbgetentities", ids: qidList, props: ["P18", "labels", "sitelinks"], run_id: runId,
        coords_not_used: true, fetch_failed: !r.ok, fetch_status: r.status },
    });
    bk(src);
    const ents = r.ok ? (r.json.entities || {}) : {};
    summary.wikidata_queries = { qids: qidList, ok: r.ok, status: r.status };
    if (!r.ok) summary.queries_failed.push({ kind: "wbgetentities", status: r.status });
    // 把 P18 指认回填到对应目标
    for (const out of summary.outcomes) {
      const hits = wdHitsByObject[out.object] || [];
      const p18 = [];
      for (const h of hits) {
        const e = ents[h.qid];
        if (!e) continue;
        const lab = (e.labels && e.labels.zh && e.labels.zh.value) || (e.labels && e.labels.en && e.labels.en.value) || h.label || "";
        const sl = Object.keys(e.sitelinks || {});
        for (const f of ((e.claims || {}).P18 || [])) {
          const v = f.mainsnak && f.mainsnak.datavalue && f.mainsnak.datavalue.value;
          if (v) p18.push({ qid: h.qid, label: lab, file: "File:" + v, sitelinks: sl });
        }
      }
      out.wikidata_p18 = p18;
      for (const a of out.accepted) {
        const hit = p18.find((x) => norm(x.file) === norm(a.title));
        if (hit) a.wikidata_p18_corroboration = hit;
      }
    }
  }

  // ── 5b) P18 通道【发现】补漏：Commons 全文检索会漏（CirrusSearch 索引问题），
  //        实测 File:Wan'anqiao.jpg（desc「万安桥 青浦区金泽镇北市」）对
  //        「万安桥 / Wananqiao / Wan'anqiao」三种检索词均 0 命中。
  //        P18 是编者【编目断言】，仅作【发现通道】；身份仍由同一套确定性规则判定（本函数复用）。
  //        不读取 P625（坐标不参与，避免任何「用外部坐标替代对象坐标」的嫌疑）。
  if (qidList.length) {
    for (const out of summary.outcomes) {
      const target = TARGETS.find((t) => t.object === out.object);
      if (!target) continue;
      for (const hit of out.wikidata_p18 || []) {
        if (out.accepted.some((a) => norm(a.title) === norm(hit.file))) continue; // 已经由搜索通道接受
        const iRaw = "commons-imageinfo-p18-" + slug(out.object) + "-" + slug(hit.file.replace(/^File:/, "")) + ".json";
        const ri = await httpGetJson("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
          action: "query", prop: "imageinfo|categories", iiprop: "size|url|extmetadata",
          cllimit: "50", titles: hit.file, format: "json",
        }).toString(), { replayDir, rawName: iRaw });
        saveRaw(iRaw, ri.text);
        if (!ri.ok) {
          summary.queries_failed.push({ object: out.object, kind: "imageinfo_p18", title: hit.file, status: ri.status });
          continue;
        }
        const pp = Object.values((ri.json.query && ri.json.query.pages) || {})[0];
        if (!pp || !pp.imageinfo) continue;
        const i2 = pp.imageinfo[0]; const e2 = i2.extmetadata || {};
        const file = {
          title: pp.title, width: i2.width, height: i2.height, bytes: i2.size,
          url: i2.url, descriptionUrl: i2.descriptionurl,
          description: e2.ImageDescription && e2.ImageDescription.value,
          objectName: e2.ObjectName && e2.ObjectName.value,
          license: e2.LicenseShortName && e2.LicenseShortName.value,
          artist: e2.Artist && e2.Artist.value,
          dateTimeOriginal: e2.DateTimeOriginal && e2.DateTimeOriginal.value,
          categories: (pp.categories || []).map((c) => c.title.replace("Category:", "")),
        };
        const cls = classifyCandidate(file, target);
        const isrc = await registerSource({
          provider: PROVIDER, title: "Commons imageinfo「" + pp.title + "」(P18 通道)",
          uri: "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&titles=" + encodeURIComponent(pp.title),
          contentType: "application/json", license: null, bufOrText: ri.text, rawPath: path.join(rawDir, iRaw),
          meta: { endpoint: "prop=imageinfo|categories", title: pp.title, run_id: runId,
            discovery_channel: "wikidata_p18", wikidata_qid: hit.qid },
        });
        bk(isrc);
        out.candidates.push({ title: pp.title, accepted: cls.accepted, rule: cls.rule, matchedName: cls.matchedName,
          reason: cls.reason, license: file.license, cats: file.categories, discovery_channel: "wikidata_p18" });
        if (!cls.accepted) continue;

        const assetName = slug(pp.title.replace(/^File:/, "")) + ".bin";
        const rb = await httpGetBinary(file.url, { replayDir, rawName: assetName });
        if (!rb.ok) continue;
        const assetPath = replayDir ? rb.rawPath : path.join(rawDir, "assets", assetName);
        if (!replayDir) fs.writeFileSync(assetPath, rb.buf);
        const ck = sha256(rb.buf);
        const asrc = await registerSource({
          provider: PROVIDER, title: "Commons 资产字节「" + pp.title + "」",
          uri: file.descriptionUrl || file.url, contentType: "image",
          license: file.license || null, bufOrText: rb.buf, rawPath: assetPath,
          meta: { kind: "asset_bytes", title: pp.title, run_id: runId, bytes: rb.buf.length,
            license: file.license, discovery_channel: "wikidata_p18" },
        });
        bk(asrc);
        const cdt2 = creationDateOf(file);
        const assetId = await ensureVisualAsset({
          sourceId: isrc.sourceId, filePath: file.descriptionUrl || file.url,
          createdDate: cdt2.value, rights: file.license || null,
          checksum: ck, assetType: "photo", legacyId: "commons:" + pp.title,
        });
        summary.assets_registered++;
        out.accepted.push({
          title: pp.title, asset_id: assetId, tier: target.tier, entity: target.entity,
          target_object: target.object, rule: cls.rule, matched_name: cls.matchedName, reason: cls.reason,
          license: file.license, width: file.width, height: file.height,
          creation_date: cdt2.value, creation_date_source: cdt2.source,
          artist: stripHtml(file.artist),
          asset_bytes: rb.buf.length, asset_checksum: ck,
          imageinfo_source_id: isrc.sourceId, asset_source_id: asrc.sourceId,
          raw_asset_path: assetPath, description: stripHtml(file.description),
          categories: file.categories, name_variants: target.nameVariants || null,
          discovery_channel: "wikidata_p18",
          wikidata_p18_corroboration: hit,
        });
      }
      // 补漏后重算结果状态（三态显式）
      const failedQ = out.queries.some((q) => !q.ok);
      out.result_state = out.accepted.length ? "confirmed_asset_found"
        : failedQ ? "source_unavailable" : "searched_no_acceptable_asset";
    }
    // by_tier 重算（补漏可能新增）
    summary.by_tier = {};
    for (const out of summary.outcomes) {
      if (out.tier) summary.by_tier[out.tier] = (summary.by_tier[out.tier] || 0) + (out.accepted || []).length;
    }
  }

  // ── 6) P1-9 镇景/水系：Commons 分类成员（无对象名可确证 → 只作候选，绝不建 confirmed）──
  if (!args.p0Only) {
    const out = { tier: "P1", object: SCENE_TARGET.object, entity: null,
      category: SCENE_TARGET.category, queries: [], category_members: [] };
    const rawName = "commons-cat-jinze.json";
    const r = await httpGetJson("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
      action: "query", list: "categorymembers", cmtitle: SCENE_TARGET.category, cmtype: "file", cmlimit: "200", format: "json",
    }).toString(), { replayDir, rawName });
    saveRaw(rawName, r.text);
    const src = await registerSource({
      provider: PROVIDER, title: "Commons 分类成员「" + SCENE_TARGET.category + "」",
      uri: "https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=" + encodeURIComponent(SCENE_TARGET.category),
      contentType: "application/json", license: "CC0-1.0",
      bufOrText: r.text || "FETCH_FAILED:" + r.status, rawPath: path.join(rawDir, rawName),
      meta: { endpoint: "list=categorymembers", cmtitle: SCENE_TARGET.category, run_id: runId,
        fetch_failed: !r.ok, fetch_status: r.status },
    });
    bk(src);
    out.queries.push({ kind: "categorymembers", ok: r.ok, status: r.status });
    if (!r.ok) summary.queries_failed.push({ kind: "categorymembers", status: r.status });
    out.category_members = r.ok ? (((r.json || {}).query || {}).categorymembers || []).map((m) => m.title) : [];
    out.result_state = r.ok ? "category_listed_identity_unresolved" : "source_unavailable";
    summary.outcomes.push(out);
  }

  // ── 6b) 历史影像定向探针（判定 WP-E「历史/档案资产是否确可获得」）──────────
  //   这是本 Task 唯一一处「历史影像」检索，且是**枚举式**：4 条固定检索词 +
  //   Jinze 分类的子分类枚举。若结果为 0，则该结论有据可查，而不是「没找就说不存在」。
  if (!args.p0Only) {
    const out = { tier: "P1", object: "金泽历史镇景与水系（历史影像探针）", entity: null,
      queries: [], history_candidates: [], subcategories: [] };
    for (const hq of HISTORY_QUERIES) {
      const rawName = "commons-histsprobe-" + slug(hq.label) + ".json";
      const r = await httpGetJson("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
        action: "query", generator: "search",
        gsrsearch: hq.q + " filetype:bitmap", gsrnamespace: "6", gsrlimit: hq.limit || "20",
        prop: "imageinfo|categories", iiprop: "size|url|extmetadata", cllimit: "100", format: "json",
      }).toString(), { replayDir, rawName });
      saveRaw(rawName, r.text);
      const src = await registerSource({
        provider: PROVIDER, title: "Commons 历史影像探针「" + hq.label + "」",
        uri: "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" + encodeURIComponent(hq.q + " filetype:bitmap"),
        contentType: "application/json", license: "CC0-1.0",
        bufOrText: r.text || "FETCH_FAILED:" + r.status, rawPath: path.join(rawDir, rawName),
        meta: { endpoint: "generator=search", purpose: "historical_imagery_probe", query: hq.q,
          run_id: runId, fetch_failed: !r.ok, fetch_status: r.status },
      });
      bk(src);
      out.queries.push({ kind: "history_probe", target: hq.q, ok: r.ok, status: r.status });
      if (!r.ok) summary.queries_failed.push({ object: out.object, kind: "history_probe", status: r.status });
      const pages = r.ok ? Object.values(((r.json || {}).query || {}).pages || {}) : [];
      for (const p of pages) {
        const ii = (p.imageinfo || [])[0];
        if (!ii) continue;
        const em = ii.extmetadata || {};
        const cats = (p.categories || []).map((c) => c.title.replace("Category:", ""));
        const file = {
          title: p.title, categories: cats,
          description: em.ImageDescription && em.ImageDescription.value,
          objectName: em.ObjectName && em.ObjectName.value,
          dateTimeOriginal: em.DateTimeOriginal && em.DateTimeOriginal.value,
        };
        const txt = [file.title, stripHtml(file.description), cats.join(" ")].join(" | ");
        const tHit = TRANSPORT_MARKERS.find((m) => txt.includes(m));
        const jinzeScoped = /金泽/.test(txt) || /Jinze/i.test(txt);
        // 历史年代证据：EXIF/说明中的年份，或 Commons「Photographs taken on」分类
        const cdt = creationDateOf({ ...file, categories: cats });
        const year = cdt.value ? Number(cdt.value.slice(0, 4)) : null;
        const captionYears = (stripHtml(file.description).match(/\b(18|19)\d{2}\b/g) || []).map(Number);
        const earliest = [year, ...captionYears].filter((y) => y != null).sort((a, b) => a - b)[0] ?? null;
        let verdict;
        if (tHit) verdict = "excluded_rolling_stock:" + tHit;
        else if (!jinzeScoped) verdict = "excluded_no_jinze_scope";
        else if (earliest == null) verdict = "undated_cannot_establish_historical";
        else if (earliest >= HISTORICAL_CUTOFF_YEAR) verdict = "dated_but_not_historical(" + earliest + ")";
        else verdict = "candidate_historical(" + earliest + ")";
        out.history_candidates.push({
          title: p.title, verdict, earliest_year: earliest, date_source: cdt.source,
          license: em.LicenseShortName && em.LicenseShortName.value, query: hq.q,
        });
      }
    }
    // 顺带枚举 Jinze 分类的子分类，看是否存在历史影像专区
    const rawName = "commons-subcats-jinze.json";
    const rs = await httpGetJson("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
      action: "query", list: "categorymembers", cmtitle: SCENE_TARGET.category,
      cmtype: "subcat", cmlimit: "100", format: "json",
    }).toString(), { replayDir, rawName });
    saveRaw(rawName, rs.text);
    const ssrc = await registerSource({
      provider: PROVIDER, title: "Commons 子分类枚举「" + SCENE_TARGET.category + "」",
      uri: "https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtype=subcat&cmtitle=" + encodeURIComponent(SCENE_TARGET.category),
      contentType: "application/json", license: "CC0-1.0",
      bufOrText: rs.text || "FETCH_FAILED:" + rs.status, rawPath: path.join(rawDir, rawName),
      meta: { endpoint: "list=categorymembers", cmtype: "subcat", run_id: runId,
        fetch_failed: !rs.ok, fetch_status: rs.status },
    });
    bk(ssrc);
    out.queries.push({ kind: "subcategories", ok: rs.ok, status: rs.status });
    if (!rs.ok) summary.queries_failed.push({ object: out.object, kind: "subcategories", status: rs.status });
    out.subcategories = rs.ok ? (((rs.json || {}).query || {}).categorymembers || []).map((m) => m.title) : [];
    out.result_state = out.history_candidates.some((c) => c.verdict.startsWith("candidate_historical"))
      ? "historical_candidates_identity_unresolved" : "no_historical_asset_found";
    summary.outcomes.push(out);
  }

  // ── 7) S1 上海图书馆「金泽」影像（历史/档案候选；元数据缺失 → unconfirmed）──
  if (!args.p0Only) {
    const legacy = readLegacyShlJinze();
    const out = { tier: "P1", object: SCENE_TARGET.object, entity: null,
      source: PROVIDER_SHL, queries: [], s1_candidates: [] };
    for (const rec of legacy) {
      const assetName = rec.id + ".jpg";
      const rb = await httpGetBinary(rec.url, { replayDir, rawName: assetName });
      if (!rb.ok) { out.s1_candidates.push({ id: rec.id, error: rb.status }); continue; }
      const assetPath = replayDir ? rb.rawPath : path.join(rawDir, "assets", assetName);
      if (!replayDir) fs.writeFileSync(assetPath, rb.buf);
      const ck = sha256(rb.buf);
      const ssrc = await registerSource({
        provider: PROVIDER_SHL, title: "上海图书馆开放数据 影像「" + rec.id + "」",
        uri: rec.url, contentType: "image", license: rec.license, bufOrText: rb.buf, rawPath: assetPath,
        meta: { kind: "asset_bytes", run_id: runId, legacy_towns: rec.towns, legacy_topic: rec.topic,
          legacy_src_file: rec.srcFile,
          metadata_gaps: "无标题/无说明/无年代/无作者（Legacy 记录 caption/date/artist 字段均为空）" },
      });
      bk(ssrc);
      const assetId = await ensureVisualAsset({
        sourceId: ssrc.sourceId, filePath: rec.url, createdDate: "", rights: rec.license,
        checksum: ck, assetType: "photo", legacyId: "hushang-jingwei:shl:" + rec.id,
      });
      summary.assets_registered++;
      out.s1_candidates.push({ id: rec.id, asset_id: assetId, url: rec.url, asset_bytes: rb.buf.length,
        asset_checksum: ck, raw_asset_path: assetPath, claimed_dims: rec.dims, legacy_topic: rec.topic,
        rule: RULE.R5, link_status_declared: "unconfirmed" });
    }
    out.result_state = out.s1_candidates.length ? "candidates_identity_unresolved" : "source_unavailable";
    summary.outcomes.push(out);
  }

  summary.requests = requestCount;
  if (!replayDir) {
    const sumPath = path.join(rawDir, "_run-summary.json");
    fs.writeFileSync(sumPath, JSON.stringify(summary, null, 2), "utf8");
    const s2 = await registerSource({
      provider: "mohen-pipeline", title: "jinze-visual run summary " + runId, uri: null,
      contentType: "application/json", license: null,
      bufOrText: JSON.stringify(summary, null, 2), rawPath: sumPath,
      meta: { run_id: runId, kind: "run_summary" },
    });
    bk(s2);
  }
  console.log(JSON.stringify(summary));
}

main().catch((e) => { console.error("RETRIEVE VISUAL FAILED:", e.message); process.exit(1); });
