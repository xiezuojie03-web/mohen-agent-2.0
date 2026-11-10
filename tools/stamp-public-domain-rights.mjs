#!/usr/bin/env node
// Owner 裁决 A（2026-11-10）：把**已核验版权状态**的公有领域来源写成显式权利。
//
// 背景：M5 真实作品的 G0 对象 `source.source_versions b0a11000-…-0005` 因 CP2-C
// 冻结 rights_snapshot 后内容哈希变化，2026-11-09 被登记退休；而它的来源
// `source.sources b0a11000-…-0004`（松江府志7）`rights_by_action` 仍是空对象，
// 只有旧的 `public_domain_secondary_use` 自述。CP2-A/CP2-D 已删除该自述的推断旁路，
// 所以 G0 权利核验必然 HOLD，整链无法重签，WATCH 看不到真实作品。
//
// 本工具只处理**逐条核过证据**的公有领域来源：证据是维基共享资源文件页的
// `{{PD-old}}` 许可模板（作者逝世逾百年、著作权保护期届满）+ 著录信息 + 收藏机构
// item 链接。没有证据的来源一律不动，其余 provider 保持 HOLD。
//
// 做法：写入显式 `rights_by_action`（九动作全部 allowed，因为著作权已届满、
// 不存在许可方限制）+ `rights_evidence`（含出处、许可模板、核验日期、署名义务）；
// 并按 CP2-B 只对尚未写过的版本做**一次**不可变 `rights_snapshot` 写入。
//
// 幂等：重复运行写同一内容；已存在**不同**非空许可的来源报冲突并跳过，不覆盖。
// 默认只报告，加 --apply 才写库。

import { queryRows, run } from "../packages/data-access/src/index.mjs";
import { decideRightsActions, RIGHTS_ACTIONS } from "../packages/data-access/src/rights-actions.mjs";

const PROVIDER = "国立公文书馆(NAJ)";

// 九动作全部 allowed：PD-old 表示著作权保护期届满，无许可方可限制任何使用。
// 署名是**义务**而非限制，写进 obligations，不影响动作判定。
const GRANTED_ACTIONS = [...RIGHTS_ACTIONS];

const TARGETS = [
  {
    source_id: "b0a11000-0000-4000-8000-000000000004",
    title_zh: "松江府志7",
    evidence: {
      schema: "mohen.rights-evidence.v1",
      basis: "public_domain_expired_copyright",
      license_template: "PD-old",
      license_meaning:
        "Wikimedia Commons PD-old: author died more than 100 years ago; copyright expired, no permission required.",
      work: {
        title: "Songjiang Fu Zhi (松江府志), volume 7",
        author: "Guo Tingbi (郭廷弼), Qing dynasty",
        edition: "block-printed edition, preface dated Kangxi 2 (1663)",
        language: "zh",
        accession_number: "NAJDA-292-0017",
      },
      references: [
        {
          kind: "wikimedia_commons_file",
          page_title: "File:NAJDA-292-0017 松江府志7.pdf",
          page_id: 93466029,
          url: "https://commons.wikimedia.org/wiki/File:NAJDA-292-0017_%E6%9D%BE%E6%B1%9F%E5%BA%9C%E5%BF%977.pdf",
          license_template: "PD-old",
          verified_at: "2026-11-10",
        },
        {
          kind: "holding_institution_item",
          institution: "National Archives of Japan",
          url: "https://www.digital.archives.go.jp/item/4252790",
          verified_at: "2026-11-10",
        },
      ],
      granted_actions: GRANTED_ACTIONS,
      held_actions: [],
      obligations: [
        {
          kind: "credit",
          text: "Credit the holding institution and the digital source: National Archives of Japan (NAJDA-292-0017), via Wikimedia Commons.",
        },
      ],
      owner_decision: {
        decision: "A",
        decided_at: "2026-11-10",
        scope: "M5 real-work consumption, local isolated environment",
        note: "Only for sources with verified public-domain evidence; other providers stay HOLD.",
      },
      recorded_by: "tools/stamp-public-domain-rights.mjs",
    },
  },
];

const targetRights = Object.fromEntries(GRANTED_ACTIONS.map((action) => [action, "allowed"]));

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
  const conflicts = [];
  const planned = [];
  const pinnedSnapshots = [];

  for (const target of TARGETS) {
    const rows = await queryRows(
      `select source_id::text as source_id, provider, title,
          rights_by_action::text as rights_by_action,
          (select count(*) from source.source_versions v where v.source_id = s.source_id) as versions
        from source.sources s where s.source_id = (:'id')::uuid`,
      { id: target.source_id }
    );
    const row = rows[0];
    if (!row) {
      conflicts.push({ source_id: target.source_id, reason: "source_not_found" });
      continue;
    }
    if (String(row.provider) !== PROVIDER) {
      conflicts.push({ source_id: target.source_id, reason: "provider_mismatch", provider: row.provider });
      continue;
    }
    const current = parseJson(row.rights_by_action);
    if (current === null) {
      conflicts.push({ source_id: target.source_id, reason: "rights_by_action_unparsable" });
      continue;
    }
    if (Object.keys(current).length > 0 && canonical(current) !== canonical(targetRights)) {
      conflicts.push({ source_id: target.source_id, reason: "existing_rights_differ", existing: current });
      continue;
    }
    planned.push({ ...target, versions: Number(row.versions ?? 0) });
  }

  let snapshotsFrozen = 0;
  if (apply) {
    for (const target of planned) {
      await run(
        `update source.sources
          set rights_by_action = (:'rights')::jsonb, rights_evidence = (:'evidence')::jsonb
          where source_id = (:'id')::uuid`,
        {
          id: target.source_id,
          rights: JSON.stringify(targetRights),
          evidence: JSON.stringify(target.evidence),
        }
      );
      // CP2-B 不可变权利快照：只写尚未写过（'{}'）的版本，写完即冻结。
      // 例外：经 `mab.private-text-reading` / `mab.private-scanned-page-reading` 读过的版本
      // 被 `private_text_reading_immutable` 触发器整体钉死（内容与元数据都不许改），
      // 这类版本**无法**写快照，逐条如实记 pinned，不绕过触发器。
      await run(
        `update source.source_versions set rights_snapshot = (:'rights')::jsonb
          where source_id = (:'id')::uuid and rights_snapshot = '{}'::jsonb`,
        { id: target.source_id, rights: JSON.stringify(targetRights) }
      ).catch((error) => {
        const message = String(error?.message ?? error);
        if (!message.includes("PRIVATE_READING_IMMUTABLE")) throw error;
        pinnedSnapshots.push({ source_id: target.source_id, reason: "PRIVATE_READING_IMMUTABLE" });
      });
      // 触发器按行触发，整条 update 会一起回滚，所以再逐版本补写未被钉住的那些。
      const versions = await queryRows(
        `select source_version_id::text as id from source.source_versions
          where source_id = (:'id')::uuid and rights_snapshot = '{}'::jsonb`,
        { id: target.source_id }
      );
      for (const version of versions) {
        await run(
          `update source.source_versions set rights_snapshot = (:'rights')::jsonb
            where source_version_id = (:'id')::uuid and rights_snapshot = '{}'::jsonb`,
          { id: version.id, rights: JSON.stringify(targetRights) }
        ).catch((error) => {
          const message = String(error?.message ?? error);
          if (!message.includes("PRIVATE_READING_IMMUTABLE")) throw error;
          pinnedSnapshots.push({ source_version_id: version.id, reason: "PRIVATE_READING_IMMUTABLE" });
        });
      }
      const frozen = await queryRows(
        `select count(*)::int as n from source.source_versions
          where source_id = (:'id')::uuid and rights_snapshot <> '{}'::jsonb`,
        { id: target.source_id }
      );
      snapshotsFrozen += Number(frozen[0]?.n ?? 0);
    }
  }

  // 回读校验：只能用词典判定，不看自家写入。
  // 被私读钉死的版本（`PRIVATE_READING_IMMUTABLE`）在库里是**可查事实**，不从本次
  // 写入的副作用推断——否则 dry-run 复跑会误报 HOLD（同一库状态必须给同一结论）。
  const verified = [];
  for (const target of TARGETS) {
    const rows = await queryRows(
      `select rights_by_action::text as rights_by_action,
          (select count(*)::int from source.source_versions v
            where v.source_id = s.source_id and v.rights_snapshot <> '{}'::jsonb) as frozen,
          (select count(*)::int from source.source_versions v
            where v.source_id = s.source_id and v.rights_snapshot = '{}'::jsonb
              and exists (select 1 from source.read_runs r join source.raw_items raw using(raw_item_id)
                where raw.source_version_id = v.source_version_id
                  and r.config->>'schema' in ('mab.private-text-reading.v1','mab.private-scanned-page-reading.v1'))) as pinned,
          (select count(*)::int from source.source_versions v
            where v.source_id = s.source_id and v.rights_snapshot = '{}'::jsonb
              and not exists (select 1 from source.read_runs r join source.raw_items raw using(raw_item_id)
                where raw.source_version_id = v.source_version_id
                  and r.config->>'schema' in ('mab.private-text-reading.v1','mab.private-scanned-page-reading.v1'))) as unfrozen_writable
        from source.sources s where source_id = (:'id')::uuid`,
      { id: target.source_id }
    );
    const row = rows[0];
    if (!row) {
      verified.push({ source_id: target.source_id, ok: false, reason: "source_not_found" });
      continue;
    }
    const rights = parseJson(row.rights_by_action) ?? {};
    const outcome = decideRightsActions(rights, GRANTED_ACTIONS);
    const frozenVersions = Number(row.frozen ?? 0);
    const pinnedVersions = Number(row.pinned ?? 0);
    const unfrozenWritable = Number(row.unfrozen_writable ?? 0);
    verified.push({
      source_id: target.source_id,
      granted_ok: outcome.ok,
      granted_reasons: outcome.reasons,
      frozen_versions: frozenVersions,
      pinned_versions: pinnedVersions,
      unfrozen_writable_versions: unfrozenWritable,
      // 成功口径：九动作显式允许 + 每个版本要么已冻结、要么被私读钉死不许改。
      ok: outcome.ok && (frozenVersions >= 1 || pinnedVersions >= 1) && unfrozenWritable === 0,
    });
  }

  const others = await queryRows(
    `select provider, count(*) as sources,
        count(*) filter (where rights_by_action <> '{}'::jsonb) as with_actions
      from source.sources where provider <> :'provider' group by provider order by provider`,
    { provider: PROVIDER }
  );

  const passed = verified.every((item) => item.ok) && conflicts.length === 0;
  const summary = {
    status: passed ? "PUBLIC_DOMAIN_RIGHTS_STAMPED" : "PUBLIC_DOMAIN_RIGHTS_HOLD",
    applied: apply,
    provider: PROVIDER,
    targets: TARGETS.map((target) => ({ source_id: target.source_id, title: target.title_zh })),
    granted_actions: GRANTED_ACTIONS,
    changes: apply ? planned.length : 0,
    snapshots_frozen: apply ? snapshotsFrozen : 0,
    pinned_snapshots: pinnedSnapshots,
    conflicts,
    verified,
    other_providers_hold: others.map((row) => ({
      provider: row.provider,
      sources: Number(row.sources),
      with_actions: Number(row.with_actions),
      decision: "HOLD_NO_VERIFIED_PD_EVIDENCE",
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  console.log(JSON.stringify({ status: "PUBLIC_DOMAIN_RIGHTS_STAMP_FAILED", error: String(error?.message ?? error) }));
  process.exitCode = 1;
});
