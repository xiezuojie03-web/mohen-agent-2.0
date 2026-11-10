"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublishedWork } from "../../lib/publication";
import type { Beat } from "../../lib/studio-creation";

function parseBeats(content: string): Beat[] {
  try {
    const c = JSON.parse(content || "{}") as { beats?: Beat[] };
    return Array.isArray(c.beats) ? c.beats.filter((beat): beat is Beat => Boolean(beat && typeof beat.title === "string" && typeof beat.narration === "string")) : [];
  } catch {
    return [];
  }
}

/** 作品修订里逐件已核权利的真实媒体（由服务端 /api/works/media 供图）。 */
type WorkMedia = {
  asset_id: string;
  kind?: string;
  title?: string;
  license?: string;
  rights_status?: string;
  src?: string;
  caption?: string;
  provenance?: Record<string, unknown>;
};

function parseMedia(content: string): WorkMedia[] {
  try {
    const c = JSON.parse(content || "{}") as { media?: unknown };
    if (!Array.isArray(c.media)) return [];
    return c.media.filter((item): item is WorkMedia => {
      if (!item || typeof item !== "object") return false;
      const m = item as WorkMedia;
      return typeof m.asset_id === "string" && m.asset_id.length > 0
        && typeof m.src === "string" && m.src === `/api/works/media/${m.asset_id}`
        && typeof m.license === "string" && m.license.trim().length > 0
        && m.rights_status === "cleared";
    });
  } catch {
    return [];
  }
}

/** 只展示库里确实提供了的字段，缺失即不显示（不补默认、不编造）。 */
function mediaEvidence(media: WorkMedia): Array<{ label: string; value: string; href?: string }> {
  const p = (media.provenance ?? {}) as Record<string, unknown>;
  const text = (key: string) => {
    const value = p[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
  };
  const url = text("source_url");
  const rows = [
    { label: "书名", value: text("work_title") },
    { label: "版本", value: text("edition") },
    { label: "馆藏号", value: text("catalog_no") },
    { label: "页码", value: text("page_no") ? `第 ${text("page_no")} 页` : "" },
    { label: "藏地", value: text("held_by") },
    { label: "授权", value: media.license ?? "" },
    { label: "原件指纹", value: text("content_sha256") ? `SHA-256 ${text("content_sha256")}` : "" },
    { label: "来源", value: url, href: /^https?:\/\//.test(url) ? url : undefined },
  ];
  return rows.filter(row => row.value);
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
  const [sidePanel, setSidePanel] = useState<"overview" | "references" | "evidence">("overview");

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const requestVersion = useRef(0);

  // Recheck current server eligibility before further consumption. Polling bounds
  // detection to 15s plus request time; it cannot erase bytes already delivered.
  const revalidate = useCallback(async (target?: PublishedWork) => {
    const version = ++requestVersion.current;
    try {
      const response = await fetch("/api/works/published", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("catalogue_unavailable");
      const json = await response.json() as { works?: PublishedWork[] };
      if (!Array.isArray(json.works) || json.works.some(work => !work ||
        typeof work.work_id !== "string" || typeof work.revision_id !== "string" ||
        typeof work.title !== "string" || typeof work.content !== "string")) throw new Error("catalogue_invalid");
      if (version !== requestVersion.current) return null;
      const previous = target ?? selectedRef.current;
      const next = previous ? json.works.find(work => work.work_id === previous.work_id && work.revision_id === previous.revision_id) ?? null : json.works[0] ?? null;
      setWorks(json.works);
      setSelected(next);
      selectedRef.current = next;
      setLoadFailed(false);
      if (!next) { setPlaying(false); setCurrent(0); }
      return next;
    } catch {
      if (version === requestVersion.current) {
        setWorks([]); setSelected(null); selectedRef.current = null;
        setPlaying(false); setCurrent(0); setLoadFailed(true);
      }
      return null;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void revalidate();
    const timer = window.setInterval(() => { if (!document.hidden) void revalidate(); }, 15_000);
    const resume = () => { if (!document.hidden) void revalidate(); };
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      ++requestVersion.current;
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [reload, revalidate]);

  const selectedContent = selected?.content;
  const beats = useMemo(() => selectedContent ? parseBeats(selectedContent) : [], [selectedContent]);
  const media = useMemo(() => selectedContent ? parseMedia(selectedContent) : [], [selectedContent]);

  // 切换作品时重置进度
  useEffect(() => {
    setCurrent(0);
    setPlaying(false);
  }, [selected?.work_id, selected?.revision_id]);

  useEffect(() => { setSidePanel("overview"); }, [selected?.work_id, selected?.revision_id, current]);

  // 自动播放推进
  useEffect(() => {
    if (!playing || beats.length === 0) return;
    if (current >= beats.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (await revalidate()) setCurrent((c) => c + 1);
    }, beatDuration(beats, current));
    return () => clearTimeout(timer);
  }, [playing, current, beats, revalidate]);

  async function selectWork(w: PublishedWork) {
    setPlaying(false);
    await revalidate(w);
  }
  async function goTo(i: number) {
    setPlaying(false);
    if (i >= 0 && i < beats.length && await revalidate()) setCurrent(i);
  }
  async function togglePlay() {
    if (playing) { setPlaying(false); return; }
    if (beats.length === 0 || !await revalidate()) return;
    if (current >= beats.length - 1 && !playing) setCurrent(0);
    setPlaying((p) => !p);
  }

  async function openReferences() {
    setPlaying(false);
    if (await revalidate()) setSidePanel("references");
  }

  async function openEvidence() {
    setPlaying(false);
    if (await revalidate()) setSidePanel("evidence");
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
  const provenance = Array.isArray(beat?.provenanceRefs)
    ? [...new Set(beat.provenanceRefs.filter((ref): ref is string => typeof ref === "string" && ref.trim().length > 0))] : [];
  const progress = beats.length ? ((current + 1) / beats.length) * 100 : 0;

  // 真实原件扫描页：字节由 /api/works/media/<assetId> 在每次请求时复核 WATCH 资格后提供。
  const mediaBlock = media.length > 0 ? (
    <div className="watch__stage-media" aria-label="原件扫描页">
      {media.map((item) => (
        <figure className="watch__stage-media-item" key={item.asset_id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.src} alt={item.caption || item.title || "原件扫描页"} loading="lazy" decoding="async" />
          {(item.caption || item.title) && <figcaption>{item.caption || item.title}</figcaption>}
        </figure>
      ))}
    </div>
  ) : null;

  return (
    <main className="watch">
      <div className="watch__body watch__body--player">
        {/* 主舞台：沉浸式播放 */}
        <div className="watch__main">
          <div className="watch__stage" ref={stageRef}>
            <div className="watch__stage-meta">
              <span className="watch__status">已发布 · 版本 {selected?.revision_no}</span>
              <span className="watch__stage-count">
                {beats.length ? `${String(current + 1).padStart(2, "0")} / ${String(beats.length).padStart(2, "0")}` : "暂无章节"}
              </span>
            </div>

            {beats.length === 0 ? (
              <div className="watch__stage-visual" role="status">
                {mediaBlock}
                <div className="watch__stage-frame">
                  <strong>该作品暂无可阅读章节</strong>
                  <p>已发布记录存在，但没有有效的章节内容；无法播放或自动翻页。可在右侧选择其他作品。</p>
                </div>
              </div>
            ) : (
              <>
            {/* 视觉舞台：画面（文字化）+ 旁白字幕 */}
            <div className="watch__stage-visual">
              {mediaBlock}
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

            <p className="watch__reading-notice">
              {media.length > 0 ? `图文阅读 · 含 ${media.length} 页原件扫描页` : "图文阅读 · 暂无可播放媒体"}
            </p>
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
              </>
            )}
          </div>
        </div>

        {/* 侧栏：作品列表 */}
        <aside className="watch__side">
          <div className="watch__tabs">
            <button className={`watch__tab${sidePanel === "overview" ? " is-active" : ""}`} onClick={() => setSidePanel("overview")}>作品简介</button>
            <button className="watch__tab" disabled aria-describedby="watch-explore-gap">相关探索</button>
            <button
              className={`watch__tab${sidePanel === "evidence" ? " is-active" : ""}`}
              disabled={!media.length}
              onClick={openEvidence}
              aria-describedby={!media.length ? "watch-media-gap" : undefined}
            >
              依据
            </button>
            <button className={`watch__tab${sidePanel === "references" ? " is-active" : ""}`} disabled={!provenance.length} onClick={openReferences} aria-describedby={!provenance.length ? "watch-reference-gap" : undefined}>参考资料</button>
          </div>

          <p id="watch-explore-gap" className="watch__info">相关探索尚未提供可用入口。</p>
          {!media.length && <p id="watch-media-gap" className="watch__info">本作暂未绑定可展示的原件扫描页。</p>}
          {!provenance.length && <p id="watch-reference-gap" className="watch__info">本章未提供可读出处。</p>}
          {sidePanel === "evidence" && media.length > 0 ? (
            <section className="watch__info" aria-label="原件依据">
              <strong>{selected?.title} · 版本 {selected?.revision_no} · 原件</strong>
              {media.map((item) => {
                const rows = mediaEvidence(item);
                return (
                  <div className="watch__evidence" key={item.asset_id}>
                    <p className="watch__evidence-title">{item.title || item.caption || "原件扫描页"}</p>
                    <dl>
                      {rows.map(row => (
                        <div className="watch__evidence-row" key={`${item.asset_id}-${row.label}`}>
                          <dt>{row.label}</dt>
                          <dd>
                            {row.href
                              ? <a href={row.href} target="_blank" rel="noreferrer noopener">{row.value}</a>
                              : row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
              <button className="watch__ctrl" onClick={() => setSidePanel("overview")}>返回当前章节</button>
            </section>
          ) : sidePanel === "references" && provenance.length > 0 ? (
            <section className="watch__info" aria-label="当前章节出处">
              <strong>{selected?.title} · 版本 {selected?.revision_no} · {beat?.title}</strong>
              <p>以下为本章记录的出处文字；原件详情尚未开放。</p>
              <ul>{provenance.map(ref => <li key={ref}>{ref}</li>)}</ul>
              <button className="watch__ctrl" onClick={() => setSidePanel("overview")}>返回当前章节</button>
            </section>
          ) : <div className="watch__info"><strong>{selected?.title}</strong>{selected?.description || "该作品暂未提供简介。"}</div>}

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
            观看消费的是已发布作品；未绑定原件的作品以文字描述呈现，已绑定真实原件的作品同时展示原件扫描页，可在「依据」中核对来源。
          </div>
        </aside>
      </div>
    </main>
  );
}
