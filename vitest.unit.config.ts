import { defineConfig } from "vitest/config";

// 纯单元测试（无数据库、无 .env），用于 CI 快速门禁。
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
