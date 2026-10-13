# LR-ADS-01 · Discovery Research 首轮执行报告

> 模式 **WRITE** ｜ run_id `09030790-66c6-4dea-877c-ec49bfdcb19a` ｜ 产物目录 `tasks\results\LR-ADS-01-20261003`
> 依据：C3 V1.2 §2.9 · 主协议 V3.0 §12.2 · R16（Legacy-first）。**0 自动 Truth Promotion。**

## 1. 统计

| 指标 | 值 |
|---|---|
| scope | LR-ADS-01 |
| mode | WRITE |
| run_id | 09030790-66c6-4dea-877c-ec49bfdcb19a |
| sources_total | 95 |
| inventory | 95 |
| readable | 62 |
| catalog_only | 33 |
| unreadable | 0 |
| observations | 2714 |
| observations_with_locator | 2714 |
| mentions | 3791 |
| mentions_resolved | 2149 |
| dependencies | 326 |
| signals | 2469 |
| signals_total_pairs | 2469 |
| dropped_signal_only | 1576 |
| candidates | 893 |
| cross_source_candidates | 893 |
| buckets | {"priority":103,"review":89,"candidate":191,"signal_only":510} |
| selected | 20 |
| tasks | 20 |
| elapsed_s | 2.9 |

## 2. 来源盘点（前 20）

| 来源 | 载体类型 | 可读性 | Observation 数 |
|---|---|---|---|
| _work_titles.json | unknown | readable | 11 |
| cbdb_people.json | biography_db | catalog_only | 0 |
| clan_pdf_index.json | clan_genealogy | readable | 11 |
| clans.json | unknown | readable | 100 |
| commons_baoshan_chuansha_20260831.json | image_catalog | readable | 16 |
| commons_cats_drill_20260831.json | image_catalog | readable | 68 |
| commons_external_maps_20260831.json | image_catalog | readable | 4 |
| commons_images.json | image_catalog | readable | 0 |
| commons_oldmaps_raw_20260831.json | image_catalog | readable | 100 |
| coords_wikidata.json | unknown | readable | 5 |
| dmz_zhujiajiao.json | town_monograph | readable | 1 |
| events_linked.json | event_record | readable | 100 |
| external_mapsource_probe_20260831.json | unknown | readable | 1 |
| gazetteer_details.json | gazetteer | readable | 56 |
| geo_placenames_shanghai.json | placename_gazetteer | catalog_only | 0 |
| gj_14373_toc.json | old_book_fulltext | readable | 100 |
| gj_14386_entries.json | old_book_fulltext | catalog_only | 0 |
| gj_14386_ocr.json | old_book_fulltext | readable | 44 |
| gj_3799_entries.json | old_book_fulltext | catalog_only | 0 |
| gj_3799_ocr.json | old_book_fulltext | readable | 7 |

## 3. Top 关联候选（按 AVS）

| AVS | 主体 | 客体 | 处置 | 为什么有意思 |
|---|---|---|---|---|
| 100 | place:朱家角 | place:青浦区 | long_tail | place 共现 24 次、跨 5 个来源，含年代锚点；样例：​大清邮局旧址 青浦区朱家角镇西湖街35号 |
| 100 | place:川沙 | place:江苏省 | truth_promotion | place 共现 7 次、跨 3 个来源，含年代锚点；样例：1928年起，上海记周边各县纷纷成立民众教育馆，大多数由原通俗教育馆改组改名而成，县属乡镇也有不少成立民众教育馆或农民教育馆。上海县民教馆于1928年在原通俗馆 |
| 100 | place:庄家村 | person:江桥 | long_tail | person+place 共现 6 次、跨 6 个来源；样例：此图绘示南翔、独家村、江桥、广福、庄家村、枫林浜各天主堂位置及其间里程 |
| 100 | place:南翔 | place:白鹤 | long_tail | place 共现 10 次、跨 4 个来源，含年代锚点；样例：位于南翔镇解放街、人民街交汇处（原白鹤南翔寺山门内），东西对峙，俗称南翔双塔。通高11米，底层直径近1.9米，八面七层攒尖顶，灰砖砌筑；每层设腰檐，檐下施五铺 |
| 100 | place:南翔 | person:江桥 | long_tail | person+place 共现 6 次、跨 6 个来源；样例：此图绘示南翔、独家村、江桥、广福、庄家村、枫林浜各天主堂位置及其间里程 |
| 100 | place:长兴县 | place:高桥 | long_tail | place 共现 9 次、跨 6 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | work:全邑水道图 | place:罗店 | long_tail | place+work 共现 6 次、跨 5 个来源；样例：图凡19幅，宝山县境全图为彩色，余为黑白地图。首附图说2页。总图2幅：宝山县境全图，缩尺约为1：30000，94×93cm；全邑水道图，缩尺约为1：90600。分 |
| 100 | place:南翔 | place:独家村 | long_tail | place 共现 6 次、跨 6 个来源；样例：此图绘示南翔、独家村、江桥、广福、庄家村、枫林浜各天主堂位置及其间里程 |
| 100 | work:包括市镇分图 | work:宝山县境全图 | long_tail | work 共现 6 次、跨 5 个来源；样例：图凡19幅，宝山县境全图为彩色，余为黑白地图。首附图说2页。总图2幅：宝山县境全图，缩尺约为1：30000，94×93cm；全邑水道图，缩尺约为1：90600。分图17幅：包 |
| 100 | work:全邑水道图 | work:包括市镇分图 | long_tail | work 共现 6 次、跨 5 个来源；样例：图凡19幅，宝山县境全图为彩色，余为黑白地图。首附图说2页。总图2幅：宝山县境全图，缩尺约为1：30000，94×93cm；全邑水道图，缩尺约为1：90600。分图17幅：包 |
| 100 | place:嘉定 | place:高桥 | truth_promotion | place 共现 9 次、跨 6 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | work:包括市镇分图 | place:罗店 | long_tail | place+work 共现 6 次、跨 5 个来源；样例：图凡19幅，宝山县境全图为彩色，余为黑白地图。首附图说2页。总图2幅：宝山县境全图，缩尺约为1：30000，94×93cm；全邑水道图，缩尺约为1：90600。分 |
| 100 | place:练塘 | place:金泽 | truth_promotion | place 共现 5 次、跨 3 个来源，含年代锚点；样例：…友会”，以联络感情、互相砥砺、团结青年、改造故乡为宗旨开展革命工作。徐勖奔走于上海、青浦、朱家角、金泽、练塘与小蔡之间，给青浦西乡地区知识界青年以革命启蒙教育 |
| 100 | place:嘉定 | place:江苏省 | truth_promotion | place 共现 11 次、跨 3 个来源，含年代锚点；样例：黄宣佩（1930～2013），浙江鄞县人。1949年江苏省立水产学校毕业，1952年进上海博物馆。历任考古组长、上海历史研究部副主任、考古部主任、上海博物馆副 |
| 100 | place:嘉定 | person:金山 | truth_promotion | person+place 共现 7 次、跨 3 个来源，含年代锚点；样例：1928年起，上海记周边各县纷纷成立民众教育馆，大多数由原通俗教育馆改组改名而成，县属乡镇也有不少成立民众教育馆或农民教育馆。上海县民教馆于192 |
| 100 | work:宝山县境全图 | place:罗店 | long_tail | place+work 共现 6 次、跨 5 个来源；样例：图凡19幅，宝山县境全图为彩色，余为黑白地图。首附图说2页。总图2幅：宝山县境全图，缩尺约为1：30000，94×93cm；全邑水道图，缩尺约为1：90600。分 |
| 100 | place:上海市 | place:香港 | long_tail | place 共现 8 次、跨 4 个来源，含年代锚点；样例：李翠贞（1910-1966），江苏南汇（今属上海市）人，钢琴家、音乐教育家。自幼体弱不能入学，在家苦练钢琴。1925年入上海晏摩氏女子中学初中部，后转入上海启秀 |
| 100 | place:川沙 | place:析北亭 | truth_promotion | place 共现 5 次、跨 4 个来源，含年代锚点；样例：第一篇 沿革 縣市小丈 一兀朝以前 •• 元朝繭，土海乃長江下游沖積而成之沙洲。自鎮江東南逝，經蘇州 再西南逝，而達杭州，成一折線。此線以東及大江以雨之地，通稱 |
| 100 | place:嘉定 | place:陆家浜 | truth_promotion | place 共现 6 次、跨 6 个来源；样例：是图为整幅上海图之左半切。添绘内容疑为教会嘉定、陆家浜、七宝等地总堂及其所属分堂之人数 |
| 100 | place:嘉定 | work:奉教地图 | truth_promotion | place+work 共现 18 次、跨 6 个来源；样例：海门 崇明 通州 太仓 宝山 嘉定 常熟 奉教地图 |
| 100 | place:兴县 | place:嘉定 | long_tail | place 共现 10 次、跨 7 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | work:全邑水道图 | work:宝山县境全图 | long_tail | work 共现 6 次、跨 5 个来源；样例：图凡19幅，宝山县境全图为彩色，余为黑白地图。首附图说2页。总图2幅：宝山县境全图，缩尺约为1：30000，94×93cm；全邑水道图，缩尺约为1：90600。分图17幅：包 |
| 100 | person:江桥 | place:独家村 | truth_promotion | person+place 共现 6 次、跨 6 个来源；样例：此图绘示南翔、独家村、江桥、广福、庄家村、枫林浜各天主堂位置及其间里程 |
| 100 | place:兴县 | place:高桥 | long_tail | place 共现 9 次、跨 6 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | place:嘉定 | place:长兴县 | truth_promotion | place 共现 10 次、跨 7 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | place:上海市 | place:朱家角 | long_tail | place 共现 14 次、跨 4 个来源，含年代锚点；样例：在县境中部，沪青平公路、朱枫公路交会处。朱家角镇人民政府驻地。面积125公顷。人口1.3万。曾名朱家村、珠街阁、珠溪、珠里。俗名曾称角里。明清两代棉纺织业、手 |
| 100 | place:上海市 | place:南翔 | long_tail | place 共现 6 次、跨 4 个来源，含年代锚点；样例：上海市嘉定区南翔镇三陈宅陈氏族谱（上海市/上海市/嘉定区） |
| 100 | place:放生桥 | place:朱家角 | truth_promotion | place 共现 5 次、跨 4 个来源，含年代锚点；样例：在县境中部，沪青平公路、朱枫公路交会处。朱家角镇人民政府驻地。面积125公顷。人口1.3万。曾名朱家村、珠街阁、珠溪、珠里。俗名曾称角里。明清两代棉纺织业、手工 |
| 100 | place:嘉定 | place:郎溪县 | truth_promotion | place 共现 9 次、跨 6 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | place:郎溪县 | place:高桥 | truth_promotion | place 共现 9 次、跨 6 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |

## 4. 判读

- **跨来源候选 893 / 893**：跨来源（非同一份材料的重复共现）才是"新而可研究"的信号。
- **单来源候选 AVS 已被压到 34 以下**：反噪声规则（near / same_source / mentioned_in 不得单独形成高优先候选）在代码内生效，不是写在文档里。
- **Selected 20 个**转入 `research_task`（directed_research），**未创建 review_queue** —— 首轮不制造人工债务。
