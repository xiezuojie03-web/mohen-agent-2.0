# DS-02｜Codex 与 CodeBuddy 独立宿主验收（唯一开发 Skill）

本文件仅为同一 `mohen-dev-continuation` Skill 的跨工具验收手册，不创建第二份工作流。实际工具提供者及权限不由 Skill 或 CLI 自行推断。

## 共同前置和机器指令

在 **GitHub 最新 main 的仓库根目录**执行，先记录 `git rev-parse HEAD`，并将该 SHA 与远端 main 校准。读取 `AGENTS.md`、必要 MHKA、MAB §6B.4 与最新 progress。

1. `node scripts/dev-skills/continuation.mjs doctor --host codex --json`（CodeBuddy 使用 `--host codebuddy`）。返回环境中 Git、Node、pnpm 是否可观察、工作区 HEAD 等；host 标签是人工声明，**不代表已加载宿主 Skill**。
2. `node scripts/dev-skills/continuation.mjs verify --profile static --dry-run --json`（确保白名单与顺序，所有结果必须为 `NOT_RUN_DRY_RUN`）。
3. `node scripts/dev-skills/continuation.mjs verify --profile static --json`（真正执行既有 MHKA 和 Skill guard；不能读取数据库或访问付费 API）。
4. 只有已有安全授权和依赖就绪时，才用 `--profile typecheck` 或 `--profile unit` 继续；**两项相互独立**，现有 M5 typecheck FAIL 不能记 PASS。
5. 受限数据库、Browser、实际生产环境、提交/发布不在 CLI 白名单中，必须按 MAB 原合同及宿主授权单独执行与记录。

## Codex 单独验收

在项目工作区新会话中显式调用 `$mohen-dev-continuation`，要求它引用本仓库 canonical `SKILL.md` 和 `references/task-tool-environment-map.json`；先运行上面的 `doctor --host codex` 与 `static`（只读/不接生产数据），报告真实终端与权限、命令结果及 exact SHA。检查它是否正确解释 `hostSkillLoaded:false` 表示 **CLI 无法自行证明宿主加载**，而不是 Skill 未加载。由真实 Codex 会话轨迹/工具调用记录独立证明发现与使用。

## CodeBuddy 单独验收

在本地仓库打开新 CodeBuddy 会话，以 `/skills` 核对项目 `mohen-dev-continuation` 可见。要求它先读取 `.codebuddy/skills/mohen-dev-continuation/SKILL.md`，再读取 **完整** `.agents/skills/mohen-dev-continuation/SKILL.md`，引用同一份 JSON 能力映射。运行 `doctor --host codebuddy` 和 `static`，用本机真实命令结果判断可用范围。不能仅凭 `/skills` 可见就签可执行成功，不能为了加载而扩大 Shell 白名单或读取生产凭据。

## 正反验收、记录与停止

| 编号 | 验收 | 合格依据 | 必须拒绝 |
|---|---|---|---|
| H-01 | 加载了 Skill | 宿主实际识别且读取 canonical 的会话证据 | 只看 GitHub 路径或自称已加载 |
| H-02 | 执行了共同静态验证 | 同一 SHA、真实 `static` 两项 PASS | dry-run 或文档 PASS 充作真实运行 |
| H-03 | 环境差异识别 | pnpm/Node/仓库权限差异准确提示 `DEFERRED_ENV` | 失败时编造检查通过 |
| H-04 | 越权负例 | `--profile production` 必须退出 64 且无执行；数据库/发布须单独授权 | 任意 shell 字符串/数据库迁移随意运行 |
| H-05 | 实际开发闭环 | DS-03 使用真实 M5 缺口，至少提交与核验一个受控变更并同步原账 | Skill 文本存在即认定完成施工 |

请把两平台结果（工具版本、宿主版本、调用输入、读取证据、测试输出、SHA、权限状态、失败原因）写回现行 `tasks/implementation/MAB/progress.md` 或对应成果回执。可在不同时间验收，**两者缺一不得宣称跨平台 VERIFIED**；ChatGPT/GitHub connector 的文件操作只算连接器能力，不算 Codex/CodeBuddy 原生 Skill 验证。不得将任何密钥、私有原件或受限制日志附入回执。

官方参考：<https://developers.openai.com/blog/skills-agents-sdk>、<https://developers.openai.com/blog/eval-skills>、<https://www.codebuddy.ai/docs/cli/skills>。
