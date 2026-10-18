# 数据生产作业样板试验 · 金样本包（抽定冻结）

> 日期：2026-10-17
> 编号：SAMPLE-TRIAL-10
> 性质：**只产出静态文件，不接 LLM、不写库、不激活生产、不发布 G5。** 本包为候选模型金样本实测的冻结输入与人工标准答案。
> 上游：SAMPLE-TRIAL-08（8 条样本定义与评测口径）、SAMPLE-TRIAL-09（三层细化）、任务书 V1.1。
> 范围：金泽最小切片 `jinze-min-001`；金泽仅作工程验证样本，不预设"桥寺因果"叙事。
> 版本：`v1.1`（补样本 1"姐妹桥"段；任何改样本须留痕升级版本号）。

---

## 〇、总则与使用纪律

1. **冻结含义**：本包 8 条样本的素材路径、输入片段、ground truth 一经写入即冻结；改动须新起版本并登记 `changelog`。
2. **三层归属**：每条样本标注所属试验层（第一层文字/结构化 / 第二层视觉空间 / 第三层边界纠错）。第一层只跑纯文字样本，不触发 OCR/视觉。
3. **未凑数项**：H09 金石铭刻、C06 音频在金泽无素材，**本轮不测**，显式留待后续（见 §六）。
4. **评测口径**：沿用 SAMPLE-TRIAL-08 §三（客观指标自动打分 + 主观指标人工评）；D02/D03 输出必须 100% 符合本包配套 JSON schema（SAMPLE-TRIAL-10_JSON-SCHEMAS）。
5. **红线**：合成测试不写真实历史；ground truth 全部来自既有人工裁决与冻结语义，不新增、不改写、不伪造 G5 PASS。

---

## 一、8 条样本总览

| # | 样本 | 阶段/能力 | 所属层 | ground truth 是否已冻结 | 状态 |
|---|---|---|---|---|---|
| 1 | 地方志实体/关系抽取 | D01-C01 + D02-H05/H04 | 第一层 | 已冻结（15 实体 + 6 关系 + 3 路径） | ✅ 可测 |
| 2 | 扫描书影 OCR | D01-C02 | 第二层 | **未冻结（OCR 未完成，缺人工校对段）** | ⏸ 待第二层前冻结 |
| 3 | 历史舆图要素识别 | D01-C03 + H18 | 第二层 | 部分冻结（HR-MAP-01 PARTIAL_CONFIRM） | ⏸ 待第二层 |
| 4 | 照片身份 + 跨模态对应 | D01-C04 + H25 + W01/W03 | 第二层 | 已冻结（8 张照片身份标注 + HR-5） | ⏸ 待第二层 |
| 5 | 冲突管理（并列不择一） | D03-W09 + A10 | 第一层 / 第三层 | 已冻结（HR-6 + T11-C1/C2） | ✅ 第一层可测 |
| 6 | 同名异地/异人消歧 | D03-W01/W08 | 第一层 / 第三层 | 已冻结（X-DISAMBIG） | ✅ 第一层可测 |
| 7 | 人文发现 + 反证保留 | D04-A01/A10 | 第三层 | 已冻结（HR-2/HR-4 边界） | ⏸ 待第三层 |
| 8 | 有界解释组合（P04） | D05-P04 | 第三层 | 已冻结（3 分钟脚本成品） | ⏸ 待第三层 |

> 第一层实际可测：样本 1、5、6（纯文字，零 OCR/视觉）；样本 7 依依赖可升到第三层后测；样本 8 为发布成品，第三层测。

---

## 二、逐样本明细

### 样本 1｜地方志实体/关系/地名层积抽取（第一层）

- **阶段/能力**：D01-C01 数字文本读取 → D02-H05 地方志 / H04 历史地理著作观察。
- **63 方法**：C01、H05（主）、H04（邻类，处理地名沿革/水道）。
- **素材来源文件路径**（均位于工作区 `mohen-agent-2.0/` 下）：
  - `data/exports/jinze-knowledge-inventory.md`（15 实体 + 6 语义关系 + 5 新增 claim 的盘点）
  - `data/exports/jinze-knowledge-paths.md`（3 条路径 + S1 地名志引文片段）
  - `data/exports/jinze-human-review-decision-log.md`（HR-1~6 冻结语义）
  - `apps/web/data/experience/jinze-cultural-world-008.json`（`fragments[]` 为逐字引文快照）
- **输入片段（送测文字，取自 S1 地名志原文 + 金泽库已冻结片段，见 jinze-knowledge-paths.md 与 jinze-cultural-world-008.json fragments）**：
  1. 「古名白苎里。因地处湖荡泽地……古有『穑人获泽如金』之说，故名金泽」
  2. 「是上海的『桥乡』，现存古桥 21 座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥……」
  3. 「南宋景定元年（1260）就南宋名相吕颐浩故宅创建，寺名取自其人」
  4. 「南宋景定年间建（万安桥），与普济桥一北一南同跨一河，形制相仿，并称'姐妹桥'」——补自 `jinze-cultural-world-008.json` fragment `03265ea1`（已冻结真实原文，非生造），用于测 `spans_same_waterway` 关系
- **标准答案（ground truth，已冻结）**：
  - 实体（15，全 `candidate`，零 verified/published）：普济桥/万安桥/迎祥桥/如意桥/林老桥/天皇阁桥/金泽放生桥（桥×7）+ 颐浩寺遗址（寺）+ 吕颐浩/赵孟頫（人物）+ 白苎里→金溪→金泽地名叠影（JZ-OVL-001）+ 四十二虹桥→今存七桥叠影（JZ-OVL-002，research）+ 金泽锭子谢家车/金泽庙会（artifact）+《金泽小志》道光续纂成书（event）。
  - 语义关系（6，带 Evidence）：吕颐浩 `mentioned_in` 颐浩寺遗址；颐浩寺遗址 `named_after` 吕颐浩；普济桥 `spans_same_waterway` 万安桥；万安桥 `spans_same_waterway` 普济桥（反向重复，路径只取一条）；天皇阁桥/万安桥 `mentioned_in` 四十二虹桥叠影（客体为 research，不入事实路径）。
  - 24 条 `crossLink`（Evidence=0）**不构成知识边**，不得计为语义关系。
  - 地名层积断裂点：中间名「金溪」仅见 Legacy，S1 无证据 → 不得呈现为连续链。
- **评什么**：实体/关系字段级 F1 ≥ 0.7（vs 15 实体 + 6 关系）；H 类型判定准确率 ≥ 90%（主 H05/邻 H04）；地名层积不得补全「金溪」断点。

### 样本 2｜扫描书影 OCR（第二层，ground truth 未冻结）

- **阶段/能力**：D01-C02 扫描书影与影像 PDF 读取（本地开源 OCR）。
- **63 方法**：C02（+ G1 质量门）。
- **素材来源文件路径**：光绪《青浦县志》扫描件（17MB，OCR 页级定位未完成），Raw Store：`D:/MoHen/data/raw/historical-spatial/jinze/t11-closure/…`（`jinze-shl-knowledge-alignment.md` §4 已登记为 research-lead）。
- **输入片段**：扫描书影页图像（页级定位尚未产出，暂无可送测的固定页）。
- **标准答案（ground truth）**：**未冻结。** 需在第二层前由人工校对关键段形成 CER 参照文本；当前缺人工校对，故本条在第二层前不参与打分，也不强行以古籍 OCR 输出冒充逐字引文（对齐 P2 §7.2「不重存整本 OCR 作第二来源」）。
- **评什么**：CER（字符错误率）古籍 < 5%。
- **状态**：⏸ 留待第二层前冻结人工校对段。

### 样本 3｜历史舆图要素识别（第二层）

- **阶段/能力**：D01-C03 历史舆图 + D02-H18 历史舆图与图谱。
- **63 方法**：C03、H18（+ 第二层补 W03 空间）。
- **素材来源文件路径**：
  - `data/exports/jinze-historical-map-index-1597-1934.csv`（舆图索引 1597–1934）
  - `data/exports/jinze-historical-map-human-review.csv`
  - `data/exports/jinze-human-review-decision-log.md`（HR-MAP-01）
- **输入片段**：1907 年地形图（日本陆地测量部）及 1597–1934 历史地图系列的金泽图幅。
- **标准答案（ground truth，部分冻结）**：HR-MAP-01 = PARTIAL_CONFIRM —— 1879 光绪《青浦县志》图说 p36 疑似「金泽/金澤」标签 `UNRESOLVED`，**不作为金泽直接历史地图**；三标签（金泽/金澤/蔡浜/枪开河/槍開河）保持 `UNRESOLVED`；`direct_jinze_historical_map=NOT_YET`。
- **评什么**：舆图要素识别（桥/寺/塘/图注）关键要素 ≥ 80%；不得以示意位置赋现代精确坐标。
- **状态**：⏸ 待第二层。

### 样本 4｜照片身份 + 跨模态对应（第二层）

- **阶段/能力**：D01-C04 照片/版画 + D02-H25 历史摄影与纪实图像 + D03-W01 身份 / W03 空间对应。
- **63 方法**：C04、H25、W01、W03（第二层补）；云端多模态（图片可出域，已拍板）。
- **素材来源文件路径**：
  - `apps/web/data/experience/jinze-present-day-photos.json`（8 张桥/寺照片的 feature_key→label→Wikimedia Commons 地址）
  - `data/exports/jinze-visual-inventory.md`、`data/exports/jinze-visual-linkage.md`
- **输入片段**：8 张已确认当代照片（放生桥/林老桥/普济桥/如意桥/天皇阁桥/万安桥/颐浩寺遗址/迎祥桥）。
- **标准答案（ground truth，已冻结）**：8 张照片的 `feature_key` → 桥/寺身份标注（如 `pujiqiao→普济桥`、`wananqiao→万安桥`、`yihaosi-site→颐浩寺遗址`）。HR-5：20 张视觉资产（19 张高铁 + 1 张 CADAL 书影）`excluded_from_heritage_primary`，不得作遗产对象历史状态证据。
- **评什么**：视觉识别 + 跨模态对应；「读取视觉材料 ≠ 同一历史对象」（W01/W03 禁止捷径）。
- **状态**：⏸ 待第二层。

### 样本 5｜冲突管理：并列不择一（第一层 / 第三层）

- **阶段/能力**：D03-W09 冲突与认识状态管理；D04-A10 冲突发现。
- **63 方法**：W09、A10（+ W07/W08 佐证）。
- **素材来源文件路径**：
  - `data/exports/jinze-human-review-decision-log.md`（HR-6 赵孟頫生年 1271 vs 1254）
  - `data/exports/jinze-shl-knowledge-alignment.md`（万安桥「秀州塘 vs 金泽塘」跨镇误挂疑点）
  - `apps/web/data/experience/jinze-cultural-world-008.json`（`conflicts[]`：`pujiqiao-build-year-1265-1267`，`resolution_status=preserved_open`）
  - `apps/web/data/experience/jinze-3min-experience-script.json`（T11-C1 普济桥方位 / T11-C2 万安桥跨水道）
- **输入片段（三组冲突）**：
  1. 赵孟頫生年：Legacy 记 1271，Wikidata Q197461 记 1254–1322。
  2. 万安桥跨水道：上图地名志「跨秀州塘」 vs 青浦官方「跨金泽塘/市河」；上海地名志「秀州塘＋万安桥」实存金山朱泾 → 疑跨镇误挂。
  3. 普济桥建造年代：官方 1267 vs Wikimedia caption「北宋咸淳元年（1265）」。
- **标准答案（ground truth，已冻结）**：三组冲突均**两说/多说并列、不择一**。
  - HR-6：`conflicting_values=["1271","1254"]`，`silent_override=blocked`，维持 research/conflict。
  - T11-C2：`ACCEPT_CONFLICT + SUSPECTED_CROSS_TOWN_MISALIGNMENT`，两说并存，不删除不静默归一。
  - `pujiqiao-build-year`：`resolution_status=preserved_open`。
- **评什么**：冲突识别准确率；关键冲突 100% 并列（不得静默覆盖、不得择一）。

### 样本 6｜同名异地 / 异人消歧（第一层 / 第三层）

- **阶段/能力**：D03-W01 身份与连续性判定 + W08 来源谱系与独立见证。
- **63 方法**：W01、W08。
- **素材来源文件路径**：`data/exports/jinze-shl-knowledge-alignment.md`（§1.1/§1.2/§1.4）。
- **输入片段（三类消歧）**：
  1. 金泽放生桥 vs 朱家角放生桥（跨漕港河，市级，约 11km 外）。
  2. 与「万安桥」完全同名的另 7 座（嘉定/金山山阳/浦东大团/宣桥/徐泾/新场/赵屯陈岳）。
  3. 「吕颐浩」家谱 3 个祖先实体，`temporalValue` 互斥（明/南宋/无纪年）。
- **标准答案（ground truth，已冻结）**：
  - X-DISAMBIG：金泽放生桥（区级）与朱家角放生桥（市级）**非同物**；禁止按名称或距离择一。
  - 7 座同名万安桥：名称完全一致 ≠ 同一对象，全部并列登记，禁止映射到金泽。
  - X-SAME-NAME-OTHER-PERSON：不得把家谱人物对齐到南宋宰相吕颐浩（仅保留 Legacy provenance）。
- **评什么**：同名异地/异人消歧准确率；不得同名/近邻即合并（W01 禁止捷径）。

### 样本 7｜人文发现 + 反证保留（第三层）

- **阶段/能力**：D04-A01 显式关系解释 / A10 冲突发现。
- **63 方法**：A01、A10（+ A02 共现线索为候选，不越界）。
- **素材来源文件路径**：
  - `data/exports/jinze-knowledge-paths.md`（PATH-C 吕颐浩↔颐浩寺；PATH-B 普济↔万安同水道）
  - `data/exports/jinze-human-review-decision-log.md`（HR-2 legend / HR-4 candidate）
  - `apps/web/data/experience/jinze-3min-experience-script.json`（`discoveries[]`）
- **输入片段**：
  1. PATH-C：颐浩寺遗址 `named_after` 吕颐浩（据地方文献，candidate）。
  2. PATH-B：普济桥 `spans_same_waterway` 万安桥（姐妹桥）。
  3. 赵孟頫 ↔ 颐浩寺（仅 crossLink，Evidence=0）。
- **标准答案（ground truth，已冻结）**：
  - HR-4=B：吕颐浩↔颐浩寺 仅 `candidate`（据方志），取得 S1 原文前不得升无条件事实。
  - HR-2=A：赵孟頫↔颐浩寺 = `legend/tradition`，**不建 claim、不升 fact**。
  - 发现必须非平庸增量、保留反证；`INTERPRETATION_CANDIDATE` 永不静默改写为 `FACT_EVIDENCED`。
- **评什么**：理解增量质量（主观）；反证/竞争解释保留（守住 HR-2/HR-3 边界，不把 legend/research 升 fact）。

### 样本 8｜有界解释组合（D05-P04，第三层）

- **阶段/能力**：D05-P04 有界解释组合（故事组合）。
- **63 方法**：P04（output_contract：`story_seeds` + `agent_contexts`）；依赖 P01 资格选入 + P06 证据返还。
- **素材来源文件路径**：`apps/web/data/experience/jinze-3min-experience-script.json`（金泽 3 分钟体验脚本成品）。
- **输入片段**：L3/L4 有效世界主张与发现（两座宋桥同跨金泽塘 + 颐浩寺候选关系 + 三组冲突）。
- **标准答案（ground truth，已冻结）**：脚本成品 8 场景 + 主发现。
  - 主发现 `epistemic_classification=INTERPRETATION_CANDIDATE`；`narrative_policy.hard_rule`：QUESTION/INTERPRETATION_CANDIDATE 永不静默改写为 FACT_EVIDENCED；每个 factual unit 必带 `evidence_refs`。
  - 组合不得把「桥寺水」越界成完整历史功能系统；寺↔桥历史功能关系零前现代文献支持（U5）。
- **评什么**：故事可读性（主观）；证据返还（每个 FACT 带 evidence_refs，可回源）。

---

## 三、ground truth 权威源清单（冻结）

| 源 | 路径 | 承载 |
|---|---|---|
| 知识盘点 | `data/exports/jinze-knowledge-inventory.md` | 15 实体 + 6 关系 + HR 约束 + 计数 |
| 知识路径 | `data/exports/jinze-knowledge-paths.md` | 3 路径 + S1 引文片段 + 断裂点 |
| 人审日志 | `data/exports/jinze-human-review-decision-log.md` | HR-1~6 / HR-MAP-01 / SHR-01~06 |
| SHL 对齐 | `data/exports/jinze-shl-knowledge-alignment.md` | 5 对象对齐 + X-DISAMBIG + 同名异人 |
| 文化世界（只读投影） | `apps/web/data/experience/jinze-cultural-world-008.json` | events/claims/fragments/conflicts |
| 体验脚本成品 | `apps/web/data/experience/jinze-3min-experience-script.json` | 8 场景 + 主发现 + followup |
| 照片身份 | `apps/web/data/experience/jinze-present-day-photos.json` | 8 照片 feature_key→label |

> 上述均为**只读冻结语义**，本包不修改任何源文件，仅引用路径。

---

## 四、ground truth 覆盖缺口（诚实声明）

1. **样本 2（OCR）ground truth 未冻结**：光绪《青浦县志》扫描件 17MB，OCR 页级定位未完成，人工校对关键段缺失。进入第二层前须先冻结 CER 参照文本，否则不得打分。
2. **样本 3（舆图）部分冻结**：HR-MAP-01 仅 PARTIAL_CONFIRM，1879 p36 三标签 UNRESOLVED；真实「金泽直接历史地图」尚未取得。
3. **样本 4 照片**：8 张为当代实景（非历史影像）；「今貌 ≠ 原貌」为显式边界，视觉识别只评身份标注与跨模态对应，不评历史年代。
4. **第一层方法集不含**：C02/C03/C04/C06、H18/H25/H09、W03、A07（均属第二层视觉，待第一层闭环后启用）。

---

## 五、变更记录（changelog）

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-17 | 首版冻结：8 条样本素材路径 + 输入片段 + ground truth + 方法 + 三层归属。样本 2 ground truth 标注未冻结。 |
| v1.1 | 2026-10-17 | 样本 1 补第 4 段"姐妹桥"真实原文（自金泽库已冻结 fragment 03265ea1，非生造），补齐 spans_same_waterway 关系的输入来源。 |
