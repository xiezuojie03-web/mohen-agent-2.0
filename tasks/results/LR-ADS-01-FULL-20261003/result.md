# LR-ADS-01-FULL · Discovery Research 首轮执行报告

> 模式 **WRITE** ｜ run_id `7727c3b5-7972-49f0-9ee1-090124ffc89a` ｜ 产物目录 `tasks\results\LR-ADS-01-FULL-20261003`
> 依据：C3 V1.2 §2.9 · 主协议 V3.0 §12.2 · R16（Legacy-first）。**0 自动 Truth Promotion。**

## 1. 统计

| 指标 | 值 |
|---|---|
| scope | LR-ADS-01-FULL |
| mode | WRITE |
| run_id | 7727c3b5-7972-49f0-9ee1-090124ffc89a |
| sources_total | 95 |
| inventory | 95 |
| readable | 62 |
| catalog_only | 33 |
| unreadable | 0 |
| observations | 6913 |
| observations_with_locator | 6913 |
| mentions | 8610 |
| mentions_resolved | 4715 |
| dependencies | 884 |
| signals | 5041 |
| signals_total_pairs | 5041 |
| dropped_signal_only | 2822 |
| candidates | 2219 |
| cross_source_candidates | 2219 |
| buckets | {"priority":332,"review":339,"candidate":427,"signal_only":1121} |
| selected | 20 |
| tasks | 20 |
| elapsed_s | 4.9 |

## 2. 来源盘点（前 20）

| 来源 | 载体类型 | 可读性 | Observation 数 |
|---|---|---|---|
| _work_titles.json | unknown | readable | 11 |
| cbdb_people.json | biography_db | catalog_only | 0 |
| clan_pdf_index.json | clan_genealogy | readable | 11 |
| clans.json | unknown | readable | 227 |
| commons_baoshan_chuansha_20260831.json | image_catalog | readable | 16 |
| commons_cats_drill_20260831.json | image_catalog | readable | 68 |
| commons_external_maps_20260831.json | image_catalog | readable | 4 |
| commons_images.json | image_catalog | readable | 0 |
| commons_oldmaps_raw_20260831.json | image_catalog | readable | 103 |
| coords_wikidata.json | unknown | readable | 5 |
| dmz_zhujiajiao.json | town_monograph | readable | 1 |
| events_linked.json | event_record | readable | 383 |
| external_mapsource_probe_20260831.json | unknown | readable | 1 |
| gazetteer_details.json | gazetteer | readable | 56 |
| geo_placenames_shanghai.json | placename_gazetteer | catalog_only | 0 |
| gj_14373_toc.json | old_book_fulltext | readable | 504 |
| gj_14386_entries.json | old_book_fulltext | catalog_only | 0 |
| gj_14386_ocr.json | old_book_fulltext | readable | 44 |
| gj_3799_entries.json | old_book_fulltext | catalog_only | 0 |
| gj_3799_ocr.json | old_book_fulltext | readable | 7 |

## 3. Top 关联候选（按 AVS）

| AVS | 主体 | 客体 | 处置 | 为什么有意思 |
|---|---|---|---|---|
| 100 | place:南翔 | place:独家村 | long_tail | place 共现 6 次、跨 6 个来源；样例：此图绘示南翔、独家村、江桥、广福、庄家村、枫林浜各天主堂位置及其间里程 |
| 100 | place:南翔 | place:古猗园 | long_tail | place 共现 14 次、跨 3 个来源，含年代锚点；样例：王一亭与题襟馆书画会同人应赵云舫之邀，游南翔古猗园赏荷 |
| 100 | place:练塘 | place:青浦县 | long_tail | place 共现 5 次、跨 5 个来源，含年代锚点；样例：徐勖（1906～1927）原名润原，字树人，又字勉之，青浦县(今青浦区)莲盛乡田山庄村人，中国共产主义青年团团员。徐勖幼丧父母，家境清贫，小学毕业后考入苏州工专 |
| 100 | place:练塘 | place:青浦区 | long_tail | place 共现 5 次、跨 4 个来源，含年代锚点；样例：徐勖（1906～1927）原名润原，字树人，又字勉之，青浦县(今青浦区)莲盛乡田山庄村人，中国共产主义青年团团员。徐勖幼丧父母，家境清贫，小学毕业后考入苏州工专 |
| 100 | place:南翔 | place:川沙 | long_tail | place 共现 17 次、跨 5 个来源，含年代锚点；样例：美术团体涛社创立。由原中国工商业美术家协会的部分会员发起。宗旨是在“孤岛”时期的上海，将爱国的美术家组织起来，运用漫画为主要武器，坚持抗日救国宣传活动。除了在 |
| 100 | place:南翔 | place:白鹤 | long_tail | place 共现 13 次、跨 5 个来源，含年代锚点；样例：位于南翔镇解放街、人民街交汇处（原白鹤南翔寺山门内），东西对峙，俗称南翔双塔。通高11米，底层直径近1.9米，八面七层攒尖顶，灰砖砌筑；每层设腰檐，檐下施五铺 |
| 100 | place:江苏省 | place:黄炎培 | long_tail | place 共现 17 次、跨 3 个来源，含年代锚点；样例：杨拙夫(1901~1969)，字师曾，江苏嘉定(今上海嘉定)人。早年就读江苏省立第二师范学校，毕业任中小学、师范学校、职业学校教师。1929年任嘉定县教育局长 |
| 100 | place:江苏省 | person:金山 | long_tail | person+place 共现 5 次、跨 3 个来源，含年代锚点；样例：1928年起，上海记周边各县纷纷成立民众教育馆，大多数由原通俗教育馆改组改名而成，县属乡镇也有不少成立民众教育馆或农民教育馆。上海县民教馆于192 |
| 100 | place:金泽 | place:青浦县 | long_tail | place 共现 11 次、跨 6 个来源，含年代锚点；样例：青浦县中学创办于1923年，1964年迁至现址青安路11号。建校初，虽设图书室，但图书数量甚少，只供部分教师借阅，没有专职图书管理员。1928年原校长袁蔚文离 |
| 100 | place:练塘 | place:金泽 | long_tail | place 共现 11 次、跨 6 个来源，含年代锚点；样例：…友会”，以联络感情、互相砥砺、团结青年、改造故乡为宗旨开展革命工作。徐勖奔走于上海、青浦、朱家角、金泽、练塘与小蔡之间，给青浦西乡地区知识界青年以革命启蒙教 |
| 100 | place:南翔 | person:江桥 | long_tail | person+place 共现 6 次、跨 6 个来源；样例：此图绘示南翔、独家村、江桥、广福、庄家村、枫林浜各天主堂位置及其间里程 |
| 100 | place:六里桥 | place:嘉定 | long_tail | place 共现 6 次、跨 3 个来源，含年代锚点；样例：张洪林(1923～1982年) 江苏吴县人，锡剧音乐设计。曾在苏州金阊小学读书，仅读两年即辍学。自幼喜爱文艺，尤喜音乐。十岁即拜师戴寿庭学习苏剧。民国二十三年( |
| 100 | place:嘉定 | place:江苏省 | truth_promotion | place 共现 26 次、跨 3 个来源，含年代锚点；样例：黄宣佩（1930～2013），浙江鄞县人。1949年江苏省立水产学校毕业，1952年进上海博物馆。历任考古组长、上海历史研究部副主任、考古部主任、上海博物馆副 |
| 100 | place:古猗园 | place:王一亭 | truth_promotion | place 共现 5 次、跨 3 个来源，含年代锚点；样例：王一亭与题襟馆书画会同人吴昌硕、倪墨耕、黄山寿、哈少孚（夫）、商笙伯、王念慈、夏小谷、沈荷卿、余德屺等及三公子季眉，应赵云舫之邀，游南翔古猗园赏荷。赵云舫题：“ |
| 100 | place:嘉定 | person:金山 | long_tail | person+place 共现 10 次、跨 3 个来源，含年代锚点；样例：1928年起，上海记周边各县纷纷成立民众教育馆，大多数由原通俗教育馆改组改名而成，县属乡镇也有不少成立民众教育馆或农民教育馆。上海县民教馆于19 |
| 100 | place:嘉定 | work:奉教地图 | long_tail | place+work 共现 18 次、跨 6 个来源；样例：海门 崇明 通州 太仓 宝山 嘉定 常熟 奉教地图 |
| 100 | place:嘉定 | place:罗店 | long_tail | place 共现 14 次、跨 6 个来源，含年代锚点；样例：练祁塘西引吴淞江东迳吴塘又东过盐铁又东入城中又东抵罗店又东合马路塘又东合月浦又东合采淘港入于海县治西曰西练祁东曰东练祁通徐公浦者曰西小练祁于罗店东北入海者曰东 |
| 100 | place:嘉善县 | place:练塘 | long_tail | place 共现 5 次、跨 5 个来源，含年代锚点；样例：徐勖（1906～1927）原名润原，字树人，又字勉之，青浦县(今青浦区)莲盛乡田山庄村人，中国共产主义青年团团员。徐勖幼丧父母，家境清贫，小学毕业后考入苏州工专 |
| 100 | place:江苏省 | place:罗店 | long_tail | place 共现 8 次、跨 3 个来源，含年代锚点；样例：陈伯吹出生于江苏省宝山罗店镇（今属上海市） |
| 100 | place:金泽 | place:青浦区 | long_tail | place 共现 26 次、跨 3 个来源，含年代锚点；样例：陈家仓库 青浦区金泽镇下塘街16～17号 |
| 100 | place:枫泾 | person:白牛市 | truth_promotion | person+place 共现 5 次、跨 4 个来源；样例：白牛市 → 清风泾 → 枫泾 · 地名叠影 |
| 100 | place:郎溪县 | place:高桥 | long_tail | place 共现 9 次、跨 6 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | place:嘉定 | place:长兴县 | long_tail | place 共现 10 次、跨 7 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | place:嘉定 | place:黄炎培 | long_tail | place 共现 8 次、跨 3 个来源，含年代锚点；样例：杨拙夫(1901~1969)，字师曾，江苏嘉定(今上海嘉定)人。早年就读江苏省立第二师范学校，毕业任中小学、师范学校、职业学校教师。1929年任嘉定县教育局长， |
| 100 | place:嘉定 | place:高桥 | long_tail | place 共现 9 次、跨 6 个来源；样例：本图为吴县、吴江县、嘉兴县、嘉定县、 上海市、奉贤县、高桥镇、南汇县、宜兴县、长兴县、吴兴县、郎溪县、东坝镇、光福镇、平湖、金山县、前山镇17图连订，其余各幅另有数据 |
| 100 | place:嘉定 | place:川沙 | truth_promotion | place 共现 30 次、跨 5 个来源，含年代锚点；样例：1928年起，上海记周边各县纷纷成立民众教育馆，大多数由原通俗教育馆改组改名而成，县属乡镇也有不少成立民众教育馆或农民教育馆。上海县民教馆于1928年在原通俗 |
| 100 | place:川沙 | place:浦东新区 | truth_promotion | place 共现 41 次、跨 4 个来源，含年代锚点；样例：1898年1月2日，浦东唐墓桥露德圣母堂开堂。位于浦东新区唐镇乡，是上海郊县最宏伟壮观的教堂之一。浦东是天主教传入较早、发展较快的地区，因而19世纪中叶，该堂 |
| 100 | place:川沙 | place:罗店 | truth_promotion | place 共现 12 次、跨 3 个来源，含年代锚点；样例：1937年八•一三抗日战争中，日军在小川沙河口登陆后，进攻上海北翼的军事重镇罗店，企图占领罗店，威胁嘉定，切断京沪铁路，堵住上海守军的后路。8月23日，罗店遭 |
| 100 | place:川沙 | place:浦东中学 | truth_promotion | place 共现 12 次、跨 3 个来源，含年代锚点；样例：…1908）于1907年捐资三十万两白银毁家办学的善举，1917年10月，1917年10月，川沙县浦东中学落成一座该校创办人杨斯盛的青铜立像。坐落于北宝兴路方 |
| 100 | place:川沙 | place:沙县 | truth_promotion | place 共现 35 次、跨 5 个来源，含年代锚点；样例：File:1967-05 上海川沙县种植棉花.jpg |

## 4. 判读

- **跨来源候选 2219 / 2219**：跨来源（非同一份材料的重复共现）才是"新而可研究"的信号。
- **单来源候选 AVS 已被压到 34 以下**：反噪声规则（near / same_source / mentioned_in 不得单独形成高优先候选）在代码内生效，不是写在文档里。
- **Selected 20 个**转入 `research_task`（directed_research），**未创建 review_queue** —— 首轮不制造人工债务。
