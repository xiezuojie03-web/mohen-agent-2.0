# E1-1 底座 · 施工结果（2026-10-28）

## 做了什么（对齐 85 候选 API，不另起命名）

1. 身份/会话：`GET /api/session/me`（API-032）、`GET /api/admin/session`（API-008）——把自建 auth 挂到候选路由。
2. 全站搜索：`GET /api/search?q=`（API-031）——复用 `retrieveMaterials`（知识）+ `listPublished`（作品）。
3. 通知：`GET /api/notifications`（API-022）+ `public.notifications` 表（migration `202610280910_notifications.sql`，诚实空态）。
4. 前端接线：全局导航的角色菜单 / 搜索 / 通知可操作（`GlobalNav.tsx`）。

## 涉及动作验收（152 动作账）

| action_id | 动作 | 状态 | 证据 |
|---|---|---|---|
| FA-001-01 | 打开任一产品工作面 | PASS | 五入口导航路由（ROUTER） |
| FA-001-02 | 打开角色菜单并切换工作身份 | PASS | 角色菜单显示「访客/运营负责人」+ 登录入口，读 /api/session/me |
| FA-001-03 | 全站搜索 | PASS | 搜索「桥」返回真实知识（含不同着录分歧，诚实呈现） |
| FA-001-04 | 查看通知 | PASS | 通知面板，诚实空态「暂无通知」 |
| FA-051-02 | 查看当前身份权限范围 | PASS | /api/admin/session：未登录 403、运营 200 |

## 诚实标注（未在本段硬凑）

- 通知当前**无产生源**（作品审核通过/评论等事件尚未实现），返回空列表，不编造。
- E1-1 段里的「项目 ACL / 工作区 / 对象版本 / feature flag / 事务审计」等偏底层能力，留待 **E1-4 Admin 做权限与版本冻结时一并落地**，本段只做身份/会话/搜索/通知这四个可观察底座。
- 截图证据：`E1-1-底座-evidence/`
