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
  ACTION_LABELS,
  SPATIAL_MODE_LABELS,
  LEVEL_LABELS,
  type NarrativeLevel,
  type ExperienceScript,
  type FollowupPatch,
  type SpatialMode,
  type SurfaceType,
} from "@mohen/experience-engine";
import { BEATS, TEMPLE_BRIDGE_NON_ANSWER, type BeatPresentation } from "./beats";
import { buildWorldEvidenceState } from "./beats";
import { resolveSurface, UnknownGapSurface } from "./surfaceRegistry";
import type { SliceShape, SurfaceContext } from "./surfaces/types";
import "./experience.css";

export interface ExperienceShellProps {
  script: ExperienceScript;
  patch: FollowupPatch;
  slice: SliceShape;
}

const CONFLICT_ORDER: Record<string, string> = {
  "看第一组分歧": "T11-C2",
  "看第二组分歧": "T11-C1",
};

export default function ExperienceShell({ script, patch, slice }: ExperienceShellProps) {
  const [revealed, setRevealed] = useState<string[]>([]);
  const [revealedConflicts, setRevealedConflicts] = useState<string[]>([]);
  const [templeAsked, setTempleAsked] = useState(false);
  const [templeIncluded, setTempleIncluded] = useState(false);
  const [focusPlace, setFocusPlace] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<"normal" | "photo">("normal");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [nonAnswer, setNonAnswer] = useState<string | null>(null);

  // —— Evidence-aware：世界证据状态（FOLLOWUP_REPLAN 的 EvidenceDecision 只消费它，不读答案 JSON）
  const world = useMemo(
    () =>
      buildWorldEvidenceState(script, slice, { historicalVisualAssets: 0, historicalMapImageAvailable: false }),
    [script, slice]
  );

  const reducer = (s: ReturnType<typeof createRuntimeState>, a: Parameters<typeof reduceExperience>[1]) =>
    reduceExperience(s, a, script, patch, world);
  const [state, dispatch] = useReducer(reducer, undefined, () => createRuntimeState(script));

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
  // TASK-0016：Replan 视角激活时，主角由 EvidenceDecision 驱动的 selectReplanSurface 决定
  // （relational_space），而非固定 beat 的 preferChain —— 证明 surface 由证据选择。
  // 该视角是 Patch 出来的「可回 Present」状态：RETURN_TO_PRESENT / 显式返回即切回当下世界。
  const primaryType: SurfaceType | undefined =
    state.replanPlan && state.replanViewActive && replanSelection?.selectedPrimary
      ? replanSelection.selectedPrimary
      : preferChain.find(isEligible);

  const PrimarySurface = resolveSurface(primaryType, selection.eligibleSurfaces) ?? UnknownGapSurface;

  // secondary / context：退让但存在（§13）。action_dock / agent_prompt 由本 Shell 的专属版本渲染，避免重复
  const BESPOKE: SurfaceType[] = ["action_dock", "agent_prompt"];
  const SecondarySurface = resolveSurface(
    composition.secondarySurfaces.find((t) => !BESPOKE.includes(t) && t !== primaryType),
    selection.eligibleSurfaces
  );
  const ContextSurface = resolveSurface(
    composition.contextSurfaces.find((t) => !BESPOKE.includes(t) && t !== primaryType && t !== composition.secondarySurfaces[0]),
    selection.eligibleSurfaces
  );
  const AgentPrompt = resolveSurface("agent_prompt", selection.eligibleSurfaces);
  const SourceInspect = resolveSurface("source_inspect", selection.eligibleSurfaces);

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
    // TASK-0016：追问 → 真正跑 Evidence-Aware Replan Runtime（不读冻结答案 JSON 冒充）
    if (a.startsWith("追问")) {
      const question = a.startsWith("追问：") ? a.slice("追问：".length) : script.followup.trigger_question;
      return dispatch({ type: "FOLLOWUP_REPLAN", question });
    }
    // 其余为推进型行动（回到它们刚出现的时代 / 看留下的关系 …）
    dispatch({ type: "NEXT" });
  }

  const coverage = validateBeatCoverage(BEATS, script.scenes.map((s) => s.scene_id));
  const defaultUnits = scene.narrative.filter((u) => beat.defaultUnitIds.includes(u.unit_id));
  const revealedUnits = scene.narrative.filter((u) => revealed.includes(u.unit_id) && !beat.defaultUnitIds.includes(u.unit_id));

  return (
    <div className={`exp exp--c2 recipe-${composition.recipe} intensity-${composition.visualIntensity}`} data-beat={beat.beatId} data-scene={scene.scene_id}>
      {/* Time Context */}
      <header className="exp-timebar">
        <div className="exp-timebar__left">
          <span className="exp-brand">墨痕</span>
          <span className="exp-beat">{beat.label}</span>
        </div>
        <div className="exp-timebar__right">
          <span className="exp-time">{scene.time_state}</span>
          <span className={`exp-mode exp-mode--${scene.spatial_mode === "GEOGRAPHIC_EXACT" ? "exact" : "relational"}`} data-testid="spatial-mode-label">
            {SPATIAL_MODE_LABELS[scene.spatial_mode as SpatialMode]}
          </span>
          <span className="exp-progress">
            Beat {BEATS.indexOf(beat) + 1}/5 · {state.sceneIndex + 1}/{script.scenes.length}
          </span>
        </div>
      </header>

      {/* Experience Canvas：一个时刻只有一个主角 */}
      <main className="exp-canvas" data-testid="experience-canvas">
        {prevScene && ExitSurface && (
          <div className={`exp-canvas__fading ${isCoordinateExit ? "exp-canvas__fading--coords-out" : ""}`} aria-hidden>
            <ExitSurface ctx={{ ...ctx, scene: prevScene }} compact />
          </div>
        )}
        <div className="exp-canvas__current" key={scene.scene_id}>
          <PrimarySurface ctx={ctx} onAction={onAction} />
        </div>
        {/* §10 转场必须表达 epistemic change：不只是动画，而是明示「坐标失去作证资格」。
            只要不在「当下」场景（非 GEOGRAPHIC_EXACT），当前坐标就没有历史定位资格；
            回到今天（GEOGRAPHIC_EXACT）时该提示自动消失。 */}
        {/* §10 转场表达 epistemic change：replan 视角激活时，由 replanPlan.currentCoordsLoseHistoricalAuthority
            决定（D=propose_present_action 回到今天语境，当前坐标不失去历史权威；A/C 失去）。
            非 replan 时沿用场景级规则：非 GEOGRAPHIC_EXACT 即失去。 */}
        {(state.replanPlan
          ? state.replanPlan.currentCoordsLoseHistoricalAuthority
          : scene.spatial_mode !== "GEOGRAPHIC_EXACT") && (
          <span className="exp-epistemic-shift" data-testid="coordinate-authority-lost">
            当前坐标在此失去历史定位资格
          </span>
        )}
        <span
          className="exp-transition-hint"
          data-testid="transition-hint"
          title={`recipe=${composition.recipe} primary=${primaryType ?? "fallback"}`}
        >
          {composition.recipe} · 主角={primaryType ?? composition.fallback ?? "fallback"}
        </span>
      </main>

      {/* 墨痕短发言 + secondary/context（退让）+ 默认可见单元 + 行动 */}
      <section className="exp-stage">
        {AgentPrompt && <AgentPrompt ctx={ctx} />}
        {SecondarySurface && (
          <div className="exp-secondary" data-testid="secondary-surface">
            <SecondarySurface ctx={ctx} onAction={onAction} compact />
          </div>
        )}

        {nonAnswer && (
          <p className="unit unit--UNKNOWN" data-testid="temple-bridge-non-answer">
            <span className="unit__badge">未知（缺证据）</span>
            <span className="unit__text">{nonAnswer}</span>
          </p>
        )}

        <div className="exp-narrative">
          {defaultUnits.map((u) => (
            <p key={u.unit_id} className={`unit unit--${u.level}`} data-testid={`unit-${u.unit_id}`}>
              <span className="unit__badge">{LEVEL_LABELS[u.level as NarrativeLevel]}</span>
              <span className="unit__text">{u.text}</span>
            </p>
          ))}
          {revealedUnits.map((u) => (
            <p key={u.unit_id} className={`unit unit--${u.level}`}>
              <span className="unit__badge">{LEVEL_LABELS[u.level as NarrativeLevel]}</span>
              <span className="unit__text">{u.text}</span>
            </p>
          ))}
        </div>

        {ContextSurface && (
          <div className="exp-context" data-testid="context-surface">
            <ContextSurface ctx={ctx} onAction={onAction} compact />
          </div>
        )}

        <div className="action-dock" data-testid="action-dock">
          {beat.actions.map((a) => (
            <button key={a} className={`exp-btn ${a.startsWith("追问") ? "exp-btn--followup" : "exp-btn--context"}`} onClick={() => onAction(a)} data-testid={`action-${a}`}>
              {a}
            </button>
          ))}
          {scene.narrative.filter((u) => beat.revealUnitIds.includes(u.unit_id) && !revealed.includes(u.unit_id)).length > 0 && (
            <button className="exp-btn exp-btn--context" onClick={revealNext}>看事实</button>
          )}
        </div>

        <nav className="exp-actions">
          <button className="exp-btn" disabled={view.isFirst} onClick={() => dispatch({ type: "PREV" })} data-testid="prev-button">
            {ACTION_LABELS.PREV}
          </button>
          <button className="exp-btn exp-btn--primary" disabled={view.isLast} onClick={() => dispatch({ type: "NEXT" })} data-testid="next-button">
            {ACTION_LABELS.NEXT}
          </button>
        </nav>
      </section>

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
          渲染全部由 runtime 计算出的 FollowUpIntent / EvidenceDecision / ReplanPlan 值。 */}
      {state.replanPlan && state.evidenceDecision && state.followUpIntent && (
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
      {!coverage.ok && <p className="exp-error">Beat coverage error: {coverage.errors.join("; ")}</p>}
    </div>
  );
}
