import { defineConfig } from "vitest/config";
import base from "./vitest.config";

// 旧 v1 套件专用配置（P0-6）：仅用于追溯/修复，不参与日常门禁。
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["tests/legacy/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
  },
});
