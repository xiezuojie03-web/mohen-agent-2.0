import assert from 'node:assert/strict';
import test from 'node:test';
import { createG2ResumeQualificationChecker } from '../../pipelines/data-production/orchestrator/d03-g2-qualification.mjs';

const runId='33333333-3333-4333-8333-333333333333';
const evidence='031dd3d9-1111-4111-8111-111111111111';
const audit='1a9402cb-3111-4b2b-86ba-7a06ad1bf78b';
const sha='a'.repeat(64);
const input={schema:'mohen.private-evidence-stage-request.v1',stage:'D03',
 originalId:'11111111-1111-4111-8111-111111111111',evidenceId:evidence,
 claim:{assertion:'《上海地名志》记载青浦县低田科则',change_type:'gazetteer_tax_quota_observation',
  time_scope:{note:'unresolved',qualification:'UNASSESSED'},support_type:'supports'}};
const receipt={qualification_current:true,decision_origin:'independent_gate',result:'PASS',
 stage:'D02',gate_code:'G2',job_id:'d02.material-understanding',
 reviewer_binding_ref:'m5-owner-reviewer-g2g5-producer',consumer:'producer',
 evidence_id:evidence,gate_audit_id:audit,artifact_revision:sha,
 valid_until:new Date(Date.now()+86400000).toISOString()};
const checker=(over={})=>createG2ResumeQualificationChecker({readG2:async()=>over.receipt??receipt,
 d02JobId:'d02.material-understanding',gateReviewerBinding:'m5-owner-reviewer-g2g5-producer'});

test('current independent G2 for the exact evidence qualifies the D03 input',async()=>{
 assert.equal(await checker()({run_id:runId,input,stage:'D03'}),true);
});

test('non-current, superseded, wrong-stage or wrong-evidence G2 fails closed',async()=>{
 for(const r of [
  {...receipt,qualification_current:false},
  {...receipt,decision_origin:'producer'},
  {...receipt,result:'HOLD'},
  {...receipt,stage:'D01'},
  {...receipt,gate_code:'G1'},
  {...receipt,job_id:'d03.world-construction'},
  {...receipt,reviewer_binding_ref:'other'},
  {...receipt,consumer:'consumer'},
  {...receipt,evidence_id:'ffffffff-ffff-4fff-8fff-ffffffffffff'},
  {...receipt,valid_until:new Date(Date.now()-1000).toISOString()},
 ]) assert.equal(await checker({receipt:r})({run_id:runId,input,stage:'D03'}),false);
 assert.equal(await checker()({run_id:runId,input,stage:'D02'}),false);
});

test('reader errors and malformed inputs fail closed',async()=>{
 const failing=createG2ResumeQualificationChecker({readG2:async()=>{throw Error('reader down');},
  d02JobId:'d02.material-understanding',gateReviewerBinding:'m5-owner-reviewer-g2g5-producer'});
 assert.equal(await failing({run_id:runId,input,stage:'D03'}),false);
 assert.equal(await checker()({run_id:'bad',input,stage:'D03'}),false);
 assert.equal(await checker()({run_id:runId,input:{...input,evidenceId:'bad'},stage:'D03'}),false);
 assert.equal(await checker()({run_id:runId,input:{...input,claim:null,claimRevisionId:null},stage:'D03'}),false);
});
