# verification/

开发总工程师的**临时验证产物**统一收纳目录（UI 验证截图、渲染对比图等）。

规则（2026-10-01 项目拥有者决断）：

- 此类产物**一律不放项目根目录**，统一放本目录（可按验证对象建子目录，如 `ui-verification/`）；
- 本目录内容默认**不入库**（见 `.gitignore`），仅本 README 作为约定索引入库；
- 用完即清，不作为长期资产；需要长期保留的证据应放入 `tasks/results/` 等正式目录。
- 正式长期验收 / Gate 复审记录统一放 `tasks/results/`（命名 `*-result.md`），
  例如 `HUMAN-EXPERIENCE-GATE-REVIEW-01-result.md`；本目录不重复存长期记录。
