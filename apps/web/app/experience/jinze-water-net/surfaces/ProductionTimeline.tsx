"use client";

// surfaces/ProductionTimeline.tsx
//
// V1.4 组合批：真实时间投影 Surface（s06 时间轴真实优先）。
// 数据来源：read_model.map_timeline_projections（P03，G5 · visual_stage）——
// 只画数据生产链有着录的年代；无载年代的对象不出现在轴上（不伪造、不补画）。
// 纪律：era 精度显示「约」，exact_year 显示确年；unknown 不渲染年份只渲染事件文本。

import type { ProductionTimeline } from "../../../../lib/read-model-bridge";

const CHANGE_TYPE_HUMAN: Record<string, string> = {
  built: "建",
  founded: "创建",
  constructed: "建",
  rebuilt: "重建",
  destroyed: "毁",
  listed_as_cultural_relic: "列为文保单位",
  protected: "列为文保单位",
  renamed: "改名",
  unknown: "变化",
};

function yearLabel(year: number | null, dynasty: string, precision: string): string {
  if (typeof year === "number") return precision === "era" ? `约${year}` : String(year);
  return dynasty || "年代不详";
}

export default function ProductionTimeline({ timeline }: { timeline: ProductionTimeline }) {
  const events = timeline.events;
  const years = events.map((e) => e.year).filter((y): y is number => typeof y === "number");
  const minY = years.length ? Math.min(...years) : 0;
  const maxY = years.length ? Math.max(...years) : 1;
  const span = maxY - minY || 1;
  const axisYears = [...new Set(years)].sort((a, b) => a - b);
  const xOf = (y: number) => 8 + ((y - minY) / span) * 84; // 百分比坐标

  // 按实体聚行（同一实体多事件排在一行）
  const byEntity = new Map<string, typeof events>();
  for (const e of events) {
    const list = byEntity.get(e.entity) ?? [];
    list.push(e);
    byEntity.set(e.entity, list);
  }

  return (
    <div className="surf surf-timeline surf-timeline--production" data-testid="surface-timeline">
      <p className="surf__caption">
        时间景观 · 真实产出 · <b>只画有着录的年代</b>
      </p>
      <div className="prod-timeline" data-testid="timeline-real">
        <div className="prod-timeline__axis">
          {axisYears.map((y) => (
            <span key={y} className="prod-timeline__tick" style={{ left: `${xOf(y)}%` }}>
              {y}
            </span>
          ))}
        </div>
        {[...byEntity.entries()].map(([entity, evs]) => (
          <div key={entity} className="prod-timeline__row">
            <span className="prod-timeline__label">{entity}</span>
            <div className="prod-timeline__track">
              {evs.map((e, i) => (
                <span
                  key={i}
                  className="prod-timeline__event"
                  style={typeof e.year === "number" ? { left: `${xOf(e.year)}%` } : undefined}
                  title={`${e.dynasty}${e.after_state ? ` · ${e.after_state}` : ""}`}
                >
                  <b>{yearLabel(e.year, e.dynasty, e.precision)}</b>
                  {CHANGE_TYPE_HUMAN[e.change_type] ?? e.change_type}
                  {e.after_state ? ` · ${e.after_state}` : ""}
                </span>
              ))}
            </div>
          </div>
        ))}
        <p className="surf__note">
          {events.some((e) => e.precision === "era") ? "「约」= 材料只记到年号/朝代，未记确年；" : ""}
          没有着录的年代不画——留白即诚实。
        </p>
      </div>
    </div>
  );
}
