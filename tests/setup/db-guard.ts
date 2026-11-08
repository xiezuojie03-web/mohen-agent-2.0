// tests/setup/db-guard.ts
// 测试入口护栏（2026-10-02 · ESC-05 处置）
//
// 作用：**拒绝在真库上跑测试。**
//
// 为什么需要（实测代价）：
//   2026-10-02 一次全量 `pnpm test` 在 **7 秒内**向真库 `evidence_gate_audit` 写入
//   **9016 行 visual_asset 审计**（另 entity 23261 / evidence 12982…），覆盖了全部 1288 张图片，
//   使"1246 张夜跑图片 0 条门禁记录"由**当前事实**变成**历史事实**；
//   且套件不幂等，重复运行会让断言计数漂移（实测 15 → 30）。
//
// 为什么放在这里而不是只改脚本：
//   只提供 `pnpm test:isolated` 仍挡不住有人直接 `npx vitest`。
//   在**入口**处断言"当前连的不是真库"，才是结构性防线。
//
// 正确用法：`pnpm test`（= scripts/test-isolated.mjs，会自动建/灌 `<真库名>_test` 并在其上运行）。
import { readFileSync } from "node:fs";
import path from "node:path";

// 2026-11-08 修复：此处**不得** import data-access。
// 该包在导入时会把 `.env.local` / `.env` 的全部键写入 process.env，
// 而 setup 文件先于所有测试执行 → 整个全量套件都被本机开发环境变量污染，
// 使 tests/unit 里「缺省 env 必须失败关闭」的负例（如缺 session secret 必须抛错）在
// `pnpm test:unit`（无 setup）下通过、在 `pnpm test`（有 setup）下失败的语义分叉。
// 故此处只读取 DATABASE_URL 一个字面值，不做任何 env 注入。
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const name of [".env.local", ".env"]) {
    try {
      const text = readFileSync(path.resolve(process.cwd(), name), "utf8");
      const line = text.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
      if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^['"]|['"]$/g, "");
    } catch {
      // 文件不存在时继续尝试下一个
    }
  }
  throw new Error("DATABASE_URL 未设置：无法确认当前连接是否为测试库，拒绝执行。");
}

const db = resolveDatabaseUrl().split("/").pop()!.split("?")[0];

if (!db.endsWith("_test")) {
  throw new Error(
    [
      "",
      "════════════════════════════════════════════════════════════════",
      `  测试入口拒绝执行：当前数据库是「${db}」，它不是测试库。`,
      "",
      "  原因：本仓的 tests/data/** 是**真实集成测试**，会执行管线并写入数据库。",
      "        直连真库会让测试改动真实数据（实测曾 7 秒写入 9016 行门禁审计，",
      "        并因不幂等导致断言计数漂移）。",
      "",
      "  请改用：  pnpm test",
      "            ↑ 会自动建/灌「<真库名>_test」并在其上运行，真库永不被触碰。",
      "",
      "  若确需手工运行，请把 DATABASE_URL 指向一个以 _test 结尾的库。",
      "════════════════════════════════════════════════════════════════",
      "",
    ].join("\n")
  );
}
