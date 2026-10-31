# K3 / UXD7 本地呈现施工回执（2026-10-31）

本批从`253ae4c`继续，保留首批安全施工；没有重启K3/K4、改号104对象或批量提高152动作状态。原计划及定向修订见`tasks/implementation/K3/uxd7/施工计划修订.md`。

## 实际改造

- EXP新增独立前端呈现壳：叙事HIDDEN/HINT/OPEN、证据CLOSED/PEEK/OPEN/DETAIL逻辑状态独立，窄屏物理面板切换保留另一侧状态；纯舞台扩展；停靠/悬浮、宽度及顶部位置由当前挂载会话保存。未新增DB/API/Runtime字段。
- 原关系/时间/空间/故事表达可同时选择，不再四个互斥技术分页；缺空间资料诚实降级。此项不代表已完成同一世界的完整焦点/时间/Replan/历史恢复接线。
- 提问失败保留已有发现；会话拒绝不发null session后续请求。图接口拒权清除关联发现与旧图，迟到图按请求世代丢弃，不能混入新答案。
- HOME一组三模式入口，Hero不重复CTA，不显示强制线性漏斗和公众Admin模式卡；内页仍保留跨模式导航；Admin入口按已有服务返回角色单独显示。
- Studio研究材料/候选与正式资产待核实状态分层，作品轨独立。A/B卡先比较、显式采纳；失败保留旧作品，候选身份与已采纳计划ID分开，提交内容保留已采纳快照。没有以此替代后端不可变revision/CAS验收。
- WATCH现有文字/章节能力明确为图文阅读与自动翻页，未提供媒体不冒称播放器；仍消费已有发布接口。
- Admin纠正“机器门禁自动授资格”文案，明确作品签核与独立G资格不是同一权限。

## 验证证据

专用`playwright.uxd7.config.ts`使用3107独立本地服务，不复用未知server，拒绝环境文件，显式关闭数据库/应用鉴权配置。使用`/usr/bin/chromium`；测试角色、作品、材料、方案与图响应均为明确的网络fixture，未接真实用户库或模型。旧金泽样板回归用其原有只读冻结退路。

- 独立可见状态与纯舞台先RED，宽屏和12种逻辑组合后GREEN；九档视口同时验证无整页横向溢出、侧域返回与焦点。布局偏好跨表达切换/开合保留。未证明跨刷新/跨设备持久化。
- HOME、Studio双轨/A-B、WATCH诚实阅读、Admin分权表达先RED再实现。
- 首轮全量32例为28PASS/4FAIL，三例为应用alert和Next路由announcer角色歧义，已限定组件范围；一例为金泽原件抽屉被全局导航遮住，保留真实失败证据并修正共享导航层级。
- 最终浏览器38/38通过（含既有样板、九档尺寸和重要缺陷正反例）；workspace类型检查通过，Next生产构建退出0。仅证明本批局部呈现与夹具行为，不签整轮产品PASS。
- 单元35PASS/4SKIP、生产边界69PASS、类型检查通过、K3追溯85/152/62/5通过；4项外部条件跳过仍不能代表真实能力。
- 实际运行`pnpm test`退出1：旧隔离包装器打开缺失的`.env.local`即ENOENT，未到测试执行，也未连接源库；没有把替代单测命令冒称该命令通过。

完整脱敏日志：`/workspace/mohen-k3-build/uxd7-*.log`；源码初始blob、差异ID、原K3/FA锚点见`tasks/implementation/K3/uxd7/source-audit.csv`；新增支持文件见同目录`support-files.csv`。

## 独立复核与裁定

按executing-plans/requesting-code-review采用一位新上下文只读审查者。0 Critical、3 Important：图接口拒权仍展示旧内容、旧问题图异步混入新答案、重生成计划错误继承A/B已采纳标记。三项均新增浏览器用例并先实测RED，再修源码；三项复现用例均实测RED→GREEN，最终完整38/38通过；没有再派重复复核。

- Ruling：安全/服务尚未全部闭合时只提前施工呈现、导航及明确夹具测试；真实资格、版本和运行能力仍HOLD。风险是夹具结果被误读为产品准出，因此18项矩阵与原152账均不批量改PASS。
- Ruling：原样板SourceInspect抽屉z30被共享nav z50遮挡，在UXD7-HOME-03将导航降至z20，不改只读样板。若判断错误会影响其他浮层，须以全量回归校验。
- Final Ruling：独立审查未判断的真实资格/撤权全链、Origin、不可变revision/CAS、完整Engine/Replan/历史恢复、真实研究媒体均保留原任务5—11；390px尺寸/侧域验证不等于完整Tab、长文、触控、软键盘或真机验收。风险为低估剩余工作，故明确保留未准出状态。
- Deferred minor：桌面初始叙事区未通过抽屉唤起时按Esc，会将焦点移到证据按钮；没有内容丢失或权限影响，键盘焦点行为待后续定向修复。

## 仍未交付的产品能力

当前正式资产区没有后端当前资格读模型，明确展示待核实；独立签发/撤权与双读仍是原任务5—6。Studio持久worker、预算/恢复、真实首个研究发现、局部diff/不可变版本和投稿版本链是原任务7—9；完整EXP Engine适配、对象焦点/证据跟随、DETAIL原件定位、语义历史、Origin往返、多端长内容和真机是原任务10—11。本批没有宣称这些完成。

没有公开可访问部署预览；本地浏览器服务只用于隔离测试。正式预览/生产投运须沿原发布关口处理。未推送、未生产改库、未部署、未激活MHKA。

## 最终验证与本地视觉取证

- `MOHEN_TEST_OUTPUT_DIR=/workspace/mohen-k3-build/uxd7-browser-results pnpm exec playwright test -c playwright.uxd7.config.ts`：38 PASS；测试浏览器退出、专用dev服务正常停止。
- `CI=true pnpm test:unit`：35 PASS / 4 SKIP；`pnpm test:data-production`：69 PASS；`pnpm -r typecheck`：全部通过。
- `pnpm guard:k3-traceability`：85 API / 152动作 / 62模块 / 5屏通过；strict鉴权盘点通过。此项不等于逐业务集成通过。
- `pnpm build`：退出0；随后以空数据库/空AUTH配置启动本地生产构建，实际页面截图已保存并人工查看桌面与手机EXP布局。
- 截图：[HOME 1440](/workspace/mohen-k3-build/uxd7-home-1440.png)、[EXP三域 1440](/workspace/mohen-k3-build/uxd7-exp-three-regions-1440.png)、[EXP侧域 390](/workspace/mohen-k3-build/uxd7-exp-390.png)。截图为空数据库诚实退路，不能当真实知识世界或Owner产品签收。
- 18项增量矩阵只登记PARTIAL_PASS或NOT_RUN；原104/85/152机器合同、权威路由及六个生产Job禁用状态未由本批改变。
