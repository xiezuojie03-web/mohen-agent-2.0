// apps/web/lib/mohen-visual/label-layout.ts
//
// TASK-0015 §6 — SpatialCanvas 的标签避让（basic label collision）。
//
// 独立成纯 TS：不含 JSX、不含 React、可被测试直接消费。
// 硬规则：确定性 —— 同输入恒得同输出；不丢弃标签（标签必须可读）。

export interface LabelRequest {
  key: string;
  text: string;
  /** 锚点 */
  x: number;
  y: number;
  /** 偏好方位；冲突时按固定顺序退让 */
  prefer?: "above" | "below" | "left" | "right";
  size?: number;
  weight?: number;
  className?: string;
}

export interface PlacedLabel extends LabelRequest {
  /** 最终文字锚点 */
  tx: number;
  ty: number;
  anchor: "middle" | "start" | "end";
  relocated: boolean;
}

const CJK = /[　-鿿＀-￯]/;

export function estimateTextWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += CJK.test(ch) ? size : size * 0.56;
  return w;
}

/** 候选方位（确定性顺序） */
export const PREFERRED_ORDER = ["above", "below", "right", "left"] as const;

export function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

/** 单个标签的包围盒（按 anchor 计算） */
export function labelBox(l: { tx: number; ty: number; anchor: PlacedLabel["anchor"]; text: string; size?: number }) {
  const size = l.size ?? 13;
  const w = estimateTextWidth(l.text, size);
  const h = size * 1.25;
  if (l.anchor === "middle") return { x: l.tx - w / 2, y: l.ty - size, w, h };
  if (l.anchor === "start") return { x: l.tx, y: l.ty - size, w, h };
  return { x: l.tx - w, y: l.ty - size, w, h };
}

/**
 * 确定性标签避让：按 (y, x, key) 稳定排序后贪心放置；
 * 冲突时按 prefer → 其余方位顺序退让，再不行沿 y 轴按固定步长错开。
 */
export function placeLabels(requests: LabelRequest[]): PlacedLabel[] {
  const sorted = [...requests].sort((a, b) => a.y - b.y || a.x - b.x || (a.key < b.key ? -1 : 1));
  const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
  const out: PlacedLabel[] = [];

  for (const req of sorted) {
    const size = req.size ?? 13;
    const h = size * 1.25;
    const prefer = req.prefer ?? "above";
    const order = [prefer, ...PREFERRED_ORDER.filter((p) => p !== prefer)];
    let placed: PlacedLabel | null = null;

    for (const dir of order) {
      for (const nudge of [0, h * 0.9, -h * 0.9, h * 1.8, -h * 1.8]) {
        let tx = req.x;
        let ty = req.y;
        let anchor: PlacedLabel["anchor"] = "middle";
        if (dir === "above") {
          ty = req.y - 12 + nudge;
        } else if (dir === "below") {
          ty = req.y + size + 6 + nudge;
        } else if (dir === "right") {
          tx = req.x + 14;
          ty = req.y + size * 0.35 + nudge;
          anchor = "start";
        } else {
          tx = req.x - 14;
          ty = req.y + size * 0.35 + nudge;
          anchor = "end";
        }
        const box = labelBox({ tx, ty, anchor, text: req.text, size });
        if (!occupied.some((o) => overlaps(box, o))) {
          occupied.push(box);
          placed = { ...req, tx, ty, anchor, relocated: dir !== prefer || nudge !== 0 };
          break;
        }
      }
      if (placed) break;
    }
    // 兜底：仍冲突时按默认方位放置 —— 标签不丢弃（可访问性优先于美观）
    out.push(placed ?? { ...req, tx: req.x, ty: req.y - 12, anchor: "middle", relocated: true });
  }
  return out;
}
