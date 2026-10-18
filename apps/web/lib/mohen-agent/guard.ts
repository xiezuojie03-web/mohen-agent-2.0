// apps/web/lib/mohen-agent/guard.ts
//
// 防滥用治理：公开访问后，给 Agent 追问 / 材料检索接口加「内存限流 + 结果缓存」，
// 作为第一道防线，避免爬虫/刷量把真实数据库查询打穿。
//
// 设计边界（serverless 实例级，非全局）：
//   - 内存 Map 是【进程/实例级】的，vercel 多实例各自独立，不是精确的全局限流；
//   - 对「防单个来源疯狂刷」已足够；真正的全局限流需 Redis/Upstash 或 Vercel 原生限流，
//     墨痕数据量小、流量小，暂不引入额外组件，后续需要再加。
//
// 纪律：零运行时依赖；缓存只缓存【成功、非降级】的结果，degraded 不缓存（库恢复后能自愈）。

const RATE_WINDOW_MS = 60_000; // 固定窗口 60 秒
const RATE_LIMIT = 30; // 每窗口每来源最多 30 次

const CACHE_TTL_MS = 5 * 60_000; // 结果缓存 5 分钟

const rateMap = new Map<string, { count: number; resetAt: number }>();
const cacheMap = new Map<string, { value: unknown; expiresAt: number }>();

let ops = 0;
function maybeCleanup() {
  if (++ops % 200 !== 0) return;
  const now = Date.now();
  for (const [k, v] of rateMap) if (v.resetAt <= now) rateMap.delete(k);
  for (const [k, v] of cacheMap) if (v.expiresAt <= now) cacheMap.delete(k);
}

/** 固定窗口限流；返回 true 表示超限（应回 429） */
export function isRateLimited(key: string): boolean {
  maybeCleanup();
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

/** 读缓存；未命中或已过期返回 undefined */
export function getCached(key: string): unknown | undefined {
  maybeCleanup();
  const entry = cacheMap.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cacheMap.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCache(key: string, value: unknown): void {
  cacheMap.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** 从 vercel 代理头取客户端来源（IP），取不到时回退到固定占位 */
export function getClientSource(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
