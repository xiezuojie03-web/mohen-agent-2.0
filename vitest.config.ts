import { defineConfig } from "vitest/config";
import path from "node:path";

// 说明（TASK-0006 补充 · 2026-10-02 更新）：
// tests/data/** 是「对同一个 PostgreSQL 实例的真实集成测试」，不是纯内存单测。
//
// （1）并发污染（TASK-0006）：多个测试文件并行时会共享同一个 evidence_gate_audit / claims 状态，
//     统计口径互相污染 → 故 `fileParallelism: false`（串行文件执行）。
//
// （2）**写库隔离（2026-10-02 · ESC-05 处置）**：串行只解决并发，不解决**累积**。
//     实测一次全量测试在 **7 秒内**向真库写入 **9016 行** visual_asset 门禁审计
//     （另 entity 23261 / evidence 12982…），覆盖全部 1288 张图片，使"1246 张夜跑图片
//     0 条门禁记录"由当前事实变成历史事实；又因套件不幂等，重复运行让断言计数漂移（15 → 30）。
//     故：**测试一律连 `<真库名>_test`** —— 由 `pnpm test`（`scripts/test-isolated.mjs`）
//     自动建库并灌入真库快照，跑完对比证明真库一行未动；
//     `tests/setup/db-guard.ts` 在**入口**拒绝在非 `_test` 库上执行（挡住直接 `npx vitest`）。
export default defineConfig({
  resolve: {
    // TASK-0014：根级测试需要直接消费 apps/web 的 presentation 层（beats.ts 等），
    // 而这些模块通过 workspace 包 @mohen/experience-engine 取类型与运行时。
    // 该包只被 apps/web/node_modules 链接，根级 node_modules 无此链接 → 显式别名到源码。
    alias: {
      "@mohen/experience-engine": path.resolve(__dirname, "packages/experience-engine/src/index.ts"),
      // 根级测试直接引用 apps/web/lib 时，需要把 workspace 包指到源码（根 node_modules 无该链接）。
      "@mohen/data-access": path.resolve(__dirname, "packages/data-access/src/index.mjs"),
      // M5 批次 K 修复：next 只装在 apps/web/node_modules，根级解析不到；
      // 与 vitest.unit.config.ts 使用同一组别名，避免同一测试在两条门禁下语义分叉。
      "next/headers": path.resolve(__dirname, "apps/web/node_modules/next/headers.js"),
      "next/server": path.resolve(__dirname, "apps/web/node_modules/next/server.js"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // P0-6（2026-10-29）：旧 v1 套件仍在查 42 表迁移中已 DROP 的表（entities/relations/evidence/review_queue…），
    // 已移入 tests/legacy/ 保留追溯，不参与日常门禁；修复或重写后再迁回。
    exclude: ["tests/legacy/**", "**/node_modules/**"],
    fileParallelism: false,
    setupFiles: ["tests/setup/db-guard.ts"],
  },
});
