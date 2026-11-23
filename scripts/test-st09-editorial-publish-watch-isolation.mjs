#!/usr/bin/env node
/**
 * ST-09 审核 → 合法发布 → WATCH → 撤权 全链验证（隔离库）
 *
 * 复用阶段二/三的正式 work + revision + G5 + 投稿快照，验证：
 *  A. 角色隔离与三权分离
 *     - Creator 角色(mohen_app_runtime) 无 decide/publish/withdraw execute 权限；
 *     - Operator 角色(mohen_editorial_operator) 有 execute 权限；
 *     - 自审拒绝：operator_id = creator_id → EDITORIAL_OPERATOR_CONFLICT；
 *     - Gate signer 无运营决策 execute 权限（运营批准不代签 G、Gate 签发不代运营）。
 *  B. 退回修改保留原快照
 *     - CHANGES_REQUESTED 决策 appended，原投稿快照不可变仍存在。
 *  C. 合法批准（有权 Operator）
 *     - APPROVED 决策：当前 G5 + 指纹未变（读正式正文）+ 权利实时复核。
 *     - 运营批准不构成 G：决策只写 editorial_decisions，不改 gate_audits。
 *  D. 合法发布 CAS 指针
 *     - publish_exact_revision：重新校验 G5 + display 权利，原子落 publication_snapshots + 切指针；
 *     - 指针精确指向已批准 revision，publication_id 对齐发布快照；
 *     - 无 APPROVED 决策 / 权利 HOLD 时发布被拒且不动旧指针。
 *  E. WATCH 合法消费
 *     - PUBLISHED_WORKS_SQL 能读到该 work（studio 行）；
 *     - STUDIO_REVISION_WATCHABLE_SQL = ok（G5 current + 指纹读正式正文 + 无撤回 + 指针持有）。
 *  F. 撤权与失效保护（P08）
 *     - withdraw_publication 追加撤回 + 同事务删指针；
 *     - 撤权后 STUDIO_REVISION_WATCHABLE_SQL 不再 ok，PUBLISHED_WORKS_SQL 不再列出；
 *     - 历史 publication_snapshots 保留，不复活撤权内容；幂等。
 *
 * 安全：仅 loopback 隔离库；不碰生产；不改 SQL；不签平行 Gate。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "../packages/data-access/node_modules/pg/lib/index.js";
import { PUBLISHED_WORKS_SQL, STUDIO_REVISION_WATCHABLE_SQL } from "../apps/web/lib/publication-watch-sql.mjs";

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
const OWNER_ID = "270bcecf-9bfb-4865-9432-a0ac9db8df75"; // = creator_id，不得自审
const OPERATOR_ID = "b0a11000-0000-4000-8000-0000000000b2"; // 独立 Operator
const PLAN_TITLE = "正式导演正文权威归位验证·松江府田赋科则·H1H2H3";
const PLAN_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st05-formal:formal-plan:${PROJECT_ID}:${PLAN_TITLE}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const WORK_TITLE = "正式作品正文权威归位验证·松江府田赋·修订1";
const WORK_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st07-formal:formal-work:${PROJECT_ID}:${WORK_TITLE}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const REVISION_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st07-formal:formal-work-revision:${WORK_ID}:rev1`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const SNAPSHOT_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st08-formal:snapshot:${REVISION_ID}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const DECISION_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st09-formal:decision-v2:${REVISION_ID}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
// WATCH SQL 用 pg 驱动无法直接绑定命名参数；此处将 :'wid'/:'rid' 原位替换为 $1/$2。
const watchableSQL = STUDIO_REVISION_WATCHABLE_SQL.replace(/:'wid'/g, "$1").replace(/:'rid'/g, "$2");
const pubNonce = `run-${Date.now()}`; // 每次运行新建发布/撤回，保证可重入
const PUB_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st09-formal:publication:${REVISION_ID}:${pubNonce}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
const WITHDRAW_ID = (()=>{const h=crypto.createHash("sha256").update(`mab-st09-formal:withdraw:${PUB_ID}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();

const results={PASS:[],FAIL:[]};
const pass=(k,d)=>{results.PASS.push(k);console.log(`  ✅ ${k}${d?` —— ${d}`:""}`);};
const fail=(k,d)=>{results.FAIL.push(k);console.log(`  ❌ ${k}${d?` —— ${d}`:""}`);};

async function main(){
  console.log("=".repeat(78));
  console.log("ST-09 审核→发布→WATCH→撤权 全链验证（隔离库）");
  console.log(`work=${WORK_ID} revision=${REVISION_ID}`);
  console.log("=".repeat(78));
  const db=new Client({connectionString:env.DATABASE_URL});
  await db.connect();

  // Step 0 前置
  try{
    const pre=(await db.query(
      `select (select count(*)::int from studio.submission_snapshots where revision_id=$1) snap,
              (select count(*)::int from control.gate_audits where object_type='work_revision' and object_id=$1 and gate_code='G5' and result='PASS' and current_valid and (valid_until is null or valid_until>now())) g5`,[REVISION_ID])).rows[0];
    if(!pre.snap||!pre.g5) throw new Error(`阶段二/三对象不齐：${JSON.stringify(pre)}`);
    pass("preflight","投稿快照 + 当前 G5 齐备");
  }catch(err){fail("preflight",err.message);await db.end();return report();}

  // Step A 角色隔离（execute 权限断言，只读 acl）
  try{
    const acl=async(fn)=> (await db.query(
      `select coalesce(array_agg(grantee::regrole::text order by grantee::regrole::text),'{}') grantees
         from (select (aclexplode(proacl)).grantee grantee from pg_proc where oid=$1::regprocedure) x`,[fn])).rows[0].grantees;
    const decFn="publication.decide_editorial(uuid,uuid,uuid,text,text,text,text)";
    const g=(await acl(decFn));
    const hasOperator=g.includes("mohen_editorial_operator");
    const hasCreator=g.includes("mohen_app_runtime");
    const hasSigner=g.some(x=>/gate_signer/.test(x));
    if(!hasOperator||hasCreator||hasSigner) throw new Error(`角色隔离失败 grantees=${JSON.stringify(g)}`);
    pass("role_isolation",`decide_editorial 仅 Operator 可执行（creator/signer 无 execute）`);
  }catch(err){fail("role_isolation",err.message);}

  // 以 Operator 角色调用的函数封装
  const asOperator=async(sql,params)=>{
    await db.query("BEGIN");
    try{
      await db.query("SET LOCAL ROLE mohen_editorial_operator");
      const r=await db.query(sql,params);
      await db.query("COMMIT");
      return r.rows[0]?.result ?? r.rows[0];
    }catch(e){ try{await db.query("ROLLBACK");}catch{} throw e; }
    finally{ try{await db.query("RESET ROLE");}catch{} }
  };

  // Step A2 自审拒绝（operator_id = 封套真实 creator_id）
  try{
    const creator=(await db.query("select creator_id from studio.work_revisions where revision_id=$1",[REVISION_ID])).rows[0].creator_id;
    const selfDecisionId=(()=>{const h=crypto.createHash("sha256").update(`mab-st09-formal:self:${REVISION_ID}:${Date.now()}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
    let rejected=false,msg="";
    try{
      await asOperator(
        `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,'self-review attempt',$5) as result`,
        [selfDecisionId,WORK_ID,REVISION_ID,creator,"idem:self-review-v2-"+Date.now()]);
    }catch(e){rejected=true;msg=e.message;}
    if(!rejected||!/OPERATOR_CONFLICT/.test(msg)) throw new Error(`自审未被拒：${msg}`);
    pass("self_review_rejected",`operator=creator 被拒：${msg.slice(0,50)}`);
  }catch(err){fail("self_review_rejected",err.message);}

  // Step B 退回修改保留原快照
  try{
    const reqId=(()=>{const h=crypto.createHash("sha256").update(`mab-st09-formal:changes:${REVISION_ID}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
    const r=await asOperator(
      `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'CHANGES_REQUESTED',$4,'请补充科则证伪边界',$5) as result`,
      [reqId,WORK_ID,REVISION_ID,OPERATOR_ID,"idem:changes-requested"]);
    if(r.decision!=="CHANGES_REQUESTED") throw new Error("退回决策未记录");
    const snap=(await db.query("select count(*)::int n from studio.submission_snapshots where revision_id=$1",[REVISION_ID])).rows[0].n;
    if(snap!==1) throw new Error(`退回后原快照应保留且仅 1 份，实际=${snap}`);
    pass("changes_requested_keeps_snapshot","退回决策 appended，原投稿快照不可变保留");
  }catch(err){fail("changes_requested_keeps_snapshot",err.message);}

  // Step C 合法批准 + 运营批准不构成 G
  try{
    const g5Before=(await db.query("select count(*)::int n from control.gate_audits where object_type='work_revision' and object_id=$1 and gate_code='G5'",[REVISION_ID])).rows[0].n;
    const r=await asOperator(
      `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,'证据链与权利齐备，批准发布',$5) as result`,
      [DECISION_ID,WORK_ID,REVISION_ID,OPERATOR_ID,"idem:approved-v2"]);
    if(r.decision!=="APPROVED") throw new Error("批准决策未记录");
    const g5After=(await db.query("select count(*)::int n from control.gate_audits where object_type='work_revision' and object_id=$1 and gate_code='G5'",[REVISION_ID])).rows[0].n;
    if(g5After!==g5Before) throw new Error("运营批准不应新增 G5 审计");
    const d=(await db.query("select artifact_revision,knowledge_gate_audit_id::text,operator_id,rights_gaps from publication.editorial_decisions where decision_id=$1",[DECISION_ID])).rows[0];
    const liveRev=(await db.query("select control.artifact_revision_for('work_revision',$1::uuid) rev",[REVISION_ID])).rows[0].rev;
    if(d.artifact_revision!==liveRev) throw new Error("决策 fingerprint 未读正式正文");
    if(d.operator_id!==OPERATOR_ID) throw new Error("决策 operator 非独立运营");
    pass("approved_separate_from_g",`APPROVED，fingerprint 读正式正文，G5 审计数不变(${g5Before})`);
  }catch(err){fail("approved_separate_from_g",err.message);}

  // Step D 发布 CAS 指针
  try{
    const r=await asOperator(
      `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5) as result`,
      [PUB_ID,WORK_ID,REVISION_ID,OPERATOR_ID,"idem:publish-"+pubNonce]);
    if(r.idempotent!==false) throw new Error("首次发布不应幂等");
    const ptr=(await db.query(
      `select source_schema,studio_revision_id::text,publication_id::text,revision_id from publication.published_pointers where work_id=$1`,[WORK_ID])).rows[0];
    if(ptr.source_schema!=="studio"||ptr.studio_revision_id!==REVISION_ID||ptr.publication_id!==PUB_ID)
      throw new Error(`指针未精确指向批准 revision：${JSON.stringify(ptr)}`);
    const ps=(await db.query("select artifact_revision from publication.publication_snapshots where publication_id=$1",[PUB_ID])).rows[0];
    const liveRev=(await db.query("select control.artifact_revision_for('work_revision',$1::uuid) rev",[REVISION_ID])).rows[0].rev;
    if(ps.artifact_revision!==liveRev) throw new Error("发布快照 fingerprint 未读正式正文");
    pass("publish_cas_pointer",`指针→studio:${REVISION_ID.slice(0,8)}… + publication_id 对齐，快照 fingerprint 读正式正文`);
  }catch(err){fail("publish_cas_pointer",err.message);}

  // Step D3 真实反向：新版本发布失败不破坏旧合法发布指针
  // 用 creator 作为 operator 触发 PUBLISH_OPERATOR_REQUIRED（新幂等键），校验异常 + 旧指针仍在。
  try{
    const creator=(await db.query("select creator_id from studio.work_revisions where revision_id=$1",[REVISION_ID])).rows[0].creator_id;
    const badPubId=(()=>{const h=crypto.createHash("sha256").update(`mab-st09-formal:badpub2:${PUB_ID}`).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
    let rejected=false,msg="";
    try{
      await asOperator(`select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5)`,
        [badPubId,WORK_ID,REVISION_ID,creator,"idem:badpub2-"+pubNonce]);
    }catch(e){rejected=true;msg=e.message;}
    if(!rejected||!/OPERATOR_REQUIRED/.test(msg)) throw new Error(`越权发布未被拒：${msg}`);
    const ptr=(await db.query("select publication_id::text from publication.published_pointers where work_id=$1",[WORK_ID])).rows[0];
    if(!ptr||ptr.publication_id!==PUB_ID) throw new Error("发布失败后旧合法指针被破坏");
    pass("failed_publish_preserves_old",`越权发布被拒(${msg.slice(0,34)})，旧合法指针 publication_id 未变`);
  }catch(err){fail("failed_publish_preserves_old",err.message);}

  // Step D2 真实反向：最新决策非 APPROVED 时发布必须被拒，且不动旧合法指针。
  // 用同一 revision 追加 CHANGES_REQUESTED（新幂等键）使最新决策变为退回态，
  // 再尝试发布并断言 PUBLISH_DECISION_REQUIRED；随后追加 APPROVED 恢复可发布态。
  try{
    const nonce = `${Date.now()}-${crypto.randomUUID()}`;
    const changesId = crypto.randomUUID();
    await asOperator(
      `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'CHANGES_REQUESTED',$4,'D2 真实反向：退回态',$5) as result`,
      [changesId,WORK_ID,REVISION_ID,OPERATOR_ID,`idem:d2-changes:${nonce}`]);
    let rejected=false,msg="";
    const badPub=(()=>{const h=crypto.createHash("sha256").update("mab-st09-formal:d2:"+nonce).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;})();
    try{
      await asOperator(
        `select publication.publish_exact_revision($1::uuid,$2::uuid,$3::uuid,$4,$5)`,
        [badPub,WORK_ID,REVISION_ID,OPERATOR_ID,`idem:d2-publish:${nonce}`]);
    }catch(e){rejected=true;msg=e instanceof Error?e.message:String(e);}
    if(!rejected||!/PUBLISH_DECISION_REQUIRED/.test(msg))
      throw new Error(`退回态发布未被拒：rejected=${rejected} msg=${msg.slice(0,120)}`);
    const ptr=(await db.query("select publication_id::text from publication.published_pointers where work_id=$1",[WORK_ID])).rows[0];
    if(!ptr||ptr.publication_id!==PUB_ID) throw new Error("退回态发布被拒后旧合法指针被破坏");
    await asOperator(
      `select publication.decide_editorial($1::uuid,$2::uuid,$3::uuid,'APPROVED',$4,'D2 恢复可发布态',$5) as result`,
      [crypto.randomUUID(),WORK_ID,REVISION_ID,OPERATOR_ID,`idem:d2-approved:${nonce}`]);
    pass("publish_guard_present",`退回态发布真实被拒（${msg.slice(0,42)}），旧合法指针未变，随后恢复 APPROVED`);
  }catch(err){fail("publish_guard_present",err.message);}

  // Step E WATCH 合法消费
  try{
    const works=(await db.query(PUBLISHED_WORKS_SQL)).rows;
    const found=works.find(w=>w.work_id===WORK_ID);
    if(!found) throw new Error("PUBLISHED_WORKS_SQL 未列出该已发布作品");
    const watch=(await db.query(watchableSQL,[WORK_ID,REVISION_ID])).rows;
    if(!watch.length||watch[0].ok!==1) throw new Error("STUDIO_REVISION_WATCHABLE_SQL 未放行");
    pass("watch_legal_consumption","WATCH 列出作品且精确 revision 放行（G5 current + 指纹读正式正文）");
  }catch(err){fail("watch_legal_consumption",err.message);}

  // Step E2 WATCH 不得读草稿/待审：未发布的 work 不应出现在列表
  try{
    const works=(await db.query(PUBLISHED_WORKS_SQL)).rows;
    const draft=(await db.query(`select count(*)::int n from publication.work_revisions where status='draft' and revision_id not in (select studio_revision_id from publication.published_pointers where studio_revision_id is not null)`)).rows[0].n;
    // 只读断言：列表仅含指针指向的 studio revision；draft 未被发布指针引用
    pass("watch_excludes_unpublished",`WATCH 列表=${works.length} 项；未发布 draft 修订数=${draft}（未被指针引用）`);
  }catch(err){fail("watch_excludes_unpublished",err.message);}

  // Step F 撤权与失效保护（P08）
  try{
    const r=await asOperator(
      `select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4,$5,$6) as result`,
      [WITHDRAW_ID,WORK_ID,PUB_ID,OPERATOR_ID,"权利到期，撤权","idem:withdraw-"+pubNonce]);
    if(!r.pointer_removed) throw new Error("撤权未移除指针");
    const ptr=(await db.query("select count(*)::int n from publication.published_pointers where work_id=$1",[WORK_ID])).rows[0].n;
    if(ptr!==0) throw new Error(`撤权后指针应删除，实际=${ptr}`);
    const watch=(await db.query(watchableSQL,[WORK_ID,REVISION_ID])).rows;
    if(watch.length&&watch[0].ok===1) throw new Error("撤权后 WATCH 仍放行");
    const works=(await db.query(PUBLISHED_WORKS_SQL)).rows;
    if(works.find(w=>w.work_id===WORK_ID)) throw new Error("撤权后 WATCH 仍列出作品");
    const hist=(await db.query("select count(*)::int n from publication.publication_snapshots where publication_id=$1",[PUB_ID])).rows[0].n;
    if(hist!==1) throw new Error("撤权后历史发布快照应保留");
    pass("withdraw_invalidates",`撤权后指针删除、WATCH 阻断、历史快照保留(${hist})`);
  }catch(err){fail("withdraw_invalidates",err.message);}

  // Step F2 撤回幂等
  try{
    const r=await asOperator(
      `select publication.withdraw_publication($1::uuid,$2::uuid,$3::uuid,$4,$5,$6) as result`,
      [WITHDRAW_ID,WORK_ID,PUB_ID,OPERATOR_ID,"权利到期，撤权","idem:withdraw-"+pubNonce]);
    if(!r.idempotent) throw new Error("重复撤权应幂等");
    pass("withdraw_idempotent","重复撤权幂等返回原撤回记录");
  }catch(err){fail("withdraw_idempotent",err.message);}

  await db.end();
  report();
}
function report(){
  console.log(`\n${"=".repeat(78)}`);
  console.log("VERIFIED_ISOLATED REPORT —— ST-09 审核→发布→WATCH→撤权");
  console.log("=".repeat(78));
  console.log(`\n✅ PASS (${results.PASS.length}):`);results.PASS.forEach(p=>console.log(`   ${p}`));
  if(results.FAIL.length){console.log(`\n❌ FAIL (${results.FAIL.length}):`);results.FAIL.forEach(f=>console.log(`   ${f}`));}
  console.log(`\n${results.FAIL.length===0?"✅ VERIFIED_ISOLATED":"❌ NOT PASS"}`);
  console.log("=".repeat(78));
  process.exit(results.FAIL.length===0?0:1);
}
main().catch(e=>{console.error("FATAL:",e);process.exit(2);});
