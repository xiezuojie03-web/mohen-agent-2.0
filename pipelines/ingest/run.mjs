// pipelines/ingest/run.mjs — 金泽 Legacy 最小样本 → Raw Snapshot + Source Record + ingest_run。
//
// 只读：Legacy 仓库（hushang-jingwei/data/seed.master.json）只读取，绝不写入。
// 职责（OWNERSHIP_MAP）：仅登记 Raw + Source，禁止写 verified 知识。
//
// 输出：打印 JSON { run_id, ingest_run_id, source_id, snapshot_dir, input_counts, subset_checksum }
//       供 normalize / evidence 阶段通过 ingest_run_id 衔接。

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { PROJECT_ROOT, run as dbRun, queryRows } from "../../packages/data-access/src/index.mjs";
import { writeRawSnapshot, sha256Of, makeRunId } from "./snapshot.mjs";

// 金泽最小样本：覆盖桥(7)/寺(1)/水系(1)/聚落沿革(1)/民俗市集(2)/人物(2)/事件(1) = 15。
// 均为 town=金泽 且有 source_uri 的实体（G0 来源完整）。不含无来源的弱数据（FLK-002/003/004、TRD-002/003/004）。
const SELECTED_IDS = [
  "JZ-BLD-001", "JZ-BLD-002", "JZ-BLD-003", "JZ-BLD-004", "JZ-BLD-005",
  "JZ-BLD-006", "JZ-BLD-007", "JZ-BLD-008", // 七桥 + 颐浩寺遗址
  "JZ-OVL-002", "JZ-OVL-001",               // 四十二虹桥→今存七桥 / 白苎里→金溪→金泽
  "JZ-FLK-001", "JZ-TRD-001",               // 金泽庙会 / 锭子谢家车
  "JZ-PPL-001", "JZ-PPL-002",               // 吕颐浩 / 赵孟頫
  "JZ-TLN-003",                            // 金泽小志成书
];

function resolveLegacyPath() {
  return (
    process.env.MOHEN_LEGACY_SEED ||
    path.resolve(PROJECT_ROOT, "..", "hushang-jingwei", "data", "seed.master.json")
  );
}

// Legacy 中 entities/relations/external_maps 为裸数组；photos/narrative_assets 为 {meta, photos|assets} 包装。
function arr(x) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.photos)) return x.photos;
  if (x && Array.isArray(x.assets)) return x.assets;
  return [];
}

async function main() {
  const legacyPath = resolveLegacyPath();
  if (!fs.existsSync(legacyPath)) throw new Error("Legacy 入口未找到: " + legacyPath);
  const data = JSON.parse(fs.readFileSync(legacyPath, "utf8")); // 只读

  const entities = arr(data.entities).filter(
    (e) => e.town === "金泽" && SELECTED_IDS.includes(e.id)
  );
  const selIds = new Set(entities.map((e) => e.id));
  // 与所选实体直接相关的 relations（含跨镇关系，如实计入）。
  const relations = arr(data.relations).filter(
    (r) => selIds.has(r.source_id) || selIds.has(r.target_id)
  );
  const photos = arr(data.photos)
    .filter((p) => Array.isArray(p.towns) && p.towns.includes("金泽"))
    .slice(0, 20);
  const na = arr(data.narrative_assets).filter(
    (a) => Array.isArray(a.towns) && a.towns.includes("金泽")
  );
  // 优先取有正文的叙事，不足 20 再用题录补足。
  let narrative = na.filter((a) => a.content && a.content.trim()).slice(0, 20);
  if (narrative.length < 20) {
    const rest = na.filter((a) => !(a.content && a.content.trim()));
    for (const r of rest) {
      if (narrative.length >= 20) break;
      narrative.push(r);
    }
  }
  const maps = arr(data.external_maps).filter(
    (m) => Array.isArray(m.towns) && m.towns.includes("金泽")
  );
  const stories = arr(data.stories).filter((s) => s.id === "story-jinze-bridge");

  const subset = { entities, relations, photos, narrative_assets: narrative, external_maps: maps, stories };
  const checksum = sha256Of(subset);

  let legacyCommit = "unknown";
  try {
    legacyCommit = execSync("git rev-parse HEAD", {
      cwd: path.dirname(legacyPath),
      encoding: "utf8",
    }).trim();
  } catch {
    /* 仅读取，失败不影响 */
  }

  const runId = makeRunId();
  const manifest = {
    run_id: runId,
    schema: "mohen-legacy-snapshot/v1",
    created_at: new Date().toISOString(),
    legacy_repo: path.dirname(path.dirname(legacyPath)),
    legacy_file: legacyPath,
    legacy_commit: legacyCommit,
    selected_entity_ids: SELECTED_IDS,
    input_counts: {
      entities: entities.length,
      relations: relations.length,
      photos: photos.length,
      narrative_assets: narrative.length,
      external_maps: maps.length,
      stories: stories.length,
    },
    subset_checksum: checksum,
    note: "金泽最小样本；Legacy 只读，未经 Evidence Gate 不得视为 verified。",
  };

  const { dir, subsetPath } = writeRawSnapshot({ runId, subset, manifest });

  // 写入本地状态文件（raw store 内，非仓库、不提交），供 normalize/evidence 衔接，免依赖 stdout 捕获。
  const rawStorePath = process.env.MOHEN_RAW_STORE_PATH || "D:/MoHen/data/raw";
  fs.writeFileSync(
    path.join(rawStorePath, "legacy", "jinze", ".last-run.json"),
    JSON.stringify({ run_id: runId, ingest_run_id: null, source_id: null, snapshot_dir: dir }),
    "utf8"
  );

  // DB：ingest_run（running）+ source_record（整包 snapshot 的来源登记）。
  const runRow = await queryRows(
    `insert into ingest_runs(pipeline_name,source_scope,status,input_count,candidate_count,metadata_json)
     values (:'p',:'s','running',:'inp'::int,:'cand'::int,:'m'::jsonb) returning ingest_run_id`,
    {
      p: "jinze-legacy-staging",
      s: "金泽 (town=金泽) 最小样本",
      inp: String(entities.length),
      cand: "0",
      m: JSON.stringify(manifest),
    }
  );
  const ingestRunId = runRow[0].ingest_run_id;

  // 幂等（夜间协议 §7 Idempotent）：同一 (provider, checksum) 的 snapshot 若已登记，
  // 复用既有 source_id —— 重复运行既不制造重复来源，也不因唯一约束中断整批。
  const srcParams = {
    provider: "hushang-jingwei",
    title: "沪上经纬 seed.master.json — 金泽最小样本",
    uri: "",
    ct: "application/json",
    chk: checksum,
    rp: subsetPath,
    m: JSON.stringify({ legacy_commit: legacyCommit, legacy_file: legacyPath }),
  };
  // 注意：不要用 INSERT ... RETURNING 取 source_id —— 命中 on conflict 时返回 0 行，
  // queryRows(--csv) 会把 psql 的 "INSERT 0 0" 命令标签解析成一行伪数据（曾导致 source_id = "INSERT 0 0"）。
  // 故统一走「先查 → 无则插入 → 再查」，source_id 始终来自 SELECT。
  const findSource = () =>
    queryRows(
      `select source_id from source_records where provider = :'provider' and checksum = :'chk'`,
      srcParams
    );

  let sourceReused = false;
  let sourceId;
  const before = await findSource();
  if (before.length) {
    sourceId = before[0].source_id;
    sourceReused = true;
  } else {
    await dbRun(
      `insert into source_records(provider,title,source_uri,content_type,checksum,raw_path,metadata_json)
       values (:'provider',:'title',nullif(:'uri',''),:'ct',:'chk',:'rp',:'m'::jsonb)
       on conflict (provider, checksum) do nothing`,
      srcParams
    );
    const after = await findSource();
    if (!after.length) {
      throw new Error("source_records 幂等失败：插入后仍查不到来源");
    }
    sourceId = after[0].source_id;
  }
  if (!sourceId || sourceId.startsWith("INSERT ")) {
    throw new Error("source_id 非法（疑似 psql 命令标签）: " + sourceId);
  }

  await dbRun(
    `update ingest_runs set status='completed', finished_at=now(),
       metadata_json = metadata_json || :'m'::jsonb where ingest_run_id = :'id'::uuid`,
    {
      id: ingestRunId,
      m: JSON.stringify({ source_record_id: sourceId, snapshot_dir: dir }),
    }
  );

  // 更新状态文件，带上 ingest_run_id / source_id。
  fs.writeFileSync(
    path.join(rawStorePath, "legacy", "jinze", ".last-run.json"),
    JSON.stringify({ run_id: runId, ingest_run_id: ingestRunId, source_id: sourceId, source_reused: sourceReused, snapshot_dir: dir }),
    "utf8"
  );

  console.log(
    JSON.stringify({
      run_id: runId,
      ingest_run_id: ingestRunId,
      source_id: sourceId,
      source_reused: sourceReused,
      snapshot_dir: dir,
      input_counts: manifest.input_counts,
      subset_checksum: checksum,
    })
  );
}

main().catch((e) => {
  console.error("INGEST FAILED:", e.message);
  process.exit(1);
});
