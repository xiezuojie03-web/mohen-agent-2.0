"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublishedWork } from "../../lib/publication";
import type { Beat } from "../../lib/studio-creation";

function parseBeats(content: string): Beat[] {
  try {
    const c = JSON.parse(content || "{}") as { beats?: Beat[] };
    return Array.isArray(c.beats) ? c.beats : [];
  } catch {
    return [];
  }
}

function formatTimecode(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "时码未提供";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 每章停留时长（毫秒）：优先用相邻章节时码差，否则固定 8 秒
function beatDuration(beats: Beat[], index: number): number {
  const cur = beats[index]?.directorTimecodeMs ?? 0;
  const next = beats[index + 1]?.directorTimecodeMs;
  if (typeof next === "number" && next > cur) return next - cur;
  return 8000;
}

export default function WatchGallery() {
  const [works, setWorks] = useState<PublishedWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<PublishedWork | null>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    (async () => {
      try {
        const res = await fetch("/api/works/published", { signal: controller.signal });
        if (!res.ok) throw new Error("catalogue_unavailable");
        const json = (await res.json()) as { works?: PublishedWork[] };
        if (!Array.isArray(json?.works) || json.works.some(work => !work ||
          typeof work.work_id !== "string" || typeof work.revision_id !== "string" ||
          typeof work.title !== "string" || typeof work.content !== "string")) {
          throw new Error("catalogue_invalid");
        }
        if (controller.signal.aborted) return;
        setWorks(json.works);
        setSelected(json.works[0] ?? null);
      } catch {
        if (!controller.signal.aborted) setLoadFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [reload]);

  const beats = useMemo(() => (selected ? parseBeats(selected.content) : []), [selected]);

  // 切换作品时重置进度
  useEffect(() => {
    setCurrent(0);
    setPlaying(false);
  }, [selected?.work_id]);

  // 自动播放推进
  useEffect(() => {
    if (!playing || beats.length === 0) return;
    if (current >= beats.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setCurrent((c) => c + 1), beatDuration(beats, current));
    return () => clearTimeout(timer);
  }, [playing, current, beats]);

  function selectWork(w: PublishedWork) {
    setSelected(w);
  }
  function goTo(i: number) {
    if (i >= 0 && i < beats.length) setCurrent(i);
  }
  function togglePlay() {
    if (beats.length === 0) return;
    if (current >= beats.length - 1 && !playing) setCurrent(0);
    setPlaying((p) => !p);
  }

  if (loading) {
    return (
      <main className="watch">
        <div className="watch__loading">加载中…</div>
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main className="watch">
        <div className="watch__body">
          <section className="watch__hero">
            <div className="watch__overlay">
              <p role="alert">作品暂时加载失败，请重试。</p>
              <button className="watch__ctrl" onClick={() => setReload(value => value + 1)}>重试</button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (works.length === 0) {
    return (
      <main className="watch">
        <div className="watch__body">
          <section className="watch__hero">
            <div className="watch__overlay">
              <span className="watch__status">暂无已发布作品</span>
              <h1 className="watch__title">作品将从这里沉浸观看</h1>
              <p className="watch__desc">
                当有作品在创作 Studio 里完成、并通过运营审核发布后，这里会以沉浸方式呈现它的画面、章节、旁白与进度。
                目前还没有已发布的作品。
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const beat = beats[current] ?? null;
  const progress = beats.length ? ((current + 1) / beats.length) * 100 : 0;

  return (
    <main className="watch">
      <div className="watch__body watch__body--player">
        {/* 主舞台：沉浸式播放 */}
        <div className="watch__main">
          <div className="watch__stage" ref={stageRef}>
            <div className="watch__stage-meta">
              <span className="watch__status">已发布 · 版本 {selected?.revision_no}</span>
              <span className="watch__stage-count">
                {String(current + 1).padStart(2, "0")} / {String(beats.length).padStart(2, "0")}
              </span>
            </div>

            {/* 视觉舞台：画面（文字化）+ 旁白字幕 */}
            <div className="watch__stage-visual">
              <div className="watch__stage-frame">
                <span className="watch__stage-frame-label">画面</span>
                <p>{beat?.visual || "（本章暂无画面描述）"}</p>
              </div>
              <div className="watch__stage-narration">
                {beat && (
                  <>
                    <h2>{beat.title}</h2>
                    <p>{beat.narration}</p>
                  </>
                )}
              </div>
            </div>

            <p className="watch__reading-notice">图文阅读 · 暂无可播放媒体</p>
            {/* 图文章节阅读；自动翻页不是媒体播放。 */}
            <div className="watch__controls">
              <button
                className="watch__ctrl"
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                aria-label="上一章"
              >
                ⏮ 上一章
              </button>
              <button className="watch__ctrl watch__ctrl--play" onClick={togglePlay} aria-label={playing ? "停止翻页" : "自动翻页"}>
                {playing ? "停止翻页" : "自动翻页"}
              </button>
              <button
                className="watch__ctrl"
                onClick={() => goTo(current + 1)}
                disabled={current >= beats.length - 1}
                aria-label="下一章"
              >
                下一章 ⏭
              </button>
            </div>

            {/* 章节轴 */}
            <div className="watch__timeline" aria-label="章节位置">
              <div className="watch__timeline-progress" style={{ width: `${progress}%` }} />
              {beats.map((b, i) => (
                <button
                  key={i}
                  className={`watch__chapter${i === current ? " is-active" : ""}`}
                  onClick={() => goTo(i)}
                >
                  <span className="watch__chapter-no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="watch__chapter-title">{b.title}</span>
                  <span className="watch__chapter-time">导演时码 {formatTimecode(b.directorTimecodeMs)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 侧栏：作品列表 */}
        <aside className="watch__side">
          <div className="watch__tabs">
            <button className="watch__tab is-active">作品简介</button>
            <button className="watch__tab">相关探索</button>
            <button className="watch__tab">参考资料</button>
          </div>

          <div className="watch__worklist">
            {works.map((w) => (
              <button
                key={w.work_id}
                className={`watch__work${selected?.work_id === w.work_id ? " is-active" : ""}`}
                onClick={() => selectWork(w)}
              >
                <span className="watch__work-title">{w.title}</span>
                <span className="watch__work-meta">版本 {w.revision_no}</span>
              </button>
            ))}
          </div>

          <div className="watch__info">
            <strong>观看说明</strong>
            观看消费的是已发布作品；画面以文字描述呈现，配音与真实影像待创作编导引擎逐步补齐。
          </div>
        </aside>
      </div>
    </main>
  );
}
