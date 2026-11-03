"use client";

import {useEffect,useState} from "react";
import {countStoredRefs,privateAssetStatus,assetPayloadPreview} from "./knowledge-asset-view";

type Project={project_id:string;project_title?:string};
type Asset={asset_id:string;revision_id:string;revision_no?:number;asset_kind?:string;
  epistemic_class?:string;content_state?:string;access_state?:string;
  source_refs?:unknown;dependency_refs?:unknown;payload?:unknown};
type UseEvent={use_event_id?:string;consumer?:string;requested_action?:string;rights_decision_ref?:string|null};

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
  const [assets,setAssets]=useState<Asset[]>([]);
  const [assetId,setAssetId]=useState("");
  const [history,setHistory]=useState<Asset[]>([]);
  const [uses,setUses]=useState<UseEvent[]>([]);
  const [loading,setLoading]=useState("projects");
  const [error,setError]=useState("");

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
    setAssets([]);setAssetId("");setHistory([]);setUses([]);
    if(!projectId)return ()=>c.abort();
    setError("");setLoading("assets");
    void (async()=>{
      try{
        const d=await getPrivate("/api/studio/assets?project_id="+encodeURIComponent(projectId),c.signal);
        if(!Array.isArray(d.assets))throw Error("资产列表格式无效");
        if(!c.signal.aborted)setAssets((d.assets as Asset[]).filter(
          a=>a&&typeof a.asset_id==="string"&&typeof a.revision_id==="string"));
      }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:"资产读取失败");}
      finally{if(!c.signal.aborted)setLoading("");}
    })();
    return ()=>c.abort();
  },[projectId,refresh]);

  useEffect(()=>{
    const c=new AbortController();setHistory([]);setUses([]);
    if(!assetId||!projectId)return ()=>c.abort();
    const selected=assets.find(a=>a.asset_id===assetId);
    if(!selected)return ()=>c.abort();
    setError("");setLoading("detail");
    const q=(data:Record<string,string>)=>"/api/studio/assets?"+new URLSearchParams(data).toString();
    void (async()=>{
      try{
        const [h,u]=await Promise.all([
          getPrivate(q({history:"1",project_id:projectId,asset_id:assetId}),c.signal),
          getPrivate(q({use_events:"1",project_id:projectId,revision_id:selected.revision_id}),c.signal)
        ]);
        if(!Array.isArray(h.revisions)||!Array.isArray(u.events))throw Error("版本/使用记录格式无效");
        if(!c.signal.aborted){setHistory(h.revisions as Asset[]);setUses(u.events as UseEvent[]);}
      }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:"详情读取失败");}
      finally{if(!c.signal.aborted)setLoading("");}
    })();
    return ()=>c.abort();
  },[assetId,projectId,assets]);

  const selected=assets.find(a=>a.asset_id===assetId);
  return <section className="admin__assets" aria-label="本人有权访问的受限知识资产">
    <div className="admin__asset">
      <div className="admin__asset-head">
        <strong className="admin__asset-title">受限研究资产 · 真实项目与版本</strong>
        <button className="admin__send" type="button" onClick={()=>setRefresh(n=>n+1)}>刷新</button>
      </div>
      <p>仅查询当前登录账号作为 Owner 有权访问的 Studio 项目。未签发的候选不能以运营审核冒充 G0—G5，也不能自动跨项目复用。</p>
      {projects.map(p=><button key={p.project_id} type="button"
        aria-pressed={p.project_id===projectId} className={"admin__tab"+(p.project_id===projectId?" is-active":"")}
        onClick={()=>setProjectId(p.project_id)}>{p.project_title||p.project_id}</button>)}
      {projects.length===0&&loading!=="projects"&&!error&&<p>当前账号暂无可访问的研究项目。</p>}
    </div>
    {error&&<p role="alert">{error}</p>}
    {loading&&<p role="status">正在读取{loading==="projects"?"项目":loading==="assets"?"资产":"修订与使用记录"}…</p>}
    {projectId&&loading!=="projects"&&<div className="admin__asset">
      <strong className="admin__asset-title">项目内资产条目（最多100条）</strong>
      {assets.length===0&&loading!=="assets"&&!error&&<p>这个项目暂无已保存的研究资产。</p>}
      {assets.map(a=><div className="admin__asset" key={a.asset_id}>
        <div className="admin__asset-head">
          <strong className="admin__asset-title">{a.asset_kind||"未分类"} · 修订 {a.revision_no??"—"}</strong>
          <button className="admin__send" type="button" aria-pressed={assetId===a.asset_id}
            onClick={()=>setAssetId(a.asset_id)}>查看来源与历史</button>
        </div>
        <p className="admin__asset-meta">{privateAssetStatus(a)}</p>
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
      <p className="admin__asset-meta">历史版本 {history.length} 条</p>
      {history.map(r=><div className="admin__asset-meta" key={r.revision_id}>
        修订 {r.revision_no??"—"} · {r.revision_id} · {privateAssetStatus(r)}
      </div>)}
      <p className="admin__asset-meta">当前版本使用事件 {uses.length} 条</p>
      {uses.map((u,i)=><div className="admin__asset-meta" key={u.use_event_id??i}>
        {u.consumer||"未知使用者"} · {u.requested_action||"未知动作"} · 权利决定 {u.rights_decision_ref||"未提供"}
      </div>)}
      {uses.length===0&&loading!=="detail"&&<p>尚无实际使用记录；不能据此推断该资产已有复用或发布许可。</p>}
    </div>}
  </section>;
}
