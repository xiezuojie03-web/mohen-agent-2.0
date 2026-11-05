# DS-01｜开发 Skill 环境核查、唯一方法源与跨工具适配回执（2026-11-05）

**归属**：原 `tasks/implementation/MAB/PLAN.md §6B.4`；MHKA-04 §3.6 与 MHKA-05 §10。此文件是任务证据，不是另一本任务书、架构或新产品 Registry。

## 1. 实际仓库与 CI 基线

- 核查起点：GitHub `main@a2fb10c2fbf973b450a360775745a67de6bb37c7`（只读核查）；现存 `skills/` 属于产品 D/L/G 专业能力；此前无 `.agents/skills` 或 `.codebuddy/skills` 可供项目级开发技能使用。
- `.gitignore` 原来整段排除 `.codebuddy/`；未经精确例外的 CodeBuddy 适配器不能入 Git。本次仅保留 `.codebuddy/skills/mohen-dev-continuation/SKILL.md`，其它 CodeBuddy 运行配置、凭据及日志仍不得被跟踪。
- 最近主 CI `41974535042` 对起点提交为 `FAILURE`。这属于已存在的工程构建/类型失败基线，不能归因于新开发 Skill，亦不能被静态 Skill 包装 PASS 遮盖。实际失败步骤以 GitHub 工作流日志及后续源码批次定向处理为准。此任务不更改 M5/ST-02 的业务代码。
- `AGENTS.md` 与现行六 MHKA 是工程设计依据；2026-11-02 冻结交付包是设计来源快照而非复活旧 C0—C4 施工路由。

## 2. 平台能力核查与保留限制

| 工具 | 已核实的项目 Skill 入口/权限 | 当前可验证 | 尚不能声称 |
|---|---|---|---|
| Codex CLI/IDE | 项目 `.agents/skills/<name>/SKILL.md`；`name`/`description` 触发 | 仓库路径、结构、frontmatter 与 CI 静态守卫 | Codex 云端当前会话已发现/执行；自动后台续跑 |
| CodeBuddy IDE/CLI | 项目 `.codebuddy/skills/<name>/SKILL.md`，支持 `/skills` 检查；需项目代码与实际本地权限 | Git 跟踪例外、加载适配器、指向唯一方法源 | CodeBuddy 当前本地实例已加载，拥有权限、命令执行成功 |
| ChatGPT 网页聊天 + GitHub | 可按连接器权限读取/修改仓库文件；插件封装 Skill 与单独仓库 Skill 不同 | 本回合通过 GitHub 连接器完成仓库审查和原子提交 | 仓库级 `.agents` 被 ChatGPT 网页版自动安装；本地 DB、Codex shell 或 CodeBuddy shell 无条件可用 |

官方依据：
- OpenAI 项目技能路径及用法：<https://developers.openai.com/api/reference/cli>；Skill/插件分发区分：<https://learn.chatgpt.com/docs/build-skills>。
- CodeBuddy 项目 Skill 路径与格式：<https://www.codebuddy.ai/docs/zh/ide/Features/Skills>；CLI `/skills` 与权限边界：<https://www.codebuddy.ai/docs/cli/skills>。

## 3. DS-01 的实体化决定与 DS-02 起步边界

- **唯一方法正文**：`.agents/skills/mohen-dev-continuation/SKILL.md`（`canonical v0.1.0`），BUILD 优先；MAINTAIN 共享流程及未来扩展入口。明确读取现行权威、MAB 任务、CI 与真实 SHA、最小修改、测试及权限/成本停止条件，最多一轮有界连续任务组。
- **CodeBuddy 发现适配器**：`.codebuddy/skills/mohen-dev-continuation/SKILL.md`，仅提供标准 frontmatter 与强制读取 canonical；缺文件/版本不匹配时 `DEFERRED_ENV`，禁止模仿另一个流程。
- **静态防漂移检查**：`scripts/guards/check-dev-skill-layout.mjs` 及 CI 步骤；核存在/元数据/版本/唯一正文路由、CodeBuddy 文件未被忽略、生产 Registry 未被混入。这是静态包装验收，不是宿主实际执行或 M5 产品 Gate。
- **权限与持续性**：开发 Skill 不自带独立 Executor、GitHub 自动推送凭据、自动化定时器或无限循环。真实运行由当次获准的 Codex/CodeBuddy/ChatGPT 宿主授权和工具能力决定。

## 4. 接续验收（不得提前 PASS）

1. CI：对该次提交核 `Developer Skill packaging guard` 步骤日志有 `DS_DEV_SKILL_LAYOUT_PASS`；主 CI 独立记录实际结果。若 Typecheck 仍因既有 ST-02 TypeScript 失败，则 `DS_STATIC_VERIFIED` 可成立而 `CI_OVERALL_HOLD` 必须保留。
2. Codex：在最新 main 新会话执行显式 `$mohen-dev-continuation`，核实际读入完整 canonical、任务选择与权限停止输出；记录工具版本/会话/权限和失败。
3. CodeBuddy：拉取最新 main，以 `/skills` 确认项目级 Skill 出现，显式调用，观察是否确实读取 `.agents/...` 正文，并用只读或合成输入验证失败闭合；上传或补记回执。
4. ChatGPT 网页：只承诺在可访问 GitHub 连接器会话中按同一方法读取；不将此标注为原生自动 Skill 加载。
5. DS-03：用 M5 真实 Typecheck 或 ST-02 工作证明“接续→诊断→改码→复测→提交→恢复”连续闭环；不得拿本报告代替实际工程实现或 Gate。

**状态规则**：DS-01 仓库方案/适配结构 `CODE_PRESENT`（远端提交确认后）；静态 CI 与 Codex/CodeBuddy 宿主加载必须分别验证。DS-02 方法首版仅 `CODE_PRESENT`，正式效果 DS-03 `NOT_RUN`；DS-04 维护专用扩展 `NOT_STARTED`。本次不修改产品六阶段 Registry 或任何生产鉴权。

## 5. 远端精确静态验证回执（2026-11-05）

- **Skill 文件与机器守卫源码提交**：`4497cf10b95b0ea0e57aa1ae41f3d67b1431d968`，GitHub Actions 主 CI [41975584235](https://github.com/xiezuojie03-web/mohen-agent-2.0/actions/runs/41975584235)，job `127073535980`。
- **MHKA engineering authority routing guard：SUCCESS；Developer Skill packaging guard (static only)：SUCCESS**，日志存在 `DS_DEV_SKILL_LAYOUT_PASS ... v0.1.0; NOT_HOST_ACTIVATED`。代码与 GitHub 路径真实落仓、CodeBuddy 适配器未被 .gitignore 忽略。
- **FULL_CI = FAILURE（非 Skill 包装失败）**：后续 `pnpm -r typecheck` 在 `apps/web/lib/studio-research-read.ts` 失败：第46行 TS2353 `Material` 类型不接受 `title`；第84与第180行 TS2451 `privateMaterialIds` 重复声明。Playwright/unit/build 随主 CI 跳过，不能写为 PASS。与此前 main@a2fb10c 的 TypeScript 阻断一致；本 DS-01 未触碰该业务文件。
- **裁定**：`DS01_STATIC_VERIFIED / DS02_CODE_PRESENT / CODEX_HOST_NOT_RUN / CODEBUDDY_HOST_NOT_RUN / DS03_NOT_RUN / M5_FULL_CI_HOLD`。接下来可以用这三个 TypeScript 错误作为 DS-03 的第一个真实故障任务，须由获授权工具按 canonical 步骤修复、复测并核验最新 main；不能以本次静态 PASS 替代实际连续开发能力或宿主自动加载。

