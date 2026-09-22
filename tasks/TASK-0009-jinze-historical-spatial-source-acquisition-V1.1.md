# TASK-0009 --- Jinze Historical Spatial Source Acquisition

**Status:** READY\
**Scope:** Jinze only\
**Depends on:** TASK-0008 PASS (`034dfb2` + `ae185a4`)\
**Execution model:** one WorkBuddy task, sequential, no parallel task\
**Stop rule:** complete this Task and STOP. Do not start TASK-0010.

## 0. Architect acceptance carried forward

TASK-0008 is accepted as PASS with `VISUAL_EVIDENCE_READY=PARTIAL`.

Frozen facts entering this task: - effective heritage visuals = 8, all
modern/current; - historical/archive visuals = 0; - 14 SHL visual leads
remain `unconfirmed` because caption/date/artist/depicted_period are
absent; - `HISTORICAL_MAP_READY=PARTIAL`; - SHR-01...06 remain frozen
exactly as persisted; - HR-1...HR-6 remain separate and frozen; -
published = 0; - audit orphan baseline = 63; - Legacy remains read-only.

Architect rulings: 1. TASK-0008 HR-5 scope repair is **accepted**. Batch
identity must be based on the reviewed Legacy batch/provider, not
"anything hosted on Commons". 2. The stale absolute-count tests were
correctly changed to invariant tests. Do not restore snapshot-count
assertions. 3. The SHR overlay overwrite defect is real. This Task may
perform the **minimal prerequisite repair in §2 only** before
acquisition. 4. Do not change any epistemic status merely because a
map/image looks plausible.

## 1. Goal

Acquire and audit the strongest obtainable primary/near-primary
historical spatial sources for Jinze, prioritizing material that can
support:

`historical map/page → Jinze/local feature visibility → spatial anchors/relations → later Map Gate review`

This Task is **source acquisition and audit**, not georeferencing.

The central question is not "can we find an old map?" but:

> Can we obtain auditable historical source assets that depict Jinze
> itself, its local water network, or defensible nearby spatial anchors
> at a scale useful for later historical spatial reconstruction?

## 2. Phase 0 --- prerequisite stability repair (narrow authorization)

Before any acquisition:

Repair only the known overwrite defect in:
`pipelines/ingest/retrieve-amap-jinze.mjs`

Current bad behavior: `region_json = excluded.region_json`

Required behavior: preserve existing human-review overlay while
refreshing machine/provider fields. Use the smallest semantically
correct JSONB merge/update. Do **not** blindly choose merge direction:
verify that provider refresh updates machine fields while
`region_json.human_review` survives.

Required regression test: 1. persist SHR overlay; 2. rerun AMap
retrieval/replay; 3. assert SHR-01/03/04/05 effective statuses still
exist and are unchanged; 4. assert refreshed automated/provider fields
still update; 5. `check-shr-overlay.mjs` passes.

After this fix, remove the operational requirement that every AMap
replay must be followed manually by `persist-spatial-review.mjs`, while
retaining that script as idempotent recovery/persistence tooling.

No other cleanup in Phase 0: - do not normalize provider labels; - do
not repair audit ledger architecture; - do not refactor review
subsystem; - do not touch Legacy.


## 2A. Phase 0B — Legacy 上海文化总库 provenance recovery（新增，必须先做）

**目的：** TASK-0008 的 14 条上图 `identity_unresolved` 不能只在当前开放数据返回字段里打转。老项目已经实际使用过上海文化总库（SCC / whzk / memory）影像，并留下抓取索引与筛选脚本。本阶段先恢复这条 provenance 链，再决定 14 条是否真能转成历史影像证据。

### 2A.1 Legacy 只读审计

Legacy 永久只读。先检查以下已知线索，不得修改：

- `scripts/build_seed.py`
  - 已知引用外部索引：
    `D:\上海图书馆开放数据竞赛资料\guzhen_data\shanghai_culture_images\image_index.json`
  - 注释称该索引约 281 张“上图文化总库”影像，并读取 `keyword` 与 `source.file_url`。
- `scripts/select_town_hero_20260908.py`
  - 已知把上海文化总库 `img.library.sh.cn / whzk` 作为来源，并使用 `_topic ∈ {市镇与建筑, 镇档案, 上海图册}`。
- `scripts/fix_r0_batch_whzk_20260907.py`
  - 已知曾处理“金泽 whzk 图配错实体”的问题，说明旧流程存在 SCC 影像命中，但“命中”不等于对象身份正确。

首先确认：
1. 上述外部 `image_index.json` 是否仍存在于本机；
2. 是否还有同目录 raw JSON / response / downloaded images / metadata cache；
3. 旧索引每条实际有哪些字段；
4. `file_url` 是否能反推出 SCC 记录页、记录 ID、collection/topic、原始题录；
5. 旧项目中哪些 Jinze SCC 资产与 TASK-0008 的 14 条 SHL unresolved 资产 checksum / URL / record ID / filename 相同或可交叉对应。

**禁止：**
- 把旧项目的镇级 keyword 匹配当成对象级身份；
- 把 hero 选图结果当成历史证据；
- 因“来自文化总库”就自动判 historical；
- 修改 Legacy 或旧外部索引。

### 2A.2 SCC / 上海文化总库定向元数据恢复

官方入口：
`https://scc.library.sh.cn`

本阶段允许对 SCC 做**定向、有限、可审计**的查询/记录页检查，目标是题录恢复，不是泛图像爬取。

优先检查栏目/知识域：
- 老照片
- 上海地名志
- 建筑
- 文化年谱
- 与“市镇与建筑 / 镇档案 / 上海图册”对应的资源集合（若站点实际存在）

查询词按对象与历史地名展开：

P0 objects:
- 金泽
- 金泽镇
- 金澤
- 万安桥 / 萬安橋
- 普济桥 / 普濟橋
- 迎祥桥 / 迎祥橋
- 林老桥 / 林老橋
- 颐浩寺 / 頤浩寺 / 颐浩禅寺
- 如意桥 / 如意橋
- 天王阁桥 / 天王閣橋
- 天皇阁桥 / 天皇閣橋
- 金泽放生桥 / 金澤放生橋

Spatial/historical terms:
- 白苎里 / 白苧里
- 金溪
- 枪开河 / 槍開河
- 蔡浜
- 急水港
- 淀山湖 / 澱山湖
- 金泽塘 / 金澤塘
- 金泽古镇 / 金澤古鎮

对每个有效 SCC 候选，尽量恢复并保存：
- SCC record/catalog ID
- record page URI
- image/file URI
- title/caption
- collection/topic
- creator/photographer/artist（若有）
- creation/capture date（若有）
- depicted place/object
- publication/source album/book/newspaper（若有）
- description/notes
- rights/license/use statement
- adjacent record / page / album context（若可合法访问）
- retrieval timestamp
- raw response/page checksum

### 2A.3 “历史性”判定规则

**artist/作者不是历史性成立的必要条件。**

一件 SCC 影像可被认定为 `historical_or_archival_visual_candidate`，至少需要：

A. **身份成立**：题名、caption、目录、原册上下文或其他文献元数据足以识别金泽/具体对象/可辩护场景；且  
B. **时间成立**：有可审计元数据支持拍摄/制作/刊载年代或可约束的 depicted period。

时间证据可来自：
- 明确拍摄/制作日期；
- 原始出版物/相册/档案卷宗的日期；
- 馆藏题录给出的年代范围；
- 可审计的原册上下文所限定的时间范围。

不得来自：
- SCC 上传日期；
- 当前 API 检索日期；
- 文件创建时间；
- “看起来很老”；
- AI 视觉判断；
- 黑白照片这一视觉特征本身。

若身份成立但时间不成立：
`identity_confirmed_time_unresolved`

若时间成立但具体对象/地点不成立：
`historical_period_confirmed_identity_unresolved`

只有 A+B 都成立，才可进入历史视觉 Evidence 候选。

### 2A.4 与 TASK-0008 14 条 unresolved 的强制 crosswalk

在进入本 Task 的 P0 历史地图抓取前，先对 TASK-0008 的 14 条 SHL unresolved 做一次 SCC crosswalk：

匹配优先级：
1. stable record/catalog ID
2. exact source/file URI
3. exact checksum
4. exact filename + collection context
5. deterministic metadata combination

perceptual/image similarity 只能生成 `possible_match`，不能 confirmed。

输出每条：
- `task0008_visual_asset_id`
- `scc_record_id`
- `match_basis`
- `identity_status_before/after`
- `time_status_before/after`
- `historical_status_before/after`
- `new_evidence_id`
- `review_required`

若 14 条与旧 SCC 索引完全不是同一批，也要明确记录 `NO_CROSSWALK_MATCH`，不能强行对应。

### 2A.5 本阶段输出

新增：
- `data/exports/jinze-scc-legacy-provenance-audit.md`
- `data/exports/jinze-scc-visual-crosswalk.csv`
- `data/exports/jinze-scc-historical-visual-candidates.md`

若 SCC 站点结构/API 未知：
先从 Legacy 中恢复已有请求/URL/ID 规律；仍无法确定时 STOP 该子阶段并记录，不得逆向绕过访问控制。


## 3. Source priority and exact acquisition list

### P0-1 --- 1879 光绪《青浦县志》图组

Locate the best legally accessible original/high-resolution scan. Prefer
institutional/Commons/NLC-derived original assets over screenshots or
OCR pages.

Must locate and extract, if present:

1.  `青浦县全境图`
2.  `青浦县乡保镇汛图`
3.  `青浦县东北境水道图`
4.  **`青浦县西南境水道图`**
5.  **二里半方图 `三排四号：枪开河、金泽、蔡浜`**
6.  Adjacent grid sheets to 三排四号 where available:
    -   三排三号
    -   三排五号
    -   二排四号
    -   四排四号
7.  Corresponding 图说 / 制图说明 pages.

Known discovery leads from architect research: - Wikimedia Commons:
NCPSSD-70000948 光绪《青浦县志》第一册 PDF. - Search Commons for the
high-resolution combined volume titled approximately:
`（光緒）青浦縣志 - 光緒五年 (1879) - 卷00-18.pdf` - CText and 识典古籍
may be used for page/title locating, but must not replace the original
scan asset when a higher-quality original is obtainable.

**Highest-value target of this entire task:**
`1879 二里半方图 · 三排四号：枪开河、金泽、蔡浜`

If obtained and legible, mark: `BREAKTHROUGH_CANDIDATE` Do not
automatically set Map Gate YES.

### P0-2 --- 1788 乾隆《青浦县志》

Acquire the public-domain high-resolution complete scan where legally
accessible.

Known lead: Wikimedia Commons file titled approximately:
`（乾隆）青浦縣志 - 乾隆五十三年 (1788).pdf`

Build an index of all map plates (historical catalog evidence indicates
\~20 maps; verify from the asset rather than trusting the number).

Prioritize: - 县境/疆域图 - 淀山湖相关图 - 吴淞江/江湖/水系相关图 - any
sheet depicting 金泽/金澤 or its immediate historical container.

Do not OCR the entire 1000+ page volume as a default. Locate map
sections first; OCR/text search may assist page finding only.

### P0-3 --- 1934 民国《青浦县续志》

Acquire/locate the best legal complete scan and identify the map
volume/plates.

Known lead: Wikimedia Commons category `青浦縣續志`, with 1934
scans/full-volume candidates.

Search map pages and captions for: - 金泽 / 金澤 - 金泽区 / 金泽乡 -
淀山湖 / 澱山湖 - 急水港 - 八门荡 / 八門蕩 - 枪开河 / 槍開河 - 蔡浜 -
吴江界 / 吳江界

Export every map that directly depicts Jinze or a defensible local
spatial container.

### P0-4 --- 1597 万历《青浦县志》

Authoritative existence lead: 青浦区档案馆 description states the
edition includes 图考 / 乡保区图 / 市镇 / 桥梁 / 水利 material.

Find legal digital copy/catalog/scan.

Targets: - 图考 - 乡保区图 - 金泽市镇 entry - 金泽 bridge entries -
water-conservancy pages relevant to 金泽 / 淀山湖 / 急水港

If no digital asset is obtainable, record: `CONFIRMED_EXISTENCE` with
the authoritative existence evidence and next human acquisition action.

### P0-5 --- 1669 康熙《青浦县志》

Same discipline as P0-4.

Targets: - 图形 - 乡保区图 - 市镇 - 桥梁 - 水利 - any Jinze/local
water-network page.

No "not found = nonexistent".

## 4. P1 --- local spatial evidence corpus

Only after every P0 target has an explicit state.

### P1-1 《青浦水利志》(2006)

Locate legal open/catalog access and identify: - water-system maps; -
青西 water network; - 金泽河道 / 金泽塘 / 市河; - 急水港 / 太浦河; -
polder/圩区 maps; - historical river-network treatment maps; -
bridge/waterway relations.

If access requires purchase/login not already authorized:
`CONFIRMED_EXISTENCE / ACCESS_REQUIRED`. Do not buy or bypass.

### P1-2 1990《青浦县志》

Locate/index: - 水系图 - 水利圩区分布图 - 交通图 - 政区图 - 地面高程图 -
金泽镇 / 普济桥 / 古桥 visual or map material.

Treat as later-period comparison evidence, not Qing/Ming
historical-state evidence.

### P1-3 文保/古桥测绘

Audit legal public material for: - 万安桥 - 普济桥 - 迎祥桥 - 林老桥 -
如意桥 - 天王阁/天皇阁桥 - 金泽放生桥 - 颐浩寺遗址

Priority sources: - 青浦博物馆 / 青浦区政府 / 文旅部门; -
上海交通大学建筑文化遗产保护国际研究中心 迎祥桥测绘/保护修缮资料; -
《青浦古桥：江南古桥之萃》; -
《水乡遗韵：上海市青浦区第三次全国文物普查图录》.

Modern survey drawings are `modern_survey_geometry`, never historical
maps.

### P1-4 金泽历史文化风貌区保护规划

Locate official text/attachments: - protection boundary; - historic
buildings; - traditional streets; - waterways; - heritage points; -
historic spatial pattern diagrams.

These are modern interpretive/planning sources.

## 5. P2 --- international / archival leads

Only after P0/P1 explicit states. No broad unbounded crawl.

### P2-1 OldMapsOnline

Use only as discovery/index. Trace useful candidates back to original
holding institution.

Check candidates covering approximately Jinze/Qingpu-west and historical
spellings: - Jinze - Chin-tse - Chin-tse-chen - Kinze - Kin-tse -
Tsingpu - Tsing-pu - Ch'ing-p'u - Dianshan / Tienshan Lake

Candidate families: - Shanghai & neighbourhood, GSGS 2386, c.1908 -
Shanghai area, GSGS 3837, c.1927 - Shanghai/district road maps c.1930s -
Jiangnan regional sheets.

### P2-2 1862 太平天国时期英军太湖平原测绘

Treat as `RESEARCH_LEAD` until a concrete map title/archive/shelfmark is
found.

Use the scholarly lead on British surveying in the Taihu plain to
extract: - map title; - date; - archive/holding institution; -
shelfmark/catalog ID; - geographic coverage.

Only then acquire the original map if legally accessible. Do not infer
that "Qingpu" automatically means Jinze.

### P2-3 targeted institutional catalogs

Search only targeted catalog queries in: - Library of Congress - David
Rumsey Map Collection - Internet Archive - Harvard Map Collection - Yale
/ Beinecke - British Library - National Library of Scotland - National
Diet Library Japan - Wikimedia Commons

Only ingest candidates with plausible Qingpu-west/Jinze coverage.

## 6. Historical-source second-pass cross-check for TASK-0008 visuals

The primary SCC/Legacy crosswalk is already executed in §2A.

After P0/P1 historical map/gazetteer/catalog acquisition, perform **one second-pass documentary cross-check** for any still-unresolved TASK-0008 visual:

- reuse existing visual/source identifiers;
- compare against newly acquired gazetteer/map/catalog page context;
- look for catalog IDs, captions, album/collection titles, creator/date, printed page, or adjacent-page context;
- documentary metadata can resolve identity/time;
- image similarity alone cannot.

Do not start a new general image crawl here.

## 7. Raw Store

Use: `D:\MoHen\data\raw\historical-spatial\jinze\`

Recommended folders: - `1597-wanli-qingpu` - `1669-kangxi-qingpu` -
`1788-qianlong-qingpu` - `1879-guangxu-qingpu` -
`1934-republic-qingpu` - `modern-water-conservancy` -
`heritage-survey` - `planning` - `international-maps` - `research-leads`

Every acquisition run must preserve: - original downloaded
asset/response; - source URI; - holding institution/provider; -
retrieved_at; - rights/license or `rights_pending`; - checksum; -
original page number / printed page where known; - pixel dimensions for
extracted images; - extraction derivation from original page.

Raw is append-only. Derived crops must never replace originals.

## 8. Historical map candidate semantics

For every map/page candidate record:

-   `candidate_id`
-   `title`
-   `edition`
-   `year`
-   `creator`
-   `holding_institution`
-   `provider`
-   `source_uri`
-   `rights_license`
-   `retrieved_at`
-   `raw_path`
-   `checksum`
-   `original_page`
-   `printed_page`
-   `pixel_dimensions`
-   `geographic_scope`
-   `jinze_visibility = yes/no/uncertain`
-   `jinze_label_as_printed`
-   `nearby_features`
-   `waterways_visible`
-   `bridges_visible`
-   `streets_visible`
-   `temples_visible`
-   `scale_if_known`
-   `orientation_if_known`
-   `coordinate_reference = none/unknown/known`
-   `usage_mode_candidate`
-   `confidence`
-   `notes`

Allowed `usage_mode_candidate`: - `global_registration` -
`local_registration` - `anchor_points` -
`historical_spatial_reconstruction` - `original_map_narrative` -
`not_usable`

This Task only proposes a mode. It does not execute registration.

## 9. Source-state vocabulary

Every target must end in exactly one primary acquisition state:

-   `A_ACQUIRED` --- auditable original/source asset obtained
-   `B_LOCATED` --- exact online asset located but not successfully
    acquired
-   `C_CONFIRMED_EXISTENCE` --- authoritative evidence proves existence,
    digital asset not located
-   `D_RESEARCH_LEAD` --- credible lead requires archive/catalog tracing
-   `E_SEARCHED_NOT_FOUND` --- searched in this Task, no candidate found

`E_SEARCHED_NOT_FOUND` never means "does not exist".

Also record access substate where needed: - `OPEN` - `ACCESS_REQUIRED` -
`RIGHTS_PENDING` - `DOWNLOAD_FAILED` - `CATALOG_ONLY`

## 10. Map Gate evaluation --- do not lower SHR-06

Frozen criterion: `HISTORICAL_MAP_READY=YES` requires a map that depicts
Jinze itself or yields defensible Jinze spatial anchors.

Macro regional context alone is insufficient.

At end of Task calculate, but do not silently overwrite prior review:

`DIRECT_JINZE_HISTORICAL_MAP_FOUND = YES/NO`

`JINZE_LOCAL_SPATIAL_EVIDENCE_FOUND = YES/PARTIAL/NO`

`HISTORICAL_MAP_GATE_REASSESSMENT_REQUIRED = YES/NO`

If reassessment is required, output a review packet; architect/user will
decide the gate.

## 11. Evidence discipline / hard rules

1.  No AI-generated images or map completion.
2.  No visual similarity as historical identity proof.
3.  No upload/retrieval date as depicted-period evidence.
4.  No modern coordinates projected backward as historical coordinates.
5.  No forced georeferencing.
6.  No inferred bridge/river/street geometry written as verified.
7.  No webpage thumbnail used as source-of-truth if original asset is
    obtainable.
8.  OCR is navigation/extraction assistance, not source replacement.
9.  Modern planning/survey maps remain modern evidence.
10. Name variants remain explicit; do not silently normalize
    天王阁/天皇阁.
11. No cross-town homonym leakage.
12. No HR-5 excluded asset counts as historical heritage evidence.
13. Every new Evidence receives G0--G6 snapshot immediately.
14. Audit orphan must not increase above 63.
15. published remains 0.
16. Legacy zero-write.
17. Raw append-only.
18. No secrets in logs/repo/reports.
19. No UI / Canvas / Agent Runtime / route implementation.
20. No Knowledge Weave epistemic upgrade.
21. No AI reconstruction of historical scenes.
22. No purchase, login bypass, CAPTCHA bypass, access-control bypass, or
    prohibited scraping.
23. Search/query failure must be distinguished from "source absent".
24. Page extraction must retain provenance to original volume/page.
25. P1 starts only after all P0 targets have explicit state.
26. P2 starts only after all P1 targets have explicit state.

## 12. Allowed changes

Allowed: - `pipelines/ingest/retrieve-amap-jinze.mjs` --- §2 minimal
repair only - `pipelines/historical-spatial/**` - `packages/domain/**`
only if existing types cannot represent candidate metadata -
`packages/data-access/**` only if needed for existing DB access
pattern - `tests/data/**` - `skills/mohen-spatial-grounding/**` - new
`skills/mohen-historical-spatial-source/**` if kept within doc budget -
`data/exports/**` - `tasks/results/TASK-0009-result.md` - `CONTEXT.md` -
one new migration only if existing schema genuinely cannot represent map
candidates/provenance without loss

Not allowed: - migrations 001--006 edits - Legacy changes - UI - route -
Agent Runtime - Experience renderer - broad refactor - provider-label
cleanup - audit-ledger redesign - unrelated test rewrites.

If a new migration is needed, explain why before/inside result and keep
it minimal.

## 13. Required outputs

1.  `data/exports/jinze-historical-spatial-source-matrix.csv`
2.  `data/exports/jinze-historical-map-acquisition-report.md`
3.  `data/exports/jinze-historical-map-index-1597-1934.csv`
4.  `data/exports/jinze-manual-acquisition-backlog.csv`
5.  `data/exports/jinze-map-breakthrough-candidates.md`
6.  `data/exports/jinze-historical-map-human-review.csv` only if genuine
    review items exist
7.  Raw Store manifests/checksums
8.  extracted original pages + derived crops where applicable
9.  `skills/mohen-historical-spatial-source/SKILL.md` if created
13. `tasks/results/TASK-0009-result.md`

## 14. Exact result counts

TASK-0009 result must report:

-   P0 targets: acquired / located / confirmed existence / research lead
    / searched-not-found
-   P1 same
-   P2 same
-   total raw files/responses
-   total distinct checksums
-   new Source Records
-   new map candidates
-   new Evidence
-   direct Jinze maps
-   local Jinze spatial maps/pages
-   maps with Jinze label printed
-   maps with defensible Jinze anchors
-   maps suitable for each usage mode
-   rights known / pending
-   14 SHL unresolved visuals: resolved identity / resolved date / still
    unresolved
-   G0--G6 new rows
-   audit orphan before/after
-   published before/after
-   Legacy mtime/hash before/after
-   idempotent rerun counts
-   tests/guards/typecheck/build
-   commit(s)
-   worktree clean status.

## 15. Acceptance

PASS does **not** require finding a perfect town-level map.

PASS requires: - acquisition/search matrix is auditable and bounded; -
P0/P1/P2 sequencing respected; - 1879 "三排四号：枪开河、金泽、蔡浜" is
genuinely pursued to a defensible state; - 1788 and 1934 map sections
are actually indexed from source assets where accessible; - 1597/1669
existence/digital status is explicit; - no false historical
positioning; - no access-control bypass; - Phase 0 SHR overlay
regression is fixed and tested; - all hard rules pass; - repository
clean and STOP.

If a direct/local Jinze map is acquired, mark it
`BREAKTHROUGH_CANDIDATE` and prepare review evidence. Do not
self-approve the Map Gate.

## 16. Stop conditions

STOP and report instead of guessing if: - required credential/access is
unavailable; - source terms prohibit acquisition; - a candidate's
identity requires visual guessing; - a site requires bypassing access
controls; - a major schema redesign appears necessary; - source
acquisition drifts into general web crawling; - historical geometry
would need invention; - Legacy would need modification.

After result is written and committed: **STOP. Do not start TASK-0010.**
