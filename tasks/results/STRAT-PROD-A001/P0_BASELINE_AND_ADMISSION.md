# P0｜基线冻结与承接预检（MH-STRAT-PROD-A001 · 第三次重启）

> 执行者：CodeBuddy（工程执行方）　｜　指挥与验收：项目负责人（Owner）
> 本文件在 2026-10-18 第三次重启时重写，覆盖前两轮同名文件；前两轮结论保留在 §6。
> 任务书：《01_A001_完整生产执行任务书_V1.0.md》（唯一工程执行任务书）

## 1｜实际基线（第三次重启时点）

| 项 | 实际值 |
|---|---|
| 工作区 | `D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0` |
| 分支 | `a001/production`（隔离分支，未触碰 `main` / `track/experience-exp-0002` / `hushang-jingwei`） |
| 仓库基线 | 前两轮 A001 交付 `122557e` + 本次先固化 A002 标准断链修复（新 commit） |
| Node / 包管理 | Node 22 / pnpm workspace（`@mohen/web`、`@mohen/agent-runtime`、`@mohen/experience-engine`、`@mohen/data-access`） |
| 数据库 | 本地 PostgreSQL 18，库 `mohen_dev`（`.env.local` 的 `DATABASE_URL`，端口 5432） |
| LLM | DeepSeek（`deepseek-chat`），key 存于 `.env.local`，未写入任何文档/日志/截图 |
| 前端 | Next.js 15.5 App Router，本地 `next dev -p 3000` |

## 2｜第三次重启的前置诊断（与前两轮跑偏的根因对齐）

前两轮跑偏根因是 A001 报告诊断的**两条断链**。第三次重启前逐项核实：

| 断链 | 前两轮状态 | 第三次重启状态 |
|---|---|---|
| ① 数据生产标准断链（standards/d00–d05 死索引） | 未落地 | **已修复**（A002：standards 23 篇 + method-binding + L5_L8 + contracts + 覆盖台账全部落地，已 commit） |
| ② 前端视觉消费断链（L5 六类无视觉分面；`visual_objects` 无消费资格） | 未修复 | **本轮补齐**（已改 DATA_CONTRACT §1 + C4 §3.1 + L5_L8 §2，明确 visual_objects→G3 用途→L5 投影→visual_stage 分面） |
| D01 读图未落地（`evidence.reading_units=0`） | 未落地（实测 0） | **本轮修复**（D02 补写 reading_units，文本/图像单元均落库） |
| 前端 `currentPhotosConfirmed` 硬编码 0 | 硬编码 | **本轮修复**（改从 `payload.visuals` 读取真实照片数） |

## 3｜准入决策

**`ACCEPT_MINIMAL`（收窄后接受）**，条件如下：

1. **素材**：文本用 3 份政府门户公开网页（与前两轮同源，已入库可复用）；视觉用 Wikimedia Commons「杨浦滨江公共空间」开源影像 2 张（CC BY-SA 4.0，见 §4）。
2. **最小可证闭环**：一个可证变化（1995 烟草机修仓库 → 约 2010 年代改造为绿之丘公共综合体）+ 返证入口（17 条原句带出处/片段序号/URL）+ 一个可判负例（1920 怡和冷库 ≠ 1995 烟草机修仓库同一栋）。
3. **视觉主角**：滨江公共空间真实照片（V3 今日现场）；绿之丘建筑本体无合法照片，体量形态按 V4 解释标注（克制线框/热点）呈现并标注示意——**不再用 AI 体量剖面冒充真实视觉载体**。
4. **不扩容**：不新增主题、不碰 Production（hushang-jingwei）、不写第一代 37 表、不改 C2/C3 宪法。
5. **Gate A 复用**：真实写库 + 付费 LLM（D02–D04 DeepSeek）+ 本地预览优先，仍在本任务书同一有界授权内。

## 4｜素材风险与视觉方案（第三次的关键变化）

### 4.1 Commons 复查结论（2026-10-18 实测）

| 对象 | Commons 状态 |
|---|---|
| 绿之丘建筑（杨树浦路 1500 号烟草机修仓库改造） | **无专门条目**（三次确认：前两轮 + 本轮实测） |
| 杨浦滨江公共空间 | **有**：`File:DSC00228滨江绿化带夜景.jpg`（滨江绿化带夜景，Ding Kezhong，CC BY-SA 4.0）、`File:Time Shipper.jpg`（杨浦滨江公园雕塑，Oscar Oiwa，CC BY-SA 4.0） |

### 4.2 视觉方案（诚实降级，不冒充）

| 视觉层 | 内容 | 本轮承载 |
|---|---|---|
| V3 今日现场 | 滨江公共空间开源照片 2 张 | 视觉舞台真实照片 + 来源/license 标注 |
| V4 解释标注 | 绿之丘建筑体量形态（削体量/缓坡/平台） | 克制线框/热点 SVG，标注「非测绘图·无坐标·无比例」 |
| V1/V2 历史原件/影像 | 无 | `historicalVisualAssets=0`，`before_after` surface 恒不可用（诚实） |

### 4.3 待 Owner 决策的残留缺口（不阻塞本轮，如实记录）

- **绿之丘建筑本体照片**：Commons 无；若 Owner 后续提供授权现状照片，可按 D00 重新摄取进链，替换 V4 解释标注为 V3 实景。
- **真多模态读图（画面观察）**：本轮「读图」产出的是「Commons 条目自述画面 + C04 技术登记」（voice_basis=reported），**未图片出域到视觉模型做机器画面判读**。图片出域属 Gate B + 新增视觉模型成本，本轮不擅自做，留给 Owner 后续单独授权。

## 5｜回滚方案

1. 数据：P2 前 `pg_dump` 全库冷备（P1 记录路径与 sha256）。
2. 代码：全部改动在 `a001/production` 分支；回滚 = 丢弃分支工作区，回到 A002 固化基线。
3. 数据失效可逆：G5 `current_valid` 只置 false、不删行，`control.gate_audits` 追加可查。

## 6｜前两轮残留的处置

| 残留 | 处置 |
|---|---|
| 前两轮 4 次有效 run 的 A001 L5 成果 | 保留作历史；新 run 发布时按主题前缀 `a001-` supersession 置失效（只留本轮一份有效） |
| `GreenHillStage.tsx` 体量剖面 | 保留为 V4 解释标注层，但**降级为辅助**；真实照片成为 V3 主角 |
| `topic-a001.mjs`、主题参数化适配层 | 复用，本轮补 `photoMaterials`（滨江 2 张） |
| 金泽 4 张照片 | 不动（属于金泽主题，A001 不触碰） |

## 7｜是否触及 UI 专项同名文件

本轮补 C4 §3.1（视觉资产分面）属 Gate B 已授权范围内；不改 C2/C3、不改 UI 专项其他文件；不替 UI 专项准出整套 C4。
