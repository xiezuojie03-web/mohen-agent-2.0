import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {loadTrustedResumeInput} from "../../pipelines/data-production/orchestrator/resume-input.mjs";
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"mohen-trusted-resume-"));
 fs.chmodSync(root,0o700);
 const file=path.join(root,"D01.json");
 const input={schema:"mohen.private-evidence-stage-request.v1",stage:"D01",
  originalId:randomUUID(),quote:"江",extent:{start_byte:0,end_byte:3}};
 fs.writeFileSync(file,JSON.stringify(input),{mode:0o600});
 return {root,file,input};
}
test("M2 trusted frozen stage input parses without signing or enabling a Gate",()=>{
 const f=fixture();
 try{
  assert.deepEqual(loadTrustedResumeInput({stage:"D01",filePath:f.file,trustedDirectory:f.root}),f.input);
  assert.equal(loadTrustedResumeInput({stage:"D00"}),undefined);
  assert.throws(()=>loadTrustedResumeInput({stage:"D00",filePath:f.file,trustedDirectory:f.root}),/D00_RESUME_INPUT_FORBIDDEN/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test("M2 rejects absent, outside, symlinked, group-readable, oversized snapshots",()=>{
 const f=fixture(),elsewhere=fs.mkdtempSync(path.join(os.tmpdir(),"mohen-outside-"));
 try{
  assert.throws(()=>loadTrustedResumeInput({stage:"D01",filePath:f.file}),/TRUSTED_RESUME_INPUT_REQUIRED/);
  assert.throws(()=>loadTrustedResumeInput({stage:"D01",filePath:f.file,trustedDirectory:elsewhere}),/TRUSTED_RESUME_INPUT_INVALID/);
  const link=path.join(f.root,"alias.json");fs.symlinkSync(f.file,link);
  assert.throws(()=>loadTrustedResumeInput({stage:"D01",filePath:link,trustedDirectory:f.root}),/TRUSTED_RESUME_INPUT_INVALID/);
  if(process.platform!=="win32"){
    fs.chmodSync(f.file,0o644);
    assert.throws(()=>loadTrustedResumeInput({stage:"D01",filePath:f.file,trustedDirectory:f.root}),/TRUSTED_RESUME_INPUT_PERMISSIONS_INVALID/);
    fs.chmodSync(f.file,0o600);
  }
  fs.writeFileSync(f.file,"x".repeat(128*1024+1));
  assert.throws(()=>loadTrustedResumeInput({stage:"D01",filePath:f.file,trustedDirectory:f.root}),/TRUSTED_RESUME_INPUT_INVALID/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});fs.rmSync(elsewhere,{recursive:true,force:true});}
});
test("M2 rejects wrong private stage and extra hidden payloads",()=>{
 const f=fixture();
 try{
  assert.throws(()=>loadTrustedResumeInput({stage:"D02",filePath:f.file,trustedDirectory:f.root}),/PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
  fs.writeFileSync(f.file,JSON.stringify({...f.input,private_original:{raw:"not permitted"}}));
  assert.throws(()=>loadTrustedResumeInput({stage:"D01",filePath:f.file,trustedDirectory:f.root}),/PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
  fs.writeFileSync(f.file,"{malformed");
  assert.throws(()=>loadTrustedResumeInput({stage:"D01",filePath:f.file,trustedDirectory:f.root}),/RESUME_INPUT_JSON_INVALID/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
function privateFixture(stage,extra){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"mohen-trusted-resume-"));
 fs.chmodSync(root,0o700);
 const file=path.join(root,stage+".json");
 const input={schema:"mohen.private-evidence-stage-request.v1",stage,originalId:randomUUID(),...extra};
 fs.writeFileSync(file,JSON.stringify(input),{mode:0o600});
 return {root,file,input};
}
test("M5 batch C parses the D02 observation/link, D03 claim/link and D04/D05 forms",()=>{
 const cases=[
  ["D02",{readUnitId:randomUUID(),observation:{h_type:"H05",literal_reading:"均科正耗平米三斗六升五合",
    source_voice:"official_gazetteer",evidence_type:"gazetteer_tax_quota_observation",
    uncertainty:{qualification:"UNASSESSED"}}}],
  ["D02",{evidenceId:randomUUID(),readUnitId:randomUUID(),extent:{start_byte:0,end_byte:3},
    quote:"江",extentOrder:1}],
  ["D03",{evidenceId:randomUUID(),claim:{assertion:"青浦县低田均科正耗平米三斗六升五合。",
    change_type:"taxation_quota_assessment",time_scope:{note:"n"},support_type:"supports"}}],
  ["D03",{evidenceId:randomUUID(),claimRevisionId:randomUUID(),supportType:"supports"}],
  ["D04",{claimRevisionId:randomUUID(),finding:{finding_type:"institutional_mechanism",
    human_question:"?",interpretive_statement:"!",counter_view_or_alternative:[],
    missing_evidence:[],uncertainty:{qualification:"UNASSESSED"}}}],
  ["D05",{findingId:randomUUID(),projection:{projection_key:"m5.songjiang.tianze.quota-rule.v1",
    payload:{title:"t"}}}],
 ];
 for(const [stage,extra] of cases){
  const f=privateFixture(stage,extra);
  try{
   assert.deepEqual(loadTrustedResumeInput({stage,filePath:f.file,trustedDirectory:f.root}),f.input);
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
});
test("M5 batch C rejects mixed D02/D03 shapes, unknown fields and wrong-stage files",()=>{
 const mixed=privateFixture("D02",{readUnitId:randomUUID(),
   observation:{h_type:"H05",literal_reading:"均科",source_voice:"official_gazetteer",
     evidence_type:"gazetteer_tax_quota_observation",uncertainty:{qualification:"UNASSESSED"}},
   evidenceId:randomUUID(),extent:{start_byte:0,end_byte:3},quote:"江",extentOrder:1});
 try{
  assert.throws(()=>loadTrustedResumeInput({stage:"D02",filePath:mixed.file,trustedDirectory:mixed.root}),
    /PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
 }finally{fs.rmSync(mixed.root,{recursive:true,force:true});}
 const danglingObservation=privateFixture("D02",{readUnitId:randomUUID(),
   observation:{h_type:"H05",literal_reading:"均科",source_voice:"official_gazetteer",
     evidence_type:"gazetteer_tax_quota_observation",uncertainty:{qualification:"UNASSESSED"}},
   evidenceId:randomUUID()});
 try{
  assert.throws(()=>loadTrustedResumeInput({stage:"D02",filePath:danglingObservation.file,trustedDirectory:danglingObservation.root}),
    /PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
 }finally{fs.rmSync(danglingObservation.root,{recursive:true,force:true});}
 const halfLink=privateFixture("D02",{evidenceId:randomUUID(),quote:"江"});
 try{
  assert.throws(()=>loadTrustedResumeInput({stage:"D02",filePath:halfLink.file,trustedDirectory:halfLink.root}),
    /PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
 }finally{fs.rmSync(halfLink.root,{recursive:true,force:true});}
 const mixedClaim=privateFixture("D03",{evidenceId:randomUUID(),
   claim:{assertion:"a",change_type:"t",time_scope:{},support_type:"supports"},
   claimRevisionId:randomUUID(),supportType:"supports"});
 try{
  assert.throws(()=>loadTrustedResumeInput({stage:"D03",filePath:mixedClaim.file,trustedDirectory:mixedClaim.root}),
    /PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
 }finally{fs.rmSync(mixedClaim.root,{recursive:true,force:true});}
 const d04=privateFixture("D04",{claimRevisionId:randomUUID(),finding:{human_question:"?"}});
 try{
  assert.throws(()=>loadTrustedResumeInput({stage:"D05",filePath:d04.file,trustedDirectory:d04.root}),
    /PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
  fs.writeFileSync(d04.file,JSON.stringify({...d04.input,evidenceId:randomUUID()}));
  assert.throws(()=>loadTrustedResumeInput({stage:"D04",filePath:d04.file,trustedDirectory:d04.root}),
    /PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID/);
 }finally{fs.rmSync(d04.root,{recursive:true,force:true});}
});
