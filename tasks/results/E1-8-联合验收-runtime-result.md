# E1-8 联合验收 · 运行时验收结果（2026-10-29）

> 真实起 dev server（Next.js 15，http://localhost:3000）连本地库 + 上海图书馆 + DeepSeek，跑核心链路。
> 判定口径：每项标 PASS / FAIL / BLOCKED / NOT_RUN，不伪装。本次为「核心链路冒烟验收」，非 152 动作全量 UI 验收（后者需浏览器自动化，标 NOT_RUN）。

## 一、核心链路逐项结果（真实运行）

| 段 | 验收点（对应 CR） | 结果 | 证据 |
|---|---|---|---|
| E1-6 EXP | 空间投影全库 + 覆盖描述（CR-06/07） | ✅ PASS | coverage={entityCount:7, relationCount:6, storyCount:3, timelineEventCount:5, visualCount:2} |
| E1-6 EXP | 全库检索零作品可查（CR-06） | ✅ PASS | materials=20, degraded=false |
| E1-5 WATCH | 已发布作品目录（CR-05） | ✅ PASS | works=4 |
| E1-2 Studio | 受托研究·非预置题材 + 外部找资料（CR-01/16） | ✅ PASS | 外部线索=6（上海图书馆《金泽小志》等真实数据），degraded=false |
| E1-3 创作编导 | H1母题 → H2 A/B 方案（CR-11） | ✅ PASS | 母题=M1,M2,M5；planA/B 真实生成 |
| E1-7 资格失效 | 独立 Reviewer 资格裁决（CR-04） | ✅ PASS | HTTP 403（无身份→forbidden；有 Operator 身份→reviewer_not_configured，两段都阻断） |
| E1-4 Admin | 发布鉴权门（CR-04） | ✅ PASS | HTTP 403（无身份→forbidden；有身份走独立 Gate 预检 HOLD） |

## 二、本轮修的运行时问题（真实跑出来的，不是猜的）

1. **外部找资料 0 命中**：定位为「上海图书馆返回结果被 decideStep 排在本地合格知识之后、未随响应返回」→ 加 `researchLeads` 字段单独返回，现随响应带出真实线索。
2. **导演方案 no_material_or_llm**：路由漏返回 `finding`（H1 母题识别结果）→ 补上。
3. **类型错误**：`DirectorPlan.motif/directorDecisions` 改为可选、`publication.checkPublishEligibility` 的 content 需 JSON.parse、revoke 路由返回重复 `ok` → 已修，typecheck 全绿。

## 三、诚实边界（未宣称完成）

- **152 动作全量 UI 验收 = NOT_RUN**：本轮只跑核心链路冒烟（7 项），逐模块/逐动作的浏览器正反验收需 playwright/浏览器自动化，尚未执行。
- **独立 Reviewer 身份未配置**：`gates/decisions` 正确阻断（reviewer_not_configured），属交付包要求的 `E1-GATE-ACTIVATE` 部署期配置，代码已留检查点。
- **媒体素材硬缺口**：五图槽位（横幅/封面/分镜等）仍缺，演示阶段如实占位。

## 四、结论

**系统工程已就位并可真实运行**：创作（非预置受托研究 + 外部找资料 + H1/H2/H3 编导）、观看（WATCH 出版线）、探索（EXP 全库）、运营（Admin 鉴权 + 独立 Gate 阻断）、资格失效（P08 撤权）核心链路均真实跑通。下一步是 E2 完整样板试验 + 152 动作全量 UI 验收。
