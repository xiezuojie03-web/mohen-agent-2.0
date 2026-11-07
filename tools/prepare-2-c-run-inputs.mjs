// Prepare M5 step 2 batch C run inputs: D02-D05 typed private requests in the
// trusted resume directory. Upstream refs are read from the local isolated DB;
// writing a file grants no execution or Gate qualification.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { queryRows, getNodePgPool, run } from "../packages/data-access/src/index.mjs";

const OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PROJECT = "b0a11000-0000-4000-8000-000000000001";
const ORIGINAL = "b0a11000-0000-4000-8000-000000000002";
const SCHEMA = "mohen.private-evidence-stage-request.v1";
const baseDir = "D:/MoHen/data/m5-runs";
const trustedDir = path.join(baseDir, "trusted");
fs.mkdirSync(trustedDir, { recursive: true });

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const stage = flagValue("--stage");
if (!["d02", "d03", "d04", "d05"].includes(stage)) {
  throw new Error("usage: node tools/prepare-2-c-run-inputs.mjs --stage d02|d03|d04|d05 [--run-id <uuid>] [--read-unit <uuid>]");
}
const runId = flagValue("--run-id") ?? crypto.randomUUID();
// 默认上游引用：D01 真实 run 产出、且已由 G1 独立 Gate 签发的 C02 扫描页 read_unit。
const READ_UNIT = flagValue("--read-unit") ?? "ff227f15-b9b5-c37f-b309-52ad6120b5dc";

const intents = {
  d02: "松江府田赋·卷十一（M5 隔离D链 D02 材料观察）",
  d03: "松江府田赋·卷十一（M5 隔离D链 D03 世界事实主张）",
  d04: "松江府田赋·卷十一（M5 隔离D链 D04 人文发现）",
  d05: "松江府田赋·卷十一（M5 隔离D链 D05 世界投影）",
};

let request;
if (stage === "d02") {
  // 上游引用：批次B 产出的 C02 扫描页 read_unit（含其 read_run 与 locator）。
  const rows = await queryRows(`select u.read_unit_id::text, u.locator_schema, u.method_code,
    r.read_run_id::text, r.status as run_status, r.config->>'schema' as run_schema,
    u.locator->>'page_sha256' as page_sha256
    from source.read_units u join source.read_runs r on r.read_run_id=u.read_run_id
    where u.read_unit_id=:'read_unit'::uuid`, { read_unit: READ_UNIT });
  if (rows.length !== 1 || rows[0].locator_schema !== "scanned_page/v1" ||
      rows[0].method_code !== "C02" || rows[0].run_schema !== "mab.private-scanned-page-reading.v1" ||
      rows[0].run_status !== "done") throw new Error("D02_UPSTREAM_READ_UNIT_NOT_FOUND");
  request = {
    schema: SCHEMA, stage: "D02", originalId: ORIGINAL, readUnitId: READ_UNIT,
    observation: {
      h_type: "H05",
      literal_reading: "均科正耗平米三斗六升五合以下低田等准熟起科同",
      normalized_text: "均科正耗平米三斗六升五合。以下低田等，准熟起科同。",
      research_proposition: "《松江府志》卷十一田赋门载青浦县低田科则：均科正耗平米三斗六升五合，准熟起科。",
      source_voice: "official_gazetteer",
      evidence_type: "gazetteer_tax_quota_observation",
      uncertainty: { qualification: "UNASSESSED", transcription: "single_page_ocr_unreviewed" },
    },
  };
} else if (stage === "d03") {
  // 上游引用：最新一条 D02 材料 observation 证据（已验证页字节）。
  const rows = await queryRows(`select e.evidence_id::text, l.link_id::text
    from evidence.material_evidence e
    join evidence.read_unit_evidence_links l on l.evidence_id=e.evidence_id
    where l.link_version='mab.private-material-observation.v1'
    order by e.created_at desc limit 1`);
  if (rows.length !== 1) throw new Error("D03_UPSTREAM_EVIDENCE_NOT_FOUND");
  request = {
    schema: SCHEMA, stage: "D03", originalId: ORIGINAL, evidenceId: rows[0].evidence_id,
    claim: {
      assertion: "《松江府志》卷十一田赋门记载：青浦县低田等则均科正耗平米三斗六升五合，准熟起科。",
      change_type: "taxation_quota_assessment",
      time_scope: { note: "edition dating unresolved", qualification: "UNASSESSED" },
      support_type: "supports",
    },
  };
} else if (stage === "d04") {
  // 上游引用：项目内最新一条 W07 主张修订。
  const rows = await queryRows(`select claim_revision_id::text from world.claim_revisions
    where producer_method_id='W07' and assertion_payload_json->>'project_id'=:'project'::text
    order by authored_at desc limit 1`, { project: PROJECT });
  if (rows.length !== 1) throw new Error("D04_UPSTREAM_CLAIM_NOT_FOUND");
  request = {
    schema: SCHEMA, stage: "D04", originalId: ORIGINAL, claimRevisionId: rows[0].claim_revision_id,
    finding: {
      finding_type: "institutional_mechanism",
      human_question: "松江府田赋如何通过田等差则实现税负分配？",
      interpretive_statement: "《松江府志》卷十一田赋门所示科则以田等为变量差别税额：低田『均科正耗平米三斗六升五合』并『准熟起科』，体现清代赋役制度按土地等级与熟荒状态执行征税的规则机制。",
      understanding_delta: "将孤立的科则条文理解为田等×熟荒状态的二维征税规则。",
      counter_view_or_alternative: ["需核对其他县志与赋役全书以确认科则数值与适用范围"],
      missing_evidence: ["同卷其他田等科则条文", "清代赋役全书对应条目"],
      uncertainty: { qualification: "UNASSESSED", basis: "single_page_reading" },
    },
  };
} else {
  // 上游引用：最新一条 A06 发现，及其引用的 claim 与 evidence（自动解析）。
  const rows = await queryRows(`select f.finding_id::text,
    f.supporting_world_objects->0->>'kind' as ref_kind,
    f.supporting_world_objects->0->>'id' as claim_revision_id
    from meaning.findings f
    where f.discovery_method->>'method_id'='A06'
    order by f.created_at desc limit 1`);
  if (rows.length !== 1 || rows[0].ref_kind !== "claim_revision")
    throw new Error("D05_UPSTREAM_FINDING_NOT_FOUND");
  const claim = await queryRows(`select claim_revision_id::text,
    assertion_payload_json->'evidence_ids'->>0 as evidence_id
    from world.claim_revisions where claim_revision_id=:'claim'::uuid`,
    { claim: rows[0].claim_revision_id });
  if (claim.length !== 1 || !claim[0].evidence_id) throw new Error("D05_UPSTREAM_CLAIM_NOT_FOUND");
  request = {
    schema: SCHEMA, stage: "D05", originalId: ORIGINAL, findingId: rows[0].finding_id,
    projection: {
      projection_key: "m5.songjiang.tianze.quota-rule.v2",
      payload: {
        title: "松江府田赋科则投影（候选）",
        summary: "青浦县低田均科正耗平米三斗六升五合、准熟起科的规则投影。",
        claim_ref: claim[0].claim_revision_id,
        evidence_ref: claim[0].evidence_id,
      },
    },
  };
}

const file = path.join(trustedDir, `${stage}-request.json`);
fs.writeFileSync(file, JSON.stringify(request, null, 2));

// Pre-register the production run (control plane); scope only carries project.
await run(`insert into control.production_runs(run_id,research_intent,scope,execution_mode,status)
  values (:'run_id'::uuid, :'intent', :'scope'::jsonb, 'attended', 'RUNNING')
  on conflict (run_id) do update set status='RUNNING', current_stage=null, finished_at=null`,
  { run_id: runId, intent: intents[stage], scope: JSON.stringify({ project_id: PROJECT }) });
await getNodePgPool().end();
console.log("RUN_INPUTS_READY", JSON.stringify({ stage, run_id: runId, request: file }));
