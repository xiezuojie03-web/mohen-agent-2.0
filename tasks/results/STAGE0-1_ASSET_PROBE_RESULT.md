# Stage 0+1 · 资产加载探针结果（Asset Loading Probe Result）

**Task:** Stage 0+1 前置探针（金泽 Canonical Experience）
**Date:** 2026-09-26
**Executor:** WorkBuddy（墨策）
**Status:** DONE
**依据：** `CURRENT.md` §11.2（H2 施工计划）+ §11.3（结果文档规则）
**方法：** 只读调查——前端 surface 源码 + 冻结 JSON + 视觉资产盘底导出 + 数据库资产口径 + 沙箱网络实测。

---

## 0. 一句话结论

- **真实今貌影像：存在且可加载**（8 张 Commons 当代桥/寺实景照）——Stage 1「今天金泽可感场景」弹药充足，但当前运行时**根本没渲染任何图**（所有 surface 都是抽象 SVG）。
- **第一幕 GCJ-02 坐标系 banner 默认泄漏**——这是 Stage 1 最高优先、最低风险的修复点，纯 Baseline §13.1 合规补齐。
- **史料原页 / 历史影像：硬性数据缺口（0 件可辩护历史图）**——Stage 3「史料原页」不能靠渲染解决，须改为"诚实的源已登记状态"或延期数据采集。
- **加载机制本身可用**：沙箱经 `NO_PROXY` 可直连 Commons；前端唯一图像构造器在 `EvidenceNarrativeSurfaces.tsx:622`，可复用。

---

## 1. 真实今貌影像：存在且可加载（Stage 1 弹药）

| 项 | 结论 |
|---|---|
| 已确认当代遗产对象影像 | **8 张**（覆盖 8 个对象：放生桥/林老桥/普济桥/如意桥/天皇阁桥/万安桥/颐浩寺遗址/迎祥桥） |
| 来源 | 全部 Wikimedia Commons，`CC BY-SA 3.0` |
| 加载 URL 形态 | `https://commons.wikimedia.org/wiki/Special:FilePath/<file>?width=<px>`（代码现有构造器） |
| 沙箱实测 | `curl --noproxy '*' -L` → `HTTP 200 image/jpeg`（放生桥 74KB）；第二张普济桥同样 200 |
| 用户浏览器 | 直接加载无碍（客户端 `<img>`，不经沙箱） |
| **当前是否渲染** | **否**——所有 surface 均为抽象 SVG 矢量画布，全仓库前端无任何 `<img>` 元素渲染这些照片 |

**含义：** Stage 1 第一幕主角从"GCJ-02 坐标网格"换成"今天金泽的真实桥照"在**数据层面完全可行**；缺的是①一个真正渲染 `<img>` 的 surface 组件，②默认态隐藏坐标系 banner。

---

## 2. 第一幕 GCJ-02 泄漏（最高优先修复点）

`apps/web/app/experience/jinze-water-net/surfaces/SpatialSurfaces.tsx`：
- `FRAME_CRS = "GCJ-02"`（:75），默认渲染 banner + caption「当前地理空间 · GCJ-02 原值 · 只代表今天」（:230-232）+ label「本图坐标系 GCJ-02（原值，零换算）」（:164）。
- 违反 Baseline **§13.1**（GCJ-02/WGS-84 属"非常规默认 UI"）。
- 6 位 GPS 字面量已 `ctx.devMode` 门控（:124-125，合规），但**坐标系 banner 本身未门控**。

另两处已坐实默认泄漏：
- `ExperienceShell.tsx:265` `Beat {n}/5 · {sceneIndex+1}/{len}` **零门控**（RECON-01 R1–R5 未覆盖）。
- `EvidenceNarrativeSurfaces.tsx:451` 默认直出 `来源：008/cultural_conflicts` 内部路径。

**结论：** 这三处即 Stage 1 第一幕主角纠正的**核心代码改动点**，纯合规补齐，命中 P1 重新看见，风险最低。

---

## 3. 史料原页 / 历史影像：硬性数据缺口（Stage 3 非渲染问题）

| 项 | 结论 |
|---|---|
| 已确认历史 / 档案影像 | **0 件** |
| 14 条上海图书馆资产 | `identity_unresolved`——无题录/年代/作者，无法认定历史身份（不可用作历史证据） |
| 含金泽的历史地图 | **0 件**（1754 松江府境图不含金泽） |
| `HistoricalMapNativeSurface` 组件 | **stub**：仅渲染占位 `<span>`，即使 `imageAvailable=true` 也不渲染 `<img>` |
| 就绪度报告判定 | `past_present_comparison = NO`、`spatiotemporal_overlay = NO`（卡在"过去那一维 = 0"） |

**结论：** Stage 3「史料原页」**不能用真实原页填满**——这是数据缺口，不是加载/渲染问题。可行路径：
- **A（推荐，合规）：** 诚实保留"源已登记 / 图像待补"状态（Baseline §24.4 UnknownGap 明确可接受，且当前 `HistoricalMapNativeSurface` 本就显示此状态）；把该 surface 从"空槽 stub"补成一个**有设计的诚实占位**（说明为何暂无原页，而非空白）。
- **B（延期）：** 走新采集，先为候选历史图补"年代/地点/来源"可核验题录（属 in-contract 数据工作，但扩大 scope，建议 HOLD 至 Stage 3 再议，不进 Stage 1）。

---

## 4. 加载机制与前端图像入口

- 前端现存唯一图像 URL 构造器：`EvidenceNarrativeSurfaces.tsx:622`
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`——**可直接复用**为 Stage 1 新 surface 的图像源。
- 沙箱网络：默认代理无法出外网（Commons 经默认代理 `HTTP 000` 超时）；经 `NO_PROXY` 直连正常（302→200）。**验证截图须加 `--noproxy '*'`**；用户浏览器不受影响。

---

## 5. 对 Stage 0+1 方案的影响（交给设计文档）

1. **Stage 1 可立即推进**：①默认态隐藏 GCJ-02 banner/label；②新增"今貌影像" surface，用 8 张 Commons 桥照作第一幕主角；③门控另两处泄漏；④验证截图（NO_PROXY）。
2. **Stage 3 须重新定义**：不做"伪史料原页"，改"诚实占位 / 源已登记"，或延期采集（不进 Stage 1）。
3. **图像接入方式**（设计文档细化）：新建 curated manifest（`data/experience/jinze-present-day-photos.json`，feature_key → Commons 文件名），由体验页 server component 读取并传给新 surface——不碰冻结 JSON、不耦合 DB、不硬编码镇真相于组件（组件仍 town-agnostic，manifest 为语义输入）。

---

## 6. 验收证据（本次探针）

- 网络实测命令与结果（见 §1、§4）：`curl --noproxy '*' -L` → 200 image/jpeg。
- 源码证据：`SpatialSurfaces.tsx:75/164/230-232`、`ExperienceShell.tsx:265`、`EvidenceNarrativeSurfaces.tsx:451/622`。
- 数据证据：`data/exports/jinze-visual-inventory.md`（42 条盘底，8 条 confirmed）、`jinze-visual-readiness.md`（就绪度判定）。

## 7. 遗留 / 风险

- Commons 图片在用户浏览器直连加载无碍；沙箱仅影响我方截图核验（已用 NO_PROXY 解决）。
- 8 张照均来自 Commons 同一来源、每对象仅 1 张，沉浸铺陈有限（ readiness 判 `image_immersion = PARTIAL`）——Stage 1 用其做"第一幕主角"足够，但不宜过度铺陈。
- 历史影像硬缺口须在设计文档里把 Stage 3 的重定义写清楚，避免后续误判为"渲染没做好"。

## 8. 下一步

→ 见 `tasks/results/STAGE0-1_DESIGN.md`（Stage 0+1 具体改动方案，待用户过审后再写码）。
