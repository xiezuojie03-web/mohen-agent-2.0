// apps/web/app/experience/jinze-water-net/surfaces/CurrentPhotoSurface.tsx
//
// current_photo 表面：仅使用冻结 script.visual_assets 白名单内的当代实景照片
// （3 张 Commons confirmed current，CC BY-SA）。通过 Wikimedia Special:FilePath
// 引用原图，保留署名/许可与来源链接；显式标注「今日实景 · 非历史照片」。

"use client";

import { LEVEL_LABELS, type NarrativeLevel } from "@mohen/experience-engine";
import type { SurfaceProps } from "./SurfaceRenderer";

/** 从冻结产物中的 Commons 页面 URL 推导直链（确定性变换，白名单仍以 script 为准） */
function commonsDirectUrl(pageUri: string, width = 900): string {
  const m = pageUri.match(/File:([^?#]+)/);
  if (!m) return pageUri;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(decodeURIComponent(m[1]))}?width=${width}`;
}

export default function CurrentPhotoSurface({ scene }: SurfaceProps) {
  const photos = scene.visual_assets.filter((a) => a.type === "photo");
  return (
    <div className="surf surf-photo" data-testid="surface-current-photo">
      <p className="surf__caption">今日实景 · 这些是「现在」的样子，不是历史影像（历史视觉资产 = 0）</p>
      <div className="photo-grid">
        {photos.map((a) => (
          <figure key={a.id} className="photo-card" data-testid={`photo-${a.label}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={commonsDirectUrl(a.uri)} alt={`${a.label} · 当代实景`} loading="lazy" />
            <figcaption>
              <b>{a.label}</b> · {a.rights}
              <a href={a.uri} target="_blank" rel="noreferrer">
                来源
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      {scene.narrative.length > 0 && (
        <div className="evidence-units">
          {scene.narrative.map((u) => (
            <div key={u.unit_id} className={`unit unit--${u.level}`}>
              <span className="unit__badge">{LEVEL_LABELS[u.level as NarrativeLevel]}</span>
              <span className="unit__text">{u.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
