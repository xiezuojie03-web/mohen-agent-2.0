// Spatial Surfaces — 可复用空间组件。
//
// 硬规则（§4 / §19-5 / §13）：
//   组件不得拥有或硬编码任何 town-specific 历史真相。
//   所有名称、布局、标签都由 semantic input（slice / world）推导；
//   所有形状都是 symbol / topology，不是历史 Claim（§10/§11）。
//
// TASK-0015：
//   CurrentMapSurface      → Current Geographic Surface V2（deterministic vector geographic canvas）
//   RelationalSpaceSurface → Relational Historical Surface V3（人文拓扑空间，最高优先级）
//   二者都改用公共视觉基础 lib/mohen-visual（Visual Grammar + SpatialCanvas）。

"use client";

import { useState } from "react";
import type { SliceShape, SurfaceComponentProps } from "./types";
import { LEVEL_LABELS, type NarrativeLevel } from "@mohen/experience-engine";
import {
  SpatialCanvas,
  VisualLegend,
  type CanvasLayer,
  type CanvasPrimitive,
  type CanvasView,
  type LabelRequest,
} from "../../../../lib/mohen-visual/spatial-canvas";
import {
  SPATIAL,
  nodeRoleForFeatureType,
  relationRoleForEpistemic,
  type NodeRole,
} from "../../../../lib/mohen-visual/visual-grammar";

// ---------------------------------------------------------------------------
// 通用工具：短键 / 语义标签（不含任何镇名或事实）
// ---------------------------------------------------------------------------

/** feature_key → 末段短键 */
function shortKey(key: string): string {
  return key.split("/").pop() ?? key;
}

/** anchor_key → 语义标签：优先取切片里同名 feature 的 canonical_label */
export function labelForAnchor(slice: SliceShape, anchorKey: string): string {
  const prefix = anchorKey.split("/")[0];
  const hit = slice.features.find((f) => shortKey(f.feature_key) === prefix);
  return hit?.canonical_label ?? prefix;
}

/** 关系谓词 → 人话标签（语义词汇表，非镇名） */
export function predicateLabel(predicate: string): string {
  const map: Record<string, string> = {
    spans_waterway: "跨越",
    spans_same_waterway: "同跨一条水道",
    former_site_of: "原址即",
    named_after: "得名于",
    temple_bridge_association: "关联（未证实）",
    relative_position_south_of: "在南",
  };
  return map[predicate] ?? predicate;
}

export function levelLabel(level: string): string {
  return LEVEL_LABELS[level as NarrativeLevel] ?? level;
}

// ---------------------------------------------------------------------------
// Current Geographic Surface V2（TASK-0015 §7）
//
// 数据边界（如实，不粉饰）：
//   本切片只有「可靠当前对象点 / 近似对象区」与切片自己声明的跨度，
//   **没有任何水道、道路、POI 线面几何** → 一律不画，宁可抽象也不编造。
//   只画：经纬网 + 比例尺 + 指北 + 范围框 + 有来源的当前锚点。
// ---------------------------------------------------------------------------

/** 图框坐标系：由 spatial_extent_current.gcj02_bbox 声明（另一坐标系的记录一律不并入） */
const FRAME_CRS = "GCJ-02";
const GEO_VIEW: CanvasView = { width: 760, height: 470, pad: 96 };
/** 底部隔离带：放「另一坐标系」的参考锚（分列记录、不混算） */
const GEO_STRIP = 66;

export function CurrentMapSurface({ ctx, compact }: SurfaceComponentProps) {
  const W = GEO_VIEW.width;
  const H = GEO_VIEW.height;
  const x0 = 108;
  const x1 = W - 88;
  const y0 = 74;
  const y1 = H - GEO_VIEW.pad - GEO_STRIP;
  const bbox = ctx.slice.spatial_extent_current.gcj02_bbox;
  const span = ctx.slice.spatial_extent_current.gcj02_span_m;
  const degLng = bbox.max_lng - bbox.min_lng || 1;
  const degLat = bbox.max_lat - bbox.min_lat || 1;
  const fw = x1 - x0;
  const fh = y1 - y0;

  const project = (lng: number, lat: number) => ({
    x: x0 + ((lng - bbox.min_lng) / degLng) * fw,
    y: y0 + ((bbox.max_lat - lat) / degLat) * fh,
  });
  const parsePair = (raw: string): { a: number; b: number } | null => {
    const [p, q] = raw.split(",").map(Number);
    return Number.isFinite(p) && Number.isFinite(q) ? { a: p, b: q } : null;
  };

  // 只有与图框同坐标系的锚点才被投影（§12-6：不换算、不混算）
  const inFrame = ctx.slice.current_sources.filter((a) => a.coord_system === FRAME_CRS);
  const offFrame = ctx.slice.current_sources.filter((a) => a.coord_system !== FRAME_CRS);

  const exact: CanvasPrimitive[] = [];
  const approx: CanvasPrimitive[] = [];
  for (const a of inFrame) {
    const pair = parsePair(a.location_raw);
    if (!pair) continue;
    const { x, y } = project(pair.a, pair.b);
    const label = labelForAnchor(ctx.slice, a.anchor_key);
    if (a.kind === "provider_current_object_point") {
      exact.push({
        kind: "marker",
        key: `exact-${shortKey(a.anchor_key)}`,
        x,
        y,
        glyph: "exact",
        label,
        sub: `${pair.a.toFixed(6)}, ${pair.b.toFixed(6)}`,
        className: "map-point",
      });
    } else if (a.kind === "provider_current_object_area") {
      approx.push({
        kind: "approximate",
        key: `area-${shortKey(a.anchor_key)}`,
        x,
        y,
        rx: 74,
        ry: 52,
        label,
        sub: "近似范围 · 无精确点",
        className: "approx-area",
      });
    }
  }

  // 比例尺：只使用切片自己声明的跨度（估读，不声称面积）
  const mPerPx = span.ew_m > 0 ? span.ew_m / fw : 0;
  const NICE = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  const barMeters = NICE.filter((n) => n <= span.ew_m * 0.4).pop() ?? NICE[0];
  const barPx = mPerPx > 0 ? barMeters / mPerPx : 0;

  const stripY = y1 + 40;
  const refs: CanvasPrimitive[] = offFrame.map((a, i) => ({
    kind: "marker",
    key: `ref-${i}`,
    x: x0 + ((i + 0.5) * fw) / Math.max(1, offFrame.length),
    y: stripY,
    glyph: "reference",
    label: `${a.coord_system} · ${a.location_raw}`,
    sub: "参考锚 · 不并入本图",
    className: "map-ref",
  }));

  const labels: LabelRequest[] = [
    { key: "geo-crs", text: `本图坐标系 ${FRAME_CRS}（原值，零换算）`, x: x0, y: y0 - 26, prefer: "above", size: 11, className: "vg-label vg-label--sub" },
    { key: "geo-lng0", text: `${bbox.min_lng.toFixed(4)}°E`, x: x0, y: y1 + 18, prefer: "below", size: 10, className: "vg-tick" },
    { key: "geo-lng1", text: `${bbox.max_lng.toFixed(4)}°E`, x: x1, y: y1 + 18, prefer: "below", size: 10, className: "vg-tick" },
    {
      key: "geo-strip",
      text: "↓ 另一坐标系的记录：分列登记，不并入本图、不做换算",
      x: x0,
      y: y1 + 26,
      prefer: "below",
      size: 10,
      className: "vg-label vg-label--sub",
    },
  ];

  const layers: CanvasLayer[] = [
    {
      id: "frame",
      semantic: "frame",
      primitives: [
        {
          kind: "graticule",
          key: "grid",
          x0,
          y0,
          w: fw,
          h: fh,
          cols: 4,
          rows: 4,
          ticks: [`${bbox.max_lat.toFixed(4)}°N`, `${bbox.min_lat.toFixed(4)}°N`],
        },
        {
          kind: "extent",
          key: "bbox",
          x: x0,
          y: y0,
          w: fw,
          h: fh,
          corners: [
            `${bbox.min_lng.toFixed(4)},${bbox.max_lat.toFixed(4)}`,
            `${bbox.max_lng.toFixed(4)},${bbox.max_lat.toFixed(4)}`,
            `${bbox.min_lng.toFixed(4)},${bbox.min_lat.toFixed(4)}`,
            `${bbox.max_lng.toFixed(4)},${bbox.min_lat.toFixed(4)}`,
          ],
        },
        ...(barPx > 0
          ? [
              {
                kind: "scalebar" as const,
                key: "scale",
                x: x0 + 10,
                y: y1 - 14,
                lengthPx: barPx,
                label: `${barMeters} m（按切片声明跨度估读）`,
              },
            ]
          : []),
        { kind: "northarrow", key: "north", x: x1 - 22, y: y0 + 34 },
      ],
    },
    { id: "approx", semantic: "annotations", primitives: approx },
    { id: "points", semantic: "nodes", primitives: exact },
    { id: "refs", semantic: "annotations", primitives: refs },
  ];

  return (
    <div className="surf surf-map surf-map--v2" data-testid="surface-current-map">
      <p className="surf__caption">
        当前地理空间 · {FRAME_CRS} 原值 · 只代表<b>今天</b>
      </p>
      <SpatialCanvas
        view={GEO_VIEW}
        layers={layers}
        labels={labels}
        title="当前地理空间：可靠当前锚点与声明跨度"
        className="surf-map__svg"
        testId="current-geographic-canvas"
      />
      <VisualLegend
        className="vg-legend--geo"
        items={[
          { token: SPATIAL.node, text: "当前对象点", shape: "dot" },
          { token: SPATIAL.approximate_area, text: "近似范围", shape: "dot" },
          { token: SPATIAL.approximate_area, text: "参考锚（另一坐标系）", shape: "dot" },
        ]}
      />
      {!compact && (
        <p className="surf__note">
          这里没有水道 / 道路：本切片没有任何可靠线面几何，宁可抽象，也不画一条编出来的河。
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApproximateAreaSurface：只有近似/区域 grounding → 不得伪装精确点（§5A.2-2, §11）
// ---------------------------------------------------------------------------
export function ApproximateAreaSurface({ ctx, compact }: SurfaceComponentProps) {
  const areas = ctx.slice.current_sources.filter((a) => a.kind === "provider_current_object_area");
  return (
    <div className="surf surf-approx" data-testid="surface-approximate-area">
      <p className="surf__caption">
        近似区域 · <b>没有精确点</b> · 范围来自当代服务返回的区域锚点，非比例多边形（无来源几何）
      </p>
      <svg viewBox="0 0 760 470" className="surf-approx__svg" role="img" aria-label="近似区域表达">
        {/* 象征性区域：明确无中心 marker、不暗示精确坐标 */}
        {areas.map((a, i) => {
          const cx = 240 + i * 260;
          const cy = 235;
          return (
            <g key={a.anchor_key} className="approx-area" data-place={labelForAnchor(ctx.slice, a.anchor_key)} data-testid={`approx-area-${a.anchor_key.split("/")[0]}`}>
              <ellipse cx={cx} cy={cy} rx={132} ry={108} className="approx-area__blob" />
              <ellipse cx={cx} cy={cy} rx={96} ry={76} className="approx-area__inner" />
              <text x={cx} y={cy + 6} textAnchor="middle" className="approx-area__label">
                {labelForAnchor(ctx.slice, a.anchor_key)}
              </text>
              <text x={cx} y={cy + 26} textAnchor="middle" className="approx-area__hint">
                约在这一带
              </text>
            </g>
          );
        })}
        <text x={380} y={418} textAnchor="middle" className="approx-note">
          没有中心精确 marker —— 这是有意的：确定性未达到就不画点
        </text>
      </svg>
      {!compact && (
        <div className="evidence-units">
          <div className="unit unit--UNKNOWN">
            <span className="unit__badge">{LEVEL_LABELS.UNKNOWN}</span>
            <span className="unit__text">
              精确边界无来源：本体验不把它变成精确点，也不把它继承到任何历史时期。
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relational Historical Surface V3（TASK-0015 §8 —— 最高优先级）
//
// 目标：不是知识图谱，而是「人文拓扑空间」。
//   · 水道 = 构图骨架（semantic spine，不是历史几何）
//   · bridge = crossing：骑在骨架上的跨越节点（形状本身说明「跨越」）
//   · temple = cultural_node：带开口的围合（可进入）
//   · E1 实线稳定 / E2 虚线可追问 / E3 点线弱线索 / 无线 = 中断的线（负空间）
//   · 寺↔桥：线索是虚的，历史功能关系没有一条连通的线
//   遮掉解释文字后仍应读出：水系骨架 → 两桥与水强关系 → 寺进入 → 寺桥未证。
// ---------------------------------------------------------------------------

const REL_VIEW: CanvasView = { width: 760, height: 470, pad: 40 };
const REL_GEOMETRY = { spineY: 214, bandH: 88, crossingGap: 228, culturalGap: 196, culturalY: 356, asideY: 96 };

export function RelationalSpaceSurface({ ctx, compact }: SurfaceComponentProps) {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const W = REL_VIEW.width;

  const all = ctx.slice.features.map((f) => ({
    key: shortKey(f.feature_key),
    label: f.canonical_label,
    type: f.feature_type,
    role: nodeRoleForFeatureType(f.feature_type),
  }));
  const roleOf: Record<string, NodeRole> = {};
  for (const n of all) roleOf[n.key] = n.role;

  const crossings = all.filter((n) => n.role === "crossing");
  const culturals = all.filter((n) => n.role === "cultural_node");
  const asides = all.filter((n) => n.role !== "spine" && n.role !== "crossing" && n.role !== "cultural_node");
  const spine = all.find((n) => n.role === "spine");

  const pos: Record<string, { x: number; y: number }> = {};
  crossings.forEach((n, i) => {
    pos[n.key] = { x: W / 2 + (i - (crossings.length - 1) / 2) * REL_GEOMETRY.crossingGap, y: REL_GEOMETRY.spineY };
  });
  culturals.forEach((n, i) => {
    pos[n.key] = { x: W / 2 + (i - (culturals.length - 1) / 2) * REL_GEOMETRY.culturalGap, y: REL_GEOMETRY.culturalY };
  });
  asides.forEach((n, i) => {
    pos[n.key] = { x: W / 2 + (i - (asides.length - 1) / 2) * REL_GEOMETRY.culturalGap, y: REL_GEOMETRY.asideY };
  });

  // 「寺/人」组：默认不进入画面，由 Beat 行动放进（progressive reveal）
  const isOptional = (n: { role: NodeRole }) => n.role === "cultural_node" || n.role === "node";
  const visibleNodes = ctx.optionalGroupIncluded ? all.filter((n) => n.role !== "spine") : all.filter((n) => !isOptional(n) && n.role !== "spine");
  const visibleKeys = new Set(visibleNodes.map((n) => n.key));

  const edges = ctx.slice.relations.map((r) => ({
    key: r.relation_key,
    from: shortKey(r.subject_feature_key),
    to: shortKey(r.object_feature_key),
    predicate: predicateLabel(r.predicate),
    cls: r.epistemic_class,
  }));

  const drawnEdges = edges
    .filter((e) => visibleKeys.has(e.from) && visibleKeys.has(e.to))
    // 「跨越」由 crossing 节点的形态表达（骑在骨架上），不再重复画一条线
    .filter((e) => !(roleOf[e.from] === "spine" || roleOf[e.to] === "spine"))
    // 对称关系在数据里可能以两个方向各存一条（同一主张的镜像表述）：
    // 画面上只保留一条，否则会出现两条几乎重合的线（展示层去重，切片条数不变）
    .filter((e, _i, arr) => {
      const pair = [e.from, e.to].sort().join("|");
      const twin = arr.find((x) => x.key !== e.key && [x.from, x.to].sort().join("|") === pair && x.predicate === e.predicate);
      return !twin || e.from <= twin.from;
    });

  const pairCount = (e: { from: string; to: string }) =>
    drawnEdges.filter((x) => [x.from, x.to].sort().join("|") === [e.from, e.to].sort().join("|")).length;
  const pairIndex = (e: { key: string; from: string; to: string }) =>
    drawnEdges
      .filter((x) => [x.from, x.to].sort().join("|") === [e.from, e.to].sort().join("|"))
      .findIndex((x) => x.key === e.key);

  const relationPrimitives: CanvasPrimitive[] = drawnEdges.map((e) => {
    const a = pos[e.from];
    const b = pos[e.to];
    const bothCrossings = roleOf[e.from] === "crossing" && roleOf[e.to] === "crossing";
    const n = pairCount(e);
    const idx = pairIndex(e);
    const shift = bothCrossings ? 0 : (idx - (n - 1) / 2) * 34;
    const curve = bothCrossings ? (e.cls === "E1" ? 0 : 74) : 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * shift;
    const ny = (dx / len) * shift;
    // 被问到的「关联型」断言且非 E1 → 画成**中断**的线：线索是虚的，中间是负空间
    const askedMissing =
      ctx.askedMissingRelation && /association|关联|relation|link|connect|未证实/i.test(e.predicate) && e.cls !== "E1";
    return {
      kind: "relation",
      key: e.key,
      from: [a.x + nx, a.y + ny],
      to: [b.x + nx, b.y + ny],
      role: relationRoleForEpistemic(e.cls),
      label: askedMissing ? "还没有一条线" : e.predicate,
      interrupted: askedMissing,
      curve,
      className: askedMissing
        ? "rel rel--absent"
        : e.cls !== "E1"
          ? "rel rel--candidate rel__line--dashed"
          : "rel rel--E1",
      testId: askedMissing ? "absent-relation" : undefined,
    };
  });

  const nodePrimitives: CanvasPrimitive[] = visibleNodes.map((n) => ({
    kind: "node",
    key: n.key,
    x: pos[n.key].x,
    y: pos[n.key].y,
    role: n.role,
    label: n.label,
    depth: ctx.optionalGroupIncluded && (n.role === "cultural_node" || n.role === "node") ? "emerging" : undefined,
    className: `node node--${n.type}`,
  }));

  const layers: CanvasLayer[] = [
    {
      id: "water",
      semantic: "water",
      primitives: spine
        ? [
            {
              kind: "spine",
              key: spine.key,
              x1: 34,
              x2: W - 34,
              y: REL_GEOMETRY.spineY,
              height: REL_GEOMETRY.bandH,
              label: `${spine.label} · 关系骨架（非历史几何）`,
            },
          ]
        : [],
    },
    { id: "relations", semantic: "relations", primitives: relationPrimitives },
    { id: "nodes", semantic: "nodes", primitives: nodePrimitives },
  ];

  return (
    <div className="surf surf-relational surf-relational--v3" data-testid="surface-relational-space">
      <p className="surf__caption">
        人文拓扑空间 · <b>无经纬度</b> · 不表达距离与走向 —— 水道是骨架，桥是跨越
      </p>
      <SpatialCanvas
        view={REL_VIEW}
        layers={layers}
        title="关系历史空间：水道为骨架、桥为跨越、寺为文化节点"
        focusKey={focusKey}
        onSelect={(k) => setFocusKey((cur) => (cur === k ? null : k))}
        className="surf-relational__svg"
        testId="relational-canvas"
      />
      <VisualLegend
        className="vg-legend--rel"
        items={[
          { token: SPATIAL.spine, text: "水系骨架", shape: "band" },
          { token: SPATIAL.crossing, text: "跨越节点", shape: "dot" },
          { token: SPATIAL.cultural_node, text: "文化节点", shape: "dot" },
          { token: SPATIAL.relation_confirmed, text: "已证", shape: "line" },
          { token: SPATIAL.relation_candidate, text: "候选（未落定）", shape: "line" },
          { token: SPATIAL.relation_weak, text: "弱线索", shape: "line" },
          { token: SPATIAL.relation_missing, text: "无线", shape: "line" },
        ]}
      />
      {!compact && (
        <p className="surf__note">
          实线＝有据；虚线＝候选；点线＝弱线索；断开＝被问到的连接还没有证据。
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoricalMapNativeSurface — prototype（§12）：native 文档空间，禁止现代配准暗示
// ---------------------------------------------------------------------------
export function HistoricalMapNativeSurface({ ctx }: SurfaceComponentProps) {
  const sources = (ctx.slice.historical_sources ?? []).filter((s) => s.key.startsWith("hs/"));
  const hm = ctx.world.historicalMapSource;
  const unresolved: string[] = [];
  if (hm) {
    if (!hm.attributable) unresolved.push("未归因于本切片任一对象");
    if (!hm.georeferenced) unresolved.push("未做现代配准");
    if (!hm.imageAvailable) unresolved.push("本机无合格史料图像可用");
  }
  return (
    <div className="surf surf-histmap" data-testid="surface-historical-map-native">
      <p className="surf__caption">
        史料原页空间 · <b>不做现代配准</b> · 不叠加现代底图 · 不升级为直接历史地图
      </p>
      <div className="histmap-frame">
        <div className="histmap-frame__image" data-testid="historical-map-image-slot">
          <span className="histmap-frame__empty">
            {hm?.imageAvailable ? "（原生文档空间查看位）" : "本机无合格史料图像可用 → 原型停在「源已登记」状态"}
          </span>
        </div>
        <ul className="histmap-meta">
          {hm && (
            <li>
              <b>源</b>：<code>{hm.key}</code> · {hm.status}
            </li>
          )}
          <li>
            <b>归因</b>：{hm && hm.attributable ? "可归因于切片对象" : "不可归因于本切片任一对象"}
          </li>
          <li>
            <b>配准</b>：{hm && hm.georeferenced ? "已配准" : "不可靠 → 现代配准表达 ineligible"}
          </li>
        </ul>
      </div>
      <div className="histmap-tags">
        {hm && <span className="tag tag--confirmed">confirmed：源已登记（{hm.status}）</span>}
        {unresolved.map((u) => (
          <span key={u} className="tag tag--unresolved">
            unresolved：{u}
          </span>
        ))}
      </div>
      {sources.length > 0 && (
        <details className="histmap-sources">
          <summary>登记的史料源（{sources.length}）</summary>
          <ul>
            {sources.slice(0, 5).map((s) => (
              <li key={s.key}>
                <code>{s.key}</code> {s.note}
                {!s.attributable_to_slice_objects && <span className="tag tag--unresolved">未归因</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
