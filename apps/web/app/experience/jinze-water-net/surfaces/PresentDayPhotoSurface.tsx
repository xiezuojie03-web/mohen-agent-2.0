// surfaces/PresentDayPhotoSurface.tsx
//
// Stage 1·2.2 — 今貌影像主角（Hero）。
//
// 硬规则（与 SpatialSurfaces 顶部一致）：组件不拥有/不硬编码任何 town-specific 真相；
// 所有图、标签、钩子都来自 ctx.presentDayPhotos / ctx.presentDayHeroHook（curated manifest 数据）。
// 图像直链复用 EvidenceNarrativeSurfaces 的 commonsDirectUrl 构造器。

"use client";

import type { SurfaceComponentProps } from "./types";
import { commonsDirectUrl } from "./EvidenceNarrativeSurfaces";

export function PresentDayPhotoSurface({ ctx }: SurfaceComponentProps) {
  const photos = ctx.presentDayPhotos ?? [];
  const hook = ctx.presentDayHeroHook;

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
