# CONTEXT

- Phase: 0 — Foundation & Data Factory
- Repository version: 0.1.0
- Current task: `tasks/TASK-0009-jinze-historical-spatial-source-acquisition-V1.1.md` — **PASS**。历史空间源采集与审计（非配准）：1879/1788/1934 三部方志**A_ACQUIRED**（含文件 sha256），1597/1669 **C_CONFIRMED_EXISTENCE**；入库 7 Source + 17 Evidence（15 地图候选 + 2 存在性）+ 119 G0–G6 审计行；`DIRECT_JINZE_HISTORICAL_MAP_FOUND=NO`、`JINZE_LOCAL_SPATIAL_EVIDENCE_FOUND=PARTIAL`、`HISTORICAL_MAP_GATE_REASSESSMENT_REQUIRED=NO`；**无 BREAKTHROUGH_CANDIDATE**（头号靶位 1879 p36「三排四号：枪开河、金泽、蔡浜」三标签未清晰可读 → 高潜线索）。不变式保持（孤儿审计 63、published 0）。详见 `tasks/results/TASK-0009-result.md`。
- Prior task: `tasks/TASK-0008-jinze-visual-evidence-sprint.md` — **PASS**（`VISUAL_EVIDENCE_READY = PARTIAL`）。有效遗产视觉资产 **0 → 8**，覆盖 8 个 P0/P1 对象，全部为当代实景；历史/档案影像 **0**（Commons 穷举为零、上图 14 条有图无题录），故时间维度不成立。详见 `tasks/results/TASK-0008-result.md`。
- Visual evidence rule: 身份可辩护 ≠ 时间可辩护。**当代遗产视觉可以放出；任何需要「过去的样子」的表达（今昔对照、历史场景重建）当前禁止**——`past_present_comparison` / `spatiotemporal_overlay` 均为 NO。解锁点在历史影像题录或含金泽的历史地图，不在补当代照片。
- Visual pipeline order: `retrieve-amap-jinze` →（任何重跑之后）→ `pipelines/visual/persist-spatial-review.mjs`。**TASK-0009 §2 已修复**：`retrieve-amap-jinze.mjs` 的 `on conflict` 现用 `case … jsonb_set(excluded.region_json,'{human_review}',evidence.region_json->'human_review',true) …` **保留** SHR 人工叠加层（同时仍刷新机器/provider 字段），故重跑后不再需要紧跟 `persist-spatial-review.mjs`（该脚本保留为幂等恢复工具）。自检 `node pipelines/visual/check-shr-overlay.mjs`（应 ok=true）仍在，缺失/叠加层被抹即报错。
- HR-5 scope: HR-5 的排除范围以**批次身份**（`source_records.provider='hushang-jingwei'`）为准，**不得**再用「凡托管在 Commons 的资产」——那样会把后续任务合法新增的遗产证据一并排除（曾使 effective 归零）。修复脚本 `pipelines/visual/repair-hr5-scope.mjs`。
- Data factory: 三条管线已可用 —— `node pipelines/ingest/run.mjs` → `node pipelines/normalize/run.mjs` → `node pipelines/evidence/run.mjs`；数据库重建链 `scripts/db-apply.ps1` → `scripts/db-verify.ps1`（fresh DB 可复现）。
- Vertical slice candidate: 金泽（尚未锁定故事结论）
- Product rule: Experience Canvas 是视觉主体；Mohen Presence 是交互灵魂。
- Data rule: AI 不得绕过 Evidence Gate 写入 verified/published。
- Legacy rule: 老项目只读，只通过 manifest/staging 迁移。
- Visual rule: 首期禁止生成式历史图像。
- Next milestone: 数据生产链已闭合（Tier A=0 / B=38 / C=74，112 项待人工复核；G3 坐标来源、G4 关系证据是最大短板）；下一里程碑由总架构依据 `data/exports/jinze-data-factory-report.md` 决定：先补 Evidence，还是进入 Knowledge Weave。
- Local dev note: `scripts/*.ps1` 必须保存为 UTF-8 **带 BOM**（PowerShell 5.1 按 ANSI 解码无 BOM 脚本会导致中文注释解析失败、脚本静默不执行）；门禁触发器为 deferrable initially deferred，验证探针须 `set constraints all immediate` 才会触发。
- Open risk: 中国大陆网络环境，任何关键链路必须 local-first、工具可替换。
