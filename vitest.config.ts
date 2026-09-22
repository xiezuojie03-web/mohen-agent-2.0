import { defineConfig } from "vitest/config";
import path from "node:path";

// 说明（TASK-0006 补充）：
// tests/data/** 是「对同一个 PostgreSQL 实例的真实集成测试」，不是纯内存单测。
// 多个测试文件并行执行时会共享同一个 evidence_gate_audit / claims 状态：
// 例如 knowledge-weave 的幂等测试会真实执行 weave 管线（重建 claim 与 G0–G6 审计行），
// 而 evidence-recovery 的幂等测试在同一时刻统计 evidence_gate_audit 总数。
// 二者并发 → 统计口径互相污染，出现与代码正确性无关的 flaky。
// 数据库集成测试必须串行文件执行，这是测试夹具层面的确定性修复，不改变任何断言。
export default defineConfig({
  resolve: {
    // TASK-0014：根级测试需要直接消费 apps/web 的 presentation 层（beats.ts 等），
    // 而这些模块通过 workspace 包 @mohen/experience-engine 取类型与运行时。
    // 该包只被 apps/web/node_modules 链接，根级 node_modules 无此链接 → 显式别名到源码。
    alias: {
      "@mohen/experience-engine": path.resolve(__dirname, "packages/experience-engine/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
