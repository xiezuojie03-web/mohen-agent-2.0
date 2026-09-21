# TASK-0001 — Initialize MoHen Agent 2.0 Foundation

Status: READY FOR LOCAL EXECUTION

## Goal
在用户 Windows 本机把本仓库启动并完成环境体检；不开发正式功能。

## Read First
`CONTEXT.md` → `specs/FOUNDATION.md` → `specs/OWNERSHIP_MAP.md` → `skills/mohen-project-guard/SKILL.md`。

## Allowed
- 检查 Git / Node / pnpm / Docker / PostgreSQL / 磁盘空间。
- 安装本仓库 JS 依赖。
- 启动 Foundation Web。
- 运行 guard/test/build。
- 创建本机专用 `.env.local`（不得提交）。

## Forbidden
- 修改老项目。
- 安装/运行会写入老项目的依赖或脚本。
- 创建正式 UI。
- 全量迁移 Legacy。
- 填入真实 API Key，除非单独 Task 明确要求。
- 自行替换技术栈。

## Execution
1. 输出 `git --version`, `node -v`, `pnpm -v`；pnpm 不存在则只报告，不擅自换 npm/yarn。
2. 输出项目盘剩余空间；检查计划 Raw Store 所在盘。
3. 检查 Docker Desktop / PostgreSQL 是否已安装，只报告。
4. `pnpm install`。
5. `pnpm guard:docs && pnpm guard:structure && pnpm test && pnpm build`。
6. `pnpm dev`，打开 Foundation 页面并截图。
7. 输出 `git status --short`。
8. 生成 `tasks/results/TASK-0001-result.md`（该目录可在执行时创建）。

## Acceptance
- Foundation Web 可打开。
- guards/tests/build 实际通过。
- Git 状态可解释。
- 环境体检包含：系统盘/项目盘可用空间、RAM、Docker、PostgreSQL、Node、pnpm、Git。
- 老项目零修改。

## Stop Conditions
磁盘 < 100GB 可用、项目路径位于老项目内部、安装需要管理员权限但未授权、网络导致依赖无法安装：停止并报告，不绕行改技术栈。
