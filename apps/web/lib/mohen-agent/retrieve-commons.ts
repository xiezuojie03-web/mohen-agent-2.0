// apps/web/lib/mohen-agent/retrieve-commons.ts — K3 图像来源（Wikimedia Commons，2026-10-29）
//
// 目的：补"故事篮"最缺的图像/历史照片/版画，并逐条带许可与作者（不像 SHL 只有书目）。
// 纪律：只读公开 API；保留原始快照；许可不明标 unknown；不下载原图到仓库。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { ShlMaterial } from "./retrieve-shl";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "MoHenAgent2.0/0.1 (source: wikimedia-commons; contact: owner)";
const SNAPSHOT_ROOT =
  process.env.MOHEN_SNAPSHOT_DIR ||
  path.join(process.env.MOHEN_RAW_STORE_PATH || path.join(os.tmpdir(), "mohen-raw"), "external", "commons");

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getJson(url: string): Promise<{ status: number; parsed: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": UA, accept: "application/json" } });
    let parsed: unknown = null;
    try { parsed = await res.json(); } catch { parsed = null; }
    return { status: res.status, parsed };
  } catch {
    return { status: 0, parsed: null };
  } finally {
    clearTimeout(timer);
  }
}

function saveSnapshot(term: string, parsed: unknown): string | null {
  try {
    fs.mkdirSync(SNAPSHOT_ROOT, { recursive: true });
    const h = crypto.createHash("sha1").update(`${term}|${Date.now()}`).digest("hex").slice(0, 12);
    const file = path.join(SNAPSHOT_ROOT, `${new Date().toISOString().slice(0, 10)}-${h}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({ provider: "wikimedia-commons", term, fetched_at: new Date().toISOString(), response: parsed }, null, 2),
      "utf8"
    );
    return file;
  } catch {
    return null;
  }
}

interface CommonsPage {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    width?: number;
    height?: number;
    extmetadata?: Record<string, { value?: unknown }>;
  }>;
}

function metaValue(meta: Record<string, { value?: unknown }> | undefined, key: string): string {
  const v = meta?.[key]?.value;
  return v === undefined || v === null ? "" : stripHtml(String(v));
}

export async function searchCommonsMaterials(
  terms: string[],
  max = 8
): Promise<{ materials: ShlMaterial[]; degraded: boolean }> {
  const q = terms.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!q.length) return { materials: [], degraded: false };

  const materials: ShlMaterial[] = [];
  const seen = new Set<string>();
  let ok = 0;

  for (const term of q) {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: term,
      gsrnamespace: "6",
      gsrlimit: String(Math.min(Math.max(max, 3), 20)),
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: "900",
      format: "json",
      origin: "*",
    });
    const { status, parsed } = await getJson(`${API}?${params.toString()}`);
    if (status !== 200 || !parsed) continue;
    ok++;
    const snapshot = saveSnapshot(term, parsed);
    const pages = (parsed as { query?: { pages?: Record<string, CommonsPage> } }).query?.pages;
    if (!pages) continue;

    for (const p of Object.values(pages)) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const key = p.title ?? info.descriptionurl ?? info.url ?? "";
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const meta = info.extmetadata;
      const license = metaValue(meta, "LicenseShortName");
      const artist = metaValue(meta, "Artist");
      const credit = metaValue(meta, "Credit");
      const desc = metaValue(meta, "ImageDescription");
      const date = metaValue(meta, "DateTimeOriginal");
      const objName = metaValue(meta, "ObjectName");

      const fragments = [
        desc,
        artist ? `作者：${artist}` : "",
        credit ? `来源：${credit}` : "",
        date ? `年代：${date}` : "",
      ].filter(Boolean);

      materials.push({
        provider: "wikimedia-commons",
        title: objName || stripHtml(p.title ?? term),
        source_type: "image",
        carrier_type: "image",
        provenance_status: "candidate",
        content_availability: "image_scan",
        // 获取适配器只接受原图 URL（/wikipedia/commons/<hash>/<file>），
        // thumb 路径会被 COMMONS_LOCATOR_UNSUPPORTED 拒绝——线索必须携带可复取的原图地址。
        url: info.url || info.thumburl || "",
        publisher: "Wikimedia Commons",
        license: license || "未标注（以文件页为准）",
        rights_clear: license ? "per_item" : "unknown",
        snapshot_path: snapshot,
        fragments: fragments.length ? fragments : [stripHtml(p.title ?? term)],
      });
      if (materials.length >= max) return { materials, degraded: false };
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return { materials, degraded: ok === 0 };
}

/** 按主题 + 实体检索图像（给 prepare-topic 用）。 */
export function searchCommonsForTopic(topic: string, entities: string[], max = 8) {
  const terms = [topic, ...entities].filter(Boolean).slice(0, 3);
  return searchCommonsMaterials(terms, max);
}
