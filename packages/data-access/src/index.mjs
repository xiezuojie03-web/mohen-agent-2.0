// @mohen/data-access — 唯一 DB 访问层（OWNERSHIP_MAP：pipelines 通过它读写 PG，禁 UI 逻辑）。
//
// 本地优先设计：通过 psql 二进制驱动 PostgreSQL，零运行时 npm 依赖，可在离线环境复现。
// 安全：所有用户值经安全转义后渲染进临时 SQL 文件（UTF-8），以 psql -f 执行，
//       绝不把外部值拼进命令行参数（避免中文/JSON 触发多字节编码错误，也防注入）。
//
// 连接：本机安全环境 .env.local（gitignored）中的 DATABASE_URL；密码仅用于进程内 PGPASSWORD，
//       不回显、不落盘、不提交。临时 SQL 文件不含任何密码。

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..", ".."); // packages/data-access/src -> 仓库根

// psql 二进制路径：环境变量优先，否则默认本地 PG 18。
export const PSQL_PATH =
  process.env.MOHEN_PSQL_PATH ||
  "D:\\MoHen\\tools\\PostgreSQL\\18\\bin\\psql.exe";

// 加载本机安全环境 .env.local / .env（不回显、不提交）。已存在的 env 不覆盖。
function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(PROJECT_ROOT, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8").replace(/^﻿/, ""); // 容忍 UTF-8 BOM
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const k = m[1];
      const v = m[2].replace(/^["']|["']$/g, "");
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}
loadDotEnv();

// 解析 postgresql://user:pass@host:port/db
function parseDatabaseUrl(url) {
  const m = url.match(
    /^postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(\S+)$/
  );
  if (!m) throw new Error("无法解析 DATABASE_URL");
  return {
    user: m[1],
    password: m[2],
    host: m[3],
    port: m[4] || "5432",
    db: m[5],
  };
}

let _conn = null;
export function getConnection() {
  if (!_conn) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL 未设置（本机 .env.local）");
    _conn = parseDatabaseUrl(url);
  }
  return _conn;
}

// 将 :'name' 占位替换为安全转义后的 SQL 字符串字面量（自动双写单引号、转义反斜杠）。
// 仅匹配带引号的 :'name'，避免与 ::int / ::jsonb 等类型转换语法冲突。
function renderSql(sql, params) {
  if (!params) return sql;
  return sql.replace(/:'([^']+)'/g, (_m, name) => {
    const v = params[name];
    if (v === null || v === undefined) return "NULL";
    return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
  });
}

function psqlEnv() {
  const c = getConnection();
  return { ...process.env, PGPASSWORD: c.password, PGCLIENTENCODING: "UTF8" };
}

// 渲染 SQL → 临时文件（UTF-8 无 BOM）→ psql -f 执行。临时文件不含密码，执行后删除。
async function execSql(sql, params, extra) {
  const c = getConnection();
  const rendered = renderSql(sql, params);
  const tmp = path.join(os.tmpdir(), `mohen-${crypto.randomBytes(4).toString("hex")}.sql`);
  fs.writeFileSync(tmp, rendered, { encoding: "utf8" });
  try {
    const args = [
      "-h",
      c.host,
      "-p",
      c.port,
      "-U",
      c.user,
      "-d",
      c.db,
      "-v",
      "ON_ERROR_STOP=1",
    ];
    if (extra) args.push(...extra);
    args.push("-f", tmp);
    return await execFileP(PSQL_PATH, args, {
      env: psqlEnv(),
      maxBuffer: 128 * 1024 * 1024,
    });
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* 忽略清理失败 */
    }
  }
}

// 执行写/DDL（可含 begin/commit）。
export async function run(sql, params) {
  await execSql(sql, params);
  return true;
}

// 批量执行：把多条语句渲染后拼进同一个临时文件，一次 psql 调用完成。
// 用途：审计/队列等成百上千行写入时避免逐条起进程（逐条会因进程开销超时）。
export async function runMany(items) {
  if (!items.length) return 0;
  const parts = items.map((it) =>
    typeof it === "string" ? it : renderSql(it.sql, it.params)
  );
  await execSql(parts.join(";\n") + ";", null);
  return items.length;
}

// 执行查询并返回对象数组（psql --csv 解析）。
export async function queryRows(sql, params) {
  const { stdout } = await execSql(sql, params, [
    "--csv",
    "-P",
    "footer=off",
    "-P",
    "pager=off",
  ]);
  return parseCsv(stdout);
}

// 单值查询（首行首列）。
export async function queryValue(sql, params) {
  const rows = await queryRows(sql, params);
  if (!rows.length) return null;
  const first = rows[0];
  const k = Object.keys(first)[0];
  return first[k];
}

// 极简 RFC4180 CSV 解析（含引号转义、内嵌逗号/换行）。
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  let i = 0;
  const s = text;
  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "")
    rows.pop();
  if (!rows.length) return [];
  const header = rows[0];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const o = {};
    for (let c = 0; c < header.length; c++) o[header[c]] = rows[r][c];
    out.push(o);
  }
  return out;
}

export default {
  getConnection,
  run,
  runMany,
  queryRows,
  queryValue,
  PSQL_PATH,
  PROJECT_ROOT,
};
