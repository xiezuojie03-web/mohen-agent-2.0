// Read-only: inspect the published work revision + latest 松江府田赋 director plan payload shapes (batch J prep).
const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
import crypto from "node:crypto";
const dataAccess = await import("../packages/data-access/src/index.mjs");
const payload = Buffer.from(JSON.stringify({ uid: OWNER, r: [], exp: Date.now() + 5 * 60 * 1000 })).toString("base64url");
const token = `${payload}.${crypto.createHmac("sha256", process.env.MOHEN_DATABASE_SESSION_SECRET).update(payload).digest("base64url")}`;
const q = (sql, p = {}) => dataAccess.queryRows(sql.replaceAll("/*cfg*/", ", (select set_config('mohen.session_token', :'token', false)) cfg"), { ...p, token });

const rev = await q(`select r.content::text as p from publication.work_revisions r /*cfg*/ where r.revision_id='62a8ba95-e07f-4f7e-bcb9-f728004d651a'`);
const wp = JSON.parse(rev[0].p);
console.log("revision payload keys:", Object.keys(wp));
console.log("beats count:", Array.isArray(wp.beats) ? wp.beats.length : "n/a");
if (Array.isArray(wp.beats) && wp.beats[0]) {
  console.log("beat[0] keys:", Object.keys(wp.beats[0]));
  console.log("beat[0] sample:", JSON.stringify(wp.beats[0]).slice(0, 700));
}
for (const k of Object.keys(wp)) {
  if (k !== "beats") console.log(`payload.${k}:`, JSON.stringify(wp[k])?.slice(0, 300));
}
const plan = await q(`select plan_id::text, plan_a::text as a, plan_b::text as b, facts::text as f, finding::text as g, source_ids::text as s
  from public.director_plans /*cfg*/ where brief ilike '%松江府田赋%' order by created_at desc limit 1`);
const pa = JSON.parse(plan[0].a), pb = JSON.parse(plan[0].b);
console.log("\nplan_a keys:", Object.keys(pa));
console.log("plan_a sample:", JSON.stringify(pa).slice(0, 900));
console.log("\nplan_b keys:", Object.keys(pb));
console.log("facts sample:", (plan[0].f ?? "").slice(0, 400));
console.log("finding sample:", (plan[0].g ?? "").slice(0, 300));
console.log("source_ids:", plan[0].s);
await dataAccess.getNodePgPool?.().end?.();
process.exit(0);
