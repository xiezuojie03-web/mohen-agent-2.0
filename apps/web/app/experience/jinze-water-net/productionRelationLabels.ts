// apps/web/app/experience/jinze-water-net/productionRelationLabels.ts
//
// 真实产出（read_model）关系三元组的人话化工具（D2 内容看板 / T4 关系空间共用）。
// 只做展示层映射：不产生事实、不硬编码镇级真相；谓词枚举 → 人话（与 Agent 检索层同一词汇表）。

export const RELATION_PREDICATE_HUMAN: Record<string, string> = {
  formerly_named: "旧名",
  founded_on_former_residence_of: "建于其故宅",
  built_on_site_of: "建于其故宅",
  named_after: "得名于",
  sister_bridge_with: "互为姐妹桥",
  has_bridges: "桥群含",
  located_in: "位于",
  spans_same_waterway: "同跨一条水道",
  spans_waterway: "跨越",
  same_waterway_as: "同跨一河",
  similar_form_to: "形制相仿",
  temple_bridge_association: "关联（未证实）",
  relative_position_south_of: "在南",
  // A001（绿之丘）谓词：claimed_origin_traceable_to 为身份连续性的「软」关联，
  // 人话化时显式声明「非同一建筑、待证」，绝不升级为同一栋建筑的身份断言（身份连续性禁区）。
  former_site_of: "原址为",
  claimed_origin_traceable_to: "前身可追溯到（非同一建筑，待证）",
  planned_to_cross: "规划横穿",
  renovated: "改造了",
};

export interface ParsedRelation {
  subject: string;
  predicate: string;
  predicateHuman: string;
  object: string;
}

/** 把「主—谓—宾」三元组拆开并人话化谓词；非法/缺项返回 null。 */
export function parseRelation(triple: string): ParsedRelation | null {
  const parts = triple.split("—");
  if (parts.length < 3) return null;
  const subject = parts[0].trim();
  const predicate = parts[1].trim();
  const object = parts.slice(2).join("—").trim();
  if (!subject || !predicate || !object) return null;
  return {
    subject,
    predicate,
    predicateHuman: RELATION_PREDICATE_HUMAN[predicate] ?? predicate,
    object,
  };
}

export function humanizeRelation(triple: string): string {
  const p = parseRelation(triple);
  return p ? `${p.subject} · ${p.predicateHuman} · ${p.object}` : triple;
}
