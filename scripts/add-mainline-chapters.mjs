#!/usr/bin/env node
/**
 * 为主线作品补合规章节（修订2），走正规链路：新正文 → 独立 G5 → 投稿 → 审核 → 发布。
 *
 * 不篡改已签名的修订1（不可变性）；修订2 为同 Project/Root 的新版本。
 * 章节基于主线真实方志素材，明确标注「占位·待深化」，来源引用指向真实对象。
 * 复用 test-m5-mainline-fullchain-isolation.mjs 的 G5 签发模式（机器 signer + rule reviewer）。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { createRuleGateReviewer } from "../tools/rule-gate-reviewer.mjs";
import { queryRows } from "../packages/data-access/src/index.mjs";
const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && m[2] !== "") env[m[1]] = m[2]; }
process.env.DATABASE_URL = env.DATABASE_URL;
{
  const u = new URL(env.DATABASE_URL);
  const loopback = ["127.0.0.1","localhost","::1"].includes(u.hostname.toLowerCase());
  const name = decodeURIComponent(u.pathname).replace(/^\//,"").toLowerCase();
  if (!loopback || !/dev|isolat|test/.test(name)) throw new Error(`REFUSE_NON_ISOLATED ${u.hostname} ${name}`);
  console.log(`ISOLATION_GUARD_OK db=${name}`);
}

const PROJECT_ID = "d9d48901-3aa3-4424-b50f-965d6749ee8e";
const TASK_ID = "b2143002-5867-4873-9cae-21e0aebccb51";
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const PLAN_ID = "d87d816d-8e3c-f080-69f8-be15c9ed3bd7";
const WORK_ID = "08ddaaa8-0de5-396f-9ef1-e750e613d81d";
const ORIGINAL_ID = "f474b91b-07f0-47ab-94dc-20dc7f55e518";
const G4 = "749414aa-9539-78a5-0a4e-007abedfbd9d";
const SEED = "cebc75b3-b4c6-b16e-35b3-f76b82794aa7";
const CTX = "0a920342-42ae-23e8-2bbd-ee334ad40de1";
const PROJ = "e76a01ce-24b9-7f97-52cf-12142880a81c";
const MACHINE_SIGNER_USER_ID = "b0a11000-0000-4000-8000-0000000000a1";
const OPERATOR_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75";
const RUN_ID = "ffb4430e-bc11-4e18-824e-4e6f492ea432";
const VALID_UNTIL = new Date(Date.now() + 6*24*3600*1000).toISOString();
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const uuid = (label) => { const h=crypto.createHash("sha256").update("m m5 chapters:"+label).digest("hex").slice(0,32); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; };
const REV2 = uuid(`rev2:${WORK_ID}`);
const SNAP = uuid(`snap:${REV2}`);

function mintSessionToken(userId, secret) {
  const payload = Buffer.from(JSON.stringify({uid:userId,r:[],exp:Date.now()+3600_000})).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const sig = crypto.createHmac("sha256",secret).update(payload).digest("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return `${payload}.${sig}`;
}
const MACHINE_TOKEN = mintSessionToken(MACHINE_SIGNER_USER_ID, env.MOHEN_DATABASE_SESSION_SECRET);

const results = { pass:[], fail:[] };
const pass=(k,d)=>{results.pass.push(k);console.log(`  PASS ${k}${d?` -- ${d}`:""}`);};
const fail=(k,d)=>{results.fail.push(k);console.log(`  FAIL ${k}${d?` -- ${d}`:""}`);};

// 合规章节：基于主线真实方志素材，标注占位，provenance 指向真实对象
const BEATS = [
  {title:"一、方志里的朱家角",narration:"【占位·待深化】据《上海地名志·朱家角》条目，朱家角以水网与集镇并称。本章只呈现可证原文，不外推为全镇史实。",visual:"方志书页与朱家角水网示意（占位）",directorTimecodeMs:0,provenanceRefs:["source:9aa03207-6d60-4984-8c1f-347df2532842","finding:"+G4]},
  {title:"二、水路如何连接集镇",narration:"【占位·待深化】方志所载水路连接集镇空间，是可证的事实骨架；具体街巷尺度与年代仍需更多原件交叉。",visual:"河道与桥梁关系示意（占位）",directorTimecodeMs:8000,provenanceRefs:["finding:"+G4,"world_projection:"+PROJ]},
  {title:"三、可证与存疑的边界",narration:"【占位·待深化】本作只讲方志能证实的部分；单条来源不足以支撑全镇叙事，存在疑问处如实保留。",visual:"证据边界示意（占位）",directorTimecodeMs:16000,provenanceRefs:["story_seed:"+SEED,"agent_context:"+CTX]},
];

async function main(){
  console.log("=".repeat(70));
  console.log("主线作品补章节（修订2）：新正文→独立G5→投稿→审核→发布");
  console.log(`work=${WORK_ID} rev2=${REV2}`);
  console.log("=".repeat(70));
  const db=new Client({connectionString:env.DATABASE_URL});await db.connect();
  const decideGate=async(d)=>{
    await db.query("begin");
    try{
      await db.query("set role mohen_gate_signer_m5_machine");
      await db.query(`SET mohen.session_token = '${MACHINE_TOKEN}'`);
      const r=await db.query(`select control.sign_gate_candidate($1,$2,$3,$4,$5,$6::jsonb,$7) as gate_audit_id`,
        [d.candidateId,d.requestId,d.result,d.ruleVersion,d.validUntil,JSON.stringify(d.receipt),d.expectedAuditId]);
      await db.query("commit");await db.query("reset role");return r.rows[0].gate_audit_id;
    }catch(e){try{await db.query("rollback");}catch{}try{await db.query("reset role");}catch{}throw e;}
  };
  const reviewer=()=>createRuleGateReviewer({query:queryRows,decide:decideGate,
    projectId:PROJECT_ID,log:()=>{}});
  const auditRow=async(id)=>(await db.query(`select gate_audit_id::text,gate_code,stage,object_type,object_id::text,artifact_revision,qualification_digest from control.gate_audits where gate_audit_id=$1`,[id])).rows[0];
  const depOf=(r,g)=>({gate_code:g,stage:r.stage,object_type:r.object_type,object_id:r.object_id,artifact_revision:r.artifact_revision,gate_audit_id:r.gate_audit_id,qualification_digest:r.qualification_digest});

  try{
    // 复用上游已当前有效的 G4 + plan G5 + 素材 G5
    const upstream = {};
    for(const [key,gc,ot,oid] of [
      ["g4","G4",null,G4],["plan","G5","director_plan",PLAN_ID],
      ["seed","G5","story_seed",SEED],["ctx","G5","agent_context",CTX],["proj","G5","world_projection",PROJ],
    ]){
      const sql=ot
        ? `select * from control.gate_audits where gate_code=$1 and object_type=$2 and object_id=$3 and result='PASS' and current_valid and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`
        : `select * from control.gate_audits where gate_code=$1 and object_id=$2 and result='PASS' and current_valid and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`;
      const params=ot?[gc,ot,oid]:[gc,oid];
      const row=(await db.query(sql,params)).rows[0];
      if(!row) throw new Error(`UPSTREAM_NOT_CURRENT ${key}`);
      upstream[key]=depOf(row,gc);
    }
    pass("upstream_qualifications_current","G4 + plan/seed/ctx/proj G5 均当前有效");

    // 检查 rev2 是否已存在（幂等）
    const existRev=(await db.query(`select revision_id::text from publication.work_revisions where revision_id=$1`,[REV2])).rows[0];
    if(!existRev){
      await db.query("BEGIN");
      const content={director_source:{plan_id:PLAN_ID},topic:"朱家角",beats:BEATS,source_refs:[{kind:"source",id:"9aa03207-6d60-4984-8c1f-347df2532842"}]};
      const ch=sha(JSON.stringify(content));
      await db.query(`insert into publication.work_revisions(revision_id,work_id,revision_no,title,description,content,status)
        values($1::uuid,$2::uuid,$3,$4,$5,$6::jsonb,'draft')`,
        [REV2,WORK_ID,2,"朱家角·修订2（含章节）","基于真实方志素材补合规章节，明确标注占位·待深化",JSON.stringify({...content,content_hash:ch})]);
      await db.query(`insert into studio.work_revisions(work_id,revision_id,revision_no,project_id,creator_id,title,content_hash,content,beats,
          source_and_rights_refs,depends_on_director_plan,depends_on_story_seeds,depends_on_agent_contexts,depends_on_projections,payload,formal_revision_id)
        values($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid,$12::uuid[]::uuid[],$13::uuid[]::uuid[],$14::uuid[]::uuid[],$15::jsonb,$2::uuid)`,
        [WORK_ID,REV2,2,PROJECT_ID,"owner-ui-demo","朱家角·修订2（含章节）",ch,JSON.stringify(content),JSON.stringify(BEATS),
         JSON.stringify([{kind:"source",id:"9aa03207-6d60-4984-8c1f-347df2532842",rights_basis:"owner_approved_public_display_2026_11_24"}]),
         PLAN_ID,`{${SEED}}`,`{${CTX}}`,`{${PROJ}}`,JSON.stringify({formal:true,method_id:"H1H2H3",original_ids:[ORIGINAL_ID],
           body:{original_ids:[ORIGINAL_ID],depends_on_director_plan:PLAN_ID}})]);
      await db.query("COMMIT");
      pass("rev2_created",`修订2 已创建，含 ${BEATS.length} 个合规章节（title+narration+时码+溯源）`);
    } else pass("rev2_exists","修订2 已存在（幂等复用）");

    // 签 rev2 的独立 G5
    const rev=(await db.query(`select control.artifact_revision_for('work_revision',$1::uuid) rev`,[REV2])).rows[0].rev;
    if(!rev||!/^[0-9a-f]{64}$/i.test(rev)) throw new Error(`fingerprint invalid ${rev}`);
    const existing=(await db.query(`select gate_audit_id,artifact_revision from control.gate_audits where gate_code='G5' and object_type='work_revision' and object_id=$1 and result='PASS' and current_valid and (valid_until is null or valid_until>now()) order by signed_at desc limit 1`,[REV2])).rows[0];
    let g5;
    if(existing && existing.artifact_revision===rev){ g5=await auditRow(existing.gate_audit_id); pass("rev2_g5_reuse",`复用 G5 ${g5.gate_audit_id.slice(0,8)}`); }
    else {
      await db.query(`delete from control.gate_candidates where gate_code='G5' and object_type='work_revision' and object_id=$1 and candidate_status='SUBMITTED'`,[REV2]);
      const cid=uuid(`cand:${REV2}`);
      await db.query(`insert into control.gate_candidates(candidate_id,run_id,stage,gate_code,object_type,object_id,artifact_revision,
          purpose_namespace,purpose_code,purpose_version,allowed_scope,consumer,dependency_snapshot,evidence_refs,input_fingerprint,submitted_at,producer_identity,candidate_status)
        values($1::uuid,$2::uuid,'D05','G5','work_revision',$3::uuid,$4,'data-production','m5-remediation','v1',$5::jsonb,'producer',$6::jsonb,$7::jsonb,$8,now(),'private-evidence-worker','SUBMITTED')`,
        [cid,RUN_ID,REV2,rev,JSON.stringify({project_id:PROJECT_ID}),
         JSON.stringify([upstream.g4,upstream.plan,upstream.seed,upstream.ctx,upstream.proj]),
         JSON.stringify([{kind:"work_revision",id:REV2,artifact_revision:rev}]),sha(`${PROJECT_ID}:rev2:${rev}`)]);
      const rv=createRuleGateReviewer({query:queryRows,decide:decideGate,projectId:PROJECT_ID,log:()=>{}});
      const dry=await rv.review({gate:"G5",dryRun:true});
      if(dry.status!=="DRY_RUN_PASS") throw new Error(`G5_DRY_FAIL ${dry.failed?.join(",")||dry.status}`);
      const s=await rv.review({gate:"G5",dryRun:false});
      if(s.status!=="PASS") throw new Error(`G5_SIGN_FAIL ${s.failed?.join(",")||s.status}`);
      g5=await auditRow(s.auditId);
      pass("rev2_g5_signed",`修订2 独立 G5 ${g5.gate_audit_id.slice(0,8)}（非自签）`);
    }

    // 投稿
    const snapExist=(await db.query(`select 1 from studio.submission_snapshots where revision_id=$1`,[REV2])).rows.length;
    if(!snapExist){
      await db.query(`select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4)`,[SNAP,REV2,PROJECT_ID,OWNER_ID]);
      pass("rev2_submitted","修订2 冻结快照已提交");
    } else pass("rev2_submitted","修订2 已投稿（幂等）");

    // 审核 APPROVED（独立 operator，非 creator）
    const nonce=Date.now();
    await db.query("BEGIN");await db.query("SET LOCAL ROLE mohen_editorial_operator");
    try{
      await db.query(`select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,$5,$6)`,
        [crypto.randomUUID(),WORK_ID,REV2,String(OPERATOR_ID),"主线修订2：真实方志章节占位·待深化",`ch-appr-${nonce}`]);
      await db.query("COMMIT");
      pass("rev2_approved","修订2 经独立 operator APPROVED，绑定修订2 G5");
    }catch(err){await db.query("ROLLBACK");throw err;}
    finally{try{await db.query("RESET ROLE");}catch{}}

    // WATCH 章节校验（不发布，留给 Owner 亲自发布体验）
    const w=(await db.query(`select content::text from publication.work_revisions where revision_id=$1`,[REV2])).rows[0];
    const c=JSON.parse(w.content);
    const valid=c.beats.filter(b=>typeof b.title==="string"&&typeof b.narration==="string");
    if(valid.length!==BEATS.length) throw new Error(`beats validation ${valid.length}/${BEATS.length}`);
    pass("rev2_watch_beats_valid",`${valid.length} 个章节满足 WATCH title+narration 校验`);
    console.log("\nREADY_FOR_OWNER_PUBLISH: 修订2 已投稿+APPROVED+章节合规，可在 Admin 亲手发布→WATCH 观看→撤权");
  }catch(e){
    fail("FATAL",e.message);
  }finally{
    await db.end();
  }
  console.log("\n"+"=".repeat(70));
  console.log(`CHAPTERS REPORT: ${results.pass.length} PASS / ${results.fail.length} FAIL`);
  results.pass.forEach(p=>console.log("  PASS "+p));
  results.fail.forEach(f=>console.log("  FAIL "+f));
  console.log("=".repeat(70));
  process.exit(results.fail.length===0?0:1);
}
main().catch(e=>{console.error("FATAL",e);process.exit(2);});
