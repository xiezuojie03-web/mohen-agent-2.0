"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentDecision, Material } from "@mohen/agent-runtime";
import { humanEpistemic } from "../experience/jinze-water-net/humanLabels";
import type { Beat, DirectorPlan, WorkPanels } from "../../lib/studio-creation";

type StudioProject = {project_id:string;project_title:string;research_scope?:unknown};
// The existing Runner writes only bounded terminal diagnostics. A D00
// candidate or an empty status is never equivalent to an independent G0 PASS.
type StudioProductionReadback = {
  status:string;
  current_stage:string|null;
  terminal?:{
    stage:string|null;gate_code:string|null;disposition:string;
    independent_gate_audit_id:string|null;
    reason_code:string|null;verification_error:string|null;
  }|null;
};

type Message = {
  role: "user" | "mohen";
  text: string;
  materials?: Material[];
  gaps?: string[];
  clarify?: string | null;
  degraded?: boolean;
  taskRef?: string;
};

const STAGES = ["对话与构思", "受托研究与编导", "预览与修改", "审核与发布"];
const TABS = ["分镜与脚本", "故事结构", "画面风格", "配音旁白", "背景音乐"];
const EXAMPLES = [
  "寺和桥真的有关系吗？",
  "万安桥和普济桥是什么关系？",
  "我想做一部关于金泽古桥与寺院的作品",
];

function ColumnHead({ no, title, desc }: { no: string; title: string; desc: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "2px 2px 8px",
        borderBottom: "1px solid #e2ddd1",
      }}
    >
      <span
        style={{
          background: "#1f3a2d",
          color: "#fff",
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {no}
      </span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <strong style={{ fontSize: 13, color: "#17201d" }}>{title}</strong>
        <span style={{ fontSize: 11, color: "#6b746f" }}>{desc}</span>
      </div>
    </div>
  );
}

export default function StudioWorkbench() {
  // Owner 决定：研究「项目」对用户隐形。页面不再要求选择或命名项目；用户发出第一句话时
  // 由后台自动建立一份研究底稿并绑定本次创作，界面只把它当作「以往研究档案」在抽屉里可见。
  const [projects,setProjects]=useState<StudioProject[]>([]);
  const [projectId,setProjectId]=useState("");
  const [projectLoading,setProjectLoading]=useState(true);
  const [projectBusy,setProjectBusy]=useState(false);
  const [projectError,setProjectError]=useState<string|null>(null);
  const [draftsOpen,setDraftsOpen]=useState(false);
  const [reopening,setReopening]=useState(false);
  const [resumeNotice,setResumeNotice]=useState<string|null>(null);
  // 底稿改名：只改显示名称，不合并档案、不改 project_id。
  const [renaming,setRenaming]=useState<{id:string;title:string}|null>(null);
  const [renameBusy,setRenameBusy]=useState(false);
  const [renameError,setRenameError]=useState<string|null>(null);
  const projectAttempt=useRef<{title:string;id:string}|null>(null);
  const requestAttempt=useRef<{fingerprint:string;id:string}|null>(null);
  // QR-06: remember the latest Agent research task so external-AI authorization can bind
  // to the same root; the server verifies ownership before accepting the binding.
  const lastTaskIdRef=useRef<string|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      try{
        const response=await fetch("/api/studio/projects",{cache:"no-store",signal:controller.signal});
        const body=await response.json();
        if(!response.ok||body.ok!==true||!Array.isArray(body.projects))throw new Error("研究底稿读取失败");
        const items=(body.projects as StudioProject[]).filter(p=>p&&typeof p.project_id==="string"&&typeof p.project_title==="string");
        if(controller.signal.aborted)return;
        setProjects(items);
      }catch(error){if(!controller.signal.aborted)setProjectError(error instanceof Error?error.message:"研究底稿读取失败");}
      finally{if(!controller.signal.aborted)setProjectLoading(false);}
    })();
    return ()=>controller.abort();
  },[]);

  // 后台建立本次创作的研究底稿。用户看不到这一步，也不需要命名；标题直接取第一句话，
  // 重试时沿用同一个 project_id，避免同一句话生成重复底稿。
  async function ensureProject(brief:string):Promise<string|null>{
    const title=brief.replace(/\s+/g," ").trim().slice(0,40)||"未命名创作";
    if(projectAttempt.current?.title!==title)projectAttempt.current={title,id:crypto.randomUUID()};
    setProjectBusy(true);setProjectError(null);
    try{
      const response=await fetch("/api/studio/projects",{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({project_id:projectAttempt.current.id,title,scope:{auto_created:true}})});
      const body=await response.json();
      if(!response.ok||body.ok!==true||!body.project?.project_id)throw new Error();
      const created=body.project as StudioProject;
      setProjects(current=>[created,...current.filter(p=>p.project_id!==created.project_id)]);
      setProjectId(created.project_id);
      projectAttempt.current=null;
      return created.project_id;
    }catch{
      setProjectError("墨痕没能保存这次创作的底稿，请再发一次；刚才那句话没有丢。");
      return null;
    }finally{setProjectBusy(false);}
  }

  async function renameProject(id:string,title:string){
    const clean=title.trim();
    if(!clean||renameBusy)return;
    setRenameBusy(true);setRenameError(null);
    try{
      const response=await fetch("/api/studio/projects",{method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({project_id:id,title:clean})});
      const body=await response.json();
      if(!response.ok||body.ok!==true||!body.project?.project_id)throw new Error();
      const updated=body.project as StudioProject;
      setProjects(current=>current.map(p=>p.project_id===updated.project_id?{...p,project_title:updated.project_title}:p));
      setRenaming(null);
    }catch{setRenameError("改名没保存成功，原名称还留着。");}
    finally{setRenameBusy(false);}
  }

  type SavedResearchTask = { task_id:string;project_id:string|null;prompt:string;status:string };
  async function reopenProject(project:StudioProject) {
    if (reopening || busy || projectBusy || productionBusy || production?.status === "RUNNING") return;
    setReopening(true);setProjectError(null);
    try {
      const tasksResponse=await fetch("/api/studio/tasks",{cache:"no-store"});
      const tasksBody=await tasksResponse.json() as {ok?:boolean;tasks?:SavedResearchTask[]};
      if (!tasksResponse.ok || !tasksBody.ok || !Array.isArray(tasksBody.tasks)) throw new Error("已保存研究任务暂时无法读取。");
      const task=tasksBody.tasks.find(t=>t.project_id===project.project_id);
      let restored:{taskId:string;status:"done"|"hold";prompt:string;decision:AgentDecision|null}|null=null;
      let priorProduction:StudioProductionReadback|null=null;
      if (task) {
        const statusResponse=await fetch(`/api/studio/research-tasks/${encodeURIComponent(task.task_id)}/status`,{cache:"no-store"});
        const statusBody=await statusResponse.json() as {ok?:boolean;task?:{
          task_id?:string;prompt?:string;status?:string;checkpoint?:unknown
        }};
        if (!statusResponse.ok || !statusBody.ok || !statusBody.task || statusBody.task.task_id!==task.task_id)
          throw new Error("无法确认历史任务的当前资格和项目归属。");
        const raw=statusBody.task.checkpoint;
        let checkpoint:Record<string,unknown>={};
        try {
          const parsed=typeof raw==="string"?JSON.parse(raw):raw;
          if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))checkpoint=parsed as Record<string,unknown>;
        }catch{throw new Error("历史研究回执无效，不能自动恢复。");}
        const studio=checkpoint.studio;
        if (!studio || typeof studio!=="object" ||
            (studio as Record<string,unknown>).project_id!==project.project_id)
          throw new Error("历史任务与所选项目不匹配，已拒绝恢复。");
        const read=checkpoint.materialRead;
        const unavailable=read&&typeof read==="object"&&(read as Record<string,unknown>).state==="HOLD";
        const decision=checkpoint.decision;
        const validDecision=!unavailable&&decision&&typeof decision==="object"&&!Array.isArray(decision)
          ?decision as AgentDecision:null;
        restored={taskId:task.task_id,status:statusBody.task.status==="done"&&!!validDecision?"done":"hold",
          prompt:statusBody.task.prompt??task.prompt,decision:validDecision};
        const prodResponse=await fetch(`/api/studio/research-tasks/${encodeURIComponent(task.task_id)}/production`,{cache:"no-store"});
        if (prodResponse.ok) {
          const p=await prodResponse.json() as {ok?:boolean;production?:StudioProductionReadback|null};
          if(p.ok&&p.production)priorProduction=p.production;
        }
      }
      if (!startNewConversation()) return;
      setProjectId(project.project_id);
      if (restored) {
        lastTaskIdRef.current=restored.taskId;
        setCurrentResearch({taskId:restored.taskId,status:restored.status});
        setMessages([
          {role:"user",text:restored.prompt},
          {role:"mohen",
            text:restored.decision?.mohenLine??"已恢复这份研究任务的原始问题。历史材料尚未通过当前读取复核，不能直接作为合格知识使用。",
            ...(restored.decision?{
              materials:restored.decision.materials,gaps:restored.decision.gaps,clarify:restored.decision.clarifyQuestion,
            }:{gaps:["需要重新核对来源、权利和独立知识资格"]}),
            taskRef:restored.taskId},
        ]);
        setProduction(priorProduction);
        if(priorProduction?.status==="RUNNING")pollProduction(restored.taskId);
        setResumeNotice("已从受授权的持久任务恢复；材料按当前资格重新核验，未自动启动或重发任何模型请求。");
      } else {
        setResumeNotice("已打开保存的项目，但尚无可恢复的研究任务。你可以从这里继续提问。");
      }
      setDraftsOpen(false);
    }catch(error){setProjectError(error instanceof Error?error.message:"暂时无法恢复研究项目。");}
    finally{setReopening(false);}
  }

  // 创作流程状态
  const [plans, setPlans] = useState<{ planId: string; planA: DirectorPlan; planB: DirectorPlan; facts: string[]; brief: string } | null>(null);
  const [previewPlan, setPreviewPlan] = useState<"A" | "B" | null>(null);
  const [adoptedDefinition, setAdoptedDefinition] = useState<DirectorPlan | null>(null);
  const [adoptedBrief, setAdoptedBrief] = useState("");
  const [adoptedPlanId, setAdoptedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | null>(null);
  const [beats, setBeats] = useState<Beat[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [directing, setDirecting] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  // ST-04 Creator 显式外发授权：委托 id 仅存在于本页面会话，刷新即失效
  const [delegationId, setDelegationId] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [needsAuthorization, setNeedsAuthorization] = useState(false);

  // 四面板
  const [activeTab, setActiveTab] = useState(0);
  const [panels, setPanels] = useState<WorkPanels | null>(null);
  const [panelsLoading, setPanelsLoading] = useState(false);

  // 提交状态
  const [workTitle, setWorkTitle] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState(false);
  const submitLock = useRef(false);
  const creationRequests = useRef(new Map<string, string>());
  const [savedWork, setSavedWork] = useState<{ workId: string; revisionId: string; snapshot: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // 生产进度（委托后异步 D00–D05 生产，轮询 control.production_runs）
  const [production, setProduction] = useState<StudioProductionReadback | null>(null);
  const [currentResearch, setCurrentResearch] = useState<{ taskId: string; status: "done" | "hold" } | null>(null);
  const [productionBusy, setProductionBusy] = useState(false);
  const [productionError, setProductionError] = useState<string | null>(null);
  const [privateSources, setPrivateSources] = useState<Array<{
    original_id:string;file_name:string;sha256:string;content_type:string;
    registration_state:"BOUND"|"UNBOUND";source_version_id:string|null;
  }>>([]);
  const [sourceChoice,setSourceChoice]=useState("");
  const [sourcePage,setSourcePage]=useState("");
  const [sourceReadError,setSourceReadError]=useState<string|null>(null);
  useEffect(()=>{
    if(!projectId || !currentResearch){setPrivateSources([]);setSourceChoice("");setSourceReadError(null);return;}
    const controller=new AbortController();
    setPrivateSources([]);setSourceChoice("");setSourceReadError(null);
    void(async()=>{
      try{
        const response=await fetch(`/api/studio/attachments?project_id=${encodeURIComponent(projectId)}`,{
          cache:"no-store",signal:controller.signal
        });
        const body=await response.json() as {ok?:boolean;originals?:Array<{
          original_id:string;file_name:string;sha256:string;content_type:string;
          registration_state:"BOUND"|"UNBOUND";source_version_id:string|null;
        }>};
        if(!response.ok||body.ok!==true||!Array.isArray(body.originals))throw Error("source_unavailable");
        if(!controller.signal.aborted)setPrivateSources(body.originals);
      }catch{if(!controller.signal.aborted)setSourceReadError("项目私有原件或正式来源登记暂时无法核验；不得自动启动D00。");}
    })();
    return()=>controller.abort();
  },[projectId,currentResearch?.taskId]);
  const productionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (productionPollRef.current !== null) clearInterval(productionPollRef.current);
  }, []);
  function stopProductionPoll() {
    if (productionPollRef.current !== null) clearInterval(productionPollRef.current);
    productionPollRef.current = null;
  }

  // 画面候选素材（从资产台账取的 verified 素材，预览阶段展示）
  const [mediaCandidates, setMediaCandidates] = useState<Array<{ title: string; license: string; author: string; intendedUse: string }> | null>(null);

  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (!savedWork) { setMediaCandidates(null); setMediaError(null); return; }
    const controller = new AbortController();
    setMediaCandidates(null); setMediaError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/studio/works/${savedWork.workId}/media-candidates`, {cache:"no-store",signal:controller.signal});
        const body = await response.json();
        if (!response.ok || body.ok !== true || !Array.isArray(body.assets)) throw new Error();
        if (!controller.signal.aborted) setMediaCandidates(body.assets);
      } catch { if (!controller.signal.aborted) setMediaError("素材目录暂不可读；未选择或替换任何素材。"); }
    })();
    return () => controller.abort();
  }, [savedWork?.workId]);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy || projectBusy || submitLock.current) return;
    stopProductionPoll();
    setCurrentResearch(null);
    setSourceChoice("");setSourcePage("");
    lastTaskIdRef.current = null;
    setProduction(null);
    setProductionError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      // 用户不选项目：第一句话时后台自动建立研究底稿并绑定本次创作。
      const activeProjectId = projectId || await ensureProject(text);
      if (!activeProjectId) return;
      const fingerprint=JSON.stringify({projectId:activeProjectId,prompt:text,topic:"generic"});
      if(requestAttempt.current?.fingerprint!==fingerprint)
        requestAttempt.current={fingerprint,id:crypto.randomUUID()};
      const res = await fetch("/api/studio/research-tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text, topic: "generic", project_id: activeProjectId, idempotency_key: requestAttempt.current.id }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        degraded?: boolean;
        decision?: AgentDecision;
        task_id?: string;
        status?: 'done'|'hold';
        hold_reason?: string;
        missing_requirements?: string[];
        production?: { ok?: boolean; run_id?: string; reason?: string } | null;
      };
      if(res.ok&&json.ok)requestAttempt.current=null;
      if (res.ok && json.ok && json.task_id) {
        lastTaskIdRef.current = json.task_id;
        if (json.status === "done" || json.status === "hold")
          setCurrentResearch({ taskId: json.task_id, status: json.status });
      }
      if (res.ok && json.ok && json.status === 'hold') {
        const missing:Record<string,string>={
          REAL_PROVIDER_UNAVAILABLE:'研究模型尚未接通',
          SOURCE_ACQUISITION_UNAVAILABLE:'合法来源获取服务尚未接通',
          AGENT_QUALIFICATION_CONTEXT_REQUIRED:'当前研究用途的知识读取资格尚未配置',
          PERSISTENT_TOOL_LEDGER_REQUIRED:'需要持久研究委托与预算核准',
          PROVIDER_UNDERSTANDING_NOT_VERIFIED:'研究模型未返回可核实的理解结果',
          SOURCE_OR_QUALIFICATION_UNAVAILABLE:'来源获取或当前知识资格服务暂时不可用，有限结果已保留',
        };
        setMessages(m=>[...m,{role:'mohen',text:'委托已保存，研究暂停，尚未完成。',taskRef:json.task_id,
          gaps:json.missing_requirements?.length?json.missing_requirements.map(code=>missing[code]??'相关执行前提尚未满足'):
            [json.hold_reason==='budget'?'需要核准足够的研究预算':'需要核对执行条件或尚未确认的回执，不能直接重试研究']}]);
        return;
      }
      const decision = res.ok && json.ok ? json.decision : undefined;
      if (!decision) {
        setMessages((m) => [...m, { role: "mohen", text: "这一下没接上，可以再问一次。" }]);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          role: "mohen",
          text: decision.mohenLine,
          materials: decision.materials,
          gaps: decision.gaps,
          clarify: decision.clarifyQuestion,
          degraded: !!json.degraded,
        },
      ]);
      // ST-01 saves research/brief only. ST-04 is a separate Creator action:
      // never infer that production has started from the research response.
    } catch {
      setMessages((m) => [...m, { role: "mohen", text: "这一下没接上，可以再问一次。" }]);
    } finally {
      setBusy(false);
    }
  }

  // Poll only a run confirmed by the ST-04 POST. No synthetic progress or PASS.
  function pollProduction(taskId: string) {
    stopProductionPoll();
    productionPollRef.current = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/studio/research-tasks/${encodeURIComponent(taskId)}/production`, { cache: "no-store" });
          const body = (await response.json()) as {
            ok?: boolean;
            production?: StudioProductionReadback | null;
          };
          if (!response.ok || !body.ok || !body.production) {
            stopProductionPoll();
            setProduction({ status: "UNKNOWN", current_stage: null });
            setProductionError("暂时无法复核真实生产状态；不能将其记作成功，请在任务记录中核查回执。");
            return;
          }
          setProduction(body.production);
          if (body.production.status !== "RUNNING") stopProductionPoll();
        } catch {
          stopProductionPoll();
          setProduction({ status: "UNKNOWN", current_stage: null });
          setProductionError("生产状态读取失败，结果尚未核实；已保存的研究记录不会因此丢失。");
        }
      })();
    }, 2000);
  }

  async function requestFormalProduction() {
    if (!currentResearch || currentResearch.status !== "done" || productionBusy || busy ||
        projectBusy || production?.status === "RUNNING") return;
    const taskId = currentResearch.taskId;
    const source=privateSources.find(x=>x.original_id===sourceChoice&&x.registration_state==="BOUND");
    const pageNumber=Number(sourcePage);
    if(!source||!Number.isSafeInteger(pageNumber)||pageNumber<1||pageNumber>10000){
      setProductionError("请选择本项目已与正式来源绑定的原件，并填写原件真实页码；未具备该条件不能申请生产。");
      return;
    }
    setProductionBusy(true);
    setProductionError(null);
    try {
      const response = await fetch(`/api/studio/research-tasks/${encodeURIComponent(taskId)}/production`, {
        method: "POST", headers: { "content-type": "application/json" },
        body:JSON.stringify({original_id:source.original_id,page_number:pageNumber}),cache: "no-store",
      });
      const result = (await response.json()) as { ok?: boolean; run_id?: string; reason?: string };
      if (!response.ok || !result.ok || !result.run_id) {
        const reasons: Record<string, string> = {
          task_not_ready: "研究委托仍在暂停或审查中，不能申请正式生产",
          production_project_binding_required: "这份研究尚未绑定合法的项目身份",
          production_project_forbidden: "当前账户无权在该项目发起生产",
          forbidden: "当前账户无权发起这份生产",
          production_registry_not_active: "专业生产 Registry 尚未授权激活",
          production_job_disabled: "D00—D05 中存在尚未授权的生产工序",
          production_original_selection_required: "请选择当前项目已与正式来源登记绑定的原件和页码",
          production_original_forbidden: "原件不是本账户、本项目的已验证原件",
          production_original_not_bound: "原件尚未绑定准确来源版本，不能作为D00正式输入",
          production_original_check_unavailable: "原件或来源登记暂不可核验，已安全停止",
          production_private_adapter_not_bound: "唯一Registry尚未将可信私有Worker接入六阶段，不能用旧平行Adapter冒充真实原件生产",
          production_acquisition_receipt_required: "可信来源的取得方式与回执尚未完成正式交接，不能开始计费生产",
          production_input_binding_required: "本机独立执行授权与原件输入尚未具备",
          production_authority_start_failed: "本次独立执行授权服务启动失败，已保留失败回执，未运行生产工序",
          production_reservation_reconciliation_required: "上一次预算预留尚未核销，不能重复执行",
          production_reservation_receipt_uncertain: "预算回执未能确认，需先对账",
          production_reservation_conflict: "另一次请求已占用生产预算，请核对原任务",
          budget_hold: "当前研究任务预算不足",
        };
        setProductionError(`正式生产未启动：${reasons[result.reason ?? ""] ?? result.reason ?? "受控生产前提不满足"}。研究委托与已有资料仍保留。`);
        return;
      }
      setProduction({ status: "RUNNING", current_stage: null });
      pollProduction(taskId);
    } catch {
      // A lost POST response is ambiguous: do not automatically retry a possibly
      // already reserved invocation or claim that a Runner was launched.
      setProductionError("启动回执尚未确认，请核查任务记录和预算预留后再决定是否重试。");
    } finally {
      setProductionBusy(false);
    }
  }

  const lastUserBrief = [...messages].reverse().find((m) => m.role === "user")?.text;

  async function authorizeExternal(): Promise<string | null> {
    if (authorizing) return null;
    setAuthorizing(true);
    try {
      const res = await fetch("/api/studio/dispatch-authorizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          idempotency_key: crypto.randomUUID(),
          task_id: lastTaskIdRef.current ?? undefined,
          actions: ["llm_director_h1", "llm_director_h2", "llm_director_h3", "llm_work_panels", "llm_narration_suggest"],
          budget_usd: 1,
          ttl_minutes: 30,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; delegation_id?: string };
      if (res.ok && json.ok && json.delegation_id) {
        setDelegationId(json.delegation_id);
        setNeedsAuthorization(false);
        setPlansError(null);
        return json.delegation_id;
      }
      setPlansError("授权登记失败，未发起任何外部调用。请重试。");
      return null;
    } catch {
      setPlansError("授权登记失败，未发起任何外部调用。请重试。");
      return null;
    } finally {
      setAuthorizing(false);
    }
  }

  async function generatePlans(delegationOverride?: string) {
    const brief = lastUserBrief;
    if (!brief || generating || directing || submitLock.current) return;
    const effectiveDelegation = delegationOverride ?? delegationId;
    setGenerating(true);
    setPlansError(null);
    setPreviewPlan(null);
    try {
      const res = await fetch("/api/studio/director-plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief, topic: "generic", project_id: projectId, ...(effectiveDelegation ? { delegation_id: effectiveDelegation } : {}) }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        reason?: string;
        plan_id?: string;
        planA?: DirectorPlan;
        planB?: DirectorPlan;
        facts?: string[];
      };
      if (res.ok && json.ok && json.planA && json.planB && json.plan_id) {
        setNeedsAuthorization(false);
        setPlans({ planId: json.plan_id, planA: json.planA, planB: json.planB, facts: json.facts ?? [], brief });
      } else if (json.reason === "external_processing_not_authorized") {
        setNeedsAuthorization(true);
        setPlansError("导演生成需要把项目材料发给外部 AI 处理。这是唯一的外发环节：仅限本项目已绑定来源，30 分钟内有效，预算上限 1 美元，逐次调用留回执。");
      } else {
        setNeedsAuthorization(false);
        setPlansError(
          json.reason === "no_material_or_llm"
            ? "没有可用的真实材料或模型，暂时生成不了方案。"
            : "生成方案失败，请重试。"
        );
      }
    } catch {
      setPlansError("生成方案失败，请重试。");
    } finally {
      setGenerating(false);
    }
  }

  async function choosePlan(which: "A" | "B") {
    const plan = which === "A" ? plans?.planA : plans?.planB;
    if (!plan || !plans || directing || generating || submitLock.current) return;
    setDirecting(true);
    setPlansError(null);
    try {
      const res = await fetch(`/api/studio/director-plans/${plans.planId}/select`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ which, ...(delegationId ? { delegation_id: delegationId } : {}) }),
      });
      const json = (await res.json()) as { ok?: boolean; beats?: Beat[] };
      if (res.ok && json.ok && Array.isArray(json.beats) && json.beats.length) {
        setSelectedPlan(which);
        setSubmitted(false);
        setAdoptedPlanId(plans.planId);
        setAdoptedDefinition(plan);
        setAdoptedBrief(plans.brief);
        setBeats(json.beats);
        setPanels(null);
        setMediaCandidates(null);
        setActiveTab(0);
        setPanelsLoading(true);
        try {
          const pres = await fetch(`/api/studio/director-plans/${plans.planId}/panels`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(delegationId ? { delegation_id: delegationId } : {}),
          });
          const pjson = (await pres.json()) as { ok?: boolean; panels?: WorkPanels };
          if (pjson.ok && pjson.panels) setPanels(pjson.panels);
        } catch {
          /* 四面板生成失败不影响分镜 */
        } finally {
          setPanelsLoading(false);
        }
      } else {
        setPlansError("采纳失败，原作品已保留，可以重试。");
      }
    } catch {
      setPlansError("采纳失败，原作品已保留，可以重试。");
    } finally {
      setDirecting(false);
    }
  }

  async function submitWork() {
    const title = workTitle.trim();
    if (submitLock.current || generating || directing || busy) return;

    // 前置校验：未填标题 / 未选定方案并生成分镜时，明确提示，不静默。
    if (!title) {
      setSubmitMsg("请先给作品起个标题。");
      setSubmitErr(true);
      return;
    }
    if (!selectedPlan || !adoptedPlanId || !beats || beats.length === 0) {
      setSubmitMsg("请先在上面选定一个方向并生成分镜，再提交。");
      setSubmitErr(true);
      return;
    }

    submitLock.current = true;
    setSubmitBusy(true);
    setSubmitMsg(null);
    setSubmitErr(false);
    const content = {
      brief: adoptedBrief,
      plan: adoptedDefinition,
      beats: beats ?? [],
    };
    const snapshot = JSON.stringify({ title, content });
    let saved = savedWork;
    try {
      if (saved && saved.snapshot !== snapshot) {
        setSubmitMsg("内容已更改，请先保存新版本再提交；原作品已保留。");
        setSubmitErr(true);
        return;
      }
      if (!saved) {
        let creationId = creationRequests.current.get(snapshot);
        if (!creationId) {
          creationId = crypto.randomUUID();
          creationRequests.current.set(snapshot, creationId);
        }
        const createRes = await fetch("/api/works", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, content, creation_id: creationId }),
        });
        if (!createRes.ok) throw new Error("creation_unavailable");
        const created = (await createRes.json()) as { ok?: boolean; work_id?: string; revision_id?: string };
        if (created.ok !== true || typeof created.work_id !== "string" || !created.work_id ||
            typeof created.revision_id !== "string" || !created.revision_id) throw new Error("creation_not_acknowledged");
        saved = { workId: created.work_id, revisionId: created.revision_id, snapshot };
        setSavedWork(saved);
      }
      // 保存并提交同一导演来源修订；初始草稿不能直接送审。
      const revisionRes = await fetch(`/api/studio/works/${saved.workId}/revisions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan_id: adoptedPlanId,
          expected_revision_no: 1,
          rights_acknowledged: true,
        }),
      });
      if (!revisionRes.ok) throw new Error("revision_unavailable");
      const revision = await revisionRes.json() as { ok?: boolean; revisionId?: string; revisionNo?: number };
      if (revision.ok !== true || typeof revision.revisionId !== "string" || !revision.revisionId ||
          revision.revisionNo !== 2) throw new Error("revision_not_acknowledged");
      saved = { ...saved, revisionId: revision.revisionId };
      setSavedWork(saved);

      const res = await fetch(`/api/works/${saved.workId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision_id: saved.revisionId }),
      });
      if (!res.ok) throw new Error("submission_unavailable");
      const result = await res.json() as { ok?: boolean; work_id?: string; revision_id?: string; status?: string };
      if (result.ok !== true || result.work_id !== saved.workId ||
          result.revision_id !== saved.revisionId || result.status !== "submitted") throw new Error("submission_not_acknowledged");
      setSubmitMsg("已提交审核，运营负责人会在后台处理。");
      setSubmitErr(false);
      setSubmitted(true);
    } catch {
      setSubmitMsg(saved ? "投稿暂未成功，已创建的作品已保留，可以重试。" : "创建作品失败，请重试。");
      setSubmitErr(true);
    } finally {
      submitLock.current = false;
      setSubmitBusy(false);
    }
  }

  function startNewConversation(): boolean {
    if (busy || generating || directing || submitBusy || submitLock.current || productionBusy || production?.status === "RUNNING") return false;
    const hasLocalContent = messages.length > 0 || Boolean(plans) || Boolean(beats?.length) || Boolean(workTitle.trim());
    if (hasLocalContent && !window.confirm("开始新对话将清空当前页面的临时对话、方案和未保存分镜。服务器上已保存的研究任务、记录及作品不会被删除。确定继续？")) return false;
    stopProductionPoll();
    lastTaskIdRef.current = null;
    setCurrentResearch(null);
    setResumeNotice(null);
    setProductionError(null);
    setProductionBusy(false);
    setMessages([]);
    requestAttempt.current=null;
    // 下一句话会重新建立一份底稿，不复用上一部作品的研究档案。
    setProjectId("");
    projectAttempt.current=null;
    setInput("");
    setPlans(null);
    setPreviewPlan(null);
    setAdoptedDefinition(null);
    setAdoptedBrief("");
    setAdoptedPlanId(null);
    setSelectedPlan(null);
    setBeats(null);
    setGenerating(false);
    setDirecting(false);
    setPlansError(null);
    setActiveTab(0);
    setPanels(null);
    setPanelsLoading(false);
    setWorkTitle("");
    setSubmitMsg(null);
    setSubmitErr(false);
    setSubmitted(false);
    setSavedWork(null);
    setProduction(null);
    setMediaCandidates(null);
    creationRequests.current.clear();
    return true;
  }

  // 真实对话、分镜、确认投稿的页面步骤；高亮不代表知识资格通过。
  const activeStage = submitted ? 3 : beats?.length ? 2 : messages.length > 0 || busy || plans ? 1 : 0;

  const lastMohen = [...messages].reverse().find((m) => m.role === "mohen");
  const materials = [...new Map(messages.flatMap((message) => message.materials ?? []).map((material) => [material.id, material])).values()];
  // 中栏只放真实回执：有资料支持的进「这次查到的」，其余进「待验证候选」，缺口原样列出。
  const evidenced = materials.filter((material) => material.epistemic === "FACT_EVIDENCED");
  const candidates = materials.filter((material) => material.epistemic !== "FACT_EVIDENCED");
  const gaps = [...new Set(messages.flatMap((message) => message.gaps ?? []))];
  const materialCard = (material: Material) => {
    const label = humanEpistemic(material.epistemic, false);
    // 引擎可能透出未登记的档位（例如测试夹具的 hypothesis）：不冒充已核实，统一按待核验线索显示。
    const shown = label === material.epistemic ? "待核验线索" : label;
    return (
      <div className="studio__material" key={material.id}>
        <span className="studio__material-badge">{shown}</span>
        <div className="studio__material-snippet">{material.snippet}</div>
        <div className="studio__material-source">{material.sourceRef}</div>
      </div>
    );
  };

  return (
    <div className="studio">
      <header className="studio__header">
        <div className="studio__title">
          <h1>创作 Studio</h1>
          <p>说一句话，墨痕去查资料、给方向，再写成分镜</p>
        </div>
        <div className="studio__stages">
          {STAGES.map((s, i) => (
            <div className={`studio__stage${i === activeStage ? " is-active" : ""}`} key={s}>
              <span className="studio__stage-no">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="studio__body">
        {/* 左栏：一句话委托。项目对用户隐形；历史与研究档案收进可折叠的「研究底稿」抽屉。 */}
        <section className="studio__col studio__col--chat">
          <div className="studio__chat-top">
            <ColumnHead no="①" title="和墨痕说话" desc="想做什么，直接说" />
            <button type="button" className="studio__link-btn" aria-expanded={draftsOpen}
              onClick={()=>setDraftsOpen(v=>!v)}>{draftsOpen?"收起底稿":"研究底稿"}</button>
          </div>

          {draftsOpen&&(
            <div className="studio__drawer">
              <h3>以往研究档案</h3>
              <p className="studio__drawer-note">一次创作一份底稿；改名只改显示名称，不会合并已有记录。</p>
              {projectLoading?<p className="studio__drawer-note">读取中…</p>
                :projects.length===0?<p className="studio__drawer-note">还没有保存过。</p>
                :<ul className="studio__drawer-list">{projects.slice(0,8).map(p=>(
                  <li key={p.project_id}>
                    {renaming?.id===p.project_id?(
                      <span className="studio__rename">
                        <input value={renaming.title} maxLength={200} aria-label="研究底稿新名称"
                          onChange={e=>setRenaming({id:p.project_id,title:e.target.value})}/>
                        <button type="button" className="studio__link-btn" disabled={renameBusy}
                          onClick={()=>void renameProject(p.project_id,renaming.title)}>保存</button>
                        <button type="button" className="studio__link-btn studio__link-btn--muted"
                          onClick={()=>setRenaming(null)}>取消</button>
                      </span>
                    ):(
                      <span className="studio__rename">
                        <span>{p.project_title}</span>
                        <button type="button" className="studio__link-btn" disabled={reopening||busy||productionBusy}
                          onClick={()=>void reopenProject(p)}>{reopening?"核验中…":"继续"}</button>
                        <button type="button" className="studio__link-btn studio__link-btn--muted"
                          onClick={()=>{setRenameError(null);setRenaming({id:p.project_id,title:p.project_title});}}>改名</button>
                      </span>
                    )}
                  </li>
                ))}</ul>}
              {renameError&&<p role="alert" className="studio__error">{renameError}</p>}
              <a className="studio__link-btn" href="/studio/desk">打开完整研究记录</a>
            </div>
          )}

          {projectError&&<p role="alert" className="studio__error">{projectError}</p>}
          {resumeNotice&&<p role="status" className="studio__drawer-note">{resumeNotice}</p>}

          <div className="studio__thread">
            {messages.length === 0 && (
              <div className="studio__hint">
                用一句话告诉墨痕你想创作什么历史作品，或先向它了解一个历史主题。
                <br />
                <span style={{ color: "#6b746f", fontSize: 12 }}>
                  （知识库目前只有金泽、绿之丘两个专题，其它题材墨痕会如实说“还没有”。）
                </span>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`studio__msg studio__msg--${m.role}`}>
                {m.role === "mohen" && <div className="studio__msg-label">墨痕</div>}
                <div>{m.text}</div>
                {m.taskRef && <div className="studio__msg-label">任务编号：{m.taskRef}</div>}
                {m.clarify && <div className="studio__clarify">{m.clarify}</div>}
                {m.degraded && (
                  <div className="studio__gap">暂时连不上材料库，以上是墨痕能确定的边界，没有替你补内容。</div>
                )}
              </div>
            ))}

            {projectBusy && <div className="studio__typing">墨痕在准备这次创作的底稿…</div>}
            {busy && <div className="studio__typing">墨痕在查资料…</div>}
          </div>

          {messages.length === 0 && (
            <div className="studio__starters">
              {EXAMPLES.map((s) => (
                <button key={s} className="studio__tab" onClick={() => void ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="studio__composer">
            <input
              value={input}
              placeholder="我想做一部关于……的作品"
              onChange={(e) => setInput(e.target.value)}
              disabled={submitBusy}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ask(input);
              }}
              aria-label="向墨痕委托或提问"
            />
            <button
              className="studio__send"
              disabled={submitBusy || busy || projectBusy || input.trim().length === 0}
              onClick={() => void ask(input)}
            >
              {busy ? "查…" : "发送"}
            </button>
          </div>

          {messages.length > 0 && (
            <button type="button" className="studio__link-btn studio__link-btn--muted"
              disabled={busy || generating || directing || submitBusy || production?.status === "RUNNING"}
              onClick={startNewConversation}>重新开始另一部作品</button>
          )}
        </section>

        {/* 中栏：研究进展与导演谱（MHKA-02 §3）。只放真实回执，不设静态进度条。 */}
        <section className="studio__col studio__col--research" aria-label="研究资料与知识资产">
          <ColumnHead no="②" title="墨痕在研究什么" desc="查到什么、缺什么、能不能往下走" />

          <div className="studio__research-block">
            <h3>这次查到的</h3>
            {evidenced.length === 0 ? (
              <p className="studio__drawer-note">还没有材料。你提问后，查到的来源与可信度会留在这里。</p>
            ) : (
              <div className="studio__materials">{evidenced.map(materialCard)}</div>
            )}
            <p className="studio__drawer-note">这些材料尚未接入当前资格，只是研究线索，不是已签发的史实。</p>
          </div>

          <div className="studio__research-block">
            <h3>缺口</h3>
            {gaps.length === 0 ? (
              <p className="studio__drawer-note">墨痕还没有报出缺口；这不等于材料已经够用。</p>
            ) : (
              <ul className="studio__drawer-list">{gaps.map((g) => <li key={g}>还缺：{g}</li>)}</ul>
            )}
          </div>

          <div className="studio__research-block">
            <h3>待验证候选</h3>
            {candidates.length === 0 ? (
              <p className="studio__drawer-note">还没有待验证的判断。</p>
            ) : (
              <div className="studio__materials">{candidates.map(materialCard)}</div>
            )}
          </div>

          {currentResearch && (
            <div className="studio__research-block" aria-label="正式知识生产申请">
              <h3>正式知识生产 · D00—D05</h3>
              <p className="studio__drawer-note">研究委托与研究线索不会自动变为合格史实。申请后须按来源、独立 G0—G5 资格及项目授权逐门核验；本步不发布作品。</p>
              {currentResearch.status === "hold"
                ? <p role="status" className="studio__drawer-note">研究委托仍处于暂停状态；请先补齐左侧列出的前提，不能启动正式生产。</p>
                : <>
                    <label className="studio__drawer-note" htmlFor="studio-production-source">项目内已核验并绑定正式来源的原件</label>
                    <select id="studio-production-source" value={sourceChoice} onChange={e=>setSourceChoice(e.target.value)}
                      disabled={productionBusy} aria-label="选择正式生产原件">
                      <option value="">选择一份已绑定原件</option>
                      {privateSources.filter(x=>x.registration_state==="BOUND").map(x=>
                        <option key={x.original_id} value={x.original_id}>{x.file_name} · {x.content_type}</option>)}
                    </select>
                    <label className="studio__drawer-note" htmlFor="studio-production-page">原件真实页码</label>
                    <input id="studio-production-page" type="number" min={1} max={10000} step={1}
                      value={sourcePage} onChange={e=>setSourcePage(e.target.value)}
                      placeholder="请输入准确页码" aria-label="原件真实页码" disabled={productionBusy}/>
                    {privateSources.length>0 && privateSources.every(x=>x.registration_state!=="BOUND") &&
                      <p className="studio__drawer-note" role="status">当前项目已有原件，但尚无已核实的正式来源版本绑定。保存原件不等于通过D00。</p>}
                    {privateSources.length===0 && !sourceReadError &&
                      <p className="studio__drawer-note">当前项目尚无可选择的已登记私有原件。请先从受控上传与来源登记入口完成原件入账。</p>}
                    {sourceReadError && <p role="alert" className="studio__drawer-note">{sourceReadError}</p>}
                    <button type="button" className="studio__ghost-btn"
                      disabled={productionBusy || busy || projectBusy || production?.status==="RUNNING"||
                        !privateSources.some(x=>x.original_id===sourceChoice&&x.registration_state==="BOUND")||
                        !Number.isSafeInteger(Number(sourcePage))||Number(sourcePage)<1}
                      onClick={() => void requestFormalProduction()}>
                      {productionBusy ? "正在核对生产前提…" : "申请进入 D00—D05"}
                    </button>
                  </>}
              {productionError && <p role="alert" className="studio__submit-msg">{productionError}</p>}
            </div>
          )}
          {production && (
            <div className="studio__production" role="status">
              {production.status === "RUNNING"
                ? `正在生产（${production.current_stage ?? "启动中"}）…`
                : production.status === "PASS"
                  ? `本次已执行工序结束（${production.terminal?.stage ?? production.current_stage ?? "未确认阶段"}）；不代表D00—D05或整部作品准出。`
                  : `本次受控生产${production.status === "HOLD" ? "暂停" : "未通过"}（${production.terminal?.stage ?? production.current_stage ?? "阶段未确认"} / ${production.terminal?.gate_code ?? "独立资格未确认"}）${production.terminal?.reason_code ? "：" + production.terminal.reason_code : "；具体原因未持久核实"}${production.terminal?.verification_error ? "（" + production.terminal.verification_error + "）" : ""}。未取得独立知识资格，不得作为合格材料使用。`}
            </div>
          )}

          <div className="studio__panel">
            <div className="studio__panel-head">
              <h2>墨痕给的两种方向</h2>
              <button
                className="studio__ghost-btn"
                disabled={submitBusy || generating || directing || !lastUserBrief}
                onClick={() => void generatePlans()}
              >
                {generating ? "构思中…" : "生成方案"}
              </button>
            </div>

            {plansError && <p role="alert" className="studio__submit-msg" style={{ color: "#b0413e" }}>{plansError}</p>}

            {needsAuthorization && (
              <div className="studio__panel" style={{ borderStyle: "dashed" }}>
                <p className="studio__asset-meta">
                  点击下面的按钮即表示你明确同意：把本项目的已绑定史料发给外部模型（DeepSeek）参与构思，逐次调用单独记账并留存回执，30 分钟后授权自动失效。
                </p>
                <button
                  className="studio__ghost-btn"
                  disabled={authorizing || generating || directing}
                  onClick={() => void authorizeExternal().then((id) => { if (id) void generatePlans(id); })}
                >
                  {authorizing ? "登记授权中…" : "我同意本次外发处理"}
                </button>
              </div>
            )}

            {!plans && !generating && (
              <div className="studio__empty">
                先在左边用一句话委托你的创作意图，然后点“生成方案”，墨痕会基于真实材料给出两种讲故事角度。
              </div>
            )}

            {generating && <div className="studio__typing">墨痕在构思两种方案…</div>}

            {plans && (
              <div className="studio__ab">
                <button
                  className={`studio__plan studio__plan--a studio__plan--select${selectedPlan === "A" && adoptedPlanId === plans.planId ? " is-selected" : ""}`}
                  disabled={submitBusy || generating || directing}
                  aria-pressed={selectedPlan === "A" && adoptedPlanId === plans.planId}
                  onClick={() => setPreviewPlan("A")}
                >
                  <p className="studio__plan-title">方案 A</p>
                  <p className="studio__plan-note">{plans.planA.angle}</p>
                  <ul className="studio__plan-points">
                    {plans.planA.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </button>
                <button
                  className={`studio__plan studio__plan--b studio__plan--select${selectedPlan === "B" && adoptedPlanId === plans.planId ? " is-selected" : ""}`}
                  disabled={submitBusy || generating || directing}
                  aria-pressed={selectedPlan === "B" && adoptedPlanId === plans.planId}
                  onClick={() => setPreviewPlan("B")}
                >
                  <p className="studio__plan-title">方案 B</p>
                  <p className="studio__plan-note">{plans.planB.angle}</p>
                  <ul className="studio__plan-points">
                    {plans.planB.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </button>
              </div>
            )}
            {previewPlan && plans && <div className="studio__plan-preview" aria-label="方案比较预览">
              <p>正在比较方案 {previewPlan}：{(previewPlan === "A" ? plans.planA : plans.planB).angle}；原作品未改变。</p>
              <button className="studio__action" disabled={submitBusy || directing || generating} onClick={() => void choosePlan(previewPlan)}>采纳方案 {previewPlan}</button>
              <button className="studio__ghost-btn" disabled={directing} onClick={() => setPreviewPlan(null)}>取消比较</button>
            </div>}
            {directing && <div className="studio__typing">墨痕在写分镜章节…</div>}
          </div>
        </section>

        {/* 右栏：作品。预览、五个面板、素材与提交都在这里。 */}
        <section className="studio__col studio__col--work" aria-label="作品产出">
          <ColumnHead no="③" title="你的作品" desc="分镜、画面与提交都在这里" />

          <div className={`studio__preview${beats && beats.length > 0 ? "" : " studio__preview--idle"}`}>
            {beats && beats.length > 0 ? (
              <div className="studio__preview-frame">
                <div className="studio__preview-title">{workTitle || "未命名作品"}</div>
                <div className="studio__preview-visual">{beats[0].visual || "（画面描述）"}</div>
                <div className="studio__preview-narration">{beats[0].narration}</div>
                <div className="studio__preview-meta">第 1 / {beats.length} 个分镜</div>
              </div>
            ) : (
              <div className="studio__preview-empty">尚未形成作品。研究发现与材料可以独立积累；比较并采纳导演方案后，作品会在这里逐渐形成。</div>
            )}
          </div>

          {/* 作品还没成形时不摊开五个空面板：先把方向定下来。 */}
          {beats && beats.length > 0 && (<>
          <div className="studio__tabs">
            {TABS.map((t, i) => (
              <button
                key={t}
                className={`studio__tab${activeTab === i ? " is-active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="studio__panel studio__panel--grow">
            {/* 分镜与脚本 */}
            {activeTab === 0 && (
              <>
                <h2>分镜章节与旁白</h2>
                {!beats ? (
                  <div className="studio__empty">
                    {selectedPlan
                      ? "墨痕正在生成分镜…"
                      : "选定一个方向后，墨痕会在这里生成分镜章节与旁白。"}
                  </div>
                ) : (
                  <div className="studio__beats">
                    {beats.map((b, i) => (
                      <div className="studio__beat" key={i}>
                        <div className="studio__beat-head">
                          <span className="studio__beat-no">{String(i + 1).padStart(2, "0")}</span>
                          <span className="studio__beat-title">{b.title}</span>
                        </div>
                        <p className="studio__beat-narration">{b.narration}</p>
                        <div className="studio__beat-visual">画面：{b.visual}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 故事结构 */}
            {activeTab === 1 && (
              <>
                <h2>故事结构</h2>
                {!panels ? (
                  <div className="studio__empty">
                    {panelsLoading ? "墨痕在梳理故事结构…" : "选定方向后，这里展示分镜的章节结构。"}
                  </div>
                ) : (
                  <div className="studio__beats">
                    {panels.storyStructure.map((s, i) => (
                      <div className="studio__beat" key={i}>
                        <div className="studio__beat-head">
                          <span className="studio__beat-no">{s.timecode}</span>
                          <span className="studio__beat-title">{s.title}</span>
                        </div>
                        <div className="studio__beat-visual">画面：{s.visual}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 画面风格 */}
            {activeTab === 2 && (
              <>
                <h2>画面风格</h2>
                {!panels ? (
                  <div className="studio__empty">
                    {panelsLoading ? "墨痕在设计画面风格…" : "选定方向后，这里展示画面风格方案。"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="studio__beat">
                      <div className="studio__beat-title">整体风格</div>
                      <p className="studio__beat-narration">{panels.visualStyle.style || "（未提供）"}</p>
                    </div>
                    <div className="studio__beat">
                      <div className="studio__beat-title">色调</div>
                      <p className="studio__beat-narration">{panels.visualStyle.palette || "（未提供）"}</p>
                    </div>
                    <div className="studio__beat">
                      <div className="studio__beat-title">镜头语言</div>
                      <p className="studio__beat-narration">{panels.visualStyle.shot || "（未提供）"}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 配音旁白 */}
            {activeTab === 3 && (
              <>
                <h2>配音旁白</h2>
                {!panels ? (
                  <div className="studio__empty">
                    {panelsLoading ? "墨痕在整理旁白…" : "选定方向后，这里展示完整旁白。"}
                  </div>
                ) : (
                  <div className="studio__beat">
                    <p className="studio__beat-narration" style={{ whiteSpace: "pre-wrap" }}>
                      {panels.voiceover.full || "（无旁白）"}
                    </p>
                    <div className="studio__gap" style={{ marginTop: 8 }}>{panels.voiceover.note}</div>
                  </div>
                )}
              </>
            )}

            {/* 背景音乐 */}
            {activeTab === 4 && (
              <>
                <h2>背景音乐</h2>
                {!panels ? (
                  <div className="studio__empty">
                    {panelsLoading ? "墨痕在设计音乐方案…" : "选定方向后，这里展示音乐方案。"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="studio__beat">
                      <div className="studio__beat-title">音乐方案</div>
                      <p className="studio__beat-narration">{panels.soundtrack.plan || "（未提供）"}</p>
                    </div>
                    <div className="studio__beat">
                      <div className="studio__beat-title">版权说明</div>
                      <p className="studio__beat-narration">{panels.soundtrack.note || "（未提供）"}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          </>)}

          {savedWork && (
          <div className="studio__panel">
            <h2>画面候选素材</h2>
            {mediaError && <p role="alert">{mediaError}</p>}
            {mediaCandidates === null ? (
              <div className="studio__empty">作品已保存，正在读取已登记的画面素材…</div>
            ) : mediaCandidates.length === 0 ? (
              <div className="studio__empty">暂无可用画面素材（资产台账为空）。</div>
            ) : (
              <div className="studio__media-list">
                {mediaCandidates.map((m) => (
                  <div className="studio__media" key={m.title}>
                    <div className="studio__media-title">{m.title}</div>
                    <div className="studio__media-meta">{m.license || "许可待核"} · {m.author || "作者待核"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          <div className="studio__submit">
            <input
              className="studio__submit-input"
              placeholder="给这部作品起个标题"
              disabled={submitBusy}
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
            />
            <button
              className="studio__action studio__action--primary"
              disabled={submitBusy || busy || generating || directing}
              onClick={() => void submitWork()}
            >
              {submitBusy ? "提交中…" : "提交审核"}
            </button>
          </div>
          {submitMsg && (
            <div className="studio__submit-msg" style={{ color: submitErr ? "#b0413e" : "#2f6b4f", fontWeight: 600 }}>
              {submitMsg}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
