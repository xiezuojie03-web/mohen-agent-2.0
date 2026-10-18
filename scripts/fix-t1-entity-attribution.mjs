// scripts/fix-t1-entity-attribution.mjs
//
// T1 数据修复（2026-10-17）：把 read_model 的 story_seeds / agent_contexts / evidence_pointers
// 的 entities 字段从「全 7 实体」修正为「内容文本真正涉及的实体」——消除 Agent 检索「谁跟谁都命中」的无区分度。
//
// 性质：一次性、确定性、幂等；world_projections 不改（世界投影本就覆盖全体实体）。
// 红线：运行前由调用方执行 preflight pg_dump 备份（任务书 §六 6.1 真实写库已授权 + 备份惯例）。
// 只读 world.entities 作标签源；只 UPDATE read_model 三表的 entities 字段，不触碰其它列。

import { run, queryRows } from "../packages/data-access/src/index.mjs";

// 与 pipelines/data-production/adapters/layer1-adapters.mjs 保持同一套别名（T1 单一真源约定）
const ENTITY_MATCH_ALIASES = Object.freeze({
  "颐浩寺遗址": ["颐浩寺遗址", "颐浩寺"],
  "万安桥": ["万安桥", "万安"],
  "普济桥": ["普济桥", "普济"],
  "迎祥桥": ["迎祥桥"],
  "吕颐浩": ["吕颐浩"],
  "金泽": ["金泽"],
  "白苎里": ["白苎里"],
});

function entitiesForText(text, labels) {
  const hay = String(text ?? "");
  const hits = [];
  for (const label of labels) {
    const aliases = ENTITY_MATCH_ALIASES[label] ?? [label];
    if (aliases.some((a) => a && hay.includes(a))) hits.push(label);
  }
  return hits;
}

async function main() {
  const entities = await queryRows(`select canonical_label from world.entities order by created_at`);
  const labels = entities.map((e) => e.canonical_label);
  console.log(`实体标签（${labels.length}）：${labels.join("、")}`);

  // 1) story_seeds（payload.entities，按 statement）
  const seeds = await queryRows(`select story_seed_id::text as id, payload::text as payload from read_model.story_seeds`);
  for (const s of seeds) {
    const p = JSON.parse(s.payload || "{}");
    const hits = entitiesForText(p.statement, labels);
    if ((p.entities ?? "") === hits.join(" ")) continue;
    await run(`update read_model.story_seeds set payload = :'p'::jsonb where story_seed_id = :'id'::uuid`, {
      p: JSON.stringify({ ...p, entities: hits.join(" ") }),
      id: s.id,
    });
    console.log(`story_seed ${s.id.slice(0, 8)}: [${p.entities}] -> [${hits.join(" ")}]`);
  }

  // 2) agent_contexts（payload.entities，按 summary）
  const ctxs = await queryRows(`select agent_context_id::text as id, payload::text as payload from read_model.agent_contexts`);
  for (const c of ctxs) {
    const p = JSON.parse(c.payload || "{}");
    const hits = entitiesForText(p.summary, labels);
    if ((p.entities ?? "") === hits.join(" ")) continue;
    await run(`update read_model.agent_contexts set payload = :'p'::jsonb where agent_context_id = :'id'::uuid`, {
      p: JSON.stringify({ ...p, entities: hits.join(" ") }),
      id: c.id,
    });
    console.log(`agent_context ${c.id.slice(0, 8)}: [${p.entities}] -> [${hits.join(" ")}]`);
  }

  // 3) evidence_pointers（display_locator.entities，按 display_excerpt）
  const eps = await queryRows(
    `select evidence_pointer_id::text as id, display_excerpt as excerpt, display_locator::text as locator
     from read_model.evidence_pointers`
  );
  for (const e of eps) {
    const loc = JSON.parse(e.locator || "{}");
    const hits = entitiesForText(e.excerpt, labels);
    if ((loc.entities ?? "") === hits.join(" ")) continue;
    await run(`update read_model.evidence_pointers set display_locator = :'loc'::jsonb where evidence_pointer_id = :'id'::uuid`, {
      loc: JSON.stringify({ ...loc, entities: hits.join(" ") }),
      id: e.id,
    });
    console.log(`evidence_pointer ${e.id.slice(0, 8)}: [${loc.entities}] -> [${hits.join(" ")}]`);
  }

  console.log("T1 实体归属修复完成。");
}

main().catch((e) => {
  console.error("T1 修复失败：", e);
  process.exit(1);
});
