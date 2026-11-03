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
