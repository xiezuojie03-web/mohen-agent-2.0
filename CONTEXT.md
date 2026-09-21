# CONTEXT

- Phase: 0 — Foundation & Data Factory
- Repository version: 0.1.0
- Current task: `tasks/TASK-0002-establish-local-postgresql.md` — **PASS**（本地 PostgreSQL 真源已建立，Evidence Gate 正反验证通过；待总架构签发 TASK-0003）
- Vertical slice candidate: 金泽（尚未锁定故事结论）
- Product rule: Experience Canvas 是视觉主体；Mohen Presence 是交互灵魂。
- Data rule: AI 不得绕过 Evidence Gate 写入 verified/published。
- Legacy rule: 老项目只读，只通过 manifest/staging 迁移。
- Visual rule: 首期禁止生成式历史图像。
- Next milestone: 本地 PostgreSQL 真源已建立（mohen_dev / mohen_test + mohen_app 最小权限；Evidence Gate 正反验证通过，migration 可重建 ≥2 次）；下一里程碑由总架构签发 TASK-0003（Data Factory Minimum Pipeline + 金泽 Legacy 迁移 Staging）。
- Open risk: 中国大陆网络环境，任何关键链路必须 local-first、工具可替换。
