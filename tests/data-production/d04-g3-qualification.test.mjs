import assert from 'node:assert/strict';
import test from 'node:test';
import { createG3ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d04-g3-qualification.mjs';

const runId='44444444-4444-4444-8444-444444444444';
const claim='0617b049-1111-4111-8111-111111111111';
const audit='f1d9163e-3111-4b2b-86ba-7a06ad1bf78b';
const sha='a'.repeat(64);
const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D04',
 originalId:'11111111-1111-4111-8111-111111111111',claimRevisionId:claim,
 finding:{method_id:'A06',finding_type:'bounded_interpretive_finding',human_question:'材料记载了什么？',
  interpretive_statement:'依据合格主张，材料记载了某事。',counter_view_or_alternative:['待复核。'],
  missing_evidence:['统计口径'],uncertainty:{qualification:'UNASSESSED'},purpose_code:'BE'}};
const receipt={qualification_current:true,decision_origin:'independent_gate',result:'PASS',
 stage:'D03',gate_code:'G3',job_id:'d03.world-construction',
 reviewer_binding_ref:'m5-owner-reviewer-g2g5-producer',consumer:'producer',
 claim_revision_id:claim,gate_audit_id:audit,artifact_revision:sha,
 valid_until:new Date(Date.now()+86400000).toISOString()};
const checker=(over={})=>createG3ResumeQualificationChecker({readG3:async()=>over.receipt??receipt,
 d03JobId:'d03.world-construction',gateReviewerBinding:'m5-owner-reviewer-g2g5-producer'});

test('current independent G3 for the exact claim revision qualifies the D04 input',async()=>{
 assert.equal(await checker()({run_id:runId,input,stage:'D04'}),true);
});

test('non-current, superseded, wrong-stage or wrong-claim G3 fails closed',async()=>{
 for(const r of [
  {...receipt,qualification_current:false},
  {...receipt,decision_origin:'producer'},
  {...receipt,result:'HOLD'},
  {...receipt,stage:'D02'},
  {...receipt,gate_code:'G2'},
  {...receipt,job_id:'d02.material-understanding'},
  {...receipt,reviewer_binding_ref:'other'},
  {...receipt,consumer:'consumer'},
  {...receipt,claim_revision_id:'ffffffff-ffff-4fff-8fff-ffffffffffff'},
  {...receipt,valid_until:new Date(Date.now()-1000).toISOString()},
 ]) assert.equal(await checker({receipt:r})({run_id:runId,input,stage:'D04'}),false);
 assert.equal(await checker()({run_id:runId,input,stage:'D03'}),false);
});

test('reader errors and malformed inputs fail closed',async()=>{
 const failing=createG3ResumeQualificationChecker({readG3:async()=>{throw Error('reader down');},
  d03JobId:'d03.world-construction',gateReviewerBinding:'m5-owner-reviewer-g2g5-producer'});
 assert.equal(await failing({run_id:runId,input,stage:'D04'}),false);
 assert.equal(await checker()({run_id:'bad',input,stage:'D04'}),false);
 assert.equal(await checker()({run_id:runId,input:{...input,claimRevisionId:'bad'},stage:'D04'}),false);
 assert.equal(await checker()({run_id:runId,input:{...input,finding:null},stage:'D04'}),false);
});
