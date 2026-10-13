# LEGACY_LEAD_SUMMARY · 沪上经纬旧库线索摘要

**性质：** 仅作 Research Lead / Source Lead / Entity Lead / Place Lead / Visual Lead  
**禁止：** Legacy row → 新 Evidence / 新 Fact / G0 PASS automatically（依据 C3 §9 + source-providers LEGACY 分级）

---

## 1｜旧库可用位置

- `data/exports/jinze-historical-feature-inventory.csv`（金泽 feature 切片）
- `data/exports/jinze-historical-spatial-relations.csv`（金泽 relation 切片）
- `data/exports/jinze-historical-change-inventory.csv`（金泽 change 切片）
- 来源标签：`hushang_legacy` / `scc_legacy`（LEGACY 级，不得生成 Evidence）

> 旧库以**金泽**为核心，朱家角 / 练塘几乎无 Legacy 实体行 → 两镇以 B/C 入口为主。

---

## 2｜金泽（可复用线索 → 需回原始来源核验）

| 旧线索类型 | Legacy 内容 | 应重新查什么（Lead） |
|---|---|---|
| Place | 金泽镇（金泽塘、市河、北胜浜、迎祥街） | 水道名与跨越关系（上图地名库 / 青浦区政府） |
| Bridge | 普济桥（紫石桥，1267）、万安桥（万安亭桥，1260–64 建／1342 廊亭）、迎祥桥、林老桥、放生桥、天皇阁桥、如意桥 | 建造年代、跨越水道、结构、文保级别（上图文物名录 / 青浦区政府古桥专文） |
| Temple | 颐浩寺遗址（颐浩禅寺，吕颐浩故宅，1260 创建，1938 毁，1992 原址重建） | 创建/毁坏/重建链（青浦博物馆 / 青浦文明网 / 松江府志引文） |
| Person | 吕颐浩（1071–1139，南宋名相，寺名来源） | 身份同一性、与金泽关系（上图家谱人物库同名异人风险） |
| Relation | 普济/万安同跨金泽塘；颐浩寺=吕颐浩故宅；寺桥同街相邻 | 桥—水—寺拓扑关系（须以独立 S1 来源重证，不得沿用 Legacy 直接晋级） |
| 数量说法 | 「金泽现存古桥 21 座」「桥桥有庙、庙庙有桥」 | 口径核对：21 座 vs「现存 7 座宋元明清完整古桥」 |

---

## 3｜朱家角 / 练塘（Legacy 几乎空白）

- 旧库无朱家角 / 练塘实体行 → **本实验不依赖 Legacy 作这两镇的 Lead**。
- 仅记录：旧项目曾以「章练塘」「珠里」「放生桥」为泛化名词出现，但无结构化 Legacy 证据；按任务书以 B/C 入口独立获取。

---

## 4｜旧关联线索的处置

- `pujiqiao--spans_waterway--jinzetang` 等关系在 Legacy 中标记为 `legacy_transcription / candidate`，本实验**不直接采用**，而是用青浦区政府古桥专文（S1）与上海图书馆文物名录（S1）重新建立 Evidence 与 RelationClaim。
- 旧库「跨秀州塘」冲突提示：上图地名库万安桥条作「跨秀州塘」，与青浦官方「跨金泽塘／跨市河」矛盾 → 列为本实验需保留的 CONFLICT（U13），不裁决。

---

## 5｜结论

- Legacy 主要价值 = **金泽的研究起点与反证清单**（水道名冲突、数量口径、同名异人）。
- 朱家角 / 练塘必须从上海图书馆 + 外部来源独立构建，不借 Legacy 补证。
- 所有进入 D02 的 Evidence 均来自 S1/S2 实时取回来源，**无一行 Legacy 直接晋级为 Evidence**。
