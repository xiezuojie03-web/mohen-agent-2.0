# DS-02｜同一开发 Skill 的任务—工具—环境—验证映射与真实检查入口

**范围**：现行 MAB §6B.4；2026-11-05 Owner 同意继续深化 `mohen-dev-continuation`，不增加并行 Skill，不改变 MHKA-04 §3.6/MHKA-05 §10、KAD6 正式设计交付与 M5 工程计划。

## 1｜实施基线与继承

- 源 GitHub main：`a8caa3da92f30d1f908d624ea1aa4ffd76500304`；此前 DS-01 `4497cf10` 守卫 SUCCESS，M5 三处 TypeScript 报错导致全 CI FAILURE，之后 `a8caa3da` 仅回写证据，未修业务源码。
- 原 `.agents/skills/mohen-dev-continuation/SKILL.md` 和 CodeBuddy adapter 是同一方法的不同入口。升级到 `v0.2.0`，既有权限、BUILD/MAINTAIN、停止与真实回执规则不变。

## 2｜交付的可执行内容

| 文件 | 实现与边界 |
|---|---|
| `.agents/skills/mohen-dev-continuation/SKILL.md` | 唯一方法正文增加调用命令、真实执行/干跑、工具资源地图和平台验证责任 |
| `.agents/skills/mohen-dev-continuation/references/task-tool-environment-map.json` | 八项工程任务到调用工具、所需运行环境、正反验收及平台标签的统一 JSON；DB/浏览器/上线都不授予 CLI 执行权限 |
| `scripts/dev-skills/continuation.mjs` | Node.js 原生实现 `doctor` 观测工具和 HEAD，以及 `verify --profile static/typecheck/unit` 固定命令执行；退出码与 JSON 状态，不调用 shell、付费API或数据库 |
| `tests/dev-skills/continuation.test.mjs` | 使用 Node 内置 test 正反验证：版本/白名单、环境观测非 host 加载、dry-run、拒绝 production、实际两个静态 guard |
| `.agents/skills/mohen-dev-continuation/references/HOST_ACCEPTANCE.md` | Codex/CodeBuddy 分别实际识别、读取、调用、越权停止的验收步骤与提交证据 |

手动命令（在实际仓库根目录、Node+Git 可用环境）：

```bash
node scripts/dev-skills/continuation.mjs doctor --host codex --json
node scripts/dev-skills/continuation.mjs verify --profile static --dry-run --json
node scripts/dev-skills/continuation.mjs verify --profile static --json
node --test tests/dev-skills/continuation.test.mjs
```

在 CodeBuddy 中把第一条 `--host` 改为 `codebuddy`。类型检查/无 DB unit 只在本机或宿主真实具备 pnpm 依赖时分别运行；不得将缺环境写为 PASS。实际 GitHub CI 还要按精确本批 SHA 判断，不能提前宣称通过。

## 3｜各环境必须单独取得的证据

- **CI**：新静态 Skill guard + Node CLI 正反测试各自 PASS；同批 M5 Typecheck/Build 若仍失败必须如实记录。
- **Codex**：真实新会话识别 `$mohen-dev-continuation`，读取 canonical/map，在真实终端完成 doctor/static，输出 SHA/权限及正反结果。
- **CodeBuddy**：`/skills` 真实出现 `mohen-dev-continuation`，通过 adapter 读取 canonical/map，再完成 doctor/static 并记录工具版本、权限与 SHA。
- **ChatGPT 网页+GitHub**：可以读取同一仓库文件及 CI 回执；网页宿主不会因此自然拥有 Node、pnpm、数据库或原生 Codex/CodeBuddy Skill 执行权限。

**不得擅自把 CodeBuddy/Codex 的一个平台 PASS 推广到另一平台。** 跨工具完整复用必须两端宿主加载及一致静态执行证据；DS-03 还需真实 M5 施工闭环，不能靠本文签出。

## 4｜风险、回滚与后续

- 本批不修改 `skills/` 产品 Skill、任何 D/L/G Registry、数据库、密钥、Vercel 生产部署或 M5业务源码。
- 隔离回滚仅回退本次 `mohen-dev-continuation` v0.2.0 方法/JSON/CLI/tests/CI 小范围提交；不能回滚六份 MHKA、原 MAB 权威与 D/L/G 权限。
- 任何新执行功能不得新增 `production`/任意 shell profile。CI 断言仅证明本次静态包装与 CLI 工具逻辑，在两个开发宿主实测之前只能标 `HOST_NOT_RUN`。
- 后续严格沿 DS-03，以真实 `apps/web/lib/studio-research-read.ts` 类型错误与 ST-02 读权限任务进行开发循环：选工具→运行诊断→最小修复→复验→回写 SHA/CI/任务账；M5整体仍 `HOLD`。
