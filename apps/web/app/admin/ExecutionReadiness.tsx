"use client";
import {useCallback,useEffect,useState} from 'react';
import type {CloudExecutionReadiness} from '../../../../pipelines/data-production/orchestrator/cloud-execution-readiness.mjs';

const names:Record<string,string>={execution_authority:'独立执行授权',credential_separation:'执行与签发身份隔离',producer:'生产执行身份',private_worker:'私有原件读取身份',independent_gate:'独立专业审核',private_storage:'私有原件存储'};
export default function ExecutionReadiness({enabled}:{enabled:boolean}) {
  const [report,setReport]=useState<CloudExecutionReadiness|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const load=useCallback(async(signal?:AbortSignal)=>{
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/admin/metrics',{cache:'no-store',signal});
      const data=await response.json();
      if(!response.ok||!data.execution_readiness)throw Error();
      if(!signal?.aborted)setReport(data.execution_readiness);
    }catch{if(!signal?.aborted){setReport(null);setError('暂时无法检查运行配置，请稍后刷新。');}}
    finally{if(!signal?.aborted)setBusy(false);}
  },[]);
  useEffect(()=>{
    if(!enabled){setReport(null);return;}
    const controller=new AbortController();void load(controller.signal);return()=>controller.abort();
  },[enabled,load]);
  if(!enabled)return <p>请以运营角色登录后查看运行配置。</p>;
  return <section aria-label="生产执行配置检查">
    <h3>生产执行配置</h3>
    <p>这里只检查当前部署的配置；独立服务可用性和真实任务运行仍须实测。</p>
    <button type="button" disabled={busy} onClick={()=>void load()}>{busy?'检查中…':'刷新检查'}</button>
    {error&&<p role="alert">{error}</p>}
    {report&&<><p>{report.configuration_ready?'配置检查通过，真实运行尚未验证。':'配置尚未齐备，生产任务保持暂停。'}</p>
      <ul>{report.components.map(c=><li key={c.id}>
        <strong>{names[c.id]??c.id}</strong>：{c.status==='CONFIGURED'?'已配置':c.status==='MISSING'?'待配置':'配置需修正'}
        {c.missing_keys.length>0&&<p>缺少：{c.missing_keys.join('、')}</p>}
      </li>)}</ul></>}
  </section>;
}
