# LR-ADS-01 · Discovery Research 首轮执行报告

> 模式 **WRITE** ｜ run_id `a8948a43-cc83-4ddd-be14-87c372bec1a5` ｜ 产物目录 `tasks\results\LR-ADS-01-20261004`
> 依据：C3 V1.2 §2.9 · 主协议 V3.0 §12.2 · R16（Legacy-first）。**0 自动 Truth Promotion。**

## 1. 统计

| 指标 | 值 |
|---|---|
| scope | LR-ADS-01 |
| mode | WRITE |
| run_id | a8948a43-cc83-4ddd-be14-87c372bec1a5 |
| sources_total | 95 |
| inventory | 95 |
| readable | 55 |
| catalog_only | 40 |
| unreadable | 0 |
| observations | 3393 |
| observations_with_locator | 3393 |
| mentions | 5399 |
| mentions_resolved | 2542 |
| dependencies | 519 |
| signals | 4548 |
| signals_total_pairs | 4548 |
| dropped_signal_only | 2858 |
| candidates | 1690 |
| cross_source_candidates | 1690 |
| buckets | {"priority":226,"review":264,"candidate":274,"signal_only":926} |
| selected | 20 |
| tasks | 20 |
| elapsed_s | 4.4 |

## 2. 来源盘点（前 20）

| 来源 | 载体类型 | 可读性 | Observation 数 |
|---|---|---|---|
| _work_titles.json | unknown | catalog_only | 0 |
| cbdb_people.json | biography_db | catalog_only | 0 |
| clan_pdf_index.json | clan_genealogy | catalog_only | 0 |
| clans.json | unknown | readable | 148 |
| commons_baoshan_chuansha_20260831.json | image_catalog | readable | 0 |
| commons_cats_drill_20260831.json | image_catalog | readable | 0 |
| commons_external_maps_20260831.json | image_catalog | catalog_only | 0 |
| commons_images.json | image_catalog | readable | 0 |
| commons_oldmaps_raw_20260831.json | image_catalog | readable | 0 |
| coords_wikidata.json | unknown | readable | 0 |
| dmz_zhujiajiao.json | town_monograph | readable | 1 |
| events_linked.json | event_record | readable | 255 |
| external_mapsource_probe_20260831.json | unknown | readable | 1 |
| gazetteer_details.json | gazetteer | readable | 1 |
| geo_placenames_shanghai.json | placename_gazetteer | catalog_only | 0 |
| gj_14373_toc.json | old_book_fulltext | readable | 504 |
| gj_14386_entries.json | old_book_fulltext | catalog_only | 0 |
| gj_14386_ocr.json | old_book_fulltext | readable | 44 |
| gj_3799_entries.json | old_book_fulltext | catalog_only | 0 |
| gj_3799_ocr.json | old_book_fulltext | readable | 7 |

## 3. Top 关联候选（按 AVS）

| AVS | 主体 | 客体 | 处置 | 为什么有意思 |
|---|---|---|---|---|
| 100 | place:上海市 | place:罗店 | long_tail | place 共现 22 次、跨 4 个来源，含年代锚点；样例：1937年八•一三抗日战争中，日军在小川沙河口登陆后，进攻上海北翼的军事重镇罗店，企图占领罗店，威胁嘉定，切断京沪铁路，堵住上海守军的后路。8月23日，罗店遭 |
| 100 | place:上海市 | place:南翔 | long_tail | place 共现 27 次、跨 4 个来源，含年代锚点；样例：近代学者、书画家王同愈卒（1855-1941）。王同愈，字胜之、文若，号栩缘。江苏苏州人。晚年居嘉定(今属上海市)南翔镇。清光绪十五年(1889)进士，在湖北 |
| 100 | place:浦东中学 | place:黄炎培 | long_tail | place 共现 10 次、跨 3 个来源，含年代锚点；样例：杨斯盛，字锦春，川沙县（今浦东新区）人，十三岁来上海学泥水匠，后成为上海水木业首领，曾承建江海北关大楼，建立上海水木业公所，创办广明高等小学等。1907年（清 |
| 100 | place:浦东新区 | place:黄炎培 | long_tail | place 共现 18 次、跨 3 个来源，含年代锚点；样例：黄炎培（1878～1965）字任之，政治活动家、教育家。1878年10月生于江苏川沙（今上海浦东新区）城厢镇。1901年考入上海南洋公学学习，1902年中江南 |
| 100 | place:上海市 | place:嘉定 | long_tail | place 共现 59 次、跨 7 个来源，含年代锚点；样例：黄宣佩（1930～2013），浙江鄞县人。1949年江苏省立水产学校毕业，1952年进上海博物馆。历任考古组长、上海历史研究部副主任、考古部主任、上海博物馆副 |
| 100 | place:上海市 | place:黄炎培 | long_tail | place 共现 25 次、跨 3 个来源，含年代锚点；样例：杨拙夫(1901~1969)，字师曾，江苏嘉定(今上海嘉定)人。早年就读江苏省立第二师范学校，毕业任中小学、师范学校、职业学校教师。1929年任嘉定县教育局长 |
| 100 | place:南翔 | place:罗店 | long_tail | place 共现 7 次、跨 4 个来源；样例：美术团体涛社创立。由原中国工商业美术家协会的部分会员发起。宗旨是在“孤岛”时期的上海，将爱国的美术家组织起来，运用漫画为主要武器，坚持抗日救国宣传活动。除了在报刊发表漫画， |
| 100 | place:南翔 | place:江苏省 | long_tail | place 共现 9 次、跨 3 个来源，含年代锚点；样例：杨拙夫(1901~1969)，字师曾，江苏嘉定(今上海嘉定)人。早年就读江苏省立第二师范学校，毕业任中小学、师范学校、职业学校教师。1929年任嘉定县教育局长， |
| 100 | place:南翔 | place:王一亭 | long_tail | place 共现 5 次、跨 3 个来源，含年代锚点；样例：王一亭与题襟馆书画会同人吴昌硕、倪墨耕、黄山寿、哈少孚（夫）、商笙伯、王念慈、夏小谷、沈荷卿、余德屺等及三公子季眉，应赵云舫之邀，游南翔古猗园赏荷。赵云舫题：“ |
| 100 | place:南至练祁河 | place:嘉定 | long_tail | place 共现 5 次、跨 3 个来源，含年代锚点；样例：廖家大院位于嘉定城孩儿桥西北侧人民街60号，南至练祁河，北濒花园弄，占地面积10.09亩（6727平方米）。该宅始建于清光绪十一年（1885年），由清同治十年（ |
| 100 | place:浦东中学 | place:浦东新区 | long_tail | place 共现 5 次、跨 3 个来源，含年代锚点；样例：杨斯盛，字锦春，川沙县（今浦东新区）人，十三岁来上海学泥水匠，后成为上海水木业首领，曾承建江海北关大楼，建立上海水木业公所，创办广明高等小学等。1907年（清光 |
| 100 | place:上海市 | place:川沙 | long_tail | place 共现 26 次、跨 3 个来源，含年代锚点；样例：1937年八•一三抗日战争中，日军在小川沙河口登陆后，进攻上海北翼的军事重镇罗店，企图占领罗店，威胁嘉定，切断京沪铁路，堵住上海守军的后路。8月23日，罗店遭 |
| 100 | place:上海市 | place:枫泾 | long_tail | place 共现 5 次、跨 3 个来源，含年代锚点；样例：在县境中部，沪青平公路、朱枫公路交会处。朱家角镇人民政府驻地。面积125公顷。人口1.3万。曾名朱家村、珠街阁、珠溪、珠里。俗名曾称角里。明清两代棉纺织业、手工 |
| 100 | place:上海市 | place:高桥 | long_tail | place 共现 15 次、跨 4 个来源，含年代锚点；样例：遵照孙中山先生生前提出的“唤起民众”倡议，1927年南京国民政府成立后，民众教育受到重视。1929年南京国民政府公布民国教育宗旨及其实施方针，规定“社会教育必 |
| 100 | place:嘉善县 | place:练塘 | truth_promotion | place 共现 5 次、跨 5 个来源，含年代锚点；样例：徐勖（1906～1927）原名润原，字树人，又字勉之，青浦县(今青浦区)莲盛乡田山庄村人，中国共产主义青年团团员。徐勖幼丧父母，家境清贫，小学毕业后考入苏州工专 |
| 100 | place:练塘 | place:青浦县 | long_tail | place 共现 5 次、跨 5 个来源，含年代锚点；样例：徐勖（1906～1927）原名润原，字树人，又字勉之，青浦县(今青浦区)莲盛乡田山庄村人，中国共产主义青年团团员。徐勖幼丧父母，家境清贫，小学毕业后考入苏州工专 |
| 100 | place:南翔 | place:川沙 | long_tail | place 共现 17 次、跨 5 个来源，含年代锚点；样例：美术团体涛社创立。由原中国工商业美术家协会的部分会员发起。宗旨是在“孤岛”时期的上海，将爱国的美术家组织起来，运用漫画为主要武器，坚持抗日救国宣传活动。除了在 |
| 100 | place:南翔 | place:嘉定 | long_tail | place 共现 38 次、跨 8 个来源，含年代锚点；样例：…，上海郊区也涌现了不少歌咏团，如松江歌咏团、青浦民众歌咏团、南汇青年战时服务团附设歌咏队、嘉定南翔歌咏团等，这些歌团在当地都很有影响。在“孤岛”时期，一些歌 |
| 100 | place:嘉善县 | place:枫泾 | long_tail | place 共现 8 次、跨 3 个来源，含年代锚点；样例：魏塘河在嘉善县后又名武塘茜溪在嘉善县北又有 松溪在县西北伍子塘在嘉善县西其南接胥山相传昔伍子胥经营伐越之地章练塘在嘉善县北大云塘白水塘俱在嘉善县南甓灶塘芦墟塘俱 |
| 100 | place:练塘 | place:青浦区 | long_tail | place 共现 5 次、跨 4 个来源，含年代锚点；样例：徐勖（1906～1927）原名润原，字树人，又字勉之，青浦县(今青浦区)莲盛乡田山庄村人，中国共产主义青年团团员。徐勖幼丧父母，家境清贫，小学毕业后考入苏州工专 |
| 100 | place:南翔镇 | place:嘉定 | long_tail | place 共现 5 次、跨 3 个来源，含年代锚点；样例：近代学者、书画家王同愈卒（1855-1941）。王同愈，字胜之、文若，号栩缘。江苏苏州人。晚年居嘉定(今属上海市)南翔镇。清光绪十五年(1889)进士，在湖北、 |
| 100 | place:川沙 | place:沙县 | truth_promotion | place 共现 16 次、跨 3 个来源，含年代锚点；样例：…1908）于1907年捐资三十万两白银毁家办学的善举，1917年10月，1917年10月，川沙县浦东中学落成一座该校创办人杨斯盛的青铜立像。坐落于北宝兴路方 |
| 100 | place:六里桥 | place:嘉定 | long_tail | place 共现 6 次、跨 3 个来源，含年代锚点；样例：张洪林(1923～1982年) 江苏吴县人，锡剧音乐设计。曾在苏州金阊小学读书，仅读两年即辍学。自幼喜爱文艺，尤喜音乐。十岁即拜师戴寿庭学习苏剧。民国二十三年( |
| 100 | place:川沙 | place:香港 | truth_promotion | place 共现 8 次、跨 3 个来源，含年代锚点；样例：杜维善（1933～2020），上海川沙人。少年时代生活在上海，1949年随父杜月笙赴香港定居。在港读完中学，赴澳大利亚攻读地质学。他酷爱收藏，曾搜集了几千种世界 |
| 100 | place:上海市 | place:白蕉 | long_tail | place 共现 6 次、跨 3 个来源，含年代锚点；样例：白蕉入学上海海澜英语专修学校，后考入上海政法大学。白蕉(1907～1969)，现代书画家、艺术教育家。本姓何，名治法，字旭如，号复生，小名橘馨，后废姓名改为白蕉 |
| 100 | place:江苏省 | person:金山 | long_tail | person+place 共现 5 次、跨 3 个来源，含年代锚点；样例：1928年起，上海记周边各县纷纷成立民众教育馆，大多数由原通俗教育馆改组改名而成，县属乡镇也有不少成立民众教育馆或农民教育馆。上海县民教馆于192 |
| 100 | place:嘉定 | place:黄炎培 | truth_promotion | place 共现 8 次、跨 3 个来源，含年代锚点；样例：杨拙夫(1901~1969)，字师曾，江苏嘉定(今上海嘉定)人。早年就读江苏省立第二师范学校，毕业任中小学、师范学校、职业学校教师。1929年任嘉定县教育局长， |
| 100 | place:江苏省 | place:黄炎培 | long_tail | place 共现 17 次、跨 3 个来源，含年代锚点；样例：杨拙夫(1901~1969)，字师曾，江苏嘉定(今上海嘉定)人。早年就读江苏省立第二师范学校，毕业任中小学、师范学校、职业学校教师。1929年任嘉定县教育局长 |
| 100 | place:古猗园 | place:王一亭 | truth_promotion | place 共现 5 次、跨 3 个来源，含年代锚点；样例：王一亭与题襟馆书画会同人吴昌硕、倪墨耕、黄山寿、哈少孚（夫）、商笙伯、王念慈、夏小谷、沈荷卿、余德屺等及三公子季眉，应赵云舫之邀，游南翔古猗园赏荷。赵云舫题：“ |
| 100 | place:嘉定 | place:川沙 | truth_promotion | place 共现 30 次、跨 5 个来源，含年代锚点；样例：1928年起，上海记周边各县纷纷成立民众教育馆，大多数由原通俗教育馆改组改名而成，县属乡镇也有不少成立民众教育馆或农民教育馆。上海县民教馆于1928年在原通俗 |

## 4. 判读

- **跨来源候选 1690 / 1690**：跨来源（非同一份材料的重复共现）才是"新而可研究"的信号。
- **单来源候选 AVS 已被压到 34 以下**：反噪声规则（near / same_source / mentioned_in 不得单独形成高优先候选）在代码内生效，不是写在文档里。
- **Selected 20 个**转入 `research_task`（directed_research），**未创建 review_queue** —— 首轮不制造人工债务。
