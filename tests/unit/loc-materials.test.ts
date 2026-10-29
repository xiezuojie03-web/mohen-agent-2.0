import { describe, expect, it } from "vitest";

const RUN = process.env.CI !== "true";

describe.skipIf(!RUN)("K3 LOC 适配器（优雅降级）", () => {
  it("200 时有图/权利；403/超时则 degraded=true 且不抛错", async () => {
    const mod = await import("../../apps/web/lib/mohen-agent/retrieve-loc");
    const r = await mod.searchLocMaterials(["china"], 3);
    expect(typeof r.degraded).toBe("boolean");
    if (r.degraded) {
      expect(r.materials.length).toBe(0);
    } else {
      expect(r.materials.length).toBeGreaterThan(0);
      for (const m of r.materials) {
        expect(m.provider).toBe("loc");
        expect(m.source_type).toBe("image");
        expect(m.url).toMatch(/^https?:\/\//);
      }
    }
  }, 60000);
});
