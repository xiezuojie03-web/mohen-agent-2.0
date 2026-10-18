"use client";

// surfaces/ProductionRelationCanvas.tsx
//
// T4：真实产出关系空间 —— 把 read_model 已发布世界投影（productionSummary.entities/relations）
// 渲染成关系空间，让数据生产链的真实产出成为舞台主角（解决「真实产出只到徽章」的双事实源）。
//
// 硬规则（与 SpatialSurfaces 一致）：组件不拥有 / 不硬编码任何镇级历史真相；
// 所有节点名、关系、布局都从 productionSummary 推导。
// 关系 = 实线（G5 已发布 = 有据）；实体 = 统一节点（真实数据不含 feature_type，不硬编码类型分类）。

import type { ProductionRelationSummary } from "../../../../lib/read-model-bridge";
import { parseRelation } from "../productionRelationLabels";
import {
  SpatialCanvas,
  VisualLegend,
  type CanvasLayer,
  type CanvasPrimitive,
  type CanvasView,
} from "../../../../lib/mohen-visual/spatial-canvas";
import { SPATIAL } from "../../../../lib/mohen-visual/visual-grammar";

const VIEW: CanvasView = { width: 760, height: 470, pad: 64 };

export default function ProductionRelationCanvas({ summary }: { summary: ProductionRelationSummary }) {
  const entities = summary.entities ?? [];
  const relations = summary.relations ?? [];

  const W = VIEW.width;
  const H = VIEW.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - VIEW.pad;

  // 环形布局：实体均匀分布（确定性，无随机）
  const pos: Record<string, { x: number; y: number }> = {};
  entities.forEach((e, i) => {
    const angle = -Math.PI / 2 + (i / Math.max(1, entities.length)) * Math.PI * 2;
    pos[e] = { x: Math.round(cx + R * Math.cos(angle)), y: Math.round(cy + R * Math.sin(angle)) };
  });

  const nodePrimitives: CanvasPrimitive[] = entities.map((e) => ({
    kind: "node",
    key: e,
    x: pos[e].x,
    y: pos[e].y,
    role: "node" as const,
    label: e,
    r: 24,
  }));

  const relationPrimitives = relations
    .map((triple): CanvasPrimitive | null => {
      const p = parseRelation(triple);
      if (!p) return null;
      const from = pos[p.subject];
      const to = pos[p.object];
      if (!from || !to) return null;
      return {
        kind: "relation" as const,
        key: triple,
        from: [from.x, from.y] as [number, number],
        to: [to.x, to.y] as [number, number],
        role: "relation_confirmed" as const,
        label: p.predicateHuman,
        curve: 0,
      };
    })
    .filter((x): x is CanvasPrimitive => x !== null);

  const layers: CanvasLayer[] = [
    { id: "relations", semantic: "relations", primitives: relationPrimitives },
    { id: "nodes", semantic: "nodes", primitives: nodePrimitives },
  ];

  return (
    <div className="surf surf-relational surf-relational--production" data-testid="surface-relational-space">
      <p className="surf__caption">
        真实产出 · 关系空间 · G5 已发布（{entities.length} 实体 · {relations.length} 关系）
      </p>
      <SpatialCanvas
        view={VIEW}
        layers={layers}
        title="真实产出关系空间：数据生产链 D00–D05 已发布的实体与关系"
        className="surf-relational__svg"
        testId="production-relational-canvas"
      />
      <VisualLegend
        className="vg-legend--rel"
        items={[
          { token: SPATIAL.node, text: "实体", shape: "dot" },
          { token: SPATIAL.relation_confirmed, text: "已发布关系（有据）", shape: "line" },
        ]}
      />
    </div>
  );
}
