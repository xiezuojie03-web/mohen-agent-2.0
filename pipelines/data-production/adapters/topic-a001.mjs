// topic-a001.mjs — A001「杨浦滨江绿之丘」主题配置
//
// 仅供 `layer1-adapters.mjs` 在 MOHEN_TOPIC_CONFIG 指向本文件时加载，
// 参数化：材料、载体读取照片、D02/D03/D04 提示词、实体别名、投影前缀与标题。
// 不改动任何门禁 / 血缘 / 精准失效 machinery（那些保持主题无关、可复用）。
//
// 资料：来自杨浦区政府 / 上海市政府公开网页（2021-2023），作注明来源的当代叙述，
// 不全文复制、不主张独立证据链。禁区：绝不把 1920 怡和冷库 断言为 1995 烟草机修仓库
// 的同一栋持续原建筑（材料仅称"前身可追溯到"，定为待证/未证身份，进 refusals）。

export default {
  key: "a001",
  label: "绿之丘",

  // ── D00 来源材料（真实抓取片段，保留原文取向；rights/scope 由适配器按默认落库）──
  materials: [
    {
      provider: "yangpu-gov",
      title: "杨浦滨江“绿之丘”获亚洲建筑师协会建筑奖（2021-01-25）",
      source_type: "government_web",
      carrier_type: "digital_text",
      provenance_status: "candidate",
      content_availability: "full_content",
      // A001 返证要求（任务书 U4/D2）：每条来源必须可回到原始页面，且携带发布机构与日期。
      url: "https://www.shyp.gov.cn/shypq/xwzx-bmdt/20210125/373728.html",
      publisher: "上海市杨浦区人民政府（杨浦区融媒体中心）",
      source_date: "2021-01-25",
      rights: {
        basis: "政府门户网站公开发布",
        usage: "可作发现线索与注明来源的当代叙述；前端只呈现摘要与来源链接，不全文复制",
        redistribution: "excerpt_only_with_attribution",
      },
      fragments: [
        "绿之丘原为烟草公司机修仓库，始建于1995年。它的前身可追溯到1920年由怡和洋行建立的怡和冷库。",
        "由于规划道路安浦路要从此横切过，该建筑面临被拆除的可能。章明团队通过巧妙设计，利用建筑一层层高7米、柱跨净距超过4米的条件，对其进行改造。",
        "改造后的烟草仓库'绿之丘'，通过垂直划分道路与公共服务设施用地，布置立体绿化等手段，打通了城市与滨江的阻隔，实现了一般既有建筑的可持续利用。",
        "同济大学建筑与城市规划学院教授章明领衔设计的'绿之丘——杨浦滨江原烟草公司机修仓库改造项目'获得亚洲建筑师协会建筑奖荣誉提名奖（Honorable Mention，综合类建筑）。",
        "评委们一致认为，此项目最大程度地优化了滨河空间，还江于民，将既有建筑改造成拥有复合功能的城市综合体，为市民提供了社会空间与绿地，是一个向所有人开放的城市花园。",
        "一座'钢铁森林'，内部大有乾坤，中央螺旋式扶梯逐级上升，连通各层的展厅，直达楼顶花园。",
        "绿之丘空间简洁却不单调，顶楼有一段U型步道，提供270度观景平台，漫步其间，有一种腾空临江的视觉效果。面向马路的位置，有一个转角楼梯，可以换个角度看街景。",
      ],
    },
    {
      provider: "yangpu-gov",
      title: "出片又好玩 看老仓库的华丽蝶变（2023-10-07）",
      source_type: "government_web",
      carrier_type: "digital_text",
      provenance_status: "candidate",
      content_availability: "full_content",
      url: "https://www.shyp.gov.cn/shypq/xwzx-bmdt/20231007/438359.html",
      publisher: "上海市杨浦区人民政府（杨浦区融媒体中心）",
      source_date: "2023-10-07",
      rights: {
        basis: "政府门户网站公开发布",
        usage: "可作发现线索与注明来源的当代叙述；前端只呈现摘要与来源链接，不全文复制",
        redistribution: "excerpt_only_with_attribution",
      },
      fragments: [
        "绿之丘原为烟草公司机修仓库，始建于1995年，是一座6层钢筋混凝土厂房，其前身可追溯到1920年怡和冷库。",
        "在最初的杨浦滨江公共空间贯通规划中，这座老仓库曾一度面临被拆除的可能。但设计团队同济大学建筑设计研究院（集团）有限公司对这幢建筑萌生了更新利用的想法。",
        "在城市规划部门和市政建设部门反复协商之后，决定保留该建筑并进行改造，使之成为一个集市政基础设施、公共绿地和公共配套服务于一体的城市滨江综合体。",
        "老仓库被设计师大手笔地'削'掉了50%的体量，拆除原有仓库的第6层，面向滨江的一侧被斜向切削，形成台地式景观平台，背向滨江的一侧也进行了切削，引导城市空间向滨水延伸。",
        "它有着层层叠叠的绿植、螺旋上升的钢结构、离地近20米的270度江景观赏平台以及如同丘陵般自由延展的边界。",
        "建筑的中央建有螺旋式扶梯，连通着各层的展厅，直达楼顶花园。",
        "如今的绿之丘已然成为一座集基础设施、公共服务、公园绿地于一身，连通城市与江岸的综合体，成为杨浦新晋打卡地标。",
        "人们可以从杨树浦路的缓坡，上到建筑二层，再漫游至滨江。",
        "绿之丘 家门口的好去处 地址：杨树浦路1500号。",
      ],
    },
    {
      provider: "shanghai-gov",
      title: "杨浦区滨江发展“十四五”规划（2021-08-16）",
      source_type: "government_web",
      carrier_type: "digital_text",
      provenance_status: "candidate",
      content_availability: "full_content",
      url: "https://www.shanghai.gov.cn/gwk/search/content/c3c86ace-5ef2-4386-aa14-b5781fd2038a",
      publisher: "上海市人民政府（杨浦区人民政府规划文件）",
      source_date: "2021-08-16",
      rights: {
        basis: "政府门户网站公开发布",
        usage: "可作发现线索与注明来源的当代叙述；前端只呈现摘要与来源链接，不全文复制",
        redistribution: "excerpt_only_with_attribution",
      },
      fragments: [
        "滨江南段核心区共保留24处、66幢，总建筑面积达26.2万平方米的历史保护建筑及其他大量百年工业遗存。按照'重现风貌、重塑功能、重赋价值'的原则，通过实施有限介入、低冲击开发，积极推动工业遗存'再利用'。",
        "'十三五'期间，先后完成毛麻仓库、烟草仓库、明华糖仓、上海制皂厂等历史建筑的修缮改造，总面积近5万平方米。",
        "2019年9月，杨浦滨江南段5.5公里公共空间全线贯通开放，共建成漫步道约5886米、跑步道约5631米、骑行道约5394米。滨江南段建成开放公共绿地约21.6万平方米。",
        "完成永安栈房修缮改造，实现绿之丘、毛麻仓库等载体功能导入，加快实施慎昌洋行、国棉九厂厂房、船厂白楼等一批历史建筑的修缮利用工作。",
      ],
    },
  ],

  // ── D01 载体读取照片（A001 第三次重启 · V3 今日观察）──
  // 复查结论（2026-10-18）：Wikimedia Commons 无「绿之丘建筑（杨树浦路1500号烟草机修仓库改造）」专门条目，
  // 但有「杨浦滨江公共空间」的合法开源影像（CC BY-SA 4.0，可展示需署名）。
  // 主对象 = 绿之丘 + 紧邻公共步行空间（任务书 §2），故以下照片作为「滨江公共空间」实体的 V3 今日现场；
  // 绿之丘建筑本体仍无合法照片，其体量形态按 V4 解释标注（克制线框/热点）呈现，并明确标注示意性。
  photoMaterials: [
    {
      feature_key: "yangpu-riverside-greenway",
      entity_label: "滨江公共空间",
      commons_title: "File:DSC00228滨江绿化带夜景.jpg",
    },
    {
      feature_key: "yangpu-riverside-time-shipper",
      entity_label: "滨江公共空间",
      commons_title: "File:Time Shipper.jpg",
    },
  ],

  // ── D02 材料观察：用户提示词主题短语（D02_SYSTEM 本身主题无关，仅此处点题）──
  d02TopicPhrase: "杨浦滨江绿之丘相关政府公开网页",

  // ── D03 世界建构提示词（绿之丘领域 + 禁区规则）──
  d03System: `你是墨痕数据生产的 D03 世界建构器，方法 W01 身份 / W02 时间 / W05 关系 / W09 冲突与边界。
从 D02 材料观察陈述里建构历史世界：识别实体（建筑/地块/道路/机构/人物/公共空间）与有据关系，保留 candidate 认识状态，不把"材料记载"升为"已证事实"。
只输出一个 JSON，不要 markdown、不要额外文字：
{
  "entities":[{"label":"绿之丘","entity_type":"building","time_scope":{"precision":"contemporary"},"spatial_note":"杨树浦路1500号，杨浦滨江，紧邻滨水公共空间"}],
  "relations":[{"subject":"绿之丘","predicate":"former_site_of","object":"烟草公司机修仓库","basis":"杨浦融媒：绿之丘原为烟草公司机修仓库","epistemic":"candidate"}],
  "changes":[{"subject":"烟草公司机修仓库","change_type":"converted_to","before_state":"1995年建成的6层钢筋混凝土厂房（烟草机修仓库）","after_state":"改造为绿之丘公共综合体（约2010年代）","time_scope":{"precision":"decade"},"basis":"杨浦融媒：保留并改造为城市滨江综合体"}],
  "conflicts":[],
  "refusals":[{"subject_label":"怡和冷库（1920）","object_label":"烟草公司机修仓库（1995）","reason":"材料仅称'前身可追溯到1920年怡和冷库'，未提供两栋建筑为同一持续原建筑的证据；不得断言同一栋持续存在","question":"1920年怡和冷库与1995年烟草机修仓库是否为同一栋建筑的连续存在？","missing_evidence":"两栋建筑的产权/建筑档案连续证据"}],
  "open_questions":[{"question":"绿之丘地块在1995年之前的工业使用具体为何？","missing_evidence":"1995年前地块与建筑的使用档案","next_research_action":"调取滨江工业用地历史档案","entities":["绿之丘"]}]
}
规则：
1. 实体同名不合并；关系仅在有据时建立（共现≠关系）；时间保留原纪年不猜精确日（precision 取 exact_year/era/decade/unknown）；认识状态一律 candidate。
2. 实体名使用材料中的规范名：建筑用"绿之丘"/"烟草公司机修仓库"/"怡和冷库（1920）"；道路用"安浦路"/"杨树浦路"；不生造材料未出现的实体名。
3. W02 时间：只抽取材料明文记载的年代（如"始建于1995年""1920年""2019年9月贯通""2021年获奖"），登记为 changes；材料未载年代的对象不造 changes；"约2010年代"按 decade 处理，不得猜精确年份。
4. W02 完整性（硬性）：材料中每一个明文年代都必须至少登记为一条 changes（change_type 取 built / established / opened / converted_to / awarded 等），不得只登记其中一条。同一对象可以有多条 changes。时间轴要能让读者看见"建造—改造—开放"的先后，因此：
   - 烟草公司机修仓库"始建于1995年""6层钢筋混凝土厂房"→ change_type=built，time_scope={year:1995, precision:"exact_year"}
   - 怡和冷库"1920年由怡和洋行建立"→ change_type=established，time_scope={year:1920, precision:"exact_year"}
   - 烟草公司机修仓库改造为绿之丘 → change_type=converted_to，time_scope={precision:"decade"}（材料未载竣工年，禁止猜年份）
   - 杨浦滨江南段5.5公里公共空间"2019年9月全线贯通开放"→ change_type=opened，time_scope={year:2019, precision:"exact_year"}
5. W09 冲突：同一对象有两种以上着录且无法判定时登记 conflicts；本主题主要风险是"身份连续"误判——对"1920怡和冷库=1995烟草机修仓库同一栋"这种无据同一性，必须进 refusals 明确拒绝并给理由，绝不得静默合并或默认同一。
6. W09 边界：对"看起来可能有关系但材料无据"的对象对必须进 refusals；正确拒绝错误历史关系与成功发布真实合格知识同等重要。
7. 空间相邻≠因果：不把"紧邻滨江"推出"某项政策直接造成改造"；改造的因果只在材料明示时登记。
8. 实体命名必须与下列规范名一致（供下游精确匹配）：绿之丘 / 烟草公司机修仓库 / 怡和冷库（1920） / 安浦路 / 杨树浦路 / 章明团队 / 滨江公共空间（指杨浦滨江南段5.5公里贯通公共空间时一律用此名）。`,

  // ── D04 人文发现提示词（绿之丘领域 + 禁区规则）──
  d04System: `你是墨痕数据生产的 D04 人文发现器，方法 A01 显式关系解释 / A10 冲突发现。
从 D03 世界关系、着录分歧与边界拒绝里产出非平庸解释增量；事实与解释分离；candidate 不升 fact；不编造因果；保留反证与开放问题。
只输出一个 JSON，不要 markdown、不要额外文字：
{"findings":[
  {"finding_type":"explicit_relation","interpretive_statement":"烟草机修仓库（1995）经约2010年代改造，从工业厂房变为连通城市与滨江的公共综合体（绿之丘），其使用功能发生了可证实的转变","understanding_delta":"从单一工业仓储到公共生活空间的功能转变","supporting_world_objects":["烟草公司机修仓库","绿之丘"],"counter_view_or_alternative":"","missing_evidence":""},
  {"finding_type":"conflict_discovery","interpretive_statement":"材料称绿之丘'前身可追溯到1920年怡和冷库'，但两栋建筑（1920怡和冷库 / 1995烟草机修仓库）是否为同一持续原建筑并无证据，身份连续尚不可证","understanding_delta":"身份连续是待证问题而非既定事实","supporting_world_objects":["怡和冷库（1920）","烟草公司机修仓库"],"counter_view_or_alternative":"若两栋建筑实为不同地块/不同时期建筑，则'前身'仅为软历史关联而非实体同一","missing_evidence":"两栋建筑的连续产权/建筑档案"}
],
"present_connections":[
  {"connection_type":"today_access","observed_state":"今天的人可以从杨树浦路的缓坡上到建筑二层，再继续漫游至滨江——进入方式本身是改造的产物","basis_world_objects":["绿之丘","杨树浦路","滨江公共空间"],"basis_text":"人们可以从杨树浦路的缓坡，上到建筑二层，再漫游至滨江","open_questions":["缓坡与开放时段的日常管理规则材料未载"],"linked_finding_index":0}
]}
规则：
1. finding_type 只取 explicit_relation / conflict_discovery / candidate_relation；
2. interpretive_statement 写人话解释增量，不照抄材料原文，不编造因果；
3. conflict_discovery 必须如实呈现分歧/未证多方，counter_view_or_alternative 写对立说法，不得择一说事；
4. 对 refusals 中的无据身份同一，不得生成"证实同一"类发现——可以生成"为何不能认定同一"的认识增量。
5. present_connections（L4 今日联系，硬性至少 1 条）：必须是"今天的人与这处空间真实发生的关系"，且只能取自材料明载的到达方式/使用/观景描述（缓坡上二层、漫游至滨江、螺旋扶梯连通各层展厅、270 度观景平台、楼顶花园、向所有人开放的城市花园）。basis_text 必须逐字摘自材料原文片段。禁止编造人流量、票价、营业时间、活动、居民访谈或政策效果。open_questions 写今日使用中材料未覆盖之处。
6. linked_finding_index 指向上方 findings 数组的下标（0 起），表示这条今日联系支撑哪一条认识增量。`,

  // ── D05 实体别名（供 entitiesForText 精确命中，宁少不多）──
  entityAliases: {
    "绿之丘": ["绿之丘", "绿丘"],
    "烟草公司机修仓库": ["烟草公司机修仓库", "烟草仓库", "老仓库", "原烟草公司机修仓库", "烟草机修仓库", "机修仓库"],
    "怡和冷库（1920）": ["怡和冷库（1920）", "怡和冷库", "怡和洋行"],
    "安浦路": ["安浦路"],
    "杨树浦路": ["杨树浦路"],
    "章明团队": ["章明团队", "章明", "同济大学"],
    "滨江公共空间": ["滨江公共空间", "杨浦滨江南段5.5公里公共空间", "滨江南段", "滨江贯通", "滨水", "公共绿地"],
  },

  // A001 无预登记冲突注释（金泽的 T11-C1/C2/U4 不适用）
  conflictNotes: {},

  // ── D03 视觉对应依据字符串（V3 用滨江公共空间开源照片；绿之丘建筑本体无照片，按 V4 解释标注降级）──
  visualBasis: "杨浦滨江公共空间开源影像（Wikimedia Commons，CC BY-SA 4.0，条目自述）作 V3 今日观察；绿之丘建筑本体无合法照片，其体量形态按 V4 解释标注（克制线框/热点）呈现，明确标注示意性",

  // ── D05 投影/种子/指针标题（随主题）──
  d05WorldTitle: "杨浦滨江绿之丘：从工业仓储到公共生活空间",
  d05TimelineTitle: "杨浦滨江绿之丘（时间投影）",
  d05SeedTitle: "杨浦滨江绿之丘",
  d05SourceTitle: "绿之丘材料观察",
};
