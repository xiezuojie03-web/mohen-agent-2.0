# P0｜基线冻结与承接预检（MH-STRAT-PROD-A001 重启）

> 执行者：CodeBuddy（工程执行方）　｜　指挥与验收：项目负责人（Owner）
> 本文件在 2026-10-18 重启时重写，覆盖上一轮同名文件；上一轮结论保留在 §5。
> 任务书：《01_A001_完整生产执行任务书_V1.0.md》（唯一工程执行任务书）

## 1｜实际基线（本次重启时点）

| 项 | 实际值 |
|---|---|
| 工作区 | `D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0` |
| 分支 | `a001/production`（隔离分支，未触碰 `main` / `track/experience-exp-0002` / `hushang-jingwei`） |
| 仓库基线 | 原稿基线 `handoff@8966d1b` + 上一轮 A001 未提交改动 |
| Node / 包管理 | Node 22 / pnpm workspace（`@mohen/web`、`@mohen/agent-runtime`、`@mohen/experience-engine`、`@mohen/data-access`） |
| 数据库 | 本地 PostgreSQL 18，库 `mohen_dev`（`.env.local` 的 `DATABASE_URL`，端口 5432） |
| LLM | DeepSeek（`deepseek-flash`），key 存于 `.env.local`，未写入任何文档/日志/截图 |
| 前端 | Next.js 15.5 App Router，本地 `next dev -p 3000` |

## 2｜准入决策

**`ACCEPT_MINIMAL`（收窄后接受）**，条件如下：

1. **素材**：仅用 3 份政府门户公开网页（杨浦区政府 2 份、上海市政府 1 份）作当代叙述来源；**无权利清晰的现状照片**，因此视觉主角采用任务书 §2 允许的「自制有据示意」（体量剖面），全页标注非测绘、无坐标、无比例。
2. **最小可证闭环**：一个可证变化（1995 烟草公司机修仓库 → 约 2010 年代改造为绿之丘公共综合体）+ 一个返证入口（20 条原句，含出处、发布机构、日期、片段序号、原页面 URL）。
3. **一个可判负例**：材料只写「前身可追溯到 1920 年怡和冷库」，**不足以认定「同一栋建筑连续存在」**；因果（贯通工程是否造成改造）同样无据。
4. **不扩容**：不新增主题、不碰 Production（hushang-jingwei）、不写第一代 37 表、不改 C2/C3/C4 宪法。
5. **Gate A 复用**：上一轮已获 Owner 确认（真实写库 + 付费 LLM + 本地预览优先），本轮 A001 scope 写入与 DeepSeek 调用在同一授权范围内；未发生超范围付费。

## 3｜预计改动面

- 管道适配层：`pipelines/data-production/adapters/layer1-adapters.mjs`（主题可配置、证据逐条归属、今日联系）+ 新增 `topic-a001.mjs`
- 前端：新增 `apps/web/app/experience/lvzhiqiu/*`、`apps/web/lib/a001-experience-data.ts`
- Agent：`packages/agent-runtime/src/understand.ts`、`select.ts`
- 检索与问答路由：`apps/web/lib/mohen-agent/retrieve.ts`、`apps/web/app/api/mohen/ask/route.ts`
- 主题隔离：`apps/web/lib/read-model-bridge.ts` 与金泽页/AskBar 的主题参数（防 A001 与金泽 G5 串味）
- **不动**：C0–C4 宪法、数据主规、方法注册表、真实 Production、第一代表结构

## 4｜素材风险与降级

| 风险 | 处置 |
|---|---|
| 无现状照片 → 视觉主角不足 | 自制体量剖面（材料原文驱动），页面与 `<figcaption>` 明示「非测绘图·无坐标·无比例」；列为 Owner 重点判断项（U1） |
| 政府网页是「当代叙述」，非学术考据 | 原句一律标注来源、发布机构、日期、片段序号；「材料原话 / 墨痕的解释 / 尚缺 / 不认定」四层分开展示 |
| 「1920 怡和冷库」易被读成同一栋 | 生产链登记为身份未证；页面与 Agent 双侧明确拒绝该提法（负例） |
| 改造年份未载 | 时间轴只到「十年精度」，不写「某年建成开放」 |

## 5｜上一轮残留的处置

上一轮把前端做成「内容生产看板」（`LvzhiqiuExperience.tsx`：列关系、来源计数、推断），Owner 判定偏离。本轮处置：

| 残留 | 处置 |
|---|---|
| `apps/web/app/experience/lvzhiqiu/LvzhiqiuExperience.tsx`（看板） | **删除**，改为双组件体验（视觉舞台 + 墨痕） |
| `lvzhiqiu.css`（看板样式） | 删除，新写 `a001.css` |
| 4 次旧 run 的 A001 L5 成果 | 保留作历史，但**撤销 G5 current_valid**（只留最终 run 有效），见 P2 §5 |
| `topic-a001.mjs`、主题参数化适配层、`read-model-bridge` 主题隔离 | **复用**（方向正确） |
| 工作区垃圾文件（`(select`、`_probe.mjs`、`after-askbtn.yaml`、`exp-initial.yaml`） | 删除 |

## 6｜回滚方案

1. 数据：`pg_dump` 全库冷备 `D:\MoHen\backups\STRAT-PROD-A001\A001_PRE_<ts>.sql`（P2 前生成）。
2. 代码：全部改动在 `a001/production` 分支，未合并主干；回滚 = 丢弃该分支工作区。
3. 前端：删除 `apps/web/app/experience/lvzhiqiu/` 即回到「无 A001 页面」，金泽页不受影响（已实测 200）。
4. 数据失效可逆：G5 `current_valid` 只置 false、不删行，`control.gate_audits` 追加可查（P4 已实测撤权后不复活旧内容）。

## 7｜是否触及 UI 专项同名文件

未新增/修改 UI 专项（`specs/UX*`、C4 宪法）任何文件；本轮只做单题页面与自有路由，不替 UI 专项准出整套 C4。发现的 L5→UI 缺口记入 P4 §E7。
