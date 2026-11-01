# Studio持久化数据兼容 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. 原位实施，纯技术缺陷修复，不扩展产品功能或EXP。

**Goal:** 让已有研究导演、分镜、面板、修订编辑与作品审核在实际node-pg环境正常读取JSONB，而不是只在psql字符串夹具下可用。

**Architecture:** 复用原业务服务及数据库字段，在数据库JSON字段消费处统一接受原生对象/数组或psql编码字符串；不重复序列化对象，不改变史学资格、权利和版本规则。无效编码仍失败关闭。

**Tech Stack:** 现有TypeScript、node-pg/psql双后端、Vitest、PostgreSQL17.11隔离测试。

**Spec:** DESIGN.md当前Studio优先范围与STUDIO_BASELINE.md；前批线上main@1fa6d9f、dpl_9ZAT9qfnSADYFBZ8BHLX9WFeTvgS已验证数据库查询200并读取4部公开作品。

## Global Constraints

- 不新增Schema、专业Gate、模型供应商或产品页面；不以公开L5替代合法内部研究权限。
- 兼容已有两种数据库驱动返回形状；JSON解析不制造或扩写内容。
- 原有无权限、无出处、未审核和权利阻断不放宽。
- 测试中的模型响应仅为外部边界夹具，不算真实编导或研究完成。

## Review Focus

1. 对象被String()转成[object Object]导致正常持久化内容无法恢复。
2. 数组转字符串丢失分镜/出处或变成空资产。
3. 新适配只修采纳方案，却漏掉保存、局部改稿、重排或作品审核消费者。
4. 非法JSON被静默转换成成功空结果；不得用兜底掩盖损坏。
5. 兼容修改不得改变已保存beat的未编辑字段及引用。

### Task 1: 真实消费函数的JSONB兼容

**Files:** Create `apps/web/lib/db-json.ts`, `tests/unit/studio-jsonb.test.ts`；Modify `apps/web/lib/studio-director.ts`, `apps/web/lib/publication.ts`。

**Interfaces:** `readJsonColumn<T>(value: unknown, fallback: T): T`：null/undefined使用明示fallback，字符串解析JSON，原生JSON值直接消费；非法字符串抛错。服务接口与返回键不变。

- [x] 为selectDirectorPlan、getWorkPanels、commitWorkRevision、reviseBeat、reorderBeats和checkPublishEligibility分别用原生JSONB和等价psql字符串调用真实服务；只模拟DB与LLM外部边界。
- [x] 运行`pnpm exec vitest run --config vitest.unit.config.ts tests/unit/studio-jsonb.test.ts`观察原生JSON分支失败，字符串分支保留基线。
- [x] 使用小型共用解析函数替代这些消费处的JSON.parse/String组合；不修改提示词、知识资格或版本策略。
- [ ] 再运行新用例、现有单元、类型与相关数据库/浏览器回归；断言结果内容、未编辑beat及provenanceRefs保留，不能仅测函数存在。
- [ ] 提交`fix(studio): consume persisted JSONB across database drivers`，记录RED/GREEN和仍待完成的材料接线/版本恢复。

### Task 2: 运行回归与连续施工

**Files:** 更新CURRENT与本轮进展；证据放`/workspace/product-uplift-evidence/`。

- [ ] 独立核对差异、构建、远端main及部署；常规技术修复通过后发布，不把本任务当产品功能调整。
- [ ] 继续按STUDIO_BASELINE顺序贯通研究材料→导演/分镜和保存恢复；实际模型、资料和作者使用效果需单独验证。

## 本轮证据

实际RED为9失败/3通过；其中两个字符串用例受失败后残留mock队列污染，已将beforeEach改为resetAllMocks隔离。实现后双编码12项通过，另补损坏编码/缺权利拒绝3项，共15项通过。CI单元68通过/4外部条件跳过；Web tsc通过；完整实网单元Commons检索失败，未宣称外部研究已通。独立只读审查未发现重要问题。新代码未部署；下一步仍是研究材料接线和版本恢复。
