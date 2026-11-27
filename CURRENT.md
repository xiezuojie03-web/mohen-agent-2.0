# 墨痕｜当前施工断点

> 当前核验日期：2026-11-27（PDW-00设计交付同步）  
> PDW-00范围按Owner最新裁决收敛为全局体验底座：统一墨痕Agent、顶部导航、全局页尾、移动端底部导航；六个页面仅保留中性占位，不开展页面专属继承研究。  
> Studio业务代码审查基线：2388af125300efb73e27b3c3804982a56f5a9d36；其后main提交仅新增/修订PDW-02设计原型与概念图，未修改Studio业务代码。  
> 唯一施工计划：tasks/implementation/MAB/PLAN.md V1.13 §6；唯一main执行。

## 1. 当前产品深化状态

### PDW-00｜全平台统一体验底座设计补强
状态：DESIGN_REFINEMENT_IN_PROGRESS / OWNER_REVIEW_REQUIRED。Owner已认可六工作面视觉方向与桌面顶部导航；当前仅完成全局墨痕、统一顶部导航、全局页尾、移动端底部导航和共用Token；六页面内部设计全部留待对应专项。正式入口V0.5；HTML交互原型已改为全局底座+六页面中性占位；真实浏览器验收NOT_RUN。唯一入口：[PDW-00正式入口V0.1](tasks/implementation/PDW/PDW-00_全平台统一体验底座设计补强正式入口_V0.1.md)。完成并经Owner签收后启动PDW-01继承性完善。

### PDW-01｜HOME CEI工程衔接
状态：既有HOME专项设计交付CLOSED / OWNER_APPROVED；等待PDW-00完成后进行继承性完善，不重做。Owner已接受整体明亮化、深青绿局部沉浸、弱化暖金的视觉方向。关闭仅代表设计交付和工程衔接规范完成，不代表HOME代码施工或运行验收完成。

唯一入口：[PDW-01正式入口V0.3](tasks/implementation/PDW/PDW-01_HOME_CEI工程衔接入口与审查报告_V0.1.md)。

### PDW-02｜Studio工作空间结构重构
状态：NOT_STARTED / WAITING_PDW00_AND_PDW01。原自检和设计交付作为历史输入；新结构重构尚未启动。

唯一入口：[PDW-02 Studio工作空间重构正式入口V0.4](tasks/implementation/PDW/PDW-02_Studio工作空间重构正式入口_V0.1.md)。

PDW-00正式入口保留既有Agent专项和沪上经纬研究依据，不再另设并列方向裁决文件。

PDW-02仅承担Studio工作空间结构重构。其前置为PDW-00完成及PDW-01继承性完善签收；不再包含全局体验底座设计。详细标准见PDW-02正式入口和PLAN V1.13 §6。

原型：[完整可操作Studio工作空间](tasks/implementation/PDW/prototypes/PDW-02_Studio_完整创作工作空间_可操作原型.html)。历史SVG概念图仅作归档，不再更新或验收。

等待Owner实际体验与签收；未签收前不得标记CLOSED / OWNER_APPROVED。

### PDW-03—PDW-05
均为NOT_STARTED。必须等待PDW-02 CLOSED / OWNER_APPROVED后，才可启动PDW-03 EXP；不得提前设计EXP、Admin或个人空间。

## 2. 当前最前工程阻断（回归M5，不属于PDW-02代码施工授权）

1. **P0｜云端投稿资格链：** studio-formal-qualification.ts 的机器G5签发仅允许loopback隔离数据库；云端非隔离环境失败关闭。后续必须回归M5原主线，接入获授权的独立Reviewer/Gate服务，不得取消隔离保护或自签。
2. **P0｜数据库Schema：** 已连接mohen-cloud缺少当前main要求的 publication.works.project_id、public.director_plans委托/研究快照绑定字段及studio.work_revisions.formal_revision_id。已有迁移尚未出现在该数据库迁移记录中；须先确认持久化非生产环境与Preview DB映射，再按隔离验证和迁移授权处理。
3. **P1｜Agent上下文与研究事件：** 当前Workbench没有把完整连续对话上下文作为同一研究任务的连续输入；后端事件读取API存在，主界面未消费。
4. **P1｜作品编辑与恢复：** rewrite-beat、panel、revision、restore等服务入口存在，但主工作台缺少完整可编辑、版本差异和跨会话恢复体验。
5. **P1｜数据隔离：** 10张私有Schema表RLS未启用；既有只读检查未发现其向anon/authenticated直接开放Schema/table权限，但部分服务端策略宽泛，需按Owner/Project作用域回归M5补强。
6. **真实运行验证：** 当前main浏览器登录、Agent真实调用、真实DB权限、同一Project到Admin/WATCH的全链均为NOT_RUN；历史READY Preview不能替代当前main运行证据。

## 3. 下一步

- **当前唯一设计断点：PDW-00 V0.3待Owner体验审阅与签收。** 已补强旧版墨痕主动观察/解释/下一步行动继承，恢复六个页面的专属舞台继承登记，补齐全局页尾；桌面顶部导航与六页视觉方向保持不变。Owner按PDW-00正式入口§9.9及§9.11.10审阅全局底座；不再执行O编号验收项。浏览器、键盘、屏幕阅读器和多视口实测仍为NOT_RUN。
- PDW-00签收后，唯一下一任务为PDW-01 HOME继承性完善；PDW-01签收后才启动PDW-02 Studio工作空间重构。六页面占位不得提前扩展为页面专属设计。不得提前启动后续任务。
- 未经Owner签收不得关闭PDW-02；未关闭不得启动PDW-03。
- P0/P1业务和Schema问题继续归M5原施工主线，需另行授权；PDW-02不修改业务代码、数据库、RLS、CI、部署或生产资格。
- 本轮全局方向归档仅新增/更新设计治理文档；未修改业务代码、API、数据库、权限、RLS、CI、部署或生产资格；不代表全局墨痕、导航、Agent或M5闭环已实现/通过。

## 4. 既有历史审计入口

- [MAB工程全面审计报告 2026-11-26 V1.0](tasks/results/MAB/audits/MAB_工程全面审计报告_20261126_V1.0.md)。
- [MAB UI反向工程审计与产品完整性评估 2026-11-26 V1.0](tasks/results/MAB/audits/MAB_UI反向工程审计与产品完整性评估_20261126_V1.0.md)。
- [MAB施工计划 V1.11](tasks/implementation/MAB/PLAN.md)是唯一施工计划；tasks/implementation/MAB/progress.md记录追加式执行证据。