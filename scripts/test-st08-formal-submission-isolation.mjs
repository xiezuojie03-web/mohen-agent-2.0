#!/usr/bin/env node
/**
 * ST-08 正式作品投稿链验证（隔离库）
 *
 * 复用阶段二已建的正式 work + revision + G5，验证：
 *  1) Creator 可提交自己的合法作品：G5 PASS/current/未过期/内容未变 → 冻结快照成功。
 *  2) 投稿快照精确绑定正式 revision：snapshot.revision_id = 正式 revision_id，
 *     artifact_revision = control.artifact_revision_for('work_revision', revision_id)（读正式正文）；
 *     payload.work_revision.content_hash 与正式正文一致；version_snapshot.director_plan 指纹读正式 plan。
 *  3) 幂等：同一 revision_id 重复提交返回原 snapshot_id，不产生第二份（unique + advisory lock）。
 *  4) 不可变：UPDATE/DELETE 快照被 SUBMISSION_SNAPSHOT_IMMUTABLE 触发器拒绝。
 *  5) 权限/资格拒绝：无当前 G5 的 revision（旧 Studio-only 或 G5 失效）提交被拒。
 *  6) 版本关系：旧 revision 不得越过最新 revision 被送审（PRIVATE_SUBMISSION_NOT_LATEST_REVISION）。
 *
 * 安全：仅 loopback 隔离库；不碰生产；不改 SQL；不签平行 Gate。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const env = {};
for (const line of envText.split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2]; }
{
  const u = new URL(env.DATABASE_URL);
  const host = u.hostname.toLowerCase(), name = decodeURIComponent(u.pathname).replace(/^\//, "").toLowerCase();
  if (!(host==="127.0.0.1"||host==="localhost"||host==="::1") || !/dev|isolat|test/.test(name))
    throw new Error(`REFUSE_NON_ISOLATED_DB host=${host} db=${name}`);
}

const PROJECT_ID = "b0a11000-0000-4000-8000-000000000001";
const PLAN_TITLE = "正式导演正文权威归位验证·松江府田赋科则·H1H2H3";
const PLAN_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st05-formal:formal-plan:${PROJECT_ID}:${PLAN_TITLE}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const WORK_TITLE = "正式作品正文权威归位验证·松江府田赋·修订1";
const WORK_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st07-formal:formal-work:${PROJECT_ID}:${WORK_TITLE}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const REVISION_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st07-formal:formal-work-revision:${WORK_ID}:rev1`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const SNAPSHOT_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st08-formal:snapshot:${REVISION_ID}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();

const results={PASS:[],FAIL:[]};
const pass=(k,d)=>{results.PASS.push(k);console.log(`  ✅ ${k}${d?` —— ${d}`:""}`);};
const fail=(k,d)=>{results.FAIL.push(k);console.log(`  ❌ ${k}${d?` —— ${d}`:""}`);};

async function main(){
  console.log("=".repeat(78));
  console.log("ST-08 正式作品投稿链验证（隔离库）");
  console.log(`work=${WORK_ID} revision=${REVISION_ID} snapshot=${SNAPSHOT_ID}`);
  console.log("=".repeat(78));
  const db=new Client({connectionString:env.DATABASE_URL});
  await db.connect();

  // Step 0 前置：阶段二 revision + G5 齐备
  let hadSnapshot=false;
  try{
    const pre=(await db.query(
      `select (select count(*)::int from publication.work_revisions where revision_id=$1) formal_rev,
              (select count(*)::int from studio.work_revisions where revision_id=$1 and formal_revision_id=$1) envelope,
              (select count(*)::int from control.gate_audits where object_type='work_revision' and object_id=$1 and gate_code='G5' and result='PASS' and current_valid and (valid_until is null or valid_until>now())) g5,
              (select count(*)::int from studio.submission_snapshots where revision_id=$1) snap`,[REVISION_ID])).rows[0];
    if(!pre.formal_rev||!pre.envelope||!pre.g5) throw new Error(`阶段二对象不齐：${JSON.stringify(pre)}`);
    hadSnapshot = pre.snap>0;
    pass("preflight",`阶段二正式 revision + 封套 + G5 齐备${hadSnapshot?"（既有快照，走重入验证）":"（无既有快照）"}`);
  }catch(err){fail("preflight",err.message);await db.end();return report();}

  // Step 1 正向投稿（重入时以幂等方式复用既有快照）
  let submitResult;
  try{
    const r=await db.query(
      `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4) as result`,
      [SNAPSHOT_ID,REVISION_ID,PROJECT_ID,"formal-body-authority-test"]);
    submitResult=r.rows[0].result;
    if(hadSnapshot){
      if(submitResult.idempotent!==true) throw new Error("重入应幂等复用既有快照");
      pass("submit_positive",`重入幂等复用 snapshot=${String(submitResult.snapshot_id).slice(0,8)}…（既有正确快照）`);
    }else{
      if(submitResult.idempotent!==false) throw new Error("首次投稿不应幂等返回");
      pass("submit_positive",`snapshot=${String(submitResult.snapshot_id).slice(0,8)}… artifact_rev=${String(submitResult.artifact_revision).slice(0,12)}…`);
    }
  }catch(err){fail("submit_positive",err.message);await db.end();return report();}

  // Step 2 快照精确绑定正式 revision + 指纹读正式正文
  try{
    const s=(await db.query(
      `select snapshot_id::text, revision_id::text, revision_no, project_id::text, content_hash, artifact_revision,
              knowledge_gate_audit_id::text, payload
         from studio.submission_snapshots where revision_id=$1`,[REVISION_ID])).rows[0];
    if(s.revision_id!==REVISION_ID) throw new Error("快照 revision_id 未绑定正式 revision");
    const liveRev=(await db.query("select control.artifact_revision_for('work_revision',$1::uuid) rev",[REVISION_ID])).rows[0].rev;
    if(s.artifact_revision!==liveRev) throw new Error("快照 artifact_revision 与正式正文实时指纹不一致");
    const formalCh=(await db.query("select content->>'content_hash' ch from publication.work_revisions where revision_id=$1",[REVISION_ID])).rows[0].ch;
    if(s.payload?.work_revision?.content_hash!==formalCh) throw new Error("快照 content_hash 与正式正文不一致");
    const dpRev=s.payload?.version_snapshot?.director_plan?.artifact_revision;
    const liveDp=(await db.query("select control.artifact_revision_for('director_plan',$1::uuid) rev",[PLAN_ID])).rows[0].rev;
    if(dpRev!==liveDp) throw new Error("版本快照 director_plan 指纹未读正式正文");
    pass("snapshot_binds_formal_revision",`revision/content_hash/artifact_revision/plan 指纹全部对齐正式正文`);
  }catch(err){fail("snapshot_binds_formal_revision",err.message);}

  // Step 3 幂等
  try{
    const r=await db.query(
      `select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4) as result`,
      [SNAPSHOT_ID,REVISION_ID,PROJECT_ID,"formal-body-authority-test"]);
    if(!r.rows[0].result.idempotent) throw new Error("重复投稿应幂等返回");
    const n=(await db.query("select count(*)::int n from studio.submission_snapshots where revision_id=$1",[REVISION_ID])).rows[0].n;
    if(n!==1) throw new Error(`幂等后快照数应为 1，实际=${n}`);
    pass("idempotent",`重复提交返回原快照，快照数=1`);
  }catch(err){fail("idempotent",err.message);}

  // Step 4 不可变
  try{
    let updRejected=false,delRejected=false;
    try{await db.query("update studio.submission_snapshots set submitted_by='TAMPER' where snapshot_id=$1",[SNAPSHOT_ID]);}catch{updRejected=true;}
    try{await db.query("delete from studio.submission_snapshots where snapshot_id=$1",[SNAPSHOT_ID]);}catch{delRejected=true;}
    if(!updRejected||!delRejected) throw new Error(`不可变失败 upd=${updRejected} del=${delRejected}`);
    pass("snapshot_immutable","UPDATE/DELETE 被 SUBMISSION_SNAPSHOT_IMMUTABLE 拒绝");
  }catch(err){fail("snapshot_immutable",err.message);}

  // Step 5 权限/资格拒绝：无当前 G5 的 revision 提交须被拒
  try{
    await db.query("BEGIN");
    // 造一个封套存在但无 G5 的 revision_id（formal 指向自身，正式正文存在但无任何 G5）
    const noG5Rid=(()=>{const h=crypto.createHash("sha256").update("mab-st08-formal:no-g5:"+REVISION_ID).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
    await db.query(
      `insert into publication.work_revisions(revision_id,work_id,revision_no,title,content,status)
       values($1::uuid,$2::uuid,$3,$4,$5::jsonb,'draft')`,
      [noG5Rid,WORK_ID,2,"no-g5-revision",JSON.stringify({content_hash:"a".repeat(64)})]);
    await db.query(
      `insert into studio.work_revisions(work_id,revision_id,revision_no,project_id,creator_id,title,content_hash,content,beats,source_and_rights_refs,depends_on_director_plan,payload,formal_revision_id)
       values($2::uuid,$1::uuid,$3,$4::uuid,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid,$12::jsonb,$1::uuid)`,
      [noG5Rid,WORK_ID,2,PROJECT_ID,"formal-body-authority","no-g5","a".repeat(64),JSON.stringify({}),JSON.stringify([]),JSON.stringify({}),PLAN_ID,JSON.stringify({original_ids:["b0a11000-0000-4000-8000-000000000002"]})]);
    let rejected=false,errMsg="";
    try{
      const snapNoG5=(()=>{const h=crypto.createHash("sha256").update("mab-st08-formal:snap-no-g5:"+noG5Rid).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
      await db.query(`select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4)`,[snapNoG5,noG5Rid,PROJECT_ID,"test"]);
    }catch(e){rejected=true;errMsg=e.message;}
    await db.query("rollback");
    if(!rejected) throw new Error("无 G5 的 revision 投稿未被拒绝");
    pass("unqualified_rejected",`无当前 G5 被拒：${errMsg.slice(0,60)}`);
  }catch(err){await db.query("rollback").catch(()=>{});fail("unqualified_rejected",err.message);}

  // Step 6 版本关系：旧 revision 不得越过最新 revision 送审
  // （阶段二 revision_no=1；构造 revision_no=3 最新后，尝试提交 rev1 → NOT_LATEST）
  try{
    await db.query("BEGIN");
    const newRid=(()=>{const h=crypto.createHash("sha256").update("mab-st08-formal:newer-rev:"+WORK_ID).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
    await db.query(
      `insert into publication.work_revisions(revision_id,work_id,revision_no,title,content,status)
       values($1::uuid,$2::uuid,$3,$4,$5::jsonb,'draft')`,
      [newRid,WORK_ID,3,"newer-rev",JSON.stringify({content_hash:"b".repeat(64)})]);
    await db.query(
      `insert into studio.work_revisions(work_id,revision_id,revision_no,project_id,creator_id,title,content_hash,content,beats,source_and_rights_refs,depends_on_director_plan,payload,formal_revision_id)
       values($2::uuid,$1::uuid,$3,$4::uuid,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::uuid,$12::jsonb,$1::uuid)`,
      [newRid,WORK_ID,3,PROJECT_ID,"formal-body-authority","newer","b".repeat(64),JSON.stringify({}),JSON.stringify([]),JSON.stringify({}),PLAN_ID,JSON.stringify({original_ids:["b0a11000-0000-4000-8000-000000000002"]})]);
    let rejected=false,errMsg="";
    // NOT_LATEST 校验在函数第 108-112 行，先于幂等校验（第 137 行）。
    // 因此只要存在 revision_no=3，提交 rev1 会先报 NOT_LATEST，无需删除既有快照
    // （快照表有不可变触发器，DELETE 本身会被 SUBMISSION_SNAPSHOT_IMMUTABLE 拒绝）。
    const snapOld=(()=>{const h=crypto.createHash("sha256").update("mab-st08-formal:snap-old:"+REVISION_ID).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
    try{
      await db.query(`select studio.persist_private_submission_snapshot($1::uuid,$2::uuid,$3::uuid,$4)`,[snapOld,REVISION_ID,PROJECT_ID,"test"]);
    }catch(e){rejected=true;errMsg=e.message;}
    await db.query("rollback"); // 回滚撤销 newRid 与无 G5 辅助行的任何影响
    if(!rejected||!/NOT_LATEST/.test(errMsg)) throw new Error(`旧 revision 未被 NOT_LATEST 拒绝：${errMsg}`);
    pass("not_latest_rejected",`旧修订越过新修订被拒：${errMsg.slice(0,60)}`);
  }catch(err){await db.query("rollback").catch(()=>{});fail("not_latest_rejected",err.message);}

  await db.end();
  report();
}
function report(){
  console.log(`\n${"=".repeat(78)}`);
  console.log("VERIFIED_ISOLATED REPORT —— ST-08 正式作品投稿链");
  console.log("=".repeat(78));
  console.log(`\n✅ PASS (${results.PASS.length}):`);results.PASS.forEach(p=>console.log(`   ${p}`));
  if(results.FAIL.length){console.log(`\n❌ FAIL (${results.FAIL.length}):`);results.FAIL.forEach(f=>console.log(`   ${f}`));}
  console.log(`\n${results.FAIL.length===0?"✅ VERIFIED_ISOLATED":"❌ NOT PASS"}`);
  console.log("=".repeat(78));
  process.exit(results.FAIL.length===0?0:1);
}
main().catch(e=>{console.error("FATAL:",e);process.exit(2);});
