import { defineConfig } from "vitest/config";
import path from "node:path";

// 纯单元测试（无数据库、无 .env），用于 CI 快速门禁。
export default defineConfig({
  resolve: {
    alias: {
      "@mohen/data-access": path.resolve(__dirname, "packages/data-access/src/index.mjs"),
      "nodemailer": path.resolve(__dirname, "apps/web/node_modules/nodemailer/dist/cjs/nodemailer.js"),
      "next/headers": path.resolve(__dirname, "apps/web/node_modules/next/headers.js"),
      "next/server": path.resolve(__dirname, "apps/web/node_modules/next/server.js"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.mjs"],
    environment: "node",
  },
});
