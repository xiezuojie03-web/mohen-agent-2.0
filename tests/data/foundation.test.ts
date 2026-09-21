import { describe, expect, it } from "vitest";
import fs from "node:fs";
describe("foundation data rules", () => {
  it("keeps the first migration and evidence guard", () => {
    const sql = fs.readFileSync("supabase/migrations/202609210001_foundation.sql","utf8");
    expect(sql).toContain("source_records");
    expect(sql).toContain("evidence");
    expect(sql).toContain("guard_published_claim_evidence");
  });
  it("does not commit secrets", () => {
    const env = fs.readFileSync(".env.example","utf8");
    expect(env).toContain("DEEPSEEK_API_KEY=");
    expect(env).not.toMatch(/sk-[A-Za-z0-9]{12,}/);
  });
});
