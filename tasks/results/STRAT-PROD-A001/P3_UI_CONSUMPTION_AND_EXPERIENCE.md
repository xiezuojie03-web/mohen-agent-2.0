# P3｜真实前端消费与体验实现（MH-STRAT-PROD-A001 · 第三次重启）

> 唯一目标：**真实前端人文体验**。本轮核心变化：视觉舞台用**真实开源照片（V3 今日现场）**取代前两轮的「AI 体量剖面冒充视觉载体」，绿之丘建筑本体无合法照片则降级为 V4 解释标注（克制线框）。

## 1｜交付位置与入口

| 项 | 值 |
|---|---|
| 分支 | `a001/production` |
| 路由 | `/experience/lvzhiqiu` |
| 本地预览 | `cd apps/web; npx next dev -p 3000` → `http://localhost:3000/experience/lvzhiqiu` |
| 渲染方式 | Server Component `force-dynamic`，每次请求按当前有效 G5 读取 |
| 是否已部署 Production | 否（按 Gate C，等 Owner 验收后再决定） |

## 2｜本轮视觉主角（与前两轮的根本区别）

前两轮：无照片 → 用「体量剖面」AI 自绘顶替真实视觉载体（被 Owner 判定跑偏）。

本轮：**滨江公共空间真实开源照片 2 张**（V3 今日现场）+ 绿之丘建筑体量示意（V4 解释标注，标注非测绘）。

| 视觉层 | 内容 | 来源 | 前端呈现 |
|---|---|---|---|
| V3 今日现场 | 滨江绿化带夜景（慢跑/自行车道）、杨浦滨江公园雕塑 Time Shipper | Wikimedia Commons，CC BY-SA 4.0 | `<img>` 真实照片 + 署名 + license |
| V4 解释标注 | 绿之丘建筑体量（削 50% 体量/拆第 6 层/缓坡/270° 平台） | 材料原文驱动的克制线框 SVG | 标注「非测绘 · 无坐标 · 无比例」 |

## 3｜本次体验消费的 L5 数据（同源、可复核）

| 项 | 值 |
|---|---|
| run | `5176ade3-2892-4179-96d0-c27184b42ebd` |
| 世界投影 | `a001-layer3-world@5176ade3`（payload.visuals 含 2 张照片） |
| 视觉证据指针 | 2 条 `evidence_pointers`（visual_type=today_photo，双 consumer G5） |
| 读图落库 | `evidence.reading_units` 22 条（20 paragraph + 2 image）——前两轮为 0，本轮已修复 |
| 前端资格 | `currentPhotosConfirmed=2`（从 payload.visuals 计算，非硬编码）→ `current_photo` surface eligible |

## 4｜端到端验证（已实测）

| 项 | 结果 |
|---|---|
| 页面 HTTP | `200`（len 64742） |
| 照片区 | `stage-photos` 存在 |
| 署名/license | `Ding Kezhong`、`Oscar Oiwa`、`CC BY-SA 4.0` 均在页面 |
| 体量示意 | 保留（V4 解释标注，`stage-caption` 明确标注示意性） |
| TypeScript | `tsc --noEmit` 通过 |

## 5｜真实接线 vs 残存冻结分支

| 项 | 状态 |
|---|---|
| A001 数据来源 | 真实：`read_model` 中当前有效 G5（run `5176ade3`） |
| 视觉照片 | 真实：`world.visual_objects`（滨江 2 张）→ G5 投影 → `payload.visuals` → 前端 `<img>` |
| 是否复用金泽冻结叙事 | 无。A001 无冻结脚本；照片来自本 run 的 D00 摄取（Commons 下载 + 入库） |
| 体量示意定位 | 已从「视觉主角」降级为「V4 解释标注辅助」，不再冒充真实视觉载体 |

## 6｜已知边界（不掩盖）

1. 绿之丘建筑本体无合法照片（Commons 三次确认无专门条目），故建筑形态仍为 V4 示意；若 Owner 提供授权现状照片，可按 D00 重新摄取替换。
2. 「画面观察」本轮为「Commons 条目自述 + C04 技术登记」（voice_basis=reported），未图片出域到视觉模型做机器画面判读（属 Gate B，另行授权）。
3. 滨江照片描绘「紧邻公共步行空间」（任务书 §2 主对象范围），非绿之丘建筑内部。
