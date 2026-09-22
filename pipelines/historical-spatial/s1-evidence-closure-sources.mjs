// pipelines/historical-spatial/s1-evidence-closure-sources.mjs
//
// TASK-0011 —— 关闭 A1–A5 所需的**来源与逐字证据**的策展清单（数据，不是逻辑）。
//
// 纪律（§6 / §12）：
//  · 每条 excerpt 必须**逐字**来自实际取回的响应或页面文本，不得润色、不得拼接不同来源的句子。
//  · source_uri / locator 必须可回访；**绝不**含 API key（上图 SPARQL 的 key 只在运行时注入）。
//  · 每条都登记 retrieval 方式与限制（例如 shtong 为 JS 渲染页、正文经检索索引快照取得）。
//  · 同一对象若存在**同名异地**（嘉定普济桥、金山山阳万安桥…），必须并列登记，不得只留金泽的。
//  · 未取得的（《松江府志》原文、1992「开放」的官方文号）**不得**写成已取得。
//
// 一手/二手分级：
//   primary   = 上图开放数据平台的**结构化记录本身**（SQL/SPARQL 直接取回）
//   official  = .gov.cn / 政府新闻办 / 博物馆 / 地方志办公室 的公开页
//   secondary = 媒体或学会网站（仅作旁证，不作唯一依据）

export const SHL_SPARQL_ENDPOINT = "https://data1.library.sh.cn/sparql";

// ---------------------------------------------------------------------------
// S1-A：上海图书馆开放数据结构化记录（本轮**首次直接取回**，不再经 Legacy 转抄）
// ---------------------------------------------------------------------------
export const SHL_SOURCES = [
  {
    key: "shl-heritage-red-building",
    provider: "shanghai-library-open-data",
    title: "上图开放数据 SPARQL — 文化遗产图 red.library.sh.cn/graph/building（《上海市不可移动文物名录》）金泽相关对象批量取回",
    graph: "http://red.library.sh.cn/graph/building",
    raw_file: "red-building-dump.json",
    content_type: "application/sparql-results+json",
    license_code: "OPEN-DATA",
    retrieval: "SPARQL GET（Accept: application/sparql-results+json），逐关键词全字面量扫描 + 逐主体全属性展开；全串行、节流 900ms",
    limit_note:
      "按关键词扫描时 金泽/青浦 命中数达 62/41，未撞 LIMIT；但 **含『万安』的扫描曾撞 LIMIT=60**，故本轮改为逐关键词取主语集合再去重，避免漏检。",
    objects: [
      {
        id: "arz32mktwndn0e0f",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/arz32mktwndn0e0f",
        label: "普济桥",
        assertion: "A1",
        subject_hint: "普济桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=普济桥 / 普濟橋 / pujiqiao；address=金泽镇金溪居委会；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 上海市文物保护单位",
        supports: "普济桥的**对象身份与官方登记地**（金泽镇金溪居委会），保护级别＝上海市文物保护单位",
      },
      {
        id: "chlyrdj3o8ll81k8",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/chlyrdj3o8ll81k8",
        label: "万安桥",
        assertion: "A2",
        subject_hint: "万安桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=万安桥 / 萬安橋 / wananqiao；address=金泽镇金溪居委会；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 区级文物保护单位",
        supports: "万安桥的**对象身份与官方登记地**（金泽镇金溪居委会），保护级别＝区级文物保护单位",
      },
      {
        id: "y2d0fc4frppe4np3",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/y2d0fc4frppe4np3",
        label: "迎祥桥",
        assertion: "A1",
        subject_hint: "迎祥桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=迎祥桥 / 迎祥橋 / yingxiangqiao；address=金泽镇金溪居委会；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 上海市文物保护单位",
        supports:
          "（旁证，非 A1 的直接证据）金泽镇内跨金泽塘的那座桥亦在官方名录中登记；与地名库迎祥桥条目互证",
      },
      {
        id: "8orxolst3z45ptbc",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/8orxolst3z45ptbc",
        label: "颐浩寺遗址",
        assertion: "A3",
        subject_hint: "颐浩寺遗址",
        excerpt:
          "type=PhysicalCulturalHeritage；name=颐浩寺遗址 / 頤浩寺遺址 / yihaosiyizhi；address=金泽镇金溪居委会迎样街12号；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 区级文物保护单位",
        supports:
          "颐浩寺遗址的**对象身份、官方登记地址（迎样街12号）与保护级别（区级）**；⚠ 名录原文地址作「迎**样**街」，即「迎祥街」之异写，按 §12-25 记录不归一",
      },
      {
        id: "kk34epwgp7usskmw",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/kk34epwgp7usskmw",
        label: "金泽放生桥",
        assertion: "X-DISAMBIG",
        subject_hint: "金泽放生桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=金泽放生桥 / 金澤放生橋 / jinzefangshengqiao；address=金泽镇金溪居委会；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 区级文物保护单位",
        supports:
          "**消歧**：金泽镇内的放生桥官方名为「金泽放生桥」，与朱家角放生桥（跨漕港河，上海市文物保护单位）非同物 —— §12-25 命名变体必须显式登记",
      },
      {
        id: "gn3x06mgh0oyifm4",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/gn3x06mgh0oyifm4",
        label: "天皇阁桥",
        assertion: "X-DISAMBIG",
        subject_hint: "天皇阁桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=天皇阁桥 / 天皇閣橋 / tianhuanggeqiao；address=金泽镇金溪居委会；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 区级文物保护单位",
        supports:
          "**命名变体**：官方名录作「天皇阁桥」，上海市地方志办公室与青浦区政府档案页作「天王阁桥」，同一桥两种写法并存（属地著录差异），按 §12-25 并列登记",
      },
      {
        id: "62xepay38a2tx3d1",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/62xepay38a2tx3d1",
        label: "如意桥",
        assertion: "X-DISAMBIG",
        subject_hint: "如意桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=如意桥 / ruyiqiao；address=金泽镇金溪居委会；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 区级文物保护单位",
        supports: "金泽现存古桥清单的官方登记侧证（不计入本切片主张）",
      },
      {
        id: "x2xnjpzyf0ull2yo",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/x2xnjpzyf0ull2yo",
        label: "林老桥",
        assertion: "X-DISAMBIG",
        subject_hint: "林老桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=林老桥 / linlaoqiao；address=金泽镇金溪居委会；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 区级文物保护单位",
        supports: "金泽现存古桥清单的官方登记侧证（不计入本切片主张）",
      },
      // —— 同名异地：必须并列，防止「名称一致即同一对象」的跨镇误配 ——
      {
        id: "6z8jvxoramj6j7lr",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/6z8jvxoramj6j7lr",
        label: "普济桥（嘉定镇）",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "普济桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=普济桥 / 普濟橋 / pujiqiao；address=**嘉定镇秋霞社区东大街博乐路东侧**；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 区级文物保护单位",
        supports: "**同名异地**：上海市不可移动文物名录中另有一座「普济桥」在嘉定镇 —— 身份判据必须含地址，不能只凭名称",
      },
      {
        id: "vb8n6ipxl14w5yog",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/vb8n6ipxl14w5yog",
        label: "万安桥（金山山阳镇）",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "万安桥",
        excerpt:
          "type=PhysicalCulturalHeritage；name=万安桥 / 萬安橋 / wananqiao；address=**山阳镇九龙村4024号东侧**；source=上海市不可移动文物名录；type=上海市不可移动文物名录, 文物保护点",
        supports: "**同名异地**：金山山阳镇亦有一座「万安桥」",
      },
      {
        id: "zjnz6qxi2ie2q2et",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/zjnz6qxi2ie2q2et",
        label: "大团万安桥",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "万安桥",
        excerpt: "name=大團萬安橋 / 大团万安桥；address=大团镇徐桥村1组；type=上海市不可移动文物名录, 文物保护点",
        supports: "**同名异地**（浦东大团）",
      },
      {
        id: "kkdpdrkc440diox6",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/kkdpdrkc440diox6",
        label: "宣桥万安桥",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "万安桥",
        excerpt: "name=宣橋萬安橋 / 宣桥万安桥；address=宣桥镇三灶项埭村11组；type=上海市不可移动文物名录, 文物保护点",
        supports: "**同名异地**（浦东宣桥）",
      },
      {
        id: "lgym5a5ov36nyapo",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/lgym5a5ov36nyapo",
        label: "徐泾万安桥",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "万安桥",
        excerpt: "name=徐涇萬安橋 / 徐泾万安桥；address=徐泾镇陆家角村南侧；type=上海市不可移动文物名录, 文物保护点",
        supports: "**同名异地**（青浦徐泾，同区不同镇 —— 最危险的一类误配）",
      },
      {
        id: "gufq2tuwm2wy8zl1",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/gufq2tuwm2wy8zl1",
        label: "新场万安桥",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "万安桥",
        excerpt: "name=新场万安桥；address=新场镇坦直坦北村1组；type=上海市不可移动文物名录, 文物保护点",
        supports: "**同名异地**（浦东新场 —— 与本项目另一古镇同名，须特别注意）",
      },
      {
        id: "qmviibmqntdivwjy",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/qmviibmqntdivwjy",
        label: "赵屯万安桥",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "万安桥",
        excerpt: "name=zhaotunwananqiao；address=白鹤镇江南村九组；type=上海市不可移动文物名录, 文物保护点",
        supports: "**同名异地**（青浦白鹤镇，同区不同镇）",
      },
      {
        id: "n74t5lmvywzxhp1p",
        uri: "http://data.library.sh.cn/entity/physicalculturalheritage/n74t5lmvywzxhp1p",
        label: "陈岳万安桥",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "万安桥",
        excerpt: "name=chenyuewananqiao；address=白鹤镇塘湾村旧青浦镇北；type=上海市不可移动文物名录, 文物保护点",
        supports: "**同名异地**（青浦白鹤镇）",
      },
    ],
  },

  {
    key: "shl-geonames-dmz",
    provider: "shanghai-library-open-data",
    title: "上图开放数据 SPARQL — 地名库 data.library.sh.cn/graph/geonames（《青浦县地名志》系）",
    graph: "http://data.library.sh.cn/graph/geonames",
    raw_file: "hit-details.json",
    content_type: "application/sparql-results+json",
    license_code: "OPEN-DATA",
    retrieval: "SPARQL GET，全字面量扫描（该图为小图，可直接扫）",
    limit_note: "「金泽」命中 14 行、「万安桥」3 行、「金泽塘」1 行（经迎祥桥条目 description 命中）；「普济桥」在该图 0 命中（已如实记录，未当作「上图没有普济桥」）。",
    objects: [
      {
        id: "y7kgl0030jtps4qv",
        uri: "http://data.library.sh.cn/dmz/entity/place/y7kgl0030jtps4qv",
        label: "迎祥桥",
        assertion: "A1",
        subject_hint: "金泽塘",
        excerpt:
          "位于青浦县金泽镇南市梢，跨金泽塘。元至元年间（1335～1340年）建。5孔梁式石桥，长34.25米，宽2.14米，中孔跨径6.3米，二孔、三孔为5米、4.3米。1979年被列为县级文物保护单位。",
        supports:
          "**「金泽塘」作为真实水道名的独立着录**（这是 A1 的桥—水关系在水道一侧的关键一环）；同时给出该水道在金泽镇南市梢的空间线索（相对位置，非坐标）",
      },
      {
        id: "8pn1fuwx2ccbsoy7",
        uri: "http://data.library.sh.cn/dmz/entity/place/8pn1fuwx2ccbsoy7",
        label: "万安桥",
        assertion: "A2",
        subject_hint: "万安桥",
        excerpt:
          "又名万安亭桥。位于青浦县金泽镇北市梢，跨秀州塘。建于南宋景定年间（1260～1264年）。弧形单孔石桥，桥长29米，宽2.6米，跨径9.8米。1959年被列为县级文物保护单位。",
        supports:
          "**「又名万安亭桥」** —— A2「亭桥」形制的独立着录；并给出南宋景定年间纪年与「北市梢」方位。⚠ 该条记作「跨**秀州塘**」，与青浦区政府官网/青浦博物馆的「跨金泽塘／跨市河」**不一致** → 另行登记为冲突，不静默择一",
      },
      {
        id: "ij2dm4q8uoe086kv",
        uri: "http://data.library.sh.cn/dmz/entity/place/ij2dm4q8uoe086kv",
        label: "金泽",
        assertion: "A1",
        subject_hint: "金泽",
        excerpt:
          "在县境西南部，沪青平公路东侧。金泽镇人民政府驻地。面积约40公顷。人口4000。古名白苎里。因地处湖荡泽地，土地肥沃，物产丰富，古有“穑人获泽如金”之说，故名金泽。聚落沿水呈南北向矩形分布。……有宋、元年间建的迎祥桥、普济桥、万安桥。沪青平公路经过。",
        supports: "普济桥／万安桥 **同在金泽聚落内**的地名志着录（对象所属地）",
      },
      {
        id: "ohj05t8scnz6jgkx",
        uri: "http://data.library.sh.cn/dmz/entity/place/ohj05t8scnz6jgkx",
        label: "金泽镇",
        assertion: "A1",
        subject_hint: "金泽镇",
        excerpt:
          "位于青浦县西南部。……镇人民政府驻地金泽，辖3个居民委员会、10个村民委员会。面积25.26平方公里，人口1.45万。地处水乡，水面积890多公顷，盛产虾、蟹。风景秀丽，是上海的“桥乡”，现存古桥21座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥、如意桥，建于清代的天王阁桥、放生桥等。农业以水稻种植为主。有上海大观园。沪青平公路过境。",
        supports:
          "**普济桥、万安桥的宋代纪年**与「桥乡」定性；并给出清代「天王阁桥」「放生桥」的官方写法（用于命名变体登记）",
      },
      {
        id: "3y0xj13ie16rj5p8",
        uri: "http://data.library.sh.cn/entity/place/3y0xj13ie16rj5p8",
        label: "青浦县",
        assertion: "X-ALIGN",
        subject_hint: "青浦县",
        excerpt: "type=ontology/Place；label=青浦县 / 青浦縣（位于 dmz.library.sh.cn/graph/place）",
        supports:
          "**知识对齐**：金泽／金泽镇 在 geonames 中的上位地点为「青浦县」实体（跨图链接，位于 dmz 的 place 图）",
      },
    ],
  },

  {
    key: "shl-whzk-photo",
    provider: "shanghai-library-open-data",
    title: "上图开放数据 SPARQL — 老照片库 whzk.library.sh.cn/graph/photo（上海年华·上海老照片）",
    graph: "http://whzk.library.sh.cn/graph/photo",
    raw_file: "hit-details.json",
    content_type: "application/sparql-results+json",
    license_code: "OPEN-DATA",
    retrieval: "SPARQL GET，全字面量扫描",
    limit_note: "「普济桥」1 行、「金泽」3 行、「金泽镇」2 行、「金泽塘」0 行；「金澤」（繁体）在该图 0 命中。",
    objects: [
      {
        id: "p6l1tz1r5g5ojkun",
        uri: "http://data.library.sh.cn/whzk/photo/p6l1tz1r5g5ojkun",
        label: "普济桥（上海老照片）",
        assertion: "A1",
        subject_hint: "普济桥",
        excerpt:
          "青浦县金泽镇的普济桥建于宋咸淳三年（1267年），桥为单孔石拱，是上海最古老的石桥之一。P83",
        supports:
          "普济桥 **在金泽镇** 且为 **宋咸淳三年（1267）单孔石拱** 的独立着录；⚠ 同条 `placeValue` 写作「青浦县金泽镇的**善**济桥」（「普」之误录）、`address` 字段为「江苏省苏州市相城区阳澄湖西路」（系数字化承办方地址，非桥梁位置）—— 两处均在 note 中留痕，不得当作桥梁位置或异名",
      },
    ],
  },

  {
    key: "shl-gj-catalog",
    provider: "shanghai-library-open-data",
    title: "上图开放数据 SPARQL — 古籍书目 gj.library.sh.cn/graph/instance（dc:title 定向检索）",
    graph: "http://gj.library.sh.cn/graph/instance",
    raw_file: "hit-details.json",
    content_type: "application/sparql-results+json",
    license_code: "OPEN-DATA",
    retrieval:
      "SPARQL GET，**只搜 dc:title 谓词**（该图 33.6M 三元组，全字面量扫描会超时；改标题谓词后约 30s 返回）",
    limit_note:
      "「金澤」11 行、「頤浩」2 行、「亭橋」0 行、「萬安橋」0 行、「普濟橋」0 行、「金澤塘」0 行、「莫匹其偉」0 行 —— 0 命中项已逐条落入检索日志。",
    objects: [
      {
        id: "ntclj7y3me5bvlax",
        uri: "http://data.library.sh.cn/gj/resource/work/ntclj7y3me5bvlax",
        label: "金澤小志六卷（work）",
        assertion: "S1-B-LEAD",
        subject_hint: "金泽小志",
        excerpt:
          "《金澤小志六卷》/《金泽小志六卷》/ Jin Ze Xiao Zhi Liu Juan；creator=(清)周鳳池撰；prefaceAndPostscript=(清)蔡自申續；classification=史 地理 雜志 / 史 地理 方志；instanceOf=…/work/ntclj7y3me5bvlax",
        supports:
          "**金泽唯一的乡镇专志**（清周鳳池纂、蔡自申續纂）在上图古籍书目中的著录 —— 本切片「万安亭桥」引文与「四十二虹桥」谚语的直接方志来源；但**未取得其影印全文**（见 limit）",
      },
      {
        id: "dqfavccjdcmnr10n",
        uri: "http://data.library.sh.cn/gj/resource/instance/dqfavccjdcmnr10n",
        label: "[道光]金澤小志六卷首一卷（清乾隆嘉慶間纂道光十一年續纂抄本）",
        assertion: "S1-B-LEAD",
        subject_hint: "金泽小志",
        excerpt:
          "identifier=史71556491；label=清乾隆嘉慶間纂道光十一年續纂抄本；creator=清周鳳池纂;清蔡自申續纂；title=[道光]金泽小志六卷首一卷 / [道光]金澤小志六卷首一卷；classification=史 方志類 地志之屬；edition=chao-ben",
        supports:
          "《金澤小志》具体版本的**索书号（史71556491）与版本项** —— 供后续「取原文」用；本轮 PDF 全文库（`pdf/list`）按题名检索 `金澤小志`／`周鳳池` **均 0 命中**，即该本**未在该平台的全文库里**，故本轮**未取得原文**",
      },
      {
        id: "m2q2wtzudwbcgi2v",
        uri: "http://data.library.sh.cn/gj/resource/instance/m2q2wtzudwbcgi2v",
        label: "[安徽黟县]金泽史氏家谱（清乾隆二十九年善修堂刻本）",
        assertion: "X-SAME-NAME-OTHER-PLACE",
        subject_hint: "金泽",
        excerpt:
          "identifier=史41026155；title=[安徽黟县]金泽史氏家谱不分卷 / [安徽黟縣]金澤史氏家譜不分卷；creator=清史繼周纂修；classification=史 譜牒類",
        supports:
          "**同名异地**：古籍书目里出现的「金泽」是**安徽黟县**的金泽，与本切片无关 —— 检索「金泽」时若不看上下文会误纳",
      },
      {
        id: "vukvkticwy8ektsi",
        uri: "http://data.library.sh.cn/gj/resource/instance/vukvkticwy8ektsi",
        label: "吕忠穆公（颐浩）年谱（清乾隆四十二年孔繼涵抄本）",
        assertion: "X-SAME-NAME-OTHER-PERSON",
        subject_hint: "颐浩",
        excerpt:
          "identifier=史20908716；title=吕忠穆公（颐浩）年谱一卷勤王记一卷遗事一卷逢辰记一卷 / 呂忠穆公（頤浩）年譜…；label=清乾隆四十二年孔繼涵抄本",
        supports:
          "**同名（同人）异指**：古籍书目中的「頤浩」指**吕颐浩本人**（其年谱），**不是**「颐浩寺」—— 检索「颐浩」时的假阳性，已如实登记为 NO_RELEVANCE_TO_TEMPLE",
      },
      {
        id: "w7ofzsscdoqbbuae",
        uri: "http://data.library.sh.cn/gj/resource/instance/w7ofzsscdoqbbuae",
        label: "武林靈隱志誌八卷（清光緒14年刻本）等 40 条",
        assertion: "A5",
        subject_hint: "靈隱",
        excerpt:
          "《武林靈隱志誌八卷》(清光緒14年 錢塘丁氏嘉惠堂刻本) / 《武林靈隱寺志八卷》(1994 影印本) / 《靈隱子六卷》(明萬曆二十四年陳大科刻本) / 《靈隱書藏紀事一卷》(1994 影印本) …",
        supports:
          "**阴性证据（须显式登记）**：古籍书目中「靈隱」的 40 条命中**全部**是杭州灵隐寺／灵隐子等，**没有一条**是 A5 引文「虽杭之灵隐，苏之承天莫匹其伟」的出处 —— 即该句**不在**上图古籍书目层面的可检索题名范围内",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// S1-C：官方遗产／地方史来源（政府域名、政府新闻办、博物馆、地方志办公室）
// ---------------------------------------------------------------------------
export const OFFICIAL_SOURCES = [
  {
    key: "s1c-qp-gov-ancient-bridges-2025",
    provider: "shanghai-qingpu-gov",
    title: "上海市青浦区人民政府｜遗珠拾粹——探访青浦多种形式的古桥（2025-01-16，来源「青浦档案」微信公众号，整理自《遗珠拾粹——青浦古桥100座》等馆藏资料）",
    source_uri: "https://www.shqp.gov.cn/shqp/ggfw/bmts/20250116/1224818.html",
    source_date: "2025-01-16",
    content_type: "text/html",
    license_code: "GOV-PUBLIC",
    retrieval: "WebFetch 直接取回页面正文（静态 HTML）",
    objects: [
      {
        id: "qp-gov-2025-puji",
        locator: "https://www.shqp.gov.cn/shqp/ggfw/bmts/20250116/1224818.html#普济桥",
        label: "青浦区政府档案页·普济桥",
        assertion: "A1",
        subject_hint: "普济桥",
        place_hint: "金泽镇",
        time_hint: "1267",
        excerpt:
          "普济桥 位于金泽古镇，东西向跨金泽塘，俗称“紫石桥”，因桥畔有圣堂庙，故又称“圣堂桥”，是上海地区保存最完好、最古老的石桥之一。宋咸淳三年（1267年）建，清雍正初期重修时加置石栏，系单孔石拱桥……1962 年，被列为上海市文物保护单位，后被分别收作《上海辞典》《中国名胜词典》条目。",
        supports: "**A1 的直接证据**：官方档案页明确「普济桥……东西向跨金泽塘」",
      },
      {
        id: "qp-gov-2025-wanan",
        locator: "https://www.shqp.gov.cn/shqp/ggfw/bmts/20250116/1224818.html#万安桥",
        label: "青浦区政府档案页·万安桥",
        assertion: "A2",
        subject_hint: "万安桥",
        place_hint: "金泽镇",
        time_hint: "1260–1264 / 1342",
        excerpt:
          "万安桥 位于金泽古镇，东西向跨金泽塘，俗称“紫石桥”，又称“万安亭桥”，是青浦地区建造年代最古老的桥。宋景定年间（1260-1264年）始建，元至正二年（1342年）桥上加建廊亭。……此桥具有宋代石桥特征，结构、造型、用石与普济桥基本相同，两桥同跨一河，南北相峙，称为“姊妹桥”。……如今，亭、阁已废，而石栏板上还留有当年亭柱的榫口。",
        supports:
          "**A2 的直接证据**：「又称『万安亭桥』」+「元至正二年（1342年）桥上加建廊亭」；并给出**亭已废**的现代状态（石栏板尚留亭柱榫口）→ 同时支撑 change record 由 unknown 升为 evidenced",
      },
    ],
  },
  {
    key: "s1c-qp-gov-wanan-2023",
    provider: "shanghai-qingpu-gov",
    title: "上海市青浦区人民政府｜万安桥（2023-07-06）",
    source_uri: "https://www.shqp.gov.cn/tv/wwgj/20230706/1124867.html",
    source_date: "2023-07-06",
    content_type: "text/html",
    license_code: "GOV-PUBLIC",
    retrieval: "WebSearch 页面正文（静态 HTML）",
    objects: [
      {
        id: "qp-gov-2023-wanan",
        locator: "https://www.shqp.gov.cn/tv/wwgj/20230706/1124867.html",
        label: "青浦区政府·万安桥",
        assertion: "A2",
        subject_hint: "万安桥",
        place_hint: "金泽镇北市",
        time_hint: "1260–1264 / 1342 / 1561 / 1620 / 1791 / 1999",
        excerpt:
          "位于金泽镇北市，东西向，跨金泽塘，俗称“紫石桥”，又称“万安亭桥”。宋景定年间(1260-1264年)始建，元至正二年(1342年)桥上加建廊亭，“亭建如穿廊，数间飞出，其出尽处，又有佛庐相向，高与亭埒，亭中四望，水天一碧，淀山峙其东，真奇观也。”旧有“金泽四十二虹桥，万安为首”之说。明嘉靖四十年(1561年)，僧性显修；万历四十八年(1620年)、乾隆五十六年(1791年)重修，1999年又修。……二桥同跨一河，南北相峙，称为“姊妹桥”。1999年公布为青浦区文物保护单位。",
        supports:
          "A2 的**第二份官方来源**，且它把《金泽小志》的「亭建如穿廊…」原文**内嵌引用**；同时给出「位于金泽镇**北市**」（与 A1 方位冲突判定相关）",
      },
    ],
  },
  {
    key: "s1c-qp-museum",
    provider: "shanghai-qingpu-museum",
    title: "上海青浦博物馆｜颐浩禅寺 ／ 普济桥 ／ 万安桥（2019-03-04）",
    source_uri: "https://museum.shqp.gov.cn/museum/sm/20190304/479097.html",
    source_date: "2019-03-04",
    content_type: "text/html",
    license_code: "GOV-PUBLIC",
    retrieval: "WebFetch 直接取回页面正文（静态 HTML）",
    objects: [
      {
        id: "qp-museum-yihao-1938",
        locator: "https://museum.shqp.gov.cn/museum/sm/20190304/479097.html",
        label: "青浦博物馆·颐浩禅寺（1938 段）",
        assertion: "A3",
        subject_hint: "颐浩寺遗址",
        place_hint: "金泽镇南隅",
        time_hint: "1938",
        excerpt:
          "位于金泽镇南隅，颐浩寺始建于宋景定元年（1260），由里人费辅之创建，相传为宰相吕颐浩故宅而得名。元至元二十五年（1288）建大雄宝殿等，元贞元年（1295）奉旨名为颐浩禅寺。时有鸳鸯楼、大山门、贝多林等亭台楼阁20余处，规模宏大，世称古刹。明洪武年间（1368～1398）修葺，后迭经兵燹，屡毁屡建，清光绪三十二年（1906）又重修，民国二十七年（1938）大部分建筑毁于日军轰炸。……现仅存遗古银杏1株，元“松江府颐浩寺碑记”，碑1方，大殿方形柱础若干方及相传为赵孟頫所作的部分“不断云”石刻。今由当地众信在原址内再建一小殿宇，并请赵朴初先生题额“颐浩禅寺”。……1959年3月公布为青浦县文物保护单位。",
        supports:
          "**A3 的直接证据**（官方博物馆页：民国二十七年 1938 大部分建筑毁于日军轰炸）；同时提供**A4「原址」**的独立表述「今由当地众信**在原址内**再建一小殿宇」（⚠ 该句**无年份**，故不能单独支撑「1992」）",
      },
      {
        id: "qp-museum-puji",
        locator: "https://museum.shqp.gov.cn/museum/ql/20190304/479107.html",
        label: "青浦博物馆·普济桥",
        assertion: "A1",
        subject_hint: "普济桥",
        place_hint: "金泽镇南市",
        time_hint: "1267 / 1959 / 1962 / 1999",
        excerpt:
          "普济桥 位于金泽镇南市(沪青平公路东500米处)，俗称紫石桥，又叫圣堂桥，单孔石拱桥，东西向，跨市河。宋咸淳三年(1267)建。清雍正初重修。……1999年9月，文物部门对其进行了大修，为上海地区现存最古的桥梁。1959年3月被公布为青浦县文物保护单位，1962年10月被公布为上海市文物保护单位。",
        supports:
          "普济桥**位于金泽镇南市**（与 Legacy「北市」冲突的一方证据）；并给出「跨**市河**」的官方另一表述（与「跨金泽塘」并存）",
      },
      {
        id: "qp-museum-wanan",
        locator: "https://museum.shqp.gov.cn/museum/ql/20190304/479103.html",
        label: "青浦博物馆·万安桥",
        assertion: "A2",
        subject_hint: "万安桥",
        place_hint: "金泽镇北市",
        time_hint: "1260–1264 / 1342 / 1999",
        excerpt:
          "位于金泽镇北市(沪青平公路东300米处)，又称万安亭桥，俗称紫石桥，单孔石拱桥，东西向，跨市河。宋景定年间(1260~1264)建，元至正二年(1342)桥上加建廊亭，桥下有佛阁，后废。明嘉靖万历及清乾隆间曾三次重修，1999年9月修缮。……1959年3月被公布为青浦县文物保护单位。",
        supports:
          "A2 的**第三份官方来源**（青浦博物馆）：「又称万安亭桥」「元至正二年(1342)桥上加建廊亭，桥下有佛阁，后废」",
      },
    ],
  },
  {
    key: "s1c-qp-news-green-2020",
    provider: "shanghai-qingpu-gov-news-office",
    title: "人民日报客户端「人民号」·绿色青浦（上海市青浦区人民政府新闻办公室官方平台）｜青浦文物·颐浩寺遗址（2020-10-28）",
    source_uri: "https://www.peopleapp.com/rmharticle/30019836818",
    source_date: "2020-10-28",
    content_type: "text/html",
    license_code: "GOV-PUBLIC",
    retrieval: "WebFetch 直接取回页面正文",
    objects: [
      {
        id: "green-2020-yihao",
        locator: "https://www.peopleapp.com/rmharticle/30019836818",
        label: "青浦区政府新闻办·颐浩寺遗址",
        assertion: "A3",
        subject_hint: "颐浩寺遗址",
        place_hint: "金泽镇金溪居委会迎祥街12号",
        time_hint: "1260 / 1288 / 1295 / 1341 / 1938",
        excerpt:
          "颐浩寺遗址位于金泽镇金溪居委会迎祥街12号。宋景定元年（1260年）里人费辅之创建，相传为宰相吕颐浩宅，故得名。元至元二十五年（1288年）建大雄宝殿等，元贞元年（1295年）奉旨赐名颐浩禅寺，时有鸳鸯楼、大山门等亭台楼阁二十余处，规模宏大，“虽杭之灵隐，苏之承天，莫匹其伟。”后历代多次修葺，1938年大部分建筑毁于轰炸。现仅存元代“松江府颐浩寺记”碑1方、“不断云”石刻、大殿柱础12个、佛台基座1个和少量破碎方砖。……颐浩寺遗址现保存基本完好。现为青浦区级文物保护单位。",
        supports:
          "**A3 的第二份官方来源**（政府新闻办）；**A5 引文的官方引述之一**（与《松江府志》的归属见 s1c-qp-civ-2025）；并给出遗址现存物与保护级别",
      },
    ],
  },
  {
    key: "s1c-qp-civ-2025",
    provider: "shanghai-qingpu-civilization-net",
    title: "青浦文明网（中共上海市青浦区委宣传部）｜《品读金泽》之金泽古韵（2025-04-14）",
    source_uri: "https://wm.shqp.gov.cn/wm/lhx/20250414/1277229.html",
    source_date: "2025-04-14",
    content_type: "text/html",
    license_code: "GOV-PUBLIC",
    retrieval: "WebSearch 页面正文（静态 HTML）",
    objects: [
      {
        id: "qp-civ-2025-yihao-1992",
        locator: "https://wm.shqp.gov.cn/wm/lhx/20250414/1277229.html",
        label: "青浦文明网·颐浩禅寺 1992 原址重建",
        assertion: "A4",
        subject_hint: "颐浩寺遗址",
        place_hint: "金泽镇",
        time_hint: "1992",
        excerpt:
          "颐浩禅寺，始建于南宋景定元年(1260年)，盛于元明，据《松江府志》记载：金泽颐浩寺“虽杭之灵隐，苏之承天，莫匹其伟。”指颐浩寺规模，要超过杭州最大的灵隐寺和苏州最大的承天寺。相传有5048间，占半个古镇。……1992年，在颐浩寺中心原址重建寺院，建造了大雄宝殿、观音殿、地藏王殿及两套偏殿，还造了山门，使寺院初具规模。中国佛教学会会长赵朴初先生为此亲笔题书“颐浩禅寺”匾额。",
        supports:
          "**A4 的直接证据**：「1992年，在颐浩寺中心**原址重建**寺院」—— 年份＋原址＋重建三要素同现于一个 .gov.cn 来源；**同时是 A5 引文归属《松江府志》的官方来源**",
      },
      {
        id: "qp-civ-2025-songjiangfu",
        locator: "https://wm.shqp.gov.cn/wm/lhx/20250414/1277229.html#松江府志",
        label: "青浦文明网·A5 引文归属",
        assertion: "A5",
        subject_hint: "颐浩寺遗址",
        place_hint: "金泽镇",
        time_hint: null,
        excerpt: "据《松江府志》记载：金泽颐浩寺“虽杭之灵隐，苏之承天，莫匹其伟。”",
        supports:
          "把 A5 引文的**中间来源具名为《松江府志》** —— 但本轮**未取得《松江府志》原文**（正德本 696 页复本卷次/页映射未打通），故仍属「引文之引文」",
      },
    ],
  },
  {
    key: "s1c-xinmin-2021",
    provider: "xinmin-evening-news",
    title: "新民晚报｜金泽古镇 静谧水乡（2021-11-02，夏菁岑）",
    source_uri: "https://paper.xinmin.cn/html/xmwb/2021-11-02/22/120938.html",
    source_date: "2021-11-02",
    content_type: "text/html",
    license_code: "NEWS-PUBLIC",
    retrieval: "WebSearch 页面正文",
    objects: [
      {
        id: "xmwb-2021-yihao",
        locator: "https://paper.xinmin.cn/html/xmwb/2021-11-02/22/120938.html",
        label: "新民晚报·颐浩禅寺（1992 修复）",
        assertion: "A4",
        subject_hint: "颐浩寺遗址",
        place_hint: "金泽镇",
        time_hint: "1938 / 1958 / 1992",
        excerpt:
          "《松江府志》称“虽杭之灵隐，苏之承天，莫匹其伟”。1938年，该寺大部毁于日军炮火。1958年拆移，仅存“颐浩禅寺”记碑一方，古银杏树数株，“不断云”石刻断石14块，殿宇柱脚16块等。1992年，颐浩禅寺修复。700多年来，一棵巨大的古银杏默默守护着千年古刹，一地杏黄的秋色让人流连忘返。",
        supports:
          "媒体旁证：1992 修复 + 并把 A5 引文归给《松江府志》；**仅作旁证，不作为唯一依据**（§3 来源次序：媒体属 S2 层级）",
      },
    ],
  },
  {
    key: "s1c-shtong-jinze",
    provider: "shanghai-local-chronicles-office",
    title: "上海市地方志办公室（上海通·上海数字方志）｜上海桥乡:金泽",
    source_uri:
      "https://www.shtong.gov.cn/difangzhi-front/book/detailNew?oneId=1&bookId=81772&parentNodeId=81790&nodeId=109138&type=-1",
    source_date: null,
    content_type: "text/html",
    license_code: "GOV-PUBLIC",
    retrieval:
      "⚠ **限制已如实登记**：该站为 JS 动态渲染，WebFetch 仅取到「页面正在加载，请稍候…」骨架，**未能直接取回正文**；下列 excerpt 来自搜索引擎对**同一 URL** 的渲染快照。locator 为该页规范 URL，供人工回访复核。",
    objects: [
      {
        id: "shtong-jinze-xiaozhi-wanan",
        locator:
          "https://www.shtong.gov.cn/difangzhi-front/book/detailNew?oneId=1&bookId=81772&parentNodeId=81790&nodeId=109138&type=-1",
        label: "上海市地方志办公室·上海桥乡:金泽（《金泽小志》万安亭桥引文）",
        assertion: "A2",
        subject_hint: "万安桥",
        place_hint: "金泽镇北市",
        time_hint: "1260–1264 / 1342",
        excerpt:
          "万安桥在金泽镇北市，原是石板桥，宋景定年间，即1260~1264年建，明嘉靖、万历及清乾隆间曾3次重修。桥长29米，宽2.6米，跨径9.8米，为弧形单孔石拱桥。元至正二年在桥上建廊亭，又名万安亭桥。据《金泽小志》记载：“万安亭桥，跨市北。亭建如穿廊，数间飞出。其出尽处，又有佛庐相向，高于亭埒。亭中四望，水天一碧，淀山峙其东，真奇观也。谚云：‘金泽四十二虹桥，万安为首’。”桥的构造与普济桥相同，具有宋代石拱桥的特征。1959年列为青浦县文物保护单位。",
        supports:
          "**A2 的方志引文侧证**：地方志办公室把《金泽小志》「万安亭桥，跨市北。亭建如穿廊，数间飞出…」作为引文给出，且明确「元至正二年在桥上建廊亭，又名万安亭桥」",
      },
      {
        id: "shtong-jinze-puji-ciwei",
        locator:
          "https://www.shtong.gov.cn/difangzhi-front/book/detailNew?oneId=1&bookId=81772&parentNodeId=81790&nodeId=109138&type=-1",
        label: "上海市地方志办公室·普济桥「位于南市」",
        assertion: "A1-CONFLICT",
        subject_hint: "普济桥",
        place_hint: "金泽镇南市",
        time_hint: "1267",
        excerpt: "普济桥在金泽镇南市，又称紫石桥，俗名圣堂桥。宋咸淳三年，即1267年建，清雍正年间重修。……1987年列为市级文物保护单位。",
        supports: "**A1 方位冲突的证据方之一**：地方志办公室亦作「金泽镇**南市**」，与 Legacy「北市」不符",
      },
    ],
  },
  {
    key: "s1c-anc-bridge",
    provider: "jiangnan-ancient-bridge-research-association",
    title: "江南古桥文化研究会｜普济桥",
    source_uri: "http://www.anc-bridge.org.cn/pro_view.asp?id=60",
    source_date: null,
    content_type: "text/html",
    license_code: "PUBLIC",
    retrieval: "WebSearch 页面正文",
    objects: [
      {
        id: "ancbridge-puji",
        locator: "http://www.anc-bridge.org.cn/pro_view.asp?id=60",
        label: "江南古桥研究会·普济桥",
        assertion: "A1",
        subject_hint: "普济桥",
        place_hint: "金泽镇中部",
        time_hint: "1267 / 1962",
        excerpt:
          "普济桥位于金泽镇中部，东西向，跨金泽塘，俗称“紫石桥”，又称“圣堂桥”。宋咸淳三年( 1267 )建，清雍正初重修。……1962年被公布为上海市文物保护单位。",
        supports: "A1 桥—水关系的**第三方旁证**（且它作「金泽镇**中部**」，构成第三方位表述）",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// 冲突登记（§1 CONFLICT：可靠来源互相矛盾时保留双方，禁止静默归一）
// ---------------------------------------------------------------------------
export const CONFLICTS = [
  {
    code: "T11-C1",
    assertion: "A1b",
    subject: "普济桥的历史方位（Legacy「位于金泽镇北市」）",
    side_a: {
      text: "位于金泽镇北市（Legacy 实体描述原文）",
      sources: ["hushang-jingwei:entity:JZ-BLD-001（Legacy 描述）"],
    },
    side_b: {
      text: "位于金泽镇南市 / 金泽镇中部 / 金泽古镇",
      sources: [
        "上海青浦博物馆（金泽镇南市）",
        "上海市地方志办公室（金泽镇南市）",
        "江南古桥文化研究会（金泽镇中部）",
        "上海市青浦区人民政府档案页（金泽古镇）",
      ],
    },
    note:
      "Legacy 的「北市」与四份独立来源的「南市／中部／金泽古镇」不符；而「金泽镇北市」恰是**官方对万安桥**的表述（青浦区政府 2023 页、青浦博物馆、上图地名库）。因此更可能是 Legacy 把万安桥的方位句写到了普济桥名下 —— 但**本 Task 只登记冲突，不裁决**（§1 CONFLICT：保留双方、阻断静默解决）。该句不得再作为 active historical assertion（已移出 active set），原文保留于 historical_source_refs 与 uncertainty_note。",
  },
  {
    code: "T11-C2",
    assertion: "A1/A2（水道名）",
    subject: "万安桥所跨水道之名",
    side_a: {
      text: "跨金泽塘（青浦区政府档案页 2025、青浦区政府 2023；博物馆作「跨市河」）",
      sources: [
        "上海市青浦区人民政府 2025-01-16",
        "上海市青浦区人民政府 2023-07-06",
        "上海青浦博物馆",
        "上海市地方志办公室（跨市河）",
      ],
    },
    side_b: {
      text: "跨秀州塘（上图地名库《青浦县地名志》系万安桥条目）",
      sources: ["data.library.sh.cn/graph/geonames → dmz/entity/place/8pn1fuwx2ccbsoy7"],
    },
    note:
      "⚠ 另有一条强反向线索：上海市地名志道路库中「万安街」位于**金山朱泾镇**，其描述作「西迄秀州塘万安桥」——即「秀州塘＋万安桥」的组合在**金山朱泾**确实存在。故上图地名库万安桥条目的「跨秀州塘」疑为**跨镇误配**，但本 Task **不得代为裁决**。影响面：金泽塘特征的「两桥所跨对象」身份可辩护性下降；wananqiao--spans_waterway--jinzetang（E1）的措辞须改为「据青浦区官方来源跨金泽塘；上图地名库另作跨秀州塘（存疑，见 T11-C2）」。",
  },
];

// 命名变体（§12-25：必须显式登记，不得静默归一）
export const NAME_VARIANTS = [
  { canonical: "普济桥", variants: ["普濟橋", "紫石桥（俗称）", "圣堂桥（桥畔有圣堂庙，故又称）"], note: "同日另见嘉定镇普济桥（同名异地，见 X-SAME-NAME-OTHER-PLACE）" },
  { canonical: "万安桥", variants: ["萬安橋", "万安亭桥（元至正二年加建廊亭后之名）", "紫石桥（俗称）"], note: "上海范围内另有金山山阳、浦东大团、浦东宣桥、青浦徐泾、浦东新场、青浦白鹤（赵屯／陈岳）共 6 座同名万安桥" },
  { canonical: "颐浩寺遗址", variants: ["頤浩寺遺址", "颐浩寺", "颐浩禅寺", "迎样街12号（官方名录原文异写，即迎祥街）"], note: "「颐浩」亦指吕颐浩其人，古籍书目中的《吕忠穆公（颐浩）年谱》不指本寺" },
  { canonical: "金泽塘", variants: ["金澤塘", "市河（青浦博物馆/上海市地方志办公室对同一水道的另一种表述）"], note: "⚠「金泽塘」与「金泽唐氏民宅」（jinzetangshiminzhai）**不是同一对象**，拼音相近易误合" },
  { canonical: "金泽镇", variants: ["金澤", "金泽", "白苎里（古名）"], note: "⚠ 另有安徽黟县「金泽」、日本金泽市、「金泽史氏家谱」等同名异地" },
  { canonical: "吕颐浩", variants: ["呂頤浩", "吕忠穆公"], note: "⚠ 家谱库另有 3 个名为「吕颐浩」的**家族祖先**实体（roleOfFamily=始迁祖/始祖/一世祖，temporalValue 含「明」），与南宋吕颐浩**身份不可合并**" },
  { canonical: "天皇阁桥", variants: ["天皇閣橋", "天王阁桥（上海市地方志办公室/青浦区政府档案页写法）"], note: "同一桥两种写法并存，属地著录差异" },
];
