// apps/web/lib/mohen-agent/retrieve-wikisource.ts — Y02 渠道：维基文库（中文）
//
// sources/registry.json 已登记 zh-wikisource（access=api，coverage=公版古籍全文/方志/诗文），
// 但此前没有执行模块。本文件补上该渠道，供 D00 来源发现（Y02 机构集合与多渠道来源发现）调用。
//
// 纪律：
// - 结果只作「外部检索线索」（RESEARCH_LEAD），不是 G5 合格知识，不冒充全文；
// - 摘要来自搜索命中片段（excerpt），不把片段当已读正文；
// - 权利逐页不同，一律按 per_item 登记，不按站点许可整体放行；
// - 境内可达性不稳定，失败即如实 degraded，不伪造结果。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { ShlMaterial } from "./retrieve-shl";

const API = "https://zh.wikisource.org/w/api.php";
const UA = "MoHenAgent2.0/0.1 (source: zh-wikisource; contact: owner)";

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
}

async function getJson(url: string): Promise<{ status: number; parsed: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Api-User-Agent": UA },
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    return { status: res.status, parsed };
  } catch {
    return { status: 0, parsed: null };
  } finally {
    clearTimeout(timer);
  }
}

function saveSnapshot(term: string, parsed: unknown): string | null {
  try {
    const dir = path.join(
      process.env.MOHEN_RAW_STORE_PATH || path.join(os.tmpdir(), "mohen-raw"),
      "external",
      "wikisource"
    );
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(dir, `${stamp}-${crypto.createHash("sha256").update(term).digest("hex").slice(0, 12)}.json`);
    fs.writeFileSync(file, JSON.stringify(parsed, null, 2), "utf8");
    return file;
  } catch {
    return null;
  }
}

interface WsSearchItem {
  title?: string;
  snippet?: string;
  size?: number;
}

/** 按检索词查维基文库；命中只作线索。 */
export async function searchWikisourceMaterials(
  terms: string[],
  max = 6
): Promise<{ materials: ShlMaterial[]; degraded: boolean }> {
  const q = terms.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!q.length) return { materials: [], degraded: false };

  const materials: ShlMaterial[] = [];
  const seen = new Set<string>();
  let ok = 0;

  for (const term of q) {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: term,
      srnamespace: "0",
      srlimit: String(Math.min(Math.max(max, 3), 20)),
      format: "json",
      origin: "*",
    });
    const { status, parsed } = await getJson(`${API}?${params.toString()}`);
    if (status !== 200 || !parsed) continue;
    ok++;
    const snapshot = saveSnapshot(term, parsed);
    const hits = (parsed as { query?: { search?: WsSearchItem[] } }).query?.search;
    if (!hits?.length) continue;

    for (const hit of hits) {
      const title = stripHtml(hit.title ?? "");
      if (!title || seen.has(title)) continue;
      seen.add(title);
      materials.push({
        provider: "zh-wikisource",
        title,
        source_type: "primary_text",
        carrier_type: "text",
        provenance_status: "candidate",
        // 搜索片段只是命中摘录，不能当成已读取正文。
        content_availability: "excerpt",
        url: `https://zh.wikisource.org/wiki/${encodeURIComponent(hit.title ?? "")}`,
        publisher: "维基文库（中文）",
        // 逐页许可不同，不按站点整体放行。
        license: "公版/CC BY-SA（逐页核定）",
        rights_clear: "per_item",
        snapshot_path: snapshot,
        fragments: [stripHtml(hit.snippet ?? "") || title],
      });
      if (materials.length >= max) return { materials, degraded: false };
    }
  }

  // 一个检索词都没成功 = 渠道不可用；部分成功不算整体降级。
  return { materials, degraded: ok === 0 };
}
