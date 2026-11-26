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
- **阻断证据：** HOME V1.8.3原始交互源和CEI统一HTML原型源未能从当前main取得；R5未获Owner审阅状态；真实内容读模型/权利/EXP字段映射尚未完成。不得猜测缺失原型，不得制作新概念图/HTML，不得提前施工。
- **交付文件：** `tasks/implementation/PDW/PDW-01_HOME_CEI工程衔接入口与审查报告_V0.1.md`；CURRENT已同步为PDW-01进行中并记录阻断。
- **本轮未做：** 未修改业务代码、数据库、API、权限、CI、部署；未执行浏览器/真实数据/权限验收；未启动PDW-02—PDW-05。
- **下一动作：** 找回并校验V1.8.3原始交互源与统一HTML原型源，或由Owner明确裁决替代方式；随后完成字段映射、正式设计规范定稿和Owner交付边界确认。


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
