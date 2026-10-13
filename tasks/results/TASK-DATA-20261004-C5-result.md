# TASK-DATA-20261004 · C5 结果记录（外部扩源 · R19 闸门后）

- **任务书**：`tasks/TASK-DATA-20261004_数据底座建厚实_Task-Book_V1.0.md` · C5
- **执行**：2026-10-05 06:33 起跑 → 06:38 写库完成（本地 +08:00；UTC 22:35→22:38）
- **模型**：HY3（C4 完成时刻 01:30 <23:00 → 首选 HY3；本会话为 HY3，模型校验闸门一致 → 已续跑）
- **Registry 作业**：
  - `unattended.external-identity`（kind=`extid`；Skill：`mohen-data-ingest`；Entry：`pipelines/legacy/unattended-runner.mjs`）
  - `unattended.external-visual`（kind=`extvis`；Skill：`mohen-visual-asset`；Entry：同上）
- **模式**：DRY_RUN 3 次（首跑 UA 故障／修复后／发现式查询改进后）→ `MOHEN_WRITE_ENABLED=true` + `MOHEN_ENV=dev` 实跑
- **本轮 run**：`ingest_run_id = 1fdbbccb-bd43-47a0-988e-b684cc3280f0`
- **零自动晋级**：published 实体 **0** · verified 证据 **0** · auto 分诊 **0**（全库）· 本批 confirmed 链接 **0**
- **S3 裁决遵守**：身份线 **Evidence = 0**（Wikidata 不得生成历史事实 Evidence，只产线索与候选）

---

## 1. R19 闸门判定（先证明老项目价值，再扩源）

闸门要求：用 C1–C4 结果证明老项目已产可信数据。判定依据全部来自真库查询（执行 C5 前）：

| 闸门指标 | 实测（C1–C4 累计） | 判定 |
|---|---|---|
| 证据量 | `evidence` 12913 条，其中本任务线产 **5729**（C1 4812 + C4 692 + N03 225） | ✅ |
| 证据可定位性 | locator 完整率 **12913/12913 = 100%** | ✅ |
| 候选量 | `entities` 候选 **3041**（C2 · `unattended-ce:*`） | ✅ |
| 关系量 | `relations` **3444**、`relation_evidence` **13091**（C2+C3） | ✅ |
| 图像链接 | `visual_entity_links` **916**（C4） | ✅ |
| 零自动晋级 | published=0、verified=0、近 3 日 auto 分诊=0 | ✅ |
| 冻结项 | 1246 图 `visual_assets` 1325/68 前后不变（C4 零 UPDATE） | ✅ |

**闸门结论：通过**。老项目已证明其"候选供给能力 + 可追溯性"——注意这里证明的是**候选层**价值，不等于 Truth 已晋级（无任何自动晋级），与 R15 一致。

---

## 2. 完成判定（对照任务书 C5）

| 验收项 | 结果 | 证据 |
|---|---|---|
| 闸门前置达标判定先过 | ✅ | 见 §1；`guard:*` 全绿 |
| 扩源走 `production-registry.json` 登记 + `implementation` 三向绑定 | ✅ | 新增 2 条目（全 required_fields + `implementation`）；`guard:registry` entries=17 unresolved=0 |
| 每个新源按 R26 登记 skill + entry，不新建散落脚本 | ✅ | 复用 runner Entry；`skills/mohen-data-ingest`、`skills/mohen-visual-asset` 实体化档案补作业行 |
| `guard:registry` / `guard:source-gate` 绿 | ✅ | entries=17 queued=109 unresolved=0；provider resolved=23/23 unknown=0 |
| 新源 evidence 带 `review_queue` 三分 | ✅ | 本批三分 740 条（身份线 320 ＋ 视觉线 420），全部 `hold`/`reject`，auto=0 |
| 底座来源数与规模显著增厚，每源可溯源可回滚 | ✅ | 新来源 13 条（Wikidata 7 ＋ Commons 6），每批一次查询＝一条 source_record ＋ Raw 快照；回滚按 `legacy_source` / `legacy_id` 前缀定位 |

---

## 3. 执行摘要

### 3.1 `unattended.external-identity`（身份线）

| 指标 | 数值 |
|---|---|
| 种子（库内字典 149 ＋ C4 待补清单 14） | **163** |
| SPARQL 批次 | **7**（6 个种子批 + 1 个发现式查询），HTTP 失败 **0** |
| 外部返回候选 | **366** |
| 地域/类型拒收 | 地域 **163** · 类型噪声 **34**（合计 197，占比 54%） |
| 与库内对象精确同名对齐 | **10** |
| 库内原本没有的外部对象候选（新建） | **151**（place 44 / building 36 / unknown 71） |
| 同名多义不自选边（HOMONYM_CONFLICT） | **8** |
| 交视觉线的 P18 文件 | **142** |
| 落库 | entities **151** · legacy_mappings **161** · source_records **7** · 三分 **320** · **Evidence 0** |

### 3.2 `unattended.external-visual`（视觉线）

| 指标 | 数值 |
|---|---|
| 请求文件 / 取回页面 | **142 / 142**（6 批，HTTP 失败 0） |
| 图像候选 `visual_assets` | **140**（另 2 张与既有 URL 重复，跳过） |
| 图-实体链接 | **140**（一律 `suspected`，必带 `link_evidence_id`） |
| 图像证据 `evidence` | **140**（locator 完整率 100%） |
| 门禁审计 | **840**（visual_asset G0/G1/G3/G4 × 140 ＋ evidence G0/G4 × 140） |
| 三分 | **420** · 来源登记 **6** |
| 许可 | 逐文件记录，未知 **0**（CC BY-SA 3.0 84／CC BY-SA 4.0 25／CC BY 2.0 7／CC BY 4.0 5／GFDL 4／CC BY 3.0 5／PD 6／其他 4） |
| 古今判定 | current 133 · historical 3 · unknown 4 |

### 3.3 全库前后对照

| 表 | 前 | 后 | 增量 |
|---|---|---|---|
| `source_records` | 304 | **317** | +13 |
| `entities` | 6594 | **6745** | +151 |
| `evidence` | 12913 | **13053** | +140 |
| `visual_assets` | 1325 | **1465** | +140 |
| `visual_entity_links` | 916 | **1056** | +140 |
| `legacy_mappings` | — | — | +161（身份线）+140（视觉线） |

---

## 4. 本阶段的关键设计（三条硬规则，全部来自实测）

1. **地域必判，且行政归属优先于坐标。**
   实测：`普济桥` 在 Wikidata 命中 4 项——青浦金泽 Q63139356／苏州 Q11089802／德清 Q102124741／维基消歧义页 Q16072121。
   规则：有 P131 时以 P131 属上海为准；无 P131 才用上海外接矩形补漏；两者皆无 → 拒收。
   **为什么坐标不能翻案 P131**：矩形必然覆盖江苏太仓、浙江嘉善一带；首跑允许坐标覆盖 P131，实测收进 1 条「太仓直隶州」（已在 §5 如实记录，规则已于同日收紧）。
2. **图像必须由身份指认，不得由文本检索发现。**
   实测：Commons `search=金泽` 的 Top3 全是**日本石川县金泽市**（Kanazawa Castle Park／Neighborhood in Kanazawa／金沢人口分布图）。故视觉线只按 Wikidata P18 声明指认的 File 标题取回，把 Commons 当**取回通道**而非**发现手段**——这是 2026-08-29 geosearch 教训的同类防线。
3. **Q-id 只是候选线索，不写 Evidence。** 来源表对 Wikidata 的裁决是 S3（仅现代空间）+「Q-id 不得单独支撑断言」，因此身份线一行 Evidence 都不写（实测 `evidence where extraction_method='unattended-external-identity'` = 0），只写 `legacy_mappings` 与外部对象候选。

**另：本批次是首个「事前声明」批次**（`retrospective=false`）——2026-10-05 依任务书 C5 登记采集意图后才开始抓取，`forward_declaration` 机制首次真实生效，而非事后补写。

---

## 5. 修掉的真实缺口（本轮踩到并修掉的 5 个）

1. **中文 User-Agent 让 6 批查询全部空转**：HTTP 头是 ByteString，含中文在 `fetch` 阶段即抛 `Cannot convert argument to a ByteString...`；错误被重试逻辑吞成「查询失败」，7 批全部 0 返回。修法：UA 改纯 ASCII，并把这个坑写进代码注释。
2. **批次来源错位风险（潜在）**：视觉线原按 `rawBatches` 顺序取 sid，一旦某批请求失败，后一批的文件会挂到前一批的 source_record 上——正是 2026-10-02「727 张图挂错 provenance」的重演。修法：按 `batchIdx` 对齐，失败批直接不写下游行。
3. **发现式查询不取 P131/P31 → 85% 新候选类型未知**：首跑 121 个新对象中 103 个 `entity_type=unknown`。修法：发现式查询补 `OPTIONAL {P131}` / `OPTIONAL {P31}` → unknown 由 103 降到 71，place/building 由 18 升到 80。
4. **同名不同写法会造出第二个实体**：库里有「金泽镇」而外部标签是「金泽」，按片段字典匹配不到 → 凭空多一条候选。修法：加全名精确索引（外部标签 == `canonical_name` 即对齐）+ 批内已建名字去重。
5. **拒收项进不进人审队列**：首版给地域拒收也排 `review_queue`——那是几百条「根本不在我们世界里的对象」，纯人工债务（协议 §3.3）。修法：拒收只计数不排队，真正需要人判断的（同名多义）才排队。

---

## 6. 已知限制与偏差（诚实记录）

1. **地域判定的矩形宽松（已收紧，遗留 1 条）**：首批（收紧前）收进 1 条「太仓直隶州」类邻省项（坐标落在上海外接矩形内）。规则已改为「有 P131 以 P131 为准」，后续批次不会再收；遗留 1 条随本批候选一起处于 `candidate` + HOLD，待人审筛除。
2. **`entity_type` 仍有 71 条 unknown**（占比 47%）：外部条目未声明 P31 时不猜类型（判不出就 unknown，不冒充 building/place）。
3. **外部对象以上海市域文保为主**：发现式查询（P1435 + 上海行政区）带来大量外滩/徐汇/黄浦的历史建筑（实测抽样：百老汇大厦、百乐门舞厅、沉香阁、崇明学宫、董家渡圣方济各沙勿略堂、福泉山遗址…）——对「沪上经纬」全域是增厚，对金泽单镇的针对性弱于 C1–C4。金泽/青浦相关项在首批中为个位数。
4. **身份对齐仅 10 条**：库内对象名与 Wikidata 中文标签写法差异较大（如「金泽镇」vs「金泽」），精确匹配召回有限；未做模糊匹配——模糊匹配正是「苏州普济桥」类误挂的来源，宁可少对齐也不误对齐。
5. **人物信号为 0**：本阶段不做人物识别（外部条目的人物属性未纳入），不硬猜。
6. **`pnpm test` 22 failed / 245 passed**，与 C4 基线完全一致（无新增）；`real_db_untouched=YES`，真库一行未动。失败项均为冻结基底计数漂移类断言（ESC-05 ③ 待裁决），C5 未改动测试代码与被断言表。
7. **未提交**：C5 变更保持在工作区（与 C1–C4 同惯例），未执行 `git commit`。

---

## 7. 变更文件

| 文件 | 变更 |
|---|---|
| `specs/data-production/production-registry.json` | 新增 `unattended.external-identity`、`unattended.external-visual`（全 required_fields + `implementation` 三向绑定） |
| `pipelines/legacy/unattended-jobs.mjs` | PRODUCTION 增两个作业（身份线在前，视觉线依赖其 handoff） |
| `pipelines/legacy/unattended-runner.mjs` | 新增外部取回层（`httpJson`/`snapshotExternal`）、`jobExternalIdentity`、`jobExternalVisual`、地域/类型判定、preflight 放行、RUNNERS 挂载、acquisition 门禁断言 |
| `pipelines/legacy/unattended-report.mjs` | 新增 `analyzeExternalImpact` / `renderExternalImpactHtml`；CLI `--stage C5` |
| `specs/data-production/acquisition-intents.json` | 新增 2 条**事前声明**采集意图；为既有 `wikidata` 追溯条目加 `metadata_kind_excludes` 防重复命中 |
| `data/fixtures/source-providers.json` | `wikidata` / `wikimedia_commons` 回填首次真实取回日期与失败经验（同名异地、同名混淆两条实测教训） |
| `skills/mohen-data-ingest/SKILL.md` | 实体化档案补 `unattended.external-identity` 作业行 + C5 要点 |
| `skills/mohen-visual-asset/SKILL.md` | 实体化档案补 `unattended.external-visual` 作业行 + C5 要点（P18 指认 / 逐文件许可） |
| `tasks/results/TASK-DATA-20261004-C5-impact.html` / `.json` | C5 下游转化支撑可视化报告（同源生成） |

---

## 8. 守卫与测试

| 守卫 | 结果 |
|---|---|
| `guard:registry` | entries=17 queued=109 runnable=109 **unresolved=0** |
| `guard:source-gate` | providers=17 db_providers=23 **resolved=23 unknown=0** |
| `guard:acquisition` | intents=28 db_rows=317 **resolved=317 unresolved=0**（新增 2 条事前声明意图均命中） |
| `guard:promotion` | **violations=0**（entities/relations/evidence 已标可用均为 0） |
| `guard:triage` | hold=24413 reject=2953，研究长尾分诊=0（未制造人工债务） |
| `guard:research` | truth_leak=0、mention_fake_entity=0 |
| `guard:naming` / `guard:identifiers` / `guard:structure` / `guard:links` / `guard:docs` / `guard:escalations` | 全绿（ESC 计数仍为 6，未新增） |
| `pnpm test` | 22 failed / 245 passed，与 C4 基线一致；`real_db_untouched=YES` |

---

## 9. 下一步（C6 · 验收与常态化）— Auto-Chain 已续跑

- C5 完成判定全部满足（闸门 + 可视化报告 + 守卫全绿 + 零自动晋级）。
- **模型闸门**：C6 起跑时刻 2026-10-05 08:50（+08:00）<23:00 → 首选 HY3；本会话为 HY3，一致 → **本会话直接续跑 C6**，不新开对话。
- C6 范围（任务书）：B 组库层强制（R15 第二批晋级闸门、审计覆盖 `cultural_*`、状态机收敛）、E 组标识符（`canonical_name` 重名 resolution、provider 归一基线 22/22 保持）、§15.3 五判定全过、`unattended.*` 作业 DRY_RUN 跑通且 unresolved=0。
- 待拥有者裁定（不擅自动）：ESC-02 双 relation 存储合并、ESC-03 `modern_location` 建表、ESC-05①③、1246 批内 34 张 excluded 金泽 Commons 图是否恢复。
