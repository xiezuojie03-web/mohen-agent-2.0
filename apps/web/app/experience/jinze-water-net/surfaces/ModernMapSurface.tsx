// apps/web/app/experience/jinze-water-net/surfaces/ModernMapSurface.tsx
//
// modern_map 表面：只表达「当下」精确地理。
// 数据源：冻结切片 current_sources 的 provider_current_object_point（GCJ-02 原值，零换算）。
// 以坐标忠实的矢量投影呈现（含坐标轴刻度读数与比例），并显式声明坐标系与「仅当下」语义。
// 本表面绝不出现在 RELATIONAL_HISTORICAL 场景（由 CompositionState + isPresentScene 保证）。

"use client";

import type { SurfaceProps } from "./SurfaceRenderer";

interface PlotPoint {
  key: string;
  label: string;
  lng: number;
  lat: number;
}

export default function ModernMapSurface({ slice, focusPlace, compact }: SurfaceProps) {
  const points: PlotPoint[] = slice.current_sources
    .filter((a) => a.kind === "provider_current_object_point" || a.kind === "provider_current_object_area")
    .map((a) => {
      const [lng, lat] = a.location_raw.split(",").map(Number);
      const key = a.anchor_key.split("/")[0];
      const labels: Record<string, string> = {
        pujiqiao: "普济桥",
        wananqiao: "万安桥",
        "yihaosi-site": "颐浩寺遗址",
      };
      return { key, label: labels[key] ?? key, lng, lat };
    });

  const bbox = slice.spatial_extent_current.gcj02_bbox;
  const span = slice.spatial_extent_current.gcj02_span_m;
  const W = 760;
  const H = 520;
  const pad = 90;
  const project = (p: PlotPoint) => ({
    x: pad + ((p.lng - bbox.min_lng) / (bbox.max_lng - bbox.min_lng || 1)) * (W - pad * 2),
    y: pad + ((bbox.max_lat - p.lat) / (bbox.max_lat - bbox.min_lat || 1)) * (H - pad * 2),
  });

  return (
    <div className="surf surf-modernmap" data-testid="surface-modern-map">
      <p className="surf__caption">
        现代精确地图 · 坐标系 GCJ-02（原值，零换算）· 仅代表<b>当下</b>位置——不是历史位置
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="金泽三处遗存的当前精确坐标图" className="surf-modernmap__svg">
        {/* 坐标网格 + 刻度读数：让「精确坐标」本身可见，退出时随之淡出 */}
        <g className="coord-grid">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={`v${t}`} x1={pad + t * (W - pad * 2)} y1={pad - 28} x2={pad + t * (W - pad * 2)} y2={H - pad + 28} />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={`h${t}`} x1={pad - 28} y1={pad + t * (H - pad * 2)} x2={W - pad + 28} y2={pad + t * (H - pad * 2)} />
          ))}
          <text x={pad} y={H - pad + 46} className="coord-tick">
            {bbox.min_lng.toFixed(4)}°E
          </text>
          <text x={W - pad} y={H - pad + 46} className="coord-tick" textAnchor="end">
            {bbox.max_lng.toFixed(4)}°E
          </text>
          <text x={pad - 34} y={pad + 4} className="coord-tick">
            {bbox.max_lat.toFixed(4)}°N
          </text>
          <text x={pad - 34} y={H - pad + 4} className="coord-tick">
            {bbox.min_lat.toFixed(4)}°N
          </text>
        </g>
        {points.map((p) => {
          const { x, y } = project(p);
          const focused = focusPlace === p.label;
          return (
            <g key={p.key} className={`map-point ${focused ? "map-point--focus" : ""}`} data-place={p.label}>
              <circle cx={x} cy={y} r={10} className="map-point__dot" />
              <circle cx={x} cy={y} r={18} className="map-point__halo" />
              <text x={x + 24} y={y + 5} className="map-point__label">
                {p.label}
              </text>
              <text x={x + 24} y={y + 22} className="map-point__coord">
                {p.lng.toFixed(6)}, {p.lat.toFixed(6)}
              </text>
            </g>
          );
        })}
        <text x={W - pad} y={pad - 40} textAnchor="end" className="coord-scale">
          实地跨度约 {span.ns_m} m（南北）× {span.ew_m} m（东西）· {slice.spatial_extent_current.anchor_count} 个当前锚点
        </text>
      </svg>
      {!compact && (
        <p className="surf__note">
          这些坐标来自当代地图服务（AMap 对象点），属于「现在」。往回走的时候，它们会失去作证的资格。
        </p>
      )}
    </div>
  );
}
