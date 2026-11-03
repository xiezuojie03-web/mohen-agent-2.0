// HP11: A private asset/revision is not evidence of independent G0-G5 qualification.
export function countStoredRefs(value: unknown): number | null {
  if(Array.isArray(value)) return value.length;
  if(typeof value==="string") {
    try { const decoded:unknown=JSON.parse(value); return Array.isArray(decoded)?decoded.length:null; }
    catch {return null;}
  }
  return null;
}
export function privateAssetStatus(asset: {
  epistemic_class?:unknown;content_state?:unknown;access_state?:unknown
}):string {
  const label=(v:unknown,fallback:string)=>typeof v==="string"&&v.trim()?v.slice(0,80):fallback;
  return [label(asset.epistemic_class,"来源类型未定"),label(asset.content_state,"状态未定"),
    label(asset.access_state,"权限未定"),"独立G资格未由此视图验证"].join(" · ");
}
export function assetPayloadPreview(payload:unknown):string {
  try {
    const text=typeof payload==="string"?payload:JSON.stringify(payload,null,2);
    return typeof text==="string"?text.slice(0,2000):"未提供可预览内容";
  }catch{return "内容暂不可预览";}
}
