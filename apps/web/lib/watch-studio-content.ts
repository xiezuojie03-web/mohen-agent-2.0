// apps/web/lib/watch-studio-content.ts
//
// WATCH 画廊消费 `content.beats`（title/narration/visual/directorTimecodeMs），
// 而 MHKA Studio 修订的真实结构是 `content.frames`（著录位置/版本年代）+
// `studio.work_revisions.beats` 列（逐条要点与时长）。
//
// 这里只做字段映射，不合成任何史料：标题取 frame 的著录位置，旁白取
// beat.content，画面说明由 frame 的著录位置与版本/年代拼成，时码按 duration_ms
// 累加。缺字段就不显示，不补默认值、不猜年代、不编画面。

const BEAT_KIND_LABEL: Record<string, string> = { quote: "引文", rule: "规则", caution: "边界提醒" };

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function studioContentForWatch(contentJson: string, beatsJson: string | null | undefined): string {
  const content = (() => {
    try { return asObject(JSON.parse(contentJson || "{}")); } catch { return null; }
  })();
  if (!content) return contentJson;
  // 已是画廊口径（legacy 或已带 beats）就不动。
  if (Array.isArray(content.beats) && content.beats.length > 0) return contentJson;

  const beats = (() => {
    try { return beatsJson ? JSON.parse(beatsJson) : null; } catch { return null; }
  })();
  if (!Array.isArray(beats) || beats.length === 0) return contentJson;

  const frames = Array.isArray(content.frames)
    ? content.frames.map(asObject).filter((frame): frame is Record<string, unknown> => frame !== null)
    : [];
  const used = new Set<number>();
  const chapters: Array<Record<string, unknown>> = [];
  let elapsedMs = 0;

  for (const [index, raw] of beats.entries()) {
    const beat = asObject(raw);
    const narration = text(beat?.content);
    if (!beat || !narration) continue;
    const kind = text(beat.kind);
    let frameIndex = frames.findIndex((frame, i) => !used.has(i) && text(frame.kind) === kind);
    if (frameIndex < 0 && frames[index] && !used.has(index)) frameIndex = index;
    const frame = frameIndex >= 0 ? frames[frameIndex] : null;
    if (frameIndex >= 0) used.add(frameIndex);

    const location = text(frame?.location);
    const timeScope = text(frame?.time_scope);
    const durationMs = typeof beat.duration_ms === "number" && Number.isFinite(beat.duration_ms) && beat.duration_ms > 0
      ? beat.duration_ms : 0;
    const provenanceRefs = Array.isArray(frame?.material_refs)
      ? (frame.material_refs as unknown[]).map(text).filter((ref) => ref.length > 0)
      : [];

    chapters.push({
      title: location || BEAT_KIND_LABEL[kind] || `第 ${index + 1} 章`,
      narration,
      visual: [location ? `著录位置：${location}` : "", timeScope ? `版本/年代：${timeScope}` : ""].filter(Boolean).join(" · "),
      ...(durationMs > 0 ? { directorTimecodeMs: elapsedMs } : {}),
      ...(provenanceRefs.length > 0 ? { provenanceRefs } : {}),
    });
    elapsedMs += durationMs;
  }

  if (chapters.length === 0) return contentJson;
  return JSON.stringify({ ...content, beats: chapters });
}
