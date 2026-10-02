// packages/data-access/src/acquisition-gate.mjs
// 采集意图门禁（2026-10-02 · M4.2）
//
// 它回答一个问题：**这批数据当初是为了什么抓的？** 抓之前必须先在
// specs/data-production/acquisition-intents.json 里登记一条采集意图。
//
// 为什么需要它（实测代价）：
//   519 张图片是按**坐标半径地理搜索**抓回来的（源文件字段 `"source":"commons-geosearch-topup-20260829"`），
//   半径内的枫泾 104 / 川沙 73 / 新场 72 / 高桥 64 / 嘉定 41 全被捞进来 —— **金泽只占 34 张（6.5%）**。
//   而 437 条数据连「当初为什么抓它」都没有记录。
//   垃圾本身不可怕，**没有标签的垃圾**才可怕：事后无法筛除、无法解释、无法归档。
//
// 边界：本模块只回答「这一行属于哪个已声明的采集批次」，不负责取回、不负责写库。

import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./index.mjs";

export const INTENTS_PATH = path.join(PROJECT_ROOT, "specs", "data-production", "acquisition-intents.json");

let _cache = null;

export function loadIntents() {
  if (_cache) return _cache;
  const raw = JSON.parse(fs.readFileSync(INTENTS_PATH, "utf8"));
  const intents = Array.isArray(raw.intents) ? raw.intents : [];
  const byId = new Map(intents.map((x) => [x.batch_id, x]));
  _cache = { raw, intents, byId };
  return _cache;
}

/** 一个 `match` 谓词是否命中某行。row = { provider, title, kind } */
export function intentMatches(intent, row) {
  const m = intent.match || {};
  if (m.provider !== undefined && String(row.provider ?? "") !== String(m.provider)) return false;
  if (intent.provider !== undefined && String(row.provider ?? "") !== String(intent.provider)) return false;
  const kind = String(row.kind ?? "");
  if (m.metadata_kind !== undefined && kind !== String(m.metadata_kind)) return false;
  if (m.metadata_kind_excludes !== undefined && kind === String(m.metadata_kind_excludes)) return false;
  if (m.title_contains !== undefined && !String(row.title ?? "").includes(String(m.title_contains))) return false;
  if (m.title_contains_any !== undefined) {
    const any = m.title_contains_any.some((s) => String(row.title ?? "").includes(String(s)));
    if (!any) return false;
  }
  return true;
}

/**
 * 解析一行的采集意图。
 * 优先按 `metadata_json.acquisition.batch_id`（新写入者应写它）；否则回退到 match 谓词。
 * @returns {{ batch_id: string|null, intent: object|null, matches: number, via: string }}
 */
export function resolveIntentForRow(row) {
  const g = loadIntents();
  const explicit = row.acq_batch || (row.metadata_json && row.metadata_json.acquisition && row.metadata_json.acquisition.batch_id) || "";
  if (explicit) {
    const hit = g.byId.get(explicit);
    return { batch_id: explicit, intent: hit || null, matches: hit ? 1 : 0, via: "metadata_json.acquisition.batch_id" };
  }
  const hits = g.intents.filter((x) => intentMatches(x, row));
  return { batch_id: hits.length === 1 ? hits[0].batch_id : null, intent: hits.length === 1 ? hits[0] : null, matches: hits.length, via: "match" };
}

/**
 * 写入门禁：批次必须已声明，否则拒绝。
 * 用法：在写 source_records 之前调用 assertAcquisitionDeclared(batchId, "jobX")。
 */
export function assertAcquisitionDeclared(batchId, where = "") {
  const g = loadIntents();
  const hit = g.byId.get(batchId);
  if (!hit) {
    throw new Error(
      `采集意图门禁拒绝：批次 "${batchId}" 未在 specs/data-production/acquisition-intents.json 声明` +
        (where ? `（${where}）` : "") +
        "。处置：抓取前先登记一条采集意图（place_scope / theme_scope / provider / license_scope / method / query_or_radius）。"
    );
  }
  return hit;
}

/** 生成要写进 metadata_json 的 acquisition 元数据。 */
export function buildAcquisitionMeta(batchId) {
  const it = assertAcquisitionDeclared(batchId);
  return {
    batch_id: it.batch_id,
    declared_at: it.declared_at,
    intent_version: loadIntents().raw.schema_version,
  };
}
