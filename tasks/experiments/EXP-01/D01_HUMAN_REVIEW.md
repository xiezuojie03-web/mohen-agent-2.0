# D01 Stage Output Report · Source Intake / L0 / G0

**Stage:** D01 · **Layer:** L0 · **Gate:** G0  
**Review title:** 资料进入 / Source Intake  
**实验：** EXP-01 · 青浦西部水乡桥·寺·市·水路网络

---

## A｜本阶段回答的问题

> 下游拿到 G0 PASS 输出时，可以相信：**这是身份明确、来源可追溯、内容可定位、使用边界已声明的真实文化材料**（G0 Downstream Promise）。

---

## B｜Machine Gate Summary

```text
run_id:            EXP-01-D01-G0
gate_result:       PASS（含 2 个 HOLD 待补证，均为 Legacy-only 线索，不进 D02）
objects_checked:    15
objects_pass:       13
objects_hold:        2
objects_reject:      0
top_reason_codes:   G0_CONTENT_UNAVAILABLE（Legacy-only 线索）、G0_RIGHTS_UNKNOWN（旅游类 S4 仅作线索）
```

> 三类入口均真实执行：A. Legacy Lead（沪上经纬旧库，仅 Lead）；B. 上海图书馆开放数据（TASK-0011 已登记 S1 记录）；C. 外部开放来源（青浦区政府 / 青浦博物馆 / 地方志 / 识典古籍）。

---

## C｜Content Statistics

- 来源类型覆盖：政府公开(S1) ×5、地方志(S1/S2) ×3、上图开放数据(S1) ×6、博物馆(S1) ×1、数字化方志全文(S2) ×1、旅游类(S4，仅线索) ×2
- 载体覆盖：web 政府专文(T07/T11)、上图文物名录记录(T12)、上图地名库(T12)、上图家谱人物库(T12)、古籍全文(T01)、旅游图文(T14/S4 线索)
- 时间覆盖：南宋(1260s) → 元(1335/1343) → 明(1571) → 清(1698/1748/1812) → 近代(1938) → 当代(1992/1999/2000/2025)
- 地域覆盖：金泽(金泽塘/市河/北胜浜/迎祥街)、朱家角(漕港河/北大街/井亭港)、练塘(三里塘市河/下塘街)
- 独立来源比例：金泽 9 个独立 S1/S2；朱家角 4 个；练塘 4 个（无同源转引当多源）
- 反例/反向来源覆盖：上图地名库万安桥「跨秀州塘」vs 青浦官方「跨金泽塘」冲突已登记

---

## D｜Narrative-Relevant Real Records（G0 PASS Source）

| # | title | provider | source_type | carrier_type | date | place_scope | creator_or_institution | content_availability | source_independence | why_relevant | counter_value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 遗珠拾粹——探访青浦多种形式的古桥 | qingpu_government | 政府专文 | web | 2025-01-16 | 金泽/朱家角/练塘 | 青浦档案微信公众号 | fulltext | original(S1) | 三镇古桥建造年代/跨越水道/结构/文保 | — |
| S2 | 普济桥·《上海市不可移动文物名录》 | shanghai_library | 文物名录 | structured(T12) | 取回2026-09 | 金泽镇金溪居委会 | 上海图书馆 | structured_record | original(S1) | 普济桥市保身份 | — |
| S3 | 万安桥·《上海市不可移动文物名录》 | shanghai_library | 文物名录 | structured(T12) | 取回2026-09 | 金泽镇金溪居委会 | 上海图书馆 | structured_record | original(S1) | 万安区保身份 | — |
| S4 | 颐浩寺遗址·《上海市不可移动文物名录》 | shanghai_library | 文物名录 | structured(T12) | 取回2026-09 | 金泽迎祥街12号 | 上海图书馆 | structured_record | original(S1) | 颐浩寺区保身份 | — |
| S5 | 上海图书馆地名库·万安桥/金泽镇 | shanghai_library | 地名库 | structured(T12) | 取回2026-09 | 金泽镇 | 上海图书馆 | structured_record | original(S1) | 水道名/古桥数量 | 「跨秀州塘」冲突 |
| S6 | 上海图书馆家谱人物库·吕颐浩 | shanghai_library | 家谱库 | structured(T12) | 取回2026-09 | — | 上海图书馆 | structured_record | original(S1) | 同名异人风险(×3) | 不得与南宋吕颐浩合并 |
| S7 | 普济桥 | shanghai_qingpu_museum | 博物馆条目 | web(T11) | 2019-03-04 | 金泽镇南市 | 上海青浦博物馆 | fulltext | original(S1) | 跨市河/1267建/市保 | 与S1「跨金泽塘」水道名不同 |
| S8 | 万安桥 | shanghai_qingpu_museum | 博物馆条目 | web(T11) | 2019-03-04 | 金泽 | 上海青浦博物馆 | fulltext | original(S1) | 万安亭桥/1342廊亭/佛阁后废 | — |
| S9 | 颐浩禅寺 | shanghai_qingpu_museum | 博物馆条目 | web(T11) | 2019-03-04 | 金泽 | 上海青浦博物馆 | fulltext | original(S1) | 1938毁/原址内再建/赵朴初题额 | — |
| S10 | 上海桥乡:金泽 | shanghai_local_chronicles_office | 地方志 | web(T01) | — | 金泽 | 上海市地方志办公室 | fulltext | original(S1) | 普济/万安方位与年代 | 普济「南市」vs Legacy「北市」冲突 |
| S11 | 品读金泽·金泽古韵 | qingpu_government(文明网) | 政府图文 | web(T11) | 2025-04-14 | 金泽 | 青浦区委宣传部 | fulltext | original(S1) | 颐浩寺松江府志引文/1992原址重建 | — |
| S12 | 古镇朱家角 | qingpu_government | 政府专文 | web(T07) | 2018-06-22 | 朱家角 | 青浦区政府 | fulltext | original(S1) | 漕港河分镇南北/北大街/放生桥沪上第一石拱 | — |
| S13 | 陈云故居暨青浦革命历史纪念馆 | qingpu_government | 政府专文 | web(T11) | 2018-06-22 | 练塘 | 青浦区政府 | fulltext | original(S1) | 练塘下塘街/2000开馆 | — |
| S14 | 章练小志（全文） | historical_gazetteer(S2) | 古籍方志 | web(T01) | 八卷记事至1917 | 练塘 | 高如圭原编/万以增重辑(识典古籍) | fulltext_page | original(S2,须核原始出处) | 章练塘接诸湖荡之水/市河轴线/桥18+寺十余 | — |
| S15 | 慈门寺/城隍庙·朱家角古寺庙 | social_media(S4,仅线索) | 图文 | web(T14) | 2023-04 | 朱家角 | 澎湃/百度百科 | fulltext | repost/secondary | 慈门寺在放生桥南堍/清华阁十二景 | 须以S1/S2重证后入Evidence |

> S15 为 S4，**不得生成 Evidence**，仅作 D02 检索线索；其可引用事实（慈门寺僧性潮建放生桥）已由 S1（遗珠拾粹）独立提供，故不作为独立 Evidence 来源。

---

## E｜Gaps / Counterexamples / Uncertainty

```text
critical_gaps:
  - 朱家角/练塘缺少上图文物名录级 S1 记录（本环境无 API key，未实时取回；依赖青浦区政府 S1）
  - 三镇「市/街集」一手商业史料（如旧志市集条目）未系统取得
counterexamples:
  - 上图地名库万安桥「跨秀州塘」vs 青浦官方「跨金泽塘／市河」→ 水道名跨镇误配风险(U13)
  - 普济桥方位：Legacy/上图地名库「北市」vs 青浦博物馆/地方志「南市」→ 绝对方位冲突(T11-C1)
unresolved_conflicts:
  - 金泽「42/21座古桥」vs「现存7座宋元明清完整古桥」数量口径
  - 吕颐浩同名异人(家谱×3)不可与南宋吕颐浩合并
missing_evidence:
  - 各桥「废于何时」无证据；颐浩寺「1992开放为佛教活动场所」缺官方文号(U10)
recommended_deepen_targets:
  - 补取朱家角/练塘上图文物名录与地名库记录（需 API key）
  - 补《青浦县志》《章练小志》原文页级定位（S14 已取全文，待页级 locator）
```

---

## F｜Owner Decision

```text
ACCEPT
```

### Owner note
三类入口均真实执行，来源可追溯且独立。金泽证据最扎实（9 独立 S1），朱家角/练塘以政府 S1 + 方志 S2 支撑，缺口已登记（缺上图实时取回 + 市集一手史料）。可进入 D02。
