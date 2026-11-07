// M5 批次 H 的独立 vitest 配置：真实 lib 代码路径 + 本地隔离 PG + 真实 DeepSeek。
// 与 work-binding-db 同一模式；本配置只跑批次 H 的集成文件。
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@mohen/data-access": path.resolve(rootDir, "packages/data-access/src/index.mjs"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["tests/integration/m5-batch-h.integration.ts"],
    testTimeout: 300000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
