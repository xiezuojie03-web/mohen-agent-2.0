"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentDecision, Material } from "@mohen/agent-runtime";
import { humanEpistemic } from "../experience/jinze-water-net/humanLabels";
import type { Beat, DirectorPlan, WorkPanels } from "../../lib/studio-creation";

type StudioProject = {project_id:string;project_title:string;research_scope?:unknown};

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
const PIPELINE = ["资料检索", "史料筛选", "事实校验", "编导方案", "分镜生成"];
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
  const [projects,setProjects]=useState<StudioProject[]>([]);
  const [projectId,setProjectId]=useState("");
  const [projectTitle,setProjectTitle]=useState("");
  const [projectLoading,setProjectLoading]=useState(true);
  const [projectBusy,setProjectBusy]=useState(false);
  const [projectError,setProjectError]=useState<string|null>(null);
  const [createProjectOpen,setCreateProjectOpen]=useState(false);
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
        if(!response.ok||body.ok!==true||!Array.isArray(body.projects))throw new Error("研究项目读取失败");
        const items=(body.projects as StudioProject[]).filter(p=>p&&typeof p.project_id==="string"&&typeof p.project_title==="string");
        if(controller.signal.aborted)return;
        setProjects(items);
        setProjectId(old=>items.some(p=>p.project_id===old)?old:items[0]?.project_id??"");
      }catch(error){if(!controller.signal.aborted)setProjectError(error instanceof Error?error.message:"研究项目读取失败");}
      finally{if(!controller.signal.aborted)setProjectLoading(false);}
    })();
    return ()=>controller.abort();
  },[]);

  async function createResearchProject(){
    const title=projectTitle.trim();
    if(!title||projectBusy)return;
    if(projectAttempt.current?.title!==title)projectAttempt.current={title,id:crypto.randomUUID()};
    setProjectBusy(true);setProjectError(null);
    try{
      const response=await fetch("/api/studio/projects",{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({project_id:projectAttempt.current.id,title,scope:{}})});
      const body=await response.json();
      if(!response.ok||body.ok!==true||!body.project?.project_id)throw new Error("研究项目未保存，请重试；项目名称仍保留。");
      setProjects(current=>[body.project,...current.filter(p=>p.project_id!==body.project.project_id)]);
      switchProject(body.project.project_id);setProjectTitle("");setCreateProjectOpen(false);projectAttempt.current=null;
    }catch(error){setProjectError(error instanceof Error?error.message:"研究项目未保存，请重试。");}
    finally{setProjectBusy(false);}
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
  const [production, setProduction] = useState<{ status: string; current_stage: string | null } | null>(null);

  // 画面候选素材（从资产台账取的 verified 素材，预览阶段展示）
  const [mediaCandidates, setMediaCandidates] = useState<Array<{ title: string; license: string; author: string; intendedUse: string }> | null>(null);

  const [mediaError, setMediaError] = useState<string | null>(null);

  // A project switch invalidates only transient client state. Saved server
  // assets/revisions are not deleted; old project Grants must never carry over.
  function switchProject(nextProjectId: string) {
    if (!nextProjectId || nextProjectId === projectId) return;
    setProjectId(nextProjectId);
    setProjectError(null);
    setMessages([]); setInput("");
    setPlans(null); setPreviewPlan(null); setAdoptedDefinition(null); setAdoptedBrief("");
    setAdoptedPlanId(null); setSelectedPlan(null); setBeats(null); setPlansError(null);
    setDelegationId(null); setAuthorizing(false); setNeedsAuthorization(false);
    setActiveTab(0); setPanels(null); setPanelsLoading(false);
    setWorkTitle(""); setSubmitBusy(false); setSubmitMsg(null); setSubmitErr(false);
    submitLock.current = false; creationRequests.current.clear(); requestAttempt.current = null;
    setSavedWork(null); setSubmitted(false); setProduction(null);
    setMediaCandidates(null); setMediaError(null);
  }

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
    if (!text || busy || submitLock.current) return;
    if(projectLoading||!projectId){setProjectError("请先创建或选择研究项目，再提交研究委托。");return;}
    const fingerprint=JSON.stringify({projectId,prompt:text,topic:"generic"});
    if(requestAttempt.current?.fingerprint!==fingerprint)
      requestAttempt.current={fingerprint,id:crypto.randomUUID()};
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/studio/research-tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text, topic: "generic", project_id: projectId, idempotency_key: requestAttempt.current.id }),
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
      if(res.ok&&json.ok&&json.task_id)lastTaskIdRef.current=json.task_id;
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
      // 委托成功后异步轮询真实生产进度（D00–D05）
      if (json.task_id && json.production?.run_id) {
        setProduction({ status: "RUNNING", current_stage: null });
        void pollProduction(json.task_id);
      }
    } catch {
      setMessages((m) => [...m, { role: "mohen", text: "这一下没接上，可以再问一次。" }]);
    } finally {
      setBusy(false);
    }
  }

  // 轮询生产状态（RUNNING 时每 2s 查一次，直到终态）
  async function pollProduction(taskId: string) {
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/studio/research-tasks/${taskId}/production`);
        const j = (await r.json()) as {
          ok?: boolean;
          production?: { status: string; current_stage: string | null } | null;
        };
        if (!j.ok || !j.production) {
          clearInterval(timer);
          return;
        }
        setProduction(j.production);
        if (j.production.status !== "RUNNING") clearInterval(timer);
      } catch {
        clearInterval(timer);
      }
    }, 2000);
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
      setSubmitMsg("请先在「② 研究定方向」选定一个导演方案并生成分镜，再提交。");
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

  function startNewConversation() {
    if (busy || generating || directing || submitBusy || submitLock.current || production?.status === "RUNNING") return;
    const hasLocalContent = messages.length > 0 || Boolean(plans) || Boolean(beats?.length) || Boolean(workTitle.trim());
    if (hasLocalContent && !window.confirm("开始新对话将清空当前页面的临时对话、方案和未保存分镜。服务器上已保存的研究任务、记录及作品不会被删除。确定继续？")) return;
    setMessages([]);
    requestAttempt.current=null;
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
  }

  // 真实对话、分镜、确认投稿的页面步骤；高亮不代表知识资格通过。
  const activeStage = submitted ? 3 : beats?.length ? 2 : messages.length > 0 || busy || plans ? 1 : 0;

  const lastMohen = [...messages].reverse().find((m) => m.role === "mohen");
  const materials = [...new Map(messages.flatMap((message) => message.materials ?? []).map((material) => [material.id, material])).values()];

  return (
    <div className="studio">
      <header className="studio__header">
        <div className="studio__title">
          <h1>创作 Studio</h1>
          <p>用自然语言委托墨痕研究、编导与创作</p>
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
        {/* 左栏 ①：对话委托（人 → 墨痕 的输入口） */}
        <section className="studio__col studio__col--chat">
          <ColumnHead no="①" title="对话委托" desc="你在这里说想法、问问题" />

          <div className="studio__chat-head">
            <button type="button" className="studio__ghost-btn" disabled={busy || generating || directing || submitBusy || production?.status === "RUNNING"} onClick={startNewConversation}>新对话</button>
            <a className="studio__ghost-btn" href="/studio/desk" title="打开已保存的研究项目与记录；此处不是聊天历史">研究记录</a>
            <span className="studio__msg-label" style={{ marginLeft: "auto", alignSelf: "center" }}>
              当前可对话知识：金泽、绿之丘
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",margin:"0 0 10px"}}>
            <label htmlFor="studio-project-select" style={{fontSize:12,color:"#5c6662"}}>当前研究项目</label>
            {projectLoading?<span role="status" style={{fontSize:12}}>正在读取项目…</span>:
              projects.length>0?<select id="studio-project-select" aria-label="当前研究项目" value={projectId}
                disabled={busy||projectBusy||generating||directing||authorizing||submitBusy} onChange={e=>switchProject(e.target.value)}
                style={{maxWidth:"min(100%,280px)",padding:"6px 8px",border:"1px solid #c9c2b4",borderRadius:4}}>
                {projects.map(p=><option key={p.project_id} value={p.project_id}>{p.project_title}</option>)}
              </select>:<span style={{fontSize:12,color:"#8a3b3b"}}>尚未创建研究项目</span>}
            <button type="button" className="studio__ghost-btn" disabled={projectBusy||projectLoading}
              onClick={()=>setCreateProjectOpen(v=>!v)}>新建项目</button>
            <a href="/studio/desk" className="studio__ghost-btn">项目管理</a>
          </div>
          {(createProjectOpen||(!projectLoading&&projects.length===0))&&<div style={{display:"flex",gap:6,marginBottom:8}}>
            <input aria-label="新研究项目名称" value={projectTitle} maxLength={200}
              onChange={e=>setProjectTitle(e.target.value)} placeholder="例如：隋唐大运河与江南水路"
              disabled={projectBusy} style={{flex:1,minWidth:0,padding:"7px 9px",border:"1px solid #c9c2b4",borderRadius:4}}/>
            <button type="button" className="studio__send" disabled={projectBusy||!projectTitle.trim()}
              onClick={()=>void createResearchProject()}>{projectBusy?"保存中…":"创建研究项目"}</button>
          </div>}
          {projectError&&<p role="alert" style={{fontSize:12,color:"#b0413e",margin:"0 0 8px"}}>{projectError}</p>}

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
                {m.materials?.map((mat) => (
                  <div className="studio__material" key={mat.id}>
                    <span className="studio__material-badge">{humanEpistemic(mat.epistemic, false)}</span>
                    <div className="studio__material-snippet">{mat.snippet}</div>
                    <div className="studio__material-source">{mat.sourceRef}</div>
                  </div>
                ))}
                {Boolean(m.gaps?.length) && <div className="studio__gap">缺口已识别，尚未提交正式生产；可继续补充研究材料。</div>}
                {m.gaps?.map((g) => (
                  <div className="studio__gap" key={g}>还缺：{g}</div>
                ))}
                {m.degraded && (
                  <div className="studio__gap">暂时连不上材料库，以上是墨痕能确定的边界，没有替你补内容。</div>
                )}
              </div>
            ))}

            {busy && <div className="studio__typing">墨痕在查资料…</div>}
            {production && (
              <div className="studio__production">
                {production.status === "RUNNING"
                  ? `正在生产（${production.current_stage ?? "启动中"}）…`
                  : production.status === "PASS"
                    ? "生产阶段已结束；知识资格需独立核验。"
                    : `生产结束（${production.status}），详情见任务事件。`}
              </div>
            )}
          </div>

          <div className="studio__composer">
            <input
              value={input}
              placeholder="问墨痕，或描述你想创作的作品…"
              onChange={(e) => setInput(e.target.value)}
              disabled={submitBusy}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ask(input);
              }}
              aria-label="向墨痕委托或提问"
            />
            <button
              className="studio__send"
              disabled={submitBusy || busy || projectLoading || !projectId || input.trim().length === 0}
              onClick={() => void ask(input)}
            >
              {busy ? "查…" : "发送"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EXAMPLES.map((s) => (
              <button key={s} className="studio__tab" onClick={() => void ask(s)}>
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* 中栏 ②：研究定方向（墨痕研究 + 你拍板方案） */}
        <section className="studio__col">
          <ColumnHead no="②" title="研究定方向" desc="墨痕研究，你在这里拍板方案" />

          <div className="studio__panel">
            <h2>研究与作品形成</h2>
            <p className="studio__empty">{busy ? "正在查询资料，已有内容会保留。" : materials.length ? "已获得材料线索；可以继续研究，也可以比较导演方案。" : "等待你的研究委托。"}</p>
            <div className="studio__pipeline" aria-label="可能的研究步骤">
              {PIPELINE.map((p, i) => (
                <div className="studio__pipe" key={p}>
                  <span className="studio__pipe-dot" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="studio__panel">
            <div className="studio__panel-head">
              <h2>导演方案 A / B</h2>
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

          <section className="studio__panel" aria-label="研究资料与知识资产">
            <h2>研究资料与知识资产</h2>
            <p className="studio__empty">材料与知识候选可独立积累，不需要先发布作品。</p>
            <h3>资料线索与待验证候选</h3>
            {materials.length === 0 ? (
              <div className="studio__empty">尚未获得资料；研究返回的材料将保留其来源与认识标签，不自动成为正式资产。</div>
            ) : (
              <div className="studio__materials">
                {materials.map((mat) => (
                  <div className="studio__material" key={mat.id}>
                    <span className="studio__material-badge">{humanEpistemic(mat.epistemic, false)}</span>
                    <div className="studio__material-snippet">{mat.snippet}</div>
                    <div className="studio__material-source">{mat.sourceRef}</div>
                  </div>
                ))}
              </div>
            )}
            <h3>正式合格资产</h3>
            <p className="studio__empty">尚未接入当前资格，不能确认正式资产；上方资料不代表已获专业资格。</p>
          </section>
        </section>

        {/* 右栏 ③：成稿提交（看分镜 + 提交审核） */}
        <section className="studio__col studio__col--preview" aria-label="作品产出">
          <ColumnHead no="③" title="成稿提交" desc="看分镜，起标题，提交审核" />

          <div className="studio__preview">
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
                      : "在「② 研究定方向」保存作品后可查询登记素材候选（登记不等于有权选用）；选定导演方案后，墨痕会在这里生成分镜章节与旁白。"}
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
                    {panelsLoading ? "墨痕在梳理故事结构…" : "保存作品后可查询登记素材候选（登记不等于有权选用）；选定导演方案后，这里展示分镜的章节结构。"}
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
                    {panelsLoading ? "墨痕在设计画面风格…" : "保存作品后可查询登记素材候选（登记不等于有权选用）；选定导演方案后，这里展示画面风格方案。"}
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
                    {panelsLoading ? "墨痕在整理旁白…" : "保存作品后可查询登记素材候选（登记不等于有权选用）；选定导演方案后，这里展示完整旁白。"}
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
                    {panelsLoading ? "墨痕在设计音乐方案…" : "保存作品后可查询登记素材候选（登记不等于有权选用）；选定导演方案后，这里展示音乐方案。"}
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

          <div className="studio__panel">
            <h2>画面候选素材</h2>
            {mediaError && <p role="alert">{mediaError}</p>}
            {mediaCandidates === null ? (
              <div className="studio__empty">保存作品后可查询登记素材候选（登记不等于有权选用）；选定导演方案后，这里列出可用的已登记画面素材。</div>
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
