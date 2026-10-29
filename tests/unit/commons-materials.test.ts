import { describe, expect, it } from "vitest";

// K3 实网冒烟：Commons 公开 API。CI 环境可能限流，故 CI 跳过；本地默认跑。
const RUN = process.env.CI !== "true";

describe.skipIf(!RUN)("K3 Wikimedia Commons 图像来源", () => {
  it("检索朱家角/苏州河，返回图像 + 许可 + 快照", async () => {
    const mod = await import("../../apps/web/lib/mohen-agent/retrieve-commons");
    const r = await mod.searchCommonsMaterials(["Zhujiajiao", "Suzhou Creek Shanghai"], 8);
    expect(r.degraded).toBe(false);
    expect(r.materials.length).toBeGreaterThan(0);

    for (const m of r.materials) {
      expect(m.provider).toBe("wikimedia-commons");
      expect(m.source_type).toBe("image");
      expect(m.content_availability).toBe("image_only");
      expect(m.license.length).toBeGreaterThan(0);
      expect(m.url).toMatch(/^https?:\/\//);
    }
    expect(r.materials.some((m) => m.snapshot_path)).toBe(true);
    expect(r.materials.some((m) => m.rights_clear === "per_item")).toBe(true);
  }, 60000);
});
