// apps/web/lib/mohen-agent/material-score.ts — K7 双评分 / 双篮 / 缺口报告（2026-10-29）
//
// 同一份资料对两条线价值不同：
// - 证据分 E：给知识生产线（一手性/权威性/可核验/时空粒度/可用性）
// - 故事分 S：给创作线（细节密度/人物冲突/场景/原话/图像）
// 输出 A/B/C/D 分级，并给出证据篮、故事篮、拒收清单与"下一步查什么"的缺口报告。
import type { ShlMaterial } from "./retrieve-shl";

export type Grade = "A" | "B" | "C" | "D";

export interface ScoredMaterial {
  material: ShlMaterial;
  evidence: number;
  story: number;
  eGrade: Grade;
  sGrade: Grade;
  reasons: string[];
}

export interface GapReport {
  total: number;
  evidenceCount: number;
  storyCount: number;
  rejectedCount: number;
  rightsUnknown: number;
  byType: Record<string, number>;
  byAvailability: Record<string, number>;
  missing: string[];
  nextQueries: string[];
}

export interface Baskets {
  evidence: ScoredMaterial[];
  story: ScoredMaterial[];
  rejected: ScoredMaterial[];
  gaps: GapReport;
}

const STORY_WORDS = [
  "桥", "寺", "庙", "庵", "塔", "河", "水", "船", "街", "巷", "人", "家", "年", "月",
  "传说", "故事", "诗", "记", "碑", "战", "迁", "灾", "修", "建", "毁", "重建",
];
const QUOTE_RE = /[「『“"][^」』”"]{2,}[」』”"]/;

export function grade(score: number): Grade {
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  return "D";
}

export function scoreEvidence(m: ShlMaterial): number {
  let s = 0;
  // 一手性（资料类型）
  if (m.source_type === "gazetteer") s += 22;
  else if (m.source_type === "person") s += 16;
  else s += 10; // bibliography / 其他
  // 权威性（来源）
  if (m.provider === "shanghai-library") s += 20;
  else s += 10;
  // 可核验性
  if (m.url) s += 8;
  if (m.snapshot_path) s += 8;
  if (m.fragments.length) s += 4;
  // 时空粒度
  const text = m.fragments.join(" ");
  if (/\d{3,4}年|明|清|宋|元|民国/.test(text)) s += 8;
  if (/[县镇村桥寺河街路]/.test(text)) s += 4;
  // 可用性
  if (m.content_availability === "full_text") s += 16;
  else if (m.content_availability === "excerpt") s += 12;
  if (m.rights_clear === "clear") s += 6;
  return Math.min(100, s);
}

export function scoreStory(m: ShlMaterial): number {
  const text = m.fragments.join(" ");
  let s = 0;
  if (text.length >= 100) s += 24;
  else if (text.length >= 50) s += 16;
  else if (text.length >= 25) s += 10;
  else if (text.length >= 12) s += 4;
  const hits = STORY_WORDS.filter((w) => text.includes(w)).length;
  s += Math.min(28, hits * 4);
  if (QUOTE_RE.test(text)) s += 10;
  if (/\d+/.test(text)) s += 6;
  if (m.source_type === "gazetteer") s += 6;
  if (m.content_availability === "excerpt" || m.content_availability === "full_text") s += 8;
  if (/\.(jpg|jpeg|png|webp)$/i.test(m.url)) s += 10;
  return Math.min(100, s);
}

function scoreOne(m: ShlMaterial): ScoredMaterial {
  const evidence = scoreEvidence(m);
  const story = scoreStory(m);
  const reasons: string[] = [];
  if (m.content_availability === "metadata_only") reasons.push("仅元数据");
  if (!m.snapshot_path) reasons.push("无原始快照");
  if (m.rights_clear === "unknown") reasons.push("权利未核");
  if (evidence >= 55 && story < 55) reasons.push("证据可用/故事偏干");
  if (story >= 55 && evidence < 55) reasons.push("故事可用/证据偏弱");
  return { material: m, evidence, story, eGrade: grade(evidence), sGrade: grade(story), reasons };
}

export function buildBaskets(materials: ShlMaterial[], topic = ""): Baskets {
  const scored = materials.map(scoreOne);
  const evidence = scored.filter((x) => x.evidence >= 55).sort((a, b) => b.evidence - a.evidence);
  const story = scored.filter((x) => x.story >= 55).sort((a, b) => b.story - a.story);
  const rejected = scored.filter((x) => x.evidence < 35 && x.story < 35);

  const byType: Record<string, number> = {};
  const byAvailability: Record<string, number> = {};
  for (const x of scored) {
    const t = x.material.source_type || "unknown";
    byType[t] = (byType[t] ?? 0) + 1;
    const a = x.material.content_availability || "unknown";
    byAvailability[a] = (byAvailability[a] ?? 0) + 1;
  }
  const rightsUnknown = scored.filter((x) => x.material.rights_clear === "unknown").length;
  const missing: string[] = [];
  if (evidence.length < 5) missing.push(`证据篮不足（${evidence.length}/5）`);
  if (story.length < 3) missing.push(`故事篮不足（${story.length}/3）`);
  if (!byType.gazetteer) missing.push("缺地名志/地理条目");
  if (!byType.person) missing.push("缺人物资料");
  if (!byType.bibliography) missing.push("缺书目/文献");
  if (!Object.keys(byAvailability).some((k) => k === "excerpt" || k === "full_text")) missing.push("缺可读正文");
  if (rightsUnknown > 0) missing.push(`权利未核 ${rightsUnknown} 条`);

  const nextQueries: string[] = [];
  const t = topic || "主题";
  if (!byType.gazetteer) nextQueries.push(`${t} 地名志`);
  if (!byType.person) nextQueries.push(`${t} 人物 传记`);
  if (!byType.bibliography) nextQueries.push(`${t} 方志`);
  if (!Object.keys(byAvailability).some((k) => k === "excerpt" || k === "full_text")) nextQueries.push(`${t} 史料 原文`);
  if (story.length < 3) nextQueries.push(`${t} 传说 故事`);
  nextQueries.push(`${t} 老照片`);

  return {
    evidence,
    story,
    rejected,
    gaps: {
      total: scored.length,
      evidenceCount: evidence.length,
      storyCount: story.length,
      rejectedCount: rejected.length,
      rightsUnknown,
      byType,
      byAvailability,
      missing,
      nextQueries: [...new Set(nextQueries)].slice(0, 6),
    },
  };
}
