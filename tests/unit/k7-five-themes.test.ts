import { describe, expect, it } from "vitest";
import fs from "node:fs";

function loadKey(): string | null {
  for (const p of [".env.local", "apps/web/.env.local"]) {
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/^SHANGHAI_LIBRARY_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}
const KEY = loadKey();

const THEMES: Array<[string, string[]]> = [
  ["金泽古桥与寺院", ["金泽", "万安桥", "颐浩寺"]],
  ["朱家角古镇", ["朱家角", "放生桥", "课植园"]],
  ["苏州河沿岸", ["苏州河", "外白渡桥", "河滨大楼"]],
  ["豫园与城隍庙", ["豫园", "城隍庙", "湖心亭"]],
  ["龙华寺与龙华塔", ["龙华寺", "龙华塔", "龙华镇"]],
];

describe.skipIf(!KEY)("K2/K5/K7 五主题重跑", () => {
  it("输出每个主题的材料数/证据篮/故事篮/缺口", async () => {
    process.env.SHANGHAI_LIBRARY_KEY = KEY!;
    const shl = await import("../../apps/web/lib/mohen-agent/retrieve-shl");
    const commons = await import("../../apps/web/lib/mohen-agent/retrieve-commons");
    const qp = await import("../../apps/web/lib/mohen-agent/query-plan");
    const ms = await import("../../apps/web/lib/mohen-agent/material-score");

    const rows: unknown[] = [];
    for (const [topic, entities] of THEMES) {
      const plan = qp.buildQueryPlan(topic, entities);
      const r = await shl.searchShanghaiLibraryMaterials(plan.terms.slice(0, 4), 24, {
        pageSize: 10,
        maxPagesPerTerm: 2,
      });
      const photos = await commons.searchCommonsMaterials([entities[0], topic], 6);
      const b = ms.buildBaskets([...r.materials, ...photos.materials], topic);
      rows.push({
        topic,
        terms: plan.terms.slice(0, 4),
        materials: r.materials.length,
        photos: photos.materials.length,
        evidence: b.gaps.evidenceCount,
        story: b.gaps.storyCount,
        rejected: b.gaps.rejectedCount,
        rightsUnknown: b.gaps.rightsUnknown,
        byType: b.gaps.byType,
        missing: b.gaps.missing,
      });
    }
    console.log("K7_FIVE_THEMES=" + JSON.stringify(rows));
    expect(rows.length).toBe(5);
    // 至少不能比 K0 更差：每个主题都应有材料
    for (const r of rows as Array<{ materials: number }>) expect(r.materials).toBeGreaterThan(0);
  }, 180000);
});
