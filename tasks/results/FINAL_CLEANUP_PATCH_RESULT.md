# FINAL_CLEANUP_PATCH_RESULT

- 任务：`TASK_CodeBuddy_Final_Cleanup_Patch_V1.0.md`（小范围收尾修正）
- 执行者：CodeBuddy（按项目拥有者 C0 指令）
- 日期：2026-10-07
- 策略：仅做 A（恢复有价值采集经验 → 新 D01/D02 体系）+ B（清理 package.json 旧 lifecycle scripts）；不做 DB / migration / backfill / re-gating / Phase F-G 重做。

**FINAL_CLEANUP_PATCH = PASS**

---

## 1. 从 GIT_DIFF_BEFORE.patch 保留了哪些知识

只读审阅 `implementation_artifacts/preflight/GIT_DIFF_BEFORE.patch`，提取以下“被覆盖但仍有长期价值”的采集经验（均来自 `data/fixtures/source-providers.json`、`specs/data-production/acquisition-intents.json`、`skills/mohen-visual-asset/SKILL.md` 的 implementation-before 修改）：

- **Wikidata 身份线教训**
  - B-10（coords）：现代坐标以 candidate 入库却 confidence=0、证据空、未进 review_queue → 历史地图锚点一律 HOLD。
  - **同名混淆（2026-10-05 实测）**：按中文名 `普济桥` 检索，至少 4 个同名异项分属不同行政区（青浦金泽 Q63139356 / 苏州 Q11089802 / 德清 Q102124741 / 维基消歧义 Q16072121）→ 强制“P131 ∈ 上海 16 区 或 P625 落上海 bbox”双判定，判不出一律拒收、不自选边。
  - **Q-id 规则**：身份锚点只能作候选线索，不得单独支撑断言（开放编辑库，须回其引用原始出处）。
- **Wikimedia Commons 视觉线教训**
  - B-12（采集范围）：commons-geosearch 半径补抓无地点过滤 → 519 张中金泽仅 6.5%。
  - **同名异地（2026-10-05 实测）**：`search=金泽` 返回 Top3 全是**日本石川县金泽市**（城堡公园 / 人口分布图），与上海青浦金泽无关 → Commons **不得作发现手段，仅作取回手段**（图像须由上游权威身份 P18 指认）。
  - 许可逐文件记录；未知即 HOLD 不晋级。
- **Visual Asset 身份/边界**
  - 图像只按身份取回（P18 指认的 File 标题 → imageinfo），绝不用 Commons 全文检索发现；链接一律 `suspected` 且必带 `link_evidence_id`；以 `DateTimeOriginal` 判古今，现代照片永不冒充历史状态证据。

## 2. 分别迁入了哪些新文件

| 新文件 | 处置 |
|---|---|
| `specs/data-production/source-providers.json` | 上述 Wikidata / Commons 教训**已由 Target Package 固化**（wikimedia_commons、wikidata 条目的 failure_notes + Q-id 规则），本次无需重复改；作为权威出处被引用。 |
| `specs/data-production/acquisition-intents.json` | `external-wikidata-identity-scan` / `external-commons-visual-scan` 两条事前声明批次**已由 Target 固化**，含同名异地 / P18 指认 / 逐文件许可规则；作为权威出处被引用。 |
| `skills/mohen-visual-asset/SKILL.md` | **新增**「Visual Source Boundary」段落：Commons 仅取回不发现、不得仅凭同名认定归属、逐文件许可、链接为候选、古今判定、权威出处。 |
| `skills/mohen-source-intake/SKILL.md`（D01） | **新增**「External Identity Provider Boundary」：Wikidata（S3）Q-id 仅候选线索 + 地域双校验拒同名；Commons 仅取回不发现。 |
| `skills/mohen-material-understanding/SKILL.md`（D02） | **新增**「Visual Reading Boundary」：视觉读取须建立在已识别实体身份上、只从已确认资产做 literal reading、现代照片不读历史、许可未知先 HOLD。 |

→ 经验只进入新 D01/D02 的 source / provider / capability 体系；未触动旧 `public` 数据或任何 migration。

## 3. 哪些旧内容明确没有恢复

以下属于已退出架构，**未恢复**（且在新增规则中明确点名排除）：

`unattended.*`（unattended-runner / -jobs / -report / `unattended.image-link` / `unattended.external-visual`）、`images-*` Registry 作业、Discovery / Directed 双模式、`bridge-to-directed`、`production_mode`、`truth_write_ceiling`、Research Workspace、`old promotion gate lifecycle`、`old triage lifecycle`、`old G0–G6 lifecycle`、old Registry jobs。`mohen-visual-asset` 的 Canonical Entry 仍为 `PENDING_PHASE_D`，未重新绑定旧 entry。

## 4. package.json scripts：KEEP / REMOVE / REBIND

| 动作 | scripts |
|---|---|
| **REMOVE**（active command） | `guard:research`、`guard:promotion`、`guard:triage`（从 script 条目删除，并从 `guard` 串联链删除） |
| **KEEP**（脚本文件作历史参考） | `scripts/check-research.mjs`、`scripts/check-promotion-gate.mjs`、`scripts/check-review-triage.mjs` 三个文件**保留未删**，仅移出 active command |
| **KEEP**（新体系守卫） | 7 个 v3 守卫 + `guard:docs` / `guard:structure` / `guard:source-gate` / `guard:identifiers` / `guard:acquisition` / `guard:reconciliation` / `guard:naming` / `guard:escalations` / `guard:links` / `guard:names`（这些服务于新数据生产契约：来源表 / naming-map / acquisition-intents / identifier-registry，非旧 research/promotion/triage lifecycle） |
| **REBIND** | 无（v3 守卫已指向 `scripts/guards/*`，无需重绑） |

## 5. Active Guard 最终列表

强制保留且可执行（§7）：`guard:registry:v3`、`guard:no-legacy-production-entry`、`guard:stage-handoff`、`guard:physical-model`、`guard:runtime-boundary`、`guard:e2e-completeness`、`guard:cross-layer-write`。
附带保留（与新体系不冲突）：`guard:docs`、`guard:structure`、`guard:naming` 及上述数据生产契约类守卫。
**`guard:research` / `guard:promotion` / `guard:triage` 已从 active 路径移除**——不再要求 Research Workspace 存在。

## 6. tests / guards / build / diff-check 结果

| 项 | 结果 |
|---|---|
| 7 个 v3 guards | 全 PASS（exit 0） |
| `pnpm test:data-production` | 14/14 PASS |
| `pnpm test:phase-f` | 6/6 PASS |
| `pnpm test:phase-g` | 6/6 PASS |
| `pnpm build`（`@mohen/web`） | PASS（exit 0） |
| `git diff --check` | PASS（exit 0；仅 3 条 CRLF 提示，非错误） |

## 7. DB changed = NO

未执行任何 DB migration / schema change / backfill / 数据清理 / re-gating。新 V2 schema 仍为安装后的空状态（24 表 0 行）；旧 `public` 37 表未动。

## 8. hushang-jingwei changed = NO

`git status` 对 `hushang-jingwei` 无任何差异；未读取、未修改。

## 9. push / deploy = NO

未 push、未 merge main、未做任何 Production deploy。

## 10. unresolved risks

1. Wikidata / Commons 的结构化教训本就已被 Target Package 固化进 `source-providers.json` / `acquisition-intents.json`；本 Patch 的补强集中在 3 个 SKILL 的 capability 层规则。若审查期望“从 patch 重新 authorship”，内容已具备（仅来源为 Target 固化），无需返工。
2. `guard:reconciliation` / `guard:source-gate` / `guard:identifiers` / `guard:acquisition` / `guard:escalations` / `guard:links` / `guard:names` 仍保留在 `package.json` 与 `guard` 链中——它们服务于新数据生产契约，非旧 research/promotion/triage lifecycle；按保守清理保留。拥有者可决定后续是否进一步收窄。
3. 本次新增 SKILL 边界规则引用 `PENDING_PHASE_D` 作为 `mohen-visual-asset` 的 Canonical Entry，未恢复任何旧 entry。

---

## 最后动作输出（§12）

- `FINAL_CLEANUP_PATCH = PASS`
- `result_report = tasks/results/FINAL_CLEANUP_PATCH_RESULT.md`
- `git_status_after`（本次相关）：`M package.json`、`M skills/mohen-visual-asset/SKILL.md`、`?? skills/mohen-source-intake/SKILL.md`、`?? skills/mohen-material-understanding/SKILL.md`（其余为先前 dirty tree，未触碰）
- `unresolved_risks`：见上 §10（均为非阻塞性说明）

STOP — 未 push / 未 merge / 未 deploy，结果交回 ChatGPT 审查。
