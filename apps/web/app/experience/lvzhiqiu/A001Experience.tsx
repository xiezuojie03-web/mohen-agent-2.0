"use client";

// apps/web/app/experience/lvzhiqiu/A001Experience.tsx
//
// MH-STRAT-PROD-A001 · 绿之丘体验壳（客户端：状态机 + 双组件编排）。
//
// 结构对应任务书 U1–U5（不是五张固定页面，而是一段可来回走的体验）：
//   today      今天：现在是怎样的公共空间（今日联系来自 D04 → G4 → L5 投影）
//   then       回看：1995 的仓库与之后的变化（时间投影 P03，年代精度如实标注）
//   understand 理解：墨痕能说出口的判断 + 一个还不能认定的问题（正/负例同屏）
//   evidence   返证：每条判断点开就是材料原句 + 出处 + 片段序号 + 原页面
//   ask        追问：Agent 用同一条已发布判断作答；答不了就说答不了
//
// L6 分工：本文件名里的 runtime reducer 承担「状态 / 动作 / Replan 后回到原观察点」，
// 但不把整个体验缩成 L6：视觉舞台、证据与叙事各有自己的表达职责。
// 舞台能画什么由服务端用过引擎资格（selectSurfaces）算好后传入，客户端不自行放宽。

import { useCallback, useMemo, useReducer, useState } from "react";
import type { AgentDecision } from "@mohen/agent-runtime";
import type { A001EvidencePointer, A001ExperienceData } from "../../../lib/a001-experience-data";
import GreenHillStage, { ENTITY_TO_HOTSPOT, type StageHotspotKey, type StageMode } from "./GreenHillStage";
import MohenAsk from "./MohenAsk";

type Step = "today" | "then" | "understand" | "evidence" | "ask";

interface RuntimeState {
  step: Step;
  mode: StageMode;
  /** 被聚焦的实体标签（来自追问裁决） */
  focusEntity: string | null;
  activeHotspot: StageHotspotKey | null;
  /** 证据抽屉：null = 关闭；否则显示对应证据 */
  drawer: { title: string; items: A001EvidencePointer[] } | null;
  /** 追问后是否需要对「无法认定」明确表态 */
  refusal: { question: string; line: string } | null;
  /** 追问前的观察位置（用于一键回到原处） */
  returnTo: { step: Step; mode: StageMode; focusEntity: string | null } | null;
  trail: string[];
}

type Action =
  | { type: "GOTO"; step: Step }
  | { type: "SET_MODE"; mode: StageMode }
  | { type: "SELECT_HOTSPOT"; key: StageHotspotKey }
  | { type: "OPEN_DRAWER"; title: string; items: A001EvidencePointer[] }
  | { type: "CLOSE_DRAWER" }
  | { type: "ASK_RESULT"; decision: AgentDecision; question: string }
  | { type: "RETURN" };

const INITIAL: RuntimeState = {
  step: "today",
  mode: "today",
  focusEntity: null,
  activeHotspot: null,
  drawer: null,
  refusal: null,
  returnTo: null,
  trail: [],
};

const STEP_LABEL: Record<Step, string> = {
  today: "今天",
  then: "回看",
  understand: "理解",
  evidence: "返证",
  ask: "追问",
};

/**
 * 追问意图 → 舞台该看哪个时点（Agent 已裁决 engineIntent，此处只决定「看哪儿」）。
 * 只切时点，不切用户所在的步骤；返回 null 表示保持当前时点。
 */
function stepForIntent(intent: string): { step: Step; mode: StageMode } | null {
  switch (intent) {
    case "explore_temporal_change":
      return { step: "then", mode: "then" };
    case "verify_historical_relation":
      return { step: "understand", mode: "today" };
    default:
      return null;
  }
}

function reducer(state: RuntimeState, action: Action): RuntimeState {
  switch (action.type) {
    case "GOTO":
      return {
        ...state,
        step: action.step,
        mode: action.step === "then" ? "then" : state.mode,
        drawer: null,
        trail: [...state.trail, `step:${action.step}`],
      };
    case "SET_MODE":
      // 舞台切到 1995 时，右栏也必须跟着讲「前身」，否则出现「画面是 1995、文字在讲今天」的同屏矛盾。
      return {
        ...state,
        mode: action.mode,
        step: action.mode === "then" ? "then" : "today",
        activeHotspot: null,
        focusEntity: null,
        drawer: null,
        trail: [...state.trail, `mode:${action.mode}`],
      };
    case "SELECT_HOTSPOT":
      return { ...state, activeHotspot: action.key };
    case "OPEN_DRAWER":
      return { ...state, drawer: { title: action.title, items: action.items } };
    case "CLOSE_DRAWER":
      return { ...state, drawer: null };
    case "ASK_RESULT": {
      const decision = action.decision;
      const refused = decision.verdict === "cannot_answer";
      // 追问前先记住用户原来的观察位置，保证「返回」不会把人丢回错误对象
      const returnTo = state.returnTo ?? {
        step: state.step,
        mode: state.mode,
        focusEntity: state.focusEntity,
      };
      const focused = decision.focus.find((f) => ENTITY_TO_HOTSPOT[f]) ?? null;
      const target = stepForIntent(decision.engineIntent);
      return {
        ...state,
        returnTo,
        // 追问只调「看哪儿」（舞台时点/焦点），绝不把用户从回答所在的一步踢走：
        // 否则答案会随着面板切换而消失——那是把人赶走，不是回答问题。
        step: state.step,
        mode: refused || !target ? state.mode : target.mode,
        focusEntity: focused ?? state.focusEntity,
        activeHotspot: focused ? ENTITY_TO_HOTSPOT[focused] : state.activeHotspot,
        refusal: refused ? { question: action.question, line: decision.mohenLine } : null,
        trail: [...state.trail, refused ? "ask:refused" : `ask:${decision.engineIntent}`],
      };
    }
    case "RETURN": {
      if (!state.returnTo) return state;
      return {
        ...state,
        step: state.returnTo.step,
        mode: state.returnTo.mode,
        focusEntity: state.returnTo.focusEntity,
        refusal: null,
        drawer: null,
        trail: [...state.trail, "return"],
      };
    }
    default:
      return state;
  }
}

/** 热点 → 材料原句定位关键词（只用于在已发布证据里找到对应原句，不生成任何内容） */
const HOTSPOT_KEYWORDS: Record<StageHotspotKey, string[]> = {
  ramp: ["缓坡"],
  spiral: ["螺旋"],
  deck: ["270"],
  cut: ["削", "第6层", "第 6 层"],
  mass: ["1995", "6层", "6 层"],
  anpu: ["安浦路"],
  road: ["1500", "杨树浦路"],
  river: ["滨江", "江岸", "滨河"],
  cellar: ["怡和"],
};

export default function A001Experience({ data }: { data: A001ExperienceData }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [preset, setPreset] = useState<{ id: number; text: string } | null>(null);

  const evidenceForHotspot = useCallback(
    (key: StageHotspotKey): A001EvidencePointer[] => {
      const kws = HOTSPOT_KEYWORDS[key];
      return data.evidence.filter((e) => kws.some((k) => e.excerpt.includes(k)));
    },
    [data.evidence]
  );

  const onSelectHotspot = useCallback(
    (key: StageHotspotKey) => {
      dispatch({ type: "SELECT_HOTSPOT", key });
      const items = evidenceForHotspot(key);
      if (items.length) {
        dispatch({ type: "OPEN_DRAWER", title: "这一步的材料原句", items });
      }
    },
    [evidenceForHotspot]
  );

  const claimEvidence = useCallback(
    (claimId: string): A001EvidencePointer[] => {
      const byId = new Map(data.evidence.map((e) => [e.id, e]));
      const claim = data.claims.find((c) => c.id === claimId);
      if (!claim) return [];
      return claim.evidenceIds.map((id) => byId.get(id)).filter((x): x is A001EvidencePointer => !!x);
    },
    [data]
  );

  const openQuestionFor = useCallback(
    (entities: string[]) => {
      const hit = data.openQuestions.find((q) => entities.some((e) => q.question.includes(e)));
      return hit ?? null;
    },
    [data.openQuestions]
  );

  const yearLabel = useMemo(
    () => (ev: { year: number | null; precision: string }) => {
      if (ev.year !== null) return `${ev.year}`;
      if (ev.precision === "decade") return "改造年代（材料只到十年精度）";
      return "年代未载";
    },
    []
  );

  if (!data.available) {
    return (
      <main className="a001" data-testid="a001-unavailable">
        <h1>绿之丘 · 暂时没有可发布的真实结论</h1>
        <p>
          这一次没有读到当前有效的已发布成果（G5 · visual_stage 未命中）。墨痕不拿演练数据或旧切片顶替，
          所以这里什么都不画。
        </p>
        <p className="a001-muted">状态：{data.runId}</p>
      </main>
    );
  }

  const todayConnection = data.presentConnections[0] ?? null;
  const surfaceBlocked = data.eligibility.filter((e) => !e.eligible);

  return (
    <main className="a001" data-testid="a001-experience">
      <header className="a001-top">
        <div className="a001-top__left">
          <span className="a001-top__place">绿之丘</span>
          <span className="a001-top__where">杨树浦路 1500 号 · 杨浦滨江</span>
        </div>
        <div className="a001-top__right">
          <span className="a001-badge" data-testid="a001-data-badge">
            真实生产链成果 · D00—D05 / G0—G5 · run {data.runId.slice(0, 8)}
          </span>
        </div>
      </header>

      <nav className="a001-rail" aria-label="体验步骤">
        {(["today", "then", "understand", "evidence", "ask"] as Step[]).map((s) => (
          <button
            key={s}
            className={`a001-rail__step${state.step === s ? " is-current" : ""}`}
            data-testid={`a001-step-${s}`}
            onClick={() => dispatch({ type: "GOTO", step: s })}
          >
            {STEP_LABEL[s]}
          </button>
        ))}
      </nav>

      <div className="a001-grid">
        {/* ── 左：视觉舞台（始终在场，不因追问消失） ── */}
        <section className="a001-stage" aria-label="视觉舞台">
          <div className="a001-stage__head">
            <h1 className="a001-stage__q">
              同一处江边，为什么今天可以走上去、停下来？
            </h1>
            <div className="a001-toggle" role="group" aria-label="观察时点">
              <button
                className={`a001-toggle__btn${state.mode === "today" ? " is-on" : ""}`}
                data-testid="a001-mode-today"
                onClick={() => dispatch({ type: "SET_MODE", mode: "today" })}
              >
                今天
              </button>
              <button
                className={`a001-toggle__btn${state.mode === "then" ? " is-on" : ""}`}
                data-testid="a001-mode-then"
                onClick={() => dispatch({ type: "SET_MODE", mode: "then" })}
              >
                1995 前身
              </button>
            </div>
          </div>

          <GreenHillStage
            mode={state.mode}
            highlight={state.focusEntity}
            activeKey={state.activeHotspot}
            onSelect={onSelectHotspot}
            visuals={data.visuals}
          />

          {state.refusal && (
            <div className="a001-refusal" data-testid="a001-refusal-banner">
              <b>墨痕没有把这条关系画出来。</b>
              <span>{state.refusal.line}</span>
              <span className="a001-muted">你问的是：{state.refusal.question}</span>
            </div>
          )}

          {state.returnTo && (
            <button className="a001-btn a001-btn--ghost" data-testid="a001-return" onClick={() => dispatch({ type: "RETURN" })}>
              ← 回到我刚才看的地方
            </button>
          )}

          <details className="a001-why">
            <summary data-testid="a001-why">为什么这样画（舞台能画什么的依据）</summary>
            <ul>
              <li>
                可画：今日现场照片（V3）——{data.visuals.length} 张滨江公共空间开源影像（Wikimedia Commons，CC BY-SA 4.0）。
              </li>
              <li>
                可画：近似区域（文字方位与相邻描述）——{data.world.approximateEntities.length} 个对象有文字方位，无任何坐标。
              </li>
              <li>可画：时间轴——{data.timeline?.events.length ?? 0} 条有据时间变化。</li>
              <li>可画：证据返还、追问、发现——不主张空间或影像事实。</li>
              {surfaceBlocked
                .filter((b) => ["before_after", "historical_photo", "historical_geometry", "current_map"].includes(b.surfaceType))
                .map((b) => (
                  <li key={b.surfaceType}>
                    不画：{b.surfaceType}（{b.reasonCode}）
                  </li>
                ))}
            </ul>
            <p className="a001-muted">
              依据：滨江公共空间有合法开源照片（今日现场）；绿之丘建筑本体暂无合法照片，故其体量形态按 V4
              解释标注（克制线框/热点）呈现，明确标注非测绘、无坐标、无比例。未取得授权的图像不在此展示。
            </p>
          </details>
        </section>

        {/* ── 右：墨痕叙事 + 证据（不与舞台重叠） ── */}
        <section className="a001-panel" aria-label="墨痕与证据">
          {state.drawer ? (
            <div className="a001-drawer" data-testid="a001-drawer">
              <div className="a001-drawer__head">
                <h2>{state.drawer.title}</h2>
                <button className="a001-btn a001-btn--ghost" data-testid="a001-drawer-close" onClick={() => dispatch({ type: "CLOSE_DRAWER" })}>
                  收起
                </button>
              </div>
              <p className="a001-muted">
                下面是生产链发布的原句（不改写）。每条都带出处、发布机构、日期与片段序号。
              </p>
              <EvidenceList items={state.drawer.items} />
            </div>
          ) : state.step === "today" ? (
            <div data-testid="a001-panel-today">
              <h2>今天：这处空间已经被当成公共场所使用</h2>
              {todayConnection ? (
                <div className="a001-card a001-card--today">
                  <p className="a001-card__lead">{todayConnection.observedState}</p>
                  <blockquote className="a001-quote">「{todayConnection.basisText}」</blockquote>
                  <p className="a001-muted">上面的引文是材料原句；墨痕只是把它读成「进入方式本身是改造的产物」。</p>
                  {todayConnection.openQuestions.length > 0 && (
                    <p className="a001-gap">
                      还没说清的：{todayConnection.openQuestions.join("；")}
                    </p>
                  )}
                  <button
                    className="a001-btn"
                    data-testid="a001-today-see-source"
                    onClick={() => dispatch({ type: "OPEN_DRAWER", title: "今日联系的原文", items: evidenceForHotspot("ramp") })}
                  >
                    看这句话的出处
                  </button>
                </div>
              ) : (
                <p className="a001-gap">这一轮材料没有提供可核的今日使用描述，墨痕不替它补。</p>
              )}

              <p className="a001-lead">
                但这栋房子不是一开始就这样的。下一步回去看它原来的样子——以及材料只肯说到哪一步。
              </p>
              <button className="a001-btn a001-btn--primary" data-testid="a001-next-then" onClick={() => dispatch({ type: "GOTO", step: "then" })}>
                回看 1995 的前身 →
              </button>
            </div>
          ) : state.step === "then" ? (
            <div data-testid="a001-panel-then">
              <h2>回看：从六层厂房到今天</h2>
              <p className="a001-lead">
                材料能给出年代的部分，墨痕照录；不能给出年份的，就只说到十年或直接说未载。
              </p>
              <ol className="a001-timeline">
                {(data.timeline?.events ?? []).map((ev, i) => (
                  <li key={`${ev.entity}-${i}`} className="a001-timeline__item" data-testid="a001-timeline-item">
                    <span className="a001-timeline__year">{yearLabel(ev)}</span>
                    <span className="a001-timeline__body">
                      <b>{ev.entity}</b>
                      <span>{ev.afterState}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {data.timeline && data.timeline.events.some((e) => e.year === null) && (
                <p className="a001-gap">
                  注意：改造与获奖两件事，材料没有给出年份，因此这里不写「某年建成开放」这类精确说法。
                </p>
              )}
              <button className="a001-btn a001-btn--primary" data-testid="a001-next-understand" onClick={() => dispatch({ type: "GOTO", step: "understand" })}>
                那么，哪些变了、哪些还没证？ →
              </button>
            </div>
          ) : state.step === "understand" ? (
            <div data-testid="a001-panel-understand">
              <h2>墨痕能说出口的判断</h2>
              <p className="a001-lead">每条都是解释增量，不是事实断言；点开就是它依据的原句。</p>
              <ul className="a001-claims">
                {data.claims.map((c) => (
                  <li key={c.id} className="a001-claim" data-testid="a001-claim">
                    <p className="a001-claim__text">{c.statement}</p>
                    <div className="a001-claim__meta">
                      {c.entities.map((e) => (
                        <span key={e} className="a001-tag">
                          {e}
                        </span>
                      ))}
                    </div>
                    {openQuestionFor(c.entities) && (
                      <p className="a001-gap">
                        尚缺：{openQuestionFor(c.entities)?.missingEvidence}
                      </p>
                    )}
                    <button
                      className="a001-btn a001-btn--small"
                      data-testid="a001-claim-evidence"
                      onClick={() =>
                        dispatch({ type: "OPEN_DRAWER", title: "这条判断依据的原句", items: claimEvidence(c.id) })
                      }
                    >
                      依据 {claimEvidence(c.id).length} 句 →
                    </button>
                  </li>
                ))}
              </ul>

              {data.refusedRelations.length > 0 && (
                <div className="a001-card a001-card--negative" data-testid="a001-negative-example">
                  <h3>一个还不能认定的问题</h3>
                  <p>{data.refusedRelations[0]}</p>
                  <p className="a001-muted">
                    材料只说「前身可追溯到 1920 年怡和冷库」。这是软性溯源，不是「同一栋建筑连续存在」的证明。
                  </p>
                  <button
                    className="a001-btn"
                    data-testid="a001-ask-negative"
                    onClick={() => {
                      setPreset({ id: Date.now(), text: "烟草仓库和怡和冷库是同一栋楼吗？" });
                      dispatch({ type: "GOTO", step: "ask" });
                    }}
                  >
                    让墨痕正面回答这个错误提法 →
                  </button>
                </div>
              )}
            </div>
          ) : state.step === "evidence" ? (
            <div data-testid="a001-panel-evidence">
              <h2>返证：每条判断都能回到原句</h2>
              <p className="a001-lead">
                下面是这一轮发布出来的全部材料原句（{data.evidence.length} 条），按来源分组。
              </p>
              <EvidenceList items={data.evidence} grouped />
              <div className="a001-gap-block">
                <h3>材料的缺口（墨痕没有装作知道）</h3>
                <ul>
                  {data.openQuestions.map((q) => (
                    <li key={q.question}>
                      {q.question}
                      <span className="a001-muted">（缺：{q.missingEvidence}）</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div data-testid="a001-panel-ask">
              <h2>追问：同一套判断，同一张嘴</h2>
              <p className="a001-lead">
                墨痕只依据上面这些已发布成果回答。问它答不了的，它会直说答不了，并且舞台不会替它画出来。
              </p>
              <MohenAsk
                preset={preset}
                suggestions={[
                  "绿之丘原来是什么？",
                  "今天是怎样走上去的？",
                  "烟草仓库和怡和冷库是同一栋楼吗？",
                  "这处改造是滨江贯通工程造成的吗？",
                ]}
                onDecision={(decision, question) => dispatch({ type: "ASK_RESULT", decision, question })}
              />
              <div className="a001-gap-block">
                <h3>墨痕明确不认定的关系</h3>
                <ul>
                  {data.refusedRelations.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="a001-foot">
        <p>
          数据来源：{uniqueSources(data.evidence).join(" · ")}
        </p>
        <p className="a001-muted">
          本页所有文字与证据来自真实数据生产链（D00—D05 / G0—G5）的已发布成果。今日现场照片为滨江公共空间开源影像
          （Wikimedia Commons，CC BY-SA 4.0，作者见图片标注）；绿之丘建筑本体的体量形态为按材料文字的示意（V4 解释标注），
          非测绘、无坐标、无比例。未取得授权的图像不在此展示。
        </p>
      </footer>
    </main>
  );
}

function uniqueSources(items: A001EvidencePointer[]): string[] {
  const set = new Set(items.map((e) => (e.publisher ? `${e.publisher}《${e.sourceTitle}》` : e.sourceTitle)));
  return [...set];
}

function EvidenceList({ items, grouped = false }: { items: A001EvidencePointer[]; grouped?: boolean }) {
  if (!items.length) {
    return <p className="a001-gap">这一步在已发布的材料里没有对应原句——墨痕不替你补。</p>;
  }
  if (!grouped) {
    return (
      <ul className="a001-evidence" data-testid="a001-evidence-list">
        {items.map((e) => (
          <li key={e.id} className="a001-evidence__item" data-testid="a001-evidence-item">
            <blockquote className="a001-quote">「{e.excerpt}」</blockquote>
            <div className="a001-evidence__meta">
              <span>{e.sourceTitle}</span>
              {e.publisher && <span>{e.publisher}</span>}
              {e.date && <span>{e.date}</span>}
              {e.fragmentIndex !== null && <span>第 {e.fragmentIndex + 1} 段</span>}
              {e.url && (
                <a href={e.url} target="_blank" rel="noopener noreferrer" data-testid="a001-evidence-link">
                  打开原页面 ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }
  const groups = new Map<string, A001EvidencePointer[]>();
  for (const e of items) {
    const key = e.sourceTitle || "来源未标注";
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  return (
    <div className="a001-evidence-groups" data-testid="a001-evidence-list">
      {[...groups.entries()].map(([title, list]) => (
        <section key={title} className="a001-evidence-group">
          <h3>{title}</h3>
          <p className="a001-muted">
            {list[0]?.publisher}
            {list[0]?.date ? ` · ${list[0].date}` : ""} · 共 {list.length} 段
            {list[0]?.url && (
              <>
                {" · "}
                <a href={list[0].url} target="_blank" rel="noopener noreferrer">
                  打开原页面 ↗
                </a>
              </>
            )}
          </p>
          <ul className="a001-evidence">
            {list.map((e) => (
              <li key={e.id} className="a001-evidence__item" data-testid="a001-evidence-item">
                <blockquote className="a001-quote">「{e.excerpt}」</blockquote>
                {e.fragmentIndex !== null && <span className="a001-muted">第 {e.fragmentIndex + 1} 段</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
