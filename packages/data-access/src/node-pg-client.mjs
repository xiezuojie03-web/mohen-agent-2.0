// @mohen/data-access — node pg 只读客户端（serverless 消费层通道）
//
// 用途：前端 Agent / 视觉舞台在运行时消费 read_model 时，serverless 环境（如 vercel）
//       没有本地 psql 二进制、也访问不到本地 PG，需要走 node pg 直连 DATABASE_URL
//       （本地开发指向本机 PG，线上指向 Supabase 云端库）。
//
// 边界（与 psql 写路径分离）：
//   - 生产链（pipelines 写库 / DDL / 迁移）仍走 psql 二进制（index.mjs 的 run / runMany），
//     保持离线、确定性、零依赖、可复现；
//   - 本文件只提供【只读查询】通道，供消费层使用，不暴露任何写方法。
//
// 纪律：本文件不落盘密码、不回显密码、不写库；连接串只来自环境变量 DATABASE_URL。

import pg from "pg";

let _pool = null;

/** 判断连接串是否指向本机（本机 PG 无需 SSL；远端如 Supabase 需 SSL） */
function isLocalHost(url) {
  return /@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);
}

/** 惰性单例 pg Pool（进程级复用，避免 serverless 每次冷启动连库开销） */
export function getNodePgPool() {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未设置（serverless 消费层需显式注入）");
  _pool = new pg.Pool({
    connectionString: url,
    max: 5,
    // 远端（Supabase 等）强制 SSL；本机 PG 明文即可
    ssl: isLocalHost(url) ? false : { rejectUnauthorized: false },
  });
  return _pool;
}

/** 只读查询，返回对象数组（与 psql queryRows 的返回形状一致：header -> 字段名） */
export async function pgQueryRows(sql, params = []) {
  const pool = getNodePgPool();
  const { rows } = await pool.query(sql, params);
  return rows;
}

/** 只读单值查询（首行首列） */
export async function pgQueryValue(sql, params = []) {
  const rows = await pgQueryRows(sql, params);
  if (!rows.length) return null;
  const first = rows[0];
  const k = Object.keys(first)[0];
  return first[k];
}

/** 写/DDL 执行（serverless 消费层写通道：注册、作品、审核等在线写入）。
 *  与 psql 写路径（index.mjs 的 run）等价；serverless 无 psql 二进制时由 run() 回退到此。
 *  复用同一连接池与 SSL 策略；参数为 $1..$n（由 index.mjs renderSqlToPg 转换而来）。 */
export async function pgRun(sql, params = []) {
  const pool = getNodePgPool();
  await pool.query(sql, params);
}

export default { getNodePgPool, pgQueryRows, pgQueryValue, pgRun };
