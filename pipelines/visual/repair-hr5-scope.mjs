// pipelines/visual/repair-hr5-scope.mjs — TASK-0008 附带修复（跨任务缺陷）
//
// 背景（缺陷事实）：
//   `pipelines/review/persist-human-review.mjs` 的 HR-5 落地条件原为
//     file_path ilike '%upload.wikimedia.org%' or file_path ilike '%commons.wikimedia%'
//   语义是「**任何**托管在 Commons 的资产」。TASK-0005 落地时库内只有 HR-5 评审过的那 20 张，
//   两者恰好等价；但 TASK-0008 WP-C 之后，库内新增了 8 张同样托管在 Commons 的金泽古桥实景
//   （即 WP-E 的有效证据本体）。此后**只要重跑 TASK-0005 管线**，这 8 张就会被一并打上
//   `excluded_from_heritage_primary`，直接导致：
//     · `effective_visual_assets` 归零（WP-E 门槛被无声清零）；
//     · migration 006 的守卫拒绝为被排除资产建立 confirmed 链接（显式报错）。
//
// 本脚本只做**数据修复**（把被误标的资产还原），不改任何决策、不改任何证据、不删任何行：
//   范围：带 excluded 标记、但**不属于** HR-5 评审批次（source_records.provider='hushang-jingwei'）的资产。
//   动作：从 eligibility_tags 中移除 'excluded_from_heritage_primary'。
//   幂等：只处理「确实带标记且不在批次内」的行，重跑第二次命中 0 行。
//
// 用法：node pipelines/visual/repair-hr5-scope.mjs [--dry-run]

import { pathToFileURL } from "node:url";

const { run, queryRows } = await import(
  pathToFileURL(
    "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0/packages/data-access/src/index.mjs"
  ).href
);

const DRY = process.argv.includes("--dry-run");

// 目标行：带了排除标记，但来源记录不是 HR-5 评审的那一批 Legacy 来源。
const TARGET_SQL = `select va.asset_id::text asset_id, va.legacy_id, sr.provider,
                           va.eligibility_tags::text tags
                      from visual_assets va
                      left join source_records sr on sr.source_id = va.source_id
                     where va.eligibility_tags && array['excluded_from_heritage_primary']
                       and (sr.provider is distinct from 'hushang-jingwei')
                     order by va.legacy_id`;

async function main() {
  const before = {
    excluded_total: Number(
      Object.values((await queryRows(
        `select count(*)::int c from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']`
      ))[0])[0]
    ),
    batch_tagged: Number(
      Object.values((await queryRows(
        `select count(*)::int c from visual_assets va join source_records sr on sr.source_id=va.source_id
          where sr.provider='hushang-jingwei' and va.eligibility_tags && array['excluded_from_heritage_primary']`
      ))[0])[0]
    ),
    effective: Number(
      Object.values((await queryRows(`select count(*)::int c from effective_visual_assets`))[0])[0]
    ),
  };

  const targets = await queryRows(TARGET_SQL);

  if (!DRY && targets.length) {
    await run(
      `update visual_assets
          set eligibility_tags = (select array(select unnest(eligibility_tags) except select 'excluded_from_heritage_primary'))
        where asset_id::text in (select jsonb_array_elements_text(:'ids'::jsonb))`,
      { ids: JSON.stringify(targets.map((t) => t.asset_id)) }
    );
  }

  const after = {
    excluded_total: Number(
      Object.values((await queryRows(
        `select count(*)::int c from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']`
      ))[0])[0]
    ),
    batch_tagged: Number(
      Object.values((await queryRows(
        `select count(*)::int c from visual_assets va join source_records sr on sr.source_id=va.source_id
          where sr.provider='hushang-jingwei' and va.eligibility_tags && array['excluded_from_heritage_primary']`
      ))[0])[0]
    ),
    effective: Number(
      Object.values((await queryRows(`select count(*)::int c from effective_visual_assets`))[0])[0]
    ),
  };

  // 断言：HR-5 批次必须仍然完整被排除（修复不得放走任何一张该批资产）
  if (after.batch_tagged !== 20) {
    throw new Error(`修复越界：HR-5 批次被排除数 ${after.batch_tagged} != 20（不得改动该批标记）`);
  }

  const remaining = await queryRows(TARGET_SQL);

  console.log(JSON.stringify({
    dry_run: DRY,
    wrongly_tagged_before: targets.length,
    wrongly_tagged_after: remaining.length,
    before,
    after,
    repaired: targets.map((t) => ({ legacy_id: t.legacy_id, provider: t.provider })),
  }, null, 1));
}

main().catch((e) => {
  console.error("REPAIR HR5 SCOPE FAILED:", e.message);
  process.exit(1);
});
