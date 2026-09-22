"use client";

// apps/web/app/experience/jinze-water-net/ExperienceShell.tsx
//
// TASK-0013 — 持续存在的 Experience Space（Persistent Experience Shell）。
//
// 五个层（§4）：Experience Canvas / Narrative Layer / Time Context /
// Evidence–Uncertainty Layer / Agent Action Layer —— 是同一体验空间内的
// 五个面，不是五个页面；场景切换只重新组合本空间（CompositionState 驱动）。
//
// 硬规则：
// - 全部剧情/冲突/裁定/发现文本来自冻结 script（props），本文件零剧情字面量；
// - canonical follow-up 消费冻结 patch JSON，Patch-not-Replace（不重置、不重放）；
// - INTERPRETATION_CANDIDATE 必须与 FACT_EVIDENCED 视觉不同（见 experience.css）。

import { useReducer, useState, useEffect, useRef } from "react";
import {
  createRuntimeState,
  reduceExperience,
  deriveView,
  SPATIAL_MODE_LABELS,
  LEVEL_LABELS,
  ACTION_LABELS,
  type ExperienceScript,
  type FollowupPatch,
  type NarrativeLevel,
} from "@mohen/experience-engine";
import SurfaceRenderer from "./surfaces/SurfaceRenderer";
import type { SliceShape } from "./surfaces/types";
import "./experience.css";

export interface ExperienceShellProps {
  script: ExperienceScript;
  patch: FollowupPatch;
  slice: SliceShape;
}

type RuntimeAction = Parameters<ReturnType<typeof makeReducer>>[1];
function makeReducer(script: ExperienceScript, patch: FollowupPatch) {
  return (s: ReturnType<typeof createRuntimeState>, a: Parameters<typeof reduceExperience>[1]) =>
    reduceExperience(s, a, script, patch);
}

export default function ExperienceShell({ script, patch, slice }: ExperienceShellProps) {
  const reducer = makeReducer(script, patch);
  const [state, dispatch] = useReducer(reducer, undefined, () => createRuntimeState(script));
  const [focusPlace, setFocusPlace] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<"normal" | "photo">("normal");

  const view = deriveView(state, script);
  const scene = view.scene;

  // —— s01→s02 的「坐标淡出」：离开精确地理场景时，保留上一画布 1.1s 作退场层
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

  const prevScene =
    exiting != null ? script.scenes.find((s) => s.scene_id === exiting) ?? null : null;
  const isCoordinateExit =
    prevScene?.spatial_mode === "GEOGRAPHIC_EXACT" && scene.spatial_mode !== "GEOGRAPHIC_EXACT";

  // —— 动作分发（用户可见标签见 ACTION_LABELS；内部枚举不出现在 UI 文案中）
  function runAction(action: string) {
    switch (action) {
      case "OPEN_EVIDENCE":
        dispatch({ type: state.evidenceOpen ? "CLOSE_EVIDENCE" : "OPEN_EVIDENCE" });
        break;
      case "FOCUS_PLACE": {
        const places = ["普济桥", "万安桥", "颐浩寺遗址"];
        const i = places.indexOf(focusPlace ?? "");
        setFocusPlace(places[(i + 1) % places.length]);
        break;
      }
      case "SET_TIME":
      case "SHOW_HISTORICAL_LAYER":
        // 时间/历史层信息已由 Time Context 与关系空间呈现；此动作将其置顶强调
        setFocusPlace(null);
        break;
      case "SET_VISUAL_MODE":
        setVisualMode((m) => (m === "photo" ? "normal" : "photo"));
        break;
      case "PROPOSE_ROUTE":
      case "REPLAN":
        // 最小实现：展开 Agent 建议区（来自冻结 patch.next_actions，不编造）
        dispatch({ type: "OPEN_EVIDENCE" });
        break;
      default:
        break;
    }
  }

  const densityClass =
    scene.composition.narrativeDensity === "high"
      ? "density-high"
      : scene.composition.narrativeDensity === "low"
        ? "density-low"
        : "density-medium";
  const intensityClass = `intensity-${scene.composition.visualIntensity}`;

  return (
    <div className={`exp ${densityClass} ${intensityClass}`} data-scene={scene.scene_id}>
      {/* —— Time Context（层 3）—— */}
      <header className="exp-timebar">
        <div className="exp-timebar__left">
          <span className="exp-brand">墨痕</span>
          <span className="exp-q">{script.primary_question}</span>
        </div>
        <div className="exp-timebar__right">
          <span className="exp-time">{scene.time_state}</span>
          <span
            className={`exp-mode exp-mode--${scene.spatial_mode === "GEOGRAPHIC_EXACT" ? "exact" : "relational"}`}
            data-testid="spatial-mode-label"
          >
            {SPATIAL_MODE_LABELS[scene.spatial_mode]}
          </span>
          <span className="exp-progress">
            {state.sceneIndex + 1} / {script.scenes.length}
          </span>
        </div>
      </header>

      {/* —— Experience Canvas（层 1）：CompositionState 控制视觉重心 —— */}
      <main className={`exp-canvas exp-canvas--${scene.composition.primarySurface}`}>
        {prevScene && (
          <div
            className={`exp-canvas__fading ${isCoordinateExit ? "exp-canvas__fading--coords-out" : ""}`}
            aria-hidden
          >
            <SurfaceRenderer
              scene={prevScene}
              slice={slice}
              focusPlace={focusPlace}
              visualMode="normal"
              script={script}
              compact
            />
          </div>
        )}
        <div className="exp-canvas__current" key={scene.scene_id}>
          <SurfaceRenderer
            scene={scene}
            slice={slice}
            focusPlace={focusPlace}
            visualMode={visualMode}
            script={script}
          />
        </div>
        <span className="exp-transition-hint">转场：{scene.composition.transitionIntent}</span>
      </main>

      {/* —— Narrative Layer（层 2）—— */}
      <section className={`exp-narrative exp-narrative--${densityClass}`} data-testid="narrative-layer">
        <h2 className="exp-goal">{scene.experience_goal}</h2>
        {scene.narrative.map((u) => (
          <p key={u.unit_id} className={`unit unit--${u.level}`} data-testid={`unit-${u.unit_id}`}>
            <span className="unit__badge">{LEVEL_LABELS[u.level as NarrativeLevel]}</span>
            <span className="unit__text">{u.text}</span>
            {u.evidence_refs.length > 0 && (
              <span className="unit__refs">
                证据 ×{u.evidence_refs.length}
              </span>
            )}
          </p>
        ))}
        {/* s08：Primary Discovery 以解释框架身份出现（TASK-0012A 冻结语义） */}
        {view.isLast && (
          <blockquote className="exp-discovery exp-discovery--interpretation" data-testid="primary-discovery">
            <span className="exp-discovery__badge">
              {script.discoveries.primary.epistemic_classification === "INTERPRETATION_CANDIDATE"
                ? "墨痕的解释框架 · 非已证事实"
                : "发现"}
            </span>
            <p>{script.discoveries.primary.statement}</p>
            <footer>未决对点：{script.discoveries.primary.unresolved_counterpoint}</footer>
          </blockquote>
        )}
      </section>

      {/* —— Agent Action Layer（层 5）—— */}
      <nav className="exp-actions" data-testid="action-layer">
        <button className="exp-btn" disabled={view.isFirst} onClick={() => dispatch({ type: "PREV" })}>
          {ACTION_LABELS.PREV}
        </button>
        {scene.allowed_user_actions.map((a) => (
          <button key={a} className="exp-btn exp-btn--context" onClick={() => runAction(a)}>
            {ACTION_LABELS[a] ?? a}
          </button>
        ))}
        {view.canFollowUp && (
          <button
            className="exp-btn exp-btn--followup"
            data-testid="followup-button"
            onClick={() => dispatch({ type: "TRIGGER_FOLLOWUP" })}
          >
            追问：{script.followup.trigger_question}
          </button>
        )}
        <button
          className="exp-btn exp-btn--primary"
          disabled={view.isLast}
          onClick={() => dispatch({ type: "NEXT" })}
          data-testid="next-button"
        >
          {ACTION_LABELS.NEXT}
        </button>
      </nav>

      {/* —— Evidence / Uncertainty Layer（层 4）：滑出面板 —— */}
      {state.evidenceOpen && (
        <aside className="exp-evidence" data-testid="evidence-layer">
          <div className="exp-evidence__head">
            <h3>证据与未决</h3>
            <button className="exp-btn" onClick={() => dispatch({ type: "CLOSE_EVIDENCE" })}>
              收起证据
            </button>
          </div>

          {view.sceneConflicts.length > 0 && (
            <div className="exp-conflicts" data-testid="conflict-cards">
              <p className="exp-evidence__note">
                以下着录冲突按冻结裁定保留并列呈现——墨痕不替你选「正确答案」。
              </p>
              {view.sceneConflicts.map((c) => {
                const ruling = script.t11_rulings_applied.find((r) => r.ruling === c.ruling);
                return (
                  <article key={c.ruling} className="conflict-card">
                    <header>
                      <strong>{c.topic}</strong>
                      <span className="conflict-card__ruling">{c.ruling} · 未裁决</span>
                    </header>
                    <p>{ruling?.applied ?? c.decision}</p>
                  </article>
                );
              })}
            </div>
          )}

          <div className="exp-evidence__section">
            <h4>本场景不确定项</h4>
            <p>{scene.uncertainty}</p>
          </div>

          <div className="exp-evidence__section">
            <h4>冻结裁定（T11-C1…C5）</h4>
            <ul>
              {script.t11_rulings_applied.map((r) => (
                <li key={r.ruling}>
                  <strong>{r.ruling}</strong> {r.topic}：{r.applied}
                </li>
              ))}
            </ul>
          </div>

        </aside>
      )}

      {/* —— Patch 面板：独立常驻（不依赖证据抽屉开合；Patch-not-Replace 的可见性）—— */}
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
              <ul>
                {Object.entries(patch.preserved).map(([k, v]) => (
                  <li key={k}>
                    <b>{k}</b>：{typeof v === "string" ? v : JSON.stringify(v)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5>改变（前景化）</h5>
              <ul>
                {Object.entries(patch.changed).map(([k, v]) => (
                  <li key={k}>
                    <b>{k}</b>：{typeof v === "string" ? v : JSON.stringify(v)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="exp-evidence__section">
            <h5>缺失证据 / 下一步（不编造答案）</h5>
            <ul>
              {patch.next_actions.map((a) => (
                <li key={a.action}>
                  <b>{a.action}</b>：{a.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="exp-evidence__section">
            <h5>补丁不变量</h5>
            <ul>
              {patch.invariants.map((inv) => (
                <li key={inv}>{inv}</li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      {/* —— Patch 后常驻提示（Patch-not-Replace 的可见性）—— */}
      {state.patchActive && (
        <div className="exp-patchpill" data-testid="patch-pill">
          Patch · {patch.base_scene_count} 场全部保留 · 已走 {new Set(state.trail.filter((t) => !t.startsWith("patch:"))).size} 处
        </div>
      )}
    </div>
  );
}
