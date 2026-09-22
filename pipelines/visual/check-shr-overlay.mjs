// pipelines/visual/check-shr-overlay.mjs — TASK-0008 WP-A 自检
//
// 为什么需要它：`evidence.region_json.human_review`（SHR-01/03/04/05 的生效状态）**不是自持的**。
// 该行 region_json 的权威写入方是 `pipelines/ingest/retrieve-amap-jinze.mjs`，它建证据时用的是
// `on conflict (evidence_id) do update set region_json = excluded.region_json` —— **整体覆盖**。
// 于是任何一次该管线的重跑（包括 `tests/data/spatial-grounding.test.ts` 用例内的重跑、
// 以及 `--from-raw` 离线重放）都会把人工叠加层整块抹掉，且**不报错**：
// 对象静默退回 `ambiguous`，`effective_precision_status` 消失，下游据此重新"看不见"人审裁决。
//
// 本脚本把这种静默失败变成**显式失败**：叠加层缺失 → 非零退出，并打印修复命令。
//
// 用法：node pipelines/visual/check-shr-overlay.mjs

import { pathToFileURL } from "node:url";

const { queryRows } = await import(
  pathToFileURL(
    "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0/packages/data-access/src/index.mjs"
  ).href
);

// 这 4 个对象由 SHR-01/03/04/05 裁决，必须有 human_review 叠加层；SHR-06 不落到对象行上。
const EXPECTED = [
  { placeHint: "颐浩寺遗址", shr: "SHR-01", effective: "approximate_object_area" },
  { placeHint: "如意桥", shr: "SHR-03", effective: "official_or_provider_object_point" },
  { placeHint: "天皇阁桥", shr: "SHR-04", effective: "official_or_provider_object_point" },
  { placeHint: "金泽放生桥", shr: "SHR-05", effective: "official_or_provider_object_point" },
];

async function main() {
  const rows = await queryRows(
    `select place_hint,
            region_json->'human_review'->>'effective_precision_status' eff,
            region_json->'human_review'->>'shr_code' shr,
            region_json->'human_review'->'accepted_point'->>'location_raw' pt
       from evidence
      where extraction_method like 'spatial_anchor%'`
  );
  const byHint = {};
  for (const r of rows) byHint[r.place_hint] = r;

  const missing = [];
  const mismatched = [];
  for (const e of EXPECTED) {
    const r = byHint[e.placeHint];
    if (!r) { missing.push(`${e.placeHint}（证据行不存在）`); continue; }
    if (!r.eff) { missing.push(`${e.placeHint}（无 human_review 叠加层）`); continue; }
    if (r.eff !== e.effective) mismatched.push(`${e.placeHint}: 期望 ${e.effective}，实得 ${r.eff}`);
    if (r.shr !== e.shr) mismatched.push(`${e.placeHint}: 叠加层标注 ${r.shr}，期望 ${e.shr}`);
  }

  // 同样检查 SHR-04 的名称异写（与空间叠加层同一风险面：都可能被别处覆盖）
  const nv = await queryRows(
    `select canonical_name, aliases from entities where legacy_id = 'hushang-jingwei:entity:JZ-BLD-007'`
  );
  const aliasOk = nv.length === 1 && String(nv[0].aliases || "").includes("天王阁桥");
  const canonicalOk = nv.length === 1 && nv[0].canonical_name === "天皇阁桥";

  const ok = missing.length === 0 && mismatched.length === 0 && aliasOk && canonicalOk;
  console.log(JSON.stringify({
    ok,
    expected_rows: EXPECTED.length,
    missing,
    mismatched,
    shr04_name_variant: { canonical_name_kept: canonicalOk, alias_present: aliasOk },
    fix_hint: ok ? null : "node pipelines/visual/persist-spatial-review.mjs",
  }, null, 1));

  if (!ok) {
    console.error("SHR OVERLAY CHECK FAILED —— 人工裁决叠加层缺失或被覆盖（见 fix_hint）。");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("SHR OVERLAY CHECK ERROR:", e.message);
  process.exit(1);
});
