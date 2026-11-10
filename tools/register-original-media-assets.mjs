#!/usr/bin/env node
// 步骤①"原件入系统"（Owner 2026-11-10 批准的施工顺序第 1 步）。
//
// 目的：把**已经核验过字节**的私有原件页登记成媒资台账（public.assets）里的一条，
// 让作品能引用真实方志原件，而不是只有文字分镜或无关的今貌照片。
//
// 只登记同时满足下面全部条件的原件，其余逐条记 HOLD 原因：
//   1) studio.private_originals.state = STORED_VERIFIED（字节已回读核验）；
//   2) studio.private_source_registration(original) 能解析出 source / source_version /
//      raw_item 三元链（与 D00 回查同一函数，不另造第二套绑定判断）；
//   3) 来源的 rights_by_action 经统一九动作词典判定 display = allowed。
//      缺失 / unknown / restricted / denied 一律 HOLD——不猜、不补默认值、
//      不改写来源权利，也不从许可标签或来源类别推断。
//
// 幂等：以 original_id 唯一索引去重。已存在且内容一致 → 视为已登记；
// 已存在但内容不同 → 报冲突并跳过，不覆盖既有台账行。
//
// 默认只做只读演算，加 --apply 才写库。

import { createHmac } from "node:crypto";
import { getNodePgPool, queryRows, run } from "../packages/data-access/src/index.mjs";
import { decideRightsActions } from "../packages/data-access/src/rights-actions.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";

// 本地隔离 M5 项目（Owner 本人项目），原件都在这个项目下。
const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
const REQUIRED_ACTIONS = ["display"];
const REGISTERED_BY = "tools/register-original-media-assets.mjs";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

function makeToken(uid, secret) {
  const payload = Buffer.from(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 30000 })).toString("base64url");
  const sig = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  return `${payload}.${sig}`;
}

const parseJson = (value) => {
  if (value == null || value === "") return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

// 页码只能从已登记的文件名里取；取不到就如实留空，不推断页序。
function pageFromFileName(fileName) {
  const match = /(?:^|[-_])p0*(\d+)\.(?:jpe?g|png|tiff?)$/i.exec(String(fileName ?? ""));
  return match ? Number(match[1]) : null;
}

function pageLabel(fileName) {
  const page = pageFromFileName(fileName);
  return page === null ? "页码未登记" : `第${page}页`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
  if (typeof secret !== "string" || !secret) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");

  const pool = getNodePgPool();
  const registrations = createPrivateSourceRegistrationRepository(pool);

  const ownerRows = await queryRows(
    `select owner_user_id::text as owner_user_id, project_title
       from studio.projects where project_id = (:'id')::uuid`,
    { id: PROJECT_ID }
  );
  const owner = ownerRows[0];
  if (!owner) throw new Error("ORIGINAL_MEDIA_PROJECT_NOT_FOUND");
  const token = makeToken(owner.owner_user_id, secret);

  const originals = await queryRows(
    `select original_id::text as original_id, asset_id::text as asset_id,
            asset_revision_id::text as asset_revision_id, file_name, content_type,
            byte_size::bigint::text as byte_size, sha256, state
       from studio.private_originals
      where project_id = (:'id')::uuid and content_type like 'image/%'
      order by file_name`,
    { id: PROJECT_ID }
  );

  const candidates = [];
  const holds = [];
  const conflicts = [];

  for (const original of originals) {
    if (original.state !== "STORED_VERIFIED") {
      holds.push({ original_id: original.original_id, reason: "ORIGINAL_NOT_STORED_VERIFIED", state: original.state });
      continue;
    }
    let registration;
    try {
      registration = await registrations.lookup(original.original_id, token);
    } catch (error) {
      holds.push({ original_id: original.original_id, file_name: original.file_name,
        reason: "SOURCE_REGISTRATION_NOT_RESOLVED", detail: String(error?.message ?? error) });
      continue;
    }
    if (!registration || registration.sha256 !== original.sha256
      || Number(registration.byte_size) !== Number(original.byte_size)) {
      holds.push({ original_id: original.original_id, file_name: original.file_name,
        reason: "SOURCE_REGISTRATION_MISMATCH" });
      continue;
    }

    const sourceRows = await queryRows(
      `select provider, title, rights_by_action::text as rights_by_action,
              rights_evidence::text as rights_evidence
         from source.sources where source_id = (:'id')::uuid`,
      { id: registration.source_id }
    );
    const source = sourceRows[0];
    if (!source) {
      holds.push({ original_id: original.original_id, reason: "SOURCE_NOT_FOUND", source_id: registration.source_id });
      continue;
    }
    const rights = parseJson(source.rights_by_action);
    if (rights === null) {
      holds.push({ original_id: original.original_id, reason: "RIGHTS_BY_ACTION_UNPARSABLE" });
      continue;
    }
    // 台账里的权利只抄来源的**显式**判定结果，不给未许可的动作补值。
    const rightsByAction = {};
    for (const action of REQUIRED_ACTIONS) {
      const decision = decideRightsActions(rights, [action]);
      if (decision.ok) rightsByAction[action] = "allowed";
    }
    const outcome = decideRightsActions(rights, REQUIRED_ACTIONS);
    if (!outcome.ok) {
      holds.push({ original_id: original.original_id, file_name: original.file_name, source_id: registration.source_id,
        reason: "RIGHTS_NOT_ALLOWED", detail: outcome.reasons });
      continue;
    }

    const evidence = parseJson(source.rights_evidence) ?? {};
    const license = typeof evidence.license_template === "string" ? evidence.license_template : null;
    const author = typeof evidence?.work?.author === "string" ? evidence.work.author : null;
    const pageNo = pageFromFileName(original.file_name);
    const pageLocator = pageNo === null
      ? { schema: "mohen.page-locator.v1", page_no: null, derived_from: "file_name", file_name: original.file_name }
      : { schema: "mohen.page-locator.v1", page_no: pageNo, derived_from: "file_name", file_name: original.file_name };
    const title = `${source.title} · ${pageLabel(original.file_name)}`;
    const asset = {
      title,
      kind: "scan_page",
      license,
      author,
      intended_use: "M5真实作品·原件细读画面",
      status: "verified",
      original_id: original.original_id,
      source_id: registration.source_id,
      page_locator: pageLocator,
      content_sha256: original.sha256,
      rights_by_action: rightsByAction,
      rights: {
        schema: "mohen.media-rights.v1",
        basis: evidence.basis ?? null,
        license_template: license,
        evidence_ref: { source_id: registration.source_id, recorded_by: evidence.recorded_by ?? null,
          verified_at: evidence?.references?.[0]?.verified_at ?? null },
        obligations: Array.isArray(evidence.obligations) ? evidence.obligations : [],
        source_ref: { source_id: registration.source_id, source_version_id: registration.source_version_id,
          raw_item_id: registration.raw_item_id, original_id: original.original_id,
          asset_revision_id: original.asset_revision_id },
        registered_by: REGISTERED_BY,
      },
    };
    if (!license) {
      // 没有可核的许可模板就没有可出示的许可，台账不自己编一个。
      holds.push({ original_id: original.original_id, reason: "LICENSE_EVIDENCE_MISSING", source_id: registration.source_id });
      continue;
    }
    candidates.push({ asset, registration });
  }

  let inserted = 0;
  if (apply) {
    for (const { asset } of candidates) {
      const existing = await queryRows(
        `select asset_id::text as asset_id, title, license, status,
                content_sha256, source_id::text as source_id, page_locator::text as page_locator
           from public.assets where original_id = (:'original')::uuid`,
        { original: asset.original_id }
      );
      if (existing.length) {
        const row = existing[0];
        const same = row.title === asset.title && row.license === asset.license
          && row.content_sha256 === asset.content_sha256 && row.source_id === asset.source_id
          && row.status === asset.status;
        if (!same) conflicts.push({ original_id: asset.original_id, reason: "EXISTING_ASSET_DIFFERS", asset_id: row.asset_id });
        continue;
      }
      await run(
        `insert into public.assets
           (title, kind, source_url, license, author, rights, intended_use, ratio, status,
            original_id, source_id, page_locator, content_sha256, rights_by_action)
         values
           (:'title', :'kind', null, :'license', :'author', (:'rights')::jsonb, :'intended_use', null, :'status',
            (:'original')::uuid, (:'source')::uuid, (:'page_locator')::jsonb, :'content_sha256',
            (:'rights_by_action')::jsonb)`,
        {
          title: asset.title,
          kind: asset.kind,
          license: asset.license,
          author: asset.author,
          rights: JSON.stringify(asset.rights),
          intended_use: asset.intended_use,
          status: asset.status,
          original: asset.original_id,
          source: asset.source_id,
          page_locator: JSON.stringify(asset.page_locator),
          content_sha256: asset.content_sha256,
          rights_by_action: JSON.stringify(asset.rights_by_action),
        }
      );
      inserted += 1;
    }
  }

  // 回读校验：只认库里的事实，不看本次写入的副作用。
  const readBack = [];
  for (const { asset, registration } of candidates) {
    const rows = await queryRows(
      `select a.asset_id::text as asset_id, a.title, a.status, a.license,
              a.content_sha256, a.rights_by_action::text as rights_by_action,
              a.source_id::text as source_id,
              (select state from studio.private_originals o where o.original_id = a.original_id) as original_state,
              (select sha256 from studio.private_originals o where o.original_id = a.original_id) as original_sha256,
              (select count(*)::int from source.source_versions v
                 where v.source_id = a.source_id and v.rights_snapshot <> '{}'::jsonb) as frozen_versions
         from public.assets a where a.original_id = (:'original')::uuid`,
      { original: asset.original_id }
    );
    const row = rows[0];
    if (!row) {
      readBack.push({ original_id: asset.original_id, ok: false, reason: "NOT_REGISTERED_YET" });
      continue;
    }
    const displayOk = decideRightsActions(parseJson(row.rights_by_action) ?? {}, REQUIRED_ACTIONS).ok;
    readBack.push({
      original_id: asset.original_id,
      asset_id: row.asset_id,
      title: row.title,
      ok: displayOk && row.status === "verified" && row.original_state === "STORED_VERIFIED"
        && row.original_sha256 === row.content_sha256 && row.source_id === registration.source_id,
      display_allowed: displayOk,
      sha_matches_original: row.original_sha256 === row.content_sha256,
      frozen_source_versions: Number(row.frozen_versions ?? 0),
    });
  }

  const catalogue = await queryRows(
    `select count(*)::int as verified_assets,
            count(*) filter (where original_id is not null)::int as original_backed
       from public.assets where status = 'verified'`
  );

  const passed = apply
    ? conflicts.length === 0 && readBack.every((item) => item.ok) && candidates.length > 0
    : candidates.length > 0 && conflicts.length === 0;

  console.log(JSON.stringify({
    status: passed ? "ORIGINAL_MEDIA_ASSETS_REGISTERED" : "ORIGINAL_MEDIA_ASSETS_HOLD",
    applied: apply,
    project_id: PROJECT_ID,
    image_originals: originals.length,
    required_actions: REQUIRED_ACTIONS,
    registrable: candidates.map(({ asset }) => ({
      original_id: asset.original_id, title: asset.title, source_id: asset.source_id,
      license: asset.license, page_no: asset.page_locator.page_no,
      content_sha256: asset.content_sha256, rights_by_action: asset.rights_by_action,
    })),
    inserted,
    read_back: readBack,
    holds,
    conflicts,
    media_catalogue: {
      verified_assets: Number(catalogue[0]?.verified_assets ?? 0),
      original_backed: Number(catalogue[0]?.original_backed ?? 0),
    },
  }, null, 2));
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  console.log(JSON.stringify({ status: "ORIGINAL_MEDIA_ASSETS_FAILED", error: String(error?.message ?? error) }));
  process.exitCode = 1;
});
