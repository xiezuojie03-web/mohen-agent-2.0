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

export function selectInspectedRevision<T extends {asset_id:string;revision_id:string}>(current:T|undefined,history:T[],revisionId:string):T|null {
 if(!current)return null;
 if(!revisionId||revisionId===current.revision_id)return current;
 return history.find(r=>r.asset_id===current.asset_id&&r.revision_id===revisionId)??null;
}
export function assetRightsSummary(rights:unknown):string {
 if(!rights||typeof rights!=='object'||Array.isArray(rights))return '动作权利未知';
 const value=rights as Record<string,unknown>;
 return ['read','quote','display','download','adapt','external_processing'].map(action=>
  `${action}: ${['allowed','denied','unknown','restricted'].includes(String(value[action]))?value[action]:'unknown'}`).join(' · ');
}

export function assetValidationSummary(validation:unknown):string {
 if(!validation||typeof validation!=='object'||Array.isArray(validation))return '存储验证：未评估；独立G资格仍须核验';
 return '存储验证（不是独立G资格）：'+assetPayloadPreview(validation);
}
export function assetPermissionSummary(scope:unknown):string {
 return scope&&typeof scope==='object'&&!Array.isArray(scope)?'存储授权范围：'+assetPayloadPreview(scope):'授权范围未记录';
}
export function assetUseSummary(event:{purpose?:unknown;created_at?:unknown;asset_revision_id?:unknown;use_event_id?:unknown}):string {
 return ['用途：'+(event.purpose===undefined?'未记录':assetPayloadPreview(event.purpose)),
  '时间：'+(typeof event.created_at==='string'?event.created_at:'未记录'),
  '修订：'+(typeof event.asset_revision_id==='string'?event.asset_revision_id:'未记录'),
  '事件：'+(typeof event.use_event_id==='string'?event.use_event_id:'未记录')].join(' · ');
}
