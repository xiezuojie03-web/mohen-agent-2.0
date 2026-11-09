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

// F05 per-entry governance line: report only what is actually stored.
// Missing refs/evaluation are shown as gaps, never back-filled or hidden;
// this view never issues or implies an independent G0—G5 qualification.
export function assetGovernanceSummary(asset:{source_refs?:unknown;dependency_refs?:unknown;validation?:unknown}):string {
 const src=countStoredRefs(asset.source_refs),dep=countStoredRefs(asset.dependency_refs);
 const gaps:string[]=[];
 if(src===0)gaps.push("未登记来源引用");
 if(dep===0)gaps.push("未登记依赖引用");
 const validation=asset.validation;
 const status=validation&&typeof validation==="object"&&!Array.isArray(validation)
  ?(validation as Record<string,unknown>).status:undefined;
 if(status!=="CHECKED")gaps.push("存储验证未通过评估");
 const provenance=(src===null||dep===null)?"来源/依赖记录状态未知 · ":"";
 const gapText=gaps.length?gaps.join("；"):"无已登记缺口";
 return provenance+`缺口：${gapText} · 独立G资格：须按对象逐案核验，本视图不签发不替代`;
}

function refCounts(value:unknown):{total:number|null;resolved:number|null;blocked:number|null} {
  if(!value||typeof value!=='object'||Array.isArray(value))return {total:null,resolved:null,blocked:null};
  const record=value as Record<string,unknown>;
  const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
  return {total:num(record.total),resolved:num(record.resolved),blocked:num(record.blocked)};
}

// QR-07 reverse lookup: each stored ref is reported against the object it
// actually names. A ref that cannot be resolved stays visible as BLOCKED, and
// an empty set is unknown dependency, never "no dependency".
export function assetBacklinkSummary(report:unknown):string {
  if(!report||typeof report!=='object'||Array.isArray(report))return '回链解析：未读取';
  const record=report as Record<string,unknown>;
  const source=refCounts(record.source),dependency=refCounts(record.dependency);
  const show=(label:string,counts:{total:number|null;resolved:number|null;blocked:number|null})=>{
    if(counts.total===null)return `${label}未登记`;
    if(counts.total===0)return `${label}0条（视为未知依赖，不得当作无依赖放行）`;
    return `${label}${counts.resolved??0}/${counts.total}可解析${counts.blocked?`，${counts.blocked}条不可解析`:''}`;
  };
  const useCount=typeof record.use_event_count==='number'?record.use_event_count:null;
  return `回链解析：${show('来源',source)} · ${show('依赖',dependency)} · 使用事件 ${useCount===null?'未知':useCount+'条'}`;
}

export function assetConsumptionSummary(report:unknown):string {
  if(!report||typeof report!=='object'||Array.isArray(report))return '消费判定：未读取';
  const decision=(report as Record<string,unknown>).decision;
  if(!decision||typeof decision!=='object'||Array.isArray(decision))return '消费判定：未读取';
  return ['read','quote','display','download','adapt','external_processing'].map(action=>{
    const entry=(decision as Record<string,unknown>)[action];
    if(!entry||typeof entry!=='object'||Array.isArray(entry))return `${action}: 未判定`;
    const value=entry as Record<string,unknown>;
    const blockers=Array.isArray(value.blockers)&&value.blockers.length?`(${value.blockers.join(',')})`:'';
    return `${action}: ${typeof value.disposition==='string'?value.disposition:'未判定'}${blockers}`;
  }).join(' · ');
}
