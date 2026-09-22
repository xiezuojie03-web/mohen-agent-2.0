# TASK-0013 Result — Jinze Experience Renderer · First Living Vertical Slice

- 任务书：`tasks/TASK-0013-jinze-experience-renderer-first-living-vertical-slice.md`
- 就绪报告：`data/exports/jinze-experience-renderer-readiness.md`（三门 YES；本地产物不入库）
- 截图证据：`data/exports/task-0013-captures/`（6 张，覆盖 5 个人工验收状态）

## 1. 交付物

| 类 | 文件 |
|---|---|
| 纯运行时 | `packages/experience-engine/src/experience-runtime.ts`（状态机/派生视图/冻结不变量校验/用户语言标签表）；`src/index.ts` 追加导出 |
| 冻结产物副本 | `apps/web/data/experience/`（script/state-sequence/followup-patch/slice 四个 JSON 逐字副本，测试断言与 exports 原件逐字节一致） |
| 路由 | `apps/web/app/experience/jinze-water-net/page.tsx`（服务端：读冻结产物+入口校验） |
| Experience Shell | `ExperienceShell.tsx`（五层持久空间：Canvas/Narrative/TimeContext/Evidence/AgentAction）+ `experience.css` |
| Surfaces | `surfaces/SurfaceRenderer.tsx` + `types.ts` + 6 表面组件（modern_map/timeline/relational_space/evidence_panel/current_photo/text_focus） |
| 测试 | `tests/experience/renderer.test.ts`（17 用例，§17 全覆盖）；`tests/e2e/experience.spec.ts`（playwright spec） |
| E2E+截图脚本 | `scripts/e2e-experience-capture.mjs`（真实浏览器 18 断言 + 6 截图） |
| 工程接线 | `apps/web/package.json`（+@mohen/experience-engine workspace dep）、`next.config.mjs`（transpilePackages）、pnpm-lock |

## 2. §19 精确对账

| 项 | 值 |
|---|---|
| rendered scenes | **8/8**（GEOGRAPHIC_EXACT 2 / RELATIONAL_HISTORICAL 6） |
| implemented surfaces | **6**（modern_map/timeline/relational_space/evidence_panel/current_photo/text_focus） |
| CompositionState fields consumed | **6/6**（primary/secondary/context/narrativeDensity/visualIntensity/transitionIntent 均产生可辨视觉效果） |
| scene/composition transitions | 7 次；s01→s02 = 坐标层淡出（`coords-out` 动画，坐标网格与读数先于画面消失） |
| evidence states rendered | 7 级（FACT_EVIDENCED/FACT_LIMITED/CONFLICT/QUESTION/INTERPRETATION_CANDIDATE/UNKNOWN/INTERACTION） |
| conflicts rendered | 2（T11-C1 普济桥方位 / T11-C2 万安桥跨水道；双卡并列 + 「未裁决」+「不替你选边」） |
| interpretation states rendered | 2（s05-u4、s08-u1b；虚线+斜体+朱砂+专用徽章，与事实实线石绿明显不同——E2E 实测 computed style） |
| follow-up patch preserved/changed | preserved 6 / changed 3 / next_actions 3（research_lead/field_observation/explore）/ invariants 5（含不升级 E2→E1、HR-MAP-01 维持） |
| historical-coordinate leaks | **0**（GEOGRAPHIC_EXACT 仅当下场景；relational 数据面无坐标字段、组件不 import current_sources） |
| fabricated historical geometry | **0**（absent_no_source；无几何文件） |
| historical visual assets | **0**；current photos = 3（Commons 白名单，CC BY-SA，禁做旧 CSS `filter:none`） |
| DB migrations / DB writes | **0 / 0**（运行时无 DB 客户端——静态断言） |
| Legacy writes | **0**（git porcelain + 测试） |
| published / orphan | 0 / ≤63（未变，零 DB 触碰） |
| tests | experience 18/18（含 contract）；回归 historical-spatial **17/17**；spatial-grounding 17/18（唯一失败=#16 spawnSync EBUSY 已知环境限制，非回归） |
| E2E | capture 脚本 **18/18 PASS**（真实浏览器）；`tests/e2e/experience.spec.ts` 已入库（同断言；其 `pnpm dev` webServer 形态本机超时，属配置环境问题，等价覆盖已达成并如实记录） |
| typecheck / build / guards | 7 workspace 全过 / `next build` 过（新路由 prerender 成功）/ doc-budget+structure 过 |
| commits | 见下 |
| tracked worktree | clean |

## 3. 关键架构事实

1. **无场景级真相复制**：所有叙事/冲突/裁定文本来自冻结 JSON（测试以 20 字指纹×26 单元扫描全部源码）；改脚本无需改任何组件。
2. **CompositionState 驱动构图**：primarySurface 分发表面、density/intensity 映射版式类、transitionIntent 驱动转场——不同场景视觉可辨（截图可证）。
3. **Patch-not-Replace**：`reduceExperience` 的 TRIGGER_FOLLOWUP 只置 patchActive/patchId/followupQuestion 并追加 trail，sceneIndex 与历史轨迹原样保留；Patch 面板独立常驻。
4. **历史空间诚实**：relational_space 为纯拓扑（E1 实线/E2 虚线），水道是无名宽幅而非河形；modern_map 显式 GCJ-02 + 「不是历史位置」。
5. **墨痕无聊天窗口而存在**：开场之问→转场→证据浮出→发现提案→追问→Patch，全部经 ExperienceState 变化承载。

## 4. 已知限制（不隐藏 PARTIAL）

- modern_map 为坐标忠实 SVG 投影，非 MapLibre 瓦片（本仓库无既有地图栈；选它是因为坐标读数/网格的「在场→退出」正是 s01→s02 的语义本体，且零网络依赖、可确定性截图）。语义不变量（仅当下、CRS 显式、不混算）不受影响。
- s08 主发现在 narrative 层与 text_focus 画布各出现一次（双面组合：画布为视觉重心、narrative 层保上下文连续）。
- 照片经 Wikimedia Special:FilePath 加载，依赖外网。

## 5. Commits

| commit | 内容 |
|---|---|
| （本轮）TASK-0013 主体 | 运行时 + 路由 + Shell + 6 表面 + 冻结副本 + 测试 + E2E 脚本 + spec + 工程接线 |

## 6. 结论

**TASK-0013 PASS（三门 YES）**：墨痕第一次真正「活在」历史世界里——用户可以从今天的精确地图出发，看到时间后退、现代坐标失去作证资格、关系历史空间接管表达；桥—水关系、寺的进入、T11-C1/C2 冲突、1342/1938/1992 变迁、回到今天、以解释框架身份出现的 Discovery、canonical follow-up 的 Patch-not-Replace，全部端到端可运行、可交互、可人工检视。全部 31 条硬不变量保持。

按任务书 §23：**STOP，不启动 TASK-0014。**
