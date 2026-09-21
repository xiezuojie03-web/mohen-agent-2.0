# CONTEXT

- Phase: 0 — Foundation & Data Factory
- Repository version: 0.1.0
- Current task: `tasks/TASK-0003-data-factory-jinze-staging.md` — **PASS**（第一条数据生产链跑通：Legacy→Raw Snapshot→Source Record→Candidate→Evidence Gate→Review Queue；金泽最小样本 15 entities，零 verified）
- Data factory: 三条管线已可用 —— `node pipelines/ingest/run.mjs` → `node pipelines/normalize/run.mjs` → `node pipelines/evidence/run.mjs`；数据库重建链 `scripts/db-apply.ps1` → `scripts/db-verify.ps1`（fresh DB 可复现）。
- Vertical slice candidate: 金泽（尚未锁定故事结论）
- Product rule: Experience Canvas 是视觉主体；Mohen Presence 是交互灵魂。
- Data rule: AI 不得绕过 Evidence Gate 写入 verified/published。
- Legacy rule: 老项目只读，只通过 manifest/staging 迁移。
- Visual rule: 首期禁止生成式历史图像。
- Next milestone: 数据生产链已闭合（Tier A=0 / B=38 / C=74，112 项待人工复核；G3 坐标来源、G4 关系证据是最大短板）；下一里程碑由总架构依据 `data/exports/jinze-data-factory-report.md` 决定：先补 Evidence，还是进入 Knowledge Weave。
- Local dev note: `scripts/*.ps1` 必须保存为 UTF-8 **带 BOM**（PowerShell 5.1 按 ANSI 解码无 BOM 脚本会导致中文注释解析失败、脚本静默不执行）；门禁触发器为 deferrable initially deferred，验证探针须 `set constraints all immediate` 才会触发。
- Open risk: 中国大陆网络环境，任何关键链路必须 local-first、工具可替换。
