#!/usr/bin/env node
// Y07 目录侧协议路径：OAI-PMH 与 SPARQL（元数据检索，不冒充原件）。
//
// 规范依据（Y01—Y08 V1.1）：
//   * Y07「可组合 REST/OAI-PMH/SPARQL/IIIF Presentation/Image/HTTP-Range/批量包/馆方申请」；
//     「区别目录读取与原件字节传输」「元数据 200 不算原件下载」。
//   * Y02 目录条目只描述"目录层面看到了什么"；是否取得由 Y07/Y08 记。
//   * 失败：403/429/404/DNS 进入既有运行故障控制并追加 Attempt；明确拒绝不机械重复；
//     需人工授权时停于 REQUEST_PERMISSION（本工具用 result_state=restricted 如实记账）。
//
// 因此这两个协议的尝试一律记 `metadata_only`，不写 acquired_*，也不产生 Y08 的"已取得字节"。
//
// 用法：
//   node --env-file=.env.local tools/acquire-directory-api.mjs --protocol oai-pmh \
//     --endpoint https://gallica.bnf.fr/OAI-PMH --provider "BnF Gallica" --set gallica:typedoc:monographies \
//     --from 2026-01-01 --max 20 [--apply]
//   node --env-file=.env.local tools/acquire-directory-api.mjs --protocol sparql \
//     --endpoint https://query.wikidata.org/sparql --provider Wikidata --query-file q.rq [--apply]
import fs from "node:fs";
import { createHash } from "node:crypto";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";

const ROOT = new URL("..", import.meta.url);
for (const name of [".env.local", ".env"]) {
  const file = new URL(name, ROOT);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const APPLY = process.argv.includes("--apply");
const REQUEST_PERMISSION = process.argv.includes("--request-permission");
const PROTOCOL = arg("protocol");
const ENDPOINT = arg("endpoint");
const PROVIDER = arg("provider");
const PROJECT_ID = arg("project-id", "b0a11000-0000-4000-8000-000000000001");
const MAX_ITEMS = Number(arg("max", "20"));
const UA = "MoHenResearch/1.0 (digital humanities; contact: owner)";
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// 两条协议各自的路径标识（与 M0002/M0003/M0004 并列，不互改语义）。
const ROUTES = {
  "oai-pmh": { key: "M0005", version: "v1", accessMode: "oai_pmh_metadata",
    protocols: ["OAI-PMH 2.0（ListRecords/GetRecord）"],
    note: "目录级检索；拿到的是记录元数据，不是原件字节" },
  sparql: { key: "M0006", version: "v1", accessMode: "sparql_select",
    protocols: ["SPARQL 1.1 Query（SELECT）"],
    note: "目录级检索；拿到的是查询结果集，不是原件字节" },
};

function emit(status, payload) {
  console.log(JSON.stringify({ status, ...payload }, null, 2));
  process.exitCode = status.endsWith("_OK") || status === "APPLIED" ? 0 : 1;
}

async function fetchText(url, { init = {}, attempts = 3 } = {}) {
  let last;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) } });
      if (response.status === 503 || response.status === 429) {
        // OAI-PMH 规范用 Retry-After 告知退避；不许无视限流硬撞。
        const wait = Number(response.headers.get("retry-after") ?? 5);
        last = Object.assign(new Error(`HTTP_${response.status}`), { status: response.status });
        if (i < attempts) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(wait, 1), 30) * 1000));
          continue;
        }
        throw last;
      }
      if (response.status === 401 || response.status === 402 || response.status === 407) {
        throw Object.assign(new Error(`HTTP_${response.status}`), { status: response.status, needsPermission: true });
      }
      if (!response.ok) {
        // 端点拒绝时保留原文：400 是查询本身的问题，403/429 是许可/限流问题，处置完全不同。
        const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 400);
        throw Object.assign(new Error(`HTTP_${response.status}`), { status: response.status, detail });
      }
      return { body: await response.text(), status: response.status, url: response.url ?? url };
    } catch (error) {
      last = error;
      if (error?.needsPermission || error?.status === 404) break;
      if (i >= attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 1200 * i));
    }
  }
  throw last ?? new Error("HTTP_FAILED");
}

const decodeXml = (text) => text
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const pick = (xml, tag) => {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return m ? decodeXml(m[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null;
};

// OAI-PMH：ListRecords + resumptionToken 翻页。硬上限防无界抓取（Y01 明令禁止）。
async function harvestOai({ metadataPrefix, set, from, until }) {
  const records = [];
  let token = null;
  let pages = 0;
  const identify = await fetchText(`${ENDPOINT}?verb=Identify`);
  const repositoryName = pick(identify.body, "repositoryName");
  while (records.length < MAX_ITEMS && pages < 20) {
    const query = token
      ? `verb=ListRecords&resumptionToken=${encodeURIComponent(token)}`
      : ["verb=ListRecords", `metadataPrefix=${encodeURIComponent(metadataPrefix)}`, set && `set=${encodeURIComponent(set)}`,
        from && `from=${encodeURIComponent(from)}`, until && `until=${encodeURIComponent(until)}`].filter(Boolean).join("&");
    const page = await fetchText(`${ENDPOINT}?${query}`);
    pages += 1;
    const chunks = page.body.split(/<record[ >]/).slice(1);
    for (const chunk of chunks) {
      if (records.length >= MAX_ITEMS) break;
      const identifier = pick(chunk, "identifier");
      if (!identifier) continue;
      records.push({
        identifier, datestamp: pick(chunk, "datestamp"), setSpec: pick(chunk, "setSpec"),
        title: pick(chunk, "dc:title") ?? pick(chunk, "title"),
        creator: pick(chunk, "dc:creator") ?? pick(chunk, "creator"),
        type: pick(chunk, "dc:type") ?? pick(chunk, "type"),
        language: pick(chunk, "dc:language") ?? pick(chunk, "language"),
        rights: pick(chunk, "dc:rights") ?? pick(chunk, "rights"),
        page_sha256: sha256(chunk),
      });
    }
    const nextToken = pick(page.body, "resumptionToken");
    const complete = /completeListSize/i.test(page.body);
    if (!nextToken || nextToken.length === 0) { token = null; break; }
    token = nextToken;
    if (complete && records.length >= MAX_ITEMS) break;
  }
  return { repositoryName, records, pages, exhausted: token == null };
}

// SPARQL：SELECT，只取结果集；JSON 结果是目录线索，不是件。
async function querySparql({ query }) {
  const response = await fetchText(ENDPOINT, {
    init: { method: "POST", headers: { Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }).toString() },
  });
  const parsed = JSON.parse(response.body);
  const vars = parsed?.head?.vars ?? [];
  const rows = (parsed?.results?.bindings ?? []).slice(0, MAX_ITEMS).map((binding) => {
    const flat = {};
    for (const [key, value] of Object.entries(binding)) flat[key] = value?.value ?? null;
    return flat;
  });
  return { vars, rows };
}

async function recordRoute({ route, needId, discovery, summary, candidateRef, pagination,
  resultState, failureCode, outcome, startedAt, finishedAt }) {
  await discovery.registerAcquisitionMethod({
    methodKey: route.key, methodVersion: route.version, accessMode: route.accessMode,
    resourceScope: { protocols: route.protocols, providers: [PROVIDER], resource_scope_note: route.note },
    preconditions: { endpoint_reachable: true, rate_limit: { retry_max: 3, backoff_honoured: true } },
    steps: ["Identify/校验端点", "分页或结果集检索（遵守限流与退避）", "逐条登记目录条目（Y02）",
      "如实记一次尝试（metadata_only，不冒充原件）"],
    successCriteria: ["每条线索可回查到具体记录 URI 与核查时刻", "不把元数据当原件字节", "限流被遵守"],
    failureModes: ["HTTP_403", "HTTP_429", "HTTP_404", "ACQUISITION_REQUIRES_PERMISSION"],
    alternatives: ["M0002@v1", "M0003@v1", "M0004@v1"],
    methodState: resultState === "metadata_only" ? "TESTED_SUCCESS" : "TESTED_FAILURE",
  });
  const requestDigest = sha256(JSON.stringify({ endpoint: ENDPOINT, protocol: PROTOCOL, candidateRef }));
  const attempt = await discovery.appendAcquisitionAttempt({
    projectId: PROJECT_ID, needId, candidateRef, methodKey: route.key, methodVersion: route.version,
    executionEnvironment: { kind: "agent_workstation", runtime: "node",
      tool: "tools/acquire-directory-api.mjs", user_agent: UA },
    requestDigest, pagination, startedAt, finishedAt, resultState, failureCode,
    failureCertainty: failureCode ? "CONFIRMED" : null,
    acquiredExtent: outcome.extent,
    byteSize: null, assetSha256: null,
    sourceLocator: { endpoint: ENDPOINT, protocol: PROTOCOL },
    rightsActions: {},
    accessRestrictions: { robots_or_terms_reviewed: false, rate_limit_observed: true },
    dependencyRefs: outcome.dependencyRefs ?? [],
    cost: { amount: null, currency: null, certainty: "unknown" },
  });
  summary.attempt = attempt;
  // 目录级获取没有原件字节：Y08 覆盖只能如实写 unknown，不得出现 complete。
  const coverage = await discovery.recordAcquisitionCoverage({
    projectId: PROJECT_ID, attemptId: attempt.attempt_id,
    coverageScope: {
      schema: "mohen.directory-route-coverage.v1", method: "Y08:directory_coverage@v1",
      target: "directory_records", protocol: PROTOCOL, endpoint: ENDPOINT,
      granularity: "record", denominator: { kind: outcome.denominatorKind, total: outcome.total },
      total_extent: "unknown", pages_extent: "unknown",
      note: "目录级结果；未取得原件字节，extent 不作主张",
    },
    missingParts: [],
    completenessState: "unknown",
    verifiedAgainst: { attempt_id: attempt.attempt_id, records_listed: outcome.total },
    note: "OAI-PMH/SPARQL 属目录读取；取得原件须另走 M0002/M0003/M0004",
  });
  summary.coverage = coverage;
  return attempt;
}

async function main() {
  const route = ROUTES[PROTOCOL];
  if (!route) return emit("CONFIG_ERROR", { error: "PROTOCOL_MUST_BE_oai-pmh_OR_sparql" });
  if (!ENDPOINT || !PROVIDER) return emit("CONFIG_ERROR", { error: "ENDPOINT_AND_PROVIDER_REQUIRED" });
  const pool = getNodePgPool();
  const needId = arg("need-id") ?? (await queryRows(
    `select need_id::text as id from source.source_needs where project_id=:'p'::uuid
      order by created_at desc limit 1`, { p: PROJECT_ID }))[0]?.id ?? null;
  if (!needId) return emit("CONFIG_ERROR", { error: "NEED_RECEIPT_REQUIRED" });

  // 馆方正式申请分支：不发检索、不下载，如实记 restricted 并给出可直接发出的申请内容。
  if (REQUEST_PERMISSION) {
    const summary = { protocol: PROTOCOL, endpoint: ENDPOINT, provider: PROVIDER, mode: "REQUEST_PERMISSION" };
    const request = {
      to: arg("contact", "（需填馆方联系邮箱/申请表地址）"),
      subject: `原件取得授权申请｜${PROVIDER}`,
      body: [
        `机构：墨痕 MoHen（个人研究用途）`,
        `资源范围：${arg("scope", "（填具体题名/馆藏号与页卷范围）")}`,
        `请求动作：下载、保存、机器读取（用途：数字人文研究与作品创作，不再分发原件）`,
        `接口：${ENDPOINT}`,
        `期望回复：许可范围、速率限制、署名要求、可否长期保存`,
      ].join("\n"),
    };
    summary.request_to_send = request;
    if (!APPLY) { await pool.end(); return emit("REQUEST_PERMISSION_DRY_RUN_OK", { summary }); }
    const discovery = await discoveryWithWorker();
    const attempt = await recordRoute({
      route, needId, discovery, summary,
      candidateRef: { schema: "mohen.permission-request.v1", target: "institutional_request",
        provider: PROVIDER, endpoint: ENDPOINT, scope: arg("scope", null) },
      pagination: { boundary: "none", note: "未发起检索：需馆方书面授权" },
      resultState: "restricted", failureCode: "ACQUISITION_REQUIRES_PERMISSION",
      outcome: { extent: { granularity: "none", records: 0 }, total: 0,
        denominatorKind: "requested_record_count", dependencyRefs: [] },
      startedAt: new Date(), finishedAt: new Date(),
    });
    summary.attempt = attempt;
    await pool.end(); await discovery.pool.end();
    return emit("APPLIED", { summary });
  }

  const startedAt = new Date();
  let collected;
  let fetchError = null;
  try {
    collected = PROTOCOL === "oai-pmh"
      ? await harvestOai({ metadataPrefix: arg("metadata-prefix", "oai_dc"), set: arg("set"),
        from: arg("from"), until: arg("until") })
      : await querySparql({ query: arg("query") ?? (arg("query-file")
        ? fs.readFileSync(arg("query-file"), "utf8") : null) ?? "" });
  } catch (error) {
    fetchError = error;
  }
  if (PROTOCOL === "sparql" && !fetchError && (!collected?.rows || collected.rows.length === 0)) {
    return emit("EMPTY_RESULT", { error: "SPARQL_RETURNED_NO_ROWS" });
  }
  const summary = { protocol: PROTOCOL, endpoint: ENDPOINT, provider: PROVIDER, method: route.key + "@" + route.version };
  if (fetchError) {
    summary.error = String(fetchError?.message ?? fetchError);
    if (fetchError?.detail) summary.endpoint_detail = fetchError.detail;
    if (!APPLY) { await pool.end(); return emit("FETCH_FAILED", { summary }); }
    const discovery = await discoveryWithWorker();
    await recordRoute({ route, needId, discovery, summary,
      candidateRef: { schema: "mohen.directory-query.v1", target: "directory_records",
        provider: PROVIDER, endpoint: ENDPOINT },
      pagination: { boundary: "none", note: "端点请求失败" },
      resultState: "unavailable", failureCode: String(fetchError?.message ?? "HTTP_FAILED"),
      outcome: { extent: { granularity: "none", records: 0 }, total: 0,
        denominatorKind: "requested_record_count" },
      startedAt, finishedAt: new Date() });
    await pool.end(); await discovery.pool.end();
    return emit("ATTEMPT_RECORDED_FAILED", { summary });
  }

  const items = PROTOCOL === "oai-pmh"
    ? collected.records.map((record) => ({ identifier: record.identifier, title: record.title ?? record.identifier,
      creator: record.creator, language: record.language, rights: record.rights,
      pageHash: record.page_sha256, datestamp: record.datestamp }))
    : collected.rows.map((row, index) => ({
      identifier: row.item ?? row.itemLabel ?? row.s ?? `row-${index + 1}`,
      title: row.itemLabel ?? row.label ?? row.sLabel ?? row.item ?? `row-${index + 1}`,
      creator: row.authorLabel ?? null, language: null, rights: null,
      pageHash: sha256(JSON.stringify(row)), datestamp: null, binding: row }));
  summary.collected = { count: items.length, vars: collected.vars ?? null, repository: collected.repositoryName ?? null };

  if (!APPLY) {
    summary.preview = items.slice(0, 5);
    await pool.end();
    return emit("DRY_RUN_OK", { summary });
  }
  const discovery = await discoveryWithWorker();
  const catalogIds = [];
  for (const item of items) {
    const saved = await discovery.recordCatalogEntry({
      projectId: PROJECT_ID, needId, provider: PROVIDER,
      catalogTitle: String(item.title ?? item.identifier).slice(0, 400),
      catalogIdentifier: String(item.identifier).slice(0, 300),
      carrierHint: PROTOCOL === "oai-pmh" ? "metadata_record" : "sparql_result_row",
      language: item.language ?? null,
      coverageHint: { protocol: PROTOCOL, endpoint: ENDPOINT, set: arg("set"), from: arg("from"),
        until: arg("until"), datestamp: item.datestamp },
      rightsHint: item.rights ? { statement: String(item.rights).slice(0, 400), layer: "aggregation_metadata_license" } : {},
      availabilityState: "catalog_found",
      discoveredByMethod: PROTOCOL === "oai-pmh" ? "Y02:oai_pmh_listrecords" : "Y02:sparql_select",
      methodVersion: "v1",
      evidenceRef: { uri: ENDPOINT, checked_at: new Date().toISOString(),
        record_identifier: String(item.identifier), response_sha256: item.pageHash },
    });
    catalogIds.push(saved.catalog_entry_id);
  }
  summary.catalog_entry_ids = catalogIds;
  const attempt = await recordRoute({ route, needId, discovery, summary,
    candidateRef: { schema: "mohen.directory-query.v1", target: "directory_records",
      provider: PROVIDER, endpoint: ENDPOINT, set: arg("set"), from: arg("from"), until: arg("until") },
    pagination: PROTOCOL === "oai-pmh"
      ? { boundary: "resumptionToken", pages: collected.pages, exhausted: collected.exhausted,
        records_listed: items.length }
      : { boundary: "max_rows", rows_listed: items.length, requested_max: MAX_ITEMS },
    resultState: "metadata_only", failureCode: null,
    outcome: { extent: { granularity: "record", records: items.length, total: items.length },
      total: items.length,
      denominatorKind: PROTOCOL === "oai-pmh" ? "oai_pmh_record_count" : "sparql_row_count",
      dependencyRefs: catalogIds.map((id) => ({ kind: "catalog_entry", id, layer: "catalog_record" })) },
    startedAt, finishedAt: new Date() });
  summary.attempt = attempt;
  summary.method_current = await discovery.recordAcquisitionMethodRevalidation({
    methodKey: route.key, methodVersion: route.version,
    methodState: "TESTED_SUCCESS", revalidatedAt: new Date(), recommended: true });
  await pool.end(); await discovery.pool.end();
  emit("APPLIED", { summary });
}

async function discoveryWithWorker() {
  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  const workerUrl = process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL;
  if (!secret || !workerUrl) throw new Error("WORKER_CREDENTIALS_MISSING");
  const { createPrivateWorkerPool, assertPrivateWorkerIdentity } = await import(
    "../packages/data-access/src/private-worker-pool.mjs");
  const caFile = process.env.MOHEN_DATABASE_CA_CERT_FILE;
  const ca = process.env.MOHEN_DATABASE_CA_CERT
    ?? (caFile && fs.existsSync(caFile) ? fs.readFileSync(caFile, "utf8") : undefined);
  const pool = await createPrivateWorkerPool(workerUrl, { ca });
  await assertPrivateWorkerIdentity(pool);
  const repository = createSourceDiscoveryRepository({ query: (text, values) => pool.query(text, values) });
  repository.pool = pool;
  return repository;
}

main().catch(async (error) => {
  console.log(JSON.stringify({ status: "FAILED", error: String(error?.message ?? error) }));
  try { await getNodePgPool().end(); } catch { /* 已关闭 */ }
  process.exitCode = 1;
});
