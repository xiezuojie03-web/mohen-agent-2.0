// scripts/db-dedup-gate-audit.mjs — 让 evidence_gate_audit 回到**快照语义**（每对象×门恒 1 行）。
//
// 为什么需要它（ESC-05 归因「测试自增型」）：
//   测试断言 `expect(byResult.fail).toBe(15)` 实测 30，恰为 2 倍 —— 根因是
//   `evidence_gate_audit` 里同一 (object_type, object_id, gate_code) 被重复写入多行，
//   而快照语义要求每对象×每门只保留一条结论。历史上测试直连真库反复跑，把污染写进了真库
//   （E 组：「48108 行中约 38k 为测试所写，已止血、未清理」）。
//
// 安全第一：
//   · 默认 **--dry**（只统计，不动数据）；必须显式 `--apply` 才执行；
//   · `--apply` 前**先 pg_dump 备份**到 --backup（默认 D:\MoHen\backups\），失败即中止；
//   · 只删**重复行**（同组保留 ctid 最小者），不按来源猜测、不做条件性清洗。
//
// 用法：
//   node scripts/db-dedup-gate-audit.mjs            # 试算
//   node scripts/db-dedup-gate-audit.mjs --apply    # 备份后执行
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { run, queryRows, queryValue, getConnection, PSQL_PATH } from "../packages/data-access/src/index.mjs";

const APPLY = process.argv.includes("--apply");
const BACKUP_DIR = (() => { const i = process.argv.indexOf("--backup"); return i >= 0 ? process.argv[i + 1] : "D:\\MoHen\\backups\\RECON-20261003"; })();

const total = Number(await queryValue(`select count(*)::int from evidence_gate_audit`));
const distinct = Number(
  await queryValue(`select count(*)::int from (select distinct object_type, object_id, gate_code from evidence_gate_audit) t`)
);
const dupRows = Number(
  await queryValue(
    `select count(*)::int from (
       select ctid, row_number() over (partition by object_type, object_id, gate_code order by ctid) rn
         from evidence_gate_audit) t where rn > 1`
  )
);
console.log(`GATE_AUDIT total=${total} distinct_groups=${distinct} duplicate_rows=${dupRows} would_delete=${dupRows}`);

if (!APPLY) {
  console.log("DRY 未执行删除。确认后加 --apply（会先 pg_dump 备份）。");
  process.exit(0);
}
if (dupRows === 0) { console.log("无重复行，无需处理。"); process.exit(0); }

// ── 备份 ──────────────────────────────────────────────────────────────────────
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const conn = getConnection();
const dumpFile = path.join(BACKUP_DIR, `mohen_dev-pre-gate-dedup-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.sql`);
const pgDump = PSQL_PATH.replace(/psql\.exe$/, "pg_dump.exe");
execFileSync(
  pgDump,
  ["-h", conn.host, "-p", conn.port, "-U", conn.user, "--no-owner", "--no-privileges", "--format=plain", "--file", dumpFile, conn.db],
  { env: { ...process.env, PGPASSWORD: conn.password, PGCLIENTENCODING: "UTF8" } }
);
console.log(`BACKUP ${dumpFile} (${(fs.statSync(dumpFile).size / 1024 / 1024).toFixed(1)} MB)`);

// ── 去重（同组保留 ctid 最小者）────────────────────────────────────────────────
await run(
  `delete from evidence_gate_audit a
     using evidence_gate_audit b
    where a.ctid > b.ctid
      and a.object_type is not distinct from b.object_type
      and a.object_id   is not distinct from b.object_id
      and a.gate_code   is not distinct from b.gate_code`
);
const after = Number(await queryValue(`select count(*)::int from evidence_gate_audit`));
const stillDup = Number(
  await queryValue(
    `select count(*)::int from (
       select row_number() over (partition by object_type, object_id, gate_code order by ctid) rn
         from evidence_gate_audit) t where rn > 1`
  )
);
console.log(`DEDUP done ${total} → ${after}（删除 ${total - after} 行）；剩余重复 ${stillDup}`);
if (stillDup !== 0) console.error("WARN 仍存在重复组，请人工检视（可能有 NULL 组合语义差异）");
