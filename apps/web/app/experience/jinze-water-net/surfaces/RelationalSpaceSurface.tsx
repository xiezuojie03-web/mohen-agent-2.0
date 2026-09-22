// apps/web/app/experience/jinze-water-net/surfaces/RelationalSpaceSurface.tsx
//
// relational_space 表面：关系历史空间——纯拓扑，零经纬度、零河道几何、零街道几何。
// 数据源：冻结切片 relations（E1 实线 / E2 虚线 / E3 注记）与 features（节点名）。
// 布局是预定义的固定拓扑模板（非 GIS、非坐标投影），节点间距离不表达真实距离。

"use client";

import { PREDICATE_LABELS, type SurfaceProps } from "./SurfaceRenderer";

// 预定义拓扑模板（节点位置为版式常量，不携带任何地理语义）
const LAYOUT: Record<string, { x: number; y: number }> = {
  jinzetang: { x: 380, y: 260 },
  pujiqiao: { x: 250, y: 150 },
  wananqiao: { x: 510, y: 150 },
  "yihaosi-site": { x: 380, y: 400 },
  lvyihao: { x: 590, y: 420 },
};

export default function RelationalSpaceSurface({ slice, focusPlace, compact }: SurfaceProps) {
  const shortKey = (k: string) => k.split("/").pop() ?? k;
  const nodes = slice.features.map((f) => ({
    key: shortKey(f.feature_key),
    label: f.canonical_label,
    type: f.feature_type,
    pos: LAYOUT[shortKey(f.feature_key)] ?? { x: 380, y: 300 },
  }));
  const edges = slice.relations.map((r) => ({
    key: r.relation_key,
    from: shortKey(r.subject_feature_key),
    to: shortKey(r.object_feature_key),
    predicate: PREDICATE_LABELS[r.predicate] ?? r.predicate,
    cls: r.epistemic_class,
  }));

  return (
    <div className="surf surf-relational" data-testid="surface-relational-space">
      <p className="surf__caption">
        关系历史空间 · <b>无经纬度</b> · 不表达精确距离 · 不绘制河道/街巷形状——证据精度变了，空间的表达形式也变了
      </p>
      <svg viewBox="0 0 760 520" role="img" aria-label="桥—水—寺的关系拓扑" className="surf-relational__svg">
        {/* 水道带：一条无名宽幅（表达「一条有名的水道」这一关系事实，不表达河形） */}
        <rect x={110} y={228} width={540} height={64} className="waterband" rx={10} />
        <text x={380} y={268} textAnchor="middle" className="waterband__label">
          金泽塘（同一条有名的水道 · 前现代着录未获得）
        </text>

        {edges.map((e) => {
          const a = LAYOUT[e.from];
          const b = LAYOUT[e.to];
          if (!a || !b) return null;
          const dashed = e.cls === "E2";
          return (
            <g key={e.key} className={`rel rel--${e.cls}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={dashed ? "rel__line rel__line--dashed" : "rel__line"} />
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 8}
                textAnchor="middle"
                className={`rel__label ${dashed ? "rel__label--dashed" : ""}`}
              >
                {e.predicate}〔{e.cls}〕
              </text>
            </g>
          );
        })}

        {nodes.map((n) => {
          const focused = focusPlace === n.label;
          return (
            <g key={n.key} transform={`translate(${n.pos.x},${n.pos.y})`} className={`node node--${n.type} ${focused ? "node--focus" : ""}`} data-place={n.label}>
              <circle r={n.type === "waterway" ? 34 : 26} className="node__circle" />
              <text y={5} textAnchor="middle" className="node__label">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      {!compact && (
        <p className="surf__note">
          实线 = 有据关系（E1）；虚线 = 仅有线索、未证实的关系（E2）。看懂「水上的关系」，是这一段体验的解释框架——它不是已证历史事实。
        </p>
      )}
    </div>
  );
}
