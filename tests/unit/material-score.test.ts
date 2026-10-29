import { describe, expect, it } from "vitest";
import { buildBaskets, grade, scoreEvidence, scoreStory } from "../../apps/web/lib/mohen-agent/material-score";
import type { ShlMaterial } from "../../apps/web/lib/mohen-agent/retrieve-shl";

function m(over: Partial<ShlMaterial>): ShlMaterial {
  return {
    provider: "shanghai-library",
    title: "地名志·金泽",
    source_type: "gazetteer",
    carrier_type: "digital_text",
    provenance_status: "candidate",
    content_availability: "excerpt",
    url: "https://data1.library.sh.cn/x",
    publisher: "上海图书馆开放数据",
    license: "开放数据服务条款",
    rights_clear: "unknown",
    snapshot_path: "D:/snap/1.json",
    fragments: ["金泽镇，明清属青浦县，有万安桥、普济桥，相传为姐妹桥。"],
    ...over,
  };
}

describe("K7 双评分与双篮", () => {
  it("地名志+快照+权利清晰 → 证据 A", () => {
    const s = m({ rights_clear: "clear", content_availability: "full_text" });
    expect(scoreEvidence(s)).toBeGreaterThanOrEqual(75);
    expect(grade(scoreEvidence(s))).toBe("A");
  });

  it("仅书目元数据 → 证据 C 或 D，故事也低", () => {
    const s = m({
      source_type: "bibliography",
      content_availability: "metadata_only",
      snapshot_path: null,
      fragments: ["书名：金泽小志"],
      url: "",
    });
    expect(scoreEvidence(s)).toBeLessThan(55);
    expect(scoreStory(s)).toBeLessThan(55);
  });

  it("细节/人物/引语丰富 → 故事 B 以上", () => {
    const s = m({
      fragments: [
        "「桥成于宋，乡人聚而观之。」万安桥与普济桥同跨一河，形制相仿，传说是一对姐妹所建；每年春社，船从桥下过，锣鼓喧天。",
      ],
    });
    expect(scoreStory(s)).toBeGreaterThanOrEqual(55);
  });

  it("材料不足时缺口报告给出数量与下一步查询", () => {
    const b = buildBaskets([m({}), m({ source_type: "bibliography", content_availability: "metadata_only" })], "金泽");
    expect(b.gaps.total).toBe(2);
    expect(b.gaps.missing.some((x) => x.includes("证据篮不足"))).toBe(true);
    expect(b.gaps.missing.some((x) => x.includes("故事篮不足"))).toBe(true);
    expect(b.gaps.nextQueries.some((q) => q.includes("老照片"))).toBe(true);
  });

  it("双低材料进入 rejected", () => {
    const b = buildBaskets([
      m({ source_type: "bibliography", content_availability: "metadata_only", fragments: ["书名：某志"], url: "", snapshot_path: null }),
    ]);
    expect(b.rejected.length).toBe(1);
  });
});
