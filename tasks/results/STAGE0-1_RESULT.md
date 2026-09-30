# Stage 0+1 实施结果（Result，已 DONE）

**Task:** Stage 0（入口与默认路径）+ Stage 1（第一幕主角纠正：2.1 门控泄漏 + 2.2 今貌影像主角）
**Date:** 2026-09-26
**Executor:** WorkBuddy（墨策）
**Status:** ✅ DONE · 机器断言 A1 通过 · tsc 0 错误
**依据：** `tasks/results/STAGE0-1_DESIGN.md`（已批准）+ `CURRENT.md` §11.1（A/B/E 授权）

---

## 0. 一句话结论

金泽 Canonical Experience 第一眼从「坐标系地图」换成了「真实桥照 + 钩子」；默认态彻底清掉了
GCJ-02 / WGS-84 / Beat 计数 / 内部史料路径等工程术语泄漏；根路径从工程自检页变成人脸入口。
用户现在进得来、第一眼看得到真实金泽、且不被内部词打扰。

---

## 1. 改动清单（9 处）

| # | 文件 | 动作 | 子任务 | 说明 |
|---|---|---|---|---|
| 1 | `app/page.tsx` | 改写 | Stage 0 | 人脸入口：标题「一公里之内的南宋」+ 钩子 + 「进入金泽现场 →」按钮（一键进入，不自动跳转）+ 低调 footer 链 `/foundation` |
| 2 | `app/foundation/page.tsx` | **新建** | Stage 0 | 原工程自检页移出默认路径，内部可达 |
| 3 | `surfaces/SpatialSurfaces.tsx` | 编辑 | 2.1 | GCJ-02 label 改为人话「今天的位置（示意）」（devMode 才显原术语）；caption 去掉「GCJ-02 原值」；另一坐标系参考锚默认不显示坐标系名 |
| 4 | `ExperienceShell.tsx` | 编辑 | 2.1 | `Beat {n}/5 · {sceneIndex+1}/{len}` → 人话「第 {n} 幕 · 共 {total} 幕」（无内部术语） |
| 5 | `surfaces/EvidenceNarrativeSurfaces.tsx` | 编辑 | 2.1 | 双值冲突 footer 默认「来源：已登记的史料着录」，devMode 才显 `008/cultural_conflicts` 内部路径 |
| 6 | `data/experience/jinze-present-day-photos.json` | **新建** | 2.2 | curated manifest：8 张 Commons 桥照（放生桥领衔）+ `hero_hook`「你站在一公里之内的南宋」。**非冻结 JSON，不污染导演稿真源** |
| 7 | `surfaces/PresentDayPhotoSurface.tsx` | **新建** | 2.2 | 今貌影像 Hero：大图（放生桥默认）+ 钩子 + 7 张可翻看缩略图 + Commons 出处链。town-agnostic，只消费 `ctx.presentDayPhotos` |
| 8 | `surfaces/types.ts` | 编辑 | 2.2 | 新增 `CuratedPhoto` 类型 + `SurfaceContext.presentDayPhotos / presentDayHeroHook` |
| 9 | `surfaceRegistry.tsx` / `beats.ts` / `ExperienceShell.tsx` / `page.tsx` | 编辑 | 2.2 | 注册 Hero 到通用 `current_photo` 键；`buildWorldEvidenceState` 计入 curated 照片使 `current_photo` 变 eligible；server 读 manifest 经 props 传入；Beat 01 `primaryPreference → ["current_photo"]` |

**冻结 4 JSON 主体：未触碰。** 资产走 manifest 路线（设计 §0 决策）。

---

## 2. 机器断言（A1，SSR 可见文本 grep）

方法：urllib 直连 dev server（NO_PROXY）取 SSR HTML → 剥 `<script>/<style>`/标签 → 仅对可见文本断言。
（注：原始 HTML 的 `<script>` 内联了 `FRAME_CRS` 常量与切片 `coord_system` 数据，属序列化载荷非可见文本，已排除。）

| 断言 | 期望 | 实测 | 结果 |
|---|---|---|---|
| 默认态可见文本 `GCJ` | 0 | 0 | ✅ |
| 默认态可见文本 `WGS-84` | 0 | 0 | ✅ |
| 默认态可见文本 `Beat ` | 0 | 0 | ✅ |
| 默认态可见文本 `cultural_conflicts` | 0 | 0 | ✅ |
| 默认态可见文本 `sceneIndex` / `inelegible` / `零换算` | 0 | 0 | ✅ |
| 第一幕主角 = `surface-present-day-photo` | ≥1 | 1 | ✅ |
| 钩子「你站在一公里之内的南宋」可见 | ≥1 | 1 | ✅ |
| 地图 caption「当前地理空间 · 只代表」不再领衔 | 0 | 0 | ✅ |
| 根路径出现「进入金泽现场」按钮 | ≥1 | 1 | ✅ |
| `/foundation` 仍可访问 | ≥1 | 1 | ✅ |

**tsc --noEmit：** 退出码 0，无类型错误。

---

## 3. 资产可达性（探针 + 复测）

- 8 张 Commons 桥照均走 `Special:FilePath/<file>?width=900`。
- 复测（沙箱 curl + 浏览器 UA + NO_PROXY）：`Jinze_Fangshengqiao.jpg` → 200 image/jpeg 263KB；`Wan%27anqiao.jpg` → 200 224KB。
- 说明：沙箱内 urllib 默认 Python UA 被 Wikimedia 403（属 UA 策略）；**用户浏览器正常 UA 加载无碍**（客户端 `<img>`，不经沙箱代理）。
- 历史影像硬缺口（探针 §3）未在本 Stage 解决：史料原页 surface 维持「源已登记 / 图像待补」诚实占位，符合 Baseline §24.4 UnknownGap。

---

## 4. 与设计的偏差（已记录，需你知悉）

1. **未新增 package 级 `SurfaceType`**：Hero 直接注册在通用 `current_photo` 键下（复用既有语义类型，避免改 `experience-engine` 契约 + eligibility 枚举）。
   理由：`current_photo` 本就是「当代照片」的正确通用语义；新增包级类型属过度侵入。效果等价（Beat 01 主角＝Hero）。
2. **Beat 计数器改为人话「第 n 幕 · 共 5 幕」而非整体隐藏**：设计 §2.1 允许「门控」或「改人话」二选一；人话版保留进度感且不泄漏内部术语，用户体验更佳。
3. **另一坐标系参考锚（WGS-84 等）默认也不显坐标系名**：设计 §2.1 仅点名 GCJ-02 等 3 处，但同类 §13.1 泄漏一并门控，更彻底。
4. **钩子文本「你站在一公里之内的南宋」来自 manifest 数据，未硬编码于组件**：保持组件 town-agnostic。

---

## 5. 待你浏览器验收（VAG-4，授权 A）

请在本机打开体验页（dev server `http://127.0.0.1:3111/experience/jinze-water-net`，或部署后预览 URL），
逐项确认：

- [ ] 根路径 = 人脸入口，点「进入金泽现场 →」进入金泽第一幕
- [ ] 第一眼 = 放生桥今貌大图 + 钩子「你站在一公里之内的南宋」+ 7 张缩略图可翻看
- [ ] 全程**无** "GCJ-02 / WGS-84 / Beat n/5 / 008/cultural_conflicts" 等内部词
- [ ] 加 `?inspector=1` 后，地图显「本图坐标系 GCJ-02（原值，零换算）」、冲突 footer 显内部路径（供你核验诚实披露仍在）
- [ ] 桥照真实加载（Commons，CC BY-SA）
- [ ] 「看今貌照片」行动（Beat 05）亦唤出 Hero

**未做**：本 Stage 未自动部署生产（属 feature 构建，非 bug 修复；部署触及生产域，按你的偏好由你定时机）。
如需我一键部署到 `hushang...`/Vercel 供公开浏览器验收，请说一声。

---

## 6. 下一步（待你下发）

- Stage 2（若排期）：叙事化补强 / 探索性联动。
- Stage 3：史料原页（诚实占位 → 真原页，依赖可辩护史料图像，当前为 0）。
- Commons 国内网络波动备选：将 8 张图自托管 `public/`（需你确认版权署名方式）。
