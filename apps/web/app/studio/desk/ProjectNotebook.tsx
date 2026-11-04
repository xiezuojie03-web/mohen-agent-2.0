'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import ResearchPlan from './ResearchPlan';

type Project={project_id:string;project_title:string};
type Asset={asset_id:string;revision_id:string;asset_kind:string;revision_no:number;supersedes_revision_id:string|null;payload:unknown};
type Draft={title:string;text:string;kind:string};
const emptyDraft: Draft={title:'',text:'',kind:'research_brief'};
const kinds=[['research_brief','研究提纲'],['reading_note','阅读笔记'],['evidence_note','证据笔记'],['humanistic_insight','人文观察'],['relation_hypothesis','关系假说'],['spacetime_candidate','时空线索'],['research_collection','研究集合']] as const;
const kindName=(kind:string)=>kinds.find(([id])=>id===kind)?.[1]??'研究记录';
const panel={border:'1px solid #e2ddd1',borderRadius:8,padding:18,marginBottom:20};
const field={width:'100%',padding:'9px 10px',border:'1px solid #c9c2b4',borderRadius:5,font:'inherit',boxSizing:'border-box' as const};
const button={padding:'8px 12px',border:'1px solid #c9c2b4',borderRadius:5,background:'#f5f2eb',color:'#17201d',cursor:'pointer'};
function draftOf(asset:Asset):Draft {
  const p=asset.payload&&typeof asset.payload==='object'?asset.payload as Record<string,unknown>:{};
  return {title:typeof p.title==='string'?p.title:'',text:typeof p.text==='string'?p.text:'',kind:asset.asset_kind};
}
async function responseBody(response:Response) {
  const body=await response.json();
  if (!response.ok || !body.ok) {
    if(response.status===401)throw new Error('登录已失效，请重新登录后再保存。');
    if(response.status===409)throw new Error('这份记录已有新版本，或当前保存请求发生冲突。你的输入仍保留在编辑框中，请保留内容后重新打开最新记录。');
    if(response.status===404)throw new Error('这份记录不存在，或当前账户无权读取。');
    throw new Error('暂时无法读取或保存，请稍后重试。未保存的输入仍留在编辑框中。');
  }
  return body;
}

export default function ProjectNotebook() {
  const [projects,setProjects]=useState<Project[]>([]);
  const [projectId,setProjectId]=useState('');
  const [projectTitle,setProjectTitle]=useState('');
  const [assets,setAssets]=useState<Asset[]>([]);
  const [draft,setDraft]=useState<Draft>(emptyDraft);
  const [savedDraft,setSavedDraft]=useState<Draft>(emptyDraft);
  const [opened,setOpened]=useState<Asset|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const attempt=useRef<{fingerprint:string;assetId:string;key:string}|null>(null);
  const projectAttempt=useRef<{title:string;id:string}|null>(null);
  const dirty=draft.title!==savedDraft.title||draft.text!==savedDraft.text||draft.kind!==savedDraft.kind;
  const head=opened?assets.find(a=>a.asset_id===opened.asset_id):null;
  const historical=Boolean(opened&&head&&opened.revision_id!==head.revision_id);

  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/studio/projects',{signal:controller.signal,cache:'no-store'}).then(responseBody).then(body=>{
      setProjects(body.projects);setProjectId(body.projects[0]?.project_id??'');
    }).catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'暂时无法读取项目。');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!projectId){setAssets([]);return;}
    const controller=new AbortController();
    setLoading(true);setAssets([]);setOpened(null);setDraft(emptyDraft);setSavedDraft(emptyDraft);attempt.current=null;
    fetch('/api/studio/assets?'+new URLSearchParams({project_id:projectId}),{signal:controller.signal,cache:'no-store'})
      .then(responseBody).then(body=>setAssets(body.assets.filter((a:Asset)=>!(a.payload&&typeof a.payload==='object'&&(a.payload as Record<string,unknown>).schema==='mohen.studio-research-plan.v1')))).catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'暂时无法读取记录。');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[projectId]);

  async function createProject(event:FormEvent) {
    event.preventDefault();if(!projectTitle.trim()||busy||dirty)return;
    const title=projectTitle.trim();
    if(projectAttempt.current?.title!==title)projectAttempt.current={title,id:crypto.randomUUID()};
    setBusy(true);setMessage('');
    try {
      const body=await responseBody(await fetch('/api/studio/projects',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({project_id:projectAttempt.current.id,title,scope:{}})}));
      setProjects(current=>[body.project,...current.filter(p=>p.project_id!==body.project.project_id)]);
      setProjectId(body.project.project_id);setProjectTitle('');projectAttempt.current=null;setMessage('研究项目已保存。');
    }catch(error){setMessage(error instanceof Error?error.message:'项目未保存，请重试。');}finally{setBusy(false);}
  }
  async function openRevision(assetId:string,revisionId:string) {
    if(busy||dirty)return;setBusy(true);setMessage('');
    try {
      const body=await responseBody(await fetch('/api/studio/assets?'+new URLSearchParams({asset_id:assetId,revision_id:revisionId}),{cache:'no-store'}));
      const value=draftOf(body.asset);setOpened(body.asset);setDraft(value);setSavedDraft(value);attempt.current=null;
    }catch(error){setMessage(error instanceof Error?error.message:'暂时无法打开记录。');}finally{setBusy(false);}
  }
  async function save(event:FormEvent) {
    event.preventDefault();if(!projectId||!draft.text.trim()||busy||historical||!dirty)return;
    const fingerprint=JSON.stringify({projectId,assetId:opened?.asset_id??null,revisionId:opened?.revision_id??null,draft});
    if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,assetId:opened?.asset_id??attempt.current?.assetId??crypto.randomUUID(),key:crypto.randomUUID()};
    setBusy(true);setMessage('');
    try {
      const body=await responseBody(await fetch('/api/studio/assets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        project_id:projectId,asset_id:attempt.current.assetId,asset_kind:draft.kind,expected_revision_id:opened?.revision_id??null,
        idempotency_key:attempt.current.key,payload:{title:draft.title,text:draft.text}})}));
      setOpened(body.asset);setSavedDraft({...draft});setAssets(current=>[body.asset,...current.filter(a=>a.asset_id!==body.asset.asset_id)]);
      attempt.current=null;setMessage(`已保存第${body.asset.revision_no}版，可在此项目中重新打开。`);
    }catch(error){setMessage(error instanceof Error?error.message:'保存未完成，请重试。');}finally{setBusy(false);}
  }
  function newRecord() {
    if(dirty||busy)return;setOpened(null);setDraft(emptyDraft);setSavedDraft(emptyDraft);attempt.current=null;setMessage('');
  }

  return <section style={panel} aria-labelledby="notebook-heading">
    <h2 id="notebook-heading" style={{fontSize:19,margin:'0 0 8px'}}>我的研究记录</h2>
    <p style={{fontSize:13,color:'#5c6662'}}>把提纲、阅读和观察保存在研究项目中。保存会保留版本，不会自动发布或成为已核实的知识。</p>
    <form onSubmit={createProject} style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
      <label style={{flex:'1 1 220px'}}>新项目名称
        <input aria-label="新项目名称" style={field} maxLength={200} value={projectTitle} onChange={e=>setProjectTitle(e.target.value)} disabled={busy||dirty}/>
      </label>
      <button style={{...button,alignSelf:'end'}} disabled={busy||dirty||!projectTitle.trim()}>创建项目</button>
    </form>
    <label>当前研究项目
      <select aria-label="当前研究项目" style={{...field,margin:'4px 0 14px'}} value={projectId} disabled={busy||dirty||loading} onChange={e=>{setMessage('');setProjectId(e.target.value);}}>
        <option value="">{loading?'正在读取项目…':'请选择或创建一个研究项目'}</option>
        {projects.map(p=><option key={p.project_id} value={p.project_id}>{p.project_title}</option>)}
      </select>
    </label>
    {projectId?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:18}}>
      <div>
        <h3 style={{fontSize:15,marginTop:0}}>已保存的记录</h3>
        <button type="button" style={button} onClick={newRecord} disabled={busy||dirty}>新建记录</button>
        {loading?<p>正在读取记录…</p>:assets.length===0?<p style={{fontSize:13,color:'#5c6662'}}>还没有保存的记录。在右侧写下第一份提纲或观察。</p>:
          <ul style={{padding:0,listStyle:'none'}}>{assets.map(a=><li key={a.asset_id} style={{marginBottom:7}}>
            <button type="button" style={{...button,width:'100%',textAlign:'left'}} disabled={busy||dirty} onClick={()=>openRevision(a.asset_id,a.revision_id)}>
              {draftOf(a).title||kindName(a.asset_kind)} <span style={{color:'#5c6662',fontSize:12}}>· 第{a.revision_no}版</span>
            </button>
          </li>)}</ul>}
      </div>
      <form onSubmit={save}>
        <label>记录类型<select aria-label="记录类型" style={{...field,margin:'4px 0 10px'}} value={draft.kind} disabled={busy||Boolean(opened)} onChange={e=>setDraft(d=>({...d,kind:e.target.value}))}>
          {kinds.map(([id,title])=><option key={id} value={id}>{title}</option>)}
        </select></label>
        <label>记录标题<input aria-label="记录标题" style={{...field,margin:'4px 0 10px'}} maxLength={200} value={draft.title} disabled={busy||historical} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label>
        <label>记录内容<textarea aria-label="记录内容" style={{...field,margin:'4px 0 10px',resize:'vertical'}} rows={9} maxLength={200000} value={draft.text} disabled={busy||historical} onChange={e=>setDraft(d=>({...d,text:e.target.value}))}/></label>
        {historical?<p style={{fontSize:13,color:'#755421'}}>正在查看历史版本；打开最新版后可以继续修改。</p>:null}
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          <button style={{...button,background:'#263d33',color:'white'}} disabled={busy||loading||historical||!dirty||!draft.text.trim()}>{busy?'处理中…':'保存记录'}</button>
          {dirty?<button type="button" style={button} disabled={busy} onClick={()=>setDraft({...savedDraft})}>撤销未保存修改</button>:null}
          {opened?.supersedes_revision_id&&!dirty?<button type="button" style={button} disabled={busy} onClick={()=>openRevision(opened.asset_id,opened.supersedes_revision_id!)}>查看上一版</button>:null}
          {historical&&head?<button type="button" style={button} disabled={busy} onClick={()=>openRevision(head.asset_id,head.revision_id)}>返回最新版</button>:null}
        </div>
        {dirty?<p style={{fontSize:12,color:'#755421'}}>有未保存的修改。保存后再切换项目或记录。</p>:null}
      </form>
    </div>:null}
    {projectId?<ResearchPlan key={projectId} projectId={projectId} sources={assets}/>:null}
    <p role="status" aria-live="polite" style={{fontSize:13,color:'#375b49',minHeight:18,marginBottom:0}}>{message}</p>
  </section>;
}
