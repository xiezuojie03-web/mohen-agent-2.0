// tests/unit/rights-actions.test.ts
// CP2-A（QR-04/QR-05）：唯一权利动作词典的正反用例。
// 铁律：只有显式 allowed 放行；缺失 / unknown / restricted / denied 一律 HOLD，
// 且不得从 CC 标签、public_domain_secondary_use 自述或来源类别推断许可。
import { describe, expect, it } from "vitest";
import {
  assertRightsActionsAllowed,
  canonicalRightsAction,
  canonicalRightsValue,
  decideRightsAction,
  decideRightsActions,
  evaluateG0Rights,
  normalizeRightsSnapshot,
  RIGHTS_ACTIONS,
  RIGHTS_VALUES,
} from "../../packages/data-access/src/rights-actions.mjs";

describe("唯一动作词典", () => {
  it("动作集同时覆盖 KAD 六动作与 Gate 的 machine_read/retain", () => {
    expect([...RIGHTS_ACTIONS]).toEqual([
      "access_view",
      "machine_read",
      "retain",
      "download",
      "quote",
      "display",
      "adapt",
      "redistribute",
      "external_processing",
    ]);
    expect([...RIGHTS_VALUES]).toEqual(["allowed", "denied", "unknown", "restricted"]);
  });

  it("旧写法归并到规范动作，未知动作一律不猜", () => {
    expect(canonicalRightsAction("read")).toBe("access_view");
    expect(canonicalRightsAction("public_display")).toBe("display");
    expect(canonicalRightsAction(" Machine_Read ")).toBe("machine_read");
    expect(canonicalRightsAction("copy")).toBeNull();
    expect(canonicalRightsAction("")).toBeNull();
  });

  it("取值只认四个规范值；否定别名归并到 denied", () => {
    expect(canonicalRightsValue("ALLOWED")).toBe("allowed");
    expect(canonicalRightsValue("prohibited")).toBe("denied");
    expect(canonicalRightsValue("allow")).toBeNull();
    expect(canonicalRightsValue("public_domain_secondary_use")).toBeNull();
  });
});

describe("快照归一", () => {
  it("缺失动作是 unknown，不是 allowed", () => {
    const snapshot = normalizeRightsSnapshot({ machine_read: "allowed" });
    expect(snapshot.actions.machine_read).toBe("allowed");
    expect(snapshot.actions.access_view).toBe("unknown");
    expect(snapshot.actions.display).toBe("unknown");
    expect(snapshot.issues).toEqual([]);
  });

  it("空对象、null、空串都等价于全 unknown", () => {
    for (const raw of [{}, null, undefined, ""]) {
      const snapshot = normalizeRightsSnapshot(raw);
      expect(Object.values(snapshot.actions).every((value) => value === "unknown")).toBe(true);
    }
  });

  it("接受 psql 文本通道的 JSON 字符串", () => {
    const snapshot = normalizeRightsSnapshot('{"read":"allowed","display":"denied"}');
    expect(snapshot.actions.access_view).toBe("allowed");
    expect(snapshot.actions.display).toBe("denied");
  });

  it("无法解析的记录记录 issue 且不放行任何动作", () => {
    for (const raw of ["{not json", "[1,2]", 42]) {
      const snapshot = normalizeRightsSnapshot(raw);
      expect(snapshot.issues[0].code).toBe("rights_snapshot_unparsable");
      expect(Object.values(snapshot.actions).every((value) => value === "unknown")).toBe(true);
    }
  });

  it("拼错的动作名与非法取值只记 issue，不产生许可", () => {
    const snapshot = normalizeRightsSnapshot({ machine_read: "yes", machineRead: "allowed" });
    expect(snapshot.actions.machine_read).toBe("unknown");
    expect(snapshot.issues.map((issue) => issue.code).sort()).toEqual([
      "rights_action_unrecognized",
      "rights_value_unrecognized",
    ]);
  });

  it("别名与规范名冲突时取更保守的一侧", () => {
    const snapshot = normalizeRightsSnapshot({ read: "denied", access_view: "allowed" });
    expect(snapshot.actions.access_view).toBe("denied");
    expect(snapshot.issues.some((issue) => issue.code === "rights_alias_conflict")).toBe(true);
  });
});

describe("单动作判定", () => {
  it("仅显式 allowed 放行", () => {
    expect(decideRightsAction({ machine_read: "allowed" }, "machine_read").allowed).toBe(true);
    for (const value of ["denied", "restricted", "unknown"]) {
      const decision = decideRightsAction({ machine_read: value }, "machine_read");
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe(`rights_${value}:machine_read`);
    }
  });

  it("不在库里的动作请求按未知动作拒绝", () => {
    const decision = decideRightsAction({ machine_read: "allowed" }, "copy_to_model");
    expect(decision.allowed).toBe(false);
    expect(decision.canonical).toBeNull();
    expect(decision.reason).toBe("rights_action_unrecognized:copy_to_model");
  });

  it("旧来源自述不再能当外发许可（Owner 2026-11-08 裁定）", () => {
    const legacy = { basis: "NAJ_secondary_use_policy", status: "public_domain_secondary_use", external_processing: "allow" };
    const decision = decideRightsAction(legacy, "external_processing");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("rights_unknown:external_processing");
  });
});

describe("G0 与多动作", () => {
  it("G0 必检 machine_read；只给 vision 类旧字段不放行", () => {
    const refused = evaluateG0Rights({ read: "allowed" });
    expect(refused.ok).toBe(false);
    expect(refused.required).toEqual(["machine_read"]);
    expect(refused.reasons).toEqual(["rights_unknown:machine_read"]);

    const passed = evaluateG0Rights({ machine_read: "allowed" });
    expect(passed.ok).toBe(true);
    expect(passed.gate).toBe("G0");
  });

  it("需要保存副本时叠加 retain", () => {
    const withoutRetain = evaluateG0Rights({ machine_read: "allowed" }, { retain: true });
    expect(withoutRetain.required).toEqual(["machine_read", "retain"]);
    expect(withoutRetain.ok).toBe(false);
    expect(withoutRetain.reasons).toEqual(["rights_unknown:retain"]);

    const both = evaluateG0Rights({ machine_read: "allowed", retain: "allowed" }, { retain: true });
    expect(both.ok).toBe(true);
  });

  it("多动作全允许才 ok；空动作集拒绝", () => {
    const allowed = decideRightsActions(
      { access_view: "allowed", machine_read: "allowed" },
      ["access_view", "machine_read"]
    );
    expect(allowed.ok).toBe(true);

    const partly = decideRightsActions({ access_view: "allowed" }, ["access_view", "machine_read"]);
    expect(partly.ok).toBe(false);
    expect(partly.reasons).toEqual(["rights_unknown:machine_read"]);

    const empty = decideRightsActions({ access_view: "allowed" }, []);
    expect(empty.ok).toBe(false);
    expect(empty.reasons).toEqual(["rights_actions_empty"]);
  });
});

describe("断言版失败关闭", () => {
  it("未许可时抛 RIGHTS_NOT_ALLOWED 并带原因码", () => {
    let error: unknown = null;
    try {
      assertRightsActionsAllowed({}, ["external_processing"], "TRANSFER");
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as { code?: string }).code).toBe("RIGHTS_NOT_ALLOWED");
    expect((error as Error).message).toBe("TRANSFER_NOT_ALLOWED:rights_unknown:external_processing");
  });

  it("显式允许时返回判定集，不抛错", () => {
    const outcome = assertRightsActionsAllowed({ external_processing: "allowed" }, ["external_processing"]);
    expect(outcome.ok).toBe(true);
    expect(outcome.decisions[0].value).toBe("allowed");
  });
});
