# OWNERSHIP MAP

| 路径 | 唯一职责 | 禁止 |
|---|---|---|
| `apps/web` | Web Shell + Renderer | 历史事实判定、直接 SQL |
| `packages/domain` | 稳定领域类型 | UI、网络请求 |
| `packages/agent-runtime` | Goal/Plan/Action/Observe/Replan | DOM/React 控制 |
| `packages/experience-engine` | ExperienceState/CompositionState/Action reducer | 数据采集 |
| `packages/data-access` | 唯一 DB 访问层 | UI 逻辑 |
| `pipelines/ingest` | Raw + Source 登记 | 写 verified knowledge |
| `pipelines/evidence` | Evidence Gate | 自由叙事 |
| `pipelines/weave` | verified → relations/story/discovery candidate | 绕过 Gate |
| `skills` | AI 可执行 SOP | 保存项目历史 |
| `specs` | 当前稳定契约 | 过程记录 |
| `decisions` | 重大架构变更理由 | 操作 SOP |
| `tasks` | 当前可验收工作单 | 长期知识 |
| `tests` | 机器验收 | 产品规则解释 |
| `legacy` | 迁移 manifest | 复制老工程 |

新建文件前必须搜索是否已有同职责 owner。禁止平行真源。
