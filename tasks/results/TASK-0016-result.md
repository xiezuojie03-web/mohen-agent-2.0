# TASK-0016 — MoHen Agent Runtime: Evidence-Aware Replan Loop V1.0 · Result

> 状态：**PASS**（链路可运行且无 epistemic violation）
> 总 Gate：`MOHEN_EVIDENCE_AWARE_REPLAN_LOOP_READY = YES`
> 施工前 HEAD：`ca9e154`（main） → 代码/测试/E2E/CONTEXT 提交：`81c3e73`
> 本轮架构侧明示裁决：`BUILD = NOT_RUN`（避免 dev/build 共享 `.next`，见 §8）

---

## 1. Context Gate（开工前只读清单）

| 读取 | 原因 |
|---|---|
| `CONTEXT.md` | Source of Truth 指针：Phase 0 / 仓库版本 / 历史空间规则 / 各 TASK 收口状态 |
| `tasks/TASK-0016-*.md` | 本任务最高指令（§0–§20） |
| `tasks/results/TASK-0015-result.md`、`TASK-0015-FIX-result.md` | 前置 Gate（PASS）与 runtime recovery 根因（dev/build 共享 `.next`） |
| `packages/experience-engine/src/{experience-runtime,surface-eligibility,index}.ts` | 现行 ExperienceState/CompositionState、Evidence-aware Surface Selection、导出面 |
| `apps/web/app/experience/jinze-water-net/{ExperienceShell.tsx,beats.ts,page.tsx}` | 现行 Renderer 契约、world 证据构建、追问入口与 Patch UI |
| `apps/web/app/experience/jinze-water-net/surfaces/{SpatialSurfaces.tsx,types.ts}` | RelationalHistoricalSurface V3 与 `askedMissingRelation` / `absent-relation` 视觉语义 |
| `tests/experience/{composition2,renderer}.test.ts` | TASK-0013/0014 回归基线（不得回归） |
| `apps/web/data/experience/*.json` | 冻结产物（script / patch / slice / state-sequence） |
| `scripts/e2e-runtime-recovery.mjs` | E2E 截图与 no-reload 探针的既有模式 |
| `apps/web/{package.json,next.config.mjs}`、`packages/experience-engine/package.json` | dev 脚本、`transpilePackages`、引擎消费方式（**源码**，非 dist） |

**MEMORY.md 是否读取：NO**（未读父级/项目 MEMORY，未批量翻 docs/tasks/results，未触 Legacy/DB）。
**冲突：无。** 未重新研究金泽、未扫描全仓重做架构。

## 2. Session Gate

- repo/branch/HEAD：`mohen-agent-2.0` / `main` / `ca9e154`；worktree 唯一，无并行施工 session。
- `apps/web/.next`：开工前存在但**无进程占用**（陈旧可再生产物）→ 按裁决 #1 **第一动作删除**；最终 runtime 来自删除后的 clean dev。
- 3001 端口：开工前空闲；本轮只起**一个** `next dev -p 3001`；无 dev/build 同时写 `.next`。
- DB / Legacy / migration：**zero-write**；未起第二个写进程。

## 3. 修改 / 新增文件

| 文件 | 变更 |
|---|---|
| `packages/experience-engine/src/evidence-aware-replan.ts` | **新增**：`FollowUpIntent → EvidenceDecision → ReplanPlan → ExperiencePatch`（+`selectReplanSurface`） |
| `packages/experience-engine/src/surface-eligibility.ts` | `WorldEvidenceState` 增 `relationEvidence?: RelationEvidence[]`（对象对关系证据，**不含坐标**） |
| `packages/experience-engine/src/experience-runtime.ts` | 状态增 `followUpIntent/evidenceDecision/replanPlan/replanViewActive`；动作增 `FOLLOWUP_REPLAN`、`RETURN_TO_PRESENT`；`reduceExperience` 增 `world?` |
| `packages/experience-engine/src/index.ts` | 导出 `evidence-aware-replan` |
| `apps/web/app/experience/jinze-water-net/ExperienceShell.tsx` | 追问改走真 runtime；主角由 `selectReplanSurface` 决定；新增 ReplanCard；`RETURN_TO_PRESENT` 出口；Replan 期间冻结 patch 卡让位 |
| `apps/web/app/experience/jinze-water-net/beats.ts` | 切片 `relations` → `relationEvidence`（诚实标注「仅今天共址」） |
| `tests/experience/replan-loop.test.ts` | **新增**：覆盖 §11 全部 17 条断言 |
| `tests/experience/{composition2,renderer}.test.ts` | 两处过期的 `TRIGGER_FOLLOWUP` 源码断言 → `FOLLOWUP_REPLAN`（Patch-not-Replace / 无 reload 不变量**照旧断言**） |
| `scripts/e2e-replan-loop-capture.mjs` | **新增**：真浏览器链路验收（18 项）+ 3 张 clean-runtime 截图 |
| `CONTEXT.md` | current task / Replan runtime rule / 两条 dev 踩坑 |

## 4. Canonical Follow-up Runtime Trace（真实运行结果，逐步）

> 场景：`/experience/jinze-water-net` → 到达「回到今天」（s07）→ 追问 → 返回 Present。
> 每一步给出**真实值**，非模块名。

**① USER_INPUT**
```text
那颐浩寺和普济桥以前真的有关系吗？
```
（来源：冻结 `BEATS` action `追问：那颐浩寺和普济桥以前真的有关系吗？` → 去掉前缀；与 `script.followup.trigger_question`、`followup-patch.json.trigger_question` **逐字一致**）

**② INTENT** — `classifyFollowUp(question)`
```json
{ "kind": "verify_historical_relation",
  "objects": ["yihaosi-site", "pujiqiao"],
  "deterministic": true }
```

**③ EVIDENCE_DECISION** — `decideEvidence(intent, world)`，仅消费 `world.relationEvidence`
（来源：切片 `relation_key = yihaosi-site--temple_bridge_association--pujiqiao`，`epistemic_class = E2`，subject/object = `…/yihaosi-site`、`…/pujiqiao`）
```json
{ "verdict": "insufficient_for_confirmation",
  "supportedEpistemicClass": "E2",
  "currentAssociationNotHistorical": true,
  "reason": "现代 provider 复合 POI（寺与桥同属一个 POI 名）+ 同街地址 → 这是今天的关联，不是前现代文献记载的历史功能关系",
  "known": ["寺与桥今天相邻、同街（现代 provider 复合 POI + 同街地址）",
            "寺 1260 年创建、两桥 1260s–1267 建成（时间窗口重叠有据）"],
  "unknown": ["任何前现代文献是否记载寺—桥功能关联"],
  "missingEvidence": ["明清方志/寺志中的寺桥关系条目",
                      "1879 县志图说该区域可辨读细节"] }
```
> 关键：`verdict ≠ confirmed`；`supportedEpistemicClass` **停在 E2**（E2 未升 E1）。

**④ REPLAN_PLAN** — `planReplan(decision, intent)`
```json
{ "focus": ["yihaosi-site", "pujiqiao"],
  "targetSurface": "relational_space",
  "evidenceFocus": "temple_bridge_association",
  "uncertaintyVisible": true,
  "relationEpistemicClass": "E2",
  "currentCoordsLoseHistoricalAuthority": true,
  "nextActions": ["open_evidence", "timeline", "research_lead", "return_present"] }
```

**⑤ EXPERIENCE_PATCH** — `buildExperiencePatch(plan, decision, experienceId)`
```json
{ "experienceId": "jinze-3min/jinze-water-net",   // 不变
  "primarySurface": "relational_space",
  "evidenceFocus": "temple_bridge_association",
  "uncertaintyVisible": true,
  "relationEpistemicClass": "E2",
  "verdict": "insufficient_for_confirmation",
  "currentCoordsLoseHistoricalAuthority": true }
```
reducer 实际落盘（`FOLLOWUP_REPLAN`）：
```text
patchActive          false → true
patchId              null  → "jinze-3min/patch/followup-temple-bridge"
followupQuestion     null  → "那颐浩寺和普济桥以前真的有关系吗？"
replanViewActive      false → true
experienceId    "jinze-3min/jinze-water-net" → 不变
sceneIndex            6 → 6（不重启、不回场）
trail                 +"replan:verify_historical_relation:那颐浩寺和普济桥以前真的有关系吗？"
```

**⑥ COMPOSITION_PATCH** — `selectReplanSurface(plan, world)`
```text
复用既有 Evidence-aware Surface Selection：
selectSurfaces(world, { primary: ["relational_space", "evidence_reveal"] })
  → selectedPrimary = "relational_space"（因 hasHistoricalRelations=true 且判据命中）
Shell 端：primaryType = replanSelection.selectedPrimary（证据驱动，非固定 beat preferChain）
```

**⑦ SELECTED_SURFACE**
`relational_space` → 既有 **RelationalHistoricalSurface V3**（无新 Surface、无新视觉语法）。
因 `ctx.askedMissingRelation = true`（Replan 期强制）且该关系 `cls = E2 ≠ E1`，寺↔桥渲染为**断开/缺席**语义（`absent-relation`），**不出现 E1 实线**。

**⑧ OBSERVED_UI_STATE**（clean runtime 浏览器实测）
```text
追问前：Beat 5/5 · 7/8（s07-return-today，GEOGRAPHIC_EXACT）· surface-current-map 可见
追问后：replan-card 出现且
        data-verdict="insufficient_for_confirmation"
        data-epistemic-class="E2"
        data-current-coords-authority="lost"
        data-intent="verify_historical_relation" · data-deterministic="true"
        surface-relational-space 可见 · coordinate-authority-lost 标记可见
        文案：「现有证据不足以确认（最高可支持到 E2，不把 E2 升为 E1）」
        冻结 patch 结果卡**让位**（不冒充 runtime 输出）
返回后：surface-current-map 重新可见 · 空间模式「现代精确坐标」
        Beat 5/5 · 7/8 → Beat 5/5 · 7/8（未 reset）
        no-reload 探针存活 · replan-card 仍在（Patch 痕迹保留）
pageerror = 0
```

## 5. Evidence Level 是否变化

**NO。** 寺↔桥关系全程保持 `E2`；`supportedEpistemicClass = E2`、`plan.relationEpistemicClass = E2`；app 内**不存在**该对象对的 E1 记录（单测第 17 条显式断言「E1 寺桥关系 = false」）。未新增任何历史事实、未新增 Evidence 行。

## 6. Experience ID 前后

`jinze-3min/jinze-water-net` → **不变**（未新建 Experience、未复制整份 ExperienceState 冒充 Patch）。`sceneIndex`、`experienceId` 均不动。

## 7. 是否 full reload / 是否 current coords → historical geometry

- **full reload：NO。** `window.__patch_marker` 探针跨追问/返回存活；Shell 源码无 `window.location` / `router.push|replace|refresh` / `location.reload`；`RESTART` 仍只由显式动作触发。
- **current coords → historical geometry：NO。** `hasHistoricalGeometry = false`、切片 `historical_geometry_status = absent_no_source`；`historical_geometry` surface 恒 `ineligible`（`GEOMETRY_IS_A_CLAIM`）；决策链**不引入任何坐标**；Replan 明确 `currentCoordsLoseHistoricalAuthority = true`。
- **current visual 冒充 historical visual：NO**（`historicalVisualAssets = 0`）。

## 8. tests / typecheck / build / runtime

| 项 | 结果 |
|---|---|
| `pnpm typecheck`（6 workspaces） | **PASS**（含 `apps/web`，0 error） |
| `vitest` 全量 | **199 passed / 4 failed**（共 203） |
| — `tests/experience` | **96/96 PASS**（replan-loop 15 / composition2 25 / renderer 17 / visual-grammar 38 / contract 1） |
| — `tests/data` | 103 passed / **4 failed**（见下） |
| `next build` | **NOT_RUN** |
| 浏览器 E2E | **18/18 PASS**（`scripts/e2e-replan-loop-capture.mjs`） |
| clean runtime | kill 3001 → `rm -rf apps/web/.next` → 单实例 `next dev -p 3001`；最终链路与截图均来自该实例 |

**`BUILD = NOT_RUN` 原因（如实报告）**：本轮架构侧裁决 #3 明示可不跑 `next build`，以免 dev/build 共享 `.next` 触发 TASK-0015-FIX 的「dev server 半死、路由 200 空 body」问题。**本任务的 PASS 不引用 TASK-0015 的历史 build 成功**；构建产物的最终验收留待需要 build 的轮次（须先停 dev、把 `.next` 移出工作区再 build）。

**4 个 data 测试失败 — 环境性，非本任务回归（须透明记录）**：
`tests/data/{evidence-recovery,human-review-s1,knowledge-weave,spatial-grounding}.test.ts` 各自的「重跑幂等」用例，均失败于
`spawnSync <managed node> EBUSY`。根因是本机沙箱**禁止 node 自旋 node 子进程**——该限制**已在本仓库 `CONTEXT.md` 记录在案**（TASK-0010 时期立），与 TASK-0016 改动无关（本任务未触碰任何 pipeline 源码）。属 TASK-0004/0005/0006/0007 管线的既有限制。

## 9. 截图（data/exports，已被 `.gitignore` 覆盖，不入库）

| 文件 | 内容 |
|---|---|
| `data/exports/task-0016-captures/01-followup-before.png` | 追问前：处于 Present（current_map），追问入口可见 |
| `data/exports/task-0016-captures/02-replan-relational.png` | Replan 后：关系历史空间 + `当前坐标在此失去历史定位资格` + 「墨痕的重新判断（不升级·不编造）」卡（判定/已知/未知·缺失/重新规划/下一步） |
| `data/exports/task-0016-captures/03-replan-return-present.png` | Replan 后返回 Present：`当前地理空间 · GCJ-02 原值 · 只代表今天`，Replan 痕迹仍在 |

三张图均已人工查看确认内容正确（非空白、非错误配图）。

## 10. Gates

| Gate | 结果 | 依据 |
|---|---|---|
| CONTEXT_HYGIENE_READY | **YES** | §1 只读清单；未读 MEMORY；无冲突 |
| SESSION_ISOLATION_READY | **YES** | §2 单 worktree/单 dev/`.next` 清理；DB/Legacy zero-write |
| FOLLOWUP_INTENT_READY | **YES** | `verify_historical_relation` + 双对象抽取，确定性 |
| EVIDENCE_DECISION_READY | **YES** | `insufficient_for_confirmation`；只消费 `relationEvidence`，不读答案 JSON |
| REPLAN_PLAN_READY | **YES** | focus / targetSurface / evidenceFocus / uncertainty / E2 / coords-authority |
| EXPERIENCE_PATCH_READY | **YES** | Patch 到持续 ExperienceState；experienceId/sceneIndex 不变、trail 仅追加 |
| EVIDENCE_AWARE_SURFACE_SELECTION_READY | **YES** | `selectReplanSurface` 复用既有选择器 → `relational_space`（非固定 beat） |
| PATCH_NOT_REPLACE_RUNTIME_READY | **YES** | 无 reload/reset；`RETURN_TO_PRESENT` 只关视角，判定痕迹保留 |
| REPLAN_BROWSER_E2E_READY | **YES** | 18/18 PASS（clean runtime） |
| CLEAN_RUNTIME_DELIVERY_READY | **YES** | 截图与链路来自删 `.next` 后的单实例 dev（注：`BUILD = NOT_RUN`） |
| **MOHEN_EVIDENCE_AWARE_REPLAN_LOOP_READY** | **YES** | 关键链路可运行且无 epistemic violation |

## 11. Acceptance A–H

- **A Agent：追问改变 Goal 并 Replan** — YES（intent→decision→plan 真实跑通）
- **B Evidence-aware：证据不足主动降低断言** — YES（不确认、E2 不升 E1、uncertainty 可见）
- **C World action：Replan 真改变 Surface/focus/evidence** — YES（主管到 relational_space；focus/evidenceFocus 落 Patch）
- **D Persistent：不 reset/reload** — YES（experienceId/sceneIndex/trail 保持；no-reload 探针存活）
- **E Spatial honesty：不偷渡现代坐标** — YES（无历史几何、无坐标进入决策、coords 失权）
- **F Reuse：复用 TASK-0015 Surface/Grammar** — YES（RelationalHistoricalSurface V3 原样复用；未改 Visual Grammar）
- **G Clean runtime** — YES（来自 clean dev；build 未跑，见 §8）
- **H Short-session** — YES（未依赖旧聊天/巨大 MEMORY）

## 12. Unresolved / 非阻断记录（§17，不扩 scope）

1. **`tests/data` 4 项幂等用例 EBUSY**：沙箱禁止 node 自旋 node（CONTEXT.md 已记录）。建议由外层 shell 跑两遍比计数作为等价证据，或按既有约定继续豁免。
2. **React duplicate-key 警告**（`console.error` 记录约 15–24 条，逐次运行不同）：§17 列为非阻断。经核查**非本次新增 ReplanCard 产生**（其列表 key 唯一）。仅记录，未扩 scope。
3. **`exp-patchpill`（bottom-left, z-index 25）与底部导航「上一步」按钮下缘重叠**：属 TASK-0013 既有布局，非本任务引入。真实点击按钮中心不受影响（Playwright 实测可点）。仅记录。
4. **ReplanCard 右侧抽屉宽度偏窄**（480px 内两列排布，长句略拥挤）：属观感问题；按 **R-UI 红线**，UI 调整须先出样稿经确认，本轮未擅自改版式。
5. **dev 走查辅助**：Next dev 指示器 `<nextjs-portal>` 固定左下角会拦截底部点击（生产 build 无此元素）；E2E 已显式注入 `nextjs-portal{display:none!important}` 并在脚本内注释说明。

## 13. 施工期一次返工（如实记录）

首次 E2E 暴露出两个真实缺陷，均已修正并复验：
1. **「可回 Present」不能靠场景模式闸门**：起初用 `scene.spatial_mode !== "GEOGRAPHIC_EXACT"` 约束 override，导致追问发生在 s07（当下）时关系空间不出现。改为**显式视角开关** `replanViewActive` + `RETURN_TO_PRESENT` 出口，既让追问即刻改变世界，又保证可回 Present。
2. **两个右侧 fixed 抽屉重叠**：`exp-evidence--patch`（z-index 40）压住 `replan-card`（30），「回到今天」按钮被遮挡点不到（Playwright 超时）。由 `document.elementFromPoint` 一次性定位真因；改为 **Replan 激活时冻结 patch 结果卡让位**——同时满足裁决 #2（不得用冻结结果冒充 runtime 输出）。

## 14. Git / 并行施工

- 施工前 HEAD：`ca9e154`；代码/测试/E2E/CONTEXT 提交：`81c3e73`；本报告随其后提交。
- 提交内容不含 `.next` / PID / 临时探针（诊断脚本 `scripts/_probe_*.mjs` 已删除，`_session_gate_probe.txt` 已删除）。
- 截图位于 `data/exports/**`，遵循既有 `.gitignore` 规则不入库。
- **并行施工 session：无。**

## 15. STOP

TASK-0016 完成，**STOP**。未启动 TASK-0017，未引入通用 LLM Agent / 模型 API / 第二镇 / GIS 重建 / 历史地图 / Video Renderer / 全 MEMORY 清理 / 全 Runtime 重构。
