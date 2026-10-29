# E1-3 创作编导 · 施工结果（2026-10-28）

## 做了什么（对齐 85 候选 API）

1. 建 `public.director_plans` 表（migration `202610280930_director_plans.sql`）：持久化 A/B 方案 + 选定 + 节拍。
2. 新增 `lib/studio-director.ts`：复用 `studio-creation` 的 LLM 编导（generateDirectorPlans/generateBeats），加持久化。
3. 实现 director-plans 系列 3 个候选 API：
   - `POST /api/studio/director-plans`（API-065，生成 A/B 方案，返回 plan_id）
   - `GET /api/studio/director-plans/:id`（API-034，方案详情）
   - `POST /api/studio/director-plans/:id/select`（API-066，采纳 + 生成节拍）
4. Studio 前端对齐：生成方案/采纳方案改调 director-plans 候选路由（带 plan_id 持久化）。

## 动作验收（152 动作账）

| action_id | 动作 | 状态 |
|---|---|---|
| FA-017-01 | 请求 A/B 导演方案 | PASS |
| FA-017-02 | 展开方案详情 | PASS |
| FA-018-01 | 采纳导演方案 | PASS |
| FA-018-02 | 切换比较不覆盖已选 | 部分（可切换；选定即覆盖） |
| FA-025-01/02 | 分镜章节定位/顺序管理 | 部分（节拍生成；时码/顺序 API 未做） |
| FA-026-01/02 | 旁白编辑/AI优化 | 部分（旁白生成；编辑/建议 API 未做） |
| FA-022-01/02 | 提交审核 | 部分（后端已通；待对齐 submissions 候选路由，见 E1-4） |
| FA-020 | 版本历史/diff | 部分（work_revisions 有；diff 未做） |
| FA-021 | 局部改稿/再生成 | 未做 |
| FA-023 | 实时预览 | 未做 |
| FA-027 | 画面候选素材 | 未做 |
| FA-028 | 自动保存/回退 | 未做 |

## 诚实标注

- E1-3 核心（H2 导演方案 → 选定 → H3 节拍）已落地并持久化；改稿/预览/媒体候选/自动保存等细分待后续补。
- 生成内容仍过"只用真实材料、不编造"护栏（LLM 铁律）。
