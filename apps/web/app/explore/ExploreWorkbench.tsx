"use client";

import { useState } from "react";
import type { ProductionRelationSummary } from "../../lib/read-model-bridge";
import type { AgentDecision } from "@mohen/agent-runtime";
import type { InsightGraph } from "../../lib/studio-creation";
import { humanEpistemic } from "../experience/jinze-water-net/humanLabels";

type View = "relation" | "timeline" | "spatial" | "story";

const VIEWS: { key: View; label: string }[] = [
  { key: "relation", label: "关系" },
  { key: "timeline", label: "时间" },
  { key: "spatial", label: "空间" },
  { key: "story", label: "故事" },
];

const PRED_HUMAN: Record<string, string> = {
  sister_bridge_with: "互为姐妹桥",
  spans_same_waterway: "同跨一条水道",
  spans_waterway: "跨越",
  same_waterway_as: "同跨一河",
  temple_bridge_association: "关联（未证实）",
  former_site_of: "原址为",
  founded_on_former_residence_of: "建于其故宅",
  built_on_site_of: "建于其故宅",
  named_after: "得名于",
  located_in: "位于",
  located_on: "位于",
  similar_form_to: "形制相仿",
  relative_position_south_of: "在南",
  has_bridges: "桥群含",
  formerly_named: "旧名",
  traces_origin_to: "前身可追溯到（非同一建筑，待证）",
  crosses: "横切",
  designed: "由……设计",
  designed_renovation_of: "设计改造了",
  planned_to_cross: "规划横穿",
  part_of: "属于",
  adjacent_to: "紧邻",
  opened: "开放",
  renovated: "改造了",
};

function parseRelations(relations: string[]) {
  const edges: { a: string; pred: string; b: string }[] = [];
  for (const r of relations) {
    const parts = r.split("—");
    if (parts.length >= 3) {
      edges.push({
        a: parts[0].trim(),
        pred: parts[1].trim(),
        b: parts.slice(2).join("—").trim(),
      });
    }
  }
  const nodes = [...new Set(edges.flatMap((e) => [e.a, e.b]))];
  return { nodes, edges };
}

function RelationGraph({ relations }: { relations: string[] }) {
  const { nodes, edges } = parseRelations(relations);
  if (nodes.length === 0) {
    return <div className="explore__empty">还没有关系数据。</div>;
  }
  const W = 640;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 60;
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    pos.set(n, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) });
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%", height: "auto", display: "block" }}>
      {edges.map((e, i) => {
        const p1 = pos.get(e.a)!;
        const p2 = pos.get(e.b)!;
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#D9E2DF" strokeWidth={1.5} />
            <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 4} textAnchor="middle" fontSize={11} fill="#687B7D">
              {PRED_HUMAN[e.pred] ?? e.pred}
            </text>
          </g>
        );
      })}
      {nodes.map((n) => {
        const p = pos.get(n)!;
        return (
          <g key={n}>
            <circle cx={p.x} cy={p.y} r={26} fill="#F2F1EB" stroke="#24786D" strokeWidth={1.5} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#263F47">
              {n.length > 6 ? `${n.slice(0, 6)}…` : n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const NODE_COLORS: Record<string, string> = {
  bridge: "#2a7f74",
  temple: "#a06b3f",
  place: "#5b7f3a",
  waterway: "#3f6f96",
  person: "#b06a3a",
  event: "#a04a4a",
  other: "#7a7f84",
};

function InsightGraphView({ graph }: { graph: InsightGraph }) {
  const nodes = graph.nodes;
  const edges = graph.edges;
  const W = 640;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 60;
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    pos.set(n.id, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) });
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%", height: "auto", display: "block" }}>
      {edges.map((e, i) => {
        const p1 = pos.get(e.from);
        const p2 = pos.get(e.to);
        if (!p1 || !p2) return null;
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#C9D4D1" strokeWidth={1.5} />
            <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 4} textAnchor="middle" fontSize={10.5} fill="#5f7070">
              {e.label}
            </text>
          </g>
        );
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const color = NODE_COLORS[n.type] ?? NODE_COLORS.other;
        return (
          <g key={n.id}>
            <circle cx={p.x} cy={p.y} r={24} fill="#F5F4EE" stroke={color} strokeWidth={2} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={11.5} fill="#263F47">
              {n.label.length > 6 ? `${n.label.slice(0, 6)}…` : n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ExploreWorkbench({ summary }: { summary: ProductionRelationSummary }) {
  const [view, setView] = useState<View>("relation");

  // 自然语言探索
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<AgentDecision | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");

  // 动态图见
  const [insightGraph, setInsightGraph] = useState<InsightGraph | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  async function ask() {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    setInsightGraph(null);
    setInsightError(null);
    setLastQuestion(q);
    try {
      let sid = sessionId;
      if (!sid) {
        const res = await fetch("/api/explore/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ intent: q }),
        });
        const json = (await res.json()) as { session_id?: string };
        sid = json.session_id ?? null;
        setSessionId(sid);
      }
      const res = await fetch(`/api/explore/sessions/${sid}/query`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = (await res.json()) as { ok?: boolean; decision?: AgentDecision; degraded?: boolean };
      if (json.decision) {
        setAnswer(json.decision);
      } else {
        setAskError("没有查到相关内容，可以换个问法试试。");
      }
    } catch {
      setAskError("探索失败，请重试。");
    } finally {
      setAsking(false);
    }
  }

  async function generateGraph() {
    if (!lastQuestion || !sessionId || insightLoading) return;
    setInsightLoading(true);
    setInsightError(null);
    setInsightGraph(null);
    try {
      const res = await fetch(`/api/explore/sessions/${sessionId}/insight-views`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: lastQuestion }),
      });
      const json = (await res.json()) as { ok?: boolean; graph?: InsightGraph };
      if (json.ok && json.graph) setInsightGraph(json.graph);
      else setInsightError("没有足够材料生成关系图。");
    } catch {
      setInsightError("生成失败，请重试。");
    } finally {
      setInsightLoading(false);
    }
  }

  const timelineEvents = (summary.timeline?.events ?? []).slice().sort((a, b) => {
    const ay = a.year ?? 9999;
    const by = b.year ?? 9999;
    return ay - by;
  });

  return (
    <div className="explore">
      <div className="explore__body">
        {/* 左栏：自然语言探索 */}
        <aside className="explore__col explore__side">
          <div className={`explore__status${summary.available ? "" : " is-sparse"}`}>
            <i />
            {summary.available ? "已连上合格历史知识库" : "知识库暂无已发布成果"}
          </div>

          <h2>向墨痕提问</h2>
          <div className="explore__ask">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ask();
              }}
              placeholder="问一个历史问题，比如：万安桥和普济桥是什么关系？"
              aria-label="向墨痕提问"
            />
            <button onClick={() => void ask()} disabled={asking || question.trim().length === 0}>
              {asking ? "查…" : "探索"}
            </button>
          </div>

          {askError && <p className="explore__note" style={{ color: "#b0413e" }}>{askError}</p>}

          {answer && (
            <div className="explore__answer">
              <div className="explore__answer-text">{answer.mohenLine}</div>
              {answer.clarifyQuestion && (
                <div className="explore__answer-clarify">{answer.clarifyQuestion}</div>
              )}
              {answer.materials?.map((mat) => (
                <div className="explore__material" key={mat.id}>
                  <span className="explore__material-badge">{humanEpistemic(mat.epistemic, false)}</span>
                  <div className="explore__material-snippet">{mat.snippet}</div>
                  <div className="explore__material-source">{mat.sourceRef}</div>
                </div>
              ))}
              {answer.gaps?.map((g) => (
                <div className="explore__gap" key={g}>还缺：{g}</div>
              ))}
              <button
                className="explore__insight-btn"
                onClick={() => void generateGraph()}
                disabled={insightLoading}
              >
                {insightLoading ? "生成关系图…" : "生成关系图"}
              </button>
              {insightError && <p className="explore__note" style={{ color: "#b0413e" }}>{insightError}</p>}
              {insightGraph && (
                <div className="explore__insight-graph">
                  <InsightGraphView graph={insightGraph} />
                  {insightGraph.edges.map((e, i) => (
                    <div className="explore__insight-src" key={i}>
                      {e.from}—{e.label}—{e.to}
                      {e.source ? `（${e.source}）` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <h2>知识库里的对象</h2>
          {summary.entities.length ? (
            <div className="explore__entity-list">
              {summary.entities.map((e) => (
                <span className="explore__entity" key={e}>
                  {e}
                </span>
              ))}
            </div>
          ) : (
            <p className="explore__note">还没有登记的对象。</p>
          )}

          <p className="explore__note">
            这里展示的是当前合格历史知识库的真实内容——关系、时间、空间与可讲的故事。
            覆盖不足时会如实说明，不会用作品脚本或虚构内容充数。
          </p>
        </aside>

        {/* 中栏：四视图 */}
        <main className="explore__col explore__main">
          <div className="explore__viewbar">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                className={`explore__viewtab${view === v.key ? " is-active" : ""}`}
                onClick={() => setView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>

          <section className="explore__canvas">
            {view === "relation" && (
              <>
                <h3>关系视图</h3>
                {summary.relations.length ? (
                  <div className="explore__graph">
                    <RelationGraph relations={summary.relations} />
                  </div>
                ) : (
                  <div className="explore__empty">知识库里还没有可展示的关系。</div>
                )}
              </>
            )}

            {view === "timeline" && (
              <>
                <h3>时间视图</h3>
                {timelineEvents.length ? (
                  <div className="explore__timeline">
                    {timelineEvents.map((e, i) => (
                      <div className="explore__tl-item" key={i}>
                        <div className="explore__tl-year">
                          {e.dynasty ? `${e.dynasty} · ` : ""}
                          {e.year ?? "年代不详"}
                        </div>
                        <div className="explore__tl-text">
                          {e.entity}：{e.change_type}
                          {e.after_state ? ` → ${e.after_state}` : ""}
                        </div>
                        {e.precision && e.precision !== "unknown" && (
                          <div className="explore__tl-meta">精度：{e.precision}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="explore__empty">没有带着录年代的时间记录。</div>
                )}
              </>
            )}

            {view === "spatial" && (
              <>
                <h3>空间视图</h3>
                {summary.visuals.length ? (
                  <div className="explore__grid">
                    {summary.visuals.map((v, i) => (
                      <div className="explore__card" key={i}>
                        <img src={v.displayUrl} alt={v.entities.join(" ") || "影像"} />
                        <div className="explore__card-body">
                          <p className="explore__card-title">{v.entities.join(" · ") || "今貌影像"}</p>
                          <p className="explore__card-text">{v.excerpt}</p>
                          <div className="explore__card-meta">
                            {v.artist} · {v.license}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="explore__empty">没有可展示的今貌影像。</div>
                )}
              </>
            )}

            {view === "story" && (
              <>
                <h3>故事视图</h3>
                {summary.stories.length ? (
                  <div className="explore__list">
                    {summary.stories.map((s, i) => (
                      <div className="explore__item" key={i}>
                        <p className="explore__item-title">{s.title}</p>
                        <p className="explore__item-text">{s.statement}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="explore__empty">还没有可讲的故事种子。</div>
                )}
              </>
            )}
          </section>
        </main>

        {/* 右栏：证据 */}
        <aside className="explore__col explore__side explore__side--right">
          <div className="explore__section">
            <h2 className="explore__section-title">史料原文</h2>
            {summary.evidence.length ? (
              <div className="explore__list">
                {summary.evidence.map((e, i) => (
                  <div className="explore__item" key={i}>
                    <p className="explore__item-text">{e.excerpt}</p>
                    <div className="explore__item-source">{e.sourceTitle}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="explore__note">还没有史料原文。</p>
            )}
          </div>

          <div className="explore__section">
            <h2 className="explore__section-title">两种说法并存</h2>
            {summary.conflicts.length ? (
              summary.conflicts.map((c) => (
                <div className="explore__conflict" key={c.key}>
                  <div className="explore__conflict-subject">{c.subject}</div>
                  {c.variants.map((v, i) => (
                    <div className="explore__conflict-var" key={i}>
                      {v.value}
                      <div className="explore__conflict-src">{v.source}</div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="explore__note">没有登记的分歧。</p>
            )}
          </div>

          <div className="explore__section">
            <h2 className="explore__section-title">还没有答案的问题</h2>
            {summary.openQuestions.length ? (
              summary.openQuestions.map((q) => (
                <div className="explore__question" key={q.question}>
                  <div className="explore__question-q">{q.question}</div>
                  <div className="explore__question-gap">缺：{q.missingEvidence}</div>
                </div>
              ))
            ) : (
              <p className="explore__note">没有登记的未决问题。</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
