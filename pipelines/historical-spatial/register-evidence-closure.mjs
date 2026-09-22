// pipelines/historical-spatial/register-evidence-closure.mjs
//
// TASK-0011 S1-A/S1-C 的**唯一写库入口**：把本轮为关闭 A1–A5 而取得的独立来源，
// 落成 §6 语义的三段链 —— Source Record → Evidence →（供 slice 定义以选择器复用的）门禁快照。
//
// 纪律：
//  · 只写 source_records / evidence / evidence_gate_audit 三张表；**不写** claims / relations /
//    visual_assets / entities，因此既有基底与 Knowledge Weave 完全不动（§0.4）。
//  · §6：每条来源必须保留 provider / title / source_uri / creator / 记录日期 / locator /
//    逐字 excerpt / 取回日期 / 权利 / extraction_method / verification_status。
//  · §12-2：Raw Store 只追加（存在即跳过，不覆写）。
//  · §12-3：published 恒 0（本脚本不产生任何 verified/published）。
//  · §12-8：不做 OCR 事实化。凡未逐页定位/未直接渲染者，一律 verification_status='candidate'
//    并在 metadata 里写明**限制**，绝不把"检索索引快照"伪装成"已渲染页面"。
//  · §12-20：每条新 Evidence 立即写 G0–G6 快照（delete+insert，与 TASK-0004/0005 一致）。
//  · §12-22：幂等 —— 已存在同 (source,locator,extraction_method,quote 哈希) 的 Evidence 行则**复用**，
//    不重复插入、不删除既有行。

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { run, runMany, queryRows, queryValue } from "../../packages/data-access/src/index.mjs";
import { evaluateGates, GATE_CODES } from "../evidence/gates.mjs";

const sha256 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

// ---------------------------------------------------------------------------
// 0) Raw Store（只追加）
// ---------------------------------------------------------------------------
const RAW_ROOT = "D:/MoHen/data/raw/historical-spatial/jinze/t11-closure";
const RUN_DIR = path.join(RAW_ROOT, "t11-sources-20260922-closure");

const saveRaw = (name, content) => {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  const p = path.join(RUN_DIR, name);
  if (fs.existsSync(p)) return p; // append-only：存在即跳过
  fs.writeFileSync(p, content, "utf8");
  return p;
};

// ---------------------------------------------------------------------------
// 1) 来源登记（§6）
// ---------------------------------------------------------------------------
// 每条 = { key, provider, title, creator, source_date, source_uri, content_type, license_code,
//          date_basis, limitation, underlying_edition?, raw_file }
const SOURCES = [
  {
    key: "qingpu-gov-yizhushicui",
    provider: "qingpu-government",
    title: "遗珠拾粹——探访青浦多种形式的古桥（上海市青浦区人民政府官网·便民提示）",
    creator: "上海市青浦区人民政府（来源：“青浦档案”微信公众号；本文整理自《遗珠拾粹——青浦古桥100座》等馆藏资料）",
    source_date: "2025-01-16",
    source_uri: "https://www.shqp.gov.cn/shqp/ggfw/bmts/20250116/1224818.html",
    content_type: "text/html",
    license_code: null,
    date_basis: "page_header",
    limitation: null,
    raw_file: "src-qingpu-gov-yizhushicui.json",
  },
  {
    key: "shtong-jinze-qiaoxiang",
    provider: "shanghai-local-chronicles-office",
    title: "上海市地方志办公室·上海通（上海数字方志）｜上海桥乡：金泽",
    creator: "上海市地方志办公室",
    source_date: null,
    source_uri:
      "https://www.shtong.gov.cn/difangzhi-front/book/detailNew?oneId=1&bookId=81772&parentNodeId=81790&nodeId=109138&type=-1",
    content_type: "text/html",
    license_code: null,
    date_basis: "none",
    limitation:
      "该站为 JS 动态渲染 SPA：直接抓取仅得「页面正在加载，请稍候…」骨架，**正文未能直接渲染取回**。所录 excerpt 为该平台**同一规范 URL** 的转录内容经外部检索索引呈现者；locator 保留规范 URL 供人工回访复核。故 verification_status='candidate'。",
    raw_file: "src-shtong-jinze-qiaoxiang.json",
  },
  {
    key: "shtong-kangxi-qingpu-juan5",
    provider: "shanghai-local-chronicles-office",
    title: "上海市地方志办公室·上海通｜康熙《青浦縣志》卷之五（水道）",
    creator: "上海市地方志办公室（原书：清康熙《青浦縣志》）",
    source_date: null,
    source_uri:
      "https://www.shtong.gov.cn/difangzhi-front/book/detailNew?bookId=356641&nodeId=659135&parentNodeId=356653&type=-1",
    content_type: "text/html",
    license_code: null,
    date_basis: "none",
    limitation:
      "同前：SPA 直接抓取仅得加载骨架，正文取自该平台同一 URL 的转录内容检索索引；**未做二次 OCR、未改写字形**。康熙志具体刊年未在本页确认（馆藏著录作 1669 刊，见 source_records「1669 康熙《青浦县志》」），故不写死年份。",
    underlying_edition: "清康熙《青浦縣志》卷之五（山川/水利·水道）",
    raw_file: "src-shtong-kangxi-qingpu-juan5.json",
  },
  {
    key: "shtong-guangxu-qingpu-shanshui",
    provider: "shanghai-local-chronicles-office",
    title: "上海市地方志办公室·上海通｜《青浦县志》卷四 山川（水）",
    creator: "上海市地方志办公室（原书：清光绪《青浦縣志》卷四「山川·水三」）",
    source_date: null,
    source_uri:
      "https://www.shtong.gov.cn/difangzhi-front/book/detailNew?bookId=356641&nodeId=659218&parentNodeId=356844&type=-1",
    content_type: "text/html",
    license_code: null,
    date_basis: "none",
    limitation:
      "同前：SPA 直接抓取仅得加载骨架，正文取自该平台同一 URL 的转录内容检索索引。该段与 Wikimedia Commons 上光緒《青浦縣志》第三冊扫描件的索引文本一致（互为旁证），但**本任务未能把该条逐页定位到扫描件页号**——已按 §26 保留该扫描件为研究线索（见 source_records「光緒青浦縣志第三冊（研究线索）」）。",
    underlying_edition: "清光绪《青浦縣志》卷四「山川·水三」",
    raw_file: "src-shtong-guangxu-qingpu-shanshui.json",
  },
  {
    key: "qingpu-museum-yihaosi",
    provider: "qingpu-government",
    title: "颐浩禅寺（上海青浦博物馆官网·文物）",
    creator: "上海青浦博物馆",
    source_date: "2019-03-04",
    source_uri: "https://museum.shqp.gov.cn/museum/sm/20190304/479097.html",
    content_type: "text/html",
    license_code: null,
    date_basis: "url_path",
    limitation: "页面未显式标注发布日期；日期取自 URL 路径 20190304，故以 date_basis 显式登记，不当作内容年代。",
    raw_file: "src-qingpu-museum-yihaosi.json",
  },
  {
    key: "qingpu-wm-pindujinze",
    provider: "qingpu-government",
    title: "《品读金泽》之金泽古韵（青浦文明网）",
    creator: "青浦文明网",
    source_date: "2025-04-14",
    source_uri: "https://wm.shqp.gov.cn/wm/lhx/20250414/1277229.html",
    content_type: "text/html",
    license_code: null,
    date_basis: "page_header",
    limitation: null,
    raw_file: "src-qingpu-wm-pindujinze.json",
  },
  {
    key: "qingpu-news-yihaosiyizhi",
    provider: "qingpu-government",
    title: "青浦文物·颐浩寺遗址（人民日报客户端「绿色青浦」＝上海市青浦区人民政府新闻办公室官方平台）",
    creator: "上海市青浦区人民政府新闻办公室（“绿色青浦”）",
    source_date: "2020-10-28",
    source_uri: "https://www.peopleapp.com/rmharticle/30019836818",
    content_type: "text/html",
    license_code: null,
    date_basis: "page_header",
    limitation: null,
    raw_file: "src-qingpu-news-yihaosiyizhi.json",
  },
  {
    key: "shl-dmz-geonames-jinze",
    provider: "shanghai-library-t11-alignment",
    title: "上海图书馆开放数据·地名志（geonames）金泽镇地名记录（金泽 / 金泽镇 / 万安桥 / 迎祥桥）",
    creator: "上海图书馆",
    source_date: null,
    source_uri: "http://data.library.sh.cn/graph/geonames",
    content_type: "application/json",
    license_code: null,
    date_basis: "none",
    limitation: "SPARQL 结构化检索结果，逐字 payload 见 raw_file；非出版物转录。",
    raw_file: "src-shl-dmz-geonames-jinze.json",
  },
  {
    key: "shl-red-building-jinze",
    provider: "shanghai-library-t11-alignment",
    title: "上海图书馆开放数据·文化遗产（red/building，据《上海市不可移动文物名录》）金泽相关主体",
    creator: "上海图书馆（数据来源标注：上海市不可移动文物名录）",
    source_date: null,
    source_uri: "http://red.library.sh.cn/graph/building",
    content_type: "application/json",
    license_code: null,
    date_basis: "none",
    limitation: "SPARQL 结构化检索结果；同名异地假阳性须按 address 排除（见 TASK-0011 报告 §SHL 对齐）。",
    raw_file: "src-shl-red-building-jinze.json",
  },
  {
    key: "shl-gen-person-lvyihao",
    provider: "shanghai-library-t11-alignment",
    title: "上海图书馆开放数据·家谱人物（gen/person）吕颐浩三条主体",
    creator: "上海图书馆",
    source_date: null,
    source_uri: "http://gen.library.sh.cn/graph/person",
    content_type: "application/json",
    license_code: null,
    date_basis: "none",
    limitation: "三条主体 temporalValue 分别为「明」「南宋」，**互相冲突**，不得静默择一（见人审 CSV）。",
    raw_file: "src-shl-gen-person-lvyihao.json",
  },
  {
    key: "shl-yutu-work-jinze-1907",
    provider: "shanghai-library-t11-alignment",
    title: "上海图书馆开放数据·舆图（yutu/work）「金泽」1907 地形图（(日)陆地测量部）",
    creator: "上海图书馆（著录：(日)陆地测量部）",
    source_date: null,
    source_uri: "http://data.library.sh.cn/yutu/resource/work/dlmpjrwqkuzsejhg",
    content_type: "application/json",
    license_code: null,
    date_basis: "none",
    limitation:
      "**仅登记著录主体，未取得影像、未用于任何历史位置主张**（§8 P-05/P-06：历史地图专项 DEFER）。作为 place↔work/image 关联与后续任务的线索保留。",
    raw_file: "src-shl-yutu-work-jinze-1907.json",
  },
  {
    key: "commons-guangxu-qingpu-juan4-6",
    provider: "wikimedia-commons",
    title: "光緒《青浦縣志》三十卷首二卷末一卷 第三冊（卷四至六）扫描件（WZLib 复本）",
    creator: "Wikimedia Commons 上传件（WZLib-DB-213287）",
    source_date: "1879",
    source_uri:
      "https://upload.wikimedia.org/wikipedia/commons/e/e4/WZLib-DB-213287_%E5%85%89%E7%B7%92%E9%9D%92%E6%B5%A6%E7%B8%A3%E5%BF%97%E4%B8%89%E5%8D%81%E5%8D%B7%E9%A6%96%E4%BA%8C%E5%8D%B7%E6%9C%AB%E4%B8%80%E5%8D%B7%EF%BC%88%E7%AC%AC%E4%B8%89%E5%86%8A%E5%8D%B7%E5%9B%9B%E8%87%B3%E5%85%AD%EF%BC%89.pdf",
    content_type: "application/pdf",
    license_code: "PD-old",
    date_basis: "gazetteer_edition",
    limitation:
      "**研究线索（§26 零结果如实登记）**：92 页纯图像扫描、**无文本层**；本任务对该册第 1–34 页做 OCR 定位（OCR 仅作导航、不作引用），未命中「金澤塘」，**页级定位未完成**。原件已落 Raw Store（append-only，含 sha256），供后续任务定点辨读。",
    raw_file: "src-commons-guangxu-qingpu-juan4-6.json",
  },
];

// ---------------------------------------------------------------------------
// 2) 证据登记
// ---------------------------------------------------------------------------
// 每条 = { key, source, evidence_type, locator, quote_text, subject_hint, place_hint, time_hint,
//          extraction_method, confidence, verification_status, assertion }
const EVIDENCE = [
  {
    key: "puji-span-jinzetang-gov",
    source: "qingpu-gov-yizhushicui",
    assertion: "A1",
    evidence_type: "text",
    locator: "单孔石拱桥 / 普济桥 段",
    quote_text:
      "普济桥：位于金泽古镇，东西向跨金泽塘，俗称“紫石桥”，因桥畔有圣堂庙，故又称“圣堂桥”，是上海地区保存最完好、最古老的石桥之一。宋咸淳三年（1267年）建，清雍正初期重修时加置石栏，系单孔石拱桥，紫色武康石材质，长25.5米，宽2.7米，高4.8米，拱跨10.5米，高4米。东堍石阶17级，西堍22级。……拱券上镌有“咸淳三年建”题款。……1962 年，被列为上海市文物保护单位，后被分别收作《上海辞典》《中国名胜词典》条目。",
    subject_hint: "普济桥",
    place_hint: "金泽古镇",
    time_hint: "1267",
    extraction_method: "official_heritage_local_history",
    confidence: 0.85,
    verification_status: "candidate",
  },
  {
    key: "wanan-tingqiao-gov",
    source: "qingpu-gov-yizhushicui",
    assertion: "A2",
    evidence_type: "text",
    locator: "单孔石拱桥 / 万安桥 段",
    quote_text:
      "万安桥：位于金泽古镇，东西向跨金泽塘，俗称“紫石桥”，又称“万安亭桥”，是青浦地区建造年代最古老的桥。宋景定年间（1260-1264年）始建，元至正二年（1342年）桥上加建廊亭。明嘉靖年间（1522-1566年）及清乾隆年间（1736-1795年）两次重修，1999 年又修。……此桥具有宋代石桥特征，结构、造型、用石与普济桥基本相同，两桥同跨一河，南北相峙，称为“姊妹桥”。……从前，万安亭桥东堍还建有佛阁亭桥，称为旱桥。桥上挑廊，四角上翘，亭下连阁，画栋雕梁，奇丽多姿，巧夺天工。昔日桥亭内还刻有文人雅士赞美亭桥的诗联。如今，亭、阁已废，而石栏板上还留有当年亭柱的榫口。……1959 年被公布为青浦县文物保护单位。",
    subject_hint: "万安桥",
    place_hint: "金泽古镇",
    time_hint: "1260-1264 / 1342",
    extraction_method: "official_heritage_local_history",
    confidence: 0.85,
    verification_status: "candidate",
  },
  {
    key: "wanan-tingqiao-shtong-xiaozhi",
    source: "shtong-jinze-qiaoxiang",
    assertion: "A2",
    evidence_type: "text",
    locator: "上海桥乡：金泽 / 万安桥 段（引清道光《金泽小志》）",
    quote_text:
      "万安桥在金泽镇北市，原是石板桥，宋景定年间，即1260~1264年建，明嘉靖、万历及清乾隆间曾3次重修。桥长29米，宽2.6米，跨径9.8米，为弧形单孔石拱桥。元至正二年在桥上建廊亭，又名万安亭桥。据《金泽小志》记载：“万安亭桥，跨市北。亭建如穿廊，数间飞出。其出尽处，又有佛庐相向，高于亭埒。亭中四望，水天一碧，淀山峙其东，真奇观也。谚云：‘金泽四十二虹桥，万安为首’。”桥的构造与普济桥相同，具有宋代石拱桥的特征。1959年列为青浦县文物保护单位。",
    subject_hint: "万安桥",
    place_hint: "金泽镇北市",
    time_hint: "1260-1264 / 1342",
    extraction_method: "official_digital_gazetteer_transcription",
    confidence: 0.7,
    verification_status: "candidate",
  },
  {
    key: "puji-nanshi-shtong",
    source: "shtong-jinze-qiaoxiang",
    assertion: "A1b",
    evidence_type: "text",
    locator: "上海桥乡：金泽 / 普济桥 段",
    quote_text:
      "普济桥在金泽镇南市，又称紫石桥，俗名圣堂桥。宋咸淳三年，即1267年建，清雍正年间重修。单拱，桥长26.7米，宽2.75米，坡度平缓，跨径大，拱跨径10.5米，桥顶圈板石上镌有“咸淳三年”字样，是上海地区保存最完好、最古老的石桥之一，很有研究价值。1987年列为市级文物保护单位。",
    subject_hint: "普济桥",
    place_hint: "金泽镇南市",
    time_hint: "1267",
    extraction_method: "official_digital_gazetteer_transcription",
    confidence: 0.7,
    verification_status: "candidate",
  },
  {
    key: "yihao-1938-museum",
    source: "qingpu-museum-yihaosi",
    assertion: "A3",
    evidence_type: "text",
    locator: "颐浩禅寺 条",
    quote_text:
      "位于金泽镇南隅，颐浩寺始建于宋景定元年（1260），由里人费辅之创建，相传为宰相吕颐浩故宅而得名。元至元二十五年（1288）建大雄宝殿等，元贞元年（1295）奉旨名为颐浩禅寺。时有鸳鸯楼、大山门、贝多林等亭台楼阁20余处，规模宏大，世称古刹。明洪武年间（1368～1398）修葺，后迭经兵燹，屡毁屡建，清光绪三十二年（1906）又重修，民国二十七年（1938）大部分建筑毁于日军轰炸。原存宋至清代名人撰书的碑刻达15方。现仅存遗古银杏1株，元“松江府颐浩寺碑记”，碑1方，大殿方形柱础若干方及相传为赵孟頫所作的部分“不断云”石刻。今由当地众信在原址内再建一小殿宇，并请赵朴初先生题额“颐浩禅寺”。2002年8月，在现建的殿宇旁边挖土时发现了该寺一殿的柱础遗物。1959年3月公布为青浦县文物保护单位。",
    subject_hint: "颐浩寺遗址",
    place_hint: "金泽镇南隅",
    time_hint: "1260 / 1288 / 1295 / 1906 / 1938",
    extraction_method: "official_heritage_local_history",
    confidence: 0.85,
    verification_status: "candidate",
  },
  {
    key: "yihao-1938-quote-news",
    source: "qingpu-news-yihaosiyizhi",
    assertion: "A3/A5",
    evidence_type: "text",
    locator: "颐浩寺遗址 条（文物要目）",
    quote_text:
      "颐浩寺遗址位于金泽镇金溪居委会迎祥街12号。宋景定元年（1260年）里人费辅之创建，相传为宰相吕颐浩宅，故得名。元至元二十五年（1288年）建大雄宝殿等，元贞元年（1295年）奉旨赐名颐浩禅寺，时有鸳鸯楼、大山门等亭台楼阁二十余处，规模宏大，“虽杭之灵隐，苏之承天，莫匹其伟。”后历代多次修葺，1938年大部分建筑毁于轰炸。现仅存元代“松江府颐浩寺记”碑1方、“不断云”石刻、大殿柱础12个、佛台基座1个和少量破碎方砖。……现为青浦区级文物保护单位。",
    subject_hint: "颐浩寺遗址",
    place_hint: "金泽镇迎祥街12号",
    time_hint: "1260 / 1288 / 1295 / 1938",
    extraction_method: "official_heritage_local_history",
    confidence: 0.85,
    verification_status: "candidate",
  },
  {
    key: "yihao-1992-original-site-rebuild",
    source: "qingpu-wm-pindujinze",
    assertion: "A4",
    evidence_type: "text",
    locator: "《品读金泽》之金泽古韵 / 颐浩禅寺 段",
    quote_text:
      "颐浩禅寺，始建于南宋景定元年(1260年)，盛于元明，据《松江府志》记载：金泽颐浩寺“虽杭之灵隐，苏之承天，莫匹其伟。”指颐浩寺规模，要超过杭州最大的灵隐寺和苏州最大的承天寺。相传有5048间，占半个古镇。……1992年，在颐浩寺中心原址重建寺院，建造了大雄宝殿、观音殿、地藏王殿及两套偏殿，还造了山门，使寺院初具规模。中国佛教学会会长赵朴初先生为此亲笔题书“颐浩禅寺”匾额。……后寺院毁于炮火，“不断云”石栏被长期掩埋在废墟之中，到1992年重建颐浩寺，在整理地面时，才发现这珍贵的石栏，虽损坏很大，只剩20多米，就安放在天井中，但依旧云图清晰，鲜活精彩。",
    subject_hint: "颐浩寺遗址",
    place_hint: "金泽镇",
    time_hint: "1260 / 1992",
    extraction_method: "official_heritage_local_history",
    confidence: 0.85,
    verification_status: "candidate",
  },
  {
    key: "jinzetang-kangxi-xianzhi",
    source: "shtong-kangxi-qingpu-juan5",
    assertion: "U7",
    evidence_type: "text",
    locator: "康熙《青浦縣志》卷之五（水道，三十一圖 / 三十二圖 / 四十二保五區）",
    quote_text:
      "花蓮漾。東通金澤塘，西至雪落港，南至白蕩，通嘉善界。北至椒樹潭，在三十一圖。金澤塘。長一千三百丈，闊八丈，深八尺。南通白蕩，北通横港，東至華亭界，在三十二圖。……金澤塘。長七百九十四丈，闊一十四丈，深八尺。南通大白蕩，北通澱山湖。（四十二保五區）",
    subject_hint: "金泽塘",
    place_hint: "青浦县四十二保",
    time_hint: "清康熙",
    extraction_method: "official_digital_gazetteer_transcription",
    confidence: 0.7,
    verification_status: "candidate",
  },
  {
    key: "jinzetang-guangxu-shanshui",
    source: "shtong-guangxu-qingpu-shanshui",
    assertion: "U7",
    evidence_type: "text",
    locator: "《青浦县志》卷四 山川（水）/ 金澤塘 条",
    quote_text:
      "金澤塘，自金澤市河東過大葑漾，爲横港，又東逕田山莊西陳蕩，又東逕黄田村，南越連湖，達爛路港。……《水利圩圖册》載金澤塘在四十二保一區，長一千九百丈，濶十四丈，深八尺，南通白蕩，北通阮蕩。四區長一千三百丈，濶八丈，深八尺，南通白蕩，北通横港。五區長七百九十四丈，濶十四丈，深八尺，南通白蕩，北通澱山湖。是塘當從横港而北，由内河北出金澤港，通澱山湖。……疑今之金澤港，即昔之塘也。",
    subject_hint: "金泽塘",
    place_hint: "青浦县四十二保",
    time_hint: "清光绪",
    extraction_method: "official_digital_gazetteer_transcription",
    confidence: 0.7,
    verification_status: "candidate",
  },
  {
    key: "jinzetang-yingxiang-shl-dmz",
    source: "shl-dmz-geonames-jinze",
    assertion: "A1/U7",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/dmz/entity/place/y7kgl0030jtps4qv",
    quote_text:
      "foaf:name = 迎祥桥；ontology:description = 位于青浦县金泽镇南市梢，跨金泽塘。元至元年间（1335～1340年）建。5孔梁式石桥，长34.25米，宽2.14米，中孔跨径6.3米，二孔、三孔为5米、4.3米。1979年被列为县级文物保护单位。",
    subject_hint: "迎祥桥",
    place_hint: "金泽镇南市梢",
    time_hint: "1335-1340",
    extraction_method: "shl_geonames_dmz_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "wanan-xiuzhoutang-shl-dmz",
    source: "shl-dmz-geonames-jinze",
    assertion: "A1b-conflict",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/dmz/entity/place/8pn1fuwx2ccbsoy7",
    quote_text:
      "foaf:name = 万安桥；ontology:description = 又名万安亭桥。位于青浦县金泽镇北市梢，跨秀州塘。建于南宋景定年间（1260～1264年）。弧形单孔石桥，桥长29米，宽2.6米，跨径9.8米。1959年被列为县级文物保护单位。",
    subject_hint: "万安桥",
    place_hint: "青浦县金泽镇北市梢",
    time_hint: "1260-1264",
    extraction_method: "shl_geonames_dmz_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "jinze-town-shl-dmz",
    source: "shl-dmz-geonames-jinze",
    assertion: "SHL-align",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/dmz/entity/place/ohj05t8scnz6jgkx",
    quote_text:
      "foaf:name = 金泽镇；ontology:description = 位于青浦县西南部。宣统二年（1910年）设置金泽区，后为乡、镇，1949年又改为区、镇，1957年撤区为乡，1958年成立金泽人民公社，1984年改为乡，1986年撤乡建镇。镇境东邻莲盛镇，南与浙江嘉善、西与江苏吴江市接壤，北连西岑镇、淀山湖。镇人民政府驻地金泽，辖3个居民委员会、10个村民委员会。面积25.26平方公里，人口1.45万。地处水乡，水面积890多公顷，盛产虾、蟹。风景秀丽，是上海的“桥乡”，现存古桥21座，其中有建于宋代的万安桥、普济桥，建于元代的迎祥桥、如意桥，建于清代的天王阁桥、放生桥等。",
    subject_hint: "金泽镇",
    place_hint: "青浦县西南部",
    time_hint: "1910 / 1958 / 1986",
    extraction_method: "shl_geonames_dmz_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "jinze-village-shl-dmz",
    source: "shl-dmz-geonames-jinze",
    assertion: "SHL-align",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/dmz/entity/place/ij2dm4q8uoe086kv",
    quote_text:
      "foaf:name = 金泽；ontology:description = 在县境西南部，沪青平公路东侧。金泽镇人民政府驻地。面积约40公顷。人口4000。古名白苎里。因地处湖荡泽地，土地肥沃，物产丰富，古有“穑人获泽如金”之说，故名金泽。聚落沿水呈南北向矩形分布。……有宋、元年间建的迎祥桥、普济桥、万安桥。沪青平公路经过。",
    subject_hint: "金泽",
    place_hint: "青浦县境西南部",
    time_hint: null,
    extraction_method: "shl_geonames_dmz_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "puji-shl-heritage",
    source: "shl-red-building-jinze",
    assertion: "SHL-align",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/entity/physicalculturalheritage/arz32mktwndn0e0f",
    quote_text:
      "rdf:type = http://www.library.sh.cn/ontology/PhysicalCulturalHeritage；ontology:place = http://data.library.sh.cn/entity/place/a2ecnz84k4w86oto；foaf:name = 普济桥 / 普濟橋；ontology:address = 金泽镇金溪居委会；dc:source = 上海市不可移动文物名录；dc:type = 上海市文物保护单位。",
    subject_hint: "普济桥",
    place_hint: "金泽镇金溪居委会",
    time_hint: null,
    extraction_method: "shl_heritage_catalog_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "wanan-shl-heritage",
    source: "shl-red-building-jinze",
    assertion: "SHL-align",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/entity/physicalculturalheritage/chlyrdj3o8ll81k8",
    quote_text:
      "rdf:type = PhysicalCulturalHeritage；foaf:name = 万安桥 / 萬安橋；ontology:address = 金泽镇金溪居委会；dc:source = 上海市不可移动文物名录；dc:type = 区级文物保护单位。",
    subject_hint: "万安桥",
    place_hint: "金泽镇金溪居委会",
    time_hint: null,
    extraction_method: "shl_heritage_catalog_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "yihao-shl-heritage",
    source: "shl-red-building-jinze",
    assertion: "SHL-align",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/entity/physicalculturalheritage/8orxolst3z45ptbc",
    quote_text:
      "rdf:type = PhysicalCulturalHeritage；foaf:name = 颐浩寺遗址 / 頤浩寺遺址；ontology:address = 金泽镇金溪居委会迎样街12号；ontology:houseNumber = 12号；dc:source = 上海市不可移动文物名录；dc:type = 区级文物保护单位。",
    subject_hint: "颐浩寺遗址",
    place_hint: "金泽镇金溪居委会迎样街12号",
    time_hint: null,
    extraction_method: "shl_heritage_catalog_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "lvyihao-shl-gen-person",
    source: "shl-gen-person-lvyihao",
    assertion: "SHL-align",
    evidence_type: "record",
    locator:
      "http://data.library.sh.cn/jp/entity/person/am63unfc2v6uw7eo | http://data.library.sh.cn/jp/entity/person/lfdowhpnikchhh1c | http://data.library.sh.cn/jp/entity/person/xekxsw7n02vn87p6",
    quote_text:
      "[明] ontology:temporalValue=明；vocab:label=吕颐浩/吕頤浩；ontology:courtesyName=元直；foaf:familyName=…/p3t38u4wjew6co17。｜[南宋] ontology:temporalValue=南宋；ontology:serialNo=1；ontology:relatedWork=…/2i82wi57swlbtfnr；roleOfFamily=shi-zu。｜[无朝代] vocab:label=吕颐浩/吕頤浩；roleOfFamily=yi-shi-zu。**三条 temporalValue 互相冲突（明 / 南宋 / 无）**。",
    subject_hint: "吕颐浩",
    place_hint: null,
    time_hint: "明 / 南宋（冲突）",
    extraction_method: "shl_person_record",
    confidence: 0.6,
    verification_status: "candidate",
  },
  {
    key: "jinze-yutu-1907",
    source: "shl-yutu-work-jinze-1907",
    assertion: "SHL-align",
    evidence_type: "record",
    locator: "http://data.library.sh.cn/yutu/resource/work/dlmpjrwqkuzsejhg",
    quote_text:
      "rdf:type = bibframe:Work；rdfs:label = 金泽 / Jin Ze；dc:creator = (日)陆地测量部；mads:ComplexSubject = 地形图--金泽--1907；mads:ComplexSubject = 金泽--地形图--日本；bibframe:language / genreForm / intendedAudience 以 bnode 承载。",
    subject_hint: "金泽",
    place_hint: "金泽",
    time_hint: "1907",
    extraction_method: "shl_yutu_work_record",
    confidence: 0.8,
    verification_status: "candidate",
  },
  {
    key: "commons-guangxu-scan-lead-unresolved",
    source: "commons-guangxu-qingpu-juan4-6",
    assertion: "research-lead",
    evidence_type: "record",
    locator: "juan4-6（92 页；页级未定位）",
    quote_text:
      "光緒《青浦縣志》第三冊（卷四至六）扫描件：92 页纯图像、无文本层。对第 1–34 页做 OCR 导航（OCR 仅作定位、不作引用）未命中「金澤塘」。**页级定位未完成** —— 按 §26 以「零结果/未完成」如实登记，并保留原件（raw_path + sha256）供后续定点辨读。",
    subject_hint: "金泽塘",
    place_hint: "青浦县",
    time_hint: "1879",
    extraction_method: "research_lead_unresolved",
    confidence: 0.5,
    verification_status: "candidate",
  },
];

// ---------------------------------------------------------------------------
// 3) 落库
// ---------------------------------------------------------------------------
const before = {
  source_records: Number(await queryValue(`select count(*)::text c from source_records`)),
  evidence: Number(await queryValue(`select count(*)::text c from evidence`)),
  audit_total: Number(await queryValue(`select count(*)::text c from evidence_gate_audit`)),
  published: Number(await queryValue(`select count(*)::text c from claims where status::text in ('verified','published')`)),
};

const stats = { sources_created: 0, sources_reused: 0, evidence_created: 0, evidence_reused: 0, raw_written: 0 };

// 3.1 来源
const sourceIdByKey = {};
for (const s of SOURCES) {
  const chk = sha256(`${s.provider}|${s.title}|${s.source_uri}`);
  const rawPath = saveRaw(
    s.raw_file,
    JSON.stringify(
      {
        task: "TASK-0011",
        source_key: s.key,
        provider: s.provider,
        title: s.title,
        creator: s.creator,
        source_date: s.source_date,
        date_basis: s.date_basis,
        source_uri: s.source_uri,
        content_type: s.content_type,
        license_code: s.license_code,
        limitation: s.limitation ?? null,
        underlying_edition: s.underlying_edition ?? null,
        captured_at: new Date().toISOString(),
        excerpts: EVIDENCE.filter((e) => e.source === s.key).map((e) => ({
          key: e.key,
          assertion: e.assertion,
          locator: e.locator,
          quote_text: e.quote_text,
          subject_hint: e.subject_hint,
          place_hint: e.place_hint,
          time_hint: e.time_hint,
          extraction_method: e.extraction_method,
        })),
      },
      null,
      2
    )
  );
  const existing = await queryRows(
    `select source_id::text id from source_records where provider=:'p' and checksum=:'c'`,
    { p: s.provider, c: chk }
  );
  if (existing.length > 0) {
    sourceIdByKey[s.key] = existing[0].id;
    stats.sources_reused++;
  } else {
    await run(
      `insert into source_records(provider,title,creator,source_date,source_uri,content_type,license_code,checksum,raw_path,metadata_json)
       values (:'p',:'t',:'cr',:'sd',:'uri',:'ct',:'lc',:'chk',:'rp',:'m'::jsonb)`,
      {
        p: s.provider,
        t: s.title,
        cr: s.creator ?? null,
        sd: s.source_date ?? null,
        uri: s.source_uri,
        ct: s.content_type,
        lc: s.license_code ?? null,
        chk,
        rp: rawPath.replace(/\\/g, "/"),
        m: JSON.stringify({
          task: "TASK-0011",
          source_key: s.key,
          date_basis: s.date_basis,
          limitation: s.limitation ?? null,
          underlying_edition: s.underlying_edition ?? null,
          raw_file: s.raw_file,
        }),
      }
    );
    const rows = await queryRows(
      `select source_id::text id from source_records where provider=:'p' and checksum=:'c'`,
      { p: s.provider, c: chk }
    );
    sourceIdByKey[s.key] = rows[0].id;
    stats.sources_created++;
  }
}

// 3.2 证据（幂等：同 source+locator+method+quote 哈希 则复用）
const evidenceIdByKey = {};
const toAudit = [];
for (const e of EVIDENCE) {
  const sid = sourceIdByKey[e.source];
  if (!sid) throw new Error(`source not resolved: ${e.source}`);
  const qHash = sha256(e.quote_text);
  const found = await queryRows(
    `select evidence_id::text id from evidence
      where source_id=:'sid'::uuid and locator=:'loc' and extraction_method=:'m'
        and encode(sha256(convert_to(coalesce(quote_text,''),'UTF8')),'hex')=:'qh'`,
    { sid, loc: e.locator, m: e.extraction_method, qh: qHash }
  );
  let eid;
  if (found.length > 0) {
    eid = found[0].id;
    stats.evidence_reused++;
  } else {
    await run(
      `insert into evidence(source_id,evidence_type,locator,quote_text,subject_hint,place_hint,time_hint,extraction_method,confidence,verification_status)
       values (:'sid'::uuid,:'et',:'loc',:'q',:'sh',:'ph',:'th',:'m',:'conf',:'vs'::verification_status)`,
      {
        sid,
        et: e.evidence_type,
        loc: e.locator,
        q: e.quote_text,
        sh: e.subject_hint ?? null,
        ph: e.place_hint ?? null,
        th: e.time_hint ?? null,
        m: e.extraction_method,
        conf: e.confidence,
        vs: e.verification_status,
      }
    );
    const rows = await queryRows(
      `select evidence_id::text id from evidence
        where source_id=:'sid'::uuid and locator=:'loc' and extraction_method=:'m'
          and encode(sha256(convert_to(coalesce(quote_text,''),'UTF8')),'hex')=:'qh'`,
      { sid, loc: e.locator, m: e.extraction_method, qh: qHash }
    );
    eid = rows[0].id;
    stats.evidence_created++;
  }
  evidenceIdByKey[e.key] = eid;
  toAudit.push({ key: e.key, id: eid, ...e });
}

// 3.3 §12-20：每条新证据立即写 G0–G6 快照
const auditStmts = [];
for (const ev of toAudit) {
  const res = evaluateGates({
    source: true,
    identity: ev.subject_hint ? true : undefined,
    time: ev.time_hint ? true : undefined,
    spatial: ev.place_hint ? true : undefined,
    evidence: undefined, // 尚未挂到 claim/feature，属证据本体快照
    conflict: false,
    forcedC: [],
  });
  for (const code of GATE_CODES) {
    const g = res.gates[code];
    auditStmts.push({
      sql: `delete from evidence_gate_audit where object_type='evidence' and object_id=:'oid' and gate_code=:'gc'`,
      params: { oid: ev.id, gc: code },
    });
    auditStmts.push({
      sql: `insert into evidence_gate_audit(object_type,object_id,gate_code,result,reason,actor_type)
            values ('evidence',:'oid',:'gc',:'rs',:'rn','rule')`,
      params: { oid: ev.id, gc: code, rs: g.result, rn: g.reason },
    });
  }
}
await runMany(auditStmts);

const after = {
  source_records: Number(await queryValue(`select count(*)::text c from source_records`)),
  evidence: Number(await queryValue(`select count(*)::text c from evidence`)),
  audit_total: Number(await queryValue(`select count(*)::text c from evidence_gate_audit`)),
  published: Number(await queryValue(`select count(*)::text c from claims where status::text in ('verified','published')`)),
};

const manifest = {
  task: "TASK-0011",
  schema: "mohen-evidence-closure-registration/v1",
  run_at: new Date().toISOString(),
  raw_dir: RUN_DIR.replace(/\\/g, "/"),
  stats,
  before,
  after,
  sources: SOURCES.map((s) => ({ key: s.key, provider: s.provider, title: s.title, source_id: sourceIdByKey[s.key] })),
  evidence: EVIDENCE.map((e) => ({ key: e.key, assertion: e.assertion, evidence_id: evidenceIdByKey[e.key], extraction_method: e.extraction_method })),
};
const mp = saveRaw("registration-manifest.json", JSON.stringify(manifest, null, 2));

console.log(JSON.stringify({ stats, before, after, audit_rows_written: auditStmts.length, manifest: mp }, null, 2));
