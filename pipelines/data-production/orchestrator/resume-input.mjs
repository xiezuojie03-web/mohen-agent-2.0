// M2: trusted, bounded LOCAL snapshot for a separately authorized resumed
// stage. Reading a file grants no execution, Owner access, or Gate PASS.
import fs from "node:fs";
import path from "node:path";

const MAX=128*1024;
const STAGES=new Set(["D01","D02","D03","D04","D05"]);
const PRIVATE="mohen.private-evidence-stage-request.v1";
const PRIVATE_FIELDS={
  // D01 accepts either a text-byte-range reading request, or the typed
  // scanned-page request the bound D00 adapter hands to D01.
  D01:new Set(["schema","stage","originalId","extent","quote","page"]),
  D02:new Set(["schema","stage","originalId","evidenceId","readUnitId","extent","quote","extentOrder"]),
  D03:new Set(["schema","stage","originalId","evidenceId","claimRevisionId","supportType"]),
};
const PRIVATE_SHAPE={
  D01(value){return value.extent||value.quote?"text":value.page?"scanned_page":"invalid";},
};
export function loadTrustedResumeInput({stage,filePath,trustedDirectory}={}){
  if(stage==="D00"){
    if(filePath!==undefined&&filePath!==null)throw Error("D00_RESUME_INPUT_FORBIDDEN");
    return undefined;
  }
  if(!STAGES.has(stage))throw Error("STAGE_RANGE_INVALID");
  if(typeof filePath!=="string"||!path.isAbsolute(filePath)||
     typeof trustedDirectory!=="string"||!path.isAbsolute(trustedDirectory))
    throw Error("TRUSTED_RESUME_INPUT_REQUIRED");
  let dir,actual,di,li,fi;
  try{
    dir=fs.realpathSync(trustedDirectory);
    actual=fs.realpathSync(filePath);
    di=fs.statSync(dir);li=fs.lstatSync(filePath);fi=fs.statSync(actual);
  }catch{throw Error("TRUSTED_RESUME_INPUT_UNAVAILABLE");}
  if(!di.isDirectory()||path.dirname(actual)!==dir||li.isSymbolicLink()||
     !fi.isFile()||fi.size<=0||fi.size>MAX)
    throw Error("TRUSTED_RESUME_INPUT_INVALID");
  if(process.platform!=="win32"&&((di.mode&0o077)!==0||(fi.mode&0o077)!==0))
    throw Error("TRUSTED_RESUME_INPUT_PERMISSIONS_INVALID");
  let bytes;
  try{
    const fd=fs.openSync(actual,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
    try{
      const checked=fs.fstatSync(fd);
      if(!checked.isFile()||checked.size!==fi.size||
         checked.dev!==fi.dev||checked.ino!==fi.ino)throw Error();
      bytes=Buffer.alloc(checked.size);
      let offset=0;
      while(offset<bytes.length){
        const n=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);
        if(n<=0)throw Error();
        offset+=n;
      }
    }finally{fs.closeSync(fd);}
  }catch{throw Error("TRUSTED_RESUME_INPUT_UNAVAILABLE");}
  let value;
  try{value=JSON.parse(bytes.toString("utf8"));}
  catch{throw Error("RESUME_INPUT_JSON_INVALID");}
  if(!value||typeof value!=="object"||Array.isArray(value))
    throw Error("RESUME_INPUT_OBJECT_REQUIRED");
  if(value.schema===PRIVATE){
    const keys=PRIVATE_FIELDS[stage];
    if(!keys||value.stage!==stage||Object.keys(value).some(k=>!keys.has(k)))
      throw Error("PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID");
    const shape=PRIVATE_SHAPE[stage];
    if(shape){
      // D01: exactly one request shape — a text byte range (extent+quote) or
      // the typed scanned-page locator produced by the bound D00 adapter.
      const kind=shape(value);
      if(kind==="invalid"||kind==="text"&&(!value.extent||!value.quote)||
         kind==="scanned_page"&&(value.extent||value.quote))
        throw Error("PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID");
      if(kind==="scanned_page"&&(value.page?.kind!=="scanned_page/v1"||
         !Number.isSafeInteger(value.page?.page_number)))
        throw Error("PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID");
    }
  }
  // The independent signed execution grant later binds executionDigest(value),
  // current Registry, job, mode and one-use nonce. This file alone is inert.
  return value;
}
