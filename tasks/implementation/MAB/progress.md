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
