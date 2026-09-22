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
  const reducer = (s: ReturnType<typeof createRuntimeState>, a: Parameters<typeof reduceExperience>[1]) =>
    reduceExperience(s, a, script, patch);
  const [state, dispatch] = useReducer(reducer, undefined, () => createRuntimeState(script));

  const [revealed, setRevealed] = useState<string[]>([]);
  const [revealedConflicts, setRevealedConflicts] = useState<string[]>([]);
  const [templeAsked, setTempleAsked] = useState(false);
  const [templeIncluded, setTempleIncluded] = useState(false);
  const [focusPlace, setFocusPlace] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<"normal" | "photo">("normal");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [nonAnswer, setNonAnswer] = useState<string | null>(null);

  const view = deriveView(state, script);
  const scene = view.scene;
  const beat: BeatPresentation = beatForScene(BEATS, scene.scene_id) ?? BEATS[0];

  // —— Evidence-aware：世界证据状态 → eligibility → composition（只从 eligible 选）
  const world = useMemo(
    () =>
      buildWorldEvidenceState(script, slice, { historicalVisualAssets: 0, historicalMapImageAvailable: false }),
    [script, slice]
  );
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
  const primaryType = preferChain.find(isEligible);

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
    askedMissingRelation: templeAsked,
    optionalGroupIncluded: templeIncluded,
    visualMode: primaryType === "current_photo" ? "photo" : "normal",
    patchActive: state.patchActive,
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
    if (a.startsWith("追问")) return dispatch({ type: "TRIGGER_FOLLOWUP" });
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
        {scene.spatial_mode !== "GEOGRAPHIC_EXACT" && (
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
          <button className="exp-btn" disabled={view.isFirst} onClick={() => dispatch({ type: "PREV" })}>
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

      {/* Patch-not-Replace（保留 TASK-0013 行为） */}
      {state.patchActive && (
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
      {!coverage.ok && <p className="exp-error">Beat coverage error: {coverage.errors.join("; ")}</p>}
    </div>
  );
}
