# MHKA 工程规范入口纠偏回执｜2026-11-05

## Owner 的确定裁决
墨痕已批准新架构并按新架构施工，不应等到 M8 才让 AI 工程入口指向新 MHKA。旧 C0—C4 仅用于继承研究和兼容旧代码，不得再作为新工程开发规范。此前将 AGENTS 旧权威路由保留到 M8 的决定不符合施工目的，现已明确废止。

## 本次定向落实
- 唯一工程设计入口：`AGENTS.md` → 六份 `governance/mhka/` MHKA 及授权专业合同。
- 目录/施工/工具接续：同步更正 `OWNERSHIP_MAP.md`、`PLAN.md`、`CODEX_HANDOFF_CURRENT.md`、`CURRENT.md` 和原 `progress.md`。
- 差异账：原 `target-diff.csv` 保留 M0 历史字段，只追加本次纠偏列，避免用“文件存在”冒充完整运行/语义准出。
- 静态检测：新增 `scripts/guards/check-authority-routing.mjs` 并接入 `.github/workflows/ci.yml`，防旧路由回流。

## 严格非目标
不重研六 MHKA、不改产品方向、不重排 M0—M8、不提前验收 M5/M6/M7，不授予任何正式 G0—G5、DB/Storage、真实 Provider、付费、外发、发布许可，不将此份文档或静态 CI 当成生产运行准出。正式旧代际运行退役仍在 M8，保全历史与合法旧代码。

提交与 Actions 结果以 GitHub 真实核证补充，不预记 PASS。
