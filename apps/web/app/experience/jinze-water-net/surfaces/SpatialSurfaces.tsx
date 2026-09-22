// Spatial Surfaces — 可复用空间组件。
//
// 硬规则（§4 / §19-5）：
//   组件不得拥有或硬编码任何 town-specific 历史真相。
//   所有名称、布局、标签都由 semantic input（slice / world）推导；
//   所有形状都是 symbol / topology，不是历史 Claim（§10/§11）。

"use client";

import type { SliceShape, SurfaceComponentProps } from "./types";
import { LEVEL_LABELS, type NarrativeLevel } from "@mohen/experience-engine";

// ---------------------------------------------------------------------------
// 通用工具：短键 / 语义标签 / 确定性布局（不含任何镇名或事实）
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

/** 确定性布局：按 feature_type 分配固定槽位（水道上为 spine，桥横跨其上方，其余居下） */
const CANVAS = { w: 760, h: 470, spineY: 250, aboveY: 138, belowY: 392, asideY: 412 };

function layoutFor(slice: SliceShape): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const feats = slice.features.map((f) => ({ key: shortKey(f.feature_key), type: f.feature_type }));

  const spine = feats.filter((f) => f.type === "waterway");
  spine.forEach((f, i) => {
    out[f.key] = { x: CANVAS.w / 2 + (i - (spine.length - 1) / 2) * 0, y: CANVAS.spineY };
  });

  const bridges = feats.filter((f) => f.type === "bridge");
  bridges.forEach((f, i) => {
    out[f.key] = {
      x: CANVAS.w / 2 + (i - (bridges.length - 1) / 2) * 288,
      y: CANVAS.aboveY,
    };
  });

  const sites = feats.filter((f) => !out[f.key] && /site|temple|building|place/.test(f.type));
  sites.forEach((f, i) => {
    out[f.key] = { x: CANVAS.w / 2 + (i - (sites.length - 1) / 2) * 288, y: CANVAS.belowY };
  });

  // 其余（人物/其他引用）排到右下，避免与主体重叠
  const rest = feats.filter((f) => !out[f.key]);
  rest.forEach((f, i) => {
    out[f.key] = { x: CANVAS.w - 180 - i * 96, y: CANVAS.asideY };
  });

  return out;
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
// CurrentMapSurface：可靠当前精确坐标 → 精确点表达（§5A.2-1）
// ---------------------------------------------------------------------------
export function CurrentMapSurface({ ctx, compact }: SurfaceComponentProps) {
  const points = ctx.slice.current_sources
    .filter((a) => a.kind === "provider_current_object_point")
    .map((a) => {
      const [lng, lat] = a.location_raw.split(",").map(Number);
      return { key: a.anchor_key, lng, lat, label: labelForAnchor(ctx.slice, a.anchor_key) };
    });
  const bbox = ctx.slice.spatial_extent_current.gcj02_bbox;
  const span = ctx.slice.spatial_extent_current.gcj02_span_m;
  const W = CANVAS.w;
  const H = CANVAS.h;
  const pad = 96;
  const project = (p: { lng: number; lat: number }) => ({
    x: pad + ((p.lng - bbox.min_lng) / (bbox.max_lng - bbox.min_lng || 1)) * (W - pad * 2),
    y: pad + ((bbox.max_lat - p.lat) / (bbox.max_lat - bbox.min_lat || 1)) * (H - pad * 2),
  });

  return (
    <div className="surf surf-map" data-testid="surface-current-map">
      <p className="surf__caption">
        当前精确空间 · 坐标系 {points.length ? "GCJ-02" : "—"}（原值，零换算）· 只代表<b>今天</b>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="surf-map__svg" role="img" aria-label="当前精确坐标图">
        <g className="coord-grid">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={`v${t}`} x1={pad + t * (W - pad * 2)} y1={pad - 26} x2={pad + t * (W - pad * 2)} y2={H - pad + 26} />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={`h${t}`} x1={pad - 26} y1={pad + t * (H - pad * 2)} x2={W - pad + 26} y2={pad + t * (H - pad * 2)} />
          ))}
          <text x={pad - 6} y={H - pad + 44} className="coord-tick">
            {bbox.min_lng.toFixed(4)}°E
          </text>
          <text x={W - pad} y={H - pad + 44} className="coord-tick" textAnchor="end">
            {bbox.max_lng.toFixed(4)}°E
          </text>
          <text x={pad - 32} y={pad + 2} className="coord-tick">
            {bbox.max_lat.toFixed(4)}°N
          </text>
        </g>
        {points.map((p) => {
          const { x, y } = project(p);
          const focused = ctx.focusPlace === p.label;
          return (
            <g key={p.key} className={`map-point ${focused ? "map-point--focus" : ""}`} data-place={p.label} data-testid={`current-point-${p.key.split("/")[0]}`}>
              <circle cx={x} cy={y} r={11} className="map-point__dot" />
              <circle cx={x} cy={y} r={19} className="map-point__halo" />
              <text x={x + 26} y={y + 4} className="map-point__label">
                {p.label}
              </text>
              <text x={x + 26} y={y + 21} className="map-point__coord">
                {p.lng.toFixed(6)}, {p.lat.toFixed(6)}
              </text>
            </g>
          );
        })}
        <text x={W - pad} y={pad - 34} textAnchor="end" className="coord-scale">
          {span.ns_m} m × {span.ew_m} m（按 GCJ-02 原值估读）
        </text>
      </svg>
      {!compact && <p className="surf__note">这是「现在」。往回走的时候，这些坐标会失去作证的资格。</p>}
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
// RelationalSpaceSurface 2.0：水道为 spine、桥表达"跨越"、candidate/unknown 明显不同（§10）
// ---------------------------------------------------------------------------
export function RelationalSpaceSurface({ ctx, compact }: SurfaceComponentProps) {
  const LAYOUT = layoutFor(ctx.slice);
  const nodes = ctx.slice.features.map((f) => ({
    key: shortKey(f.feature_key),
    label: f.canonical_label,
    type: f.feature_type,
    pos: LAYOUT[shortKey(f.feature_key)] ?? { x: 380, y: 300 },
  }));
  const edges = ctx.slice.relations.map((r) => ({
    key: r.relation_key,
    from: shortKey(r.subject_feature_key),
    to: shortKey(r.object_feature_key),
    predicate: predicateLabel(r.predicate),
    cls: r.epistemic_class,
  }));
  // 可选对象组未「放进来」时不渲染（由 Beat 行动驱动，组件不含具体对象语义）
  const isOptional = (n: { type: string; key: string }) =>
    /site|temple/.test(n.type) || /person|reference/.test(n.type) || /site|temple|person|reference/.test(n.key);
  const visibleNodes = ctx.optionalGroupIncluded ? nodes : nodes.filter((n) => !isOptional(n));
  const visibleEdges = edges
    .filter((e) => visibleNodes.some((n) => n.key === e.from) && visibleNodes.some((n) => n.key === e.to))
    // 对称关系在数据里可能以两个方向各存一条（同一主张的镜像表述）：
    // 画面上只保留一条，否则会出现两条几乎重合的线。
    // 这只是展示层去重，切片里的关系条数不变。
    .filter((e, _i, arr) => {
      const pair = [e.from, e.to].sort().join("|");
      const twin = arr.find(
        (x) => x.key !== e.key && [x.from, x.to].sort().join("|") === pair && x.predicate === e.predicate
      );
      return !twin || e.from <= twin.from;
    });
  const spine = visibleNodes.find((n) => n.type === "waterway");
  // 让标签避开水道带（spine）：落在带内时推到带外，避免文字互相压叠
  const bandTop = spine ? spine.pos.y - 31 : 0;
  const bandBottom = spine ? spine.pos.y + 31 : 0;
  const avoidBand = (y: number, edgeY: number) =>
    spine && y > bandTop && y < bandBottom ? (edgeY < spine.pos.y ? bandTop - 12 : bandBottom + 22) : y;
  // 「没有一条线」：被询问「这两者有关系吗」时，
  // 只对「关联型断言」（association/relation/link）且非 E1 的连接标注缺证据——
  // 其余弱线索仍以虚线保留，不冒充"缺失"。
  const absentEdges = ctx.askedMissingRelation
    ? ctx.slice.relations
        .filter((r) => /association|relation|link|connect/i.test(r.predicate) && r.epistemic_class !== "E1")
        .map((r) => ({ from: shortKey(r.subject_feature_key), to: shortKey(r.object_feature_key) }))
        .filter((e) => visibleNodes.some((n) => n.key === e.from) && visibleNodes.some((n) => n.key === e.to))
    : [];

  return (
    <div className="surf surf-relational" data-testid="surface-relational-space">
      <p className="surf__caption">
        关系历史空间 · <b>无经纬度</b> · 不表达距离与走向 —— 水道是 spine，桥表达「跨越」
      </p>
      <svg viewBox="0 0 760 470" className="surf-relational__svg" role="img" aria-label="关系空间拓扑">
        {spine && (
          <>
            <rect x={96} y={spine.pos.y - 31} width={568} height={62} rx={12} className="waterband" />
            <text x={112} y={spine.pos.y + 6} textAnchor="start" className="waterband__label">
              {spine.label} · 关系空间的 spine
            </text>
          </>
        )}

        {visibleEdges.map((e) => {
          const a = LAYOUT[e.from];
          const b = LAYOUT[e.to];
          if (!a || !b) return null;
          const dashed = e.cls !== "E1";
          // 同一对节点之间的多条关系不得重叠：沿法线方向分配平行偏移
          const pair = [e.from, e.to].sort().join("|");
          const siblings = visibleEdges.filter((x) => [x.from, x.to].sort().join("|") === pair);
          const idx = siblings.findIndex((x) => x.key === e.key);
          const o = siblings.length > 1 ? (idx - (siblings.length - 1) / 2) * 34 : 0;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * o;
          const ny = (dx / len) * o;
          const mx = (a.x + b.x) / 2 + nx;
          const my = (a.y + b.y) / 2 + ny;
          return (
            <g key={e.key} className={`rel rel--${e.cls}`} data-testid={`rel-${e.from}-${e.to}`}>
              <line
                x1={a.x + nx}
                y1={a.y + ny}
                x2={b.x + nx}
                y2={b.y + ny}
                className={dashed ? "rel__line rel__line--dashed" : "rel__line"}
              />
              <text
                x={mx}
                y={avoidBand(my - 9, my)}
                textAnchor="middle"
                className={dashed ? "rel__label rel__label--dashed" : "rel__label"}
              >
                {e.predicate}〔{e.cls}〕
              </text>
            </g>
          );
        })}

        {/* 缺失关系以「没有一条线」表达——缺失本身是内容，不是遗漏 */}
        {absentEdges.map((e) => {
          const a = LAYOUT[e.from];
          const b = LAYOUT[e.to];
          if (!a || !b) return null;
          // 与候选虚线平行错开，避免与 E2/E3 线索线压在一起
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * 30;
          const ny = (dx / len) * 30;
          return (
            <g key={`absent-${e.from}-${e.to}`} className="rel rel--absent" data-testid="absent-relation">
              <line
                x1={a.x + nx}
                y1={a.y + ny}
                x2={b.x + nx}
                y2={b.y + ny}
                className="rel__line rel__line--absent"
              />
              <text
                x={(a.x + b.x) / 2}
                y={avoidBand(Math.max(a.y, b.y) - 46, (a.y + b.y) / 2)}
                textAnchor="middle"
                className="rel__label--absent"
              >
                还没有一条线 · 这不是遗漏，是证据状态
              </text>
            </g>
          );
        })}

        {visibleNodes.map((n) => (
          <g
            key={n.key}
            transform={`translate(${n.pos.x},${n.pos.y})`}
            className={`node node--${n.type} ${ctx.focusPlace === n.label ? "node--focus" : ""}`}
            data-place={n.label}
          >
            <circle r={n.type === "waterway" ? 32 : 27} className="node__circle" />
            <text y={5} textAnchor="middle" className="node__label">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      {!compact && (
        <p className="surf__note">
          实线＝有据关系（E1）；虚线＝仅有线索的候选（E2/E3）。被问到的连接若没有实线——那正是还没有证据的地方。
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
