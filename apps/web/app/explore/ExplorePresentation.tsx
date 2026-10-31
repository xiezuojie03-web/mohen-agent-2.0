"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

type NarrativeVisibility = "HIDDEN" | "HINT" | "OPEN";
type EvidenceVisibility = "CLOSED" | "PEEK" | "OPEN" | "DETAIL";

/** Presentation only: semantic data, API results and history remain with the workbench. */
export default function ExplorePresentation({ narrative, stage, evidence }: {
  narrative: ReactNode; stage: ReactNode; evidence: ReactNode;
}) {
  const [narrativeVisibility, setNarrativeVisibility] = useState<NarrativeVisibility>("OPEN");
  const [evidenceVisibility, setEvidenceVisibility] = useState<EvidenceVisibility>("CLOSED");
  const [activePanel, setActivePanel] = useState<"narrative" | "evidence" | null>(null);
  const [narrativeDock, setNarrativeDock] = useState("dock");
  const [evidenceDock, setEvidenceDock] = useState("dock");
  const [narrativeWidth, setNarrativeWidth] = useState(260);
  const [evidenceWidth, setEvidenceWidth] = useState(260);
  const [narrativeTop, setNarrativeTop] = useState(0);
  const [evidenceTop, setEvidenceTop] = useState(0);
  const narrativeTrigger = useRef<HTMLButtonElement>(null);
  const evidenceTrigger = useRef<HTMLButtonElement>(null);
  const nOpen = narrativeVisibility !== "HIDDEN";
  const eOpen = evidenceVisibility !== "CLOSED";
  function dismissPanel() {
    const last = activePanel;
    setActivePanel(null);
    (last === "narrative" ? narrativeTrigger : evidenceTrigger).current?.focus();
  }
  return (
    <div className="explore" onKeyDown={(event) => {
      if (event.key === "Escape" && activePanel) { event.preventDefault(); dismissPanel(); }
    }}>
      <div className="explore__presentation-controls" aria-label="探索布局">
        <label>墨痕呈现
          <select value={narrativeVisibility} onChange={(event) => {
            const value = event.target.value as NarrativeVisibility;
            setNarrativeVisibility(value);
            setActivePanel(value === "HIDDEN" ? null : "narrative");
          }}>
            <option value="HIDDEN">隐藏墨痕</option><option value="HINT">轻提示</option><option value="OPEN">展开墨痕</option>
          </select>
        </label>
        <label>证据呈现
          <select value={evidenceVisibility} onChange={(event) => {
            const value = event.target.value as EvidenceVisibility;
            setEvidenceVisibility(value);
            setActivePanel(value === "CLOSED" ? null : "evidence");
          }}>
            <option value="CLOSED">关闭证据</option><option value="PEEK">证据概览</option><option value="OPEN">展开证据</option><option value="DETAIL">来源细读</option>
          </select>
        </label>
        <button ref={narrativeTrigger} onClick={() => {
          if (narrativeVisibility === "HIDDEN") setNarrativeVisibility("OPEN");
          setActivePanel("narrative");
        }} aria-controls="explore-narrative">查看墨痕</button>
        <button ref={evidenceTrigger} onClick={() => {
          if (evidenceVisibility === "CLOSED") setEvidenceVisibility("OPEN");
          setActivePanel("evidence");
        }} aria-controls="explore-evidence">查看依据</button>
      </div>
      <details className="explore__layout-settings">
        <summary>调整布局</summary>
        <div className="explore__presentation-controls">
          <label>墨痕停靠<select value={narrativeDock} onChange={(event) => setNarrativeDock(event.target.value)}><option value="dock">分区</option><option value="float">悬浮</option></select></label>
          <label>证据停靠<select value={evidenceDock} onChange={(event) => setEvidenceDock(event.target.value)}><option value="dock">分区</option><option value="float">悬浮</option></select></label>
          <label>墨痕宽度<input type="range" min="220" max="360" step="10" value={narrativeWidth} onChange={(event) => setNarrativeWidth(Number(event.target.value))} /></label>
          <label>证据宽度<input type="range" min="220" max="360" step="10" value={evidenceWidth} onChange={(event) => setEvidenceWidth(Number(event.target.value))} /></label>
          <label>墨痕距顶部<input type="range" min="0" max="100" step="10" value={narrativeTop} onChange={(event) => setNarrativeTop(Number(event.target.value))} /></label>
          <label>证据距顶部<input type="range" min="0" max="100" step="10" value={evidenceTop} onChange={(event) => setEvidenceTop(Number(event.target.value))} /></label>
        </div>
      </details>
      <div className="explore__body" data-active-panel={activePanel ?? "none"} style={{
        "--explore-left": nOpen && narrativeDock === "dock" ? (narrativeVisibility === "HINT" ? "180px" : `${narrativeWidth}px`) : "0px",
        "--explore-right": eOpen && evidenceDock === "dock" ? (evidenceVisibility === "PEEK" ? "180px" : `${evidenceWidth}px`) : "0px",
      } as CSSProperties}>
        <aside id="explore-narrative" aria-label="墨痕叙事" hidden={!nOpen} data-dock={narrativeDock} style={{ "--panel-width": `${narrativeWidth}px`, "--panel-top": `${narrativeTop}px` } as CSSProperties}
          className="explore__col explore__side explore__narrative" onKeyDown={(event) => {
            if (event.key === "Escape") { event.stopPropagation(); dismissPanel(); }
          }}>
          <button className="explore__panel-dismiss" onClick={dismissPanel}>返回舞台</button>
          {narrativeVisibility === "HINT" ? <div className="explore__hint">
            <p>从一个人、一处地方或一个问题开始观察。</p>
            <button onClick={() => setNarrativeVisibility("OPEN")}>展开墨痕</button>
          </div> : narrative}
        </aside>
        <section aria-label="视觉舞台" className="explore__col explore__main">{stage}</section>
        <aside id="explore-evidence" aria-label="辅助证据" hidden={!eOpen} data-dock={evidenceDock} style={{ "--panel-width": `${evidenceWidth}px`, "--panel-top": `${evidenceTop}px` } as CSSProperties}
          className="explore__col explore__side explore__side--right" onKeyDown={(event) => {
            if (event.key === "Escape") { event.stopPropagation(); dismissPanel(); }
          }}>
          <button className="explore__panel-dismiss" onClick={dismissPanel}>返回舞台</button>
          {evidenceVisibility === "PEEK" ? <div className="explore__hint">
            <p>查看当前探索中的来源与未决问题。</p>
            <button onClick={() => setEvidenceVisibility("OPEN")}>展开证据</button>
          </div> : evidence}
        </aside>
      </div>
    </div>
  );
}
