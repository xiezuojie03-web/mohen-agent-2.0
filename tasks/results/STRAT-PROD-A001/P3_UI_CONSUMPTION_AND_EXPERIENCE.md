# P3｜真实前端消费与体验实现

> 唯一目标：**真实前端人文体验**（不是看板、不是字段表、不是设计稿）。
> 本轮把上一轮的「内容生产看板」整个删掉，改为 C4 的双组件体验：**视觉舞台 + 墨痕**，同一套已发布判断驱动两侧。

## 1｜交付位置与入口

| 项 | 值 |
|---|---|
| 分支 | `a001/production` |
| 提交 | `a4e597f`（主改动）/ `f799416`（清理旧截图） |
| 路由 | `/experience/lvzhiqiu` |
| 本地预览 | `cd apps/web; npx next dev -p 3000` → `http://localhost:3000/experience/lvzhiqiu` |
| 渲染方式 | Server Component `force-dynamic`，每次请求按当前有效 G5 读取，不吃旧缓存 |
| 是否已部署 Production | **否**（按 Gate C，等 Owner 验收后再决定） |
| 对照页（未被破坏） | `/experience/jinze-water-net`（实测 HTTP 200，仍走金泽冻结稿 + 金泽真实投影） |

## 2｜用户实际能做的动作（U1—U5）

| 步骤 | 用户看到的 | 用户能做的 | 数据来源 |
|---|---|---|---|
| **今天** | 「同一处江边，为什么今天可以走上去、停下来？」+ 体量剖面（今天态） | 点「缓坡／螺旋扶梯／270° 平台／被削去的体量／江岸／杨树浦路」→ 立刻看到**那句材料原话**与出处；读今日联系；点「看这句话的出处」 | 世界投影 `present_connections`（D04 发布）、证据指针 20 条 |
| **回看** | 切到「1995 前身」：6 层厂房体量 + 安浦路规划横切 + 「第 6 层后被拆除」 | 点安浦路/建筑/地块前身 → 对应原句；读时间轴（1920 / 1995 / 约 2010 年代 / 2019 / 获奖年份未载） | 时间投影 `a001-layer3-timeline@4719c713`、证据指针 |
| **理解** | 3 条墨痕判断 + 一个「还不能认定的问题」 | 点「依据 n 句」→ 该判断依据的原句；点「让墨痕正面回答这个错误提法」→ 跳到追问并自动提问 | 故事种子 3 条 + 生产链已关联的证据指针 + Agent 上下文的拒绝清单 |
| **返证** | 20 条原句按来源分组 | 展开看每条原句的发布机构/日期/片段序号；点「打开原页面 ↗」到政府门户原文 | 证据指针 `display_locator`（含 url / publisher / source_date / fragment_index） |
| **追问** | 墨痕输入框 + 4 个示例问句 | 问「原来是什么 / 今天怎么上去 / 是不是同一栋 / 是不是贯通工程造成的」；答不了会直说答不了，并给出缺口 | `/api/mohen/ask`（topic=a001）→ `@mohen/agent-runtime` → 只读 `read_model` 的 G5（agent） |

追问后：舞台按裁决结果**换时点/聚焦对象**（例如问「是不是同一栋」会把地块前身高亮、不画实线），并出现「← 回到我刚才看的地方」；**用户所在的步骤不会被踢走**，答案不会随面板切换而消失（这是 P4 中发现并修掉的真实缺陷）。

## 3｜本次体验消费的 L5 ID（同源、可复核）

| 类型 | ID | Key |
|---|---|---|
| 世界投影（visual_stage） | `e711fcb3-86bf-45e9-903a-3b867b368144` | `a001-layer3-world@4719c713` |
| 时间投影（visual_stage） | `3dda2078-273f-417d-b95a-6fcadc7424fd` | `a001-layer3-timeline@4719c713` |
| 故事种子 ×3 | `9bdaaffa…`、`9611fa42…`、`24d32dc7…` | seed-5d4b615a / seed-a8b16ce9 / seed-ecd441de |
| 证据指针 ×20 | 见 `evidence/L5_AND_SOURCES.txt` | 全部 `attribution=exact_fragment_match` |
| Agent 上下文 ×3 | `85b27b07…`、`3493bdca…`、`c5411b50…` | ctx-5d4b615a / ctx-a8b16ce9 / ctx-ecd441de |

**资格过滤**：前端只接受 `gate_code='G5' AND result='PASS' AND current_valid=true AND consumer='visual_stage'`，并按 `projection_key LIKE 'a001-%'` 锁定主题，再用该投影的 `run_id` 圈定同一次生产（避免多 run 混读）。Agent 侧对称使用 `consumer='agent'`。

## 4｜视觉舞台：为什么是「体量剖面」

1. 本轮**没有**权利清晰的现状照片与历史图纸（Commons 无该对象条目；政府网页图片未获再分发许可），按任务书 §2 采「自制有据示意」。
2. 剖面能把材料里真正的信息讲清楚：**同一栋房子被削掉了什么**（拆第 6 层、削去约 50% 体量、斜向切削成台地）、**今天怎么进去**（杨树浦路缓坡上二层 → 漫游至滨江）。
3. 严守 Geometry is a Claim：
   - 只画相对体量与相对位置，**不画坐标、不画比例尺、不做现代配准**；
   - 页面 `<figcaption>` 与页脚固定声明「非测绘图 · 无坐标 · 无比例 · 未做历史影像配准」；
   - 架构上只以 `approximate_area`（近似区域）呈现，`before_after` / `historical_photo` / `historical_geometry` 等 Surface 由引擎判为不可用（页内「为什么这样画」可展开查看缘由）。
4. 9 个热点都可点、可键盘操作（`role=button` + Enter/Space），并带 `aria-label`。

## 5｜真实接线 vs 残存冻结分支

| 项 | 状态 |
|---|---|
| A001 数据来源 | **真实**：`read_model` 中当前有效 G5（run `4719c713`） |
| A001 页面是否含演练/假数据 | **无**。若读不到有效 G5，页面显示「暂时没有可发布的真实结论」，不降级到任何 JSON 副本（P4 已实测） |
| A001 页面是否复用金泽冻结叙事 | **无**。A001 无冻结脚本，叙事全部来自本次生产链；金泽路由与冻结稿未改动 |
| 共用代码 | 仅复用工程设施：`selectSurfaces`（Surface 资格）、`@mohen/agent-runtime`（理解/裁决）、`@mohen/data-access`（只读查询） |
| 金泽页 | 保持冻结稿 + 金泽投影；因 A001 与金泽 G5 会同时有效，已加主题参数隔离（`readProductionRelationSummary("jinze")`） |

## 6｜截图与录屏（`evidence/p4/`）

| 文件 | 内容 |
|---|---|
| `01-today.png` | 今天：体量剖面 + 今日联系（U1/E2） |
| `02-evidence-drawer.png` | 点「缓坡」→ 原句 + 出处 + 发布机构 + 日期 + 片段序号 + 原页面链接（U4/D2） |
| `03-then.png` | 1995 前身 + 时间轴右栏同步（U2） |
| `04-then-anpu-evidence.png` | 安浦路规划横切那条原句（U4） |
| `05-understand.png` | 3 条判断 + 一个还不能认定的问题（U3/E2） |
| `06-claim-evidence.png` | 判断 → 依据原句（U4） |
| `07-evidence-all.png` | 20 条原句按来源分组（U4） |
| `08-ask-negative-identity.png` | 负例：同一栋楼？→ 不认定 + 边界（U5/E3） |
| `09-ask-positive-access.png` | 正例：今天怎么上去 → 直接引材料原句（U5） |
| `10-ask-negative-causal.png` | 负例：贯通工程造成改造？→ 共现≠因果（U5） |
| `11-return-to-focus.png` | 追问后回到原观察点（U5） |
| `12-mobile-today.png` / `13-mobile-understand.png` | 414px 窄屏（E5） |
| `14-revoked-no-content.png` | 撤权负例：G5 失效后页面不画、不代理旧内容（D6/E4） |
| `15-restored-content.png` | 恢复后内容回来（D6 可逆） |
| `video/*.webm` | 全流程录屏（Playwright 录制） |

## 7｜已知边界（不掩盖）

1. 视觉主角是示意而非照片；若 Owner 认为必须有实景影像才达标，则 U1 只能记 `PARTIAL`（需另寻授权图源）。
2. 「改造是谁做的」这类**没有对象名**的关系问句，仍可能落到「材料里还没有登记你问的这条历史关系」；墨痕如实说边界，不编。
3. 前端问答接口有 30 次/60 秒限流，密集复测会 429；页面有独立措辞（不伪装成「材料没有」）。
4. 页面未做多语言与无障碍全面审计（仅基础 aria/键盘可达）。
