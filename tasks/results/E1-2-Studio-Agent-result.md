# E1-2 Studio Agent · 施工结果（2026-10-28）

## 做了什么（对齐 85 候选 API）

1. 抽取研究核心链路到 `lib/mohen-agent/research.ts`（`runResearch`：理解→检索→裁决→风险守卫），供即时问答与受托研究任务共用。
2. 建 `public.research_tasks` + `public.research_events` 表（migration `202610280920_research_tasks.sql`）。
3. 实现 research-tasks 系列 6 个候选 API：
   - `POST /api/studio/research-tasks`（API-067，创建任务 + 受托研究，返回 task_id + decision）
   - `GET /api/studio/research-tasks/:id/status`（API-039）
   - `GET /api/studio/research-tasks/:id/events`（API-036）
   - `GET /api/studio/research-tasks/:id/stages/:stage`（API-038）
   - `POST /api/studio/research-tasks/:id/messages`（API-068）
   - `POST /api/studio/research-tasks/:id/resume`（API-069）
4. `/api/mohen/ask` 改为复用 `runResearch`（删重复逻辑，保留限流/缓存）。
5. Studio 对话升级为「研究任务」：每次委托创建可追踪任务，checkpoint 落库决策。

## 动作验收（152 动作账）

| action_id | 动作 | 状态 | 说明 |
|---|---|---|---|
| FA-013-01 | 发送自然语言研究委托 | PASS | 创建研究任务 + 受托研究 + 回显 |
| FA-015-01 | 点击建议追问发送意图 | PASS | 建议问题可触发研究 |
| FA-029-02 | 补充材料后续跑 | PASS | resume 恢复研究 |
| FA-013-02 | 继续追问修改研究目标 | 部分 | 后端 messages 已通；前端追问暂按新任务（未接续到 task_id） |
| FA-016-01 | 查看研究五节点进展 | 部分 | events/status API 已通；前端五节点仍静态 |
| FA-016-02 | 查看某节点中间结果 | 部分 | stages API 已通；前端未接 |
| FA-014-01/02 | 创建/恢复历史对话 | 未做 | conversations 表/API 未建 |
| FA-015-02 | 上传/关联合法材料附件 | 未做 | attachments 未建 |
| FA-029-01 | 显示研究补证与预算 HOLD | 未做 | 预算/补证面板未做 |

## 诚实标注

- E1-2 的「必要结果」核心（研究任务可追踪、checkpoints、事件/阶段回执）已落地；「会话/附件/预算 HOLD」三个细分能力未做，待后续补（不伪装完成）。
- 研究不产生事实：回答内容全部来自 read_model 检索到的已审核材料，经 G5 门禁与风险守卫。
