// M2: trusted, bounded LOCAL snapshot for a separately authorized resumed
// stage. Reading a file grants no execution, Owner access, or Gate PASS.
import fs from "node:fs";
import path from "node:path";
import { isTypedD01Carrier } from "./adapter-binding.mjs";

const MAX=128*1024;
const STAGES=new Set(["D01","D02","D03","D04","D05"]);
const PRIVATE="mohen.private-evidence-stage-request.v1";
const PRIVATE_FIELDS={
  // D01 accepts the exact typed request the bound D00 adapter produces
  // (schema/stage/originalId + method_plan + page|text), and the legacy
  // text-byte-range (extent/quote) or bare scanned-page forms. Shape is
  // validated by isTypedD01Carrier, the same authority used by Gate binding;
  // this list only bounds the allowed key set.
  D01:new Set(["schema","stage","originalId","extent","quote","page","text","method_plan"]),
  // D02 accepts either the new H05 observation form, or the legacy text
  // bridge link form. D03 accepts either the new W07 claim form, or the
  // legacy claim link form. D04/D05 have exactly one form each.
  D02:new Set(["schema","stage","originalId","readUnitId","observation",
    "evidenceId","extent","quote","extentOrder"]),
  D03:new Set(["schema","stage","originalId","evidenceId","claim","claimRevisionId","supportType"]),
  D04:new Set(["schema","stage","originalId","claimRevisionId","finding"]),
  D05:new Set(["schema","stage","originalId","findingId","projection"]),
};
const PRIVATE_SHAPE={
  D01(value){
    // Legacy text-byte-range form (no method_plan carrier).
    if(value.extent||value.quote)return !value.extent||!value.quote?"invalid":"text";
    // D00's real typed output and the bare typed carrier forms are validated by
    // the same authority the Gate binding uses, so resume and Gate agree.
    return isTypedD01Carrier(value)?"scanned_page":"invalid";
  },
  // D02/D03 互斥形态：observation 或 link 二选一，混用即失败关闭。
  D02(value){
    if(value.observation)return value.evidenceId===undefined&&value.extent===undefined&&
      value.quote===undefined&&value.extentOrder===undefined?"observation":"invalid";
    return value.evidenceId!==undefined&&value.extent!==undefined&&value.quote!==undefined?"link":"invalid";
  },
  D03(value){
    if(value.claim)return value.claimRevisionId===undefined&&value.supportType===undefined?"claim":"invalid";
    return value.claimRevisionId!==undefined&&value.supportType!==undefined?"link":"invalid";
  },
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
    // 先判符号链接再做 realpath：Windows 上 realpath 解析符号链接可能抛 ENOENT/EPERM，
    // 会把“链接被拒绝”误报成 UNAVAILABLE；此处统一按 INVALID 失败关闭，两平台同义。
    li=fs.lstatSync(filePath);
    if(li.isSymbolicLink())throw Error("TRUSTED_RESUME_INPUT_INVALID");
    actual=fs.realpathSync(filePath);
    di=fs.statSync(dir);fi=fs.statSync(actual);
  }catch(error){
    if(error?.message==="TRUSTED_RESUME_INPUT_INVALID")throw error;
    throw Error("TRUSTED_RESUME_INPUT_UNAVAILABLE");
  }
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
      // 每个私有 stage 只接受一种已定义形态：D01 文本区间或扫描页 locator、
      // D02/D03 observation/link 互斥、其余不设多形态。
      if(shape(value)==="invalid")
        throw Error("PRIVATE_EVIDENCE_RESUME_SHAPE_INVALID");
    }
  }
  // The independent signed execution grant later binds executionDigest(value),
  // current Registry, job, mode and one-use nonce. This file alone is inert.
  return value;
}
