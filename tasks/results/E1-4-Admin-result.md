# E1-4 Admin 作品治理 · 施工结果（2026-10-28）

## 做了什么（对齐 85 候选 API）

1. 建 `public.assets` 图片资产台账（migration `202610280940_assets.sql`），预登记 6 张已核验版权图为 verified。
2. 新增 `lib/admin-assets.ts`；`publication.ts` 加 rejectWork/unpublishWork。
3. 实现 Admin 候选 API：
   - `GET /api/admin/submissions`（API-009）、`GET /api/admin/submissions/:id`（API-010）
   - `POST /api/admin/submissions/:id/decision`（API-055，approve/reject）
   - `GET/POST /api/admin/publications`（API-X04/050）、`POST /api/admin/publications/:id/unpublish`（API-051）
   - `GET /api/admin/assets`（API-001）、`POST /api/admin/assets/candidates`（API-049）
   - `GET /api/admin/gates/audits`（API-002）、`GET /api/admin/jobs`（API-003）、`GET /api/admin/metrics`（API-004）、`GET /api/admin/navigation`（API-007）、`GET /api/admin/users`（API-011）
4. 所有 Admin API 均做 operator 身份校验（未登录 403）。

## 动作验收（152 动作账）

| action_id | 动作 | 状态 |
|---|---|---|
| FA-051-01/02 | 运营导航/身份权限 | PASS |
| FA-052-01 | 读取 KPI/内容健康指标 | PASS（真实计数） |
| FA-053-01/02 | 审核队列/审阅详情 | PASS |
| FA-054-01 | 审核通过/拒绝 | PASS |
| FA-055-01/03 | 发布/下架 | PASS |
| FA-057-01 | 知识资产检索及资格 | 部分（assets 台账有；资格审计未做） |
| FA-058-01 | 登记候选资产 | PASS |
| FA-054-02 | 批量处理 | 未做 |
| FA-055-02 | 定时发布 | 未做 |
| FA-056 | 观看收藏评论数据 | 未做 |
| FA-058-02/059 | 撤回/权限撤权 | 未做 |
| FA-060 | 用户管理 | 部分（空态） |
| FA-061 | 异常/任务/设置 | 部分（jobs 有；settings 未做） |
| FA-062 | 独立 Gate 审核者工作流 | 部分（audits 只读有；签发 decisions 未做） |

## 诚实标注

- E1-4 核心（投稿→审核→发布/下架 + 图片资产台账）已落地；批量/定时/撤权/独立 Gate 签发等细分未做，待后续。
- 图片资产台账已建（你决策的"先建"），6 张真实图已登记权利；后续新图一律先登记再使用。
