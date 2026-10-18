"use client";

// apps/web/app/experience/jinze-water-net/ExperienceShell.tsx
//
// TASK-0014 — Experience Composition 2.0 导演层。
//
// 链路（§5A 硬规则）：
//   Beat（presentation） → WorldEvidenceState → Surface Eligibility
//   → resolveComposition（只能从 eligible 里选） → Surface Registry → Surface Component
//
// 原则：墨痕少说，世界多变。默认可见文字显著减少；证据按需揭示；
// Evidence 不足时敢于「不画」（UnknownGapSurface）。

import { useMemo, useReducer, useState, useEffect, useRef } from "react";
import {
  createRuntimeState,
  reduceExperience,
  deriveView,
  resolveComposition,
  selectReplanSurface,
  beatForScene,
  validateBeatCoverage,
  SPATIAL_MODE_LABELS,
  type NarrativeLevel,
  type ExperienceScript,
  type FollowupPatch,
  type SpatialMode,
  type SurfaceType,
} from "@mohen/experience-engine";
import { BEATS, TEMPLE_BRIDGE_NON_ANSWER, type BeatPresentation } from "./beats";
import { buildWorldEvidenceState } from "./beats";
import { resolveSurface, UnknownGapSurface } from "./surfaceRegistry";
import type { SliceShape, SurfaceContext, CuratedPhoto } from "./surfaces/types";
import { commonsDirectUrl } from "./surfaces/EvidenceNarrativeSurfaces";
import { projectCulturalWorldState, type CulturalWorldProjectionSource } from "./culturalWorldProjection";
import type { ProductionRelationSummary } from "../../../lib/read-model-bridge";
import IntentGuide from "./IntentGuide";
import MohenPresence from "./MohenPresence";
import ProductionBoard from "./ProductionBoard";
import type { AgentDecision } from "@mohen/agent-runtime";
import { translateIntentToExperience } from "./intentTranslation";
import { humanLevelLabel, surfaceHumanLabel } from "./humanLabels";
import "./experience.css";

export interface ExperienceShellProps {
  script: ExperienceScript;
  patch: FollowupPatch;
  slice: SliceShape;
  /** M4.1（EXP-CULTURAL-03）：008 cultural_* 第一簇只读投影源（jinze-min-001） */
  culturalSource: CulturalWorldProjectionSource;
  /** Stage 1·2.2：今貌影像策划清单（来自 curated manifest，server 端读取后传入） */
  presentDayPhotos: CuratedPhoto[];
  /** Stage 1·2.2：今貌影像主角钩子 */
  presentDayHeroHook?: string;
  /** 第二层：真实数据生产链产出（read_model consumer='visual_stage'）；不可用则降级冻结 JSON */
  productionSummary?: ProductionRelationSummary;
}

const CONFLICT_ORDER: Record<string, string> = {
  "看第一组分歧": "T11-C2",
  "看第二组分歧": "T11-C1",
};

export default function ExperienceShell({
  script,
  patch,
  slice,
  culturalSource,
  presentDayPhotos,
  presentDayHeroHook,
  productionSummary,
}: ExperienceShellProps) {
  const [revealed, setRevealed] = useState<string[]>([]);
  const [revealedConflicts, setRevealedConflicts] = useState<string[]>([]);
  const [templeAsked, setTempleAsked] = useState(false);
  const [templeIncluded, setTempleIncluded] = useState(false);
  const [focusPlace, setFocusPlace] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<"normal" | "photo">("normal");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [nonAnswer, setNonAnswer] = useState<string | null>(null);
  // ADR-003：真正墨痕的裁决结果（理解 → 只读检索 → 选择）。既有 4 个冻结追问按钮保留为降级入口。
  const [agentDecision, setAgentDecision] = useState<AgentDecision | null>(null);
  // D2：内容看板（真实产出）按需展开；顶栏徽章点击切换。
  const [boardOpen, setBoardOpen] = useState(false);

  // —— M4.1：008 cultural_* 只读投影（纯函数、幂等）——真实文化世界进入体验输入
  const projection = useMemo(
    () => projectCulturalWorldState(culturalSource.slice_id, culturalSource),
    [culturalSource]
  );

  // —— Evidence-aware：世界证据状态（FOLLOWUP_REPLAN 的 EvidenceDecision 只消费它，不读答案 JSON）
  const world = useMemo(
    () =>
      buildWorldEvidenceState(
        script,
        slice,
        {
          historicalVisualAssets: 0,
          historicalMapImageAvailable: false,
          curatedPhotoCount: presentDayPhotos.length,
        },
        projection
      ),
    [script, slice, projection]
  );

  // EXP-0001 §5：Inspector 降为 DEV/debug。普通模式（默认）隐藏 replan-card 内部 label；
  // 仅 ?inspector=1 才展示（runtime contract 仍保留给评审/调试）。
  // 硬测试：inspector 消失后，墨痕仍通过 IntentGuide + Canvas/Surface 存在。
  const [devInspector, setDevInspector] = useState(false);
  useEffect(() => {
    // 读 ?inspector=1 决定 DEV/debug 模式；用裸 location 读取 query（不写导航、不 reload）。
    setDevInspector(typeof window !== "undefined" && new URLSearchParams(location.search).has("inspector"));
  }, []);

  // EXP-0001：Guide 的「继续探索」按钮 —— 映射 replanPlan.nextActions 到既有 Surface（不新造）
  function handleReplanExplore() {
    if (!state.replanPlan) return;
    const explore = state.replanPlan.nextActions.find((a) => a.action !== "return_present");
    if (!explore) return;
    const map: Record<string, SurfaceType> = {
      open_evidence: "evidence_reveal",
      timeline: "timeline",
      open_relation: "relational_space",
      open_photo: "current_photo",
    };
    const surf = map[explore.action];
    if (surf) setSurfaceOverride(surf);
  }

  const reducer = (s: ReturnType<typeof createRuntimeState>, a: Parameters<typeof reduceExperience>[1]) =>
    reduceExperience(s, a, script, patch, world);
  const [state, dispatch] = useReducer(reducer, undefined, () => createRuntimeState(script));

  // EXP-0001：把 runtime 四意图输出翻译成人类可感知收口（只读 adapter，不改 runtime contract）
  const translation = useMemo(
    () =>
      state.replanPlan && state.evidenceDecision && state.followUpIntent
        ? translateIntentToExperience(state.followUpIntent.kind, state.evidenceDecision, state.replanPlan, slice)
        : null,
    [state.replanPlan, state.evidenceDecision, state.followUpIntent, slice]
  );

  // TASK-0016：Replan 期间由 EvidenceDecision 驱动 Surface 选择（证明不是固定 beat 选 surface）
  const replanSelection = useMemo(
    () => (state.replanPlan ? selectReplanSurface(state.replanPlan, world) : null),
    [state.replanPlan, world]
  );

  const view = deriveView(state, script);
  const scene = view.scene;
  const beat: BeatPresentation = beatForScene(BEATS, scene.scene_id) ?? BEATS[0];

  // —— Evidence-aware：世界证据状态 → eligibility → composition（只从 eligible 选）
  const { selection, composition } = useMemo(() => resolveComposition(beat.recipe, world), [beat.recipe, world]);

  // 用户显式切换主角（看时间变化 / 看今貌照片）：只在 eligible 时生效，不是许可证
  const [surfaceOverride, setSurfaceOverride] = useState<SurfaceType | null>(null);
  // 换场即回到该场的默认主角；上下文性的出处抽屉也随之收起
  useEffect(() => {
    setSurfaceOverride(null);
    setSourceOpen(false);
  }, [scene.scene_id]);
  // preference 只是排序，不是许可证：逐个按 eligibility 过滤，ineligible 一律丢弃
  const isEligible = (t?: SurfaceType) => !!t && selection.eligibleSurfaces.some((e) => e.surfaceType === t && e.eligible);
  const preferChain: Array<SurfaceType | undefined> = [
    surfaceOverride ?? undefined,
    ...(beat.preferPrimaryByScene?.[scene.scene_id] ?? ([] as string[])).map((t) => t as SurfaceType),
    ...((beat.primaryPreference ?? []) as string[]).map((t) => t as SurfaceType),
    composition.primarySurface,
  ];
  // ADR-003：真正墨痕选出的主角（第 ④ 层编排）。偏好不是许可证——仍须逐个过 eligibility，
  // 过滤不到就退回引擎既有选择（证据驱动），再退回 preferChain。
  const agentPreferred: SurfaceType | undefined =
    agentDecision && state.replanViewActive && agentDecision.primaryStage !== "unknown_gap"
      ? (agentDecision.primaryStage as SurfaceType)
      : undefined;

  // TASK-0016：Replan 视角激活时，主角由 EvidenceDecision 驱动的 selectReplanSurface 决定
  // （relational_space），而非固定 beat 的 preferChain —— 证明 surface 由证据选择。
  // 该视角是 Patch 出来的「可回 Present」状态：RETURN_TO_PRESENT / 显式返回即切回当下世界。
  const primaryType: SurfaceType | undefined =
    state.replanPlan && state.replanViewActive
      ? ([agentPreferred, replanSelection?.selectedPrimary] as Array<SurfaceType | undefined>).find(isEligible)
      : preferChain.find(isEligible);

  const PrimarySurface = resolveSurface(primaryType, selection.eligibleSurfaces) ?? UnknownGapSurface;

  // v0.3：钩子问题 / 墨痕旁白 / 史料抽屉由本 Shell 专属位置渲染，不重复通用 secondary/context 角标
  const AgentPrompt = resolveSurface("agent_prompt", selection.eligibleSurfaces);
  const SourceInspect = resolveSurface("source_inspect", selection.eligibleSurfaces);
  const QuestionSurfaceComp = resolveSurface("question", selection.eligibleSurfaces);

  // 底部居中配图条：优先取本切片三处遗存（feature_key 对齐），不足则补前 3 张
  const stripPhotos = useMemo(() => {
    const all = presentDayPhotos ?? [];
    const keyOrder = ["wananqiao", "pujiqiao", "yihaosi-site"];
    const picked = keyOrder
      .map((k) => all.find((p) => p.feature_key === k))
      .filter((p): p is (typeof all)[number] => !!p);
    const rest = all.filter((p) => !keyOrder.includes(p.feature_key));
    return [...picked, ...rest].slice(0, 3);
  }, [presentDayPhotos]);
  const showStrip = stripPhotos.length > 0 && primaryType !== "current_photo";

  // v0.3 右侧交互栏：前进按钮（next-button）用户语言；与 advanceAction 等价时不在动作区重复
  const advanceAction = beat.advanceAction;
  const dockActions = beat.actions.filter((a) => a !== advanceAction);
  const sceneIdx = Math.max(0, script.scenes.findIndex((s) => s.scene_id === scene.scene_id));
  const totalScenes = script.scenes.length;
  const unrevealedReveal = beat.revealUnitIds.filter((id) => !revealed.includes(id));

  const ctx: SurfaceContext = {
    scene,
    script,
    slice,
    beat,
    world,
    selection,
    composition,
    focusPlace,
    revealed,
    revealedConflicts,
    askedMissingRelation: templeAsked || !!state.replanPlan,
    optionalGroupIncluded: templeIncluded,
    visualMode: primaryType === "current_photo" ? "photo" : "normal",
    patchActive: state.patchActive,
    // TASK-0017：证据检视模式（inspect_evidence）下，让 evidence_reveal 成为主表达而非开发者式 Inspector
    evidenceInspection:
      !!state.replanPlan && state.replanViewActive && state.replanPlan.intentKind === "inspect_evidence",
    evidenceInspectionRefs: state.evidenceDecision?.evidenceRefs,
    // EXP-0001：普通模式隐藏内部 runtime label；仅 DEV 模式透出 relationKey 等溯源串
    devMode: devInspector,
    // Stage 1·2.2：今貌影像策划清单 + 钩子（town-agnostic surface 消费）
    presentDayPhotos,
    presentDayHeroHook,
    // T4：真实产出注入 ctx，关系空间/发现优先渲染真实数据
    productionSummary,
  };

  // —— s01→s02 的坐标退出：保留上一画布作为退场层
  const [exiting, setExiting] = useState<string | null>(null);
  const prevSceneId = useRef(scene.scene_id);
  useEffect(() => {
    if (prevSceneId.current !== scene.scene_id) {
      setExiting(prevSceneId.current);
      prevSceneId.current = scene.scene_id;
      const t = setTimeout(() => setExiting(null), 1100);
      return () => clearTimeout(t);
    }
  }, [scene.scene_id]);
  const prevScene = exiting ? script.scenes.find((s) => s.scene_id === exiting) ?? null : null;
  const isCoordinateExit = prevScene?.spatial_mode === "GEOGRAPHIC_EXACT" && scene.spatial_mode !== "GEOGRAPHIC_EXACT";
  const ExitSurface =
    prevScene && beatForScene(BEATS, prevScene.scene_id)
      ? resolveSurface(
          resolveComposition(beatForScene(BEATS, prevScene.scene_id)!.recipe, world).composition.primarySurface,
          selection.eligibleSurfaces
        ) ?? UnknownGapSurface
      : null;

  function revealNext() {
    const pool = beat.revealUnitIds.filter((id) => !revealed.includes(id));
    if (pool.length === 0) return;
    setRevealed((r) => [...r, pool[0]]);
  }

  function onAction(a: string) {
    setNonAnswer(null);
    if (a === "看事实" || a === "了解更多") return revealNext();
    if (a === "把寺也放进来") return setTempleIncluded(true);
    if (a === "寺与桥有关系吗") {
      setTempleAsked(true);
      setTempleIncluded(true);
      return setNonAnswer(TEMPLE_BRIDGE_NON_ANSWER);
    }
    if (a === "寺的位置有多确定？") return setSurfaceOverride("approximate_area");
    if (CONFLICT_ORDER[a]) return setRevealedConflicts((r) => (r.includes(CONFLICT_ORDER[a]) ? r : [...r, CONFLICT_ORDER[a]]));
    // 「史料原页」= 历史地图/史料在自己的文档空间中查看（不配准）+ 出处列表按需展开
    if (a === "看史料原页") {
      setSurfaceOverride("historical_map_native");
      return setSourceOpen(true);
    }
    if (a === "看时间变化") return setSurfaceOverride("timeline");
    if (a === "看今貌照片") return setSurfaceOverride("current_photo");
    // T2：追问 → 与自由输入统一走 ask 链路（真实检索 → 裁决 → 世界变化），
    // 不再走冻结 classifyFollowUp（两套口径合并）。
    if (a.startsWith("追问")) {
      const question = a.startsWith("追问：") ? a.slice("追问：".length) : script.followup.trigger_question;
      void askMohen(question);
      return;
    }
    // 其余为推进型行动（回到它们刚出现的时代 / 看留下的关系 …）
    dispatch({ type: "NEXT" });
  }

  // ADR-003：自由追问收口 —— 墨痕理解并检索之后，让**世界**随之改变（Patch-not-Replace）。
  // 走既有 FOLLOWUP_REPLAN（不建第二套 Replan）；意图未定时只问澄清，不许画面假装听懂了。
  function handleAgentDecision(decision: AgentDecision, question: string) {
    setAgentDecision(decision);
    setNonAnswer(null);
    if (decision.engineIntent === "unknown") return;
    dispatch({ type: "FOLLOWUP_REPLAN", question });
  }

  // T2：统一追问入口——冻结追问按钮与自由输入都走 /api/mohen/ask（真实检索 → 裁决 → 世界变化），
  // 消除「冻结按钮走 classifyFollowUp / 自由输入走 understand」两套口径分裂的隐患。
  // 库/网络不可用时，退回落冻结 FOLLOWUP_REPLAN（不静默装懂，也不中断体验）。
  async function askMohen(question: string) {
    try {
      const res = await fetch("/api/mohen/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = (await res.json()) as { ok?: boolean; degraded?: boolean; decision?: AgentDecision };
      if (json.decision) handleAgentDecision(json.decision, question);
    } catch {
      dispatch({ type: "FOLLOWUP_REPLAN", question });
    }
  }

  const coverage = validateBeatCoverage(BEATS, script.scenes.map((s) => s.scene_id));
  const defaultUnits = scene.narrative.filter((u) => beat.defaultUnitIds.includes(u.unit_id));
  const revealedUnits = scene.narrative.filter((u) => revealed.includes(u.unit_id) && !beat.defaultUnitIds.includes(u.unit_id));

  // Guide 收口层（IntentGuide）：墨痕因问题不同切换判断方式的主要入口；仅 replan 激活时浮现
  const guideNode =
    state.replanPlan && state.replanViewActive && translation
      ? (
          <IntentGuide
            translation={translation}
            onReturn={() => dispatch({ type: "RETURN_TO_PRESENT" })}
            onExplore={handleReplanExplore}
          />
        )
      : null;

  return (
    <div className={`exp exp--c2 recipe-${composition.recipe} intensity-${composition.visualIntensity}`} data-beat={beat.beatId} data-scene={scene.scene_id}>
      {/* 顶栏：用户语言（金泽 + 此刻所在 + 探索轨迹；模式/进度退让为小字，不抢主角） */}
      <header className="exp-topbar">
        <div className="exp-topbar__left">
          <span className="exp-place">金泽</span>
          <span className="exp-topwhen" data-testid="top-when">{beat.topWhen}</span>
        </div>
        <div className="exp-trail" data-testid="exp-trail" aria-label="探索轨迹">
          {BEATS.map((b, i) => {
            const idx = BEATS.indexOf(beat);
            return (
              <span
                key={b.beatId}
                className={`exp-trail__dot ${i === idx ? "exp-trail__dot--current" : ""} ${i < idx ? "exp-trail__dot--done" : ""}`}
                title={b.label}
              />
            );
          })}
        </div>
        <div className="exp-topbar__right">
          {productionSummary?.available ? (
            <button
              type="button"
              className="exp-live-data exp-live-data--btn"
              data-testid="live-data"
              title="点开查看真实产出内容看板（read_model · visual_stage）"
              onClick={() => setBoardOpen((v) => !v)}
            >
              真实产出 · {productionSummary.entities.length} 实体 · {productionSummary.relations.length} 关系
            </button>
          ) : null}
          <span className={`exp-mode exp-mode--${scene.spatial_mode === "GEOGRAPHIC_EXACT" ? "exact" : "relational"}`} data-testid="spatial-mode-label">
            {SPATIAL_MODE_LABELS[scene.spatial_mode as SpatialMode]}
          </span>
          <span className="exp-progress" data-testid="exp-progress">
            第 {BEATS.indexOf(beat) + 1}/5 段 · 第 {sceneIdx + 1}/{totalScenes} 场
          </span>
        </div>
      </header>

      {/* 画布（不滚动持久框唯一主角）：中央主角 + 上方钩子 + 底部配图条 + 右侧交互栏（墨痕为基线向上长） */}
      <main
        className={`exp-canvas exp-canvas--intent-${translation?.intentKind ?? "none"}`}
        data-testid="experience-canvas"
        data-intent-experience={translation?.intentKind ?? "none"}
      >
        {prevScene && ExitSurface && (
          <div className={`exp-canvas__fading ${isCoordinateExit ? "exp-canvas__fading--coords-out" : ""}`} aria-hidden>
            <ExitSurface ctx={{ ...ctx, scene: prevScene }} compact />
          </div>
        )}
        <div className="exp-canvas__current" key={scene.scene_id}>
          {/* 中央主角身份标签（v03：明确组件身份，不靠浮层猜测） */}
          <div className="exp-center-label" data-testid="center-label">
            {surfaceHumanLabel(primaryType)}
            <span>位置依真实地理推算（非凭空绘制）</span>
          </div>
          <PrimarySurface ctx={ctx} onAction={onAction} />
        </div>

        {/* 右侧栏（v0.4 修复）：上半段 .exp-side__flow 是唯一滚动区（钩子问题 / 三张今貌 /
           坐标失权提示 / 注解 / 上下文动作），下半段 .exp-side-actions 是钉底操作条
           （前进 + 墨痕）。两段为 flex 分段，版面上互不重叠；右栏内一律不绝对定位。
           缺陷背景：原 .exp-rail / .mohen-askbtn 为 position:absolute，
           实测 8/8 场压住配图条（336×275px），是「右栏混乱」的直接原因。 */}
        <aside className="exp-canvas__side">
        <div className="exp-side__flow">
        {/* 钩子问题：补 exp-secondary（该 class 此前从未渲染，却已被两处 e2e 断言引用） */}
        {QuestionSurfaceComp && (
          <div className="exp-overlay exp-overlay--secondary exp-secondary exp-hook" data-testid="exp-hook">
            <QuestionSurfaceComp ctx={ctx} />
          </div>
        )}

        {/* 底部居中配图条：本切片三处遗存优先，其余补位 */}
        {showStrip && (
          <div className="exp-photostrip" data-testid="photo-strip">
            {stripPhotos.map((p) => (
              <figure key={p.feature_key} className="exp-photostrip__item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={commonsDirectUrl(p.commons_file)} alt={`${p.label} · 当代实景`} loading="lazy" />
                <figcaption>{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* §10 转场表达 epistemic change：坐标失去历史定位资格时明示（回到今天即消失）。 */}
        {(state.replanPlan
          ? state.replanPlan.currentCoordsLoseHistoricalAuthority
          : scene.spatial_mode !== "GEOGRAPHIC_EXACT") && (
          <span className="exp-epistemic-shift" data-testid="coordinate-authority-lost">
            当前坐标在此失去历史定位资格
          </span>
        )}
        {/* EXP-UI-RECON-01 R1：transition-hint 是内部 runtime 提示，仅 ?inspector=1 透出。 */}
        {devInspector && (
          <span
            className="exp-transition-hint"
            data-testid="transition-hint"
            title={`recipe=${composition.recipe} primary=${primaryType ?? "fallback"}`}
          >
            {composition.recipe} · 主角={primaryType ?? composition.fallback ?? "fallback"}
          </span>
        )}

        {/* 文本退让为左下注解层（揭示的事实，不含墨痕旁白） */}
        <div className="exp-annot" data-testid="exp-annot">
          {nonAnswer && (
            <p className="unit unit--UNKNOWN" data-testid="temple-bridge-non-answer">
              <span className="unit__badge">未知（缺证据）</span>
              <span className="unit__text">{nonAnswer}</span>
            </p>
          )}
          {agentDecision && agentDecision.mohenLine && !nonAnswer && (
            <p className="unit unit--FACT" data-testid="agent-decision-line">
              <span className="unit__badge">墨痕</span>
              <span className="unit__text">{agentDecision.mohenLine}</span>
            </p>
          )}
          <div className="exp-narrative">
            {defaultUnits.map((u) => (
              <p key={u.unit_id} className={`unit unit--${u.level}`} data-testid={`unit-${u.unit_id}`}>
                <span className="unit__badge">{humanLevelLabel(u.level as NarrativeLevel, devInspector)}</span>
                <span className="unit__text">{u.text}</span>
              </p>
            ))}
            {revealedUnits.map((u) => (
              <p key={u.unit_id} className={`unit unit--${u.level}`}>
                <span className="unit__badge">{humanLevelLabel(u.level as NarrativeLevel, devInspector)}</span>
                <span className="unit__text">{u.text}</span>
              </p>
            ))}
          </div>
        </div>

        {/* 右栏滚动区末尾：agent-prompt + 上下文动作 + 看事实，随流滚动（e2e AT-10 需始终在流内可见）。
           前进入口（exp-rail__primary）已移出此流，归入下方钉底操作条，确保进入第一幕即一眼可见。 */}
        <aside className="exp-rail" data-testid="exp-rail">
          {AgentPrompt && <AgentPrompt ctx={ctx} />}
          {dockActions.length > 0 && (
            <div className="action-dock" data-testid="action-dock">
              {dockActions.map((a) => (
                <button key={a} className="exp-btn exp-btn--context" onClick={() => onAction(a)}>
                  {a}
                </button>
              ))}
            </div>
          )}
          {unrevealedReveal.length > 0 && (
            <button className="exp-btn exp-btn--context" onClick={revealNext}>看事实</button>
          )}
        </aside>
        </div>   {/* 关闭 .exp-side__flow（唯一滚动区） */}

        {/* 钉底操作条（flex 分段非浮层）：前进入口 + 墨痕三态在场 */}
        <div className="exp-side-actions">
          {/* 前进入口独立成块：全宽 + 强对比 + 呼吸光，确保进入第一幕即一眼可见（修复「无探索入口」） */}
          <div className="exp-rail__primary">
            <span className="exp-rail__hint">继续探索 ▸</span>
            <button
              className="exp-btn exp-btn--primary exp-advance"
              data-testid="next-button"
              disabled={view.isLast}
              onClick={() => (advanceAction ? onAction(advanceAction) : onAction(beat.advanceLabel))}
            >
              {beat.advanceLabel}
            </button>
          </div>
          {/* 墨痕三态在场（PART IV 原型04 + C4 §25）：去左上 Ambient，仅右下常驻 + 变化区 Guide + 问墨痕 Dialogue */}
          <MohenPresence guide={guideNode} devMode={devInspector} onDecision={handleAgentDecision} />
        </div>
        </aside>
      </main>

      {/* 底栏（不滚动持久框第三行）：此刻含义 一句话（非控件、非工程语言） */}
      <footer className="exp-bottombar">
        <p className="exp-meaning" data-testid="meaning-now">{beat.meaningNow}</p>
      </footer>

      {/* Source Inspect（按需）——由 Surface Registry 里的 SourceInspectSurface 渲染 */}
      {sourceOpen && SourceInspect && (
        <aside className="exp-evidence" data-testid="source-inspect">
          <div className="exp-evidence__head">
            <h3>史料 / 出处</h3>
            <button className="exp-btn" onClick={() => setSourceOpen(false)}>收起</button>
          </div>
          <SourceInspect ctx={ctx} />
        </aside>
      )}

      {/* Patch-not-Replace（保留 TASK-0013 冻结行为契约）。
          TASK-0016：canonical follow-up 走真实 runtime 后，由下方 ReplanCard 呈现 runtime 计算结果，
          冻结的 patch 结果卡在此让位（否则两个右侧 fixed 抽屉重叠，且冻结结果不得冒充 runtime 输出）。 */}
      {state.patchActive && !state.replanPlan && (
        <aside className="exp-evidence exp-evidence--patch" data-testid="patch-card">
          <div className="exp-evidence__head">
            <h3>Patch 已应用 · 体验未重启</h3>
            <span className="conflict-card__ruling">{patch.patch_id.split("/").pop()}</span>
          </div>
          <p className="exp-patch__q">你的追问：{state.followupQuestion}</p>
          <div className="exp-patch__cols">
            <div>
              <h5>保留（已知）</h5>
              <ul>{Object.entries(patch.preserved).map(([k, v]) => (<li key={k}><b>{k}</b>：{typeof v === "string" ? v : JSON.stringify(v)}</li>))}</ul>
            </div>
            <div>
              <h5>改变（前景化）</h5>
              <ul>{Object.entries(patch.changed).map(([k, v]) => (<li key={k}><b>{k}</b>：{typeof v === "string" ? v : JSON.stringify(v)}</li>))}</ul>
            </div>
          </div>
          <div className="exp-evidence__section">
            <h5>缺失证据 / 下一步（不编造答案）</h5>
            <ul>{patch.next_actions.map((a) => (<li key={a.action}><b>{a.action}</b>：{a.text}</li>))}</ul>
          </div>
        </aside>
      )}
      {state.patchActive && (
        <div className="exp-patchpill" data-testid="patch-pill">
          Patch · {patch.base_scene_count} 场全部保留 · Beat {BEATS.indexOf(beat) + 1}/5 未重置
        </div>
      )}

      {/* TASK-0016 — Evidence-Aware Replan Runtime 真实输出（非冻结答案 JSON 冒充）。
          渲染全部由 runtime 计算出的 FollowUpIntent / EvidenceDecision / ReplanPlan 值。
          EXP-0001 §5：Inspector 仅 DEV/debug 可见（?inspector=1）；普通用户由 IntentGuide + Surface 收口。 */}
      {devInspector && state.replanPlan && state.evidenceDecision && state.followUpIntent && (
        <aside
          className="exp-evidence exp-evidence--replan"
          data-testid="replan-card"
          data-verdict={state.evidenceDecision.verdict}
          data-epistemic-class={state.evidenceDecision.supportedEpistemicClass}
          data-current-coords-authority={state.replanPlan.currentCoordsLoseHistoricalAuthority ? "lost" : "kept"}
          data-intent={state.followUpIntent.kind}
          data-action-status={state.replanPlan.actionStatus}
          data-spatial-authority={state.replanPlan.spatialAuthority}
          data-temporal-focus={state.replanPlan.temporalFocus}
          data-route-verified={state.evidenceDecision?.present?.routeVerified ? "yes" : "no"}
          data-deterministic={String(state.followUpIntent.deterministic)}
        >
          <div className="exp-evidence__head">
            <h3>墨痕的重新判断（不升级 · 不编造）</h3>
            <span className="conflict-card__ruling">{state.followUpIntent.kind}</span>
          </div>
          <p className="exp-patch__q">你的追问：{state.followupQuestion}</p>

          {/* 意图分流：四类意图必须体现为不同的体验表达（§6「一模板四皮肤」禁令） */}
          {state.replanPlan.intentKind === "inspect_evidence" && (
            <div className="exp-evidence__section" data-testid="replan-evidence-inspect">
              <h5>证据检视（inspect_evidence）</h5>
              <p>打开当前判断的依据与缺口；<b>不升 E1</b>；依据与缺口均来自既有世界状态，不编造。</p>
              {state.evidenceDecision.evidenceRefs && state.evidenceDecision.evidenceRefs.length > 0 && (
                <ul data-testid="replan-evidence-refs">
                  {state.evidenceDecision.evidenceRefs.map((ref, i) => (
                    <li key={i} data-relation-key={ref}>溯源：{ref}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {state.replanPlan.intentKind === "explore_temporal_change" && (
            <div className="exp-evidence__section" data-testid="replan-temporal">
              <h5>时间探索（explore_temporal_change）</h5>
              <p>时间成为主角：只消费有据的时间变化，<b>未知年份保持未知</b>，不把现代坐标当历史几何。</p>
            </div>
          )}
          {state.replanPlan.intentKind === "propose_present_action" && (
            <div className="exp-evidence__section" data-testid="replan-present-proposal">
              <h5>现场建议（propose_present_action）</h5>
              <p>回到今天语境：只提<b>受约束的现实观察建议</b>，路线可达性尚未验证，<b>非已验证导航</b>（无逐段路线）。</p>
            </div>
          )}
          {state.replanPlan.intentKind === "verify_historical_relation" && (
            <div className="exp-evidence__section" data-testid="replan-verify-relation">
              <h5>关系核验（verify_historical_relation）</h5>
              <p>当前坐标失去历史定位资格；关系 epistemic class 保持 <b>{state.replanPlan.relationEpistemicClass}</b>（不升 E1）。</p>
            </div>
          )}

          <div className="exp-evidence__section">
            <h5>证据判断</h5>
            <p data-testid="replan-verdict">
              {state.evidenceDecision.verdict === "insufficient_for_confirmation"
                ? "现有证据不足以确认"
                : state.evidenceDecision.verdict === "confirmed"
                ? "可确认"
                : "与证据矛盾"}
              （最高可支持到 <b>{state.evidenceDecision.supportedEpistemicClass}</b>，不把 E2 升为 E1）
            </p>
            <p data-testid="replan-current-assoc">
              现代相邻 ≠ 历史关系：{state.evidenceDecision.currentAssociationNotHistorical ? "是（仅今天共址）" : "否"}
            </p>
          </div>

          <div className="exp-patch__cols">
            <div>
              <h5>已知（保留）</h5>
              <ul data-testid="replan-known">{state.evidenceDecision.known.map((k, i) => (<li key={i}>{k}</li>))}</ul>
            </div>
            <div>
              <h5>未知 / 缺失</h5>
              <ul data-testid="replan-unknown">{state.evidenceDecision.unknown.map((k, i) => (<li key={i}>{k}</li>))}</ul>
              <ul data-testid="replan-missing">{state.evidenceDecision.missingEvidence.map((k, i) => (<li key={i}>{k}</li>))}</ul>
            </div>
          </div>

          <div className="exp-evidence__section">
            <h5>重新规划（surface / 焦点，由证据选择）</h5>
            <ul data-testid="replan-plan">
              <li>主 surface：{state.replanPlan.targetSurface}</li>
              <li>证据焦点：{state.replanPlan.evidenceFocus}</li>
              {state.replanPlan.relationEpistemicClass && (
                <li>关系 epistemic class 保持：<b>{state.replanPlan.relationEpistemicClass}</b>（不升 E1）</li>
              )}
              <li>当前坐标失去历史权威：{state.replanPlan.currentCoordsLoseHistoricalAuthority ? "是" : "否"}</li>
              <li>时空权威：{state.replanPlan.spatialAuthority}</li>
              <li>时间焦点：{state.replanPlan.temporalFocus}</li>
              <li>行动状态：{state.replanPlan.actionStatus}{state.replanPlan.actionStatus === "proposal_not_routed" ? "（受约束建议 · 非已验证导航）" : ""}</li>
            </ul>
            <h5>下一步（不编造答案）</h5>
            <ul>
              {state.replanPlan.nextActions.map((a) => (
                <li key={a.action}>
                  {a.action === "return_present" ? (
                    <button
                      className="exp-btn exp-btn--context"
                      onClick={() => dispatch({ type: "RETURN_TO_PRESENT" })}
                      data-testid="replan-return-present"
                    >
                      {a.text}
                    </button>
                  ) : (
                    <><b>{a.action}</b>：{a.text}</>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
      {/* D2：内容生产看板（按需，Evidence on Demand）。徽章点击展开，不常驻、不抢占舞台。 */}
      {productionSummary?.available && boardOpen && (
        <ProductionBoard summary={productionSummary} onClose={() => setBoardOpen(false)} />
      )}

      {!coverage.ok && <p className="exp-error">Beat coverage error: {coverage.errors.join("; ")}</p>}
    </div>
  );
}
