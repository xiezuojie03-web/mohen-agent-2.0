# E1-6 EXP · 施工结果（2026-10-28）

## 做了什么（对齐 85 候选 API）

1. 建 `public.explore_sessions` 表（migration `202610281000_explore_sessions.sql`，零作品可探索）。
2. 实现 explore 候选 API：
   - `POST /api/explore/sessions`（API-058）、`GET /api/explore/sessions/:id`（API-016）
   - `GET /api/explore/entities/:id`（API-012）、`events/:id`（API-013）、`relations/:id`（API-014）
   - `GET /api/explore/search`（API-015，复用 retrieveMaterials）
   - `GET /api/explore/spatial`（API-018，复用 read-model-bridge）
3. 探索会话独立于作品（work_id 非必需），Origin 可选。

## 动作验收（152 动作账）

| action_id | 动作 | 状态 |
|---|---|---|
| FA-039-01/02 | 新建/恢复探索会话 | PASS |
| FA-041-01 | 提交自然语言历史问题 | 部分（search 有；会话 query 未接） |
| FA-043-01/02 | 点选人物地点关系节点/关系线 | PASS（entities/relations 详情） |
| FA-046-01 | 点击时间轴事件 | PASS（events 详情） |
| FA-047-01 | 按类别分类检索 | PASS（search） |
| FA-045-01 | 请求历史空间投影 | PASS（spatial） |
| FA-045-02 | 比较多时段空间 | 未做（spatial/compare） |
| FA-040 | 换视角追问 | 未做 |
| FA-044 | 缩放/图层 | 部分（客户端） |
| FA-048 | 来源资料卡 | 部分 |
| FA-049 | 深链返回 WATCH | 未做 |
| FA-050 | 墨痕隐藏/轻提示/对话 | 未做 |

## 诚实标注

- E1-6 核心（独立探索会话 + 检索 + 对象详情 + 空间投影）已落地；换视角/比较/深链/墨痕多形态待后续。
- 探索不依赖作品：无作品时仍可查合格知识库（诚实降级）。
