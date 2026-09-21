import { describe, expect, it } from "vitest";
import fs from "node:fs";
describe("experience contract", () => {
  it("keeps Canvas and structured action invariants", () => {
    const c = fs.readFileSync("specs/EXPERIENCE_CONTRACT.md","utf8");
    expect(c).toContain("ExperienceState");
    expect(c).toContain("SET_COMPOSITION");
    expect(c).toContain("一个 Primary Surface");
  });
});
