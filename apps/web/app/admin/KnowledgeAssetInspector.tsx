"use client";

import {useEffect,useRef,useState} from "react";
import {countStoredRefs,privateAssetStatus,assetPayloadPreview,selectInspectedRevision,assetRightsSummary,assetValidationSummary,assetPermissionSummary,assetUseSummary,assetGovernanceSummary,assetBacklinkSummary,assetConsumptionSummary} from "./knowledge-asset-view";

type Project={project_id:string;project_title?:string};
type Asset={asset_id:string;revision_id:string;revision_no?:number;asset_kind?:string;
  epistemic_class?:string;content_state?:string;access_state?:string;
  source_refs?:unknown;dependency_refs?:unknown;payload?:unknown;rights_by_action?:unknown;freshness_state?:string;validation?:unknown;permission_scope?:unknown};
type UseEvent={use_event_id?:string;consumer?:string;requested_action?:string;rights_decision_ref?:string|null;purpose?:unknown;created_at?:string;asset_revision_id?:string};

async function getPrivate(url:string,signal:AbortSignal):Promise<Record<string,unknown>>{
  const reply=await fetch(url,{credentials:"same-origin",cache:"no-store",signal});
  if(!reply.ok)throw Error("私有资产读取失败：请检查当前登录或项目权限。");
  const body:unknown=await reply.json();
  if(!body||typeof body!=="object"||Array.isArray(body)||
    (body as Record<string,unknown>).ok!==true)throw Error("私有资产响应无效。");
  return body as Record<string,unknown>;
}

export default function KnowledgeAssetInspector(){
  const [refresh,setRefresh]=useState(0);
  const [projects,setProjects]=useState<Project[]>([]);
  const [projectId,setProjectId]=useState("");
  const [search,setSearch]=useState("");
  const [query,setQuery]=useState("");
  const [cursor,setCursor]=useState("");
  const [previous,setPrevious]=useState<string[]>([]);
  const [nextCursor,setNextCursor]=useState("");
  const [assets,setAssets]=useState<Asset[]>([]);
  const [assetId,setAssetId]=useState("");
  const [history,setHistory]=useState<Asset[]>([]);
  const [revisionId,setRevisionId]=useState("");
  const [uses,setUses]=useState<UseEvent[]>([]);
  const [references,setReferences]=useState<Record<string,unknown>|null>(null);
  const [loading,setLoading]=useState("projects");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [withdrawConfirm,setWithdrawConfirm]=useState(false);
  const [withdrawBusy,setWithdrawBusy]=useState(false);
  const withdrawalAttempt=useRef<{assetId:string;revisionId:string;key:string}|null>(null);

  useEffect(()=>{
    const c=new AbortController();setError("");setLoading("projects");
    void (async()=>{
      try{
        const d=await getPrivate("/api/studio/projects",c.signal);
        if(!Array.isArray(d.projects))throw Error("项目列表格式无效");
        const items=(d.projects as Project[]).filter(p=>p&&typeof p.project_id==="string");
        if(c.signal.aborted)return;
        setProjects(items);
        setProjectId(old=>items.some(p=>p.project_id===old)?old:items[0]?.project_id??"");
      }catch(e){if(!c.signal.aborted){setError(e instanceof Error?e.message:"项目读取失败");setProjects([]);setProjectId("");}}
      finally{if(!c.signal.aborted)setLoading("");}
    })();
    return ()=>c.abort();
  },[refresh]);

  useEffect(()=>{
    const c=new AbortController();
    setAssets([]);setAssetId("");setRevisionId("");setHistory([]);setUses([]);setNextCursor("");
    if(!projectId)return ()=>c.abort();
    setError("");setLoading("assets");
    void (async()=>{
      try{
        const d=await getPrivate("/api/studio/assets?"+new URLSearchParams({project_id:projectId,browse:"1",q:query,limit:"20",...(cursor?{cursor}:{})}).toString(),c.signal);
        if(!Array.isArray(d.assets))throw Error("资产列表格式无效");
        if(!c.signal.aborted){setAssets((d.assets as Asset[]).filter(
          a=>a&&typeof a.asset_id==="string"&&typeof a.revision_id==="string"));
          setNextCursor(typeof d.next_cursor==='string'?d.next_cursor:'');}
      }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:"资产读取失败");}
      finally{if(!c.signal.aborted)setLoading("");}
    })();
    return ()=>c.abort();
  },[projectId,refresh,query,cursor]);

  useEffect(()=>{
    const c=new AbortController();setHistory([]);setUses([]);setReferences(null);
    if(!assetId||!projectId)return ()=>c.abort();
    const selected=assets.find(a=>a.asset_id===assetId);
    if(!selected)return ()=>c.abort();
    setError("");setLoading("detail");
    const q=(data:Record<string,string>)=>"/api/studio/assets?"+new URLSearchParams(data).toString();
    void (async()=>{
      try{
        const [h,u,r]=await Promise.all([
          getPrivate(q({history:"1",project_id:projectId,asset_id:assetId}),c.signal),
          getPrivate(q({use_events:"1",project_id:projectId,revision_id:revisionId||selected.revision_id}),c.signal),
          getPrivate(q({references:"1",project_id:projectId,revision_id:revisionId||selected.revision_id}),c.signal)
        ]);
        if(!Array.isArray(h.revisions)||!Array.isArray(u.events))throw Error("版本/使用记录格式无效");
        if(!c.signal.aborted){setHistory(h.revisions as Asset[]);setUses(u.events as UseEvent[]);
          setReferences(r.references&&typeof r.references==="object"&&!Array.isArray(r.references)?r.references as Record<string,unknown>:null);}
      }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:"详情读取失败");}
      finally{if(!c.signal.aborted)setLoading("");}
    })();
    return ()=>c.abort();
  },[assetId,projectId,assets,revisionId]);

  const currentAsset=assets.find(a=>a.asset_id===assetId);
  const selected=selectInspectedRevision(currentAsset,history,revisionId);
  const canWithdraw=Boolean(currentAsset?.asset_kind==='consented_feedback'&&currentAsset.access_state!=='REVOKED');
  async function withdrawConsent(){
    if(!canWithdraw||!currentAsset||withdrawBusy||!projectId||!withdrawConfirm)return;
    const current=withdrawalAttempt.current;
    if(!current||current.assetId!==currentAsset.asset_id||current.revisionId!==currentAsset.revision_id)
      withdrawalAttempt.current={assetId:currentAsset.asset_id,revisionId:currentAsset.revision_id,key:crypto.randomUUID()};
    setWithdrawBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/studio/assets/withdraw",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({project_id:projectId,asset_id:currentAsset.asset_id,
          expected_revision_id:currentAsset.revision_id,idempotency_key:withdrawalAttempt.current!.key}),
      });
      const body:unknown=await response.json();
      if(!response.ok||!body||typeof body!=="object"||Array.isArray(body)||
        (body as Record<string,unknown>).ok!==true)throw Error("撤回未确认完成，请核查当前资产版本后重试。");
      const asset=(body as {asset?:Asset}).asset;
      if(!asset||asset.asset_id!==currentAsset.asset_id||asset.access_state!=='REVOKED')
        throw Error("撤回回执不完整，不能报告成功。");
      setWithdrawConfirm(false);withdrawalAttempt.current=null;
      setRevisionId("");setAssets(prev=>prev.map(a=>a.asset_id===asset.asset_id?asset:a));
      setNotice("反馈撤回已保存：旧版本不再可通过普通资产查询读取或复用。");
      setRefresh(v=>v+1);
    }catch(e){setError(e instanceof Error?e.message:"撤回失败，请重新核对");}
    finally{setWithdrawBusy(false);}
  }
  return <section className="admin__assets" aria-label="本人有权访问的受限知识资产">
    <div className="admin__asset">
      <div className="admin__asset-head">
        <strong className="admin__asset-title">受限研究资产 · 真实项目与版本</strong>
        <button className="admin__send" type="button" onClick={()=>setRefresh(n=>n+1)}>刷新</button>
      </div>
      <p>仅查询当前登录账号作为 Owner 有权访问的 Studio 项目。未签发的候选不能以运营审核冒充 G0—G5，也不能自动跨项目复用。</p>
      {projects.map(p=><button key={p.project_id} type="button"
        aria-pressed={p.project_id===projectId} className={"admin__tab"+(p.project_id===projectId?" is-active":"")}
        onClick={()=>{setCursor("");setPrevious([]);setQuery("");setSearch("");setProjectId(p.project_id);}}>{p.project_title||p.project_id}</button>)}
      {projects.length===0&&loading!=="projects"&&!error&&<p>当前账号暂无可访问的研究项目。</p>}
    </div>
    {error&&<p role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    {loading&&<p role="status">正在读取{loading==="projects"?"项目":loading==="assets"?"资产":"修订与使用记录"}…</p>}
    {projectId&&loading!=="projects"&&<div className="admin__asset">
      <strong className="admin__asset-title">项目内资产条目（每页20条）</strong>
      <form onSubmit={e=>{e.preventDefault();setCursor("");setPrevious([]);setQuery(search.trim());}}>
        <label>检索当前项目资产 <input value={search} maxLength={200} onChange={e=>setSearch(e.target.value)} /></label>
        <button type="submit" disabled={Boolean(loading)}>检索</button>
      </form>
      <button type="button" disabled={!previous.length||Boolean(loading)} onClick={()=>{setCursor(previous[previous.length-1]);setPrevious(p=>p.slice(0,-1));}}>上一页</button>
      <button type="button" disabled={!nextCursor||Boolean(loading)} onClick={()=>{setPrevious(p=>[...p,cursor]);setCursor(nextCursor);}}>下一页</button>
      {assets.length===0&&loading!=="assets"&&!error&&<p>这个项目暂无已保存的研究资产。</p>}
      {assets.map(a=><div className="admin__asset" key={a.asset_id}>
        <div className="admin__asset-head">
          <strong className="admin__asset-title">{a.asset_kind||"未分类"} · 修订 {a.revision_no??"—"}</strong>
          <button className="admin__send" type="button" aria-pressed={assetId===a.asset_id}
            onClick={()=>{setRevisionId("");setWithdrawConfirm(false);setNotice("");withdrawalAttempt.current=null;setAssetId(a.asset_id);}}>查看来源与历史</button>
        </div>
        <p className="admin__asset-meta">{privateAssetStatus(a)}</p>
        <p className="admin__asset-meta">{assetGovernanceSummary(a)}</p>
        <p className="admin__asset-meta">来源 {countStoredRefs(a.source_refs)??"未知"} 条 · 依赖 {countStoredRefs(a.dependency_refs)??"未知"} 条</p>
        <p className="admin__asset-meta">资产 {a.asset_id} · 当前修订 {a.revision_id}</p>
      </div>)}
    </div>}
    {selected&&<div className="admin__asset">
      <strong className="admin__asset-title">详细内容与不可变修订（私有，只读）</strong>
      <p className="admin__asset-meta">资产 {selected.asset_id} · 修订 {selected.revision_id}</p>
      <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:240,overflow:"auto"}}>
        {assetPayloadPreview(selected.payload)}
      </pre>
      <p className="admin__asset-meta">保存的来源引用（仅原始记录，不代表验证或授权）</p>
      <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:150,overflow:"auto"}}>
        {assetPayloadPreview(selected.source_refs)}
      </pre>
      <p className="admin__asset-meta">保存的依赖引用（资格仍须独立核实）</p>
      <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:150,overflow:"auto"}}>
        {assetPayloadPreview(selected.dependency_refs)}
      </pre>
      <p className="admin__asset-meta">{assetBacklinkSummary(references)}</p>
      <p className="admin__asset-meta">{assetConsumptionSummary(references)}</p>
      <p className="admin__asset-meta">{assetRightsSummary(selected.rights_by_action)}</p>
      <p className="admin__asset-meta">{assetPermissionSummary(selected.permission_scope)}</p>
      <p className="admin__asset-meta">{assetValidationSummary(selected.validation)}</p>
      <p className="admin__asset-meta">来源依赖状态：{selected.freshness_state||"未知"} · 当前独立资格与复用权利须另行核验</p>
      {currentAsset?.asset_kind==='consented_feedback'&&<div className="admin__asset-meta">
        {currentAsset.access_state==='REVOKED'?<p role="status">此反馈已撤回。历史修订仅显示受限审计元数据，不提供撤回前正文。</p>:
         !withdrawConfirm?<button type="button" disabled={withdrawBusy} onClick={()=>setWithdrawConfirm(true)}>撤回反馈</button>:
         <div>
           <p>确认撤回此反馈？这会写入不可变撤回修订，并阻止旧正文通过普通资产接口重新使用。</p>
           <button type="button" disabled={withdrawBusy} onClick={()=>void withdrawConsent()}>
             {withdrawBusy?"正在撤回…":"确认撤回反馈"}
           </button>
           <button type="button" disabled={withdrawBusy} onClick={()=>setWithdrawConfirm(false)}>取消</button>
         </div>}
      </div>}
      <p className="admin__asset-meta">历史版本 {history.length} 条</p>
      {history.map(r=><div className="admin__asset-meta" key={r.revision_id}>
        <button type="button" aria-pressed={selected.revision_id===r.revision_id}
          onClick={()=>setRevisionId(r.revision_id)}>查看修订 {r.revision_no??"—"}</button>
        {r.revision_id} · {privateAssetStatus(r)}
      </div>)}
      <p className="admin__asset-meta">选定版本使用事件 {uses.length} 条</p>
      {uses.map((u,i)=><div className="admin__asset-meta" key={u.use_event_id??i}>
        {u.consumer||"未知消费者"} · {u.requested_action||"未知动作"} · 权利决定 {u.rights_decision_ref||"未提供"}<br/>{assetUseSummary(u)}
      </div>)}
      {uses.length===0&&loading!=="detail"&&<p>尚无实际使用记录；不能据此推断该资产已有复用或发布许可。</p>}
    </div>}
  </section>;
}
