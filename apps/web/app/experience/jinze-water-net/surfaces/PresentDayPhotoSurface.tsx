// surfaces/PresentDayPhotoSurface.tsx
//
// Stage 1·2.2 — 今貌影像主角（Hero）。
//
// 硬规则（与 SpatialSurfaces 顶部一致）：组件不拥有/不硬编码任何 town-specific 真相；
// 所有图、标签、钩子都来自 ctx.presentDayPhotos / ctx.presentDayHeroHook（curated manifest 数据）。
// 图像直链复用 EvidenceNarrativeSurfaces 的 commonsDirectUrl 构造器。
//
// V1.5 视觉批次：真实优先——P06 视觉证据（world.visual_objects → evidence_pointers，
// G5 · visual_stage）已发布时，照片作为生产链产出的史料呈现：身份标注「今日观察」、
// 出处/license/作者随行、条目自述照录（来源自己的话）。不可用时回落冻结策展清单（降级）。

"use client";

import type { SurfaceComponentProps } from "./types";
import { commonsDirectUrl } from "./EvidenceNarrativeSurfaces";

export function PresentDayPhotoSurface({ ctx }: SurfaceComponentProps) {
  const photos = ctx.presentDayPhotos ?? [];
  const hook = ctx.presentDayHeroHook;

  // V1.5：真实优先——生产链发布的今貌照片（V3 今日观察）
  const visuals = ctx.productionSummary?.visuals ?? [];
  if (visuals.length > 0) {
    const [hero, ...rest] = visuals;
    const heroLabel = hero.entities.join("、") || "今貌影像";
    const heroPage = hero.commonsTitle
      ? `https://commons.wikimedia.org/wiki/${hero.commonsTitle.replace(/^File:/, "File:")}`
      : "https://commons.wikimedia.org/";
    return (
      <div className="surf surf-present-day" data-testid="surface-present-day-photo">
        <p className="surf__caption">
          今日实景 · 真实产出 · <b>今日观察</b>（不是历史影像）
        </p>
        {hook && (
          <p className="present-day-hook" style={{ margin: "4px 0 14px", fontSize: 20, fontWeight: 600, color: "#17201d" }}>
            {hook}
          </p>
        )}
        <figure className="present-day-hero" style={{ margin: 0 }} data-testid="production-hero-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.displayUrl}
            alt={`${heroLabel} · 当代实景`}
            loading="eager"
            style={{ width: "100%", maxHeight: "52vh", objectFit: "cover", borderRadius: 12, display: "block", background: "#e7e2d6" }}
          />
          <figcaption style={{ marginTop: 10, fontSize: 14, lineHeight: 1.7, color: "#55605b" }}>
            <b style={{ color: "#17201d" }}>{heroLabel}</b> · {hero.timeIdentity}
            {hero.excerpt ? (
              <span style={{ display: "block", color: "#61786a" }}>
                <span data-testid="hero-photo-self-description">{hero.excerpt}</span>
                <span style={{ color: "#88918b", fontSize: 12 }}>（Commons 条目自述，来源自己的话）</span>
              </span>
            ) : null}
            <a
              href={heroPage}
              target="_blank"
              rel="noreferrer"
              className="present-day-src"
              style={{ marginLeft: 10, color: "#61786a", fontSize: 12 }}
            >
              来源：{hero.sourceTitle} · {hero.artist} · {hero.license}
            </a>
          </figcaption>
        </figure>

        {rest.length > 0 && (
          <div
            className="present-day-strip"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
              marginTop: 18,
            }}
          >
            {rest.map((p, i) => (
              <figure key={`${p.displayUrl}-${i}`} className="present-day-thumb" style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.displayUrl}
                  alt={`${p.entities.join("、")} · 当代实景`}
                  loading="lazy"
                  style={{ width: "100%", height: 84, objectFit: "cover", borderRadius: 8, display: "block", background: "#e7e2d6" }}
                />
                <figcaption style={{ marginTop: 4, fontSize: 12, color: "#55605b" }}>
                  {p.entities.join("、") || "今貌影像"}
                  <span style={{ display: "block", color: "#88918b", fontSize: 11 }}>{p.license}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="surf surf-present-day" data-testid="surface-present-day-photo">
        <p className="surf__caption">今日实景 · 没有已登记的当代照片</p>
        <p className="surf__note">本体验未挂钩任何当代影像资产。</p>
      </div>
    );
  }

  const [hero, ...rest] = photos;

  return (
    <div className="surf surf-present-day" data-testid="surface-present-day-photo">
      <p className="surf__caption">今日实景 · 不是历史影像</p>
      {hook && (
        <p className="present-day-hook" style={{ margin: "4px 0 14px", fontSize: 20, fontWeight: 600, color: "#17201d" }}>
          {hook}
        </p>
      )}
      <figure className="present-day-hero" style={{ margin: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={commonsDirectUrl(hero.commons_file)}
          alt={`${hero.label} · 当代实景`}
          loading="eager"
          style={{ width: "100%", borderRadius: 12, display: "block", background: "#e7e2d6" }}
        />
        <figcaption style={{ marginTop: 10, fontSize: 14, lineHeight: 1.7, color: "#55605b" }}>
          <b style={{ color: "#17201d" }}>{hero.label}</b> · {hero.caption}
          <a
            href={hero.commons_file}
            target="_blank"
            rel="noreferrer"
            className="present-day-src"
            style={{ marginLeft: 10, color: "#61786a", fontSize: 12 }}
          >
            来源（Wikimedia Commons · CC BY-SA）
          </a>
        </figcaption>
      </figure>

      {rest.length > 0 && (
        <div
          className="present-day-strip"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 10,
            marginTop: 18,
          }}
        >
          {rest.map((p) => (
            <figure key={p.feature_key} className="present-day-thumb" style={{ margin: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={commonsDirectUrl(p.commons_file)}
                alt={`${p.label} · 当代实景`}
                loading="lazy"
                style={{ width: "100%", height: 84, objectFit: "cover", borderRadius: 8, display: "block", background: "#e7e2d6" }}
              />
              <figcaption style={{ marginTop: 4, fontSize: 12, color: "#55605b" }}>{p.label}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
