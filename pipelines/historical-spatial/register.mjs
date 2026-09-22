// pipelines/historical-spatial/register.mjs
//
// TASK-0009 历史空间源登记管线（最小、可重跑、幂等）。
//
// 职责：把 _registration_manifest.json 的 source_records / evidence（地图候选 + 存在性证据）
// 写入本地 PG 真值库，并为每条 evidence 计算 G0–G6 门禁快照。
//
// 安全边界（§11 / §12）：
//  - 只写 source_records / evidence / evidence_gate_audit 三张表；
//  - 绝不写 relations / claims / visual_assets（不触发 Knowledge Weave，不触发 published 守卫）；
//  - extraction_method = 'historical_map_source_acquisition'（与 TASK-0007 的 amap/spatial 方法区分，
//    不影响既有 SPATIAL_METHOD 计数与 63 审计基线）；
//  - evidence.verification_status 恒为默认 'candidate'，绝不置 verified/published；
//  - 审计行 object_type='evidence'，不触碰 object_type='relation' 的孤儿审计（保持 63 不变）；
//  - 幂等：source_records 用 unique(provider,checksum) 去重；evidence/audit 用确定性 UUID + delete-then-insert。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";

const M = "historical_map_source_acquisition";

// 确定性 UUID v4（从 seed 字符串稳定派生，保证重跑幂等）
function deterministicUuid(seed) {
  const h = crypto.createHash("sha256").update(seed, "utf8").digest();
  const b = Buffer.from(h.slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return [
    hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
    hex.slice(16, 20), hex.slice(20, 32),
  ].join("-");
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const MANIFEST = path.resolve(
  "D:/MoHen/data/raw/historical-spatial/jinze/_registration_manifest.json"
);

async function main() {
  const man = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

  // ---- 不变式：登记前快照 ----
  const before = {
    sources: Number((await queryRows(`select count(*)::text c from source_records`))[0].c),
    evidence_hs: Number(
      (await queryRows(`select count(*)::text c from evidence where extraction_method=:'m'`, { m: M }))[0].c
    ),
    audit_hs: Number(
      (await queryRows(
        `select count(*)::text c from evidence_gate_audit a
         where a.object_type='evidence' and exists (select 1 from evidence e
           where e.evidence_id::text=a.object_id and e.extraction_method=:'m')`,
        { m: M }
      ))[0].c
    ),
    audit_relation_orphan: Number(
      (await queryRows(
        `select count(*)::text c from evidence_gate_audit a
         where a.object_type='relation'
           and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`
      ))[0].c
    ),
    published: Number(
      (await queryRows(`select count(*)::text c from claims where status::text in ('verified','published')`))[0].c
    ),
  };

  // ---- source_records ----
  let srcCreated = 0, srcReused = 0;
  const srcIdByLocal = {};
  for (const s of man.sources) {
    const sid = deterministicUuid("src:" + s.source_id_local);
    const exists = await queryValue(
      `select source_id::text from source_records where provider=:'p' and checksum=:'c'`,
      { p: s.provider, c: s.checksum }
    );
    if (exists) {
      srcIdByLocal[s.source_id_local] = exists;
      srcReused++;
    } else {
      await run(
        `insert into source_records(source_id,provider,title,creator,source_date,source_uri,content_type,license_code,checksum,raw_path,metadata_json)
         values (:'sid',:'p',:'t',:'cr',:'sd',:'su',:'ct',:'lc',:'cs',:'rp',:'mj')`,
        {
          sid, p: s.provider, t: s.title, cr: s.creator || null, sd: s.source_date || null,
          su: s.source_uri || null, ct: s.content_type, lc: s.license_code || null,
          cs: s.checksum, rp: s.raw_path || "", mj: JSON.stringify(s.metadata || {}),
        }
      );
      srcIdByLocal[s.source_id_local] = sid;
      srcCreated++;
    }
  }

  // ---- evidence（地图候选 + 存在性证据）----
  const auditStmts = [];
  let evWritten = 0;
  for (const r of man.records) {
    const eid = deterministicUuid("ev:" + r.ev_id);
    const sid = srcIdByLocal[r.source_local];
    if (!sid) throw new Error("missing source for " + r.ev_id);
    await run(
      `delete from evidence where evidence_id=:'eid'`, { eid }
    );
    await run(
      `insert into evidence(evidence_id,source_id,evidence_type,locator,quote_text,region_json,subject_hint,place_hint,extraction_method,confidence,verification_status)
       values (:'eid',:'sid',:'et',:'loc',:'qt',:'rj',:'sh',:'ph',:'em',:'cf',:'vs')`,
      {
        eid, sid, et: r.evidence_type, loc: r.locator || null, qt: r.quote_text || null,
        rj: JSON.stringify(r.region_json || {}), sh: r.subject_hint || null, ph: r.place_hint || null,
        em: M, cf: r.confidence, vs: "candidate",
      }
    );
    evWritten++;
    const g = evaluateGates(r.gate_facts || {});
    for (const code of GATE_CODES) {
      const gg = g.gates[code];
      auditStmts.push({
        sql: `delete from evidence_gate_audit where object_type=:'ot' and object_id=:'oid' and gate_code=:'gc'`,
        params: { ot: "evidence", oid: eid, gc: code },
      });
      auditStmts.push({
        sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
              values (:'ot',:'oid',:'gc',:'rs',:'rn','rule')`,
        params: { ot: "evidence", oid: eid, gc: code, rs: gg.result, rn: gg.reason },
      });
    }
  }
  await runMany(auditStmts);
  const auditWritten = auditStmts.length;

  // ---- 不变式：登记后快照 ----
  const after = {
    sources: Number((await queryRows(`select count(*)::text c from source_records`))[0].c),
    evidence_hs: Number(
      (await queryRows(`select count(*)::text c from evidence where extraction_method=:'m'`, { m: M }))[0].c
    ),
    audit_hs: Number(
      (await queryRows(
        `select count(*)::text c from evidence_gate_audit a
         where a.object_type='evidence' and exists (select 1 from evidence e
           where e.evidence_id::text=a.object_id and e.extraction_method=:'m')`,
        { m: M }
      ))[0].c
    ),
    audit_relation_orphan: Number(
      (await queryRows(
        `select count(*)::text c from evidence_gate_audit a
         where a.object_type='relation'
           and not exists (select 1 from relations r where r.relation_id::text=a.object_id)`
      ))[0].c
    ),
    published: Number(
      (await queryRows(`select count(*)::text c from claims where status::text in ('verified','published')`))[0].c
    ),
  };

  const summary = {
    source_created: srcCreated, source_reused: srcReused,
    evidence_written: evWritten, audit_written: auditWritten,
    before, after,
    invariant_ok: after.audit_relation_orphan === before.audit_relation_orphan
      && after.audit_relation_orphan === 63 && after.published === 0,
  };
  process.stdout.write(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error("REGISTER_FAILED", e);
  process.exit(1);
});
