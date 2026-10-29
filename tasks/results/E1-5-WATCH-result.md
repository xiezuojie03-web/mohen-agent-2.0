# E1-5 WATCH · 施工结果（2026-10-28）

## 做了什么（对齐 85 候选 API）

1. 建 `public.watch_sessions` 表（migration `202610280950_watch_sessions.sql`）。
2. 实现 public/works 系列候选 API：
   - `GET /api/public/works`（API-025）、`GET /api/public/works/:id`（API-026）
   - `GET /api/public/works/:id/program`（API-028）、`:id/eligibility`（API-027）、`:id/related`（API-029）、`:id/share`（API-030）
   - `GET /api/public/evidence/:id`（API-023）
   - `POST/GET /api/watch/sessions`（API-081，观看进度）
3. WATCH 页消费已发布作品 + 章节（此前已接线，复用 listPublished 内容）。

## 动作验收（152 动作账）

| action_id | 动作 | 状态 |
|---|---|---|
| FA-030-01/02 | 面包屑/公开状态/撤权终止 | PASS（eligibility） |
| FA-031-01 | 载入作品首帧/节目单 | 部分（program 有；封面媒体未做） |
| FA-032-01/02 | 标题/简介/元数据 | PASS |
| FA-033-01/02 | 观看进度/继续 | PASS（watch/sessions） |
| FA-034-02 | 分享 | PASS（share_url） |
| FA-036-02 | 查看资料来源 | PASS（evidence/:id） |
| FA-031-02 | 播放节目单 | 部分（无真实媒体播放） |
| FA-034-01 | 阅读/全屏 | 部分（客户端态） |
| FA-035 | 章节卡/进度轴 | 部分（beats 有；时码轴未做） |
| FA-036-01 | 相关探索 | 部分（related 空） |
| FA-037 | 探索深链 | 未做（留 E1-6） |
| FA-038 | 发布后回炉 | 未做 |

## 诚实标注

- E1-5 核心（目录→详情→节目单→进度→分享→证据）已落地；真实媒体播放/字幕/时码轴/深链/回炉待后续。
- WATCH 不依赖 EXP（独立作品消费），无作品时诚实空态。
