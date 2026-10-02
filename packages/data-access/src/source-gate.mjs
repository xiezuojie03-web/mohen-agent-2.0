// packages/data-access/src/source-gate.mjs
// 来源门禁（2026-10-02 · M4.1）—— 把 specs/SOURCE_REGISTRY.md 的 S1–S4 分级变成**真的会被读**的代码。
//
// 为什么需要它：
//   `data/fixtures/source-providers.json` 自 2026-08 起就声称来源门禁，文档三处写「取回必须遵守」，
//   但**全仓没有一行代码读它** —— 它什么也没挡住（实测：341 张外镇图照样入库）。
//   本模块就是那个"读它的人"。这不是新增规则，是让既有规则生效。
//
// 归一规则（见 fixtures 的 normalization 字段）：
//   trim → 转小写 → 空格/连字符/全角空格 → 下划线 → 折叠连续下划线。
//   为什么靠归一而不是逐个列别名：真库存在 `Wikimedia Commons` / `wikimedia-commons`、
//   `qingpu-government` / `shanghai-qingpu-gov` 等多写法，逐个列必漏。
//
// 边界：本模块**只回答"这个来源是什么级别、能不能生成 Evidence"**，不负责取回、不负责写库。

import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./index.mjs";

export const SOURCE_GATE_PATH = path.join(PROJECT_ROOT, "data", "fixtures", "source-providers.json");

export function normalizeProvider(s) {
  return String(s == null ? "" : s)
    .trim()
    .toLowerCase()
    .replace(/[\s\-－—–\u3000]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

let _cache = null;

/** 读取并索引来源表。索引键＝规范化后的 canonical 与全部 alias。 */
export function loadSourceGate() {
  if (_cache) return _cache;
  const raw = JSON.parse(fs.readFileSync(SOURCE_GATE_PATH, "utf8"));
  const providers = Array.isArray(raw.providers) ? raw.providers : [];
  const index = new Map();
  const duplicateAliases = [];
  for (const p of providers) {
    for (const key of [p.canonical, ...(p.aliases || [])]) {
      const k = normalizeProvider(key);
      const prev = index.get(k);
      if (prev && prev.canonical !== p.canonical) {
        duplicateAliases.push({ key: k, claimed_by: [prev.canonical, p.canonical] });
      }
      index.set(k, p);
    }
  }
  _cache = { raw, providers, index, duplicateAliases };
  return _cache;
}

/** 解析一个 provider 字符串。未登记 → known:false（由调用方决定拒绝还是告警，本模块不擅自放行）。 */
export function resolveProvider(s) {
  const g = loadSourceGate();
  const key = normalizeProvider(s);
  const hit = g.index.get(key);
  if (!hit) {
    return { known: false, input: s, normalized: key, canonical: null, tier: null, evidence_allowed: false };
  }
  return {
    known: true,
    input: s,
    normalized: key,
    canonical: hit.canonical,
    tier: hit.tier,
    evidence_allowed: hit.evidence_allowed,
    needs_owner_confirmation: hit.needs_owner_confirmation === true,
    record: hit,
  };
}

/** 该来源能否直接生成 Evidence（S1/S2=true，S3=仅现代空间，S4/LEGACY/SELF=false）。 */
export function canGenerateEvidence(s) {
  const r = resolveProvider(s);
  return r.known && r.evidence_allowed === true;
}

/**
 * 写入门禁：**未登记的 provider 一律拒绝写入**（fail loud，不静默接受）。
 * 用法：在任何写 source_records 之前调用。
 */
export function assertProviderRegistered(s, where = "") {
  const r = resolveProvider(s);
  if (!r.known) {
    throw new Error(
      `来源门禁拒绝：provider "${s}" 未在 data/fixtures/source-providers.json 登记` +
        (where ? `（${where}）` : "") +
        "。处置：① 为它建一个 canonical 条目（tier / evidence_allowed / basis 必填），或 ② 改用已登记的 provider。"
    );
  }
  return r;
}
