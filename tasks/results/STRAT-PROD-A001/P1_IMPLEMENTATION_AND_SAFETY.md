# P1｜受控实施准备与最小工程改造

> 原则：**配置化复用**现有 D00—D05 / G0—G5 管道与双 Consumer（`visual_stage` / `agent`），不复制金泽硬编码叙事、不新建 Schema、不改宪法。

## 1｜备份与恢复证据

| 项 | 值 |
|---|---|
| 冷备文件 | `D:\MoHen\backups\STRAT-PROD-A001\A001_PRE_<timestamp>.sql`（`pg_dump -F p`，全库） |
| 备份时机 | 新真实生产 run 之前 |
| 恢复路径 | `psql <db> -f <备份文件>`；只影响 `mohen_dev`，Cloud（Supabase）未参与本任务 |
| 隔离标识 | run_id + 投影前缀 `a001-*` + G5 `consumer` 列；A001 与金泽数据互不带串 |

## 2｜代码变更清单（11 个文件，全部在 `a001/production` 分支）

### 2.1 生产适配层（跨主题可复用优先）

| 文件 | 变更 | 为什么 |
|---|---|---|
| `pipelines/data-production/adapters/topic-a001.mjs`（新增） | 主题配置：3 份来源（含 `url`/`publisher`/`source_date`/`rights`）、D02—D05 提示词、实体别名 | 让同一套适配器可跑不同主题；避免复制一套金泽叙事 |
| `layer1-adapters.mjs` | ① D00 登记 `publisher_or_institution`/`source_uri_or_catalog_no`/`source_date`/`rights`，幂等复用时**只补空值**；② D02 **逐条证据按原文片段确定性归属真实来源**（旧实现全部挂第一份来源，导致返证指向错来源）；③ D04 新增 **今日联系**（`meaning.present_connections`）并在 G4 证据计数；④ D05 证据指针 `display_locator` 携带来源名/发布机构/日期/URL/片段序号；⑤ D05 拒绝登记分「无据对象对 / 待证问题」两类，修掉 `undefined ↔ undefined` 脏行；⑥ 故事种子按实体重叠关联证据指针；⑦ Agent 上下文 `summary` 去台账化（拒绝清单不再灌进要读给人听的那句话） | 让 L5 真正可被前端「点回原件」且回答读起来是人话；这些缺口在上一轮是真实存在的（返证只有标题） |

### 2.2 前端（单题页面，替代上一轮看板）

| 文件 | 变更 |
|---|---|
| `apps/web/lib/a001-experience-data.ts`（新增） | 服务端只读 L5：世界投影 / 时间投影 / 证据指针 / 故事种子 / Agent 上下文，且**按 `a001-*` + G5 `current_valid` + consumer 过滤**；用 `selectSurfaces()` 计算 Surface 资格并随数据下发 |
| `apps/web/app/experience/lvzhiqiu/page.tsx`（重写） | `force-dynamic` 服务端入口，只做「读 L5 → 算资格 → 交给体验壳」 |
| `apps/web/app/experience/lvzhiqiu/A001Experience.tsx`（新增） | 双组件编排 + 运行状态机（状态/动作/追问后返回原观察点）；步骤：今天 / 回看 / 理解 / 返证 / 追问 |
| `apps/web/app/experience/lvzhiqiu/GreenHillStage.tsx`（新增） | 视觉舞台：体量剖面（今天 / 1995 两态），9 个可交互热点，全部标注非测绘 |
| `apps/web/app/experience/lvzhiqiu/MohenAsk.tsx`（新增） | 本题专用墨痕对话（不继承金泽硬编码占位文案），限流与失败有独立措辞 |
| `apps/web/app/experience/lvzhiqiu/a001.css`（新增） | 与 `visual-grammar` 调色一致的纸墨风格；桌面/窄屏两套布局 |
| `LvzhiqiuExperience.tsx` + `lvzhiqiu.css` | **删除**（上一轮看板） |

### 2.3 Agent 与检索（有界缺陷修复，非重写）

| 文件 | 变更 | 为什么 |
|---|---|---|
| `packages/agent-runtime/src/understand.ts` | 补中文问法信号：身份同一（同一栋/是不是同一个）、因果（造成/导致）、施作者（谁改造）、今日可达（怎么上去/能进/停留），并把「原来/前身」归到「这是什么地方」一类；切词表补对应虚词 | 旧信号表把「烟草仓库和怡和冷库是同一栋楼吗」判为 `unknown`，直接以「答不了」收场，无法展示正/负例能力 |
| `packages/agent-runtime/src/select.ts` | ① 同类材料中「今日联系」优先；② 有今日联系时不再套「不给你编路线」的兜底缺口；③ 关系问句无对象命中时说「你问的这条关系」而不是「它们之间」；④ 「这是什么地方」直接用材料原话作答，不再加「先看它今天的样子」前缀 | 让墨痕说的话与实际选中的材料对得上（措辞与材料错配是上一轮的隐患） |
| `apps/web/lib/mohen-agent/retrieve.ts` | ① 新增「今日联系」材料（kind=`present`，`source_ref` 带标记）；② 故事种子用 `payload.statement` 作内容（旧实现用统一标题当内容，等于没内容）；③ 关系谓词人话表补 A001 谓词（`traces_origin_to`、`crosses`、`designed`…）；④ `agent_context.summary` 只取前若干句 | 检索到的必须是能读的内容，不是标题与台账 |
| `apps/web/app/api/mohen/ask/route.ts` | ① A001 别名改用生产链实体规范名（裁决出的 focus 可直接驱动舞台聚焦）；② 无对象命中时把主题词锚进检索；③ 检索为空时退回主题宽检索；④ 新增主题风险守卫（身份同一 / 因果）：命中即把结论降为 `partial` 并补边界说明 | 防止把「软性溯源」答成「同一栋楼」、把「空间相邻」答成「因果」 |
| `apps/web/lib/read-model-bridge.ts`、金泽页/AskBar/`productionRelationLabels.ts` | 主题参数化（`readProductionRelationSummary("jinze")`） | A001 与金泽的 G5 会同时 `current_valid`，必须按主题隔离，否则金泽页会读到绿之丘投影 |

## 3｜不可变合同复核

| 合同 | 是否触及 | 说明 |
|---|---|---|
| C2（人文 Data OS 与双 Skill） | 否 | 未改 |
| C3（数据库架构） | 否 | **未新增表、未改字段**；今日联系复用既有 `meaning.present_connections` |
| C4（Agent-native 体验） | 否（未改文件） | 仅在单题页面里**使用**其双组件与 Surface 资格概念；未替 UI 专项准出整套 C4 |
| 数据主规 / 物理数据模型 / 方法注册表 | 否 | 未改；`guard:physical-model`、`guard:registry` 均通过 |
| 第一代 37 表 DROP | 否 | 未执行任何 DROP |

## 4｜守卫与静态检查（实际执行结果）

```
guard:runtime-boundary        RUNTIME_DATA_BOUNDARY_OK
guard:cross-layer-write       CROSS_LAYER_WRITE_BOUNDARY_OK
guard:gate-enforcement        GATE_ENFORCEMENT_OK
guard:physical-model          PHYSICAL_DATA_MODEL_TARGET_OK
guard:stage-handoff           STAGE_HANDOFF_OK stages=6
guard:no-legacy-production    NO_LEGACY_PRODUCTION_ENTRY_OK
tsc --noEmit (apps/web)       OK
tsc --noEmit (agent-runtime)  OK
```

分层复核（数据面）：前端只读 `read_model` + `control.gate_audits`（服务端），**不读** `world/meaning/evidence/source` 物理下层；Agent 侧仍走 `read_model` G5（`consumer='agent'`）。`guard:runtime-boundary` 与 `guard:cross-layer-write` 未报错。

## 5｜用户可复验入口

```powershell
cd "D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0\apps\web"
npx next dev -p 3000
# 浏览器打开 http://localhost:3000/experience/lvzhiqiu
```

对照页（未被改坏）：`http://localhost:3000/experience/jinze-water-net`（已实测 HTTP 200，正文含金泽内容）。

## 6｜残存风险（P1 时点记录，P4 复测）

1. 视觉舞台为自制示意，非照片（U1 由 Owner 判断）。
2. 「改造是谁做的」这类**无对象名**的关系问句，检索仍可能落到「没有登记这条关系」；已如实说边界，不编答案（P4 记为已知边界）。
3. 前端问答接口有 60 秒 30 次限流；高频复测会触发 429，页面对此有独立提示（P4 已覆盖）。
