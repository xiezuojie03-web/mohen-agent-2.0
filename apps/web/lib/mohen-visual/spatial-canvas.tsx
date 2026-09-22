// apps/web/lib/mohen-visual/spatial-canvas.tsx
//
// TASK-0015 §6 — 最小可复用 SpatialCanvas。
//
// 职责：给任意人文空间 Surface 提供「稳定的视图空间 + 语义层 + 聚焦/退让 + 转场 + 标签避让」。
//
// 硬规则（§6 / §13）：
//   1) **通用 Canvas 内不得出现任何镇级 / 对象级节点坐标**：所有位置都由调用方
//      （adapter / Surface）以语义方式传入；本文件不认识任何地名、对象名、年代。
//   2) 不得通过场景标识决定视觉真相：本文件不接受任何场景标识输入。
//   3) 确定性渲染：无 Math.random、无 Date.now、无外部状态；同一输入恒得同一输出。
//   4) 不确定性渲染一等公民：relation_missing 画成「中断的线 + 负空间」，
//      unknown 画成斜纹占位，绝不冒充实线。

"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  DEPTH,
  SPATIAL,
  rhythmClass,
  svgStyle,
  withDepth,
  type DepthState,
  type NodeRole,
  type RelationRole,
  type VisualToken,
} from "./visual-grammar";

// ---------------------------------------------------------------------------
// 视图空间 / 语义层
// ---------------------------------------------------------------------------

export interface CanvasView {
  width: number;
  height: number;
  pad: number;
}

/** 语义层名：决定绘制顺序与 aria 分组，不决定视觉真相 */
export type CanvasLayerSemantic =
  | "frame" // 地理骨架（经纬网 / 比例尺 / 指北 / 范围框）
  | "water" // 水系骨架（semantic spine）
  | "relations" // 关系线（含中断的缺失关系）
  | "nodes" // 节点标记
  | "annotations" // 近似区域 / 参考锚 / 斜纹占位
  | "labels"; // 文字（永远最后画，且永远可避让）

/** 层序（稳定、确定性） */
export const LAYER_ORDER: CanvasLayerSemantic[] = ["frame", "water", "relations", "nodes", "annotations", "labels"];

// ---------------------------------------------------------------------------
// 空间原语
// ---------------------------------------------------------------------------

/** 所有原语共有的可选字段（语义类由调用方给，Canvas 不理解其含义） */
export interface PrimitiveBase {
  key: string;
  depth?: DepthState;
  className?: string;
  /** 显式测试锚点（默认 `vg-<kind>-<key>`） */
  testId?: string;
}

export type CanvasPrimitive =
  /** 水系骨架（semantic spine，不是几何） */
  | (PrimitiveBase & { kind: "spine"; x1: number; x2: number; y: number; height: number; label?: string })
  /** 节点标记（crossing 骑在骨架上 / cultural_node 可进入 / node 一般） */
  | (PrimitiveBase & { kind: "node"; x: number; y: number; role: NodeRole; label: string; sub?: string; r?: number })
  /** 关系线；interrupted=true → 中断（负空间），不得连成一条 */
  | (PrimitiveBase & {
      kind: "relation";
      from: [number, number];
      to: [number, number];
      role: RelationRole;
      label?: string;
      interrupted?: boolean;
      curve?: number;
    })
  /** 近似区域：无中心精确 marker */
  | (PrimitiveBase & { kind: "approximate"; x: number; y: number; rx: number; ry: number; label?: string; sub?: string })
  /** 点状标记：exact=精确点 / reference=参考锚（不并入本图坐标系） */
  | (PrimitiveBase & { kind: "marker"; x: number; y: number; glyph: "exact" | "reference" | "event"; label?: string; sub?: string })
  /** 范围框（extent）：四角注记由调用方给出 */
  | (PrimitiveBase & { kind: "extent"; x: number; y: number; w: number; h: number; corners?: string[] })
  /** 斜纹占位（unknown / 不主张的区域） */
  | (PrimitiveBase & { kind: "hatch"; x: number; y: number; w: number; h: number; label?: string })
  /** 地理骨架：经纬网 + 刻度（框与刻度文字都由调用方给出，本文件不认识坐标值） */
  | (PrimitiveBase & { kind: "graticule"; x0: number; y0: number; w: number; h: number; cols: number; rows: number; ticks?: string[] })
  /** 比例尺（长度与文字由调用方给出） */
  | (PrimitiveBase & { kind: "scalebar"; x: number; y: number; lengthPx: number; label: string })
  /** 指北针 */
  | (PrimitiveBase & { kind: "northarrow"; x: number; y: number; size?: number });

export interface CanvasLayer {
  id: string;
  semantic: CanvasLayerSemantic;
  primitives: CanvasPrimitive[];
}

// ---------------------------------------------------------------------------
// 标签避让（basic label collision，确定性贪心）
// ---------------------------------------------------------------------------

// 标签避让（basic label collision，确定性贪心）的单一真源在 ./label-layout
// （纯 TS，可被测试直接消费，不依赖 JSX）。本文件只做转发导出，避免两处维护。
import type { LabelRequest } from "./label-layout";
import { placeLabels } from "./label-layout";
export type { LabelRequest, PlacedLabel } from "./label-layout";
export {
  placeLabels,
  estimateTextWidth,
  overlaps,
  labelBox,
  PREFERRED_ORDER,
} from "./label-layout";

// ---------------------------------------------------------------------------
// 原语组件（可被 SpatialCanvas 之外的 Surface 单独复用）
// ---------------------------------------------------------------------------

const r2 = (n: number) => Math.round(n * 100) / 100;

export function SpineBand({ x1, x2, y, height, token, className }: { x1: number; x2: number; y: number; height: number; token: VisualToken; className?: string }) {
  const s = svgStyle(token);
  return (
    <g className={`vg-spine ${className ?? ""}`} aria-hidden>
      <rect x={x1} y={y - height / 2} width={x2 - x1} height={height} rx={height / 2.6} style={s} />
      {/* 流动节奏：骨架内部的等距流线（确定性，不表达流向史实） */}
      {Array.from({ length: Math.max(3, Math.floor((x2 - x1) / 96)) }, (_, i) => {
        const x = x1 + 28 + i * 96;
        if (x > x2 - 20) return null;
        return (
          <line
            key={i}
            x1={x}
            y1={y - height * 0.22}
            x2={x + 34}
            y2={y - height * 0.22}
            className="vg-spine__flow"
            style={{ stroke: token.stroke, strokeWidth: 1, opacity: 0.35 }}
          />
        );
      })}
      <line x1={x1} y1={y + height * 0.28} x2={x2} y2={y + height * 0.28} className="vg-spine__edge" style={{ stroke: token.stroke, strokeWidth: 1, opacity: 0.28 }} />
    </g>
  );
}

export function NodeMark({
  cx,
  cy,
  r,
  role,
  token,
  className,
  onSelect,
  testId,
}: {
  cx: number;
  cy: number;
  r: number;
  role: NodeRole;
  token: VisualToken;
  className?: string;
  onSelect?: () => void;
  testId?: string;
}) {
  const s = svgStyle(token);
  const interactive = !!onSelect;
  // 透明命中区：让整个节点包围盒都可点击（开放描边的 cultural_node / aside 在中心点击会落空，
  // 导致 onClick 不触发；透明 rect 覆盖 bbox，pointer-events:all 确保接收事件）。
  const hit =
    role === "crossing" ? { w: r * 3.2, h: r * 2.8 }
    : role === "cultural_node" ? { w: r * 2.4, h: r * 2.8 }
    : { w: r * 2.2, h: r * 2.2 };
  const common = {
    className: `vg-node vg-node--${role} ${className ?? ""}`,
    style: s,
    ...(interactive
      ? { role: "button" as const, tabIndex: 0, onClick: onSelect, onKeyDown: (e: ReactKeyboardEvent) => { if (e.key === "Enter" || e.key === " ") onSelect?.(); } }
      : {}),
    ...(testId ? { "data-testid": testId } : {}),
  };
  if (role === "crossing") {
    // 跨越节点：一枚横跨骨架的「桥面」——形状本身就说明「跨越」
    return (
      <g {...common}>
        <rect x={cx - hit.w / 2} y={cy - hit.h / 2} width={hit.w} height={hit.h} fill="transparent" style={{ pointerEvents: "all" }} />
        <rect x={cx - r * 1.5} y={cy - r * 0.62} width={r * 3} height={r * 1.24} rx={r * 0.3} />
        <line x1={cx - r * 1.5} y1={cy} x2={cx + r * 1.5} y2={cy} style={{ stroke: token.stroke, strokeWidth: 1, opacity: 0.5 }} />
        <circle cx={cx} cy={cy} r={r * 0.42} style={{ fill: token.stroke, opacity: 0.9 }} />
      </g>
    );
  }
  if (role === "cultural_node") {
    // 文化节点：带开口的围合（可「进入」）
    return (
      <g {...common}>
        <rect x={cx - hit.w / 2} y={cy - hit.h / 2} width={hit.w} height={hit.h} fill="transparent" style={{ pointerEvents: "all" }} />
        <path d={`M ${cx - r} ${cy + r * 0.7} L ${cx - r} ${cy - r * 0.35} Q ${cx} ${cy - r * 1.25} ${cx + r} ${cy - r * 0.35} L ${cx + r} ${cy + r * 0.7}`} />
        <line x1={cx - r * 0.34} y1={cy + r * 0.7} x2={cx - r * 0.34} y2={cy - r * 0.1} style={{ stroke: token.stroke, strokeWidth: token.strokeWidth * 0.7, opacity: 0.65 }} />
        <line x1={cx + r * 0.34} y1={cy + r * 0.7} x2={cx + r * 0.34} y2={cy - r * 0.1} style={{ stroke: token.stroke, strokeWidth: token.strokeWidth * 0.7, opacity: 0.65 }} />
      </g>
    );
  }
  if (role === "approximate_area") {
    return (
      <g {...common}>
        <rect x={cx - hit.w / 2} y={cy - hit.h / 2} width={hit.w} height={hit.h} fill="transparent" style={{ pointerEvents: "all" }} />
        <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.78} style={{ ...s, strokeDasharray: token.strokeDash || undefined }} />
      </g>
    );
  }
  return (
    <g {...common}>
      <rect x={cx - hit.w / 2} y={cy - hit.h / 2} width={hit.w} height={hit.h} fill="transparent" style={{ pointerEvents: "all" }} />
      <circle cx={cx} cy={cy} r={r} />
    </g>
  );
}

export function RelationLine({
  from,
  to,
  token,
  interrupted,
  curve = 0,
  className,
  testId,
}: {
  from: [number, number];
  to: [number, number];
  token: VisualToken;
  interrupted?: boolean;
  curve?: number;
  className?: string;
  testId?: string;
}) {
  const s = svgStyle(token);
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + curve;
  if (interrupted) {
    // 中断的线：两端各留一截，中间是负空间（缺失本身被画出来，但不生成关系）
    const GAP = 0.3; // 中间 30% 留空
    const p1: [number, number] = [x1 + (x2 - x1) * (0.5 - GAP / 2), y1 + (y2 - y1) * (0.5 - GAP / 2)];
    const p2: [number, number] = [x1 + (x2 - x1) * (0.5 + GAP / 2), y1 + (y2 - y1) * (0.5 + GAP / 2)];
    return (
      <g className={`vg-rel vg-rel--missing ${className ?? ""}`} style={{ opacity: token.opacity }} data-testid={testId}>
        <line x1={x1} y1={y1} x2={p1[0]} y2={p1[1]} style={s} />
        <line x1={p2[0]} y1={p2[1]} x2={x2} y2={y2} style={s} />
        <line x1={p1[0]} y1={p1[1] - 6} x2={p1[0]} y2={p1[1] + 6} style={{ ...s, strokeWidth: token.strokeWidth * 1.2 }} />
        <line x1={p2[0]} y1={p2[1] - 6} x2={p2[0]} y2={p2[1] + 6} style={{ ...s, strokeWidth: token.strokeWidth * 1.2 }} />
      </g>
    );
  }
  return (
    <path
      className={`vg-rel ${className ?? ""}`}
      d={`M ${r2(x1)} ${r2(y1)} Q ${r2(mx)} ${r2(my)} ${r2(x2)} ${r2(y2)}`}
      style={{ ...s, fill: "none" }}
      data-testid={testId}
    />
  );
}

export function ApproximateBlob({
  cx,
  cy,
  rx,
  ry,
  token,
  className,
  testId,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  token: VisualToken;
  className?: string;
  testId?: string;
}) {
  const s = svgStyle(token);
  return (
    <g className={`vg-approx ${className ?? ""}`} data-testid={testId}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} style={{ ...s, strokeDasharray: "6 6" }} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.72} ry={ry * 0.7} style={{ ...s, fillOpacity: s.fillOpacity * 0.7, strokeDasharray: "3 7" }} />
    </g>
  );
}

export function Graticule({
  x0,
  y0,
  w,
  h,
  cols,
  rows,
  ticks,
  token,
}: {
  x0: number;
  y0: number;
  w: number;
  h: number;
  cols: number;
  rows: number;
  ticks?: string[];
  token: VisualToken;
}) {
  return (
    <g className="vg-graticule" style={{ opacity: token.opacity }} aria-hidden>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={x0 + (i / cols) * w}
          y1={y0 - 16}
          x2={x0 + (i / cols) * w}
          y2={y0 + h + 16}
          style={{ stroke: token.stroke, strokeWidth: 1, strokeDasharray: "3 5" }}
        />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={x0 - 16}
          y1={y0 + (i / rows) * h}
          x2={x0 + w + 16}
          y2={y0 + (i / rows) * h}
          style={{ stroke: token.stroke, strokeWidth: 1, strokeDasharray: "3 5" }}
        />
      ))}
      {(ticks ?? []).map((t, i) => (
        <text
          key={`t${i}`}
          x={x0 - 8}
          y={y0 + (i / Math.max(1, (ticks ?? []).length - 1)) * h + 4}
          className="vg-tick"
          textAnchor="end"
        >
          {t}
        </text>
      ))}
    </g>
  );
}

export function ScaleBar({ x, y, lengthPx, label, token }: { x: number; y: number; lengthPx: number; label: string; token: VisualToken }) {
  return (
    <g className="vg-scalebar" style={{ opacity: token.opacity }}>
      <line x1={x} y1={y} x2={x + lengthPx} y2={y} style={{ stroke: token.stroke, strokeWidth: 2.4 }} />
      <line x1={x} y1={y - 5} x2={x} y2={y + 5} style={{ stroke: token.stroke, strokeWidth: 2.4 }} />
      <line x1={x + lengthPx} y1={y - 5} x2={x + lengthPx} y2={y + 5} style={{ stroke: token.stroke, strokeWidth: 2.4 }} />
      <text x={x + lengthPx / 2} y={y + 17} textAnchor="middle" className="vg-tick">
        {label}
      </text>
    </g>
  );
}

export function NorthArrow({ x, y, size = 18, token }: { x: number; y: number; size?: number; token: VisualToken }) {
  return (
    <g className="vg-north" style={{ opacity: token.opacity }} aria-label="指北">
      <path d={`M ${x} ${y - size} L ${x + size * 0.5} ${y + size * 0.5} L ${x} ${y + size * 0.15} L ${x - size * 0.5} ${y + size * 0.5} Z`} style={{ fill: token.stroke, opacity: 0.85 }} />
      <text x={x} y={y + size + 12} textAnchor="middle" className="vg-tick">
        N
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// SpatialCanvas：组合以上原语
// ---------------------------------------------------------------------------

export interface SpatialCanvasProps {
  view: CanvasView;
  /** 语义层（按 LAYER_ORDER 稳定排序后绘制） */
  layers: CanvasLayer[];
  /** 无障碍标题 */
  title: string;
  /** 聚焦键：其余元素自动退为 context（focus 转移不改语义） */
  focusKey?: string | null;
  /** 节点点击（聚焦转移） */
  onSelect?: (key: string) => void;
  /** 额外类名（转场 / 配方由调用方给，Canvas 不理解其含义） */
  className?: string;
  testId?: string;
  /** 额外文字标签（也参与避让） */
  labels?: LabelRequest[];
  style?: CSSProperties;
}

export function SpatialCanvas({ view, layers, title, focusKey, onSelect, className, testId, labels, style }: SpatialCanvasProps) {
  const { width: W, height: H } = view;
  const ordered = [...layers].sort(
    (a, b) => LAYER_ORDER.indexOf(a.semantic) - LAYER_ORDER.indexOf(b.semantic) || (a.id < b.id ? -1 : 1)
  );

  // 收集标签（节点/标记/关系的文字）→ 统一避让
  const labelReqs: LabelRequest[] = [...(labels ?? [])];
  for (const layer of ordered) {
    for (const p of layer.primitives) {
      if (p.kind === "node") {
        labelReqs.push({ key: `n:${p.key}`, text: p.label, x: p.x, y: p.y + (p.role === "crossing" ? p.r ?? 26 : (p.r ?? 24) + 10), prefer: "below", size: p.role === "crossing" ? 14 : 13, weight: 600, className: `vg-label vg-label--${p.role}` });
        if (p.sub) labelReqs.push({ key: `nsub:${p.key}`, text: p.sub, x: p.x, y: p.y + (p.r ?? 24) + 26, prefer: "below", size: 10, className: "vg-label vg-label--sub" });
      } else if (p.kind === "marker") {
        if (p.label) labelReqs.push({ key: `m:${p.key}`, text: p.label, x: p.x + 16, y: p.y - 2, prefer: "right", size: 14, weight: 600, className: "vg-label vg-label--marker" });
        if (p.sub) labelReqs.push({ key: `msub:${p.key}`, text: p.sub, x: p.x + 16, y: p.y + 15, prefer: "right", size: 10, className: "vg-label vg-label--sub" });
      } else if (p.kind === "approximate") {
        if (p.label) labelReqs.push({ key: `a:${p.key}`, text: p.label, x: p.x, y: p.y, prefer: "below", size: 14, weight: 600, className: "vg-label vg-label--approx" });
        if (p.sub) labelReqs.push({ key: `asub:${p.key}`, text: p.sub, x: p.x, y: p.y + 18, prefer: "below", size: 10, className: "vg-label vg-label--sub" });
      } else if (p.kind === "spine" && p.label) {
        labelReqs.push({ key: `s:${p.key}`, text: p.label, x: p.x1 + 16, y: p.y - p.height / 2 - 8, prefer: "above", size: 12, className: "vg-label vg-label--spine" });
      } else if (p.kind === "relation" && p.label) {
        labelReqs.push({ key: `r:${p.key}`, text: p.label, x: (p.from[0] + p.to[0]) / 2, y: (p.from[1] + p.to[1]) / 2 + (p.curve ?? 0), prefer: "above", size: 11, className: "vg-label vg-label--rel" });
      } else if (p.kind === "hatch" && p.label) {
        labelReqs.push({ key: `h:${p.key}`, text: p.label, x: p.x + p.w / 2, y: p.y + p.h / 2, prefer: "above", size: 11, className: "vg-label vg-label--hatch" });
      } else if (p.kind === "extent" && p.corners) {
        p.corners.forEach((c, i) =>
          labelReqs.push({ key: `e:${p.key}:${i}`, text: c, x: i % 2 === 0 ? p.x + 4 : p.x + p.w - 4, y: i < 2 ? p.y - 6 : p.y + p.h + 14, prefer: i < 2 ? "above" : "below", size: 10, className: "vg-label vg-label--sub" })
        );
      }
    }
  }
  const placed = placeLabels(labelReqs);

  const depthOf = (key: string, explicit?: DepthState): DepthState => {
    if (explicit) return explicit;
    if (focusKey) return focusKey === key ? "primary" : "context";
    return "primary";
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`vg-canvas ${className ?? ""}`}
      role="img"
      aria-label={title}
      data-testid={testId}
      style={style}
    >
      <defs>
        <pattern id="vg-hatch-pattern" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: "var(--mist)", strokeWidth: 1.1, opacity: 0.5 }} />
        </pattern>
      </defs>

      {ordered.map((layer) => (
        <g key={layer.id} className={`vg-layer vg-layer--${layer.semantic}`} data-layer={layer.semantic}>
          {layer.primitives.map((p) => {
            const depth = depthOf(p.key, p.depth);
            const inherited: VisualToken["rhythm"] = p.depth ? DEPTH[p.depth].rhythm : "none";
            const cls = `${p.className ?? ""} ${rhythmClass(inherited)} vg-d-${depth}`;
            switch (p.kind) {
              case "spine": {
                const t = withDepth(SPATIAL.spine, depth);
                return <SpineBand key={p.key} x1={p.x1} x2={p.x2} y={p.y} height={p.height} token={t} className={cls} />;
              }
              case "node": {
                const t = withDepth(SPATIAL[p.role], depth);
                return (
                  <NodeMark
                    key={p.key}
                    cx={p.x}
                    cy={p.y}
                    r={p.r ?? (p.role === "crossing" ? 26 : p.role === "cultural_node" ? 30 : 24)}
                    role={p.role}
                    token={t}
                    className={cls}
                    onSelect={onSelect ? () => onSelect(p.key) : undefined}
                    testId={p.testId ?? `vg-node-${p.key}`}
                  />
                );
              }
              case "relation": {
                const t = withDepth(SPATIAL[p.role], depth);
                return (
                  <RelationLine
                    key={p.key}
                    from={p.from}
                    to={p.to}
                    token={t}
                    interrupted={p.interrupted ?? p.role === "relation_missing"}
                    curve={p.curve}
                    className={cls}
                    testId={p.testId ?? `vg-rel-${p.key}`}
                  />
                );
              }
              case "approximate": {
                const t = withDepth(SPATIAL.approximate_area, depth);
                return <ApproximateBlob key={p.key} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} token={t} className={cls} testId={p.testId ?? `vg-approx-${p.key}`} />;
              }
              case "marker": {
                const base = p.glyph === "exact" ? SPATIAL.node : SPATIAL.approximate_area;
                const t = withDepth(base, depth);
                const s = svgStyle(t);
                if (p.glyph === "reference") {
                  return (
                    <g key={p.key} className={`vg-marker vg-marker--reference ${cls}`} data-testid={p.testId ?? `vg-marker-${p.key}`}>
                      <line x1={p.x - 9} y1={p.y - 9} x2={p.x + 9} y2={p.y + 9} style={s} />
                      <line x1={p.x + 9} y1={p.y - 9} x2={p.x - 9} y2={p.y + 9} style={s} />
                      <circle cx={p.x} cy={p.y} r={3} style={{ fill: s.stroke, opacity: 0.5 }} />
                    </g>
                  );
                }
                return (
                  <g key={p.key} className={`vg-marker vg-marker--${p.glyph} ${cls}`} data-testid={p.testId ?? `vg-marker-${p.key}`}>
                    <circle cx={p.x} cy={p.y} r={8.5} style={s} />
                    <circle cx={p.x} cy={p.y} r={15} style={{ ...s, fill: "none", fillOpacity: 0, opacity: t.opacity * 0.35 }} />
                    {p.glyph === "exact" && <circle cx={p.x} cy={p.y} r={3} style={{ fill: s.stroke }} />}
                  </g>
                );
              }
              case "extent": {
                const t = withDepth(SPATIAL.node, depth);
                return (
                  <rect
                    key={p.key}
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    className={`vg-extent ${cls}`}
                    style={{ ...svgStyle(t), fill: "none", strokeDasharray: "2 6", strokeWidth: 1.2, opacity: t.opacity * 0.7 }}
                  />
                );
              }
              case "hatch": {
                const t = withDepth(SPATIAL.approximate_area, depth);
                return (
                  <rect
                    key={p.key}
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    className={`vg-hatch ${cls}`}
                    style={{ fill: "url(#vg-hatch-pattern)", stroke: t.stroke, strokeWidth: 1, strokeDasharray: "2 7", opacity: t.opacity }}
                  />
                );
              }
              case "graticule": {
                const t = withDepth({ ...SPATIAL.node, stroke: "var(--line)", fill: "none", fillOpacity: 0 }, depth);
                return (
                  <Graticule
                    key={p.key}
                    x0={p.x0}
                    y0={p.y0}
                    w={p.w}
                    h={p.h}
                    cols={p.cols}
                    rows={p.rows}
                    ticks={p.ticks}
                    token={t}
                  />
                );
              }
              case "scalebar": {
                const t = withDepth(SPATIAL.node, depth);
                return <ScaleBar key={p.key} x={p.x} y={p.y} lengthPx={p.lengthPx} label={p.label} token={t} />;
              }
              case "northarrow": {
                const t = withDepth(SPATIAL.node, depth);
                return <NorthArrow key={p.key} x={p.x} y={p.y} size={p.size} token={t} />;
              }
              default:
                return null;
            }
          })}
        </g>
      ))}

      {/* 文字永远最后画：标签是注解，不是主视觉（§8） */}
      <g className="vg-labels">
        {placed.map((l) => {
          const focused = focusKey ? l.key.endsWith(`:${focusKey}`) || l.key.includes(`:${focusKey}:`) : false;
          return (
            <text
              key={l.key}
              x={r2(l.tx)}
              y={r2(l.ty)}
              textAnchor={l.anchor}
              className={`${l.className ?? "vg-label"} ${focused ? "vg-label--focus" : ""} ${l.relocated ? "vg-label--relocated" : ""}`}
              style={{ fontSize: l.size ?? 13, fontWeight: l.weight ?? 400 }}
            >
              {l.text}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 图例：文字标签必须存在（§5 可访问性），但它是注解而不是主视觉
// ---------------------------------------------------------------------------

export interface LegendItem {
  token: VisualToken;
  text?: string;
  shape?: "line" | "dot" | "band";
}

export function VisualLegend({ items, className, testId }: { items: LegendItem[]; className?: string; testId?: string }) {
  return (
    <ul className={`vg-legend ${className ?? ""}`} data-testid={testId ?? "visual-legend"}>
      {items.map((it, i) => (
        <li key={`${it.text ?? it.token.label}-${i}`} className="vg-legend__item">
          <svg width={it.shape === "band" ? 34 : 26} height="12" aria-hidden>
            {it.shape === "dot" ? (
              <circle cx="13" cy="6" r="5" style={svgStyle(it.token)} />
            ) : it.shape === "band" ? (
              <rect x="2" y="2" width="30" height="8" rx="4" style={svgStyle(it.token)} />
            ) : (
              <line x1="2" y1="6" x2="24" y2="6" style={{ ...svgStyle(it.token), fill: "none" }} />
            )}
          </svg>
          <span>{it.text ?? it.token.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** 供 result 报告量化：SpatialCanvas 支持的层 / 原语数量 */
export const SPATIAL_CANVAS_LAYER_COUNT = LAYER_ORDER.length;
export const SPATIAL_CANVAS_PRIMITIVE_KINDS = [
  "spine",
  "node",
  "relation",
  "approximate",
  "marker",
  "extent",
  "hatch",
  "graticule",
  "scalebar",
  "northarrow",
] as const;
