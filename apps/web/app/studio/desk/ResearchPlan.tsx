'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
type PlanAsset={asset_id:string;revision_id:string;delegation_id?:string;control?:{state:string};payload:{title?:string;plan?:{nodes?:{node_id:string;category:string;dependencies:string[]}[]}}};
type Source={revision_id:string;asset_id:string;payload:unknown};
const field={width:'100%',padding:8,border:'1px solid #c9c2b4',borderRadius:5,font:'inherit',boxSizing:'border-box' as const};
export default function ResearchPlan({projectId,sources}:{projectId:string;sources:Source[]}){
 const [question,setQuestion]=useState(''),[plans,setPlans]=useState<PlanAsset[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [nextCursor,setNextCursor]=useState<string|null>(null);
 const cancelRequests=useRef<Record<string,string>>({});
 const attempt=useRef<{question:string;body:Record<string,unknown>}|null>(null);
 useEffect(()=>{const c=new AbortController();fetch('/api/studio/plans?'+new URLSearchParams({project_id:projectId}),{cache:'no-store',signal:c.signal})
  .then(async r=>{const b=await r.json();if(!r.ok||!b.ok)throw Error();return b;}).then(b=>{setPlans(b.plans as PlanAsset[]);setNextCursor(b.next_cursor??null);})
  .catch(()=>{if(!c.signal.aborted)setMessage('暂时无法读取研究计划，已保存记录不受影响。');});return()=>c.abort();},[projectId]);
 async function save(e:FormEvent){
  e.preventDefault();if(busy||!question.trim())return;
  if(attempt.current?.question!==question)attempt.current={question,body:{project_id:projectId,asset_id:crypto.randomUUID(),root_task_ref:crypto.randomUUID(),
   series_id:crypto.randomUUID(),request_id:crypto.randomUUID(),question:question.trim(),source_revision_ids:sources.map(s=>s.revision_id).slice(0,16),expires_at:new Date(Date.now()+3600000).toISOString()}};
  setBusy(true);setMessage('');
  try{const r=await fetch('/api/studio/plans',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify(attempt.current.body)}),b=await r.json();
   if(!r.ok||!b.ok)throw Error(r.status===401?'登录已失效，请重新登录。':r.status===409?'计划版本冲突，请保留问题后重新读取。':'计划暂未保存，请重试；当前问题仍保留。');
   setPlans(p=>[{...b.asset,delegation_id:b.delegation.delegation_id,control:b.control},...p.filter(x=>x.asset_id!==b.asset.asset_id)]);setQuestion('');attempt.current=null;setMessage(b.control?.state==='REVOKED'?'这份委托已撤销，计划与回执保留。':'研究计划已保存，尚未执行。资料资格、外发许可和预算核准后才能继续。');
  }catch(e){setMessage(e instanceof Error?e.message:'计划暂未保存，请重试。');}finally{setBusy(false);}
 }
 async function recover(plan:PlanAsset){
  if(busy)return;setBusy(true);setMessage('');
  try{const r=await fetch('/api/studio/plans',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({recover_revision_id:plan.revision_id})}),b=await r.json();
   if(!r.ok||!b.ok)throw Error();setPlans(current=>current.map(p=>p.asset_id===plan.asset_id?{...b.asset,delegation_id:b.delegation.delegation_id,control:b.control}:p));setMessage(b.control?.state==='REVOKED'?'这份委托已撤销，计划与回执保留。':'委托登记已确认，计划仍未执行。');
  }catch{setMessage('登记尚未确认，可能已过期或前提变更；原计划仍保留。');}finally{setBusy(false);}
 }
 async function more(){
  if(!nextCursor||busy)return;setBusy(true);setMessage('');
  try{const r=await fetch('/api/studio/plans?'+new URLSearchParams({project_id:projectId,cursor:nextCursor}),{cache:'no-store',signal:AbortSignal.timeout(15000)}),b=await r.json();
   if(!r.ok||!b.ok)throw Error();
   setPlans(current=>[...current,...(b.plans as PlanAsset[]).filter(p=>!current.some(x=>x.asset_id===p.asset_id))]);setNextCursor(b.next_cursor??null);
  }catch{setMessage('较早计划暂未读取，请重试。当前计划仍保留。');}finally{setBusy(false);}
 }
 async function cancel(plan:PlanAsset){
  if(!plan.delegation_id||busy)return;
  const id=plan.delegation_id;cancelRequests.current[id]??=crypto.randomUUID();setBusy(true);setMessage('');
  try{const r=await fetch('/api/studio/delegations/'+id+'/controls',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(15000),
   body:JSON.stringify({action:'revoke',request_id:cancelRequests.current[id],reason:'Owner撤销研究委托'})}),b=await r.json();
   if(!r.ok||!b.ok||b.control?.state!=='REVOKED')throw Error();
   setPlans(current=>current.map(p=>p.asset_id===plan.asset_id?{...p,control:b.control}:p));setMessage('委托已撤销，原计划与回执仍保留。');
  }catch{setMessage('暂时无法确认撤销结果，请重试；不会显示为已撤销。');}finally{setBusy(false);}
 }
 return <section aria-label="研究计划" style={{marginTop:20,borderTop:'1px solid #e2ddd1',paddingTop:14}}>
  <h3 style={{fontSize:16}}>研究计划与待办</h3><p style={{fontSize:13,color:'#5c6662'}}>先复用已保存资料，再安排补证和研究。保存计划不会调用外部 AI、扣费或发布知识。</p>
  <form onSubmit={save}><label>研究问题<textarea aria-label="研究计划问题" rows={3} style={field} value={question} maxLength={2000} disabled={busy} onChange={e=>setQuestion(e.target.value)}/></label>
   <button type="submit" disabled={busy||!question.trim()} style={{marginTop:8,padding:'8px 12px'}}>{busy?'正在保存计划…':'保存研究计划'}</button></form>
  <p aria-live="polite" style={{fontSize:13,color:'#375b49'}}>{message}</p>
  {plans.map(p=><article key={p.asset_id} style={{border:'1px solid #e2ddd1',padding:10,borderRadius:5,marginTop:8}}><strong>{typeof p.payload.title==='string'?p.payload.title:'研究计划'}</strong><p style={{fontSize:13}}>{({READY:'已保存 · 等待核准',LEASED:'步骤已领取 · 未确认完成',IN_FLIGHT:'执行中 · 费用待核',HOLD:'已暂停 · 需补前提或核销',COMPLETED:'步骤已回写完成 · 知识资格仍需核验',REVOKED:'已撤销 · 计划与回执保留'}as Record<string,string>)[p.control?.state??'']??'已保存 · 待补前提 · 未执行'}</p>
   <ol style={{fontSize:13}}>{(Array.isArray(p.payload.plan?.nodes)?p.payload.plan.nodes:[]).filter(n=>n&&typeof n.node_id==='string'&&typeof n.category==='string').map(n=><li key={n.node_id}>{({reuse_asset:'复用有权资料',external_delegate:'委托补充候选（待外发与预算授权）',existing_production:'交既有知识生产线（待资格）',receive_candidate:'逐项核对候选回包'}as Record<string,string>)[n.category]??'研究待办'}</li>)}</ol>{p.delegation_id?<button type="button" disabled={busy||p.control?.state==='REVOKED'} onClick={()=>cancel(p)}>撤销委托</button>:<button type="button" disabled={busy} onClick={()=>recover(p)}>继续登记委托</button>}</article>)}
 {nextCursor?<button type="button" onClick={more} disabled={busy}>读取较早计划</button>:null}
 </section>;
}
