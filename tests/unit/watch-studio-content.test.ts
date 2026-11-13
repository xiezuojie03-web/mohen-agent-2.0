import { describe, expect, it } from "vitest";
import { studioContentForWatch } from "../../apps/web/lib/watch-studio-content";

// 数字取自本地已发布修订 6caec62b（松江府田赋·修订2）的真实字段形状：
// content.frames（著录位置/版本）+ beats 列（kind/content/duration_ms）。
const CONTENT = JSON.stringify({
  frames: [
    { kind: "quote", index: 1, location: "卷十一田赋门低田科则条", time_scope: "清康熙刻本", material_refs: ["read_unit:e065f45a"] },
    { kind: "rule", index: 2, location: "准熟起科条件", time_scope: "清康熙刻本", material_refs: ["projection:songjiang_grade"] },
    { kind: "caution", index: 3, location: "缺失证据说明", time_scope: "证据边界", material_refs: [] },
  ],
  narrative_arc: { opening: "开头", development: "发展", caution: "边界", present_connection: "当下" },
});
const BEATS = JSON.stringify([
  { kind: "quote", content: "低田均科正耗平米三斗六升五合", duration_ms: 30000, refs: { story_seed: true } },
  { kind: "rule", content: "准熟起科：熟荒状态决定起科与否", duration_ms: 40000 },
  { kind: "caution", content: "单页证据边界：不外推全府税率", duration_ms: 30000 },
]);

describe("studioContentForWatch", () => {
  it("把 frames + beats 映射成画廊可读章节，字段全部来自真实记录", () => {
    const parsed = JSON.parse(studioContentForWatch(CONTENT, BEATS)) as { beats: Array<Record<string, unknown>> };
    expect(parsed.beats).toHaveLength(3);
    expect(parsed.beats[0]).toMatchObject({
      title: "卷十一田赋门低田科则条",
      narration: "低田均科正耗平米三斗六升五合",
      visual: "著录位置：卷十一田赋门低田科则条 · 版本/年代：清康熙刻本",
      directorTimecodeMs: 0,
      provenanceRefs: ["read_unit:e065f45a"],
    });
    expect(parsed.beats[1].directorTimecodeMs).toBe(30000);
    expect(parsed.beats[2].directorTimecodeMs).toBe(70000);
    // 没有 material_refs 的章节不伪造出处
    expect(parsed.beats[2].provenanceRefs).toBeUndefined();
  });

  it("缺 location 时回落到真实的 kind 标签，不编造标题", () => {
    const content = JSON.stringify({ frames: [{ kind: "quote", time_scope: "清康熙刻本" }] });
    const parsed = JSON.parse(studioContentForWatch(content, BEATS)) as { beats: Array<Record<string, unknown>> };
    expect(parsed.beats[0].title).toBe("引文");
    expect(parsed.beats[0].visual).toBe("版本/年代：清康熙刻本");
  });

  it("没有 beats 或没有内容时不合成章节", () => {
    expect(JSON.parse(studioContentForWatch(CONTENT, null)).beats).toBeUndefined();
    expect(JSON.parse(studioContentForWatch(CONTENT, "[]")).beats).toBeUndefined();
    const emptyContent = JSON.stringify({ frames: [] });
    expect(JSON.parse(studioContentForWatch(emptyContent, JSON.stringify([{ kind: "quote", content: "" }]))).beats).toBeUndefined();
  });

  it("已是画廊口径（含 beats）的 legacy 内容原样返回", () => {
    const legacy = JSON.stringify({ beats: [{ title: "第一章", narration: "旁白" }] });
    expect(studioContentForWatch(legacy, BEATS)).toBe(legacy);
  });
});
