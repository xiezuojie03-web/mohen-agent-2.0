import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function loadKey(): string | null {
  for (const p of [".env.local", "apps/web/.env.local"]) {
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/^SHANGHAI_LIBRARY_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}

const KEY = loadKey();

// K2 实网冒烟：有 key 才跑；CI 无 key 自动跳过（不阻塞）。
describe.skipIf(!KEY)("K2 上海图书馆材料加固", () => {
  it("分页 + 快照 + content_availability 不再把书目当全文", async () => {
    process.env.SHANGHAI_LIBRARY_KEY = KEY!;
    const mod = await import("../../apps/web/lib/mohen-agent/retrieve-shl");
    const r = await mod.searchShanghaiLibraryMaterials(["金泽"], 12, { pageSize: 10, maxPagesPerTerm: 2 });

    expect(r.degraded).toBe(false);
    expect(r.materials.length).toBeGreaterThan(0);

    const allowed = new Set(["full_text", "excerpt", "metadata_only"]);
    for (const m of r.materials) {
      expect(allowed.has(m.content_availability)).toBe(true);
      expect(m.content_availability).not.toBe("full_content" as never);
      expect(m.license.length).toBeGreaterThan(0);
      expect(["unknown", "per_item", "clear"]).toContain(m.rights_clear);
    }
    // 金泽以书目/地名志为主，至少应有一条快照可复核
    expect(r.materials.some((m) => typeof m.snapshot_path === "string" && m.snapshot_path!.length > 0)).toBe(true);
    // 去重：source_type|title 不应重复
    const keys = r.materials.map((m) => `${m.source_type}|${m.title}`);
    expect(new Set(keys).size).toBe(keys.length);
  }, 60000);
});
