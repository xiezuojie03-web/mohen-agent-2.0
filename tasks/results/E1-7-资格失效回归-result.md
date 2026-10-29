# E1-7 资格/失效回归 · 施工结果（2026-10-28）

## 做了什么（对齐 85 候选 API）

1. `GET /api/governance/gates/requests`（API-020）—— 只读返回 Gate 审计（machine Gate 结果 + current_valid）。
2. `POST /api/governance/gates/decisions`（API-062）—— 诚实阻断人工签发（`reviewer_not_configured`），守住「Operator 不得签知识 G」边界（按 Owner 决策：知识签字靠机器 Gate 自动把关）。

## 资格/失效回归现状（诚实）

- **G5 读门**：已在检索层生效——`retrieveMaterials` 只读 `current_valid=true` 且 `consumer` 匹配的 G5 PASS 成果；失效（current_valid=false）即自动阻断，无需上层干预。
- **P08 阻断缓存/返证分面**：底层 `packages/data-access/invalidation.mjs`（computePreciseInvalidation）+ `control.gate_audits.current_valid` 已具备；运行期失效回归的 HTTP 暴露（API-048/053）未在本段新建，留待与 Admin 撤权一并落地。
- **独立 Reviewer 签发**：暂未配置身份（诚实阻断），正式发布前须配置。

## 动作验收（152 动作账）

| action_id | 动作 | 状态 |
|---|---|---|
| FA-062-01 | 独立 Reviewer 查看待审 Gate 请求 | PASS（只读） |
| FA-062-02 | 独立 Reviewer 提交资格裁决 | BLOCKED（reviewer 未配置，诚实阻断） |

## 诚实标注

- 未重签已撤资格、未清空无关分面（沿用门禁 current_valid 语义）；独立 Reviewer 身份是上线前待配置项。
