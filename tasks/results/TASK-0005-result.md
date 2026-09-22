# TASK-0005 Result — Human Review Decisions + S1 Evidence Sprint（金泽样板）

- 状态：**完成 / 待总架构验收**（本任务自身 PASS，但 `READY_FOR_KNOWLEDGE_WEAVE = NO` 为合法结论）
- 执行模式：Agent（直接落库 + 生成报告 + 测试/守卫/构建）
- 未进入 Knowledge Weave / UI / Agent Runtime / Canvas / Discovery Engine（遵守 Forbidden §13）

---

## 1. Human Review Persistence Proof（WP-A）

- 独立表 `human_review_decisions`（migration `202609210003_human_review.sql`，**未修改 001/002**）。
- 6 条 HR 全部落库，`hr_code` 唯一、`on conflict do update` 幂等；`actor=user-confirmed`；`reviewed_at=2026-09-22T01:20:00+08:00`。
- `decision_code`（A/B/C）= 用户编辑决策代码，与 Data Factory `review_tier`（A/B/C）**异义**，独立建表避免混淆。
- HR-5 落地：`visual_assets` 追加 `eligibility_tags`（GIN），本批 20 张资产打 `excluded_from_heritage_primary`。
- 落库脚本：`pipelines/review/persist-human-review.mjs`；日志：`data/exports/jinze-human-review-decision-log.md`。

DB 回读（实测）：

| hr_code | decision_code | status_after | actor | 关键 machine_readable_flags |
|---|---|---|---|---|
| HR-1 | A | candidate | user-confirmed | external_identity_anchor=Q10918454, relation_to_jinze=unproven |
| HR-2 | A | legend | user-confirmed | legend=true, verified_fact=false |
| HR-3 | C | research | user-confirmed | pending=true, batch_part_of=blocked |
| HR-4 | B | candidate | user-confirmed | basis=according_to_local_gazetteer, verified_fact=false |
| HR-5 | A | excluded | user-confirmed | excluded_from_heritage_primary=true, usable_as_historical_evidence=false |
| HR-6 | C | research | user-confirmed | conflict=true, conflicting_values=[1271,1254], silent_override=blocked |

---

## 2. S1 Query Plan（WP-B）

固定 P0/P1，不动态扩展；共 12 个 Phase A 查询 + 8 个 Phase B（instanceInfo，由 Phase A 命中的 8 本方志 work_uri 派生）。主题覆盖：金泽桥梁、水系/桥空间关系、颐浩寺/吕颐浩、金泽小志等地方志、四十二虹桥、赵孟頫传说与生年。详见 `data/exports/jinze-s1-evidence-report.md` §2。

---

## 3. API Configuration Status（不含 secret，§3）

- 配置来源：项目既有 `.env.local`（`SHANGHAI_LIBRARY_API_KEY`），仅经 `process.env` 取用，**未向用户索取、未打印、未截图、未入 Git、未写报告**。
- `source_uri` / manifest 只存不含 key 的端点或 item.uri。
- 连通性：S1 服务可达，全部请求 HTTP 200（含 0 命中响应）。**未触发 Stop Condition**。

---

## 4. Raw / Source / Evidence Counts（WP-C / WP-D）

| 层 | 计数 | 说明 |
|---|---|---|
| Raw snapshots（文件） | 20 | append-only，无 key，可复现 checksum |
| Source Records（S1, 去重后） | 9 | `provider='shanghai-library'`；原始 20 条因 `(provider,checksum)` 去重折叠 |
| Evidence（S1） | 12 | `record` 8 + `text` 4；全部 `candidate` |
| Evidence（全库） | 92 | 含 TASK-0004 遗留 |
| Source Records（全库） | 36 | 含 TASK-0004 遗留 |

- 链路：`API Response → Raw Store(append-only+checksum) → Source Record → Evidence(candidate)`，符合 Task §6。
- 0 命中的预期查询（颐浩寺/普济桥/吕颐浩/四十二虹桥古籍 freetext、赵孟頫/吕颐浩人名规范、8 本方志 instanceInfo）**如实记入，未用低等级来源冒充**。

---

## 5. Key Evidence Findings（均来自实际返回，无 AI 补写）

1. **古今地名变更**：地名志「古名**白苎里**…故名金泽」——直接支撑「白苎里→金泽」演变（explicit spatial change）。
2. **桥乡身份**：地名志罗列「宋元年间建的迎祥桥、普济桥、万安桥」「现存古桥 21 座」+ 方志书目锚点。
3. **镇境区划变迁**：「宣统二年(1910)设置金泽区…1986年撤乡建镇」。
4. **叙事事件素材**：hsly 返回 2 条金泽相关事件（题名/时间/描述），可作 Discovery seed。
5. **核心叙事 claim 缺方志原文**：gj_instances / instanceInfo / kg 均 0 命中，故赵孟頫↔颐浩寺、吕颐浩↔颐浩寺、四十二虹桥的「原文引文级」证据**未获得**。

---

## 6. Relation / Gate Changes（WP-E）

- **HR-2 legend 保持**：赵孟頫↔颐浩寺无任何 `verified`/`published` 关系（violation = 0）。
- **HR-3 不批量 part_of**：`relations` 表 `predicate='part_of'` = 0。
- **HR-4 吕颐浩↔颐浩寺仅 candidate**：相关 4 条关系（crossLink×2 / named_after×1 / mentioned_in×1）全部 `candidate`，无「创建/故宅」谓词。
- **语义关系 evidence 链接**：6 条非结构型关系全部有 `relation_evidence`（跨类型成立）。
- **G3（坐标 Gate）**：fail=15 / pass=38 / pending=116。坐标型证据 15 全部为遗留 seed/上图派生，**S1 本批未新增任何对象级坐标**（符合「不 AI 猜坐标」、WP-E）。
- **S1 证据门禁补全**：为 12 条 S1 证据补齐 G0–G6 gate 审计行（84 行，delete+insert 幂等），修复了「S1 证据未走 gate」的遗漏，使 `recover.mjs` 重跑幂等（详见 §Deviations）。

---

## 7. Unresolved Conflicts

- **HR-3**：四十二虹桥 ↔ 今存七桥/古桥群「同概念集合」未确认，维持 `research`，不批量 `part_of`。
- **HR-6**：赵孟頫生年 Legacy 1271 vs 外部 1254 冲突保留，未静默覆盖，维持 `research`。
- **S1 零命中预期项**：颐浩寺古籍、赵孟頫/吕颐浩人名规范、8 本方志 instanceInfo（卷次/作者）均 0 结果——核心叙事 claim 缺少方志原文支撑。

---

## 8. Readiness YES/NO + Blockers（WP-F）

硬指标逐项 YES/PARTIAL/NO（无综合评分，详见 `data/exports/jinze-vertical-slice-readiness.md`）：

- PARTIAL×1：≥1 usable historical map（S1 新增 0 maps；遗留 18 map 证据未重新核验）
- YES×6：≥3 reliable spatial anchors；≥1 explicit spatial change；≥3 cross-type Evidence-backed semantic relations；≥3 Evidence-backed Discovery seeds；≥1 meaningful Replan opportunity；unresolved critical conflicts listed
- NO×3：≥5 effective visual assets（HR-5 后遗产主视图可用视觉资产 = 0）；≥1 walkable route 3–6 targets；main story thesis sufficient Evidence（核心支柱为 legend/candidate/research）

```
READY_FOR_KNOWLEDGE_WEAVE = NO
```

阻塞项：① 有效视觉资产 = 0（需补充经 provenance 核验且确实属金泽遗产对象的视觉资产）；② 无可步行路线（3–6 观测目标且逐点有坐标）；③ 主叙事缺 verified 方志原文证据；④ 桥群空间变更被 HR-3 阻塞。

---

## 9. Tests / Guards / Build

- **Tests**：`vitest run tests/data/` → **33 passed**（TASK-0005 13 + TASK-0004 10 + TASK-0003 8 + foundation 2）。新增 `tests/data/human-review-s1.test.ts` 覆盖任务书 §11 全部 13 项。
- **Guards**：`guard:docs` → 全部 doc budget OK（exit 0）；`guard:structure` → exit 0。
- **Build / Typecheck**：`pnpm -r typecheck` → 6/6 workspace projects 通过（含 `apps/web`）。`pnpm --filter @mohen/web build` 生产构建已执行（见下方 build 状态）。

> Build 状态：✓ `pnpm --filter @mohen/web build` 通过（**BUILD_EXIT=0**，Next.js 15.5.25，Compiled successfully，4 个静态页生成成功）；`pnpm -r typecheck` 6/6 projects 全绿。

---

## 10. Legacy Proof（§13 禁止修改 Legacy）

- `D:/work Buddy/2026-08-23-23-12-38/hushang-jingwei/data/seed.master.json`
  - 执行前 size/mtime = `10721985 / 1789635108668`（测试加载时快照，与收尾比对一致）。
  - **运行期间 size/mtime 未变 → Legacy 零写入。**
- 管线扫描：`pipelines/**/*.mjs` 中无任何写向 `LEGACY_SEED/LEGACY_REPO/hushang-jingwei/seed.master.json` 的语句（测试 12 校验通过）。

---

## 11. Deviations（偏离 / 补救）

- **偏离**：`retrieve-s1-jinze.mjs` 初版仅入库 S1 证据、未走 G0–G6 gate，导致 `recover.mjs` 重跑时对新证据产生新增审计行、破坏 TASK-0004 test 8 幂等。
- **补救**：① 在 `retrieve-s1-jinze.mjs` 落库后新增与 `recover.mjs` 完全一致的 delete+insert gate 审计块（前向正确）；② 对已入库的 12 条 S1 证据执行一次性审计补齐（84 行，幂等）。重跑 `vitest run tests/data/` 后 **33 项全绿**（含 TASK-0004 test 8）。
- **未偏离红线**：未猜坐标、未猜史料原文、未猜关系；legend 保持 legend；HR-3/HR-6 保持 pending/research；20 张错误视觉资产未进 heritage-primary；无 secret 入 Git/日志/报告；未进入 Knowledge Weave。

---

## 12. Git Commit / Status

- 待提交（选择性 add，不包含 build 产物 / `.env.local` / `data/exports/**`）：
  - `supabase/migrations/202609210003_human_review.sql`（migration）
  - `pipelines/ingest/retrieve-s1-jinze.mjs`（S1 检索 + gate 审计）
  - `pipelines/review/persist-human-review.mjs`（HR 落库）
  - `tests/data/human-review-s1.test.ts`（TASK-0005 测试）
  - `tasks/TASK-0005-human-review-s1-evidence.md`（任务书）
- 不提交：`apps/web/.next/`、`apps/web/tsconfig.tsbuildinfo`、`data/exports/**`（gitignored）、`.env.local`（gitignored）。
- 提交后 `git status` 应 clean（除 gitignored 与未跟踪的 build 产物）。
- `git diff --check` 无空白错误。

---

> 下一步：本任务已 STOP，不自行进入 TASK-0006 / Knowledge Weave / UI。结果交回墨痕 Agent 2.0 总架构验收。
