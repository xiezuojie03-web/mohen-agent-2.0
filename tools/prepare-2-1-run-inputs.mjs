// Prepare M5 2.1 run inputs: D00 scope file and the D01 typed scanned-page
// request in the trusted resume directory (values from the L0 registration).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { queryRows, getNodePgPool, run } from "../packages/data-access/src/index.mjs";
import { createPrivateSourceRegistrationRepository } from "../packages/data-access/src/private-source-registration-repository.mjs";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const ORIGINAL = "b0a11000-0000-4000-8000-000000000002";
const PAGE_NUMBER = 35;
const baseDir = "D:/MoHen/data/m5-runs";
const trustedDir = path.join(baseDir, "trusted");
fs.mkdirSync(trustedDir, { recursive: true });

const secret = process.env.MOHEN_DATABASE_SESSION_SECRET;
if (typeof secret !== "string" || !secret) throw new Error("MOHEN_DATABASE_SESSION_SECRET missing");
const b64url = b => Buffer.from(b).toString("base64url");
const makeToken = (uid) => {
  const payload = b64url(JSON.stringify({ uid, r: ["reviewer"], exp: Date.now() + 60000 }));
  const sig = Buffer.from(crypto.createHmac("sha256", secret).update(payload).digest()).toString("base64url");
  return `${payload}.${sig}`;
};
const token = makeToken(OWNER);

const regRepo = createPrivateSourceRegistrationRepository(getNodePgPool());
const reg = await regRepo.lookup(ORIGINAL, token);
if (!reg || reg.schema !== "mohen.private-source-registration.v1") throw new Error("REGISTRATION_NOT_FOUND");

fs.writeFileSync(path.join(baseDir, "scope.json"), JSON.stringify({
  project_id: PROJECT, original_id: ORIGINAL, page_number: PAGE_NUMBER,
}, null, 2));
fs.writeFileSync(path.join(trustedDir, "d01-request.json"), JSON.stringify({
  schema: "mohen.private-evidence-stage-request.v1",
  stage: "D01",
  originalId: ORIGINAL,
  page: {
    kind: "scanned_page/v1",
    page_number: PAGE_NUMBER,
    source_version_id: reg.source_version_id,
    raw_item_id: reg.raw_item_id,
    raw_sha256: reg.sha256,
    page_sha256: reg.sha256,
  },
}, null, 2));

// Pre-register the two production runs (control plane).
for (const [name, intent] of [["d00", "松江府田赋·卷十一（M5 隔离D链 D00 来源摄取）"],
                               ["d01", "松江府田赋·卷十一（M5 隔离D链 D01 载体阅读）"]]) {
  await run(`insert into control.production_runs(run_id,research_intent,scope,execution_mode,status)
    values (:'run_id'::uuid, :'intent', :'scope'::jsonb, 'attended', 'RUNNING')
    on conflict (run_id) do update set status='RUNNING', current_stage=null, finished_at=null`,
    { run_id: process.argv[2] === name ? process.argv[3] : crypto.randomUUID(), intent,
      scope: JSON.stringify({ project_id: PROJECT }) });
}
await getNodePgPool().end();
console.log("RUN_INPUTS_READY", JSON.stringify({ scope: path.join(baseDir, "scope.json"),
  d01: path.join(trustedDir, "d01-request.json") }));
