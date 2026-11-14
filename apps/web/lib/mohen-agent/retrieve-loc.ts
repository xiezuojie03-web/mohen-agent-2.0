// apps/web/lib/mohen-agent/retrieve-loc.ts — K3 图像来源（Library of Congress，2026-10-29）
//
// 与 Commons 互补：LOC 的历史地图/照片/版画。当前部署环境对 LOC 返回 403（IP/机器人策略），
// 因此本适配器必须优雅降级：degraded=true、返回空，不阻塞主题准备。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { ShlMaterial } from "./retrieve-shl";

const API = "https://www.loc.gov/search/";
const UA = "Mozilla/5.0 (compatible; MoHenAgent2.0/0.1; +https://mohen.local)";
const SNAPSHOT_ROOT =
  process.env.MOHEN_SNAPSHOT_DIR ||
  path.join(process.env.MOHEN_RAW_STORE_PATH || path.join(os.tmpdir(), "mohen-raw"), "external", "loc");

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => stripHtml(String(x))).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [stripHtml(v)];
  return [];
}

async function getJson(url: string): Promise<{ status: number; parsed: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "application/json", "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8" },
    });
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
      JSON.stringify({ provider: "loc", term, fetched_at: new Date().toISOString(), response: parsed }, null, 2),
      "utf8"
    );
    return file;
  } catch {
    return null;
  }
}

interface LocItem {
  title?: string;
  description?: unknown;
  image_url?: unknown;
  date?: string;
  rights_advisory?: unknown;
  id?: string;
  url?: string;
}

export async function searchLocMaterials(
  terms: string[],
  max = 6
): Promise<{ materials: ShlMaterial[]; degraded: boolean }> {
  const q = terms.map((t) => t.trim()).filter(Boolean).slice(0, 2);
  if (!q.length) return { materials: [], degraded: false };

  const materials: ShlMaterial[] = [];
  const seen = new Set<string>();
  let ok = 0;

  for (const term of q) {
    const params = new URLSearchParams({ q: term, fo: "json", c: String(Math.min(Math.max(max, 3), 10)) });
    const { status, parsed } = await getJson(`${API}?${params.toString()}`);
    if (status !== 200 || !parsed) continue;
    ok++;
    const snapshot = saveSnapshot(term, parsed);
    const items = ((parsed as { results?: LocItem[] }).results ?? []).slice(0, max);
    for (const it of items) {
      const key = String(it.id ?? it.url ?? it.title ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const imgs = asArray(it.image_url);
      const desc = asArray(it.description).join("；");
      const rights = asArray(it.rights_advisory).join("；");
      materials.push({
        provider: "loc",
        title: stripHtml(String(it.title ?? term)),
        source_type: "image",
        carrier_type: "image",
        provenance_status: "candidate",
        content_availability: "image_scan",
        url: imgs[0] ?? String(it.url ?? ""),
        publisher: "Library of Congress",
        license: rights || "见 LOC 条目权利说明",
        rights_clear: rights ? "per_item" : "unknown",
        snapshot_path: snapshot,
        fragments: [desc, it.date ? `年代：${it.date}` : ""].filter(Boolean),
      });
      if (materials.length >= max) return { materials, degraded: false };
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return { materials, degraded: ok === 0 };
}
