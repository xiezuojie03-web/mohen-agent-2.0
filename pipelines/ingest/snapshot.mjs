// pipelines/ingest/snapshot.mjs — Raw Snapshot 写盘（纯文件 IO，无 DB、无 Legacy 写入）。
// 单独抽出以便单测：test #1「Raw snapshot 不覆盖旧 run」直接调用本模块。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// 计算对象的 sha256（用于 snapshot 完整性校验）。
export function sha256Of(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

// 生成 run-id：jinze-YYYYMMDD-<8hex>。
export function makeRunId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rand = crypto.randomBytes(4).toString("hex");
  return `jinze-${ymd}-${rand}`;
}

// 写 Raw Snapshot（append-only）。
// 若 run 目录已存在则抛错 —— 重跑不得覆盖旧 run（test #1 验证）。
export function writeRawSnapshot({ runId, subset, manifest, rawStorePath }) {
  const base = rawStorePath || process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
  const dir = path.join(base, "legacy", "jinze", runId);
  if (fs.existsSync(dir)) {
    throw new Error(`Raw snapshot 已存在，禁止覆盖旧 run: ${dir}`);
  }
  fs.mkdirSync(dir, { recursive: true });
  const subsetPath = path.join(dir, "jinze-snapshot.json");
  const manifestPath = path.join(dir, "manifest.json");
  fs.writeFileSync(subsetPath, JSON.stringify(subset, null, 2), "utf8");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  return { dir, subsetPath, manifestPath };
}
