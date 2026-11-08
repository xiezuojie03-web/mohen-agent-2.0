#!/usr/bin/env node
// CP2-C / QR-04：把 Owner 的授权**只**落到上海图书馆开放数据集（含同平台合作单位）。
//
// Owner 裁定（2026-11-08，有效）：上海图书馆开放数据集（data1.library.sh.cn 及其同一
// 开放平台的合作单位数据）是本项目唯一明确授权的来源。其他 provider 权利未明确，
// 本工具**绝不改写**它们，只列出 HOLD 清单。
//
// 写法（显式、可审计）：
//   access_view / machine_read / retain / quote = allowed
//     —— 内部研究需要"看、机器读、存副本、引用"四项，已由 Owner 授权覆盖。
//   display / download / adapt / redistribute / external_processing = unknown
//     —— 对外展示、对外下载、改编、再分发、发给外部模型都需要 Owner 另行明示，保持 HOLD。
//
// 幂等：重复运行写入同一内容；已存在**不同**非空许可的来源会报冲突并跳过，不覆盖。
// 默认只报告，加 --apply 才写库。

import { queryRows, run } from "../packages/data-access/src/index.mjs";
import { decideRightsActions, RIGHTS_ACTIONS } from "../packages/data-access/src/rights-actions.mjs";

const PROVIDER = "shanghai-library";
const ALLOWED_ACTIONS = ["access_view", "machine_read", "retain", "quote"];
const HELD_ACTIONS = ["display", "download", "adapt", "redistribute", "external_processing"];

// 权利证据（ASCII，避免控制台多字节编码问题；可追溯 Owner 决定与范围）。
const RIGHTS_EVIDENCE = {
  schema: "mohen.rights-evidence.v1",
  basis: "owner_authorization",
  owner_decision_at: "2026-11-08",
  scope: "project_internal_research",
  dataset: "Shanghai Library Open Data Platform (data1.library.sh.cn) incl. partner institutions",
  granted_actions: ALLOWED_ACTIONS,
  held_actions: HELD_ACTIONS,
  note: "Other providers and external_processing remain HOLD pending explicit owner decision.",
  recorded_by: "tools/stamp-shl-open-data-rights.mjs",
};

const targetRights = Object.fromEntries([
  ...ALLOWED_ACTIONS.map((action) => [action, "allowed"]),
  ...HELD_ACTIONS.map((action) => [action, "unknown"]),
]);

const canonical = (value) =>
  Array.isArray(value)
    ? "[" + value.map(canonical).join(",") + "]"
    : value !== null && typeof value === "object"
      ? "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"
      : JSON.stringify(value);

const parseJson = (value) => {
  if (value == null || value === "") return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

async function main() {
  const apply = process.argv.includes("--apply");

  const rows = await queryRows(
    `select source_id::text as source_id, provider, content_availability,
        rights_by_action::text as rights_by_action, rights_evidence::text as rights_evidence,
        (select count(*) from source.source_versions v where v.source_id = s.source_id) as versions
      from source.sources s where s.provider = :'provider' order by s.source_id`,
    { provider: PROVIDER }
  );

  if (!rows.length) {
    console.log(JSON.stringify({ status: "NO_MATCHING_SOURCE", provider: PROVIDER }));
    process.exitCode = 1;
    return;
  }

  const conflicts = [];
  const writable = [];
  for (const row of rows) {
    const current = parseJson(row.rights_by_action);
    if (current === null) {
      conflicts.push({ source_id: row.source_id, reason: "rights_by_action_unparsable" });
      continue;
    }
    const hasContent = Object.keys(current).length > 0;
    if (hasContent && canonical(current) !== canonical(targetRights)) {
      conflicts.push({ source_id: row.source_id, reason: "existing_rights_differ", existing: current });
      continue;
    }
    writable.push(row.source_id);
  }

  if (apply) {
    for (const sourceId of writable) {
      await run(
        `update source.sources
          set rights_by_action = (:'rights')::jsonb, rights_evidence = (:'evidence')::jsonb
          where source_id = (:'id')::uuid and provider = :'provider'`,
        {
          id: sourceId,
          provider: PROVIDER,
          rights: JSON.stringify(targetRights),
          evidence: JSON.stringify(RIGHTS_EVIDENCE),
        }
      );
    }
  }

  // 回读校验：许可必须真的可被词典判定为 allowed / unknown。
  const check = await queryRows(
    `select source_id::text as source_id, rights_by_action::text as rights_by_action
      from source.sources where provider = :'provider' order by source_id`,
    { provider: PROVIDER }
  );
  const verified = [];
  for (const row of check) {
    const rights = parseJson(row.rights_by_action) ?? {};
    const granted = decideRightsActions(rights, ALLOWED_ACTIONS);
    const held = decideRightsActions(rights, HELD_ACTIONS);
    verified.push({
      source_id: row.source_id,
      granted_ok: granted.ok,
      granted_reasons: granted.reasons,
      held_still_hold: !held.ok,
      held_reasons: held.reasons,
    });
  }
  const verificationPassed = verified.every((item) => item.granted_ok && item.held_still_hold);

  // 其他 provider 一律 HOLD，且不因本次运行改变。
  const others = await queryRows(
    `select provider, count(*) as sources,
        count(*) filter (where rights_by_action <> '{}'::jsonb) as with_actions
      from source.sources where provider <> :'provider' group by provider order by provider`,
    { provider: PROVIDER }
  );

  const summary = {
    status: verificationPassed && !conflicts.length ? "SHL_RIGHTS_STAMPED" : "SHL_RIGHTS_HOLD",
    provider: PROVIDER,
    applied: apply,
    sources: rows.length,
    versions_total: rows.reduce((sum, row) => sum + Number(row.versions ?? 0), 0),
    granted_actions: ALLOWED_ACTIONS,
    held_actions: HELD_ACTIONS,
    changes: apply ? writable.length : 0,
    conflicts,
    verified,
    other_providers_hold: others.map((row) => ({
      provider: row.provider,
      sources: Number(row.sources),
      with_actions: Number(row.with_actions),
      decision: "HOLD_NO_OWNER_AUTHORIZATION",
    })),
    dictionary_actions: [...RIGHTS_ACTIONS],
  };
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "SHL_RIGHTS_STAMPED") process.exitCode = 1;
}

main().catch((error) => {
  console.log(JSON.stringify({ status: "SHL_RIGHTS_STAMP_FAILED", error: String(error?.message ?? error) }));
  process.exitCode = 1;
});
