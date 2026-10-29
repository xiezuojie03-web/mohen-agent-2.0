import { describe, expect, it } from "vitest";
import { buildQueryPlan, extractFallbackEntities, toTraditional } from "../../apps/web/lib/mohen-agent/query-plan";

describe("K5 查询梯子", () => {
  it("繁体变体：金泽→金澤、万安桥→萬安橋", () => {
    expect(toTraditional("金泽")).toBe("金澤");
    expect(toTraditional("万安桥")).toBe("萬安橋");
  });

  it("实体 + 别名 + 繁体 + 组合 + 类型，去重且限量", () => {
    const plan = buildQueryPlan("我想做一部金泽古桥与寺院的纪录片", ["金泽", "万安桥"]);
    expect(plan.entities).toEqual(["金泽", "万安桥"]);
    expect(plan.aliases).toContain("金泽镇");
    expect(plan.variants).toContain("金澤");
    expect(plan.combos).toContain("金泽历史");
    expect(plan.typed.some((t) => t.startsWith("金泽"))).toBe(true);
    expect(plan.terms.length).toBeLessThanOrEqual(8);
    expect(new Set(plan.terms).size).toBe(plan.terms.length);
  });

  it("无 LLM 实体时用规则兜底，且不把泛化词当实体", () => {
    const fallback = extractFallbackEntities("我想做一部关于朱家角古镇的短视频");
    expect(fallback).toContain("朱家角");
    expect(fallback).not.toContain("古镇");
    const plan = buildQueryPlan("我想做一部关于朱家角古镇的短视频");
    expect(plan.notes.join(",")).toContain("fallback");
    expect(plan.terms.length).toBeGreaterThan(0);
  });

  it("空意图不崩，返回空计划", () => {
    const plan = buildQueryPlan("");
    expect(plan.terms).toEqual([]);
    expect(plan.notes).toContain("empty_plan");
  });
});
