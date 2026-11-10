#!/usr/bin/env node
// Y04 真实链验证：聚合目录原机构回溯（OriginalProviderTrace + provenance 链）。
//
// 规范依据（Y01—Y08 V1.1，Y04）：
//   * 输出 OriginalProviderTrace、catalog_record_ref、holding_ref 候选及 provenance 链；
//   * 验收：有原馆编号和核查时刻、每一跳可追、未回源不虚构馆藏身份；
//   * 反例：把聚合元数据 CC0 等同图像许可、镜像 PDF 冒原馆授权、404 断言对象不存在；
//   * 失败：查不回来只保留聚合线索并标 ORIGIN_UNRESOLVED/HOLD。
//
// 本工具做的是"真的去查一遍"：对聚合检索入口与原馆记录各发一次真实 HTTP，
// 把真实状态码/时刻/响应摘要记成跳；然后用私有工人角色经唯一写入口
// （source-discovery-repository.recordProviderTrace）落库并回读。
// 不编造 200、不编造核查时刻、不绕访问控制；聚合 403/429 时如实记为受阻跳。
//
// 用法：
//   node --env-file=.env.local tools/verify-y04-origin-trace.mjs \
//     --provider "国立公文书馆（NAJ）" [--title 松江府志7] \
//     [--aggregator-url https://jpsearch.go.jp/api/item/search/jps-cross?keyword=...] \
//     [--original-url https://www.digital.archives.go.jp/item/4252790] [--catalog-no NAJDA-292-0017]
import fs from "node:fs";
import { createHash } from "node:crypto";
import { getNodePgPool, queryRows } from "../packages/data-access/src/index.mjs";
import { createSourceDiscoveryRepository } from "../packages/data-access/src/source-discovery-repository.mjs";
import { deriveOriginalProviderTrace } from "../pipelines/data-production/workers/source-provider-trace.mjs";

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
const PROJECT_ID = arg("project-id");
const PROVIDER = arg("provider");
const TITLE = arg("title");
const AGGREGATOR_URL = arg("aggregator-url",
  "https://jpsearch.go.jp/api/item/search/jps-cross?keyword=%E6%9D%BE%E6%B1%9F%E5%BA%9C%E5%BF%97&size=3");
const ORIGINAL_URL = arg("original-url", "https://www.digital.archives.go.jp/item/4252790");
const CATALOG_NO = arg("catalog-no");
const UA = "MoHenResearch/1.0 (digital humanities; contact: owner)";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const out = { step: "Y04_ORIGIN_TRACE", checks: {} };
const done = (status) => {
  out.status = status;
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = status === "Y04_ORIGIN_TRACE_PROVEN" ? 0 : 1;
};

// 真的发一次请求：状态码、响应类型、字节摘要与核查时刻都取自这一次真实往返。
async function probe(uri) {
  const checkedAt = new Date();
  try {
    const response = await fetch(uri, {
      headers: { "User-Agent": UA, Accept: "application/json,text/html;q=0.9,*/*;q=0.8" },
      redirect: "follow",
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const result = response.ok ? "ok"
      : response.status === 404 ? "not_found"
        : response.status === 403 ? "forbidden"
          : response.status === 429 ? "rate_limited" : "error";
    return {
      uri, checkedAt, result, status: response.status,
      contentType: response.headers.get("content-type") ?? null,
      byteSize: bytes.length,
      sha256: bytes.length > 0 ? sha256(bytes) : null,
      body: response.ok ? bytes.toString("utf8").slice(0, 4000) : "",
    };
  } catch (error) {
    return { uri, checkedAt, result: "error", status: null, contentType: null,
      byteSize: 0, sha256: null, body: "", error: String(error?.message ?? error) };
  }
}

async function main() {
  if (!PROVIDER) return done("Y04_ORIGIN_TRACE_HOLD");
  const pool = getNodePgPool();
  const catalogRows = await queryRows(
    `select catalog_entry_id::text as id, project_id::text as project_id,
            catalog_identifier, catalog_title
       from source.resource_catalog
      where provider=:'pr'
        ${TITLE ? "and catalog_title=:'t'" : ""}
        ${PROJECT_ID ? "and project_id=:'p'::uuid" : ""}
      order by created_at desc limit 1`,
    { p: PROJECT_ID ?? null, pr: PROVIDER, t: TITLE });
  if (catalogRows.length === 0) {
    out.reason = "该提供方还没有 Y02 目录条目，Y04 无 catalog_record_ref 可回溯";
    await pool.end();
    return done("Y04_ORIGIN_TRACE_HOLD");
  }
  const catalogEntryId = catalogRows[0].id;
  const projectId = PROJECT_ID ?? catalogRows[0].project_id;
  out.catalog_record_ref = catalogRows[0];
  const catalogNo = CATALOG_NO
    ?? (await queryRows(
      `select v.metadata->>'catalog_no' as catalog_no from source.source_versions v
         join source.sources s using(source_id)
        where s.provider=:'pr' and v.metadata->>'catalog_no' is not null
        order by v.retrieved_at desc limit 1`, { pr: PROVIDER }))[0]?.catalog_no
    ?? catalogRows[0].catalog_identifier;

  // 1) 真的查一遍：聚合检索入口 + 原馆记录页。
  const aggregator = await probe(AGGREGATOR_URL);
  const original = await probe(ORIGINAL_URL);
  out.probes = [aggregator, original].map(({ uri, result, status, contentType, sha256: digest, byteSize }) =>
    ({ uri, result, status, content_type: contentType, sha256: digest, byte_size: byteSize }));

  const hops = [
    { kind: "aggregator", uri: aggregator.uri, checked_at: aggregator.checkedAt,
      result: aggregator.result, http_status: aggregator.status,
      response_sha256: aggregator.sha256, note: "聚合检索入口（本次真实往返）" },
    { kind: "provider_catalog", uri: original.uri, checked_at: original.checkedAt,
      result: original.result, http_status: original.status,
      response_sha256: original.sha256, note: "原馆记录页（本次真实往返）" },
  ];

  // 权利三层分开：聚合元数据许可只证到聚合侧，数字副本权利本次没有读到证据就是 unknown。
  const rightsLayers = {
    aggregation_metadata_license: aggregator.result === "ok"
      ? { state: "observed", statement: "聚合侧检索结果为公开元数据；未据此推定图像许可",
        evidence_ref: { uri: aggregator.uri, checked_at: aggregator.checkedAt } }
      : { state: "unknown", statement: `聚合侧本次未能读取（${aggregator.result}）` },
    digital_copy_rights: { state: "unknown",
      statement: "本次未读到原馆对数字副本的动作许可，不得由聚合元数据许可推定" },
    holding_identity: original.result === "ok"
      ? { state: "observed", statement: "原馆记录页可查（本次真实往返）",
        evidence_ref: { uri: original.uri, checked_at: original.checkedAt } }
      : { state: "unknown" },
  };

  const input = {
    catalogEntryId,
    aggregatedRecord: { provider: "Japan Search（国立国会図書館）", record_uri: AGGREGATOR_URL,
      data_provider: PROVIDER, holding_field: null, license_field: null },
    originalProvider: { provider: PROVIDER, catalog_no: catalogNo ?? null, uri: ORIGINAL_URL },
    holdingRef: catalogNo ? { value: catalogNo, kind: "provider_catalog_no" } : {},
    hops, rightsLayers, checkedAt: new Date(),
  };

  // 2) 负例先跑：未回源却填馆藏身份、聚合许可复用为图像许可，都必须失败关闭。
  const negatives = [];
  try {
    deriveOriginalProviderTrace({ ...input, originalProvider: { provider: PROVIDER },
      holdingRef: { value: "WRONG-HOLDING", note: "捏造" } });
    negatives.push({ case: "unresolved_with_invented_holding", passed: false });
  } catch (error) {
    negatives.push({ case: "unresolved_with_invented_holding", passed: true,
      code: String(error.message) });
  }
  try {
    deriveOriginalProviderTrace({ ...input,
      rightsLayers: { ...rightsLayers,
        digital_copy_rights: { state: "licensed",
          evidence_ref: { uri: AGGREGATOR_URL, checked_at: new Date() } } } });
    negatives.push({ case: "aggregate_license_reused_as_image_rights", passed: false });
  } catch (error) {
    negatives.push({ case: "aggregate_license_reused_as_image_rights", passed: true,
      code: String(error.message) });
  }
  out.negatives = negatives;
  if (negatives.some((n) => !n.passed)) { await pool.end(); return done("Y04_ORIGIN_TRACE_HOLD"); }

  // 3) 正例：派生 + 经唯一写入口落库。
  const trace = deriveOriginalProviderTrace(input);
  out.derived = { origin_state: trace.origin_state, catalog_no: trace.original_provider.catalog_no,
    holding_state: trace.holding_ref.state, hops: trace.provenance.hops.length,
    chain_complete: trace.provenance.chain_complete };

  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  const workerUrl = process.env.MOHEN_PRIVATE_WORKER_DATABASE_URL;
  if (typeof secret !== "string" || !secret || !workerUrl) {
    out.reason = "MOHEN_DATABASE_SESSION_SECRET / MOHEN_PRIVATE_WORKER_DATABASE_URL 未配置";
    await pool.end();
    return done("Y04_ORIGIN_TRACE_HOLD");
  }
  const { createPrivateWorkerPool, assertPrivateWorkerIdentity } = await import(
    "../packages/data-access/src/private-worker-pool.mjs");
  const workerPool = await createPrivateWorkerPool(workerUrl,
    process.env.MOHEN_DATABASE_CA_CERT ? { ca: process.env.MOHEN_DATABASE_CA_CERT } : undefined);
  await assertPrivateWorkerIdentity(workerPool);
  const discovery = createSourceDiscoveryRepository({ query: (text, values) => workerPool.query(text, values) });
  const saved = await discovery.recordProviderTrace({ projectId,
    catalogEntryId: trace.catalog_entry_id, originState: trace.origin_state,
    aggregatedRecord: trace.aggregated_record, originalProvider: trace.original_provider,
    holdingRef: trace.holding_ref, rightsLayers: trace.rights_layers,
    provenance: trace.provenance, checkedAt: trace.checked_at,
    methodKey: trace.method.key, methodVersion: trace.method.version, producedBy: "Y04" });
  out.written = saved;

  // 4) 回读：以工人角色读回来，确认这次回溯真的落成了可追的链。
  const back = await workerPool.query(
    `select origin_state, original_provider->>'catalog_no' as catalog_no,
            jsonb_array_length(provenance->'hops') as hops,
            provenance->>'chain_complete' as chain_complete,
            rights_layers ? 'digital_copy_rights' as has_copy_layer, checked_at
       from source.original_provider_traces where trace_id=$1::uuid`, [saved.trace_id]);
  out.read_back = back.rows[0] ?? null;
  // 5) 追加不可改写：列级授权与 RLS 都不给 UPDATE，库内触发器再兜一层。
  //    库里报错文本随实例语言变化（本机是中文），因此按 SQLSTATE 判定，并最终以
  //    "回读到的行有没有被改"为准，而不是匹配某句文案。
  let mutationAttempt = "rejected";
  try {
    const updated = await workerPool.query(
      `update source.original_provider_traces set origin_state='RESOLVED'
        where trace_id=$1::uuid returning trace_id`, [saved.trace_id]);
    if (updated.rows.length > 0) mutationAttempt = "applied";
    out.mutation_probe = { rows: updated.rows.length };
  } catch (error) {
    const code = String(error?.code ?? "");
    out.mutation_probe = { sqlstate: code, error: String(error?.message ?? error) };
    // 42501=权限不足，P0001=库内 raise（append-only 触发器）。
    mutationAttempt = code === "42501" || code === "P0001" ? "rejected" : "unknown_error";
  }
  const afterMutation = await workerPool.query(
    `select origin_state, checked_at from source.original_provider_traces where trace_id=$1::uuid`,
    [saved.trace_id]);
  const mutationBlocked = mutationAttempt !== "applied" && afterMutation.rows.length === 1;
  out.append_only = mutationBlocked;
  out.mutation_attempt = mutationAttempt;

  const ok = !!out.read_back && mutationBlocked
    && out.read_back.hops === trace.provenance.hops.length
    && out.read_back.has_copy_layer === true
    && negatives.every((n) => n.passed);
  if (trace.origin_state === "RESOLVED") out.checks.resolved_with_catalog_no_and_hops = true;
  await pool.end();
  await workerPool.end();
  done(ok ? "Y04_ORIGIN_TRACE_PROVEN" : "Y04_ORIGIN_TRACE_HOLD");
}

main().catch(async (error) => {
  out.error = String(error?.message ?? error);
  try { await getNodePgPool().end(); } catch { /* 已关闭 */ }
  done("Y04_ORIGIN_TRACE_HOLD");
});
