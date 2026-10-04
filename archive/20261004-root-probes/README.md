# ARCHIVE / TRACE —— 根目录一次性探针脚本归档（2026-10-04）

> **历史快照，不代表当前状态。** 本目录是 `R14`（被取代 / 重复 / 不再必要的文件一律归档，不删除）下的归档件。
> **归档事由**：项目拥有者 2026-10-04 裁定治理「数据生产 Skill 能力」，根治「每次数据生产重写脚本、攒下一大堆重复脚本」。根目录 14 个 `_*.mjs` 一次性探针即现存最明显的重复脚本样本（`check-structure-map` 长期报 `UNDECLARED_ROOT_ENTRIES`）。
> **依赖核查（2026-10-04）**：全仓检索确认——**无任何活跃代码 import 这 14 个脚本**；它们的功能已被 `tools/production/probe-*.mjs`、`scripts/gen-schema-diff.mjs`、`scripts/gen-l0-schema-map.mjs` 及 `pipelines/` 正规执行体覆盖。仅历史运行日志提及脚本名。

## 归档清单

| # | 原路径 | 归档路径 | 归档理由 | 取代者 / 当前权威 | 被引用于 |
|---|--------|----------|----------|-------------------|----------|
| 1 | `_probe.mjs` | `archive/20261004-root-probes/_probe.mjs` | 一次性库探针（information_schema 查询） | `tools/production/probe-connection.mjs`、`probe-schema.mjs` | 仅历史日志；无活跃 import |
| 2 | `_probe2.mjs` | 同目录 | 同上 | 同上 | 同上 |
| 3 | `_probe3.mjs` | 同目录 | 同上（列约束 / 非空列） | 同上 | 同上 |
| 4 | `_probe4.mjs` | 同目录 | 同上 | 同上 | 同上 |
| 5 | `_probe5.mjs` | 同目录 | 同上（CHECK 约束） | 同上 | 同上 |
| 6 | `_schema.mjs` | 同目录 | 一次性 schema 导出（写 `_schema.json`） | `scripts/gen-schema-diff.mjs`、`gen-l0-schema-map.mjs` | 同上 |
| 7 | `_full.mjs` | 同目录 | 一次性全库结构转储（表 / 列 / 外键） | `scripts/gen-schema-diff.mjs` | 同上 |
| 8 | `_v2.mjs` | 同目录 | 探针增量迭代副本（v2） | `tools/production/probe-*.mjs` | 同上 |
| 9 | `_v3.mjs` | 同目录 | 探针增量迭代副本（v3） | 同上 | 同上 |
| 10 | `_v4.mjs` | 同目录 | 探针增量迭代副本（v4） | 同上 | 同上 |
| 11 | `_verify.mjs` | 同目录 | 一次性校验脚本 | `pipelines/evidence/` 门禁与各 `check-*.mjs` 守卫 | 同上 |
| 12 | `_rebuild.mjs` | 同目录 | 一次性重建脚本 | `pipelines/` 正规执行体 | 同上 |
| 13 | `_gen_list.mjs` | 同目录 | 一次性列表生成 | `scripts/gen-*.mjs` | 同上 |
| 14 | `_unlock.mjs` | 同目录 | 手工「解锁」生产注册表（打印 `REGISTRY_UNLOCKED`） | 注册表门禁机制（`scripts/check-production-registry.mjs` ＋ R15 证据门禁），不再需要手工解锁 | 同上 |

> 归档方式：文件移动（保留内容，未改写正文，符合规则 5）；未使用 `git rm`（规则 1）。
> **后续**：新写数据生产脚本前，必须先查生产注册表与 `skills/<name>/SKILL.md` 的实体化档案，复用既有 Entry（C2 §2.1 / C0 §11 R26）。
