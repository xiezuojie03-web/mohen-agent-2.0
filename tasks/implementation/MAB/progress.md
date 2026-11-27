# 墨痕 MAB 工程施工证据账

## 2026-11-26｜施工计划升级 V1.8：建立PDW产品深化工作流

- **变更性质：** 仅施工治理与设计交付衔接文档更新；未修改业务代码、数据库、CI配置或部署。
- **权威施工计划：** tasks/implementation/MAB/PLAN.md 从V1.7升级为V1.8，新增§3.6 PDW-01—PDW-05及其顺序、工作范围、关闭条件、与M5—M8关系。
- **唯一顺序：** HOME CEI工程衔接 → Studio设计与工程自检 → EXP真实主题双组件试验 → Admin视觉与Agent辅助治理深化 → 个人空间产品与数据架构规划。
- **旧工作包处理：** 原M5-UI跨页面执行顺序废止；其有效设计材料保留为PDW相应工作包的输入。WATCH合法消费/撤权仍归原M5及后续合同。
- **同步文件：** AGENTS.md、CURRENT.md、tasks/implementation/MAB/ENGINEERING_HANDOFF_CURRENT.md、tasks/implementation/CEI-UI-ITERATION/CEI_UI工程迭代交付包_现行.md、tasks/implementation/CEI-UI-ITERATION/CEI_公众体验与个人空间视觉设计规范_现行V1.0.md。
- **执行状态：** PDW-01为下一项工作，尚未开始；本次文档更新不代表HOME交付、M5验收或任何产品页面施工完成。
- **检查：** 文档锚点、工作包编号、执行顺序、旧顺序废止声明及交叉引用已在本次编辑中校验；无代码/数据库测试适用。


## 2026-11-26｜PDW-01 HOME CEI首轮材料与工程审查

- **工作包状态：** `IN_PROGRESS / BLOCKED_SOURCE_MATERIAL`；未关闭，未启动HOME业务代码施工。
- **审查基线：** main `00ccd18b731feb7ab20618c53a22db5bfba99056`；首轮入口文件提交 `451429beaafda40044f7514bf58cbc354091521a`。
- **实际核验材料：** PLAN V1.8 §3.6、CURRENT、AGENTS、ENGINEERING_HANDOFF_CURRENT、CEI-01 V4.1、HOME V0.2、C步、R1—R5、R1—R4综合修订、CEI UI工程迭代交付包、公众体验视觉规范V1.0及MAB UI反向工程审计报告；另静态读取HOME page.tsx、ModeEntryCard、GlobalNav、layout.tsx、five-ui.css。
- **研究质量结论：** R1—R4研究主体可用；C步“保留V1.8.3交互基因、深化多尺度策展知识世界”方向成立；R5为`CONDITIONAL_PASS / OWNER_REVIEW_REQUIRED / IMAGE_PRODUCTION_NOT_YET_AUTHORIZED`。研究PASS不代表完整概念图、HTML原型或工程交付已完成。
- **代码核验结论：** 当前根路由仍为品牌Hero、Studio/WATCH/EXP入口卡及三个空态面板；没有真实策展内容读取和HOME→EXP上下文交接。GlobalNav在HOME隐藏主导航项。five-ui.css有可复用的暖纸/青绿/字体令牌，但当前门户专属结构不应作为V1.8.3继承基线。
- **首轮阻断记录（已由后续补充核验更新）：** 首轮读取时尚未定位V1.8.3/统一HTML原型；2026-11-26补充审查已取得Owner指定整合原型并解除该项阻断。当前剩余事项见下方补充审查记录。
- **交付文件：** `tasks/implementation/PDW/PDW-01_HOME_CEI工程衔接入口与审查报告_V0.1.md`；CURRENT已同步为PDW-01进行中并记录阻断。
- **本轮未做：** 未修改业务代码、数据库、API、权限、CI、部署；未执行浏览器/真实数据/权限验收；未启动PDW-02—PDW-05。
- **首轮下一动作（已被新证据取代）：** 原型源现已取得；后续按下方补充审查的更新动作执行。


## 2026-11-26｜PDW-01补充核验：全工作面整合HTML原型纳入正式基线

- **Owner指定原型：** `tasks/research/CEI-01/prototypes/墨痕_全工作面继承整合_HTML原型_明亮雅致版.html`。
- **Git Blob SHA：** `52334737b590d2cb0b7068b1c45d9ad0e144bbfa`；已读取完整Blob（约2,399,164字符），并解码核验内嵌的`home-source`、`exp-source`、`watch-source`、`workflow-source`四份HTML。
- **基线裁决：** 接受该文件为PDW-01正式整合原型基线；内嵌HOME明确标注V1.8.3。旧CEI-4统一原型不再作为同级首选依据。原先“原型源未取得”阻断解除。
- **覆盖范围：** HOME连续策展漫游、七类视角、附近线索、低干扰墨痕、HOME→EXP上下文与返回锚点；同时包含EXP、WATCH、Studio/Admin演示及个人空间抽屉。
- **关键质量提醒：** HOME主视觉实际采用深青绿+暖金+浅色文字，不是通常意义的明亮浅色UI；可有雅致气质，但是否符合Owner“明亮、清润”目标需明确审阅。原型包含候选主题/研究夹具/未达G5素材，不是正式公开知识资产；Studio/Admin、个人空间和WATCH等均为模拟交互，不是生产业务能力。
- **工程约束：** 主文件以Base64内嵌HTML、iframe/srcdoc、postMessage编排，约2.4MB；仅继承设计意图与交互契约，不照搬单文件封装。生产实现须按现有路由/权限/知识读模型拆解，postMessage通配目标源不得作为生产安全实现。
- **验证边界：** 本轮为完整源码静态核验，未进行浏览器视觉、触屏、跨视口和端到端运行验收。
- **文档同步：** PDW-01入口报告补充第10节；CURRENT更新为`IN_PROGRESS / BLOCKED_DESIGN_ACCEPTANCE_AND_DATA_MAPPING`。
- **下一动作：** 以该原型完成HOME设计映射、R5 Owner审阅/视觉方向确认、真实内容数据/权利字段及HOME→EXP上下文映射；仍不启动HOME代码施工或PDW-02—PDW-05。


## 2026-11-26｜PDW-01-B HOME设计—工程逐项映射审查

- **审查基线：** main HEAD `a6c409d2cf682dd66db90f5a21d0a947ef66ce8c`；Owner指定原型Blob `52334737b590d2cb0b7068b1c45d9ad0e144bbfa`。
- **原型核验：** 从整合HTML的`home-source`提取独立HOME V1.8.3源码77,131字符；实际六种主题视角+漫游全部，27条数据（4条具名馆藏设计样例但非G5、1条研究夹具、2条未审外链候选、20条无来源绑定策展方向）；逐项检查结构、组件、状态、自动漫游、暂停、鼠标/触屏、键盘、减少动态效果和1050/700/350断点。
- **设计映射：** HOME-00—08全量映射完成；确认“附近线索”只是原型connections ID推荐，不是地理附近或已证历史因果；原型没有独立页尾模块；卡片缺少部分地域/来源/限制可见性；EXP query传递显示字段而非正式artifact_ref@revision。
- **工程代码：** 复核`page.tsx`、`ModeEntryCard.tsx`、`GlobalNav.tsx`、`layout.tsx`、`five-ui.css`、Explore page/CSS、`read-model-repository.mjs`及`read-model-bridge.ts`。确认当前HOME仍为门户，GlobalNav首页隐藏主导航，Explore摘要桥非HOME feed；六类L5和G5 visual_stage资格语义可复用。
- **继承结论：** page.tsx主体REBUILD；ModeEntryCard不作为知识卡片，仅辅助入口KEEP/ADAPT；GlobalNav ADAPT；layout KEEP；全局token KEEP并局部ADAPT；旧门户布局DROP；EXP现有业务不改，只作为交接依赖。
- **数据合同：** 不新增Schema/API/数据库/Gate。HOME未来只消费当前有效G5 visual_stage、指定purpose/scope/action和逐对象媒资权利；区分原型样例、候选资产、真实知识资产、公众展示合格资产。Explore `readProductionRelationSummary(topicKey)`不是完整HOME策展feed。
- **视觉裁决建议：** 局部调整ADAPT；深青绿+暖金沉浸感成立，但大面积暗场不满足Owner“明亮清润”目标；建议浅纸/浅青灰主基调、深青绿局部保留、暖金弱化。等待Owner明确接受/修正。
- **状态：** `IN_PROGRESS / HOLD_OWNER_VISUAL_DIRECTION`；设计规范已写入唯一入口第11节；不关闭、不施工HOME、不启动PDW-02—PDW-05。
- **验证边界：** 静态源码检查；无浏览器、真实DB、真实HOME feed、权限、EXP往返运行验收；未修改业务代码、数据库、API、权限、CI、部署。
- **唯一下一动作：** Owner审阅并裁决视觉方向。



## 2026-11-27｜PDW-01 Owner视觉裁决与正式关闭

- **Owner裁决：** 接受第11.7节视觉调整方向：“整体明亮化，保留深青绿局部沉浸表达，弱化暖金。”
- **视觉规范定稿：** HOME整体基调为温润浅纸/浅青灰；深青绿限于局部焦点、沉浸内容面、墨痕浮层或导航强调；暖金仅作少量细节强调。不得恢复全屏深色舞台，也不得改为普通白底后台。
- **关闭判断：** PDW-01要求的原型源码拆解、HOME-00—08职责映射、工程代码继承判断、L5/知识资格/媒资权利/EXP交接关系、正式HOME工程设计规范和Owner视觉方向裁决全部完成，标记`CLOSED / OWNER_APPROVED`。
- **验收边界：** 本轮未做真实L5数据查询、媒资权利运行核验、浏览器/触屏/响应式/键盘实测或EXP往返实测；这些是后续HOME实施阶段的验收证据，不因PDW-01关闭而视为PASS。
- **工程边界：** 本轮只更新正式文档，没有修改HOME业务代码、数据库、API、权限、CI或部署；关闭不自动授权HOME代码施工。
- **唯一正式入口：** `tasks/implementation/PDW/PDW-01_HOME_CEI工程衔接入口与审查报告_V0.1.md`，现行内容版本V0.3。
- **下一工作包：** 按PLAN V1.8 §3.6顺序为PDW-02｜Studio设计与工程自检；本轮不启动。

## 2026-11-27｜PDW-02 Studio设计与工程自检（PASS_WITH_GAPS / OWNER_REVIEW_REQUIRED）

- **审查基线：** GitHub main 7ebacda9a9c3f718778462b87c2d8fad21006e5f；严格按PLAN V1.8 §3.6、PDW-01入口、MHKA-02—04、KAD2及CEI E定位设计与工程依据。
- **代码核验：** 定向检查Studio主入口/StudioWorkbench/studio.css、项目/研究/来源/生产/导演方案/作品修订/正式发布/Admin/WATCH相关API与服务调用；未遍历无关代码。
- **设计结论：** 桌面三工作区骨架已存在；项目、任务、材料、知识资产、作品编辑和恢复未形成连续工作空间；连续Agent上下文、实时研究事件、作品编辑、完整恢复及窄屏工作区切换有缺口。
- **P0代码根因：** studio-formal-qualification.ts仅允许loopback隔离数据库进行机器G5签发，而publication.submitWork调用该资格补齐函数；云端路径失败关闭。
- **Supabase只读核验：** mohen-cloud有Projects 17、Research Tasks 44、Director Plans 21、Works 16、Work Revisions 24、Studio Director Envelopes 3、Studio Work Envelopes 5、Submission Snapshots 5、Editorial Decisions 5、Publication Snapshots 3；不是空库。
- **Schema差异：** 当前数据库缺publication.works.project_id、public.director_plans的delegation_id/root_task_ref/research_snapshot_hash/research_source_refs、studio.work_revisions.formal_revision_id；数据库迁移记录最新20261120045054，main已有20261123120000与20261123130000两份迁移未应用。未执行迁移。
- **权限核验：** 10张私有Schema表RLS未启用；本轮只读权限查询未发现这些表向anon/authenticated开放Schema USAGE或表权限，因此未确认直接公众泄漏；部分服务端策略宽泛，列为P1防御纵深缺口。未执行RLS SQL。
- **发布衔接：** Admin Reviewer签核→formalDecide→formalPublish及WATCH listWatchEligible读取链在代码中存在；同一作品端到端未运行验证。
- **运行边界：** 最新READY Preview为e563161c，与本次main基线相差175个提交；当前main浏览器登录操作、同一Project到WATCH全链均NOT_RUN。mohen-cloud与当前Preview的DATABASE_URL映射未确认。
- **唯一交付：** tasks/implementation/PDW/PDW-02_Studio设计与工程自检报告_V0.1.md；同步CURRENT与PLAN §3.6。
- **本轮未做：** 未修改业务代码、数据库、API、权限、CI、Vercel部署或环境变量；未启动PDW-03及其他PDW工作包。
- **下一动作：** Owner审阅报告；P0资格链与Schema/持久集成环境问题回归M5主线，另行授权施工；本轮不自动进入代码施工。


## 2026-11-27｜PDW全工作流审查与施工计划升级 V1.9

- **变更性质：** 产品体验设计治理与工作包准出标准修订；未修改业务代码、数据库、API、权限、CI或部署。
- **审查依据：** main原PLAN V1.8 §3.6、AGENTS.md、progress.md中PDW-01关闭记录与PDW-02自检记录，以及PDW-01正式入口V0.3、PDW-02 Studio自检报告V0.1。
- **审查结论：** 原§3.6存在系统性定义缺口：PDW-02将自检报告交付近似等同工作包交付；PDW-03仅要求单主题双组件试验且明示不等于完整EXP交付；PDW-04缺少完整治理旅程/概念图/原型交付；PDW-05偏重数据架构规划，未要求完整个人空间产品体验。五个工作包的交付深度与关闭口径不一致，无法稳定执行“一个PDW完成一个产品工作面”的Owner原则。
- **计划修订：** PLAN升级V1.9，重写§3.6；明确PDW-01 HOME、PDW-02 Studio、PDW-03 EXP、PDW-04 Admin、PDW-05个人空间的唯一对应关系；新增统一执行步骤、最低交付物、证据分层、状态定义、Owner签收门槛和顺序门禁。
- **关键修正：** PDW-02自检报告降为诊断输入，工作包保持进行中，须补齐Studio完整设计/概念图/可操作HTML原型/设计—工程映射；PDW-03把真实主题双组件试验明确为EXP完整工作面设计的验证手段，不再作为全部交付；PDW-04补齐完整Admin治理工作面；PDW-05补齐完整个人空间产品体验、原型和数据/权限架构规划。
- **保持不变：** PDW唯一顺序仍为01→02→03→04→05；PDW不替代M5/M6/M7/M8，不改变D/L/G、Runner/Registry、Gate、作品资格、权限、生产授权及既有专业合同。PDW关闭只代表设计交付与工程移交完成，不代表业务代码或生产运行通过。
- **继承与边界：** PDW-01保持CLOSED / OWNER_APPROVED，不因本次统一标准而重开；PDW-02保持IN_PROGRESS / AUDIT_COMPLETE_DESIGN_PENDING / OWNER_REVIEW_REQUIRED，不得提前关闭；PDW-03—05保持未开始。
- **验证：** 已核对PLAN §3.6边界、五个工作包编号/顺序、各自范围/交付/排除项/关闭条件及M5—M8边界；本次仅文档修改，无代码/数据库测试适用。
- **同步状态：** PLAN已更新；progress追加本记录。CURRENT.md未能通过本轮GitHub文件读取接口定位，未修改；不得将CURRENT同步描述为已完成。后续应在确认其准确路径后，将唯一当前断点同步为PDW-02设计交付待完成。


## 2026-11-27｜PDW V1.9状态门禁补充校正

- 在PLAN V1.9中补齐OWNER_REVIEW_REQUIRED状态定义，并明确PDW-03、PDW-04、PDW-05均为NOT_STARTED，分别以前一工作包CLOSED / OWNER_APPROVED为启动门槛。
- 本次仅修正文档状态定义，无代码/数据库测试适用。


## 2026-11-27｜PDW-02完整Studio产品设计与工程衔接交付（Owner Review）

- **工作包状态：** DESIGN_REVIEW / OWNER_REVIEW_REQUIRED；未关闭，等待Owner实际体验与签收。
- **唯一执行计划：** tasks/implementation/MAB/PLAN.md V1.9 §3.6；PDW顺序01→02→03→04→05不变。
- **基线：** Studio业务代码审查基线2388af125300efb73e27b3c3804982a56f5a9d36；其后仅增加本PDW设计原型/概念图和文档同步，未修改Studio业务代码、API、数据库、RLS、CI或部署。
- **正式入口：** tasks/implementation/PDW/PDW-02_Studio设计与工程自检报告_V0.1.md，现行内容V0.2；保留原第1—10节自检诊断，新增第11节完整设计交付。
- **设计交付：** 完成Studio职责/角色边界、三工作区信息架构、项目与研究/证据/知识资产/导演/作品视图关系、16步创作旅程、Agent状态与人工控制点、视觉/响应式/无障碍要求。
- **概念图：** tasks/implementation/PDW/concepts/PDW-02_Studio整体工作面概念图.svg；另在Owner当前会话展示完整工作面概念渲染。
- **HTML原型：** tasks/implementation/PDW/prototypes/PDW-02_Studio_完整创作工作空间_可操作原型.html；本地模拟覆盖项目创建/切换、自然语言对话、研究事件视图、证据/资产/导演方案切换、暂停/继续/取消、段落编辑/局部改写、保存/版本差异/恢复、模拟提交资格阻断及窄屏工作区切换。
- **原型检查：** HTML结构锚点检查PASS；内嵌JavaScript语法检查PASS；关键控件/状态/模拟声明存在。真实浏览器点击、视口、键盘/触屏实测NOT_RUN；真实服务未接线并已明确标注模拟。
- **继承裁决：** KEEP现有Project/Task/Owner校验、来源/原件链、D/L/G唯一生产链、资产合同、正式导演/作品正文、Admin/WATCH治理链；ADAPT Workbench/desk统一、Agent上下文/事件、知识资产视图、作品编辑恢复、窄屏切换；DROP割裂的第二主入口和技术术语主导航；Owner整合HTML因本轮接口无法回读2.4MB源码，仅作REFERENCE_ONLY。
- **P0—P3：** 自检报告全部P0/P1/P2/P3问题逐项映射到设计处理、工程归属、M5回归、依赖和授权要求；没有转化为本轮业务代码修改。
- **Owner验收：** O1—O9任务及失败判据已列入正式入口第11.10节；等待Owner实际体验。
- **状态同步：** PLAN V1.9 §3.6 PDW-02更新为DESIGN_REVIEW / OWNER_REVIEW_REQUIRED；根目录CURRENT更新为当前唯一断点；本记录追加至progress。
- **边界：** 未修改业务代码、数据库Schema/数据、RLS、API、CI、部署、生产资格；未重做D00—D05/G0—G5；未启动PDW-03/04/05。
- **下一动作：** Owner按O1—O9体验原型并反馈；按反馈在唯一入口内修订，签收后方可关闭PDW-02。


## 2026-11-27｜PDW-02最终文件与状态复核

- **复核基线：** main HEAD 026a9f414d61227ac7685f95b1c8b642716806e5；Studio业务代码基线仍为2388af125300efb73e27b3c3804982a56f5a9d36；本轮没有业务代码变更。
- **正式入口：** PDW-02唯一入口现行内容V0.2，已含原诊断、自检问题处置、完整用户体验、IA、Agent交互、视觉规范、概念图/原型引用、工程映射和Owner验收任务。
- **原型最终SHA：** bb77989410fd3fa9bcda48b6f59e15c978353f49；HTML约31516字符；脚本语法复核PASS；核心交互锚点存在。浏览器实测NOT_RUN。
- **概念图最终SHA：** b96d82899f3b22537141723d456da01b801f8411；SVG源已入库，完整三工作区构图。
- **计划/状态：** PLAN V1.9 PDW-02为DESIGN_REVIEW / OWNER_REVIEW_REQUIRED；CURRENT已更新；PDW-03—05仍NOT_STARTED。
- **当前关闭门槛：** 等待Owner完成O1—O9体验并签收；未签收不关闭，不启动PDW-03。


## 2026-11-27｜PDW-02原型修订复核

- HTML原型补齐版本选择与指定版本恢复：恢复所选版本载入当前草稿，保存后形成新修订，不覆盖历史版本。
- 最终HTML blob SHA：15da8db9d6fad343b1feb1fe4495de597b598a7d；JavaScript语法复核PASS。
- 当前状态不变：DESIGN_REVIEW / OWNER_REVIEW_REQUIRED；等待Owner体验，不提前关闭。


## 2026-11-27｜PDW-02全平台统一体验底座与Studio工作空间重构方向归档

- **方向裁决记录：** 新建独立文件 `tasks/implementation/PDW/PDW-02_全平台统一体验底座与Studio工作空间重构方向裁决记录_V0.2.md`（创建提交 `0162ed7c62e924ce8cf8efd403db85d8f124271c`；最终Blob SHA以当前main文件回读为准）。V0.2已完成对既有M5 Agent专项及沪上经纬原始理念/源码的对照，记录Owner方向、继承裁决、任务范围、依赖和关闭条件。
- **既有Agent研究找回：** `tasks/results/MAB/M5_NAVIGATION_MODULE_ROLES_AGENT_MODES_DISCUSSION_CURRENT.md`，标题《墨痕 M5｜模块职责、Agent参与与研究资产机制——设计讨论定论稿》，原状态DESIGN_DISCUSSION_CLOSED（2026-11-16）。继承其“情境感知、人文发现和智能创作伙伴”、可达/连续/判断/行动、安静在场/对象响应/条件提示/用户询问/受托执行及共享Agent能力按页面情境适配等原则；不将讨论建议误升格为正式合同。
- **沪上经纬继承核验：** 只读对照仓库 `xiezuojie03-web/hushang-jingwei` 的项目内核纲领§6.4—§6.5、`mohen_consciousness_mockup.html`、`MohenFab.tsx`、`app/api/mohen/route.ts`、TopNav/Footer及布局文件。确认“世界＋意识＋看法”原始模型、全局唤起入口、低打扰提示/展开/静音和页面情境感知具有原型/代码依据；旧代码和触发阈值不直接迁入2.0。
- **任务拆分：** PDW-02-B｜全平台统一体验底座设计补强（全局墨痕、顶部/底部/移动端导航、全站视觉系统、页面情境适配）；PDW-02-SR｜Studio工作空间结构重构（独立归属原PDW-02）。顺序为B→SR；两项分别交付和签收，PDW-02整体关闭条件不变。
- **施工计划：** PLAN升级V1.10，§3.6新增PDW-02-B与PDW-02-SR范围、交付和关闭条件；不改变PDW-01→PDW-05顶层顺序及M5—M8工程合同。
- **相关文档索引：** PDW-02唯一正式入口更新为现行内容V0.3并增加11.14索引；CURRENT改为PDW-02-B为下一设计动作；AGENTS与ENGINEERING_HANDOFF_CURRENT同步子任务读取/执行顺序。
- **本轮边界：** 仅文档与设计治理更新；未修改业务代码、API、数据库/Schema/数据、权限/RLS、CI、部署、生产资格或旧沪上经纬仓库。未执行浏览器/真实Agent/跨页运行验收；不得宣称全局墨痕、导航或Studio新布局已实现。
- **当前状态：** PDW-02仍为DESIGN_REVIEW / OWNER_REVIEW_REQUIRED；下一设计任务PDW-02-B，完成并经Owner审阅后执行PDW-02-SR；PDW-03—PDW-05仍未启动。
- **本批提交：** 独立方向记录创建 `0162ed7c`；PLAN `9d1d7af4`；PDW-02入口首次索引 `bd3fc233`、补充顺序说明 `87fcb05a`；AGENTS `2b9b1d3b`；CURRENT首次同步 `4b4cb706`、顺序纠正 `3e5261d8`；工程交接 `c657e564`；progress首轮追加 `8e0c9bf6`。


## 2026-11-27｜PDW工作流重构与正式入口归位（Owner裁决执行）

- Owner裁决：全平台统一体验底座由原PDW-02-B升格为PDW-00；取消B命名。PDW-00排在PDW-01之前。PDW-01既有HOME成果保持已完成基线，PDW-00后只做继承性完善，不重做。Studio工作空间重构完整归入PDW-02，不再保留SR子任务名称。
- 正式入口：原全局/Studio方向裁决记录改定位并更名为PDW-00正式入口；原Studio自检报告改定位并更名为PDW-02正式入口。前者保留Agent专项与沪上经纬研究依据并增加正式执行标准；后者保留既有诊断/设计输入并增加完整Studio结构重构标准。
- 顺序：PDW-00→PDW-01→PDW-02→PDW-03→PDW-04→PDW-05。PDW-02等待PDW-00与PDW-01均经Owner签收。
- PLAN V1.11恢复M0—M4阶段沿革与条件准出性质，M5保持当前工程重点；M6—M8留在M阶段工程计划；PDW独立为设计工作流章节。第0章清理为执行入口与通用纪律。
- CURRENT、AGENTS、ENGINEERING_HANDOFF_CURRENT同步新顺序、路径与职责。
- 本轮仅文档治理；未修改业务代码、API、数据库/Schema/数据、权限/RLS、CI、部署、生产资格或旧沪上经纬仓库。历史自检、概念图、HTML原型和已签收结论保留，不把设计完成写成工程运行PASS。

## 2026-11-27｜PDW文件内部逻辑与跨文件关联二次自检

- **审查范围：** PLAN V1.11、CURRENT、AGENTS、ENGINEERING_HANDOFF_CURRENT、progress、PDW-00/01/02三个正式入口；重点核查章节编号、任务归属、唯一入口、旧任务编号、路径引用、前置门禁、状态口径和执行顺序。
- **发现并修正：**
  1. PLAN M5段落有若干误指向§3.5（M4），实际应指向§3.6（M5）；已定向修正M5八维、主干、连续总装和原件接入等引用。AGENTS的必读章节同步改为§3.6（M5）与§6（PDW）。
  2. PDW-00原方向裁决记录转为正式入口后，正文仍残留“PDW-02内部子任务”“原全局体验底座子任务”等旧归属表述，且章节8排在附录之后；已重整第4—8节，明确PDW-00独立归属、PDW-02仅作历史方向输入、六个工作面范围、权威文件关系、当前执行顺序，并将正式执行标准置于附录之前。
  3. PDW-01仍有PLAN V1.8旧引用；现行权威引用已更新为PLAN V1.11 §6。保留的CEI历史基线明确标注为历史依据。
  4. PDW-02入口第11节标题层级错误、11.12旧入口路径、11.13历史设计状态与现行NOT_STARTED状态易混淆，且残留已废止PDW-02-B/PDW-02-SR执行顺序；已修正标题层级、路径和状态语义，将旧O1—O9及旧状态明确标为历史输入，现行执行标准统一指向第12节。
- **历史记录处理：** progress中旧PDW-02-B/PDW-02-SR、PLAN V1.8/V1.10等记录保留，不回写篡改历史；它们只说明当时状态，不构成现行执行入口。现行任务归属与顺序以PLAN V1.11 §6、CURRENT及三个正式入口为准。
- **现行顺序复核：** PDW-00（本轮唯一启动任务）→PDW-01（仅做HOME继承性完善，不重做已签收成果）→PDW-02（Studio工作空间重构）→PDW-03→PDW-04→PDW-05；每项Owner签收后再启动下一项。
- **施工边界：** 本轮仅修正文档逻辑和跨文件引用；未修改业务代码、API、数据库/Schema/数据、权限/RLS、CI、部署、生产资格或旧沪上经纬仓库。
- **当前结论：** 文档结构与任务归属已完成本轮修正；历史过程记录保留。仍须在启动PDW-00时按下述指令读取现行文件，并以最新main内容为准，不得从progress历史描述复原旧任务结构。

 
## 2026-11-27｜PDW-00全平台统一体验底座设计交付

- **执行基线：** `xiezuojie03-web/mohen-agent-2.0` main；本轮启动时最近提交为`6b5ca92387aeb8f65970b82ae3ba751a245566c4`。PLAN V1.11；PDW-00正式入口原V0.1，状态`READY_FOR_EXECUTION / NOT_STARTED`。
- **必读核验：** AGENTS.md、PLAN.md、CURRENT.md、OWNER_WORKING_AGREEMENT.md、ENGINEERING_HANDOFF_CURRENT.md、PDW-00正式入口、Agent专项讨论、PDW-01正式入口、PDW-02正式入口。PDW顺序与文件归属无冲突，未修改PLAN/AGENTS/ENGINEERING_HANDOFF。
- **继承研究：** Agent四要素/五类行为/共享Agent原则继承；旧仓库“世界＋意识＋看法”理念继承并按MoHen 2.0知识世界/证据/权利/资格层重释。MohenFab、旧API、TopNav、Footer、AskMohenButton、layout已读取；区分理念、原型、源码片段和运行未验证能力。旧红/金视觉、停留计时阈值、兴趣画像、旧store/API不直接迁移。
- **main代码静态映射：** 读取`apps/web/app/layout.tsx`、`page.tsx`、`components/GlobalNav.tsx`、`explore/page.tsx`、`studio/page.tsx`、`admin/page.tsx`、`watch/page.tsx`及`styles.css/five-ui.css/studio.css/explore.css/watch.css/admin.css`。确认根布局挂载GlobalNav但未挂载全局墨痕；HOME仍为门户；EXP/Studio/Admin/WATCH独立页面存在；个人空间候选路由`me/profile/my`未定位，记VERIFY，不推断仓库绝对不存在。
- **正式入口：** `tasks/implementation/PDW/PDW-00_全平台统一体验底座设计补强正式入口_V0.1.md`内容升为V0.2；新增§9.1—§9.10，包含继承裁决、墨痕服务规范、Context Envelope、角色/页面矩阵、异常降级、导航、Token、组件边界、六工作面适配、工程映射和Owner验收。
- **概念图：** 新增`tasks/implementation/PDW/concepts/PDW-00_全平台统一体验底座完整概念图.svg`，提交SHA`44b2cda105818eabd190da730d287448569a7362`。
- **HTML原型：** 新增`tasks/implementation/PDW/prototypes/PDW-00_全平台统一体验底座可操作原型.html`，提交SHA`fd263f8503e3348bb119294a0067d64b18e8c180`。覆盖六工作面、HOME→EXP→Studio、角色演示、墨痕唤起/收起/静音、上下文封套和离线模拟；模拟数据/角色/Agent响应明确标注。
- **正式入口提交：** `6294ba23655a003c5edbc6ff1c3c67554f850ee2`。
- **文档状态：** CURRENT已同步为`DESIGN_DELIVERY_READY / OWNER_REVIEW_REQUIRED`；PDW-00未关闭。PDW-01、PDW-02及后续任务状态未提前改变。
- **验证边界：** 仅完成静态代码读取与设计文件写入；浏览器点击、键盘、屏幕阅读器、真实移动设备、多视口及运行权限验收均`NOT_RUN`。本轮未修改业务代码、API、数据库、Schema、数据、权限/RLS、CI、部署、生产资格、D/L/G合同或Agent运行时。
- **Owner验收：** 按PDW-00正式入口§9.9 O1—O8体验；失败判据和未决项按§9.10记录。等待Owner审阅，不得自签`CLOSED / OWNER_APPROVED`。
- **本轮最终设计状态：** `DESIGN_DELIVERY_READY / OWNER_REVIEW_REQUIRED`。唯一下一动作：Owner审阅PDW-00概念图/HTML并执行体验验收。

- **补充修订：** HTML原型追加修正`05c0d60d4ec3a42191ef679f5e9a474f80d0b8c5`，导航按角色显隐Admin，访客进入Studio/个人空间会被演示权限拦截，修复EXP→Studio上下文轨迹重复记录。最新main HEAD核验为`05c0d60d4ec3a42191ef679f5e9a474f80d0b8c5`（2026-11-27 04:56:37Z）。

- **原型交互补强：** `41f822c17e3c92519886d2dd2ff57b5a1c7fb01d`将个人空间从桌面一级主导航调整为账户侧入口（移动端保留个人标签），并实现Escape关闭墨痕面板及焦点返回唤起按钮；正式入口§9.8同步修正。浏览器/键盘实测仍NOT_RUN。

- **组件级工程映射补充：** 已回读并检查`ExploreWorkbench.tsx`、`ExplorePresentation.tsx`、`StudioWorkbench.tsx`、`AdminWorkbench.tsx`、`WatchGallery.tsx`及`GlobalNav.tsx`。确认EXP语义工作台/呈现壳双组件职责分离可继承；HOME当前仅page.tsx+ModeEntryCard入口卡，不是同类策展双组件；Studio/Admin/WATCH分别保留既有业务工作台。细节归档PDW-00入口§9.7.2。提交SHA：`c91f4ff8999e33f82ebdfad24779b7ed7cb26894`。

 
## 2026-11-27｜PDW-00 Owner反馈后的设计继承质量补强

- **Owner反馈：** 认可六个工作面的视觉风格方向和桌面顶部全局导航，要求保持；指出墨痕继承不足、六页专属设计退化为通用演示、全局页尾不真实且开发说明出现在页面上。
- **补充研究范围：** 重新读取沪上经纬内核纲领§6.4—§6.5、`MohenFab.tsx`、`lib/store.ts`、`app/api/mohen/route.ts`、旧版`TopNav.tsx/Footer.tsx/AskMohenButton.tsx/layout.tsx`；并对照PDW-01 HOME签收报告、2026-11-26 UI反向工程审计、当前main的GlobalNav、Explore双组件、Studio、Admin、WATCH代码。
- **墨痕继承补强：** 明确恢复“情境观察→解释→下一步行动”三段式主动提示、低打扰预览、nextSteps直接行动、页面级情境介绍、结构化叙事与统一发问入口；明确摒弃2秒轮询、停留/滚动/悬停兴趣推断、隐形兴趣画像、旧12秒/3分钟阈值及打开FAB自动解除静音。详见PDW-00入口§9.11.2—§9.11.3。
- **六页继承补强：** HOME保留已签收V1.8.3策展漫游/六类视角/错落编排；EXP保留ExploreWorkbench+ExplorePresentation双组件和专题Experience资产；Studio保留现有真实三工作区和生产能力作为PDW-02输入；Admin保留九个治理工作区；WATCH保留精确修订/沉浸舞台/章节轴/依据侧栏；个人空间明确现无正式页面，按既有审计架构登记为未来建设，不伪装为已实现。详见§9.11.4。
- **全局页尾：** 确认当前main的`apps/web/app/layout.tsx`未挂载Footer，`GlobalFooter.tsx`路径返回404；HTML原型新增轻量统一产品页尾，移动端底部导航与页面页尾分工明确。无生产业务代码改动。
- **概念图：** 同步桌面顶部导航的账户入口层级和全局页尾表达，保持原有明亮清润视觉方向。
- **HTML原型：** 重构为六个不同页面舞台，不再使用统一标题/说明/三卡片模板；保留已认可桌面顶部导航和个人空间账户入口；增加全局页尾、墨痕情境预览、解释层次和下一步动作；移除页面可见的“演示说明/交互演示/模拟数据/demo”等开发文案。原型内容和Agent回应仍是静态设计交互，不连接真实业务服务。
- **验证：** HTML内嵌JavaScript语法检查PASS；静态检查确认六页面函数、统一页尾、顶部导航、个人空间入口、情境预览、静音和移动端导航均存在；真实浏览器、键盘、屏幕阅读器和多视口实测NOT_RUN。
- **文档状态：** PDW-00正式入口内容升为V0.3，CURRENT同步为`DESIGN_REFINEMENT_IN_PROGRESS / OWNER_REVIEW_REQUIRED`；PLAN V1.11、AGENTS、ENGINEERING_HANDOFF未修改。PDW-00未关闭，Owner未签收，PDW-01/02未启动。
- **提交证据：** 本轮主要资产提交包括HTML`d76e5350c4aa38867a552a54a0768a0d632151c3`及后续导航/交互补强`8c9a5dd51ccf9bd3ea2eaf98170ef99c50c6e01f`、`7cd905a962c30ec0b17b2c40d5a7b519ec2562d8`；正式入口V0.3提交`12744a2e08b9429a1c8ce57353f859be95bb4183`；概念图提交`924d5725456b8681a9b55dc925b173000eb05389`及SVG格式修正`8596b354cdec286658eba2a97b73a7ef02dcf0fa`。CURRENT同步提交：`361b30f6d3821adae10e86c04d0642840bc07053`。
- **唯一下一动作：** Owner打开更新后的概念图和HTML，按正式入口O1—O13审阅；提出的具体修订仍归PDW-00，不提前启动PDW-01或PDW-02。

- **静音规则复核：** HTML原型修正为打开全局墨痕面板不会自动解除静音；只有用户明确点击“恢复提示”才恢复主动提示。静音状态仍允许用户主动提问。页尾补充来源/材料权利/个人隐私说明原则。原型脚本语法复核PASS；真实浏览器验收仍NOT_RUN。对应HTML提交SHA：`a0ed7742ab203ecb155d81354c47b6a1e5ee3474`。


## PDW-00交付标准与页面基线澄清（2026-11-27）

Owner提出三项正式修订要求：说明六个页面各自继承的基线；澄清O1—O13编号；取消概念图图片，改为HTML交互原型唯一交付物。

已完成文档修订并推送main：
- `tasks/implementation/MAB/PLAN.md`：升级V1.12；PDW统一交付标准改为完整可操作HTML交互原型，明确不再制作/要求概念图图片。
- `tasks/implementation/PDW/PDW-00_全平台统一体验底座设计补强正式入口_V0.1.md`：内容版本V0.4；新增§9.12六页面基线来源与继承边界；明确PDW-00六页展示不等于六页完成继承；将O1—O13改为Owner验收清单，不再使用任务式代号；HTML为唯一原型交付物，既有SVG仅作历史档案。
- `tasks/implementation/PDW/PDW-01_HOME_CEI工程衔接入口与审查报告_V0.1.md`：追加Owner交付标准变更记录，明确V1.8.3横向策展漫游/流动卡片基线继续有效，R4/R5图像研究仅保留历史记录。
- `tasks/implementation/PDW/PDW-02_Studio工作空间重构正式入口_V0.1.md`：更新PDW-02交付标准，唯一原型交付物改为可操作HTML，历史概念图不再验收。
- 未修改业务代码、API、数据库、Schema、权限/RLS、CI、部署及M5主线；未新制任何图片。
- PDW-00状态仍为`DESIGN_REFINEMENT_IN_PROGRESS / OWNER_REVIEW_REQUIRED`，Owner尚未签收，不启动PDW-01或其他后续任务。


- **进一步原型基线核验：** 回读PDW-00 HTML与Owner指定整合HTML。确认当前PDW-00 HTML没有复现HOME V1.8.3连续横向流动卡片、自动流动/暂停及策展漫游交互；因此HOME在当前原型中不得标记为已继承。EXP双组件、Studio完整创作旅程、Admin九类治理工作区、WATCH观看链也不能仅凭页面示意视为完成继承；个人空间本来就没有已签收完整页面基线。已将该事实补入PDW-00 §9.12，作为后续HTML修订与Owner验收的明确缺口。

## 2026-11-27｜PDW-00范围最终收口：仅全局底座，六页面中性占位

Owner明确改变策略：PDW-00不再开展HOME、EXP、Studio、WATCH、Admin、个人空间六个页面的继承研究。PDW-00只完成全局统一问题，六个页面内部设计暂时以中性占位替代，避免误导后续专项。

已完成：
- **HTML原型重构：** `tasks/implementation/PDW/prototypes/PDW-00_全平台统一体验底座可操作原型.html`已重构为全局壳原型。六页使用同一中性占位，不包含页面专属业务样例、栏目、卡片、侧栏、工作流、播放器、治理队列或个人资产模块。桌面顶部导航保留四个主要工作面入口，Admin按角色呈现，个人空间保留账户入口；全局页尾列出六个页面；移动端底部导航覆盖六页。墨痕提供统一入口/面板、当前页面与角色摘要、静音/恢复/收起、主动询问和边界说明。
- **PDW-00正式入口：** 内容版本V0.5。重写页面适配/组件边界/工程映射/验收部分；明确不开展六页面基线盘点、继承判断、内部布局/信息架构/业务流程设计。六页占位只登记后续专项归属。
- **PLAN：** 升级V1.13；PDW-00范围明确为全局墨痕、顶部导航、全局页尾、移动端底部导航、基础视觉Token、共用组件和中性页面占位；PDW-00不进行页面专属继承研究。
- **CURRENT：** 同步PDW-00 V0.5状态、范围和Owner审阅标准。
- 未修改业务代码、API、数据库、Schema、数据、权限/RLS、CI、部署、生产资格、D/L/G合同或Agent Runtime；未生成概念图图片。

**验收状态：** 本次已完成HTML/文档修改并提交main；真实浏览器、多视口、键盘/焦点和屏幕阅读器验收尚未执行，记NOT_RUN。PDW-00仍为`DESIGN_REFINEMENT_IN_PROGRESS / OWNER_REVIEW_REQUIRED`，Owner尚未签收；不得启动PDW-01。


- **最终自检补充：** 清理PDW-00旧版页面适配矩阵、页面组件级审查和逐页继承验收要求；PLAN V1.13 §6、PDW-00 V0.5与CURRENT同步为“全局底座 + 六页占位”。HTML新增可主动查看的“观察—解释—邀约”提示结构预览；静音、恢复提示、收起、主动提问和服务边界说明均保留。HTML内嵌JavaScript语法检查PASS；六个页面路由配置、顶部导航容器、全局页尾、移动端底部导航和墨痕面板结构静态检查PASS。浏览器/多视口/屏幕阅读器实测仍NOT_RUN。
