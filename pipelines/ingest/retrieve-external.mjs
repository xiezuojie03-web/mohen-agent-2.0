// pipelines/ingest/retrieve-external.mjs — TASK-0004 定向检索（**非爬取**）。
//
// 定位：只取本轮四个工作包明确需要的外部资料，查询集合是本文件里写死的固定清单，
//       不做全量抓取、不扩展其他古镇、不遍历分类。
// 来源等级（specs/SOURCE_REGISTRY.md）：
//   - Wikidata / Wikimedia Commons = **S2**：可直接生成 Evidence（核原始出处、对象身份、许可）。
//   - S1（上图/地方志原文）需要用户提供的 API Key，本机不可用 → 缺口写入 research backlog，不伪造。
//
// 链路：定向检索 → Raw Snapshot（append-only + checksum）→ Source Record。
// 本脚本**不写 Evidence**：Evidence 由 pipelines/evidence/recover.mjs 依据 Raw 生成。
// 幂等：同一 run 目录已存在则拒绝覆盖；重跑需新 run_id。

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import { run as dbRun, queryRows, runMany } from "../../packages/data-access/src/index.mjs";

const RAW_STORE = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
const USER_AGENT = "MoHenAgent2.0/0.1 (TASK-0004 evidence recovery)";

function sha256(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function makeRunId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return `jinze-recovery-${ymd}-${crypto.randomBytes(4).toString("hex")}`;
}

// 带超时的 HTTPS GET（串行，避免触发对方限流）
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": USER_AGENT } }, (res) => {
      // 跟随 3xx（Wikidata/Commons 偶发跳转）
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        httpsGetJson(res.headers.location).then(resolve, reject);
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`非 JSON 响应: ${url}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error(`超时: ${url}`)));
  });
}

// —— 固定查询集合（写死，不动态扩展）——
const WIKIDATA_IDS = [
  { id: "Q13694319", why: "金泽镇：镇级坐标锚点（WP A）" },
  { id: "Q10918454", why: "吕颐浩：身份识别维度 生卒/朝代/官职（WP C）" },
  { id: "Q197461", why: "赵孟頫：身份识别维度 生卒/朝代（WP D 关联核验）" },
];

function commonsTitleFromUrl(fileUrl) {
  // https://upload.wikimedia.org/wikipedia/commons/1/18/Name.jpg -> File:Name.jpg
  const base = decodeURIComponent(fileUrl.split("/").pop());
  return `File:${base}`;
}

async function main() {
  const runId = process.argv[2] || makeRunId();
  const baseDir = path.join(RAW_STORE, "external", "jinze-evidence-recovery");
  const dir = path.join(baseDir, runId);
  if (fs.existsSync(dir)) {
    throw new Error(`Raw snapshot 已存在，禁止覆盖旧 run: ${dir}`);
  }
  fs.mkdirSync(dir, { recursive: true });

  // 1) Wikidata 定向取实体
  const wdRaw = {};
  for (const item of WIKIDATA_IDS) {
    const url =
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json" +
      `&ids=${item.id}&props=labels%7Cdescriptions%7Cclaims&languages=zh%7Cen`;
    const json = await httpsGetJson(url);
    wdRaw[item.id] = json;
    console.error(`  fetched wikidata ${item.id}`);
  }
  fs.writeFileSync(
    path.join(dir, "raw-wikidata.json"),
    JSON.stringify(wdRaw, null, 2),
    "utf8"
  );

  // 2) Commons 定向取本批 20 个视觉资产的原始元数据
  const visuals = await queryRows(
    `select asset_id::text, file_path from visual_assets order by file_path`
  );
  const commonsRaw = {};
  for (const v of visuals) {
    const title = commonsTitleFromUrl(v.file_path);
    const url =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
      "&iiprop=extmetadata%7Curl%7Cmime&iiextmetadatafilter=Artist%7CLicenseShortName%7C" +
      "DateTimeOriginal%7CCredit%7CImageDescription%7CGPSLatitude%7CGPSLongitude" +
      `&titles=${encodeURIComponent(title)}`;
    try {
      commonsRaw[v.asset_id] = { title, file_path: v.file_path, resp: await httpsGetJson(url) };
    } catch (e) {
      // 检索失败如实记录，不伪造
      commonsRaw[v.asset_id] = { title, file_path: v.file_path, error: e.message };
    }
    console.error(`  fetched commons ${title}`);
  }
  fs.writeFileSync(
    path.join(dir, "raw-commons.json"),
    JSON.stringify(commonsRaw, null, 2),
    "utf8"
  );

  // 3) manifest + checksum
  const manifest = {
    run_id: runId,
    schema: "mohen-external-retrieval/v1",
    created_at: new Date().toISOString(),
    purpose: "TASK-0004 Jinze Evidence Recovery（WP A/B/C/D）",
    source_class: { wikidata: "S2", wikimedia_commons: "S2" },
    queries: {
      wikidata_entities: WIKIDATA_IDS,
      commons_files: visuals.length,
    },
    files: ["raw-wikidata.json", "raw-commons.json"],
    checksums: {
      "raw-wikidata.json": sha256(fs.readFileSync(path.join(dir, "raw-wikidata.json"))),
      "raw-commons.json": sha256(fs.readFileSync(path.join(dir, "raw-commons.json"))),
    },
    note: "定向检索，非爬取；S1 需用户 API Key，本机不可用，缺口写入 research backlog。",
  };
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  // 4) Source Records（每个被实际使用的外部资源一条）
  const stmts = [];
  const sourceIds = {};
  for (const item of WIKIDATA_IDS) {
    const uri = `https://www.wikidata.org/wiki/${item.id}`;
    const raw = JSON.stringify(wdRaw[item.id]);
    stmts.push({
      sql: `insert into source_records(provider,title,source_uri,content_type,checksum,raw_path,metadata_json)
            values (:'prov',:'title',:'uri','application/json',:'chk',:'rp',:'m'::jsonb)
            on conflict (provider, checksum) do nothing`,
      params: {
        prov: "wikidata",
        title: `Wikidata ${item.id}`,
        uri,
        chk: sha256(raw),
        rp: path.join(dir, "raw-wikidata.json"),
        m: JSON.stringify({ entity_id: item.id, why: item.why }),
      },
    });
    sourceIds[`wd:${item.id}`] = { uri, checksum: sha256(raw) };
  }
  for (const v of visuals) {
    const rec = commonsRaw[v.asset_id];
    const raw = JSON.stringify(rec);
    const title = rec.title;
    stmts.push({
      sql: `insert into source_records(provider,title,source_uri,content_type,checksum,raw_path,metadata_json)
            values (:'prov',:'title',:'uri','application/json',:'chk',:'rp',:'m'::jsonb)
            on conflict (provider, checksum) do nothing`,
      params: {
        prov: "wikimedia-commons",
        title,
        uri: v.file_path,
        chk: sha256(raw),
        rp: path.join(dir, "raw-commons.json"),
        m: JSON.stringify({ asset_id: v.asset_id, error: rec.error || null }),
      },
    });
    sourceIds[`commons:${v.asset_id}`] = { uri: v.file_path, checksum: sha256(raw) };
  }
  await runMany(stmts);

  // 5) 回读 source_id（on conflict do nothing 时不返回 id，统一按 checksum 回查）
  const resolved = {};
  for (const [key, meta] of Object.entries(sourceIds)) {
    const rows = await queryRows(
      `select source_id::text from source_records where checksum=:'chk' limit 1`,
      { chk: meta.checksum }
    );
    resolved[key] = rows.length ? rows[0].source_id : null;
  }

  // 6) 状态文件，供 downstream 使用（不依赖 stdout 捕获）
  const state = { run_id: runId, dir, source_ids: resolved, manifest };
  fs.writeFileSync(path.join(baseDir, ".last-run.json"), JSON.stringify(state, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        run_id: runId,
        dir,
        wikidata_entities: WIKIDATA_IDS.length,
        commons_files: visuals.length,
        source_records_resolved: Object.values(resolved).filter(Boolean).length,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("RETRIEVE FAILED:", e.message);
  process.exit(1);
});
