// pipelines/review/persist-human-review.mjs — TASK-0005 WP-A
//
// 把 HR-1~HR-6（用户已冻结的人审决策）以可审计方式落库到 human_review_decisions。
// 设计要点（Task §4 / §13）：
//   - hr_code 唯一，on conflict do update —— 幂等、可重跑。
//   - decision_code 是「用户编辑决策 A/B/C」，与 Data Factory Tier A/B/C 完全不同义，
//     因此独立成表，不写入 review_queue.review_tier（避免语义混淆）。
//   - machine_readable_flags 承载 legend / pending / conflict / excluded 等机器可读语义。
//   - HR-5：把本批 20 张 visual_assets（source_records.provider=wikimedia-commons）打上
//     eligibility_tags='excluded_from_heritage_primary'，使其不得进入 heritage-primary selection。
//   - 不修改 Legacy；不写任何 verified 历史事实。
//
// 落库后生成 data/exports/jinze-human-review-decision-log.md（交付物之一）。

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";

const PROJECT_ROOT = "D:/work Buddy/2026-08-23-23-12-38/mohen-agent-2.0";
const REVIEWED_AT = "2026-09-22T01:20:00+08:00"; // 人审冻结时间（TASK-0005 用户确认）

// —— HR-1~HR-6 冻结语义（以 Task §0 为准，不自行重解释）——
const HR = [
  {
    hr_code: "HR-1",
    decision_code: "A",
    decision_label: "采纳 Wikidata Q10918454 为吕颐浩外部身份锚点（仅确认人物同一性）",
    object_type: "entity",
    object_ref: "JZ-PPL-001",
    review_note:
      "用户确认采纳 Wikidata Q10918454（宋宰相吕颐浩，1071-1139）作为 JZ-PPL-001 的外部同一性锚点。" +
      "仅确认『同一历史人物』身份，不自动证明其与金泽/颐浩寺的全部历史关系（关联地单向、外部未证实）。",
    status_after: "candidate",
    machine_readable_flags: {
      external_identity_anchor: "Q10918454",
      relation_to_jinze: "unproven",
      auto_merge_with_family_person_stub: false,
    },
    source_refs: ["Wikidata Q10918454", "Legacy JZ-PPL-001"],
  },
  {
    hr_code: "HR-2",
    decision_code: "A",
    decision_label: "赵孟頫 ↔ 颐浩寺保留为传说关联，显式标记 legend/tradition，不得升为 verified fact",
    object_type: "relation",
    object_ref: "JZ-PPL-002 -> JZ-BLD-008",
    review_note:
      "用户确认赵孟頫 ↔ 颐浩寺（『不断云』石刻等）属传说性质，保留为 legend/tradition 展示。" +
      "机器可读 machine_readable_flags.legend=true，下游不得将其当作 verified historical fact 生成语义关系或叙事结论。",
    status_after: "legend",
    machine_readable_flags: { legend: true, tradition: true, verified_fact: false },
    source_refs: ["Legacy JZ-PPL-002", "Legacy JZ-BLD-008"],
  },
  {
    hr_code: "HR-3",
    decision_code: "C",
    decision_label: "暂不确认『四十二虹桥↔今存七桥』为同概念集合，不批量生成 part_of，保持 pending/research",
    object_type: "relation",
    object_ref: "'四十二虹桥' -> 今存七桥 · 古今叠影 (JZ-OVL-002)",
    review_note:
      "用户确认暂不把『四十二虹桥』古今叠影实体与今存七桥/古桥群视为同一概念集合。" +
      "禁止批量生成 predicate=part_of 的语义关系；现有 crossLink 保持 structural，等待后续再次审核。",
    status_after: "research",
    machine_readable_flags: {
      pending: true,
      batch_part_of: "blocked",
      same_concept_set: "unconfirmed",
    },
    source_refs: ["Legacy JZ-OVL-002"],
  },
  {
    hr_code: "HR-4",
    decision_code: "B",
    decision_label: "吕颐浩 ↔ 颐浩寺（创建/故宅）降级为『据方志记载』candidate，取得 S1 原文前不得升为无条件历史事实",
    object_type: "relation",
    object_ref: "JZ-PPL-001 -> JZ-BLD-008",
    review_note:
      "用户确认吕颐浩 ↔ 颐浩寺『就故宅创建、寺名取自其人』只作『据方志/地方文献记载』的 candidate 表述。" +
      "属二手转述，未见原始碑刻/方志影印前不得升级为无条件历史事实；本 Task 用 S1 检索验证『方志确有记载』但仅到 candidate 级。",
    status_after: "candidate",
    machine_readable_flags: {
      candidate: true,
      basis: "according_to_local_gazetteer",
      verified_fact: false,
      requires_s1_original: true,
    },
    source_refs: ["Legacy JZ-BLD-008", "Legacy JZ-PPL-001"],
  },
  {
    hr_code: "HR-5",
    decision_code: "A",
    decision_label: "本批 20 张视觉资产移出遗产主视图，仅保留真实 provenance，不得作遗产对象历史状态证据",
    object_type: "visual_asset",
    object_ref: "visual_asset:batch-20",
    review_note:
      "用户确认本批 20 张视觉资产（19 张高铁照片 + 1 张 CADAL 书影）不描绘任何遗产对象，" +
      "移出 heritage-primary selection，仅可作『当代金泽（高铁时代）』素材。其真实 provenance 保留；" +
      "不得作为遗产对象历史状态证据。DB 侧通过 visual_assets.eligibility_tags='excluded_from_heritage_primary' 落实。",
    status_after: "excluded",
    machine_readable_flags: {
      excluded_from_heritage_primary: true,
      eligible_as_contemporary_material: true,
      usable_as_historical_evidence: false,
    },
    source_refs: ["Wikimedia Commons imageinfo (20)", "TASK-0004 visual provenance"],
  },
  {
    hr_code: "HR-6",
    decision_code: "C",
    decision_label: "赵孟頫生年冲突（Legacy 1271 vs Wikidata 1254）不静默覆盖，保留冲突记录，取得权威证据后再纠错",
    object_type: "entity",
    object_ref: "JZ-PPL-002",
    review_note:
      "用户确认赵孟頫生年冲突不静默覆盖：Legacy 记 1271，Wikidata Q197461 记 1254-1322。" +
      "保留冲突记录，取得权威传记/方志后再纠错。本 Task 用 S1（人名规范 kg/list）检索，但依决策仍保持 conflict=pending，不自动改 Legacy 值。",
    status_after: "research",
    machine_readable_flags: {
      conflict: true,
      conflicting_values: ["1271", "1254"],
      silent_override: "blocked",
    },
    source_refs: ["Legacy JZ-PPL-002", "Wikidata Q197461"],
  },
];

async function main() {
  // 1) 落库 6 条 HR 决策（幂等：hr_code 唯一，on conflict do update）
  const stmts = HR.map((h) => ({
    sql: `insert into human_review_decisions
            (hr_code, decision_code, decision_label, object_type, object_ref,
             review_note, reviewed_at, actor, status_after, machine_readable_flags, source_refs)
          values (:'hr_code',:'decision_code',:'decision_label',:'object_type',:'object_ref',
                  :'review_note',:'reviewed_at',:'actor',:'status_after',:'flags'::jsonb,:'src'::text[])
          on conflict (hr_code) do update set
            decision_code = excluded.decision_code,
            decision_label = excluded.decision_label,
            object_type = excluded.object_type,
            object_ref = excluded.object_ref,
            review_note = excluded.review_note,
            reviewed_at = excluded.reviewed_at,
            actor = excluded.actor,
            status_after = excluded.status_after,
            machine_readable_flags = excluded.machine_readable_flags,
            source_refs = excluded.source_refs`,
    params: {
      hr_code: h.hr_code,
      decision_code: h.decision_code,
      decision_label: h.decision_label,
      object_type: h.object_type,
      object_ref: h.object_ref,
      review_note: h.review_note,
      reviewed_at: REVIEWED_AT,
      actor: "user-confirmed",
      status_after: h.status_after,
      flags: JSON.stringify(h.machine_readable_flags),
      src: `{${h.source_refs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")}}`,
    },
  }));
  await runMany(stmts);

  // 2) HR-5 落地：本批 20 张 visual_assets（file_path 指向 upload.wikimedia.org，即 TASK-0004 的
  //    provider_label_mismatch 资产）打 excluded_from_heritage_primary 标记。
  //    注：这些资产的 source_id 仍指向 Legacy provider=hushang-jingwei 来源记录（TASK-0004 §5），
  //    故按 file_path 精确识别本批 20 张，而非按 source_records.provider。
  const tagged = await run(
    `update visual_assets
       set eligibility_tags = array_append(eligibility_tags, 'excluded_from_heritage_primary')
       where (file_path ilike '%upload.wikimedia.org%' or file_path ilike '%commons.wikimedia%')
         and not (eligibility_tags && array['excluded_from_heritage_primary'])`
  );
  const taggedCount = await queryValue(
    `select count(*) from visual_assets where eligibility_tags && array['excluded_from_heritage_primary']`
  );

  // 3) 回读校验
  const rows = await queryRows(
    `select hr_code, decision_code, status_after, actor,
            machine_readable_flags::text as flags
       from human_review_decisions order by hr_code`
  );

  // 4) 生成交付物 decision-log.md
  const md = buildDecisionLog(rows);
  const outPath = path.join(PROJECT_ROOT, "data", "exports", "jinze-human-review-decision-log.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, "utf8");

  console.log(
    JSON.stringify({
      decision_rows: rows.length,
      hr_codes: rows.map((r) => r.hr_code).join(","),
      visual_assets_tagged_excluded: Number(taggedCount),
      decision_log_written: outPath,
    })
  );
}

function buildDecisionLog(rows) {
  const byCode = Object.fromEntries(rows.map((r) => [r.hr_code, r]));
  const L = [];
  L.push("# 金泽样板 · 人审决策落库日志（TASK-0005 / WP-A）");
  L.push("");
  L.push("> 状态：**已落库（human_review_decisions，6 条，hr_code 唯一、幂等可重跑）**");
  L.push("> 冻结依据：TASK-0005 §0 用户已确认 HR-1=A / HR-2=A / HR-3=C / HR-4=B / HR-5=A / HR-6=C。");
  L.push("> 人审时间：" + REVIEWED_AT + " · actor=user-confirmed。");
  L.push("");
  L.push("## 0. 红线（落库语义纪律）");
  L.push("");
  L.push("- `decision_code`（A/B/C）是**用户的编辑决策代码**，与 Data Factory `review_queue.review_tier`（A/B/C）**完全不同义**，故独立建表，不写入 review_tier，避免混淆。");
  L.push("- `machine_readable_flags` 承载 legend / pending / conflict / excluded 等机器可读语义，供下游（Knowledge Weave / 视觉选择 / 关系生成）直接消费。");
  L.push("- HR-3 / HR-6 即便已人工审核，仍为 **pending / research**，不代表 verified。");
  L.push("- HR-2 legend 必须保持 legend，不得升为 verified historical fact。");
  L.push("- HR-5 影响视觉使用资格：本批 20 张资产 `eligibility_tags` 含 `excluded_from_heritage_primary`，不得进入 heritage-primary selection。");
  L.push("");
  L.push("## 1. 六项决策明细");
  L.push("");
  for (const h of HR) {
    const r = byCode[h.hr_code] || {};
    L.push(`### ${h.hr_code} = ${h.decision_code} —— ${h.object_type}:${h.object_ref}`);
    L.push("");
    L.push("- **决策含义**：" + h.decision_label);
    L.push("- **落库状态(status_after)**：" + h.status_after);
    L.push("- **actor**：user-confirmed · **reviewed_at**：" + REVIEWED_AT);
    L.push("- **review_note**：" + h.review_note);
    L.push("- **machine_readable_flags**：`" + JSON.stringify(h.machine_readable_flags) + "`");
    L.push("- **source_refs**：" + h.source_refs.join("；"));
    L.push("");
  }
  L.push("## 2. 审计校验（DB 回读）");
  L.push("");
  L.push("| hr_code | decision_code | status_after | actor | machine_readable_flags |");
  L.push("|---|---|---|---|---|");
  for (const r of rows) {
    L.push(`| ${r.hr_code} | ${r.decision_code} | ${r.status_after} | ${r.actor} | \`${r.flags}\` |`);
  }
  L.push("");
  L.push("## 3. HR-5 视觉资格落地");
  L.push("");
  L.push("本批 20 张视觉资产（file_path 指向 upload.wikimedia.org，即 TASK-0004 的 provider_label_mismatch 资产）已打 `eligibility_tags='excluded_from_heritage_primary'`，");
  L.push("下游 heritage-primary selection 查询必须 `where not (eligibility_tags && array['excluded_from_heritage_primary'])`。");
  L.push("");
  L.push("## 4. 可追溯性声明");
  L.push("");
  L.push("所有六项决策均可在 `human_review_decisions` 按 `hr_code` 唯一追溯；不修改任何既有 Evidence、不改 Legacy、不写 verified 历史事实。");
  return L.join("\n");
}

main().catch((e) => {
  console.error("PERSIST HR FAILED:", e.message);
  process.exit(1);
});
