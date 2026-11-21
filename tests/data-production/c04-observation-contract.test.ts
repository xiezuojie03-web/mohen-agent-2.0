import { describe, it, expect } from "vitest";
import {
  routeVisualMaterial, validateC04Observation, C04_OBSERVATION_VERSION, MIN_DEFINITE_REGION_PIXELS,
} from "../../pipelines/data-production/adapters/c04-observation-contract.mjs";

const SHA = "a".repeat(64);

function baseCandidate() {
  return {
    source_image_sha256: SHA,
    technical: {
      width: 1200, height: 900, color_space: "sRGB",
      transforms: [{ kind: "orientation", reversible: true }],
    },
    caption: { text: "朱家角古镇，Zhujiajiao Water Village", provenance: "commons-extmetadata" },
    observations: [
      {
        evidence_class: "visual_observation",
        feature: "河道",
        statement: "画面中部有一条横向水道，两侧为临水建筑",
        certainty: "visible",
        region: { x: 0.1, y: 0.4, w: 0.6, h: 0.2, pixel_width: 720, pixel_height: 180 },
      },
    ],
  };
}

describe("C04 任务路由（图上有字走 C02，无字才走 C04）", () => {
  it("检出文字区域时选 C02，不允许视觉模型代替读字", () => {
    const r = routeVisualMaterial({ mediaType: "image/jpeg", textDetected: true });
    expect(r.method).toBe("C02");
    expect(r.reason_code).toBe("C04_ROUTE_TEXT_REGIONS_TO_C02");
  });

  it("文字区域计数 > 0 同样选 C02", () => {
    expect(routeVisualMaterial({ mediaType: "image/png", textRegionCount: 2 }).method).toBe("C02");
  });

  it("确认无字可读时选 C04", () => {
    const r = routeVisualMaterial({ mediaType: "image/jpeg", textDetected: false });
    expect(r.method).toBe("C04");
    expect(r.reason_code).toBe("C04_ROUTE_NO_LEGIBLE_TEXT");
  });

  it("未做文字检测时失败关闭，不猜", () => {
    const r = routeVisualMaterial({ mediaType: "image/jpeg" });
    expect(r.method).toBeNull();
    expect(r.disposition).toBe("HOLD");
    expect(r.reason_code).toBe("C04_TEXT_DETECTION_REQUIRED");
  });

  it("非图片材料不由 C04 接", () => {
    expect(routeVisualMaterial({ mediaType: "application/pdf", textDetected: false }).method).toBeNull();
  });
});

describe("C04 观察契约（失败关闭）", () => {
  it("合规候选 PASS", () => {
    const v = validateC04Observation(baseCandidate());
    expect(v.version).toBe(C04_OBSERVATION_VERSION);
    expect(v.disposition).toBe("PASS");
    expect(v.issues).toEqual([]);
  });

  it("图题并入视觉观察 → HOLD", () => {
    const c = baseCandidate();
    c.caption.merged_into_observations = true;
    const v = validateC04Observation(c);
    expect(v.disposition).toBe("HOLD");
    expect(v.blocking_codes).toContain("C04_CAPTION_MERGED_INTO_OBSERVATION");
  });

  it("缺原图 sha256 → HOLD", () => {
    const c = baseCandidate();
    delete c.source_image_sha256;
    expect(validateC04Observation(c).blocking_codes).toContain("C04_SOURCE_IMAGE_HASH_REQUIRED");
  });

  it("观察项没有框坐标 → HOLD", () => {
    const c = baseCandidate();
    delete c.observations[0].region;
    const v = validateC04Observation(c);
    expect(v.disposition).toBe("HOLD");
    expect(v.blocking_codes).toContain("C04_OBSERVATION_WITHOUT_REGION");
  });

  it("框超出图幅 → 视为无有效定位", () => {
    const c = baseCandidate();
    c.observations[0].region = { x: 0.8, y: 0.4, w: 0.5, h: 0.2, pixel_width: 600, pixel_height: 200 };
    expect(validateC04Observation(c).blocking_codes).toContain("C04_OBSERVATION_WITHOUT_REGION");
  });

  it("低清局部却做确定断言 → HOLD", () => {
    const c = baseCandidate();
    c.observations[0].region.pixel_width = MIN_DEFINITE_REGION_PIXELS - 1;
    c.observations[0].region.pixel_height = MIN_DEFINITE_REGION_PIXELS - 1;
    expect(validateC04Observation(c).blocking_codes).toContain("C04_LOW_RESOLUTION_DEFINITE_CLAIM");
  });

  it("遮挡区域仍做确定断言 → HOLD", () => {
    const c = baseCandidate();
    c.observations[0].occluded = true;
    expect(validateC04Observation(c).blocking_codes).toContain("C04_VISIBILITY_UNKNOWN_ASSERTED");
  });

  it("由文件名推导画面内容 → HOLD", () => {
    const c = baseCandidate();
    c.observations[0].derived_from = "filename";
    expect(validateC04Observation(c).blocking_codes).toContain("C04_GENERATED_DETAIL_CLAIM");
  });

  it("不可逆图像增强 → HOLD", () => {
    const c = baseCandidate();
    c.technical.transforms = [{ kind: "denoise", reversible: false }];
    expect(validateC04Observation(c).blocking_codes).toContain("C04_ENHANCEMENT_IRREVERSIBLE");
  });

  it("断言人物/年代/地名同一性 → 越界", () => {
    const c = baseCandidate();
    c.observations[0].statement = "此桥始建于明代嘉靖年间";
    expect(validateC04Observation(c).blocking_codes).toContain("C04_IDENTITY_CLAIM_OUT_OF_SCOPE");
  });

  it("图题缺来源 → HOLD", () => {
    const c = baseCandidate();
    delete c.caption.provenance;
    expect(validateC04Observation(c).blocking_codes).toContain("C04_CAPTION_PROVENANCE_MISSING");
  });

  it("空观察集 → HOLD", () => {
    const c = baseCandidate();
    c.observations = [];
    expect(validateC04Observation(c).blocking_codes).toContain("C04_OBSERVATION_EMPTY");
  });

  it("候选不是对象时不抛异常，直接失败关闭", () => {
    const v = validateC04Observation(null);
    expect(v.disposition).toBe("HOLD");
    expect(v.blocking_codes).toEqual(["C04_CANDIDATE_INVALID"]);
  });
});
