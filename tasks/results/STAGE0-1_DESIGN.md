# Stage 0+1 · 具体改动方案（Design，待过审）

**Task:** Stage 0+1 改动设计（金泽 Canonical Experience）
**Date:** 2026-09-26
**Executor:** WorkBuddy（墨策）
**Status:** DRAFT · 待用户过审（过审后再写码）
**依据：** `CURRENT.md` §11.1（A/B/E 授权）+ §11.2（H2 计划）+ §11.3（结果文档）
**前置：** `tasks/results/STAGE0-1_ASSET_PROBE_RESULT.md`（资产探针，已 DONE）

---

## 0. 范围与授权基线

| 子任务 | 授权 | 性质 |
|---|---|---|
| Stage 0 · 入口与默认路径 | A（日常验收归用户）+ E（in-contract UI，非新镇/新主题） | 合规 |
| Stage 1 · 第一幕主角纠正 | B（Baseline §13.1 合规补齐，不升级）+ 新增今貌 surface | 合规 |
| 注：冻结 4 JSON 主体**不碰**（采用 manifest 路线，无需 D） | — | 降风险 |

---

## 1. Stage 0 — 入口与默认路径

**现状（探针确认）：** `apps/web/app/page.tsx` 是 Foundation 工程自检页（4 个硬编码健康检查，0 个 `<a>` 链接）。导演稿 §1 明令禁止首屏出现此类内容；用户目前**无任何入口**进入体验。

**改动：**
- 改写 `apps/web/app/page.tsx` 为 human-facing 入口：极简卡片——标题「墨痕 · 金泽：一公里之内的南宋」+ 一句钩子 + 进入动作（点击即进 `/experience/jinze-water-net`）；加载即可自动进入或一键进入。
- Foundation 自检页移出默认路径：保留为 `apps/web/app/foundation/page.tsx`（内部可达，入口页给一个低调 footer 链接，不喧宾夺主）。
- 不新增导航 taxonomy、不破坏体验页既有路由。

**验收：** 根路径直接进入金泽第一幕；Foundation 不再默认暴露；VAG-2 无新退化。

**风险：** 极低。

---

## 2. Stage 1 — 第一幕主角纠正

### 2.1 隐藏 GCJ-02 与另两处默认泄漏（B，合规补齐，最高优先 / 最低风险）

`SpatialSurfaces.tsx`：
- `:164` label `本图坐标系 GCJ-02（原值，零换算）` → 默认隐藏（或改人话"今天的位置"，不带坐标系术语）；`ctx.devMode` 才显原术语。
- `:230-232` caption「当前地理空间 · GCJ-02 原值 · 只代表今天」→ 去掉 "GCJ-02 原值"，保留"今天"。
- `:75` `FRAME_CRS` 常量**保留**（内部诚实记录坐标系统一性），但默认 UI 不显示其字面量。

`ExperienceShell.tsx`：
- `:265` `Beat {n}/5 · {sceneIndex+1}/{len}` → 包 `ctx.devMode ? ... : null`（或改人话"第几幕"，不带内部 sceneIndex）。

`EvidenceNarrativeSurfaces.tsx`：
- `:451` 默认直出 `来源：{c.source}`（= `008/cultural_conflicts`）→ 默认隐藏内部路径；`ctx.devMode` 才显；默认可显人话"来自已登记史料"或完全隐藏。

**验收（机器断言 A1，沿用历史经验）：** 默认态页面渲染结果 grep `GCJ` / `scene` / `cultural_conflicts` 等内部词**零命中**；`?inspector=1` 时可见（供你核验）。

### 2.2 新增"今貌影像"作为第一幕主角（B，用探针确认的 8 张 Commons 桥照）

**数据接入（不碰冻结 JSON，不耦合 DB）：**
- 新建 curated manifest `apps/web/data/experience/jinze-present-day-photos.json`：
  `feature_key → { commons_file, caption }`（8 条，对应放生桥/林老桥/普济桥/如意桥/天皇阁桥/万安桥/颐浩寺遗址/迎祥桥）。
- 由体验页 **server component**（`page.tsx` 的 jinze 页）读取 manifest，作为 props 传给新 surface。
- **组件仍 town-agnostic**：manifest 放在 `data/`（语义输入），组件内部只接收 `feature_key → 图像 URL`，不硬编码任何镇真相（符合 `SpatialSurfaces.tsx` 顶部硬规则"组件不得硬编码 town-specific 历史真相"）。

**新 surface：**
- 新增 `surfaces/PresentDayPhotoSurface.tsx`：默认主视觉 = 一张金泽桥的今貌照（大图），叠加极简钩子文字「你站在一公里之内的南宋」；坐标网格降级为可折叠/默认隐藏的"今天的位置"参考（`ctx.devMode` 才显坐标系）。
- 图像 URL 复用现成构造器 `EvidenceNarrativeSurfaces.tsx:622`
  `https://commons.wikimedia.org/wiki/Special:FilePath/<file>?width=<px>`（提取为共享 util 或就地调用，避免重复）。
- 注册到 `surfaceRegistry.tsx`；`beats.ts` 的 Beat 01 `defaultUnitIds`/surface 指向它。

**验收：** 第一眼 = 真实桥照 + 钩子；无坐标/枚举/调试条；VAG-2 drift 对比截图（导演稿 Beat 01：同一人类问题"为什么会这么近"仍在、主角=今天金泽、技术信息更不突出）；8 张照至少首幕主图 1 张 + 可翻看其余。

### 2.3 资产加载验证
- 沙箱截图须 `NO_PROXY`（探针已验证 `curl --noproxy '*' -L` → 200 image/jpeg）；截图工具/Playwright 走直连或 `ProxyHandler({})`。
- 用户浏览器直连 Commons 无碍（客户端 `<img>`，不经沙箱）。

---

## 3. 明确不动的部分

- 冻结 4 JSON 主体不修订（采用 manifest 路线，无需 D 授权）。
- 不引入真实底图 / 瓦片（无数据，也绝不该编）——第一幕用"真实照片"而非"地理底图"。
- 历史影像硬缺口（探针 §3）**不在 Stage 1 解决**：史料原页 surface 维持"源已登记 / 图像待补"的诚实占位（Baseline §24.4 UnknownGap 可接受），Stage 3 再定。

---

## 4. 验收口径（VAG）

- **VAG-1 Contract Gate**：不违反 Baseline / Evidence·Geometry·Meaning 防火墙 / ExperienceState·Action 契约。
- **VAG-2 Canonical Drift Gate**：对比导演稿 Beat 01——同一人类问题仍在、主角明显=今天金泽、揭示序列保留、技术信息更不突出、更不 card/page/chat-like。
- **VAG-3 Screenshot / Recording**：默认态 + `?inspector=1` 前后截图对比。
- **VAG-4 Architect Visual Review**：由 沙漠绿洲 浏览器验收（授权 A）。
- **VAG-5 Human Gate**：里程碑级才做；本 Stage 0+1 不强制。

---

## 5. 风险与回退

- Commons 单一来源、每对象仅 1 张 → readiness 判 `image_immersion = PARTIAL`，首幕单图足矣，不宜过度铺陈。
- **若 Commons 在用户网络被墙**（国内访问 Wikimedia 偶有波动）→ 备选：将 8 张图下载自托管到 `public/`（in-contract，低风险，但需你确认是否允许本地自托管版权署名）；先标记风险，不默认做。

---

## 6. 改动文件清单（汇总）

| 文件 | 动作 | 子任务 |
|---|---|---|
| `apps/web/app/page.tsx` | 改写为人脸入口 | Stage 0 |
| `apps/web/app/foundation/page.tsx` | 移出 Foundation 自检页（新建） | Stage 0 |
| `apps/web/app/experience/jinze-water-net/surfaces/SpatialSurfaces.tsx` | 门控 GCJ-02 label/caption（:75/:164/:230-232） | Stage 1·2.1 |
| `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx` | 门控 Beat 计数器（:265） | Stage 1·2.1 |
| `apps/web/app/experience/jinze-water-net/surfaces/EvidenceNarrativeSurfaces.tsx` | 门控内部来源路径（:451）+ 提取图像构造器（:622） | Stage 1·2.1/2.2 |
| `apps/web/app/experience/jinze-water-net/surfaces/PresentDayPhotoSurface.tsx` | **新增** 今貌影像 surface | Stage 1·2.2 |
| `apps/web/app/experience/jinze-water-net/surfaceRegistry.tsx` | 注册新 surface | Stage 1·2.2 |
| `apps/web/app/experience/jinze-water-net/beats.ts` | Beat 01 指向新 surface | Stage 1·2.2 |
| `apps/web/data/experience/jinze-present-day-photos.json` | **新增** curated manifest（8 条） | Stage 1·2.2 |

---

## 7. 实施顺序（过审后）

1. **2.1** 门控三处泄漏（最快出 P1 效果，最低风险）→ 截图验收（机器断言 A1）。
2. **Stage 0** landing（让用户进得来）。
3. **2.2** 今貌影像 surface（主角替换）→ 截图验收（VAG-2）。
4. 整体 VAG-2 对比 + 用户浏览器验收。

---

## 8. 待你拍板的点

1. Stage 0 入口是否"加载即自动进入"还是"一键进入"（倾向一键进入，更尊重用户）。
2. 首幕主图是否就用放生桥（金泽最标志性）作为默认，其余可翻看。
3. Commons 自托管备选是否预先授权（防国内网络波动），还是先看直连效果。
4. 确认后我即按 §7 顺序写码 + 截图验收，不再逐微步请示。
